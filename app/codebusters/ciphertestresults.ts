import { CipherTestManage } from './ciphertestmanage';
import { IState, toolMode } from '../common/cipherhandler';
import { ITestState } from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import { cloneObject, formatTime, timestampFromSeconds, timestampToFriendly } from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { ConvergenceDomain, ModelService } from '@convergence/convergence';
import { CipherPrintFactory } from './cipherfactory';
import { CipherTestScorer, ITestQuestion, ITestResultsData } from './ciphertestscorer';

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
        const result = $('<div/>', { class: 'testlist' });

        // First we need to get the test template from the testsource
        // Once we have the test template, then we will be able to find all the scheduled tests
        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            this.openTestSource(domain, this.state.testID);
            $('.ans').remove();
        });
        return result;
    }
    /**
     *
     * @param domain Convergence Domain to query against
     * @param sourcemodelid Source test to open
     */
    private openTestSource(domain: ConvergenceDomain, sourcemodelid: string): void {
        const modelService = domain.models();
        modelService
            .open(sourcemodelid)
            .then((realtimeModel) => {
                const testmodelid = realtimeModel
                    .root()
                    .elementAt('testid')
                    .value();
                const answermodelid = realtimeModel
                    .root()
                    .elementAt('answerid')
                    .value();
                realtimeModel.close();
                const testSourcePromise = this.findTestSource(modelService, testmodelid);
                this.findScheduledTests(
                    modelService,
                    testmodelid,
                    answermodelid,
                    testSourcePromise
                );
            })
            .catch((error) => {
                this.reportFailure('Could not open model for ' + sourcemodelid + ' Error:' + error);
            });
    }
    /**
     * Find test test source
     *
     */
    private findTestSource(
        modelService: Convergence.ModelService,
        testModelId: string
    ): Promise<any> {
        console.log(
            'Finding source with: ' +
            "SELECT * FROM codebusters_source where testid='" +
            testModelId +
            "'"
        );
        return modelService
            .query("SELECT * FROM codebusters_source where testid='" + testModelId + "'")
            .then((results) => {
                let count = 0;
                let testSource = undefined;
                results.data.forEach((result) => {
                    count++;
                    testSource = result.data.source;
                    console.log('Found it: ' + testSource['TEST.0'].title);
                });
                if (count != 1) {
                    console.log("Error calculating results... found '" + count + "' tests!");
                }
                return testSource;
            })
            .catch((error) => {
                this.reportFailure('findTestSource: Convergence API could not connect: ' + error);
            });
    }

    /**
     * Find all the tests scheduled for a given test template
     * @param modelService service object to access the model data
     * @param testmodelid ID of the test model for these results
     * @param answermodelid ID of the answer template models that we will skip
     * @param testSourcePromise promise that will provide the actual test we will use to score answered tests
     */
    public findScheduledTests(
        modelService: ModelService,
        testmodelid: string,
        answermodelid: string,
        testSourcePromise: Promise<any>
    ): void {
        let theTest: { [key: string]: any };
        testSourcePromise.then((testSource) => {
            theTest = testSource;
            console.log('Got the testSource for these results...');
        });
        modelService
            .query("SELECT * FROM codebusters_answers where testid='" + testmodelid + "'")
            .then((results) => {
                let total = 0;
                let templatecount = 0;
                let table: JTTable = undefined;
                const scheduledTestScores: CipherTestScorer = new CipherTestScorer();

                results.data.forEach((result) => {
                    if (result.modelId === answermodelid) {
                        templatecount++;
                    } else {
                        if (table === undefined) {
                            table = new JTTable({ class: 'cell shrink publist testresults' });
                            const row = table.addHeaderRow();
                            row.add('Action')
                                .add('School')
                                .add('Type')
                                .add('Start Time')
                                .add('End Time')
                                .add('Timed Question')
                                .add('Takers')
                                .add('Score');
                        }
                        const testResultsData: ITestResultsData = {
                            bonusBasis: 0,
                            hasTimed: false,
                            testId: result.modelId,
                            isTieBroke: false,
                            startTime: '',
                            endTime: '',
                            bonusTime: 0,
                            testTakers: '',
                            score: 0,
                            questions: [],
                            teamname: '',
                            teamtype: ''
                        };

                        const startTime = result.data.starttime;
                        const testStarted = timestampToFriendly(startTime);
                        const endTime = result.data.endtime;
                        const testEnded = timestampToFriendly(endTime);
                        let bonusWindow = 0;
                        let bonusTime = 0;
                        const teamname = result.data.teamname;
                        const teamtype = result.data.teamtype;
                        const users = result.data.assigned;

                        let userList = '';
                        for (let i = 0; i < users.length; i++) {
                            if (i > 0) {
                                userList += '\n';
                            }
                            userList += users[i].displayname;
                        }

                        // Create a table with this test's detailed results
                        const answers = result.data.answers;
                        // Loop thru questions to tabulate the score.
                        //console.log("The answer count is: " + answers.length.toString());
                        let testScore = 0;
                        let scoreInformation = undefined;
                        const testInformation = theTest['TEST.0'];
                        const questionInformation: ITestQuestion = {
                            correctLetters: 0,
                            questionNumber: 0,
                            points: 0,
                            cipherType: '',
                            incorrectLetters: 0,
                            deduction: 0,
                            score: 0,
                        };
                        const timeQuestion = testInformation['timed'];
                        if (timeQuestion != -1) {
                            testResultsData.hasTimed = true;
                            const question = 'CIPHER.' + timeQuestion;
                            const state = theTest[question];
                            const ihandler = CipherPrintFactory(state.cipherType, state.curlang);
                            ihandler.restore(state, true);
                            scoreInformation = ihandler.genScore(answers[0].answer);
                            testScore += scoreInformation.score;
                            // solvetime is in milliseconds, so needs to be rounded...
                            bonusTime = Math.round(answers[0].solvetime / 1000);
                            bonusWindow = (result.data.endtimed - startTime) / 1000; // remove milliseconds
                            testResultsData.bonusBasis = bonusWindow;
                            // add any bonus points to final score.
                            testScore += this.calculateTimingBonus(bonusTime, bonusWindow);
                            questionInformation.correctLetters = scoreInformation.correctLetters;
                            questionInformation.points = state.points;
                            questionInformation.cipherType = state.cipherType;
                            questionInformation.incorrectLetters =
                                scoreInformation.incorrectLetters;
                            questionInformation.deduction = scoreInformation.deduction;
                            questionInformation.score = scoreInformation.score;
                        }
                        testResultsData.questions[0] = questionInformation;

                        const questions = testInformation['questions'];
                        for (let i = 1; i < answers.length; i++) {
                            const questionInformation: ITestQuestion = {
                                correctLetters: 0,
                                questionNumber: 0,
                                points: 0,
                                cipherType: '',
                                incorrectLetters: 0,
                                deduction: 0,
                                score: 0,
                            };
                            const answer = answers[i].answer;
                            console.log('Answer ' + i + ' is ' + answer);
                            // Find the right class to render the cipher but questions array does not
                            // contain the timed question.
                            const question = 'CIPHER.' + questions[i - 1].toString();

                            const state = theTest[question];
                            const ihandler = CipherPrintFactory(state.cipherType, state.curlang);
                            ihandler.restore(state, true);

                            try {
                                scoreInformation = ihandler.genScore(answer);
                                console.log(
                                    'This question scored at: ' + scoreInformation.score.toString()
                                );
                            } catch (e) {
                                scoreInformation.correctLetters = 0;
                                scoreInformation.incorrectLetters = '?';
                                scoreInformation.deduction = '?';
                                scoreInformation.score = 1;
                                console.log(
                                    'Unable to handle genScore() in cipher: ' +
                                    state.cipherType +
                                    ' on question: ' +
                                    questions[i - 1].toString()
                                );
                                e.stackTrace;
                            }
                            testScore += scoreInformation.score;
                            questionInformation.correctLetters = scoreInformation.correctLetters;
                            questionInformation.questionNumber = i;
                            questionInformation.points = state.points;
                            questionInformation.cipherType = state.cipherType;
                            questionInformation.incorrectLetters =
                                scoreInformation.incorrectLetters;
                            questionInformation.deduction = scoreInformation.deduction;
                            questionInformation.score = scoreInformation.score;
                            testResultsData.questions[i] = questionInformation;
                        }

                        testResultsData.startTime = testStarted;
                        testResultsData.endTime = testEnded;
                        testResultsData.bonusTime = bonusTime;
                        testResultsData.testTakers = userList;
                        testResultsData.score = testScore;
                        testResultsData.teamname = teamname;
                        testResultsData.teamtype = teamtype;

                        scheduledTestScores.addTest(testResultsData);

                        total++;
                    }
                });
                if (total === 0) {
                    $('.testlist').append(
                        $('<div/>', { class: 'callout warning' }).text(
                            'No tests results available for "' + theTest['TEST.0'].title + '"'
                        )
                    );
                    if (templatecount === 0) {
                        this.reportFailure('Test Answer Template is missing');
                    }
                } else {
                    // Fill in the results table for this test...
                    console.log(scheduledTestScores.toString());
                    const scoredTests = scheduledTestScores.scoreTests();
                    // Create the results table from the tests after breaking any ties
                    scoredTests.forEach((itemTest, indexTest) => {
                        const testQuestions = scoredTests[indexTest].questions;
                        // these testQuestion must be sorted by question number before adding
                        // to the detailed results table.
                        testQuestions.sort(function (a, b) { return a.questionNumber - b.questionNumber });
                        // Create the table containing the details for this test.
                        const viewTable = new JTTable({ class: 'cell shrink testscores' });
                        const viewTableHeader = viewTable.addHeaderRow();
                        viewTableHeader
                            .add('Question')
                            .add('Value')
                            .add('Cipher type')
                            .add('Incorrect letters')
                            .add('Deduction')
                            .add('Score');

                        testQuestions.forEach((itemQuestion, indexQuestion) => {
                            // Check the first question for a ciphertype to determine if there
                            // is a timed question in this test.
                            if (indexQuestion === 0 && itemTest.hasTimed) {
                                // Timed question
                                const viewTableRow = viewTable.addBodyRow();
                                viewTableRow
                                    .add('Timed')
                                    .add(itemQuestion.points.toString())
                                    .add(itemQuestion.cipherType)
                                    .add(itemQuestion.incorrectLetters.toString())
                                    .add(itemQuestion.deduction.toString())
                                    .add(itemQuestion.score.toString());
                            }

                            // Remaining questions
                            if (indexQuestion >= 1) {
                                const viewTableRow = viewTable.addBodyRow();
                                viewTableRow
                                    .add(indexQuestion.toString())
                                    .add(itemQuestion.points.toString())
                                    .add(itemQuestion.cipherType)
                                    .add(itemQuestion.incorrectLetters.toString())
                                    .add(itemQuestion.deduction.toString())
                                    .add(itemQuestion.score.toString());
                            }
                        });
                        // Bonus row
                        if (itemTest.hasTimed) {
                            const bonusTableRow = viewTable.addFooterRow();
                            let bonusClass = '';
                            // If the bonus time was not 10 minutes, then shade the bonus value.
                            if (itemTest.bonusBasis !== 600) {
                                bonusClass = 'deviation';
                            }
                            bonusTableRow
                                .add('Bonus')
                                .add({
                                    settings: { colspan: 4, class: 'grey' },
                                    content: '',
                                })
                                .add({
                                    settings: { class: bonusClass },
                                    content: this.calculateTimingBonus(
                                        itemTest.bonusTime,
                                        itemTest.bonusBasis
                                    ).toString(),
                                });
                        }
                        // Final (totals) row
                        const totalTableRow = viewTable.addFooterRow();
                        totalTableRow
                            .add('Final score')
                            .add({
                                settings: { colspan: 4, class: 'grey' },
                                content: '',
                            })
                            .add(itemTest.score.toString());

                        // Fill in the results summary
                        const row = table.addBodyRow();
                        // Create the buttons (first column of results table)
                        const buttons = $('<div/>', { class: 'button-group round shrink' });
                        // For the details button we need to store the child html as an attribute
                        buttons.append(
                            $('<a/>', {
                                // To get the full html, we need to wrap it and get the innerhtml
                                // see https://stackoverflow.com/questions/5744207/jquery-outer-html
                                'data-child': $('<div/>')
                                    .append(viewTable.generate())
                                    .html(),
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
                        let solvedTime = 'No Bonus';
                        if (itemTest.bonusTime !== 0) {
                            solvedTime = formatTime(timestampFromSeconds(itemTest.bonusTime));
                        }

                        let tieBreakClass = '';
                        if (itemTest.isTieBroke) {
                            tieBreakClass = 'tiebreak';
                        }
                        row.add(buttons)
                            .add(itemTest.teamname)
                            .add(itemTest.teamtype)
                            .add(itemTest.startTime) // Start Time
                            .add(itemTest.endTime) // End Time
                            .add(solvedTime) // Timed question End
                            .add(itemTest.testTakers)
                            .add({
                                settings: { class: tieBreakClass },
                                content: itemTest.score.toString(),
                            });
                    });

                    $('.testlist')
                        .append(
                            $('<h3/>').text('Results for test: "' + theTest['TEST.0'].title + '"')
                        )
                        .append(table.generate());
                    const datatable = $('.publist').DataTable({ order: [[5, 'desc']] });
                    // We need to attach the handler here because we need access to the datatable object
                    // in order to get the row() function
                    $('.pubview')
                        .off('click')
                        .on('click', (e) => {
                            const target = $(e.target);
                            const childhtml = target.attr('data-child');
                            // This basically comes from
                            //   https://datatables.net/examples/api/row_details.html
                            // with the exception that we don't use the 'shown' class
                            const tr = target.closest('tr');
                            const row = datatable.row(tr);
                            if (row.child.isShown()) {
                                row.child.hide();
                            } else {
                                row.child(childhtml).show();
                            }
                        });
                    this.attachHandlers();
                }
            })
            .catch((error) => {
                this.reportFailure('findScheduledTests Convergence API error: ' + error);
            });
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
            .on('click', (e) => {
                this.gotoTestPlayback($(e.target).attr('data-source') as string);
            });
    }

    /**
     * Calculate the timed question bonus based on the published formula
     * @param solvedTime the number of seconds after the start of the test when the
     *                   time question was successfully solved.
     * @param bonusWindow The number of seconds the bonus for which the bonus can be earned...the rules say 600 (10 minutes)
     */
    calculateTimingBonus(solvedTime: number, bonusWindow = 600): number {
        let returnValue = 0;
        if (solvedTime !== 0) {
            returnValue = 4 * (bonusWindow - solvedTime);
            if (returnValue < 0) {
                returnValue = 0;
            }
        }
        return returnValue;
    }
}
