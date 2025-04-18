<script lang="ts">
	import {
		onlyShowSubtitlesThatAreNotFullVerses,
		onlyShowVersesWhoseTranslationsNeedReview
	} from '$lib/stores/LayoutStore';
	import {
		currentProject,
		getProjectPercentageTranslated,
		getUserProjects,
		getUserProjectsAsProjects
	} from '$lib/stores/ProjectStore';
	import { downloadTranslationForVerse } from '$lib/stores/QuranStore';
	import toast from 'svelte-french-toast';

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

	let languageCodeToTranslate = '';
	async function fetchTranslationsFromGpt() {
		if (languageCodeToTranslate === '') {
			toast.error('Please enter a language code.');
			return;
		}

		const urlBase =
			'https://rayanestaszewski.fr/gpt-translation?verseKey=@1&verseExtract=@2&verseTranslation=@3';

		// Création du dictionnaire
		const verses: Record<string, { verseExtract: string; subtitleId: string }[]> = {};

		// Utiliser for...of au lieu de .map() pour les async
		for (const subtitle of $currentProject.timeline.subtitlesTracks[0].clips) {
			if (
				subtitle.isSilence ||
				subtitle.isCustomText ||
				subtitle.hadItTranslationEverBeenModified ||
				(subtitle.firstWordIndexInVerse === 0 && subtitle.isLastWordInVerse) ||
				subtitle.verse === -1 ||
				subtitle.surah === -1
			)
				continue;

			const verseKey = `${subtitle.surah}:${subtitle.verse}`;

			if (!verses[verseKey]) {
				verses[verseKey] = [];
			}

			verses[verseKey].push({
				verseExtract: subtitle.text,
				subtitleId: subtitle.id
			});
		}

		// Traiter les traductions une par une
		for (const translation of $currentProject.projectSettings.addedTranslations) {
			if (!translation.includes(languageCodeToTranslate)) continue;

			for (const [verseKey, verseExtracts] of Object.entries(verses)) {
				toast('Translation of verse ' + verseKey + ' is being processed...', {
					duration: 1000,
					icon: '🔍'
				});

				try {
					const verseTranslation = await fetch(
						urlBase
							.replace('@1', verseKey)
							.replace('@2', JSON.stringify(verseExtracts.map((e) => e.verseExtract)))
							.replace(
								'@3',
								await downloadTranslationForVerse(
									translation,
									Number(verseKey.split(':')[0]),
									Number(verseKey.split(':')[1])
								)
							)
					).then((r) => r.json());

					const tabTrans = JSON.parse(verseTranslation).translations;

					// Mise à jour directe avec find()
					for (const [index, extract] of verseExtracts.entries()) {
						const subtitle = $currentProject.timeline.subtitlesTracks[0].clips.find(
							(s) => s.id === extract.subtitleId
						);

						if (subtitle && tabTrans[index]) {
							subtitle.translations[translation] = tabTrans[index];
							subtitle.hadItTranslationEverBeenModified = true;
						}
					}
				} catch (error) {
					console.error('Error processing verse:', verseKey, error);
				}

				// Force update
				$currentProject.timeline.subtitlesTracks[0].clips = [
					...$currentProject.timeline.subtitlesTracks[0].clips
				];

				// attend 3 secondes
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		toast.success('All translations fetched from AI.');
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
	<abbr
		title="This will ask an AI to translate the verses of the current project for you."
		class="hidden experimental"
	>
		<button
			class="border py-2 border-gray-200 rounded-lg duration-100 bg-[#170f1a] w-full"
			id="fetch-translations-button"
			on:click={() => {
				fetchTranslationsFromGpt();
			}}>Automatic Translation using AI</button
		>
		<input
			type="text"
			class="border py-2 border-gray-200 rounded-lg duration-100 bg-[#170f1a] w-full px-2"
			placeholder="Language code (e.g. fr, en, ar)"
			bind:value={languageCodeToTranslate}
		/>
		<p class=" no-underline">
			Please double check the translations after using this feature. This is EXPERIMENTAL. I am not
			responsible for any mistakes.
		</p>
	</abbr>
</div>
