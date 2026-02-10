import NoteStagePlugin from "main";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import * as path from "path"
import * as fs from "fs"
import * as child_process from "child_process";

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

		new Setting(containerEl)
			.setName("Environment Variables")
			.setDesc(
				"Commands can load environment variables from a .env file in the plugin directory."
			)
			.addButton((btn) => {
				btn.setButtonText("Edit")
					.onClick(() => {
						const envFilePath = path.resolve((this._plugin.app.vault.adapter as any).basePath,this._plugin.manifest.dir!, ".env")
						// Create file if missing
						if (!fs.existsSync(envFilePath))
							fs.writeFileSync(`"${envFilePath}"`, "", "utf-8");
						child_process.exec(envFilePath, (err) => {
							if (err) {
								new Notice("Failed to open .env file");
								console.error(err);
							}
						});
					});
			});
	}
}
