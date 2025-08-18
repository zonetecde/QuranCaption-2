export interface VerticalDragOptions {
	getInitial: () => number;
	apply: (value: number) => void;
	min?: number;
	max?: number;
	round?: boolean;
	classWhileDragging?: string; // classe à ajouter pendant le drag
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
		origin = opts.getInitial();
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
		opts.apply(val);
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
