<script lang="ts">
	import { latinNumberToArabic } from '$lib/functions/Arabic';
	import { millisecondsToSubtitlesTimeFormat } from '$lib/functions/Formatter';
	import { currentProject, downloadYoutubeChapters } from '$lib/stores/ProjectStore';
	import toast from 'svelte-french-toast';

	let selectedTranslations: string[] = [];
	let translationsWithVerseNumber: string[] = [];
	let exportFileType: 'srt' | 'vtt' | 'json' = 'srt';
	let useQPCV2Format = false;
	let qpcv2Quran: any = undefined;

	$: if (useQPCV2Format && qpcv2Quran === undefined) {
		// Load the json file containing the QPC V2 format
		fetch('/quran/QPC_V2.json').then((response) => {
			if (response.ok) {
				response.json().then((data) => {
					qpcv2Quran = data;
				});
			} else {
				toast.error('Error loading the QPC V2 format file.');
			}
		});
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

		let contentFile = '';

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
					if (verse.isEmpty || verse.firstWordInVerse === -1 || verse.lastWordInVerse === -1)
						return;

					contentFile += `${i}\n`;
					contentFile += `${millisecondsToSubtitlesTimeFormat(verse.start)} --> ${millisecondsToSubtitlesTimeFormat(verse.end)}\n`;

					if (selectedTranslations.includes('Arabic')) {
						contentFile += getArabicText(verse);
					}

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

					if (selectedTranslations.includes('Arabic')) contentFile += getArabicText(verse);

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
							verseContent.text = getArabicText(verse).trim();
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

	function getArabicText(verse: any) {
		let contentFile = '';
		if (useQPCV2Format) {
			let str: string = '';
			for (let i = verse.firstWordInVerse + 1; i <= verse.lastWordInVerse + 1; i++) {
				const key = `${verse.surahNumber}:${verse.verseNumber}:${i}`;
				if (qpcv2Quran[key]) {
					str += qpcv2Quran[key].text + ' ';
				} else {
					console.warn(`Missing key in QPC V2 JSON: ${key}`);
				}
			}

			if (translationsWithVerseNumber.includes('Arabic') && verse.isLastWordInVerse) {
				str +=
					qpcv2Quran[
						verse.surahNumber + ':' + verse.verseNumber + ':' + (verse.lastWordInVerse + 2)
					].text;
			}

			contentFile += `${str}\n`;
		} else {
			contentFile += `${verse.arabicText} ${translationsWithVerseNumber.includes('Arabic') && verse.isLastWordInVerse ? latinNumberToArabic(verse.verseNumber.toString()) : ''}\n`;
		}
		return contentFile;
	}
</script>

<div class="w-full h-full flex flex-col max-w-[800px] mx-auto">
	<div class="mb-6 mt-3">
		<p class="text-white mb-2 font-medium">Choose the format of the subtitles:</p>
		<select
			class="bg-[#383737] text-white px-4 py-2 rounded w-full outline-none border border-gray-800 focus:border-gray-500 transition-all"
			on:change={(event) => {
				//@ts-ignore
				exportFileType = event.target.value;
			}}
		>
			<option value="srt">SRT - SubRip Text Format</option>
			<option value="vtt">VTT - Web Video Text Tracks Format</option>
			<option value="json">JSON - JavaScript Object Notation</option>
		</select>
	</div>

	<div class="mb-4">
		<p class="text-white mb-3 font-medium">Choose what you want to include in your file:</p>

		<div class="bg-[#383737] rounded-lg overflow-hidden">
			{#each ['Arabic', ...$currentProject.projectSettings.addedTranslations] as translation, i}
				<div
					class="flex flex-wrap items-center py-3 px-4 {i % 2 === 0
						? 'bg-[#383737]'
						: 'bg-[#383737]'} border-b border-gray-600 last:border-b-0"
				>
					<div class="flex items-center">
						<input
							type="checkbox"
							id="translation-{i}"
							class="form-checkbox w-5 h-5 mr-3 accent-green-500"
							on:change={(event) => {
								//@ts-ignore
								if (event.target.checked) {
									selectedTranslations = [...selectedTranslations, translation];
								} else {
									selectedTranslations = selectedTranslations.filter((t) => t !== translation);
								}
							}}
						/>
						<label for="translation-{i}" class="text-white font-medium">{translation}</label>
					</div>

					<div class="flex flex-row items-center gap-4 mt-2 sm:mt-0">
						{#if translation === 'Arabic'}
							<label class="flex items-center text-white">
								<input
									type="checkbox"
									class="form-checkbox w-4 h-4 mr-2 accent-blue-500"
									disabled={!selectedTranslations.includes(translation)}
									bind:checked={useQPCV2Format}
								/>
								<span>Use QPC V2 format</span>
							</label>
						{/if}
						<label class="flex items-center text-white">
							<input
								type="checkbox"
								class="form-checkbox w-4 h-4 mr-2 accent-blue-500"
								disabled={!selectedTranslations.includes(translation)}
								on:change={(event) => {
									//@ts-ignore
									if (event.target.checked) {
										translationsWithVerseNumber = [...translationsWithVerseNumber, translation];
									} else {
										translationsWithVerseNumber = translationsWithVerseNumber.filter(
											(t) => t !== translation
										);
									}
								}}
							/>
							<span>Include verse number</span>
						</label>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<div class="mt-6 text-center">
	<button
		class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center mx-auto"
		on:click={exportSubtitles}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-5 w-5 mr-2"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
			/>
		</svg>
		Export Subtitles
	</button>
	<p class="text-gray-400 text-sm mt-2">Files will be downloaded to your computer</p>
</div>
