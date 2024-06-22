<script lang="ts">
	import { milisecondsToMMSS, type SubtitleClip } from '$lib/models/Timeline';
	import { GPT_URL } from '$lib/ext/PrivateVariable';
	import { isFetchingIA, onlyShowVersesThatNeedTranslationReview } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { Mushaf, getEditionFromName } from '$lib/stores/QuranStore';
	import { downloadTranslationForVerse } from '$lib/stores/QuranStore';
	import { text } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	export let subtitle: SubtitleClip;
	export let subtitleIndex: number;
	let wbwTranslation: string[] = [];
	let isIncomplete = false;

	onMount(async () => {
		if (subtitle.surah === -1 || subtitle.verse === -1) {
			isIncomplete = true;

			return; // Si c'est un silence, une basmala ou autre
		}

		// Télécharge la traduction mot à mot
		const url = `https://api.quranwbw.com/v1/verses?verses=${subtitle.surah}:${subtitle.verse}`;
		const response = await fetch(url);
		if (response.ok) {
			const data = await response.json();
			let line19 = JSON.stringify(data, null, 2).split('\n')[17];
			line19 = line19.slice(26, -2);
			wbwTranslation = line19.split('|');
		}

		// Regarde si les mots sélectionnés dans le texte arabe est complet
		if (
			subtitle.firstWordIndexInVerse !== 0 ||
			subtitle.lastWordIndexInVerse !==
				$Mushaf.surahs[subtitle.surah - 1].verses[subtitle.verse - 1].text.split(' ').length - 1
		) {
			isIncomplete = true;
		}
	});

	async function handleRefreshTranslation(translation: string) {
		// @ts-ignore
		subtitle.translations[translation] = await downloadTranslationForVerse(
			translation,
			subtitle.surah,
			subtitle.verse
		);

		changeText(subtitle.id, translation);
	}

	function changeText(subtitleId: string, translation: string) {
		const subtitle = $currentProject.timeline.subtitlesTracks[0].clips.find(
			(clip) => clip.id === subtitleId
		);

		if (!subtitle) return;

		const textarea = document.getElementById(
			'textarea-translation-' + subtitleId + '-' + translation
		);
		textarea!.textContent = subtitle.translations[translation];
	}

	/**
	 * Handles the validation of a translation input.
	 *
	 * @param {any} e - The event object.
	 * @param {string} translationId - The ID of the translation.
	 */
	async function handleValidation(e: any, translationId: string) {
		// Trim the text of this subtitle
		subtitle.translations[translationId] = subtitle.translations[translationId].trim();
		changeText(subtitle.id, translationId);

		// Trim all subsequent subtitles that come after the Arabic text of the current subtitle
		// to facilitate the translator's work
		for (
			let i = subtitleIndex + 1;
			i < $currentProject.timeline.subtitlesTracks[0].clips.length;
			i++
		) {
			const element = $currentProject.timeline.subtitlesTracks[0].clips[i];

			try {
				if (element.verse === subtitle.verse && element.surah === subtitle.surah) {
					// Check if the translation has not been modified
					if (
						(await downloadTranslationForVerse(translationId, element.surah, element.verse)) ===
						element.translations[translationId]
					) {
						if (subtitle.lastWordIndexInVerse + 1 === element.firstWordIndexInVerse) {
							// Get the last translation of this verse, just before the Arabic text of this subtitle
							let lastTranslations = $currentProject.timeline.subtitlesTracks[0].clips
								.slice(0, i)
								.filter(
									(clip) =>
										clip.verse === subtitle.verse &&
										clip.surah === subtitle.surah &&
										clip.firstWordIndexInVerse < subtitle.firstWordIndexInVerse
								);

							// Remove duplicates of translations based on firstWordIndexInVerse and lastWordIndexInVerse
							// If not done, some translations will be repeated and the offset will be wrong
							const distinct = Array.from(
								new Set(lastTranslations.map((a) => a.firstWordIndexInVerse))
							).map((firstWordIndexInVerse) => {
								return lastTranslations.find(
									(a) => a.firstWordIndexInVerse === firstWordIndexInVerse
								);
							});

							// @ts-ignore
							lastTranslations = distinct;

							// Calculate the offset of the text to remove
							let sum = 0;
							for (const translation of lastTranslations) {
								sum += translation.translations[translationId].length + 1;
							}

							// Remove the already-translated part of the text
							element.translations[translationId] = element.translations[translationId].substring(
								subtitle.translations[translationId].length + sum
							);

							// Change the text of the textarea
							changeText(element.id, translationId);
						} else if (element.text === subtitle.text) {
							// Copy the translation from the current subtitle because it is the same text
							element.translations[translationId] = subtitle.translations[translationId];
							changeText(element.id, translationId);
						}
					}
				}
			} catch (e) {
				// Something went wrong
			}
		}

		// const textareas = document.querySelectorAll('.textarea-translation');
		// // @ts-ignore
		// const index = Array.from(textareas).indexOf(e.target);
		// if (index < textareas.length - 1) {
		//   // @ts-ignore
		//   textareas[index + 1].focus();
		//   // Set the cursor at the end of the text
		//   const range = document.createRange();
		//   const sel = window.getSelection();
		//   range.setStart(textareas[index + 1], 1);
		//   range.collapse(true);
		//   // @ts-ignore
		//   sel.removeAllRanges();
		//   // @ts-ignore
		//   sel.addRange(range);
		// }
	}

	/**
	 * Asks the AI for word-by-word translation of a verse in a specific language.
	 * @param translation The ID of the translation language.
	 */
	async function getGptWordByWordTranslation(translation: string) {
		const edition = getEditionFromName(translation);

		const savedInLocalStorage = localStorage.getItem('gptWbwTranslations') || '[]';
		const parsedSavedInLocalStorage = JSON.parse(savedInLocalStorage);

		if (savedInLocalStorage) {
			const gptWbwTranslations = parsedSavedInLocalStorage.find(
				(item: any) =>
					item.surah === subtitle.surah &&
					item.verse === subtitle.verse &&
					item.lang === translation
			);
			if (gptWbwTranslations) {
				return gptWbwTranslations.wbwTranslation;
			}
		} else if (savedInLocalStorage === '[]') {
			localStorage.setItem('gptWbwTranslations', JSON.stringify([]));
		}

		if ($isFetchingIA) {
			toast.error('Please wait for the AI to finish fetching the translation', {
				position: 'bottom-left',
				style: 'background-color: #333; color: white;',
				icon: '🤖'
			});
			return;
		}

		const prompt = `You are granted the precious job of translating the quran word by word in ${edition?.language} !\nFor exemple, in english, the verse : \"اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِیْنَ\" is translated word by word as this dictionary :\n\n{\n\"اَلْحَمْدُ\": \"In (the) name\",\n\" لِلّٰهِ \": \"of Allah\",\n\"رَبِّ\": \"the Most Gracious\",\n\"الْعٰلَمِیْنَ\": \"the Most Merciful\"\n}\n\nNow give me translations word by word in ${edition?.language} of this verse : \n\n${$Mushaf.surahs[subtitle.surah - 1].verses[subtitle.verse - 1].text}\n\nPlease, inspire your transition by the real translation of the verse - you need to give me same words as the exisiting translations :\n\n${await downloadTranslationForVerse(translation, subtitle.surah, subtitle.verse)}\n\nGive me a json formated response only - I am using you as an api`;

		try {
			isFetchingIA.set(true);
			const response = await fetch(GPT_URL + encodeURI(prompt), {
				method: 'GET'
			});
			const data = (await response.json()) as string;
			let json = data.replace('```json', '').replace('```', '').trim();
			const gptWbwTranslations = JSON.parse(json);

			// Save the chatgpt response in localStorage
			if (savedInLocalStorage) {
				parsedSavedInLocalStorage.push({
					surah: subtitle.surah,
					verse: subtitle.verse,
					wbwTranslation: gptWbwTranslations,
					lang: translation
				});
				localStorage.setItem('gptWbwTranslations', JSON.stringify(parsedSavedInLocalStorage));
			}

			isFetchingIA.set(false);
			return gptWbwTranslations;
		} catch (e) {
			toast.error('An error occured while asking the AI for translation', {
				position: 'bottom-left',
				style: 'background-color: #333; color: white;',
				icon: '🤖'
			});

			isFetchingIA.set(false);
			return;
		}
	}

	/**
	 * Asks the AI for word-by-word translation of a verse in a specific language.
	 * @param {string} translation - The ID of the translation language.
	 * @returns {Promise<void>}
	 */
	async function askAiForTranslation(translation: string) {
		const gptWbwTranslations = await getGptWordByWordTranslation(translation);

		let gptTranslation = '';

		for (let i = 0; i < Object.keys(gptWbwTranslations).length; i++) {
			if (i >= subtitle.firstWordIndexInVerse && i <= subtitle.lastWordIndexInVerse) {
				const element = Object.keys(gptWbwTranslations)[i];
				gptTranslation += gptWbwTranslations[element] + ' ';
			}
		}

		gptTranslation = gptTranslation.trim();

		subtitle.translations[translation] = gptTranslation;

		const textarea = document.getElementById(
			'textarea-translation-' + subtitle.id + '-' + translation
		);

		textarea!.textContent = subtitle.translations[translation];

		toast.success('The AI has successfully translated the text', {
			position: 'bottom-left',
			style: 'background-color: #333; color: white;',
			icon: '🤖'
		});
	}
</script>

{#if ($onlyShowVersesThatNeedTranslationReview && isIncomplete) || !$onlyShowVersesThatNeedTranslationReview}
	<div class={'p-2 border-b-2 px-10 border-[#413f3f] ' + (isIncomplete ? 'bg-[#2aaf6d09]' : '')}>
		<div class="flex justify-between items-start flex-col w-full">
			<p class="text-lg text-left">
				{#if subtitle.surah !== -1 && subtitle.verse !== -1}
					{subtitle.surah}:{subtitle.verse}
				{/if}
				<span class="text-xs">
					{milisecondsToMMSS(subtitle.start)}-{milisecondsToMMSS(subtitle.end)}</span
				>
			</p>
			<div class="w-full text-4xl mt-4 leading-[3.5rem] flex flex-row-reverse flex-wrap">
				{#each subtitle.text.split(' ') as word, i}
					<div class="flex flex-col relative group">
						<span class="inline-block arabic" style="margin-right: 0.5rem;">{word}</span>
						{#if wbwTranslation[i]}
							<span
								class="text-sm absolute w-max -bottom-10 z-20 -translate-x-1/2 left-1/2 rounded-lg hidden group-hover:inline-block bg-slate-800 p-3"
								style="margin-right: 0.5rem;"
								>{wbwTranslation[subtitle.firstWordIndexInVerse + i]}</span
							>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<div class="flex flex-col mt-1 gap-y-3">
			{#each $currentProject.projectSettings.addedTranslations as translationId}
				<div>
					<p class="font-bold w-full">{getEditionFromName(translationId)?.language}:</p>

					<div class="flex relative flex-row">
						<!-- svelte-ignore a11y-interactive-supports-focus -->
						<span
							class="input w-full border-2 border-[#535b5e] px-2 py-1 text-[#c5d4c4] text-justify -ml-2 mr-2 outline-none rounded-lg textarea-translation"
							id={'textarea-translation-' + subtitle.id + '-' + translationId}
							role="textbox"
							contenteditable
							bind:textContent={subtitle.translations[translationId]}
							on:keydown={(e) => {
								// Si `enter` est pressé, on va à la prochaine textarea
								if (e.key === 'Enter') {
									e.preventDefault();
									handleValidation(e, translationId);
								}
							}}
						>
						</span>

						<div class="flex flex-row gap-x-2 bg-[#332128] px-2 rounded-md border border-[#1a1013]">
							<button
								class="relative group"
								on:click={() => handleRefreshTranslation(translationId)}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="size-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
									/>
								</svg>

								<p
									class="absolute -translate-x-1/2 left-1/2 w-max bg-[#332128] border-[#1a1013] px-3 -bottom-5 hidden group-hover:inline-block"
								>
									Reset translation
								</p>
							</button>

							<button class="relative group" on:click={() => askAiForTranslation(translationId)}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="size-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
									/>
								</svg>
								<p
									class="absolute -translate-x-1/2 left-1/2 w-max bg-[#332128] border-[#1a1013] px-3 -bottom-5 hidden group-hover:inline-block"
								>
									Ask AI
								</p>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
