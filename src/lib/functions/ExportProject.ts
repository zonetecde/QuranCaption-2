import { fullScreenPreview, setCurrentVideoTime, videoDimensions } from '$lib/stores/LayoutStore';
import { currentProject, getFirstAudioOrVideoPath } from '$lib/stores/ProjectStore';
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
	triggerSubtitleResize
} from '$lib/stores/ExportStore';
import { readjustCursorPosition } from './TimelineHelper';
import { isEscapePressed } from '$lib/stores/ShortcutStore';

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

	const randomId = Math.floor(Math.random() * 1000000); // nom du dossier contenant les images
	await createDir(`${EXPORT_PATH}${randomId}`, { recursive: true });

	toast("Creating images, do not touch anything. Press 'Esc' to cancel.", {
		duration: 4000,
		icon: '🔄'
	});

	for (let i = 0; i < subtitleClips.length; i++) {
		if (get(isEscapePressed)) {
			// cancel the export
			toast.error('Export cancelled');
			currentlyExporting.set(false);
			fullScreenPreview.set(false);
			isEscapePressed.set(false);
			// await fs.removeDir(`${EXPORT_PATH}${randomId}`, { recursive: true });
			return;
		}

		const clip = subtitleClips[i];

		cursorPosition.set(clip.start + 100);
		triggerSubtitleResize.set(false);

		await new Promise((resolve) => {
			setTimeout(resolve, 40);
		});
		triggerSubtitleResize.set(true); // trigger le changement de fontsize pour l'option `fitInOneLine`
		await new Promise((resolve) => {
			setTimeout(resolve, 50); // wait for subtitles to be displayed in one line
		});

		// Une fois que le sous-titre est affiché, enregistre en image tout ce qui est affiché
		// take a screenshot of the current frame
		await takeScreenshot(randomId.toString(), Math.floor(clip.start) + '_' + Math.floor(clip.end));
	}

	_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = fadeDurationBackup;

	// On sort du mode plein écran
	fullScreenPreview.set(false);
	currentlyExporting.set(false);

	// Supprime le sous-titre temporaire (ceux qui ont pour id "temporary")
	_currentProject.timeline.subtitlesTracks[0].clips =
		_currentProject.timeline.subtitlesTracks[0].clips.filter((clip) => clip.id !== 'temporary');

	const outputPath = `${EXPORT_PATH}${_currentProject.name}.mp4`;

	// On appelle le script python pour créer la vidéo
	await toast.promise(
		invoke('create_video', {
			folderPath: `${EXPORT_PATH}${randomId}`,
			audioPath: getFirstAudioOrVideoPath(),
			transitionMs: Math.floor(
				_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration
			),
			startTime: Math.floor(get(startTime)),
			endTime: Math.floor(get(endTime) || 0),
			outputPath: outputPath,
			topRatio: get(topRatio) / 100,
			bottomRatio: get(bottomRatio) / 100
		}),
		{
			loading: 'Creating video (id: ' + randomId + ')',
			success: 'Video created successfully (' + outputPath + ')',
			error: (error) => {
				return 'Error while creating video: ' + error;
			}
		},
		{
			position: 'bottom-right'
		}
	);
	// ouvre le dossier contenant la vidéo
	await invoke('open', {
		path: outputPath
	});
	// supprime le dossier contenant les images
	await fs.removeDir(`${EXPORT_PATH}${randomId}`, { recursive: true });
}

async function takeScreenshot(folderName: string, fileName: string) {
	// L'élément à transformer en image
	var node = document.getElementById('preview')!;

	// Qualité de l'image
	var scale = 2;

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

		// with tauri, save the image to the desktop
		const fileNameWithExtension = fileName + '.png';
		const filePathWithName = `${EXPORT_PATH}${folderName}/${fileNameWithExtension}`;
		await fs.writeBinaryFile({
			path: filePathWithName,
			contents: await fetch(dataUrl).then((res) => res.arrayBuffer())
		});
	} catch (error: any) {
		toast.error('Error while taking screenshot: ' + error.message);
	}
}
