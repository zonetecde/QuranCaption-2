<script>
	import Exporter from '$lib/classes/Exporter';
</script>

<div class="flex flex-col items-center mt-8">
	<button class="btn-accent px-6 py-3 font-medium" onclick={Exporter.exportProjectData}>
		Export Project Data
	</button>
	<p class="text-thirdly text-xs mt-2 text-center">
		Generate a JSON file containing your entire project. Non‑YouTube videos and audio files, and any
		cropped or trimmed YouTube videos, will not be included.
	</p>
</div>
