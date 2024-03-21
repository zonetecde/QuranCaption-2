import type Project from '$lib/Project';
import { writable, type Writable } from 'svelte/store';

export const currentProject: Writable<Project> = writable();
