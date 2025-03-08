<script lang="ts">
	import toast, { Toaster } from 'svelte-french-toast';
	import '../app.css';
	import { onMount } from 'svelte';
	import { isCtrlPressed, spaceBarPressed } from '$lib/stores/ShortcutStore';
	import {
		currentProject,
		downloadYoutubeChapters,
		updateUsersProjects
	} from '$lib/stores/ProjectStore';
	import { Mushaf, getEditions, getQuran, getSurahName } from '$lib/stores/QuranStore';
	import {
		cursorPosition,
		forceUpdateCurrentPlayingMedia,
		getTimelineTotalDuration
	} from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import {
		bestPerformance,
		currentPage,
		fullScreenPreview,
		getFonts
	} from '$lib/stores/LayoutStore';
	import { millisecondsToHHMMSS } from '$lib/ext/Utilities';
	import { initializeStorage } from '$lib/ext/LocalStorageWrapper';

	onMount(() => {
		// Créer le dossier pour le localStorage si il n'existe pas
		initializeStorage();

		document.addEventListener('contextmenu', (event) => event.preventDefault());

		window.onkeydown = async (e) => {
			if ($currentProject === undefined) return;

			if (e.key === 's' && e.ctrlKey) {
				e.preventDefault();
				await updateUsersProjects($currentProject);
				toast.success('Project saved');
			}

			if ($currentPage === 'Translations' && e.key !== 'F10') return;

			if (e.key === 'Control') {
				isCtrlPressed.set(true);
			}

			// space bar
			else if (e.key === ' ') {
				// if we are not in a input
				if (
					document.activeElement &&
					document.activeElement.tagName !== 'INPUT' &&
					document.activeElement.tagName !== 'TEXTAREA'
				) {
					// play/pause the video
					e.preventDefault();
					spaceBarPressed.set(true);
				}
			}

			// Flèche gauche/droite pour controler le curseur
			else if (e.key === 'ArrowLeft') {
				// Vérifie qu'on est pas dans un input
				if (document.activeElement && document.activeElement.tagName !== 'INPUT') {
					e.preventDefault();
					cursorPosition.update((value) => value - 2000);
					if ($cursorPosition < 0) cursorPosition.set(0);
					if ($isPreviewPlaying) forceUpdateCurrentPlayingMedia.set(true); // Recalcule le clip en cours de lecture
				}
			} else if (e.key === 'ArrowRight') {
				// Vérifie qu'on est pas dans un input
				if (document.activeElement && document.activeElement.tagName !== 'INPUT') {
					e.preventDefault();
					cursorPosition.update((value) => value + 2000);
					if ($isPreviewPlaying) forceUpdateCurrentPlayingMedia.set(true); // Recalcule le clip en cours de lecture
				}
			}

			// if key is F11, toggle full screen
			else if (e.key === 'F11') {
				if ($currentPage === 'Video editor' || $currentPage === 'Export')
					fullScreenPreview.set(!$fullScreenPreview);
			}
			// if key is F1, toggle best performance
			else if (e.key === 'F1') {
				bestPerformance.set(!$bestPerformance);
				$currentProject.projectSettings.bestPerformance = $bestPerformance;
				if ($bestPerformance) {
					toast.success('Best performance mode activated. Press F1 to deactivate');
				} else {
					toast.success('Best performance mode deactivated.');
				}
			}
			// if key is F10, enable experimental features
			else if (e.key === 'F10') {
				// remove from all html element that have the `experimental` class the attribute `hidden`
				const elements = document.querySelectorAll('.experimental');
				console.log(elements);
				elements.forEach((element) => {
					element.classList.remove('hidden');
				});
			}
		};

		window.onkeyup = (e) => {
			if (e.key === 'Control') {
				isCtrlPressed.set(false);
			}
		};

		getQuran();
		getEditions();
		getFonts();
	});
</script>

<Toaster />
<slot />
