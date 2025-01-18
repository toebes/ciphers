import { cloneObject, StringMap, makeFilledArray, NumberMap } from '../common/ciphercommon';
import {
    IState,
    ITestType,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
    QuoteRecord,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { isCoPrime } from '../common/mathsupport';
import { renderMath } from '../common/renderMath';
import { CipherEncoder, suggestedData } from './cipherencoder';

// Configure how we want the multiplication to appear - either as a * or a dot
const kmathMult = '*';
// const kmathMult = ' \\cdot '

interface IAffineState extends IState {
    /** a value */
    a: number;
    /** b value */
    b: number;
    /** The first clicked number in the solution */
    solclick1: number;
    /** The second clicked number  */
    solclick2: number;
    /** The size of the chunking blocks for output - 0 means respect the spaces */
    blocksize: number;
}

interface ICribPos {
    plaintext: string;
    ciphertext: string;
    position: number;
}
const scoreWeights: NumberMap = {
    'E': 1, 'T': 1, 'A': 1, 'O': 1, 'I': 1, 'N': 1,
    'S': 2, 'R': 2, 'H': 2, 'L': 2, 'D': 2,
    'C': 3, 'U': 3, 'M': 3, 'F': 3, 'P': 3,
    'G': 4, 'W': 4, 'Y': 4, 'B': 4, 'V': 4,
    'K': 5, 'X': 5, 'J': 5, 'Q': 5, 'Z': 5
}
/**
 * CipherAffineEncoder implements the Affine methods
 */
export class CipherAffineEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Affine';
    public cipherName = 'Affine'

    public validTests: ITestType[] = [
        ITestType.None,
        // Affine gets dropped for Division C for the 2022-2023 season
        // ITestType.cregional, 
        // ITestType.cstate,
        ITestType.bregional,
        ITestType.bstate,
    ];

    public defaultstate: IAffineState = {
        /** The type of operation */
        operation: 'encode' /** a value */,
        a: 1 /** b value */,
        b: 0,
        cipherString: '' /** The type of cipher we are doing */,
        cipherType: ICipherType.Affine /** The first clicked number in the solution */,
        solclick1: -1 /** The second clicked number  */,
        solclick2: -1,
        replacement: {},
        blocksize: 0,
    };
    public state: IAffineState = cloneObject(this.defaultstate) as IAffineState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];
    /* We have identified a complete solution */
    public completeSolution = false;
    /**
     * Make a copy of the current state
     */
    public save(): IState {
        // We need a deep copy of the save state
        const savestate = cloneObject(this.state) as IState;
        return savestate;
    }
    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        const result: ITestQuestionFields = {
            // Affine must keep the array approach because we allow multiple
            // characters in each cell
            answer: makeFilledArray(this.state.cipherString.length, ''),
            notes: '',
        };
        return result;
    }
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IAffineState, suppressOutput = false): void {
        this.state = cloneObject(this.defaultstate) as IAffineState;
        this.copyState(this.state, data);
        if (isNaN(this.state.solclick1)) {
            this.state.solclick1 = -1;
        }
        if (isNaN(this.state.solclick2)) {
            this.state.solclick2 = -1;
        }
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Determines if this generator is appropriate for a given test
     * type.  For Division B, only decode is allowed
     * Cryptanalysis is only allowed at the state level
     *   decode - cregional/cstate/bregional/bstate
     *   encode - cregional/cstate
     *   crypt - cstate/bstate
     * @param testType Test type to compare against
     * @param anyOperation Don't restrict based on the type of operation
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType, anyOperation: boolean): string {
        let result = super.CheckAppropriate(testType, anyOperation);
        if (!anyOperation && result === '' && testType !== undefined) {
            if (
                (testType === ITestType.cregional ||
                    testType === ITestType.cstate ||
                    testType === ITestType.bregional ||
                    testType === ITestType.bstate) &&
                this.state.operation === 'encode'
            ) {
                result = 'Encode problems are not allowed on ' + this.getTestTypeName(testType);
            } else if (
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
    public setUIDefaults(): void {
        this.seta(this.state.a);
        this.setb(this.state.b);
        this.setOperation(this.state.operation);
        this.setBlocksize(this.state.blocksize);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        $('#a').val(this.state.a);
        $('#b').val(this.state.b);

        JTRadioButtonSet('operation', this.state.operation);

        this.guidanceURL = 'TestGuidance.html#Affine' + this.state.operation;

        if (this.state.solclick1 !== -1) {
            $('td#m' + this.state.solclick1).addClass('TOSOLVECLICK');
            $('td#p' + this.state.solclick1).addClass('TOSOLVECLICK');
        }
        if (this.state.solclick2 !== -1) {
            $('td#m' + this.state.solclick2).addClass('TOSOLVECLICK');
            $('td#p' + this.state.solclick2).addClass('TOSOLVECLICK');
        }
        $('#blocksize').val(this.state.blocksize);
        this.validateQuestion();
        this.attachHandlers();
    }
    public setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }
    /**
      * Generate the recommended score and score ranges for a cipher
      * @returns Computed score ranges for the cipher and text to display with it
      */
    public genScoreRangeAndText(): suggestedData {
        let text = ''
        let rangetext = ''

        const qdata = this.analyzeQuote(this.state.cipherString)

        const unique = qdata.minquote.split('').filter((x, i, a) => a.indexOf(x) === i);
        let suggested = 0
        for (let c of unique) {
            if (scoreWeights[c] !== undefined)
                suggested += scoreWeights[c]
        }

        //let suggested = Math.round(qdata.unique * 1.5 + qdata.len)
        suggested = Math.round(3.2 * suggested)
        let range = 20
        if (this.state.operation === 'crypt') {
            suggested += 35;
            range = 25
        }
        if (this.state.blocksize > 0) {
            suggested += 50;
        }
        const min = Math.max(suggested - range, 0)
        const max = suggested + range
        suggested += Math.round(range * Math.random() - range / 2);

        if (qdata.len < 15) {
            text += `<p><b>WARNING:</b> <em>There are only ${qdata.len} characters in the quote, we recommend at least 20 characters for a good quote</em></p>`
        }

        if (qdata.len > 2) {
            text += `<p>There are ${qdata.len} characters in the quote, ${qdata.unique} of which are unique.
             We suggest you try a score of ${suggested} (From a range of ${min} to ${max})</p>`
        }

        return { suggested: suggested, min: min, max: max, text: text }
    }
    /**
     * Figure out where the crib characters are (and if they are together)
     * as well as the corresponding plain text character
     */
    public placeCrib(): ICribPos[] {
        let result: ICribPos[] = undefined;
        if (this.state.solclick1 !== -1 && this.state.solclick2 !== -1) {
            const msg = this.minimizeString(this.state.cipherString);
            const pt1 = msg.substr(this.state.solclick1, 1);
            const pt2 = msg.substr(this.state.solclick2, 1);
            const ct1 = this.affinechar(pt1);
            const ct2 = this.affinechar(pt2);

            if (this.state.solclick2 === this.state.solclick1 + 1) {
                result = [
                    {
                        plaintext: pt1 + pt2,
                        ciphertext: ct1 + ct2,
                        position: this.state.solclick1,
                    },
                ];
            } else if (this.state.solclick2 === this.state.solclick1 + 1) {
                result = [
                    {
                        plaintext: pt2 + pt1,
                        ciphertext: ct2 + ct1,
                        position: this.state.solclick2,
                    },
                ];
            } else {
                // They aren't next to each other
                result = [
                    {
                        plaintext: pt1,
                        ciphertext: ct1,
                        position: this.state.solclick1,
                    },
                    {
                        plaintext: pt2,
                        ciphertext: ct2,
                        position: this.state.solclick2,
                    },
                ];
            }
        }
        return result;
    }
    public findQuestionMatch(questionText, pt, ct, pos): boolean {
        const rep = new RegExp('\\b' + pt + '\\b');
        // If the plain text is not mentioned in the question, then they have
        // a problem to fix.
        if (questionText.match(rep) === null) {
            return false;
        }
        // If the crib is at the beginning, look for something in the
        // question that says something like "Starts with XX" or
        // XX can be found at the start
        if (
            pos === 0 &&
            (questionText.indexOf('START') >= 0 ||
                questionText.indexOf('BEGIN') >= 0 ||
                questionText.indexOf('FIRST') >= 0)
        ) {
            return true;
        }

        const ptstring = this.minimizeString(this.state.cipherString);

        // If the crib is at the end, look for something in the
        // question that says something like "Ends with XX" or
        // XX can be found at the end
        if (
            pos === ptstring.length - 2 &&
            (questionText.indexOf('END') >= 0 ||
                questionText.indexOf('FINAL') >= 0 ||
                questionText.indexOf('LAST') >= 0)
        ) {
            return true;
        }

        // If the crib is at the end, look for something in the
        // question that says something like "Ends with XX" or
        // XX can be found at the end
        if (
            pos === ptstring.length - 2 &&
            (questionText.indexOf('2') >= 0 ||
                questionText.indexOf('2ND') >= 0 ||
                questionText.indexOf('SECOND') >= 0)
        ) {
            return true;
        }

        const rec = new RegExp('\\b' + ct + '\\b');
        if (questionText.match(rec) !== null) {
            return true;
        }
        return false;
    }
    /**
     * Check for any errors we can find in the question
     */
    public validateQuestion(): void {
        let msg = '';
        let sampleLink: JQuery<HTMLElement> = undefined;
        const questionText = this.state.question.toUpperCase();
        if (this.state.operation === 'crypt') {
            const cribpos = this.placeCrib();
            if (cribpos === undefined) {
                msg = 'Not enough hint digits selected';
            } else {
                if (cribpos.length === 1) {
                    msg =
                        'The Question Text does not specify how the Crib letters ' +
                        cribpos[0].plaintext +
                        ' are mapped';
                    // See if they mention both letters at once
                    if (
                        this.findQuestionMatch(
                            questionText,
                            cribpos[0].plaintext,
                            cribpos[0].ciphertext,
                            cribpos[0].position
                        )
                    ) {
                        msg = '';
                        // If not, see if they are mentioned one at a time.
                    } else if (
                        this.findQuestionMatch(
                            questionText,
                            cribpos[0].plaintext[0],
                            cribpos[0].ciphertext[0],
                            cribpos[0].position
                        ) &&
                        this.findQuestionMatch(
                            questionText,
                            cribpos[0].plaintext[1],
                            cribpos[0].ciphertext[1],
                            cribpos[0].position + 1
                        )
                    ) {
                        msg = '';
                    }
                } else {
                    // crib letters are not adjacent.  Look for them both separately
                    for (const cribent of cribpos) {
                        if (
                            !this.findQuestionMatch(
                                questionText,
                                cribent.plaintext,
                                cribent.ciphertext,
                                cribent.position
                            )
                        ) {
                            msg =
                                'The Question Text does not specify how the Crib letter ' +
                                cribent.plaintext +
                                ' is mapped';
                            break;
                        }
                    }
                }
            }
        } else {
            // Look to see if they specify a and b
            const rea = new RegExp('A.*' + String(this.state.a));
            const reb = new RegExp('B.*' + String(this.state.b));
            if (!questionText.match(rea)) {
                if (!questionText.match(reb)) {
                    msg = "The Question Text doesn't appear to mention the value of A or B. ";
                } else {
                    msg = "The Question Text doesn't appear to mention the value of A. ";
                }
            } else if (!questionText.match(reb)) {
                msg = "The Question Text doesn't appear to mention the value of B. ";
            }
            // Check to see if they specified encode/encryption
            //    for an encode type problem or
            //   decode/decryption for a decode type problem
            if (this.state.operation === 'encode') {
                if (questionText.indexOf('ENCRY') < 0 && questionText.indexOf('ENCOD') < 0) {
                    msg += "The Question Text doesn't indicate that the text should be encoded.";
                }
            } else {
                if (
                    questionText.indexOf('DECRY') < 0 &&
                    questionText.indexOf('DECOD') < 0 &&
                    questionText.indexOf('BEEN ENC') < 0 &&
                    questionText.indexOf('WAS ENC') < 0
                ) {
                    msg += "The Question Text doesn't indicate that the text should be decoded.";
                }
            }
        }
        if (msg !== '') {
            sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');
        }

        this.setErrorMsg(msg, 'vq', sampleLink);
    }
    /**
     * Generates the sample question text for a cipher
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {
        let msg = '';
        if (this.state.operation === 'crypt') {
            msg = '<p>The following quote' + this.genAuthor() + ' has been encoded using the Affine Cipher. ';
            const cribpos = this.placeCrib();
            const ptstring = this.minimizeString(this.state.cipherString);
            if (cribpos === undefined) {
                msg += 'But not enough hint digits have been selected';
            } else if (cribpos.length === 1) {
                if (cribpos[0].position === 0) {
                    msg +=
                        'You are told that the deciphered text starts with ' +
                        this.genMonoText(cribpos[0].plaintext);
                } else if (cribpos[0].position === ptstring.length - 2) {
                    msg +=
                        'You are told that the deciphered text ends with ' +
                        this.genMonoText(cribpos[0].plaintext);
                } else {
                    msg +=
                        'You are told that the cipher text ' +
                        this.genMonoText(cribpos[0].ciphertext) +
                        ' decodes to be ';
                    this.genMonoText(cribpos[0].plaintext);
                }
            } else {
                // Crib characters aren't together
                let extra = 'You are told that ';
                for (const cribent of cribpos) {
                    msg +=
                        extra +
                        this.genMonoText(cribent.ciphertext) +
                        ' decodes to be ' +
                        this.genMonoText(cribent.plaintext);
                    extra = ' and ';
                }
            }
            msg += '.';
        } else {
            if (this.state.operation === 'encode') {
                msg =
                    '<p>The following quote' + this.genAuthor() + ' needs to be encoded ' +
                    ' with the Affine Cipher using ';
            } else {
                msg =
                    '<p>The following quote' + this.genAuthor() + ' needs to be decoded ' +
                    ' with the Affine Cipher where ';
            }
            msg +=
                '<strong><i>a</i>=' +
                this.genMonoText(String(this.state.a)) +
                ' </strong> and <strong><i>b</i>=' +
                this.genMonoText(String(this.state.b)) +
                '</strong>.';
            msg += '</p>';
        }
        return msg;
    }

    public addQuestionOptions(qOptions: string[], langtext: string, hinttext: string, fixedName: string, operationtext: string, operationtext2: string, cipherAorAn: string): boolean {

        operationtext2 = ` with a = ${this.state.a} and b = ${this.state.b}`;
        return super.addQuestionOptions(qOptions, langtext, hinttext, fixedName, operationtext, operationtext2, cipherAorAn);

    }
    /**
     * Sets the new A value.  A direction is also provided in the state so that if the
     * intended value is bad, we can keep advancing until we find one
     */
    public seta(a: number): boolean {
        let changed = false;
        const charset = this.getCharset();
        if (a !== this.state.a) {
            if (this.advancedir !== 0) {
                while (a !== this.state.a && !isCoPrime(a, charset.length)) {
                    a = (a + charset.length + this.advancedir) % charset.length;
                }
            }
            if (!isCoPrime(a, charset.length)) {
                $('#err').text('A value of ' + a + ' is not coprime with ' + charset.length);
            }
            if (a > charset.length) {
                $('#err').text('A value of ' + a + ' must be smaller than ' + (charset.length + 1));
            }
        }
        if (this.state.a !== a) {
            this.state.a = a;
            changed = true;
        }
        return changed;
    }
    public setb(b: number): boolean {
        let changed = false;
        const charset = this.getCharset();
        b = (b + charset.length) % charset.length;
        if (this.state.b !== b) {
            this.state.b = b;
            changed = true;
        }
        return changed;
    }
    public affinechar(c: string): string {
        const charset = this.getCharset();
        const x = charset.indexOf(c.toUpperCase());
        if (x < 0) {
            return c;
        }
        const y = (this.state.a * x + this.state.b) % charset.length;
        const res = charset.substr(y, 1);
        return res;
    }
    /**
     * Initializes the encoder.
     * We don't want to show the reverse replacement since we are doing an encode
     */
    public init(lang: string): void {
        super.init(lang);
        this.ShowRevReplace = false;
    }
    public setBlocksize(blocksize: number): boolean {
        let changed = false;
        if (this.state.blocksize !== blocksize) {
            this.state.blocksize = blocksize;
            changed = true;
        }
        return changed;
    }
    public buildReplacement(msg: string, maxEncodeWidth: number): string[][] {
        const result: string[][] = [];
        let message = '';
        let cipher = '';
        const encoded = this.chunk(msg, this.state.blocksize);
        const msgLength = encoded.length;
        let lastSplit = -1;
        const msgstr = encoded.toUpperCase();

        for (let i = 0; i < msgLength; i++) {
            const messageChar = msgstr.substring(i, i + 1);
            let cipherChar = '';
            if (this.isValidChar(messageChar)) {
                message += messageChar;
                cipherChar = this.affinechar(messageChar);
                cipher += cipherChar;
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
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.  This returns the result
     * as the HTML to be displayed
     */
    public build(): JQuery<HTMLElement> {
        const msg = this.chunk(this.state.cipherString, this.state.blocksize);
        const strings = this.buildReplacement(msg, this.maxEncodeWidth);
        const result = $('<div/>');
        for (const strset of strings) {
            const table = new JTTable({
                class: 'cell shrink tfreq',
            });
            const toprow = table.addBodyRow();
            const bottomrow = table.addBodyRow();
            for (let i = 0; i < strset[0].length; i++) {
                const plainchar = strset[1].substring(i, i + 1);
                const cipherchar = strset[0].substring(i, i + 1);

                if (this.isValidChar(plainchar)) {
                    if (this.state.operation === 'encode') {
                        toprow.add({
                            settings: { class: 'TOSOLVE' },
                            content: plainchar,
                        });
                        bottomrow.add({
                            settings: { class: 'TOANSWER' },
                            content: cipherchar,
                        });
                    } else {
                        toprow.add({
                            settings: {
                                class: 'TOSOLVE',
                                id: 'm' + i,
                            },
                            content: cipherchar,
                        });
                        bottomrow.add({
                            settings: {
                                class: 'TOANSWER',
                                id: 'p' + i,
                            },
                            content: plainchar,
                        });
                    }
                }
            }
            result.append(table.generate());
        }
        return result;
    }

    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    genScore(answer: string[]): IScoreInformation {
        let cipherindex = 1;
        if (this.state.operation === 'encode') {
            cipherindex = 0;
        }
        this.genAlphabet();
        const strings = this.buildReplacement(this.state.cipherString, 9999);
        let solution: string[] = [];
        for (const strset of strings) {
            solution = solution.concat(strset[cipherindex].split(''));
        }
        //TODO: should we need to do this or should it be done on data entry?
        const upperAnswer: string[] = [];
        for (let i = 0; i < answer.length; i++) {
            upperAnswer[i] = answer[i].toUpperCase();
        }

        return this.calculateScore(solution, upperAnswer, this.state.points);
    }

    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        let plainindex = 0;
        let cipherindex = 1;
        if (this.state.operation === 'encode') {
            plainindex = 1;
            cipherindex = 0;
        }
        this.genAlphabet();
        const strings = this.buildReplacement(this.state.cipherString, 40);
        const table = new JTTable({
            class: 'ansblock shrink cell unstriped',
        });
        for (const strset of strings) {
            this.addCipherTableRows(
                table,
                undefined,
                strset[plainindex],
                strset[cipherindex],
                true
            );
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
        let plainindex = 0;
        if (this.state.operation === 'encode') {
            plainindex = 1;
        }
        this.genAlphabet();
        const strings = this.buildReplacement(this.state.cipherString, 40);
        result.append(
            this.genInteractiveCipherTable(strings, plainindex, qnum, 'affineint', false)
        );

        result.append($('<textarea/>', { id: 'in' + qnumdisp, class: 'intnote' }));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const divx = $('<div/>', { class: 'grid-x' });
        let plainindex = 0;
        if (this.state.operation === 'encode') {
            plainindex = 1;
        }

        this.genAlphabet();
        const strings = this.buildReplacement(this.state.cipherString, 40);
        const table = new JTTable({
            class: 'ansblock shrink cell unstriped',
        });
        for (const strset of strings) {
            this.addCipherTableRows(table, undefined, strset[plainindex], undefined, true);
        }
        divx.append(table.generate());
        result.append(divx);
        result.append($('<div/>', { class: 'cell affinework' }));
        return result;
    }
    public canSolve(m1: string, m2: string): boolean {
        const charset = this.getCharset();
        const c1 = this.affinechar(m1);
        const c2 = this.affinechar(m2);
        const c1val = charset.indexOf(c1);
        const c2val = charset.indexOf(c2);
        const m1val = charset.indexOf(m1);
        const m2val = charset.indexOf(m2);

        let c = c1val - c2val;
        let m = m1val - m2val;

        while (m < 0) {
            m += 26;
        }
        // The reality is that A can only be one of: 1, 3, 5, 7, 9, 11,
        // 15, 17, 19, 21, 23, 25.  B will be between 0 and 25.
        while ((c < 0 || c % m !== 0) && c < 626) {
            c += 26;
        }
        const a = c / m;
        // if A not in the list, return answer.
        if (a % 2 !== 1 || a < 1 || a > 25) {
            return false;
        }

        let b = (c1val - a * m1val) % 26;
        while (b < 0) {
            b += 26;
        }
        return a === this.state.a && b === this.state.b;
    }
    /**
     * Show the encoding of a set of letters using a and b values
     */
    public encodeLetters(a: number, b: number, letterString: string): JQuery<HTMLElement> {
        let encoding = '\\begin{array}{lcccrcl}';
        const charset = this.getCharset();
        for (const m of letterString) {
            const mVal = charset.indexOf(m);
            const cVal = a * mVal + b;
            const c = charset.substr(cVal % 26, 1);
            encoding +=
                m +
                '(' +
                mVal +
                ') & \\to & ' +
                mVal +
                ' * ' +
                a +
                ' + ' +
                b +
                ' & \\to & ' +
                cVal +
                ' \\mod{26} & \\to & ' +
                c +
                '(' +
                (cVal % 26) +
                ')\\\\';
        }
        encoding += '\\end{array}';
        return $('<div/>').append(renderMath(encoding));
    }
    /**
     * Encode a string using the current replacement alphabet
     */
    public encodeString(s: string): string {
        let encoded = '';
        for (let i = 0; i < s.length; i++) {
            encoded += this.state.replacement[s.substring(i, i + 1)];
        }
        return encoded;
    }
    /**
     *
     */
    public genAlphabet(): void {
        const charset = this.getCharset();
        for (let i = 0; i < charset.length; i++) {
            let c = -1;
            const letter = charset.substring(i, i + 1);
            c = this.state.a * i + this.state.b;
            while (c >= 26) {
                c -= 26;
            }
            this.state.replacement[letter] = charset.substr(c, 1);
        }
    }
    /**
     * Generate HTML showing the current decoding progress
     */
    public genDecodeProgress(msg: string, letters: string): JQuery<HTMLElement> {
        let i;
        let message = '';
        const msgLength = msg.length;

        const table = $('<table/>').addClass('tfreq');
        const tableBody = $('<tbody/>');
        const messageRow = $('<tr/>');
        const cipherRow = $('<tr/>');

        // Assume that these letters complete the solution
        this.completeSolution = true;

        for (i = 0; i < msgLength; i++) {
            const messageChar = msg.substring(i, i + 1).toUpperCase();
            let cipherChar = '';
            if (this.isValidChar(messageChar)) {
                message += messageChar;
                cipherChar = this.state.replacement[messageChar];
            } else {
                message += messageChar;
                continue;
            }

            if (letters.indexOf(messageChar) !== -1) {
                messageRow.append(
                    $('<td/>')
                        .addClass('TOANSWER')
                        .text(messageChar)
                );
            } else {
                // Alas one of the letters is unresolved, to the solution is not complete
                messageRow.append(
                    $('<td/>')
                        .addClass('TOANSWER')
                        .text(' ')
                );
                this.completeSolution = false;
            }
            cipherRow.append(
                $('<td/>')
                    .addClass('TOSOLVE')
                    .text(cipherChar)
            );
        }
        if (message.length > 0) {
            tableBody.append(cipherRow);
            tableBody.append(messageRow);
        }
        table.append(tableBody);

        return table;
    }
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        if (this.state.operation === 'crypt') {
            return this.genCryptanalysisSolution();
        }
        if (this.state.operation === 'decode') {
            return this.genDecodeSolution();
        }
        return this.genEncodeSolution();
    }

    public genEncodeSolution(): JQuery<HTMLElement> {
        const msg = this.minimizeString(this.state.cipherString);
        const mapping: StringMap = {};
        const result = $('<div/>', { id: 'solution' });
        result.append($('<h3/>').text('How to solve'));

        let showencmsg = true;

        for (const m of msg) {
            const c = this.affinechar(m);
            if (mapping[m] !== undefined) {
                result.append(
                    $('<p/>').text('We already computed for ' + m + ' and know that it is ' + c)
                );
            } else {
                if (showencmsg) {
                    showencmsg = false; // Don't show it again
                    const p = $('<p/>').text('Using the  given value of ');
                    let formula = '\\colorbox{yellow}{a =' + this.state.a + '}';
                    p.append(renderMath(formula));
                    p.append(' and ');
                    formula = '\\colorbox{yellow}{b =' + this.state.b + '}';
                    p.append(renderMath(formula));
                    p.append(' we can calcuate using the formula ');
                    formula = '{a' + kmathMult + 'x + b}\\mod{26}';
                    p.append(renderMath(formula));
                    result.append(p);
                }
                result.append(this.encodeLetters(this.state.a, this.state.b, m));
                mapping[m] = c;
            }
        }
        return result;
    }

    public genDecodeSolution(): JQuery<HTMLElement> {
        const msg = this.minimizeString(this.state.cipherString);
        const result = $('<div/>', { id: 'solution' });
        result.append($('<h3/>').text('How to solve'));
        const p = $('<p/>').text('Using the  given value of ');
        let formula = '\\colorbox{yellow}{a =' + this.state.a + '}';
        p.append(renderMath(formula));
        p.append(' and ');
        formula = '\\colorbox{yellow}{b =' + this.state.b + '}';
        p.append(renderMath(formula));
        p.append(' we can calcuate using the formula ');
        formula = '{a' + kmathMult + 'x + b}\\mod{26}';
        p.append(renderMath(formula));
        result.append(p);

        this.showDecodeSteps(result, msg, this.state.a, this.state.b, '');
        return result;
    }

    public genCryptanalysisSolution(): JQuery<HTMLElement> {
        const result = $('<div/>', { id: 'solution' });
        if (this.state.solclick1 === -1 || this.state.solclick2 === -1) {
            result.append($('<p/>').text('Click on any two columns to choose the decode problem'));
        }
        const msg = this.minimizeString(this.state.cipherString);
        const m1 = msg.substr(this.state.solclick1, 1);
        const m2 = msg.substr(this.state.solclick2, 1);
        result.append($('<h3/>').text('How to solve'));

        if (!this.canSolve(m1, m2)) {
            result.append($('<p/>').text('Indeterminate Solution! Please choose other letters.'));
            return result;
        }

        const charset = this.getCharset();

        const c1 = this.affinechar(m1);
        const c2 = this.affinechar(m2);

        const m1Val = charset.indexOf(m1);
        const c1Val = charset.indexOf(c1);
        const m2Val = charset.indexOf(m2);
        const c2Val = charset.indexOf(c2);

        result.append($('<p/>').text('Here is how we get the answer.  Since we are given that:'));

        const given =
            '\\begin{aligned} ' +
            m1 +
            '(' +
            m1Val +
            ') & \\to ' +
            c1 +
            '(' +
            c1Val +
            ') \\\\ ' +
            m2 +
            '(' +
            m2Val +
            ') & \\to ' +
            c2 +
            '(' +
            c2Val +
            ') \\end{aligned}';
        result.append(renderMath(given));

        result.append($('<p/>').text('From this we know:'));

        const equation1 =
            '\\left(a * ' + m1Val + ' + b\\right)\\;\\text{mod 26} & = ' + c1Val + ' \\\\';
        const equation2 =
            '\\left(a * ' + m2Val + ' + b\\right)\\;\\text{mod 26} & = ' + c2Val + ' \\\\';

        let solution = '\\begin{aligned}';
        if (m1Val > m2Val) {
            solution += equation1 + equation2;
        } else {
            solution += equation2 + equation1;
        }
        solution += '\\end{aligned}';
        result.append(renderMath(solution));
        result.append($('<p/>').text('Next, subtract the formulas:'));

        let subtract1 = '';
        let subtract2 = '';
        let mVal = 0;
        let cVal = 0;
        let mSubstitute = 0;
        let cSubstitute = 0;

        // the 2 equations
        if (m1Val > m2Val) {
            mVal = m1Val - m2Val;
            cVal = c1Val - c2Val;
            subtract1 =
                '\\begin{aligned}' +
                equation1 +
                ' - ' +
                equation2 +
                ' \\hline a * ' +
                mVal +
                '\\;\\text{mod 26} & = ' +
                cVal +
                ' ';
            mSubstitute = m2Val;
            cSubstitute = c2Val;
        } else {
            mVal = m2Val - m1Val;
            cVal = c2Val - c1Val;
            subtract1 =
                '\\begin{aligned}' +
                equation2 +
                ' - ' +
                equation1 +
                ' \\hline a * ' +
                mVal +
                '\\;\\text{mod 26} & = ' +
                cVal +
                ' ';
            mSubstitute = m1Val;
            cSubstitute = c1Val;
        }

        solution = subtract1;
        if (cVal < 0) {
            cVal += 26;
            subtract2 = ' \\\\ a * ' + mVal + '\\;\\text{mod 26} & = ' + cVal + ' ';
            solution += subtract2;
        }
        solution += ' \\end{aligned}';
        result.append(renderMath(solution));

        // solution for A
        let message = '';
        let a = cVal / mVal;
        let aRemainder = cVal % mVal;
        if (a !== 0) {
            const cValOriginal = cVal;
            if (aRemainder !== 0) {
                const p1 = $('<p/>').text('Since ');
                p1.append(
                    renderMath(cVal + ' \\div ' + mVal + ' = ' + (cVal / mVal).toPrecision(5))
                );
                p1.append(' we have to find another value. ');
                let count = 0;

                while (aRemainder !== 0) {
                    count += 1;
                    cVal += 26;
                    aRemainder = cVal % mVal;
                }
                a = cVal / mVal;
                p1.append(
                    renderMath(
                        cValOriginal +
                        ' + (26 * ' +
                        count +
                        ') = ' +
                        cVal +
                        '.\\space\\space' +
                        cVal +
                        ' \\div ' +
                        mVal +
                        ' = ' +
                        a
                    )
                );
                result.append(p1);
            }
        }
        result.append(renderMath(message));
        message = '\\colorbox{yellow}{a =' + a + '}';
        result.append(
            $('<p/>')
                .text('So we now know that ')
                .append(renderMath(message))
        );

        // solution for b
        result.append(
            $('<p/>').text(
                'To find b, substitute that back into the equation with the lowest multiplier. '
            )
        );
        let findingB =
            '\\begin{aligned}(' +
            a +
            ' * ' +
            mSubstitute +
            ' + b)\\;\\text{mod 26} & = ' +
            cSubstitute +
            '\\\\(' +
            a * mSubstitute +
            ' + b)\\;\\text{mod 26} & = ' +
            cSubstitute +
            '\\end{aligned}';
        result.append(renderMath(findingB));
        let p = $('<p/>').text('Subtract ');
        p.append(renderMath(String(a * mSubstitute)));
        p.append(' from both sides: ');
        result.append(p);
        findingB =
            '\\begin{aligned}(' +
            a * mSubstitute +
            ' +b)\\;\\text{mod 26} - ' +
            a * mSubstitute +
            ' & = (' +
            cSubstitute +
            ' - ' +
            a * mSubstitute +
            ')\\;\\text{mod 26}\\\\' +
            'b\\;\\text{mod 26} & = ' +
            (cSubstitute - a * mSubstitute) +
            '\\;\\text{mod 26}\\\\';

        let b = cSubstitute - a * mSubstitute;
        while (b < 0) {
            b += 26;
        }
        findingB += 'b\\;\\text{mod 26} & = ' + b + '\\;\\text{mod 26}\\end{aligned}';
        result.append(renderMath(findingB));
        result.append(p);
        p = $('<p/>').text('And we see that ');
        p.append(renderMath('\\colorbox{yellow}{b =' + b + '}'));
        result.append(p);

        result.append($('<p/>').text('However, we only know a few of the letters in the cipher.'));

        this.showDecodeSteps(result, msg, a, b, m1 + m2);
        return result;
    }
    /**
     * Show the process of decoding given a and b
     * @param result Section to append output to
     * @param msg String to decode
     * @param a value of a in formula
     * @param b value of b in formula
     * @param known Letters which are known at the start
     */
    public showDecodeSteps(
        result: JQuery<HTMLElement>,
        msg: string,
        a: number,
        b: number,
        known: string
    ): JQuery<HTMLElement> {
        result.append(this.genDecodeProgress(msg, known));
        const outData = [
            {
                letters: 'ETAOIN',
                prefix:
                    'The first step is to encode the common letters <b>ETAOIN</b> to see what they would map to.',
                suffix1: 'Filling in the letter we found',
                suffix2: ', we get a bit more of the answer.',
            },
            {
                letters: 'SRHLD',
                prefix: 'Next, encode the next 5 common letters <b>SRHLD</b>.',
                suffix1: 'We know the reverse mapping of 5 more letters',
                suffix2: ', which we can fill in.',
            },
            {
                letters: 'CUMFP',
                prefix: 'We will convert the next 5 most frequent letters <b>CUMFP</b>.',
                suffix1: 'The next 5 letters we know are',
                suffix2: ', so we will fill those in.',
            },
            {
                letters: 'GWYBV',
                prefix: 'Next, encode the next 5 common letters <b>GWYBV</b>.',
                suffix1: 'We know the reverse mapping of 5 more letters',
                suffix2: ', which we can fill in.',
            },
            {
                letters: 'KXJQZ',
                prefix: 'We will convert the remaining 5 letters <b>KXJQZ</b>.',
                suffix1: 'The remaining 5 letters we know are',
                suffix2: ', so we will fill those in.',
            },
        ];
        for (const entry of outData) {
            if (!this.completeSolution) {
                const found = this.encodeString(entry.letters);
                result.append($('<p/>').html(entry.prefix));
                result.append(this.encodeLetters(a, b, entry.letters));
                result.append($('<p/>').text(entry.suffix1 + ' (' + found + ')' + entry.suffix2));
                known += entry.letters;
                result.append(this.genDecodeProgress(msg, known));
            }
        }
        result.append($('<p/>').text('The solution is now complete!'));
        return result;
    }

    /**
     *
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
        $('#a')
            .off('input')
            .on('input', (e) => {
                const newa = Number($(e.target).val());
                if (newa !== this.state.a) {
                    this.markUndo(null);
                    if (this.seta(newa)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        $('#b')
            .off('input')
            .on('input', (e) => {
                const newb = Number($(e.target).val());
                if (newb !== this.state.b) {
                    this.markUndo(null);
                    if (this.setb(newb)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        $('td')
            .off('click')
            .on('click', (e) => {
                const id = $(e.target).attr('id');
                if (this.state.operation === 'crypt' && id !== '') {
                    this.markUndo('solclick');
                    this.state.solclick1 = this.state.solclick2;
                    this.state.solclick2 = Number(id.substr(1));
                    this.updateOutput();
                }
            });
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);
        const radiobuttons = [
            { id: 'wrow', value: 'encode', title: 'Encode' },
            { id: 'mrow', value: 'decode', title: 'Decode' },
            { id: 'crow', value: 'crypt', title: 'Cryptanalysis' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));

        this.genQuestionFields(result);
        this.genEncodeField(result);
        const inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',
        });
        inputbox.append(JTFIncButton('A', 'a', this.state.a, 'small-12 medium-4 large-4'));
        inputbox.append(JTFIncButton('B', 'b', this.state.b, 'small-12 medium-4 large-4'));
        inputbox.append(JTFIncButton('Block Size', 'blocksize', this.state.blocksize, ''));
        result.append(inputbox);
        return result;
    }
    /**
     *
     */
    public load(): void {
        this.genAlphabet();
        let res = this.build();
        $('#answer')
            .empty()
            .append(res);
        if (
            this.state.operation === 'crypt' &&
            (this.state.solclick1 === -1 || this.state.solclick2 === -1)
        ) {
            res = $('<p/>').text('Click on any two columns to choose the decode problem');
        } else {
            res = this.genSolution(ITestType.None);
        }
        $('#sol')
            .empty()
            .append('<hr/>')
            .append(res);

        this.attachHandlers();
    }
}
