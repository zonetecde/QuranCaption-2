export enum TrackType {
	Video = 'Video',
	Audio = 'Audio',
	Subtitle = 'Subtitle'
}

export enum AssetType {
	Audio = 'audio',
	Video = 'video',
	Image = 'image',
	Unknown = 'unknown'
}

export function getAssetTypeFromString(value: string): AssetType | undefined {
	return (Object.values(AssetType) as string[]).includes(value) ? (value as AssetType) : undefined;
}

export enum ProjectEditorTabs {
	VideoEditor = 'Video editor',
	SubtitlesEditor = 'Subtitles editor',
	Translations = 'Translations',
	Style = 'Style',
	Export = 'Export'
}
