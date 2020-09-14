import { CipherHandler, IState} from "../common/cipherhandler";
import { IEncoderState } from "./cipherencoder";
import { cloneObject} from "../common/ciphercommon";
import { RealTimeObject, RealTimeString, RealTimeArray, ArraySetEvent} from '@convergence/convergence';
import { bindTextInput } from '@convergence/input-element-bindings'

export class InteractiveHandler extends CipherHandler {
    /**
     * Restore the state from a stored record
     * @param data Saved state to restore
     */
    public restore(data: IEncoderState, suppressOutput: boolean = false): void {
        this.state = cloneObject(this.defaultstate) as IState;
        this.setSourceCharset(data.sourceCharset);
        this.copyState(this.state, data);
    }

    /**
     * Handle a local user typing an answer character for the cipher. 
     * The character is uppercased and checked to be a valid character before
     * updating the local UI.  Any changes are propagated to the realtime system
     * to be distributed to the other test takers.
     * @param id Character slot input field which is being changed
     * @param newchar New character to set as the answer
     * @param realtimeAnswer Interface to the realtime system
     */
    public setAns(id: string,
        newchar: string,
        realtimeAnswer: RealTimeArray) {
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
     * @param realtimeReplacement Interface to the realtime system
     */
    public setRepl(id: string,
        newchar: string,
        realtimeReplacement: RealTimeArray) {
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
     * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
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
    /**
     * Handle clicking on a separator to toggle the line between letters
     * @param id Element clicked on
     * @param realtimeSeparators Runtime structure to track separators
     */
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

    /**
     * Bind separator clicks so they appear/disappear on teammates browser
     * @param qdivid <div> with ID matching question number ("0" is the timed question)
     * @param realtimeSeparators Runtime structure to track separators
     */
    public bindSeparatorsField(qdivid: string, realtimeSeparators: RealTimeArray) {
        $(qdivid + '.ir')
            .off('click')
            .on('click', e => {
                this.clickSeparator($(e.target).attr('id'), realtimeSeparators);
            });
    }

    /**
     * Bind the "notes" text area to a realtime element.
     * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
     * @param realTimeElement Runtime structure to track "notes" text field
     */
    public attachInteractiveNotesHandler(qnumdisp: string, realTimeElement: RealTimeObject) {
        //
        // the "notes" portion is a generic field for whatever they want to type in the notes.  It gets shared among all the
        // students taking the same tests
        const textArea = $("#in" + qnumdisp)[0] as HTMLTextAreaElement;
        bindTextInput(textArea, realTimeElement.elementAt("notes") as RealTimeString);
    }

    /**
     * Realtime handling for the "separators"
     * @param realTimeElement Runtime structure to track separators
     * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
     */
    public attachInteractiveSeparatorsHandler(realTimeElement: RealTimeObject, qnumdisp: string) {
        //
        // For a Patristocrat, we need the list of separators
        //
        let realtimeSeparators = realTimeElement.elementAt("separators") as RealTimeArray;
        if (realTimeElement.hasKey("separators")) {
            let separators = realtimeSeparators.value();
            realtimeSeparators.on("set", (event: ArraySetEvent) => {
                this.propagateSep(qnumdisp, event.index, event.value.value());
            });
            for (var i in separators) {
                this.propagateSep(qnumdisp, Number(i), separators[i]);
            }
        }
        return realtimeSeparators;
    }

    /**
     * Realtime handling for the "replacements" field.
     * @param realTimeElement Runtime structure to track the "replacements" field
     * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
     */
    public attachInteractiveReplacementsHandler(realTimeElement: RealTimeObject, qnumdisp: string) {
        //
        // the "replacements" portion is for replacement characters in the frequency table
        let realtimeReplacement = realTimeElement.elementAt("replacements") as RealTimeArray;
        realtimeReplacement.on("set", (event: ArraySetEvent) => {
            this.propagateRepl(qnumdisp, event.index, event.value.value());
        });
        // Propagate the initial values into the fields
        let replacements = realtimeReplacement.value();
        for (var i in replacements) {
            this.propagateRepl(qnumdisp, Number(i), replacements[i]);
        }
        return realtimeReplacement;
    }

    /**
     * Realtime handling for the "answer" field.
     * @param realTimeElement Runtime structure to track the "answer" field
     * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
     */
    public attachInteractiveAnswerHandler(realTimeElement: RealTimeObject, qnumdisp: string) {
        //
        // The "answer" portion is for the typed answer to the cipher
        let realtimeAnswer = realTimeElement.elementAt("answer") as RealTimeArray;
        realtimeAnswer.on("set", (event: ArraySetEvent) => {
            this.propagateAns(qnumdisp, event.index, event.value.value());
        });

        // Propagate the initial values into the fields
        let answers = realtimeAnswer.value();
        for (var i in answers) {
            this.propagateAns(qnumdisp, Number(i), answers[i]);
        }
        return realtimeAnswer;
    }

    /**
     * Bind single character fields (i.e. answer or replacement) for keystrokes, skip binding that field
     * if the field passed is 'null'.
     * @param qdivid <div> with ID matching question number ("0" is the timed question)
     * @param realtimeAnswer Realtime answer character field
     * @param realtimeReplacement Realtime replacement character field
     */
    public bindSingleCharacterField(qdivid: string, realtimeAnswer: RealTimeArray, realtimeReplacement: RealTimeArray) {
        if (realtimeAnswer != null) {
            $(qdivid + '.awc')
                .off('keyup')
                .on('keyup', event => {
                    let target = $(event.target);
                    let id = target.attr("id");
                    // The ID should be of the form Dx_y where x is the question number and y is the offset of the string
                    let current;
                    let next;
                    let focusables = target.closest(".question").find('.awc');

                    if (event.which === 37) {
                        // left
                        current = focusables.index(event.target);
                        if (current === 0) {
                            next = focusables.last();
                        } else {
                            next = focusables.eq(current - 1);
                        }
                        next.focus();
                    } else if (event.which === 39) {
                        // right
                        current = focusables.index(event.target);
                        next = focusables.eq(current + 1).length
                            ? focusables.eq(current + 1)
                            : focusables.eq(0);
                        next.focus();
                    } else if (event.which === 46 || event.which === 8) {
                        this.markUndo(null);
                        this.setAns(id, ' ', realtimeAnswer);
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
                        this.setAns(id, newchar, realtimeAnswer);
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
        if (realtimeReplacement != null) {
            $(qdivid + '.awr')
                .off('keyup')
                .on('keyup', event => {
                    let target = $(event.target);
                    let id = target.attr("id");
                    // The ID should be of the form Dx_y where x is the question number and y is the offset of the string
                    let isRails = target.attr("isRails");
                    let current;
                    let next;
                    let focusables = target.closest(".question").find('.awr');

                    // Note:  event.keyCode has been marked as deprecated.
                    //        (see https://css-tricks.com/snippets/javascript/javascript-keycodes/)
                    //        event.which is sometimes marked deprecated, too, but it has been undeprecated...
                    //        (see https://github.com/jquery/jquery/issues/4755)
                    //        BEWARE: you can not use event.which for 'keypress' events, only keyup/keydown.

                    if (event.which === 37) {
                        // left
                        current = focusables.index(event.target);
                        if (current === 0) {
                            next = focusables.last();
                        } else {
                            next = focusables.eq(current - 1);
                        }
                        next.focus();
                    } else if ((event.which === 38 || event.which === 40) && isRails == "1"){
                        // navigate RailFence rails up and down... no wrapping.
                        // This is used only for RailFence where the 'replacements' array is lengthened
                        // to provide input fields for 6 rails.  The input field 'id' in the replacements array
                        // which is used only be RainFence, starts with 'X'.  This prevents this code from
                        // executing on other ciphers legitimate use of 'replacements'.

                        // direction is -1 for up and 1 for down...
                        let direction = event.which - 39;

                        current = focusables.index(event.target);
                        // lineLength **should** ALWAYS be an integer!!!
                        let lineLength = focusables.length / 6;
                        let currentRail = Math.floor(current / lineLength);

                        // Test if we are at the top and trying to go up, or bottom and trying to go down and
                        // do nothing if either is true.
                        if ((currentRail === 0 && direction === -1) || (currentRail === 5 && direction === 1)) {
                            next = focusables.eq(current);
                        } else {
                            // else move by one whole row...up or down.
                            next = focusables.eq(current + (direction * lineLength));
                        }
                        next.focus();
                    } else if (event.which === 39) {
                        // right
                        current = focusables.index(event.target);
                        next = focusables.eq(current + 1).length
                            ? focusables.eq(current + 1)
                            : focusables.eq(0);
                        next.focus();
                    } else if (event.which === 46 || event.which === 8) {
                        this.markUndo(null);
                        this.setRepl(id, ' ', realtimeReplacement);
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
                        this.setRepl(id, newchar, realtimeReplacement);
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
}