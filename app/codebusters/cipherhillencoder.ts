import { cloneObject, makeFilledArray } from '../common/ciphercommon';
import {
    IState,
    ITestType,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
    QuoteRecord,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { hill4, hill9 } from '../common/hillkeys';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFDialog } from '../common/jtfdialog';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import {
    determinant,
    isCoPrime,
    mod26,
    mod26Inverse2x2,
    mod26InverseMatrix,
    determinant3x3,
    mod26Inverse3x3,
    modInverse26,
    multarray,
} from '../common/mathsupport';
import { renderMath } from '../common/renderMath';
import { CipherEncoder, suggestedData } from './cipherencoder';

const kmathEquiv = '\\equiv';
// Configure how we want the multiplication to appear - either as a * or a dot
const kmathMult = '*';
// const kmathMult = ' \\cdot '
/**
 * CipherHillEncoder implements the Hill methods
 */
export class CipherHillEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Hill_Matrix';
    public cipherName = 'Hill'

    public validTests: ITestType[] = [ITestType.None, ITestType.cregional, ITestType.cstate];
    public defaultstate: IState = {
        cipherString: '',
        keyword: '' /** The type of cipher we are doing */,
        cipherType: ICipherType.Hill,
        operation: 'encode',
    };
    public state: IState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];
    public charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    public padval = 'Z';
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IState, suppressOutput = false): void {
        this.state = cloneObject(this.defaultstate) as IState;
        this.copyState(this.state, data);
        if (!suppressOutput) {
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
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        let len = this.state.keyword.length;
        if (this.state.operation !== 'compute') {
            const vals = this.getValidKey(this.state.keyword);
            if (vals !== undefined) {
                len = this.computeHill(vals).length;
            }
        }
        const result: ITestQuestionFields = {
            // We must use the array version because we allow multiple characters
            // in each cell
            answer: makeFilledArray(len, ' '),
            notes: '',
        };
        if (this.state.operation !== 'compute') {
            result.replacements = makeFilledArray(len, '');
        }
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
            if (testType !== ITestType.cstate && this.state.keyword.length === 9) {
                result =
                    '3x3 Hill Cipher problems are not allowed on ' + this.getTestTypeName(testType);
            }
        }
        if (!anyOperation && this.state.operation !== 'decode') {
            result = 'Only decode problems are allowed on ' + this.getTestTypeName(testType);
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
        super.setUIDefaults();
        this.setOperation(this.state.operation);
    }
    public setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        if (this.state.operation === 'compute') {
            $('.encbox').hide();
            this.guidanceURL = 'TestGuidance.html#Hill_Matrix';
        } else {
            $('.encbox').show();
            this.guidanceURL = 'TestGuidance.html#Hill_Encrypt';
        }
        JTRadioButtonSet('operation', this.state.operation);
        super.updateOutput();
        this.validateQuestion();
        this.attachHandlers();
    }
    /**
     * Set the keyword for encoding
     * @param keyword New Keyword for encoding
     */
    public setKeyword(keyword: string): boolean {
        const changed = super.setKeyword(keyword);
        if (this.getValidKey(this.state.keyword) !== undefined) {
            $('#err').text('');
        }
        if (changed) {
            this.validateQuestion();
            this.attachHandlers();
        }
        return changed;
    }
    public build(): JQuery<HTMLElement> {
        const result = $('<div/>');
        const key = this.state.keyword.toUpperCase();
        let toencode = this.state.cipherString.toUpperCase();
        const vals = this.getValidKey(key);
        if (vals === undefined) {
            result.append($('<p/>').text('Invalid Key'));
            return result;
        }

        // Always give them the formula
        result.append(this.genQuestionMath(vals));

        if (this.state.operation === 'compute') {
            result.append(this.genInverseFormula(vals));
        } else {
            const encoded = this.computeHill(vals);
            if (this.state.operation === 'decode') {
                // For decode, we allow the 2x2 or 3x3 matrix
                result.append(this.genInverseFormula(vals));
                toencode += this.repeatStr(this.padval, encoded.length - toencode.length);
                result.append(
                    $('<div/>', {
                        class: 'TOSOLVE',
                    }).text(encoded)
                );
                result.append(
                    $('<div/>', {
                        class: 'TOANSWER',
                    }).text(toencode)
                );
            } else {
                result.append(
                    $('<div/>', {
                        class: 'TOSOLVE',
                    }).text(toencode)
                );
                result.append(
                    $('<div/>', {
                        class: 'TOANSWER',
                    }).text(encoded)
                );
            }
        }
        return result;
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        result.append(
            $('<div/>', {
                class: 'callout primary',
            }).append(
                $('<a/>', {
                    href: 'HillKeys.html',
                    target: 'new',
                }).text('Known Valid Keys')
            )
        );
        this.genTestUsage(result);
        result.append(this.createSuggestKeyDlg())

        const radiobuttons = [
            { id: 'wrow', value: 'encode', title: 'Encode' },
            { id: 'drow', value: 'compute', title: 'Compute Decryption' },
            { id: 'mrow', value: 'decode', title: 'Decode' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));

        this.genQuestionFields(result);
        this.genEncodeField(result);
        const suggestButton = $('<a/>', { type: "button", class: "button primary tight", id: "suggestkey" }).text("Suggest Keyword")
        const keywordInput = JTFLabeledInput('Keyword', 'text', 'keyword', this.state.keyword, '', suggestButton)
        result.append(keywordInput);
        return result;
    }
    /**
     * Check for any errors we can find in the question
     */
    public validateQuestion(): void {
        let msg = '';
        let sampleLink: JQuery<HTMLElement> = undefined;
        const questionText = this.state.question.toUpperCase();
        const key = this.state.keyword.toUpperCase();

        if (questionText.indexOf(key) < 0) {
            msg += `The Question Text doesn't mention the keyword "${key}". `
        }
        // Check to see if they specified encode/encryption
        //    for an encode type problem or
        //   decode/decryption for a decode type problem
        // or Compute/matrix for a compute matrix problem
        if (this.state.operation === 'encode') {
            if (questionText.indexOf('BEEN ENC') > 0 ||
                questionText.indexOf('WAS ENC') > 0 ||
                (questionText.indexOf('ENCRY') < 0 && questionText.indexOf('ENCOD') < 0)) {
                msg += "The Question Text doesn't indicate that the text should be encoded.";
            }
        } else if (this.state.operation === 'decode') {
            if (questionText.match('DECRYPT.*MATRIX') !== null ||
                (questionText.indexOf('DECRY') < 0 &&
                    questionText.indexOf('DECOD') < 0 &&
                    questionText.indexOf('BEEN ENC') < 0 &&
                    questionText.indexOf('WAS ENC') < 0)
            ) {
                msg += "The Question Text doesn't indicate that the text should be decoded.";
            }
        } else {
            // Compute descryption 
            if (
                questionText.indexOf('COMPU') < 0 &&
                questionText.indexOf('MATRIX') < 0
            ) {
                msg += "The Question Text doesn't indicate that the decryption matrix should be computed.";
            }
        }

        if (msg !== '') {
            sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');
        }

        this.setErrorMsg(msg, 'vq', sampleLink);
    }
    /**
      * Generate the recommended score and score ranges for a cipher
      * @returns Computed score ranges for the cipher
      */
    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)
        const key = this.state.keyword.toUpperCase();
        let matsize = 0
        let text = ''
        let groupscore = 0
        if (key.length === 4) {
            matsize = 2
            groupscore = 16.5
        } else if (key.length === 9) {
            matsize = 3
            groupscore = 21
        } else {
            text = `<p><b>WARNING:</b> <em>There is no valid keyword specified, unable to compute a score.
            Please pick either a 4 or 9 letter keyword.</em></p>`

            return { suggested: 0, min: 0, max: 0, text: text }
        }
        if (this.state.operation === 'compute') {
            text = `<p>A compute operation is generally 100 points.</p>`
            return { suggested: 100, min: 100, max: 100, text: text }
        }
        let suggested = Math.ceil(groupscore * qdata.len / matsize)
        const min = Math.round(Math.max(suggested - groupscore, 0))
        const max = Math.round(suggested + groupscore)
        suggested += Math.round((groupscore * Math.random()) - (groupscore / 2));

        let rangetext = ''
        if (max > min) {
            rangetext = ` (From a range of ${min} to ${max})`
        }
        if (qdata.len > 2) {
            text += `<p>There are ${Math.ceil(qdata.len / matsize)} groups of ${matsize} characters in the quote.
             We suggest you try a score of ${suggested}${rangetext}</p>`
        }
        return { suggested: suggested, min: min, max: max, text: text }
    }
    /**
     * Generates the sample question text for a cipher
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {

        let msg = ''
        let hilltype = '??HILL?? Cipher'
        const key = this.state.keyword.toUpperCase();
        if (key.length === 4) {
            hilltype = "2x2 Hill Cipher"
        } else if (key.length === 9) {
            hilltype = "3x3 Hill Cipher"
        }
        if (this.state.operation === 'encode') {
            msg = `<p>Encrypt the following quote${this.genAuthor()} with a ${hilltype} using a keyword of ${this.genMonoText(key)}.</p>`
        } else if (this.state.operation === 'decode') {
            msg = `<p>Decode the following quote${this.genAuthor()} which was encoded as a ${hilltype} using a keyword of ${this.genMonoText(key)}.</p>`
        } else {
            msg = `<p>Compute the ${hilltype} decryption matrix for a keyword of ${this.genMonoText(key)}.</p>`
        }
        return msg;
    }
    /**
     *
     */
    public load(): void {
        $('#err').text('');
        $('#answer')
            .empty()
            .append(this.build());
        $('#sol')
            .empty()
            .append('<hr/>')
            .append(this.genSolution(ITestType.None));
    }
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const key = this.state.keyword.toUpperCase();
        const toencode = this.minimizeString(this.state.cipherString);
        const vals = this.getValidKey(key);
        if (vals === undefined) {
            return result;
        }

        result.append($('<h3/>').text('How to solve'));
        if (this.state.operation === 'compute') {
            result.append(this.genInverseMath(vals));
        } else {
            const encoded = this.computeHill(vals);
            if (this.state.operation === 'decode') {
                // For decode, we allow the 2x2 or 3x3 matrix
                result.append(this.genInverseMath(vals));
                result.append($('<p/>').text('With the inverse matrix we can now decode'));
                const modinv = mod26InverseMatrix(vals);
                result.append(this.genEncodeMath(modinv, encoded));
            } else {
                result.append(this.genEncodeMath(vals, toencode));
            }
        }
        return result;
    }
    /**
     * Pad a string with the padding character based on the grouping size
     * @param str String to pad
     * @param groupsize Multiple to pad it to
     */
    public padstr(str: string, groupsize: number): string {
        let res = '';
        const charset = this.getCharset();
        for (const t of str.toUpperCase()) {
            const x = charset.indexOf(t);
            if (x >= 0) {
                res += t;
            }
        }
        const topad = (groupsize - (res.length % groupsize)) % groupsize;
        res += this.repeatStr(this.padval, topad);
        return res;
    }

    public getValidKey(key: string): number[][] {
        const vals = [];
        const charset = this.getCharset();
        if (key.length !== 4 && key.length !== 9) {
            $('#err').text('Invalid key.  It must be either 4 or 9 characters long');
            return undefined;
        }
        // Figure out how big our array for encoding is
        const groupsize = Math.sqrt(key.length);

        // Parse out the key and create the matrix to multiply by
        for (let i = 0, len = key.length; i < len; i++) {
            const t = key.substring(i, i + 1).toUpperCase();
            const x = charset.indexOf(t);
            if (x < 0) {
                console.log('Invalid character:' + t);
                $('#err').text('Invalid key character:' + t);
                return undefined;
            }
            const row = Math.floor(i / groupsize);
            if (typeof vals[row] === 'undefined') {
                vals[row] = [];
            }
            vals[row][i % groupsize] = x;
        }

        const detval = Math.round(determinant(vals)) as number;
        if (detval === 0) {
            $('#err').text('Matrix is not invertable');
            return undefined;
        }
        if (!isCoPrime(detval, charset.length)) {
            $('#err').text(
                'Matrix is not invertable.  Determinant ' +
                mod26(detval) +
                ' is not coprime with ' +
                charset.length
            );
            return undefined;
        }
        return vals;
    }
    /**
     * Show the inverse matrix for a 2x2 or 3x3 matrix
     */
    public genInverseFormula(vals: number[][]): JQuery<HTMLElement> {
        let modinv = [];
        if (vals[0].length === 2) {
            modinv = mod26Inverse2x2(vals);
        } else if (vals[0].length === 3) {
            modinv = mod26Inverse3x3(vals);
        }
        // add a bit of whitespace with \qquad
        const kmath =
            '\\qquad' + this.getKmathMatrix(vals) + '^{-1}=' + this.getKmathMatrix(modinv);
        return renderMath(kmath);
    }

    /**
     * Wrapper for generating inverse math for 2x2 or 3x3 matrices.
     * @param vals
     */
    public genInverseMath(vals: number[][]): JQuery<HTMLElement> {
        if (vals[0].length === 2) {
            return this.genInverseMath2x2(vals);
        } else if (vals[0].length === 3) {
            return this.genInverseMath3x3(vals);
        } else {
            return undefined;
        }
    }
    /**
     * Show the math for generating the inverse
     */
    public genInverseMath2x2(vals: number[][]): JQuery<HTMLElement> {
        // let result: number[][] = []
        const a = vals[0][0];
        const b = vals[0][1];
        const c = vals[1][0];
        const d = vals[1][1];
        const modinv = mod26Inverse2x2(vals);
        const det = a * d - b * c;
        const detmod26 = mod26(det);
        if (typeof modInverse26[detmod26] === undefined) {
            return $('<p/>').text('Matrix invalid - not invertable');
        }
        const detinv = modInverse26[detmod26];
        // Since we use this matrix a few times, cache creating it
        const matinv = this.getKmathMatrix([
            [d, -b],
            [-c, a],
        ]);

        const result = $('<div/>');
        result.append(
            $('<p/>').text('The inverse of the matrix can be computed using the formula:')
        );
        let equation =
            '{\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}}^{{-1}}=(ad-bc)^{{-1}}{\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}}';
        result.append(renderMath(equation));
        let p = $('<p/>').text('In this case we have to compute ');
        equation = '(ad-bc)^{{-1}}';
        p.append(renderMath(equation)).append(' Using ');
        p.append(
            $('<a/>', {
                href: 'https://en.wikipedia.org/wiki/Modular_multiplicative_inverse',
            }).text('modular multiplicative inverse')
        );
        p.append(' math');
        result.append(p);

        equation =
            this.getKmathMatrix(vals) +
            '^{-1}=' +
            '(' +
            a +
            kmathMult +
            d +
            '-' +
            b +
            kmathMult +
            c +
            ')^{-1}' +
            matinv;
        result.append(renderMath(equation));

        result.append(
            $('<p/>').text('We start by finding the modulo 26 value of the determinent:')
        );
        equation =
            '(' +
            a +
            kmathMult +
            d +
            '-' +
            b +
            kmathMult +
            c +
            ')\\mod{26}=' +
            det +
            '\\mod{26}=' +
            detmod26;
        result.append(renderMath(equation));

        p = $('<p/>').text(
            'Looking up ' +
            detmod26 +
            ' in the table supplied with the test (or by computing it with the '
        );
        p.append(
            $('<a/>', {
                href: 'https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm',
            }).text('Extended Euclidean algorithm')
        );
        p.append(
            ') we find that it is ' +
            detinv +
            ' which we substitute into the formula to compute the matrix:'
        );
        result.append(p);
        equation =
            '(' +
            a +
            kmathMult +
            d +
            '-' +
            b +
            kmathMult +
            c +
            ')^{-1}' +
            matinv +
            kmathEquiv +
            detinv +
            matinv +
            '\\mod{26}' +
            kmathEquiv +
            this.getKmathMatrix([
                [detinv + kmathMult + d, detinv + kmathMult + '-' + b],
                [detinv + kmathMult + '-' + c, detinv + kmathMult + a],
            ]) +
            '\\mod{26}' +
            kmathEquiv +
            this.getKmathMatrix([
                [detinv * d, -detinv * b],
                [-detinv * c, detinv * a],
            ]) +
            '\\mod{26}' +
            kmathEquiv +
            this.getKmathMatrix([
                [detinv * d + '\\mod{26}', -detinv * b + '\\mod{26}'],
                [-detinv * c + '\\mod{26}', detinv * a + '\\mod{26}'],
            ]) +
            kmathEquiv +
            this.getKmathMatrix(modinv);
        result.append(renderMath(equation));

        // let equation = this.getKmathMatrixChars(keyArray) + kmathMult +
        // this.getKmathMatrixChars(msgArray) +
        // kmathEquiv +
        // this.getKmathMatrix(keyArray) + kmathMult +
        // this.getKmathMatrix(msgArray) +
        // kmathEquiv +
        // this.getKmathMatrix(aMultiplying) +
        // kmathEquiv +
        // this.getKmathMatrix(aResultValues) +
        // kmathEquiv +
        // this.getKmathMatrix(aResultMod26) + '\\text{(mod 26)}' +
        // kmathEquiv +
        // this.getKmathMatrixChars(aResultMod26)
        return result;
    }

    /**
     * Show the math for generating the inverse of a 3x3.  From
     * https://en.wikipedia.org/wiki/Invertible_matrix under the
     * section 'Inversion of 3 x 3 matrices'
     * @param vals
     */
    public genInverseMath3x3(vals: number[][]): JQuery<HTMLElement> {
        const a = vals[0][0];
        const b = vals[0][1];
        const c = vals[0][2];
        const d = vals[1][0];
        const e = vals[1][1];
        const f = vals[1][2];
        const g = vals[2][0];
        const h = vals[2][1];
        const i = vals[2][2];
        const A = e * i - f * h;
        const B = -(d * i - f * g);
        const C = d * h - e * g;
        const D = -(b * i - c * h);
        const E = a * i - c * g;
        const F = -(a * h - b * g);
        const G = b * f - c * e;
        const H = -(a * f - c * d);
        const I = a * e - b * d;

        const modinv = mod26Inverse3x3(vals);
        const determinant = determinant3x3(vals);
        const determinantMod26 = mod26(determinant);
        if (typeof modInverse26[determinantMod26] === undefined) {
            return $('<p/>').text('Matrix invalid - not invertable');
        }
        const determinantInverse = modInverse26[determinantMod26];

        // Since we use this matrix a few times, cache creating it
        const matrixIntermediate = this.getKmathMatrix([
            [A, B, C],
            [D, E, F],
            [G, H, I],
        ]);
        // let matrixTransposed = this.getKmathMatrix([[mod26(A), mod26(D), mod26(G)],
        //                                                    [mod26(B), mod26(E), mod26(H)],
        //                                                    [mod26(C), mod26(F), mod26(I)]]);
        const matrixTransposed = this.getKmathMatrix([
            [A, D, G],
            [B, E, H],
            [C, F, I],
        ]);

        const result = $('<div/>');
        result.append(
            $('<p/>').text('The inverse of the matrix can be computed using the formula:')
        );
        let equation =
            '{M^{{-1}}=\\begin{pmatrix}a&b&c\\\\d&e&f\\\\g&h&i\\end{pmatrix}}^{{-1}}=det(M)^{{-1}}\\begin{pmatrix}A&B&C\\\\D&E&F\\\\G&H&I\\end{pmatrix}^{{T}}=det(M)^{{-1}}\\begin{pmatrix}A&D&G\\\\B&E&H\\\\C&F&I\\end{pmatrix}'; //     {\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}}';
        result.append(renderMath(equation));
        let p = $('<p/>').text('Where:');
        result.append(p);

        p = $('<p/>');
        equation = 'A=(ei - fh), D=-(bi - ch), G=(bf - ce),';
        p.append(renderMath(equation));
        result.append(p);

        p = $('<p/>');
        equation = 'B = -(di - fg), E = (ai - cg), H = -(af - cd),';
        p.append(renderMath(equation));
        result.append(p);

        p = $('<p/>');
        equation = 'C = (dh - eg), F = -(ah - bg), I = (ae - bd),';
        p.append(renderMath(equation));
        result.append(p);

        p = $('<p/>').text('and,');
        result.append(p);

        p = $('<p/>');
        equation = 'det(M) = aA + bB + cC';
        p.append(renderMath(equation));
        result.append(p);

        p = $('<p/>').text('In this case we will compute ');
        equation = 'det(M)^{{-1}}';
        p.append(renderMath(equation)).append(' Using ');
        p.append(
            $('<a/>', {
                href: 'https://en.wikipedia.org/wiki/Invertible_matrix',
            }).text('modular multiplicative inverse')
        );
        p.append(' math.');
        result.append(p);

        result.append(
            $('<p/>').text('We start by finding the modulo 26 value of the determinant:')
        );
        equation =
            'det(M) = (' +
            a +
            kmathMult +
            A +
            '+' +
            b +
            kmathMult +
            B +
            '+' +
            c +
            kmathMult +
            C +
            ')\\mod{26}=' +
            determinant +
            '\\mod{26}=' +
            determinantMod26;
        result.append(renderMath(equation));
        p = $('<p/>').text(
            'Looking up ' +
            determinantMod26 +
            ' in the table supplied with the test (or by computing it with the '
        );
        p.append(
            $('<a/>', {
                href: 'https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm',
            }).text('Extended Euclidean algorithm')
        );
        p.append(
            ') we find that the inverse is ' +
            determinantInverse +
            ' which we substitute into the formula to compute the matrix:'
        );
        result.append(p);

        equation =
            this.getKmathMatrix(vals) +
            '^{-1}' +
            kmathEquiv +
            determinantInverse +
            matrixIntermediate +
            '^{{T}}\\mod{26}' +
            kmathEquiv +
            determinantInverse +
            matrixTransposed +
            '\\mod{26}';
        result.append(renderMath(equation));

        result.append($('<p/>').text('Completing the calculation, we get:'));
        equation =
            this.getKmathMatrix([
                [
                    determinantInverse + kmathMult + A,
                    determinantInverse + kmathMult + D,
                    determinantInverse + kmathMult + G,
                ],
                [
                    determinantInverse + kmathMult + b,
                    determinantInverse + kmathMult + E,
                    determinantInverse + kmathMult + H,
                ],
                [
                    determinantInverse + kmathMult + C,
                    determinantInverse + kmathMult + F,
                    determinantInverse + kmathMult + I,
                ],
            ]) +
            '\\mod{26}' +
            kmathEquiv +
            this.getKmathMatrix([
                [determinantInverse * A, determinantInverse * D, determinantInverse * G],
                [determinantInverse * B, determinantInverse * E, determinantInverse * H],
                [determinantInverse * C, determinantInverse * F, determinantInverse * I],
            ]) +
            '\\mod{26}' +
            kmathEquiv +
            this.getKmathMatrix([
                [
                    determinantInverse * A + '\\mod{26}',
                    determinantInverse * D + '\\mod{26}',
                    determinantInverse * G + '\\mod{26}',
                ],
                [
                    determinantInverse * B + '\\mod{26}',
                    determinantInverse * E + '\\mod{26}',
                    determinantInverse * H + '\\mod{26}',
                ],
                [
                    determinantInverse * C + '\\mod{26}',
                    determinantInverse * F + '\\mod{26}',
                    determinantInverse * I + '\\mod{26}',
                ],
            ]) +
            kmathEquiv +
            this.getKmathMatrix(modinv);
        result.append(renderMath(equation));

        return result;
    }

    /**
     * Show the math for doing a matrix encode/decoode of a 2x2 or 3x3 matrix
     * For a decode, pass in the inverted matrix
     */
    public genEncodeMath(vals: number[][], str: string): JQuery<HTMLElement> {
        const result = $('<div/>');
        const charset = this.getCharset();
        let t, x;

        // Figure out how big our array for encoding is
        const groupsize = vals.length;

        // pad out the string to contain full groups of the group size
        str = this.padstr(str, groupsize);

        const equations = $('<div/>', { id: 'equations' });
        // Go through the string in the group size and perform the math on it
        for (let i = 0, len = str.length; i < len; i += groupsize) {
            const cluster = [];
            for (let j = i; j < i + groupsize; j++) {
                t = str.substr(j, 1);
                x = charset.indexOf(t);
                if (x < 0) {
                    $('#err').text('Internal error:' + t + ' invalid character');
                    return result;
                }
                cluster.push(x); // cluster.push([x]);
            }
            // Generate the math formula showing the encoding
            const line = this.genEncodeEquation(vals, cluster);
            const div = $('<div/>', {
                class: 'lineeq',
            }).append(renderMath(line));
            equations.append(div);
        }
        result.append(equations);
        return result;
    }
    /**
     * Generate the Kmath representation of a matrix
     */
    public getKmathMatrix(matrix: any[]): string {
        let extra = '';
        let result = '\\begin{pmatrix}';
        for (const row of matrix) {
            result += extra;
            if (Array.isArray(row)) {
                let rowextra = '';
                for (const c of row) {
                    result += rowextra + c;
                    rowextra = '&';
                }
            } else {
                result += row;
            }
            extra = '\\\\';
        }
        result += '\\end{pmatrix}';
        return result;
    }
    /**
     * Generate the kmath representation of the characters in a matrix
     */
    public getKmathMatrixChars(matrix: number[] | number[][]): string {
        const charset = this.getCharset();
        let extra = '';
        let result = '\\begin{pmatrix}';
        for (const row of matrix) {
            result += extra;
            if (Array.isArray(row)) {
                let rowextra = '';
                for (const c of row) {
                    result += rowextra + charset.substr(c, 1);
                    rowextra = '&';
                }
            } else {
                result += charset.substr(row, 1);
            }
            extra = '\\\\';
        }
        result += '\\end{pmatrix}';
        return result;
    }
    /**
     * This function builds an equation for a single block of data
     */
    public genEncodeEquation(keyArray: number[][], msgArray: number[]): string {
        const charset = this.getCharset();
        const aMultiplying: string[] = [];
        const aResultValues: number[] = [];
        const aResultMod26: number[] = [];

        // Compute the values into the various matrixes
        for (const rowdata of keyArray) {
            let extra = '';
            let rowval = 0;
            let strMult = '';
            for (let col = 0; col < rowdata.length; col++) {
                const spot = rowdata[col];
                const mult = msgArray[col];
                strMult += extra + spot + kmathMult + mult;
                rowval += spot * mult;
                extra = '+';
            }
            aMultiplying.push(strMult);
            aResultValues.push(rowval);
            const rvmod26 = rowval % charset.length;
            aResultMod26.push(rvmod26);
        }
        // Build the complete equation string using operators and
        const equation =
            this.getKmathMatrixChars(keyArray) +
            kmathMult +
            this.getKmathMatrixChars(msgArray) +
            kmathEquiv +
            this.getKmathMatrix(keyArray) +
            kmathMult +
            this.getKmathMatrix(msgArray) +
            kmathEquiv +
            this.getKmathMatrix(aMultiplying) +
            kmathEquiv +
            this.getKmathMatrix(aResultValues) +
            kmathEquiv +
            this.getKmathMatrix(aResultMod26) +
            '\\mod{26}' +
            kmathEquiv +
            this.getKmathMatrixChars(aResultMod26);

        // Done!
        return equation;
    }
    /**
     * Given a string, convert it to a matrix
     */
    public makeMatrixFromString(str: string): string[][] {
        const result: string[][] = [];
        // Figure out how big our array is
        const groupsize = Math.sqrt(str.length);
        // As long as it is square, we can generate a matrix from it
        if (groupsize * groupsize === str.length) {
            for (let row = 0; row < groupsize; row++) {
                result.push([]);
                for (let col = 0; col < groupsize; col++) {
                    result[row].push(str.substr(row * groupsize + col, 1));
                }
            }
        }
        return result;
    }

    /**
     * Generate the html that shows the key calculation for the problem
     * @param vals input matrix values
     * @param showDecryptionMatrix - whether to show the 'hint' inverse matrix
     *                               (used when displaying/printing the test question).
     */
    public genQuestionMath(vals: number[][], showDecryptionMatrix = false): JQuery<HTMLElement> {
        let kmath = this.getKmathMatrixChars(vals) + kmathEquiv + this.getKmathMatrix(vals);

        // Provide the decryption matrix if the question is
        // decode a message using a 3x3 matrix.
        if (
            showDecryptionMatrix &&
            this.state.operation === 'decode' &&
            this.state.keyword.length === 9
        ) {
            const decrypt3x3 =
                '\\qquad Decode ' +
                this.getKmathMatrixChars(vals) +
                '^{{-1}}' +
                kmathEquiv +
                this.getKmathMatrix(mod26InverseMatrix(vals));

            kmath += decrypt3x3;
        }

        return renderMath(kmath);
    }
    /**
     * Generate the visible answer matrix for a question
     * @param matrix Content to put into the array boxes.
     * @param extraclass Extra class to add to the table
     */
    public genAnswerMathMatrix(matrix: any[][], extraclsss: string): JQuery<HTMLElement> {
        const table = new JTTable({
            class: 'hillans ansblock shrink cell unstriped' + extraclsss,
        });
        let first = true;
        for (const row of matrix) {
            const tabrow = table.addBodyRow();
            if (first) {
                tabrow.add({
                    settings: {
                        rowspan: row.length,
                        class: 'big' + row.length,
                    },
                    content: '(',
                });
            }
            for (const c of row) {
                let cclass = 'a';
                if (c === ' ' || typeof c !== 'string') {
                    cclass = 'q';
                }
                tabrow.add({
                    settings: { class: cclass + ' v' },
                    content: c,
                });
            }
            if (first) {
                tabrow.add({
                    settings: {
                        rowspan: row.length,
                        class: 'big' + row.length,
                    },
                    content: ')',
                });
            }
            first = false;
        }
        return table.generate();
    }
    public computeHill(vals: number[][]): string {
        let result = '';
        const key = this.state.keyword;
        let str = this.state.cipherString;
        const charset = this.getCharset();

        // Figure out how big our array for encoding is
        const groupsize = Math.sqrt(key.length);

        // pad out the string to contain full groups of the group size
        str = this.padstr(str, groupsize);

        // Go through the string in the group size and perform the math on it
        for (let i = 0, len = str.length; i < len; i += groupsize) {
            const cluster = [];
            for (let j = i; j < i + groupsize; j++) {
                const c = str.substr(j, 1);
                const val = charset.indexOf(c);
                if (val < 0) {
                    return 'Invalid Cipher:' + c + ' invalid character';
                }
                cluster.push(val);
            }
            const clustervals = multarray(vals, cluster);
            for (let j = 0; j < groupsize; j++) {
                result += charset.substr(clustervals[j] % charset.length, 1);
            }
        }
        return result;
    }

    /**
     * Splits plaintext and ciphertext into a fixed width (default 24) so when
     * tests are printed, question/answer text does not run over the page.
     * Based on cipherhandler.makeReplacement(str, maxWidth), but both strings
     * are passed in and assumed to be equal in length.
     *
     * Users (other programmers using this method in their code) need to beware
     * of which line is plaintext and which is encoded, to match their question.
     *
     * @param firstLine plaintext or encoded line of characters
     * @param secondLine encoded or plaintext line of characters
     * @param width number of characters per table line.
     */
    public splitToFit(firstLine: string, secondLine: string, width = 24): string[][] {
        let lastsplit = -1;
        let lineOne = '';
        let lineTwo = '';
        let count = 0;
        const theLines: string[][] = [];
        for (const t of firstLine) {
            lineOne += t;

            if (t !== "'") lastsplit = lineOne.length;
            lineTwo += secondLine.charAt(count);
            if (lineTwo.length >= width) {
                if (lastsplit === -1) {
                    theLines.push([lineTwo, lineOne]);
                    lineTwo = '';
                    lineOne = '';
                } else {
                    const encodepart = lineTwo.substr(0, lastsplit);
                    const decodepart = lineOne.substr(0, lastsplit);
                    lineTwo = lineTwo.substr(lastsplit);
                    lineOne = lineOne.substr(lastsplit);
                    theLines.push([encodepart, decodepart]);
                }
                lastsplit = -1;
            }
            count += 1;
        }
        if (lineTwo.length > 0) {
            theLines.push([lineTwo, lineOne]);
        }
        return theLines;
    }

    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        let scoreInformation: IScoreInformation = {
            correctLetters: 0,
            incorrectLetters: 0,
            deduction: 0,
            score: 0,
        };
        const vals = this.getValidKey(this.state.keyword);
        if (this.state.operation === 'compute') {
            const modinv = mod26InverseMatrix(vals);
            let count = 0;
            let errorCount = 0;
            for (let i = 0; i < modinv.length; i++) {
                for (let j = 0; j < modinv[0].length; j++) {
                    if (modinv[i][j] !== parseInt(answer[count].trim())) {
                        errorCount++;
                    }
                    count++;
                }
            }
            // Scoring for compute matix problems is all or nothing...
            scoreInformation.incorrectLetters = errorCount;
            scoreInformation.correctLetters = count - errorCount;
            if (errorCount === 0) {
                // all points
                scoreInformation.score = this.state.points;
            } else {
                // no points (initialized to 0)
                scoreInformation.deduction = this.state.points;
            }
        } else {
            const encoded = this.computeHill(vals);
            let plaintext = this.minimizeString(this.state.cipherString);
            //TODO: should we need to do this or should it be done on data entry?
            const upperAnswer: string[] = [];
            for (let i = 0; i < answer.length; i++) {
                upperAnswer[i] = answer[i].trim().toUpperCase();
            }
            // Prepare for encode problem...
            // Do not need to pad, there was not input field for it.
            let solution = encoded.split('');

            if (this.state.operation === 'decode') {
                // Pad answer if necessary.
                plaintext += this.repeatStr(this.padval, encoded.length - plaintext.length);

                solution = plaintext.split('');
            }
            scoreInformation = this.calculateScore(solution, upperAnswer, this.state.points);
        }
        return scoreInformation;
    }

    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const vals = this.getValidKey(this.state.keyword);
        if (vals === undefined) {
            result.append($('<h3/>').text('Invalid Hill Key: ' + this.state.keyword));
            return result;
        }

        result.append(this.genQuestionMath(vals, true));
        if (this.state.operation === 'compute') {
            const modinv = mod26InverseMatrix(vals);
            result.append($('<div/>').append(this.genAnswerMathMatrix(modinv, '')));
        } else {
            let encoded = this.computeHill(vals);
            let plaintext = this.minimizeString(this.state.cipherString);
            const charset = this.getCharset();
            this.setCharset(charset + ' ');
            if (this.state.operation === 'decode') {
                plaintext += this.repeatStr(this.padval, encoded.length - plaintext.length);
                const swap = plaintext;
                plaintext = encoded;
                encoded = swap;
            } else {
                plaintext += this.repeatStr(' ', encoded.length - plaintext.length);
            }

            // Split up the text so it fits on a page when printed (default split is 24 characters)
            const strings = this.splitToFit(encoded, plaintext);

            const table = new JTTable({
                class: 'hillblock ansblock shrink cell unstriped',
            });

            // Add the split up lines to the output table.
            for (const splitLines of strings) {
                this.addCipherTableRows(table, undefined, splitLines[0], splitLines[1], true);
            }
            result.append(table.generate());
            this.setCharset(charset);
        }
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const vals = this.getValidKey(this.state.keyword);
        if (vals === undefined) {
            result.append($('<h3/>').text('Invalid Hill Key: ' + this.state.keyword));
            return result;
        }

        result.append(this.genQuestionMath(vals, true));

        if (this.state.operation === 'compute') {
            const outMatrix: string[][] = this.makeMatrixFromString(
                this.repeatStr(' ', this.state.keyword.length)
            );
            result.append($('<div/>').append(this.genAnswerMathMatrix(outMatrix, '')));
        } else {
            const encoded = this.computeHill(vals);
            let decodetext = this.minimizeString(this.state.cipherString);
            const charset = this.getCharset();
            this.setCharset(charset + ' ');
            if (this.state.operation === 'decode') {
                decodetext = encoded;
            } else {
                decodetext += this.repeatStr(' ', encoded.length - decodetext.length);
            }

            // Split up the text so it fits on a page when printed (default split is 26 characters)
            const strings = this.splitToFit(decodetext, encoded);

            const table = new JTTable({
                class: 'hillblock ansblock shrink cell unstriped',
            });

            // Add the split up lines to the output table.
            for (const splitLines of strings) {
                this.addCipherTableRows(table, undefined, splitLines[1], undefined, false);
            }
            result.append(table.generate());
            this.setCharset(charset);
        }
        return result;
    }
    /**
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        const qnumdisp = String(qnum + 1);
        const idclass = 'I' + qnumdisp + '_';
        const result = $('<div/>', { id: 'Q' + qnumdisp });
        const vals = this.getValidKey(this.state.keyword);
        if (vals === undefined) {
            result.append($('<h3/>').text('Invalid Hill Key: ' + this.state.keyword));
            return result;
        }

        result.append(this.genQuestionMath(vals, true));

        if (this.state.operation === 'compute') {
            // We need to put input fields for each of the matrix entries
            const outMatrix: JQuery<HTMLElement>[][] = [[]];
            let pos = 0;
            for (let row = 0; row < vals.length; row++) {
                outMatrix.push([]);
                for (let col = 0; col < vals[row].length; col++) {
                    outMatrix[row].push(
                        $('<input/>', {
                            id: idclass + String(pos),
                            class: 'awc',
                            type: 'text',
                        })
                    );
                    pos++;
                }
            }
            result.append($('<div/>').append(this.genAnswerMathMatrix(outMatrix, ' interactive')));
        } else {
            const encoded = this.computeHill(vals);
            let decodetext = this.minimizeString(this.state.cipherString);
            const charset = this.getCharset();
            this.setCharset(charset + ' ');
            if (this.state.operation === 'decode') {
                decodetext = encoded;
            } else {
                decodetext += this.repeatStr(' ', encoded.length - decodetext.length);
            }

            // Split up the text so it fits on a page when printed (default split is 26 characters)
            const strings = this.splitToFit(decodetext, encoded);
            const tabres = this.genInteractiveCipherTable(strings, 1, qnum, 'hillblock', true);
            result.append(tabres);
            this.setCharset(charset);
        }
        result.append($('<textarea/>', { id: 'in' + String(qnum + 1), class: 'intnote' }));
        return result;
    }
    /**
     * Generate a dialog showing the choices for potential keywords
     */
    public createSuggestKeyDlg(): JQuery<HTMLElement> {
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
        const suggestKeyDlg = JTFDialog('suggestKeyDLG', 'Suggest Hill Keyword', dlgContents);
        return suggestKeyDlg;
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
     * Populate the dialog with a set of keyword suggestions. 
     */
    public populateKeySuggestions(): void {
        // we want to pick up to 10 choices
        let easy4: string[] = []
        let hard4: string[] = []
        let easy9: string[] = []
        let hard9: string[] = []
        let result = $('#suggestKeyopts')
        result.empty()
        // We want a total of 5 each easy and hard 4 and 9 keyword entries
        for (let i = 0; i < 100 && (easy4.length + easy9.length + hard4.length + hard9.length) < 20; i++) {
            let choice4 = hill4[Math.trunc(Math.random() * hill4.length)]
            let choice9 = hill9[Math.trunc(Math.random() * hill9.length)]
            if (choice4.includes('A')) {
                // this is an easy one 
                if (easy4.length < 5 && !easy4.includes(choice4)) {
                    easy4.push(choice4)
                }
            } else {
                if (hard4.length < 5 && !hard4.includes(choice4)) {
                    hard4.push(choice4)
                }
            }
            if (choice9.includes('A')) {
                // this is an easy one 
                if (easy9.length < 5 && !easy9.includes(choice9)) {
                    easy9.push(choice9)
                }
            } else {
                if (hard9.length < 5 && !hard9.includes(choice9)) {
                    hard9.push(choice9)
                }
            }
        }

        // In theory we should have 5 each easy/hard 4 and 9
        const divEasy = $("<div/>", { class: 'grid-x' })
        const cellEasy4 = $('<div/>', { class: 'cell auto' })
        const cellEasy9 = $('<div/>', { class: 'cell auto' })
        divEasy.append(cellEasy4)
            .append(cellEasy9)
        const divHard = $("<div/>", { class: 'grid-x' })
        const cellHard4 = $('<div/>', { class: 'cell auto' })
        const cellHard9 = $('<div/>', { class: 'cell auto' })
        divHard.append(cellHard4)
            .append(cellHard9)
        result.append($("<h4/>").text('Easier'))
            .append(divEasy)
            .append($("<h4/>").text('Harder'))
            .append(divHard)

        for (let i = 0; i < 5; i++) {
            cellEasy4.append(this.genUseKey(easy4[i]))
            cellEasy9.append(this.genUseKey(easy9[i]))
            cellHard4.append(this.genUseKey(hard4[i]))
            cellHard9.append(this.genUseKey(hard9[i]))
        }
        this.attachHandlers()
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
     * Start the dialog for suggesting the keyword
     */
    public suggestKey(): void {
        $('#genbtn').text('Generate')
        this.populateKeySuggestions()
        $('#suggestKeyDLG').foundation('open')
    }
    /**
     * Sets up the HTML DOM so that all actions go to the right handler
     */
    public attachHandlers(): void {
        super.attachHandlers()
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
