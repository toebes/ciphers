import { cloneObject, cloneObjectClean, makeCallout } from '../common/ciphercommon';
import {
    ITestType,
    menuMode,
    toolMode,
    CipherHandler,
    IState,
    IInteractiveTest,
    ITestQuestionFields,
    ITest,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { CipherTest, ITestState, IAnswerTemplate, sourceTestData } from './ciphertest';
import { CipherPrintFactory } from './cipherfactory';
import { JTFDialog } from '../common/jtfdialog';

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
        // Create an interactive test
        $('.testlist').each((i, elem) => {
            setTimeout(() => { this.generateInteractiveModel($(elem)); }, 10);
        });
        this.attachHandlers();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return $('<div/>', { id: 'testemenu' }).append(this.genTestEditState('testint'));
    }
    /**
     * GetFactory returns an initialized CipherHandler associated with a question entry
     * @param question Which entry to get the factory for
     * @returns CipherHandler
     */
    public GetFactory(question: number): CipherHandler {
        const state = this.getFileEntry(question);
        const cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        return cipherhandler;
    }
    /**
     * generateInteractiveModel takes the current test and constructs the interactive model
     *  to be stored on the server
     * @param elem Element to place any output/errors/HTML
     */
    public generateInteractiveModel(elem: JQuery<HTMLElement>): void {
        const testcount = this.getTestCount();
        const errors: string[] = [];
        // Start out with a clean slate for our output (incase we are being invoked a second time)
        elem.empty();
        // Make sure we actually have a test to generate the model from
        if (testcount === 0) {
            elem.append(makeCallout($('<h3>').text('No Tests Created Yet')));
            return;
        }
        if (this.state.test > testcount || this.state.test === undefined) {
            elem.append(makeCallout($('<h3/>').text('No test id was provided to save to the server.')));
            return;
        }
        if (!this.confirmedLoggedIn(' in order to save the test to the server.', elem)) {
            return;
        }

        // We have a test so get the base data for it.
        const test = this.getTestEntry(this.state.test);
        const result = $('<div/>');
        elem.append(result);
        $('.testtitle').text(test.title);
        // We need to save away the JSON for the test so that it can be restored/recreated later
        const testData = this.generateTestData(test);
        // Create the base structure for the interactive test.  This will include
        // a subset of the normal save data, only enough to present the test, but not enough
        // that someone could hack the answers out of it.
        const interactive: IInteractiveTest = {
            title: test.title,
            useCustomHeader: test.useCustomHeader,
            customHeader: test.customHeader,
            count: 0,
            questions: [],
            testtype: test.testtype,
            hasSpanish: false,
            hasMorse: false,
            hasPorta: false,
            hasVigenere: false,
            qdata: [],
            checkPaper: test.checkPaper,
        };
        // Clean up the custom header if it came in blank so we don't have anything undefined in the data structure
        if (!interactive.useCustomHeader) {
            interactive.useCustomHeader = false;
            interactive.customHeader = '';
        }
        if (interactive.testtype === undefined) {
            interactive.testtype = ITestType.cregional;
        }
        // We also have the answer data.  The difference here is that the answerdata mirrors the interactive
        // test, but is a series of blank fields for the test taker to put the answers into.  The system
        // makes a copy of the answer data for each team taking the test
        const answerdata: ITestQuestionFields[] = [];
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
            answerdata.push({ answer: [], notes: '' });
        } else {
            // We do have a timed question, so get the handler for it (typcally an aristocrat)
            const cipherhandler = this.GetFactory(test.timed);
            let qerror = '';
            // Division A doesn't have a timed question, but if one was
            // there, print it out, but generate an error message
            if (interactive.testtype === ITestType.aregional) {
                qerror = 'Not allowed for Division A';
            } else {
                qerror = cipherhandler.CheckAppropriate(interactive.testtype, false);
            }
            if (qerror !== '') {
                errors.push('Timed Question: ' + qerror);
            }
            // Save the Interactive portion of the test
            interactive.timed = cloneObjectClean(
                cipherhandler.saveInteractive(-1, interactive.testtype, true)
            ) as IState;
            const answertemplate = cipherhandler.getInteractiveTemplate();
            answertemplate.solvetime = 0;
            answerdata.push(answertemplate);
            interactive.qdata.push({ qnum: -1, points: interactive.timed.points });
        }
        // Go through all the questions and generate the interactive portion
        for (let qnum = 0; qnum < test.count; qnum++) {
            const cipherhandler = this.GetFactory(test.questions[qnum]);
            // Is this a xenocrypt?  if so we need the Spanish frequency table on the final test
            if (cipherhandler.state.curlang === 'es') {
                interactive.hasSpanish = true;
            }
            /* Does this cipher involve morse code? */
            if (cipherhandler.usesMorseTable) {
                interactive.hasMorse = true;
            }
            /* Or a porta */
            if (cipherhandler.usesPortaTable) {
                interactive.hasPorta = true;
            }
            /* Or vigenere? */
            if (cipherhandler.usesVigenereTable) {
                interactive.hasVigenere = true;
            }
            const qerror = cipherhandler.CheckAppropriate(interactive.testtype, false);
            if (qerror !== '') {
                errors.push('Question ' + String(qnum + 1) + ': ' + qerror);
            }
            // We have the question, so save the interactive data for it
            const idata = cloneObjectClean(
                cipherhandler.saveInteractive(qnum, interactive.testtype, false)
            ) as IState;
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
            $('.testerrors').append(
                $('<div/>', {
                    class: 'callout alert',
                }).text(errors[0])
            );
        } else if (errors.length > 1) {
            const ul = $('<ul/>');
            for (const msg of errors) {
                ul.append($('<li/>').text(msg));
            }
            $('.testerrors').append(
                $('<div/>', {
                    class: 'callout alert',
                })
                    .text('The following errors were found:')
                    .append(ul)
            );
        }
        // Since the handlers turn on the file menus sometimes, we need to turn them back off
        this.setMenuMode(menuMode.test);
        // Now that we have all the data, we need to save it to the interactive server
        this.saveModels(elem, interactive, answerdata, testData);
    }
    /**
     * Returns the value for a given field id associated with a test entry.
     * Note that because it is stored two levels down, we have this service routine
     * safely get the data (if it actually exists)
     * @param testData Test Data source
     * @param field Model field to look for
     */
    private getModelId(testData: sourceTestData, field: string): string {
        let result: string = undefined;
        if (testData.hasOwnProperty('TEST.0') && testData['TEST.0'].hasOwnProperty(field)) {
            result = testData['TEST.0'][field];
        }
        if (result === "") {
            result = undefined;
        }
        return result;
    }
    /**
     * Save the current test model to the server
     * @param elem DOM location to put any output
     * @param interactive Interactive test data
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     */
    public saveModels(elem: JQuery<HTMLElement>, interactive: IInteractiveTest, answerdata: ITestQuestionFields[], testData: sourceTestData): void {
        // First we will need to test to see if the model exists.  This will get us to one of several options.
        // 1) The model already exists and we have permission to access it.
        //     Give them a choice to overwrite the existing model, create a new model or go back to editing the test.
        // 2) The model already exists and we don't have permission to access it.
        //     Give them a choice to create a new model or go back to editing the test
        // 3) The model doesn't exist.
        //     Give them a choice to create a new model or go back to editing the test.
        //
        // If they choose to create a new model, blank out the model fields in the test template.
        // If they choose to go back to editing the test, just jump to it.  Note that nothing is really lost
        // since the test is saved locally, they just don't end up publishing it to the server.
        //
        // Note that we need to use the () => functions in order for the callbacks to get access to 'this'
        this.checkModel('Source', 'sourcemodelid', interactive, answerdata, testData, elem, () => {
            this.checkModel('Test', 'testmodelid', interactive, answerdata, testData, elem, () => {
                this.checkModel('Answer', 'answermodelid', interactive, answerdata, testData, elem, () => {
                    this.askSaveDecision('A previous version of this test has already been published to the server.',
                        true, interactive, answerdata, testData, elem
                    );
                });
            });
        });
    }
    /**
     * Check to see if a model already exists on the server.  If it doesn't or there is some access problem
     * with the model, we want to skip to the final decision step, otherwise jump to the next step in the checking
     * process (first we look at the Source Model, then the Test Model and finally the Answer Model )
     * @param modelType Descriptive name of the type of model being checked
     * @param modelRef Reference fot the model entry to get
     * @param nextStep Method to call on success
     * @param interactive Interactive test template
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private checkModel(modelType: string, modelRef: string, interactive: IInteractiveTest, answerdata: ITestQuestionFields[], testData: sourceTestData, elem: JQuery<HTMLElement>,
        nextStep: (interactive: IInteractiveTest, answerdata: ITestQuestionFields[], testData: sourceTestData, elem: JQuery<HTMLElement>) => void
    ): void {
        // Figure out the ID for the type of model that we want to check
        const modelid = this.getModelId(testData, modelRef);
        const username = this.getConfigString('userid', 'anonymous')
        if (modelid !== undefined) {
            // Ok we have a model, let's see what the permissions are on it
            this.getRealtimePermissions(modelid)
                .then((permissions) => {
                    const myPermissions = permissions[username];
                    // This should never happen as you have to have permissions on the model to check it
                    if (myPermissions === undefined) {
                        this.askSaveDecision('Empty permissions for ' + modelType + ' model',
                            false, interactive, answerdata, testData, elem);
                    } else {
                        // We have a model and were able to get the permissions.  Make sure we can actually write to it.
                        if (myPermissions.read && myPermissions.write) {
                            // We can write, so go on to the next step.
                            nextStep(interactive, answerdata, testData, elem);
                        } else {
                            this.askSaveDecision('No access to ' + modelType + ' model',
                                false, interactive, answerdata, testData, elem);
                        }
                    }
                })
                .catch((e) => {
                    // Something went wrong getting the permissions
                    let msg = '';
                    // If it is there but we can't get access to it, we won't be able to overwrite it
                    if (e.code === 'unauthorized') {
                        msg = 'A ' + modelType + " model already exists for this test but you don't have permission to access it.";
                    }
                    // Of course if it is anything but "not found" we want to report the error.
                    else if (e.code !== 'model_not_found' && e !== 'no_model_exists_with_id') {
                        msg = 'An error accessing the ' + modelType + ' model occurred: ' + e;
                    }
                    // Either way, we are done testing, so prompt to user to figure out what we want to do.
                    this.askSaveDecision(msg, false, interactive, answerdata, testData, elem);
                });
        } else {
            // No model, so just prompt the user to write or not.
            this.askSaveDecision('', false, interactive, answerdata, testData, elem);
        }
    }
    /**
     * Prompt the user for what they want to do now that we know whether or not it would overwrite something
     * and that they actually have permissions for the documents on the server.  If they choose to overwrite,
     * proceeed to save normally, otherwise if they choose to save new, make sure that there are no residual
     * pointers to existing documents or in the case where they choose to do neither, just go back to editing
     * the test.
     * @param reason Message about the existing file to put on the dialog
     * @param canoverwrite All them to choose to overwrite
     * @param interactive Interactive test template
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private askSaveDecision(
        reason: string,
        canoverwrite: boolean,
        interactive: IInteractiveTest,
        answerdata: ITestQuestionFields[],
        testData: sourceTestData,
        elem: JQuery<HTMLElement>
    ): void {
        // We have to track whether they clicked on one of the buttons so that when the dialog comes down
        // if they didn't do anything we have the ability to go back to a different page.
        let actiontaken = false;
        $('#okpub')
            .off('click')
            .on('click', () => {
                actiontaken = true;
                $('#savechoicedlg').foundation('close');
                // Wipe out existence of any previous test model so that we generate a new one.
                delete (testData['TEST.0'] as ITest).answermodelid;
                delete (testData['TEST.0'] as ITest).testmodelid;
                delete (testData['TEST.0'] as ITest).sourcemodelid;
                this.SaveTestTemplate(interactive, answerdata, testData, elem);
            });
        $('#okover')
            .off('click')
            .on('click', () => {
                actiontaken = true;
                $('#savechoicedlg').foundation('close');
                // All is good, do we want to overwrite it
                this.SaveTestTemplate(interactive, answerdata, testData, elem);
            });
        // Handle when they just click cancel so we go back to the
        $(document).on('closed.zf.reveal', '#savechoicedlg[data-reveal]', () => {
            if (!actiontaken) {
                this.gotoEditTest(this.state.test);
            }
        });
        // Prepare the dialog for siaplay
        $('#okpub').removeAttr('disabled');
        // If we don't have the opportunity to overwrite, hide the button
        if (canoverwrite) {
            $('#okover')
                .removeAttr('disabled')
                .show();
        } else {
            $('#okover')
                .attr('disabled', 'disabled')
                .hide();
        }
        // Add any additional context messages we need for the dialog
        if (reason !== '') {
            $('#ovmsg')
                .empty()
                .append($('<div/>', { class: 'callout alert' }).text(reason));
        } else {
            $('#ovmsg').empty();
        }
        // Change the cancel button to say "Don't publis"
        $('#savechoicedlg a[data-close]').text("Don't Publish");
        // Show the dialog
        $('#savechoicedlg')
            .attr('data-close-on-click', 'false')
            .attr('data-close-on-esc', 'false')
            .foundation('open');
    }
    /**
     * Create the hidden dialog for selecting a cipher to open
     * @returns The DOM elements for a dialog to be shown later
     */
    private createSaveChoiceDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            class: 'callout primary',
        })
            .text('This will publish the test on the interactive server.')
            .append($('<div/>', { id: 'ovmsg' }));
        const SaveChoiceDlg = JTFDialog(
            'savechoicedlg',
            'Publish Test',
            dlgContents,
            'okover',
            'Overwrite Existing Test',
            'okpub',
            'Publish New Test'
        );
        return SaveChoiceDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     */
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result.append(this.createSaveChoiceDlg());
        return result;
    }
    /**
     * Save the test template to the server.  On success proceed to save the other documents.
     * @param interactive Interactive test template
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private SaveTestTemplate(
        interactive: IInteractiveTest,
        answerdata: ITestQuestionFields[],
        testData: sourceTestData,
        elem: JQuery<HTMLElement>
    ): void {
        // See if we are overwriting an existing model
        const testmodelid = this.getModelId(testData, 'testmodelid');
        this.saveRealtimeTestModel(interactive, testmodelid)
            .then((modelid) => {
                // The test template has been created, so remember where it is
                (testData['TEST.0'] as ITest).testmodelid = modelid;
                // We shouldn't have to set permissions since by default the creator gets them all, but
                // leave the code here just in case we need it
                // this.updateRealtimePermissions(modelid, "", { read: true, write: true, remove: true, manage: true })
                //     .catch((error) => this.reportFailure('Unable to set test model permissions: ' + error));

                // Next step, save the answer template
                this.saveAnswerTemplate(answerdata, testData, elem);
            }).catch((error) => {
                this.reportFailure('Unable to save test model: ' + error);
            });
    }
    /**
     * Save the answer template to the server.  On success proceed to save the test source
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private saveAnswerTemplate(
        answerdata: ITestQuestionFields[],
        testData: sourceTestData,
        elem: JQuery<HTMLElement>
    ): void {
        // Assume that the test can start never as this is only the answer template
        const starttime = 0;
        const data: IAnswerTemplate = {
            testid: this.getModelId(testData, 'testmodelid'),
            starttime: starttime,
            endtime: starttime + 50 * 60 * 1000,
            endtimed: starttime + 10 * 60 * 1000,
            assigned: [],
            answers: answerdata,
            teamname: '',
            teamtype: '',
        };

        // See if we are overwriting an existing model
        const answerModelID = this.getModelId(testData, 'answermodelid');
        this.saveRealtimeAnswerTemplate(data, answerModelID)
            .then((modelid) => {
                (testData['TEST.0'] as ITest).answermodelid = modelid;
                // We shouldn't have to set permissions since by default the creator gets them all, but
                // leave the code here just in case we need it
                // this.updateRealtimePermissions(modelid, "", { read: true, write: true, remove: true, manage: true })
                //     .catch((error) => this.reportFailure('Unable to set answer template permissions: ' + error));
                this.saveTestSource(testData, elem);
            }).catch((error) => {
                this.reportFailure('Unable to save answer template: ' + error);
            });
    }
    /**
     * Save the test source to the server.  On success proceed to finalize the save and give them a link to the generated test.
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private saveTestSource(
        testData: sourceTestData,
        elem: JQuery<HTMLElement>
    ): void {
        const data = {
            testid: this.getModelId(testData, 'testmodelid'),
            answerid: this.getModelId(testData, 'answermodelid'),
            source: testData,
            creator: this.getConfigString('userid', 'anonymous'),
        };

        // See if we are overwriting an existing model
        const sourcemodelid = this.getModelId(testData, 'sourcemodelid');
        this.saveRealtimeSource(data, sourcemodelid)
            .then((modelid) => {
                (testData['TEST.0'] as ITest).sourcemodelid = modelid;
                // We shouldn't have to set permissions since by default the creator gets them all, but
                // leave the code here just in case we need it
                // this.updateRealtimePermissions(modelid, "", { read: true, write: true, remove: true, manage: true })
                //     .catch((error) => this.reportFailure('Unable to set source model permissions: ' + error));
                this.finalizeSave(testData, elem);
            }).catch((error) => {
                this.reportFailure('Unable to save test source: ' + error);
            });
    }
    /**
     * Save the final data.  Update the local copy to remember where the test was stored.
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private finalizeSave(testData: sourceTestData, elem: JQuery<HTMLElement>): void {
        // Now that we have all the information about where it is stored on the server,
        // write it back to the local test entry
        const testentry = this.getTestEntry(this.state.test);
        testentry.answermodelid = this.getModelId(testData, 'answermodelid');
        testentry.testmodelid = this.getModelId(testData, 'testmodelid');
        testentry.sourcemodelid = this.getModelId(testData, 'sourcemodelid');
        this.setTestEntry(this.state.test, testentry);
        const callout = $('<div/>', {
            class: 'callout success',
        }).append(
            $('<a/>', {
                href: 'TestSchedule.html?testID=' + testentry.sourcemodelid,
                class: 'button large rounded',
            }).text('Schedule Test')
        );
        elem.append(callout);
    }
}
