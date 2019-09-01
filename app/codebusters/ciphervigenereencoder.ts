import { cloneObject } from '../common/ciphercommon';
import {
    IOperationType,
    IState,
    ITestType,
    menuMode,
    toolMode,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { CipherEncoder } from './cipherencoder';

interface IVigenereState extends IState {
    /** The type of operation */
    operation: IOperationType;
    /** The size of the chunking blocks for output - 0 means respect the spaces */
    blocksize: number;
}

/**
 *
 * Vigenere Encoder
 *
 */
export class CipherVigenereEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#Vigenere';

    public validTests: ITestType[] = [ITestType.None,
    ITestType.cregional, ITestType.cstate,
    ITestType.bregional, ITestType.bstate,
    ITestType.aregional];
    public defaultstate: IVigenereState = {
        /** The current cipher type we are working on */
        cipherType: ICipherType.Vigenere,
        /** Currently selected keyword */
        keyword: '',
        /** The current cipher we are working on */
        cipherString: '',
        /** The current string we are looking for */
        findString: '',
        operation: 'encode',
        blocksize: 0,
    };
    public state: IVigenereState = cloneObject(
        this.defaultstate
    ) as IVigenereState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Save', color: 'primary', id: 'save', class: 'save' },
        this.undocmdButton,
        this.redocmdButton,
        this.guidanceButton,
    ];

    public restore(data: IState): void {
        this.state = cloneObject(this.defaultstate) as IVigenereState;
        this.copyState(this.state, data);
        this.setUIDefaults();
        this.updateOutput();
    }
    /**
     * Make a copy of the current state
     */
    public save(): IState {
        // We need a deep copy of the save state
        let savestate = cloneObject(this.state) as IState;
        return savestate;
    }
    /**
     * Determines if this generator is appropriate for a given test
     * type.  For Division A and B, only decode is allowed
     * @param testType Test type to compare against
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType): string {
        let result = super.CheckAppropriate(testType);
        if (result === "") {
            if (testType !== ITestType.cregional &&
                testType !== ITestType.cstate &&
                this.state.operation === 'encode') {
                result = "Only Decode problems are allowed on " +
                    this.getTestTypeName(testType);
            }
        }
        return result;
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        this.setOperation(this.state.operation);
        this.setBlocksize(this.state.blocksize);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        if (this.state.operation === 'encode') {
            this.guidanceURL = 'TestGuidance.html#Vigenere';
        } else {
            this.guidanceURL = 'TestGuidance.html#Vigenere_Decrypt';
        }
        JTRadioButtonSet('operation', this.state.operation);
        $('#blocksize').val(this.state.blocksize);
        super.updateOutput();
    }

    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        this.genTestUsage(result);
        let radiobuttons = [
            { id: 'wrow', value: 'encode', title: 'Encode' },
            { id: 'mrow', value: 'decode', title: 'Decode' },
        ];
        result.append(
            JTRadioButton(6, 'operation', radiobuttons, this.state.operation)
        );
        this.genQuestionFields(result);
        this.genEncodeField(result);

        result.append(
            JTFLabeledInput(
                'Key',
                'text',
                'keyword',
                this.state.keyword,
                'small-12 medium-12 large-12'
            )
        );

        let inputbox = $('<div/>', { class: 'grid-x grid-margin-x blocksize' });
        inputbox.append(
            JTFIncButton('Block Size', 'blocksize', this.state.blocksize, '')
        );
        result.append(inputbox);

        return result;
    }
    public setBlocksize(blocksize: number): boolean {
        let changed = false;
        if (this.state.blocksize !== blocksize) {
            this.state.blocksize = blocksize;
            changed = true;
        }
        return changed;
    }
    public buildReplacementVigenere(
        msg: string,
        keystring: string,
        maxEncodeWidth: number
    ): string[][] {
        let encoded = msg;
        let key = keystring;
        if (key === '') {
            key = 'A';
        }
        if (
            this.state.blocksize > 0 &&
            this.state.blocksize < this.maxEncodeWidth
        ) {
            encoded = this.chunk(encoded, this.state.blocksize);
        }
        let result: string[][] = [];
        let charset = this.getCharset();
        let message = '';
        let keyIndex = 0;
        let keyString = '';
        let cipher = '';
        let msgLength = encoded.length;
        let keyLength = key.length;
        let lastSplit = -1;

        let factor = msgLength / keyLength;
        keyString = this.repeatStr(key.toUpperCase(), factor + 1);
        for (let i = 0; i < msgLength; i++) {
            let messageChar = encoded.substr(i, 1).toUpperCase();
            let m = charset.indexOf(messageChar);
            if (m >= 0) {
                let c;
                let keyChar = keyString.substr(keyIndex, 1).toUpperCase();
                let k = charset.indexOf(keyChar);
                while (k < 0) {
                    keyIndex++;
                    keyChar = keyString.substr(keyIndex, 1).toUpperCase();
                    k = charset.indexOf(keyChar);
                }

                message += messageChar;
                c = (m + k) % 26;
                // The substr() basically does modulus with the negative offset
                // in the decode case.  Thanks JavaScript!
                cipher += charset.substr(c, 1);
                keyIndex++;
            } else {
                message += messageChar;
                cipher += messageChar;
                lastSplit = cipher.length;
                continue;
            }
            if (message.length >= maxEncodeWidth) {
                if (lastSplit === -1) {
                    result.push([cipher, message]);
                    message = '';
                    cipher = '';
                    lastSplit = -1;
                } else {
                    let messagePart = message.substr(0, lastSplit);
                    let cipherPart = cipher.substr(0, lastSplit);
                    message = message.substr(lastSplit);
                    cipher = cipher.substr(lastSplit);
                    result.push([cipherPart, messagePart]);
                }
            }
        }
        if (message.length > 0) {
            result.push([cipher, message]);
        }
        return result;
    }

    public buildVigenere(msg: string, key: string): JQuery<HTMLElement> {
        let result = $('<div/>');
        let source = 1;
        let dest = 0;
        if (this.state.operation === 'decode') {
            source = 0;
            dest = 1;
        }
        let strings = this.buildReplacementVigenere(
            msg,
            key,
            this.maxEncodeWidth
        );
        for (let stringset of strings) {
            result.append(
                $('<div/>', { class: 'TOSOLVE' }).text(stringset[source])
            );
            result.append(
                $('<div/>', { class: 'TOANSWER' }).text(stringset[dest])
            );
        }
        return result;
    }
    /**
     * Loads up the values for vigenere
     */
    public load(): void {
        let encoded = this.cleanString(this.state.cipherString);
        /* If they want different sizes, rebuild the string in the chunk size */
        if (
            this.state.blocksize > 0 &&
            this.state.blocksize < this.maxEncodeWidth
        ) {
            encoded = this.chunk(encoded, this.state.blocksize);
        }

        let key = this.minimizeString(this.state.keyword);
        $('#err').text('');
        let res = this.buildVigenere(encoded, key);
        $('#answer')
            .empty()
            .append(res);
        this.attachHandlers();
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('#blocksize')
            .off('input')
            .on('input', e => {
                let blocksize = Number($(e.target).val());
                if (blocksize !== this.state.blocksize) {
                    this.markUndo(null);
                    if (this.setBlocksize(blocksize)) {
                        this.updateOutput();
                    }
                }
            });
        $('#keyword')
            .off('input')
            .on('input', e => {
                let newkeyword = $(e.target).val() as string;
                if (newkeyword !== this.state.keyword) {
                    this.markUndo('keyword');
                    if (this.setKeyword(newkeyword)) {
                        this.updateOutput();
                    }
                }
            });
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        let keypos = 0;
        let result = $('<div/>', { class: 'grid-x' });
        let strings = this.buildReplacementVigenere(
            this.state.cipherString,
            this.state.keyword,
            40
        );
        let keyword = '';
        for (let c of this.state.keyword.toUpperCase()) {
            if (this.isValidChar(c)) {
                keyword += c;
            }
        }

        let table = new JTTable({ class: 'ansblock shrink cell unstriped' });
        for (let strset of strings) {
            let keystring = '';
            for (let c of strset[0]) {
                if (this.isValidChar(c)) {
                    keystring += keyword.substr(keypos, 1);
                    keypos = (keypos + 1) % keyword.length;
                } else {
                    keystring += c;
                }
            }
            let source = 0;
            let dest = 1;
            if (this.state.operation === 'encode') {
                source = 1;
                dest = 0;
            }
            this.addCipherTableRows(
                table,
                keystring,
                strset[source],
                strset[dest],
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
        let strings = this.buildReplacementVigenere(
            this.state.cipherString,
            this.state.keyword,
            40
        );
        let table = new JTTable({ class: 'ansblock shrink cell unstriped' });
        let source = 0;
        if (this.state.operation === 'encode') {
            source = 1;
        }
        for (let strset of strings) {
            this.addCipherTableRows(table, '', strset[source], undefined, true);
        }
        result.append(table.generate());
        return result;
    }
}
