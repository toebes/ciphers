import { toolMode, IState, menuMode } from '../common/cipherhandler';
import { ITestState, IAnswerTemplate } from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import { cloneObject, makeCallout, timestampFromMinutes, timestampFromSeconds, timestampFromWeeks, timestampToFriendly } from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { ConvergenceDomain } from '@convergence/convergence';
import { CipherTest } from './ciphertest';
import { TrueTime } from '../common/truetime';

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
    public truetime = new TrueTime((msg) => { this.checkTime() });
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [];

    /** Handler for our interval time which keeps checking that time is right */
    private IntervalTimer: number = undefined;
    private lastDelta: number = 0;

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
     * checkTime is called on a regular interval to confirm that the clock on the computer is set correctly
     * it uses the truetime class to figure out the actual time from the server.  if the time is
     * off by more than 10 seconds, we let them know that they can fix their clock
     */
    public checkTime(): void {
        const target = $("#timeinfo");
        const delta = this.truetime.getDelta();
        const change = Math.abs(delta - this.lastDelta)
        target.empty();
        if (Math.abs(delta) > timestampFromSeconds(10)) {
            const computerNow = timestampToFriendly(Date.now());
            const actualNow = timestampToFriendly(this.truetime.UTCNow());
            const msg = $("<div/>")
            msg.append($("<h2/>").text("The clock on your computer is not set correctly."))
                .append($("<p>").text("The correct time is:")
                    .append($("<span/>", { class: "goodtime" }).text(actualNow))
                    .append(" your computer is set to:")
                    .append($("<span/>", { class: "badtime" }).text(computerNow))
                )
            target.append(makeCallout(msg, 'alert'));
        }
        this.lastDelta = delta;
        if (change > timestampFromSeconds(10)) {
            $('.testlist').replaceWith(this.genTestList());
        }
    }
    /**
     * Update the output based on current state settings.
     * This propagates all values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        $('.testlist').replaceWith(this.genTestList());
        // Start a process to check the time and update the display at least once a second
        this.IntervalTimer = window.setInterval(() => {
            this.checkTime();
        }, timestampFromSeconds(1));

        this.attachHandlers();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>', { id: "timeinfo" })
        return result;
    }

    /**
     * Generates a list of all the tests on the server in a table.
     * @returns HTML content of list of tests
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });
        if (this.confirmedLoggedIn(' in order to see tests assigned to you.', result)) {
            const table = new JTTable({ class: 'cell shrink publist' });
            const row = table.addHeaderRow();
            row.add('Action')
                .add('Title')
                .add('Start Time')
                .add('Team')
                .add('Type');
            result.append(table.generate());
            const domain = this.getConvergenceDomain();
            if (domain === 'scienceolympiad') {
                // const callout = $('<div/>', {
                //     class: 'divtest callout primary',
                // }).append($("<p/>", { class: "h2" }).append($("<b/>").text("You are almost there!")))
                //     .append($("<p/>", { class: "h4" }).text("For the state test, you must click the appropriate link below. ")
                //         .append($("<em/>").text("Please note, you may have to log in again to access the test domain.")))
                //     .append($("<ul/>")
                //         .append($("<li/>", { class: "h3" }).append(
                //             $("<a/>", { href: "https://ncb.toebes.com/codebusters/TakeTest.html" }).text("North Carolina Division B State Test"))
                //         )
                //         .append($("<li/>", { class: "h3" }).append(
                //             $("<a/>", { href: "https://ncc.toebes.com/codebusters/TakeTest.html" }).text("North Carolina Division C State Test"))
                //         )
                //     )
                // result.append(callout)
            } else if (domain === 'ncbscienceolympiad') {
                $("h2").text("North Carolina Division A and B Codebusters Tests")
                result
                    .append($("<p/>"))
                    .append($("<a/>", { href: "https://toebes.com/codebusters/TakeTest.html" }).text("Go back to main Codebusters Site"))

            } else if (domain === 'nccscienceolympiad') {
                $("h2").text("North Carolina Division C Codebusters Tests")
                result
                    .append($("<p/>"))
                    .append($("<a/>", { href: "https://toebes.com/codebusters/TakeTest.html" }).text("Go back to main Codebusters Site"))
            }
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
        // We know that we are logged in because the toplevel routine confirms it, but
        // just incase we still need a default for the userid
        const userid = this.getConfigString('userid', 'NOBODY');
        modelService
            .query('SELECT testid,starttime,endtime,assigned, teamname,teamtype FROM codebusters_answers')  // This stays with Convergence for the answer models
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
                    this.addPublishedEntry(result.modelId, answertemplate, isAssigned);
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
     * @param answerModelID ID of the answer model
     * @param answertemplate Contents of answer
     */
    public addPublishedEntry(answerModelID: string, answertemplate: IAnswerTemplate, isAssigned: boolean): void {
        const tr = $('<tr/>', { 'data-answer': answerModelID });
        const buttons = $('<div/>', { class: 'button-group round shrink' });
        const now = this.truetime.UTCNow();

        // const showCoachedTest = true;

        //   1) Don't display any test that is more than 2 weeks old
        //   2) For tests that are more than a week old, put in a note that the test will automatically delete on xxx date
        //      i.e Test ended at xxxx, will auto-delete on <date>
        if (answertemplate.endtime + timestampFromWeeks(2) < now) {
            return;
        }
        else if (answertemplate.endtime < now) {
            let deleteWarning = ' ';
            if (answertemplate.endtime + timestampFromWeeks(1) < now) {
                const deleteDate = new Date(answertemplate.endtime + timestampFromWeeks(2)).toLocaleString();
                deleteWarning = ', will auto-delete on ' + deleteDate + '. ';
            }
            // Add results...not sure how exactly, need to refactor code

            /*  TODO RTL: show results to test taker...
            let testScore:CipherTestScorer = new CipherTestScorer();

            this.getRealtimeSource(answerModelID).then((sourcemodel: SourceModel) =>
            {
                getTestScores(testScore, result, sourcemodel);
            }).catch((error) => {
                this.reportFailure('Could not open model for ' + answerModelID + ' Error:' + error);
            });

            */

            const endtime = new Date(answertemplate.endtime).toLocaleString();
            buttons.append($('<div/>').append('Test ended at ' + endtime + deleteWarning));
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
        const teamname = answertemplate.teamname;
        const teamType = answertemplate.teamtype;
        tr.append($('<td/>').append($('<div/>', { class: 'grid-x' }).append(buttons)))
            .append($('<td/>').append(testtitle))
            .append($('<td/>').text(starttime))
            .append($('<td/>').text(teamname))
            .append($('<td/>').text(teamType));

        this.fillTitle(testtitle, testmodelid);
        const curtr = $('tr[data-answer="' + answerModelID + '"]');
        if (curtr.length > 0) {
            curtr.replaceWith(tr);
        } else {
            $('.publist').append(tr);
        }
    }
    /**
     * Gets the title for a test from the testmodel
     * @param elem Element to fill the title into
     * @param testmodelid ID of model to get the title for
     */
    public fillTitle(elem: JQuery<HTMLElement>, testmodelid: string): void {
        this.getRealtimeElementMetadata('testmodel', testmodelid)
            .then((metadata) => {
                elem.empty().append($('<span/>').text(metadata.title));
            })
            .catch((error) => {
                // If we can't get to the metadata for the source then they can't take the test, so just delete it from the UI
                elem.closest("tr").remove();
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
    public printHints(testid: string): void {
        // TODO: Implement this!
    }
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
            });
        $('.printhint')
            .off('click')
            .on('click', (e) => {
                this.printHints(this.getModelID($(e.target)));
            });
    }
}
