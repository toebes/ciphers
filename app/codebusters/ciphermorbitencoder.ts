import { cloneObject, StringMap, BoolMap, NumberMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { IEncoderState } from './cipherencoder';
import { tomorse, frommorse } from '../common/morse';
import { JTTable } from '../common/jttable';
import { CipherMorseEncoder, ctindex, ptindex, morseindex } from './ciphermorseencoder';

const morbitmap: string[] = [
    'OO',
    'O-',
    'OX',
    '-O',
    '--',
    '-X',
    'XO',
    'X-',
    'XX',
];
interface MorbitKnownMap {
    [index: string]: string[];
}

/**
 * CipherMorbitEncoder - This class handles all of the actions associated with encoding
 * a Morbit cipher.
 */
export class CipherMorbitEncoder extends CipherMorseEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public cipherName = 'Morbit';
    public guidanceURL: string = 'TestGuidance.html#Morbit';
    public validTests: ITestType[] = [ITestType.None,
    ITestType.cregional, ITestType.cstate,
    ITestType.bregional, ITestType.bstate];
    public defaultstate: IEncoderState = {
        cipherString: '',
        cipherType: ICipherType.Morbit,
        replacement: {},
        operation: 'decode',
    };
    public state: IEncoderState = cloneObject(
        this.defaultstate
    ) as IEncoderState;
    public encodecharset = "123456789";

    public setUIDefaults(): void {
        super.setUIDefaults();
        this.fixReplacement();
        this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
        this.setOperation(this.state.operation);
    }

    public fixReplacement(): void {
        let replacement = this.encodecharset;
        for (let m of morbitmap) {
            if (this.state.replacement[m] !== undefined &&
                this.state.replacement[m] !== '') {
                replacement.replace(this.state.replacement[m], '');
            }
        }
        for (let m of morbitmap) {
            if (this.state.replacement[m] === undefined ||
                this.state.replacement[m] === '') {
                this.state.replacement[m] = replacement[0];
                replacement = replacement.substr(1);
            }
        }
    }
    public randomize(): void {
        let replacement = this.encodecharset;
        for (let m of morbitmap) {
            let index = Math.floor(Math.random() * replacement.length);
            this.state.replacement[m] = replacement[index];
            replacement = replacement.slice(0, index)
                + replacement.slice(index + 1, replacement.length);
        }
    }

    public updateOutput(): void {
        this.guidanceURL = 'TestGuidance.html#' +
            this.cipherName + this.state.operation;
        for (let i in morbitmap) {
            $("input[data-char='" + i + "']")
                .val(this.state.replacement[morbitmap[i]]);
        }
        super.updateOutput();
    }
    public genSampleHint(): string {
        let hint = '';
        if (this.state.operation === 'crypt') {
            let crib = this.minimizeString(this.state.crib);
            let plaintext = this.minimizeString(this.state.cipherString);
            if (crib !== '') {
                let cribtext = this.genMonoText(this.state.crib.toUpperCase());

                if (plaintext.substr(0, crib.length) === crib) {
                    hint = "the quote starts with " + cribtext + ".";
                } else if (plaintext.substr(plaintext.length - crib.length) === crib) {
                    hint = "the quote ends with " + cribtext + ".";
                } else {
                    let strings = this.makeReplacement(
                        this.state.cipherString,
                        this.maxEncodeWidth);
                    let ciphercrib = this.findCrib(strings, crib);
                    if (ciphercrib !== '') {
                        hint = "the quote has " + cribtext +
                            " in it corresponding to the encoded text " +
                            this.genMonoText(ciphercrib) + ".";
                    } else {
                        hint = "the quote has " + cribtext +
                            " somewhere in it.";
                    }
                }
            }
        } else {
            let hintchars = this.state.hint;
            if (hintchars === undefined || hintchars === '') {
                hint = "hint characters need to be defined";
            } else {
                let morseletmap = this.buildMorseletMap();
                let extra = "";
                for (let e of hintchars) {
                    hint += extra + this.genMonoText(e) + "=" +
                        this.genMonoText(this.normalizeHTML(morseletmap[e]));
                    extra = ", ";
                }
            }
        }
        if (hint === '') {
            hint = 'the hint needs to be defined';
        }
        return hint;
    }

    public genPreCommands(): JQuery<HTMLElement> {
        let result = super.genPreCommands();

        let table = new JTTable({ class: 'tfreq rtab shrink cell' });
        let headrow = table.addHeaderRow();
        let bodyrow = table.addBodyRow();
        headrow.add('');
        bodyrow.add('Replacement');
        for (let i in morbitmap) {
            let einput = $("<input/>", {
                type: "text",
                class: "sli",
                "data-char": i,
                id: "m" + i,
                value: this.state.replacement[morbitmap[i]],
            });

            headrow.add({ content: this.normalizeHTML(morbitmap[i]) });
            bodyrow.add(einput);
        }
        result.append(table.generate());
        this.addHintCrib(result);
        return result;
    }
    /**
     * Change the encrypted character.  Note that when we change one, we have
     * to swap it with the one which we are replacing
     * @param repchar Character that is being replaced
     * @param newchar Character to replace it with
     * @param elem Optional HTML Element triggering the request
     */
    public setChar(
        repchar: string,
        newchar: string,
        elem?: JQuery<HTMLElement>
    ): void {
        // console.log("handler setChar data-char=" + repchar + " newchar=" + newchar)
        // See if any other slots have this character and reset it
        // Note that repchar is the index into the morbitmap array
        if (newchar === '' || this.encodecharset.indexOf(newchar) < 0) {
            return;
        }

        let repmorselet = morbitmap[repchar];
        let oldchar = this.state.replacement[repmorselet];

        if (newchar !== '' && newchar !== oldchar) {
            for (let i in this.state.replacement) {
                if (this.state.replacement[i] === newchar && i !== repchar) {
                    this.state.replacement[repmorselet] = '';
                    if (newchar !== oldchar) {
                        this.setChar(String(morbitmap.indexOf(i)), oldchar);
                    }
                }
            }
        }
        this.state.replacement[repmorselet] = newchar;
        this.updateOutput();
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
        let sourcecharset = this.getSourceCharset();
        let langreplace = this.langreplace[this.state.curlang];
        let encodeline = '';
        let decodeline = '';
        let morseline = '';
        let lastsplit = -1;
        let result: string[][] = [];
        let extra = "";
        let spaceextra = "XX";
        let decodeextra = "";
        let msg = '';

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
                extra = spaceextra;
                decodeextra = "/ ".substr(0, extra.length);
            } else if (typeof tomorse[t] !== 'undefined') {
                let morselet = tomorse[t];
                // Spaces between letters use one separator character
                decodeline += decodeextra + t
                    + this.repeatStr(" ", morselet.length - 1);
                let morsework = extra + morselet;
                // We have finished the letter, so next we will continue with
                // an X.  Note that we may have to consume it if we don't have
                // an even number of digits
                extra = "X";
                decodeextra = " ";
                spaceextra = "XX";
                if (morsework.length % 2 === 1) {
                    morsework += extra;
                    extra = '';
                    decodeextra = '';
                    spaceextra = "X";
                    decodeline += ' ';
                }
                morseline += morsework;

                for (let i = 0, len = morsework.length; i < len; i += 2) {
                    let m = morsework.substr(i, 2);
                    // Figure out what letter we want to map it to.
                    // If it already was mapped to a valid letter, we keep it.
                    /// Otherwise we have to pick one of the letters randomly.
                    let c = this.state.replacement[m];
                    if (c.length != 1) {
                        msg += 'Invalid Morse piece:' + m + ". ";
                        c = '?';
                    }
                    encodeline += c + " ";
                }
            }
            // See if we have to split the line now
            if (encodeline.length >= maxEncodeWidth) {
                if (lastsplit === -1) {
                    result.push([encodeline, morseline, decodeline]);
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
                    result.push([encodepart, morsepart, decodepart]);
                }
            }
        }

        // And put together any residual parts
        if (encodeline.length > 0) {
            result.push([encodeline, morseline, decodeline]);
        }
        this.setErrorMsg(msg, 'morrepl');
        return result;
    }
    /**
     * Builds up a string map which maps all of the digits to the possible
     * morse mapping characters.
     */
    public buildMorseletMap(): StringMap {
        let morseletmap: StringMap = {};
        for (let c of this.encodecharset) {
            morseletmap[c] = '';
        }
        for (let x in this.state.replacement) {
            morseletmap[this.state.replacement[x]] = x;
        }
        return morseletmap;
    }
    public updateKnownmap(knownmap: MorbitKnownMap, c: string, morselet: string): string {
        let result = '';
        // Take it out of the list to start with.
        knownmap[c] = [morselet];
        for (let m in knownmap) {
            // Protect against eliminating all possibilities in the map.  While
            // this can leave us with a duplicate entry, it is better than having
            // a completely empty entry which causes other problems.  Ultimately
            // we need to find out how someone is creating a duplicate entry.
            if (knownmap[m].length > 1) {
                let index = knownmap[m].indexOf(morselet);
                if (index > -1) {
                    knownmap[m].splice(index, 1);
                    if (knownmap[m].length === 1) {
                        result += ' Eliminating ' + this.normalizeHTML(morselet) +
                            " as an option for " + m + " means that " + m +
                            " must be " + this.normalizeHTML(knownmap[m][0]) + ".";
                        result += this.updateKnownmap(knownmap, m, knownmap[m][0]);
                    }
                }
            }
        }
        return result;
    }
    /**
     * Generates displayable table of mappings of cipher characters
     * @param knownmap Current mapping of cipher characters to morse
     */
    public genKnownTable(result: JQuery<HTMLElement>, knownmap: MorbitKnownMap): void {
        let table = new JTTable({ class: "known" });
        let headrow = table.addHeaderRow();
        let bodyrow = table.addBodyRow();
        for (let c of this.encodecharset) {
            headrow.add(c);
            if (knownmap[c].length > 0) {
                let content: JQuery<HTMLElement> = $("<div/>")
                    .append(this.normalizeHTML(knownmap[c][0]));
                for (let i = 1; i < knownmap[c].length; i++) {
                    content.append($("<br/>"))
                        .append(this.normalizeHTML(knownmap[c][i]));
                }
                bodyrow.add(content);
            }
        }
        result.append(table.generate());
    }
    public consolidatePossibilities(possibilities: string[]): string {
        let result = '??';
        const cleanupMap: StringMap = {
            '?X': ' ',
            '?-': '?',
            '?O': '?',
            ' X': ' ',
            ' -': ' ',
            ' O': ' ',
            'XX': 'X',
            'X-': ' ',
            'XO': ' ',
            '-X': ' ',
            '--': '-',
            '-O': '?',
            'OX': ' ',
            'O-': '?',
            'OO': 'O',
        }
        if (possibilities && possibilities.length) {
            result = possibilities[0];
            for (let i = 1; i < possibilities.length; i++) {
                result = cleanupMap[result[0] + possibilities[i][0]] +
                    cleanupMap[result[1] + possibilities[i][1]];
            }
        }
        return result;
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
    public genKnownMapping(strings: string[][], knownmap: MorbitKnownMap): string[][] {
        let working: string[][] = [];
        for (let ctset of strings) {
            let morse = "";
            let plaintext = "";
            for (let c of ctset[ctindex]) {
                // See if we know what this character maps to exactly
                let possibilities = knownmap[c];
                if (c !== ' ' && c.length === 1 && possibilities !== undefined)
                    if (possibilities.length === 1) {
                        // Yes, we know that it defined so remember the morselet
                        morse += possibilities;
                        // Is it a separator? 
                    } else {
                        // Figure out what the possibilities string can be
                        morse += this.consolidatePossibilities(possibilities);
                    }
            }
            // We have built up the morse string, now convert it to the proper
            // characters by breaking on the Xs
            let morsepart = '';
            let lastc = '';
            for (let c of morse) {
                if (c === 'X') {
                    // XX generates 
                    if (lastc === 'X') {
                        plaintext += '/ ';
                        lastc = '';
                        morsepart = "";
                    } else {
                        let pt = frommorse[morsepart];
                        if (pt === undefined) {
                            pt = ' ';
                        }
                        plaintext += pt + this.repeatStr(' ', morsepart.length - 1);
                        lastc = c;
                        morsepart = "";
                    }
                } else {
                    if (lastc === 'X') {
                        plaintext += ' ';
                    }
                    morsepart += c;
                    lastc = c;
                }
            }
            // Did we have anything left over?
            if (morsepart !== '' && frommorse[morsepart] !== undefined) {
                plaintext += frommorse[morsepart];
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
    public hasUnknowns(result: JQuery<HTMLElement>, knownmap: MorbitKnownMap, working: string[][]): boolean {
        // Figure out what letters were actually used
        let used: BoolMap = {};
        let unknowns = 0;
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                if (c !== ' ') {
                    used[c] = true;
                }
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
     * Scan all the choices, if a morselet only appears on one choice,
     * assign it.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public checkSolo(result: JQuery<HTMLElement>,
        knownmap: MorbitKnownMap,
        working: string[][]): boolean {
        let condensed = false;
        let prefix = "Looking for unique mappings, ";
        let counts: NumberMap = {};
        let usage: StringMap = {};
        for (let e in knownmap) {
            if (knownmap[e].length > 1) {
                for (let entry of knownmap[e]) {
                    if (counts[entry] === undefined) {
                        counts[entry] = 0;
                    }
                    counts[entry]++;
                    usage[entry] = e;
                }
            }
        }
        for (let e in counts) {
            if (counts[e] === 1) {
                knownmap[usage[e]] = [e];
                let msg = usage[e] + " is the only cipher text character that" +
                    " can map to " + this.normalizeHTML(e) +
                    " so we mark it as such.";
                result.append(prefix + msg);
                prefix = " Also, ";
                condensed = true;
            }
        }
        return condensed;
    }
    /**
     * If xx is known, find all cipher characters before and after
     * and eliminate the choices with x at the end for before and
     * beginning for after.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public eliminateXXNeighbors(result: JQuery<HTMLElement>,
        knownmap: MorbitKnownMap,
        working: string[][]): boolean {
        let xxct = '';
        let prex: BoolMap = {};
        let postx: BoolMap = {};
        let prefix = "Looking for unknowns next to " + this.normalizeHTML('XX') +
            " which would result in three in a row, ";
        let eliminated = false;
        for (let e in knownmap) {
            prex[e] = false;
            postx[e] = false;
            // If this is our XX known spot, remember it
            if (knownmap[e].length === 1 && knownmap[e][0] === 'XX') {
                xxct = e;
                // Otherwise see if this has an X that could be before or after it
            } else if (knownmap[e].length > 1) {
                for (let ent of knownmap[e]) {
                    if (ent[0] === 'X') {
                        postx[e] = true;
                    } else if (ent[1] === 'X') {
                        prex[e] = true;
                    }
                }
            }
        }
        // We don't know which is XX, so we can't do anything.
        if (xxct === '') {
            return false;
        }
        // Bubble through the cipher text looking for anything next to it
        let lastc = '';
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                let msg = "";
                let fixed = '';
                if (c === ' ') {
                    continue;
                }
                if (c === xxct && prex[lastc]) {
                    // We can eliminate it from ending in X
                    msg = "we find the sequence " + lastc + c +
                        " where we know that " + c + " is " + this.normalizeHTML('XX') +
                        " which means that " + lastc +
                        " cannot end in " + this.normalizeHTML('X') +
                        ", so we can eliminate those possibilities";
                    // Drop the potential ones that end in X
                    for (let i = knownmap[lastc].length - 1; i >= 0; i--) {
                        if (knownmap[lastc][i][1] === 'X') {
                            knownmap[lastc].splice(i, 1);
                        }
                    }
                    fixed = lastc;
                    // And keep us from processing it again.
                    postx[lastc] = false;
                } else if (postx[c] && lastc === xxct) {
                    msg = "we find the sequence " + lastc + c +
                        " where we know that " + lastc + " is " + this.normalizeHTML('XX') +
                        " which means that " + c +
                        " cannot start with " + this.normalizeHTML('X') +
                        ", so we can eliminate those possibilities";
                    // Drop the ones that start with X
                    for (let i = knownmap[c].length - 1; i >= 0; i--) {
                        if (knownmap[c][i][0] === 'X') {
                            knownmap[c].splice(i, 1);
                        }
                    }
                    fixed = c;
                    // And keep us from processing it again
                    prex[c] = false;
                }
                if (fixed !== '' && knownmap[fixed].length === 1) {
                    msg += ' That leaves ' + this.normalizeHTML(knownmap[fixed][0]) +
                        " as the only option for " + fixed + ", so we eliminate it from" +
                        " all the other options.";
                    msg += this.updateKnownmap(knownmap, fixed, knownmap[fixed][0]);
                }
                if (msg !== '') {
                    eliminated = true;
                    result.append(prefix + msg);
                    prefix = ' Also,';
                }
                lastc = c;
            }
        }
        return eliminated;
    }
    /**
     * If xx is not known, find all cipher characters after mapping to
     * x at the end and eliminate xx from them.
     * Do the same for x at the beginning for followers.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public eliminateXXOptions(result: JQuery<HTMLElement>,
        knownmap: MorbitKnownMap,
        working: string[][]): boolean {
        let prex: BoolMap = {};
        let postx: BoolMap = {};
        let hasxx: BoolMap = {};
        let prefix = "With " + this.normalizeHTML('XX') + " unknown, looking " +
            " at unknowns which are next to " + this.normalizeHTML('X') +
            " which would result in three in a row, ";
        let eliminated = false;
        for (let e in knownmap) {
            prex[e] = false;
            postx[e] = false;
            hasxx[e] = false;
            // If this is our XX known spot, then we can do nothing else
            if (knownmap[e].length === 1 && knownmap[e][0] === 'XX') {
                return false;
            }
            if (knownmap[e].length >= 1) {
                prex[e] = true;
                postx[e] = true;
                for (let ent of knownmap[e]) {
                    if (ent === 'XX') {
                        hasxx[e] = true;
                    } else {
                        // If any of the possibilities don't start/end with X
                        // then we can't use it as an elimination
                        if (ent[1] !== 'X') {
                            postx[e] = false;
                        }
                        if (ent[0] !== 'X') {
                            prex[e] = false;
                        }
                    }
                }
            }
        }
        // Bubble through the cipher text looking for anything next to it
        let lastc = '';
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                let msg = "";
                if (c === ' ') {
                    continue;
                }
                if (hasxx[c] && postx[lastc]) {
                    // We can eliminate it from ending in X
                    msg = "we find the sequence " + lastc + c +
                        " where we know that " + lastc + " ends with " + this.normalizeHTML('X') +
                        " which means that " + c +
                        " cannot be " + this.normalizeHTML('XX') +
                        ", so we can eliminate that possibility.";
                    // Drop the XX entry
                    let index = knownmap[c].indexOf('XX');
                    if (index >= 0) {
                        knownmap[c].splice(index, 1);
                    }
                    // And keep us from processing it again.
                    hasxx[c] = false;
                } else if (prex[c] && hasxx[lastc]) {
                    msg = "we find the sequence " + lastc + c +
                        " where we know that " + c + " starts with " + this.normalizeHTML('X') +
                        " which means that " + lastc +
                        " cannot be " + this.normalizeHTML('XX') +
                        ", so we can eliminate that possibility.";
                    // Drop the XX entry
                    let index = knownmap[lastc].indexOf('XX');
                    if (index >= 0) {
                        knownmap[lastc].splice(index, 1);
                    }
                    // And keep us from processing it again
                    hasxx[lastc] = false;
                }
                if (msg !== '') {
                    eliminated = true;
                    result.append(prefix + msg);
                    prefix = ' Also,';
                }
                lastc = c;
            }
        }
        return eliminated;
    }
    /**
     * If xx is not known, find all double characters and eliminate
     * xx from their choices 
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public eliminateXXDoubles(result: JQuery<HTMLElement>,
        knownmap: MorbitKnownMap,
        working: string[][]): boolean {
        let hasxx: BoolMap = {};
        let prefix = "With " + this.normalizeHTML('XX') + " unknown, looking " +
            " at unknowns which are doubled " + this.normalizeHTML('X') +
            " which would result in four in a row, ";
        let eliminated = false;
        for (let e in knownmap) {
            hasxx[e] = false;
            if (knownmap[e].length >= 1) {
                if (knownmap[e].indexOf('XX') >= 0) {
                    // If this is our XX known spot, then we can do nothing else
                    if (knownmap[e].length === 1) {
                        return false;
                    }
                    hasxx[e] = true;
                }
            }
        }
        // Bubble through the cipher text looking for anything next to it
        let lastc = '';
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                let msg = "";
                if (c === ' ') {
                    continue;
                }
                if (c == lastc && hasxx[c]) {
                    // We can eliminate it from ending in X
                    msg = "we find a double sequence " + c + c +
                        " which cannot be " + this.normalizeHTML('XX') +
                        ", so we can eliminate that possibility";
                    // Drop the XX entry
                    let index = knownmap[c].indexOf('XX');
                    if (index >= 0) {
                        knownmap[c].splice(index, 1);
                    }
                    eliminated = true;
                    result.append(prefix + msg);
                    prefix = ' Also,';
                    // And keep us from processing it again.
                    hasxx[c] = false;
                }
                lastc = c;
            }
        }
        return eliminated;
    }
    /**
     * Find spans of 7 characters with an unknown in them and
     * eliminate choices which don’t have an X.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public eliminateMissingXInSpan(result: JQuery<HTMLElement>,
        knownmap: MorbitKnownMap,
        working: string[][]): boolean {
        let hasxx: BoolMap = {};
        let prefix = "With " + this.normalizeHTML('XX') + " unknown, looking " +
            " at unknowns which are doubled " + this.normalizeHTML('X') +
            " which would result in four in a row, ";
        let eliminated = false;
        for (let e in knownmap) {
            hasxx[e] = false;
            if (knownmap[e].length >= 1) {
                if (knownmap[e].indexOf('XX') >= 0) {
                    // If this is our XX known spot, then we can do nothing else
                    if (knownmap[e].length === 1) {
                        return false;
                    }
                    hasxx[e] = true;
                }
            }
        }
        // Bubble through the cipher text looking for anything next to it
        let lastc = '';
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                let msg = "";
                if (c === ' ') {
                    continue;
                }
                if (c == lastc && hasxx[c]) {
                    // We can eliminate it from ending in X
                    msg = "we find a double sequence " + c + c +
                        " which cannot be " + this.normalizeHTML('XX') +
                        ", so we can eliminate that possibility";
                    // Drop the XX entry
                    let index = knownmap[c].indexOf('XX');
                    if (index >= 0) {
                        knownmap[c].splice(index, 1);
                    }
                    eliminated = true;
                    result.append(prefix + msg);
                    prefix = ' Also,';
                    // And keep us from processing it again.
                    hasxx[c] = false;
                }
                lastc = c;
            }
        }
        return eliminated;
    }
    /**
     * Test a mapping to see if it generates a completely legal string
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns string blank = success, otherwise bad sequence to print
     */
    public findInvalidMorseChar(knownmap: MorbitKnownMap, working: string[][]): string {
        let morsestr = '';
        let sequence = '';
        let tryit = true;
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                if (c === ' ') {
                    continue;
                }
                let morsec = knownmap[c];
                if (morsec.length != 1) {
                    tryit = false;
                } else {
                    morsestr += morsec;
                    sequence += c;
                    let endx = morsestr.indexOf('X');
                    if (endx > 0) {
                        if (tryit) {
                            if (frommorse[morsestr.substr(0, endx)] === undefined) {
                                return sequence + ' as ' + morsestr;
                            }
                        }
                        sequence = c;
                        morsestr = morsestr.substr(endx + 1);
                        tryit = true;
                    }
                }
            }
        }
        return "";
    }
    /**
     * Find span of characters between Xs with a single unknown.
     * Try all choices for the unknown and eliminate any illegal options.
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public eliminateInvalidInSpan(result: JQuery<HTMLElement>,
        knownmap: MorbitKnownMap,
        working: string[][]): boolean {
        let prefix = "Trying our remaining candidates on the ciphertext, ";
        for (let c in knownmap) {
            if (knownmap[c].length > 1) {
                let savemap = knownmap[c];
                let legal: string[] = [];
                for (let mc of savemap) {
                    let testmap = cloneObject(knownmap) as MorbitKnownMap;
                    this.updateKnownmap(testmap, c, mc);
                    let invalid = this.findInvalidMorseChar(testmap, working);
                    if (invalid !== '') {
                        let msg = "Attempting to substutite " + mc + " for " + c +
                            " doesn't work because we end up with the sequence " +
                            invalid + " which is not a legal morse code character, " +
                            "so we can eliminate it as a possibility.";
                        result.append(prefix + this.normalizeHTML(msg));
                        prefix = " Also, ";
                    } else {
                        legal.push(mc);
                    }
                }
                if (legal.length === 1) {
                    let msg = " Which means we know that " + c +
                        " must map to " + legal;
                    msg += this.updateKnownmap(knownmap, c, legal[0]);
                    result.append(this.normalizeHTML(msg));
                    return true;
                }
                knownmap[c] = legal;
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
    public applyKnownmap(knownmap: MorbitKnownMap, working: string[][]): string {
        let plaintext = '';
        let morsestr = '';
        let xcount = 0;
        let tryit = true;
        for (let strset of working) {
            for (let c of strset[ctindex]) {
                if (c === ' ') {
                    continue;
                }
                let morsec = knownmap[c];
                if (morsec.length != 1) {
                    tryit = false;
                    xcount = 0;
                } else {
                    morsestr += morsec[0];
                    // Now see what kind of morse code we can generate from it
                    let xindex = morsestr.indexOf('X');
                    while (xindex === 0) {
                        if (xcount === 1) {
                            plaintext += ' '
                            xcount = 0;
                        }
                        morsestr = morsestr.substr(1);
                        xindex = morsestr.indexOf('X');
                        xcount++;
                    }
                    // If we have some morse code to check, see if we can map it
                    if (xindex >= 0) {
                        if (tryit) {
                            let p = frommorse[morsestr.substr(0, xindex)];
                            if (p !== undefined) {
                                plaintext += p;
                            } else if (xcount === 1) {
                                plaintext += ' ';
                            } else {
                                plaintext += '?';
                            }
                        } else {
                            plaintext += '?';
                        }
                        tryit = true;
                        xcount++;
                        morsestr = morsestr.substr(xindex + 1);
                        // If we have another X, take it off
                        xindex = morsestr.indexOf('X');
                        while (xindex === 0) {
                            if (xcount === 1) {
                                plaintext += ' '
                                xcount = 0;
                            }
                            morsestr = morsestr.substr(1);
                            xindex = morsestr.indexOf('X');
                            xcount++;
                        }
                    }
                }
            }
        }
        if (morsestr != '') {
            let p = frommorse[morsestr];
            if (p === undefined) {
                p = '?';
            }
            plaintext += p
        }
        return plaintext;
    }

    /**
     * Try all values of an unknown and eliminate any which generate
     * an illegal Morse code sequence 
     * @param result Place to output any messages
     * @param knownmap Map of current cipher strings
     * @param working Current mapping strings
     * @returns Boolean indicating that any were found
     */
    public eliminateInvalidMorse(result: JQuery<HTMLElement>,
        knownmap: MorbitKnownMap,
        working: string[][]): boolean {
        let prefix = "Looking to see what is readable, ";
        let mincipher = this.minimizeString(this.state.cipherString);
        for (let c in knownmap) {
            if (knownmap[c].length > 1) {
                let testmap = cloneObject(knownmap) as MorbitKnownMap;
                let savemap = knownmap[c];
                let legal: string[] = [];
                let msg = "Since " + c + " has several options " +
                    " we simply try them and look at the first word or two" +
                    " to see if it makes sense."
                for (let mc of savemap) {
                    this.updateKnownmap(testmap, c, mc);

                    let plaintext = this.applyKnownmap(testmap, working);
                    // Now split it on all the unknowns to find the longest 
                    // contiguous string
                    let chunks = plaintext.split('?');
                    let longest = chunks[0];
                    for (let chunk of chunks) {
                        if (chunk.length > longest.length) {
                            longest = chunk;
                        }
                    }
                    msg += " Trying " + this.normalizeHTML(mc) + " for " + c +
                        " gives us a chunk: " + longest + ".";
                    longest = this.minimizeString(longest);
                    if (chunks.length === 1) {
                        if (mincipher === this.minimizeString(plaintext)) {
                            legal.push(mc);
                        }
                    } else if (mincipher.indexOf(this.minimizeString(longest)) >= 0) {
                        legal.push(mc);
                    }
                }
                if (legal.length === 1) {
                    msg += " Which means we know that " + c +
                        " must map to " + this.normalizeHTML(legal[0]);
                    msg += this.updateKnownmap(knownmap, c, legal[0]);
                    result.append(msg);
                    return true;
                }
                // While we know to eliminate a couple of characters, pushing
                // it here means they would be eliminated silently and there
                // is nothing output to the solving log.  For now we leave
                // the code in the off chance we decide to add it back to the
                // solver when we output the message stored in msg.
                // if (legal.length > 0) {
                //     knownmap[c] = legal;
                // }
            }
        }
        return false;
    }
    /**
     * Generates the solving guide for the cipher
     * @returns DOM to insert into the web page
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        let result = $("<div/>");
        let msg = '';
        if (this.state.cipherString === '') {
            this.setErrorMsg(msg, 'morgs');
            return result;
        }
        let morseletmap = this.buildMorseletMap();
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);
        let knownmap: MorbitKnownMap = {};

        let hint = this.checkHintCrib(result, strings);
        if (hint === undefined) {
            return result;
        }

        // Assume we don't know what anything is
        for (let c of this.encodecharset) {
            knownmap[c] = Object.assign([], morbitmap);
        }

        // And then fill it in with what we do know.
        for (let c of hint) {
            this.updateKnownmap(knownmap, c, morseletmap[c]);
        }
        this.genKnownTable(result, knownmap);
        result.append("Based on that information we can map the cipher text as:");
        let working = this.genKnownMapping(strings, knownmap);
        if (working.length <= 0) {
            return result;
        }

        this.genMapping(result, working);
        if (!this.hasUnknowns(result, knownmap, working)) {
            result.append("Which means that the hint has provide all of the" +
                " cipher digit mapping and there is no work to solve it");
        } else {
            let limit = 20;
            while (limit > 0) {
                // 1. Scan all the choices, if a morselet only appears on one choice,
                //    assign it.
                if (this.checkSolo(result, knownmap, working)) {
                    // We consolidated at least one choice
                } else if (this.eliminateXXNeighbors(result, knownmap, working)) {
                    // We eliminated options touching XX
                } else if (this.eliminateXXOptions(result, knownmap, working)) {
                    // We found at least one new letter that must be an X
                } else if (this.eliminateXXDoubles(result, knownmap, working)) {
                    // We found at least one doubled letter that can't be XX
                } else if (this.eliminateMissingXInSpan(result, knownmap, working)) {
                    // We found an unknown that had to have an X
                } else if (this.eliminateInvalidInSpan(result, knownmap, working)) {
                    // We eliminated a invalid choices in a span
                } else if (this.eliminateInvalidMorse(result, knownmap, working)) {
                    // We eliminated invalid choice across whole sequence
                } else {
                    // Nothing more that we can do..
                    result.append($("<h4.>").
                        text("There are no more automated solving techniques, " +
                            "so you need to do some trial and error with the remaining unknowns. " +
                            "Please feel free to submit an issue with the example so we can improve this."));
                    limit = 0;
                    msg = "Automated solver is unable to find an automatic solution.";
                    break;
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
        }
        this.setErrorMsg(msg, 'morgs');
        return result;
    }
}
