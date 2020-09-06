import { cloneObject, cloneObjectClean } from '../common/ciphercommon';
import { ITestType, menuMode, toolMode, CipherHandler, IState, IInteractiveTest, ITestQuestionFields, ITestTimeInfo } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState, IAnswerTemplate } from './ciphertest';
import { ConvergenceDomain, RealTimeModel, RealTimeObject, ModelPermissions, ModelService, IAutoCreateModelOptions } from "@convergence/convergence";
import { CipherInteractiveFactory, CipherPrintFactory } from './cipherfactory';
import { TrueTime } from '../common/truetime';
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
            $("#testemenu").hide();
            $(".instructions").removeClass("instructions");
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
        return $("<div/>", { id: "testemenu" }).append(this.genTestEditState('testint'));
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

    // if (test.hasOwnProperty("answermodelid") && test.answermodelid !== undefined) {
    //     result["answermodelid"] = test.answermodelid;
    // }
    // if (test.hasOwnProperty("sourcemodelid") && test.sourcemodelid !== undefined) {
    //     result["sourcemodelid"] = test.sourcemodelid;
    // }
    // if (test.hasOwnProperty("testmodelid") && test.testmodelid !== undefined) {
    //     result["testmodelid"] = test.testmodelid;
    // }


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
        let testData = this.generateTestData(test);
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
            let answertemplate = cipherhandler.getInteractiveTemplate();
            answertemplate.solvetime = 0;
            answerdata.push(answertemplate);
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
        this.saveModels(elem, interactive, answerdata, testData);
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
     * Returns the value for a given field id associated with a test entry.
     * Note that because it is stored two levels down, we have this service routine
     * safely get the data (if it actually exists)
     * @param testData Test Data source
     * @param field Model field to look for
     */
    private getModelId(testData: any, field: string): string {
        let result: string = undefined;
        if (testData.hasOwnProperty("TEST.0") &&
            testData["TEST.0"].hasOwnProperty(field)) {
            result = testData["TEST.0"][field];
        }
        return result;
    }
    /**
     * 
     * @param collection 
     * @param owner 
     */
    public makeAutoCreateModelOptions(collection: string, owner: string): IAutoCreateModelOptions {
        let result: IAutoCreateModelOptions = {
            collection: collection,
            overrideCollectionWorldPermissions: true,
            worldPermissions: ModelPermissions.fromJSON({ read: false, write: false, remove: false, manage: false }),
            userPermissions: {}
        }
        result.userPermissions[owner] = ModelPermissions.fromJSON({ read: true, write: true, remove: true, manage: true });
        return result;
    }
    /**
     * Save the current test model to the server
     * @param elem DOM location to put any output
     * @param interactive Interactive test data
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     */
    public saveModels(elem: JQuery<HTMLElement>, interactive: IInteractiveTest, answerdata: ITestQuestionFields[], testData: any) {
        this.connectRealtime().then((domain: ConvergenceDomain) => {
            // We successfully opened the connection to the server.  
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
            // this.checkSourceTemplate(domain.models(), interactive, answerdata, testData, elem);
            let modelService = domain.models();
            this.checkModel("Source", "sourcemodelid", modelService, interactive, answerdata, testData, elem, () => {
                this.checkModel("Test", "testmodelid", modelService, interactive, answerdata, testData, elem, () => {
                    this.checkModel("Answer", "answermodelid", modelService, interactive, answerdata, testData, elem, () => {
                        this.askSaveDecision(modelService, "A previous version of this test has already been published to the server.", true, interactive, answerdata, testData, elem);
                    });
                });
            });
        });
    }
    /**
     * Check to see if a model already exists on the server.  If it doesn't or there is some access problem
     * with the model, we want to skip to the final decision step, otherwise jump to the next step in the checking
     * process (firest we look at the Source Model, then the Test Model and finally the Answer Model )
     * @param modelType Descriptive name of the type of model being checked
     * @param modelRef Reference fot the model entry to get
     * @param nextStep Method to call on success
     * @param modelService Convergence model service class.
     * @param interactive Interactive test template
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private checkModel(
        modelType: string,
        modelRef: string,
        modelService: ModelService,
        interactive: IInteractiveTest,
        answerdata: ITestQuestionFields[],
        testData: any,
        elem: JQuery<HTMLElement>,
        nextStep: (modelService: ModelService, interactive: IInteractiveTest, answerdata: ITestQuestionFields[], testData: any, elem: JQuery<HTMLElement>) => void
    ) {
        // Figure out the ID for the type of model that we want to check
        let modelid = this.getModelId(testData, modelRef);
        if (modelid !== undefined) {
            // For some reason the ModelService loses "this" in the process so we need to make a copy of "this" as the context when we get called back
            // Ok we have a model, let's see what the permissions are on it
            // modelService.permissions(modelid).getPermissions()
            //    .then((myPermissions: ModelPermissions) => {
            modelService.permissions(modelid).getAllUserPermissions()
                .then(permissions => {
                    let myPermissions = permissions.get(modelService.session().user().username);
                    // This should never happen, but an earlier version of the API failed to return the permissions, so we leave it in for now
                    if (myPermissions === undefined) {
                        this.askSaveDecision(modelService, "Empty permissions for " + modelType + " model", false, interactive, answerdata, testData, elem);
                    } else {
                        // We have a model and were able to get the permissions.  Make sure we can actually write to it.
                        if (myPermissions.read && myPermissions.write) {
                            // We can write, so go on to the next step. 
                            nextStep(modelService, interactive, answerdata, testData, elem);
                        }
                        else {
                            this.askSaveDecision(modelService, "No access to " + modelType + " model", false, interactive, answerdata, testData, elem);
                        }
                    }
                })
                .catch(e => {
                    // Something went wrong getting the permissions
                    let msg = "";
                    // If it is there but we can't get access to it, we won't be able to overwrite it
                    if (e.code === "unauthorized") {
                        msg = "A " + modelType + " model already exists for this test but you don't have permission to access it.";
                    }
                    // Of course if it is anything but "not found" we want to report the error.
                    else if (e.code !== "model_not_found") {
                        msg = "An error accessing the " + modelType + " model occurred: " + e;
                    }
                    // Either way, we are done testing, so prompt to user to figure out what we want to do.
                    this.askSaveDecision(modelService, msg, false, interactive, answerdata, testData, elem);
                });
        }
        else {
            // No model, so just prompt the user to write or not.
            this.askSaveDecision(modelService, "", false, interactive, answerdata, testData, elem);
        }
    }
    /**
     * Prompt the user for what they want to do now that we know whether or not it would overwrite something
     * and that they actually have permissions for the documents on the server.  If they choose to overwrite,
     * proceeed to save normally, otherwise if they choose to save new, make sure that there are no residual
     * pointers to existing documents or in the case where they choose to do neither, just go back to editing
     * the test.
     * @param modelService Convergence model service class.
     * @param reason Message about the existing file to put on the dialog
     * @param canoverwrite All them to choose to overwrite
     * @param interactive Interactive test template
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private askSaveDecision(modelService: ModelService, reason: string, canoverwrite: boolean, interactive: IInteractiveTest, answerdata: ITestQuestionFields[], testData: any, elem: JQuery<HTMLElement>) {
        // We have to track whether they clicked on one of the buttons so that when the dialog comes down
        // if they didn't do anything we have the ability to go back to a different page.
        let actiontaken = false;
        $("#okpub")
            .off("click")
            .on("click", () => {
                actiontaken = true;
                $("#savechoicedlg").foundation("close");
                // Wipe out existence of any previous test model so that we generate a new one.
                delete testData["TEST.0"].answermodelid;
                delete testData["TEST.0"].testmodelid;
                delete testData["TEST.0"].sourcemodelid;
                this.SaveTestTemplate(modelService, interactive, answerdata, testData, elem);
            });
        $("#okover")
            .off("click")
            .on("click", () => {
                actiontaken = true;
                $("#savechoicedlg").foundation("close");
                // All is good, do we want to overwrite it
                this.SaveTestTemplate(modelService, interactive, answerdata, testData, elem);
            });
        // Handle when they just click cancel so we go back to the 
        $(document).on('closed.zf.reveal', '#savechoicedlg[data-reveal]', () => {
            if (!actiontaken) {
                this.gotoEditTest(this.state.test);
            }
        });
        // Prepare the dialog for siaplay
        $("#okpub").removeAttr("disabled");
        // If we don't have the opportunity to overwrite, hide the button
        if (canoverwrite) {
            $("#okover").removeAttr("disabled").show();
        } else {
            $("#okover").attr("disabled", "disabled").hide();
        }
        // Add any additional context messages we need for the dialog
        if (reason !== "") {
            $("#ovmsg").replaceWith($("<div/>", { class: "callout alert" }).text(reason));
        } else {
            $("#ovmsg").empty();
        }
        // Change the cancel button to say "Don't publis"
        $("#savechoicedlg a[data-close]").text("Don't Publish");
        // Show the dialog
        $("#savechoicedlg").attr("data-close-on-click", "false")
            .attr("data-close-on-esc", "false")
            .foundation("open");
    }
    /**
     * Create the hidden dialog for selecting a cipher to open
     * @returns The DOM elements for a dialog to be shown later
     */
    private createSaveChoiceDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout primary",
        }).text(
            "This will publish the test on the interactive server."
        ).append($("<div/>", { id: "ovmsg" }));
        let SaveChoiceDlg = JTFDialog(
            "savechoicedlg",
            "Publish Test",
            dlgContents,
            "okover",
            "Overwrite Existing Test",
            "okpub",
            "Publish New Test",
        );
        return SaveChoiceDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     */
    public createMainMenu(): JQuery<HTMLElement> {
        let result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result.append(this.createSaveChoiceDlg());
        return result;
    }
    /**
     * Save the test template to the server.  On success proceed to save the other documents.
     * @param modelService Convergence model service class.
     * @param interactive Interactive test template
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private SaveTestTemplate(modelService: ModelService, interactive: IInteractiveTest, answerdata: ITestQuestionFields[], testData: any, elem: JQuery<HTMLElement>) {
        // See if we have to update the data for the model
        let isOldModel = true;
        let testModelOptions = this.makeAutoCreateModelOptions("codebusters_tests", testData.creator);
        testModelOptions.data = () => { isOldModel = false; return interactive; }

        // See if we are overwriting an existing model
        let testmodelid = this.getModelId(testData, 'testmodelid');
        if (testmodelid !== undefined) {
            testModelOptions.id = testmodelid;
        }
        modelService.openAutoCreate(testModelOptions).then((testmodel: RealTimeModel) => {
            // The test template has been created, so remember where it is and close the model.
            testData["TEST.0"].testmodelid = testmodel.modelId();
            // If we are replacing an existing model, we have to update the data since it doesn't
            // get pulled in from the autocreate
            if (isOldModel) {
                testmodel.root().value(interactive);
            }
            testmodel.close();
            // Next step, save the answer template
            this.saveAnswerTemplate(modelService, answerdata, testData, elem);
        }).catch((error) => {
            this.postErrorMessage(elem, "Convergence API could not write test model: " + error);
        });
    }
    /**
     * Save the answer template to the server.  On success proceed to save the test source
     * @param modelService Model service on the domain to store the model
     * @param answerdata Interactive test answer data
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private saveAnswerTemplate(modelService: ModelService, answerdata: ITestQuestionFields[], testData: any, elem: JQuery<HTMLElement>) {
        // Assume that the test can start in 30 seconds by default.  However in reality, this is the
        // answer template so it has to be copied with a new time set, so this really only gets used for testing.
        let starttime = Date.now() + 30 * 1000;
        let data: IAnswerTemplate = {
            testid: this.getModelId(testData, 'testmodelid'),
            starttime: starttime,
            endtime: starttime + (50 * 60 * 1000),
            endtimed: starttime + (10 * 60 * 1000),
            assigned: [],
            answers: answerdata
        };
        // See if we have to update the data for the model
        let isOldModel = true;
        let answerModelOptions = this.makeAutoCreateModelOptions("codebusters_answers", testData.creator)
        answerModelOptions.data = () => { isOldModel = false; return data; }

        // See if we are overwriting an existing model
        let answermodelid = this.getModelId(testData, 'answermodelid');
        if (answermodelid !== undefined) {
            answerModelOptions.id = answermodelid;
        }
        modelService.openAutoCreate(answerModelOptions).then((datamodel: RealTimeModel) => {
            testData["TEST.0"].answermodelid = datamodel.modelId();
            // If we are replacing an existing model, we have to update the data since it doesn't
            // get pulled in from the autocreate
            if (isOldModel) {
                datamodel.root().value(data);
            }
            datamodel.close();
            this.saveTestSource(modelService, testData, elem);
        }).catch((error: string) => {
            this.postErrorMessage(elem, "Convergence API could not write answer model: " + error);
        });
    }
    /**
     * Save the test source to the server.  On success proceed to finalize the save and give them a link to the generated test.
     * @param modelService Model service on the domain to store the model
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private saveTestSource(modelService: ModelService, testData: any, elem: JQuery<HTMLElement>) {
        let data = {
            testid: this.getModelId(testData, 'testmodelid'),
            answerid: this.getModelId(testData, 'answermodelid'),
            source: testData,
            creator: this.getConfigString('userid', 'anonymous')
        };
        // See if we have to update the data for the model
        let isOldModel = true;
        let sourceModelOptions = this.makeAutoCreateModelOptions("codebusters_source", testData.creator);
        sourceModelOptions.data = () => { isOldModel = false; return data; }

        // See if we are overwriting an existing model
        let sourcemodelid = this.getModelId(testData, 'sourcemodelid');
        if (sourcemodelid !== undefined) {
            sourceModelOptions.id = sourcemodelid;
        }
        modelService.openAutoCreate(sourceModelOptions).then((sourcemodel: RealTimeModel) => {
            testData["TEST.0"].sourcemodelid = sourcemodel.modelId();
            // If we are replacing an existing model, we have to update the data since it doesn't
            // get pulled in from the autocreate
            if (isOldModel) {
                sourcemodel.root().value(data);
            }
            sourcemodel.close();
            // Now that we have the 
            this.finalizeSave(testData, elem);
        }).catch((error: string) => {
            this.postErrorMessage(elem, "Convergence API could not write test source: " + error);
        });
    }
    /**
     * Save the final data.  Update the local copy to remember where the test was stored.
     * @param testData Test data source
     * @param elem DOM location to put any output
     */
    private finalizeSave(testData: any, elem: JQuery<HTMLElement>) {
        // Now that we have all the information about where it is stored on the server,
        // write it back to the local test entry
        let testentry = this.getTestEntry(this.state.test);
        testentry.answermodelid = this.getModelId(testData, 'answermodelid');
        testentry.testmodelid = this.getModelId(testData, 'testmodelid');
        testentry.sourcemodelid = this.getModelId(testData, 'sourcemodelid');
        this.setTestEntry(this.state.test, testentry)
        let callout = $('<div/>', {
            class: 'callout success',
        }).append($("<a/>", { href: "TestInteractive.html?testID=" + testentry.answermodelid, target: "_blank", class: "button large" }).text("Open Interactive test"));
        elem.append(callout);
    }
    /**
     * 
     * @param elem 
     * @param testUID 
     */
    public displayInteractiveTest(elem: JQuery<HTMLElement>, testUID: string) {
        this.connectRealtime()
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
     * @param datamodel 
     */
    public deferredInteractiveTest(elem: JQuery<HTMLElement>, testmodel: RealTimeModel, datamodel: RealTimeModel) {
        let interactive = testmodel.root().value();
        // For now we will pretend that the test starts when they open it.  This information really
        // needs to come from the datamodel
        this.testTimeInfo.startTime = this.testTimeInfo.truetime.UTCNow();
        this.testTimeInfo.endTimedQuestion = this.testTimeInfo.startTime + (60 * 10);
        this.testTimeInfo.endTime = this.testTimeInfo.startTime + (60 * 50);

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
