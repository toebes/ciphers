import { toolMode, IState, menuMode } from '../common/cipherhandler';
import { ITestState, IAnswerTemplate } from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import { cloneObject, timestampFromMinutes } from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { ConvergenceDomain, RealTimeModel } from '@convergence/convergence';
import { CipherTest } from './ciphertest';

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
    public cmdButtons: JTButtonItem[] = [];
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        if (!suppressOutput) {
            this.setUIDefaults();
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
        $('.testlist').replaceWith(this.genTestList());
        this.attachHandlers();
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });
        const userid = this.getConfigString('userid', '');
        if (userid === '') {
            const callout = $('<div/>', {
                class: 'callout alert',
            })
                .append('Please ')
                .append(
                    $('<div/>', {
                        class: 'login-button button',
                    }).text('Login')
                )
                .append(' in order to see tests assigned to you.');
            result.append(callout);
        } else {
            const table = new JTTable({ class: 'cell shrink publist' });
            const row = table.addHeaderRow();
            row.add('Action')
                .add('Title')
                .add('Start Time');
            result.append(table.generate());

            this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
                this.findAllTests(domain);
            });
        }
        return result;
    }
    /**
     * Find all the test sources on the server
     * @param domain Convergence Domain to query against
     */
    private findAllTests(domain: ConvergenceDomain): void {
        const modelService = domain.models();
        const userid = this.getConfigString('userid', 'NOBODY');
        modelService
            .query('SELECT testid,starttime,endtime,assigned FROM codebusters_answers')
            .then((results) => {
                let count = 0;
                results.data.forEach((result) => {
                    const answertemplate = result.data as IAnswerTemplate;
                    // Check to see if they are permitted
                    let isAssigned = false;
                    for (const asn of answertemplate.assigned) {
                        if (asn.userid === userid) {
                            isAssigned = true;
                            break;
                        }
                    }
                    count++;
                    this.addPublishedEntry(
                        modelService,
                        result.modelId,
                        answertemplate,
                        isAssigned
                    );
                });
                if (count === 0) {
                    const callout = $('<div/>', {
                        class: 'callout alert',
                    }).text('There are currently no tests assigned for you to take.');
                    $('.testlist').append(callout);
                }
                this.attachHandlers();
            })
            .catch((error) => {
                this.reportFailure('Convergence API could not connect: ' + error);
            });
    }
    /**
     * Add/replace a test entry to the table of all tests along with the buttons to interact with the test.
     * @param modelService Convergence model service for making calls
     * @param answermodelid ID of
     * @param answertemplate Contents of answer
     */
    public addPublishedEntry(
        modelService: Convergence.ModelService,
        answermodelid: string,
        answertemplate: IAnswerTemplate,
        isAssigned: boolean
    ): void {
        const tr = $('<tr/>', { 'data-answer': answermodelid });
        const buttons = $('<div/>', { class: 'button-group round shrink' });
        const now = Date.now();
        // const showCoachedTest = true;

        if (answertemplate.endtime < now) {
            const endtime = new Date(answertemplate.endtime).toLocaleString();
            buttons.append('Test ended at ' + endtime);
        } else if (answertemplate.starttime > now + timestampFromMinutes(30)) {
            const starttime = new Date(answertemplate.starttime).toLocaleString();
            buttons.append('Test starts at ' + starttime);
        } else if (!isAssigned) {
            buttons.append(
                $('<a/>', {
                    type: 'button',
                    class: 'taketest button alert',
                }).text('Coach Test Now')
            );
        } else {
            buttons.append(
                $('<a/>', {
                    type: 'button',
                    class: 'taketest button',
                }).text('Take This Test Now')
            );
            // TODO: Reenable when we have the ability to print it out
            // buttons.append(
            //     $('<a/>', {
            //         type: 'button',
            //         class: 'printhint alert button',
            //     }).text('Print Hints')
            // );
        }
        const testmodelid = answertemplate.testid;
        const starttime = new Date(answertemplate.starttime).toLocaleString();
        const testtitle = $('<span/>').text('..Loading...');
        tr.append($('<td/>').append($('<div/>', { class: 'grid-x' }).append(buttons)))
            .append($('<td/>').append(testtitle))
            .append($('<td/>').text(starttime));

        this.fillTitle(modelService, testtitle, testmodelid);
        const curtr = $('tr[data-answer="' + answermodelid + '"]');
        if (curtr.length > 0) {
            curtr.replaceWith(tr);
        } else {
            $('.publist').append(tr);
        }
    }
    /**
     *
     * @param modelService
     * @param elem
     * @param testmodelid
     */
    public fillTitle(
        modelService: Convergence.ModelService,
        elem: JQuery<HTMLElement>,
        testmodelid: string
    ): void {
        modelService
            .open(testmodelid)
            .then((testmodel: RealTimeModel) => {
                const title = testmodel.elementAt('title').value();
                elem.empty().append($('<span/>').text(title));
            })
            .catch((error) => {
                this.reportFailure('Unable to get model title for ' + testmodelid + ': ' + error);
            });
    }
    /**
     * Run a test
     * @param testid Id of test model
     */
    public gotoTakeTest(testid: string): void {
        location.assign('TestTimed.html?testID=' + testid);
    }
    /**
     * Print hints for a test
     * @param testid Id of test model
     */
    public printHints(testid: string): void { }
    /**
     * Locate the model id for an element.  This looks for the data-source attribute of the containing TR
     * @param elem element to get information for
     * @returns model id stored on the TR element
     */
    public getModelID(elem: JQuery<HTMLElement>): string {
        const tr = elem.closest('tr');
        const id = tr.attr('data-answer') as string;
        return id;
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.taketest')
            .off('click')
            .on('click', (e) => {
                this.gotoTakeTest(this.getModelID($(e.target)));
                //                this.downloadPublishedTest($(e.target).attr('data-source'));
            });
        $('.printhint')
            .off('click')
            .on('click', (e) => {
                this.printHints(this.getModelID($(e.target)));
            });
    }
}
