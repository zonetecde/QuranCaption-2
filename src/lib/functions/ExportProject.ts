import { fullScreenPreview, setCurrentVideoTime, videoDimensions } from '$lib/stores/LayoutStore';
import {
	currentProject,
	getFirstAudioOrVideoPath,
	getProjectVersesRange,
	updateUsersProjects
} from '$lib/stores/ProjectStore';
import {
	cursorPosition,
	getTimelineTotalDuration,
	getVideoDurationInMs
} from '$lib/stores/TimelineStore';
import toast from 'svelte-french-toast';
import { get } from 'svelte/store';
import { fs } from '@tauri-apps/api';
import { path } from '@tauri-apps/api';
//@ts-ignore
import DomToImage from 'dom-to-image';
import { EXPORT_PATH } from '$lib/ext/LocalStorageWrapper';
import { createDir } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';
import {
	bottomRatio,
	currentlyExporting,
	endTime,
	startTime,
	topRatio,
	triggerSubtitleResize,
	orientation,
	quality,
	currentlyExportingId,
	type VideoExportStatus,
	showWm,
	enableWm,
	fps
} from '$lib/stores/ExportStore';
import { readjustCursorPosition } from './TimelineHelper';
import { isEscapePressed } from '$lib/stores/ShortcutStore';
import { makeFileNameValid } from '$lib/ext/File';
import { WebviewWindow } from '@tauri-apps/api/window';
import { getAssetFromId } from '$lib/models/Asset';
import { confirm } from '@tauri-apps/api/dialog';

export function openExportWindow() {
	// force save pour mettre à jour les paramètres d'export
	updateUsersProjects(get(currentProject));

	const exportId = Math.floor(Math.random() * 1000000); // ID unique pour l'export

	// Créer la fenêtre qui va prendre les screenshots
	const webview = new WebviewWindow(exportId.toString(), {
		url: '/export?projectId=' + get(currentProject).id + '&exportId=' + exportId,
		resizable: false,
		decorations: false,
		minWidth: 1920,
		minHeight: 1080,
		skipTaskbar: true,
		visible: false, // Le process se fait en arrière plan
		alwaysOnTop: true
	});

	webview.once('tauri://created', async function () {
		// Ajoute à la liste des vidéos en cours d'export
		const exportDetail: VideoExportStatus = {
			exportId: exportId,
			projectName:
				get(currentProject).name +
				(get(currentProject).reciter ? ' (' + get(currentProject).reciter + ')' : ''),
			portrait: get(orientation) === 'portrait',
			status: 'Capturing video frames...',
			outputPath: '',
			progress: 0,
			date: new Date(),
			selectedVersesRange: ''
		};
		exportDetail.outputPath = generateOutputPath({
			projectName: exportDetail.projectName,
			exportId: exportId,
			selectedVersesRange: ''
		} as VideoExportStatus);

		webview.once('tauri://destroyed', function () {
			// modifie le statut de la vidéo en cours d'export
			updateExportStatus(exportId, 0, 'Initializing...');
		});

		webview.once('tauri://error', function (e) {
			console.error('Error creating the webview window', e);
			// An error occurred during the creation of the webview window
		});

		await createOrShowExportDetailsWindow(exportDetail);

		addExport(exportDetail);
	});
}

function updateExportStatus(exportId: number, progress: number, status: string) {
	// Met à jour le statut de l'export
	const exportDetailsWindow = WebviewWindow.getByLabel('exportDetails');
	if (exportDetailsWindow) {
		exportDetailsWindow.emit('updateExportDetailsById', {
			exportId: exportId,
			progress: progress,
			status: status
		});
	}
}

function updateVersesRange(exportId: number, selectedVersesRange: string) {
	// Met à jour la plage de versets sélectionnée pour l'export
	const exportDetailsWindow = WebviewWindow.getByLabel('exportDetails');
	if (exportDetailsWindow) {
		exportDetailsWindow.emit('updateVersesRangeById', {
			exportId: exportId,
			selectedVersesRange: selectedVersesRange
		});
	}
}

function addExport(exportDetail: VideoExportStatus) {
	// Ajoute l'export à la liste des exports en cours
	const exportDetailsWindow = WebviewWindow.getByLabel('exportDetails');
	if (exportDetailsWindow) {
		exportDetailsWindow.emit('addExport', exportDetail);
	}
}

export function generateOutputPath(project: VideoExportStatus) {
	const outputPath = `${EXPORT_PATH}${makeFileNameValid(project.projectName) + '_' + project.selectedVersesRange + '_' + project.exportId}.mp4`;

	return outputPath;
}

// Créer la fenêtre qui affiche tout les exports en cours si elle n'existe pas
export async function createOrShowExportDetailsWindow(
	exportDetail: VideoExportStatus | null = null
) {
	let exportDetailsWindow = WebviewWindow.getByLabel('exportDetails');

	if (!exportDetailsWindow) {
		exportDetailsWindow = new WebviewWindow('exportDetails', {
			url: exportDetail
				? '/export-details?' + encodeURIComponent(JSON.stringify(exportDetail))
				: '/export-details',
			resizable: true,
			skipTaskbar: true,
			alwaysOnTop: true,
			decorations: false,
			minWidth: 600,
			minHeight: 250,
			width: 600,
			height: 500,
			title: 'Export Details'
		});

		// Affiche la fenêtre
		await exportDetailsWindow.show();
	}

	// Si la fenêtre existe déjà, on la met au premier plan
	await exportDetailsWindow.show();
}

/**
 * Fonction appelée par la fenêtre d'export pour exporter le projet courrant en vidéo.
 * @returns
 */
export async function exportCurrentProjectAsVideo() {
	const _currentProject = get(currentProject);

	// Si il n'y a pas de sous-titre entre le dernier sous-titre et le endTime, on en créer un (silencieux)
	const lastSubtitle = _currentProject.timeline.subtitlesTracks[0].clips.slice(-1)[0];
	if (lastSubtitle.end < (get(endTime) || getVideoDurationInMs())) {
		_currentProject.timeline.subtitlesTracks[0].clips = [
			..._currentProject.timeline.subtitlesTracks[0].clips,
			{
				id: 'temporary',
				start: lastSubtitle.end,
				end: get(endTime) || getVideoDurationInMs(),
				verse: -1,
				surah: -1,
				text: '',
				isSilence: true,
				isCustomText: false,
				translations: {},
				firstWordIndexInVerse: -1,
				lastWordIndexInVerse: -1,
				isLastWordInVerse: false,
				hadItTranslationEverBeenModified: false
			}
		];
	}

	// Première étape : on rentre en mode plein écran
	fullScreenPreview.set(true);
	currentlyExporting.set(true);

	// Deuxième étape : on navigue de sous-titre en sous-titre
	const subtitleClips = _currentProject.timeline.subtitlesTracks[0].clips;

	const fadeDurationBackup = _currentProject.projectSettings.globalSubtitlesSettings.fadeDuration;
	_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = 0;

	await createDir(`${EXPORT_PATH}${get(currentlyExportingId)}`, { recursive: true });

	console.log(`Created directory: ${EXPORT_PATH}${get(currentlyExportingId)}`);

	toast("Creating images, do not touch anything. Press 'Esc' to cancel.", {
		duration: 4000,
		icon: 'ℹ️'
	});

	let surahsInVideo = new Set<number>();

	let iMin = 0;
	let iMax = subtitleClips.length - 1;

	for (let i = 0; i < subtitleClips.length; i++) {
		let clip = subtitleClips[i];
		if (clip.end < get(startTime)) {
			iMin = i + 1; // on skip les clips qui sont avant le startTime
			continue;
		} else if (get(endTime) !== null && clip.start > get(endTime)!) {
			iMax = i - 1; // on skip les clips qui sont après le endTime
			break;
		}
	}

	let totalTime = 0;
	let firstWmShown = false;
	let lastTimeShown = 0;

	// wait 2 sec
	await new Promise((resolve) => {
		setTimeout(resolve, 2000);
	});

	let iMinVerseRange = iMin,
		iMaxVerseRange = iMax;
	let fadeDurationBegin = 0;
	let fadeDurationEnd = 0;

	for (let i = iMin; i <= iMax; i++) {
		let clip = subtitleClips[i];

		if (clip.surah !== -1) surahsInVideo.add(clip.surah);

		cursorPosition.set(clip.start + 30);
		triggerSubtitleResize.set(false);

		if (get(enableWm)) {
			if (totalTime > 10 * 1000 && firstWmShown === false) {
				// wm après 10 secondes
				showWm.set(true);
				firstWmShown = true;
			}
			// ou sinon si on a dépassé 2 minutes, wm toutes les 4 minutes
			else if (totalTime > 2 * 60 * 1000) {
				if (lastTimeShown + 4 * 60 * 1000 < totalTime) {
					showWm.set(true);
					lastTimeShown = totalTime;
				} else {
					showWm.set(false);
				}
			}
		}

		// Regarde la durée du clip
		const clipDuration = clip.end - clip.start;
		// Si c'est le tout premier clip ou le tout dernier clip, et que
		// startTime ou endTime sont définis, et que la durée affiché du clip correspond à moins de 40% de la durée du clip,
		// alors on le met en tant que silence
		if (
			i === iMin &&
			get(startTime) !== null &&
			clip.start < get(startTime)! - clipDuration * 0.7
		) {
			clip.isSilence = true;
			clip.text = '';
			clip.translations = {};
			iMinVerseRange = iMin + 1;
			// fade duration pour le début = temps entre le startTime et la fin du clip
			fadeDurationBegin = Math.max(0, clip.end - get(startTime)!);
		} else if (
			i === iMax &&
			get(endTime) !== null &&
			clip.end > get(endTime)! + clipDuration * 0.7
		) {
			clip.isSilence = true;
			clip.text = '';
			clip.translations = {};
			iMaxVerseRange = iMax - 1;
			// fade duration pour la fin = temps entre le endTime et le début du clip
			fadeDurationEnd = Math.max(0, get(endTime)! - clip.start);
		}

		await new Promise((resolve) => {
			setTimeout(resolve, 40);
		});
		triggerSubtitleResize.set(true); // trigger le changement de fontsize pour l'option `fitInOneLine`
		let waitTime = 50;
		if (clip.text.split(' ').length >= 9) {
			waitTime = 120;
		}
		if (get(orientation) === 'portrait' || get(currentProject).projectSettings.isPortrait) {
			waitTime += 50;
		}

		await new Promise((resolve) => {
			setTimeout(resolve, waitTime); // wait for subtitles to be displayed in one line
		});

		// Une fois que le sous-titre est affiché, enregistre en image tout ce qui est affiché
		// take a screenshot of the current frame
		await takeScreenshot(
			get(currentlyExportingId)!.toString(),
			Math.floor(clip.start) + '_' + Math.floor(clip.end)
		);

		// On met à jour la progress bar
		updateExportStatus(
			get(currentlyExportingId)!,
			Math.floor(((i - iMin) / (iMax - iMin)) * 100),
			'Capturing video frames...'
		);

		totalTime += clip.end - clip.start;
		showWm.set(false);
	}

	// Récupère les versets sélectionnés
	let selectedVersesRange = getProjectVersesRange(_currentProject, iMinVerseRange, iMaxVerseRange);
	updateVersesRange(get(currentlyExportingId)!, selectedVersesRange.join(', '));

	_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = fadeDurationBackup;

	// On sort du mode plein écran
	fullScreenPreview.set(false);
	currentlyExporting.set(false);

	// Enlève tout les doublons dans surahsInVideo
	surahsInVideo = new Set<number>([...surahsInVideo].sort((a, b) => a - b));

	// Supprime le sous-titre temporaire (ceux qui ont pour id "temporary")
	_currentProject.timeline.subtitlesTracks[0].clips =
		_currentProject.timeline.subtitlesTracks[0].clips.filter((clip) => clip.id !== 'temporary');

	const outputPath = generateOutputPath({
		exportId: get(currentlyExportingId)!,
		projectName:
			get(currentProject).name +
			(get(currentProject).reciter ? ' (' + get(currentProject).reciter + ')' : ''),
		selectedVersesRange: selectedVersesRange.join(', ')
	} as VideoExportStatus);

	// On appelle le script python pour créer la vidéo
	let audioPath = getFirstAudioOrVideoPath();
	if (audioPath === './black-vid.mp4') {
		audioPath = '';
	}

	// récupère l'image de fond/la vidéo de fond
	let backgroundPath = '';
	let isImage: boolean = false;
	// s'il existe une vidéo ou une image on la prend en vidéo/img de fond.
	// vérifie aussi qu'on a pas un overlay qui la cacherait, dans ce cas on
	// ne prend pas la vidéo/image de fond (ce sera plus rapide pour générer la vidéo)
	if (
		_currentProject.timeline.videosTracks[0].clips.length > 0 &&
		_currentProject.timeline.videosTracks[0].clips[0].assetId !== 'black-video' &&
		// S'il y a une vidéo de fond mais qu'elle est caché par l'overlay bg
		((_currentProject.projectSettings.globalSubtitlesSettings.background &&
			_currentProject.projectSettings.globalSubtitlesSettings.backgroundOpacity < 1) ||
			_currentProject.projectSettings.globalSubtitlesSettings.background === false)
	) {
		backgroundPath = getAssetFromId(
			_currentProject.timeline.videosTracks[0].clips[0].assetId
		)!.filePath;
	} else if (
		// en deuxieme cas, s'il existe une image de fond on la prend
		_currentProject.projectSettings.globalSubtitlesSettings.backgroundImage &&
		// S'il y a une image de fond mais qu'elle est caché par l'overlay bg
		((_currentProject.projectSettings.globalSubtitlesSettings.background &&
			_currentProject.projectSettings.globalSubtitlesSettings.backgroundOpacity < 1) ||
			_currentProject.projectSettings.globalSubtitlesSettings.background === false)
	) {
		backgroundPath = _currentProject.projectSettings.globalSubtitlesSettings.backgroundImage;
		isImage = true;
	}

	invoke('create_video', {
		exportId: get(currentlyExportingId),
		folderPath: `${EXPORT_PATH}${get(currentlyExportingId)}`,
		audioPath: audioPath,
		transitionMs:
			Math.floor(_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration) * 2,
		startTime: Math.floor(get(startTime)),
		endTime: Math.floor(get(endTime) || 0),
		outputPath: outputPath,
		topRatio: get(topRatio) / 100,
		bottomRatio: get(bottomRatio) / 100,
		dynamicTop:
			(surahsInVideo.size > 1 &&
				_currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.enable) ||
			get(enableWm), // si il y a plusieurs sourates le top avec affichage de la sourate changera
		backgroundFile: backgroundPath,
		// on desactive les translations/size si c'est une image
		backgroundXTranslation: isImage ? 0 : _currentProject.projectSettings.translateVideoX,
		backgroundYTranslation: isImage ? 0 : _currentProject.projectSettings.translateVideoY,
		backgroundScale: isImage ? 1 : _currentProject.projectSettings.videoScale,
		audioFadeStart: Math.floor(fadeDurationBegin),
		audioFadeEnd: Math.floor(fadeDurationEnd),
		fps: get(fps)
	});

	// Ferme la fenêtre d'export
	// l'id de la fenetre est le même que l'id de l'export
	const webview = WebviewWindow.getByLabel(get(currentlyExportingId)!.toString());
	if (webview) {
		webview.close();
	}
}

async function takeScreenshot(folderName: string, fileName: string) {
	// L'élément à transformer en image
	let node = document.getElementById('preview')!;

	// Qualité de l'image
	let scale = get(quality);

	// Si en mode portrait, on va prévoir pour le crop 9:16
	const isPortrait =
		get(orientation) === 'portrait' || get(currentProject).projectSettings.isPortrait;

	// Utilisation de DomToImage pour transformer la div en image
	try {
		const dataUrl = await DomToImage.toPng(node, {
			width: node.clientWidth * scale,
			height: node.clientHeight * scale,
			style: {
				// Set de la qualité
				transform: 'scale(' + scale + ')',
				transformOrigin: 'top left'
			}
		});

		// Si on est en mode portrait, on crop pour avoir un ratio 9:16
		let finalDataUrl = dataUrl;
		if (isPortrait) {
			// Créer un canvas temporaire pour manipuler l'image
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');

			if (context) {
				// Créer une image à partir de dataUrl
				const img = new Image();
				img.src = dataUrl;

				// Attendre que l'image soit chargée
				await new Promise((resolve) => {
					img.onload = resolve;
				});

				// Calculer les dimensions pour un ratio 9:16
				// En gardant toute la hauteur et en ajustant la largeur
				const targetRatio = 9 / 16;
				const finalHeight = img.height;
				const finalWidth = finalHeight * targetRatio;

				// Centrer horizontalement (prendre le milieu de l'image)
				const offsetX = (img.width - finalWidth) / 2;

				// Configurer le canvas pour les nouvelles dimensions
				canvas.width = finalWidth;
				canvas.height = finalHeight;

				// Dessiner la partie de l'image qu'on veut garder
				context.drawImage(img, offsetX, 0, finalWidth, finalHeight, 0, 0, finalWidth, finalHeight);

				// Récupérer la nouvelle image
				finalDataUrl = canvas.toDataURL('image/png');
			}
		}

		// with tauri, save the image to the desktop
		const fileNameWithExtension = fileName + '.png';
		const filePathWithName = `${EXPORT_PATH}${folderName}/${fileNameWithExtension}`;

		// Convertir dataUrl base64 en ArrayBuffer sans utiliser fetch
		const base64Data = finalDataUrl.replace(/^data:image\/png;base64,/, '');
		const binaryString = window.atob(base64Data);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		await fs.writeBinaryFile({
			path: filePathWithName,
			contents: bytes.buffer
		});
	} catch (error: any) {
		console.error('Error while taking screenshot: ', error);
		toast.error('Error while taking screenshot: ' + error.message);
	}
}

export function isVideoExportFinished(exportDetails: VideoExportStatus) {
	return (
		exportDetails.status === 'Cancelled' ||
		exportDetails.status === 'Exported' ||
		exportDetails.status === 'Error'
	);
}
