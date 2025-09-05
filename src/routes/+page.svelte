<script>
	import Home from '$lib/components/home/Home.svelte';
	import DonationFloatingButton from '$lib/components/misc/DonationFloatingButton.svelte';
	import ProjectEditor from '$lib/components/projectEditor/ProjectEditor.svelte';
	import TitleBar from '$lib/components/TitleBar.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import ShortcutService from '$lib/services/ShortcutService';
	import { discordService } from '$lib/services/DiscordService';
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-5-french-toast';

	onMount(async () => {
		// Init le gestionnaire de shortcuts
		ShortcutService.init();

		// Initialiser Discord Rich Presence
		try {
			await discordService.init();
			await discordService.setIdleState();
		} catch (e) {
			console.error("Erreur lors de l'initialisation de Discord Rich Presence :", e);
		}
	});
</script>

<Toaster />

<div class="flex flex-col h-screen overflow-hidden">
	<!-- Barre de titre fixe -->
	<TitleBar />

	<!-- Zone de contenu avec scroll -->
	<main class="flex-1 overflow-auto mt-10">
		{#if globalState.currentProject === null}
			<Home />
		{:else}
			<ProjectEditor />
		{/if}
		<DonationFloatingButton />
	</main>
</div>
