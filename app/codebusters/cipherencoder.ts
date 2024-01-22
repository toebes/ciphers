import { CKInlineEditor } from '../common/ckeditor.js';
import { BoolMap, cloneObject } from '../common/ciphercommon';
import {
    CipherHandler,
    IEncodeType,
    IState,
    ITestType,
    menuMode,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
    IOperationType,
    QuoteRecord,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTFDialog } from '../common/jtfdialog';
import { JTTable } from '../common/jttable';
import { findHomonyms, replaceInfo } from '../common/homonyms';

export interface IEncoderState extends IState {
    /** K1/K2/K3/K4 Keyword */
    keyword2?: string;
    /** K1/K2/K3/K4 Offset */
    offset?: number;
    /** K4 Offset */
    offset2?: number;
    /** The source character map */
    alphabetSource?: string;
    /** The restination character map */
    alphabetDest?: string;
    /** Optional translation string for non-english ciphers */
    translation?: string;
    /** Optional hint tracking string */
    hint?: string;
    /** Optional crib tracking string */
    crib?: string;
}

export interface suggestedData {
    /* The suggested score to use */
    suggested: number;
    /* The minimum of the range for the suggested score */
    min: number;
    /* The maximum of the range for the suggested score */
    max: number;
    /* Any information private to the class for why the score was suggested */
    private?: any;
    /* Text for the dialog showing suggested points */
    text?: string;
}

/**
 * CipherEncoder - This class handles all of the actions associated with encoding
 * a cipher.
 */
export class CipherEncoder extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Aristocrat';

    public defaultstate: IEncoderState = {
        cipherString: '',
        cipherType: ICipherType.Aristocrat,
        encodeType: 'random',
        offset: 1,
        offset2: 1,
        keyword: '',
        keyword2: '',
        alphabetSource: '',
        alphabetDest: '',
        curlang: 'en',
        replacement: {},
        operation: 'decode'
    };

    public validTests: ITestType[] = [
        ITestType.None,
        ITestType.cregional,
        ITestType.cstate,
        ITestType.bregional,
        ITestType.bstate,
        ITestType.aregional,
    ];

    public state: IEncoderState = cloneObject(this.defaultstate) as IState;
    /**
     * This is a cache of all active editors on the page.
     * It is indexed by the id of the HTML element
     */
    public editor: { [key: string]: CKInlineEditor } = {};
    public cipherName = 'Aristocrat';
    public uniquePatterns: { [index: number]: string } = {}

    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        {
            title: 'Misspell',
            color: 'primary',
            id: 'misspell',
            disabled: true,
        },
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];
    /**
     * Make a copy of the current state
     */
    public save(): IEncoderState {
        const result: IEncoderState = cloneObject(this.state) as IState;
        return result;
    }
    /**
     * saveInteractive saves the test template html for a question
     * @param qnum Question number to generate test for
     * @param testType Type of test that the question is for
     * @param isTimed Save information for solving a timed question
     */
    public saveInteractive(qnum: number, testType: ITestType, isTimed: boolean): IEncoderState {
        const result: IState = {
            cipherType: this.state.cipherType,
            cipherString: '',
            curlang: this.state.curlang,
            points: this.state.points,
            question: this.state.question,
            encodeType: this.state.encodeType,
            sourceCharset: this.getSourceCharset(),
        };
        if (this.state.specialbonus) {
            result.specialbonus = true;
        }
        const interactiveContent = $('<div/>').append(this.genInteractive(qnum, testType));
        const testHTML = interactiveContent.html();
        result.testHTML = this.obverse(testHTML);
        // Do we need to save information for testing the solution?
        if (isTimed) {
            result.solMap = this.getRandomAlphabet();
            result.solCheck = this.encipherString(
                this.state.cipherString.toUpperCase(),
                result.solMap
            );
        }
        return result;
    }
    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        const result = super.getInteractiveTemplate();
        let replen = this.getSourceCharset().length;
        let anslen = this.state.cipherString.length;
        // If we are doing a keyword, then we need to get right string length
        // for the answers.
        if (this.state.operation === 'keyword') {
            replen += anslen;
            anslen = this.state.keyword.length;
        }

        // We can put everything into a single string.
        result.version = 2;
        result.answer = this.repeatStr(' ', anslen);
        // For a patristocrat we need to have a place to store the separators
        if (this.state.cipherType == ICipherType.Patristocrat) {
            result.separators = this.repeatStr(' ', anslen);
        }
        result.replacements = this.repeatStr(' ', replen);
        return result;
    }
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IEncoderState, suppressOutput = false): void {
        this.state = cloneObject(this.defaultstate) as IState;
        this.copyState(this.state, data);
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setCharset(this.acalangcharset[this.state.curlang]);
        this.setSourceCharset(this.encodingcharset[this.state.curlang]);
        this.setCipherType(this.state.cipherType);
        this.setCipherString(this.state.cipherString);
        this.setEncType(this.state.encodeType);
        this.setOffset(this.state.offset);
        this.setOffset2(this.state.offset2);
        this.setOperation(this.state.operation);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.question);
        this.updateQuestionsOutput();
        this.updateTestUsage();
        JTRadioButtonSet('operation', this.state.operation);
        $('#toencode').val(this.state.cipherString);
        $('#keyword').val(this.state.keyword);
        $('#offset').val(this.state.offset);
        $('#keyword2').val(this.state.keyword2);
        $('#offset2').val(this.state.offset2);
        $('#translated').val(this.state.translation);
        $("#qauthor").val(this.state.author)
        // Hide the random option if this is a keyword operation since
        // they must have a K1/K2/K3 alphabet to be able to have a keyword
        if (this.state.operation === 'keyword') {
            $('#encrand').attr('disabled', 'disabled').hide();
        } else {
            $('#encrand').removeAttr('disabled').show();
        }
        // Show the misspell option if they are doing an English Aristocrat
        if ((this.state.cipherType === ICipherType.Aristocrat) && (this.state.curlang === 'en')) {
            $('#misspell').removeAttr('disabled').show();
        } else {
            $('#misspell').attr('disabled', 'disabled').hide();
        }

        if (this.state.curlang === 'en') {
            $('#translated')
                .parent()
                .hide();
        } else {
            $('#translated')
                .parent()
                .show();
        }
        JTRadioButtonSet('enctype', this.state.encodeType);
        $('.lang').val(this.state.curlang);
        this.setkvalinputs();
        this.load();
    }
    /**
     * Update the question string (and validate if necessary)
     * @param question New question text string
     */
    public setQuestionText(question: string): void {
        this.state.question = question;
        if (this.state.cipherType === ICipherType.Aristocrat ||
            this.state.cipherType === ICipherType.Patristocrat ||
            this.state.cipherType === ICipherType.Xenocrypt) {
            this.validateQuestion();
            this.attachHandlers();
        }
    }
    /**
     * Make sure that they are asking them to solve the cipher or fill in the keyword.
     * If they are using a K1/K2/K3/K4 alphabet, they should also mention it
     */
    public validateQuestion(): void {
        let msg = '';
        const sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');
        const questionText = this.state.question.toUpperCase();

        if (this.state.operation === 'keyword') {
            if (
                questionText.indexOf('KEYWORD') < 0 &&
                questionText.indexOf('KEYPHRA') < 0 &&
                questionText.indexOf('KEY PHRA') < 0
            ) {
                msg +=
                    "The Question Text doesn't appear to mention that " +
                    'the key phrase needs to be decoded. ';
            }
        }
        if (this.state.encodeType !== 'random') {
            const enctype = this.state.encodeType.toUpperCase();
            if (questionText.indexOf(enctype) < 0) {
                msg += "The Question Text doesn't mention that the cipher uses a " + enctype + " alphabet encoding. ";
            }
        }

        this.setErrorMsg(msg, 'vq', sampleLink);
    }
    /**
     * 
     * @param specialbonus 
     */
    public setSpecialBonus(specialbonus: boolean): void {
        this.state.specialbonus = specialbonus;
    }
    /**
     * Set the operation for the encoder type
     * @param operation New operation type
     */
    public setOperation(operation: IOperationType): boolean {
        let changed = super.setOperation(operation);
        if (this.state.operation === 'keyword' && this.state.encodeType === 'random') {
            this.setEncType('k1');
            changed = true;
        }
        if (this.state.cipherType === ICipherType.Aristocrat || this.state.cipherType === ICipherType.Patristocrat) {
            if (this.state.curlang === 'es') {
                this.guidanceURL = 'TestGuidance.html#Xenocrypt';
            } else if (this.state.operation === 'keyword') {
                this.guidanceURL = 'TestGuidance.html#Aristocrat_Keyword';
            } else {
                this.guidanceURL = 'TestGuidance.html#Aristocrat';
            }
        }
        return changed;
    }
    /**
     * Set the value of a rich text element.  Note that some editors may not
     * be fully initialized, so we may have to stash it for when it does get
     * initialized
     */
    public setRichText(id: string, val: string): void {
        if (id in this.editor && this.editor[id] !== null) {
            this.editor[id].setData(val);
        } else {
            $('#' + id).val(val);
        }
    }
    /**
     * Update the questions fields (points and quesiton text)
     */
    public updateQuestionsOutput(): void {
        if (this.state.points === undefined) {
            this.state.points = 0;
        }
        $('#points').val(this.state.points);
        if (this.state.question === undefined) {
            this.state.question = '';
        }
        this.setRichText('qtext', this.state.question);
        $('#spbonus').prop('checked', this.state.specialbonus);
    }
    /**
     * Enable / Disable the HTML elements based on the alphabet selection
     */
    public setkvalinputs(): void {
        const val = this.state.encodeType;
        // Show/hide the randomize button if they are doing a K1/K2/... alphabet
        if (val === 'random') {
            $('#randomize').removeAttr('disabled').show();
            $('.kval').hide();
        } else {
            $('#randomize').attr('disabled', 'disabled').hide();
            $('.kval').show();
        }

        if (val === 'k1' || val === 'k2' || val === 'k3') {
            $('#genkeyword').removeAttr('disabled').show();

        } else {
            $('#genkeyword').attr('disabled', 'disabled').hide();
        }

        if (val === 'k4') {
            $('.k4val').show();
        } else {
            $('.k4val').hide();
        }
    }
    /**
     * Sets the encoding type for the cipher
     * @param encodeType Type of encoding random/k1/k2/k3/k4
     */
    public setEncType(encodeType: IEncodeType): boolean {
        let changed = false;
        if (this.state.encodeType !== encodeType) {
            this.state.encodeType = encodeType;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Updates the translation string for the cipher
     * @param translation Cipher string to set
     */
    public setTranslation(translation: string): boolean {
        let changed = false;
        if (this.state.translation !== translation) {
            changed = true;
            this.state.translation = translation;
        }
        return changed;
    }
    /**
     * Sets the keyword (state.keyword)
     * @param keyword New keyword
     * @returns Boolean indicating if the value actually changed
     */
    public setKeyword(keyword: string): boolean {
        let changed = false;
        if (this.state.keyword !== keyword) {
            this.state.keyword = keyword;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the secondary keyword (state.keyword2)
     * @param keyword2 new Secondary keyword
     * @returns Boolean indicating if the value actually changed
     */
    public setKeyword2(keyword2: string): boolean {
        let changed = false;
        if (this.state.keyword2 !== keyword2) {
            this.state.keyword2 = keyword2;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the offset value (state.offset)
     * @param offset new offset value
     * @returns Boolean indicating if the value actually changed
     */
    public setOffset(offset: number): boolean {
        let changed = false;
        const charset = this.getCharset();
        offset = (offset + charset.length) % charset.length;
        if (this.state.offset !== offset) {
            this.state.offset = offset;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the secondary offset value (state.offset2)
     * @param offset2 new offset value
     * @returns Boolean indicating if the value actually changed
     */
    public setOffset2(offset2: number): boolean {
        let changed = false;
        const charset = this.getCharset();
        offset2 = (offset2 + charset.length) % charset.length;
        if (this.state.offset2 !== offset2) {
            this.state.offset2 = offset2;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the hint value (state.hint)
     * @param hint new hint string
     * @returns Boolean indicating if the value actually changed
     */
    public setHint(hint: string): boolean {
        let changed = false;
        if (this.state.hint !== hint) {
            this.state.hint = hint;
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the crib value (state.crib)
     * @param crib new hint string
     * @returns Boolean indicating if the value actually changed
     */
    public setCrib(crib: string): boolean {
        let changed = false;
        if (this.state.crib !== crib) {
            this.state.crib = crib;
            changed = true;
        }
        return changed;
    }

    /**
     * Loads a language in response to a dropdown event
     * @param lang New language string
     */
    public loadLanguage(lang: string): void {
        let changed = false;
        this.pushUndo(null);
        if (this.state.curlang !== lang) {
            changed = true;
            this.state.curlang = lang;
        }
        this.setCharset(this.acalangcharset[lang]);
        this.setSourceCharset(this.encodingcharset[lang]);
        // Call the super if we plan to match the text against a dictionary.
        // That is generally used for a solver, but we might want to do it in the
        // case that we want to analyze the complexity of the phrase
        // super.loadLanguage(lang)
        if (changed) {
            this.updateOutput();
        }
    }
    /**
     * Reset the alphabet mapping so that we generate a new one
     */
    public resetAlphabet(): void {
        this.state.alphabetSource = '';
        this.state.alphabetDest = '';
    }
    /**
     * Generate the maping from the source to the destination alphabet
     */
    public genAlphabet(): void {
        // If we already have a mapping, then we stay with it
        if (
            this.state.alphabetSource !== '' &&
            this.state.alphabetSource !== undefined &&
            this.state.alphabetDest !== '' &&
            this.state.alphabetDest !== undefined &&
            this.state.alphabetDest.length === this.state.alphabetSource.length
        ) {
            this.setReplacement(this.state.alphabetSource, this.state.alphabetDest);
            return;
        }
        if (this.state.encodeType === 'k1') {
            this.genAlphabetK1(this.state.keyword, this.state.offset);
        } else if (this.state.encodeType === 'k2') {
            this.genAlphabetK2(this.state.keyword, this.state.offset);
        } else if (this.state.encodeType === 'k3') {
            this.genAlphabetK3(this.state.keyword, this.state.offset);
        } else if (this.state.encodeType === 'k4') {
            this.genAlphabetK4(
                this.state.keyword,
                this.state.offset,
                this.state.keyword2,
                this.state.offset2
            );
        } else {
            this.genAlphabetRandom();
        }
    }
    /**
     * Compute the replacement set for the the characters on an encryption
     * Note that we actually have to reverse them because the ciphers class
     * is mostly built around decrypting
     */
    public setReplacement(cset: string, repl: string): void {
        let errors = '';
        let msg = '';
        this.state.alphabetSource = cset;
        this.state.alphabetDest = repl;
        // console.log("Set Replacement cset=" + cset + " repl=" + repl);
        // Figure out what letters map to the destination letters.  Note that
        // the input chracterset alphabet may not be in the same order as the
        // actual alphabet.
        for (let i = 0, len = repl.length; i < len; i++) {
            const repc = repl.charAt(i);
            const orig = cset.charAt(i);
            // Remember that we are backwards because this an encoder
            this.setChar(orig, repc);
            // Just make sure that we don't happen to have the same character
            // at this position
            if (repc === orig) {
                errors += repc;
            }
        }
        if (errors !== '') {
            msg = 'Bad keyword/offset combo for letters: ' + errors;
            if (errors === 'Ñ' && this.state.keyword.indexOf('Ñ') >= 0) {
                msg = '';
            }
        }
        this.setErrorMsg(msg, 'setrepl');
    }
    /**
     * Generate a K1 alphabet where the keyword is in the source alphabet
     * @param keyword Keyword/keyphrase to map
     * @param offset Offset from the start of the alphabet to place the keyword
     */
    public genAlphabetK1(keyword: string, offset: number): void {
        const repl = this.genKstring(keyword, offset, this.getCharset());
        this.setReplacement(this.getSourceCharset(), repl);
    }
    /**
     * Generate a K2 alphabet where the keyword is in the destination alphabet
     * @param keyword Keyword/Keyphrase to map
     * @param offset Offset from the start of the alphabet to place the keyword
     */
    public genAlphabetK2(keyword: string, offset: number): void {
        const repl = this.genKstring(keyword, offset, this.getSourceCharset());
        this.setReplacement(repl, this.getCharset());
    }
    /**
     * Generate a K3 alphabet where both alphabets are the same using a Keyword
     * like a K1 or K2 alphabet, but both are the same alphabet order.
     * It is important to note that for a K3 alphabet you must have the same
     * alphabet for source and destination.  This means languages like Swedish
     * and Norwegian can not use a K3
     * @param keyword Keyword/Keyphrase to map
     * @param offset Shift of the destination alphabet from the source alphabet
     */
    public genAlphabetK3(keyword: string, offset: number): void {
        if (this.getCharset() !== this.getSourceCharset()) {
            const error = 'Source and encoding character sets must be the same';
            this.setErrorMsg(error, 'genk3');
            return;
        }
        this.setErrorMsg('', 'genk3');
        const repl = this.genKstring(keyword, 0, this.getCharset());
        const cset = repl.substr(offset) + repl.substr(0, offset);
        this.setReplacement(cset, repl);
    }
    /**
     * Generate a K4 alphabet where the keywords are different in each alphabet
     * @param keyword Keyword for the source alphabet
     * @param offset Offset for keyword in the source alphabet
     * @param keyword2 Keyword for the destination alphabet
     * @param offset2 Offset for the keyword in the destination alphabet
     */
    public genAlphabetK4(keyword: string, offset: number, keyword2: string, offset2: number): void {
        if (this.getCharset().length !== this.getSourceCharset().length) {
            const error = 'Source and encoding character sets must be the same length';
            this.setErrorMsg(error, 'genk4');
            return;
        }
        this.setErrorMsg('', 'genk4');
        const cset = this.genKstring(keyword, offset, this.getCharset());
        const repl = this.genKstring(keyword2, offset2, this.getSourceCharset());
        this.setReplacement(cset, repl);
    }
    /**
     * Map a keyword into an alphabet
     * keyword Keyword to map into the alphabet
     * offset Offset from the start of the alphabet to place the keyword
     */
    public genKstring(keyword: string, offset: number, alphabet: string): string {
        let unassigned = alphabet;
        let repl = '';

        // Go through each character in the source string one at a time
        // and see if it is a legal character.  if we have not already seen
        // it, then remove it from the list of legal characters and add it
        // to the output string
        for (let i = 0, len = keyword.length; i < len; i++) {
            const c = keyword.charAt(i).toUpperCase();
            // Is it one of the characters we haven't used?
            const pos = unassigned.indexOf(c);
            if (pos >= 0) {
                // we hadn't used it, so save it away and remove it from
                // the list of ones we haven't used
                repl += c;
                unassigned = unassigned.substr(0, pos) + unassigned.substr(pos + 1);
            }
        }
        // See if the replacement string happens to wrap around.
        if (repl.length + offset > alphabet.length) {
            const off = alphabet.length - offset;
            repl = repl.substr(off) + unassigned + repl.substr(0, off);
        } else {
            repl =
                unassigned.substr(unassigned.length - offset) +
                repl +
                unassigned.substr(0, unassigned.length - offset);
        }
        return repl;
    }
    /**
     * Gets a random replacement character from the remaining set of unassigned
     * characters
     */
    public getRepl(): string {
        const sel = Math.floor(Math.random() * this.unassigned.length);
        const res = this.unassigned.substr(sel, 1);
        this.unassigned = this.unassigned.substr(0, sel) + this.unassigned.substr(sel + 1);
        return res;
    }
    /**
     * Generates a random alphabet that doesn't respect the replacement rules for
     * matching characters.  This gets used for encoding the answer for testing
     * when they have solved the timed question.  It is deliberate to break the
     * rules in order to keep someone who hacks the code to see the test answer
     * and deciding that it might be an easier cipher to break than the one on the test.
     * @returns String of random replacement characters
     */
    public getRandomAlphabet(): string {
        let unassigned = this.getCharset();
        let result = '';
        while (unassigned.length > 1) {
            const sel = Math.floor(Math.random() * unassigned.length);
            result += unassigned.substr(sel, 1);
            unassigned = unassigned.substr(0, sel) + unassigned.substr(sel + 1);
        }
        return result;
    }
    /**
     *  Generates a random replacement set of characters
     */
    public genAlphabetRandom(): void {
        const charset = this.getCharset();
        this.unassigned = charset;
        let replacement = '';
        let pos = 0;

        while (this.unassigned.length > 1) {
            const orig = charset.substr(pos, 1);
            let repl = this.getRepl();
            // If the replacement character is the same as the original
            // then we just get another one and put the replacement back at the end
            // This is guaranteed to be unique
            if (orig === repl) {
                const newrepl = this.getRepl();
                this.unassigned += repl;
                repl = newrepl;
            }
            replacement += repl;
            pos++;
        }

        // Now we have to handle the special case of the last character
        if (charset.substr(pos, 1) === this.unassigned) {
            // Just pick a random spot in what we have already done and
            // swap it.  We are guaranteed that it won't be the last character
            // since it matches already
            const sel = Math.floor(Math.random() * replacement.length);
            replacement =
                replacement.substr(0, sel) +
                this.unassigned +
                replacement.substr(sel + 1) +
                replacement.substr(sel, 1);
        } else {
            replacement += this.unassigned;
        }
        this.setReplacement(this.getSourceCharset(), replacement);
    }
    /**
     * Determines if this generator is appropriate for a given test
     * type.  This default implementation just checks against the
     * list of valid tests declared by the class.
     * @param testType Test type to compare against
     * @param anyOperation Don't restrict based on the type of operation
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType, anyOperation: boolean): string {
        if (testType === ITestType.aregional) {
            if (this.state.cipherType === ICipherType.Patristocrat) {
                return 'Patristocrats not appropriate for Division A tests';
            }
            if (this.state.curlang === 'es') {
                return 'Xenocrypts not appropriate for Division A tests';
            }
        }
        if (testType !== ITestType.cregional && testType !== ITestType.cstate &&
            testType !== ITestType.bregional && testType !== ITestType.bstate && this.state.specialbonus) {
            return 'Special Bonus only allowed on Division B/C tests';
        }
        if (this.state.specialbonus && (
            this.state.cipherType === ICipherType.Aristocrat ||
            this.state.cipherType === ICipherType.Patristocrat ||
            this.state.cipherType === ICipherType.Xenocrypt
        )) {
            return 'Special Bonus not allowed for Aristocrats/Patristocrats/Xenocrypts';
        }
        if (!anyOperation) {
            // Make sure the operation type is legal.
            if (this.state.operation === 'keyword') {
                if (testType !== ITestType.cregional && testType !== ITestType.cstate) {
                    return 'Keyword/Key Phrase decoding not allowed for ' + this.getTestTypeName(testType);
                }
                if (this.state.encodeType !== 'k1' && this.state.encodeType !== 'k2' && this.state.encodeType !== 'k3') {
                    return 'Keyword/Key Phrase decoding not allowed with ' + this.state.encodeType.toUpperCase() + ' Alphabet for ' + this.getTestTypeName(testType);
                }
            } else {
                if (this.state.encodeType === 'k4') {
                    return this.state.encodeType.toUpperCase() + ' Alphabet not allowed for ' + this.getTestTypeName(testType);
                }
            }
        }

        if (this.state.operation === 'encode' && this.state.cipherType === ICipherType.NihilistSubstitution) {
            return 'Encode problems are not allowed on any tests'
        }

        if (testType === undefined || this.validTests.indexOf(testType) >= 0) {
            return '';
        }
        return 'Not valid for ' + this.getTestTypeName(testType);
    }

    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        const strings = this.genTestStrings(ITestType.None);

        let toanswer = 1;
        let solution: string[] = [];

        if (this.state.operation === 'keyword') {
            solution = this.state.keyword.toUpperCase().split('');
        } else {
            if (this.state.operation === 'encode') {
                toanswer = 0;
            }
            for (const strset of strings) {
                solution = solution.concat(strset[toanswer].split(''));
            }
        }

        return this.calculateScore(solution, answer, this.state.points);
    }

    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const strings = this.genTestStrings(testType);
        let answerclass = 'TOANSWER'
        let extraclass = '';
        if (testType === ITestType.aregional) {
            extraclass = ' atest';
        }

        if (this.state.operation === 'keyword') {
            answerclass = 'TOANSWERK'

            const keyanswer = this.state.keyword.toUpperCase();
            let keytype = "Keyword";
            if (this.minimizeString(keyanswer).length !== keyanswer.length) {
                keytype = "Key Phrase"
            }
            // Don't put the answer text on the tiny answerkey
            result.append(
                $('<h3/>', { class: "notiny" }).text(keytype + " Answer:")
            );
            result.append(
                $('<div/>', {
                    class: 'TOANSWER' + extraclass,
                }).text(keyanswer)
            );
            result.append($('<hr/>'));

        }
        let tosolve = 0;
        let toanswer = 1;
        if (this.state.operation === 'encode') {
            tosolve = 1;
            toanswer = 0;
        }
        for (const strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE' + extraclass,
                }).text(strset[tosolve])
            );
            result.append(
                $('<div/>', {
                    class: answerclass + extraclass,
                }).text(strset[toanswer])
            );
        }
        if (this.state.cipherType === ICipherType.Patristocrat) {
            result.append(
                $('<div/>', {
                    class: 'origtext',
                }).text(this.state.cipherString)
            );
        }
        // Tapcode does not need a frequency table (and periods can not be raised to upper case).
        if (this.state.cipherType !== ICipherType.TapCode) {
            result.append(this.genFreqTable(true, this.state.encodeType, extraclass));
        }
        // If this is a xenocrypt and they provided us a translation, display it
        if (
            this.state.curlang !== 'en' &&
            this.state.translation !== undefined &&
            this.state.translation !== ''
        ) {
            // Don't put the translation on the tiny answer key
            result.append(
                $('<div/>', { class: "notiny" })
                    .text('Translation: ')
                    .append($('<em/>').text(this.state.translation))
            );
        }
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     * @param testType Type of test
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const strings = this.genTestStrings(testType);
        let extraclass = '';
        if (testType === ITestType.aregional) {
            extraclass = ' atest';
        }

        // When doing a keyword, they need to put the answer in the boxes
        if (this.state.operation === 'keyword') {
            const keyanswer = this.state.keyword.toUpperCase();
            let keytype = "Keyword";
            if (this.minimizeString(keyanswer).length !== keyanswer.length) {
                keytype = "Key Phrase"
            }
            result.append(
                $('<p/>').append($("<b/>").text("Enter the " + keytype + " here"))

            )
            const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
            const rowanswer = table.addBodyRow();

            for (let i = 0; i < keyanswer.length; i++) {
                const c = keyanswer.charAt(i);
                if (this.isValidChar(c)) {
                    rowanswer.add({
                        settings: { class: 'e v' },
                        content: '&nbsp;',
                    });
                } else {
                    rowanswer.add(c);
                }
            }
            result.append(table.generate());
            result.append($('<p/>').append($("<b/>").text("Cipher:")))
        }
        for (const strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVEQ' + extraclass,
                }).text(strset[0])
            );
        }
        result.append(this.genFreqTable(false, this.state.encodeType, extraclass));
        return result;
    }
    /**
     * Generate the HTML to display the interactive form of the cipher.
     * For the interactive cipher, there are three types of fields
     *   Answer Fields - indicated by ID Iq_n where q is the question number and n is the field number
     *   Replacement Fields - Indicated by ID Rq_n where q is the question number and n is the field number
     *           Replacement fields are typically use for the replacement table or the over field for vigenere/baconian ciphers
     *   Separator Fields - Indicated by ID Sq_n where q is the question number and n is the field number
     *   General cells - indated by a class of Sn where n is the field number
     *  Some notes about how they work
     *   When the separator is clicked (Sq_n) then all of the fields with the Sn class are toggled
     *   When the answer is the Keyword/Key Phrase, then the replacement fields for the frequency table are offset by the number of fields in the cipher
     *   
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        const strings = this.genTestStrings(testType);
        let extraclass = '';
        if (testType === ITestType.aregional) {
            extraclass = ' atest';
        }

        const qnumdisp = String(qnum + 1);
        let idclass = 'I' + qnumdisp + '_';
        const spcclass = 'S' + qnumdisp + '_';
        const result = $('<div/>', { id: 'Q' + qnumdisp });
        let inputoffset = 0;
        let cipherinputclass = 'awc';
        // If we are doing a keyword, then we have to have a separate answer set of fields
        if (this.state.operation === 'keyword') {
            const keyanswer = this.state.keyword.toUpperCase();
            let keytype = "Keyword";
            if (this.minimizeString(keyanswer).length !== keyanswer.length) {
                keytype = "Key Phrase"
            }
            result.append(
                $('<p/>').append($("<b/>").text("Enter the " + keytype + " here"))

            )
            const table = new JTTable({ class: 'SOLVER' + extraclass });
            const rowanswer = table.addBodyRow();

            for (let i = 0; i < keyanswer.length; i++) {
                const c = keyanswer.charAt(i);
                const spos = String(i);
                if (this.isValidChar(c)) {
                    rowanswer.add({
                        settings: { class: 'S' + spos },
                        content: $('<input/>', {
                            id: idclass + spos,
                            class: cipherinputclass,
                            type: 'text',
                        }),
                    });
                } else {
                    rowanswer.add({
                        settings: { class: 'TOSOLVEC' },
                        content: c,
                    });
                }
            }
            result.append(table.generate());
            cipherinputclass = 'awr'
            idclass = 'R' + qnumdisp + '_';
            inputoffset = this.getCharset().length;
            result.append($('<p/>').append($("<b/>").text("Cipher:")));
        }

        let pos = 0;
        // Since we already have the lines spit exactly as they would be on the printed test,
        // go through and generate a table with one cell per character.
        const table = new JTTable({ class: 'SOLVER' });
        for (const strset of strings) {
            const qrow = table.addBodyRow();
            const arow = table.addBodyRow();
            for (const c of strset[0]) {
                let extraclass = '';
                const spos = String(pos + inputoffset);

                // For a Patristocrat, we need to give them the ability to insert/remove word space indicators
                // We do this by putting a class on the cell which we will add/remove a spacing class at runtime
                // in response to them clicking on a separator indicator (a downward V)
                if (this.state.cipherType == ICipherType.Patristocrat && this.isValidChar(c)) {
                    extraclass = 'S' + spos;
                    const field = $('<div/>')
                        .append($('<div/>', { class: 'ir', id: spcclass + spos }).html('&#711;'))
                        .append(c);

                    qrow.add({ settings: { class: 'TOSOLVEC ' + extraclass }, content: field });
                } else {
                    qrow.add({ settings: { class: 'TOSOLVEC' }, content: c });
                }
                if (this.isValidChar(c)) {
                    arow.add({
                        settings: { class: extraclass },
                        content: $('<input/>', {
                            id: idclass + spos,
                            class: cipherinputclass,
                            type: 'text',
                        }),
                    });
                } else {
                    arow.add('');
                }
                pos++;
            }
        }
        result.append(table.generate());
        // Do we need the check solution for a timed question?
        if (qnum === -1) {
            result.append(
                $('<button/>', {
                    type: 'button',
                    class: 'button large rounded centered',
                    id: 'checktimed',
                }).text('Checked Timed Question')
            );
        }

        result.append(this.genInteractiveFreqTable(qnum, this.state.encodeType, extraclass));
        result.append($('<textarea/>', { id: 'in' + qnumdisp, class: 'intnote' }));
        return result;
    }

    public genTestStrings(testType: ITestType): string[][] {
        this.genAlphabet();
        let width = this.maxEncodeWidth;
        if (testType === ITestType.aregional) {
            width -= 20;
        }

        const strings = this.makeReplacement(this.getEncodingString(), width);
        return strings;
    }

    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.  This returns the result
     * as the HTML to be displayed
     */
    public build(): JQuery<HTMLElement> {
        const result = $('<div/>');

        // Provide correct guidance message as to which line is
        // plain text and which is cipher text.
        let topLine = ' Cipher Text is on ';
        let highlightedLine = ' Plain Text is ';
        if (this.state.operation === 'encode') {
            topLine = ' Plain Text is on ';
            highlightedLine = ' Cipher Text is ';
        }

        result.append(
            $('<div/>', {
                class: 'callout small success',
            })
                .text('Note:')
                .append(topLine)
                .append(
                    $('<span/>', {
                        class: 'TOSOLVE',
                    }).text('top line')
                )
                .append(',')
                .append(highlightedLine)
                .append(
                    $('<span/>', {
                        class: 'TOANSWER',
                    }).text('highlighted')
                )
        );
        result.append(this.genAnswer(ITestType.None));
        return result;
    }
    public getEncodingString(): string {
        let str = this.cleanString(this.state.cipherString.toUpperCase());
        /*
         * If it is characteristic of the cipher type (e.g. patristocrat),
         * rebuild the string to be encoded in to five character sized chunks.
         */
        if (this.state.cipherType === ICipherType.Patristocrat) {
            str = this.chunk(str, 5);
        }
        return str;
    }

    /**
     * Generates the HTML code for allowing an encoder to select the alphabet type
     * along with specifying the parameters for that alphabet
     */
    public createAlphabetType(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });

        const radiobuttons = [
            { id: 'encrand', value: 'random', title: 'Random' },
            { id: 'enck1', value: 'k1', title: 'K1' },
            { id: 'enck2', value: 'k2', title: 'K2' },
            { id: 'enck3', value: 'k3', title: 'K3' },
            { id: 'enck4', value: 'k4', title: 'K4' },
        ];
        result.append(
            $('<div/>', {
                class: 'cell',
            }).text('Alphabet Type')
        );
        let kwButton = $('<div/>', { class: 'cell shrink' }).append($("<button/>", {
            type: "button",
            id: "genkeyword",
            class: "rounded button",
        }).html("Suggest Keyword"));
        let randButton = $('<div/>', { class: 'cell shrink' }).append($("<button/>", {
            type: "button",
            id: "randomize",
            class: "rounded button",
        }).html("Randomize"));

        let knButtons = JTRadioButton(-1, 'enctype', radiobuttons, this.state.encodeType);
        knButtons.addClass("grid-margin-x")
        knButtons.append(randButton).append(kwButton);
        result.append(knButtons);
        result.append(JTFLabeledInput('Keyword', 'text', 'keyword', this.state.keyword, 'kval'));
        result.append(
            JTFIncButton('Offset', 'offset', this.state.offset, 'kval small-12 medium-6 large-6')
        );
        result.append(
            JTFLabeledInput('Keyword 2', 'text', 'keyword2', this.state.keyword2, 'k4val')
        );
        result.append(
            JTFIncButton(
                'Offset 2',
                'offset2',
                this.state.offset2,
                'k4val small-12 medium-6 large-4'
            )
        );
        return result;
    }
    public clearErrors(): void {
        //     $(".err").empty();
    }
    /**
     * Updates/clears a specific message on the output. If
     * @param message Message to set (blank to clear the message)
     * @param id ID of the message to update/clear
     * @param extra Additional data for the messge if not blank
     */
    public setErrorMsg(message: string, id: string, extra?: JQuery<HTMLElement>): void {
        let espot = $('.err').find('[data-msg=' + id + ']');
        if (message === undefined || message === '' || message === null) {
            // We are removing the message
            if (espot.length !== 0) {
                // It did exist so make it go away
                espot.remove();
                const children = $('.err').children();
                // Did that empty out the error section?
                if (
                    children.length === 0 ||
                    (children.length === 1 && children.children().length === 0)
                ) {
                    // If so, then wipe it out completely.
                    $('.err').empty();
                }
            }
        } else {
            // We are setting the message
            if (espot.length === 0) {
                // See if we need to create the alert div
                if ($('.err').children().length === 0) {
                    $('.err').append(
                        $('<div/>', {
                            class: 'callout alert',
                        })
                    );
                }
                espot = $('.err')
                    .children()
                    .append(
                        $('<div/>', { 'data-msg': id })
                            .text(message)
                            .append(extra)
                    );
            } else {
                espot
                    .empty()
                    .text(message)
                    .append(extra);
            }
        }
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        const quoteData = this.analyzeQuote(this.state.cipherString);
        this.clearErrors();
        this.genAlphabet();
        const res = this.build();
        $('#answer')
            .empty()
            .append(res);


        let statusText = '';
        if (!isNaN(quoteData.chi2)) {
            // Let them know the Chi-Square value and an indication of how hard it is
            statusText = `Chi-Square=${quoteData.chi2.toFixed()}`;
            if (quoteData.chi2 < 20) {
                statusText += ' [Easy]';
            } else if (quoteData.chi2 < 30) {
                statusText += ' [Medium]';
            } else if (quoteData.chi2 < 40) {
                statusText += ' [Medium Hard]';
            } else if (quoteData.chi2 < 50) {
                statusText += ' [Difficult]';
            } else {
                statusText += ' [Extremely Difficult]';
            }
            // As well as an assessment of the length
            statusText += ' Length=' + quoteData.len;
            if (quoteData.len < 60) {
                statusText += ' [Too Short]';
            } else if (quoteData.len < 80) {
                statusText += ' [Short]';
            } else if (quoteData.len > 120) {
                statusText += ' [Too Long]';
            } else if (quoteData.len > 100) {
                statusText += ' [Long]';
            }
            // And the numer of unique characters
            statusText += ` Unique=${quoteData.unique}`
            if (quoteData.unique < 19) {
                statusText += ` [Recommend >18]`
            }
        }

        $('#chi').text(statusText);
        this.validateQuestion();
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }

    public makeFreqEditField(c: string): JQuery<HTMLElement> {
        const einput = $('<span/>', {
            type: 'text',
            'data-char': c,
            id: 'm' + c,
        });
        return einput;
    }
    public genQuestionFields(result: JQuery<HTMLElement>): void {
        result.append(this.createIsModifiedDlg());

        const inputbox = $('<div/>', { class: 'grid-x grid-margin-x' });
        inputbox.append(
            JTFLabeledInput(
                'Points',
                'number',
                'points',
                this.state.points,
                'small-12 medium-3 large-3'
            )
        );

        // We don't allow any of the Aristocrat types to be a special bonus question
        if (this.state.cipherType !== ICipherType.Aristocrat &&
            this.state.cipherType !== ICipherType.Patristocrat &&
            this.state.cipherType !== ICipherType.Xenocrypt) {
            inputbox.append(
                JTFLabeledInput(
                    'Special Bonus',
                    'checkbox',
                    'spbonus',
                    this.state.specialbonus,
                    'small-12 medium-9 large-9'
                )
            );
        }
        result.append(inputbox);
        result.append(
            JTFLabeledInput(
                'Question Text',
                'richtext',
                'qtext',
                this.state.question,
                'small-12 medium-12 large-12'
            )
        );
        result.append(
            JTFLabeledInput(
                'Quote Author',
                'text',
                'qauthor',
                this.state.author,
                'small-12 medium-12 large-12'
            )
        );
        result.append(this.createQuestionTextDlg());
        result.append(this.createPointsDlg());
    }
    public genEncodeField(result: JQuery<HTMLElement>): void {
        result.append(
            JTFLabeledInput(
                'Plain Text',
                'textarea',
                'toencode',
                this.state.cipherString,
                'small-12 medium-12 large-12 encbox'
            )
        );
        result.append($('<div/>', { class: 'difficulty' }));
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);
        const radiobuttons = [
            { id: 'mrow', value: 'decode', title: 'Decode' },
            { id: 'crow', value: 'keyword', title: 'Keyword/Key Phrase' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));
        result.append(this.createMisspellDlg())
        result.append(this.createKeywordDlg('Suggest Keyword'))
        this.genQuestionFields(result);
        this.genLangDropdown(result);
        this.genEncodeField(result);
        result.append(
            JTFLabeledInput(
                'Translation',
                'textarea',
                'translated',
                this.state.translation,
                'small-12 medium-12 large-12'
            )
        );
        result.append(this.createAlphabetType());
        return result;
    }
    public copyToClip(str: string): void {
        function listener(e): void {
            e.clipboardData.setData('text/html', str);
            e.clipboardData.setData('text/plain', str);
            e.preventDefault();
        }
        document.addEventListener('copy', listener);
        document.execCommand('copy');
        document.removeEventListener('copy', listener);
    }

    /**
     * Generates a dialog showing the sample question text
     */
    public createQuestionTextDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');
        dlgContents.append($('<div/>', { id: 'sqtext', class: '' }));
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'sqtcpy button' }).text('Copy to Clipboard'))
                .append($('<a/>', { class: 'sqtins button' }).text('Replace Question Text'))
                .append($('<a/>', { class: 'secondary button', 'data-close': '' }).text('Close'))
        );
        const questionTextDlg = JTFDialog('SampleQText', 'Sample Question Text', dlgContents);
        return questionTextDlg;
    }
    /**
     * Generates a dialog showing the sample question points
     */
    public createPointsDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');
        dlgContents.append($('<div/>', { id: 'sptext', class: '' }));
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'sqtpnts button', id: 'spval' }).text('Set Points'))
                .append($('<a/>', { class: 'secondary button', 'data-close': '' }).text('Close'))
        );
        const pointsDlg = JTFDialog('SamplePoints', 'Suggested Points Value', dlgContents);
        return pointsDlg;
    }
    /**
     * Generates a dialog showing the sample question text
     */
    public createIsModifiedDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');
        dlgContents.append(
            $('<input>').attr({
                type: 'hidden',
                id: 'targeturl',
                name: 'targeturl',
            })
        );
        // dlgContents.append($('<div/>', { id: 'sqtext', class: '' }));
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'msave button' }).text('Save and Continue'))
                .append($('<a/>', { class: 'mlose button' }).text('Abandon Changes'))
                .append(
                    $('<a/>', { class: 'secondary button', 'data-close': '' }).text(
                        'Continue Editing'
                    )
                )
        );
        const questionTextDlg = JTFDialog('modifiedDLG', 'You have made changes!', dlgContents);
        return questionTextDlg;
    }
    /**
     * Generate a dialog showing the choices for potential keywords
     */
    public createSuggestKeyDlg(title: string): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');

        const xDiv = $('<div/>', { class: 'grid-x' })
        dlgContents.append(xDiv);
        dlgContents.append($('<div/>', { class: 'callout primary', id: 'suggestKeyopts' }))
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'button', id: 'genbtn' }).text('Generate'))
                .append(
                    $('<a/>', { class: 'secondary button', 'data-close': '' }).text(
                        'Cancel'
                    )
                )
        );
        const suggestKeyDlg = JTFDialog('suggestKeyDLG', title, dlgContents);
        return suggestKeyDlg;
    }
    /**
     * Generates a dialog showing the sample question text
     */
    public createMisspellDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');

        dlgContents.append(JTFLabeledInput('Word Replacement', 'slider', 'wordrepl', 0, 'small-12 medium-12 large-12', "None", "All"));
        dlgContents.append(JTFLabeledInput('Typos', 'slider', 'typos', 0, 'small-12 medium-12 large-12', "None", "Extreme"));
        dlgContents.append($('<div/>', { class: 'callout primary', id: 'misspellopts' }))
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'mgen button', id: 'mispgenbtn' }).text('Generate'))
                .append(
                    $('<a/>', { class: 'secondary button', 'data-close': '' }).text(
                        'Cancel'
                    )
                )
        );
        const questionTextDlg = JTFDialog('MisspellDLG', 'Create Misspelled Quote', dlgContents);
        return questionTextDlg;
    }
    /**
     * Generates a dialog showing the sample question text
     */
    public createKeywordDlg(title: string = 'Suggest Keyword'): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');

        dlgContents.append($('<div/>', { class: 'callout primary', id: 'keywordss' }))
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'button', id: 'keygenbtn' }).text('Regenerate'))
                .append(
                    $('<a/>', { class: 'secondary button', 'data-close': '' }).text(
                        'Cancel'
                    )
                )
        );
        const questionTextDlg = JTFDialog('keywordDLG', title, dlgContents);
        return questionTextDlg;
    }

    /**
     * Check to see if the current cipher has been modified and give them
     * an opportunity to save if it has.
     * @param targetURL URL to jump to if not modified
     * @returns boolean indicating whether or not it is modified.
     */
    public checkModified(targetURL: string): boolean {
        if (this.isModified) {
            $('#targeturl').val(targetURL);
            $('#modifiedDLG').foundation('open');
            return true;
        }
        return false;
    }
    /**
     * Generate hint information about where a crib is located or other
     * Attribute of a cipher.
     * @returns Any hint information 
     */
    public genSampleHint(): string {
        return undefined;
    }
    /**
     * Load any data necessary for computing the scoring.  Since this
     * may take some time to pull a file from the server, this gets done
     * before starting any scoring operations
     * @returns Promise indicating that the language has been loaded
     */
    public prepGenScoring(): Promise<boolean> {
        if (this.state.cipherType === ICipherType.Aristocrat ||
            this.state.cipherType === ICipherType.Patristocrat ||
            this.state.cipherType === ICipherType.Xenocrypt) {
            return this.loadLanguageDictionary(this.state.curlang);
        }
        return new Promise<boolean>((resolve, reject) => { resolve(true) })
    }
    /**
     * Compute the score ranges for an Aristocrat/Patristocrat/Xenocrypt
     * @returns suggestedData containing score ranges
     */
    public genAristocratScoreRangeAndText(str: string): suggestedData {
        const qrecord = this.computeStats(this.state.curlang, str);
        let result: suggestedData = { suggested: qrecord.recommendedScore, min: qrecord.minscore, max: qrecord.maxscore, text: '' }

        if (qrecord.len === 0) {
            result.text = '<b>You need to enter a quote in in the Plain Text order to get a recommendation for the score</b>';
        } else if (qrecord.len < 65) {
            result.text = "<b>The Plain Text quote is too short to get a recomendation</b>";
        } else {
            if (qrecord.unique < 16) {
                result.text += `<b>The Plain Text only has ${qrecord.unique} unique characters.
            It should have at least 19 unique character in order to get a good recommendation</b>`
            }
            result.text += `<p>Based on analysis of the cipher which includes examining the cipher text for 
 the Chi-Square (χ2) distribution of letters,
 grade level of the text,
 number of unknown words,
 commonality of words,
 and commonness of pattern words`
            //==========================
            // Make adjustments based on the current cipher
            let adjust = 0
            // Patristocrats automatically get 300 extra points
            if (this.state.cipherType === ICipherType.Patristocrat) {
                adjust += 250;
                result.text += ". Encoding as a Patristocrat adds 250 points";
            } else if (this.state.cipherType === ICipherType.Xenocrypt || this.state.curlang !== 'en') {
                adjust += 300;
                result.text += ". Because it is a Xenocrypt, it adds 300 points";
            }
            if (this.state.operation === 'keyword') {
                if (this.state.encodeType === 'k3') {
                    adjust += 150;
                    result.text += ". Asking for a K3 alphabet keyword or key phrase adds 150 points"
                } else {
                    adjust += 100;
                    result.text += ". Asking for a keyword or key phrase adds 100 points"
                }
            } else if (this.state.encodeType === 'k1') {
                adjust -= 100;
                result.text += ". A K1 alphabet takes away 100 points"
            } else if (this.state.encodeType === 'k2') {
                adjust -= 75;
                result.text += ". A K2 alphabet takes away 75 points"
            } else if (this.state.encodeType === 'k3') {
                adjust += 75;
                result.text += ". A K3 alphabet adds 75 points"
            }
            // If we have a single letter word and A maps to I or I maps to A, that give them an extra 25 points of hints
            this.genAlphabet();
            if (qrecord.minlength === 1 && (this.state.replacement['I'] === 'A' || this.state.replacement['A'] === 'I')) {
                adjust -= 25
                result.text += `. A single letter A/I which maps to A/I makes it 25 points easier`
            }
            // Make sure we get within the range of 150 to 700 for the final score
            if ((qrecord.minscore + adjust) < 150) {
                adjust = 150 - qrecord.minscore
            }
            if ((qrecord.maxscore + adjust) > 700) {
                adjust = 700 - qrecord.maxscore
            }
            result.suggested += adjust
            result.max += adjust
            result.min += adjust
            let rangeText = ''
            if (result.max > result.min) {
                rangeText = ` out of a <em>suggested range of ${result.min} to ${result.max}</em>`
            }
            result.text += `, try a score of ${result.suggested}${rangeText}.</p>
<p>
  <b>NOTE:</b><em>If you provide any hints in the question,
        you will want to adjust the score down by approximately 20 points per letter hinted</em></p>`

        }
        return result;
    }
    /**
     * Generate the recommended score and score ranges for a cipher
     * @returns Computed score ranges for the cipher and text description
     */
    public genScoreRangeAndText(): suggestedData {
        if (this.state.cipherType === ICipherType.Aristocrat ||
            this.state.cipherType === ICipherType.Patristocrat ||
            this.state.cipherType === ICipherType.Xenocrypt) {
            return this.genAristocratScoreRangeAndText(this.state.cipherString);
        }

        let text = `<p><b>Unable to make a recommended score at this time.</b></p>`
        return { suggested: 0, min: 0, max: 0, text: text }
    }
    /**
     * Get the reference to the author for a quote
     * @returns Reference to the author (if any) for the quote
     */
    public genAuthor(): string {
        if (this.state.author !== undefined && this.state.author !== '') {
            return ` by ${this.state.author}`
        }
        return ''
    }
    /**
     * Generates the sample question text for a cipher
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {
        const hint = this.genSampleHint();
        let hinttext = hint !== undefined ? ` You are told that ${hint}` : '';
        let enctype = ''
        if (this.state.encodeType !== undefined && this.state.encodeType !== 'random') {
            enctype += ' ' + this.state.encodeType.toUpperCase();
        }
        if (this.state.curlang === 'es') {
            if (enctype !== '') {
                hinttext += ` It has been encoded using a${enctype} alphabet using an English keyword.`
            }
            return (
                `<p>A quote${this.genAuthor()} in Spanish has been encoded using the ` +
                `${this.cipherName} Cipher for you to decode.${hinttext}</p>`
            );
        }
        let cipherName = this.cipherName
        if (this.state.cipherType === ICipherType.Patristocrat) {
            cipherName = 'Patristocrat'
        }
        let operationtext = ''
        if (this.state.operation === 'keyword') {
            let keytype = "Keyword";
            const keyanswer = this.state.keyword.toUpperCase();
            if (this.minimizeString(keyanswer).length !== keyanswer.length) {
                keytype = "Key Phrase"
            }
            operationtext = ` What was the${enctype} ${keytype} used to encode it?`
        }
        return (
            `<p>A quote${this.genAuthor()} has been encoded using the${enctype} ` +
            `${cipherName} Cipher for you to decode.${hinttext}${operationtext}</p>`
        );
    }
    /**
     * Determine what to tell the user about how the score has been computed
     * This is specific to Aristocrats/Patristocrats and Xenocrypts
     * @param suggesteddata Data calculated for the score range
     * @returns HTML String to display in the suggested question dialog
     */
    public genAristocratPointsText(suggesteddata: suggestedData): string {
        let qrecord = suggesteddata.private as QuoteRecord
        if (qrecord.len === 0) {
            return "<b>You need to enter a quote in in the Plain Text order to get a recommendation for the score</b>"
        }
        if (qrecord.len < 65) {
            return "<b>The Plain Text quote is too short to get a recomendation</b>";
        }
        if (qrecord.unique < 16) {
            return `<b>The Plain Text only has ${qrecord.unique} unique characters.
            It should have at least 19 unique character in order to get a good recommendation</b>`
        }
        let rangeText = ''
        if (suggesteddata.max > suggesteddata.min) {
            rangeText = ` out of a <em>suggested range of ${suggesteddata.min} to ${suggesteddata.max}</em>`
        }
        let result = `<p>Based on analysis of the cipher which includes examining the cipher text for 
 the Chi-Square (χ2) distribution of letters,
 grade level of the text,
 number of unknown words,
 commonality of words,
 and commonness of pattern words`
        if (this.state.cipherType === ICipherType.Patristocrat) {
            result += ". Encoding as a Patristocrat adds 250 points";
        } else if (this.state.cipherType === ICipherType.Xenocrypt) {
            result += ". Because it is a Xenocrypt, it adds 300 points";
        }
        if (this.state.operation === 'keyword') {
            result += ". Asking for a keyword or key phrase adds 100 points"
        } else if (this.state.encodeType === 'k1') {
            result += ". A K1 alphabet takes away 100 points"
        } else if (this.state.encodeType === 'k2') {
            result += ". A K2 alphabet takes away 75 points"
        }
        result += `, try a score of ${suggesteddata.suggested}${rangeText}.</p>
<p>
  <b>NOTE:</b><em>If you provide any hints in the question,
        you will want to adjust the score down by approximately 20 points per letter hinted</em></p>`
        return result;
    }
    /**
     * Determine what to tell the user about how the score has been computed
     * @param suggesteddata Data calculated for the score range
     * @returns HTML String to display in the suggested question dialog
     */
    public genSamplePointsText(suggesteddata: suggestedData): string {
        if (this.state.cipherType === ICipherType.Aristocrat ||
            this.state.cipherType === ICipherType.Patristocrat ||
            this.state.cipherType === ICipherType.Xenocrypt) {
            return this.genAristocratPointsText(suggesteddata)
        }
        let rangeText = ''
        if (suggesteddata.max > suggesteddata.min) {
            rangeText = ` out of a <em>suggested range of ${suggesteddata.min} to ${suggesteddata.max}</em>`
        }
        return (`<p>Based on analysis of the cipher, try a score of ${suggesteddata.suggested}${rangeText}.</p>`)
    }
    /**
     * Populate the Sample Question Text Dialog and show it
     */
    public showSampleQuestionText(): void {
        $('#sqtext')
            .empty()
            .append($(this.genSampleQuestionText()));
        $('#SampleQText').foundation('open');
    }
    /**
     * Populate the Sample Points dialog and show it
     */
    public async showSamplePoints() {
        this.prepGenScoring().then(() => {
            let suggestedScore = this.genScoreRangeAndText();
            // Remember the default score for when they set it
            $('#spval').attr('data-points', suggestedScore.suggested);
            let title = `Suggested Points: ${suggestedScore.suggested}`
            $('#SamplePoints .dlgtitle').text(title);

            $('#sptext')
                .empty()
                .append(suggestedScore.text)
            $("#SamplePoints").foundation('open');
        })
    }
    public genMonoText(str: string): string {
        return (
            '<span style="font-family:\'Courier New\', Courier, monospace;">' +
            '<strong>' +
            str +
            '</strong></span>'
        );
    }
    /**
     * Copy the sample question to the clipboard
     */
    public copySampleQuestionText(): void {
        this.copyToClip($('#sqtext').html());
        $('#SampleQText').foundation('close');
    }
    /**
     * Replace the question text with what was suggested
     */
    public replaceQuestionText(): void {
        this.markUndo(null)
        this.setQuestionText($('#sqtext').html());
        this.updateQuestionsOutput();
        $('#SampleQText').foundation('close');
    }
    /**
     * Update the score value with what was suggested in the dialog
     */
    public replaceScoreValue(): void {
        const points = Number($('#spval').attr('data-points'));
        if (points !== this.state.points) {
            this.markUndo('points');
            this.state.points = points;
            this.updateQuestionsOutput();
        }
        $('#SamplePoints').foundation('close')
    }
    /**
     * Start the process of generating the misspelled words
     */
    public genMisspell(): void {
        this.checkRepl();
        // Start out the dialog with some hints and ready to populate.
        $('#misspellopts').empty().append($('<p/>').text(`First select the level of Word Replacements and typos and then click generate`))
        $('#mispgenbtn').text('Generate')
        this.prepGenScoring().then(() => {
            $('#MisspellDLG').foundation('open')
        })
    }
    /**
     * See if they have the sliders off the zero spot so that we can actually generate something
     */
    public checkRepl(): void {
        const wordrepl = parseInt($('#wordrepl').val() as string)
        const typos = parseInt($('#typos').val() as string)
        if (wordrepl > 0 || typos > 0) {
            $(".mgen").removeAttr('disabled')
        } else {
            $(".mgen").attr('disabled', 'disabled')
        }
    }
    /**
     * Generate a single misspelled/typo quote
     * @param replace Homonym replacement information
     * @param wordrepl Range of number of words to replace (0-100%)
     * @param typos Range of number of typos to introduce (0-100%)
     * @returns HTML String (<em></em> around changes) of a generate string
     */
    public makeOneMisspell(replace: replaceInfo, wordrepl: number, typos: number): string {
        // Limit how many words we will attack at the extreme range
        const typoMaxPct = 0.85

        let result: string[] = []
        let typoChoices: number[] = []
        // Figure out where we will allow typos.  Initially it is everywhere, but we will drop out any of the
        // word replacements (unless we are on the extreme typo range > 90%) and of course single letter words don't
        // get typos.  At the same time we need to build the default final output
        const doTypoReplacements = typos > 90
        for (let i = 0; i < replace.words.length; i++) {
            const ent = replace.words[i]
            result.push(ent.full)
            if (ent.base.length > 1) {
                typoChoices.push(i)
            }
        }

        // Do we have any word replacements we want to do?
        if ((replace.replaceables.length) > 0 && (wordrepl > 0)) {
            // The number we do is approximately the percentage of total potential replacements (with a little randomness tossed in)
            let toReplace = Math.min(Math.round((replace.replaceables.length * wordrepl / 100) + Math.random() - 0.5), replace.replaceables.length)
            // Make sure that we will at least attempt to replace something if they gave us a non-zero typos choice
            if (toReplace === 0 && typos === 0) {
                toReplace = 1;
            }
            // We know how many we are going to replace.  Let's build a list of candidates
            // This is a list of 0 to <n> of typo choices which is an index into the array of replacables
            // For as many replacements that we picked, we will be picking a random slot in this
            // array and then removing it.  Note that we don't bother to optimize the case where
            // we do them all since the algorithm will just end up picking them out in random order
            // but still go through them all
            const replChoices = Array.from({ length: replace.replaceables.length }, (_, index) => index);

            for (let i = 0; i < toReplace; i++) {
                // Pick a random slot 
                let randSlot = Math.trunc(Math.random() * replChoices.length)
                // Take the slot out of the running for the next round
                replChoices.splice(randSlot, 1);
                // Get the entry that we are going to replace
                const replChoice = replace.replaceables[randSlot]
                // Now we have to pick out of the entries
                let randSlotChoice = Math.trunc(Math.random() * replChoice.replacements.length)
                let newText = '<em>' + replChoice.replacements[randSlotChoice] + '</em>'
                // Carry over any punctuation from the string
                newText += replace.words[replChoice.word].punct
                // Also, if the first character of the original was uppercase, we want
                // to uppercase the first letter of the newText
                let firstc = replace.words[replChoice.word].full.charAt(0)
                if (firstc === firstc.toUpperCase()) {
                    newText = newText.charAt(0).toUpperCase() + newText.slice(1)
                }
                // We have what we want to generate, so put it in the output slot
                result[replChoice.word] = newText
                // And remove the slot from being a typo if we aren't going to the extreme on typos
                if (!doTypoReplacements) {
                    typoChoices[replChoice.word] = undefined
                }
                // Do the same for any double word replacements
                if (replChoice.slots === 2) {
                    result[replChoice.word + 1] = ''
                    if (!doTypoReplacements) {
                        typoChoices[replChoice.word + 1] = undefined
                    }
                }
            }
        }
        if (typos > 0) {
            // We need to figure out how many words we are replacing.
            // Even in the extreme case, we really don't want to touch more than 85% of the words in the phrase
            // We also need to eliminate all of the undefined entries which we already replaced
            typoChoices = typoChoices.filter((value): value is number => value !== undefined);

            let toTypo = Math.min(Math.round((typoChoices.length * typos * typoMaxPct / 100) + Math.random() - 0.5), Math.min(typoMaxPct * typoChoices.length))
            for (let i = 0; i < toTypo; i++) {
                // Pick a random slot 
                let randSlot = Math.trunc(Math.random() * typoChoices.length)
                // Take the slot out of the running for the next round
                typoChoices.splice(randSlot, 1);
                // Get the word that we are going to play with
                let word = replace.words[randSlot].base
                if (word.length < 2) {
                    continue;
                }
                // We have a choice of what to do with it.
                //  1) Swap the last two letters       i.e. the => teh, that => thta  70%
                let swapLastTwo = Math.random() > 0.70
                //  2) Remove duplicate letters        i.e. common => comon           50%
                const dupRegex = /([a-z])\1/
                let removeDup = dupRegex.test(word) && Math.random() > 0.50
                //  3) Duplicate L or M in the middle  i.e. melon => mellon           20%
                const lmRegex = /(..)([lm])(.)/
                let removeLM = lmRegex.test(word) && Math.random() > 0.20
                //  4) swap ie                         i.e. piece => peice            40%
                const ieRegex = /ie/
                let swapIE = ieRegex.test(word) && Math.random() > 0.40
                //  5) Swap the first two letters      i.e. the => hte                20%
                let swapFirstTwo = Math.random() > 0.20
                // TODO: Consider other options like
                //     join two words eliminating any spaces
                //     split a long word in half

                // If we have nothing then we want to at least do the first one
                if (!swapLastTwo && !removeDup && !removeLM && !swapIE && !swapFirstTwo) {
                    if (Math.random() > 0.80) {
                        swapLastTwo = true
                    } else {
                        swapFirstTwo = true
                    }
                }
                // Ok we have our options to choose from.  We need to pick at least one, but if we 
                // are at the extreme we may pick a second one 20% of the time
                let needed = (typos > 85) ? 2 : 1
                if (swapLastTwo) {
                    needed--
                    const last = word.length - 1;
                    // Swapped last two letters
                    word = word.substring(0, last - 1) + word.charAt(last) + word.charAt(last - 1);
                }
                if (needed && removeDup) {
                    needed--
                    word = word.replace(dupRegex, '$1')
                }
                if (needed && removeLM) {
                    needed--
                    word = word.replace(lmRegex, '$1$2$2$3')
                }
                if (needed && swapIE) {
                    needed--
                    word = word.replace(ieRegex, 'ei')
                }
                if (needed && swapFirstTwo) {
                    needed--
                    word = word.charAt(1) + word.charAt(0) + word.slice(2)
                }
                // Also, if the first character of the original was uppercase, we want
                // to uppercase the first letter of the newText
                let firstc = replace.words[randSlot].full.charAt(0)
                if (firstc === firstc.toUpperCase()) {
                    word = word.charAt(0).toUpperCase() + word.slice(1)
                }

                result[randSlot] = '<em>' + word + '</em>' + replace.words[randSlot].punct
            }
        }
        return result.join('');
    }
    /**
     * Generate all the potential misspellings and typos for a quote
     * @returns Nothing
     */
    public generateMisspell(): void {
        const wordrepl = parseInt($('#wordrepl').val() as string)
        const typos = parseInt($('#typos').val() as string)
        const used: BoolMap = {}
        let result = $('#misspellopts')

        if (wordrepl === 0 && typos === 0) {
            result.empty().append($('<p/>').text(`Both sliders are set to none, no alternate quotes can be generated`))
            return;

        }
        let hom = findHomonyms(this.state.cipherString)
        used[this.state.cipherString] = true;
        let toReplace = 0
        if (wordrepl > 0) {
            toReplace = Math.min(Math.round((hom.replaceables.length * wordrepl / 100) + Math.random() - 0.5), hom.replaceables.length)
        }
        result.empty()
        if (hom.replaceables.length === 0) {
            result.append($('<h4/>').text("Warning, no homonyms found in the quote text"))
        }
        let total = 0
        for (let i = 0; i < 25; i++) {
            const nextOut = this.makeOneMisspell(hom, wordrepl, typos);
            const cleanOut = nextOut.replace(/<\/?em>/g, "")

            let score = this.genAristocratScoreRangeAndText(cleanOut);
            if (used[nextOut] !== true) {
                used[nextOut] = true
                let useButton = $("<button/>", {
                    'data-text': cleanOut,
                    type: "button",
                    class: "rounded button use",
                }).html("Use");
                result.append($('<div/>')
                    .append(useButton)
                    .append($('<span/>', { class: "sscore" }).text(`Score: ${score.suggested} [${score.min}-${score.max}]`))
                    .append($('<span/>').html(nextOut))
                )
                total++
                if (total >= 10) {
                    break;
                }
            }
        }
        this.attachHandlers();
        // Since they already did it once, make the Generate button say Regenerate instead
        $('#mispgenbtn').text('Regenerate')
    }
    /**
     * Select a generated misspelled quote to replace the current quote
     * @param elem Element clicked on with string to use
     */
    public useQuote(elem: HTMLElement): void {
        const jqelem = $(elem)
        const text = jqelem.attr('data-text')
        // Give an undo state s
        this.markUndo(null)
        this.setCipherString(text)
        $('#MisspellDLG').foundation('close')
        this.updateOutput()
    }
    /**
     * Set a keyword and offset from the recommended set
     * @param elem Keyword button to be used
     */
    public useKeyword(elem: HTMLElement): void {
        const jqelem = $(elem)
        const text = jqelem.attr('data-text')
        const offset = Number(jqelem.attr('data-offset'))
        // Give an undo state s
        this.markUndo(null)
        this.setKeyword(text)
        this.setOffset(offset)
        $('#keywordDLG').foundation('close')
        this.updateOutput()

    }
    /**
     * Start the process to suggest keywords and offsets to the user
     */
    public suggestKeyword(): void {
        this.loadLanguageDictionary('en').then(() => {
            $('#keywordDLG').foundation('open');
            this.genKeywordSuggestions();
        })
    }
    /**
     * Start the dialog for suggesting the keyword
     * @param lower shortest word to generate
     * @param upper Longest word to generate
     */
    public suggestLenKey(lower: number = 3, upper: number = 7): void {
        // We need to load up the language dictionary before starting everything
        this.loadLanguageDictionary('en').then((res) => {
            for (let len = lower; len <= upper; len++) {
                this.uniquePatterns[len] = this.makeUniquePattern("ABCDEFGHIJKLMNOP".substring(0, len), 1)
            }
            this.suggestKeyBase()
        });
    }
    /*
     * Populate the dialog with a set of keyword suggestions. 
     * @param genbtnid Id of the gen button
     * @param resultid Id of the element to store the results
     * @param lower Shortest word to generate
     * @param upper Longest word to generate
     */
    public populateLenKeySuggestions(genbtnid: string = "genbtn", resultid: string = 'suggestKeyopts', lower: number = 3, upper: number = 7): void {
        $(`#${genbtnid}`).text('Regenerate')
        let result = $(`#${resultid}`)
        const lang = 'en'

        // For Division A and B we use even less of the words than for Division C
        // in order to get language appropriate choices
        let testUsage = this.getTestUsage();
        const usedOnA = testUsage.includes(ITestType.aregional) || testUsage.includes(ITestType.astate);
        const usedOnB = testUsage.includes(ITestType.bregional) || testUsage.includes(ITestType.bstate);
        let range = 1.0
        if (usedOnA) {
            range *= .25
        } else if (usedOnB) {
            range *= .5
        }
        result.empty()

        // Set some upper limits for the words we pick because a lot of them aren't very common
        // These numbers are gotten by reading through the keywords in the English list
        const maxSlots = [0, 0, 0, 600, 1400, 2000, 2800, 2400, 0]
        // We will alternate putting words in the left/right spot of the grid
        const divAll = $("<div/>", { class: 'grid-x' })
        const cellLeft = $('<div/>', { class: 'cell auto' })
        const cellRight = $('<div/>', { class: 'cell auto' })
        divAll.append(cellLeft).append(cellRight)
        result.append(divAll)
        // Find words of all the lengths that they ask for
        for (let len = lower; len <= upper; len++) {
            const pat = this.uniquePatterns[len]
            const patSet = this.Frequent[lang][pat]
            let limit = Math.min(maxSlots[len], patSet.length)
            const maxWord = Math.trunc(limit * range)
            const picked: BoolMap = {}

            // We want to get at least 4 choices from each of the length ranges
            for (let count = 0; count < 4;) {
                const slot = Math.trunc(maxWord * Math.random())
                const choice = patSet[slot][0]
                // Make sure we didn't get this one before (i.e. same random number)
                if (picked[choice] !== true) {
                    picked[choice] = true
                    const useDiv = this.genUseKey(choice)
                    if (count % 2 === 0) {
                        cellLeft.append(useDiv)
                    } else {
                        cellRight.append(useDiv)
                    }
                    count++
                }
            }
        }
        this.attachHandlers()
    }
    /**
     * Update the GUI with a list of suggestions
     * @param kwcount Number of keywords to find
     * @param action Callback function when a keyword is found
     * @returns Total number of keywords found
     */
    public searchForKeywords(kwcount: number, action: (count: number, keyword: string) => boolean): number {
        const lang = 'en';

        const picked: BoolMap = {}
        let testUsage = this.getTestUsage();
        const usedOnA = testUsage.includes(ITestType.aregional) || testUsage.includes(ITestType.astate);
        const usedOnB = testUsage.includes(ITestType.bregional) || testUsage.includes(ITestType.bstate);

        // We use the 8, 9, 10 and 11 unique character strings as our potential keyword choices
        let limit8 = 200
        let limit9 = 50
        let limit10 = 40
        let limit11 = 33
        let scaleb9 = 10
        let scalec9 = 10
        if (usedOnA) {
            limit8 = 300
            limit9 = 50
            limit10 = 40
            limit11 = 33
        } else if (usedOnB) {
            limit8 = 800 / scaleb9
            limit9 = 125
            limit10 = 100
            limit11 = 66
        } else {
            limit8 = 1200 / scalec9
            limit9 = 400
            limit10 = 250
            limit11 = 88
        }

        let pat8 = this.makeUniquePattern("ABCDEFGH", 1);
        let pat9 = this.makeUniquePattern("ABCDEFGHI", 1);
        let pat10 = this.makeUniquePattern("ABCDEFGHIJ", 1);
        let pat11 = this.makeUniquePattern("ABCDEFGHIJK", 1);

        // Keep track of how many entries we find to present so that we don't put more than 10 on the dialog
        let found = 0

        for (let tval = 0; found < kwcount && tval < 50; tval++) {
            // Pick a random number from the set of choices
            let slot = Math.round(Math.random() * (limit8 + limit9 + limit10 + limit11));
            // And figure out which slot it is in as well as the pattern that gets us to the slot
            let pat = pat8;
            if (slot <= limit8) {
                // For the 8 character slots, we want to make them less frequent for Division B/C so we need to scale
                // it back up by the right amount and pick a number in that slot range
                if (!usedOnA) {
                    if (usedOnB) {
                        slot = Math.trunc((slot * scaleb9) + (Math.random() * scaleb9))
                    } else {
                        slot = Math.trunc((slot * scalec9) + (Math.random() * scalec9))
                    }
                }
            } else {
                pat = pat9
                slot -= limit8
                if (slot > limit9) {
                    slot -= limit9;
                    pat = pat10;
                    if (slot > limit10) {
                        slot -= limit10;
                        pat = pat11;
                    }
                }
            }
            let keyword = this.Frequent[lang][pat][slot][0];

            if (picked[keyword] !== true) {
                picked[keyword] = true;
                // We have a keyword, so let them process it (if they can)
                if (action(found, keyword)) {
                    found++
                }
            }
        }
        this.attachHandlers()
        return found
    }
    /**
     * Update the GUI with a list of suggestions
    */
    public genKeywordListSuggestions() {
        let output = $("#keywordss");
        const divAll = $("<div/>", { class: 'grid-x' })
        const cellLeft = $('<div/>', { class: 'cell auto' })
        const cellRight = $('<div/>', { class: 'cell auto' })
        divAll.append(cellLeft).append(cellRight)
        output.empty().append(divAll)

        const found = this.searchForKeywords(20, (found: number, keyword: string): boolean => {
            let div = $('<div/>', { class: "kwchoice" });

            let useButton = $("<a/>", {
                'data-key': keyword,
                type: "button",
                class: "button rounded kwset abbuttons",
            }).html('Use');
            div.append(useButton)
            div.append(keyword)
            if (found % 2 === 0) {
                cellLeft.append(div)
            } else {
                cellRight.append(div)
            }
            return true;
        })
        this.attachHandlers()
    }
    /**
     * Find out what letters are used in the cipher string
     * @param str String to find usage for
     * @returns BoolMap indicating which letters are used.
     */
    public findUsage(str: string): BoolMap {
        const charset = this.getCharset();
        const langreplace = this.langreplace[this.state.curlang];
        const result: BoolMap = {}

        // Now go through the string to encode and compute the character
        // to map and mark it as being used
        for (let t of str.toUpperCase()) {
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== 'undefined') {
                t = langreplace[t];
            }
            // Make sure that this is a valid character to map from
            const pos = charset.indexOf(t);
            if (pos >= 0) {
                result[t] = true
            }
        }
        return result;
    }
    /**
     * Check the replacement set for the the characters on an encryption
     * Note that we actually have to reverse them because the ciphers class
     * is mostly built around decrypting
     */
    public checkReplacement(cset: string, repl: string, keyword: string, usage: BoolMap): number {
        // Figure out what letters map to the destination letters.  Note that
        // the input chracterset alphabet will not be in the same order as the
        // actual alphabet.
        const revUsage: BoolMap = {}
        for (let i = 0, len = repl.length; i < len; i++) {
            const repc = repl.charAt(i);
            const orig = cset.charAt(i);
            // Just make sure that we don't happen to have the same character
            // at this position
            if (repc === orig) {
                return 0
            }
            // if (keyword !== undefined && keyword.includes(orig) && usage[repc] === false) {
            //     return false;
            // }
            if (usage[repc] === true) {
                revUsage[orig] = true
            }
        }
        if (keyword !== undefined) {
            let misscount = 0
            let misddistance = keyword.length
            for (let i = 0; i < keyword.length; i++) {
                const c = keyword.charAt(i)
                if (revUsage[c] !== true) {
                    misscount++
                    misddistance = Math.min(misddistance, i, keyword.length - i)
                }
            }
            if (misscount > 1 || misddistance < 3) {
                return 0;
            }
            if (misscount === 1) {
                return -1
            }
        }
        return 1
    }
    /**
     * Pick a random set of entries
     * @param set Set of numbers to choose from
     * @param picks The number of entries to pick
     * @returns Array with up to <picks> entries chosen at random from the set
     */
    public chooseRandom(set: number[], picks: number): number[] {
        const result: number[] = []
        const work = [...set]
        for (let i = 0; work.length > 0 && i < picks; i++) {
            const pick = Math.floor(Math.random() * work.length)
            result.push(work[pick])
            work.splice(pick, 1);
        }
        return result
    }
    /**
     * Find useful offsets where a keyword could be placed for the current cipher
     * @param keyword Keyword to check.  It should be in uppercase
     * @returns An array of up to three offsets.  Note that a negative offset indicated one letter isn't mapped
     */
    public findKeywordOffsets(keyword: string): number[] {
        // k3 is simple.  We only want a short offset to keep it simple
        if (this.state.encodeType === 'k3') {
            return [1, 2, 3]
        }
        // K4 and Random aren't handled here since we really don't make a single keyword recommendation for them
        if (this.state.encodeType !== 'k1' && this.state.encodeType !== 'k2') {
            return undefined
        }
        const usage = this.findUsage(this.state.cipherString)
        const destAlphabet = this.getCharset()
        const sourceAlphabet = this.getSourceCharset()
        let wraps: number[] = []
        let nonwraps: number[] = []
        let perfectwraps: number[] = []
        let prefectnonwraps: number[] = []
        // For a K1 we just need to make sure that that all the letters in the keyword exist
        // in the plain text and that the mapping doesn't generate any letterr that map to themselves
        if (this.state.encodeType === 'k1') {
            // See if all the letters in the keyword are in the string
            for (let c of keyword) {
                if (usage[c] !== true) {
                    return undefined
                }
            }
            // Find a spot where this works.
            for (let i = 0; i < 26; i++) {
                let offset = (26 - keyword.length + i) % 26

                if (offset > 0) {
                    const repl = this.genKstring(keyword, offset, destAlphabet);
                    const check = this.checkReplacement(sourceAlphabet, repl, undefined, usage)
                    if (check !== 0) {
                        if (i < keyword.length) {
                            perfectwraps.push(offset)
                        } else {
                            prefectnonwraps.push(offset)
                        }
                    }
                }
            }
        } else { // if (this.state.encodeType === 'k2') 
            // K2 is the complicated case 
            for (let i = 0; i < 26; i++) {
                let offset = (26 - keyword.length + i) % 26

                if (offset > 0) {
                    const repl = this.genKstring(keyword, offset, sourceAlphabet);
                    const check = this.checkReplacement(repl, destAlphabet, keyword, usage)
                    if (check !== 0) {
                        if (i < keyword.length) {
                            if (check > 0) {
                                perfectwraps.push(offset)
                            } else {
                                wraps.push(-offset)
                            }
                        } else {
                            if (check > 0) {
                                prefectnonwraps.push(offset)
                            } else {
                                nonwraps.push(-offset)
                            }
                        }
                    }
                }
            }
        }
        // We have a set of options (possibly)
        if (perfectwraps.length + prefectnonwraps.length + wraps.length + nonwraps.length === 0) {
            return undefined
        }
        // We need to eliminate some of the entries
        // We prefer to have two of the wrap ones if possible.
        const result = this.chooseRandom(perfectwraps, 2)
        result.push(... this.chooseRandom(prefectnonwraps, 3 - result.length))
        if (result.length < 3) {
            result.push(... this.chooseRandom(wraps, 2))
            if (result.length < 3) {
                result.push(... this.chooseRandom(nonwraps, 3 - result.length))
            }
        }
        return result
    }
    /**
     * Update the GUI with a list of suggestions
     */
    public genKeywordSuggestions() {
        let output = $("#keywordss");
        output.empty();

        if (this.state.encodeType === 'k2') {
            output.append($(`<p/><b>NOTE:</b> For K2 alphabets, not all of the letters of the keyword will be mapped.
            Those with a single letter not mapped are shown as yellow buttons instead of blue.</p>`))
        }
        // Keep track of how many entries we find to present so that we don't put more than 10 on the dialog
        const found = this.searchForKeywords(10, (found: number, keyword: string): boolean => {

            // We have the keyword, let's see if this work
            let offsets = this.findKeywordOffsets(keyword)
            if (offsets === undefined) {
                return false;
            }
            let div = $('<div/>', { class: "kwchoice" });
            div.append($('<span/>').text(keyword));
            for (let offset of offsets) {
                let warnclass = ""
                if (offset < 0) {
                    offset = -offset
                    warnclass = " warning"
                }
                let useButton = $("<button/>", {
                    'data-text': keyword,
                    'data-offset': offset,
                    type: "button",
                    class: "rounded button kwset abbuttons" + warnclass,
                }).html(`Use Offset +${offset}`);
                div.append(useButton)

            }
            output.append(div);
            return true
        });

        if (found === 0) {
            output.append($(`<p><b>WARNING:</b> Unable to find any keywords which work with the plain text of this cipher.</p>`))
            if (this.state.cipherString === "") {
                output.append($(`<p>Please enter something into the Plain Text to be able to generate keywords.</p>`))
            }
        }
        this.attachHandlers()
    }
    /**
     * Populate the dialog with a set of keyword suggestions. 
     */
    public populateKeySuggestions(): void {
        $('#genbtn').text('Regenerate')
    }
    /**
     * Set the keyword from the suggested text
     * @param elem Element clicked on to set the keyword from
     */
    public setSuggestedKey(elem: HTMLElement): void {
        this.markUndo('')
        $('#suggestKeyDLG').foundation('close')
        this.updateOutput()
    }
    /**
     * Start the dialog for suggesting the keyword
     */
    public suggestKeyBase(): void {
        $('#genbtn').text('Generate')
        this.populateKeySuggestions()
        $('#suggestKeyDLG').foundation('open')
    }
    /**
     * Start the dialog for suggesting the keyword
     */
    public suggestKey(): void {
        this.suggestKeyBase()
    }
    /**
     * Generate the UI for choosing a keyword
     * @param key Keyword to add
     * @returns HTML containing a button to select the keyword and the keyword
     */
    public genUseKey(key: string): JQuery<HTMLElement> {
        if (key === undefined) {
            return $("<span/>")
        }
        let useButton = $("<a/>", {
            'data-key': key,
            type: "button",
            class: "button rounded keyset abbuttons",
        }).html('Use');
        let div = $("<div/>", { class: "kwchoice" })
        div.append(useButton)
        div.append(key)
        return div
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('[name="enctype"]')
            .off('click')
            .on('click', (e) => {
                $(e.target)
                    .siblings()
                    .removeClass('is-active');
                $(e.target).addClass('is-active');
                this.markUndo(null);
                if (this.setEncType($(e.target).val() as IEncodeType)) {
                    this.updateOutput();
                }
            });
        $('#offset')
            .off('input')
            .on('input', (e) => {
                const offset = Number($(e.target).val());
                if (offset !== this.state.offset) {
                    this.markUndo(null);
                    if (this.setOffset(offset)) {
                        this.updateOutput();
                    }
                }
            });
        $('#offset2')
            .off('input')
            .on('input', (e) => {
                const offset2 = Number($(e.target).val());
                if (offset2 !== this.state.offset2) {
                    this.markUndo(null);
                    if (this.setOffset2(offset2)) {
                        this.updateOutput();
                    }
                }
            });
        $('#keyword')
            .off('input')
            .on('input', (e) => {
                const keyword = $(e.target).val() as string;
                if (keyword !== this.state.keyword) {
                    this.markUndo('keyword');
                    if (this.setKeyword(keyword)) {
                        this.updateOutput();
                    }
                }
            });
        $('#keyword2')
            .off('input')
            .on('input', (e) => {
                const keyword2 = $(e.target).val() as string;
                if (keyword2 !== this.state.keyword2) {
                    this.markUndo('keyword2');
                    if (this.setKeyword2(keyword2)) {
                        this.updateOutput();
                    }
                }
            });
        $('#qauthor')
            .off('input')
            .on('input', (e) => {
                const author = $(e.target).val() as string;
                if (author !== this.state.author) {
                    this.markUndo('author');
                    if (this.setAuthor(author)) {
                        this.updateOutput();
                    }
                }
            });
        $('#toencode')
            .off('input')
            .on('input', (e) => {
                const cipherString = $(e.target).val() as string;
                if (cipherString !== this.state.cipherString) {
                    this.markUndo('cipherString');
                    if (this.setCipherString(cipherString)) {
                        this.updateOutput();
                    }
                }
            });
        $('#points')
            .off('input')
            .on('input', (e) => {
                const points = Number($(e.target).val());
                if (points !== this.state.points) {
                    this.markUndo('points');
                    this.state.points = points;
                }
            });
        $('#spbonus')
            .off('change')
            .on('change', (e) => {
                const checked = $(e.target).prop("checked");
                this.markUndo('spbonus');
                this.setSpecialBonus(checked);
            });
        $('.richtext').each((i: number, elem: HTMLElement) => {
            const id = $(elem).prop('id') as string;
            if (id !== '' && !(id in this.editor)) {
                this.editor[id] = null;
                CKInlineEditor.create(elem)
                    .then((editor) => {
                        const initialtext = $(elem).val();
                        this.editor[id] = editor;
                        if (initialtext !== '') {
                            editor.setData(initialtext);
                        }
                        editor.model.document.on('change:data', () => {
                            $(elem).trigger('richchange', editor.getData());
                        });
                    })
                    .catch((error) => {
                        console.error(error);
                        delete this.editor[id];
                    });
            }
        });
        $('#qtext')
            .off('richchange')
            .on('richchange', (e, newtext) => {
                const question = newtext;
                let oldquestion = this.state.question;
                if (oldquestion === undefined) {
                    oldquestion = '';
                }
                if (question !== oldquestion) {
                    let oldquestion2 = oldquestion;
                    if (oldquestion === '') {
                        oldquestion2 = '&nbsp;';
                    }
                    // Don't push an undo operation if all that happend was that the
                    // rich text editor put a paragraph around our text
                    if (
                        question !== '<p>' + oldquestion + '</p>' &&
                        question !== '<p>' + oldquestion2 + '</p>'
                    ) {
                        this.markUndo('question');
                    }
                    this.setQuestionText(question);
                }
            });
        $('#crib')
            .off('input')
            .on('input', (e) => {
                const chars = $(e.target).val() as string;
                this.markUndo('crib');
                if (this.setCrib(chars)) {
                    this.updateOutput();
                }
            });
        $('.sampq')
            .off('click')
            .on('click', (e) => {
                this.showSampleQuestionText();
            });
        $('.sampp')
            .off('click')
            .on('click', (e) => {
                this.showSamplePoints();
            });
        $('.sqtcpy')
            .off('click')
            .on('click', (e) => {
                this.copySampleQuestionText();
            });
        $('.sqtins')
            .off('click')
            .on('click', (e) => {
                this.replaceQuestionText();
            });
        $('.sqtpnts')
            .off('click')
            .on('click', (e) => {
                this.replaceScoreValue();
            });
        $('#translated')
            .off('input')
            .on('input', (e) => {
                const translation = $(e.target).val() as string;
                if (translation !== this.state.translation) {
                    this.markUndo('translation');
                    if (this.setTranslation(translation)) {
                        this.updateOutput();
                    }
                }
            });
        $('#randomize')
            .off('click')
            .on('click', () => {
                this.markUndo(null);
                this.resetAlphabet();
                this.updateOutput();
            });
        $('#genkeyword')
            .off('click')
            .on('click', () => {
                this.suggestKeyword()
            });
        $('#keygenbtn')
            .off('click')
            .on('click', () => {
                this.genKeywordSuggestions()
            });

        $('.kwset')
            .off('click')
            .on('click', (e) => {
                this.useKeyword(e.target)
            })
        $('.chkmod')
            .off('click')
            .on('click', (e) => {
                if (this.checkModified($(e.target).attr('href'))) {
                    e.preventDefault();
                }
            });
        $('#misspell')
            .off('click')
            .on('click', (e) => {
                this.genMisspell()
            })
        $('#wordrepl_base,#typos_base')
            .off('changed.zf.slider moved.zf.slider')
            .on('changed.zf.slider moved.zf.slider', (e) => {
                this.checkRepl();
            });
        $('.mgen')
            .off('click')
            .on('click', (e) => {
                this.generateMisspell();
            });
        $('.use')
            .off('click')
            .on('click', (e) => {
                this.useQuote(e.target);
            })
        $('.msave')
            .off('click')
            .on('click', (e) => {
                this.saveAndContinue($('#targeturl').val() as string);
            });
        $('.mlose')
            .off('click')
            .on('click', (e) => {
                this.abandonAndContinue($('#targeturl').val() as string);
            });
        $('#suggestkey')
            .off('click')
            .on('click', () => {
                this.suggestKey()
            })
        $('#genbtn')
            .off('click')
            .on('click', () => {
                this.populateKeySuggestions()
            })

        $('.keyset')
            .off('click')
            .on('click', (e) => {
                this.setSuggestedKey(e.target)
            })
    }
}
