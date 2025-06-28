<script lang="ts">
	let {
		text,
		resolve
	}: {
		text: string;
		resolve: (result: boolean) => void;
	} = $props();
</script>

<div
	class="bg-secondary border-color border rounded-4xl w-[600px] px-4 pt-6 pb-4 shadow-2xl shadow-black flex flex-col relative"
>
	<p class="mb-3">Confirm</p>

	<hr />

	<p class="text-secondary mt-4">{text}</p>

	<div class="flex justify-end mt-3">
		<button
			class="btn px-4 py-2 mr-2"
			onclick={() => {
				resolve(false);
			}}
		>
			Cancel
		</button>
		<button
			class="btn-accent px-4 py-2"
			onclick={() => {
				resolve(true);
			}}
		>
			Confirm
		</button>
	</div>
</div>
