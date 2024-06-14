/**
 * Récupère la taille de la vidéo affichée dans le composant.
 * Ne prend pas en compte les marges et les paddings.
 * @returns La largeur et la hauteur de la vidéo affichée.
 */
export function getDisplayedVideoSize(videoComponent: HTMLVideoElement) {
	const videoWidth = videoComponent.videoWidth;
	const videoHeight = videoComponent.videoHeight;
	const containerWidth = videoComponent.clientWidth;
	const containerHeight = videoComponent.clientHeight;

	const videoRatio = videoWidth / videoHeight;
	const containerRatio = containerWidth / containerHeight;

	let displayedWidth, displayedHeight;

	if (containerRatio > videoRatio) {
		displayedHeight = containerHeight;
		displayedWidth = displayedHeight * videoRatio;
	} else {
		displayedWidth = containerWidth;
		displayedHeight = displayedWidth / videoRatio;
	}

	return { displayedWidth, displayedHeight };
}
