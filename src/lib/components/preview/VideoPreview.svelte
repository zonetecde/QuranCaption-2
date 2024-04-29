<script lang="ts">
	let isPlaying = false;

	function handlePlayVideoButtonClicked(
		event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {}
</script>

<div class="w-full h-full flex flex-col">
	<div class="h-full relative bg-[#0f0d0d]">
		<video class="absolute inset-0">
			<track kind="captions" src="vtt" srclang="en" label="English" default />
		</video>
	</div>

	<section id="controles" class="h-16 w-full bg-[#141616] border-t-2 border-[#363232]">
		<div class="flex flex-row items-center justify-center h-full w-full">
			<button class="bg-slate-950 w-10 p-1 rounded-full" on:click={handlePlayVideoButtonClicked}>
				{#if isPlaying}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M15.75 5.25v13.5m-7.5-13.5v13.5"
						/>
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="ml-0.5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</section>
</div>
