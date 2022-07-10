import { ITestTimeInfo } from '../common/cipherhandler';
import { RealTimeModel, RealTimeNumber, RealTimeObject } from '@convergence/convergence';
import { InteractiveEncoder } from './interactiveencoder';
/** This handles the following ciphers:
 *   Atbash
 *   Caesar
 *   PigPen
 *   DancingMen
 */

export class InteractiveTableEncoder extends InteractiveEncoder {
    /**
     * attachInteractiveHandlers attaches the realtime updates to all of the fields
     * @param qnum Question number to set handler for
     * @param realTimeElement RealTimeObject for synchronizing the contents
     * @param testTimeInfo Timing information for the current test.
     * @param realtimeConidence RealtimeNumber for the confidence value associated with the question for this user
     */
    public attachInteractiveHandlers(
        qnum: number,
        realTimeElement: RealTimeObject,
        testTimeInfo: ITestTimeInfo,
        realtimeConfidence: RealTimeNumber
    ): void {
        this.setupConfidence(testTimeInfo, realtimeConfidence);

        const qnumdisp = String(qnum + 1);
        const qdivid = '#Q' + qnumdisp + ' ';
        const version = realTimeElement.elementAt('version').value() as number;

        if (version === 2) {
            const realtimeAnswer = this.attachInteractiveStringHandler(realTimeElement, qnumdisp, 'I', 'answer');
            this.bindSingleCharacterField(qdivid, null, null, realtimeAnswer, null);
        } else {
            const realtimeAnswer = this.attachInteractiveAnswerHandler(realTimeElement, qnumdisp);
            this.bindSingleCharacterField(qdivid, realtimeAnswer, null);
        }
        this.attachInteractiveNotesHandler(qnumdisp, realTimeElement);
    }
}
