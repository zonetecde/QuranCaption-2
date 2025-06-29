<script lang="ts">
	import { inputModal } from '../modals/InputModal';

	let {
		text = 'Input',
		value = $bindable(),
		maxLength = 50,
		placeholder = 'Enter text here',
		action = () => {}
	} = $props();

	async function projectNameClick() {
		const newName = await inputModal(text, value, maxLength, placeholder);
		if (newName && newName.trim() !== '') {
			value = newName.trim();
			action();
		}
	}
</script>

<button
	onclick={projectNameClick}
	class="project-name-container group/name flex items-center text-accent cursor-pointer"
>
	<h4 class="text-lg font-semibold group-hover/name:underline">{value}</h4>
	<span
		class="material-icons-outlined text-lg! pt-0.5 ml-2 opacity-0 group-hover/name:opacity-100 transition-opacity duration-100"
		>edit</span
	>
</button>
