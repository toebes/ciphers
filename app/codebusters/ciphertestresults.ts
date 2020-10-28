import { CipherTestManage } from "./ciphertestmanage";
import { IState, toolMode } from "../common/cipherhandler";
import { ITestState } from './ciphertest';
import { ICipherType } from "../common/ciphertypes";
import { cloneObject, formatTime, timestampToFriendly } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTTable } from "../common/jttable";
import { ConvergenceDomain, ModelService } from "@convergence/convergence";
import { CipherPrintFactory } from "./cipherfactory";
import {CipherTestScorer, ITestQuestion, ITestResultsData} from "./ciphertestscorer";

/**
 * CipherTestPublished
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <DETAILS> <ANALYZE> Starttime endtime timedquestion takers score
 *  The command buttons available are
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
                let testSourcePromise = this.findTestSource(modelService, testmodelid);
                this.findScheduledTests(modelService, testmodelid, answermodelid, testSourcePromise);
            })
            .catch(error => { this.reportFailure("Could not open model for " + sourcemodelid + " Error:" + error) });

    }
    /**
     * Find test test source
     *
     */
    private findTestSource(modelService: Convergence.ModelService, testModelId: string): Promise<any> {
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
                this.reportFailure("findTestSource: Convergence API could not connect: " + error)
            });
    }

    /**
     * Find all the tests scheduled for a given test template
     * @param modelService service object to access the model data
     * @param testmodelid ID of the test model for these results
     * @param answermodelid ID of the answer template models that we will skip
     * @param testSourcePromise promise that will provide the actual test we will use to score answered tests
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
                let table: JTTable = undefined;
                let scheduledTestScores: CipherTestScorer = new CipherTestScorer();

                results.data.forEach(result => {
                    if (result.modelId === answermodelid) {
                        templatecount++;
                    } else {
                        if (table === undefined) {
                            table = new JTTable({ class: 'cell shrink publist' });
                            let row = table.addHeaderRow();
                            row.add('Action')
                                .add('Start Time')
                                .add('End Time')
                                .add('Timed Question')
                                .add('Takers')
                                .add('Score');
                        }
                        let testResultsData: ITestResultsData = {
                            bonusBasis: 0,
                            hasTimed: false,
                            testId: result.modelId,
                            isTieBroke: false,
                            startTime: '',
                            endTime: '',
                            bonusTime: 0,
                            testTakers: '',
                            score: 0,
                            questions: []
                        }

                        let startTime = result.data.starttime;
                        let testStarted = timestampToFriendly(startTime);
                        let endTime = result.data.endtime;
                        let testEnded = timestampToFriendly(endTime);
                        let bonusWindow = 0;
                        let bonusTime = 0;
                        let users = result.data.assigned;

                        let userList = '';
                        for (let i = 0; i < users.length; i++) {
                            if (i > 0) {
                                userList += '\n';
                            }
                            userList += users[i].displayname;
                        }

                        // Create a table with this test's detailed results
                        let answers = result.data.answers;
                        // Loop thru questions to tabulate the score.
                        //console.log("The answer count is: " + answers.length.toString());
                        let testScore = 0;
                        let scoreInformation = undefined;
                        let testInformation = theTest['TEST.0'];
                        let questionInformation: ITestQuestion = {
                            correctLetters: 0,
                            questionNumber: 0,
                            points: 0,
                            cipherType: '',
                            incorrectLetters: 0,
                            deduction: 0,
                            score: 0,
                        }
                        let timeQuestion = testInformation['timed'];
                        if (timeQuestion != -1) {
                            testResultsData.hasTimed = true;
                            let question = 'CIPHER.' + timeQuestion;
                            let state = theTest[question]
                            let ihandler = CipherPrintFactory(state.cipherType, state.curlang);
                            ihandler.restore(state, true);
                            scoreInformation = ihandler.genScore(answers[0].answer);
                            testScore += scoreInformation.score;
                            // solvetime is in milliseconds, so needs to be rounded...
                            bonusTime = Math.round(answers[0].solvetime / 1000 );
                            bonusWindow = (result.data.endtimed - startTime) / 1000; // remove milliseconds
                            testResultsData.bonusBasis = bonusWindow;
                            // add any bonus points to final score.
                            testScore += this.calculateTimingBonus(bonusTime, bonusWindow);
                            questionInformation.correctLetters = scoreInformation.correctLetters;
                            questionInformation.points = state.points;
                            questionInformation.cipherType = state.cipherType;
                            questionInformation.incorrectLetters = scoreInformation.incorrectLetters;
                            questionInformation.deduction = scoreInformation.deduction;
                            questionInformation.score = scoreInformation.score;
                        }
                        testResultsData.questions[0] = questionInformation;

                        let questions = testInformation['questions'];
                        for (let i = 1; i < answers.length; i++) {
                            let questionInformation: ITestQuestion = {
                                correctLetters: 0,
                                questionNumber: 0,
                                points: 0,
                                cipherType: '',
                                incorrectLetters: 0,
                                deduction: 0,
                                score: 0,
                            }
                            let answer = answers[i].answer;
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
                                scoreInformation.correctLetters = 0;
                                scoreInformation.incorrectLetters = '?';
                                scoreInformation.deduction = '?';
                                scoreInformation.score = 1;
                                console.log("Unable to handle genScore() in cipher: " + state.cipherType +
                                    " on question: " + questions[(i - 1)].toString());
                                e.stackTrace
                            }
                            testScore += scoreInformation.score;
                            questionInformation.correctLetters = scoreInformation.correctLetters
                            questionInformation.questionNumber = i;
                            questionInformation.points = state.points;
                            questionInformation.cipherType = state.cipherType;
                            questionInformation.incorrectLetters = scoreInformation.incorrectLetters;
                            questionInformation.deduction = scoreInformation.deduction;
                            questionInformation.score = scoreInformation.score;
                            testResultsData.questions[i] = questionInformation;
                        }

                        testResultsData.startTime = testStarted;
                        testResultsData.endTime = testEnded;
                        testResultsData.bonusTime = bonusTime;
                        testResultsData.testTakers = userList;
                        testResultsData.score = testScore;
                        scheduledTestScores.addTest(testResultsData);

                        total++;
                    }
                });
                if (total === 0) {
                    $(".testlist").append(
                        $("<div/>", { class: "callout warning" }).text(
                            'No tests results available for "' + theTest['TEST.0'].title + '"'
                        ));
                    if (templatecount === 0) {
                        this.reportFailure("Test Answer Template is missing");
                    }
                } else {
                    // Fill in the results table for this test...
                    console.log(scheduledTestScores.toString());
                    let scoredTests = scheduledTestScores.scoreTests();
                    // Create the results table from the tests after breaking any ties
                    scoredTests.forEach((itemTest, indexTest) => {

                        let testQuestions = scoredTests[indexTest].questions;
                        // Create the table containing the details for this test.
                        let viewTable = new JTTable({class: 'cell shrink testscores'});
                        let viewTableHeader = viewTable.addHeaderRow();
                        viewTableHeader.add('Question')
                            .add('Value')
                            .add('Cipher type')
                            .add('Incorrect letters')
                            .add('Deduction')
                            .add('Score');

                        testQuestions.forEach((itemQuestion, indexQuestion) =>
                        {
                            // Check the first question for a ciphertype to determine if there
                            // is a timed question in this test.
                            if (indexQuestion === 0 && itemTest.hasTimed) {
                                // Timed question
                                let viewTableRow = viewTable.addBodyRow();
                                viewTableRow.add('Timed')
                                    .add(itemQuestion.points.toString())
                                    .add(itemQuestion.cipherType)
                                    .add(itemQuestion.incorrectLetters.toString())
                                    .add(itemQuestion.deduction.toString())
                                    .add(itemQuestion.score.toString());
                            }

                            // Remaining questions
                            if (indexQuestion >= 1) {
                                let viewTableRow = viewTable.addBodyRow();
                                viewTableRow.add(indexQuestion.toString())
                                    .add(itemQuestion.points.toString())
                                    .add(itemQuestion.cipherType)
                                    .add(itemQuestion.incorrectLetters.toString())
                                    .add(itemQuestion.deduction.toString())
                                    .add(itemQuestion.score.toString());
                            }
                        });
                        // Bonus row
                        if (itemTest.hasTimed) {
                            let bonusTableRow = viewTable.addFooterRow();
                            let bonusClass = '';
                            // If the bonus time was not 10 minutes, then shade the bonus value.
                            if (itemTest.bonusBasis !== 600) {
                                bonusClass = 'deviation';
                            }
                            bonusTableRow.add('Bonus')
                                .add({
                                    settings: { colspan: 4, class: 'grey' },
                                    content: '',
                                })
                                .add({
                                    settings: { class: bonusClass },
                                    content: this.calculateTimingBonus(itemTest.bonusTime, itemTest.bonusBasis).toString(),
                                });
                        }
                        // Final (totals) row
                        let totalTableRow = viewTable.addFooterRow();
                        totalTableRow.add('Final score')
                            .add({
                                settings: {colspan: 4, class: 'grey'},
                                content: '',
                            })
                            .add(itemTest.score.toString());


                        // Fill in the results summary
                        let row = table.addBodyRow();
                        // Create the buttons (first column of results table)
                        let buttons = $('<div/>', { class: 'button-group round shrink' });
                        // For the details button we need to store the child html as an attribute
                        buttons.append(
                            $('<a/>', {
                                // To get the full html, we need to wrap it and get the innerhtml
                                // see https://stackoverflow.com/questions/5744207/jquery-outer-html
                                'data-child': $("<div/>").append(viewTable.generate()).html(),
                                type: 'button',
                                class: 'pubview button',
                            }).text('Details')
                        );
                        buttons.append(
                            $('<a/>', {
                                'data-source': itemTest.testId,
                                type: 'button',
                                class: 'pubanalyze button',
                            }).text('Analyze')
                        );
                        let solvedTime = "No Bonus";
                        if (itemTest.bonusTime !== 0) {
                            solvedTime = formatTime(itemTest.bonusTime);
                        }

                        let tieBreakClass = '';
                        if (itemTest.isTieBroke) {
                            tieBreakClass = 'tiebreak';
                        }
                        row.add(buttons)
                            .add(itemTest.startTime) // Start Time
                            .add(itemTest.endTime) // End Time
                            .add(solvedTime) // Timed question End
                            .add(itemTest.testTakers)
                            .add({
                                settings: { class: tieBreakClass },
                                content: itemTest.score.toString(),
                            });
                    });

                    $(".testlist")
                        .append($("<h3/>").text('Results for test: "' + theTest['TEST.0'].title + '"'))
                        .append(table.generate());
                    let datatable = $(".publist").DataTable(
                        { "order": [[5, "desc"]] }
                    );
                    // We need to attach the handler here because we need access to the datatable object
                    // in order to get the row() function
                    $('.pubview')
                        .off('click')
                        .on('click', e => {
                            let target = $(e.target);
                            let childhtml = target.attr('data-child');
                            // This basically comes from 
                            //   https://datatables.net/examples/api/row_details.html
                            // with the exception that we don't use the 'shown' class
                            let tr = target.closest('tr');
                            let row = datatable.row(tr);
                            if (row.child.isShown()) {
                                row.child.hide();
                            } else {
                                row.child(childhtml).show();
                            }
                        });
                    this.attachHandlers();
                }

            })
            .catch(error => { this.reportFailure("findScheduledTests Convergence API error: " + error) });
    }
    public gotoTestPlayback(testID: string): void {
        location.assign('TestPlayback.html?testID=' + String(testID));
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {

        super.attachHandlers();
        $('.pubanalyze')
            .off('click')
            .on('click', e => {
                this.gotoTestPlayback($(e.target).attr('data-source') as string);
            });
    }

    /**
     * Calculate the timed question bonus based on the published formula
     * @param solvedTime the number of seconds after the start of the test when the
     *                   time question was successfully solved.
     * @param bonusWindow The number of seconds the bonus for which the bonus can be earned...the rules say 600 (10 minutes)
     */
    calculateTimingBonus(solvedTime: number, bonusWindow: number = 600): number {
        let returnValue: number = 0;
        if (solvedTime !== 0) {
            returnValue = 4 * (bonusWindow - solvedTime);
            if (returnValue < 0) {
                returnValue = 0;
            }
        }
        return returnValue
    }
}
