import { cloneObject } from '../common/ciphercommon';
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
    replacements: Array<[string, string]>;
    /** The type of test we are trying to solve for */
    testType: ITestType;
    /** Extra class to add to any output tables */
    extraclass: string;
    /** The known Row keyword */
    keyword: string[];
    /** Indicates where we already have warned them about this being too hard to solve */
    warned: boolean;
    /** Array indicating which letters in the keyword are already solved */
    known: boolean[];
    /** Last key check was valid */
    valid: boolean;
    /** Limit how many entries we output for a slot */
    limitUpdates: number[]
}

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
    public ctIndex = 0;
    public ptIndex = 1;

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

    public maxencodeWidth = 40;
    public maxencodeWidthDivA = 30;

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
            if (!this.isDecodeOperation(questionText)) {
                msg +=
                    "The Question Text doesn't appear to mention that " +
                    'the cipher needs to be decrypted.';
            }
            // Look to see if the crib appears in the question text
            const crib = this.minimizeString(this.state.crib);
            if (crib !== '' && this.minimizeString(questionText).indexOf(crib) < 0) {
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
                } else if (this.isDecodeOperation(questionText)) {
                    msg +=
                        'The Question Text appears to mention that the ' +
                        'cipher needs to be decoded, but this is an encode problem';
                }
            } else if (!this.isDecodeOperation(questionText)) {
                msg +=
                    "The Question Text doesn't appear to mention that " +
                    'the cipher needs to be decrypted.';
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
        const cribpos = this.minimizeString(strings[0][this.ptIndex]).indexOf(crib);
        if (cribpos < 0) {
            return undefined;
        }
        return {
            plaintext: this.minimizeString(strings[0][this.ptIndex]).substring(cribpos, cribpos + crib.length),
            ciphertext: this.minimizeString(strings[0][this.ctIndex]).substring(cribpos, cribpos + crib.length),
            position: cribpos,
            criblen: crib.length,
            cipherlen: this.minimizeString(strings[0][0]).length,
        };
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
            hinttext = ' ' + this.getCribPlacement(cribpos) + '.';
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
     */
    public getCribPlacement(cribpos: ICribInfo): string {
        let msg = '';
        if (cribpos === undefined) {
            msg += 'But <strong>the crib can not be found in the Plain Text</strong>. ';
        } else if (cribpos.position === 0) {
            msg += `The deciphered text starts with ${this.genMonoText(cribpos.plaintext)}`;
        } else if (cribpos.position === cribpos.cipherlen - cribpos.criblen) {
            msg += `The deciphered text ends with ${this.genMonoText(cribpos.plaintext)}`;
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
    ): Array<[string, string]> {
        let key = keystring;
        if (key === '') {
            key = 'A';
        }
        const encoded = this.chunk(msg, this.state.blocksize);
        const result: Array<[string, string]> = [];
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
        const { width, extraclass } = this.getEncodeWidth(ITestType.None);
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

        const strings = this.buildReplacementVigenere(msg, key, width);
        for (const stringset of strings) {
            result.append($('<div/>', { class: 'TOSOLVE' }).text(stringset[source]));
            result.append($('<div/>', { class: 'TOANSWER' }).text(stringset[dest]));
        }
        return result;
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

        // Build the list of cipher word lengths from the original cipher text.
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
        let keywordPos = 0;

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
                if (!this.isValidChar(pt)) {
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


                curWord.pt.push(pt);
                curWord.ct.push(ct);
                curWord.length++;

                // Count letters whose keyword slot has not been solved yet.
                if (keywordPos >= 0 && keywordPos < curWord.keywordCount.length) {
                    if (solvingdata.keyword[keywordPos] === '?') {
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
                keywordPos = (keywordPos + 1) % solvingdata.keyword.length
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
            const slot = (candidate.position - 1) + i % solvingData.keyword.length
            if (localData.keyword[slot] === '?') {
                localData.limitUpdates[slot] = 5;

                const kwslotchar = this.getRowKey(this.ciphermap.decodeKey(ct, pt));
                localData.keyword[slot] = kwslotchar
                if (this.state.cipherType === ICipherType.Porta) {
                    if (ct < pt) {
                        result.append($('<p/>').html(`Because the cipher character ${this.fixedCt(ct)} is between A and M, we look for that column in the Porta table and search down for the plaintext character ${this.fixedCt(pt)}.  Looking at the start of the row we find a key of ${this.fixedCt(kwslotchar)}.`));
                    } else {
                        result.append($('<p/>').html(`Because the plaintext character ${this.fixedCt(ct)} is between A and M, we look for that column in the Porta table and search down for the cipher character ${this.fixedCt(pt)}. Looking at the start of the row we find a key of ${this.fixedCt(kwslotchar)}.`));
                    }
                } else {
                    result.append($('<p/>').html(`Using the word ${this.fixedPt(word)} to fill in the slot gives us plain text ${this.fixedPt(pt)} mapping to the cipher text ${this.fixedCt(ct)}. 
                       Using the plaintext character ${this.fixedCt(pt)} to pick the row, we locate the cipher character ${this.fixedCt(ct)} and look at the top of the column to find a key of ${this.fixedPt(this.fixedCt(kwslotchar))}.`));
                }
                result.append($('<p/>').html('Using that updated table, we try to fill in a few characters to see if it makes sense.'))
                result.append(this.showDecodeStatus(localData));
            }
        }
        if (found) {
            return localData
        }
        return undefined;
    }

    /**
     * Loads up the values for vigenere
     */
    public async load(): Promise<void> {
        /* If they want different sizes, rebuild the string in the chunk size */
        const encoded = this.chunk(this.cleanString(this.state.cipherString), this.state.blocksize);

        const key = this.minimizeString(this.state.keyword);
        this.clearErrors();
        this.validateQuestion();
        let res = this.buildVigenere(encoded, key);
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
        const strings = this.buildReplacementVigenere(
            this.state.cipherString,
            this.state.keyword,
            width
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
        let keypos = 0;

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
     * Map a character to the row lookup.  For Porta this is a pair of characters, for Vigenere it's just the character itself.
     * @param keychar Keyword character
     * @returns Printable row title
     */
    public getRowKey(keychar: string): string {
        if (this.state.cipherType === ICipherType.Porta) {
            const charset = this.getCharset();
            const keyindex = charset.indexOf(keychar.toUpperCase());
            let keyset = Math.floor(keyindex / 2) * 2;
            return charset[keyset] + ',' + charset[keyset + 1];
        }
        return keychar
    }
    /**
     * Show a single row of the Vigenere or Porta table for a given keyword character.  This is used in the solution to show how to look up the cipher character based on the key and message character.
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
        let colcount = (this.state.cipherType === ICipherType.Porta) ? charset.length / 2 : charset.length
        let lookupKey = this.getRowKey(keychar.toUpperCase());

        lookupRow.add({
            celltype: 'th',
            content: lookupKey,
        });

        for (let i = 0; i < colcount; i++) {
            const messageChar = charset.substring(i, i + 1);
            const cipherChar = this.ciphermap.encode(messageChar, keychar.toUpperCase());
            headRow.add(messageChar);
            if (splitRow !== undefined) {
                splitRow.add('⋮');
            }
            lookupRow.add(cipherChar);
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Map the found key characters to the correct positions in the keyword based on the crib placement and return a properly oriented keyword for display in the solution.  This is used in the solution to show how to orient the found key characters based on the crib placement.
     * @param keys Key characters found based on the crib placement
     * @param keylen Length of the keyword based on the crib placement
     * @param keyoff Offset to apply to the key characters based on the crib placement
     * @returns Rotated key characters for display in the solution
     */
    public rotatedKey(keys: string[], keylen: number, keyoff: number): string[] {
        const slice = keys.slice(0, keylen);
        const off = keyoff % slice.length;

        return off === 0
            ? slice
            : slice.slice(off).concat(slice.slice(0, off));
    }
    public mapPattern(word: string): string {
        if (this.state.cipherType !== ICipherType.Porta) {
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
        if (this.state.cipherType === ICipherType.Vigenere) {
            return words.length === 1
        }
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
     * 
     * @param words List of words to format
     * @returns HTML formatted list of words
     */
    public formatPTList(words: string[]): string {
        if (words.length === 0) {
            return ''
        }
        if (words.length === 1) {
            return this.fixedPt(words[0])
        }
        let result = this.fixedPt(words[0])
        for (let i = 1; i < words.length; i++) {
            if (words.length > 2) {
                result += ', '
            }
            if (i === words.length - 1) {
                result += 'and '
            }
            result += this.fixedPt(words[i])
        }
        return result
    }
    /**
     * Find all the words which can match the known keyword letters.
     * @param result Place to output any notes
     * @param solvingData Structure containing the current state of the solution including known letters and keyword deductions based on the crib placement.  This is used to show the current state of the solution based on the crib placement and key deduction steps.
     * @param keycheck Array of keyword letters known for each person
     * @returns Array of keywords which match the keycheck pattern
     */
    public findWords(result: JQuery<HTMLElement>, solvingData: ISolverData, keycheck: string[]): string[] {
        solvingData.valid = false
        const keylen = keycheck.length
        const found = []
        let keydisp = ''
        let patterns = Object.keys(this.Frequent['en'])
            .filter(key => key.length === keylen && !key.includes("'"));
        let pattern = '^'
        for (let keyc of keycheck) {
            if (keyc === ' ' || keyc === undefined || keyc === '?') {
                pattern += '.'
                keydisp += '?'
            } else if (keyc.length === 1) {
                pattern += keyc;
                keydisp += keyc
            } else {
                pattern += '[' + keyc.split(',').join('') + ']';
                keydisp += '[' + keyc.split(',').join('/') + ']';
            }
        }
        pattern += '$'

        const re = new RegExp(pattern.toUpperCase());
        for (const pat of patterns) {
            for (const entry of this.Frequent['en'][pat]) {
                if (re.test(entry[0])) {
                    found.push(entry[0]);
                    if (found.length >= 10) {
                        break;
                    }
                }
            }
        }
        if (found.length >= 10) {
            result.append($('<p/>').html(`Looking at the most common ${keylen} letter words in English for ${this.fixedPt(keydisp)}, we find at least ${found.length} possibilities for the keyword based on the letters we found: <strong>${found.join(', ')}</strong>.
            Since there are so many possibilities, we cannot determine the correct keyword yet.`));
            return keycheck
        } else if (found.length == 1) {
            result.append($('<p/>').html(`Looking at the most common ${keylen} letter words in English for ${this.fixedPt(keydisp)}, we find one matching possibility: ${this.formatPTList(found)} so we will try it.`));
            solvingData.valid = true
            return found[0].split('')
        } else if (found.length > 0) {
            if (this.allEquivalent(found)) {
                result.append($('<p/>').html(`Looking at the most common ${keylen} letter words in English for ${this.fixedPt(keydisp)}, we find the following ${found.length} possibilities: ${this.formatPTList(found)}.
            Since they all share the same pattern letters, we will just pick the first one.`));
                solvingData.valid = true
                return found[0].split('')
            } else {
                let extra = ` However, since they don't all share the same pattern letters, we can't pick one.`
                if (this.state.cipherType === ICipherType.Vigenere) {
                    extra = ` Note that we could try them all to see if any of them provide a solution, but for now we will see if there is an easier approach.`
                }
                result.append($('<p/>').html(`Looking at the most common ${keylen} letter words in English, we find the following ${found.length} possibilities for ${this.fixedPt(keydisp)} we found: ${this.formatPTList(found)}. ${extra}`));
                return keycheck
            }
        } else {
            result.append($('<p/>').html(`Looking at the most common ${keylen} letter words in English, we don't find any possibilities which match ${this.fixedPt(keydisp)}.`));
            return keycheck
        }

    }
    /**
     * Generate HTML content showing the step by step solution based on the crib placement and key deduction steps, including the important characters in the crib placement and key deduction steps and how to orient the found key characters based on the crib placement.
     * @param solvingData Structure containing the current state of the solution including known letters and keyword deductions based on the crib placement.  This is used to show the current state of the solution based on the crib placement and key deduction steps.
     * @returns HTML content
     */
    public async genCryptanalysisSolution(solvingData: ISolverData, result: JQuery<HTMLElement>) {
        const cribpos = this.placeCrib();
        if (cribpos === undefined) {
            result.append($('<h3/>').text('Unable to place the crib'));
            return result;
        }
        // solvingData.known = new Array<boolean>(cribpos.cipherlen);
        // solvingData.known.fill(false);
        solvingData.keyword = []
        solvingData.known = []

        this.showStep(result, "Step 1: Place the crib and determine the known letters of the key");

        result.append($('<p/>').text(`Using the crib information, fill in the known plain text letters.`));
        result.append(this.showCribStatus(solvingData, cribpos, false));

        result.append($('<p/>').text(`Since we know the mapping of these letters, we can look at the corresponding letters in the ${this.cipherName} table to determine the corresponding letters in the key:`));

        let keyword = []
        for (let pos = 0; pos < cribpos.criblen; pos++) {
            const cipherChar = cribpos.ciphertext[pos]
            const plainChar = cribpos.plaintext[pos]
            const keyChar = this.getRowKey(this.ciphermap.decodeKey(cipherChar, plainChar));
            keyword.push(keyChar)
            if (this.state.cipherType === ICipherType.Porta) {
                if (cipherChar < plainChar) {
                    result.append($('<p/>').html(`Because the cipher character ${this.fixedCt(cipherChar)} is between A and M, we look for that column in the Porta table and search down for the plaintext character ${this.fixedPt(plainChar)}.  Looking at the start of the row we find a key of ${this.fixedPt(keyChar)}.`));
                } else {
                    result.append($('<p/>').html(`Because the plaintext character ${this.fixedPt(plainChar)} is between A and M, we look for that column in the Porta table and search down for the cipher character ${this.fixedCt(cipherChar)}. Looking at the start of the row we find a key of ${this.fixedPt(keyChar)}.`));
                }
            } else {
                result.append($('<p/>').html(`Using the plaintext character ${this.fixedPt(plainChar)} to pick the row, we locate the cipher character ${this.fixedCt(cipherChar)} and look at the top of the column to find a key of ${this.fixedPt(keyChar)}.`));
            }
        }
        result.append(this.showCribStatus(solvingData, cribpos, true));
        let keylen = 2;
        // Let's see if we think that we have the full keyword figured out.
        if (keyword.length > 0) {
            keylen = keyword.length
            const first = keyword[0];
            const occursindex = keyword.indexOf(first, 1)
            if (occursindex >= 0) {
                // We have a repeat, let's see if anything after the repeat is the same.
                let size = keyword.length - occursindex
                keylen = occursindex
                if (keyword.slice(0, size).join('') === keyword.slice(occursindex, occursindex + size).join('')) {
                    if (size === 1) {
                        result.append($('<p/>').html(`We can see that the keyword letter ${this.fixedCt(first)} repeats at the end, which is a good possibility that we have a ${keylen} letter keyword.`));
                    } else {
                        result.append($('<p/>').html(`We can see that the first ${size} keyword letters repeat at the end, which is a strong indication that we have a ${keylen} letter keyword.`));
                    }
                }
            }
        }
        this.showStep(result, "Step 2: Figure out the length of the keyword");
        result.append($('<p/>').text(`Based on the letters revealed by the crib, we know that the keyword must be at least ${keylen} letters long.`));
        let keyoff = keylen - (cribpos.position % keylen);
        result.append($('<p/>').text(`With the crib starting at position ${cribpos.position + 1}, we divide the position by the keyword length to determine that the keyword would start at ${cribpos.position + keyoff} and repeat every ${keylen} letters.
            We can test this out by filling the first 10 letters of the cipher with the corresponding key letters and decoding them to see what we get.
            Note that we don't have to actually figure out the keyword, just copy the letters we know down.`));
        // Make it easier by building a properly oriented keyword. 
        let keycheck = this.rotatedKey(keyword.slice(0, keylen), keylen, keyoff)

        solvingData.keyword = keycheck
        solvingData.known = []
        for (let c of keycheck) {
            solvingData.known.push(c !== '?')
        }
        result.append(this.showDecodeStatus(solvingData));
        if (solvingData.valid) {
            result.append($('<p/>').html(`This looks like a valid solution.`));
        } else {
            result.append($('<p/>').html(`This doesn't look quite right (note that you could have stopped at anytime, but we show the entire cipher here), so we have to try with a longer key.`));
            let keyoptions = keyword.slice(0, keylen).concat(Array(10).fill('?'));
            for (let extrakeylen = keylen + 1; extrakeylen < 10; extrakeylen++) {
                // Let's try adding an extra unknown letter to the key and see if it looks better
                keyoff = extrakeylen - (cribpos.position % extrakeylen);
                keycheck = this.rotatedKey(keyoptions.slice(0, extrakeylen), extrakeylen, keyoff)
                const minextra = Math.min(Math.ceil(10 / keylen) * extrakeylen, cribpos.cipherlen)
                for (let i = 0; i < minextra; i++) {
                    const keychar = keycheck[i % extrakeylen]
                    solvingData.keyword[i] = keychar;
                    solvingData.known[i] = true;
                }
                result.append(this.showDecodeStatus(solvingData));
                if (solvingData.valid) {
                    result.append($('<p/>').html(`This looks promising, so we have likely found the correct keyword length of ${extrakeylen}.`));
                    keylen = extrakeylen;
                    break;
                } else {
                    result.append($('<p/>').html(`This doesn't look quite right, so we have to try with a longer key.`));
                }
            }
            solvingData.keyword = solvingData.keyword.slice(0, keylen)
            solvingData.known = solvingData.known.slice(0, keylen);
            if (this.state.blocksize === 0) {
                result.append($('<p/>').html(`Since we have the original spacing, we can find words that have only one missing letter to see if we recognize them.
                    Taking the longest word will give us the most likely chance of figuring out the key.`));
            } else {
                result.append($('<p/>').html(`Since we don't have the original spacing, we can look at the start or the end to see if we recongize any words.`));
            }
        }
        for (let loop = 0; loop < 5; loop++) {
            this.showStep(result, "Step 3a: Find possible keywords which match the key characters we looked up");
            keycheck = this.findWords(result, solvingData, keycheck);
            let maxMatches = 1
            let tryFindKeywords = true
            let tryUnfinishedWords = true
            let tried: number[] = []
            if (!solvingData.valid) {
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
                    this.showStep(result, "Step 3b: See if we see any obvious missing letters we can fill in the plaintext");
                    if (bestCandidate.candidates.length === 1) {
                        result.append($('<p/>').html(`We see a potential word with ${this.fixedPt(bestCandidate.pattern.replaceAll('.', '?'))} which matches exactly one word: ${this.fixedPt(bestCandidate.candidates[0])}` +
                            ` that we can try.`))
                    } else {
                        result.append($('<p/>').html(`We see a potential word with ${this.fixedPt(bestCandidate.pattern.replaceAll('.', '?'))} which matches ${bestCandidate.candidates.length} words: [${bestCandidate.candidates.join(", ")}].` +
                            ` We will try them one at a time to see which works out the best`))
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
                    this.showStep(result, "Step 3b: See if we see any obvious missing letters we can fill in the plaintext");
                    result.append($('<p/>').html(`Unfortunately we don't see anything obvious right now so we will look a bit harder.`))

                }
                tryUnfinishedWords = false
                maxMatches += 2;
            }
            // See if we have all of the keyword letters
            const unmatched = solvingData.keyword.filter(c => c === '?').length;
            if (!unmatched) {
                result.append($('<p/>').html(`With that we now have all letters of the keyword: ${this.fixedPt(solvingData.keyword.join(''))}`))
                break;
            }
        }
        this.showStep(result, "Step 4: Fill out the remainder of the keywords and decode");
        result.append(this.showDecodeStatus(solvingData));
        return result;
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
        cipherline: string,
        answerline: string,
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
            const c = cipherline.substring(i, i + 1);
            let aclass = 'e v';
            let a = ' ';
            if (answerline !== undefined) {
                a = answerline.substring(i, i + 1);
                aclass = 'a v';
            }
            if (overline !== undefined) {
                if (this.isValidChar(c)) {
                    rowover.add({
                        settings: { class: 'o v' },
                        content: overline[i],
                    });
                } else {
                    rowover.add(overline[i]);
                }
            }
            if (this.isValidChar(c)) {
                rowcipher.add({
                    settings: { class: 'q v' },
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
     * In the solvingdata structure, if the correspoding position in the known array is set to true, the letter is
     * always shown.
     * @param solvingdata Data structure containing the current state of the solver including the keyword and solved letters. This is used for showing the partial solution in the table as you solve each letter of the key for the cipher.
     * @returns Formatted table showing the current decode status of the cipher with the solved letters filled in and the unsolved letters blanked out.
     */
    public showCribStatus(solvingdata: ISolverData, cribinfo: ICribInfo, showkeyword: boolean): JQuery<HTMLElement> {
        solvingdata.valid = true;
        const extra = solvingdata.extraclass ? ` ${solvingdata.extraclass.trim()}` : '';
        const table = new JTTable({ class: `ansblock shrink cell unstriped${extra}` });
        const [source, dest] = this.state.operation === 'encode' ? [this.ptIndex, this.ctIndex] : [this.ctIndex, this.ptIndex];

        let keywordpos = 0;
        let ptpos = 0;
        const cribstart = cribinfo.position
        const cribend = cribinfo.position + cribinfo.criblen
        const keyword = this.minimizeString(this.state.keyword).toUpperCase().split('')
        // Make sure we have something in the keyword to avoid errors, we'll just show blanks in the table if we don't have a key
        for (const strset of solvingdata.replacements) {
            let showline = false
            const src = strset[source] ?? '';
            const dst = strset[dest] ?? '';
            const n = src.length;

            let repeatedKey = []
            let solution = '';
            for (let cpos = 0; cpos < n; cpos++) {
                const c = src[cpos];

                if (this.isValidChar(c)) {
                    if (ptpos >= cribstart && ptpos < cribend) {
                        showline = true;
                        repeatedKey.push(keyword[keywordpos] ?? '?');
                        solution += dst[cpos]
                    } else {
                        repeatedKey.push(' ')
                        solution += ' ';
                    }
                    keywordpos = (keywordpos + 1) % keyword.length
                    ptpos++;
                } else {
                    repeatedKey.push(' ');
                    solution += ' ';
                }
            }
            if (showline) {

                this.addAnnotatedCipherTableRows(table, showkeyword ? repeatedKey : undefined, src, solution);
                if (ptpos >= cribend) {
                    break;
                }
            }
        }
        return table.generate();
    }
    /**
     * This function generates a table showing the current decode status of the cipher with the solved letters filled in and the unsolved letters blanked out. 
     * This is used for showing the partial solution as you solve each letter of the key for the cipher.
     * In the solvingdata structure, if the correspoding position in the known array is set to true, the letter is
     * always shown.
     * @param solvingdata Data structure containing the current state of the solver including the keyword and solved letters. This is used for showing the partial solution in the table as you solve each letter of the key for the cipher.
     * @returns Formatted table showing the current decode status of the cipher with the solved letters filled in and the unsolved letters blanked out.
     */
    public showDecodeStatus(solvingdata: ISolverData): JQuery<HTMLElement> {
        solvingdata.valid = true;
        const extra = solvingdata.extraclass ? ` ${solvingdata.extraclass.trim()}` : '';
        const table = new JTTable({ class: `ansblock shrink cell unstriped${extra}` });
        const [source, dest] = this.state.operation === 'encode' ? [this.ptIndex, this.ctIndex] : [this.ctIndex, this.ptIndex];

        let keywordpos = 0;
        let sufficient = false
        const keyword = solvingdata.keyword ?? ['?']
        const keyknown = solvingdata.known ?? [false]
        // Make sure we have something in the keyword to avoid errors, we'll just show blanks in the table if we don't have a key
        for (const strset of solvingdata.replacements) {
            const src = strset[source] ?? '';
            const dst = strset[dest] ?? '';
            const n = src.length;

            let repeatedKey = []
            let solution = '';
            for (let cpos = 0; cpos < n; cpos++) {
                const c = src[cpos];

                if (this.isValidChar(c)) {
                    let keyc = keyword[keywordpos] ?? '?';
                    const isKnown = (keyc !== '?') && keyknown[keywordpos]
                    repeatedKey.push(keyc);
                    // We can't actually use the computed solution because we may be testing a bad key
                    if (isKnown) {
                        let sol = this.ciphermap.decode(c, keyc[0]);
                        if (keyc[0] === ' ') {
                            sol = dst[cpos]
                        }
                        if (sol !== undefined && keyc[0] != '?' && sol.toUpperCase() !== dst[cpos].toUpperCase()) {
                            solvingdata.valid = false;
                        }
                        solution += sol ?? ' ';
                    } else {
                        solution += ' ';
                        if (solvingdata.limitUpdates[keywordpos] > 0) {
                            solvingdata.limitUpdates[keywordpos]--;
                            if (solvingdata.limitUpdates[keywordpos] === 0) {
                                sufficient = true;
                                break;
                            }
                        }
                    }
                    keywordpos = (keywordpos + 1) % keyword.length
                } else {
                    repeatedKey.push(' ');
                    solution += ' ';
                }
            }
            this.addAnnotatedCipherTableRows(table, repeatedKey, src, solution);
            if (sufficient) {
                break;
            }
        }
        return table.generate();
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

        for (let i = 0; i < keyword.length; i++) {
            let keyc = keyword[i]
            let solvec = solved[i] ?? '?'
            solvingdata.keyword.push(keyc)
            solvingdata.known.push(keyc === solvec)
        }
    }
    /**
     * 
     * @param solvingData 
     * @param result 
     * @returns 
     */
    public async genDecodeSolution(solvingData: ISolverData, result: JQuery<HTMLElement>) {

        if (this.state.keyword === '') {
            result.append($('<h3/>').text('You must select a keyword.'));
            return result;
        }
        if (this.state.cipherType === ICipherType.Porta) {
            result.append($('<p/>').text(`The Porta cipher is a reciprocal cipher, so the same steps for encoding can be used for decoding.`));
        }
        result.append($('<p/>').text(`To solve, write the keyword ${this.state.keyword} repeatedly over the cipher text, then use the ${this.cipherName} cipher table to decode each letter based on the corresponding letter in the key.`));

        this.setMappedKeyword(solvingData, this.state.keyword, this.state.keyword)
        solvingData.known.fill(false)

        result.append(this.showDecodeStatus(solvingData));
        let remaining = this.undupeString(this.state.keyword).split('')
        let firstletter = remaining.shift()
        let discovered = firstletter
        result.append($('<h4/>').text(`We start with the first letter of the keyword: ${firstletter} and use that to find the corresponding row of the ${this.cipherName} table.  Here's the subset of that table`));

        result.append(this.showShortTable(firstletter))

        result.append($('<p/>').text(`We can use this table to decode all the letters in the cipher text that have ${firstletter} as the corresponding letter in the key. This gives us a partial solution:`));
        if (this.state.cipherType === ICipherType.Porta) {
            result.append($('<p/>').text(`Remember for the Porta cipher, if the letter you are looking up is between A and M, you look at the top of the table and pick the letter from the corresponding column.  
                if the letter you are looking up is between N and Z, you look for it in the row of the table and pick the letter from the top of the column.`))
        }
        this.setMappedKeyword(solvingData, this.state.keyword, discovered)
        result.append(this.showDecodeStatus(solvingData));

        result.append($('<p/>').text(`You can repeat this process for each letter in the keyword until you have the full solution.`));

        while (remaining.length > 0) {
            const letter = remaining.shift()
            const prefix = remaining.length > 0 ? "Next, " : "Finally, "
            result.append($('<h4/>').text(`${prefix}we take the letter ${letter} from the keyword and look at the corresponding row in the ${this.cipherName} table:`))
            discovered += letter
            result.append(this.showShortTable(letter))
            result.append($('<p/>').text(`This allows us to decode all the letters in the cipher text that have ${letter} as the corresponding letter in the key, giving us a more complete solution:`));
            this.setMappedKeyword(solvingData, this.state.keyword, discovered)
            result.append(this.showDecodeStatus(solvingData));
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
            extraclass: extraclass,
            keyword: [],
            known: [],
            warned: false,
            valid: false,
            limitUpdates: []
        }

        solvingData.replacements = this.buildReplacementVigenere(
            this.state.cipherString,
            this.state.keyword,
            width
        );

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
        const { width, extraclass } = this.getEncodeWidth(testType);
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
        this.startSuggestKey();
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
}
