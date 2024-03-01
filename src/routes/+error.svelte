<script>
	import { page } from '$app/stores';
	import Page from './+page.svelte';
</script>

<div id="main">
	{#if $page.error}
		<h1>{$page.error.message}</h1>
	{/if}

	<button on:click={() => (window.location.href = '/')}>Go back to home</button>
</div>

<style>
	#main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
	}

	button {
		margin-top: 20px;
		background-color: #053321;
		padding-left: 22px;
		padding-right: 22px;

		padding-top: 8px;
		padding-bottom: 8px;
	}
</style>
