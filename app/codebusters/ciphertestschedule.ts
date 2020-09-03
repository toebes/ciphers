import { CipherTestManage } from "./ciphertestmanage";
import { toolMode, IState, menuMode } from "../common/cipherhandler";
import { ITestState, IAnswerTemplate } from './ciphertest';
import { ICipherType } from "../common/ciphertypes";
import { cloneObject } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTTable } from "../common/jttable";
import { ConvergenceDomain, RealTimeModel } from "@convergence/convergence";

/**
 * CipherTestPublished
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Permissions> <Schedule> <View Results> Test Title  #questions #Scheduled
 *  The command buttons availableare
 */
export class CipherTestSchedule extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;
    public answerTemplate: IAnswerTemplate = undefined;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Add One', color: 'primary', id: 'addsched' },
        { title: 'Propagate Time', color: 'primary', id: 'propsched' },
        { title: 'Import Schedule', color: 'primary', id: 'importsched' },
        { title: 'Save All', color: 'primary', id: 'savesched' },
        { title: 'Delete All', color: 'alert', id: 'delallsched' },
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
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genPublishedEditState('schedule');
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'testlist' });

        // First we need to get the test template from the testsource
        // Once we have the test template, then we will be able to find all the scheduled tests
        this.connectRealtime()
            .then((domain: ConvergenceDomain) => { this.openTestSource(domain, this.state.testID); });
        return result;
    }
    /**
     * 
     * @param domain Convergence Domain to query against
     * @param sourcemodelid Source test to open
     */
    private openTestSource(domain: ConvergenceDomain, sourcemodelid: string) {
        const modelService = domain.models();
        modelService.open(sourcemodelid)
            .then(realtimeModel => {
                let testmodelid = realtimeModel.root().elementAt("testid").value();
                let answermodelid = realtimeModel.root().elementAt("answerid").value();
                realtimeModel.close();
                this.findScheduledTests(modelService, testmodelid, answermodelid);
            })
            .catch(error => { this.reportFailure("Could not open model for " + sourcemodelid + " Error:" + error) });

    }
    /**
     * Find all the tests scheduled for a given test template
     * @param modelService 
     * @param sourcemodelid 
     */
    public findScheduledTests(modelService: Convergence.ModelService, testmodelid: string, answermodelid: string) {
        modelService.query("SELECT * FROM codebusters_answers where testid='" + testmodelid + "'")
            .then(results => {
                let total = 0;
                let templatecount = 0;
                let table: JTTable = undefined
                results.data.forEach(result => {
                    if (result.modelId === answermodelid) {
                        templatecount++;
                        this.answerTemplate = result.data as IAnswerTemplate;
                    } else {
                        if (table === undefined) {
                            table = new JTTable({ class: 'cell shrink testlist publist' });
                            let row = table.addHeaderRow();
                            row.add('Action')
                                .add('Start Time')
                                .add('End Time')
                                .add('Timed Question')
                                .add('Takers');
                        }
                        let row = table.addBodyRow();
                        let buttons = $('<div/>', { class: 'button-group round shrink' });
                        buttons.append(
                            $('<a/>', {
                                'data-source': result.modelId,
                                type: 'button',
                                class: 'pubdel alert button',
                            }).text('Delete')
                        );
                        row.add(buttons)
                            .add("StartTime") // Start Time
                            .add("EndTime") // End Time
                            .add("TimedQ") // Timed question End
                            .add("User1,User2,User3"); // Takers
                        // Need to add the entry
                        total++;
                    }
                });
                if (total === 0) {
                    $(".testlist").append(
                        $("<div/>", { class: "callout warning" }).text(
                            "No tests scheduled"
                        ));
                    if (templatecount === 0) {
                        this.reportFailure("Test Answer Template is missing");
                    }
                } else {
                    $(".testlist").append(table.generate());
                }
            })
            .catch(error => { this.reportFailure("Convergence API could not connect: " + error) });
    }
    public copyAnswerTemplate() {
        this.connectRealtime()
            .then((domain: ConvergenceDomain) => {
                const modelService = domain.models();
                let newAnswerTemplate: IAnswerTemplate = {
                    testid: this.answerTemplate.testid,
                    starttime: Date.now(),
                    endtime: Date.now() + (50 * 60),
                    endtimed: Date.now() + (10 * 60),
                    assigned: [],
                    answers: this.answerTemplate.answers
                }
                modelService.openAutoCreate({
                    collection: "codebusters_answers",
                    overrideCollectionWorldPermissions: false,
                    data: newAnswerTemplate
                }).then((datamodel: RealTimeModel) => {
                    datamodel.close();
                    this.updateOutput();
                }).catch(error => { this.reportFailure("Could not autocreate: " + error) });
            })
            .catch(error => { this.reportFailure("Convergence API could not connect: " + error) });
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $("#addsched")
            .off('click')
            .on('click', () => {
                this.copyAnswerTemplate();
            });

    }
}
