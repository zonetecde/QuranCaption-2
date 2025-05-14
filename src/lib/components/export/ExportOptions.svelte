<script lang="ts">
	import { spaceBarPressed } from '$lib/stores/ShortcutStore';
	import { cursorPosition } from '$lib/stores/TimelineStore';
	import { getCurrentCursorTime } from '$lib/stores/VideoPreviewStore';
	import toast from 'svelte-french-toast';

	let startTime: string = '';
	let endTime: string = '';

	function millisecondsToTime(ms: number): string {
		const milliseconds = Math.round((ms % 1000) / 10);
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		const formattedHours = hours.toString().padStart(2, '0');
		const formattedMinutes = (minutes % 60).toString().padStart(2, '0');
		const formattedSeconds = (seconds % 60).toString().padStart(2, '0');
		const formattedMilliseconds = milliseconds.toString().padStart(2, '0');

		return `${formattedHours}:${formattedMinutes}:${formattedSeconds}:${formattedMilliseconds}`;
	}

	async function handleSetCurrentTime(inputId: string) {
		switch (inputId) {
			case 'start-time':
				startTime = millisecondsToTime(getCurrentCursorTime());
				break;
			case 'end-time':
				endTime = millisecondsToTime(getCurrentCursorTime());
				break;
		}
	}

	function validateTimeInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		const pattern = /^([0-9]{2}):([0-9]{2}):([0-9]{2}):([0-9]{2})$/;

		if (!pattern.test(value) && value !== '') {
			toast.error('Required format: HH:MM:SS:ms');
		} else {
			input.setCustomValidity('');
		}
	}
</script>

<div class="flex flex-col gap-4 bg-[#1a1b1a] p-4 h-full border-l-4 border-[#252725]">
	<h1 class="text-2xl font-bold text-center mt-5">Export options</h1>

	<!-- start time input -->
	<div class="flex flex-col gap-2">
		<label for="start-time" class="text-sm font-bold">Start time (HH:MM:SS:cc)</label>
		<div class="flex gap-2">
			<input
				type="text"
				id="start-time"
				bind:value={startTime}
				class="flex-1 p-2 rounded-md bg-[#1c2c29] text-white"
				pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}"
				placeholder="00:00:00:00"
				on:blur={validateTimeInput}
			/>
			<button
				class="px-3 py-1 bg-[#2a3a37] hover:bg-[#3a4a47] rounded-md text-sm"
				on:click={() => handleSetCurrentTime('start-time')}
			>
				Set current
			</button>
		</div>
	</div>

	<!-- end time input -->
	<div class="flex flex-col gap-2">
		<label for="end-time" class="text-sm font-bold">End time (HH:MM:SS:cc)</label>
		<div class="flex gap-2">
			<input
				type="text"
				id="end-time"
				bind:value={endTime}
				class="flex-1 p-2 rounded-md bg-[#1c2c29] text-white"
				pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}"
				placeholder="00:00:00:00"
				on:blur={validateTimeInput}
			/>
			<button
				class="px-3 py-1 bg-[#2a3a37] hover:bg-[#3a4a47] rounded-md text-sm"
				on:click={() => handleSetCurrentTime('end-time')}
			>
				Set current
			</button>
		</div>
	</div>
</div>
