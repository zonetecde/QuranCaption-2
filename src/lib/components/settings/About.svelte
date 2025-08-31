<script lang="ts">
	import { VersionService } from '$lib/services/VersionService.svelte';
	import { stat } from '@tauri-apps/plugin-fs';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { onMount } from 'svelte';
	import toast from 'svelte-5-french-toast';

	let version = $state('');
	onMount(async () => {
		version = await VersionService.getAppVersion();
	});
</script>

<div class="space-y-4">
	<h3 class="text-lg font-medium text-primary">About</h3>
	<p>
		Quran Caption is an open-source project for creating videos of Quran recitation. <br /><br />The
		software is completely free. I ask Allah to increase my provision (rizq) and to bless everyone
		who contributes to this project—whether through donations, feedback, or by using and sharing it.
		May Allah reward you all.
		<br /><br />
		This software was developed by Rayane STASZEWSKI with support from the
		<button
			class="text-blue-400 underline"
			onclick={() => openUrl('https://discord.gg/Hxfqq2QA2J')}
		>
			Quran Caption community
		</button>. Collaborations and sponsorships are welcome to help improve and maintain the project.
	</p>

	<p>Version {version}</p>
</div>
