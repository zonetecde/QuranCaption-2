<script lang="ts">
	import 'material-icons/iconfont/material-icons.css';
	import { openUrl } from '@tauri-apps/plugin-opener';

	function handleDonationClick() {
		openUrl('https://ko-fi.com/vzero');
	}
</script>

<button
	class="fixed xl:bottom-6 xl:right-6 bottom-3 right-3 xl:px-4 px-3 xl:py-3 py-1.5 rounded-full! shadow-xl hover:scale-105 btn-accent flex items-center gap-x-2 xl:text-base text-sm z-10"
	onclick={handleDonationClick}
>
	<span class="material-icons-outlined">volunteer_activism</span>Make a Donation
</button>
