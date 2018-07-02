/// <reference types="ciphertypes" />

import { CipherEncoder } from "./cipherencoder"

export class CipherVigenereEncoder extends CipherEncoder {
    doEncoding: boolean = true

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Vigenere Encoder
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    layoutVigenere(): JQuery<HTMLElement> {
        let operationChoice = $('<div>')
        let label = $('<label>', { for: 'ops' }).text('Operation')
        operationChoice.append(label)

        let radioBox = $('<div>', { id: 'ops', class: 'ibox' })
        radioBox.append($('<input>', { id: 'encode', type: 'radio', name: 'operation', value: 'encode', checked: 'checked' }))
        radioBox.append($('<label>', { for: 'encode', class: 'rlab' }).text('Encode'))
        radioBox.append($('<input>', { id: 'decode', type: 'radio', name: 'operation', value: 'decode' }))
        radioBox.append($('<label>', { for: 'decode', class: 'rlab' }).text('Decode'))


        operationChoice.append(radioBox)

        return operationChoice
    }
    /**
     * Set vigenere encode or decode mode
     */
    setVigenereInputs(): void {
        let operation = $('input[name=operation]:checked').val()
        if (operation === 'encode') {
            // zero the blocksize spinner and show it
            $(':input[id=blocksize]').spinner('value', 0)
            $('div[id=blocksize]').val('')
            $('div[id=blocksize]').show()
            // Change the button label to 'Encode'
            $(':button').button('option', 'label', 'Encode')
            this.doEncoding = true

        } else {
            // During decode, message format will not be changed.
            $('div[id=blocksize]').hide()
            // Change button label to 'Decode'
            $(':button').button('option', 'label', 'Decode')
            this.doEncoding = false
        }
        // Clear message and answer, leave key alone--for re-use.
        $('textarea[id=inputdata]').val('')
        $(".ans").text('')
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
                if (this.doEncoding) {
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
            }
            else {
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
                }
                else {
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
        let encoded = this.cleanString(<string>$('#inputdata').val())
        /*
        * If it is characteristic of the cipher type (e.g. patristocrat),
        * rebuild the string to be encoded in to five character sized chunks.
        */
        let blockSize = parseInt((<string>$('input[id=blocksize').val()))
        if (blockSize > 0 && blockSize < this.maxEncodeWidth) {
            encoded = this.chunk(encoded, blockSize)
        }

        let key = this.cleanString(<string>$('#keystring').val())
        $('#err').text('')
        let res = this.buildVigenere(encoded, key)
        $('#answer').empty().append(res)
        this.attachHandlers()
    }

    buildCustomUI(): void {
        super.buildCustomUI()
        $('.precmds').each((i, elem) => {
            $(elem).empty().append(this.layoutVigenere())
        })
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        //Argument of type '{ fontNames: string[]; toolbar: TypeOrArray<string>[][]; }' is not assignable to parameter of type '"editor.unlink" | "unlink"'.
        // Type '{ fontNames: string[]; toolbar: TypeOrArray<string>[][]; }' is not assignable to type '"unlink"'.
        $('input[type=radio][name=enctype]').off('change').on('change', (e) => {
            this.setkvalinputs()
        })
        $('input[type=radio][name=operation]').off('change').on('change', (e) => {
            this.setVigenereInputs()
        })
        this.setkvalinputs()
        super.attachHandlers()
    }
}
