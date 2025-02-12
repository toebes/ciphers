import { Mapper } from './mapper';

const Aval = 'A'.charCodeAt(0);

// ABCDEFGHIJKLM
// NOPQRSTUVWXYZNOPQRSTUVWXYZ
// ACEGIKMOQSUWYACEGIKMOQSUWY
// BDFHJLNPRTVXZBDFHJLNPRTVXZ

// ABCDEFGHIJKLM
// NOPQRSTUVWXYZ
// ACEGIKMOQSUWY
// BDFHJLNPRTVXZ
export class mapPortax extends Mapper {
    private row1 = 'ABCDEFGHIJKLM';
    private row2 = 'NOPQRSTUVWXYZNOPQRSTUVWXYZ';
    private row3 = 'ACEGIKMOQSUWYACEGIKMOQSUWY';
    private row4 = 'BDFHJLNPRTVXZBDFHJLNPRTVXZ';

    private getRowStrings(ckey: string): string[] {
        const result: string[] = [];
        let keyval = Math.floor((ckey.charCodeAt(0) - Aval) / 2);
        if (ckey === '?') {
            keyval = 0;
            result.push('?????????????');
        } else {
            result.push(this.row1);
        }
        result.push(this.row2.substr(keyval, 13));
        result.push(this.row3.substr(keyval, 13));
        result.push(this.row4.substr(keyval, 13));
        return result;
    }

    /**
     * Map two unencoded characters using the Porta mapping table
     * cpt Plaintext unencoded character
     * ckey Key Unencoded character
     * @returns cipher text (ct) encoded character
     */
    public encode(cpt: string, ckey: string): string {
        const rowstrings = this.getRowStrings(ckey);

        let result = '??';
        cpt = cpt.toUpperCase();
        ckey = ckey.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (
            cpt.toLowerCase() === cpt ||
            (ckey !== '?' && ckey.toLowerCase() === ckey) ||
            cpt.length === 0
        ) {
            return result;
        }

        let row1 = 0;
        let idx1 = rowstrings[row1].indexOf(cpt.substr(0, 1));
        if (idx1 === -1) {
            row1 = 1;
            idx1 = rowstrings[row1].indexOf(cpt.substr(0, 1));
        }
        let row2 = 2;
        let idx2 = rowstrings[row2].indexOf(cpt.substr(1, 1));
        if (idx2 === -1) {
            row2 = 3;
            idx2 = rowstrings[row2].indexOf(cpt.substr(1, 1));
        }
        if (idx1 === -1 || idx2 === -1) {
            return result;
        }

        if (idx1 === idx2) {
            result =
                rowstrings[1 - row1].substr(idx1, 1) + rowstrings[3 - row2 + 2].substr(idx2, 1);
        } else {
            result = rowstrings[row1].substr(idx2, 1) + rowstrings[row2].substr(idx1, 1);
        }
        return result;
    }
    /**
     * Recover the plain text character using the encode text and a key character
     * using the Porta mapping table.  Note that for Porta, the table is
     * symetric, so this function is the same as encode
     * ct Encoded character
     * ckey Unencoded character
     */
    public decode(ct: string, ckey: string): string {
        return this.encode(ct, ckey);
    }
    /**
     * Recover the key character using the encode text and a plain text character
     * using the Porta mapping table.
     * ct Encoded character
     * cpt Unencoded character
     */
    // tslint:disable-next-line:cyclomatic-complexity
    public decodeKey(ct: string, cpt: string): string {
        ct = ct.toUpperCase();
        cpt = cpt.toUpperCase();
        // If either character is not an alphabetic, then we can't map it
        if (
            cpt.toLowerCase() === cpt ||
            ct.toLowerCase() === ct ||
            ct.length !== 2 ||
            cpt.length !== 2
        ) {
            return '?';
        }
        const ct1 = ct.substr(0, 1);
        const ct2 = ct.substr(1, 1);
        const cpt1 = cpt.substr(0, 1);
        const cpt2 = cpt.substr(1, 1);
        let ct2row = 3;
        let cpt2row = 3;
        // The starting or the ending characters can't be the same.
        if (ct1 === cpt1 || ct2 === cpt2) {
            return '!';
        }
        // Figure out what row and column the ending characters are on
        let idxct2 = this.row3.indexOf(ct2);
        let idxcpt2 = this.row3.indexOf(cpt2);
        if (idxct2 === -1) {
            ct2row = 4;
            idxct2 = this.row4.indexOf(ct2);
        }
        if (idxcpt2 === -1) {
            cpt2row = 4;
            idxcpt2 = this.row4.indexOf(cpt2);
        }
        // If we didn't find them then get out of here
        if (idxct2 === -1 || idxcpt2 === -1) {
            return '!';
        }
        // If they are on different rows, then they must be the same column
        if (ct2row !== cpt2row && idxcpt2 !== idxct2) {
            return '!';
        }
        let idxct1 = this.row2.indexOf(ct1);
        let idxcpt1 = this.row2.indexOf(cpt1);
        let idx1 = -1;
        // Now let's see if the first characters are consistent
        if (idxct2 === idxcpt2) {
            // They are the same column but different rows, so the first two
            // characters must also be the same.
            if (idxct1 !== -1) {
                if (idxct1 !== idxct2 || idxcpt1 !== -1) {
                    return '!';
                }
                idx1 = this.row1.indexOf(cpt1);
            } else {
                if (idxcpt1 !== idxct2) {
                    return '!';
                }
                idx1 = this.row1.indexOf(ct1);
            }
            if (idx1 === -1) {
                return '!';
            }
            return this.row3.substr(idxct2 - idx1, 1);
        }
        // The second characters are on the same row but different columns, so both of the first characters
        // must be on the same row.
        // If they are on the second row then we have no clue what the key character
        // is because only the first row slides to reveal the key
        if (idxct1 !== -1) {
            // If the other character was not on the second row, it is broken
            if (idxcpt1 === -1) {
                return '!';
            }
            // Also they must be in the same columns as each other to be valid
            if (idxct1 !== idxcpt2 || idxct2 !== idxcpt1) {
                return '!';
            }
            // Everything is good, but.. we have no clue what the key character is because
            // we don't touch the top row.
            return '?';
        }
        idxct1 = this.row1.indexOf(ct1);
        idxcpt1 = this.row1.indexOf(cpt1);
        if (idxct1 === -1 || idxcpt1 === -1) {
            return '!';
        }
        // Since we think the characters are good. now we need to figure out what
        // the shift character is for mapping
        idx1 = Math.min(idxct1, idxcpt1);
        let idx2 = Math.min(idxct2, idxcpt2);
        // We can have two scenarios here (it we can use either Row3 or Row4)
        // as they produce the same result.
        if (Math.abs(idxct2 - idxcpt2) === Math.abs(idxct1 - idxcpt1)) {
            // First scenario:
            //   A W  / I G
            //   0 11   8 3
            // Row1:    ABCDEFGHIJKLM
            // ROW3: ACEGIKMOQSUWYACEGIKMOQSUWY
            // In this first case the distances are the same (8-0 = 11-3)
        } else {
            //   A E  /  M G
            //   0 4  / 12 3
            // Row1:    ABCDEFGHIJKLM
            // ROW3: ACEGIKMOQSUWYACEGIKMOQSUWY
            // In the second case, the distances are off (12-0 != 4-3)
            // However:  (13+0)-12 = 4-3 so we have to adjust the lower number by 13
            idx2 = Math.max(idxct2, idxcpt2);
            if (Math.abs(idxct2 - idxcpt2) !== Math.abs(idx1 + 13 - Math.max(idxct1, idxcpt1))) {
                return '!';
            }
        }
        return this.row3.substr(idx2 - idx1, 1);
    }
}
