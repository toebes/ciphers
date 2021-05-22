import { CipherTest, ITestState, IAnswerTemplate } from './ciphertest';
import { toolMode, ITestTimeInfo, menuMode, IState, IInteractiveTest } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import {
    cloneObject,
    makeCallout,
    formatTime,
    NumberMap,
    timestampFromSeconds,
} from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { TrueTime } from '../common/truetime';
import {
    ConvergenceDomain,
    HistoricalModel,
    HistoricalObject,
    RealTimeObject,
    ModelService,
    HistoricalNumber,
    NumberSetValueEvent,
} from '@convergence/convergence';
import { CipherInteractiveFactory } from './cipherfactory';
import { JTTable } from '../common/jttable';
import { ObservableObject } from '@convergence/convergence/typings/model/observable/ObservableObject';

// TrueTimePlayback provides an override for the time that the test sees.
// In reality it doesn't time anything but just remembers the current time.
class TrueTimePlayback extends TrueTime {
    private now = 0;
    public UTCNow(): number {
        return this.now;
    }
    public setTime(now: number): void {
        this.now = now;
    }
    public startTiming(): void { }
    public syncTime(): void { }
}
/**
 * CipherTestPlayback
 *  Creates the playback version of a test.
 */
export class CipherTestPlayback extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
        test: 0,
    };
    public shadowanswermodel: HistoricalModel = undefined;
    public answermodel: HistoricalModel = undefined;
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [];
    public pageNumber = 0;
    public testTimeInfo: ITestTimeInfo = {
        truetime: new TrueTimePlayback(),
        startTime: 0,
        endTime: 0,
        endTimedQuestion: 0,
    };
    public shadowOffsets: NumberMap = {};
    private playbackTimer: number = undefined;
    private playbackInterval = 0;
    private inScrubTo = false;
    private teamName = '';
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
        // Make sure that they are logged in to be able to playback a test
        if (this.confirmedLoggedIn(' in order to replay a test.', $('.testcontent'))) {
            // Do we have a test id to display an interactive test for?
            if (this.state.testID != undefined) {
                $('.testcontent').empty();
                $('.timer').hide();
                this.displayInteractiveTest(this.state.testID);
            } else {
                $('.testcontent')
                    .empty()
                    .append(makeCallout($('<h3/>').text('No test id was provided to playback.')));
            }
        }
        this.attachHandlers();
    }
    /**
     * Update the current time
     * @param newTime New time to set the playback clock to
     */
    private updatePlaybackClock(newTime: number): void {
        // Set our global time
        const trueTimePlayback = this.testTimeInfo.truetime as TrueTimePlayback;
        trueTimePlayback.setTime(newTime);
        // Move the slider to the corresponding spot
        $('#scrubslider input')
            .val(newTime)
            .trigger('change');
        // And update the clock at the top
        $('#tremain').text(
            formatTime(this.testTimeInfo.endTime - this.testTimeInfo.truetime.UTCNow())
        );
    }
    /**
     * scrubTo moves the current time in the model to the requested time.  Note
     * that it is unlikely that we have an event at this exact milisecond being requested
     * so we need to find the event that was live at the time of the request
     * NOTE: This is an async routine and not a promise, so it will run multiple operations
     * along the way and could take a while.  We need to do an async version because if we
     * did it as nested promises, it could end up being very deeply recursive.
     * @param scrubTime Time to advance to
     */
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    public async scrubTo(scrubTime: number) {
        // this.shadowanswermodel.minTime();
        // this.shadowanswermodel.maxTime();
        // Make sure that we could be successful.  Note that if we are already in the process
        // of doing a scrubTo, we will just have to ignore any additional requests because
        // the shadowmodel is already in use.
        if (this.shadowanswermodel === undefined || this.inScrubTo) {
            return;
        }
        this.inScrubTo = true;

        const lastSlot = this.shadowanswermodel.maxVersion();
        let currentSlot = this.shadowanswermodel.version();
        let currentTime = this.shadowanswermodel.time().valueOf();
        // Just in case we haven't cached the current slot (like the first time we are called)
        this.shadowOffsets[currentSlot] = currentTime;
        let targetslot = currentSlot;
        // See if we are going forward or backwards
        if (scrubTime < currentTime) {
            // Going backwards.  We want to keep checking the time until
            // we get to a slot which is less than the target time (or we hit the first one)
            // That will be the one which would be live at the time requested
            while (targetslot > 0 && scrubTime < currentTime) {
                // Back up one
                targetslot--;
                // And look to see if we have the time for it cached
                currentTime = this.shadowOffsets[targetslot];
                if (currentTime === undefined) {
                    // Not cached, so we need to ask the system to back up to it.
                    // console.log("Before backwards: " + this.shadowanswermodel.version() + " at " + this.shadowanswermodel.time().valueOf())
                    // Remember that we are unlikely to be sitting on the exact one we want, but we can step back to get to it by the
                    // current distance.  Note that we don't have to ask about the time of the other ones along the way because
                    // we should already have them cached
                    const saveslot = this.shadowanswermodel.version();
                    if (saveslot !== currentSlot) {
                        console.log(
                            'Starting off backwards bad: at ' +
                            saveslot +
                            ' but thought at ' +
                            currentSlot
                        );
                    }
                    // await this.shadowanswermodel.backward(currentSlot - targetslot);
                    try {
                        await this.shadowanswermodel.playTo(targetslot);
                    } catch (e) {
                        console.log("Shadow Answer problem:" + e);
                    }
                    // Figure out where we ended up at and save it in the cache
                    currentSlot = this.shadowanswermodel.version();
                    currentTime = this.shadowanswermodel.time().valueOf();
                    // console.log("After Backward: " + currentSlot + " at " + currentTime + " going to " + scrubTime);
                    this.shadowOffsets[currentSlot] = currentTime;
                    // Just to be certain, let's make sure that we actually ended up where we expected.
                    if (currentSlot !== targetslot) {
                        console.log(
                            'Failed to move backwards to ' +
                            targetslot +
                            ' but ended at ' +
                            currentSlot +
                            ' we were at ' +
                            saveslot
                        );
                    }
                }
                // All is good just report where we ended up at
                // console.log("-- new time:" + currentTime + " Going to " + scrubTime);
            }
        } else if (scrubTime > currentTime) {
            // Going forwards.  We will check the time until we go past it
            // and then know that we may back up one if we didn't hit the end.
            while (targetslot < lastSlot && scrubTime > currentTime) {
                targetslot++;
                currentTime = this.shadowOffsets[targetslot];
                if (currentTime === undefined) {
                    // console.log("Before forwards: " + this.shadowanswermodel.version() + " at " + this.shadowanswermodel.time().valueOf())
                    const saveslot = this.shadowanswermodel.version();
                    // await this.shadowanswermodel.forward(targetslot-currentSlot);
                    await this.shadowanswermodel.playTo(targetslot);
                    currentSlot = this.shadowanswermodel.version();
                    const newTime = this.shadowanswermodel.time().valueOf();
                    // console.log("After Forward: " + currentSlot + " at " + newTime + " going to " + scrubTime);
                    this.shadowOffsets[currentSlot] = newTime;
                    if (currentSlot !== targetslot) {
                        console.log(
                            'Failed to move forward to ' +
                            targetslot +
                            ' at ' +
                            currentSlot +
                            ' we were at ' +
                            saveslot
                        );
                    }
                }
                currentTime = this.shadowOffsets[targetslot];
                // console.log("++ new time:" + currentTime + " Going to " + scrubTime);
            }
            // See if we need to back up.
            if (scrubTime < currentTime && targetslot > 0) {
                targetslot--;
            }
        }
        // Now that we know the target slot (which we got using the shadow model)
        // See if we need to move to the slot on the real model
        const actualslot = this.answermodel.version();
        if (actualslot < targetslot) {
            this.answermodel
                .forward(targetslot - actualslot)
                .then(() => {
                    this.updatePlaybackClock(scrubTime);
                    this.inScrubTo = false;
                })
                .catch((error) => {
                    this.reportFailure('Convergence API problem moving forward: ' + error);
                    this.inScrubTo = false;
                });
        } else if (actualslot > targetslot) {
            this.answermodel
                .backward(actualslot - targetslot)
                .then(() => {
                    this.updatePlaybackClock(scrubTime);
                    this.inScrubTo = false;
                })
                .catch((error) => {
                    this.reportFailure('Convergence API problem moving backward: ' + error);
                    this.inScrubTo = false;
                });
        } else {
            // The new time is on the same slot, so just update the timer
            this.updatePlaybackClock(scrubTime);
            this.inScrubTo = false;
        }
        // console.log("Scrub position: " + targetslot + " for " + scrubTime + " Under " + currentTime);
    }
    /**
     * Stop any active playback and update the UI controls
     */
    public stopPlayback(): void {
        $('.noplay')
            .removeAttr('disabled')
            .removeClass('primary')
            .addClass('secondary');
        $('.playstop')
            .removeClass('alert')
            .addClass('secondary')
            .html('&#x23F5;'); // .text("▶");
        if (this.playbackTimer !== undefined) {
            clearInterval(this.playbackTimer);
        }
        this.playbackInterval = 0;
    }
    /**
     * Start playback
     * @param speed Speed to play (1 = normal, negative is reverse) as a multiplier of units per second
     */
    public startPlayback(speed: number, button: string): void {
        this.stopPlayback();
        $('.noplay')
            .prop('disabled', true)
            .removeClass('primary')
            .addClass('secondary');
        $('.' + button)
            .removeClass('secondary')
            .addClass('primary');
        $('.playstop')
            .removeClass('primary secondary')
            .addClass('alert')
            .html('&#x23F9;&#xFE0E;'); //.text("⏹");
        const tickspersec = 10;
        this.playbackInterval = timestampFromSeconds(1 / tickspersec);
        this.playbackTimer = window.setInterval(() => {
            const newTime = this.testTimeInfo.truetime.UTCNow() + this.playbackInterval * speed;
            // console.log("Tick: " + newTime + " (" + timestampToFriendly(newTime) + ") interval=" + this.playbackInterval);
            this.scrubTo(newTime);
        }, this.playbackInterval);
        //const now: number = this.testTimeInfo.truetime.UTCNow();
        // console.log("Start to play from " + now + " (" + timestampToFriendly(now) + ") speed=" + speed + " interval=" + this.playbackInterval);
    }
    /**
     * Stop playing and jump to earliest entry
     */
    public playFirst(): void {
        this.stopPlayback();
        this.scrubTo(this.testTimeInfo.startTime);
    }
    /**
     * Play doublespeed reverse
     */
    public playRewind(): void {
        this.startPlayback(-10, 'rewind');
    }
    /**
     * Play single speed reverse
     */
    public playReverse(): void {
        this.startPlayback(-1, 'reverse');
    }
    /**
     * Start/Stop playing
     */
    public playStop(): void {
        if (this.playbackInterval === 0) {
            this.startPlayback(1, 'playstop');
        } else {
            this.stopPlayback();
        }
    }
    /**
     * Play forward double speed
     */
    public playFastForward(): void {
        this.startPlayback(10, 'fastforward');
    }
    /**
     * Stop playing and Skip to the end
     */
    public playEnd(): void {
        this.stopPlayback();
        this.scrubTo(this.testTimeInfo.endTime);
    }
    /**
     * makeInteractive creates an interactive question by invoking the appropriate factory for the saved state
     * @param elem HTML DOM element to append UI elements for the question
     * @param state Saved state for the Interactive question to display
     * @param qnum Question number, -1 indicated a timed question
     * @param testtype The type of test that it is being generated for
     * @param observableObject Realtime object to establish collaboration for
     */
    public makeInteractive(elem: JQuery<HTMLElement>, state: IState, qnum: number, observableObject: HistoricalObject): void {
        // Sometimes the handlers die because of insufficient data passed to them (or because they are accessing something that they shouldn't)
        // We protect from this to also prevent it from popping back to the higher level try/catch which is dealing with any communication
        // errors to the server
        try {
            // Find the right class to render the cipher
            const ihandler = CipherInteractiveFactory(state.cipherType, state.curlang);
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
            ihandler.attachInteractiveHandlers(
                qnum,
                (observableObject as ObservableObject) as RealTimeObject,
                this.testTimeInfo
            );
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
     * @param answerModelID ID of the answer model
     */
    public displayInteractiveTest(answerModelID: string): void {
        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            // 2. Initializes the application after connecting by opening a model.
            const modelService = domain.models();
            modelService.history(answerModelID).then((answermodel: HistoricalModel) => {
                const answertemplate = answermodel.root().value() as IAnswerTemplate;
                this.answermodel = answermodel;

                // Populate the time from the answer template
                this.testTimeInfo.startTime = answertemplate.starttime;
                this.testTimeInfo.endTimedQuestion = answertemplate.endtimed;
                this.testTimeInfo.endTime = answertemplate.endtime;
                const testModelID = answertemplate.testid;
                this.teamName = answertemplate.teamname;

                for (let i = 0; i < 3; i++) {
                    let name = '';
                    let userid = '';
                    if (i < answertemplate.assigned.length) {
                        name = answertemplate.assigned[i].displayname;
                        userid = answertemplate.assigned[i].userid;
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
                        const idleTracker = answermodel.elementAt('assigned', i, 'idletime') as HistoricalNumber
                        // If the tracker time changes then we want to update the out of browser time on the screen
                        idleTracker.on(HistoricalNumber.Events.VALUE, (event: NumberSetValueEvent) => {
                            $("#idle" + idslot).text(this.computeOBT(event.element.value()));
                        });
                        // Pre-populate the OBT slot for this user (which might be empty)
                        $("#idle" + idslot).text(this.computeOBT(idleTracker.value()));
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const elem = new Foundation.Slider($('#scrubslider'), {
                    start: answertemplate.starttime,
                    end: answertemplate.endtime,
                    initialStart: answertemplate.endtime,
                });
                const target = $('.default-header');
                target.hide();
                $('#scrubslider').on('changed.zf.slider', () => {
                    const newTime = parseInt($('#scrubslider input').val() as string);
                    this.scrubTo(newTime);
                });
                // If they close the window or navigate away, we want to close all our connections
                $(window).on('beforeunload', () => this.shutdownTest());
                this.openShadowAnswerModel(modelService, answerModelID, testModelID);
            });
        });
    }
    /**
     * Open the shadow copy of the answermodel in order to optimize seeking
     * @param modelService Domain Model service object for making requests
     * @param answerModelID ID of the answer model
     * @param testModelID ID of the test model
     */
    private openShadowAnswerModel(modelService: ModelService, answerModelID: string, testModelID: string,): void {
        modelService
            .history(answerModelID)
            .then((shadowanswermodel: HistoricalModel) => {
                this.shadowanswermodel = shadowanswermodel;
                this.openTestModel(testModelID);
            })
            .catch((error) => {
                this.reportFailure('Convergence API could not open shadow history model: ' + error);
            });
    }
    /**
     * Open the test model for the test template.
     * @param testModelID ID of the test model
     */
    private openTestModel(testModelID: string): void {
        this.getRealtimeTestModel(testModelID)
            .then((testmodel) => {
                this.buildInteractiveTest(testmodel);
            })
            .catch((error) => {
                this.reportFailure('Unable to open test model: ' + error);
            });
    }
    /**
     * Construct the score template and populate the hints that they will need
     * @param testmodel Test template
     */
    public buildInteractiveTest(testmodel: IInteractiveTest): void {
        // Update the title for the test
        $('.testtitle').text(testmodel.title);
        $("#school").text(this.teamName);

        // Show custom header or default header.
        if (testmodel.useCustomHeader) {
            $('.custom-header')
                .append(testmodel.customHeader)
                .show();
        } else {
            $('.default-header').show();
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
        const target = $('.testcontent');
        // Generate the questions
        if (testmodel.timed !== undefined) {
            this.makeInteractive(
                target,
                testmodel.timed,
                -1,
                this.answermodel.elementAt('answers', 0) as HistoricalObject
            );
        }
        for (let qnum = 0; qnum < testmodel.count; qnum++) {
            this.makeInteractive(
                target,
                testmodel.questions[qnum],
                qnum,
                this.answermodel.elementAt('answers', qnum + 1) as HistoricalObject
            );
        }
        // Make all the input fields readonly when in playback mode
        $('.awc').prop('readonly', true);
        $('.awr').prop('readonly', true);
        $('.intnote').prop('readonly', true);
        $('.ir').off('click');
        $('.timer').show();
        this.setMenuMode(menuMode.test);
    }
    /**
     * Stage 8: Cleanup.
     * @param message Shutdown message
     */
    private shutdownTest(): void {
        $(window).off('beforeunload');
        if (this.answermodel !== undefined) {
            const session = this.answermodel.session().domain();
            this.testTimeInfo.truetime.stopTiming();
            session.dispose();
            this.answermodel = undefined;
        }
        $('#topsplit').hide();
        $('.gutter-row-1').hide();
        $('.timer').hide();
        $('.testcontent').show();
        $('.mainmenubar').show();
    }

    public attachHandlers(): void {
        $('.skipstart')
            .off('click')
            .on('click', () => {
                this.playFirst();
            });
        $('.rewind')
            .off('click')
            .on('click', () => {
                this.playRewind();
            });
        $('.reverse')
            .off('click')
            .on('click', () => {
                this.playReverse();
            });
        $('.playstop')
            .off('click')
            .on('click', () => {
                this.playStop();
            });
        $('.fastforward')
            .off('click')
            .on('click', () => {
                this.playFastForward();
            });
        $('.skipend')
            .off('click')
            .on('click', () => {
                this.playEnd();
            });
        super.attachHandlers();
    }
}
