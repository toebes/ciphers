import { CipherHandler, IState, ITestTimeInfo } from '../common/cipherhandler';
import { IEncoderState } from './cipherencoder';
import { cloneObject, timestampFromSeconds } from '../common/ciphercommon';
import {
    RealTimeObject,
    RealTimeString,
    RealTimeArray,
    ArraySetEvent,
    StringSpliceEvent,
    StringInsertEvent,
    StringRemoveEvent,
    StringSetValueEvent,
    RealTimeNumber,
    NumberSetValueEvent,
} from '@convergence/convergence';
import { bindTextInput } from '@convergence/input-element-bindings';

export class InteractiveHandler extends CipherHandler {
    public testTimeInfo: ITestTimeInfo;
    /** The current confidence factor found in the shared model */
    public startingConfidence = 0;
    /** Our computed confidence */
    public confidence = 0;
    /** The realtime object for the confidence on the current question */
    public realtimeConfidence: RealTimeNumber;
    /** The nominal interval where we don't increase confidence */
    public normalTypingInterval = 0;
    /**
     * Restore the state from a stored record
     * @param data Saved state to restore
     * @param suppressOutput do not update UI if true
     */
    public restore(data: IEncoderState, suppressOutput = false): void {
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
    public setAns(id: string, newchar: string, realtimeAnswer: RealTimeArray, realtimeAnswerString?: RealTimeString): void {
        const parts = id.split('_');
        // Make sure we have a proper element that we can be updating
        // The format of the element id is I<qnum>_<index> but we only need the index portion
        if (parts.length > 1) {
            const index = Number(parts[1]);
            let c = newchar.toUpperCase();
            this.calculateConfidence(id);
            if (!this.isValidChar(c)) {
                c = ' ';
            }
            $('#' + id).val(c);
            if (realtimeAnswer !== null) {
                realtimeAnswer.set(index, c);
            } else {
                realtimeAnswerString.splice(index, 1, c);
            }
        }
    }
    /**
     * 
     * @param qnum Question number to set handler for
     * @param testTimeInfo Timing information for the current test.
     * @param realtimeConidence RealtimeNumber for the confidence value associated with the question for this user
     */
    public setupConfidence(testTimeInfo: ITestTimeInfo, realtimeConfidence: RealTimeNumber): void {
        this.testTimeInfo = testTimeInfo;
        this.testTimeInfo.prevField = undefined;
        this.confidence = 0;
        this.startingConfidence = 0;

        if (realtimeConfidence !== undefined) {
            // Save the handle to the confidence number so that we can update it
            this.realtimeConfidence = realtimeConfidence;
            this.startingConfidence = realtimeConfidence.value();
            if (this.startingConfidence === undefined) {
                this.startingConfidence = 0;
            }
            this.confidence = this.startingConfidence;
            realtimeConfidence.on(RealTimeNumber.Events.VALUE, (event: NumberSetValueEvent) => {
                let deltaConfidence = this.confidence - this.startingConfidence;
                this.startingConfidence = event.element.value();
                this.confidence = this.startingConfidence + deltaConfidence;
            });
        }
    }
    /**
     * Compute a confidence delta for entry into a field and update the total confidence
     * @param id field that was typed into
     */
    public calculateConfidence(id: string) {
        if (id === this.testTimeInfo.prevField) {
            if (id.substr(0, 1) === 'I') {
                // this is an answer field
                const deltatime = this.testTimeInfo.truetime.UTCNow() - this.testTimeInfo.prevTime;
                if (deltatime > 0) {
                    // Calculate a confidence in copying based on the type of cipher
                    // If they take longer than x seconds to type then there is no impact 
                    // It is also a scale that the slower they type, the less the confidence impact
                    if (deltatime < timestampFromSeconds(1)) {  // under 1000 ms
                        this.confidence += 5000 - deltatime;    // range of 4000-5000 confidence
                    } else if (deltatime < timestampFromSeconds(3)) {  // 1000-2999 ms
                        this.confidence += 2500 - (deltatime / 2);        // range of 1000-2000 confidence
                    } else if (deltatime < timestampFromSeconds(5)) { // 3000-4999 ms
                        this.confidence += 1100 - (deltatime / 5)     // range of 100-500 confidence
                    }
                    const deltaConfidence = this.confidence - this.startingConfidence;
                    if (deltaConfidence > 20000) {
                        this.checkConfidence();
                    }
                }
                console.log("Typing in previous answer field: " + id + " Deltatime =" + deltatime + " Confidence=" + this.confidence);
            } else {
                console.log("Typing in a non-answer field");
            }
            this.testTimeInfo.prevField = undefined;
        }
    }
    /**
     * Calculate a final confidence factor and save it if necessary
     * @returns number representing confidence in copying from an outside source
     */
    public checkConfidence(): number {
        if (this.realtimeConfidence !== undefined && this.confidence !== this.startingConfidence) {
            this.realtimeConfidence.value(this.confidence);
            this.startingConfidence = this.confidence;
        }
        return this.confidence;
    }
    /**
     * Remember where we automatically navigate to in order to catch potential copying from another source
     * @param next Field that was navigated to
     */
    public setNext(next: JQuery<HTMLElement>) {
        const id = next.attr('id');
        console.log("+++Setting Next:" + id);
        this.testTimeInfo.prevField = id;
        this.testTimeInfo.prevTime = this.testTimeInfo.truetime.UTCNow();
        next.trigger("focus");
    }
    /**
     * Counts the number of entries associated with an entry
     * @param enttype Type of entry ('I" 'S' 'R')
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @returns number of entries
     */
    public countInteractiveEntries(enttype: string, qnumdisp: string): number {
        this.testTimeInfo.currentQuestion = qnumdisp;

        return document.querySelectorAll('[id^=' + enttype + qnumdisp + '_]').length
    }
    /**
     * Get the HTML element for an entry
     * @param enttype String for the type of entry to get
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @returns HTMLElement corresponding to the entry
     */
    public getInteractiveEntry(enttype: string, qnumdisp: string, index: number): HTMLInputElement {
        this.testTimeInfo.currentQuestion = qnumdisp;
        return <HTMLInputElement>document.getElementById(enttype + qnumdisp + '_' + String(index))
    }
    /**
     * Propagate an entry from the realtime system to the local interface
     * @param enttype String for the type of entry to get
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @param value New replacement character for that index
     */
    public propagateEntry(enttype: string, qnumdisp: string, index: number, value: string): void {
        const dest = this.getInteractiveEntry(enttype, qnumdisp, index);
        if (!!dest) {
            // Separators have a special case here
            if (enttype === 'S') {
                const sepitems = document.querySelectorAll('#Q' + qnumdisp + ' .S' + String(index));
                if (value == '|') {
                    sepitems.forEach((elem: HTMLElement) => elem.classList.add('es'))
                } else {
                    sepitems.forEach((elem: HTMLElement) => elem.classList.remove('es'))
                }

            } else {
                let c = value.toUpperCase();
                if (!this.isValidChar(c)) {
                    c = ' ';
                }
                dest.value = c;
            }
        }
    }
    /**
     * Insert characters into the answer at a given spot
     * @param enttype String for the type of entry to get
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @param value New replacement characters to insert for that index
     */
    public insertEntryChars(enttype: string, qnumdisp: string, index: number, value: string): void {
        let entries = this.countInteractiveEntries(enttype, qnumdisp);
        let shift = value.length;
        // First we need to move everything beyond the string by the length of the string
        let tomove = entries - (index + shift);
        if (tomove > 0) {
            for (let i = 0; i < tomove; i++) {
                let c = ' ';
                let dest = this.getInteractiveEntry(enttype, qnumdisp, entries - i - 1);
                if (!!dest) {
                    let src = this.getInteractiveEntry(enttype, qnumdisp, entries - shift - i - 1);
                    if (!!src) {
                        c = src.value;
                    }
                    dest.value = c;
                }
            }
        }
        // Then we get to put all the characters in place
        for (let i = 0; i < shift; i++) {
            let dest = this.getInteractiveEntry(enttype, qnumdisp, index + i);
            if (!!dest) {
                dest.value = value.substr(i, 1);
            }
        }
    }
    /**
     * Delete characters from the answer at a given spot
     * @param enttype String for the type of entry to get
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @param todelete Number of characters to delete
     */
    public deleteEntryChars(enttype: string, qnumdisp: string, index: number, todelete: number): void {
        let entries = this.countInteractiveEntries(enttype, qnumdisp);
        // Everything from this position on will change
        for (let pos = index; pos < entries; pos++) {
            // By default it gets blanked out
            let c = ' ';
            let srcpos = index + todelete;
            const dest = this.getInteractiveEntry(enttype, qnumdisp, pos);
            if (!!dest) {
                // Unless there is a character remaining to pull from that is not being deleted
                if (srcpos < entries) {
                    const src = this.getInteractiveEntry(enttype, qnumdisp, srcpos);
                    if (!!src) {
                        c = src.value;
                    }
                }
                dest.value = c;
            }
        }
    }
    /**
     * Sometimes the replacement isn't a 'validChar', it is a symbol, like a dot or a dash.
     * The default implementation is to call setRepl(), but this should be over-ridden to
     * handle non-valid characters...
     * @param id Replacement slot input field which is being changed
     * @param newSymbol New symbol to set as the replacement
     * @param realtimeReplacement Interface to the realtime system
     * @param realtimeReplacementString Interface to the realtime system
     */
    public setReplacementSymbol(
        id: string,
        newSymbol: string,
        realtimeReplacement: RealTimeArray,
        realtimeReplacementString: RealTimeString
    ): void {
        this.setRepl(id, newSymbol, realtimeReplacement, realtimeReplacementString);
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
    public setRepl(id: string, newchar: string, realtimeReplacement: RealTimeArray, realtimeReplacementString: RealTimeString): void {
        // Make sure we have a proper element that we can be updating
        // The format of the element id is R<qnum>_<index> but we only need the index portion
        const parts = id.split('_');
        if (parts.length > 1) {
            const index = Number(parts[1]);
            let c = newchar.toUpperCase();
            this.calculateConfidence(id);
            if (!this.isValidChar(c)) {
                c = ' ';
            }
            $('#' + id).val(c);
            if (realtimeReplacement !== null) {
                realtimeReplacement.set(index, c);
            }
            else {
                realtimeReplacementString.splice(index, 1, c);
            }
        }
    }
    /**
     * Propagate a replacement string from the realtime system to the local interface
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @param value New replacement character for that index
     */
    public propagateRepl(qnumdisp: string, index: number, value: string): void {
        let c = value.toUpperCase();
        if (!this.isValidChar(c)) {
            c = ' ';
        }
        $('#R' + qnumdisp + '_' + String(index)).val(c);
    }
    /**
     * Handle clicking on a separator to toggle the line between letters
     * @param id Element clicked on
     * @param realtimeSeparators Runtime structure to track separators
     */
    public clickSeparator(id: string, realtimeSeparators: RealTimeArray): void {
        // Make sure we have a proper element that we can be updating
        // The format of the element id is S<qnum>_<index> and we need both portions
        const parts = id.split('_');
        if (parts.length > 1) {
            const index = Number(parts[1]);
            const separators = realtimeSeparators.value();
            if (separators !== undefined) {
                let c = separators[index];
                c = c === '|' ? ' ' : '|';
                this.propagateEntry('S', parts[0].substr(1), index, c);
                realtimeSeparators.set(index, c);
            }
        }
    }

    /**
     * Bind separator clicks so they appear/disappear on teammates browser
     * @param qdivid <div> with ID matching question number ("0" is the timed question)
     * @param realtimeSeparators Runtime structure to track separators
     */
    public bindSeparatorsField(qdivid: string, realtimeSeparators: RealTimeArray): void {
        $(qdivid + '.ir')
            .off('click')
            .on('click', (e) => {
                this.clickSeparator($(e.target).attr('id'), realtimeSeparators);
            });
    }
    /**
     * Handle clicking on a separator to toggle the line between letters
     * @param id Element clicked on
     * @param realtimeSeparators Runtime structure to track separators
     */
    public clickSeparatorV2(id: string, realtimeSeparators: RealTimeString): void {
        // Make sure we have a proper element that we can be updating
        // The format of the element id is S<qnum>_<index> and we need both portions
        const parts = id.split('_');
        if (parts.length > 1) {
            const index = Number(parts[1]);
            const separators = realtimeSeparators.value();
            if (separators !== undefined) {
                let c = separators.substr(index, 1);
                c = c === '|' ? ' ' : '|';
                this.propagateEntry('S', parts[0].substr(1), index, c);
                realtimeSeparators.splice(index, 1, c);
            }
        }
    }

    /**
     * Bind separator clicks so they appear/disappear on teammates browser
     * @param qdivid <div> with ID matching question number ("0" is the timed question)
     * @param realtimeSeparators Runtime structure to track separators
     */
    public bindSeparatorsFieldV2(qdivid: string, realtimeSeparators: RealTimeString): void {
        $(qdivid + '.ir')
            .off('click')
            .on('click', (e) => {
                this.clickSeparatorV2(e.target.id, realtimeSeparators);
            });
    }

    /**
     * Bind the "notes" text area to a realtime element.
     * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
     * @param realTimeElement Runtime structure to track "notes" text field
     */
    public attachInteractiveNotesHandler(qnumdisp: string, realTimeElement: RealTimeObject): void {
        //
        // the "notes" portion is a generic field for whatever they want to type in the notes.  It gets shared among all the
        // students taking the same tests
        const textArea = $('#in' + qnumdisp)[0] as HTMLTextAreaElement;
        bindTextInput(textArea, realTimeElement.elementAt('notes') as RealTimeString);
    }

    /**
     * Realtime handling for the "separators"
     * @param realTimeElement Runtime structure to track separators
     * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
     */
    public attachInteractiveSeparatorsHandler(
        realTimeElement: RealTimeObject,
        qnumdisp: string
    ): RealTimeArray {
        //
        // For a Patristocrat, we need the list of separators
        //
        const realtimeSeparators = realTimeElement.elementAt('separators') as RealTimeArray;
        if (realTimeElement.hasKey('separators')) {
            const separators = realtimeSeparators.value();
            realtimeSeparators.on(RealTimeArray.Events.SET, (event: ArraySetEvent) => {
                this.propagateEntry('Q', qnumdisp, event.index, event.value.value());
            });
            for (const i in separators) {
                this.propagateEntry('Q', qnumdisp, Number(i), separators[i]);
            }
        }
        return realtimeSeparators;
    }
    /**
    * Realtime handling for the "replacements" field.
    * @param realTimeElement Runtime structure to track the "replacements" field
    * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
    */
    public attachInteractiveReplacementsHandler(
        realTimeElement: RealTimeObject,
        qnumdisp: string
    ): RealTimeArray {
        //
        // the "replacements" portion is for replacement characters in the frequency table
        const realtimeReplacement = realTimeElement.elementAt('replacements') as RealTimeArray;
        realtimeReplacement.on(RealTimeArray.Events.SET, (event: ArraySetEvent) => {
            this.propagateRepl(qnumdisp, event.index, event.value.value());
        });
        // Propagate the initial values into the fields
        const replacements = realtimeReplacement.value();
        for (const i in replacements) {
            this.propagateRepl(qnumdisp, Number(i), replacements[i]);
        }
        return realtimeReplacement;
    }

    /**
     * Realtime handling for the "answer" field.
     * @param realTimeElement Runtime structure to track the "answer" field
     * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
     */
    public attachInteractiveAnswerHandler(
        realTimeElement: RealTimeObject,
        qnumdisp: string
    ): RealTimeArray {
        const enttype = 'I';
        //
        // The "answer" portion is for the typed answer to the cipher
        const realtimeAnswer = realTimeElement.elementAt('answer') as RealTimeArray;
        realtimeAnswer.on(RealTimeArray.Events.SET, (event: ArraySetEvent) => {
            this.propagateEntry(enttype, qnumdisp, event.index, event.value.value());
        });

        // Propagate the initial values into the fields
        const answers = realtimeAnswer.value();
        for (const i in answers) {
            this.propagateEntry(enttype, qnumdisp, Number(i), answers[i]);
        }
        return realtimeAnswer;
    }

    /**
     * Realtime handling for the "answer" field. Version 2
     * @param realTimeElement Runtime structure to track the "answer" field
     * @param qnumdisp Question number formatted for using in an ID ("0" is the timed question)
     */
    public attachInteractiveStringHandler(
        realTimeElement: RealTimeObject,
        qnumdisp: string,
        enttype: string,
        realtimename: string
    ): RealTimeString {
        //
        // The "answer" portion is for the typed answer to the cipher
        const realtimeAnswer = realTimeElement.elementAt(realtimename) as RealTimeString;
        if (realtimeAnswer !== null) {
            realtimeAnswer.on(RealTimeString.Events.SPLICE, (event: StringSpliceEvent) => {
                // from:  https://docs.convergence.io/js-api/classes/real_time_data.realtimestring.html#splice
                // On a successful splice, one of three events will be emitted base on how the method was called
                // (and the effect change that will be made to the string after any remote conflicts are resolved) as follows:
                //   A StringInsertEvent ==> if deleteCount equals 0 and insertValue is a non-empty string.
                //   A StringRemoveEvent ==> if deleteCount is greater than zero and insertValue is an empty string.
                //   A StringSpliceEvent ==> if deleteCount is greater than zero and insertValue is non-empty string.
                // 
                //  index: number        the zero-based index at which to start removing characters
                //  deleteCount: number  the number of characters to remove in the current string.
                //  insertValue: string  The value to insert at the index.
                let deleteCount = event.deleteCount;
                let index = event.index;
                let changes = Math.min(deleteCount, event.insertValue.length);
                // Replace everything that is not shifting.
                // In general this should be everything in the splice request
                for (let i = 0; i < changes; i++) {
                    this.propagateEntry(enttype, qnumdisp, index + i, event.insertValue.substr(i, 1));
                }
                // We may have extra to either insert or delete (hopefully not)
                if (event.insertValue.length > changes) {
                    this.insertEntryChars(enttype, qnumdisp, index + changes, event.insertValue.substr(changes));
                } else if (deleteCount > event.insertValue.length) {
                    this.deleteEntryChars(enttype, qnumdisp, index + changes, deleteCount - changes);
                }
            }).on(RealTimeString.Events.INSERT, (event: StringInsertEvent) => {
                this.insertEntryChars(enttype, qnumdisp, event.index, event.value.valueOf());
            }).on(RealTimeString.Events.REMOVE, (event: StringRemoveEvent) => {
                this.deleteEntryChars(enttype, qnumdisp, event.index, event.value.valueOf().length);
            }).on(RealTimeString.Events.VALUE, (event: StringSetValueEvent) => {
                let newstr = event.element.value();
                for (let i = 0; i < newstr.length; i++) {
                    this.propagateEntry(enttype, qnumdisp, i, newstr.substr(i, 1));
                }
            });

            // Propagate the initial values into the fields
            const answers = realtimeAnswer.value();
            if (!!answers) {
                for (let i = 0; i < answers.length; i++) {
                    this.propagateEntry(enttype, qnumdisp, Number(i), answers[i]);
                }
            }
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
    public bindSingleCharacterField(
        qdivid: string,
        realtimeAnswer: RealTimeArray,
        realtimeReplacement: RealTimeArray,
        realtimeAnswerString?: RealTimeString,
        realtimeReplacementString?: RealTimeString
    ): void {
        if (realtimeAnswer != null || realtimeAnswerString != null) {
            $(qdivid + '.awc')
                .off('keydown')
                .on('keydown', (event) => {
                    const target = $(event.target);
                    let id = target.attr('id');
                    // The ID should be of the form Dx_y where x is the question number and y is the offset of the string
                    let current;
                    let next;
                    const focusables = target.closest('.question').find('.awc');

                    if (event.which === 37) {
                        // left
                        current = focusables.index(event.target);
                        if (current === 0) {
                            next = focusables.last();
                        } else {
                            next = focusables.eq(current - 1);
                        }
                        this.setNext(next);
                        event.preventDefault();
                    } else if (event.which === 39) {
                        // right
                        current = focusables.index(event.target);
                        next = focusables.eq(current + 1).length
                            ? focusables.eq(current + 1)
                            : focusables.eq(0);
                        this.setNext(next);
                        event.preventDefault();
                    } else if (event.which === 46) {
                        // delete key
                        this.markUndo(null);
                        this.setAns(id, ' ', realtimeAnswer, realtimeAnswerString);
                        event.preventDefault();
                    } else if (event.which === 8) {
                        // Backspace key.
                        const c = target.val();
                        const pos = target.prop('selectionStart');
                        if (c === ' ' || c === '' || pos === 0) {
                            // We are at the beginning so we need to go to the previous element
                            current = focusables.index(event.target);
                            if (current === 0) {
                                next = focusables.last();
                            } else {
                                next = focusables.eq(current - 1);
                            }
                            id = next.attr('id');
                            this.setNext(next);
                        }
                        this.markUndo(null);
                        this.setAns(id, ' ', realtimeAnswer, realtimeAnswerString);
                        event.preventDefault();
                    }
                })
                .off('keypress')
                .on('keypress', (event) => {
                    let newchar;
                    const target = $(event.target);
                    const id = target.attr('id');
                    let current;
                    let next;
                    const focusables = target.closest('.question').find('.awc');
                    if (typeof event.key === 'undefined') {
                        newchar = String.fromCharCode(event.keyCode).toUpperCase();
                    } else {
                        newchar = event.key.toUpperCase();
                    }

                    if (this.isValidChar(newchar) || newchar === ' ') {
                        // console.log('Setting ' + id + ' to ' + newchar);
                        this.markUndo(null);
                        this.setAns(id, newchar, realtimeAnswer, realtimeAnswerString);
                        current = focusables.index(event.target);
                        next = focusables.eq(current + 1).length
                            ? focusables.eq(current + 1)
                            : focusables.eq(0);
                        this.setNext(next);
                    } else {
                        // console.log('Not valid:' + newchar);
                    }
                    event.preventDefault();
                });
        }
        if (realtimeReplacement != null || realtimeReplacementString != null) {
            $(qdivid + '.awr')
                .off('keydown')
                .on('keydown', (event) => {
                    const target = $(event.target);
                    let id = target.attr('id');
                    // The ID should be of the form Dx_y where x is the question number and y is the offset of the string
                    const isRails = target.attr('isRails');
                    let current;
                    let next;
                    const focusables = target.closest('.question').find('.awr');

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
                        this.setNext(next);
                        event.preventDefault();
                    } else if ((event.which === 38 || event.which === 40) && isRails == '1') {
                        // navigate RailFence rails up and down... no wrapping.
                        // This is used only for RailFence where the 'replacements' array is lengthened
                        // to provide input fields for 6 rails.  The input field 'id' in the replacements array
                        // which is used only be RainFence, starts with 'X'.  This prevents this code from
                        // executing on other ciphers legitimate use of 'replacements'.

                        // direction is -1 for up and 1 for down...
                        const direction = event.which - 39;

                        current = focusables.index(event.target);
                        // lineLength **should** ALWAYS be an integer!!!
                        const lineLength = focusables.length / 6;
                        const currentRail = Math.floor(current / lineLength);

                        // Test if we are at the top and trying to go up, or bottom and trying to go down and
                        // do nothing if either is true.
                        if (
                            (currentRail === 0 && direction === -1) ||
                            (currentRail === 5 && direction === 1)
                        ) {
                            next = focusables.eq(current);
                        } else {
                            // else move by one whole row...up or down.
                            next = focusables.eq(current + direction * lineLength);
                        }
                        this.setNext(next);
                        event.preventDefault();
                    } else if (event.which === 39) {
                        // right
                        current = focusables.index(event.target);
                        next = focusables.eq(current + 1).length
                            ? focusables.eq(current + 1)
                            : focusables.eq(0);
                        this.setNext(next);
                        event.preventDefault();
                    } else if (event.which === 46) {
                        // delete key
                        this.markUndo(null);
                        this.setRepl(id, ' ', realtimeReplacement, realtimeReplacementString);
                        event.preventDefault();
                    } else if (event.which === 8) {
                        // Backspace key.
                        const c = target.val();
                        const pos = target.prop('selectionStart');
                        if (c === ' ' || c === '' || pos === 0) {
                            // We are at the beginning so we need to go to the previous element
                            current = focusables.index(event.target);
                            if (current === 0) {
                                next = focusables.last();
                            } else {
                                next = focusables.eq(current - 1);
                            }
                            id = next.attr('id');
                            this.setNext(next);
                        }
                        this.markUndo(null);
                        this.setRepl(id, ' ', realtimeReplacement, realtimeReplacementString);
                        event.preventDefault();
                    }
                })
                .off('keypress')
                .on('keypress', (event) => {
                    let newchar;
                    const target = $(event.target);
                    const id = target.attr('id');
                    const isMorse = target.attr('ismorse');
                    let current;
                    let next;
                    const focusables = target.closest('.question').find('.awr');
                    if (typeof event.key === 'undefined') {
                        newchar = String.fromCharCode(event.keyCode).toUpperCase();
                    } else {
                        newchar = event.key.toUpperCase();
                    }

                    if (
                        isMorse === '1' &&
                        (newchar === 'O' || newchar === '.' || newchar === '-' || newchar === 'X')
                    ) {
                        newchar = newchar.toUpperCase().replace(/O/g, String.fromCharCode(9679))
                            .replace(/\./g, String.fromCharCode(9679))
                            .replace(/-/g, String.fromCharCode(9644))
                            .replace(/X/g, String.fromCharCode(9747))

                        this.markUndo(null);
                        this.setReplacementSymbol(id, newchar, realtimeReplacement, realtimeReplacementString);
                        current = focusables.index(event.target);
                        next = focusables.eq(current + 1).length
                            ? focusables.eq(current + 1)
                            : focusables.eq(0);
                        this.setNext(next);
                    } else if (this.isValidChar(newchar) || newchar === ' ') {
                        // console.log('Setting ' + id + ' to ' + newchar)
                        this.markUndo(null);
                        this.setRepl(id, newchar, realtimeReplacement, realtimeReplacementString);
                        current = focusables.index(event.target);
                        next = focusables.eq(current + 1).length
                            ? focusables.eq(current + 1)
                            : focusables.eq(0);
                        this.setNext(next);
                    } else {
                        // console.log('Not valid:' + newchar);
                    }
                    event.preventDefault();
                });
        }
    }
}
