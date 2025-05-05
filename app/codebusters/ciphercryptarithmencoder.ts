import { BoolMap, cloneObject, makeCallout, makeFilledArray, NumberMap, StringMap, setCharAt } from '../common/ciphercommon';
import {
    IState,
    ITestType,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { buildLegal, cryptarithmForumlaItem, cryptarithmParsed, cryptarithmResult, cryptarithmSumandSearch, legalMap, parseCryptarithm } from '../common/cryptarithm';
import { JTButtonItem, JTButtonGroup } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';

interface ICryptarithmState extends IEncoderState {
    /** Problem */
    problem: string;
    /** Mapping of letters to values */
    mapping: NumberMap;
    /** The mapping is valid for the formula */
    validmapping: boolean;
    /** The solution text */
    soltext: string;
    /** Difficulty */
    difficulty: number;
}

type ITemplateType = 'add' | 'mul' | 'div' | 'root';

interface ITemplate {
    type: ITemplateType,
    template: string,
}
/**
 * This template identifies what a parsed string would execute as
 */
interface parsedTemplate {
    type: ITemplateType;
    symbols: number;
    uses: number[][];
    replaces: string;
}
/**
 * These are execution templates.  They are the reverse of the parsedTemplate
 * to allow us to take advantage of only checking once for the formulas
 * A+B=C and C=A-B
 */
interface execTemplate {
    type: ITemplateType;
    symbols: number;
    uses: number[];
    replaces: string;
    formulas: string[];
}
/**
 * This tracks where we are searching so that we can take breaks and
 * allow the UI to update
 */
interface searchState {
    startTime: number           // Time that we started for tracking performance
    depth: number               // Current search depth
    maxdepth: number            // Maximum depth to search to
    found: number               // Number of cryptarithms found
    basemask: number[]          // Combined array of unique letters for the depth
    index: number[]             // Current index for the depth
    start: number[]             // Starting index for the depth
    limit: number[]             // Limit index for the depth
    templates: execTemplate[]   // Templates to process
}

/**
 * CipherCryptarithmEncoder implements the Cryptarithm methods
 */
export class CipherCryptarithmEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Cryptarithm';
    public cipherName = 'Cryptarithm'

    public lettermask: { [index: string]: number } = {
        'A': 1 << 0,
        'B': 1 << 1,
        'C': 1 << 2,
        'D': 1 << 3,
        'E': 1 << 4,
        'F': 1 << 5,
        'G': 1 << 6,
        'H': 1 << 7,
        'I': 1 << 8,
        'J': 1 << 9,
        'K': 1 << 10,
        'L': 1 << 11,
        'M': 1 << 12,
        'N': 1 << 13,
        'O': 1 << 14,
        'P': 1 << 15,
        'Q': 1 << 16,
        'R': 1 << 17,
        'S': 1 << 18,
        'T': 1 << 19,
        'U': 1 << 20,
        'V': 1 << 21,
        'W': 1 << 22,
        'X': 1 << 23,
        'Y': 1 << 24,
        'Z': 1 << 25,
    }

    public templates: ITemplate[] = [
        { type: 'add', template: "A+B=C" },
        { type: 'add', template: "A+B+C=D" },
        { type: 'add', template: "A+B+B=C" },
        { type: 'add', template: "A+A=B" },
        { type: 'add', template: "C-B=A" },
        { type: 'add', template: "D-A-B=C" },
        { type: 'add', template: "C-A-A=B" },
        // // { type: 'add', template: "A+B=C; D+E=F" },  // TODO: Need to support multiple operations
        // { type: 'add', template: "A+B=C; D-E=F" },  // TODO: Need to support multiple operations
        // { type: 'mul', template: "A*B=C" },
        // { type: 'mul', template: "A*B=?" },  // TODO: Need to be able to specify the result
        // { type: 'div', template: "A/B=C" },
        // { type: 'div', template: "A/B=?" },  // TODO: Need to be able to specify the result
    ]

    // For now we pre-define the parsed templates.  Eventually we need to write code
    // that takes the string and parses it into the correponding template
    public parsedTemplates: { [index: string]: parsedTemplate } = {
        "A+B=C": { type: 'add', symbols: 3, uses: [[0, 1]], replaces: "ABC" },
        "A+B+C=D": { type: 'add', symbols: 4, uses: [[0, 1, 2]], replaces: "ABCD" },
        "A+B+B=C": { type: 'add', symbols: 3, uses: [[0, 1, 1], [1, 0, 0]], replaces: "ABBC" },
        "A+A=B": { type: 'add', symbols: 2, uses: [[0, 0]], replaces: "AAB" },
        "C-B=A": { type: 'add', symbols: 3, uses: [[0, 1]], replaces: "BAC" },
        "D-A-B=C": { type: 'add', symbols: 4, uses: [[0, 1, 2]], replaces: "ABCD" },
        "C-A-A=B": { type: 'add', symbols: 3, uses: [[1, 1, 0], [0, 0, 1]], replaces: "AABC" },
    }

    public validTests: ITestType[] = [
        ITestType.None,
        ITestType.cregional,
        ITestType.cstate,
        ITestType.bregional,
        ITestType.bstate,
    ];

    public defaultstate: ICryptarithmState = {
        /** The type of operation */
        operation: 'decode' /** a value */,
        problem: '',
        cipherString: '' /** The type of cipher we are doing */,
        soltext: '', /**  */
        cipherType: ICipherType.Cryptarithm /** The first clicked number in the solution */,
        replacement: {},
        mapping: {},
        validmapping: false,
        difficulty: undefined,
    };

    /** Keywords for generating the problem */
    public wordlist: string[] = [];
    public wordlistmask: number[] = []

    public base = 10;
    public generatemode = false;
    public doingSearch = false;
    private searchTimer: NodeJS.Timeout = undefined;
    public generateButton: JTButtonItem = {
        title: 'Generate Problems',
        id: 'generate',
        color: 'primary',
    };
    public state: ICryptarithmState = cloneObject(this.defaultstate) as ICryptarithmState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.generateButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];

    public searchButton: JTButtonItem = {
        title: 'Search',
        class: 'findprobs',
        color: 'primary',
    };

    public stopSearchButton: JTButtonItem = {
        title: 'Stop Searching',
        id: 'stopsearch',
        color: 'alert',
        disabled: true
    };

    public doCipherButton: JTButtonItem = {
        title: 'Back to Current Cipher',
        id: 'docipher',
        color: 'primary',
    };
    public relatedWordsButton: JTButtonItem = {
        title: 'Related Words',
        id: 'related',
        color: 'primary',
        target: 'related',
        href: 'https://relatedwords.org/'
    };

    public problemButtons: JTButtonItem[] = [
        this.searchButton,
        this.stopSearchButton,
        this.relatedWordsButton,
        this.doCipherButton,
        // this.guidanceButton,
    ];

    /* We have identified a complete solution */
    public completeSolution = false;
    /**
     * Make a copy of the current state
     */
    public save(): IState {
        // We need a deep copy of the save state
        const savestate = cloneObject(this.state) as IState;
        return savestate;
    }
    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        const result: ITestQuestionFields = {
            // Cryptarithm must keep the array approach because we allow multiple
            // characters in each cell
            answer: makeFilledArray(this.state.cipherString.length, ''),
            notes: '',
        };
        return result;
    }
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ICryptarithmState, suppressOutput = false): void {
        this.state = cloneObject(this.defaultstate) as ICryptarithmState;
        this.copyState(this.state, data);
        this.state.operation = "decode";
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Determines if this generator is appropriate for a given test
     * type.  For Division B, only decode is allowed
     * Cryptanalysis is only allowed at the state level
     *   decode - cregional/cstate/bregional/bstate
     *   encode - cregional/cstate
     *   crypt - cstate/bstate
     * @param testType Test type to compare against
     * @param anyOperation Don't restrict based on the type of operation
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType, anyOperation: boolean): string {
        let result = super.CheckAppropriate(testType, anyOperation);
        return result;
    }
    /**
      * Generate the recommended score and score ranges for a cipher
      * @returns Computed score ranges for the cipher and text description
      */
    public genScoreRangeAndText(): suggestedData {
        let text = ''
        let suggested = 250;

        const soldata = this.analyzeQuote(this.state.soltext)

        if (this.state.difficulty !== undefined) {
            suggested = 100 + (this.state.difficulty * 50)
        }
        const min = Math.max(suggested - 50, 0)
        const max = suggested + 50
        suggested += Math.round(50 * Math.random()) - 25;

        if (soldata.len < 6) {
            text = `<p><b>WARNING:</b> <em>There are only ${soldata.len} characters in the solution, we recommend at least 6 characters</em></p>`
        }
        if (soldata.unique < 4) {
            text = `<p><b>WARNING:</b> <em>There are only ${soldata.unique} unique characters in the solution, we recommend at least 4 unique characters</em></p>`
        }
        text += `<p>There are ${soldata.len} characters in the solution, ${soldata.unique} of which are unique.
             We suggest you try a score of ${suggested} (From a range of ${min} to ${max})</p>`

        return { suggested: suggested, min: min, max: max, text: text }
    }
    /**
     * Updates the stored state cipher string
     * @param cipherString Cipher string to set
     */
    public setCipherString(cipherString: string): boolean {
        let changed = super.setCipherString(cipherString);
        if (changed) {
            this.state.validmapping = false;
            this.state.difficulty = undefined;
        }
        return changed;
    }
    public genMask(word: string): number {
        let result = 0
        for (let c of word.toUpperCase()) {
            const val = this.lettermask[c]
            if (val !== undefined) {
                result |= val
            }
        }
        return result
    }
    /**
     * Update the list of words to search for
     * @param wordlist List of words to set
     * @returns true if the wordlist has changed
     */
    public setWordlist(wordlist: string[]): boolean {
        let changed = false;
        if (wordlist.join(' ') !== this.wordlist.join(' ')) {
            this.wordlist = [];
            this.wordlistmask = [];
            // We also need to go through and set the unique values
            for (let word of wordlist) {
                let cleaned = this.minimizeString(word)
                if (!this.wordlist.includes(cleaned)) {
                    this.wordlist.push(cleaned)
                    this.wordlistmask.push(this.genMask(cleaned))
                }
            }
            changed = true;
        }
        return changed;
    }
    /**
     * Update the list of words to search for
     * @param wordlist List of words to set
     * @returns true if the wordlist has changed
     */
    public setSoltext(soltext: string): boolean {
        let changed = false;
        if (soltext !== this.state.soltext) {
            this.state.soltext = soltext;
            changed = true;
        }
        return changed;
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        $('#wordlist').val(this.wordlist.join('\n'))
        $('#soltext').val(this.state.soltext);

        this.showMapping(false);

        this.validateQuestion();
        this.attachHandlers();
        if (this.generatemode) {
            $('.probwork').show()
            $('.cipherwork').hide()
        } else {
            $('.probwork').hide()
            $('.cipherwork').show()

        }
    }
    public setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }
    public findQuestionMatch(questionText, pt, ct, pos): boolean {
        const rep = new RegExp('\\b' + pt + '\\b');
        // If the plain text is not mentioned in the question, then they have
        // a problem to fix.
        if (questionText.match(rep) === null) {
            return false;
        }
        // If the crib is at the beginning, look for something in the
        // question that says something like "Starts with XX" or
        // XX can be found at the start
        if (
            pos === 0 &&
            (questionText.indexOf('START') >= 0 ||
                questionText.indexOf('BEGIN') >= 0 ||
                questionText.indexOf('FIRST') >= 0)
        ) {
            return true;
        }

        const ptstring = this.minimizeString(this.state.cipherString);

        // If the crib is at the end, look for something in the
        // question that says something like "Ends with XX" or
        // XX can be found at the end
        if (
            pos === ptstring.length - 2 &&
            (questionText.indexOf('END') >= 0 ||
                questionText.indexOf('FINAL') >= 0 ||
                questionText.indexOf('LAST') >= 0)
        ) {
            return true;
        }

        // If the crib is at the end, look for something in the
        // question that says something like "Ends with XX" or
        // XX can be found at the end
        if (
            pos === ptstring.length - 2 &&
            (questionText.indexOf('2') >= 0 ||
                questionText.indexOf('2ND') >= 0 ||
                questionText.indexOf('SECOND') >= 0)
        ) {
            return true;
        }

        const rec = new RegExp('\\b' + ct + '\\b');
        if (questionText.match(rec) !== null) {
            return true;
        }
        return false;
    }
    /**
     * Get the values which are mapped to by the solution text
     * @returns string Numbers for solution values
     */
    public getSolValues(): string {
        let result = ""
        if (this.state.validmapping && this.state.soltext !== '') {
            for (let c of this.state.soltext.toUpperCase()) {
                let v = this.state.mapping[c]
                if (v !== undefined) {
                    result += v
                } else {
                    result += c
                }
            }
        }
        return result
    }
    /**
     * Check for any errors we can find in the question
     */
    public validateQuestion(): void {
        super.validateQuestion();
        let msg = '';
        let sampleLink: JQuery<HTMLElement> = undefined;
        const questionText = this.state.question.toUpperCase();
        const solValues = this.getSolValues()
        if (!questionText.match(solValues)) {
            msg += "The Question Text doesn't mention the values to be solved for.";

        }
        if (msg !== '') {
            sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');
        }

        this.setErrorMsg(msg, 'vq', sampleLink);
    }
    public addQuestionOptions(qOptions: string[], langtext: string, hinttext: string, fixedName: string, operationtext: string, operationtext2: string, cipherAorAn: string): boolean {
        const solValues = this.getSolValues()
        operationtext = ' What do the values ' + this.genMonoText(solValues) + ' decode to?';
        return super.addQuestionOptions(qOptions, langtext, hinttext, fixedName, operationtext, operationtext2, cipherAorAn);

    }
    /**
     * Initializes the encoder.
     * We don't want to show the reverse replacement since we are doing an encode
     */
    public init(lang: string): void {
        super.init(lang);
        this.ShowRevReplace = false;
    }
    public buildReplacement(msg: string, maxEncodeWidth: number): string[][] {
        const result: string[][] = [];
        let message = '';
        let cipher = '';
        const msgLength = msg.length;
        let lastSplit = -1;
        const msgstr = msg.toUpperCase();

        for (let i = 0; i < msgLength; i++) {
            const messageChar = msgstr.substring(i, i + 1);
            let cipherChar = '';
            if (this.isValidChar(messageChar)) {
                message += messageChar;
                cipherChar = messageChar;
                cipher += cipherChar;
            } else {
                message += messageChar;
                cipher += messageChar;
                lastSplit = cipher.length;
                continue;
            }
            if (message.length >= maxEncodeWidth) {
                if (lastSplit === -1) {
                    result.push([cipher, message]);
                    message = '';
                    cipher = '';
                    lastSplit = -1;
                } else {
                    const messagePart = message.substr(0, lastSplit);
                    const cipherPart = cipher.substr(0, lastSplit);
                    message = message.substr(lastSplit);
                    cipher = cipher.substr(lastSplit);
                    result.push([cipherPart, messagePart]);
                }
            }
        }
        if (message.length > 0) {
            result.push([cipher, message]);
        }
        return result;
    }
    public genCmdButtons(): JQuery<HTMLElement> {
        return $('<div/>', { class: 'cipherwork' }).append(super.genCmdButtons())
    }

    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.  This returns the result
     * as the HTML to be displayed
     */
    public build(): JQuery<HTMLElement> {
        let parsed = parseCryptarithm(this.state.cipherString, this.base);
        return this.buildSolver(parsed, true)
    }


    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        let cipherindex = 1;
        const strings = this.buildReplacement(this.state.cipherString, 9999);
        let solution: string[] = [];
        for (const strset of strings) {
            solution = solution.concat(strset[cipherindex].split(''));
        }
        //TODO: should we need to do this or should it be done on data entry?
        const upperAnswer: string[] = [];
        for (let i = 0; i < answer.length; i++) {
            upperAnswer[i] = answer[i].toUpperCase();
        }

        return this.calculateScore(solution, upperAnswer, this.state.points);
    }

    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let parsed = parseCryptarithm(this.state.cipherString, this.base);
        return this.buildSolver(parsed, true)
    }
    /**
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        const qnumdisp = String(qnum + 1);
        const result = $('<div/>', { id: 'Q' + qnumdisp });
        let plainindex = 0;
        const strings = this.buildReplacement(this.state.cipherString, 40);
        result.append(
            this.genInteractiveCipherTable(strings, plainindex, qnum, 'Cryptarithmint', false)
        );

        result.append($('<textarea/>', { id: 'in' + qnumdisp, class: 'intnote' }));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        let parsed = parseCryptarithm(this.state.cipherString, this.base);
        return this.buildSolver(parsed, false)
    }
    /**
     * Generate HTML showing the current decoding progress
     */
    public genDecodeProgress(msg: string, letters: string): JQuery<HTMLElement> {
        let i;
        let message = '';
        const msgLength = msg.length;

        const table = $('<table/>').addClass('tfreq');
        const tableBody = $('<tbody/>');
        const messageRow = $('<tr/>');
        const cipherRow = $('<tr/>');

        // Assume that these letters complete the solution
        this.completeSolution = true;

        for (i = 0; i < msgLength; i++) {
            const messageChar = msg.substring(i, i + 1).toUpperCase();
            let cipherChar = '';
            if (this.isValidChar(messageChar)) {
                message += messageChar;
                cipherChar = this.state.replacement[messageChar];
            } else {
                message += messageChar;
                continue;
            }

            if (letters.indexOf(messageChar) !== -1) {
                messageRow.append(
                    $('<td/>')
                        .addClass('TOANSWER')
                        .text(messageChar)
                );
            } else {
                // Alas one of the letters is unresolved, to the solution is not complete
                messageRow.append(
                    $('<td/>')
                        .addClass('TOANSWER')
                        .text(' ')
                );
                this.completeSolution = false;
            }
            cipherRow.append(
                $('<td/>')
                    .addClass('TOSOLVE')
                    .text(cipherChar)
            );
        }
        if (message.length > 0) {
            tableBody.append(cipherRow);
            tableBody.append(messageRow);
        }
        table.append(tableBody);

        return table;
    }
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        return this.genDecodeSolution();
    }

    public genDecodeSolution(): JQuery<HTMLElement> {
        const result = $('<div/>', { id: 'solution' });
        return result;
    }

    /**
     * Generate the potential list of problem styles
     */
    public genProblemStyleList(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'cell small-6 medium-9 large-9' })
        result.append($('<div/>', { class: 'toptitle' }).text('Problem Style'))
        result.append(
            $('<div/>', { class: 'expanded button-group round shrink' })
                .append($('<a/>', { class: 'tall button' }).text('All'))
                .append($('<a/>', { class: 'tnone button' }).text('None'))
                .append($('<a/>', { class: 'taddsub button' }).text('+/-'))
            // .append($('<a/>', { class: 'tmul button' }).text('*'))  // TODO When we have multiplication
            // .append($('<a/>', { class: 'tdiv button' }).text('/'))  // TODO When we have division
        )
        for (const i in this.templates) {
            const inputgroup = $('<div/>', { class: 'input-group' });
            // For a checkbox, the value is a boolean indicated that it should be checked
            const checkbox =
                $('<input/>', {
                    id: "A" + String(i),
                    class: 'input-group-button checkbox targany targ' + this.templates[i].type,
                    checked: 'checked',
                    'data-template': this.templates[i].template,
                    type: 'checkbox'
                })
            inputgroup.append(checkbox);
            const label = $('<span/>', { class: 'input-group-label' }).text(this.templates[i].template)
            inputgroup.append(label);
            result.append($('<div/>', { class: 'cell' }).append(inputgroup));
        }
        return result;
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        const cipherwork = $('<div/>', { class: 'cipherwork' });
        result.append(cipherwork);
        this.genTestUsage(cipherwork);
        this.genQuestionFields(cipherwork);
        cipherwork.append($('<div/>', { class: 'grid-x' })
            .append(JTFLabeledInput("Problem", "text", "toencode", this.state.cipherString, 'auto'))
        )
        result.append($('<div/>', { class: 'callout secondary probwork' })
            .append($('<div/>', { class: 'grid-x grid-margin-x' })
                .append($('<div/>', { class: 'cell small-6 medium-3 large-3' })
                    .append($('<div/>', { class: 'toptitle' }).text('Words to Try'))
                    .append(
                        $('<textarea/>', {
                            id: 'wordlist',
                            class: 'input-group-field',
                            rows: 26,
                        })
                    ))
                .append(this.genProblemStyleList())
            ))
        // Build the mapping table
        const table = new JTTable({
            class: 'cell shrink tfreq cmap',
        });
        const toprow = table.addHeaderRow();
        const bottomrow = table.addBodyRow();
        for (let i = 0; i < this.base; i++) {
            toprow.add(String(i))
            bottomrow.add({
                celltype: 'td',
                settings: { id: "cm" + String(i) },
                content: "?"
            });

        }
        cipherwork.append($('<div/>', { class: 'grid-x' })
            .append($('<div/>', { class: 'cell auto' })
                .append($('<div/>', { class: 'input-group' })
                    .append($('<span/>', { class: 'input-group-label' }).text('Mapping'))
                    .append(table.generate())
                    .append($('<a/>', {
                        class: 'button rounded updmap',
                        disabled: 'disabled'
                    }).text('Check Problem and Update'))
                    .append($('<div/>', { class: 'updnote' }).text("Note that this can take a while depending on the problem complexity"))
                ))
        )

        cipherwork.append($('<div/>', { class: 'grid-x' })
            .append(JTFLabeledInput("Solution", "text", "soltext", this.state.soltext, 'auto'))
        )
        result.append(
            $('<div/>', { class: 'probwork' })
                .append(JTButtonGroup(this.problemButtons))
        )
        // Give them some difficulty filters
        const filterDiv = $('<div/>', { class: "grid-x grid-margin-x" })
        filterDiv.append($('<div/>', { class: 'cell shrink' }).append($('<b/>').text('Difficulty:')))
            .append($('<div/>', { class: 'cell shrink' }).append(JTFLabeledInput('1', 'checkbox', 'd1', true, '', 'difchk')))
            .append($('<div/>', { class: 'cell shrink' }).append(JTFLabeledInput('2', 'checkbox', 'd2', true, '', 'difchk')))
            .append($('<div/>', { class: 'cell shrink' }).append(JTFLabeledInput('3', 'checkbox', 'd3', true, '', 'difchk')))
            .append($('<div/>', { class: 'cell shrink' }).append(JTFLabeledInput('4', 'checkbox', 'd4', false, '', 'difchk')))
            .append($('<div/>', { class: 'cell shrink' }).append(JTFLabeledInput('5', 'checkbox', 'd5', false, '', 'difchk')))
            .append($('<div/>', { class: 'cell shrink' }).append(JTFLabeledInput('6', 'checkbox', 'd6', false, '', 'difchk')))

        result.append($('<div/>', { class: 'callout secondary probwork' })

            .append($('<div/>', { class: 'toptitle' }).text('Potential Cryptarithms'))
            .append(filterDiv)
            .append($('<div/>', { class: 'callout warning', id: 'searchres' }).text('None found'))
            .append($('<div/>', { class: 'findout', id: 'findout' })))

        return result;
    }
    /**
     *
     */
    public load(): void {
        let res = this.build();
        $('#answer')
            .empty()
            .append(res);
        res = this.genSolution(ITestType.None);
        $('#sol')
            .empty()
            .append('<hr/>')
            .append(res);

        this.attachHandlers();
    }
    /**
     * Enable the check boxes for a specific type of template
     * @param targetset type of template to enable
     */
    public enableTargets(targetset: ITemplateType) {
        $('.targany').prop('checked', false)
        $('.targ' + targetset).prop('checked', true)
    }
    /**
     * Disable all the templates for searching
     */
    public disableTargets() {
        $('.targany').prop('checked', false)
    }
    /**
     * Enable all the templates for searching
     */
    public enableAllTargets() {
        $('.targany').prop('checked', true)
    }
    /**
     * Update the searching status message
     * @param status Status string to show
     * @param calloutclass Class of message to show
     */
    public setSearchResult(status: string, calloutclass: 'secondary' | 'primary' | 'success' | 'warning' | 'alert'): void {
        $('#searchres')
            .empty()
            .removeClass('secondary')
            .removeClass('primary')
            .removeClass('success')
            .removeClass('warning')
            .removeClass('alert')
            .addClass(calloutclass).append($('<div/>').text(status)
                // Give a place to show what is hidden
                .append($('<span/>', { id: 'hidden' })))
    }
    /**
     * Set the UI for searching vs non-searching mode
     * @param doingSearch True/False we are in search mode
     */
    public setSearching(doingSearch: boolean) {
        this.doingSearch = doingSearch
        if (doingSearch) {
            $('.findprobs').attr('disabled', 'disabled')
            $('#stopsearch').removeAttr('disabled')
            $('#docipher').attr('disabled', 'disabled')
        } else {
            if (this.searchTimer !== undefined) {
                clearTimeout(this.searchTimer)
                this.searchTimer = undefined
            }
            $('.findprobs').removeAttr('disabled')
            $('#stopsearch').attr('disabled', 'disabled')
            $('#docipher').removeAttr('disabled')
        }
    }
    /**
     * Find a set of strings which have this.base (10) unique characters
     * We only want to run through 1000 or so entries before returning to update the UI
     * However if we do find a valid match, we return immediately to update the UI
     * @param state State structure to hold current place in search
     * @returns boolean true indicates there are more remaining to search
     *          false indicates that all the potential combinations have been processed
     */
    public findWordSet(state: searchState): boolean {
        for (let processed = 0; processed < 1000; processed++) {
            let depth = state.depth
            state.index[depth]++
            let slot = state.index[depth]
            if (slot <= state.limit[depth]) {
                // We can use this level
                const uniquemask = state.basemask[depth - 1] | this.wordlistmask[slot]
                // From https://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel 
                // count the number of one bits in the mask
                let n = uniquemask - ((uniquemask >> 1) & 0x55555555)
                n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
                const unique = ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24

                // If there are less unique letters than the number base, we know that
                // we can try to use it.  Otherwise we will have to advance to the next level
                if (unique <= this.base) {
                    let found = 0
                    // This is a potential candidate
                    if (unique === this.base) {
                        // Get the index of all the words we have chosen so far
                        let localset = state.index.slice(1, depth + 1)
                        // And try them out against all the templates we have
                        for (let template of state.templates) {
                            found += this.checkSolution(localset, template)
                        }
                    }
                    // Even though we may have found one that matches, there might be a lower level
                    // set of strings which will also work.  For example if we have three words
                    //              ARTIST, EXTRA, VILLIAN 
                    // we could also include STAR
                    //              ARTIST, EXTRA, VILLIAN, STAR 
                    // and even STARVE
                    //              ARTIST, EXTRA, VILLIAN, STAR, STARVE 
                    // because those words don't use any extra letters that weren't in the first three words
                    state.basemask[state.depth] = uniquemask
                    if (state.depth < state.maxdepth) {
                        state.depth++
                        state.index[state.depth] = slot
                    }
                    state.found += found
                    // Since we did some work, if we found one, we need to exit to let the UI update
                    if (found) {
                        return true
                    }
                }
            } else {
                // We need to back track up the levels
                while (state.index[state.depth] >= state.limit[state.depth]) {
                    state.depth--;
                    // If we hit the top, we are done!
                    if (state.depth <= 0) {
                        return false
                    }
                }
            }
        }
        // We ran through a bunch of entries, take a break for the UI
        return true;
    }
    /**
     * Show how many results are hidden.
     */
    public countHidden() {
        // Figure out how many are hidden
        let hidden = ''
        let hiddencount = $('*[class^="CD"]:hidden').length
        if (hiddencount > 0) {
            hidden = ` [${hiddencount} hidden]`
        }
        $("#hidden").text(hidden)
    }
    /**
     * Main loop to search for sets.  This uses a timeout to repetetively call findWordSet() to
     * continue processing through all the combinations
     * @param state State structure to hold current place in search
     */
    public findWordSets(state: searchState) {
        this.searchTimer = undefined
        // Figure out how far along we are.  We can use the first two levels as a good approximation
        let processed = state.index[1] * this.wordlist.length + state.index[2];
        let total = (this.wordlist.length - 1) * this.wordlist.length;
        let pctcomplete = (100 * processed / total).toFixed(2)
        this.setSearchResult(
            `${pctcomplete}% Complete - Searching ${state.maxdepth} combinations of ${this.wordlist.length} words. Found ${state.found} Cryptarithms.`,
            'secondary');
        this.countHidden();
        // Call our workhorse routine.  If it finds any (or goes a while without finding any) it gives a break so we can update the UI
        const running = this.findWordSet(state)
        if (running) {
            if (this.doingSearch) {
                this.searchTimer = setTimeout(() => { this.findWordSets(state) }, 1);
            } else {
                this.setSearchResult(`Search Stopped ${state.found} Cryptarithms found`, 'warning')
                this.countHidden();
            }
            return;
        }
        this.setSearching(false);
        this.attachHandlers();
        let interval = (new Date().getTime()) - state.startTime
        this.setSearchResult(`Search Complete: ${state.found} Cryptarithms found in ${(interval / 1000).toFixed(2)} Seconds`, 'success')
        this.countHidden();
    }
    /**
     * Find all the groups of <n> words which include exactly 10 unique letters
     * @param templates Templates to match against
     */
    public findWordGroups(templates: execTemplate[]) {
        this.setSearching(true);

        $("#findout").empty();
        let maxdepth = 0
        for (let template of templates) {
            if (template.symbols > maxdepth) {
                maxdepth = template.symbols
            }
        }
        // If they only give us 3 words, then that's the furthest down the list we can go
        if (maxdepth > this.wordlist.length) {
            maxdepth = this.wordlist.length
        }

        // First we need to set up the state
        let state: searchState = {
            startTime: new Date().getTime(),
            found: 0,
            depth: 1,
            basemask: [],
            index: [-1],
            start: [0],
            limit: [0],
            templates: templates,
            maxdepth: maxdepth
        }
        // Set up the state starts and limits
        for (let i = 0; i < maxdepth; i++) {
            state.index.push(i - 1)
            state.start.push(i)
            state.limit.push(i + (this.wordlist.length - maxdepth))
            state.basemask.push(0)
        }
        this.findWordSets(state)
    }
    /**
     * Determines if two arrays of numbers are exactly the same
     * @param a1 First Number array
     * @param a2 Second Number Array
     */
    public isSame(a1: number[], a2: number[]): boolean {
        let len = a1.length
        if (len != a2.length) {
            return false
        }
        for (let i = 0; i < len; i++) {
            if (a1[i] !== a2[i]) {
                return false
            }
        }
        return true
    }
    /**
     * Find all problems which meet the critaria
     */
    public findProblems() {
        // Let them know we are in search mode
        this.setSearchResult('working with ' + this.wordlist.length + ' words.', 'success');
        // Figure out what templates they are going to use
        const templatechoices = $('.targany:checked');
        if (this.wordlist.length < 2) {
            this.setSearchResult('The "Words to Try" list needs to have at least two words to work from.  Did you enter any?', 'alert')
        } else if (templatechoices.length === 0) {
            this.setSearchResult('No "Problem Style" templates have been selected.  Please select what type of problem to search for', 'alert')
        } else {
            const templates: execTemplate[] = [];
            templatechoices.each((i, elem) => {
                let formula = $(elem).attr('data-template')
                let parsed = this.parsedTemplates[formula]
                if (parsed !== undefined) {
                    // We need to see if there already is a template which is using
                    for (let use of parsed.uses) {
                        let found = false
                        // See if any of the existing templates already use this set.
                        for (let i = 0; i < templates.length; i++) {
                            if (this.isSame(templates[i].uses, use)) {
                                // We found one, so we add our formula to the list
                                templates[i].formulas.push(formula)
                                found = true
                                break
                            }
                        }
                        // We didn't find one, so create a new entry
                        if (!found) {
                            templates.push({ type: parsed.type, symbols: parsed.symbols, uses: use, replaces: parsed.replaces, formulas: [formula] })
                        }
                    }
                }
            })
            this.findWordGroups(templates);
        }
    }

    /**
     * 
     * @param parsed Parsed Cryptarithm to generate output for
     * @returns HTML representation of output
     */
    public buildSolver(parsed: cryptarithmParsed, showanswer: boolean): JQuery<HTMLElement> {
        // We have built the lineitems array, now we just need to turn it into
        // a table (respecting the maxwidth)
        let formulaTable = $("<table/>", { class: "cmath unstriped plain notiny" });
        let tbody = $("<tbody/>");
        for (let item of parsed.lineitems) {
            let tr = $("<tr/>");
            // Pad on the left with as many columns as we need
            if (item.content.length < parsed.maxwidth) {
                $("<td/>", {
                    colspan: parsed.maxwidth - item.content.length,
                })
                    .html("&nbsp;")
                    .appendTo(tr);
            }
            let td: JQuery<HTMLElement> = null;
            let addclass = item.class;
            switch (item.prefix) {
                case "2": {
                    td = $("<td/>")
                        .html("&radic;")
                        .addClass("math"); // √ - SQUARE ROOT
                    addclass = "";
                    break;
                }
                case "3": {
                    td = $("<td/>")
                        .html("&#8731;")
                        .addClass("math"); // ∛ - CUBE ROOT
                    addclass = "";
                    break;
                }
                case "4": {
                    td = $("<td/>")
                        .html("&#8732;")
                        .addClass("math"); // ∜ - FOURTH ROOT
                    addclass = "";
                    break;
                }
                default: {
                    td = $("<td/>").text(item.prefix).addClass("math");
                    break;
                }
            }
            if (addclass) {
                td.addClass(addclass);
            }
            td.appendTo(tr);
            addclass = item.class;
            if (item.content !== "") {
                for (let c of item.content) {
                    td = $("<td/>");
                    if (c === ")") {
                        td.text(c);
                        td.addClass("math");
                        addclass = "ovl";
                    } else if (parsed.usedletters[c]) {
                        $("<div/>", { class: "crr" })
                            .text(c)
                            .appendTo(td);
                        if (showanswer) {
                            let mapval = '?';
                            if (this.state.mapping[c] !== undefined) {
                                mapval = String(this.state.mapping[c])
                            }
                            $("<div>", {
                                class: "crc",
                            }).text(mapval).appendTo(td);
                        }
                        else {
                            $("<div>", {
                                class: "crc",
                            }).html("&nbsp;").appendTo(td);
                        }
                    }
                    if (addclass) {
                        td.addClass(addclass);
                    }
                    td.appendTo(tr);
                }
            }

            if (showanswer && item.formula !== "") {
                const td = $('<td/>').append($("<span/>", {
                    class: "formula",
                    "data-formula": item.formula,
                    "data-expect": item.expected,
                }).text(item.formula + '=' + item.expected));
                td.appendTo(tr);
            }

            tr.appendTo(tbody);
        }

        tbody.appendTo(formulaTable);

        let solution = $('<div/>')
        if (this.state.validmapping && this.state.soltext !== '') {
            let nonmapped = ""
            // Build the mapping table
            const anstable = new JTTable({
                class: 'ansblock shrink cell unstriped',
            });
            // The top row is not needed for the tiny answer key
            const toprow = anstable.addBodyRow({ class: "notiny" });
            const bottomrow = anstable.addBodyRow();
            for (let c of this.state.soltext.toUpperCase()) {
                let v = this.state.mapping[c]
                if (c === ' ') {
                    toprow.add(' ')
                    bottomrow.add({
                        content: '&nbsp;',
                    })
                } else if (v === undefined) {
                    if (c.toLowerCase() !== c) {
                        nonmapped += c
                    }
                    toprow.add(c)
                    bottomrow.add(c)
                } else {
                    toprow.add(String(v))
                    if (showanswer) {
                        bottomrow.add({
                            settings: { class: 'a v' },
                            content: c
                        })
                    } else {
                        bottomrow.add({
                            settings: { class: 'e v' },
                            content: '&nbsp;',
                        })
                    }
                }
            }
            solution.append(anstable.generate())
            if (nonmapped.length > 0) {
                let s = ""
                let dont = "doesn't"
                if (nonmapped.length > 1) {
                    s = "s"
                    dont = "don't"
                }
                solution.append(makeCallout(`The solution text uses the letter${s} "${nonmapped}" which ${dont} appear in the cryptarithm.`, 'warning'))
            }
        } else if (!this.state.validmapping) {
            solution.append(makeCallout("No known solution mapping has been generated.  Please click the Check Problem and Update button", 'alert'))
        } else {
            solution.append(makeCallout("No solution text given to solve for", 'alert'))
        }

        // Build the mapping table
        const worktable = new JTTable({
            class: 'tfreq crwork',
        });
        const top = worktable.addHeaderRow()
        let mapping = this.getOutputMapping()
        top.add('')
        for (let i = 0; i < this.base; i++) {
            top.add(String(i))
        }
        for (let c of mapping) {
            const row = worktable.addBodyRow()
            row.add({
                celltype: 'th',
                content: c
            })
            for (let i = 0; i < this.base; i++) {
                row.add(' ')
            }
        }

        let result = $('<div/>', { class: 'cipherwork' })
        result.append($('<div/>', { class: 'grid-x grid-padding-x align-justify-x align-spaced' })
            .append($('<div/>', { class: 'cell shrink' })
                .append($('<p/>', { class: "h5 notiny" }).text('Values to decode for solution'))
                .append(solution)
                .append($('<hr/>', { class: "notiny" }))
                .append($('<p/>', { class: "h5 notiny" }).text('Cryptarithm formula'))
                .append(formulaTable)
            )
            .append($('<div/>', { class: 'cell shrink notiny' }).append(worktable.generate()))
        )
        return result;

    }
    /**
     * Sort the letter mappings so that the work array is not predictable
     * @returns Alphabetized array of the letters used in the problem
     */
    public getOutputMapping(): string[] {
        return Object.keys(this.state.mapping).sort()
    }

    /**
     * Check to see if a solution is valid for the current criteria
     * @param wordlist 
     */


    // public parsedTemplates: { [index: string]: parsedTemplate } = {
    //     // W X Y Z
    //     // W X Z Y 
    //     // W Y Z X  
    //     // X Y Z W 

    //     "A+B=C": { type: 'add', symbols: 3, uses: [[0, 1]] },
    //     "A+B+C=D": { type: 'add', symbols: 4, uses: [[0, 1, 2]] },
    //     "A+B+B=C": { type: 'add', symbols: 3, uses: [[0, 1, 1], [1, 0, 0]] },
    //     "A+A=B": { type: 'add', symbols: 2, uses: [[0, 0]] },
    //     "C-B=A": { type: 'add', symbols: 3, uses: [[0, 1]] },
    //     "D-A-B=C": { type: 'add', symbols: 3, uses: [[0, 1, 2]] },
    //     "C-A-A=B": { type: 'add', symbols: 3, uses: [[1, 1, 0], [0, 0, 1]] },
    // }

    public checkSolution(wordlist: number[], template: execTemplate): number {
        let found = 0
        // If we don't have a parsed instructions for the template, just skip out
        if (template === undefined) {
            return 0
        }
        // Make sure that this is a template that we can handle and it happens to work for
        // the number of symbols we found
        if (template.symbols !== wordlist.length || template.type !== 'add') {
            return 0
        }
        let longest = 0
        let longset: string[] = []
        const sumands: string[] = []
        for (let ent of wordlist) {
            let word = this.wordlist[ent]
            if (word.length > longest) {
                // We have a new long word, so we know any previous long words are to just be summands
                if (longset.length) {
                    sumands.push(...longset)
                }
                longset = [word]
                longest = word.length
            } else if (word.length === longest) {
                // This is just as long as the longest, so we add it to the set
                longset.push(word)
            } else {
                // Shorter than the longest, so we know it is just a summand
                sumands.push(word);
            }
        }
        // We have sumands which is the array of words we know to be added
        // longset is the set of words that are the longest length
        for (let i = 0; i < longset.length; i++) {
            const sumset = [...sumands]
            const sum = longset[i]
            for (let j = 0; j < longset.length; j++) {
                if (j !== i) {
                    sumset.push(longset[j])
                }
            }

            const sumsearch: string[] = []
            for (let k of template.uses) {
                sumsearch.push(sumset[k])
            }
            let solutions = cryptarithmSumandSearch(sumsearch, sum, this.base, false, false)
            if (solutions.count === 1) {
                found++
                // We need to build the replacement template
                let replacements = "??????????"
                for (const c of Object.keys(solutions.mapping)) {
                    replacements = setCharAt(replacements, solutions.mapping[c], c)
                }
                // There might be more than one original template which used
                // This pattern (such as A+B=C and C-A=B) so output them
                for (let formula of template.formulas) {
                    let outset = this.formatTemplateProblem(solutions.mapping, formula, sumsearch, sum, template.replaces)
                    const usebutton = $('<a/>', { class: 'rounded small button useprob', 'data-prob': outset[0], 'data-sol': replacements, 'data-dif': solutions.difficulty }).text('Use')
                    // Add a class so we can hid/show it
                    let difflevel = String(Math.min(6, solutions.difficulty))
                    let sclass = "CD" + difflevel
                    const x = $('<div/>', { class: sclass }).text(" " + outset[0] + " [" + outset[1] + "] Difficulty:" + String(solutions.difficulty))
                        .prepend(usebutton)
                    $("#findout").append(x)
                    if (!$('#d' + difflevel).is(':checked')) {
                        x.hide()
                    }
                    $(usebutton)
                        .off('click')
                        .on('click', (e) => {
                            this.setProblem(e.target)
                        })
                }
            }
        }
        return found
    }
    /**
     * Convert a template to a problem
     * @param mapping Mapping of letters to number values
     * @param template Output template
     * @param sumands sumand strings
     * @param sum sum string
     */
    public formatTemplateProblem(mapping: NumberMap, template: string, sumands: string[], sum: string, replaces: string): string[] {
        let outmap: StringMap = {}
        let vresult = ""
        const sumandcount = sumands.length
        for (let i = 0; i < sumandcount; i++) {
            let outc = replaces.substring(i, i + 1);
            outmap[outc] = sumands[i]
        }
        outmap[replaces.substring(replaces.length - 1)] = sum
        let result = ""
        for (let c of template) {
            let v = outmap[c]
            if (v === undefined) {
                result += c;
                vresult += c;
            } else {
                result += v
                // We need to map all the letters to the number values
                for (let t of v) {
                    let val = mapping[t]
                    if (val === undefined) {
                        vresult += t
                    } else {
                        vresult += val
                    }
                }
            }
        }
        return [result, vresult]
    }

    /**
     * Show the current mapping of numbers
     * @param ignorevalid Show the mapping even if it isn't valid (for debugging and tracing progress)
     */
    public showMapping(ignorevalid: boolean) {

        let showmapping = ignorevalid;
        if (this.state.validmapping) {
            showmapping = true;
            $('.updmap').attr('disabled', 'disabled')
        } else {
            $('.updmap').removeAttr('disabled')
            $('.updnote').text("Note that this can take a while depending on the problem complexity")
        }
        if (showmapping) {
            for (let c in this.state.mapping) {
                let val = this.state.mapping[c];
                $('#cm' + String(val)).text(c)
            }
        } else {
            for (let i = 0; i < this.base; i++) {
                $('#cm' + String(i)).text('?')
            }
        }
    }
    /**
     * Formats a number in the current base and returns a normalized version of it
     */
    public basedStr(val: number): string {
        return val.toString(this.base).toUpperCase();
    }
    /**
     * Safe version of eval to compute a generated formula
     */
    public compute(str: string): string {
        try {
            let val = Function('"use strict";return (' + str + ")")();
            return this.basedStr(val);
        } catch (e) {
            return str;
        }
    }

    /**
     * 
     */
    public updateMap() {
        // Ok this is going to take a while...we want to spin it off as a task that searches. 
        // We will update the display as we work, but if at any point in time they type
        // on the problem we will have to abort the process. 
        // As a test we will arbitrarily set the mappings
        let parsed = parseCryptarithm(this.state.cipherString, this.base);
        // Catch when they didn't give us anything to actually do
        if (parsed.lineitems.length === 0) {
            return this.showSearchResult(0, 100)
        }
        // See if we can shortcut this operation.  Everything except the last item should not have a forumla
        let canShortcut = true
        for (let i = 0; i < parsed.lineitems.length - 1; i++) {
            if (parsed.lineitems[i].formula !== '') {
                canShortcut = false;
                break;
            }
        }
        // If there were no formulas, we have everything on the last entry.  Promising
        if (canShortcut) {
            let solutions: cryptarithmResult = { count: 0, difficulty: 0, mapping: {} }
            // See if we can shortcut this problem.  If they only have an addition or subtraction problem
            // We can use the very fast search algorithm
            let formItem = parsed.lineitems[parsed.lineitems.length - 1]
            if (formItem.formula.match(/^[A-Z\+]*$/) !== null) {
                // We know we can try the shortcut version for an addition problem
                let sum = formItem.expected
                let sumsearch = formItem.formula.split(/\+/g)
                solutions = cryptarithmSumandSearch(sumsearch, sum, this.base, false, false)
            } else if (formItem.formula.match(/^[A-Z\-]*$/) !== null) {
                // Shortcut subtraction problems
                let sumsearch = formItem.formula.split(/-/g)
                let sum = sumsearch.shift()
                sumsearch.push(formItem.expected)
                // This is a subtraction one
                solutions = cryptarithmSumandSearch(sumsearch, sum, this.base, false, false)
            }
            // See if we were successful
            if (solutions.count === 1) {
                // We were, so propagate the information about the solution
                this.state.mapping = Object.assign({}, solutions.mapping);
                this.state.validmapping = true;
                this.state.difficulty = solutions.difficulty;
                this.doCipher();
                return;
            }
        }
        let allletters: BoolMap = {}
        let letterOrder: string[] = [];
        let formulaSet: cryptarithmForumlaItem[] = []

        for (let item of parsed.lineitems) {
            if (item.formula !== "") {
                const formulaItem: cryptarithmForumlaItem = {
                    formula: item.formula,
                    expected: item.expected,
                    totalFormula: 0,
                    totalExpected: 0,
                    usedFormula: {},
                    newFormula: {},
                    usedExpected: {},
                    newExpected: {}
                }

                for (let c of item.formula) {
                    if (parsed.usedletters[c]) {
                        formulaItem.usedFormula[c] = true;
                        if (!allletters[c]) {
                            allletters[c] = true;
                            letterOrder.push(c)
                            formulaItem.newFormula[c] = true;
                        }
                    }
                }
                formulaItem.totalFormula = letterOrder.length
                for (let c of item.expected) {
                    if (parsed.usedletters[c]) {
                        formulaItem.usedExpected[c] = true;
                        if (!allletters[c]) {
                            allletters[c] = true;
                            letterOrder.push(c)
                            formulaItem.newExpected[c] = true;
                        }
                    }
                }
                formulaItem.totalExpected = letterOrder.length
                formulaSet.push(formulaItem)
            }
        }
        // It is possible that some of the letters used don't actually appear in a formula 
        // For example with the remainder of a division.  We just need to add them to the list of letters
        for (let c in parsed.usedletters) {
            if (!allletters[c]) {
                letterOrder.push(c);
                allletters[c] = true;
            }
        }
        let legal = buildLegal(parsed, this.base);
        this.try(formulaSet, legal, letterOrder);
    }
    /**
     * Start the process of searching for matching formulas
     * @param formulaSet The set of formulas to match against (we only look at the first one at this level)
     * @param legal The possible legal values to match against
     * @param letterOrder The order of letters to be substituting for
     */
    public try(formulaSet: cryptarithmForumlaItem[], legal: legalMap, letterOrder: string[]) {
        this.trystep(formulaSet, legal, letterOrder, -1, 0, 0, 0)
    }
    /**
     * Substitutes all the current mappings in a string and converts to base 10 to evaluate
     * @param str String to sustitute
     * @param legal Current mappings
     * @returns 
     */
    public subFormula(str: string, legal: legalMap): string {
        let result = ""
        for (let c of str) {
            if (legal[c] !== undefined) {
                result += legal[c][0]
            } else {
                result += c;
            }
        }
        // Now we need to convert everything to base 10 so we can
        // properly evaluate it
        let gathered = "";
        let intermediate = result;
        result = "";
        for (let c of intermediate) {
            if (!isNaN(parseInt(c, this.base))) {
                // Throw away leading zeros so that it will parse
                if (gathered === "0") {
                    gathered = c;
                } else {
                    gathered += c;
                }
            } else if (gathered !== "") {
                result += parseInt(gathered, this.base) + c;
                gathered = "";
            } else {
                result += c;
            }
        }
        if (gathered !== "") {
            result += parseInt(gathered, this.base);
        }
        return result;
    }
    /**
     * 
     * @param str Result string to look at
     * @param legal 
     * @returns 
     */
    public checkResult(computed: string, expected: string, used: Boolean[], legal: legalMap): boolean {
        let len = computed.length;
        if (len !== expected.length) {
            return false;
        }

        let subUsed = [...used]
        const subLegal: legalMap = {}
        for (let c in legal) {
            subLegal[c] = legal[c]
        }

        for (let i = 0; i < len; i++) {
            let cv = parseInt(computed.substring(i, i + 1), this.base);
            let ec = expected.substring(i, i + 1)
            if (subLegal[ec].length === 1) {
                if (subLegal[ec][0] !== cv) {
                    return false;
                }
            } else {
                if (subUsed[cv] || !subLegal[ec].includes(cv)) {
                    return false;
                }
                subUsed[cv] = true;
                subLegal[ec] = [cv]
            }
        }
        return true;
    }
    /**
     * Evaluate everything at a level checking for a match
     * @param level How far down in the letter set we are
     * @param formulaSet The set of formulas to match against (we only look at the first one at this level)
     * @param legal The possible legal values to match against
     * @param letterOrder The order of letters to be substituting for
     * @param used Which values are already used
     * @param found How many matches we have found
     * @returns Number of matches found added to found (i.e. found if none were found or found+1 if one is found)
     */

    public tryLevel(level: number, formulaSet: cryptarithmForumlaItem[], legal: legalMap, letterOrder: string[], used: Boolean[], found: number): number {
        let formulapos = 0
        let formulaItem = formulaSet[formulapos];

        let subUsed = [...used]
        const subLegal: legalMap = {}
        for (let c of letterOrder) {
            subLegal[c] = legal[c]
        }

        // See if we have enough letters to satisfy a formula without having to map any new letters.
        while (level >= formulaItem.totalFormula) {
            // We have enough to substitute for the formula.  
            let formula = this.subFormula(formulaItem.formula, subLegal)
            let result = this.compute(formula);
            if (!this.checkResult(result, formulaItem.expected, subUsed, subLegal)) {
                // It doesn't match, so there is no reason to try anything else.
                return found;
            }
            // Ok it checks out, now we need to fill in the legal values because there are more formulas to go
            if (formulaItem.totalExpected > level) {
                for (let i = 0; i < result.length; i++) {
                    let cv = parseInt(result.substring(i, i + 1), this.base);
                    let ec = formulaItem.expected.substring(i, i + 1)
                    subLegal[ec] = [cv]
                    subUsed[cv] = true
                }
                level = formulaItem.totalExpected;
            }
            formulapos++
            if (formulapos == formulaSet.length) {
                // Success!!!!
                if (found == 0) {
                    // We need to save the mappings
                    this.state.mapping = {}
                    for (let c in subLegal) {
                        if (subLegal[c].length === 1) {
                            this.state.mapping[c] = subLegal[c][0];
                        } else {
                            let filtered = this.filterSet(subLegal[c], subUsed)
                            if (filtered.length === 1) {
                                const v = filtered[0]
                                subUsed[v] = true
                                this.state.mapping[c] = v
                            }
                        }
                    }
                }
                return found + 1;
            }
            // We know there is at least one more formula available to us
            formulaItem = formulaSet[formulapos]
        }

        // If there are no more formulas, then we have solved the problem
        // Note that this does mean that not all the letters are known
        if (formulapos >= formulaSet.length) {
            console.log('****Incomplete Solution???')
            // We need to save the mappings
            this.state.mapping = {}
            for (let c in subLegal) {
                if (subLegal[c].length === 1) {
                    this.state.mapping[c] = subLegal[c][0];
                }
            }
            return 1;
        }
        // We don't have enough known letters to try out the formula, so try an extra one and recurse to see if it is enough            
        let l = letterOrder[level];
        let subset = [...subLegal[l]]
        for (const v of subset) {
            if (!subUsed[v]) {
                subUsed[v] = true
                subLegal[l] = [v]
                // We need to filter out all the values that aren't legal for the remaining letters
                for (let i = level + 1; i < this.base; i++) {
                    const sc = letterOrder[i]
                    if (sc !== undefined) {
                        subLegal[sc] = this.filterSet(legal[sc], subUsed)
                    }
                }
                // Now we need to try a lower level to check the result
                found = this.tryLevel(level + 1, formulaSet.slice(formulapos), subLegal, letterOrder, subUsed, found);
                // If we have more than one match, exit quickly
                if (found > 1) {
                    return found;
                }
                subUsed[v] = false
            }
        }
        return found;
    }
    /**
     * Filter an arry of values to identify only the legal ones that can still be used
     * @param vals array of values to filter
     * @param used Indicator of values that have already been used
     * @returns Filtered array 
     */
    public filterSet(vals: number[], used: Boolean[]): number[] {
        let result: number[] = [];
        for (let v of vals) {
            if (!used[v]) {
                result.push(v)
            }
        }
        return result;
    }

    /**
     * Try one level of the numbers to see if a solution can be matched
     * Note that this routine breaks for the UI to get a chance to update because the lower level code may
     * take some time to run.
     * @param formulaSet The set of formulas to try
     * @param legal The current mapping of arrays of legal values for each letter
     * @param letterOrder The order of letters to try
     * @param l1pos Position in the first set of letters to try
     * @param l2pos Position in the second set of letters to try
     * @param l3pos Position in the third set of letters to try
     * @param found Number of solutions found.
     * @returns 
     */
    public trystep(formulaSet: cryptarithmForumlaItem[], legal: legalMap, letterOrder: string[], l1pos: number, l2pos: number, l3pos: number, found: number) {
        const l1 = letterOrder[0]
        const l2 = letterOrder[1]
        const l3 = letterOrder[2]
        // First we need to pick the letter assignments that we are going to work from.
        for (; ;) {
            const l1len = legal[l1].length
            const l2len = legal[l2].length
            const l3len = legal[l3].length
            const pctdone = 100.0 * ((l1pos + ((l2pos + (l3pos * l2len)) * l1len)) / (l1len * l2len * l3len))
            // Find the first set of three values which are all unique
            l1pos++;
            if (l1pos >= l1len) {
                l1pos = 0;
                l2pos++;
                if (l2pos >= l2len) {
                    l2pos = 0;
                    l3pos++;
                    if (l3pos >= l3len) {
                        // WE ARE DONE!!!!
                        this.showSearchResult(found, 100.0);
                        return;
                    }
                }
            }
            const l1c = legal[l1][l1pos];
            const l2c = legal[l2][l2pos];
            const l3c = legal[l3][l3pos];
            if (l1c !== l2c && l1c !== l3c && l2c !== l3c) {
                const subLegal: legalMap = {}
                const used: Boolean[] = makeFilledArray(this.base, false)
                subLegal[l1] = [l1c]
                subLegal[l2] = [l2c]
                subLegal[l3] = [l3c]
                used[l1c] = true
                used[l2c] = true
                used[l3c] = true
                for (let i = 3; i < letterOrder.length; i++) {
                    let c = letterOrder[i]
                    subLegal[c] = this.filterSet(legal[c], used);
                }
                // We have a working set.  Time to iterate over the entire formula.
                const newfound = this.tryLevel(3, formulaSet, subLegal, letterOrder, used, found)
                if (newfound !== found) {
                    found = newfound
                    if (found === 1) {
                        this.showMapping(true);
                    } else {
                        // We have more than one solution so we are done
                        return;
                    }
                }
                this.showSearchResult(found, pctdone)
                // Either one or no solutions, so keep trying to search
                setTimeout(() => { this.trystep(formulaSet, legal, letterOrder, l1pos, l2pos, l3pos, found) }, 1)
                return;
            }
        }
    }
    /**
     * Update the UI to show the search results
     * @param found Number of solutions found
     */
    public showSearchResult(found: number, pctdone: number) {
        let status = ""
        if (pctdone < 100.0) {
            status = String(Math.round(pctdone)) + "% Complete - ";
        }
        if (found === 1) {
            this.state.validmapping = true;
            if (status === "") {
                $(".updnote").text('One solution found.');
            } else {
                $(".updnote").text(status + 'One solution found. Searching for additional solutions');
            }
            this.updateOutput();
        } else if (found > 1) {
            this.state.validmapping = false;
            $(".updnote").text('Invalid problem.  More than one solution found.');
        } else if (status === "") {
            this.state.validmapping = false;
            $(".updnote").text('Invalid problem.  No solutions found.');
        } else {
            $(".updnote").text(status + 'Searching for solutions.  None found yet.');
        }
    }

    /**
     * Switch to problem generation mode
     */
    public doGenerate() {
        this.generatemode = true;
        this.updateOutput();
    }
    /**
     * Switch to problem edit mode
     */
    public doCipher() {
        this.generatemode = false;
        this.setSearching(false);
        this.updateOutput();
    }

    public setProblem(elem: HTMLElement) {
        const problem = $(elem).attr('data-prob')
        const replacement = $(elem).attr('data-sol')
        const difficulty = parseInt($(elem).attr('data-dif'))
        this.setCipherString(problem)
        this.state.difficulty = difficulty
        // We need to set the replacements

        this.state.validmapping = true;
        this.state.mapping = {};
        for (let i = 0; i < replacement.length; i++) {
            this.state.mapping[replacement.substring(i, i + 1)] = i
        }
        this.doCipher()
    }
    /**
     * Enable/disable showing of a difficulty level
     * @param elem Element that they clicked on for filtering difficulty
     */
    public filterDifficulty(elem: HTMLElement) {
        let jqelem = $(elem)
        const filter = (jqelem.attr('id') as string).substring(1, 2)
        if (jqelem.is(":checked")) {
            $('.CD' + filter).show()
        } else {
            $('.CD' + filter).hide()
        }
        this.countHidden()
    }

    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.tall')
            .off('click')
            .on('click', () => {
                this.enableAllTargets()
            })

        $('.tnone')
            .off('click')
            .on('click', () => {
                this.disableTargets()
            })
        $('.taddsub')
            .off('click')
            .on('click', () => {
                this.enableTargets('add')
            })
        $('.tmul')
            .off('click')
            .on('click', () => {
                this.enableTargets('mul')
            })
        $('.tdiv')
            .off('click')
            .on('click', () => {
                this.enableTargets('div')
            })
        $('.findprobs')
            .off('click')
            .on('click', () => {
                this.findProblems()
            })
        $('.updmap')
            .off('click')
            .on('click', () => {
                this.updateMap()
            })
        $('#generate')
            .off('click')
            .on('click', () => {
                this.doGenerate();
            })
        $('#docipher')
            .off('click')
            .on('click', () => {
                this.doCipher();
            })
        $('#soltext')
            .off('input')
            .on('input', (e) => {
                const soltext = $(e.target).val() as string;
                if (soltext !== this.state.soltext) {
                    this.markUndo('keyword');
                    if (this.setSoltext(soltext)) {
                        this.updateOutput();
                    }
                }
            });
        $('#stopsearch')
            .off('click')
            .on('click', () => {
                this.setSearching(false);
            })
        $('.useprob')
            .off('click')
            .on('click', (e) => {
                this.setProblem(e.target)
            })
        $('.difchk')
            .off('click')
            .on('click', (e) => {
                this.filterDifficulty(e.target)
            })
        $('#wordlist')
            .off('change')
            .on('change', (e) => {
                const wordliststr = ($(e.target).val() as string).trim().toUpperCase();
                let wordlist = [];
                if (wordliststr !== "") {
                    wordlist = wordliststr.split(/[^A-Z]+/);
                }
                if (wordlist.join(' ') !== this.wordlist.join(' ')) {
                    this.markUndo('wordlist');
                    if (this.setWordlist(wordlist)) {
                        this.updateOutput();
                    }
                }
            });


    }
}
