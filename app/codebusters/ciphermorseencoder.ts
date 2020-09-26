import { CipherEncoder } from "./cipherencoder";
import { JTButtonItem } from "../common/jtbuttongroup";
import { IScoreInformation, ITestQuestionFields, ITestType } from "../common/cipherhandler";
import { JTRadioButton, JTRadioButtonSet } from "../common/jtradiobutton";
import { JTFLabeledInput } from "../common/jtflabeledinput";
import { ICipherType } from "../common/ciphertypes";
import { makeFilledArray } from "../common/ciphercommon";
import { JTTable } from "../common/jttable";

export const morseindex = 1;
export const ctindex = 0;
export const ptindex = 2;
export class CipherMorseEncoder extends CipherEncoder {
    public usesMorseTable: boolean = true;
    public cipherName = 'Morse';
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        { title: 'Randomize', color: 'primary', id: 'randomize' },
        this.undocmdButton,
        this.redocmdButton,
        this.guidanceButton,
    ];

    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Question arrays to be used at runtime
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        let result = super.getInteractiveTemplate();
        // Each cipher character corresponds to 2 symbols consisting of dots, dashes or xes characters
        let strings: string[][] = this.makeReplacement(this.state.cipherString, 9999 /*this.maxEncodeWidth*/);
        let encodedString = strings[ctindex];
        let anslen = encodedString[0].length;
        console.log("The encoded string length is " + anslen);

        // We need an answer, separators and replacement boxes for each morse character pair worth
        result.answer = makeFilledArray(anslen, " ");
        result.separators = makeFilledArray(anslen, " ");
        result.replacements = makeFilledArray(anslen, " ");
        return result;
    }

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
        let questionText = this.state.question.toUpperCase();
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
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
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
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
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
     * @param str String to normalize (with - X and O representing morse characters)
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
        let strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);

        for (let strset of strings) {
            let ctext = strset[ctindex].replace(/ /g, "&nbsp;&nbsp;");
            result.append(
                $('<div/>', {
                    class: 'TOSOLVEQ',
                }).html(ctext)
                    .append($("<br/><br/>"))
            );
        }
        return result;
    }

    /**
     * Generate the score of an answered cipher
     * @param answerlong - the array of characters from the interactive test.
     */
    public genScore(answerlong: string[]): IScoreInformation {
        // Get what the question layout was so we can extract the answer
        let strings = this.makeReplacement(
            this.getEncodingString(),
            this.maxEncodeWidth
        );

        let solution: string[] = [];
        let answer: string[] = [];
        let stringindex = ptindex;

        // Figure out what the expected answer should be
        for (let splitLines of strings) {
            for (let c of splitLines[stringindex]) {
                if (this.isValidChar(c)) {
                    solution.push(c);
                }
            }
        }
        // We need to pull out what they actually answered.  Essentially
        // If they answered anything, we will include it.  It basically lets
        // them put in characters for answer together but also allows them to put the
        // answer character anywhere under the cipher character
        for (let i in answerlong) {
            if (answerlong[i] !== " " && answerlong[i] !== "") {
                answer.push(answerlong[i]);
            }
        }
        // Pad the answer to match the solution length
        while (answer.length < solution.length) {
            answer.push(" ");
        }
        // And let calculateScore do all the heavy lifting
        return this.calculateScore(solution, answer, this.state.points);
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
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        let qnumdisp = String(qnum + 1);
        let result = $('<div/>', {id: "Q" + qnumdisp});
        let strings = this.makeReplacement(
            this.getEncodingString(),
            35 /*this.maxEncodeWidth */
        );
        let table = new JTTable({class: 'ansblock cipherint baconian SOLVER'});
        let pos = 0;
        let inputidbase = "I" + qnumdisp + "_";
        let spcidbase = "S" + qnumdisp + "_";
        let workidbase = "R" + qnumdisp + "_";
        for (let splitLines of strings) {
            let cipherline = splitLines[ctindex];
            // We need to generate a row of lines for each split up cipher text
            // The first row is the cipher text
            let rowcipher = table.addBodyRow();
            // followed by the replacement characters that they can use for trackign the baconian letters
            let rowunder = table.addBodyRow();
            // With boxes for the answers.  Note that we give them 2 boxes so they can put the answer in
            // any of them (or somewhere close to it)
            let rowanswer = table.addBodyRow();
            // With a blank row at the bottom
            let rowblank = table.addBodyRow();
            for (let c of cipherline) {
                // The word baconian only needs blocks under the valid characters but the
                // others get blocks under every character (since there is no restriction on
                // what the cipher characters can be)
                if (this.isValidChar(c) || c === ' ') {
                    // We need to identify the cells which get the separator added/removed as a set
                    let spos = String(pos);
                    let sepclass = " S" + spos;
                    // We have a clickable field for the separator character.  It is basically an
                    // upside down caret that is a part of the cipher text field
                    let field = $("<div/>")
                        .append($("<div/>", {class: "ir", id: spcidbase + spos}).html("&#711;"))
                        .append(c);
                    rowcipher.add({settings: {class: 'q v ' + sepclass}, content: field,});
                    // We have a box for them to put whetever baconian substitution in that they want
                    rowanswer.add({
                        celltype: 'td',
                        content: $("<input/>", {
                            id: inputidbase + spos,
                            class: "awc",
                            type: "text",
                        }),
                        settings: {class: 'e v' + sepclass},
                    });
                    // And lastly we have a spot for the answer.  Note that we actually have
                    // five spots per baconian character, but they really should only be filling in one.
                    rowunder.add({
                        celltype: 'td',
                        content: $("<input/>", {
                            id: workidbase + spos,
                            class: "awr",
                            type: "text",
                        }).attr("isMorse", "1"),
                        settings: {class: sepclass},
                    });
                    pos++;
                } else {
                    // Not a character to edit, so just leave a blank column for it.
                    rowcipher.add(c);
                    rowanswer.add(c);
                    rowunder.add(" ");
                }
                // And of course we need a blank line between rows
                rowblank.add({settings: {class: 's'}, content: ' '});
            }
        }
        result.append(table.generate());
        result.append($("<textarea/>", {id: "in" + String(qnum + 1), class: "intnote"}))
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
        let cipherCrib;
        let cribRegex = '';
        let plainText = '';
        let cipherText = '';
        let notLetters = '###';

        // Get cipher text and plain text all in one string
        for (let strset of strings) {
            plainText += strset[ptindex];
            cipherText += strset[ctindex];
        }

        // Assuming our operation is cryptanalysis...
        if (this.state.cipherType === 'pollux') {
            notLetters = '\\ {0,}';
        }

        // The regex is a sequence of letters, each letter followed by
        // one or more spaces.
        for (let i = 0; i < crib.length; i++) {
            cribRegex += (crib.substr(i,  1) + notLetters);
        }
        let regex = new RegExp(cribRegex, 'g');
        let match = regex.exec(plainText);
        // The indexes are directly corresponding between letter location and cipher text.
        cipherCrib = cipherText.substr(match.index, match[0].length);
        return cipherCrib.trim();
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

                let updateHint = false;
                // '0' can not be a hint digit in Morbit, so if it was entered, remove it...
                if (this.state.cipherType === ICipherType.Morbit) {
                    let tempHint = '';
                    for (let c of chars) {
                        if (c != '0')
                            tempHint += c
                    }
                    // Update field if a '0' was removed.
                    if (chars.length != tempHint.length)
                        updateHint = true;
                    chars = tempHint
                }

                this.markUndo('hint');
                if (this.setHint(chars) || updateHint) {
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