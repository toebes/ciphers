import { cloneObject } from '../common/ciphercommon';
import {
    IState,
    ITestQuestionFields,
    ITestType,
    IScoreInformation,
    toolMode,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { CipherEncoder, suggestedData } from './cipherencoder';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTTable } from '../common/jttable';

interface IRailFenceState extends IState {
    /** Railfence rails value */
    rails: number;
    isRailRange: boolean;
    railOffset: number;     // Offset for the zigzag
}
/**
 * This class creates a Rail Fence solver.
 */
class RailFenceSolver extends CipherEncoder {
    // Array to hold the rail fence encoding
    private readonly solution: string[][];
    // The number of rails in the rail fence
    private readonly railCount: number;
    // The offset of where to start
    private readonly offset: number;
    // Array with the number of characters per rails.
    private readonly charactersInRails: number[];
    // Array with the number of leftover characters (0, 1 or 2).
    private readonly charactersLeftover: number[];
    // Length of text to encode.
    private readonly textLength: number;
    // Number of characters in each zigzag period
    private readonly charsPerZigzag: number;
    // Number of zigzag periods in this solution
    private readonly countZigzag: number;
    // Number of characters left over in this solution
    private readonly charsLeftover: number;
    // Solution, but with different number of rails.
    private readonly swizzledSolution: string[][];
    // Array with rail number by offset index
    private readonly railByOffset: number[];

    /**
     * Creates a Rail Fence solver.  Every character in the passed in inputText will
     * be placed in a unique position in the array.
     * @param rails The number of rails in the rail fence
     * @param inputText The inputText to be encoded
     */
    constructor(rails: number, offset: number, inputText: string) {
        super();
        this.railCount = rails;
        this.offset = offset;
        const text = this.minimizeString(inputText);
        this.textLength = text.length;

        this.charsPerZigzag = 2 * (this.railCount - 1);
        this.countZigzag = Math.floor(this.textLength / this.charsPerZigzag);
        this.charsLeftover = this.textLength % this.charsPerZigzag;
        this.charactersInRails = [];
        this.charactersLeftover = [];

        this.solution = [];
        this.swizzledSolution = [];

        this.railByOffset = [];
        for (let index = 1; index <= this.charsPerZigzag; index++) {
            this.railByOffset.push((index <= this.railCount) ? index : this.railCount - (index % this.railCount))
        }

        // Loop over the rails to place characters
        for (let railIndex = 1; railIndex <= this.railCount; railIndex++) {
            // Adjust for computer zero-based arrays
            const railArrayIndex = railIndex - 1;

            // Initialize character per rail counts
            this.charactersInRails[railArrayIndex] = 0;
            this.charactersLeftover[railArrayIndex] = 0;

            // Add a second dimension to the array
            this.solution[railArrayIndex] = [];

            // Go thru the string to be encoded
            for (let columnIndex = 1; columnIndex <= this.textLength; columnIndex++) {
                // Adjust for computer zero-based arrays
                const colArrayIndex = columnIndex - 1;

                // Test if a character should be placed in the array location
                if (
                    placeCharacter(railIndex, colArrayIndex, this.offset, this.railCount, this.charsPerZigzag)
                ) {
                    this.solution[railArrayIndex][colArrayIndex] = text.charAt(colArrayIndex);
                    // Update counts for complete zigzag or leftovers -- this is used in solution table.
                    if (columnIndex <= this.getCharsPerZigzag() * this.getCountZigzag()) {
                        this.charactersInRails[railArrayIndex]++;
                    } else {
                        this.charactersLeftover[railArrayIndex]++;
                    }
                } else {
                    this.solution[railArrayIndex][colArrayIndex] = '';
                }
            }
        }
    }

    public swizzle(rails: number): JQuery<HTMLElement> {
        const swizzledCharsPerZigzag = 2 * (rails - 1);
        const swizzledCharsLeftover = this.textLength % swizzledCharsPerZigzag;

        // const cipherText = this.getRailFenceEncoding();

        let nextCharIndex = 0;
        for (let railIndex = 1; railIndex <= rails; railIndex++) {
            const railArrayIndex = railIndex - 1;
            this.swizzledSolution[railArrayIndex] = [];
            for (let columnIndex = 1; columnIndex <= this.textLength; columnIndex++) {
                const colArrayIndex = columnIndex - 1;
                if (placeCharacter(railIndex, colArrayIndex, 0, rails, swizzledCharsPerZigzag)) {
                    this.swizzledSolution[railArrayIndex][
                        colArrayIndex
                    ] = this.getRailFenceEncoding().charAt(nextCharIndex);
                    nextCharIndex++;
                } else {
                    this.swizzledSolution[railArrayIndex][colArrayIndex] = '';
                }
            }
        }

        let tableClass = 'railfence-lg';
        if (this.textLength > 90) {
            tableClass = 'railfence-sm';
        } else if (this.textLength > 45) {
            tableClass = 'railfence-md';
        }

        const returnValue = $('<div/>');
        // Counter for a partial zigzag.
        // let leftover = 1;
        // if (swizzledCharsLeftover === 0) {
        //     leftover = 0;
        // }

        const solutionTable = $('<table/>', { class: tableClass }).attr('width', '15px');
        const tableBody = $('<tbody/>');

        for (let i = 1; i <= rails; i++) {
            const tableRow = $('<tr/>');

            let data = '';
            for (let col = 0; col < this.getTextLength(); col++) {
                // Get all the characters from each zigzag. for this row and put it in a table cell.
                if (col % swizzledCharsLeftover === 0) {
                    // start a new string...
                    if (data.length > 0) {
                        tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
                    }
                    let char: string = this.swizzledSolution[i - 1][col];
                    if (char.length === 0) {
                        char = '.';
                    }
                    data = char;
                } else {
                    let char: string = this.swizzledSolution[i - 1][col];
                    if (char.length === 0) {
                        char = '.';
                    }
                    data = data.concat(char);
                }
            }
            // Finish the partial...
            if (data.length > 0) {
                tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
            }
            tableBody.append(tableRow);
        }
        solutionTable.append(tableBody);

        returnValue.append(solutionTable);

        // Get the solution for these rails
        let decoded = '';
        for (let i = 0; i < this.textLength; i++) {
            for (let j = 0; j < rails; j++) {
                if (this.swizzledSolution[j][i] !== '.') {
                    decoded = decoded.concat(this.swizzledSolution[j][i]);
                }
            }
        }

        returnValue.append(
            $('<p/>').text('Using ' + rails.toString() + ' rails, the cipher text decodes to: ')
        );
        returnValue.append($('<p/>', { class: 'TOANSWER' }).text(decoded));

        return returnValue;
    }

    // Determintes the number of spaces between the first and second characters on the same rail.
    public spacesToNext(rail: number) {
        let count = 0;
        let counting = false;
        for (let i = this.offset; i < this.offset + this.charsPerZigzag; i++) {
            if (counting) count++;
            if (rail === this.railByOffset[i % this.charsPerZigzag]) {
                if (!counting)
                    counting = true;
                else
                    break;
            }
        }
        return count - 1;
    }

    public getTextLength(): number {
        return this.textLength;
    }

    public getCharsPerZigzag(): number {
        return this.charsPerZigzag;
    }

    public getCountZigzag(): number {
        return this.countZigzag;
    }
    public getCharsLeftover(): number {
        return this.charsLeftover;
    }
    public getCharactersInRail(rail: number): number {
        let returnValue = -1;
        if (rail >= 1 && rail <= this.railCount) {
            returnValue = this.charactersInRails[rail - 1] + this.charactersLeftover[rail - 1];
        }

        return returnValue;
    }
    public getRailFenceEncoding(): string {
        let returnValue = '';

        // Loop over each column, rail after rail and build a string of the non-blank characters.
        for (let i = 0; i < this.railCount; i++) {
            const rail: string[] = this.solution[i];
            for (let j = 0; j < rail.length; j++) {
                if (rail[j].length > 0) {
                    returnValue = returnValue.concat(rail[j]);
                }
            }
        }
        return returnValue;
    }
    /**
     * Create a formatted div which shows the Rail Fence solution.
     */
    public getRailFenceAnswer(): JQuery<HTMLElement> {
        const returnValue = $('<div/>', { class: 'TOSOLVE' });

        // TODO: These font sizes are hard-coded, but there should/could probably
        // be some CSS magic here...???
        let fontSize = '16pt';
        if (this.textLength > 90) {
            fontSize = '10pt';
        } else if (this.textLength > 45) {
            fontSize = '14pt';
        }

        // Loop thru each rail
        for (let i = 0; i < this.railCount; i++) {
            let encodedText = '';
            const rail: string[] = this.solution[i];
            // Loop thru each column
            for (let j = 0; j < rail.length; j++) {
                // Check for a character
                if (rail[j].length > 0) {
                    // Add the character
                    encodedText = encodedText.concat(rail[j]);
                } else {
                    // Add white space filler
                    encodedText = encodedText.concat(' ');
                }
            }
            // Add the next rail, using <pre> to maintain white space width.
            returnValue.append(
                $('<pre/>')
                    .text(encodedText)
                    .css('font-size', fontSize)
            );
        }
        // Adds some space at the bottom...
        returnValue.append('<p/>');

        return returnValue;
    }

    public getRailFenceSolution(): JQuery<HTMLElement> {
        let tableClass = 'railfence-lg';
        if (this.textLength > 90) {
            tableClass = 'railfence-sm';
        } else if (this.textLength > 45) {
            tableClass = 'railfence-md';
        }

        const returnValue = $('<div/>');

        // Counter for a partial zigzag.
        let leftover = 1;
        if (this.getCharsLeftover() === 0) {
            leftover = 0;
        }

        const solutionTable = $('<table/>', { class: tableClass }).attr('width', '15px');

        const tableHeader = $('<thead/>');
        tableHeader.append(
            $('<tr/>').append(
                $('<th/>', { class: 'rail-info' })
                    .attr('colspan', 1)
                    .attr('rowspan', 2)
                    .text('Rail'),
                $('<th/>', { class: 'rail-info' })
                    .attr('colspan', 3)
                    .text('Counts'),
                $('<th/>', { class: 'rail-data' })
                    .attr('colspan', this.getCountZigzag() + leftover)
                    .text('Zigzag')
            )
        );
        //solutionTable.append(tableHeader);

        const zigZagRow = $('<tr/>');
        tableHeader.append(
            zigZagRow.append(
                $('<td/>', { class: 'rail-info' }).text('zz'),
                $('<td/>', { class: 'rail-info' }).text('l/o'),
                $('<td/>', { class: 'rail-info' }).text('Tot')
            )
        );

        for (let zz = 1; zz <= this.getCountZigzag() + leftover; zz++) {
            zigZagRow.append($('<th/>', { class: 'rail-data' }).text(zz.toString()));
        }
        solutionTable.append(tableHeader);

        const tableBody = $('<tbody/>');

        for (let i = 1; i <= this.railCount; i++) {
            const tableRow = $('<tr/>');

            tableRow.append(
                $('<td/>', { class: 'rail-info' }).text(i.toString()),
                $('<td/>', { class: 'rail-info' }).text(this.charactersInRails[i - 1].toString()),
                $('<td/>', { class: 'rail-info' }).text(this.charactersLeftover[i - 1].toString()),
                $('<td/>', { class: 'rail-info' }).text(
                    (this.charactersInRails[i - 1] + this.charactersLeftover[i - 1]).toString()
                )
            );

            let data = '';
            for (let col = 0; col < this.getTextLength(); col++) {
                // Get all the characters from each zigzag. for this row and put it in a table cell.
                if (col % this.getCharsPerZigzag() === 0) {
                    // start a new string...
                    if (data.length > 0) {
                        tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
                    }
                    let char: string = this.solution[i - 1][col];
                    if (char.length === 0) {
                        char = '.';
                    }
                    data = char;
                } else {
                    let char: string = this.solution[i - 1][col];
                    if (char.length === 0) {
                        char = '.';
                    }
                    data = data.concat(char);
                }
            }
            // Finish the partial...
            if (data.length > 0) {
                tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
            }
            tableBody.append(tableRow);
        }
        solutionTable.append(tableBody);

        returnValue.append(solutionTable);

        return returnValue;
    }
}

/**
 * The method return true if a character should be placed at the given
 * rail and column for the current railfence.
 * @param rail of the railfence to test
 * @param column of the railfence to test
 * @param offset of where to start the rails
 * @param railCount total number of rails in the question
 * @param charsPerZigZag number of characters placed in one complete zigzag
 */
function placeCharacter(
    rail: number,
    column: number,
    offset: number,
    railCount: number,
    charsPerZigZag: number): boolean {
    let returnValue = false;
    const zigzagPosition = (((column % charsPerZigZag) + offset) % charsPerZigZag + 1);

    // railCount is the number of positions in a 'down' slope, so if zigzagPosition is <= railCount, then the
    // character is on a down slpoe.
    // zigzagPosition of a character is the location of that character in the zigzag but with the offset, this
    // gets shifted, but there are still the same number of characters in the zigzag.

    if (zigzagPosition <= charsPerZigZag / 2 + 1) {
        // this is the down slope, including the very top and the bottom
        if (zigzagPosition === rail) {
            returnValue = true;
        }
    } else {
        // this is the up slope
        if ((2 * railCount) - zigzagPosition /*zigzagPosition - (zigzagPosition - railCount) * 2 */ === rail) {
            returnValue = true;
        }
    }

    return returnValue;
}

/**
 * CipherRailFenceEncoder - This class handles all of the actions associated with encoding
 * a RailFence cipher.
 */
export class CipherRailFenceEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public cipherName = 'Rail Fence';

    public guidanceURL = 'TestGuidance.html#RailFence';

    public validTests: ITestType[] = [ITestType.None];

    public defaultstate: IRailFenceState = {
        cipherString: '',
        cipherType: ICipherType.Railfence,
        rails: 2,
        railOffset: 0,
        isRailRange: false,
        replacement: {},
    };
    public state: IRailFenceState = cloneObject(this.defaultstate) as IRailFenceState;
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
        const rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, this.state.railOffset, this.state.cipherString);
        const strings: string[][] = this.makeReplacement(
            rfs.getRailFenceEncoding(),
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

            if (testType === ITestType.bstate && this.state.railOffset !== 0) {
                result = 'Only a zero offset is allowed on ' + this.getTestTypeName(testType);
            }
        }
        return result;
    }

    /**
     * Set the number of rail fence rails.
     * @param rails The number of rails selected on the spinner.
     */
    public setRails(rails: number): boolean {
        let changed = false;
        if (rails !== this.state.rails) {
            // TODO: the min and max should probably be made to CONSTANTS.
            if (rails >= 2 && rails <= 6) {
                this.state.rails = rails;
                $('#err').text('');
                changed = true;
            } else {
                $('#err').text('The number of rails must be between 2 and 6.');
            }
        }
        return changed;
    }

    /**
     * Set the offset for the start of the rail
     * @param railOffset the offset value
     */
    public setRailOffset(railOffset: number): boolean {
        let changed = false;
        if (railOffset !== this.state.railOffset) {
            const maxRailOffset = (2 * this.state.rails) - 2;
            if (railOffset >= 0 && railOffset < maxRailOffset) {
                this.state.railOffset = railOffset;
                $('#err').text('');
                changed = true;
            } else {
                $('#err').text('The rail offset must be between 0 and ' + (maxRailOffset - 1));
            }
        }
        return changed;
    }

    public toggleRailRange(): void {
        this.state.isRailRange = !this.state.isRailRange;
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
        const rails = this.state.rails.toString();

        if (this.state.isRailRange) {
        } else {
            if (questionText.indexOf(rails) < 0) {
                msg =
                    'The number (' +
                    rails +
                    ') of rails does not appear to be mentioned in the Question Text.';
                showsample = true;
            }
        }

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

    public genHintText(hint: string): string {
        return ` You are told that ${hint.substring(0, hint.indexOf("were used"))} ${hint.includes("rails") ? '' : 'rails '}were used to encode it.`
    }

    public genSampleHint(): string {
        let hint = ` ${this.state.rails.toString()} were used to encode it.`;

        // rails count is between 2 and 6.
        const rand = Math.floor(Math.random() * 30 / 10);

        let top = 6;
        let bottom = 2;
        if (this.state.rails + rand >= 6) {
            top = 6;
            bottom = 4;
        } else if (this.state.rails + rand <= 4) {
            top = 4;
            bottom = 2;
        } else {
            top = this.state.rails + rand;
            bottom = top - 2;
        }

        if (this.state.isRailRange) {
            hint = ` between ${bottom} and ${top} rails were used to encode it.`;
        }

        return hint;
    }

    public attachHandlers(): void {
        super.attachHandlers();
        $('#rails')
            .off('input')
            .on('input', (e) => {
                const newRails = Number($(e.target).val());
                if (newRails !== this.state.rails) {
                    this.markUndo(null);
                    if (this.setRails(newRails)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        $('#railOffset')
            .off('inout')
            .on('input', (e) => {
                const newRailOffset = Number($(e.target).val());
                if (newRailOffset !== this.state.railOffset) {
                    this.markUndo(null);
                    if (this.setRailOffset(newRailOffset)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        $('#isRailRange')
            .off('click')
            .on('click', (e) => {
                //let isRailRange: boolean = Boolean($(e.target).val());
                this.toggleRailRange();
                this.updateOutput();
            });
    }

    public setUIDefaults(): void {
        this.setRails(this.state.rails);
        this.setRailOffset(this.state.railOffset);
    }

    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)
        let scoringText = ''
        let railRangeText = '';
        let railOffsetText = '';

        // Baseline about 100.
        let suggested = 25 + qdata.len;
        if (suggested < 100) {
            suggested = 100;
        }

        // Add 10 for any rails over 2
        suggested += (this.state.rails - 2) * 10;

        // Add 10 if given a range of rails.
        if (this.state.isRailRange) {
            suggested += (this.state.isRailRange ? 10 : 0);
            railRangeText = ` They're told there is a range of rails, so add 10 more points. `;
        }

        // Add 25 if there is a rail offset.
        if (this.state.railOffset > 0) {
            suggested += 25;
            railOffsetText = ` Since there is an offset to the rails, add 25 points. `;
        }

        let range = 10;
        const min = Math.max(suggested - range, 0)
        const max = suggested + range
        suggested += Math.round(range * Math.random() - range / 2);

        let rangetext = ''
        if (max > min) {
            rangetext = `, from a range of ${min} to ${max}`
        }
        if (qdata.len < 35) {
            scoringText = `<p><b>WARNING:</b> <em>There are only ${qdata.len} characters in the quote, we recommend at least 60 characters for a good quote</em></p>`
        }
        if (qdata.len > 2) {
            scoringText += `<p>There are ${qdata.len} characters in the quote and ${this.state.rails} rails.
                ${railRangeText} ${railOffsetText}
                We suggest you try a score of ${suggested}${rangetext}.</p>`
        }

        return { suggested: suggested, min: min, max: max, text: scoringText }
    }

    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        $('#rails').val(this.state.rails);
        $("#railOffset").val(this.state.railOffset);
        const v = String(this.state.isRailRange);
        $('#isRailRange').val(v);
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

        // Create a spinner for the number or rails
        const inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',
        });
        inputbox.append(
            JTFIncButton('Rails', 'rails', this.state.rails, 'small-12 medium-4 large-4')
        );
        result.append(inputbox);

        // Create a spinner for the rail start offset.  it has a range of 0-?
        inputbox.append(
            JTFIncButton('Rail offset', 'railOffset', this.state.railOffset, 'small-12 medium-4 large-4')
        );
        result.append(inputbox);

        // **********************************************************************************
        // TODO:  The whole check box is for tailoring the solution output for either
        // rails is given or the range of rails is given.  Range of rails is for the state
        // test, so put this on hold for right now....I think we need a handler for the
        // new 'checkbox' input.  The handler would go in ciperhandler.ts, attachHandlers()
        // method.  Then this class will set the boolean isRailRange in its attachHandlers().
        // inputbox = $('<div/>', {
        //     class: 'grid-x grid-margin-x',
        // });
        // Create a check box to indicate they are not given the number or rails.
        // TODO: unsure of how to get test version and how this will beused.
        // if ('test is div b, state') {
        inputbox.append(
            JTFLabeledInput(
                'Variable rails',
                'checkbox',
                'isRailRange',
                this.state.isRailRange,
                'small-12 medium-4 large-4'
            )
        );
        result.append(inputbox);
        // }
        // **********************************************************************************
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

        const rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, this.state.railOffset, this.state.cipherString);

        // Get the text characters from each rail, concatenated together
        //result.append($('<p/>').text(rfs.getRailFenceEncoding()));

        const encodedText = $('<div/>', { class: 'TOSOLVE' });
        const strings: string[][] = this.makeReplacement(rfs.getRailFenceEncoding(), 45);
        for (const strset of strings) {
            encodedText.append($('<p/>').text(strset[0]));
        }
        result.append(encodedText);

        result.append(rfs.getRailFenceAnswer());

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
        const rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, this.state.railOffset, this.state.cipherString);
        const strings: string[][] = this.makeReplacement(
            rfs.getRailFenceEncoding(),
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

        const rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, this.state.railOffset, this.state.cipherString);

        // Get the text characters from each rail, concatenated together
        //result.append($('<p/>').text(rfs.getRailFenceEncoding()));

        const strings: string[][] = this.makeReplacement(rfs.getRailFenceEncoding(), 45);
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

        const rails = this.state.rails;

        const rfs: RailFenceSolver = new RailFenceSolver(rails, this.state.railOffset, this.state.cipherString);

        if (this.state.isRailRange) {
            const solutionText =
                'To solve this problem for a range of rails, apply the rail fence to decode the first ' +
                'several letters of the cipher text for the possible rails.  Here, we will decode all the letters, ' +
                'starting with 2 rails.';

            const startRail = 2;
            const endRail = 6;

            const trials = $('<div/>');
            for (let rail = startRail; rail <= endRail; rail++) {
                trials.append($('<h5/>').text('Try ' + rail.toString() + ' rails...'));
                // const testRfs = new RailFenceSolver(rail, rfs.getRailFenceEncoding());
                trials.append(rfs.swizzle(rail));
                //                trials.append(testRfs.getRailFenceT2(rfs.getRailFenceEncoding(), rail));
                if (rail === rails) {
                    break;
                }
            }
            const found = $('<p/>').text(
                'This looks promising, so we conclude ' + rails + ' rails will decode the message.'
            );

            result.append(solutionText, trials, found);

            // we we conclude there are x rails
        }

        const solutionText: string = 'This is how you solve it for ' + this.state.rails + ' rails' +
            ((this.state.railOffset > 0) ? ', and a rail offset of ' + this.state.railOffset : ' and no rail offset') + '.';
        result.append($('<h4/>').text(solutionText));

        const solutionIntro = $('<p/>');

        //'The encrypted text is ', $('<code/>').append(cipherTextLength.toString()),
        //' characters long.

        solutionIntro.append(
            'There are ',
            $('<code/>').append(rails.toString()),
            ' rails in this problem.  Therefore, each zig-zag will have ',
            $('<code/>').append('(2 * #rails) - 2 = (2 * ' + rails.toString() + ') - 2 = '),
            $('<code/>').append(rfs.getCharsPerZigzag().toString()),
            ' characters (A single zig-zag starts with the character from the top row, goes ' +
            'down each row and back up ending one character before the top row.).  ' +
            'The encrypted text is ',
            $('<code/>').append(rfs.getTextLength().toString()),
            'characters long, so there are ',
            $('<code/>').append(rfs.getCountZigzag().toString()),
            'complete zig-zags in the solution, with ',
            $('<code/>').append(rfs.getCharsLeftover().toString()),
            ' characters left over in an incomplete zig-zag.'
        );
        solutionIntro.append(
            $('<p/>').append(
                'All spaces and punctuation have been removed from the message.  To decode it, fill ' +
                'in each rail as described below.  The message can be read along the zig-zags.  Spaces between words can be added based on context.'
            )
        );

        // 2 rails, 1 space
        // 3 rails, 3 spaces
        // 4 rails, 5 spaces
        // 5 rails, 7 spaces
        // 6 rails, 9 spaces
        const spacesBetween = 2 * rails - 3;
        // First rail
        solutionIntro.append($('<h5/>').text('Rail 1'));
        let charsInRail = rfs.getCharactersInRail(1);
        let guidance = ' with';
        if (this.state.railOffset > 0) {
            guidance = ' starting at position ';
        }
        let startLocation = undefined;

        // loop over columns
        for (let i = 0; i < rfs.getCharsPerZigzag(); i++) {
            if (placeCharacter(1, i, this.state.railOffset, this.state.rails, rfs.getCharsPerZigzag())) {
                startLocation = i + 1;
                break;
            }
        }

        solutionIntro.append(
            'Copy the first ',
            $('<code/>').append(charsInRail.toString()),
            ' characters from the cipher text along the first rail,',
            guidance,
            ((this.state.railOffset > 0) ? $('<code/>').append(startLocation.toString()) : ''),
            ((this.state.railOffset > 0) ? '.  Put ' : ''),
            $('<code/>').append(spacesBetween.toString()),
            CipherRailFenceEncoder.getPluralityString(spacesBetween, [
                ' space between each character',
                ' spaces between each character.',
            ]),
        );

        // middle rails
        for (r = 2; r < rails; r++) {
            // needs to be switched for offset > half of CharsPerzigzag
            let firstSpacesCount = rfs.spacesToNext(r);
            let secondSpacesCount = rfs.getCharsPerZigzag() - 2 - firstSpacesCount;


            // loop over columns
            for (let i = 0; i < rfs.getCharsPerZigzag(); i++) {
                if (placeCharacter(r, i, this.state.railOffset, this.state.rails, rfs.getCharsPerZigzag())) {
                    startLocation = i + 1;
                    break;
                }
            }

            solutionIntro.append($('<h5/>').text('Rail '.concat(r.toString())));
            solutionIntro.append(
                'Copy the next ',
                $('<code/>').append(rfs.getCharactersInRail(r).toString()),
                ' characters of the cipher string along rail ',
                $('<code/>').append(r.toString()),
                ', starting at position ',
                $('<code/>').append(startLocation.toString()),
                '.  '
            );
            if (firstSpacesCount === secondSpacesCount) {
                solutionIntro.append(
                    'Put ',
                    $('<code/>').append(firstSpacesCount.toString()),
                    CipherRailFenceEncoder.getPluralityString(firstSpacesCount, [
                        ' space between each character along this rail.',
                        ' spaces between each character along this rail.',
                    ])
                );
            } else {
                solutionIntro.append(
                    'Alternate between ',
                    $('<code/>').append(firstSpacesCount.toString()),
                    ' and ',
                    $('<code/>').append(secondSpacesCount.toString()),
                    ' spaces between characters, starting with ',
                    $('<code/>').append(firstSpacesCount.toString()),
                    CipherRailFenceEncoder.getPluralityString(firstSpacesCount, [
                        ' space.',
                        ' spaces.',
                    ])
                );
            }
        }

        // Last rail
        solutionIntro.append($('<h5/>').text('Rail '.concat(r.toString())));
        charsInRail = rfs.getCharactersInRail(rails);
        // loop over columns
        for (let i = 0; i < rfs.getCharsPerZigzag(); i++) {
            if (placeCharacter(rails, i, this.state.railOffset, this.state.rails, rfs.getCharsPerZigzag())) {
                startLocation = i + 1;
                break;
            }
        }

        solutionIntro.append(
            'Copy the last ',
            $('<code/>').append(charsInRail.toString()),
            ' characters from the cipher text along the last rail, starting at position ',
            $('<code/>').append(startLocation.toString()),
            ' with ',
            $('<code/>').append(spacesBetween.toString()),
            CipherRailFenceEncoder.getPluralityString(spacesBetween, [
                ' space between each character.',
                ' spaces between each character.',
            ])
        );

        solutionIntro.append($('<p/>').append('Read the decrypted message along the diagonals!'));
        result.append(solutionIntro, rfs.getRailFenceSolution());

        return result;
    }

    private static getPluralityString(n: number, strings: string[]): string {
        return n === 1 ? strings[0] : strings[1];
    }
}
