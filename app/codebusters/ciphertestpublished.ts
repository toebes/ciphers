import { cloneObject } from '../common/ciphercommon';
import { IState, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { ITestState } from './ciphertest';
import { CipherTestManage } from './ciphertestmanage';
import { Convergence } from '@convergence/convergence';
import { ConvergenceDomain, RealTimeModel } from '@convergence/convergence';
import { JTFDialog } from '../common/jtfdialog';

/**
 * CipherTestPublished
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Permissions> <Schedule> <View Results> Test Title  #questions #Scheduled
 *  The command buttons availableare
 */
export class CipherTestPublished extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
    ];
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput: boolean = false): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestManageState('published');
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'testlist' });
        let table = new JTTable({ class: 'cell shrink publist' });
        let row = table.addHeaderRow();
        row.add('Action')
            .add('Title')
            .add('Questions')
            .add('Scheduled');
        result.append(table.generate());

        this.cacheConnectRealtime()
            .then((domain: ConvergenceDomain) => {
                this.findAllTests(domain);
            });
        return result;
    }
    /**
     * Find all the test sources on the server
     * @param domain Convergence Domain to query against
     */
    private findAllTests(domain: ConvergenceDomain) {
        const modelService = domain.models();
        modelService.query("SELECT * FROM codebusters_source")
            .then(results => {
                results.data.forEach(result => {
                    let questions = result.data.source['TEST.0'].count;
                    if (result.data.source['TEST.0'].timed !== -1) {
                        questions++;
                    }
                    this.addPublishedEntry(modelService,
                        result.modelId,
                        result.data.source['TEST.0'].title,
                        result.version,
                        result.created,
                        result.modified,
                        result.data.source['TEST.0'].testmodelid,
                        result.data.source['TEST.0'].answermodelid,
                        questions);
                });
                this.attachHandlers();
            })
            .catch(error => { this.reportFailure("Convergence API could not query: " + error) }
            );
    }
    /**
     * Add/replace a test entry to the table of all tests along with the buttons to interact with the test.
     * @param sourcemodelid 
     * @param title 
     * @param version 
     * @param created 
     * @param modified 
     * @param testmodelid 
     * @param answermodelid 
     * @param questions 
     */
    public addPublishedEntry(modelService: Convergence.ModelService, sourcemodelid: string, title: string, version: number, created: Date, modified: Date, testmodelid: string, answermodelid: string, questions: number) {
        let tr = $("<tr/>", { 'data-source': sourcemodelid, 'data-test': testmodelid, 'data-answer': answermodelid });
        let buttons = $('<div/>', { class: 'button-group round shrink' });
        buttons.append(
            $('<a/>', {
                'data-source': sourcemodelid,
                type: 'button',
                class: 'pubedit button',
            }).text('Edit')
        );
        buttons.append(
            $('<a/>', {
                'data-source': sourcemodelid,
                type: 'button',
                class: 'pubdel alert button',
            }).text('Delete')
        );
        buttons.append(
            $('<a/>', {
                'data-source': sourcemodelid,
                type: 'button',
                class: 'pubpermit button',
            }).text('Permissions')
        );
        buttons.append(
            $('<a/>', {
                'data-source': sourcemodelid,
                type: 'button',
                class: 'pubsched button',
            }).text('Schedule Test')
        );
        buttons.append(
            $('<a/>', {
                'data-source': sourcemodelid,
                type: 'button',
                class: 'pubresults button',
            }).text('View Results')
        );
        tr.append($("<td/>").append($('<div/>', { class: 'grid-x' }).append(buttons)))
            .append($("<td/>").text(title))
            .append($("<td/>").text(String(questions)))
            .append($("<td/>").append($('<div/>', { class: 'sched', 'data-source': testmodelid }).text("Calculating...")));


        var curtr = $('tr[data-source="' + sourcemodelid + '"]');
        if (curtr.length > 0) {
            curtr.replaceWith(tr);
        } else {
            $(".publist").append(tr);
        }
        // Kick off a request to figure out 
        this.calculateScheduledTests(modelService, testmodelid, answermodelid);
    }
    /**
     * Determine how many tests are scheduled for a given test template and update the div holding that number.
     * @param modelService 
     * @param sourcemodelid 
     */
    public calculateScheduledTests(modelService: Convergence.ModelService, testmodelid: string, answermodelid: string) {
        modelService.query("SELECT * FROM codebusters_answers where testid='" + testmodelid + "'")
            .then(results => {
                let total = 0;
                let templatecount = 0;
                results.data.forEach(result => {
                    if (result.modelId === answermodelid) {
                        templatecount++;
                    } else {
                        total++;
                    }
                });
                let fieldtext = "None Found";
                if (total === 0) {
                    if (templatecount === 1) {
                        fieldtext = "None Scheduled";
                    }
                } else {
                    fieldtext = String(total);
                    if (templatecount === 0) {
                        fieldtext += " [Missing Template]";
                    }
                }
                console.log("Result for " + testmodelid + " is '" + fieldtext + "'");
                // Now we just need to replace the value
                $('div.sched[data-source="' + testmodelid + '"]').text(fieldtext);
            })
            .catch(error => { this.reportFailure("Convergence API could not connect: " + error) });
    }
    /**
     * Download the source from a published test and edit it locally.
     * @param sourcemodelid published ID of test
     */
    public downloadPublishedTest(sourcemodelid: string): void {
        this.cacheConnectRealtime()
            .then((domain: ConvergenceDomain) => {
                this.doDownloadPublishedTest(domain.models(), sourcemodelid);
            });
    }
    /**
     * 
     * @param domain Convergence domain to load file from
     * @param sourcemodelid File to be opened
     */
    private doDownloadPublishedTest(modelService: Convergence.ModelService, sourcemodelid: string) {
        modelService.open(sourcemodelid)
            .then((datamodel: RealTimeModel) => {
                let data = datamodel.root().value();
                datamodel.close();
                this.processTestXML(data.source);
            })
            .catch(error => { this.reportFailure("Convergence API could not open model " + sourcemodelid + " Error:" + error) });
    }
    /**
     * Create the hidden dialog for selecting a cipher to open
     */
    private createDeletePublishedDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout alert",
        }).text(
            "This will delete the published test from the server! " +
            "This operation can not be undone. " +
            "Please make sure you have saved a copy in case you need it. " +
            "  Are you sure you want to do this?"
        );
        let DeletePublishedDlg = JTFDialog(
            "delpubdlg",
            "Delete Published Test",
            dlgContents,
            "okdel",
            "Yes, Delete it!"
        );
        return DeletePublishedDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     */
    public createMainMenu(): JQuery<HTMLElement> {
        let result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result.append(this.createDeletePublishedDlg());
        return result;
    }
    /**
     * Remove a test from the server along with all the scheduled tests that are associated with it
     * @param sourcemodelid 
     * @param testmodelid 
     * @param answermodelid 
     */
    public deleteTestFromServer(sourcemodelid: string, testmodelid: string) {
        // by calling modelService.remove()
        this.cacheConnectRealtime()
            .then((domain: ConvergenceDomain) => {
                this.doDeleteTestFromServer(domain, sourcemodelid, testmodelid);
            });
    }
    /**
     * Perform the real work of deleting the models from the server.  
     * Search for all answer templates which refer to the test template and then delete the source and test templates
     * 
     * @param domain 
     * @param sourcemodelid 
     * @param testmodelid 
     * @param answermodelid 
     */
    public doDeleteTestFromServer(domain: ConvergenceDomain, sourcemodelid: string, testmodelid: string) {
        const modelService = domain.models();
        // Our query should get all of the answer templates which reference the test
        modelService.query("SELECT * FROM codebusters_answers where testid='" + testmodelid + "'")
            .then(results => {
                results.data.forEach(result => {
                    modelService.remove(result.modelId).catch(error => { this.reportFailure("Unable to remove " + result.modelId + " Error code:" + error); });
                });
                // Now that the answer templates are gone, remove the test template 
                modelService.remove(testmodelid).catch(error => { this.reportFailure("Unable to remove " + testmodelid + " Error code:" + error); });
                //  and the test source
                modelService.remove(sourcemodelid).catch(error => { this.reportFailure("Unable to remove " + sourcemodelid + " Error code:" + error); });
                // And update the table to remove the entry
                $('tr[data-source="' + sourcemodelid + '"]').remove();
            })
            .catch(error => { this.reportFailure("Convergence API could not connect: " + error) });;
    }
    /**
     * See if the user wants to actually delete a test (after warnign them) and if so, request the deletion.
     * @param sourcemodelid published ID of test
     */
    public deletePublishedTest(sourcemodelid: string): void {
        // First we need to get the testmodel and the answer model because we want to delete them too
        let tr = $('tr[data-source="' + sourcemodelid + '"]');
        let testmodelid = tr.attr('data-test');
        if (testmodelid == "") {
            alert("Unable to identify the test templates");
        } else {
            $("#okdel")
                .off("click")
                .on("click", () => {
                    this.deleteTestFromServer(sourcemodelid, testmodelid);
                    $("#delpubdlg").foundation("close");
                    tr.remove();
                });
            $("#okdel").removeAttr("disabled");
            $("#delpubdlg").foundation("open");
        }
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.pubedit')
            .off('click')
            .on('click', e => {
                this.downloadPublishedTest($(e.target).attr('data-source'));
            });
        $('.pubdel')
            .off('click')
            .on('click', e => {
                this.deletePublishedTest($(e.target).attr('data-source'));
            });
        $('.pubpermit')
            .off('click')
            .on('click', e => {
                this.gotoPublishedTestPermissions($(e.target).attr('data-source'));
            });
        $('.pubsched')
            .off('click')
            .on('click', e => {
                this.gotoPublishedSchedule($(e.target).attr('data-source'));
            });
        $('.pubresults')
            .off('click')
            .on('click', e => {
                this.gotoPublishedResults($(e.target).attr('data-source')
                );
            });
    }
}
