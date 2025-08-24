<script lang="ts">
	import { PredefinedSubtitleClip, SubtitleClip } from '$lib/classes/Clip.svelte';
	import { Quran } from '$lib/classes/Quran';
	let { subtitle } = $props();
</script>

{#if subtitle instanceof SubtitleClip}
	{@const words = subtitle.getTextWithVerseNumber().split(' ')}

	<!-- Affiche le numéro de verset en haut à gauche -->
	<div
		class="absolute top-0 left-0 bg-white/10 px-1 py-1 rounded-br-lg border-color border-l-0 border-t-0 border-1 text-sm"
	>
		{subtitle.surah}:{subtitle.verse}
	</div>

	<div class="text-3xl flex flex-row arabic text-right gap-x-2 flex-wrap gap-y-2" dir="rtl">
		{#each words as word, i}
			{@const wordIndex = subtitle.startWordIndex + i}
			<div
				class="word group flex flex-col items-center gap-y-2 relative"
				role="button"
				tabindex="0"
				onmouseenter={(e) => {
					// Ne charge la traduction que si ce n'est pas le numéro de verset
					if (i !== words.length - 1 || !subtitle.isLastWordsOfVerse) {
						const target = e.currentTarget;
						const tooltip = target.querySelector('.word-translation-tooltip') as HTMLElement;
						if (tooltip && !tooltip.dataset.loaded) {
							// Marque comme chargé pour éviter les rechargements
							tooltip.dataset.loaded = 'true';
							// Charge et affiche la traduction
							Quran.getVerse(subtitle.surah, subtitle.verse).then((verse) => {
								if (verse) {
									const translation = verse.getWordByWordTranslationBetweenTwoIndexes(
										wordIndex,
										wordIndex
									);
									tooltip.textContent = translation;
								}
							});
						}
					}
				}}
			>
				<span>{word + ' '}</span>

				<!-- Si ce n'est pas le numéro de verset -->
				{#if i !== words.length - 1 || !subtitle.isLastWordsOfVerse}
					<span
						class="word-translation-tooltip group-hover:block hidden text-sm absolute top-10 w-max px-1.5 bg-slate-700 border-slate-800 border-2 rounded-lg text-center z-20"
						dir="ltr"
					>
						<!-- Le contenu est chargé dynamiquement lors du survol -->
					</span>
				{/if}
			</div>
		{/each}
	</div>

	<p class="text-sm text-thirdly text-left mt-1" dir="rtl">
		{subtitle.wbwTranslation}
	</p>
{:else if subtitle instanceof PredefinedSubtitleClip}
	<p class="text-3xl arabic text-right" dir="rtl">{subtitle.text}</p>
{/if}
