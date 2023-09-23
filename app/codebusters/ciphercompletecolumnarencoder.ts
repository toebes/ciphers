import {cloneObject, repeatStr, sanitizeString} from '../common/ciphercommon';
import {
    IScoreInformation,
    IState,
    ITestQuestionFields,
    ITestType,
    testTypeNames,
    toolMode,
} from '../common/cipherhandler';
import {ICipherType} from '../common/ciphertypes';
import {JTButtonItem} from '../common/jtbuttongroup';
import {JTFLabeledInput} from '../common/jtflabeledinput';
import {CipherEncoder} from './cipherencoder';
import {JTFIncButton} from '../common/jtfIncButton';
import {JTTable} from '../common/jttable';

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
        if (this.lettersInFirstRow > 0 && this.lettersInSecondRow > 0) {
            return true;
        }
        return false;
    }

}

/**
 * This class creates a Complete Columnar solver.
 */
class CompleteColumnarSolver {
    // The encoding
    private readonly solution: string;
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
    constructor(columns: number, columnOrder: string, inputText: string, crib: string) {
        this.solution = '';
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
        }
        else if (this.columnCount < columnOrder.length) {
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

        /*
        if (isAllDigits(columnOrder, true)) {
            // Assumed numbers, convert to indexes.
            for (let i = 0; i < columnOrder.length; i++) {
                // subtract 1 so it is a zero based array index...
                this.columnOrder.push(Number(columnOrder.charAt(i)) - 1);
            }
        }
        else if (isAllLetters(columnOrder)) {
            // Assume keyword, so sort the letters and convert to numbers
            const keyword = columnOrder.split('');

            const keywordSorted = keyword.slice().sort();

            for (const letter of keywordSorted) {
                letter.match(/^[ -~]+$/);
                const indexOfSortedLetter = keyword.indexOf(letter);
                this.columnOrder.push(indexOfSortedLetter);
                keyword[indexOfSortedLetter] = '#';
            }
        }
        else {
            $('#err').text('Column order can not be determined... ');
        }
*/
        const text = sanitizeString(inputText);

        const charsOver = (text.length % this.columnCount);
        this.padLength = (charsOver > 0) ? this.columnCount - charsOver : charsOver;
        console.log('Pad length is: ' + this.padLength);
        const plainText = text + repeatStr('X', this.padLength);
        this.textLength = plainText.length;
        console.log('So we encode: ' + plainText);

        for (let i = 0; i < this.columnCount; i++) {
            const index = this.columnOrder[i];
            for (let j = index; j < plainText.length; j += this.columnCount) {
                this.solution  += plainText[j];
            }

        }
        this.rowCount = plainText.length / this.columnCount;
        console.log('---->>>Encoded as: ' + this.solution );
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
        return this.solution.length > 0;
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


        // const c = this.state.cipherString
        //
        // const charsOver = (c.length % this.state.columns);
        // const padLength = (charsOver > 0) ? this.state.columns - charsOver : charsOver;
        // console.log('Pad length is: ' + padLength);
        // const plainText = c + repeatStr('X', 1);
        // console.log('So we encode: ' + plainText);
        //
        // let encoding = '';
        // const columnOrderArray = columnOrder.split('');
        // for (let i = 0; i < this.state.columns; i++) {
        //     const index = Number(columnOrder.charAt(i));
        //     for (let j = index; j < plainText.length; j += this.state.columns) {
        //         encoding += plainText[j];
        //     }
        //
        // }
        // console.log('Encoded as: ' + encoding);
        //
        // return encoding;
        //

        return this.solution;
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

        const returnValue = $('<div/>');

        const columnOrder: number[] = [this.columnCount];

        for (let columnToAnalyze = 0; columnToAnalyze < this.columnsToAnalyze.length; columnToAnalyze++) {

            console.log('Split Info: ' + this.cribSplitInformation[columnToAnalyze]);

            const s = this.cribSplitInformation[columnToAnalyze];
            returnValue.append(CipherCompleteColumnarEncoder.paragraph('Found the crib in ' + this.columnsToAnalyze.length + ' positions of the ' + this.columnsToAnalyze[columnToAnalyze] + ' column encoding.'));
            let details = '';

            details += ((details.length === 0) ? '' : '  ');
            details += 'Row ' + s.getFirstRow() + ' has ' + s.getLettersInFirstRow() + ' of the ' +
                        s.getCribLength() + ' crib letters in it (' +
                        this.crib.substring(0, s.getLettersInFirstRow()) + ').  Therefore, for row ' + s.getFirstRow() + ', the column order has to end with these letters.'

            let firstRowLetters = s.getRowLetters(s.getFirstRow());

            for (let x = 0; x < this.crib.substring(0, s.getLettersInFirstRow()).length; x++) {
                columnOrder[x - 6] = firstRowLetters.indexOf(this.crib.substring(0 + x, x + 1));
            }

            if (s.getLettersInSecondRow() > 0) {
                details += '\nRow ' + (s.getFirstRow() + 1) + ' has ' + s.getLettersInSecondRow() + ' of the ' +
                    s.getCribLength() + ' crib letters in it (' +
                    this.crib.substring(s.getLettersInFirstRow()) + ').  Furthermore, for row ' + (s.getFirstRow() + 1) + ', the column order has to start with these letters.';

                let secondRowLetters = s.getRowLetters(s.getFirstRow() + 1);

                for (let x = 0; x < this.crib.substring(s.getLettersInFirstRow()).length; x++) {
                    console.log('==========> ' + this.crib.substring(s.getLettersInFirstRow() + x, s.getLettersInFirstRow() + x + 1));
                    columnOrder[x] = secondRowLetters.indexOf(this.crib.substring(s.getLettersInFirstRow() + x, s.getLettersInFirstRow() + x + 1)) + 1;
                }
            }
            // So we can arrange the letter in the following order and take a look...
            this.getPossibleColumnOrderings(this.columnsToAnalyze[columnToAnalyze], s);


            returnValue.append(CipherCompleteColumnarEncoder.paragraph(details));

            let ta2 = CipherCompleteColumnarEncoder.makeCompleColumnarJTTable(this.columnsToAnalyze[columnToAnalyze], this.solution, this.getTextLength(), [3, 1, 5, 4, 2, 6]);
            returnValue.append(ta2.generate());
            ta2 = CipherCompleteColumnarEncoder.makeCompleColumnarJTTable(this.columnsToAnalyze[columnToAnalyze], this.solution, this.getTextLength(), [3, 1, 5, 6, 2, 4]);
            returnValue.append(ta2.generate());
            ta2 = CipherCompleteColumnarEncoder.makeCompleColumnarJTTable(this.columnsToAnalyze[columnToAnalyze], this.solution, this.getTextLength(), [3, 5, 1, 4, 2, 6]);
            returnValue.append(ta2.generate());
            ta2 = CipherCompleteColumnarEncoder.makeCompleColumnarJTTable(this.columnsToAnalyze[columnToAnalyze], this.solution, this.getTextLength(), [3, 5, 1, 6, 2, 4]);
            returnValue.append(ta2.generate());
        }

        return returnValue;
    }

    private getPossibleColumnOrderings(columnsInThisAnalysis: number, splitInfo: CribSplitInformation): number[] {

        // start with second row...find all occurrences of crib letters in second row
        const secondRowLetters = splitInfo.getRowLetters(splitInfo.getFirstRow() + 1);
        console.log('ROW 2 letters: ' + secondRowLetters);

        // Get the part of the crib in the second row.  This fills the array from the FRONT
        let cribInSecondRow = this.crib.substring(splitInfo.getLettersInFirstRow());

        let cribLetters = cribInSecondRow.split('');
        let index = 0, rowOrder = [];
        let count = 0;
        for (let l of cribLetters) {
            console.log('Check for ' + l);
            let startIndex = 0, foundCount = 0;
            while ((index = secondRowLetters.indexOf(l, startIndex)) > -1) {
                if (foundCount > 0) {
                    // This is at least the second time finding this letter...
                    // { T: [5],
                    //   O: [1],
                    //   E: [4,6]
                    //   V: [2]
                    //   E: [6,4]
                    // }
                    console.log('ROW 2 Found a duplicate for ' + l + ' at ' + (index+1));
                } else {
                    console.log('ROW 2 Found occurrence of ' + l + ' at ' + (index+1));
                }

                //rowOrder.push(index + 1);
                startIndex = index + 1;
                foundCount++;
            }
            if (splitInfo.isSplitOverRows()) {
                rowOrder[count] = (index + 1);
            } else {
                // it could be shifted (or not).  The shift will be 0 to columnCount - crib len.
                for (let shift = 0; shift < (this.columnCount - cribLetters.length); shift++) {
                    // set the index in n arrays.
                    rowOrder[count + shift] = (index + 1);
                }
            }
            count++;
        }
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

        // step 2 (R from 2nd row)
        // [[3], [1,2,4,5,6],[1,2,4,5,6],[1,2,4,5,6],[1,2,4,5,6],[1,2,4,5,6]]
        if (splitInfo.isSplitOverRows()) {
            // cribLetters contains letters from the second row, so go in the first position.
            let orderIndex = 1;
            for (let l of cribLetters) {
                console.log('Check for ' + l);
                const foundAt = [];
                let startIndex = 0, foundCount = 0;
                while ((index = secondRowLetters.indexOf(l, startIndex)) > -1) {
                    foundAt.push(index+1);
                    if (foundCount > 0) {
                        // This is at least the second time finding this letter...
                        // { T: [5],
                        //   O: [1],
                        //   E: [4,6]
                        //   V: [2]
                        //   E: [6,4]
                        // }
                        console.log('ROW 2 Found a duplicate for ' + l + ' at ' + (index+1));
                    } else {
                        console.log('ROW 2 Found occurrence of ' + l + ' at ' + (index+1));
                    }
                    // removePositionFromOrdering()

                    //rowOrder.push(index + 1);
                    startIndex = index + 1;
                    foundCount++;
                }
                this.removePositionFromOrdering(ordering, orderIndex, foundAt);
                orderIndex++;
            }
        }
        // step 3 (last E from first row in 2 spots)
        // [[3], [1,2,5], [1,2,5],[4,6], [1,2,5], [4,6]]
                // Get the part of the crib in the first row.  This fill the array from the BACK

                const firstRowLetters = splitInfo.getRowLetters(splitInfo.getFirstRow());

                console.log('ROW 1 letters: ' + firstRowLetters);

                let cribInFirstRow = this.crib.substring(0, splitInfo.getLettersInFirstRow());
                cribLetters = cribInFirstRow.split('');

                let orderIndex = firstRowLetters.length;
                for (let i = cribLetters.length - 1; i >= 0; i--) {
                    console.log('i = ' + i + ' Check for the letter ' + cribLetters[i]);
                    const foundAt = [];
                    let startIndex = 0, foundCount = 0;
                    while ((index = firstRowLetters.indexOf(cribLetters[i], startIndex)) > -1) {
                        foundAt.push(index + 1)
                        if (foundCount > 0) {
                            console.log('ROW 1 Found a duplicate for ' + cribLetters[i] + ' at ' + (index+1));
                        } else {
                            console.log('ROW 1 Found occurrence of ' + cribLetters[i] + ' at ' + (index+1));
                        }
                        //rowOrder.splice();
                        rowOrder.push(index);
                        startIndex = index + 1;
                        foundCount++;
                    }
                    this.removePositionFromOrdering(ordering, orderIndex, foundAt);
                    orderIndex--;
                }
        // step 4 V from 1st row
        // [[3], [1,5], [1,5], [4,6],[2],[4,6]]

        // Step 5
        // Check for X in 4 or 6 and we are cheating...Eliminate 4 or 6
        // todo
        // [[3], [1,5],[1,5],[4],[2],[6]]

        // Step 6 go thru array and collect entries that have LEN > 1 into SET.  (i.e [1,5]) It is possible to have the same number in different sets?? UNLIKELY
        // { 1: -1,
        //   5: -1
        // }
        const EE = {};
        for (let i = 1; i < ordering.length; i++) {
            if (ordering[i].length > 1) {
                for (let j = 0; j < ordering[i].length; j++) {
                    EE[ordering[i][j]] = ordering[i][j];
                }
            }
        }
        console.log('There are ' + EE.toString() + ' duplicates.');

        // Step 7 Iterate thru the MAP.  Iterate thru the order array and find the first entry with '1', and replace it, remove the '1' from every where else.
        // This makes a copy... we need this...
        const combinations = [].concat(ordering.slice(1));
        for (let p in EE) {
            console.log('DDDUPP: '+ EE[p]);
            for (let i = 0; i < combinations.length; i++) {
                if (combinations[i].indexOf(EE[p]) > -1) {
                    console.log('need to split it...');
                    // Replace the found value at i, remove this value in all other locations other than i.
                    const c = [].concat(combinations.slice(0));
                    c[i] = [EE[p]];
                    for (let j = i+1; j < c.length; j++) {
                        const f = c[j].indexOf(EE[p]);
                        if (f > -1) {
                            c[j].splice(f, 1);
                        }
                    }
                    // recurse here
                }
            }
        }

        // need recursive routine to do this elmination.

        // dump no more than 5 rows... first 2, 2 with crib, last.
        //
        // copy array.
        // [[3], [1,5],[1,5],[4],[2],[6]]

        // [[3], [1,5], [1,5], [4,6], [2], [4,6]]

        /*
        3, 1, 5, 4, 2, 6
        3, 1, 5, 6, 2, 4
        3, 5, 1, 4, 2, 6
        3, 5, 1, 6, 2, 4

        2! * 2! = 4

        // [[3], [1,5], [1,5], [2,4,6], [2,4,6], [2,4,6]]
        3, 1, 5, 2, 4, 6
        3, 1, 5, 2, 6, 4
        3, 1, 5, 4, 2, 6
        3, 1, 5, 4, 6, 2
        3, 1, 5, 6, 2, 4
        3, 1, 5, 6, 4, 2
        3, 5, 1, 2, 4, 6
        3, 5, 1, 2, 6, 4
        3, 5, 1, 4, 2, 6
        3, 5, 1, 4, 6, 2
        3, 5, 1, 6, 2, 4
        3, 5, 1, 6, 4, 2

        2! * 3! = 12
        -----------------------------

        (6 - 4)! *


         */

        this.printOrderingPossibilities(ordering);

        this.getOrderingCombinations(0, ordering);

        return rowOrder;
    }

    private getOrderingCombinations(start: number, ordering: number[][]): void {
        console.log(repeatStr(' ', start) + 'Here are the possibilities:' );
        const combo = [];

        for (let i = start + 1; i < ordering.length; i++) {
            if (ordering[i].length === 1) {
                combo.push(ordering[i]);
            } else {
                this.getOrderingCombinations(i, ordering);
            }
            console.log('----> ' + combo.join(''));
        }
        return;
    }

    private printOrderingPossibilities(ordering: [][]): void {
        let msg = '\n['
        for (let i = 0; i < ordering.length; i++) {
            msg += '['
            for (let j = 0; j < ordering[0].length; j++) {
                msg += ((ordering[i][j] === undefined ? '' : ordering[i][j]+ ','));
            }
            msg += '],\n';
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
        for (let i = 0; i < ordering.length; i++) {
            if (orderIndex === i) {
                //if (foundAt.length === 1) {
                    ordering[orderIndex] = foundAt;
                    ordering[0][i] = true;
                //} else {
                    // Remove the value (foundAt[0]) from all other ordering lists.
                //    let indexOfFound = ordering[i].indexOf(foundAt[0]);
                //    if (indexOfFound !== -1) {
                //        ordering[i].splice(indexOfFound, 1);
                //   }
                //}
            } else {
                // remove foundAts from all other indexex (splice())?
                for (let l = 0; l < foundAt.length; l++) {
                    let numberToRemove = foundAt[l];
                    if (ordering[0][i]) {
                        continue
                    }
                    let indexOfNumberToRemove = ordering[i].indexOf(numberToRemove);
                    if (indexOfNumberToRemove === -1) {
                        continue
                    }
                    ordering[i].splice(indexOfNumberToRemove, 1);
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
        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this.state.columns, this.state.keyword, this.state.cipherString, this.state.crib);
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
        // if (crib.length < 3) {
        //     this.setErrorMsg('Crib too short', 'crible', null);
        //     //$('#err').text('The crib should be at least 3 characters, this comes from setCrib()');
        // }
        if (crib !== this.state.crib) {
            //$('#err').text('');
            changed = true;
            this.state.crib = crib.toUpperCase();
        }
        return changed
    }

    /**
     * Set the number of rail fence rails.
     * @param columns The number of rails selected on the spinner.
     */
    public setColumns(columns: number): boolean {
        let changed = false;

        if (columns < 4) {
            columns = 4
            changed = true;
        }
        else if (columns > 11) {
            columns = 11;
            changed = true;
        }

        if (columns !== this.state.columns) {
            // TODO: the min and max should probably be made to CONSTANTS.

            let maxColumns = this.thisTestType === ITestType.cstate ? 11 : 9;
            // if (this.state.testtype === ITestType.cregional || this.state.testtype === ITestType.bregional) {
            //     maxColumns = 9;
            // }

            if (columns >= 4 && columns <= maxColumns) {
                this.state.columns = columns;
                $('#err').text('');
                changed = true;
            } else {
                $('#err').text('For a ' + this.getTestTypeName(this.thisTestType) + ', the number of columns must be between 4 and ' + maxColumns + '.');
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

        res = this.genSolution(ITestType.None);
        $('#sol')
            .empty()
            .append('<hr/>')
            .append(res);

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
        const questionText = this.state.question.toUpperCase();

        // if (this.state.crib.length < 3) {
        //     msg = 'The crib should be at least 3 characters in length.';
        // }
        // if (this.state.rails === 'decode') {
        //     // Look to see if the Hint Digits appear in the Question Text
        //     let notfound = '';
        //     if (this.state.hint === undefined || this.state.hint === '') {
        //         msg = "No Hint Digits provided";
        //     } else {
        //         for (let c of this.state.hint) {
        //             if (questionText.indexOf(c) < 0) {
        //                 notfound += c;
        //             }
        //         }
        //         if (notfound !== '') {
        //             if (notfound.length === 1) {
        //                 msg = "The Hint Digit " + notfound +
        //                     " doesn't appear to be mentioned in the Question Text.";
        //             } else {
        //                 msg = "The Hint Digits " + notfound +
        //                     " don't appear to be mentioned in the Question Text.";
        //             }
        //             showsample = true;
        //         }
        //     }
        // } else {
        //     // Look to see if the crib appears in the quesiton text
        //     let crib = this.minimizeString(this.state.crib);
        //     if (questionText.indexOf(crib) < 0) {
        //         msg = "The Crib Text " + this.state.crib +
        //             " doesn't appear to be mentioned in the Question Text.";
        //         showsample = true;
        //     }
        // }
        if (showsample) {
            sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');
        }
        this.setErrorMsg(msg, 'vq', sampleLink);
    }

    public genSampleHint(): string {
        const rails: string = this.state.columns.toString();
        return rails + ' rails were used to encode it.';
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

        // Dont need this it is on the super().
        $('#keyword')
            .off('input')
            .on('input', (e) => {
                const newkeyword = $(e.target).val() as string;
                if (newkeyword !== this.state.keyword) {
                    this.markUndo('keyword');
                    if (this.setKeyword(newkeyword)) {
                        this.updateOutput();
                    }
                }
            });

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
               if (columnOrder.length != this.state.columns) {
                   // error
                   console.log('Column width is ' + this.state.columns + ' order is set for ' + columnOrder);
               }
               else {
                   console.log('Column order is: ' + columnOrder)
                   this.generateCipherText(columnOrder);
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
        $( '#mrow')
            .off('click')
            .on('click', (e) => {
                this.state.operation = 'decode'

            });
        // $('#railOffset')
        //     .off('inout')
        //     .on('input', (e) => {
        //         const newRailOffset = Number($(e.target).val());
        //         if (newRailOffset !== this.state.railOffset) {
        //             this.markUndo(null);
        //             if (this.setRailOffset(newRailOffset)) {
        //                 this.updateOutput();
        //             }
        //         }
        //         this.advancedir = 0;
        //     });
        // $('#isRailRange')
        //     .off('click')
        //     .on('click', (e) => {
        //         //let isRailRange: boolean = Boolean($(e.target).val());
        //         this.toggleRailRange();
        //         this.updateOutput();
        //     });
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
        $('#rails').val(this.state.columns);
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

        // let operationButtons = [
        //     {id: 'mrow', value: 'decode', title: 'Decode'},
        //     {id: 'crow', value: 'crypt', title: 'Cryptanalysis'},
        // ];
        // result.append(JTRadioButton(6, 'operation', operationButtons, this.state.operation));
        //
        result.append(this.createQuestionTextDlg());

        this.genQuestionFields(result);
        this.genEncodeField(result);

        // Create a spinner for the number or columns
        const inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',
        });
        inputbox.append(
            JTFIncButton('Columns', 'columns', this.state.columns, 'small-12 medium-4 large-4')
        );
        //result.append(inputbox);

        // if (this.state.operation === 'decode') {
        //     // Either one or the other of these two input boxes will be shown...
        //     // Create an input for the keyword in the decode case.
        //     inputbox.append(JTFLabeledInput('Keyword', 'text', 'keyword', '', 'small-12 medium-4 large-4')
        //     );
        //     result.append(inputbox);
        // }
        // else {
            // Create an input for the column order in the cryptanalysis case.
            inputbox.append(JTFLabeledInput('Ordering', 'text', 'columnorder', '', 'small-12 medium-4 large-4'));
        //    result.append(inputbox);

            inputbox.append(JTFLabeledInput('Crib', 'text', 'crib', '', 'small-12 medium-4 large-4'));
            result.append(inputbox);
        // }

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

        console.log('This is the TEXT string: '+ text);
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
                const encodepart = encodeline.substr(0, lastsplit);
                encodeline = encodeline.substr(lastsplit);
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


        if (this.state.columns != this.state.keyword.length) {
            errorMessage = 'Column count is ' + this.state.columns +
                ', but column ordering string contains ' + this.state.keyword.length +
                ' characters/digits.';
            this.setErrorMsg(errorMessage, 'colord', null);
        } else {
            this.setErrorMsg('', 'colord', null);
        }

        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this.state.columns, this.state.keyword, this.state.cipherString, this.state.crib);

        // if (!ccs.isEncoded()) {
        //     this.setErrorMsg('ERROR Column count is ' + this.state.columns +
        //         ', but column ordering string contains ' + this.state.keyword.length +
        //         ' characters/digits.', 'ttt', null);
        //     const messageText = $('<div/>', {class: 'TOSOLVE'});
        //     messageText.append($('<p/>').text('Unable to generate answer, check Column count and ordering vaiables.'));
        //     result.append(messageText);
        //     return result;
        // }

        if (ccs.getRowCount() > 15) {
            errorMessage = 'WARNING: Based on the cipher text length and number of columns, the number of rows needed for solving exceeds 15.';
            this.setErrorMsg(errorMessage, 'rowe', null);
        } else {
            this.setErrorMsg('', 'rowe', null);
        }
        // else {
        //     this.setErrorMsg('', 'ttt', null);
        // }

        // Get the text characters from each rail, concatenated together
        //result.append($('<p/>').text(ccs.getCompleteColumnarEncoding()));

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

        const ap1 = $('<span/>');
        ap1.append(answerString);
        const ap2 = $('<span/>', { class: 'TOANSWER' });
        ap2.append(this.state.cipherString.toUpperCase());
        const ap3 = $('<span/>', { class: 'TOSOLVE' });
        ap3.append('_');
        ap1.append(ap2, ap3);
        answer.append(ap1);

        // let answer = $('<div/>', { class: 'TOANSWER'});
        // answer.append(this.state.cipherString);

        result.append(answer, '<p/>');

        return result;
    }
    /**
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this.state.columns, this.state.keyword, this.state.cipherString, this.state.crib);
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

        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this.state.columns, this.state.keyword, this.state.cipherString, this.state.crib);

        // Get the text characters from each rail, concatenated together
        //result.append($('<p/>').text(ccs.getCompleteColumnarEncoding()));

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
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        let r: number;
        const result = $('<div/>');
        if (this.state.cipherString.length === 0) {
            return result;
        }
        result.append($('<h3/>').text('How to solve...'));

        const columns = this.state.columns;

        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(columns, this.state.keyword, this.state.cipherString, this.state.crib);

        const cipherTextLength = ccs.getTextLength();
        result.append($('<p/>').text('The cipher text length is ' + cipherTextLength));

        const possibleColumns = [];
        const columnsToAnalyze = {};
        for (let i = 4; i < 11; i++) {
            if (cipherTextLength % i === 0) {
                possibleColumns.push(i);
            }
        }
        result.append(CipherCompleteColumnarEncoder.paragraph('Therefore, to form a Complete Columnar table, we\'ll analyze each of the ' + possibleColumns.length + ' possible column configurations:'));
        const cipherText = ccs.getCompleteColumnarEncoding();

        for (const columnCount of possibleColumns) {

            result.append(CipherCompleteColumnarEncoder.heading(columnCount + ' Columns'));
            result.append(CipherCompleteColumnarEncoder.paragraph('A possible Complete Columnar table with ' + columnCount + ' columns.'))

            const ta = CipherCompleteColumnarEncoder.makeCompleColumnarJTTable(columnCount, cipherText, cipherTextLength, undefined);
            const rowCount = cipherTextLength / columnCount;

            const table = new JTTable({class: 'prfreq shrink cell'});

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
                row.add($('<p/>').text('C').append($('<sub/>').text((i+10).toString(36))));
            }
            result.append(ta.generate());
            result.append(CipherCompleteColumnarEncoder.paragraph('Since the letter \'X\' is used as padding, we can analyze this column configuration for a clue of how many columns the cipher uses.'));
            result.append(CipherCompleteColumnarEncoder.paragraph(this.summarizeXAnalysis(columnCount, rowXCount)));
            result.append(CipherCompleteColumnarEncoder.paragraph('Now look for the crib: ' + this.state.crib));

            console.log('==========>  Columns: ' + columnCount);

            let cribLocation = this.checkConsecutiveRowsForCrib(ccs, this.state.crib, rowLetters);
            if (cribLocation.length > 0) {
                const rowDetails = {};
                result.append(CipherCompleteColumnarEncoder.paragraph('Found the crib in ' + cribLocation.length + ' positions of the ' + columnCount + ' column encoding.'));
                let details = '';
                for (const o of cribLocation) {
                    const cribInfo = o['rows'];
                    let offset = 0;
                    for (let i = 0; i < cribInfo.length; i++) {
                        rowDetails['row1'] = cribInfo[i][o]
                        details += ((details.length === 0) ? '' : '  ');
                        details += 'Row ' + cribInfo[i][0] + ' has ' + cribInfo[i][1] + ' of  the ' +
                            this.state.crib.length + ' crib letters in it (' +
                            this.state.crib.substring(offset, offset + cribInfo[i][1]) + ').'
                        offset += cribInfo[i][1];
                    }
                }
                result.append(CipherCompleteColumnarEncoder.paragraph(details));
                // const ta2 = CipherCompleteColumnarEncoder.makeCompleColumnarJTTable(columnCount, cipherText, cipherTextLength, [3,5,1,4,2,6]);
                // result.append(ta2.generate());



            } else {
                result.append(CipherCompleteColumnarEncoder.paragraph('Crib not found, rule out an encoding of ' + columnCount + ' columns.'))
            }
        }


        result.append(CipherCompleteColumnarEncoder.paragraph('Since the crib is found split, we know that ' + ' ends a row and ' + ' starts the subsequent row.'));
        result.append(CipherCompleteColumnarEncoder.paragraph('Since the crib is not split, we know that it is all on one row.  There are two possibilities.'))
        result.append(ccs.getCompleteColumnarSolution());

        return result;
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
                const part1 = cribMap[i-1][1]
                cribMap[i - 1][1].push.apply(part1, indexList);
            }
        }
        console.log('Found in row: ');

        return false;
    }

    private checkConsecutiveRowsForCrib(completeColumarSolver: CompleteColumnarSolver, crib: string, rowLetters: string[]): any[] {

        let columnsFitEncoding = [];

        const cribLetters = crib.split('');
        // let cribSignature = new Map([
        //     [' ', 0]
        // ]);
        // for (const letter of cribLetters) {
        //     if (cribSignature.get(letter) === undefined) {
        //         cribSignature.set(letter, 1);
        //     } else {
        //         cribSignature.set(letter, cribSignature.get(letter) + 1);
        //     }
        // }
        // cribSignature.delete(' ');

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
            let indexList = [];
            let combinedRows = ''
            if (rowNumber < rowLetters.length -1) {
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
                    if (rowSignature[key] !== undefined && rowSignature[key] >= cribSignature[key]) {
                        console.log('Key: ' + key);
                        // count the signature matches..
                        sigMatch++;
                        console.log('Matched: ' + rowSignature[key] + ' and ' + cribSignature[key]);
                    }
                }
                // Check if a match was found for all letters in the crib...
                if (sigMatch === Object.keys(cribSignature).length) {
                    // Yes this might be one, return true.
                    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!');
                    // Find where the crib letters are split between the rows if at all...
                    let firstRowCount = 0;
                    let secondRowCount = 0;

                    // Search first row in order of crib letters until a crib letter is not found
                    for (let letterIndex = 0; letterIndex < cribLetters.length; letterIndex++) {
                        if (rowLetters[rowNumber].indexOf(cribLetters[letterIndex]) !== -1) {
                            firstRowCount++;
                        } else {
                            break;
                        }
                    }
                    // Now search the second row for the remaining crib letters.  This ensures a crib that is split
                    // does not have a letter 'behind' it.  This does not prevent a bad crib choice, but we should
                    // be able to point it out later.
                    for (let letterIndex = firstRowCount; letterIndex < cribLetters.length; letterIndex++) {
                        if (rowLetters[rowNumber + 1].indexOf(cribLetters[letterIndex]) !== -1) {
                            secondRowCount++;
                        }
                    }

                    if (cribLetters.length === firstRowCount + secondRowCount) {
                        let skipRowCount = 0;
                        let rowCribPlacement = [];
                        if (firstRowCount > 0) {
                            rowCribPlacement.push([rowNumber, firstRowCount]);
                        }
                        // else {
                        //     skipRowCount = 0;
                        // }
                        if (secondRowCount > 0) {
                            rowCribPlacement.push([rowNumber+1, secondRowCount]);
                        }
                        // else {
                        //     skipRowCount = 0;
                        // }
                        const o = {};
                        o['rows'] = rowCribPlacement;

                        columnsFitEncoding.push(o);
                        const cribSplitInformation = new CribSplitInformation(cribLetters.length, rowLetters);
                        if (completeColumarSolver.getCribSplitInformation().length === 0) {
                            completeColumarSolver.addColumnsToAnalyze(rowLetters[rowNumber].length, cribSplitInformation);
                        } else {
                            completeColumarSolver.setBadCribChoice();
                        }

                        cribSplitInformation.setSplitInformation(rowNumber, firstRowCount, secondRowCount);

                        console.log('This is it!!!');
                        //columnsFitEncoding = true;
                        rowNumber += skipRowCount;
                    }

                    // I think we should return an object.
                    // { cribrows: [[3,4], [6]]
                    // }
                    // if it is empty, crib is not found.  the object will have the rows that the crib was found in,
                    // if found in only 1 row, then the list just has 1 number.  we can tell this by checking the row counts
                    // Note if you get a firstRowCount of 0 and a complete secondRowCount, then you can skip the step where
                    // the second row becomes the first row....around between lines 1091-1092 in in the if after 1092.

                    // {
                    //     [
                    //         {rows: [3, 3, 4, 1]},
                    //         {rows: [6, 4]}
                    //     ]
                    // }

                }
            }
            console.log('In the two rows starting at ' + rowNumber + ', the number of crib characters is: ' + cribCharacters + '.  >' + combinedRows + '-' + indexList);
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
            ' of \'X\'' + (rowXCount[i]  > 1 ? ', so this is a strong clue that the cipher uses ' + columnCount + ' columns because \'X\' is the pad character.' : '.');
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

        const table = new JTTable({class: 'prfreq shrink cell'});
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
            row.add($('<p/>').text('C').append($('<sub/>').text((columnOffsetTranslation[i]+10).toString(36))));
        }

        return table;
    }


}
