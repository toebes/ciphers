import { cloneObject } from "./ciphercommon";
import { CipherEncoder } from "./cipherencoder"
import { IState } from "./cipherhandler";
import { ICipherType } from "./ciphertypes"
import { JTButtonItem } from "./jtbuttongroup";
import { JTFLabeledInput } from "./jtflabeledinput";

export class CipherCounter extends CipherEncoder {
    defaultstate: IState = {
        cipherString: "",
        /** The type of cipher we are doing */
        cipherType: ICipherType.Counter,
        curlang: "en",
    }
    state: IState = cloneObject(this.defaultstate) as IState
    cmdButtons: JTButtonItem[] = [
        // { title: "Save", color: "primary", id: "save", },
    ]
    /**
     * Make a copy of the current state
     */
    save(): IState {
        // We need a deep copy of the save state
        let savestate = cloneObject(this.state) as IState
        return savestate
    }
    /**
     * Initializes the encoder.
     * We don't want to show the reverse replacement since we are doing an encode
     */
    init(lang: string): void {
        super.init(lang)
        this.ShowRevReplace = false
    }
    genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>")
        result.append(JTFLabeledInput("Text to count", 'textarea', 'toencode', this.state.cipherString, "small-12 medium-12 large-12"))
        return result
    }
    genPostCommands(): JQuery<HTMLElement> {
        return null
    }
    load(): void {
        let res = this.build()
        $("#answer").empty().append(res)
        this.UpdateFreqEditTable()
        // Show the update frequency values
        this.displayFreq()
        // We need to attach handlers for any newly created input fields
        this.attachHandlers()
    }
    setUIDefaults(): void {
    }
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.
     */
    build(): JQuery<HTMLElement> {
        let str = this.state.cipherString
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
}
