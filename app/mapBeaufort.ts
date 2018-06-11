/// <reference types="ciphertypes" />

const Aval = "A".charCodeAt(0)

import Mapper from "./mapper"
export default class mapBeaufort extends Mapper {
    /**
     * Map two unencoded characters using the Beaufort mapping table
     *  Formula CT = KEY - pt
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
        let ctval = ckey.charCodeAt(0) - cpt.charCodeAt(0)
        return this.getCharCode(ctval)
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Beaufort mapping table
     *  Formula pt = KEY - CT
     * Since the forula is the same as the encoding, we just use that routine
     * @param ct Encoded character
     * @param ckey Unencoded character
     */
    decode(ct: string, ckey: string): string {
        return this.encode(ct, ckey)
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Beaufort mapping table.
     *  Formula KEY = CT+pt
     * @param ct Encoded character
     * @param cpt Unencoded character
     */
    decodeKey(ct: string, cpt: string): string {
        cpt = cpt.toUpperCase()
        ct = ct.toUpperCase()
        // If either character is not an alphabetic, then we can't map it
        if ((cpt.toLowerCase() === cpt) || (ct.toLowerCase() === ct)) {
            return '?';
        }
        let keyval = (ct.charCodeAt(0) - Aval) + (cpt.charCodeAt(0) - Aval)
        return this.getCharCode(keyval)
    }
}