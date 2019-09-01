import { cloneObject, StringMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
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
    public readonly TapCodeMap: StringMap = {
        A: '. . ',
        B: '. .. ',
        C: '. ... ',
        D: '. .... ',
        E: '. ..... ',
        F: '.. . ',
        G: '.. .. ',
        H: '.. ... ',
        I: '.. .... ',
        J: '.. ..... ',
        K: '. ... ',
        L: '... . ',
        M: '... .. ',
        N: '... ... ',
        O: '... .... ',
        P: '... ..... ',
        Q: '.... . ',
        R: '.... .. ',
        S: '.... ... ',
        T: '.... .... ',
        U: '.... ..... ',
        V: '..... . ',
        W: '..... .. ',
        X: '..... ... ',
        Y: '..... .... ',
        Z: '..... ..... ',
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
        { title: 'Save', color: 'primary', id: 'save' },
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
            .append(this.genSolution());

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
    public genQuestion(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'grid-x' });
        this.genAlphabet();
        let strings = this.makeReplacement(this.state.cipherString, 60);
        let table = new JTTable({
            class: 'ansblock shrink cell unstriped TapCode',
        });
        let tosolve = 0;
        if (this.state.operation === 'encode') {
            tosolve = 1;
        }
        for (let strset of strings) {
            this.addCipherTableRows(
                table,
                undefined,
                strset[tosolve],
                undefined,
                true
            );
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Generate the HTML to display the solution for a cipher
     */
    public genSolution(): JQuery<HTMLElement> {
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
        result.append($("<p/>").text("Then go through the cipher text and put a " +
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
