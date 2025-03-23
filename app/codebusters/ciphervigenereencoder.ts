import { BoolMap, cloneObject } from '../common/ciphercommon';
import {
    IOperationType,
    IState,
    ITestType,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
} from '../common/cipherhandler';
import { CipherTypeButtonItem, ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { Mapper } from '../common/mapper';
import { mapperFactory } from '../common/mapperfactory';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';

interface IVigenereState extends IEncoderState {
    /** The type of operation */
    operation: IOperationType;
    /** The size of the chunking blocks for output - 0 means respect the spaces */
    blocksize: number;
}

interface ICribInfo {
    plaintext: string;
    ciphertext: string;
    position: number;
    criblen: number;
    cipherlen: number;
}
/**
 *
 * Vigenere Encoder
 *
 */
export class CipherVigenereEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Vigenere';
    public usesPortaTable = false;
    public usesVigenereTable = true;
    public ciphermap: Mapper;

    public validVigenereTests: ITestType[] = [
        ITestType.None,
        // Remove Vigenere from Division B/C for the 2022-2023 season
        // ITestType.cregional,
        // ITestType.cstate,
        // ITestType.bregional,
        // ITestType.bstate,
        ITestType.aregional,
    ];
    public validPortaTests: ITestType[] = [
        ITestType.None,
        ITestType.bstate,
        ITestType.bregional,
        ITestType.cregional,
        ITestType.cstate,
    ];
    // Default the valid tests to the Vigenere which is the default cipher
    public validTests = this.validVigenereTests

    public defaultstate: IVigenereState = {
        /** The current cipher type we are working on */
        cipherType: ICipherType.Vigenere,
        /** Currently selected keyword */
        keyword: '',
        /** The current cipher we are working on */
        cipherString: '',
        /** The current string we are looking for */
        findString: '',
        operation: 'decode',
        blocksize: 0,
    };
    public state: IVigenereState = cloneObject(this.defaultstate) as IVigenereState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];

    public uniquePatterns: { [index: number]: string } = {}
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IState, suppressOutput = false): void {
        this.state = cloneObject(this.defaultstate) as IVigenereState;
        this.copyState(this.state, data);
        if (suppressOutput) {
            this.setCipherType(this.state.cipherType);
        } else {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Make a copy of the current state
     */
    public save(): IState {
        // We need a deep copy of the save state
        const savestate = cloneObject(this.state) as IState;
        return savestate;
    }
    /**
     * Initializes the encoder/decoder.
     * Make sure we have the right tables for the cipher checks
     */
    public init(lang: string): void {
        super.init(lang);
        this.setCipherType(this.state.cipherType);
    }
    public setCipherType(cipherType: ICipherType): boolean {
        const changed = super.setCipherType(cipherType);
        this.ciphermap = mapperFactory(cipherType);
        if (cipherType === ICipherType.Porta) {
            this.cipherName = "Porta";
            this.validTests = this.validPortaTests;
            this.usesPortaTable = true;
            this.usesVigenereTable = false;
        } else {
            this.cipherName = "Vigenere";
            this.validTests = this.validVigenereTests;
            this.usesPortaTable = false;
            this.usesVigenereTable = true;
        }
        return changed;
    }
    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        const encoded = this.chunk(this.state.cipherString, this.state.blocksize);

        const result: ITestQuestionFields = {
            version: 2,
            answer: this.repeatStr(' ', encoded.length),
            replacements: this.repeatStr(' ', encoded.length),
            notes: '',
        };
        return result;
    }
    /**
     * Determines if this generator is appropriate for a given test
     * type.  For Division A and B, only decode is allowed
     * @param testType Test type to compare against
     * @param anyOperation Don't restrict based on the type of operation
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType, anyOperation: boolean): string {
        let result = super.CheckAppropriate(testType, anyOperation);
        if (!anyOperation && result === '' && testType !== undefined) {
            if (
                testType !== ITestType.cregional &&
                testType !== ITestType.cstate &&
                testType !== ITestType.bregional &&
                testType !== ITestType.bstate &&
                this.state.operation === 'encode'
            ) {
                result = 'Encode problems are not allowed on ' + this.getTestTypeName(testType);
            }
            if (
                testType !== ITestType.bstate &&
                testType !== ITestType.cstate &&
                this.state.operation === 'crypt'
            ) {
                result =
                    'Cryptanalysis problems are not allowed on ' + this.getTestTypeName(testType);
            }
        }
        return result;
    }
    public setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }
    /**
     * Determine if the question text references the right pieces of this cipher
     */
    public validateQuestion(): void {
        super.validateQuestion();
        let msg = '';

        const questionText = this.state.question.toUpperCase();
        if (this.state.operation === 'crypt') {
            if (
                questionText.indexOf('DECOD') < 0 &&
                questionText.indexOf('DECRY') < 0 &&
                questionText.indexOf('WAS ENC') < 0 &&
                questionText.indexOf('ENCODED') < 0 &&
                questionText.indexOf('ENCRYPTED') < 0 &&
                questionText.indexOf('BEEN ENC') < 0
            ) {
                msg +=
                    "The Question Text doesn't appear to mention that " +
                    'the cipher needs to be decrypted.';
            }
            // Look to see if the crib appears in the question text
            const crib = this.minimizeString(this.state.crib);
            if (crib !== '' && questionText.indexOf(crib) < 0) {
                msg +=
                    "The Crib Text '" +
                    this.state.crib +
                    "' doesn't appear to be mentioned in the Question Text.";
            }
        } else {
            // For an encode or decode, they need to mention the key
            const key = this.minimizeString(this.state.keyword);
            if (key !== '' && questionText.indexOf(key) < 0) {
                msg +=
                    "The Key '" +
                    this.state.keyword +
                    "' doesn't appear to be mentioned in the Question Text.";
            }
            if (this.state.operation === 'encode') {
                if (questionText.indexOf('ENCOD') < 0 && questionText.indexOf('ENCRY') < 0) {
                    msg +=
                        "The Question Text doesn't appear to mention that " +
                        'the cipher needs to be encoded.';
                } else if (
                    questionText.indexOf('WAS ENCOD') > 0 ||
                    questionText.indexOf('BEEN ENCOD') > 0 ||
                    questionText.indexOf('ENCRYPTED') > 0 ||
                    questionText.indexOf('ENCODED') > 0 ||
                    questionText.indexOf('WAS ENCRY') > 0 ||
                    questionText.indexOf('BEEN ENCRY') > 0
                ) {
                    msg +=
                        'The Question Text appears to mention that the ' +
                        'cipher needs to be decoded, but this is an encode problem';
                }
            } else {
                if (
                    questionText.indexOf('DECOD') < 0 &&
                    questionText.indexOf('DECRY') < 0 &&
                    questionText.indexOf('ENCODED') < 0 &&
                    questionText.indexOf('ENCRYPTED') < 0 &&
                    questionText.indexOf('WAS ENC') < 0 &&
                    questionText.indexOf('BEEN ENC') < 0
                ) {
                    msg +=
                        "The Question Text doesn't appear to mention that " +
                        'the cipher needs to be decrypted.';
                }
            }
        }
        const sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');

        this.setErrorMsg(msg, 'vq', sampleLink);
    }
    public placeCrib(): ICribInfo {
        const crib = this.minimizeString(this.state.crib);
        const strings = this.buildReplacementVigenere(
            this.minimizeString(this.state.cipherString),
            this.minimizeString(this.state.keyword),
            9999
        );
        if (strings.length !== 1) {
            return undefined;
        }
        const cribpos = this.minimizeString(strings[0][1]).indexOf(crib);
        if (cribpos < 0) {
            return undefined;
        }
        return {
            plaintext: this.minimizeString(strings[0][1]).substring(cribpos, cribpos + crib.length),
            ciphertext: this.minimizeString(strings[0][0]).substring(cribpos, cribpos + crib.length),
            position: cribpos,
            criblen: crib.length,
            cipherlen: strings[0][0].length,
        };
    }
    /**
     * Converts a number to corresponding to the positional text version of
     *  the number like 2nd, 55th, etc.
     * @param val Number to generate string for
     * @returns Positional text version of string
     */
    public getPositionText(val: number): string {
        let suffix = 'th';
        if (val < 4 || val > 20) {
            const ones = val % 10;
            if (ones === 1) {
                suffix = 'st';
            } else if (ones === 2) {
                suffix = 'nd';
            } else if (ones === 3) {
                suffix = 'rd';
            }
        }
        return String(val) + '<sup>' + suffix + '</sup>';
    }
    /**
     * Generates the sample question text for a cipher
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {
        let msg = '';
        let ciphertypetext = 'Vigen&egrave;re';
        if (this.state.cipherType === ICipherType.Porta) {
            ciphertypetext = 'Porta';
        }
        if (this.state.operation === 'crypt') {
            msg = `<p>The following quote ${this.genAuthor()} has been encoded with the ${ciphertypetext}
                Cipher using a very common word for the key. `;

            const cribpos = this.placeCrib();
            msg += this.getCribPlacement(cribpos);
        } else {
            const keyword = this.genMonoText(this.minimizeString(this.state.keyword));
            if (this.state.operation === 'encode') {
                msg = `<p>The following quote ${this.genAuthor()} needs to be encoded 
                    with the ${ciphertypetext} Cipher with a keyword of ${keyword}`;
            } else {
                msg = `<p>The following quote ${this.genAuthor()} needs to be decoded 
                    with the ${ciphertypetext} Cipher with a keyword of ${keyword}`;
            }
        }
        msg += '</p>';
        return msg;
    }

    /**
     * This handles the Vigenere/Porta Cipher specific question options.
     * @param qOptions the array of options
     * @param langtext the language string (blank for English)
     * @param hinttext any hint text provided
     * @param fixedName name of the cipher
     * @param operationtext existing question text
     * @param operationtext2 additional question text for the specific cipher
     * @param cipherAorAn literally 'a' or 'an' for referring to a cipher type.
     */
    public addQuestionOptions(qOptions: string[], langtext: string, hinttext: string, fixedName: string, operationtext: string, operationtext2: string, cipherAorAn: string): boolean {

        if (this.state.operation != 'crypt') {
            operationtext2 = ` using a keyword of ${this.genMonoText(this.minimizeString(this.state.keyword))}`
        } else {
            const cribpos = this.placeCrib();
            operationtext2 = '. ' + this.getCribPlacement(cribpos);
        }
        if (fixedName == 'Vigenere') {
            fixedName = 'Vigenère';
        }
        return super.addQuestionOptions(qOptions, langtext, hinttext, fixedName, operationtext, operationtext2, cipherAorAn);
    }
    /**
     * This function identifies the crib placement for Affine cryptanalysis and returns question text describing the placement.
     * @param cribpos structure containing crib placement info from selected crib letters
     * @param ptstring the plain text string
     * @return string describing what the selected cipher characters map to in plain text.
     * @private
     */
    private getCribPlacement(cribpos: ICribInfo): string {
        let msg = '';
        if (cribpos === undefined) {
            msg += 'But <strong>the crib can not be found in the Plain Text</strong>. ';
        } else if (cribpos.position === 0) {
            msg += `The deciphered text starts with ${this.genMonoText(cribpos.plaintext)}.`;
        } else if (cribpos.position === cribpos.cipherlen - cribpos.criblen) {
            msg += `The deciphered text ends with ${this.genMonoText(cribpos.plaintext)}.`;
        } else {
            const startpos = this.getPositionText(cribpos.position + 1);
            const endpos = this.getPositionText(cribpos.position + cribpos.criblen);
            msg += `The ${startpos} through ${endpos} cipher characters (${this.genMonoText(cribpos.ciphertext)}) decode
                to be ${this.genMonoText(cribpos.plaintext)}`;
        }
        return msg;
    }

    /**
      * Generate the recommended score and score ranges for a cipher
      * 100 for a Decode (approximately 2 points per letter), 120 for an Encode.
      * If the Block Size is the same as the Key length subtract 20 points.
      * If the Block Size is non-zero and different from the Key length, add 25 points.
      * @returns Computed score ranges for the cipher and text description
      */
    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)
        let testUsage = this.getTestUsage();
        const usedOnA = testUsage.includes(ITestType.aregional) || testUsage.includes(ITestType.astate);
        let text = ''
        let rangetext = ''
        let extra = ''
        let suggested = 0
        let range = 5
        let scaleFactor = 1
        if (this.state.cipherType === ICipherType.Porta) {
            range = 10
            if (usedOnA) {
                scaleFactor = 1.2
            }
            suggested = Math.round(scaleFactor * qdata.len * 2.25)
            if (this.state.blocksize > 0) {
                if (this.state.blocksize === this.state.keyword.length) {
                    suggested -= 20;
                    extra += ` Having a blocksize the same as the keyword length (${this.state.keyword.length}) makes it about 20 points easier.`;
                } else {
                    suggested += 25;
                    extra += ` Having a blocksize ${this.state.blocksize} different than the keyword length ${this.state.keyword.length} makes it about 25 points harder.`;
                }
            }
        } else {
            range = 15
            if (usedOnA) {
                scaleFactor = 1.1
            }
            suggested = Math.round(scaleFactor * (qdata.unique * 2.5 + qdata.len))
            if (Math.abs(this.state.offset) <= 3) {
                suggested -= 20
            }
            if (qdata.minlength === 1) {
                suggested -= 15
            } else if (qdata.minlength === 2) {
                suggested -= 10
            }
        }
        if (this.state.operation === 'crypt') {
            suggested += 15;
            extra += ` A cryptanalysis problem adds extra work, which makes it about 15 points harder.`;
        }

        const min = Math.max(suggested - range, 0)
        const max = suggested + range
        suggested += Math.round(range * Math.random() - range / 2);
        if (max > min) {
            rangetext = ` (From a range of ${min} to ${max})`
        }
        if (qdata.len < 30) {
            text = `<p><b>WARNING:</b> <em>There are only ${qdata.len} characters in the quote, we recommend at least 40 characters for a good quote</em></p>`
        }
        if (qdata.len > 2) {
            text += `<p>There are ${qdata.len} characters in the quote.${extra}
             We suggest you try a score of ${suggested}${rangetext}</p>`
        }
        return { suggested: suggested, min: min, max: max, text: text }
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        this.setOperation(this.state.operation);
        this.setCipherType(this.state.cipherType);
        this.setBlocksize(this.state.blocksize);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.showLengthStatistics();
        if (this.state.cipherType === ICipherType.Porta) {
            if (this.state.operation !== 'crypt') {
                this.guidanceURL = 'TestGuidance.html#Porta';
                $('.crib').hide();
            } else {
                this.guidanceURL = 'TestGuidance.html#Porta_Decrypt';
                $('.crib').show();
            }
        } else {
            if (this.state.operation !== 'crypt') {
                this.guidanceURL = 'TestGuidance.html#Vigenere';
                $('.crib').hide();
            } else {
                this.guidanceURL = 'TestGuidance.html#Vigenere_Decrypt';
                $('.crib').show();
            }
        }
        JTRadioButtonSet('ciphertype', this.state.cipherType);
        JTRadioButtonSet('operation', this.state.operation);
        $('#blocksize').val(this.state.blocksize);
        $('#crib').val(this.state.crib);
        super.updateOutput();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);
        result.append(this.createSuggestKeyDlg('Suggest Key'))

        let radiobuttons = [
            CipherTypeButtonItem(ICipherType.Vigenere),
            CipherTypeButtonItem(ICipherType.Porta),
        ];
        result.append(JTRadioButton(8, 'ciphertype', radiobuttons, this.state.cipherType));

        radiobuttons = [
            { id: 'wrow', value: 'encode', title: 'Encode' },
            { id: 'mrow', value: 'decode', title: 'Decode' },
            { id: 'crow', value: 'crypt', title: 'Cryptanalysis' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));
        this.genQuestionFields(result);
        this.genEncodeField(result);

        const suggestButton = $('<a/>', { type: "button", class: "button primary tight", id: "suggestkey" }).text("Suggest Key")

        result.append(
            JTFLabeledInput(
                'Key',
                'text',
                'keyword',
                this.state.keyword,
                'small-12 medium-12 large-12',
                suggestButton
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

        const inputbox = $('<div/>', { class: 'grid-x grid-margin-x blocksize' });
        inputbox.append(JTFIncButton('Block Size', 'blocksize', this.state.blocksize, ''));
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
        let key = keystring;
        if (key === '') {
            key = 'A';
        }
        const encoded = this.chunk(msg, this.state.blocksize);
        const result: string[][] = [];
        const charset = this.getCharset();
        let message = '';
        let keyIndex = 0;
        let keyString = '';
        let cipher = '';
        const msgLength = encoded.length;
        const keyLength = key.length;
        let lastSplit = -1;

        const factor = msgLength / keyLength;
        keyString = this.repeatStr(key.toUpperCase(), factor + 1);
        for (let i = 0; i < msgLength; i++) {
            const messageChar = encoded.substring(i, i + 1).toUpperCase();
            const m = charset.indexOf(messageChar);
            if (m >= 0) {
                let keyChar = keyString.substr(keyIndex, 1).toUpperCase();
                let k = charset.indexOf(keyChar);
                while (k < 0) {
                    keyIndex++;
                    keyChar = keyString.substr(keyIndex, 1).toUpperCase();
                    k = charset.indexOf(keyChar);
                }

                message += messageChar;
                const c = (m + k) % 26;
                // The substr() basically does modulus with the negative offset
                // in the decode case.  Thanks JavaScript!
                cipher += this.ciphermap.encode(messageChar, keyChar);
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
                    const messagePart = message.substr(0, lastSplit);
                    const cipherPart = cipher.substr(0, lastSplit);
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
        const result = $('<div/>');
        let source = 1;
        let dest = 0;
        let emsg = '';
        if (this.state.operation !== 'encode') {
            source = 0;
            dest = 1;
        }

        // Check to make sure that they provided a Key
        if (this.minimizeString(key) === '') {
            emsg = 'No Key provided.';
        }
        this.setErrorMsg(emsg, 'vkey');

        // If we are doing Cryptanalysis, we need tthe Crib text
        emsg = '';
        if (this.state.operation === 'crypt') {
            const crib = this.minimizeString(this.state.crib);
            if (crib === '') {
                emsg = 'No Crib Text provided for Cryptanalysis.';
            } else if (this.minimizeString(msg).indexOf(crib) < 0) {
                emsg = 'Crib Text ' + this.state.crib + ' not found in Plain Text';
            }
        }
        this.setErrorMsg(emsg, 'vcrib');

        const strings = this.buildReplacementVigenere(msg, key, this.maxEncodeWidth);
        for (const stringset of strings) {
            result.append($('<div/>', { class: 'TOSOLVE' }).text(stringset[source]));
            result.append($('<div/>', { class: 'TOANSWER' }).text(stringset[dest]));
        }
        return result;
    }
    /**
     * Loads up the values for vigenere
     */
    public load(): void {
        /* If they want different sizes, rebuild the string in the chunk size */
        const encoded = this.chunk(this.cleanString(this.state.cipherString), this.state.blocksize);

        const key = this.minimizeString(this.state.keyword);
        this.clearErrors();
        this.validateQuestion();
        const res = this.buildVigenere(encoded, key);
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
            .on('input', (e) => {
                const blocksize = Number($(e.target).val());
                if (blocksize !== this.state.blocksize) {
                    this.markUndo(null);
                    if (this.setBlocksize(blocksize)) {
                        this.updateOutput();
                    }
                }
            });
        $('#keyword')
            .off('input')
            .on('input', (e) => {
                const newkeyword = $(e.target).val() as string;
                if (newkeyword !== this.state.keyword) {
                    this.markUndo('keyword');
                    if (this.setKeyword(newkeyword)) {
                        this.updateOutput();
                    }
                }
            });
    }

    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        const strings = this.buildReplacementVigenere(
            this.state.cipherString,
            this.state.keyword,
            40
        );
        let dest = 1;
        if (this.state.operation === 'encode') {
            dest = 0;
        }

        let solution: string[] = undefined;
        for (const strset of strings) {
            if (solution === undefined) {
                solution = []
            }
            solution.push(...strset[dest].split(''));
        }
        return this.calculateScore(solution, answer, this.state.points);
    }

    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let keypos = 0;
        const result = $('<div/>', { class: 'grid-x' });
        let width = 40;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 30;
            extraclass = ' atest';
        }

        const strings = this.buildReplacementVigenere(
            this.state.cipherString,
            this.state.keyword,
            width
        );
        let keyword = '';
        for (const c of this.state.keyword.toUpperCase()) {
            if (this.isValidChar(c)) {
                keyword += c;
            }
        }

        const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
        for (const strset of strings) {
            let keystring = '';
            for (const c of strset[0]) {
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
            this.addCipherTableRows(table, keystring, strset[source], strset[dest], true);
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     * @param testType Type of test
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        let width = 40;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 30;
            extraclass = ' atest';
        }
        const strings = this.buildReplacementVigenere(
            this.state.cipherString,
            this.state.keyword,
            width
        );
        const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
        let source = 0;
        if (this.state.operation === 'encode') {
            source = 1;
        }
        for (const strset of strings) {
            this.addCipherTableRows(table, '', strset[source], undefined, true);
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        const qnumdisp = String(qnum + 1);
        const result = $('<div/>', { id: 'Q' + qnumdisp });
        let width = 40;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 30;
            extraclass = ' atest';
        }
        const strings = this.buildReplacementVigenere(
            this.state.cipherString,
            this.state.keyword,
            width
        );
        let source = 0;
        if (this.state.operation === 'encode') {
            source = 1;
        }
        result.append(
            this.genInteractiveCipherTable(strings, source, qnum, 'cipherint' + extraclass, true)
        );

        result.append($('<textarea/>', { id: 'in' + qnumdisp, class: 'intnote' }));
        return result;
    }
    /**
     * Start the dialog for suggesting the keyword
     */
    public suggestKey(): void {
        this.suggestLenKey(3, 7);
    }
    /**
     * Populate the dialog with a set of keyword suggestions. 
     */
    public populateKeySuggestions(): void {
        this.populateLenKeySuggestions('genbtn', 'suggestKeyopts', 20, 3, 7)
    }
    /**
     * Set the keyword from the suggested text
     * @param elem Element clicked on to set the keyword from
     */
    public setSuggestedKey(elem: HTMLElement): void {
        const jqelem = $(elem)
        const key = jqelem.attr('data-key')
        $('#suggestKeyDLG').foundation('close')
        this.markUndo('')
        this.setKeyword(key)
        this.updateOutput()
    }
}
