import {cloneObject, isAllDigits, isAllLetters, repeatStr, sanitizeString} from '../common/ciphercommon';
import {IScoreInformation, IState, ITestQuestionFields, ITestType, toolMode,} from '../common/cipherhandler';
import {ICipherType} from '../common/ciphertypes';
import {JTButtonItem} from '../common/jtbuttongroup';
import {JTFLabeledInput} from '../common/jtflabeledinput';
import {CipherEncoder} from './cipherencoder';
import {JTFIncButton} from '../common/jtfIncButton';
import {JTTable} from '../common/jttable';
import {JTRadioButton} from "../common/jtradiobutton";
import {pad} from "flatpickr/dist/utils";

interface ICompleteColumnarState extends IState {
    /** CompleteColumnar railss value */
    columns: number;
}
/**
 * This class creates a Complete Columnar solver.
 */
class CompleteColumnarSolver {
    // The encoding
    private readonly solution: string;
    // The number of rails in the rail fence
    private readonly columnCount: number;
    // The offset of where to start
    private readonly columnOrder: number[];
    // Length of text to encode.
    private readonly textLength: number;
    // Number of rows total len divided by column count.
    private readonly rowCount: number;

    /**
     * Creates a Complete Columnar solver.  Every character in the passed in inputText will
     * be placed in a unique position in the array.
     * @param columns The number of columns
     * @param columnOrder array containing the index of the column (size MUST be equal to number of columns)
     * @param inputText The inputText to be encoded
     */
    constructor(columns: number, columnOrder: string, inputText: string) {
        this.solution = '';
        this.columnCount = columns;
        this.columnOrder = [];

        if (columnOrder === undefined) {
            columnOrder = '1';
        }

        columnOrder = columnOrder.toUpperCase();


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
                const indexOfSortedLetter = keyword.indexOf(letter);
                this.columnOrder.push(indexOfSortedLetter);
                keyword[indexOfSortedLetter] = '#';
            }
        }
        else {
            $('#err').text('Column order can not be determined... ');
        }

        const text = sanitizeString(inputText);
        this.textLength = text.length;


        const charsOver = (text.length % this.columnCount);
        const padLength = (charsOver > 0) ? this.columnCount - charsOver : charsOver;
        console.log('Pad length is: ' + padLength);
        const plainText = text + repeatStr('X', padLength);
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

    public isEncoded(): boolean {
        return this.solution.length > 0;
    }

    public getTextLength(): number {
        return this.textLength;
    }

    public getRowCount(): number {
        return this.rowCount;
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

    public getCompleteColumnarSolution(): JQuery<HTMLElement> {
        let tableClass = 'railfence-lg';
        if (this.textLength > 90) {
            tableClass = 'railfence-sm';
        } else if (this.textLength > 45) {
            tableClass = 'railfence-md';
        }

        const returnValue = $('<div/>');

        // // Counter for a partial zigzag.
        // let leftover = 1;
        // if (this.getCharsLeftover() === 0) {
        //     leftover = 0;
        // }
        //
        // const solutionTable = $('<table/>', { class: tableClass }).attr('width', '15px');
        //
        // const tableHeader = $('<thead/>');
        // tableHeader.append(
        //     $('<tr/>').append(
        //         $('<th/>', { class: 'rail-info' })
        //             .attr('colspan', 1)
        //             .attr('rowspan', 2)
        //             .text('Rail'),
        //         $('<th/>', { class: 'rail-info' })
        //             .attr('colspan', 3)
        //             .text('Counts'),
        //         $('<th/>', { class: 'rail-data' })
        //             .attr('colspan', this.getCountZigzag() + leftover)
        //             .text('Zigzag')
        //     )
        // );
        // //solutionTable.append(tableHeader);
        //
        // const zigZagRow = $('<tr/>');
        // tableHeader.append(
        //     zigZagRow.append(
        //         $('<td/>', { class: 'rail-info' }).text('zz'),
        //         $('<td/>', { class: 'rail-info' }).text('l/o'),
        //         $('<td/>', { class: 'rail-info' }).text('Tot')
        //     )
        // );
        //
        // for (let zz = 1; zz <= this.getCountZigzag() + leftover; zz++) {
        //     zigZagRow.append($('<th/>', { class: 'rail-data' }).text(zz.toString()));
        // }
        // solutionTable.append(tableHeader);
        //
        // const tableBody = $('<tbody/>');
        //
        // for (let i = 1; i <= this.columnCount; i++) {
        //     const tableRow = $('<tr/>');
        //
        //     tableRow.append(
        //         $('<td/>', { class: 'rail-info' }).text(i.toString()),
        //         $('<td/>', { class: 'rail-info' }).text(this.charactersInRails[i - 1].toString()),
        //         $('<td/>', { class: 'rail-info' }).text(this.charactersLeftover[i - 1].toString()),
        //         $('<td/>', { class: 'rail-info' }).text(
        //             (this.charactersInRails[i - 1] + this.charactersLeftover[i - 1]).toString()
        //         )
        //     );
        //
        //     let data = '';
        //     for (let col = 0; col < this.getTextLength(); col++) {
        //         // Get all the characters from each zigzag. for this row and put it in a table cell.
        //         if (col % this.getCharsPerZigzag() === 0) {
        //             // start a new string...
        //             if (data.length > 0) {
        //                 tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
        //             }
        //             let char: string = this.solution[i - 1][col];
        //             if (char.length === 0) {
        //                 char = '.';
        //             }
        //             data = char;
        //         } else {
        //             let char: string = this.solution[i - 1][col];
        //             if (char.length === 0) {
        //                 char = '.';
        //             }
        //             data = data.concat(char);
        //         }
        //     }
        //     // Finish the partial...
        //     if (data.length > 0) {
        //         tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
        //     }
        //     tableBody.append(tableRow);
        // }
        // solutionTable.append(tableBody);
        //
        // returnValue.append(solutionTable);

        return returnValue;
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

    public defaultstate: ICompleteColumnarState = {
        operation: 'decode',
        cipherString: '',
        cipherType: ICipherType.CompleteColumnar,
        columns: 6,
        replacement: {},
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
        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this.state.columns, this.state.keyword, this.state.cipherString);
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
        if (!anyOperation && result === '' && testType !== undefined) {
            // What is allowed is:
            //  Division B Regional:  Decode with 0 offset
            //  Division B State: Cryptanalysis with zero offset
            //  Division C Regional: Decode with any offset
            //  Division C State: Decode+Cryptanalysis with any offset

            if ((testType === ITestType.bregional || testType === ITestType.cregional) &&
                this.state.columns > 9) {
                result = 'Nine or fewer columns are allowed on ' + this.getTestTypeName(testType);
            }
        }
        return result;
    }

    /**
     * Set the number of rail fence rails.
     * @param columns The number of rails selected on the spinner.
     */
    public setColumns(columns: number): boolean {
        let changed = false;
        if (columns !== this.state.columns) {
            // TODO: the min and max should probably be made to CONSTANTS.


            if (columns >= 4 && columns <= 11) {
                this.state.columns = columns;
                $('#err').text('');
                changed = true;
            } else {
                $('#err').text('The number of columns must be between 2 and 6.');
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
                if (newColumns !== this.state.columns) {
                    this.markUndo(null);
                    if (this.setColumns(newColumns)) {
                        this.updateOutput();
                    }
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
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        $('#rails').val(this.state.columns);
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

        let operationButtons = [
            {id: 'mrow', value: 'decode', title: 'Decode'},
            {id: 'crow', value: 'crypt', title: 'Cryptanalysis'},
        ];
        result.append(JTRadioButton(6, 'operation', operationButtons, this.state.operation));

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
        result.append(inputbox);

        if (this.state.operation === 'decode') {
            // Either one or the other of these two input boxes will be shown...
            // Create an input for the keyword in the decode case.
            inputbox.append(JTFLabeledInput('Keyword', 'text', 'keyword', '', 'small-12 medium-4 large-4')
            );
            result.append(inputbox);
        }
        else {
            // Create an input for the column order in the cryptanalysis case.
            inputbox.append(JTFLabeledInput('Column Order', 'text', 'columnorder', 'string', 'small-12 medium-4 large-4')
            );
            result.append(inputbox);
        }

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

        if (this.state.columns != this.state.keyword.length) {
            this.setErrorMsg('Column count is ' + this.state.columns +
                ', but column ordering string contains ' + this.state.keyword.length +
                ' characters/digits.', 'ttt', null);
            return result;
        }
        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this.state.columns, this.state.keyword, this.state.cipherString);

        if (!ccs.isEncoded()) {
            this.setErrorMsg('ERROR Column count is ' + this.state.columns +
                ', but column ordering string contains ' + this.state.keyword.length +
                ' characters/digits.', 'ttt', null);
            const messageText = $('<div/>', {class: 'TOSOLVE'});
            messageText.append($('<p/>').text('Unable to generate answer, check Column count and ordering vaiables.'));
            result.append(messageText);
            return result;
        }

        if (ccs.getRowCount() > 15) {
            this.setErrorMsg('Based on the cipher text length and number of columns, the number of rows needed for solving exceeds 15.', 'ttt', null);
        }
        else {
            this.setErrorMsg('', 'ttt', null);
        }

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
        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this.state.columns, this.state.keyword, this.state.cipherString);
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

        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this.state.columns, this.state.keyword, this.state.cipherString);

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
        result.append($('<h3/>').text('How to solve'));

        const columns = this.state.columns;

        const ccs: CompleteColumnarSolver = new CompleteColumnarSolver(columns, this.state.keyword, this.state.cipherString);


        // let ccs: CompleteColumnarSolver = new CompleteColumnarSolver(this.state.rails, sanitizeString(this.state.cipherString));
        // // Get the 'W' solution
        // result.append(ccs.getCompleteColumnarSolution());

        return result;
    }

    private static getPluralityString(n: number, strings: string[]): string {
        return n === 1 ? strings[0] : strings[1];
    }
}
