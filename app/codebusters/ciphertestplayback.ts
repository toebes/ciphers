import { CipherTest, ITestState, IAnswerTemplate } from "./ciphertest";
import { toolMode, ITestTimeInfo, menuMode, IState } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { cloneObject, makeCallout, timestampToFriendly, timestampFromMinutes, formatTime, timestampFromSeconds, NumberMap, StringMap } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { TrueTime } from "../common/truetime";
import { ConvergenceDomain, RealTimeModel, ModelCollaborator, StringSetValueEvent, HistoricalModel, HistoricalObject, RealTimeObject } from "@convergence/convergence";
import { CipherInteractiveFactory } from "./cipherfactory";
import { JTTable } from "../common/jttable";
import Split from 'split-grid';
import { JTFDialog } from "../common/jtfdialog";
import { ObservableObject } from "@convergence/convergence/typings/model/observable/ObservableObject";

class TrueTimePlayback extends TrueTime {
    public UTCNow(): number {
        return 0
    }
    public startTiming() { }
    public syncTime() { }
}
/**
 * CipherTestPlayback
 *  Creates the interactive version of a test.
 */
export class CipherTestPlayback extends CipherTest {
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
        truetime: new TrueTimePlayback(),
        startTime: 0,
        endTime: 0,
        endTimedQuestion: 0
    };

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput: boolean = false): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        if (!suppressOutput) {
            this.updateOutput();
        }
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
            $(".timer").hide();
            this.displayInteractiveTest(this.state.testID);
        } else {
            this.setTestStatusMessage("No test id was provided to playback.");
        }
    }
    /**
     * Sets up the timer so that it displays the countdown
     * @param msg Message string for the timer
     */
    public setTimerMessage(msg: string) {
        let target = $('.waittimer');
        let intervalInfo = $("<h3/>").text(msg).append($("<span/>", { id: "remaintime", class: "timestamp" }));

        target.empty().append(makeCallout(intervalInfo, "primary"));
    }
    /**
     * Update the remaining time for the test
     * @param remaining Time in ms remaining before test start
     */
    private updateTimer(remaining: number) {
        $("#remaintime").text(formatTime(remaining));
    }
    /**
     * Update the main status message about the state of the test.
     * This is used in lieu of the actual test to let them know that the test is over
     * or is not available to start yet.
     * @param msg Message about the test
     * @param timestamp optional time to be included with the message
     */
    public setTestStatusMessage(msg: string, timestamp?: number) {
        let target = $('.testcontent');

        let content = msg;
        if (timestamp !== undefined) {
            content += timestampToFriendly(timestamp);
        }
        target.empty().append(makeCallout($("<h3/>").text(content)));
    }
    /**
     * Generates a 2 letter initials for a name
     * @param name Name to compute initials for
     */
    public computeInitials(name: string): string {
        let result = "";
        if (name !== "" && name !== undefined) {
            // Figure out the initials 
            let parts = name.split(" ");
            result = parts[0].substr(0, 1).toUpperCase();
            if (parts.length > 1) {
                result += parts[parts.length - 1].substr(0, 1).toUpperCase();
            }
        }
        return result;
    }
    /**
     * Update the test display of who is connected to the current test
     * @param answermodel Interactive answer model
     * @param collaborators Array of collaborators currently on the test
     */
    private updateUserStatus(answermodel: RealTimeModel, collaborators: ModelCollaborator[]) {
        let answertemplate = answermodel.root().value() as IAnswerTemplate;
        for (let i = 1; i <= 3; i++) {
            $("#part" + String(i)).removeClass("connected");
        }
        // First find all the users that are taking the test
        let useridid: StringMap = {};
        for (let i in answertemplate.assigned) {
            let userid = answertemplate.assigned[i].userid;
            if (userid !== "") {
                useridid[userid] = String(Number(i) + 1);
            }
        }
        collaborators.forEach((collaborator: ModelCollaborator) => {
            let email = collaborator.user.email;
            if (email === "") {
                email = collaborator.user.username;
            }
            if (useridid.hasOwnProperty(email)) {
                let idslot = useridid[email];
                let displayname = collaborator.user.displayName;
                if (displayname === undefined || displayname === "") {
                    displayname = email;
                }
                let initials = this.computeInitials(displayname);
                $("#user" + idslot).text(displayname);
                $("#init" + idslot).text(initials);
                $("#part" + idslot).addClass("connected");
            }
        });
    }
    /**
     * Track changes to who is working on the test
     * @param answermodel Interactive answer model
     */
    private trackUsers(answermodel: RealTimeModel) {
        answermodel.collaboratorsAsObservable().subscribe((collaborators: ModelCollaborator[]) => {
            this.updateUserStatus(answermodel, collaborators);
        });
    }
    /**
     * Create the hidden dialog for selecting a cipher to open
     * @returns DOM element for the dialog
     */
    private createmultiLoginDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout alert",
        }).text("Your userid is already being used to take this test currently." +
            "  This may be because a web page is already open to the test or " +
            "someone may have logged into your account without you knowing.  " +
            "You can take the test in this window or exit and let that session continue running."
        );
        let MultiLoginDlg = JTFDialog(
            "multilogindlg",
            "User already taking test",
            dlgContents,
            "okdisc",
            "Disconnect other session and take test here!"
        );
        return MultiLoginDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates any needed hidden dialogs
     */
    public createMainMenu(): JQuery<HTMLElement> {
        let result = super.createMainMenu();
        // Create the dialog for prompting about multiple test takers
        result.append(this.createmultiLoginDlg());
        return result;
    }
    /**
     * makeInteractive creates an interactive question by invoking the appropriate factory for the saved state
     * @param elem HTML DOM element to append UI elements for the question
     * @param state Saved state for the Interactive question to display
     * @param qnum Question number, -1 indicated a timed question
     * @param testtype The type of test that it is being generated for
     * @param observableObject Realtime object to establish collaboration for
     */
    public makeInteractive(elem: JQuery<HTMLElement>, state: IState, qnum: number, observableObject: HistoricalObject) {
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
            result.append($(this.obverse(state.testHTML)));
            // Put that into the DOM so that the browser makes it active
            elem.append(result);
            // Now that it is active, we can attach all the handlers to it to process the data and keep
            // it in sync with the realtime components
            ihandler.attachInteractiveHandlers(qnum, observableObject as ObservableObject as RealTimeObject, this.testTimeInfo);
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
     * Stage 1: Start the process for displaying an interactive test.  
     * Check the time and user information to make sure that we are in the window to run the test
     * @param testUID answer template id
     */
    public displayInteractiveTest(testUID: string) {
        this.connectRealtime()
            .then((domain: ConvergenceDomain) => {
                // 2. Initializes the application after connecting by opening a model.
                const modelService = domain.models();
                modelService.history(testUID)
                    .then((answermodel: HistoricalModel) => {
                        let answertemplate = answermodel.root().value() as IAnswerTemplate;
                        // Populate the time from the answer template
                        this.testTimeInfo.startTime = answertemplate.starttime;
                        this.testTimeInfo.endTimedQuestion = answertemplate.endtimed;
                        this.testTimeInfo.endTime = answertemplate.endtime;
                        let testid = answertemplate.testid;

                        let startTime = answermodel.minTime().getTime();
                        let endTime = answermodel.maxTime().getTime();

                        let elem = new Foundation.Slider($("#scrubslider"), {
                            start: startTime,
                            end: endTime
                        });
                        let target = $('.default-header');
                        target.hide();

                        // If they close the window or navigate away, we want to close all our connections
                        $(window).on('beforeunload', () => this.shutdownTest(answermodel));
                        // Put up a countdown timer..
                        this.openTestModel(modelService, testid, answermodel);
                    })
            })
            .catch((error) => { this.reportFailure("Convergence API could not open test model: " + error); });
    }
    /**
      * Stage 3: (5 minute mark)
      * Open the test model for the test template.
      * @param modelService 
      * @param testid 
      * @param answermodel Interactive answer model
      * @param elem 
      */
    private openTestModel(modelService, testid: any, answermodel: HistoricalModel) {
        modelService.open(testid)
            .then((testmodel: RealTimeModel) => {
                console.log("Fully opened: testmodel");
                this.buildScoreTemplateAndHints(testmodel, answermodel);
            })
            .catch((error) => { this.reportFailure("Convergence API could not open data model: " + error); });
    }
    /**
     * Stage 4: (5 minute mark)
     * Construct the score template and populate the hints that they will need
     * @param interactive Test template
     * @param answermodel Interactive answer model
     */
    public buildScoreTemplateAndHints(testmodel: RealTimeModel, answermodel: HistoricalModel) {
        let interactive = testmodel.root().value();
        testmodel.close();

        // Update the title for the test
        $(".testtitle").text(interactive.title);

        // Show custom header or default header.
        if (interactive.useCustomHeader) {
            $('.custom-header').append(interactive.customHeader).show()
        }
        else {
            $('.default-header').show()
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

        // Make sure to hide the generated DOM elements while we get them ready
        let target = $('.testcontent');
        // Generate the questions
        if (interactive.timed !== undefined) {
            this.makeInteractive(target, interactive.timed, -1, answermodel.elementAt("answers", 0) as HistoricalObject);
        }
        for (let qnum = 0; qnum < interactive.count; qnum++) {
            this.makeInteractive(target, interactive.questions[qnum], qnum, answermodel.elementAt("answers", qnum + 1) as HistoricalObject);
        }
        this.setMenuMode(menuMode.test);
    }
    /**
     * Stage 8: Cleanup.
     * @param answermodel Interactive answer model
     */
    private shutdownTest(answermodel: HistoricalModel, message?: string) {
        let session = answermodel.session().domain();
        this.testTimeInfo.truetime.stopTiming();
        session.dispose();
        this.setTestStatusMessage(message, this.testTimeInfo.endTime);
        $("#topsplit").hide();
        $(".gutter-row-1").hide();
        $(".timer").hide();
        $('.testcontent').show();
        $(".mainmenubar").show();
    }
}
