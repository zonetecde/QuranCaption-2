<script lang="ts">
	import Timeline from '$lib/components/projectEditor/timeline/Timeline.svelte';
	import VideoPreview from '$lib/components/projectEditor/videoPreview/VideoPreview.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { projectService } from '$lib/services/ProjectService';
	import { invoke } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';

	let hasRecordStarted = $state(false);

	onMount(async () => {
		// Récupère le fichier du projet à exporter.
		// L'id se trouve dans l'url, paramètre "id"
		const id = new URLSearchParams(window.location.search).get('id');
		if (id) {
			// Récupère le projet correspondant à l'id
			globalState.currentProject = await projectService.load(Number(id), false, true);

			// Prépare les paramètres pour exporter la vidéo
			globalState.getVideoPreviewState.isFullscreen = true; // Mettre la vidéo en plein écran
			globalState.getVideoPreviewState.isPlaying = false; // Mettre la vidéo en pause
			globalState.getTimelineState.cursorPosition = globalState.getExportState.videoStartTime; // Revenir au début de la timeline
			globalState.getTimelineState.movePreviewTo = globalState.getExportState.videoStartTime; // Revenir au début de la timeline

			setTimeout(async () => {
				// Enlève tout les styles `tranform` de la div d'id `preview-container` et met
				// l'inset à 0 (sinon la videoPreview prend que 50% de l'écran, je sais pas pourquoi)
				const previewContainer = document.getElementById('preview-container');
				if (previewContainer) {
					previewContainer.style.transform = '';
					previewContainer.style.inset = '';
				}

				// Lance la demande de record
				try {
					rec = await startRecord(60);
				} catch (e) {
					cancelExport();
					return;
				}

				// Quand on arrive ici, la personne a démarré le record.
				hasRecordStarted = true;

				// Joue la vidéo
				videoPreview!.togglePlayPause();

				setTimeout(() => {
					console.log('ending record now');
					endRecord();
				}, globalState.getExportState.videoEndTime - globalState.getExportState.videoStartTime);
			}, 0);
		}
	});

	function endRecord() {
		rec?.stop();
	}

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

	let rec: { recorder: MediaRecorder; stop: () => void; cleanup: () => void } | null = null;
	let videoPreview: VideoPreview | undefined = $state(undefined);

	function cancelExport() {}
</script>

{#if globalState.currentProject}
	<div class="absolute inset-0 w-screen h-screen">
		<VideoPreview bind:this={videoPreview} showControls={false} />
		<div class="hidden">
			<Timeline />
		</div>
	</div>

	<!-- Avant de record, on dit à l'utilisateur de sélectionné la fenêtre -->
	{#if !hasRecordStarted}
		<div
			class="absolute inset-0 w-screen pt-[350px] h-screen bg-black/80 backdrop-blur-sm flex items-center justify-center"
		>
			<div class="text-center max-w-2xl px-8">
				<!-- Arrow pointing up-center towards popup -->
				<div class="flex justify-center mb-8">
					<svg
						class="w-20 h-20 text-white animate-bounce"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="3"
							d="M12 19V5M5 12l7-7 7 7"
						/>
					</svg>
				</div>

				<!-- Main instruction text -->
				<h1 class="text-4xl font-bold text-white mb-6">Select Screen to Record</h1>

				<div class="text-xl text-gray-200 leading-relaxed space-y-4">
					<p>A popup window will appear asking you to choose which screen to share.</p>
					<p class="font-semibold text-yellow-300">Please select the window with title:</p>
					<div
						class="bg-gray-800 border border-gray-600 rounded-lg p-4 font-mono text-lg text-green-400"
					>
						"QC - {globalState.currentProject!.detail.id}"
					</div>
					<p class="text-xl font-semibold text-white mt-6">
						Then click the <span class="bg-blue-600 px-3 py-1 rounded font-bold">Share</span> button
						to start recording
					</p>
				</div>
			</div>
		</div>
	{/if}
{/if}
