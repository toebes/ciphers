import { StringMap } from './ciphercommon';

export const tomorse: { [key: string]: string } = {
    ' ': '',
    A: 'O-',
    B: '-OOO',
    C: '-O-O',
    D: '-OO',
    E: 'O',
    F: 'OO-O',
    G: '--O',
    H: 'OOOO',
    I: 'OO',
    J: 'O---',
    K: '-O-',
    L: 'O-OO',
    M: '--',
    N: '-O',
    O: '---',
    P: 'O--O',
    Q: '--O-',
    R: 'O-O',
    S: 'OOO',
    T: '-',
    U: 'OO-',
    V: 'OOO-',
    W: 'O--',
    X: '-OO-',
    Y: '-O--',
    Z: '--OO',
    '1': 'O----',
    '2': 'OO---',
    '3': 'OOO--',
    '4': 'OOOO-',
    '5': 'OOOOO',
    '6': '-OOOO',
    '7': '--OOO',
    '8': '---OO',
    '9': '----O',
    '0': '-----',
    ',': '--OO--',
    '.': 'O-O-O-',
    '?': 'OO--OO',
    '/': '-OO-O',
    '-': '-OOOO-',
    '()': '-O--O-',
};
/**
 * Table of classes to be associated with morse code dots/dashes/spaces
 */
export const morsedigitClass: { [key: string]: string } = {
    O: 'dot',
    '-': 'dash',
    '?': 'unk',
    X: 'null',
};
/**
 * Table of classes to be associated with any particular morse code decoded character
 */
export const morseClass: { [key: string]: string } = {
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
    F: '',
    G: '',
    H: '',
    I: '',
    J: '',
    K: '',
    L: '',
    M: '',
    N: '',
    O: '',
    P: '',
    Q: '',
    R: '',
    S: '',
    T: '',
    U: '',
    V: '',
    W: '',
    X: '',
    Y: '',
    Z: '',
    '1': 'num',
    '2': 'num',
    '3': 'num',
    '4': 'num',
    '5': 'num',
    '6': 'num',
    '7': 'num',
    '8': 'num',
    '9': 'num',
    '0': 'num',
    ',': 'sym',
    '.': 'sym',
    '?': 'sym',
    '/': 'sym',
    '-': 'sym',
    '()': 'sym',
};
/**
 * Table to map from a morse code string to the corresponding character
 */
export const frommorse: { [key: string]: string } = {
    'O-': 'A',
    '-OOO': 'B',
    '-O-O': 'C',
    '-OO': 'D',
    O: 'E',
    'OO-O': 'F',
    '--O': 'G',
    OOOO: 'H',
    OO: 'I',
    'O---': 'J',
    '-O-': 'K',
    'O-OO': 'L',
    '--': 'M',
    '-O': 'N',
    '---': 'O',
    'O--O': 'P',
    '--O-': 'Q',
    'O-O': 'R',
    OOO: 'S',
    '-': 'T',
    'OO-': 'U',
    'OOO-': 'V',
    'O--': 'W',
    '-OO-': 'X',
    '-O--': 'Y',
    '--OO': 'Z',
    'O----': '1',
    'OO---': '2',
    'OOO--': '3',
    'OOOO-': '4',
    OOOOO: '5',
    '-OOOO': '6',
    '--OOO': '7',
    '---OO': '8',
    '----O': '9',
    '-----': '0',
    '--OO--': ',',
    'O-O-O-': '.',
    'OO--OO': '?',
    '-OO-O': '/',
    '-OOOO-': '-',
    '-O--O-': '()',
};
/**
 * ConvertToMorse encodes a string into morse code using after converting
 * any language specific characters to the normalize character set.
 * Any non-morse convertable characters (including punctuation) are discarded.
 * Multiple spaces are converted to a single space.
 */
export function ConvertToMorse(text: string, langreplace: StringMap): string {
    let result = '';
    let extra = '';
    for (let c of text) {
        if (typeof langreplace[c] !== 'undefined') {
            c = langreplace[c];
        }
        // Spaces between words use two separator characters
        if (c === ' ') {
            extra = 'XX';
        } else if (typeof tomorse[c] !== 'undefined') {
            result += extra + tomorse[c];
            // Spaces between letters use one separator character
            extra = 'X';
        }
    }
    return result;
}
