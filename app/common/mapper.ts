const Aval = "A".charCodeAt(0);

export class Mapper {
    /**
     * Converts a character (mod 26) to the correct character in the alphabet
     * val Code to be mapped to a character
     */
    public getCharCode(val: number): string {
        return String.fromCharCode((((val % 26) + 26) % 26) + Aval);
    }
    /**
     * Map two unencoded characters using the Vigenere mapping table
     * cpt Plaintext unencoded character
     * ckey Key Unencoded character
     * @returns cipher text (ct) encoded character
     */
    public encode(cpt: string, ckey: string): string {
        return "?";
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Vigenere mapping table
     * ct Encoded character
     * ckey Unencoded character
     */
    public decode(ct: string, ckey: string): string {
        return "?";
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Vigenere mapping table.  Note that for Vigenere, the table is
     * symetric, so this function is the same as decVigenere
     * ct Encoded character
     * cpt Unencoded character
     */
    public decodeKey(ct: string, cpt: string): string {
        return "?";
    }
}
