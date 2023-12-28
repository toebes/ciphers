import { cloneObject, repeatStr } from '../common/ciphercommon';
import {
    IScoreInformation,
    IState,
    ITestQuestionFields,
    ITestType,
    toolMode,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { CipherEncoder } from './cipherencoder';
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

    constructor(cribLength: number, rowData) {
        this.cribLength = cribLength;
        this.rowsData = rowData;
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
        console.log('Pad length is: ' + this.padLength);
        const plainText = text + repeatStr('X', this.padLength);
        this.textLength = plainText.length;
        console.log('So we encode: ' + plainText);

        for (let i = 0; i < this.columnCount; i++) {
            const index = this.columnOrder[i];
            for (let j = index; j < plainText.length; j += this.columnCount) {
                this.cipherText += plainText[j];
            }

        }
        this.rowCount = plainText.length / this.columnCount;
        console.log('---->>>Encoded as: ' + this.cipherText);
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
        let tableClass = 'railfence-lg';
        if (this.textLength > 90) {
            tableClass = 'railfence-sm';
        } else if (this.textLength > 45) {
            tableClass = 'railfence-md';
        }
        let foundAnswer = false;

        const returnValue = $('<div/>');
        // Not sure this is useful information.
        //        returnValue.append(CipherCompleteColumnarEncoder.paragraph('We can find the crib in ' + this.columnsToAnalyze.length + ' position(s) of the ' + this.columnsToAnalyze[columnToAnalyze] + ' column encoding.'));

        for (let columnToAnalyze = 0; columnToAnalyze < this.columnsToAnalyze.length; columnToAnalyze++) {

            console.log('Split Info: ' + this.cribSplitInformation[columnToAnalyze]);

            const s = this.cribSplitInformation[columnToAnalyze];
            let details = $('<div>');

            details.append($('<h5>').append(`${this.columnsToAnalyze[columnToAnalyze]} column possibilities`));

            if (s.isSplitOverRows()) {
                details.append($('<div>').append('Since the crib is found split, we know that ' + ' ends a row and ' + ' starts the subsequent row.'));
            } else {
                details.append(CipherCompleteColumnarEncoder.paragraph('Since the crib is not split, we know that it is contained all on one row.'))
            }


            details.append(`Row ${s.getFirstRow()} has ${s.getLettersInFirstRow()} of the ${s.getCribLength()} crib letters in it (`);
            details.append($('<span>').addClass('allfocus').text(this.crib.substring(0, s.getLettersInFirstRow())))
                .append(`).`);
            if (s.isSplitOverRows()) {
                details.append(`  So for row ${s.getFirstRow()}, the column order has to `)
                    .append($('<span>').addClass('fq').text('end')).append(' with these letters.');
            }

            returnValue.append(details);

            if (s.getLettersInSecondRow() > 0) {
                details = $('<div>');
                details.append(`Row ${s.getFirstRow() + 1} has ${s.getLettersInSecondRow()} of the ${s.getCribLength()} crib letters in it (`);
                details.append($('<span>').addClass('allfocus').text(this.crib.substring(s.getLettersInFirstRow())))
                    .append(`).`);
                if (s.isSplitOverRows()) {
                    details.append(`  So for row ${s.getFirstRow() + 1}, the column order has to `)
                        .append($('<span>').addClass('fq').text('start')).append(' with these letters.');
                }
            }
            // So we can arrange the letter in the following order and take a look...
            const solutionCombos = this.getPossibleColumnOrderings(this.columnsToAnalyze[columnToAnalyze], s);
            if (solutionCombos === undefined || solutionCombos.length > 10) {
                // bad crib
                const errorMessage = `WARNING: The crib is not adequate to compute a solution for ${this.columnsToAnalyze[columnToAnalyze]} columns.`;
                this.cipherCompleteColumnarEncoder.setErrorMsg(errorMessage, 'badcols', null);
                continue;
            } else {
                this.cipherCompleteColumnarEncoder.setErrorMsg('', 'badcols', null);
            }

            console.log(`Trying solutions combinations: ${solutionCombos.length}`);

            returnValue.append(details).append($('<p>'));

            if (solutionCombos.length === 0) {
                returnValue.append(`There are no valid column orderings for this crib placement.`).append($('<p>'));
            } else {
                returnValue.append(CipherCompleteColumnarEncoder.paragraph('With this information, we can derive different combinations for column ordering.'));

                let combosToTry = '';
                let trials = $('<div>');
                let paragraph = $('<p>');
                let firstPass = true;
                for (let x = 0; x < solutionCombos.length; x++) {
                    if (firstPass) {
                        paragraph.append('Check these column orders: ');
                        firstPass = false;
                    } else {
                        paragraph.append('; ');
                    }
                    const potentialColumnOrder = solutionCombos[x].join(',');
                    paragraph.append($('<span>').addClass('allfocus').text(potentialColumnOrder));
                }
                returnValue.append(trials.append(paragraph));
            }

            const actualColumnOrder = this.getColumnEncodingOrder();
            let potentialSolutionTable = undefined;
            let trial = undefined;
            for (let x = 0; x < solutionCombos.length; x++) {
                const potentialColumnOrder = solutionCombos[x].join(',');
                trial = $('<div>');
                trial.append(CipherCompleteColumnarEncoder.paragraph('Trying column order: ').append($('<span>').addClass('allfocus').text(potentialColumnOrder)));
                returnValue.append(trial);
                potentialSolutionTable = CipherCompleteColumnarEncoder.makeCompleColumnarJTTable(this.columnsToAnalyze[columnToAnalyze], this.cipherText, this.getTextLength(), solutionCombos[x]);
                returnValue.append(potentialSolutionTable.generate());

                if (actualColumnOrder === potentialColumnOrder) {
                    returnValue.append($('<p>').append($('<span>').addClass('allfocus').text('This looks like the answer!  All done.')));
                    foundAnswer = true;
                    break;
                } else {
                    returnValue.append(CipherCompleteColumnarEncoder.paragraph('Text does not appear to make sense, keep trying other combinations...'));
                }
            }
            if (foundAnswer) {
                break;
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

        // [[3], [1,2,4,5,6],[1,2,4,5,6],[1,2,4,5,6],[1,2,4,5,6],[1,2,4,5,6]]
        if (splitInfo.isSplitOverRows()) {
            // start with second row...find all occurrences of crib letters in second row
            const secondRowLetters = splitInfo.getRowLetters(splitInfo.getFirstRow() + 1);
            console.log('ROW 2 letters: ' + secondRowLetters);

            // Get the part of the crib in the second row.  This fills the array from the FRONT
            let cribInSecondRow = this.crib.substring(splitInfo.getLettersInFirstRow());

            let cribLetters = cribInSecondRow.split('');
            let index = 0, rowOrder = [];

            // step 2 (R from 2nd row)
            // cribLetters contains letters from the second row, so go in the first position.
            let orderIndex = 1;
            for (let l of cribLetters) {
                console.log('Check for ' + l);
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
                        console.log('ROW 2 Found a duplicate for ' + l + ' at ' + (index + 1));
                    } else {
                        console.log('ROW 2 Found occurrence of ' + l + ' at ' + (index + 1));
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

            console.log('ROW 1 letters: ' + firstRowLetters);

            let cribInFirstRow = this.crib.substring(0, splitInfo.getLettersInFirstRow());
            cribLetters = cribInFirstRow.split('');


            // TODO if crib is > # columns then :
            //  1. the column is known we are done
            //  2. or it at least eliminates an option if there are more than one possibility.
            let outputColumn = firstRowLetters.length;
            for (let i = cribLetters.length - 1; i >= 0; i--) {
                let toFind = cribLetters[i];
                console.log('i = ' + i + ' Check for the letter ' + toFind);
                const foundAt = [];

                for (let testColumn of ordering[outputColumn]) {
                    if (firstRowLetters[testColumn - 1] === toFind) {
                        foundAt.push(testColumn);
                        if (foundAt.length > 1) {
                            console.log(`ROW 1 Found a duplicate for ${toFind} at ${(index + 1)}`);
                        } else {
                            console.log('ROW 1 Found occurrence of ' + toFind + ' at ' + (index + 1));
                        }
                    }
                }

                this.removePositionFromOrdering(ordering, outputColumn, foundAt);
                outputColumn--;
            }
            orderingCombinations.push(ordering);
        }
        else {
            let cribLetters = this.crib;
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
                        if (foundCount > 0) {
                            console.log(`Found a duplicate for ${cribLetters[j - 1]} at index ${(index + 1)}`);

                        } else {
                            console.log(`Found occurance of ${cribLetters[j - 1]} at index ${(index + 1)}`);
                        }
                        startIndex = index + 1;
                        foundCount++;
                    }
                    this.removePositionFromOrdering(orderingClone, j + i, foundAt);
                }
                orderingCombinations.push(orderingClone);
            }
        }


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

            // Now I think the bug is in the combinator because it needs to be a bit more smart.  user everf and 6 columns.
            // you get [3],[5],[1,4,6],[1,4,6],[2],[4,6] and that is totally valid but the combinator does not handle it...it
            // would give these combinations: [3,5,1,4,2,6],[3,5,1,6,2,4],[3,5,4,1,2,6],[3,5,6,1,2,4]

            // build a list of multiple
            const multiplePossibilities = this.findChoosableColumns(o);

            const combinations = this.countCombinations(o);
            // The 20 is an arbitrary number...
            if (combinations > 100) {
                console.log(`Too many combinations (${combinations}) to consider`);
                return undefined;
            }

            let c = this.determineUniqueCombinations(o, multiplePossibilities);
            if (c.length > 20) {
                return undefined;
            } else {
                combos = combos.concat(c);
            }
        }

        return combos;
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
        return result.sort();
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

    private determineUniqueCombinations(combinations: IColumnOrder, possiblities: number[]): number[][] {

        let combos: number[][] = [];
        let didSplit = false;
        let theClone = this.cloneColumnOrder(combinations)
        for (let i = 1; i < theClone.length; i++) {
            if (theClone[i].length > 1) {
                didSplit = true; // TODO if possibilites[0] is in theClone[i], then {this.removePositionFromOrdering(); this.determineUniqueCombinations(theNewClone, possibilities[1:])
                if (theClone[i].indexOf(possiblities[0]) > -1) {
                    let theNewClone = this.cloneColumnOrder(theClone);
                    this.removePositionFromOrdering(theNewClone, i, [possiblities[0]]);
                    let newCombos = this.determineUniqueCombinations(theNewClone, possiblities.slice(1));
                    for (let combo of newCombos) {
                        if (combos.length > 20) {
                            return combos;
                        }
                        combos.push(combo);
                    }

                }
            }
        }
        if (!didSplit) {
            let combo: number[] = [];
            let legal = true;
            for (let i = 1; i < theClone.length; i++) {
                if (theClone[i].length === 1) {
                    combo.push(theClone[i][0]);
                } else {
                    legal = false;
                    break;
                }
            }
            if (legal) {
                console.log('RETURN: ' + theClone.toString());
                combos.push(combo);
            }
        }
        return combos;
    }

    private printOrderingPossibilities(ordering: [][]): void {
        let msg = '\n['
        for (let i = 0; i < ordering.length; i++) {
            msg += '['
            for (let j = 0; j < ordering[i].length; j++) {
                msg += (ordering[i][j] === undefined ? '' : (ordering[i][j] + ((ordering[i].length - 1) > j ? ',' : '')));
            }
            msg += ((ordering.length - 1) > i ? '],\n' : ']\n');
        }
        msg += ']\n';
        console.log(msg);
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
    public isLoading = false;
    public stopGenerating = false;

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
        if (!anyOperation && result === '' && testType !== undefined) {
            // What is allowed is:
            //  Division B Regional:  Up to 9 columns, crib no shorter than columns - 1.
            //  Division B State:  Up to 9 columns, crib no shorter than columns - 1.
            //  Division C Regional:  Up to 9 columns, crib no shorter than columns - 1.
            //  Division C State:  Up to 11 columns, crib no shorter than columns - 3.

            if ((testType === ITestType.bregional || testType === ITestType.bstate || testType === ITestType.cregional) &&
                this.state.columns > 9) {
                result = 'Only nine or fewer columns are allowed on ' + this.getTestTypeName(testType);
            }
            else if (testType === ITestType.cstate && this.state.columns > 11) {
                result = 'Only eleven or fewer columns are allowed on ' + this.getTestTypeName(testType);
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
    public setColumns(columns: number): boolean {
        let changed = false;

        let maxColumns = this.thisTestType === ITestType.cstate ? 11 : 9;

        if (columns < 3) {
            columns = 3
            changed = true;
        }
        else if (columns > maxColumns) {
            columns = 11;
            changed = true;
        }

        if (columns !== this.state.columns) {
            // TODO: the min and max should probably be made to CONSTANTS.

            if (columns >= 3 && columns <= maxColumns) {
                this.state.columns = columns;
                this.setErrorMsg('', 'colcount', null);
                $('#err').text('');
                changed = true;
            } else {
                this.setErrorMsg(`For a ${this.getTestTypeName(this.thisTestType)}, the number of columns must be between 3 and ${maxColumns}`, 'colcount', null);
            }
        }

        return changed;
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
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

    setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }
    /**
     * Check for any errors we can find in the question
     */
    public validateQuestion(): void {
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

    public genSampleHint(): string {

        let hint = '';
        const crib = this.minimizeString(this.state.crib);
        const cribtext = this.genMonoText(crib);

        hint = 'the quote has ' + cribtext + ' somewhere in it.';

        return hint
    }

    private generateCipherText(columnOrder: string): string {
        const c = this.state.cipherString

        const charsOver = (c.length % this.state.columns);
        const padLength = (charsOver > 0) ? this.state.columns - charsOver : charsOver;
        console.log('Pad length is: ' + padLength);
        const plainText = c + repeatStr('X', 1);
        console.log('So we encode: ' + plainText);

        let encoding = '';
        const columnOrderArray = columnOrder.split('');
        for (let i = 0; i < this.state.columns; i++) {
            const index = Number(columnOrder.charAt(i));
            for (let j = index; j < plainText.length; j += this.state.columns) {
                encoding += plainText[j];
            }

        }
        console.log('Encoded as: ' + encoding);

        return encoding;

    }

    public attachHandlers(): void {
        super.attachHandlers();

        $('#columns')
            .off('input')
            .on('input', (e) => {
                const newColumns = Number($(e.target).val());
                console.log("New number of columns: " + newColumns);
                this.markUndo(null);
                if (this.setColumns(newColumns)) {
                    this.updateOutput();
                }
                this.advancedir = 0;
            });

        $('#columnorder')
            .off('input')
            .on('input', (e) => {
                const columnOrder = $(e.target).val() as string;
                if (this.setColumnOrder(columnOrder)) {
                    this.generateCipherText(columnOrder);
                    this.updateOutput();
                }
                if (columnOrder.length != this.state.columns) {
                    // error
                    console.log('Column width is ' + this.state.columns + ' order is set for ' + columnOrder);
                }
            });
        $('#crib')
            .off('input')
            .on('input', (e) => {
                const crib = $(e.target).val() as string;
                console.log('The crib text is ' + crib);
                if (this.setCrib(crib)) {
                    this.updateOutput();
                }

            });
        $('#mrow')
            .off('click')
            .on('click', (e) => {
                this.state.operation = 'decode'

            });
    }

    public setUIDefaults(): void {
        this.setColumns(this.state.columns);
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
        // Create an input for the column order in the cryptanalysis case.
        inputbox.append(JTFLabeledInput('Ordering', 'text', 'columnorder', '', 'small-12 medium-4 large-4'));

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

        console.log('This is the TEXT string: ' + text);
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

        let errorMessage = '';
        if (this.state.crib.length < this.state.columns - 1) {
            errorMessage = 'The length of the crib must be no shorter than ' + (this.state.columns - 1) + ' (i.e. one less the number of columns used).';
            this.setErrorMsg(errorMessage, 'cribl', null);
        } else {
            this.setErrorMsg('', 'cribl', null);
        }

        if (this.state.keyword !== undefined && this.state.columns != this.state.keyword.length) {
            errorMessage = 'Column count is ' + this.state.columns +
                ', but column ordering string contains ' + this.state.keyword.length +
                ' characters/digits.';
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

        let r: number;
        const result = $('<div/>');
        target.append(result);

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

        result.append(CipherCompleteColumnarEncoder.paragraph('Note:  The Ordering string can be any ASCII string.  However, it is sorted (using ASCII values) and normalized to the natural numbers and those are used when displaying the solution.'))

        result.append($('<h3/>').text('How to solve...'));

        const columns = this.state.columns;

        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this, columns, this.state.keyword, this.state.cipherString, this.state.crib);

        const cipherTextLength = ccs.getTextLength();
        const possibleColumns = [];
        const columnsToAnalyze = {};
        for (let i = 3; i < 12; i++) {
            if (cipherTextLength % i === 0) {
                possibleColumns.push(i);
            }
        }

        let columsString = $('<span>');
        for (let i = 0; i < possibleColumns.length; i++) {
            columsString.append($('<span>').addClass('allfocus').text(possibleColumns[i])).append((i < possibleColumns.length - 1 ? ', ' : '.'));
        }
        let div = $('<div>');
        div.append($('<p/>').text('The cipher text length is ').append($('<span>').addClass('allfocus')
            .text(cipherTextLength)).append(' so the possible columns used to encode the ciphertext could be: ').append(columsString));
        result.append(div);

        result.append(CipherCompleteColumnarEncoder.paragraph(`Therefore, to form a Complete Columnar table, we'll analyze each of the ${possibleColumns.length} possible column configurations:`));
        const cipherText = ccs.getCompleteColumnarEncoding();

        for (const columnCount of possibleColumns) {

            result.append(CipherCompleteColumnarEncoder.heading(columnCount + ' Columns'));
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

            if (await this.restartCheck()) { return }

            div = $('<div>')
            div.text('Now look for the crib: ').append($('<span>').addClass('allfocus').text(this.state.crib));
            result.append(div);

            console.log('Now processing =====>  Columns: ' + columnCount);

            let cribLocation = this.checkConsecutiveRowsForCrib(ccs, this.state.crib, rowLetters);
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

                        let ccc = `has ${cribInfo[i][1]} of the ${this.state.crib.length}`;
                        if (cribInfo[i][1] === 0) {
                            continue;
                        } else if (cribInfo[i][1] === this.state.crib.length) {
                            ccc = `has all ${cribInfo[i][1]}`;
                        }

                        div.append(`Row ${cribInfo[i][0]} ${ccc} crib letters in it (`)
                            .append($('<span>').addClass('allfocus').text(this.state.crib.substring(offset, offset + cribInfo[i][1]))).append(').');
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

        // See if they requested an abort to restart the operation before we finish
        if (await this.restartCheck()) { return }

        // All done, so mark that we are not in the process of updating
        this.isLoading = false
    }
    /**
     * Check to see if we need to restart the output operation all over
     * This works by giving a UI break sot that we can check for any input and decide to 
     * regenerate the output (because it might take a long time)
     * 
     * You need to call this whenever an operation has taken a long time to see
     * if something needs to be updated:
     *             if (await this.restartCheck()) { return }
     * @returns A flag indicating that something has changed and we need to abort generating output
     */
    public async restartCheck(): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (this.stopGenerating) {
            this.stopGenerating = false;
            setTimeout(() => { this.load() }, 10);
            this.isLoading = false;
            return true;
        }
        return false
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
        console.log('Found in row: ');

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
                    console.log('Checking key: ' + key);
                    if (rowSignature[key] !== undefined) {
                        cribCharacters++;
                        if (rowSignature[key] === cribSignature[key]) {
                            // This is a absolutely known crib letter position.
                            console.log('Matched: ' + rowSignature[key] + ' and ' + cribSignature[key]);
                            console.log('Got a single match!');
                            sigMatch++;
                        }
                        else if (rowSignature[key] >= cribSignature[key]) {
                            // potentially a couple places for the crib letter.
                            console.log(`Letter ${key} is found in ${rowSignature[key]} places.`);
                            sigMatch++;
                        }

                    }
                }
                // Check if a match was found for all letters in the crib...
                if (sigMatch === Object.keys(cribSignature).length) {
                    // Yes this might be one, return true.
                    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!');
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

                            console.log('This is it!!!');
                            //columnsFitEncoding = true;
                            rowNumber += skipRowCount;
                        }
                    }
                }
            }
            if (firstRowFoundIndexes.length > 0 || secondRowFoundIndexes.length > 0) {
                console.log('In the two rows starting at ' + rowNumber + ', the number of crib characters found is: ' + cribCharacters + '.  >' + combinedRows + '- first row: ' + firstRowFoundIndexes.join(',') + '; second row: ' + secondRowFoundIndexes.join(','));
            }
        }
        return columnsFitEncoding;
    }

    private summarizeXAnalysis(columnCount: number, rowXCount: number[]): string {
        let returnValue: string = '';
        let i: number;
        for (i = 0; i < rowXCount.length - 1; i++) {
            if (rowXCount[i] !== 0) {
                returnValue += 'Row ' + i + ' has ' + rowXCount[i] + (rowXCount[i] === 1 ? ' occurence ' : ' occurences ') + 'of \'X\'. ';
            }
        }
        returnValue += 'The last row has ' + rowXCount[i] + (rowXCount[i] === 1 ? ' occurence ' : ' occurences ') +
            ' of \'X\'' + (rowXCount[i] > 1 ? ', so this is a strong clue that the cipher uses ' + columnCount + ' columns because \'X\' is the pad character.' : '.');
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
