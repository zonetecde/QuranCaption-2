<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	//@ts-ignore
	import { check_outros, group_outros, transition_out } from 'svelte/internal';
	import AddNewTranslationPopup from '$lib/components/translations/AddNewTranslationPopup.svelte';

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

<header class="flex flex-row bg-[#111d0e]">
	<div class="flex flex-row">
		{#each $currentProject.projectSettings.addedTranslations as lang, i}
			{@const edition = getEditionFromName(lang)}
			<button
				class={'bg-[#214627] text-white p-1 xl:p-2 flex gap-x-2 hover:bg-[#17311b] duration-100 border-2 text-xs xl:text-base border-[#173619] ' +
					(i === $currentProject.projectSettings.addedTranslations.length - 1
						? 'rounded-br-lg border-r-2'
						: 'border-r-0')}
				on:click={() => console.log('clicked')}>{edition?.language} - {edition?.author}</button
			>
		{/each}
	</div>

	<button
		class="bg-[#214627] text-white p-1 xl:p-2 rounded-bl-lg flex gap-x-2 hover:bg-[#17311b] duration-100 ml-auto border-2 text-xs xl:text-base border-[#173619]"
		on:click={handleAddNewTranslationButtonClick}
		><svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="size-4 xl:size-6"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
		</svg>
		Add a new translation</button
	>
</header>
