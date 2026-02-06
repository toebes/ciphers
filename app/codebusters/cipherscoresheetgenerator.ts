import { IState, ITest, ITestType, testTypeNames } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { sourceTestData } from "./ciphertest";
import * as XLSX_STYLE from "xlsx-js-style";
import * as JSZip from "jszip";

// #region Types and Enums

type FrozenPaneXmlData = {
    xSplit?: number;
    ySplit: number;
    topLeftCell: string;
    activePane: string;
};

type XMLInjectionData = {
    frozenPane: FrozenPaneXmlData;
    xmlSheetPath: string;
};

type QuestionData = {
    "Order": string;
    "Question Number": string;
    "Points": string;
    "Type": string;
    "Special": string;
    "Question": string;
};

type BorderStyle = {
    style: string;
    color: {
        rgb: string;
    }
};

type WorkSheetDataResponse = {
    worksheet: XLSX_STYLE.WorkSheet;
    maxQuestionTypeWidth?: number;
};

type Border = {
    [value in BorderType]?: BorderStyle;
};

type HorizontalAlignment = Alignment.Left | Alignment.Center | Alignment.Right;

type VerticalAlignment = Alignment.Top | Alignment.Center | Alignment.Bottom;

type CellStyle = {
    font?: {
        bold?: boolean;
    };
    alignment?: {
        horizontal?: HorizontalAlignment;
        vertical?: VerticalAlignment;
        wrapText?: boolean;
        textRotation?: number;
    };
    fill?: {
        fgColor?: {
            rgb?: string;
        };
    };
    border?: Border;
    numFmt?: string;
};

enum BorderType {
    Top = "top",
    Left = "left",
    Bottom = "bottom",
    Right = "right"
};

enum Alignment {
    Left = "left",
    Center = "center",
    Right = "right",
    Top = "top",
    Bottom = "bottom"
};

enum SheetType {
    TestQuestions = "Test Questions",
    ScoreEntry = "Score Entry",
    ScoreCalculation = "Score Calculation",
    ScoreSummary = "Score Summary"
}

// #endregion

export default class CipherScoreSheetGenerator {
    // #region Constants

    /**
     * Maximum number of teams per test.
     * @default 100
     */
    private static MAX_TEAMS: number = 100;

    /**
     * Width of the header column in the score sheet.
     * @default 15
     */
    private static HEADER_COL_WIDTH: number = 15;

    /**
     * Width of the timed question column in the score sheet.
     * @default 8
     */
    private static TIMED_QUESTION_COL_WIDTH: number = 8;

    /**
     * Width of the question column in the score sheet.
     * @default 5
     */
    private static QUESTION_COL_WIDTH: number = 5;

    /**
     * The dark gray color used in the score sheet.
     * @default #A5A5A5
     */
    private static DARK_GRAY_COLOR: string = "FFA5A5A5";

    /**
     * The light gray color used in the score sheet.
     * @default #E5E5E5
     */
    private static LIGHT_GRAY_COLOR: string = "FFE5E5E5";

    /**
     * The dull light red color used in the score sheet.
     * @default #FFCCCC
     */
    private static DULL_LIGHT_RED_COLOR: string = "FFF4CCCC";

    /**
     * Maximum number of seconds allowed for the timed bonus question.
     * @default 600 (10 minutes)
     */
    private static MAX_SECONDS_FOR_TIMED_BONUS: number = 600;

    // #endregion

    /**
     * Generates a score sheet based on the given test data.
     * @param {sourceTestData} exportTestData - The test data to generate the score sheet from.
     * @returns {Promise<void>} A promise that resolves when the score sheet is generated.
     */
    public static async generateScoreSheet(exportTestData: sourceTestData, questionOrders: number[]): Promise<void> {

        // should always be the 1st test object
        const testData: ITest =
            exportTestData[Object.keys(exportTestData).filter(key => key.startsWith('TEST')).sort()[0]] as ITest;

        const testType: ITestType = testData.testtype as ITestType;

        const testTitle: string = `${testData.title} ${testTypeNames[testType]} Score Sheet`;

        const workbook: XLSX_STYLE.WorkBook = XLSX_STYLE.utils.book_new();

        const questionData = Object.keys(exportTestData)
            .filter(key => key.startsWith('CIPHER'))
            .map(key => exportTestData[key] as IState);

        // repurpose edit entry as question order
        questionData.forEach((question) =>
            question.editEntry =
            (question.editEntry === testData.timed ?
                0 : (questionOrders.indexOf(question.editEntry) + 1)));

        const questionSheetData: QuestionData[] = questionData
            .sort((a, b) => a.editEntry - b.editEntry)
            .map((question) => ({
                "Order": `${question.editEntry}`,
                "Question Number": question.editEntry === 0 ? "Timed" : `${question.editEntry}`,
                "Points": `${question.points}`,
                "Type": this.getQuestionType(question),
                "Special": question.specialbonus ? "★" : "",
                "Question": question.question.replace(/<[^>]*>/g, ""),
            }));

        // Generate Test Questions Sheet

        const { maxQuestionTypeWidth, worksheet: questionsSheet } = this.generateTestQuestionsSheet(questionSheetData);

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            questionsSheet,
            SheetType.TestQuestions
        );

        // Generates Score Entry Sheet

        const { worksheet: scoreEntrySheet } = this.generateScoreEntrySheet(questionSheetData, maxQuestionTypeWidth, testType);

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            scoreEntrySheet,
            SheetType.ScoreEntry
        );

        // Generates Score Calculation Sheet

        const { worksheet: scoreCalculationSheet } = this.generateScoreCalculationSheet(questionSheetData, maxQuestionTypeWidth, testType);

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            scoreCalculationSheet,
            SheetType.ScoreCalculation
        );

        // Generates Score Summary Sheet

        const { worksheet: scoreSummarySheet } = this.generateScoreSummarySheet(testType, questionSheetData.length);

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            scoreSummarySheet,
            SheetType.ScoreSummary
        );

        // A custom object defining the sheets, their frozen panes, and corresponding xml sheet

        const xmlInjectionDataMap: Map<string, XMLInjectionData> = new Map<string, XMLInjectionData>([
            [
                SheetType.TestQuestions,
                {
                    frozenPane: {
                        ySplit: 1,
                        topLeftCell: "A2",
                        activePane: "bottomLeft"
                    },
                    xmlSheetPath: "xl/worksheets/sheet1.xml"
                }
            ],
            [
                SheetType.ScoreEntry,
                {
                    frozenPane: {
                        xSplit: 1,
                        ySplit: 4,
                        topLeftCell: "B5",
                        activePane: "bottomRight"
                    },
                    xmlSheetPath: "xl/worksheets/sheet2.xml"
                }
            ],
            [
                SheetType.ScoreCalculation,
                {
                    frozenPane: {
                        xSplit: 1,
                        ySplit: 4,
                        topLeftCell: "B5",
                        activePane: "bottomRight"
                    },
                    xmlSheetPath: "xl/worksheets/sheet3.xml"
                }
            ],
            [
                SheetType.ScoreSummary,
                {
                    frozenPane: {
                        xSplit: 1,
                        ySplit: 1,
                        topLeftCell: "B2",
                        activePane: "bottomRight"
                    },
                    xmlSheetPath: "xl/worksheets/sheet4.xml"
                }
            ],
        ]);

        await this.generateAndInjectXmlAsync(workbook, xmlInjectionDataMap, testTitle);
    }

    // #region Sheet Generation Helper Methods

    /**
     * Generates a worksheet containing the test questions data
     * @param questionData The IState objects containing the test question data
     * @returns {WorkSheetDataResponse} An object containing the worksheet and the maximum width of the "Type" column
     */
    private static generateTestQuestionsSheet(questionSheetData: QuestionData[]): WorkSheetDataResponse {
        let maxQuestionTypeWidth = 0;

        const questionsSheet: XLSX_STYLE.WorkSheet = XLSX_STYLE.utils.json_to_sheet(questionSheetData);
        const headerKeys: string[] = Object.keys(questionSheetData[0]);
        const columnsToSize: number = headerKeys.length;
        questionsSheet['!cols'] = [];

        for (let i = 0; i < columnsToSize; i++) {
            const headerKey: string = headerKeys[i];
            const width: number = this.calculateColumnWidth<typeof questionSheetData[number]>(
                questionSheetData,
                headerKey as keyof typeof questionSheetData[number]
            );

            // Set the width for the column index i
            questionsSheet['!cols'][i] = {
                // wch is width-in-characters (approximate)
                wch: width
            };

            if (headerKey === "Type") {
                maxQuestionTypeWidth = width;
            }
        }

        for (let i = 0; i < columnsToSize; i++) {
            const cellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 0, c: i });
            if (!questionsSheet[cellAddress]) {
                questionsSheet[cellAddress] = {};
            }
            const cell = questionsSheet[cellAddress];

            cell.s = this.getHeaderCellStyle(
                this.getStyledBorder(
                    (i === (columnsToSize - 1)) ?
                        [BorderType.Bottom, BorderType.Right] :
                        [BorderType.Bottom]
                ),
                Alignment.Left
            );
        }

        return {
            worksheet: questionsSheet,
            maxQuestionTypeWidth,
        };
    }

    /**
     * Generates a score entry sheet based on the given test data
     * @param {QuestionData[]} questionSheetData - The question data to generate the score sheet from
     * @param {number} maxQuestionTypeWidth - The maximum width of the "Type" column
     * @param {ITestType} testType - The test type to generate the score sheet for
     * @param {boolean} [isTemplate=false]  - Whether to generate the score sheet as a template. Defaults to false.
     * @returns {WorkSheetDataResponse} An object containing the worksheet
     */
    private static generateScoreEntrySheet(questionSheetData: QuestionData[], maxQuestionTypeWidth: number, testType: ITestType, isTemplate: boolean = false): WorkSheetDataResponse {

        const testDivision: string = this.calculateTestDivision(testType);
        const scoreEntrySheet: XLSX_STYLE.WorkSheet = XLSX_STYLE.utils.json_to_sheet([]);
        const headerRowHeightHpt: number = this.calculateRotatedSingleLineHeight(maxQuestionTypeWidth);
        const templateColNumberAdjustment = (!isTemplate ? 1 : 0);

        scoreEntrySheet['!rows'] = [];
        scoreEntrySheet['!cols'] = [];
        scoreEntrySheet['!rows'][0] = { hpt: headerRowHeightHpt };
        scoreEntrySheet['!cols'][1 + templateColNumberAdjustment] = {
            wch: isTemplate ? this.HEADER_COL_WIDTH : (this.HEADER_COL_WIDTH + 2)
        };
        scoreEntrySheet['!cols'][2 + templateColNumberAdjustment] = {
            wch: this.TIMED_QUESTION_COL_WIDTH
        };

        // Ensure the !merges array exists on the sheet
        if (!scoreEntrySheet['!merges']) {
            scoreEntrySheet['!merges'] = [];
        }

        const numberOfTeamsEntryCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 5, c: questionSheetData.length + 4 + templateColNumberAdjustment });

        // add the directions and number of teams
        if (!isTemplate) {
            // add attendance column
            scoreEntrySheet['!cols'][1] = {
                wch: this.QUESTION_COL_WIDTH * 2
            };

            for (let i = 1; i <= this.MAX_TEAMS + 3; i++) {
                const cellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 1 });
                if (!scoreEntrySheet[cellAddress]) {
                    scoreEntrySheet[cellAddress] = {};
                }
                const cell = scoreEntrySheet[cellAddress];
                if (i <= 3) {
                    cell.v = i === 1 ? 'Attendance' : ' ';
                    cell.s = this.getHeaderCellStyle(
                        this.getStyledBorder(i === 3 ? [BorderType.Right, BorderType.Bottom] : [BorderType.Right]),
                        Alignment.Center,
                        Alignment.Center,
                        true
                    );
                }
                else {
                    cell.v = '';
                    cell.s = this.getCellStyle(
                        this.getStyledBorder([BorderType.Top, BorderType.Left, BorderType.Bottom, BorderType.Right]),
                        Alignment.Center,
                        undefined,
                        undefined,
                        false,
                        true
                    );
                }
            }

            // Define the cell merge range for B2:B4
            const attendanceHeaderRange = {
                s: { r: 1, c: 1 },
                e: { r: 3, c: 1 }
            };

            scoreEntrySheet['!cols'][questionSheetData.length + 2 + templateColNumberAdjustment] = {
                wch: 1
            };
            scoreEntrySheet['!cols'][questionSheetData.length + 3 + templateColNumberAdjustment] = {
                wch: this.QUESTION_COL_WIDTH * 5
            };
            scoreEntrySheet['!cols'][questionSheetData.length + 4 + templateColNumberAdjustment] = {
                wch: this.QUESTION_COL_WIDTH * 10
            };

            // number of teams
            const numberOfTeamsCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 5, c: questionSheetData.length + 3 + templateColNumberAdjustment });

            // directions for taking attendance
            const attendanceDirectionsCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 7, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const attendanceDirectionsCellAddress2: string = XLSX_STYLE.utils.encode_cell({ r: 7, c: questionSheetData.length + 4 + templateColNumberAdjustment });
            const keyCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 8, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const noShowKeyCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 9, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const participationKeyCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 10, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const disqualifiedKeyCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 11, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const meaningCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 8, c: questionSheetData.length + 4 + templateColNumberAdjustment });
            const noShowMeaningCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 9, c: questionSheetData.length + 4 + templateColNumberAdjustment });
            const participationMeaningCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 10, c: questionSheetData.length + 4 + templateColNumberAdjustment });
            const disqualifiedMeaningCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 11, c: questionSheetData.length + 4 + templateColNumberAdjustment });

            // directions for entering values for questions
            const questionDirectionsCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 13, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const questionDirectionsCellAddress2: string = XLSX_STYLE.utils.encode_cell({ r: 13, c: questionSheetData.length + 4 + templateColNumberAdjustment });
            const responseCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 14, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const responseCellAddress2: string = XLSX_STYLE.utils.encode_cell({ r: 15, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const responseCellAddress3: string = XLSX_STYLE.utils.encode_cell({ r: 16, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const responseCellAddress4: string = XLSX_STYLE.utils.encode_cell({ r: 17, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const responseCellAddress5: string = XLSX_STYLE.utils.encode_cell({ r: 18, c: questionSheetData.length + 3 + templateColNumberAdjustment });
            const valueCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 14, c: questionSheetData.length + 4 + templateColNumberAdjustment });
            const valueCellAddress2: string = XLSX_STYLE.utils.encode_cell({ r: 15, c: questionSheetData.length + 4 + templateColNumberAdjustment });
            const valueCellAddress3: string = XLSX_STYLE.utils.encode_cell({ r: 16, c: questionSheetData.length + 4 + templateColNumberAdjustment });
            const valueCellAddress4: string = XLSX_STYLE.utils.encode_cell({ r: 17, c: questionSheetData.length + 4 + templateColNumberAdjustment });
            const valueCellAddress5: string = XLSX_STYLE.utils.encode_cell({ r: 18, c: questionSheetData.length + 4 + templateColNumberAdjustment });

            if (!scoreEntrySheet[numberOfTeamsCellAddress]) {
                scoreEntrySheet[numberOfTeamsCellAddress] = {};
            }
            if (!scoreEntrySheet[numberOfTeamsEntryCellAddress]) {
                scoreEntrySheet[numberOfTeamsEntryCellAddress] = {};
            }
            if (!scoreEntrySheet[attendanceDirectionsCellAddress]) {
                scoreEntrySheet[attendanceDirectionsCellAddress] = {};
            }
            if (!scoreEntrySheet[attendanceDirectionsCellAddress2]) {
                scoreEntrySheet[attendanceDirectionsCellAddress2] = {};
            }
            if (!scoreEntrySheet[keyCellAddress]) {
                scoreEntrySheet[keyCellAddress] = {};
            }
            if (!scoreEntrySheet[noShowKeyCellAddress]) {
                scoreEntrySheet[noShowKeyCellAddress] = {};
            }
            if (!scoreEntrySheet[participationKeyCellAddress]) {
                scoreEntrySheet[participationKeyCellAddress] = {};
            }
            if (!scoreEntrySheet[disqualifiedKeyCellAddress]) {
                scoreEntrySheet[disqualifiedKeyCellAddress] = {};
            }
            if (!scoreEntrySheet[meaningCellAddress]) {
                scoreEntrySheet[meaningCellAddress] = {};
            }
            if (!scoreEntrySheet[noShowMeaningCellAddress]) {
                scoreEntrySheet[noShowMeaningCellAddress] = {};
            }
            if (!scoreEntrySheet[participationMeaningCellAddress]) {
                scoreEntrySheet[participationMeaningCellAddress] = {};
            }
            if (!scoreEntrySheet[disqualifiedMeaningCellAddress]) {
                scoreEntrySheet[disqualifiedMeaningCellAddress] = {};
            }
            if (!scoreEntrySheet[questionDirectionsCellAddress]) {
                scoreEntrySheet[questionDirectionsCellAddress] = {};
            }
            if (!scoreEntrySheet[questionDirectionsCellAddress2]) {
                scoreEntrySheet[questionDirectionsCellAddress2] = {};
            }
            if (!scoreEntrySheet[responseCellAddress]) {
                scoreEntrySheet[responseCellAddress] = {};
            }
            if (!scoreEntrySheet[responseCellAddress2]) {
                scoreEntrySheet[responseCellAddress2] = {};
            }
            if (!scoreEntrySheet[responseCellAddress3]) {
                scoreEntrySheet[responseCellAddress3] = {};
            }
            if (!scoreEntrySheet[responseCellAddress4]) {
                scoreEntrySheet[responseCellAddress4] = {};
            }
            if (!scoreEntrySheet[responseCellAddress5]) {
                scoreEntrySheet[responseCellAddress5] = {};
            }
            if (!scoreEntrySheet[valueCellAddress]) {
                scoreEntrySheet[valueCellAddress] = {};
            }
            if (!scoreEntrySheet[valueCellAddress2]) {
                scoreEntrySheet[valueCellAddress2] = {};
            }
            if (!scoreEntrySheet[valueCellAddress3]) {
                scoreEntrySheet[valueCellAddress3] = {};
            }
            if (!scoreEntrySheet[valueCellAddress4]) {
                scoreEntrySheet[valueCellAddress4] = {};
            }
            if (!scoreEntrySheet[valueCellAddress5]) {
                scoreEntrySheet[valueCellAddress5] = {};
            }

            const numberOfTeamsCell = scoreEntrySheet[numberOfTeamsCellAddress];
            const numberOfTeamsEntryCell = scoreEntrySheet[numberOfTeamsEntryCellAddress];
            const attendanceDirectionsCell = scoreEntrySheet[attendanceDirectionsCellAddress];
            const attendanceDirectionsCell2 = scoreEntrySheet[attendanceDirectionsCellAddress2];
            const keyCell = scoreEntrySheet[keyCellAddress];
            const noShowKeyCell = scoreEntrySheet[noShowKeyCellAddress];
            const participationKeyCell = scoreEntrySheet[participationKeyCellAddress];
            const disqualifiedKeyCell = scoreEntrySheet[disqualifiedKeyCellAddress];
            const meaningCell = scoreEntrySheet[meaningCellAddress];
            const noShowMeaningCell = scoreEntrySheet[noShowMeaningCellAddress];
            const participationMeaningCell = scoreEntrySheet[participationMeaningCellAddress];
            const disqualifiedMeaningCell = scoreEntrySheet[disqualifiedMeaningCellAddress];
            const questionDirectionsCell = scoreEntrySheet[questionDirectionsCellAddress];
            const questionDirectionsCell2 = scoreEntrySheet[questionDirectionsCellAddress2];
            const responseCell = scoreEntrySheet[responseCellAddress];
            const responseCell2 = scoreEntrySheet[responseCellAddress2];
            const responseCell3 = scoreEntrySheet[responseCellAddress3];
            const responseCell4 = scoreEntrySheet[responseCellAddress4];
            const responseCell5 = scoreEntrySheet[responseCellAddress5];
            const valueCell = scoreEntrySheet[valueCellAddress];
            const valueCell2 = scoreEntrySheet[valueCellAddress2];
            const valueCell3 = scoreEntrySheet[valueCellAddress3];
            const valueCell4 = scoreEntrySheet[valueCellAddress4];
            const valueCell5 = scoreEntrySheet[valueCellAddress5];

            numberOfTeamsCell.v = 'Number of Teams:';
            numberOfTeamsEntryCell.v = '100';
            attendanceDirectionsCell.v = 'Directions - Enter the following values for the attendance column:';
            attendanceDirectionsCell2.v = ' ';
            keyCell.v = 'Key';
            noShowKeyCell.v = 'NS';
            participationKeyCell.v = 'P';
            disqualifiedKeyCell.v = 'DQ';
            meaningCell.v = 'Meaning';
            noShowMeaningCell.v = 'No Show';
            participationMeaningCell.v = 'Participation';
            disqualifiedMeaningCell.v = 'Disqualified';
            questionDirectionsCell.v = 'Directions - Enter the following values for the following responses on each question:';
            questionDirectionsCell2.v = ' ';
            responseCell.v = 'Response';
            responseCell2.v = 'Fully Solved';
            responseCell3.v = 'Attempted';
            responseCell4.v = 'Attempted but not Solved';
            responseCell5.v = 'Untouched';
            valueCell.v = 'Value';
            valueCell2.v = '0';
            valueCell3.v = 'Number of Letters Incorrect';
            valueCell4.v = '99';
            valueCell5.v = 'Leave Blank';

            numberOfTeamsCell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Top, BorderType.Bottom]),
            );
            numberOfTeamsEntryCell.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Center,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR,
            );
            attendanceDirectionsCell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Top, BorderType.Bottom]),
            );
            attendanceDirectionsCell2.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Right, BorderType.Top, BorderType.Bottom]),
            );
            keyCell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Left
            );
            noShowKeyCell.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Left,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            participationKeyCell.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Left,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            disqualifiedKeyCell.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Left,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            meaningCell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Right
            );
            noShowMeaningCell.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Right,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            participationMeaningCell.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Right,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            disqualifiedMeaningCell.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Right,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            questionDirectionsCell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Top, BorderType.Bottom]),
            );
            questionDirectionsCell2.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Right, BorderType.Top, BorderType.Bottom]),
            );
            responseCell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Left
            );
            responseCell2.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Left,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            responseCell3.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Left,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            responseCell4.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Left,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            responseCell5.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Left,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            valueCell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Left, BorderType.Right, BorderType.Top, BorderType.Bottom]),
                Alignment.Right
            );
            valueCell2.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Right, BorderType.Left, BorderType.Top, BorderType.Bottom]),
                Alignment.Right,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            valueCell3.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Right, BorderType.Left, BorderType.Top, BorderType.Bottom]),
                Alignment.Right,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            valueCell4.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Right, BorderType.Left, BorderType.Top, BorderType.Bottom]),
                Alignment.Right,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );
            valueCell5.s = this.getCellStyle(
                this.getStyledBorder([BorderType.Right, BorderType.Left, BorderType.Top, BorderType.Bottom]),
                Alignment.Right,
                undefined,
                undefined,
                undefined,
                true,
                this.LIGHT_GRAY_COLOR
            );

            // Define the cell merge range for direction cells
            const attendanceDirectionsMergeRange = {
                s: { r: 7, c: questionSheetData.length + 3 + templateColNumberAdjustment },
                e: { r: 7, c: questionSheetData.length + 4 + templateColNumberAdjustment }
            };

            // Define the cell merge range for direction cells
            const questionsDirectionsMergeRange = {
                s: { r: 13, c: questionSheetData.length + 3 + templateColNumberAdjustment },
                e: { r: 13, c: questionSheetData.length + 4 + templateColNumberAdjustment }
            };

            // Add the new merge region to the array
            scoreEntrySheet['!merges'].push(attendanceDirectionsMergeRange, questionsDirectionsMergeRange, attendanceHeaderRange);
        }

        // fill out team numbers
        for (let i = 0; i <= this.MAX_TEAMS + 3; i++) {
            const cellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 0 });
            const timedCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 1 + templateColNumberAdjustment });
            if (!scoreEntrySheet[cellAddress]) {
                scoreEntrySheet[cellAddress] = {};
            }
            if (!scoreEntrySheet[timedCellAddress]) {
                scoreEntrySheet[timedCellAddress] = {};
            }
            const cell = scoreEntrySheet[cellAddress];
            const timedCell = scoreEntrySheet[timedCellAddress];
            if (i <= 3) {
                cell.v = i === 0 ? 'Team Number' : ' ';
                cell.s = this.getHeaderCellStyle(
                    this.getStyledBorder(i === 3 ? [BorderType.Right, BorderType.Bottom] : [BorderType.Right]),
                    Alignment.Center,
                    Alignment.Center,
                    true
                );
            }
            else {
                cell.f = `IF(ROW() - 4 <= ${!isTemplate ? "" : "'Score Entry'!"}${numberOfTeamsEntryCellAddress}, "${testDivision}" & (ROW() - 4), "")`;
                cell.s = this.getHeaderCellStyle(
                    this.getStyledBorder((i === (this.MAX_TEAMS + 3)) ? [BorderType.Right, BorderType.Bottom] : [BorderType.Right]),
                    Alignment.Center,
                    undefined,
                    false,
                    undefined,
                    true,
                    undefined
                );
                timedCell.v = '';
                timedCell.s = this.getCellStyle(
                    undefined,
                    Alignment.Center,
                    undefined,
                    undefined,
                    false,
                    true,
                    this.LIGHT_GRAY_COLOR,
                    "hh:mm"
                );
            }
        }

        // Define the cell merge range for A1:A4
        const mergeRange = {
            s: { r: 0, c: 0 }, // Start cell A1 (r:0, c:0)
            e: { r: 3, c: 0 }  // End cell A4 (r:3, c:0)
        };

        // Add the new merge region to the array
        scoreEntrySheet['!merges'].push(mergeRange);

        // fill out questions
        for (let i = 0; i < questionSheetData.length; i++) {
            const cellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 0, c: i + 2 + templateColNumberAdjustment });
            if (!scoreEntrySheet[cellAddress]) {
                scoreEntrySheet[cellAddress] = {};
            }
            // Use the data item corresponding to the current loop index
            const cell = scoreEntrySheet[cellAddress];
            const dataItem: QuestionData = questionSheetData[i];
            cell.v = `${dataItem.Type}${dataItem.Special}`;

            cell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Top, BorderType.Bottom, BorderType.Right, BorderType.Left]),
                Alignment.Center,
                Alignment.Center,
                false,
                45
            );

            // Set the width for the column index i + 2
            scoreEntrySheet['!cols'][i + 2 + templateColNumberAdjustment] = {
                wch: this.QUESTION_COL_WIDTH
            };
        }

        // fill out mistakes permitted per question
        for (let i = -1; i < questionSheetData.length; i++) {
            const cellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 1, c: i + 2 + templateColNumberAdjustment });
            if (!scoreEntrySheet[cellAddress]) {
                scoreEntrySheet[cellAddress] = {};
            }
            // Use the data item corresponding to the current loop index
            const cell = scoreEntrySheet[cellAddress];
            if (i === -1) {
                cell.v = 'Free Mistakes';
            }
            else {
                const dataItem: QuestionData = questionSheetData[i];
                if (dataItem.Type.toLowerCase().includes("cryptarithm") ||
                    (testDivision === "C" && dataItem.Type.toLowerCase().includes("keyword"))) {
                    cell.v = 0;
                }
                else {
                    cell.v = 2;
                }
            }

            cell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Top, BorderType.Bottom, BorderType.Right, BorderType.Left]),
            );
        }

        // fill out points per question
        for (let i = -1; i < questionSheetData.length; i++) {
            const cellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 2, c: i + 2 + templateColNumberAdjustment });
            if (!scoreEntrySheet[cellAddress]) {
                scoreEntrySheet[cellAddress] = {};
            }
            // Use the data item corresponding to the current loop index
            const cell = scoreEntrySheet[cellAddress];
            if (i === -1) {
                cell.v = 'Points';
            }
            else {
                const dataItem: QuestionData = questionSheetData[i];
                cell.v = dataItem.Points;
            }
            cell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Top, BorderType.Bottom, BorderType.Right, BorderType.Left]),
            );
        }

        // fill out timed question/question # header
        for (let i = -1; i < questionSheetData.length; i++) {
            const cellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 3, c: i + 2 + templateColNumberAdjustment });
            if (!scoreEntrySheet[cellAddress]) {
                scoreEntrySheet[cellAddress] = {};
            }
            // Use the data item corresponding to the current loop index
            const cell = scoreEntrySheet[cellAddress];
            if (i === -1) {
                cell.v = `Timed Question (Max. 10:00)`;
            }
            else {
                const dataItem: QuestionData = questionSheetData[i];
                cell.v = dataItem["Question Number"];
            }
            cell.s = this.getHeaderCellStyle(
                this.getStyledBorder([BorderType.Top, BorderType.Bottom, BorderType.Right, BorderType.Left]),
                Alignment.Center,
                Alignment.Center,
                i === -1
            );
        }

        // Define the final dimensions

        // Since we iterate from r = 0 up to maxTeams + 3 (100 + 3)
        const maxRowIndex: number = this.MAX_TEAMS + 3;
        // Col A (0) and Col B (1) are skipped in the question loop, starting at C (2) from Timed  - Last Question, then add 3 for directions columns
        const maxColIndex: number = questionSheetData.length + 4 + templateColNumberAdjustment;

        // Manually set the !ref property
        scoreEntrySheet['!ref'] = XLSX_STYLE.utils.encode_range({
            // Start at A1 (r:0, c:0)
            s: { r: 0, c: 0 },

            // End at the maximum used row and column
            e: { r: maxRowIndex, c: maxColIndex }
        });

        return {
            worksheet: scoreEntrySheet,
        };
    }

    /**
     * Generate a worksheet containing the score calculation data
     * @param questionSheetData The question data to generate the score sheet from
     * @param maxQuestionTypeWidth The maximum width of the "Type" column
     * @param testType The test type to generate the score sheet for
     * @returns {WorkSheetDataResponse} An object containing the worksheet
     */
    private static generateScoreCalculationSheet(questionSheetData: QuestionData[], maxQuestionTypeWidth: number, testType: ITestType): WorkSheetDataResponse {

        // Use score entry sheet as a template
        const scoreCalculationSheet: XLSX_STYLE.WorkSheet = this.generateScoreEntrySheet(questionSheetData, maxQuestionTypeWidth, testType, true).worksheet;

        for (let i = questionSheetData.length + 2; i <= questionSheetData.length + 4; i++) {
            const cellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 1, c: i });
            const cellAddress2: string = XLSX_STYLE.utils.encode_cell({ r: 2, c: i });
            const cellAddress3: string = XLSX_STYLE.utils.encode_cell({ r: 3, c: i });

            if (!scoreCalculationSheet[cellAddress]) {
                scoreCalculationSheet[cellAddress] = {};
            }
            if (!scoreCalculationSheet[cellAddress2]) {
                scoreCalculationSheet[cellAddress2] = {};
            }
            if (!scoreCalculationSheet[cellAddress3]) {
                scoreCalculationSheet[cellAddress3] = {};
            }

            const cell = scoreCalculationSheet[cellAddress];
            const cell2 = scoreCalculationSheet[cellAddress2];
            const cell3 = scoreCalculationSheet[cellAddress3];

            cell.v = i === questionSheetData.length + 2 ? 'Timed Bonus' : i === questionSheetData.length + 3 ? 'Special Bonus' : 'Final Score';
            cell2.v = ' ';
            cell3.v = ' ';

            const getCustomHeaderStyle = (types?: BorderType[]) => this.getHeaderCellStyle(this.getStyledBorder(types), Alignment.Center, Alignment.Center, true);

            cell.s = getCustomHeaderStyle([BorderType.Top, BorderType.Right, BorderType.Left]);
            cell2.s = getCustomHeaderStyle([BorderType.Right, BorderType.Left]);
            cell3.s = getCustomHeaderStyle([BorderType.Right, BorderType.Left]);

            scoreCalculationSheet['!merges'].push({
                s: { r: 1, c: i },
                e: { r: 3, c: i }
            });
        }

        const numberOfTeamsEntryCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 5, c: questionSheetData.length + 5 });
        const teamNumberConditionFormulaInject = (formula: string): string =>
            `IF(ROW() - 4 <= 'Score Entry'!${numberOfTeamsEntryCellAddress}, ${formula}, "")`;

        // fill out scores
        // Loop through each team and calculate the score
        for (let i = 4; i < this.MAX_TEAMS + 4; i++) {
            // Loop through each question and calculate the score
            for (let j = 1; j <= questionSheetData.length + 4; j++) {
                const cellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: j });
                const translatedCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: j + 1 });
                if (!scoreCalculationSheet[cellAddress]) {
                    scoreCalculationSheet[cellAddress] = {};
                }
                const cell = scoreCalculationSheet[cellAddress];

                // If the question is the timed question
                if (j === 1) {
                    cell.f = teamNumberConditionFormulaInject(`IF('Score Entry'!${translatedCellAddress} = "", "", 'Score Entry'!${translatedCellAddress})`);
                }
                // If the question is the timed bonus
                else if (j === (questionSheetData.length + 2)) {
                    // Calculate the timed bonus points
                    const timeCalcCellAddress = XLSX_STYLE.utils.encode_cell({ r: i, c: 1 });
                    const maxSecondsForTimedBonusAsNumber = `N(TIME(0, ${this.MAX_SECONDS_FOR_TIMED_BONUS}, 0))`;
                    const actualToBestTimeRatio = `(${timeCalcCellAddress} / ${maxSecondsForTimedBonusAsNumber} )`
                    const rawTimedBonus = `(1 - ${actualToBestTimeRatio}) * ${this.MAX_SECONDS_FOR_TIMED_BONUS} * 2`;
                    const timedBonusRawCalc = `MAX(ROUND(${rawTimedBonus}, 5), 0)`;
                    const timedBonusCalc = `IF(TRIM(${timeCalcCellAddress}) <> "", ${timedBonusRawCalc}, 0)`;
                    cell.f = teamNumberConditionFormulaInject(timedBonusCalc);
                    cell.s = this.getCellStyle(
                        undefined,
                        Alignment.Center,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        this.LIGHT_GRAY_COLOR
                    );
                }
                // If the question is the special bonus
                else if (j === (questionSheetData.length + 3)) {
                    // Calculate the special bonus points
                    const bonusQuestions = questionSheetData.filter(q => q.Special);
                    let indexSelector = "1";
                    let indexSelectorValue = ", 0";
                    bonusQuestions.forEach((q, index) => {
                        const calcPointsCellAddress = XLSX_STYLE.utils.encode_cell({ r: i, c: +q.Order + 2 });
                        const maxPointsCellAddress = XLSX_STYLE.utils.encode_cell({ r: 2, c: +q.Order + 2 });
                        indexSelector += ` + IF(TEXT(${calcPointsCellAddress}, "0.00")=TEXT(${maxPointsCellAddress}, "0.00"), 1, 0)`;
                        indexSelectorValue += `, ${50 * (index + 1) * (index + 3)}`;
                    });
                    cell.f = teamNumberConditionFormulaInject(`CHOOSE(${indexSelector}${indexSelectorValue})`);
                    cell.s = this.getCellStyle(
                        undefined,
                        Alignment.Center,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        this.LIGHT_GRAY_COLOR
                    );
                }
                // If the question is the final score
                else if (j === (questionSheetData.length + 4)) {
                    // Calculate the final score
                    const attendanceCellAddress = XLSX_STYLE.utils.encode_cell({ r: i, c: 1 });
                    const scoreCalcCellAddress = XLSX_STYLE.utils.encode_cell({ r: i, c: 2 });
                    const scoreCalcCellAddress2 = XLSX_STYLE.utils.encode_cell({ r: i, c: j - 1 });

                    const scoreCalc = `SUM(${scoreCalcCellAddress}:${scoreCalcCellAddress2})`;
                    const placementCalc = `IF(${scoreCalc} <= 0, "P", ${scoreCalc})`;
                    cell.f = teamNumberConditionFormulaInject(`IF(TRIM('Score Entry'!${attendanceCellAddress}) <> "P", 'Score Entry'!${attendanceCellAddress}, ${placementCalc})`);
                    cell.s = this.getHeaderCellStyle(
                        this.getStyledBorder([BorderType.Right]),
                    );
                }
                // If the question is not the timed question, timed bonus, special bonus, or final score
                else {
                    // Calculate the points for the question
                    const mistakeCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 1, c: j });
                    const pointCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 2, c: j });
                    const calcMistakes = `MAX('Score Entry'!${translatedCellAddress} - ${mistakeCellAddress}, 0)`;
                    const calcMistakePoints = `MIN(${pointCellAddress}, ${calcMistakes} * 100)`;
                    const safePointCalc = `MAX(${pointCellAddress} - ${calcMistakePoints}, 0)`;
                    cell.f = teamNumberConditionFormulaInject(`IF(TRIM('Score Entry'!${translatedCellAddress}) <> "", ${safePointCalc}, 0)`);
                    cell.s = this.getCellStyle(
                        undefined,
                        Alignment.Center,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        this.DULL_LIGHT_RED_COLOR
                    );
                }
            }
        }
        // Define the final dimensions

        // Since we iterate from r = 0 up to maxTeams + 3 (100 + 3)
        const maxRowIndex: number = this.MAX_TEAMS + 3;
        // Col A (0) and Col B (1) are skipped in the question loop, starting at C (2)
        const maxColIndex: number = questionSheetData.length + 4;

        // Manually set the !ref property
        scoreCalculationSheet['!ref'] = XLSX_STYLE.utils.encode_range({
            // Start at A1 (r:0, c:0)
            s: { r: 0, c: 0 },

            // End at the maximum used row and column
            e: { r: maxRowIndex, c: maxColIndex }
        });

        return {
            worksheet: scoreCalculationSheet,
        };
    }

    /**
     * Generate the score summary worksheet.
     * @param {ITestType} testType - The test type.
     * @param {number} numQuestions - The number of questions.
     * @returns {WorkSheetDataResponse} - The score summary worksheet data.
     */
    private static generateScoreSummarySheet(testType: ITestType, numQuestions: number): WorkSheetDataResponse {
        const scoreSummarySheet: XLSX_STYLE.WorkSheet = XLSX_STYLE.utils.json_to_sheet([]);

        const testDivision = this.calculateTestDivision(testType);

        // Set the column widths
        scoreSummarySheet['!cols'] = [];
        scoreSummarySheet['!cols'][0] = { wch: this.TIMED_QUESTION_COL_WIDTH };
        scoreSummarySheet['!cols'][1] = { wch: this.TIMED_QUESTION_COL_WIDTH };
        scoreSummarySheet['!cols'][2] = { wch: this.TIMED_QUESTION_COL_WIDTH };
        scoreSummarySheet['!cols'][3] = { wch: 1 };
        scoreSummarySheet['!cols'][4] = { wch: this.TIMED_QUESTION_COL_WIDTH * 5 };
        scoreSummarySheet['!cols'][5] = { wch: 1 };
        scoreSummarySheet['!cols'][6] = { wch: this.TIMED_QUESTION_COL_WIDTH };
        scoreSummarySheet['!cols'][7] = { wch: this.TIMED_QUESTION_COL_WIDTH };
        scoreSummarySheet['!cols'][8] = { wch: this.TIMED_QUESTION_COL_WIDTH };
        scoreSummarySheet['!cols'][9] = { wch: this.TIMED_QUESTION_COL_WIDTH };
        scoreSummarySheet['!cols'][10] = { wch: this.QUESTION_COL_WIDTH * 2 };

        const numberOfTeamsEntryCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 5, c: numQuestions + 5 });
        const teamNumberConditionFormulaInject = (formula: string): string =>
            `IF(ROW() - 1 <= 'Score Entry'!${numberOfTeamsEntryCellAddress}, ${formula}, "")`;

        // Loop through each team from 0 to MAX_TEAMS
        for (let i = 0; i <= this.MAX_TEAMS; i++) {
            const teamNumberCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 0 });
            const teamFinalScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 1 });
            const teamRankCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 2 });
            const teamRankDisplayCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 4 });
            const baseScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 6 });
            const timedBonusScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 7 });
            const specialBonusCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 8 });
            const bonusScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 9 });
            const tiebreakerCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: 10 });

            // Check if the team exists
            if (!scoreSummarySheet[teamNumberCellAddress]) {
                scoreSummarySheet[teamNumberCellAddress] = {};
            }
            if (!scoreSummarySheet[teamFinalScoreCellAddress]) {
                scoreSummarySheet[teamFinalScoreCellAddress] = {};
            }
            if (!scoreSummarySheet[teamRankCellAddress]) {
                scoreSummarySheet[teamRankCellAddress] = {};
            }
            if (!scoreSummarySheet[teamRankDisplayCellAddress]) {
                scoreSummarySheet[teamRankDisplayCellAddress] = {};
            }
            if (!scoreSummarySheet[baseScoreCellAddress]) {
                scoreSummarySheet[baseScoreCellAddress] = {};
            }
            if (!scoreSummarySheet[timedBonusScoreCellAddress]) {
                scoreSummarySheet[timedBonusScoreCellAddress] = {};
            }
            if (!scoreSummarySheet[specialBonusCellAddress]) {
                scoreSummarySheet[specialBonusCellAddress] = {};
            }
            if (!scoreSummarySheet[bonusScoreCellAddress]) {
                scoreSummarySheet[bonusScoreCellAddress] = {};
            }
            if (!scoreSummarySheet[tiebreakerCellAddress]) {
                scoreSummarySheet[tiebreakerCellAddress] = {};
            }

            // Get the team number, final score, rank, base score, timed bonus, special bonus, bonus score and tiebreaker cells
            const teamNumberCell = scoreSummarySheet[teamNumberCellAddress];
            const teamFinalScoreCell = scoreSummarySheet[teamFinalScoreCellAddress];
            const teamRankCell = scoreSummarySheet[teamRankCellAddress];
            const teamRankDisplayCell = scoreSummarySheet[teamRankDisplayCellAddress];
            const baseScoreCell = scoreSummarySheet[baseScoreCellAddress];
            const timedBonusScoreCell = scoreSummarySheet[timedBonusScoreCellAddress];
            const specialBonusCell = scoreSummarySheet[specialBonusCellAddress];
            const bonusScoreCell = scoreSummarySheet[bonusScoreCellAddress];
            const tiebreakerCell = scoreSummarySheet[tiebreakerCellAddress];

            // If this is the header, set the header style
            if (i === 0) {
                teamNumberCell.v = 'ID';
                teamFinalScoreCell.v = 'Score';
                teamRankCell.v = 'Rank';
                teamRankDisplayCell.v = 'ID - Rank (Score)';
                baseScoreCell.v = 'Base Score';
                timedBonusScoreCell.v = 'Timed Bonus';
                specialBonusCell.v = 'Special Bonus';
                bonusScoreCell.v = 'Bonus Score';
                tiebreakerCell.v = 'Tiebreaker';

                const headerCellStyle = this.getHeaderCellStyle(
                    this.getStyledBorder([BorderType.Bottom, BorderType.Right]),
                    Alignment.Center,
                    Alignment.Center,
                    true
                );
                teamNumberCell.s = headerCellStyle;
                teamFinalScoreCell.s = headerCellStyle;
                teamRankCell.s = headerCellStyle;
                teamRankDisplayCell.s = headerCellStyle;
                baseScoreCell.s = headerCellStyle;
                timedBonusScoreCell.s = headerCellStyle;
                specialBonusCell.s = headerCellStyle;
                bonusScoreCell.s = headerCellStyle;
                tiebreakerCell.s = headerCellStyle;
            }
            else {
                teamNumberCell.f = teamNumberConditionFormulaInject(`"${testDivision}" & (ROW() - 1)`);

                // Calculate the final score and rank
                const scoreCalcFinalScoreAddress: string = XLSX_STYLE.utils.encode_cell({ r: i + 3, c: numQuestions + 4 });
                const noShowCondition = `TRIM('Score Calculation'!${scoreCalcFinalScoreAddress}) <> "NS"`;
                const participationCondition = `TRIM('Score Calculation'!${scoreCalcFinalScoreAddress}) <> "P"`;
                const disqualificationCondition = `TRIM('Score Calculation'!${scoreCalcFinalScoreAddress}) <> "DQ"`;
                const otherCondition = `TRIM(${tiebreakerCellAddress}) <> ""`;
                const scoreAndTiebreakerPresentCalc = `AND(${noShowCondition}, ${participationCondition}, ${disqualificationCondition}, ${otherCondition})`;
                const scoreWithTiebreakerCalc = `SUM('Score Calculation'!${scoreCalcFinalScoreAddress}, ${tiebreakerCellAddress})`;
                teamFinalScoreCell.f = teamNumberConditionFormulaInject(
                    `IF(${scoreAndTiebreakerPresentCalc}, ${scoreWithTiebreakerCalc}, 'Score Calculation'!${scoreCalcFinalScoreAddress})`
                );

                // Calculate the rank
                const teamMinFinalScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 1, c: 1 });
                const teamMaxFinalScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: this.MAX_TEAMS, c: 1 });
                const scoreRange = `${teamMinFinalScoreCellAddress}:${teamMaxFinalScoreCellAddress}`;
                const lastPlaceRank = `COUNTA(${scoreRange})`;
                const rankCalc = `RANK(${teamFinalScoreCellAddress}, ${scoreRange})`;
                const rankCalcWithDq = `IF(TRIM(${teamFinalScoreCellAddress})="DQ", ${lastPlaceRank} + 2, ${rankCalc})`;
                const rankCalcWithNsAndDq = `IF(TRIM(${teamFinalScoreCellAddress})="NS", ${lastPlaceRank} + 1, ${rankCalcWithDq})`;
                teamRankCell.f = teamNumberConditionFormulaInject(
                    `IF(TRIM(${teamFinalScoreCellAddress})="P", ${lastPlaceRank}, ${rankCalcWithNsAndDq})`
                );

                // Calculate the rank display
                const minTeamRankDisplayCellAddress = XLSX_STYLE.utils.encode_cell({ r: 1, c: 3 }); // D2
                const maxTeamRankDisplayCellAddress = XLSX_STYLE.utils.encode_cell({ r: this.MAX_TEAMS, c: 3 }); // D(MAX_TEAMS+1)
                const calcRangeAbs = `$A$2:$C$${this.MAX_TEAMS + 1}`;
                const teamRankDisplayFormula =
                    `_xlfn.INDEX(_xlfn.SORT(${calcRangeAbs}, 3, 1), ROW()-1, 1) & " - " & ` +
                    `_xlfn.INDEX(_xlfn.SORT(${calcRangeAbs}, 3, 1), ROW()-1, 3) & " (" & ` +
                    `_xlfn.INDEX(_xlfn.SORT(${calcRangeAbs}, 3, 1), ROW()-1, 2) & ")"`;

                // master of the shared formula range (top-left)
                teamRankDisplayCell.f = teamNumberConditionFormulaInject(teamRankDisplayFormula);
                // keep the shared range so Excel knows this formula applies to all rows
                teamRankDisplayCell.F = `${minTeamRankDisplayCellAddress}:${maxTeamRankDisplayCellAddress}`;

                // Calculate the base score and timed/special bonus scores
                const scoreCalcBaseScoreAddress1: string = XLSX_STYLE.utils.encode_cell({ r: i + 3, c: 2 });
                const scoreCalcBaseScoreAddress2: string = XLSX_STYLE.utils.encode_cell({ r: i + 3, c: numQuestions + 1 });
                baseScoreCell.f = teamNumberConditionFormulaInject(
                    `SUM('Score Calculation'!${scoreCalcBaseScoreAddress1}:'Score Calculation'!${scoreCalcBaseScoreAddress2})`
                );

                const scoreCalcTimedBonusScoreAddress: string = XLSX_STYLE.utils.encode_cell({ r: i + 3, c: numQuestions + 2 });
                const scoreCalcSpecialBonusScoreAddress: string = XLSX_STYLE.utils.encode_cell({ r: i + 3, c: numQuestions + 3 });

                timedBonusScoreCell.f = teamNumberConditionFormulaInject(`'Score Calculation'!${scoreCalcTimedBonusScoreAddress}`);
                specialBonusCell.f = teamNumberConditionFormulaInject(`'Score Calculation'!${scoreCalcSpecialBonusScoreAddress}`);
                bonusScoreCell.f = teamNumberConditionFormulaInject(`SUM(${timedBonusScoreCellAddress}:${specialBonusCellAddress})`);
                tiebreakerCell.v = " ";

                // Set the team number, final score, rank, base score, timed/special bonus scores and tiebreaker cell styles
                teamNumberCell.s = this.getHeaderCellStyle(this.getStyledBorder([BorderType.Bottom, BorderType.Top]));

                const getScoreCellStyle = (types: BorderType[]) => this.getCellStyle(
                    this.getStyledBorder(types),
                    Alignment.Center,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    this.LIGHT_GRAY_COLOR
                );

                teamFinalScoreCell.s = getScoreCellStyle([BorderType.Bottom, BorderType.Top]);
                teamRankCell.s = getScoreCellStyle([BorderType.Bottom, BorderType.Top, BorderType.Right]);
                teamRankDisplayCell.s = getScoreCellStyle([BorderType.Bottom, BorderType.Top, BorderType.Right, BorderType.Left]);
                baseScoreCell.s = getScoreCellStyle([BorderType.Bottom, BorderType.Top, BorderType.Left]);
                timedBonusScoreCell.s = getScoreCellStyle([BorderType.Bottom, BorderType.Top]);
                specialBonusCell.s = getScoreCellStyle([BorderType.Bottom, BorderType.Top]);
                bonusScoreCell.s = getScoreCellStyle([BorderType.Bottom, BorderType.Top]);
                tiebreakerCell.s = getScoreCellStyle([BorderType.Bottom, BorderType.Top, BorderType.Right]);
            }
        }

        // Define the final dimensions
        const maxRowIndex: number = this.MAX_TEAMS;
        const maxColIndex: number = 10;

        // Manually set the !ref property
        scoreSummarySheet['!ref'] = XLSX_STYLE.utils.encode_range({
            // Start at A1 (r:0, c:0)
            s: { r: 0, c: 0 },

            // End at the maximum used row and column
            e: { r: maxRowIndex, c: maxColIndex }
        });

        return {
            worksheet: scoreSummarySheet,
        };
    }

    // #endregion

    // #region Helpers

    /**
     * Gets the question type based on the cipher type and encode type.
     * @example If the cipher type is Aristocrat and the encode type is K1, the returned string will be "Aristocrat K1".
     * @param {IState} question - The question object.
     * @returns {string} The question type as a string.
     */
    private static getQuestionType(question: IState): string {
        // Create a reverse map of ICipherType
        // This map will have the values of ICipherType as keys, and the corresponding key as the value
        const cipherTypeReverseMap: { [key: string]: string } = Object.keys(ICipherType).reduce((prev, key) => {
            const value = ICipherType[key as keyof typeof ICipherType];
            prev[value] = key;
            return prev;
        }, {} as { [key: string]: string });

        // Get the question type based on the cipher type and encode type
        // If the cipher type is Aristocrat and the encode type is K1, the returned string will be "Aristocrat K1"
        const questionType: string = `${question.misspelled ? "Misspelled " : ""}${cipherTypeReverseMap[question.cipherType]}${question.encodeType ?
            question.encodeType.charAt(0).toUpperCase() + question.encodeType.slice(1) : ""}${question.operation ?
                question.operation.charAt(0).toUpperCase() + question.operation.slice(1) : ""}`;
        // Replace all uppercase letters with " $1" and trim the result
        // the regex pattern will match any uppercase letter that is not at the start of a string
        return questionType.replace(/(?<!^)([A-Z])/g, ' $1').trim().replace(/\$1/g, '');
    }

    /**
     * Helper function to find the maximum character width for a given column
     * Iterates through all data objects (rows) and compares the length of the cell value
     * at the given column index to find the maximum width.
     * @example If the header key is "name", and the cell value is "John Doe",
     * the result will be 10 (⌈length of "John Doe" + 5%⌉ (minimum width of 10) characters for padding).
     * @typeparam The type of the data objects in the array (data).
     * @param {T[]} data - The array of data objects (rows).
     * @param {keyof T} headerKey - The key to use to get the cell value.
     * @returns {number} The maximum character width for the given column.
     */
    private static calculateColumnWidth<T>(data: T[], headerKey: keyof T): number {
        let maxWidth: number = String(headerKey).length; // Start with the header length

        // Iterate through all data objects (rows)
        data.forEach(row => {
            // Use the header key to get the cell value
            const cellValue: T[keyof T] = row[headerKey];

            if (cellValue !== undefined && cellValue !== null) {
                // Calculate length (using simple string length for approximation)
                const length: number = String(cellValue).length;
                if (length > maxWidth) {
                    maxWidth = length;
                }
            }
        });

        // Add padding (e.g., 2 characters) for better aesthetics, minimum width 10
        return Math.max(Math.ceil(maxWidth * 1.05), 10);
    }

    /**
     * Returns the division letter for a given test type.
     * @param {ITestType} testType - The test type to get the division letter for.
     * @returns {string} The division letter for the given test type.
     */
    private static calculateTestDivision(testType: ITestType): string {
        switch (testType) {
            case ITestType.cstate:
            case ITestType.cregional:
                // Division C test
                return 'C';
            case ITestType.bstate:
            case ITestType.bregional:
                // Division B test
                return 'B';
            case ITestType.aregional:
            case ITestType.astate:
                // Division A test
                return 'A';
            case ITestType.None:
            default:
                // No division (e.g., sample test)
                return '';
        }
    }

    /**
     * Helper function to calculate the required row height in points (hpt) for a cell 
     * with a SINGLE LINE of text rotated 45 degrees.
     *
     * @param {number} columnWidthWch - The calculated column width in characters (wch) for this column.
     * @param {number} [fontSizePt=11] - The font size in points (defaults to 11). 
     * @returns {number} The required row height in points (hpt) for the single, rotated line.
     */
    private static calculateRotatedSingleLineHeight(
        columnWidthWch: number,
        fontSizePt: number = 11
    ): number {
        // Define Point Metrics
        const PADDING_PT: number = 4;
        const SINGLE_LINE_HEIGHT_PT: number = fontSizePt + PADDING_PT; // e.g., 15 points

        // Estimate Character Width in Points
        // This factor converts character units (wch) back into points.
        // An average character is roughly 6 points wide for 11pt Calibri.
        const AVG_CHAR_WIDTH_PT: number = 6;

        // Apply Rotation Heuristic (45 degrees)
        // The height required for the rotated text is the length of the text 
        // projected onto the vertical axis. Since the text is a single line, 
        // its length is what matters. We use the column's WCH width as the max length proxy.

        // The total length of the text in points (horizontal space it would occupy unrotated)
        const textLengthPt: number = columnWidthWch * AVG_CHAR_WIDTH_PT;

        // The vertical space needed for 45-degree rotation is proportional to the text's horizontal length.
        const rotationFactor: number = Math.sin(Math.PI / 4); // sin(45 degrees) ≈ 0.707

        const requiredHeightFromRotation: number = textLengthPt * rotationFactor;

        // Final Height Calculation
        // The final height is the maximum of the default single-line height and the space needed for rotation.
        return Math.max(SINGLE_LINE_HEIGHT_PT, Math.ceil(requiredHeightFromRotation));
    }

    /**
     * Utility to trigger a download from a Blob.
     * This replaces the functionality of XLSX_STYLE.writeFile() for raw buffers.
     * The provided blob will be downloaded as a file with the given filename.
     * @param {Blob} blob - The blob object to download.
     * @param {string} filename - The filename to use for the downloaded file.
     */
    private static downloadFileBlob = (blob: Blob, filename: string) => {
        // Create a URL for the blob object
        const url: string = URL.createObjectURL(blob);
        // Create a temporary <a> element to trigger the download
        const a: HTMLAnchorElement = document.createElement('a');
        a.href = url;
        a.download = filename;
        // Add the temporary element to the body
        document.body.appendChild(a);
        // Trigger the click event to download the file
        a.click();
        // Remove the temporary element from the body
        document.body.removeChild(a);
        // Revoke the URL to free up resources
        URL.revokeObjectURL(url);
    }

    /**
     * Generates an XLSX file, injects custom XML content into each sheet as defined per custom dictionary, 
     * and returns the final file content as a Blob file.
     * @param {XLSX_STYLE.WorkBook} wb - The Workbook object to modify with frozen panes and generate a XLSX file from.
     * @param {Map<string, XMLInjectionData>} xmlInjectionDataMap - A custom dictionary containing the target sheet path and the corresponding XMLInjectionData.
     * @param {string} testTitle - The title of the test, used for generating the file name.
     * @returns {Promise<void>} - Resolves when the file download is triggered.
     */
    public static async generateAndInjectXmlAsync(
        wb: XLSX_STYLE.WorkBook, xmlInjectionDataMap: Map<string, XMLInjectionData>, testTitle: string
    ): Promise<void> {
        // Output as a base64 string, suitable for JSZip
        const wboutBase64 = XLSX_STYLE.write(wb, {
            bookType: 'xlsx',
            type: 'base64'
        });

        // Load the Workbook into JSZip
        const zip = await JSZip.loadAsync(wboutBase64, { base64: true });

        // Iterate through the custom dictionary
        await Promise.all(Array.from(xmlInjectionDataMap.values()).map(async (xmlInjectionData: XMLInjectionData) => {
            const targetFile = xmlInjectionData.xmlSheetPath;

            // Modify the Target XML File
            const zipEntry: JSZip.JSZipObject = zip.file(targetFile);

            if (!zipEntry) {
                throw new Error(`Target file ${targetFile} not found in the workbook.`);
            }

            // Read the existing XML content
            let sheetXmlContent: string = await zipEntry.async("text");

            // Matches <sheetViews>...content...</sheetViews> across multiple lines (using [^]*? for dotAll mode compatibility)
            const sheetViewsRegex: RegExp = /<sheetViews>[^]*?<\/sheetViews>/;

            // Check for existing <sheetViews> tags, should always exist...
            if (sheetXmlContent.match(sheetViewsRegex)) {
                // Custom XML for Frozen Panes (A common feature requiring XML injection)
                const frozenPaneXml = `
                    <sheetViews>
                        <sheetView workbookViewId="0">
                            <pane ${xmlInjectionData.frozenPane.xSplit ? `xSplit="${xmlInjectionData.frozenPane.xSplit}" ` : ""}ySplit="${xmlInjectionData.frozenPane.ySplit}" topLeftCell="${xmlInjectionData.frozenPane.topLeftCell}" activePane="${xmlInjectionData.frozenPane.activePane}" state="frozen"/>
                        </sheetView>
                    </sheetViews>`;
                // If it exists, replace the entire block with the new XML
                sheetXmlContent = sheetXmlContent.replace(sheetViewsRegex, frozenPaneXml);
            }

            // Overwrite the file in the ZIP archive
            zip.file(targetFile, sheetXmlContent);
        }));

        // Compile the modified ZIP archive into a Blob for browser download
        const finalContent: Blob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE"
        });

        // Use the custom utility to trigger the file download from the correct Blob
        this.downloadFileBlob(finalContent, `${testTitle}.xlsx`);
    }

    /**
     * Returns a Border object with the specified types, style and color.
     * @param {BorderType[]} types - The types of borders to generate. Defaults to no border types.
     * @param {string} [style="medium"] - The style of the border. Defaults to medium.
     * @param {string} [color="FF000000"] - The color of the border in ARGB format. Defaults to black.
     * @returns {Border} - The generated Border object.
     */
    private static getStyledBorder(types: BorderType[] = [], style: string | undefined = "medium", color: string = "FF000000"): Border {
        const border: Border = {};
        types.forEach((type: BorderType) => {
            border[type] = {
                style,
                color: { rgb: color } // Default Black color (ARGB format)
            };
        });
        return border;
    }

    /**
     * Generates a CellStyle object with the specified border, alignment, text rotation, wrapping, boldness, and fill color.
     * @param {Border} [border=this.getStyledBorder([BorderType.Top, BorderType.Left, BorderType.Bottom, BorderType.Right])] - The border style to apply to the cell. Defaults to all borders.
     * @param {HorizontalAlignment} [horizontalAlignment=Alignment.Center] - The horizontal alignment to apply to the cell. Defaults to center.
     * @param {VerticalAlignment} [verticalAlignment=Alignment.Center] - The vertical alignment to apply to the cell. Defaults to center.
     * @param {boolean} [wrapText=false] - Whether to wrap the text in the cell. Defaults to false.
     * @param {number} [textRotation=undefined] - The text rotation to apply to the cell. Defaults to undefined.
     * @param {boolean} [bold=true] - Whether to make the text in the cell bold. Defaults to true.
     * @param {string} [fillColor="FFA5A5A5"] - The fill color to apply to the cell. Defaults to "FFA5A5A5".
     * @returns {CellStyle} - The generated CellStyle object. 
     */
    private static getHeaderCellStyle(
        border: Border = this.getStyledBorder([BorderType.Top, BorderType.Left, BorderType.Bottom, BorderType.Right]),
        horizontalAlignment: HorizontalAlignment | undefined = Alignment.Center,
        verticalAlignment: VerticalAlignment | undefined = Alignment.Center,
        wrapText: boolean | undefined = false,
        textRotation: number | undefined = undefined,
        bold: boolean | undefined = true,
        fillColor: string = this.DARK_GRAY_COLOR,
    ): CellStyle {
        return this.getCellStyle(border, horizontalAlignment, verticalAlignment, textRotation, wrapText, bold, fillColor);
    }

    /**
     * Generates a CellStyle object with the specified border, alignment, text rotation, wrapping, boldness, fill color, and number format.
     * @param {Border} [border=undefined] - The border style to apply to the cell. Defaults to no border.
     * @param {HorizontalAlignment} [horizontalAlignment=Alignment.Center] - The horizontal alignment to apply to the cell. Defaults to center.
     * @param {VerticalAlignment} [verticalAlignment=Alignment.Center] - The vertical alignment to apply to the cell. Defaults to center.
     * @param {number} [textRotation=undefined] - The text rotation to apply to the cell. Defaults to undefined.
     * @param {boolean} [wrapText=false] - Whether to wrap the text in the cell. Defaults to false.
     * @param {boolean} [bold=false] - Whether to make the text in the cell bold. Defaults to false.
     * @param {string} [fillColor=undefined] - The fill color to apply to the cell. Defaults to undefined.
     * @param {string} [numFmt=undefined] - The number format to apply to the cell. Defaults to undefined.
     * @returns {CellStyle} - The generated CellStyle object.
     */
    private static getCellStyle(
        border: Border | undefined,
        horizontalAlignment: HorizontalAlignment | undefined = Alignment.Center,
        verticalAlignment: VerticalAlignment | undefined = Alignment.Center,
        textRotation: number | undefined = undefined,
        wrapText: boolean | undefined = false,
        bold: boolean | undefined = false,
        fillColor: string | undefined = undefined,
        numFmt: string | undefined = undefined
    ): CellStyle {
        return {
            font: (bold ? { bold } : undefined),
            alignment: (horizontalAlignment || verticalAlignment || wrapText || textRotation ?
                {
                    horizontal: horizontalAlignment,
                    vertical: verticalAlignment,
                    textRotation,
                    wrapText
                }
                : undefined
            ),
            fill: (fillColor ?
                {
                    fgColor: {
                        rgb: fillColor
                    }
                }
                : undefined
            ),
            border,
            numFmt,
        };
    }

    // #endregion
}

