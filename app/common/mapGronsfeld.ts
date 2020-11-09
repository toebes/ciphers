const Aval = 'A'.charCodeAt(0);
const zeroval = '0'.charCodeAt(0);

import { Mapper } from './mapper';
export class mapGronsfeld extends Mapper {
    /**
     * Map two unencoded characters using the Gronsfeld mapping table
     * cpt Plaintext unencoded character
     * ckey Key Unencoded character
     * returns cipher text (ct) encoded character
     */
    public encode(cpt: string, ckey: string): string {
        cpt = cpt.toUpperCase();
        ckey = ckey.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (cpt.toLowerCase() === cpt || isNaN(parseInt(ckey, 10))) {
            return '?';
        }
        const ctval = cpt.charCodeAt(0) - Aval + (ckey.charCodeAt(0) - zeroval);
        return this.getCharCode(ctval);
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Gronsfeld mapping table
     * Since the forula is the same as the encoding, we just use that routine
     * ct Encoded character
     * ckey Unencoded character
     */
    public decode(ct: string, ckey: string): string {
        ckey = ckey.toUpperCase();
        ct = ct.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (isNaN(parseInt(ckey, 10)) || ct.toLowerCase() === ct) {
            return '?';
        }
        const ptval = ct.charCodeAt(0) - Aval - (ckey.charCodeAt(0) - zeroval);
        return this.getCharCode(ptval);
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
        let mapstr = '0123456789????????????????';
        const mapoff = (mapstr.length - (cpt.charCodeAt(0) - Aval)) % mapstr.length;
        mapstr = mapstr.substr(mapoff) + mapstr.substr(0, mapoff);
        const keyval = ct.charCodeAt(0) - Aval;
        return mapstr.substr(keyval, 1);
    }
}
