<script lang="ts">
	import {
		addAITranslations,
		generateTranslationsPrompt
	} from '$lib/functions/AutomaticTranslationsUsingAI';
	import { showAITranslationPopup } from '$lib/stores/LayoutStore';
	import { open as openLink } from '@tauri-apps/api/shell';
	import { onMount } from 'svelte';

	let aiOutput = '';
	let startId: string = '-1';
	let endId: string = '-1';
	let prompt = '';
</script>

<div class="bg-[#1d1b1b] w-full flex flex-col px-6 pt-6 border-b-2 border-[#141313]">
	<h1 class="text-2xl font-bold text-white mb-4">
		AI Translation (selected language : {$showAITranslationPopup})
	</h1>

	<p class="text-md text-justify">
		Use AI to generate subtitle translations by copying existing ones.
	</p>

	<p class="text-sm text-justify mt-4">
		If your project has many subtitles and the AI cannot process them all at once, specify a range
		by entering start and end IDs. <br />Use -1 for the first or last subtitle. Subtitle IDs are
		shown at the top right of each subtitle input section.
	</p>
	<div class="gap-x-2 mt-4 w-full flex flex-row">
		<div class="flex flex-col">
			<div class="flex flex-row w-40 gap-x-2">
				<section class="w-full">
					<p class="text-xs text-justify">Start ID</p>
					<input
						type="text"
						class="border py-2 w-full border-gray-200 rounded-lg duration-100 text-sm bg-[#0e0d0d3f] px-2"
						placeholder="Start ID (-1 for first subtitle)"
						bind:value={startId}
					/>
				</section>
				<section class="w-full">
					<p class="text-xs text-justify">End ID</p>
					<input
						type="text"
						class="border py-2 w-full border-gray-200 rounded-lg duration-100 text-sm bg-[#0e0d0d3f] px-2"
						placeholder="End ID (-1 for last subtitle)"
						bind:value={endId}
					/>
				</section>
			</div>
			<!-- generate prompt button -->
			<button
				class="border py-2 border-gray-200 rounded-lg text-sm duration-100 bg-[#0e0d0d3f] w-40 h-10 mt-2"
				on:click={async () => {
					prompt = await generateTranslationsPrompt(Number(startId || '-1'), Number(endId || '-1'));
				}}>Generate Prompt</button
			>
		</div>

		<textarea
			class="border py-2 border-gray-200 rounded-lg duration-100 text-sm bg-[#0e0d0d3f] w-full px-2 mt-2"
			placeholder="AI prompt will appear here"
			bind:value={prompt}
			readonly
		></textarea>
	</div>

	<br />

	<p class="text-sm text-justify">
		Once you have copied the prompt, go to <button
			class="text-blue-300"
			on:click={() => {
				openLink('https://grok.com');
			}}>Grok.com</button
		> and paste it there. (I found that it is currently the best AI for this task, but you can use any
		AI you prefer.)
	</p>
	<p class="text-sm text-justify">Then, paste what Grok provided here:</p>

	<div class="flex flex-col mt-4">
		<textarea
			class="border py-2 border-gray-200 rounded-lg duration-100 text-sm bg-[#0e0d0d3f] w-full px-2 border-b-0 rounded-b-none outline-none"
			placeholder="Paste AI's response here"
			bind:value={aiOutput}
		></textarea>
		<button
			class="border py-2 border-gray-200 rounded-lg text-sm duration-100 bg-[#0e0d0d3f] w-full border-t-0 rounded-t-none"
			id="fetch-translations-button"
			on:click={() => {
				addAITranslations(aiOutput);
			}}>Add the AI-generated translations</button
		>
	</div>

	<button class="ml-2 px-4 py-2 rounded mt-3" on:click={() => showAITranslationPopup.set(undefined)}
		>Close</button
	>
</div>
