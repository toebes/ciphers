import { CipherEncoder } from "./cipherencoder"
import { IState } from "./cipherhandler";
import { ICipherType } from "./ciphertypes"
import { JTButtonItem } from "./jtbuttongroup";

export class CipherCounter extends CipherEncoder {
    defaultstate: IState = {
        cipherString: "",
        /** The type of cipher we are doing */
        cipherType: ICipherType.Counter,
    }
    state: IState = { ...this.defaultstate }
    cmdButtons: JTButtonItem[] = [
        { title: "Count", color: "primary", id: "load", },
    ]
    restore(data: SaveSet): void {
        this.state = this.defaultstate
        if (data.cipherString !== undefined) {
            this.state.cipherString = data.cipherString
        }
        $("#toencode").val(this.state.cipherString)
        this.setUIDefaults()
    }
    /**
     * Make a copy of the current state
     */
    save(): IState {
        // We need a deep copy of the save state
        let savestate = { ...this.state }
        return savestate
    }
    /**
     * Initializes the encoder.
     * We don't want to show the reverse replacement since we are doing an encode
     */
    init(): void {
        this.state = { ...this.defaultstate }
        this.ShowRevReplace = false
    }
    /**
     *
     */
    attachHandlers(): void {
        super.attachHandlers()
    }
    makeCommands(): JQuery<HTMLElement> {
        return null
    }
    /**
     *
     */
    buildCustomUI(): void {
        super.buildCustomUI()
    }

    load(): void {
        this.state.cipherString = this.cleanString(<string>$('#toencode').val())
        let res = this.build(this.state.cipherString)
        $("#answer").empty().append(res)
        // Show the update frequency values
        this.displayFreq()
        // We need to attach handlers for any newly created input fields
        this.attachHandlers()
    }

    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.
     * @param {string} str String to be encoded
     * @returns {string} HTML of encoded string to display
     */
    build(str: string): JQuery<HTMLElement> {
        let charset = this.getCharset()
        let sourcecharset = this.getSourceCharset()
        // Zero out the frequency table
        this.freq = {}
        for (let i = 0, len = sourcecharset.length; i < len; i++) {
            this.freq[sourcecharset.substr(i, 1).toUpperCase()] = 0
        }
        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (let i = 0, len = str.length; i < len; i++) {
            let t = str.substr(i, 1).toUpperCase()
            // Make sure that this is a valid character to map from
            let pos = charset.indexOf(t)
            if (pos >= 0) {
                if (isNaN(this.freq[t])) {
                    this.freq[t] = 0
                }
                this.freq[t]++
            }
        }
        return null
    }
    /**
     * Create an view/edit field for a dropdown
     * @param {string} str character to generate dropdown for
     * @returns {string} HTML of field
     */
    makeFreqEditField(c: string): JQuery<HTMLElement> {
        return null
    }
}
