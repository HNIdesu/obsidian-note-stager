import NoteStagePlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class NoteStagerSettingView extends PluginSettingTab {
	private _plugin: NoteStagePlugin;
	constructor(app: App, plugin: NoteStagePlugin) {
		super(app, plugin);
		this._plugin = plugin;
	}
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName("Git executable").addText((text) => {
			text.setPlaceholder("git")
				.setValue(this._plugin.settings.gitExecutable)
				.onChange(async (v) => {
					this._plugin.settings.gitExecutable = v;
					await this._plugin.saveSettings();
				});
		});
	}
}
