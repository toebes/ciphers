import { cloneObject, StringMap } from '../common/ciphercommon';
import { ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { CipherEncoder, IEncoderState } from './cipherencoder';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { tomorse } from '../common/morse';
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
        this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
        this.setOperation(this.state.operation);
    }
    public randomize(): void {
        let replacement = "123456789";
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
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $('<div/>');
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
    public genSolution(): JQuery<HTMLElement> {
        // TODO: Write solving code here.
        return null;
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
