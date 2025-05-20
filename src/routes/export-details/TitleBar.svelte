<script lang="ts">
	import { appWindow } from '@tauri-apps/api/window';

	const close = () => appWindow.hide();
</script>

<div data-tauri-drag-region>
	<p class="text-[#f0f0f0]">Export Details</p>

	<button on:click={close} aria-label="Close" class="hover:bg-black">
		<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M18 6L6 18" />
			<path d="M6 6l12 12" />
		</svg>
	</button>
</div>

<style>
	div {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: end;
		position: fixed;
		top: 0;
		background: color-mix(in srgb, black 50%, transparent);
		backdrop-filter: blur(10px);
		z-index: 2;
		user-select: none;
	}

	button {
		padding: 0.75em 1em;
		cursor: default;
	}

	svg {
		height: 1rem;
		width: 1rem;
		color: white;
		stroke: white;
	}

	p {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
	}
</style>
