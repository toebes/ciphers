/// <reference types="ciphertypes" />

const Aval = "A".charCodeAt(0)

import Mapper from "./mapper"
export default class mapVigenere extends Mapper {
    /**
     * Map two unencoded characters using the Vigenere mapping table
     * @param cpt Plaintext unencoded character
     * @param ckey Key Unencoded character
     * @returns cipher text (ct) encoded character
     */
    encode(cpt: string, ckey: string): string {
        cpt = cpt.toUpperCase()
        ckey = ckey.toUpperCase()
        // If either character is not an alphabetic, then we can't map it
        if ((cpt.toLowerCase() === cpt) || (ckey.toLowerCase() === ckey)) {
            return '?';
        }
        let ctval = (cpt.charCodeAt(0) - Aval + ckey.charCodeAt(0) - Aval)
        return this.getCharCode(ctval)
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Vigenere mapping table
     * @param ct Encoded character
     * @param ckey Unencoded character
     */
    decode(ct: string, ckey: string): string {
        ckey = ckey.toUpperCase()
        ct = ct.toUpperCase()
        // If either character is not an alphabetic, then we can't map it
        if ((ckey.toLowerCase() === ckey) || (ct.toLowerCase() === ct)) {
            return '?';
        }
        let ptval = (ct.charCodeAt(0) - Aval - ckey.charCodeAt(0) - Aval)
        return this.getCharCode(ptval)
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Vigenere mapping table.  Note that for Vigenere, the table is
     * symetric, so this function is the same as decVigenere
     * @param ct Encoded character
     * @param cpt Unencoded character
     */
    decodeKey(ct: string, cpt: string): string {
        return this.decode(ct, cpt);
    }
}