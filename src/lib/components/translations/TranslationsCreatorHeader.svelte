<script lang="ts">
	import AddNewTranslationPopup from '$lib/components/translations/AddNewTranslationPopup.svelte';
	import { getVerseTranslation } from '$lib/functions/Translation';
	import type { Edition } from '$lib/models/Edition';
	import { showAITranslationPopup } from '$lib/stores/LayoutStore';
	import { currentProject } from '$lib/stores/ProjectStore';
	import { getEditionFromName } from '$lib/stores/QuranStore';
	import toast from 'svelte-french-toast';
	//@ts-ignore
	import { check_outros, group_outros, transition_out } from 'svelte/internal';
	import { fade } from 'svelte/transition';

	let selectedTranslation: Edition | undefined = undefined;

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
		// Action dialog
		const edition = getEditionFromName(lang);
		if (!edition) {
			toast.error(
				'This translation cannot be removed, as it is attached to a custom text. Yet, you can hide it in the video settings.'
			);
		}
		selectedTranslation = edition;
	}

	/**
	 * Reset the translation to the original one
	 * @param name The name of the translation to reset
	 */
	async function resetTranslation(name: string) {
		if (!name) return;

		await Promise.all(
			$currentProject.timeline.subtitlesTracks[0].clips.map(async (subtitleClip) => {
				subtitleClip.translations[name] = await getVerseTranslation(
					name,
					subtitleClip.surah,
					subtitleClip.verse
				);

				subtitleClip.hadItTranslationEverBeenModified = false;
			})
		);

		// force svelte to rerender
		$currentProject.projectSettings.addedTranslations =
			$currentProject.projectSettings.addedTranslations;

		toast.success('This translation has been successfully reset');
	}
</script>

<header class="flex flex-row bg-[#111d0e]">
	<div class="flex flex-row">
		{#each $currentProject.projectSettings.addedTranslations as lang, i}
			{@const edition = getEditionFromName(lang)}
			<section
				class={'flex flex-row items-center border-b-2 bg-[#214627] border-[#173619] ' +
					(i === $currentProject.projectSettings.addedTranslations.length - 1
						? 'rounded-br-lg border-r-2'
						: 'border-r-0')}
			>
				<button
					class="hover:bg-[#17311b] px-2 h-full bg-[#214627] duration-200 flex flex-col items-center justify-center border-[#173619] border-2 border-r-0 text-white"
					on:click={() => showAITranslationPopup.set(lang.slice(0, 2))}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-5 mt-1"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
						/>
					</svg>
					<p class="text-xs">Ask AI</p>
				</button>

				<button
					class={'bg-[#214627] text-white p-1 xl:p-2 flex gap-x-2 border-2 text-xs xl:text-base border-[#173619] border-l-0 hover:bg-[#17311b] duration-200 '}
					on:click={() => handleTranslationHeaderClicked(lang)}
					>{(edition && `${edition?.language} - ${edition?.author}`) || lang}</button
				>
			</section>
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

{#if selectedTranslation}
	<div class="absolute inset-0 backdrop-blur-sm z-50" transition:fade>
		<div class="w-full h-full flex items-center justify-center">
			<div
				class="w-[400px] h-[250px] bg-[#413f3f] border-4 border-[#161616] rounded-lg flex flex-col items-center justify-center gap-y-5 p-5 shadow-lg shadow-black"
			>
				<h1>
					Please choose an action for the {selectedTranslation.language} - {selectedTranslation.author}
					translation
				</h1>

				<button
					class="hover:font-bold w-60 py-1 rounded-lg border-2 border-black bg-[#161616]"
					on:click={() => {
						// Delete translation
						$currentProject.projectSettings.addedTranslations =
							$currentProject.projectSettings.addedTranslations.filter(
								(lang) => lang !== selectedTranslation?.name
							);
						selectedTranslation = undefined;
					}}>Remove this translation</button
				>
				<button
					class="hover:font-bold w-60 -mt-3 py-1 rounded-lg border-2 border-black bg-[#161616]"
					on:click={() => resetTranslation(selectedTranslation?.name || '')}
					>Reset this translation</button
				>
				<button
					class="hover:font-bold w-60 -mt-3 py-1 rounded-lg border-2 border-black bg-[#161616]"
					on:click={() => {
						selectedTranslation = undefined;
					}}>Close</button
				>
			</div>
		</div>
	</div>
{/if}
