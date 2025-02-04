import { CKInlineEditor } from '../common/ckeditor.js';
import { BoolMap, cloneObject } from '../common/ciphercommon';
import {
    CipherHandler,
    IEncodeType,
    IState,
    ITestType,
    menuMode,
    toolMode,
    IScoreInformation,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButtonSet } from '../common/jtradiobutton';
import { JTFDialog } from '../common/jtfdialog';
import { JTTable } from '../common/jttable';

export interface IEncoderState extends IState {
    /** K1/K2/K3/K4 Offset */
    offset?: number;
    /** Optional hint tracking string */
    hint?: string;
    /** Optional crib tracking string */
    crib?: string;
    /** Indication that the question text was auto generated and needs to be replaced */
    placeholder?: boolean;
    /** Track how many errors were generated (this should never be saved to a file) */
    errorcount?: number;
    /** Optional hint is expected */
    usehint?: boolean;
}

export interface suggestedData {
    /* The suggested score to use */
    suggested: number;
    /* The minimum of the range for the suggested score */
    min: number;
    /* The maximum of the range for the suggested score */
    max: number;
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
        keyword: '',
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
    public cipherName = 'Unknown';
    public uniquePattern = this.makeUniquePattern("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1);

    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
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
        $("#qauthor").val(this.state.author)
        JTRadioButtonSet('enctype', this.state.encodeType);
        $('.lang').val(this.state.curlang);
        this.load();
    }
    /**
     * Update the question string (and validate if necessary)
     * @param question New question text string
     */
    public setQuestionText(question: string): void {
        this.state.question = question;
    }
    public setPoints(points: number): boolean {
        let changed = false
        if (this.state.points != points) {
            this.markUndo('points')
            this.state.points = points;
            this.updateQuestionsOutput();
            changed = true;
        }
        return changed;
    }
    /**
     * Make sure that they are asking them to solve the cipher or fill in the keyword.
     * If they are using a K1/K2/K3/K4 alphabet, they should also mention it
     */
    public validateQuestion(): void {
        let msg = '';
        this.setErrorMsg(msg, 'vq');
        if (this.state.placeholder) {
            msg = "The Question Text needs to be updated from the generated placeholder.";
        }
        this.setErrorMsg(msg, 'pq');
    }
    /**
     * 
     * @param specialbonus 
     */
    public setSpecialBonus(specialbonus: boolean): void {
        this.state.specialbonus = specialbonus;
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
        this.init(lang);
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
    }
    /**
     * Generate the maping from the source to the destination alphabet
     */
    public genAlphabet(): void {
    }
    /**
     * Compute the replacement set for the the characters on an encryption
     * Note that we actually have to reverse them because the ciphers class
     * is mostly built around decrypting
     */
    public setReplacement(cset: string, repl: string): void {
        let errors = '';
        let msg = '';
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
     * Determines if this generator is appropriate for a given test
     * type.  This default implementation just checks against the
     * list of valid tests declared by the class.
     * @param testType Test type to compare against
     * @param anyOperation Don't restrict based on the type of operation
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType, anyOperation: boolean): string {
        if (testType === ITestType.aregional) {
            if (this.state.curlang === 'es') {
                return 'Xenocrypts not appropriate for Division A tests';
            }
        }
        if (testType !== ITestType.cregional && testType !== ITestType.cstate &&
            testType !== ITestType.bregional && testType !== ITestType.bstate && this.state.specialbonus) {
            return 'Special Bonus only allowed on Division B/C tests';
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
        let extraclass = '';
        if (testType === ITestType.aregional) {
            extraclass = ' atest';
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
                    class: 'TOANSWER' + extraclass,
                }).text(strset[toanswer])
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

        for (const strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVEQ' + extraclass,
                }).text(strset[0])
            );
        }
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
    // /**
    //  * genPreCommands() Generates HTML for any UI elements that go above the command bar
    //  * @returns HTML DOM elements to display in the section
    //  */
    // public genPreCommands(): JQuery<HTMLElement> {
    //     const result = $('<div/>');
    //     this.genTestUsage(result);
    //     const radiobuttons = [
    //         { id: 'mrow', value: 'decode', title: 'Decode' },
    //         { id: 'crow', value: 'keyword', title: 'Keyword/Key Phrase' },
    //     ];
    //     result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));
    //     result.append(this.createMisspellDlg())
    //     result.append(this.createKeywordDlg('Suggest Keyword'))
    //     this.genQuestionFields(result);
    //     this.genLangDropdown(result);
    //     this.genEncodeField(result);
    //     result.append(
    //         JTFLabeledInput(
    //             'Translation',
    //             'textarea',
    //             'translated',
    //             this.state.translation,
    //             'small-12 medium-12 large-12'
    //         )
    //     );
    //     return result;
    // }
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
        dlgContents.append($('<div/>', { class: 'callout primary', id: 'questionopts' }))
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'qgen button', id: 'questiongenbtn' }).text('Regenerate'))
                .append(
                    $('<a/>', { class: 'secondary button', 'data-close': '' }).text(
                        'Cancel'
                    )
                )
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
        return new Promise<boolean>((resolve, reject) => { resolve(true) })
    }

    /**
     * Generate the recommended score and score ranges for a cipher
     * @returns Computed score ranges for the cipher and text description
     */
    public genScoreRangeAndText(): suggestedData {
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
    public genRandomQuestion(cipherName: string, extraStrings?: string[]): string {
        let choices: string[] = [
            "The following quote${author} has been encoded using the ${cipherName} Cipher.",
            "The following quote${author} has been encoded using the ${cipherName} Cipher. What did they say?",
            "The following ${cipherName} Cipher encodes a quote${author}",
            "An observation${author} has been encoded as a ${cipherName} Cipher.",
        ]
        if (extraStrings !== undefined) {
            choices = choices.concat(extraStrings)
        }
        return ""
    }
    /**
     * Generates the sample question text for a cipher
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {
        const hint = this.genSampleHint();
        let hinttext = hint !== undefined ? ` You are told that ${hint}` : '';
        return (
            `<p>A quote${this.genAuthor()} has been encoded using the ` +
            `${this.cipherName} Cipher for you to decode.${hinttext}</p>`
        );
    }
    /**
     * Populate the Sample Question Text Dialog and show it
     */
    public showSampleQuestionText(): void {
        $('#sqtext')
            .empty()
        $('#SampleQText').foundation('open');
        this.genQuestionSuggestions();
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
        delete this.state.placeholder
        this.setQuestionText($('#sqtext').html());
        this.updateQuestionsOutput();
        $('#SampleQText').foundation('close');
    }
    /**
     * Update the score value with what was suggested in the dialog
     */
    public replaceScoreValue(): void {
        const points = Number($('#spval').attr('data-points'));
        this.setPoints(points)
        $('#SamplePoints').foundation('close')
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
            this.suggestKeyBase()
        });
    }
    /**
      * Find words with all unique letters in a given range of length
      * @param kwcount Number of keywords to find (broken into groups by keyword length)
      * @param lower Lower limit on length of keywords
      * @param upper Upper limit on length of keywords
      * @param action Callback function when a keyword is found
      * @returns Total number of keywords found
      */
    public searchForUniqueKeywords(kwcount: number, lower: number = 3, upper: number = 7, action: (count: number, keyword: string) => boolean): number {
        const lang = 'en';
        const groupsize = kwcount / (upper - lower + 1)

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

        // Keep track of how many entries we find to present so that we don't put more than requested on the dialog
        let found = 0

        // Set some upper limits for the words we pick because a lot of them aren't very common
        // These numbers are gotten by reading through the keywords in the English list
        const maxSlots = [0, 0, 0, 600, 1400, 2000, 2800, 2400, 2400, 0]
        // Find words of all the lengths that they ask for
        for (let len = lower; len <= upper; len++) {
            const pat = this.uniquePattern.substring(0, len)
            const patSet = this.Frequent[lang][pat]
            let limit = Math.min(maxSlots[len], patSet.length)
            const maxWord = Math.trunc(limit * range)
            const picked: BoolMap = {}
            const foundlimit = Math.round(kwcount * ((len + 1 - lower) / (upper + 1 - lower)))

            // We want to get at least 4 choices from each of the length ranges
            for (let pass = 0; pass < 20 && found < foundlimit;) {
                const slot = Math.trunc(maxWord * Math.random())
                const choice = patSet[slot][0]
                // Make sure we didn't get this one before (i.e. same random number)
                if (picked[choice] !== true) {
                    picked[choice] = true
                    if (action(found, choice)) {
                        found++
                    }
                }
            }
        } return found
    }
    /*
     * Populate the dialog with a set of keyword suggestions. 
     * @param genbtnid Id of the gen button
     * @param resultid Id of the element to store the results
     * @param lower Shortest word to generate
     * @param upper Longest word to generate
     */
    public populateLenKeySuggestions(genbtnid: string = "genbtn", resultid: string = 'suggestKeyopts', kwcount: number, lower: number = 3, upper: number = 7,): void {
        this.uniquePattern = this.makeUniquePattern("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)

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
        const divAll = $("<div/>", { class: 'grid-x' })
        const cells: JQuery<HTMLElement>[] = []
        for (let cellCount = 0; cellCount < 2; cellCount++) {
            const cell = $('<div/>', { class: 'cell auto' })
            cells.push(cell)
            divAll.append(cell)
        }
        result.append(divAll)

        this.searchForUniqueKeywords(kwcount, lower, upper,
            (found: number, keyword: string): boolean => {
                const useDiv = this.genUseKey(keyword)
                cells[found % cells.length].append(useDiv)
                return true
            })
        this.attachHandlers()
    }
    /**
     * Update the GUI with a list of suggestions of words with repeating letters
     * @param kwcount Number of keywords to find
     * @param action Callback function when a keyword is found
     * @returns Total number of keywords found
     */
    public searchForNonUniqueKeywords(kwcount: number, action: (count: number, keyword: string) => boolean): number {
        const lang = 'en';

        const picked: BoolMap = {}
        let testUsage = this.getTestUsage();
        const usedOnA = testUsage.includes(ITestType.aregional) || testUsage.includes(ITestType.astate);
        const usedOnB = testUsage.includes(ITestType.bregional) || testUsage.includes(ITestType.bstate);

        // We use everything from 8 to 14 characters except for the unique string ones as our potential keyword choices
        let entries = Object.keys(this.Frequent['en']).filter((key) => key.length >= 8 && key.length <= 14)
        let entriesCount = entries.length

        // Filter down the words to nominally the grade level.
        // This isn't a perfect match, but at least it reduces the chance of a word
        // being out of grade level
        let rangeScale = 0.5
        if (usedOnA) {
            rangeScale = 0.1
        } else if (usedOnB) {
            rangeScale = 0.25
        }

        let pat14 = this.makeUniquePattern("ABCDEFGHIJKLMN", 1);

        // Keep track of how many entries we find to present so that we don't put more than requested on the dialog
        let found = 0

        for (let tval = 0; found < kwcount && tval < 50; tval++) {
            // Pick a random number from the set of choices
            let patSlot = Math.trunc(Math.random() * entriesCount);
            let pat = entries[patSlot]

            // Make sure it is not one of the unique character patterns.
            // We do this check here instead of when we create the keys because it is pretty
            // rare that we actually hit one of them and we don't want to incur the cost when
            // generating the list in the first place.
            if (pat !== pat14.substring(0, pat.length)) {
                // Now that we have that, pick a random entry from the range of the slot
                let slot = Math.trunc(Math.random() * this.Frequent[lang][pat].length * rangeScale)
                let keyword = this.Frequent[lang][pat][slot][0];

                // Make sure that the random number hadn't given us this sample before.
                if (picked[keyword] !== true) {
                    picked[keyword] = true;
                    // We have a keyword, so let them process it (if they can)
                    if (action(found, keyword)) {
                        found++
                    }
                }
            }
        }
        this.attachHandlers()
        return found
    }
    /**
     * Update the GUI with a list of suggestions for keywords of 8, 9, 10 and 11 unique letters
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

    public genHintText(hint: string): string {
        return hint !== undefined ? ` You are told that ${hint}` : '';
    }

    /**
     * 
     * @param qOptions List of possible question options to display
     * @param langtext Text indicating what language the cipher is in
     * @param hinttext Hint text to display with question
     * @param fixedName Cipher name
     * @param operationtext Asks for keyword
     * @param operationtext2 Tells what type of alphabet was used to encode (K1, etc)
     * @param cipherAorAn Either A or An depending on if the cipher starts with vowel
     * @returns whether qOptions was modified
     */
    public addQuestionOptions(qOptions: string[], langtext: string, hinttext: string, fixedName: string, operationtext: string, operationtext2: string, cipherAorAn: string): boolean {
        qOptions.push(`A quote${this.genAuthor()}${langtext} has been encoded using the ${fixedName} Cipher${operationtext2} for you to decode.${hinttext}${operationtext}`);
        qOptions.push(`Solve this quote${this.genAuthor()}${langtext} that has been encoded using the ${fixedName} Cipher${operationtext2}.${hinttext}${operationtext}`);
        qOptions.push(`Decrypt the following cipher text${langtext} that has been encoded using the ${fixedName} Cipher${operationtext2}.${hinttext}${operationtext}`);
        qOptions.push(`A phrase${this.genAuthor()}${langtext} has been encoded using the ${fixedName} Cipher${operationtext2}.${hinttext}${operationtext}`);
        qOptions.push(`A famous phrase${this.genAuthor()} has been encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
        qOptions.push(`A message${langtext}${this.genAuthor()} encrypted${operationtext2} with the ${fixedName} cipher has been received.${hinttext}${operationtext}`);
        qOptions.push(`The following quote${this.genAuthor()}${langtext} needs to be decoded with the ${fixedName} cipher${operationtext2}.${hinttext}${operationtext}`);
        qOptions.push(`Someone passed you a piece of paper with this ${fixedName} encoded phrase of a quote${this.genAuthor()}${langtext}${operationtext2}. ${hinttext}${operationtext}`);


        if (hinttext !== '') {
            if (this.state.operation === 'keyword') {
                qOptions.push(`Solve this ${fixedName}${this.genAuthor()}${langtext}${operationtext2}.${hinttext}${operationtext}`);
            }
            else {
                qOptions.push(`Solve this ${fixedName}${this.genAuthor()}${langtext}${operationtext2}.${hinttext}`);
            }

        }
        if (this.state.author !== undefined && this.state.author !== '') {
            qOptions.push(`${this.state.author} has been heard to say the following phrase that has been encoded using the ${fixedName} cipher${langtext}${operationtext2}.${hinttext}${operationtext}`);
            qOptions.push(`${this.state.author} was often heard to say the following phrase which has been encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
            qOptions.push(`${this.state.author} offers us some advice that has been encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
            qOptions.push(`${this.state.author} offers an observation that has been encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
            qOptions.push(`Upon searching a room, the following were found on scraps of paper. You realize it's a quote by ${this.state.author} encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
            qOptions.push(`You came across the following written on a wall in a cave. You notice that it's a quote by ${this.state.author} encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
            qOptions.push(`You found the following carved into the bark of a hollow log. You recognize that it's a quote by ${this.state.author} encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
        }
        else {
            qOptions.push(`Upon searching a room, the following were found on scraps of paper. You realize it's encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
            qOptions.push(`You came across the following written on a wall in a cave. You notice that it's encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
            qOptions.push(`You found the following carved into the bark of a hollow log. You recognize that it's encoded as ${cipherAorAn} ${fixedName}${langtext}${operationtext2}.${hinttext}${operationtext}`);
        }
        return false;
    }
    /**
     * Update the GUI with a list of suggestions for questions
     * @param qcount Number of questions to find
     * @param action Callback function when a question is found
     * @returns Total number of questions found
     */
    // TODO: morbit and pollux doesn't have the q gen button
    public searchForQuestions(qcount: number, action: (count: number, question: string) => boolean): number {
        const lang = 'en';

        const picked: BoolMap = {}
        let qOptions: string[] = [];

        const hint = this.genSampleHint();

        let hinttext = this.genHintText(hint)

        let langtext = '';
        let fixedName = this.cipherName;
        if (this.state.curlang === 'es') { langtext = ' in Spanish'; }
        let enctype = ''
        if (this.state.encodeType !== undefined && this.state.encodeType !== 'random') {
            enctype += ' ' + this.state.encodeType.toUpperCase();
        }
        let operationtext = ' What does it say?';
        let operationtext2 = '';

        if (this.state.operation === 'keyword') {
            let keytype = 'Keyword';
            const keyanswer = this.state.keyword.toUpperCase();
            if (this.minimizeString(keyanswer).length !== keyanswer.length) {
                keytype = 'Key Phrase';
            }
            operationtext = ` What was the${enctype} ${keytype} used to encode it?`;
        }
        if (enctype !== 'random' && enctype !== '') {
            operationtext2 = ` using a${enctype} alphabet`;
        }
        let vowels = 'aeiouy';
        let cipherAorAn = 'a';
        if (vowels.indexOf(fixedName.substring(0, 1).toLowerCase()) >= 0) cipherAorAn = 'an';


        // Potential improvements TODO:
        // Add references if it's misspelled
        // 
        if (this.state.operation === 'encode') {
            qOptions.push(`Encode this quote${this.genAuthor()}${langtext} using the ${fixedName} Cipher.${hinttext}`);
            qOptions.push(`Encode this famous quote${this.genAuthor()}${langtext} using the ${fixedName} Cipher.${hinttext}`);
            qOptions.push(`Encrypt this common phrase${this.genAuthor()}${langtext} using the ${fixedName} Cipher.${hinttext}`);
        }
        else {
            // adds questions 
            this.addQuestionOptions(qOptions, langtext, hinttext, fixedName, operationtext, operationtext2, cipherAorAn);


        }


        let testUsage = this.cipherName;
        const usedOnA = testUsage.includes(ITestType.aregional) || testUsage.includes(ITestType.astate);
        const usedOnB = testUsage.includes(ITestType.bregional) || testUsage.includes(ITestType.bstate);

        // We use the 8, 9, 10 and 11 unique character strings as our potential keyword choices
        let scaleb9 = 10
        let scalec9 = 10

        // Keep track of how many entries we find to present so that we don't put more than 10 on the dialog
        let found = 0

        for (let tval = 0; found < qcount && tval < 50; tval++) {
            // Pick a random number from the set of choices
            let slot = Math.floor(Math.random() * (qOptions.length));
            // And figure out which slot it is in as well as the pattern that gets us to the slot

            let question = qOptions[slot];

            if (picked[question] !== true) {
                picked[question] = true;
                // We have a keyword, so let them process it (if they can)
                if (action(found, question)) {
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
    public genKeywordSuggestions() {
        let output = $("#keywordss");
        const divAll = $("<div/>", { class: 'grid-x' })
        const cellLeft = $('<div/>', { class: 'cell auto' })
        const cellRight = $('<div/>', { class: 'cell auto' })
        const cellMid = $('<div/>', { class: 'cell auto' })
        divAll.append(cellLeft).append(cellMid).append(cellRight)
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
                cellMid.append(div)
            }
            return true;
        })
        const found2 = this.searchForNonUniqueKeywords(10, (found: number, keyword: string): boolean => {
            let div = $('<div/>', { class: "kwchoice" });

            let useButton = $("<a/>", {
                'data-key': keyword,
                type: "button",
                class: "button rounded kwset abbuttons warning",
            }).html('Use');
            div.append(useButton)
            div.append(keyword)
            cellRight.append(div)
            return true;
        })
        this.attachHandlers()
    }
    /**
     * Update the GUI with a list of suggestions
    */
    public genQuestionSuggestions() {
        let output = $("#questionopts");
        const divAll = $("<div/>")
        output.empty().append(divAll)

        const found = this.searchForQuestions(7, (found: number, question: string): boolean => {
            // let div = $('<div/>');
            let useButton = $("<button/>", {
                'data-text': question,
                type: "button",
                class: "rounded button useq",
            }).html("Use");
            divAll.append($('<div/>')
                .append(useButton)
                .append($('<span/>').html(question))
            )
            // divAll.append(div);
            return true;
        })
        this.attachHandlers()
    }
    /**
     * Select a generated question recommendation to replace the current question text
     * @param elem Element clicked on with string to use
     */
    public useQuestion(elem: HTMLElement): void {
        const jqelem = $(elem)
        const text = jqelem.attr('data-text')
        // Give an undo state s
        this.markUndo(null)
        // Mark it so that they know it has been updated.
        delete this.state.placeholder
        this.setQuestionText(text)
        $('#SampleQText').foundation('close')
        this.updateOutput()
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
    public genUseKey(key: string, useclass = "keyset"): JQuery<HTMLElement> {
        if (key === undefined) {
            return $("<span/>")
        }
        let useButton = $("<a/>", {
            'data-key': key,
            type: "button",
            class: `button rounded ${useclass} abbuttons`,
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
                this.setPoints(points)
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
                        if (this.state.question !== question) {
                            delete this.state.placeholder;
                        }
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
                console.log("test");
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
        $('#questiongenbtn')
            .off('click')
            .on('click', () => {
                this.genQuestionSuggestions()
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
        $('.useq')
            .off('click')
            .on('click', (e) => {
                this.useQuestion(e.target);
            })
        $('.mgen')
            .off('click')
            .on('click', (e) => {
                this.showSampleQuestionText();
            });
    }
}
