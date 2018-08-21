import { Mapper } from "./mapper"

const Aval = "A".charCodeAt(0)

export class mapPorta extends Mapper {
    /**
     * Map two unencoded characters using the Porta mapping table
     * cpt Plaintext unencoded character
     * ckey Key Unencoded character
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
        let ptval = cpt.charCodeAt(0) - Aval
        let ctval = 0
        if (ptval < 13) {
            ctval = ((Math.floor(keyval / 2) + ptval) % 13) + 13
        } else {
            ctval = ((13 - Math.floor(keyval / 2)) + ptval) % 13
        }
        return this.getCharCode(ctval)
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Porta mapping table.  Note that for Porta, the table is
     * symetric, so this function is the same as encode
     * ct Encoded character
     * ckey Unencoded character
     */
    decode(ct: string, ckey: string): string {
        return this.encode(ct, ckey)
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Porta mapping table.
     * ct Encoded character
     * cpt Unencoded character
     */
    decodeKey(ct: string, cpt: string): string {
        ct = ct.toUpperCase()
        cpt = cpt.toUpperCase()
        // If either character is not an alphabetic, then we can't map it
        if ((cpt.toLowerCase() === cpt) || (ct.toLowerCase() === ct)) {
            return '?';
        }
        let ctval = ct.charCodeAt(0) - Aval
        let ptval = cpt.charCodeAt(0) - Aval
        // For Porta, since a letter maps to the opposite, you can't have both
        // a ct and PT value on the same side of the alphabet
        if ((ctval < 13 && ptval < 13) || (ctval >= 13 && ptval >= 13)) {
            return '?'
        }
        let keyval = (Math.abs((ct.charCodeAt(0) - Aval) - (cpt.charCodeAt(0) - Aval)) % 13) * 2
        return this.getCharCode(keyval)
    }
}
