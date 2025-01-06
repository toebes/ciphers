import { CipherHandler, toolMode } from '../common/cipherhandler'

export class CipherApp extends CipherHandler {
    public activeToolMode: toolMode = toolMode.app;
    public guidanceURL = 'apphint.html#none';
    public cipherName = 'unknown'

    public buildKbRow(keys: string, rowclass: string): JQuery<HTMLElement> {
        const result = $("<div/>", { class: `kbrow ${rowclass}` })
        for (const c of keys) {
            result.append($('<a/>', { class: `key k${c}`, 'data-key': c }).text(c))
        }
        return result;
    }
    public buildKeyboard(target: JQuery<HTMLElement>) {
        const div = $("<div/>", { class: "kbmain" })
        target.append(div);
        const divkbrows = $('<div/>', { class: 'keyboard-rows' })
        div.append(divkbrows);
        divkbrows.append(this.buildKbRow("QWERTYUIOP", "row1"))
        divkbrows.append(this.buildKbRow("ASDFGHJKL", "row2"))
        divkbrows.append(this.buildKbRow("ZXCVBNM", "row3"))
        const arrows = $("<div/>", { class: "arrows" })
        div.append(arrows)
        arrows.append($('<a/>', { class: "key kup", 'data-key': "-UP" }).text("↑"))
        arrows.append($('<a/>', { class: "key kleft", 'data-key': "-LEFT" }).text("←"))
        arrows.append($('<a/>', { class: "key kright", 'data-key': "-RIGHT" }).text("→"))
        arrows.append($('<a/>', { class: "key kdown", 'data-key': "-DOWN" }).text("↓"))
    }
    public buildCustomUI(): void {
        $('#agui').append(this.cipherName)
        $('#ainfo1').text(`Info1: ${this.cipherName}`)
        $('#ainfo2').text(`Info1: ${this.cipherName}`)
        this.buildKeyboard($('#akbd'))
    }
}

