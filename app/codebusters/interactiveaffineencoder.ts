import { ITestTimeInfo } from "../common/cipherhandler";
import { RealTimeObject, RealTimeArray } from '@convergence/convergence';
import { bindTextInput } from '@convergence/input-element-bindings'
import { InteractiveEncoder } from "./interactiveencoder";
import { max, number } from "mathjs";

export class InteractiveAffineEncoder extends InteractiveEncoder {

    /**
     * attachInteractiveHandlers attaches the realtime updates to all of the fields
     * @param qnum Question number to set handler for
     * @param realTimeElement RealTimeObject for synchronizing the contents
     * @param testTimeInfo Timing information for the current test.
    */
   public attachInteractiveHandlers(qnum: number, realTimeElement: RealTimeObject, testTimeInfo: ITestTimeInfo) {
       let qnumdisp = String(qnum + 1);
       //
       // The "answer" portion is for the typed answer to the cipher
       let realtimeAnswer = realTimeElement.elementAt("answer") as RealTimeArray;
       let answers = realtimeAnswer.value();
       for (var i in answers) {
           let answerfield = $("#I" + qnumdisp + "_" + String(i));
           // Propagate the initial values into the fields
           answerfield.val(answers[i]);
           // Bind the field for any updates
           if (answerfield.length > 0) {
               bindTextInput(answerfield[0], realtimeAnswer.elementAt(i));
           }
       }
       // The "replacements" portion is for the typed answer to the cipher
       if (realTimeElement.hasKey("replacements")) {
           let realtimeReplacement = realTimeElement.elementAt("replacements") as RealTimeArray;
           let replacements = realtimeReplacement.value();
           for (var i in answers) {
               let replfield = $("#R" + qnumdisp + "_" + String(i));
               // Propagate the initial values into the fields
               replfield.val(replacements[i]);
               // Bind the field for any updates
               if (replfield.length > 0) {
                   bindTextInput(replfield[0], realtimeReplacement.elementAt(i));
               }
           }
       }

        this.attachInteractiveNotesHandler(qnumdisp, realTimeElement);

        let qdivid = "#Q" + qnumdisp + " ";

        let realtimeReplacement = this.attachInteractiveReplacementsHandler(realTimeElement, qnumdisp);
        let realtimeSeparators = this.attachInteractiveSeparatorsHandler(realTimeElement, qnumdisp);

        this.attachInteractiveNotesHandler(qnumdisp, realTimeElement);
        this.bindSingleCharacterField(qdivid, realtimeAnswer, realtimeReplacement);
        this.bindSeparatorsField(qdivid, realtimeSeparators);
    }

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
                    let length = String(target.val()).length;
                    let cursorPos = target.prop("selectionStart");
                    console.log("cursorPos:" + cursorPos);
                    console.log("length: " + length);
                    // Current caret position
                    if (event.which === 37) {
                        // left
                        current = focusables.index(event.target);
                        if (cursorPos === 0){
                            if (current === 0 ){
                                next = focusables.last();
                            } else {
                                next = focusables.eq(current - 1);
                            }
                            next.focus();
                        }
                    } 
                    if (event.which === 39) {
                        // right
                        current = focusables.index(event.target);
                        // Move to the next text field
                        if(cursorPos === length){
                            next = focusables.eq(current + 1).length
                            ? focusables.eq(current + 1)
                            : focusables.eq(0);
                            next.focus();
                        }
                    } else if (event.which === 46 || event.which === 8) {
                        // Backspace and delete
                        // this.markUndo(null);
                        // this.setAns(id, ' ', realtimeAnswer);
                        // current = focusables.index(event.target);
                        // if (current === 0) {
                        //     next = focusables.last();
                        // } else {
                        //     next = focusables.eq(current - 1);
                        // }
                        // next.focus();
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
                        // console.log('Setting ' + id + ' to ' + newchar);
                        this.markUndo(null);

                        let index = Number(id.split("_"));
                        let ans = String(realtimeAnswer.get(index));
                        let c = newchar.toUpperCase();
                        $("#" + id).val(c);
                        this.setAns(id,(ans + c).toUpperCase(),realtimeAnswer);
                        // realtimeAnswer.set(index,(ans+c).toUpperCase());
                        // this.setAns(id,newchar,realtimeAnswer);
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


                    document.getElementById(id).addEventListener('keyup', e => {
                        let pos = Number(e.target.selectionStart);
                        if (event.which === 37) {
                            // left
                            
                            console.log('Caret at: ', pos);
                            current = focusables.index(event.target);
                            if (current === 0) {
                                next = focusables.last(); //Move to last text field
                                next.focus();
                            } else  if(pos === 0){
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
                            if(pos === focusables.eq(current).length){
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
                    })
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
                        // console.log('Setting ' + id + ' to ' + newchar);
                        this.markUndo(null);
                        this.setRepl(id, newchar, realtimeReplacement);
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