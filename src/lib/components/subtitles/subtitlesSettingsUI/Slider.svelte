<script lang="ts">
	export let title: string;
	export let min: number;
	export let max: number;
	export let step: number;
	export let bindValue: number;
	export let unit: string = '';
</script>

<label class="flex mt-2 items-center flex-wrap overflow-x-auto">
	<span>{title} :</span>
	<div class="flex">
		<input
			type="range"
			{min}
			{max}
			{step}
			class="ml-1 bg-slate-600"
			bind:value={bindValue}
			on:focus
			on:blur
		/>
		<div class="flex items-center">
			<input
				on:focus
				on:blur
				type="number"
				{min}
				{max}
				{step}
				class="ml-1 bg-transparent bg-slate-600 px-2 py-1 w-20 border border-slate-700 rounded-lg outline-none"
				bind:value={bindValue}
			/>
			<span class="ml-1">{unit}</span>
		</div>
	</div>
</label>
