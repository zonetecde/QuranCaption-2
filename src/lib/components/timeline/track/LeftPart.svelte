<script lang="ts">
	export let classes = '';
</script>

<div
	class="w-24 lg:w-40 h-full bg-[#141212] border-r-2 border-y-2 border-[#1d1b1b] sticky left-0 p-1.5 flex flex-col z-20 {classes}"
>
	<slot />
</div>
