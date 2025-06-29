<script lang="ts">
	let {
		text,
		defaultText = '',
		maxlength = 100,
		placeholder = 'Enter text here',
		resolve
	}: {
		text: string;
		defaultText?: string;
		maxlength?: number;
		placeholder?: string;
		resolve: (result: string) => void;
	} = $props();

	let inputValue: string = $state(defaultText);

	function handleConfirm() {
		resolve(inputValue.trim());
	}

	function handleCancel() {
		resolve(defaultText);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleConfirm();
		} else if (event.key === 'Escape') {
			handleCancel();
		}
	}
</script>

<div
	class="bg-secondary border-color border rounded-4xl w-[600px] px-4 pt-6 pb-4 shadow-2xl shadow-black flex flex-col relative"
>
	<p class="mb-3">Input</p>

	<hr />

	<p class="text-secondary mt-4 mb-3">{text}</p>

	<input
		bind:value={inputValue}
		type="text"
		{maxlength}
		class="w-full mb-2"
		{placeholder}
		onkeydown={handleKeydown}
		autofocus
	/>

	<p class="text-xs text-right text-secondary mb-3">{inputValue.length}/{maxlength}</p>

	<div class="flex justify-end">
		<button class="btn px-4 py-2 mr-2" onclick={handleCancel}> Cancel </button>
		<button class="btn-accent px-4 py-2" onclick={handleConfirm}> Confirm </button>
	</div>
</div>
