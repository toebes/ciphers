/// <reference types="ciphertypes" />

import { CipherSolver } from "./ciphersolver"
export class CipherCheckerboardSolver extends CipherSolver {

    rowcharset: string = ""
    colcharset: string = ""

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Checkerboard Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    init(): void {
        this.cipherWidth = 2
        this.rowcharset = "     "
        this.colcharset = "     "
    }

    setrowcolset(rowcharset: string, colcharset: string, forceorder: boolean): void {
        let changed = false

        rowcharset = rowcharset.toUpperCase()
        colcharset = colcharset.toUpperCase()

        this.rowcharset = this.rowcharset.trim()
        this.colcharset = this.colcharset.trim()

        if (rowcharset !== this.rowcharset) {
            if (forceorder) {
                changed = true
                this.rowcharset = rowcharset
            } else {
                for (let c of rowcharset) {
                    if (this.rowcharset.indexOf(c) < 0) {
                        this.rowcharset += c
                        changed = true
                    }
                }
            }
        }

        if (colcharset !== this.colcharset) {
            if (forceorder) {
                changed = true
                this.colcharset = colcharset
            } else {
                for (let c of colcharset) {
                    if (this.colcharset.indexOf(c) < 0) {
                        this.colcharset += c
                        changed = true
                    }
                }
            }
        }

        if (this.rowcharset.length < 5) {
            this.rowcharset += "     ".substr(0, 5 - this.rowcharset.length)
        }
        if (this.colcharset.length < 5) {
            this.colcharset += "     ".substr(0, 5 - this.colcharset.length)
        }

        if (changed) {
            this.UpdateFreqEditTable()
            this.load()
        }
    }
    build(str: string): JQuery<HTMLElement> {
        let res = ""
        let combinedtext = ""
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>'
        let posthead = '</tr></tbody></table></div>'
        let pre = prehead
        let firstchar = ''
        let firstset = ''
        let secondset = ''
        let docwidth = $(document).width()
        //docwidth = 9 * 24 * cipherwidth
        let width = Math.floor(docwidth / 24)
        let remaining = width
        let charset = this.getCharset().toUpperCase()
        this.freq = {}

        for (let i = 0, len = str.length; i < len; i++) {
            let t = str.substr(i, 1).toUpperCase()
            if (this.isValidChar(t)) {
                if (firstchar === '') {
                    firstchar = t
                    if (firstset.indexOf(t) < 0) {
                        firstset += t
                    }
                    t = ''
                } else {
                    let piece = firstchar + t
                    if (secondset.indexOf(t) < 0) {
                        secondset += t
                    }
                    if (isNaN(this.freq[piece])) {
                        this.freq[piece] = 0
                    }
                    this.freq[piece]++

                    combinedtext += '<span data-char="' + piece + '">?</span>'
                    t = pre + '<td><div class="slil">' + firstchar + '<br/>' + t + '</div>' +
                        '<input type="text" id="ti' + piece + '" class="sli" data-char="' + piece + '" /></td>'

                    pre = ''
                    remaining--
                    firstchar = ''
                }
            } else if (t !== ' ' && t !== '\n' && t !== '\r') {
                combinedtext += t
                t = pre + '<td><div class="slil">' + t + '</div></td>'
                pre = ''
            }
            res += t
            if (remaining === 0) {
                res += posthead
                pre = prehead
                remaining = width
            }
        }
        if (pre === '') {
            res += posthead
        }
        res += '<div class="ssum">' + combinedtext + '</div>'
        // We need to retain any existing character set order
        this.setrowcolset(firstset, secondset, false)
        return $(res)
    }
    /*
    * Creates an HTML table to display the frequency of characters
    */
    createFreqEditTable(): JQuery<HTMLElement> {
        let topdiv = $('<div/>')
        let inputdiv = $('<div/>', { class: "idiv" })
        let table = $('<table/>').addClass("ckfreq")
        let thead = $('<thead/>')
        let tbody = $('<tbody/>')
        let headrow = $('<tr/>')
        let row, rowlen, col, collen
        rowlen = this.rowcharset.length
        collen = this.colcharset.length
        // console.log('createCheckerboardFreqEditTable: rowcharset=' + this.rowcharset + ' colcharset=' + this.colcharset)
        headrow.append($('<th/>').addClass("topleft"))
        for (col = 0; col < collen; col++) {
            headrow.append($('<th/>').text(this.colcharset.substr(col, 1).toUpperCase()))
        }
        thead.append(headrow)

        inputdiv.append($('<label/>', { for: "rowcharset", text: "Row Characters" }))
        inputdiv.append($('<input/>', { type: "text", class: "csc", id: "rowcharset", value: this.rowcharset }))
        inputdiv.append($('<label/>', { for: "colcharset", text: "Column Characters" }))
        inputdiv.append($('<input/>', { type: "text", class: "csc", id: "colcharset", value: this.colcharset }))
        topdiv.append(inputdiv)

        for (row = 0; row < rowlen; row++) {
            let replrow = $('<tr/>')
            let rowc = this.rowcharset.substr(row, 1).toUpperCase()
            replrow.append($('<th/>').text(rowc))
            for (col = 0; col < collen; col++) {
                let colc = this.colcharset.substr(col, 1).toUpperCase()
                let piece = rowc + colc
                let freq: string = String(this.freq[piece])
                let td, input
                if (typeof freq === 'undefined') {
                    freq = ''
                }
                td = $('<td/>').text(freq)
                td.append($('</br>'))
                td.append(this.makeFreqEditField(piece))
                replrow.append(td)
            }
            tbody.append(replrow)
        }
        table.append(thead)
        table.append(tbody)
        topdiv.append(table)

        return topdiv
    }
    load(): void {
        let encoded = this.cleanString(this.state.cipherString)
        let res = this.build(encoded)
        $("#answer").empty().append(res)
        $("#analysis").each((i, elem) => {
            $(elem).empty().append(this.analyze(encoded))
        })

        // Show the update frequency values
        this.UpdateFreqEditTable()
        this.displayFreq()
        // We need to attach handlers for any newly created input fields
        this.attachHandlers()
    }
    findPossible(str: string): void {
        let encoded = this.minimizeString(this.state.cipherString)
        let extra = ''
        let res = ''
        let i
        str = str.toUpperCase()
        //
        // Look for all possible matches for the pattern.
        res = this.searchPattern(encoded, this.cipherWidth, str, 1)
        if (res === '') {
            res = '<br/><b>Not Found</b>'
        } else {
            let charset = this.getCharset()
            let tres = '<table class="mfind"><thead><tr><th>Pos</th><th>Match</th>'
            for (i = 0; i < charset.length; i++) {
                let key = charset.substr(i, 1)
                tres += '<th>' + key + '</th>'
            }
            res = tres + '</tr></thead><tbody>' + res + '</tbody></table>'
        }

        $(".findres").html('Searching for ' + str + ' as ' + this.normalizeHTML(str) + res)
    }

    attachHandlers(): void {
        $("#rowcharset").off('change').on('change', (e) => {
            this.setrowcolset((<HTMLInputElement>e.target).value, this.colcharset, true)
        })
        $("#colcharset").off('change').on('change', (e) => {
            this.setrowcolset(this.rowcharset, (<HTMLInputElement>e.target).value, true)
        })
        super.attachHandlers()
    }
    updateSel(): void {
        this.UpdateFreqEditTable()
    }
}
