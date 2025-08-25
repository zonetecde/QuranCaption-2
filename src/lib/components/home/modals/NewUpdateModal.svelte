<script lang="ts">
	import { onMount } from 'svelte';
	import MarkdownIt from 'markdown-it';
	import anchor from 'markdown-it-anchor';
	import { slide } from 'svelte/transition';
	import toast from 'svelte-5-french-toast';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import type { UpdateInfo } from '$lib/services/VersionService';
	import { globalState } from '$lib/runes/main.svelte';

	let { update, resolve }: { update: UpdateInfo; resolve: () => void } = $props();
	let html = '<p>Loading...</p>';
	let sanitized = $state('<p>Loading...</p>');
	let DOMPurify: any | undefined;

	// markdown-it configuré avec plugins utiles
	const md = new MarkdownIt({ html: true, linkify: true, typographer: true }).use(anchor);

	onMount(async () => {
		// DOMPurify nécessite window -> import dynamique pour éviter les erreurs côté SSR
		try {
			//@ts-ignore
			const mod = await import('dompurify');
			DOMPurify = mod && (mod.default || mod);
			// some bundlers export a factory; if so, call it with window
			if (typeof DOMPurify === 'function' && typeof DOMPurify.sanitize !== 'function') {
				DOMPurify = DOMPurify(window);
			}
		} catch (e) {
			DOMPurify = undefined;
		}

		renderMarkdown();
	});

	function renderMarkdown() {
		const src = update?.changelog.trim() || '';
		html = md.render(src);
		if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
			sanitized = DOMPurify.sanitize(html);
		} else {
			// fallback si pas encore chargé: afficher le HTML non-sanitized (normalement on est client)
			sanitized = html;
		}
	}

	async function openUpdateUrl() {
		try {
			await openUrl('https://github.com/zonetecde/QuranCaption/releases/latest');
		} catch (error) {
			console.error('Failed to open URL:', error);
			toast.error('Failed to open release page');
		}
	}
</script>

<div
	class="bg-secondary border-color border rounded-2xl w-[600px] max-w-[90vw] h-[500px] shadow-2xl shadow-black flex flex-col relative"
	transition:slide
>
	<!-- Header with gradient background -->
	<div
		class="bg-gradient-to-r from-accent-primary to-accent-secondary rounded-t-2xl px-6 py-6 border-b border-color"
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center shadow-lg">
					<span class="material-icons text-accent-primary text-xl">system_update</span>
				</div>
				<div>
					<h2 class="text-2xl font-bold text-white">Update Available!</h2>
					<p class="text-sm text-white/80">Version {update!.latestVersion || 'Unknown'} is ready</p>
				</div>
			</div>

			<!-- Close button -->
			<button
				class="w-10 h-10 rounded-full hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-all duration-200 text-white/80 hover:text-white group cursor-pointer"
				onclick={() => {
					globalState.settings!.persistentUiState.lastClosedUpdateModal = new Date().toISOString();
					resolve();
				}}
			>
				<span
					class="material-icons text-lg group-hover:rotate-90 transition-transform duration-200"
				>
					close
				</span>
			</button>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 flex flex-col p-6 min-h-0">
		<!-- Update info -->
		<div class="mb-4">
			<div class="flex items-center gap-2 mb-2">
				<span class="material-icons text-accent-primary text-base">new_releases</span>
				<h3 class="text-lg font-semibold text-primary">What's New</h3>
			</div>
			<div
				class="w-full h-px bg-gradient-to-r from-transparent via-border-color to-transparent"
			></div>
		</div>

		<!-- Changelog content - scrollable -->
		<div class="flex-1 min-h-0">
			<div
				class="prose prose-sm prose-invert max-w-none h-full bg-white/5 px-4 rounded-lg overflow-auto text-white border border-color"
			>
				{@html sanitized}
			</div>
		</div>

		<!-- Action buttons -->
		<div class="flex justify-end gap-3 mt-6 pt-4 border-t border-color">
			<button
				class="btn px-6 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-105"
				onclick={() => {
					globalState.settings!.persistentUiState.lastClosedUpdateModal = new Date().toISOString();
					resolve();
				}}
			>
				Later
			</button>
			<button
				class="btn-accent px-6 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
				onclick={openUpdateUrl}
			>
				<span class="material-icons text-sm">download</span>
				Update Now
			</button>
		</div>
	</div>
</div>

<style>
	/* Enhanced prose styling for better markdown rendering */
	:global(.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6) {
		color: white !important;
		margin-top: 1.5em !important;
		margin-bottom: 0.5em !important;
	}

	:global(.prose h1) {
		font-size: 1.5em !important;
		font-weight: 700 !important;
	}

	:global(.prose h2) {
		font-size: 1.3em !important;
		font-weight: 600 !important;
	}

	:global(.prose h3) {
		font-size: 1.1em !important;
		font-weight: 600 !important;
	}

	:global(.prose p) {
		color: rgba(255, 255, 255, 0.9) !important;
		margin-bottom: 1em !important;
	}

	:global(.prose ul, .prose ol) {
		color: rgba(255, 255, 255, 0.9) !important;
		margin: 1em 0 !important;
	}

	:global(.prose li) {
		color: rgba(255, 255, 255, 0.9) !important;
		margin: 0.25em 0 !important;
	}

	:global(.prose strong) {
		color: white !important;
		font-weight: 600 !important;
	}

	:global(.prose code) {
		background-color: rgba(255, 255, 255, 0.1) !important;
		color: #58a6ff !important;
		padding: 0.2em 0.4em !important;
		border-radius: 0.25rem !important;
		font-size: 0.9em !important;
	}

	:global(.prose a) {
		color: #58a6ff !important;
		text-decoration: underline !important;
	}

	:global(.prose a:hover) {
		color: #79c0ff !important;
	}

	/* Icon rotation on close button hover */
	.group:hover .group-hover\:rotate-90 {
		transform: rotate(90deg);
	}
</style>
