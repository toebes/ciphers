import { cloneObject, makeFilledArray, StringMap } from '../common/ciphercommon';
import { IScoreInformation, ITestQuestionFields, ITestType, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState } from './cipherencoder';
const tapcode = require('../images/tapcode.png');
/**
 * CipherTapCodeEncoder - This class handles all of the actions associated with encoding
 * a TapCode cipher.
 */
export class CipherTapCodeEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#TapCode';

    public validTests: ITestType[] = [ITestType.None,
    ITestType.aregional];

    public maxEncodeWidth: number = 65;
    /**
     * Generates an HTML representation of a string for display.  Replaces the X, O and -
     * with more visible HTML equivalents
     * str String to normalize (with - X and O representing morese characters)
    */
    public normalizeHTML(str: string): string {
        return str
            .replace(/O/g, "&#9679;")
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
    public state: IEncoderState = cloneObject(
        this.defaultstate
    ) as IEncoderState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
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
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);
        let len = 0;
        for (let strset of strings) {
            len += strset[0].length;
        }
        let result: ITestQuestionFields = {
            answer: makeFilledArray(len, " "),
            notes: "",
            separators: makeFilledArray(len, " ")
        };
        return result;
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
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
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);
        let tosolve = 0;
        for (let strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'TOSOLVEQ',
                }).html(this.normalizeHTML(strset[tosolve]))
                    .append($("<br/>"))
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
        let tosolve = 0;
        let toanswer = 1;
        for (let strset of strings) {
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
        let qnumdisp = String(qnum + 1);
        let idclass = "I" + qnumdisp + "_";
        let result = $('<div/>', { id: "Q" + qnumdisp });
        let tosolve = 0;
        let pos = 0;
        let spcclass = "S" + qnumdisp + "_";
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);
        let extraclass = '';
        if (testType === ITestType.aregional) {
            extraclass = ' atest';
        }

        let table = new JTTable({ class: "SOLVER ansblock tapcode" + extraclass });
        for (let strset of strings) {
            let qrow = table.addBodyRow();
            let arow = table.addBodyRow();
            for (let c of strset[tosolve]) {
                let spos = String(pos);
                let extraclass = "S" + spos;

                let field = $("<span/>").html(this.normalizeHTML(c))
                    .append($("<div/>", { class: "ir", id: spcclass + spos }).html("&#711;"));

                qrow.add({ settings: { class: "q v " + extraclass }, content: field });
                if (this.isValidChar(c)) {
                    arow.add({
                        settings: { class: extraclass }, content: $("<input/>", {
                            id: idclass + spos,
                            class: "awc",
                            type: "text",
                        })
                    });
                }
                else {
                    arow.add({ settings: { class: "q v " + extraclass }, content: " " });
                }
                pos++;
            }
        }
        result.append(table.generate());

        result.append($("<textarea/>", { id: "in" + String(qnum + 1), class: "intnote" }));
        return result;
    }
    /**
     * Generate the score of an answered cipher
     * @param answerlong - the array of characters from the interactive test.
     */
    public genScore(answerlong: string[]): IScoreInformation {
        // Get what the question layout was so we can extract the answer
        let strings = this.makeReplacement(
            this.state.cipherString,
            this.maxEncodeWidth);

        let solution: string[] = [];
        let answer: string[] = [];
        let anslen: number[] = [];
        let plainTextSlot = 1;
        let cipherTextSlot = 0;
        let lastc = "";
        let explen = 0;
        let tokens = 0;

        // Figure out what the expected answer should be
        for (let splitLines of strings) {
            for (let i = 0; i < splitLines[plainTextSlot].length; i++) {
                let p = splitLines[plainTextSlot].substr(i, 1);
                let c = splitLines[cipherTextSlot].substr(i, 1);
                if (this.isValidChar(p)) {
                    solution.push(p);
                }
                if (c !== lastc) {
                    if (lastc === "O") {
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
        for (let i in answerlong) {
            if (answerlong[i] !== " " && answerlong[i] !== "") {
                // Figure out how many spaces we happened to have missed in the meantime
                while (answer.length < anslen[i]) {
                    answer.push(" ");
                }
                answer.push(answerlong[i]);
            }
        }
        // Pad the answer to match the solution length
        while (answer.length < explen) {
            answer.push(" ");
        }
        // And let calculateScore do all the heavy lifting
        return this.calculateScore(solution, answer, this.state.points);
    }
    /**
     * Generate the HTML to display the solution for a cipher
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        result.append($("<h3/>").text("How to Solve"));
        result.append($("<p/>").text("First you want to create the lookup table " +
            "by drawing a grid with 5 horizontal and 5 vertical lines. " +
            "Then fill in the top with the numbers 1 through 5 and the same on the " +
            "left side of the grid.  Finally fill in the letters from left to right " +
            "and then down, remembering to skip the letter K. " +
            "Once you have filled in all 25 cells, go back and add K to the cell " +
            "with C in it giving you a table like:"));
        result.append($("<img/>", { src: tapcode }));
        result.append($("<p/>").text("Then go through the cipher text and put " +
            "a mark between each two groups of dots. " +
            "To decode, count the number of dots in the first group to pick the " +
            "row in the table and the number of dots in the second group to pick " +
            "the column and read the letter. " +
            "Only when you have a single dot followed by three dots " +
            "(which corresponds to the letter C) do you have to decide whether the " +
            "letter should be a C or K"));
        return result;
    }
}
