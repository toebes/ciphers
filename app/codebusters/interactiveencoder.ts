import { ITestTimeInfo } from "../common/cipherhandler";
import { InteractiveHandler } from "./interactivehandler";
import { formatTime } from "../common/ciphercommon";
import { RealTimeObject, RealTimeNumber, NumberSetValueEvent } from '@convergence/convergence';

export class InteractiveEncoder extends InteractiveHandler {
    private testTimeInfo: ITestTimeInfo;
    /** Handler for our interval time which keeps checking that time is right */
    private IntervalTimer: NodeJS.Timeout = undefined;

    /**
     * Checks an answer to see if it is correct.  (Used for the timed question)
     * @param answer Answer string to check
     * @param realtimeSolvetime Handler for the realtime number data for the solution time
     */
    public checkAnswer(answer: string[], realtimeSolvetime: RealTimeNumber) {
        let now = this.testTimeInfo.truetime.UTCNow();
        $("#checktimed").prop("disabled", true);
        let answertest = "";
        for (let c of answer) {
            if (c !== "" && this.isValidChar(c)) {
                answertest += c;
            } else {
                answertest += "?";
            }
        }
        let check = this.encipherString(answertest, this.state.solMap);
        let diffs = this.countDifferences(check, this.state.solCheck);
        if (diffs <= 2) {
            // They have successfully solved it!
            let solvetime: number;
            if (now > this.testTimeInfo.endTimedQuestion) {
                // Did they somehow solve it AFTER the timed interval?  If so, let them know
                // there there is no bonus
                solvetime = this.testTimeInfo.endTimedQuestion - this.testTimeInfo.startTime;
                alert("Congratulations! You have successfully solved the timed question but there was no bonus time remaining.");
            } else {
                // Successful solution.  let them know
                solvetime = now - this.testTimeInfo.startTime;
                alert("Congratulations! You have successfully solved the timed question.");
            }
            // Update the realtime data so that their partner sees the solution too.
            realtimeSolvetime.value(solvetime);
            this.updateTimerCheckButton(realtimeSolvetime);
        } else {
            alert("Timed question is not correct: " + diffs);

        }
    }
    /**
     * Set the state of the check timed question button based on the current time.
     * @param realtimeSolvetime Handler for the realtime number data for the solution time
     */
    public updateTimerCheckButton(realtimeSolvetime: RealTimeNumber) {
        let solvetime = realtimeSolvetime.value();
        if (solvetime != undefined && solvetime > 0) {
            $("#checktimed").prop("disabled", true)
                .text("Solved at " + formatTime(solvetime));
            clearInterval(this.IntervalTimer);
        } else {
            let now = this.testTimeInfo.truetime.UTCNow();
            if (now <= this.testTimeInfo.startTime ||
                now >= this.testTimeInfo.endTimedQuestion) {
                $("#checktimed").prop("disabled", true).text("No bonus available");
                clearInterval(this.IntervalTimer);
            } else {
                let remaintime = this.testTimeInfo.endTimedQuestion - now;
                let timestr = formatTime(remaintime);
                $("#checktimed").prop("disabled", false)
                    .text("Check Timed Question (" + timestr + " remaining)");
            }
        }
    }
    /**
     * Process to track if they still can answer the timed question.
     * @param realtimeSolvetime Handler for the realtime number data for the solution time
     */
    public trackAnswerTime(realtimeSolvetime: RealTimeNumber) {
        this.updateTimerCheckButton(realtimeSolvetime);
        let now = this.testTimeInfo.truetime.UTCNow();
        if (now < this.testTimeInfo.endTimedQuestion) {
            this.IntervalTimer = setInterval(() => { this.updateTimerCheckButton(realtimeSolvetime) }, 500);
        }
    }
    /**
     * attachInteractiveHandlers attaches the realtime updates to all of the fields
     * @param qnum Question number to set handler for
     * @param realTimeElement RealTimeObject for synchronizing the contents
     * @param testTimeInfo Timing information for the current test.
     */
    public attachInteractiveHandlers(qnum: number, realTimeElement: RealTimeObject, testTimeInfo: ITestTimeInfo) {
        this.testTimeInfo = testTimeInfo;
        let qnumdisp = String(qnum + 1);
        let qdivid = "#Q" + qnumdisp + " ";

        let realtimeAnswer = this.attachInteractiveAnswerHandler(realTimeElement, qnumdisp);
        let realtimeReplacement = this.attachInteractiveReplacementsHandler(realTimeElement, qnumdisp);
        let realtimeSeparators = this.attachInteractiveSeparatorsHandler(realTimeElement, qnumdisp);
        this.attachInteractiveNotesHandler(qnumdisp, realTimeElement);

        this.bindSingleCharacterField(qdivid, realtimeAnswer, realtimeReplacement);
        this.bindSeparatorsField(qdivid, realtimeSeparators);

        // If we are dealing with the timed question, we need to get the information necessary to check the answer
        if (qnum === -1) {
            let realtimeSolvetime = realTimeElement.elementAt("solvetime") as RealTimeNumber;
            if (realTimeElement.hasKey("solvetime")) {
                realtimeSolvetime.on(RealTimeNumber.Events.VALUE, (event: NumberSetValueEvent) => { this.updateTimerCheckButton(realtimeSolvetime) });
            }
            $("#checktimed")
                .off('click')
                .on('click', () => { this.checkAnswer(realtimeAnswer.value(), realtimeSolvetime); });
            // Start the process for updating the check answer button
            this.trackAnswerTime(realtimeSolvetime);
        }
    }
}