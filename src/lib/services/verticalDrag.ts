import { globalState } from '$lib/runes/main.svelte';
import type { StyleName } from '$lib/classes/VideoStyle.svelte';

export interface VerticalDragOptions {
	// Mode simple : fonction manuelle
	getInitial?: () => number;
	apply?: (value: number) => void;
	min?: number;
	max?: number;
	round?: boolean;
	classWhileDragging?: string;

	// Mode automatique avec globalState
	target?: string;
	styleId?: StyleName;
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

		// Mode automatique avec globalState
		if (opts.target && opts.styleId) {
			const selectedIds =
				globalState.currentProject!.projectEditorState.stylesEditor.selectedSubtitles.map(
					(s) => s.id
				);
			if (selectedIds.length > 0) {
				// Si on a des clips sélectionnés, utilise la valeur effective du premier clip
				origin = Number(
					globalState.getVideoStyle
						.getStylesOfTarget(opts.target)
						.getEffectiveValue(opts.styleId, selectedIds[0])
				);
			} else {
				// Sinon, utilise la valeur du style global
				origin = Number(
					globalState.getVideoStyle.getStylesOfTarget(opts.target).findStyle(opts.styleId)!.value
				);
			}
		} else {
			// Mode manuel
			origin = opts.getInitial!();
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

		// Mode automatique avec globalState
		if (opts.target && opts.styleId) {
			const style = globalState.getVideoStyle
				.getStylesOfTarget(opts.target)
				.findStyle(opts.styleId)!;
			if (typeof style.valueMin === 'number') val = Math.max(style.valueMin, val);
			if (typeof style.valueMax === 'number') val = Math.min(style.valueMax, val);
		} else {
			// Mode manuel
			if (typeof opts.min === 'number') val = Math.max(opts.min, val);
			if (typeof opts.max === 'number') val = Math.min(opts.max, val);
		}

		if (opts.round !== false) val = Math.round(val);

		// Mode automatique avec globalState
		if (opts.target && opts.styleId) {
			const selectedIds =
				globalState.currentProject!.projectEditorState.stylesEditor.selectedSubtitles.map(
					(s) => s.id
				);
			if (selectedIds.length > 0) {
				// Si on a des clips sélectionnés, utilise setStyleForClips
				globalState.getVideoStyle
					.getStylesOfTarget(opts.target)
					.setStyleForClips(selectedIds, opts.styleId, val);
			} else {
				// Sinon, utilise setStyle pour le style global
				globalState.getVideoStyle.getStylesOfTarget(opts.target).setStyle(opts.styleId, val);
			}

			// Déclenche un refresh si nécessaire pour certains styles
			if (opts.styleId === 'vertical-position' || opts.styleId === 'horizontal-position') {
				globalState.updateVideoPreviewUI();
			}
		} else {
			// Mode manuel
			opts.apply!(val);
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
