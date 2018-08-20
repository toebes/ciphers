import { cloneObject } from "./ciphercommon";
import { CipherHandler, IRunningKey, IState } from "./cipherhandler"
import { JTButtonItem } from "./jtbuttongroup";
import { JTFLabeledInput } from "./jtflabeledinput";

/**
 * Running Key Editor
 */
export class CipherRunningKeyEdit extends CipherHandler {
    cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save", },
        { title: "Load Defaults", color: "primary", id: "defaults", },
    ]
    restore(data: IState): void {
        this.state = cloneObject(this.defaultstate) as IState
        this.copyState(this.state, data)
        this.setUIDefaults()
        this.updateOutput()
    }
    genKeyData(runningKeys: IRunningKey[]): JQuery<HTMLElement> {
        let result = $("<div/>", {class: "precmds"})
        let working = runningKeys.slice()
        working.push({title: "", text: ""})
        for (let index in working) {
            result.append($("<h3>").text("Key #" + String(Number(index) + 1)))
            result.append(JTFLabeledInput("Title", 'text', 'title' + index, working[index].title, "runedit"))
            result.append(JTFLabeledInput("Text", 'textarea', 'text' + index, working[index].text, "runedit"))
        }
        return result
    }
    genPreCommands(): JQuery<HTMLElement> {
        return this.genKeyData(this.getRunningKeyStrings())
    }

    updateOutput(): void {
        $('.precmds').each((i, elem) => {
            $(elem).replaceWith(this.genPreCommands())
        })
    }
    setKeyDefaults(): void {
        $('.precmds').each((i, elem) => {
            $(elem).replaceWith(this.genKeyData(this.defaultRunningKeys))
        })
    }
    saveKeys(): void {
        for (let index = 0; index < 10; index++) {
            let title = $("#title" + index).val() as string
            let text = $("#text" + index).val() as string
            if (text === undefined) {
                break
            }
            if (text !== '') {
                this.setRunningKey(index, {title: title, text: text})
            } else {
                this.deleteRunningKey(index)
            }
        }
    }
    attachHandlers(): void {
        super.attachHandlers()
        $(".runedit").off("input").on("input", () => {
        })
        $("#save").off("click").on("click", () => {
            this.saveKeys();
            this.updateOutput()
        })
        $("#defaults").off("click").on("click", () => {
            this.setKeyDefaults();
        })
    }
}
