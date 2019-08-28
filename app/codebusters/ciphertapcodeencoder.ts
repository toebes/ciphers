import { cloneObject, StringMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState } from './cipherencoder';

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
        $('.err').text('');
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
        result.append(this.genTestUsage());
        result.append(this.genQuestionFields());
        result.append(
            JTFLabeledInput(
                'Plain Text',
                'textarea',
                'toencode',
                this.state.cipherString,
                'small-12 medium-12 large-12'
            )
        );
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
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'grid-x' });
        this.genAlphabet();
        let strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);
        let table = new JTTable({
            class: 'ansblock shrink cell unstriped TapCode',
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
    public genSolution(): JQuery<HTMLElement> {
        let result = $('<div/>');
        return result;
    }
}
