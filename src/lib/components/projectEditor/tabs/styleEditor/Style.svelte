<script lang="ts">
	import { globalState } from '$lib/runes/main.svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { Style, StyleCategoryName, StyleName } from '$lib/classes/VideoStyle.svelte';
	import { default as StyleComponent } from '$lib/components/projectEditor/tabs/styleEditor/Style.svelte';
	import toast from 'svelte-5-french-toast';
	import { ProjectDetail, type CustomTextClip } from '$lib/classes';
	import AutocompleteInput from '$lib/components/misc/AutocompleteInput.svelte';
	import RecitersManager from '$lib/classes/Reciter';
	import EditableText from '$lib/components/misc/EditableText.svelte';
	import { projectService } from '$lib/services/ProjectService';

	let {
		style,
		target,
		categoryId,
		disabled,
		applyValueSimple
	}: {
		style: Style;
		target?: string;
		categoryId: StyleCategoryName;
		disabled: boolean;
		applyValueSimple: (value: any) => void;
	} = $props();

	onMount(async () => {
		// Par défaut fermé
		if (!globalState.getSectionsState[style.id])
			globalState.getSectionsState[style.id] = {
				extended: false
			};
		else expanded = globalState.getSectionsState[style.id].extended;

		// Si est un style composite
		if (style.valueType === 'composite' && target) {
			// On charge les styles composites
			await globalState.getVideoStyle.getStylesOfTarget(target).loadCompositeStyles();
		}

		// Si le style est sur le récitateur du projet, bind la valeur au récitateur du projet
		if (style.valueType === 'reciter') {
			inputValue = globalState.currentProject!.detail.reciter;
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
		if (!target) return { value: style.value, mixed: false, overridden: false };

		if (selectedClipIds().length === 0) {
			return { value: style.value, mixed: false, overridden: false };
		}

		const values = selectedClipIds().map((id) =>
			globalState.getVideoStyle
				.getStylesOfTarget(target)
				.getEffectiveValue(style.id as StyleName, id)
		);
		const first = values[0];
		const mixed = values.some((v) => String(v) !== String(first));
		const overridden = globalState.getVideoStyle
			.getStylesOfTarget(target)
			.hasOverrideForAny(selectedClipIds(), style.id as StyleName);
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
			globalState.getVideoStyle
				.getStylesOfTarget(target!)
				.setStyleForClips(selectedClipIds(), style.id as StyleName, value);
		} else {
			applyValueSimple(value);
		}

		// Déclenche un refresh éventuel (ex: max-height fit)
		if (
			style.id === 'max-height' ||
			style.id === 'font-size' ||
			style.id === 'word-spacing' ||
			style.id === 'font-family'
		) {
			globalState.updateVideoPreviewUI();
		} else if (style.id === 'video-dimension') {
			// On met à jour toutes les valeurs minimum et maximum des styles vertical-position/horizontal-position
			// afin qu'on puisse mettre nos textes où on veut sur la vidéo
			for (let target of globalState.getVideoStyle.styles) {
				for (let category of target.categories) {
					for (let style of category.styles) {
						if (style.id.includes('vertical-position')) {
							style.valueMin = -(v.height / 2);
							style.valueMax = v.height / 2;

							if ((style.value as number) > style.valueMax) {
								style.value = style.valueMax;
							} else if ((style.value as number) < style.valueMin) {
								style.value = style.valueMin;
							}
						} else if (style.id.includes('horizontal-position')) {
							style.valueMin = -(v.width / 2);
							style.valueMax = v.width / 2;

							if ((style.value as number) > style.valueMax) {
								style.value = style.valueMax;
							} else if ((style.value as number) < style.valueMin) {
								style.value = style.valueMin;
							}
						}
					}
				}
			}
		}
	}

	function clearOverride() {
		if (selectedClipIds().length === 0) return;
		globalState.getVideoStyle.getStylesOfTarget(target!).clearStyleForClips(
			selectedClipIds(),

			style.id as StyleName
		);
	}

	/**
	 * Effect permettant de fermer le style si celui-ci se fait désactiver
	 */
	$effect(() => {
		if (disabled) {
			expanded = false; // Si le style est désactivé, on le ferme
			return;
		}
	});

	/**
	 * Permet de convertir un temps en ms en un temps capable d'être affiché
	 * dans un input de type 'time'
	 * @param value La valeur à convertir
	 */
	function msToTimeValue(value: number): string {
		const totalSeconds = Math.floor(value / 1000);
		const hh = Math.floor(totalSeconds / 3600);
		const mm = Math.floor((totalSeconds % 3600) / 60);
		const ss = totalSeconds % 60;
		const pad = (n: number) => String(n).padStart(2, '0');

		return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
	}

	function getStyleValue() {
		if (style.valueType === 'composite') {
			return 'Click to expand';
		} else if (style.valueType === 'reciter') {
			return globalState.currentProject!.detail.reciter || 'No reciter selected';
		} else if (style.valueType === 'dimension') {
			return (style.value as any).width + 'x' + (style.value as any).height;
		} else return String(style.value);
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
			(expanded ? 'border-b border-white/10 ' : '') +
			(disabled ? 'opacity-50 pointer-events-none' : '')}
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
							override: {getEffectiveForSelection().value}
						</span>
					{:else}
						<span>{String(inputValue)}</span>
					{/if}
				{:else if style.valueType === 'time'}
					<span>{msToTimeValue(Number(inputValue))}</span>
				{:else}
					<span class="truncate max-w-[140px]">{getStyleValue()}</span>
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
								<option value="QPC2">Uthamic Mushaf QPC2</option>
								<option value="QPC1">Uthamic Mushaf QPC1</option>
								<option value="Hafs">Hafs</option>
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
			{:else if style.valueType === 'time'}
				<div class="relative flex flex-row gap-x-2 items-center">
					<input
						type="time"
						class="w-full"
						oninput={(e) => {
							// Convertis en ms et applique
							const timeString = (e.target as HTMLInputElement).value;
							const [hh, mm, ss] = timeString.split(':').map(Number);
							const totalSeconds = hh * 3600 + mm * 60 + ss;
							applyValue(totalSeconds * 1000);
						}}
						value={msToTimeValue(style.value as number)}
					/>
					<span>or</span>
					<button
						class="btn-accent text-sm py-1 min-w-[150px]"
						title="Use the preview timeline cursor time and put it into the time field"
						onclick={(e) => {
							let currentPreviewTime = globalState.getTimelineState.cursorPosition;

							applyValue(currentPreviewTime);
						}}
					>
						Use preview cursor time
					</button>
				</div>
			{:else if style.valueType === 'reciter'}
				{@const reciter = RecitersManager.getReciterObject(
					globalState.currentProject!.detail.reciter
				)}
				<div class="flex flex-col gap-x-2">
					<EditableText
						text="Enter project reciter"
						bind:value={globalState.currentProject!.detail.reciter}
						maxLength={ProjectDetail.RECITER_MAX_LENGTH}
						placeholder={globalState.currentProject!.detail.reciter}
						textClasses="font-semibold"
						action={async () => {
							await projectService.saveDetail(globalState.currentProject!.detail); // Sauvegarde le projet
						}}
						inputType="reciters"
					/>

					{#if reciter.number !== -1}
						<p class="reciters-font text-3xl -mr-3 text-center">
							{reciter.number}
						</p>
					{:else}
						<p class="text-sm mt-2 text-yellow-500">
							<span class="material-icons align-middle text-[18px]!">block</span>
							Arabic calligraphy is not available for this reciter.
						</p>
					{/if}
				</div>
			{:else if style.valueType === 'dimension'}
				<!-- Deux boutons quick select : landscape (met en 1920x1080) et portrait (met en 1080x1920) -->
				<div class="flex flex-row items-center gap-x-1">
					<p>Quick select:</p>
					<button
						class={'px-3 py-1 ' + (style.value === '1920x1080' ? 'btn-accent' : 'btn')}
						onclick={() => applyValue({ width: 1920, height: 1080 })}
					>
						Landscape
					</button>
					<button
						class={'px-3 py-1 ' + (style.value === '1080x1920' ? 'btn-accent' : 'btn')}
						onclick={() => applyValue({ width: 1080, height: 1920 })}
					>
						Portrait
					</button>
				</div>

				<p class="mt-2">Custom dimensions:</p>

				<div class="flex flex-row items-center gap-x-2">
					<input
						type="number"
						class="w-full"
						oninput={(e) => {
							const width = parseInt((e.target as HTMLInputElement).value);
							const height = (style.value as any).height;
							applyValue({ width, height });
						}}
						value={(style.value as any).width}
					/>
					<span>x</span>
					<input
						type="number"
						class="w-full"
						oninput={(e) => {
							const width = (style.value as any).width;
							const height = parseInt((e.target as HTMLInputElement).value);
							applyValue({ width, height });
						}}
						value={(style.value as any).height}
					/>
				</div>
			{:else if style.valueType === 'composite'}
				<div class="flex flex-col gap-2">
					{#each globalState.getVideoStyle
						.getStylesOfTarget(target!)
						.getCompositeStyles(style.id as StyleName) as subStyle}
						<StyleComponent
							style={subStyle}
							target={style.id}
							categoryId={categoryId as StyleCategoryName}
							disabled={false}
							applyValueSimple={(v) => {
								subStyle.value = v;
							}}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
