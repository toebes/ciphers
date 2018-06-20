/// <reference types="ciphertypes" />


import JTTable from "./jttable"
import CipherSolver from "./ciphersolver"
interface mapSet {
    ct: string    // Cipher text
    ctoff: number // Cipher text offset
    pt: string    // Plain text mapping
}

type RagLine = Array<string>

interface mapLine {
    line: RagLine
    usedlet: NumberMap
    notes: string
}

interface mappedLine {
    line: RagLine
    notes: string
}
/**
 * The CipherRagbabySolver class implements a solver for the Ragbaby Cipher
 * replmap is the map of letters.  
 *   replmap[0] is the combined entries
 *   replmap[1] is editable entries from the user
 *   replmap[2..n] is the mappings derived from entries under the cipher text
 *   ctmap[] maps from a Cipher text (Letter:Number) to a plaintext letter
 * It keeps track of a list of letters that a user has entered (in order) 
 */
export default class CipherRagbabySolver extends CipherSolver {
    /** The current cipher we are working on */
    cipherString: string = ''
    /** Maps the cipher text (Letter concatenated with a number) to a plaintext letter */
    ctmap: Array<mapSet> = []
    /** List of all CT:Offset mappings */
    ctoffsets: BoolMap = {}

    /** length of the alphabet */
    alphalen: number = 24
    replmap: Array<mappedLine>

    emptyRagline(): RagLine {
        let rslt: RagLine = []
        for (let i = 0; i < this.alphalen; i++) {
            rslt.push("")
        }
        return rslt
    }

    /**
     * This rotates all entries in a line by the specified amount.
     * @param r Which map to shift
     * @param dist Distance to shift by
     */
    rotateSet(s: RagLine, dist: number): RagLine {
        if (dist === 0) {
            return s
        }

        let newmap: RagLine = []
        for (let i = 0; i < this.alphalen; i++) {
            let ipos = (this.alphalen + i + dist) % this.alphalen
            let fillc = ''
            if (ipos < s.length) {
                fillc = s[ipos]
            }
            newmap.push(fillc)
        }
        return newmap
    }

    /**
     * Apply all of the mappings entered so far (in order)
     */
    applyMappings(): void {
        let cslot: NumberMap = {}
        let prevslot: NumberMap = {}
        let charset = this.getCharset()
        let newmap: Array<RagLine> = [this.emptyRagline(), this.emptyRagline()]
        let lines: Array<mapLine> = []

        // No default preferred position for any character
        for (let i of charset) {
            cslot[i] = -1
            prevslot[i] = -1
        }
        // First save all the currently preferred positions of characters
        for (let i in this.replmap[0].line) {
            prevslot[this.replmap[0].line[i]] = Number(i)
        }
        // Now save all the manually selected characters and override the position
        // for any entered here.  This is the one position that can't move
        for (let i in this.replmap[1].line) {
            let c = this.replmap[1].line[i]
            newmap[1][i] = c
            newmap[0][i] = c
            if (c != '') {
                cslot[c] = Number(i)
            }
        }
        this.replmap.splice(2, this.replmap.length - 2)

        // Now go through all of the mappings that have been defined
        for (let entry of this.ctmap) {
            // 1. If the mapped letters are already known in the main map
            //    1a.  If the offset fits, skip the entry
            //    1b.  Create a new slot for the mismatch entry with PT as first letter
            // 2. If there is a slot which has one of the letters in it AND it fits, add to that slot
            // 3. Create a new slot for the entry with PT as the first letter

            let needNew = true
            let mergeslot = -1
            let note = ""
            // See if we already know what slot the plaintext goes in
            let ptslot = cslot[entry.pt]
            let ctslot = cslot[entry.ct]
            if (ptslot != -1 && ctslot != -1) {
                let ctslottarget = (ptslot + entry.ctoff) % this.alphalen
                // Ok we are good for the plaintext.  Do we have a slot for the cipher text
                // Now see if the distance between the two is acceptable
                if (ctslot === ctslottarget) {
                    // it matches against what they typed in, so we can ignore the entry
                    needNew = false
                } else {
                    // It doesn't match, so we need to create a new entry
                    note = "Conflict"
                }
            } else {
                // See if we can find a slot
                for (let testslot = 0; testslot < lines.length; testslot++) {
                    let testline = lines[testslot]
                    ptslot = testline.usedlet[entry.pt]
                    ctslot = testline.usedlet[entry.ct]
                    if (ptslot != undefined) {
                        // We have the plain text character, see where the cipher text should be
                        let ctslottarget = (ptslot + entry.ctoff) % this.alphalen
                        // Does it also have the cipher text character?
                        if (ctslot != undefined) {
                            // It does.  If the cipher text is at the same slot, we are safe
                            if (ctslottarget === ctslot) {
                                testline.notes += " " + entry.ct + String(entry.ctoff)
                                needNew = false
                                mergeslot = testslot
                                break
                            }
                            // It isn't in the same slot so we will need to just try for the next line
                        } else {
                            // It only has the plain text character, see if there is something at the spot
                            // which would conflict
                            if (testline.line[ctslottarget] === '') {
                                // Nothing is there, so we can add to it
                                testline.line[ctslottarget] = entry.ct
                                testline.usedlet[entry.ct] = ctslottarget
                                testline.notes += " " + entry.ct + String(entry.ctoff)
                                mergeslot = testslot
                                needNew = false
                                break
                            }
                            // The slot is occupied, so try for the next line
                        }
                    } if (ctslot != undefined) {
                        // We have the cipher text letter (but not the plain text one)
                        let ptslottarget = (this.alphalen + ctslot - entry.ctoff) % this.alphalen
                        if (testline.line[ptslottarget] === '') {
                            // Nothing is there, so we can add to it
                            testline.line[ptslottarget] = entry.pt
                            testline.usedlet[entry.pt] = ptslottarget
                            testline.notes += " " + entry.ct + String(entry.ctoff)
                            mergeslot = testslot
                            needNew = false
                            break
                        }
                        // The slot was occupied, so try for the next line
                    }
                }
            }
            if (needNew) {
                // Brand new slot. 
                let newline: mapLine = { line: [], notes: "", usedlet: {} }
                for (let i = 0; i < this.alphalen; i++) {
                    newline.line.push("")
                }
                newline.notes = entry.ct + String(entry.ctoff) + note
                newline.usedlet[entry.pt] = 0
                newline.line[0] = entry.pt
                newline.usedlet[entry.ct] = entry.ctoff
                newline.line[entry.ctoff] = entry.ct
                lines.push(newline)
            } else {
                while (mergeslot != -1) {
                    let tomerge = mergeslot
                    mergeslot = -1
                    for (let testslot = tomerge + 1; testslot < lines.length; testslot++) {
                        let canmerge = false
                        let shift = 0
                        // See if these two are compatible. To be compatible, at least one
                        // character in the testslot must be in the tomerge slot and all other
                        // characters in the testslot must not overlap
                        for (let c in lines[testslot].usedlet) {
                            if (lines[tomerge].usedlet[c] != undefined) {
                                shift = lines[testslot].usedlet[c] - lines[tomerge].usedlet[c]
                                canmerge = true
                                break
                            }
                        }
                        if (canmerge) {
                            // We have at least one character in common.  Shift the
                            let shifted = this.rotateSet(lines[testslot].line, shift)
                            for (let i in shifted) {
                                if (shifted[i] !== '' && lines[tomerge].line[i] !== '' && lines[tomerge].line[i] !== shifted[i]) {
                                    canmerge = false
                                    break
                                }
                            }
                            if (canmerge) {
                                // We have the shifted array, copy all of the characters into the target line
                                for (let i in shifted) {
                                    let c = shifted[i]
                                    if (c != '') {
                                        lines[tomerge].line[i] = c
                                        lines[tomerge].usedlet[c] = Number(i)
                                    }
                                }
                                // Copy over the notes
                                lines[tomerge].notes += "," + lines[testslot].notes
                                lines.splice(testslot, 1)
                                // Now that we merged once, we may have to merge with something else, so check again
                                mergeslot = tomerge
                                break
                            }
                        }
                    }
                }
            }
        }

        // We have created all the new lines, now we want to line them up as best as we can
        for (let testline of lines) {
            // For convenience we try to see if the first letter has a corresponding favorite position
            let rotate = -prevslot[testline.line[0]]
            if (rotate === 1) { // Remember we negated the rotate amount so -1 becomes 1
                // Assume we won't have to rotate at all
                rotate = 0
                // Unfortunately the first letter didn't work, so let's try all the others
                for (let c in testline.usedlet) {
                    let prevspot = prevslot[c]
                    if (prevspot !== -1) {
                        rotate = testline.usedlet[c] - prevspot
                        break
                    }
                }
            }
            // Ok we know how much to rotate it, put it back in place when we are done
            this.replmap.push({ line: this.rotateSet(testline.line, rotate), notes: testline.notes })
        }
    }
    /**
     * Sets up the radio button to choose the variant
     */
    makeChoices(): JQuery<HTMLElement> {
        let operationChoice = $('<div>')
        let label = $('<label>', { for: 'codetab' }).text('Variant')
        operationChoice.append(label)

        let radioBox = $('<div>', { id: 'alphasizer', class: 'ibox' })
        radioBox.append($('<input>', { id: 'a24', type: 'radio', name: 'alphasize', value: '24', checked: 'checked' }))
        radioBox.append($('<label>', { for: 'a24', class: 'rlab' }).html('24 [No I/X]'))
        radioBox.append($('<input>', { id: 'a26', type: 'radio', name: 'alphasize', value: '26' }))
        radioBox.append($('<label>', { for: 'a26', class: 'rlab' }).text('26 [A-Z]'))
        radioBox.append($('<input>', { id: 'a36', type: 'radio', name: 'alphasize', value: '36' }))
        radioBox.append($('<label>', { for: 'a36', class: 'rlab' }).text('36 [A-Z 0-9]'))

        operationChoice.append(radioBox)

        return operationChoice
    }
    /**
     * Selects which form of a ragbaby we are doing
     * @param alphalen Number of characters in the alphabet (24, 26, 36)
     */
    setAlphabetSize(alphalen: number): void {
        this.alphalen = Number(alphalen)
        switch (this.alphalen) {
            case 26:
                this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
                break

            case 36:
                this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
                break

            default:
                this.setCharset("ABCDEFGHIKLMNOPQRSTUVWYZ")
                break
        }
        this.buildMap()
    }
    /**
     * Locate a string.
     * Note that we assume that the period has been set
     * @param {string} str string to look for
     */
    findPossible(str: string): void {
        let res = $("<span>").text('Unable to find ' + str + ' as ' + this.normalizeHTML(str))
        $(".findres").empty().append(res)
        this.attachHandlers()
    }

    /**
    * Fills in the frequency portion of the frequency table.  For the Ragbaby
    * we don't have the frequency table, so this doesn't need to do anything
    */
    displayFreq(): void {
        this.setAlphabetSize(Number($("input[name='alphasize']:checked").val()))
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
     * Change the encrypted character.  This primarily shows us what the key might be if we use it
     * @param {string} repchar character slot to map against (This is a character and an offset)
     * @param {string} newchar New char to assign as decoding for the character
     */
    setChar(repchar: string, newchar: string): void {
        console.log("Ragbaby setChar data-char=" + repchar + ' newchar=' + newchar)
        let pt = newchar
        let ct = repchar.substr(0, 1)
        let dist = Number(repchar.substr(1))

        if (ct === '-') {
            if (newchar != '') {
                // See if we had this character in a different slot.  If so, we need
                // to delete
                let oldpos = this.replmap[1].line.indexOf(newchar)
                if (oldpos != -1) {
                    this.replmap[1].line[oldpos] = ''
                }
            }
            this.replmap[1].line[dist] = newchar
            this.applyMappings()
            this.buildMap()
        } else {
            // Don't let them do something bad - like setting a character to itself
            // with a non-zero distance
            if (pt !== ct || dist !== 0) {
                $("input[data-char='" + repchar + "']").val(newchar)
                for (let pos in this.ctmap) {
                    let entry = this.ctmap[pos]
                    if (entry.ct === ct && entry.ctoff === dist) {
                        this.ctmap.splice(Number(pos), 1)
                    }
                }
                if (pt !== '') {
                    this.ctmap.push({ ct: ct, pt: pt, ctoff: dist })
                }
                this.applyMappings()
                this.buildMap()
            }
        }
    }

    /**
     * Builds the GUI for the solver
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    build(str: string): JQuery<HTMLElement> {
        this.cipherString = str
        this.ctoffsets = {}
        this.ctmap = []
        this.replmap = [{ line: this.emptyRagline(), notes: "" }, { line: this.emptyRagline(), notes: "" }]
        let res = ""
        let combinedtext = ""
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>'
        let posthead1 = '</tr></tbody></table><div class="repl" data-chars="'
        let posthead2 = '"></div></div>'
        let pre = prehead
        let datachars = ''
        let charset = this.getCharset().toUpperCase()
        this.freq = {}
        let wordidx = 1
        let wordlen = 0

        for (let c of charset) {
            this.freq[c] = 0
        }

        for (let i = 0, len = str.length; i < len; i++) {
            let t = str.substr(i, 1).toUpperCase()
            if (this.isValidChar(t)) {
                let off = (wordidx + wordlen) % this.alphalen
                let id = t + off
                this.ctoffsets[id] = true
                let disabled = ''
                let outc = '?'
                if (off === 0) {
                    outc = t
                    disabled = ' disabled'
                }
                datachars += t
                combinedtext += '<span data-char="' + id + '">' + outc + '</span>'
                t = pre + '<td><div class="slil">' + t + '</div>' +
                    '<div class="off">' + off + "</div>" +
                    '<div data-char="' + id + '" class="vans">' + outc + '</div>' +
                    '<input type="text" id="ti' + i + '" class="sli" data-char="' + id + '"' + disabled + ' />'
                wordlen++
                pre = ''
            } else if (t === ' ' || t === '\n' || t === '\r') {
                if (wordlen !== 0) {
                    wordidx++
                    wordlen = 0
                }
                if (pre === '') {
                    t = posthead1 + datachars + posthead2
                } else {
                    t = ''
                }
                pre = prehead
                datachars = ''
                combinedtext += ' '
            } else {
                combinedtext += t
                t = pre + '<td><div class="slil">' + t + '</div></td>'
                pre = ''
            }
            res += t
        }
        if (pre === '') {
            res += posthead1 + datachars + posthead2
        }
        res += '<div class="ssum">' + combinedtext + '</div>'

        return $(res)
    }
    /**
     * Replaces the map of letters for shifting
     */
    buildMap(): void {
        let table = new JTTable({ class: "tfreq editmap" })
        let row = table.addHeaderRow(["Shift Left"])
        for (let i = 0; i < this.alphalen; i++) {
            this.replmap[0].line[i] = ''
            row.add({ settings: { class: "off" }, content: i })
        }
        row.add("Shift Right")
        row.add("Notes")

        // Now add all of the remaining rows
        for (let r = 1; r < this.replmap.length; r++) {
            let extranote = ''
            row = table.addBodyRow([$("<button>", { href: "#", class: "ls", 'data-vrow': r }).html("&#8647;")])
            for (let i = 0; i < this.alphalen; i++) {
                let repc = ''
                if (i < this.replmap[r].line.length) {
                    repc = this.replmap[r].line[i]
                }
                if (repc != '') {
                    if (this.replmap[0].line[i] == '') {
                        this.replmap[0].line[i] = repc
                    } else if (repc != this.replmap[0].line[i]) {
                        extranote += " '" + repc + "' conflict"
                    }
                }
                if (r === 1) {
                    row.add($("<input>", { class: "sli off", 'data-char': '-' + i, value: repc }))
                } else {
                    row.add(repc)
                }
            }
            row.add($("<button>", { href: "#", class: "rs", 'data-vrow': r }).html("&#8649;"))
            row.add(this.replmap[r].notes + extranote)
        }
        // Go back and put a header row showing all the letters we have picked up
        row = table.addHeaderRow([$("<button>", { href: "#", class: "ls", 'data-vrow': -1 }).html("&#8647;")])
        for (let i = 0; i < this.alphalen; i++) {
            let repc = '?'
            if (i < this.replmap[0].line.length) {
                repc = this.replmap[0].line[i]
            }
            row.add({ settings: { class: "off" }, content: repc })
        }
        row.add($("<button>", { href: "#", class: "rs", 'data-vrow': -1 }).html("&#8649;"))
        row.add("Enter what-if letters on this strip.  It will not combine.")


        $("#ragwork").empty().append(table.generate())

        // Now go through and update all of the character maps
        for (let ctoff in this.ctoffsets) {
            let ct = ctoff.substr(0, 1)
            let dist = Number(ctoff.substr(1))
            let i = this.replmap[0].line.indexOf(ct)
            let repl = '?'
            if (i !== -1) {
                let ptpos = (this.alphalen + i - dist) % this.alphalen
                let pt = this.replmap[0].line[ptpos]
                if (pt != '') {
                    repl = pt
                }
            }
            $("span[data-char='" + ctoff + "']").text(repl)
            $("div[data-char='" + ctoff + "']").text(repl)
        }
        this.attachHandlers()
    }
    /**
     * 
     */
    layout(): void {
        $('.precmds').each((i, elem) => {
            $(elem).empty().append(this.makeChoices())
        })
    }
    /** 
     * Creates an HTML table to display the frequency of characters
     * @returns {JQuery<HTMLElement} HTML to put into a DOM element
     */
    createFreqEditTable(): JQuery<HTMLElement> {
        let topdiv = $("<div>")
        topdiv.append($("<div>", { id: "ragwork", class: "ragedit" }))
        return topdiv
    }
    /**
     * This rotates all entries in a map entry by the specified amount.
     * @param r Which map to shift
     * @param dist Distance to shift by
     */
    rotateMap(r: number, dist: number) {
        if (r < this.replmap.length) {
            let newmap: Array<string> = []
            for (let i = 0; i < this.alphalen; i++) {
                let ipos = (this.alphalen + i + dist) % this.alphalen
                let fillc = ''
                if (ipos < this.replmap[r].line.length) {
                    fillc = this.replmap[r].line[ipos]
                }
                newmap.push(fillc)
            }
            this.replmap[r].line = newmap
        }

    }
    /**
     * Rotate left all the letters in a slot by 1
     * @param r Which slot (-1 for all) to shift
     */
    leftRotate(r: number): void {
        if (r === -1) {
            for (let slot in this.replmap) {
                this.rotateMap(Number(slot), 1)
            }
        } else {
            this.rotateMap(r, 1)
        }
        this.buildMap()
    }
    /**
     * Rotate right all the letters in a slot by 1
     * @param r Which slot (-1 for all) to shift
     */
    rightRotate(r: number): void {
        if (r === -1) {
            for (let slot in this.replmap) {
                this.rotateMap(Number(slot), -1)
            }
        } else {
            this.rotateMap(r, -1)
        }
        this.buildMap()
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        super.attachHandlers()
        $('input[type=radio][name=alphasize]').off('change').on('change', () => {
            this.setAlphabetSize(Number($("input[name='alphasize']:checked").val()))
        })
        $("button.ls")
            .off('click')
            .on('click', (e) => {
                this.leftRotate(Number($(e.target).attr('data-vrow')))
            })
        $("button.rs")
            .off('click')
            .click((e) => {
                this.rightRotate(Number($(e.target).attr('data-vrow')))
            })
        $(".slvi")
            .off('blur')
            .on('blur', (e) => {
                let tohighlight = $(e.target).attr('data-vslot')
                $("[data-vslot='" + tohighlight + "']").removeClass("allfocus")
                $(e.target).removeClass("focus")
            })
            .off('focus')
            .on('focus', (e) => {
                let tohighlight = $(e.target).attr('data-vslot')
                $("[data-vslot='" + tohighlight + "']").addClass("allfocus")
                $(e.target).addClass("focus")
            })
    }
}