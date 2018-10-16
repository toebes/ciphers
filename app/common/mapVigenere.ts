import { Mapper } from "./mapper";

const Aval = "A".charCodeAt(0);
export class mapVigenere extends Mapper {
    /**
     * Map two unencoded characters using the Vigenere mapping table
     * cpt Plaintext unencoded character
     * ckey Key Unencoded character
     * @returns cipher text (ct) encoded character
     */
    public encode(cpt: string, ckey: string): string {
        cpt = cpt.toUpperCase();
        ckey = ckey.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (cpt.toLowerCase() === cpt || ckey.toLowerCase() === ckey) {
            return "?";
        }
        let ctval = cpt.charCodeAt(0) - Aval + ckey.charCodeAt(0) - Aval;
        return this.getCharCode(ctval);
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Vigenere mapping table
     * ct Encoded character
     * ckey Unencoded character
     */
    public decode(ct: string, ckey: string): string {
        ckey = ckey.toUpperCase();
        ct = ct.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (ckey.toLowerCase() === ckey || ct.toLowerCase() === ct) {
            return "?";
        }
        let ptval = ct.charCodeAt(0) - Aval - ckey.charCodeAt(0) - Aval;
        return this.getCharCode(ptval);
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Vigenere mapping table.  Note that for Vigenere, the table is
     * symetric, so this function is the same as decVigenere
     * ct Encoded character
     * cpt Unencoded character
     */
    public decodeKey(ct: string, cpt: string): string {
        return this.decode(ct, cpt);
    }
    // let testmap:StringMap = {
    //     'encVigenere-aa=A': this.encVigenere("a","a"), // OK
    //     'encVigenere-_a=?': this.encVigenere("_","a"), // OK
    //     'encVigenere-lo=Z': this.encVigenere("l","o"), // OK
    //     'encVigenere-Zz=Y': this.encVigenere("Z","z"), // OK
    //     'encVigenere-Yb=Z': this.encVigenere("Y","b"), // OK
    //     'decVigenere-aa=A': this.decVigenere("a","a"),  // OK
    //     'decVigenere-_a=?': this.decVigenere("_","a"), // OK
    //     'decVigenere-lo=X': this.decVigenere("l","o"), // OK
    //     'decVigenere-Zz=A': this.decVigenere("Z","z"), // OK
    //     'decVigenere-Yb=X': this.decVigenere("Y","b"), // OK
}
