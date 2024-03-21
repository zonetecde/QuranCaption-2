import type Timeline from './classes/Timeline';

export default interface Project {
	id: number;
	name: string;
	description: string;
	createdAt: Date;
	updatedAt: Date;
	timeline: Timeline;
}
