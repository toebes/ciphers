import { CipherTest, ITestState, IAnswerTemplate } from "./ciphertest";
import { toolMode, ITestTimeInfo, menuMode, CipherHandler, IInteractiveTest, ITestType, ITestQuestionFields, IState } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { cloneObject, makeCallout, timestampToFriendly, timestampMinutes, formatTime, timestampSeconds } from "../common/ciphercommon";
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
                        // Populate the time from the answer template
                        this.testTimeInfo.startTime = answertemplate.starttime;
                        this.testTimeInfo.endTimedQuestion = answertemplate.endtimed;
                        this.testTimeInfo.endTime = answertemplate.endtime;

                        let testid = answertemplate.testid;
                        // Figure out if it is time to run the test
                        let now = this.testTimeInfo.truetime.UTCMSNow();
                        // We have several situations
                        // 1) Way too early - now + 5 minutes < this.testTimeInfo.startTime
                        // 2) Early, but time to load - now < this.testTimeInfo.startTime
                        // 3) Test in progress - now >= this.testTimeInfo.startTime and now <= this.testTimeInfo.endTime (we set endtime to be forever in the future)
                        // 4) Test is over - now > this.testTimeInfo.endTime
                        if (now > this.testTimeInfo.endTime) {
                            result.append(makeCallout($("<h3/>").text("The time for this test is over.  It ended " + timestampToFriendly(this.testTimeInfo.endTime / timestampSeconds(1)))))
                            answermodel.close();
                        } else if (now + timestampMinutes(15) < this.testTimeInfo.startTime) {
                            // They are way too early.  
                            result.append(makeCallout($("<h3/>").text("The test is not ready to start.  It is scheduled " + timestampToFriendly(this.testTimeInfo.startTime / timestampSeconds(1)))));
                            answermodel.close();
                        } else if (now < this.testTimeInfo.startTime) {
                            // Put up a countdown timer..
                            this.countDownTimer(modelService, testid, answermodel);
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
    private countDownTimer(modelService, testid: any, answermodel: RealTimeModel) {
        let result = $('.waittimer');
        let intervalInfo = $("<h3/>").text("The test will start in ").append($("<span/>", { id: "remaintime", class: "timestamp" }));
        result.append(makeCallout(intervalInfo, "primary"));
        let intervaltimer = setInterval(() => {
            let now = this.testTimeInfo.truetime.UTCMSNow();
            let remaining = this.testTimeInfo.startTime - now;
            if (remaining < timestampMinutes(5)) {
                clearInterval(intervaltimer);
                this.openTestModel(modelService, testid, answermodel);
            } else {
                this.updateTimer(remaining);
            }
        }, 100);
    }
    /**
     * Update the remaining time for the test
     * @param remaining Time in ms remaining before test start
     */
    private updateTimer(remaining: number) {
        $("#remaintime").text(formatTime(remaining / timestampSeconds(1)));
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
     * @param interactive Test template
     * @param answermodel Interactive answer model
     */
    public deferredInteractiveTest(testmodel: RealTimeModel, answermodel: RealTimeModel) {
        $('.waittimer').empty().append(makeCallout(($("<h3/>").text("Connecting to test server..."), "primary")));

        let target = $('.testcontent');
        target.hide();

        let interactive = testmodel.root().value();

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

        this.waitToDisplayTest(interactive, answermodel);
    }
    /**
     * Final step before showing the test.
     * We have loaded the template but need to wait until closer to the actual start time
     * In this case we will go until there are 10 seconds left before processing the template
     * @param interactive Test template
     * @param answermodel Interactive answer model
     */
    private waitToDisplayTest(interactive: { [key: string]: any; }, answermodel: RealTimeModel) {
        let result = $('.waittimer');
        let intervalInfo = $("<h3/>")
            .text("Please Standby, The test will start in ")
            .append($("<span/>", { id: "remaintime", class: "timestamp" }));
        result.empty().append(makeCallout(intervalInfo, "primary"));

        if (this.testTimeInfo.truetime.UTCMSNow() < this.testTimeInfo.startTime) {
            // Start a timer to wait until get get to 10 seconds in.  During
            // that time, we need to update the timer display to let them know how long is left.
            let intervaltimer = setInterval(() => {
                let now = this.testTimeInfo.truetime.UTCMSNow();
                let remaining = this.testTimeInfo.startTime - now;
                if (remaining < timestampSeconds(10)) {
                    // Is it that time already? Stop timing and go to the next step
                    clearInterval(intervaltimer);
                    this.makeTestLive(interactive, answermodel);
                }
                else {
                    this.updateTimer(remaining);
                }
            }, 100);
        } else {
            this.makeTestLive(interactive, answermodel);
        }
    }
    /**
     * Everything is loaded, we need to process the template, but don't display anything until the last second
     * @param interactive Test template
     * @param answermodel Interactive answer model
     */
    private makeTestLive(interactive: { [key: string]: any; }, answermodel: RealTimeModel) {
        // Make sure to hide the generated DOM elements while we get them ready
        let target = $('.testcontent');
        target.hide();
        // Generate the questions
        if (interactive.timed !== undefined) {
            this.makeInteractive(target, interactive.timed, -1, answermodel.elementAt("answers", 0) as RealTimeObject);
        }
        for (let qnum = 0; qnum < interactive.count; qnum++) {
            this.makeInteractive(target, interactive.questions[qnum], qnum, answermodel.elementAt("answers", qnum + 1) as RealTimeObject);
        }
        // Everything is ready and connected, we just need to wait until it is closer to test time
        // Start a timer waiting for it to run
        if (this.testTimeInfo.truetime.UTCMSNow() < this.testTimeInfo.startTime) {
            let intervaltimer = setInterval(() => {
                let now = this.testTimeInfo.truetime.UTCMSNow();
                let remaining = this.testTimeInfo.startTime - now;
                if (remaining < timestampSeconds(1)) {
                    clearInterval(intervaltimer);
                    this.runTestLive(target, answermodel);
                }
                else {
                    this.updateTimer(remaining);
                }
            }, 100);
        } else {
            this.runTestLive(target, answermodel);
        }
    }
    /**
     * 
     * @param target 
     * @param answermodel Interactive answer model
     */
    private runTestLive(target: JQuery<HTMLElement>, answermodel: RealTimeModel) {
        $('.waittimer').empty();
        target.show();
        $(".instructions").removeClass("instructions").addClass("iinstructions");
        // Start a timer and run until we are out of time
        let intervaltimer = setInterval(() => {
            if (this.testTimeInfo.truetime.UTCMSNow() >= this.testTimeInfo.endTime) {
                clearInterval(intervaltimer);
                // Time to kill the test
                this.shutdownTest(answermodel)
            }
        }, 100);
    }
    /**
     * 
     * @param answermodel Interactive answer model
     */
    private shutdownTest(answermodel: RealTimeModel) {
        let target = $('.testcontent');
        target.hide();
        $(".iinstructions").hide();
        let intervalInfo = $("<h3/>").text("Time is up. The test is now over.")
        $('.waittimer').empty().append(makeCallout(intervalInfo, "primary"));
        answermodel.close();
        target.empty();
    }
}
