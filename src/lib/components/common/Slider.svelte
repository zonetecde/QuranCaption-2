<script lang="ts">
	export let title: string;
	export let min: number;
	export let max: number;
	export let step: number;
	export let bindValue: number;
	export let unit = '';

	let isMouseDown = false;
	let yAxis = 0;
</script>

<label class="flex mt-2 min-h-24 xl:min-h-0 items-center flex-wrap overflow-x-auto">
	<span>{title} :</span>
	<div class="flex">
		<input
			type="range"
			{min}
			{max}
			{step}
			class="ml-1 bg-slate-600 xl:w-max w-28"
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
				class="ml-1 bg-transparent bg-slate-600 pl-1 py-1 w-16 border border-slate-700 rounded-lg outline-none"
				bind:value={bindValue}
				on:mousedown={(e) => {
					isMouseDown = true;
					yAxis = e.clientY;

					window.onmousemove = (e) => {
						if (!isMouseDown) return;
						bindValue = Math.min(max, Math.max(min, bindValue + (yAxis - e.clientY) * step));
						yAxis = e.clientY;
					};

					window.onmouseup = () => {
						isMouseDown = false;
						window.onmousemove = null;
						window.onmouseup = null;
					};
				}}
			/>
			<span class="ml-1">{unit}</span>
		</div>
	</div>
</label>
