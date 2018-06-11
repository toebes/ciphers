const Aval = "A".charCodeAt(0)

export default class Mapper {
    /**
     * Converts a character (mod 26) to the correct character in the alphabet
     * @param val Code to be mapped to a character
     */
    getCharCode(val: number): string {
        return String.fromCharCode((((val % 26) + 26) % 26) + Aval)
    }
    /**
     * Map two unencoded characters using the Vigenere mapping table
     * @param cpt Plaintext unencoded character
     * @param ckey Key Unencoded character
     * @returns cipher text (ct) encoded character
     */
    encode(cpt: string, ckey: string): string {
        return '?';
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Vigenere mapping table
     * @param ct Encoded character
     * @param ckey Unencoded character
     */
    decode(ct: string, ckey: string): string {
        return '?';
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Vigenere mapping table.  Note that for Vigenere, the table is
     * symetric, so this function is the same as decVigenere
     * @param ct Encoded character
     * @param cpt Unencoded character
     */
    decodeKey(ct: string, cpt: string): string {
        return '?';
    }

}
