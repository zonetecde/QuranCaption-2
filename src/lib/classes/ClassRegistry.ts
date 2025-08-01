import { SerializableBase } from './misc/SerializableBase';
import {
	Clip,
	SubtitleClip,
	SilenceClip,
	PredefinedSubtitleClip,
	AssetClip,
	ClipWithTranslation
} from './Clip.svelte';
import { AssetTrack, SubtitleTrack, Track } from './Track.svelte';
import { Timeline } from './Timeline.svelte';
import { ProjectContent } from './ProjectContent.svelte';
import { Project } from './Project';
import { ProjectDetail } from './ProjectDetail.svelte';
import {
	ProjectEditorState,
	SubtitlesEditorState,
	TimelineState
} from './ProjectEditorState.svelte';
import { Translation, VerseTranslation, PredefinedSubtitleTranslation } from './Translation.svelte';
import { ProjectTranslation } from './ProjectTranslation.svelte';
import { VerseRange } from './VerseRange';
import { Duration } from './Duration';
import { Status } from './Status';
import { Asset } from '.';

/**
 * Enregistre automatiquement toutes les classes sérialisables pour permettre
 * la désérialisation automatique basée sur le nom de classe
 */
export function initializeClassRegistry() {
	// Classes de base
	SerializableBase.registerClass('VerseRange', VerseRange);
	SerializableBase.registerClass('Duration', Duration);
	SerializableBase.registerClass('Status', Status);

	// Classes de clips
	SerializableBase.registerClass('Clip', Clip);
	SerializableBase.registerClass('ClipWithTranslation', ClipWithTranslation);
	SerializableBase.registerClass('SilenceClip', SilenceClip);
	SerializableBase.registerClass('PredefinedSubtitleClip', PredefinedSubtitleClip);
	SerializableBase.registerClass('AssetClip', AssetClip);
	SerializableBase.registerClass('AssetTrack', AssetTrack);
	SerializableBase.registerClass('SubtitleTrack', SubtitleTrack);
	SerializableBase.registerClass('SubtitleClip', SubtitleClip);
	SerializableBase.registerClass('Asset', Asset);

	// Classes de projet
	SerializableBase.registerClass('Track', Track);
	SerializableBase.registerClass('Timeline', Timeline);
	SerializableBase.registerClass('ProjectContent', ProjectContent);
	SerializableBase.registerClass('Project', Project);
	SerializableBase.registerClass('ProjectDetail', ProjectDetail);
	// Classes d'état
	SerializableBase.registerClass('ProjectEditorState', ProjectEditorState);
	SerializableBase.registerClass('SubtitlesEditorState', SubtitlesEditorState);
	SerializableBase.registerClass('TimelineState', TimelineState);

	// Classes de traduction
	SerializableBase.registerClass('ProjectTranslation', ProjectTranslation);
	SerializableBase.registerClass('Translation', Translation);
	SerializableBase.registerClass('VerseTranslation', VerseTranslation);
	SerializableBase.registerClass('PredefinedSubtitleTranslation', PredefinedSubtitleTranslation);
}
