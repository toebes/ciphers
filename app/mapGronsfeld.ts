const Aval = "A".charCodeAt(0);
const zeroval = "0".charCodeAt(0);

import { Mapper } from "./mapper";
export class mapGronsfeld extends Mapper {
    /**
     * Map two unencoded characters using the Gronsfeld mapping table
     * cpt Plaintext unencoded character
     * ckey Key Unencoded character
     * returns cipher text (ct) encoded character
     */
    encode(cpt: string, ckey: string): string {
        cpt = cpt.toUpperCase();
        ckey = ckey.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (cpt.toLowerCase() === cpt || isNaN(parseInt(ckey, 10))) {
            return "?";
        }
        let ctval = cpt.charCodeAt(0) - Aval + (ckey.charCodeAt(0) - zeroval);
        return this.getCharCode(ctval);
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Gronsfeld mapping table
     * Since the forula is the same as the encoding, we just use that routine
     * ct Encoded character
     * ckey Unencoded character
     */
    decode(ct: string, ckey: string): string {
        ckey = ckey.toUpperCase();
        ct = ct.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (isNaN(parseInt(ckey, 10)) || ct.toLowerCase() === ct) {
            return "?";
        }
        let ptval = ct.charCodeAt(0) - Aval - (ckey.charCodeAt(0) - zeroval);
        return this.getCharCode(ptval);
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Beaufort mapping table.
     *  Formula KEY = CT+pt
     * ct Encoded character
     * cpt Unencoded character
     */
    decodeKey(ct: string, cpt: string): string {
        cpt = cpt.toUpperCase();
        ct = ct.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (cpt.toLowerCase() === cpt || ct.toLowerCase() === ct) {
            return "?";
        }
        let keyval = ct.charCodeAt(0) - cpt.charCodeAt(0);
        return String.fromCharCode((((keyval % 10) + 10) % 10) + zeroval);
    }
}
