<script lang="ts">
	import Settings, { SettingsTab } from '$lib/classes/Settings.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { slide } from 'svelte/transition';
	import ShortcutsManager from './ShortcutsManager.svelte';

	let {
		resolve
	}: {
		resolve: (result: boolean) => void;
	} = $props();
</script>

<div
	class="bg-secondary border border-color rounded-2xl w-[800px] max-w-[90vw] h-[600px] p-6 shadow-2xl shadow-black/50
	       flex flex-col relative backdrop-blur-sm"
	transition:slide
>
	<!-- Header with icon -->
	<div class="flex items-center gap-3 mb-4">
		<div class="flex items-center justify-center w-10 h-10 bg-accent rounded-full">
			<span class="material-icons text-lg text-accent">settings</span>
		</div>
		<h2 class="text-lg font-semibold text-primary">Settings</h2>
	</div>

	<!-- Divider -->
	<div class="w-full h-px bg-gradient-to-r from-transparent via-border-color to-transparent"></div>

	<!-- Content -->
	<div class="mb-5 grid-cols-[25%_75%] grid h-full">
		<div class="divide-y-2 border-color">
			<!-- Sidebar pour sélectionner le paramètre qu'on veut modifier -->
			{#each [{ name: 'Shortcuts', tab: SettingsTab.SHORTCUTS, icon: 'keyboard' }, { name: 'Theme', tab: SettingsTab.THEME, icon: 'light_mode' }] as setting}
				<button
					class=" py-2 w-full border-color cursor-pointer flex flex-row items-center px-3 gap-x-2 hover:bg-white/10 duration-100"
					onclick={() => (globalState.uiState.settingsTab = setting.tab)}
				>
					<span class="material-icons">{setting.icon}</span>
					{setting.name}</button
				>
			{/each}
		</div>
		<div class="border-l-2 border-color">
			{#if globalState.uiState.settingsTab === SettingsTab.SHORTCUTS}
				<ShortcutsManager />
			{:else if globalState.uiState.settingsTab === SettingsTab.THEME}{/if}
		</div>
	</div>

	<!-- Action buttons -->
	<div class="flex justify-end gap-3 mt-auto">
		<button
			class="btn-accent px-6 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-105
			       shadow-lg hover:shadow-xl"
			onclick={() => {
				Settings.save();
				resolve(true);
			}}
		>
			Apply and Close
		</button>
	</div>
</div>
