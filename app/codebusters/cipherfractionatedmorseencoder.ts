import { cloneObject, StringMap, BoolMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { IEncoderState } from './cipherencoder';
import { tomorse, frommorse, ConvertToMorse } from '../common/morse';
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
    keywordMap: string[] = [];
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
    public defaultstate: IFractionatedMorseState = {
        cipherString: '',
        cipherType: ICipherType.FractionatedMorse,
        replacement: {},
        operation: 'crypt',
        encoded: '',
        keyword: '',
    };
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

        replacementsRow.add({ celltype: 'th', content: 'Replacement' });
        fractionsRow.add({ celltype: 'th', content: 'Morse fraction' });

        let count = 0;
        for (const c of charset) {
            if (showanswers && (knownMap[c] !== 'XXX')) {
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
                    .append($('<br/><br/>'))
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
            console.log('String: ' + str);

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
                    if (t !== ' ') {
                        extraFraction = 'X';
                    } else {
                        extraFraction = spaceextra;
                        lastsplit = encodeline.length;
                    }
                } else if (typeof tomorse[t] !== 'undefined') {

                    if (makeupMorse > 0) {
                        console.log('removing encoded string');
                        encodeline = encodeline.substring(0, (encodeline.length - 3));
                        morseline = morseline.substring(0, (morseline.length - makeupMorse));
                    }
                    console.log('   stashed is >' + stashedMorse);
                    partialMorse += (stashedMorse + extraFraction + tomorse[t]);
                    // Spaces between letters use one separator character
                    extraFraction = 'X';

                    console.log('Processing letter: ' + t + ' of: ' + str.toUpperCase());
                    console.log('Partial morse: ' + partialMorse);

                    const morselet = tomorse[t];
                    // Spaces between letters use one separator character
                    decodeline +=
                        this.repeatStr(' ', extra.length) +
                        t +
                        this.repeatStr(' ', morselet.length - 1);
                    morseline += extra + morselet;

                    console.log('Going to stash:' + partialMorse + ' with substring of: ' + 3 * Math.floor((partialMorse.length / 3)));
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
                        console.log('Morse fraction: ' + morseFraction);
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
                    console.log('>Last split = ' + lastsplit);
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
                console.log('<Last split = ' + lastsplit);
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

                    let endLetterIndex = morse.indexOf('X', startIndex);
                    let endWordIndex = morse.indexOf('XX', startIndex)
                    if (endLetterIndex > -1) {
                        let chuckit = morse.substr(startIndex, endLetterIndex - startIndex);
                        if (chuckit.indexOf(' ') > -1) {
                            let skipX = 1;
                            if (endWordIndex > -1) {
                                skipX += 1;
                            }
                            plaintext += this.repeatStr(' ', chuckit.length + (skipX));
                            startIndex = endLetterIndex + skipX;

                        } else {
                            let skipX = 1;
                            if (endWordIndex > -1) {
                                skipX += 1;
                            }
                            plaintext += frommorse[chuckit] + this.repeatStr(' ', chuckit.length + (skipX - 1));
                            startIndex = endLetterIndex + skipX;
                        }

                    }

                    // Is it a separator?
                    if (possibilities === 'X') {
                        // Did we just follow a separator
                        if (current === 'X') {
                            // Yes, so give them a word separator marker
                            plaintext += '/ ';
                            current = '';
                            // Is what we gathered a valid morse code sequence?
                        } else if (frommorse[current] !== undefined) {
                            plaintext +=
                                frommorse[current] + this.repeatStr(' ', current.length - 1);
                            current = 'X';
                        } else {
                            // Not a valid morse code character so just give
                            // blank space
                            plaintext += this.repeatStr(' ', current.length);
                            current = 'X';
                        }
                    } else {
                        // We know it is a dot or dash.
                        // if we previously had a separator, throw it away so
                        // that we don't gather it as part of a morse code
                        if (current === 'X') {
                            current = '';
                            plaintext += ' ';
                        }
                        current += possibilities;
                    }
                } else if (possibilities.indexOf('X') < 0) {
                    // Can't be a separator (X)
                    morse += '?';
                    current += '?';
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
            working.push([ctset[ctindex], morse, plaintext]);
        }
        return working;
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
                ' ciphertext characters still need to be mapped. '
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
        super.loadRawLanguage('en');

        //this.findCloseWords('sol')

        if ((this.state.keyword.indexOf('Z') > -1) || (knownmap['Z'] !== 'XXX')) {
            didFindZ = false;
        } else {
            knownmap[this.keywordMap[25]] = this.morseReplaces[25];
        }

        return didFindZ;
    }

    /**
     * Display how to solve the cipher.
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        let msg = '';
        if (this.state.cipherString === '') {
            this.setErrorMsg(msg, 'polgs');
            return result;
        }
        // TODO        const morseletmap = this.buildMorseletMap();
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);
        const knownmap: StringMap = {};

        const hint = this.checkHintCrib(result, strings);
        if (hint === undefined) {
            return result;
        }
        // TEMPORARY HACK - Disable the automated solution since this appears to be
        // the version for the Morbit/Pollux and not the Fractionated Morse one
        //
        // For now we don't know how to solve it, so just put a message up
        result.append('No automated solution available at this point in time.');

        //return result;
        // END TEMPORARY HACK

        // Assume we don't know what anything is
        for (const c of this.encodecharset) {
            knownmap[c] = 'XXX';
        }
        // And then fill it in with what we do know.
        // TODO
        let morseFractionMap = []
        let morseletmap = []
        for (const c of hint) {
            let i = this.keywordMap.indexOf(c);
            if (i > -1) {
                knownmap[c] = this.morseReplaces[i];
            }
            // if (morseletmap[c] !== undefined) {
            //     knownmap[c] = morseletmap[c];
            // }
        }
        // And then fill it in with what we do know.
        // TODO
        // for (const c of hint) {
        //     if (morseletmap[c] !== undefined) {
        //         knownmap[c] = morseletmap[c];
        //     }
        // }

        // This is just for displaying what we know...
        // this.genKnownTable(result, knownmap); --> generateFractionatedTable() is superior to genKnownTable()
        let workingTable = this.generateFractionatedTable(true, knownmap, '');
        result.append(workingTable);
        result.append('Based on that information we can map the cipher text to:');
        // recalculates based on what is 'known' (in the knownmap).
        let working = this.genKnownMapping(strings, knownmap);
        // displays the (partial) solution we know so far.
        this.genMapping(result, working);
        //return result;
        if (!this.hasUnknowns(result, knownmap, working)) {
            result.append(
                'Which means that the hint has provide all of the' +
                ' cipher digit mapping and there is no work to solve it'
            );
        } else {
            let limit = 20;
            while (limit > 0) {

                // Look for 'no gaps in the alphabet after the keyword and fill this in...
                if (this.noGapFill(result, knownmap, working)) {
                    // Filled in a gap of at least 1
                } else if (this.findZ(result, knownmap, working)) {
                    // Found 'Z' at the end...
                } else if (this.guessWord(result, knownmap, working)) {




                    // The first character is never an X
                    // else if (this.checkFirstCT(result, knownmap, working)) {
                    //     // We eliminated at least one letter from being an X
                    // } else if (this.findTriples(result, knownmap, working)) {
                    //     // We eliminated at least one letter from being an X
                    // } else if (this.findSpacers(result, knownmap, working)) {
                    //     // We found at least one new letter that must be an X
                    // } else if (this.findInvalidMorse(result, knownmap, working)) {
                    //     // We found at least one morse code that invalidated a choice
                    // } else if (this.findSingleMorse(result, knownmap, working)) {
                    //     // We found at least one morse code that invalidated a choice
                    // } else if (this.testSingleMorse(result, knownmap, working)) {
                    //     // We found at least one morse code that invalidated a choice
                } else {
                    // Nothing more that we can do..
                    result.append(
                        $('<h4.>').text(
                            'There are no more automated solving techniques, ' +
                            'so you need to do some trial and error with the remaining unknowns. ' +
                            'Please feel free to submit an issue with the example so we can improve this.'
                        )
                    );
                    msg = 'Automated solver is unable to find an automatic solution.';
                    break;
                }
                result.append('Based on that information we can map the cipher text as:');
                working = this.genKnownMapping(strings, knownmap);
                workingTable = this.generateFractionatedTable(true, knownmap, '');
                result.append(workingTable)
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
                    break;
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
