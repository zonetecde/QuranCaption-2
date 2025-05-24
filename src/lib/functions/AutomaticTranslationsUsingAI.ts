import { currentProject } from '$lib/stores/ProjectStore';
import toast from 'svelte-french-toast';
import { get } from 'svelte/store';
import { getVerseTranslation } from './Translation';
import { getVerse } from '$lib/stores/QuranStore';
import type { SubtitleClip } from '$lib/models/Timeline';
import { showAITranslationPopup } from '$lib/stores/LayoutStore';

/**
 * Génère un prompt pour l'IA afin de traduire les segments de versets incomplets.
 *
 * Cette fonction ne traite que les versets qui sont divisés en plusieurs clips
 * (segments). Les versets représentés par un seul clip sont considérés comme
 * "complets" et sont ignorés car ils n'ont pas besoin d'être retraduits segment
 * par segment.
 *
 * De plus, les versets dont tous les segments ont déjà été modifiés manuellement
 * (hadItTranslationEverBeenModified = true pour tous les clips) sont également exclus.
 *
 * @param languageCode Code de langue pour la traduction (ex: "fr", "en", etc.)
 * @param startPositionIndex Position du premier sous-titre du premier verset à traiter (facultatif)
 * @param endPositionIndex Position du premier sous-titre du dernier verset à traiter (facultatif)
 */
export async function generateTranslationsPrompt(
	startPositionIndex: number = -1,
	endPositionIndex: number = -1
): Promise<string> {
	if (get(showAITranslationPopup) === '') {
		toast.error('Please enter a language code');
		return 'Error: Language code not provided.';
	}

	// Génère le prompt est le met dans le clipboard
	const prompt_base = await fetch('/prompts/translations.txt');
	const prompt = await prompt_base.text();

	// recupere l'edition de la traduction
	const edition = get(currentProject).projectSettings.addedTranslations.find((t) =>
		t.includes(get(showAITranslationPopup)!)
	);
	if (!edition) {
		toast.error('Language code not found.');
		return 'Error: Language code not found.';
	}

	// remplace @1 par l'input
	// génère donc l'input - ne contient que les versets incomplets (divisés en plusieurs clips)
	let input: {
		id: number; // Position du premier sous-titre du verset dans le tableau complet
		full_verse_arabic: string; // Texte arabe complet du verset
		target_segments_arabic: string[]; // Segments en arabe à traduire individuellement
		existing_translation: string; // Traduction existante du verset complet (référence)
	}[] = [];

	// récupère les sous-titres
	const allSubtitles = get(currentProject).timeline.subtitlesTracks[0].clips;

	// Définit les limites de traitement basées sur les paramètres fournis
	const processingStartIndex = startPositionIndex >= 0 ? startPositionIndex : 0;
	const processingEndIndex = endPositionIndex >= 0 ? endPositionIndex : allSubtitles.length - 1;

	// On parcourt les clips en les regroupant par verset, mais on ne traite que ceux
	// qui sont dans la plage d'indices spécifiée
	let lastVerse = -1;
	let lastSurah = -1;
	let allClipOfThisVerse: SubtitleClip[] = [];
	let verseStartIndex = -1; // Index du premier sous-titre d'un verset

	for (let i = 0; i < allSubtitles.length; i++) {
		const subtitle = allSubtitles[i];

		// Ignore les sous-titres en dehors de la plage spécifiée
		if (i < processingStartIndex || i > processingEndIndex) {
			// Si on dépasse la fin, on peut arrêter complètement
			if (i > processingEndIndex) break;

			// Sinon on continue à la prochaine itération
			continue;
		}

		if (subtitle.isSilence || subtitle.isCustomText || subtitle.surah < 0) continue;

		if (lastSurah === -1 && lastVerse === -1) {
			lastSurah = subtitle.surah;
			lastVerse = subtitle.verse;
			verseStartIndex = i; // Marque le début d'un nouveau verset
		}

		if (subtitle.surah !== lastSurah || subtitle.verse !== lastVerse) {
			// confirme tout les clips précedents
			// skip if only one clip (subtitle already complet)
			if (allClipOfThisVerse.length > 1) {
				// Vérifier si au moins un des clips n'a pas été modifié manuellement
				const hasUnmodifiedClip = allClipOfThisVerse.some(
					(clip) => !clip.hadItTranslationEverBeenModified
				);

				// N'ajouter le verset que si au moins un clip n'a pas été modifié
				if (hasUnmodifiedClip) {
					input.push({
						id: verseStartIndex, // Utilise l'index du premier sous-titre comme ID
						full_verse_arabic: allClipOfThisVerse[0].surah + ':' + allClipOfThisVerse[0].verse,
						target_segments_arabic: allClipOfThisVerse.map((s) => s.text),
						existing_translation: await getVerseTranslation(
							edition,
							allClipOfThisVerse[0].surah,
							allClipOfThisVerse[0].verse
						)
					});
				}
			}

			allClipOfThisVerse = [subtitle]; // reset le tableau
			lastVerse = subtitle.verse;
			lastSurah = subtitle.surah;
			verseStartIndex = i; // Marque le début d'un nouveau verset
		} else {
			// ajoute le clip
			allClipOfThisVerse.push(subtitle);
		}
	}

	// Traite le dernier groupe de sous-titres
	if (allClipOfThisVerse.length > 1) {
		// Vérifier si au moins un des clips n'a pas été modifié manuellement
		const hasUnmodifiedClip = allClipOfThisVerse.some(
			(clip) => !clip.hadItTranslationEverBeenModified
		);

		// N'ajouter le verset que si au moins un clip n'a pas été modifié
		if (hasUnmodifiedClip) {
			input.push({
				id: verseStartIndex, // Utilise l'index du premier sous-titre comme ID
				full_verse_arabic: allClipOfThisVerse[0].surah + ':' + allClipOfThisVerse[0].verse,
				target_segments_arabic: allClipOfThisVerse.map((s) => s.text),
				existing_translation: await getVerseTranslation(
					edition,
					allClipOfThisVerse[0].surah,
					allClipOfThisVerse[0].verse
				)
			});
		}
	}

	if (input.length === 0) {
		toast.error(
			'No clips found to generate prompt (either all clips are custom text, full verses, or have already been manually translated).'
		);
		return 'Error: No clips found to generate prompt.';
	}

	// Journalisation pour débogage (peut être désactivée en production)
	const debug = false;
	if (debug) {
		console.log(`Generating prompt for ${input.length} incomplete verses`);
		input.forEach((item, index) => {
			console.log(`Verse ${index + 1}:`);
			console.log(`  ID (Position): ${item.id}`);
			console.log(`  Segments: ${item.target_segments_arabic.length}`);
			console.log(`  First segment: ${item.target_segments_arabic[0]}`);
		});
	}

	// remplace @1 par l'input
	const inputString = JSON.stringify(input, null, 2);
	const promptWithInput = prompt.replace(/@1/g, inputString);

	navigator.clipboard.writeText(promptWithInput);
	toast.success(
		`Prompt copied to clipboard! Contains ${input.length} incomplete verses. Go to Grok.com and paste it there.`,
		{
			duration: 7000
		}
	);

	return promptWithInput;
}

export function addAITranslations(raw_json: string) {
	/**
	 * Applique les traductions générées par l'IA aux sous-titres.
	 *
	 * Note: Cette fonction ne traite que les versets incomplets (divisés en plusieurs clips),
	 * conformément à la fonction generateTranslationsPrompt qui ne génère des prompts que
	 * pour les versets incomplets avec au moins un segment non modifié manuellement.
	 *	 * Format attendu du JSON:
	 * {
	 *   "123": ["Louange à Allah à qui appartient", "tout ce qui est dans les cieux et tout ce qui est"],
	 *   "456": ["Il sait qui pénètre en terre et qui en sort", "et qui en sort, ce qui descend du ciel"]
	 * }
	 *
	 * Où 123 et 456 sont les positions des premiers sous-titres de chaque verset dans le tableau complet.
	 */

	if (raw_json === '') {
		toast.error('Please paste the AI response');
		return;
	}

	const edition = get(currentProject).projectSettings.addedTranslations.find((t) =>
		t.includes(get(showAITranslationPopup)!)
	);
	if (!edition) {
		toast.error('Language code not found.');
		return;
	}

	let json;
	try {
		json = JSON.parse(raw_json);
	} catch (error) {
		toast.error('Invalid JSON format. Could not parse the input.');
		return;
	}

	// on vérifie que le json est bien formé
	if (typeof json !== 'object' || json === null) {
		toast.error('Invalid JSON format. Expected an object with numeric IDs as keys.');
		return;
	}

	// Get the current project data
	const project = get(currentProject);
	if (!project) {
		toast.error('No project is currently loaded.');
		return;
	}
	// Get the subtitle track
	const subtitleTrack = project.timeline.subtitlesTracks[0];
	if (!subtitleTrack) {
		toast.error('No subtitle track found in project.');
		return;
	}

	// Update clips with translations
	let updatedCount = 0;
	let skippedCount = 0;
	let newSubtitleClips = [...subtitleTrack.clips]; // Create a copy of the clips array

	// Appliquer les traductions à partir du JSON avec des IDs (positions des premiers sous-titres)
	for (const idStr in json) {
		const id = Number(idStr);
		const translations = json[idStr];

		if (!translations || !Array.isArray(translations)) {
			toast.error(`Invalid translations format for ID ${id}.`);
			skippedCount++;
			continue;
		}

		// Vérifier que l'ID correspond à un sous-titre valide
		if (id < 0 || id >= newSubtitleClips.length) {
			toast.error(`Invalid subtitle ID: ${id}. Out of range.`);
			skippedCount++;
			continue;
		}

		// Récupérer le premier sous-titre du verset
		const firstSubtitle = newSubtitleClips[id];
		if (firstSubtitle.isSilence || firstSubtitle.isCustomText || firstSubtitle.surah < 0) {
			toast.error(`ID ${id} does not correspond to a valid subtitle.`);
			skippedCount++;
			continue;
		}

		// Identifier tous les sous-titres de ce verset
		const verseClips: SubtitleClip[] = [];

		// Ajouter le premier sous-titre
		verseClips.push(firstSubtitle);

		// Chercher les sous-titres suivants du même verset
		for (let i = id + 1; i < newSubtitleClips.length; i++) {
			const subtitle = newSubtitleClips[i];

			// Ignorer les silences et textes personnalisés, mais continuer à chercher
			if (subtitle.isSilence || subtitle.isCustomText || subtitle.surah < 0) {
				continue;
			}

			// S'arrêter si on atteint un verset différent
			if (subtitle.surah !== firstSubtitle.surah || subtitle.verse !== firstSubtitle.verse) {
				break;
			}

			verseClips.push(subtitle);
		}

		// Vérifier que le nombre de sous-titres correspond au nombre de traductions
		if (verseClips.length !== translations.length) {
			toast.error(
				`For verse at position ${id}: Segment count mismatch. Found ${verseClips.length} clips but ${translations.length} translations. Please review this subtitle manually.`,
				{
					duration: 6000,
					position: 'top-left'
				}
			);
			skippedCount++;
			continue;
		}

		// Appliquer les traductions aux sous-titres de ce verset
		verseClips.forEach((clip, i) => {
			if (translations[i]) {
				// Trouver l'index du sous-titre dans le tableau complet
				const clipIndex = newSubtitleClips.findIndex((c) => c === clip);

				if (clipIndex !== -1) {
					// Créer un nouveau sous-titre avec la traduction mise à jour
					newSubtitleClips[clipIndex] = {
						...newSubtitleClips[clipIndex],
						translations: {
							...newSubtitleClips[clipIndex].translations,
							[edition]: translations[i]
						},
						hadItTranslationEverBeenModified: true
					};
					updatedCount++;
				} else {
					skippedCount++;
				}
			} else {
				skippedCount++;
			}
		});
	}

	// Update the project with modified clips
	currentProject.update((currentValue) => {
		return {
			...currentValue,
			timeline: {
				...currentValue.timeline,
				subtitlesTracks: [
					{
						...subtitleTrack,
						clips: newSubtitleClips
					},
					...currentValue.timeline.subtitlesTracks.slice(1)
				]
			}
		};
	});
	toast.success(
		`Successfully updated ${updatedCount} clips with AI translations for incomplete verses.${skippedCount > 0 ? ` Skipped ${skippedCount} clips.` : ''}`
	);
}
