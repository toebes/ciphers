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
            replacement = charset.substr(this.state.offset) + charset.substr(0, this.state.offset);
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
        const res = this.build();
        $('#answer')
            .empty()
            .append(res);

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
     * Generates the sample question text for table ciphers
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {
        const cipherName = this.state.cipherType === ICipherType.Caesar ? 'Caesar' : 'Atbash';
        return (
            `<p>Decode this quote${this.genAuthor()} which has been encoded using the
             ${cipherName} Cipher.</p>`
        );
    }

    /**
      * Generate the recommended score and score ranges for a cipher
      * @returns Computed score ranges for the cipher
      */
    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)
        let testUsage = this.getTestUsage();
        const usedOnA = testUsage.includes(ITestType.aregional) || testUsage.includes(ITestType.astate);

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
    // tslint:disable-next-line:cyclomatic-complexity
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        let needsbrute = false;
        this.genAlphabet();
        this.ciphermap = mapperFactory(ICipherType.Vigenere);
        if (this.state.operation === 'decode' && this.state.cipherType === ICipherType.Caesar) {
            result.append($('<h3/>').text('How to solve'));

            const strings = this.makeReplacement(
                this.state.cipherString,
                this.state.cipherString.length
            );
            const words = this.findWords(strings[0][0]);
            const realkey = this.ciphermap.decodeKey(
                strings[0][0].substr(0, 1),
                strings[0][1].substr(0, 1)
            );
            let longword = words[2][0];
            let todecode = " the first long word '" + longword + "'";
            if (longword === '') {
                longword = strings[0][0].substr(0, 10);
                todecode = " the first few characters '" + longword + "'";
            }
            if (words[0].length) {
                const let1word = words[0][0];
                const akey = this.ciphermap.decodeKey(let1word, 'A');
                const ikey = this.ciphermap.decodeKey(let1word, 'I');
                let p = $('<p/>').text(
                    'We start out by looking for short words to decode and then see if that encoding makes sense. '
                );
                p.append(
                    'Since we have a single letter word, we try out ' +
                    let1word +
                    '=A and ' +
                    let1word +
                    '=I.'
                );
                result.append(p);
                p = $('<p/>').text(
                    'With ' +
                    let1word +
                    '=A we look in the decoding table for a ' +
                    let1word +
                    ' in the A column'
                );
                p.append(' and see that it is the ' + akey + ' row');
                result.append(p);
                p = $('<p/>').text('Using the ' + akey + ' row to decode ' + todecode);
                p.append(", it comes out as '" + this.decodeCaesar(longword, akey) + "'");
                result.append(p);
                p = $('<p/>').text(
                    'With ' +
                    let1word +
                    '=I we look in the decoding table for a ' +
                    let1word +
                    ' in the I column'
                );
                p.append(' and see that it is the ' + ikey + ' row');
                result.append(p);
                p = $('<p/>').text('Using the ' + ikey + ' row to decode ' + todecode);
                p.append(", it comes out as '" + this.decodeCaesar(longword, ikey) + "'");
                result.append(p);
                if (ikey === realkey || akey === realkey) {
                    result.append(
                        $('<p/>').text(
                            'Based on this, we believe that the key row is ' +
                            realkey +
                            ' which we can use to decode the remaining letters'
                        )
                    );
                } else {
                    needsbrute = true;
                }
            } else if (words[1].length) {
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

                let p = $('<p/>').text(
                    'Since there are no single letter words we look for the double letter words and find '
                );
                let extra = '';
                const possible: BoolMap = {};
                for (const word of words[1]) {
                    p.append(extra + word);
                    extra = ' and ';
                }
                p.append('.');
                result.append(p);
                p = $('<p/>').text(
                    'We can use a simple trick to test them quickly which only requires looking up 8 characters:'
                );
                p.append(
                    ' six letters mapping the beginning (A B I M O U) and two letters at the end (O E).'
                );
                p.append('The letters are  for the beginning and  for the end.');
                result.append(p);
                p = $('<p/>').text('The starting letters match against ');
                p.append('As/At/An/Am, Be/By, In/It/Is/If, Me/My, Of/Or/On, and Up/Us.');
                p.append(' The ending letters match against ');
                p.append('dO/gO/nO/sO/tO and hE/wE.');
                result.append(p);

                for (const c of ['A', 'B', 'I', 'M', 'O', 'U']) {
                    p = $('<p/>').text('Using the beginning letter ' + c + ' gives ');
                    extra = '';
                    for (const word of words[1]) {
                        const key = this.ciphermap.decodeKey(word, c);
                        const decoded = this.decodeCaesar(word, key);
                        // See if it is one of the possible two letter words
                        if (let2list.indexOf(decoded) !== -1) {
                            p.append(' a common word ');
                            if (possible[key] !== false) {
                                possible[key] = true;
                            }
                        } else {
                            possible[key] = false;
                        }
                        p.append(extra + decoded + ' with a key of ' + key);
                        extra = ' and ';
                    }
                    result.append(p);
                }
                for (const c of ['O', 'E']) {
                    p = $('<p/>').text('Using the ending letter ' + c + ' gives ');
                    extra = '';
                    for (const word of words[1]) {
                        const key = this.ciphermap.decodeKey(word.substr(1, 1), c);
                        const decoded = this.decodeCaesar(word, key);
                        // See if it is one of the possible two letter words
                        if (let2list.indexOf(decoded) !== -1) {
                            p.append(' a common word ');
                            if (possible[key] !== false) {
                                possible[key] = true;
                            }
                        } else {
                            possible[key] = false;
                        }
                        p.append(extra + "'" + decoded + "' with a key of " + key);
                        extra = ' and ';
                    }
                    result.append(p);
                }
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
                        $('<p/>').text(
                            'Based on this, we believe that the key row is ' +
                            goodkeys[0] +
                            ' which we can use to decode the remaining letters'
                        )
                    );
                    p = $('<p/>').text(
                        'We can confirm it by using the ' +
                        goodkeys[0] +
                        ' row to decode ' +
                        todecode
                    );
                    p.append(
                        ", we see it comes out as '" +
                        this.decodeCaesar(longword, goodkeys[0]) +
                        "'"
                    );
                    if (goodkeys[0] === realkey) {
                        p.append(
                            ' which confirms our guess and we can use it to decode the remainder of the letters.'
                        );
                    }
                    result.append(p);
                } else {
                    result.append(
                        $('<p/>').text(
                            'Since we have several possible choices, we have to try them out on ' +
                            todecode
                        )
                    );
                    for (const key of goodkeys) {
                        p = $('<p/>').text('Using the ' + key + ' row to decode ' + todecode);
                        p.append(", it comes out as '" + this.decodeCaesar(longword, key) + "'");
                        result.append(p);
                    }
                    if (goodkeys.indexOf(realkey) !== -1) {
                        result.append(
                            $('<p/>').text(
                                'Based on this, we believe that the key row is ' +
                                realkey +
                                ' which we can use to decode the remaining letters'
                            )
                        );
                    } else {
                        needsbrute = true;
                    }
                }
            } else {
                needsbrute = true;
            }
            if (needsbrute) {
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
}
