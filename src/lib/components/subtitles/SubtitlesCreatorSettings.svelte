<script lang="ts">
	import {
		showWordByWordTranslation,
		showWordByWordTransliteration
	} from '$lib/stores/LayoutStore';
</script>

<label class="absolute left-1.5 bottom-1.5 opacity-40 text-md hover:opacity-100">
	<input type="checkbox" bind:checked={$showWordByWordTranslation} />
	<span class="ml-0.5">Show words translation</span>
</label>
<label class="absolute left-1.5 bottom-8 opacity-40 text-md hover:opacity-100">
	<input type="checkbox" bind:checked={$showWordByWordTransliteration} />
	<span class="ml-0.5">Show words transliteration</span>
</label>
