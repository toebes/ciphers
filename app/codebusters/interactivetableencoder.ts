import { ITestTimeInfo } from '../common/cipherhandler';
import { RealTimeObject } from '@convergence/convergence';
import { InteractiveEncoder } from './interactiveencoder';

export class InteractiveTableEncoder extends InteractiveEncoder {
    /**
     * attachInteractiveHandlers attaches the realtime updates to all of the fields
     * Table encoder only has answer field and notes.
     * @param qnum Question number to set handler for
     * @param realTimeElement RealTimeObject for synchronizing the contents
     * @param testTimeInfo Timing information for the current test.
     */
    public attachInteractiveHandlers(
        qnum: number,
        realTimeElement: RealTimeObject,
        testTimeInfo: ITestTimeInfo
    ): void {
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
