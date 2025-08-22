import { globalState } from '$lib/runes/main.svelte';
import { PredefinedSubtitleClip, SubtitleClip } from './Clip.svelte';
import SubtitleFileContentGenerator from './misc/SubtitleFileContentGenerator';

export default class Exporter {
	/**
	 * Exporte le projet sous forme de sous-titres
	 */
	static exportSubtitles() {
		const es = globalState.getExportState;

		const settings = {
			format: es.subtitleFormat,
			includedTargets: Object.entries(es.includedTarget)
				.filter(([, included]) => included)
				.map(([target]) => target),
			exportVerseNumbers: es.exportVerseNumbers
		};

		let subtitles: {
			startTimeMs: number;
			endTimeMs: number;
			text: string;
		}[] = [];

		for (const subtitle of globalState.getSubtitleTrack.clips) {
			// Skip les clips silencieux ou sans texte
			if (!(subtitle instanceof SubtitleClip || subtitle instanceof PredefinedSubtitleClip))
				continue;

			const startTime = subtitle.startTime;
			const endTime = subtitle.endTime;

			let text = '';

			for (const target of settings.includedTargets) {
				if (target === 'arabic') {
					text += subtitle.getText();
				} else {
					if (subtitle instanceof SubtitleClip)
						text += subtitle.getTranslation(target).getText(target, subtitle);
					else if (subtitle instanceof PredefinedSubtitleClip)
						text += subtitle.getTranslation(target).getText(); // Pas de numéro de verset, donc getText() suffit
				}

				text += '\n';
			}

			subtitles.push({
				startTimeMs: startTime,
				endTimeMs: endTime,
				text: text.trim()
			});
		}

		const fileContent = SubtitleFileContentGenerator.generateSubtitleFile(
			subtitles,
			settings.format
		);

		// Téléchargez le fichier
		const blob = new Blob([fileContent], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `qurancaption.subtitles.${globalState.currentProject!.detail.name}.${settings.format.toLowerCase()}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	static exportProjectData() {
		const projectData = globalState.currentProject;

		if (!projectData) {
			console.error('No project data available for export.');
			return;
		}

		const json = JSON.stringify(projectData, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `qurancaption.project.${projectData.detail.name}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
}
