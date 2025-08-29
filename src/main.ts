import { Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { NoteStageView, VIEW_TYPE_NOTE_STAGE } from './view/note_stage_view';

interface NoteStagePluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: NoteStagePluginSettings = {
	mySetting: 'default'
}

export default class NoteStagePlugin extends Plugin {
	settings: NoteStagePluginSettings;

	private _onFileOpen: ((file: TFile | null) => any) | null = null
	currentFile: TFile | null = null
	async onload() {
		await this.loadSettings();
		this.registerView(
			VIEW_TYPE_NOTE_STAGE,
			(leaf) => new NoteStageView(leaf, this)
		);
		this.addRibbonIcon("dice", "Activate Note Stage View", () => {
			this.activateView()
		})
		this._onFileOpen = (file) => {
			this.currentFile = file
		}
		this.app.workspace.on("file-open", this._onFileOpen)
	}

	onunload() {
		if (this._onFileOpen)
			this.app.workspace.off("file-open", this._onFileOpen)
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_NOTE_STAGE);
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf!.setViewState({ type: VIEW_TYPE_NOTE_STAGE, active: true });
		}
		workspace.revealLeaf(leaf!);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}