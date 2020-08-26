import { cloneObject } from "../common/ciphercommon";
import {
    CipherHandler,
    IRunningKey,
    IState,
    menuMode,
    toolMode,
} from "../common/cipherhandler";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTFLabeledInput } from "../common/jtflabeledinput";

/**
 * Running Key Editor
 */
export class CipherRunningKeyEdit extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        { title: "Load Defaults", color: "primary", id: "defaults" },
    ];
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IState): void {
        this.state = cloneObject(this.defaultstate) as IState;
        this.copyState(this.state, data);
        this.setUIDefaults();
        this.updateOutput();
    }
    public genKeyData(runningKeys: IRunningKey[]): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "precmds" });
        let working = runningKeys.slice();
        working.push({ title: "", text: "" });
        for (let index in working) {
            result.append($("<h3>").text("Key #" + String(Number(index) + 1)));
            result.append(
                JTFLabeledInput(
                    "Title",
                    "text",
                    "title" + index,
                    working[index].title,
                    "runedit"
                )
            );
            result.append(
                JTFLabeledInput(
                    "Text",
                    "textarea",
                    "text" + index,
                    working[index].text,
                    "runedit"
                )
            );
        }
        return result;
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genKeyData(this.getRunningKeyStrings());
    }

    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.test);
        $(".precmds").each((i, elem) => {
            $(elem).replaceWith(this.genPreCommands());
        });
    }
    public setKeyDefaults(): void {
        $(".precmds").each((i, elem) => {
            $(elem).replaceWith(this.genKeyData(this.defaultRunningKeys));
        });
    }
    public saveKeys(): void {
        for (let index = 0; index < 10; index++) {
            let title = $("#title" + index).val() as string;
            let text = $("#text" + index).val() as string;
            if (text === undefined) {
                break;
            }
            if (text !== "") {
                this.setRunningKey(index, { title: title, text: text });
            } else {
                this.deleteRunningKey(index);
            }
        }
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $(".runedit")
            .off("input")
            .on("input", () => { });
        $("#save")
            .off("click")
            .on("click", () => {
                this.saveKeys();
                this.updateOutput();
            });
        $("#defaults")
            .off("click")
            .on("click", () => {
                this.setKeyDefaults();
            });
    }
}
