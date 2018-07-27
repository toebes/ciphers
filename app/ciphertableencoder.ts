/// <reference types="ciphertypes" />

import { CipherEncoder, IEncoderState } from "./cipherencoder"
import { CypherTypeButtonItem, ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";

/**
 * CipherTableEncoder - This class handles all of the actions associated with encoding
 * a Caesar or Atbash cipher.
 */
export class CipherTableEncoder extends CipherEncoder {
    defaultstate: IEncoderState = {
        cipherString: "",
        cipherType: ICipherType.Caesar,
        offset: 0,
    }
    state: IEncoderState = { ...this.defaultstate }
    /** Save and Restore are done on the CipherEncoder Class */
    save(): IEncoderState {
        return super.save()
    }
    restore(data: IEncoderState): void {
        super.restore(data)
    }
    setUIDefaults(): void {
        this.setCipherType(this.state.cipherType)
        this.setOffset(this.state.offset)
    }
    updateOutput(): void {
        this.updateQuestionsOutput();
        $("#toencode").val(this.state.cipherString)
        $("#offset").val(this.state.offset)
        if (this.state.cipherType === ICipherType.Caesar) {
            $(".offset").show()
        } else {
            $(".offset").hide()
        }
        JTRadioButtonSet("ciphertype", this.state.cipherType)
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
    genMap(): void {
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
        let encoded = this.cleanString(this.state.cipherString)

        $(".err").text('')
        this.genMap()
        let res = this.build(encoded)
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

        let radiobuttons = [
            CypherTypeButtonItem(ICipherType.Caesar),
            CypherTypeButtonItem(ICipherType.Atbash),
        ]
        result.append(JTRadioButton(8, 'ciphertype', radiobuttons, this.state.cipherType))
        result.append(this.genQuestionFields())
        result.append(JTFLabeledInput("Text to encode", 'textarea', 'toencode', this.state.cipherString, "small-12 medium-12 large-12"))
        result.append(JTFIncButton("Offset", "offset", this.state.offset, "offset small-12 medium-6 large-6"))
        return result
    }
}
