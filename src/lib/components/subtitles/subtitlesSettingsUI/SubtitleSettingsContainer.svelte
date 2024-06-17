<script lang="ts">
	import { selectedSubtitlesLanguage } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { onMount } from 'svelte';
	import Toggle from '../../general/Toggle.svelte';
	import GlobalSubtitleSettings from './GlobalSubtitleSettings.svelte';
	import LangSubtitleSettings from './LangSubtitleSettings.svelte';
	import { editions, getEditionFromName } from '$lib/stores/QuranStore';

	let _selectedSubtitlesLanguage = $selectedSubtitlesLanguage;

	$: if (_selectedSubtitlesLanguage) {
		selectedSubtitlesLanguage.set(_selectedSubtitlesLanguage);
	}
</script>

<div class="w-full h-full flex flex-col pt-3 px-3 gap-y-5 bg-[#1f1f1f] overflow-y-scroll">
	<!-- Tailwind switch -->
	<h2 class="text-lg font-bold text-center">Subtitle Settings</h2>

	<select
		class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
		bind:value={_selectedSubtitlesLanguage}
	>
		<option class="bg-slate-300 text-black" value="global">Global</option>
		<option class="bg-slate-300 text-black" value="arabic">Arabic</option>

		{#if $editions}
			<!-- Ajoute tout les autres langages -->
			{#each $currentProject.projectSettings.addedTranslations as lang}
				{@const edition = getEditionFromName(lang)}
				<option class="bg-slate-300 text-black" value={lang}
					>{edition?.language + ' - ' + edition?.author}</option
				>
			{/each}
		{/if}
	</select>

	{#if _selectedSubtitlesLanguage === 'global'}
		<GlobalSubtitleSettings />
	{:else}
		<LangSubtitleSettings subtitleLanguage={_selectedSubtitlesLanguage} />
	{/if}
</div>
