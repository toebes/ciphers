import { cloneObject, StringMap, sanitizeString } from '../common/ciphercommon';
import {IState, ITestType, toolMode} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState } from './cipherencoder';
import {JTFIncButton} from "../common/jtfIncButton";


interface IRailFenceState extends IState {
    /** Railfence rows value */
    rows: number;
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
        rows: 2,
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
     * Set the number of rail fence rows.
     * @param rows The number of rows selected on the spinner.
     */
    public setRows(rows: number): boolean {
        let changed = false;
        if (rows !== this.state.rows) {
            // TODO: the min and max should probably be made to CONSTANTS.
            if (rows >= 2 && rows <= 6) {
                this.state.rows = rows;
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
        $('#rows')
        .off('input')
        .on('input', e => {
            let newRows: number = Number($(e.target).val());
            if (newRows !== this.state.rows) {
                this.markUndo(null);
                if (this.setRows(newRows)) {
                    this.updateOutput();
                }
            }
            this.advancedir = 0;
        });

    }

    public setUIDefaults(): void {
        this.setRows(this.state.rows);
    }
    public updateOutput(): void {
        super.updateOutput();
        $('#rows').val(this.state.rows);
    }

    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        this.genTestUsage(result);
        this.genQuestionFields(result);
        this.genEncodeField(result);
        
        // Create a spinner for the number or rows
        let inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',
        });
        inputbox.append(
            JTFIncButton('Rows', 'rows', this.state.rows, 'small-12 medium-4 large-4')
        );
        result.append(inputbox);
        inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',            
        });
        // Create a check box to indicate they are not given the number or rows.
        // TODO: unsure of how to get test version and how this will beused.
        // if ('test is div b, state') {
        inputbox.append(
            JTFLabeledInput("Variable rails", "checkbox", "variableRails", false, 'small-12 medium-4 large-4')
        );
        result.append(inputbox);
        // }
        return result;
    }
    /**
     * Fills in the frequency portion of the frequency table.  For the Rail Fence
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void { }
    /**
     * Generate the HTML to display the answer for a cipher.
     * It is just the ciper text formatted with TOANSWER.
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'grid-x' });

        result.append(this.genQuestion());

        let answer = $('<div/>', { class: 'TOANSWER'});
        answer.append(this.state.cipherString);

        result.append(answer);

        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'TOSOLVE' });

        let rfs: RailFenceSolver = new RailFenceSolver(this.state.rows, sanitizeString(this.state.cipherString));

        // Get the text characters from each row, concatenated together
        result.append($('<p/>').text(rfs.getRailFenceEncoding()));

        // TODO: I want the 'work space' section to print in the 'Test Packet', not in 
        // 'Answer Key' or 'Answers and Solutions'.
        let workSpace = $('<div/>', {class: 'instructions'});
        for (var i: number = 0; i < 6; i++) {
            workSpace.append($("<p/>").text("\n"));
        }
        result.append(workSpace);
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

        result.append($('<h3/>').text('How to solve'));
        // TODO: Add more solutioning text...
        result.append($('<p/>').text("This is how you solve it..."));

        let rfs: RailFenceSolver = new RailFenceSolver(this.state.rows, sanitizeString(this.state.cipherString));
        // Get the 'W' solution
        result.append(rfs.getRailFenceSolution());

        return result;
    }
}

/**
 * This class creates a Rail Fence solver. 
 */
class RailFenceSolver {
    // Array to hold the rail fence encoding
    private solution: string[][];
    // The number of rows in the rail fence
    private rowCount: number;
    // Length of text to encode.
    private textLength: number;
    // Number of characters in each 'period'
    private itemsPerPeriod: number;

    /**
     * Creates a Rail Fence solver.  Every character in the passed in text will
     * be placed in a unique position in the array.
     * @param rows The number of rows in the rail fence
     * @param text The text to be encoded
     */
    constructor(rows: number, text: string) {

        this.rowCount = rows;
        this.textLength = text.length;
        this.itemsPerPeriod = 2 * (this.rowCount - 1);

        this.solution = [];

        // Loop over the rows to place characters
        for (var rowIndex: number = 1; rowIndex <= this.rowCount; rowIndex++ ) {

            // Adjust for computer zero-based arrays
            let rowArrayIndex = rowIndex - 1;
            // Add a second dimention to the array
            this.solution[rowArrayIndex] = [];

            // Go thru the string to be encoded
            for (var columnIndex: number = 1; columnIndex <= this.textLength; columnIndex++) {

                // Adjust for computer zero-based arrays
                let colArrayIndex = columnIndex - 1;

                // Test if a character should be placed in the array location
                if (this.placeCharacter(rowIndex, colArrayIndex)) {
                    this.solution[rowArrayIndex][colArrayIndex] = text.charAt(colArrayIndex);
                }
                else {
                    this.solution[rowArrayIndex][colArrayIndex] = "";
                }
            }
        }
    }

    public getRailFenceEncoding(): string {
        var returnValue: string = "";

        // Loop over each column, row after row and build a string of the non-blank characters.
        for (var i: number = 0; i < this.rowCount; i++) {
            var row: string[] = this.solution[i];
            for (var j: number = 0; j < this.solution[i].length; j++) {
                if (this.solution[i][j].length > 0) {
                    returnValue = returnValue.concat(this.solution[i][j]);
                }
            }
        }
        return returnValue;
    }
    /**
     * Create a formatted div which shows the Rail Fence solution.
     */
    public getRailFenceSolution(): JQuery<HTMLElement> {
        let returnValue = $('<div/>');

        // Loop thru each row
        for (var i: number = 0; i < this.rowCount; i++) {
            var encodedText: string = "";
            var row: string[] = this.solution[i];
            // Loop thru each column
            for (var j: number = 0; j < this.solution[i].length; j++) {
                // Check for a character
                if (this.solution[i][j].length > 0) {
                    // Add the character
                    encodedText = encodedText.concat(this.solution[i][j]);
                }
                else {
                    // Add white space filler
                    encodedText = encodedText.concat(' ');
                }
            }
            // Add the next row, using <pre> to maintain white space width.
            returnValue.append($('<pre/>').text(encodedText));
        }

        return returnValue;
    }

    /**
     * The method return true if a character should be placed at the given
     * row and column for the current railfence.
     * @param row of the railfence to test
     * @param column of the railfence to test
     */
    private placeCharacter(row: number, column: number): boolean {

        let returnValue: boolean = false;
        let periodPosition = (column % this.itemsPerPeriod) + 1;

        if (periodPosition <= (this.itemsPerPeriod /2) + 1) {
            // this is the down slope, includeing the very top and the bottom
            if (periodPosition === row) {
                returnValue = true;
            }
        }
        else {
            // this is the up slope
            if ((periodPosition - ((periodPosition - this.rowCount) * 2)) === row) {
                returnValue = true;
            }
        }

        return returnValue;
    }
}
