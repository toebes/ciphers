import * as katex from 'katex'
import * as math from 'mathjs';
import { cloneObject, StringMap } from './ciphercommon';
import { CipherEncoder } from "./cipherencoder"
import { IOperationType, IState } from "./cipherhandler";
import { ICipherType } from "./ciphertypes"
import { JTButtonItem } from "./jtbuttongroup";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from './jtradiobutton';
import { JTTable } from './jttable';
import { isCoPrime, mod26, mod26Inverse2x2 } from './mathsupport';

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
        { title: "Generate", color: "primary", id: "load", },
        this.undocmdButton,
        this.redocmdButton,
    ]
    charset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    padval: string = "ZZZZZZZ";
    encodeTable: StringMap = {}
    completeSolution: boolean = false
    restore(data: IState): void {
        this.state = cloneObject(this.defaultstate) as IState
        this.copyState(this.state, data)
        this.setUIDefaults()
        this.updateOutput()
    }
    setUIDefaults(): void {
        super.setUIDefaults()
        this.setOperation(this.state.operation)
    }
    updateOutput(): void {
        super.updateOutput()
        JTRadioButtonSet("operation", this.state.operation)
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
     * Set cipher encoder encode or decode mode
     */
    setOperation(operation: IOperationType): void {
        super.setOperation(operation)
        if (this.state.operation === "compute") {
            $(".encbox").hide()
        } else {
            $(".encbox").show()
        }
    }
    setKeyword(keyword: string): boolean {
        let changed = super.setKeyword(keyword)
        if (this.isvalidkey(this.state.keyword)) {
            $('#err').text('')
        }
        return changed
    }

    /*
    * Creates an HTML table to display the frequency of characters
    */
    createHillSolutionTable(): JQuery<HTMLElement> {
        let table = $('<table/>').addClass("tfreq")
        let thead = $('<thead/>')
        let tbody = $('<tbody/>')
        let headrow = $('<tr/>')
        let freqrow = $('<tr/>')
        let replrow = $('<tr/>')
        let altreprow = $('<tr/>')
        let charset = this.getCharset()

        headrow.append($('<th/>').addClass("topleft"))
        freqrow.append($('<th/>').text("Frequency"))
        replrow.append($('<th/>').text("Replacement"))
        altreprow.append($('<th/>').text("Rev Replace"))
        for (let c of charset.toUpperCase()) {
            headrow.append($('<th/>').text(c))
            freqrow.append($('<td id="f' + c + '"/>'))
            let td = $('<td/>')
            td.append(this.makeFreqEditField(c))
            replrow.append(td)
            altreprow.append($('<td id="rf' + c + '"/>'))
        }
        thead.append(headrow)
        tbody.append(freqrow)
        tbody.append(replrow)
        if (this.ShowRevReplace) {
            tbody.append(altreprow)
        }
        table.append(thead)
        table.append(tbody)

        return table
    }
    /**
     * Initializes the encoder.
     * We don't want to show the reverse replacement since we are doing an encode
     */
    init(): void {
        this.state = cloneObject(this.defaultstate) as IState
        this.ShowRevReplace = false
    }

    build(): JQuery<HTMLElement> {
        console.log('Incorrect Build called for Hill')
        return null
    }

    solveIt(m1: number, c1: number, m2: number, c2: number): string {
        let answer = 'Can\'t solve.'

        let c = c1 - c2
        let m = m1 - m2

        while (m < 0) {
            m += 26
        }

        // The reality is that A can only be one of: 1, 3, 5, 7, 9, 11,
        // 15, 17, 19, 21, 23, 25.  B will be between 0 and 25.

        while (((c < 0) || (c % m !== 0)) && c < 626) {
            c += 26
        }
        let A = c / m
        console.log('A=' + A)
        // if A not in the list, return answer.
        if ((A % 2 !== 1) || (A < 1) || (A > 25)) {
            return answer
        }

        let B = (c1 - (A * m1)) % 26
        while (B < 0) {
            B += 26
        }

        return 'A = ' + A + '; B = ' + B
    }
    /**
     *
     */
    attachHandlers(): void {
        super.attachHandlers()
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
    genQuestions(): JQuery<HTMLElement> {
        return null
    }
    /**
     *
     */
    load(): void {
        let key = this.state.keyword.toUpperCase()
        let toencode = this.state.cipherString
        $('#err').text('')
        let res

        if (this.state.operation === "compute") {
            res = this.computeInverse(key)
        } else {
            res = this.hill(key, toencode)
        }
        // // Only do the hardcore stuff when the button is clicked.
        // // Set it to 'zoom' the equation on hover.
        // MathJax.Hub.Config({
        //     menuSettings: {
        //         zoom: "Hover"
        //     }
        // });
        // Now that the calculations have been done,
        // asynchronously typeset them.
        // MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'equations']);
        // Show equations
        $('#equations').show();
        $("#answer").replaceWith(res)
    }

    // Pad a string with the padding character based on the grouping size
    padstr(str: string, groupsize: number): string {
        let res = ""
        let charset = this.getCharset()
        console.log('padstr(' + str + ',' + groupsize + ')');
        for (let t of str.toUpperCase()) {
            let x = charset.indexOf(t)
            if (x >= 0) {
                res += t
            }
        }
        console.log(res)
        let topad = (groupsize - (res.length % groupsize)) % groupsize
        res += this.padval.substr(0, topad)
        return res
    }

    isvalidkey(key: string): number[][] {
        let vals = [];
        let charset = this.getCharset()
        let groupsize;
        if (key.length !== 4 && key.length !== 9) {
            $('#err').text('Invalid key.  It must be either 4 or 9 characters long')
            return null
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
                return null;
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
            return null;
        }
        if (!isCoPrime(determinant, charset.length)) {
            $('#err').text('Matrix is not invertable.  Determinant ' + mod26(determinant) + ' is not coprime with ' + charset.length);
            return null;
        }
        return vals
    }
    computeInverse(key: string): JQuery<HTMLElement> {
        let vals = this.isvalidkey(key);
        if (vals === null) {
            return null
        }
        let modinv = mod26Inverse2x2(vals)
        let kmath = "\\begin{pmatrix}" +
                        key.substr(0, 1) + "&" + key.substr(1, 1) + "\\\\" +
                        key.substr(2, 1) + "&" + key.substr(3, 1) +
                    "\\end{pmatrix}" +
                    "\\equiv" +
                    "\\begin{pmatrix}" +
                        String(modinv[0][0]) + "&" + String(modinv[0][1]) + "\\\\" +
                        String(modinv[1][0]) + "&" + String(modinv[1][1]) +
                    "\\end{pmatrix}"
        return $(katex.renderToString(kmath))
    }

    hill(key: string, str: string): string {
        let res = "";
        let charset = this.getCharset()
        let vals = [];
        let t, groupsize, x;
        vals = this.isvalidkey(key);

        if (vals === null) {
            console.log('****RETURNING****');
            return '';
        }
        // Figure out how big our array for encoding is
        groupsize = Math.sqrt(key.length);

        // pad out the string to contain full groups of the group size
        str = this.padstr(str, groupsize);

        //console.log('Determinant =' + math.det(vals));
        // console.log('Inverse =' + math.inv(vals));

        let equation = '';
        // Go through the string in the group size and perform the math on it
        for (let i = 0, len = str.length; i < len; i += groupsize) {
            let cluster = [];
            for (let j = i; j < i + groupsize; j++) {
                t = str.substr(j, 1);
                x = charset.indexOf(t);
                if (x < 0) {
                    $('#err').text('Internal error:' + t + ' invalid character');
                    return '';
                }
                cluster.push(x);    // cluster.push([x]);
            }
            let clustervals = math.multiply(vals, cluster);
            for (let j = 0; j < groupsize; j++) {
                res += charset.substr(clustervals[j] % charset.length, 1);
            }
            // Build a big long string from each encoding that represents
            // the equations using MathJax.
            equation += this.buildEquation(groupsize, vals, cluster);
        }
        $('#err').text('');
        //            for (i = 0, len = str.length; i < len; i++) {
        //                t = affinechar(a, b, str.substr(i, 1));
        //                res += t;
        //            }
        $('#equations').text(equation);
        // Dont show matrix math equations yet, htey need to be typeset
        // which is done on button click.
        $('#equations').hide();
        return res;
    }
    /**
     * This function builds an equation for a single 'row'
     *
     * @param {integer} size of the key matrix dimensions (sq. root of key lenght)
     * @param {array} array of key letter values (i.e. size x size)
     * @param {array} array of message letter values (i.e. size x 1)
     * @returns {string} MathJax string of entire matrix math equation
     */
    buildEquation(size: number, keyArray: number[][], msgArray: number[]): string {

        let equation = ''
        let charset = this.getCharset()
        let row, col;

        // Set up MathJax for each matrix (we are using {array} because
        // elements can be centered.  We put verical bars around it to
        // make it look like a matrix.)
        let keyLetters = '$$\\left|\\begin{array}{cc}';
        let msgLetters = '\\left|\\begin{array}{c}';
        let keyValues = '\\left|\\begin{array}{cc}';
        let msgValues = '\\left|\\begin{array}{c}';
        let multiplying = '\\left|\\begin{array}{c}';
        let resultValues = '\\left|\\begin{array}{c}';
        let resultMod26 = '\\left|\\begin{array}{c}';
        let resultLetters = '\\left|\\begin{array}{c}';

        // This will hold the calculated value of the matrix element
        // multiplication.
        let x;
        // Loop through the rows and colums and build the equations string.
        for (row = 0; row < size; row++) {
            x = 0;
            for (col = 0; col < size; col++) {
                // Append element delimiter after first element.
                if (col > 0) {
                    // elements in matrices with more than one column are
                    // delimited with '&'.  The '+' is for the element
                    // multiply equation.
                    keyLetters += ' & ';
                    keyValues += ' & ';
                    multiplying += ' + ';
                }
                // Use typewriter font throughout...
                // Fill in the elements for all the multi-column matricies
                keyLetters += ('\\mathtt{' + charset.substr(keyArray[row][col], 1) + '}');
                keyValues += ('\\mathtt{' + keyArray[row][col] + '}');
                multiplying += (('\\mathtt{' + keyArray[row][col] + ' \\cdot ' + msgArray[col] + '}'));
                x += keyArray[row][col] * msgArray[col];
            }
            // Fill in the elements for all the single column matricies
            msgLetters += ('\\mathtt{' + charset.substr(msgArray[row], 1) + '}');
            msgValues += ('\\mathtt{' + msgArray[row] + '}');
            resultValues += ('\\mathtt{' + x + '}');
            resultMod26 += ('\\mathtt{' + (x % charset.length) + '}');
            resultLetters += ('\\mathtt{' + charset.substr(x % charset.length, 1) + '}');
            // Add a row separator except after the last row.
            if (row !== size - 1) {
                keyLetters += '\\\\';
                msgLetters += '\\\\';
                keyValues += '\\\\';
                msgValues += '\\\\';
                multiplying += '\\\\';
                resultValues += '\\\\';
                resultMod26 += '\\\\';
                resultLetters += '\\\\';
            }
        }
        // Close off each matrix (array)
        keyLetters += '\\end{array}\\right|';
        msgLetters += '\\end{array}\\right|';
        keyValues += '\\end{array}\\right|';
        msgValues += '\\end{array}\\right|';
        multiplying += '\\end{array}\\right|';
        resultValues += '\\end{array}\\right|';
        resultMod26 += '\\end{array}\\right|';
        // The extra four $'s create some space between equations
        resultLetters += '\\end{array}\\right|$$$$$$';

        // Build the complete equation string using operators and
        // whatnot between each matrix.
        equation += keyLetters;
        equation += ' \\cdot ';
        equation += msgLetters;
        equation += '\\equiv';
        equation += keyValues;
        equation += ' \\cdot ';
        equation += msgValues;
        equation += '\\equiv';
        equation += multiplying;
        equation += '\\equiv';
        equation += resultValues;
        equation += '\\equiv';
        equation += resultMod26;
        equation += '\\text{(mod 26)}\\equiv';
        equation += resultLetters;

        // Done!
        return equation;
    }
    makeMatrix(str: string): any[][] {
        if (str.length === 4) {
            return [[str.substr(0, 1), str.substr(1, 1)],
            [str.substr(2, 1), str.substr(3, 1)]]
        }
        if (str.length === 9) {
            return [[str.substr(0, 1), str.substr(1, 1), str.substr(2, 1)],
            [str.substr(3, 1), str.substr(4, 1), str.substr(5, 1)],
            [str.substr(6, 1), str.substr(7, 1), str.substr(8, 1)]]
        }
        // We don't understand the length, so they get nothing
        return [[]]
    }
    getKmathMatrix(matrix: any[][]): string {
        let extra = ''
        let result = "\\begin{pmatrix}";
        for (let row of matrix) {
            result += extra
            let rowextra = ""
            for (let c of row) {
                result += rowextra + c
                rowextra = "&"
            }
            extra = "\\\\"
        }
        result += "\\end{pmatrix}"
        return result
    }
    genQuestionMath(): JQuery<HTMLElement> {
        let key = this.state.keyword.toUpperCase()
        let vals = this.isvalidkey(key)
        if (vals === null) {
            return $("<h2/>").text("Invalid key: " + this.state.keyword)
        }
        let kmath = this.getKmathMatrix(this.makeMatrix(key)) +
                    "\\equiv" +
                    this.getKmathMatrix(vals)
        return $(katex.renderToString(kmath))
    }
    genAnswerMathMatrix(matrix: any[][]): JQuery<HTMLElement> {
        let table = new JTTable({ class: 'hillans ansblock shrink cell unstriped'})
        let first = true
        for (let row of matrix) {
            let tabrow = table.addBodyRow()
            if (first) {
                tabrow.add({ settings: { rowspan: row.length, class: "big" + row.length}, content: "(" })
            }
            for (let c of row) {
                let cclass = "a"
                if (c === ' ') {
                    cclass = "q"
                }
                tabrow.add({settings: {class: cclass + " v"}, content: c})
            }
            if (first) {
                tabrow.add({ settings: { rowspan: row.length, class: "big" + row.length}, content: ")" })
            }
            first = false
        }
        return table.generate()
    }
    computeHill(): string {
        let result = ""
        let key = this.state.keyword
        let str = this.state.cipherString
        let charset = this.getCharset()
        let vals = this.isvalidkey(key);
        if (vals === null) {
            return "Invalid keyword:" + key
        }

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

        let outMatrix: string[][] = this.makeMatrix(this.state.keyword)
        result.append(this.genQuestionMath())
        if (this.state.operation === "compute") {
            let vals = this.isvalidkey(this.state.keyword);
            if (vals !== null) {
                let modinv = mod26Inverse2x2(vals)
                result.append($("<div/>").append(this.genAnswerMathMatrix(modinv)))
            }
        } else {
            let encoded = this.computeHill()
            let charset = this.getCharset()
            this.setCharset(charset + " ")
            let plaintext = this.state.cipherString
            plaintext += this.repeatStr(" ", encoded.length - plaintext.length)

            let table = new JTTable({class: "hillblock ansblock shrink cell unstriped"})
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
        let outMatrix: string[][] = this.makeMatrix(this.repeatStr(" ", this.state.keyword.length))
        result.append(this.genQuestionMath())

        if (this.state.operation === "compute") {
            result.append($("<div/>").append(this.genAnswerMathMatrix(outMatrix)))
        } else {
            let encoded = this.computeHill()
            let plaintext = this.state.cipherString
            let charset = this.getCharset()
            this.setCharset(charset + " ")
            plaintext += this.repeatStr(" ", encoded.length - plaintext.length)
            encoded = this.repeatStr(" ", encoded.length)
            let table = new JTTable({class: "hillblock ansblock shrink cell unstriped"})
            this.addCipherTableRows(table, undefined, plaintext, undefined, false)
            result.append(table.generate())
            this.setCharset(charset)
        }

        return result
    }
}
