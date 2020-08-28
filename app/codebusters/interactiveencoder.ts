import { CipherHandler, ITestType, IState } from "../common/cipherhandler";
import { JTTable } from "../common/jttable";
import { IEncoderState } from "./cipherencoder";
import { cloneObject } from "../common/ciphercommon";
import { RealTimeObject, RealTimeString, RealTimeArray, ArrayInsertEvent, ArraySetEvent } from '@convergence/convergence';
import { bindTextInput } from '@convergence/input-element-bindings'
import { ICipherType } from "../common/ciphertypes";

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
     * Handle a local user typing an answer character for the cipher. 
     * The character is uppercased and checked to be a valid character before
     * updating the local UI.  Any changes are propagated to the realtime system
     * to be distributed to the other test takers.
     * @param id Character slot input field which is being changed
     * @param newchar New character to set as the answer
     * @param realtimeAnswer Interface to the realtime system
     * @param elem UI Element which corresponds to the field being changed (in case it is needed)
     */
    public setAns(id: string,
        newchar: string,
        realtimeAnswer: RealTimeArray,
        elem?: JQuery<HTMLElement>) {
        let parts = id.split("_");
        // Make sure we have a proper element that we can be updating
        // The format of the element id is I<qnum>_<index> but we only need the index portion
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
    /**
     * Propagate an answer from the realtime system to the local interface
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @param value New replacement character for that index
     */
    public propagateAns(qnumdisp: string, index: number, value: string) {
        let c = value.toUpperCase();
        if (!this.isValidChar(c)) {
            c = " "
        }
        $("#I" + qnumdisp + "_" + String(index)).val(c);
    }
    /**
     * Handle a local user typing an replacement character for the cipher replacement table. 
     * The character is uppercased and checked to be a valid character before
     * updating the local UI.  Any changes are propagated to the realtime system
     * to be distributed to the other test takers.
     * @param id Replacement slot input field which is being changed
     * @param newchar New character to set as the replacement
     * @param realtimeAnswer Interface to the realtime system
     * @param elem UI Element which corresponds to the field being changed (in case it is needed)
     */
    public setRepl(id: string,
        newchar: string,
        realtimeReplacement: RealTimeArray,
        elem?: JQuery<HTMLElement>) {
        // Make sure we have a proper element that we can be updating
        // The format of the element id is R<qnum>_<index> but we only need the index portion
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
     * Propagate a replacement string from the realtime system to the local interface
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @param value New replacement character for that index
     */
    public propagateRepl(qnumdisp: string, index: number, value: string) {
        let c = value.toUpperCase();
        if (!this.isValidChar(c)) {
            c = " "
        }
        $("#R" + qnumdisp + "_" + String(index)).val(c);
    }
    /**
     * Propagate a replacement string from the realtime system to the local interface
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @param value New replacement character for that index
     */
    public propagateSep(qnumdisp: string, index: number, value: string) {
        if (value == "|") {
            $("#Q" + qnumdisp + " .S" + String(index)).addClass("es");
        } else {
            $("#Q" + qnumdisp + " .S" + String(index)).removeClass("es");
        }
    }

    public clickSeparator(id: string, realtimeSeparators: RealTimeArray) {
        // Make sure we have a proper element that we can be updating
        // The format of the element id is S<qnum>_<index> and we need both portions
        let parts = id.split("_");
        if (parts.length > 1) {
            let index = Number(parts[1]);
            let separators = realtimeSeparators.value();
            if (separators !== undefined) {
                let c = separators[index];
                c = (c === "|") ? " " : "|";
                this.propagateSep(parts[0].substr(1), index, c)
                realtimeSeparators.set(index, c);
            }
        }
    }
    public checkAnswer(answer: string[]) {
        let answertest = "";
        for (let c of answer) {
            if (c !== "" && this.isValidChar(c)) {
                answertest += c;
            } else {
                answertest += "?";
            }
        }
        let check = this.encipherString(answertest, this.state.solMap);
        let diffs = this.countDifferences(check, this.state.solCheck);
        alert("Total Differences =" + diffs);
    }

    /**
     * attachInteractiveHandlers attaches the realtime updates to all of the fields
     * @param qnum Question number to set handler for
     * @param realTimeElement RealTimeObject for synchronizing the contents
    */
    public attachInteractiveHandlers(qnum: number, realTimeElement: RealTimeObject) {
        let qnumdisp = String(qnum + 1);
        let qdivid = "#Q" + qnumdisp + " ";
        //
        // The "answer" portion is for the typed answer to the cipher
        let realtimeAnswer = realTimeElement.elementAt("answer") as RealTimeArray;
        realtimeAnswer.on("set", (event: ArraySetEvent) => { this.propagateAns(qnumdisp, event.index, event.value.value()); });

        // Propagate the initial values into the fields
        let answers = realtimeAnswer.value();
        for (var i in answers) {
            this.propagateAns(qnumdisp, Number(i), answers[i]);
        }

        //
        // the "replacements" portion is for replacement characters in the frequency table
        let realtimeReplacement = realTimeElement.elementAt("replacements") as RealTimeArray;
        realtimeReplacement.on("set", (event: ArraySetEvent) => { this.propagateRepl(qnumdisp, event.index, event.value.value()); });
        // Propagate the initial values into the fields
        let replacements = realtimeReplacement.value();
        for (var i in replacements) {
            this.propagateRepl(qnumdisp, Number(i), replacements[i]);
        }

        //
        // For a Patristocrat, we need the list of separators
        // 
        let realtimeSeparators = realTimeElement.elementAt("separators") as RealTimeArray;
        if (realTimeElement.hasKey("separators")) {
            let separators = realtimeSeparators.value();
            realtimeSeparators.on("set", (event: ArraySetEvent) => { this.propagateSep(qnumdisp, event.index, event.value.value()); });
            for (var i in separators) {
                this.propagateSep(qnumdisp, Number(i), separators[i]);
            }
        }
        //
        // the "notes" portion is a generic field for whatever they want to type in the notes.  It gets shared among all the
        // students taking the same tests
        const textArea = $("#in" + qnumdisp)[0] as HTMLTextAreaElement;
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
        $(qdivid + '.ir')
            .off('click')
            .on('click', e => {
                this.clickSeparator($(e.target).attr('id'), realtimeSeparators);
            });
        // If we are dealing with the timed question, we need to get the information necessary to check the answer
        if (qnum === -1) {
            $("#checktimed")
                .off('click')
                .on('click', e => { this.checkAnswer(realtimeAnswer.value()); })
        }
    }
}