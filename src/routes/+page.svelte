<script>
	import Home from '$lib/components/home/Home.svelte';
	import DonationFloatingButton from '$lib/components/misc/DonationFloatingButton.svelte';
	import ProjectEditor from '$lib/components/projectEditor/ProjectEditor.svelte';
	import TitleBar from '$lib/components/TitleBar.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import ShortcutService from '$lib/services/ShortcutService';
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-5-french-toast';

	onMount(() => {
		// Init le gestionnaire de shortcuts
		ShortcutService.init();

		// got to /exporter-stable?id=1756049194288261
		// redirect to /exporter-stable with id in query params
		// const urlParams = new URLSearchParams(window.location.search);
		// urlParams.set('id', '1756066859595278');
		// window.location.href = `/exporter-stable?${urlParams.toString()}`;

		/*

		Idée pour l'exportation:::
		Je prend la première image jusqu'à la fin du premier fade apparaissant. 
		Puis deuxieme image contient tout jusqu'au debut du deuxieme fade (opacité encore 1). Trosieme image contient tout jusqu'à la fin du  fade sortant (img sans le texte normalement). Quatrieme image contient jusquà la fin du fade apparaissant.

		puis je combine tout ça en une vidéo avec des transitions crossfade entre chaque image.
		
		*/
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
