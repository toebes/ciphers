import { ITestTimeInfo } from '../common/cipherhandler';
import { RealTimeObject, RealTimeArray } from '@convergence/convergence';
import { bindTextInput } from '@convergence/input-element-bindings';
import { InteractiveEncoder } from './interactiveencoder';

export class InteractiveAffineEncoder extends InteractiveEncoder {
    /**
     * Propagate an entry from the realtime system to the local interface
     * @param enttype String for the type of entry to get
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @param value New replacement character for that index
     */
    public propagateEntry(enttype: string, qnumdisp: string, index: number, value: string): void {
        if (enttype === 'I') {
            const dest = this.getInteractiveEntry(enttype, qnumdisp, index);
            if (!!dest) {
                let c = value.toUpperCase();
                dest.value = c;
            }
        } else {
            super.propagateEntry(enttype, qnumdisp, index, value);
        }
    }
    /**
     * attachInteractiveHandlers attaches the realtime updates to all of the fields
     * @param qnum Question number to set handler for
     * @param realTimeElement RealTimeObject for synchronizing the contents
     * @param testTimeInfo Timing information for the current test.
     */
    public attachInteractiveHandlers(qnum: number, realTimeElement: RealTimeObject, testTimeInfo: ITestTimeInfo): void {
        const qnumdisp = String(qnum + 1);
        //
        // The "answer" portion is for the typed answer to the cipher
        const realtimeAnswer = realTimeElement.elementAt('answer') as RealTimeArray;
        const answers = realtimeAnswer.value();
        for (const i in answers) {
            const answerfield = $('#I' + qnumdisp + '_' + String(i));
            answerfield.addClass('uppercase')
        }
        this.attachInteractiveAnswerHandler(realTimeElement, qnumdisp)

        this.attachInteractiveNotesHandler(qnumdisp, realTimeElement);

        const qdivid = '#Q' + qnumdisp + ' ';

        const realtimeReplacement = this.attachInteractiveReplacementsHandler(
            realTimeElement,
            qnumdisp
        );
        const realtimeSeparators = this.attachInteractiveSeparatorsHandler(
            realTimeElement,
            qnumdisp
        );

        this.attachInteractiveNotesHandler(qnumdisp, realTimeElement);
        this.bindSingleCharacterField(qdivid, realtimeAnswer, realtimeReplacement);
        this.bindSeparatorsField(qdivid, realtimeSeparators);
    }

    public bindSingleCharacterField(
        qdivid: string,
        realtimeAnswer: RealTimeArray,
        realtimeReplacement: RealTimeArray
    ): void {
        if (realtimeAnswer != null) {
            $(qdivid + '.awc')
                .off('keyup')
                .on('keyup', (event) => {
                    const target = $(event.target);
                    const id = target.attr('id');
                    this.markUndo(null);
                    // Parse out the input id (which is in the form Iq_n where q is the question number and n is the index of the answer)
                    const parts = id.split('_')
                    const index = Number(parts[1]);
                    const ans = target
                        .val()
                        .toString()
                        .toUpperCase();
                    const cursorPos = target.prop('selectionStart');

                    target.val(ans)
                        .prop('selectionStart', cursorPos)
                        .prop('selectionEnd', cursorPos)
                    realtimeAnswer.set(index, ans);
                })
                .off('change')
                .on('change', (event) => {
                    // Catching the change event is overkill, but we don't seem to have any
                    // trigger that gives us notice after a delete key has been pressed
                    const target = $(event.target);
                    const id = target.attr('id');
                    const parts = id.split('_')
                    const index = Number(parts[1]);
                    const ans = target
                        .val()
                        .toString()
                        .toUpperCase();
                    realtimeAnswer.set(index, ans);
                })
                .off('keydown')
                .on('keydown', (event) => {
                    const target = $(event.target);
                    let current;
                    let next;
                    const focusables = target.closest('.question').find('.awc');
                    const length = String(target.val()).length;
                    const cursorPos = target.prop('selectionStart');
                    // Current caret position
                    if (event.which === 37) {
                        // left
                        current = focusables.index(event.target);
                        if (cursorPos === 0) {
                            if (current === 0) {
                                next = focusables.last();
                            } else {
                                next = focusables.eq(current - 1);
                            }
                            // Move the cursor to the end of the field
                            const length = String(next.val()).length;
                            next.focus()
                                .prop('selectionStart', length)
                                .prop('selectionEnd', length)
                            event.preventDefault();
                        }
                    }
                    else if (event.which === 39) {
                        // right
                        current = focusables.index(event.target);
                        // Move to the next text field
                        if (cursorPos === length) {
                            next = focusables.eq(current + 1).length
                                ? focusables.eq(current + 1)
                                : focusables.eq(0);
                            next.focus()
                                .prop('selectionStart', 0)
                                .prop('selectionEnd', 0)

                            event.preventDefault();
                        }
                    } else if (event.which === 8) {
                        // Delete key
                        current = focusables.index(event.target);
                        if (cursorPos === 0) {
                            // If the delete key is pressed at the start of the field we just want to
                            // back up to the previous field and let the delete key get processed there
                            if (current === 0) {
                                next = focusables.last();
                            } else {
                                next = focusables.eq(current - 1);
                            }
                            // Move the cursor to the end of the field
                            const length = String(next.val()).length;
                            next.focus()
                                .prop('selectionStart', length)
                                .prop('selectionEnd', length)
                        }
                    }
                })
        }
        if (realtimeReplacement != null) {
            $(qdivid + '.awr')
                .off('keyup')
                .on('keyup', (event) => {
                    const target = $(event.target);
                    const id = target.attr('id');
                    // The ID should be of the form Dx_y where x is the question number and y is the offset of the string
                    // const isRails = target.attr('isRails');
                    let current;
                    let next;
                    const focusables = target.closest('.question').find('.awr');

                    // Note:  event.keyCode has been marked as deprecated.
                    //        (see https://css-tricks.com/snippets/javascript/javascript-keycodes/)
                    //        event.which is sometimes marked deprecated, too, but it has been undeprecated...
                    //        (see https://github.com/jquery/jquery/issues/4755)
                    //        BEWARE: you can not use event.which for 'keypress' events, only keyup/keydown.

                    document.getElementById(id).addEventListener('keyup', (e) => {
                        const pos = Number($(e.target).prop('selectionStart'));
                        if (event.which === 37) {
                            // left

                            console.log('Caret at: ', pos);
                            current = focusables.index(event.target);
                            if (current === 0) {
                                next = focusables.last(); //Move to last text field
                                next.focus();
                            } else if (pos === 0) {
                                next = focusables.eq(current - 1); // Move to previous text field
                                next.focus();
                            }
                            // current = focusables.index(event.target);
                            //     if (current === 0) {
                            //         next = focusables.last(); //Move to last text field
                            //     } else{
                            //         next = focusables.eq(current - 1); // Move to previous text field
                            //     }
                            // next.focus();
                        } else if (event.which === 39) {
                            // right
                            current = focusables.index(event.target);
                            // Move to the next text field
                            if (pos === focusables.eq(current).length) {
                                next = focusables.eq(current + 1).length
                                    ? focusables.eq(current + 1)
                                    : focusables.eq(0);
                                next.focus();
                            }
                            next.focus();
                        } else if (event.which === 46 || event.which === 8) {
                            // Backspace and delete
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
                    });
                })
                //     if (event.which === 37) {
                //         // left
                //         current = focusables.index(event.target);
                //         if (current === 0) {
                //             next = focusables.last();
                //         } else {
                //             next = focusables.eq(current - 1);
                //         }
                //         next.focus();
                //     } else if ((event.which === 38 || event.which === 40) && isRails == "1") {
                //         // navigate RailFence rails up and down... no wrapping.
                //         // This is used only for RailFence where the 'replacements' array is lengthened
                //         // to provide input fields for 6 rails.  The input field 'id' in the replacements array
                //         // which is used only be RainFence, starts with 'X'.  This prevents this code from
                //         // executing on other ciphers legitimate use of 'replacements'.

                //         // direction is -1 for up and 1 for down...
                //         let direction = event.which - 39;

                //         current = focusables.index(event.target);
                //         // lineLength **should** ALWAYS be an integer!!!
                //         let lineLength = focusables.length / 6;
                //         let currentRail = Math.floor(current / lineLength);

                //         // Test if we are at the top and trying to go up, or bottom and trying to go down and
                //         // do nothing if either is true.
                //         if ((currentRail === 0 && direction === -1) || (currentRail === 5 && direction === 1)) {
                //             next = focusables.eq(current);
                //         } else {
                //             // else move by one whole row...up or down.
                //             next = focusables.eq(current + (direction * lineLength));
                //         }
                //         next.focus();
                //     } else if (event.which === 39) {
                //         // right
                //         current = focusables.index(event.target);
                //         next = focusables.eq(current + 1).length
                //             ? focusables.eq(current + 1)
                //             : focusables.eq(0);
                //         next.focus();
                //     } else if (event.which === 46 || event.which === 8) {
                //         this.markUndo(null);
                //         this.setRepl(id, ' ', realtimeReplacement);
                //         current = focusables.index(event.target);
                //         if (current === 0) {
                //             next = focusables.last();
                //         } else {
                //             next = focusables.eq(current - 1);
                //         }
                //         next.focus();
                //     }
                //     event.preventDefault();
                // })
                .off('keypress')
                .on('keypress', (event) => {
                    let newchar;
                    const target = $(event.target);
                    const id = target.attr('id');
                    // const focusables = target.closest('.question').find('.awr');
                    if (typeof event.key === 'undefined') {
                        newchar = String.fromCharCode(event.keyCode).toUpperCase();
                    } else {
                        newchar = event.key.toUpperCase();
                    }

                    if (this.isValidChar(newchar) || newchar === ' ') {
                        // console.log('Setting ' + id + ' to ' + newchar);
                        this.markUndo(null);
                        this.setRepl(id, newchar, realtimeReplacement, null);
                        // current = focusables.index(event.target);
                        // next = focusables.eq(current + 1).length
                        //     ? focusables.eq(current + 1)
                        //     : focusables.eq(0);
                        // next.focus();
                    } else {
                        // console.log('Not valid:' + newchar);
                    }
                    event.preventDefault();
                });
        }
    }
}
