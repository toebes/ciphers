import { CipherEncoder } from "./cipherencoder";
import { JTButtonItem } from "../common/jtbuttongroup";
import { ITestType } from "../common/cipherhandler";
import { JTRadioButtonSet, JTRadioButton } from "../common/jtradiobutton";
import { JTFLabeledInput } from "../common/jtflabeledinput";
export const morseindex = 1;
export const ctindex = 0;
export const ptindex = 2;
export class CipherMorseEncoder extends CipherEncoder {
    public usesMorseTable: boolean = true;
    public cipherName = 'Morse';
    public cmdButtons: JTButtonItem[] = [
        { title: 'Save', color: 'primary', id: 'save' },
        { title: 'Randomize', color: 'primary', id: 'randomize' },
        this.undocmdButton,
        this.redocmdButton,
        this.guidanceButton,
    ];
    /** Save and Restore are done on the CipherEncoder Class */
    public randomize(): void { }
    public setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }
    public validateQuestion(): void {
        let msg = '';
        let showsample = false;
        let sampleLink: JQuery<HTMLElement> = undefined;
        let questionText = this.minimizeString(this.state.question);
        if (this.state.operation === 'decode') {
            // Look to see if the Hint Digits appear in the Question Text
            let notfound = '';
            if (this.state.hint === undefined || this.state.hint === '') {
                msg = "No Hint Digits provided";
            } else {
                for (let c of this.state.hint) {
                    if (questionText.indexOf(c) < 0) {
                        notfound += c;
                    }
                }
                if (notfound !== '') {
                    if (notfound.length === 1) {
                        msg = "The Hint Digit " + notfound +
                            " doesn't appear to be mentioned in the Question Text.";
                    } else {
                        msg = "The Hint Digits " + notfound +
                            " don't appear to be mentioned in the Question Text.";
                    }
                    showsample = true;
                }
            }
        } else {
            // Look to see if the crib appears in the quesiton text
            let crib = this.minimizeString(this.state.crib);
            if (questionText.indexOf(crib) < 0) {
                msg = "The Crib Text " + this.state.crib +
                    " doesn't appear to be mentioned in the Question Text.";
                showsample = true;
            }
        }
        if (showsample) {
            sampleLink = $("<a/>", { class: "sampq" }).
                text(" Show suggested Question Text");
        }
        this.setErrorMsg(msg, 'vq', sampleLink);
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        this.validateQuestion();
        $('#answer')
            .empty()
            .append(this.genAnswer(ITestType.None))
            .append(this.genSolution(ITestType.None));
        this.attachHandlers();
    }
    public updateOutput(): void {
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
        super.updateOutput();
    }
    /**
    * Generates the section above the command buttons
    */
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
        result.append(this.createQuestionTextDlg());
        this.genQuestionFields(result);
        this.genEncodeField(result);
        return result;
    }
    public addHintCrib(result: JQuery<HTMLElement>): void {
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
    }
    /**
     * Fills in the frequency portion of the frequency table.  For the morse ones
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void { }
    public genAlphabet(): void { }
    /**
     * Generates an HTML representation of a string for display.  Replaces the X, O and -
     * with more visible HTML equivalents
     * @param str String to normalize (with - X and O representing morese characters)
     * @returns updated string to display
     */
    public normalizeHTML(str: string): string {
        return str
            .replace(/O/g, "&#9679;")
            .replace(/-/g, "&ndash;")
            .replace(/X/g, "&times;");
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
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
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);

        for (let strset of strings) {
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
        return result;
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
                }).html(this.normalizeHTML(strset[morseindex]))
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
     * Locate the crib in the cipher and return the corresponding cipher text
     * characters
     * @param strings Encoded cipher set
     * @param crib string to look for
     * @returns String containing Cipher text characters correspond to the crib
     */
    public findCrib(strings: string[][], crib: string): string {
        let cribmatch = crib;
        let ciphermatch = '';
        let backtracki = 0;
        if (crib === undefined) {
            return '';
        }

        for (let strset of strings) {
            for (let i = 0, len = strset[ctindex].length; i < len; i++) {
                let p = strset[ptindex][i];
                let c = strset[ctindex][i];
                if (c !== ' ') {
                    ciphermatch += c;
                }
                if (p !== ' ' && p !== '/') {
                    if (p === cribmatch[0]) {
                        if (cribmatch === crib) {
                            // We are starting a match.  Remember where we we began
                            // so that we can backtrack to it if we fail along the
                            // way.
                            backtracki = i;
                        }
                        cribmatch = cribmatch.substr(1);
                        if (cribmatch === '') {
                            return ciphermatch;
                        }
                    } else {
                        // If we didn't match, we need to start over again
                        // looking for the crib, but we have to backtrack to
                        // where we first attempted to match the crib.
                        if (cribmatch !== crib) {
                            i = backtracki;
                        }
                        cribmatch = crib;
                        ciphermatch = '';
                    }
                }
            }
        }
        return '';
    }
    /**
     * Check the 
     * @param result Hint characters or undefined on error
     */
    public checkHintCrib(result: JQuery<HTMLElement>, strings: string[][]): string {
        let hint = this.state.hint;
        if (hint === undefined) {
            hint = '';
        }
        let msg = '';

        result.append($("<h3/>").text("How to solve"));
        if (this.state.operation === 'crypt') {
            // The CRIB should be at least 4 characters
            if (this.state.crib === undefined || this.state.crib.length < 4) {
                result.append($("<h4/>")
                    .text("At least 4 crib characters are needed to generate a solution"));
                this.setErrorMsg("The crib should be at least 4 characters", 'mchc');
                return undefined;
            }
            let bighint = this.findCrib(strings, this.minimizeString(this.state.crib));
            if (bighint === '') {
                msg = "Unable to find placement of the crib";
                result.append($("<h4/>")
                    .text("Unable to find placement of the crib: " + this.state.crib));
            } else {
                // Clean up the crib characters eliminating any dups.
                hint = '';
                for (let c of bighint) {
                    if (hint.indexOf(c) < 0) {
                        hint += c;
                    }
                }
                result.append("With the crib of " + this.state.crib +
                    " mapped to the ciphertext " + bighint +
                    " we now know the mapping of " + String(hint.length) +
                    " characters. ");
            }
        } else if (hint.length < 4) {
            msg = "There need to be at least 4 Hint Digits (6 is expected for a test)";
        }
        result.append("Since we are told the mapping of " + hint +
            " ciphertext, we can build the following table:");

        this.setErrorMsg(msg, 'mchc');
        if (hint.length < 4) {
            result.append($("<h4/>")
                .text("At least 4 Hint Digits are needed to automatically generate a solution"));
            return undefined;
        }
        return hint;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
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