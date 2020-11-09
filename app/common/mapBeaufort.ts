const Aval = 'A'.charCodeAt(0);

import { Mapper } from './mapper';
export class mapBeaufort extends Mapper {
    /**
     * Map two unencoded characters using the Beaufort mapping table
     *  Formula CT = KEY - pt
     * cpt Plaintext unencoded character
     * ckey Key Unencoded character
     * cipher text (ct) encoded character
     */
    public encode(cpt: string, ckey: string): string {
        cpt = cpt.toUpperCase();
        ckey = ckey.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (cpt.toLowerCase() === cpt || ckey.toLowerCase() === ckey) {
            return '?';
        }
        const ctval = ckey.charCodeAt(0) - cpt.charCodeAt(0);
        return this.getCharCode(ctval);
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Beaufort mapping table
     *  Formula pt = KEY - CT
     * Since the forula is the same as the encoding, we just use that routine
     * ct Encoded character
     * ckey Unencoded character
     */
    public decode(ct: string, ckey: string): string {
        return this.encode(ct, ckey);
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Beaufort mapping table.
     *  Formula KEY = CT+pt
     * ct Encoded character
     * cpt Unencoded character
     */
    public decodeKey(ct: string, cpt: string): string {
        cpt = cpt.toUpperCase();
        ct = ct.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (cpt.toLowerCase() === cpt || ct.toLowerCase() === ct) {
            return '?';
        }
        const keyval = ct.charCodeAt(0) - Aval + (cpt.charCodeAt(0) - Aval);
        return this.getCharCode(keyval);
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
