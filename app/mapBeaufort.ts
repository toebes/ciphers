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
    // Test cases to confirm that the Beaufort encoders/decoders work
    //     'encBeaufort-aa=A': this.encBeaufort("a","a"), // OK
    //     'encBeaufort-_a=?': this.encBeaufort("_","a"), // OK
    //     'encBeaufort-lo=D': this.encBeaufort("l","o"), // OK
    //     'encBeaufort-Zz=A': this.encBeaufort("Z","z"), // OK
    //     'encBeaufort-Yb=D': this.encBeaufort("Y","b"), // OK
    //     'decBeaufort-aa=A': this.decBeaufort("a","a"), // OK
    //     'decBeaufort-_a=?': this.decBeaufort("_","a"), // OK
    //     'decBeaufort-lo=D': this.decBeaufort("l","o"), // OK
    //     'decBeaufort-Zz=A': this.decBeaufort("Z","z"), // OK
    //     'decBeaufort-Yb=D': this.decBeaufort("Y","b"), // OK
    //     'decKeyBeaufort-aa=A': this.decKeyBeaufort("a","a"), // OK
    //     'decKeyBeaufort-_a=?': this.decKeyBeaufort("_","a"), // OK
    //     'decKeyBeaufort-lo=Z': this.decKeyBeaufort("l","o"), // OK
    //     'decKeyBeaufort-Zz=Y': this.decKeyBeaufort("Z","z"), // OK
    //     'decKeyBeaufort-Yb=Z': this.decKeyBeaufort("Y","b"), // OK
    // }

}