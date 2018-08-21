import { cloneObject, NumberMap, setCharAt, StringMap } from "./ciphercommon";
import { CipherEncoder, IEncoderState } from "./cipherencoder"
import { ICipherType } from "./ciphertypes";
import { fiveletterwords } from "./fiveletterwords"
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";

const baconMap: StringMap = {
    A: "AAAAA",
    B: "AAAAB",
    C: "AAABA",
    D: "AAABB",
    E: "AABAA",
    F: "AABAB",
    G: "AABBA",
    H: "AABBB",
    I: "ABAAA",
    J: "ABAAA",
    K: "ABAAB",
    L: "ABABA",
    M: "ABABB",
    N: "ABBAA",
    O: "ABBAB",
    P: "ABBBA",
    Q: "ABBBB",
    R: "BAAAA",
    S: "BAAAB",
    T: "BAABA",
    U: "BAABB",
    V: "BAABB",
    W: "BABAA",
    X: "BABAB",
    Y: "BABBA",
    Z: "BABBB",
};

interface IBaconianState extends IEncoderState {
    /** Characters to use to represent the A value */
    texta: string,
    /** Characters to use to represent the B value */
    textb: string,
    abMapping: string,
    /** How wide a line can be before wrapping */
    linewidth: number,
    /** List of words for the encoded string */
    words: string[]
}
/**
 * CipherBaconianEncoder - This class handles all of the actions associated with encoding
 * a Baconian cipher.
 */
export class CipherBaconianEncoder extends CipherEncoder {
    defaultstate: IBaconianState = {
        cipherString: "",
        cipherType: ICipherType.Baconian,
        offset: 1,
        /** The type of operation */
        operation: "let4let",
        texta: "A",
        textb: "B",
        abMapping: "ABABABABABABABABABABABABAB",
        linewidth: this.maxEncodeWidth,
        words: []
    }
    wordlookup: { [index: string]: string[] }
    state: IBaconianState = cloneObject(this.defaultstate) as IBaconianState
    cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save", },
        this.undocmdButton,
        this.redocmdButton,
    ]
    setUIDefaults(): void {
        super.setUIDefaults()
        this.setTexta(this.state.texta)
        this.setTextb(this.state.textb)
        this.setOperation(this.state.operation)
    }
    setTexta(texta: string): boolean {
        let changed = false
        if (this.state.texta !== texta) {
            this.state.texta = texta
            changed = true
        }
        return changed
    }
    setTextb(textb: string): boolean {
        let changed = false
        if (this.state.textb !== textb) {
            this.state.textb = textb
            changed = true
        }
        return changed
    }
    setLineWidth(linewidth: number): boolean {
        let changed = false
        if (linewidth < 0) {
            linewidth = this.maxEncodeWidth
        }
        if (this.state.linewidth !== linewidth) {
            this.state.linewidth = linewidth
            changed = true
        }
        return changed
    }
    toggleAB(c: string): void {
        let charset = this.getCharset()
        let idx = charset.indexOf(c)
        if (idx >= 0) {
            let val = this.state.abMapping.substr(idx, 1)
            if (val !== "A") {
                val = "A"
            } else {
                val = "B"
            }
            this.state.abMapping = setCharAt(this.state.abMapping, idx, val)
        }
    }
    public getABMap(): StringMap {
        let ablookup: StringMap = {};
        // Make a mapping of the characters for convenience
        let charset = this.getCharset();
        for (let i = 0; i < charset.length; i++) {
            let c = charset.substr(i, 1);
            let ab = this.state.abMapping.substr(i, 1);
            ablookup[c] = ab;
        }
        return ablookup
    }
    buildWordMap(): void {
        this.wordlookup = {}
        if (this.state.operation === "words") {
            let ablookup = this.getABMap()
            for (let word of fiveletterwords) {
                // Figure out what letter this word will map to
                let mapping = ""
                for (let c of word) {
                    if (ablookup[c] !== undefined) {
                        mapping += ablookup[c]
                    }
                }
                if (mapping.length === 5) {
                    if (this.wordlookup[mapping] === undefined) {
                        this.wordlookup[mapping] = []
                    }
                    this.wordlookup[mapping].push(word)
                }
            }
        }
    }
    updateOutput(): void {
        $(".opfield").hide()
        $("." + this.state.operation).show()
        $("#texta").val(this.state.texta)
        $("#textb").val(this.state.textb)
        let abmap = this.getABMap()
        for (let c in abmap) {
            $("#l" + c).text(abmap[c])
        }
        JTRadioButtonSet("operation", this.state.operation)
        super.updateOutput()
    }
    /**
     * Initializes the encoder.
     */
    init(lang: string): void {
        super.init(lang)
    }
    makeReplacement(str: string, maxEncodeWidth: number): string[][] {
        let langreplace = this.langreplace[this.state.curlang]
        let abmap = this.getABMap()
        let sourceline = ""
        let baconline = ""
        let encodeline = ""
        let result: string[][] = []
        let letpos: NumberMap = { 'A': 0, 'B': 0 }
        let sharedpos = 0
        if (this.state.operation === 'words') {
            return [["", "", "Baconian Words Not yet implemented"]]
        }
        for (let t of str) {
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== 'undefined') {
                t = langreplace[t]
            }
            let bacontext = baconMap[t]
            // Make sure that this is a valid character to map from
            if (bacontext !== undefined) {
                sourceline += "  " + t + "  "
                baconline += bacontext
                for (let ab of bacontext) {
                    if (this.state.operation === "let4let") {
                        let abstring = this.state.texta
                        if (ab !== 'A') {
                            abstring = this.state.textb
                        }
                        let pos = letpos[ab]
                        if (pos >= abstring.length) {
                            pos = 0
                        }
                        encodeline += abstring.substr(pos, 1)
                        pos++
                        letpos[ab] = pos
                    } else if (this.state.operation === "sequence") {
                        let abstring = this.state.texta
                        if (ab !== 'A') {
                            abstring = this.state.textb
                        }
                        if (sharedpos >= abstring.length) {
                            sharedpos = 0
                        }
                        encodeline += abstring.substr(sharedpos, 1)
                        sharedpos++
                    } else {
                        // Words
                        sourceline += " "
                        baconline += " "
                        encodeline += bacontext
                    }
                }
            }
            if (encodeline.length >= maxEncodeWidth) {
                let sourcepart = sourceline.substr(0, maxEncodeWidth)
                let baconpart = baconline.substr(0, maxEncodeWidth)
                let encodepart = encodeline.substr(0, maxEncodeWidth)
                sourceline = sourceline.substr(maxEncodeWidth)
                baconline = baconline.substr(maxEncodeWidth)
                encodeline = encodeline.substr(maxEncodeWidth)
                result.push([sourcepart, baconpart, encodepart])
            }
        }
        // and add any residual parts
        if (encodeline.length > 0) {
            result.push([sourceline, baconline, encodeline])
        }
        return result
    }
    getEncodeWidth(): number {
        let linewidth = this.maxEncodeWidth
        if (this.state.operation !== "words") {
            linewidth = this.state.linewidth
        }
        return linewidth
    }
    build(): JQuery<HTMLElement> {
        let result = $("<div/>")
        result.append($("<button/>", { id: "fixwords", type: "button", class: "button" }).text("Change Word Mapping"))
        result.append(this.genAnswer())
        return result
    }
    /**
     * Loads up the values for the encoder
     */
    load(): void {
        $(".err").text('')
        let res = this.build()
        $("#answer").empty().append(res)

        // Show the update frequency values
        this.displayFreq()
        // We need to attach handlers for any newly created input fields
        this.attachHandlers()
    }

    makeFreqEditField(c: string): JQuery<HTMLElement> {
        let einput = $('<span/>', { type: "text", 'data-char': c, id: 'm' + c })
        return einput
    }
    genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>")
        result.append(this.genTestUsage())

        let radiobuttons = [
            { id: 'wrow', value: "let4let", title: 'Letter for letter' },
            { id: 'mrow', value: "sequence", title: 'Sequence' },
            { id: 'mrow', value: "words", title: 'Words' },
        ]
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation))

        result.append(this.genQuestionFields())
        result.append(JTFLabeledInput("Plain Text", 'textarea', 'toencode', this.state.cipherString, "small-12 medium-12 large-12"))
        // Build a table so that they can click on letters to make A or B
        let table = new JTTable({ class: 'cell shrink tfreq opfield words' })
        let hrow = table.addHeaderRow()
        let brow = table.addBodyRow()
        for (let c of this.getCharset()) {
            hrow.add({ settings: { class: "abclick", id: "a" + c }, content: c })
            brow.add({ settings: { class: "abclick", id: "l" + c }, content: "A" })
        }
        result.append(table.generate())
        result.append(JTFLabeledInput("A Text", 'text', 'texta',
                                      this.state.texta, "small-12 medium-6 large-6 opfield let4let sequence"))
        result.append(JTFLabeledInput("B Text", 'text', 'textb',
                                      this.state.textb, "small-12 medium-6 large-6  opfield let4let sequence"))
        result.append(JTFIncButton("Line Width", "linewidth",
                                   this.state.linewidth, "small-12 medium-6 large-6  opfield let4let sequence"))

        return result
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    genAnswer(): JQuery<HTMLElement> {
        let result = $("<div>")
        let cipherString = this.getEncodingString()
        if (this.state.operation === 'words') {
            this.buildWordMap()
            let wordindex = 0
            // Iterate through each letter and look it up in the map
            for (let c of cipherString) {
                let resword = ""
                if (this.isValidChar(c)) {
                    let baconian = baconMap[c]
                    if (this.wordlookup[baconian] === undefined) {
                        // There were no words matching this
                        $("#err").text("Unable to find any words for " + baconian);
                        resword = "[" + baconian + "]"
                    } else {
                        if (wordindex < this.state.words.length) {
                            let tryword = this.state.words[wordindex];
                            if (this.wordlookup[baconian].indexOf(tryword) >= 0) {
                                resword = tryword
                            } else {
                                resword = this.wordlookup[baconian][0]
                            }
                        } else {
                            resword = this.wordlookup[baconian][0]
                        }
                    }
                    result.append(resword + " ");
                    if (wordindex > this.state.words.length) {
                        this.state.words.push(resword)
                    } else {
                        this.state.words[wordindex] = resword
                    }
                    wordindex++
                }
            }
        } else {
            let strings = this.makeReplacement(cipherString, this.getEncodeWidth())
            for (let strset of strings) {
                result.append($('<div>', { class: "BACON TOSOLVE" }).text(strset[2]))
                result.append($('<div>', { class: "BACON TOSOLVE2" }).text(strset[1]))
                result.append($('<div>', { class: "BACON TOANSWER" }).text(strset[0]))
            }
        }
        return result
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    genQuestion(): JQuery<HTMLElement> {
        let result = $("<div>")
        let strings = this.makeReplacement(this.getEncodingString(), this.getEncodeWidth())
        for (let strset of strings) {
            result.append($('<div>', { class: "BACON TOSOLVEQ" }).text(strset[2]))
        }
        return result
    }
    genSolution(): JQuery<HTMLElement> {
        let result = $("<div/>")
        if (this.state.operation === 'words') {
            result.append($("<h3/>").text("Baconian Words Not yet implemented"))
        } else {
            result.append($("<p/>").text("The A letters are represented by '" + this.state.texta +
                "' and the B letters by '" + this.state.textb + "'"))
        }
        return result
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        super.attachHandlers()
        $("#texta").off('input').on('input', (e) => {
            let texta = $(e.target).val() as string
            this.markUndo()
            if (this.setTexta(texta)) {
                this.updateOutput()
            }
        })
        $("#textb").off('input').on('input', (e) => {
            let textb = $(e.target).val() as string
            this.markUndo()
            if (this.setTextb(textb)) {
                this.updateOutput()
            }
        })
        $(".abclick").off('click').on('click', (e) => {
            let id = $(e.target).attr('id') as string
            let c = id.substr(1, 1)
            this.markUndo()
            this.toggleAB(c)
            this.updateOutput()
        })
        $("#linewidth").off('input').on('input', (e) => {
            let linewidth = $(e.target).val() as number
            this.markUndo()
            if (this.setLineWidth(linewidth)) {
                this.updateOutput()
            }
        })
    }
}
