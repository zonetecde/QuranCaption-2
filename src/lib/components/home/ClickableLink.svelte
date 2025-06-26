<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';

	let {
		url,
		label
	}: {
		url: string;
		label: string;
	} = $props();
</script>

<button
	class="hover:text-[var(--accent-primary)] transition-colors bg-transparent border-none p-0 cursor-pointer text-[inherit]"
	onclick={async () => {
		await openUrl(url);
	}}>{label}</button
>
