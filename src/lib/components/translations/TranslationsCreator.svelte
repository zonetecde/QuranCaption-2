<script lang="ts">
	import { milisecondsToMMSS } from '$lib/classes/Timeline';
	import AddNewTranslationPopup from '$lib/components/translations/AddNewTranslationPopup.svelte';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	//@ts-ignore
	import { check_outros, group_outros, transition_out } from 'svelte/internal';

	function handleAddNewTranslationButtonClick() {
		const popup = new AddNewTranslationPopup({
			target: document.body,
			intro: true
		});

		popup.$on('close', () => {
			if (popup.$$.fragment && popup.$$.fragment.o) {
				group_outros();
				transition_out(popup.$$.fragment, 0, 0, () => {
					popup.$destroy();
				});
				check_outros();
			} else {
				popup.$destroy();
			}
		});
	}
</script>

<div class="bg-[#0f0f0f] w-full h-full overflow-y-auto flex flex-col">
	<header class="flex flex-row bg-[#0e2009]">
		<div class="flex flex-row">
			{#each $currentProject.projectSettings.addedTranslations as lang, i}
				{@const edition = getEditionFromName(lang)}
				<button
					class={'bg-[#214627] text-white p-2 flex gap-x-2 hover:bg-[#17311b] duration-100 border-2 border-[#173619] ' +
						(i === $currentProject.projectSettings.addedTranslations.length - 1
							? 'rounded-br-lg border-r-2'
							: 'border-r-0')}
					on:click={() => console.log('clicked')}>{edition?.language} - {edition?.author}</button
				>
			{/each}
		</div>

		<button
			class="bg-[#214627] text-white p-2 rounded-bl-lg flex gap-x-2 hover:bg-[#17311b] duration-100 ml-auto border-2 border-[#173619]"
			on:click={handleAddNewTranslationButtonClick}
			><svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="size-6"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
			</svg>
			Add a new translation</button
		>
	</header>

	<div class="mt-0">
		{#each $currentProject.timeline.subtitlesTracks[0].clips as subtitle}
			<div class="p-2 bg-[#1f1f1f] border-b-2 border-[#413f3f]">
				<div class="flex justify-between xl:items-center flex-col xl:flex-row w-full">
					<p class="text-xs xl:text-sm text-right xl:text-left">
						{milisecondsToMMSS(subtitle.start)} - {milisecondsToMMSS(subtitle.end)}
					</p>
					<p class="arabic text-right xl:max-w-[60%]">{subtitle.text}</p>
				</div>

				<div class="flex flex-col mt-1">
					{#each Object.keys(subtitle.translations) as translation}
						<p class="text-xs text-justify text-[#7cce79]">
							<span class="text-green-500 font-bold"
								>{getEditionFromName(translation)?.language}:</span
							>
							{subtitle.translations[translation]}
						</p>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
