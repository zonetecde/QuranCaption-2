<script lang="ts">
	function downloadAssetFromYouTube() {}
</script>

<div class="flex mt-10">
	<h3 class="text-sm font-semibold text-gray-100 flex items-center">
		<span class="material-icons mr-2 text-lg text-indigo-400"> cloud_download </span>Download from
		YouTube
	</h3>
	<!-- dropdownicon -->
	<button class="flex items-center ml-auto cursor-pointer rotate-180">
		<span class="material-icons text-4xl! text-indigo-400">arrow_drop_down</span>
	</button>
</div>

<input
	type="text"
	class="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 mt-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
	placeholder="Enter YouTube video URL"
/>

<!-- choice : video or audio -->
<span class="text-sm text-gray-500 mt-3">Choose the type of media you want to download</span>

<div class="flex items-center mt-2">
	<input type="radio" id="audio" name="mediaType" value="audio" checked class=" mr-2" />
	<label for="audio" class="text-sm text-gray-100 cursor-pointer">Audio</label>
	<input type="radio" id="video" name="mediaType" value="video" class="mr-2 ml-4" />
	<label for="video" class="text-sm text-gray-100 cursor-pointer">Video</label>
</div>

<button
	class="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-md text-sm mt-4 cursor-pointer transition-colors duration-200"
	type="button"
	onclick={downloadAssetFromYouTube}
>
	<span class="material-icons mr-2 text-base">download</span>Download
</button>
