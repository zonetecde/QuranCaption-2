<script lang="ts">
	import type { Surah } from '$lib/models/Quran';
	import { ask } from '@tauri-apps/api/dialog';
	import toast from 'svelte-french-toast';

	export let selectedText: Surah | null = null;
	let rawText: string = '';

	function removeVerseButtonClick(index: number): any {
		if (!selectedText) return;

		selectedText.verses = selectedText.verses.filter((_, i) => i !== index);
		// replace the ids of the verses starting from 1
		selectedText.verses = selectedText.verses.map((v, i) => {
			v.id = i + 1;
			return v;
		});
	}

	function addVerseButtonClick() {
		if (!selectedText) return;

		// Take the first verse and get the existing translations from it
		let existingTranslations =
			selectedText.verses.length > 0 ? Object.keys(selectedText.verses[0].translations) : [];
		let translations = {};
		existingTranslations.forEach((lang) => {
			//@ts-ignore
			translations[lang] = '';
		});

		selectedText.verses = [
			...selectedText.verses,
			{
				id: selectedText.verses.length + 1,
				text: '',
				translations: translations
			}
		];
	}

	function addTranslationButtonClick() {
		if (!selectedText) return;

		let translationLangCode = prompt(
			'Enter the language code for the translation (e.g., "en" for English):'
		);
		if (translationLangCode) {
			selectedText.verses.forEach((verse) => {
				verse.translations[translationLangCode] = '';
			});
		}
		selectedText = { ...selectedText }; // Trigger reactivity
	}

	function removeTranslationButtonClick() {
		if (!selectedText) return;

		let translationLangCode = prompt(
			'Enter the language code for the translation you want to remove (e.g., "en" for English):'
		);
		if (translationLangCode) {
			selectedText.verses.forEach((verse) => {
				delete verse.translations[translationLangCode];
			});
		}
		selectedText = { ...selectedText }; // Trigger reactivity
	}

	let showRawInputBox = false;
	function askAIButtonClick() {
		showRawInputBox = !showRawInputBox;
	}

	let isFetching = false;
	async function sendToAi() {
		if (rawText.length === 0) {
			toast.error('Please enter the raw text before sending to AI.');
			return;
		}
		if (isFetching) {
			toast.error('AI is already processing your request. Please wait.');
			return;
		}
		if (!selectedText) return;

		if (selectedText.verses.length > 0) {
			const answer = await ask(
				'Are you sure you want to send the text to the AI? This will replace the current text.'
			);
			if (answer !== true) {
				return;
			}
		}

		const url = 'https://rayanestaszewski.fr/poems-formatter';
		const data = {
			raw_text: rawText
		};
		const options: RequestInit = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		};

		isFetching = true;

		let json: {
			verses: { number: number; text: string; translations: { [key: string]: string } }[];
		};
		let jsonStr: string;

		jsonStr = await toast.promise(
			fetch(url, options)
				.then((response) => {
					if (response.ok) {
						return response.json();
					} else {
						throw new Error('Network response was not ok');
					}
				})
				.finally(() => {
					isFetching = false;
				}),
			{
				loading: 'AI is processing your request...',
				success: 'AI has returned the text.',
				error: 'Error formatting the text. Please try again.'
			}
		);

		rawText = '';
		showRawInputBox = false;

		console.log(jsonStr);
		try {
			json = JSON.parse(jsonStr);
		} catch (error) {
			toast.error(
				"Error parsing the response from AI. It might be related to copyright issues. Please try again, maybe it'll work."
			);
			console.error('Error parsing JSON:', error);
			return;
		}
		console.log(json);

		if (json.verses.length > 0) {
			selectedText.verses = json.verses.map((verse: any, index: number) => {
				return {
					id: verse.number,
					text: verse.text,
					translations: verse.translations
				};
			});
		}
	}
</script>

{#if selectedText}
	<div class="w-full h-full py-3 px-3 overflow-y-auto">
		<h2 class="text-xl text-center">Text editor</h2>
		<br />
		<div class="flex flex-row relative">
			<label for="text-name" class="text-sm font-medium flex items-center"
				>Text name: <input
					type="text"
					id="text-name"
					class="h-8 w-[400px] ml-1 border border-gray-900 bg-[#3c4251] rounded-md px-1 outline-none"
					bind:value={selectedText.name}
				/></label
			>

			<button
				class="ml-auto xl:text-base text-sm text-white bg-gray-700 px-4 hover:bg-gray-800 border border-black"
				on:click={askAIButtonClick}
			>
				Ask AI to format the text
			</button>
			{#if showRawInputBox}
				<textarea
					class="absolute right-0 top-8 h-60 w-[500px] ml-1 border-4 border-b border-black bg-[#3c4251] rounded-md px-1 outline-none"
					bind:value={rawText}
					placeholder="The raw text containg the verses, the translations and everything else"
				></textarea>
				<button
					class="absolute right-0 w-[500px] top-[16.9rem] text-white bg-gray-700 px-4 hover:bg-gray-800 border-4 border-t border-black"
					on:click={sendToAi}
				>
					Send to AI
				</button>
			{/if}
		</div>

		<br />
		<p class="text-sm font-medium flex items-center">
			Verses/lines: <span class="text-gray-500 text-xs ml-1">
				Make sure that in the arabic text and in the translations, the two sub-verses are separated
				by "***"
			</span>
		</p>

		<br />
		{#if selectedText.verses.length === 0}
			<p class="text-sm text-gray-500">No verses/lines added yet.</p>
		{:else}
			<div class="flex flex-col -mt-2 divide-y divide-gray-700">
				{#each selectedText.verses as verse, index}
					<div class="grid grid-cols-2-template pt-2">
						<div class="flex items-center mb-2">
							<label for="verse-{index}" class="text-sm w-full font-medium flex items-center"
								>{index + 1}.
								<input
									type="text"
									placeholder="ما لذَّةُ العيشِ إلّا صُحبَةَ الفُقَرا *** هُمُ السّلاطينُ والسّادَةُ الأُمَرا"
									class="arabic text-right w-full h-12 text-lg ml-1 border border-gray-900 bg-[#3c4251] rounded-md px-1 outline-none"
									bind:value={verse.text}
								/></label
							>
							<button
								class="ml-2 text-red-500 hover:text-red-700"
								on:click={() => removeVerseButtonClick(index)}
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
										d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
									/>
								</svg>
							</button>
						</div>

						<div class="flex flex-col justify-center ml-4 monospace">
							{#if Object.keys(verse.translations).length > 0}
								{#each Object.keys(verse.translations) as lang}
									<div class="flex items-center mb-2">
										<label
											for="translation-{index}-{lang}"
											class="text-sm font-medium flex items-center w-full"
											>{lang}:
											<input
												placeholder="What delight [...] the fuqara? *** They are the sultans, lords, and princes."
												type="text"
												id="translation-{index}-{lang}"
												class="h-8 w-full ml-1 border border-gray-900 bg-[#3c4251] rounded-md px-1 outline-none"
												bind:value={verse.translations[lang]}
											/></label
										>
									</div>
								{/each}
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<section class="flex flex-row gap-x-3">
			<button class="mt-2 text-blue-500 hover:text-blue-700" on:click={addVerseButtonClick}>
				Add Verse/line
			</button>
			<button class="mt-2 text-blue-500 hover:text-blue-700" on:click={addTranslationButtonClick}>
				Add Translation
			</button>
			<!-- remove translation -->
			<button
				class="mt-2 ml-auto text-red-500 hover:text-red-700"
				on:click={removeTranslationButtonClick}
			>
				Remove a Translation
			</button>
		</section>
	</div>
{:else}
	<div class="w-full h-full flex items-center justify-center">
		<p class="text-gray-500">Select a text to edit</p>
	</div>
{/if}

<style>
	.grid-cols-2-template {
		grid-template-columns: 45% 55%;
	}
</style>
