import { ITestTimeInfo } from "../common/cipherhandler";
import {RealTimeArray, RealTimeObject} from '@convergence/convergence';
import { InteractiveEncoder } from "./interactiveencoder";

export class InteractiveRailFenceEncoder extends InteractiveEncoder {
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
