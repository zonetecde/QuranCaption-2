<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { Style, StyleCategoryName, StyleName } from '$lib/classes/VideoStyle.svelte';
	import { default as StyleComponent } from '$lib/components/projectEditor/tabs/styleEditor/Style.svelte';

	let {
		style = $bindable(),
		target,
		categoryId
	}: {
		style: Style;
		target: string;
		categoryId: StyleCategoryName;
	} = $props();

	onMount(async () => {
		// Par défaut fermé
		if (!globalState.getSectionsState[style.id])
			globalState.getSectionsState[style.id] = {
				extended: false
			};
		else expanded = globalState.getSectionsState[style.id].extended;

		// Si est un style composite
		if (style.valueType === 'composite') {
			// On charge les styles composites
			await globalState.getVideoStyle.loadCompositeStyles(style.id);
		}
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

	// Drapeaux visuels
	const isMixed = $derived(() =>
		selectedClipIds().length > 0 ? getEffectiveForSelection().mixed : false
	);
	const isOverridden = $derived(() =>
		selectedClipIds().length > 0 ? getEffectiveForSelection().overridden : false
	);

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
	class={'flex flex-col duration-150 rounded-xl overflow-hidden ' +
		(expanded ? 'bg-white/5 ring-1 ring-white/10 my-2' : 'hover:bg-white/5') +
		(isMixed()
			? ' border border-fuchsia-400/60'
			: isOverridden()
				? ' border border-amber-400/60'
				: ' border border-transparent')}
>
	<!-- Header -->
	<div
		class={'flex items-center justify-between py-1.25 px-2 cursor-pointer select-none ' +
			(expanded ? 'border-b border-white/10' : '')}
		onclick={() => (expanded = !expanded)}
	>
		<div class="flex items-center gap-2">
			<span class="material-icons-outlined text-[20px]! text-secondary">{style.icon}</span>
			<span class="text-sm text-primary font-medium">{style.name}</span>
		</div>
		{#key selectedClipIds().length + String(inputValue)}
			<div class="flex items-center gap-2 text-xs text-secondary">
				{#if selectedClipIds().length > 0}
					{#if getEffectiveForSelection().mixed}
						<span
							class="px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/40 flex items-center gap-1"
						>
							<span class="material-icons-outlined text-[12px]">scatter_plot</span>
							mixte
						</span>
					{:else if getEffectiveForSelection().overridden}
						<span
							class="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-400/40 flex items-center gap-1 cursor-auto"
						>
							<span class="material-icons-outlined text-[12px]">auto_fix_high</span>
							override
						</span>
					{:else}
						<span>{String(inputValue)}</span>
					{/if}
				{:else}
					<span>{String(style.value)}</span>
				{/if}

				{#if selectedClipIds().length > 0 && (getEffectiveForSelection().overridden || getEffectiveForSelection().mixed) && target !== 'global'}
					<button
						class="ml-1 text-[11px] px-2 py-1 rounded border hover:opacity-90 duration-100 flex items-center gap-1 cursor-pointer"
						title="Reset override for selection"
						onclick={(e) => {
							e.stopPropagation();
							clearOverride();
						}}
					>
						<span class="material-icons-outlined text-[12px]">restart_alt</span>
						Reset
					</button>
				{/if}
			</div>
		{/key}
	</div>

	{#if expanded}
		<div class="my-2 px-2" transition:slide>
			<p class="text-xs text-secondary mb-2 flex items-center gap-1">
				<span class="material-icons-outlined text-[12px]">info</span>
				{style.description}
			</p>

			<!-- Modificateur de valeur -->
			{#if style.valueType === 'number'}
				<div class="flex gap-x-2 items-center">
					<input
						class="w-full accent-accent"
						type="range"
						min={style.valueMin}
						max={style.valueMax}
						step={style.step || 1}
						value={inputValue}
						oninput={(e) => {
							inputValue = (e.target as HTMLInputElement).value;
							applyValue((e.target as HTMLInputElement).value);
						}}
					/>

					<!-- met aussi un input number -->
					<div class="relative">
						<input
							type="number"
							min={style.valueMin}
							max={style.valueMax}
							step={style.step || 1}
							value={inputValue}
							oninput={(e) => {
								inputValue = (e.target as HTMLInputElement).value;
								applyValue((e.target as HTMLInputElement).value);
							}}
							class="w-24"
						/>
					</div>
				</div>
			{:else if style.valueType === 'color'}
				<div class="flex gap-x-2 items-center">
					<input
						type="color"
						value={String(inputValue)}
						class="w-full h-8 rounded"
						oninput={(e) => applyValue((e.target as HTMLInputElement).value)}
					/>
					<div class="relative">
						<input
							type="text"
							value={String(inputValue)}
							class="w-24"
							oninput={(e) => applyValue((e.target as HTMLInputElement).value)}
						/>
					</div>
				</div>
			{:else if style.valueType === 'boolean'}
				<div class="flex gap-x-2 items-center mt-2">
					<label class="inline-flex items-center cursor-pointer gap-2">
						<input
							type="checkbox"
							checked={Boolean(inputValue)}
							class=""
							oninput={(e) => applyValue((e.target as HTMLInputElement).checked)}
						/>

						<span class="text-xs text-secondary">Enabled</span>
					</label>
				</div>
			{:else if style.valueType === 'select'}
				<div class="relative">
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
				</div>
			{:else if style.valueType === 'text'}
				<div class="relative">
					<input
						type="text"
						value={String(inputValue)}
						class="w-full mono"
						oninput={(e) => applyValue((e.target as HTMLInputElement).value)}
					/>
				</div>
			{:else if style.valueType === 'composite'}
				<div class="flex flex-col gap-2">
					{#each globalState.getVideoStyle.getCompositeStyles(style.id) as subStyle}
						<StyleComponent
							style={subStyle}
							target={style.id}
							categoryId={(style.id + '-category') as StyleCategoryName}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
