import { cloneObject, StringMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState } from './cipherencoder';

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
        let res = this.build();
        $('#answer')
            .empty()
            .append(res);

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
        return result;
    }
}
