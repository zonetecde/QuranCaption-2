<script lang="ts">
	import { millisecondsToHHMMSS } from '$lib/functions/Formatter';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getSurahName } from '$lib/stores/QuranStore';
	import { get } from 'svelte/store';

	export function downloadYoutubeChapters() {
		const _currentProject = get(currentProject);

		// first chapter should be 00:00:00, first surah name in the projet
		// then the rest of the chapters should be the surah names
		const chapters: {
			start: string;
			end: string;
			title: string;
		}[] = [];

		let lastChapterName = '';
		let i = 0;
		_currentProject.timeline.subtitlesTracks[0].clips.forEach((clip) => {
			if (clip.surah >= 1 && clip.surah <= 114) {
				const surahName = getSurahName(clip.surah);
				if (surahName !== lastChapterName) {
					chapters.push({
						start: millisecondsToHHMMSS(clip.start),
						end: _currentProject.timeline.subtitlesTracks[0].clips[i - 1]
							? millisecondsToHHMMSS(_currentProject.timeline.subtitlesTracks[0].clips[i - 1].end)
							: '00:00:00',
						title: surahName
					});
					lastChapterName = surahName;
				}
			}

			i++;
		});

		// first chapter should start at 00:00:00 even if there's a silence or basmallah
		if (chapters.length > 0) chapters[0].start = '00:00:00';

		// download as text :
		// 00:00:00 - Al-Fatihah
		// ...
		const a = document.createElement('a');
		const file = new Blob([chapters.map((c) => `${c.start} - ${c.title}`).join('\n')], {
			type: 'text/plain'
		});
		a.href = URL.createObjectURL(file);
		a.download = 'youtube chapters for ' + _currentProject.name + '.txt';
		a.click();
		URL.revokeObjectURL(a.href);
	}
</script>

<button
	class="w-full p-2 rounded-md bg-[#383737] border-gray-800 outline-none text-white"
	on:click={downloadYoutubeChapters}
>
	Download Youtube chapters
</button>
