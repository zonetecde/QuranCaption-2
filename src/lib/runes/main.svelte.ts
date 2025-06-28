import type { Project } from '$lib/classes';

class GlobalState {
	currentProject: Project | undefined = $state(undefined);
}

export const globalState = new GlobalState();
