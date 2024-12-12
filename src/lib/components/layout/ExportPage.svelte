<script lang="ts">
	import { onMount } from 'svelte';
	import VideoPreview from '../preview/VideoPreview.svelte';
	import Timeline from '../timeline/Timeline.svelte';
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import { open as openLink } from '@tauri-apps/api/shell';
	import { fullScreenPreview } from '$lib/stores/LayoutStore';
	import { currentProject, downloadYoutubeChapters } from '$lib/stores/ProjectStore';
	import { latinNumberToArabic, millisecondsToSubtitlesTimeFormat } from '$lib/ext/Utilities';
	import toast from 'svelte-french-toast';

	let outputType: undefined | 'video' | 'subtitles' = undefined;

	let selectedTranslations: string[] = [];
	let translationsWithVerseNumber: string[] = [];
	let exportFileType: 'srt' | 'vtt' | 'json' = 'srt';

	onMount(() => {
		document.onkeydown = onKeyDown;
	});

	function onKeyDown(key: any) {
		// If the user presses CTRL + K, we want to start the recording (obs hotkey)
		if (key.ctrlKey && key.keyCode === 75) {
			// In Xms to wait for OBS to start recording
			setTimeout(() => {
				spaceBarPressed.set(true);
			}, 700);
		}
	}

	/**
	 * Export the subtitles in the selected format
	 */
	function exportSubtitles() {
		if (
			(exportFileType === 'vtt' || exportFileType === 'srt') &&
			selectedTranslations.length === 0
		) {
			toast.error(
				'Please select at least the Arabic text or one translation to export the subtitles.'
			);
			return;
		}

		let contentFile: string = '';

		let verses = $currentProject.timeline.subtitlesTracks[0].clips.map((subtitleClip) => {
			return {
				isEmpty: subtitleClip.isSilence || subtitleClip.text === '' || subtitleClip.verse === -1,
				verseNumber: subtitleClip.verse,
				arabicText: subtitleClip.text,
				translations: subtitleClip.translations,
				start: subtitleClip.start, // milliseconds
				end: subtitleClip.end, // milliseconds
				firstWordInVerse: subtitleClip.firstWordIndexInVerse,
				lastWordInVerse: subtitleClip.lastWordIndexInVerse,
				isFirstWordInVerse: subtitleClip.firstWordIndexInVerse === 0,
				isLastWordInVerse: subtitleClip.isLastWordInVerse,
				surahNumber: subtitleClip.surah
			};
		});

		switch (exportFileType) {
			case 'srt':
				// SRT format
				let i = 1;

				verses.forEach((verse) => {
					if (verse.isEmpty) return;

					contentFile += `${i}\n`;
					contentFile += `${millisecondsToSubtitlesTimeFormat(verse.start)} --> ${millisecondsToSubtitlesTimeFormat(verse.end)}\n`;

					if (selectedTranslations.includes('Arabic'))
						contentFile += `${verse.arabicText} ${translationsWithVerseNumber.includes('Arabic') && verse.isLastWordInVerse ? latinNumberToArabic(verse.verseNumber.toString()) : ''}\n`;

					for (let key in verse.translations) {
						if (selectedTranslations.includes(key))
							contentFile += `${translationsWithVerseNumber.includes(key) && verse.isFirstWordInVerse ? verse.verseNumber + '. ' : ''}${verse.translations[key].trim()}\n`;
					}

					contentFile += '\n';

					i++;
				});
				break;
			case 'vtt':
				// VTT format
				contentFile = 'WEBVTT\n\n';

				let index = 1;
				verses.forEach((verse) => {
					if (verse.isEmpty) return;

					contentFile += `${index}\n`;
					contentFile += `${millisecondsToSubtitlesTimeFormat(verse.start)}.000 --> ${millisecondsToSubtitlesTimeFormat(verse.end)}.000\n`;

					if (selectedTranslations.includes('Arabic'))
						contentFile += `${verse.arabicText} ${translationsWithVerseNumber.includes('Arabic') && verse.isLastWordInVerse ? latinNumberToArabic(verse.verseNumber.toString()) : ''}\n`;

					for (let key in verse.translations) {
						if (selectedTranslations.includes(key))
							contentFile += `${translationsWithVerseNumber.includes(key) && verse.isFirstWordInVerse ? verse.verseNumber + '. ' : ''}${verse.translations[key].trim()}\n`;
					}

					contentFile += '\n';

					index++;
				});

				break;
			case 'json':
				// JSON format
				let jsonContent = verses
					.filter((verse) => !verse.isEmpty)
					.map((verse) => {
						let verseContent: any = {
							verse: verse.verseNumber,
							surah: verse.surahNumber,
							startMs: parseFloat(verse.start.toFixed(5)),
							endMs: parseFloat(verse.end.toFixed(5)),
							firstWordIndex: verse.firstWordInVerse,
							lastWordIndex: verse.lastWordInVerse,
							translations: verse.translations
						};

						if (selectedTranslations.includes('Arabic')) {
							verseContent.text =
								verse.arabicText +
								(translationsWithVerseNumber.includes('Arabic') && verse.isLastWordInVerse
									? ' ' + latinNumberToArabic(verse.verseNumber.toString())
									: '');
						}

						for (let key in verse.translations) {
							if (selectedTranslations.includes(key)) {
								verseContent.translations[key] =
									(translationsWithVerseNumber.includes(key) && verse.isFirstWordInVerse
										? verse.verseNumber + '. '
										: '') + verse.translations[key].trim();
							}
						}

						return verseContent;
					});

				contentFile = JSON.stringify(jsonContent, null, 2);
				break;
		}

		// Download the file
		const element = document.createElement('a');
		const file = new Blob([contentFile.trim()], { type: 'text/plain' });
		element.href = URL.createObjectURL(file);
		element.download = $currentProject.name + '_subtitles.' + exportFileType.toLowerCase();
		document.body.appendChild(element);
		element.click();
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
				class="w-[500px] relative h-[575px] bg-[#2f2d35] bg-opacity-95 hover:bg-opacity-100 duration-100 p-3 rounded-lg border-2 border-[#19181d]"
			>
				{#if outputType === undefined}
					<h1 class="text-center text-lg font-bold">Export</h1>

					<section class="h-full flex items-center flex-col justify-center pb-24">
						<p class="mt-28 text-center">Please select what you want to export :</p>

						<div class="flex justify-center mt-4 flex-wrap gap-y-3">
							<button
								class="bg-green-700 hover:bg-green-900 duration-100 text-white font-bold py-2 px-4 rounded"
								on:click={() => (outputType = 'video')}
							>
								Export the video
							</button>
							<button
								class="bg-green-700 hover:bg-green-900 duration-100 text-white font-bold py-2 px-4 rounded ml-2"
								on:click={() => (outputType = 'subtitles')}
							>
								Export the subtitles
							</button>
							<button
								class="bg-green-700 hover:bg-green-900 duration-100 text-white font-bold py-2 px-4 rounded ml-2"
								on:click={() => downloadYoutubeChapters()}
							>
								Export as YouTube chapters
							</button>
							<button
								class="bg-green-700 hover:bg-green-900 duration-100 text-white font-bold py-2 px-4 rounded ml-2"
								on:click={() => openLink('https://qurancaption-project.vercel.app/documentation')}
							>
								Open the online documentation
							</button>
						</div>

						<h1 class="mt-10 text-center text-xl font-bold">
							Thank you for using Quran Caption !<br /><span class="text-base font-sans">
								You can make a donation by clicking
								<button
									class="text-blue-400"
									on:click={() => {
										openLink('https://ko-fi.com/vzero');
									}}>here</button
								>
								{'<3'}
							</span>
						</h1>

						<p class="mt-20">
							Need some help ? Take a look to the online <a
								href="https://qurancaption-project.vercel.app/documentation"
								target="_blank"
								class="text-blue-400">documentation</a
							> !
						</p>
					</section>
				{:else if outputType === 'video'}
					<h1 class="text-center text-lg">How to save the video :</h1>
					<br />
					<p>Follow these steps to export your video:</p>

					<ol class="ml-6 list-disc">
						<li>
							Open <button
								on:click={() => openLink('https://obsproject.com/')}
								class="text-blue-400">OBS Studio</button
							>
							and click the <code style="color: yellow;">`+`</code> button in the
							<code style="color: yellow;">`Sources`</code> section.
						</li>
						<li>
							Select <code style="color: yellow;">`Window Capture`</code> from the list of options,
							and select <code style="color: yellow;">`Windows 10`</code> as the capture method.
						</li>
						<li>From the window selection menu, choose the Quran Caption window.</li>
						<li>
							Click <code style="color: yellow;">`OK`</code> to add the Quran Caption window to your
							OBS Studio scene.
						</li>
						<li>
							On Quran Caption, press
							<code style="color: yellow;">`F11`</code> to enter fullscreen mode. Make sure the cursor
							of the timeline is at the start of the video.
						</li>
						<li>
							In OBS Studio, click the <code style="color: yellow;">`Start Recording`</code> button,
							then immediately press the <code style="color: yellow;">`space bar`</code> in Quran Caption
							to start playing the video.
						</li>
						<li>
							When the video finishes playing, click the <code style="color: yellow;"
								>`Stop Recording`</code
							> button in OBS Studio to stop the recording.
						</li>
					</ol>

					<p class="mt-3">
						<strong>Note:</strong> Don't forget to mute the sound of your microphone in OBS Studio
						by clicking speaker icon below <code style="color: yellow;">`Mic/Aux`</code> in the audio
						mixer section.
					</p>
				{:else if outputType === 'subtitles'}
					<div class="w-full h-full flex flex-col">
						<h1 class="text-lg text-center font-bold">Export the subtitles</h1>

						<p class="mt-6">Choose the format of the subtitles :</p>
						<!-- input to select the subtitles file type -->
						<select
							class="bg-white bg-opacity-15 w-[200px] px-1 outline-none mt-2"
							on:change={(event) => {
								//@ts-ignore
								exportFileType = event.target.value;
							}}
						>
							<option class="bg-gray-800" value="srt">SRT</option>
							<option class="bg-gray-800" value="vtt">VTT</option>
							<option class="bg-gray-800" value="json">JSON</option>
						</select>

						<p class="mt-6">Choose what you want to include in your file :</p>

						<div>
							{#each ['Arabic', ...$currentProject.projectSettings.addedTranslations] as translation}
								<label class="flex items-center mt-2 border-y border-gray-500">
									<div>
										<label class="ml-2"
											><input
												type="checkbox"
												class="form-checkbox"
												on:change={(event) => {
													//@ts-ignore
													if (event.target.checked) {
														selectedTranslations = [...selectedTranslations, translation];
													} else {
														selectedTranslations = selectedTranslations.filter(
															(t) => t !== translation
														);
													}
												}}
											/>
											{translation}</label
										>
									</div>
									<div class="ml-auto">
										<label class=""
											><input
												type="checkbox"
												class="form-checkbox"
												disabled={!selectedTranslations.includes(translation)}
												on:change={(event) => {
													//@ts-ignore
													if (event.target.checked) {
														translationsWithVerseNumber = [
															...translationsWithVerseNumber,
															translation
														];
													} else {
														translationsWithVerseNumber = translationsWithVerseNumber.filter(
															(t) => t !== translation
														);
													}
												}}
											/> Include verse number</label
										>
									</div>
								</label>
							{/each}
						</div>

						<button
							class="bg-green-700 hover:bg-green-900 duration-100 text-white font-bold py-2 px-4 mx-auto mt-auto rounded mb-4"
							on:click={exportSubtitles}
						>
							Export
						</button>
					</div>
				{/if}

				{#if outputType !== undefined}
					<button class="absolute top-1 left-1" on:click={() => (outputType = undefined)}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-6"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
							/>
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</section>
{/if}
