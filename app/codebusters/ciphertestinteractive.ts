import { cloneObject, cloneObjectClean } from '../common/ciphercommon';
import { ITestType, menuMode, toolMode, CipherHandler, IState, IInteractiveTest, ITestQuestionFields } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState } from './ciphertest';
import { ConvergenceDomain, RealTimeModel, RealTimeObject } from "@convergence/convergence";
import { Convergence } from "@convergence/convergence";
import { CipherInteractiveFactory, CipherPrintFactory } from './cipherfactory';
import { TrueTime } from '../common/truetime';

/**
 * CipherTestInteractive
 *  Creates the interactive version of a test.
 */
export class CipherTestInteractive extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
        test: 0,
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [];
    public pageNumber: number = 0;
    public truetime: TrueTime = new TrueTime(this.timeAnomaly);
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
            $('.testcontent').each((i, elem) => {
                this.displayInteractiveTest($(elem), this.state.testID);
            });
        } else {
            // Not an interactive test, so we must be trying to create one from the current test
            $('.testcontent').each((i, elem) => {
                this.generateInteractiveModel($(elem));
            });
            this.attachHandlers();
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
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestEditState('testint');
    }
    /**
     * getInteractiveURI gets the URI to call for the interactive collaboration.
     * It defaults to a public server, but can be overridded with a local configuration value stored in "domain"
     * @returns string corresponding to the interactive API to call
     */
    public getInteractiveURI(): string {
        // return this.getConfigString("domain", "https://codebusters.alyzee.org/") +
        return this.getConfigString("domain", "http://toebeshome.myqnapcloud.com:7630/") +
            "api/realtime/convergence/scienceolympiad";
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
     * generateInteractiveModel takes the current test and constructs the interactive model
     * to be stored on the server
     * @param elem Element to place any output/errors/HTML
     */
    public generateInteractiveModel(elem: JQuery<HTMLElement>): void {
        let testcount = this.getTestCount();
        let errors: string[] = [];
        // Start out with a clean slate for our output (incase we are being invoked a second time)
        elem.empty();
        // Make sure we actually have a test to generate the model from
        if (testcount === 0) {
            elem.append($('<h3>').text('No Tests Created Yet'));
            return;
        }
        if (this.state.test > testcount) {
            elem.append($('<h3>').text('Test not found'));
            return;
        }
        // We have a test so get the base data for it.
        let test = this.getTestEntry(this.state.test);
        let result = $('<div/>');
        elem.append(result);
        $('.testtitle').text(test.title);
        // We need to save away the JSON for the test so that it can be restored/recreated later
        let testJSON = this.generateTestJSON(test);
        // Create the base structure for the interactive test.  This will include
        // a subset of the normal save data, only enough to present the test, but not enough
        // that someone could hack the answers out of it.
        let interactive: IInteractiveTest = {
            title: test.title,
            useCustomHeader: test.useCustomHeader,
            customHeader: test.customHeader,
            count: 0,
            questions: [],
            testtype: test.testtype,
            hasSpanish: false,
            hasMorse: false,
            qdata: [],
        }
        // Clean up the custom header if it came in blank so we don't have anything undefined in the data structure
        if (!interactive.useCustomHeader) {
            interactive.useCustomHeader = false;
            interactive.customHeader = "";
        }
        if (interactive.testtype === undefined) {
            interactive.testtype = ITestType.cregional;
        }
        // We also have the answer data.  The difference here is that the answerdata mirrors the interactive
        // test, but is a series of blank fields for the test taker to put the answers into.  The system
        // makes a copy of the answer data for each team taking the test
        let answerdata: ITestQuestionFields[] = [];
        this.runningKeys = undefined;
        // See if we have a timed question to work from.  It always takes the first slot
        // in the list of answers, even if there is no timed question.
        if (test.timed === -1) {
            // Division A doesn't have a timed quesiton, so don't print out
            // a message if it isn't there.
            if (interactive.testtype !== ITestType.aregional) {
                result.append(
                    $('<p/>', {
                        class: 'noprint',
                    }).text('No timed question')
                );
            }
            answerdata.push({ answer: [], notes: "" });
        } else {
            // We do have a timed question, so get the handler for it (typcally an aristocrat)
            let cipherhandler = this.GetFactory(test.timed);
            let qerror = ''
            // Division A doesn't have a timed question, but if one was
            // there, print it out, but generate an error message
            if (interactive.testtype === ITestType.aregional) {
                qerror = 'Not allowed for Division A';
            } else {
                qerror = cipherhandler.CheckAppropriate(interactive.testtype);
            }
            if (qerror !== '') {
                errors.push('Timed Question: ' + qerror);
            }
            // Save the Interactive portion of the test
            interactive.timed = cipherhandler.saveInteractive(-1, interactive.testtype, true);
            answerdata.push(cipherhandler.getInteractiveTemplate())
            interactive.qdata.push({ qnum: -1, points: interactive.timed.points });
        }
        // Go through all the questions and generate the interactive portion
        for (let qnum = 0; qnum < test.count; qnum++) {
            let cipherhandler = this.GetFactory(test.questions[qnum]);
            // Is this a xenocrypt?  if so we need the Spanish frequency table on the final test
            if (cipherhandler.state.curlang === 'es') {
                interactive.hasSpanish = true;
            }
            /* Does this cipher involve morse code? */
            if (cipherhandler.usesMorseTable) {
                interactive.hasMorse = true;
            }
            let qerror = cipherhandler.CheckAppropriate(interactive.testtype);
            if (qerror !== '') {
                errors.push('Question ' + String(qnum + 1) + ': ' + qerror);
            }
            // We have the question, so save the interactive data for it
            let idata = cloneObjectClean(cipherhandler.saveInteractive(qnum, interactive.testtype, false)) as IState;
            answerdata.push(cipherhandler.getInteractiveTemplate());
            interactive.questions.push(idata);
            interactive.qdata.push({ qnum: qnum, points: idata.points });
            interactive.count++;

            // Capture any running keys for the interactive test
            if (cipherhandler.usesRunningKey) {
                // If we haven't gotten any running keys then get the defaults
                if (interactive.runningKeys === undefined) {
                    interactive.runningKeys = this.getRunningKeyStrings();
                }
                // Add this one to the list of running keys used.  Note that we don't
                // have a title, so we have to just make it up.  In theory this shouldn't
                // happen because we would expect that all the running keys were defined before
                // creating the test.
                if (cipherhandler.extraRunningKey !== undefined) {
                    interactive.runningKeys.push({
                        title: 'Unknown',
                        text: cipherhandler.extraRunningKey,
                    });
                }
            }
        }
        // All the interactive data has been captured.  Display any errors that we encountered in the
        // process of generating it.
        if (errors.length === 1) {
            $(".testerrors").append($('<div/>', {
                class: 'callout alert',
            }).text(errors[0]));
        } else if (errors.length > 1) {
            let ul = $("<ul/>");
            for (let msg of errors) {
                ul.append($("<li/>").text(msg));
            }
            $(".testerrors").append($('<div/>', {
                class: 'callout alert',
            }).text("The following errors were found:")
                .append(ul));
        }
        // Since the handlers turn on the file menus sometimes, we need to turn them back off
        this.setMenuMode(menuMode.test);
        // Now that we have all the data, we need to save it to the interactive server
        this.saveModels(elem, interactive, answerdata);
    }
    /**
     * postErrorMessage displays an error string in an alert on the page
     * @param elem DOM location to put the error message
     * @param message Text for the error message
     */
    public postErrorMessage(elem: JQuery<HTMLElement>, message: string) {
        let callout = $('<div/>', {
            class: 'callout alert',
        }).text(message);
        console.log(message);
        elem.append(callout);
    }
    /**
     * Save the current test model to the server
     * @param elem DOM location to put any output
     * @param interactive Interactive test data
     * @param answerdata Interactive test answer data
     * @param testJSON JSON corresponding to the test
     */
    public saveModels(elem: JQuery<HTMLElement>, interactive: IInteractiveTest, answerdata: ITestQuestionFields[]) {
        // Now that we have the model of the test and the model of the answers,
        //  we need to create two models.  
        // The interactive test is what we pull down to create the test
        // the answerdata is what is shared between the test takers
        //
        // Convergence.configureLogging({
        //     root: LogLevel.DEBUG
        // });

        // this.setConfigString("domain", "http://192.168.1.11/");
        // this.setConfigString("domain", "https://codebusters.alyzee.org/");


        // 1. Connect to the domain anonymously.
        Convergence.connectAnonymously(this.getInteractiveURI())
            .then((domain: ConvergenceDomain) => {
                // 2. Initializes the application after connecting by opening a model.
                const modelService = domain.models();
                modelService.openAutoCreate({
                    collection: "codebusters_tests",
                    data: interactive,
                }).then((testmodel: RealTimeModel) => {
                    // It has been created, so 
                    var testModelID = testmodel.modelId();
                    testmodel.close();
                    modelService.openAutoCreate({
                        collection: "codebusters_answers",
                        data: {
                            testid: testModelID,
                            starttime: Date.now(),
                            answers: answerdata
                        }
                    }).then((datamodel: RealTimeModel) => {
                        var dataModelID = datamodel.modelId();
                        let callout = $('<div/>', {
                            class: 'callout success',
                        }).append($("<a/>", { href: "TestInteractive.html?testID=" + dataModelID, target: "_blank" }).text("Open Interactive test"));
                        elem.append(callout);
                        // We need to close all the models. now that they have been created
                        datamodel.close();
                    }).catch((error) => {
                        this.postErrorMessage(elem, "Convergence API could not open data model: " + error);
                    })
                }).catch((error) => {
                    this.postErrorMessage(elem, "Convergence API could not open test model: " + error);
                });
            }).catch((error) => {
                this.postErrorMessage(elem, "Convergence API could not connect: " + error);
            });
    }
    /**
     * 
     * @param elem 
     * @param testUID 
     */
    public displayInteractiveTest(elem: JQuery<HTMLElement>, testUID: string) {
        Convergence.connectAnonymously(this.getInteractiveURI())
            .then((domain: ConvergenceDomain) => {
                // 2. Initializes the application after connecting by opening a model.
                const modelService = domain.models();
                modelService.open(testUID)
                    .then((datamodel: RealTimeModel) => {
                        console.log('opened test model')
                        let testid = datamodel.elementAt("testid").value()
                        modelService.open(testid)
                            .then((testmodel: RealTimeModel) => {
                                console.log("Fully opened: testmodel");
                                this.deferredInteractiveTest(elem, testmodel, datamodel);
                            })
                            .catch((error) => {
                                this.postErrorMessage(elem, "Convergence API could not open data model: " + error);
                            })
                    })
                    .catch((error) => {
                        this.postErrorMessage(elem, "Convergence API could not open test model: " + error);
                    });
            })
            .catch((error) => {
                this.postErrorMessage(elem, "Convergence API could not connect: " + error);
            });
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
            ihandler.attachInteractiveHandlers(qnum, realTimeObject);
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
     * @param datamodel 
     */
    public deferredInteractiveTest(elem: JQuery<HTMLElement>, testmodel: RealTimeModel, datamodel: RealTimeModel) {
        let interactive = testmodel.root().value();
        elem.append($('<div/>', { class: 'head' }).text(interactive.title));
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
            this.makeInteractive(elem, interactive.timed, -1, datamodel.elementAt("answers", 0) as RealTimeObject);
        }
        for (let qnum = 0; qnum < interactive.count; qnum++) {
            this.makeInteractive(elem, interactive.questions[qnum], qnum, datamodel.elementAt("answers", qnum + 1) as RealTimeObject);
        }


    }
}
