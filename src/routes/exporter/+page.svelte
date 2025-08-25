<script lang="ts">
	import { VerseRange, type AssetClip } from '$lib/classes';
	import Timeline from '$lib/components/projectEditor/timeline/Timeline.svelte';
	import VideoPreview from '$lib/components/projectEditor/videoPreview/VideoPreview.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { ProjectService } from '$lib/services/ProjectService';
	import { invoke } from '@tauri-apps/api/core';
	import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
	import { listen } from '@tauri-apps/api/event';
	import { onMount } from 'svelte';
	import { exists, BaseDirectory } from '@tauri-apps/plugin-fs';
	import { LogicalPosition } from '@tauri-apps/api/dpi';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { join } from '@tauri-apps/api/path';
	import ExportService, { type ExportProgress } from '$lib/services/ExportService';
	import { getAllWindows } from '@tauri-apps/api/window';
	import Exportation, { ExportState } from '$lib/classes/Exportation.svelte';

	// Indique si l'enregistrement a commencé
	let hasRecordStarted = $state(false);

	// Indique si l'enregistrement est terminé
	let hasRecordEnded = $state(false);

	// Contient l'ID de l'export
	let exportId = '';

	// Contient le recorder
	let rec: { recorder: MediaRecorder; stop: () => void; cleanup: () => void } | null = null;

	// VideoPreview
	let videoPreview: VideoPreview | undefined = $state(undefined);

	// Récupère les données d'export de la vidéo
	let exportData: Exportation | undefined;

	async function exportProgress(event: any) {
		const data = event.payload as {
			progress?: number;
			current_time: number;
			total_time?: number;
		};

		if (data.progress !== null && data.progress !== undefined) {
			console.log(
				`Export Progress: ${data.progress.toFixed(1)}% (${data.current_time.toFixed(1)}s / ${data.total_time?.toFixed(1)}s)`
			);

			emitProgress({
				exportId: Number(exportId),
				progress: data.progress,
				currentState: ExportState.AddingAudio,
				currentTime: data.current_time * 1000 // Convertir de secondes en millisecondes
			} as ExportProgress);
		} else {
			console.log(`Export Processing: ${data.current_time.toFixed(1)}s elapsed`);
		}
	}

	async function exportComplete(event: any) {
		const data = event.payload as { filename: string; exportId: string };
		console.log(`✅ Export complete! File saved as: ${data.filename}`);

		await emitProgress({
			exportId: Number(exportId),
			progress: 100,
			currentState: ExportState.Exported
		} as ExportProgress);

		// Ne fermer que si c'est NOTRE export qui est terminé
		if (data.exportId === exportId) {
			getCurrentWebviewWindow().close();
		}
	}

	async function exportError(event: any) {
		const error = event.payload as string;
		console.error(`❌ Export failed: ${error}`);

		emitProgress({
			exportId: Number(exportId),
			progress: 100,
			currentState: ExportState.Error,
			errorLog: error
		} as ExportProgress);
	}

	async function emitProgress(progress: ExportProgress) {
		(await getAllWindows()).find((w) => w.label === 'main')!.emit('export-progress-main', progress);
	}

	function cancelExport() {}

	onMount(async () => {
		// Écoute les événements de progression d'export donné par Rust
		listen('export-progress', exportProgress);
		listen('export-complete', exportComplete);
		listen('export-error', exportError);

		// Récupère l'id de l'export, qui est en paramètre d'URL
		const id = new URLSearchParams(window.location.search).get('id');
		if (id) {
			exportId = id;

			// Récupère le projet correspondant à cette ID (dans le dossier export, paramètre inExportFolder: true)
			globalState.currentProject = await ExportService.loadProject(Number(id));

			// Supprime le fichier projet JSON
			ExportService.deleteProjectFile(Number(id));

			// Récupère les données d'export
			exportData = ExportService.findExportById(Number(id))!;

			// Prépare les paramètres pour exporter la vidéo
			globalState.getVideoPreviewState.isFullscreen = true; // Met la vidéo en plein écran
			globalState.getVideoPreviewState.isPlaying = false; // Met la vidéo en pause
			globalState.getVideoPreviewState.showVideosAndAudios = true; // Met la vidéo en sourdine
			// Met le curseur au début du startTime voulu pour l'export
			globalState.getTimelineState.cursorPosition = globalState.getExportState.videoStartTime;
			globalState.getTimelineState.movePreviewTo = globalState.getExportState.videoStartTime;

			setTimeout(async () => {
				// Enlève tout les styles `tranform` de la div d'id `preview-container` et met
				// l'inset à 0 (sinon la videoPreview prend que 50% de l'écran, je sais pas pourquoi)
				const previewContainer = document.getElementById('preview-container');
				if (previewContainer) {
					// Sauvegarde parent & position pour restaurer après l'export
					const originalParent = previewContainer.parentElement;
					const originalNextSibling = previewContainer.nextSibling;
					const originalStyle: Record<string, string> = {
						position: previewContainer.style.position || '',
						zIndex: previewContainer.style.zIndex || '',
						inset: previewContainer.style.inset || '',
						transform: previewContainer.style.transform || '',
						width: previewContainer.style.width || '',
						height: previewContainer.style.height || '',
						top: previewContainer.style.top || '',
						left: previewContainer.style.left || '',
						right: previewContainer.style.right || '',
						bottom: previewContainer.style.bottom || '',
						margin: previewContainer.style.margin || ''
					};

					// Promeut l'élément au body pour garantir un fullscreen "réel"
					document.body.appendChild(previewContainer);
					Object.assign(previewContainer.style, {
						position: 'fixed',
						inset: '0',
						top: '0',
						left: '0',
						width: '100%',
						height: '100%',
						transform: 'none',
						zIndex: '999',
						margin: '0'
					});

					// Fournit une fonction globale de restauration (appelable depuis cleanup)
					// On stocke sur window pour éviter d'ajouter des variables en haut du fichier
					(window as any).__qcRestorePreview = () => {
						if (!previewContainer) return;
						// Remet dans son parent d'origine, à la même position
						if (originalParent) {
							if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
								originalParent.insertBefore(previewContainer, originalNextSibling);
							} else {
								originalParent.appendChild(previewContainer);
							}
						}
						// Restaure les styles originaux
						Object.assign(previewContainer.style, originalStyle);
						delete (window as any).__qcRestorePreview;
						console.log('Restored preview container to original parent and styles.');
					};
				}

				// Lance la demande de record
				try {
					rec = await startRecord(60);
				} catch (e) {
					// Si l'utilisateur annule la sélection, on cancel l'export
					hasRecordStarted = false;
					cancelExport();
					return;
				}

				// Joue la vidéo pendant que le MediaRecorder record
				videoPreview!.togglePlayPause();
			}, 0);
		}
	});

	/*
	 * Dès que on atteint la fin de la vidéo que l'utilisateur veut exporter, end le record
	 */
	$effect(() => {
		if (!hasRecordStarted) return; // Si on a pas encore commencé, on fait rien

		const cursorPos = globalState.getTimelineState.cursorPosition;

		if (cursorPos >= exportData!.videoEndTime) {
			endRecord();
		} else if (cursorPos % 1000 < 16) {
			// Ou alors report le progrès toutes les secondes
			emitProgress({
				exportId: Number(exportId),
				progress: Math.max(
					0,
					Math.min(100, ((cursorPos - exportData!.videoStartTime) / exportData!.videoLength) * 100)
				),
				currentState: ExportState.Recording,
				currentTime: cursorPos - exportData!.videoStartTime
			} as ExportProgress);
		}
	});

	/**
	 * Arrête l'enregistrement de la vidéo.
	 */
	function endRecord() {
		rec?.stop();
	}

	async function startRecord(fps = 60) {
		const tauriWindow = getCurrentWebviewWindow();
		const tauriWindowSize = await tauriWindow.size();

		// 1) capture écran avec les meilleurs paramètres (video seulement)
		const displayStream = await navigator.mediaDevices.getDisplayMedia({
			video: {
				frameRate: { ideal: fps, max: fps },
				width: tauriWindowSize.width,
				height: tauriWindowSize.height
			}
			// Pas d'audio - on l'ajoute après avec ffmpeg
		});

		// Cache immédiatement l'overlay dès que l'utilisateur commence la sélection d'écran
		hasRecordStarted = true;
		// Cache la fenêtre de l'application
		await tauriWindow.setPosition(new LogicalPosition(-10000, -100000));

		// 2) crée video cachée pour lire le stream source
		const video = document.createElement('video');
		video.srcObject = displayStream;
		video.muted = true;
		await video.play();

		// 3) canvas pour forcer la cadence voulue avec qualité maximale
		const canvas = document.createElement('canvas');
		canvas.width = video.videoWidth || 1280;
		canvas.height = video.videoHeight || 720;
		const ctx = canvas.getContext('2d', {
			alpha: false, // Pas de transparence pour de meilleures performances
			desynchronized: true, // Améliore les performances de rendu
			willReadFrequently: false // Optimise pour l'écriture plutôt que la lecture
		})!;

		// Optimise le rendu pour la qualité
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';

		// dessine à la cadence souhaitée avec timing précis
		const interval = 1000 / fps;
		let drawing = true;
		let lastTime = performance.now();

		const drawLoop = (currentTime: number) => {
			if (!drawing) return;

			// Contrôle précis du timing
			if (currentTime - lastTime >= interval) {
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				lastTime = currentTime;
			}
			requestAnimationFrame(drawLoop);
		};
		requestAnimationFrame(drawLoop);

		// 4) enregistre le stream du canvas (video seulement)
		const stream = (canvas as HTMLCanvasElement).captureStream(fps);
		// Pas d'audio - on l'ajoute après avec ffmpeg

		// 5) config MediaRecorder pour la meilleure qualité vidéo
		let mimeType: string;
		let options: MediaRecorderOptions;

		// Équilibre qualité/taille pour des fichiers raisonnables (video seulement)
		if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E')) {
			mimeType = 'video/mp4;codecs=avc1.42E01E';
			options = {
				mimeType,
				videoBitsPerSecond: 8_000_000 // 8 Mbps - bon équilibre qualité/taille
			};
		} else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
			mimeType = 'video/webm;codecs=vp9';
			options = {
				mimeType,
				videoBitsPerSecond: 6_000_000 // 6 Mbps avec VP9 (plus efficace)
			};
		} else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
			mimeType = 'video/webm;codecs=vp8';
			options = {
				mimeType,
				videoBitsPerSecond: 8_000_000 // 8 Mbps avec VP8
			};
		} else {
			// Fallback de base
			mimeType = 'video/webm';
			options = {
				mimeType,
				videoBitsPerSecond: 6_000_000 // 6 Mbps fallback
			};
		}

		const rec = new MediaRecorder(stream, options);
		const chunks: Blob[] = [];

		// Demander des chunks plus fréquents pour de meilleures métadonnées
		rec.ondataavailable = (e) => {
			if (e.data && e.data.size) chunks.push(e.data);
		};

		// Démarrer avec des chunks de 1 seconde pour améliorer les métadonnées
		rec.start(1000);

		rec.onstop = () => recordStoped(drawing, video, mimeType, chunks);

		// Retourne l'objet recorder avec méthode stop et cleanup
		return {
			recorder: rec,
			stop: () => rec.stop(),
			cleanup: () => {
				drawing = false;
				video.pause();
				displayStream.getTracks().forEach((t) => t.stop());
			}
		};
	}

	/**
	 * Appelé lorsque l'enregistrement est arrêté. Sauvegarde la vidéo sur le PC.
	 */
	async function recordStoped(
		drawing: boolean,
		video: HTMLVideoElement,
		mimeType: string,
		chunks: Blob[]
	) {
		drawing = false;
		video.pause();

		// Utiliser l'extension correcte selon le codec
		const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';

		// Enregistre le fichier vidéo. Nom simple pour l'instant
		const fileName = `QC-${globalState.currentProject!.detail.id}.${extension}`;

		// Combine avec le bon type MIME
		const blob = new Blob(chunks, { type: mimeType });
		const arrayBuf = await blob.arrayBuffer();

		// Utiliser le bon type MIME pour le fichier aussi
		const file = new File([arrayBuf], fileName, { type: mimeType });
		const url = URL.createObjectURL(file);
		const a = document.createElement('a');
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		// Appelle la fonction pour ajouter l'audio à la vidéo
		addAudioToVideo(fileName);
	}

	/**
	 * Ajoute l'audio à la vidéo et effectue diverse opération avec FFMPEG
	 * @param videoFileName
	 */
	async function addAudioToVideo(videoFileName: string) {
		// Récupère le chemin de fichier de tout les audios du projet
		const audios: string[] = globalState.getAudioTrack.clips.map(
			(clip: any) => globalState.currentProject!.content.getAssetById(clip.assetId).filePath
		);

		// Attend que le fichier de la vidéo soit téléchargé sur le PC
		while (!(await exists(videoFileName, { baseDir: BaseDirectory.Download }))) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Destroy le media recorder pour qu'on ai plus la petite fenetre "X partage une fenêtre"
		rec?.cleanup();
		getCurrentWebviewWindow().setSkipTaskbar(true); // On peut mtn cacher la fenêtre
		hasRecordEnded = true; // Supprime la timeline et la videoPreview pour pas consommer de ressources

		// Appel FFMPEG depuis Rust
		await invoke('add_audio_to_video', {
			fileName: videoFileName,
			finalFilePath: exportData!.finalFilePath,
			audios: audios,
			startTime: globalState.getExportState.videoStartTime,
			exportId: exportData!.exportId.toString(),
			videoDuration: exportData!.videoLength,
			targetWidth: exportData!.videoDimensions.width,
			targetHeight: exportData!.videoDimensions.height
		});
	}
</script>

{#if globalState.currentProject}
	{#if !hasRecordEnded}
		<div class="absolute inset-0 w-full h-full">
			<VideoPreview bind:this={videoPreview} showControls={false} />
			<div class="hidden">
				<Timeline />
			</div>
		</div>
	{/if}

	<!-- Avant de record, on dit à l'utilisateur de sélectionné la fenêtre -->
	{#if !hasRecordStarted}
		<div
			class="absolute inset-0 w-full h-full pt-[350px] bg-black/80 backdrop-blur-sm flex items-center justify-center z-[99999]"
		>
			<div class="text-center max-w-2xl px-8">
				<!-- Arrow pointing up-center towards popup -->
				<div class="flex justify-center mb-8">
					<svg
						class="w-20 h-20 text-white animate-bounce"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="3"
							d="M12 19V5M5 12l7-7 7 7"
						/>
					</svg>
				</div>

				<!-- Main instruction text -->
				<h1 class="text-4xl font-bold text-white mb-6">Select Window to Record</h1>

				<div class="text-xl text-gray-200 leading-relaxed space-y-4">
					<p>A popup window will appear asking you to choose which window to share.</p>
					<p class="font-semibold text-yellow-300">Please select the window with title:</p>
					<div
						class="bg-gray-800 border border-gray-600 rounded-lg p-4 font-mono text-lg text-green-400"
					>
						"QC - {globalState.currentProject!.detail.id}"
					</div>
					<p class="text-xl font-semibold text-white mt-6">
						Then click the <span class="bg-blue-600 px-3 py-1 rounded font-bold">Share</span> button
						to start recording
					</p>
				</div>
			</div>
		</div>
	{/if}
{/if}
