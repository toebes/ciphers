/// <reference types="ciphertypes" />

const Aval = "A".charCodeAt(0)

import JTTable from "./jttable"
import CipherSolver from "./ciphersolver"
import Mapper from "./mapper"

type RagLine = Array<string>
export default class CipherRagbabySolver extends CipherSolver {
    /** The current cipher we are working on */
    cipherString: string = ''
    /** Map of indexes into which character of the string is at that index */
    cipherOffsets: Array<number> = []
    /** Implements the mapping for the various cipher types */
    ciphermap: Mapper = null
    /** Currently selected keyword */
    keyword: string = ""
    /** length of the alphabet */
    alphalen: number = 24
    /** Replacement map */
    replmap: Array<RagLine> = [[]]
    /**
     * Sets up the radio button to choose the variant
     */
    makeVigenereChoices(): JQuery<HTMLElement> {
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
     * Selects which variant table is to be used for mapping
     * @param codevariant Name of code variant - one of vigenere, variant or beufort
     */
    setAlphabetSize(alphalen: number): void {
        this.alphalen = Number(alphalen)
        this.buildMap()
    }
    /**
     * Locate a string.
     * Note that we assume that the period has been set
     * @param {string} str string to look for
     */
    findPossible(str: string): void {
        let blankkey = ''
        for (let c of this.keyword) {
            blankkey += '-'
        }
        let res = null
        let maxcols = 5
        let tdcount = 0
        let table = new JTTable({ class: 'found' })
        let row = table.addHeaderRow()
        for (let i = 0; i < maxcols; i++) {
            row.add("Pos").add("Key")
        }
        row = table.addBodyRow()
        str = this.minimizeString(str.toUpperCase())
        for (let i = 0; i <= this.cipherOffsets.length - str.length; i++) {
            let thiskey = blankkey
            let valid = true
            for (let pos = 0; pos < str.length; pos++) {
                let ct = this.cipherString.charAt(this.cipherOffsets[i + pos])
                let pt = str.charAt(pos)
                let key = this.ciphermap.decodeKey(ct, pt)
                let keypos = (i + pos) % this.keyword.length
                let prevkey = thiskey.charAt(keypos)
                if (prevkey != '-' && prevkey != key || key === '?') {
                    valid = false
                    break
                }
                thiskey = thiskey.substr(0, keypos) + key + thiskey.substr(keypos + 1)
            }
            if (valid) {
                if ((tdcount > 0) && ((tdcount % maxcols) === 0)) {
                    row = table.addBodyRow()
                }
                tdcount = tdcount + 1
                row.add(String(i))
                    .add($("<a>", { class: 'vkey', href: '#' }).text(thiskey))
            }
        }
        if (tdcount === 0) {
            res = $("<span>").text('Unable to find ' + str + ' as ' + this.normalizeHTML(str))
        } else {
            res = $("<span>").text('Searching for ' + str + ' as ' + this.normalizeHTML(str))
            res.append(table.generate())
        }
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
        console.log("vigenere setChar data-char=" + repchar + ' newchar=' + newchar)
        let pt = newchar
        let ct = repchar.substr(0, 1)
        let dist = Number(repchar.substr(1))
        let found = false
        for (let r = 0; r < this.replmap.length; r++) {
            let ptidx = this.replmap[r].indexOf(pt)
            let ctidx = this.replmap[r].indexOf(ct)
            if (ptidx != -1) {
                found = true
                break
            } else if (ctidx != -1) {
                found = true
                break
            }
        }
        // let index = Number(repchar)
        // let ct = this.cipherString.charAt(index)
        // $("input[data-char='" + repchar + "']").val(newchar)
        // let key = this.ciphermap.decodeKey(ct, newchar)
        // $("div[data-schar='" + repchar + "']").html(key)
        this.buildMap()
    }

    /**
     * Builds the GUI for the solver
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    build(str: string): JQuery<HTMLElement> {
        this.cipherString = str
        this.cipherOffsets = []
        let res = ""
        let combinedtext = ""
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>'
        let posthead1 = '</tr></tbody></table><div class="repl" data-chars="'
        let posthead2 = '"></div></div>'
        let pre = prehead
        let post = ''
        let i, len
        let datachars = ''
        let charset = this.getCharset().toUpperCase()
        this.freq = {}
        let wordidx = 1
        let wordlen = 0
        for (i = 0, len = charset.length; i < len; i++) {
            this.freq[charset.substr(i, 1).toUpperCase()] = 0
        }

        for (i = 0, len = str.length; i < len; i++) {
            let t = str.substr(i, 1).toUpperCase()
            if (this.isValidChar(t)) {
                let off = (wordidx + wordlen) % this.alphalen
                let id = t + off
                let outc = '?'
                if (off === 0) {
                    outc = t
                }
                datachars += t
                combinedtext += '<span data-char="' + id + '">' + outc + '</span>'
                t = pre + '<td><div class="slil">' + t + '</div>' +
                    '<div class="off">' + off + "</div>" +
                    '<div data-char="' + id + '" class="vans">' + outc + '</div>' +
                    '<input type="text" id="ti' + i + '" class="sli" data-char="' + id + '" />'
                wordlen++
                pre = ''
            } else if (t === ' ' || t === '\n' || t === '\r') {
                wordidx++
                wordlen = 0
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
        this.replmap[0] = []
        this.replmap[0].push("X")
        this.replmap[0].push("Z")
        this.replmap[0].push("T")

        return $(res)
    }
    /**
     * Replaces the map of letters for shifting
     */
    buildMap(): void {
        let editmap = $("<h1>Editmap goes here</h1>")
        let table = new JTTable({ class: "tfreq editmap" })
        let row = table.addHeaderRow(["Shift Left"])
        for (let i = 0; i < this.alphalen; i++) {
            row.add({ settings: { class: "off" }, content: i })
        }
        row.add("Shift Right")
        row = table.addHeaderRow([$("<button>", { href: "#", class: "ls", 'data-vrow': -1 }).html("&#8647;")])
        for (let i = 0; i < this.alphalen; i++) {
            row.add({ settings: { class: "off" }, content: i })
        }
        row.add($("<button>", { href: "#", class: "rs", 'data-vrow': -1 }).html("&#8649;"))

        for (let r = 0; r < this.replmap.length; r++) {
            row = table.addBodyRow([$("<button>", { href: "#", class: "ls", 'data-vrow': r }).html("&#8647;")])
            for (let i = 0; i < this.alphalen; i++) {
                let repc = ''
                if (i < this.replmap[0].length) {
                    repc = this.replmap[0][i]
                }
                if (r === 0) {
                    row.add($("<input>", { class: "sli off", 'data-char': "x", value: repc }))
                } else {
                    row.add(repc)
                }
            }
            row.add($("<button>", { href: "#", class: "rs", 'data-vrow': r }).html("&#8649;"))
        }
        // Now add all of the remaining rows
        $("#ragwork").empty().append(table.generate())
        this.attachHandlers()
    }

    layout(): void {
        $('.precmds').each((i, elem) => {
            $(elem).empty().append(this.makeVigenereChoices())
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
                if (ipos < this.replmap[r].length) {
                    fillc = this.replmap[r][ipos]
                }
                newmap.push(fillc)
            }
            this.replmap[r] = newmap
        }

    }
    leftShift(r: number): void {
        if (r === -1) {
            for (let slot in this.replmap) {
                this.rotateMap(Number(slot), 1)
            }
        } else {
            this.rotateMap(r, 1)
        }
        this.buildMap()
    }
    rightShift(r: number): void {
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

        $('input[type=radio][name=alphasize]').unbind('change').change(() => {
            this.setAlphabetSize(Number($("input[name='alphasize']:checked").val()))
        })
        $("button.ls").unbind('click').click((e) => {
            this.leftShift(Number($(e.currentTarget).attr('data-vrow')))
        })
        $("button.rs").unbind('click').click((e) => {
            this.rightShift(Number($(e.currentTarget).attr('data-vrow')))
        })
        $(".slvi").unbind('blur').blur((e) => {
            let tohighlight = $(e.target).attr('data-vslot')
            $("[data-vslot='" + tohighlight + "']").removeClass("allfocus")
            $(e.target).removeClass("focus")
        }).unbind('focus').focus((e) => {
            let tohighlight = $(e.target).attr('data-vslot')
            $("[data-vslot='" + tohighlight + "']").addClass("allfocus")
            $(e.target).addClass("focus")
        })
    }
}