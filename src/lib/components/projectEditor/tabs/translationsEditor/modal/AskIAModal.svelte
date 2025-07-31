<script lang="ts">
	import type { Edition } from '$lib/classes';
	import ClickableLink from '$lib/components/home/ClickableLink.svelte';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	let {
		close,
		edition
	}: {
		close: () => void;
		edition: Edition;
	} = $props();

	let aiPrompt: string = $state('');

	onMount(() => {});
</script>

<div
	class="bg-secondary border-color border rounded-2xl w-[800px] h-[700px] shadow-2xl shadow-black flex flex-col relative overflow-hidden"
	transition:slide
>
	<!-- Close button -->
	<button
		class="w-8 h-8 rounded-full hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-all duration-200 text-secondary hover:text-primary absolute top-4 right-4 z-10 cursor-pointer"
		onclick={close}
	>
		<span class="material-icons text-lg">close</span>
	</button>

	<p>
		You can ask AI to translate all the subtitles of your videos by trimming the existings
		translations of the {edition.author} translation.
	</p>

	<p>
		Please copy the prompt below and paste it in <span class="text-blue-300">
			<ClickableLink url="https://gemini.com" label="gemini.com" /> (it is as far as I know the best
			AI for this task)
		</span>
	</p>

	<input type="text" bind:value={aiPrompt} />
</div>
