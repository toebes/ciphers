import * as katex from 'katex'
import * as math from 'mathjs';
import { cloneObject, StringMap } from './ciphercommon';
import { CipherEncoder } from "./cipherencoder"
import { IState } from "./cipherhandler";
import { ICipherType } from "./ciphertypes"
import { JTButtonItem } from "./jtbuttongroup";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from './jtradiobutton';
import { JTTable } from './jttable';
import { isCoPrime, mod26, mod26Inverse2x2 } from './mathsupport';

// Configure how we want the multiplication to appear - either as a * or a dot
const kmathMult = "*"
// const kmathMult = ' \\cdot '
export class CipherHillEncoder extends CipherEncoder {
    defaultstate: IState = {
        cipherString: "",
        keyword: "",
        /** The type of cipher we are doing */
        cipherType: ICipherType.Hill,
        operation: "encode",
    }
    state: IState = cloneObject(this.defaultstate) as IState
    cmdButtons: JTButtonItem[] = [
        // { title: "Generate", color: "primary", id: "load", },
        this.undocmdButton,
        this.redocmdButton,
    ]
    charset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    padval: string = "Z";
    restore(data: IState): void {
        this.state = cloneObject(this.defaultstate) as IState
        this.copyState(this.state, data)
        this.setUIDefaults()
        this.updateOutput()
    }
    /**
     * Make a copy of the current state
     */
    save(): IState {
        // We need a deep copy of the save state
        let savestate = cloneObject(this.state) as IState
        return savestate
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    setUIDefaults(): void {
        super.setUIDefaults()
        this.setOperation(this.state.operation)
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    updateOutput(): void {
        if (this.state.operation === "compute") {
            $(".encbox").hide()
        } else {
            $(".encbox").show()
        }
        JTRadioButtonSet("operation", this.state.operation)
        super.updateOutput()
    }
    setKeyword(keyword: string): boolean {
        let changed = super.setKeyword(keyword)
        if (this.getValidKey(this.state.keyword) !== undefined) {
            $('#err').text('')
        }
        return changed
    }
    build(): JQuery<HTMLElement> {
        console.log('Incorrect Build called for Hill')
        return null
    }

    genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>")
        let radiobuttons = [
            { id: 'wrow', value: "encode", title: 'Encode' },
            { id: 'wrow', value: "compute", title: 'Compute Decryption' },
            { id: 'mrow', value: "decode", title: 'Decode' },
        ]
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation))

        result.append(this.genQuestionFields())
        result.append(JTFLabeledInput("Text to encode", 'textarea', 'toencode',
                                      this.state.cipherString, "encbox small-12 medium-12 large-12"))
        result.append(JTFLabeledInput("Keyword", 'text', 'keyword', this.state.keyword, ""))
        return result
    }
    genPostCommands(): JQuery<HTMLElement> {
        return null
    }
    /**
     *
     */
    load(): void {
        let key = this.state.keyword.toUpperCase()
        let toencode = this.state.cipherString.toUpperCase()
        $('#err').text('')
        let vals = this.getValidKey(key)
        if (vals === undefined) {
            return
        }

        let result = $("<div>")
        // Always give them the formula
        result.append(this.genQuestionMath(vals))

        if (this.state.operation === "compute") {
            result.append(this.genInverseFormula(vals))
        } else {
            let encoded = this.computeHill(vals)
            if (this.state.operation === "decode") {
                // For decode, we only allow the 2x2 matrix
                if (vals.length !== 2) {
                    result.append($("<h3>").text("Decode only supported for 2x2 matrix"))
                } else {
                    result.append(this.genInverseFormula(vals))
                    toencode += this.repeatStr(this.padval, encoded.length - toencode.length)
                    result.append($('<div>', { class: "TOSOLVE" }).text(encoded))
                    result.append($('<div>', { class: "TOANSWER" }).text(toencode))
                    let modinv = mod26Inverse2x2(vals)
                    result.append(this.genEncodeMath(modinv, encoded))
                }
            } else {
                result.append($('<div>', { class: "TOSOLVE" }).text(toencode))
                result.append($('<div>', { class: "TOANSWER" }).text(encoded))
                result.append(this.genEncodeMath(vals, toencode))
            }
        }
        $("#answer").empty().append(result)
    }

    /**
     * Pad a string with the padding character based on the grouping size
     */
    padstr(str: string, groupsize: number): string {
        let res = ""
        let charset = this.getCharset()
        for (let t of str.toUpperCase()) {
            let x = charset.indexOf(t)
            if (x >= 0) {
                res += t
            }
        }
        let topad = (groupsize - (res.length % groupsize)) % groupsize
        res += this.repeatStr(this.padval, topad)
        return res
    }

    getValidKey(key: string): number[][] {
        let vals = [];
        let charset = this.getCharset()
        let groupsize;
        if (key.length !== 4 && key.length !== 9) {
            $('#err').text('Invalid key.  It must be either 4 or 9 characters long')
            return undefined
        }
        if (key.length !== 4 && this.state.operation === "decode") {
            $('#err').text('Decode operation only supports 2x2 matrix')
            return undefined
        }
        // Figure out how big our array for encoding is
        groupsize = Math.sqrt(key.length);

        // Parse out the key and create the matrix to multiply by
        for (let i = 0, len = key.length; i < len; i++) {
            let row;
            let t = key.substr(i, 1).toUpperCase()
            let x = charset.indexOf(t)
            if (x < 0) {
                console.log('Invalid character:' + t);
                $('#err').text('Invalid key character:' + t)
                return undefined;
            }
            row = Math.floor(i / groupsize);
            if (typeof vals[row] === 'undefined') {
                vals[row] = [];
            }
            vals[row][i % groupsize] = x;
        }

        let determinant = math.det(vals);
        if (determinant === 0) {
            $('#err').text('Matrix is not invertable')
            return undefined;
        }
        if (!isCoPrime(determinant, charset.length)) {
            $('#err').text('Matrix is not invertable.  Determinant ' + mod26(determinant) + ' is not coprime with ' + charset.length);
            return undefined;
        }
        return vals
    }
    /**
     * Show the inverse matrix for a 2x2 matrix
     */
    genInverseFormula(vals: number[][]): JQuery<HTMLElement> {
        let modinv = mod26Inverse2x2(vals)
        let kmath = this.getKmathMatrix(vals) +
            "^{-1}=" +
            this.getKmathMatrix(modinv)
        return $(katex.renderToString(kmath))
    }
    /**
     * Show the math for doing a matrix encode/decoode of a 2x2 or 3x3 matrix
     * For a decode, pass in the inverted matrix
     */
    genEncodeMath(vals: number[][], str: string): JQuery<HTMLElement> {
        let result = $("<div>")
        let charset = this.getCharset()
        let t, groupsize, x;

        // Figure out how big our array for encoding is
        groupsize = vals.length

        // pad out the string to contain full groups of the group size
        str = this.padstr(str, groupsize);

        let equations = $("<div/>", { id: "equations" })
        // Go through the string in the group size and perform the math on it
        for (let i = 0, len = str.length; i < len; i += groupsize) {
            let cluster = [];
            for (let j = i; j < i + groupsize; j++) {
                t = str.substr(j, 1);
                x = charset.indexOf(t);
                if (x < 0) {
                    $('#err').text('Internal error:' + t + ' invalid character');
                    return result
                }
                cluster.push(x);    // cluster.push([x]);
            }
            // Generate the math formula showing the encoding
            let line = this.genEncodeEquation(vals, cluster)
            let div = $("<div>", { class: "lineeq" }).append($(katex.renderToString(line)))
            equations.append(div)
        }
        result.append(equations)
        return result;
    }
    /**
     * Generate the Kmath representation of a matrix
     */
    getKmathMatrix(matrix: any[]): string {
        let extra = ''
        let result = "\\begin{pmatrix}";
        for (let row of matrix) {
            result += extra
            if (Array.isArray(row)) {
                let rowextra = ""
                for (let c of row) {
                    result += rowextra + c
                    rowextra = "&"
                }
            } else {
                result += row
            }
            extra = "\\\\"
        }
        result += "\\end{pmatrix}"
        return result
    }
    /**
     * Generate the kmath representation of the characters in a matrix
     */
    getKmathMatrixChars(matrix: number[] | number[][]): string {
        let charset = this.getCharset()
        let extra = ''
        let result = "\\begin{pmatrix}";
        for (let row of matrix) {
            result += extra
            if (Array.isArray(row)) {
                let rowextra = ""
                for (let c of row) {
                    result += rowextra + charset.substr(c, 1)
                    rowextra = "&"
                }
            } else {
                result += charset.substr(row, 1)
            }
            extra = "\\\\"
        }
        result += "\\end{pmatrix}"
        return result
    }
    /**
     * This function builds an equation for a single block of data
     */
    genEncodeEquation(keyArray: number[][], msgArray: number[]): string {
        let charset = this.getCharset()
        let aMultiplying: string[] = []
        let aResultValues: number[] = []
        let aResultMod26: number[] = []

        // Compute the values into the various matrixes
        for (let rowdata of keyArray) {
            let extra = ''
            let rowval = 0
            let strMult = ""
            for (let col = 0; col < rowdata.length; col++) {
                let spot = rowdata[col]
                let mult = msgArray[col]
                strMult += extra + spot + kmathMult + mult
                rowval += spot * mult
                extra = '+'
            }
            aMultiplying.push(strMult)
            aResultValues.push(rowval)
            let rvmod26 = rowval % charset.length
            aResultMod26.push(rvmod26)
        }
        // Build the complete equation string using operators and
        let equation = this.getKmathMatrixChars(keyArray) + kmathMult +
            this.getKmathMatrixChars(msgArray) +
            '\\equiv' +
            this.getKmathMatrix(keyArray) + kmathMult +
            this.getKmathMatrix(msgArray) +
            '\\equiv' +
            this.getKmathMatrix(aMultiplying) +
            '\\equiv' +
            this.getKmathMatrix(aResultValues) +
            '\\equiv' +
            this.getKmathMatrix(aResultMod26) + '\\text{(mod 26)}' +
            '\\equiv' +
            this.getKmathMatrixChars(aResultMod26)

        // Done!
        return equation;
    }
    /**
     * Given a string, convert it to a matrix
     */
    makeMatrixFromString(str: string): string[][] {
        let result: string[][] = []
        // Figure out how big our array is
        let groupsize = Math.sqrt(str.length)
        // As long as it is square, we can generate a matrix from it
        if ((groupsize * groupsize) === str.length) {
            for (let row = 0; row < groupsize; row++) {
                result.push([])
                for (let col = 0; col < groupsize; col++) {
                    result[row].push(str.substr((row * groupsize) + col, 1))
                }
            }
        }
        return result
    }
    /**
     * Generate the html that shows the key calcuation for the problem
     */
    genQuestionMath(vals: number[][]): JQuery<HTMLElement> {
        let kmath = this.getKmathMatrixChars(vals) +
            "\\equiv" +
            this.getKmathMatrix(vals)
        return $(katex.renderToString(kmath))
    }
    genAnswerMathMatrix(matrix: any[][]): JQuery<HTMLElement> {
        let table = new JTTable({ class: 'hillans ansblock shrink cell unstriped' })
        let first = true
        for (let row of matrix) {
            let tabrow = table.addBodyRow()
            if (first) {
                tabrow.add({ settings: { rowspan: row.length, class: "big" + row.length }, content: "(" })
            }
            for (let c of row) {
                let cclass = "a"
                if (c === ' ') {
                    cclass = "q"
                }
                tabrow.add({ settings: { class: cclass + " v" }, content: c })
            }
            if (first) {
                tabrow.add({ settings: { rowspan: row.length, class: "big" + row.length }, content: ")" })
            }
            first = false
        }
        return table.generate()
    }
    computeHill(vals: number[][]): string {
        let result = ""
        let key = this.state.keyword
        let str = this.state.cipherString
        let charset = this.getCharset()

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
                    return ('Invalid Cipher:' + c + ' invalid character');
                }
                cluster.push(val);
            }
            let clustervals = math.multiply(vals, cluster);
            for (let j = 0; j < groupsize; j++) {
                result += charset.substr(clustervals[j] % charset.length, 1);
            }
        }
        return result
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    genAnswer(): JQuery<HTMLElement> {
        let result = $("<div>")
        let vals = this.getValidKey(this.state.keyword);
        if (vals === undefined) {
            result.append($("<h3/>").text("Invalid Hill Key: " + this.state.keyword))
            return result
        }

        result.append(this.genQuestionMath(vals))
        if (this.state.operation === "compute") {
            let modinv = mod26Inverse2x2(vals)
            result.append($("<div/>").append(this.genAnswerMathMatrix(modinv)))
        } else {
            let encoded = this.computeHill(vals)
            let charset = this.getCharset()
            this.setCharset(charset + " ")
            let plaintext = this.state.cipherString
            if (this.state.operation === "decode") {
                plaintext += this.repeatStr(this.padval, encoded.length - plaintext.length)
                let swap = plaintext
                plaintext = encoded
                encoded = swap
            } else {
                plaintext += this.repeatStr(" ", encoded.length - plaintext.length)
            }

            let table = new JTTable({ class: "hillblock ansblock shrink cell unstriped" })
            this.addCipherTableRows(table, undefined, plaintext, encoded, false)
            result.append(table.generate())
            this.setCharset(charset)
        }
        return result
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    genQuestion(): JQuery<HTMLElement> {
        let result = $("<div>")
        let vals = this.getValidKey(this.state.keyword);
        if (vals === undefined) {
            result.append($("<h3/>").text("Invalid Hill Key: " + this.state.keyword))
            return result
        }

        let outMatrix: string[][] = this.makeMatrixFromString(this.repeatStr(" ", this.state.keyword.length))
        result.append(this.genQuestionMath(vals))

        if (this.state.operation === "compute") {
            result.append($("<div/>").append(this.genAnswerMathMatrix(outMatrix)))
        } else {
            let encoded = this.computeHill(vals)
            let decodetext = this.state.cipherString
            let charset = this.getCharset()
            this.setCharset(charset + " ")
            if (this.state.operation === "decode") {
                decodetext = encoded
            } else {
                decodetext += this.repeatStr(" ", encoded.length - decodetext.length)
            }
            let table = new JTTable({ class: "hillblock ansblock shrink cell unstriped" })
            this.addCipherTableRows(table, undefined, decodetext, undefined, false)
            result.append(table.generate())
            this.setCharset(charset)
        }
        return result
    }
}
