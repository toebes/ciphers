import { IState, ITestTimeInfo } from "../common/cipherhandler";
import { IEncoderState } from "./cipherencoder";
import { cloneObject } from "../common/ciphercommon";
import { RealTimeObject, RealTimeString, RealTimeArray } from '@convergence/convergence';
import { bindTextInput } from '@convergence/input-element-bindings'
import { InteractiveEncoder } from "./interactiveencoder";

export class InteractiveHillEncoder extends InteractiveEncoder {

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
                bindTextInput(answerfield[0] as HTMLInputElement, realtimeAnswer.elementAt(i));
            } else {
                console.log("Unable to find the answer field\n")
            }
        }
        // The "replacement" portion is for the typed answer to the cipher
        if (realTimeElement.hasKey("replacements")) {
            let realtimeReplacement = realTimeElement.elementAt("replacements") as RealTimeArray;
            let replacements = realtimeReplacement.value();
            for (var i in answers) {
                let replfield = $("#R" + qnumdisp + "_" + String(i));
                // Propagate the initial values into the fields
                replfield.val(replacements[i]);
                // Bind the field for any updates
                if (replfield.length > 0) {
                    bindTextInput(replfield[0] as HTMLInputElement, realtimeReplacement.elementAt(i));
                } else {
                    console.log("Unable to find the replacement field\n")
                }
            }
        }

        this.attachInteractiveNotesHandler(qnumdisp, realTimeElement);
    }
}