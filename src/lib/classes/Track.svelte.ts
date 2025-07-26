import { AssetType, TrackType } from './enums.js';
import { AssetClip, Clip, SilenceClip, SubtitleClip } from './Clip.svelte.js';
import { SerializableBase } from './misc/SerializableBase.js';
import { Duration, type Asset } from './index.js';
import { globalState } from '$lib/runes/main.svelte.js';
import type { Verse } from './Quran.js';
import toast from 'svelte-5-french-toast';

export class Track extends SerializableBase {
	type: TrackType = $state(TrackType.Unknown);
	clips: Clip[] = $state([]);

	constructor(type: TrackType) {
		super();
		this.type = type;
		this.clips = [];
	}

	addAsset(asset: Asset) {
		// Récupère le dernier clip de la piste, s'il existe
		const lastClip = this.clips.length > 0 ? this.clips[this.clips.length - 1] : null;

		if (lastClip)
			this.clips.push(
				new AssetClip(lastClip.endTime + 1, lastClip.endTime + asset.duration.ms + 1, asset.id)
			);
		else this.clips.push(new AssetClip(0, asset.duration.ms, asset.id));

		// Trigger la réactivé dans la videopreview pour afficher le clip ajouté (si le curseur est dessus)
		setTimeout(() => {
			globalState.currentProject!.projectEditorState.timeline.movePreviewTo =
				globalState.currentProject!.projectEditorState.timeline.cursorPosition + 1;
		}, 0);
	}

	/**
	 * Supprime un clip de la piste.
	 * @param id L'ID du clip à supprimer.
	 * @param makeNextClipStartAtThisClipStartTime Si vrai, le prochain clip commencera à l'heure de début de ce clip plutôt que de tout décaler.
	 * * Si faux, les clips suivants seront décalés pour combler l'espace laissé par le clip supprimé.
	 * */
	removeClip(id: number, makeNextClipStartAtThisClipStartTime: boolean = false) {
		const index = this.clips.findIndex((clip) => clip.id === id);
		if (index !== -1) {
			const clipToRemoveStartTime = this.clips[index].startTime;
			this.clips.splice(index, 1);

			if (!makeNextClipStartAtThisClipStartTime) {
				// Met à jour les timestamps des clips suivants
				for (let i = index; i < this.clips.length; i++) {
					const clip = this.clips[i];
					clip.startTime = i === 0 ? 0 : this.clips[i - 1].endTime + 1;
					clip.endTime = clip.startTime + clip.duration;
				}
			} else {
				// Trouve le clip suivant et met à jour son startTime
				const nextClip = this.clips[index];
				if (nextClip) {
					nextClip.setStartTime(clipToRemoveStartTime);
				}
			}
		}
	}

	removeLastClip() {
		if (this.clips.length === 0) {
			return;
		}
		this.clips.pop();
	}

	getName(): string {
		switch (this.type) {
			case TrackType.Video:
				return 'Video';
			case TrackType.Audio:
				return 'Audio';
			case TrackType.Subtitle:
				return 'Subtitles';
			default:
				return 'Unknown Track';
		}
	}

	getIcon(): string {
		switch (this.type) {
			case TrackType.Video:
				return 'movie';
			case TrackType.Audio:
				return 'music_note';
			case TrackType.Subtitle:
				return 'subtitles';
			default:
				return 'help_outline';
		}
	}

	getAcceptableAssetType(): AssetType {
		switch (this.type) {
			case TrackType.Video:
				return AssetType.Video;
			case TrackType.Audio:
				return AssetType.Audio;
			default:
				return AssetType.Unknown;
		}
	}

	getPixelPerSecond() {
		return globalState.currentProject?.projectEditorState.timeline.zoom!;
	}

	getDuration(): Duration {
		if (this.clips.length === 0) {
			return new Duration(0);
		}
		return new Duration(Math.max(...this.clips.map((clip) => clip.endTime)));
	}

	getCurrentClip(): Clip | null {
		const currentTime = globalState.currentProject?.projectEditorState.timeline.cursorPosition ?? 0;

		for (let index = 0; index < this.clips.length; index++) {
			const element = this.clips[index];
			if (currentTime >= element.startTime && currentTime <= element.endTime) {
				return element;
			}
		}

		return null;
	}

	getClipBefore(id: number) {
		for (let i = 0; i < this.clips.length; i++) {
			const element = this.clips[i];
			if (element.id === id) {
				return i > 0 ? this.clips[i - 1] : null;
			}
		}
	}

	getClipAfter(id: number) {
		for (let i = 0; i < this.clips.length; i++) {
			const element = this.clips[i];
			if (element.id === id) {
				return i < this.clips.length - 1 ? this.clips[i + 1] : null;
			}
		}
	}

	addSubtitle(verse: Verse, firstWordIndex: number, lastWordIndex: number, surah: number): boolean {
		const arabicText = verse.getArabicTextBetweenTwoIndexes(firstWordIndex, lastWordIndex);

		const startTime = this.getDuration().ms + 1;
		const endTime = globalState.currentProject?.projectEditorState.timeline.cursorPosition || -1;

		if (endTime < startTime) {
			toast.error('End time must be greater than start time.');
			return false;
		}

		this.clips.push(
			new SubtitleClip(
				startTime,
				endTime,
				surah,
				verse.id,
				firstWordIndex,
				lastWordIndex,
				arabicText,
				{}
			)
		);

		return true;
	}

	/**
	 * Ajoute un clip de silence à la piste.
	 * @param beforeClipOfId Si spécifié, ajoute le silence avant le clip avec cet ID.
	 * @returns true si le silence a été ajouté, false sinon.
	 */
	addSilence(beforeClipOfId: number = -1): boolean {
		if (beforeClipOfId === -1) {
			const startTime = this.getDuration().ms + 1;
			const endTime = globalState.currentProject?.projectEditorState.timeline.cursorPosition || -1;

			if (endTime < startTime) {
				toast.error('End time must be greater than start time.');
				return false;
			}

			this.clips.push(new SilenceClip(startTime, endTime));

			return true;
		} else {
			// Trouve le clip avant lequel ajouter le silence
			for (let i = 0; i < this.clips.length; i++) {
				const element = this.clips[i];

				if (element.id === beforeClipOfId) {
					const previousClip = i > 0 ? this.clips[i - 1] : null;

					if (previousClip) {
						const startTime = previousClip.endTime + 1;
						const endTime = startTime + 500; // Durée de 500ms par défaut

						// Vérifie si le clip actuel fera moins de 100ms
						if (element.endTime - (endTime + 1) < 100) {
							toast.error('Cannot add silence: resulting clip duration would be less than 100ms.');
							return false;
						}

						// Insert le clip silence avant le clip spécifié
						this.clips.splice(i, 0, new SilenceClip(startTime, endTime));

						// Change le startTime du clip spécifié pour éviter les chevauchements
						element.setStartTime(endTime + 1);
						return true;
					} else {
						// Ajoute le silence au début de la piste
						const startTime = 0;
						const endTime = 500; // Durée de 500ms par défaut
						if (element.endTime - (endTime + 1) < 100) {
							toast.error('Cannot add silence: resulting clip duration would be less than 100ms.');
							return false;
						}
						this.clips.unshift(new SilenceClip(startTime, endTime));
						// Change le startTime du clip spécifié pour éviter les chevauchements
						element.setStartTime(endTime + 1);
						return true;
					}
				}
			}
		}

		return false;
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(Track, 'clips', Clip);
