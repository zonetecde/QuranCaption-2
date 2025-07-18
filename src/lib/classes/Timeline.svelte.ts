import { Asset, AssetClip, Clip, Duration, TrackType } from './index.js';
import { SerializableBase } from './misc/SerializableBase.js';
import { Track } from './Track.svelte.js';
import { globalState } from '$lib/runes/main.svelte.js';

export class Timeline extends SerializableBase {
	tracks: Track[] = $state([]);

	constructor(tracks: Track[] = []) {
		super();
		this.tracks = tracks;
	}

	addAssetToTrack(trackType: string, asset: any): void {
		const track = this.tracks.find((t) => t.type === trackType);
		if (track) {
			track.addAsset(asset);
		} else {
			console.error(`Track of type ${trackType} not found.`);
		}
	}

	getLongestTrackDuration(): Duration {
		return new Duration(Math.max(...this.tracks.map((track) => track.getDuration().ms)));
	}

	removeAssetFromTracks(asset: Asset) {
		this.tracks.forEach((track) => {
			if (track.type === TrackType.Audio || track.type === TrackType.Video) {
				for (let i = track.clips.length - 1; i >= 0; i--) {
					const clip = track.clips[i];

					if (clip && (clip as AssetClip).assetId === asset.id) {
						track.removeClip(clip.id);
					}
				}
			}
		});
	}

	/**
	 * Retourne la vidéo qui doit être actuellement jouée sur la timeline
	 * en fonction du type de piste.
	 * @param trackType Le type de piste
	 * @returns L'asset actuellement joué sur la piste, ou null si aucun clip n'est trouvé
	 */
	getCurrentAssetOnTrack(trackType: TrackType): Asset | null {
		const track = this.tracks.find((t) => t.type === trackType);
		const currentClip = track?.getCurrentClip();

		// Vérifier si le clip est un AssetClip (a la propriété assetId)
		if (
			currentClip &&
			'assetId' in currentClip &&
			typeof (currentClip as any).assetId === 'number'
		) {
			// Accéder directement à l'asset via globalState au lieu d'utiliser getAsset()
			const assetId = (currentClip as any).assetId;
			const asset = globalState.currentProject?.content.getAssetById(assetId);
			return asset || null;
		}

		return null;
	}
}

// Enregistre les classes enfants pour la désérialisation automatique
SerializableBase.registerChildClass(Timeline, 'tracks', Track);
