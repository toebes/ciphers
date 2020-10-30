import { ITestTimeInfo } from "../common/cipherhandler";
import { RealTimeArray, RealTimeObject } from '@convergence/convergence';
import { InteractiveEncoder } from "./interactiveencoder";

export class InteractiveMorseEncoder extends InteractiveEncoder {

    /**
     * Handle a local user typing an replacement character for the cipher replacement table.
     * The character is uppercased and checked to be a valid character before
     * updating the local UI.  Any changes are propagated to the realtime system
     * to be distributed to the other test takers.
     * @param id Replacement slot input field which is being changed
     * @param newchar New character to set as the replacement
     * @param realtimeReplacement Interface to the realtime system
     */
    public setReplacementSymbol(id: string,
                   newchar: string,
                   realtimeReplacement: RealTimeArray) {
        // Make sure we have a proper element that we can be updating
        // The format of the element id is R<qnum>_<index> but we only need the index portion
        let parts = id.split("_");
        if (parts.length > 1) {
            let index = Number(parts[1]);
            //let c = newchar.toUpperCase()
            $("#" + id).val(String.fromCharCode(Number.parseInt(newchar)));
            realtimeReplacement.set(index, String.fromCharCode(Number.parseInt(newchar)));
        }
    }

    /**
     * Propagate a replacement string from the realtime system to the local interface
     * The morse code related questions already have the replacements converted to symbols,
     * so we don't want to sanitize the value...just use it straight away.
     *
     * @param qnumdisp Question number formated for using in an ID ("0" is the timed question)
     * @param index Which character index to update
     * @param value New replacement character for that index
     */
    public propagateRepl(qnumdisp: string, index: number, value: string) {
        $("#R" + qnumdisp + "_" + String(index)).val(value);
    }

    /**
     * attachInteractiveHandlers attaches the realtime updates to all of the fields
     * Table encoder only has answer field and notes.
     * @param qnum Question number to set handler for
     * @param realTimeElement RealTimeObject for synchronizing the contents
     * @param testTimeInfo Timing information for the current test.
    */
   public attachInteractiveHandlers(qnum: number, realTimeElement: RealTimeObject, testTimeInfo: ITestTimeInfo) {
        let qnumdisp = String(qnum + 1);
        let qdivid = "#Q" + qnumdisp + " ";

        let realtimeAnswer = this.attachInteractiveAnswerHandler(realTimeElement, qnumdisp);
        let realtimeReplacement = this.attachInteractiveReplacementsHandler(realTimeElement, qnumdisp);
        let realtimeSeparators = this.attachInteractiveSeparatorsHandler(realTimeElement, qnumdisp);

        this.attachInteractiveNotesHandler(qnumdisp, realTimeElement);
        this.bindSingleCharacterField(qdivid, realtimeAnswer, realtimeReplacement);
        this.bindSeparatorsField(qdivid, realtimeSeparators);
    }
}