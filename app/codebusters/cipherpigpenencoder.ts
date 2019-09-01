import { cloneObject, StringMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState } from './cipherencoder';
const pigpen1 = require('../images/pigpen1.png');
const pigpen2 = require('../images/pigpen2.png');

/**
 * CipherPigPenEncoder - This class handles all of the actions associated with encoding
 * a PigPen cipher.
 */
export class CipherPigPenEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#PigPen';

    public validTests: ITestType[] = [ITestType.None,
    ITestType.aregional];
    public defaultstate: IEncoderState = {
        cipherString: '',
        cipherType: ICipherType.PigPen,
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
        let revRepl: StringMap = {};
        // Build a normal replacement map so that we can encode the string
        let charset = this.getSourceCharset();
        for (let c of charset) {
            revRepl[c] = c;
        }
        return revRepl;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'grid-x' });
        this.genAlphabet();
        let strings = this.makeReplacement(this.state.cipherString, 40);
        let table = new JTTable({
            class: 'ansblock shrink cell unstriped pigpen',
        });
        let tosolve = 0;
        let toanswer = 1;
        for (let strset of strings) {
            this.addCipherTableRows(
                table,
                undefined,
                strset[tosolve],
                strset[toanswer],
                true
            );
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'grid-x' });
        this.genAlphabet();
        let strings = this.makeReplacement(this.state.cipherString, 40);
        let table = new JTTable({
            class: 'ansblock shrink cell unstriped pigpen',
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
    public genSolution(): JQuery<HTMLElement> {
        let result = $('<div/>');
        result.append($("<h3/>").text("How to Solve"));
        result.append($("<p/>").text("First you want to create the lookup table " +
            "by drawing two tic-tac-toe boards followed by two big Xs. "));
        result.append($("<img/>", { src: pigpen1 }));
        result.append($("<p/>").text("Then write the alphabet in the tic-tac-toe " +
            "boards across and then down " +
            "putting dots on the letters in the second board."));
        result.append($("<p/>").text("Then fill up the two big Xs starting " +
            "at the top and going clockwise putting dots on the letters in the " +
            "second X. like:"));
        result.append($("<img/>", { src: pigpen2 }));
        result.append($("<p/>").text("With that decode table, it should be quick " +
            "decode the characters by looking at the shapes and whether or not " +
            "the shape has a dot in it or not."));
        return result;
    }
}
