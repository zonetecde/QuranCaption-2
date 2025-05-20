<script lang="ts">
	import { initializeStorage } from '$lib/ext/LocalStorageWrapper';
	import {
		bestPerformance,
		currentPage,
		fullScreenPreview,
		getFonts,
		videoSpeed
	} from '$lib/stores/LayoutStore';
	import { currentProject, updateUsersProjects } from '$lib/stores/ProjectStore';
	import { getEditions, loadQuran } from '$lib/stores/QuranStore';
	import {
		isCtrlPressed,
		isEscapePressed,
		isSpeedButtonPressed,
		spaceBarPressed
	} from '$lib/stores/ShortcutStore';
	import { cursorPosition, forceUpdateCurrentPlayingMedia } from '$lib/stores/TimelineStore';
	import { isPreviewPlaying } from '$lib/stores/VideoPreviewStore';
	import { onMount } from 'svelte';
	import toast, { Toaster } from 'svelte-french-toast';
	import '../app.css';
	import { loadOtherTexts } from '$lib/stores/OtherTextsStore';
	import { listen } from '@tauri-apps/api/event';
	import { appWindow } from '@tauri-apps/api/window';
	import { invoke, window as tauriWindow } from '@tauri-apps/api';

	onMount(async () => {
		initializeStorage();
		loadQuran();
		loadOtherTexts();
		getEditions();
		getFonts();

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
				elements.forEach((element) => {
					element.classList.remove('hidden');
				});
			} else if (e.key === 'PageUp' || e.key === 'PageDown') {
				if ($currentPage === 'Subtitles editor' && $isSpeedButtonPressed === false) {
					isSpeedButtonPressed.set(true);
					videoSpeed.set($videoSpeed + 1);
				}
			} else if (e.key === 'Escape') {
				// if in full screen, exit full screen
				if ($fullScreenPreview) {
					fullScreenPreview.set(false);
				}
			}
		};

		window.onkeyup = (e) => {
			if (e.key === 'Control') {
				isCtrlPressed.set(false);
			} else if (e.key === 'PageUp' || e.key === 'PageDown') {
				if ($currentPage === 'Subtitles editor' && $isSpeedButtonPressed === true) {
					isSpeedButtonPressed.set(false);
					videoSpeed.set($videoSpeed - 1);
				}
			} else if (e.key === 'Escape') {
				isEscapePressed.set(true);
			}
		};

		// Si on ferme la fenêtre du logiciel, on ferme aussi les fenêtre d'export (cancel l'export)
		appWindow.onCloseRequested(async (e) => {
			if (e.windowLabel !== 'main') {
				return;
			}

			const webview = tauriWindow.getAll();

			for (const w of webview) {
				if (w.label !== 'main') {
					w.close();
				}
			}

			// and close the main window
			appWindow.close();
			await invoke('close');
		});
	});
</script>

<Toaster />
<slot />

{#if $fullScreenPreview}
	<div class="absolute inset-0 bg-black z-[20]"></div>
{/if}
