<script lang="ts">
	import { PredefinedSubtitleClip, TrackType, Translation } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { untrack } from 'svelte';

	const fadeDuration = $derived(() => {
		return globalState.getVideoStyle.animation.styles['fade-duration'].value as number;
	});

	let getTimelineSettings = $derived(() => {
		return globalState.currentProject!.projectEditorState.timeline;
	});

	let currentSubtitle = $derived(() => {
		const _ = getTimelineSettings().cursorPosition;
		return untrack(() => {
			return globalState.getSubtitleTrack.getCurrentSubtitleToDisplay();
		});
	});

	let currentSubtitleTranslations = $derived(() => {
		if (!currentSubtitle()) return [];
		return currentSubtitle()!.translations;
	});

	// Calcul de l'opacité des sous-titres
	let subtitleOpacity = $derived(() => {
		const subtitle = currentSubtitle();
		if (!subtitle) return 0;

		const currentTime = getTimelineSettings().cursorPosition;
		const endTime = subtitle.endTime;
		const timeLeft = endTime - currentTime;
		const halfFade = fadeDuration() / 2;

		if (timeLeft <= halfFade) {
			return Math.max(0, timeLeft / halfFade);
		}

		const startTime = subtitle.startTime;
		const timeSinceStart = currentTime - startTime;

		if (timeSinceStart <= halfFade) {
			return Math.min(1, timeSinceStart / halfFade);
		}

		return 1;
	});
</script>

<div class="w-full h-full">
	<div class="absolute inset-0 flex flex-col items-center justify-center" id="subtitles-container">
		{#if currentSubtitle() && currentSubtitle()!.id}
			<p class={'arabic absolute ' + {}} style="opacity: {subtitleOpacity()};">
				{currentSubtitle()!.text}
			</p>

			<!-- {#each Object.keys(currentSubtitleTranslations()!) as edition}
				{@const translation = (currentSubtitleTranslations()! as Record<string, Translation>)[
					edition
				]}

				<p class="translation absolute" style="opacity: {subtitleOpacity()};">{translation.text}</p>
			{/each} -->
		{/if}
	</div>
</div>
