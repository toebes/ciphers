import { BoolMap, cloneObject } from '../common/ciphercommon';
import {
    ITestQuestionFields,
    ITestType,
    IScoreInformation,
    toolMode,
} from '../common/cipherhandler';
import { CipherTypeButtonItem, ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { Mapper } from '../common/mapper';
import { mapperFactory } from '../common/mapperfactory';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';

/**
 * CipherTableEncoder - This class handles all of the actions associated with encoding
 * a Caesar or Atbash cipher.
 */
export class CipherTableEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Caesar';
    public cipherName = 'Caesar'

    public validAtBashTests: ITestType[] = [
        ITestType.None,
        ITestType.bregional,
        ITestType.bstate,
        ITestType.aregional,
    ];
    /**
     * Special case: for A Regional tests:
     *   The Caesar Cipher, also called a shift cipher, with a shift of
     *   no more than 3 characters in either direction.
     *    E.g. a can map to x,y,z,b,c,d,
     */
    public validCaesarTests: ITestType[] = [
        ITestType.None,
        /** We took Caesar out from the Division C for the 2022-2023 season */
        // ITestType.cregional,
        // ITestType.cstate,
        ITestType.bregional,
        ITestType.bstate,
        ITestType.aregional,
    ];
    /** Which tests allow these ciphers on them */
    // We default to the caesar since that is the default cipher type
    public validTests = this.validCaesarTests;

    public defaultstate: IEncoderState = {
        cipherString: '',
        cipherType: ICipherType.Caesar,
        offset: 1,
        /** The type of operation */
        operation: 'decode',
        replacement: {},
    };
    public state: IEncoderState = cloneObject(this.defaultstate) as IEncoderState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];
    public ciphermap: Mapper;
    /** Save and Restore are done on the CipherEncoder Class */
    public save(): IEncoderState {
        return super.save();
    }

    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        const len = this.state.cipherString.length;
        const result: ITestQuestionFields = {
            version: 2,
            answer: this.repeatStr(' ', len),
            notes: '',
        };
        return result;
    }

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IEncoderState, suppressOutput = false): void {
        super.restore(data, suppressOutput);
    }
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setOperation(this.state.operation);
    }
    /**
     * Determines if this generator is appropriate for a given test
     * type.  For Division A, the Caesar is limited to an offset +- 3
     * @param testType Test type to compare against
     * @param anyOperation Don't restrict based on the type of operation
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType, anyOperation: boolean): string {
        let result = super.CheckAppropriate(testType, anyOperation);
        if (!anyOperation && result === '' && testType !== undefined) {
            if (this.state.operation !== 'decode') {
                result = 'Only decode is allowed for ' + this.getTestTypeName(testType);
            } else if (testType === ITestType.aregional) {
                if (
                    this.state.cipherType === ICipherType.Caesar &&
                    this.state.offset > 3 &&
                    this.state.offset < 23
                ) {
                    result = 'Offset too large for ' + this.getTestTypeName(testType);
                }
            }
        }
        return result;
    }
    public setCipherType(cipherType: ICipherType): boolean {
        const changed = super.setCipherType(cipherType);
        if (cipherType === ICipherType.Caesar) {
            this.validTests = this.validCaesarTests;
            this.cipherName = 'Caesar'
        } else {
            this.validTests = this.validAtBashTests;
            this.cipherName = 'Atbash'
        }
        return changed;
    }
    public setOffset(offset: number): boolean {
        let changed = false;
        const charset = this.getCharset();
        offset = (offset + charset.length) % charset.length;
        if (offset === 0) {
            offset += this.advancedir;
            if (this.advancedir === 0) {
                offset++;
            }
            offset = (offset + charset.length) % charset.length;
        }
        if (this.state.offset !== offset) {
            this.state.offset = offset;
            changed = true;
        }
        return changed;
    }

    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.showLengthStatistics();
        if (this.state.cipherType === ICipherType.Caesar) {
            this.guidanceURL = 'TestGuidance.html#Caesar';
            $('.offset').show();
        } else {
            this.guidanceURL = 'TestGuidance.html#Atbash';
            $('.offset').hide();
        }
        JTRadioButtonSet('ciphertype', this.state.cipherType);
        JTRadioButtonSet('operation', this.state.operation);
        super.updateOutput();
        this.checkDuplicateKeys();
        this.attachHandlers();
    }

    /**
     * Initializes the encoder.
     */
    public init(lang: string): void {
        super.init(lang);
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
    }

    /**
     *  Generates the replacement map based on the type of cipher
     */
    public genAlphabet(): void {
        const charset = this.getSourceCharset();
        let replacement = charset;

        if (this.state.cipherType === ICipherType.Atbash) {
            replacement = charset
                .split('')
                .reverse()
                .join('');
        } else {
            replacement =
                charset.slice(this.state.offset) +
                charset.slice(0, this.state.offset);
        }
        // Remember that the replacement is backwards because the class is built
        // around decodeing.
        this.setReplacement(replacement, charset);
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        this.genAlphabet();
        this.validateQuestion()
        const res = this.build();
        $('#answer')
            .empty()
            .append(res);

        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
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
        const testtype = this.isUsedOnDivisionA() ? ITestType.aregional : ITestType.None;

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
        result.append(this.genAnswer(testtype));
        result.append(this.genSolution(testtype));
        return result;
    }

    public makeFreqEditField(c: string): JQuery<HTMLElement> {
        const einput = $('<span/>', {
            type: 'text',
            'data-char': c,
            id: 'm' + c,
        });
        return einput;
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);

        let radiobuttons = [
            CipherTypeButtonItem(ICipherType.Caesar),
            CipherTypeButtonItem(ICipherType.Atbash),
        ];
        result.append(JTRadioButton(8, 'ciphertype', radiobuttons, this.state.cipherType));

        radiobuttons = [
            { id: 'wrow', value: 'encode', title: 'Encode' },
            { id: 'mrow', value: 'decode', title: 'Decode' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));

        this.genQuestionFields(result);
        this.genEncodeField(result);
        result.append(
            JTFIncButton(
                'Caesar Offset',
                'offset',
                this.state.offset,
                'offset small-12 medium-6 large-6'
            )
        );
        return result;
    }

    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        this.genAlphabet();
        const strings = this.makeReplacement(this.state.cipherString, 9999);
        let toanswer = 1;
        if (this.state.operation === 'encode') {
            toanswer = 0;
        }

        let solution = undefined;
        for (const strset of strings) {
            solution = strset[toanswer].split('');
        }

        return this.calculateScore(solution, answer, this.state.points);
    }
    public getMinLength(str: string): number {
        let words = str.toUpperCase().replace(/[^A-Z]/g, " ").split(/ +/)
        let minlen = 0
        if (words.length > 0) {
            minlen = 9999
            for (const word of words) {
                if (word.length > 0 && word.length < minlen) {
                    minlen = word.length
                }
            }
        }
        return minlen
    }

    /**
      * Generate the recommended score and score ranges for a cipher
      * @returns Computed score ranges for the cipher
      */
    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)
        const usedOnA = this.isUsedOnDivisionA();

        let text = ''
        let rangetext = ''
        let extra = ''

        // Find the min length word
        qdata.minlength = this.getMinLength(qdata.quote)

        let suggested = 0
        let range = 5
        let scaleFactor = 1
        if (this.state.cipherType === ICipherType.Atbash) {
            range = 8
            if (usedOnA) {
                scaleFactor = 1.2;
            }
            suggested = Math.round(scaleFactor * (qdata.unique + qdata.len))
        } else {
            // Caesar Cipher
            range = 15
            if (usedOnA) {
                scaleFactor = 1.5;
            }
            suggested = Math.round(scaleFactor * (qdata.unique * 2.5 + qdata.len))
            if (this.state.offset <= 3 || this.state.offset >= 23) {
                suggested -= 10
                let reduce = 10
                if (Math.abs(this.state.offset) === 1 || this.state.offset === 24) {
                    suggested -= 10
                    reduce += 10
                }
                extra += ` The short shift of ${Math.abs(this.state.offset)} reduces the score by ${reduce} points.`
                if (qdata.minlength === 1) {
                    extra += ` The single letter word reduces the score by 15 points.`
                } else if (qdata.minlength === 2) {
                    extra += ` The double letter word reduces the score by 10 points.`
                }
            }
            if (qdata.minlength === 1) {
                suggested -= 15
            } else if (qdata.minlength === 2) {
                suggested -= 10
            }
        }
        const min = Math.max(suggested - range, 0)
        const max = suggested + range
        suggested += Math.round(range * Math.random() - range / 2);

        if (max > min) {
            rangetext = ` (From a range of ${min} to ${max})`
        }
        const minlen = usedOnA ? 30 : 50
        if (qdata.len < (minlen - 10)) {
            text = `<p><b>WARNING:</b> <em>There are only ${qdata.len} characters in the quote, we recommend at least ${minlen} characters for a good quote</em></p>`
        }
        if (qdata.len > 2) {
            text += `<p>There are ${qdata.len} characters in the quote, ${qdata.unique} of which are unique.${extra}
             We suggest you try a score of ${suggested}${rangetext}</p>`
        }
        return { suggested: suggested, min: min, max: max, text: text }
    }

    /**
     * Checks if the cipher is used on Division A
     * @returns True if used on Division A, false otherwise
     */
    public isUsedOnDivisionA() {
        let testUsage = this.getTestUsage();
        const usedOnA = testUsage.includes(ITestType.aregional) || testUsage.includes(ITestType.astate);
        return usedOnA;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        this.genAlphabet();
        let width = 37;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 30;
            extraclass = ' atest';
        }
        const strings = this.makeReplacement(this.state.cipherString, width);
        const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
        let tosolve = 0;
        let toanswer = 1;
        if (this.state.operation === 'encode') {
            tosolve = 1;
            toanswer = 0;
        }
        for (const strset of strings) {
            this.addCipherTableRows(table, undefined, strset[tosolve], strset[toanswer], true);
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
        const strings = this.genTestStrings(testType);
        const qnumdisp = String(qnum + 1);
        const idclass = 'I' + qnumdisp + '_';
        const result = $('<div/>', { id: 'Q' + qnumdisp });
        let tosolve = 0;
        if (this.state.operation === 'encode') {
            tosolve = 1;
        }
        let pos = 0;

        const table = new JTTable({ class: 'SOLVER' });
        for (const strset of strings) {
            const qrow = table.addBodyRow();
            const arow = table.addBodyRow();
            for (const c of strset[tosolve]) {
                const extraclass = '';
                const spos = String(pos);
                qrow.add({ settings: { class: 'TOSOLVEC' }, content: c });
                if (this.isValidChar(c)) {
                    arow.add({
                        settings: { class: extraclass },
                        content: $('<input/>', {
                            id: idclass + spos,
                            class: 'awc',
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

        result.append($('<textarea/>', { id: 'in' + String(qnum + 1), class: 'intnote' }));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        this.genAlphabet();
        let width = 37;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 30;
            extraclass = ' atest';
        }
        const strings = this.makeReplacement(this.state.cipherString, width);
        const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
        let tosolve = 0;
        if (this.state.operation === 'encode') {
            tosolve = 1;
        }
        for (const strset of strings) {
            this.addCipherTableRows(table, undefined, strset[tosolve], undefined, true);
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Returns a tuple of words in the problem cipher
     * The first element is an array of all single character words
     * The second element is an array of all double character words
     * The third element is an array of a single word being the first "long word"
     * which is the first word of 5 or more characters
     */
    public findWords(str: string): string[][] {
        let curstr = '';
        const result = [[], [], []];
        let longstr = '';
        for (const c of str) {
            if (this.isValidChar(c)) {
                curstr += c;
            } else if (c === ' ') {
                if (curstr.length === 1) {
                    if (result[0].indexOf(curstr) === -1) {
                        result[0].push(curstr);
                    }
                } else if (curstr.length === 2) {
                    if (result[1].indexOf(curstr) === -1) {
                        result[1].push(curstr);
                    }
                } else if (curstr.length > 4) {
                    if (longstr === '' || (longstr.length === 5 && curstr.length > 5)) {
                        longstr = curstr;
                    }
                }
                curstr = '';
            }
        }
        result[2].push(longstr);
        return result;
    }
    public decodeCaesar(str: string, key: string): string {
        let result = '';
        for (const c of str) {
            result += this.ciphermap.decode(c, key);
        }
        return result;
    }
    /**
     * Generates the printable solution for a cipher
     * @param testType The type of test
     * @returns The HTML for the solution
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        $('#answer').removeClass('ans').addClass('ansclean');
        this.genAlphabet();
        this.ciphermap = mapperFactory(ICipherType.Vigenere);
        if (this.state.operation === 'decode' && this.state.cipherType === ICipherType.Caesar) {
            return this.genCaesarSolution(testType);
        }
        if (this.state.operation === 'decode' && this.state.cipherType === ICipherType.Atbash) {
            return this.genAtbashSolution(testType);
        }
        return $('<div/>');
    }

    /**
     * Generates the solution for a Caesar cipher
     * @param testType The type of test
     * @returns The HTML for the solution
     */
    public genCaesarSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'ansclean' });
        const isDivisionA = testType === ITestType.aregional || testType === ITestType.astate;
        let foundAnswer = false;
        let charset = this.getCharset();
        result.append($('<h3/>').text('How to solve'));

        const strings = this.makeReplacement(
            this.state.cipherString,
            this.state.cipherString.length
        );
        const words = this.findWords(strings[0][0]);
        const realkey = this.ciphermap.decodeKey(
            strings[0][0][0],
            strings[0][1][0]
        );
        let longword = words[2][0];
        let todecode = ` the first long word ${this.fixedCt(longword)}`;
        if (longword === '') {
            longword = strings[0][0].slice(0, 10);
            todecode = ` the first few characters ${this.fixedCt(longword)}`;
        }
        if (words[0].length) {
            foundAnswer = this.genCaesarSolution1C(words[0][0], result, isDivisionA, charset, realkey, todecode, longword);
        } else if (words[1].length && !isDivisionA) {
            foundAnswer = this.genCaesarSolution2CDivB(words[1], result, todecode, longword, realkey, foundAnswer);
        }
        if (!foundAnswer) {
            if (isDivisionA) {
                foundAnswer = this.genCaesarSolution2CDivA(words[1], result, todecode, longword, charset, realkey);
            } else {
                result.append(
                    $('<p/>').text(
                        'At this point, we have to try a brute force method just going down the alphabet'
                    )
                );
                for (const key of this.getCharset()) {
                    const p = $('<p/>').text('Using the ' + key + ' row to decode ' + todecode);
                    p.append(", it comes out as '" + this.decodeCaesar(longword, key) + "'");
                    result.append(p);
                    if (key === realkey) {
                        result.append(
                            $('<p/>').text(
                                'Based on this, we believe that the key row is ' +
                                key +
                                ' which we can use to decode the remaining letters'
                            )
                        );
                        break;
                    }
                }
            }
        }
        return result;
    }
    /**
     * Generates the solution for a Division A Caesar cipher with a two letter word
     * @param words Array of two letter words found in the cipher
     * @param result The jQuery element to append the solution to
     * @param todecode The string to decode
     * @param longword The long word found in the cipher
     * @param charset The character set to use
     * @param realkey The real key for decoding
     */
    genCaesarSolution2CDivA(words: string[], result: JQuery<HTMLElement>, todecode: string, longword: string, charset: string, realkey: string): boolean {
        result.append($('<p/>').html(`Since we know that the amount of shift is no more than 3, we can simply write down the letters we want to decode and the letters that are 3 before and 3 after them. 
                 This gives us a total of 6 choices to look at to determine how we need to decode it.`));
        let totest = todecode
        let testword = longword
        if (words.length > 0) {
            totest = ` one of our two letter words ${this.fixedCt(words[0])}`;
            testword = words[0]
        }
        result.append($('<p/>').html(`for this we will use ${totest}`));
        const table = new JTTable({ class: 'ansblock caesar shrink cell unstriped' });
        const rowset = [
            table.addBodyRow(),
            table.addBodyRow(),
            table.addBodyRow(),
            table.addBodyRow(),
            table.addBodyRow(),
            table.addBodyRow(),
            table.addBodyRow(),]
        for (const c of testword) {
            const idx = this.getCharset().indexOf(c);
            rowset[0].add(this.getCharset()[(idx + 23) % 26]);
            rowset[1].add(this.getCharset()[(idx + 24) % 26]);
            rowset[2].add(this.getCharset()[(idx + 25) % 26]);
            rowset[3].add({ celltype: 'th', settings: { class: 'TOSOLVEC' }, content: c });
            rowset[4].add(this.getCharset()[(idx + 1) % 26]);
            rowset[5].add(this.getCharset()[(idx + 2) % 26]);
            rowset[6].add(this.getCharset()[(idx + 3) % 26]);
        }
        for (let i = 0; i < 7; i++) {
            let thisoffset = (i + 3 + 26) % 26;
            if (thisoffset === this.state.offset) {
                rowset[i].add($('<span/>').html(`&nbsp;&nbsp&lArr; This appears to be right`));
            }
            else {
                rowset[i].add(' ');
            }
        }
        result.append(table.generate());
        const ct = testword[0]
        const pt = this.decodeCaesar(testword[0], realkey)
        result.append($('<p/>').html(`Now we can see that ${this.fixedCt(ct)} decodes to be  ${this.fixedPt(pt)}. 
        We can use this to build a quick reference table for decoding the rest of the letters.
        Start by writing down all of the letters of the alphabet in a row and then place the letter ${this.fixedPt(pt)} under ${this.fixedCt(ct)}.`));
        this.generateCaesarFillInTable(result, charset, ct, pt, realkey, false);
        result.append($('<p/>').html(`Then following that letter, put the next letter of the alphabet in sequence, starting over at ${this.fixedPt('A')} when you hit ${this.fixedPt('Z')} and then wrapping
            back to the start of the table until everything is filled in.`));
        this.generateCaesarFillInTable(result, charset, ct, pt, realkey, true);
        result.append($('<p/>').html(`Now we can use this table to decode the rest of the letters in the cipher.`));
        return true;
    }

    public generateCaesarFillInTable(result: JQuery<HTMLElement>, charset: string, ct: string, pt: string, realkey: string, showfull: boolean): void {
        const table2 = new JTTable({ class: 'ansblock caesar shrink cell unstriped' });
        const ctrow = table2.addBodyRow();
        const ptrow = table2.addBodyRow();
        for (const c of charset) {
            ctrow.add({ celltype: 'th', content: c });
            if (c === ct) {
                ptrow.add({ settings: { class: 'a' }, content: pt });
            } else {
                if (showfull) {
                    ptrow.add({ settings: { class: 'a' }, content: this.decodeCaesar(c, realkey) });
                } else {
                    ptrow.add(' ');
                }
            }
        }
        result.append(table2.generate());
    }

    public genCaesarSolution2CDivB(words: string[], result: JQuery<HTMLElement>, todecode: string, longword: string, realkey: string, foundAnswer: boolean): boolean {
        const let2list = [
            'AS',
            'AT',
            'AN',
            'AM',
            'BE',
            'BY',
            'IN',
            'IT',
            'IS',
            'IF',
            'ME',
            'MY',
            'OF',
            'OR',
            'ON',
            'UP',
            'US',
            'DO',
            'GO',
            'NO',
            'SO',
            'TO',
            'HE',
            'WE',
            'AB',
            'AD',
            'AH',
            'HI',
            'HO',
            'ID',
            'MU',
            'OH',
            'OK',
            'OX',
            'UH',
            'UM',
        ];

        let ptext = `Since there are no single letter words we look for the double letter words and find `
        let extra = '';
        const possible: BoolMap = {};
        for (const word of words) {
            ptext += extra + this.fixedCt(extra + word);
            extra = ' and ';
        }
        ptext += '.';
        result.append($('<p/>').html(ptext));
        result.append($('<p/>').html(
            `We can use a simple trick to test them quickly which only requires looking up 8 characters:
             six letters mapping the beginning (A B I M O U) and two letters at the end (O E).`
        ));

        result.append($('<p/>').html(`The starting letters match against
        ${this.fixedPt('As')}/${this.fixedPt('At')}/${this.fixedPt('An')}/${this.fixedPt('Am')},
        ${this.fixedPt('Be')}/${this.fixedPt('By')},
        ${this.fixedPt('In')}/${this.fixedPt('It')}/${this.fixedPt('Is')}/${this.fixedPt('If')},
        ${this.fixedPt('Me')}/${this.fixedPt('My')},
        ${this.fixedPt('Of')}/${this.fixedPt('Or')}/${this.fixedPt('On')},
        and ${this.fixedPt('Up')}/${this.fixedPt('Us')}.
        The ending letters match against 
        ${this.fixedPt('dO')}/${this.fixedPt('gO')}/${this.fixedPt('nO')}/${this.fixedPt('sO')}/${this.fixedPt('tO')}
        and ${this.fixedPt('hE')}/${this.fixedPt('wE')}.`));

        const ul = $('<ul/>');
        for (const c of ['A', 'B', 'I', 'M', 'O', 'U']) {
            ptext = `Using the beginning letter ${this.fixedPt(c)} gives `;
            extra = '';
            for (const word of words) {
                const key = this.ciphermap.decodeKey(word, c);
                const decoded = this.decodeCaesar(word, key);
                // See if it is one of the possible two letter words
                if (let2list.indexOf(decoded) !== -1) {
                    ptext += ' a common word ';
                    if (possible[key] !== false) {
                        possible[key] = true;
                    }
                } else {
                    possible[key] = false;
                }
                ptext += `${extra}${this.fixedPt(decoded)} with a key of ${this.fixedCt(key)}`;
                extra = ' and ';
            }
            ul.append($('<li/>').html(ptext));
        }
        for (const c of ['O', 'E']) {
            ptext = `Using the ending letter ${this.fixedPt(c)} gives `;
            extra = '';
            for (const word of words) {
                const key = this.ciphermap.decodeKey(word[1], c);
                const decoded = this.decodeCaesar(word, key);
                // See if it is one of the possible two letter words
                if (let2list.indexOf(decoded) !== -1) {
                    ptext += ' a common word ';
                    if (possible[key] !== false) {
                        possible[key] = true;
                    }
                } else {
                    possible[key] = false;
                }
                ptext += `${extra}'${this.fixedPt(decoded)}' with a key of ${this.fixedCt(key)}`;
                extra = ' and ';
            }
            ul.append($('<li/>').html(ptext));
        }
        result.append(ul);
        // Now find out what common words produced testable keys
        const goodkeys = [];
        for (const c in possible) {
            if (possible[c] === true) {
                goodkeys.push(c);
            }
        }
        //
        if (goodkeys.length === 0) {
            result.append($('<p/>').text("We didn't find any matches"));
        } else if (goodkeys.length === 1) {
            result.append(
                $('<p/>').html(`Based on this, we believe that the key row is ${this.fixedCt(goodkeys[0])} which we can use to decode the remaining letters`)
            );
            ptext = `We can confirm it by using the ${this.fixedCt(goodkeys[0])} row to decode ${todecode},
             we see it comes out as ${this.fixedPt(this.decodeCaesar(longword, goodkeys[0]))}`
            if (goodkeys[0] === realkey) {
                ptext += ` which confirms our guess and we can use it to decode the remainder of the letters.`
            }
            result.append($('<p/>').html(ptext));
        } else {
            result.append(
                $('<p/>').html(`Since we have several possible choices, we have to try them out on ${todecode}.`)
            );
            const ul = $('<ul/>');
            for (const key of goodkeys) {
                ul.append($('<li/>').html(`Using the ${this.fixedCt(key)} row to decode ${todecode} it comes out as '${this.decodeCaesar(longword, key)}'`));
            }
            result.append(ul);
            if (goodkeys.indexOf(realkey) !== -1) {
                result.append(
                    $('<p/>').html(`Based on this, we believe that the key row is ${this.fixedCt(realkey)} which we can use to decode the remaining letters`
                    )
                );
                foundAnswer = true;
            }
        }
        return foundAnswer;
    }

    public genCaesarSolution1C(let1word: string, result: JQuery<HTMLElement>, isDivisionA: boolean, charset: string, realkey: string, todecode: string, longword: string): boolean {
        let foundAnswer = false;
        const akey = this.ciphermap.decodeKey(let1word, 'A');
        const ikey = this.ciphermap.decodeKey(let1word, 'I');
        const let1CT = this.fixedCt(let1word);
        result.append($('<p/>').html(
            `We start out by looking for short words to decode and then see if that encoding makes sense.
                 We find a single letter word ${let1CT} which is likely to be either ${this.fixedPt('A')} or ${this.fixedPt('I')}.`));
        let skipA = false;
        if (let1word === 'A') {
            result.append($('<p/>').html(`Since the cipher text is ${let1CT} and we know that there must be a shift, it can't just be ${this.fixedPt('A')} so we can eliminate that possibility.`));
            skipA = true;
        }
        if (isDivisionA) {
            let note = `For Division A, we know that the key is no more than 3 letters away from the original letter.`;
            if (!skipA) {
                const delta = Math.abs((charset.indexOf(let1word) - charset.indexOf('A')) % 26);
                if (delta > 3) {
                    note += ` Since ${let1CT} is more than 3 letters away from ${this.fixedPt('A')}, we can eliminate that possibility.
                        (For a shift of 3, ${this.fixedPt('A')} could only be ${this.fixedCt('X')}, ${this.fixedCt('Y')}, ${this.fixedCt('Z')}, ${this.fixedCt('B')}, ${this.fixedCt('C')}, or ${this.fixedCt('D')})`;
                    skipA = true;
                }
            }
            result.append($('<p/>').html(note));
        }
        if (!skipA) {
            result.append($('<p/>').html(`With ${let1CT}=${this.fixedPt('A')} we look in the decoding table for a ${let1CT} in the ${this.fixedPt('A')} column
             and see that it is the ${this.fixedPt(akey)} row`));
            if (akey === realkey) {
                foundAnswer = true;
            }
            const notgood = foundAnswer ? '' : ` which doesn't seem reasonable`;
            result.append($('<p/>').html(`Using this row to decode ${todecode} we get ${this.fixedPt(this.decodeCaesar(longword, akey))}${notgood}`));
        }
        if (!foundAnswer) {
            let skipI = false;
            if (isDivisionA) {
                let note = ``;
                const delta = Math.abs((charset.indexOf(let1word) - charset.indexOf('I')) % 26);
                if (delta > 3) {
                    note += ` Since ${let1CT} is more than 3 letters away from ${this.fixedPt('I')}, we can eliminate that possibility.
                        (For a shift of 3, ${this.fixedPt('I')} could only be ${this.fixedCt('F')}, ${this.fixedCt('G')}, ${this.fixedCt('H')}, ${this.fixedCt('J')}, ${this.fixedCt('K')}, or ${this.fixedCt('L')})`;
                    skipI = true;
                }
                result.append($('<p/>').html(note));
            }
            if (!skipI) {

                result.append($('<p/>').html(
                    `With ${let1CT}=${this.fixedPt('I')} we look in the decoding table for a ${let1CT} in the ${this.fixedCt('I')} column
                and see that it is the ${this.fixedCt(ikey)} row`));
                if (ikey === realkey) {
                    foundAnswer = true;
                }
                const notgood = foundAnswer ? '' : ` which doesn't seem reasonable`;
                result.append($('<p/>').html(`Using the ${this.fixedCt(ikey)} row to decode ${todecode} we get ${this.fixedPt(this.decodeCaesar(longword, ikey))}${notgood}`));
            }
        }
        if (foundAnswer) {
            result.append(
                $('<p/>').html(`Based on this, we believe that the key row is ${this.fixedCt(realkey)} which we can use to decode the remaining letters`)
            );
        } else {
            result.append($('<p/>').html(`Since the single letter word doesn't map to ${this.fixedPt('A')} or ${this.fixedPt('I')}, we have to decode another way.`));
        }
        return foundAnswer;
    }

    /**
     * Generates the solution for an Atbash cipher
     * @param testType The type of test
     * @returns The HTML for the solution
     */
    public genAtbashSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        result.append($('<h3/>').text('How to solve'));
        result.append($('<p/>').text('Look for the AtBash table on the resource sheet which looks like this:'));
        const table = new JTTable({ class: 'shrink cell unstriped instlook' });
        const headerRow = table.addHeaderRow();
        const bodyRow = table.addBodyRow();
        const charset = this.getSourceCharset();
        let charcount = charset.length;
        for (let i = 0; i < charcount; i++) {
            const c = charset[i];
            headerRow.add(c);
            bodyRow.add(charset[charcount - 1 - i]);
        }
        result.append($('<div/>', { class: "grid-x" }).append(table.generate()));
        result.append($('<p/>').text(`For each letter in the cipher, find it in the top row and then write down the corresponding letter from the bottom row.
           Note that the AtBash cipher is its own inverse, so you can look at the bottom row and write down the corresponding letter from the top row and get the same result.
           It can also be faster to fill in all the letters that match what you look up.  Also paying attention to the fact that the alphabet is simply reversed, you can 
           also fill in the opposite letter for each letter you look up.  For example, if you look up the letter 'A' and find that it corresponds to 'Z', 
           then you can also fill in 'Z' with 'A'.`));

        return result;
    }
}
