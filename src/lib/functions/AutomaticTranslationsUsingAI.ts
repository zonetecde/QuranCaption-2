import { currentProject } from '$lib/stores/ProjectStore';
import toast from 'svelte-french-toast';
import { get } from 'svelte/store';
import { getVerseTranslation } from './Translation';
import { getVerse } from '$lib/stores/QuranStore';
import type { SubtitleClip } from '$lib/models/Timeline';

export async function fetchTranslationsFromGpt(languageCode: string) {
	if (languageCode === '') {
		toast.error('Please enter a language code');
		return;
	}

	// Génère le prompt est le met dans le clipboard
	const prompt_base = await fetch('/prompts/translations.txt');
	const prompt = await prompt_base.text();

	// recupere l'edition de la traduction
	const edition = get(currentProject).projectSettings.addedTranslations.find((t) =>
		t.includes(languageCode)
	);
	if (!edition) {
		toast.error('Language code not found.');
		return;
	}

	// remplace @1 par l'input
	// génère donc l'input
	let input: {
		full_verse_arabic: string;
		target_segments_arabic: string[];
		existing_translation: string;
	}[] = [];

	let lastVerse = -1;
	let lastSurah = -1;
	let allClipOfThisVerse: SubtitleClip[] = [];

	for (const subtitle of get(currentProject).timeline.subtitlesTracks[0].clips) {
		if (subtitle.isSilence || subtitle.isCustomText || subtitle.surah < 0) continue;

		if (lastSurah === -1 && lastVerse === -1) {
			lastSurah = subtitle.surah;
			lastVerse = subtitle.verse;
		}

		if (subtitle.surah !== lastSurah || subtitle.verse !== lastVerse) {
			// confirme tout les clips précedents
			input.push({
				full_verse_arabic: getVerse(allClipOfThisVerse[0].surah, allClipOfThisVerse[0].verse).text,
				target_segments_arabic: allClipOfThisVerse.map((s) => s.text),
				existing_translation: await getVerseTranslation(
					edition,
					allClipOfThisVerse[0].surah,
					allClipOfThisVerse[0].verse
				)
			});

			allClipOfThisVerse = [subtitle]; // reset le tableau
			lastVerse = subtitle.verse;
			lastSurah = subtitle.surah;
		} else {
			// ajoute le clip
			allClipOfThisVerse.push(subtitle);
		}
	}

	// ajoute le dernier clip
	if (allClipOfThisVerse.length > 0) {
		input.push({
			full_verse_arabic: getVerse(allClipOfThisVerse[0].surah, allClipOfThisVerse[0].verse).text,
			target_segments_arabic: allClipOfThisVerse.map((s) => s.text),
			existing_translation: await getVerseTranslation(
				edition,
				allClipOfThisVerse[0].surah,
				allClipOfThisVerse[0].verse
			)
		});
	}

	// remplace @1 par l'input
	const inputString = JSON.stringify(input);
	const promptWithInput = prompt.replace(/@1/g, inputString);

	navigator.clipboard.writeText(promptWithInput);
	toast.success('Prompt copied to clipboard! Go to Grok.com and paste it there.', {
		duration: 7000
	});

	return;
}

export function addAITranslations(raw_json: string, languageCode: string) {
	/**
	 * format : 
	 * 
	 * 
	 * [
  [
    "Louange à Allah à qui appartient",
    "tout ce qui est dans les cieux et tout ce qui est",
    "sur la terre. Et louange à Lui dans l'au-delà.",
    "Louange à Allah à qui appartient tout ce qui est dans les cieux et tout ce qui est sur la terre. Et louange à Lui dans l'au-delà.",
    "Et c'est Lui le Sage, le Parfaitement Connaisseur.",
    "Et louange à Lui dans l'au-delà. Et c'est Lui le Sage, le Parfaitement Connaisseur."
  ],
  [
    "Il sait qui pénètre en terre et qui en sort",
    "et qui en sort, ce qui descend du ciel",
    "ce qui descend du ciel et ce qui y remonte",
    "et ce qui y remonte",
    "Et c'est Lui le Miséricordieux, le Pardonneur."
  ]
]

	 */

	if (raw_json === '') {
		toast.error('Please paste the AI response');
		return;
	}

	const edition = get(currentProject).projectSettings.addedTranslations.find((t) =>
		t.includes(languageCode)
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
	if (!Array.isArray(json)) {
		toast.error('Invalid JSON format. Expected an array.');
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

	// Group clips by verse, similar to fetchTranslationsFromGpt
	let verseGroups: Map<string, SubtitleClip[]> = new Map();
	let verseOrder: string[] = []; // To keep track of the order of verses

	// On parcourt les clips en les regroupant par verset
	let lastVerse = -1;
	let lastSurah = -1;
	let allClipOfThisVerse: SubtitleClip[] = [];

	for (const subtitle of subtitleTrack.clips) {
		if (subtitle.isSilence || subtitle.isCustomText || subtitle.surah < 0) continue;

		if (lastSurah === -1 && lastVerse === -1) {
			lastSurah = subtitle.surah;
			lastVerse = subtitle.verse;
		}

		if (subtitle.surah !== lastSurah || subtitle.verse !== lastVerse) {
			// Add previous verse group to our maps
			const key = `${lastSurah}:${lastVerse}`;
			verseGroups.set(key, [...allClipOfThisVerse]);
			verseOrder.push(key);

			// Reset for new verse
			allClipOfThisVerse = [subtitle];
			lastVerse = subtitle.verse;
			lastSurah = subtitle.surah;
		} else {
			// Add clip to current verse
			allClipOfThisVerse.push(subtitle);
		}
	}

	// Add the last verse group if there is one
	if (allClipOfThisVerse.length > 0) {
		const key = `${lastSurah}:${lastVerse}`;
		verseGroups.set(key, [...allClipOfThisVerse]);
		verseOrder.push(key);
	}

	// Check if the number of verse groups matches the number of translation arrays
	if (verseOrder.length !== json.length) {
		toast.error(
			`Mismatch between project verses (${verseOrder.length}) and AI translations (${json.length}).`
		);
		return;
	}

	// Update clips with translations
	let updatedCount = 0;
	let skippedCount = 0;
	let newSubtitleClips = [...subtitleTrack.clips]; // Create a copy of the clips array

	verseOrder.forEach((key, verseIndex) => {
		const clips = verseGroups.get(key);
		const translations = json[verseIndex];

		if (!clips || !translations || !Array.isArray(translations)) {
			skippedCount++;
			return;
		}

		if (clips.length !== translations.length) {
			toast.error(
				`For verse ${key}: Segment count mismatch. Found ${clips.length} clips but ${translations.length} translations.`
			);
			skippedCount++;
			return;
		}

		// Apply translations to clips
		clips.forEach((clip, i) => {
			if (translations[i]) {
				// Find the matching clip in the original array and update it
				const clipIndex = newSubtitleClips.findIndex(
					(c) =>
						!c.isSilence &&
						c.surah === clip.surah &&
						c.verse === clip.verse &&
						c.start === clip.start
				);

				if (clipIndex !== -1) {
					// Create new clip with updated translations
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
	});

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
		`Successfully updated ${updatedCount} clips with AI translations.${skippedCount > 0 ? ` Skipped ${skippedCount} clips.` : ''}`
	);
}
