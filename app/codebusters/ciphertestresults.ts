import { CipherTestManage } from './ciphertestmanage';
import { IState, toolMode } from '../common/cipherhandler';
import {CipherTest, IAnswerTemplate, ITestState, ITestUser, sourceModel} from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import {
    cloneObject,
    formatTime,
    makeCallout, timestampForever,
    timestampFromMinutes,
    timestampFromSeconds,
    timestampToFriendly
} from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import {JTRow, JTTable} from '../common/jttable';
import {ConvergenceDomain, ModelService, RealTimeModel} from '@convergence/convergence';
import { CipherPrintFactory } from './cipherfactory';
import { CipherTestScorer, ITestQuestion, ITestResultsData } from './ciphertestscorer';
import {JTFIncButton} from "../common/jtfIncButton";

/**
 * CipherTestPublished
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <DETAILS> <ANALYZE> Starttime endtime timedquestion takers score
 *  The command buttons available are
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
        // { title: 'Add One', color: 'primary', id: 'addsched' },
        // { title: 'Propagate Time', color: 'primary', id: 'propsched' },
        // { title: 'Import Schedule', color: 'primary', id: 'importsched' },
        // { title: 'Save All', color: 'primary', id: 'savesched' },
        // { title: 'Delete All', color: 'alert', id: 'delallsched' },
    ];

    public testmodelid = undefined;

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

            // this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            //     const modelService = domain.models();
            //     this.scoreOne(modelService);
            // });
            //
        }
        return result;
    }
    /**
     *
     * @param domain Convergence Domain to query against
     * @param sourcemodelid Source test to open
     */
    private openTestSource(modelService: ModelService, sourcemodelid: string): void {
        this.getRealtimeElementMetadata('sourcemodel', sourcemodelid)
            .then((metadata) => {
                const testmodelid = metadata.testid;
                this.testmodelid = testmodelid;
                this.getRealtimeAnswerTemplate(metadata.answerid).then((answertemplate) => {
                    this.answerTemplate = answertemplate;
                    this.findScheduledTests2(modelService, testmodelid, metadata.answerid);
                });
            })
            .catch((error) => {
                this.reportFailure('Could not open model for ' + sourcemodelid + ' Error:' + error);
            });

        //// Below is the old code RTL 2/23/2021

        // this.getRealtimeSource(sourcemodelid).then((sourcemodel: sourceModel) => {
        //
        //     this.findScheduledTests2(modelService, sourcemodel);
        // }).catch((error) => {
        //     this.reportFailure('Could not open model for ' + sourcemodelid + ' Error:' + error);
        // });
    }
    /**
     * findScheduledTests finds all the tests scheduled for a given test template and populates the UI with them
     * @param modelService Domain Model service object for making requests
     * @param testmodelid Test model to find tests for
     * @param answertempateid Answer template to ignore (shouldn't be found)
     */
    public findScheduledTests2(modelService: ModelService, testmodelid: string, answertempateid: string): void {
        const scheduledTestScores: CipherTestScorer = undefined; // RTL new CipherTestScorer();

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
                this.getRealtimeSource(this.state.testID).then((sourceModel) => {
                    this.scoreOne(modelService, sourceModel, scheduledTestScores);
                });
            })
            .catch((error) => {
                this.reportFailure('Convergence API could not query: ' + error);
            });
    }
    public addUITestEntry(answermodelid: string, answertemplate: IAnswerTemplate): string {
        let newRowID = 0;
        if ($('.publist').length === 0) {
            // No table at all so just create one with our row put in it
            const table = this.createTestTable();
            const row = table.addBodyRow();
            this.populateRow(row, newRowID, answermodelid, answertemplate);
            $('.testlist')
                .empty()
                .append(
                    $('<h3/>').text('Results for test: "..."')
                )
                .append(table.generate());
        } else {
            // Find the id of the last row
            const lastid = $('.publist tr:last').attr('id');
            const rowID = Number(lastid.substr(1)) + 1;
            // And create a row with the next ID
            const row = new JTRow();
            this.populateRow(row, rowID, answermodelid, answertemplate);
            newRowID = rowID;
            // And put it into the table
            $('.publist tbody').append(row.generate());
        }
        return String(newRowID)
    }
    /**
     * createTestTable creates the test table for displaying all active tests
     */
    private createTestTable(): JTTable {
        const table = new JTTable({ class: 'cell shrink publist testresults' });
        const row = table.addHeaderRow();
        row.add('Action')
            .add('School')
            .add('Type')
            .add('Start Time')
            .add('End Time')
            .add('Timed Question')
            .add('Takers')
            .add('Score');
        return table;
    }
    /**
     * populateRow populates a JTRow object to insert into the table
     * @param row Row item to populate
     * @param rowID ID for the row (may be blank)
     * @param answerModelID ID for the stored answer model
     * @param answertemplate Contents for the answer
     */
    private populateRow(row: JTRow, rownum: number, answerModelID: string, answertemplate: IAnswerTemplate): void {
        // Fill in the results summary
        const rowID = String(rownum);
        console.log("populating row..." + rowID)
        row.attr({ id: 'R' + rowID, 'data-source': answerModelID, 'data-unscored': '1' });
        // Create the buttons (first column of results table)
        const buttons = $('<div/>', { class: 'button-group round shrink' });
        // For the details button we need to store the child html as an attribute
        buttons.append(
            $('<a/>', {
                'data-source': answerModelID,
                // To get the full html, we need to wrap it and get the innerhtml
                // see https://stackoverflow.com/questions/5744207/jquery-outer-html
// RTL                'data-child': $('<div/>'),
// RTL                   .append(viewTable.generate())
// RTL                   .html(),
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
        let solvedTime = 'No Bonus';
        // if (itemTest.bonusTime !== 0) {
        //     solvedTime = formatTime(timestampFromSeconds(itemTest.bonusTime));
        // }

        let userList = '';
        for (let i = 0; i < answertemplate.assigned.length; i++) {
            if (i > 0) {
                userList += '\n';
            }
            userList += answertemplate.assigned[i].displayname;
        }


        let tieBreakClass = '';
        // if (itemTest.isTieBroke) {
        //     tieBreakClass = 'tiebreak';
        // }
        row.add(buttons)
            .add($( '<div/>', {
                id: 'teamname',
            }).text(answertemplate.teamname))
            .add($('<div/>', {
                id: 'teamtype',
            }).text(answertemplate.teamtype))
            .add($('<div/>', {
                id: 'starttime',
            }).text(timestampToFriendly(answertemplate.starttime))) // Start Time
            .add($('<div/>', {
                id: 'endtime',
            }).text(timestampToFriendly(answertemplate.endtime))) // End Time
            .add($('<div/>', {
                id: 'sovledTime',
            }).text('...')) // Timed question End
            .add($('<div/>', {
                id: 'testTakers',
            }).text(userList))
            .add($('<div/>', {
                id: 'score',
            }).text('Calculating...'));

    // ===================================================================
//        const rowID = String(rownum);
//        row.attr({ id: 'R' + rowID, 'data-source': answerModelID });
//        const buttons = $('<div/>', { class: 'button-group round shrink' });
//        buttons.append(
//            $('<a/>', {
//                type: 'button',
//                class: 'pubdel alert button',
//            }).text('Details')
//        );
//        buttons.append(
//            $('<a/>', {
//                type: 'button',
//                class: 'pubsave primary button',
//                id: 'SV' + rowID,
//                disabled: 'disabled',
//            }).text('Analyze')
//        );
//        const userids = ['', '', ''];
//        for (const i in answertemplate.assigned) {
//            userids[i] = answertemplate.assigned[i].userid;
//        }
//        let testlength = Math.round(
//            (answertemplate.endtime - answertemplate.starttime) / timestampFromMinutes(1)
//        );
//        if (answertemplate.endtime === timestampForever) {
//            testlength = 0;
//        }
//        const timedlength = Math.round(
//            (answertemplate.endtimed - answertemplate.starttime) / timestampFromMinutes(1)
//        );
//        row.add(buttons)
//            .add(
//        $('<div>')
//                    .append($('<input/>', { type: 'text', id: 'U0_' + rowID, value: userids[0] }))
//                    .append($('<input/>', { type: 'text', id: 'U1_' + rowID, value: userids[1] }))
//                    .append($('<input/>', { type: 'text', id: 'U2_' + rowID, value: userids[2] }))
//            )
//            .add(this.dateTimeInput('S_' + rowID, answertemplate.starttime))
//            .add(JTFIncButton('Test Duration', 'D_' + rowID, testlength, 'kval small-1'))
//            .add(JTFIncButton('Timed Limit', 'T_' + rowID, timedlength, 'kval small-1'))
//            .add($('<input/>', { type: 'text', id: 'N_' + rowID, value: answertemplate.teamname }))
//            .add($('<input/>', { type: 'text', id: 'C_' + rowID, value: answertemplate.teamtype }));
    }

    /**
     * Find all the tests scheduled for a given test template
     * @param modelService Domain Model service object for making requests
     * @param sourceModel Contents of the actual test
     */
    public findScheduledTests(modelService: ModelService, sourcemodel: sourceModel): void {
        modelService
            .query("SELECT * FROM codebusters_answers where testid='" + sourcemodel.testid + "'")  // This stays using convergence
            .then((results) => {
                let total = 0;
                let templatecount = 0;
                let table: JTTable = undefined;
                const scheduledTestScores: CipherTestScorer = new CipherTestScorer();

                results.data.forEach((result) => {

                    // answer template not stored in convergence any more, so delete this if()
                    if (result.modelId === sourcemodel.answerid) {
                        templatecount++;
                    } else {
                        if (table === undefined) {
                            table = new JTTable({class: 'cell shrink publist testresults'});
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
                    }
                });


                if (total === 0) {
                    $('.testlist').append(
                        $('<div/>', { class: 'callout warning' }).text(
                            'No tests results available for "' + sourcemodel.source['TEST.0'].title + '"'
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
                            $('<h3/>').text('Results for test: "' + sourcemodel.source['TEST.0'].title + '"')
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

        return viewTable.generate();
    }

    public scoreOne(modelService: ModelService, sourceModel: sourceModel, scheduledTestScores: CipherTestScorer): void {
        let tosave = $('[data-unscored]');

        console.log('scoreOneScheduled count=' + tosave.length)
        if (tosave.length > 0) {
            let elem = $(tosave[0])

            const modelId = elem.attr('data-source');
            // Temporarily change the save button to indicate that we are saving and
            // disable it so it can't be clicked again
            elem.removeAttr("data-unscored")
                .addClass("scoring")
            this.scoreTheTest(modelService, sourceModel, elem, modelId, scheduledTestScores) // returns Promise
                .then(() => {
                    // Clean up the UI
                    elem.removeClass("scoring");
                    setTimeout(() => { this.scoreOne(modelService, sourceModel, scheduledTestScores) }, 1);
                })
                .catch((error) => {
                    elem.removeClass("scoring")
                    this.reportFailure("Error saving :" + error);
                    setTimeout(() => { this.scoreOne(modelService, sourceModel, scheduledTestScores) }, 1);
                });
        } else {
            // Set the test title
            const testTitle = sourceModel.source['TEST.0'].title;
            $('h3:first').text('Results for test: "' + testTitle + '"');
            // fill in table with questions...
            const scoredTests = scheduledTestScores.scoreTests();
            // Create the detailed results table from the tests after breaking any ties
            scoredTests.forEach((itemTest, indexTest) => {
                // Update the bonus
                let solvedTime = 'No Bonus';
                if (itemTest.bonusTime !== 0) {
                    solvedTime = formatTime(timestampFromSeconds(itemTest.bonusTime));
                }
                $('tr[data-source="'+itemTest.testId+'"]').find('#sovledTime').text(solvedTime);
                // Update the score in case ties were broken and color it
                if (itemTest.isTieBroke) {
                    $('tr[data-source="'+itemTest.testId+'"]').find('#score').text(itemTest.score);
                    $('tr[data-source="'+itemTest.testId+'"]').find('td:last').addClass('tiebreak');
                }
                // Generate details and enable details button
                const details: JQuery<HTMLElement> = this.genTestDetailsTable(itemTest, scoredTests[indexTest].questions);

                $('a[data-source="'+itemTest.testId+'"]').attr('data-child',$('<div/>').append(details).html());
                $('a[data-source="'+itemTest.testId+'"]').removeAttr('disabled');
/*
                $('<a/>', {
                    // To get the full html, we need to wrap it and get the innerhtml
                    // see https://stackoverflow.com/questions/5744207/jquery-outer-html
                    'data-child': $('<div/>')
                        .append(viewTable.generate())
                        .html(),
                    type: 'button',
                    class: 'pubview button',
                }).text('Details')
*/
            });
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


            // button details and analyze should be enabled here (start them out disabled)
        }
    }


    public scoreTheTest(modelService, sourcemodel, elem, modelId, scheduledTestScores: CipherTestScorer): Promise<void> {
        // return new Promise((resolve, reject) => {
        //     resolve();
        // });

        return new Promise((resolve, reject) => {


            modelService
                .open(modelId)
                .then((datamodel: RealTimeModel) => {
                    const startTime = datamodel.elementAt('starttime').value();
                    const testStarted = timestampToFriendly(startTime);
                    const endTime = datamodel.elementAt('endtime').value();
                    const testEnded = timestampToFriendly(endTime);
                    const bonusEnded = datamodel.elementAt('endtimed').value();
                    const teamname = datamodel.elementAt('teamname').value();
                    const teamtype = datamodel.elementAt('teamtype').value();
                    const answers = datamodel.elementAt('answers').value();
                    const removed: string[] = [];
                    const added: string[] = [];
                    const users = datamodel.elementAt('assigned').value();
                    let bonusWindow = 0;
                    let bonusTime = 0;

                    const testResultsData: ITestResultsData = {
                        bonusBasis: 0,
                        hasTimed: false,
                        testId: modelId,
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





                    let userList = '';
                                            for (let i = 0; i < users.length; i++) {
                                                if (i > 0) {
                                                    userList += '\n';
                                                }
                                                userList += users[i].displayname;
                                            }

                                            // Create a table with this test's detailed results

                                            // Loop thru questions to tabulate the score.
                                            //console.log("The answer count is: " + answers.length.toString());
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
                                                const state = sourcemodel.source[question];
                                                const ihandler = CipherPrintFactory(state.cipherType, state.curlang);
                                                ihandler.restore(state, true);
                                                scoreInformation = ihandler.genScore(answers[0].answer);
                                                testScore += scoreInformation.score;
                                                // solvetime is in milliseconds, so needs to be rounded...
                                                bonusTime = Math.round(answers[0].solvetime / 1000);
                                                bonusWindow = (bonusEnded - startTime) / 1000; // remove milliseconds
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

                                                const state = sourcemodel.source[question];
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
                                            console.log("before adding test");
                    scheduledTestScores.addTest(testResultsData);
                    console.log("after adding test");
                    $('tr[data-source="'+testResultsData.testId+'"]').find('#score').text(testResultsData.score);
                    resolve();
                })
                .catch((error) => { reject(error) });
        })

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
