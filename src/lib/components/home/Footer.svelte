<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
</script>

<footer class="w-screen border-t border-[var(--border-color)] py-8">
	<div
		class="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-[var(--text-secondary)] text-sm"
	>
		<div
			class="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4"
		>
			<button
				class="hover:text-[var(--accent-primary)] transition-colors bg-transparent border-none p-0 cursor-pointer text-[inherit]"
				onclick={async () => {
					await openUrl('https://github.com/zonetecde/QuranCaption-2');
				}}>GitHub Repo</button
			>
			<button
				class="hover:text-[var(--accent-primary)] transition-colors bg-transparent border-none p-0 cursor-pointer text-[inherit]"
				onclick={async () => {
					await openUrl('https://qurancaption-project.vercel.app/documentation');
				}}>Documentation</button
			>
			<button
				class="hover:text-[var(--accent-primary)] transition-colors bg-transparent border-none p-0 cursor-pointer text-[inherit]"
				onclick={async () => {
					await openUrl('https://discord.gg/Hxfqq2QA2J');
				}}>Discord</button
			>
			<button
				class="hover:text-[var(--accent-primary)] transition-colors bg-transparent border-none p-0 cursor-pointer text-[inherit]"
				onclick={async () => {
					await openUrl('https://ko-fi.com/vzero');
				}}>Donate</button
			>
		</div>
		<p class="mb-1">© 2025 Quran Caption. Made by Rayane STASZEWSKI.</p>
		<p>Version 3.0.0</p>
	</div>
</footer>
