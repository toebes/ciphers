/// <reference types="ciphertypes" />

const Aval = "A".charCodeAt(0)

import Mapper from "./mapper"
export default class mapVariant extends Mapper {
    /**
     * Map two unencoded characters using the Variant mapping table
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
        let keyval = ckey.charCodeAt(0) - Aval
        if (keyval > 0) {
            keyval = 26 - keyval
        }
        let ctval = cpt.charCodeAt(0) - Aval + keyval
        return this.getCharCode(ctval)
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Variant mapping table
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
        let keyval = ckey.charCodeAt(0) - Aval
        if (keyval > 0) {
            keyval = 26 - keyval
        }
        let ptval = (ct.charCodeAt(0) - Aval - keyval)
        return this.getCharCode(ptval)
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Variant mapping table.
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
        let keyval = 26 - ((ct.charCodeAt(0) - Aval - cpt.charCodeAt(0) - Aval) % 26)
        return this.getCharCode(keyval)
    }
    // let testmap:StringMap = {
    //     'encVariant-aa=A': this.encVariant("a","a"), // OK
    //     'encVariant-_a=?': this.encVariant("_","a"), // OK
    //     'encVariant-lo=X': this.encVariant("l","o"), // OK
    //     'encVariant-Zz=A': this.encVariant("Z","z"), // OK
    //     'encVariant-Yb=X': this.encVariant("Y","b"), // OK
    //     'decVariant-aa=A': this.decVariant("a","a"), // OK
    //     'decVariant-_a=?': this.decVariant("_","a"), // OK
    //     'decVariant-lo=Z': this.decVariant("l","o"), // OK
    //     'decVariant-Zz=Y': this.decVariant("Z","z"), // OK
    //     'decVariant-Yb=Z': this.decVariant("Y","b"), // OK
    //     'decKeyVariant-aa=A': this.decKeyVariant("a","a"), // OK
    //     'decKeyVariant-_a=?': this.decKeyVariant("_","a"), // OK
    //     'decKeyVariant-lo=D': this.decKeyVariant("l","o"), // OK
    //     'decKeyVariant-Zz=A': this.decKeyVariant("Z","z"), // OK
    //     'decKeyVariant-Yb=D': this.decKeyVariant("Y","b"), // OK
}