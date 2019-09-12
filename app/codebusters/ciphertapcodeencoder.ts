import { cloneObject, StringMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { CipherEncoder, IEncoderState } from './cipherencoder';
const tapcode = require('../images/tapcode.png');
/**
 * CipherTapCodeEncoder - This class handles all of the actions associated with encoding
 * a TapCode cipher.
 */
export class CipherTapCodeEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#TapCode';

    public validTests: ITestType[] = [ITestType.None,
    ITestType.aregional];

    public maxEncodeWidth: number = 65;
    /**
     * Generates an HTML representation of a string for display.  Replaces the X, O and -
     * with more visible HTML equivalents
     * str String to normalize (with - X and O representing morese characters)
    */
    public normalizeHTML(str: string): string {
        return str
            .replace(/O/g, "&#9679;")
    }

    public readonly TapCodeMap: StringMap = {
        A: 'O O ',
        B: 'O OO ',
        C: 'O OOO ',
        D: 'O OOOO ',
        E: 'O OOOOO ',
        F: 'OO O ',
        G: 'OO OO ',
        H: 'OO OOO ',
        I: 'OO OOOO ',
        J: 'OO OOOOO ',
        K: 'O OOO ',
        L: 'OOO O ',
        M: 'OOO OO ',
        N: 'OOO OOO ',
        O: 'OOO OOOO ',
        P: 'OOO OOOOO ',
        Q: 'OOOO O ',
        R: 'OOOO OO ',
        S: 'OOOO OOO ',
        T: 'OOOO OOOO ',
        U: 'OOOO OOOOO ',
        V: 'OOOOO O ',
        W: 'OOOOO OO ',
        X: 'OOOOO OOO ',
        Y: 'OOOOO OOOO ',
        Z: 'OOOOO OOOOO ',
    };
    public defaultstate: IEncoderState = {
        cipherString: '',
        cipherType: ICipherType.TapCode,
        replacement: {},
    };
    public state: IEncoderState = cloneObject(
        this.defaultstate
    ) as IEncoderState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.guidanceButton,
    ];
    /** Save and Restore are done on the CipherEncoder Class */

    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        this.genAlphabet();
        $('#answer')
            .empty()
            .append(this.build())
            .append(this.genSolution(ITestType.None));

        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        this.genTestUsage(result);
        this.genQuestionFields(result);
        this.genEncodeField(result);
        return result;
    }
    public getReverseReplacement(): StringMap {
        return this.TapCodeMap;
    }
    /**
     * Fills in the frequency portion of the frequency table.  For the Ragbaby
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void { }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);
        let tosolve = 0;
        for (let strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVEQ',
                }).html(this.normalizeHTML(strset[tosolve]))
                    .append($("<br/>"))
            );
        }
        return result;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);
        let tosolve = 0;
        let toanswer = 1;
        for (let strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).html(this.normalizeHTML(strset[tosolve]))
            );
            result.append(
                $('<div/>', {
                    class: 'TOANSWER',
                }).text(strset[toanswer])
            );
        }
        return result;
    }

    /**
     * Generate the HTML to display the solution for a cipher
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        result.append($("<h3/>").text("How to Solve"));
        result.append($("<p/>").text("First you want to create the lookup table " +
            "by drawing a grid with 5 horizontal and 5 vertical lines. " +
            "Then fill in the top with the numbers 1 through 5 and the same on the " +
            "left side of the grid.  Finally fill in the letters from left to right " +
            "and then down, remembering to skip the letter K. " +
            "Once you have filled in all 25 cells, go back and add K to the cell " +
            "with C in it giving you a table like:"));
        result.append($("<img/>", { src: tapcode }));
        result.append($("<p/>").text("Then go through the cipher text and put " +
            "a mark between each two groups of dots. " +
            "To decode, count the number of dots in the first group to pick the " +
            "row in the table and the number of dots in the second group to pick " +
            "the column and read the letter. " +
            "Only when you have a single dot followed by three dots " +
            "(which corresponds to the letter C) do you have to decide whether the " +
            "letter should be a C or K"));
        return result;
    }
}
