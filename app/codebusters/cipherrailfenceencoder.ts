import { cloneObject, StringMap, sanitizeString } from '../common/ciphercommon';
import { IState, ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState } from './cipherencoder';
import { JTFIncButton } from "../common/jtfIncButton";


interface IRailFenceState extends IState {
    /** Railfence railss value */
    rails: number;
    isRailRange: boolean;
}

/**
 * CipherRailFenceEncoder - This class handles all of the actions associated with encoding
 * a RailFence cipher.
 */
export class CipherRailFenceEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#RailFence';

    public validTests: ITestType[] = [ITestType.None,
    ITestType.bregional, ITestType.bstate];

    public defaultstate: IRailFenceState = {
        cipherString: '',
        cipherType: ICipherType.Railfence,
        rails: 2,
        isRailRange: false,
        replacement: {},
    };
    public state: IRailFenceState = cloneObject(
        this.defaultstate
    ) as IRailFenceState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Save', color: 'primary', id: 'save' },
        this.undocmdButton,
        this.redocmdButton,
        this.guidanceButton,
    ];
    /** Save and Restore are done on the CipherEncoder Class */

    /**
 * Determines if this generator is appropriate for a given test
 * type.  For Division A, the Caesar is limited to an offset +- 3
 * @param testType Test type to compare against
 * @returns String indicating error or blank for success
 */
    public CheckAppropriate(testType: ITestType): string {
        let result = super.CheckAppropriate(testType);
        if (result === "" && testType !== undefined) {
            // Additional checks are TBD
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
                changed = true;
            }
            else {
                $('#err').text(
                    'You must specify between 2 and 6 rails.'
                );
            }
        }
        return changed;
    }
    public setRailRange(isRailRange: boolean): void {
        this.state.isRailRange = isRailRange;
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        let res = this.build();
        $('#answer')
            .empty()
            .append(res);

        res = this.genSolution();
        $('#sol')
            .empty()
            .append('<hr/>')
            .append(res);

        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }

    public attachHandlers(): void {
        super.attachHandlers();
        $('#rails')
            .off('input')
            .on('input', e => {
                let newRails: number = Number($(e.target).val());
                if (newRails !== this.state.rails) {
                    this.markUndo(null);
                    if (this.setRails(newRails)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        // $('#isRailRange')
        // .off('input')
        // .on('click', e => {
        //     let isRailRange: boolean = Boolean($(e.target:checked).val());
        //     this.setRailRange(isRailRange);
        //     this.updateOutput();
        // });
    }

    public setUIDefaults(): void {
        this.setRails(this.state.rails);
    }
    public updateOutput(): void {
        super.updateOutput();
        $('#rails').val(this.state.rails);
        let v: string = String(this.state.isRailRange);
        $('#isRailRange').val(v);
    }

    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        this.genTestUsage(result);
        this.genQuestionFields(result);
        this.genEncodeField(result);

        // Create a spinner for the number or rails
        let inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',
        });
        inputbox.append(
            JTFIncButton('Rails', 'rails', this.state.rails, 'small-12 medium-4 large-4')
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
        // inputbox.append(
        //     JTFLabeledInput("Variable rails", "checkbox", "isRailRange", this.state.isRailRange, 'small-12 medium-4 large-4')
        // );
        // result.append(inputbox);
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
        let result: string[][] = [];

        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (let t of text) {
            // Make sure that this is a valid character to map from
            encodeline += t;
            lastsplit = encodeline.length;
            // See if we have to split the line now
            if (encodeline.length >= maxEncodeWidth) {
                let encodepart = encodeline.substr(0, lastsplit);
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
     * Generate the HTML to display the answer for a cipher.
     * It is just the ciper text formatted with TOANSWER.
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $('<div/>'/*, { class: 'grid-x' }*/);

        let rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, sanitizeString(this.state.cipherString));

        // Get the text characters from each rail, concatenated together
        //result.append($('<p/>').text(rfs.getRailFenceEncoding()));

        let encodedText = $('<div/>', { class: 'TOSOLVE' });
        let strings: string[][] = this.makeReplacement(rfs.getRailFenceEncoding(), 45);
        for (let strset of strings) {
            encodedText.append($('<p/>').text(strset[0]));
        }
        result.append(encodedText);

        result.append(rfs.getRailFenceSolution());

        let answer = $('<div/>', { class: "grid-x" });
        let ap1 = $('<span/>', { class: "TOSOLVE" });
        ap1.append("Answer: ___");
        let ap2 = $('<span/>', { class: 'TOANSWER' });
        ap2.append(this.state.cipherString.toUpperCase());
        let ap3 = $('<span/>', { class: "TOSOLVE" });
        ap3.append("___");
        ap1.append(ap2, ap3);
        answer.append(ap1);

        // let answer = $('<div/>', { class: 'TOANSWER'});
        // answer.append(this.state.cipherString);

        result.append(answer, '<p/>');

        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'TOSOLVE' });

        let rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, sanitizeString(this.state.cipherString));

        // Get the text characters from each rail, concatenated together
        //result.append($('<p/>').text(rfs.getRailFenceEncoding()));

        let strings: string[][] = this.makeReplacement(rfs.getRailFenceEncoding(), 45);
        for (let strset of strings) {
            result.append($('<p/>').text(strset[0]));
        }

        // TODO: I want the 'work space' section to print in the 'Test Packet', not in 
        // 'Answer Key' or 'Answers and Solutions'.
        let workSpace = $('<div/>', { class: 'instructions' });
        for (var i: number = 0; i < 6; i++) {
            workSpace.append($("<p/>").text("\n"));
        }
        result.append(workSpace);

        let answerLine = $("<div/>", { class: "TOSOLVE" });
        answerLine.append('Answer: _______________________________________________');
        answerLine.append('<p/>');
        result.append(answerLine);

        return result;
    }
    /**
     * Generate the HTML which is the answer to the question.
     */
    public build(): JQuery<HTMLElement> {
        let result = $('<div/>');

        result.append(this.genAnswer());

        return result;
    }

    /**
     * Generate the HTML that shows the 'W' rail fence solution.
     */
    public genSolution(): JQuery<HTMLElement> {
        let result = $('<div/>');

        let solutionText: string = "This is how you solve it for " + this.state.rails + " rails.";
        if (this.state.isRailRange) {
            solutionText = "This is how you solve it for a range of rails...";
        }

        result.append($('<h3/>').text('How to solve'));
        // TODO: Add more solutioning text...
        result.append($('<p/>').text(solutionText));


        // let rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, sanitizeString(this.state.cipherString));
        // // Get the 'W' solution
        // result.append(rfs.getRailFenceSolution());

        return result;
    }
}

/**
 * This class creates a Rail Fence solver. 
 */
class RailFenceSolver {
    // Array to hold the rail fence encoding
    private solution: string[][];
    // The number of rails in the rail fence
    private railCount: number;
    // Length of text to encode.
    private textLength: number;
    // Number of characters in each 'period'
    private itemsPerCycle: number;

    /**
     * Creates a Rail Fence solver.  Every character in the passed in text will
     * be placed in a unique position in the array.
     * @param rails The number of rails in the rail fence
     * @param text The text to be encoded
     */
    constructor(rails: number, text: string) {

        this.railCount = rails;
        this.textLength = text.length;
        this.itemsPerCycle = 2 * (this.railCount - 1);

        this.solution = [];

        // Loop over the rails to place characters
        for (var railIndex: number = 1; railIndex <= this.railCount; railIndex++) {

            // Adjust for computer zero-based arrays
            let railArrayIndex = railIndex - 1;
            // Add a second dimention to the array
            this.solution[railArrayIndex] = [];

            // Go thru the string to be encoded
            for (var columnIndex: number = 1; columnIndex <= this.textLength; columnIndex++) {

                // Adjust for computer zero-based arrays
                let colArrayIndex = columnIndex - 1;

                // Test if a character should be placed in the array location
                if (this.placeCharacter(railIndex, colArrayIndex)) {
                    this.solution[railArrayIndex][colArrayIndex] = text.charAt(colArrayIndex);
                }
                else {
                    this.solution[railArrayIndex][colArrayIndex] = "";
                }
            }
        }
    }

    public getRailFenceEncoding(): string {
        var returnValue: string = "";

        // Loop over each column, rail after rail and build a string of the non-blank characters.
        for (var i: number = 0; i < this.railCount; i++) {
            var rail: string[] = this.solution[i];
            for (var j: number = 0; j < rail.length; j++) {
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
    public getRailFenceSolution(): JQuery<HTMLElement> {
        let returnValue = $('<div/>', { class: 'TOSOLVE' });

        // TODO: These font sizes are hard-coded, but there should/could probably
        // be some CSS magic here...
        let fontSize: string = "16px";
        if (this.textLength > 90) {
            fontSize = "10px";
        }
        else if (this.textLength > 45) {
            fontSize = "14px";
        }

        // Loop thru each rail
        for (var i: number = 0; i < this.railCount; i++) {
            var encodedText: string = "";
            var rail: string[] = this.solution[i];
            // Loop thru each column
            for (var j: number = 0; j < rail.length; j++) {
                // Check for a character
                if (rail[j].length > 0) {
                    // Add the character
                    encodedText = encodedText.concat(rail[j]);
                }
                else {
                    // Add white space filler
                    encodedText = encodedText.concat(' ');
                }
            }
            // Add the next rail, using <pre> to maintain white space width.
            returnValue.append($('<pre/>').text(encodedText).css("font-size", fontSize));
        }
        // Adds some space at the bottom...
        returnValue.append('<p/>');

        return returnValue;
    }

    /**
     * The method return true if a character should be placed at the given
     * rail and column for the current railfence.
     * @param rail of the railfence to test
     * @param column of the railfence to test
     */
    private placeCharacter(rail: number, column: number): boolean {

        let returnValue: boolean = false;
        let cyclePosition = (column % this.itemsPerCycle) + 1;

        if (cyclePosition <= (this.itemsPerCycle / 2) + 1) {
            // this is the down slope, includeing the very top and the bottom
            if (cyclePosition === rail) {
                returnValue = true;
            }
        }
        else {
            // this is the up slope
            if ((cyclePosition - ((cyclePosition - this.railCount) * 2)) === rail) {
                returnValue = true;
            }
        }

        return returnValue;
    }
}
