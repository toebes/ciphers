import { CipherTestManage } from './ciphertestmanage';
import { IState, ITestQuestionFields, toolMode } from '../common/cipherhandler';
import { IAnswerTemplate, ITestState, ITestUser, SourceModel } from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import {
    cloneObject,
    formatTime,
    makeCallout,
    timestampFromMinutes,
    timestampFromSeconds,
    timestampToFriendly
} from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTRow, JTTable } from '../common/jttable';
import { ConvergenceDomain, HistoricalModel, ModelService, RealTimeModel } from '@convergence/convergence';
import { CipherPrintFactory } from './cipherfactory';
import { CipherTestScorer, ITestQuestion, ITestResultsData } from './ciphertestscorer';
import { JTFLabeledInput } from '../common/jtflabeledinput';

/**
 * CipherTestResults
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <DETAILS> <ANALYZE> Starttime endtime timedquestion takers score
 *  The <DETAILS> command buttons will show the scoring details (each question) of that test.
 *  <ANALYZE> will "replay" the test, for typing style analysis.
 */
export class CipherTestResults extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;
    public answerTemplate: IAnswerTemplate = undefined;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        // No additional command buttons needed...
    ];

    static isScilympiad: boolean = false;

    // Used for exporting results to CSV.
    /*
    *** Use this header *** 1 row per team...
Team, Total Score, OBT total, OBT 1, OBT 2, OBT 3, Start time, End time, Timed Solve, Bonus Score, Q 0-n Score, Q 0-n Incorrect letters
0pad format yy/mm/etc ---------> m:ss,   0:40                          x  xxx  xxxxxxxxxx     xx  x
C8, 1621101600000, 1621102500000, 319, 40 sec, 0:00, 0:20, 0:20, 1324, 0, 200, aristocrat, 0, 75, 0, 200

     */
    dataCSV = '##TEAM@INFO##, Total score, OBT total, OBT 1, OBT 2, OBT 3, Start time, End time, Timed solved, Bonus Score, ##QUESTIONS@SCORES##, ##QUESTIONS@INCORRECTLETTERS##\n';
    static teamData = new Map();

    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        result.append(this.genPublishedEditState('results'));
        result.append($('<div/>', { class: 'grid-x' })
            .append(JTFLabeledInput("Title", "readonly", "title", "", 'auto'))
            .append($('<div/>', { class: 'cell shrink' })
                .append($('<a/>', {
                    'showing': 'off',
                    class: 'takerview button',
                }).text('Reveal Takers')))
            .append($('<div/>', { class: 'cell shrink'})
                .append($('<a/>', { class: 'exportcsv button',
                }).text('Export CSV'))));
        return result;
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });

        if (this.state.testID === undefined) {
            result.append(makeCallout($('<h3/>').text('No test id was provided to view results.')));
            return result;
        }

        if (this.confirmedLoggedIn(' in order to see test results.', result)) {
            // First we need to get the test template from the testsource
            // Once we have the test template, then we will be able to find all the scheduled tests
            this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
                $('.ans').remove();
                const modelService = domain.models();
                this.openTestSource(modelService, this.state.testID);
            });

        }
        return result;
    }
    /**
     *
     * @param modelService Domain Model service object for making requests
     * @param sourcemodelid Source test to open
     */
    private openTestSource(modelService: ModelService, sourcemodelid: string): void {
        CipherTestResults.teamData.clear();
        this.getRealtimeElementMetadata('sourcemodel', sourcemodelid)
            .then((metadata) => {
                const testmodelid = metadata.testid;
                // Set the test title
                const testTitle = metadata.title;
                $('#title').text(testTitle);

                this.getRealtimeAnswerTemplate(metadata.answerid).then((answertemplate) => {
                    this.answerTemplate = answertemplate;
                    this.getRealtimeSource(this.state.testID).then((sourceModel) => {
                        CipherTestResults.isScilympiad = (sourceModel !== undefined && sourceModel.sciTestCount > 0);
                        this.dataCSV = this.dataCSV.replace('##TEAM@INFO##',
                            CipherTestResults.isScilympiad ? 'Team' : 'School, Type');
                        this.findScheduledTests(modelService, testmodelid, sourceModel, metadata.answerid);
                    }).catch((error) => {
                        this.reportFailure('Could not open Source model for ' + sourcemodelid + ' Error:' + error);
                    });
                })
                    .catch((error) => {
                        this.reportFailure('Could not open Answer Template for ' + sourcemodelid + ' Error:' + error);
                    });
            })
            .catch((error) => {
                this.reportFailure('Could not get metadata for ' + sourcemodelid + ' Error:' + error);
            });
    }
    /**
     * findScheduledTests finds all the tests scheduled for a given test template and populates the UI with them
     * @param modelService Domain Model service object for making requests
     * @param testmodelid Test model to find tests for
     * @param answertempateid Answer template to ignore (shouldn't be found)
     */
    public findScheduledTests(modelService: ModelService, testmodelid: string, sourceModel: SourceModel, answertempateid: string): void {
        modelService
            .query(
                "SELECT assigned,starttime,endtimed,endtime,teamname,teamtype FROM codebusters_answers where testid='" +
                testmodelid +
                "'"
            ) // This stays using convergence
            .then((results) => {
                let total = 0;
                results.data.forEach((result) => {
                    const answertemplate = result.data as IAnswerTemplate;
                    if (result.modelId !== answertempateid) {
                        this.addUITestEntry(result.modelId, answertemplate);
                        // Keep track of how many entries we created
                        total++;
                    }
                });
                // If we don't generate a table, we need to put something there to tell the user
                // that there are no tests scheduled.
                if (total === 0) {
                    $('.testlist').append(
                        $('<div/>', { class: 'callout warning' }).text('No tests scheduled')
                    );
                }
                this.attachHandlers();
                console.log("OK now score...");
                const scheduledTestScores: CipherTestScorer = new CipherTestScorer();
                this.scoreOne(modelService, sourceModel, scheduledTestScores);
            })
            .catch((error) => {
                this.reportFailure('Convergence API could not query: ' + error);
            });
    }

    /**
     * Create an empty UI...to be filled in later.
     * @param answermodelid contains the model id of an answered test.
     * @param answertemplate contains the details from the query
     */
    public addUITestEntry(answermodelid: string, answertemplate: IAnswerTemplate): string {
        let newRowID = 0;
        if ($('.publist').length === 0) {
            // No table at all so just create one with our row put in it
            const table = CipherTestResults.createTestTable();
            const row = table.addBodyRow();
            CipherTestResults.populateRow(row, newRowID, answermodelid, answertemplate);
            $('.testlist')
                .empty()
                .append(table.generate());
            if (CipherTestResults.isScilympiad) {
                $('.takerview').hide();
            }
        } else {
            // Find the id of the last row
            const lastid = $('.publist tr:last').attr('id');
            const rowID = Number(lastid.substr(1)) + 1;
            // And create a row with the next ID
            const row = new JTRow();
            CipherTestResults.populateRow(row, rowID, answermodelid, answertemplate);
            newRowID = rowID;
            // And put it into the table
            $('.publist tbody').append(row.generate());
        }
        return String(newRowID)
    }
    /**
     * createTestTable creates the test table for displaying all active tests
     */
    private static createTestTable(): JTTable {
        const table = new JTTable({ class: 'cell shrink publist testresults' });
        let row = table.addHeaderRow();
        row = row.add('Action');
        if (this.isScilympiad) {
            row = row.add('Team');
        }
        else {
            row = row.add('School')
                .add('Type');
        }
            row = row.add('Start Time')
            .add('End Time')
            .add('Timed Question');
        if (this.isScilympiad) {
            row = row.add('O.B.T.');
        }
        else {
            row  =row.add({
                settings: {
                    id: 'testTakers',
                    class: 'hidden',
                },
                content: 'Takers'
            });
        }
            row.add('Score');
        return table;
    }
    /**
     * populateRow populates a JTRow object to insert into the table
     * @param row Row item to populate
     * @param rownum ID for the row (may be blank)
     * @param answerModelID ID for the stored answer model
     * @param answertemplate Contents for the answer
     */
    private static populateRow(row: JTRow, rownum: number, answerModelID: string, answertemplate: IAnswerTemplate): void {
        // Fill in the results summary
        const rowID = String(rownum);
        // console.log("Populating row..." + rowID)
        row.attr({ id: 'R' + rowID, 'data-source': answerModelID, 'data-unscored': '1' });
        // Create the buttons (first column of results table)
        const buttons = $('<div/>', { class: 'button-group round shrink' });
        // For the details button we need to store the child html as an attribute
        buttons.append(
            $('<a/>', {
                'data-source': answerModelID,
                type: 'button',
                class: 'pubview button',
                disabled: 'disabled',
            }).text('Details')
        );
        buttons.append(
            $('<a/>', {
                'data-source': answerModelID,
                type: 'button',
                class: 'pubanalyze button',
            }).text('Analyze')
        );

        let userList = '---';

        let displayIdleTime = false;
        let totalIdleTime = 0;
        let idleTimes = " [";
        let scoreValue = 'Calculating...';
        let scoreId = 'score';

        for (let i = 0; i < answertemplate.assigned.length; i++) {
            if (CipherTestResults.isScilympiad) {
                let idleTime = Math.round(answertemplate.assigned[i].idletime / timestampFromSeconds(1));
                if (idleTime >= 10) {
                    displayIdleTime = true;
                }
                totalIdleTime += idleTime;
                let minutes = Math.trunc(idleTime / 60);
                let seconds = idleTime - (minutes * 60);
                if (i > 0) {
                    idleTimes += ' ';
                }
                idleTimes += (minutes + ':' + String(seconds).padStart(2, '0'));
            }
            else {

                if (i > 0) {
                    userList += '\n';
                }
                let user = (answertemplate.assigned[i].displayname === '' ? answertemplate.assigned[i].userid : answertemplate.assigned[i].displayname);
                userList += user
            }
        }
        if (displayIdleTime) {
            idleTimes += ']';
            if (totalIdleTime > 60) {
                let minutes = Math.trunc(totalIdleTime / 60);
                let seconds = totalIdleTime - (minutes * 60);
                userList = minutes + ":" + String(seconds).padStart(2, '0');
            }
            else {
                userList = totalIdleTime + " sec"
            }
            userList += idleTimes;
        }

        let teamName = answertemplate.teamname;
        if (this.isScilympiad) {
            teamName = teamName.replace('Team ', 'C');
            if (this.isNoShowTest(answertemplate.assigned)) {
                scoreValue = 'NS';
                scoreId = 'scoreNS';
            }
        }

        row.add(buttons)
            .add($('<div/>', {
                id: 'teamname',
            }).text(teamName));
        if (!CipherTestResults.isScilympiad) {
            row.add($('<div/>', {
                id: 'teamtype',
            }).text(answertemplate.teamtype));
        }
            row.add($('<div/>', {
                id: 'starttime',
            }).text(timestampToFriendly(answertemplate.starttime))) // Start Time
            .add($('<div/>', {
                id: 'endtime',
            }).text(timestampToFriendly(answertemplate.endtime))) // End Time
            .add($('<div/>', {
                id: 'sovledTime',
            }).text('...')); // Timed question will be filled in after scoring

        let testTakersClass = 'hidden';
        if (CipherTestResults.isScilympiad) {
            testTakersClass = '';
        }
            row.add($('<div/>', {
                id: 'testTakers',
                class: testTakersClass,
            }).text(userList))
            .add($('<div/>', {
                id: scoreId,
            }).text(scoreValue)); // Overall score will be filled in after scoring

        // Store data for CSV export...
        let obt = this.isScilympiad ? userList.substring(0, userList.indexOf('[')).trim() : '';
        let obtx = userList.match(/.*\[(\d+:\d+).*(\d+:\d+).*(\d+:\d+)\]/);
        let obt1 = this.isScilympiad ? (obtx != null ? obtx[1] : '') : '';
        let obt2 = this.isScilympiad ? (obtx != null ? obtx[2] : '') : '';
        let obt3 = this.isScilympiad ? (obtx != null ? obtx[3] : '') : '';
        this.teamData[answertemplate.teamname] = (this.isScilympiad ? teamName : answertemplate.teamname ) + ', ' +
            (this.isScilympiad ? '' : answertemplate.teamtype + ', ') +
            answertemplate.starttime + ', ' +
            answertemplate.endtime + ', ' +
            '##BONUS@TIME##, ' +
            obt + ', ' +
            obt1 + ', ' +
            obt2 + ', ' +
            obt3 + ', ';

    }

    public genTestDetailsTable(itemTest: ITestResultsData, testQuestions: ITestQuestion[]): JQuery<HTMLElement> {

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
                    .add(itemQuestion.incorrectLetters.toString() + ' out of ' +
                        (itemQuestion.correctLetters + itemQuestion.incorrectLetters).toString())
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
                    .add(itemQuestion.incorrectLetters.toString() + ' out of ' +
                        (itemQuestion.correctLetters + itemQuestion.incorrectLetters).toString())
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

        return viewTable.generate();
    }

    /**
     * scoreOne Looks for any unscored tests and scores a single one.  When that single one is
     * scored, it schedules a timer to do the next one.  When there are no more to score
     * it continues the work by breaking all the ties
     * @param modelService Domain Model service object for making requests
     * @param sourceModel Data model for the source of the test containing all the answers
     * @param scheduledTestScores Test scorer to capture scores for all tests in the event
     */
    public scoreOne(modelService: ModelService, sourceModel: SourceModel, scheduledTestScores: CipherTestScorer): void {
        let tosave = $('[data-unscored]');

        if (tosave.length > 0) {
            let elem = $(tosave[0])

            const modelId = elem.attr('data-source');
            // Temporarily change the details button to indicate that we are saving and
            // disable it so it can't be clicked again
            elem.removeAttr("data-unscored")
                .addClass("scoring")
            this.scoreTheTest(modelService, sourceModel, modelId, scheduledTestScores) // returns Promise
                .then(() => {
                    // Clean up the UI
                    elem.removeClass("scoring");
                    setTimeout(() => { this.scoreOne(modelService, sourceModel, scheduledTestScores) }, 1);
                })
                .catch((error) => {
                    elem.removeClass("scoring")
                    this.reportFailure("Error scoring :" + error);
                    setTimeout(() => { this.scoreOne(modelService, sourceModel, scheduledTestScores) }, 1);
                });
        } else {
            // fill in table with questions...
            const scoredTests = scheduledTestScores.scoreTests();
            // Create the detailed results table from the tests after breaking any ties
            scoredTests.forEach((itemTest, indexTest) => {
                // Update the bonus
                let solvedTime = 'No Bonus';
                if (itemTest.bonusTime !== 0) {
                    solvedTime = formatTime(timestampFromSeconds(itemTest.bonusTime));
                }
                // Find the row for this test id
                const selectedTestRow = $('tr[data-source="' + itemTest.testId + '"]')
                selectedTestRow.find('#sovledTime').text(solvedTime);
                // Update the score in case ties were broken and color it
                if (itemTest.isTieBroke) {
                    selectedTestRow.find('#score').text(itemTest.score);
                    selectedTestRow.find('td:last').addClass('tiebreak');
                }
                // Generate details and enable details button
                const details: JQuery<HTMLElement> = this.genTestDetailsTable(itemTest, scoredTests[indexTest].questions);

                // Build a 'row' of CSV data.
                let teamInfo = CipherTestResults.teamData[itemTest.teamname] + itemTest.score + ', ';
                teamInfo = teamInfo.replace('##BONUS@TIME##', String(itemTest.bonusTime));
                CipherTestResults.teamData.delete(itemTest.teamname);

                for (const question of itemTest.questions) {
                    this.dataCSV += teamInfo + question.questionNumber + ', ' + question.points + ', ' + question.cipherType + ', ' +
                        question.incorrectLetters + ', ' + (question.incorrectLetters + question.correctLetters) + ', ' +
                        question.deduction + ', ' + question.score + '\n';
                }

                const selectedTestRowButton = $('a[data-source="' + itemTest.testId + '"]');
                // To get the full html, we need to wrap it and get the innerhtml
                // see https://stackoverflow.com/questions/5744207/jquery-outer-html
                selectedTestRowButton.attr('data-child', $('<div/>').append(details).html());
                // Enable button to display detailed results.
                selectedTestRowButton.removeAttr('disabled');
            });
            const datatable = $('.publist').DataTable({
                // Default DataTable sorting does not handle number + alphas too well...
                // "columnDefs": [
                //     {
                //         "type": "score",
                //         "targets": -1,
                //     }
                // ],
                "paging": false,
                'order': [[(CipherTestResults.isScilympiad ? 6: 7), 'desc']],
            });
//            $.fn.dataTableExt.oSort['score-desc'] = function(x, y)
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
        }
    }
    /**
     * rewindModel rewinds the model until gets to the appropriate time
     * @param datamodel Model to move through
     * @param scrubTime Time to navigate to
     */
    public async rewindModel(datamodel: HistoricalModel, scrubTime: number): Promise<void> {
        while (datamodel.time().valueOf() >= scrubTime + timestampFromSeconds(5) && datamodel.version() > 1) {
            await datamodel.backward(1)
        }
    }
    /**
     * scoreTheTest computes the score for a single test
     * @param modelService Domain Model service object for making requests
     * @param sourcemodel Data model for the source of the test containing all the answers
     * @param modelId ID of answer model to score
     * @param scheduledTestScores Test scorer to capture scores for all tests in the event
     */
    public scoreTheTest(modelService: ModelService, sourcemodel: SourceModel, modelId: string, scheduledTestScores: CipherTestScorer): Promise<void> {

        return new Promise((resolve, reject) => {
            // Open up the model for the history
            modelService.history(modelId).then((datamodel: HistoricalModel) => {
                const elem = $('tr[data-source="' + modelId + '"]').find('#score');

                let model = datamodel.root().value() as IAnswerTemplate;
                // We need to get the solve time from the latest version of the model as it may be something
                // that was edited after the fact to clean things up
                const solvetime = model.answers[0].solvetime;
                let userList = '';

                for (let i = 0; i < model.assigned.length; i++) {
                    if (i > 0) {
                        userList += '\n';
                    }
                    userList += model.assigned[i].displayname;
                }

                // Create a table with this test's detailed results
                const testResultsData: ITestResultsData = {
                    bonusBasis: 0,
                    hasTimed: false,
                    testId: modelId,
                    isTieBroke: false,
                    startTime: timestampToFriendly(model.starttime),
                    endTime: timestampToFriendly(model.endtime),
                    bonusTime: 0,
                    testTakers: userList,
                    score: 0,
                    questions: [],
                    teamname: model.teamname,
                    teamtype: model.teamtype
                };

                let modelTime = datamodel.time().valueOf();
                // See if we have to backup the model to be at the time the test actually ended.
                // We give them 5 seconds of grace just to be nice.
                if (modelTime > (model.endtime + timestampFromSeconds(5))) {
                    elem.text("Scrubbing...");
                    this.rewindModel(datamodel, model.endtime).then(() => {
                        model = datamodel.root().value() as IAnswerTemplate;
                        elem.text("Computing...");
                        this.calculateOneScore(sourcemodel, testResultsData, model.answers, solvetime, model.endtimed, model.starttime);

                        if (CipherTestResults.isNoShowTest(model.assigned)) {
                            testResultsData.score = -2;
                        }
                        scheduledTestScores.addTest(testResultsData);
                        elem.text(testResultsData.score != -2 ? testResultsData.score : 'NS');
                        resolve();
                    });
                } else {
                    elem.text("Computing...");
                    this.calculateOneScore(sourcemodel, testResultsData, model.answers, solvetime, model.endtimed, model.starttime);
                    if (CipherTestResults.isNoShowTest(model.assigned)) {
                        testResultsData.score = -2;
                    }
                    scheduledTestScores.addTest(testResultsData);
                    elem.text(testResultsData.score != -2 ? testResultsData.score : 'NS');
                    resolve();
                }
            })
                .catch((error) => { reject(error) });
        })

    }
    private getCSVData(testResultsData: ITestResultsData) : Array<string> {
        let returnValue = new Array(testResultsData.questions.length + 1);
        returnValue[0] = testResultsData.teamname;
        returnValue[1] = testResultsData.bonusTime;
        returnValue[2] = testResultsData.testTakers;
        returnValue[3] = testResultsData.testTakers;
        returnValue[4] = testResultsData.testTakers;
        returnValue[5] = testResultsData.testTakers;
        returnValue[6] = testResultsData.score;
        returnValue[7] = testResultsData.questions[0];
        return returnValue;
    }
    /**
     * calculateOneScore calculates the score for a single test
     * @param sourcemodel Data model for the source of the test containing all the answers
     * @param testResultsData 
     * @param answers Array of answers from the taken test
     * @param bonusTime 
     * @param bonusWindow 
     * @param bonusEnded 
     * @param startTime 
     */
    private calculateOneScore(sourcemodel: SourceModel, testResultsData: ITestResultsData, answers: ITestQuestionFields[], solvetime: number, bonusEnded: number, startTime: number) {
        let bonusWindow = 0;
        let bonusTime = 0;
        let testScore = 0;
        let scoreInformation = undefined;
        const testInformation = sourcemodel.source['TEST.0'];
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
            const state = sourcemodel.source[question] as IState;
            const ihandler = CipherPrintFactory(state.cipherType, state.curlang);
            ihandler.restore(state, true);
            scoreInformation = ihandler.genScore(answers[0].answer);
            testScore += scoreInformation.score;
            // solvetime is in milliseconds, so needs to be rounded...
            bonusTime = Math.round(solvetime / 1000);
            bonusWindow = (bonusEnded - startTime) / 1000; // remove milliseconds
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
            // Find the right class to render the cipher but questions array does not
            // contain the timed question.
            const question = 'CIPHER.' + questions[i - 1].toString();

            const state = sourcemodel.source[question] as IState;
            const ihandler = CipherPrintFactory(state.cipherType, state.curlang);
            ihandler.restore(state, true);

            try {
                scoreInformation = ihandler.genScore(answer);
                console.log('Answer ' + i + ' (' + answer + '),\n\tscored at: ' +
                    scoreInformation.score.toString() + ' out of ' + state.points);
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

        testResultsData.score = testScore;
        testResultsData.bonusTime = bonusTime;
        return { bonusTime, bonusWindow };
    }

    public gotoTestPlayback(testID: string): void {
        //location.assign('TestPlayback.html?testID=' + String(testID));
        window.open('TestPlayback.html?testID=' + String(testID));
    }

    exportCSVData(): void {
        let resultsCount = $('.testresults tbody').children().length;
        console.log('Exporting CSV data for team count of: ' + resultsCount);
        //  JQuery attempt that did not work out because details are not shown unless the 'Details' button is clicked,
        //  so we can not harvest the question data.
        // let teamRow = new Array<string>();
        // let teamRows : JQuery<HTMLElement> = $('.testresults tbody').children()
        //     .each(function() {
        //         console.log("Team: " + $(this).find('#teamname').text());
        //         $(this).find('.testscores tbody tr').children().each(function() {
        //             // this should be <td>s (children of <tr>)
        //             console.log("TEST: " + $(this).text());
        //         });
        //     });
        //
        const csvFilename = $('#title').text() + '.csv';
        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(this.dataCSV);
        hiddenElement.target = '_blank';
        hiddenElement.download = csvFilename;
        hiddenElement.click();
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
        $('.takerview')
            .off('click')
            .on('click', (e) => {
                const target = $(e.target);
                if (target.attr('showing') === 'on') {
                    $('[id="testTakers"]').addClass('hidden');
                    target.attr('showing', 'off');
                    target.text('Reveal Takers');
                } else {
                    $('[id="testTakers"]').removeClass('hidden');
                    target.attr('showing', 'on');
                    target.text('Hide Takers');
                }
            });
        $('.exportcsv')
            .off('click')
            .on('click', (e) => {
                this.exportCSVData();
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

    /**
     * Determine if the test is a 'no show'...i.e. none of the assigned users logged in to take the test.
     * This is done by checking the display name of all assigned users.  If all assigned users do not
     * have a displayname, then none showed up...therefore 'no show'.
     *
     *  @param assigned : user array for a test
     */
    static isNoShowTest(assigned: ITestUser[]) : boolean {
        let returnValue = true;
        for (let user of assigned) {
            if (user.displayname !== '') {
                returnValue = false;
                break;
            }
        }
        return returnValue;
    }
}
