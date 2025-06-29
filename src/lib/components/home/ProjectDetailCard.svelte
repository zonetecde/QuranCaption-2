<script lang="ts">
	import type { ProjectDetail } from '$lib/classes';
	import { projectService } from '$lib/services/ProjectService';
	import ContextMenu, { Item, Divider, Settings } from 'svelte-contextmenu';
	import { confirmModal } from '../modals/ConfirmModal';
	import { globalState } from '$lib/runes/main.svelte';
	import { inputModal } from '../modals/InputModal';
	import EditableText from '../misc/EditableText.svelte';

	let contextMenu: ContextMenu | undefined = $state(undefined); // Initialize context menu state

	let {
		projectDetail = $bindable()
	}: {
		projectDetail: ProjectDetail;
	} = $props();

	async function deleteProjectButtonClick(e: MouseEvent) {
		if (e.button !== 0) return; // Only handle left click
		// todo: add confirmation dialog
		if (
			await confirmModal(`Are you sure you want to delete the project "${projectDetail.name}"?`)
		) {
			await projectService.delete(projectDetail.id); // Supprime le projet
			await projectService.loadUserProjectsDetails(); // maj des projets de l'utilisateur
		} else {
			contextMenu!.close();
		}
	}

	async function openProjectButtonClick() {
		// Ouvre le projet
		globalState.currentProject = await projectService.load(projectDetail.id);
	}

	async function projectNameClick() {
		const newName = await inputModal('Enter new project name:', projectDetail.name, 50);
		if (newName && newName.trim() !== '') {
			projectDetail.name = newName.trim();

			// await projectService.loadUserProjectsDetails(); // maj des projets de l'utilisateur
		}
	}
</script>

<div
	class="glassmorphism-card flex flex-col justify-between hover:shadow-2xl hover:border-[var(--accent-primary)] transition-all duration-300"
>
	<div class="group">
		<img
			alt="Project Thumbnail"
			class="w-full h-40 object-cover rounded-t-lg mb-4"
			src="https://placehold.co/1920x1080"
		/>
		<div class="px-4 pb-4">
			<div class="flex justify-between items-start mb-2">
				<EditableText
					text="Enter project name"
					bind:value={projectDetail.name}
					maxLength={50}
					placeholder={projectDetail.name}
					action={async () => {
						await projectService.saveDetail(projectDetail); // Sauvegarde le projet
					}}
				/>

				<div class="status-not-set text-xs flex items-center">
					<span class="status-dot" style={`background-color: ${projectDetail.status.color};`}
					></span>{projectDetail.status.status}
				</div>
			</div>
			<p class="text-xs text-[var(--text-secondary)] mb-1">
				Reciter: {projectDetail.reciter || 'not set'}
			</p>
			<p class="text-xs text-[var(--text-secondary)] mb-1">
				Duration: {projectDetail.duration.getFormattedTime()}
			</p>
			<p class="text-xs text-[var(--text-secondary)] mb-3">
				Verses: <span class="font-medium text-[var(--text-primary)]"
					>{projectDetail.verseRange.toString()}</span
				>
			</p>
			<div class="project-card-details space-y-2">
				<div>
					<div class="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
						<span>Captioning</span>
						<span class="font-medium text-[var(--text-primary)]"
							>{projectDetail.percentageCaption}%</span
						>
					</div>
					<div class="progress-bar-bg">
						<div class="progress-bar-fill" style="width: {projectDetail.percentageCaption}%;"></div>
					</div>
				</div>
				<div>
					{#each projectDetail.translations as translation}
						<div class="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
							<span
								>Translation ({translation.language})
								<img alt="{translation.language} flag" class="flag-icon" src="" /></span
							>
							<span class="font-medium text-[var(--text-primary)]">{translation.percentage}%</span>
						</div>
						<div class="progress-bar-bg">
							<div class="progress-bar-fill" style="width: {translation.percentage}%;"></div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
	<div class="mt-auto pt-3 border-t border-[var(--border-color)] px-4 pb-4">
		<div class="flex justify-between items-center text-xs text-[var(--text-secondary)] mb-2">
			<span>Created: {projectDetail.createdAt.toLocaleDateString()}</span>
			<span>Updated: {projectDetail.updatedAt.toLocaleDateString()}</span>
		</div>

		<div class="flex space-x-2">
			<button class="btn btn-primary btn-sm flex-grow text-xs" onclick={openProjectButtonClick}
				>Open</button
			>
			<button
				class="btn btn-secondary btn-sm p-1.5 flex items-center"
				onclick={contextMenu!.createHandler()}
			>
				<span class="material-icons-outlined text-sm">more_horiz</span>
			</button>
		</div>
	</div>
</div>

<ContextMenu bind:this={contextMenu}>
	<Item on:click={deleteProjectButtonClick}
		><div class="btn-icon danger-color">
			<span class="material-icons-outlined text-sm mr-1">delete</span>Delete project
		</div></Item
	>
</ContextMenu>

<style>
	.glassmorphism-card {
		background: rgba(22, 27, 34, 0.6);
		backdrop-filter: blur(10px);
		border: 1px solid var(--border-color);
		border-radius: 0.75rem;
		box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
	}

	.status-dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		display: inline-block;
		margin-right: 0.5rem;
	}

	.progress-bar-bg {
		background-color: var(--border-color);
		border-radius: 0.25rem;
		height: 0.5rem;
		overflow: hidden;
	}

	.progress-bar-fill {
		background-color: var(--accent-primary);
		height: 100%;
		border-radius: 0.25rem;
		transition: width 0.3s ease-in-out;
	}
	.flag-icon {
		width: 1.25rem;
		height: 0.75rem;
		border-radius: 2px;
		object-fit: cover;
		display: inline-block;
		margin-left: 0.25rem;
	}
	.project-card-details {
		opacity: 0;
		max-height: 0;
		overflow: hidden;
		transition:
			opacity 0.3s ease-out,
			max-height 0.3s ease-out;
	}
	.group:hover .project-card-details {
		opacity: 1;
		max-height: 500px;
	}
</style>
