import { cloneObject, StringMap } from '../common/ciphercommon';
import { IScoreInformation, ITestQuestionFields, ITestType, toolMode, } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { htmlToElement } from '../common/htmldom';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';
const knightstemplarimg = require('../images/knights-templar-letters.svg');

/**
 * CipherKnightsTemplarEncoder - This class handles all of the actions associated with encoding
 * a KnightsTemplar cipher.
 */
export class CipherKnightsTemplarEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#KnightsTemplar';
    public cipherName = 'Knights Templar'


    public validTests: ITestType[] = [ITestType.None, ITestType.aregional];
    public defaultstate: IEncoderState = {
        cipherString: '',
        cipherType: ICipherType.KnightsTemplar,
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
        this.validateQuestion();
        $('#answer')
            .empty()
            .append(this.build())
            .append(this.genSolution(ITestType.None));

        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        const len = this.state.cipherString.length;
        const result: ITestQuestionFields = {
            version: 2,
            answer: this.repeatStr(' ', len),
            notes: '',
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
        const revRepl: StringMap = {};
        // Build a normal replacement map so that we can encode the string
        const charset = this.getSourceCharset();
        for (const c of charset) {
            revRepl[c] = c;
        }
        return revRepl;
    }
    /**
      * Generate the recommended score and score ranges for a cipher
     * @returns Computed score ranges for the cipher and text description
      */
    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)
        let suggested = Math.round(qdata.unique * 1.5 + qdata.len)
        const min = Math.max(suggested - 5, 0)
        const max = suggested + 5
        suggested += Math.round(10 * Math.random()) - 5;
        let text = ''
        let rangetext = ''
        if (max > min) {
            rangetext = ` (From a range of ${min} to ${max})`
        }
        if (qdata.len < 15) {
            text = `<p><b>WARNING:</b> <em>There are only ${qdata.len} characters in the quote, we recommend at least 20 characters for a good quote</em></p>`
        }
        if (qdata.len > 2) {
            text += `<p>There are ${qdata.len} characters in the quote, ${qdata.unique} of which are unique.
             We suggest you try a score of ${suggested}${rangetext}</p>`
        }
        return { suggested: suggested, min: min, max: max, text: text }
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        this.genAlphabet();
        let width = 40;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 29;
            extraclass = ' atest';
        }
        const strings = this.makeReplacement(this.state.cipherString, width);
        const table = new JTTable({
            class: 'ansblock shrink cell unstriped ktemplar' + extraclass,
        });
        const tosolve = 0;
        const toanswer = 1;
        for (const strset of strings) {
            this.addCipherTableRows(table, undefined, strset[tosolve], strset[toanswer], true);
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        // Determine the solution array of characters based on genAnswer()'
        let cipherString = '';
        for (const c of this.state.cipherString) {
            if (this.isValidChar(c.toUpperCase())) {
                cipherString += c;
            }
        }
        let solution = cipherString.toUpperCase().split('');

        const cleanAnswer: string[] = [];
        // Remove spaces from the answer, because the solution has no spaces.
        // We need to pull out what they actually answered.
        for (const i in answer) {
            if (answer[i] !== ' ' && answer[i] !== '') {
                cleanAnswer.push(answer[i]);
            }
        }

        // Pad the answer to match the solution length
        while (cleanAnswer.length < solution.length) {
            cleanAnswer.push(' ');
        }

        return this.calculateScore(solution, cleanAnswer, this.state.points);
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
        let width = 40;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 29;
            extraclass = ' atest';
        }
        let pos = 0;
        const strings = this.makeReplacement(this.state.cipherString, width);

        const table = new JTTable({ class: 'SOLVER ansblock ktemplar' + extraclass });
        for (const strset of strings) {
            const qrow = table.addBodyRow();
            const arow = table.addBodyRow();
            const erow = table.addBodyRow();
            erow.add({
                settings: { class: 'q v ' + extraclass },
                content: $('<span/>').html('&nbsp;'),
            });
            for (const c of strset[tosolve]) {
                const extraclass = '';
                const spos = String(pos);
                qrow.add({ settings: { class: 'q v' }, content: c });
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
                    arow.add(' ');
                }
                pos++;
            }
        }
        result.append(table.generate());

        result.append($('<textarea/>', { id: 'in' + String(qnum + 1), class: 'intnote' }));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        let width = 40;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 30;
            extraclass = ' atest';
        }
        const strings = this.makeReplacement(this.state.cipherString, width);
        const table = new JTTable({
            class: 'ansblock shrink cell unstriped ktemplar' + extraclass,
        });
        let tosolve = 0;
        if (this.state.operation === 'encode') {
            tosolve = 1;
        }
        for (const strset of strings) {
            this.addCipherTableRows(table, undefined, strset[tosolve], undefined, true);
        }
        result.append(table.generate());
        return result;
    }
    public genSolution(testType: ITestType): JQuery<HTMLElement> {

        const content = htmlToElement(
            `<div>
            <h3>How to Solve</h3>
                <p>
                First you want to create the lookup table by drawing the 2 sets of three cross pieces and an X between the two sets.
                Each set will have 4 triangle pieces arranged around a center point. 
                The outside edge of the tringle will open for the first of each set, a single line for the second of each set,
                and a two line angle for the last of each set.  It might be easy to remember this as 0, 1, or 2 lines one the outside of each set.
                For the second set, you will want to put a dot in each of the triangles.
                </p>
                <p>
                Next you want to fill out the letters of the alphabet around the triangle pieces starting at the top for the first set going clockwise for all the sets
                except for the 2<sup>nd</sup> and the last.  For the 2<sup>nd</sup> the order is left, right, top, bottom, and for the last set the order is bottom, top, right, left.
                The only other thing to remember when placing the letters is that I/J are on the same triangle and N goes with the X.
                It is also useful to remember the top 6 letters: A H I O S X as a sanity check that it is constructed correctly
                </p>
                <p>
                When you are done, it should look like this:
                </p>
                <div class="ktemplarsvg">
                  ${knightstemplarimg}
                </div>
                <p>
                Once you have built the decode table, simply look up the symbol in the table and use the corresponding letter.
                </p>
                </div>
                `
        );

        return $(content as HTMLElement);
    }
}
