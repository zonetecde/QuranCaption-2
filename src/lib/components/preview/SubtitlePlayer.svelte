<script lang="ts">
	import { getAssetFromId } from '$lib/ext/Id';
	import type { SubtitleClip } from '$lib/models/Timeline';
	import { audio, playedSubtitleId } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { convertFileSrc } from '@tauri-apps/api/tauri';
	import toast from 'svelte-french-toast';

	export let subtitle: SubtitleClip;

	async function playAudio() {
		if ($audio) {
			$audio.pause();
			$audio.remove();
			audio.set(undefined);

			if ($playedSubtitleId === subtitle.id) {
				playedSubtitleId.set(undefined);
				return;
			}
		}

		// create audio element compo
		try {
			const audioUrl =
				$currentProject.timeline.audiosTracks[0].clips.length > 0
					? getAssetFromId($currentProject.timeline.audiosTracks[0].clips[0].assetId)?.filePath
					: getAssetFromId($currentProject.timeline.videosTracks[0].clips[0].assetId)?.filePath;

			if (audioUrl) {
				audio.set(new Audio(convertFileSrc(audioUrl)));
				playedSubtitleId.set(subtitle.id);

				if (!$audio) return;

				$audio.currentTime = subtitle.start / 1000;
				$audio.play();

				let totalDuration = subtitle.end - subtitle.start;
				let actualDuration = 0;

				// Permet de si on play l'audio, le pause, puis le replay,
				// qu'il ne se fasse pas stopper par l'ancien play qui fini sont timeout
				while (actualDuration < totalDuration) {
					await new Promise((resolve) => {
						setTimeout(resolve, 10);
					});

					actualDuration += 10;

					if ($playedSubtitleId !== subtitle.id) {
						break;
					}
				}

				// If the subtitle is still the one being played, stop the audio
				if ($playedSubtitleId === subtitle.id) {
					$audio.pause();

					// destroy
					$audio.remove();
					audio.set(undefined);
					playedSubtitleId.set(undefined);
				}
			}
		} catch {
			toast.error('No audio found');
		}
	}
</script>

{#if subtitle.verse !== -1 && subtitle.surah !== -1}
	<abbr title="Play audio">
		<button
			on:click={() => playAudio()}
			class=" bg-[#253030] p-1 rounded-lg border border-[#1a1013]"
		>
			{#if $playedSubtitleId === subtitle.id}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15.75 5.25v13.5m-7.5-13.5v13.5"
					/>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
					/>
				</svg>
			{/if}
		</button>
	</abbr>
{/if}
