import { CipherTest, ITestState, IAnswerTemplate } from "./ciphertest";
import { toolMode, ITestTimeInfo, menuMode, IState } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { cloneObject, makeCallout, timestampToFriendly, timestampFromMinutes, formatTime, timestampFromSeconds, NumberMap, StringMap } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { TrueTime } from "../common/truetime";
import { ConvergenceDomain, RealTimeModel, RealTimeObject, ModelCollaborator, RealTimeString, StringSetValueEvent } from "@convergence/convergence";
import { CipherInteractiveFactory } from "./cipherfactory";
import { JTTable } from "../common/jttable";
import Split from 'split-grid';
import { JTFDialog } from "../common/jtfdialog";

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
        if (this.getConfigString("userid", "") === "") {
            this.setTestStatusMessage("You must be logged in to be able to take a test.");
        } else if (this.state.testID != undefined) {
            $('.testcontent').empty();
            $(".timer").hide();
            this.displayInteractiveTest(this.state.testID);
        } else {
            this.setTestStatusMessage("No test id was provided to run.");
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
     * Report that time has changed.
     * @param msg Msg about time adjustment event
     */
    public timeAnomaly(msg: string) {
        console.log("**Time anomaly reported:" + msg);
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
     * Confirm that we are the only copy for this user editing the test.
     * Note that we want to disconnect the other model, but we aren't sure how to do that yet
     * @param answermodel Interactive answer model
     * @param userid User taking the test
     * @param realtimeSessionid Realtime handler for shared session id
     */
    private confirmOnly(answermodel: RealTimeModel, userid: string, realtimeSessionid: RealTimeString) {
        // Figure out who is connected to the test
        let collaborators = answermodel.collaborators();
        let matches = 0;
        let actiontaken = false;
        // And see how many of them happen to be us
        // We should find exactly 1 unless they are taking the test twice.
        collaborators.forEach((collaborator: ModelCollaborator) => {
            if (collaborator.user.email === userid) {
                matches++;
            }
        });
        // We didn't find ourselves.  Not much we can do about it but complain
        if (matches === 0) {
            console.log("We can't find ourselves in the model");
        }
        // Track changes in the session id
        let oursessionid = answermodel.session().sessionId();
        realtimeSessionid.on(RealTimeString.Events.VALUE, (event: StringSetValueEvent) => {
            // If the shared sessionid changed and it isn't us, just get out.
            if (event.element.value() != oursessionid) {
                this.shutdownTest(answermodel, "Another session has taken over the test");
            }
        });
        // See if there was more than one of us.
        if (matches > 1) {
            // There was, so prompt them to figure out what to do.
            // Note that the dialog is modal and will cover the entire screen.  Since this
            // can take some time, we don't want them peeking at the test content.
            // But we do leave the test content there so that if they do say yes we can
            // get back to the test quickly.
            $("#okdisc")
                .off("click")
                .on("click", () => {
                    actiontaken = true;
                    $("#multilogindlg").foundation("close");
                    // Set the model session id to be our session id!
                    realtimeSessionid.value(oursessionid);
                });
            // Handle when they just click cancel so we go back to the 
            $(document).on('closed.zf.reveal', '#multilogindlg[data-reveal]', () => {
                if (!actiontaken) {
                    this.shutdownTest(answermodel, "Test is being taken in a different window.");
                }
            });
            // Change the cancel button to say "Disconnect other session and take test here"
            $("#multilogindlg a[data-close]").text("Exit");
            // Make the dialog hide everything instead of being transparant
            $("#multilogindlg").parent().addClass("hideback");
            $("#okdisc").removeAttr("disabled");
            $("#multilogindlg").attr("data-close-on-click", "false")
                .attr("data-close-on-esc", "false")
                .foundation("open");
        }
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
            result.append($(this.obverse(state.testHTML)));
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
     * Stage 1: Start the process for displaying an interactive test.  
     * Check the time and user information to make sure that we are in the window to run the test
     * @param testUID answer template id
     */
    public displayInteractiveTest(testUID: string) {
        this.connectRealtime()
            .then((domain: ConvergenceDomain) => {
                // 2. Initializes the application after connecting by opening a model.
                const modelService = domain.models();
                modelService.open(testUID)
                    .then((answermodel: RealTimeModel) => {
                        let answertemplate = answermodel.root().value() as IAnswerTemplate;
                        // Populate the time from the answer template
                        this.testTimeInfo.startTime = answertemplate.starttime;
                        this.testTimeInfo.endTimedQuestion = answertemplate.endtimed;
                        this.testTimeInfo.endTime = answertemplate.endtime;
                        // We need confirm that they are actually allowed to take this test.
                        // this.getConfigString("userid", "") must be non-blank and be present as one
                        // of the slots in answertemplate.assigned
                        let userfound = -1;
                        let loggedinuserid = this.getConfigString("userid", "");
                        if (loggedinuserid === "") {
                            this.shutdownTest(answermodel, "You must be logged in to be able to take a test.");
                        }
                        //
                        // Populate the default names on the test.  Note that we may get better information
                        // about the user when they are logged in, but for now we use what we are given in the template
                        //
                        for (let i = 0; i < 3; i++) {
                            let name = "";
                            let userid = "";
                            if (i < answertemplate.assigned.length) {
                                name = answertemplate.assigned[i].displayname;
                                userid = answertemplate.assigned[i].userid;
                            }
                            if (userid === loggedinuserid) {
                                userfound = i;
                            }
                            let idslot = String(Number(i) + 1);
                            if (name === "" && userid !== "") {
                                name = userid;
                            }
                            if (name === "" || name === undefined) {
                                $("#part" + idslot).hide();
                            } else {
                                let initials = this.computeInitials(name);
                                $("#user" + idslot).text(name);
                                $("#init" + idslot).text(initials);
                            }
                        }
                        // Make sure that they were found in the list of active users for this test
                        if (userfound < 0) {
                            this.shutdownTest(answermodel, "You are not assigned to take this test.");
                        }
                        let realtimeSessionid = answermodel.elementAt("assigned", userfound, "sessionid") as RealTimeString;
                        // Make sure that we are the only copy for this yser
                        this.confirmOnly(answermodel, loggedinuserid, realtimeSessionid);
                        let testid = answertemplate.testid;
                        // Figure out if it is time to run the test
                        let now = this.testTimeInfo.truetime.UTCNow();
                        // We have several situations
                        // 1) Way too early - now + 5 minutes < this.testTimeInfo.startTime
                        // 2) Early, but time to load - now < this.testTimeInfo.startTime
                        // 3) Test in progress - now >= this.testTimeInfo.startTime and now <= this.testTimeInfo.endTime (we set endtime to be forever in the future)
                        // 4) Test is over - now > this.testTimeInfo.endTime

                        // We will only let the "interactive-header" show, which contains the test taker
                        // names.
                        // Hide default header, the custom header is empty at this  point, so no
                        // need to hide it here.  All will be revealed in Stage 4 when we get the
                        // custom header info from the test model.
                        let target = $('.default-header');
                        target.hide();

                        if (now > this.testTimeInfo.endTime) {
                            this.shutdownTest(answermodel);
                            return;
                        } else if (now + timestampFromMinutes(15) < this.testTimeInfo.startTime) {
                            // They are way too early.  
                            this.setTestStatusMessage("The test is not ready to start.  It is scheduled ", this.testTimeInfo.startTime);
                            answermodel.close();
                        } else {
                            // If they close the window or navigate away, we want to close all our connections
                            $(window).on('beforeunload', () => this.shutdownTest(answermodel));
                            // Put up a countdown timer..
                            this.waitToLoadTestModel(modelService, testid, answermodel);
                        }
                    })
                    .catch((error) => { this.reportFailure("Convergence API could not open test model: " + error); });
            });
    }
    /**
     * Stage 2:  (Prior to 5 minutes before the test)
     * Launch but wait until time to prepare the test.  During this time, only a countdown timer is displayed and no data is pulled from
     * the model.  Even if they examine the web page, they won't see any content here.
     * @param modelService 
     * @param testid 
     * @param answermodel Interactive answer model
     * @param answertemplate 
     */
    private waitToLoadTestModel(modelService, testid: any, answermodel: RealTimeModel) {
        if (this.testTimeInfo.truetime.UTCNow() < (this.testTimeInfo.startTime - timestampFromMinutes(5))) {
            this.setTimerMessage("The test will start in ");
            let intervaltimer = setInterval(() => {
                let now = this.testTimeInfo.truetime.UTCNow();
                let remaining = this.testTimeInfo.startTime - now;
                if (remaining < timestampFromMinutes(5)) {
                    clearInterval(intervaltimer);
                    this.openTestModel(modelService, testid, answermodel);
                } else {
                    this.updateTimer(remaining);
                }
            }, 100);
        } else {
            this.openTestModel(modelService, testid, answermodel);
        }
    }
    /**
      * Stage 3: (5 minute mark)
      * Open the test model for the test template.
      * @param modelService 
      * @param testid 
      * @param answermodel Interactive answer model
      * @param elem 
      */
    private openTestModel(modelService, testid: any, answermodel: RealTimeModel) {
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
    public buildScoreTemplateAndHints(testmodel: RealTimeModel, answermodel: RealTimeModel) {
        this.setTimerMessage("Connecting to test server... ");

        let target = $('.testcontent');
        target.hide();

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
     * Stage 5: (5 minutes before until 10 seconds before)
     * Final step before showing the test.
     * We have loaded the template but need to wait until closer to the actual start time
     * In this case we will go until there are 10 seconds left before processing the template
     * @param interactive Test template
     * @param answermodel Interactive answer model
     */
    private waitToDisplayTest(interactive: { [key: string]: any; }, answermodel: RealTimeModel) {
        this.setTimerMessage("Please Standby, The test will start in ");
        this.trackUsers(answermodel);
        $(".timer").show();

        if (this.testTimeInfo.truetime.UTCNow() < (this.testTimeInfo.startTime - timestampFromSeconds(10))) {
            // Start a timer to wait until get get to 10 seconds in.  During
            // that time, we need to update the timer display to let them know how long is left.
            let intervaltimer = setInterval(() => {
                let now = this.testTimeInfo.truetime.UTCNow();
                let remaining = this.testTimeInfo.startTime - now;
                if (remaining < timestampFromSeconds(10)) {
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
     * Stage 6: (10 seconds until test time)
     * Everything is loaded, we need to process the template, but don't display anything until the last second
     * @param interactive Test template
     * @param answermodel Interactive answer model
     */
    private makeTestLive(interactive: { [key: string]: any; }, answermodel: RealTimeModel) {
        Split({
            minsize: 20,
            rowMinSize: 20,
            rowMinSizes: { 1: 20 },
            rowGutters: [{
                track: 1,
                element: document.querySelector('.gutter-row-1'),
            }]
        });

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
        // Give them an easy way to exit the test
        target.append($("<button/>", { type: "button", class: "button large rounded centered", id: "exittest" }).text("Exit Test"));
        $("#exittest").on('click', () => { this.shutdownTest(answermodel, "Exit test requested by user.") });

        this.setMenuMode(menuMode.test);
        $(".mainmenubar").hide();
        // Everything is ready and connected, we just need to wait until it is closer to test time
        // Start a timer waiting for it to run
        if (this.testTimeInfo.truetime.UTCNow() < this.testTimeInfo.startTime) {
            let intervaltimer = setInterval(() => {
                let now = this.testTimeInfo.truetime.UTCNow();
                let remaining = this.testTimeInfo.startTime - now;
                if (remaining < timestampFromSeconds(1)) {
                    clearInterval(intervaltimer);
                    this.runTestLive(answermodel);
                }
                else {
                    this.updateTimer(remaining);
                }
            }, 100);
        } else {
            this.runTestLive(answermodel);
        }
    }
    /**
     * Stage 7: (Test time)
     * Run the test until we hit the time limit
     * @param answermodel Interactive answer model
     */
    private runTestLive(answermodel: RealTimeModel) {
        $('.waittimer').empty();
        $('.testcontent').show();
        $(".instructions").removeClass("instructions").addClass("iinstructions");
        // Start a timer and run until we are out of time
        let intervaltimer = setInterval(() => {
            let now = this.testTimeInfo.truetime.UTCNow();
            if (now >= this.testTimeInfo.endTime) {
                clearInterval(intervaltimer);
                // Time to kill the test
                this.shutdownTest(answermodel)
            }
            $("#tremain").text(formatTime(this.testTimeInfo.endTime - now));
        }, 100);
    }
    /**
     * Stage 8: Cleanup.
     * @param answermodel Interactive answer model
     */
    private shutdownTest(answermodel: RealTimeModel, message?: string) {
        if (message === undefined) {
            message = "Time is up. The test is now over.  Scheduled end time ";
        }
        $('.testcontent').hide();
        $(".iinstructions").hide();
        let session = answermodel.session().domain();
        this.testTimeInfo.truetime.stopTiming();
        answermodel.close().then(() => session.dispose());
        this.setTestStatusMessage(message, this.testTimeInfo.endTime);
        $("#topsplit").hide();
        $(".gutter-row-1").hide();
        $(".timer").hide();
        $('.testcontent').show();
        $(".mainmenubar").show();
    }
}
