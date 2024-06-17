<script lang="ts">
	import { milisecondsToMMSS, type SubtitleClip } from '$lib/classes/Timeline';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	import { onMount } from 'svelte';

	import TranslationsCreatorHeader from './TranslationsCreatorHeader.svelte';
	import { downloadTranslationForVerse } from '$lib/stores/QuranStore';

	async function handleRefreshTranslation(subtitle: SubtitleClip, translation: string) {
		// @ts-ignore
		subtitle.translations[translation] = await downloadTranslationForVerse(
			translation,
			subtitle.surah,
			subtitle.verse
		);

		const textarea = document.getElementById(
			'textaera-translation-' + subtitle.id + '-' + translation
		);
		textarea!.textContent = subtitle.translations[translation];
	}

	function handleValidation(e: any, subtitle: SubtitleClip, translation: string) {
		const textareas = document.querySelectorAll('.textaera-translation');
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
</script>

<div class="bg-[#0f0f0f] w-full h-full flex flex-col">
	<TranslationsCreatorHeader />

	<div class="mt-0 flex flex-grow flex-col py-4 bg-[#1f1f1f]">
		{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle}
			<div class="p-2 border-b-2 px-10 border-[#413f3f]">
				<div class="flex justify-between items-start flex-col w-full">
					<p class="text-xs -mt-1 text-left">
						{milisecondsToMMSS(subtitle.start)} - {milisecondsToMMSS(subtitle.end)}
					</p>
					<p class="w-full arabic text-right text-4xl mt-4 leading-[3.5rem]">{subtitle.text}</p>
				</div>

				<div class="flex flex-col mt-1 gap-y-3">
					{#each Object.keys(subtitle.translations) as translationId}
						<div>
							<p class="font-bold w-full">{getEditionFromName(translationId)?.language}:</p>

							<div class="flex relative">
								<!-- svelte-ignore a11y-interactive-supports-focus -->
								<span
									class="input w-full border-2 border-[#535b5e] px-2 py-1 text-[#c5d4c4] text-justify -mx-2 outline-none rounded-lg textaera-translation"
									id={'textaera-translation-' + subtitle.id + '-' + translationId}
									role="textbox"
									contenteditable
									bind:textContent={subtitle.translations[translationId]}
									on:keydown={(e) => {
										// Si `enter` est pressé, on va à la prochaine textarea
										if (e.key === 'Enter') {
											e.preventDefault();
											handleValidation(e, subtitle, translationId);
										}
									}}
								>
								</span>

								<button
									class="absolute -right-5 top-1.5"
									on:click={() => handleRefreshTranslation(subtitle, translationId)}
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
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
