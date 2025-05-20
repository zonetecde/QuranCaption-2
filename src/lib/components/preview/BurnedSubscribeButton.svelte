<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { fade } from 'svelte/transition';

	// Pour que le gif 'subscribe' commence au début
	let gifKey = 0;
	let prevInRange: number | boolean = false;
	$: subscribeButtonSettings =
		$currentProject.projectSettings.globalSubtitlesSettings.subscribeButton;
	$: subscribeButtonStartTime = subscribeButtonSettings
		? subscribeButtonSettings.startTime * 1000
		: 0;

	$: subscribeButtonEndTime = subscribeButtonStartTime + 4500;
	$: {
		const currentInRange =
			$cursorPosition &&
			$cursorPosition > subscribeButtonStartTime &&
			$cursorPosition < subscribeButtonEndTime;
		if (currentInRange && !prevInRange) {
			gifKey = Date.now();
		}
		prevInRange = currentInRange;
	}
</script>

{#if subscribeButtonSettings && subscribeButtonSettings.enable && $cursorPosition && $cursorPosition > subscribeButtonStartTime && $cursorPosition < subscribeButtonEndTime}
	<img
		src={`/icons/subscribe.gif?key=${gifKey}`}
		alt="Subscribe"
		class="absolute opacity-50"
		style={subscribeButtonSettings.position === 'TL'
			? 'top: 3rem; left: 7rem;'
			: subscribeButtonSettings.position === 'TR'
				? 'top: 3rem; right: 7rem;'
				: subscribeButtonSettings.position === 'BL'
					? 'bottom: 3rem; left: 7rem;'
					: subscribeButtonSettings.position === 'BR'
						? 'bottom: 3rem; right: 7rem;'
						: subscribeButtonSettings.position === 'TC'
							? 'top: 3rem; left: 50%; transform: translateX(-50%);'
							: 'bottom: 1.5rem; left: 50%; transform: translateX(-50%);'}
		width="200"
		height="100"
		transition:fade
	/>
{/if}
