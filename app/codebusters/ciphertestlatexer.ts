/**
 * ciphertestlatexer.ts
 *
 * Converts a ciphers-app test (sourceTestData) directly into two LaTeX strings:
 * one for the student exam and one for the answer key.
 *
 * All information is read straight from the IState / ITest objects that already
 * live in the ciphers repository — no external server or re-implementation of
 * encoding logic is needed.  For deterministic ciphers the formula is applied
 * once; for non-deterministic ciphers (random Aristocrat, Homophonic) the
 * specific choices are read back from the saved state fields
 * (alphabetSource/alphabetDest, randomSlot).
 */

import { IState, ITest, ITestType } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { sourceTestData } from './ciphertest';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionData {
    latex: string;
    answer: string;
    answerBold: boolean;
    keyword: string | null;
    isBonus: boolean;
    points: number;
    questionText: string;
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function latexEscape(s: string): string {
    return String(s ?? '')
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/\^/g, '\\^{}')
        .replace(/_/g, '\\_')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/~/g, '\\textasciitilde{}');
}

function ordinal(n: number): string {
    if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
    return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

/**
 * Return the list of cipher-type phrases to search for in s.question, ordered
 * from most specific (e.g. "K1 Patristocrat") to least specific ("Patristocrat").
 * The first phrase that matches the question text is the one that gets bolded.
 */
function getCipherTypePhrases(s: IState): string[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const rawEncode = (st.encodeType as string) ?? '';
    const encodeUpper = rawEncode.toUpperCase().replace('RANDOM', '').trim();
    const alphLabel = encodeUpper ? `${encodeUpper} ` : '';
    // Xenocrypts are stored with cipherType='aristocrat' but curlang !== 'en'
    const isXenoByLang = (st.curlang as string | undefined) && st.curlang !== 'en';

    const phrases: string[] = [];
    switch (s.cipherType) {
        case ICipherType.Aristocrat: {
            if (isXenoByLang) {
                if (alphLabel) phrases.push(`${alphLabel}Xenocrypt`);
                phrases.push('Xenocrypt');
            } else {
                if (alphLabel) phrases.push(`${alphLabel}Aristocrat`);
                phrases.push('Aristocrat');
            }
            break;
        }
        case ICipherType.Patristocrat:
            if (alphLabel) phrases.push(`${alphLabel}Patristocrat`);
            phrases.push('Patristocrat');
            break;
        case ICipherType.Xenocrypt:
            if (alphLabel) phrases.push(`${alphLabel}Xenocrypt`);
            phrases.push('Xenocrypt');
            break;
        case ICipherType.Atbash:
            phrases.push('Atbash');
            break;
        case ICipherType.Caesar:
            phrases.push('Caesar');
            break;
        case ICipherType.Baconian:
            phrases.push('Baconian');
            break;
        case ICipherType.Hill:
            phrases.push('Hill');
            break;
        case ICipherType.NihilistSubstitution:
            phrases.push('Nihilist Substitution');
            phrases.push('Nihilist');
            break;
        case ICipherType.Porta:
            phrases.push('Porta');
            break;
        case ICipherType.Affine:
            phrases.push('Affine');
            break;
        case ICipherType.FractionatedMorse:
            phrases.push('Fractionated Morse');
            phrases.push('Fractionated');
            break;
        case ICipherType.Checkerboard:
            phrases.push('Checkerboard');
            break;
        case ICipherType.Homophonic:
            phrases.push('Homophonic');
            break;
        case ICipherType.CompleteColumnar:
            phrases.push('Complete Columnar');
            phrases.push('Columnar');
            break;
        case ICipherType.Cryptarithm:
            phrases.push('cryptarithm');
            break;
        default:
            break;
    }
    return phrases;
}

/**
 * Apply LaTeX bolding to the question text stored in IState.question.
 * IState.question is raw innerHTML, so HTML tags and entities are stripped first.
 * Then:
 *  1. Bold the cipher type phrase (state-derived, most-specific first).
 *  2. For FractionatedMorse: convert Unicode Morse symbols to LaTeX math mode
 *     before any splitting, so math blocks are untouched by later passes.
 *  3. In non-already-bolded text segments:
 *     - Bold 2+ consecutive UPPERCASE letters (keywords, cribs, samples).
 *     - Bold K1/K2/K3/K4 alphabet indicators.
 *     - NihilistSubstitution: bold two-digit cipher unit groups in parentheses
 *       (removing stray leading/trailing spaces), ordinal position ranges, and
 *       "keyword length of N" phrases.
 *     - FractionatedMorse: bold space-separated single-letter cipher sequences
 *       of three or more characters (e.g. "R Q Q B L S T").
 */
function applyQuestionBolding(text: string, s: IState): string {
    // Strip HTML tags and decode HTML entities → clean plain text.
    let q = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&ndash;/gi, '\u2013')   // en-dash  → Morse dash symbol
        .replace(/&times;/gi, '\u00D7')   // ×        → Morse cross symbol
        .replace(/&#160;/gi, ' ')
        .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(parseInt(code, 10)))
        .replace(/\s+/g, ' ')
        .replace(/ +\./g, '.')            // remove stray spaces before periods
        .trim();

    if (!q) return q;

    // Step 1: bold the cipher type phrase (most-specific match wins)
    for (const phrase of getCipherTypePhrases(s)) {
        const esc = phrase.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
        const regex = new RegExp(esc, 'i');
        if (regex.test(q)) {
            q = q.replace(regex, (m) => `\\textbf{${m}}`);
            break;
        }
    }

    // Step 2 (FracMorse only): convert Unicode Morse symbol assignments to LaTeX math
    // before any \textbf{} splitting, so the $...$ blocks stay intact.
    // Symbols after entity decoding: ● (U+25CF) = \newmoon, × (U+00D7) = \times,
    // – (U+2013) or plain - = math dash.
    if (s.cipherType === ICipherType.FractionatedMorse) {
        q = q.replace(
            /\b([A-Z]) = ([\u25CF\u00D7\u2013\-]+)/g,
            (_, letter: string, symbols: string) => {
                const latex = Array.from(symbols)
                    .map((c) => {
                        if (c === '\u25CF') return '\\newmoon';   // ●
                        if (c === '\u00D7') return '\\times';     // ×
                        return '-';                                // – or -
                    })
                    .join('');
                return `${letter} = $${latex}$`;
            },
        );
    }

    // Step 3: per-segment bold passes (skip spans already inside \textbf{...})
    const parts = q.split(/(\\textbf\{[^}]*\})/);
    q = parts
        .map((part, i) => {
            if (i % 2 !== 0) return part; // already bolded
            let p = part;

            // Bold 2+ consecutive uppercase letters (keywords, cribs, etc.)
            p = p.replace(/\b([A-Z]{2,})\b/g, '\\textbf{$1}');

            // Bold K1–K4 alphabet type indicators (Aristocrat family and universal)
            p = p.replace(/\b(K[1-4])\b/g, '\\textbf{$1}');

            if (s.cipherType === ICipherType.NihilistSubstitution) {
                // Bold two-digit cipher unit groups in parens; strip stray inner spaces
                p = p.replace(
                    /\(\s*(\d{2}(?:\s+\d{2})*)\s*\)/g,
                    (_, nums: string) => `(\\textbf{${nums.replace(/\s+/g, ' ').trim()}})`,
                );
                // Bold ordinal position ranges: "31st through 44th"
                p = p.replace(
                    /\b(\d+(?:st|nd|rd|th) through \d+(?:st|nd|rd|th))\b/gi,
                    '\\textbf{$1}',
                );
                // Bold "keyword length of N"
                p = p.replace(/(keyword length of \d+)/gi, '\\textbf{$1}');
            }

            if (s.cipherType === ICipherType.FractionatedMorse) {
                // Bold space-separated single-letter cipher sequences of 3+ letters
                p = p.replace(/\b([A-Z](?: [A-Z]){2,})\b/g, '\\textbf{$1}');
            }

            return p;
        })
        .join('');

    return q;
}

/**
 * Build the full \question[pts] intro line for a cipher question.
 * Uses s.question (plain text entered by the test author) with automatic
 * bolding applied via applyQuestionBolding.  Falls back to the supplied
 * `fallback` string only when s.question is empty.
 */
function buildQuestionIntro(
    value: number,
    bonus: boolean,
    s: IState,
    fallback: string,
): string {
    // applyQuestionBolding strips HTML first, so an editor-empty question like
    // "<p><br></p>" collapses to "" and we correctly fall back to the generated text.
    const bolded = s.question ? applyQuestionBolding(s.question, s) : '';
    const base = bolded || fallback;
    return `\\normalsize \\question[${value}] ${base}${bonusStar(bonus)}`;
}

function bonusStar(bonus: boolean): string {
    return bonus
        ? ' \\emph{$\\bigstar$\\textbf{This question is a special bonus question.}}'
        : '';
}

/**
 * Wrap a space-separated string of tokens into lines no wider than `width`,
 * joining lines with `\n\n\n` (LaTeX verbatim blank-line spacing).
 */
function wordWrapVerb(text: string, width = 52): string {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
        if (line && line.length + 1 + w.length > width) {
            lines.push(line);
            line = w;
        } else {
            line = line ? `${line} ${w}` : w;
        }
    }
    if (line) lines.push(line);
    return lines.join('\n\n\n');
}

/**
 * Group `letters` (already uppercase, no spaces) into blocks of `bs`,
 * then word-wrap at `width`.
 */
function blockWrapVerb(letters: string, bs: number, width = 52): string {
    const blocks: string[] = [];
    for (let i = 0; i < letters.length; i += bs) blocks.push(letters.slice(i, i + bs));
    return wordWrapVerb(blocks.join(' '), width);
}

/**
 * Produce word-spaced output: replaces each space in the original with three
 * spaces, each letter pair/unit with `unit + ' '`, and wraps at 52 chars.
 */
function wordSpacedVerb(tokens: string[], origSpacing: boolean[]): string {
    const lines: string[] = [];
    let current = '';
    for (let i = 0; i < tokens.length; i++) {
        if (origSpacing[i]) {
            current = current.trimEnd() + '   ';
        } else {
            const tok = tokens[i] + ' ';
            if (current.length + tok.length > 52) {
                lines.push(current.trimEnd());
                current = tok;
            } else {
                current += tok;
            }
        }
    }
    if (current.trimEnd()) lines.push(current.trimEnd());
    return lines.join('\n\n\n');
}

// ─── Cipher encoding helpers ──────────────────────────────────────────────────

/** Aristocrat/Patristocrat/Xenocrypt: use the cached alphabetSource/alphabetDest stored in state */
function encodeSubstitution(plaintext: string, state: IState): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = state as any;
    const src: string = st.alphabetSource ?? '';
    const dst: string = st.alphabetDest ?? '';
    if (src.length >= 26 && dst.length >= 26) {
        return plaintext
            .toUpperCase()
            .split('')
            .map((c) => {
                const i = src.indexOf(c);
                return i >= 0 ? dst[i] : c;
            })
            .join('');
    }
    // Fallback: replacement map is source→cipher
    const rep: Record<string, string> = (state.replacement as Record<string, string>) ?? {};
    return plaintext
        .toUpperCase()
        .split('')
        .map((c) => rep[c] ?? c)
        .join('');
}

function encodeAtbash(plaintext: string): string {
    return plaintext
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .split('')
        .map((c) => String.fromCharCode(155 - c.charCodeAt(0)))
        .join('');
}

function encodeCaesar(plaintext: string, shift: number): string {
    return plaintext
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .split('')
        .map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65))
        .join('');
}

function encodeAffine(plaintext: string, a: number, b: number): string {
    return plaintext
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .split('')
        .map((c) => String.fromCharCode(((a * (c.charCodeAt(0) - 65) + b) % 26) + 65))
        .join('');
}

function encodeHill(plaintext: string, keyword: string): string {
    const kw = keyword.toUpperCase().replace(/[^A-Z]/g, '');
    const z = kw.split('').map((c) => c.charCodeAt(0) - 65);
    const letters = plaintext.toUpperCase().replace(/[^A-Z]/g, '').split('').map((c) => c.charCodeAt(0) - 65);

    const result: number[] = [];
    if (kw.length === 4) {
        const padded = letters.length % 2 === 1 ? [...letters, 25] : letters;
        for (let i = 0; i < padded.length; i += 2) {
            result.push((z[0] * padded[i] + z[1] * padded[i + 1]) % 26);
            result.push((z[2] * padded[i] + z[3] * padded[i + 1]) % 26);
        }
    } else if (kw.length === 9) {
        while (letters.length % 3 !== 0) letters.push(25);
        for (let i = 0; i < letters.length; i += 3) {
            result.push((z[0] * letters[i] + z[1] * letters[i + 1] + z[2] * letters[i + 2]) % 26);
            result.push((z[3] * letters[i] + z[4] * letters[i + 1] + z[5] * letters[i + 2]) % 26);
            result.push((z[6] * letters[i] + z[7] * letters[i + 1] + z[8] * letters[i + 2]) % 26);
        }
    }
    return result.map((n) => String.fromCharCode(n + 65)).join('');
}

function buildNihilistAlphabet(kw: string): string {
    const seen = new Set<string>();
    let out = '';
    for (const c of kw.toLowerCase()) {
        if (c !== 'j' && /[a-z]/.test(c) && !seen.has(c)) {
            out += c;
            seen.add(c);
        }
    }
    for (const c of 'abcdefghiklmnopqrstuvwxyz') {
        if (!seen.has(c)) out += c;
    }
    return out.toUpperCase();
}

function encodeNihilist(plaintext: string, keyword: string, polybiusKey: string): number[] {
    const alph = buildNihilistAlphabet(polybiusKey);
    const pkMap: Record<string, number> = {};
    for (let i = 0; i < 25; i++) pkMap[alph[i]] = (Math.floor(i / 5) + 1) * 10 + (i % 5) + 1;
    const kw = keyword.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');
    const letters = plaintext.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');
    return letters.split('').map((c, i) => (pkMap[c] ?? 0) + (pkMap[kw[i % kw.length]] ?? 0));
}

function encodePorta(plaintext: string, keyword: string): string {
    const letters = plaintext.toUpperCase().replace(/[^A-Z]/g, '');
    const kw = keyword.toUpperCase().replace(/[^A-Z]/g, '');
    return letters
        .split('')
        .map((c, i) => {
            const kc = kw.charCodeAt(i % kw.length) - 65;
            const p = c.charCodeAt(0) - 65;
            let v: number;
            if (p < 13) {
                v = ((p + Math.floor(kc / 2)) % 13) + 13;
            } else {
                v = ((p - Math.floor(kc / 2)) % 13 + 13) % 13;
            }
            return String.fromCharCode(v + 65);
        })
        .join('');
}

const MORSE_CODE: Record<string, string> = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
    K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
    U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

function fracAlphabet(kw: string): string {
    const seen = new Set<string>();
    let out = '';
    for (const c of kw.toUpperCase()) {
        if (/[A-Z]/.test(c) && !seen.has(c)) { out += c; seen.add(c); }
    }
    for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        if (!seen.has(c)) out += c;
    }
    return out;
}

/**
 * Mirrors CipherFractionatedMorseEncoder.makeReplacement to produce
 * word-boundary-split rows of cipher letters for the LaTeX verbatim block.
 * Each returned string is one verbatim row in "  A  B  C  " format
 * (2 leading spaces, 2-space separator between letters, 2 trailing spaces),
 * matching the format in test.tex exactly.
 * maxWidth=53 matches CipherHandler.maxEncodeWidth.
 */
function fracMorseWordRows(plaintext: string, keyword: string, maxWidth = 53): string[] {
    const alpha = fracAlphabet(keyword.replace(/\s/g, ''));
    // Triplet patterns use the same . / - / x notation as MORSE_CODE above
    const DOTS = ['.','.','.','.','.','.','.','.','.', '-','-','-','-','-','-','-','-','-', 'x','x','x','x','x','x','x','x'];
    const DASH = ['.','.','.', '-','-','-', 'x','x','x', '.','.','.', '-','-','-', 'x','x','x', '.','.','.', '-','-','-', 'x','x'];
    const TIRD = ['.', '-','x', '.', '-','x', '.', '-','x', '.', '-','x', '.', '-','x', '.', '-','x', '.', '-','x', '.', '-','x', '.', '-'];
    const fracMap: Record<string, string> = {};
    for (let i = 0; i < 26; i++) fracMap[DOTS[i] + DASH[i] + TIRD[i]] = alpha[i];

    const rows: string[] = [];
    let encodeline = '';
    let lastsplit = -1;
    let partialMorse = '';
    let stashedMorse = '';
    let extraFraction = '';
    let makeupMorse = 0;
    let extra = '';
    let spaceextra = '';

    const clean = plaintext.toUpperCase().replace(/[^A-Z ]/g, '');

    // makeReplacement encodeline format: " A  B  C " (1 leading, 2 between, 1 trailing)
    // test.tex format:                  "  A  B  C  " (2 leading, 2 between, 2 trailing)
    // Adding one extra space on each side converts between the two.
    const flushRow = (enc: string) => { rows.push(' ' + enc + ' '); };

    for (const ch of clean) {
        if (ch === ' ') {
            extra = spaceextra;
            extraFraction = spaceextra;
            lastsplit = encodeline.length;
            continue;
        }
        const morselet = MORSE_CODE[ch];
        if (!morselet) continue;

        // Undo the incomplete makeup cipher letter from the previous letter
        if (makeupMorse > 0) {
            encodeline = encodeline.substring(0, encodeline.length - 3);
        }

        partialMorse += stashedMorse + extraFraction + morselet;
        extraFraction = 'x';

        stashedMorse = partialMorse.substring(3 * Math.floor(partialMorse.length / 3));

        if (partialMorse.length % 3 === 2) {
            makeupMorse = 1;
            partialMorse += 'x';
        } else if (partialMorse.length % 3 === 1) {
            makeupMorse = 2;
            partialMorse += 'xx';
        } else {
            makeupMorse = 0;
        }

        while (partialMorse.length >= 3) {
            encodeline += ' ' + (fracMap[partialMorse.substring(0, 3)] ?? '?') + ' ';
            partialMorse = partialMorse.substring(3);
        }

        extra = 'x';
        spaceextra = 'xx';

        if (encodeline.length >= maxWidth) {
            if (lastsplit <= 0) {
                flushRow(encodeline);
                encodeline = '';
                lastsplit = -1;
            } else {
                flushRow(encodeline.substring(0, lastsplit));
                encodeline = encodeline.substring(lastsplit);
                lastsplit = -1;
            }
        }
    }

    if (encodeline.length > 0) {
        flushRow(encodeline);
    }

    return rows;
}

function buildCheckerboardAlphabet(polyKey: string): string {
    const seen = new Set<string>();
    let out = '';
    for (const c of polyKey.toLowerCase()) {
        if (c !== 'j' && /[a-z]/.test(c) && !seen.has(c)) { out += c; seen.add(c); }
    }
    for (const c of 'abcdefghiklmnopqrstuvwxyz') {
        if (!seen.has(c)) out += c;
    }
    return out.toUpperCase();
}

function encodeCheckerboard(
    plaintext: string,
    hkey: string,
    vkey: string,
    polyKey: string,
): string[] {
    const alph = buildCheckerboardAlphabet(polyKey);
    const hk = hkey.toUpperCase();
    const vk = vkey.toUpperCase();
    const pk: Record<string, string> = {};
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            pk[alph[r * 5 + c]] = vk[r] + hk[c];
        }
    }
    return plaintext
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .replace(/J/g, 'I')
        .split('')
        .map((c) => pk[c] ?? '??');
}

function encodeHomophonic(plaintext: string, keyword: string, randomSlot: number[]): string[] {
    const alph = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // 25 letters, no J
    const kw = keyword.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I').slice(0, 4);
    const table: Record<string, string[]> = {};
    for (const c of alph) table[c] = [];
    for (let row = 0; row < 4; row++) {
        const startLetter = kw[row];
        const startNum = row * 25 + 1;
        const startIdx = alph.indexOf(startLetter);
        for (let i = 0; i < 25; i++) {
            const idx = (startIdx + i) % 25;
            table[alph[idx]].push(String(startNum + i).padStart(2, '0'));
        }
    }
    const clean = plaintext.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');
    return clean.split('').map((c, i) => {
        const slot = randomSlot?.[i] ?? 0;
        return table[c]?.[slot % 4] ?? '??';
    });
}

function encodeCompleteColumnar(plaintext: string, columns: number, keyword: string): string {
    const letters = plaintext.toUpperCase().replace(/[^A-Z]/g, '');
    const rows = Math.ceil(letters.length / columns);
    const padded = letters.padEnd(rows * columns, 'X');

    const cols: string[] = [];
    for (let c = 0; c < columns; c++) {
        let col = '';
        for (let r = 0; r < rows; r++) col += padded[r * columns + c];
        cols.push(col);
    }

    const kw = keyword.toUpperCase().slice(0, columns).padEnd(columns, '~');
    const order = kw.split('').map((c, i) => ({ c, i }));
    order.sort((a, b) => (a.c < b.c ? -1 : a.c > b.c ? 1 : a.i - b.i));

    return order.map(({ i }) => cols[i]).join('');
}

// ─── Baconian encoding helpers ─────────────────────────────────────────────────

const BACON_MAP: Record<string, string> = {
    A: 'AAAAA', B: 'AAAAB', C: 'AAABA', D: 'AAABB', E: 'AABAA', F: 'AABAB',
    G: 'AABBA', H: 'AABBB', I: 'ABAAA', J: 'ABAAA', K: 'ABAAB', L: 'ABABA',
    M: 'ABABB', N: 'ABBAA', O: 'ABBAB', P: 'ABBBA', Q: 'ABBBB', R: 'BAAAA',
    S: 'BAAAB', T: 'BAABA', U: 'BAABB', V: 'BAABB', W: 'BABAA', X: 'BABAB',
    Y: 'BABBA', Z: 'BABBB',
};

/**
 * Strip HTML tags and decode basic HTML entities from a Baconian texta/textb string.
 * The Baconian state stores these as HTML-rich strings (e.g. "<P>" or "<b>+</b>")
 * for browser rendering; we need the bare characters for LaTeX verbatim output.
 */
function stripBaconHtml(s: string): string[] {
    const plain = s
        .replace(/<[^>]*>/g, '')    // remove HTML tags
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"');
    // Split into characters; we keep spaces as single-char tokens
    const chars = Array.from(plain);
    // Filter out empty strings (shouldn't happen, but be safe)
    return chars.filter((c) => c.length > 0);
}

function encodeBaconianLetters(
    plaintext: string,
    texta: string,
    textb: string,
    linewidth: number,
    btype: string,
): string {
    const a = stripBaconHtml(texta).map((c) => c.toUpperCase());
    const b = stripBaconHtml(textb).map((c) => c.toUpperCase());
    const letters = plaintext.toUpperCase().replace(/[^A-Z]/g, '');
    const bits = letters
        .split('')
        .map((c) => BACON_MAP[c] ?? 'AAAAA')
        .join('');

    let encoded = '';
    let ai = 0;
    let bi = 0;
    for (const bit of bits) {
        if (bit === 'A') {
            encoded += a[ai % a.length];
            ai++;
        } else {
            encoded += b[bi % b.length];
            bi++;
        }
    }

    let spaced = '';
    const lw = linewidth > 0 ? linewidth : 55;
    for (let i = 0; i < encoded.length; i++) {
        spaced += encoded[i];
        if ((i + 1) % lw === 0) spaced += '\n\n\n';
    }
    return spaced;
}

// ─── Nihilist / Porta / Affine: word-spaced or block output ───────────────────

function formatNihilistOutput(encoded: number[], bs: number, plaintext: string): string {
    if (bs === 0) {
        const tokens: string[] = [];
        const spacings: boolean[] = [];
        let idx = 0;
        for (const ch of plaintext.toUpperCase()) {
            if (/[A-Z]/i.test(ch)) {
                tokens.push(String(encoded[idx++]));
                spacings.push(false);
            } else if (ch === ' ') {
                tokens.push('');
                spacings.push(true);
            }
        }
        return wordSpacedVerb(tokens, spacings);
    }
    let y = '';
    let z = 0;
    for (let i = 0; i < encoded.length; i++) {
        y += String(encoded[i]) + ' ';
        if ((i + 1) % bs === 0) {
            z++;
            if ((bs === 1 && z === 16) || (bs > 1 && bs < 7 && z === 3) || (bs >= 7 && z === 2)) {
                y += '\n\n\n';
                z = 0;
            } else {
                y += '   ';
            }
        }
    }
    return y;
}

function formatPortaOutput(encoded: string, bs: number, plaintext: string): string {
    if (bs === 0) {
        const tokens: string[] = [];
        const spacings: boolean[] = [];
        let idx = 0;
        for (const ch of plaintext.toUpperCase()) {
            if (/[A-Z]/.test(ch)) {
                tokens.push(encoded[idx++]);
                spacings.push(false);
            } else if (ch === ' ') {
                tokens.push('');
                spacings.push(true);
            }
        }
        return wordSpacedVerb(tokens, spacings);
    }
    return blockWrapVerb(encoded, bs);
}

function formatCheckerboardOutput(pairs: string[], bs: number, plaintext: string): string {
    if (bs === 0) {
        const tokens: string[] = [];
        const spacings: boolean[] = [];
        let idx = 0;
        for (const ch of plaintext.toUpperCase()) {
            if (/[A-Z]/.test(ch)) {
                tokens.push(pairs[idx++]);
                spacings.push(false);
            } else if (ch === ' ') {
                tokens.push('');
                spacings.push(true);
            }
        }
        return wordSpacedVerb(tokens, spacings);
    }
    let y = '';
    let z = 0;
    for (let i = 0; i < pairs.length; i++) {
        y += pairs[i] + ' ';
        if ((i + 1) % bs === 0) {
            z++;
            if ((bs === 1 && z === 16) || (bs > 1 && bs < 7 && z === 3) || (bs >= 7 && z === 2)) {
                y += '\n\n\n';
                z = 0;
            } else {
                y += '   ';
            }
        }
    }
    return y;
}

function formatHomophonicOutput(encoded: string[], bs: number, plaintext: string): string {
    if (bs <= 0) {
        const tokens: string[] = [];
        const spacings: boolean[] = [];
        let idx = 0;
        for (const ch of plaintext.toUpperCase()) {
            if (/[A-Z]/.test(ch)) {
                tokens.push(encoded[idx++]);
                spacings.push(false);
            } else if (ch === ' ') {
                tokens.push('');
                spacings.push(true);
            }
        }
        return wordSpacedVerb(tokens, spacings);
    }
    let y = '';
    let z = 0;
    for (let i = 0; i < encoded.length; i++) {
        y += encoded[i] + ' ';
        if ((i + 1) % bs === 0) {
            z++;
            if ((bs === 1 && z === 16) || (bs > 1 && bs < 7 && z === 3) || (bs >= 7 && z === 2)) {
                y += '\n\n\n';
                z = 0;
            } else {
                y += '   ';
            }
        }
    }
    return y;
}

// ─── Static LaTeX table snippets ──────────────────────────────────────────────

const MONO_TABLE_HEADER =
    '{\\normalsize\n\\begin{center}\n\\begin{tabular}\n' +
    '{|m{2cm}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|}\n';

const XENO_TABLE_HEADER =
    '{\\normalsize\n\\begin{center}\n\\begin{tabular}\n' +
    '{|m{2cm}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|}\n';

const FRAC_TABLE =
    '\n\\normalsize\n\\begin{center}\n\\begin{tabular}\n' +
    '{|m{2cm}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|}\n' +
    '\\hline\nReplacement&&&&&&&&&&&&&&&&&&&&&&&&&&\\\\\n\\hline\n' +
    '&$\\newmoon$&$\\newmoon$&$\\newmoon$&$\\newmoon$&$\\newmoon$&$\\newmoon$&$\\newmoon$&$\\newmoon$&$\\newmoon$&$-$&$-$&$-$&$-$&$-$&$-$&$-$&$-$&$-$&$\\times$&$\\times$&$\\times$&$\\times$&$\\times$&$\\times$&$\\times$&$\\times$\\\\\n' +
    '&$\\newmoon$&$\\newmoon$&$\\newmoon$&$-$&$-$&$-$&$\\times$&$\\times$&$\\times$&$\\newmoon$&$\\newmoon$&$\\newmoon$&$-$&$-$&$-$&$\\times$&$\\times$&$\\times$&$\\newmoon$&$\\newmoon$&$\\newmoon$&$-$&$-$&$-$&$\\times$&$\\times$\\\\\n' +
    '&$\\newmoon$&$-$&$\\times$&$\\newmoon$&$-$&$\\times$&$\\newmoon$&$-$&$\\times$&$\\newmoon$&$-$&$\\times$&$\\newmoon$&$-$&$\\times$&$\\newmoon$&$-$&$\\times$&$\\newmoon$&$-$&$\\times$&$\\newmoon$&$-$&$\\times$&$\\newmoon$&$-$\\\\\n' +
    '\\hline\n\\end{tabular}\n\\end{center}\n';

const NIH_TABLE =
    '\n\\begin{flushright}\\vspace{-1.5cm}{\\renewcommand{\\arraystretch}{1.2}\n\\begin{tabular}{|C{18pt}|C{18pt}|C{18pt}|C{18pt}|C{18pt}|C{18pt}|}\n' +
    '\\hline\n&1&2&3&4&5  \\\\\n\\hline\n' +
    '1&&&&&  \\\\\n\\hline\n2&&&&&  \\\\\n\\hline\n3&&&&&  \\\\\n\\hline\n4&&&&&  \\\\\n\\hline\n5&&&&&  \\\\\n\\hline\n' +
    '\\end{tabular}}\\end{flushright} \n';

const CB_TABLE =
    '\n\\begin{flushright}\\vspace{-1.5cm}{\\renewcommand{\\arraystretch}{1.2}\n\\begin{tabular}{m{18pt}|m{18pt}|m{18pt}|m{18pt}|m{18pt}|m{18pt}|}\n' +
    '\\cline{2-6}\n& \\multicolumn{1}{r|}{} &  &  &  &  \\\\ \\hline\n' +
    '\\multicolumn{1}{|l|}{} & \\multicolumn{1}{r|}{} &  &  &  &  \\\\ \\hline\n' +
    '\\multicolumn{1}{|l|}{} &&&&&\\\\ \\hline\n' +
    '\\multicolumn{1}{|l|}{} &&&&&\\\\ \\hline\n' +
    '\\multicolumn{1}{|l|}{} &&&&&\\\\ \\hline\n' +
    '\\multicolumn{1}{|l|}{} &&&&&\\\\ \\hline\n' +
    '\\end{tabular}}\\end{flushright} \n';

const BACON_TABLE =
    '\n{\\normalsize\n\\begin{flushleft}\n\\begin{tabular}\n' +
    '{|m{2cm}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|}\n' +
    '\\hline\n&A&B&C&D&E&F&G&H&I&J&K&L&M&N&O&P&Q&R&S&T&U&V&W&X&Y&Z\\\\\n' +
    '\\hline\nReplacement&&&&&&&&&&&&&&&&&&&&&&&&&&\\\\\n\\hline\n\\end{tabular}\n\\end{flushleft}}';

// ─── Frequency table builder ───────────────────────────────────────────────────

function aristoFreqTable(ctLetters: string, encodeType: string): string {
    const freq = (c: string): number => ctLetters.split('').filter((x) => x === c).length;
    if (encodeType === 'K2') {
        let o = 'Replacement';
        for (let i = 0; i < 26; i++) o += '&';
        o += '\\\\\n\\hline\nK2';
        for (let i = 0; i < 26; i++) o += '&' + String.fromCharCode(65 + i);
        o += '\\\\\n\\hline\nFrequency';
        for (let i = 0; i < 26; i++) o += '&' + freq(String.fromCharCode(65 + i));
        o += '\\\\';
        return o;
    }
    let o = encodeType;
    for (let i = 0; i < 26; i++) o += '&' + String.fromCharCode(65 + i);
    o += '\\\\\n\\hline\nFrequency';
    for (let i = 0; i < 26; i++) o += '&' + freq(String.fromCharCode(65 + i));
    o += '\\\\\n\\hline\nReplacement';
    for (let i = 0; i < 26; i++) o += '&';
    o += '\\\\';
    return o;
}

function xenoFreqTable(ctLetters: string, encodeType: string): string {
    const freq = (code: number): number =>
        ctLetters.split('').filter((x) => x.charCodeAt(0) === code).length;
    const Ntilde = '\u00D1'; // Ñ

    if (encodeType === 'K2') {
        let o = 'Replacement';
        for (let i = 0; i < 27; i++) o += '&';
        o += '\\\\\n\\hline\nK2';
        for (let i = 0; i < 14; i++) o += '&' + String.fromCharCode(65 + i);
        o += '&' + Ntilde;
        for (let i = 14; i < 26; i++) o += '&' + String.fromCharCode(65 + i);
        o += '\\\\\n\\hline\nFrequency';
        for (let i = 0; i < 14; i++) o += '&' + freq(65 + i);
        o += '&' + freq(209);
        for (let i = 14; i < 26; i++) o += '&' + freq(65 + i);
        o += '\\\\';
        return o;
    }
    let o = encodeType;
    for (let i = 0; i < 14; i++) o += '&' + String.fromCharCode(65 + i);
    o += '&' + Ntilde;
    for (let i = 14; i < 26; i++) o += '&' + String.fromCharCode(65 + i);
    o += '\\\\\n\\hline\nFrequency';
    for (let i = 0; i < 14; i++) o += '&' + freq(65 + i);
    o += '&' + freq(209);
    for (let i = 14; i < 26; i++) o += '&' + freq(65 + i);
    o += '\\\\\n\\hline\nReplacement';
    for (let i = 0; i < 27; i++) o += '&';
    o += '\\\\';
    return o;
}

// ─── Per-cipher LaTeX builders ────────────────────────────────────────────────

function buildAristocratLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const rawEncode = (s.encodeType as string) ?? '';
    const encodeType = rawEncode.toUpperCase().replace('RANDOM', '');
    const keyword = (s.keyword ?? '').toUpperCase();
    const hint: string = st.hint ?? '';
    const hintType: string = st.hintType ?? (hint ? 'Word' : 'None');
    const operation = (s.operation as string) ?? 'decode';
    const extract = operation === 'keyword';
    // Xenocrypts are stored with cipherType='aristocrat' and curlang !== 'en'
    const isXeno = s.cipherType === ICipherType.Xenocrypt || (st.curlang && st.curlang !== 'en');
    const isPat = s.cipherType === ICipherType.Patristocrat;
    const ctype = isXeno ? 'Xenocrypt' : isPat ? 'Patristocrat' : 'Aristocrat';
    const alphLabel = encodeType && encodeType !== '' ? `${encodeType} ` : '';

    const ct = encodeSubstitution(pt, s);
    const ctLetters = ct.replace(/[^A-Z\u00D1]/g, '');
    const formatted = isPat
        ? (() => {
              const letOnly = ctLetters.replace(/[^A-Z]/g, '');
              const chunks: string[] = [];
              for (let i = 0; i < letOnly.length; i += 5) chunks.push(letOnly.slice(i, i + 5));
              return wordWrapVerb(chunks.join(' '));
          })()
        : wordWrapVerb(ct);

    // Crib is stored separately from the hint text; use it for bolding begins/ends/contains
    const crib: string = ((st.crib ?? '') as string).toUpperCase().replace(/[^A-Z]/g, '');
    const ptClean = pt.replace(/[^A-Za-z]/g, '').toUpperCase();

    let introFallback: string;
    if (!extract) {
        let fb = `Solve this \\textbf{${alphLabel}${ctype}}`;
        if (crib && ptClean.includes(crib)) {
            if (ptClean.startsWith(crib)) {
                fb += `. You are told that the plaintext begins with \\textbf{${crib}}.`;
            } else if (ptClean.endsWith(crib)) {
                fb += `. You are told that the plaintext ends with \\textbf{${crib}}.`;
            } else {
                fb += `. You are told that the plaintext contains \\textbf{${crib}}.`;
            }
        } else if (!hint || hintType === 'None') {
            fb += '.';
        } else if (hintType === 'Word' || hintType === 'Letters') {
            fb += `. You are told that \\textbf{${hint}}.`;
        } else if (hintType === 'Subject') {
            fb += ` about ${hint}.`;
        } else if (hintType === 'Word + Subject' || hintType === 'Letters + Subject') {
            const [h, subj] = hint.split(',', 2);
            fb += ` about ${(subj ?? '').trim()}. You are told that \\textbf{${(h ?? '').trim()}}.`;
        } else {
            fb += '.';
        }
        introFallback = fb;
    } else {
        const article = ctype === 'Aristocrat' ? 'an' : 'a';
        introFallback =
            `The following quote was encoded as ${article} ` +
            `\\textbf{${ctype}} with a ${alphLabel}alphabet. ` +
            `You are told that the keyword used is ${keyword.length} letters long. ` +
            `What is the keyword? $\\boxed{\\text{Box}}$ your final answer.`;
    }
    const intro = buildQuestionIntro(value, bonus, s, introFallback) + '\n';

    const tableHeader = isXeno ? XENO_TABLE_HEADER : MONO_TABLE_HEADER;
    const freqTable = isXeno
        ? xenoFreqTable(ctLetters, encodeType)
        : aristoFreqTable(ctLetters.replace(/[^A-Z]/g, ''), encodeType);

    const latex =
        intro +
        '\n\\Large{\n\\begin{verbatim}\n' +
        formatted +
        '\n\\end{verbatim}}\n' +
        tableHeader +
        '\\hline\n' + freqTable + '\n\\hline\n\\end{tabular}\n\\end{center}}\n\\vfill\n\\uplevel{\\hrulefill}\n';

    return {
        latex,
        answer: pt.replace(/[^A-Za-z ]/g, '').toUpperCase(),
        answerBold: extract,
        keyword: extract ? keyword : null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildAtbashLatex(s: IState): QuestionData {
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const ct = encodeAtbash(pt);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bs = (s as any).blocksize ?? 5;
    const formatted = blockWrapVerb(ct, bs);
    const q = buildQuestionIntro(value, bonus, s,
        `Decode this phrase that was encoded using the \\textbf{Atbash} cipher.`);
    const latex =
        `${q}\n` +
        `\n \\Large{\n\\begin{verbatim}\n${formatted}\n\n\\end{verbatim}}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: pt.replace(/[^A-Za-z ]/g, '').toUpperCase(),
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildCaesarLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const offset = Number(st.offset ?? 13);
    const ct = encodeCaesar(pt, offset);
    const formatted = blockWrapVerb(ct, 5);
    const q = buildQuestionIntro(value, bonus, s,
        `Decode this phrase that was encoded using the \\textbf{Caesar} cipher.`);
    const latex =
        `${q}\n` +
        `\n\\Large{\n\\begin{verbatim}\n${formatted}\n\n\\end{verbatim}}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: pt.replace(/[^A-Za-z ]/g, '').toUpperCase(),
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildBaconianLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const operation = (s.operation as string) ?? 'let4let';
    const crib: string = (st.crib ?? '') as string;

    const ptClean = pt.replace(/[^A-Za-z ]/g, '').toUpperCase();

    // Baconian symbol-encoding (texta/textb) can use arbitrary Unicode/emoji that cannot
    // be reliably represented in LaTeX verbatim.  Emit a clear placeholder so the test
    // author knows to paste the rendered ciphertext manually.
    const PLACEHOLDER =
        '% !! YOU MUST UPDATE THIS MANUALLY !!\n' +
        '% Copy the rendered Baconian ciphertext from the browser\n' +
        '% and paste it here in place of this comment block.';

    if (operation === 'words') {
        // Word Baconian — the words are stored as plain ASCII and can be included
        const words: string[] = (st.words ?? []) as string[];
        const wordsText = wordWrapVerb(words.map((w: string) => w.toUpperCase()).join(' '), 58);
        const cribClean = crib.replace(/[^A-Z]/g, '').toUpperCase();

        let fallback = `Decode this phrase that was encoded using the \\textbf{Baconian} cipher.`;
        if (cribClean && ptClean.includes(cribClean)) {
            const idx = ptClean.indexOf(cribClean);
            if (ptClean.startsWith(cribClean)) {
                fallback += ` You are told that the plaintext begins with \\textbf{${cribClean}}.`;
            } else if (ptClean.endsWith(cribClean)) {
                fallback += ` You are told that the plaintext ends with \\textbf{${cribClean}}.`;
            } else {
                const cribWords = words.slice(idx, idx + cribClean.length).join(' ').toUpperCase();
                fallback += ` You are told that the plaintext contains \\textbf{${cribClean}}, encoding to \\textbf{${cribWords}}.`;
            }
        }
        const q = buildQuestionIntro(value, bonus, s, fallback);
        const latex =
            q +
            `\n\n \\Large{\n\\begin{verbatim}\n${wordsText}\n\n\\end{verbatim}}\n${BACON_TABLE}\n\\vfill\n\\uplevel{\\hrulefill}`;
        return {
            latex,
            answer: ptClean,
            answerBold: false,
            keyword: null,
            isBonus: bonus,
            points: value,
            questionText: s.question ?? '',
        };
    }

    // Letter / Sequence Baconian — ciphertext uses custom symbols; show placeholder
    const q = buildQuestionIntro(value, bonus, s,
        `Decode this phrase that was encoded using the \\textbf{Baconian} cipher.`);
    const latex =
        q +
        `\n\n \\Large{\n\\begin{verbatim}\n${PLACEHOLDER}\n\\end{verbatim}}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: ptClean,
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildHillLatex(s: IState): QuestionData {
    const pt = s.cipherString ?? '';
    const keyword = (s.keyword ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const ct = encodeHill(pt, keyword);
    const formatted = wordWrapVerb(ct.split('').join(' '), 72);

    let matrix = '';
    const z = keyword.split('').map((c) => c.charCodeAt(0) - 65);
    if (keyword.length === 4) {
        matrix =
            `\\[\n\\begin{pmatrix}${keyword[0]}&${keyword[1]}\\\\${keyword[2]}&${keyword[3]}\\end{pmatrix}` +
            ` = \\begin{pmatrix}${z[0]}&${z[1]}\\\\${z[2]}&${z[3]}\\end{pmatrix}\n\\]`;
    } else if (keyword.length === 9) {
        const invDet = (() => {
            const a=z[4]*z[8]-z[5]*z[7],b=-(z[3]*z[8]-z[5]*z[6]),cc=z[3]*z[7]-z[4]*z[6];
            const d=-(z[1]*z[8]-z[2]*z[7]),ee=z[0]*z[8]-z[2]*z[6],f=-(z[0]*z[7]-z[1]*z[6]);
            const g=z[1]*z[5]-z[2]*z[4],h=-(z[0]*z[5]-z[2]*z[3]),ii=z[0]*z[4]-z[1]*z[3];
            const det3 = ((a*z[0]+b*z[1]+cc*z[2]) % 26 + 26) % 26;
            // modular inverse of det mod 26
            let inv = 0;
            for (let k = 1; k < 26; k++) { if ((det3 * k) % 26 === 1) { inv = k; break; } }
            return [a,d,g,b,ee,h,cc,f,ii].map(x => ((x%26+26)%26*inv)%26);
        })();
        matrix =
            `\\begin{align*}\n\\begin{pmatrix}${keyword[0]}&${keyword[1]}&${keyword[2]}\\\\${keyword[3]}&${keyword[4]}&${keyword[5]}\\\\${keyword[6]}&${keyword[7]}&${keyword[8]}\\end{pmatrix}` +
            `=\\begin{pmatrix}${z[0]}&${z[1]}&${z[2]}\\\\${z[3]}&${z[4]}&${z[5]}\\\\${z[6]}&${z[7]}&${z[8]}\\end{pmatrix}` +
            `\\qquad\\begin{pmatrix}${z[0]}&${z[1]}&${z[2]}\\\\${z[3]}&${z[4]}&${z[5]}\\\\${z[6]}&${z[7]}&${z[8]}\\end{pmatrix}^{-1}` +
            `=\\begin{pmatrix}${invDet[0]}&${invDet[1]}&${invDet[2]}\\\\${invDet[3]}&${invDet[4]}&${invDet[5]}\\\\${invDet[6]}&${invDet[7]}&${invDet[8]}\\end{pmatrix}\n\\end{align*}`;
    }

    const q = buildQuestionIntro(value, bonus, s,
        `Decode this phrase that was encoded using the \\textbf{Hill} cipher and the encoding key \\textbf{${keyword}}.`);
    const latex =
        `${q}\n` +
        `${matrix}\n\n \\Large{\n\\begin{verbatim}\n${formatted}\n\n\\end{verbatim}}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: pt.replace(/[^A-Za-z ]/g, '').toUpperCase(),
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildNihilistLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const keyword = (s.keyword ?? '').toUpperCase();
    const polybiusKey: string = st.polybiusKey ?? '';
    const bs: number = st.blocksize ?? 5;
    const crib: string = (st.crib ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    const operation: string = st.operation ?? 'decode';

    const encoded = encodeNihilist(pt, keyword, polybiusKey);
    const y = formatNihilistOutput(encoded, bs, pt);
    const ptClean = pt.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');

    let fallback: string;
    if (crib && ptClean.includes(crib)) {
        const idx = ptClean.indexOf(crib);
        if (ptClean.startsWith(crib)) {
            fallback = `Decode this phrase that was encoded using the \\textbf{Nihilist Substitution} cipher. ` +
                `You are told that the keyword used is between 3 and 7 letters long and the plaintext begins with \\textbf{${crib}}.`;
        } else if (ptClean.endsWith(crib)) {
            fallback = `Decode this phrase that was encoded using the \\textbf{Nihilist Substitution} cipher. ` +
                `You are told that the keyword used is between 3 and 7 letters long and the plaintext ends with \\textbf{${crib}}.`;
        } else {
            const units = encoded.slice(idx, idx + crib.length).join(' ');
            fallback = `Decode this phrase that was encoded using the \\textbf{Nihilist Substitution} cipher. ` +
                `You are told the ${ordinal(idx + 1)} through ${ordinal(idx + crib.length)} cipher units (${units}) decode to be \\textbf{${crib}}.`;
        }
    } else if (operation === 'decode') {
        fallback = `Decode this phrase that was encoded using the \\textbf{Nihilist Substitution} cipher ` +
            `with a keyword of \\textbf{${keyword}} and a polybius key of \\textbf{${polybiusKey}}.`;
    } else {
        fallback = `Decode this phrase that was encoded using the \\textbf{Nihilist Substitution} cipher.`;
    }
    const q = buildQuestionIntro(value, bonus, s, fallback);

    const latex =
        q + `\n\n \\Large{\n\\begin{verbatim}\n${y}\n\n\\end{verbatim}}\n${NIH_TABLE}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: pt.replace(/[^A-Za-z ]/g, '').toUpperCase(),
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildPortaLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const keyword = (s.keyword ?? '').toUpperCase();
    const bs: number = st.blocksize ?? 5;
    const crib: string = (st.crib ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    const operation: string = st.operation ?? 'decode';

    const ctStr = encodePorta(pt, keyword);
    const out = formatPortaOutput(ctStr, bs, pt);
    const ptClean = pt.toUpperCase().replace(/[^A-Z]/g, '');

    let fallback: string;
    if (crib && ptClean.includes(crib)) {
        const idx = ptClean.indexOf(crib);
        if (ptClean.startsWith(crib)) {
            fallback = `Decode this phrase that was encoded using the \\textbf{Porta} cipher. ` +
                `You are told the plaintext begins with \\textbf{${crib}}.`;
        } else if (ptClean.endsWith(crib)) {
            fallback = `Decode this phrase that was encoded using the \\textbf{Porta} cipher. ` +
                `You are told the plaintext ends with \\textbf{${crib}}.`;
        } else {
            const ctChunk = ctStr.slice(idx, idx + crib.length);
            fallback = `Decode this phrase that was encoded using the \\textbf{Porta} cipher. ` +
                `You are told the ${ordinal(idx + 1)} through ${ordinal(idx + crib.length)} cipher characters (${ctChunk}) decode to be \\textbf{${crib}}.`;
        }
    } else if (operation === 'decode') {
        fallback = `Decode this phrase that was encoded using the \\textbf{Porta} cipher ` +
            `with a keyword of \\textbf{${keyword}}.`;
    } else {
        fallback = `Decode this phrase that was encoded using the \\textbf{Porta} cipher.`;
    }
    const q = buildQuestionIntro(value, bonus, s, fallback);

    const latex = q + `\n\n\\Large{\n\\begin{verbatim}\n${out}\n\n\\end{verbatim}}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: pt.replace(/[^A-Za-z ]/g, '').toUpperCase(),
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildAffineLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const a: number = st.a ?? 1;
    const b: number = st.b ?? 0;
    const bs: number = st.blocksize ?? 5;
    const crib: string = (st.crib ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    const hint: string = st.hint ?? '';
    const operation: string = st.operation ?? 'decode';

    const ctStr = encodeAffine(pt, a, b);
    const out = bs === 0
        ? formatPortaOutput(ctStr, 0, pt)
        : blockWrapVerb(ctStr, bs);
    const ptClean = pt.toUpperCase().replace(/[^A-Z]/g, '');

    let fallback: string;
    if (crib) {
        let nhint: string;
        if (crib.length === 2) {
            const ctCrib = encodeAffine(crib, a, b);
            nhint = `ciphertext \\textbf{${ctCrib}} decodes to \\textbf{${crib}}`;
        } else {
            nhint = `the plaintext contains \\textbf{${crib}}`;
        }
        fallback = `Decode this phrase that was encoded using the \\textbf{Affine} cipher. ` +
            `You are told that ${nhint}.`;
    } else if (operation === 'decode') {
        fallback = `Decode this phrase that was encoded using the \\textbf{Affine} cipher ` +
            `with $\\textrm{a}=${a}$ and $\\textrm{b}=${b}$.`;
    } else {
        fallback = `Decode this phrase that was encoded using the \\textbf{Affine} cipher.`;
    }
    const q = buildQuestionIntro(value, bonus, s, fallback);

    const latex = q + `\n\n\\Large{\n\\begin{verbatim}\n${out}\n\n\\end{verbatim}}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: ptClean,
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildFracMorseLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const keyword = (s.keyword ?? '').replace(/\s/g, '');
    const crib: string = (st.crib ?? '').replace(/[^\w]/g, '').toUpperCase();
    const hint: string = st.hint ?? '';
    const hintType: string = st.hintType ?? 'None';

    const display = fracMorseWordRows(pt, keyword).join('\n\n\n');

    const ptClean = pt.replace(/[^\w]/g, '').toUpperCase();

    // Extra hint text (e.g. "G = -$\,$-$\,$-") is appended after the crib sentence
    const hintSuffix = hint ? ` ${hint}` : '';
    let fallback: string;
    if (crib && ptClean.includes(crib)) {
        if (ptClean.startsWith(crib)) {
            fallback = `Decode this phrase that was encoded using the \\textbf{Fractionated Morse} cipher. ` +
                `You are told the plaintext begins with \\textbf{${crib}}.${hintSuffix}`;
        } else if (ptClean.endsWith(crib)) {
            fallback = `Decode this phrase that was encoded using the \\textbf{Fractionated Morse} cipher. ` +
                `You are told the plaintext ends with \\textbf{${crib}}.${hintSuffix}`;
        } else {
            fallback = `Decode this phrase that was encoded using the \\textbf{Fractionated Morse} cipher. ` +
                `You are told the plaintext contains \\textbf{${crib}}.${hintSuffix}`;
        }
    } else if (hint) {
        fallback = `Decode this phrase that was encoded using the \\textbf{Fractionated Morse} cipher. ${hint}`;
    } else {
        fallback = `Decode this phrase that was encoded using the \\textbf{Fractionated Morse} cipher.`;
    }
    const q = buildQuestionIntro(value, bonus, s, fallback);

    const latex =
        q + `\n\n \\Large{\n\\begin{verbatim}\n${display}\n\n\\end{verbatim}}\n${FRAC_TABLE}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: pt.replace(/[^A-Za-z ]/g, '').toUpperCase(),
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildCheckerboardLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const hkey = (s.keyword ?? '').toUpperCase();
    const vkey = (st.keyword2 ?? '').toUpperCase();
    const polyKey: string = st.polybiusKey ?? '';
    const bs: number = st.blocksize ?? 5;
    const crib: string = (st.crib ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    const hint: string = (st.hint ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    const operation: string = st.operation ?? 'decode';

    const pairs = encodeCheckerboard(pt, hkey, vkey, polyKey);
    const out = formatCheckerboardOutput(pairs, bs, pt);
    const ptClean = pt.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');
    const cribTarget = crib || hint;

    let fallback: string;
    if (cribTarget && ptClean.includes(cribTarget)) {
        const idx = ptClean.indexOf(cribTarget);
        let c: string;
        if (ptClean.startsWith(cribTarget)) {
            c = `the plaintext begins with \\textbf{${cribTarget}}`;
        } else if (ptClean.endsWith(cribTarget)) {
            c = `the plaintext ends with \\textbf{${cribTarget}}`;
        } else {
            const cribPairs = pairs.slice(idx, idx + cribTarget.length).join(' ');
            c = `characters ${idx + 1}-${idx + cribTarget.length} (\\textbf{${cribPairs}}) decode to \\textbf{${cribTarget}}`;
        }
        fallback = `Decode this phrase that was encoded using the \\textbf{Checkerboard} cipher. ` +
            `You are told that ${c}.`;
    } else {
        fallback = `Decode this phrase that was encoded using the \\textbf{Checkerboard} cipher ` +
            `with a polybius keyword of \\textbf{${polyKey}}.`;
    }
    const q = buildQuestionIntro(value, bonus, s, fallback);

    const latex =
        q + `\n\n \\Large{\n\\begin{verbatim}\n${out}\n\n\\end{verbatim}}\n${CB_TABLE}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: ptClean,
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildHomophonicLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const keyword = (s.keyword ?? '').toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I').slice(0, 4);
    const bs: number = st.blocksize ?? -1;
    const crib: string = (st.crib ?? '').toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');
    const hint: string = st.hint ?? '';
    const hintType: string = st.hintType ?? 'None';
    const randomSlot: number[] = st.randomSlot ?? [];

    const encoded = encodeHomophonic(pt, keyword, randomSlot);
    const out = formatHomophonicOutput(encoded, bs, pt);
    const ptClean = pt.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');

    let fallback: string;
    if (crib && ptClean.includes(crib)) {
        const idx = ptClean.indexOf(crib);
        const ctChunk = encoded.slice(idx, idx + crib.length).join(' ');
        if (ptClean.startsWith(crib)) {
            fallback = `Decode this phrase that was encoded using the \\textbf{Homophonic} cipher. ` +
                `You are told that the keyword used is 4 letters long and the plaintext begins with \\textbf{${crib}}.`;
        } else if (ptClean.endsWith(crib)) {
            fallback = `Decode this phrase that was encoded using the \\textbf{Homophonic} cipher. ` +
                `You are told that the keyword used is 4 letters long and the plaintext ends with \\textbf{${crib}}.`;
        } else {
            fallback = `Decode this phrase that was encoded using the \\textbf{Homophonic} cipher. ` +
                `You are told that the keyword used is 4 letters long and the ${ordinal(idx + 1)} through ${ordinal(idx + crib.length)} cipher units (\\textbf{${ctChunk}}) decode to be \\textbf{${crib}}.`;
        }
    } else if (hintType !== 'None' && hint) {
        if (hintType === 'Subject') {
            fallback = `Decode this phrase that was encoded using the \\textbf{Homophonic} cipher ` +
                `with a keyword of \\textbf{${keyword}} about ${hint}.`;
        } else {
            fallback = `Decode this phrase that was encoded using the \\textbf{Homophonic} cipher ` +
                `with a keyword of \\textbf{${keyword}}. You are told that \\textbf{${hint}}.`;
        }
    } else {
        fallback = `Decode this phrase that was encoded using the \\textbf{Homophonic} cipher ` +
            `with a keyword of \\textbf{${keyword}}.`;
    }
    const q = buildQuestionIntro(value, bonus, s, fallback);

    const latex =
        q + `\n\n \\Large{\n\\begin{verbatim}\n${out}\n\n\\end{verbatim}}}\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: ptClean,
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

function buildColumnarLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const pt = s.cipherString ?? '';
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;
    const columns: number = st.columns ?? 5;
    const keyword = (s.keyword ?? '').toUpperCase();
    const crib: string = (st.crib ?? '').toUpperCase().replace(/[^A-Z]/g, '');

    const ct = encodeCompleteColumnar(pt, columns, keyword);
    const formatted = blockWrapVerb(ct, 5);

    const colFallback =
        `Decode this phrase that was encoded using the \\textbf{Complete Columnar} cipher. ` +
        (crib ? `You are told that the plaintext contains \\textbf{${crib}}.` : '');
    const q = buildQuestionIntro(value, bonus, s, colFallback);

    const latex = q + `\n\n \\Large{\n\\begin{verbatim}\n${formatted}\n\n\\end{verbatim}}\n\\vfill\n\\uplevel{\\hrulefill}`;
    return {
        latex,
        answer: pt.replace(/[^A-Za-z ]/g, '').toUpperCase(),
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

// ─── Cryptarithm ──────────────────────────────────────────────────────────────

/**
 * Format a cryptarithm equation string into the multi-line verbatim display used in test.tex.
 *
 * For addition/subtraction:
 *   BLUE+BERRY=LINEAR  →
 *        BLUE
 *   +   BERRY
 *   ---------
 *      LINEAR
 *
 * For division (DIVIDEND/DIVISOR=QUOTIENT), produces the basic long-division header
 * (quotient, underbar, divisor)dividend). Full intermediate steps require digit values.
 * Returns the header block; intermediate steps are appended from the mapping if available.
 */
function formatCryptarithmEquation(eq: string, mapping: Record<string, number>): string {
    const upper = eq.toUpperCase().replace(/\s/g, '');

    // Detect primary operation
    const hasDiv = upper.includes('/');
    const hasMul = upper.includes('*');

    if (hasDiv) {
        // Division: DIVIDEND/DIVISOR=QUOTIENT
        const eqSign = upper.indexOf('=');
        const divSign = upper.indexOf('/');
        if (divSign < 0 || eqSign < 0) return upper;
        const dividend = upper.slice(0, divSign);
        const divisor = upper.slice(divSign + 1, eqSign);
        const quotient = upper.slice(eqSign + 1);

        // Compute digit values if mapping is available
        const toDigits = (word: string): string =>
            word.split('').map((c) => (mapping[c] !== undefined ? String(mapping[c]) : c)).join('');

        // Build long-division display using digit values for intermediate steps
        const dDividend = toDigits(dividend);
        const dDivisor = toDigits(divisor);
        const dQuotient = toDigits(quotient);

        // Width calculations for the display
        const divLineWidth = divisor.length + 3 + dividend.length; // "STARS ) BRIGHTER"
        const quotIndent = divisor.length + 3; // spaces before quotient digits

        const lines: string[] = [];
        // Quotient row (right-aligned over dividend area)
        lines.push(' '.repeat(quotIndent) + quotient);
        // Division bar (underscores)
        lines.push(' '.repeat(quotIndent - 2) + '_'.repeat(dividend.length + 2));
        // Divisor ) Dividend
        lines.push(divisor + ' ) ' + dividend);

        // If we have complete digit mapping, add the intermediate division work
        if (Object.keys(mapping).length > 0) {
            let rem = parseInt(dDividend, 10);
            const divisorNum = parseInt(dDivisor, 10);
            const quotientDigits = dQuotient.split('');
            let digitPos = 0;
            let currentGroup = dDividend.slice(0, 0);
            let bringDown = dDividend;
            let stepRem = 0;

            // Reconstruct intermediate steps from the quotient digits
            for (let qi = 0; qi < quotientDigits.length; qi++) {
                const qDigit = parseInt(quotientDigits[qi], 10);
                const partial = qDigit * divisorNum;
                // Find the letter word for this partial product by reverse-mapping digits to letters
                const reverseMap: Record<string, string> = {};
                for (const [letter, digit] of Object.entries(mapping)) {
                    reverseMap[String(digit)] = letter;
                }
                const digitToLetters = (num: number, len: number): string => {
                    const s = String(num).padStart(len, '0');
                    return s.split('').map((d) => reverseMap[d] ?? d).join('');
                };

                // Partial product and remainder as letter words
                const partialWord = digitToLetters(partial, divisor.length);
                lines.push(' '.repeat(quotIndent + qi) + partialWord);
                lines.push(' '.repeat(quotIndent + qi - 1) + '-'.repeat(partialWord.length + 1));
            }
        }

        return lines.join('\n');
    }

    if (hasMul) {
        // Multiplication: A*B=C — show as simple columnar display
        const eqSign = upper.indexOf('=');
        const mulSign = upper.indexOf('*');
        if (mulSign < 0 || eqSign < 0) return upper;
        const multiplicand = upper.slice(0, mulSign);
        const multiplier = upper.slice(mulSign + 1, eqSign);
        const product = upper.slice(eqSign + 1);
        const maxLen = Math.max(multiplicand.length, multiplier.length, product.length);
        const w = maxLen + 3;
        return [
            ' '.repeat(w - multiplicand.length) + multiplicand,
            'x' + ' '.repeat(w - 1 - multiplier.length) + multiplier,
            '-'.repeat(w),
            ' '.repeat(w - product.length) + product,
        ].join('\n');
    }

    // Addition / Subtraction: parse LHS and RHS of the '=' sign
    const eqIdx = upper.indexOf('=');
    if (eqIdx < 0) return upper;
    const lhs = upper.slice(0, eqIdx);
    const rhs = upper.slice(eqIdx + 1).split(';')[0]; // ignore any secondary equations

    // Split LHS by + or - keeping the operator attached to the following token
    const parts: Array<{ op: string; word: string }> = [];
    const tokens = lhs.split(/(?=[+\-])/);
    for (const token of tokens) {
        if (!token) continue;
        const op = token[0] === '+' || token[0] === '-' ? token[0] : '';
        const word = op ? token.slice(1) : token;
        if (word) parts.push({ op, word });
    }

    const allWords = [...parts.map((p) => p.word), rhs];
    const maxLen = Math.max(...allWords.map((w) => w.length));
    const totalWidth = maxLen + 3;

    const lines: string[] = [];
    for (const { op, word } of parts) {
        if (!op) {
            lines.push(' '.repeat(totalWidth - word.length) + word);
        } else {
            lines.push(op + ' '.repeat(totalWidth - 1 - word.length) + word);
        }
    }
    lines.push('-'.repeat(totalWidth));
    lines.push(' '.repeat(totalWidth - rhs.length) + rhs);
    return lines.join('\n');
}

function buildCryptarithmLatex(s: IState): QuestionData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = s as any;
    const value = s.points ?? 100;
    const bonus = s.specialbonus ?? false;

    // cipherString holds the equation (e.g. ANGER+ALONG=INTUIT)
    const problemText = (s.cipherString ?? '').toUpperCase().replace(/\s/g, '');

    // soltext holds the word(s) the student decodes (e.g. "ANGER ALONG")
    const soltext: string = (st.soltext ?? '').toUpperCase().trim();

    // mapping holds the solved letter→digit assignments (e.g. {A:2, N:5, ...})
    const mapping: Record<string, number> = st.mapping ?? {};

    // Compute the numeric solution string from soltext + mapping (mirrors getSolValues())
    let solValues = '';
    let lastChar = ' ';
    for (const c of soltext) {
        const v = mapping[c];
        if (v !== undefined) {
            solValues += String(v);
            lastChar = 'X';
        } else if (c === ' ' && lastChar !== ' ') {
            solValues += ' ';
            lastChar = ' ';
        }
    }
    solValues = solValues.trim();

    // Build the question prompt: each space-separated solution word wrapped in its own
    // $...$ block so LaTeX spaces render correctly between the words.
    const mathNums = solValues
        ? solValues.split(' ').filter(Boolean).map((w) => `$${w}$`).join(' ')
        : (soltext || problemText);

    // Determine operation label for the verbatim header
    const upper = problemText.toUpperCase();
    let opLabel = 'Addition';
    if (upper.includes('/')) opLabel = 'Division';
    else if (upper.includes('*')) opLabel = 'Multiplication';

    // Format the multi-line equation display
    const equationLines = formatCryptarithmEquation(problemText, mapping);
    const verbatimBody = `Base 10 ${opLabel}\nAnswer: ${solValues || soltext || problemText}\n\n${equationLines}\n`;

    const cryptFallback =
        `Solve this \\textbf{cryptarithm} for ${mathNums}. ` +
        `Write out your final answer and $\\boxed{\\text{box}}$ it.`;
    const q = buildQuestionIntro(value, bonus, s, cryptFallback);
    const body = `\\Large\n\\begin{verbatim}\n${verbatimBody}\\end{verbatim}\n`;
    const latex = `${q}\n\\parskip 1cm\n\n${body}\\vfill\n\\uplevel{\\hrulefill}`;

    // Answer key shows the solution values; if not solved, fall back to soltext
    const answer = solValues || soltext || problemText;

    return {
        latex,
        answer,
        answerBold: false,
        keyword: null,
        isBonus: bonus,
        points: value,
        questionText: s.question ?? '',
    };
}

// ─── Dispatch: state → QuestionData ───────────────────────────────────────────

function stateToQuestionData(s: IState): QuestionData | null {
    try {
        switch (s.cipherType) {
            case ICipherType.Aristocrat:
            case ICipherType.Patristocrat:
            case ICipherType.Xenocrypt:
                return buildAristocratLatex(s);
            case ICipherType.Atbash:
                return buildAtbashLatex(s);
            case ICipherType.Caesar:
                return buildCaesarLatex(s);
            case ICipherType.Baconian:
                return buildBaconianLatex(s);
            case ICipherType.Hill:
                return buildHillLatex(s);
            case ICipherType.NihilistSubstitution:
                return buildNihilistLatex(s);
            case ICipherType.Porta:
                return buildPortaLatex(s);
            case ICipherType.Affine:
                return buildAffineLatex(s);
            case ICipherType.FractionatedMorse:
                return buildFracMorseLatex(s);
            case ICipherType.Checkerboard:
                return buildCheckerboardLatex(s);
            case ICipherType.Homophonic:
                return buildHomophonicLatex(s);
            case ICipherType.CompleteColumnar:
                return buildColumnarLatex(s);
            case ICipherType.Cryptarithm:
                return buildCryptarithmLatex(s);
            default:
                return null;
        }
    } catch (err) {
        const value = s.points ?? 100;
        return {
            latex:
                `\\normalsize \\question[${value}] [LaTeX generation error: ${latexEscape(String(err))}]\n\\vfill\n\\uplevel{\\hrulefill}\n`,
            answer: '???',
            answerBold: false,
            keyword: null,
            isBonus: s.specialbonus ?? false,
            points: value,
            questionText: '',
        };
    }
}

// ─── Answer key line ──────────────────────────────────────────────────────────

function makeAnswerLine(
    qNum: number,
    answer: string,
    bold: boolean,
    keyword: string | null,
    value: number,
    bonus: boolean,
): string {
    const pts = value ? `(${value} pts.) ` : '';
    const star = bonus ? '$\\bigstar$ ' : '';
    if (keyword) {
        return `\\question ${pts}${star}\\textbf{${latexEscape(keyword)}}: ${latexEscape(answer)}\n`;
    }
    if (bold) {
        return `\\question ${pts}${star}\\textbf{${latexEscape(answer)}}\n`;
    }
    return `\\question ${pts}${star}${latexEscape(answer)}\n`;
}

// ─── Document builder ─────────────────────────────────────────────────────────

function divisionLabel(testtype: ITestType | string): string {
    const map: Record<string, string> = {
        cregional: 'C', cstate: 'C',
        bregional: 'B', bstate: 'B',
        aregional: 'A', astate: 'A',
    };
    return map[testtype as string] ?? '';
}

function buildLatex(
    test: ITest,
    questions: QuestionData[],
    tqState: IState | null,
    isKey: boolean,
): string {
    // Timed question ciphertext + frequency table data
    let tqcipher = '';
    let tqFreqRow = '&'.repeat(25); // 26 empty cells
    let tqAnswer = '';
    if (tqState) {
        const tqPt = (tqState.cipherString ?? '').toUpperCase().replace(/[^A-Z ]/g, '');
        const tqCt = encodeSubstitution(tqPt, tqState);
        tqcipher = wordWrapVerb(tqCt, 52);
        const tqLetters = tqCt.replace(/[^A-Z]/g, '');
        tqFreqRow = Array.from({ length: 26 }, (_, i) =>
            String(tqLetters.split('').filter((c) => c.charCodeAt(0) === 65 + i).length),
        ).join('&');
        tqAnswer = latexEscape(tqPt.trim());
    }

    if (isKey) {
        // ── KEY — exact copy of key.tex structure ─────────────────────────────
        const answerLines = questions.map((q, i) =>
            makeAnswerLine(i + 1, q.answer, q.answerBold, q.keyword, q.points, q.isBonus),
        );

        return `\\usepackage{globalvals}
\\documentclass[addpoints]{exam}
\\usepackage[english]{babel}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{enumitem}
\\usepackage{media9,graphicx}
\\usepackage{microtype}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.8}
\\usepackage{tikz}
\\usepackage{graphics}
\\usepackage{amssymb}
\\usepackage{fancyhdr}
\\usepackage{pst-all}
\\usepackage[margin=.7in]{geometry}
\\usepackage{parskip}
\\usepackage{tabu}
\\usepackage{multicol}
\\usepackage{wrapfig}
\\usepackage{tikzsymbols}
\\usepackage{hyperref}
\\usepackage{titlesec}
\\usepackage{blindtext}
\\usepackage{enumerate}
\\usepackage{musicography}
\\usepackage{comment}
\\usepackage{wasysym}
\\usepackage{emoji}
\\usepackage[nodisplayskipstretch]{setspace}
\\include{EDIT_DEFINITIONS}
%%% UNCOMMENT BELOW IF YOU WANT TO SHOW SOLUTIONS %%%
%\\printanswers

\\numberwithin{figure}{section}
\\numberwithin{equation}{section}

\\titleformat{\\section}
  {\\normalfont\\sffamily\\Large\\bfseries}
  {\\thesection}{1em}{}
  
\\titleformat{\\subsection}
  {\\normalfont\\sffamily\\Large\\bfseries}
  {\\thesubsection}{1em}{}
  
\\renewcommand{\\questionshook}{%
    \\setlength{\\leftmargin}{20pt}%
}

\\renewcommand{\\choiceshook}{%
    \\setlength{\\leftmargin}{30pt}%
}

\\hypersetup{
    colorlinks=true,
    linkcolor=teal,
    filecolor=teal,      
    urlcolor=teal,
}

\\setlength{\\parindent}{0.0in}
\\setlength{\\parskip}{2mm}
\\setlength{\\columnsep}{1cm}

\\renewcommand{\\thesubsection}{\\thesection.\\alph{subsection}}
\\bonuspointpoints{bonus point}{bonus points}

%%% MACROS %%%
\\newcommand\\dx{\\, \\mathrm{d}x}
\\newcommand\\dt{\\, \\mathrm{d}t}
\\newcommand\\du{\\, \\mathrm{d}u}
\\newcommand\\RR{\\mathbb{R}}
\\newcommand\\RRp{\\mathbb{R}_{>0}}
\\newcommand\\NN{\\mathbb{N}}
\\newcommand\\ZZ{\\mathbb{Z}}
\\newcommand\\QQ{\\mathbb{Q}}
\\newcommand\\CC{\\mathbb{C}}
\\newcommand\\sequ{a_1,a_2,\\dots,a_n}
\\newcommand\\degr{^\\circ}
\\newcommand\\defeq{\\vcentcolon=}
\\newcommand{\\eps}{\\varepsilon}
\\newcommand\\tline[2]{$\\underset{\\text{#1}}{\\text{\\underline{\\hspace{#2}}}}$}

\\title{\\textbf{Codebusters \\division{} KEY}}
\\author{\\textbf{\\tournament}}
\\date{\\compdate}

\\begin{document}
\\sffamily
\\vspace*{2cm}
\\begin{center}
    {\\Huge \\textbf{Codebusters~\\division~KEY}} \\\\ \\vspace{0.4cm}
    {\\LARGE \\tournament} \\\\ \\vspace{0.4cm}
    {\\LARGE \\compdate}
\\end{center}
%%% ADD COVER ART IMAGE FILE "xcoverart.png" %%%
\\begin{figure}[h]
    \\centering
    \\includegraphics[height=200pt]{xcoverart.png} 
\\end{figure}

\\vspace{2cm}

\\begin{center}
\\begin{tabular}{c}
     \\textbf{Written By:} \\\\
     \\hline \\\\
     \\writers \\\\ % <---- EDIT ME
\\end{tabular}
\\end{center}

\\newpage

%%% EDIT THE STUFF IN BRACKETS BELOW %%%
\\pagestyle{fancy}
\\fancyfoot{}
\\fancyhead{}
\\fancyfoot[R]{Page \\thepage}
\\fancyhead[L]{\\sffamily\\textbf{Codebusters \\division}} % <---- EDIT ME
\\fancyhead[C]{\\sffamily\\textbf{KEY}} % <---- EDIT ME
\\fancyhead[R]{\\sffamily \\textbf{\\tournament}} % <---- EDIT ME

\\textbf{Timed Question:} ${tqAnswer}
%%% PASTE THE OUTPUT OF THE KEY FILE INSIDE
\\begin{questions}
${answerLines.join('')}
\\end{questions}


\\end{document}
`;
    }

    // ── TEST — exact copy of test.tex structure ───────────────────────────────
    return `\\documentclass[addpoints]{exam}
\\usepackage[english]{babel}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{enumitem}
\\usepackage{media9,graphicx}
\\usepackage{microtype}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.8}
\\usepackage{tikz}
\\usepackage{graphics}
\\usepackage{amssymb}
\\usepackage{fancyhdr}
\\usepackage{pst-all}
\\usepackage[margin=.7in]{geometry}
\\usepackage{parskip}
\\usepackage{tabu}
\\usepackage{multicol}
\\usepackage{wrapfig}
\\usepackage{tikzsymbols}
\\usepackage{hyperref}
\\usepackage{titlesec}
\\usepackage{blindtext}
\\usepackage{enumerate}
\\usepackage{musicography}
\\usepackage{comment}
\\usepackage{wasysym}
\\usepackage[nodisplayskipstretch]{setspace}
\\usepackage{lastpage}
\\usepackage[table]{xcolor}
\\usepackage[T2A]{fontenc}
\\usepackage{bm}
\\include{EDIT_DEFINITIONS}
%%% UNCOMMENT BELOW IF YOU WANT TO SHOW SOLUTIONS %%%
%\\printanswers

\\numberwithin{figure}{section}
\\numberwithin{equation}{section}

\\titleformat{\\section}
  {\\normalfont\\sffamily\\Large\\bfseries}
  {\\thesection}{1em}{}
  
\\titleformat{\\subsection}
  {\\normalfont\\sffamily\\Large\\bfseries}
  {\\thesubsection}{1em}{}
  
\\renewcommand{\\questionshook}{%
    \\setlength{\\leftmargin}{20pt}%
}

\\renewcommand{\\choiceshook}{%
    \\setlength{\\leftmargin}{30pt}%
}

\\hypersetup{
    colorlinks=true,
    linkcolor=teal,
    filecolor=teal,      
    urlcolor=teal,
}

\\setlength{\\parindent}{0.0in}
\\setlength{\\parskip}{2mm}
\\setlength{\\columnsep}{1cm}

\\renewcommand{\\thesubsection}{\\thesection.\\alph{subsection}}
\\bonuspointpoints{bonus point}{bonus points}

%%% MACROS %%%
\\newcommand\\dx{\\, \\mathrm{d}x}
\\newcommand\\dt{\\, \\mathrm{d}t}
\\newcommand\\du{\\, \\mathrm{d}u}
\\newcommand\\RR{\\mathbb{R}}
\\newcommand\\RRp{\\mathbb{R}_{>0}}
\\newcommand\\NN{\\mathbb{N}}
\\newcommand\\ZZ{\\mathbb{Z}}
\\newcommand\\QQ{\\mathbb{Q}}
\\newcommand\\CC{\\mathbb{C}}
\\newcommand\\sequ{a_1,a_2,\\dots,a_n}
\\newcommand\\degr{^\\circ}
\\newcommand\\defeq{\\vcentcolon=}
\\newcommand{\\eps}{\\varepsilon}
\\newcommand\\tline[2]{$\\underset{\\text{#1}}{\\text{\\underline{\\hspace{#2}}}}$}
\\newcolumntype{C}[1]{>{\\centering\\arraybackslash}p{#1}} % Define a new column type 'C' for centered fixed-width columns


\\title{\\textbf{Codebusters \\division}}
\\author{\\textbf{\\tournament}}
\\date{\\compdate}

\\begin{document}

\\sffamily
\\include{COVER}
\\newpage
\\setlength\\extrarowheight{2pt}
\\setlength{\\tabcolsep}{3pt}
%%%%%%%%% THE TEST %%%%%%%%%
\\textbf{Timed Question. }(\\tqvalue~Points) Solve this \\textbf{Aristocrat}. When you have finished, \\textbf{\\tqphrase} so your answer can be checked and time recorded.

\\Large{
\\begin{verbatim}
${tqcipher}
\\end{verbatim}}
{\\normalsize
\\begin{center}
\\begin{tabular}
{|m{2cm}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|m{9.675pt}|}
\\hline
&A&B&C&D&E&F&G&H&I&J&K&L&M&N&O&P&Q&R&S&T&U&V&W&X&Y&Z\\\\
\\hline 
Frequency&${tqFreqRow}\\\\
\\hline 
Replacement&&&&&&&&&&&&&&&&&&&&&&&&&&\\\\
\\hline
\\end{tabular}
\\end{center}}

\\newpage




\\begin{questions}
% paste the output from the python script below this line
${questions
    .map((q, i) =>
        q.latex + ((i + 1) % 2 === 0 ? '\n\\newpage' : ''),
    )
    .join('\n')}
% paste the output from the python script above this line
\\end{questions}

\\end{document}
`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate LaTeX source for a complete exam and its answer key.
 *
 * @param testData - The sourceTestData object returned by `generateTestData(test)`
 * @returns `{ testTex, keyTex }` — two complete .tex strings ready to save
 */
export function generateTestLatex(testData: sourceTestData): { testTex: string; keyTex: string } {
    const test = testData['TEST.0'] as ITest;

    const tqState: IState | null =
        test.timed !== -1 ? (testData[`CIPHER.${test.timed}`] as IState) ?? null : null;

    const questions: QuestionData[] = [];
    for (const qIdx of test.questions) {
        const state = testData[`CIPHER.${qIdx}`] as IState | undefined;
        if (!state) continue;
        const qd = stateToQuestionData(state);
        if (!qd) continue;
        questions.push(qd);
    }

    const testTex = buildLatex(test, questions, tqState, false);
    const keyTex = buildLatex(test, questions, tqState, true);
    return { testTex, keyTex };
}
