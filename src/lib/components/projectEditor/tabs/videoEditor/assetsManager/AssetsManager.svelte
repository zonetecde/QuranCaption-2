<script>
	import DownloadFromYouTubeSection from './DownloadFromYouTubeSection.svelte';
	import ProjectAssetSection from './ProjectAssetSection.svelte';
</script>

<div
	class="bg-secondary h-full border border-color rounded-lg py-6 px-2 space-y-6 relative overflow-hidden"
>
	<!-- En-tête avec icône -->
	<div class="flex gap-x-2 items-center justify-center mb-6">
		<span class="material-icons text-accent text-xl">movie</span>
		<h2 class="text-xl font-bold text-primary">Video Editor</h2>
	</div>

	<ProjectAssetSection />
	<DownloadFromYouTubeSection />
</div>
