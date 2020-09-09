import { CipherTest, ITestState, IAnswerTemplate } from "./ciphertest";
import { toolMode, ITestTimeInfo, menuMode, CipherHandler, IInteractiveTest, ITestType, ITestQuestionFields, IState } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { cloneObject, makeCallout, timestampToFriendly, timestampMinutes, formatTime } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { TrueTime } from "../common/truetime";
import { CipherPrintFactory } from "./cipherfactory";
import { ConvergenceDomain, RealTimeModel, RealTimeObject } from "@convergence/convergence";
import { CipherInteractiveFactory } from "./cipherfactory";
import { JTTable } from "../common/jttable";

/**
 * CipherTestTimed
 *  Creates the interactive version of a test.
 */
export class CipherTestTimed extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
        test: 0,
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [];
    public pageNumber: number = 0;
    public testTimeInfo: ITestTimeInfo = {
        truetime: new TrueTime(this.timeAnomaly),
        startTime: 0,
        endTime: 0,
        endTimedQuestion: 0
    };

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.updateOutput();
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        // Do we have a test id to display an interactive test for?
        if (this.state.testID != undefined) {
            $('.testcontent').empty();
            this.displayInteractiveTest(this.state.testID);
        }
    }
    /**
     * Report that time has changed.
     * @param msg Msg about time adjustment event
     */
    public timeAnomaly(msg: string) {
        console.log("**Time anomaly reported:" + msg);
    }
    /**
     * GetFactory returns an initialized CipherHandler associated with a question entry
     * @param question Which entry to get the factory for
     * @returns CipherHandler
     */
    public GetFactory(question: number): CipherHandler {
        let state = this.getFileEntry(question);
        let cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        return cipherhandler;
    }
    /**
     * Start the process for displaying an interactive test.  Stage 1 is where we have to check the time to make sure we can even run the test
     * @param testUID T
     */
    public displayInteractiveTest(testUID: string) {
        let result = $('.testcontent');
        this.connectRealtime()
            .then((domain: ConvergenceDomain) => {
                // 2. Initializes the application after connecting by opening a model.
                const modelService = domain.models();
                modelService.open(testUID)
                    .then((answermodel: RealTimeModel) => {
                        console.log('opened answer model')
                        let answertemplate = answermodel.root().value() as IAnswerTemplate;
                        let testid = answertemplate.testid;
                        // Figure out if it is time to run the test
                        let now = this.testTimeInfo.truetime.UTCNow();
                        // We have several situations
                        // 1) Way too early - now + 5 minutes < answertemplate.starttime
                        // 2) Early, but time to load - now < answertemplate.starttime
                        // 3) Test in progress - now >= answertemplate.starttime and now <= answertemplate.endtime (we set endtime to be forever in the future)
                        // 4) Test is over - now > answertemplate.endtime
                        if (now > answertemplate.endtime) {
                            result.append(makeCallout("The time for this test is over.  It ended " + timestampToFriendly(answertemplate.endtimed)))
                            answermodel.close();
                        } else if (now + timestampMinutes(15) < answertemplate.starttime) {
                            // They are way too early.  
                            result.append(makeCallout("The test is not ready to start.  It is scheduled " + timestampToFriendly(answertemplate.starttime)));
                            answermodel.close();
                        } else if (now < answertemplate.starttime) {
                            // Put up a countdown timer..
                            this.countDownTimer(modelService, testid, answermodel, answertemplate);
                        } else {
                            this.openTestModel(modelService, testid, answermodel);
                        }
                    })
                    .catch((error) => { this.reportFailure("Convergence API could not open test model: " + error); });
            });
    }
    /**
     * Wait until time to prepare the test.  During this time, only a countdown timer is displayed and no data is pulled from
     * the model.  Even if they examine the web page, they won't see any content here.
     * @param modelService 
     * @param testid 
     * @param answermodel 
     * @param answertemplate 
     */
    private countDownTimer(modelService, testid: any, answermodel: RealTimeModel, answertemplate: IAnswerTemplate) {
        let result = $('.waittimer');
        let intervalInfo = $("<h3/>").text("The test will start in ").append($("<span/>", { id: "remaintime", class: "timestamp" }));
        result.append(makeCallout(intervalInfo, "primary"));
        let intervaltimer = setInterval(() => {
            let now = this.testTimeInfo.truetime.UTCNow();
            let remaining = answertemplate.starttime - now;
            if (remaining < timestampMinutes(5)) {
                clearInterval(intervaltimer);
                this.openTestModel(modelService, testid, answermodel);
            } else {
                $("#remaintime").text(formatTime(remaining))
            }
        }, 100);
    }
    /**
     * 
     * @param modelService 
     * @param testid 
     * @param answermodel 
     * @param elem 
     */
    private openTestModel(modelService, testid: any, answermodel: RealTimeModel) {
        modelService.open(testid)
            .then((testmodel: RealTimeModel) => {
                console.log("Fully opened: testmodel");
                this.deferredInteractiveTest(testmodel, answermodel);
            })
            .catch((error) => { this.reportFailure("Convergence API could not open data model: " + error); });
    }

    /**
     * makeInteractive creates an interactive question by invoking the appropriate factory for the saved state
     * @param elem HTML DOM element to append UI elements for the question
     * @param state Saved state for the Interactive question to display
     * @param qnum Question number, -1 indicated a timed question
     * @param testtype The type of test that it is being generated for
     * @param realTimeObject Realtime object to establish collaboration for
     */
    public makeInteractive(elem: JQuery<HTMLElement>, state: IState, qnum: number, realTimeObject: RealTimeObject) {
        // Sometimes the handlers die because of insufficient data passed to them (or because they are accessing something that they shouldn't)
        // We protect from this to also prevent it from popping back to the higher level try/catch which is dealing with any communication
        // errors to the server
        try {
            // Find the right class to render the cipher
            let ihandler = CipherInteractiveFactory(state.cipherType, state.curlang);
            // and restore the state
            ihandler.restore(state);

            // Figure out how to display the question text along with the score.  Timed questions will also have a button
            // generated for them as part of the question, but we need to give text telling the test taker to press
            // the button
            let extratext = '';
            let result = $('<div/>', {
                class: 'question ',
            });
            let qtext = $('<div/>', { class: 'qtext' });
            // Is this the timed question?
            if (qnum === -1) {
                // Yes, the question number displays as Timed Question
                qtext.append(
                    $('<span/>', {
                        class: 'timed',
                    }).text('Timed Question')
                );
                extratext =
                    '  When you have solved it, click the <b>Checked Timed Question</b> button so that the time can be recorded and the solution checked.';
            } else {
                // Normal question, just construct the question number (don't forget that we are zero based)
                qtext.append(
                    $('<span/>', {
                        class: 'qnum',
                    }).text(String(qnum + 1) + ')')
                );
            }
            // Add the number of points 
            qtext.append(
                $('<span/>', {
                    class: 'points',
                }).text(' [' + String(state.points) + ' points] ')
            );
            // And finally the question text (plus anything extra fro the timed question)
            qtext.append(
                $('<span/>', {
                    class: 'qbody',
                }).html(state.question + extratext)
            );
            result.append(qtext);
            // pull in the saved interactive content
            result.append($(state.testHTML));
            // Put that into the DOM so that the browser makes it active
            elem.append(result);
            // Now that it is active, we can attach all the handlers to it to process the data and keep
            // it in sync with the realtime components
            ihandler.attachInteractiveHandlers(qnum, realTimeObject, this.testTimeInfo);
        }
        catch (e) {
            // Hmm a bug in the lower code.. Just show it and don't generate this question but at least
            // we can continue and generate the other questions.
            let msg = "Something went wrong generating the Question." +
                " Error =" + e;
            elem.append($("<h1>").text(msg));
        }
    }
    /**
     * 
     * @param elem 
     * @param testmodel 
     * @param answermodel 
     */
    public deferredInteractiveTest(testmodel: RealTimeModel, answermodel: RealTimeModel) {
        let target = $('.testcontent');
        $(".instructions").removeClass("instructions");
        let interactive = testmodel.root().value();
        // For now we will pretend that the test starts when they open it.  This information really
        // needs to come from the answermodel
        this.testTimeInfo.startTime = this.testTimeInfo.truetime.UTCNow();
        this.testTimeInfo.endTimedQuestion = this.testTimeInfo.startTime + (60 * 10);
        this.testTimeInfo.endTime = this.testTimeInfo.startTime + (60 * 50);

        target.append($('<div/>', { class: 'head' }).text(interactive.title));
        console.log(interactive);
        /**
         * Output any running keys used
         */
        if (interactive.runningKeys !== undefined) {
            $('#runningkeys').append($('<h2/>').text('Famous Phrases'));
            for (let ent of this.runningKeys) {
                $('#runningkeys').append(
                    $('<div/>', {
                        class: 'runtitle',
                    }).text(ent.title)
                );
                $('#runningkeys').append(
                    $('<div/>', {
                        class: 'runtext',
                    }).text(ent.text)
                );
            }
        }
        /**
         * See if we need to show/hide the Spanish Hints
         */
        if (interactive.hasSpanish) {
            $('.xenocryptfreq').show();
        } else {
            $('.xenocryptfreq').hide();
        }
        /**
         * See if we need to show/hide the Morse Code Table
         */
        if (interactive.hasMorse) {
            $('.morsetable').show();
        } else {
            $('.morsetable').hide();
        }
        /**
         * Lastly we need to print out the score table
         */
        let table = new JTTable({
            class: 'cell shrink testscores',
        });
        let hastimed = false;
        table
            .addHeaderRow()
            .add('Question')
            .add('Value')
            .add('Incorrect letters')
            .add('Deduction')
            .add('Score');
        for (let qitem of interactive.qdata) {
            let qtitle = '';
            if (qitem.qnum === -1) {
                qtitle = 'Timed';
                hastimed = true;
            } else {
                qtitle = String(qitem.qnum);
            }
            let trow = table
                .addBodyRow()
                .add({
                    settings: { class: 't' },
                    content: qtitle,
                })
                .add({
                    settings: { class: 'v' },
                    content: String(qitem.points),
                });
            //             if (this.) {
            //     trow.                .add({
            //         settings: { colspan: 2, class: 'grey' },
            //         content: '',
            //     }).add('');

            // } else {
            trow.add('')
                .add('')
                .add('');
        }
        // }
        // If we had a timed question, we put in the slot for the bonus
        if (hastimed) {
            table
                .addFooterRow()
                .add('Bonus')
                .add('')
                .add({
                    settings: { colspan: 2, class: 'grey' },
                    content: '',
                })
                .add('');
        }
        table
            .addFooterRow()
            .add('Final Score')
            .add({ settings: { colspan: 4 }, content: '' });
        $('#scoretable').append(table.generate());


        // Now go through and generate all the test questions
        if (interactive.timed !== undefined) {
            this.makeInteractive(target, interactive.timed, -1, answermodel.elementAt("answers", 0) as RealTimeObject);
        }
        for (let qnum = 0; qnum < interactive.count; qnum++) {
            this.makeInteractive(target, interactive.questions[qnum], qnum, answermodel.elementAt("answers", qnum + 1) as RealTimeObject);
        }


    }
}
