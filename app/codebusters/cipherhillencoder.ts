import { cloneObject } from '../common/ciphercommon';
import { IState, ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
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
import { CipherEncoder } from './cipherencoder';

const kmathEquiv = '\\equiv';
// Configure how we want the multiplication to appear - either as a * or a dot
const kmathMult = '*';
// const kmathMult = ' \\cdot '
/**
 * CipherHillEncoder implements the Hill methods
 */
export class CipherHillEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#Hill_Matrix';

    public validTests: ITestType[] = [ITestType.None,
    ITestType.cregional, ITestType.cstate];
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
        this.guidanceButton,
    ];
    public charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    public padval: string = 'Z';
    public restore(data: IState): void {
        this.state = cloneObject(this.defaultstate) as IState;
        this.copyState(this.state, data);
        this.setUIDefaults();
        this.updateOutput();
    }
    /**
     * Make a copy of the current state
     */
    public save(): IState {
        // We need a deep copy of the save state
        let savestate = cloneObject(this.state) as IState;
        return savestate;
    }
    /**
     * Determines if this generator is appropriate for a given test
     * type.  For Division A and B, only decode is allowed
     * @param testType Test type to compare against
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType): string {
        let result = super.CheckAppropriate(testType);
        if (result === "" && testType !== undefined) {
            if (testType !== ITestType.cstate && this.state.keyword.length === 9) {
                result = "3x3 Hill Cipher problems are not allowed on " +
                    this.getTestTypeName(testType);
            }
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
    }
    /**
     * Set the keyword for encoding
     * @param keyword New Keyword for encoding
     */
    public setKeyword(keyword: string): boolean {
        let changed = super.setKeyword(keyword);
        if (this.getValidKey(this.state.keyword) !== undefined) {
            $('#err').text('');
        }
        return changed;
    }
    public build(): JQuery<HTMLElement> {
        let result = $('<div/>');
        let key = this.state.keyword.toUpperCase();
        let toencode = this.state.cipherString.toUpperCase();
        let vals = this.getValidKey(key);
        if (vals === undefined) {
            result.append($('<p/>').text('Invalid Key'));
            return result;
        }

        // Always give them the formula
        result.append(this.genQuestionMath(vals));

        if (this.state.operation === 'compute') {
            result.append(this.genInverseFormula(vals));
        } else {
            let encoded = this.computeHill(vals);
            if (this.state.operation === 'decode') {
                // For decode, we allow the 2x2 or 3x3 matrix
                result.append(this.genInverseFormula(vals));
                toencode += this.repeatStr(
                    this.padval,
                    encoded.length - toencode.length
                );
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

    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
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

        let radiobuttons = [
            { id: 'wrow', value: 'encode', title: 'Encode' },
            { id: 'drow', value: 'compute', title: 'Compute Decryption' },
            { id: 'mrow', value: 'decode', title: 'Decode' },
        ];
        result.append(
            JTRadioButton(6, 'operation', radiobuttons, this.state.operation)
        );

        this.genQuestionFields(result);
        this.genEncodeField(result);
        result.append(
            JTFLabeledInput(
                'Keyword',
                'text',
                'keyword',
                this.state.keyword,
                ''
            )
        );
        return result;
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
        let result = $('<div/>');
        let key = this.state.keyword.toUpperCase();
        let toencode = this.minimizeString(this.state.cipherString);
        let vals = this.getValidKey(key);
        if (vals === undefined) {
            return result;
        }

        result.append($('<h3/>').text('How to solve'));
        if (this.state.operation === 'compute') {
            result.append(this.genInverseMath(vals));
        } else {
            let encoded = this.computeHill(vals);
            if (this.state.operation === 'decode') {
                // For decode, we allow the 2x2 or 3x3 matrix
                result.append(this.genInverseMath(vals));
                result.append(
                    $('<p/>').text(
                        'With the inverse matrix we can now decode'
                    )
                );
                let modinv = mod26InverseMatrix(vals);
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
        let charset = this.getCharset();
        for (let t of str.toUpperCase()) {
            let x = charset.indexOf(t);
            if (x >= 0) {
                res += t;
            }
        }
        let topad = (groupsize - (res.length % groupsize)) % groupsize;
        res += this.repeatStr(this.padval, topad);
        return res;
    }

    public getValidKey(key: string): number[][] {
        let vals = [];
        let charset = this.getCharset();
        let groupsize;
        if (key.length !== 4 && key.length !== 9) {
            $('#err').text(
                'Invalid key.  It must be either 4 or 9 characters long'
            );
            return undefined;
        }
        // Figure out how big our array for encoding is
        groupsize = Math.sqrt(key.length);

        // Parse out the key and create the matrix to multiply by
        for (let i = 0, len = key.length; i < len; i++) {
            let row;
            let t = key.substr(i, 1).toUpperCase();
            let x = charset.indexOf(t);
            if (x < 0) {
                console.log('Invalid character:' + t);
                $('#err').text('Invalid key character:' + t);
                return undefined;
            }
            row = Math.floor(i / groupsize);
            if (typeof vals[row] === 'undefined') {
                vals[row] = [];
            }
            vals[row][i % groupsize] = x;
        }

        let detval = Math.round(determinant(vals)) as number;
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
        }
        else if (vals[0].length === 3) {
            modinv = mod26Inverse3x3(vals);
        }
        let kmath =
            this.getKmathMatrix(vals) + '^{-1}=' + this.getKmathMatrix(modinv);
        return renderMath(kmath);
    }

    /**
     * Wrapper for generating inverse math for 2x2 or 3x3 matrices.
     * @param vals
     */
    public genInverseMath(vals: number[][]): JQuery<HTMLElement> {
        if (vals[0].length === 2) {
            return this.genInverseMath2x2(vals);
        }
        else if (vals[0].length === 3) {
            return this.genInverseMath3x3(vals);
        }
        else {
            return undefined;
        }
    }
    /**
     * Show the math for generating the inverse
     */
    public genInverseMath2x2(vals: number[][]): JQuery<HTMLElement> {
        // let result: number[][] = []
        let a = vals[0][0];
        let b = vals[0][1];
        let c = vals[1][0];
        let d = vals[1][1];
        let modinv = mod26Inverse2x2(vals);
        let det = a * d - b * c;
        let detmod26 = mod26(det);
        if (typeof modInverse26[detmod26] === undefined) {
            return $('<p/>').text('Matrix invalid - not invertable');
        }
        let detinv = modInverse26[detmod26];
        // Since we use this matrix a few times, cache creating it
        let matinv = this.getKmathMatrix([[d, -b], [-c, a]]);

        let result = $('<div/>');
        result.append(
            $('<p/>').text(
                'The inverse of the matrix can be computed using the formula:'
            )
        );
        let equation =
            '{\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}}^{{-1}}=(ad-bc)^{{-1}}{\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}}';
        result.append(renderMath(equation));
        let p = $('<p/>').text('In this case we have to compute ');
        equation = '(ad-bc)^{{-1}}';
        p.append(renderMath(equation)).append(' Using ');
        p.append(
            $('<a/>', {
                href:
                    'https://en.wikipedia.org/wiki/Modular_multiplicative_inverse',
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
            $('<p/>').text(
                'We start by finding the modulo 26 value of the determinent:'
            )
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
                href:
                    'https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm',
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
        let a = vals[0][0];
        let b = vals[0][1];
        let c = vals[0][2];
        let d = vals[1][0];
        let e = vals[1][1];
        let f = vals[1][2];
        let g = vals[2][0];
        let h = vals[2][1];
        let i = vals[2][2];
        let A = e*i - f*h;
        let B = -(d*i - f*g);
        let C = d*h - e*g;
        let D = -(b*i - c*h);
        let E = a*i - c*g;
        let F = -(a*h - b*g);
        let G = b*f - c*e;
        let H = -(a*f - c*d);
        let I = a*e - b*d;

        let modinv = mod26Inverse3x3(vals);
        let determinant = determinant3x3(vals);
        let determinantMod26 = mod26(determinant);
        if (typeof modInverse26[determinantMod26] === undefined) {
            return $('<p/>').text('Matrix invalid - not invertable');
        }
        let determinantInverse = modInverse26[determinantMod26];
        
        // Since we use this matrix a few times, cache creating it
        let matrixIntermediate = this.getKmathMatrix([[A, B, C], [D, E, F], [G, H, I]]);
        // let matrixTransposed = this.getKmathMatrix([[mod26(A), mod26(D), mod26(G)],
        //                                                    [mod26(B), mod26(E), mod26(H)],
        //                                                    [mod26(C), mod26(F), mod26(I)]]);
        let matrixTransposed = this.getKmathMatrix([[A, D, G],
                                                           [B, E, H],
                                                           [C, F, I]]);

        let result = $('<div/>');
        result.append(
            $('<p/>').text(
                'The inverse of the matrix can be computed using the formula:'
            )
        );
        let equation =
            '{M^{{-1}}=\\begin{pmatrix}a&b&c\\\\d&e&f\\\\g&h&i\\end{pmatrix}}^{{-1}}=det(M)^{{-1}}\\begin{pmatrix}A&B&C\\\\D&E&F\\\\G&H&I\\end{pmatrix}^{{T}}=det(M)^{{-1}}\\begin{pmatrix}A&D&G\\\\B&E&H\\\\C&F&I\\end{pmatrix}';//     {\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}}';
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
                href:
                    'https://en.wikipedia.org/wiki/Invertible_matrix',
            }).text('modular multiplicative inverse')
        );
        p.append(' math.');
        result.append(p);

        result.append(
            $('<p/>').text(
                'We start by finding the modulo 26 value of the determinant:'
            )
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
                href:
                    'https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm',
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

        result.append(
            $('<p/>').text(
                'Completing the calculation, we get:'
            )
        );
        equation = this.getKmathMatrix(
            [[determinantInverse + kmathMult + A,
                     determinantInverse + kmathMult + D,
                     determinantInverse + kmathMult + G],
                    [determinantInverse + kmathMult + b,
                     determinantInverse + kmathMult + E,
                     determinantInverse + kmathMult + H],
                    [determinantInverse + kmathMult + C,
                     determinantInverse + kmathMult + F,
                     determinantInverse + kmathMult + I]]) +
            '\\mod{26}' +
            kmathEquiv +
            this.getKmathMatrix(
                [[determinantInverse * A,
                         determinantInverse * D,
                         determinantInverse * G],
                        [determinantInverse * B,
                         determinantInverse * E,
                         determinantInverse * H],
                        [determinantInverse * C,
                         determinantInverse * F,
                         determinantInverse * I]]
            ) +
            '\\mod{26}' +
            kmathEquiv +
            this.getKmathMatrix(
                [[determinantInverse * A + '\\mod{26}',
                         determinantInverse * D + '\\mod{26}',
                         determinantInverse * G + '\\mod{26}'],
                        [determinantInverse * B + '\\mod{26}',
                         determinantInverse * E + '\\mod{26}',
                         determinantInverse * H + '\\mod{26}'],
                        [determinantInverse * C + '\\mod{26}',
                         determinantInverse * F + '\\mod{26}',
                         determinantInverse * I + '\\mod{26}']]
            ) +
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
        let result = $('<div/>');
        let charset = this.getCharset();
        let t, groupsize, x;

        // Figure out how big our array for encoding is
        groupsize = vals.length;

        // pad out the string to contain full groups of the group size
        str = this.padstr(str, groupsize);

        let equations = $('<div/>', { id: 'equations' });
        // Go through the string in the group size and perform the math on it
        for (let i = 0, len = str.length; i < len; i += groupsize) {
            let cluster = [];
            for (let j = i; j < i + groupsize; j++) {
                t = str.substr(j, 1);
                x = charset.indexOf(t);
                if (x < 0) {
                    $('#err').text(
                        'Internal error:' + t + ' invalid character'
                    );
                    return result;
                }
                cluster.push(x); // cluster.push([x]);
            }
            // Generate the math formula showing the encoding
            let line = this.genEncodeEquation(vals, cluster);
            let div = $('<div/>', {
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
        for (let row of matrix) {
            result += extra;
            if (Array.isArray(row)) {
                let rowextra = '';
                for (let c of row) {
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
        let charset = this.getCharset();
        let extra = '';
        let result = '\\begin{pmatrix}';
        for (let row of matrix) {
            result += extra;
            if (Array.isArray(row)) {
                let rowextra = '';
                for (let c of row) {
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
        let charset = this.getCharset();
        let aMultiplying: string[] = [];
        let aResultValues: number[] = [];
        let aResultMod26: number[] = [];

        // Compute the values into the various matrixes
        for (let rowdata of keyArray) {
            let extra = '';
            let rowval = 0;
            let strMult = '';
            for (let col = 0; col < rowdata.length; col++) {
                let spot = rowdata[col];
                let mult = msgArray[col];
                strMult += extra + spot + kmathMult + mult;
                rowval += spot * mult;
                extra = '+';
            }
            aMultiplying.push(strMult);
            aResultValues.push(rowval);
            let rvmod26 = rowval % charset.length;
            aResultMod26.push(rvmod26);
        }
        // Build the complete equation string using operators and
        let equation =
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
        let result: string[][] = [];
        // Figure out how big our array is
        let groupsize = Math.sqrt(str.length);
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
     * Generate the html that shows the key calcuation for the problem
     */
    public genQuestionMath(vals: number[][]): JQuery<HTMLElement> {
        let kmath =
            this.getKmathMatrixChars(vals) +
            kmathEquiv +
            this.getKmathMatrix(vals);

        // Provide the decryption matrix if the question is
        // decode a message using a 3x3 matrix.
        if (this.state.operation === 'decode' &&
            this.state.keyword.length === 9) {
            let decrypt3x3 = '\\qquad Decode ' +
                this.getKmathMatrixChars(vals) + '^{{-1}}' +
                kmathEquiv +
                this.getKmathMatrix(mod26InverseMatrix(vals))

            kmath += decrypt3x3
        }

        return renderMath(kmath);
    }
    public genAnswerMathMatrix(matrix: any[][]): JQuery<HTMLElement> {
        let table = new JTTable({
            class: 'hillans ansblock shrink cell unstriped',
        });
        let first = true;
        for (let row of matrix) {
            let tabrow = table.addBodyRow();
            if (first) {
                tabrow.add({
                    settings: {
                        rowspan: row.length,
                        class: 'big' + row.length,
                    },
                    content: '(',
                });
            }
            for (let c of row) {
                let cclass = 'a';
                if (c === ' ') {
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
        let key = this.state.keyword;
        let str = this.state.cipherString;
        let charset = this.getCharset();

        // Figure out how big our array for encoding is
        let groupsize = Math.sqrt(key.length);

        // pad out the string to contain full groups of the group size
        str = this.padstr(str, groupsize);

        // Go through the string in the group size and perform the math on it
        for (let i = 0, len = str.length; i < len; i += groupsize) {
            let cluster = [];
            for (let j = i; j < i + groupsize; j++) {
                let c = str.substr(j, 1);
                let val = charset.indexOf(c);
                if (val < 0) {
                    return 'Invalid Cipher:' + c + ' invalid character';
                }
                cluster.push(val);
            }
            let clustervals = multarray(vals, cluster);
            for (let j = 0; j < groupsize; j++) {
                result += charset.substr(clustervals[j] % charset.length, 1);
            }
        }
        return result;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        let vals = this.getValidKey(this.state.keyword);
        if (vals === undefined) {
            result.append(
                $('<h3/>').text('Invalid Hill Key: ' + this.state.keyword)
            );
            return result;
        }

        result.append(this.genQuestionMath(vals));
        if (this.state.operation === 'compute') {
           let modinv = mod26InverseMatrix(vals);
            result.append(
                $('<div/>').append(this.genAnswerMathMatrix(modinv))
            );
        } else {
            let encoded = this.computeHill(vals);
            let plaintext = this.minimizeString(this.state.cipherString);
            let charset = this.getCharset();
            this.setCharset(charset + ' ');
            if (this.state.operation === 'decode') {
                plaintext += this.repeatStr(
                    this.padval,
                    encoded.length - plaintext.length
                );
                let swap = plaintext;
                plaintext = encoded;
                encoded = swap;
            } else {
                plaintext += this.repeatStr(
                    ' ',
                    encoded.length - plaintext.length
                );
            }

            let table = new JTTable({
                class: 'hillblock ansblock shrink cell unstriped',
            });
            this.addCipherTableRows(
                table,
                undefined,
                plaintext,
                encoded,
                false
            );
            result.append(table.generate());
            this.setCharset(charset);
        }
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        let vals = this.getValidKey(this.state.keyword);
        if (vals === undefined) {
            result.append(
                $('<h3/>').text('Invalid Hill Key: ' + this.state.keyword)
            );
            return result;
        }

        result.append(this.genQuestionMath(vals));

        if (this.state.operation === 'compute') {
            let outMatrix: string[][] = this.makeMatrixFromString(
                this.repeatStr(' ', this.state.keyword.length)
            );
            result.append(
                $('<div/>').append(this.genAnswerMathMatrix(outMatrix))
            );
        } else {
            let encoded = this.computeHill(vals);
            let decodetext = this.minimizeString(this.state.cipherString);
            let charset = this.getCharset();
            this.setCharset(charset + ' ');
            if (this.state.operation === 'decode') {
                decodetext = encoded;
            } else {
                decodetext += this.repeatStr(
                    ' ',
                    encoded.length - decodetext.length
                );
            }
            let table = new JTTable({
                class: 'hillblock ansblock shrink cell unstriped',
            });
            this.addCipherTableRows(
                table,
                undefined,
                decodetext,
                undefined,
                false
            );
            result.append(table.generate());
            this.setCharset(charset);
        }
        return result;
    }
}
