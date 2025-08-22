import { globalState } from '$lib/runes/main.svelte';
import type { StyleName } from '$lib/classes/VideoStyle.svelte';

export interface VerticalDragOptions {
	getInitial: () => number;
	apply: (value: number) => void;
	min?: number;
	max?: number;
	round?: boolean;
	classWhileDragging?: string; // classe à ajouter pendant le drag
	// Support pour les clips sélectionnés
	target?: string;
	styleId?: StyleName;
	selectedClipIds?: () => number[];
	getEffectiveValue?: (clipId?: number) => number;
}

export function verticalDrag(node: HTMLElement, options: VerticalDragOptions) {
	let startY = 0;
	let origin = 0;
	let dragging = false;
	let opts = options;

	function mousedown(e: MouseEvent) {
		if (e.button !== 0) return;
		e.preventDefault();
		startY = e.clientY;

		// Récupère la valeur initiale avec support pour les clips sélectionnés
		if (opts.target && opts.styleId && opts.selectedClipIds && opts.getEffectiveValue) {
			const selectedIds = opts.selectedClipIds();
			if (selectedIds.length > 0) {
				// Si on a des clips sélectionnés, utilise la valeur effective du premier clip
				origin = opts.getEffectiveValue(selectedIds[0]);
			} else {
				origin = opts.getInitial();
			}
		} else {
			origin = opts.getInitial();
		}

		dragging = true;
		document.addEventListener('mousemove', mousemove);
		document.addEventListener('mouseup', mouseup);
		const cls = opts.classWhileDragging || 'dragging-vertical';
		node.classList.add(cls);
	}

	function mousemove(e: MouseEvent) {
		if (!dragging) return;
		const delta = e.clientY - startY;
		let val = origin + delta;
		if (typeof opts.min === 'number') val = Math.max(opts.min, val);
		if (typeof opts.max === 'number') val = Math.min(opts.max, val);
		if (opts.round !== false) val = Math.round(val);

		// Applique la valeur avec support pour les clips sélectionnés
		if (opts.target && opts.styleId && opts.selectedClipIds) {
			const selectedIds = opts.selectedClipIds();
			if (selectedIds.length > 0) {
				// Si on a des clips sélectionnés, utilise setStyleForClips
				globalState.getVideoStyle
					.getStylesOfTarget(opts.target)
					.setStyleForClips(selectedIds, opts.styleId, val);
			} else {
				// Sinon, utilise la fonction apply classique
				opts.apply(val);
			}

			// Déclenche un refresh si nécessaire pour certains styles
			if (opts.styleId === 'vertical-position' || opts.styleId === 'horizontal-position') {
				globalState.updateVideoPreviewUI();
			}
		} else {
			opts.apply(val);
		}
	}

	function mouseup() {
		if (!dragging) return;
		dragging = false;
		document.removeEventListener('mousemove', mousemove);
		document.removeEventListener('mouseup', mouseup);
		const cls = opts.classWhileDragging || 'dragging-vertical';
		node.classList.remove(cls);
	}

	node.addEventListener('mousedown', mousedown);
	if (!node.style.cursor) node.style.cursor = 'move';

	return {
		update(newOptions: VerticalDragOptions) {
			opts = newOptions;
		},
		destroy() {
			node.removeEventListener('mousedown', mousedown);
			document.removeEventListener('mousemove', mousemove);
			document.removeEventListener('mouseup', mouseup);
		}
	};
}
