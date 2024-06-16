<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
	import Toggle from '../../general/Toggle.svelte';
	import GlobalSubtitleSettings from './GlobalSubtitleSettings.svelte';
	import LangSubtitleSettings from './LangSubtitleSettings.svelte';

	let selectedSubtitleLanguage = 'global';
</script>

<div class="w-full h-full flex flex-col pt-3 px-3 gap-y-5 bg-[#1f1f1f] overflow-y-scroll">
	<!-- Tailwind switch -->
	<h2 class="text-lg font-bold text-center">Subtitle Settings</h2>

	<select
		class="w-full bg-transparent border-2 border-slate-500 p-1 rounded-lg outline-none"
		bind:value={selectedSubtitleLanguage}
	>
		<option class="bg-slate-800" value="global">Global</option>
		<option class="bg-slate-800" value="arabic">Arabic</option>
	</select>

	{#if selectedSubtitleLanguage === 'global'}
		<GlobalSubtitleSettings />
	{:else}
		<LangSubtitleSettings subtitleLanguage={selectedSubtitleLanguage} />
	{/if}
</div>
