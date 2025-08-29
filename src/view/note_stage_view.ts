import { App, ItemView, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { exec } from "child_process";
import NoteStagePlugin from 'main';

export const VIEW_TYPE_NOTE_STAGE = 'note-stage-view';

export class NoteStageView extends ItemView {
    private _plugin: NoteStagePlugin
    constructor(leaf: WorkspaceLeaf,plugin: NoteStagePlugin) {
        super(leaf)
        this._plugin = plugin
    }
    private _onFileOpen: ((file: TFile | null) => any) | null = null

    getViewType() {
        return VIEW_TYPE_NOTE_STAGE;
    }

    getDisplayText() {
        return 'Note stage view';
    }

    async onOpen() {
        const app = this.app
        const container = this.contentEl;
        container.empty();
        const wrap = container.createDiv({ cls: "stage-panel" });

        const radios = wrap.createDiv({ cls: "stage-panel__radios" });

        const labelStage = radios.createEl("label", { cls: "stage-panel__label" });
        const inputStage = labelStage.createEl("input", {
            type: "radio",
            attr: { name: "stageMode", value: "stage", checked: "true" },
        });
        labelStage.appendText(" Stage");

        const labelUnstage = radios.createEl("label", { cls: "stage-panel__label" });
        const inputUnstage = labelUnstage.createEl("input", {
            type: "radio",
            attr: { name: "stageMode", value: "unstage" },
        });
        labelUnstage.appendText(" Unstage");

        const codeBox = wrap.createEl("textarea", {
            cls: "stage-panel__code",
            text: "",
        });
        codeBox.rows = 10;
        const refreshBtn = wrap.createEl("button", { cls: "stage-panel__btn", text: "Refresh" })
        const runBtn = wrap.createEl("button", { cls: "stage-panel__btn", text: "Run" });
        inputStage.addEventListener("change", async (ev) => {
            codeBox.setText("")
            const file = this._plugin.currentFile
            if ((ev.target as HTMLInputElement)?.checked && file) {
                try {
                    const fileList = await this.getFileList(app, file.path, false)
                    codeBox.setText(fileList.join("\n"))
                } catch (ex) {
                    codeBox.setText(ex)
                }
            }
        })
        inputUnstage.addEventListener("change", async (ev) => {
            codeBox.setText("")
            const file = this._plugin.currentFile
            if ((ev.target as HTMLInputElement)?.checked && file) {
                try {
                    const fileList = await this.getFileList(app, file.path, true)
                    codeBox.setText(fileList.join("\n"))
                } catch (ex) {
                    codeBox.setText(ex)
                }
            }
        })
        runBtn.addEventListener("click", async () => {
            runBtn.disabled = true
            try {
                const rawFileList = codeBox.getText().trim()
                if (rawFileList == "")
                    new Notice(`Nothing to ${inputStage.checked ? "stage" : "unstage"}`)
                else{
                    const fileList = rawFileList.split("\n").filter(it=>it.trim()!="")
                    const batchSize = 50
                    for (let i = 0; i < fileList.length; i += batchSize) {
                        const command = "git " + (inputUnstage.checked ? "restore --staged " : "add ") + fileList.slice(i, i + batchSize).map(it=>`"${it.trim()}"`).join(" ")
                        await this.executeCommand(command, (app.vault.adapter as any).basePath)
                    }
                    new Notice(`Files have been ${inputStage.checked ? "staged" : "unstaged"}`)
                }
            } catch (ex) {
                new Notice(ex)
            } finally {
                runBtn.disabled = false
            }
        })
        refreshBtn.addEventListener("click", async () => {
            codeBox.setText("")
            const file = this._plugin.currentFile
            if (file) {
                try {
                    const fileList = await this.getFileList(app, file.path, inputUnstage.checked)
                    codeBox.setText(fileList.join("\n"))
                } catch (ex) {
                    codeBox.setText(ex)
                }
            }
        })
        this._onFileOpen = async (file) => {
            codeBox.setText("")
            if (file) {
                try {
                    const fileList = await this.getFileList(app, file.path, inputUnstage.checked)
                    codeBox.setText(fileList.join("\n"))
                } catch (ex) {
                    codeBox.setText(ex)
                }
            }
        }
        app.workspace.on("file-open", this._onFileOpen)
        refreshBtn.click()
    }

    private async getFileList(app: App, path: string, unstage: boolean): Promise<string[]> {
        const resolvedLinks = app.metadataCache.resolvedLinks
        if (!resolvedLinks[path]) {
            await new Promise<void>((resolve) => {
                const callback = () => {
                    app.metadataCache.off("resolved", callback)
                    resolve()
                }
                app.metadataCache.on("resolved", callback)
            })
        }
        const attachmentList = [path]
        const stagedFiles = await new Promise<Set<string>>((resolve, reject) => {
            exec("git diff --name-only --cached", {
                cwd: (app.vault.adapter as any).basePath
            }, (ex, stdout) => {
                if (ex != null) reject(ex)
                else resolve(new Set(stdout.trim().split("\n")))
            })
        })
        for (const link in resolvedLinks[path]) {
            if (link.startsWith("attachments"))
                attachmentList.push(link)
        }
        return attachmentList.filter(link => !(unstage && !stagedFiles.has(link)))
    }

    private executeCommand(cmd: string, cwd?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(cmd, {
                cwd: cwd
            }, (err) => {
                if (err != null) reject(err)
                else resolve()
            })
        })
    }

    async onClose() {
        if (this._onFileOpen)
            this.app.workspace.off("file-open", this._onFileOpen)
    }
}