<script lang="ts">
	import toast, { Toaster } from 'svelte-french-toast';
	import '../app.css';
	import { onMount } from 'svelte';
	import { isCtrlPressed } from '$lib/stores/ShortcutStore';
	import { updateUsersProjects } from '$lib/Project';
	import { currentProject } from '$lib/stores/ProjectStore';

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
		};

		window.onkeyup = (e) => {
			if (e.key === 'Control') {
				isCtrlPressed.set(false);
			}
		};
	});
</script>

<Toaster />
<slot />
