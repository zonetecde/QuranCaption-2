<script lang="ts">
	import {
		addAITranslations,
		generateTranslationsPrompt
	} from '$lib/functions/AutomaticTranslationsUsingAI';
	import { getVerseTranslation } from '$lib/functions/Translation';
	import {
		onlyShowSubtitlesThatAreNotFullVerses,
		onlyShowVersesWhoseTranslationsNeedReview
	} from '$lib/stores/LayoutStore';
	import {
		currentProject,
		getProjectPercentageTranslated,
		getUserProjectsAsProjects
	} from '$lib/stores/ProjectStore';
	import toast from 'svelte-french-toast';
	import { open as openLink } from '@tauri-apps/api/shell';

	let percentage = 0;
	$: if ($currentProject.timeline.subtitlesTracks[0].clips) {
		percentage = getProjectPercentageTranslated($currentProject);
	}

	/**
	 * Search in all the other user's projects for the translations of the current project
	 */
	async function fetchTranslationsFromOtherProjects() {
		let numberOfUpdatedTranslations = 0;

		toast.success('Fetching translations from other projects...');

		const userProjects = await getUserProjectsAsProjects();

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
											for (let [translationId, translationText] of Object.entries(
												userSubtitle.translations
											)) {
												// Si :
												// 1. La traduction n'est pas vide
												// 2. La traduction est la même que celle de l'utilisateur
												// OU que l'on passe de la traduction française sans ponctuation à la traduction française avec ponctuation
												const isMuhammadHamidulTranslation =
													translationId.includes('fra-muhammadhamidul') &&
													translation.includes('fra-muhammadhameedu');
												if (
													translationText !== '' &&
													(translationId === translation || isMuhammadHamidulTranslation)
												) {
													// Nécessaire pour passer de la traduction sans ponctuation à la traduction avec ponctuation - les usages de guillemets sont différents
													if (isMuhammadHamidulTranslation) {
														translationText = translationText.replace('«', '"').replace('»', '"');
														// ajoute les points de ponctuation à la fin s'il n'y en a
														// si subtitle.translations[translation] se finit par `,` ou `!` ou `?` ou `.` ou `:` ou `;` et que translationText ne se finit pas par `,` ou `!` ou `?` ou `.` ou `:` ou `;` alors on ajoute le point du ponctuation de subtitle.translations[translation] à la fin de translationText
														if (
															subtitle.isLastWordInVerse &&
															(subtitle.translations[translation].endsWith(',') ||
																subtitle.translations[translation].endsWith('!') ||
																subtitle.translations[translation].endsWith('?') ||
																subtitle.translations[translation].endsWith('.') ||
																subtitle.translations[translation].endsWith(':') ||
																subtitle.translations[translation].endsWith(';'))
														) {
															// vérifie si translationText ne se finit pas par le point de ponctuation de subtitle.translations[translation]
															if (
																!translationText.endsWith(
																	subtitle.translations[translation].slice(-1)
																)
															) {
																if (
																	subtitle.translations[translation].slice(-1) === '.' ||
																	subtitle.translations[translation].slice(-1) === ';' ||
																	subtitle.translations[translation].slice(-1) === ':' ||
																	subtitle.translations[translation].slice(-1) === ','
																) {
																	// Ajout sans espace avant
																	translationText += subtitle.translations[translation].slice(-1);
																} else {
																	translationText +=
																		' ' + subtitle.translations[translation].slice(-1);
																}
															}
														}
													}

													if (
														subtitle.translations[translation] !== translationText &&
														(await getVerseTranslation(
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

	let languageCodeToTranslate = '';
	let aiOutput = '';
	let startId: string = '-1';
	let endId: string = '-1';
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

	{#if percentage !== -1}
		<p>Percentage of translated subtitles :</p>
		<!-- proggress bar -->
		<div class="relative w-full h-6 bg-[#3a3434] rounded-lg overflow-hidden">
			<div
				class="absolute top-0 left-0 h-full bg-[#5b5c66] rounded-lg"
				style="width: {percentage}%"
			></div>

			<div class="absolute top-0 left-0 h-full w-full flex justify-center items-center">
				<span class="text-white text-sm">{percentage}%</span>
			</div>
		</div>
	{/if}

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

	<p class="text-center">-- AI Helper --</p>

	<p class="text-xs text-justify">
		Use AI to generate subtitle translations by copying existing ones. Add a translation to your
		project, then enter the desired language code (e.g., "fr" for French) below.
	</p>

	<p class="text-xs text-justify">
		If your project has many subtitles and the AI cannot process them all at once, specify a range
		by entering start and end IDs. Use -1 for the first or last subtitle. Subtitle IDs are shown at
		the top right of each subtitle input section.
	</p>
	<div class="grid grid-cols-2 gap-x-2">
		<section class="w-full">
			<p class="text-xs text-justify">Start ID</p>
			<input
				type="text"
				class="border py-2 w-full border-gray-200 rounded-lg duration-100 text-sm bg-[#170f1a] px-2"
				placeholder="Start ID (-1 for first subtitle)"
				bind:value={startId}
			/>
		</section>
		<section class="w-full">
			<p class="text-xs text-justify">End ID</p>
			<input
				type="text"
				class="border py-2 w-full border-gray-200 rounded-lg duration-100 text-sm bg-[#170f1a] px-2"
				placeholder="End ID (-1 for last subtitle)"
				bind:value={endId}
			/>
		</section>
	</div>

	<div class="flex flex-col">
		<input
			type="text"
			class="border py-2 border-gray-200 rounded-lg duration-100 text-sm bg-[#170f1a] w-full px-2 border-b-0 rounded-b-none"
			placeholder="Enter language code (e.g. fr, en, ar)"
			bind:value={languageCodeToTranslate}
		/>
		<button
			class="border py-2 border-gray-200 rounded-lg text-sm duration-100 bg-[#170f1a] w-full border-t-0 rounded-t-none"
			id="fetch-translations-button"
			on:click={() => {
				generateTranslationsPrompt(
					languageCodeToTranslate,
					Number(startId || '-1'),
					Number(endId || '-1')
				);
			}}>Copy AI prompt</button
		>
	</div>

	<p class="text-sm text-justify">
		Once you have copied the prompt, go to <button
			class="text-blue-300"
			on:click={() => {
				openLink('https://grok.com');
			}}>Grok.com</button
		> and paste it there. (I found that it is currently the best AI for this task, but you can use any
		AI you prefer.)
	</p>
	<p class="text-sm text-justify">Then, paste what Grok provided here:</p>

	<div class="flex flex-col">
		<textarea
			class="border py-2 border-gray-200 rounded-lg duration-100 text-sm bg-[#170f1a] w-full px-2 border-b-0 rounded-b-none"
			placeholder="Paste AI's response here"
			bind:value={aiOutput}
		></textarea>
		<button
			class="border py-2 border-gray-200 rounded-lg text-sm duration-100 bg-[#170f1a] w-full border-t-0 rounded-t-none"
			id="fetch-translations-button"
			on:click={() => {
				addAITranslations(aiOutput, languageCodeToTranslate);
			}}>Add the AI-generated translations</button
		>
	</div>
</div>
