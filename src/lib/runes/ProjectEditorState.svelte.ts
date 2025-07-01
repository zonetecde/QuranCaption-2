import { ProjectEditorTabs } from '../classes/enums';
import { SerializableBase } from '../classes/misc/SerializableBase';

export class ProjectEditorState extends SerializableBase {
	currentTab: ProjectEditorTabs = $state(ProjectEditorTabs.VideoEditor);
	showDropScreen: boolean = $state(false);
	sections: {
		[name: string]: {
			extended: boolean;
		};
	} = $state({});
}
