<script lang="ts">
	import { PredefinedSubtitleClip, VerseRange, type AssetClip } from '$lib/classes';
	import Timeline from '$lib/components/projectEditor/timeline/Timeline.svelte';
	import VideoPreview from '$lib/components/projectEditor/videoPreview/VideoPreview.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { ProjectService } from '$lib/services/ProjectService';
	import { invoke } from '@tauri-apps/api/core';
	import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
	import { listen } from '@tauri-apps/api/event';
	import { onMount } from 'svelte';
	import { exists, BaseDirectory, mkdir, writeFile } from '@tauri-apps/plugin-fs';
	import { LogicalPosition } from '@tauri-apps/api/dpi';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { appDataDir, join } from '@tauri-apps/api/path';
	import ExportService, { type ExportProgress } from '$lib/services/ExportService';
	import { getAllWindows } from '@tauri-apps/api/window';
	import Exportation, { ExportState } from '$lib/classes/Exportation.svelte';
	import toast from 'svelte-5-french-toast';
	import DomToImage from 'dom-to-image';
	import SubtitleClip from '$lib/components/projectEditor/timeline/track/SubtitleClip.svelte';
	import { ClipWithTranslation } from '$lib/classes/Clip.svelte';

	// Indique si l'enregistrement a commencé
	let readyToExport = $state(false);

	// Contient l'ID de l'export
	let exportId = '';

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
				currentState: ExportState.CreatingVideo,
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

			// Créer le dossier d'export s'il n'existe pas
			await mkdir(await join(ExportService.exportFolder, exportId), {
				baseDir: BaseDirectory.AppData,
				recursive: true
			});

			// Supprime le fichier projet JSON
			// TODO: uncomment this when the export is fully working
			// ExportService.deleteProjectFile(Number(id));

			// Récupère les données d'export
			exportData = ExportService.findExportById(Number(id))!;

			// Prépare les paramètres pour exporter la vidéo
			globalState.getVideoPreviewState.isFullscreen = true; // Met la vidéo en plein écran
			globalState.getVideoPreviewState.isPlaying = false; // Met la vidéo en pause
			globalState.getVideoPreviewState.showVideosAndAudios = true; // Met la vidéo en sourdine
			// Met le curseur au début du startTime voulu pour l'export
			globalState.getTimelineState.cursorPosition = globalState.getExportState.videoStartTime;
			globalState.getTimelineState.movePreviewTo = globalState.getExportState.videoStartTime;

			// Enlève tout les styles de position de la vidéo
			let videoElement: HTMLElement;
			// Attend que l'élément soit prêt
			do {
				await new Promise((resolve) => setTimeout(resolve, 100));
				videoElement = document.getElementById('video-preview-section') as HTMLElement;
				videoElement.style.objectFit = 'contain';
				videoElement.style.top = '0';
				videoElement.style.left = '0';
				videoElement.style.width = '100%';
				videoElement.style.height = '100%';
			} while (!videoElement);

			// Attend 2 secondes que tout soit prêt
			await new Promise((resolve) => setTimeout(resolve, 2000));

			readyToExport = true;

			// Calcul direct des timings de screenshots sans scruter le DOM / videoPreview
			// Règles (commentaires d'origine):
			// - Fin du fade-in
			// - 10 frames avant le début du fade-out
			// - Fin du fade-out
			if (exportData) {
				const fadeDuration = globalState.getStyle('global', 'fade-duration')!.value as number; // ms
				// Sous-titres: fade-in/out = fadeDuration/2 ; CustomText: fadeDuration complète
				const halfFade = fadeDuration / 2;

				const exportStart = Math.round(exportData.videoStartTime);
				const exportEnd = Math.round(exportData.videoEndTime);

				let timingsToTakeScreenshots: number[] = [exportStart, exportEnd];

				function add(t: number | undefined) {
					if (t === undefined) return;
					if (t < exportStart || t > exportEnd) return;
					timingsToTakeScreenshots.push(Math.round(t));
				}

				// --- Sous-titres ---
				for (const clip of globalState.getSubtitleTrack.clips) {
					// On limite aux types valides
					// if (!(clip.type === 'Subtitle' || clip.type === 'Pre-defined Subtitle')) continue;
					// @ts-ignore
					const { startTime, endTime } = clip as any;
					if (startTime == null || endTime == null) continue;
					if (endTime < exportStart || startTime > exportEnd) continue;
					const duration = endTime - startTime;
					if (duration <= 0) continue;

					// Fin du fade-in (début + halfFade) – clamp si clip trop court
					const fadeInEnd = Math.min(startTime + halfFade, endTime);
					add(fadeInEnd);

					// Début du fade-out (fin - halfFade) si valable
					const fadeOutStart = endTime - halfFade;
					if (fadeOutStart > startTime) add(fadeOutStart);

					// Fin du fade-out (fin du clip)
					add(endTime);
				}

				// --- Custom Texts --- (fade-in/out utilisent fadeDuration complète)
				for (const ctClip of globalState.getCustomTextTrack?.clips || []) {
					// @ts-ignore
					const category = ctClip.category;
					if (!category) continue;
					const alwaysShow = (category.getStyle('always-show')?.value as number) || 0;
					const startTime = category.getStyle('time-appearance')?.value as number;
					const endTime = category.getStyle('time-disappearance')?.value as number;
					if (startTime == null || endTime == null) continue;
					if (endTime < exportStart || startTime > exportEnd) continue;
					const duration = endTime - startTime;
					if (duration <= 0) continue;

					if (alwaysShow) {
						// Pas de fade: on ne met pas de points intermédiaires (option: garder start/end si utile)
						add(startTime);
						add(endTime);
						continue;
					}

					// Fin fade-in (début + fadeDuration)
					const ctFadeInEnd = Math.min(startTime + fadeDuration, endTime);
					add(ctFadeInEnd);

					// Début fade-out (fin - fadeDuration)
					const ctFadeOutStart = endTime - fadeDuration;
					if (ctFadeOutStart > startTime) add(ctFadeOutStart);

					// Fin fade-out
					add(endTime);
				}

				// Nettoyage
				const uniqueSorted = Array.from(new Set(timingsToTakeScreenshots))
					.filter((t) => t >= exportStart && t <= exportEnd)
					.sort((a, b) => a - b);

				console.log('Timings détectés (calcul direct):', uniqueSorted);

				let i = 0;
				for (const timing of uniqueSorted) {
					globalState.getTimelineState.movePreviewTo = timing;
					globalState.getTimelineState.cursorPosition = timing;
					await new Promise((resolve) => setTimeout(resolve, 50));
					await takeScreenshot(`${Math.round(timing - exportStart)}`);

					i++;
					emitProgress({
						exportId: Number(exportId),
						progress: (i / uniqueSorted.length) * 100,
						currentState: ExportState.CapturingFrames,
						currentTime: timing - exportStart,
						totalTime: exportEnd - exportStart
					} as ExportProgress);
				}

				emitProgress({
					exportId: Number(exportId),
					progress: 0,
					currentState: ExportState.Initializing,
					currentTime: 0,
					totalTime: exportEnd - exportStart
				} as ExportProgress);

				// Récupère le chemin de fichier de tout les audios du projet
				const audios: string[] = globalState.getAudioTrack.clips.map(
					(clip: any) => globalState.currentProject!.content.getAssetById(clip.assetId).filePath
				);

				// Récupère le chemin de fichier de tout les vidéos du projet
				const videos = globalState.getVideoTrack.clips.map(
					(clip: any) => globalState.currentProject!.content.getAssetById(clip.assetId).filePath
				);

				// Démarre l'export dans Rust
				await invoke('start_export', {
					exportId: exportId,
					imgsFolder: await join(await appDataDir(), ExportService.exportFolder, exportId),
					startTime: globalState.getExportState.videoStartTime,
					endTime: globalState.getExportState.videoEndTime,
					audios: audios,
					videos: videos,
					targetWidth: exportData!.videoDimensions.width,
					targetHeight: exportData!.videoDimensions.height
				});
			}
		}
	});

	async function takeScreenshot(fileName: string) {
		// L'élément à transformer en image
		let node = document.getElementById('overlay')!;

		// Qualité de l'image
		let scale = 1.0;

		// En sachant que node.clientWidth = 1920 et node.clientHeight = 1080,
		// je veux pouvoir avoir la dimension trouver dans les paramètres d'export
		const targetWidth = exportData!.videoDimensions.width;
		const targetHeight = exportData!.videoDimensions.height;

		// Calcul du scale
		const scaleX = targetWidth / node.clientWidth;
		const scaleY = targetHeight / node.clientHeight;
		scale = Math.min(scaleX, scaleY);

		// Utilisation de DomToImage pour transformer la div en image
		try {
			const dataUrl = await DomToImage.toPng(node, {
				width: node.clientWidth * scale,
				height: node.clientHeight * scale,
				style: {
					// Set de la qualité
					transform: 'scale(' + scale + ')',
					transformOrigin: 'top left'
				},
				quality: 1
			});

			// Si on est en mode portrait, on crop pour avoir un ratio 9:16
			let finalDataUrl = dataUrl;

			// with tauri, save the image to the desktop
			const filePathWithName = await join(ExportService.exportFolder, exportId, fileName + '.png');

			// Convertir dataUrl base64 en ArrayBuffer sans utiliser fetch
			const base64Data = finalDataUrl.replace(/^data:image\/png;base64,/, '');
			const binaryString = window.atob(base64Data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			await writeFile(filePathWithName, bytes, { baseDir: BaseDirectory.AppData });
		} catch (error: any) {
			console.error('Error while taking screenshot: ', error);
			toast.error('Error while taking screenshot: ' + error.message);
		}
	}
</script>

{#if globalState.currentProject}
	<div class="absolute inset-0 w-screen h-screen">
		<VideoPreview bind:this={videoPreview} showControls={false} />
		<div class="hidden">
			<Timeline />
		</div>
	</div>
{/if}
