<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';

	const styles = $derived(() => {
		return globalState.currentProject!.content.videoStyle.styles;
	});
</script>

<div
	class="bg-secondary h-full border border-color rounded-lg py-6 px-2 space-y-6 relative overflow-hidden"
>
	<!-- En-tête avec icône -->
	<div class="flex gap-x-2 items-center justify-center">
		<span class="material-icons text-accent text-xl">auto_fix_high</span>
		<h2 class="text-xl font-bold text-primary">Video Style</h2>
	</div>
</div>
