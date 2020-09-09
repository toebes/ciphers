import { toolMode, IState, menuMode } from "../common/cipherhandler";
import { ITestState, IAnswerTemplate } from "./ciphertest";
import { ICipherType } from "../common/ciphertypes";
import { cloneObject, timestampToISOLocalString, timestampMinutes } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTTable } from "../common/jttable";
import { ConvergenceDomain, RealTimeModel } from "@convergence/convergence";
import { CipherTest } from "./ciphertest";

/**
 * CipherTakeTest
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Permissions> <Schedule> <View Results> Test Title  #questions #Scheduled
 *  The command buttons availableare
 */
export class CipherTakeTest extends CipherTest {
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
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
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
        $('.testlist').replaceWith(this.genTestList());
        this.attachHandlers();
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'testlist' });
        let userid = this.getConfigString("userid", "");
        if (userid === "") {
            let callout = $('<div/>', {
                class: 'callout alert',
            }).text("Please log in in order to see tests assigned to you.");
            result.append(callout);
        } else {
            let table = new JTTable({ class: 'cell shrink publist' });
            let row = table.addHeaderRow();
            row.add('Action')
                .add('Title')
                .add('Start Time');
            result.append(table.generate());

            this.connectRealtime()
                .then((domain: ConvergenceDomain) => {
                    this.findAllTests(domain);
                });
        }
        return result;
    }
    /**
     * Find all the test sources on the server
     * @param domain Convergence Domain to query against
     */
    private findAllTests(domain: ConvergenceDomain) {
        const modelService = domain.models();
        let userid = this.getConfigString("userid", "NOBODY");
        modelService.query("SELECT * FROM codebusters_answers")
            .then(results => {
                let count = 0;
                results.data.forEach(result => {
                    let answertemplate = result.data as IAnswerTemplate;
                    // Check to see if they are permitted 
                    let isAssigned = false;
                    for (let asn of answertemplate.assigned) {
                        if (asn.userid === userid) {
                            isAssigned = true;
                            break;
                        }
                    }
                    if (isAssigned) {
                        count++;
                        this.addPublishedEntry(modelService,
                            result.modelId,
                            answertemplate);
                    }
                });
                if (count === 0) {
                    let callout = $('<div/>', {
                        class: 'callout alert',
                    }).text("There are currently no tests assigned for you to take.");
                    $(".testlist").append(callout);
                }
                this.attachHandlers();
            })
            .catch(error => { this.reportFailure("Convergence API could not connect: " + error) }
            );
    }
    /**
     * Add/replace a test entry to the table of all tests along with the buttons to interact with the test.
     * @param modelService Convergence model service for making calls
     * @param answermodelid ID of 
     * @param answertemplate Contents of answer
     */
    public addPublishedEntry(modelService: Convergence.ModelService, answermodelid: string, answertemplate: IAnswerTemplate) {
        let tr = $("<tr/>", { 'data-answer': answermodelid });
        let buttons = $('<div/>', { class: 'button-group round shrink' });
        let now = Date.now();

        if (answertemplate.endtime < now) {
            let endtime = new Date(answertemplate.endtime).toLocaleString();
            buttons.append("Test ended at " + endtime);
        } else if (answertemplate.starttime > now + timestampMinutes(30)) {
            let starttime = new Date(answertemplate.starttime).toLocaleString();
            buttons.append("Test starts at " + starttime);
        } else {
            buttons.append(
                $('<a/>', {
                    type: 'button',
                    class: 'taketest button',
                }).text('Take Test')
            );
            buttons.append(
                $('<a/>', {
                    type: 'button',
                    class: 'printhint alert button',
                }).text('Print Hints')
            );
        }
        let testmodelid = answertemplate.testid;
        let starttime = new Date(answertemplate.starttime).toLocaleString();
        let testtitle = $("<span/>").text("..Loading...");
        tr.append($("<td/>").append($('<div/>', { class: 'grid-x' }).append(buttons)))
            .append($("<td/>").append(testtitle))
            .append($("<td/>").text(starttime));

        this.fillTitle(modelService, testtitle, testmodelid);
        var curtr = $('tr[data-answer="' + answermodelid + '"]');
        if (curtr.length > 0) {
            curtr.replaceWith(tr);
        } else {
            $(".publist").append(tr);
        }
    }
    public fillTitle(modelService: Convergence.ModelService, elem: JQuery<HTMLElement>, testmodelid: string) {
        modelService.open(testmodelid).then(
            (testmodel: RealTimeModel) => {
                let title = testmodel.elementAt("title").value();
                elem.empty().append($("<span/>").text(title));
            }
        )
            .catch(error => { this.reportFailure("Unable to get model title for " + testmodelid + ": " + error) });
    }
    /**
     * Run a test
     * @param testid Id of test model
     */
    public gotoTakeTest(testid: string) {
        location.assign('TestTimed.html?testID=' + testid);
    }
    /**
     * Print hints for a test
     * @param testid Id of test model
     */
    public printHints(testid: string) {
    }
    /**
     * Locate the model id for an element.  This looks for the data-source attribute of the containing TR
     * @param elem element to get information for
     * @returns model id stored on the TR element
     */
    public getModelID(elem: JQuery<HTMLElement>): string {
        let tr = elem.closest("tr");
        let id = tr.attr("data-answer") as string;
        return id;
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.taketest')
            .off('click')
            .on('click', e => {
                this.gotoTakeTest(this.getModelID($(e.target)));
                //                this.downloadPublishedTest($(e.target).attr('data-source'));
            });
        $('.printhint')
            .off('click')
            .on('click', e => {
                this.printHints(this.getModelID($(e.target)));
            });
    }
}
