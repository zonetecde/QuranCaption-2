<script lang="ts">
	import type { SubtitleClip } from '$lib/models/Timeline';
	import {
		clearSubtitleToEdit,
		currentlyEditedSubtitleId,
		setSubtitleToEdit
	} from '$lib/stores/LayoutStore';
	export let subtitle: SubtitleClip;
</script>

{#if subtitle.verse !== -1 && subtitle.surah !== -1}
	<abbr title="Edit this subtitle">
		<button
			class=" bg-[#253030] p-1 rounded-lg border border-[#1a1013]"
			on:click={() => {
				if ($currentlyEditedSubtitleId === subtitle.id) {
					clearSubtitleToEdit();
				} else {
					setSubtitleToEdit(subtitle.id);
				}
			}}
		>
			{#if $currentlyEditedSubtitleId === subtitle.id}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
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
						d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
					/>
				</svg>
			{/if}
		</button>
	</abbr>
{/if}
