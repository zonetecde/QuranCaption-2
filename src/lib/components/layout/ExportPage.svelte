<script lang="ts">
	import { onMount } from 'svelte';
	import VideoPreview from '../preview/VideoPreview.svelte';
	import Timeline from '../timeline/Timeline.svelte';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import { open as openLink } from '@tauri-apps/api/shell';
	import { fullScreenPreview } from '$lib/stores/LayoutStore';

	onMount(() => {
		document.onkeydown = onKeyDown;
	});

	function onKeyDown(key: any) {
		// if ctrl + k, play the video and start obs recording
		if (key.ctrlKey && key.keyCode === 75) {
			spaceBarPressed.set(true);
		}
	}
</script>

<div class={$fullScreenPreview ? 'absolute inset-0 z-50' : 'w-full h-full'}>
	<VideoPreview hideControls={$fullScreenPreview} />
</div>

<div class={'-mt-16 ' + ($fullScreenPreview ? 'invisible' : '')}>
	<Timeline useInPlayer={!$fullScreenPreview} />
</div>

{#if !$fullScreenPreview}
	<section class="absolute inset-20">
		<div class="w-full h-full flex items-center justify-center">
			<div
				class="w-[500px] h-[450px] bg-[#2f2d35] bg-opacity-90 hover:bg-opacity-100 duration-100 p-3 rounded-lg border-2 border-[#19181d]"
			>
				<h1 class="text-center text-lg">How to save the video :</h1>
				<br />
				<p style="color: white;">
					1. Start OBS (or download it from <button
						class="text-blue-400"
						on:click={() => openLink('https://www.obsproject.com')}>obsproject.com</button
					>)
				</p>
				<p style="color: white;">
					2. Add a new Source by selecting <code style="color: yellow;">Record a window</code> and choosing
					QuranCaption 2
				</p>
				<p style="color: white;">
					3. In OBS, go to File -> Settings -> Keyboard Shortcuts and set the <code
						style="color: yellow;">Start Recording</code
					>
					and
					<code style="color: yellow;">Stop Recording</code> keys to
					<code style="color: yellow;">CTRL + K</code>
				</p>
				<p style="color: white;">
					4. Press <code style="color: yellow;">F11</code> in QuranCaption 2 to enter full screen mode
				</p>
				<p style="color: white;">
					5. Adjust the video size in OBS (hold ALT if you need to crop the recording size)
				</p>
				<p style="color: white;">
					6. Press <code style="color: yellow;">CTRL + K</code> while the QuranCaption window is focused
					to start recording, and press it again to stop recording
				</p>

				<h1 class="mt-10 text-center text-xl font-bold">
					Thank you for using QuranCaption 2 !<br /><span class="text-base font-sans">
						You can make a donation by clicking
						<button
							class="text-blue-400"
							on:click={() => {
								openLink('https://ko-fi.com/zonetecde');
							}}>here</button
						>
						{'<3'}
					</span>
				</h1>
			</div>
		</div>
	</section>
{/if}
