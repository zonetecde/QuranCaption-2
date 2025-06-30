<script lang="ts">
	import DonationFloatingButton from '$lib/components/misc/DonationFloatingButton.svelte';
	import { onMount } from 'svelte';
	import '../app.css';
	import { globalState } from '$lib/runes/main.svelte';
	import { projectService } from '$lib/services/ProjectService';
	import { Toaster } from 'svelte-5-french-toast';
	import TitleBar from '$lib/components/projectEditor/TitleBar.svelte';

	let { children } = $props();

	onMount(async () => {
		// Récupère les projets de l'utilisateur au chargement de l'application
		await projectService.loadUserProjectsDetails();
	});
</script>

<Toaster />

<TitleBar />

{@render children()}

<DonationFloatingButton />
