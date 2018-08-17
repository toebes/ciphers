import { cloneObject } from "./ciphercommon";
import { CipherEncoder, IEncoderState } from "./cipherencoder"
import { CypherTypeButtonItem, ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";

/**
 * CipherTableEncoder - This class handles all of the actions associated with encoding
 * a Caesar or Atbash cipher.
 */
export class CipherTableEncoder extends CipherEncoder {
    defaultstate: IEncoderState = {
        cipherString: "",
        cipherType: ICipherType.Caesar,
        offset: 1,
        /** The type of operation */
        operation: "decode",
    }
    state: IEncoderState = cloneObject(this.defaultstate) as IEncoderState
    cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save", },
        this.undocmdButton,
        this.redocmdButton,
    ]
    /** Save and Restore are done on the CipherEncoder Class */
    save(): IEncoderState {
        return super.save()
    }
    restore(data: IEncoderState): void {
        super.restore(data)
    }
    setUIDefaults(): void {
        super.setUIDefaults()
        this.setOperation(this.state.operation)
    }
    setOffset(offset: number): boolean {
        let changed = false
        let charset = this.getCharset()
        offset = (offset + charset.length) % charset.length
        if (offset === 0) {
            offset += this.advancedir
            if (this.advancedir === 0) {
                offset++
            }
            offset = (offset + charset.length) % charset.length
        }
        if (this.state.offset !== offset) {
            this.state.offset = offset
            this.resetAlphabet()
            changed = true
        }
        return changed
    }

    updateOutput(): void {
        if (this.state.cipherType === ICipherType.Caesar) {
            $(".offset").show()
        } else {
            $(".offset").hide()
        }
        JTRadioButtonSet("ciphertype", this.state.cipherType)
        JTRadioButtonSet("operation", this.state.operation)
        super.updateOutput()
    }

    /**
     * Initializes the encoder.
     */
    init(lang: string): void {
        super.init(lang)
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        super.attachHandlers()
    }

    /**
     *  Generates the replacement map based on the type of cipher
     */
    genAlphabet(): void {
        let charset = this.getSourceCharset()
        let replacement = charset

        if (this.state.cipherType === ICipherType.Atbash) {
            replacement = charset.split("").reverse().join("")
        } else {
            replacement = charset.substr(this.state.offset) + charset.substr(0, this.state.offset)
        }
        this.setReplacement(charset, replacement)
    }
    /**
     * Loads up the values for the encoder
     */
    load(): void {
        $(".err").text('')
        this.genAlphabet()
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
            CypherTypeButtonItem(ICipherType.Caesar),
            CypherTypeButtonItem(ICipherType.Atbash),
        ]
        result.append(JTRadioButton(8, 'ciphertype', radiobuttons, this.state.cipherType))

        radiobuttons = [
            { id: 'wrow', value: "encode", title: 'Encode' },
            { id: 'mrow', value: "decode", title: 'Decode' },
        ]
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation))

        result.append(this.genQuestionFields())
        result.append(JTFLabeledInput("Text to encode", 'textarea', 'toencode', this.state.cipherString, "small-12 medium-12 large-12"))
        result.append(JTFIncButton("Caesar Offset", "offset", this.state.offset, "offset small-12 medium-6 large-6"))
        return result
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    genAnswer(): JQuery<HTMLElement> {
        let result = $("<div>", {class: "grid-x"})
        this.genAlphabet()
        let strings = this.makeReplacement(this.state.cipherString, 40)
        let table = new JTTable({class: "ansblock shrink cell unstriped"})
        let tosolve = 0
        let toanswer = 1
        if (this.state.operation === "encode") {
            tosolve = 1
            toanswer = 0
        }
        for (let strset of strings) {
            this.addCipherTableRows(table, undefined, strset[tosolve], strset[toanswer], true)
        }
        result.append(table.generate())
        return result
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    genQuestion(): JQuery<HTMLElement> {
        let result = $("<div>", {class: "grid-x"})
        this.genAlphabet()
        let strings = this.makeReplacement(this.state.cipherString, 40)
        let table = new JTTable({class: "ansblock shrink cell unstriped"})
        let tosolve = 0
        if (this.state.operation === "encode") {
            tosolve = 1
        }
        for (let strset of strings) {
            this.addCipherTableRows(table, undefined, strset[tosolve], undefined, true)
        }
        result.append(table.generate())
        return result
    }
}
