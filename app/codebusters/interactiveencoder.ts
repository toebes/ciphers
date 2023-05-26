import { ITestTimeInfo } from '../common/cipherhandler';
import { InteractiveHandler } from './interactivehandler';
import { formatTime } from '../common/ciphercommon';
import { RealTimeObject, RealTimeNumber, NumberSetValueEvent, RealTimeModel } from '@convergence/convergence';
/** This handles the following ciphers:
 *   Baconian
 *   Patristocrat
 *   Porta
 *   TapCode
 *   Vigenere
 */

export class InteractiveEncoder extends InteractiveHandler {
    /** Handler for our interval time which keeps checking that time is right */
    private IntervalTimer: number = undefined;

    /**
     * Checks an answer to see if it is correct.  (Used for the timed question)
     * @param answer Answer string to check
     * @param realtimeSolvetime Handler for the realtime number data for the solution time
     */
    public checkAnswer(answer: string, realtimeSolvetime: RealTimeNumber): void {
        const now = this.testTimeInfo.truetime.UTCNow();
        $('#checktimed').attr('disabled', 'disabled');
        let answertest = '';
        for (const c of answer) {
            if (c !== '' && this.isValidSourceChar(c)) {
                answertest += c;
            } else {
                answertest += '?';
            }
        }
        const check = this.encipherString(answertest, this.state.solMap);
        const diffs = this.countDifferences(check, this.state.solCheck);
        if (diffs <= 2) {
            // They have successfully solved it!
            let solvetime: number;
            if (now > this.testTimeInfo.endTimedQuestion) {
                // Did they somehow solve it AFTER the timed interval?  If so, let them know
                // there there is no bonus
                solvetime = this.testTimeInfo.endTimedQuestion - this.testTimeInfo.startTime;
                alert(
                    'Congratulations! You have successfully solved the timed question but there was no bonus time remaining.'
                );
            } else {
                // Successful solution.  let them know
                solvetime = now - this.testTimeInfo.startTime;
                alert('Congratulations! You have successfully solved the timed question.');
            }
            // Update the realtime data so that their partner sees the solution too.
            realtimeSolvetime.value(solvetime);
            this.updateTimerCheckButton(realtimeSolvetime);
        } else {
            alert('Timed question is not correct: ');
        }
    }
    /**
     * Set the state of the check timed question button based on the current time.
     * @param realtimeSolvetime Handler for the realtime number data for the solution time
     */
    public updateTimerCheckButton(realtimeSolvetime: RealTimeNumber): void {
        const solvetime = realtimeSolvetime.value();
        if (solvetime != undefined && solvetime > 0) {
            $('#checktimed')
                .attr('disabled', 'disabled')
                .text('Solved at ' + formatTime(solvetime));
            clearInterval(this.IntervalTimer);
        } else {
            const now = this.testTimeInfo.truetime.UTCNow();
            if (now >= this.testTimeInfo.endTimedQuestion) {
                $('#checktimed')
                    .attr('disabled', 'disabled')
                    .text('No bonus available');
                clearInterval(this.IntervalTimer);
            } else {
                const remaintime = this.testTimeInfo.endTimedQuestion - now;
                const timestr = formatTime(remaintime);
                $('#checktimed')
                    .prop('disabled', false)
                    .text('Check Timed Question (' + timestr + ' remaining)');
            }
        }
    }
    /**
     * Process to track if they still can answer the timed question.
     * @param realtimeSolvetime Handler for the realtime number data for the solution time
     */
    public trackAnswerTime(realtimeSolvetime: RealTimeNumber): void {
        this.updateTimerCheckButton(realtimeSolvetime);
        const now = this.testTimeInfo.truetime.UTCNow();
        if (now < this.testTimeInfo.endTimedQuestion) {
            this.IntervalTimer = window.setInterval(() => {
                this.updateTimerCheckButton(realtimeSolvetime);
            }, 500);
        }
    }
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

        let realtimeSolvetime = null;
        const qnumdisp = String(qnum + 1);
        const qdivid = '#Q' + qnumdisp + ' ';
        const version = realTimeElement.elementAt('version').value() as number;
        // If we are dealing with the timed question, we need to get the information necessary to check the answer
        if (qnum === -1) {
            realtimeSolvetime = realTimeElement.elementAt('solvetime') as RealTimeNumber;
            if (realTimeElement.hasKey('solvetime')) {
                // If we are in playback mode, just update the solved time the first time we get in
                if (realtimeConfidence === undefined) {
                    this.updateTimerCheckButton(realtimeSolvetime);
                } else {

                    realtimeSolvetime.on(RealTimeNumber.Events.VALUE, (event: NumberSetValueEvent) => {
                        this.updateTimerCheckButton(realtimeSolvetime);
                    });
                }
            }
            if (realtimeConfidence !== undefined) {
                // Start the process for updating the check answer button
                this.trackAnswerTime(realtimeSolvetime);
            }
        }
        // Version 2 changes the array of strings to be a single string
        if (version === 2) {
            const realtimeAnswer = this.attachInteractiveStringHandler(realTimeElement, qnumdisp, 'I', 'answer');
            const realtimeReplacement = this.attachInteractiveStringHandler(realTimeElement, qnumdisp, 'R', 'replacements');
            const realtimeSeparators = this.attachInteractiveStringHandler(realTimeElement, qnumdisp, 'S', 'separators');

            this.bindSingleCharacterField(qdivid, null, null, realtimeAnswer, realtimeReplacement);
            this.bindSeparatorsFieldV2(qdivid, realtimeSeparators);
            if (qnum === -1) {
                $('#checktimed')
                    .off('click')
                    .on('click', () => {
                        this.checkAnswer(realtimeAnswer.value(), realtimeSolvetime);
                    });
            }
        } else {

            const realtimeAnswer = this.attachInteractiveAnswerHandler(realTimeElement, qnumdisp);
            const realtimeReplacement = this.attachInteractiveReplacementsHandler(realTimeElement, qnumdisp);
            const realtimeSeparators = this.attachInteractiveSeparatorsHandler(realTimeElement, qnumdisp);

            this.bindSingleCharacterField(qdivid, realtimeAnswer, realtimeReplacement);
            this.bindSeparatorsField(qdivid, realtimeSeparators);
            if (qnum === -1) {
                $('#checktimed')
                    .off('click')
                    .on('click', () => {
                        let answer = '';
                        for (let c in realtimeAnswer.value()) {
                            answer += c;
                        }
                        this.checkAnswer(answer, realtimeSolvetime);
                    });
            }
        }

        this.attachInteractiveNotesHandler(qnumdisp, realTimeElement);
    }
}
