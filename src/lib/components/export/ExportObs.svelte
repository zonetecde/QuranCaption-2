<script lang="ts">
	import { fullScreenPreview } from '$lib/stores/LayoutStore';
	import { open as openLink } from '@tauri-apps/api/shell';
</script>

<p>If you encounter issues with the video export, you can use OBS Studio to record your video.</p>

<ol class="ml-6 list-disc">
	<li>
		Open <button on:click={() => openLink('https://obsproject.com/')} class="text-blue-400"
			>OBS Studio</button
		>
		and click the <code style="color: yellow;">`+`</code> button in the
		<code style="color: yellow;">`Sources`</code> section.
	</li>
	<li>
		Select <code style="color: yellow;">`Window Capture`</code> from the list of options, and select
		<code style="color: yellow;">`Windows 10`</code> as the capture method.
	</li>
	<li>From the window selection menu, choose the Quran Caption window.</li>
	<li>
		Click <code style="color: yellow;">`OK`</code> to add the Quran Caption window to your OBS Studio
		scene.
	</li>
	<li>
		On Quran Caption, press
		<code style="color: yellow;">`F11`</code> to enter fullscreen mode. Make sure the cursor of the timeline
		is at the start of the video.
	</li>
	<li>
		In OBS Studio, click the <code style="color: yellow;">`Start Recording`</code> button, then
		immediately press the <code style="color: yellow;">`space bar`</code> in Quran Caption to start playing
		the video.
	</li>
	<li>
		When the video finishes playing, click the <code style="color: yellow;">`Stop Recording`</code> button
		in OBS Studio to stop the recording.
	</li>
</ol>

<p class="mt-3">
	<strong>Note:</strong> Don't forget to mute the sound of your microphone in OBS Studio by clicking
	speaker icon below <code style="color: yellow;">`Mic/Aux`</code> in the audio mixer section.
</p>

<!-- enter full screen -->
<button
	class="px-3 py-1 bg-[#2a3a37] hover:bg-[#3a4a47] rounded-md text-sm"
	on:click={() => {
		fullScreenPreview.set(true);
	}}
>
	Enter fullscreen
</button>
