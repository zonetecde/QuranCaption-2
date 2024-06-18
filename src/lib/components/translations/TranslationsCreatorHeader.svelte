<script lang="ts">
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	//@ts-ignore
	import { check_outros, group_outros, transition_out } from 'svelte/internal';
	import AddNewTranslationPopup from '$lib/components/translations/AddNewTranslationPopup.svelte';
	import { fade } from 'svelte/transition';
	import type { Edition } from '$lib/models/Edition';

	let translationToDelete: Edition | undefined = undefined;

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

	function handleTranslationHeaderClicked(lang: string) {
		// Confirm dialog pour suppression
		const edition = getEditionFromName(lang);
		translationToDelete = edition;
	}
</script>

<header class="flex flex-row bg-[#111d0e]">
	<div class="flex flex-row">
		{#each $currentProject.projectSettings.addedTranslations as lang, i}
			{@const edition = getEditionFromName(lang)}
			<button
				class={'bg-[#214627] text-white p-1 xl:p-2 flex gap-x-2 border-2 text-xs xl:text-base border-[#173619] hover:bg-[#b86461] duration-200 ' +
					(i === $currentProject.projectSettings.addedTranslations.length - 1
						? 'rounded-br-lg border-r-2'
						: 'border-r-0')}
				on:click={() => handleTranslationHeaderClicked(lang)}
				>{edition?.language} - {edition?.author}</button
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

{#if translationToDelete}
	<div class="absolute inset-0 backdrop-blur-sm z-50" transition:fade>
		<div class="w-full h-full flex items-center justify-center">
			<div
				class="w-[300px] h-[200px] bg-[#413f3f] border-4 border-[#161616] rounded-lg flex flex-col items-center justify-center gap-y-5 p-5 shadow-lg shadow-black"
			>
				<h1>
					Do you really want to delete the {translationToDelete.language} - {translationToDelete.author}
					translation?
				</h1>

				<button
					class="hover:font-bold w-28 py-1 rounded-lg border-2 border-black bg-[#161616]"
					on:click={() => {
						// Delete translation
						$currentProject.projectSettings.addedTranslations =
							$currentProject.projectSettings.addedTranslations.filter(
								(lang) => lang !== translationToDelete?.name
							);
						translationToDelete = undefined;
					}}>Yes</button
				>
				<button
					class="hover:font-bold w-28 -mt-3 py-1 rounded-lg border-2 border-black bg-[#161616]"
					on:click={() => {
						translationToDelete = undefined;
					}}>No</button
				>
			</div>
		</div>
	</div>{/if}
