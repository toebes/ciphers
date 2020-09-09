import {cloneObject, StringMap, sanitizeString, makeFilledArray} from '../common/ciphercommon';
import {IState, ITestQuestionFields, ITestType, toolMode} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { CipherEncoder, IEncoderState } from './cipherencoder';
import { JTFIncButton } from '../common/jtfIncButton';
import {JTTable} from "../common/jttable";


interface IRailFenceState extends IState {
    /** Railfence railss value */
    rails: number;
    isRailRange: boolean;
}

/**
 * CipherRailFenceEncoder - This class handles all of the actions associated with encoding
 * a RailFence cipher.
 */
export class CipherRailFenceEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public cipherName = 'Rail Fence';

    public guidanceURL: string = 'TestGuidance.html#RailFence';

    public validTests: ITestType[] = [ITestType.None,
    ITestType.bregional, ITestType.bstate];

    public defaultstate: IRailFenceState = {
        cipherString: '',
        cipherType: ICipherType.Railfence,
        rails: 2,
        isRailRange: false,
        replacement: {},
    };
    public state: IRailFenceState = cloneObject(
        this.defaultstate
    ) as IRailFenceState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.guidanceButton,
    ];
    /** Save and Restore are done on the CipherEncoder Class */

    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        let rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, this.state.cipherString);
        let strings: string[][] = this.makeReplacement(rfs.getRailFenceEncoding(), this.state.cipherString.length);
        let cipherString = strings[0];
        let len = cipherString[0].length;
        let result: ITestQuestionFields = {
            answer: makeFilledArray(len, " "),
            replacements: makeFilledArray(6 * len, " "),
            separators: makeFilledArray(len, " "),
            notes: "",
        };
        return result;
    }

    /**
 * Determines if this generator is appropriate for a given test
 * type.  For Division A, the Caesar is limited to an offset +- 3
 * @param testType Test type to compare against
 * @returns String indicating error or blank for success
 */
    public CheckAppropriate(testType: ITestType): string {
        let result = super.CheckAppropriate(testType);
        if (result === '' && testType !== undefined) {
            // Additional checks are TBD
        }
        return result;
    }


    /**
     * Set the number of rail fence rails.
     * @param rails The number of rails selected on the spinner.
     */
    public setRails(rails: number): boolean {
        let changed = false;
        if (rails !== this.state.rails) {
            // TODO: the min and max should probably be made to CONSTANTS.
            if (rails >= 2 && rails <= 6) {
                this.state.rails = rails;
                changed = true;
            }
            else {
                $('#err').text(
                    'The number of rails must be between 2 and 6.'
                );
            }
        }
        return changed;
    }
    public toggleRailRange(): void {
        this.state.isRailRange = !this.state.isRailRange;
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        this.validateQuestion();
        let res = this.build();
        $('#answer')
            .empty()
            .append(res);

        res = this.genSolution(ITestType.None);
        $('#sol')
            .empty()
            .append('<hr/>')
            .append(res);

        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }

    setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }

    public validateQuestion(): void {
        let msg = '';
        let showsample = false;
        let sampleLink: JQuery<HTMLElement> = undefined;
        let questionText = this.state.question.toUpperCase();
        let rails = this.state.rails.toString();

        if (this.state.isRailRange) {

        } else {
            if (questionText.indexOf(rails) < 0) {
                msg = "The number (" + rails + ") of rails does not appear to be mentioned in the Question Text."
                showsample = true;
            }
        }

        // if (this.state.rails === 'decode') {
        //     // Look to see if the Hint Digits appear in the Question Text
        //     let notfound = '';
        //     if (this.state.hint === undefined || this.state.hint === '') {
        //         msg = "No Hint Digits provided";
        //     } else {
        //         for (let c of this.state.hint) {
        //             if (questionText.indexOf(c) < 0) {
        //                 notfound += c;
        //             }
        //         }
        //         if (notfound !== '') {
        //             if (notfound.length === 1) {
        //                 msg = "The Hint Digit " + notfound +
        //                     " doesn't appear to be mentioned in the Question Text.";
        //             } else {
        //                 msg = "The Hint Digits " + notfound +
        //                     " don't appear to be mentioned in the Question Text.";
        //             }
        //             showsample = true;
        //         }
        //     }
        // } else {
        //     // Look to see if the crib appears in the quesiton text
        //     let crib = this.minimizeString(this.state.crib);
        //     if (questionText.indexOf(crib) < 0) {
        //         msg = "The Crib Text " + this.state.crib +
        //             " doesn't appear to be mentioned in the Question Text.";
        //         showsample = true;
        //     }
        // }
        if (showsample) {
            sampleLink = $("<a/>", { class: "sampq" }).
                text(" Show suggested Question Text");
        }
        this.setErrorMsg(msg, 'vq', sampleLink);
    }

    public genSampleHint(): string {
        let rails: string = this.state.rails.toString();
        return rails + ' rails were used to encode it.';

    }

    public attachHandlers(): void {
        super.attachHandlers();
        $('#rails')
            .off('input')
            .on('input', e => {
                let newRails: number = Number($(e.target).val());
                if (newRails !== this.state.rails) {
                    this.markUndo(null);
                    if (this.setRails(newRails)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        $('#isRailRange')
            .off('click')
            .on('click', e => {
                //let isRailRange: boolean = Boolean($(e.target).val());
                this.toggleRailRange();
                this.updateOutput();
            });
    }

    public setUIDefaults(): void {
        this.setRails(this.state.rails);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        $('#rails').val(this.state.rails);
        let v: string = String(this.state.isRailRange);
        $('#isRailRange').val(v);
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        this.genTestUsage(result);
        result.append(this.createQuestionTextDlg());

        this.genQuestionFields(result);
        this.genEncodeField(result);

        // Create a spinner for the number or rails
        let inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',
        });
        inputbox.append(
            JTFIncButton('Rails', 'rails', this.state.rails, 'small-12 medium-4 large-4')
        );
        result.append(inputbox);

        // **********************************************************************************
        // TODO:  The whole check box is for tailoring the solution output for either
        // rails is given or the range of rails is given.  Range of rails is for the state
        // test, so put this on hold for right now....I think we need a handler for the
        // new 'checkbox' input.  The handler would go in ciperhandler.ts, attachHandlers()
        // method.  Then this class will set the boolean isRailRange in its attachHandlers().
        // inputbox = $('<div/>', {
        //     class: 'grid-x grid-margin-x',            
        // });
        // Create a check box to indicate they are not given the number or rails.
        // TODO: unsure of how to get test version and how this will beused.
        // if ('test is div b, state') {
        inputbox.append(
            JTFLabeledInput('Variable rails', 'checkbox', 'isRailRange', this.state.isRailRange, 'small-12 medium-4 large-4')
        );
        result.append(inputbox);
        // }
        // **********************************************************************************
        return result;
    }
    /**
     * Fills in the frequency portion of the frequency table.  For the Rail Fence
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void { }

    public makeReplacement(text: string, maxEncodeWidth: number): string[][] {
        let encodeline = '';
        let lastsplit = -1;
        let result: string[][] = [];

        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (let t of text) {
            // Make sure that this is a valid character to map from
            encodeline += t;
            lastsplit = encodeline.length;
            // See if we have to split the line now
            if (encodeline.length >= maxEncodeWidth) {
                let encodepart = encodeline.substr(0, lastsplit);
                encodeline = encodeline.substr(lastsplit);
                result.push([encodepart]);
            }
        }
        // And put together any residual parts
        if (encodeline.length > 0) {
            result.push([encodeline]);
        }
        return result;
    }

    /**
     * Generate the HTML to display the answer for a cipher.
     * It is just the ciper text formatted with TOANSWER.
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>'/*, { class: 'grid-x' }*/);

        let rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, this.state.cipherString);

        // Get the text characters from each rail, concatenated together
        //result.append($('<p/>').text(rfs.getRailFenceEncoding()));

        let encodedText = $('<div/>', { class: 'TOSOLVE' });
        let strings: string[][] = this.makeReplacement(rfs.getRailFenceEncoding(), 45);
        for (let strset of strings) {
            encodedText.append($('<p/>').text(strset[0]));
        }
        result.append(encodedText);

        result.append(rfs.getRailFenceAnswer());

        let answer = $('<div/>', { class: 'grid-x' });

        let answerString = 'Answer: _';
        if (this.state.cipherString.length === 0) {
            answerString = 'Answer: ______________________________________________';
        }

        let ap1 = $('<span/>', { class: 'TOSOLVE' });
        ap1.append(answerString);
        let ap2 = $('<span/>', { class: 'TOANSWER' });
        ap2.append(this.state.cipherString.toUpperCase());
        let ap3 = $('<span/>', { class: 'TOSOLVE' });
        ap3.append('_');
        ap1.append(ap2, ap3);
        answer.append(ap1);

        // let answer = $('<div/>', { class: 'TOANSWER'});
        // answer.append(this.state.cipherString);

        result.append(answer, '<p/>');

        return result;
    }
    /**
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        let rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, this.state.cipherString);
        let strings: string[][] = this.makeReplacement(rfs.getRailFenceEncoding(), this.state.cipherString.length);
        let qnumdisp = String(qnum + 1);
        let idclass = "I" + qnumdisp + "_";
        let spcclass = "S" + qnumdisp + "_";
        let result = $('<div/>', { id: "Q" + qnumdisp });

        let answerLength = -1;

        // The question text.
        for (let strset of strings) {
            answerLength = strset[0].length;
            result.append($('<div/>', { class: 'TOSOLVE' }).append($('<p/>').text(strset[0])));
        }

        let pos = 0;
        // The rails (we will use the replacement field)
        let railsTable = new JTTable({ class: "SOLVER" });
        for (let i = 0; i < 6; i++ ) {
            let railRow = railsTable.addBodyRow();
            for (let j = 0; j < answerLength; j++) {
                let extraclass = "";
                let spos = String(pos);
                railRow.add({
                    settings: { class: extraclass }, content: $("<input/>",{
                        id: "R" + String(qnum + 1) + "_" + pos,
                        class: "awr",
                        type: "text",
                    }).attr("isRails", "1")
                });
                pos++;
            }
        }
        result.append(railsTable.generate());

        // The answer fields
        result.append($("<p/>").text("Answer:"));
        let answerTable = new JTTable({ class: "SOLVER" });
        let qrow = answerTable.addBodyRow();
        let arow = answerTable.addBodyRow();
        for (let i = 0; i < answerLength; i++) {
            let extraclass = "";
            let spos = String(i);

            extraclass = "S" + spos;
            let field = $("<div/>")
                .append($("<div/>", { class: "ir", id: spcclass + spos }).html("&#711;"))
                .append(" ");
            qrow.add({ settings: { class: "TOSOLVEC " + extraclass }, content: field });

            arow.add({
                settings: { class: extraclass }, content: $("<input/>", {
                    id: idclass + spos,
                    class: "awc",
                    type: "text",
                    })
                });
        }
        result.append(answerTable.generate());

        result.append($("<textarea/>", { id: "in" + String(qnum+1), class: "intnote" }));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'TOSOLVE' });

        let rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, this.state.cipherString);

        // Get the text characters from each rail, concatenated together
        //result.append($('<p/>').text(rfs.getRailFenceEncoding()));

        let strings: string[][] = this.makeReplacement(rfs.getRailFenceEncoding(), 45);
        for (let strset of strings) {
            result.append($('<p/>').text(strset[0]));
        }

        // TODO: I want the 'work space' section to print in the 'Test Packet', not in 
        // 'Answer Key' or 'Answers and Solutions'.
        let workSpace = $('<div/>', { class: 'instructions' });
        for (let i: number = 0; i < 6; i++) {
            workSpace.append($('<p/>').text('\n'));
        }
        result.append(workSpace);

        let answerLine = $('<div/>', { class: 'TOSOLVE' });
        answerLine.append('Answer: _______________________________________________');
        answerLine.append('<p/>');
        result.append(answerLine);

        return result;
    }
    /**
     * Generate the HTML which is the answer to the question.
     */
    public build(): JQuery<HTMLElement> {
        let result = $('<div/>');

        result.append(this.genAnswer(ITestType.None));

        return result;
    }

    /**
     * Generate the HTML that shows the 'W' rail fence solution.
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        let r: number;
        let result = $('<div/>');
        if (this.state.cipherString.length === 0) {
            return result;
        }
        result.append($('<h3/>').text('How to solve'));

        let rails = this.state.rails;

        let rfs: RailFenceSolver = new RailFenceSolver(rails, this.state.cipherString);

        if (this.state.isRailRange) {
            let solutionText = 'To solve this problem for a range of rails, apply the rail fence to decode the first ' +
                'several letters of the cipher text for the possible rails.  Here, we will decode all the letters, ' +
                'starting with 2 rails.';

            let startRail: number = 2;
            let endRail: number = 6;

            let trials = $('<div/>');
            for (let rail = startRail; rail <= endRail; rail++) {
                trials.append($('<h5/>').text("Try " + rail.toString() + " rails..."));
                let testRfs = new RailFenceSolver(rail, rfs.getRailFenceEncoding());
                trials.append(rfs.swizzle(rail));
                //                trials.append(testRfs.getRailFenceT2(rfs.getRailFenceEncoding(), rail));
                if (rail === rails) {
                    break;
                }
            }
            let found = $('<p/>').text('This looks promising, so we conclude ' + rails + ' rails will decode the message.');

            result.append(solutionText, trials, found);

            // we we conclude there are x rails
        }

        let solutionText: string = 'This is how you solve it for ' + this.state.rails + ' rails.';
        result.append($('<h4/>').text(solutionText));

        let solutionIntro = $('<p/>');

        //'The encrypted text is ', $('<code/>').append(cipherTextLength.toString()),
        //' characters long.

        solutionIntro.append('There are ', $('<code/>').append(rails.toString()),
            ' rails in this problem.  Therefore, each zig-zag will have ',
            $('<code/>').append('(2 * #rails) - 2 = (2 * ' + rails.toString() + ') - 2 = '),
            $('<code/>').append(rfs.getCharsPerZigzag().toString()),
            ' characters (A single zig-zag starts with the character from the top row, goes ' +
            'down each row and back up ending one character before the top row.).  ' +
            'The encrypted text is ', $('<code/>').append(rfs.getTextLength().toString()),
            'characters long, so there are ', $('<code/>').append(rfs.getCountZigzag().toString()),
            'complete zig-zags in the solution, with ', $('<code/>').append(rfs.getCharsLeftover().toString()),
            ' characters left over in an incomplete zig-zag.');
        solutionIntro.append($('<p/>').append('All spaces and punctuation have been removed from the message.  To decode it, fill ' +
            'in each rail as described below.  The message can be read along the zig-zags.  Spaces between words can be added based on context.'));

        // 2 rails, 1 space
        // 3 rails, 3 spaces
        // 4 rails, 5 spaces
        // 5 rails, 7 spaces
        // 6 rails, 9 spaces
        let spacesBetween = (2 * rails) - 3;
        // First rail
        solutionIntro.append($('<h5/>').text('Rail 1'));
        let charsInRail = rfs.getCharactersInRail(1);
        solutionIntro.append('Copy the first ', $('<code/>').append(charsInRail.toString()),
            ' characters from the cipher text along the first rail, with ',
            $('<code/>').append(spacesBetween.toString()),
            CipherRailFenceEncoder.getPluralityString(spacesBetween, [' space between each character', ' spaces between each character.']),
            '  Each of these letter is the first character of a zig-zag.');

        // middle rails
        for (r = 2; r < rails; r++) {

            let firstSpacesCount = (2 * rails) - ((2 * (r - 1)) + 3);  //-5, -7, -9;
            let secondSpacesCount = rfs.getCharsPerZigzag() - 2 - firstSpacesCount;

            solutionIntro.append($('<h5/>').text('Rail '.concat(r.toString())));
            solutionIntro.append('Copy the next ', $('<code/>').append(rfs.getCharactersInRail(r).toString()),
                ' characters of the cipher string along rail ', $('<code/>').append(r.toString()), ', starting at position ',
                $('<code/>').append(r.toString()), '.  ');
            if (firstSpacesCount === secondSpacesCount) {
                solutionIntro.append('Put ',
                    $('<code/>').append(firstSpacesCount.toString()),
                    CipherRailFenceEncoder.getPluralityString(firstSpacesCount, [' space between each character along this rail.', ' spaces between each character along this rail.']));
            }
            else {
                solutionIntro.append('Alternate between ',
                    $('<code/>').append(firstSpacesCount.toString()), ' and ',
                    $('<code/>').append(secondSpacesCount.toString()), ' spaces between characters, starting with ',
                    $('<code/>').append(firstSpacesCount.toString()),
                    CipherRailFenceEncoder.getPluralityString(firstSpacesCount, [' space.', ' spaces.']));
            }
        }

        // Last rail                             
        solutionIntro.append($('<h5/>').text('Rail '.concat(r.toString())));
        charsInRail = rfs.getCharactersInRail(rails);
        solutionIntro.append('Copy the last ', $('<code/>').append(charsInRail.toString()),
            ' characters from the cipher text along the last rail, starting at position ',
            $('<code/>').append(r.toString()), ' with ',
            $('<code/>').append(spacesBetween.toString()),
            CipherRailFenceEncoder.getPluralityString(spacesBetween, [' space between each character.', ' spaces between each character.']));

        solutionIntro.append($('<p/>').append('Read the decrypted message along the diagonals!'));
        result.append(solutionIntro, rfs.getRailFenceSolution());


        // let rfs: RailFenceSolver = new RailFenceSolver(this.state.rails, sanitizeString(this.state.cipherString));
        // // Get the 'W' solution
        // result.append(rfs.getRailFenceSolution());

        return result;
    }

    private static getPluralityString(n: number, strings: string[]) {
        return (n === 1) ? strings[0] : strings[1];
    }
}

/**
 * This class creates a Rail Fence solver. 
 */
class RailFenceSolver {
    // Array to hold the rail fence encoding
    private readonly solution: string[][];
    // The number of rails in the rail fence
    private readonly railCount: number;
    // Array with the number of characters per rails.
    private readonly charactersInRails: number[];
    // Array with the number of leftover characters (0, 1 or 2).
    private readonly charactersLeftover: number[];
    // Length of text to encode.
    private readonly textLength: number;
    // Number of characters in each zigzag period
    private readonly charsPerZigzag: number;
    // Number of zigzag periods in this solution
    private readonly countZigzag: number;
    // Number of characters left over in this solution
    private readonly charsLeftover: number;
    // Solution, but with different number of rails.
    private readonly swizzledSolution: string[][];


    /**
     * Creates a Rail Fence solver.  Every character in the passed in inputText will
     * be placed in a unique position in the array.
     * @param rails The number of rails in the rail fence
     * @param inputText The inputText to be encoded
     */
    constructor(rails: number, inputText: string) {

        this.railCount = rails;
        let text = sanitizeString(inputText);
        this.textLength = text.length;

        this.charsPerZigzag = 2 * (this.railCount - 1);
        this.countZigzag = Math.floor(this.textLength / this.charsPerZigzag);
        this.charsLeftover = this.textLength % this.charsPerZigzag;
        this.charactersInRails = [];
        this.charactersLeftover = [];

        this.solution = [];
        this.swizzledSolution = [];

        // Loop over the rails to place characters
        for (let railIndex: number = 1; railIndex <= this.railCount; railIndex++) {

            // Adjust for computer zero-based arrays
            let railArrayIndex = railIndex - 1;

            // Initialize character per rail counts
            this.charactersInRails[railArrayIndex] = 0;
            this.charactersLeftover[railArrayIndex] = 0;

            // Add a second dimension to the array
            this.solution[railArrayIndex] = [];

            // Go thru the string to be encoded
            for (let columnIndex: number = 1; columnIndex <= this.textLength; columnIndex++) {

                // Adjust for computer zero-based arrays
                let colArrayIndex = columnIndex - 1;

                // Test if a character should be placed in the array location
                if (this.placeCharacter(railIndex, colArrayIndex, this.railCount, this.charsPerZigzag)) {
                    this.solution[railArrayIndex][colArrayIndex] = text.charAt(colArrayIndex);
                    // Update counts for complete zigzag or leftovers -- this is used in solution table.
                    if (columnIndex <= this.getCharsPerZigzag() * this.getCountZigzag()) {
                        this.charactersInRails[railArrayIndex]++;
                    }
                    else {
                        this.charactersLeftover[railArrayIndex]++;
                    }
                }
                else {
                    this.solution[railArrayIndex][colArrayIndex] = '';
                }
            }
        }
    }

    public swizzle(rails: number): JQuery<HTMLElement> {

        let swizzledCharsPerZigzag = 2 * (rails - 1);
        let swizzledCharsLeftover = this.textLength % swizzledCharsPerZigzag;

        let cipherText = this.getRailFenceEncoding();

        let nextCharIndex: number = 0;
        for (let railIndex: number = 1; railIndex <= rails; railIndex++) {
            let railArrayIndex = railIndex - 1;
            this.swizzledSolution[railArrayIndex] = [];
            for (let columnIndex: number = 1; columnIndex <= this.textLength; columnIndex++) {
                let colArrayIndex = columnIndex - 1;
                if (this.placeCharacter(railIndex, colArrayIndex, rails, swizzledCharsPerZigzag)) {
                    this.swizzledSolution[railArrayIndex][colArrayIndex] = this.getRailFenceEncoding().charAt(nextCharIndex);
                    nextCharIndex++;
                }
                else {
                    this.swizzledSolution[railArrayIndex][colArrayIndex] = '';
                }
            }
        }

        let tableClass: string = 'railfence-lg';
        if (this.textLength > 90) {
            tableClass = 'railfence-sm';
        }
        else if (this.textLength > 45) {
            tableClass = 'railfence-md';
        }

        let returnValue = $('<div/>');
        // Counter for a partial zigzag.
        let leftover: number = 1;
        if ((swizzledCharsLeftover === 0)) {
            leftover = 0;
        }

        let solutionTable = $('<table/>', { class: tableClass }).attr('width', '15px');
        let tableBody = $('<tbody/>');

        for (let i: number = 1; i <= rails; i++) {
            let tableRow = $('<tr/>');

            let data: string = '';
            for (let col: number = 0; col < this.getTextLength(); col++) {
                // Get all the characters from each zigzag. for this row and put it in a table cell.
                if ((col % swizzledCharsLeftover) === 0) {
                    // start a new string...
                    if (data.length > 0) {
                        tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
                    }
                    let char: string = this.swizzledSolution[i - 1][col];
                    if (char.length === 0) {
                        char = '.';
                    }
                    data = char;
                }
                else {
                    let char: string = this.swizzledSolution[i - 1][col];
                    if (char.length === 0) {
                        char = '.';
                    }
                    data = data.concat(char);
                }
            }
            // Finish the partial...
            if (data.length > 0) {
                tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
            }
            tableBody.append(tableRow);
        }
        solutionTable.append(tableBody);

        returnValue.append(solutionTable);

        // Get the solution for these rails
        let decoded: string = '';
        for (let i = 0; i < this.textLength; i++) {
            for (let j = 0; j < rails; j++) {
                if (this.swizzledSolution[j][i] !== '.') {
                    decoded = decoded.concat(this.swizzledSolution[j][i]);
                }
            }
        }

        returnValue.append($('<p/>').text('Using ' + rails.toString() +
            ' rails, the cipher text decodes to: '));
        returnValue.append($('<p/>', { class: 'TOANSWER' }).text(decoded))

        return returnValue;


    }

    public getTextLength(): number {
        return this.textLength;
    }

    public getCharsPerZigzag(): number {
        return this.charsPerZigzag;
    }

    public getCountZigzag(): number {
        return this.countZigzag;
    }
    public getCharsLeftover(): number {
        return this.charsLeftover;
    }
    public getCharactersInRail(rail: number): number {
        let returnValue = -1;
        if (rail >= 1 && rail <= this.railCount) {
            returnValue = this.charactersInRails[rail - 1] + this.charactersLeftover[rail - 1];
        }

        return returnValue;
    }
    public getRailFenceEncoding(): string {
        let returnValue: string = '';

        // Loop over each column, rail after rail and build a string of the non-blank characters.
        for (let i: number = 0; i < this.railCount; i++) {
            const rail: string[] = this.solution[i];
            for (let j: number = 0; j < rail.length; j++) {
                if (rail[j].length > 0) {
                    returnValue = returnValue.concat(rail[j]);
                }
            }
        }
        return returnValue;
    }
    /**
     * Create a formatted div which shows the Rail Fence solution.
     */
    public getRailFenceAnswer(): JQuery<HTMLElement> {
        let returnValue = $('<div/>', { class: 'TOSOLVE' });

        // TODO: These font sizes are hard-coded, but there should/could probably
        // be some CSS magic here...???
        let fontSize: string = '16pt';
        if (this.textLength > 90) {
            fontSize = '10pt';
        }
        else if (this.textLength > 45) {
            fontSize = '14pt';
        }

        // Loop thru each rail
        for (let i: number = 0; i < this.railCount; i++) {
            let encodedText: string = '';
            const rail: string[] = this.solution[i];
            // Loop thru each column
            for (let j: number = 0; j < rail.length; j++) {
                // Check for a character
                if (rail[j].length > 0) {
                    // Add the character
                    encodedText = encodedText.concat(rail[j]);
                }
                else {
                    // Add white space filler
                    encodedText = encodedText.concat(' ');
                }
            }
            // Add the next rail, using <pre> to maintain white space width.
            returnValue.append($('<pre/>').text(encodedText).css('font-size', fontSize));
        }
        // Adds some space at the bottom...
        returnValue.append('<p/>');

        return returnValue;
    }

    public getRailFenceSolution(): JQuery<HTMLElement> {
        let tableClass: string = 'railfence-lg';
        if (this.textLength > 90) {
            tableClass = 'railfence-sm';
        }
        else if (this.textLength > 45) {
            tableClass = 'railfence-md';
        }

        let returnValue = $('<div/>');

        // Counter for a partial zigzag.
        let leftover: number = 1;
        if ((this.getCharsLeftover() === 0)) {
            leftover = 0;
        }

        let solutionTable = $('<table/>', { class: tableClass }).attr('width', '15px');

        let tableHeader = $('<thead/>');
        tableHeader.append($('<tr/>').append($('<th/>', { class: 'rail-info' }).attr('colspan', 1).attr('rowspan', 2).text('Rail'),
            $('<th/>', { class: 'rail-info' }).attr('colspan', 3).text('Counts'),
            $('<th/>', { class: 'rail-data' }).attr('colspan', this.getCountZigzag() + leftover).text('Zigzag')));
        //solutionTable.append(tableHeader);

        let zigZagRow = $('<tr/>');
        tableHeader.append(zigZagRow.append($('<td/>', { class: 'rail-info' }).text('zz'), $('<td/>', { class: 'rail-info' }).text('l/o'), $('<td/>', { class: 'rail-info' }).text('Tot')));

        for (let zz: number = 1; zz <= (this.getCountZigzag() + leftover); zz++) {
            zigZagRow.append($('<th/>', { class: 'rail-data' }).text(zz.toString()));
        }
        solutionTable.append(tableHeader);

        let tableBody = $('<tbody/>');

        for (let i: number = 1; i <= this.railCount; i++) {
            let tableRow = $('<tr/>');

            tableRow.append($('<td/>', { class: 'rail-info' }).text(i.toString()),
                $('<td/>', { class: 'rail-info' }).text(this.charactersInRails[i - 1].toString()),
                $('<td/>', { class: 'rail-info' }).text(this.charactersLeftover[i - 1].toString()),
                $('<td/>', { class: 'rail-info' }).text((this.charactersInRails[i - 1] + this.charactersLeftover[i - 1]).toString()));

            let data: string = '';
            for (let col: number = 0; col < this.getTextLength(); col++) {
                // Get all the characters from each zigzag. for this row and put it in a table cell.
                if ((col % this.getCharsPerZigzag()) === 0) {
                    // start a new string...
                    if (data.length > 0) {
                        tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
                    }
                    let char: string = this.solution[i - 1][col];
                    if (char.length === 0) {
                        char = '.';
                    }
                    data = char;
                }
                else {
                    let char: string = this.solution[i - 1][col];
                    if (char.length === 0) {
                        char = '.';
                    }
                    data = data.concat(char);
                }
            }
            // Finish the partial...
            if (data.length > 0) {
                tableRow.append($('<td/>', { class: 'rail-data' }).text(data));
            }
            tableBody.append(tableRow);
        }
        solutionTable.append(tableBody);

        returnValue.append(solutionTable);

        return returnValue;
    }
    /**
     * The method return true if a character should be placed at the given
     * rail and column for the current railfence.
     * @param rail of the railfence to test
     * @param column of the railfence to test
     */
    private placeCharacter(rail: number, column: number, railCount: number, charsPerZigZag: number): boolean {

        let returnValue: boolean = false;
        let zigzagPosition = (column % charsPerZigZag) + 1;

        if (zigzagPosition <= (charsPerZigZag / 2) + 1) {
            // this is the down slope, including the very top and the bottom
            if (zigzagPosition === rail) {
                returnValue = true;
            }
        }
        else {
            // this is the up slope
            if ((zigzagPosition - ((zigzagPosition - railCount) * 2)) === rail) {
                returnValue = true;
            }
        }

        return returnValue;
    }
}
