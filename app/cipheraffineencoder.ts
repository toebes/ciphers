/// <reference types="ciphertypes" />

import { CipherEncoder } from "./cipherencoder"
import { IState } from "./cipherhandler";
import { ICipherType } from "./ciphertypes"
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
interface IAffineState extends IState {
    /** a value */
    a: number
    /** b value */
    b: number
}

export class CipherAffineEncoder extends CipherEncoder {
    defaultstate: IAffineState = {
        /** The current cipher we are working on */
        a: 1,
        /** The number of rails currently being tested */
        b: 0,
        cipherString: "",
        /** The type of cipher we are doing */
        cipherType: ICipherType.Affine,
    }
    state: IAffineState = { ...this.defaultstate }
    cmdButtons: JTButtonItem[] = [
        { title: "Encrypt", color: "primary", id: "load", },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Print Solution", color: "primary", id: "solve", disabled: true },
    ]
    affineCheck: { [key: string]: number } = {
        'p': -1,
        'q': -1,
        'r': -1,
        's': -1,
        'oldId': -1,
        'olderId': -1
    }

    charset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    encodeTable: StringMap = {}
    completeSolution: boolean = false
    /** The direction of the last advance */
    advancedir: number = 0
    restore(data: IAffineState): void {
        this.state = { ...this.defaultstate }
        this.copyState(this.state, data)
        this.setUIDefaults()
        this.updateOutput()
    }
    setUIDefaults(): void {
        this.seta(this.state.a, 0)
        this.setb(this.state.b)
    }
    updateOutput(): void {
        super.updateOutput()
        $("#a").val(this.state.a)
        $("#b").val(this.state.b)
    }
    /**
     * Make a copy of the current state
     */
    save(): IState {
        // We need a deep copy of the save state
        let savestate = { ...this.state }
        return savestate
    }
    affinechar(a: number, b: number, chr: string): string {
        let charset = this.getCharset()
        let x = charset.indexOf(chr.toUpperCase())
        if (x < 0) { return chr }
        let y = ((a * x) + b) % charset.length
        let res = charset.substr(y, 1)
        console.log('char=' + chr + ' x=' + x + ' a=' + a + ' b=' + b + ' y=' + y + ' res=' + res)
        return res
    }
    /*
    * Creates an HTML table to display the frequency of characters
    */
    createAffineSolutionTable(): JQuery<HTMLElement> {
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
        this.state = { ...this.defaultstate }
        this.ShowRevReplace = false
        let affineCheck = {}
        this.affineCheck['p'] = -1
        this.affineCheck['q'] = -1
        this.affineCheck['r'] = -1
        this.affineCheck['s'] = -1
        $("[id='solve']").prop('disabled', true)
        $("[id='solve']").prop('value', 'Select 2 hint letters')
        console.log('Init...' + this.affineCheck['p'])
    }

    build(msg: string): JQuery<HTMLElement> {
        console.log('Incorrect Build called for Affine')
        return null
    }

    buildAffine(msg: string, a: number, b: number): JQuery<HTMLElement> {
        let i
        let charset = this.getCharset()
        let message = ''
        let cipher = ''
        let result = $('<div>')
        let msgLength = msg.length
        let lastSplit = -1
        let c = ''

        let table = $('<table/>').addClass("tfreq")
        let tableBody = $('<tbody/>')
        let messageRow = $('<tr/>')
        let cipherRow = $('<tr/>')

        for (i = 0; i < msgLength; i++) {
            let messageChar = msg.substr(i, 1).toUpperCase()
            let cipherChar = ''
            let m = charset.indexOf(messageChar)
            if (m >= 0) {

                message += messageChar
                cipherChar = this.affinechar(a, b, messageChar)
                cipher += cipherChar
            } else {
                message += messageChar
                cipher += messageChar
                lastSplit = cipher.length
                continue
            }

            messageRow.append($('<td id="m' + i + '"/>').addClass("TOANSWER").text(messageChar))
            cipherRow.append($('<td id="' + i + '"/>').addClass("TOSOLVE").text(cipherChar))

        }
        if (message.length > 0) {
            tableBody.append(cipherRow)
            tableBody.append(messageRow)
        }
        table.append(tableBody)

        return table
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
     * Compute the greatest common denominator between two numbers
     * @param a First number
     * @param b Second Number
     */
    gcd(a: number, b: number): number {
        if (isNaN(a)) { return a }
        if (isNaN(b)) { return b }
        if (a < 0) { a = -a }
        if (b < 0) { b = -b }

        if (b > a) { let temp = a; a = b; b = temp; }
        while (true) {
            console.log('gcd a=' + a + ' b=' + b)
            if (b === 0) { return a }
            a %= b
            if (a === 0) { return b }
            b %= a
        }
    }

    iscoprime(a: number): boolean {
        let charset = this.getCharset()
        console.log('iscoprime a=' + a + ' len=' + charset.length)
        let gcdval = this.gcd(a, charset.length)
        console.log('gcd(' + a + ',' + charset.length + ')=' + gcdval)
        if (gcdval !== 1) {
            return false
        }
        return true
    }

    /**
     *
     * @param a
     * @param b
     * @param letterString
     */
    encodeLetters(a: number, b: number, letterString: string): string {
        let encoding = '\\begin{array}{lccrcl}'
        let charset = this.getCharset()
        for (let m of letterString) {
            let mVal = charset.indexOf(m)
            let cVal = ((a * mVal) + b)
            let c = charset.substr(cVal % 26, 1)
            encoding += m + '(' + mVal + ') & \\to & ' + mVal + ' * ' + a + ' + ' +
                b + ' & ' + cVal + ' & \\to & ' + c + '(' + cVal % 26 + ')\\\\'

        }
        encoding += '\\end{array}'
        return encoding
    }
    /**
     *
     * @param s
     */
    encodeString(s: string): string {
        let encoded = ''
        for (let i = 0; i < s.length; i++) {
            encoded += this.encodeTable[s.substr(i, 1)]
        }
        return encoded
    }
    /**
     *
     * @param a
     * @param b
     */
    setEncodingTable(a: number, b: number): void {
        let charset = this.getCharset()
        for (let i = 0; i < charset.length; i++) {
            let c = -1
            let letter = charset.substr(i, 1)
            c = (a * i) + b
            while (c >= 26) {
                c -= 26
            }
            this.encodeTable[letter] = charset.substr(c, 1)
        }
    }
    /**
     *
     * @param msg
     * @param letters
     */
    showOutput(msg: string, letters: string): JQuery<HTMLElement> {
        let i
        let message = ''
        let cipher = ''
        let result = $('<div>')
        let msgLength = msg.length
        let lastSplit = -1
        let c = ''
        let charset = this.getCharset()

        let table = $('<table/>').addClass("tfreq")
        let tableBody = $('<tbody/>')
        let messageRow = $('<tr/>')
        let cipherRow = $('<tr/>')

        // Assume that these letters complete the solution
        this.completeSolution = true

        for (i = 0; i < msgLength; i++) {
            let messageChar = msg.substr(i, 1).toUpperCase()
            let cipherChar = ''
            let m = charset.indexOf(messageChar)
            if (m >= 0) {

                message += messageChar
                cipherChar = this.encodeTable[messageChar]
                cipher += cipherChar
            } else {
                message += messageChar
                cipher += messageChar
                lastSplit = cipher.length
                continue
            }

            if (letters.indexOf(messageChar) !== -1) {
                messageRow.append($('<td/>').addClass("TOANSWER").text(messageChar))
            } else {
                // Alas one of the letters is unresolved, to the solution is not complete
                messageRow.append($('<td/>').addClass("TOANSWER").text(' '))
                this.completeSolution = false
            }
            cipherRow.append($('<td/>').addClass("TOSOLVE").text(cipherChar))
        }
        if (message.length > 0) {
            tableBody.append(cipherRow)
            tableBody.append(messageRow)
        }
        table.append(tableBody)

        //return result.html()
        return table
    }

    printSolution(theMessage: string, m1: string, c1: string, m2: string, c2: string): void {
        let charset = this.getCharset()
        let m1Val = charset.indexOf(m1)
        let c1Val = charset.indexOf(c1)
        let m2Val = charset.indexOf(m2)
        let c2Val = charset.indexOf(c2)

        let solution = '<p>Here is how we get the answer.  Since we are given that:</p>'

        let given = '\\begin{align} ' + m1 + '(' + m1Val + ') & \\to ' + c1 + '(' + c1Val + ') \\\\ ' +
            m2 + '(' + m2Val + ') & \\to ' + c2 + '(' + c2Val + ') \\end{align}'
        solution += given
        solution += '<p>From this we know:</p>'

        let equation1 = '\\left(a * ' + m1Val + ' + b\\right)\\;\\text{mod 26} & = ' + c1Val + ' \\\\'
        let equation2 = '\\left(a * ' + m2Val + ' + b\\right)\\;\\text{mod 26} & = ' + c2Val + ' \\\\'

        if (m1Val > m2Val) {
            solution += ('\\begin{align}' + equation1)
            solution += (equation2 + '\\end{align}')
        } else {
            solution += ('\\begin{align}' + equation2)
            solution += (equation1 + '\\end{align}')
        }
        solution += '<p>Next, subtract the formulas:</p>'

        //            let subtract = '\\begin{align} & '+equation1+' - & '+equation2+' \\end{align}'
        let subtract1 = ''
        let subtract2 = ''
        let mVal = 0
        let cVal = 0
        let mSubstitute = 0
        let cSubstitute = 0

        // the 2 equations
        if (m1Val > m2Val) {
            mVal = m1Val - m2Val
            cVal = c1Val - c2Val
            subtract1 = '\\begin{align}' + equation1 + ' - ' + equation2 + ' \\hline a * ' + mVal + '\\;\\text{mod 26} & = ' + cVal + ' '
            mSubstitute = m2Val
            cSubstitute = c2Val
        } else {
            mVal = m2Val - m1Val
            cVal = c2Val - c1Val
            subtract1 = '\\begin{align}' + equation2 + ' - ' + equation1 + ' \\hline a * ' + mVal + '\\;\\text{mod 26} & = ' + cVal + ' '
            mSubstitute = m1Val
            cSubstitute = c1Val
        }

        solution += subtract1
        if (cVal < 0) {
            cVal += 26
            subtract2 = ' \\\\ a * ' + mVal + '\\;\\text{mod 26} & = ' + cVal + ' '
            solution += subtract2
        }
        solution += ' \\end{align}'

        // solution for a
        let message = ''
        let a = cVal / mVal
        let aRemainder = cVal % mVal
        if (a !== 0) {
            let cValOriginal = cVal
            if (aRemainder !== 0) {
                message = 'Since $' + cVal + ' \\div ' + mVal + ' = ' + (cVal / mVal).toPrecision(5) + '$ we have to find another value.'
                let count = 0

                while (aRemainder !== 0) {
                    count += 1
                    cVal += 26
                    aRemainder = cVal % mVal
                }
                a = cVal / mVal
                message += '  $' + cValOriginal + ' + (26 * ' + count + ') = ' + cVal + '$.  $' + cVal + ' \\div ' + mVal + ' = ' + a + '$'
            }
        }
        solution += (message + '<p>So we now know that $\\bbox[yellow,5px]{a = ' + a + '}$.</p>')

        // solution for b
        let findingB = 'To find $b$, substitute that back into the equation with the lowest multiplier.  '
        findingB += '\\begin{align}(' + a + ' * ' + mSubstitute + ' + b)\\;\\text{mod 26} & = ' +
            cSubstitute + '\\\\(' + (a * mSubstitute) + ' + b)\\;\\text{mod 26} & = ' + cSubstitute + '\\end{align}'
        findingB += 'Subtract $' + (a * mSubstitute) + '$ from both sides: \\begin{align}(' +
            (a * mSubstitute) + ' +b)\\;\\text{mod 26} - ' + (a * mSubstitute) + ' & = (' +
            cSubstitute + ' - ' + (a * mSubstitute) + ')\\;\\text{mod 26}\\\\'
        findingB += 'b\\;\\text{mod 26} & = ' + (cSubstitute - (a * mSubstitute)) + '\\;\\text{mod 26}\\\\'

        let b = cSubstitute - (a * mSubstitute)
        while (b < 0) {
            b += 26
        }
        findingB += 'b\\;\\text{mod 26} & = ' + b + '\\;\\text{mod 26}\\end{align}'
        findingB += 'And we see that $\\bbox[yellow,5px]{b = ' + b + '}$.  However, we only know a few of the letters in the cipher.'

        solution += findingB
        let outdiv = $("#sol")
        outdiv.empty().append($("<p>", { id: "solution" }).html(solution))
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, 'solution'])

        let l = charset.substr(this.affineCheck['p'], 1) + charset.substr(this.affineCheck['q'], 1)
        outdiv.append(this.showOutput(theMessage, l))
        if (!this.completeSolution) {
            // encode ETAOIN
            let found = this.encodeString('ETAOIN')
            solution = '<p>The first step is to encode the common letters <b>ETAOIN</b> to see what they would map to.</p>  ' +
                this.encodeLetters(a, b, 'ETAOIN') +
                '<p>Filling in the letter we found ($' + found + '$) we get a bit more of the answer.</p>'
            outdiv.append($("<div>", { id: "ETAOIN" }).html(solution))
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, 'ETAOIN'])
            l += 'ETAOIN'
            outdiv.append(this.showOutput(theMessage, l))
        }

        if (!this.completeSolution) {
            // encode SRHLD
            let found = this.encodeString('SRHLD')
            solution = '<p>Next, encode the next 5 common letters <b>SRHLD</b>.' +
                this.encodeLetters(a, b, 'SRHLD') +
                '<p>We know the reverse mapping of 5 more letters ($' + found + '$) which we can fill in.</p>'
            outdiv.append($("<div>", { id: "SRHLD" }).html(solution))
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, 'SRHLD'])
            l += 'SRHLD'
            outdiv.append(this.showOutput(theMessage, l))
        }

        if (!this.completeSolution) {
            // encode CUMFP
            let found = this.encodeString('CUMFP')
            solution = '<p>We will convert the next 5 most frequent letters <b>CUMFP</b>.' +
                this.encodeLetters(a, b, 'CUMFP') + '<p>The next 5 letters we know are ($' + found + '$), so we will fill those in.</p>'
            outdiv.append($("<div>", { id: "CUMFP" }).html(solution))
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, 'CUMFP'])
            l += 'CUMFP'
            outdiv.append(this.showOutput(theMessage, l))
        }

        if (!this.completeSolution) {
            // encode GWYBV
            let found = this.encodeString('GWYBV')
            solution = '<p>Next, encode the next 5 common letters <b>GWYBV</b>.' +
                this.encodeLetters(a, b, 'GWYBV') +
                '<p>We know the reverse mapping of 5 more letters ($' + found + '$) which we can fill in.</p>'
            outdiv.append($("<div>", { id: "GWYBV" }).html(solution))
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, 'GWYBV'])
            l += 'GWYBV'
            outdiv.append(this.showOutput(theMessage, l))
        }

        if (!this.completeSolution) {
            // encode KXJQZ
            let found = this.encodeString('KXJQZ')
            solution = '<p>We will convert the remaining 5 letters <b>KXJQZ</b>.' +
                this.encodeLetters(a, b, 'KXJQZ') + '<p>The next 5 letters we know are ($' + found + '$), so we will fill those in.</p>'
            outdiv.append($("<div>", { id: "KXJQZ" }).html(solution))
            l += 'KXJQZ'
            outdiv.append(this.showOutput(theMessage, l))
        }

        outdiv.append($("<p>").text("The solution is now complete!"))
    }
    /**
     *
     */
    attachHandlers(): void {
        super.attachHandlers()
        $("#a").off('input').on('input', (e) => {
            let newa: number = Number($(e.target).val())
            if (newa !== this.state.a) {
                this.markUndo()
                this.seta(newa, this.advancedir)
                if (newa !== this.state.a) {
                    $(e.target).val(this.state.a)
                    return false
                }
            }
            this.advancedir = 0
        })
        $("#b").off('input').on('input', (e) => {
            let newb: number = Number($(e.target).val())
            if (newb !== this.state.b) {
                this.markUndo()
                this.setb(newb)
                if (newb !== this.state.b) {
                    $(e.target).val(this.state.b)
                    return false
                }
            }
            this.advancedir = 0
        })
        $("#solve").off('click').on('click', () => {
            let msg = <string>$('#toencode').val()
            this.setEncodingTable(Number($("#a").val()), Number($("#b").val()))
            this.printSolution(msg,
                               this.charset.substr(this.affineCheck['p'], 1),
                               this.charset.substr(this.affineCheck['r'], 1),
                               this.charset.substr(this.affineCheck['q'], 1),
                               this.charset.substr(this.affineCheck['s'], 1))
        })
        $("td").off('click').on('click', (e) => {
            let charset = this.getCharset()
            let id = $(e.target).attr('id')
            // change the style
            let clickedId = this.affineCheck['olderId']
            if (clickedId !== -1) {
                // turn new click blue, reset old click for TOSOLVE
                $('td#' + clickedId + '.TOSOLVECLICK').removeClass("TOSOLVECLICK").addClass("TOSOLVE")
            }
            $('td#' + id + '.TOSOLVE').removeClass("TOSOLVE").addClass("TOSOLVECLICK")
            // turn
            this.affineCheck.q = this.affineCheck['p']
            this.affineCheck['s'] = this.affineCheck['r']
            this.affineCheck['p'] = charset.indexOf($('td#m' + id + '.TOANSWER').text())
            this.affineCheck['r'] = charset.indexOf($('td#' + id + '.TOSOLVECLICK').text())
            this.affineCheck['olderId'] = this.affineCheck['oldId']
            this.affineCheck['oldId'] = parseInt(id, 10)

            if (this.affineCheck.p !== -1 && this.affineCheck.q !== -1) {
                //solve it
                console.log('solve: ')
                let sol = this.solveIt(this.affineCheck['p'], this.affineCheck['r'],
                                       this.affineCheck.q, this.affineCheck.s)
                let expected = 'A = ' + $("#a").val() + '; B = ' + $("#b").val()
                if (sol === expected) {
                    console.log('showing button')
                    $("[id='solve']").prop('disabled', false)
                    $("[id='solve']").prop('value', 'Display Solution')
                } else {
                    console.log('hiding button')
                    $("[id='solve']").prop('disabled', true)
                    $("[id='solve']").prop('value', 'Indeterminate Solution')
                }
            }
        })
    }
    genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>")
        result.append(this.genQuestionFields())
        result.append(JTFLabeledInput("Text to encode", 'textarea', 'toencode', this.state.cipherString, "small-12 medium-12 large-12"))
        let inputbox = $("<div/>", { class: "grid-x grid-margin-x" })
        inputbox.append(JTFIncButton("A", "a", this.state.a, "small-12 medium-4 large-4"))
        inputbox.append(JTFIncButton("B", "b", this.state.b, "small-12 medium-4 large-4"))
        result.append(inputbox)
        return result
    }
    genPostCommands(): JQuery<HTMLElement> {
        return null
    }
    /**
     *
     */
    buildCustomUI(): void {
        super.buildCustomUI()
    }

    /**
     * Sets the new A value.  A direction is also provided so that if the
     * intended value is bad, we can keep advancing until we find one
     */
    seta(a: number, direction: number): void {
        let charset = this.getCharset()
        if (a !== this.state.a) {

            if (direction !== 0) {
                while (a !== this.state.a && !this.iscoprime(a)) {
                    a = (a + charset.length + direction) % charset.length
                }
            }
            if (!this.iscoprime(a)) {
                $('#err').text('A value of ' + a + ' is not coprime with ' + charset.length)
            }
            if (a > charset.length) {
                $('#err').text('A value of ' + a + ' must be smaller than ' + (charset.length + 1))

            }
        }
        this.state.a = a
    }
    setb(b: number): void {
        let charset = this.getCharset()
        b = (b + charset.length) % charset.length
        this.state.b = b
    }
    /**
     *
     */
    load(): void {
        this.state.cipherString = this.cleanString(<string>$('#toencode').val())
        console.log('a=' + this.state.a + ' b=' + this.state.b + ' encode=' + this.state.cipherString)
        let res = this.buildAffine(this.state.cipherString, this.state.a, this.state.b)
        $("#answer").empty().append(res)
        this.attachHandlers()
    }
}
