import { CipherTest, ITestState, IAnswerTemplate } from "./ciphertest";
import { toolMode, ITestTimeInfo, menuMode, IState } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { cloneObject, makeCallout, formatTime, NumberMap, timestampFromSeconds } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { TrueTime } from "../common/truetime";
import { ConvergenceDomain, RealTimeModel, HistoricalModel, HistoricalObject, RealTimeObject, ModelService } from "@convergence/convergence";
import { CipherInteractiveFactory } from "./cipherfactory";
import { JTTable } from "../common/jttable";
import { ObservableObject } from "@convergence/convergence/typings/model/observable/ObservableObject";

// TrueTimePlayback provides an override for the time that the test sees.
// In reality it doesn't time anything but just remembers the current time.
class TrueTimePlayback extends TrueTime {
    private now: number = 0;
    public UTCNow(): number {
        return this.now;
    }
    public setTime(now: number) {
        this.now = now;
    }
    public startTiming() { }
    public syncTime() { }
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
    public pageNumber: number = 0;
    public testTimeInfo: ITestTimeInfo = {
        truetime: new TrueTimePlayback(),
        startTime: 0,
        endTime: 0,
        endTimedQuestion: 0
    };
    public shadowOffsets: NumberMap = {};
    private playbackTimer: NodeJS.Timeout = undefined;
    private playbackInterval: number = 0;
    private inScrubTo: boolean = false;
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
            $('.testcontent').empty().append(makeCallout($("<h3/>").text("No test id was provided to playback.")));
        }
        this.attachHandlers();
    }
    /**
     * Update the current time
     * @param newTime New time to set the playback clock to
     */
    private updatePlaybackClock(newTime: number) {
        // Set our global time
        let trueTimePlayback = this.testTimeInfo.truetime as TrueTimePlayback;
        trueTimePlayback.setTime(newTime);
        // Move the slider to the corresponding spot
        $("#scrubslider input").val(newTime).trigger('change');
        // And update the clock at the top
        $("#tremain").text(formatTime(this.testTimeInfo.endTime - this.testTimeInfo.truetime.UTCNow()));
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

        let lastSlot = this.shadowanswermodel.maxVersion();
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
                    let saveslot = this.shadowanswermodel.version();
                    if (saveslot !== currentSlot) {
                        console.log("Starting off backwards bad: at " + saveslot + " but thought at " + currentSlot);
                    }
                    // await this.shadowanswermodel.backward(currentSlot - targetslot);
                    await this.shadowanswermodel.playTo(targetslot);
                    // Figure out where we ended up at and save it in the cache
                    currentSlot = this.shadowanswermodel.version();
                    currentTime = this.shadowanswermodel.time().valueOf();
                    // console.log("After Backward: " + currentSlot + " at " + currentTime + " going to " + scrubTime);
                    this.shadowOffsets[currentSlot] = currentTime;
                    // Just to be certain, let's make sure that we actually ended up where we expected.
                    if (currentSlot !== targetslot) {
                        console.log("Failed to move backwards to " + targetslot + " but ended at " + currentSlot + " we were at " + saveslot);
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
                    let saveslot = this.shadowanswermodel.version();
                    // await this.shadowanswermodel.forward(targetslot-currentSlot);
                    await this.shadowanswermodel.playTo(targetslot);
                    currentSlot = this.shadowanswermodel.version();
                    let newTime = this.shadowanswermodel.time().valueOf();
                    // console.log("After Forward: " + currentSlot + " at " + newTime + " going to " + scrubTime);
                    this.shadowOffsets[currentSlot] = newTime;
                    if (currentSlot !== targetslot) {
                        console.log("Failed to move forward to " + targetslot + " at " + currentSlot + " we were at " + saveslot);
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
        let actualslot = this.answermodel.version();
        if (actualslot < targetslot) {
            this.answermodel.forward(targetslot - actualslot)
                .then(() => {
                    this.updatePlaybackClock(scrubTime);
                    this.inScrubTo = false;
                })
                .catch((error) => {
                    this.reportFailure("Convergence API problem moving forward: " + error);
                    this.inScrubTo = false;
                });
        } else if (actualslot > targetslot) {
            this.answermodel.backward(actualslot - targetslot)
                .then(() => {
                    this.updatePlaybackClock(scrubTime);
                    this.inScrubTo = false;
                })
                .catch((error) => {
                    this.reportFailure("Convergence API problem moving backward: " + error);
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
        $(".noplay").removeAttr('disabled').removeClass("primary").addClass("secondary");
        $(".playstop").removeClass("alert").addClass("secondary").html("&#x23F5;"); // .text("▶");
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
        $(".noplay").prop('disabled', true).removeClass("primary").addClass("secondary");
        $("." + button).removeClass("secondary").addClass("primary");
        $(".playstop").removeClass("primary secondary").addClass("alert").html("&#x23F9;&#xFE0E;") //.text("⏹");
        let tickspersec = 10;
        this.playbackInterval = timestampFromSeconds(1 / tickspersec);
        this.playbackTimer = setInterval(() => {
            let newTime = this.testTimeInfo.truetime.UTCNow() + (this.playbackInterval * speed);
            // console.log("Tick: " + newTime + " (" + timestampToFriendly(newTime) + ") interval=" + this.playbackInterval);
            this.scrubTo(newTime);
        }, this.playbackInterval)
        let now: number = this.testTimeInfo.truetime.UTCNow();
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
        this.startPlayback(-10, "rewind");
    }
    /**
     * Play single speed reverse
     */
    public playReverse(): void {
        this.startPlayback(-1, "reverse");
    }
    /**
     * Start/Stop playing
     */
    public playStop(): void {
        if (this.playbackInterval === 0) {
            this.startPlayback(1, "playstop")
        } else {
            this.stopPlayback();
        }
    }
    /**
     * Play forward double speed
     */
    public playFastForward(): void {
        this.startPlayback(10, "fastforward");
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
     * @param answerModelID answer template id
     */
    public displayInteractiveTest(answerModelID: string) {
        this.connectRealtime()
            .then((domain: ConvergenceDomain) => {
                // 2. Initializes the application after connecting by opening a model.
                const modelService = domain.models();
                modelService.history(answerModelID)
                    .then((answermodel: HistoricalModel) => {
                        let answertemplate = answermodel.root().value() as IAnswerTemplate;
                        this.answermodel = answermodel;

                        // Populate the time from the answer template
                        this.testTimeInfo.startTime = answertemplate.starttime;
                        this.testTimeInfo.endTimedQuestion = answertemplate.endtimed;
                        this.testTimeInfo.endTime = answertemplate.endtime;
                        let testModelID = answertemplate.testid;

                        // let startTime = this.answermodel.minTime().getTime();
                        // let endTime = this.answermodel.maxTime().getTime();
                        // if (startTime < this.testTimeInfo.startTime) {
                        //     startTime = this.testTimeInfo.startTime;
                        // }
                        // if (endTime > this.testTimeInfo.endTime) {
                        //     endTime = this.testTimeInfo.endTime;
                        // }


                        let elem = new Foundation.Slider($("#scrubslider"), {
                            start: answertemplate.starttime,
                            end: answertemplate.endtime,
                            initialStart: answertemplate.endtime
                        });
                        let target = $('.default-header');
                        target.hide();
                        $("#scrubslider").on('changed.zf.slider', () => {
                            let newTime = parseInt($("#scrubslider input").val() as string);
                            this.scrubTo(newTime);
                        })
                        // If they close the window or navigate away, we want to close all our connections
                        $(window).on('beforeunload', () => this.shutdownTest());
                        this.openTestModel(modelService, testModelID, answerModelID);
                    })
            })
            .catch((error) => { this.reportFailure("Convergence API could not open test model: " + error); });
    }
    /**
      * Open the test model for the test template.
      * @param modelService 
      * @param testModelID 
      * @param answermodelID Interactive answer model
      */
    private openTestModel(modelService: ModelService, testModelID: string, answerModelID: string) {
        modelService.open(testModelID)
            .then((testmodel: RealTimeModel) => {
                let interactive = testmodel.root().value();
                testmodel.close();
                this.openShadowAnswerModel(modelService, answerModelID, interactive);
            })
            .catch((error) => { this.reportFailure("Convergence API could not open data model: " + error); });
    }
    /**
     * 
     * @param modelService 
     * @param answerModelID 
     * @param interactive Test template
     */
    private openShadowAnswerModel(modelService: ModelService, answerModelID: string, interactive: any) {
        modelService.history(answerModelID)
            .then((shadowanswermodel: HistoricalModel) => {
                this.shadowanswermodel = shadowanswermodel;
                this.buildInteractiveTest(interactive);
            })
            .catch((error) => { this.reportFailure("Convergence API could not open shadow history model: " + error); });
    }
    /**
     * Construct the score template and populate the hints that they will need
     * @param interactive Test template
     */
    public buildInteractiveTest(interactive: any) {
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
            this.makeInteractive(target, interactive.timed, -1, this.answermodel.elementAt("answers", 0) as HistoricalObject);
        }
        for (let qnum = 0; qnum < interactive.count; qnum++) {
            this.makeInteractive(target, interactive.questions[qnum], qnum, this.answermodel.elementAt("answers", qnum + 1) as HistoricalObject);
        }
        // Make all the input fields readonly when in playback mode
        $(".awc").prop("readonly", true);
        $(".awr").prop("readonly", true);
        $(".intnote").prop("readonly", true);
        $(".ir").off("click");
        $(".timer").show();
        this.setMenuMode(menuMode.test);
    }
    /**
     * Stage 8: Cleanup.
     * @param message Shutdown message
     */
    private shutdownTest() {
        $(window).off('beforeunload');
        if (this.answermodel !== undefined) {
            let session = this.answermodel.session().domain();
            this.testTimeInfo.truetime.stopTiming();
            session.dispose();
            this.answermodel = undefined;
        }
        $("#topsplit").hide();
        $(".gutter-row-1").hide();
        $(".timer").hide();
        $('.testcontent').show();
        $(".mainmenubar").show();
    }

    public attachHandlers(): void {
        $(".skipstart").off('click').on('click', () => {
            this.playFirst();
        });
        $(".rewind").off('click').on('click', () => {
            this.playRewind();
        });
        $(".reverse").off('click').on('click', () => {
            this.playReverse()
        });
        $(".playstop").off('click').on('click', () => {
            this.playStop();
        });
        $(".fastforward").off('click').on('click', () => {
            this.playFastForward();
        });
        $(".skipend").off('click').on('click', () => {
            this.playEnd();
        });
        super.attachHandlers();
    }
}