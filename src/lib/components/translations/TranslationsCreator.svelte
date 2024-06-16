<script>
	import { addNewTranslationPopupVisibility } from '$lib/stores/LayoutStore';
</script>

<div class="bg-[#0f0f0f] w-full h-full overflow-y-auto flex flex-col">
	<header>
		<button
			class="bg-[#214627] text-white p-2 rounded-br-lg flex gap-x-2 hover:bg-[#17311b] duration-100"
			on:click={() => addNewTranslationPopupVisibility.set(true)}
			><svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="size-6"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
			</svg>
			Add a new translation</button
		>
	</header>
</div>
