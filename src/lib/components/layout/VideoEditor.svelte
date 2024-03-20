<script lang="ts">
	import { onMount } from 'svelte';
	import ClipManager from '../clipmanager/ClipManager.svelte';
	import RecordRTC from 'recordrtc';

	let canvas: HTMLCanvasElement;
	let context: CanvasRenderingContext2D;

	onMount(async () => {
		console.log('VideoEditor mounted');

		// display the https://www.w3schools.com/html/mov_bbb.mp4 video in the canvas
		canvas = document.getElementById('canvas') as HTMLCanvasElement;
		context = canvas.getContext('2d')!;

		let video = document.createElement('video');
		video.src = 'https://www.w3schools.com/html/mov_bbb.mp4';
		video.autoplay = true;

		video.addEventListener('play', () => {
			let timer = setInterval(() => {
				if (!video.paused && !video.ended) {
					context.drawImage(video, 0, 0, canvas.width, canvas.height);
				} else {
					clearInterval(timer);
				}
			}, 1000 / 30);
		});

		await startRecording();
	});

	// Function to start recording
	async function startRecording() {
		try {
			// Initialize the media stream from the canvas
			const stream = canvas.captureStream() as MediaStream;

			// Start recording
			const recorder = new RecordRTC(stream, {
				type: 'canvas',
				disableLogs: true
			});

			// Start recording for 5 seconds
			recorder.startRecording();

			setTimeout(() => {
				recorder.stopRecording(() => {
					// Save the recorded video to a file
					const blob = recorder.getBlob();
					const videoUrl = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = videoUrl;
					a.download = 'recorded_video.webm';
					document.body.appendChild(a);
					a.click();
					window.URL.revokeObjectURL(videoUrl);
					console.log('Recording stopped');
				});
			}, 5000);
		} catch (error) {
			console.error(error);
		}
	}
</script>

<div class="flex-row flex w-full h-full">
	<!-- Quran and clip explorer -->
	<section class="w-[25%] min-w-[220px]">
		<ClipManager />
	</section>

	<section class="flex-grow flex flex-row divide-x-4 divide-[#413f3f]">
		<!-- Editor -->
		<section class="w-full divide-y-4 divide-[#413f3f]">
			<!-- Words selector -->
			<section class="h-[65%]">
				<canvas id="canvas" class="canvas w-full h-full"> </canvas>
			</section>

			<!-- Timeline -->
			<section class="h-[35%]"></section>
		</section>
	</section>
</div>
