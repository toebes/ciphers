import { cloneObject, repeatStr } from '../common/ciphercommon';
import { IScoreInformation, IState, ITestQuestionFields, ITestType, toolMode, } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { CipherEncoder, suggestedData } from './cipherencoder';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTTable } from '../common/jttable';

type IColumnOrder = number[][];
/*interface IColumnOrder {
    // columns: {
    //     isKnown: boolean;
    //     columnChoices: number[];
    // }
//}
 */

const MIN_COLUMNS = 4;
const MAX_COLUMNS_B = 9;
const MAX_COLUMNS_C = 11;

const DEBUG: boolean = false;

// TODO: fix the YWLY bug of multiple Ys not detecting the crib is split

interface ICompleteColumnarState extends IState {
    /** CompleteColumnar columns value */
    columns: number;
    /** CompleteColumnar crib text */
    crib: string;
}

class CribSplitInformation {

    private cribLength: number;
    private firstRow: number;
    private lettersInFirstRow: number;
    private lettersInSecondRow: number;
    private rowsData: string[];
    private rowCount: number;

    constructor(cribLength: number, rowData) {
        this.cribLength = cribLength;
        this.rowsData = rowData;
        this.rowCount = rowData.length;
    }
    public setSplitInformation(firstRow: number, lettersInFirstRow: number, lettersInSecondRow: number) {
        this.firstRow = firstRow;
        this.lettersInFirstRow = lettersInFirstRow;
        this.lettersInSecondRow = lettersInSecondRow;
    }

    public getCribLength(): number {
        return this.cribLength
    }
    public getFirstRow(): number {
        return this.firstRow;
    }
    public getLettersInFirstRow(): number {
        return this.lettersInFirstRow;
    }
    public getLettersInSecondRow(): number {
        return this.lettersInSecondRow;
    }
    public getRowLetters(rowIndex: number): string {
        return this.rowsData[rowIndex];
    }
    public isSplitOverRows(): boolean {
        return this.lettersInFirstRow > 0 && this.lettersInSecondRow > 0;
    }
    public getLastTableRow(): string {
        return this.rowsData[this.rowCount - 1];
    }

}

/**
 * This class creates a Complete Columnar solver.
 */
class CompleteColumnarSolver extends CipherEncoder {
    private readonly cipherCompleteColumnarEncoder: CipherCompleteColumnarEncoder;
    // The encoding
    private readonly cipherText: string;
    private readonly crib: string;
    // Length of padding...
    private readonly padLength: number;
    // The number of rails in the rail fence
    private readonly columnCount: number;
    // The offset of where to start
    private readonly columnOrder: number[];
    // Length of text to encode.
    private readonly textLength: number;
    // Number of rows total len divided by column count.
    private readonly rowCount: number;

    private readonly columnsToAnalyze = [];
    private badCribChoice: boolean = false;
    private cribSplitInformation: CribSplitInformation[] = [];

    /**
     * Creates a Complete Columnar solver.  Every character in the passed in inputText will
     * be placed in a unique position in the array.
     * @param columns The number of columns
     * @param columnOrder array containing the index of the column (size MUST be equal to number of columns)
     * @param inputText The inputText to be encoded
     */
    constructor(compColEnc: CipherCompleteColumnarEncoder, columns: number, columnOrder: string, inputText: string, crib: string) {
        super();
        this.cipherCompleteColumnarEncoder = compColEnc;
        this.cipherText = '';
        this.columnCount = columns;
        this.columnOrder = [];
        this.crib = crib;
        this.padLength = 0;

        if (columnOrder === undefined) {
            columnOrder = '1';
        }

        columnOrder = columnOrder.replace(/[\s]/g, '').toUpperCase().trim();

        if (this.columnCount > columnOrder.length) {
            // pad with ~
            columnOrder = columnOrder + repeatStr('~', this.columnCount - columnOrder.length);
        } else if (this.columnCount < columnOrder.length) {
            // truncate
            columnOrder = columnOrder.substring(0, this.columnCount);
        }

        const orderString = columnOrder.split('');
        const orderStringSorted = orderString.slice().sort();
        for (const order of orderStringSorted) {
            const indexOfSortedLetter = orderString.indexOf(order);
            this.columnOrder.push(indexOfSortedLetter);
            orderString[indexOfSortedLetter] = ' ';
        }

        const text = this.minimizeString(inputText)

        const charsOver = (text.length % this.columnCount);
        this.padLength = (charsOver > 0) ? this.columnCount - charsOver : charsOver;
        if (DEBUG) {
            console.log('Pad length is: ' + this.padLength);
        }
        const plainText = text + repeatStr('X', this.padLength);
        this.textLength = plainText.length;
        if (DEBUG) {
            console.log('So we encode: ' + plainText);
        }

        for (let i = 0; i < this.columnCount; i++) {
            const index = this.columnOrder[i];
            for (let j = index; j < plainText.length; j += this.columnCount) {
                this.cipherText += plainText[j];
            }

        }
        this.rowCount = plainText.length / this.columnCount;
        if (DEBUG) {
            console.log('---->>>Encoded as: ' + this.cipherText);
        }
    }

    public setBadCribChoice(): void {
        this.badCribChoice = true;
    }

    public isBadCribChoice(): boolean {
        return this.badCribChoice;
    }

    public getCribSplitInformation(): CribSplitInformation[] {
        return this.cribSplitInformation;
    }

    public getPadLength(): number {
        return this.padLength;
    }

    public isEncoded(): boolean {
        return this.cipherText.length > 0;
    }

    public getTextLength(): number {
        return this.textLength;
    }

    public getRowCount(): number {
        return this.rowCount;
    }

    public getCrib(): string {
        return this.crib;
    }

    public getCompleteColumnarEncoding(): string {
        return this.cipherText;
    }

    public getColumnEncodingOrder(): string {
        const columnEncodingOrder = [];
        for (let i = 0; i < this.columnCount; i++) {
            let col = this.columnOrder.indexOf(i);
            columnEncodingOrder.push(col + 1);
        }
        return columnEncodingOrder.join(',');
    }

    public getSolutionColumnOrder(): string {
        const oneBasedColumns = [];
        this.columnOrder.forEach((element) => {
            oneBasedColumns.push(element + 1);
        });

        return oneBasedColumns.join(',');
    }

    /**
     * Create a formatted div which shows the Rail Fence solution.
     */
    public getCompleteColumnarAnswer(): JQuery<HTMLElement> {
        const returnValue = $('<div/>', { class: 'TOSOLVE' });

        // TODO: These font sizes are hard-coded, but there should/could probably
        // be some CSS magic here...???
        let fontSize = '16pt';
        if (this.textLength > 90) {
            fontSize = '10pt';
        } else if (this.textLength > 45) {
            fontSize = '14pt';
        }

        returnValue.append('<p/>');

        return returnValue;
    }

    public addColumnsToAnalyze(columns: number, cribSplitInformation: CribSplitInformation): void {
        this.columnsToAnalyze.push(columns);
        this.cribSplitInformation.push(cribSplitInformation);
    }

    public getCompleteColumnarSolution(): JQuery<HTMLElement> {
        let foundAnswer = false;

        const returnValue = $('<div/>');
        // Not sure this is useful information.
        //        returnValue.append(CipherCompleteColumnarEncoder.paragraph('We can find the crib in ' + this.columnsToAnalyze.length + ' position(s) of the ' + this.columnsToAnalyze[columnToAnalyze] + ' column encoding.'));

        let skipAlreadyNoted = -1;
        for (let columnToAnalyze = 0; columnToAnalyze < this.columnsToAnalyze.length; columnToAnalyze++) {

            if (DEBUG) {
                console.log('Split Info: ' + this.cribSplitInformation[columnToAnalyze]);
            }
            const columnsBeingAnalyzed = this.columnsToAnalyze[columnToAnalyze];
            if (skipAlreadyNoted === columnsBeingAnalyzed) {
                if (DEBUG) {
                    console.log(`Skip analyzing ${columnToAnalyze} because we already decided it is too many for crib given on this test.`);
                }
                continue;
            } else {
                skipAlreadyNoted = -1;
            }

            const s = this.cribSplitInformation[columnToAnalyze];
            let details = $('<div>');

            details.append($('<h5>').append(`${this.columnsToAnalyze[columnToAnalyze]} column possibilities`));

            if (columnsBeingAnalyzed > this.crib.length + 3) {
                details.append('Not valid -- crib too short')
                returnValue.append(details);
                skipAlreadyNoted = columnsBeingAnalyzed;
                continue;
            }

            if (s.isSplitOverRows()) {
                details.append($('<div>').append('Since the crib is found split, we know that ' + ' ends a row and ' + ' starts the subsequent row.'));
            } else {
                details.append(CipherCompleteColumnarEncoder.paragraph('Since the crib is not split, we know that it is contained all on one row.'))
            }


            details.append(`Row ${s.getFirstRow() + 1} has ${s.getLettersInFirstRow()} crib letters in it (`);
            details.append();
            details.append($('<span>').addClass('morefocus').text(this.crib.substring(0, s.getLettersInFirstRow())))
                .append(`${this.crib.substring(s.getLettersInFirstRow())}).`);
            if (s.isSplitOverRows()) {
                details.append(`  So for row ${s.getFirstRow() + 1}, the column order has to `)
                    .append($('<span>').addClass('fq').text('end')).append(' with these letters.');
            }

            returnValue.append(details);

            if (s.getLettersInSecondRow() > 0) {
                details = $('<div>');
                details.append(`Row ${s.getFirstRow() + 1 + 1} has ${s.getLettersInSecondRow()} crib letters in it (`);
                details.append(this.crib.substring(0, s.getLettersInFirstRow()));
                details.append($('<span>').addClass('morefocus').text(this.crib.substring(s.getLettersInFirstRow(), s.getLettersInFirstRow() + s.getLettersInSecondRow())));
                details.append(this.crib.substring(s.getLettersInFirstRow() + s.getLettersInSecondRow()));
                details.append(`).`);
                if (s.isSplitOverRows()) {
                    details.append(`  So for row ${s.getFirstRow() + 1 + 1}, the column order has to `)
                        .append($('<span>').addClass('fq').text('start')).append(' with these letters.');
                }
            }
            // So we can arrange the letter in the following order and take a look...
            const solutionCombos = this.getPossibleColumnOrderings(this.columnsToAnalyze[columnToAnalyze], s);
            if (solutionCombos === undefined) {
                // bad crib
                const errorMessage = `WARNING: The crib is not adequate to compute a solution for ${this.columnsToAnalyze[columnToAnalyze]} columns.`;
                this.cipherCompleteColumnarEncoder.setErrorMsg(errorMessage, 'badcols', null);
                let mmm = `This crib does not produce any combinations to try.`;
                details.append($('<p>').append($('<span>').addClass('bademail').text(mmm)));
                returnValue.append(details).append($('<p>'));
                continue;
            } else {
                // Clear the error message
                this.cipherCompleteColumnarEncoder.setErrorMsg('', 'badcols', null);
                // Print list of combinations.
                details.append($('<p>'));
            }

            if (DEBUG) {
                console.log(`Trying solutions combinations: ${solutionCombos.length}`);
            }

            returnValue.append(details).append($('<p>'));

            if (solutionCombos.length === 0) {
                returnValue.append(`There are no valid column orderings for this crib placement.`).append($('<p>'));
            } else {
                returnValue.append(CipherCompleteColumnarEncoder.paragraph(`With this information, we can derive 
                    different combinations for column ordering.`));

                let trials = $('<div>');
                let paragraph = $('<p>');
                let firstPass = true;
                for (let x = 0; x < solutionCombos.length; x++) {
                    if (firstPass) {
                        paragraph.append(`So far, we've determined these possible column orders: `);
                        firstPass = false;
                    } else {
                        paragraph.append('<b>; </b>');
                    }
                    if (true) {
                        // This show column ordering as a C with subscript.
                        let letters = solutionCombos[x].map(num => {
                            return `C<sub>${String.fromCharCode(num + 96)}</sub>`;
                        });
                        const potentialColumnOrder = letters.join(', ');
                        paragraph.append($('<span>').addClass('allfocus').append(potentialColumnOrder));

                    } else {
                        // This shows column ordering as plain numbers
                        const potentialColumnOrder = solutionCombos[x].join(', ');
                        paragraph.append($('<span>').addClass('allfocus').text(potentialColumnOrder));
                    }

                }
                returnValue.append(trials.append(paragraph));

                // Making the assumption that any 'X'es in the last row MUST be at the end of the row, we can further
                // Limit the columns order to these possibilities.
                returnValue.append(CipherCompleteColumnarEncoder.paragraph(`Try to further refine the possibilities by 
                    supposing that any padding characters ('X') in the last row of the table are not part of the 
                    plaintext.  This additional information dictates the position of those columns.`));

                const refinedCombos = this.applyPaddingAssumption(solutionCombos, s);
                trials = $('<div>');
                paragraph = $('<p>');
                firstPass = true;
                for (let x = 0; x < refinedCombos.length; x++) {
                    if (firstPass) {
                        paragraph.append(`After applying this analysis, we've determined these are the possible column orders: `);
                        firstPass = false;
                    } else {
                        paragraph.append('<b>; </b>');
                    }

                    if (true) {
                        // This show column ordering as a C with subscript.
                        let letters = refinedCombos[x].map(num => {
                            return `C<sub>${String.fromCharCode(num + 96)}</sub>`;
                        });
                        const potentialColumnOrder = letters.join(', ');
                        paragraph.append($('<span>').addClass('allfocus').append(potentialColumnOrder));

                    } else {
                        // This shows column ordering as plain numbers
                        const potentialColumnOrder = refinedCombos[x].join(',');
                        paragraph.append($('<span>').addClass('allfocus').text(potentialColumnOrder));
                    }
                }
                returnValue.append(trials.append(paragraph));

                let statusMessage = `Well, it was worth a try.`;
                if (solutionCombos.length > refinedCombos.length) {
                    statusMessage = `YAY! Fewer combinations to try!`;
                }
                returnValue.append(CipherCompleteColumnarEncoder.paragraph(statusMessage));

                const actualColumnOrder = this.getColumnEncodingOrder();
                let potentialSolutionTable = undefined;
                let trial = undefined;
                for (let x = 0; x < refinedCombos.length; x++) {


                    if (true) {
                        // This show column ordering as a C with subscript.
                        let letters = refinedCombos[x].map(num => {
                            return `C<sub>${String.fromCharCode(num + 96)}</sub>`;
                        });
                        const potentialColumnOrder = letters.join(', ');
                        trial = $('<div>');
                        trial.append(CipherCompleteColumnarEncoder.paragraph('Trying column order: ').append($('<span>').addClass('allfocus').append(potentialColumnOrder)));
                        //paragraph.append($('<span>').addClass('allfocus').append(potentialColumnOrder));

                    } else {
                        // This shows column ordering as plain numbers
                        const potentialColumnOrder = refinedCombos[x].join(', ');
                        trial = $('<div>');
                        trial.append(CipherCompleteColumnarEncoder.paragraph('Trying column order: ').append($('<span>').addClass('allfocus').text(potentialColumnOrder)));
                    }


                    returnValue.append(trial);
                    potentialSolutionTable = CipherCompleteColumnarEncoder.makeCompleColumnarJTTable(this.columnsToAnalyze[columnToAnalyze], this.cipherText, this.getTextLength(), refinedCombos[x]);
                    returnValue.append(potentialSolutionTable.generate());

                    if (actualColumnOrder === refinedCombos[x].join(',')) {
                        returnValue.append($('<p>').append($('<span>').addClass('allfocus').text('This looks like a viable answer!  All done.')));
                        foundAnswer = true;
                        break;
                    } else {
                        returnValue.append(CipherCompleteColumnarEncoder.paragraph('Reading across the rows, starting at the top, the text does not appear to make sense, keep trying other combinations...'));
                    }
                }
                if (foundAnswer) {
                    break;
                }
            }

        }

        return returnValue;
    }

    private getPossibleColumnOrderings(columnsInThisAnalysis: number, splitInfo: CribSplitInformation): number[][] {

        // > ??EVE<
        // >R  ? ?<
        // subrtact method
        // step 1  Create array with all possible ordering combinations, we will subtract from here
        // [[false,false,false,false,false,false],[1,2,3,4,5,6],[1,2,3,4,5,6],[1,2,3,4,5,6],[1,2,3,4,5,6],[1,2,3,4,5,6],[1,2,3,4,5,6]]
        const ordering = [];
        for (let i = 0; i <= columnsInThisAnalysis; i++) {
            const anOrder = []
            for (let j = 0; j < columnsInThisAnalysis; j++) {
                if (i !== 0) {
                    anOrder[j] = j + 1;
                } else {
                    anOrder[j] = false;
                }
            }
            ordering.push(anOrder);
        }
        const orderingCombinations = [];

        const minimizedCrib = this.minimizeString(this.crib);

        // [[3], [1,2,4,5,6],[1,2,4,5,6],[1,2,4,5,6],[1,2,4,5,6],[1,2,4,5,6]]
        if (splitInfo.isSplitOverRows()) {
            // start with second row...find all occurrences of crib letters in second row
            const secondRowLetters = splitInfo.getRowLetters(splitInfo.getFirstRow() + 1);
            if (DEBUG) {
                console.log('ROW 2 letters: ' + secondRowLetters);
            }

            // Get the part of the crib in the second row.  This fills the array from the FRONT
            let cribInSecondRow = minimizedCrib.substring(splitInfo.getLettersInFirstRow(), splitInfo.getLettersInFirstRow() + columnsInThisAnalysis);

            let cribLetters = cribInSecondRow.split('');
            let index = 0, rowOrder = [];

            // step 2 (R from 2nd row)
            // cribLetters contains letters from the second row, so go in the first position.
            let orderIndex = 1;
            for (let l of cribLetters) {
                if (DEBUG) {
                    console.log('Check for ' + l);
                }
                const foundAt = [];
                let startIndex = 0, foundCount = 0;
                while ((index = secondRowLetters.indexOf(l, startIndex)) > -1) {
                    foundAt.push(index + 1);
                    if (foundCount > 0) {
                        // This is at least the second time finding this letter...
                        // { T: [5],
                        //   O: [1],
                        //   E: [4,6]
                        //   V: [2]
                        //   E: [6,4]
                        // }
                        if (DEBUG) {
                            console.log('ROW 2 Found a duplicate for ' + l + ' at ' + (index + 1));
                        }
                    } else {
                        if (DEBUG) {
                            console.log('ROW 2 Found occurrence of ' + l + ' at ' + (index + 1));
                        }
                    }
                    // removePositionFromOrdering()

                    //rowOrder.push(index + 1);
                    startIndex = index + 1;
                    foundCount++;
                }
                this.removePositionFromOrdering(ordering, orderIndex, foundAt);
                orderIndex++;
            }
            // step 3 (last E from first row in 2 spots)
            // [[3], [1,2,5], [1,2,5],[4,6], [1,2,5], [4,6]]
            // Get the part of the crib in the first row.  This fill the array from the BACK

            const firstRowLetters = splitInfo.getRowLetters(splitInfo.getFirstRow());

            if (DEBUG) {
                console.log('ROW 1 letters: ' + firstRowLetters);
            }

            let cribInFirstRow = minimizedCrib.substring(0, splitInfo.getLettersInFirstRow());
            cribLetters = cribInFirstRow.split('');


            // TODO if crib is > # columns then :
            //  1. the column is known we are done
            //  2. or it at least eliminates an option if there are more than one possibility.
            let outputColumn = firstRowLetters.length;
            for (let i = cribLetters.length - 1; i >= 0; i--) {
                let toFind = cribLetters[i];
                if (DEBUG) {
                    console.log('i = ' + i + ' Check for the letter ' + toFind);
                }
                const foundAt = [];

                for (let testColumn of ordering[outputColumn]) {
                    if (firstRowLetters[testColumn - 1] === toFind) {
                        foundAt.push(testColumn);
                        if (DEBUG) {
                            let position = 'occurrence of';
                            if (foundAt.length > 1) {
                                position = 'a duplicate for'
                            }
                            console.log(`ROW 1 Found ${position} ${toFind} at ${(index + 1)}`);
                        }
                    }
                }

                this.removePositionFromOrdering(ordering, outputColumn, foundAt);
                outputColumn--;
            }
            orderingCombinations.push(ordering);
        }
        else {
            let cribLetters = minimizedCrib;
            // Entire crib is contained on one row.
            // determine how many orderings we need (columns - crib.length + 1)
            // loop thru number of orderings (i)
            //   take ordering and make a copy.
            //   loop over crib (j)
            //     set crib position and remove from everywhere else
            //     make combinations for this ordering and add the combinations to a list
            // do whatever is next with those combinations.
            const rowWithCrib = splitInfo.getRowLetters(splitInfo.getLettersInFirstRow() > 0 ? splitInfo.getFirstRow() : splitInfo.getFirstRow() + 1);
            let cribLength = splitInfo.getCribLength();
            const orderingCount = columnsInThisAnalysis - cribLength + 1;
            for (let i = 0; i < orderingCount; i++) {
                let orderingClone = this.cloneColumnOrder(ordering);
                let index = 0;
                for (let j = 1; j <= cribLength; j++) {
                    const foundAt = [];
                    let startIndex = 0, foundCount = 0;
                    while ((index = rowWithCrib.indexOf(cribLetters[j - 1], startIndex)) > -1) {
                        foundAt.push(index + 1);
                        if (DEBUG) {
                            let position = 'occurrence of';
                            if (foundCount > 0) {
                                position = 'a duplicate for'
                            }
                            console.log(`Found ${position} ${cribLetters[j - 1]} at ${(index + 1)}`);
                        }
                        startIndex = index + 1;
                        foundCount++;
                    }
                    this.removePositionFromOrdering(orderingClone, j + i, foundAt);
                }
                orderingCombinations.push(orderingClone);
            }
        }

        // TODO: PUSH COLUMNS with X to the RIGHT.
        // go thru the orderingCombinations and remove any that have any X before a letter.

        // step 4 V from 1st row
        // [[3], [1,5], [1,5], [4,6],[2],[4,6]]

        // Step 5
        // Check for X in 4 or 6 and we are cheating...Eliminate 4 or 6
        // TODO - this is a shortcut for solving that can be implemented...
        // [[3], [1,5],[1,5],[4],[2],[6]]

        // Step 6 go thru array and collect entries that have LEN > 1 into SET.  (i.e [1,5]) It is possible to have the same number in different sets?? UNLIKELY
        // { 1: -1,
        //   5: -1
        // }
        // Step 7 Iterate thru the MAP.  Iterate thru the order array and find the first entry with '1', and replace it, remove the '1' from every where else.
        // This makes a copy... we need this...

        //const combinations = [].concat(ordering.slice(1));
        let combos = [];
        for (const o of orderingCombinations) {

            this.printOrderingPossibilities(o);

            if (DEBUG) {
                console.log(`Combinations to consider: ${this.countCombinations(o)}`);
            }

            let c = this.determineUniqueCombinations(o);
            if (c.length > 128) {
                return undefined;
            } else {
                combos = combos.concat(c);
            }
        }

        return combos;
    }

    /**
     * This routine throws out any combinations that do not end will all 'X's.
     * @private
     */
    private applyPaddingAssumption(possibleColumnCombinations: number[][], cribSplitInfo: CribSplitInformation): number[][] {
        // Making the assumption that any 'X'es in the last row MUST be at the end of the row, we can further
        // Limit the columns order to these possibilities.
        const lastRow = cribSplitInfo.getLastTableRow();
        // Go thru each combo and throw out ones where there are non-X letters after X's in the last row.
        const refinedCombos = [];
        for (const combo of possibleColumnCombinations) {
            let foundX = false;
            let throwOut = false;
            let s = '';
            for (const col of combo) {
                s += lastRow[col - 1];
            }
            if (/^[^X]*(X+)?$/.test(s)) {
                refinedCombos.push(combo);
            }
        }
        return refinedCombos;
    }

    private findChoosableColumns(columnOrder: IColumnOrder): number[] {
        const result: number[] = [];

        for (let col = 1; col < columnOrder.length; col++) {
            if (columnOrder[col].length > 1) {
                for (let v of columnOrder[col]) {
                    if (!result.includes(v)) {
                        result.push(v);
                    }
                }
            }
        }
        return result.sort(function (a, b) {
            return a - b;
        });
    }

    public countCombinations(columnOrder: IColumnOrder): number {
        let combinations = 1
        for (let i = 1; i < columnOrder.length; i++) {
            combinations *= columnOrder[i].length;
        }
        return combinations;
    }

    private cloneColumnOrder(columnOrder: IColumnOrder): IColumnOrder {
        let result: IColumnOrder = [];
        for (let ent of columnOrder) {
            result.push([...ent]);
        }

        return result;
    }


    /**
     * Generates all possible unique combinations where:
     * - For each row i (starting from 1), we pick exactly one value from row[i]
     * - All chosen values across the combination must be unique
     * - row[0] is a boolean array indicating which columns allow single-element rows
     *
     * @param {boolean[][]} matrix - 2D array of size [n, n+1]
     *                             matrix[0] = boolean[] of length n+1
     *                             matrix[1..n] = number[] (or any values), each up to n elements
     * @returns {Array<Array<any>>} All valid combinations where each combination has exactly n elements,
     *                              all unique, and respects the "exactly one" constraints
     */
    private determineUniqueCombinations(matrix) {
        const n = matrix.length - 1;
        const rows = matrix.slice(1);
        const result = [];

        function backtrack(combination, used, rowIndex) {
            if (rowIndex === n) {
                result.push([...combination]);
                return;
            }

            for (const value of rows[rowIndex]) {
                if (!used.has(value)) {
                    combination.push(value);
                    used.add(value);
                    backtrack(combination, used, rowIndex + 1);
                    combination.pop();
                    used.delete(value);
                }
            }
        }

        backtrack([], new Set(), 0);
        return result;
    }


    private printOrderingPossibilities(ordering: [][]): void {
        let msg = '\nOrdering possibilities: \n['
        for (let i = 0; i < ordering.length; i++) {
            msg += '['
            for (let j = 0; j < ordering[i].length; j++) {
                msg += (ordering[i][j] === undefined ? '' : (ordering[i][j] + ((ordering[i].length - 1) > j ? ',' : '')));
            }
            msg += ((ordering.length - 1) > i ? '],\n' : ']\n');
        }
        msg += ']\n';
        if (DEBUG) {
            console.log(msg);
        }
        return;
    }

    /**
     * @param ordering - Array of possibilites for ordering the columns
     * @param orderIndex - the index we are setting, all other indexes we'll remove the foundAts
     * @param foundAt - the list of indexes (positions) we found the crib letter at.
     */
    private removePositionFromOrdering(ordering, orderIndex, foundAt): void {
        ordering[orderIndex] = foundAt;

        if (foundAt.length === 1) {
            ordering[0][orderIndex - 1] = true;
            for (let i = 1; i <= ordering[0].length; i++) {
                if (i !== orderIndex) {
                    let indexOfNumberToRemove = ordering[i].indexOf(foundAt[0]);
                    if (indexOfNumberToRemove !== -1) {
                        ordering[i].splice(indexOfNumberToRemove, 1);
                        if (ordering[i].length === 1/* && !ordering[0][i]*/) {
                            this.removePositionFromOrdering(ordering, i, ordering[i]);
                        }
                    }
                }
            }
        }
    }

}

/**
 * CipherCompleteColumnarEncoder - This class handles all of the actions associated with encoding
 * a CompleteColumnar cipher.
 */
export class CipherCompleteColumnarEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public cipherName = 'Complete Columnar';

    public guidanceURL = 'TestGuidance.html#CompleteColumnar';

    public validTests: ITestType[] = [ITestType.None, ITestType.bstate, ITestType.bregional, ITestType.cregional, ITestType.cstate];

    private thisTestType = undefined;
    private currentSolverSolution: CompleteColumnarSolver = undefined;

    public defaultstate: ICompleteColumnarState = {
        operation: 'decode',
        cipherString: '',
        cipherType: ICipherType.CompleteColumnar,
        columns: 6,
        replacement: {},
        crib: '',
    };

    public state: ICompleteColumnarState = cloneObject(this.defaultstate) as ICompleteColumnarState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];

    /** Save and Restore are done on the CipherEncoder Class */

    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this, this.state.columns, this.state.keyword, this.state.cipherString, this.state.crib);
        const strings: string[][] = this.makeReplacement(
            ccs.getCompleteColumnarEncoding(),
            this.state.cipherString.length
        );
        const cipherString = strings[0];
        let len = 0;
        if (strings.length > 0) {
            len = cipherString[0].length;
        }
        const result: ITestQuestionFields = {
            version: 2,
            answer: this.repeatStr(' ', len),
            replacements: this.repeatStr(' ', 6 * len),
            separators: this.repeatStr(' ', len),
            notes: '',
        };
        return result;
    }

    /**
     * Determines if this generator is appropriate for a given test
     * type.  For Division A, the Caesar is limited to an offset +- 3
     * @param testType Test type to compare against
     * @param anyOperation Don't restrict based on the type of operation
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType, anyOperation: boolean): string {
        let result = super.CheckAppropriate(testType, anyOperation);
        if (this.thisTestType === undefined || this.thisTestType !== testType) {
            this.thisTestType = testType;
        }

        // Check if valid for this test type.
        if (this.validTests.indexOf(testType) >= 0) {
            return '';
        }

        if (!anyOperation && result === '' && testType !== undefined) {
            // What is allowed is:
            //  Division B Regional:  Up to 9 columns, crib no shorter than columns - 1.
            //  Division B State:  Up to 9 columns, crib no shorter than columns - 1.
            //  Division C Regional:  Up to 9 columns, crib no shorter than columns - 1.
            //  Division C State:  Up to 11 columns, crib no shorter than columns - 3.
            let errorMessage = '';
            const testUsage = this.getTestUsage();
            const usedOnCState = testUsage.includes(ITestType.cstate) || testUsage.includes(ITestType.None);
            const spacelessCrib = this.minimizeString(this.state.crib);

            if ((testType === ITestType.bregional || testType === ITestType.bstate || testType === ITestType.cregional) &&
                this.state.columns > 9) {
                result = 'Only 9 or fewer columns are allowed on ' + this.getTestTypeName(testType);
            }
            else if ((testType === ITestType.cstate || testType === ITestType.None) && this.state.columns > 11) {
                result = 'Only 11 or fewer columns are allowed on ' + this.getTestTypeName(testType);
            }
            else if (spacelessCrib.length < this.state.columns - 1 && !usedOnCState) {
                result = `For a ${this.getTestTypeName(testType)} test and a column count of ${this.state.columns}, the length of the crib must be no shorter than ${(this.state.columns - 1)}
                    (i.e. one less the number of columns used).`;
            } else if (spacelessCrib.length < this.state.columns - 3 && usedOnCState) {
                result = `For a ${this.getTestTypeName(testType)} test and a column count of ${this.state.columns}, the length of the crib must be no shorter
                 than ${(this.state.columns - 3)} (i.e. three less the number of columns used).`;
            }
        }
        return result;
    }

    /**
     * Sets the crib text
     * @param crib The crib text to serve as a hint
     */
    public setCrib(crib: string): boolean {
        let changed = false;
        if (crib !== this.state.crib) {
            this.setErrorMsg('', 'criblen', null);
            changed = true;
            this.state.crib = crib.toUpperCase();
        }

        return changed
    }

    /**
     * Set the order of the columns
     */
    public setColumnOrder(columnOrder: string): boolean {
        let changed = false;
        if (columnOrder !== this.state.keyword) {
            changed = true;
            this.state.keyword = columnOrder;
        }
        return changed;
    }

    /**
     * Set the number of rail fence rails.
     * @param columns The number of rails selected on the spinner.
     */
    public setColumns(columns: number, onRestore: boolean = true): boolean {
        let changed = false;

        const testUsage = this.getTestUsage();
        const usedOnC = testUsage.includes(ITestType.cstate) ||
            testUsage.includes(ITestType.cregional) ||
            testUsage.includes(ITestType.None);

        let maxColumns = usedOnC ? MAX_COLUMNS_C : MAX_COLUMNS_B;

        //let maxColumns = this.thisTestType === ITestType.cstate ? MAX_COLUMNS_C : MAX_COLUMNS_B;

        if (!onRestore) {
            if (columns < MIN_COLUMNS) {
                columns = MIN_COLUMNS;
                changed = true;
            } else if (columns > maxColumns) {
                columns = maxColumns;
                changed = true;
            }
        }

        if (columns !== this.state.columns) {
            if (columns >= MIN_COLUMNS && columns <= maxColumns) {
                this.state.columns = columns;
                this.setErrorMsg('', 'colcount', null);
                $('#err').text('');
                changed = true;
            } else {
                this.setErrorMsg(`For a ${this.getTestTypeName(this.thisTestType)}, the number of columns must be between ${MIN_COLUMNS} and ${maxColumns}`, 'colcount', null);
            }
        }

        return changed;
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        $('#statistics').text(`Plain text length=${this.minimizeString(this.state.cipherString).length}`);
        this.validateQuestion();
        let res = this.build();
        $('#answer')
            .empty()
            .append(res);

        const target = $('#sol')
        target
            .empty()
            .append('<hr/>')

        this.genCompleteColumnarSolution(ITestType.None, target);

        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }

    /**
     * Generate UI components for display on "Answers and Solutions"
     * @param testType the type of test being edited
     * @returns JQuery html element detailing the solving steps
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.isLoading = false;

        this.genCompleteColumnarSolution(testType, result);

        return result;
    }

    setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }

    /**
     * Generate the recommended score and score ranges for a cipher along with text explaining some of the parameters.
     * @returns Computed score ranges for the cipher
     */
    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)

        let suggested = 0;
        let scoringText = ''
        let cribNotSplit = ' The crib is not split. ';
        let cribDuplicates = '';
        let analyzeMultipleColumns = '';
        let paddingText = '';

        // Indicate no padding
        if (qdata.minquote.length % this.state.columns === 0) {
            paddingText = ' There are no padding characters. ';
        }

        // Number of columns plus length of cipher sets suggested
        suggested = Math.round((15 * this.state.columns) + (1.5 * qdata.minquote.length));

        // Get the current solution information.
        // const completeColumnarSolver: CompleteColumnarSolver = new CompleteColumnarSolver(this, this.state.columns, this.state.keyword, this.state.cipherString, this.state.crib);
        // const cribSplitInformations = completeColumnarSolver.getCribSplitInformation();

        const completeColumnarSolver = this.currentSolverSolution;
        let cribSplitInformations = [];
        if (completeColumnarSolver !== undefined) {
            cribSplitInformations = completeColumnarSolver.getCribSplitInformation();
        }

        // Analyze the crib
        if (cribSplitInformations.length > 0) {
            // Harder if multiple crib possibilities are found
            let numberOfSplitCribs = cribSplitInformations.length;
            if (numberOfSplitCribs > 3) {
                numberOfSplitCribs = 3;
            }
            suggested += (15 * (numberOfSplitCribs - 1));

            // placement of crib in multiple rows makes it more difficult
            let splitCount = 0;
            for (let i = 0; i < cribSplitInformations.length; i++) {
                if (cribSplitInformations[i].isSplitOverRows()) {
                    splitCount += 1;
                    suggested += 15;
                    cribNotSplit = ' The crib is split. ';
                }
                if (splitCount > 3) {
                    break;
                }
            }
        }

        // duplicate letters in crib row(s) makes is more difficult + 15 for each duplicate
        const spacelessCrib = this.minimizeString(this.state.crib);
        const cribUnique = spacelessCrib.split('').filter((x, i, a) => a.indexOf(x) === i);
        const cribUniqueDifference = spacelessCrib.length - cribUnique.length;
        if (cribUniqueDifference > 0) {
            suggested += (15 * (cribUniqueDifference));
            cribDuplicates = ' The crib has duplicate letters, which makes finding the column order more difficult. ';
        }

        // if number of columns is a multiple of the length of the cipher (no pad characters), then add points.
        if (qdata.minquote.length % this.state.columns === 0) {
            suggested += 15;
        }

        // Add points for the number of factors in the ciphertext length.
        const possibleColumns = [];

        const maxColumns = this.thisTestType === ITestType.cstate ? MAX_COLUMNS_C : MAX_COLUMNS_B;
        for (let i = MIN_COLUMNS; i <= maxColumns; i++) {
            if (qdata.minquote.length % i === 0) {
                possibleColumns.push(i);
            }
        }
        if (possibleColumns.length > 1) {
            analyzeMultipleColumns = ' There are multiple column that must be analyzed. ';
        }

        suggested += ((possibleColumns.length - 1) * 15);

        let range = 20;
        const min = Math.max(suggested - range, 0)
        const max = suggested + range
        suggested += Math.round(range * Math.random() - range / 2);

        let rangetext = ''
        if (max > min) {
            rangetext = `, from a range of ${min} to ${max}`
        }
        if (qdata.len < 15) {
            scoringText = `<p><b>WARNING:</b> <em>There are only ${qdata.len} characters in the quote, we recommend at least 32 characters for a good quote</em></p>`
        }
        if (qdata.len > 2) {
            scoringText += `<p>There are ${qdata.len} characters in the quote and ${this.state.columns} columns.
                ${cribNotSplit}${cribDuplicates}${analyzeMultipleColumns}${paddingText}
                We suggest you try a score of ${suggested}${rangetext}.</p>`
        }

        return { suggested: suggested, min: min, max: max, text: scoringText }
    }

    /**
     * Check for any errors we can find in the question
     */
    public validateQuestion(): void {
        super.validateQuestion();
        let msg = '';
        let showsample = false;
        let sampleLink: JQuery<HTMLElement> = undefined;
        const questionText = this.getCleanQuestion();
        const crib = this.minimizeString(this.state.crib);

        if (questionText.indexOf(crib) < 0) {
            msg = 'The crib does not appear to be mentioned in the Question Text.';
            showsample = true;
        }

        if (showsample) {
            sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');
        }
        this.setErrorMsg(msg, 'vq', sampleLink);
    }
    public addQuestionOptions(qOptions: string[], langtext: string, hinttext: string, fixedName: string, operationtext: string, operationtext2: string, cipherAorAn: string): boolean {
        hinttext = this.genSampleHint();

        return super.addQuestionOptions(qOptions, langtext, hinttext, fixedName, operationtext, operationtext2, cipherAorAn);
    }

    public genSampleHint(): string {

        let hint = '';
        const crib = this.state.crib;
        const cribtext = this.genMonoText(crib);

        hint = ' The quote has ' + cribtext + ' somewhere in it.';

        return hint
    }

    public attachHandlers(): void {
        super.attachHandlers();

        $('#columns')
            .off('input')
            .on('input', (e) => {
                const newColumns = Number($(e.target).val());
                if (DEBUG) {
                    console.log("New number of columns: " + newColumns);
                }
                this.markUndo(null);
                if (this.setColumns(newColumns, false)) {
                    this.updateOutput();
                }
                this.advancedir = 0;
            });

        $('#columnorder')
            .off('input')
            .on('input', (e) => {
                const columnOrder = $(e.target).val() as string;
                this.markUndo(null);
                if (this.setColumnOrder(columnOrder)) {
                    this.updateOutput();
                }
                if (columnOrder.length != this.state.columns) {
                    // error
                    if (DEBUG) {
                        console.log('Column width is ' + this.state.columns + ' order is set for ' + columnOrder);
                    }
                }
            });
        $('#crib')
            .off('input')
            .on('input', (e) => {
                const crib = $(e.target).val() as string;
                if (DEBUG) {
                    console.log('The crib text is ' + crib);
                }
                this.markUndo(null);
                if (this.setCrib(crib)) {
                    this.updateOutput();
                }

            });
        $('#mrow')
            .off('click')
            .on('click', (e) => {
                this.state.operation = 'decode'

            });
        $('.randomizeColumns')
            .off('click')
            .on('click', (e) => {
                const columnOrder = this.generateRandomColumnOrder();
                this.markUndo(null);
                if (this.setColumnOrder(columnOrder)) {
                    this.updateOutput();
                }
                if (DEBUG) {
                    console.log(`Generated random column order: ${columnOrder}`);
                }
            });
    }

    private generateRandomColumnOrder(): string {
        let randomString = '';
        for (let i = 0; i < 20; i++) {
            randomString += Math.round((Math.random() * 99 / 10)).toString();
        }
        if (DEBUG) {
            console.log(randomString);
        }
        return randomString.substring(0, this.state.columns);
    }

    public setUIDefaults(): void {
        this.setColumns(this.state.columns, true);
        this.setCrib(this.state.crib);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        $('#columns').val(this.state.columns);
        $('#columnorder').val(this.state.keyword);
        $('#crib').val(this.state.crib);
        // const v = String(this.state.isRailRange);
        // $('#isRailRange').val(v);
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);

        this.genQuestionFields(result);
        this.genEncodeField(result);

        // Create a spinner for the number or columns
        const inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',
        });
        inputbox.append(
            JTFIncButton('Columns', 'columns', this.state.columns, 'small-12 medium-4 large-4')
        );

        const randomizeButton = $('<a/>', { type: "button", class: "button primary tight randomizeColumns", id: "randomColumnOrder" }).text("Randomize")

        // Create an input for the column order in the cryptanalysis case.
        inputbox.append(JTFLabeledInput('Column Ordering', 'text', 'columnorder', '', 'small-12 medium-4 large-4', randomizeButton));

        inputbox.append(JTFLabeledInput('Crib', 'text', 'crib', '', 'small-12 medium-4 large-4'));
        result.append(inputbox);

        return result;
    }
    /**
     * Fills in the frequency portion of the frequency table.  For the Rail Fence
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void { }

    public makeReplacement(text: string, maxEncodeWidth: number): string[][] {
        let encodeline = '';
        let lastsplit = -1;
        const result: string[][] = [];

        const textString = text.toUpperCase();

        if (DEBUG) {
            console.log('This is the TEXT string: ' + text);
        }
        // Chunk it
        text = this.chunk(text, 5);

        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (const t of text) {
            // Make sure that this is a valid character to map from
            encodeline += t;
            lastsplit = encodeline.length;
            // See if we have to split the line now
            if (encodeline.length >= maxEncodeWidth) {
                const encodepart = encodeline.substring(0, lastsplit);
                encodeline = encodeline.substring(lastsplit);
                result.push([encodepart]);
            }
        }
        // And put together any residual parts
        if (encodeline.length > 0) {
            result.push([encodeline]);
        }
        return result;
    }

    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        // Determine the solution array of characters based on genAnswer()'
        let solution = undefined;
        let cipherString = '';
        for (const c of this.state.cipherString) {
            if (this.isValidChar(c.toUpperCase())) {
                cipherString += c;
            }
        }
        solution = cipherString.toUpperCase().split('');

        return this.calculateScore(solution, answer, this.state.points);
    }

    /**
     * Generate the HTML to display the answer for a cipher.
     * It is just the ciper text formatted with TOANSWER.
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>' /*, { class: 'grid-x' }*/);

        const testUsage = this.getTestUsage();
        const usedOnCState = testUsage.includes(ITestType.cstate) || testUsage.includes(ITestType.None);

        let errorMessage = '';
        const spacelessCrib = this.minimizeString(this.state.crib);

        if (spacelessCrib.length < this.state.columns - 1 && !usedOnCState) {
            errorMessage = `For this test type, the length of the crib must be no shorter than ${(this.state.columns - 1)}
                (i.e. one less the number of columns used).`;
        } else if (spacelessCrib.length < this.state.columns - 3 && usedOnCState) {
            errorMessage = `For a Division C State/National or unspecified test, the length of the crib must be no shorter
            than ${(this.state.columns - 3)} (i.e. three less the number of columns used)`;
        } else if (spacelessCrib.length > this.state.columns) {
            errorMessage = `Warning: The crib length is greater than the number of columns.  The auto-solver will only use the first ${this.state.columns} letters of the crib`;
        }
        this.setErrorMsg(errorMessage, 'cribl', null);

        if (this.state.keyword === undefined || this.state.keyword === '') {
            errorMessage = `The column ordering string is not set.  Therefore, the column order
                will be the original, natural order. `
            const randomizeLink = $('<a/>', { class: 'randomizeColumns' }).text('Randomize the Column Ordering');
            this.setErrorMsg(errorMessage, 'colord', randomizeLink);
        }
        else if (this.state.keyword !== undefined && this.state.columns != this.state.keyword.length) {
            errorMessage = `Column count is ${this.state.columns}
                but column ordering string contains ${this.state.keyword.length}
                characters/digits.`;
            this.setErrorMsg(errorMessage, 'colord', null);
        } else {
            this.setErrorMsg('', 'colord', null);
        }

        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this, this.state.columns, this.state.keyword, this.state.cipherString, this.state.crib);

        if (ccs.getRowCount() > 15) {
            errorMessage = 'WARNING: Based on the cipher text length and number of columns, the number of rows needed for solving exceeds 15.';
            this.setErrorMsg(errorMessage, 'rowe', null);
        } else {
            this.setErrorMsg('', 'rowe', null);
        }

        const encodedText = $('<div/>', { class: 'TOSOLVE' });
        const strings: string[][] = this.makeReplacement(ccs.getCompleteColumnarEncoding(), 48);
        for (const strset of strings) {
            encodedText.append($('<p/>').text(strset[0]));
        }
        result.append(encodedText);

        result.append(ccs.getCompleteColumnarAnswer());

        const answer = $('<div/>', { class: 'grid-x' });

        let answerString = 'Answer: _';
        if (this.state.cipherString.length === 0) {
            answerString = 'Answer: ______________________________________________';
        }
        // Separate out the full answer pieces so we can generate the tiny answerkey

        answer.append($('<span/>', { class: 'TOSOLVE' }).text(answerString));
        answer.append($('<span/>', { class: 'TOANSWER' }).text(this.state.cipherString.toUpperCase()));
        answer.append($('<span/>', { class: 'TOSOLVE' }).text('_'));

        result.append(answer, $('<p/>', { class: 'TOSOLVE' }));

        return result;
    }
    /**
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this, this.state.columns, this.state.keyword, this.state.cipherString, this.state.crib);
        const strings: string[][] = this.makeReplacement(
            ccs.getCompleteColumnarEncoding(),
            this.state.cipherString.length
        );
        const qnumdisp = String(qnum + 1);
        const idclass = 'I' + qnumdisp + '_';
        const spcclass = 'S' + qnumdisp + '_';
        const result = $('<div/>', { id: 'Q' + qnumdisp });

        let answerLength = -1;

        // The question text.
        for (const strset of strings) {
            answerLength = strset[0].length;
            result.append($('<div/>', { class: 'TOSOLVE' }).append($('<p/>').text(strset[0])));
        }

        let pos = 0;
        // The rails (we will use the replacement field)
        const railsTable = new JTTable({ class: 'SOLVER' });
        for (let i = 0; i < 6; i++) {
            const railRow = railsTable.addBodyRow();
            for (let j = 0; j < answerLength; j++) {
                const extraclass = '';
                // const spos = String(pos);
                railRow.add({
                    settings: { class: extraclass },
                    content: $('<input/>', {
                        id: 'R' + String(qnum + 1) + '_' + pos,
                        class: 'awr',
                        type: 'text',
                    }).attr('isRails', '1'),
                });
                pos++;
            }
        }
        result.append(railsTable.generate());

        // The answer fields
        result.append($('<p/>').text('Answer:'));
        const answerTable = new JTTable({ class: 'SOLVER' });
        const qrow = answerTable.addBodyRow();
        const arow = answerTable.addBodyRow();
        for (let i = 0; i < answerLength; i++) {
            let extraclass = '';
            const spos = String(i);

            extraclass = 'S' + spos;
            const field = $('<div/>')
                .append($('<div/>', { class: 'ir', id: spcclass + spos }).html('&#711;'))
                .append(' ');
            qrow.add({ settings: { class: 'TOSOLVEC ' + extraclass }, content: field });

            arow.add({
                settings: { class: extraclass },
                content: $('<input/>', {
                    id: idclass + spos,
                    class: 'awc',
                    type: 'text',
                }),
            });
        }
        result.append(answerTable.generate());

        result.append($('<textarea/>', { id: 'in' + String(qnum + 1), class: 'intnote' }));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'TOSOLVE' });

        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this, this.state.columns, this.state.keyword, this.state.cipherString, this.state.crib);

        const strings: string[][] = this.makeReplacement(ccs.getCompleteColumnarEncoding(), 48);
        for (const strset of strings) {
            result.append($('<p/>').text(strset[0]));
        }

        // TODO: I want the 'work space' section to print in the 'Test Packet', not in
        // 'Answer Key' or 'Answers and Solutions'.
        const workSpace = $('<div/>', { class: 'instructions' });
        for (let i = 0; i < 6; i++) {
            workSpace.append($('<p/>').text('\n'));
        }
        result.append(workSpace);

        const answerLine = $('<div/>', { class: 'TOSOLVE' });
        answerLine.append('Answer: _______________________________________________');
        answerLine.append('<p/>');
        result.append(answerLine);

        return result;
    }
    /**
     * Generate the HTML which is the answer to the question.
     */
    public build(): JQuery<HTMLElement> {
        const result = $('<div/>');

        result.append(this.genAnswer(ITestType.None));

        return result;
    }

    /**
     * Generate the HTML that shows the 'W' rail fence solution.
     */
    public async genCompleteColumnarSolution(testType: ITestType, target: JQuery<HTMLElement>) {
        // If we are already in the process of loading then we need to request that
        // the loading process stop instead of starting it again.
        // Note that when the stop is processed it will trigger starting the load
        // once again to update the UI
        if (this.isLoading) {
            this.stopGenerating = true;
            return;
        }
        this.stopGenerating = false;
        this.isLoading = true;

        const result = $('<div/>');
        target.append(result);
        this.setErrorMsg('', 'cribspan', null);

        if (this.state.cipherString.length === 0) {
            this.isLoading = false;
            return;
        }

        const minimizedCipherString = this.minimizeString(this.state.cipherString);
        if (minimizedCipherString.indexOf(this.minimizeString(this.state.crib)) === -1) {
            this.setErrorMsg(`The crib '${this.state.crib}' was not found in the plain text.`, 'nocrib', null);
            this.isLoading = false;
            return;
        } else {
            this.setErrorMsg('', 'nocrib', null);
        }

        result.append(CipherCompleteColumnarEncoder.paragraph('Note:  The Ordering string can be any ASCII string.  ' +
            'However, it is sorted (using ASCII values) and normalized to the natural numbers and those are used ' +
            'when displaying the solution.'))

        result.append($('<h3/>').text('How to solve...'));

        const columns = this.state.columns;

        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this, columns, this.state.keyword, this.state.cipherString, this.state.crib);

        const cipherTextLength = ccs.getTextLength();
        const possibleColumns = [];

        let maxColumns = this.thisTestType === ITestType.cstate ? MAX_COLUMNS_C : MAX_COLUMNS_B;
        for (let i = MIN_COLUMNS; i <= maxColumns; i++) {
            if (cipherTextLength % i === 0) {
                possibleColumns.push(i);
            }
        }

        let columnsString = $('<span>');
        for (let i = 0; i < possibleColumns.length; i++) {
            columnsString.append($('<span>').addClass('allfocus').text(possibleColumns[i])).append((i < possibleColumns.length - 1 ? ', ' : '.'));
        }
        let div = $('<div>');
        div.append($('<p/>').text('The cipher text length is ').append($('<span>').addClass('allfocus')
            .text(cipherTextLength)).append(' so the possible columns used to encode the ciphertext could be: ').append(columnsString));
        result.append(div);

        result.append(CipherCompleteColumnarEncoder.paragraph(`Therefore, to form a Complete Columnar table, we'll 
            analyze each of the ${possibleColumns.length} possible column configurations:`));
        const cipherText = ccs.getCompleteColumnarEncoding();

        for (const columnCount of possibleColumns) {

            result.append(CipherCompleteColumnarEncoder.heading(columnCount + ' Columns'));

            let maxCribDifference = (this.thisTestType === ITestType.cstate || this.thisTestType === ITestType.None) ? 3 : 1;

            if (columnCount > this.state.crib.length + maxCribDifference) {

                result.append(CipherCompleteColumnarEncoder.paragraph(`The crib length (${this.state.crib.length}) 
                    must be no shorter than ${maxCribDifference} less than the number of columns, so ${columnCount} 
                    columns will not be computed.`));
                continue;
            }


            result.append(CipherCompleteColumnarEncoder.paragraph(`'This is the Complete Columnar table with ${columnCount} columns.`));

            const ta = CipherCompleteColumnarEncoder.makeCompleColumnarJTTable(columnCount, cipherText, cipherTextLength, undefined);
            const rowCount = cipherTextLength / columnCount;

            const table = new JTTable({ class: 'prfreq shrink cell' });

            const header = table.addHeaderRow();
            //header.add(columnCount + ' columns', {colspan: columnCount});
            header.add({
                settings: { colspan: columnCount, textalign: 'center' },
                content: columnCount + ' columns',
            });

            const rowLetters = [];
            const rowXCount = []
            let row = undefined;

            for (let i = 0; i < rowCount; i++) {
                // The letters in this row.
                rowLetters[i] = '';
                // Holds the number of pad characters per row (could be a real letter, though)
                rowXCount[i] = 0;
                row = table.addBodyRow();
                for (let j = 0; j < cipherTextLength; j += rowCount) {
                    const letter = cipherText.substring(j + i, j + i + 1);
                    row.add(letter);
                    rowLetters[i] += letter;
                    if (letter === 'X') {
                        rowXCount[i]++;
                    }
                }
            }
            row = table.addFooterRow();
            for (let i = 0; i < columnCount; i++) {
                row.add($('<p/>').text('C').append($('<sub/>').text((i + 10).toString(36))));
            }
            result.append(ta.generate());

            div = $('<div>');
            div.text(this.summarizeXAnalysis(columnCount, rowXCount));
            result.append(div);

            if (await this.restartCheck()) { return }

            div = $('<div>');
            div.text('Now look for the crib: ').append($('<span>').addClass('allfocus').text(this.state.crib));
            result.append(div);

            if (DEBUG) {
                console.log('Now processing =====>  Columns: ' + columnCount);
            }

            const cleanCrib = this.minimizeString(this.state.crib);
            let safeCrib = cleanCrib;

            if (cleanCrib.length + 1 > columnCount) {
                safeCrib = cleanCrib.substring(0, columnCount);
                ccs.setCrib(safeCrib);
            }
            let cribLocation = this.checkConsecutiveRowsForCrib(ccs, safeCrib, rowLetters);
            if (cribLocation.length > 0) {
                const rowDetails = {};
                result.append(CipherCompleteColumnarEncoder.paragraph('We can find the crib in ' + cribLocation.length + ' positions of the ' + columnCount + ' column encoding:'));
                for (const o of cribLocation) {
                    const cribInfo = o['rows'];
                    let offset = 0;
                    // Create some space...
                    result.append($('<p>'));
                    for (let i = 0; i < cribInfo.length; i++) {
                        div = $('<div>');
                        rowDetails['row1'] = cribInfo[i][o]

                        let cribCountInfo = `has ${cribInfo[i][1]} of the ${this.minimizeString(this.state.crib).length}`;
                        if (cribInfo[i][1] === 0) {
                            continue;
                        } else if (cribInfo[i][1] === cleanCrib.length) {
                            cribCountInfo = `has all ${cribInfo[i][1]}`;
                        }

                        // !!!!!!!!!!!!!
                        div.append(`Row ${cribInfo[i][0] + 1} ${cribCountInfo} crib letters in it (`);
                        div.append(cleanCrib.substring(0, offset));
                        div.append($('<span>').addClass('morefocus').text(cleanCrib.substring(offset, offset + cribInfo[i][1])));
                        div.append(cleanCrib.substring(offset + cribInfo[i][1])).append(`).`);
                        offset += cribInfo[i][1];
                        result.append(div);
                    }
                    result.append($('<p>'));
                }
            } else {
                result.append(CipherCompleteColumnarEncoder.paragraph('Crib not found, rule out an encoding of ' + columnCount + ' columns.'))
            }
        }
        result.append(CipherCompleteColumnarEncoder.heading('Analyze possibilities...'));

        result.append(ccs.getCompleteColumnarSolution());
        this.currentSolverSolution = ccs;

        // See if they requested an abort to restart the operation before we finish
        if (await this.restartCheck()) { return }

        // All done, so mark that we are not in the process of updating
        this.isLoading = false
    }
    private rowsWithCribCharacters(crib: string, rowLetters: string[]): boolean {

        // This map will have a key of row number, then it will have an object containing the number of
        // crib characters in the row, along with the index of those crib characters.  i.e.
        //    [n, [x,y,z,...]]
        const cribMap = {}

        const cribLetters = crib.split('');

        for (let i = 0; i < rowLetters.length; i++) {
            let cribCharacters = 0;
            let indexList = [];
            for (const letter of cribLetters) {
                let index = rowLetters[i].indexOf(letter);
                if (index > -1) {
                    while (indexList.includes(index) && index !== -1) {
                        // search again
                        index = rowLetters[i].indexOf(letter, index + 1);
                        if (index > -1) {
                            cribCharacters++;
                            indexList.push(index);
                        }
                    };
                    if (index > -1) {
                        cribCharacters++;
                        indexList.push(index);
                    }
                }
                else {
                    indexList.push(index);
                }
            }
            cribMap[i] = [cribCharacters, indexList];
            if (i > 0) {
                const part1 = cribMap[i - 1][1]
                cribMap[i - 1][1].push.apply(part1, indexList);
            }
        }
        if (DEBUG) {
            console.log('Found in row: ');
        }

        return false;
    }

    private checkConsecutiveRowsForCrib(completeColumnarSolver: CompleteColumnarSolver, crib: string, rowLetters: string[]): any[] {

        let columnsFitEncoding = [];

        const cribLetters = crib.split('');

        // Create a object that contains the counts of letters that make up the crib.  It will allow us to
        // determine if the crib letters exist over 2 rows.
        const cribSignature = {};
        for (const letter of cribLetters) {
            if (cribSignature[letter] === undefined) {
                cribSignature[letter] = 1;
            } else {
                cribSignature[letter] = cribSignature[letter] + 1;
            }
        }

        for (let rowNumber = 0; rowNumber < rowLetters.length; rowNumber++) {
            let sigMatch = 0;
            let cribCharacters = 0;
            const firstRowFoundIndexes = []
            const secondRowFoundIndexes = [];
            let combinedRows = ''
            if (rowNumber < rowLetters.length - 1) {
                // Combine the i row and the i+1 row...
                combinedRows = rowLetters[rowNumber] + rowLetters[rowNumber + 1];

                // ...then create a 'rows' signature.
                let rowSignature = {};
                const combinedRowsLetters = combinedRows.split('');
                for (const letter of combinedRowsLetters) {
                    if (rowSignature[letter] === undefined) {
                        rowSignature[letter] = 1;
                    } else {
                        rowSignature[letter] += 1;
                    }
                }

                // Compare the crib signature to the combined rows signature to see if the crib is in these rows.
                for (const key in cribSignature) {
                    if (DEBUG) {
                        console.log('Checking key: ' + key);
                    }
                    if (rowSignature[key] !== undefined) {
                        cribCharacters++;
                        if (rowSignature[key] === cribSignature[key]) {
                            // This is a absolutely known crib letter position.
                            if (DEBUG) {
                                console.log('Matched: ' + rowSignature[key] + ' and ' + cribSignature[key]);
                                console.log('Got a single match!');
                            }
                            sigMatch++;
                        }
                        else if (rowSignature[key] >= cribSignature[key]) {
                            // potentially a couple places for the crib letter.
                            if (DEBUG) {
                                console.log(`Letter ${key} is found in ${rowSignature[key]} places.`);
                            }
                            sigMatch++;
                        }

                    }
                }
                // Check if a match was found for all letters in the crib...
                if (sigMatch === Object.keys(cribSignature).length) {
                    // Yes this might be one, return true.
                    if (DEBUG) {
                        console.log('!!!!!!!!!!!!!!!!!!!!!!!!! Maybe a match...');
                    }
                    // Find where the crib letters are split between the rows if at all...
                    let firstRowCount = 0;
                    let secondRowCount = 0;

                    // Search first row in order of crib letters until a crib letter is not found and avoid duplicates
                    for (let letterIndex = 0; letterIndex < cribLetters.length; letterIndex++) {
                        let foundCribLetterIndex = rowLetters[rowNumber].indexOf(cribLetters[letterIndex]);;
                        while (firstRowFoundIndexes.includes(foundCribLetterIndex) && foundCribLetterIndex !== -1) {
                            foundCribLetterIndex = rowLetters[rowNumber].indexOf(cribLetters[letterIndex], foundCribLetterIndex + 1);
                        }

                        if (foundCribLetterIndex !== -1/* && firstRowFoundIndexes.indexOf(foundCribLetterIndex) === -1*/) {
                            firstRowFoundIndexes.push(foundCribLetterIndex);
                            firstRowCount++;
                        } else {
                            break;
                        }
                    }
                    // If no part of the crib was found in the first row, go to the next row (it will become the first row)
                    if (firstRowCount === 0) {
                        continue;
                    }
                    // Now search the second row for the remaining crib letters.  This ensures a crib that is split
                    // does not have a letter 'behind' it.  This does not prevent a bad crib choice, but we should
                    // be able to point it out later.
                    // check crib again, starting from the back.
                    for (let letterIndex = cribLetters.length - 1; letterIndex >= 0; letterIndex--) {
                        let foundCribLetterIndex = rowLetters[rowNumber + 1].indexOf(cribLetters[letterIndex]);
                        if (foundCribLetterIndex !== -1) {
                            secondRowFoundIndexes.push(foundCribLetterIndex);
                            secondRowCount++;
                        } else {
                            break;
                        }
                    }

                    const overlap = (firstRowCount + secondRowCount) - cribLetters.length;

                    for (let x = 0; x <= overlap; x++) {
                        if (cribLetters.length === firstRowCount + secondRowCount - overlap) {
                            let skipRowCount = 0;
                            let rowCribPlacement = [];
                            if (firstRowCount > 0) {
                                rowCribPlacement.push([rowNumber, firstRowCount - (overlap - x)]);
                            } else {
                                skipRowCount = 0;
                            }
                            if (secondRowCount > 0) {
                                rowCribPlacement.push([rowNumber + 1, secondRowCount - x]);
                            } else {
                                skipRowCount = 0;
                            }
                            const o = {};
                            o['rows'] = rowCribPlacement;

                            columnsFitEncoding.push(o);
                            const cribSplitInformation = new CribSplitInformation(cribLetters.length, rowLetters);
                            completeColumnarSolver.addColumnsToAnalyze(rowLetters[rowNumber].length, cribSplitInformation);

                            cribSplitInformation.setSplitInformation(rowNumber, firstRowCount - (overlap - x), secondRowCount - x);

                            if (DEBUG) {
                                console.log('This is it!!!');
                            }
                            //columnsFitEncoding = true;
                            rowNumber += skipRowCount;
                        }
                    }
                }
            }
            if (firstRowFoundIndexes.length > 0 || secondRowFoundIndexes.length > 0) {
                if (DEBUG) {
                    console.log(`In the two rows starting at ${rowNumber}, the number of crib characters found is:
                        ${cribCharacters}.  >${combinedRows}- first row: ${firstRowFoundIndexes.join(',')};
                        second row: ${secondRowFoundIndexes.join(',')}`);
                }
            }
        }
        return columnsFitEncoding;
    }

    private summarizeXAnalysis(columnCount: number, rowXCount: number[]): string {
        let returnValue: string = '';
        let i: number;
        let xCount = 0;
        for (i = 0; i < rowXCount.length - 1; i++) {
            if (rowXCount[i] !== 0) {
                xCount += rowXCount[i];
                //returnValue += 'Row ' + i + ' has ' + rowXCount[i] + (rowXCount[i] === 1 ? ' occurrence ' : ' occurrences ') + 'of \'X\'.';
            }
        }

        const totalXs = xCount + rowXCount[i];
        let statusMsg = `${totalXs > 0 ? `There ${totalXs === 1 ? ` is ${totalXs} X ` : ` are ${totalXs} Xs`} in the table.` : ``}`;


        returnValue += `${statusMsg}  The last row has ${rowXCount[i]} ${rowXCount[i] === 1 ? ' occurrence ' : ' occurrences '} of 'X'
             ${rowXCount[i] > 1 ? `, so this is a clue that the cipher could use ${columnCount} columns because 'X' is used as the pad character.` : `.`}`;
        return returnValue;
    }

    private static getPluralityString(n: number, strings: string[]): string {
        return n === 1 ? strings[0] : strings[1];
    }

    static paragraph(msg: string): JQuery<HTMLElement> {
        return $('<p/>').text(msg);
    }

    static heading(msg: string): JQuery<HTMLElement> {
        return $('<h4/>').text(msg);
    }

    static formatToAnswer(msg: string): JQuery<HTMLElement> {
        return $('<span>').addClass('TOANSWER').text(msg);
    }

    static makeCompleColumnarJTTable(columnCount: number, cipherText: string, cipherTextLength: number, columnOrder: number[]): JTTable {

        if (columnOrder === undefined) {
            columnOrder = [];
        }
        if (columnOrder.length === 0) {
            for (let i = 1; i <= columnCount; i++) {
                columnOrder.push(i);
            }
        }

        // Translate column offsets
        const columnOffsetTranslation = [];
        for (let i = 0; i < columnCount; i++) {
            columnOffsetTranslation.push(columnOrder[i] - 1);
        }

        const table = new JTTable({ class: 'prfreq shrink cell' });
        const header = table.addHeaderRow();
        header.add({
            settings: { colspan: columnCount, textalign: 'center' },
            content: columnCount + ' columns',
        });
        const rowCount = cipherTextLength / columnCount;

        const rowLetters = [];
        const rowXCount = []
        let row = undefined;

        // this for loop builds each row
        for (let i = 0; i < rowCount; i++) {
            // The letters in this row.
            rowLetters[i] = '';
            // Holds the number of pad characters per row (could be a real letter, though)
            rowXCount[i] = 0;
            row = table.addBodyRow();
            // This for loop picks the letters for that row.  It should execute 'columnCount' times.
            for (let j = 0; j < columnCount; j++) {
                const letter = cipherText.substring((columnOffsetTranslation[j] * rowCount) + i, (columnOffsetTranslation[j] * rowCount) + i + 1);
                row.add(letter);
                rowLetters[i] += letter;
                if (letter === 'X') {
                    rowXCount[i]++;
                }
            }
        }
        row = table.addFooterRow();
        for (let i = 0; i < columnCount; i++) {
            row.add($('<p/>').text('C').append($('<sub/>').text((columnOffsetTranslation[i] + 10).toString(36))));
        }

        return table;
    }
}
