import { cloneObject } from '../common/ciphercommon';
import { IState, ITestType, menuMode, toolMode, IInteractiveTest, ITestQuestionFields } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState } from './ciphertest';
import { JTRadioButton } from '../common/jtradiobutton';
import { CipherTestManage } from './ciphertestmanage';
import Convergence = require('@convergence/convergence');
import { ConvergenceDomain } from '@convergence/convergence';
import { data } from 'jquery';
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
        // { title: 'New Test', color: 'primary', id: 'newtest' },
        // {
        //     title: 'Export Tests',
        //     color: 'primary',
        //     id: 'export',
        //     download: true,
        // },
        // { title: 'Import Tests from File', color: 'primary', id: 'import' },
        // { title: 'Import Tests from URL', color: 'primary', id: 'importurl' },
    ];
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        this.setUIDefaults();
        this.updateOutput();
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        $('.testlist').each((i, elem) => {
            $(elem).replaceWith(this.genTestList());
        });
        this.attachHandlers();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestManageState('published');
    }
    /**
     * 
     */
    public genTestList(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'testlist' });
        let table = new JTTable({ class: 'cell shrink testlist publist' });
        let row = table.addHeaderRow();
        row.add('Action')
            .add('Title')
            .add('Questions')
            .add('Scheduled');
        result.append(table.generate());

        Convergence.connectAnonymously(this.getInteractiveURI())
            .then((domain: ConvergenceDomain) => {
                this.QueryModels(domain);
            }).catch((error) => {
                console.log("Convergence API could not connect: " + error);
            });
        return result;
    }
    /**
     * 
     * @param domain 
     */
    private QueryModels(domain: ConvergenceDomain) {
        const modelService = domain.models();
        console.log("Starting query");
        modelService.query("SELECT * FROM codebusters_source")
            .then(results => {
                // console.log("Query complete:");
                // console.log(results);
                results.data.forEach(result => {
                    // console.log(result);
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
            });
    }
    /**
     * 
     * @param modelid 
     * @param title 
     * @param version 
     * @param created 
     * @param modified 
     * @param testmodelid 
     * @param answermodelid 
     * @param questions 
     */
    public addPublishedEntry(modelService: Convergence.ModelService, modelid: string, title: string, version: number, created: Date, modified: Date, testmodelid: string, answermodelid: string, questions: number) {
        let tr = $("<tr/>", { 'data-entry': modelid });
        let buttons = $('<div/>', { class: 'button-group round shrink' });
        buttons.append(
            $('<a/>', {
                'data-entry': modelid,
                type: 'button',
                class: 'pubedit button',
            }).text('Edit')
        );
        buttons.append(
            $('<a/>', {
                'data-entry': modelid,
                type: 'button',
                class: 'pubdel alert button',
            }).text('Delete')
        );
        buttons.append(
            $('<a/>', {
                'data-entry': modelid,
                type: 'button',
                class: 'pubpermit button',
            }).text('Permissions')
        );
        buttons.append(
            $('<a/>', {
                'data-entry': modelid,
                type: 'button',
                class: 'pubsched button',
            }).text('Schedule Test')
        );
        buttons.append(
            $('<a/>', {
                'data-entry': modelid,
                type: 'button',
                class: 'pubresults button',
            }).text('View Results')
        );
        tr.append($("<td/>").append($('<div/>', { class: 'grid-x' }).append(buttons)))
            .append($("<td/>").text(title))
            .append($("<td/>").text(String(questions)))
            .append($("<td/>").append($('<div/>', { class: 'sched', 'data-entry': testmodelid }).text("Calculating...")));


        var curtr = $('tr[data-entry="' + modelid + '"]');
        if (curtr.length > 0) {
            curtr.replaceWith(tr);
        } else {
            $(".publist").append(tr);
        }
        // Kick off a request to figure out 
        this.calculateScheduledTests(modelService, testmodelid, answermodelid);
    }
    /**
     * 
     * @param modelService 
     * @param modelid 
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
                console.log("Result for "+testmodelid+" is '"+fieldtext+"'");
                // Now we just need to replace the value
                $('div.sched[data-entry="' + testmodelid + '"]').text(fieldtext);
            });

    }
    /**
     * 
     * @param test published ID of test
     */
    public downloadPublishedTest(test: string): void {
        //this.deleteTestEntry(test);
        this.updateOutput();
    }

    /**
     * This prompts a user and then deletes all ciphers
     */
    public gotoDeleteAllCiphers(): void {
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
     * @param test 
     */
    public deleteTestFromServer(test: string) {
        // First we need to get the test which will have the id of the test template and answer template
        // Then we need to search for all answer templates which refer to the test template
        // With that list in mind, we need to go through and delete each of them
        // by calling modelService.remove()
    }
    /**
     * 
     * @param test published ID of test
     */
    public deletePublishedTest(test: string): void {
        $("#okdel")
            .off("click")
            .on("click", e => {
                this.deleteTestFromServer(test);
                $("#delpubdlg").foundation("close");
                this.updateOutput();
            });
        $("#okdel").removeAttr("disabled");
        $("#delpubdlg").foundation("open");
    }
    /**
     * 
     * @param test published ID of test
     */
    public changePublishedTestPermissions(test: string): void {
        location.assign('TestPermissions.html?test=' + test);
    }
    /**
     * 
     * @param test published ID of test
     */
    public gotoPublishedSchedule(test: string): void {
        location.assign('TestSchedule.html?test=' + test);
    }
    /**
     * 
     * @param test published ID of test
     */
    public gotoPublishedResults(test: string): void {
        //this.deleteTestEntry(test);
        this.updateOutput();
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $('.pubedit')
            .off('click')
            .on('click', e => {
                this.downloadPublishedTest($(e.target).attr('data-entry'));
            });
        $('.pubdel')
            .off('click')
            .on('click', e => {
                this.deletePublishedTest($(e.target).attr('data-entry'));
            });
        $('.pubpermit')
            .off('click')
            .on('click', e => {
                this.changePublishedTestPermissions($(e.target).attr('data-entry'));
            });
        $('.pubsched')
            .off('click')
            .on('click', e => {
                this.gotoPublishedSchedule($(e.target).attr('data-entry'));
            });
        $('.pubresults')
            .off('click')
            .on('click', e => {
                this.gotoPublishedResults($(e.target).attr('data-entry')
                );
            });
    }
}
