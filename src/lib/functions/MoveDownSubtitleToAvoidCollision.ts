/**
 * Gestion des collisions entre sous-titres
 * Déplace automatiquement les sous-titres vers le bas pour éviter les chevauchements
 */

const COLLISION_THRESHOLD = 20; // Seuil d'acceptabilité en pixels

/**
 * Vérifie si un sous-titre est en cours de fade (apparition/disparition)
 */
function isSubtitleFading(element: Element): boolean {
	const htmlElement = element as HTMLElement;

	// Le fade est appliqué au parent du parent du <p class="subtitle-text">
	const fadeContainer = htmlElement.parentElement?.parentElement;

	if (!fadeContainer) return false;

	const computedStyle = getComputedStyle(fadeContainer);

	// Vérifier l'opacity actuelle - si elle n'est ni 0 ni 1, elle est probablement en transition
	const opacity = parseFloat(computedStyle.opacity);
	const isPartialOpacity = opacity > 0 && opacity < 1;

	return isPartialOpacity;
}

/**
 * Déplace un sous-titre vers le bas jusqu'à ce qu'il n'y ait plus de collision
 */
async function moveSubtitleDownToAvoidCollision(
	currentElement: HTMLElement,
	subtitle1: Element,
	subtitle2: Element
): Promise<Element | null> {
	// Détermine quel sous-titre descendre (le plus bas actuellement)
	const subtitle1Rect = subtitle1.getBoundingClientRect();
	const subtitle2Rect = subtitle2.getBoundingClientRect();

	let elementToMove: Element;

	// Descendre celui qui est le plus bas pour éviter de trop perturber la mise en page
	if (subtitle1Rect.top > subtitle2Rect.top) {
		elementToMove = subtitle1;
	} else {
		elementToMove = subtitle2;
	}

	const elementToMoveHTML = elementToMove as HTMLElement;
	const containerDiv = elementToMoveHTML.parentElement?.parentElement;

	if (!containerDiv) return null;

	// Récupère la position verticale actuelle
	const currentStyle = containerDiv.style.top;
	let currentPosition = parseInt(currentStyle.replace('px', '')) || 0;

	// Descendre progressivement jusqu'à ce qu'il n'y ait plus de collision
	// pendant le temps de la descente, on ne veut pas que le sous-titre soit visible
	containerDiv.style.opacity = '0';

	while (true) {
		// Descendre de 20px (réduit pour un mouvement plus précis)
		currentPosition += 20;
		containerDiv.style.top = `${currentPosition}px`;

		// Attendre un peu pour que l'UI se mette à jour
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Vérifier s'il y a encore collision
		const newSubtitle1Rect = subtitle1.getBoundingClientRect();
		const newSubtitle2Rect = subtitle2.getBoundingClientRect();

		const hasCollision =
			newSubtitle1Rect.right > newSubtitle2Rect.left &&
			newSubtitle1Rect.left < newSubtitle2Rect.right &&
			newSubtitle1Rect.bottom > newSubtitle2Rect.top &&
			newSubtitle1Rect.top < newSubtitle2Rect.bottom;

		// Si plus de collision ou si on atteint le bas de l'écran, on s'arrête
		if (!hasCollision || currentPosition > window.innerHeight - 100) {
			break;
		}
	}

	// Rendre le sous-titre visible à nouveau
	containerDiv.style.opacity = '1';

	return elementToMove;
}

/**
 * Fonction principale pour gérer les collisions entre sous-titres
 * Vérifie tous les sous-titres visibles et déplace ceux qui se chevauchent
 */
export async function handleSubtitleCollisions(currentElement: HTMLElement): Promise<void> {
	// Délai pour laisser le temps aux autres sous-titres de disparaître
	setTimeout(async () => {
		// Récupérer tous les sous-titres visibles
		const subtitleParagraphs = document.getElementsByClassName('subtitle-text');
		const processedSubtitles = new Set<Element>(); // Pour éviter de traiter plusieurs fois le même sous-titre

		// Vérifier les collisions entre tous les sous-titres
		for (let i = 0; i < subtitleParagraphs.length; i++) {
			const subtitle1 = subtitleParagraphs[i];

			// Si ce sous-titre a déjà été traité, on passe au suivant
			if (processedSubtitles.has(subtitle1)) continue;

			for (let j = i + 1; j < subtitleParagraphs.length; j++) {
				const subtitle2 = subtitleParagraphs[j];

				// Si ce sous-titre a déjà été traité, on passe au suivant
				if (processedSubtitles.has(subtitle2)) continue;

				const subtitle1Rect = subtitle1.getBoundingClientRect();
				const subtitle2Rect = subtitle2.getBoundingClientRect();

				// Vérifier si les deux sous-titres ont la même langue
				const subtitle1Classes = subtitle1.className.split(' ');
				const subtitle2Classes = subtitle2.className.split(' ');

				// Trouver la classe de langue (celle qui suit 'subtitle-text')
				const subtitle1LangIndex = subtitle1Classes.indexOf('subtitle-text') + 1;
				const subtitle2LangIndex = subtitle2Classes.indexOf('subtitle-text') + 1;

				const subtitle1Lang = subtitle1Classes[subtitle1LangIndex];
				const subtitle2Lang = subtitle2Classes[subtitle2LangIndex];

				// Si c'est la même langue, ne pas traiter la collision
				if (subtitle1Lang === subtitle2Lang) {
					continue;
				}

				// Calculer le chevauchement horizontal et vertical
				const horizontalOverlap = Math.max(
					0,
					Math.min(subtitle1Rect.right, subtitle2Rect.right) -
						Math.max(subtitle1Rect.left, subtitle2Rect.left)
				);
				const verticalOverlap = Math.max(
					0,
					Math.min(subtitle1Rect.bottom, subtitle2Rect.bottom) -
						Math.max(subtitle1Rect.top, subtitle2Rect.top)
				);

				// Vérifier s'il y a collision significative
				if (
					subtitle1Rect.right > subtitle2Rect.left &&
					subtitle1Rect.left < subtitle2Rect.right &&
					subtitle1Rect.bottom > subtitle2Rect.top &&
					subtitle1Rect.top < subtitle2Rect.bottom &&
					// Vérifier que le chevauchement dépasse le seuil d'acceptabilité
					(horizontalOverlap > COLLISION_THRESHOLD || verticalOverlap > COLLISION_THRESHOLD) &&
					!isSubtitleFading(subtitle1) &&
					!isSubtitleFading(subtitle2) &&
					currentElement !== subtitle1 &&
					currentElement !== subtitle2 // On ne veut pas vérifier la collision avec le paragraphe actuel
				) {
					// Collision détectée, descendre le sous-titre le plus bas
					const movedElement = await moveSubtitleDownToAvoidCollision(
						currentElement,
						subtitle1,
						subtitle2
					);

					// Marquer l'élément déplacé comme traité
					if (movedElement) {
						processedSubtitles.add(movedElement);
					}

					// Sortir de la boucle interne après avoir traité une collision
					break;
				}
			}
		}
	}, 10); // Délai nécessaire le temps que les autres sous-titres disparaissent
}
