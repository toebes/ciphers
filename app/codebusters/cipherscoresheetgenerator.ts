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

type TableCell = {
    v?: string;
    s?: CellStyle;
    f?: string;
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
    ScoreSummary = "Score Summary",
    ScoreAnalysis = "Score Analysis",
    SuccessCorrelationAnalysis = "Success Correlation Analysis",
    AttemptCorrelationAnalysis = "Attempt Correlation Analysis",
    CorrelationSummary = "Correlation Summary",
    ScoreCalcSummary = "Score Calc Summary",
    TimedBonus = "Timed Bonus",
    ScoreClusters = "Score Clusters",
    TimedDifferential = "Timed Differential",

}

// #endregion

export default class CipherScoreSheetGenerator {
    // #region Constants

    // Account for Team Number, Total Score, Attendance, Timed Question Calculation and Blank colum
    private static SCORE_ENTRY_EXTRA: number = 5;

    private static HEADER_ROWS: number = 4;
    /**
     * Maximum number of teams per test.
     * @default 100
     */
    private static MAX_TEAMS: number = 100;

    /**
     * Deduction per question (depending on the divison, 50 for A, 100 for B/C).
     * @default 100
     */
    private static MAX_Q_DEDUCTION: number = 100;

    /**
     * Width of the header column in the score sheet.
     * @default 15
     */
    private static HEADER_COL_WIDTH: number = 15;

    /**
     * Width of the timed question column in the score sheet.
     * @default 16
     */
    private static TIMED_QUESTION_COL_WIDTH: number = 16;

    /**
     * Width of the question column in the score sheet.
     * @default 5
     */
    private static QUESTION_COL_WIDTH: number = 5;
    /**
     * Width of the question column in the score sheet.
     * @default 7
     */
    private static SUMMARY_COL_WIDTH: number = 7;

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

    private static readonly STYLE_HEADER_BORDER_R = this.makeStyle("R", { bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_BR = this.makeStyle("BR", { bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_B_HLEFT = this.makeStyle("B", { horizontal: Alignment.Left, bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_BR_HLEFT = this.makeStyle("BR", { horizontal: Alignment.Left, bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_ALL_ROT45 = this.makeStyle("ALL", { bold: true, fillColor: this.DARK_GRAY_COLOR, textRotation: 45 });
    private static readonly STYLE_HEADER_BORDER_ALL = this.makeStyle("ALL", { bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_ALL_VBOT = this.makeStyle("ALL", { vertical: Alignment.Bottom, bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_ALL_WRAP = this.makeStyle("ALL", { bold: true, fillColor: this.DARK_GRAY_COLOR, wrapText: true });
    private static readonly STYLE_HEADER_BORDER_BR_VBOT_WRAP = this.makeStyle("BR", { vertical: Alignment.Bottom, bold: true, fillColor: this.DARK_GRAY_COLOR, wrapText: true });
    private static readonly STYLE_HEADER_BORDER_NONE_VBOT_WRAP = this.makeStyle("NONE", { vertical: Alignment.Bottom, bold: true, fillColor: this.DARK_GRAY_COLOR, wrapText: true });
    private static readonly STYLE_HEADER_BORDER_R_VBOT_WRAP = this.makeStyle("R", { vertical: Alignment.Bottom, bold: true, fillColor: this.DARK_GRAY_COLOR, wrapText: true });
    private static readonly STYLE_HEADER_BORDER_TBL = this.makeStyle("TBL", { bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_HRIGHT_TL = this.makeStyle("TL", { horizontal: Alignment.Right, bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_HRIGHT_L = this.makeStyle("L", { horizontal: Alignment.Right, bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_HRIGHT_BL = this.makeStyle("BL", { horizontal: Alignment.Right, bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_TBR = this.makeStyle("TBR", { bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_TB = this.makeStyle("TB", { bold: true, fillColor: this.DARK_GRAY_COLOR });
    private static readonly STYLE_HEADER_BORDER_ALL_HLEFT = this.makeStyle("ALL", { bold: true, fillColor: this.DARK_GRAY_COLOR, horizontal: Alignment.Left });
    private static readonly STYLE_HEADER_BORDER_ALL_HRIGHT = this.makeStyle("ALL", { bold: true, fillColor: this.DARK_GRAY_COLOR, horizontal: Alignment.Right });


    private static readonly STYLE_BORDER_ALL_GRAY = this.makeStyle("ALL", { fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BORDER_ALL_BOLD_GRAY = this.makeStyle("ALL", { bold: true, fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BORDER_ALL_HLEFT_BOLD_GRAY = this.makeStyle("ALL", { horizontal: Alignment.Left, bold: true, fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY = this.makeStyle("ALL", { horizontal: Alignment.Right, bold: true, fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_RED = this.makeStyle("NONE", { fillColor: this.DULL_LIGHT_RED_COLOR });
    private static readonly STYLE_GRAY_FMT0 = this.makeStyle("NONE", { fillColor: this.LIGHT_GRAY_COLOR, numFmt: "0" });
    private static readonly STYLE_BORDER_TR_HRIGHT_GRAY_FMT0 = this.makeStyle("TR", { horizontal: Alignment.Right, fillColor: this.LIGHT_GRAY_COLOR, numFmt: "0" });
    private static readonly STYLE_BORDER_R_HRIGHT_GRAY = this.makeStyle("R", { horizontal: Alignment.Right, fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BORDER_BR_HRIGHT_GRAY_FMTPCT = this.makeStyle("BR", { horizontal: Alignment.Right, fillColor: this.LIGHT_GRAY_COLOR, numFmt: "0.00%" });
    private static readonly STYLE_GRAY = this.makeStyle("NONE", { fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BOLD_GRAY_FMTTIME = this.makeStyle("NONE", { bold: true, fillColor: this.LIGHT_GRAY_COLOR, numFmt: "hh:mm" });
    private static readonly STYLE_BORDER_RL_GREY = this.makeStyle("RL", { fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BORDER_RL_GREY_FMT3DEC = this.makeStyle("RL", { fillColor: this.LIGHT_GRAY_COLOR, numFmt: "0.000" });
    private static readonly STYLE_BORDER_BRL_GREY = this.makeStyle("BRL", { fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BORDER_TB_GRAY = this.makeStyle("TB", { fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BORDER_NONE_GRAY = this.makeStyle("NONE", { fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BORDER_TBL_GRAY = this.makeStyle("TBL", { fillColor: this.LIGHT_GRAY_COLOR });
    private static readonly STYLE_BORDER_TBR_GRAY = this.makeStyle("TBR", { fillColor: this.LIGHT_GRAY_COLOR });

    /**
     * Generates a score sheet based on the given test data.
     * This creates the base score sheet document and all of the contained worksheets
     * @param {sourceTestData} exportTestData - The test data to generate the score sheet from.
     * @returns {Promise<void>} A promise that resolves when the score sheet is generated.
     */
    public static async generateScoreSheet(exportTestData: sourceTestData, questionOrders: number[]): Promise<void> {

        // should always be the 1st test object
        const testData: ITest =
            exportTestData[Object.keys(exportTestData).filter(key => key.startsWith('TEST')).sort()[0]] as ITest;

        const testType: ITestType = testData.testtype as ITestType;

        if (testType === ITestType.aregional || testType === ITestType.astate) {
            this.MAX_Q_DEDUCTION = 50;
        }

        const testTitle: string = `${testData.title} ${testTypeNames[testType]} Score Sheet`;
        const testDivision: string = this.calculateTestDivision(testType);

        const workbook: XLSX_STYLE.WorkBook = XLSX_STYLE.utils.book_new();
        // Initialize workbook metadata and named ranges
        workbook.Workbook ??= {};
        workbook.Workbook.Names ??= [];

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

        const { worksheet: scoreEntrySheet } = this.generateScoreEntrySheet(questionSheetData, maxQuestionTypeWidth, testDivision, this.MAX_TEAMS, true);
        // add attendance column
        const numberOfTeamsCol = questionSheetData.length + this.SCORE_ENTRY_EXTRA + 1;
        const numberOfTeamsRow = 5;
        const numberOfTeamsEntryCellAddress = `$${XLSX_STYLE.utils.encode_col(numberOfTeamsCol)}$${XLSX_STYLE.utils.encode_row(numberOfTeamsRow)}`;
        workbook.Workbook.Names.push({
            Name: "NumberOfTeams",
            Ref: `'Score Entry'!${numberOfTeamsEntryCellAddress}`
        });

        CipherScoreSheetGenerator.ScoreSheetDirections(scoreEntrySheet, questionSheetData);

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            scoreEntrySheet,
            SheetType.ScoreEntry
        );

        // Generates Score Calculation Sheet

        const { worksheet: scoreCalculationSheet } = this.generateScoreCalculationSheet(questionSheetData, maxQuestionTypeWidth, testDivision);

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            scoreCalculationSheet,
            SheetType.ScoreCalculation
        );

        // Generates Score Summary Sheet

        const { worksheet: scoreSummarySheet } = this.generateScoreSummarySheet(testDivision, questionSheetData.length);

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            scoreSummarySheet,
            SheetType.ScoreSummary
        );

        // Generates Score Summary Sheet

        const { worksheet: scoreAnalysisSheet } = this.generateScoreAnalysisSheet(questionSheetData, maxQuestionTypeWidth, testDivision);

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            scoreAnalysisSheet,
            SheetType.ScoreAnalysis
        );

        const { worksheet: SuccessCorrelationAnalysis } = this.generateSuccessCorrelationAnalysisSheet(questionSheetData, maxQuestionTypeWidth, testDivision);

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            SuccessCorrelationAnalysis,
            SheetType.SuccessCorrelationAnalysis
        );
        // AttemptCorrelationAnalysis = "Attempt Correlation Analysis",
        // CorrelationSummary = "Correlation Summary",
        // ScoreCalcSummary = "Score Calc Summary",
        // TimedBonus = "Timed Bonus",
        // ScoreClusters = "Score Clusters",
        // TimedDifferential = "Timed Differential",
        // A custom object defining the sheets, their frozen panes, and corresponding xml sheet

        const xmlInjectionDataMap: Map<string, XMLInjectionData> = new Map<string, XMLInjectionData>([
            [SheetType.TestQuestions, {
                frozenPane: {
                    ySplit: 1,
                    topLeftCell: "A2",
                    activePane: "bottomLeft"
                },
                xmlSheetPath: "xl/worksheets/sheet1.xml"
            }],
            [SheetType.ScoreEntry, {
                frozenPane: {
                    xSplit: 2, ySplit: 4,
                    topLeftCell: "C5",
                    activePane: "bottomRight"
                },
                xmlSheetPath: "xl/worksheets/sheet2.xml"
            }],
            [SheetType.ScoreCalculation, {
                frozenPane: {
                    xSplit: 1, ySplit: 4,
                    topLeftCell: "B5",
                    activePane: "bottomRight"
                },
                xmlSheetPath: "xl/worksheets/sheet3.xml"
            }],
            [SheetType.ScoreSummary, {
                frozenPane: {
                    xSplit: 2, ySplit: 4,
                    topLeftCell: "C5",
                    activePane: "bottomRight"
                },
                xmlSheetPath: "xl/worksheets/sheet4.xml"
            }],
            [SheetType.ScoreAnalysis, {
                frozenPane: {
                    xSplit: 2, ySplit: 4,
                    topLeftCell: "C5",
                    activePane: "bottomRight"
                },
                xmlSheetPath: "xl/worksheets/sheet5.xml"
            }],
            [SheetType.SuccessCorrelationAnalysis, {
                frozenPane: {
                    ySplit: 4,
                    topLeftCell: "A5",
                    activePane: "bottomLeft"
                },
                xmlSheetPath: "xl/worksheets/sheet6.xml"
            }],

            // AttemptCorrelationAnalysis = "Attempt Correlation Analysis",
            // CorrelationSummary = "Correlation Summary",
            // ScoreCalcSummary = "Score Calc Summary",
            // TimedBonus = "Timed Bonus",
            // ScoreClusters = "Score Clusters",
            // TimedDifferential = "Timed Differential",
        ]);

        await this.generateAndInjectXmlAsync(workbook, xmlInjectionDataMap, testTitle);
    }

    /**
     * Get a cell from a worksheet, creating an empty cell if it doesn't exist.
     * Existing cell contents and formatting are preserved.
     *
     * @param sheet Worksheet containing the cell
     * @param row Zero-based row index
     * @param col Zero-based column index
     * @returns Existing or newly initialized cell
     */
    private static getCell(sheet: XLSX_STYLE.WorkSheet, row: number, col: number): XLSX_STYLE.CellObject {
        const address = XLSX_STYLE.utils.encode_cell({ r: row, c: col });
        return sheet[address] ??= {} as XLSX_STYLE.CellObject;
    }

    /**
     * Set the width of a worksheet column in character units.
     * Preserves existing column properties.
     *
     * @param sheet Worksheet containing the column
     * @param col Zero-based column index
     * @param width Column width in characters
     */
    private static setColumnWidth(sheet: XLSX_STYLE.WorkSheet, col: number, width: number): void {
        sheet['!cols'] ??= [];
        sheet['!cols'][col] = {
            ...sheet['!cols'][col],
            wch: width
        };
    }

    /**
     * Set the height of a worksheet row in points.
     * Preserves existing row properties.
     *
     * @param sheet Worksheet containing the row
     * @param row Zero-based row index
     * @param height Row height in points
     */
    private static setRowHeight(sheet: XLSX_STYLE.WorkSheet, row: number, height: number): void {
        sheet['!rows'] ??= [];
        sheet['!rows'][row] = {
            ...sheet['!rows'][row],
            hpt: height
        };
    }
    /**
 * Set the worksheet's used range, starting at cell A1 (0,0).
 *
 * @param sheet Worksheet to update
 * @param maxRow Zero-based index of the last row (inclusive)
 * @param maxCol Zero-based index of the last column (inclusive)
 */
    private static setSheetSize(
        sheet: XLSX_STYLE.WorkSheet,
        maxRow: number,
        maxCol: number
    ): void {
        sheet['!ref'] = XLSX_STYLE.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: maxRow, c: maxCol }
        });
    }

    /**
 * Write a two-dimensional table of string values and styles to a worksheet.
 * Each inner array represents one row.
 *
 * @param sheet Destination worksheet
 * @param startRow Zero-based starting row
 * @param startCol Zero-based starting column
 * @param table Two-dimensional array of cell values and styles
 */
    private static writeCellTable(
        sheet: XLSX_STYLE.WorkSheet,
        startRow: number,
        startCol: number,
        table: TableCell[][]
    ): void {
        table.forEach((cells, rowOffset) => {
            cells.forEach((source, colOffset) => {
                if (source.v === undefined && source.s === undefined) return;

                const cell = this.getCell(
                    sheet,
                    startRow + rowOffset,
                    startCol + colOffset
                );

                if (source.v !== undefined) {
                    const value = source.v.trim();
                    const isNumeric = value !== "" && Number.isFinite(Number(value));

                    cell.v = isNumeric ? Number(value) : source.v;
                    cell.t = isNumeric ? "n" : "s";
                }
                if (source.s !== undefined) {
                    cell.s = source.s;
                }
                if (source.f !== undefined) {
                    cell.f = source.f;
                }
            });
        });
    }

    /**
     * Merge a rectangular range of cells in a worksheet.
     *
     * @param sheet Worksheet containing the cells
     * @param startRow Zero-based starting row
     * @param startCol Zero-based starting column
     * @param endRow Zero-based ending row (inclusive)
     * @param endCol Zero-based ending column (inclusive)
     */
    private static mergeCells(
        sheet: XLSX_STYLE.WorkSheet,
        startRow: number,
        startCol: number,
        endRow: number,
        endCol: number
    ): void {
        sheet['!merges'] ??= [];
        sheet['!merges'].push({
            s: { r: startRow, c: startCol },
            e: { r: endRow, c: endCol }
        });
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
            this.setColumnWidth(questionsSheet, i, width);

            if (headerKey === "Type") {
                maxQuestionTypeWidth = width;
            }
        }

        for (let i = 0; i < columnsToSize; i++) {
            const cell = this.getCell(questionsSheet, 0, i);
            cell.s = (i === (columnsToSize - 1)) ? this.STYLE_HEADER_BORDER_BR_HLEFT : this.STYLE_HEADER_BORDER_B_HLEFT;
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
     * @param {boolean} [isScoreEntry=true]  - Whether to generate the score sheet as a template. Defaults to true.
     *   true = Score Entry Sheet
     *   false = Score Calculation Sheet
     * @returns {WorkSheetDataResponse} An object containing the worksheet
     */
    private static generateScoreEntrySheet(questionSheetData: QuestionData[], maxQuestionTypeWidth: number, testDivision: string, teams: number, isScoreEntry: boolean = true): WorkSheetDataResponse {


        // For score entry it should be
        //    +---------+------------+------------+---------------+-------------+-------------+------+
        //    |         |            |            |               | Q0 Title    | Q1 Title    | ...  |
        //    |         +------------+------------+---------------+-------------+-------------+------+
        //    | TEAM    |            |            | Free Mistakes | Q0 Mistakes | Q1 Mistakes | ...  |
        //    | NUMBER  | Calculated | Attendance +---------------+-------------+-------------+------+
        //    |         |    Score   |            |      Points   | Q0 Points   | Q1 Points   |  ... |
        //    |         |            |            +---------------+-------------+-------------+------+
        //    |         |            |            | Timed Question| Q0 Text     | Q1 Text     |  ... |
        //    +---------+------------+------------+---------------+-------------+-------------+------+
        //    + <DIV>1  |  <SCORE>1  |            |               |             |             |      |
        //    +---------+------------+------------+---------------+-------------+-------------+------+---+-----------------+-----+
        //    + <DIV>2  |  <SCORE>2  |            |               |             |             |      |   | Number of Teams | <n> |
        //    +---------+------------+------------+---------------+-------------+-------------+------+---+-----------------+-----+
        //    + <DIV>n  |  <SCORE>n  |            |               |             |             |      |
        //    +---------+------------+------------+---------------+-------------+-------------+------+---+-----------------+-----+
        //
        //    <DIV>n Formula:   =IF(ROW() - 4 <= AM6, "C" & (ROW() - 4), "")
        //    <SCORE>n Formula: =IF(ROW() - 4 <= $AM$6, 'Score Calculation'!AK5, "")

        //
        // For Score Calculation it should be
        //    +---------+---------------+-------------+-------------+------+---------+---------+---------+
        //    |         |               | Q0 Title    | Q1 Title    | ...  |         |         |         |
        //    |         +---------------+-------------+-------------+------+---------+---------+---------+
        //    | TEAM    | Free Mistakes | Q0 Mistakes | Q1 Mistakes | ...  |         |         |         |
        //    | NUMBER  |---------------+-------------+-------------+------+         |         |         |
        //    |         |      Points   | Q0 Points   | Q1 Points   |  ... |  Timed  | Special |  Final  |
        //    |         |---------------+-------------+-------------+------+  Bonus  |  Bonus  |  Score  |
        //    |         | Timed Question| Q0 Text     | Q1 Text     |  ... |         |         |         |
        //    +---------+---------------+-------------+-------------+------+---------+---------+---------+
        //    + <DIV>1  |    <TQ>1      | <Q0SCORE>1  | <Q1SCORE>1  |  ... |  <TB>1  |  <SB>1  |  <FS>1  |
        //    +---------+---------------+-------------+-------------+------+---------+---------+---------+
        //    + <DIV>2  |    <TQ>2      |             |             |      |         |         |         |
        //    +---------+---------------+-------------+-------------+------+---------+---------+---------+
        //    + <DIV>n  |    <TQ>n      |             |             |      |         |         |         |
        //    +---------+---------------+-------------+-------------+------+---------+---------+---------+
        //
        //    Score Calculation headers from B1 should use the formula:
        //             =ARRAYFORMULA('Score Entry'!D1:AJ4) where AJ is the number of questions we have
        //    <DIV>n Formula:  =IF(ROW() - 4 <= 'Score Entry'!$AL$6, 'Score Entry'!A5, "")
        //    <TQ>n Formula: =IF(ROW() - 4 <= 'Score Entry'!AM6, IF('Score Entry'!D5 = "", "", 'Score Entry'!D5), "")
        //    <Q0SCORE>n Formula:=IF(ROW() - 4 <= 'Score Entry'!AM6, IF(TRIM('Score Entry'!E5) <> "", MAX(C3 - MIN(C3, MAX('Score Entry'!E5 - C2, 0) * 100), 0), 0), "")
        //    <TB>n Formula:=IF(ROW() - 4 <= 'Score Entry'!AM6, IF(TRIM(B5) <> "", MAX(ROUND((1 - (B5 / N(TIME(0, 600, 0)) )) * 600 * 2, 5), 0), 0), "")
        //    <SB>n Formula: =IF(ROW() - 4 <= 'Score Entry'!AM6, CHOOSE(1 + IF(TEXT(I5, "0.00")=TEXT(I3, "0.00"), 1, 0) + IF(TEXT(R5, "0.00")=TEXT(R3, "0.00"), 1, 0) + IF(TEXT(U5, "0.00")=TEXT(U3, "0.00"), 1, 0), 0, 150, 400, 750), "")
        //    <FS>n Formula: =IF(ROW() - 4 <= 'Score Entry'!AM6, IF(TRIM('Score Entry'!C5) <> "P", 'Score Entry'!C5, IF(SUM(C5:AJ5) <= 0, "P", SUM(C5:AJ5))), "")

        const scoreEntrySheet: XLSX_STYLE.WorkSheet = XLSX_STYLE.utils.json_to_sheet([]);
        const headerRowHeightHpt: number = this.calculateRotatedSingleLineHeight(maxQuestionTypeWidth);
        const timedColumn = (isScoreEntry ? 4 : 2);

        this.setRowHeight(scoreEntrySheet, 0, headerRowHeightHpt);
        if (isScoreEntry) {
            this.setColumnWidth(scoreEntrySheet, 1, this.HEADER_COL_WIDTH);
            this.setColumnWidth(scoreEntrySheet, 2, this.HEADER_COL_WIDTH);
        }

        // Generate the team number column information as well as the timed column formatting
        for (let team = 0; team < teams; team++) {
            const row = team + this.HEADER_ROWS;

            const cell = this.getCell(scoreEntrySheet, row, 0);
            const timedCell = this.getCell(scoreEntrySheet, row, timedColumn - 1);
            if (isScoreEntry) {
                cell.f = `IF(ROW() - ${this.HEADER_ROWS} <= NumberOfTeams, "${testDivision}" & (ROW() - ${this.HEADER_ROWS}), "")`;
                // When we are doing the score entry, we need to also put in the formula for the calculated score
                const targetScoreAddress: string = `'Score Calculation'!${XLSX_STYLE.utils.encode_cell({ r: row, c: questionSheetData.length + 4 })}`;
                const scoreCalcCell = this.getCell(scoreEntrySheet, row, 1);
                scoreCalcCell.f = `IF(ROW() - ${this.HEADER_ROWS} <= NumberOfTeams, ${targetScoreAddress}, "")`;
                timedCell.v = '';
                timedCell.t = "n";
                cell.t = "s";
            } else {
                const baseTab = "'Score Entry'!";
                cell.f = `IF(ROW() - ${this.HEADER_ROWS} <= NumberOfTeams, INDEX(${baseTab}A:A,ROW()), "")`;
                cell.v = '';
                cell.t = "s";
            }

            cell.s = (team === (teams - 1)) ? this.STYLE_HEADER_BORDER_BR : this.STYLE_HEADER_BORDER_R
            timedCell.s = this.STYLE_BOLD_GRAY_FMTTIME;
        }
        let col = timedColumn - 1;
        let questionsHeaderTable: TableCell[][] =
            [[{ v: "" }],
            [{ v: "Free Mistakes", s: this.STYLE_HEADER_BORDER_ALL }],
            [{ v: "Points", s: this.STYLE_HEADER_BORDER_ALL }],
            [{ v: "Timed Question (Max. 10:00)", s: this.STYLE_HEADER_BORDER_ALL_WRAP }],];
        this.setColumnWidth(scoreEntrySheet, col, this.TIMED_QUESTION_COL_WIDTH);
        this.writeCellTable(scoreEntrySheet, 0, col, questionsHeaderTable);

        // fill out questions information on the top 4 rows
        for (let i = 0; i < questionSheetData.length; i++) {
            let col = i + timedColumn;

            this.setColumnWidth(scoreEntrySheet, col, this.QUESTION_COL_WIDTH);

            const dataItem: QuestionData = questionSheetData[i];
            let freeMistakes = 2
            if (dataItem.Type.toLowerCase().includes("cryptarithm") ||
                (testDivision === "C" && dataItem.Type.toLowerCase().includes("keyword"))) {
                freeMistakes = 0;
            }

            const questionsTable: TableCell[][] = [[{ v: `${dataItem.Type}${dataItem.Special}`, s: this.STYLE_HEADER_BORDER_ALL_ROT45 }],
            [{ v: `${freeMistakes}`, s: this.STYLE_HEADER_BORDER_ALL }],
            [{ v: dataItem.Points, s: this.STYLE_HEADER_BORDER_ALL }],
            [{ v: dataItem["Question Number"], s: this.STYLE_HEADER_BORDER_ALL_VBOT }]]

            this.writeCellTable(scoreEntrySheet, 0, col, questionsTable);
        }

        // Define the final dimensions
        // Since we iterate from r = 0 up to maxTeams + 3
        const maxRowIndex: number = teams + this.HEADER_ROWS - 1;
        // Col A (0) and Col B (1) are skipped in the question loop, starting at C (2) from Timed  - Last Question, then add 3 for directions columns
        const maxColIndex: number = questionSheetData.length + 5 + timedColumn;

        this.setSheetSize(scoreEntrySheet, maxRowIndex, maxColIndex);

        return {
            worksheet: scoreEntrySheet,
        };
    }

    private static ScoreSheetDirections(scoreEntrySheet: XLSX_STYLE.WorkSheet, questionSheetData: QuestionData[]) {
        this.setColumnWidth(scoreEntrySheet, 1, this.QUESTION_COL_WIDTH * 2);

        const headersTable: TableCell[][] = [
            [
                { v: "Team Number", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP },
                { v: "Calculated Score", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP },
                { v: "Attendance", s: this.STYLE_HEADER_BORDER_NONE_VBOT_WRAP }
            ],
            [{ v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP }, { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP }, { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP }],
            [{ v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP }, { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP }, { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP }],
            [{ v: "", s: this.STYLE_HEADER_BORDER_BR_VBOT_WRAP }, { v: "", s: this.STYLE_HEADER_BORDER_BR_VBOT_WRAP }, { v: "", s: this.STYLE_HEADER_BORDER_BR_VBOT_WRAP },],
        ];
        this.writeCellTable(scoreEntrySheet, 0, 0, headersTable);

        for (let col = 0; col < headersTable[0].length; col++) {
            this.mergeCells(scoreEntrySheet, 0, col, headersTable.length - 1, col);
        }

        const directionsCol = questionSheetData.length + this.SCORE_ENTRY_EXTRA;

        this.setColumnWidth(scoreEntrySheet, directionsCol - 1, 1);
        this.setColumnWidth(scoreEntrySheet, directionsCol, this.QUESTION_COL_WIDTH * 5);
        this.setColumnWidth(scoreEntrySheet, directionsCol + 1, this.QUESTION_COL_WIDTH * 10);

        const directionsTable: TableCell[][] = [
            [{ v: "Number of Teams:", s: this.STYLE_HEADER_BORDER_TBL }, { v: "100", s: this.STYLE_BORDER_ALL_BOLD_GRAY },],
            [{}, {},],
            [{ v: "Directions - Enter the following values for the attendance column:", s: this.STYLE_HEADER_BORDER_TBL }, { v: " ", s: this.STYLE_HEADER_BORDER_TBR },],
            [{ v: "Key", s: this.STYLE_HEADER_BORDER_ALL_HLEFT }, { v: "Meaning", s: this.STYLE_HEADER_BORDER_ALL_HRIGHT },],
            [{ v: "NS", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY }, { v: "No Show", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY },],
            [{ v: "P", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY }, { v: "Participation", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY },],
            [{ v: "DQ", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY }, { v: "Disqualified", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY },],
            [{}, {},],
            [{ v: "Directions - Enter the following values for the following responses on each question:", s: this.STYLE_HEADER_BORDER_TBL }, { v: " ", s: this.STYLE_HEADER_BORDER_TBR },],
            [{ v: "Response", s: this.STYLE_HEADER_BORDER_ALL_HLEFT }, { v: "Value", s: this.STYLE_HEADER_BORDER_ALL_HRIGHT },],
            [{ v: "Fully Solved", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY }, { v: "0", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY },],
            [{ v: "Attempted", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY }, { v: "Number of Letters Incorrect", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY },],
            [{ v: "Attempted but not Solved", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY }, { v: "99", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY },],
            [{ v: "Untouched", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY }, { v: "Leave Blank", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY },],];
        this.writeCellTable(scoreEntrySheet, 5, directionsCol, directionsTable);
        // Merge the directions cells
        this.mergeCells(scoreEntrySheet, 7, directionsCol, 7, directionsCol + 1);
        this.mergeCells(scoreEntrySheet, 13, directionsCol, 13, directionsCol + 1);
    }

    /**
     * Generate a worksheet containing the score calculation data
     * @param questionSheetData The question data to generate the score sheet from
     * @param maxQuestionTypeWidth The maximum width of the "Type" column
     * @param testDivision The test division to generate the score sheet for
     * @returns {WorkSheetDataResponse} An object containing the worksheet
     */
    private static generateScoreCalculationSheet(questionSheetData: QuestionData[], maxQuestionTypeWidth: number, testDivision: string): WorkSheetDataResponse {

        // Use score entry sheet as a template
        const scoreCalculationSheet: XLSX_STYLE.WorkSheet = this.generateScoreEntrySheet(questionSheetData, maxQuestionTypeWidth, testDivision, this.MAX_TEAMS, false).worksheet;

        // Create the Timed Bonus/Special Bonus/Final Score merged columns
        const headers: string[] = ["Timed Bonus", "Special Bonus", "Final Score"];
        for (let i = 0; i < headers.length; i++) {
            let col = questionSheetData.length + 2 + i;

            const headerTable: TableCell[][] = [
                [{ v: headers[i], s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                [{ v: ' ', s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                [{ v: ' ', s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
            ];

            this.writeCellTable(scoreCalculationSheet, 1, col, headerTable);
            this.mergeCells(scoreCalculationSheet, 1, col, 3, col);
        }

        const teamNumberConditionFormulaInject = (formula: string): string =>
            `IF(ROW() - ${this.HEADER_ROWS} <= NumberOfTeams, ${formula}, "")`;

        // fill out scores
        // Loop through each team and calculate the score
        for (let team = 0; team < this.MAX_TEAMS; team++) {
            const row = team + this.HEADER_ROWS;
            // Loop through each question and calculate the score
            for (let q = -1; q < questionSheetData.length + 3; q++) {
                const col = q + 2;
                const translatedCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: row, c: col + 2 });

                const cell = this.getCell(scoreCalculationSheet, row, col)

                if (q === -1) {
                    // If the question is the timed question
                    cell.f = teamNumberConditionFormulaInject(`IF('Score Entry'!${translatedCellAddress} = "", "", 'Score Entry'!${translatedCellAddress})`);
                } else if (q === questionSheetData.length) {
                    // If the question is the timed bonus
                    // Calculate the timed bonus points
                    const timeCalcCellAddress = XLSX_STYLE.utils.encode_cell({ r: row, c: 1 });
                    const maxSecondsForTimedBonusAsNumber = `N(TIME(0, ${this.MAX_SECONDS_FOR_TIMED_BONUS}, 0))`;
                    const actualToBestTimeRatio = `(${timeCalcCellAddress} / ${maxSecondsForTimedBonusAsNumber} )`
                    const rawTimedBonus = `(1 - ${actualToBestTimeRatio}) * ${this.MAX_SECONDS_FOR_TIMED_BONUS} * 2`;
                    const timedBonusRawCalc = `MAX(ROUND(${rawTimedBonus}, 5), 0)`;
                    const timedBonusCalc = `IF(TRIM(${timeCalcCellAddress}) <> "", ${timedBonusRawCalc}, 0)`;
                    cell.f = teamNumberConditionFormulaInject(timedBonusCalc);
                    cell.s = this.STYLE_GRAY_FMT0;
                } else if (q === (questionSheetData.length + 1)) {
                    // If the question is the special bonus
                    // Calculate the special bonus points
                    const bonusQuestions = questionSheetData.filter(q => q.Special);
                    let indexSelector = "1";
                    let indexSelectorValue = ", 0";
                    bonusQuestions.forEach((bonusq, index) => {
                        const calcPointsCellAddress = XLSX_STYLE.utils.encode_cell({ r: row, c: +bonusq.Order + 2 });
                        const maxPointsCellAddress = XLSX_STYLE.utils.encode_cell({ r: 2, c: +bonusq.Order + 2 });
                        indexSelector += ` + IF(TEXT(${calcPointsCellAddress}, "0.00")=TEXT(${maxPointsCellAddress}, "0.00"), 1, 0)`;
                        indexSelectorValue += `, ${50 * (index + 1) * (index + 3)}`;
                    });
                    cell.f = teamNumberConditionFormulaInject(`CHOOSE(${indexSelector}${indexSelectorValue})`);
                    cell.s = this.STYLE_GRAY;
                } else if (q === (questionSheetData.length + 2)) {
                    // If the question is the final score
                    // Calculate the final score
                    const attendanceCellAddress = XLSX_STYLE.utils.encode_cell({ r: row, c: 2 });
                    const scoreCalcCellAddress = XLSX_STYLE.utils.encode_cell({ r: row, c: 2 });
                    const scoreCalcCellAddress2 = XLSX_STYLE.utils.encode_cell({ r: row, c: col - 1 });

                    const status = `'Score Entry'!${attendanceCellAddress}`;
                    const scoreCalc = `SUM(${scoreCalcCellAddress}:${scoreCalcCellAddress2})`;

                    const placementCalc =
                        `IF(${status}="A",${scoreCalc},` +
                        `IF(LEFT(${status}&"P",1)<>"P",${status},` +
                        `IF(${scoreCalc}>0,${scoreCalc},IF(${status}="","",${status}))))`;

                    cell.f = teamNumberConditionFormulaInject(placementCalc);
                    cell.s = this.STYLE_HEADER_BORDER_R;
                } else {
                    // If the question is not the timed question, timed bonus, special bonus, or final score
                    // Calculate the points for the question
                    const mistakeCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 1, c: col });
                    const pointCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: 2, c: col });
                    const calcMistakes = `MAX('Score Entry'!${translatedCellAddress} - ${mistakeCellAddress}, 0)`;
                    const calcMistakePoints = `MIN(${pointCellAddress}, ${calcMistakes} * ${this.MAX_Q_DEDUCTION})`;
                    const safePointCalc = `MAX(${pointCellAddress} - ${calcMistakePoints}, 0)`;
                    cell.f = teamNumberConditionFormulaInject(`IF(TRIM('Score Entry'!${translatedCellAddress}) <> "", ${safePointCalc}, 0)`);
                    cell.s = this.STYLE_RED;
                }
            }
        }

        // Define the final dimensions

        // Since we iterate from r = 0 up to maxTeams + 3
        const maxRowIndex: number = this.MAX_TEAMS + 3;
        // Col A (0) and Col B (1) are skipped in the question loop, starting at C (2)
        const maxColIndex: number = questionSheetData.length + 4;
        this.setSheetSize(scoreCalculationSheet, maxRowIndex, maxColIndex);

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
    private static generateScoreSummarySheet(testDivision: string, numQuestions: number): WorkSheetDataResponse {
        const scoreSummarySheet: XLSX_STYLE.WorkSheet = XLSX_STYLE.utils.json_to_sheet([]);

        // Should be:
        //  0     1      2      3        4      5       6       7       8         9     10
        //                     Base    Timed  Special  Bonus
        //  ID   Score  Rank   Score   Bonus  Bonus    Score   Tie   Tiebreaker       ID-Rank(Score)
        //  61    61     61     61      61     61        61    43       75        1     163

        // Set the column widths
        for (let col = 0; col < 9; col++) {
            this.setColumnWidth(scoreSummarySheet, col, this.SUMMARY_COL_WIDTH)
        }
        this.setColumnWidth(scoreSummarySheet, 9, 1)
        this.setColumnWidth(scoreSummarySheet, 10, this.SUMMARY_COL_WIDTH * 2)

        const teamNumberConditionFormulaInject = (formula: string): string =>
            `IF(ROW() - 1 <= NumberOfTeams, ${formula}, "")`;

        const headerTable: TableCell[][] = [
            [{ v: 'ID', s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: 'Score', s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: 'Rank', s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: 'Base Score', s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: 'Timed Bonus', s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: 'Special Bonus', s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: 'Bonus Score', s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: 'Tie', s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: 'Tie Breaker', s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: ' ' },
            { v: 'ID - Rank (Score)', s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
        ];
        this.writeCellTable(scoreSummarySheet, 0, 0, headerTable);

        // Loop through each team from 0 to MAX_TEAMS
        for (let i = 1; i <= this.MAX_TEAMS; i++) {

            const TEAM_NUMBER_COL = 0;
            const FINAL_SCORE_COL = 1;
            const RANK_COL = 2;
            const BASE_SCORE_COL = 3
            const TIMED_BONUS_COL = 4;
            const SPECIAL_BONUS_COL = 5;
            const BONUS_SCORE_COL = 6;
            const TIE_INDICATOR_COL = 7;
            const TIEBREAKER_COL = 8;
            const RANK_DISPLAY_COL = 10;

            // const teamNumberCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: TEAM_NUMBER_COL });
            const teamFinalScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: FINAL_SCORE_COL });
            // const teamRankCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: RANK_COL });
            // const baseScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: BASE_SCORE_COL });
            const timedBonusScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: TIMED_BONUS_COL });
            const specialBonusCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: SPECIAL_BONUS_COL });
            // const bonusScoreCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: BONUS_SCORE_COL });
            // const tieIndicatorCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: TIE_INDICATOR_COL });
            const tiebreakerCellAddress: string = XLSX_STYLE.utils.encode_cell({ r: i, c: TIEBREAKER_COL });


            // Get the team number, final score, rank, base score, timed bonus, special bonus, bonus score and tiebreaker cells
            const teamNumberCell = this.getCell(scoreSummarySheet, i, TEAM_NUMBER_COL);
            const teamFinalScoreCell = this.getCell(scoreSummarySheet, i, FINAL_SCORE_COL);
            const teamRankCell = this.getCell(scoreSummarySheet, i, RANK_COL);
            const baseScoreCell = this.getCell(scoreSummarySheet, i, BASE_SCORE_COL);
            const timedBonusScoreCell = this.getCell(scoreSummarySheet, i, TIMED_BONUS_COL);
            const specialBonusCell = this.getCell(scoreSummarySheet, i, SPECIAL_BONUS_COL);
            const bonusScoreCell = this.getCell(scoreSummarySheet, i, BONUS_SCORE_COL);
            const tieIndicatorCell = this.getCell(scoreSummarySheet, i, TIE_INDICATOR_COL);
            const tiebreakerCell = this.getCell(scoreSummarySheet, i, TIEBREAKER_COL);
            const teamRankDisplayCell = this.getCell(scoreSummarySheet, i, RANK_DISPLAY_COL);


            teamNumberCell.f = teamNumberConditionFormulaInject(`INDEX('Score Entry'!A:A,ROW()+3)`);

            // Calculate the final score and rank
            const scoreCalcFinalScoreAddress = XLSX_STYLE.utils.encode_cell({
                r: i + 3,
                c: numQuestions + 4
            });

            const score = `'Score Calculation'!${scoreCalcFinalScoreAddress}`;
            const tiebreaker = tiebreakerCellAddress;
            const tiebreakerCol = XLSX_STYLE.utils.encode_col(TIEBREAKER_COL);
            const tiebreakerRange = `${tiebreakerCol}:${tiebreakerCol}`;

            const tiebreakerCalc =
                `IF(ISNUMBER(${tiebreaker}),` +
                `(MAX(${tiebreakerRange})-${tiebreaker})/MAX(10,MAX(${tiebreakerRange})),0)`;

            teamFinalScoreCell.f = teamNumberConditionFormulaInject(
                `IF(ISNUMBER(${score}),SUM(${score},${tiebreakerCalc}),${score})`
            );

            // Calculate the rank
            const teamMinFinalScoreCellAddress = XLSX_STYLE.utils.encode_cell({ r: 1, c: 1 });
            const teamMaxFinalScoreCellAddress = XLSX_STYLE.utils.encode_cell({ r: this.MAX_TEAMS, c: 1 });

            const scoreRange = `${teamMinFinalScoreCellAddress}:${teamMaxFinalScoreCellAddress}`;
            const score2 = teamFinalScoreCellAddress;

            const rankCalc =
                `IF(ISNUMBER(${score2}),` +
                `RANK(${score2},${scoreRange}),` +
                `COUNTA(${scoreRange})+MATCH(TRIM(${score2}),{"P","NS","DQ"},0)-1)`;

            teamRankCell.f = teamNumberConditionFormulaInject(rankCalc);

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
            tieIndicatorCell.v = " ";

            const tnscoreRange = `${XLSX_STYLE.utils.encode_col(FINAL_SCORE_COL)}:${XLSX_STYLE.utils.encode_col(FINAL_SCORE_COL)}`;

            tieIndicatorCell.f = teamNumberConditionFormulaInject(
                `IF(COUNTIF(${tnscoreRange},${teamFinalScoreCellAddress})>1,"--TIE--","")`
            );

            // Set the styles
            teamNumberCell.s = this.STYLE_HEADER_BORDER_TB

            teamFinalScoreCell.s = this.STYLE_BORDER_TB_GRAY
            teamRankCell.s = this.STYLE_BORDER_TBR_GRAY
            teamRankDisplayCell.s = this.STYLE_BORDER_ALL_GRAY
            baseScoreCell.s = this.STYLE_BORDER_TBL_GRAY
            timedBonusScoreCell.s = this.STYLE_BORDER_TB_GRAY
            specialBonusCell.s = this.STYLE_BORDER_TB_GRAY
            bonusScoreCell.s = this.STYLE_BORDER_TB_GRAY
            tieIndicatorCell.s = this.STYLE_BORDER_TB_GRAY
            tiebreakerCell.s = this.STYLE_BORDER_TBR_GRAY
        }

        // Define the final dimensions
        const maxRowIndex: number = this.MAX_TEAMS;
        const maxColIndex: number = 10;

        this.setSheetSize(scoreSummarySheet, maxRowIndex, maxColIndex);

        return {
            worksheet: scoreSummarySheet,
        };
    }

    /**
     * Generate a worksheet containing the score calculation data
     * @param questionSheetData The question data to generate the score sheet from
     * @param maxQuestionTypeWidth The maximum width of the "Type" column
     * @param testDivision The test division to generate the score sheet for
     * @returns {WorkSheetDataResponse} An object containing the worksheet
     */
    private static generateScoreAnalysisSheet(questionSheetData: QuestionData[], maxQuestionTypeWidth: number, testDivision: string): WorkSheetDataResponse {

        // Use score entry sheet as a template
        const ScoreAnalysisSheet: XLSX_STYLE.WorkSheet = this.generateScoreEntrySheet(questionSheetData, maxQuestionTypeWidth, testDivision, 0, false).worksheet;
        const pointsRange: string = `${XLSX_STYLE.utils.encode_cell({ r: 2, c: 2 })}:${XLSX_STYLE.utils.encode_cell({ r: 2, c: questionSheetData.length + 1 })}`;
        const maxPointsAddress: string = XLSX_STYLE.utils.encode_cell({ r: 16, c: 1 });
        const maxPossibleAddress: string = XLSX_STYLE.utils.encode_cell({ r: 17, c: 1 });
        const topTeamScoreAddress: string = XLSX_STYLE.utils.encode_cell({ r: 18, c: 1 });
        const extraPoints = testDivision === "A" ? 0 : (60 * 10 * 2) + 750;
        const actualScoreRange: string = `'Score Calculation'!${XLSX_STYLE.utils.encode_cell({ r: 4, c: questionSheetData.length + 4 })}:${XLSX_STYLE.utils.encode_cell({ r: this.MAX_TEAMS + 4, c: questionSheetData.length + 4 })}`

        const headerTable: TableCell[][] = [
            [{ v: "Full Credit", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GREY }],
            [{ v: "Partial Credit", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GREY }],
            [{ v: "Untouched", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GREY }],
            [{ v: "Attempted", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GREY }],
            [{ v: "Fully Solved", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GREY }],
            [{ v: "Attempted but not solved", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GREY }],
            [{ v: "Partial", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GREY }],
            [{ v: "Actual Attempts", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_BRL_GREY }],
            [{ v: "" }],
            [{ v: "" }],
            [{ v: "Average solve time", s: this.STYLE_HEADER_BORDER_HRIGHT_TL }, { f: `average(${pointsRange})`, s: this.STYLE_BORDER_TR_HRIGHT_GRAY_FMT0 }],
            [{ v: "Average question score", s: this.STYLE_HEADER_BORDER_HRIGHT_L }, { f: `average(${pointsRange})`, s: this.STYLE_BORDER_R_HRIGHT_GRAY }],
            [{ v: "Max points/questions", s: this.STYLE_HEADER_BORDER_HRIGHT_L }, { f: `sum(${pointsRange})`, s: this.STYLE_BORDER_R_HRIGHT_GRAY }],
            [{ v: "Max Score+Bonus+Timed", s: this.STYLE_HEADER_BORDER_HRIGHT_L }, { f: `${maxPointsAddress}+${extraPoints}`, s: this.STYLE_BORDER_R_HRIGHT_GRAY }],
            [{ v: "Top Team Score", s: this.STYLE_HEADER_BORDER_HRIGHT_L }, { f: `max(${actualScoreRange})`, s: this.STYLE_BORDER_R_HRIGHT_GRAY }],
            [{ v: "Top Team Score Pct of max", s: this.STYLE_HEADER_BORDER_HRIGHT_BL }, { f: `${topTeamScoreAddress}/${maxPossibleAddress}`, s: this.STYLE_BORDER_BR_HRIGHT_GRAY_FMTPCT }],
        ];

        this.writeCellTable(ScoreAnalysisSheet, 4, 0, headerTable);
        this.setColumnWidth(ScoreAnalysisSheet, 0, 28);
        this.mergeCells(ScoreAnalysisSheet, 0, 0, 3, 0);
        for (let q = 0; q < questionSheetData.length; q++) {
            const col = q + 2;
            const destCol = col;
            const destStartRow = 4;
            const destEntryCol = col + 2;

            const destColLetter = XLSX_STYLE.utils.encode_col(destCol);
            const destEntryColLetter = XLSX_STYLE.utils.encode_col(destEntryCol);
            const destCalculation = `'Score Calculation'!$${destColLetter}${destStartRow + 1}:INDEX('Score Calculation'!$${destColLetter}:$${destColLetter},NumberOfTeams+4)`;
            const destEntry = `'Score Entry'!$${destEntryColLetter}${destStartRow + 1}:INDEX('Score Entry'!$${destEntryColLetter}:$${destEntryColLetter},NumberOfTeams+4)`;
            const fullScoreRef = XLSX_STYLE.utils.encode_cell({ r: 2, c: col })
            const fullCreditRef = XLSX_STYLE.utils.encode_cell({ r: 4, c: col })
            const attemptedRef = XLSX_STYLE.utils.encode_cell({ r: 7, c: col })
            const fullySolvedRef = XLSX_STYLE.utils.encode_cell({ r: 8, c: col })
            const attemptedNotSolvedRef = XLSX_STYLE.utils.encode_cell({ r: 9, c: col })
            const partialRef = XLSX_STYLE.utils.encode_cell({ r: 10, c: col })

            const formulaTable: TableCell[][] = [
                [{ v: "0", f: `COUNTIF(${destCalculation},${fullScoreRef})` }],
                [{ v: "0", f: `COUNTIF(${destCalculation},">0")-${fullCreditRef}` }],
                [{ v: "0", f: `COUNTBLANK(${destEntry})` }],
                [{ v: "0", f: `COUNTIF(${destEntry},">0")` }],
                [{ v: "0", f: `COUNTIF(${destEntry},"=0")` }],
                [{ v: "0", f: `COUNTIF(${destEntry},"=99")` }],
                [{ v: "0", f: `${attemptedRef}-${attemptedNotSolvedRef}` }],
                [{ v: "0", f: `${partialRef}+${attemptedNotSolvedRef}+${fullySolvedRef}` }],

            ]
            this.writeCellTable(ScoreAnalysisSheet, 4, col, formulaTable);
        }

        // Define the final dimensions
        const maxRowIndex: number = this.MAX_TEAMS + 4;
        const maxColIndex: number = questionSheetData.length + 3;

        this.setSheetSize(ScoreAnalysisSheet, maxRowIndex, maxColIndex);

        return {
            worksheet: ScoreAnalysisSheet,
        };
    }

    /**
 * Generate a worksheet containing the Success Correlation Analysis data
 * @param questionSheetData The question data to generate the score sheet from
 * @param maxQuestionTypeWidth The maximum width of the "Type" column
 * @param testDivision The test division to generate the score sheet for
 * @returns {WorkSheetDataResponse} An object containing the worksheet
 */
    private static generateSuccessCorrelationAnalysisSheet(questionSheetData: QuestionData[], maxQuestionTypeWidth: number, testDivision: string): WorkSheetDataResponse {

        // Use score entry sheet as a template
        const SuccessCorrelationAnalysisSheet: XLSX_STYLE.WorkSheet = this.generateScoreEntrySheet(questionSheetData, maxQuestionTypeWidth, testDivision, this.MAX_TEAMS, false).worksheet;
        const pointsRange: string = `${XLSX_STYLE.utils.encode_cell({ r: 2, c: 2 })}:${XLSX_STYLE.utils.encode_cell({ r: 2, c: questionSheetData.length + 1 })}`;
        const maxPointsAddress: string = XLSX_STYLE.utils.encode_cell({ r: 16, c: 1 });
        const maxPossibleAddress: string = XLSX_STYLE.utils.encode_cell({ r: 17, c: 1 });
        const topTeamScoreAddress: string = XLSX_STYLE.utils.encode_cell({ r: 18, c: 1 });
        const extraPoints = testDivision === "A" ? 0 : (60 * 10 * 2) + 750;
        const actualScoreRange: string = `'Score Calculation'!${XLSX_STYLE.utils.encode_cell({ r: 4, c: questionSheetData.length + 4 })}:${XLSX_STYLE.utils.encode_cell({ r: this.MAX_TEAMS + 4, c: questionSheetData.length + 4 })}`


        // this.writeCellTable(ScoreAnalysisSheet, 4, 0, headerTable);
        // this.setColumnWidth(ScoreAnalysisSheet, 0, 28);
        this.mergeCells(SuccessCorrelationAnalysisSheet, 0, 0, 3, 0);
        for (let q = 0; q <= questionSheetData.length; q++) {
            const col = q + 2;
            const destCol = (q === questionSheetData.length) ? col + 2 : col;
            const destStartRow = 4;
            const destColLetter = XLSX_STYLE.utils.encode_col(destCol);
            const destCalculation = `'Score Calculation'!$${destColLetter}$${destStartRow + 1}:INDEX('Score Calculation'!$${destColLetter}:$${destColLetter},NumberOfTeams+${destStartRow})`;
            for (let team = 0; team < this.MAX_TEAMS; team++) {
                let row = team + 4;
                const destCell = `'Score Calculation'!${XLSX_STYLE.utils.encode_cell({ r: row, c: destCol })}`
                const cell = this.getCell(SuccessCorrelationAnalysisSheet, row, col);
                cell.f = `IF(ROW()-${this.HEADER_ROWS}<= NumberOfTeams,RANK(${destCell},${destCalculation}),"")`
                cell.v = 0
                cell.t = "n";
                if (q === questionSheetData.length) {
                    cell.s = this.STYLE_BORDER_NONE_GRAY;
                }
            }
        }

        let col = questionSheetData.length + 2;

        const headers: string[] = ["Final Score", "", "Question", "Type", "Correlation"];
        for (let i = 0; i < headers.length; i++) {
            if (headers[i] !== "") {
                const headerTable: TableCell[][] = [
                    [{ v: headers[i], s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                    [{ v: ' ', s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                    [{ v: ' ', s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                ];
                this.writeCellTable(SuccessCorrelationAnalysisSheet, 1, col + i, headerTable);
                this.mergeCells(SuccessCorrelationAnalysisSheet, 1, col + i, 3, col + i);
            }
        }
        this.setColumnWidth(SuccessCorrelationAnalysisSheet, col + 1, 1);
        this.setColumnWidth(SuccessCorrelationAnalysisSheet, col + 2, 8);
        this.setColumnWidth(SuccessCorrelationAnalysisSheet, col + 3, 25);
        this.setColumnWidth(SuccessCorrelationAnalysisSheet, col + 4, 10);

        col = questionSheetData.length + 4;
        let destColLetter = XLSX_STYLE.utils.encode_col(questionSheetData.length + 2);
        const finalCorrelRange = `$${destColLetter}$${this.HEADER_ROWS + 1}:INDEX($${destColLetter}:$${destColLetter},NumberOfTeams+${this.HEADER_ROWS + 1})`;
        for (let q = 0; q < questionSheetData.length; q++) {
            const row = this.HEADER_ROWS + q;
            const destCol = q + 2;
            destColLetter = XLSX_STYLE.utils.encode_col(destCol);
            const qRange = `$${destColLetter}$${this.HEADER_ROWS + 1}:INDEX($${destColLetter}:$${destColLetter},NumberOfTeams+${this.HEADER_ROWS + 1})`;
            const rowTable: TableCell[][] = [
                [{ v: '', f: `${XLSX_STYLE.utils.encode_cell({ r: 3, c: destCol })}`, s: this.STYLE_BORDER_RL_GREY },
                { v: '', f: `${XLSX_STYLE.utils.encode_cell({ r: 0, c: destCol })}`, s: this.STYLE_BORDER_RL_GREY },
                { v: '', f: `=CORREL(${qRange},${finalCorrelRange} )`, s: this.STYLE_BORDER_RL_GREY_FMT3DEC }
                ]
            ];
            this.writeCellTable(SuccessCorrelationAnalysisSheet, row, col, rowTable);
        }

        // Define the final dimensions
        const maxRowIndex: number = this.MAX_TEAMS + 4;
        const maxColIndex: number = questionSheetData.length + 7;

        this.setSheetSize(SuccessCorrelationAnalysisSheet, maxRowIndex, maxColIndex);

        return {
            worksheet: SuccessCorrelationAnalysisSheet,
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

    //
    // Border and style helpers
    //

    private static getSubStyledBorder(borderName: string): Border {
        const borderMap: Record<string, BorderType> = {
            T: BorderType.Top,
            B: BorderType.Bottom,
            L: BorderType.Left,
            R: BorderType.Right
        };

        const suffix = borderName.toUpperCase();

        if (suffix === "NONE") {
            return {};
        }

        const types = suffix === "ALL"
            ? Object.values(borderMap)
            : [...suffix].map(letter => {
                const type = borderMap[letter];
                if (type === undefined) {
                    throw new Error(`Invalid border type: ${letter}`);
                }
                return type;
            });

        return Object.fromEntries(
            types.map(type => [
                type,
                {
                    style: "medium",
                    color: { rgb: "FF000000" }
                }
            ])
        ) as Border;
    }

    private static makeStyle(
        borderName: string,
        options: {
            horizontal?: HorizontalAlignment;
            vertical?: VerticalAlignment;
            wrapText?: boolean;
            bold?: boolean;
            fillColor?: string;
            textRotation?: number;
            numFmt?: string;
        } = {}
    ): CellStyle {
        const style: CellStyle = {
            border: this.getSubStyledBorder(borderName),
            alignment: {
                horizontal: options.horizontal ?? Alignment.Center,
                vertical: options.vertical ?? Alignment.Center,
                wrapText: options.wrapText ?? false,
                ...(options.textRotation !== undefined
                    ? { textRotation: options.textRotation }
                    : {})
            },
            font: {
                bold: options.bold ?? false
            }
        };

        if (options.fillColor !== undefined) {
            style.fill = {
                fgColor: { rgb: options.fillColor }
            };
        }

        if (options.numFmt !== undefined) {
            style.numFmt = options.numFmt;
        }

        return style;
    }

    // #endregion
}

