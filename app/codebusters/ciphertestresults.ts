import {CipherTestManage} from "./ciphertestmanage";
import {IState, toolMode} from "../common/cipherhandler";
import {ITestState} from './ciphertest';
import {ICipherType} from "../common/ciphertypes";
import {cloneObject} from "../common/ciphercommon";
import {JTButtonItem} from "../common/jtbuttongroup";
import {JTTable} from "../common/jttable";
import {ConvergenceDomain, ModelService} from "@convergence/convergence";
import {CipherPrintFactory} from "./cipherfactory";

/**
 * CipherTestPublished
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Permissions> <Schedule> <View Results> Test Title  #questions #Scheduled
 *  The command buttons availableare
 */
export class CipherTestResults extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;

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

    private testSource = undefined;

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
        this.checkXMLImport();
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
        return this.genPublishedEditState('results');
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'testlist' });

        // First we need to get the test template from the testsource
        // Once we have the test template, then we will be able to find all the scheduled tests
        this.connectRealtime()
            .then((domain: ConvergenceDomain) => {
                this.openTestSource(domain, this.state.testID);
                $(".ans").remove();
            });
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
                let testSourcePromise = this.findTestSource2(modelService, testmodelid);
                this.findScheduledTests(modelService, testmodelid, answermodelid, testSourcePromise);
            })
            .catch(error => { this.reportFailure("Could not open model for " + sourcemodelid + " Error:" + error) });

    }

    /**
     * Find test test source
     *
     */
    private findTestSource(domain: ConvergenceDomain, testModelId: string) : Promise<any> {
        const modelService = domain.models();
        let returnValue = undefined;
        modelService.open(testModelId)
            .then(realtimeModel => {
                let testModelId = realtimeModel.root().elementAt("testid").value();

                console.log("Finding source with: "+"SELECT * FROM codebusters_source where testid='" + testModelId + "'");
                returnValue = modelService.query("SELECT * FROM codebusters_source where testid='" + testModelId + "'")
                    .then(results => {
                        let count = 0;
                        let testSource = undefined
                        results.data.forEach(result => {
                            testSource = result
                            // let question = 'CIPHER.' + count.toString();
                            // let state = testSource[question];
                            // let ihandler = CipherFactory(state.cipherType, state.curlang);
                            // // and restore the state
                            // ihandler.restore(state);
                            //
                            console.log("Found it: " + testSource['TEST.0'].title);
                            count++;
                        })
                        if (count != 1) {
                            console.log("Error calculating results... found '" + count + "' tests!");
                            return undefined
                        }
                        else {
                            return testSource
                        }
                    })
                    .catch(error => { this.reportFailure("Convergence API could not connect: " + error) });
            })
        return returnValue;
    }
    /**
     * Find test test source
     *
     */
    private findTestSource2(modelService: Convergence.ModelService, testModelId: string) : Promise<any> {
        console.log("Finding source with: " + "SELECT * FROM codebusters_source where testid='" + testModelId + "'");
        return modelService.query("SELECT * FROM codebusters_source where testid='" + testModelId + "'")
        .then(results => {
            let count = 0;
            let testSource = undefined
            results.data.forEach(result => {
                count++;
                testSource = result.data.source;
                console.log("Found it: " + testSource['TEST.0'].title);
            })
            if (count != 1) {
                console.log("Error calculating results... found '" + count + "' tests!");
            }
            return testSource;
        })
        .catch(error => {
            this.reportFailure("findTestSource2: Convergence API could not connect: " + error)
        });
    }

    /**
     * Find all the tests scheduled for a given test template
     * @param modelService
     */
    public findScheduledTests(modelService: ModelService, testmodelid: string, answermodelid: string, testSourcePromise: Promise<any>) {

        let theTest: { [key: string]: any; };
        testSourcePromise.then(testSource => {
            theTest = testSource;
            console.log('Got the testSource for these results...');
        });
        modelService.query("SELECT * FROM codebusters_answers where testid='" + testmodelid + "'")
            .then(results => {
                let total = 0;
                let templatecount = 0;
                let table: JTTable = undefined

                results.data.forEach(result => {
                    if (result.modelId === answermodelid) {
                        templatecount++;
                    } else {
                        if (table === undefined) {
                            table = new JTTable({ class: 'cell shrink testlist publist' });
                            let row = table.addHeaderRow();
                            row.add('Action')
                                .add('Start Time')
                                .add('End Time')
                                .add('Timed Question')
                                .add('Takers')
                                .add('Score');
                        }
                        let row = table.addBodyRow();
                        let buttons = $('<div/>', { class: 'button-group round shrink' });
                        buttons.append(
                            $('<a/>', {
                                'data-source': result.modelId,
                                type: 'button',
                                class: 'pubview button',
                            }).text('View')
                        );
                        buttons.append(
                            $('<a/>', {
                                'data-source': result.modelId,
                                type: 'button',
                                class: 'pubanalyze button',
                            }).text('Analyze')
                        );

                        let startTime = result.data.starttime;
                        let date = new Date(startTime);
                        let testStarted = this.getDateString(startTime);
                        let endTime = result.data.endtime;
                        let testEnded = this.getDateString(endTime);
                        let bonusTime = result.data.endtimed;
                        let users = result.data.assigned;

                        let userList = '';
                        for (let i = 0; i < users.length; i++) {
                            if (i > 0) {
                                userList += '\n';
                            }
                            userList += users[i].displayname;
                        }

                        // Create a table with this test's detailed results
                        let viewTable = new JTTable({ class: 'cell shrink testscores' });
                        let hasTimed = false;
                        let viewTableHeader = viewTable.addHeaderRow();
                        viewTableHeader.add('Question')
                            .add('Value')
                            .add('Cipher type')
                            .add('Incorrect letters')
                            .add('Deduction')
                            .add('Score');

                        let answers = result.data.answers;
                        // Loop thru questions to tabulate the score.
                        //console.log("The answer count is: " + answers.length.toString());
                        let testScore = 0;
                        let scoreInformation = undefined;
                        let testInformation = theTest['TEST.0'];
                        let timeQuestion = testInformation['timed'];
                        if (timeQuestion != -1) {

                        }
                        if (timeQuestion != -1) {
                            hasTimed = true;
                            let question = 'CIPHER.' + timeQuestion;
                            let state = theTest[question]
                            let ihandler = CipherPrintFactory(state.cipherType, state.curlang);
                            ihandler.restore(state, true);
                            scoreInformation = ihandler.genScore(answers[0].answer);
                            testScore += scoreInformation.score;
                            // tally final score which includes the bonus.
                            testScore += this.calculateTimingBonus((bonusTime - startTime)/1000);
                            let viewTableRow = viewTable.addBodyRow();
                            viewTableRow.add('Timed')
                                .add(state.points.toString())
                                .add(state.cipherType)
                                .add(scoreInformation.incorrect)
                                .add(scoreInformation.deduction)
                                .add(scoreInformation.score.toString());
                        }
                        let questions = testInformation['questions'];
                        for (let i = 1; i < answers.length; i++) {
                            let answer = answers[i].answer;
                            let viewTableRow = viewTable.addBodyRow();
                            console.log("Answer " + i + " is " + answer);
                            // Find the right class to render the cipher but questions array does not
                            // contain the timed question.
                            let question = 'CIPHER.' + questions[(i - 1)].toString();

                            let state = theTest[question];
                            let ihandler = CipherPrintFactory(state.cipherType, state.curlang);
                            ihandler.restore(state, true);

                            try {
                                scoreInformation = ihandler.genScore(answer);
                                console.log("This question scored at: " + scoreInformation.score.toString());

                            } catch (e) {
                                scoreInformation.incorrect = '?';
                                scoreInformation.deduction = '?';
                                scoreInformation.score = 1;
                                console.log("Unable to handle genScore() in cipher: " + state.cipherType +
                                    " on question: " + questions[(i-1)].toString());
                                e.stackTrace
                            }
                            testScore += scoreInformation.score;
                            viewTableRow.add(i.toString())
                                .add(state.points.toString())
                                .add(state.cipherType)
                                .add(scoreInformation.incorrect)
                                .add(scoreInformation.deduction)
                                .add(scoreInformation.score.toString());
                        }

                        if (hasTimed) {
                            let bonusTableRow = viewTable.addFooterRow();
                            bonusTableRow.add('Bonus')
                                .add({
                                    settings: {colspan: 4, class: 'grey' },
                                    content: '',
                                })
                                .add(this.calculateTimingBonus((bonusTime - startTime) / 1000).toString());
                        }
                        let totalTableRow = viewTable.addFooterRow();
                        totalTableRow.add('Final score')
                            .add({
                                settings: {colspan: 4, class: 'grey' },
                                content: '',
                            })
                            .add(testScore.toString());

                        row.add(buttons)
                            .add(testStarted) // Start Time
                            .add(testEnded) // End Time
                            .add(((bonusTime - startTime)/1000).toString()) // Timed question End
                            .add(userList)
                            .add(/*testScorePromise.then(toString()*/testScore.toString()); // Takers
                        // Need to add the entry
                        let viewRow = table.addBodyRow();
                        viewRow.add({
                            settings: {colspan: 6},
                            content: $('<div/>', { class: result.modelId }).append(viewTable.generate()),
                        });
                        /*content: $('<div/>').append(viewTable.generate()), */
                        /*content: $('#scoretable').append(viewTable.generate()), */

                        total++;
                    }
                });
                if (total === 0) {
                    $(".testlist").append(
                        $("<div/>", { class: "callout warning" }).text(
                            "No tests results available"
                        ));
                    if (templatecount === 0) {
                        this.reportFailure("Test Answer Template is missing");
                    }
                } else {
                    $(".testlist").append(table.generate());
                }
            })
            .catch(error => { this.reportFailure("findScheduledTests Convergence API could not connect: " + error) });
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.pubview')
            .off('click')
            .on('click', e => {
                $('.sdf').show();
            });
    }

    /**
     * Calculate the timed question bonus based on the published formula
     * @param solvedTime the number of seconds after the start of the test when the
     *                   time question was successfully solved.
     */
    calculateTimingBonus(solvedTime: number):number {
        let returnValue: number;
        returnValue = 4 * (600 - solvedTime);
        if (returnValue < 0) {
            returnValue = 0;
        }
        return returnValue
    }

    MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    /**
     * Format the number of milliseconds since the 1970 epoch in a human readable date/time string.
     * @param milliseconds
     */
    getDateString(milliseconds: number): string {

        // MMM dd, YYYY HH:MM
        let date = new Date(milliseconds);
        let month = this.MONTHS[date.getMonth()];
        let day = date.getDate();
        let year = date.getFullYear().toString().substring(2);
        let hours = date.getHours();
        let minutes = date.getMinutes();
        return month + " " + day + ", " + year + " @ " + hours + ":" + minutes;
    }
}
