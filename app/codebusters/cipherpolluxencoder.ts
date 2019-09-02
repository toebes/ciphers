import { cloneObject, StringMap, BoolMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { CipherEncoder, IEncoderState } from './cipherencoder';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { tomorse, frommorse } from '../common/morse';
import { JTTable } from '../common/jttable';

interface IPolluxState extends IEncoderState {
    dotchars: string;
    dashchars: string;
    xchars: string;
    encoded: string;
}
const morseindex = 1;
const ctindex = 0;
const ptindex = 2;

/**
 * CipherPolluxEncoder - This class handles all of the actions associated with encoding
 * a Pollux cipher.
 */
export class CipherPolluxEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#Pollux';
    public usesMorseTable: boolean = true;
    public validTests: ITestType[] = [ITestType.None,
    ITestType.cregional, ITestType.cstate,
    ITestType.bregional, ITestType.bstate];
    public defaultstate: IPolluxState = {
        cipherString: '',
        cipherType: ICipherType.Pollux,
        replacement: {},
        operation: 'decode',
        dotchars: "123",
        dashchars: "456",
        xchars: "7890",
        encoded: "",
    };
    public state: IPolluxState = cloneObject(
        this.defaultstate
    ) as IPolluxState;
    public encodecharset = "0123456789";
    public cmdButtons: JTButtonItem[] = [
        { title: 'Save', color: 'primary', id: 'save' },
        { title: 'Randomize', color: 'primary', id: 'randomize' },
        this.undocmdButton,
        this.redocmdButton,
        this.guidanceButton,
    ];
    /** Save and Restore are done on the CipherEncoder Class */

    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        $('#answer')
            .empty()
            .append(this.genAnswer())
            .append(this.genSolution());

        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
        this.setOperation(this.state.operation);
    }

    public setDotChars(dotchars: string): boolean {
        let result = false;
        if (dotchars !== this.state.dotchars) {
            result = true;
            this.state.dotchars = dotchars;
        }
        return result;
    }
    public setDashChars(dashchars: string): boolean {
        let result = false;
        if (dashchars !== this.state.dashchars) {
            result = true;
            this.state.dashchars = dashchars;
        }
        return result;
    }
    public setXChars(xchars: string): boolean {
        let result = false;
        if (xchars !== this.state.xchars) {
            result = true;
            this.state.xchars = xchars;
        }
        return result;
    }
    public randomize(): void {
        this.state.encoded = "";
    }
    public updateOutput(): void {
        this.guidanceURL = 'TestGuidance.html#pollux' + this.state.operation;
        if (this.state.operation === 'decode') {
            $('.hint').show();
            $('.crib').hide();
        } else {
            $('.hint').hide();
            $('.crib').show();
        }
        $("#hint").val(this.state.hint);
        $("#crib").val(this.state.crib);
        $("#dotchar").val(this.state.dotchars);
        $("#dashchar").val(this.state.dashchars);
        $("#xchar").val(this.state.xchars);
        JTRadioButtonSet('operation', this.state.operation);
        super.updateOutput();
    }
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        this.genTestUsage(result);
        let radiobuttons = [
            { id: 'mrow', value: 'decode', title: 'Decode' },
            { id: 'crow', value: 'crypt', title: 'Cryptanalysis' },
        ];
        result.append(
            JTRadioButton(6, 'operation', radiobuttons, this.state.operation)
        );

        this.genQuestionFields(result);
        this.genEncodeField(result);
        let inputbox = $("<div/>", {
            class: "grid-x grid-margin-x",
        });
        inputbox.append(
            JTFLabeledInput(
                'O',
                'number',
                'dotchar',
                this.state.dotchars,
                'small-12 medium-4 large-4'
            )
        );
        inputbox.append(
            JTFLabeledInput(
                '-',
                'number',
                'dashchar',
                this.state.dashchars,
                'small-12 medium-4 large-4'
            )
        );
        inputbox.append(
            JTFLabeledInput(
                'X',
                'number',
                'xchar',
                this.state.xchars,
                'small-12 medium-4 large-4'
            )
        );
        result.append(inputbox);

        result.append(
            JTFLabeledInput(
                'Hint Digits',
                'number',
                'hint',
                this.state.hint,
                'hint small-12 medium-12 large-12'
            )
        );
        result.append(
            JTFLabeledInput(
                'Crib Text',
                'text',
                'crib',
                this.state.crib,
                'crib small-12 medium-12 large-12'
            )
        );

        return result;
    }
    /**
     * Fills in the frequency portion of the frequency table.  For the Ragbaby
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void { }
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
        let sourcecharset = this.getSourceCharset();
        let langreplace = this.langreplace[this.state.curlang];
        let encodeline = '';
        let decodeline = '';
        let morseline = '';
        let lastsplit = -1;
        let result: string[][] = [];
        let opos = 0;
        let extra = "";
        let encoded = '';
        let failed = false;
        // Build out a mapping of the replacement characters to their morselet
        // value so we can figure out if we can reuse it.
        let morseletmap: StringMap = this.buildMorseletMap();

        if (this.state.dotchars.length === 0) {
            this.addErrorMsg('No characters specified for O');
            failed = true;
        }
        if (this.state.dashchars.length === 0) {
            this.addErrorMsg('No characters specified for -');
            failed = true;
        }
        if (this.state.xchars.length === 0) {
            this.addErrorMsg('No characters specified for X');
            failed = true;
        }
        // Check to see if we have any duplicated characters
        for (let c in morseletmap) {
            if (c < '0' || c > '9') {
                this.addErrorMsg(c + ' is not a valid digit');
                failed = true;
            }
            if (morseletmap[c].length > 1) {
                this.addErrorMsg(c + " used for more than one letter: " + morseletmap[c]);
                failed = true;
            }
        }
        if (failed) {
            return result;
        }

        let mapstr: StringMap = {
            'O': this.state.dotchars,
            '-': this.state.dashchars,
            'X': this.state.xchars
        }

        // Zero out the frequency table
        this.freq = {};
        for (let i = 0, len = sourcecharset.length; i < len; i++) {
            this.freq[sourcecharset.substr(i, 1).toUpperCase()] = 0;
        }

        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (let t of str.toUpperCase()) {
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== 'undefined') {
                t = langreplace[t];
            }
            // Spaces between words use two separator characters
            if (!this.isValidChar(t)) {
                extra = "XX";
            } else if (typeof tomorse[t] !== 'undefined') {
                let morselet = tomorse[t];
                // Spaces between letters use one separator character
                decodeline += this.repeatStr(" ", extra.length) + t
                    + this.repeatStr(" ", morselet.length - 1);
                morseline += extra + morselet;
                for (let m of extra + morselet) {
                    let c = this.state.encoded[opos++];
                    // Figure out what letter we want to map it to.
                    // If it already was mapped to a valid letter, we keep it.
                    /// Otherwise we have to pick one of the letters randomly.
                    if (morseletmap[c] !== m) {
                        let mapset = mapstr[m];
                        if (mapset.length < 1) {
                            mapset = '?';
                        }
                        let index = Math.floor(Math.random() * mapset.length);
                        c = mapset[index];
                    }
                    encodeline += c;
                    encoded += c;
                }
                // We have finished the letter, so next we will continue with
                // an X
                extra = "X";
            }
            // See if we have to split the line now
            if (encodeline.length >= maxEncodeWidth) {
                if (lastsplit === -1) {
                    result.push([encodeline, decodeline, morseline]);
                    encodeline = '';
                    decodeline = '';
                    morseline = '';
                    lastsplit = -1;
                } else {
                    let encodepart = encodeline.substr(0, lastsplit);
                    let decodepart = decodeline.substr(0, lastsplit);
                    let morsepart = morseline.substr(0, lastsplit);
                    encodeline = encodeline.substr(lastsplit);
                    decodeline = decodeline.substr(lastsplit);
                    morseline = morseline.substr(lastsplit);
                    result.push([encodepart, decodepart, morsepart]);
                }
            }
        }

        // And put together any residual parts
        if (encodeline.length > 0) {
            result.push([encodeline, decodeline, morseline]);
        }
        this.state.encoded = encoded;
        return result;
    }
    /**
     * Builds up a string map which maps all of the digits to the possible
     * morse mapping characters.
     */
    private buildMorseletMap(): StringMap {
        let morseletmap: StringMap = {};
        for (let i of this.state.xchars) {
            if (morseletmap[i] === undefined) {
                morseletmap[i] = '';
            }
            morseletmap[i] += 'X';
        }
        for (let i of this.state.dotchars) {
            if (morseletmap[i] === undefined) {
                morseletmap[i] = '';
            }
            morseletmap[i] += 'O';
        }
        for (let i of this.state.dashchars) {
            if (morseletmap[i] === undefined) {
                morseletmap[i] = '';
            }
            morseletmap[i] += '-';
        }
        return morseletmap;
    }

    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $('<div/>');
        this.genAlphabet();
        let strings = this.makeReplacement(this.state.cipherString, 60);

        for (let strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVEQ',
                }).text(strset[ctindex])
                    .append($("<br/><br/>"))
            );
        }
        return result;
    }
    /**
     * Generates an HTML representation of a string for display.  Replaces the X, O and -
     * with more visible HTML equivalents
     * str String to normalize (with - X and O representing morese characters)
     */
    public normalizeHTML(str: string): string {
        return str
            .replace(/O/g, "&#9679;")
            .replace(/-/g, "&ndash;")
            .replace(/X/g, "&times;");
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $('<div/>');
        this.genAlphabet();
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);
        let tosolve = 0;
        let toanswer = 1;
        let morseline = 2;
        for (let strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).text(strset[tosolve])
            );
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).text(strset[morseline])
            );
            result.append(
                $('<div/>', {
                    class: 'TOANSWER',
                }).text(strset[toanswer])
            );
        }
        return result;
    }
    /**
     * Generates displayable table of mappings of cipher characters
     * @param knownmap Current mapping of cipher characters to morse
     */
    public genKnownTable(result: JQuery<HTMLElement>, knownmap: StringMap): void {
        let table = new JTTable({ class: "known" });
        let headrow = table.addHeaderRow();
        let bodyrow = table.addBodyRow();
        for (let c of this.encodecharset) {
            headrow.add(c);
            bodyrow.add({ content: this.normalizeHTML(knownmap[c]) });
        }
        result.append(table.generate());
    }
    /**
     * Generates a displayable state of the currently decoded morse string.
     * There are three rows:
     *   [ctindex=0] The cipher text
     *   [morseindex=1] The known morse mapping characters (? means it could be - or O)
     *   [ptindex=2] The decoded plain text characters
     * 
     * Those characters that are known are shown
     * @param strings Current mapping strings
     * @param knownmap Known mapping of cipher text characters
     * @returns string[][] where each string set consists of 3 strings
     */
    public genKnownMapping(strings: string[][], knownmap: StringMap): string[][] {
        let working: string[][] = [];
        let current = "";
        for (let ctset of strings) {
            let morse = "";
            let plaintext = "";
            for (let c of ctset[ctindex]) {
                // See if we know what this character maps to exactly
                let possibilities = knownmap[c];
                if (possibilities.length === 1) {
                    // Yes, we know that it defined so remember the morselet
                    morse += possibilities;
                    // Is it a separator? 
                    if (possibilities === "X") {
                        // Did we just follow a separator
                        if (current === "X") {
                            // Yes, so give them a word separator marker
                            plaintext += "/ ";
                            current = "";
                            // Is what we gathered a valid morse code sequence?
                        } else if (frommorse[current] !== undefined) {
                            plaintext += frommorse[current] +
                                this.repeatStr(" ", current.length - 1);
                            current = "X";
                        } else {
                            // Not a valid morse code character so just give
                            // blank space
                            plaintext += this.repeatStr(" ", current.length);
                            current = "X";
                        }
                    } else {
                        // We know it is a dot or dash.
                        // if we previously had a separator, throw it away so
                        // that we don't gather it as part of a morse code    
                        if (current === "X") {
                            current = "";
                            plaintext += " "
                        }
                        current += possibilities;
                    }
                } else if (possibilities.indexOf("X") < 0) {
                    // Can't be a separator (X)
                    morse += "?";
                    current += "?";
                } else {
                    morse += " ";
                    current += " ";
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
                current = "";
            }
            working.push([ctset[ctindex], morse, plaintext]);
        }
        return working;
    }
    /**
     * Generates a displayable state of the current known decoding
     * @param working Current mapping strings
     * @returns HTML of output text
     */
    public genMapping(result: JQuery<HTMLElement>, working: string[][]): void {
        let ansdiv = $('<div/>');

        for (let strset of working) {
            ansdiv.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).text(strset[ctindex])
            );
            ansdiv.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).text(strset[morseindex])
            );
            ansdiv.append(
                $('<div/>', {
                    class: 'TOANSWER',
                }).text(strset[ptindex])
            );
        }
        result.append(ansdiv);
    }
    /**
     * Determines if the entire cipher mapping is known
     * @param knownmap Map of current cipher strings
     * @returns Boolean indicating that there are unknowns
     */
    public hasUnknowns(result: JQuery<HTMLElement>, knownmap: StringMap, working: string[][]): boolean {
        // Figure out what letters were actually used
        let used: BoolMap = {};
        let unknowns = 0;
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                used[c] = true;
            }
        }
        // If one of the used letters doesn't have a mapping then we aren't done
        for (let e in knownmap) {
            if (knownmap[e].length > 1 && used[e] === true) {
                unknowns++;
            }
        }
        if (unknowns > 0) {
            result.append("At this point in time, " + String(unknowns) +
                " ciphertext characters still need to be mapped. ");
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
    public checkFirstCT(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        if (working.length > 0) {
            let strset = working[0];
            if (strset[morseindex].length > 0 &&
                strset[morseindex][0] === ' ') {
                let c = strset[ctindex][0];
                // The first character is definitely unknown, so mark it
                knownmap[c] = knownmap[c].replace("X", "");
                let msg = "The first morse code character can never be an X,"
                " so we eliminate that possibility for " + c + ".";
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
    public findTriples(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        let found = false;
        let lastc = '';
        let xcount = 0;
        let count = 0;
        let sequence = "";
        let prefix = "Looking at the ciphertext, ";
        for (let strset of working) {
            for (let c of strset[ctindex]) {
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
                } else if (knownmap[c] === "X") {
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
                    if (knownmap[lastc].length > 1 &&
                        knownmap[lastc].indexOf("X") >= 0) {
                        // We had three of this in a row which means we know
                        // that this character can't be an X
                        found = true;
                        let msg = "";
                        let tseq = sequence.substr(sequence.length - 3, 3);
                        if (count === 3) {
                            msg = "we find three " + lastc + "s in a row.";
                        } else {
                            msg = "we see the sequence " + tseq +
                                " which would result in three Xs in a row if " + lastc +
                                " were an X."
                        }
                        result.append(prefix + this.normalizeHTML(msg));
                        prefix = " Also, ";
                        knownmap[lastc] = knownmap[lastc].replace("X", "");
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
    public findSpacers(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        let found = false;
        let lastc = '';
        let gathered = '';
        let prefix = "Looking at the ciphertext, ";
        for (let strset of working) {
            for (let i = 0, len = strset[morseindex].length; i < len; i++) {
                let m = strset[morseindex][i];
                let c = strset[ctindex][i];
                // Check to see if this is one that we had to replace because
                // we figured it out in an earlier pass
                if (m === ' ' && knownmap[c] === 'X') {
                    m = 'X';
                }
                if (m === 'X') {
                    // We hit a hard break so we can start again
                    gathered = '';
                    lastc = '';
                }
                else {
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
                    let msg = "we see the sequence " + gathered +
                        " which would result in six or more - and Os a row if " + lastc +
                        " were not an X."
                    result.append(prefix + this.normalizeHTML(msg));
                    prefix = " Also, ";
                    knownmap[lastc] = "X";
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
    public findInvalidMorse(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        let found = false;
        let gathered = '';
        let sequence = '';
        let unknownc = '';
        let tryit = false;
        for (let strset of working) {
            for (let i = 0, len = strset[morseindex].length; i < len; i++) {
                let m = strset[morseindex][i];
                let c = strset[ctindex][i];
                if (m === 'X') {
                    // Try what we have gathered
                    if (tryit) {
                        let legal = 0;
                        let replacem = '';
                        for (let tc of knownmap[unknownc]) {
                            if (tc === 'X') {
                                let morseset = gathered.split('#');
                                let allok = true;
                                for (let morseitem of morseset) {
                                    if (morseitem !== '' &&
                                        frommorse[morseitem] === undefined) {
                                        allok = false;
                                    }
                                }
                                if (allok) {
                                    legal++;
                                    replacem = tc;
                                }
                            } else {
                                let trymorse = gathered.replace('#', tc);
                                if (frommorse[trymorse] !== undefined) {
                                    legal++;
                                    replacem = tc;
                                }
                            }
                        }
                        if (legal === 1) {
                            // We found exactly one legal morse code sequence
                            let msg = "Based on the sequence " + sequence +
                                " with " + unknownc +
                                " possibly being one of '" + knownmap[unknownc] +
                                ", only " + replacem +
                                " results in a legal morse code character, " +
                                "so we can mark " + unknownc +
                                " as being " + replacem + ".";
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
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                let morsec = knownmap[c];
                if (morsec.length != 1) {
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
        return "";
    }
    /**
     * Look through all the unknowns to see if they would generate illegal
     * Morse code based on being a dot or dash for tne entire string.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public findSingleMorse(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        let prefix = "Trying our remaining candidates on the ciphertext, ";
        for (let c in knownmap) {
            // Is this a candiate to try replacement for?
            if (knownmap[c].length > 1) {
                let savemap = knownmap[c];
                let legal = '';
                for (let mc of savemap) {
                    knownmap[c] = mc;
                    let invalid = this.findInvalidMorseChar(knownmap, working);
                    if (invalid !== '') {
                        let msg = "Attempting to substutite " + mc + " for " + c +
                            " doesn't work because we end up with the sequence " +
                            invalid + " which is not a legal morse code character, " +
                            "so we can eliminate it as a possibility.";
                        result.append(prefix + this.normalizeHTML(msg));
                        prefix = " Also, ";
                    } else {
                        legal += mc;
                    }
                }
                knownmap[c] = legal;
                if (legal.length === 1) {
                    let msg = " Which means we know that " + c + " must map to " + legal;
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
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                let morsec = knownmap[c];
                if (morsec.length != 1) {
                    tryit = false;
                    xcount = 0;
                } else if (morsec === 'X') {
                    let p = frommorse[morsestr];
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
    public testSingleMorse(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        let mincipher = this.minimizeString(this.state.cipherString);
        for (let c in knownmap) {
            // Is this a candiate to try replacement for?
            if (knownmap[c].length > 1) {
                let savemap = knownmap[c];
                let legal = '';
                let msg = "Since " + c + " can still map to " + savemap +
                    " we simply try them and look at the first word or two" +
                    " to see if it makes sense."
                for (let mc of savemap) {
                    knownmap[c] = mc;
                    let plaintext = this.applyKnownmap(knownmap, working);
                    // Now split it on all the unknowns to find the longest 
                    // contiguous string
                    let chunks = plaintext.split('?');
                    let longest = chunks[0];
                    for (let chunk of chunks) {
                        if (chunk.length > longest.length) {
                            longest = chunk;
                        }
                    }
                    msg += "Trying " + mc + " for " + c +
                        " gives us a chunk: " + longest + ". ";
                    longest = this.minimizeString(longest);
                    if (mincipher.indexOf(this.minimizeString(longest)) >= 0) {
                        legal += mc;
                    }
                }
                if (legal.length === 1) {
                    knownmap[c] = legal;
                    msg += "Which means we know that " + c + " must map to " + legal;
                    result.append(this.normalizeHTML(msg));
                    return true;
                }
                knownmap[c] = savemap;
            }
        }
        return false;
    }
    /**
     * Display how to solve the cipher.
     */
    public genSolution(): JQuery<HTMLElement> {
        let result = $("<div/>");
        if (this.state.cipherString === '') {
            return result;
        }
        let hint = this.state.hint;
        let morseletmap = this.buildMorseletMap();
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);
        let knownmap: StringMap = {};
        result.append($("<h3/>").text("How to solve"));
        if (this.state.operation === 'crypt') {
            // We are told the mapping of at least 6 letters
            // this.state.crib
        }
        result.append("Since we are told the mapping of " + hint +
            " ciphertext, we can build the following table:");

        // Assume we don't know what anything is
        for (let c of this.encodecharset) {
            knownmap[c] = "O-X";
        }
        if (hint === undefined || hint.length < 3) {
            result.append($("<h4/>")
                .text("At least 3 hint characters are needed to generate a solution"));
            return result;
        }
        // And then fill it in with what we do know.
        for (let c of hint) {
            knownmap[c] = morseletmap[c];
        }
        this.genKnownTable(result, knownmap);
        result.append("Based on that information we can map the cipher text as:");
        let working = this.genKnownMapping(strings, knownmap);
        this.genMapping(result, working);
        let limit = 20;
        while (limit > 0) {
            // The first character is never an X
            if (this.checkFirstCT(result, knownmap, working)) {
                // We eliminated at least one letter from being an X
            } else if (this.findTriples(result, knownmap, working)) {
                // We eliminated at least one letter from being an X
            } else if (this.findSpacers(result, knownmap, working)) {
                // We found at least one new letter that must be an X
            } else if (this.findInvalidMorse(result, knownmap, working)) {
                // We found at least one morse code that invalidated a choice
            } else if (this.findSingleMorse(result, knownmap, working)) {
                // We found at least one morse code that invalidated a choice
            } else if (this.testSingleMorse(result, knownmap, working)) {
                // We found at least one morse code that invalidated a choice
            } else {
                // Nothing more that we can do..
                result.append($("<h4.>").
                    text("There are no more automated solving techniques, " +
                        "so you need to do some trial and error with the remaining unknowns. " +
                        "Please feel free to submit an issue with the example so we can improve this."));
                limit = 0;
            }
            working = this.genKnownMapping(strings, knownmap);
            this.genKnownTable(result, knownmap);
            result.append("Based on that information we can map the cipher text as:");
            this.genMapping(result, working);
            if (this.hasUnknowns(result, knownmap, working)) {
                limit--;
            } else {
                let answer = '';
                for (let strset of working) {
                    answer += strset[ptindex].replace(/ /g, '').replace(/\//g, ' ');
                }
                result.append($("<h4/>")
                    .text("Now that we have mapped all the ciphertext characters, the decoded morse code is the answer:"));
                result.append(
                    $('<div/>', {
                        class: 'TOANSWER',
                    }).text(answer)
                );
                limit = 0;
            }
        }
        return result;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('#dotchar')
            .off('input')
            .on('input', e => {
                let chars = $(e.target).val() as string;
                this.markUndo('dotchar');
                if (this.setDotChars(chars)) {
                    this.updateOutput();
                }
            });
        $('#dashchar')
            .off('input')
            .on('input', e => {
                let chars = $(e.target).val() as string;
                this.markUndo('dashchar');
                if (this.setDashChars(chars)) {
                    this.updateOutput();
                }
            });
        $('#xchar')
            .off('input')
            .on('input', e => {
                let chars = $(e.target).val() as string;
                this.markUndo('xchar');
                if (this.setXChars(chars)) {
                    this.updateOutput();
                }
            });
        $('#hint')
            .off('input')
            .on('input', e => {
                let chars = $(e.target).val() as string;
                this.markUndo('hint');
                if (this.setHint(chars)) {
                    this.updateOutput();
                }
            });
        $('#crib')
            .off('input')
            .on('input', e => {
                let chars = $(e.target).val() as string;
                this.markUndo('crib');
                if (this.setCrib(chars)) {
                    this.updateOutput();
                }
            });
        $('#randomize')
            .off('click')
            .on('click', () => {
                this.markUndo(null);
                this.randomize();
                this.updateOutput();
            });
    }
}
