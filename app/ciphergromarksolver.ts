/// <reference types="ciphertypes" />

import { CipherSolver } from "./ciphersolver"
export class CipherGromarkSolver extends CipherSolver {
    gromarkRepl: StringMap
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Gromark Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /**
     *
     */
    init(): void {
        this.cipherWidth = 2
    }
    /**
     *
     * @param {string} str Input string to parse and generate the solver
     */
    build(str: string): JQuery<HTMLElement> {
        let res = ""
        let combinedtext = ""
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>'
        let posthead1 = '</tr></tbody></table><div class="repl" data-chars="'
        let posthead2 = '"></div></div>'
        let pre = prehead
        let c, piece, datachars
        let offsets = []
        let offpos = 0
        let docwidth = $(document).width()
        this.freq = {}
        this.encodedString = ''

        // Make sure all white space is just a space
        str = str.replace(/\s+/g, ' ')
        // Get the leading digits
        for (let i = 0, len = str.length; i < len; i++) {
            c = str.substr(i, 1)
            if (c !== ' ') {
                if (!isNaN(c)) {
                    offsets[offpos++] = parseInt(c, 10)
                } else {
                    return $('<div class="error">Gromark must start with 5 numeric digits - found ' + c + '</div>')
                }
            }
            if (offpos >= 5) {
                str = str.substr(i, len - 1)
                break
            }
        }
        // Now we pull the single check digit off the end
        for (let i = str.length - 1; i > 0; i--) {
            c = str.substr(i, 1)
            if (c !== ' ') {
                if (!isNaN(c)) {
                    str = str.substr(1, i - 1)
                    break
                }
                return $('<div class="error">Gromark must end with single numeric check digit - found ' + c + '</div>')
            }
        }
        // Eliminate any leading and trailing white space to make it easier to work with
        str = str.replace(/^\s+|\s+$/g, "")
        offpos = -1
        datachars = ''
        this.encodedString = ''

        // Now go through and get all the characters
        for (let i = 0, len = str.length; i < len; i++) {
            c = str.substr(i, 1).toUpperCase()
            if (this.isValidChar(c)) {
                offpos++
                // Compute the running offset
                if (offpos >= 5) {
                    offsets[offpos] = (offsets[offpos - 5] + offsets[offpos - 4]) % 10
                }
                piece = c + offsets[offpos]
                this.encodedString += piece
                datachars += piece
                // Remember the frequencies for the single character and the group
                if (isNaN(this.freq[piece])) {
                    this.freq[piece] = 0
                }
                this.freq[piece]++
                if (isNaN(this.freq[c])) {
                    this.freq[c] = 0
                }
                this.freq[c]++
                combinedtext += '<span data-char="' + piece + '">?</span>'
                c = pre + '<td><div class="slil">' + c + '<br/>' + offsets[offpos] + '</div>' +
                    '<input type="text" id="ti' + piece + '" class="sli" data-schar="' + c + '" data-char="' + piece + '" /></td>'

                pre = ''
            } else if (c !== ' ') {
                combinedtext += c
                c = pre + '<td><div class="slil">' + c + '</div></td>'
                pre = ''
            } else {
                combinedtext += ' '
                res += posthead1 + datachars + posthead2
                datachars = ''
                pre = prehead
            }
            res += c
        }
        if (pre === '') {
            res += posthead1 + datachars + posthead2
        }
        res += '<div class="ssum">' + combinedtext + '</div>'
        return $(res)
    }
    /**
     * Creates the Frequency Table for a Gromark
     */
    createFreqEditTable(): JQuery<HTMLElement> {
        let topdiv = $('<div/>')
        let table = $('<table/>').addClass("tfreq")
        let thead = $('<thead/>')
        let tbody = $('<tbody/>')
        let headrow = $('<tr/>')
        let freqrow
        let replrow = $('<tr/>')
        let n, c
        let charset = this.getCharset()

        headrow.append($('<th/>').addClass("topleft"))
        for (n = 0; n <= 9; n++) {
            freqrow = $('<tr/>')
            freqrow.append($('<th/>').text(n))
            for (let i = 0, len = charset.length; i < len; i++) {
                c = charset.substr(i, 1).toUpperCase()
                if (n === 0) {
                    headrow.append($('<th/>').text(c))
                }
                freqrow.append($('<td id="f' + c + n + '"/>'))
            }
            if (n === 0) {
                thead.append(headrow)
            }
            thead.append(freqrow)
        }

        headrow = $('<tr/>')
        headrow.append($('<th/>').addClass("topleft"))
        freqrow = $('<tr/>')
        freqrow.append($('<th/>').text("Frequency"))
        replrow.append($('<th/>').text("Replacement"))
        for (let i = 0, len = charset.length; i < len; i++) {
            c = charset.substr(i, 1).toUpperCase()
            headrow.append($('<th/>').text(c))
            freqrow.append($('<td id="f' + c + '"/>'))
            let td = $('<td/>')
            td.append(this.makeFreqEditField(c))
            replrow.append(td)
        }
        thead.append(headrow)
        tbody.append(freqrow)
        tbody.append(replrow)
        table.append(thead)
        table.append(tbody)
        topdiv.append(table)

        return topdiv
    }
    /**
     * Change the encrypted character
     * @param {any} repchar Encrypted character to map against
     * @param {any} newchar New char to assign as decoding for the character
     */
    setChar(repchar: string, newchar: string): void {
        if (typeof newchar === 'undefined') {
            return
        }
        let charset = this.getSourceCharset()

        // If we came in with something like J5 instead of J, it means that they have typed
        // into the replacement section
        // For example if we type the letter 'U' into V3 slot, should actually act as if they had typed a 'V' into the 'X' slot.
        //  Hence repchar="V3", newchar="U" needs to switch to be repchar="X" newchar="V"
        // We compute this by Taking the offset for the U and adding 3 getting to the X and we use the V for the replacement.
        if (repchar.length > 1) {
            let targetc = newchar // U in example
            newchar = repchar.substr(0, 1);  // V in example
            let roff = parseInt(repchar.substr(1, 1), 10);  // 3 in example
            repchar = (charset + charset).substr(charset.indexOf(targetc) + roff, 1)
            // Type A U into V3 should fill a V into the X slot.
        }
        newchar = newchar.toUpperCase()
        let dispchar = newchar
        let fillchar = newchar
        let pos = charset.indexOf(repchar)

        if (dispchar === '') {
            dispchar = '?'
            fillchar = this.replacement[repchar]; // the last character that was in this spot
        }
        this.replacement[repchar] = newchar
        //console.log('Gromark setChar repchar=' + repchar + ' newchar=' + newchar + ' pos=' + pos + ' charset=' + charset)
        if (pos >= 0) {
            // Handle wrapping around by simply doubling the character set
            pos += charset.length
            charset += charset

            // First update the single letter instance
            $("input[data-char='" + repchar + "']").val(newchar)
            $('#f' + repchar).text(dispchar)

            // And we need to update all the offset ones to match
            for (let i = 0; i <= 9; i++) {
                let repl = ''
                if (newchar !== '') {
                    repl = charset.substr(pos - i, 1)
                }
                dispchar = repl
                if (dispchar === '') {
                    dispchar = '?'
                }
                let piece = fillchar + i
                $("input[data-char='" + piece + "']").val(repl)
                $("span[data-char='" + piece + "']").text(dispchar)
            }
            this.updateMatchDropdowns(repchar)
        }
    }
    /**
     * @param {string} reqstr String of items to apply
     */
    setMultiChars(reqstr: string): void {
        //console.log('Gromark setMultiChars ' + reqstr)
        this.holdupdates = true
        for (let i = 0, len = reqstr.length / 2; i < len; i++) {
            let repchar = reqstr.substr(i * 2, 1)
            let newchar = reqstr.substr(i * 2 + 1, 1)
            this.setChar(repchar, newchar)
        }
        this.holdupdates = false
        this.updateMatchDropdowns('')
    }

    /*
     * Sorter to compare two string pattern entries
     */
    gmsort(a: any, b: any): number {
        if (a.o < b.o) {
            return -1
        } else if (a.o > b.o) {
            return 1
        }
        return 0
    }
    /**
     * @param {string} str String to generate a match down for
     * @returns {string} Html for a select
     */
    generateGromarkDropdown(str: string): JQuery<HTMLElement> {
        if (this.state.curlang === '') {
            return $('')
        }
        let matchstr = ''
        let keepadding = true
        let repl = []
        let matches = []
        let used: BoolMap = {}
        let slen = str.length / this.cipherWidth
        // First we need to find a pattern for the replacement that we can work with

        for (let i = 0; i < slen; i++) {
            let piece = str.substr(i * this.cipherWidth, this.cipherWidth)
            let substitute = ''
            if (typeof this.gromarkRepl[piece] === 'undefined') {
                keepadding = false
            } else {
                substitute = this.gromarkRepl[piece]
            }
            if (keepadding) {
                matchstr += substitute
            }
            repl.push(substitute)
        }
        let pat = this.makeUniquePattern(matchstr, this.cipherWidth)
        let patlen = pat.length
        //  console.log('Searching for ' + pat + ' len=' + patlen + ' based on ' + matchstr + ' slen=' + slen)
        //  console.log(repl)

        for (let tpat in this.Frequent[this.state.curlang]) {
            if (this.Frequent[this.state.curlang].hasOwnProperty(tpat) && tpat.length === slen && tpat.substr(0, patlen) === pat) {
                let tmatches = this.Frequent[this.state.curlang][tpat]
                let added = 0
                for (let i = 0, len = tmatches.length; i < len; i++) {
                    let entry = tmatches[i]
                    if (this.isValidReplacement(entry[0], repl, used)) {
                        matches.push(entry)
                        added++
                        if (added > 3) {
                            break
                        }
                    }
                }
            }
        }
        // We have stacked all of the found matches.  Now we need to sort them
        matches.sort(this.gmsort)

        let mselect = $('<select/>').addClass('match')
        if (matches.length > 0) {
            let selectclass = ''
            let matched = false
            let added = 0

            for (let i = 0, len = matches.length; i < len; i++) {
                let entry = matches[i]
                if (this.isValidReplacement(entry.t, repl, used)) {
                    if (!matched) {
                        selectclass = entry.c
                    }
                    matched = true
                    added++
                    $('<option/>').addClass(entry.c).text(entry.t).appendTo(mselect)
                }
                if (matched && added > 9) {
                    break
                }
            }
            if (added === 0) {
                selectclass = 'nopat'
            }
            mselect.addClass(selectclass)
        } else {
            mselect.addClass('nopat')
        }
        return mselect
    }
    /**
     * @param {string} repchar Replacement character to limit updates to
     */
    updateMatchDropdowns(repchar: string): void {
        if (this.holdupdates) {
            return
        }
        this.UpdateReverseReplacements()
        this.saveGromarkReplacements()
        $("[data-chars]").each((i, elem) => {
            $(elem).empty().append(this.generateGromarkDropdown($(elem).attr('data-chars')))
        })
    }

    /**
     * Build a set of replacements so that we can quickly check against them
     */
    saveGromarkReplacements(): void {
        this.gromarkRepl = {}
        let i, n, len, charset
        // Get the replacement character set and double it so that we can index past the beginning and wrap around to get the set again
        charset = this.getSourceCharset()
        len = charset.length
        charset += charset
        // Iterate through all of our characters
        for (i = 0; i < len; i++) {
            let c = charset.substr(i, 1)
            let repl = this.replacement[c]
            // See if we have a replacement for it.
            if (this.isValidChar(repl)) {
                // if we do have a replacement, we want to figure out what the corresponding characters map
                // to and then update that replacement table.
                for (n = 0; n <= 9; n++) {
                    let decodc = charset.substr(len + i - n, 1)
                    this.gromarkRepl[repl + n] = decodc
                }
            }
        }
    }

    /**
     * @param {string} str String to match against
     * @param {string} gromark Gromark (of cipherWidth characters) to compute.
     * @return {Array.string} Array of mapping strings for each character
     */
    makeGromarkMap(str: string, gromark: string): StringMap {
        let charset = this.getSourceCharset()
        let res: StringMap = {}
        // Empty out the result so it can be readily used
        for (let c of charset) {
            res[c] = ''
        }
        // Double the character set so we can get the wrapping for free
        charset += charset
        for (let i = 0, len = str.length; i < len; i++) {
            let c = str.substr(i, 1)
            let piece = gromark.substr(i * this.cipherWidth, this.cipherWidth)
            // Let's compute the value for the letter plus the offset
            let offset = charset.indexOf(c) + parseInt(piece.substr(1, 1), 10)
            let repl = piece.substr(0, 1)
            res[charset.substr(offset, 1)] = repl
        }
        // console.log('makeGromarkMap str=' + str + ' gromark=' + gromark)
        // console.log(res)
        return res
    }
    /**
     * @param {string} tomatch String to match against
     * @param {string} gromark Gromark (of cipherWidth characters) to check.
     * @return {number} Indicates qualify of Gromark match. 0= inconsistent, 1=possible, 2=confirmed
     */
    checkGromark(tomatch: string, gromark: string): number {
        if (tomatch.length * this.cipherWidth !== gromark.length) {
            console.log('Invalid check comparing "' + tomatch +
                         '"(' + tomatch.length + ') against "' + gromark + '"(' + gromark.length + ')')
            return 0
        }
        let i, len
        let charset = this.getSourceCharset()
        let sets = {}
        let matchlevel = 1
        for (i = 0; i < tomatch.length; i++) {
            let c = tomatch.substr(i, 1)
            let piece = gromark.substr(i * this.cipherWidth, this.cipherWidth)
            // See if we already know that this letter actually maps to something.
            if (typeof this.gromarkRepl[piece] !== 'undefined') {
                // This is already known to map to a letter.  Let's make sure we match the corresponding character
                if (this.gromarkRepl[piece] !== c) {
                    //console.log('Failed to match c=' + c + ' vs known[' + piece + ']=' + this.gromarkRepl[piece])
                    return 0
                }
            }
            // We don't map, so let's compute the value for the letter plus the offset
            let offset = parseInt(piece.substr(1, 1), 10)
            let repl = piece.substr(0, 1)
            //console.log('Piece='+piece+' Repl=' + repl + ' offset=' + offset + ' delta='+charset.indexOf(c))
            offset += charset.indexOf(c)
            if (typeof sets[offset] !== 'undefined') {
                if (sets[offset] !== repl) {
                    //console.log('Already found another sets[' + offset + ']=' + sets[offset] + ' vs ' + repl)
                    return 0
                }
                matchlevel = 2
            }
            if (typeof sets[repl] !== 'undefined') {
                if (sets[repl] !== offset) {
                    // console.log('Already found another sets[' + repl + ']=' + sets[repl] + ' vs ' + offset)
                    return 0
                }
                matchlevel = 2
            }
            sets[repl] = offset
            sets[offset] = repl
        }
        return matchlevel
    }
    /**
     * @param {string} str String to search for.  Note that this runs through all the entries looking for a possible match
     */
    findGromark(str: string): void {
        let tosearch = this.minimizeString(str)
        let gromarklen = tosearch.length * this.cipherWidth
        let limit = (this.encodedString.length / this.cipherWidth) - tosearch.length
        let charset = this.getSourceCharset()
        let len = charset.length
        let i, j
        let res = ''

        this.saveGromarkReplacements()
        //console.log('Searching for :' + tosearch + ' in ' + this.encodedString + ' limit=' + limit)
        for (i = 0; i < limit; i++) {
            let gromark = this.encodedString.substr(i * this.cipherWidth, gromarklen)
            let matchlevel = this.checkGromark(tosearch, gromark)
            if (matchlevel > 0) {
                // Now go through and figure out what letters need to be picked to make this
                let mappings = this.makeGromarkMap(tosearch, gromark)
                let maptable = ''
                let mapfix = ''
                for (j = 0; j < len; j++) {
                    let c = charset.substr(j, 1)
                    let mapc = mappings[c]
                    maptable += '<td>' + mapc + '</td>'
                    if (mapc !== '') {
                        mapfix += c + mapc
                    }
                }
                res += '<tr><td>' + i + '</td><td>' + matchlevel +
                    '</td><td class="dapply" onclick="cipherTool.setMultiChars(\'' + mapfix + '\');">' +
                     gromark + '</td>' + maptable + '</tr>'
            }
        }
        if (res === '') {
            res = '<br/><b>Not Found</b>'
        } else {
            let tres = '<table class="mfind"><thead><tr><th>Pos</th><th>Type</th><th>Gromark</th>'
            for (i = 0; i < len; i++) {
                tres += '<th>' + charset.substr(i, 1) + '</th>'
            }
            res = tres + '</tr></thead>' +
                '<tbody>' + res + '</tbody>' +
                '</table>'
        }
        $(".findres").html('Searching for ' + str + res)
        this.attachHandlers()
    }

}
// Gromark: {
//     normalizeHTML: 'normalizeHTML',
//     load: 'loadSolver',
//     reset: 'resetSolver',
//     makeFreqEditField: 'makeEditField',
//     updateSel: 'updateCheckerboardSel',
//     findPossible: 'findGromark'
// },
