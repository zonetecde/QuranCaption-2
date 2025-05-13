import { fullScreenPreview } from '$lib/stores/LayoutStore';
import { currentProject } from '$lib/stores/ProjectStore';
import { cursorPosition } from '$lib/stores/TimelineStore';
import toast from 'svelte-french-toast';
import { get } from 'svelte/store';
import { fs } from '@tauri-apps/api';
import { path } from '@tauri-apps/api';
//@ts-ignore
import DomToImage from 'dom-to-image';
import { EXPORT_PATH } from '$lib/ext/LocalStorageWrapper';
import { createDir } from '@tauri-apps/api/fs';

export async function exportCurrentProjectAsVideo() {
	// Première étape : on rentre en mode plein écran
	fullScreenPreview.set(true);
	const _currentProject = get(currentProject);

	// Deuxième étape : on navigue de sous-titre en sous-titre
	const subtitleClips = _currentProject.timeline.subtitlesTracks[0].clips;

	const fadeDurationBackup = _currentProject.projectSettings.globalSubtitlesSettings.fadeDuration;
	_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = 0;

	const randomId = Math.floor(Math.random() * 1000000); // nom du dossier contenant les images
	await createDir(`${EXPORT_PATH}${randomId}`, { recursive: true });

	for (let i = 0; i < subtitleClips.length; i++) {
		const clip = subtitleClips[i];

		cursorPosition.set(clip.start + 100);

		await new Promise((resolve) => {
			setTimeout(resolve, 100); // Wait for subtitle to render
		});

		// Une fois que le sous-titre est affiché, enregistre en image tout ce qui est affiché
		// take a screenshot of the current frame
		await takeScreenshot(randomId.toString(), Math.floor(clip.start) + '_' + Math.floor(clip.end));
	}

	toast.success('No collision were found.');

	_currentProject.projectSettings.globalSubtitlesSettings.fadeDuration = fadeDurationBackup;
	// On sort du mode plein écran
	fullScreenPreview.set(false);
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
