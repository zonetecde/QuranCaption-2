<script lang="ts">
	import { Duration } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { invoke } from '@tauri-apps/api/core';

	let {
		togglePlayPause
	}: {
		togglePlayPause: () => void;
	} = $props();

	let isPlaying = $derived(() => globalState.getCurrentVideoPreviewState.isPlaying);

	let videoDuration = $derived(() =>
		globalState.currentProject!.content.timeline.getLongestTrackDuration().getFormattedTime(false)
	);

	let currentDuration = $derived(() =>
		new Duration(
			globalState.currentProject!.projectEditorState.timeline.cursorPosition
		).getFormattedTime(false, true)
	);

	let rec: any;

	async function startRecord(fps = 60) {
		// 1) capture écran (peut ne pas fournir 60fps)
		const displayStream = await navigator.mediaDevices.getDisplayMedia({
			video: { frameRate: { ideal: fps, max: fps }, width: 1920, height: 1080 },
			audio: true
		});

		// 2) crée video cachée pour lire le stream source
		const video = document.createElement('video');
		video.srcObject = displayStream;
		video.muted = true;
		await video.play();

		// 3) canvas pour forcer la cadence voulue
		const canvas = document.createElement('canvas');
		canvas.width = video.videoWidth || 1280;
		canvas.height = video.videoHeight || 720;
		const ctx = canvas.getContext('2d')!;

		// dessine à la cadence souhaitée
		const interval = 1000 / fps;
		let drawing = true;
		const drawLoop = () => {
			if (!drawing) return;
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			setTimeout(drawLoop, interval);
		};
		drawLoop();

		// 4) enregistre le stream du canvas (contrôle réel du fps)
		const stream = (canvas as HTMLCanvasElement).captureStream(fps);
		// ajouter piste audio si besoin (la première piste audio du displayStream)
		const audioTrack = displayStream.getAudioTracks()[0];
		if (audioTrack) stream.addTrack(audioTrack);

		// 5) config MediaRecorder — vérifier support mime
		const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
			? 'video/webm;codecs=vp9'
			: MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
				? 'video/webm;codecs=vp8'
				: 'video/webm';
		const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
		const chunks: Blob[] = [];
		rec.ondataavailable = (e) => {
			if (e.data && e.data.size) chunks.push(e.data);
		};

		rec.onstop = async () => {
			drawing = false;
			video.pause();
			// combine
			const blob = new Blob(chunks, { type: 'video/webm' });
			const arrayBuf = await blob.arrayBuffer();

			// Option A: sauvegarde locale "download"
			const file = new File([arrayBuf], 'recording.webm', { type: 'video/webm' });
			const url = URL.createObjectURL(file);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'recording.webm';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			// Option B: envoyer au backend Tauri (commande `save_recording` que tu as ajoutée)
			// convertit en tableau de bytes et invoque la commande
			try {
				const bytes = Array.from(new Uint8Array(arrayBuf));
				const savedPath = await invoke<string>('save_recording', { data: bytes });
				console.log('Saved to:', savedPath);
			} catch (err) {
				console.error('save_recording failed', err);
			}
		};

		rec.start();
		// retourne un objet pour pouvoir arrêter plus tard
		return {
			recorder: rec,
			stop: () => rec.stop(),
			cleanup: () => {
				drawing = false;
				video.pause();
				displayStream.getTracks().forEach((t) => t.stop());
			}
		};
	}

	async function startTest() {
		rec = await startRecord(60);
	}

	function endTest(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		rec?.stop();
	}
</script>

<div class="bg-primary h-10 w-full flex items-center justify-center relative pt-0.25 rounded-t-xl">
	<!-- Timestamp dans la vidéo -->
	<section class="absolute left-3 monospaced">
		{currentDuration()} / {videoDuration()}
	</section>

	<!-- play/pause button with material icons -->
	<button
		class="flex items-center justify-center w-8 h-8 text-white hover:bg-gray-700 rounded-full transition-colors cursor-pointer duration-200"
		onclick={togglePlayPause}
	>
		<span class="material-icons text-xl pt-0.25">
			{isPlaying() ? 'pause' : 'play_arrow'}
		</span>
	</button>

	<button onclick={startTest}>record test</button>
	<button onclick={endTest}>END RECORD</button>

	<!-- Toggle fullscreen -->
	<section class="absolute right-3">
		<div class="flex items-center gap-x-2">
			<p class="text-thirdly">Press F11 to toggle fullscreen</p>
			<button
				onclick={globalState.getCurrentVideoPreviewState.toggleFullScreen}
				class="flex items-center justify-center w-8 h-8 text-white hover:bg-gray-700 rounded-full transition-colors cursor-pointer duration-200"
			>
				<span class="material-icons text-xl pt-0.25">fullscreen</span>
			</button>
		</div>
	</section>
</div>
