<script lang="ts">
	import { Project, ProjectContent, ProjectDetail } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { ProjectService } from '$lib/services/ProjectService';
	import { onMount } from 'svelte';
	import toast from 'svelte-5-french-toast';
	import AutocompleteInput from '$lib/components/misc/AutocompleteInput.svelte';
	import type Reciter from '$lib/classes/Reciter';
	import RecitersManager from '$lib/classes/Reciter';

	let { close } = $props();
</script>

<div
	class="bg-secondary border-color border rounded-2xl w-[700px] shadow-2xl shadow-black flex flex-col relative"
>
	<!-- Header with gradient background -->
	<div class="bg-gradient-to-r from-accent to-bg-accent px-6 py-6 border-color">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<div
					class="w-12 h-12 bg-accent-primary rounded-full flex items-center justify-center shadow-lg"
				>
					<span class="material-icons text-black text-xl">bolt</span>
				</div>
				<div>
					<h2 class="text-2xl font-bold text-primary">Welcome to Quran Caption</h2>
					<p class="text-sm text-thirdly">Data Migration Tool</p>
				</div>
			</div>

			<!-- Close button -->
			<button
				class="w-10 h-10 rounded-full hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-all duration-200 text-secondary hover:text-primary group cursor-pointer"
				onclick={close}
			>
				<span class="material-icons text-lg group-hover:rotate-90 transition-transform duration-200"
					>close</span
				>
			</button>
		</div>

		<div class="flex flex-col mt-3">
			<p>
				Good news! We found your Quran Caption V2 data. Would you like to import all your projects
				to Quran Caption V3?
			</p>
		</div>
	</div>
</div>
