<script lang="ts">
	import toast, { Toaster } from 'svelte-french-toast';
	import '../app.css';
	import { onMount } from 'svelte';
	import { isCtrlPressed, spaceBarPressed } from '$lib/stores/ShortcutStore';
	import { currentProject, updateUsersProjects } from '$lib/stores/ProjectStore';
	import { Mushaf, getQuran } from '$lib/stores/QuranStore';

	onMount(() => {
		window.onkeydown = (e) => {
			if (e.key === 's' && e.ctrlKey) {
				e.preventDefault();
				updateUsersProjects($currentProject);
				toast.success('Project saved');
			}

			if (e.key === 'Control') {
				isCtrlPressed.set(true);
			}

			// space bar
			if (e.key === ' ') {
				// if we are not in a input
				if (document.activeElement && document.activeElement.tagName !== 'INPUT') {
					// play/pause the video
					e.preventDefault();
					spaceBarPressed.set(true);
				}
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
