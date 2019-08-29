import { cloneObject, StringMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { ConvertToMorse, tomorse } from '../common/morse';
import { CipherEncoder, IEncoderState } from './cipherencoder';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';

/**
 * CipherMorbitEncoder - This class handles all of the actions associated with encoding
 * a Morbit cipher.
 */
export class CipherMorbitEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#Morbit';

    public validTests: ITestType[] = [ITestType.None,
    ITestType.cregional, ITestType.cstate,
    ITestType.bregional, ITestType.bstate];
    public defaultstate: IEncoderState = {
        cipherString: '',
        cipherType: ICipherType.Morbit,
        replacement: {},
        operation: 'decode',
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
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setOperation(this.state.operation);
    }
    public updateOutput(): void {
        this.guidanceURL = 'TestGuidance.html#morbit' + this.state.operation;
        if (this.state.operation === 'decode') {
            $('.hint').show();
            $('.crib').hide();
        } else {
            $('.hint').hide();
            $('.crib').show();
        }
        JTRadioButtonSet('operation', this.state.operation);
        super.updateOutput();
    }

    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        result.append(this.genTestUsage());
        let radiobuttons = [
            { id: 'mrow', value: 'decode', title: 'Decode' },
            { id: 'crow', value: 'crypt', title: 'Cryptanalysis' },
        ];
        result.append(
            JTRadioButton(6, 'operation', radiobuttons, this.state.operation)
        );

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
        result.append(
            JTFLabeledInput(
                'Hint Characters',
                'text',
                'hint',
                this.state.hint,
                'hint small-12 medium-12 large-12'
            )
        );
        result.append(
            JTFLabeledInput(
                'Crib Text',
                'text',
                'crib',
                this.state.crib,
                'crib small-12 medium-12 large-12'
            )
        );
        return result;
    }
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be output properly.
     * This returns the strings as an array of pairs of strings with
     * the encode and decode parts delivered together.  As a side effect
     * it also updates the frequency table
     */
    public makeReplacement(str: string, maxEncodeWidth: number): string[][] {
        let charset = this.getCharset();
        let sourcecharset = this.getSourceCharset();
        let langreplace = this.langreplace[this.state.curlang];
        let encodeline = '';
        let decodeline = '';
        let lastsplit = -1;
        let result: string[][] = [];
        let morsestr = ConvertToMorse(str, langreplace);
        let extra = "";

        // Zero out the frequency table
        this.freq = {};
        for (let i = 0, len = sourcecharset.length; i < len; i++) {
            this.freq[sourcecharset.substr(i, 1).toUpperCase()] = 0;
        }
        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (let t of morsestr) {
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== 'undefined') {
                t = langreplace[t];
            }
            // Spaces between words use two separator characters
            if (t === ' ') {
                extra = "XX";
            } else if (typeof tomorse[t] !== 'undefined') {
                // Spaces between letters use one separator character
                decodeline += this.repeatStr(" ", extra.length) + t;
                // result += extra + tomorse[t];
                // Make sure that this is a valid character to map from
                let pos = charset.indexOf(t);
                if (pos >= 0) {
                    t = tomorse[t];
                    if (isNaN(this.freq[t])) {
                        this.freq[t] = 0;
                    }
                    this.freq[t]++;
                } else if (t !== "'") {
                    // This is a potential split position, so remember it
                    lastsplit = decodeline.length;
                }
                encodeline += t;
                // When the encoded character is longer than the character
                // we encode (like the Tap Code Cipher) we need to pad the
                // original string
                if (t.length > 1) {
                    decodeline += this.repeatStr(" ", t.length - 1);
                }
                // See if we have to split the line now
                if (encodeline.length >= maxEncodeWidth) {
                    if (lastsplit === -1) {
                        result.push([encodeline, decodeline]);
                        encodeline = '';
                        decodeline = '';
                        lastsplit = -1;
                    } else {
                        let encodepart = encodeline.substr(0, lastsplit);
                        let decodepart = decodeline.substr(0, lastsplit);
                        encodeline = encodeline.substr(lastsplit);
                        decodeline = decodeline.substr(lastsplit);
                        result.push([encodepart, decodepart]);
                    }
                }
                extra = "X";
            }
        }
        // And put together any residual parts
        if (encodeline.length > 0) {
            result.push([encodeline, decodeline]);
        }
        return result;
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
            class: 'ansblock shrink cell unstriped Morbit',
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
            class: 'ansblock shrink cell unstriped Morbit',
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
