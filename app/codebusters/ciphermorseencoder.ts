import { CipherEncoder } from './cipherencoder';
import { JTButtonItem } from '../common/jtbuttongroup';
import { IScoreInformation, ITestQuestionFields, ITestType } from '../common/cipherhandler';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { ICipherType } from '../common/ciphertypes';
import { JTTable } from '../common/jttable';

export const morseindex = 1;
export const ctindex = 0;
export const ptindex = 2;
export class CipherMorseEncoder extends CipherEncoder {
    public usesMorseTable = true;
    public cipherName = 'Morse';
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        { title: 'Randomize', color: 'primary', id: 'randomize' },
        this.undocmdButton,
        this.redocmdButton,
        this.guidanceButton,
    ];

    /**
     * Initializes the encoder/decoder.
     * Select the character sets based on the language and initialize the
     * current state
     */
    public init(lang: string): void {
        super.init(lang);
        this.setSourceCharset('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    }
    /**
      * getInteractiveTemplate creates the answer template for synchronization of
      * the realtime answers when the test is being given.
      * @returns Question arrays to be used at runtime
      */
    public getInteractiveTemplate(): ITestQuestionFields {
        const result = super.getInteractiveTemplate();
        // Each cipher character corresponds to 2 symbols consisting of dots, dashes or xes characters
        const strings: string[][] = this.makeReplacement(
            this.state.cipherString,
            9999 /*this.maxEncodeWidth*/
        );
        const encodedString = strings[ctindex];
        const anslen = encodedString[0].length;

        result.version = 2;
        // We need an answer, separators and replacement boxes for each morse character pair worth
        // We can use the optimized string version since each entry is a single character
        result.answer = this.repeatStr(' ', anslen);
        result.separators = this.repeatStr(' ', anslen);
        result.replacements = this.repeatStr(' ', anslen);
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
        let hinttext = 'Hint Digits';
        if (this.state.cipherType === ICipherType.FractionatedMorse) {
            hinttext = 'Crib';
        }
        const questionText = this.state.question.toUpperCase();
        if (this.state.operation === 'decode') {
            // Look to see if the Hint Digits appear in the Question Text
            let notfound = '';
            if (this.state.hint === undefined || this.state.hint === '') {
                msg = 'No ' + hinttext + ' provided';
            } else {
                for (const c of this.state.hint) {
                    if (questionText.indexOf(c) < 0) {
                        notfound += c;
                    }
                }
                if (notfound !== '') {
                    if (notfound.length === 1) {
                        msg =
                            'The ' + hinttext + ' ' +
                            notfound +
                            " doesn't appear to be mentioned in the Question Text.";
                    } else {
                        msg =
                            'The ' + hinttext + ' ' +
                            notfound +
                            " don't appear to be mentioned in the Question Text.";
                    }
                    showsample = true;
                }
            }
        } else {
            // Look to see if the crib appears in the quesiton text
            const crib = this.minimizeString(this.state.crib);
            if (questionText.indexOf(crib) < 0) {
                msg =
                    'The Crib Text ' +
                    this.state.crib +
                    " doesn't appear to be mentioned in the Question Text.";
                showsample = true;
            }
        }
        if (showsample) {
            sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');
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
        $('#hint').val(this.state.hint);
        $('#crib').val(this.state.crib);
        JTRadioButtonSet('operation', this.state.operation);
        super.updateOutput();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);
        const radiobuttons = [
            { id: 'mrow', value: 'decode', title: 'Decode' },
            { id: 'crow', value: 'crypt', title: 'Cryptanalysis' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));
        result.append(this.createQuestionTextDlg());
        this.genQuestionFields(result);
        this.genEncodeField(result);
        return result;
    }
    public addHintCrib(result: JQuery<HTMLElement>): void {
        let hinttitle = 'Hint Digits';
        if (this.state.cipherType === ICipherType.FractionatedMorse) {
            hinttitle = 'Crib'
        }
        result.append(
            JTFLabeledInput(
                hinttitle,
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
            .replace(/O/g, '&#9679;')
            .replace(/-/g, '&ndash;')
            .replace(/X/g, '&times;');
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genAlphabet();
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);

        for (const strset of strings) {
            const ctext = strset[ctindex].replace(/ /g, '&nbsp;&nbsp;');
            result.append(
                $('<div/>', {
                    class: 'TOSOLVEQ',
                })
                    .html(ctext)
                    .append($('<br/><br/>'))
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
        const strings = this.makeReplacement(this.getEncodingString(), this.maxEncodeWidth);

        const solution: string[] = [];
        const morse: string[] = [];
        const answer: string[] = [];
        let lastc = ''

        // Figure out what the expected answer should be
        for (const splitLines of strings) {
            for (const c of splitLines[ptindex]) {
                if (this.isValidChar(c)) {
                    solution.push(c);
                }
            }
            for (const c of splitLines[morseindex]) {
                morse.push(c);
                lastc = c
            }
        }
        // Make sure that we end with an X
        if (lastc !== 'X') {
            morse.push('X')
        }
        // We need to pull out what they actually answered.  Essentially
        // If they answered anything, we will include it.  It basically lets
        // them put in characters for answer together but limits them to put just one
        // answer character anywhere under the cipher character.

        // Additional details.
        // Only count characters that are within the morse code representation of the character
        // (including the 'X' letter delimiter, but excluding a second 'X' word delimiter).
        // If there is more than one character under a morse code representation, that is
        // a decode error and will be marked incorrect.  If that character is the decode for the
        // next morse letter, that one will likely be incorrect, too!
        // So an 'E' must be in one of 2 locations (under the '.' or under the 'x') or it
        // will be marked incorrect.  Longer morse representations have more room for an answer.
        // E.g.  . = 1,2,3; - = 4,5,6; x = 7,8,9,0   Plain text: "I AM",
        //     Cipher text:   127834956
        //           Morse:  '..xx.-X--'
        //         Correct:  'I___A__M_'
        //    Also correct:  '_I____A_M'
        //       Incorrect:  '_I_A___M_'   # 'A' is on word marker and incorrect.
        //  Also incorrect:  '__I_A_M__'   # 'M' is on the letter marker for 'A', so incorrect.
        //  Also incorrect:  '__I_AM___'   # '.-x' decodes to 'A', not 'AM'.  so incorrect.
        //                                   '--' is not decoded under the corresponding morse
        //                                   characters, so also incorrect.
        let answerIndex = 0;
        for (const solutionLetter of solution) {
            const solutionPattern = new RegExp('( *' + solutionLetter + '.*)', 'g');
            // +1 to include the 'X' position.
            const endIndex = morse.indexOf('X', answerIndex) + 1;
            // If you have two Xs in a row, we need to skip the second one when we work on the new word.
            let newWordIndex = 0;
            if (morse[endIndex] === 'X') {
                newWordIndex = 1;
            }

            const answerSubstring = answerlong.slice(answerIndex, endIndex).join('');
            let match = solutionPattern.exec(answerSubstring);
            if (match != null && match[0] != null && match[0].trim() === solutionLetter) {
                // console.log('### Solution: '+ solutionLetter + ' == answer: '+match[0]+' They match perfectly!');
                // The morse was successfully decoded.
                answer.push(match[0].trim());
            }
            else {
                // const matchMsg = (match != null ? ((match[0] != null)? match[0]: answerSubstring + ' (match[0] is null)') : answerSubstring + ' (match is null)');
                // console.log('$$$ No match: '+solutionLetter+' == answer: '+matchMsg);
                // console.log('    beginIndex: '+ answerIndex+ ' endIndex+1: '+endIndex);
                // The morse was not decoded correctly, or there is more than one character in the field.
                answer.push(' ');
            }
            answerIndex = endIndex + newWordIndex;
        }

        // Pad the answer to match the solution length
        while (answer.length < solution.length) {
            answer.push(' ');
        }
        // And let calculateScore do all the heavy lifting
        return this.calculateScore(solution, answer, this.state.points);
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
        return result;
    }

    /**
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        const qnumdisp = String(qnum + 1);
        const result = $('<div/>', { id: 'Q' + qnumdisp });
        const strings = this.makeReplacement(this.getEncodingString(), 35 /*this.maxEncodeWidth */);
        const table = new JTTable({ class: 'ansblock cipherint baconian SOLVER' });
        let pos = 0;
        const inputidbase = 'I' + qnumdisp + '_';
        const spcidbase = 'S' + qnumdisp + '_';
        const workidbase = 'R' + qnumdisp + '_';
        for (const splitLines of strings) {
            const cipherline = splitLines[ctindex];
            // We need to generate a row of lines for each split up cipher text
            // The first row is the cipher text
            const rowcipher = table.addBodyRow();
            // followed by the replacement characters that they can use for trackign the baconian letters
            const rowunder = table.addBodyRow();
            // With boxes for the answers.  Note that we give them 2 boxes so they can put the answer in
            // any of them (or somewhere close to it)
            const rowanswer = table.addBodyRow();
            // With a blank row at the bottom
            const rowblank = table.addBodyRow();
            for (const c of cipherline) {
                // The word baconian only needs blocks under the valid characters but the
                // others get blocks under every character (since there is no restriction on
                // what the cipher characters can be)
                if (this.isValidChar(c) || c === ' ') {
                    // We need to identify the cells which get the separator added/removed as a set
                    const spos = String(pos);
                    const sepclass = ' S' + spos;
                    // We have a clickable field for the separator character.  It is basically an
                    // upside down caret that is a part of the cipher text field
                    const field = $('<div/>')
                        .append($('<div/>', { class: 'ir', id: spcidbase + spos }).html('&#711;'))
                        .append(c);
                    rowcipher.add({ settings: { class: 'q v ' + sepclass }, content: field });
                    // We have a box for them to put whetever baconian substitution in that they want
                    rowanswer.add({
                        celltype: 'td',
                        content: $('<input/>', {
                            id: inputidbase + spos,
                            class: 'awc',
                            type: 'text',
                        }),
                        settings: { class: 'e v' + sepclass },
                    });
                    // And lastly we have a spot for the answer.  Note that we actually have
                    // five spots per baconian character, but they really should only be filling in one.
                    rowunder.add({
                        celltype: 'td',
                        content: $('<input/>', {
                            id: workidbase + spos,
                            class: 'awr',
                            type: 'text',
                        }).attr('isMorse', '1'),
                        settings: { class: sepclass },
                    });
                    pos++;
                } else {
                    // Not a character to edit, so just leave a blank column for it.
                    rowcipher.add(c);
                    rowanswer.add(c);
                    rowunder.add(' ');
                }
                // And of course we need a blank line between rows
                rowblank.add({ settings: { class: 's' }, content: ' ' });
            }
        }
        result.append(table.generate());
        result.append($('<textarea/>', { id: 'in' + String(qnum + 1), class: 'intnote' }));
        return result;
    }

    /**
     * Generates a displayable state of the current known decoding
     * @param working Current mapping strings
     * @returns HTML of output text
     */
    public genMapping(result: JQuery<HTMLElement>, working: string[][]): void {
        const ansdiv = $('<div/>');

        for (const strset of working) {
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
        let cribRegex = '';
        let plainText = '';
        let cipherText = '';
        let notLetters = '###';

        // Get cipher text and plain text all in one string
        for (const strset of strings) {
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
            cribRegex += crib.substring(i, i + 1) + notLetters;
        }
        const regex = new RegExp(cribRegex, 'g');
        const match = regex.exec(plainText);
        // If the crib wasn't found, then tell them so
        if (match === null) {
            return ""
        }
        // The indexes are directly corresponding between letter location and cipher text.
        const cipherCrib = cipherText.substr(match.index, match[0].length);
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

        result.append($('<h3/>').text('How to solve'));
        if (this.state.operation === 'crypt') {
            // The CRIB should be at least 4 characters
            if (this.state.crib === undefined || this.state.crib.length < 4) {
                result.append(
                    $('<h4/>').text('At least 4 crib characters are needed to generate a solution')
                );
                this.setErrorMsg('The crib should be at least 4 characters', 'mchc');
                return undefined;
            }
            const bighint = this.findCrib(strings, this.minimizeString(this.state.crib));
            if (bighint === '') {
                msg = 'Unable to find placement of the crib';
                result.append(
                    $('<h4/>').text('Unable to find placement of the crib: ' + this.state.crib)
                );
            } else {
                // Clean up the crib characters eliminating any dups.
                hint = '';
                for (const c of bighint) {
                    if (hint.indexOf(c) < 0) {
                        hint += c;
                    }
                }
                result.append(
                    'With the crib of ' +
                    this.state.crib +
                    ' mapped to the ciphertext ' +
                    bighint +
                    ' we now know the mapping of ' +
                    String(hint.length) +
                    ' characters. '
                );
            }
        } else if (hint.length < 4) {
            msg = 'There need to be at least 4 Hint Digits (6 is expected for a test)';
        }
        result.append(
            'Since we are told the mapping of ' +
            hint +
            ' ciphertext, we can build the following table:'
        );

        this.setErrorMsg(msg, 'mchc');
        if (hint.length < 4) {
            result.append(
                $('<h4/>').text(
                    'At least 4 Hint Digits are needed to automatically generate a solution'
                )
            );
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
            .on('input', (e) => {
                let chars = $(e.target).val() as string;

                let updateHint = false;
                // '0' can not be a hint digit in Morbit, so if it was entered, remove it...
                if (this.state.cipherType === ICipherType.Morbit) {
                    let tempHint = '';
                    for (const c of chars) {
                        if (c != '0') tempHint += c;
                    }
                    // Update field if a '0' was removed.
                    if (chars.length != tempHint.length) updateHint = true;
                    chars = tempHint;
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
