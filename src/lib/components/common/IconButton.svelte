<script lang="ts">
	export let text = 'Button';
	export let classes = '';
</script>

<button class={classes} on:click>
	<div class="flex items-center hover:bg-[#ffffff1f] pl-1.5 pr-2 py-1 rounded-xl duration-150">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			class="w-6"
			stroke="currentColor"
		>
			<slot />
		</svg>
		<p class="ml-2 hidden xl:block">{@html text}</p>
	</div>
</button>
