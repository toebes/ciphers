import { cloneObject } from "./ciphercommon";
import { CipherHandler, IState } from "./cipherhandler"
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";

export interface IEncoderState extends IState {
    /** Type of encoding */
    encodeType?: string
    /** K1/K2/K3/K4 Keyword */
    keyword2?: string
    /** K1/K2/K3/K4 Offset */
    offset?: number
    /** K3 Shift amount */
    shift?: number
    /** K4 Offset */
    offset2?: number
    /** The source character map */
    alphabetSource?: string
    /** The restination character map */
    alphabetDest?: string
}

/**
 * CipherEncoder - This class handles all of the actions associated with encoding
 * a cipher.
 */
export class CipherEncoder extends CipherHandler {
    defaultstate: IEncoderState = {
        cipherString: "",
        cipherType: ICipherType.Aristocrat,
        encodeType: "random",
        offset: 1,
        shift: 1,
        offset2: 1,
        keyword: "",
        keyword2: "",
        alphabetSource: "",
        alphabetDest: "",
    }
    state: IEncoderState = cloneObject(this.defaultstate) as IState
    cmdButtons: JTButtonItem[] = [
        { title: "Randomize", color: "primary", id: "randomize", disabled: true },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset", },
    ]
    restore(data: IEncoderState): void {
        let curlang = this.state.curlang
        this.state = cloneObject(this.defaultstate) as IState
        this.state.curlang = curlang
        this.copyState(this.state, data)
        this.setCharset(this.acalangcharset[this.state.curlang])
        this.setSourceCharset(this.encodingcharset[this.state.curlang])
        this.setUIDefaults()
        this.updateOutput()
    }
    setUIDefaults(): void {
        this.setEncType(this.state.encodeType)
        this.setOffset(this.state.offset)
        this.setShift(this.state.shift)
        this.setOffset2(this.state.offset2)
    }
    updateOutput(): void {
        this.updateQuestionsOutput();
        $("#toencode").val(this.state.cipherString)
        $("#keyword").val(this.state.keyword)
        $("#offset").val(this.state.offset)
        $("#shift").val(this.state.shift)
        $("#keyword2").val(this.state.keyword2)
        $("#offset2").val(this.state.offset2)
        JTRadioButtonSet("enctype", this.state.encodeType)
        $(".lang").val(this.state.curlang)
        this.setkvalinputs()
        this.load()
    }
    updateQuestionsOutput(): void {
        $("#points").val(this.state.points);
        this.setRichText("qtext", this.state.question)
    }

    save(): IEncoderState {
        let result: IEncoderState = cloneObject(this.state) as IState
        return result
    }
    /**
     * Initializes the encoder.
     * We don't want to show the reverse replacement since we are doing an encode
     * @param {string} lang Language to select (EN is the default)
     */
    init(lang: string): void {
        //this.ShowRevReplace = false
        this.state = cloneObject(this.defaultstate) as IState
        this.state.curlang = lang
        this.setCharset(this.acalangcharset[this.state.curlang])
        this.setSourceCharset(this.encodingcharset[this.state.curlang])
    }

    /**
     * Enable / Disable the HTML elements based on the alphabet selection
     */
    setkvalinputs(): void {
        let val = this.state.encodeType
        if (val === 'random') {
            $("#randomize").removeAttr("disabled")
            $(".kval").hide()
        } else {
            $("#randomize").prop("disabled", true)
            $(".kval").show()
        }
        if (val === 'k3') {
            $(".k3val").show()
        } else {
            $(".k3val").hide()
        }
        if (val === 'k4') {
            $(".k4val").show()
        } else {
            $(".k4val").hide()
        }
    }
    setEncType(encodeType: string): boolean {
        let changed = false
        if (this.state.encodeType !== encodeType) {
            this.state.encodeType = encodeType
            this.resetAlphabet()
            changed = true
        }
        return changed
    }
    setCipherString(cipherString: string): boolean {
        let changed = false
        if (this.state.cipherString !== cipherString) {
            this.state.cipherString = cipherString
            this.resetAlphabet()
            changed = true
        }
        return changed
    }
    setKeyword(keyword: string): boolean {
        let changed = false
        if (this.state.keyword !== keyword) {
            this.state.keyword = keyword
            this.resetAlphabet()
            changed = true
        }
        return changed
    }
    setKeyword2(keyword2: string): boolean {
        let changed = false
        if (this.state.keyword2 !== keyword2) {
            this.state.keyword2 = keyword2
            this.resetAlphabet()
            changed = true
        }
        return changed
    }
    setOffset(offset: number): boolean {
        let changed = false
        let charset = this.getCharset()
        offset = (offset + charset.length) % charset.length
        if (this.state.offset !== offset) {
            this.state.offset = offset
            this.resetAlphabet()
            changed = true
        }
        return changed
    }
    setOffset2(offset2: number): boolean {
        let changed = false
        let charset = this.getCharset()
        offset2 = (offset2 + charset.length) % charset.length
        if (this.state.offset2 !== offset2) {
            this.state.offset2 = offset2
            this.resetAlphabet()
            changed = true
        }
        return changed
    }
    setShift(shift: number): boolean {
        let changed = false
        let charset = this.getCharset()
        shift = (shift + charset.length) % charset.length
        if (this.state.shift !== shift) {
            this.state.shift = shift
            this.resetAlphabet()
            changed = true
        }
        return changed
    }
    /**
     * Loads a language in response to a dropdown event
     * @param lang Language to load
     */
    loadLanguage(lang: string): void {
        this.state.curlang = lang
        this.setCharset(this.acalangcharset[lang])
        this.setSourceCharset(this.encodingcharset[lang])
        // Call the super if we plan to match the text against a dictionary.
        // That is generally used for a solver, but we might want to do it in the
        // case that we want to analyze the complexity of the phrase
        // super.loadLanguage(lang)
    }

    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        super.attachHandlers()
        $('[name="enctype"]').off('click').on('click', (e) => {
            $(e.target).siblings().removeClass('is-active');
            $(e.target).addClass('is-active');
            this.markUndo()
            if (this.setEncType($(e.target).val() as string)) {
                this.updateOutput()
            }
        });
        $("#offset").off('input').on('input', (e) => {
            let offset = Number($(e.target).val())
            if (offset !== this.state.offset) {
                this.markUndo()
                if (this.setOffset(offset)) {
                    this.updateOutput()
                }
            }
        })
        $("#shift").off('input').on('input', (e) => {
            let shift = Number($(e.target).val())
            if (shift !== this.state.shift) {
                this.markUndo()
                if (this.setShift(shift)) {
                    this.updateOutput()
                }
            }
        })
        $("#offset2").off('input').on('input', (e) => {
            let offset2 = Number($(e.target).val())
            if (offset2 !== this.state.offset2) {
                this.markUndo()
                if (this.setOffset2(offset2)) {
                    this.updateOutput()
                }
            }
        })
        $("#keyword").off('input').on('input', (e) => {
            let keyword = $(e.target).val() as string
            if (keyword !== this.state.keyword) {
                this.markUndo("keyword")
                if (this.setKeyword(keyword)) {
                    this.updateOutput()
                }
            }
        })
        $("#keyword2").off('input').on('input', (e) => {
            let keyword2 = $(e.target).val() as string
            if (keyword2 !== this.state.keyword2) {
                this.markUndo("keyword2")
                if (this.setKeyword2(keyword2)) {
                    this.updateOutput()
                }
            }
        })
        $("#points").off('input').on('input', (e) => {
            let points = Number($(e.target).val())
            if (points !== this.state.points) {
                this.markUndo("points")
                this.state.points = points
            }
        })
        $("#qtext").off('richchange').on('richchange', (e, newtext) => {
            let question = newtext
            if (question !== this.state.question) {
                this.markUndo("question")
                this.state.question = question
            }
        })
        $("#toencode").off('input').on('input', (e) => {
            let cipherString = $(e.target).val() as string
            if (cipherString !== this.state.cipherString) {
                this.markUndo("cipherString")
                if (this.setCipherString(cipherString)) {
                    this.updateOutput()
                }
            }
        })
        $("#randomize").off("click").on("click", () => {
            this.markUndo()
            this.resetAlphabet()
            this.updateOutput()
        })

    }
    /**
     * Reset the alphabet mapping so that we generate a new one
     */
    resetAlphabet(): void {
        this.state.alphabetSource = ""
        this.state.alphabetDest = ""
    }
    /**
     * Generate the maping from the source to the destination alphabet
     */
    genAlphabet(): void {
        // If we already have a mapping, then we stay with it
        if ((this.state.alphabetSource !== "") && (this.state.alphabetSource !== undefined) &&
            (this.state.alphabetDest !== "") && (this.state.alphabetDest !== undefined)) {
            this.setReplacement(this.state.alphabetSource, this.state.alphabetDest)
            return
        }
        if (this.state.encodeType === 'k1') {
            this.genAlphabetK1(this.state.keyword, this.state.offset)
        } else if (this.state.encodeType === 'k2') {
            this.genAlphabetK2(this.state.keyword, this.state.offset)
        } else if (this.state.encodeType === 'k3') {
            this.genAlphabetK3(this.state.keyword, this.state.offset, this.state.shift)
        } else if (this.state.encodeType === 'k4') {
            this.genAlphabetK4(this.state.keyword, this.state.offset, this.state.keyword2, this.state.offset2)
        } else {
            this.genAlphabetRandom()
        }
    }

    /**
     * Compute the replacement set for the the characters on an encryption
     * Note that we actually have to reverse them because the ciphers class
     * is mostly built around decrypting
     * @param {string} repl Replacement character set
     * @param {string} cset Source character set
     */
    setReplacement(cset: string, repl: string): void {
        let errors = ''
        this.state.alphabetSource = cset
        this.state.alphabetDest = repl
        console.log('Set Replacement cset=' + cset + ' repl=' + repl)
        // Figure out what letters map to the destination letters.  Note that
        // the input chracterset alphabet may not be in the same order as the
        // actual alphabet.
        for (let i = 0, len = repl.length; i < len; i++) {
            let repc = repl.substr(i, 1)
            let orig = cset.substr(i, 1)
            // Remember that we are backwards because this an encoder
            this.setChar(orig, repc)
            // Just make sure that we don't happen to have the same character
            // at this position
            if (repc === orig) {
                errors += repc
            }
        }
        if (errors !== '') {
            console.log(errors)
            $(".err").text('Bad keyword/offset combo for letters: ' + errors)
        }
    }
    /**
     * Generate a K1 alphabet where the keyword is in the source alphabet
     * @param keyword Keyword/keyphrase to map
     * @param offset Offset from the start of the alphabet to place the keyword
     */
    genAlphabetK1(keyword: string, offset: number): void {
        let repl = this.genKstring(keyword, offset, this.getCharset())
        this.setReplacement(this.getSourceCharset(), repl)
    }
    /**
     * Generate a K2 alphabet where the keyword is in the destination alphabet
     * @param keyword Keyword/Keyphrase to map
     * @param offset Offset from the start of the alphabet to place the keyword
     */
    genAlphabetK2(keyword: string, offset: number): void {
        let repl = this.genKstring(keyword, offset, this.getSourceCharset())
        this.setReplacement(repl, this.getCharset())
    }
    /**
     * Generate a K3 alphabet where both alphabets are the same using a Keyword
     * like a K1 or K2 alphabet, but both are the same alphabet order.
     * It is important to note that for a K3 alphabet you must have the same
     * alphabet for source and destination.  This means languages like Swedish
     * and Norwegian can not use a K3
     * @param keyword Keyword/Keyphrase to map
     * @param offset Offset from the start of the alphabet to place the keyword
     * @param shift Shift of the destination alphabet from the source alphabet
     */
    genAlphabetK3(keyword: string, offset: number, shift: number): void {
        if (this.getCharset() !== this.getSourceCharset()) {
            let error = 'Source and encoding character sets must be the same'
            console.log(error)
            $(".err").text(error)
            return
        }
        let repl = this.genKstring(keyword, offset, this.getCharset())
        let cset = repl.substr(shift) + repl.substr(0, shift)
        this.setReplacement(cset, repl)
    }
    /**
     * Generate a K4 alphabet where the keywords are different in each alphabet
     * @param keyword Keyword for the source alphabet
     * @param offset Offset for keyword in the source alphabet
     * @param keyword2 Keyword for the destination alphabet
     * @param offset2 Offset for the keyword in the destination alphabet
     */
    genAlphabetK4(keyword: string, offset: number, keyword2: string, offset2: number): void {
        if (this.getCharset().length !== this.getSourceCharset().length) {
            let error = 'Source and encoding character sets must be the same length'
            console.log(error)
            $(".err").text(error)
            return
        }
        let cset = this.genKstring(keyword, offset, this.getCharset())
        let repl = this.genKstring(keyword2, offset2, this.getSourceCharset())
        this.setReplacement(cset, repl)
    }
    /**
     * Map a keyword into an alphabet
     * @param keyword Keyword to map into the alphabet
     * @param offset Offset from the start of the alphabet to place the keyword
     */
    genKstring(keyword: string, offset: number, alphabet: string): string {
        let unasigned = alphabet
        let repl = ""

        // Go through each character in the source string one at a time
        // and see if it is a legal character.  if we have not already seen
        // it, then remove it from the list of legal characters and add it
        // to the output string
        for (let i = 0, len = keyword.length; i < len; i++) {
            let c = keyword.substr(i, 1).toUpperCase()
            // Is it one of the characters we haven't used?
            let pos = unasigned.indexOf(c)
            if (pos >= 0) {
                // we hadn't used it, so save it away and remove it from
                // the list of ones we haven't used
                repl += c
                unasigned = unasigned.substr(0, pos) + unasigned.substr(pos + 1)
            }
        }
        repl = unasigned.substr(unasigned.length - offset) + repl + unasigned.substr(0, unasigned.length - offset)
        return repl
    }
    /**
     * Gets a random replacement character from the remaining set of unassigned
     * characters
     * @returns {string} Single character replacement
     */
    getRepl(): string {
        let sel = Math.floor(Math.random() * this.unasigned.length)
        let res = this.unasigned.substr(sel, 1)
        this.unasigned = this.unasigned.substr(0, sel) + this.unasigned.substr(sel + 1)
        return res
    }
    /**
     *  Generates a random replacement set of characters
     * @returns {string} Replacement set of characters
     */
    genAlphabetRandom(): void {
        let charset = this.getCharset()
        this.unasigned = charset
        let replacement = ""
        let pos = 0

        while (this.unasigned.length > 1) {
            let orig = charset.substr(pos, 1)
            let repl = this.getRepl()
            // If the replacement character is the same as the original
            // then we just get another one and put the replacement back at the end
            // This is guaranteed to be unique
            if (orig === repl) {
                let newrepl = this.getRepl()
                this.unasigned += repl
                repl = newrepl
            }
            replacement += repl
            pos++
        }

        // Now we have to handle the special case of the last character
        if (charset.substr(pos, 1) === this.unasigned) {
            // Just pick a random spot in what we have already done and
            // swap it.  We are guaranteed that it won't be the last character
            // since it matches already
            let sel = Math.floor(Math.random() * replacement.length)
            replacement = replacement.substr(0, sel) + this.unasigned + replacement.substr(sel + 1) + replacement.substr(sel, 1)
        } else {
            replacement += this.unasigned
        }
        this.setReplacement(this.getSourceCharset(), replacement)
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    genAnswer(): JQuery<HTMLElement> {
        let result = $("<div>")
        this.genAlphabet()
        let strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth)
        for (let strset of strings) {
            result.append($('<div>', { class: "TOSOLVE" }).text(strset[0]))
            result.append($('<div>', { class: "TOANSWER" }).text(strset[1]))
        }
        result.append(this.genFreqTable(true, this.state.encodeType))
        return result
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    genQuestion(): JQuery<HTMLElement> {
        let result = $("<div>")
        this.genAlphabet()
        let strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth)
        for (let strset of strings) {
            result.append($('<div>', { class: "TOSOLVEQ" }).text(strset[0]))
        }
        result.append(this.genFreqTable(false, this.state.encodeType))
        return result
    }
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.  This returns the result
     * as the HTML to be displayed
     */
    build(): JQuery<HTMLElement> {
        let str = this.cleanString(this.state.cipherString)

        /*
         * If it is characteristic of the cipher type (e.g. patristocrat),
         * rebuild the string to be encoded in to five character sized chunks.
         */
        if (this.state.cipherType === ICipherType.Patristocrat) {
            str = this.chunk(str, 5)
        }

        let result = $('<div>')
        let strings = this.makeReplacement(str, this.maxEncodeWidth)
        for (let strset of strings) {
            result.append($('<div>', { class: "TOSOLVE" }).text(strset[0]))
            result.append($('<div>', { class: "TOANSWER" }).text(strset[1]))
        }
        this.UpdateFreqEditTable()
        this.displayFreq()
        return result
    }
    /**
     * Generates the HTML code for allowing an encoder to select the alphabet type
     * along with specifying the parameters for that alphabet
     * @returns HTML Elements for selecting the alphabet
     */
    createAlphabetType(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: "grid-x" })

        let radiobuttons = [
            { id: 'encrand', value: "random", title: 'Random' },
            { id: 'enck1', value: "k1", title: 'K1' },
            { id: 'enck2', value: "k2", title: 'K2' },
            { id: 'enck3', value: "k3", title: 'K3' },
            { id: 'enck4', value: "k4", title: 'K4' },
        ]
        result.append($('<div>', { class: "cell" }).text("Alphabet Type"))
        result.append(JTRadioButton(12, 'enctype', radiobuttons, this.state.encodeType))

        result.append(JTFLabeledInput("Keyword", 'text', 'keyword', this.state.keyword, "kval"))
        result.append(JTFIncButton("Offset", "offset", this.state.offset, "kval small-12 medium-6 large-6"))
        result.append(JTFIncButton("Shift", "shift", this.state.shift, "k3val small-12 medium-6 large-6"))
        result.append(JTFLabeledInput("Keyword 2", 'text', 'keyword2', this.state.keyword2, "k4val"))
        result.append(JTFIncButton("Offset 2", "offset2", this.state.offset2, "k4val small-12 medium-6 large-4"))
        return result
    }
    /**
     * Loads up the values for the encoder
     */
    load(): void {
        // this.hideRevReplace = true
        let encoded = this.cleanString(this.state.cipherString)
        $(".err").text('')
        this.genAlphabet()
        let res = this.build()
        $("#answer").empty().append(res)

        /* testStrings */
        for (let teststr of this.testStrings) {
            let chi1 = this.CalculateChiSquare(teststr)
            teststr = this.cleanString(teststr)
            let l = teststr.length
            console.log(l + '`' + chi1 + '`' + teststr)
        }

        let chi = this.CalculateChiSquare(encoded)

        let chitext = ''
        if (!isNaN(chi)) {
            chitext = "Chi-Square Value=" + chi.toFixed()
            if (chi < 20) {
                chitext += ' [Easy]'
            } else if (chi < 30) {
                chitext += ' [Medium]'
            } else if (chi < 40) {
                chitext += ' [Medium Hard]'
            } else if (chi < 50) {
                chitext += ' [Difficult]'
            } else {
                chitext += ' [Extremely Difficult]'
            }
            chitext += ' Length=' + encoded.length
            if (encoded.length < 60) {
                chitext += ' [Too Short]'
            } else if (encoded.length < 80) {
                chitext += ' [Short]'
            } else if (encoded.length > 120) {
                chitext += ' [Too Long]'
            } else if (encoded.length > 100) {
                chitext += ' [Long]'
            }
        }

        $("#chi").text(chitext)
        // Show the update frequency values
        this.displayFreq()
        // We need to attach handlers for any newly created input fields
        this.attachHandlers()
    }

    makeFreqEditField(c: string): JQuery<HTMLElement> {
        let einput = $('<span/>', { type: "text", 'data-char': c, id: 'm' + c })
        return einput
    }
    genQuestionFields(): JQuery<HTMLElement> {
        let result = $("<div/>")
        result.append(JTFLabeledInput("Points", 'number', 'points', this.state.points, "small-12 medium-12 large-12"))
        result.append(JTFLabeledInput("Question Text", 'richtext', 'qtext', this.state.question, "small-12 medium-12 large-12"))
        return result.children()
    }

    genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>")
        result.append(this.genQuestionFields())
        result.append(this.getLangDropdown())
        result.append(JTFLabeledInput("Text to encode", 'textarea', 'toencode', this.state.cipherString, "small-12 medium-12 large-12"))
        result.append(this.createAlphabetType())
        return result
    }
}
