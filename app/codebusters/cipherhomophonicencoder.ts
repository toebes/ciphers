import { cloneObject, StringArrayMap, StringMap } from '../common/ciphercommon';
import {
    IOperationType,
    IState,
    ITestType,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';

interface ISolverWord {
    pt: string[];
    ct: string[];
    position: number;
    length: number;
    missing: number;
    unique: number;
    keywordCount: number[];
    pattern: string;
    candidates: string[];
}

interface ISolverData {
    /** The possible replacements for each letter based on the current crib and keyword */
    replacements: Array<[string[], string[]]>;
    /** The type of test we are trying to solve for */
    testType: ITestType;
    /** Extra class to add to any output tables */
    extraclass: string;
    /** Indicates where we already have warned them about this being too hard to solve */
    warned: boolean;
    /** Array indicating which letters in the key are already solved */
    known: boolean[];
    /** Last key check was valid */
    valid: boolean;
    /** Known keyword letters */
    keyword: string[];
    /** Reverse homophonic table */
    reverseHomophonicTable: StringMap;
    /** Character set */
    charset: string;
    /** Limit how many entries we output for a slot */
    limitUpdates: number[]
}

interface IHomophonicState extends IEncoderState {
    /** The type of operation */
    operation: IOperationType;
    /** The size of the chunking blocks for output - 0 means respect the spaces */
    blocksize: number;
    /** The choice of which random slot to use for each letter */
    randomSlot: number[];
}

interface ICribInfo {
    /** The printable plaintext string formatted like the problem */
    plaintext: string;
    /** The printable ciphertext string formatted like the problem */
    ciphertext: string;
    /** The offset in ciphertext characters from the start of the ciphertext */
    position: number;
    /** The length of the crib */
    criblen: number;
    /** The overall length of the cipher */
    cipherlen: number;
}

/**
 *
 * Homophonic Encoder
 *
 */
export class CipherHomophonicEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Homophonic';
    public usesHomophonicTable = false;
    public cipherName = "Homophonic";

    public homophonicTable: StringArrayMap = {};
    public reverseHomophonicTable: StringMap = {};
    public ctIndex = 0;
    public ptIndex = 1;

    public validTests: ITestType[] = [
        ITestType.None,
        ITestType.bstate,
        ITestType.bregional,
        ITestType.cregional,
        ITestType.cstate,
    ];

    public maxencodeWidth = 25;
    public maxencodeWidthDivA = 15;

    public randomizeButton: JTButtonItem = {
        title: 'Randomize',
        id: 'randomize',
        color: 'primary',
    };


    public defaultstate: IHomophonicState = {
        /** The current cipher type we are working on */
        cipherType: ICipherType.Homophonic,
        /** Currently selected keyword */
        keyword: '',
        /** The current cipher we are working on */
        cipherString: '',
        /** The current string we are looking for */
        findString: '',
        operation: 'crypt',
        blocksize: 5,
        randomSlot: [],
    };
    public state: IHomophonicState = cloneObject(this.defaultstate) as IHomophonicState;
    public cmdButtons: JTButtonItem[] = [
        this.randomizeButton,
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IState, suppressOutput = false): void {
        this.state = cloneObject(this.defaultstate) as IHomophonicState;
        this.copyState(this.state, data);
        this.setSourceCharset('ABCDEFGHIKLMNOPQRSTUVWXYZ');
        this.setUIDefaults();
        if (!suppressOutput) {
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
        if (result === '' && testType !== undefined) {
            if (!anyOperation && (testType == ITestType.cregional ||
                testType == ITestType.cstate ||
                testType == ITestType.bregional ||
                testType == ITestType.bstate) &&
                this.state.operation === 'encode'
            ) {
                result = 'Encode problems are not allowed on ' + this.getTestTypeName(testType);
            }
            if (
                testType !== ITestType.bstate &&
                testType !== ITestType.cstate &&
                testType !== ITestType.None &&
                this.state.operation === 'decode'
            ) {
                result =
                    'Decode problems are not allowed on ' + this.getTestTypeName(testType);
            }
        }
        return result;
    }
    public setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }
    public setKeyword(keyword: string): boolean {
        let changed = super.setKeyword(keyword);
        this.updateMapping();
        if (changed) {
            this.validateQuestion();
            this.attachHandlers();
        }
        return changed;
    }
    /**
     * This function updates the random slot assignments for each character in the cipher string.
     * It preserves the existing random slot assignments for any characters that are still in the cipher string after the update,
     * but assigns new random slots for any new characters that have been added to the cipher string.
     */
    public updateRandom(): void {
        const cipherstring = this.cleanString(this.state.cipherString)
        for (let i = this.state.randomSlot.length; i < cipherstring.length; i++) {
            this.state.randomSlot.push(Math.floor(Math.random() * 4));
        }
    }
    /**
     * This function updates the homophonic mapping based on the current keyword and crib settings.
     * It generates the possible replacements for each letter based on the current keyword and crib settings.
     */
    public updateMapping(): void {
        let keywordOffsets = [0, 0, 0, 0];
        const charset = this.getSourceCharset();
        let keyword = this.minimizeString(this.state.keyword)
            .toUpperCase()
            .padEnd(4, 'A')
            .slice(0, 4);
        for (let i = 0; i < 4; i++) {
            let k = keyword[i];
            if (k === 'J') {
                k = 'I';
            }
            const offset = (charset.length - charset.indexOf(k)) % charset.length;
            keywordOffsets[i] = offset >= 0 ? offset : 0;
        }
        // Now build the homophonic table based on the keyword offsets
        this.homophonicTable = {};
        this.reverseHomophonicTable = {};
        for (const c of charset) {
            // For each character, we have 4 possible homophones based on the keyword offsets
            this.homophonicTable[c] = [];
            for (let i = 0; i < 4; i++) {
                const offset = keywordOffsets[i];
                const encodedVal = 1 + ((i * charset.length) + (offset + charset.indexOf(c)) % charset.length);
                this.homophonicTable[c].push(String(encodedVal))
                this.reverseHomophonicTable[String(encodedVal)] = c;
            }
        }
    }
    /**
     * It encodes a character using the homophonic cipher.
     * If forceKeyChar is provided, it forces the use of that particular homophone for the character.
     * @param char 
     * @param forceKeyChar 
     * @returns 
     */
    public encodeHomophonic(char: string, forceKeyChar: number = -1): string {
        // Implementation for encoding a character using the homophonic cipher
        let c = (char || '').toUpperCase();
        if (c === 'J') {
            c = 'I';
        }
        const cmap = this.homophonicTable[c];
        if (cmap === undefined) {
            return char;
        }
        if (forceKeyChar >= 0 && forceKeyChar < cmap.length) {
            return cmap[forceKeyChar];
        }
        const randIndex = Math.floor(Math.random() * cmap.length);
        return cmap[randIndex];
    }
    /**
     * It decodes a character using the homophonic cipher.
     * @param ctval The ciphertext value to decode
     * @returns The decoded plaintext character, or the original value if it is not a valid homophonic ciphertext value
     */
    public decodeHomophonic(ctval: string): string {
        // Implementation for decoding a character using the homophonic cipher
        const plaintext = this.reverseHomophonicTable[ctval];
        return plaintext !== undefined ? plaintext : ctval;
    }
    /**
     * Determine if the question text references the right pieces of this cipher
     */
    public validateQuestion(): void {
        super.validateQuestion();
        let msg = '';

        const questionText = this.state.question.toUpperCase();
        if (this.state.operation === 'crypt') {
            const cribpos = this.placeCrib();
            if (!this.isDecodeOperation(questionText)) {
                msg += `The Question Text doesn't appear to mention that the cipher needs to be decrypted.`;
            }
            if (cribpos !== undefined) {
                // Look to see if the crib appears in the question text

                if (cribpos.plaintext !== '' && this.minimizeString(questionText).indexOf(cribpos.plaintext) < 0) {
                    msg += ` The Crib Text '${this.state.crib}' doesn't appear to be mentioned in the Question Text.`;
                }
            }
        } else {
            let keyword = this.minimizeString(this.state.keyword);
            let hint = this.minimizeString(this.state.hint);
            // All of the letters in the hint must be in the keyword
            if (hint.length > keyword.length || hint.split('').some((c) => keyword.indexOf(c) < 0)) {
                msg += ` The Hint Text '${this.state.hint}' doesn't appear to be a subset of the Key '${this.state.keyword}'.`;
            }
            // For an encode, they need to mention the key
            const key = this.minimizeString(this.state.keyword);
            if (this.state.operation === 'encode') {
                if (key !== '' && questionText.indexOf(key) < 0) {
                    msg += `The Key '${this.state.keyword}' doesn't appear to be mentioned in the Question Text.`;
                }
            } // For a decode, they need to mention the hint text
            else {
                if (hint.split('').some((c) => this.state.question.indexOf(c.toUpperCase()) < 0)) {
                    msg += `The Hint Text '${this.state.hint}' doesn't appear to be mentioned in the Question Text.`;
                }
            }
            if (this.state.operation === 'encode') {
                if (questionText.indexOf('ENCOD') < 0 && questionText.indexOf('ENCRY') < 0) {
                    msg += `The Question Text doesn't appear to mention that the cipher needs to be encoded.`;
                } else if (this.isDecodeOperation(questionText)) {
                    msg += `The Question Text appears to mention that the cipher needs to be decoded, but this is an encode problem`;
                }
            } else if (!this.isDecodeOperation(questionText)) {
                msg += `The Question Text doesn't appear to mention that the cipher needs to be decrypted.`;
            }
        }
        const sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');

        this.setErrorMsg(msg, 'vq', sampleLink);
    }
    /**
     * This function attempts to place the crib in the plaintext and returns information about the placement.
     * It returns undefined if the crib can't be placed.
     * @returns Information about the crib placement, including the plaintext, ciphertext, position, and lengths of the crib and cipher.
     */
    public placeCrib(): ICribInfo {
        if (this.state.operation !== 'crypt') {
            return undefined;
        }
        const crib = this.minimizeString(this.state.crib);
        const strings = this.buildReplacementHomophonic(this.minimizeString(this.state.cipherString), 9999);
        if (strings.length !== 1) {
            return undefined;
        }
        if (crib.length < 1) {
            return undefined;
        }
        const pta = strings[0][this.ptIndex]
        const cta = strings[0][this.ctIndex]

        const plaintext = this.minimizeString(pta.join(''));
        const cribpos = plaintext.indexOf(crib);

        let backuppos = -1;
        let backuppti = -1;
        let cribi = 0;
        let cribstart = -1;
        let cribend = -1;
        let pti = 0;
        for (let i = 0; i <= pta.length - crib.length; i++) {
            if (pta[i] !== cta[i]) {

                if (pta[i] === crib[cribi]) {
                    if (cribi === 0) {
                        cribstart = i;
                    } else if (pta[i] === crib[0] && backuppos === -1) {
                        backuppos = i;
                        backuppti = pti;
                    }
                    cribi++;
                    if (cribi >= crib.length) {
                        cribend = i + 1;
                        break;
                    }
                } else {
                    // We didn't match, so we have to backup to the last character which matched the first character if any
                    cribi = 0;
                    cribstart = -1;
                    if (backuppos !== -1) {
                        i = backuppos - 1;
                        pti = backuppti;
                    }
                }
                pti++;
            }
        }

        if (cribstart < 0) {
            return undefined;
        }
        return {
            plaintext: pta.slice(cribstart, cribend).join(''), //plaintext.substring(cribpos, cribpos + crib.length),
            ciphertext: cta.slice(cribstart, cribend).join(' '), // strings[0][this.ctIndex].slice(cribpos, cribpos + crib.length).join(' '),
            position: cribpos,
            criblen: crib.length,
            cipherlen: plaintext.length,
        };
    }
    /**
     * This handles the Homophonic Cipher specific question options.
     * @param qOptions the array of options
     * @param langtext the language string (blank for English)
     * @param hinttext any hint text provided
     * @param fixedName name of the cipher
     * @param operationtext existing question text
     * @param operationtext2 additional question text for the specific cipher
     * @param cipherAorAn literally 'a' or 'an' for referring to a cipher type.
     */
    public addQuestionOptions(qOptions: string[], langtext: string, hinttext: string, fixedName: string, operationtext: string, operationtext2: string, cipherAorAn: string, warnlevel: string): boolean {

        if (this.state.operation != 'crypt') {
            let keyword = this.minimizeString(this.state.keyword);
            if (keyword !== '') {
                let hint = this.minimizeString(this.state.hint);
                if (warnlevel == "") {
                    if (hint === keyword || hint == '') {
                        operationtext2 = ` using a keyword of ${this.genMonoText(keyword)}`
                    } else {
                        let hinttext = ''
                        let hintsorted = hint.split("").sort((a, b) => keyword.indexOf(a) - keyword.indexOf(b));
                        if (hint.length === 1) {
                            hinttext = ` the ${this.getPositionText(keyword.indexOf(hint) + 1)} letter as ${this.genMonoText(hint)}`
                        } else if (hint.length == 2) {
                            hinttext = ` the ${this.getPositionText(keyword.indexOf(hintsorted[0]) + 1)} letter ${this.genMonoText(hintsorted[0])} and the ${this.getPositionText(keyword.indexOf(hintsorted[1]) + 1)} letter ${this.genMonoText(hintsorted[1])}`
                        } else {
                            hinttext = ` the `
                            for (let i = 0; i < hint.length - 1; i++) {
                                hinttext += `${this.getPositionText(keyword.indexOf(hintsorted[i]) + 1)} letter ${this.genMonoText(hintsorted[i])}, `
                            }
                            hinttext += `and the ${this.getPositionText(keyword.indexOf(hintsorted[hint.length - 1]) + 1)} letter ${this.genMonoText(hintsorted[hint.length - 1])}`
                        }
                        operationtext2 = ` using a keyword that has ${hinttext}`;
                    }
                }
                else {
                    if (hint == '') {
                        hint = keyword;
                    }
                    let hinttext = ''
                    let hintsorted = hint.split("").sort();
                    if (hint.length === 1) {
                        hinttext = ` the letter ${this.genMonoText(hint)}`
                    } else if (hint.length == 2) {
                        hinttext = ` the letters ${this.genMonoText(hintsorted[0])} and ${this.genMonoText(hintsorted[1])}`
                    } else {
                        hinttext = ` the letters `
                        for (let i = 0; i < hint.length - 1; i++) {
                            hinttext += `${this.genMonoText(hintsorted[i])}, `
                        }
                        hinttext += `and ${this.genMonoText(hintsorted[hint.length - 1])}`
                    }
                    operationtext2 = ` using a keyword that has ${hinttext} in it`;
                }
            }

        } else {
            const cribpos = this.placeCrib();
            hinttext = ` ${this.getCribPlacement(cribpos)}`;
        }
        return super.addQuestionOptions(qOptions, langtext, hinttext, fixedName, operationtext, operationtext2, cipherAorAn, warnlevel);
    }
    /**
     * Update the GUI with a list of suggestions for questions
     * @param qcount Number of questions to find
     * @param action Callback function when a question is found
     * @returns Total number of questions found
     */
    public searchForQuestions(qcount: number, action: (count: number, question: string, warnlevel: string) => boolean, warnlevel: string): number {
        return super.searchForQuestions((qcount + 1) / 2, action, "") + super.searchForQuestions(qcount / 2, action, "warning");
    }
    /**
     * This function identifies the crib placement for Affine cryptanalysis and returns question text describing the placement.
     * @param cribpos structure containing crib placement info from selected crib letters
     * @param ptstring the plaintext string
     * @return string describing what the selected cipher characters map to in plaintext.
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
                to be ${this.genMonoText(cribpos.plaintext)}.`;
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
        if (this.state.cipherType === ICipherType.Homophonic) {
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

    public setOperation(operation: IOperationType): boolean {
        const changed = super.setOperation(operation)
        if (this.state.operation === 'decode') {
            this.guidanceURL = 'TestGuidance.html#Homophonic_Decode';
        } else {
            this.guidanceURL = 'TestGuidance.html#Homophonic';
        }
        return changed
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
        this.setKeyword(this.state.keyword);
        this.setHint(this.state.hint);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.showLengthStatistics();
        if (this.state.operation !== 'crypt') {
            $('.crib').hide();
            $('.hint').show();
        } else {
            $('.crib').show();
            $('.hint').hide();
        }
        JTRadioButtonSet('ciphertype', this.state.cipherType);
        JTRadioButtonSet('operation', this.state.operation);
        $('#blocksize').val(this.state.blocksize);
        $('#crib').val(this.state.crib);
        $('#hint').val(this.state.hint);
        super.updateOutput();
        this.checkDuplicateKeys();
        this.attachHandlers();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);
        result.append(this.createSuggestKeyDlg('Suggest Key'))

        const radiobuttons = [
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
        const suggestCribButton = $('<a/>', { type: "button", class: "button primary tight", id: "suggestcrib" }).text("Suggest Crib")

        result.append(
            JTFLabeledInput(
                'Crib Text',
                'text',
                'crib',
                this.state.crib,
                'crib small-12 medium-12 large-12',
                suggestCribButton
            )
        );

        const suggestHintButton = $('<a/>', { type: "button", class: "button primary tight", id: "suggesthint" }).text("Suggest Hint")
        result.append(
            JTFLabeledInput(
                'Provided Keyword Letters',
                'text',
                'hint',
                this.state.hint,
                'hint small-12 medium-12 large-12',
                suggestHintButton
            )
        );

        const inputbox = $('<div/>', { class: 'grid-x grid-margin-x blocksize' });
        inputbox.append(JTFIncButton('Block Size', 'blocksize', this.state.blocksize, ''));
        result.append(inputbox);

        return result;
    }
    /** 
     * Set the block size for the homophonic encoding.  This controls how many characters are in each chunk for encoding.
     * A block size of 0 means that the encoding will respect the spaces in the original message and not split them up.
     * @param blocksize The block size to use for encoding
     * @return boolean indicating whether the block size was changed from the previous value
     */
    public setBlocksize(blocksize: number): boolean {
        let changed = false;
        if (this.state.blocksize !== blocksize) {
            this.state.blocksize = blocksize;
            changed = true;
        }
        return changed;
    }
    /**
     * Updates the stored state cipher string
     * This will change the random slot assigned to many characters, but we want to preserve the random slot
     * assignments for the crib, but everything else can change.  Note that it is possible that they may change
     * the crib (by deleting a character that was in the crib or putting the crib text earlier in the message),
     * in which case we will lose the random slot assignment for those characters.
     * 
     * @param cipherString Cipher string to set
     */
    public setCipherString(cipherString: string): boolean {
        let changed = false;
        if (this.state.cipherString !== cipherString) {
            changed = true;
            let cribpos = this.placeCrib();
            let saveSlots: number[] = []
            // Save the current random slot choices for the crib (if any) so that we can keep them the same after resetting the alphabet
            if (cribpos !== undefined) {
                saveSlots = this.state.randomSlot.slice(cribpos.position, cribpos.position + cribpos.criblen);
            }
            super.setCipherString(cipherString);
            this.updateRandom();
            // Restore saved crib random-slot assignments
            if (cribpos !== undefined) {
                cribpos = this.placeCrib();
                if (cribpos !== undefined) {
                    this.state.randomSlot.splice(cribpos.position, cribpos.criblen, ...saveSlots);
                }
            }
        }
        return changed;
    }
    /**
     * Render a character with an annotation to indicate that it is important for the crib placement and key deduction steps in the solution.  This is used in the solution to show the important characters in the crib placement and key deduction steps.
     * @param val Character to annotate
     * @returns HTML annotated character for display in the solution to show the important characters in the crib placement and key deduction steps.
     */
    public fixedCt100(val: string): string {
        if (val === '100') {
            return '[' + this.fixedCt('1') + ']' + this.fixedCt('00');
        }
        return this.fixedCt(val);
    }
    /**
     * This function builds the homophonic replacements for a given message based on the current settings.
     * Passing in a value of 9999 for the max encode width will ensure that it doesn't split the message into multiple lines for encoding.
     * @param msg The message to encode
     * @param maxEncodeWidth The maximum width of each chunk for encoding
     * @return An array of pairs of arrays, where each pair corresponds to a chunk of the message. The first element of the pair is the array of ciphertext characters, and the second element is the array of plaintext characters.
     */
    public buildReplacementHomophonic(msg: string, maxEncodeWidth: number): Array<[string[], string[]]> {
        const encoded = this.chunk(msg, this.state.blocksize);
        const result: Array<[string[], string[]]> = [];
        const charset = this.getSourceCharset();
        let message: string[] = [];
        let cipher: string[] = [];
        const msgLength = encoded.length;
        let lastSplit = -1;
        let ptindex = 0;

        for (let i = 0; i < msgLength; i++) {
            const messageChar = encoded[i].toUpperCase();
            const m = charset.indexOf(messageChar);
            if (m >= 0) {
                message.push(messageChar);
                let randomSlot = this.state.randomSlot[ptindex]
                if (randomSlot === undefined) {
                    randomSlot = Math.floor(Math.random() * 4);
                }
                const ct = this.encodeHomophonic(messageChar, randomSlot);
                cipher.push(ct);
                ptindex++;
            } else {
                message.push(messageChar);
                cipher.push(messageChar);
                lastSplit = cipher.length;
                continue;
            }
            if (message.length >= maxEncodeWidth) {
                if (lastSplit === -1) {
                    result.push([cipher, message]);
                    message = [];
                    cipher = [];
                    lastSplit = -1;
                } else {
                    const plainPart = message.slice(0, lastSplit);
                    const cipherPart = cipher.slice(0, lastSplit);

                    message = message.slice(lastSplit);
                    cipher = cipher.slice(lastSplit);

                    result.push([cipherPart, plainPart]);
                }
            }
        }
        if (message.length > 0) {
            result.push([cipher, message]);
        }
        return result;
    }

    public buildHomophonic(msg: string, key: string): JQuery<HTMLElement> {
        const result = $('<div/>');
        const { width, extraclass } = this.getEncodeWidth(ITestType.None);
        this.updateMapping();
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

        const strings = this.buildReplacementHomophonic(msg, width);
        const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
        for (const stringset of strings) {
            const rowpt = table.addBodyRow();
            const rowct = table.addBodyRow();
            const rowblank = table.addBodyRow();
            for (let i = 0; i < stringset[0].length; i++) {
                const pt = stringset[dest][i];
                let ct = stringset[source][i];
                if (ct === '100') {
                    ct = '00'
                }
                rowpt.add(pt);

                rowct.add({
                    settings: { class: 'o v' },
                    content: ct,
                });
                rowblank.add(' ');
            }
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Loads up the values for the current cipher and generates the output for the user to see
     */
    public async load(): Promise<void> {
        /* If they want different sizes, rebuild the string in the chunk size */
        const encoded = this.chunk(this.cleanString(this.state.cipherString), this.state.blocksize);

        const key = this.minimizeString(this.state.keyword);
        this.clearErrors();
        this.validateQuestion();
        let res = this.buildHomophonic(encoded, key);
        $('#answer')
            .empty()
            .append(res);
        res = this.genSolution(ITestType.None);
        $('#sol')
            .empty()
            .append('<hr/>')
            .append(res);

        this.attachHandlers();
    }

    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        const { width, extraclass } = this.getEncodeWidth(ITestType.None);
        const strings = this.buildReplacementHomophonic(this.state.cipherString, width);
        let dest = 1;
        if (this.state.operation === 'encode') {
            dest = 0;
        }

        let solution: string[] = undefined;
        for (const strset of strings) {
            if (solution === undefined) {
                solution = []
            }
            //   solution.push(...strset[dest].split(''));
        }
        return this.calculateScore(solution, answer, this.state.points);
    }
    /**
     * Get the encoding information for a test
     * @param testType Type of test to generate for
     * @returns Width and extraclass to use for the encode table based on the type of test.
     *          For Division A, we less letters and a larger font for each line.
     */
    public getEncodeWidth(testType: ITestType): { width: number; extraclass: string } {
        if (testType == ITestType.aregional || testType == ITestType.astate) {
            return { width: this.maxencodeWidthDivA, extraclass: ' atest' };
        }
        return { width: this.maxencodeWidth, extraclass: '' };

    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        const { width, extraclass } = this.getEncodeWidth(testType);

        const strings = this.buildReplacementHomophonic(this.state.cipherString, width);
        let keyword = '';
        for (const c of this.state.keyword.toUpperCase()) {
            if (this.isValidChar(c)) {
                keyword += c;
            }
        }

        const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
        for (const strset of strings) {
            let source = 1;
            let dest = 0;
            if (this.state.operation === 'encode') {
                source = 0;
                dest = 1;
            }
            const rowct = table.addBodyRow();
            const rowpt = table.addBodyRow();
            const rowblank = table.addBodyRow();
            for (let i = 0; i < strset[dest].length; i++) {
                let ct = strset[dest][i];
                if (ct === '100') {
                    ct = '00'
                }
                const pt = strset[source][i];
                rowct.add({
                    settings: { class: 'q' },
                    content: ct,
                });


                if (this.isValidChar(pt)) {
                    rowpt.add({
                        settings: { class: 'a' },
                        content: pt,
                    });
                } else {
                    rowpt.add(' ');
                }
                rowblank.add(' ');
            }
        }
        result.append(table.generate());

        return result;
    }
    /**
     * Map a character to the row lookup.  For Homophonic this is a pair of characters
     * @param keychar Keyword character
     * @returns Printable row title
     */
    public getRowKey(keychar: string): string {
        if (this.state.cipherType === ICipherType.Homophonic) {
            const charset = this.getCharset();
            const keyindex = charset.indexOf(keychar.toUpperCase());
            let keyset = Math.floor(keyindex / 2) * 2;
            return charset[keyset] + ',' + charset[keyset + 1];
        }
        return keychar
    }
    /**
     * Show a single row of the Homophonic table for a given keyword character.  This is used in the solution to show how to look up the cipher character based on the key and message character.
     * @param keychar 
     * @returns HTML rendered table
     */
    public showShortTable(keychar: string): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        const table = new JTTable({ class: 'shrink cell unstriped instlook instvig' });

        const charset = this.getCharset();
        const keyindex = charset.indexOf(keychar.toUpperCase());
        let headRow = table.addHeaderRow()
        headRow.add({
            celltype: 'td',
            content: ' ',
        });
        let splitRow = undefined
        if (keyindex > 1) {
            splitRow = table.addBodyRow()
            splitRow.add({
                celltype: 'th',
                content: '⋮',
            });
        }
        let lookupRow = table.addBodyRow()
        let colcount = (this.state.cipherType === ICipherType.Homophonic) ? charset.length / 2 : charset.length
        let lookupKey = this.getRowKey(keychar.toUpperCase());

        lookupRow.add({
            celltype: 'th',
            content: lookupKey,
        });

        for (let i = 0; i < colcount; i++) {
            const messageChar = charset.substring(i, i + 1);
            const cipherChar = this.encodeHomophonic(messageChar);
            headRow.add(messageChar);
            if (splitRow !== undefined) {
                splitRow.add('⋮');
            }
            lookupRow.add(cipherChar);
        }
        result.append(table.generate());
        return result;
    }
    public mapPattern(word: string): string {
        if (this.state.cipherType !== ICipherType.Homophonic) {
            return word
        }
        let result = '';
        const charset = this.getCharset();
        for (const c of word) {
            const keyindex = charset.indexOf(c.toUpperCase());
            let keyset = Math.floor(keyindex / 2) * 2;
            result += charset[keyset]
        }
        return result;
    }
    public allEquivalent(words: string[]): boolean {
        if (words.length < 2) {
            return true;
        }
        const pattern = this.mapPattern(words[0]);
        for (const word of words) {
            if (this.mapPattern(word) !== pattern) {
                return false;
            }
        }
        return true;
    }
    /**
    * Find the most likely unfinished words to check.
    *
    * An unfinished word is a cipher word that contains at least one unresolved
    * keyword letter. The result is sorted so the easiest/most useful words are
    * checked first.
    *
    * @param solvingdata Current solving state
    * @returns Array of unfinished words ordered by likelihood of helping solve the cipher
    */
    public findUnfinishedWords(solvingdata: ISolverData): ISolverWord[] {
        const unfinishedWords: ISolverWord[] = [];
        const wordlengths: number[] = []

        // Build the list of cipher word lengths from the original ciphertext.
        // This lets us recover word boundaries even though the replacement arrays
        // only contain cipher/plaintext symbols.
        let wordlen = 0
        for (let c of this.state.cipherString.toUpperCase()) {
            if (this.isValidChar(c)) {
                wordlen++
            } else {
                if (wordlen) {
                    wordlengths.push(wordlen)
                    wordlen = 0;
                }
            }
        }

        let wordIndex = 0;
        wordlengths.push(wordlen)


        let curWord: ISolverWord | undefined = undefined;
        let cipherpos = 0;

        // Finish the current word. Only keep useful unfinished words:
        // - at least one missing keyword letter
        // - longer than 3 letters
        // - At least 3 visible letters
        const finishWord = (): void => {
            if (curWord !== undefined && curWord.missing > 0 && curWord.length > 3 && (curWord.length - curWord.missing) >= 3) {
                unfinishedWords.push(curWord);
            }
            curWord = undefined;
        };

        for (const sets of solvingdata.replacements) {
            const ctData = sets[this.ctIndex];
            const ptData = sets[this.ptIndex];

            // Walk through the replacement data and group consecutive cipher letters into words.
            for (let i = 0; i < ctData.length; i++) {
                const ct = ctData[i];
                const pt = ptData[i];

                // Matching ct/pt means this entry is punctuation, spacing, or another non-cipher symbol.
                if (ct === pt) {
                    continue;
                }

                cipherpos++;

                // Start a new word when we encounter the first cipher letter after a word boundary
                if (curWord === undefined) {
                    curWord = {
                        pt: [],
                        ct: [],
                        position: cipherpos, // 1-based cipher-letter position
                        length: 0,
                        missing: 0,
                        unique: 0,
                        keywordCount: [0, 0, 0, 0],
                        pattern: "",
                        candidates: []
                    };
                }

                const keywordPos = this.getKeywordPos(ct);

                curWord.pt.push(pt);
                curWord.ct.push(ct);
                curWord.length++;

                // Count letters whose keyword slot has not been solved yet.
                if (keywordPos >= 0 && keywordPos < curWord.keywordCount.length) {
                    if (solvingdata.keyword[keywordPos] === ' ') {
                        curWord.missing++;
                        curWord.keywordCount[keywordPos]++;
                        if (curWord.keywordCount[keywordPos] === 1) {
                            curWord.unique++;
                        }
                        curWord.pattern += '.'
                    } else {
                        curWord.pattern += pt
                    }
                }
                // End the word once we have consumed its known cipher-text length.
                if (wordIndex < wordlengths.length && curWord.length === wordlengths[wordIndex]) {
                    wordIndex++;
                    finishWord();
                }
            }
        }
        // Flush the final word if the data ended in the middle of one.
        finishWord();

        // Prefer:
        // 1. fewer missing letters
        // 2. longer words
        // 3. fewer unique missing keyword slots
        unfinishedWords.sort((a, b) => {
            if (a.missing !== b.missing) {
                return a.missing - b.missing;
            }

            if (a.length !== b.length) {
                return b.length - a.length;
            }

            return a.unique - b.unique;
        });

        return unfinishedWords;
    }

    public matchWords(entry: ISolverWord): string[] {
        const matchedWords: string[] = []

        let pat = ""
        let patPos = entry.pattern.indexOf('.')
        if (patPos < 0) {
            pat = this.makeUniquePattern(entry.pattern, 1)
        } else {
            pat = this.makeUniquePattern(entry.pattern.slice(0, patPos), 1) + this.repeatStr(".", entry.pattern.length - patPos)
        }
        const re = new RegExp(`^${pat.toUpperCase()}$`);
        const reWord = new RegExp(`^${entry.pattern.toUpperCase()}$`)


        const freq = this.Frequent[this.state.curlang];

        for (const [patKey, wordEntries] of Object.entries(freq)) {
            // First filter which pattern buckets are worth checking.
            if (!re.test(patKey.toUpperCase())) {
                continue;
            }

            for (const wordEntry of wordEntries as string[][]) {
                const word = wordEntry[0];

                // Then filter actual words inside the matching bucket.
                if (reWord.test(word.toUpperCase())) {
                    matchedWords.push(wordEntry[0]);

                    // Stop early if there are too many possible matches.
                    if (matchedWords.length > 9) {
                        break;
                    }
                }
            }

            if (matchedWords.length > 5) {
                break;
            }
        }
        return matchedWords
    }

    public findPossibleKeywords(result: JQuery<HTMLElement>, solvingData: ISolverData) {
        // We need to build a regex from the keyword that we have found
        let pattern = '^'
        let tomatch = ''
        for (const c of solvingData.keyword) {
            if (c === ' ') {
                pattern += '.'
                tomatch += '?'
            } else if (c === 'I') {
                pattern += '[IJ]'
                tomatch += c
            } else {
                pattern += c
                tomatch += c
            }
        }
        const found = []
        pattern += '$'
        const re = new RegExp(pattern.toUpperCase());

        let pat = this.makeUniquePattern("ABCD", 1);
        if (typeof this.Frequent[this.state.curlang][pat] !== "undefined") {
            let matches = this.Frequent[this.state.curlang][pat];
            for (const entry of matches) {
                if (re.test(entry[0])) {
                    found.push(entry[0])
                    if (found.length >= 10) {
                        break;
                    }
                }
            }
        }
        if (found.length >= 10) {
            result.append($('<p/>').html(`Since there are so many common words which match ${this.fixedKt(tomatch)} we can't make any reasonable
                guesses at this time for the keyword, so we will have to use other strategies `))
            found.length = 0
        } else if (found.length === 1) {
            result.append($("<p/>").html(`There is exactly one word "${this.fixedKt(found[0])}" which matches the keyword letters "${this.fixedKt(tomatch)}" we found so far, so we will run with it.`))
        } else if (found.length === 0) {
            result.append($("<p/>").html(`We were unable to find any words which match the keyword letters "${this.fixedKt(tomatch)}" we found so far,
                 so either we have made a mistake or the keyword is not a common English word.`))
        } else if (found.length <= 3) {
            result.append($("<p/>").html(`There are ${found.length} words (${this.fixedKtList(found)}) which match the keyword letters "${this.fixedKt(tomatch)}" so we can quickly try them to see if it gives us the answer.`))
        } else {
            result.append($('<p/>').html(`Since there ${found.length} words which match ${this.fixedKt(tomatch)} we can't make any reasonable
                guesses at this time for the keyword, so we will have to use other strategies `))
            found.length = 0
        }
        return found;
    }

    /**
     * 
     * @param result Location to put any output
     * @param solvingdata Data structure containing the current state of the solver including the keyword and solved letters. This is used for showing the partial solution in the table as you solve each letter of the key for the cipher.
     * @param bestCandidate 
     * @param word 
     * @returns Successful match
     */
    public tryCandidateWord(result: JQuery<HTMLElement>, solvingData: ISolverData, candidate: ISolverWord, word: string): ISolverData | undefined {
        const localData: ISolverData = cloneObject(solvingData) as ISolverData;
        let found = true
        for (let i = 0; i < candidate.ct.length; i++) {
            const ct = candidate.ct[i]
            const pt = word[i]
            if (pt !== candidate.pt[i]) {
                found = false;
            }
            const slot = this.getKeywordPos(ct)
            if (localData.keyword[slot] === ' ') {
                localData.limitUpdates[slot] = 5;
                const kwIndex = this.getKeywordIndex(ct, pt)
                const kwslotchar = localData.charset[kwIndex]
                localData.keyword[slot] = kwslotchar
                if (parseInt(ct) === (slot * 25) + 1) {
                    result.append($('<p/>').html(`Using the word ${this.fixedPt(word)} to fill in the slot has ${this.fixedPt(pt)} mapping to the ciphertext ${this.fixedCt100(ct)} 
                we know that it is in the ${this.getPositionText(slot + 1)} position because it is in the range ${slot * 25 + 1}-${(slot + 1) * 25}.
                Since it is the the start of the range ${slot * 25 + 1} we know that it is the keyword letter ${this.fixedCt(kwslotchar)}.
                This gives us a mapping for that letter as:`));
                } else {
                    result.append($('<p/>').html(`Using the word ${this.fixedPt(word)} to fill in the slot has ${this.fixedPt(pt)} mapping to the ciphertext ${this.fixedCt100(ct)} 
                we know that it is in the ${this.getPositionText(slot + 1)} position because it is in the range ${slot * 25 + 1}-${(slot + 1) * 25}.
                Counting backward in the alphabet from ${this.fixedCt(ct)} to the start of the range ${slot * 25 + 1} we find that the keyword letter is ${this.fixedPt(kwslotchar)}.
                This gives us a mapping for that letter as:`));
                }
                this.updateSolvingMap(localData, slot, kwIndex);
                this.showSlotMapping(result, localData, slot);
            }
        }
        result.append($('<p/>').html('Using that updated table, we try to fill in a few characters to see if it makes sense.'))
        result.append(this.showHomophonicDecodeStatus(localData));

        if (found) {
            return localData
        }
        return undefined;
    }
    /**
     * Generate HTML content showing the step by step solution based on the crib placement and key deduction steps, including the imHomophonicnt characters in the crib placement and key deduction steps and how to orient the found key characters based on the crib placement.
     * @param solvingData Structure containing the current state of the solution including known letters and keyword deductions based on the crib placement.  This is used to show the current state of the solution based on the crib placement and key deduction steps.
     * @returns HTML content
     */
    public async genCryptanalysisSolution(solvingData: ISolverData, result: JQuery<HTMLElement>) {
        const cribpos = this.placeCrib();

        if (cribpos === undefined) {
            result.append($('<h3/>').text('Unable to place the crib'));
            return result;
        }
        solvingData.known = new Array<boolean>(cribpos.cipherlen);
        solvingData.known.fill(false);
        solvingData.keyword = [' ', ' ', ' ', ' ']

        for (let pos = cribpos.position; pos < cribpos.position + cribpos.criblen; pos++) {
            solvingData.known[pos] = true;
        }

        if (await this.restartCheck()) { return }

        this.showStep(result, "Step 1: Place the crib and determine the known letters of the key");

        result.append($('<p/>').text(`Using the crib information, fill in the known plaintext letters.
            At the same time, we also can note which letter in the keyword corresponds to each ciphertext value (1-25 is the first letter, 26-50 is the second, etc.). 
            As we determine a plaintext letter, we can also determine the corresponding key letter and fill in all the matching entries.`));
        result.append(this.showHomophonicDecodeStatus(solvingData));

        // Figure out how many letters we know from the crib and fill in the corresponding key letters based on the homophonic table.
        if (this.analyzeCribChars(result, cribpos, solvingData)) {
            result.append($('<p/>').text(`With that new information, we can fill in all the corresponding entries for those keyword positions giving us:`));
            result.append(this.showHomophonicDecodeStatus(solvingData));
        }
        let maxMatches = 1
        let tryFindKeywords = true
        let tryUnfinishedWords = true
        let tried: number[] = []
        for (let loop = 0; loop < 4; loop++) {
            if (await this.restartCheck()) { return }

            // Now we loop our strategy until we have it solved.  There are multiple prongs of attack here
            // 1) See if we can figure out the keyword since we know the positions of the letters in the keyword.
            // 2) If we don't know the keyword, look for the longest word that we are only missing one or two characters and see if we can guess it. 
            // 3) If that doesn't produce a result and there are only a couple of possible keywords, just try them!
            if (tryFindKeywords) {
                this.showStep(result, "Step 2a: See if we have enough information to determine the keyword");

                const found = this.findPossibleKeywords(result, solvingData)
                if (found.length === 1) {
                    // We have the keyword, so fill it in and call it a day
                    break;
                }
                tryFindKeywords = false
                tryUnfinishedWords = true
            }

            if (await this.restartCheck()) { return }

            const unfinishedCandidates = this.findUnfinishedWords(solvingData);

            if (await this.restartCheck()) { return }

            let bestCandidate: ISolverWord = undefined
            for (const entry of unfinishedCandidates) {
                // The first time we are here, we only go for those that have a single missing letter
                if (loop === 0 && entry.missing > 1) {
                    continue;
                }
                if (tried.indexOf(entry.position) !== -1) {
                    continue;
                }
                let choice = this.matchWords(entry)
                if (choice.length > 0 && choice.length <= maxMatches) {
                    if (bestCandidate === undefined || choice.length < bestCandidate.candidates.length) {
                        bestCandidate = entry;
                        entry.candidates = choice
                    }
                }
                // result.append($('<p/>').html(`DEBUG: Unfinished word: ${entry.pt} against ${entry.ct} at ${entry.position} Pattern: ${entry.pattern} Missing: ${entry.missing} with [${entry.keywordCount.join(',')}] matched ${choice.length} words: [${choice.join(", ")}]`))
            }
            if (bestCandidate !== undefined) {
                this.showStep(result, "Step 2b: See if we see any obvious missing letters we can fill in the plaintext");
                if (bestCandidate.candidates.length === 1) {
                    result.append($('<p/>').html(`We see a potential word with ${this.fixedPt(bestCandidate.pattern.replaceAll('.', '?'))} which matches one word: ${this.fixedPtList(bestCandidate.candidates)} which we will try to see if it works out`))
                } else {
                    result.append($('<p/>').html(`We see a potential word with ${this.fixedPt(bestCandidate.pattern.replaceAll('.', '?'))} which matches ${bestCandidate.candidates.length} words: [${this.fixedPtList(bestCandidate.candidates)}].
                 We will try them one at a time to see which works out the best`))
                }
                let successful = false
                tried.push(bestCandidate.position)
                for (const word of bestCandidate.candidates) {
                    const newData = this.tryCandidateWord(result, solvingData, bestCandidate, word)
                    if (newData !== undefined) {
                        solvingData = newData
                        tryFindKeywords = true;
                        result.append($('<p/>').html(`That looks promising, so we will continue with it.`))
                        successful = true
                        break;
                    }
                }
                if (!successful) {
                    result.append($('<p/>').html(`Unfortunately we couldn't find a match so we will have to look for something else.`))
                }
            } else if (tryUnfinishedWords) {
                this.showStep(result, "Step 2b: See if we see any obvious missing letters we can fill in the plaintext");
                result.append($('<p/>').html(`Unfortunately we don't see anything obvious right now so we will look a bit harder.`))

            }
            tryUnfinishedWords = false
            maxMatches += 2;
        }
        const inComplete = solvingData.keyword.some(s => s === ' ');

        if (inComplete) {
            this.showStep(result, $('<span>').html(`Incomplete: We haven't found all of the letters of the keyword, but have a partial idea that it is ${this.fixedKt(solvingData.keyword.join(''))}`));
            result.append($('<p/>').html(`We will have to find some other strategy to determine the remaining letters`))
        } else {
            this.showStep(result, $('<span>').html(`Success: We have found all of the letters of the keyword to see that it is ${this.fixedKt(solvingData.keyword.join(''))}`));
            result.append($('<p/>').html(`We can us this to decode any remaining letters`))
        }

        result.append(this.showHomophonicDecodeStatus(solvingData));
        return result;
    }
    public analyzeCribChars(result: JQuery<HTMLElement>, cribpos: ICribInfo, solvingData: ISolverData): boolean {
        let changed = false
        const ctvals = cribpos.ciphertext.split(' ');
        for (let pos = 0; pos < cribpos.criblen; pos++) {
            const ct = ctvals[pos];
            const pt = cribpos.plaintext[pos];
            // Figure out which spot this one is.
            const slot = this.getKeywordPos(ct);
            if (solvingData.keyword[slot] === ' ') {
                changed = true
                // We have a letter in a slot we haven't filled in yet, let's fill it in based on what we were told
                const kwIndex = this.getKeywordIndex(ct, pt);
                if (parseInt(ct) === (slot * 25) + 1) {
                    result.append($('<p/>').html(`Based on the crib character ${this.fixedPt(pt)} mapping to the ciphertext ${this.fixedCt100(ct)} 
                we know that it is in the ${this.getPositionText(slot + 1)} position because it is in the range ${slot * 25 + 1}-${(slot + 1) * 25}.
                Since ${this.fixedCt(ct)} is the start of the range ${slot * 25 + 1} it is the keyword letter ${this.fixedKt(solvingData.charset[kwIndex])}
                This gives us a mapping for that letter as:`));
                } else {
                    result.append($('<p/>').html(`Based on the crib character ${this.fixedPt(pt)} mapping to the ciphertext ${this.fixedCt100(ct)} 
                we know that it is in the ${this.getPositionText(slot + 1)} position because it is in the range ${slot * 25 + 1}-${(slot + 1) * 25}.
                Counting backward in the alphabet from ${this.fixedCt(ct)} to the start of the range ${slot * 25 + 1} we find that the keyword letter is ${this.fixedKt(solvingData.charset[kwIndex])}
                This gives us a mapping for that letter as:`));
                }

                this.updateSolvingMap(solvingData, slot, kwIndex);
                this.showSlotMapping(result, solvingData, slot);
            }
        }
        return changed
    }

    public showSlotMapping(result: JQuery<HTMLElement>, solvingData: ISolverData, slot: number) {
        const table = new JTTable({ class: `ansblock shrink cell unstriped` });
        const ctRow = table.addHeaderRow();
        const ptRow = table.addBodyRow();
        for (let i = slot * solvingData.charset.length; i < (slot + 1) * solvingData.charset.length; i++) {
            const ct = String(i + 1);
            ctRow.add(ct);
            ptRow.add(solvingData.reverseHomophonicTable[ct]);
        }
        result.append(table.generate());
    }

    public updateSolvingMap(solvingData: ISolverData, slot: number, kwIndex: number) {
        let charcount = solvingData.charset.length
        solvingData.keyword[slot] = solvingData.charset[kwIndex];
        for (let i = slot * charcount; i < (slot + 1) * charcount; i++) {
            solvingData.reverseHomophonicTable[String(i + 1)] = solvingData.charset[(kwIndex + i) % charcount]
        }

    }
    /**
     * Adds a set of answer rows to a table.
     * @param table Table to add the rows to
     * @param overline specifies answer characters (typically from a vigenere or running key)
     *                 that someone would use to compute the answer.  undefined indicates not to use it
     * @param cipherline the line that they are being asked to encode/decode
     * @param answerline the answer (if any).  undefined to leave it blank
     */
    public addAnnotatedCipherTableRows(
        table: JTTable,
        overline: string[],
        cipherline: string[],
        answerline: string[],
    ): void {
        let rowover;
        if (overline !== undefined) {
            rowover = table.addBodyRow();
        }
        const rowcipher = table.addBodyRow();
        const rowanswer = table.addBodyRow();
        // Blank rows aren't on the tiny answer key
        const rowblank = table.addBodyRow({ class: "notiny" });

        for (let i = 0; i < cipherline.length; i++) {
            const c = cipherline[i];
            let aclass = 'e';
            let a = ' ';
            if (answerline !== undefined) {
                a = answerline[i];
                aclass = 'a';
            }
            if (overline !== undefined) {
                if (this.isValidChar(a)) {
                    rowover.add({
                        settings: { class: 'o' },
                        content: overline[i],
                    });
                } else {
                    rowover.add(overline[i]);
                }
            }
            if (this.isValidChar(a)) {
                rowcipher.add({
                    settings: { class: 'q' },
                    content: c,
                });
                rowanswer.add({
                    settings: { class: aclass },
                    content: a,
                });
            } else {
                if (answerline === undefined) {
                    a = c;
                }
                rowcipher.add(c);
                rowanswer.add(a);
            }
            rowblank.add('');
        }
        return;
    }

    /**
     * This function generates a table showing the current decode status of the cipher with the solved letters filled in and the unsolved letters blanked out. 
     * This is used for showing the partial solution as you solve each letter of the key for the cipher.
     * @param solvingdata Data structure containing the current state of the solver including the keyword and solved letters. This is used for showing the partial solution in the table as you solve each letter of the key for the cipher.
     * @returns Formatted table showing the current decode status of the cipher with the solved letters filled in and the unsolved letters blanked out.
     */
    public showHomophonicDecodeStatus(solvingdata: ISolverData): JQuery<HTMLElement> {
        solvingdata.valid = true;
        const extra = solvingdata.extraclass ? ` ${solvingdata.extraclass.trim()}` : '';
        const table = new JTTable({ class: `ansblock shrink cell unstriped${extra}` });
        const source = this.state.operation === 'encode' ? this.ptIndex : this.ctIndex;

        let cipherpos = 0;
        let sufficient = false
        // Make sure we have something in the keyword to avoid errors, we'll just show blanks in the table if we don't have a key
        for (const strset of solvingdata.replacements) {
            const src = strset[source] ?? [];
            let keyline = []
            let solution = [];
            let ctline = [];
            for (let cpos = 0; cpos < src.length; cpos++) {
                const c = src[cpos];
                const pt = strset[this.ptIndex][cpos] ?? '';
                const ct = strset[this.ctIndex][cpos] ?? '';

                if (this.isValidChar(pt)) {
                    const keyc = this.getKeywordPos(ct);
                    const isKnown = (solvingdata.known[cipherpos] || (solvingdata.reverseHomophonicTable[ct] !== undefined)) ?? false;

                    cipherpos++
                    keyline.push(keyc + 1);
                    // We can't actually use the computed solution because we may be testing a bad key
                    if (isKnown) {
                        let sol = this.decodeHomophonic(c);
                        solution.push(sol ?? ' ');
                    } else {
                        solution.push(' ');
                    }
                    if (solvingdata.limitUpdates[keyc] > 0) {
                        solvingdata.limitUpdates[keyc]--;
                        if (solvingdata.limitUpdates[keyc] === 0) {
                            sufficient = true;
                            break;
                        }
                    }
                } else {
                    keyline.push(' ');
                    solution.push(' ');
                }
                if (c === '100') {
                    ctline.push('00')
                }
                else {
                    ctline.push(c)
                }
            }
            this.addAnnotatedCipherTableRows(table, keyline, ctline, solution);
            if (sufficient) {
                break;
            }
        }
        return table.generate();
    }
    /**
     * For the homophonic cipher, the keyword position is determined by the ciphertext character.
     * Each letter in the ciphertext corresponds to a letter in the key based on its position in the alphabet (1-25 for the first letter, 26-50 for the second, etc.).
     * This function maps a ciphertext character to the corresponding letter(s) in the key based on this mapping.
     */
    public getKeywordPos(ct: string) {
        return Math.floor((parseInt(ct) - 1) / 25);
    }

    public getKeywordIndex(ct: string, pt: string): number {
        const keypos = parseInt(ct) % 25;
        const charset = this.getSourceCharset();
        const ptindex = charset.indexOf(pt.toUpperCase());
        const keyindex = (charset.length + 1 + ptindex - keypos) % charset.length;
        return keyindex;
    }
    /**
     * Generate a keyword for mapping the solved letters to show the current decode status of the cipher with the solved letters filled in and the unsolved letters replaced with a question mark.
     * @param solvingdata Data structure containing the current state of the solver including the keyword and solved letters. This is used for showing the partial solution in the table as you solve each letter of the key for the cipher.
     * @param keyword Known keyword
     * @param solved Solved letters
     */
    public setMappedKeyword(solvingdata: ISolverData, keyword: string, solved: string): void {
        solvingdata.keyword = [];
        solvingdata.known = [];

        const source = this.state.operation === 'encode' ? 1 : 0;
        const solvedSet = new Set(solved.split(''));
        let keypos = 0;
        for (const strset of solvingdata.replacements) {
            const src = strset[source] ?? '';
            for (const c of src) {
                if (this.isValidChar(c)) {
                    const keyc = keyword[keypos % keyword.length];
                    solvingdata.keyword.push(keyc);
                    solvingdata.known.push(solvedSet.has(keyc));
                    keypos++;
                }
            }
        }
    }
    /**
     * 
     * @param solvingdata Data structure containing the current state of the solver including the keyword and solved letters. This is used for showing the partial solution in the table as you solve each letter of the key for the cipher.
     * @param result Location to put any output
     * @returns 
     */
    public async genDecodeSolution(solvingData: ISolverData, result: JQuery<HTMLElement>) {

        if (this.state.keyword === '') {
            result.append($('<h3/>').text('You must select a keyword.'));
            return result;
        }
        result.append($('<p/>').text(`The Homophonic cipher is a reciprocal cipher, so the same steps for encoding can be used for decoding.`));
        result.append($('<p/>').text(`To solve, write the keyword ${this.state.keyword} repeatedly under the ciphertext, then use the Homophonic cipher table to decode each letter based on the corresponding letter in the key.`));

        this.setMappedKeyword(solvingData, this.state.keyword, this.state.keyword)

        result.append(this.showHomophonicDecodeStatus(solvingData));
        let remaining = this.undupeString(this.state.keyword).split('')
        let firstletter = remaining.shift()
        let discovered = firstletter
        result.append($('<h4/>').text(`We start with the first letter of the keyword: ${firstletter} and use that to find the corresponding row of the decode table.  Here's the subset of that table`));

        result.append(this.showShortTable(firstletter))

        result.append($('<p/>').text(`We can use this table to decode all the letters in the ciphertext that have ${firstletter} as the corresponding letter in the key. This gives us a partial solution:`));
        if (this.state.cipherType === ICipherType.Homophonic) {
            result.append($('<p/>').text(`Remember for the Homophonic cipher, if the letter you are looking up is between A and M, you look at the top of the table and pick the letter from the corresponding column.  
                if the letter you are looking up is between N and Z, you look for it in the row of the table and pick the letter from the top of the column.`))
        }
        this.setMappedKeyword(solvingData, this.state.keyword, discovered)
        result.append(this.showHomophonicDecodeStatus(solvingData));

        result.append($('<p/>').text(`You can repeat this process for each letter in the keyword until you have the full solution.`));

        while (remaining.length > 0) {
            const letter = remaining.shift()
            const prefix = remaining.length > 0 ? "Next, " : "Finally, "
            result.append($('<h4/>').text(`${prefix}we take the letter ${letter} from the keyword and look at the corresponding row in the Homophonic table:`))
            discovered += letter
            result.append(this.showShortTable(letter))
            result.append($('<p/>').text(`This allows us to decode all the letters in the cipher text that have ${letter} as the corresponding letter in the key, giving us a more complete solution:`));
            this.setMappedKeyword(solvingData, this.state.keyword, discovered)
            result.append(this.showHomophonicDecodeStatus(solvingData));
        }
        result.append($('<p/>').text(`After repeating this process for each letter in the keyword, we will have the full decoded solution.`));
        return result
    }
    /**
     * Generate the HTML to display the solution for the cipher.
     * @param testType Type of test
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        // If we are already in the process of loading then we need to request that
        // the loading process stop instead of starting it again.
        // Note that when the stop is processed it will trigger starting the load
        // once again to update the UI
        if (this.isLoading) {
            this.stopGenerating = true;
            return;
        }
        this.stopGenerating = false;
        this.isLoading = true

        const result = $('<div/>');
        const { width, extraclass } = this.getEncodeWidth(testType);

        result.append($('<h3/>').text('How to solve'));

        const solvingData: ISolverData = {
            replacements: [],
            testType: testType,
            extraclass: '',
            warned: false,
            known: [],
            valid: false,
            keyword: [],
            reverseHomophonicTable: {},
            charset: this.getSourceCharset(),
            limitUpdates: [0, 0, 0, 0]
        }

        solvingData.replacements = this.buildReplacementHomophonic(this.state.cipherString, width);

        this.loadLanguageDictionary(this.state.curlang).then(() => {
            if (this.state.operation === 'crypt') {
                this.genCryptanalysisSolution(solvingData, result);
            } else {
                this.genDecodeSolution(solvingData, result);
            }
            this.isLoading = false;
        }).catch(() => {
            this.isLoading = false;
        })

        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     * @param testType Type of test
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        const { width, extraclass } = this.getEncodeWidth(testType);
        const strings = this.buildReplacementHomophonic(this.state.cipherString, width);
        const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
        let source = 0;
        if (this.state.operation === 'encode') {
            source = 1;
        }
        for (const strset of strings) {
            let row = table.addBodyRow();
            let blankrow = table.addBodyRow();
            for (let ent of strset[source]) {
                if (this.state.operation !== 'encode' && ent === '100') {
                    ent = '00'
                }
                row.add(ent);
                blankrow.add("\u00A0");
            }
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
        const { width, extraclass } = this.getEncodeWidth(testType);
        const strings = this.buildReplacementHomophonic(this.state.cipherString, width);
        let source = 0;
        if (this.state.operation === 'encode') {
            source = 1;
        }
        // result.append(
        //     this.genInteractiveCipherTable(strings, source, qnum, 'cipherint' + extraclass, true)
        // );

        result.append($('<textarea/>', { id: 'in' + qnumdisp, class: 'intnote' }));
        return result;
    }
    /**
     * Start the dialog for suggesting the keyword
     */
    public suggestKey(): void {
        this.startSuggestKey();
    }
    /**
     * Populate the dialog with a set of keyword suggestions. 
     */
    public populateKeySuggestions(): void {
        this.populateLenKeySuggestions('genbtn', 'suggestKeyopts', 20, 4, 4)
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
    /**
     * Reset the alphabet mapping so that we generate a new one
     */
    public resetAlphabet(): void {
        this.markUndo('alphabet')
        const cribpos = this.placeCrib();
        let saveSlots: number[] = []
        // Save the current random slot choices for the crib (if any) so that we can keep them the same after resetting the alphabet
        if (cribpos !== undefined) {
            saveSlots = this.state.randomSlot.slice(cribpos.position, cribpos.position + cribpos.criblen);
        }
        this.state.randomSlot = [];
        this.updateRandom();
        // Restore saved crib random-slot assignments
        if (cribpos !== undefined) {
            this.state.randomSlot.splice(cribpos.position, cribpos.criblen, ...saveSlots);
        }
        this.updateOutput();
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
        $('#hint')
            .off('input')
            .on('input', (e) => {
                const hint = $(e.target).val() as string;
                if (hint !== this.state.hint) {
                    this.markUndo('hint');
                    if (this.setHint(hint)) {
                        this.updateOutput();
                    }
                }
            });
    }

}
