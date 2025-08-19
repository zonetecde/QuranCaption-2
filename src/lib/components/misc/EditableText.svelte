<script lang="ts">
	import type { Snippet } from 'svelte';
	import ModalManager from '../modals/ModalManager';

	let {
		text = 'Input',
		value = $bindable(),
		maxLength = 50,
		placeholder = 'Enter text here',
		action = () => {},
		parentClasses = '',
		textClasses = '',
		inputType = 'text'
	}: {
		text?: string;
		value?: string;
		maxLength?: number;
		placeholder?: string;
		action?: () => void;
		parentClasses?: string;
		textClasses?: string;
		inputType?: 'text' | 'reciters';
	} = $props();

	async function projectNameClick() {
		const newName = await ModalManager.inputModal(text, value, maxLength, placeholder, inputType);
		if (newName && newName.trim() !== '') {
			value = newName.trim();
			action();
		}
	}
</script>

<button
	onclick={projectNameClick}
	class={'text-left text-nowrap project-name-container group/name flex items-center cursor-pointer ' +
		parentClasses}
>
	<h4 class={'group-hover/name:underline ' + textClasses}>{value}</h4>
	<span
		class="material-icons-outlined text-lg! pt-0.5 ml-2 opacity-0 group-hover/name:opacity-100 transition-opacity duration-100"
		>edit</span
	>
</button>
