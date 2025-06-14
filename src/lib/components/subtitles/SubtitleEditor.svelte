<script lang="ts">
	import { milisecondsToMMSS } from '$lib/models/Timeline';
	import {
		beginTimeReplacing,
		clearBeginAndEndTimeReplacing,
		clearSubtitleToEdit,
		currentlyEditedSubtitleId,
		endTimeReplacing,
		isRemplacingAlreadyAddedSubtitles
	} from '$lib/stores/LayoutStore';
	import { open as openLink } from '@tauri-apps/api/shell';
	import VersePicker from './VersePicker.svelte';
	import WordsSelector from './WordsSelector.svelte';

	let verseNumber = 1;
	let surahNumber = 1;
	let selectedTextId: number | null = null;

	let verseNumberInInput = 1;
	$: if (verseNumber) {
		// Lorsque le numéro de verset est changé dans `WordsSelector`, on le met à jour dans le picker
		verseNumberInInput = verseNumber;
	}
</script>

<div class="bg-black w-full h-full bg-opacity-40 overflow-y-auto flex flex-col relative">
	<div class="absolute left-1 top-1 group">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="size-7 opacity-80"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
			/>
		</svg>

		<div
			class="w-[600px] h-[425px] gap-x-5 grid-cols-2 bg-[#393a3f] rounded-lg text-sm p-4 hidden group-hover:grid border-2 border-black z-50"
		>
			<div class="">
				<h1 class="underline">How to create subtitles :</h1>

				<p>1. Select the surah and the verse that is being recited in the video</p>
				<p>
					2. Press <span class="text-yellow-500">`space`</span> to play the video and start selecting
					the words the reciter is saying using the `up` and `down` arrow keys or the mouse
				</p>
				<p>
					3. Press <span class="text-yellow-500">`enter`</span> when you have selected the words and
					that the reciter has stopped/when you want the subtitle to end
				</p>
				<p>4. Repeat the process until the video is finished</p>

				<p class="mt-2">
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					Still need help ? Open the
					<span
						class="text-blue-400 cursor-pointer"
						on:click={() =>
							openLink('https://qurancaption-project.vercel.app/documentation/captioning-videos')}
						>online documentation</span
					>
					for a video example or join
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<span
						class="text-blue-400 cursor-pointer"
						on:click={() => openLink('https://discord.gg/Hxfqq2QA2J')}>the Discord server</span
					> for more help.
				</p>
			</div>
			<div class="text-xs">
				<p class="underline">Additional tips:</p>
				<p>
					- Press <span class="text-yellow-500">`left`</span> and
					<span class="text-yellow-500">`right`</span> to move back and forth in the video.
				</p>
				<p>- Press <span class="text-yellow-500">`backspace`</span> to delete the last subtitle.</p>
				<p>
					- Press <span class="text-yellow-500">`s`</span> to add a silence subtitle for long pauses.
				</p>
				<p>
					- Press <span class="text-yellow-500">`b`</span> to add
					<span class="text-yellow-500">`Bismillahi rahmani rahim`</span>.
				</p>
				<p>
					- Press <span class="text-yellow-500">`a`</span> to add
					<span class="text-yellow-500">`A3oudhou billahi mina chaytani rajim`</span>.
				</p>
				<p>
					- Press <span class="text-yellow-500">`t`</span> to add custom text (e.g., for warnings or
					errors).
				</p>
				<p>- Press <span class="text-yellow-500">`v`</span> to select every word in the verse.</p>
				<p>- Press <span class="text-yellow-500">`e`</span> to edit the last subtitle.</p>
				<p>
					- Press <span class="text-yellow-500">`r`</span> to set the start word index to the last.
				</p>
				<p>
					- Press <span class="text-yellow-500">`c`</span> to set the end word index to the end of the
					verse.
				</p>
				<p>
					- Press <span class="text-yellow-500">`m`</span> to set the end time of the last subtitle to
					the current time.
				</p>
				<p>
					- Hold <span class="text-yellow-500">`PageUp`</span> or
					<span class="text-yellow-500">`PageDown`</span> to temporarily increase the reading speed.
				</p>
			</div>
		</div>
	</div>

	{#if $currentlyEditedSubtitleId}
		<!-- {@const currentlyEditedSubtitle = $currentProject.timeline.subtitlesTracks[0].clips.find(
			(clip) => clip.id === $currentlyEditedSubtitleId
		)} -->
		<div
			class="absolute bottom-0 left-0 px-5 py-2 bg-[#947a38] bg-opacity-65 z-40 border-4 rounded-tr-lg border-b-0 border-l-0 border-[#413f3f]"
		>
			<p>
				You are currently editing a subtitle.<br />Press Enter after selecting the word(s) that
				should replace the existing ones.
			</p>
			<button class="underline underline-offset-2 pt-1" on:click={() => clearSubtitleToEdit()}
				>Nervermind, stop editing this subtitle</button
			>
		</div>
	{/if}

	{#if $isRemplacingAlreadyAddedSubtitles}
		<div
			class="absolute bottom-0 left-0 px-5 py-2 bg-[#947a38] bg-opacity-65 z-40 border-4 rounded-tr-lg border-b-0 border-l-0 border-[#413f3f]"
		>
			<p>
				You are currently replacing already added subtitles.<br />
				{#if $beginTimeReplacing && $endTimeReplacing}
					Press Enter after selecting the word(s) that should replace the existing subtitles.
				{:else}
					Set the begin and end time of your new subtitle.
				{/if}

				<br />
				Begin time : {$beginTimeReplacing
					? milisecondsToMMSS($beginTimeReplacing)
					: 'press `d` to set'}<br />
				End time : {$endTimeReplacing ? milisecondsToMMSS($endTimeReplacing) : 'press `f` to set'}
			</p>

			<button
				class="underline underline-offset-2 pt-1"
				on:click={() => clearBeginAndEndTimeReplacing()}
				>Nervermind, stop replacing subtitles</button
			>
		</div>
	{/if}

	<VersePicker bind:verseNumber bind:surahNumber bind:verseNumberInInput bind:selectedTextId />

	<WordsSelector bind:verseNumber bind:surahNumber bind:selectedTextId />
</div>
