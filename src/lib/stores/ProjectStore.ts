import Id from '$lib/ext/Id';
import { localStorageWrapper } from '$lib/ext/LocalStorageWrapper';
import { millisecondsToHHMMSS } from '$lib/functions/Formatter';
import type Project from '$lib/models/Project';
import type { ProjectDesc } from '$lib/models/Project';
import { get, writable, type Writable } from 'svelte/store';
import { getSurahName, Mushaf } from './QuranStore';
import { cursorPosition, getLastClipEnd, scrollPosition, zoom } from './TimelineStore';

export const currentProject: Writable<Project> = writable();

/**
 * Creates a blank project with the given name.
 * @param name - The name of the project.
 * @returns The created project.
 */
export function createBlankProject(name: string, reciter: string): Project {
	return {
		id: Id.generate(),
		name: name.trim(),
		reciter: reciter,
		createdAt: new Date(),
		updatedAt: new Date(),
		description: '',
		assets: [],
		timeline: {
			videosTracks: [
				{
					id: Id.generate(),
					name: 'Background Video',
					clips: [
						{
							id: 'black-video',
							start: 0,
							end: 7200000,
							duration: 7200000,
							assetId: 'black-video',
							fileStartTime: 0,
							fileEndTime: 7200000,
							isMuted: true
						}
					],
					type: 'Video track'
				}
			],
			audiosTracks: [
				{
					id: Id.generate(),
					name: 'Quran Recitation',
					clips: [],
					type: 'Audio track'
				}
			],
			subtitlesTracks: [
				{
					id: Id.generate(),
					name: 'Subtitles',
					clips: [],
					type: 'Subtitles track',
					language: 'arabic'
				}
			]
		},
		projectSettings: getDefaultsProjectSettings()
	};
}

/**
 * Returns the default project settings.
 * @returns The default project settings.
 */
export function getDefaultsProjectSettings(): Project['projectSettings'] {
	return {
		cursorPosition: 0,
		zoom: 30,
		scrollLeft: 0,
		addedTranslations: [],
		videoScale: 1,
		translateVideoX: 0,
		bestPerformance: false,
		individualSubtitlesSettings: {},

		globalSubtitlesSettings: {
			background: true,
			backgroundColor: '#000000',
			backgroundOpacity: 0.5,
			fadeDuration: 300,
			horizontalPadding: 0,
			backgroundImage: '',
			subscribeButton: {
				enable: false,
				startTime: 3,
				position: 'BC'
			},
			surahNameSettings: {
				enable: true,
				size: 1,
				opacity: 0.8,
				verticalPosition: 10,
				showLatin: true,
				latinTextBeforeSurahName: 'Surah'
			},
			creatorText: {
				outline: true,
				enable: true,
				text: 'Quran Caption',
				fontFamily: 'Verdana',
				fontSize: 60,
				verticalPosition: 75,
				color: '#ffffff',
				opacity: 1
			},
			globalGlowColor: '#ffffff',
			globalGlowEffect: false,
			globalGlowRadius: 12
		},
		subtitlesTracksSettings: {
			arabic: {
				enableSubtitles: true,
				fontSize: 100,
				fontFamily: 'Hafs',
				color: '#ffffff',
				enableOutline: true,
				outlineColor: '#000000',
				outlineThickness: 2,
				verticalPosition: 0,
				horizontalPadding: 0,
				opacity: 1,
				showVerseNumber: true,
				alignment: 'center',
				fitOnOneLine: false,
				neededHeightToFitFullScreen: -1,
				maxNumberOfLines: 1,
				neededHeightToFitSmallPreview: -1
			}
		}
	};
}

/**
 * Deletes a project by its ID.
 * @param id - The ID of the project to delete.
 * @returns An array of user projects.
 */
export async function delProject(id: string): Promise<ProjectDesc[]> {
	await localStorageWrapper.removeItem(id);

	let userProjects = await getUserProjects();
	userProjects = userProjects.filter((x) => x.id !== id);
	await localStorageWrapper.setItem('projects', JSON.stringify(userProjects));

	return userProjects;
}

/**
 * Retrieves the user's projects from local storage.
 * @returns An array of user projects.
 */
export async function getUserProjects(): Promise<ProjectDesc[]> {
	return JSON.parse((await localStorageWrapper.getItem('projects')) || '[]');
}

/**
 * Retrieves the user's projects from local storage as projects.
 * @returns An array of user projects.
 */
export async function getUserProjectsAsProjects(): Promise<Project[]> {
	const projects = await getUserProjects();
	const result: Project[] = [];

	for (const project of projects) {
		const projJson = await localStorageWrapper.getItem(project.id);
		if (projJson) {
			result.push(JSON.parse(projJson));
		}
	}

	return result;
}

export async function doesProjectExist(id: string): Promise<boolean> {
	const projJson = await localStorageWrapper.getItem(id);
	return projJson !== null;
}

/**
 * Retrieves a project by its ID.
 * @param id - The ID of the project.
 * @returns The project with the specified ID, or undefined if not found.
 */
export async function getProjectById(id: string): Promise<Project> {
	const projJson = await localStorageWrapper.getItem(id);
	if (projJson) return JSON.parse(projJson);
	else return createBlankProject('undefined project', '');
}

/**
 * Updates the user's projects in local storage.
 * @param project - The project to update.
 */
export async function updateUsersProjects(
	project: Project,
	isInMigrationMode = false
): Promise<ProjectDesc[]> {
	const projects: ProjectDesc[] = await getUserProjects();

	if (project === undefined || project === null) return projects; // No project is open

	// au cas-où
	if (project.projectSettings === null) {
		project.projectSettings = getDefaultsProjectSettings();
	}

	if (!isInMigrationMode) {
		project.projectSettings.zoom = get(zoom);
		project.projectSettings.cursorPosition = get(cursorPosition);
		project.projectSettings.scrollLeft = get(scrollPosition);
	}

	const index = projects.findIndex((p) => p.id === project.id);
	if (index === -1) {
		if (projects.find((p) => p.name === project.name)) {
			project.name = project.name + ' - New';
		}

		projects.push({
			id: project.id,
			name: project.name,
			updatedAt: project.updatedAt,
			percentageCaptioned: getProjectPercentageCaptioned(project),
			percentageTranslated: getProjectPercentageTranslated(project),
			translations: project.projectSettings.addedTranslations,
			duration: getLastClipEnd(project.timeline),
			status: 'not set',
			description: project.description || '',
			reciter: project.reciter || '',
			versesRange: [],
			createdAt: project.createdAt
		});
	} else {
		projects[index] = {
			id: project.id,
			name: projects[index].name,
			updatedAt: isInMigrationMode ? projects[index].updatedAt : new Date(),
			percentageCaptioned: getProjectPercentageCaptioned(project),
			percentageTranslated: getProjectPercentageTranslated(project),
			translations: project.projectSettings.addedTranslations,
			duration: getLastClipEnd(project.timeline),
			// met des valeurs par défaut pour les anciens projets
			status: !projects[index].status ? 'not set' : projects[index].status,
			description: !projects[index].description ? '' : projects[index].description,
			reciter: !projects[index].reciter ? '' : projects[index].reciter,
			versesRange: getProjectVersesRange(project),
			createdAt: projects[index].createdAt || project.createdAt
		};
	}

	await localStorageWrapper.setItem(project.id, JSON.stringify(project));
	await localStorageWrapper.setItem('projects', JSON.stringify(projects));

	return projects;
}

export async function updateUserProjectsDesc(projects: ProjectDesc[]) {
	await localStorageWrapper.setItem('projects', JSON.stringify(projects));
}

/**
 *  Returns the percentage of the project that has been captioned.
 * @param project  The project to get the percentage of captioned verses.
 * @returns  The percentage of captioned verses.
 */
export function getProjectPercentageCaptioned(project: Project): number {
	if (
		project.timeline.subtitlesTracks[0].clips[project.timeline.subtitlesTracks[0].clips.length - 1]
	) {
		return Math.round(
			project.timeline.subtitlesTracks[0].clips[
				project.timeline.subtitlesTracks[0].clips.length - 1
			].end /
				getLastClipEnd(project.timeline) /
				10
		);
	} else return 0;
}

export function getProjectPercentageTranslated(project: Project): number {
	// -1 if no translation is added
	if (project.projectSettings.addedTranslations.length === 0) return -1;

	let translated = 0;
	let total = 0;
	for (let index = 0; index < project.timeline.subtitlesTracks[0].clips.length; index++) {
		const element = project.timeline.subtitlesTracks[0].clips[index];

		if (element.verse === -1 || element.surah === -1) continue;

		// if the verse has been translated or if it's complete (no need to edit the translation)
		if (
			element.hadItTranslationEverBeenModified ||
			(element.firstWordIndexInVerse === 0 && element.isLastWordInVerse)
		)
			translated++;
		total++;
	}

	return Math.round((translated / total) * 100);
}

/**
 * Returns the verses range of the project.
 * @param project - The project to get the verses range from.
 * @returns The verses range of the project. (ex: ['1:1->1:7', '114:1->114:6'])
 */
export function getProjectVersesRange(project: Project): string[] {
	const versesRange: string[] = [];
	const clips = project.timeline.subtitlesTracks[0].clips;

	let lastSurah = 0;

	for (let i = 0; i < clips.length; i++) {
		const clip = clips[i];
		if (clip.verse === -1 || clip.surah === -1) continue;

		if (clip.surah !== lastSurah) {
			versesRange.push(`${clip.surah}:${clip.verse}->`);
			lastSurah = clip.surah;
		} else {
			// removes everything after the last ->
			versesRange[versesRange.length - 1] =
				versesRange[versesRange.length - 1].split('->')[0] + '->';
			// set the last verse
			versesRange[versesRange.length - 1] += `${clip.verse}`;
		}
	}

	// now convert 1:1->7 to readable text : 1. Al Fatiha (1-7)
	const mushaf = get(Mushaf);
	if (mushaf === undefined) return [];
	for (let i = 0; i < versesRange.length; i++) {
		const element = versesRange[i].split(':');
		const surahName = mushaf.surahs[Number.parseInt(element[0]) - 1].transliteration;
		const startVerse = element[1].split('->')[0];
		const endVerse = element[1].split('->')[1];

		versesRange[i] = element[0] + '. ' + surahName + ' (' + startVerse + '-' + endVerse + ')';
	}

	// remove duplicates
	return versesRange.filter((v, i, a) => a.indexOf(v) === i);
}

export function downloadYoutubeChapters() {
	const _currentProject = get(currentProject);

	// first chapter should be 00:00:00, first surah name in the projet
	// then the rest of the chapters should be the surah names
	const chapters: {
		start: string;
		end: string;
		title: string;
	}[] = [];

	let lastChapterName = '';
	let i = 0;
	_currentProject.timeline.subtitlesTracks[0].clips.forEach((clip) => {
		if (clip.surah >= 1 && clip.surah <= 114) {
			const surahName = getSurahName(clip.surah);
			if (surahName !== lastChapterName) {
				chapters.push({
					start: millisecondsToHHMMSS(clip.start),
					end: _currentProject.timeline.subtitlesTracks[0].clips[i - 1]
						? millisecondsToHHMMSS(_currentProject.timeline.subtitlesTracks[0].clips[i - 1].end)
						: '00:00:00',
					title: surahName
				});
				lastChapterName = surahName;
			}
		}

		i++;
	});

	// first chapter should start at 00:00:00 even if there's a silence or basmallah
	if (chapters.length > 0) chapters[0].start = '00:00:00';

	// download as text :
	// 00:00:00 - Al-Fatihah
	// ...
	const a = document.createElement('a');
	const file = new Blob([chapters.map((c) => `${c.start} - ${c.title}`).join('\n')], {
		type: 'text/plain'
	});
	a.href = URL.createObjectURL(file);
	a.download = 'youtube chapters for ' + _currentProject.name + '.txt';
	a.click();
	URL.revokeObjectURL(a.href);
}

/*
 * Backup all user projects and download them as a file.
 */
export async function backupAllProjects(userProjectsDesc: ProjectDesc[]) {
	const userProjects: Project[] = [];

	for (let i = 0; i < userProjectsDesc.length; i++) {
		const element = userProjectsDesc[i];

		userProjects.push(JSON.parse(await localStorageWrapper.getItem(element.id)!));
	}

	const data = JSON.stringify(userProjects, null, 2);

	const blob = new Blob([data], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download =
		'Quran Caption Backup ' + new Date().toISOString().replace(/:/g, '-').split('.')[0] + '.qcb';
	a.click();
}

export async function restoreAllProjects(jsonContent: string): Promise<ProjectDesc[]> {
	const projects = JSON.parse(jsonContent);
	let userProjectsDesc: ProjectDesc[] = [];

	for (const project of projects) {
		const existingProject = userProjectsDesc.find((p) => p.id === project.id);
		if (existingProject && new Date(existingProject.updatedAt) > new Date(project.updatedAt)) {
			userProjectsDesc = userProjectsDesc.map((p) => (p.id === project.id ? project : p));
			await updateUsersProjects(project);
		} else if (!existingProject) {
			await updateUsersProjects(project);
		}
	}

	userProjectsDesc = await getUserProjects();

	return userProjectsDesc;
}

export function hasSubtitleDefaultIndividualSettings(subtitleId: string): boolean {
	return (
		get(currentProject).projectSettings.individualSubtitlesSettings !== undefined &&
		get(currentProject).projectSettings.individualSubtitlesSettings[subtitleId] !== undefined
	);
}

export function hasSubtitleAtLeastOneStyle(subtitleId: string): boolean {
	const _currentProject = get(currentProject);
	return (
		_currentProject.projectSettings.individualSubtitlesSettings !== undefined &&
		_currentProject.projectSettings.individualSubtitlesSettings[subtitleId] !== undefined &&
		_currentProject.projectSettings.individualSubtitlesSettings[subtitleId].hasAtLeastOneStyle
	);
}

export function setDefaultIndividualSettingsForSubtitleId(subtitleId: string) {
	if (!get(currentProject).projectSettings.individualSubtitlesSettings)
		get(currentProject).projectSettings.individualSubtitlesSettings = {};

	get(currentProject).projectSettings.individualSubtitlesSettings[subtitleId] = {
		glowEffect: false,
		glowColor: '#973b3b',
		glowRadius: 12,
		bold: false,
		italic: false,
		underline: false,
		hasAtLeastOneStyle: false
	};
}

export function hasAtLeastOneSubtitle() {
	return get(currentProject).timeline.subtitlesTracks[0].clips.some((c) => c.verse !== -1);
}
