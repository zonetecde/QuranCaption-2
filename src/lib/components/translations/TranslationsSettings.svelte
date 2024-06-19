<script>
	import { onlyShowVersesThatNeedTranslationReview } from '$lib/stores/LayoutStore';
</script>

<div class="w-full h-full flex flex-col pt-3 px-3 gap-y-5 bg-[#1f1f1f] overflow-y-scroll">
	<!-- Tailwind switch -->
	<h2 class="text-lg font-bold text-center">Translations Settings</h2>

	<label>
		<input
			type="checkbox"
			class="form-checkbox h-5 w-5 text-green-500"
			bind:checked={$onlyShowVersesThatNeedTranslationReview}
		/>
		Only show verses that need translation review
	</label>
</div>
