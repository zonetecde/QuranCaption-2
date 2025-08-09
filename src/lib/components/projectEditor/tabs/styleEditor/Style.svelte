<script lang="ts">
	import type { Style } from '$lib/classes/VideoStyle.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { StyleCategoryName, StyleName } from '$lib/classes/VideoStyle.svelte';

	let {
		style = $bindable(),
		target,
		categoryId
	}: {
		style: Style;
		target: string;
		categoryId: StyleCategoryName;
	} = $props();

	onMount(() => {
		// Par défaut fermé
		if (!globalState.getSectionsState[style.id])
			globalState.getSectionsState[style.id] = {
				extended: false
			};
		else expanded = globalState.getSectionsState[style.id].extended;
	});

	let expanded = $state(false);

	$effect(() => {
		globalState.getSectionsState[style.id] = {
			extended: expanded
		};
	});

	// Gestion sélection de clips
	const selectedClipIds = $derived(() =>
		globalState.currentProject!.projectEditorState.stylesEditor.selectedSubtitles.map((s) => s.id)
	);

	function getEffectiveForSelection(): {
		value: any;
		mixed: boolean;
		overridden: boolean;
	} {
		if (selectedClipIds().length === 0) {
			return { value: style.value, mixed: false, overridden: false };
		}

		const values = selectedClipIds().map((id) =>
			globalState.getVideoStyle.getEffectiveValue(target, categoryId, style.id as StyleName, id)
		);
		const first = values[0];
		const mixed = values.some((v) => String(v) !== String(first));
		const overridden = globalState.getVideoStyle.hasOverrideForAny(
			selectedClipIds(),
			target,
			categoryId,
			style.id as StyleName
		);
		return { value: mixed ? first : first, mixed, overridden };
	}

	let inputValue: any = $state(style.value);
	$effect(() => {
		const eff = getEffectiveForSelection();
		inputValue = eff.value;
	});

	function coerce(val: any) {
		if (style.valueType === 'number') return Number(val);
		if (style.valueType === 'boolean') return Boolean(val);
		return val as any;
	}

	function applyValue(v: any) {
		const value = coerce(v);
		if (selectedClipIds().length > 0) {
			globalState.getVideoStyle.setStyleForClips(
				selectedClipIds(),
				target,
				categoryId,
				style.id as StyleName,
				value
			);
		} else {
			globalState.getVideoStyle.setStyle(target, categoryId, style.id as StyleName, value);
		}
		// Déclenche un refresh éventuel (ex: max-height fit)
		if (style.id === 'max-height') {
			globalState.currentProject!.projectEditorState.timeline.movePreviewTo =
				globalState.currentProject!.projectEditorState.timeline.movePreviewTo + 1;
		}
	}

	function clearOverride() {
		if (selectedClipIds().length === 0) return;
		globalState.getVideoStyle.clearStyleForClips(
			selectedClipIds(),
			target,
			categoryId,
			style.id as StyleName
		);
	}
</script>

<div
	class={'flex flex-col duration-150 ' +
		(expanded ? 'rounded-2xl my-2 px-3 py-2' : 'hover:bg-white/10 rounded-md') +
		(getEffectiveForSelection().overridden && selectedClipIds().length > 0
			? ' ring-2 ring-amber-400/60 bg-amber-500/10 '
			: expanded
				? ' bg-blue-200/10 '
				: '')}
>
	<div
		class={'flex items-center justify-between py-1 px-1 ' +
			(expanded
				? 'border-b border-white/30'
				: globalState.getStylesState.searchQuery
					? 'bg-yellow-400/40'
					: '')}
		onclick={() => {
			expanded = !expanded;
		}}
	>
		<div class="flex items-center gap-2">
			<span class="text-sm text-primary">{style.name}</span>
		</div>
		{#key selectedClipIds().length + String(inputValue)}
			<div class="flex items-center gap-2">
				<span class="text-xs text-secondary">
					{#if selectedClipIds().length > 0}
						{#if getEffectiveForSelection().mixed}
							(mixte)
						{:else}
							{String(inputValue)}
						{/if}
						{#if getEffectiveForSelection().overridden}
							•
						{/if}
					{:else}
						{String(style.value)}
					{/if}
				</span>
				{#if selectedClipIds().length > 0 && getEffectiveForSelection().overridden}
					<button
						class="btn text-xs px-3 py-1 border border-amber-300/40 text-amber-200 hover:bg-amber-400/20"
						onclick={clearOverride}
						title="Reset to parent style">Reset</button
					>
				{/if}
			</div>
		{/key}
	</div>

	{#if expanded}
		<div class="my-2" transition:slide>
			<!-- Contenu supplémentaire à afficher lorsque l'élément est développé -->
			<p class="text-xs text-secondary">{style.description}</p>

			<!-- Modificateur de valeur -->
			{#if style.valueType === 'number'}
				<div class="flex gap-x-2 items-center">
					<input
						class="w-full"
						type="range"
						min={style.valueMin}
						max={style.valueMax}
						step={style.step || 1}
						value={inputValue}
						oninput={(e) => (inputValue = (e.target as HTMLInputElement).value)}
						onchange={(e) => applyValue((e.target as HTMLInputElement).value)}
					/>

					<!-- met aussi un input number -->
					<input
						type="number"
						min={style.valueMin}
						max={style.valueMax}
						step={style.step || 1}
						value={inputValue}
						oninput={(e) => (inputValue = (e.target as HTMLInputElement).value)}
						onchange={(e) => applyValue((e.target as HTMLInputElement).value)}
						class="w-20"
					/>
				</div>
			{:else if style.valueType === 'color'}
				<div class="flex gap-x-2 items-center">
					<input
						type="color"
						value={String(inputValue)}
						class="w-full"
						onchange={(e) => applyValue((e.target as HTMLInputElement).value)}
					/>
					<input
						type="text"
						value={String(inputValue)}
						class="w-16"
						onchange={(e) => applyValue((e.target as HTMLInputElement).value)}
					/>
				</div>
			{:else if style.valueType === 'boolean'}
				<div class="flex gap-x-2 items-center mt-2">
					<input
						type="checkbox"
						checked={Boolean(inputValue)}
						class="w-4 h-4"
						onchange={(e) => applyValue((e.target as HTMLInputElement).checked)}
					/>
					<span class="text-xs text-secondary">Enabled</span>
				</div>
			{:else if style.valueType === 'select'}
				<select
					class="w-full mt-1"
					value={String(inputValue)}
					onchange={(e) => {
						applyValue((e.target as HTMLSelectElement).value);
					}}
				>
					{#if style.id === 'font-family'}
						{#await invoke('get_system_fonts')}
							<option value="" disabled selected>Loading fonts...</option>
						{:then fonts: any}
							<option value="Hafs">Hafs (Qur'an Font)</option>
							{#each fonts as font}
								<option value={font}>{font}</option>
							{/each}
						{:catch error}
							<option value="" disabled>Error loading fonts: {error.message}</option>
						{/await}
					{:else}
						{#each style.options || [] as option}
							<option value={option}>{option}</option>
						{/each}
					{/if}
				</select>
			{/if}
		</div>
	{/if}
</div>
