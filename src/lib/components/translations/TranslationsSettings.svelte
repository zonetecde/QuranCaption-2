<script>
	import {
		onlyShowSubtitlesThatAreNotFullVerses,
		onlyShowVersesWhoseTranslationsNeedReview
	} from '$lib/stores/LayoutStore';
	import {
		currentProject,
		getUserProjects,
		getUserProjectsAsProjects
	} from '$lib/stores/ProjectStore';
	import { downloadTranslationForVerse } from '$lib/stores/QuranStore';
	import toast from 'svelte-french-toast';

	/**
	 * Search in all the other user's projects for the translations of the current project
	 */
	async function fetchTranslationsFromOtherProjects() {
		let numberOfUpdatedTranslations = 0;

		const userProjects = getUserProjectsAsProjects();

		await Promise.all(
			// Loop through all the subtitles of the current project
			$currentProject.timeline.subtitlesTracks[0].clips.map(async (subtitle) => {
				// If the subtitle is silence or the surah or verse is not set, skip
				if (subtitle.isSilence) return;

				await Promise.all(
					// Loop through all the translations of the current project
					$currentProject.projectSettings.addedTranslations.map(async (translation) => {
						await Promise.all(
							// Loop through all the user's projects
							userProjects.map(async (userProject) => {
								if (userProject.id === $currentProject.id) return;

								await Promise.all(
									userProject.timeline.subtitlesTracks[0].clips.map(async (userSubtitle) => {
										if (
											userSubtitle.verse === subtitle.verse &&
											userSubtitle.surah === subtitle.surah &&
											userSubtitle.firstWordIndexInVerse === subtitle.firstWordIndexInVerse &&
											userSubtitle.lastWordIndexInVerse === subtitle.lastWordIndexInVerse
										) {
											for (const [translationId, translationText] of Object.entries(
												userSubtitle.translations
											)) {
												if (translationId.split('-')[0] === translation.split('-')[0]) {
													if (
														subtitle.translations[translation] !== translationText &&
														(await downloadTranslationForVerse(
															translationId,
															subtitle.surah,
															subtitle.verse
														)) !== translationText
													) {
														subtitle.translations[translation] = translationText;
														subtitle.hadItTranslationEverBeenModified = true;
														numberOfUpdatedTranslations++;
													}
												}
											}
										}
									})
								);
							})
						);
					})
				);
			})
		);

		toast.success(
			'Translations fetched from other projects.\n' +
				numberOfUpdatedTranslations +
				' translation(s) updated.'
		);

		// Force update
		$currentProject.timeline.subtitlesTracks[0].clips =
			$currentProject.timeline.subtitlesTracks[0].clips;
	}
</script>

<div class="w-full h-full flex flex-col pt-3 px-3 gap-y-5 bg-[#1f1f1f] overflow-y-scroll">
	<!-- Tailwind switch -->
	<h2 class="text-lg font-bold text-center">Translations Settings</h2>

	<label>
		<input
			type="radio"
			class="form-radio h-5 w-5 text-green-500"
			name="subtitleOption"
			value="showAllSubtitles"
			on:change={() => {
				onlyShowSubtitlesThatAreNotFullVerses.set(false);
				onlyShowVersesWhoseTranslationsNeedReview.set(false);
			}}
		/>
		Show all subtitles
	</label>
	<label>
		<input
			type="radio"
			class="form-radio h-5 w-5 text-green-500"
			name="subtitleOption"
			value="showNotFullVerses"
			on:change={() => {
				onlyShowSubtitlesThatAreNotFullVerses.set(true);
				onlyShowVersesWhoseTranslationsNeedReview.set(false);
			}}
		/>
		Only show subtitles that are not full verses
	</label>
	<label>
		<input
			type="radio"
			class="form-radio h-5 w-5 text-green-500"
			name="subtitleOption"
			value="showUnreviewedTranslations"
			on:change={() => {
				onlyShowSubtitlesThatAreNotFullVerses.set(false);
				onlyShowVersesWhoseTranslationsNeedReview.set(true);
			}}
		/>
		Only show subtitles whose translations have not been reviewed
	</label>

	<p class="text-sm italic text-justify">
		Remember to press enter after modifying a translation so the software can proceed with the
		remaining translations for you.<br /><br />Green indicates that a translation required review
		but has already been reviewed.<br /><br />Red indicates that a translation still needs to be
		reviewed.
	</p>

	<abbr
		title="This will try to complet the translations of the current project with the translations of your other projects."
	>
		<button
			class="border py-2 border-gray-200 rounded-lg duration-100 bg-[#170f1a]"
			id="fetch-translations-button"
			on:click={() => {
				fetchTranslationsFromOtherProjects();
			}}>Fetch translations from other projects</button
		>
	</abbr>
</div>
