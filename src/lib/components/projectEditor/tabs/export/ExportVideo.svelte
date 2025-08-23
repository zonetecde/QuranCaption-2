<script lang="ts">
	import Exporter from '$lib/classes/Exporter';
	import { globalState } from '$lib/runes/main.svelte';
	import { slide } from 'svelte/transition';
	import TimeInput from './TimeInput.svelte';
	import Style from '../styleEditor/Style.svelte';
	import { VerseRange } from '$lib/classes';

	// Initialize export state values if not set
	$effect(() => {
		if (!globalState.getExportState.videoStartTime) {
			globalState.getExportState.videoStartTime = 0;
		}
		if (!globalState.getExportState.videoEndTime) {
			globalState.getExportState.videoEndTime = globalState.getAudioTrack.getDuration().ms || 0;
		}
	});

	// Helper function to format duration for display
	function formatDuration(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else {
			return `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}
	}

	let videoDimensions = $derived(async () => {
		return await Exporter.getRealExportDimensions(globalState.currentProject!);
	});
</script>

<!-- Export Video Configuration -->
<div class="p-6 bg-secondary rounded-lg border border-color" transition:slide>
	<!-- Section Title -->
	<div class="mb-6">
		<h3 class="text-lg font-semibold text-primary mb-2">Export Video</h3>
		<p class="text-thirdly text-sm">
			Configure your video export settings and select the portion to export.
		</p>
	</div>

	<!-- Time Range Selection -->
	<div class="mb-6">
		<h4 class="text-base font-medium text-secondary mb-3">Export Range</h4>
		<p class="text-thirdly text-sm mb-4">Select the time range of your video to export:</p>

		<div class="bg-accent rounded-lg p-4 border border-color">
			<div class="grid grid-cols-1 grid-rows-2 gap-4">
				<!-- Start Time -->
				<TimeInput label="Start Time" bind:value={globalState.getExportState.videoStartTime} />

				<!-- End Time -->
				<TimeInput label="End Time" bind:value={globalState.getExportState.videoEndTime} />
			</div>

			<!-- Duration Preview -->
			<div class="mt-4 p-3 bg-secondary rounded-lg border border-color">
				<div class="flex items-center justify-between text-sm">
					<span class="text-secondary">Export Duration:</span>
					<span class="text-accent-primary font-medium">
						{formatDuration(
							Math.max(
								0,
								(globalState.getExportState.videoEndTime || 0) -
									(globalState.getExportState.videoStartTime || 0)
							)
						)}
					</span>
				</div>
			</div>

			<!-- Verse Range Preview -->
			<div class="mt-4 p-3 bg-secondary rounded-lg border border-color">
				<div class="flex items-center justify-between text-sm">
					<span class="text-secondary min-w-[150px]">Export Verse Range:</span>
					<span class="text-accent-primary font-medium">
						{VerseRange.getVerseRange(
							globalState.getExportState.videoStartTime,
							globalState.getExportState.videoEndTime
						).toString()}
					</span>
				</div>
			</div>
		</div>
	</div>

	<div class="mb-6">
		<h4 class="text-base font-medium text-secondary mb-3">Video Quality & Orientation</h4>
		<div class="bg-accent rounded-lg p-4 border border-color">
			<Style
				style={globalState.getStyle('global', 'video-dimension')!}
				target={'global'}
				applyValueSimple={(v) => {
					globalState.getStyle('global', 'video-dimension')!.value = v;
				}}
				disabled={false}
			/>
		</div>
	</div>

	<!-- Export Settings -->
	<div class="mb-6">
		<h4 class="text-base font-medium text-secondary mb-3">Export Information</h4>
		<div class="bg-accent rounded-lg p-4 border border-color">
			<div class="space-y-3">
				<div class="flex items-start gap-3">
					<div class="w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0"></div>
					<div>
						<span class="text-secondary text-sm font-medium">Screen Recording</span>
						<p class="text-thirdly text-xs mt-1">
							The video will be exported by recording the screen during playback
						</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<div class="w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0"></div>
					<div>
						<span class="text-secondary text-sm font-medium">Quality Settings</span>
						{#await videoDimensions() then dimensions}
							<p class="text-thirdly text-xs mt-1">
								The video will be recorded at {dimensions.width}x{dimensions.height} resolution due to
								your screen resolution limitations. It will then be processed to match your project's
								Style settings.
							</p>
						{/await}
					</div>
				</div>
				<div class="flex items-start gap-3">
					<div class="w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0"></div>
					<div>
						<span class="text-secondary text-sm font-medium">Audio Included</span>
						<p class="text-thirdly text-xs mt-1">
							Both recitation audio and system audio will be captured
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Export Button -->
	<div class="flex flex-col items-center">
		<button class="btn-accent px-6 py-3 font-medium" onclick={Exporter.exportVideo}>
			Export Video
		</button>
		<p class="text-thirdly text-xs mt-2 text-center">
			Start the video export process with your selected time range
		</p>
	</div>
</div>
