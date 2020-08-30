import { CipherHandler, IState, ITestTimeInfo } from "../common/cipherhandler";
import { IEncoderState } from "./cipherencoder";
import { cloneObject, formatTime } from "../common/ciphercommon";
import { RealTimeObject, RealTimeString, RealTimeArray, ArraySetEvent, RealTimeNumber, NumberSetValueEvent } from '@convergence/convergence';
import { bindTextInput } from '@convergence/input-element-bindings'

export class InteractiveEncoder extends CipherHandler {
    private testTimeInfo: ITestTimeInfo;
    /** Handler for our interval time which keeps checking that time is right */
    private IntervalTimer: NodeJS.Timeout = undefined;
    /**
     * Restore the state from a stored record
     * @param data Saved state to restore
     */
    public restore(data: IEncoderState): void {
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
     * Checks an answer to see if it is correct.  (Used for the timed question)
     * @param answer Answer string to check
     * @param realtimeSolvetime Handler for the realtime number data for the solution time
     */
    public checkAnswer(answer: string[], realtimeSolvetime: RealTimeNumber) {
        let now = this.testTimeInfo.truetime.UTCNow();
        $("#checktimed").prop("disabled", true);
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
        if (diffs <= 2) {
            // They have successfully solved it!
            let solvetime = 0;
            if (now > this.testTimeInfo.endTimedQuestion) {
                // Did they somehow solve it AFTER the timed interval?  If so, let them know
                // there there is no bonus
                solvetime = this.testTimeInfo.endTimedQuestion - this.testTimeInfo.startTime;
                alert("Congratulations! You have successfully solved the timed question but there was no bonus time remaining.");
            } else {
                // Successful solution.  let them know
                solvetime = now - this.testTimeInfo.startTime;
                alert("Congratulations! You have successfully solved the timed question.");
            }
            // Update the realtime data so that their partner sees the solution too.
            realtimeSolvetime.value(solvetime);
            this.updateTimerCheckButton(realtimeSolvetime);
        } else {
            alert("Timed question is not corect" + diffs);

        }
    }
    /**
     * Set the state of the check timed question button based on the current time.
     * @param realtimeSolvetime Handler for the realtime number data for the solution time
     */
    public updateTimerCheckButton(realtimeSolvetime: RealTimeNumber) {
        let solvetime = realtimeSolvetime.value();
        if (solvetime != undefined && solvetime > 0) {
            $("#checktimed").prop("disabled", true)
                .text("Solved at " + formatTime(solvetime));
        } else {
            let now = this.testTimeInfo.truetime.UTCNow();
            if (now <= this.testTimeInfo.startTime ||
                now >= this.testTimeInfo.endTimedQuestion) {
                $("#checktimed").prop("disabled", true).text("No bonus available");
            } else {
                let remaintime = this.testTimeInfo.endTimedQuestion - now;
                let timestr = formatTime(remaintime);
                $("#checktimed").prop("disabled", false)
                    .text("Check Timed Question (" + timestr + " remaining)");
            }
        }
    }
    /**
     * Process to track if they still can answer the timed question.
     * @param realtimeSolvetime Handler for the realtime number data for the solution time
     */
    public trackAnswerTime(realtimeSolvetime: RealTimeNumber) {
        this.updateTimerCheckButton(realtimeSolvetime);
        let now = this.testTimeInfo.truetime.UTCNow();
        if (now < this.testTimeInfo.endTimedQuestion) {
            this.IntervalTimer = setInterval(() => { this.updateTimerCheckButton(realtimeSolvetime) }, 900);
        }
    }
    /**
     * attachInteractiveHandlers attaches the realtime updates to all of the fields
     * @param qnum Question number to set handler for
     * @param realTimeElement RealTimeObject for synchronizing the contents
     * @param testTimeInfo Timing information for the current test.
    */
    public attachInteractiveHandlers(qnum: number, realTimeElement: RealTimeObject, testTimeInfo: ITestTimeInfo) {
        this.testTimeInfo = testTimeInfo;
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
        $(qdivid + '.ir')
            .off('click')
            .on('click', e => {
                this.clickSeparator($(e.target).attr('id'), realtimeSeparators);
            });
        // If we are dealing with the timed question, we need to get the information necessary to check the answer
        if (qnum === -1) {
            let realtimeSolvetime = realTimeElement.elementAt("solvetime") as RealTimeNumber;
            if (realTimeElement.hasKey("solvetime")) {
                realtimeSolvetime.on("value", (event: NumberSetValueEvent) => { this.updateTimerCheckButton(realtimeSolvetime) });
            }
            $("#checktimed")
                .off('click')
                .on('click', () => { this.checkAnswer(realtimeAnswer.value(), realtimeSolvetime); });
            // Start the process for updating the check answer button
            this.trackAnswerTime(realtimeSolvetime);
        }
    }
}