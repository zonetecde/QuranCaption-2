<!--
	Component to display the asset when it is being dragged in the timeline
-->

<script lang="ts">
	import type Asset from '$lib/classes/Asset';
	import { zoom } from '$lib/stores/TimelineStore';
	import { onDestroy, onMount } from 'svelte';

	let elt: HTMLDivElement; // This element

	export let asset: Asset; // The asset being dragged

	export let startX: number; // The x position of the cursor when the dragging starts
	export let startY: number; // The y position of the cursor when the dragging starts

	export let destroy: () => void;

	/**
	 * Place the element at the cursor position when the component mounts
	 * Add event listeners for mousemove and mouseup
	 */
	onMount(() => {
		placeElement(new MouseEvent('mousemove', { clientX: startX, clientY: startY }));

		document.addEventListener('mousemove', placeElement);
		document.addEventListener('mouseup', handleStopDragging);
	});

	/**
	 * Remove the event listeners
	 */
	onDestroy(() => {
		document.removeEventListener('mousemove', placeElement);
		document.removeEventListener('mouseup', handleStopDragging);
	});

	/**
	 * Place the element at the cursor position
	 */
	function placeElement({ clientX, clientY }: MouseEvent) {
		elt.style.left = `${clientX - elt.clientWidth / 40}px`;
		elt.style.top = `${clientY - elt.clientHeight / 2}px`;
	}

	/**
	 * Stop dragging the element
	 * Destroy the component
	 */
	function handleStopDragging() {
		destroy();
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="h-16 bg-red-300 absolute cursor-grabbing z-40"
	style="width: {($zoom * asset.duration) / 1000}px;"
	bind:this={elt}
></div>
