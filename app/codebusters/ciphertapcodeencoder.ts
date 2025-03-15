import { cloneObject, StringMap } from '../common/ciphercommon';
import {
    IScoreInformation,
    ITestQuestionFields,
    ITestType,
    QuoteRecord,
    toolMode,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';
import tapcode = require('../images/tapcode.png');
/**
 * CipherTapCodeEncoder - This class handles all of the actions associated with encoding
 * a TapCode cipher.
 */
export class CipherTapCodeEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#TapCode';
    public cipherName = 'Tap Code'

    public validTests: ITestType[] = [ITestType.None, ITestType.aregional];

    public maxEncodeWidth = 65;
    /**
     * Generates an HTML representation of a string for display.  Replaces the X, O and -
     * with more visible HTML equivalents
     * str String to normalize (with - X and O representing morese characters)
     */
    public normalizeHTML(str: string): string {
        return str.replace(/O/g, '&#9679;');
    }

    public readonly TapCodeMap: StringMap = {
        A: 'O O ',
        B: 'O OO ',
        C: 'O OOO ',
        D: 'O OOOO ',
        E: 'O OOOOO ',
        F: 'OO O ',
        G: 'OO OO ',
        H: 'OO OOO ',
        I: 'OO OOOO ',
        J: 'OO OOOOO ',
        K: 'O OOO ',
        L: 'OOO O ',
        M: 'OOO OO ',
        N: 'OOO OOO ',
        O: 'OOO OOOO ',
        P: 'OOO OOOOO ',
        Q: 'OOOO O ',
        R: 'OOOO OO ',
        S: 'OOOO OOO ',
        T: 'OOOO OOOO ',
        U: 'OOOO OOOOO ',
        V: 'OOOOO O ',
        W: 'OOOOO OO ',
        X: 'OOOOO OOO ',
        Y: 'OOOOO OOOO ',
        Z: 'OOOOO OOOOO ',
    };
    public defaultstate: IEncoderState = {
        cipherString: '',
        cipherType: ICipherType.TapCode,
        replacement: {},
    };
    public state: IEncoderState = cloneObject(this.defaultstate) as IEncoderState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];
    /** Save and Restore are done on the CipherEncoder Class */

    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        this.genAlphabet();
        this.showLengthStatistics();
        $('#answer')
            .empty()
            .append(this.build())
            .append(this.genSolution(ITestType.None));
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);
        let len = 0;
        for (const strset of strings) {
            len += strset[0].length;
        }
        const result: ITestQuestionFields = {
            version: 2,
            answer: this.repeatStr(' ', len),
            notes: '',
            separators: this.repeatStr(' ', len),
        };
        return result;
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);
        this.genQuestionFields(result);
        this.genEncodeField(result);
        return result;
    }
    public getReverseReplacement(): StringMap {
        return this.TapCodeMap;
    }
    /**
     * Fills in the frequency portion of the frequency table.  For the Ragbaby
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void { }
    /**
     * Generates the sample question text for a cipher
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {
        const hint = this.genSampleHint();
        let hinttext = hint !== undefined ? ` You are told that ${hint}` : '';
        return (
            `<p>The following symbols represent a quote${this.genAuthor()} which has been encoded using the
             ${this.cipherName} Cipher for you to decode.${hinttext}</p>`
        );
    }
    /**
     * Generate the recommended score and score ranges for a cipher
     * @returns Computed score ranges for the cipher
     */
    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)
        const strings = this.makeReplacement(this.state.cipherString, 999);
        let text = ''
        let taps = ""
        if (strings.length > 0) {
            taps = (strings[0][0]).replace(/ +/g, '')
        }
        const min = 10 + Math.round(0.25 * taps.length)
        const max = 10 + Math.round(0.35 * taps.length)
        const variability = (max - min) / 2
        let suggested = 10 + Math.round(1.6 * qdata.len + (Math.random() * variability) - variability / 2)

        suggested = Math.max(min, Math.min(suggested))
        let rangetext = ''
        if (max > min) {
            rangetext = ` (From a range of ${min} to ${max})`
        }
        if (qdata.len < 15) {
            text = `<p><b>WARNING:</b> <em>There are only ${qdata.len} characters in the quote, we recommend at least 20 characters for a good quote</em></p>`
        }
        if (qdata.len > 2) {
            text += `<p>There are ${qdata.len} characters in the quote, resulting in ${taps.length} taps in total.
              We suggest you try a score of ${suggested}${rangetext}</p>`
        }

        return { suggested: suggested, min: min, max: max, text: text }
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);
        const tosolve = 0;
        for (const strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVEQ',
                })
                    .html(this.normalizeHTML(strset[tosolve]))
                    .append($('<br/>'))
            );
        }
        return result;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);
        const tosolve = 0;
        const toanswer = 1;
        for (const strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVE',
                }).html(this.normalizeHTML(strset[tosolve]))
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
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        const qnumdisp = String(qnum + 1);
        const idclass = 'I' + qnumdisp + '_';
        const result = $('<div/>', { id: 'Q' + qnumdisp });
        const tosolve = 0;
        let pos = 0;
        const spcclass = 'S' + qnumdisp + '_';
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);
        let extraclass = '';
        if (testType === ITestType.aregional) {
            extraclass = ' atest';
        }

        const table = new JTTable({ class: 'SOLVER ansblock tapcode' + extraclass });
        for (const strset of strings) {
            const qrow = table.addBodyRow();
            const arow = table.addBodyRow();
            const erow = table.addBodyRow();
            erow.add({
                settings: { class: 'q v ' + extraclass },
                content: $('<span/>').html('&nbsp;'),
            });
            for (const c of strset[tosolve]) {
                const spos = String(pos);
                const extraclass = 'S' + spos;

                const field = $('<span/>')
                    .html(this.normalizeHTML(c))
                    .append($('<div/>', { class: 'ir', id: spcclass + spos }).html('&#711;'));

                qrow.add({ settings: { class: 'q v ' + extraclass }, content: field });
                if (this.isValidChar(c)) {
                    arow.add({
                        settings: { class: extraclass },
                        content: $('<input/>', {
                            id: idclass + spos,
                            class: 'awc',
                            type: 'text',
                        }),
                    });
                } else {
                    arow.add({ settings: { class: extraclass }, content: ' ' });
                }
                pos++;
            }
        }
        result.append(table.generate());

        result.append($('<textarea/>', { id: 'in' + String(qnum + 1), class: 'intnote' }));
        return result;
    }
    /**
     * Generate the score of an answered cipher
     * @param answerlong - the array of characters from the interactive test.
     */
    public genScore(answerlong: string[]): IScoreInformation {
        // Get what the question layout was so we can extract the answer
        const strings = this.makeReplacement(this.state.cipherString, this.maxEncodeWidth);

        const solution: string[] = [];
        const answer: string[] = [];
        const anslen: number[] = [];
        const plainTextSlot = 1;
        const cipherTextSlot = 0;
        let lastc = '';
        let explen = 0;
        let tokens = 0;

        // Figure out what the expected answer should be
        for (const splitLines of strings) {
            for (let i = 0; i < splitLines[plainTextSlot].length; i++) {
                const p = splitLines[plainTextSlot].substring(i, i + 1);
                const c = splitLines[cipherTextSlot].substring(i, i + 1);
                if (this.isValidChar(p)) {
                    solution.push(p);
                }
                if (c !== lastc) {
                    if (lastc === 'O') {
                        tokens++;
                        explen = Math.trunc(tokens / 2);
                    }
                    lastc = c;
                }
                anslen.push(explen);
            }
        }
        // We need to pull out what they actually answered.  Essentially
        // If they answered anything, we will include it.  But if we manage
        // to go more than 5 blank characters past where we were expecting an
        // answer then we will force in a blank for them.  It basically lets
        // them put in characters for answer together but also allows them to put the
        // answer character anywhere in the 5 blocks under the cipher character
        for (const i in answerlong) {
            if (answerlong[i] !== ' ' && answerlong[i] !== '') {
                // Figure out how many spaces we happened to have missed in the meantime
                while (answer.length < anslen[i]) {
                    answer.push(' ');
                }
                answer.push(answerlong[i]);
            }
        }
        // Pad the answer to match the solution length
        while (answer.length < explen) {
            answer.push(' ');
        }
        // And let calculateScore do all the heavy lifting
        return this.calculateScore(solution, answer, this.state.points);
    }
    /**
     * Generate the HTML to display the solution for a cipher
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        result.append($('<h3/>').text('How to Solve'));
        result.append(
            $('<p/>').text(
                'First you want to create the lookup table ' +
                'by drawing a grid with 5 horizontal and 5 vertical lines. ' +
                'Then fill in the top with the numbers 1 through 5 and the same on the ' +
                'left side of the grid.  Finally fill in the letters from left to right ' +
                'and then down, remembering to skip the letter K. ' +
                'Once you have filled in all 25 cells, go back and add K to the cell ' +
                'with C in it giving you a table like:'
            )
        );
        result.append($('<img/>', { src: tapcode }));
        result.append(
            $('<p/>').text(
                'Then go through the cipher text and put ' +
                'a mark between each two groups of dots. ' +
                'To decode, count the number of dots in the first group to pick the ' +
                'row in the table and the number of dots in the second group to pick ' +
                'the column and read the letter. ' +
                'Only when you have a single dot followed by three dots ' +
                '(which corresponds to the letter C) do you have to decide whether the ' +
                'letter should be a C or K'
            )
        );
        return result;
    }
}
