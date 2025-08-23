<script lang="ts">
	import type { AssetClip } from '$lib/classes';
	import Timeline from '$lib/components/projectEditor/timeline/Timeline.svelte';
	import VideoPreview from '$lib/components/projectEditor/videoPreview/VideoPreview.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { projectService } from '$lib/services/ProjectService';
	import { invoke } from '@tauri-apps/api/core';
	import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
	import { listen } from '@tauri-apps/api/event';
	import { onMount } from 'svelte';
	import { exists, BaseDirectory } from '@tauri-apps/plugin-fs';
	import { LogicalPosition } from '@tauri-apps/api/dpi';
	import { getCurrentWebview } from '@tauri-apps/api/webview';

	let hasRecordStarted = $state(false);
	let exportId = '';

	onMount(async () => {
		// Écouter les événements de progression d'export
		listen('export-progress', (event) => {
			const data = event.payload as {
				progress?: number;
				current_time: number;
				total_time?: number;
			};

			if (data.progress !== null && data.progress !== undefined) {
				console.log(
					`Export Progress: ${data.progress.toFixed(1)}% (${data.current_time.toFixed(1)}s / ${data.total_time?.toFixed(1)}s)`
				);
			} else {
				console.log(`Export Processing: ${data.current_time.toFixed(1)}s elapsed`);
			}
		});

		listen('export-complete', (event) => {
			const data = event.payload as { filename: string; exportId: string };
			console.log(`✅ Export complete! File saved as: ${data.filename}`);

			// Ne fermer que si c'est NOTRE export qui est terminé
			if (data.exportId === id) {
				getCurrentWebviewWindow().close();
			}
		});

		listen('export-error', (event) => {
			const error = event.payload as string;
			console.error(`❌ Export failed: ${error}`);
		});

		// Récupère le fichier du projet à exporter.
		// L'id se trouve dans l'url, paramètre "id"
		const id = new URLSearchParams(window.location.search).get('id');
		if (id) {
			exportId = id;

			// Récupère le projet correspondant à l'id
			globalState.currentProject = await projectService.load(Number(id), false, true);

			// Prépare les paramètres pour exporter la vidéo
			globalState.getVideoPreviewState.isFullscreen = true; // Mettre la vidéo en plein écran
			globalState.getVideoPreviewState.isPlaying = false; // Mettre la vidéo en pause
			globalState.getVideoPreviewState.isMuted = true; // Mettre la vidéo en sourdine
			globalState.getTimelineState.cursorPosition = globalState.getExportState.videoStartTime; // Revenir au début de la timeline
			globalState.getTimelineState.movePreviewTo = globalState.getExportState.videoStartTime; // Revenir au début de la timeline

			setTimeout(async () => {
				// Enlève tout les styles `tranform` de la div d'id `preview-container` et met
				// l'inset à 0 (sinon la videoPreview prend que 50% de l'écran, je sais pas pourquoi)
				const previewContainer = document.getElementById('preview-container');
				if (previewContainer) {
					previewContainer.style.transform = '';
					previewContainer.style.inset = '';
				}

				// Lance la demande de record
				try {
					rec = await startRecord(60);
				} catch (e) {
					// Si l'utilisateur annule la sélection, on remet l'overlay
					hasRecordStarted = false;
					cancelExport();
					return;
				}

				// Joue la vidéo
				videoPreview!.togglePlayPause();
			}, 0);
		}
	});

	// Dès que on atteint la fin de la vidéo que l'utilisateur veut exporter, end le record
	$effect(() => {
		if (
			hasRecordStarted &&
			globalState.getTimelineState.cursorPosition >= globalState.getExportState.videoEndTime
		) {
			endRecord();
		}
	});

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

		rec.onstop = async () => {
			drawing = false;
			video.pause();

			// Utiliser l'extension correcte selon le codec
			const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
			const fileName = `QC-${globalState.currentProject!.detail.id}.${extension}`;

			// combine avec le bon type MIME
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

			setTimeout(() => {
				addAudioToVideo(fileName);
			}, 0);
		};
		// retourne un objet pour pouvoir arrêter plus tard
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

	let rec: { recorder: MediaRecorder; stop: () => void; cleanup: () => void } | null = null;
	let videoPreview: VideoPreview | undefined = $state(undefined);

	function cancelExport() {}

	async function addAudioToVideo(videoFileName: string) {
		const audios: string[] = globalState.getAudioTrack.clips.map(
			(clip: any) => globalState.currentProject!.content.getAssetById(clip.assetId).filePath
		);

		// Attend que le fichier de la vidéo soit téléchargé sur le PC
		while (!(await exists(videoFileName, { baseDir: BaseDirectory.Download }))) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// destroy le media recorder pour qu'on ai plus la petite fenetre "X partage une fenêtre"
		rec?.cleanup();
		getCurrentWebviewWindow().setSkipTaskbar(true); // On peut mtn cacher la fenêtre
		videoPreview?.togglePlayPause(); // Met en pause la vidéo pour pas consommer de ressource

		const videoDimensions: { width: number; height: number } = globalState.getStyle(
			'global',
			'video-dimension'
		)!.value as any;

		await invoke('add_audio_to_video', {
			fileName: videoFileName,
			audios: audios,
			startTime: globalState.getExportState.videoStartTime,
			exportId: exportId,
			videoDuration:
				globalState.getExportState.videoEndTime - globalState.getExportState.videoStartTime,
			targetWidth: videoDimensions.width,
			targetHeight: videoDimensions.height
		});
	}
</script>

{#if globalState.currentProject}
	<div class="absolute inset-0 w-full h-full">
		<VideoPreview bind:this={videoPreview} showControls={false} />
		<div class="hidden">
			<Timeline />
		</div>
	</div>

	<!-- Avant de record, on dit à l'utilisateur de sélectionné la fenêtre -->
	{#if !hasRecordStarted}
		<div
			class="absolute inset-0 w-full h-full pt-[350px] bg-black/80 backdrop-blur-sm flex items-center justify-center"
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
