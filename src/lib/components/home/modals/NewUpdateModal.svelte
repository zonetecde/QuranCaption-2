<script lang="ts">
	import type { UpdateInfo } from '$lib/services/VersionService';
	import { onMount } from 'svelte';
	import MarkdownIt from 'markdown-it';
	import anchor from 'markdown-it-anchor';
	import footnote from 'markdown-it-footnote';
	import deflist from 'markdown-it-deflist';
	import taskLists from 'markdown-it-task-lists';
	import { slide } from 'svelte/transition';

	let { update }: { update: UpdateInfo } = $props();
	let html = '<p>Loading...</p>';
	let sanitized = '<p>Loading...</p>';
	let DOMPurify: any | undefined;

	// markdown-it configuré avec plugins utiles (images, links, task lists, footnotes...)
	const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
		.use(anchor)
		.use(footnote)
		.use(deflist)
		.use(taskLists, { enabled: true });

	onMount(async () => {
		// DOMPurify nécessite window -> import dynamique pour éviter les erreurs côté SSR
		try {
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
		const src = update?.changelog || '';
		html = md.render(src);
		if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
			sanitized = DOMPurify.sanitize(html);
		} else {
			// fallback si pas encore chargé: afficher le HTML non-sanitized (normalement on est client)
			sanitized = html;
		}
	}
</script>

<div
	class="absolute top-20 left-2 px-3 py-2 w-[300px] h-[400px] bg-secondary border-2 border-color rounded-2xl shadow-2xl shadow-black overflow-auto"
	transition:slide
>
	<p class="text-center text-bold">A new update is available!</p>
	<div class="mt-2">
		<p class="underline">Changelog:</p>
		<div class="text-xs mt-3 bg-white/5 p-2 rounded-lg prose prose-sm max-w-none overflow-auto">
			{@html sanitized}
		</div>
	</div>
</div>
