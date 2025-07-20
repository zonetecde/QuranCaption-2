<script lang="ts">
	import { Asset, TrackType } from '$lib/classes';
	import { globalState } from '$lib/runes/main.svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { Howl } from 'howler';
	import toast from 'svelte-5-french-toast';
	import ShortcutService from '$lib/services/ShortcutService';

	// === ÉTATS RÉACTIFS DÉRIVÉS ===
	// Récupère les paramètres de la timeline depuis l'état global
	let getTimelineSettings = $derived(() => {
		return globalState.currentProject!.projectEditorState.timeline;
	});

	// Récupère l'asset vidéo actuellement sous le curseur de la timeline
	// Seulement si movePreviewTo est défini (pour éviter les recalculs inutiles)
	let currentVideo = $derived(() => {
		if (getTimelineSettings().movePreviewTo)
			return untrack(() => {
				return globalState.currentProject!.content.timeline.getCurrentAssetOnTrack(TrackType.Video);
			});
	});

	// Récupère l'asset audio actuellement sous le curseur de la timeline
	let currentAudio = $derived(() => {
		if (getTimelineSettings().movePreviewTo)
			return untrack(() => {
				return globalState.currentProject!.content.timeline.getCurrentAssetOnTrack(TrackType.Audio);
			});
	});

	// === ÉTATS LOCAUX ===
	let videoElement = $state<HTMLVideoElement | null>(null); // Référence à l'élément <video> HTML

	// === EFFETS RÉACTIFS ===

	// Effect qui redimensionne la vidéo quand la hauteur de la prévisualisation change
	$effect(() => {
		if (globalState.currentProject?.projectEditorState.videoPreviewHeight) {
			resizeVideoToFitScreen();
		}
	});

	// Effect qui recharge l'audio quand l'asset audio change
	$effect(() => {
		if (currentAudio()) {
			untrack(() => {
				setupAudio(); // Configure le nouveau fichier audio avec Howler
			});
		}
	});

	// Effect principal de synchronisation - se déclenche quand le curseur bouge
	$effect(() => {
		if (globalState.currentProject?.projectEditorState.timeline.movePreviewTo) {
			untrack(() => {
				const wasPlaying = isPlaying;
				pause(); // Met en pause pour synchroniser proprement

				// Synchronise la vidéo avec la position du curseur
				if (currentVideo()) {
					if (videoElement) {
						videoElement.currentTime = getCurrentVideoTimeToPlay();
					}
				}

				// La synchronisation audio se fait automatiquement dans le callback onplay de Howl

				if (wasPlaying) {
					play(); // Reprend la lecture si on était en train de lire
				}
			});
		}
	});

	// === FONCTIONS DE CALCUL DE TEMPS ===

	/**
	 * Calcule le temps à jouer dans l'audio en fonction de la position du curseur
	 * @returns Temps en secondes dans l'audio
	 */
	function getCurrentAudioTimeToPlay(): number {
		const currentClip = globalState
			.currentProject!.content.timeline.tracks.find((t) => t.type === TrackType.Audio)!
			.getCurrentClip();

		if (!currentClip) return 0;

		// Le temps dans l'audio = position du curseur - début du clip
		const timeInClip = getTimelineSettings().movePreviewTo - currentClip.startTime;
		return Math.max(0, timeInClip / 1000); // Convertit en secondes pour Howler
	}

	/**
	 * Calcule le temps à jouer dans la vidéo en fonction de la position du curseur
	 * @returns Temps en secondes dans la vidéo
	 */
	function getCurrentVideoTimeToPlay(): number {
		const currentClip = globalState
			.currentProject!.content.timeline.tracks.find((t) => t.type === TrackType.Video)!
			.getCurrentClip();

		if (!currentClip) return 0;

		// Le temps dans la vidéo = position du curseur - début du clip
		const timeInClip = getTimelineSettings().movePreviewTo - currentClip.startTime;
		return Math.max(0, timeInClip / 1000); // Convertit en secondes pour l'élément video HTML
	}

	// === CYCLE DE VIE DU COMPOSANT ===
	onMount(() => {
		resizeVideoToFitScreen(); // Redimensionne initial
		window.addEventListener('resize', resizeVideoToFitScreen); // Écoute le redimensionnement de fenêtre

		// Force la synchronisation initiale vidéo/audio avec la position du curseur
		triggerVideoAndAudioToFitCursor();
		// Set les shortcuts pour le preview
		ShortcutService.registerShortcut({
			key: ' ',
			description: 'Play/Pause the video preview',
			category: 'Video Preview',
			preventDefault: true,
			onKeyDown: (e) => {
				if (isPlaying) {
					pause();
				} else {
					play(true);
				}
			}
		});

		ShortcutService.registerShortcut({
			key: 'arrowright',
			description: 'Move preview forward by 2 seconds',
			category: 'Video Preview',
			preventDefault: true,
			onKeyDown: (e) => {
				const currentTime = getTimelineSettings().cursorPosition;
				getTimelineSettings().cursorPosition = currentTime + 2000; // Avance de 2 secondes
				getTimelineSettings().movePreviewTo = currentTime + 2000;
			}
		});

		ShortcutService.registerShortcut({
			key: 'arrowleft',
			description: 'Move preview backward by 2 seconds',
			category: 'Video Preview',
			preventDefault: true,
			onKeyDown: (e) => {
				const currentTime = getTimelineSettings().cursorPosition;
				getTimelineSettings().cursorPosition = Math.max(1, currentTime - 2000); // Recule de 2 secondes
				getTimelineSettings().movePreviewTo = Math.max(1, currentTime - 2000);
			}
		});

		ShortcutService.registerShortcut({
			key: ['pagedown', 'pageup'],
			description: 'Set video speed to 2x',
			category: 'Video Preview',
			preventDefault: true,
			onKeyDown: (e) => {
				audioSpeed = 2;
				if (videoElement) {
					videoElement.playbackRate = 2; // Double la vitesse de lecture
				}
				if (audioHowl) {
					audioHowl.rate(2); // Double la vitesse de lecture audio
				}
			},
			onKeyUp: (e) => {
				audioSpeed = 1; // Réinitialise la vitesse audio

				if (videoElement) {
					videoElement.playbackRate = 1;
				}
				if (audioHowl) {
					audioHowl.rate(1);
				}
			}
		});
	});

	onDestroy(() => {
		pause(); // Met en pause la lecture pour éviter les fuites de mémoire

		// Enlève tout les shortcuts enregistrés
		ShortcutService.unregisterShortcut(' ');
		ShortcutService.unregisterShortcut('arrowright');
		ShortcutService.unregisterShortcut('arrowleft');
		ShortcutService.unregisterShortcut('pagedown');
	});

	// Effect pour s'assurer que l'événement ontimeupdate est toujours assigné à l'élément vidéo
	$effect(() => {
		if (videoElement) {
			videoElement.ontimeupdate = handleVideoTimeUpdate;
		}
	});

	/**
	 * Force le déclenchement de la synchronisation en modifiant movePreviewTo
	 * Trick pour déclencher l'effect de synchronisation
	 */
	function triggerVideoAndAudioToFitCursor() {
		getTimelineSettings().movePreviewTo = getTimelineSettings().cursorPosition + 1;
	}

	// === GESTION DES MISES À JOUR DE TEMPS ===

	/**
	 * Gestionnaire principal pour les mises à jour du curseur de la timeline
	 * Priorité à l'audio si disponible, sinon utilise la vidéo
	 */
	function handleVideoTimeUpdate() {
		if (audioUpdateInterval) {
			// Si on a un intervalle de mise à jour audio, on l'utilise car plus précis
			handleAudioTimeUpdate();
			return;
		}

		// Utilise la vidéo pour mettre à jour le curseur de la timeline
		if (videoElement && videoElement.currentTime !== undefined && isPlaying) {
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

	/**
	 * Met à jour le curseur de la timeline basé sur la position de l'audio
	 * Plus précis que la vidéo pour la synchronisation
	 */
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

	// === GESTION DU REDIMENSIONNEMENT ===

	/**
	 * Redimensionne la vidéo pour qu'elle s'adapte au conteneur sans déformation
	 * Utilise un système de mise à l'échelle avec ratio préservé
	 */
	function resizeVideoToFitScreen() {
		const previewContainer = document.getElementById('preview-container');
		const preview = document.getElementById('preview');

		if (previewContainer && preview) {
			// Configuration initiale : taille fixe 1920x1080 pour éviter les effets bizarres au chargement
			preview.style.width = '1920px';
			preview.style.height = '1080px';
			preview.style.minWidth = '1920px';
			preview.style.minHeight = '1080px';

			// Configuration du conteneur
			previewContainer.style.width = 'auto';
			previewContainer.style.height = 'calc(100%)';

			// Reset des transformations précédentes
			previewContainer.style.position = 'relative';
			previewContainer.style.zIndex = '0';
			previewContainer.style.transform = 'none';
			previewContainer.style.top = '0';
			previewContainer.style.left = '0';

			// Calcul des ratios pour le redimensionnement proportionnel
			const containerWidth = previewContainer.clientWidth;
			const containerHeight = previewContainer.clientHeight;
			const videoWidth = preview.clientWidth;
			const videoHeight = preview.clientHeight;
			const widthRatio = containerWidth / videoWidth;
			const heightRatio = containerHeight / videoHeight;

			// Utilise le plus petit ratio pour éviter l'étirement (letterboxing/pillarboxing)
			const scale = Math.min(widthRatio, heightRatio);

			// Application de la mise à l'échelle
			preview.style.transform = `scale(${scale})`;

			// Ajustement de la taille du conteneur à la nouvelle taille mise à l'échelle
			previewContainer.style.width = `${videoWidth * scale}px`;
			previewContainer.style.height = `${videoHeight * scale}px`;

			// Centrage horizontal et vertical du conteneur
			previewContainer.style.left = '50%';
			previewContainer.style.transform = 'translateX(-50%)';
			previewContainer.style.top = '50%';
			previewContainer.style.transform += ' translateY(-50%)';
		}
	}

	// === GESTION AUDIO AVEC HOWLER ===
	let audioHowl: Howl | null = null; // Instance Howler pour la lecture audio
	let isPlaying = $state(false); // État de lecture global
	let audioUpdateInterval: number | null = null; // Intervalle pour la mise à jour du curseur audio
	let audioSpeed = $state(1); // Vitesse de lecture audio
	let currentlyPlayingAudio: Asset | null | undefined = null; // L'asset audio actuellement joué

	/**
	 * Configure et initialise l'instance Howler pour l'audio actuel
	 */
	function setupAudio() {
		// Nettoyage de l'instance précédente
		if (audioHowl) {
			audioHowl.unload();
			audioHowl = null;
		}
		if (audioUpdateInterval) {
			clearInterval(audioUpdateInterval);
			audioUpdateInterval = null;
		}

		const audioAsset = currentAudio();
		currentlyPlayingAudio = audioAsset; // Met à jour l'asset actuellement joué
		if (audioAsset) {
			audioHowl = new Howl({
				src: [convertFileSrc(audioAsset.filePath)],
				html5: true, // Important pour les gros fichiers et le VBR (Variable Bit Rate)
				rate: audioSpeed, // Vitesse de lecture initiale
				onplay: () => {
					// Synchronise la position dans l'audio avec la position du curseur
					seekAudio(getCurrentAudioTimeToPlay());

					// Démarre la mise à jour régulière du curseur
					if (!audioUpdateInterval) {
						audioUpdateInterval = setInterval(handleAudioTimeUpdate, 10); // Mise à jour toutes les 10ms
					}
				},
				onpause: () => {
					// Arrête la mise à jour du curseur lors de la pause
					if (audioUpdateInterval) {
						clearInterval(audioUpdateInterval);
						audioUpdateInterval = null;
					}
				},
				onend: () => {
					// Nettoyage et passage au média suivant quand l'audio se termine
					if (audioUpdateInterval) {
						clearInterval(audioUpdateInterval);
						audioUpdateInterval = null;
					}
					goNextAudio();
				}
			});
		}
	}

	// === CONTRÔLES DE LECTURE ===

	/**
	 * Lance la lecture audio et vidéo
	 * @param fromButton - Indique si l'action vient du bouton play (pour afficher un toast si nécessaire)
	 */
	function play(fromButton: boolean = false) {
		// Vérification de la présence de médias
		if (!currentVideo() && !currentAudio()) {
			if (fromButton)
				toast('No video or audio to play. Please add some media to the timeline.', {
					duration: 5000
				});
			return;
		}

		isPlaying = true;

		// Lance la lecture audio et vidéo simultanément
		if (audioHowl) {
			audioHowl.play();
		}
		if (videoElement) {
			videoElement.play();
		}
	}

	/**
	 * Met en pause la lecture audio et vidéo
	 */
	function pause() {
		isPlaying = false;

		// Pause audio et vidéo
		if (audioHowl) {
			audioHowl.pause();
		}
		if (videoElement) {
			videoElement.pause();
		}

		// Prépare la synchronisation pour la prochaine lecture
		getTimelineSettings().movePreviewTo = getTimelineSettings().cursorPosition;

		// Arrête la mise à jour du curseur audio
		if (audioUpdateInterval) {
			clearInterval(audioUpdateInterval);
			audioUpdateInterval = null;
		}
	}

	/**
	 * Navigue vers une position spécifique dans l'audio
	 * @param val - Position en secondes
	 */
	function seekAudio(val: number) {
		if (audioHowl) {
			audioHowl.seek(val);
		}
	}

	// === NAVIGATION ENTRE MÉDIAS ===

	/**
	 * Passe au prochain média quand une vidéo se termine
	 */
	function goNextVideo() {
		goToNextMedia(true, false);
	}

	/**
	 * Passe au prochain média quand un audio se termine
	 */
	function goNextAudio() {
		goToNextMedia(false, true);
	}

	/**
	 * Trouve et navigue vers le prochain média dans la timeline
	 * @param video - Inclure les pistes vidéo dans la recherche
	 * @param audio - Inclure les pistes audio dans la recherche
	 */
	function goToNextMedia(video: boolean = true, audio: boolean = true) {
		const currentTime = getTimelineSettings().cursorPosition;

		// Récupération des pistes vidéo et audio
		const videoTrack = globalState.currentProject!.content.timeline.tracks.find(
			(t) => t.type === TrackType.Video
		);
		const audioTrack = globalState.currentProject!.content.timeline.tracks.find(
			(t) => t.type === TrackType.Audio
		);

		const nextClips: { clip: any; startTime: number }[] = [];

		// Recherche du prochain clip vidéo
		if (videoTrack && video) {
			const nextVideoClip = videoTrack.clips.find((clip) => clip.startTime > currentTime - 1000);
			if (nextVideoClip) {
				nextClips.push({ clip: nextVideoClip, startTime: nextVideoClip.startTime });
			}
		}

		// Recherche du prochain clip audio
		if (audioTrack && audio) {
			const nextAudioClip = audioTrack.clips.find((clip) => clip.startTime > currentTime - 1000);
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
			triggerVideoAndAudioToFitCursor();
		}
	}
</script>

<!-- Interface utilisateur -->
<div
	class="w-full h-full flex flex-col relative overflow-hidden background-primary"
	id="preview-container"
>
	<!-- Conteneur de la prévisualisation vidéo avec mise à l'échelle -->
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

<!-- Bouton de contrôle play/pause -->
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
	/* Styles pour assurer un dimensionnement correct */
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
