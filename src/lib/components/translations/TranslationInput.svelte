<script lang="ts">
	import { milisecondsToMMSS, type SubtitleClip } from '$lib/classes/Timeline';
	import { GPT_URL } from '$lib/ext/PrivateVariable';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	import { downloadTranslationForVerse } from '$lib/stores/QuranStore';
	import { text } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	export let subtitle: SubtitleClip;
	let wbwTranslation: string[] = [];

	onMount(async () => {
		// Télécharge la traduction mot à mot
		const url = `https://api.quranwbw.com/v1/verses?verses=${subtitle.surah}:${subtitle.verse}`;
		const response = await fetch(url);
		if (response.ok) {
			const data = await response.json();
			let line19 = JSON.stringify(data, null, 2).split('\n')[17];
			line19 = line19.slice(26, -2);
			wbwTranslation = line19.split('|');
		}
	});

	async function handleRefreshTranslation(translation: string) {
		// @ts-ignore
		subtitle.translations[translation] = await downloadTranslationForVerse(
			translation,
			subtitle.surah,
			subtitle.verse
		);

		const textarea = document.getElementById(
			'textarea-translation-' + subtitle.id + '-' + translation
		);
		textarea!.textContent = subtitle.translations[translation];
	}

	function handleValidation(e: any) {
		const textareas = document.querySelectorAll('.textarea-translation');
		// @ts-ignore
		const index = Array.from(textareas).indexOf(e.target);
		if (index < textareas.length - 1) {
			// @ts-ignore
			textareas[index + 1].focus();
			// Met le curseur à la fin du texte
			const range = document.createRange();
			const sel = window.getSelection();
			range.setStart(textareas[index + 1], 1);
			range.collapse(true);
			// @ts-ignore
			sel.removeAllRanges();
			// @ts-ignore
			sel.addRange(range);
		}
	}

	async function askAiForTranslation(translation: string) {
		const selectedWordsArray: string[] = [];
		const beforeWordsArray: string[] = [];
		const afterWordsArray: string[] = [];

		const edition = getEditionFromName(translation);

		for (let i = 0; i < wbwTranslation.length; i++) {
			if (i >= subtitle.firstWordIndexInVerse && i <= subtitle.lastWordIndexInVerse)
				selectedWordsArray.push(wbwTranslation[i]);
			else if (i < subtitle.firstWordIndexInVerse) beforeWordsArray.push(wbwTranslation[i]);
			else if (i > subtitle.lastWordIndexInVerse) afterWordsArray.push(wbwTranslation[i]);
		}

		const completVerseTranslation = await downloadTranslationForVerse(
			translation,
			subtitle.surah,
			subtitle.verse
		);

		const prompt =
			'Translate me in the ' +
			edition?.language +
			' language the 3 elements of this array the more accordingly possible. : \n' +
			JSON.stringify(
				[
					beforeWordsArray.join(' '),
					selectedWordsArray.join(' '),
					afterWordsArray.join(' ')
				].filter((x) => x.length > 0)
			) +
			'\nTry to copy this translations, as it is the best one you could give : \n\n' +
			completVerseTranslation +
			'\n\nGive me a json formatted response :\n{ "translations":["first string translation", "second string translation","third string translation"]}';

		const response = await fetch(GPT_URL + encodeURI(prompt), {
			method: 'GET'
		});

		if (response.ok) {
			const data = await response.json();

			let json = data.replace('```json', '').replace('```', '').trim();

			const gptTranslation = JSON.parse(json).translations[beforeWordsArray.length === 0 ? 0 : 1];

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
		} else {
			toast.error('An error occured while asking the AI for translation', {
				position: 'bottom-left',
				style: 'background-color: #333; color: white;',
				icon: '🤖'
			});
		}
	}
</script>

<div class="p-2 border-b-2 px-10 border-[#413f3f]">
	<div class="flex justify-between items-start flex-col w-full">
		<p class="text-xs -mt-1 text-left">
			{milisecondsToMMSS(subtitle.start)} - {milisecondsToMMSS(subtitle.end)}
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
								handleValidation(e);
							}
						}}
					>
					</span>

					<div class="flex flex-row gap-x-2 bg-[#332128] px-2 rounded-md border border-[#1a1013]">
						<button class="relative group" on:click={() => handleRefreshTranslation(translationId)}>
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
