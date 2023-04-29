import { cloneObject, StringMap, BoolMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { IEncoderState } from './cipherencoder';
import { tomorse, frommorse } from '../common/morse';
import { JTTable } from '../common/jttable';
import { CipherMorseEncoder, ctindex, morseindex, ptindex } from './ciphermorseencoder';

interface IFractionatedMorseState extends IEncoderState {
    encoded: string;
}

/**
 * CipherFractionatedMorseEncoder - This class handles all of the actions associated with encoding
 * a FractionatedMorse cipher.
 */
export class CipherFractionatedMorseEncoder extends CipherMorseEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public cipherName = 'FractionatedMorse';
    public guidanceURL = 'TestGuidance.html#FractionatedMorse';
    public validTests: ITestType[] = [
        ITestType.None,
        ITestType.cregional,
        ITestType.cstate,
        ITestType.bregional,
        ITestType.bstate,
    ];
    public loadedLanguage = false;
    keywordMap: string[] = [];
    possibilitiesMap: string[] = [];
    public readonly morseReplaces: string[] = [
        "OOO",
        "OO-",
        "OOX",
        "O-O",
        "O--",
        "O-X",
        "OXO",
        "OX-",
        "OXX",
        "-OO",
        "-O-",
        "-OX",
        "--O",
        "---",
        "--X",
        "-XO",
        "-X-",
        "-XX",
        "XOO",
        "XO-",
        "XOX",
        "X-O",
        "X--",
        "X-X",
        "XXO",
        "XX-",
    ];

    public readonly morseFragments: string[][] = [
        [],
        ['O', '-'],
        ['OO', 'O-', '-O', '--'],
        ['OOO', 'OO-', 'O-O', 'O--', '-OO', '-O-', '--O', '---']
    ];

    public mappingSolution: string[] = Array(26).fill('');
    public mappingWorkspace: string[][] = Array(26).fill(Array(26).fill(null).map((_, i) => i));

    private trialLetters: string[][] = [];

    private mentionedLetters = new Set();

    public init(lang: string): void {
        super.init(lang);
        this.loadLanguageDictionary('en');
    }

    public defaultstate: IFractionatedMorseState = {
        cipherString: '',
        cipherType: ICipherType.FractionatedMorse,
        replacement: {},
        operation: 'crypt',
        encoded: '',
        keyword: '',
    };
    public needsRefresh = false;
    public state: IFractionatedMorseState = cloneObject(this.defaultstate) as IFractionatedMorseState;
    public encodecharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    public sourcecharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    public restore(data: IEncoderState, suppressOutput = false): void {
        super.restore(data, suppressOutput)
        this.setSourceCharset('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    }

    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setSourceCharset('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
        this.setCharset('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
        this.setOperation(this.state.operation);
    }
    public genSampleHint(): string {
        let hint = '';
        if (this.state.operation === 'crypt') {
            const crib = this.minimizeString(this.state.crib);
            const plaintext = this.minimizeString(this.state.cipherString);
            if (crib !== '') {
                const cribtext = this.genMonoText(this.state.crib.toUpperCase());

                if (plaintext.substr(0, crib.length) === crib) {
                    hint = 'the quote starts with ' + cribtext + '.';
                } else if (plaintext.substr(plaintext.length - crib.length) === crib) {
                    hint = 'the quote ends with ' + cribtext + '.';
                } else {
                    const strings = this.makeReplacement(
                        this.state.cipherString,
                        this.maxEncodeWidth
                    );
                    const ciphercrib = this.findCrib(strings, crib);
                    if (ciphercrib !== '') {
                        hint =
                            'the quote has ' +
                            cribtext +
                            ' in it corresponding to the encoded text ' +
                            this.genMonoText(ciphercrib) +
                            '.';
                    } else {
                        hint = 'the quote has ' + cribtext + ' somewhere in it.';
                    }
                }
            }
        }
        if (hint === '') {
            hint = 'the hint needs to be defined';
        }
        return hint;
    }

    public randomize(): void {
        this.state.encoded = '';
    }
    public updateOutput(): void {
        this.guidanceURL = 'TestGuidance.html#' + this.cipherName + this.state.operation;
        super.updateOutput();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);
        result.append(this.createQuestionTextDlg());
        this.genQuestionFields(result);
        this.genEncodeField(result);

        const inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',
        });
        inputbox.append(
            JTFLabeledInput(
                "Keyword",
                "text",
                "keyword",
                this.state.keyword,
                "cell small-12 medium-6 large-6"
            )
        );
        result.append(inputbox);
        this.addHintCrib(result);

        return result;
    }

    /**
     * Creates an HTML table to display the frequency of characters for printing
     * on the test and answer key
     * showanswers controls whether we display the answers or just the key
     * encodeType tells the type of encoding to print.  If it is 'random' then
     * we leave it blank.
     * @param showanswers Display the answers as part of the table
     * @param encodeType The type of encoding (random/k1/k2)
     * @param extraclass Extra class to add to the generated table
     */
    public generateReplacementTable(
        showanswers: boolean,
        encodeType: string,
        extraclass: string
    ): JQuery<HTMLElement> {
        const table = new JTTable({
            class: 'prfreq fractionatedmorse shrink cell unstriped ' + extraclass,
        });
        const charset = this.keywordMap;
        let replalphabet = this.state.replacement;
        if (encodeType === 'random' || encodeType === undefined) {
            encodeType = '';
        }
        const replacementsRow = table.addBodyRow({ class: 'replacement' });
        const fractionsRow = table.addBodyRow();

        replacementsRow.add({ celltype: 'th', content: 'Replacement' });
        fractionsRow.add({ celltype: 'th', content: 'Morse fraction' });

        let count = 0;
        for (const c of charset) {
            let repl = '';
            if (showanswers) {
                replacementsRow.add({ content: c + '&nbsp;' });
            } else {
                replacementsRow.add({ content: '&nbsp;&nbsp;' });
            }

            fractionsRow.add({ content: this.normalizeHTML(this.morseReplaces[count].split('').join('<br/>')) });
            count++;
        }
        return table.generate();
    }

    /**
     * Creates an HTML table to display the frequency of characters for printing
     * on the test and answer key
     * showanswers controls whether we display the answers or just the key
     * encodeType tells the type of encoding to print.  If it is 'random' then
     * we leave it blank.
     * @param showanswers Display the answers as part of the table
     * @param extraclass Extra class to add to the generated table
     */
    public generateFractionatedTable(
        showanswers: boolean,
        knownMap: StringMap,
        extraclass: string
    ): JQuery<HTMLElement> {
        const table = new JTTable({
            class: 'prfreq fractionatedmorse shrink cell unstriped ' + extraclass,
        });
        const charset = this.keywordMap;
        const replacementsRow = table.addBodyRow({ class: 'replacement' });
        const fractionsRow = table.addBodyRow();

        replacementsRow.add({ celltype: 'th', content: '&nbsp;Replacement&nbsp;' });
        fractionsRow.add({ celltype: 'th', content: 'Morse fraction' });

        let count = 0;
        for (const c of charset) {
            if (showanswers && (knownMap[c] !== 'XXX')) {
                replacementsRow.add({ content: '&nbsp;' + c + '&nbsp;' });
            } else {
                replacementsRow.add({ content: '&nbsp;&nbsp;&nbsp;' });
            }

            fractionsRow.add({ content: this.normalizeHTML(this.morseReplaces[count].split('').join('<br/>')) });
            count++;
        }
        return table.generate();
    }

    public generatePossibilitiesTable(showanswers: boolean, thing: string[], extraclass: string): JQuery<HTMLElement> {
        const table = new JTTable({
            class: 'prfreq fractionatedmorse shrink cell unstriped ' + extraclass,
        });
        const charset = this.keywordMap;
        const possibilitiesRow = table.addBodyRow({ class: 'replacement' });
        const fractionsRow = table.addBodyRow();

        possibilitiesRow.add({ celltype: 'th', content: 'Possibilities' });
        fractionsRow.add({ celltype: 'th', content: 'Morse fraction' });

        let count = 0;
        for (let i = 0; i < thing.length; i++) {
            let content = '&nbsp;' + thing[i] + '&nbsp';
            let classForKnown = 'a';
            if (thing[i].length > 1) {
                classForKnown = '';
                content = this.shortenContent(thing[i]);
            }
            possibilitiesRow.add({ settings: { class: classForKnown }, content: content });
            fractionsRow.add({ content: this.normalizeHTML(this.morseReplaces[i].split('').join('<br/>')) });
        }

        return table.generate();
    }

    private shortenContent(content: string): string {
        const base = content.charCodeAt(0);
        // let isSequence: boolean = true;
        // for (let i = 0; i < content.length; i++) {
        //     if (base + i  !== content.charCodeAt(i)) {
        //         isSequence = false;
        //         break;
        //     }
        // }
        // if (isSequence) {
        //     content = content[0] + '-' + content[content.length - 1];
        // } else {
        const big = content;
        content = '';
        for (let i = 0; i < big.length; i++) {
            content += (i % 2 === 0) ? big[i] : ',' + big[i] + '</br>';
        }
        //content = '&nbsp;?&nbsp;';
        // }
        return content;
    }

    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genAlphabet();
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);

        for (const strset of strings) {
            const ctext = strset[ctindex].replace(/ /g, '&nbsp;');
            result.append(
                $('<div/>', {
                    class: 'TOSOLVEQ',
                })
                    .html(ctext)
            );
        }
        result.append(this.generateReplacementTable(false, this.state.encodeType, ''));
        return result;
    }

    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);

        for (const strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).text(strset[ctindex])
            );
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).html(this.normalizeHTML(strset[morseindex]))
            );
            result.append(
                $('<div/>', {
                    class: 'TOANSWER',
                }).text(strset[ptindex])
            );
        }
        result.append(this.generateReplacementTable(true, this.state.encodeType, ''));
        return result;
    }

    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be output properly.
     * This returns the strings as an array of pairs of strings with
     * the encode and decode parts delivered together.  As a side effect
     * it also updates the frequency table
     * The result is an array of array of three rows:
     *   [ctindex=0] The cipher text
     *   [morseindex=1] The morse mapping characters
     *   [ptindex=2] The decoded plain text characters
     * @param str  Plain text to encode
     * @param maxEncodeWidth How wide to encoder it as
     * @returns String array
     */
    public makeReplacement(str: string, maxEncodeWidth: number): string[][] {
        const sourcecharset = this.getSourceCharset();
        const langreplace = this.langreplace[this.state.curlang];
        let encodeline = '';
        let decodeline = '';
        let morseline = '';
        let lastsplit = -1;
        const result: string[][] = [];
        let opos = 0;
        let extra = '';
        let failed = false;
        let msg = '';
        let spaceextra = '';
        // Build out a mapping of the replacement characters to their morselet
        // value so we can figure out if we can reuse it.
        // TODO        const morseletmap: StringMap = this.buildMorseletMap();

        if (this.state.keyword == undefined || this.state.keyword.length === 0) {
            msg += 'No keyword specified. ';
            failed = true;
        }
        // Check to see if we have any duplicated characters
        // TODO
        // for (const c in morseletmap) {
        //     if (c < '0' || c > '9') {
        //         msg += c + ' is not a valid digit. ';
        //         failed = true;
        //     }
        //     if (morseletmap[c].length > 1) {
        //         msg += c + ' used for more than one letter: ' + morseletmap[c];
        //         failed = true;
        //     }
        // }

        this.setErrorMsg(msg, 'polmr');
        if (failed) {
            return result;
        }

        this.keywordMap = this.genKstring(this.state.keyword, 0, this.langcharset['en']).split('');
        //debug
        // console.log('String: ' + str);

        let partialMorse = '';
        let stashedMorse = '';

        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        let extraFraction = '';
        let makeupMorse = 0;
        for (let t of str.toUpperCase()) {
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== 'undefined') {
                t = langreplace[t];
            }
            // Spaces between words use two separator characters
            if (!this.isValidChar(t)) {
                extra = spaceextra;
                extraFraction = spaceextra;
                lastsplit = encodeline.length;
            } else if (typeof tomorse[t] !== 'undefined') {

                if (makeupMorse > 0) {
                    //debug
                    // console.log('removing encoded string');
                    encodeline = encodeline.substring(0, (encodeline.length - 3));
                    morseline = morseline.substring(0, (morseline.length - makeupMorse));
                }
                //debug
                // console.log('   stashed is >' + stashedMorse);
                partialMorse += (stashedMorse + extraFraction + tomorse[t]);
                // Spaces between letters use one separator character
                extraFraction = 'X';

                //debug
                // console.log('Processing letter: ' + t + ' of: ' + str.toUpperCase());
                // console.log('Partial morse: ' + partialMorse);

                const morselet = tomorse[t];
                // Spaces between letters use one separator character
                let prefix = (extra.length === 2 ? '/' + this.repeatStr(' ', extra.length - 1) : this.repeatStr(' ', extra.length));
                decodeline +=
                    prefix +
                    t +
                    this.repeatStr(' ', morselet.length - 1);
                morseline += extra + morselet;

                //debug
                // console.log('Going to stash:' + partialMorse + ' with substring of: ' + 3 * Math.floor((partialMorse.length / 3)));
                stashedMorse = partialMorse.substring(3 * Math.floor((partialMorse.length / 3)));
                if (partialMorse.length % 3 == 2) {
                    makeupMorse = 1;
                    partialMorse += 'X';
                    morseline += 'X';
                } else if (partialMorse.length % 3 == 1) {
                    makeupMorse = 2;
                    partialMorse += 'XX'
                    morseline += 'XX';
                }
                else {
                    makeupMorse = 0;
                }
                while (partialMorse.length > 2) {
                    let morseFraction = partialMorse.substring(0, 3);
                    //debug
                    // console.log('Morse fraction: ' + morseFraction);
                    for (let y = 0; y < this.morseReplaces.length; y++) {
                        if (morseFraction === this.morseReplaces[y]) {
                            let c = this.keywordMap[y];
                            encodeline += (' ' + c + ' ');
                            partialMorse = partialMorse.substring(3);
                            break;
                        }
                    }
                }
                // We have finished the letter, so next we will continue with
                // an X
                extra = 'X';
                spaceextra = 'XX';
            }
            // See if we have to split the line now
            if (encodeline.length >= maxEncodeWidth) {
                //debug
                // console.log('>Last split = ' + lastsplit);
                if (lastsplit === -1) {
                    result.push([encodeline, morseline, decodeline]);
                    encodeline = '';
                    decodeline = '';
                    morseline = '';
                    lastsplit = -1;
                } else {
                    const encodepart = encodeline.substr(0, lastsplit);
                    const decodepart = decodeline.substr(0, lastsplit);
                    const morsepart = morseline.substr(0, lastsplit);
                    encodeline = encodeline.substr(lastsplit);
                    decodeline = decodeline.substr(lastsplit);
                    morseline = morseline.substr(lastsplit);
                    result.push([encodepart, morsepart, decodepart]);
                }
            }
            //debug
            // console.log('<Last split = ' + lastsplit);
        }
        // And put together any residual parts
        if (encodeline.length > 0) {
            result.push([encodeline, morseline, decodeline]);
        }
        //        this.state.encoded = encoded;
        return result;
    }

    /**
     * Builds up a string map which maps all of the digits to the possible
     * morse mapping characters.
    private buildMorseletMap(): StringMap {
        const morseletmap: StringMap = {};
        return morseletmap;
    }
     */

    /**
     * Generates displayable table of mappings of cipher characters
     * @param knownmap Current mapping of cipher characters to morse
     */
    public genKnownTable(result: JQuery<HTMLElement>, knownmap: StringMap): void {
        const table = new JTTable({ class: 'known' });
        const headrow = table.addHeaderRow();
        const bodyrow = table.addBodyRow();
        for (const c of this.encodecharset) {
            headrow.add(c);
            bodyrow.add({ content: this.normalizeHTML(knownmap[c]) });
        }
        result.append(table.generate());
    }

    /**
     * Generates a displayable state of the currently decoded morse string.
     * There are three rows:
     *   [ctindex=0] The cipher text
     *   [morseindex=1] The known morse mapping characters (XXX means it could be - or O)
     *   [ptindex=2] The decoded plain text characters
     *
     * Those characters that are known are shown
     * @param strings Current mapping strings
     * @param knownmap Known mapping of cipher text characters
     * @returns string[][] where each string set consists of 3 strings
     */
    public genKnownMapping(strings: string[][], knownmap: StringMap): string[][] {
        const working: string[][] = [];
        let current = '';
        for (const ctset of strings) {
            let morse = '';
            let plaintext = '';

            let startIndex = 0;

            for (const c of ctset[ctindex]) {
                if (c === ' ') {
                    continue;
                }
                // See if we know what this character maps to exactly
                const possibilities = knownmap[c];
                if (possibilities !== 'XXX') {
                    // Yes, we know that it defined so remember the morselet
                    morse += possibilities;

                    // Append a X so the last letter is decoded.
                    if (morse.length === ctset[2].length && morse[morse.length - 1] !== 'X') {
                        morse += 'X';
                    }

                    let keepProcessing = true;
                    while (keepProcessing) {
                        let endLetterIndex = morse.indexOf('X', startIndex);
                        let endWordIndex = morse.indexOf('XX', startIndex)
                        if (endLetterIndex > -1) {
                            let chuckit = morse.substr(startIndex, endLetterIndex - startIndex);
                            let skipX = 1;
                            if (chuckit.indexOf(' ') > -1) {
                                if (endWordIndex > -1) {
                                    skipX += 1;
                                }
                                plaintext += this.repeatStr(' ', chuckit.length + (skipX));
                                startIndex = endLetterIndex + skipX;

                            } else {
                                if (endWordIndex > -1 && endWordIndex == endLetterIndex) {
                                    skipX += 1;
                                }
                                plaintext += ((frommorse[chuckit] === undefined) ? '/ ' : (frommorse[chuckit] +
                                    ((skipX === 2) ? this.repeatStr(' ', chuckit.length - 1) + '/ ' : this.repeatStr(' ', chuckit.length))));

                                startIndex = endLetterIndex + skipX;
                            }
                        } else {
                            keepProcessing = false;
                        }
                    }

                    current += possibilities;
                } else {
                    morse += '   ';
                    current += '   ';
                }
            }
            // Do we have anything left over at the end of the line?  If so
            // check to see if it happens to correspond to some morse code
            // We are counting on the fact that the current code will never
            // split a character over lines
            if (current.length > 0) {
                if (frommorse[current] !== undefined) {
                    plaintext += frommorse[current];
                }
                current = '';
            }
            let p = ctset[ctindex];
            let m = morse;
            let possbileMorse = '';
            for (let n = 0; n < p.length; n += 3) {

                // console.log(p.substring(n, n + 3).trim()+':'+m.substring(n, n+3));
                let someMorse = this.sortOut(p.substring(n, n + 3).trim(), m.substring(n, n + 3));
                // console.log('So we got...' + someMorse);
                possbileMorse += someMorse;
            }
            // console.log(p+':'+m);
            working.push([ctset[ctindex], possbileMorse, plaintext]);
        }
        return working;
    }

    private sortOut(letter: string, morse: string): string {
        if (morse === '   ') {
            morse = '+++';
            for (let i = 0; i < this.possibilitiesMap.length; i++) {
                if (this.possibilitiesMap[i].indexOf(letter) > -1) {
                    let frag = morse;

                    for (let j = 0; j < 3; j++) {
                        let inputDigit = frag[j];
                        let mapDigit = this.morseReplaces[i][j];

                        if (inputDigit === ' ') {
                            continue;
                        } else if (inputDigit === '+') {
                            morse = morse.substring(0, j) + mapDigit + morse.substring(j + 1);
                        } else if (mapDigit === 'X') {
                            morse = morse.substring(0, j) + ' ' + morse.substring(j + 1);
                        }
                        else if (inputDigit === mapDigit) {
                            morse = morse.substring(0, j) + inputDigit + morse.substring(j + 1);
                        } else {
                            morse = morse.substring(0, j) + '?' + morse.substring(j + 1);
                        }
                    }
                }
            }
        }
        return morse;
    }

    /**
     * Determines if the entire cipher mapping is known
     * @param knownmap Map of current cipher strings
     * @returns Boolean indicating that there are unknowns
     */
    public hasUnknowns(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {
        // Figure out what letters were actually used
        const used: BoolMap = {};
        let unknowns = 0;
        for (const strset of working) {
            for (const c of strset[ctindex]) {
                if (c === ' ')
                    continue;
                used[c] = true;
            }
        }
        // If one of the used letters doesn't have a mapping then we aren't done
        for (const e in knownmap) {
            if (knownmap[e] === 'XXX' && used[e] === true) {
                unknowns++;
            }
        }
        if (unknowns > 0) {
            result.append(
                'At this point in time, ' +
                String(unknowns) +
                ' ciphertext characters still need to be mapped.  '
            );
            return true;
        }
        return false;
    }
    /**
     * Check the first character to make sure it isn't an X
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public checkFirstCT(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {
        // TODO: RTL exception workaround
        return false;
        if (working.length > 0) {
            const strset = working[0];
            if (strset[morseindex].length > 0 && strset[morseindex][0] === ' ') {
                const c = strset[ctindex][0];
                // The first character is definitely unknown, so mark it
                knownmap[c] = knownmap[c].replace('X', '');
                const msg = 'The first morse code character can never be an X,';
                ' so we eliminate that possibility for ' + c + '.';
                result.append(this.normalizeHTML(msg));
                return true;
            }
        }
        return false;
    }
    /**
     * Determines if there are any triple letters which were identified as
     * potential X characters.  This also includes any potential X characters
     * which are paired with symbols that are known to be an X.  If any are
     * found, the potential X is removed and a message is output so that the
     * user can track the solution process.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public findTriples(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {
        let found = false;
        let lastc = '';
        let xcount = 0;
        let count = 0;
        let sequence = '';
        let prefix = 'Looking at the ciphertext, ';
        for (const strset of working) {
            for (const c of strset[ctindex]) {
                let keepxcount = false;
                sequence += c;
                // CXXD  (C can't be X, D can't be X)
                // XCC (C can't be an X)
                // CCX (C can't be an X)
                // CXC (C can't be an X)
                // CCXDD (C and D can't be an X)
                if (c == lastc) {
                    // If it was the same character repeated, we can lump it in
                    // with the group
                    count++;
                } else if (knownmap[c] === 'X') {
                    // If we had a known X then we add to the list
                    xcount++;
                    keepxcount = true;
                } else {
                    // Not the same character as previous
                    count = 1;
                    lastc = c;
                }
                // Did we exceed our three in a row?
                if (count + xcount > 2) {
                    if (knownmap[lastc].length > 1 && knownmap[lastc].indexOf('X') >= 0) {
                        // We had three of this in a row which means we know
                        // that this character can't be an X
                        found = true;
                        let msg = '';
                        const tseq = sequence.substr(sequence.length - 3, 3);
                        if (count === 3) {
                            msg = 'we find three ' + lastc + 's in a row.';
                        } else {
                            msg =
                                'we see the sequence ' +
                                tseq +
                                ' which would result in three Xs in a row if ' +
                                lastc +
                                ' were an X.';
                        }
                        result.append(prefix + this.normalizeHTML(msg));
                        prefix = ' Also, ';
                        knownmap[lastc] = knownmap[lastc].replace('X', '');
                        count = 0;
                    }
                }
                if (!keepxcount) {
                    xcount = 0;
                }
            }
        }
        return found;
    }
    /**
     * Determines if there are any cipher text which can't be an X
     * This works by looking for any span of 5 non-X characters followed by
     * an unknown or a cluster of 6 or more with a single unknown in the middle.
     * If any are found, the unknown is marked as an X and a message is output
     * so that the user can track the solution process.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public findSpacers(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {
        let found = false;
        let lastc = '';
        let gathered = '';
        let prefix = 'Looking at the ciphertext, ';
        for (const strset of working) {
            for (let i = 0, len = strset[morseindex].length; i < len; i++) {
                let m = strset[morseindex][i];
                const c = strset[ctindex][i];
                // Check to see if this is one that we had to replace because
                // we figured it out in an earlier pass
                if (m === ' ' && knownmap[c] === 'X') {
                    m = 'X';
                }
                if (m === 'X') {
                    // We hit a hard break so we can start again
                    gathered = '';
                    lastc = '';
                } else {
                    if (m === ' ') {
                        // This is an unknown.  See if it is the same as any
                        // prevailing candidate (or the first candidate)
                        if (c !== lastc && lastc !== '') {
                            // New candidate, so drop everything up to the the last
                            // candidate that we found
                            gathered = gathered.substr(gathered.lastIndexOf(lastc) + 1);
                            lastc = c;
                        }
                    }
                    gathered += c;
                }
                if (gathered.length > 5 && lastc !== '' && knownmap[lastc] !== 'X') {
                    const msg =
                        'we see the sequence ' +
                        gathered +
                        ' which would result in six or more - and Os a row if ' +
                        lastc +
                        ' were not an X.';
                    result.append(prefix + this.normalizeHTML(msg));
                    prefix = ' Also, ';
                    knownmap[lastc] = 'X';
                    gathered = '';
                    lastc = '';
                    found = true;
                }
            }
        }
        return found;
    }
    /**
     * Look through all the unknowns to see if they would generate illegal
     * Morse code based on being a dot or dash.  Note that we only check the
     * cases where there is a single unknown character in the set
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public findInvalidMorse(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {
        const found = false;
        let gathered = '';
        let sequence = '';
        let unknownc = '';
        let tryit = false;
        for (const strset of working) {
            for (let i = 0, len = strset[morseindex].length; i < len; i++) {
                const m = strset[morseindex][i];
                const c = strset[ctindex][i];
                if (m === 'X') {
                    // Try what we have gathered
                    if (tryit) {
                        let legal = 0;
                        let replacem = '';
                        for (const tc of knownmap[unknownc]) {
                            if (tc === 'X') {
                                const morseset = gathered.split('#');
                                let allok = true;
                                for (const morseitem of morseset) {
                                    if (morseitem !== '' && frommorse[morseitem] === undefined) {
                                        allok = false;
                                    }
                                }
                                if (allok) {
                                    legal++;
                                    replacem = tc;
                                }
                            } else {
                                const trymorse = gathered.replace(/#/g, tc);
                                if (frommorse[trymorse] !== undefined) {
                                    legal++;
                                    replacem = tc;
                                }
                            }
                        }
                        if (legal === 1) {
                            // We found exactly one legal morse code sequence
                            const msg =
                                'Based on the sequence ' +
                                sequence +
                                ' with ' +
                                unknownc +
                                " possibly being one of '" +
                                knownmap[unknownc] +
                                ', only ' +
                                replacem +
                                ' results in a legal morse code character, ' +
                                'so we can mark ' +
                                unknownc +
                                ' as being ' +
                                replacem +
                                '.';
                            result.append(this.normalizeHTML(msg));
                            knownmap[unknownc] = replacem;
                            return true;
                        }
                    }
                    unknownc = '';
                    gathered = '';
                    sequence = '';
                    tryit = false;
                } else if (m === ' ' || m === '?') {
                    if (c === unknownc || unknownc === '') {
                        // We can continue gathering
                        unknownc = c;
                        tryit = true;
                    } else {
                        tryit = false;
                        // Make unknownc something other than blank
                        // or a character that we could match against
                        // so we don't try to attack in the situation
                        // 139438
                        // O  - X
                        // where both 3 and 9 are unknowns.
                        unknownc = 'XX';
                    }
                    gathered += '#';
                    sequence += c;
                } else {
                    gathered += m;
                    sequence += c;
                }
            }
        }
        return found;
    }
    /**
     * Test a mapping to see if it generates a completely legal string
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns string blank = success, otherwise bad sequence to print
     */
    public findInvalidMorseChar(knownmap: StringMap, working: string[][]): string {
        let morsestr = '';
        let sequence = '';
        let tryit = false;
        for (const strset of working) {
            for (const c of strset[ctindex]) {
                const morsec = knownmap[c];
                if (morsec === undefined || morsec.length != 1) {
                    tryit = false;
                } else if (morsec === 'X') {
                    if (tryit && morsestr !== '') {
                        if (frommorse[morsestr] === undefined) {
                            return sequence + ' as ' + morsestr;
                        }
                    }
                    tryit = true;
                    morsestr = '';
                    sequence = '';
                } else {
                    sequence += c;
                    morsestr += morsec;
                }
            }
        }
        return '';
    }
    /**
     * Look through all the unknowns to see if they would generate illegal
     * Morse code based on being a dot or dash for tne entire string.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public findSingleMorse(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {
        let prefix = 'Trying our remaining candidates on the ciphertext, ';
        for (const c in knownmap) {
            // Is this a candiate to try replacement for?
            if (knownmap[c].length > 1) {
                const savemap = knownmap[c];
                let legal = '';
                for (const mc of savemap) {
                    knownmap[c] = mc;
                    const invalid = this.findInvalidMorseChar(knownmap, working);
                    if (invalid !== '') {
                        const msg =
                            'Attempting to substutite ' +
                            mc +
                            ' for ' +
                            c +
                            " doesn't work because we end up with the sequence " +
                            invalid +
                            ' which is not a legal morse code character, ' +
                            'so we can eliminate it as a possibility.';
                        result.append(prefix + this.normalizeHTML(msg));
                        prefix = ' Also, ';
                    } else {
                        legal += mc;
                    }
                }
                knownmap[c] = legal;
                if (legal.length === 1) {
                    const msg = ' Which means we know that ' + c + ' must map to ' + legal;
                    result.append(this.normalizeHTML(msg));
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Generates a test plaintext from a map
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Converted plaintext string
     */
    public applyKnownmap(knownmap: StringMap, working: string[][]): string {
        let plaintext = '';
        let morsestr = '';
        let xcount = 0;
        let tryit = true;
        for (const strset of working) {
            for (const c of strset[ctindex]) {
                const morsec = knownmap[c];
                if (morsec === undefined || morsec.length != 1) {
                    tryit = false;
                    xcount = 0;
                } else if (morsec === 'X') {
                    const p = frommorse[morsestr];
                    if (tryit && p !== undefined) {
                        plaintext += p;
                    } else if (xcount == 1) {
                        plaintext += ' ';
                    } else {
                        plaintext += this.repeatStr('?', (morsestr.length + 4) / 5);
                    }
                    tryit = true;
                    xcount++;
                    morsestr = '';
                } else {
                    morsestr += morsec;
                    xcount = 0;
                }
            }
        }
        return plaintext;
    }
    /**
     * Look through all the unknowns to see if we can find a long string that
     * looks promising.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public testSingleMorse(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {
        const mincipher = this.minimizeString(this.state.cipherString);
        for (const c in knownmap) {
            // Is this a candiate to try replacement for?
            if (knownmap[c].length > 1) {
                const savemap = knownmap[c];
                let legal = '';
                let msg =
                    'Since ' +
                    c +
                    ' can still map to ' +
                    this.normalizeHTML(savemap) +
                    ' we simply try them and look at the first word or two' +
                    ' to see if it makes sense.';
                for (const mc of savemap) {
                    knownmap[c] = mc;
                    const plaintext = this.applyKnownmap(knownmap, working);
                    // Now split it on all the unknowns to find the longest
                    // contiguous string
                    const chunks = plaintext.split('?');
                    let longest = chunks[0];
                    for (const chunk of chunks) {
                        if (chunk.length > longest.length) {
                            longest = chunk;
                        }
                    }
                    msg +=
                        ' Trying ' +
                        this.normalizeHTML(mc) +
                        ' for ' +
                        c +
                        ' gives us a chunk: ' +
                        longest +
                        '.';
                    longest = this.minimizeString(longest);
                    if (mincipher.indexOf(this.minimizeString(longest)) >= 0) {
                        legal += mc;
                    }
                }
                if (legal.length === 1) {
                    knownmap[c] = legal;
                    msg +=
                        ' Which means we know that ' +
                        c +
                        ' must map to ' +
                        this.normalizeHTML(legal);
                    result.append(msg);
                    return true;
                }
                knownmap[c] = savemap;
            }
        }
        return false;
    }

    /**
     * Look for 'no gaps in the alphabet after the keyword and fill this in...
     * @param result Place to output any progress messages
     * @param knownmap Map of known matches
     * @param working 
     */
    public noGapFill(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {

        let didFill = false;

        // go thru known map and get knowns
        // do math on the index of the knowns

        let last = '';
        let lastI = -1;
        for (const k of this.encodecharset) {
            if (knownmap[k] !== 'XXX') {
                let i = this.keywordMap.indexOf(k);
                if (last !== '') {
                    // Compare this to last and see if we can fill anything in...
                    let charDiff = k.charCodeAt(0) - last.charCodeAt(0);
                    let indexDiff = i - lastI;
                    if (charDiff === indexDiff && charDiff > 1) {
                        didFill = true;
                        for (let p = lastI + 1; p < i; p++) {
                            knownmap[this.keywordMap[p]] = this.morseReplaces[p];
                        }
                    }
                }
                last = k;
                lastI = i;
            }
        }
        // check for last being right distance from the end... then fill those..
        if (this.encodecharset.indexOf(last) == lastI) {
            for (let p = lastI + 1; p < this.encodecharset.length; p++) {
                knownmap[this.keywordMap[p]] = this.morseReplaces[p];
            }
        }
        return didFill;
    }


    public findZ(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {

        let didFindZ = true;

        if ((this.state.keyword.indexOf('Z') > -1) || (knownmap['Z'] !== 'XXX')) {
            didFindZ = false;
        } else {
            knownmap[this.keywordMap[25]] = this.morseReplaces[25];
        }

        return didFindZ;
    }

    /**
     * Generates the Match dropdown for a given string
     * @param str Pattern string to generate match dropdown
     */
    public findCloseWords(str: string): string[] {
        if (
            this.state.curlang === "" ||
            !this.Frequent.hasOwnProperty(this.state.curlang)
        ) {
            this.Frequent
            //return [];
        }
        // Get a template for the pattern of the word so that we can subset
        // which words we will pull from the precompiled language
        let pat = this.makeUniquePattern(str, 1);
        let repl = this.genReplPattern(str);
        let mselect = $("<select/>").addClass("match");
        if (typeof this.Frequent[this.state.curlang][pat] !== "undefined") {
            let matches = this.Frequent[this.state.curlang][pat];
            let selectclass = "";
            let matched = false;
            let added = 0;
            let used: BoolMap = {};
            let charset = this.getCharset().toUpperCase();
            for (let c of charset) {
                used[c] = false;
            }
            for (let c of charset) {
                used[this.state.replacement[c]] = true;
            }

            for (let i = 0, len = matches.length; i < len; i++) {
                let entry = matches[i];
                if (this.isValidReplacement(entry[0], repl, used)) {
                    if (!matched) {
                        selectclass = "l" + entry[3];
                    }
                    if (!matched) {
                        mselect.append(
                            $("<option/>", {
                                selected: "",
                                disabled: "",
                            })
                                .addClass("l" + entry[3])
                                .text(entry[0])
                        );
                    }
                    mselect.append(
                        $("<option/>")
                            .addClass("l" + entry[3])
                            .text(entry[0])
                    );
                    added++;
                    matched = true;
                    /*    } else if (entry[1] < 100 && added < 9) {
                    if (selectclass === '') {
                        selectclass = entry.c;
                    }
                    added++;
                    $('<option/>').addClass('l'+entry[3] + ' nomatch').text(entry.t).appendTo(mselect);
*/
                }
                if (matched && added > 9) {
                    break;
                }
            }
            if (added === 0) {
                selectclass = "nopat";
            }
            mselect.addClass(selectclass);
        } else {
            mselect.addClass("nopat");
        }
        return [];
    }

    public guessWord(
        result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]
    ): boolean {

        let didFindZ = true;

        //this.findCloseWords('sol')

        if ((this.state.keyword.indexOf('Z') > -1) || (knownmap['Z'] !== 'XXX')) {
            didFindZ = false;
        } else {
            knownmap[this.keywordMap[25]] = this.morseReplaces[25];
        }

        return didFindZ;
    }


    normalizeFmHTML(str: string): string {
        return super.normalizeHTML(str).replace(/\?/g, '&nbsp;');
    }

    private findIsolatedMorseBlankBefore2(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        return this.findIsolatedMorseBlankBefore(result, knownmap, working, 2);
    }
    private findIsolatedMorseBlankBefore3(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        return this.findIsolatedMorseBlankBefore(result, knownmap, working, 3);
    }

    /**
 * This method looks for a blank before an all morse fragment of three morse
 * characters.  Based on the 3 known morse characters, we can run thru the
 * possibilities of morse sequences that are valid.  So we take into account
 * length and possible morse sequences that could fit with the known fragment.
 * @param result
 * @param knownmap
 * @param working
 * @private
 */
    private findIsolatedMorseBlankBefore(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][],
        characterCount: number): boolean {
        let returnValue = false;
        let cipherSequence: string = '';
        let morseSequence: string = '';
        for (let i = 0; i < working.length; i++) {
            cipherSequence += working[i][0];
            morseSequence += working[i][1];
        }
        // blanks before a known all morse fragment (3 morse characters)
        let morseBlanksBefore = /[ ?]{3}[O-]{3}/g;
        if (characterCount === 2) {
            //                                                   C  W
            // Sometimes we might know the first symbol.  i.e. '0? OOX'
            // So we want to analyze that one.
            morseBlanksBefore = /[O\-? ][ ?]{2}[O-]{2}X/g;
        }
        // debug
        //console.log('====   Narrow down BEGINNING before fragment of ' + characterCount + '  ====');

        let someSuffix = morseSequence.match(morseBlanksBefore);
        if (someSuffix == null || someSuffix === undefined) {
            // debug
            //console.log('====   NO BEGINNING FOUND   ====');
            return returnValue;
        }

        let startSearch = 0;
        for (let i = 0; i < someSuffix.length; i++) {
            let msg = $('<p/>');
            let testLetterIndex = morseSequence.indexOf(someSuffix[i], startSearch);
            startSearch += testLetterIndex;
            // if the prefix is not at a fractionated boundary (every 3 symbols), then skip on to the next one.
            if (testLetterIndex % 3 !== 0)
                continue;

            msg.append('Look for an unknown mapping BEFORE a <b>' + characterCount + '<\/b> morse digit fragment to eliminate invalid morse sequences and reduce the possible mappings for the letter.  ');

            const morseSuffix = someSuffix[i].substring(3, 3 + characterCount).trim();
            let letter = cipherSequence.substr(testLetterIndex, 3).trim();

            msg.append('We find cipher text letter <code>' + letter + '</\code> before a known morse fragment of ' +
                this.normalizeFmHTML(someSuffix[i]) + '.  ');

            // debug
            //console.log('Test the letter "' + letter + '", found at: ' + testLetterIndex);
            let possibleValidSequences = this.validMorseBegins(morseSequence.substr(testLetterIndex + 3, characterCount));
            // debug
            //console.log('Valid morse character sequences that end with "' + morseSuffix + '" are: ' + possibleValidSequences);

            msg.append('Valid morse character sequence that end with ' + this.normalizeFmHTML(someSuffix[i]) + ' are: ');

            let regexList = []

            for (const possibleValidSequence of possibleValidSequences) {
                msg.append(this.normalizeHTML(possibleValidSequence) + (possibleValidSequence === possibleValidSequences[possibleValidSequences.length - 1] ? '.  ' : ', '));
                // p is what you get when you chop off the known suffix.
                let p = possibleValidSequence.slice(0, -characterCount);
                // The unknown can not be ALL morse characters because no letter/number is six morse characters.
                if (p.length === 0) {
                    // **X the unknown fragment could end with 'X' (word separator).
                    p = '..X';
                } else if (p.length === 1) {
                    // *X? the unknown fragment could have 'X' in the middle and a morse char at the end.
                    p = '.X' + p;
                } else if (p.length === 2) {
                    // X?? the unknown fragment could start with 'X' (meaning a number since there are 5 morse characters)
                    p = 'X' + p;
                }
                // Match P with the possibilitiesMap
                regexList.push(p);
            }

            // Make a regex string, or'ing the possible before fragments
            let firstString: boolean = true;
            let regularExpression = '';
            for (let regexString in regexList) {
                if (!firstString)
                    regularExpression += '|'
                regularExpression += regexList[regexString];
                firstString = false;
            }
            let re = RegExp(regularExpression, 'g');

            // Go through the possiblities map and find each entry with the letter and regex test if the mapping
            // is a possible matches.  If not remove that possbile mapping.
            let count = 0;
            msg.append('Combining this list with what <code>' + letter + '<\/code> can possibly be... ');
            for (let p in this.possibilitiesMap) {
                let possibilitiesMapIndex = this.possibilitiesMap[p].indexOf(letter);
                if (possibilitiesMapIndex > -1) {
                    count += 1;
                    if (!this.morseReplaces[p].match(re)) {
                        // remove p
                        // debug
                        //console.log('Remove ' + letter + ' from location: ' + p);
                        this.possibilitiesMap[p] = this.possibilitiesMap[p].replace(letter, '');
                        count -= 1;
                    } else {


                        let x = this.morseReplaces[p].lastIndexOf('X');
                        let morseRemainder = this.morseReplaces[p];
                        if (x > -1) {
                            morseRemainder = this.morseReplaces[p].substring(x + 1);
                        }
                        // debug
                        //console.log('Check "' + morseRemainder + morseSuffix + '"');
                        let v = frommorse[morseRemainder + morseSuffix].charCodeAt(0);
                        if (v < 65 || v > 90) {
                            msg.append('If <code>' + letter + '<\/code> maps to ' + this.normalizeHTML(this.morseReplaces[p]) +
                                ', it would yield a number in the plain-text, so we will elminate it for now.  ');
                            // debug
                            //console.log('"' + morseRemainder + morseSuffix + '" does not map to a letter, throw it out...');
                            this.possibilitiesMap[p] = this.possibilitiesMap[p].replace(letter, '');
                            count -= 1;
                        } else {
                            msg.append('<code>' + letter + '<\/code> might be ' + this.normalizeHTML(this.morseReplaces[p]) + '.  ');
                            // debug
                            //console.log('"' + letter + '" might be: ' + this.morseReplaces[p]);
                        }
                    }
                }
            }
            // debug
            //console.log('By my count, there are ' + count + ' possibilities for "' + letter + '" left.');
            if (count === 1) {
                for (let y = 0; y < this.possibilitiesMap.length; y++) {
                    if (this.possibilitiesMap[y].indexOf(letter) > -1) {
                        this.possibilitiesMap[y] = letter;
                        if (this.trialLetters[letter] != undefined) {
                            this.trialLetters[letter] = undefined;
                        }
                    }
                }
                msg.append('That leaves one possibility for <code>' + letter + '<\/code>, which is this ' +
                    this.normalizeHTML(this.findFragmentsForLetter(letter)[0]) + '.');
                result.append(msg);
                returnValue = true;
                break;
            } else {
                // If we already have this one, return true and break;?
                if (this.trialLetters[letter] != undefined) {
                    break;
                }
                this.trialLetters[letter] = this.findFragmentsForLetter(letter);
                result.append(msg);
                msg = $('<p/>');
            }
        }
        this.cleanPossibilities(knownmap);
        this.reconcileKnownMap(knownmap);
        this.reconcilePossibilitiesMap(knownmap);
        return returnValue;
    }

    private findIsolatedMorseBlankAfter2(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        return this.findIsolatedMorseBlankAfter(result, knownmap, working, 2);
    }
    private findIsolatedMorseBlankAfter3(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        return this.findIsolatedMorseBlankAfter(result, knownmap, working, 3);
    }

    private findIsolatedMorseBlankAfter(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][],
        characterCount: number): boolean {
        let returnValue = false;
        let cipherSequence: string = '';
        let morseSequence: string = '';
        for (let i = 0; i < working.length; i++) {
            cipherSequence += working[i][0];
            morseSequence += working[i][1].replace(/\?/g, ' ');
        }
        // blanks after all morse
        let morseBlanksAfter = /[O-]{3}[ ?]{3}/g;
        if (characterCount === 2) {
            morseBlanksAfter = /[X][O-]{2}[0\- ?][ ?]{2}/g;
        }
        // debug
        //console.log('====   Narrow down ENDING after fragment of ' + characterCount + '  ====');

        let somePrefix = morseSequence.match(morseBlanksAfter);
        if (somePrefix == null) {
            // debug
            //console.log('====   NO ENDING FOUND   ====');
            return returnValue;
        }

        let startSearch = 0;
        for (let i = 0; i < somePrefix.length; i++) {
            let msg = $('<p/>');
            let testLetterIndex = morseSequence.indexOf(somePrefix[i], startSearch) + 3;
            startSearch += testLetterIndex;
            // if the prefix is not at a fractionated boundary (every 3 symbols), then skip on to the next one.
            if (testLetterIndex % 3 !== 0)
                continue;

            msg.append('Look for an unknown mapping AFTER a <b>' + characterCount + '<\/b> morse digit fragment to eliminate invalid morse sequences and reduce the possible mappings for the letter.  ');

            const morsePrefix = somePrefix[i].substring(3 - characterCount).trim();
            let letter = cipherSequence.substr(testLetterIndex, 3).trim();

            msg.append('We find cipher text letter <code>' + letter + '</\code> after a known morse fragment of ' +
                this.normalizeFmHTML(somePrefix[i]) + '.  ');

            // debug
            //console.log('Test letter: ' + letter + ' found at: ' + testLetterIndex);
            let possibleValidSequences = this.validMorseEnds(morseSequence.substr(testLetterIndex - characterCount, characterCount));
            // debug
            //console.log('Valid morse character sequences that start with "' + morsePrefix + '" are: ' + possibleValidSequences);

            msg.append('Valid morse character sequences that start with ' + this.normalizeFmHTML(somePrefix[i]) + ' are: ');

            let regexList = [];

            for (const possibleValidSequence of possibleValidSequences) {
                msg.append(this.normalizeHTML(possibleValidSequence) + (possibleValidSequence === possibleValidSequences[possibleValidSequences.length - 1] ? '.  ' : ', '));
                // p is what you get when you chop off the know prefix
                let p = possibleValidSequence.slice(characterCount);
                // The unknown can not be ALL morse characters because no letter/number is six morse characters.
                if (p.length === 0) {
                    // X.. the unknown fragment could begin with 'X' (word separator).
                    p = 'X..';
                } else if (p.length === 1) {
                    // *X. the unknown fragment could have 'X' in the middle and a morse char at the end.
                    p = p + 'X.';
                }
                else if (p.length === 2) {
                    // ??X the unknown fragment could end with 'X' (meaning a number since there are 5 morse characters).
                    p = p + 'X';
                }
                // Match p with the possibilitiesMap
                regexList.push(p);
            }

            // Make a regex string, or'ing the possible before fragments
            let firstString: boolean = true;
            let regularExpression = '';
            for (let regexString in regexList) {
                if (!firstString)
                    regularExpression += '|';
                regularExpression += regexList[regexString];
                firstString = false;
            }
            let re = RegExp(regularExpression, 'g');

            // Go through the possiblities map and find each entry with the letter and regex test if the mapping
            // is a possible matches.  If not remove that possbile mapping.
            let count = 0;
            msg.append('Combining this list with what <code>' + letter + '<\/code> can possibly be... ');
            for (let p in this.possibilitiesMap) {
                let possibilitiesMapIndex = this.possibilitiesMap[p].indexOf(letter);
                if (possibilitiesMapIndex > -1) {
                    count += 1;
                    if (!this.morseReplaces[p].match(re)) {
                        // remove p
                        // debug
                        //console.log('Remove ' + letter + ' from location: ' + p);
                        this.possibilitiesMap[p] = this.possibilitiesMap[p].replace(letter, '');
                        count -= 1;
                    } else {
                        let x = this.morseReplaces[p].indexOf('X');
                        let morseRemainder = this.morseReplaces[p].substr(0, x);
                        if (x === -1) {
                            morseRemainder = this.morseReplaces[p];
                        }
                        let v = frommorse[morsePrefix + morseRemainder].charCodeAt(0);
                        if (v < 65 || v > 90) {
                            msg.append('If <code>' + letter + '<\/code> maps to ' + this.normalizeHTML(this.morseReplaces[p]) +
                                ', it would yield a number in the plain-text, so we will elminate it for now.  ');
                            // debug
                            //console.log('Not a letter, throw it out...');
                            this.possibilitiesMap[p] = this.possibilitiesMap[p].replace(letter, '');
                            count -= 1;
                        } else {
                            msg.append('<code>' + letter + '<\/code> might be ' + this.normalizeHTML(this.morseReplaces[p]) + '.  ');
                            // debug
                            //console.log('"' + letter + '" might be: ' + this.morseReplaces[p]);
                        }
                    }
                }
            }
            // debug
            //console.log('By my count, there are ' + count + ' possibilities for "' + letter + '" left.');
            if (count === 1) {
                for (let y = 0; y < this.possibilitiesMap.length; y++) {
                    if (this.possibilitiesMap[y].indexOf(letter) > -1) {
                        this.possibilitiesMap[y] = letter;
                        this.removeKnownFromPossibilitiesMap(this.possibilitiesMap, y, letter);
                        if (this.trialLetters[letter] != undefined) {
                            this.trialLetters[letter] = undefined;
                        }
                    }
                }
                msg.append('That leaves one possibility for <code>' + letter + '<\/code>, which is this ' +
                    this.normalizeHTML(this.findFragmentsForLetter(letter)[0]) + '.');
                result.append(msg);
                returnValue = true;
                break;
            } else {
                // If we already have this one, return true and break;?
                if (this.trialLetters[letter] != undefined) {
                    break;
                }
                this.trialLetters[letter] = this.findFragmentsForLetter(letter);
                result.append(msg);
                msg = $('<p/>');
            }
        }
        this.cleanPossibilities(knownmap);
        this.reconcileKnownMap(knownmap);
        this.reconcilePossibilitiesMap(knownmap);
        return returnValue;
    }

    private findFragmentsForLetter(letter: string): string[] {
        const possibles: string[] = [];
        for (let i = 0; i < this.possibilitiesMap.length; i++) {
            if (this.possibilitiesMap[i].indexOf(letter) > -1) {
                possibles.push(this.morseReplaces[i]);
            }
        }
        return possibles;
    }

    private validMorse(fragment: string, location: number): string[] {

        let addedChars = 5 - fragment.length;

        if (addedChars > 3 || addedChars < 1) {
            //debug
            // console.log('Can not compute valid morse from ' + addedChars + ' added characters.');
            return null;
        }

        let validMorse = [];

        let additionalFragments = [''];
        for (let i = 1; i <= addedChars; i++) {
            for (let j = 0; j < this.morseFragments[i].length; j++) {
                additionalFragments.push(this.morseFragments[i][j]);
            }
        }
        let lookup = '';
        for (let i = 0; i < additionalFragments.length; i++) {

            if (location === 0) {
                lookup = additionalFragments[i] + fragment.trim();
            } else if (location === 1) {
                lookup = fragment.trim() + additionalFragments[i];
            }

            let letter = frommorse[lookup];
            if (letter != undefined && /[A-Z0-9]/.test(letter)) {
                validMorse.push(tomorse[letter]);
            }
        }
        return validMorse;
    }

    private validMorseEnds(fragment: string): string[] {
        return this.validMorse(fragment, 1);
    }

    private validMorseBegins(fragment: string): string[] {
        return this.validMorse(fragment, 0);
    }

    private eliminateInvalidSequences(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        let cipherSequence: string = '';
        let morseSequence: string = '';
        for (let i = 0; i < working.length; i++) {
            cipherSequence += working[i][0];
            morseSequence += working[i][1];
        }
        // find a 'blank' morse fraction
        let singleBlankFraction = /[^? ]{3}[? ]{3}[^? ]{3}/g;
        let dude = morseSequence.match(singleBlankFraction);
        //debug
        // console.log('---------> ' + cipherSequence);
        // console.log('+++++++++> ' + morseSequence);
        // console.log('=========> ' + dude);
        if (dude === null) {
            //debug
            // console.log('------> Nothing found <-----');
            return false;
        }
        let blankLetterIndex = morseSequence.indexOf(dude[0]) + 3;
        let letter = cipherSequence.substr(blankLetterIndex, 3).trim();
        //debug
        // console.log('letter that is blank is: ' + letter);

        return false;
    }

    /**
     * This creates an initial 2 dimensional array, where the first
     * dimension is the replacement table slot and the second dimension
     * is the string of possible letters in the corresponding slot.
     */
    public initializePossibilitiesMap() {
        let thing = new Array(26);
        for (let i = 0; i < 26; i++) {
            thing[i] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        }
        this.possibilitiesMap = thing;
    }

    /**
     * fillIn(start: int, end: int, lettersPerSlot: int, firstLetter: char)
     * @param thing the possibilities map to be filled in
     * @param startIndex index in the keywordMap of where we should start putting letters (i.e one past the known letter)
     * @param endIndex index in the keywordMap of where to stop filling in (non-inclusive)
     * @param lettersPerSlot how many letters go in each slot
     * @param firstLetterIndex index from regular alphabet of where to start getting letters from
     */
    public fillInContinuousPossibilitiesMap(thing: string[], startIndex: number, endIndex: number, lettersPerSlot: number, firstLetterIndex: number): string[] {

        for (let i = startIndex; i < endIndex; i++) {
            const letters = this.encodecharset.substr(firstLetterIndex, lettersPerSlot);
            thing[i] = letters;
            firstLetterIndex += 1;
            if (lettersPerSlot === 1) {
                this.removeKnownFromPossibilitiesMap(thing, i, letters);
            }
        }
        return thing;
    }

    public fillInRangeThings(thing: string[], startIndex: number, endIndex: number, lettersPerSlot: number, firstLetterIndex: number): string[] {
        return this.fillInContinuousPossibilitiesMap(thing, startIndex, endIndex, lettersPerSlot, firstLetterIndex);
    }

    public fillInKnownPossibilitiesMap(thing: string[], index: number, letter: string): string[] {
        thing[index] = letter;

        this.removeKnownFromPossibilitiesMap(thing, index, letter);
        return thing;

    }

    public removeKnownFromPossibilitiesMap(thing: string[], knownAt: number, letter: string): string[] {

        for (let i = 0; i < thing.length; i++) {
            if (i === knownAt)
                continue;
            let indexOfLetter = thing[i].indexOf(letter);
            if (indexOfLetter === -1)
                continue;
            thing[i] = thing[i].substring(0, indexOfLetter) + thing[i].substring(indexOfLetter + 1);
        }
        return thing;
    }


    public dumpPossibilitiesMap() {
        for (let i = 0; i < this.possibilitiesMap.length; i++) {
            console.log(this.morseReplaces[i] + ' --- ' + this.possibilitiesMap[i]);
        }
    }

    /**
     * If there is a real mapping in the knownmap, then set the possibilitiesMap accordingly to have that 1 mapping
     * and remove the possibilities from everywhere else.
     * @param knownmap
     * @private
     */
    private reconcilePossibilitiesMap(knownmap: StringMap) {

        for (const k in knownmap) {
            if (knownmap[k] === 'XXX') {
                continue;
            }
            const letterIndex = this.keywordMap.indexOf(k);

            for (let i = 0; i < this.possibilitiesMap.length; i++) {
                let indexOfLetter = this.possibilitiesMap[i].indexOf(k);
                if (indexOfLetter === -1 || i === letterIndex)
                    continue;
                this.possibilitiesMap[i] = this.possibilitiesMap[i].substring(0, indexOfLetter) + this.possibilitiesMap[i].substring(indexOfLetter + 1);
            }
        }
    }
    private cleanPossibilities(knownmap: StringMap) {
        return;
        let letterCounts = {};
        for (let i = 0; i < this.encodecharset.length; i++) {
            let count = 0;
            let foundAt = -1;
            const letter = this.encodecharset[i];
            letterCounts[letter] = 0;
            for (let j = 0; j < this.possibilitiesMap.length; j++) {
                if (this.possibilitiesMap[j].indexOf(letter) > -1) {
                    foundAt = j;
                    count += 1;
                }
            }
            if (count === 1 && knownmap[letter] === 'XXX') {
                //debug
                // console.log('Found and fixed ' + letter + ' to be ' + this.morseReplaces[foundAt]);
                knownmap[letter] = this.morseReplaces[foundAt];
                this.possibilitiesMap[foundAt] = letter;
            }
        }
    }

    /**
     * If there is 1 possibility in the map, then set the knownmap to that mapping
     *
     */
    private reconcileKnownMap(knownmap: StringMap) {
        for (let i = 0; i < this.possibilitiesMap.length; i++) {
            if (this.possibilitiesMap[i].length === 1) {
                if (knownmap[this.keywordMap[i]] === 'XXX') {
                    //debug
                    // console.log('Updating: ' + this.keywordMap[i]);
                    knownmap[this.keywordMap[i]] = this.morseReplaces[i];
                }
                this.trialLetters[this.keywordMap[i]] = undefined;
                this.removeKnownFromPossibilitiesMap(this.possibilitiesMap, i, this.keywordMap[i]);
            }
        }
    }

    private exploreStandaloneLetter(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {

        let sfsm: StringMap = {};
        let cipherSequence: string = '';
        let morseSequence: string = '';
        for (let i = 0; i < working.length; i++) {
            cipherSequence += working[i][0];
            morseSequence += working[i][1];
        }
        // find a 'blank' morse fraction
        let blankBetweenXs = /[^ ]{1}XX[ ]{3}[^ ]*/;
        let dude = morseSequence.match(blankBetweenXs);
        //debug
        // console.log('---------> ' + cipherSequence);
        // console.log('+++++++++> ' + morseSequence);
        // console.log('=========> ' + dude);
        if (dude === null) {
            return false;
        }
        let blankLetterIndex = morseSequence.indexOf(dude[0]) + 3;
        let letter = cipherSequence.substr(blankLetterIndex, 3).trim();
        //debug
        // console.log('Let analyze the letter that is blank: ' + letter);
        // console.log('Possibilities for this fragment: ');
        // toss the first character so we start on a word boundary.
        const incompleteMorse = dude[0].substring(1);
        const possibles = this.findFragmentsForLetter(letter);
        for (let i = 0; i < possibles.length; i++) {
            const frag = incompleteMorse.replace(/   /, possibles[i]);
            //debug
            // console.log(frag);
            const sticks = this.decodeFragment(frag);
            //debug
            // console.log(this.decodeFragment(frag));

            const stick = sticks.split(' ');

            for (let j = 0; j < stick.length; j++) {
                let stck = stick[j];
                let matchstr = "";
                let keepadding = true;
                let repl = [];
                let matches = [];
                let used: BoolMap = {};
                let slen = stck.length / this.cipherWidth;
                // First we need to find a pattern for the replacement that we can work with

                for (let i = 0; i < slen; i++) {
                    let piece = stck.substr(i * this.cipherWidth, this.cipherWidth);
                    let substitute = "";
                    if (typeof sfsm[piece] === "undefined") {
                        keepadding = false;
                    } else {
                        substitute = sfsm[piece];
                    }
                    if (keepadding) {
                        matchstr += substitute;
                    }
                    repl.push(substitute);
                }
                let pat = this.makeUniquePattern(matchstr, this.cipherWidth);
                let patlen = pat.length;
                for (let tpat in this.Frequent[this.state.curlang]) {
                    if (
                        this.Frequent[this.state.curlang].hasOwnProperty(tpat) &&
                        tpat.length === slen &&
                        tpat.substr(0, patlen) === pat
                    ) {
                        let tmatches = this.Frequent[this.state.curlang][tpat];
                        let added = 0;
                        for (let i = 0, len = tmatches.length; i < len; i++) {
                            let entry = tmatches[i];
                            // if (this.isValidReplacement(entry[0], repl, used)) {
                            //     matches.push(entry);
                            //     added++;
                            //     if (added > 3) {
                            //         break;
                            //     }
                            // }
                        }
                    }
                }
            }


        }

        return true;
    }

    private decodeFragment(frag: string): string {
        let returnValue = '';
        const frags = frag.split('X');
        for (let i = 0; i < frags.length; i++) {
            returnValue += (frommorse[frags[i]] === undefined ? ' ' : frommorse[frags[i]]);
        }

        return returnValue.trim();
    }

    /**
     * When new known mappings are found, clean up that letter from any other possibilities.  Then see if
     * a span between known letters can be filled in by counting the unknown slots and the number of unique
     * unknown letters.  If there is a match, just fill the span in order...
     * @private
     */
    private cleanAndCheckSpans(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        let returnValue = false;
        let msg = $('<p/>');
        msg.append('Scanning possibilities table to remove unknowns.  ');
        // Clean phase...
        for (let k = 0; k < this.encodecharset.length; k++) {
            if (knownmap[this.encodecharset[k]] != 'XXX') {
                // remove k from anywhere it is in the possiblitiesMap
                for (let i = 0; i < this.possibilitiesMap.length; i++) {
                    let indexOfLetter = this.possibilitiesMap[i].indexOf(this.encodecharset[k]);
                    if (indexOfLetter > -1) {
                        if (this.possibilitiesMap[i].length > 1) {
                            this.possibilitiesMap[i] = this.possibilitiesMap[i].substring(0, indexOfLetter) + this.possibilitiesMap[i].substring(indexOfLetter + 1);
                        }
                    }
                }
            }
        }
        // Check spans phase...start past the keyword...
        let startSpan = -1;
        let endSpan = -1;
        for (let i = 0; i < this.possibilitiesMap.length; i++) {
            if (this.possibilitiesMap[i].length === 1) {
                // i = start of span
                if (startSpan != -1) {
                    endSpan = i;
                } else {
                    startSpan = i;
                }
                if (startSpan > -1 && endSpan > startSpan) {
                    // Check this span...
                    const uniqueUnknowns = new Set();
                    for (let j = startSpan + 1; j < endSpan; j++) {
                        for (let k = 0; k < this.possibilitiesMap[j].length; k++) {
                            const uniqueLetter = this.possibilitiesMap[j][k];
                            uniqueUnknowns.add(uniqueLetter);
                        }
                    }
                    //debug
                    // console.log('Span distance...' + (endSpan - startSpan));
                    // console.log('Unique unknowns...' + uniqueUnknowns.size);
                    if (endSpan - startSpan === uniqueUnknowns.size) {
                        // Fill in this span...
                        let startChar = this.possibilitiesMap[startSpan].charCodeAt(0);
                        for (let j = startSpan + 1; j < endSpan; j++) {
                            const charToSet = String.fromCharCode(startChar + (j - startSpan));
                            this.possibilitiesMap[j] = charToSet;
                            //  removeCharFromPossibilities.
                            this.removeKnownFromPossibilitiesMap(this.possibilitiesMap, j, charToSet);
                            // TODO: knownmap needs to be updated so more characters are printer out...

                        }
                        this.reconcileKnownMap(knownmap);
                        msg.append('Possible mappings between letters <code>' + startChar + '<\/code> and <code>' +
                            this.possibilitiesMap[endSpan] + '<\/cpde> can be simplified.');
                        returnValue = true;
                    }

                    // reset spans
                    startSpan = endSpan;
                    endSpan = -1;
                }
            }
        }
        if (!returnValue) {
            msg.append('None found.');
        }
        result.append(msg);
        return returnValue;
    }

    private takeAGuess(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        let returnValue = false;
        let msg = $('<p/>');
        msg.append('Try some of the possibilities...  ');

        for (const letter in this.trialLetters) {

            const guesses = this.trialLetters[letter];
            if (guesses === undefined)
                continue;
            let message = 'We know <code>' + letter + '</code> can be one of ';
            let first = true;
            for (const guess of guesses) {
                if (!first) {
                    message += ', ';
                }
                message += this.normalizeHTML(guess);
                first = false;
            }
            message += '.  ';
            msg.append(message);
            result.append(msg);
            for (const guess of guesses) {
                msg = $('<p/>');
                msg.append('Trying  ' + this.normalizeHTML(guess) + ' for <code>' + letter + '</code>, we\'d get:');
                result.append(msg);
                const guessStrings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);
                let localKnownMap = JSON.parse(JSON.stringify(knownmap));
                localKnownMap[letter] = guess;
                let working = this.genKnownMapping(guessStrings, localKnownMap);
                let previousWasElipsis = false;
                let cleanedWorking: string[][] = [];
                for (let line = 0; line < working.length; line++) {
                    if (working[line][ctindex].indexOf(letter) === -1) {
                        if (!previousWasElipsis) {
                            cleanedWorking.push(['', '...', '']);
                            previousWasElipsis = true;
                        }
                    } else {
                        cleanedWorking.push(working[line]);
                        previousWasElipsis = false;
                    }
                }
                this.genMapping(result, cleanedWorking);
                msg = $('<p/>');
                let letterIndex = this.keywordMap.indexOf(letter);
                let actualMapping = this.morseReplaces[letterIndex];
                if (guess === actualMapping) {
                    this.possibilitiesMap[letterIndex] = letter;
                    this.removeKnownFromPossibilitiesMap(this.possibilitiesMap, letterIndex, letter);
                    this.trialLetters[letter] = undefined;

                    msg.append('That makes sense.  Update our table with the mapping of <code>' + letter +
                        '</code> to ' + this.normalizeHTML(guess) + '.');
                    returnValue = true;
                    break;
                } else {
                    msg.append('That guess does not look too promising.');
                }
                result.append(msg);
            }
            if (returnValue)
                break;
        }
        if (returnValue) {
            this.cleanPossibilities(knownmap);
            this.reconcileKnownMap(knownmap);
            this.reconcilePossibilitiesMap(knownmap);

            result.append(msg);
        }
        return returnValue;

    }

    private scanAndFillContinuous(result: JQuery<HTMLElement>, unknownMappedLetters: string, knownmap: StringMap): number {

        let approximateKeywordLength = 0;
        let endAt = this.encodecharset.length;

        let thing: string[] = this.possibilitiesMap;

        let delta = 0;

        for (let i = this.encodecharset.length - 1; i > -1; i--) {
            const theLetter = this.encodecharset[i];

            if (unknownMappedLetters.length === 1) {
                break;
            }
            if (knownmap[theLetter] === 'XXX') {
                // pop off end of working alphabet
                //unknownMappedLetters = unknownMappedLetters.substr(0, unknownMappedLetters.length - 1);
            } else {
                // debug
                //console.log('The letter is ' + theLetter + '; check its position in the KEYWORD map to see if it matches i (' + i + ').');

                const knownIndex = this.keywordMap.indexOf(theLetter);
                delta = knownIndex - i;
                // debug
                //console.log('DELTA is ' + delta);

                // check for match and the letter is not in the keyword at its natural location (kind of a cheat on the second part.)
                if (delta === 0 && this.state.keyword.indexOf(theLetter) != -1) {
                    if (!this.mentionedLetters.has(theLetter)) {
                        let msg = $('<p/>');
                        msg.append('The mapping of the letters between <code>' + theLetter + '</code> and <code>' +
                            this.encodecharset[endAt] +
                            '</code> are now known because the number of unknowns exactly matches the distance between these letters.');
                        result.append(msg);
                        for (let loop = i; loop <= endAt; loop++) {
                            this.mentionedLetters.add(this.encodecharset[loop]);
                        }
                    }
                    // debug
                    //console.log('From here (offset: ' + i + ') to the right is known.');
                    let firstLetterIndex = this.encodecharset.indexOf(theLetter);
                    thing = this.fillInContinuousPossibilitiesMap(thing, i + 1, endAt, 1, firstLetterIndex + 1);
                    endAt = this.keywordMap.indexOf(theLetter);
                } else if (delta < 0 || delta < approximateKeywordLength || delta > i /* || this.state.keyword.toUpperCase().indexOf(theLetter) > -1*/) {
                    if (!this.mentionedLetters.has(theLetter)) {
                        let msg = $('<p/>');
                        msg.append('The letter <code>' + theLetter + '</code> is likely in the keyword');
                        result.append(msg);
                        this.mentionedLetters.add(theLetter);
                    }
                    // debug
                    //console.log(theLetter + ' is probably in the keyword');
                    // remove from possibilities.
                    this.removeKnownFromPossibilitiesMap(thing, knownIndex, theLetter);
                } else {
                    if (!this.mentionedLetters.has(theLetter)) {
                        let msg = $('<p/>');
                        msg.append('It is known that <code>' + theLetter + '</code> maps to ' + this.normalizeHTML(knownmap[theLetter]));
                        result.append(msg);
                    }
                    // debug
                    //console.log('More work to do.  delta: ' + delta);
                    let firstLetterIndex = this.encodecharset.indexOf(theLetter);

                    // Number between these two endpoints in the real alphabet
                    let endLetterIndex = this.encodecharset.indexOf(this.keywordMap[endAt])
                    if (endLetterIndex === -1) {
                        endLetterIndex = 26;
                    }
                    const lettersInRange = endLetterIndex - firstLetterIndex;

                    // calculate number of blanks between two endpoints in the keyword alphabet
                    let firstBlankIndex = this.keywordMap.indexOf(theLetter) + 1;

                    // Number of spaces between the endpoints in the keyword map.
                    const blanksInRange = endAt - firstBlankIndex;

                    const potentialLetterSet = this.encodecharset.substring(firstLetterIndex, endLetterIndex);
                    const realLetterSet = [];
                    for (let l of potentialLetterSet) {
                        if (knownmap[l] === 'XXX') {
                            // save it
                            realLetterSet.push(l);
                        }
                    }
                    const letterSet = realLetterSet.join('');
                    const fillSize = letterSet.length + 1 - blanksInRange;

                    for (let j = 0; j < blanksInRange; j++) {
                        thing[knownIndex + 1 + j] = letterSet.substr(j, fillSize);
                    }

                    let lettersPerSlot = lettersInRange - blanksInRange;
                    if (lettersPerSlot < 1) {
                        lettersPerSlot = 26;
                    }
                    if (lettersPerSlot === 1) {
                        // I expect this to only happen on the end - it is an edge case.
                        if (theLetter !== this.keywordMap[endAt] && this.state.keyword.toUpperCase().indexOf(theLetter) === -1) {

                            const endLetter = this.keywordMap[endAt] !== undefined ? this.keywordMap[endAt] : this.keywordMap[endAt - 1];
                            if (this.keywordMap[endAt] === undefined) {
                                endAt -= 1;
                                thing[endAt] = this.keywordMap[endAt];
                            }

                            if (!this.mentionedLetters.has(theLetter)) {
                                let msg = $('<p/>');
                                msg.append('The mapping of the letters between <code>' + theLetter + '</code> and <code>' +
                                    this.keywordMap[endAt] +
                                    '</code> are now known because the number of unknowns exactly matches the distance between the letters.');
                                result.append(msg);
                                for (let loop = i; loop <= endAt; loop++) {
                                    this.mentionedLetters.add(this.encodecharset[loop]);
                                }
                            }
                        }
                    } else {

                        // Make sure the range we are trying to fill is contiguous, if it isn't, then don't do anything and continue the loop
                        // if (blanksInRange === 0)
                        //     continue;
                        if (!this.mentionedLetters.has(theLetter)) {
                            let msg = $('<p/>');
                            msg.append('Fill in possibilities between <code>' + theLetter + '</code> and ' +
                                (this.keywordMap[endAt] === undefined ? 'the end.' : '<code>' + this.keywordMap[endAt] + '</code>.'));
                            result.append(msg);
                            this.mentionedLetters.add(theLetter);
                        }
                    }
                    endAt = this.keywordMap.indexOf(theLetter);
                }
                approximateKeywordLength = Math.max(approximateKeywordLength, delta);
            }
        }
        //update knownmap from possibilities map
        this.reconcileKnownMap(knownmap);
        return approximateKeywordLength;
    }

    private updatePossibilitiesMapFromKnown(knownmap: StringMap): string[] {
        let returnValue: string[] = [];
        let unknownMappedLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let knownMappedLetters = '';
        for (const m of this.encodecharset) {
            if (knownmap[m] !== 'XXX') {
                let i = unknownMappedLetters.indexOf(m);
                let front = unknownMappedLetters.substr(0, i);
                let back = unknownMappedLetters.substr(i + 1);
                unknownMappedLetters = front + back;
                knownMappedLetters += m;
            }
        }
        //
        // console.log('The unknown Alphabet is: ' + unknownMappedLetters);
        // console.log('The known Alphabet is: ' + knownMappedLetters);
        this.initializePossibilitiesMap();
        let endAt = this.encodecharset.length;

        let thing: string[] = this.possibilitiesMap;

        // Set the known letters in the thing
        for (let l = 0; l < knownMappedLetters.length; l++) {
            const startIndex = this.keywordMap.indexOf(knownMappedLetters[l]);
            this.fillInKnownPossibilitiesMap(thing, startIndex, knownMappedLetters[l]);
        }
        returnValue.push(unknownMappedLetters);
        returnValue.push(knownMappedLetters);

        return returnValue;
    }

    /**
     * Display the steps on how to solve the cipher.
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        let msg = '';
        if (this.state.cipherString === '') {
            this.setErrorMsg(msg, 'polgs');
            return result;
        }
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);
        const knownmap: StringMap = {};

        // Make a copy and remove the slash word separator
        const hintStrings = strings.map(array => array.slice());
        for (let hintString of hintStrings) {
            hintString[ptindex] = hintString[ptindex].replace(new RegExp('/', 'g'), ' ');
        }

        const hint = this.checkHintCrib(testType, result, hintStrings);
        if (hint === undefined) {
            return result;
        }

        // Assume we don't know what anything is
        for (const c of this.encodecharset) {
            knownmap[c] = 'XXX';
            this.trialLetters[c] = undefined;
        }
        this.mentionedLetters.clear();

        for (const c of hint) {
            let i = this.keywordMap.indexOf(c);
            if (i > -1) {
                knownmap[c] = this.morseReplaces[i];
            }
        }

        let known = 0;
        for (let s in this.mappingSolution) {
            if (s !== '') {
                known += 1;
            }
        }

        known = 0;
        for (const m of this.encodecharset) {
            if (knownmap[m] !== 'XXX') {
                known += 1;
            }
        }
        let mappedLetters = this.updatePossibilitiesMapFromKnown(knownmap);
        let roughKeywordLength = this.scanAndFillContinuous(result, mappedLetters[1], knownmap);

        this.reconcilePossibilitiesMap(knownmap);

        // This is just for displaying what we know...
        // this.genKnownTable(result, knownmap); --> generateFractionatedTable() is superior to genKnownTable()
        let workingTable = this.generateFractionatedTable(true, knownmap, 'ansblock');
        result.append(workingTable);

        let possibilitiesTable = this.generatePossibilitiesTable(true, this.possibilitiesMap, 'ansblock');
        // recalculates based on what is 'known' (in the knownmap).
        let working = this.genKnownMapping(strings, knownmap);

        result.append('We can approximate the keyword length to be around ' + roughKeywordLength + '.\n');
        result.append('Based on what is known from the replacement table, the remaining possible mappings are:');
        result.append(possibilitiesTable);
        this.reconcileKnownMap(knownmap);

        result.append('Based on that information we can map the cipher text to:');
        // recalculates based on what is 'known' (in the knownmap).
        working = this.genKnownMapping(strings, knownmap);
        // displays the (partial) solution we know so far.
        this.genMapping(result, working);

        if (!this.hasUnknowns(result, knownmap, working)) {
            result.append(
                'Which means that the hint has provide all of the' +
                ' cipher digit mapping and there is no work to solve it'
            );
        } else {
            let limit = 20;
            while (limit > 0) {

                /*if (this.cleanAndCheckSpans(result, knownmap, working)) {
                    console.log('Checked spans...');
                } else*/ if (this.findIsolatedMorseBlankBefore3(result, knownmap, working)) {
                    //console.log('Found: findIsolatedMorseBlankBefore3');
                } else if (this.findIsolatedMorseBlankBefore2(result, knownmap, working)) {
                    //console.log('Found: exploreStandaloneLetter');
                } else if (this.findIsolatedMorseBlankAfter3(result, knownmap, working)) {
                    //console.log('Found: findIsolatedMorseBlankBefore2');
                } else if (this.findIsolatedMorseBlankAfter2(result, knownmap, working)) {
                    //console.log('Found: findIsolatedMorseBlankAfter2');
                    // } else if (this.exploreStandaloneLetter(result, knownmap, working)) {
                    //     console.log('Found: exploreStandaloneLetter');
                    // } else if (this.eliminateInvalidSequences(result, knownmap, working)) {
                    //     console.log('Found: findIsolatedMorseBlankAfter');
                } else if (this.takeAGuess(result, knownmap, working)) {
                    //
                    // console.log('Found: findIsolatedMorseBlankAfter2');
                } else {
                    // Nothing more that we can do..
                    result.append(
                        $('<h4.>').text(
                            'There are no more automated solving techniques, ' +
                            'so you need to do some trial and error with the remaining unknowns. ' +
                            'Please feel free to submit an issue with the example so we can improve this.'
                        )
                    );
                    limit = 0;
                    msg = 'Automated solver is unable to find an automatic solution.';
                    // Used for debug...
                    // this.dumpPossibilitiesMap();
                    break;
                }
                // need string of all unknowns letters
                let ul = "";
                for (let p = 0; p < this.possibilitiesMap.length; p++) {
                    if (this.possibilitiesMap[p].length > 1) {
                        ul += this.encodecharset[p];
                    }
                }
                let mappedLetters = this.updatePossibilitiesMapFromKnown(knownmap);
                this.scanAndFillContinuous(result, mappedLetters[1], knownmap);
                this.reconcileKnownMap(knownmap);

                working = this.genKnownMapping(strings, knownmap);
                // helps with debug
                //workingTable = this.generateFractionatedTable(true, knownmap, '');
                //result.append(workingTable);
                result.append('The updated table containing possible mappings is:');
                result.append(this.generatePossibilitiesTable(true, this.possibilitiesMap, 'ansblock'))
                result.append('Based on that information we can map the cipher text as:');
                this.genMapping(result, working);

                if (this.hasUnknowns(result, knownmap, working)) {
                    limit--;
                } else {
                    let answer = '';
                    for (const strset of working) {
                        answer += strset[ptindex].replace(/ /g, '').replace(/\//g, ' ');
                    }
                    result.append(
                        $('<h4/>').text(
                            'Now that we have mapped all the ciphertext characters, the decoded morse code is the answer:'
                        )
                    );
                    result.append(
                        $('<div/>', {
                            class: 'TOANSWER',
                        }).text(answer)
                    );
                    limit = 0;
                }
            }
        }
        this.setErrorMsg(msg, 'polgs');
        return result;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
    }
}
