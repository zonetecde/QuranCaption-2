import { fullScreenPreview, setCurrentVideoTime, videoDimensions } from '$lib/stores/LayoutStore';
import {
	currentProject,
	getFirstAudioOrVideoPath,
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
	currentlyExportingVideos,
	currentlyExportingId
} from '$lib/stores/ExportStore';
import { readjustCursorPosition } from './TimelineHelper';
import { isEscapePressed } from '$lib/stores/ShortcutStore';
import { makeFileNameValid } from '$lib/ext/File';
import { WebviewWindow } from '@tauri-apps/api/window';
import { appWindow } from '@tauri-apps/api/window';

export function openExportWindow() {
	// force save pour mettre à jour les paramètres d'export
	updateUsersProjects(get(currentProject));

	const exportId = Math.floor(Math.random() * 1000000); // ID unique pour l'export
	const uniqueLabel = 'exportWindow' + exportId;

	const webview = new WebviewWindow(uniqueLabel, {
		url: '/export?projectId=' + get(currentProject).id + '&exportId=' + exportId,
		resizable: false,
		decorations: false,
		width: 1920,
		height: 1080,
		skipTaskbar: true
	});

	appWindow.onCloseRequested((e) => {
		// Close the webview window when the main window is closed
		const webview = WebviewWindow.getByLabel(uniqueLabel);
		if (webview) {
			webview.close();
		}

		// and close the main window
		appWindow.close();
	});

	// Create a promise that resolves when the event tauri://destroyed is triggered
	const exportPromise = new Promise<void>((resolve, reject) => {
		webview.once('tauri://destroyed', function () {
			resolve();

			toast.success(
				'The export process has started. You can monitor its progress in the opened console.',
				{
					duration: 8000
				}
			);

			// modifie le statut de la vidéo en cours d'export
			currentlyExportingVideos.update((videos) => {
				return videos.map((video) => {
					if (video.windowLabel === uniqueLabel) {
						video.status = 'exporting';
					}
					return video;
				});
			});
		});

		webview.once('tauri://error', function (e) {
			console.error('Error creating the webview window', e);
			// An error occurred during the creation of the webview window
			reject(e);
		});
	});
	webview.once('tauri://created', function () {
		// webview.minimize(); // Minimize the window to avoid displaying it

		// Ajoute à la liste des vidéos en cours d'export
		currentlyExportingVideos.set([
			{
				exportId: exportId,
				projectName: get(currentProject).name + ' (' + get(currentProject).reciter + ')',
				startTime: get(startTime),
				endTime: get(endTime) || getVideoDurationInMs(),
				portrait: get(orientation) === 'portrait',
				windowLabel: uniqueLabel,
				status: 'taking frames'
			},
			...get(currentlyExportingVideos)
		]);

		toast.promise(exportPromise, {
			loading:
				'Capturing video frames... You can start another export or switch projects in the meantime.',
			success: 'Video frames have been successfully captured.',
			error: 'An error occurred while capturing video frames.'
		});
	});
}

export async function exportCurrentProjectAsVideo() {
	const _currentProject = get(currentProject);

	// Vérifie si le projet est exportable
	if (get(endTime) !== null && get(startTime) > get(endTime)!) {
		toast.error('Invalid export time range');
		return;
	} else if (get(endTime) !== null && get(startTime) === get(endTime)) {
		toast.error('Please select a time range to export');
		return;
	}
	if (_currentProject.timeline.subtitlesTracks[0].clips.length === 0) {
		toast.error('The video is empty');
		return;
	}

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

	for (let i = 0; i < subtitleClips.length; i++) {
		if (get(isEscapePressed)) {
			// cancel the export
			toast.error('Export cancelled');
			currentlyExporting.set(false);
			fullScreenPreview.set(false);
			isEscapePressed.set(false);
			_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = fadeDurationBackup;
			await fs.removeDir(`${EXPORT_PATH}${get(currentlyExportingId)}`, { recursive: true });
			return;
		}

		let clip = subtitleClips[i];

		// Si on ne commence pas au début de la vidéo, on créé un sous-titre noire de 0 à startTime
		if (clip.end < get(startTime)) {
			continue; // on skip les clips qui sont avant le startTime
		} else if (get(endTime) !== null && clip.start > get(endTime)!) {
			break; // on skip les clips qui sont après le endTime
		}

		if (clip.surah !== -1) surahsInVideo.add(clip.surah);

		cursorPosition.set(clip.start + 30);
		triggerSubtitleResize.set(false);

		await new Promise((resolve) => {
			setTimeout(resolve, 40);
		});
		triggerSubtitleResize.set(true); // trigger le changement de fontsize pour l'option `fitInOneLine`
		let waitTime = 50;
		if (clip.text.split(' ').length >= 9) {
			waitTime = 120;
		}
		if (get(orientation) === 'portrait') {
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
	}
	_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = fadeDurationBackup;

	// On sort du mode plein écran
	fullScreenPreview.set(false);
	currentlyExporting.set(false);

	// Supprime le sous-titre temporaire (ceux qui ont pour id "temporary")
	_currentProject.timeline.subtitlesTracks[0].clips =
		_currentProject.timeline.subtitlesTracks[0].clips.filter((clip) => clip.id !== 'temporary');

	const outputPath = `${EXPORT_PATH}${makeFileNameValid(_currentProject.name + (_currentProject.reciter !== '' ? ' (' + _currentProject.reciter + ')' : '')) + '_' + get(currentlyExportingId)}.mp4`;

	// On appelle le script python pour créer la vidéo
	invoke('create_video', {
		exportId: get(currentlyExportingId),
		folderPath: `${EXPORT_PATH}${get(currentlyExportingId)}`,
		audioPath: getFirstAudioOrVideoPath(),
		transitionMs: Math.floor(_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration),
		startTime: Math.floor(get(startTime)),
		endTime: Math.floor(get(endTime) || 0),
		outputPath: outputPath,
		topRatio: get(topRatio) / 100,
		bottomRatio: get(bottomRatio) / 100,
		dynamicTop:
			surahsInVideo.size > 1 &&
			_currentProject.projectSettings.globalSubtitlesSettings.surahNameSettings.enable // si il y a plusieurs sourates le top avec affichage de la sourate changera
	});

	// Ferme la fenêtre d'export
	// l'id de la est exportWindow + exportId
	const webview = WebviewWindow.getByLabel('exportWindow' + get(currentlyExportingId));
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
	const isPortrait = get(orientation) === 'portrait';

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
