/// <reference types="ciphertypes" />

import { CipherEncoder } from "./cipherencoder"
import { IState } from "./cipherhandler";
import { ICipherType } from "./ciphertypes";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";

type operationType = "encode" | "decode"
interface IVigenereState extends IState {
    /** The type of operation */
    operation: operationType
    /** The size of the chunking blocks for output - 0 means respect the spaces */
    blocksize: number
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Vigenere Encoder
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
export class CipherVigenereEncoder extends CipherEncoder {
    defaultstate: IVigenereState = {
        /** The current cipher type we are working on */
        cipherType: ICipherType.Vigenere,
        /** Currently selected keyword */
        keyword: "",
        /** The current cipher we are working on */
        cipherString: "",
        /** The current string we are looking for */
        findString: "",
        operation: "encode",
        blocksize: 0,
    }
    state: IVigenereState = { ...this.defaultstate }

    restore(data: IState): void {
        this.state = { ... this.defaultstate }
        this.copyState(this.state, data)
        this.setUIDefaults()
        this.updateOutput()
    }
    /**
     * Make a copy of the current state
     */
    save(): IState {
        // We need a deep copy of the save state
        let savestate = { ...this.state }
        // And the replacements hash also has to have a deep copy
        savestate.replacements = { ...this.state.replacements }
        return savestate
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    setUIDefaults(): void {
        this.setOperation(this.state.operation)
        this.setBlocksize(this.state.blocksize)
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    updateOutput(): void {
        this.updateQuestionsOutput()
        if (this.state.operation === 'encode') {
            $('.blocksize').show()
            // Change the button label to 'Encode'
            $('#load').val('Encode')

        } else {
            // During decode, message format will not be changed.
            $('.blocksize').hide()
            // Change button label to 'Decode'
            $('#load').val('Decode')
        }
        $("#load").prop('disabled', (this.state.keyword === ''))
        JTRadioButtonSet("operation", this.state.operation)
        $("#toencode").val(this.state.cipherString)
        $("#blocksize").val(this.state.blocksize)
        $("#keyword").val(this.state.keyword)
    }

    genPreCommands(): JQuery<HTMLElement> {

        let result = $("<div/>")
        let radiobuttons = [
            { id: 'wrow', value: "encode", title: 'Encode' },
            { id: 'mrow', value: "decode", title: 'Decode' },
        ]
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation))
        result.append(this.genQuestionFields())

        result.append(JTFLabeledInput("Message", 'text', 'toencode', this.state.cipherString, "small-12 medium-12 large-12"))
        result.append(JTFLabeledInput("Key", 'text', 'keyword', this.state.keyword, "small-12 medium-12 large-12"))

        let inputbox = $("<div/>", { class: "grid-x grid-margin-x blocksize" })
        inputbox.append(JTFIncButton("Block Size", "blocksize", this.state.blocksize, ""))
        result.append(inputbox)

        return result

    }
    /**
     * Set vigenere encode or decode mode
     */
    setOperation(operation: operationType): void {
        this.state.operation = operation
    }
    setBlocksize(blocksize: number): void {
        this.state.blocksize = blocksize
    }
    setKeyword(keyword: string): void {
        this.state.keyword = keyword
    }

    buildVigenere(msg: string, key: string): JQuery<HTMLElement> {
        let i
        let charset = this.getCharset()
        let message = ''
        let keyIndex = 0
        let keyString = ''
        let cipher = ''
        let result = $('<div>')
        let msgLength = msg.length
        let keyLength = key.length
        let lastSplit = -1
        let c = 0

        //        if (msgLength > keyLength) {
        let factor = (msgLength / keyLength).toFixed(0)
        for (i = 0; i < factor; i++) {
            keyString = keyString.concat(key)
        }
        keyString += key.substr(0, msgLength % keyLength)
        //        }
        for (i = 0; i < msgLength; i++) {
            let messageChar = msg.substr(i, 1).toUpperCase()
            let m = charset.indexOf(messageChar)
            if (m >= 0) {

                let keyChar = keyString.substr(keyIndex, 1).toUpperCase()
                let k = charset.indexOf(keyChar)
                while (k < 0) {
                    keyIndex++
                    keyChar = keyString.substr(keyIndex, 1).toUpperCase()
                    k = charset.indexOf(keyChar)
                }

                message += messageChar
                // For vigenere...this is the meat.
                if (this.state.operation === "encode") {
                    // use this to encode.
                    c = (m + k) % 26
                } else {
                    // use this to decode.
                    c = (m - k)
                }
                // The substr() basically does modulus with the negative offset
                // in the decode case.  Thanks JavaScript!
                cipher += charset.substr(c, 1)
                keyIndex++
            } else {
                message += messageChar
                cipher += messageChar
                lastSplit = cipher.length
                continue
            }
            if (message.length >= this.maxEncodeWidth) {
                if (lastSplit === -1) {
                    result.append($('<div>', { class: "TOSOLVE" }).text(message))
                    result.append($('<div>', { class: "TOANSWER" }).text(cipher))
                    message = ''
                    cipher = ''
                    lastSplit = -1
                } else {
                    let messagePart = message.substr(0, lastSplit)
                    let cipherPart = cipher.substr(0, lastSplit)
                    message = message.substr(lastSplit)
                    cipher = cipher.substr(lastSplit)
                    result.append($('<div>', { class: "TOSOLVE" }).text(messagePart))
                    result.append($('<div>', { class: "TOANSWER" }).text(cipherPart))

                }
            }
        }
        if (message.length > 0) {
            result.append($('<div>', { class: "TOSOLVE" }).text(message))
            result.append($('<div>', { class: "TOANSWER" }).text(cipher))
        }

        return result
    }
    /**
     * Loads up the values for vigenere
     */
    load(): void {
        let encoded = this.cleanString(this.state.cipherString)
        /*
        * If it is characteristic of the cipher type (e.g. patristocrat),
        * rebuild the string to be encoded in to five character sized chunks.
        */
        if (this.state.blocksize > 0 && this.state.blocksize < this.maxEncodeWidth) {
            encoded = this.chunk(encoded, this.state.blocksize)
        }

        let key = this.cleanString(this.state.keyword)
        $('#err').text('')
        let res = this.buildVigenere(encoded, key)
        $('#answer').empty().append(res)
        this.attachHandlers()
    }

    buildCustomUI(): void {
        super.buildCustomUI()
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        super.attachHandlers()
        $('[name="operation"]').off('click').on('click', (e) => {
            $(e.target).siblings().removeClass('is-active');
            $(e.target).addClass('is-active');
            this.markUndo()
            this.setOperation($(e.target).val() as operationType)
            this.updateOutput()
        });
        $("#blocksize").off('input').on('input', (e) => {
            let blocksize = Number($(e.target).val())
            if (blocksize !== this.state.blocksize) {
                this.markUndo()
                this.setBlocksize(blocksize)
                if (blocksize !== this.state.blocksize) {
                    $(e.target).val(this.state.blocksize)
                }
            }
        })
        $('#keyword').off('input').on('input', (e) => {
            let newkeyword = $(e.target).val() as string
            if (newkeyword !== this.state.keyword) {
                this.markUndo("keyword")
                this.setKeyword(newkeyword)
                this.updateOutput()
            }
        })

    }
}
