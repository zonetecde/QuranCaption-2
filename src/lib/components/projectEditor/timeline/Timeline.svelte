<script lang="ts">
	import { Duration } from '$lib/classes/Duration';
	import { globalState } from '$lib/runes/main.svelte';
	import Track from './track/Track.svelte';

	let totalDuration = new Duration(120000);

	let timelineSettings = $derived(() => globalState.currentProject?.projectEditorState.timeline!);

	// Fonction pour déterminer l'intervalle d'affichage des timestamps selon le zoom
	function getTimestampInterval(zoom: number): number {
		if (zoom >= 50) return 1; // Chaque seconde
		if (zoom >= 30) return 2; // Toutes les 2 secondes
		if (zoom >= 20) return 5; // Toutes les 5 secondes
		if (zoom >= 10) return 10; // Toutes les 10 secondes
		if (zoom >= 5) return 15; // Toutes les 15 secondes
		if (zoom >= 2) return 30; // Toutes les 30 secondes
		return 60; // Chaque minute
	}

	// Fonction pour déterminer si on doit afficher un timestamp à cette position
	function shouldShowTimestamp(secondIndex: number, zoom: number): boolean {
		const interval = getTimestampInterval(zoom);
		return secondIndex % interval === 0;
	}

	function handleTimelineClick(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement;
		if (!target) return;

		const rect = target.getBoundingClientRect();
		const clickX = event.clientX - rect.left - 180; // Soustrait la largeur du header
		const newPosition = Math.max(0, (clickX / timelineSettings().zoom) * 1000);

		globalState.currentProject!.projectEditorState.timeline.cursorPosition = newPosition;
	}

	function handleTimelineDrag(event: MouseEvent) {
		if (event.buttons !== 1) return; // Seulement si le bouton gauche est maintenu

		const target = event.currentTarget as HTMLElement;
		if (!target) return;

		const rect = target.getBoundingClientRect();
		const clickX = event.clientX - rect.left - 180; // Soustrait la largeur du header
		const newPosition = Math.max(0, (clickX / timelineSettings().zoom) * 1000);

		globalState.currentProject!.projectEditorState.timeline.cursorPosition = newPosition;
	}

	function handleRulerClick(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement;
		if (!target) return;

		const rect = target.getBoundingClientRect();
		const clickX = event.clientX - rect.left - 180; // Soustrait la largeur du header
		const newPosition = Math.max(0, (clickX / timelineSettings().zoom) * 1000);

		globalState.currentProject!.projectEditorState.timeline.cursorPosition = newPosition;
	}

	function handleRulerDrag(event: MouseEvent) {
		if (event.buttons !== 1) return; // Seulement si le bouton gauche est maintenu

		const target = event.currentTarget as HTMLElement;
		if (!target) return;

		const rect = target.getBoundingClientRect();
		const clickX = event.clientX - rect.left - 180; // Soustrait la largeur du header
		const newPosition = Math.max(0, (clickX / timelineSettings().zoom) * 1000);

		globalState.currentProject!.projectEditorState.timeline.cursorPosition = newPosition;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			handleTimelineClick(event as any);
		}
	}

	// Synchronise le scroll entre la règle et les pistes
	function syncScroll(event: Event) {
		const source = event.target as HTMLElement;
		const isRuler = source.classList.contains('timeline-ruler');
		const isTrack = source.classList.contains('timeline-tracks');

		if (isRuler) {
			const tracks = source.parentElement?.querySelector('.timeline-tracks') as HTMLElement;
			if (tracks) tracks.scrollLeft = source.scrollLeft;
		} else if (isTrack) {
			const ruler = source.parentElement?.querySelector('.timeline-ruler') as HTMLElement;
			if (ruler) ruler.scrollLeft = source.scrollLeft;
		}
	}

	function handleMouseWheelWheeling(event: any) {
		// Si la touche CTRL est enfoncée
		if (event.ctrlKey) {
			// Zoom avant ou arrière
			if (event.deltaY > 0 && timelineSettings().zoom > 0.2) {
				timelineSettings().zoom -= 0.75;
			} else if (timelineSettings().zoom < 100) {
				timelineSettings().zoom += 0.75;
			}

			if (timelineSettings().zoom === 10) {
				// Valeur interdite qui fait beuguer le rendu
				timelineSettings().zoom = 10.01;
			}
		}
	}
</script>

<div class="timeline-container" onwheel={handleMouseWheelWheeling}>
	<!-- Timeline Header -->
	<div class="timeline-ruler" onscroll={syncScroll}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="ruler-content"
			style="width: {totalDuration.toSeconds() * timelineSettings().zoom + 180}px;"
			onclick={handleRulerClick}
			onmousemove={handleRulerDrag}
			role="button"
			tabindex="0"
		>
			<!-- Header spacer for alignment -->
			<div class="ruler-header-spacer"></div>

			<!-- Time markers -->
			{#each Array.from({ length: totalDuration.toSeconds() }, (_, i) => i) as i}
				{#if shouldShowTimestamp(i, timelineSettings().zoom)}
					<div
						class="time-marker"
						class:major={getTimestampInterval(timelineSettings().zoom) >= 10 &&
							i % (getTimestampInterval(timelineSettings().zoom) * 2) === 0}
						style="left: {i * timelineSettings().zoom + 180}px;"
					>
						<div class="time-label z-5">
							{new Duration(i * 1000).getFormattedTime(true)}
						</div>
						<div class="time-tick"></div>
					</div>
				{/if}
			{/each}

			<!-- Playhead cursor in ruler -->
			<div
				class="playhead-ruler"
				style="left: {(timelineSettings().cursorPosition / 1000) * timelineSettings().zoom +
					180}px;"
			>
				<div class="playhead-handle"></div>
			</div>
		</div>
	</div>

	<!-- Timeline Tracks Area -->
	<div class="timeline-tracks" onscroll={syncScroll}>
		<div
			class="tracks-content"
			style="width: {totalDuration.toSeconds() * timelineSettings().zoom + 180}px;"
			onclick={handleTimelineClick}
			onmousemove={handleTimelineDrag}
			onkeydown={handleKeydown}
			role="button"
			tabindex="0"
		>
			<!-- Background grid -->
			<div class="timeline-grid">
				{#each Array.from({ length: totalDuration.toSeconds() }, (_, i) => i) as i}
					<div
						class="grid-line"
						class:major={shouldShowTimestamp(i, timelineSettings().zoom)}
						style="left: {i * timelineSettings().zoom + 180}px;"
					></div>
				{/each}
			</div>

			<!-- Track lanes -->
			<div class="track-lanes">
				<Track name="Subtitles" icon="subtitles" />
				<Track name="Video Track" icon="movie" />
				<Track name="Audio Track" icon="music_note" />
			</div>

			<!-- Main playhead cursor -->
			<div
				class="playhead-cursor"
				style="left: {(timelineSettings().cursorPosition / 1000) * timelineSettings().zoom +
					180}px;"
			></div>
		</div>
	</div>
</div>

<style>
	.timeline-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--timeline-bg-primary);
		border-top: 1px solid var(--border-color);
		position: relative;
		overflow: hidden;
	}

	/* Timeline Ruler */
	.timeline-ruler {
		height: 20px;
		background: var(--timeline-ruler-bg);
		border-bottom: 1px solid var(--timeline-track-border);
		overflow-x: auto;
		overflow-y: hidden;
		position: relative;
		z-index: 10;
	}

	.ruler-content {
		height: 100%;
		position: relative;
		min-width: 100%;
		cursor: crosshair;
	}

	.ruler-header-spacer {
		position: absolute;
		left: 0;
		top: 0;
		width: 180px;
		height: 100%;
		background: var(--timeline-ruler-bg);
		border-right: 1px solid var(--timeline-track-border);
		z-index: 5;
		pointer-events: none;
	}

	.time-marker {
		position: absolute;
		top: 0;
		height: 100%;
		pointer-events: none;
	}

	.time-label {
		position: absolute;
		top: 2px;
		left: 0;
		transform: translateX(-50%);
		font-size: 10px;
		font-weight: 500;
		color: var(--timeline-timestamp);
		font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
	}

	.time-marker.major .time-label {
		color: var(--timeline-timestamp-major);
		font-weight: 600;
		font-size: 11px;
	}

	.time-tick {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 1px;
		height: 8px;
		background: var(--timeline-grid-minor);
		transform: translateX(-50%);
	}

	.time-marker.major .time-tick {
		height: 12px;
		width: 2px;
		background: var(--timeline-grid-major);
		box-shadow: 0 0 4px rgba(88, 166, 255, 0.3);
	}

	/* Playhead in ruler */
	.playhead-ruler {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--timeline-cursor);
		box-shadow: 0 0 8px var(--timeline-cursor-shadow);
		z-index: 20;
		pointer-events: none;
	}

	.playhead-handle {
		position: absolute;
		top: -2px;
		left: -6px;
		width: 14px;
		height: 8px;
		background: var(--timeline-cursor);
		clip-path: polygon(0 0, 100% 0, 50% 100%);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}

	/* Timeline Tracks */
	.timeline-tracks {
		flex: 1;
		overflow-x: auto;
		overflow-y: auto;
		background: var(--timeline-bg-secondary);
	}

	.tracks-content {
		height: 220px;
		position: relative;
		cursor: crosshair;
	}

	/* Timeline Grid */
	.timeline-grid {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
	}

	.grid-line {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--timeline-grid-minor);
		opacity: 0.5;
	}

	.grid-line.major {
		width: 1px;
		background: var(--timeline-grid-major);
		opacity: 0.8;
	}

	/* Track Lanes */
	.track-lanes {
		position: relative;
		z-index: 1;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	/* Main Playhead Cursor */
	.playhead-cursor {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--timeline-cursor);
		box-shadow:
			0 0 8px var(--timeline-cursor-shadow),
			0 0 16px rgba(248, 81, 73, 0.2);
		z-index: 100;
		pointer-events: none;
	}

	.playhead-cursor::before {
		content: '';
		position: absolute;
		bottom: -4px;
		left: -6px;
		width: 14px;
		height: 8px;
		background: var(--timeline-cursor);
		clip-path: polygon(50% 0, 0 100%, 100% 100%);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}

	/* Synchronize scroll between ruler and tracks */
	.timeline-ruler::-webkit-scrollbar {
		display: none;
	}

	/* Responsive adjustments */
	.timeline-container {
		height: 260px;
	}
</style>
