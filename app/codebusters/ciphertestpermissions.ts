import { CipherTestManage } from "./ciphertestmanage";
import { toolMode, IState, menuMode } from "../common/cipherhandler";
import { ITestState } from './ciphertest';
import { ICipherType } from "../common/ciphertypes";
import { cloneObject } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTTable } from "../common/jttable";
import { ConvergenceDomain, RealTimeModel } from "@convergence/convergence";
import { Convergence } from '@convergence/convergence';

/**
 * CipherTestPublished
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Permissions> <Schedule> <View Results> Test Title  #questions #Scheduled
 *  The command buttons availableare
 */
export class CipherTestPermissions extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Add Permission', color: 'primary', id: 'addperm' },
        { title: 'Save', color: 'primary', id: 'saveperm' },
        { title: 'Reset', color: 'primary', id: 'resetperm' },
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
        return this.genPublishedEditState('permissions');
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'testlist' });
        let table = new JTTable({ class: 'cell shrink testlist publist' });
        let row = table.addHeaderRow();
        row.add('Action')
            .add('Userid')
            .add('Read')
            .add('Write')
            .add('Remove')
            .add('Manage');
        result.append(table.generate());

        this.connectRealtime()
            .then((domain: ConvergenceDomain) => {
                this.findPermissions(domain, this.state.testID);
            });
        return result;
    }
    /**
     * Find all the test sources on the server
     * @param domain Convergence Domain to query against
     */
    private findPermissions(domain: ConvergenceDomain, testid: string) {
        // const modelService = domain.models();
        // modelService.permissions(testid)            .then((datamodel: RealTimeModel) => {
        //         let data = datamodel.root().value();
        //         this.processTestXML(data.source);
        //     })
        //     .catch(error => { this.reportFailure("Convergence API could not open model " + testid + " Error:" + error) });
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
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
    }
}
