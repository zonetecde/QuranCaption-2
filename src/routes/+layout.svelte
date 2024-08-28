<script lang="ts">
	import toast, { Toaster } from 'svelte-french-toast';
	import '../app.css';
	import { onMount } from 'svelte';
	import { isCtrlPressed, spaceBarPressed } from '$lib/stores/ShortcutStore';
	import { currentProject, updateUsersProjects } from '$lib/stores/ProjectStore';
	import { Mushaf, getEditions, getQuran } from '$lib/stores/QuranStore';
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

	onMount(() => {
		window.onkeydown = (e) => {
			if ($currentProject === undefined) return;

			if (e.key === 's' && e.ctrlKey) {
				e.preventDefault();
				updateUsersProjects($currentProject);
				toast.success('Project saved');
			}

			if ($currentPage === 'Translations') return;

			if (e.key === 'Control') {
				isCtrlPressed.set(true);
			}

			// space bar
			else if (e.key === ' ') {
				// if we are not in a input
				if (document.activeElement && document.activeElement.tagName !== 'INPUT') {
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
			// if key is F6, toggle best performance
			else if (e.key === 'F6') {
				bestPerformance.set(!$bestPerformance);
				if ($bestPerformance) {
					toast.success('Best performance mode activated');
				} else {
					toast.success('Best performance mode deactivated');
				}
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
