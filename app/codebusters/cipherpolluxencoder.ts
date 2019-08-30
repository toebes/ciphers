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
        result.append(this.genTestUsage());
        let radiobuttons = [
            { id: 'mrow', value: 'decode', title: 'Decode' },
            { id: 'crow', value: 'crypt', title: 'Cryptanalysis' },
        ];
        result.append(
            JTRadioButton(6, 'operation', radiobuttons, this.state.operation)
        );

        result.append(this.genQuestionFields());
        result.append(
            JTFLabeledInput(
                'Plain Text',
                'textarea',
                'toencode',
                this.state.cipherString,
                'small-12 medium-12 large-12'
            )
        );
        let inputbox = $("<div/>", {
            class: "grid-x grid-margin-x",
        });
        inputbox.append(
            JTFLabeledInput(
                'O',
                'text',
                'dotchar',
                this.state.dotchars,
                'small-12 medium-4 large-4'
            )
        );
        inputbox.append(
            JTFLabeledInput(
                '-',
                'text',
                'dashchar',
                this.state.dashchars,
                'small-12 medium-4 large-4'
            )
        );
        inputbox.append(
            JTFLabeledInput(
                'X',
                'text',
                'xchar',
                this.state.xchars,
                'small-12 medium-4 large-4'
            )
        );
        result.append(inputbox);

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
                }).text(strset[0])
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
    public genKnownTable(knownmap: StringMap): JQuery<HTMLElement> {
        let table = new JTTable({ class: "known" });
        let headrow = table.addHeaderRow();
        let bodyrow = table.addBodyRow();
        for (let c of "0123456789") {
            headrow.add(c);
            bodyrow.add({ content: this.normalizeHTML(knownmap[c]) });
        }
        return table.generate();
    }
    public genKnownMapping(strings: string[][], knownmap: StringMap): string[][] {
        let working: string[][] = [];
        let current = "";
        for (let ctset of strings) {
            let morse = "";
            let plaintext = "";
            let analysis = "";
            for (let c of ctset[0]) {
                // See if we know what this character maps to exactly
                let possibilities = knownmap[c];
                if (possibilities.length === 1) {
                    // Yes, we know that it defined so remember the morselet
                    morse += possibilities;
                    analysis += possibilities;
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
                    analysis += "?";
                } else {
                    morse += " ";
                    current += " ";
                    analysis += " ";
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
            working.push([ctset[0], morse, plaintext, analysis]);
        }
        return working;
    }
    public genMapping(working: string[][]): JQuery<HTMLElement> {
        let result = $('<div/>');

        for (let strset of working) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).text(strset[0])
            );
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).text(strset[1])
            );
            result.append(
                $('<div/>', {
                    class: 'TOANSWER',
                }).text(strset[2])
            );
        }
        return result;
    }
    public hasUnknowns(knownmap: StringMap): boolean {
        for (let e in knownmap) {
            if (knownmap[e].length > 1) {
                return true;
            }
        }
        return false;
    }
    public findTriples(result: JQuery<HTMLElement>,
        knownmap: StringMap,
        working: string[][]): boolean {
        let found = false;
        let lastc = '';
        let xcount = 0;
        let count = 0;
        let sequence = "";
        for (let strset of working) {
            for (let c of strset[0]) {
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
                    count++;
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
                            msg = "we find three " + lastc + "s in a row. ";
                        } else {
                            msg = "we see the sequence " + tseq +
                                " which would result in three Xs in a row if " + lastc +
                                " were an X. "
                        }
                        result.append("Looking at the ciphertext, " + msg);
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


    public genSolution(): JQuery<HTMLElement> {
        let result = $("<div/>");
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
        result.append("Since we are told that ");

        // Assume we don't know what anything is
        for (let c of "0123456789") {
            knownmap[c] = "O-X";
        }
        // And then fill it in with what we do know.
        for (let c of hint) {
            knownmap[c] = morseletmap[c];
        }
        result.append(this.genKnownTable(knownmap));
        result.append("Based on that information we can map the cipher text as:");
        let working = this.genKnownMapping(strings, knownmap);
        result.append(this.genMapping(working));
        let limit = 2;
        while (limit-- > 0 && this.hasUnknowns(knownmap)) {
            // Check to see if we have any known non-X
            if (!this.findTriples(result, knownmap, working)) {

            }
            working = this.genKnownMapping(strings, knownmap);
            result.append(this.genKnownTable(knownmap));
            result.append("Based on that information we can map the cipher text as:");
            result.append(this.genMapping(working));
        }
        // TODO: Write solving code here.
        // if there are 4 or 5 in a row and an unknown, it is an X, especially
        // if the letter after it is not an X
        // any triple letter sequences are not X
        // if you have two XX in a row followed by an unknown it is . or -
        // If the first symbol is unknown, it is . or -
        // numbers are HIGHLY unlikely, and certainly not after a letter
        // f
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
