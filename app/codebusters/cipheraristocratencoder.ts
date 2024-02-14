import { BoolMap, cloneObject } from "../common/ciphercommon";
import { IOperationType, IState, ITestQuestionFields, ITestType, QuoteRecord, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { replaceInfo, findHomonyms } from "../common/homonyms";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTFIncButton } from "../common/jtfIncButton";
import { JTFDialog } from "../common/jtfdialog";
import { JTFLabeledInput } from "../common/jtflabeledinput";
import { JTRadioButton } from "../common/jtradiobutton";
import { CipherEncoder, IEncoderState, suggestedData } from "./cipherencoder";

export interface IAristocratState extends IEncoderState {
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

export class CipherAristocratEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Aristocrat';

    public defaultstate: IAristocratState = {
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

    public state: IAristocratState = cloneObject(this.defaultstate) as IState;

    public cipherName = 'Aristocrat';

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
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setOffset2(this.state.offset2);
    }

    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        // Hide the random option if this is a keyword operation since
        // they must have a K1/K2/K3 alphabet to be able to have a keyword
        $('#keyword2').val(this.state.keyword2);
        $('#offset2').val(this.state.offset2);
        $('#translated').val(this.state.translation);

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
        this.setkvalinputs();
        super.updateOutput()
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
            } else if ((this.state.encodeType === 'k4') ||
                (this.state.encodeType === 'k3' && testType !== ITestType.cregional && testType !== ITestType.cstate)) {
                return this.state.encodeType.toUpperCase() + ' Alphabet not allowed for ' + this.getTestTypeName(testType);
            }
        }
        return super.CheckAppropriate(testType, anyOperation)
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let result = super.genAnswer(testType)
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
     * Update the question string (and validate if necessary)
     * @param question New question text string
     */
    public setQuestionText(question: string): void {
        super.setQuestionText(question)
        this.validateQuestion();
        this.attachHandlers();
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
     * Reset the alphabet mapping so that we generate a new one
     */
    public resetAlphabet(): void {
        super.resetAlphabet();
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
        this.state.alphabetSource = cset;
        this.state.alphabetDest = repl;
        super.setReplacement(cset, repl);
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
     * Load any data necessary for computing the scoring.  Since this
     * may take some time to pull a file from the server, this gets done
     * before starting any scoring operations
     * @returns Promise indicating that the language has been loaded
     */
    public prepGenScoring(): Promise<boolean> {
        return this.loadLanguageDictionary(this.state.curlang);
    }
    /**
     * Compute the score ranges for an Aristocrat/Patristocrat/Xenocrypt
     * @returns suggestedData containing score ranges
     */
    public genScoreRangeAndText(): suggestedData {
        return this.genScoreRangeAndTextForStr(this.state.cipherString)
    }
    /**
     * Compute the score ranges for an Aristocrat/Patristocrat/Xenocrypt
     * @returns suggestedData containing score ranges
     */
    public genScoreRangeAndTextForStr(str: string): suggestedData {
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
                adjust += 400;
                result.text += ". Encoding as a Patristocrat adds 400 points";
            } else if (this.state.cipherType === ICipherType.Xenocrypt || this.state.curlang !== 'en') {
                adjust += 375;
                result.text += ". Because it is a Xenocrypt, it adds 450 points";
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
            if (this.state.cipherType === ICipherType.Aristocrat && qrecord.minlength === 1 && (this.state.replacement['I'] === 'A' || this.state.replacement['A'] === 'I')) {
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

            let score = this.genScoreRangeAndTextForStr(cleanOut);
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
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
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

    }
}
