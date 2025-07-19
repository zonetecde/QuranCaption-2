<script lang="ts">
	import { Asset, TrackType } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { onMount, untrack } from 'svelte';
	import { Howl } from 'howler';
	import toast from 'svelte-5-french-toast';

	let getTimelineSettings = $derived(() => {
		return globalState.currentProject!.projectEditorState.timeline;
	});
	let currentVideo = $derived(() => {
		if (getTimelineSettings().movePreviewTo)
			return untrack(() => {
				return globalState.currentProject!.content.timeline.getCurrentAssetOnTrack(TrackType.Video);
			});
	});
	let currentAudio = $derived(() => {
		if (getTimelineSettings().movePreviewTo)
			return untrack(() => {
				return globalState.currentProject!.content.timeline.getCurrentAssetOnTrack(TrackType.Audio);
			});
	});
	$inspect(currentAudio());

	let videoElement = $state<HTMLVideoElement | null>(null);

	$effect(() => {
		// Si on change la taille de la timeline, on redimensionne la vidéo pour qu'elle s'adapte à l'écran
		if (globalState.currentProject?.projectEditorState.videoPreviewHeight) {
			resizeVideoToFitScreen();
		}
	});

	$effect(() => {
		if (currentAudio()) {
			// L'audio a joué n'est plus le même, on doit le recharger
			untrack(() => {
				setupAudio();
			});
		}
	});

	$effect(() => {
		// Si le curseur bouge, alors on doit aussi mettre à jour la vidéo au bon timing
		if (globalState.currentProject?.projectEditorState.timeline.movePreviewTo) {
			untrack(() => {
				const wasPlaying = isPlaying;
				pause(); // On met en pause pour que le onplay() de Howl se délenche et seek l'audio à la bonne position

				// Met à jour la vidéo en fonction de la position du curseur
				// cursorPosition est en ms
				if (currentVideo()) {
					if (videoElement) {
						videoElement.currentTime = getCurrentVideoTimeToPlay();
					}
				}

				// Le sync de l'audio se fait dans le onplay de Howl

				if (wasPlaying) {
					play(); // Reprend la lecture si on était en train de lire
				}
			});
		}
	});
	function getCurrentAudioTimeToPlay(): number {
		const currentClip = globalState
			.currentProject!.content.timeline.tracks.find((t) => t.type === TrackType.Audio)!
			.getCurrentClip();

		if (!currentClip) return 0;

		// Le temps dans l'audio = position du curseur - début du clip
		const timeInClip = getTimelineSettings().movePreviewTo - currentClip.startTime;
		return Math.max(0, timeInClip / 1000); // Convertit en secondes pour Howler
	}

	function getCurrentVideoTimeToPlay(): number {
		const currentClip = globalState
			.currentProject!.content.timeline.tracks.find((t) => t.type === TrackType.Video)!
			.getCurrentClip();

		if (!currentClip) return 0;

		// Le temps dans la vidéo = position du curseur - début du clip
		const timeInClip = getTimelineSettings().movePreviewTo - currentClip.startTime;
		return Math.max(0, timeInClip / 1000); // Convertit en secondes pour l'élément video HTML
	}
	onMount(() => {
		resizeVideoToFitScreen();
		window.addEventListener('resize', resizeVideoToFitScreen);

		// Trigger la réactivité pour mettre la vidéo et l'audio à la position du curseur
		triggerVideoAndAudioToFitCursor();
	});

	// Effect pour s'assurer que l'événement ontimeupdate est toujours assigné
	$effect(() => {
		if (videoElement) {
			videoElement.ontimeupdate = handleTimeUpdate;
		}
	});

	function triggerVideoAndAudioToFitCursor() {
		getTimelineSettings().movePreviewTo = getTimelineSettings().cursorPosition + 1;
	}
	function handleTimeUpdate() {
		// Lorsque le temps actuel dans le composant <video> change, on met à jour le curseur de la timeline
		if (videoElement && videoElement.currentTime !== undefined && isPlaying) {
			// Calculer la position absolue dans la timeline basée sur la vidéo
			const currentVideoClip = globalState
				.currentProject!.content.timeline.tracks.find((t) => t.type === TrackType.Video)
				?.getCurrentClip();

			if (currentVideoClip) {
				// La position du curseur = début du clip + temps écoulé dans la vidéo (en ms)
				const absolutePosition = currentVideoClip.startTime + videoElement.currentTime * 1000;
				getTimelineSettings().cursorPosition = absolutePosition;
			}
		}
	}

	// Fonction séparée pour mettre à jour le curseur basé sur l'audio
	function handleAudioTimeUpdate() {
		if (audioHowl && isPlaying) {
			const currentAudioClip = globalState
				.currentProject!.content.timeline.tracks.find((t) => t.type === TrackType.Audio)
				?.getCurrentClip();

			if (currentAudioClip) {
				// .seek() retourne la position en secondes, on la convertit en ms
				const audioPositionMs = audioHowl.seek() * 1000;
				const absolutePosition = currentAudioClip.startTime + audioPositionMs;
				getTimelineSettings().cursorPosition = absolutePosition;
			}
		}
	}

	function resizeVideoToFitScreen() {
		const previewContainer = document.getElementById('preview-container');
		const preview = document.getElementById('preview');
		// Ajuste le scale de `preview` pour qu'il s'adapte au container sans jamais s'étirer
		if (previewContainer && preview) {
			// On met le 1920x1080 ici pour éviter d'avoir un effet bizarre lorsque le component load
			preview.style.width = '1920px';
			preview.style.height = '1080px'; // Si on est en plein écran, on met la vidéo à la taille de l'écran
			preview.style.minWidth = '1920px';
			preview.style.minHeight = '1080px';

			// Sinon taille du container avec 100px de moins en hauteur
			previewContainer.style.width = 'auto';
			previewContainer.style.height = 'calc(100%)';

			// reset les centrages
			previewContainer.style.position = 'relative';
			previewContainer.style.zIndex = '0';
			previewContainer.style.transform = 'none';
			previewContainer.style.top = '0';
			previewContainer.style.left = '0';

			const containerWidth = previewContainer.clientWidth;
			const containerHeight = previewContainer.clientHeight;

			const videoWidth = preview.clientWidth;
			const videoHeight = preview.clientHeight;

			const widthRatio = containerWidth / videoWidth;
			const heightRatio = containerHeight / videoHeight;

			// Utilise le plus petit ratio pour éviter l'étirement
			const scale = Math.min(widthRatio, heightRatio);

			// Applique le scale à la preview
			preview.style.transform = `scale(${scale})`;

			// met la taille de preview-container à la taille de preview
			previewContainer.style.width = `${videoWidth * scale}px`;
			previewContainer.style.height = `${videoHeight * scale}px`;

			// center the preview container horizontally
			previewContainer.style.left = '50%';
			previewContainer.style.transform = 'translateX(-50%)';

			// center the preview container vertically
			previewContainer.style.top = '50%';
			previewContainer.style.transform += ' translateY(-50%)';
		}
	}
	let audioHowl: Howl | null = null;
	let isPlaying = $state(false);
	let audioUpdateInterval: number | null = null;

	function setupAudio() {
		if (audioHowl) {
			audioHowl.unload();
			audioHowl = null;
		}
		if (audioUpdateInterval) {
			clearInterval(audioUpdateInterval);
			audioUpdateInterval = null;
		}

		const audioAsset = currentAudio();
		if (audioAsset) {
			audioHowl = new Howl({
				src: [convertFileSrc(audioAsset.filePath)],
				html5: true, // important pour les gros fichiers et le VBR
				onplay: () => {
					// Sync la position dans l'audio avec la position du curseur
					seekAudio(getCurrentAudioTimeToPlay());

					// Démarre la mise à jour régulière du curseur basé sur l'audio (seulement s'il n'y a pas de vidéo)
					if (!currentVideo() && !audioUpdateInterval) {
						audioUpdateInterval = setInterval(handleAudioTimeUpdate, 100); // Met à jour toutes les 100ms
					}
				},
				onpause: () => {
					// Arrête la mise à jour du curseur
					if (audioUpdateInterval) {
						clearInterval(audioUpdateInterval);
						audioUpdateInterval = null;
					}
				},
				onend: () => {
					// Arrête la mise à jour du curseur
					if (audioUpdateInterval) {
						clearInterval(audioUpdateInterval);
						audioUpdateInterval = null;
					}
					// Quand l'audio se termine, passe au suivant
					goNextAudio();
				}
			});
		}
	}
	function play(fromButton: boolean = false) {
		// Si il n'y a aucun clip vidéo ou audio, on ne peut pas jouer
		if (!currentVideo() && !currentAudio()) {
			if (fromButton)
				toast('No video or audio to play. Please add some media to the timeline.', {
					duration: 5000
				});
			return;
		}

		isPlaying = true;

		if (audioHowl) {
			audioHowl.play();
		}
		if (videoElement) {
			videoElement.play();
		}
	}

	function pause() {
		isPlaying = false;

		if (audioHowl) {
			audioHowl.pause();
		}
		if (videoElement) {
			videoElement.pause();
		}

		// Permet de reprendre la vidéo et l'audio à la position du curseur pour la prochaine fois
		getTimelineSettings().movePreviewTo = getTimelineSettings().cursorPosition;

		// Arrête la mise à jour du curseur audio
		if (audioUpdateInterval) {
			clearInterval(audioUpdateInterval);
			audioUpdateInterval = null;
		}
	}

	function seekAudio(val: number) {
		if (audioHowl) {
			audioHowl.seek(val);
		}
	}
	function goNextVideo() {
		// Quand une vidéo se termine, on cherche le prochain média (vidéo ou audio)
		goToNextMedia(true, false);
	}
	function goNextAudio() {
		// Quand un audio se termine, on cherche le prochain média (vidéo ou audio)
		goToNextMedia(false, true);
	}

	function goToNextMedia(video: boolean = true, audio: boolean = true) {
		const currentTime = getTimelineSettings().cursorPosition;

		// Trouve tous les clips suivants (vidéo et audio) après la position actuelle
		const videoTrack = globalState.currentProject!.content.timeline.tracks.find(
			(t) => t.type === TrackType.Video
		);
		const audioTrack = globalState.currentProject!.content.timeline.tracks.find(
			(t) => t.type === TrackType.Audio
		);

		const nextClips: { clip: any; startTime: number }[] = [];

		if (videoTrack && video) {
			const nextVideoClip = videoTrack.clips.find((clip) => clip.startTime > currentTime);
			if (nextVideoClip) {
				nextClips.push({ clip: nextVideoClip, startTime: nextVideoClip.startTime });
			}
		}

		if (audioTrack && audio) {
			const nextAudioClip = audioTrack.clips.find((clip) => clip.startTime > currentTime);
			if (nextAudioClip) {
				nextClips.push({ clip: nextAudioClip, startTime: nextAudioClip.startTime });
			}
		}

		if (nextClips.length > 0) {
			// Trouve le clip qui commence le plus tôt
			const earliestClip = nextClips.reduce((earliest, current) =>
				current.startTime < earliest.startTime ? current : earliest
			);

			// Avance le curseur au début du prochain clip
			getTimelineSettings().cursorPosition = earliestClip.startTime;
		}

		triggerVideoAndAudioToFitCursor();
	}
</script>

<div
	class="w-full h-full flex flex-col relative overflow-hidden background-primary"
	id="preview-container"
>
	<div class={'relative origin-top-left bg-black'} id="preview">
		{#if currentVideo()}
			<video
				bind:this={videoElement}
				src={convertFileSrc(currentVideo()!.filePath)}
				muted
				onended={goNextVideo}
			></video>
		{/if}
	</div>
</div>

<button
	class="absolute bottom-2 left-2 z-10 bg-[var(--bg-secondary)] text-[var(--text-secondary)] p-2 rounded hover:bg-[var(--bg-accent)] transition-colors"
	onclick={() => {
		if (isPlaying) {
			pause();
		} else {
			play(true);
		}
	}}
>
	{isPlaying ? 'Pause' : 'Play'}
</button>

<style>
	#preview-container {
		height: 100%;
		min-height: 0;
	}
	#preview {
		height: 100%;
		min-height: 0;
	}
	video {
		height: 100% !important;
		width: 100% !important;
		min-height: 0 !important;
		display: block;
	}
</style>
