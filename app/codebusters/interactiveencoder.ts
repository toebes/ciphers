import { CipherHandler, ITestType, IState } from "../common/cipherhandler";
import { JTTable } from "../common/jttable";
import { IEncoderState } from "./cipherencoder";
import { cloneObject } from "../common/ciphercommon";
import { RealTimeObject, RealTimeString, RealTimeArray, ArrayInsertEvent, ArraySetEvent } from '@convergence/convergence';
import { bindTextInput } from '@convergence/input-element-bindings'

export class InteractiveEncoder extends CipherHandler {
    /**
     * Restore the state from a stored record
     * @param data Saved state to restore
     */
    public restore(data: IEncoderState): void {
        this.state = cloneObject(this.defaultstate) as IState;
        this.setSourceCharset(data.sourceCharset);
        this.copyState(this.state, data);
        // this.setUIDefaults();
        // this.updateOutput();
    }

    /**
     * Generate the HTML to display the interactive form of the cipher
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        let qnumdisp = String(qnum + 1);
        let idclass = "I" + qnumdisp + "_";
        let result = $('<div/>', { id: "Q" + qnumdisp });
        let width = this.maxEncodeWidth;
        let pos = 0;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width -= 20;
            extraclass = ' atest';
        }

        let table = new JTTable({ class: "SOLVER" });

        for (let linestr of this.state.testLines) {
            let qrow = table.addBodyRow()
            let arow = table.addBodyRow()
            for (let c of linestr) {
                qrow.add({ settings: { class: "TOSOLVEC" }, content: c });
                if (this.isValidChar(c)) {
                    arow.add($("<input/>", {
                        id: idclass + pos,
                        class: "awc",
                        type: "text",
                    }))
                } else {
                    arow.add("")
                }
                pos++;
            }
        }
        result.append(table.generate());
        result.append(this.genInteractiveFreqTable(qnum, this.state.encodeType, extraclass));
        result.append($("<textarea/>", { id: "in" + qnumdisp, class: "intnote" }))
        return result;
    }

    public setAns(id: string,
        newchar: string,
        realtimeAnswer: RealTimeArray,
        elem?: JQuery<HTMLElement>) {
        let parts = id.split("_");
        if (parts.length > 1) {
            let index = Number(parts[1]);
            let c = newchar.toUpperCase();
            if (!this.isValidChar(c)) {
                c = " "
            }
            $("#" + id).val(c);
            realtimeAnswer.set(index, c);
        }
    }

    public propagateAns(qnumdisp: string, index: number, value: string) {
        let c = value.toUpperCase();
        if (!this.isValidChar(c)) {
            c = " "
        }
        $("#I" + qnumdisp + "_" + String(index)).val(c);
    }
    public propagateRepl(qnumdisp: string, index: number, value: string) {
        let c = value.toUpperCase();
        if (!this.isValidChar(c)) {
            c = " "
        }
        $("#R" + qnumdisp + "_" + String(index)).val(c);
    }


    public setRepl(id: string,
        newchar: string,
        realtimeReplacement: RealTimeArray,
        elem?: JQuery<HTMLElement>) {
        let parts = id.split("_");
        if (parts.length > 1) {
            let index = Number(parts[1]);
            let c = newchar.toUpperCase()
            if (!this.isValidChar(c)) {
                c = " "
            }
            $("#" + id).val(c);
            realtimeReplacement.set(index, c);
        }
    }

    /**
     * attachInteractiveHandlers attaches the realtime updates to all of the fields
     * @param qnum Question number to set handler for
     * @param realTimeElement RealTimeObject for synchronizing the contents
    */
    public attachInteractiveHandlers(qnum: number, realTimeElement: RealTimeObject) {
        let qnumdisp = String(qnum + 1);
        let qdivid = "#Q" + qnumdisp + " ";
        let realtimeAnswer = realTimeElement.elementAt("answer") as RealTimeArray;
        realtimeAnswer.on("set", (event: ArraySetEvent) => { this.propagateAns(qnumdisp, event.index, event.value.value()); });

        // Propagate the initial values into the fields
        let answers = realtimeAnswer.value();
        for (var i in answers) {
            this.propagateAns(qnumdisp, Number(i), answers[i]);
        }
        let realtimeReplacement = realTimeElement.elementAt("replacements") as RealTimeArray;
        realtimeReplacement.on("set", (event: ArraySetEvent) => { this.propagateRepl(qnumdisp, event.index, event.value.value()); });
        // Propagate the initial values into the fields
        let replacements = realtimeReplacement.value();
        for (var i in replacements) {
            this.propagateRepl(qnumdisp, Number(i), replacements[i]);
        }

        const textArea = $("#in" + qnumdisp)[0] as HTMLTextAreaElement; // document.getElementById('#in' + qnumdisp) as HTMLTextAreaElement;
        bindTextInput(textArea, realTimeElement.elementAt("notes") as RealTimeString);

        $(qdivid + '.awc')
            .off('keyup')
            .on('keyup', event => {
                let target = $(event.target);
                let id = target.attr("id");
                // The ID should be of the form Dx_y where x is the question number and y is the offset of the string
                let current;
                let next;
                let focusables = target.closest(".question").find('.awc');

                if (event.keyCode === 37) {
                    // left
                    current = focusables.index(event.target);
                    if (current === 0) {
                        next = focusables.last();
                    } else {
                        next = focusables.eq(current - 1);
                    }
                    next.focus();
                } else if (event.keyCode === 39) {
                    // right
                    current = focusables.index(event.target);
                    next = focusables.eq(current + 1).length
                        ? focusables.eq(current + 1)
                        : focusables.eq(0);
                    next.focus();
                } else if (event.keyCode === 46 || event.keyCode === 8) {
                    this.markUndo(null);
                    this.setAns(id, ' ', realtimeAnswer, target);
                    current = focusables.index(event.target);
                    if (current === 0) {
                        next = focusables.last();
                    } else {
                        next = focusables.eq(current - 1);
                    }
                    next.focus();
                }
                event.preventDefault();
            })
            .off('keypress')
            .on('keypress', event => {
                let newchar;
                let target = $(event.target);
                let id = target.attr("id");
                let current;
                let next;
                let focusables = target.closest(".question").find('.awc');
                if (typeof event.key === 'undefined') {
                    newchar = String.fromCharCode(event.keyCode).toUpperCase();
                } else {
                    newchar = event.key.toUpperCase();
                }

                if (this.isValidChar(newchar) || newchar === ' ') {
                    if (newchar === ' ') {
                        newchar = '';
                    }
                    console.log('Setting ' + id + ' to ' + newchar);
                    this.markUndo(null);
                    this.setAns(id, newchar, realtimeAnswer, target);
                    current = focusables.index(event.target);
                    next = focusables.eq(current + 1).length
                        ? focusables.eq(current + 1)
                        : focusables.eq(0);
                    next.focus();
                } else {
                    console.log('Not valid:' + newchar);
                }
                event.preventDefault();
            });
        $(qdivid + '.awr')
            .off('keyup')
            .on('keyup', event => {
                let target = $(event.target);
                let id = target.attr("id");
                // The ID should be of the form Dx_y where x is the question number and y is the offset of the string
                let current;
                let next;
                let focusables = target.closest(".question").find('.awr');

                if (event.keyCode === 37) {
                    // left
                    current = focusables.index(event.target);
                    if (current === 0) {
                        next = focusables.last();
                    } else {
                        next = focusables.eq(current - 1);
                    }
                    next.focus();
                } else if (event.keyCode === 39) {
                    // right
                    current = focusables.index(event.target);
                    next = focusables.eq(current + 1).length
                        ? focusables.eq(current + 1)
                        : focusables.eq(0);
                    next.focus();
                } else if (event.keyCode === 46 || event.keyCode === 8) {
                    this.markUndo(null);
                    this.setRepl(id, ' ', realtimeReplacement, target);
                    current = focusables.index(event.target);
                    if (current === 0) {
                        next = focusables.last();
                    } else {
                        next = focusables.eq(current - 1);
                    }
                    next.focus();
                }
                event.preventDefault();
            })
            .off('keypress')
            .on('keypress', event => {
                let newchar;
                let target = $(event.target);
                let id = target.attr("id");
                let current;
                let next;
                let focusables = target.closest(".question").find('.awr');
                if (typeof event.key === 'undefined') {
                    newchar = String.fromCharCode(event.keyCode).toUpperCase();
                } else {
                    newchar = event.key.toUpperCase();
                }

                if (this.isValidChar(newchar) || newchar === ' ') {
                    if (newchar === ' ') {
                        newchar = '';
                    }
                    console.log('Setting ' + id + ' to ' + newchar);
                    this.markUndo(null);
                    this.setRepl(id, newchar, realtimeReplacement, target);
                    current = focusables.index(event.target);
                    next = focusables.eq(current + 1).length
                        ? focusables.eq(current + 1)
                        : focusables.eq(0);
                    next.focus();
                } else {
                    console.log('Not valid:' + newchar);
                }
                event.preventDefault();
            });

    }
}