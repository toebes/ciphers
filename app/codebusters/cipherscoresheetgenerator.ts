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
    "FreeMistakes": number;
};

type TableCell = {
    v?: string | number;
    s?: CellStyle;
    f?: string;
};

type BorderStyle = {
    style: string;
    color: {
        rgb: string;
    }
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
    // Maximum number of teams per test.
    private static MAX_TEAMS: number = 100;

    // Width of the header column in the score sheet.
    private static HEADER_COL_WIDTH: number = 15;

    // Width of the timed question column in the score sheet.
    private static TIMED_QUESTION_COL_WIDTH: number = 16;

    // Width of the question column in the score sheet.
    private static QUESTION_COL_WIDTH: number = 5;

    // Width of the question column in the score sheet.
    private static SUMMARY_COL_WIDTH: number = 7;

    // The dark gray color used in the score sheet.
    private static DARK_GRAY_COLOR: string = "FFA5A5A5";

    // The light gray color used in the score sheet.
    private static LIGHT_GRAY_COLOR: string = "FFE5E5E5";

    // The dull light red color used in the score sheet.
    private static DULL_LIGHT_RED_COLOR: string = "FFF4CCCC";

    // Maximum number of seconds allowed for the timed bonus question.
    private static MAX_SECONDS_FOR_TIMED_BONUS: number = 600;

    private readonly STYLE_HEADER_BORDER_R = CipherScoreSheetGenerator.makeStyle("R", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_BR = CipherScoreSheetGenerator.makeStyle("BR", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_B_HLEFT = CipherScoreSheetGenerator.makeStyle("B", { horizontal: Alignment.Left, bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_BR_HLEFT = CipherScoreSheetGenerator.makeStyle("BR", { horizontal: Alignment.Left, bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_ALL_ROT45 = CipherScoreSheetGenerator.makeStyle("ALL", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR, textRotation: 45 });
    private readonly STYLE_HEADER_BORDER_ALL = CipherScoreSheetGenerator.makeStyle("ALL", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_ALL_VBOT = CipherScoreSheetGenerator.makeStyle("ALL", { vertical: Alignment.Bottom, bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_ALL_WRAP = CipherScoreSheetGenerator.makeStyle("ALL", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR, wrapText: true });
    private readonly STYLE_HEADER_BORDER_BR_VBOT_WRAP = CipherScoreSheetGenerator.makeStyle("BR", { vertical: Alignment.Bottom, bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR, wrapText: true });
    private readonly STYLE_HEADER_BORDER_NONE_VBOT_WRAP = CipherScoreSheetGenerator.makeStyle("NONE", { vertical: Alignment.Bottom, bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR, wrapText: true });
    private readonly STYLE_HEADER_BORDER_R_VBOT_WRAP = CipherScoreSheetGenerator.makeStyle("R", { vertical: Alignment.Bottom, bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR, wrapText: true });
    private readonly STYLE_HEADER_BORDER_TBL = CipherScoreSheetGenerator.makeStyle("TBL", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_HRIGHT_TL = CipherScoreSheetGenerator.makeStyle("TL", { horizontal: Alignment.Right, bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_HRIGHT_L = CipherScoreSheetGenerator.makeStyle("L", { horizontal: Alignment.Right, bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_HRIGHT_BL = CipherScoreSheetGenerator.makeStyle("BL", { horizontal: Alignment.Right, bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_TBR = CipherScoreSheetGenerator.makeStyle("TBR", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_TB = CipherScoreSheetGenerator.makeStyle("TB", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR });
    private readonly STYLE_HEADER_BORDER_ALL_HLEFT = CipherScoreSheetGenerator.makeStyle("ALL", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR, horizontal: Alignment.Left });
    private readonly STYLE_HEADER_BORDER_ALL_HRIGHT = CipherScoreSheetGenerator.makeStyle("ALL", { bold: true, fillColor: CipherScoreSheetGenerator.DARK_GRAY_COLOR, horizontal: Alignment.Right });

    private readonly STYLE_BORDER_ALL_GRAY = CipherScoreSheetGenerator.makeStyle("ALL", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BORDER_ALL_BOLD_GRAY = CipherScoreSheetGenerator.makeStyle("ALL", { bold: true, fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BORDER_ALL_HLEFT_BOLD_GRAY = CipherScoreSheetGenerator.makeStyle("ALL", { horizontal: Alignment.Left, bold: true, fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY = CipherScoreSheetGenerator.makeStyle("ALL", { horizontal: Alignment.Right, bold: true, fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_RED = CipherScoreSheetGenerator.makeStyle("NONE", { fillColor: CipherScoreSheetGenerator.DULL_LIGHT_RED_COLOR });
    private readonly STYLE_GRAY_FMT0 = CipherScoreSheetGenerator.makeStyle("NONE", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR, numFmt: "0" });
    private readonly STYLE_BORDER_TR_HRIGHT_GRAY_FMT0 = CipherScoreSheetGenerator.makeStyle("TR", { horizontal: Alignment.Right, fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR, numFmt: "0" });
    private readonly STYLE_BORDER_R_HRIGHT_GRAY = CipherScoreSheetGenerator.makeStyle("R", { horizontal: Alignment.Right, fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BORDER_BR_HRIGHT_GRAY_FMTPCT = CipherScoreSheetGenerator.makeStyle("BR", { horizontal: Alignment.Right, fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR, numFmt: "0.00%" });
    private readonly STYLE_GRAY = CipherScoreSheetGenerator.makeStyle("NONE", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BOLD_GRAY_FMTTIME = CipherScoreSheetGenerator.makeStyle("NONE", { bold: true, fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR, numFmt: "hh:mm" });
    private readonly STYLE_BORDER_RL_GRAY = CipherScoreSheetGenerator.makeStyle("RL", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BORDER_RL_GRAY_FMT3DEC = CipherScoreSheetGenerator.makeStyle("RL", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR, numFmt: "0.000" });
    private readonly STYLE_BORDER_BRL_GRAY = CipherScoreSheetGenerator.makeStyle("BRL", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BORDER_TB_GRAY = CipherScoreSheetGenerator.makeStyle("TB", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BORDER_NONE_GRAY = CipherScoreSheetGenerator.makeStyle("NONE", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BORDER_TBL_GRAY = CipherScoreSheetGenerator.makeStyle("TBL", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });
    private readonly STYLE_BORDER_TBR_GRAY = CipherScoreSheetGenerator.makeStyle("TBR", { fillColor: CipherScoreSheetGenerator.LIGHT_GRAY_COLOR });

    // Deduction per question (depending on the divison, 50 for A, 100 for B/C).
    private maxQuestionDeduction: number = 100;
    public maxQuestionTypeWidth: number = 1;
    public questionSheetData: QuestionData[] = [];
    public testDivision: string = "";

    /**
     * Generates a score sheet based on the given test data.
     * This creates the base score sheet document and all of the contained worksheets
     * @param {sourceTestData} exportTestData - The test data to generate the score sheet from.
     * @returns {Promise<void>} A promise that resolves when the score sheet is generated.
     */
    public async generateScoreSheet(exportTestData: sourceTestData, questionOrders: number[]): Promise<void> {

        // should always be the 1st test object
        const testData: ITest =
            exportTestData[Object.keys(exportTestData).filter(key => key.startsWith('TEST')).sort()[0]] as ITest;

        const testType: ITestType = testData.testtype as ITestType;

        if (testType === ITestType.aregional || testType === ITestType.astate) {
            this.maxQuestionDeduction = 50;
        }

        const testTitle: string = `${testData.title} ${testTypeNames[testType]} Score Sheet`;
        this.testDivision = this.calculateTestDivision(testType);
        this.maxQuestionDeduction = this.testDivision === "A" ? 50 : 100;

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

        this.questionSheetData = questionData
            .sort((a, b) => a.editEntry - b.editEntry)
            .map((question) => {
                const type = this.getQuestionType(question);
                const lowerType = type.toLowerCase();

                return {
                    "Order": `${question.editEntry}`,
                    "Question Number": question.editEntry === 0 ? "Timed" : `${question.editEntry}`,
                    "Points": `${question.points}`,
                    "Type": type,
                    "Special": question.specialbonus ? "★" : "",
                    "Question": question.question.replace(/<[^>]*>/g, ""),
                    "FreeMistakes": (
                        lowerType.includes("cryptarithm") ||
                        (this.testDivision === "C" && lowerType.includes("keyword"))
                    ) ? 0 : 2,
                };
            });

        // Generate Test Questions Sheet

        const questionsSheet = this.generateTestQuestionsSheet();

        XLSX_STYLE.utils.book_append_sheet(
            workbook,
            questionsSheet,
            SheetType.TestQuestions
        );

        // Generates Score Entry Sheet
        const scoreEntrySheet = this.generateScoreEntrySheet(workbook);
        XLSX_STYLE.utils.book_append_sheet(workbook, scoreEntrySheet, SheetType.ScoreEntry);
        // Generates Score Calculation Sheet

        const scoreCalculationSheet = this.generateScoreCalculationSheet();
        XLSX_STYLE.utils.book_append_sheet(workbook, scoreCalculationSheet, SheetType.ScoreCalculation);

        // Generate Score Summary Sheet
        const scoreSummarySheet = this.generateScoreSummarySheet();
        XLSX_STYLE.utils.book_append_sheet(workbook, scoreSummarySheet, SheetType.ScoreSummary);

        // Generate Score Analysis Sheet
        const scoreAnalysisSheet = this.generateScoreAnalysisSheet();
        XLSX_STYLE.utils.book_append_sheet(workbook, scoreAnalysisSheet, SheetType.ScoreAnalysis);

        // Generate Success Correlation Analysis Sheet
        const SuccessCorrelationAnalysis = this.generateSuccessCorrelationAnalysisSheet();
        XLSX_STYLE.utils.book_append_sheet(workbook, SuccessCorrelationAnalysis, SheetType.SuccessCorrelationAnalysis);

        // Generate Attempt Correlation Analysis Sheet
        const AttemptCorrelationAnalysis = this.generateAttemptCorrelationAnalysisSheet();
        XLSX_STYLE.utils.book_append_sheet(workbook, AttemptCorrelationAnalysis, SheetType.AttemptCorrelationAnalysis);

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
                    xSplit: 2, ySplit: 1,
                    topLeftCell: "D2",
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
            [SheetType.AttemptCorrelationAnalysis, {
                frozenPane: {
                    ySplit: 4,
                    topLeftCell: "A5",
                    activePane: "bottomLeft"
                },
                xmlSheetPath: "xl/worksheets/sheet7.xml"
            }],

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
    private getCell(sheet: XLSX_STYLE.WorkSheet, row: number, col: number): XLSX_STYLE.CellObject {
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
    private setColumnWidth(sheet: XLSX_STYLE.WorkSheet, col: number, width: number): void {
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
    private setRowHeight(sheet: XLSX_STYLE.WorkSheet, row: number, height: number): void {
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
    private setSheetSize(
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
    private writeCellTable(
        sheet: XLSX_STYLE.WorkSheet,
        startRow: number,
        startCol: number,
        table: TableCell[][]
    ): void {
        table.forEach((cells, rowOffset) => {
            cells.forEach((source, colOffset) => {
                if (
                    source.v === undefined &&
                    source.s === undefined &&
                    source.f === undefined
                ) {
                    return;
                }

                const cell = this.getCell(
                    sheet,
                    startRow + rowOffset,
                    startCol + colOffset
                );

                if (source.v !== undefined) {
                    if (typeof source.v === "number") {
                        cell.v = source.v;
                        cell.t = "n";
                    } else {
                        const value = source.v.trim();
                        const isNumeric = value !== "" && Number.isFinite(Number(value));

                        cell.v = isNumeric ? Number(value) : source.v;
                        cell.t = isNumeric ? "n" : "s";
                    }
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
    private mergeCells(
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
    /**
     * Converts zero-based row and column indexes into an Excel cell address.
     * @param row - Zero-based row index.
     * @param col - Zero-based column index.
     * @returns Excel cell address (e.g., "C5").
     */
    private cellAddress(row: number, col: number): string {
        return XLSX_STYLE.utils.encode_cell({ r: row, c: col });
    }

    /**
     * Wraps an Excel formula in a condition that limits its evaluation
     * to the number of teams specified by the workbook's NumberOfTeams named range.
     * Returns an empty string for rows beyond the number of teams.
     * @param formula - Excel formula expression without a leading equals sign.
     * @returns Excel IF formula without a leading equals sign.
     */
    private teamFormula(formula: string): string {
        return `IF(ROW()-${CipherScoreSheetGenerator.HEADER_ROWS}<=NumberOfTeams,${formula},"")`;
    }

    /**
     * Generates a dynamic Excel range covering the active team rows
     * in the specified column. The range starts at the first team row
     * and automatically adjusts its ending row based on the workbook's
     * NumberOfTeams named range.
     * @param col - Zero-based column index.
     * @returns Excel range expression using INDEX (e.g., "B5:INDEX(B:B,NumberOfTeams+4)").
     */
    private teamRange(col: number): string {
        const letter = XLSX_STYLE.utils.encode_col(col);
        const firstCell = this.cellAddress(CipherScoreSheetGenerator.HEADER_ROWS, col);

        return `${firstCell}:INDEX(${letter}:${letter},NumberOfTeams+${CipherScoreSheetGenerator.HEADER_ROWS})`;
    };

    /**
     * Generates a dynamic Excel range covering the active team rows
     * in the specified column. The range automatically adjusts when
     * the workbook's NumberOfTeams value changes.
     * @param col - Zero-based column index.
     * @returns Excel range expression using INDEX (e.g., "$C$5:INDEX($C:$C,NumberOfTeams+4)").
     */
    private correlationRange(col: number): string {
        const letter = XLSX_STYLE.utils.encode_col(col);
        const firstRow = CipherScoreSheetGenerator.HEADER_ROWS + 1;

        return `$${letter}$${firstRow}:INDEX($${letter}:$${letter},NumberOfTeams+${CipherScoreSheetGenerator.HEADER_ROWS})`;
    }

    /**
     * Sets a worksheet cell to contain a numeric Excel formula.
     * Initializes the cell if necessary, assigns a cached numeric value
     * of zero, and optionally applies a cell style.
     * @param sheet - Worksheet containing the destination cell.
     * @param row - Zero-based row index.
     * @param col - Zero-based column index.
     * @param formula - Excel formula without a leading equals sign.
     * @param style - Optional cell formatting style.
     */
    private setNumericFormula(
        sheet: XLSX_STYLE.WorkSheet,
        row: number,
        col: number,
        formula: string,
        style?: CellStyle
    ): void {
        const cell = this.getCell(sheet, row, col);
        cell.f = formula;
        cell.v = 0;
        cell.t = "n";
        if (style) cell.s = style;
    }

    /**
     * Generates a worksheet containing the test questions data
     * @param questionData The IState objects containing the test question data
     * @returns XLSX_STYLE.WorkSheet the generated worksheet
     */
    private generateTestQuestionsSheet(): XLSX_STYLE.WorkSheet {
        const questionsSheet: XLSX_STYLE.WorkSheet = XLSX_STYLE.utils.json_to_sheet(this.questionSheetData);
        const headerKeys: string[] = Object.keys(this.questionSheetData[0]);
        const columnsToSize: number = headerKeys.length;
        questionsSheet['!cols'] = [];

        for (let i = 0; i < columnsToSize; i++) {
            const headerKey: string = headerKeys[i];
            const width: number = this.calculateColumnWidth<typeof this.questionSheetData[number]>(
                this.questionSheetData,
                headerKey as keyof typeof this.questionSheetData[number]
            );

            // Set the width for the column index i
            this.setColumnWidth(questionsSheet, i, width);

            if (headerKey === "Type" && width > this.maxQuestionTypeWidth) {
                this.maxQuestionTypeWidth = width;
            }
        }

        for (let i = 0; i < columnsToSize; i++) {
            const cell = this.getCell(questionsSheet, 0, i);
            cell.s = (i === (columnsToSize - 1)) ? this.STYLE_HEADER_BORDER_BR_HLEFT : this.STYLE_HEADER_BORDER_B_HLEFT;
        }

        return questionsSheet;
    }

    /**
     * Populates team identifiers from the score entry worksheet and applies
     * time formatting to the specified column.
     * @param sheet - Worksheet to populate and format.
     * @param timedCol - Zero-based column receiving the time formatting.
     */
    private populateTeamHeaders(
        sheet: XLSX_STYLE.WorkSheet,
        timedCol: number
    ): void {
        const HEADER_ROWS = CipherScoreSheetGenerator.HEADER_ROWS;
        const MAX_TEAMS = CipherScoreSheetGenerator.MAX_TEAMS;
        const TEAM_NUMBER_COL = 0;

        for (let team = 0; team < MAX_TEAMS; team++) {
            const row = HEADER_ROWS + team;
            const isLastTeam = team === MAX_TEAMS - 1;

            const rowTable: TableCell[][] = [[
                { v: "", f: this.teamFormula(`INDEX('Score Entry'!A:A,ROW())`), s: isLastTeam ? this.STYLE_HEADER_BORDER_BR : this.STYLE_HEADER_BORDER_R }
            ]];

            this.writeCellTable(sheet, row, TEAM_NUMBER_COL, rowTable);

            const timedCell = this.getCell(sheet, row, timedCol);
            timedCell.s = this.STYLE_BOLD_GRAY_FMTTIME;
        }
    }

    /**
     * Adds the timed-column heading and question headers, including question
     * types, special-bonus markers, free mistakes, points, and question numbers.
     * Sets the header row height and column widths.
     * @param sheet - Worksheet to populate and format.
     * @param timedCol - Zero-based column preceding the question columns.
     * @param timedHeader - Timed-column heading or an alternative label.
     */
    private genQuestionHeader(
        sheet: XLSX_STYLE.WorkSheet,
        timedCol: number,
        timedHeader: string = "Timed Question (Max. 10:00)"
    ): void {
        const TYPE_ROW = 0;
        const FIRST_QUESTION_COL = timedCol + 1;

        // ---------------------------------------------
        // Header row height
        // ---------------------------------------------

        const headerHeight = this.calculateRotatedSingleLineHeight(
            this.maxQuestionTypeWidth
        );

        this.setRowHeight(sheet, TYPE_ROW, headerHeight);

        // ---------------------------------------------
        // Timed-column heading and question labels
        // ---------------------------------------------

        const labelsTable: TableCell[][] = [
            [{ v: "" }],
            [{ v: "Free Mistakes", s: this.STYLE_HEADER_BORDER_ALL }],
            [{ v: "Points", s: this.STYLE_HEADER_BORDER_ALL }],
            [{ v: timedHeader, s: this.STYLE_HEADER_BORDER_ALL_WRAP }]
        ];

        this.setColumnWidth(
            sheet,
            timedCol,
            CipherScoreSheetGenerator.TIMED_QUESTION_COL_WIDTH
        );
        this.writeCellTable(sheet, TYPE_ROW, timedCol, labelsTable);

        // ---------------------------------------------
        // Question headers
        // ---------------------------------------------

        this.questionSheetData.forEach((question, index) => {
            const col = FIRST_QUESTION_COL + index;

            const questionTable: TableCell[][] = [
                [{ v: `${question.Type}${question.Special}`, s: this.STYLE_HEADER_BORDER_ALL_ROT45 }],
                [{ v: question.FreeMistakes, s: this.STYLE_HEADER_BORDER_ALL }],
                [{ v: question.Points, s: this.STYLE_HEADER_BORDER_ALL }],
                [{ v: question["Question Number"], s: this.STYLE_HEADER_BORDER_ALL_VBOT }]
            ];

            this.setColumnWidth(
                sheet,
                col,
                CipherScoreSheetGenerator.QUESTION_COL_WIDTH
            );
            this.writeCellTable(sheet, TYPE_ROW, col, questionTable);
        });
    }

    /**
     * Adds team, score, and attendance headers to the score entry worksheet,
     * along with the team-count input and attendance/question-entry directions.
     * @param sheet - Score entry worksheet to populate and format.
     */
    private ScoreSheetDirections(sheet: XLSX_STYLE.WorkSheet): void {
        const TEAM_NUMBER_COL = 0;
        const CALCULATED_SCORE_COL = 1;
        const ATTENDANCE_COL = 2;

        const DIRECTIONS_COL = this.questionSheetData.length + CipherScoreSheetGenerator.SCORE_ENTRY_EXTRA;
        const DIRECTIONS_VALUE_COL = DIRECTIONS_COL + 1;

        const DIRECTIONS_START_ROW = 5;
        const ATTENDANCE_HEADING_ROW = DIRECTIONS_START_ROW + 2;
        const QUESTION_HEADING_ROW = DIRECTIONS_START_ROW + 8;

        const QUESTION_COL_WIDTH = CipherScoreSheetGenerator.QUESTION_COL_WIDTH;

        // ---------------------------------------------
        // Team, score, and attendance headers
        // ---------------------------------------------

        const headersTable: TableCell[][] = [
            [
                { v: "Team Number", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP },
                { v: "Calculated Score", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP },
                { v: "Attendance", s: this.STYLE_HEADER_BORDER_NONE_VBOT_WRAP }
            ],
            [
                { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP },
                { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP },
                { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP }
            ],
            [
                { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP },
                { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP },
                { v: "", s: this.STYLE_HEADER_BORDER_R_VBOT_WRAP }
            ],
            [
                { v: "", s: this.STYLE_HEADER_BORDER_BR_VBOT_WRAP },
                { v: "", s: this.STYLE_HEADER_BORDER_BR_VBOT_WRAP },
                { v: "", s: this.STYLE_HEADER_BORDER_BR_VBOT_WRAP }
            ]
        ];

        this.writeCellTable(sheet, 0, TEAM_NUMBER_COL, headersTable);

        for (let col = TEAM_NUMBER_COL; col <= ATTENDANCE_COL; col++) {
            this.mergeCells(sheet, 0, col, headersTable.length - 1, col);
        }

        // ---------------------------------------------
        // Column widths
        // ---------------------------------------------

        this.setColumnWidth(sheet, CALCULATED_SCORE_COL, QUESTION_COL_WIDTH * 2);
        this.setColumnWidth(sheet, DIRECTIONS_COL - 1, 1);
        this.setColumnWidth(sheet, DIRECTIONS_COL, QUESTION_COL_WIDTH * 5);
        this.setColumnWidth(sheet, DIRECTIONS_VALUE_COL, QUESTION_COL_WIDTH * 10);

        // ---------------------------------------------
        // Team count and entry directions
        // ---------------------------------------------

        const directionsTable: TableCell[][] = [
            [
                { v: "Number of Teams:", s: this.STYLE_HEADER_BORDER_TBL },
                { v: 100, s: this.STYLE_BORDER_ALL_BOLD_GRAY }
            ],
            [{}, {}],
            [
                { v: "Directions - Enter the following values for the attendance column:", s: this.STYLE_HEADER_BORDER_TBL },
                { v: " ", s: this.STYLE_HEADER_BORDER_TBR }
            ],
            [
                { v: "Key", s: this.STYLE_HEADER_BORDER_ALL_HLEFT },
                { v: "Meaning", s: this.STYLE_HEADER_BORDER_ALL_HRIGHT }
            ],
            [
                { v: "NS", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY },
                { v: "No Show", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY }
            ],
            [
                { v: "P", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY },
                { v: "Participation", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY }
            ],
            [
                { v: "DQ", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY },
                { v: "Disqualified", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY }
            ],
            [{}, {}],
            [
                { v: "Directions - Enter the following values for the following responses on each question:", s: this.STYLE_HEADER_BORDER_TBL },
                { v: " ", s: this.STYLE_HEADER_BORDER_TBR }
            ],
            [
                { v: "Response", s: this.STYLE_HEADER_BORDER_ALL_HLEFT },
                { v: "Value", s: this.STYLE_HEADER_BORDER_ALL_HRIGHT }
            ],
            [
                { v: "Fully Solved", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY },
                { v: 0, s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY }
            ],
            [
                { v: "Attempted", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY },
                { v: "Number of Letters Incorrect", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY }
            ],
            [
                { v: "Attempted but not Solved", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY },
                { v: 99, s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY }
            ],
            [
                { v: "Untouched", s: this.STYLE_BORDER_ALL_HLEFT_BOLD_GRAY },
                { v: "Leave Blank", s: this.STYLE_BORDER_ALL_HRIGHT_BOLD_GRAY }
            ]
        ];

        this.writeCellTable(sheet, DIRECTIONS_START_ROW, DIRECTIONS_COL, directionsTable);

        // Merge each directions heading across both columns.
        this.mergeCells(
            sheet,
            ATTENDANCE_HEADING_ROW,
            DIRECTIONS_COL,
            ATTENDANCE_HEADING_ROW,
            DIRECTIONS_VALUE_COL
        );
        this.mergeCells(
            sheet,
            QUESTION_HEADING_ROW,
            DIRECTIONS_COL,
            QUESTION_HEADING_ROW,
            DIRECTIONS_VALUE_COL
        );
    }

    /**
     * Generates the score entry worksheet.
     * @param workbook - Workbook receiving the NumberOfTeams named range.
     * @returns The generated worksheet.
     */
    private generateScoreEntrySheet(workbook: XLSX_STYLE.WorkBook): XLSX_STYLE.WorkSheet {
        const sheet = XLSX_STYLE.utils.json_to_sheet([]);
        const numQuestions = this.questionSheetData.length;

        const HEADER_ROWS = CipherScoreSheetGenerator.HEADER_ROWS;
        const MAX_TEAMS = CipherScoreSheetGenerator.MAX_TEAMS;

        // Column layout
        const TEAM_NUMBER_COL = 0;
        const CALCULATED_SCORE_COL = 1;
        const ATTENDANCE_COL = 2;
        const TIMED_COL = 3;
        const FINAL_SCORE_SOURCE_COL = numQuestions + 4;
        const DIRECTIONS_COL = numQuestions + CipherScoreSheetGenerator.SCORE_ENTRY_EXTRA;
        const NUMBER_OF_TEAMS_COL = DIRECTIONS_COL + 1;

        const NUMBER_OF_TEAMS_ROW = 5;

        // ---------------------------------------------
        // Headers and column widths
        // ---------------------------------------------

        this.genQuestionHeader(sheet, TIMED_COL);

        this.setColumnWidth(
            sheet,
            CALCULATED_SCORE_COL,
            CipherScoreSheetGenerator.HEADER_COL_WIDTH
        );
        this.setColumnWidth(
            sheet,
            ATTENDANCE_COL,
            CipherScoreSheetGenerator.HEADER_COL_WIDTH
        );

        // ---------------------------------------------
        // Team identifiers and calculated scores
        // ---------------------------------------------

        for (let team = 0; team < MAX_TEAMS; team++) {
            const row = HEADER_ROWS + team;
            const isLastTeam = team === MAX_TEAMS - 1;

            const teamNumberFormula =
                `"${this.testDivision}"&(ROW()-${HEADER_ROWS})`;
            const sourceScore =
                `'Score Calculation'!${this.cellAddress(row, FINAL_SCORE_SOURCE_COL)}`;

            const rowTable: TableCell[][] = [[
                { v: "", f: this.teamFormula(teamNumberFormula), s: isLastTeam ? this.STYLE_HEADER_BORDER_BR : this.STYLE_HEADER_BORDER_R },
                { f: this.teamFormula(sourceScore) }
            ]];

            this.writeCellTable(sheet, row, TEAM_NUMBER_COL, rowTable);

            // Preserve the existing numeric time-entry cell configuration.
            const timedCell = this.getCell(sheet, row, TIMED_COL);
            timedCell.v = "";
            timedCell.t = "n";
            timedCell.s = this.STYLE_BOLD_GRAY_FMTTIME;
        }

        // ---------------------------------------------
        // Number of teams named range
        // ---------------------------------------------

        const numberOfTeamsAddress =
            `$${XLSX_STYLE.utils.encode_col(NUMBER_OF_TEAMS_COL)}$${XLSX_STYLE.utils.encode_row(NUMBER_OF_TEAMS_ROW)}`;

        workbook.Workbook.Names.push({
            Name: "NumberOfTeams",
            Ref: `'Score Entry'!${numberOfTeamsAddress}`
        });

        // ---------------------------------------------
        // Attendance and question-entry directions
        // ---------------------------------------------

        this.ScoreSheetDirections(sheet);

        // ---------------------------------------------
        // Worksheet dimensions
        // ---------------------------------------------

        this.setSheetSize(
            sheet,
            MAX_TEAMS + HEADER_ROWS - 1,
            DIRECTIONS_COL + 4
        );

        return sheet;
    }

    /**
     * Generates a worksheet containing the score calculation data.
     * @returns The generated worksheet.
     */
    private generateScoreCalculationSheet(): XLSX_STYLE.WorkSheet {
        const sheet = XLSX_STYLE.utils.json_to_sheet([]);
        const numQuestions = this.questionSheetData.length;

        const HEADER_ROWS = CipherScoreSheetGenerator.HEADER_ROWS;
        const MAX_TEAMS = CipherScoreSheetGenerator.MAX_TEAMS;
        const MAX_Q_DEDUCTION = this.maxQuestionDeduction;
        const MAX_TIMED_SECONDS = CipherScoreSheetGenerator.MAX_SECONDS_FOR_TIMED_BONUS;

        // Column layout
        const TIMED_COL = 1;
        const FIRST_QUESTION_COL = 2;
        const TIMED_BONUS_COL = numQuestions + 2;
        const SPECIAL_BONUS_COL = numQuestions + 3;
        const FINAL_SCORE_COL = numQuestions + 4;

        // Score entry column layout
        const STATUS_SOURCE_COL = 2;
        const TIMED_SOURCE_COL = 3;
        const QUESTION_SOURCE_OFFSET = 2;

        // Header row layout
        const FREE_MISTAKES_ROW = 1;
        const POINTS_ROW = 2;

        // ---------------------------------------------
        // Headers
        // ---------------------------------------------

        this.genQuestionHeader(sheet, TIMED_COL);
        this.populateTeamHeaders(sheet, TIMED_COL);

        const headers = ["Timed Bonus", "Special Bonus", "Final Score"];

        headers.forEach((header, offset) => {
            const col = TIMED_BONUS_COL + offset;

            const headerTable: TableCell[][] = [
                [{ v: header, s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                [{ v: " ", s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                [{ v: " ", s: this.STYLE_HEADER_BORDER_ALL_WRAP }]
            ];

            this.writeCellTable(sheet, 1, col, headerTable);
            this.mergeCells(sheet, 1, col, 3, col);
        });

        // ---------------------------------------------
        // Shared bonus calculations
        // ---------------------------------------------

        const bonusQuestions = this.questionSheetData.filter(question => question.Special);

        const maxTimedValue = `N(TIME(0,${MAX_TIMED_SECONDS},0))`;

        const specialBonusValues = [
            0,
            ...bonusQuestions.map((question, index) => 50 * (index + 1) * (index + 3))
        ].join(",");

        // ---------------------------------------------
        // Team calculations
        // ---------------------------------------------

        for (let team = 0; team < MAX_TEAMS; team++) {
            const row = HEADER_ROWS + team;

            // Timed entry
            const sourceTime = `'Score Entry'!${this.cellAddress(row, TIMED_SOURCE_COL)}`;
            const timedFormula = `IF(${sourceTime}="","",${sourceTime})`;

            // Question scores
            const questionCells: TableCell[] = [];

            for (let q = 0; q < numQuestions; q++) {
                const col = FIRST_QUESTION_COL + q;
                const sourceCol = col + QUESTION_SOURCE_OFFSET;

                const sourceEntry = `'Score Entry'!${this.cellAddress(row, sourceCol)}`;
                const freeMistakesRef = this.cellAddress(FREE_MISTAKES_ROW, col);
                const pointsRef = this.cellAddress(POINTS_ROW, col);

                const mistakes = `MAX(${sourceEntry}-${freeMistakesRef},0)`;
                const deduction = `MIN(${pointsRef},${mistakes}*${MAX_Q_DEDUCTION})`;
                const questionScore = `MAX(${pointsRef}-${deduction},0)`;
                const questionFormula = `IF(TRIM(${sourceEntry})<>"",${questionScore},0)`;

                questionCells.push(
                    { f: this.teamFormula(questionFormula), s: this.STYLE_RED }
                );
            }

            // Timed bonus
            const timedRef = this.cellAddress(row, TIMED_COL);
            const timeRatio = `(${timedRef}/${maxTimedValue})`;
            const rawTimedBonus = `(1-${timeRatio})*${MAX_TIMED_SECONDS}*2`;
            const timedBonus = `MAX(ROUND(${rawTimedBonus},5),0)`;
            const timedBonusFormula = `IF(TRIM(${timedRef})<>"",${timedBonus},0)`;

            // Special bonus
            let specialBonusSelector = "1";

            bonusQuestions.forEach(question => {
                const col = Number(question.Order) + FIRST_QUESTION_COL;
                const scoreRef = this.cellAddress(row, col);
                const pointsRef = this.cellAddress(POINTS_ROW, col);

                specialBonusSelector +=
                    `+IF(TEXT(${scoreRef},"0.00")=TEXT(${pointsRef},"0.00"),1,0)`;
            });

            const specialBonusFormula =
                `CHOOSE(${specialBonusSelector},${specialBonusValues})`;

            // Final score and attendance status
            const status = `'Score Entry'!${this.cellAddress(row, STATUS_SOURCE_COL)}`;
            const firstScoreRef = this.cellAddress(row, FIRST_QUESTION_COL);
            const lastScoreRef = this.cellAddress(row, SPECIAL_BONUS_COL);
            const totalScore = `SUM(${firstScoreRef}:${lastScoreRef})`;

            const finalScoreFormula =
                `IF(${status}="A",${totalScore},` +
                `IF(LEFT(${status}&"P",1)<>"P",${status},` +
                `IF(${totalScore}>0,${totalScore},IF(${status}="","",${status}))))`;

            // Write the calculated row
            const rowTable: TableCell[][] = [[
                { f: this.teamFormula(timedFormula) },
                ...questionCells,
                { f: this.teamFormula(timedBonusFormula), s: this.STYLE_GRAY_FMT0 },
                { f: this.teamFormula(specialBonusFormula), s: this.STYLE_GRAY },
                { f: this.teamFormula(finalScoreFormula), s: this.STYLE_HEADER_BORDER_R }
            ]];

            this.writeCellTable(sheet, row, TIMED_COL, rowTable);
        }

        // ---------------------------------------------
        // Worksheet dimensions
        // ---------------------------------------------

        this.setSheetSize(
            sheet,
            MAX_TEAMS + HEADER_ROWS - 1,
            FINAL_SCORE_COL
        );

        return sheet;
    }

    /**
     * Generates the score summary worksheet.
     * @returns The generated worksheet.
     */
    private generateScoreSummarySheet(): XLSX_STYLE.WorkSheet {
        const sheet = XLSX_STYLE.utils.json_to_sheet([]);
        const numQuestions = this.questionSheetData.length;

        const MAX_TEAMS = CipherScoreSheetGenerator.MAX_TEAMS;
        const HEADER_ROWS = CipherScoreSheetGenerator.HEADER_ROWS;
        const FIRST_TEAM_ROW = 1;

        // Column layout
        const TEAM_NUMBER_COL = 0;
        const FINAL_SCORE_COL = 1;
        const RANK_COL = 2;
        const BASE_SCORE_COL = 3;
        const TIMED_BONUS_COL = 4;
        const SPECIAL_BONUS_COL = 5;
        const BONUS_SCORE_COL = 6;
        const TIE_INDICATOR_COL = 7;
        const TIEBREAKER_COL = 8;
        const SPACER_COL = 9;
        const RANK_DISPLAY_COL = 10;

        // Source column layout
        const FIRST_QUESTION_SOURCE_COL = 2;
        const LAST_QUESTION_SOURCE_COL = numQuestions + 1;
        const TIMED_BONUS_SOURCE_COL = numQuestions + 2;
        const SPECIAL_BONUS_SOURCE_COL = numQuestions + 3;
        const FINAL_SCORE_SOURCE_COL = numQuestions + 4;

        // This sheet has one header row rather than HEADER_ROWS.
        const summaryTeamFormula = (formula: string): string =>
            `IF(ROW()-${FIRST_TEAM_ROW}<=NumberOfTeams,${formula},"")`;

        // ---------------------------------------------
        // Headers and column widths
        // ---------------------------------------------

        const headerTable: TableCell[][] = [[
            { v: "ID", s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: "Score", s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: "Rank", s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: "Base Score", s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: "Timed Bonus", s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: "Special Bonus", s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: "Bonus Score", s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: "Tie", s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: "Tie Breaker", s: this.STYLE_HEADER_BORDER_ALL_WRAP },
            { v: " " },
            { v: "ID - Rank (Score)", s: this.STYLE_HEADER_BORDER_ALL_WRAP }
        ]];

        this.writeCellTable(sheet, 0, 0, headerTable);

        for (let col = TEAM_NUMBER_COL; col <= TIEBREAKER_COL; col++) {
            this.setColumnWidth(
                sheet,
                col,
                CipherScoreSheetGenerator.SUMMARY_COL_WIDTH
            );
        }

        this.setColumnWidth(sheet, SPACER_COL, 1);
        this.setColumnWidth(
            sheet,
            RANK_DISPLAY_COL,
            CipherScoreSheetGenerator.SUMMARY_COL_WIDTH * 2
        );

        // ---------------------------------------------
        // Shared formula references
        // ---------------------------------------------

        const lastTeamRow = FIRST_TEAM_ROW + MAX_TEAMS - 1;
        const scoreRange =
            `${this.cellAddress(FIRST_TEAM_ROW, FINAL_SCORE_COL)}:${this.cellAddress(lastTeamRow, FINAL_SCORE_COL)}`;

        const scoreLetter = XLSX_STYLE.utils.encode_col(FINAL_SCORE_COL);
        const wholeScoreColumn = `${scoreLetter}:${scoreLetter}`;

        const tiebreakerLetter = XLSX_STYLE.utils.encode_col(TIEBREAKER_COL);
        const tiebreakerRange = `${tiebreakerLetter}:${tiebreakerLetter}`;

        const sortedTeamRange = `$A$${FIRST_TEAM_ROW + 1}:$C$${lastTeamRow + 1}`;
        const sortedTeams = `_xlfn.SORT(${sortedTeamRange},3,1)`;

        const rankDisplayFormula =
            `INDEX(${sortedTeams},ROW()-${FIRST_TEAM_ROW},1) & " - " & ` +
            `INDEX(${sortedTeams},ROW()-${FIRST_TEAM_ROW},3) & " (" & ` +
            `INDEX(${sortedTeams},ROW()-${FIRST_TEAM_ROW},2) & ")"`;

        // ---------------------------------------------
        // Team scores, ranks, and bonuses
        // ---------------------------------------------

        for (let team = 0; team < MAX_TEAMS; team++) {
            const row = FIRST_TEAM_ROW + team;
            const sourceRow = HEADER_ROWS + team;

            const finalScoreRef = this.cellAddress(row, FINAL_SCORE_COL);
            const timedBonusRef = this.cellAddress(row, TIMED_BONUS_COL);
            const specialBonusRef = this.cellAddress(row, SPECIAL_BONUS_COL);
            const tiebreakerRef = this.cellAddress(row, TIEBREAKER_COL);

            const sourceTeam =
                `'Score Entry'!${this.cellAddress(sourceRow, TEAM_NUMBER_COL)}`;
            const sourceScore =
                `'Score Calculation'!${this.cellAddress(sourceRow, FINAL_SCORE_SOURCE_COL)}`;
            const sourceTimedBonus =
                `'Score Calculation'!${this.cellAddress(sourceRow, TIMED_BONUS_SOURCE_COL)}`;
            const sourceSpecialBonus =
                `'Score Calculation'!${this.cellAddress(sourceRow, SPECIAL_BONUS_SOURCE_COL)}`;
            const sourceQuestionRange =
                `'Score Calculation'!${this.cellAddress(sourceRow, FIRST_QUESTION_SOURCE_COL)}:${this.cellAddress(sourceRow, LAST_QUESTION_SOURCE_COL)}`;

            const tiebreakerCalc =
                `IF(ISNUMBER(${tiebreakerRef}),` +
                `(MAX(${tiebreakerRange})-${tiebreakerRef})/MAX(10,MAX(${tiebreakerRange})),0)`;

            const finalScoreFormula =
                `IF(ISNUMBER(${sourceScore}),SUM(${sourceScore},${tiebreakerCalc}),${sourceScore})`;

            const rankFormula =
                `IF(ISNUMBER(${finalScoreRef}),` +
                `RANK(${finalScoreRef},${scoreRange}),` +
                `COUNTA(${scoreRange})+MATCH(TRIM(${finalScoreRef}),{"P","NS","DQ"},0)-1)`;

            const tieFormula =
                `IF(COUNTIF(${wholeScoreColumn},${finalScoreRef})>1,"--TIE--","")`;

            const rowTable: TableCell[][] = [[
                { f: summaryTeamFormula(sourceTeam), s: this.STYLE_HEADER_BORDER_TB },
                { f: summaryTeamFormula(finalScoreFormula), s: this.STYLE_BORDER_TB_GRAY },
                { f: summaryTeamFormula(rankFormula), s: this.STYLE_BORDER_TBR_GRAY },
                { f: summaryTeamFormula(`SUM(${sourceQuestionRange})`), s: this.STYLE_BORDER_TBL_GRAY },
                { f: summaryTeamFormula(sourceTimedBonus), s: this.STYLE_BORDER_TB_GRAY },
                { f: summaryTeamFormula(sourceSpecialBonus), s: this.STYLE_BORDER_TB_GRAY },
                { f: summaryTeamFormula(`SUM(${timedBonusRef}:${specialBonusRef})`), s: this.STYLE_BORDER_TB_GRAY },
                { f: summaryTeamFormula(tieFormula), s: this.STYLE_BORDER_TB_GRAY },
                { v: " ", s: this.STYLE_BORDER_TBR_GRAY },
                {},
                { f: summaryTeamFormula(rankDisplayFormula), s: this.STYLE_BORDER_ALL_GRAY }
            ]];

            this.writeCellTable(sheet, row, TEAM_NUMBER_COL, rowTable);
        }

        // ---------------------------------------------
        // Worksheet dimensions
        // ---------------------------------------------

        this.setSheetSize(sheet, lastTeamRow, RANK_DISPLAY_COL);

        return sheet;
    }

    /**
     * Generates a worksheet containing the score analysis data.
     * @returns The generated worksheet.
     */
    private generateScoreAnalysisSheet(): XLSX_STYLE.WorkSheet {
        const sheet = XLSX_STYLE.utils.json_to_sheet([]);
        const numQuestions = this.questionSheetData.length;

        const HEADER_ROWS = CipherScoreSheetGenerator.HEADER_ROWS;
        const MAX_TEAMS = CipherScoreSheetGenerator.MAX_TEAMS;

        // Column layout
        const LABEL_COL = 0;
        const SUMMARY_VALUE_COL = 1;
        const FIRST_QUESTION_COL = 2;
        const FINAL_SCORE_SOURCE_COL = numQuestions + 4;

        // Row layout
        const POINTS_ROW = 2;
        const FULL_CREDIT_ROW = HEADER_ROWS;
        const ATTEMPTED_ROW = HEADER_ROWS + 3;
        const FULLY_SOLVED_ROW = HEADER_ROWS + 4;
        const ATTEMPTED_NOT_SOLVED_ROW = HEADER_ROWS + 5;
        const PARTIAL_ROW = HEADER_ROWS + 6;
        const MAX_POINTS_ROW = HEADER_ROWS + 12;
        const MAX_POSSIBLE_ROW = HEADER_ROWS + 13;
        const TOP_TEAM_SCORE_ROW = HEADER_ROWS + 14;

        // ---------------------------------------------
        // Headers
        // ---------------------------------------------

        this.genQuestionHeader(sheet, SUMMARY_VALUE_COL, "");
        this.setColumnWidth(sheet, LABEL_COL, 28);
        this.mergeCells(sheet, 0, LABEL_COL, 3, LABEL_COL);

        // ---------------------------------------------
        // Summary references
        // ---------------------------------------------

        const pointsRange =
            `${this.cellAddress(POINTS_ROW, FIRST_QUESTION_COL)}:${this.cellAddress(POINTS_ROW, FIRST_QUESTION_COL + numQuestions - 1)}`;

        const maxPointsAddress = this.cellAddress(MAX_POINTS_ROW, SUMMARY_VALUE_COL);
        const maxPossibleAddress = this.cellAddress(MAX_POSSIBLE_ROW, SUMMARY_VALUE_COL);
        const topTeamScoreAddress = this.cellAddress(TOP_TEAM_SCORE_ROW, SUMMARY_VALUE_COL);

        const extraPoints = this.testDivision === "A" ? 0 : (60 * 10 * 2) + 750;

        const actualScoreRange =
            `'Score Calculation'!${this.cellAddress(HEADER_ROWS, FINAL_SCORE_SOURCE_COL)}:${this.cellAddress(MAX_TEAMS + HEADER_ROWS, FINAL_SCORE_SOURCE_COL)}`;

        // ---------------------------------------------
        // Analysis labels and summary calculations
        // ---------------------------------------------

        const headerTable: TableCell[][] = [
            [{ v: "Full Credit", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GRAY }],
            [{ v: "Partial Credit", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GRAY }],
            [{ v: "Untouched", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GRAY }],
            [{ v: "Attempted", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GRAY }],
            [{ v: "Fully Solved", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GRAY }],
            [{ v: "Attempted but not solved", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GRAY }],
            [{ v: "Partial", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_RL_GRAY }],
            [{ v: "Actual Attempts", s: this.STYLE_HEADER_BORDER_TBR }, { v: "", s: this.STYLE_BORDER_BRL_GRAY }],
            [{ v: "" }],
            [{ v: "" }],
            [{ v: "Average solve time", s: this.STYLE_HEADER_BORDER_HRIGHT_TL }, { f: `AVERAGE(${pointsRange})`, s: this.STYLE_BORDER_TR_HRIGHT_GRAY_FMT0 }],
            [{ v: "Average question score", s: this.STYLE_HEADER_BORDER_HRIGHT_L }, { f: `AVERAGE(${pointsRange})`, s: this.STYLE_BORDER_R_HRIGHT_GRAY }],
            [{ v: "Max points/questions", s: this.STYLE_HEADER_BORDER_HRIGHT_L }, { f: `SUM(${pointsRange})`, s: this.STYLE_BORDER_R_HRIGHT_GRAY }],
            [{ v: "Max Score+Bonus+Timed", s: this.STYLE_HEADER_BORDER_HRIGHT_L }, { f: `${maxPointsAddress}+${extraPoints}`, s: this.STYLE_BORDER_R_HRIGHT_GRAY }],
            [{ v: "Top Team Score", s: this.STYLE_HEADER_BORDER_HRIGHT_L }, { f: `MAX(${actualScoreRange})`, s: this.STYLE_BORDER_R_HRIGHT_GRAY }],
            [{ v: "Top Team Score Pct of max", s: this.STYLE_HEADER_BORDER_HRIGHT_BL }, { f: `${topTeamScoreAddress}/${maxPossibleAddress}`, s: this.STYLE_BORDER_BR_HRIGHT_GRAY_FMTPCT }]
        ];

        this.writeCellTable(sheet, HEADER_ROWS, LABEL_COL, headerTable);

        // ---------------------------------------------
        // Question analysis calculations
        // ---------------------------------------------

        for (let q = 0; q < numQuestions; q++) {
            const questionCol = FIRST_QUESTION_COL + q;
            const entryCol = questionCol + 2;

            const scoreLetter = XLSX_STYLE.utils.encode_col(questionCol);
            const entryLetter = XLSX_STYLE.utils.encode_col(entryCol);

            const scoreRange =
                `'Score Calculation'!$${scoreLetter}${HEADER_ROWS + 1}:INDEX('Score Calculation'!$${scoreLetter}:$${scoreLetter},NumberOfTeams+${HEADER_ROWS})`;

            const entryRange =
                `'Score Entry'!$${entryLetter}${HEADER_ROWS + 1}:INDEX('Score Entry'!$${entryLetter}:$${entryLetter},NumberOfTeams+${HEADER_ROWS})`;

            const fullScoreRef = this.cellAddress(POINTS_ROW, questionCol);
            const fullCreditRef = this.cellAddress(FULL_CREDIT_ROW, questionCol);
            const attemptedRef = this.cellAddress(ATTEMPTED_ROW, questionCol);
            const fullySolvedRef = this.cellAddress(FULLY_SOLVED_ROW, questionCol);
            const attemptedNotSolvedRef = this.cellAddress(ATTEMPTED_NOT_SOLVED_ROW, questionCol);
            const partialRef = this.cellAddress(PARTIAL_ROW, questionCol);

            const formulaTable: TableCell[][] = [
                [{ v: 0, f: `COUNTIF(${scoreRange},${fullScoreRef})` }],
                [{ v: 0, f: `COUNTIF(${scoreRange},">0")-${fullCreditRef}` }],
                [{ v: 0, f: `COUNTBLANK(${entryRange})` }],
                [{ v: 0, f: `COUNTIF(${entryRange},">0")` }],
                [{ v: 0, f: `COUNTIF(${entryRange},"=0")` }],
                [{ v: 0, f: `COUNTIF(${entryRange},"=99")` }],
                [{ v: 0, f: `${attemptedRef}-${attemptedNotSolvedRef}` }],
                [{ v: 0, f: `${partialRef}+${attemptedNotSolvedRef}+${fullySolvedRef}` }]
            ];

            this.writeCellTable(sheet, HEADER_ROWS, questionCol, formulaTable);
        }

        // ---------------------------------------------
        // Worksheet dimensions
        // ---------------------------------------------

        this.setSheetSize(
            sheet,
            MAX_TEAMS + HEADER_ROWS,
            numQuestions + 3
        );

        return sheet;
    }
    /**
       * Generates a worksheet containing the Success Correlation Analysis data.
       * @returns The generated worksheet.
       */
    private generateSuccessCorrelationAnalysisSheet(): XLSX_STYLE.WorkSheet {
        const sheet = XLSX_STYLE.utils.json_to_sheet([]);
        const numQuestions = this.questionSheetData.length;

        const HEADER_ROWS = CipherScoreSheetGenerator.HEADER_ROWS;
        const MAX_TEAMS = CipherScoreSheetGenerator.MAX_TEAMS;

        // Column layout
        const TEAM_COL = 1;
        const FIRST_QUESTION_COL = TEAM_COL + 1;
        const FINAL_RANK_COL = FIRST_QUESTION_COL + numQuestions;
        const SUMMARY_COL = FINAL_RANK_COL + 2;

        // ---------------------------------------------
        // Headers
        // ---------------------------------------------

        this.genQuestionHeader(sheet, TEAM_COL, "");
        this.populateTeamHeaders(sheet, TEAM_COL);
        this.mergeCells(sheet, 0, 0, 3, 0);

        // ---------------------------------------------
        // Final score ranks
        // ---------------------------------------------

        const finalScoreSourceCol = numQuestions + 4;
        const finalScoreLetter = XLSX_STYLE.utils.encode_col(finalScoreSourceCol);
        const finalScoreRange =
            `'Score Calculation'!$${finalScoreLetter}$${HEADER_ROWS + 1}:INDEX('Score Calculation'!$${finalScoreLetter}:$${finalScoreLetter},NumberOfTeams+${HEADER_ROWS})`;

        for (let team = 0; team < MAX_TEAMS; team++) {
            const row = HEADER_ROWS + team;
            const sourceScore =
                `'Score Calculation'!${this.cellAddress(row, finalScoreSourceCol)}`;

            this.setNumericFormula(
                sheet,
                row,
                FINAL_RANK_COL,
                this.teamFormula(`RANK(${sourceScore},${finalScoreRange})`),
                this.STYLE_BORDER_NONE_GRAY
            );
        }

        // ---------------------------------------------
        // Question success ranks
        // ---------------------------------------------

        for (let q = 0; q < numQuestions; q++) {
            const rankCol = FIRST_QUESTION_COL + q;
            const sourceCol = rankCol;
            const sourceLetter = XLSX_STYLE.utils.encode_col(sourceCol);
            const scoreRange =
                `'Score Calculation'!$${sourceLetter}$${HEADER_ROWS + 1}:INDEX('Score Calculation'!$${sourceLetter}:$${sourceLetter},NumberOfTeams+${HEADER_ROWS})`;

            for (let team = 0; team < MAX_TEAMS; team++) {
                const row = HEADER_ROWS + team;
                const sourceScore =
                    `'Score Calculation'!${this.cellAddress(row, sourceCol)}`;

                this.setNumericFormula(
                    sheet,
                    row,
                    rankCol,
                    this.teamFormula(`RANK(${sourceScore},${scoreRange})`)
                );
            }
        }

        // ---------------------------------------------
        // Final score and correlation summary headers
        // ---------------------------------------------

        const headers = ["Final Score", "", "Question", "Type", "Correlation"];

        headers.forEach((header, offset) => {
            if (header === "") {
                return;
            }

            const col = FINAL_RANK_COL + offset;
            const headerTable: TableCell[][] = [
                [{ v: header, s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                [{ v: " ", s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                [{ v: " ", s: this.STYLE_HEADER_BORDER_ALL_WRAP }]
            ];

            this.writeCellTable(sheet, 1, col, headerTable);
            this.mergeCells(sheet, 1, col, 3, col);
        });

        this.setColumnWidth(sheet, SUMMARY_COL - 1, 1);
        this.setColumnWidth(sheet, SUMMARY_COL, 8);
        this.setColumnWidth(sheet, SUMMARY_COL + 1, 25);
        this.setColumnWidth(sheet, SUMMARY_COL + 2, 10);

        // ---------------------------------------------
        // Correlation calculations
        // ---------------------------------------------

        const finalCorrelationRange = this.correlationRange(FINAL_RANK_COL);

        for (let q = 0; q < numQuestions; q++) {
            const row = HEADER_ROWS + q;
            const rankCol = FIRST_QUESTION_COL + q;
            const questionRange = this.correlationRange(rankCol);

            const rowTable: TableCell[][] = [[
                { v: "", f: this.cellAddress(3, rankCol), s: this.STYLE_BORDER_RL_GRAY },
                { v: "", f: this.cellAddress(0, rankCol), s: this.STYLE_BORDER_RL_GRAY },
                { v: "", f: `CORREL(${questionRange},${finalCorrelationRange})`, s: this.STYLE_BORDER_RL_GRAY_FMT3DEC }
            ]];

            this.writeCellTable(sheet, row, SUMMARY_COL, rowTable);
        }

        // ---------------------------------------------
        // Worksheet dimensions
        // ---------------------------------------------

        this.setSheetSize(
            sheet,
            Math.max(MAX_TEAMS + HEADER_ROWS - 1, HEADER_ROWS + numQuestions - 1),
            SUMMARY_COL + 2
        );

        return sheet;
    }

    /**
     * Generate a worksheet containing the Attempt Correlation Analysis data
     * @returns XLSX_STYLE.WorkSheet The generated worksheet
     */
    private generateAttemptCorrelationAnalysisSheet(): XLSX_STYLE.WorkSheet {
        const sheet = XLSX_STYLE.utils.json_to_sheet([]);
        const numQuestions = this.questionSheetData.length;

        const HEADER_ROWS = CipherScoreSheetGenerator.HEADER_ROWS;
        const MAX_TEAMS = CipherScoreSheetGenerator.MAX_TEAMS;

        // Column layout
        const SCORE_COL = 1;
        const FIRST_QUESTION_COL = SCORE_COL + 1;
        const RANK_SCORE_COL = SCORE_COL + numQuestions + 2;
        const FIRST_RANK_COL = RANK_SCORE_COL + 1;
        const SUMMARY_COL = 2 * numQuestions + 5;

        // ---------------------------------------------
        // Headers
        // ---------------------------------------------

        this.genQuestionHeader(sheet, SCORE_COL, "Score");
        this.genQuestionHeader(sheet, RANK_SCORE_COL, "Rank");
        this.populateTeamHeaders(sheet, SCORE_COL);

        this.mergeCells(sheet, 0, 0, 3, 0);


        // ---------------------------------------------
        // Final scores and their ranks
        // ---------------------------------------------

        const finalScoreSourceCol = numQuestions + 4;
        const finalScoreRange = this.teamRange(SCORE_COL);

        for (let team = 0; team < MAX_TEAMS; team++) {
            const row = HEADER_ROWS + team;

            const sourceScore = `'Score Calculation'!${this.cellAddress(row, finalScoreSourceCol)}`;
            const localScore = this.cellAddress(row, SCORE_COL);

            this.setNumericFormula(sheet, row, SCORE_COL, this.teamFormula(sourceScore), this.STYLE_BORDER_NONE_GRAY);
            this.setNumericFormula(sheet, row, RANK_SCORE_COL, this.teamFormula(`RANK(${localScore},${finalScoreRange})`), this.STYLE_BORDER_NONE_GRAY);
        }

        // ---------------------------------------------
        // Question attempt scores and ranks
        // ---------------------------------------------

        for (let q = 0; q < numQuestions; q++) {
            const scoreCol = FIRST_QUESTION_COL + q;
            const rankCol = FIRST_RANK_COL + q;
            const sourceCol = scoreCol + 2;

            const scoreRange = this.teamRange(scoreCol);

            for (let team = 0; team < MAX_TEAMS; team++) {
                const row = HEADER_ROWS + team;

                const sourceCell = `'Score Entry'!${this.cellAddress(row, sourceCol)}`;
                const localScore = this.cellAddress(row, scoreCol);

                const attemptScore = `10-IF(${sourceCell}="",10,IF(${sourceCell}=99,9,${sourceCell}))`;

                this.setNumericFormula(sheet, row, scoreCol, this.teamFormula(attemptScore));
                this.setNumericFormula(sheet, row, rankCol, this.teamFormula(`RANK(${localScore},${scoreRange})`));
            }
        }

        // ---------------------------------------------
        // Correlation summary headers
        // ---------------------------------------------

        const headers = ["Question", "Type", "Correlation"];

        headers.forEach((header, offset) => {
            const col = SUMMARY_COL + offset;

            const headerTable: TableCell[][] = [
                [{ v: header, s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                [{ v: " ", s: this.STYLE_HEADER_BORDER_ALL_WRAP }],
                [{ v: " ", s: this.STYLE_HEADER_BORDER_ALL_WRAP }]
            ];

            this.writeCellTable(sheet, 1, col, headerTable);
            this.mergeCells(sheet, 1, col, 3, col);
        });

        this.setColumnWidth(sheet, SUMMARY_COL - 1, 1);
        this.setColumnWidth(sheet, SUMMARY_COL, 8);
        this.setColumnWidth(sheet, SUMMARY_COL + 1, 25);
        this.setColumnWidth(sheet, SUMMARY_COL + 2, 10);

        // ---------------------------------------------
        // Correlation calculations
        // ---------------------------------------------

        const finalCorrelationRange = this.correlationRange(RANK_SCORE_COL);

        for (let q = 0; q < numQuestions; q++) {
            const row = HEADER_ROWS + q;
            const rankCol = FIRST_RANK_COL + q;

            const questionRange = this.correlationRange(rankCol);

            const rowTable: TableCell[][] = [[
                { v: "", f: this.cellAddress(3, rankCol), s: this.STYLE_BORDER_RL_GRAY },
                { v: "", f: this.cellAddress(0, rankCol), s: this.STYLE_BORDER_RL_GRAY },
                { v: "", f: `CORREL(${questionRange},${finalCorrelationRange})`, s: this.STYLE_BORDER_RL_GRAY_FMT3DEC }
            ]];

            this.writeCellTable(sheet, row, SUMMARY_COL, rowTable);
        }

        // ---------------------------------------------
        // Worksheet dimensions
        // ---------------------------------------------

        this.setSheetSize(sheet,
            Math.max(MAX_TEAMS + HEADER_ROWS - 1, HEADER_ROWS + numQuestions - 1),
            SUMMARY_COL + 2
        );

        return sheet;
    }
    /**
     * Gets the question type based on the cipher type and encode type.
     * @example If the cipher type is Aristocrat and the encode type is K1, the returned string will be "Aristocrat K1".
     * @param {IState} question - The question object.
     * @returns {string} The question type as a string.
     */
    private getQuestionType(question: IState): string {
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
    private calculateColumnWidth<T>(data: T[], headerKey: keyof T): number {
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
     * Note we count on the base type starting with the letter of the division
     */
    private calculateTestDivision(testType: ITestType): string {
        return testType.charAt(0).toUpperCase();
    }
    /**
     * Helper function to calculate the required row height in points (hpt) for a cell 
     * with a SINGLE LINE of text rotated 45 degrees.
     *
     * @param {number} columnWidthWch - The calculated column width in characters (wch) for this column.
     * @param {number} [fontSizePt=11] - The font size in points (defaults to 11). 
     * @returns {number} The required row height in points (hpt) for the single, rotated line.
     */
    private calculateRotatedSingleLineHeight(
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
    private downloadFileBlob = (blob: Blob, filename: string) => {
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
    public async generateAndInjectXmlAsync(
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
}
