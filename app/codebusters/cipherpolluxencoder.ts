import { cloneObject, StringMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { CipherEncoder, IEncoderState } from './cipherencoder';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { tomorse } from '../common/morse';

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
        this.genAlphabet();
        let res = this.genSolution();
        $('#answer')
            .empty()
            .append(res);

        // Show the update frequency values
        this.displayFreq();
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
    public genSolution(): JQuery<HTMLElement> {
        // TODO: Write solving code here.
        return null;
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
