<script lang="ts">
	import toast, { Toaster } from 'svelte-french-toast';
	import '../app.css';
	import { onMount } from 'svelte';
	import { isCtrlPressed, spaceBarPressed } from '$lib/stores/ShortcutStore';
	import { currentProject, updateUsersProjects } from '$lib/stores/ProjectStore';
	import { Mushaf, getQuran } from '$lib/stores/QuranStore';
	import {
		cursorPosition,
		forceUpdateCurrentPlayingMedia,
		getTimelineTotalDuration
	} from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';

	onMount(() => {
		window.onkeydown = (e) => {
			if (e.key === 's' && e.ctrlKey) {
				e.preventDefault();
				updateUsersProjects($currentProject);
				toast.success('Project saved');
			} else if (e.key === 'Control') {
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
				e.preventDefault();
				cursorPosition.update((value) => value - 3000);
				if ($cursorPosition < 0) cursorPosition.set(0);
				if ($isPreviewPlaying) forceUpdateCurrentPlayingMedia.set(true); // Recalcule le clip en cours de lecture
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				cursorPosition.update((value) => value + 3000);
				if ($isPreviewPlaying) forceUpdateCurrentPlayingMedia.set(true); // Recalcule le clip en cours de lecture
			}
		};

		window.onkeyup = (e) => {
			if (e.key === 'Control') {
				isCtrlPressed.set(false);
			}
		};

		getQuran();
	});
</script>

<Toaster />
<slot />
