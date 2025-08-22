import { globalState } from '$lib/runes/main.svelte';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { currentMonitor } from '@tauri-apps/api/window';
import { PredefinedSubtitleClip, SubtitleClip } from './Clip.svelte';
import SubtitleFileContentGenerator from './misc/SubtitleFileContentGenerator';
import { Quran } from './Quran';
import { Utilities } from './misc/Utilities';
import { projectService } from '$lib/services/ProjectService';

export default class Exporter {
	/**
	 * Exporte le projet sous forme de sous-titres
	 */
	static exportSubtitles() {
		const es = globalState.getExportState;

		const settings = {
			format: es.subtitleFormat,
			includedTargets: Object.entries(es.includedTarget)
				.filter(([, included]) => included)
				.map(([target]) => target),
			exportVerseNumbers: es.exportVerseNumbers
		};

		let subtitles: {
			startTimeMs: number;
			endTimeMs: number;
			text: string;
		}[] = [];

		for (const subtitle of globalState.getSubtitleTrack.clips) {
			// Skip les clips silencieux ou sans texte
			if (!(subtitle instanceof SubtitleClip || subtitle instanceof PredefinedSubtitleClip))
				continue;

			const startTime = subtitle.startTime;
			const endTime = subtitle.endTime;

			let text = '';

			for (const target of settings.includedTargets) {
				if (target === 'arabic') {
					text += subtitle.getText();
				} else {
					if (subtitle instanceof SubtitleClip)
						text += subtitle.getTranslation(target).getText(target, subtitle);
					else if (subtitle instanceof PredefinedSubtitleClip)
						text += subtitle.getTranslation(target).getText(); // Pas de numéro de verset, donc getText() suffit
				}

				text += '\n';
			}

			subtitles.push({
				startTimeMs: startTime,
				endTimeMs: endTime,
				text: text.trim()
			});
		}

		const fileContent = SubtitleFileContentGenerator.generateSubtitleFile(
			subtitles,
			settings.format
		);

		// Téléchargez le fichier
		const blob = new Blob([fileContent], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `qurancaption.subtitles.${globalState.currentProject!.detail.name}.${settings.format.toLowerCase()}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	static exportProjectData() {
		const projectData = globalState.currentProject;

		if (!projectData) {
			console.error('No project data available for export.');
			return;
		}

		const json = JSON.stringify(projectData, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `qurancaption.project.${projectData.detail.name}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	static exportYtbChapters() {
		const choice = globalState.getExportState.ytbChaptersChoice;
		const subtitlesClips: SubtitleClip[] = globalState.getSubtitleClips;

		if (!subtitlesClips || subtitlesClips.length === 0) {
			console.error('No subtitle clips available for export.');
			return;
		}

		let chapters: { time: string; title: string }[] = [];

		if (choice === 'Each Surah') {
			// Groupe par sourate
			let currentSurah = -1;

			for (const clip of subtitlesClips) {
				if (!(clip instanceof SubtitleClip)) continue;

				if (clip.surah !== currentSurah) {
					currentSurah = clip.surah;
					const timeFormatted = Exporter.formatTimeForYouTube(clip.startTime);
					const surahName = Quran.surahs[currentSurah - 1]?.name || `Surah ${currentSurah}`;
					chapters.push({
						time: timeFormatted,
						title: `Surah ${surahName}`
					});
				}
			}
		} else if (choice === 'Each Verse') {
			// Groupe par verset
			let lastSurahVerse = '';

			for (const clip of subtitlesClips) {
				if (!(clip instanceof SubtitleClip)) continue;

				const currentSurahVerse = `${clip.surah}:${clip.verse}`;
				if (currentSurahVerse !== lastSurahVerse) {
					lastSurahVerse = currentSurahVerse;
					const timeFormatted = Exporter.formatTimeForYouTube(clip.startTime);
					chapters.push({
						time: timeFormatted,
						title: `${clip.surah}:${clip.verse}`
					});
				}
			}
		}

		// S'assurer que le premier timestamp est 0:00 pour la compatibilité YouTube
		if (chapters.length > 0 && chapters[0].time !== '0:00') {
			chapters[0].time = '0:00';
		}

		// Génère le contenu du fichier
		let fileContent = 'YouTube Chapters:\n\n';
		for (const chapter of chapters) {
			fileContent += `${chapter.time} ${chapter.title}\n`;
		}

		// Télécharge le fichier
		const blob = new Blob([fileContent], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `qurancaption.chapters.${globalState.currentProject!.detail.name}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	/**
	 * Convertit le temps en millisecondes au format YouTube (MM:SS ou HH:MM:SS)
	 */
	private static formatTimeForYouTube(timeMs: number): string {
		const totalSeconds = Math.floor(timeMs / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else {
			return `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}
	}

	/**
	 * Exporte le projet sous forme de vidéo.
	 */
	static async exportVideo() {
		const exportId = Utilities.randomId().toString();

		// Commence par faire une copie du projet à l'état actuelle
		const project = globalState.currentProject!.clone();
		project.detail.id = Number(exportId);

		const videoSize = project.content.videoStyle
			.getStylesOfTarget('global')
			.findStyle('video-dimension')!.value as { width: number; height: number };

		// Obtenir la taille de l'écran de l'utilisateur
		const monitor = await currentMonitor();
		if (!monitor) {
			console.error('Could not get monitor information');
			return;
		}

		const screenWidth = monitor.size.width;
		const screenHeight = monitor.size.height;

		// Calculer la taille de fenêtre optimale
		let windowWidth = videoSize.width;
		let windowHeight = videoSize.height;

		// Si la vidéo dépasse les dimensions de l'écran, on redimensionne en gardant le ratio
		if (windowHeight > screenHeight || windowWidth > screenWidth) {
			const videoRatio = videoSize.width / videoSize.height;
			const screenRatio = screenWidth / screenHeight;

			if (windowHeight > screenHeight) {
				// La hauteur dépasse, on ajuste selon la hauteur max
				windowHeight = screenHeight;
				windowWidth = Math.round(windowHeight * videoRatio);
			}

			if (windowWidth > screenWidth) {
				// Après ajustement, si la largeur dépasse encore, on ajuste selon la largeur max
				windowWidth = screenWidth;
				windowHeight = Math.round(windowWidth / videoRatio);
			}
		}

		console.log(`Original video size: ${videoSize.width}x${videoSize.height}`);
		console.log(`Screen size: ${screenWidth}x${screenHeight}`);
		console.log(`Window size: ${windowWidth}x${windowHeight}`);

		// Créer le fichier du projet dans le dossier Export afin que l'Exporter le récupère
		projectService.saveToExportFolder(project);

		// Créer une fenêtre Tauri avec la taille ajustée
		const w = new WebviewWindow(exportId, {
			width: windowWidth,
			height: windowHeight,
			decorations: false,
			alwaysOnTop: true,
			title: 'QC - ' + exportId,
			url: '/exporter?' + new URLSearchParams({ id: exportId })
		});

		w.once('tauri://created', () => {});

		w.once('tauri://destroyed', () => {
			// Nettoyer les ressources si nécessaire
		});
	}
}
