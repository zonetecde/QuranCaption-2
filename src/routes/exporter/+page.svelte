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
	import { exists, BaseDirectory, mkdir, writeFile, remove, readFile } from '@tauri-apps/plugin-fs';
	import { LogicalPosition } from '@tauri-apps/api/dpi';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { appDataDir, join } from '@tauri-apps/api/path';
	import ExportService, { type ExportProgress } from '$lib/services/ExportService';
	import { getAllWindows } from '@tauri-apps/api/window';
	import Exportation, { ExportState } from '$lib/classes/Exportation.svelte';
	import toast from 'svelte-5-french-toast';
	import DomToImage from 'dom-to-image';
	import SubtitleClip from '$lib/components/projectEditor/timeline/track/SubtitleClip.svelte';
	import { ClipWithTranslation, CustomTextClip, SilenceClip } from '$lib/classes/Clip.svelte';

	// Indique si l'enregistrement a commencé
	let readyToExport = $state(false);

	// Contient l'ID de l'export
	let exportId = '';

	// VideoPreview
	let videoPreview: VideoPreview | undefined = $state(undefined);

	// Récupère les données d'export de la vidéo
	let exportData: Exportation | undefined;

	// Constante pour la durée de chunk (2min30 minutes en millisecondes)
	const CHUNK_DURATION = 2.5 * 60 * 1000;

	async function exportProgress(event: any) {
		const data = event.payload as {
			progress?: number;
			current_time: number;
			total_time?: number;
			export_id: string;
			chunk_index?: number;
		};

		// Vérifie que c'est bien pour cette exportation
		if (data.export_id !== exportId) return;

		if (data.progress !== null && data.progress !== undefined) {
			console.log(
				`Export Progress: ${data.progress.toFixed(1)}% (${data.current_time.toFixed(1)}s / ${data.total_time?.toFixed(1)}s)`
			);

			const chunkIndex = data.chunk_index || 0;
			const totalDuration = exportData!.videoEndTime - exportData!.videoStartTime;
			const totalChunks = Math.ceil(totalDuration / CHUNK_DURATION);

			// Calculer le pourcentage global et le temps actuel global
			let globalProgress: number;
			let globalCurrentTime: number;

			if (data.chunk_index !== undefined) {
				// Mode chunked export
				// Chaque chunk représente une portion égale du pourcentage total
				// Calcul donc le pourcentage global basé sur le chunk actuel et son progrès
				const chunkProgressWeight = 100 / totalChunks;
				const baseProgress = chunkIndex * chunkProgressWeight;
				const chunkLocalProgress = (data.progress / 100) * chunkProgressWeight;
				globalProgress = baseProgress + chunkLocalProgress;

				// Calculer le temps global basé sur la position du chunk et son progrès
				const chunkDuration = Math.min(CHUNK_DURATION, totalDuration - chunkIndex * CHUNK_DURATION);
				const chunkLocalTime = (data.current_time / (data.total_time || 1)) * chunkDuration;
				globalCurrentTime = chunkIndex * CHUNK_DURATION + chunkLocalTime;
			} else {
				// Mode export normal (sans chunks)
				globalProgress = data.progress;
				globalCurrentTime = data.current_time * 1000; // Convertir de secondes en millisecondes
			}

			emitProgress({
				exportId: Number(exportId),
				progress: globalProgress,
				currentState: ExportState.CreatingVideo,
				currentTime: globalCurrentTime
			} as ExportProgress);
		} else {
			console.log(`Export Processing: ${data.current_time.toFixed(1)}s elapsed`);
		}
	}

	async function exportComplete(event: any) {
		const data = event.payload as { filename: string; exportId: string; chunkIndex?: number };

		// Vérifie que c'est bien pour cette exportation
		if (data.exportId !== exportId) return;

		console.log(`✅ Export complete! File saved as: ${data.filename}`);

		// Si c'est un chunk, ne pas émettre 100% maintenant (ça sera fait à la fin de tous les chunks)
		if (data.chunkIndex === undefined) {
			// Export normal (sans chunks) - émettre 100%
			await emitProgress({
				exportId: Number(exportId),
				progress: 100,
				currentState: ExportState.Exported
			} as ExportProgress);
		} else {
			// Export en chunks - juste logger la completion du chunk
			console.log(`✅ Chunk ${data.chunkIndex} completed`);
		}
	}

	async function exportError(event: any) {
		const error = event.payload as { error: string; export_id: string };
		console.error(`❌ Export failed: ${error}`);

		if (error.export_id !== exportId) return;

		emitProgress({
			exportId: Number(exportId),
			progress: 100,
			currentState: ExportState.Error,
			errorLog: error.error
		} as ExportProgress);
	}

	async function emitProgress(progress: ExportProgress) {
		(await getAllWindows()).find((w) => w.label === 'main')!.emit('export-progress-main', progress);
	}

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
			// Hide waveform: consomme des ressources inutilement
			if (globalState.settings) globalState.settings.persistentUiState.showWaveforms = false;

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

			// Démarrer l'export
			await startExport();
		}
	});

	async function startExport() {
		if (!exportData) return;

		const exportStart = Math.round(exportData.videoStartTime);
		const exportEnd = Math.round(exportData.videoEndTime);
		const totalDuration = exportEnd - exportStart;

		console.log(`Export duration: ${totalDuration}ms (${totalDuration / 1000 / 60} minutes)`);

		// Si la durée est supérieure à 10 minutes, on découpe en chunks
		if (totalDuration > CHUNK_DURATION) {
			console.log('Duration > 10 minutes, using chunked export');
			await handleChunkedExport(exportStart, exportEnd, totalDuration);
		} else {
			console.log('Duration <= 10 minutes, using normal export');
			await handleNormalExport(exportStart, exportEnd, totalDuration);
		}
	}

	async function handleChunkedExport(
		exportStart: number,
		exportEnd: number,
		totalDuration: number
	) {
		// Calculer les chunks en s'arrêtant au prochain fade-out après 10 minutes
		const chunkInfo = calculateChunksWithFadeOut(exportStart, exportEnd);
		const generatedVideoFiles: string[] = [];

		console.log(`Splitting into ${chunkInfo.chunks.length} chunks`);
		chunkInfo.chunks.forEach((chunk, i) => {
			console.log(`Chunk ${i + 1}: ${chunk.start} -> ${chunk.end} (${chunk.end - chunk.start}ms)`);
		});
		// PHASE 1: Génération de TOUS les screenshots (0 à 100% du progrès total)
		console.log('=== PHASE 1: Génération de tous les screenshots ===');
		for (let chunkIndex = 0; chunkIndex < chunkInfo.chunks.length; chunkIndex++) {
			const chunk = chunkInfo.chunks[chunkIndex];
			const chunkImageFolder = `chunk_${chunkIndex}`;

			// Créer le dossier d'images pour ce chunk
			await createChunkImageFolder(chunkImageFolder);

			// Générer les images pour ce chunk
			await generateImagesForChunk(
				chunkIndex,
				chunk.start,
				chunk.end,
				chunkImageFolder,
				chunkInfo.chunks.length,
				0, // phase start (0%)
				100 // phase end (100%)
			);
		}

		// PHASE 2: Génération de TOUTES les vidéos
		console.log('=== PHASE 2: Génération de toutes les vidéos ===');

		// Initialiser l'état avant l'export vidéo
		emitProgress({
			exportId: Number(exportId),
			progress: 0,
			currentState: ExportState.Initializing,
			currentTime: 0,
			totalTime: totalDuration
		} as ExportProgress);

		for (let chunkIndex = 0; chunkIndex < chunkInfo.chunks.length; chunkIndex++) {
			const chunk = chunkInfo.chunks[chunkIndex];
			const chunkImageFolder = `chunk_${chunkIndex}`;
			const chunkActualDuration = chunk.end - chunk.start;

			// Générer la vidéo pour ce chunk
			const chunkVideoPath = await generateVideoForChunk(
				chunkIndex,
				chunkImageFolder,
				chunk.start,
				chunkActualDuration
			);

			generatedVideoFiles.push(chunkVideoPath);
		}

		// PHASE 3: Concaténation
		console.log('=== PHASE 3: Concaténation des vidéos ===');

		// Combiner toutes les vidéos en une seule
		console.log('Concatenating all chunk videos:', generatedVideoFiles);
		await concatenateVideos(generatedVideoFiles);

		// Nettoyage final
		await finalCleanup();

		emitProgress({
			exportId: Number(exportId),
			progress: 100,
			currentState: ExportState.Exported,
			currentTime: totalDuration,
			totalTime: totalDuration
		} as ExportProgress);
	}

	async function createChunkImageFolder(chunkImageFolder: string) {
		const chunkPath = await join(ExportService.exportFolder, exportId, chunkImageFolder);
		await mkdir(chunkPath, {
			baseDir: BaseDirectory.AppData,
			recursive: true
		});
		console.log(`Created chunk folder: ${chunkPath}`);
	}

	async function generateImagesForChunk(
		chunkIndex: number,
		chunkStart: number,
		chunkEnd: number,
		chunkImageFolder: string,
		totalChunks: number,
		phaseStartProgress: number = 0,
		phaseEndProgress: number = 100
	) {
		const fadeDuration = Math.round(
			globalState.getStyle('global', 'fade-duration')!.value as number
		);

		// Calculer les timings pour ce chunk spécifique
		const chunkTimings = calculateTimingsForRange(chunkStart, chunkEnd);

		console.log(`Chunk ${chunkIndex}: ${chunkTimings.uniqueSorted.length} screenshots to take`);

		let i = 0;
		let base = -fadeDuration; // Pour compenser le fade-in du début

		for (const timing of chunkTimings.uniqueSorted) {
			// Calculer l'index de l'image dans ce chunk (recommence à 0)
			const imageIndex = Math.max(Math.round(timing - chunkStart + base), 0);

			if (chunkTimings.blankImgs.includes(timing) && chunkTimings.imgWithNothingShown !== -1) {
				// On duplique l'image imgWithNothingShown
				await duplicateScreenshot('blank', imageIndex, chunkImageFolder);
				console.log(
					`Chunk ${chunkIndex}: Duplicating screenshot at timing ${timing} -> image ${imageIndex}`
				);
			} else {
				globalState.getTimelineState.movePreviewTo = timing;
				globalState.getTimelineState.cursorPosition = timing;

				await new Promise((resolve) => setTimeout(resolve, 150));

				await takeScreenshot(`${imageIndex}`, chunkImageFolder);

				// Si c'est l'img blank
				if (timing === chunkTimings.imgWithNothingShown) {
					await takeScreenshot('blank');
				}

				console.log(
					`Chunk ${chunkIndex}: Screenshot taken at timing ${timing} -> image ${imageIndex}`
				);
			}

			base += fadeDuration;
			i++;

			// Progress pour ce chunk dans la phase spécifiée
			const chunkImageProgress = (i / chunkTimings.uniqueSorted.length) * 100;
			const chunkPhaseProgress = (chunkIndex * 100 + chunkImageProgress) / totalChunks;
			const globalProgress =
				phaseStartProgress + (chunkPhaseProgress * (phaseEndProgress - phaseStartProgress)) / 100;

			emitProgress({
				exportId: Number(exportId),
				progress: globalProgress,
				currentState: ExportState.CapturingFrames,
				currentTime: timing - exportData!.videoStartTime,
				totalTime: exportData!.videoEndTime - exportData!.videoStartTime
			} as ExportProgress);
		}
	}

	async function generateVideoForChunk(
		chunkIndex: number,
		chunkImageFolder: string,
		chunkStart: number,
		chunkDuration: number
	): Promise<string> {
		const fadeDuration = Math.round(
			globalState.getStyle('global', 'fade-duration')!.value as number
		);

		// Récupère le chemin de fichier de tous les audios du projet
		const audios: string[] = globalState.getAudioTrack.clips.map(
			(clip: any) => globalState.currentProject!.content.getAssetById(clip.assetId).filePath
		);

		// Récupère le chemin de fichier de toutes les vidéos du projet
		const videos = globalState.getVideoTrack.clips.map(
			(clip: any) => globalState.currentProject!.content.getAssetById(clip.assetId).filePath
		);

		const chunkVideoFileName = `chunk_${chunkIndex}_video.mp4`;
		const chunkFinalFilePath = await join(
			await appDataDir(),
			ExportService.exportFolder,
			exportId,
			chunkVideoFileName
		);

		console.log(`Generating video for chunk ${chunkIndex}: ${chunkFinalFilePath}`);

		try {
			await invoke('export_video', {
				exportId: exportId,
				imgsFolder: await join(
					await appDataDir(),
					ExportService.exportFolder,
					exportId,
					chunkImageFolder
				),
				finalFilePath: chunkFinalFilePath,
				fps: exportData!.fps,
				fadeDuration: fadeDuration,
				startTime: Math.round(chunkStart), // Le startTime pour l'audio/vidéo de fond
				duration: Math.round(chunkDuration),
				audios: audios,
				videos: videos,
				chunkIndex: chunkIndex
			});

			console.log(`✅ Chunk ${chunkIndex} video generated successfully`);
			return chunkFinalFilePath;
		} catch (e: any) {
			console.error(`❌ Error generating chunk ${chunkIndex} video:`, e);
			throw e;
		}
	}

	async function concatenateVideos(videoFilePaths: string[]) {
		console.log('Starting video concatenation...');

		try {
			const finalVideoPath = await invoke('concat_videos', {
				videoPaths: videoFilePaths,
				outputPath: exportData!.finalFilePath
			});

			console.log('✅ Videos concatenated successfully:', finalVideoPath);

			// Supprimer les vidéos de chunks individuelles
			for (const videoPath of videoFilePaths) {
				try {
					await remove(videoPath, { baseDir: BaseDirectory.AppData });
					console.log(`Deleted chunk video: ${videoPath}`);
				} catch (e) {
					console.warn(`Could not delete chunk video ${videoPath}:`, e);
				}
			}
		} catch (e: any) {
			console.error('❌ Error concatenating videos:', e);
			emitProgress({
				exportId: Number(exportId),
				progress: 100,
				currentState: ExportState.Error,
				errorLog: JSON.stringify(e, Object.getOwnPropertyNames(e))
			} as ExportProgress);
			throw e;
		}
	}

	async function handleNormalExport(exportStart: number, exportEnd: number, totalDuration: number) {
		const fadeDuration = Math.round(
			globalState.getStyle('global', 'fade-duration')!.value as number
		);

		// Calculer tous les timings nécessaires
		const timings = calculateTimingsForRange(exportStart, exportEnd);

		console.log('Normal export - Timings détectés:', timings.uniqueSorted);
		console.log(
			'Image(s) à dupliquer (blank):',
			timings.blankImgs,
			'Image choisie:',
			timings.imgWithNothingShown
		);

		let i = 0;
		let base = -fadeDuration;

		for (const timing of timings.uniqueSorted) {
			if (timings.blankImgs.includes(timing) && timings.imgWithNothingShown !== -1) {
				await duplicateScreenshot('blank', Math.max(Math.round(timing - exportStart + base), 0));
				console.log('Duplicating screenshot instead of taking new one at', timing);
			} else {
				globalState.getTimelineState.movePreviewTo = timing;
				globalState.getTimelineState.cursorPosition = timing;

				await new Promise((resolve) => setTimeout(resolve, 50));

				await takeScreenshot(`${Math.max(Math.round(timing - exportStart + base), 0)}`);

				if (timing === timings.imgWithNothingShown) {
					await takeScreenshot('blank');
				}
			}

			base += fadeDuration;
			i++;

			emitProgress({
				exportId: Number(exportId),
				progress: (i / timings.uniqueSorted.length) * 100,
				currentState: ExportState.CapturingFrames,
				currentTime: timing - exportStart,
				totalTime: totalDuration
			} as ExportProgress);
		}

		// Générer la vidéo normale
		await generateNormalVideo(exportStart, totalDuration);

		// Nettoyage
		await finalCleanup();
	}

	function calculateTimingsForRange(rangeStart: number, rangeEnd: number) {
		const fadeDuration = Math.round(
			globalState.getStyle('global', 'fade-duration')!.value as number
		);
		const halfFade = fadeDuration / 2;

		let timingsToTakeScreenshots: number[] = [rangeStart, rangeEnd];
		let imgWithNothingShown: number = -1;
		let blankImgs: number[] = [];

		function add(t: number | undefined) {
			if (t === undefined) return;
			if (t < rangeStart || t > rangeEnd) return;
			timingsToTakeScreenshots.push(Math.round(t));
		}

		// --- Sous-titres ---
		for (const clip of globalState.getSubtitleTrack.clips) {
			// @ts-ignore
			const { startTime, endTime } = clip as any;
			if (startTime == null || endTime == null) continue;
			if (endTime < rangeStart || startTime > rangeEnd) continue;
			const duration = endTime - startTime;
			if (duration <= 0) continue;

			if (!(clip instanceof SilenceClip)) {
				const fadeInEnd = Math.min(startTime + fadeDuration, endTime);
				add(fadeInEnd);

				const fadeOutStart = endTime - fadeDuration;
				if (fadeOutStart > startTime) add(fadeOutStart);

				add(endTime);
			} else {
				console.log('Silence clip detected, skipping fade-in/out timings.');

				if (imgWithNothingShown === -1) {
					add(endTime);
				} else {
					blankImgs.push(Math.round(endTime));
				}
			}

			if (
				!globalState.getCustomTextTrack?.clips.find((ctClip) => {
					// @ts-ignore
					const clip = ctClip as CustomTextClip;
					const alwaysShow = clip.category!.getStyle('always-show')!.value as boolean;

					if (alwaysShow) {
						return false;
					}

					return clip.startTime! <= endTime && clip.endTime! >= endTime;
				})
			) {
				if (imgWithNothingShown === -1) {
					imgWithNothingShown = Math.round(endTime);
				} else {
					blankImgs.push(Math.round(endTime));
				}
			}
		}

		// --- Custom Texts ---
		for (const ctClip of globalState.getCustomTextTrack?.clips || []) {
			// @ts-ignore
			const category = ctClip.category;
			if (!category) continue;
			const alwaysShow = (category.getStyle('always-show')?.value as number) || 0;
			const startTime = category.getStyle('time-appearance')?.value as number;
			const endTime = category.getStyle('time-disappearance')?.value as number;
			if (startTime == null || endTime == null) continue;
			if (endTime < rangeStart || startTime > rangeEnd) continue;
			const duration = endTime - startTime;
			if (duration <= 0) continue;

			if (alwaysShow) {
				add(startTime);
				add(endTime);
				continue;
			}

			const ctFadeInEnd = Math.min(startTime + fadeDuration, endTime);
			add(ctFadeInEnd);

			const ctFadeOutStart = endTime - fadeDuration;
			if (ctFadeOutStart > startTime) add(ctFadeOutStart);

			add(endTime);
		}

		const uniqueSorted = Array.from(new Set(timingsToTakeScreenshots))
			.filter((t) => t >= rangeStart && t <= rangeEnd)
			.sort((a, b) => a - b);

		return { uniqueSorted, imgWithNothingShown, blankImgs };
	}

	async function generateNormalVideo(exportStart: number, duration: number) {
		emitProgress({
			exportId: Number(exportId),
			progress: 0,
			currentState: ExportState.Initializing,
			currentTime: 0,
			totalTime: duration
		} as ExportProgress);

		const fadeDuration = Math.round(
			globalState.getStyle('global', 'fade-duration')!.value as number
		);

		// Récupère le chemin de fichier de tous les audios du projet
		const audios: string[] = globalState.getAudioTrack.clips.map(
			(clip: any) => globalState.currentProject!.content.getAssetById(clip.assetId).filePath
		);

		// Récupère le chemin de fichier de toutes les vidéos du projet
		const videos = globalState.getVideoTrack.clips.map(
			(clip: any) => globalState.currentProject!.content.getAssetById(clip.assetId).filePath
		);

		console.log(exportData!.finalFilePath);

		try {
			await invoke('export_video', {
				exportId: exportId,
				imgsFolder: await join(await appDataDir(), ExportService.exportFolder, exportId),
				finalFilePath: exportData!.finalFilePath,
				fps: exportData!.fps,
				fadeDuration: fadeDuration,
				startTime: exportStart,
				duration: Math.round(duration),
				audios: audios,
				videos: videos
			});
		} catch (e: any) {
			emitProgress({
				exportId: Number(exportId),
				progress: 100,
				currentState: ExportState.Error,
				errorLog: JSON.stringify(e, Object.getOwnPropertyNames(e))
			} as ExportProgress);
			throw e;
		}
	}

	async function finalCleanup() {
		try {
			// Supprime le dossier temporaire des images
			// await remove(await join(ExportService.exportFolder, exportId), {
			// 	baseDir: BaseDirectory.AppData,
			// 	recursive: true
			// });

			console.log('Temporary images folder removed.');
		} catch (e) {
			console.warn('Could not remove temporary folder:', e);
		}

		// Ferme la fenêtre d'export
		getCurrentWebviewWindow().close();
	}

	async function takeScreenshot(fileName: string, subfolder: string | null = null) {
		// L'élément à transformer en image
		let node = document.getElementById('overlay')!;

		// Qualité de l'image
		let scale = 1.0;

		// En sachant que node.clientWidth = 1920 et node.clientHeight = 1080,
		// je veux pouvoir avoir la dimension trouvée dans les paramètres d'export
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

			// Déterminer le chemin du fichier
			const pathComponents = [ExportService.exportFolder, exportId];
			if (subfolder) pathComponents.push(subfolder);
			pathComponents.push(fileName + '.png');

			const filePathWithName = await join(...pathComponents);

			// Convertir dataUrl base64 en ArrayBuffer sans utiliser fetch
			const base64Data = finalDataUrl.replace(/^data:image\/png;base64,/, '');
			const binaryString = window.atob(base64Data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			await writeFile(filePathWithName, bytes, { baseDir: BaseDirectory.AppData });
			console.log('Screenshot saved to:', filePathWithName);
		} catch (error: any) {
			console.error('Error while taking screenshot: ', error);
			toast.error('Error while taking screenshot: ' + error.message);
		}
	}

	async function duplicateScreenshot(
		sourceFileName: string,
		targetFileName: number,
		subfolder: string | null = null
	) {
		// Construire les chemins source et cible
		const sourcePathComponents = [ExportService.exportFolder, exportId];
		const targetPathComponents = [ExportService.exportFolder, exportId];

		if (subfolder) {
			if (sourceFileName !== 'blank') sourcePathComponents.push(subfolder);
			targetPathComponents.push(subfolder);
		}

		sourcePathComponents.push(sourceFileName + '.png');
		targetPathComponents.push(targetFileName + '.png');

		const sourceFilePathWithName = await join(...sourcePathComponents);
		const targetFilePathWithName = await join(...targetPathComponents);

		// Vérifie que le fichier source existe
		if (!(await exists(sourceFilePathWithName, { baseDir: BaseDirectory.AppData }))) {
			console.error('Source screenshot does not exist:', sourceFilePathWithName);
			return;
		}

		// Lit le fichier source
		const data = await readFile(sourceFilePathWithName, { baseDir: BaseDirectory.AppData });
		// Écrit le fichier cible
		await writeFile(targetFilePathWithName, data, { baseDir: BaseDirectory.AppData });
		console.log('Duplicate screenshot saved to:', targetFilePathWithName);
	}

	function calculateChunksWithFadeOut(exportStart: number, exportEnd: number) {
		const fadeDuration = Math.round(
			globalState.getStyle('global', 'fade-duration')!.value as number
		);

		// Collecter tous les moments de fin de fade-out
		const fadeOutEndTimes: number[] = [];

		// --- Sous-titres ---
		for (const clip of globalState.getSubtitleTrack.clips) {
			// @ts-ignore
			const { startTime, endTime } = clip as any;
			if (startTime == null || endTime == null) continue;
			if (endTime < exportStart || startTime > exportEnd) continue;

			if (!(clip instanceof SilenceClip)) {
				// Fin de fade-out = endTime (moment où le fade-out se termine)
				fadeOutEndTimes.push(endTime);
			}
		}

		// --- Custom Texts ---
		for (const ctClip of globalState.getCustomTextTrack?.clips || []) {
			// @ts-ignore
			const category = ctClip.category;
			if (!category) continue;
			const alwaysShow = (category.getStyle('always-show')?.value as number) || 0;
			const startTime = category.getStyle('time-appearance')?.value as number;
			const endTime = category.getStyle('time-disappearance')?.value as number;
			if (startTime == null || endTime == null) continue;
			if (endTime < exportStart || startTime > exportEnd) continue;

			if (!alwaysShow) {
				// Fin de fade-out = endTime
				fadeOutEndTimes.push(endTime);
			}
		}

		// Trier les fins de fade-out et enlever les doublons
		const sortedFadeOutEnds = Array.from(new Set(fadeOutEndTimes))
			.filter((time) => time >= exportStart && time <= exportEnd)
			.sort((a, b) => a - b);

		console.log('Fins de fade-out détectées:', sortedFadeOutEnds);

		// Calculer les chunks
		const chunks: Array<{ start: number; end: number }> = [];
		let currentStart = exportStart;

		while (currentStart < exportEnd) {
			// Calculer la fin idéale du chunk (currentStart + 10 minutes)
			const idealChunkEnd = currentStart + CHUNK_DURATION;

			if (idealChunkEnd >= exportEnd) {
				// Le chunk final
				chunks.push({ start: currentStart, end: exportEnd });
				break;
			}

			// Trouver la prochaine fin de fade-out après idealChunkEnd
			const nextFadeOutEnd = sortedFadeOutEnds.find((time) => time >= idealChunkEnd);

			if (nextFadeOutEnd && nextFadeOutEnd <= exportEnd) {
				// S'arrêter à cette fin de fade-out
				chunks.push({ start: currentStart, end: nextFadeOutEnd });
				currentStart = nextFadeOutEnd;
			} else {
				// Pas de fade-out trouvé, s'arrêter à la fin idéale ou à la fin totale
				const chunkEnd = Math.min(idealChunkEnd, exportEnd);
				chunks.push({ start: currentStart, end: chunkEnd });
				currentStart = chunkEnd;
			}
		}

		return { chunks, fadeOutEndTimes: sortedFadeOutEnds };
	}

	// ...existing code...
</script>

{#if globalState.currentProject}
	<div class="absolute inset-0 w-screen h-screen">
		<VideoPreview bind:this={videoPreview} showControls={false} />
		<div class="hidden">
			<Timeline />
		</div>
	</div>
{/if}
