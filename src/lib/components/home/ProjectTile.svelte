<script lang="ts">
	import type { ProjectDesc } from '$lib/models/Project';
	import { secondsToHHMMSS } from '$lib/models/Timeline';
	import { delProject, updateUserProjectsDesc } from '$lib/stores/ProjectStore';
	import { onMount } from 'svelte';

	const LANGUAGE_TO_COUNTRY = {
		en: 'US', // English -> United States
		ar: 'SA', // Arabic -> Saudi Arabia
		zh: 'CN', // Chinese -> China
		pt: 'PT', // Portuguese -> Portugal
		ja: 'JP', // Japanese -> Japan
		ko: 'KR', // Korean -> South Korea
		de: 'DE', // German -> Germany
		it: 'IT', // Italian -> Italy
		nl: 'NL' // Dutch -> Netherlands
	};

	/**
	 * Convert language codes to flag emojies
	 *
	 * @param langCodes The language codes
	 * @returns The flag emojies
	 */
	function langCodeToFlagEmojies(langCodes: string[]) {
		const flags = langCodes.map((langCode) => {
			const language = langCode.substring(0, 2).toLowerCase();
			//@ts-ignore
			const countryCode = LANGUAGE_TO_COUNTRY[language] || language.toUpperCase();

			return `<img src="http://purecatamphetamine.github.io/country-flag-icons/3x2/${countryCode}.svg" alt="${countryCode}" width="20" style="display: inline-block; vertical-align: middle; margin-left: 3px;">`;
		});
		return `(${flags.join(', ')})`;
	}

	export let userProjectsDesc: ProjectDesc[];
	export let project: ProjectDesc;
	export let openProject: (projectId: string) => void;

	/**
	 * Handle delete project
	 */
	async function handleDelProject(id: string) {
		userProjectsDesc = await delProject(id);
	}

	function saveProject() {
		updateUserProjectsDesc(userProjectsDesc);
	}
</script>

<div class="w-full h-32 bg-[#403e46] rounded-xl relative group p-3">
	<div class="grid grid-cols-2 grid-rows-2">
		<p>
			Name:
			<button
				on:click={() => {
					const newProjectName = prompt('Enter the new name of the project', project.name);
					if (newProjectName) {
						project.name = newProjectName;
						saveProject();
					}
				}}><b>{project.name}</b></button
			>
		</p>

		<!-- prevent this from showing if the migration hasnt been done yet -->
		{#if project.translations !== undefined}
			<p>
				Percentage captioned: <b>{project.percentageCaptioned}%</b>
			</p>

			<p>
				Duration: <b>{project.duration === 0 ? 'Ø' : secondsToHHMMSS(project.duration, true)[0]}</b>
			</p>

			{#if project.percentageTranslated !== -1}
				<p>
					Percentage translated: <b>{project.percentageTranslated}%</b>
					{@html langCodeToFlagEmojies(project.translations)}
				</p>
			{:else}
				<!-- dummy div pour occuper une place de la grid -->
				<div></div>
			{/if}

			<p>
				Reciter: <button
					on:click={() => {
						// open window text prompt
						const newReciter = prompt('Enter the new reciter of the project', project.reciter);
						if (newReciter) {
							project.reciter = newReciter;
							saveProject();
						}
					}}><b>{project.reciter || 'Ø'}</b></button
				>
			</p>

			{#if project.versesRange.length > 0}
				<abbr title={project.versesRange.join(', ')} class="no-underline">
					<p class="truncate">
						Verses: <b>{project.versesRange.join(', ')}</b>
					</p>
				</abbr>
			{/if}

			<div class="absolute top-0 right-0 rounded-tr-xl rounded-bl-xl px-3 py-1 group/status">
				<button on:click={() => {}}>Status: {project.status}</button>

				<div
					class="absolute group-hover/status:block hidden top-8 right-2 bg-[#a1a1ba] text-black w-48 h-[5rem] border-2 z-10 rounded-md flex-col"
				>
					<p class="font-bold text-center">Select a new status</p>
					<select
						bind:value={project.status}
						on:change={() => saveProject()}
						class=" ml-6 mt-0.5 h-10 w-3/4 bg-[#474c55] rounded-md p-2 text-white"
					>
						<option value="To caption">To caption</option>
						<option value="Captioning">Captioning</option>
						<option value="To translate">To translate</option>
						<option value="Translating">Translating</option>
						<option value="To export">To export</option>
						<option value="Exported">Exported</option>
						<option value="not set">Not set</option>
					</select>
				</div>
			</div>
		{/if}
	</div>
	<p class="absolute bottom-1 right-2 text-sm">
		Last update : {new Date(project.updatedAt).toLocaleString([], {
			month: 'long',
			day: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})}
	</p>

	<button
		class="px-5 py-2 bg-[#3a533a] absolute bottom-0 left-0 rounded-bl-xl rounded-tr-xl hover:bg-[#2f4a2f] duration-150"
		on:click={() => openProject(project.id)}>Open</button
	>

	<!-- Delete project button -->
	<button
		class="w-6 h-6 absolute bottom-1.5 left-[5.5rem] bg-red-200 rounded-full p-1 hidden group-hover:block"
		on:click={async (e) => {
			// tauri prompt to confirm deletion
			const res = await confirm('Are you sure you want to delete this project?');
			if (res) handleDelProject(project.id);
		}}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="red"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
			/>
		</svg>
	</button>
</div>
