<script lang="ts">
	import Settings, { SettingsTab } from '$lib/classes/Settings.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { slide } from 'svelte/transition';
	import ShortcutsManager from './ShortcutsManager.svelte';
	import { onMount } from 'svelte';
	import About from './About.svelte';

	let {
		resolve
	}: {
		resolve: (result: boolean) => void;
	} = $props();
</script>

<div
	class="bg-secondary border border-color rounded-2xl w-[800px] max-w-[94vw] h-[640px] p-0 shadow-2xl shadow-black/50 flex flex-col relative overflow-hidden"
	transition:slide
>
	<!-- Header -->
	<div
		class="bg-gradient-to-r from-accent to-bg-accent px-6 py-5 border-b border-color flex items-center justify-between gap-4"
	>
		<div class="flex items-center gap-4">
			<div
				class="w-12 h-12 bg-accent-primary rounded-full flex items-center justify-center shadow-md"
			>
				<span class="material-icons text-black text-xl">settings</span>
			</div>
			<div>
				<h2 class="text-xl font-semibold text-primary">Settings</h2>
				<p class="text-sm text-thirdly">Customize your experience and shortcuts</p>
			</div>
		</div>

		<!-- Close btn -->
		<button
			class="w-10 h-10 rounded-full hover:bg-[rgba(255,255,255,0.06)] flex items-center justify-center transition-all duration-200 text-secondary hover:text-primary"
			onclick={() => resolve(false)}
		>
			<span class="material-icons text-lg">close</span>
		</button>
	</div>

	<!-- Body -->
	<div class="grid grid-cols-[220px_1fr] gap-0 flex-1 min-h-0">
		<!-- Sidebar -->
		<div class="bg-primary border-r border-color p-3 overflow-auto">
			<div class="flex flex-col gap-2">
				{#each [{ name: 'Shortcuts', tab: SettingsTab.SHORTCUTS, icon: 'keyboard' }, { name: 'Theme', tab: SettingsTab.THEME, icon: 'light_mode' }, { name: 'About', tab: SettingsTab.ABOUT, icon: 'info' }] as setting}
					<button
						class="flex items-center gap-3 text-sm px-3 py-2 rounded-lg w-full transition-colors duration-150 justify-start"
						class:selected={globalState.uiState.settingsTab === setting.tab}
						onclick={() => (globalState.uiState.settingsTab = setting.tab)}
					>
						<span class="material-icons text-accent-secondary">{setting.icon}</span>
						<span class="truncate">{setting.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Content -->
		<div class="p-6 overflow-auto">
			{#if globalState.uiState.settingsTab === SettingsTab.SHORTCUTS}
				<ShortcutsManager />
			{:else if globalState.uiState.settingsTab === SettingsTab.THEME}
				<!-- Simple theme placeholder, keep it épuré. -->
				<div class="space-y-4">
					<h3 class="text-lg font-medium text-primary">Theme</h3>
					<p class="text-sm text-thirdly">Select application theme and accent colors.</p>
					<!-- Exemple simple de réglage : -->
					<p>Coming soon...</p>
				</div>
			{:else if globalState.uiState.settingsTab === SettingsTab.ABOUT}
				<About />
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<div class="border-t border-color bg-primary px-6 py-4 flex items-center justify-end gap-3">
		<button
			class="px-4 py-2 rounded-md text-sm text-thirdly hover:bg-white/5 transition-colors"
			onclick={() => resolve(false)}
		>
			Cancel
		</button>

		<button
			class="btn-accent px-5 py-2.5 text-sm font-medium rounded-md shadow-lg hover:scale-[1.02] transition-all duration-150"
			onclick={() => {
				Settings.save();
				resolve(true);
			}}
		>
			Apply and Close
		</button>
	</div>
</div>

<style>
	/* Override for the small icon color in sidebar */
	.material-icons.text-accent-secondary {
		color: var(--accent-primary);
	}

	@keyframes modalSlideIn {
		from {
			opacity: 0;
			transform: scale(0.98) translateY(-8px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.btn-accent:hover {
		box-shadow: 0 8px 30px rgba(17, 24, 39, 0.18);
	}
</style>
