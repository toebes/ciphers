import { cloneObject, StringMap, BoolMap, NumberMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { CipherEncoder, IEncoderState } from './cipherencoder';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { tomorse, frommorse } from '../common/morse';
import { JTTable } from '../common/jttable';

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
const morseindex = 1;
const ctindex = 0;
const ptindex = 2;
/**
 * CipherMorbitEncoder - This class handles all of the actions associated with encoding
 * a Morbit cipher.
 */
export class CipherMorbitEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#Morbit';

    public usesMorseTable: boolean = true;

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
    }
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
    public updateOutput(): void {
        this.guidanceURL = 'TestGuidance.html#Morbit' + this.state.operation;
        if (this.state.operation === 'decode') {
            $('.hint').show();
            $('.crib').hide();
        } else {
            $('.hint').hide();
            $('.crib').show();
        }
        $("#hint").val(this.state.hint);
        $("#crib").val(this.state.crib);
        JTRadioButtonSet('operation', this.state.operation);
        for (let i in morbitmap) {
            $("input[data-char='" + i + "']")
                .val(this.state.replacement[morbitmap[i]]);
        }
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
        result.append(
            JTFLabeledInput(
                'Hint Characters',
                'text',
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
        let extra = "";
        let spaceextra = "XX";
        let decodeextra = "";
        let failed = false;

        if (failed) {
            return result;
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
                        this.addErrorMsg('Invalid Morse piece:' + m);
                        c = '?';
                    }
                    encodeline += c + " ";
                }
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
    public updateKnownmap(knownmap: MorbitKnownMap, c: string, morselet: string): void {

        for (let m in knownmap) {
            let index = knownmap[m].indexOf(morselet);
            if (index > -1) {
                knownmap[m].splice(index, 1);

            }
        }
        knownmap[c] = [morselet];
    }

    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $('<div/>');
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
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $('<div/>');
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);
        let tosolve = ctindex;
        let toanswer = ptindex;
        let morseline = morseindex;
        for (let strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).text(strset[tosolve])
            );
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).html(this.normalizeHTML(strset[morseline]))
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
    public genKnownTable(result: JQuery<HTMLElement>, knownmap: MorbitKnownMap): void {
        let table = new JTTable({ class: "known" });
        let headrow = table.addHeaderRow();
        let bodyrow = table.addBodyRow();
        for (let c of this.encodecharset) {
            headrow.add(c);
            let content: JQuery<HTMLElement> = $("<div/>")
                .append(this.normalizeHTML(knownmap[c][0]));
            for (let i = 1; i < knownmap[c].length; i++) {
                content.append($("<br/>"))
                    .append(this.normalizeHTML(knownmap[c][i]));
            }
            bodyrow.add(content);
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
            "which would result in three in a row,";
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
                if (c === ' ') {
                    continue;
                }
                if (c === xxct && postx[lastc]) {
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
                    // And keep us from processing it again.
                    postx[lastc] = false;
                } else if (prex[c] && lastc === xxct) {
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
                    // And keep us from processing it again
                    prex[c] = false;
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
     * Generates the solving guide for the cipher
     * @returns DOM to insert into the web page
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
        let knownmap: MorbitKnownMap = {};
        result.append($("<h3/>").text("How to solve"));
        if (this.state.operation === 'crypt') {
            // We are told the mapping of at least 6 letters
            // this.state.crib
        }
        result.append("Since we are told the mapping of " + hint +
            " ciphertext, we can build the following table:");

        // Assume we don't know what anything is
        for (let c of this.encodecharset) {
            knownmap[c] = Object.assign([], morbitmap);
        }
        if (hint === undefined || hint.length < 3) {
            result.append($("<h4/>")
                .text("At least 3 hint characters are needed to generate a solution"));
            return result;
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
        let limit = 20;
        while (limit > 0) {
            // 1. Scan all the choices, if a morselet only appears on one choice,
            //    assign it.
            if (this.checkSolo(result, knownmap, working)) {
                // We consolidated at least one choice
            } else if (this.eliminateXXNeighbors(result, knownmap, working)) {
                // 2. If xx is known, find all cipher characters before and after
                //    and eliminate the choices with x at the end for before and
                //    beginning for after.
                // 3. If xx is not known, find all cipher characters after mapping to
                //    x at the end and eliminate xx from them.
                //    Do the same for x at the beginning for followers.
                // 4. If xx is not known, find all double characters and eliminate
                //    xx from their choices 
                // 5. Find spans of 7 characters with an unknown in them and
                //    eliminate choices which don’t have an X.
                // 6. Find span of characters between Xs with a single unknown.
                //    Try all choices for the unknown and eliminate any illegal options.
                // 7. Try all values of an unknown and eliminate any which generate
                //    an illegal Morse code sequence

                //         // We eliminated at least one letter from being an X
                //     } else if (this.findSpacers(result, knownmap, working)) {
                //         // We found at least one new letter that must be an X
                //     } else if (this.findInvalidMorse(result, knownmap, working)) {
                //         // We found at least one morse code that invalidated a choice
                //     } else if (this.findSingleMorse(result, knownmap, working)) {
                //         // We found at least one morse code that invalidated a choice
                //     } else if (this.testSingleMorse(result, knownmap, working)) {
                //         // We found at least one morse code that invalidated a choice
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
        // $('.mchar')
        //     .off('input')
        //     .on('input', e => {
        //         let char = $(e.target).val() as string;
        //         this.markUndo(null);
        //         if (this.setmChar(char)) {
        //             this.updateOutput();
        //         }
        //     });
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
