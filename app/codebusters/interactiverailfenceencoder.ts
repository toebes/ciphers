import { ITestTimeInfo } from '../common/cipherhandler';
import { RealTimeObject } from '@convergence/convergence';
import { InteractiveEncoder } from './interactiveencoder';

export class InteractiveRailFenceEncoder extends InteractiveEncoder {
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

        const realtimeAnswer = this.attachInteractiveAnswerHandler(realTimeElement, qnumdisp);
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
}
