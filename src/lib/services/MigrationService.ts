import {
	Asset,
	Duration,
	Edition,
	PredefinedSubtitleClip,
	Project,
	ProjectContent,
	ProjectDetail,
	ProjectTranslation,
	SubtitleClip,
	Timeline,
	TrackType,
	Translation
} from '$lib/classes';
import { AssetClip, SilenceClip } from '$lib/classes/Clip.svelte';
import { Quran } from '$lib/classes/Quran';
import type { AssetTrack, SubtitleTrack } from '$lib/classes/Track.svelte';
import { VerseTranslation } from '$lib/classes/Translation.svelte';
import { globalState } from '$lib/runes/main.svelte';
import { join, localDataDir } from '@tauri-apps/api/path';
import { exists, readDir, readFile, readTextFile } from '@tauri-apps/plugin-fs';

export default class MigrationService {
	/**
	 * Vérifie si des données de Quran Caption 2 sont présentes
	 * @returns true si des données sont trouvées, sinon false
	 */
	static async hasQCV2Data(): Promise<boolean> {
		// Obtenir le chemin vers le dossier AppData\Local de l'utilisateur
		return (await this.getQCV2NumberOfFiles()) > 1; // Au moins 2 fichiers sont nécessaires (1 = juste le fichier projects.json)
	}

	static async getQCV2NumberOfFiles(): Promise<number> {
		const qc2LocalStoragePath = await MigrationService.getQCV2Dir();
		if (!qc2LocalStoragePath) return 0;

		const qc2FolderExists = await exists(qc2LocalStoragePath);

		if (qc2FolderExists) {
			const files = await readDir(qc2LocalStoragePath);
			return files.length;
		}

		return 0;
	}

	static async getQCV2Dir(): Promise<string | null> {
		const userLocalDataDir = await localDataDir();
		return await join(userLocalDataDir, 'Quran Caption', 'localStorage');
	}

	/**
	 * Import a single project from V2 with error handling
	 * @param qc2Dir The V2 data directory path
	 * @param fileName The project file name to import
	 */
	static async importSingleProjectFromV2(qc2Dir: string, fileName: string): Promise<void> {
		const fileContent = await readTextFile(await join(qc2Dir, fileName));
		const project: any = JSON.parse(JSON.parse(fileContent)); // Double parse as V2 projects are stringified twice

		// Project Detail
		const projectName = project.name;
		const projectCreatedAt: Date = new Date(project.createdAt);
		const projectUpdatedAt: Date = new Date(project.updatedAt);
		const projectReciter = project.reciter;

		const projectDetail = new ProjectDetail(
			projectName,
			projectReciter,
			projectCreatedAt,
			projectUpdatedAt
		);

		let newIds: { [oldId: string]: number } = {};

		const projectContent = await ProjectContent.getDefaultProjectContent();

		// Assets
		const projectAssets: Asset[] = [];

		for (const asset of project.assets) {
			const newAsset = new Asset(asset.filePath);
			newIds[asset.id] = newAsset.id;
			projectAssets.push(newAsset);
		}

		projectContent.assets = projectAssets;

		// Timeline

		// Audio Track
		if (project.timeline.audiosTracks[0].clips.length > 0) {
			for (const clip of project.timeline.audiosTracks[0].clips) {
				if (clip.isMuted) continue; // Skip muted clips

				const assetClip = new AssetClip(clip.start, clip.end, newIds[clip.assetId]);

				(projectContent.timeline.getFirstTrack(TrackType.Audio) as AssetTrack)!.clips.push(
					assetClip
				);
			}
		}

		// Video Track
		if (project.timeline.videosTracks[0].clips.length > 0) {
			for (const clip of project.timeline.videosTracks[0].clips) {
				const asset = projectAssets.find((asset) => asset.id === newIds[clip.assetId]);

				if (!asset) continue;

				if (asset && asset.duration === undefined) {
					asset!.duration = new Duration(clip.end - clip.start);
				}

				const assetClip = new AssetClip(clip.start, clip.end, newIds[clip.assetId]);

				if (!clip.isMuted) {
					// Video track but not muted, add to audio track instead
					(projectContent.timeline.getFirstTrack(TrackType.Audio) as AssetTrack)!.clips.push(
						assetClip
					);
				} else {
					(projectContent.timeline.getFirstTrack(TrackType.Video) as AssetTrack)!.clips.push(
						assetClip
					);
				}
			}
		}

		// Translations
		projectContent.projectTranslation.addedTranslationEditions = await Promise.all(
			project.projectSettings.addedTranslations.map(async (s: string) => {
				for (const [key, value] of Object.entries(globalState.availableTranslations)) {
					for (const tr of value.translations) {
						if (
							tr.name ===
							s
								.replace('-la', '')
								.replace('fra-muhammadhamidul', 'fra-muhammadhameedu')
								.replace('deu-asfbubenheimand', 'deu-frankbubenheima')
						) {
							// Add styles for translations
							await projectContent.videoStyle.addStylesForEdition(tr.name);
							tr.showInTranslationsEditor = true;
							return tr;
						}
					}
				}

				return null;
			})
		);

		// Subtitles
		if (project.timeline.subtitlesTracks[0].clips.length > 0) {
			for (const clip of project.timeline.subtitlesTracks[0].clips) {
				if ((clip.surah === -1 || clip.verse === -1) && !clip.isSilence && !clip.isCustomText) {
					let translations: { [key: string]: Translation } = {};

					// predefined subtitle clip
					const sub = new PredefinedSubtitleClip(
						clip.start,
						clip.end,
						clip.text.includes('بِسْمِ') ? 'Basmala' : 'Istiadhah'
					);

					for (const [key, value] of Object.entries(clip.translations)) {
						translations[
							key
								.replace('-la', '')
								.replace('fra-muhammadhamidul', 'fra-muhammadhameedu')
								.replace('deu-asfbubenheimand', 'deu-frankbubenheima')
						] = new Translation(value as string, 'reviewed');
					}

					sub.translations = translations;

					projectContent.timeline.getFirstTrack(TrackType.Subtitle)!.clips.push(sub);
				} else if (!clip.isSilence && !clip.isCustomText) {
					const verse = (await Quran.getSurah(clip.surah)).verses[clip.verse - 1];

					const subtitlesProperties = await (
						projectContent.timeline.getFirstTrack(TrackType.Subtitle) as SubtitleTrack
					).getSubtitlesProperties(
						verse,
						clip.firstWordIndexInVerse,
						clip.lastWordIndexInVerse,
						clip.surah
					);

					// subtitle clip
					const sub = new SubtitleClip(
						clip.start,
						clip.end,
						clip.surah,
						clip.verse,
						clip.firstWordIndexInVerse,
						clip.lastWordIndexInVerse,
						verse.getArabicTextBetweenTwoIndexes(
							clip.firstWordIndexInVerse,
							clip.lastWordIndexInVerse
						),
						verse.getWordByWordTranslationBetweenTwoIndexes(
							clip.firstWordIndexInVerse,
							clip.lastWordIndexInVerse
						),
						subtitlesProperties.isFullVerse,
						subtitlesProperties.isLastWordsOfVerse,
						subtitlesProperties.translations
					);

					let translations: { [key: string]: Translation } = {};

					for (const [key, value] of Object.entries(clip.translations)) {
						const tr = new VerseTranslation(value as string, 'reviewed');
						translations[
							key
								.replace('-la', '')
								.replace('fra-muhammadhamidul', 'fra-muhammadhameedu')
								.replace('deu-asfbubenheimand', 'deu-frankbubenheima')
						] = tr;

						// Télécharge la traduction en ligne
						const edition = projectContent.projectTranslation.addedTranslationEditions.find(
							(edition) => edition.name === formatTranslationName(key)
						);

						// si !edition, c'est que c'est une traduction ajouté par l'utilisateur, puis supprimer
						if (edition) {
							const translation = await projectContent.projectTranslation.downloadVerseTranslation(
								edition,
								clip.surah,
								clip.verse
							);

							// Ajoute la traduction à l'objet translations
							if (
								!projectContent.projectTranslation.versesTranslations[formatTranslationName(key)]
							) {
								projectContent.projectTranslation.versesTranslations[formatTranslationName(key)] =
									{};
							}

							projectContent.projectTranslation.versesTranslations[formatTranslationName(key)][
								clip.surah + ':' + clip.verse
							] = translation;
						}
					}

					sub.translations = translations;

					projectContent.timeline.getFirstTrack(TrackType.Subtitle)!.clips.push(sub);
				} else if (clip.isSilence || clip.isCustomText) {
					// SilenceClip
					const silence = new SilenceClip(clip.start, clip.end);
					projectContent.timeline.getFirstTrack(TrackType.Subtitle)!.clips.push(silence);
				}
			}
		}

		const newProject = new Project(projectDetail, projectContent);
		await newProject.save();
	}

	/**
	 * Fonctions très obsures mais fonctionnelles.
	 * Elle est mal codée, JE SAIS, mais elle fonctionne et n'est pas là pour
	 * être belle.
	 */
	static async importAllProjectsFromV2(): Promise<void> {
		const qc2Dir = await MigrationService.getQCV2Dir();
		if (!qc2Dir) return;

		await ProjectTranslation.loadAvailableTranslations();

		const files = await readDir(qc2Dir);

		for (const file of files) {
			if (!file.name.endsWith('.json')) continue;
			if (file.name === 'projects.json') continue;

			const fileContent = await readTextFile(await join(qc2Dir, file.name));
			const project: any = JSON.parse(JSON.parse(fileContent)); // (Me demander pas pourquoi mais dans QC2 les projets sont stringify deux fois)

			// Project Detail
			const projectName = project.name;
			const projectCreatedAt: Date = new Date(project.createdAt);
			const projectUpdatedAt: Date = new Date(project.updatedAt);
			const projectReciter = project.reciter;

			const projectDetail = new ProjectDetail(
				projectName,
				projectReciter,
				projectCreatedAt,
				projectUpdatedAt
			);

			let newIds: { [oldId: string]: number } = {};

			const projectContent = await ProjectContent.getDefaultProjectContent();

			// Assets
			const projectAssets: Asset[] = [];

			for (const asset of project.assets) {
				const newAsset = new Asset(asset.filePath);
				newIds[asset.id] = newAsset.id;
				projectAssets.push(newAsset);
			}

			projectContent.assets = projectAssets;

			// Timeline

			// Audio Track
			if (project.timeline.audiosTracks[0].clips.length > 0) {
				for (const clip of project.timeline.audiosTracks[0].clips) {
					if (clip.isMuted) continue; // Inutile de l'ajouter

					const assetClip = new AssetClip(clip.start, clip.end, newIds[clip.assetId]);

					(projectContent.timeline.getFirstTrack(TrackType.Audio) as AssetTrack)!.clips.push(
						assetClip
					);
				}
			}

			// Video Track
			if (project.timeline.videosTracks[0].clips.length > 0) {
				for (const clip of project.timeline.videosTracks[0].clips) {
					const asset = projectAssets.find((asset) => asset.id === newIds[clip.assetId]);

					if (!asset) continue;

					if (asset && asset.duration === undefined) {
						asset!.duration = new Duration(clip.end - clip.start);
					}

					const assetClip = new AssetClip(clip.start, clip.end, newIds[clip.assetId]);

					if (!clip.isMuted) {
						// On est dans la track video mais le clip n'est pas muted, alors on doit l'ajouter dans la track audio à la place

						(projectContent.timeline.getFirstTrack(TrackType.Audio) as AssetTrack)!.clips.push(
							assetClip
						);
					} else {
						(projectContent.timeline.getFirstTrack(TrackType.Video) as AssetTrack)!.clips.push(
							assetClip
						);
					}
				}
			}

			// Traductions
			projectContent.projectTranslation.addedTranslationEditions = await Promise.all(
				project.projectSettings.addedTranslations.map(async (s: string) => {
					for (const [key, value] of Object.entries(globalState.availableTranslations)) {
						for (const tr of value.translations) {
							if (tr.name === formatTranslationName(s)) {
								// Ajoute les styles pour les traductions
								await projectContent.videoStyle.addStylesForEdition(tr.name);
								tr.showInTranslationsEditor = true;
								return tr;
							}
						}
					}

					return null;
				})
			);

			// Subtitles
			if (project.timeline.subtitlesTracks[0].clips.length > 0) {
				for (const clip of project.timeline.subtitlesTracks[0].clips) {
					if ((clip.surah === -1 || clip.verse === -1) && !clip.isSilence && !clip.isCustomText) {
						let translations: { [key: string]: Translation } = {};

						// predefined subtitle clip
						const sub = new PredefinedSubtitleClip(
							clip.start,
							clip.end,
							clip.text.includes('بِسْمِ') ? 'Basmala' : 'Istiadhah'
						);

						for (const [key, value] of Object.entries(clip.translations)) {
							translations[formatTranslationName(key)] = new Translation(
								value as string,
								'reviewed'
							);
						}

						sub.translations = translations;

						projectContent.timeline.getFirstTrack(TrackType.Subtitle)!.clips.push(sub);
					} else if (!clip.isSilence && !clip.isCustomText) {
						const verse = (await Quran.getSurah(clip.surah)).verses[clip.verse - 1];

						const subtitlesProperties = await (
							projectContent.timeline.getFirstTrack(TrackType.Subtitle) as SubtitleTrack
						).getSubtitlesProperties(
							verse,
							clip.firstWordIndexInVerse,
							clip.lastWordIndexInVerse,
							clip.surah
						);

						// subtitle clip
						const sub = new SubtitleClip(
							clip.start,
							clip.end,
							clip.surah,
							clip.verse,
							clip.firstWordIndexInVerse,
							clip.lastWordIndexInVerse,
							verse.getArabicTextBetweenTwoIndexes(
								clip.firstWordIndexInVerse,
								clip.lastWordIndexInVerse
							),
							verse.getWordByWordTranslationBetweenTwoIndexes(
								clip.firstWordIndexInVerse,
								clip.lastWordIndexInVerse
							),
							subtitlesProperties.isFullVerse,
							subtitlesProperties.isLastWordsOfVerse,
							subtitlesProperties.translations
						);

						let translations: { [key: string]: Translation } = {};

						for (const [key, value] of Object.entries(clip.translations)) {
							translations[formatTranslationName(key)] = new Translation(
								value as string,
								'reviewed'
							);
						}

						sub.translations = translations;

						projectContent.timeline.getFirstTrack(TrackType.Subtitle)!.clips.push(sub);
					} else if (clip.isSilence || clip.isCustomText) {
						// SilenceClip
						const silence = new SilenceClip(clip.start, clip.end);
						projectContent.timeline.getFirstTrack(TrackType.Subtitle)!.clips.push(silence);
					}
				}
			}

			projectDetail.updateVideoDetailAttributes();
			for (const edition of projectContent.projectTranslation.addedTranslationEditions) {
				projectDetail.updatePercentageTranslated(edition);
			}

			const newProject = new Project(projectDetail, projectContent);
			newProject.save();
			globalState.userProjectsDetails.push(newProject.detail);
		}
	}
}
function formatTranslationName(key: string) {
	return key
		.replace('-la', '')
		.replace('fra-muhammadhamidul', 'fra-muhammadhameedu')
		.replace('deu-asfbubenheimand', 'deu-frankbubenheima');
}
