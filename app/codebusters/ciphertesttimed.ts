import { CipherTest, ITestState, IAnswerTemplate, IAnswerAudit } from './ciphertest';
import { toolMode, ITestTimeInfo, menuMode, IState, IInteractiveTest, CipherHandler } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import {
    cloneObject,
    makeCallout,
    timestampToFriendly,
    timestampFromMinutes,
    formatTime,
    timestampFromSeconds,
    StringMap,
    repeatStr,
    setCharAt,
    NumberMap, timestampToISOLocalString,
} from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { TrueTime } from '../common/truetime';
import {
    ConvergenceDomain,
    RealTimeModel,
    RealTimeObject,
    ModelCollaborator,
    RealTimeString,
    StringSetValueEvent,
    RealTimeNumber,
    NumberSetValueEvent,
    ModelService,
    ModelPermissions, RealTimeElement, DomainUserIdMap,
} from '@convergence/convergence';
import { CipherInteractiveFactory } from './cipherfactory';
import { JTTable } from '../common/jttable';
import Split from 'split-grid';
import { JTFDialog } from '../common/jtfdialog';

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
    public lastActiveTime = 0;
    public totalIdleTime = 0;
    public realtimeIdleTracker: RealTimeNumber;
    public obtID: string = "#idle999";
    public save_testid: string = "not-set"
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [];
    public pageNumber = 0;
    public testTimeInfo: ITestTimeInfo = {
        truetime: new TrueTime((msg) => { this.timeAnomaly(msg); }),
        startTime: 0,
        endTime: 0,
        endTimedQuestion: 0,
        currentQuestion: "0",
    };
    public realtimeSessionNotes: RealTimeElement;
    public preInitializationTimeAnomaly: string = '';
    public LoadedHandlers: CipherHandler[] = [];
    public checkPaper = false;
    /* This is which entry in the assigned section of the answer template corresponds to the active user taking the test */
    /* A value of -1 indicates that a coach is taking the test (and as such won't be tracked) */
    public activeUserSlot = -1;
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
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
        // Make sure that they are logged in to be able to take a test
        if (this.confirmedLoggedIn(' in order to take a test.', $('.testcontent'))) {

            // Do we have a test id to display an interactive test for?
            if (this.state.testID != undefined) {
                $('.testcontent').empty();
                $('.timer').hide();
                this.displayInteractiveTest(this.state.testID);
            } else {
                this.setTestStatusMessage('No test id was provided to run.');
            }
        }
    }
    /**
     * Sets up the timer so that it displays the countdown
     * @param msg Message string for the timer
     */
    public setTimerMessage(msg: string): void {
        const target = $('.waittimer');
        const intervalInfo = $('<h3/>')
            .text(msg)
            .append($('<span/>', { id: 'remaintime', class: 'timestamp' }));

        target.empty().append(makeCallout(intervalInfo, 'primary'));
    }
    /**
     * Update the remaining time for the test
     * @param remaining Time in ms remaining before test start
     */
    private updateTimer(remaining: number): void {
        $('#remaintime').text(formatTime(remaining));
    }
    /**
     * Update the main status message about the state of the test.
     * This is used in lieu of the actual test to let them know that the test is over
     * or is not available to start yet.
     * @param msg Message about the test
     * @param timestamp optional time to be included with the message
     */
    public setTestStatusMessage(msg: string, timestamp?: number): void {
        const target = $('.testcontent');

        let content = msg;
        if (timestamp !== undefined) {
            content += timestampToFriendly(timestamp);
        }
        target.empty().append(makeCallout($('<h3/>').text(content)));
    }
    /**
     * Report that time has changed.
     * @param msg Msg about time adjustment event
     */
    public timeAnomaly(msg: string): void {
        console.log('**Time anomaly reported:' + msg);
        let localTime = timestampToISOLocalString(Date.now(), true);
        try {
            this.realtimeSessionNotes.value(this.preInitializationTimeAnomaly + this.realtimeSessionNotes.value() + localTime + ' : ' + msg + '|');
            this.preInitializationTimeAnomaly = '';
        } catch (e) {
            // Initially, realtime might not be ready.
            this.preInitializationTimeAnomaly += ('Realtime not ready? ' +
                e.toString() + localTime + ' : **MSG: ' + msg + '** |');
            // no fail.
        }
    }
    /**
     * Update the test display of who is connected to the current test
     * @param answermodel Interactive answer model
     * @param collaborators Array of collaborators currently on the test
     */
    private updateUserStatus(answermodel: RealTimeModel, collaborators: ModelCollaborator[]): void {
        const answertemplate = answermodel.root().value() as IAnswerTemplate;
        for (let i = 1; i <= 3; i++) {
            $('#part' + String(i)).removeClass('connected');
        }
        // First find all the users that are taking the test
        const useridslot: NumberMap = {};
        for (const i in answertemplate.assigned) {
            const userid = answertemplate.assigned[i].userid;
            if (userid !== '') {
                useridslot[userid] = Number(i);
            }
        }
        collaborators.forEach((collaborator: ModelCollaborator) => {
            let email = collaborator.user.email;
            if (email === '') {
                email = collaborator.user.username;
            }
            if (useridslot.hasOwnProperty(email)) {
                const idslot = useridslot[email];
                const uislot = String(idslot + 1);
                let displayname = collaborator.user.displayName;
                if (displayname === undefined || displayname === null || displayname === '') {
                    displayname = answertemplate.assigned[idslot].displayname;
                    if (displayname === undefined || displayname === null || displayname === '') {
                        displayname = email;
                    }
                    displayname = displayname.trim();
                }
                const initials = this.computeInitials(displayname);
                $('#user' + uislot).text(displayname);
                $('#init' + uislot).text(initials);
                $('#part' + uislot).addClass('connected');
            }
        });
    }
    /**
     * Track changes to who is working on the test
     * @param answermodel Interactive answer model
     */
    private trackUsers(answermodel: RealTimeModel): void {
        answermodel.collaboratorsAsObservable().subscribe((collaborators: ModelCollaborator[]) => {
            this.updateUserStatus(answermodel, collaborators);
        });
    }
    /**
     * Confirm that we are the only copy for this user editing the test.
     * Note that we want to disconnect the other model, but we aren't sure how to do that yet.
     * Fortunately the other session should be running this same code and will disconnect itself.
     * @param answermodel Interactive answer model
     * @param userid User taking the test
     * @param realtimeSessionid Realtime handler for shared session id
     */
    private confirmOnly(answermodel: RealTimeModel, userid: string, realtimeSessionid: RealTimeString): void {
        // Figure out who is connected to the test
        const collaborators = answermodel.collaborators();
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
        const oursessionid = answermodel.session().sessionId();
        realtimeSessionid.on(RealTimeString.Events.VALUE, (event: StringSetValueEvent) => {
            // If the shared sessionid changed and it isn't us, just get out.
            if (event.element.value() != oursessionid) {
                this.shutdownTest(answermodel, 'Another session has taken over the test');
            }
        });
        // See if there was more than one of us.
        if (matches > 1) {
            // There was, so prompt them to figure out what to do.
            // Note that the dialog is modal and will cover the entire screen.  Since this
            // can take some time, we don't want them peeking at the test content.
            // But we do leave the test content there so that if they do say yes we can
            // get back to the test quickly.
            $('#okdisc')
                .off('click')
                .on('click', () => {
                    actiontaken = true;
                    $('#multilogindlg').foundation('close');
                    // Set the model session id to be our session id!
                    realtimeSessionid.value(oursessionid);
                });
            // Handle when they just click cancel so we go back to the
            $(document).on('closed.zf.reveal', '#multilogindlg[data-reveal]', () => {
                if (!actiontaken) {
                    this.shutdownTest(answermodel, 'Test is being taken in a different window.');
                }
            });
            // Change the cancel button to say "Disconnect other session and take test here"
            $('#multilogindlg a[data-close]').text('Exit');
            // Make the dialog hide everything instead of being transparant
            $('#multilogindlg')
                .parent()
                .addClass('hideback');
            $('#okdisc').removeAttr('disabled');
            $('#multilogindlg')
                .attr('data-close-on-click', 'false')
                .attr('data-close-on-esc', 'false')
                .foundation('open');
        }
    }
    /**
     * Ensure that the user is actually a coach.  To do this, we need to check the permissions
     * on the model and make sure that they have Modify permissions
     * @param answermodel Model of the interactive test
     */
    private ensureCoach(answermodel: RealTimeModel): void {
        $('.timer').prepend($('<div/>', { class: 'coach' }).text('Coach'));
        const permissionsManager = answermodel.permissionsManager();
        permissionsManager
            .getAllUserPermissions()
            .then((modelPermissionsSet: DomainUserIdMap<ModelPermissions>) => {
                const modelPermissions = modelPermissionsSet.get(
                    answermodel.session().user().username
                );
                console.log(modelPermissions);
                if (!modelPermissions.manage) {
                    this.shutdownTest(answermodel, 'You are not assigned to take this test.');
                }
            })
            .catch(() => {
                this.shutdownTest(answermodel, 'You are not assigned to take this test.');
            });
    }
    /**
     * Create the hidden dialog for prompting the user to disconnect if they are already in the test
     * @returns DOM element for the dialog
     */
    private createmultiLoginDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            class: 'callout alert',
        }).text(
            'Your userid is already being used to take this test currently.' +
            '  This may be because a web page is already open to the test or ' +
            'someone may have logged into your account without you knowing.  ' +
            'You can take the test in this window or exit and let that session continue running.'
        );
        const MultiLoginDlg = JTFDialog(
            'multilogindlg',
            'User already taking test',
            dlgContents,
            'okdisc',
            'Disconnect other session and take test here!'
        );
        return MultiLoginDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates any needed hidden dialogs
     */
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        // Create the dialog for prompting about multiple test takers
        result.append(this.createmultiLoginDlg());
        return result;
    }
    /**
     * makeInteractive creates an interactive question by invoking the appropriate factory for the saved state
     * @param answermodel Model of the interactive test
     * @param elem HTML DOM element to append UI elements for the question
     * @param state Saved state for the Interactive question to display
     * @param qnum Question number, -1 indicated a timed question
     */
    public makeInteractive(answermodel: RealTimeModel, elem: JQuery<HTMLElement>, state: IState, qnum: number): void {
        // Sometimes the handlers die because of insufficient data passed to them (or because they are accessing something that they shouldn't)
        // We protect from this to also prevent it from popping back to the higher level try/catch which is dealing with any communication
        // errors to the server
        try {
            const realTimeObject = answermodel.elementAt('answers', qnum + 1) as RealTimeObject

            // Find the right class to render the cipher
            const ihandler = CipherInteractiveFactory(state.cipherType, state.curlang);
            // Save it so we can interregate it later
            this.LoadedHandlers.push(ihandler);
            // and restore the state
            ihandler.restore(state);

            // Figure out how to display the question text along with the score.  Timed questions will also have a button
            // generated for them as part of the question, but we need to give text telling the test taker to press
            // the button
            let extratext = '';
            const result = $('<div/>', {
                class: 'question ',
            });
            const qtext = $('<div/>', { class: 'qtext' });
            if (state.specialbonus) {
                qtext.append(
                    $('<span/>', { class: 'spbonus' }).append("&#9733;(Special Bonus Question)")
                )
            }
            // Is this the timed question?
            if (qnum === -1) {
                // Yes, the question number displays as Timed Question
                qtext.append(
                    $('<span/>', {
                        class: 'timed',
                    }).text('Timed Question')
                );
                extratext =
                    ' When you have solved it, click the <b>Checked Timed Question</b> button so that the time can be recorded and the solution checked.';
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
            this.activeUserSlot
            const realtimeConfidence = answermodel.elementAt(
                'assigned',
                this.activeUserSlot,
                'confidence',
                qnum + 1
            ) as RealTimeNumber;

            ihandler.attachInteractiveHandlers(qnum, realTimeObject, this.testTimeInfo, realtimeConfidence);
        } catch (e) {
            // Hmm a bug in the lower code.. Just show it and don't generate this question but at least
            // we can continue and generate the other questions.
            const msg = 'Something went wrong generating the Question.' + ' Error =' + e;
            elem.append($('<h1>').text(msg));
        }
    }
    /**
     * Stage 1: Start the process for displaying an interactive test.
     * Check the time and user information to make sure that we are in the window to run the test
     * @param testUID answer template id
     */
    public displayInteractiveTest(testUID: string): void {
        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            // 2. Initializes the application after connecting by opening a model.
            const modelService = domain.models();
            modelService
                .open(testUID)
                .then((realtimeAnswermodel: RealTimeModel) => {
                    const staticAnswerModel = realtimeAnswermodel.root().value() as IAnswerTemplate;
                    // Populate the time from the answer template
                    this.getTestTimes(realtimeAnswermodel);
                    // We need to watch the answer template to see if it changes
                    // We need confirm that they are actually allowed to take this test.
                    // this.getConfigString("userid", "") must be non-blank and be present as one
                    // of the slots in answertemplate.assigned
                    this.activeUserSlot = -1;
                    const loggedinuserid = this.getConfigString('userid', '');
                    if (loggedinuserid === '') {
                        this.shutdownTest(
                            realtimeAnswermodel,
                            'You must be logged in to be able to take a test.'
                        );
                    }
                    //
                    // Populate the default names on the test.  Note that we may get better information
                    // about the user when they are logged in, but for now we use what we are given in the template
                    //
                    for (let i = 0; i < 3; i++) {
                        let name = '';
                        let userid = '';
                        let notes = '';
                        if (i < staticAnswerModel.assigned.length) {
                            name = staticAnswerModel.assigned[i].displayname;
                            userid = staticAnswerModel.assigned[i].userid;
                            notes = staticAnswerModel.assigned[i].notes;
                        }
                        if (userid === loggedinuserid) {
                            this.activeUserSlot = i;
                            name = this.getUsersFullName();
                            realtimeAnswermodel.elementAt('assigned', this.activeUserSlot, 'displayname').value(name);
                            realtimeAnswermodel.elementAt('assigned', this.activeUserSlot, 'notes').value(notes);
                        }
                        const idslot = String(Number(i) + 1);
                        if (name === '' && userid !== '') {
                            name = userid;
                        }
                        if (name === '' || name === undefined) {
                            $('#part' + idslot).hide();
                        } else {
                            const initials = this.computeInitials(name);
                            $('#user' + idslot).text(name);
                            $('#init' + idslot).text(initials);
                            // We have an active user so we also want to watch the values on it
                            const idleTracker = realtimeAnswermodel.elementAt('assigned', i, 'idletime') as RealTimeNumber
                            // If the tracker time changes then we want to update the out of browser time on the screen
                            idleTracker.on(RealTimeNumber.Events.VALUE, (event: NumberSetValueEvent) => {
                                $("#idle" + idslot).text(this.computeOBT(event.element.value()));
                            });
                            // Pre-populate the OBT slot for this user (which might be empty)
                            $("#idle" + idslot).text(this.computeOBT(idleTracker.value()));
                            // Of course if we know who the active user is (i.e. not a coach) remember the
                            // id so that we can update it as well as how much idle time they had previously
                            if (this.activeUserSlot === i) {
                                this.obtID = "#idle" + idslot
                                this.realtimeIdleTracker = idleTracker
                                this.totalIdleTime = idleTracker.value();
                            }
                        }
                    }
                    // Make sure that they were found in the list of active users for this test
                    if (this.activeUserSlot < 0) {
                        // Ok they aren't a user, but we can assume that they are a coach since we had permission to open the model.
                        // We will proceed as if they are a coach, but if the promise tells us otherwise, we can shut down the test
                        // to the test because it was successfully opened
                        this.ensureCoach(realtimeAnswermodel);
                    } else {
                        const realtimeSessionid = realtimeAnswermodel.elementAt(
                            'assigned',
                            this.activeUserSlot,
                            'sessionid'
                        ) as RealTimeString;
                        // Make sure that we are the only copy for this yser
                        this.confirmOnly(realtimeAnswermodel, loggedinuserid, realtimeSessionid);

                        this.realtimeSessionNotes = realtimeAnswermodel.elementAt(
                            'assigned',
                            this.activeUserSlot,
                            'notes'
                        );
                    }
                    $("#school").text(staticAnswerModel.teamname);

                    let prefix = staticAnswerModel.teamtype.substr(0, 1).toUpperCase();
                    if (prefix === 'J') {
                        $("#cvarsity").html("&#9723;");
                        let jvnum = staticAnswerModel.teamtype.substr(2, 1);
                        let field = "#cjv1";
                        if (jvnum === '2') {
                            field = "#cjv2";
                        } else if (jvnum === '3') {
                            field = "#cjv3";
                        }
                        $(field).html("&#x2611;");
                    }

                    const testid = staticAnswerModel.testid;
                    this.save_testid = testid
                    // Figure out if it is time to run the test
                    const now = this.testTimeInfo.truetime.UTCNow();
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
                    const target = $('.default-header');
                    target.hide();

                    if (now > this.testTimeInfo.endTime) {
                        this.shutdownTest(realtimeAnswermodel);
                        return;
                    } else if (now + timestampFromMinutes(15) < this.testTimeInfo.startTime) {
                        // They are way too early.
                        this.setTestStatusMessage(
                            'The test is not ready to start.  It is scheduled ',
                            this.testTimeInfo.startTime
                        );
                        realtimeAnswermodel.close();
                    } else {
                        // If they close the window or navigate away, we want to close all our connections
                        $(window).on('beforeunload', () => this.shutdownTest(realtimeAnswermodel));
                        // Put up a countdown timer..
                        this.waitToLoadTestModel(modelService, testid, realtimeAnswermodel);
                    }
                })
                .catch((error) => {
                    this.reportFailure('Convergence API could not open test model: ' + error);
                });
        });
    }
    /**
     * Get the initial timed values for the test and then update the tracking values.
     * @param answerModel realtime model for the test answers
     */
    private getTestTimes(answermodel: RealTimeModel): void {
        // Get the realtime objects to track changes
        const starttimeObject = answermodel.elementAt('starttime') as RealTimeNumber;
        const endtimeObject = answermodel.elementAt('endtime') as RealTimeNumber;
        const endtimedQuestionObject = answermodel.elementAt('endtimed') as RealTimeNumber;
        // Populate our initial values
        this.testTimeInfo.startTime = starttimeObject.value();
        this.testTimeInfo.endTimedQuestion = endtimedQuestionObject.value();
        this.testTimeInfo.endTime = endtimeObject.value();
        // And register interest in changes to the values to update the test
        starttimeObject.on(RealTimeNumber.Events.VALUE, (event: NumberSetValueEvent) => {
            this.testTimeInfo.startTime = event.element.value();
        });
        endtimedQuestionObject.on(RealTimeNumber.Events.VALUE, (event: NumberSetValueEvent) => {
            this.testTimeInfo.endTimedQuestion = event.element.value();
        });
        endtimeObject.on(RealTimeNumber.Events.VALUE, (event: NumberSetValueEvent) => {
            this.testTimeInfo.endTime = event.element.value();
        });
    }

    /**
     * Stage 2:  (Prior to 5 minutes before the test)
     * Launch but wait until time to prepare the test.  During this time, only a countdown timer is displayed and no data is pulled from
     * the model.  Even if they examine the web page, they won't see any content here.
     * @param modelService Domain Model service object for making requests
     * @param testid ID of the test model
     * @param answermodel Interactive answer model
     */
    private waitToLoadTestModel(modelService: ModelService, testid: string, answermodel: RealTimeModel): void {
        if (
            this.testTimeInfo.truetime.UTCNow() <
            this.testTimeInfo.startTime - timestampFromMinutes(5)
        ) {
            this.setTimerMessage('The test will start in ');
            const intervaltimer = window.setInterval(() => {
                const now = this.testTimeInfo.truetime.UTCNow();
                const remaining = this.testTimeInfo.startTime - now;
                if (remaining < timestampFromMinutes(5)) {
                    clearInterval(intervaltimer);
                    this.openTestModel(testid, answermodel);
                } else {
                    this.updateTimer(remaining);
                }
            }, 100);
        } else {
            this.openTestModel(testid, answermodel);
        }
    }
    /**
     * Stage 3: (5 minute mark)
     * Open the test model for the test template.
     * @param testid ID of the test model
     * @param answermodel Interactive answer model
     */
    private openTestModel(testid: string, answermodel: RealTimeModel): void {
        this.getRealtimeTestModel(testid)
            .then((testmodel) => {
                console.log('Fully opened: testmodel');
                this.buildScoreTemplateAndHints(testmodel, answermodel);
            })
            .catch((error) => {
                this.reportFailure('Unable to open test model: ' + error);
            });
    }
    /**
     * Stage 4: (5 minute mark)
     * Construct the score template and populate the hints that they will need
     * @param testmodel Test template
     * @param answermodel Interactive answer model
     */
    public buildScoreTemplateAndHints(testmodel: IInteractiveTest, answermodel: RealTimeModel): void {
        this.setTimerMessage('Connecting to test server... ');

        this.checkPaper = !!testmodel.checkPaper;
        const target = $('.testcontent');
        target.hide();

        // Update the title for the test
        $('.testtitle').text(testmodel.title);

        // Show custom header or default header.
        if (testmodel.useCustomHeader) {
            $('.custom-header')
                .append(testmodel.customHeader)
                .show();
        } else {
            $('.default-header').show();
        }
        /**
         * Output any running keys used
         */
        if (testmodel.runningKeys !== undefined) {
            $('#runningkeys').append($('<h2/>').text('Famous Phrases'));
            for (const ent of testmodel.runningKeys) {
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
        if (testmodel.hasSpanish) {
            $('.xenocryptfreq').show();
        } else {
            $('.xenocryptfreq').hide();
        }
        /**
         * See if we need to show/hide the Morse Code Table
         */
        if (testmodel.hasMorse) {
            $('.morsetable').show();
        } else {
            $('.morsetable').hide();
        }
        /**
         * See if we need to show/hide the Porta Table
         */
        if (testmodel.hasPorta) {
            $('.portatable').show();
        } else {
            $('.portatable').hide();
        }
        /**
         * Lastly we need to print out the score table
         */
        const table = new JTTable({
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
        for (const qitem of testmodel.qdata) {
            let qtitle = '';
            if (qitem.qnum === -1) {
                qtitle = 'Timed';
                hastimed = true;
            } else {
                qtitle = String(qitem.qnum);
            }
            const trow = table
                .addBodyRow()
                .add({
                    settings: { class: 't' },
                    content: qtitle,
                })
                .add({
                    settings: { class: 'v' },
                    content: String(qitem.points),
                });
            trow.add('')
                .add('')
                .add('');
        }
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

        this.waitToDisplayTest(testmodel, answermodel);
    }
    /**
     * Stage 5: (5 minutes before until 10 seconds before)
     * Final step before showing the test.
     * We have loaded the template but need to wait until closer to the actual start time
     * In this case we will go until there are 10 seconds left before processing the template
     * @param testmodel Test template
     * @param answermodel Interactive answer model
     */
    private waitToDisplayTest(testmodel: IInteractiveTest, answermodel: RealTimeModel): void {
        this.setTimerMessage('Please Standby, The test will start in ');
        this.trackUsers(answermodel);
        $('.timer').show();

        if (
            this.testTimeInfo.truetime.UTCNow() <
            this.testTimeInfo.startTime - timestampFromSeconds(10)
        ) {
            // Start a timer to wait until get get to 10 seconds in.  During
            // that time, we need to update the timer display to let them know how long is left.
            const intervaltimer = window.setInterval(() => {
                const now = this.testTimeInfo.truetime.UTCNow();
                const remaining = this.testTimeInfo.startTime - now;
                if (remaining < timestampFromSeconds(10)) {
                    // Is it that time already? Stop timing and go to the next step
                    clearInterval(intervaltimer);
                    this.makeTestLive(testmodel, answermodel);
                } else {
                    this.updateTimer(remaining);
                }
            }, 100);
        } else {
            this.makeTestLive(testmodel, answermodel);
        }
    }
    /**
     * Stage 6: (10 seconds until test time)
     * Everything is loaded, we need to process the template, but don't display anything until the last second
     * @param testmodel Test template
     * @param answermodel Interactive answer model
     */
    private makeTestLive(testmodel: IInteractiveTest, answermodel: RealTimeModel): void {
        Split({
            minSize: 20,
            rowMinSize: 20,
            rowMinSizes: { 1: 20 },
            rowGutters: [
                {
                    track: 1,
                    element: document.querySelector('.gutter-row-1'),
                },
            ],
        });

        // Make sure to hide the generated DOM elements while we get them ready
        const target = $('.testcontent');
        target.hide();
        // Generate the questions
        if (testmodel.timed !== undefined) {
            this.makeInteractive(answermodel, target, testmodel.timed, -1);
        }
        for (let qnum = 0; qnum < testmodel.count; qnum++) {
            this.makeInteractive(answermodel, target, testmodel.questions[qnum], qnum);
        }
        // Give them an easy way to exit the test
        target.append(
            $('<button/>', {
                type: 'button',
                class: 'button large rounded centered',
                id: 'exittest',
            }).text('Exit Test')
        );
        $('#exittest').on('click', () => {
            this.shutdownTest(answermodel, 'Exit test requested by user.');
        });

        this.setMenuMode(menuMode.test);
        $('.mainmenubar').hide();
        // Everything is ready and connected, we just need to wait until it is closer to test time
        // Start a timer waiting for it to run
        if (this.testTimeInfo.truetime.UTCNow() < this.testTimeInfo.startTime) {
            const intervaltimer = window.setInterval(() => {
                const now = this.testTimeInfo.truetime.UTCNow();
                const remaining = this.testTimeInfo.startTime - now;
                if (remaining < timestampFromSeconds(1)) {
                    clearInterval(intervaltimer);
                    this.runTestLive(answermodel);
                } else {
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
    private runTestLive(answermodel: RealTimeModel): void {
        $('.waittimer').empty();
        $('.testcontent').show();
        $('.instructions')
            .removeClass('instructions')
            .addClass('iinstructions');
        // Start a timer and run until we are out of time
        this.lastActiveTime = this.testTimeInfo.truetime.UTCNow();
        const intervaltimer = window.setInterval(() => {
            const now = this.testTimeInfo.truetime.UTCNow();

            // We want to track their total idle time.  Initially we pull it from the realtime data and set it as the total 
            // as well as remember the last value it was set as
            // then as they are idle, we add to our total.
            // Once the total exceeds the cached value by 10 seconds, we update the realtime data and save the new value as the total
            // We also watch the values for all three of them.  If any of them change, we update the corresponding field in the UI
            // See if they are the active window
            if (!document.hasFocus()) {
                this.totalIdleTime += now - this.lastActiveTime;
                if (this.totalIdleTime > timestampFromSeconds(10)) {
                    const msg = this.computeOBT(this.totalIdleTime);
                    $(this.obtID).text(msg);
                    // See if it is time for us to update it
                    if (this.totalIdleTime > (this.realtimeIdleTracker.value() + timestampFromSeconds(10))) {
                        this.realtimeIdleTracker.value(this.totalIdleTime);
                    }
                }
            }
            this.lastActiveTime = now;
            this.testTimeInfo.endTime = answermodel.elementAt('endtime').value();
            if (now >= this.testTimeInfo.endTime) {
                clearInterval(intervaltimer);
                // Time to kill the test
                this.shutdownTest(answermodel);
            }
            $('#tremain').text(formatTime(this.testTimeInfo.endTime - now));
        }, 100);
    }
    /**
     * saveBackupCopy makes a copy of all the data in the web browser and stores it on the server
     */
    private saveBackupCopy(): void {
        // Build the list of all the answers we will fill in
        let finalanswers: StringMap = {}
        // Find all of the input fields
        $(".awc").each((_i, elem) => {
            // Get the input field
            let inputField = $(elem)
            // Get the id (which tells us the question and the position of the answer)
            // and the value stored in the field
            const id = inputField.attr('id') as string
            let val = inputField.val() as string
            // If the field is blank, then we want to at least have a space character
            if (val === undefined || val === '') {
                val = ' '
            }
            // Parse out the input id (which is in the form Iq_n where q is the question number and n is the index of the answer)
            const parts = id.split('_')
            const index = Number(parts[1])
            const question = Number(parts[0].substring(1))
            // We know the question, if it is the first time we see it, then blank it out
            let answer_str = finalanswers[question]
            if (answer_str === undefined) {
                answer_str = ''
            }
            // Put the character at the right offset.
            if (index >= answer_str.length) {
                // This character is further than anything we saw, so padd out the string and put the character
                finalanswers[question] = answer_str + repeatStr(' ', index - answer_str.length) + val;
            } else {
                // It is in the middle of the string so replace it
                finalanswers[question] = setCharAt(answer_str, index, val)
            }
        });
        // We have gathered all the answers, so construct the save model
        const userid = this.getConfigString('userid', '')
        const result: IAnswerAudit = {
            user: userid,
            time: this.testTimeInfo.truetime.UTCNow(),
            testid: this.save_testid,
            answermodelid: this.state.testID,
            answers: finalanswers
        }
        console.log(JSON.stringify(result));
        this.saveRealtimeAnswerAudit(result, "").then().catch();
    }
    /**
     * Stage 8: Cleanup.
     * @param answermodel Interactive answer model
     */
    private shutdownTest(answermodel: RealTimeModel, message?: string): void {
        $(window).off('beforeunload');
        if (message === undefined) {
            message = 'Time is up. The test is now over.  Scheduled end time ';
        }
        $('.testcontent').hide();
        $('.iinstructions').hide();
        // Go through and ask all the questions if there is a confidence factor to consider
        let confidenceList = $("<ul/>");
        let needsConfidence = false
        let requeststr = ""
        let extra = ""
        for (const qnum in this.LoadedHandlers) {
            const handler = this.LoadedHandlers[qnum];
            let confidence = handler.checkConfidence();
            if (confidence > 20000) {
                needsConfidence = true;
                requeststr += extra + qnum
                extra = ","
                if (qnum === "0") {
                    confidenceList.append($("<li/>").text("Timed Question: Confidence=" + confidence));
                } else {
                    confidenceList.append($("<li/>").text("Question" + qnum + ": Confidence=" + confidence));
                }
            }
        }
        // Save any idle time we had.
        this.realtimeIdleTracker.value(this.totalIdleTime);
        const session = answermodel.session().domain();
        this.testTimeInfo.truetime.stopTiming();
        answermodel.close().then(() => {
            session.dispose();
            this.disconnectRealtime();
        });

        // Make a temporary copy of all the 
        this.saveBackupCopy();
        this.setTestStatusMessage(message, this.testTimeInfo.endTime);

        if (this.checkPaper && needsConfidence) {
            const result = $(".testcontent")
            const title = $("<h3/>").text("Paper Copy Confidence Values");
            const calloutContent = $("<div/>")
                .append(title)
                .append(confidenceList);
            this.displayUploadQR(calloutContent, this.state.testID, requeststr);

            const callout = makeCallout(calloutContent, 'primary');
            result.append(callout);
        }
        $('#topsplit').hide();
        $('.gutter-row-1').hide();
        $('.timer').hide();
        $('.testcontent').show();
        $('.mainmenubar').show();
    }
}
