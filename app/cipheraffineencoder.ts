/// <reference types="ciphertypes" />

import CipherEncoder from "./cipherencoder"

export default
    class CipherAffineEncoder extends CipherEncoder {

    affineCheck: { [key: string]: number } = {
        'p': -1,
        'q': -1,
        'r': -1,
        's': -1,
        'oldId': -1,
        'olderId': -1
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
        let result = $('<div>');
        let msgLength = msg.length;
        let lastSplit = -1;
        let c = '';

        let table = $('<table/>').addClass("tfreq");
        let tableBody = $('<tbody/>');
        let messageRow = $('<tr/>');
        let cipherRow = $('<tr/>');

        for (i = 0; i < msgLength; i++) {
            let messageChar = msg.substr(i, 1).toUpperCase()
            let cipherChar = ''
            let m = charset.indexOf(messageChar)
            if (m >= 0) {

                message += messageChar
                cipherChar = this.affinechar(a, b, messageChar)
                cipher += cipherChar
            }
            else {
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

        return table;
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
            if (b == 0) { return a }
            a %= b
            if (a == 0) { return b }
            b %= a
        }
    }

    iscoprime(a: number): boolean {
        let charset = this.getCharset()
        console.log('iscoprime a=' + a + ' len=' + charset.length)
        let gcdval = this.gcd(a, charset.length)
        console.log('gcd(' + a + ',' + charset.length + ')=' + gcdval)
        if (gcdval != 1) {
            return false
        }
        return true
    }
    load(): void {
        let charset = this.getCharset()
        let a = $('#a').spinner("value")
        let b = $('#b').spinner("value")
        //  let a = parseInt(atxt)
        //  let b = parseInt(btxt)

        if (!this.iscoprime(a)) {
            console.log('not coprime')
            $('#err').text('A value of ' + a + ' is not coprime with ' + charset.length)
            return
        }

        let toencode = this.cleanString(<string>$('#toencode').val())
        console.log('a=' + a + ' b=' + b + ' encode=' + toencode)
        let res = this.buildAffine(toencode, a, b)
        $("#answer").empty().append(res)

        $("td").unbind('click').click((e) => {
            console.log("clicked " + $(e.currentTarget).get)
            let id = $(e.currentTarget).attr('id')
            console.log("id = " + id)
            console.log("other = " + $('td#' + id + '.TOSOLVE').text() + " nother = " + $('td#' + id + '.TOANSWER').text())
            // change the style
            let clickedId = this.affineCheck['olderId']
            if (clickedId !== -1) {
                // turn new click blue, reset old click for TOSOLVE
                $('td#' + clickedId + '.TOSOLVECLICK').removeClass("TOSOLVECLICK").addClass("TOSOLVE")
            }
            $('td#' + id + '.TOSOLVE').removeClass("TOSOLVE").addClass("TOSOLVECLICK")
            // turn 
            this.affineCheck['q'] = this.affineCheck['p']
            this.affineCheck['s'] = this.affineCheck['r']
            this.affineCheck['p'] = charset.indexOf($('td#m' + id + '.TOANSWER').text())
            this.affineCheck['r'] = charset.indexOf($('td#' + id + '.TOSOLVECLICK').text())
            this.affineCheck['olderId'] = this.affineCheck['oldId']
            this.affineCheck['oldId'] = parseInt(id)

            if (this.affineCheck.p !== -1 && this.affineCheck.q !== -1) {
                //solve it
                console.log('solve: ')
                let sol = this.solveIt(this.affineCheck['p'], this.affineCheck['r'],
                    this.affineCheck['q'], this.affineCheck['s'])
                let expected = 'A = ' + $("#a").val() + '; B = ' + $("#b").val()
                if (sol === expected) {
                    console.log('showing button')
                    $("[id='solve']").prop('disabled', false)
                    $("[id='solve']").prop('value', 'Display Solution')
                }
                else {
                    console.log('hiding button')
                    $("[id='solve']").prop('disabled', true)
                    $("[id='solve']").prop('value', 'Indeterminate Solution')
                }
                //$("#solve").text(sol);
            }
        })
    }
}
