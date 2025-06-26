<script lang="ts">
	import DonationFloatingButton from '$lib/components/misc/DonationFloatingButton.svelte';
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}

<DonationFloatingButton />
