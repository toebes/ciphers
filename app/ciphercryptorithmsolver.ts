/// <reference types="ciphertypes" />

enum CryptorithmType {
    Automatic,
    SquareRoot,
    CubeRoot,
    Multiplication,
    Division,
    Addition,
    Subtraction,
    Equations,
}

class CryptorithmSolver extends CipherSolver {
    usedletters: BoolMap = {}
    base: number
    cryptorithmType: CryptorithmType = CryptorithmType.Automatic
    /**
     * The base value of the operation (addition, subtraction, multiplication)
     * or the root value
     */
    baseValue: string
    /**
     * The representative string of the root yy (i.e. xxx gives root yy)
     */
    rootValue: string
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    load(): void {
        var encoded: string = this.cleanString(<string>$('#encoded').val());
        let res = this.build(encoded);
        var tool = this
        this.UpdateFreqEditTable()

        $("#answer").empty().append(res);
        $("#analysis").each(function (i) {
            $(this).empty().append(tool.analyze(encoded));
        });
        let pos = 0
        let charset = this.getCharset()
        for (let c in this.usedletters) {
            let repl = charset.substr(pos, 1)
            pos++
            this.setChar(c, repl)
        }
        // Show the update frequency values
        this.displayFreq()
        // We need to attach handlers for any newly created input fields
        this.attachHandlers()
    }
    /**
     * Loads new data into a solver, resetting any solving matches made
     */
    reset(): void {
        this.load();
    }
    /**
     * Analyze the encoded text
     * @param {string} encoded
     * @param {number} width
     * @param {number} num
     */
    analyze(encoded: string): JQuery<HTMLElement> {
        return null
    }

    /**
     * Fills in the frequency portion of the frequency table
     */
    displayFreq(): void {
        let charset = this.getCharset();
        let c, i, len;
        this.holdupdates = true;
        // Replicate all of the previously set values.  This is done when
        // you change the spacing in the encoded text and then do a reload.
        for (let c in this.usedletters) {
            let repl: string = <string>$('#m' + c).val();
            if (repl === '') { repl = $('#m' + c).html(); }
            this.setChar(c, repl);
        }


        this.holdupdates = false;
        this.updateMatchDropdowns('');
    }
    /**
     * Builds the GUI for the solver
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    build(str: string): JQuery<HTMLElement> {
        enum buildState {
            Initial = "Initial",
            WantRoot = "Want Root value",
            WantEqual = "Want = value",
            WantMinus = "Want - value",
            WantMult = "Want * value",
            WantDiv = "Want / value",
            WantPlus = "Want + value",
            WantQuotient = "Want Quotient",
            Root = "Root",
            Idle = "Idle"
        }
        interface lineitem {
            prefix: string
            indent: number
            content: string
            class: string
            formula:string
            expected:string
        }
        this.cryptorithmType = CryptorithmType.Automatic
        this.usedletters = {}
        let lineitems: Array<lineitem> = []
        str = str.replace(new RegExp("[\r\n ]+", "g"), " ")
        // Apparently there are two forms of dashes...
        //        str = str.replace(new RegExp("–", "g"), "-")
        str = str.replace(new RegExp("gives root", "g"), "^")
        let tokens = str.split(/ *([;-=+ \/\*\.\-\–]) */g)
        let maindiv = $("<div>")
        let state: buildState = buildState.Initial
        let indent: number = 0
        let numwidth: number = 1
        let maxwidth: number = 0
        let prefix: string = ''
        let divwidth: number = 0
        let dividend: string = ""
        let divisor: string = ""
        let quotient: string = ""
        let formula: string = ""
        let expected: string = ""
        let lastval:string = ""
        let lastbase:string = ""
        let root:string = ""
        let rootbase:string = ""
    
        for (let token of tokens) {
            console.log('Working on ' + token)
            switch (token) {
                case '':
                case ' ':
                    break

                // Square root (this was originally "gives root" in the crytprithm)
                case '^':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix)
                    }
                    if (this.cryptorithmType === CryptorithmType.Automatic) {
                        this.cryptorithmType = CryptorithmType.SquareRoot
                    }
                    prefix = token
                    state = buildState.WantRoot
                    break

                // End of an equation (and potentially the start of another)
                case '.':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix)
                    }
                    // Put in a blank line
                    lineitems.push({ prefix: '', indent: 0, content: "", class: "", formula: "", expected:"" })
                    prefix = ''
                    state = buildState.Initial
                    break

                // End of an operation group (generally after an = value)
                case ';':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix)
                    }
                    prefix = ''
                    state = buildState.Idle
                    break

                case '-': case '–':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix)
                    }
                    if (this.cryptorithmType === CryptorithmType.Division){
                        let mult = quotient.substr(quotient.length-(indent+1),1)
                        formula = mult+"*"+divisor
                        expected = token
                        lastbase = lastval
                    } else if (this.cryptorithmType === CryptorithmType.SquareRoot) {
                        let part = root.substr(0,root.length-indent)
                        let double = part.substr(0,part.length-1)
                        let squared = part.substr(part.length-1,1)
                        if (double !== '') {
                            formula = "(("+double+"*20)+"+squared+")*"+squared 
                        } else {
                            formula = squared + "*" + squared
                        }
                        lastbase = lastval
                    }
                    prefix = token
                    state = buildState.WantMinus
                    break

                case '*':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix)
                    }
                    prefix = token
                    state = buildState.WantMult
                    if (this.cryptorithmType === CryptorithmType.Automatic) {
                        this.cryptorithmType = CryptorithmType.Multiplication
                    }
                    break

                case '+':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix)
                    }
                    prefix = token
                    state = buildState.WantPlus
                    if (this.cryptorithmType === CryptorithmType.Automatic) {
                        this.cryptorithmType = CryptorithmType.Addition
                    }
                    if (this.cryptorithmType === CryptorithmType.Addition) {
                        if (indent > 0) {
                            indent--
                        }
                    } else if (this.cryptorithmType === CryptorithmType.Multiplication) {
                        indent++
                    }
                    break

                case '/':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix)
                    }
                    this.cryptorithmType = CryptorithmType.Division
                    prefix = token
                    state = buildState.WantDiv
                    break

                // Result of an operation (add/subtract/mult/divide)
                case '=':
                    if (state !== buildState.Idle && state !== buildState.WantQuotient) {
                        console.log('Found token:' + token + ' when already processing ' + prefix)
                    }
                    prefix = token
                    if (state !== buildState.WantQuotient) {
                        state = buildState.WantEqual
                    }
                    if (this.cryptorithmType === CryptorithmType.Division && state !== buildState.WantQuotient) {
                        formula = lastbase + "-" + lastval
                        if (indent > 0) {
                            formula = "10*("+formula+")+"+dividend.substr(dividend.length-indent,1)
                        }
                    } else if (this.cryptorithmType === CryptorithmType.SquareRoot){
                        formula = lastbase + '-' + lastval 
                        if (indent > 0) {
                           formula = "("+formula + ")*100+" + rootbase.substr(rootbase.length-(indent*2),2)
                        }
                    }
                    if (this.cryptorithmType === CryptorithmType.CubeRoot ||
                        this.cryptorithmType === CryptorithmType.SquareRoot ||
                        this.cryptorithmType === CryptorithmType.Division) {
                        if (indent > 0) {
                            indent--
                        }
                    } else if (this.cryptorithmType === CryptorithmType.Multiplication) {
                        indent = 0
                    }
                    break

                default:
                    if (state === buildState.Idle) {
                        console.log('Missing prefix string to process token:' + token)
                    }
                    let item: lineitem = { prefix: prefix, indent: indent, content: "", class: "", formula:formula, expected: token }
                    lastval = token
                    formula = ''
                    let isRoot: boolean = false
                    let rootLen: number = 0
                    let content = ''
                    // We need to parse out the number and collect all the digits
                    // if it has ' in it then we are going to be doing either a square or a cube root
                    // based on how many letters are grouped
                    for (let c of token) {
                        if (c === '\'') {
                            if (prefix != '') {
                                console.log('Found quotes on other than the first token')
                            }
                            isRoot = true
                            indent++
                            if (this.cryptorithmType === CryptorithmType.Automatic) {
                                if (rootLen === 2) {
                                    this.cryptorithmType = CryptorithmType.SquareRoot
                                } else if (rootLen === 3) {
                                    this.cryptorithmType = CryptorithmType.CubeRoot
                                } else {
                                    console.log("Bad quote location at " + rootLen)
                                }
                            }
                            if (this.cryptorithmType === CryptorithmType.SquareRoot) {
                                item.prefix = "2"
                                numwidth = 2
                                item.class = "ovl"
                            } else if (this.cryptorithmType === CryptorithmType.CubeRoot) {
                                item.prefix = "3"
                                numwidth = 3
                                item.class = "ovl"
                            }
                            rootLen = 0
                        } else {
                            if (c.toLocaleLowerCase != c.toUpperCase) {
                                this.usedletters[c] = true
                            }
                            content += c
                            rootLen++
                        }
                        // td.appendTo(tr)
                    }

                    // See if we ended up with a Cuberoot
                    if (isRoot && rootLen === 3) {
                        this.cryptorithmType = CryptorithmType.CubeRoot
                        item.prefix = "3"
                        numwidth = 3
                    }
                    // See if we need to format the number into place
                    let padding = ''
                    for (let pad = 0; pad < numwidth * item.indent; pad++) {
                        padding += ' ';
                    }
                    item.indent = indent * numwidth
                    switch (this.cryptorithmType) {
                        case CryptorithmType.SquareRoot: {
                            if (item.prefix === '^') {
                                // We need to split the characters into each character
                                // and put two spaces between
                                item.prefix = ''
                                item.content = content.split('').join('  ')
                                root = content
                                let tempitem = lineitems.pop()
                                lineitems.push(item)
                                item = tempitem
                                rootbase = item.content.replace(new RegExp(" ", "g"),"")
                                lastval = rootbase.substr(0,2)
                            } else {
                                // We want to start at the end and put an extra
                                // space between every second character
                                let temp = ' ' + content + padding
                                item.content = ''
                                for (let i = temp.length - numwidth; i >= 0; i -= numwidth) {
                                    let toadd = temp.substr(i, numwidth)
                                    if (item.content != '') {
                                        item.content = toadd + ' ' + item.content
                                    } else {
                                        item.content = toadd
                                    }
                                }
                            }
                            state = buildState.Idle
                            break
                        }
                        case CryptorithmType.CubeRoot: {
                            if (item.prefix === '^') {
                                // Put three spaces between every character
                                item.prefix = ''
                                item.content = content.split('').join('   ')
                                root = content
                                let tempitem = lineitems.pop()
                                lineitems.push(item)
                                item = tempitem
                                rootbase = item.content
                            } else {
                                // We want to start at the end and put an extra
                                // space between every third character
                                let temp = '  ' + content + padding
                                item.content = ''
                                for (let i = temp.length - numwidth; i >= 0; i -= numwidth) {
                                    let toadd = temp.substr(i, numwidth)
                                    if (item.content != '') {
                                        item.content = toadd + ' ' + item.content
                                    } else {
                                        item.content = toadd
                                    }
                                }
                            }
                            state = buildState.Idle
                            break
                        }
                        case CryptorithmType.Division: {
                            // When dealing with the divisor, we put it to the left of the dividend
                            if (item.prefix === '/') {
                                item = lineitems.pop()
                                divwidth = item.content.length
                                dividend = item.content 
                                divisor = content
                                item.content = content + ')' + item.content
                                state = buildState.WantQuotient
                            } else {
                                item.content = content + padding
                                if (state === buildState.WantQuotient) {
                                    quotient = content
                                    let tempitem = lineitems.pop()
                                    item.prefix = ''
                                    lineitems.push(item)
                                    item = tempitem
                                    indent = content.length - 1
                                    lastval = dividend.substr(0,dividend.length-indent)
                                }
                                state = buildState.Idle
                            }
                            break
                        }
                        default: {
                            // No need to do anything, we are happy with the
                            // content and the padding
                            state = buildState.Idle
                            item.content = content + padding
                            break
                        }
                    }
                    if (item.prefix === '=') {
                        item.prefix = ''
                        item.class = "ovl"
                    }

                    lineitems.push(item)
                    if (item.content.length > maxwidth) {
                        maxwidth = item.content.length
                    }
                    prefix = ''
                    break
            }

        }
        this.base = Object.keys(this.usedletters).length
        let charset = ""
        for (let index = 0; index < this.base; index++) {
            let c = index.toString(36)
            charset += c
        }
        this.setCharset(charset)

        // We have built the lineitems array, now we just need to turn it into
        // a table (respecting the maxwidth)
        let table = $("<table>", { class: "cmath" })
        let tbody = $("<tbody>")
        for (let item of lineitems) {
            let tr = $("<tr>")
            // Pad on the left with as many columns as we need
            if (item.content.length < maxwidth) {
                $("<td>", { colspan: maxwidth - item.content.length }).appendTo(tr)
            }
            let td: JQuery<HTMLElement> = null
            let addclass = item.class
            switch (item.prefix) {
                case '2': {
                    td = $("<td>").html("&radic;").addClass("math") // √ - SQUARE ROOT
                    addclass = ''
                    break
                }
                case '3': {
                    td = $("<td>").html("&#8731;").addClass("math") // ∛ - CUBE ROOT
                    addclass = ''
                    break
                }
                case '4': {
                    td = $("<td>").html("&#8732;").addClass("math") // ∜ - FOURTH ROOT
                    addclass = ''
                    break
                }
                default: {
                    td = $("<td>").text(item.prefix) //.addClass("math")
                    break
                }
            }
            if (addclass) {
                td.addClass(addclass)
            }
            td.appendTo(tr)
            addclass = item.class
            if (item.content === '') {
                $("<td>").html("&nbsp;").appendTo(tr)
            } else {
                for (let c of item.content) {
                    td = $("<td>")
                    $("<div>", { class: "slil" }).text(c).appendTo(td)
                    if (c === ')') {
                        td.addClass("math")
                        addclass = "ovl"
                    } else if (this.usedletters[c]) {
                        $('<input/>', { type: "text", class: "sli", 'data-char': c }).appendTo(td)
                    }
                    if (addclass) {
                        td.addClass(addclass)
                    }
                    td.appendTo(tr)
                }
            }
            let formula = ''
            if (item.formula !== '') {
                formula += "["+item.formula+"="+item.expected+"]"
            }
            $("<td>", { class: "solv" }).text(formula).appendTo(tr)
            tr.appendTo(tbody);
        }

        tbody.appendTo(table)

        return table
    }
    /** 
     * Creates an HTML table to display the frequency of charactersF
     * @returns {JQuery<HTMLElement} HTML to put into a DOM element
     */
    createFreqEditTable(): JQuery<HTMLElement> {

        if (this.base === undefined || this.base < 1) {
            return null
        }
        let table3 = $("<table>", { class: "tfreq" })
        let tbody3 = $("<tbody>")
        let thead = $("<thead>")

        let tr = $("<tr>")
        $("<td>", { colspan: 2 }).text("Base " + String(this.base)).appendTo(tr)
        for (let index = 0; index < this.base; index++) {
            $("<th>").text(index.toString(36)).appendTo(tr)
        }
        tr.appendTo(thead)
        thead.appendTo(table3)
        let pos = 0

        // Now we want to build the solving table
        for (let c in this.usedletters) {
            let tr = $("<tr>")
            let th = $("<th>")
            $("<div>", { class: "slil" }).text(c).appendTo(th)
            th.appendTo(tr)
            let td = $("<td>")
            this.makeFreqEditField(c).appendTo(td)
            td.appendTo(tr)
            for (let index = 0; index < this.base; index++) {
                $("<td>").text("x").addClass("rtoggle").appendTo(tr)
            }
            tr.appendTo(tbody3)
        }
        tbody3.appendTo(table3)
        return table3
    }
}