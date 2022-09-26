import { cloneObject, makeFilledArray, BoolMap, NumberMap } from '../common/ciphercommon';
import {
    IState,
    ITestType,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { buildSolver, cryptarithmParsed, cryptarithmSumandSearch, parseCryptarithm } from '../common/cryptarithm';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherEncoder } from './cipherencoder';

interface ICryptarithmState extends IState {
    /** Problem */
    problem: string;
    /** Keywords for generating the problem */
    wordlist: string[];
}

type ITemplateType = 'add' | 'mul' | 'div' | 'root';


interface ITemplate {
    type: ITemplateType,
    template: string,
}

/**
 * CipherCryptarithmEncoder implements the Cryptarithm methods
 */
export class CipherCryptarithmEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Cryptarithm';
    public wordmatches: number[][][];

    public templates: ITemplate[] = [
        { type: 'add', template: "A+B=C" },
        { type: 'add', template: "A+B+C=D" },
        { type: 'add', template: "A+B+B=C" },
        { type: 'add', template: "A+A=B" },
        { type: 'add', template: "A-B=C" },
        { type: 'add', template: "A-B-C=D" },
        { type: 'add', template: "A-B-B=C" },
        // { type: 'add', template: "A+B=C; D+E=F" },  // TODO: Need to support multiple operations
        // { type: 'add', template: "A+B=C; D-E=F" },  // TODO: Need to support multiple operations
        { type: 'mul', template: "A*B=C" },
        // { type: 'mul', template: "A*B=?" },  // TODO: Need to be able to specify the result
        { type: 'div', template: "A/B=C" },
        // { type: 'div', template: "A/B=?" },  // TODO: Need to be able to specify the result
    ]

    public validTests: ITestType[] = [
        ITestType.None,
        ITestType.cregional,
        ITestType.cstate,
        ITestType.bregional,
        ITestType.bstate,
    ];

    public defaultstate: ICryptarithmState = {
        /** The type of operation */
        operation: 'encode' /** a value */,
        problem: '',
        wordlist: [],
        cipherString: '' /** The type of cipher we are doing */,
        cipherType: ICipherType.Cryptarithm /** The first clicked number in the solution */,
        replacement: {},
    };

    public testButton: JTButtonItem = {
        title: 'Test',
        id: 'test1',
        color: 'primary',
    };
    public state: ICryptarithmState = cloneObject(this.defaultstate) as ICryptarithmState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.testButton,
        this.guidanceButton,
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
     * Update the list of words to search for
     * @param wordlist List of words to set
     * @returns true if the wordlist has changed
     */
    public setWordlist(wordlist: string[]): boolean {
        let changed = false;
        if (wordlist.join(' ') !== this.state.wordlist.join(' ')) {
            this.state.wordlist = wordlist;
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
        $('#wordlist').val(this.state.wordlist.join('\n'))

        this.guidanceURL = 'TestGuidance.html#Cryptarithm';

        this.validateQuestion();
        this.attachHandlers();
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
    public validateQuestion(): void {
        let msg = '';
        let sampleLink: JQuery<HTMLElement> = undefined;
        // const questionText = this.state.question.toUpperCase();
        if (msg !== '') {
            sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');
        }

        this.setErrorMsg(msg, 'vq', sampleLink);
    }
    /**
     * Generates the sample question text for a cipher
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {
        let msg = '<p>Decode the following Cryptarithm by figuring out what letters stand for which numbers.</p>';
        return msg;
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
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.  This returns the result
     * as the HTML to be displayed
     */
    public build(): JQuery<HTMLElement> {
        // const msg = this.minimizeString(this.state.cipherString);
        // const strings = this.buildReplacement(msg, this.maxEncodeWidth);
        // const result = $('<div/>');
        // for (const strset of strings) {
        //     const table = new JTTable({
        //         class: 'cell shrink tfreq',
        //     });
        //     const toprow = table.addBodyRow();
        //     const bottomrow = table.addBodyRow();
        //     for (let i = 0; i < strset[0].length; i++) {
        //         const plainchar = strset[1].substring(i, i + 1);
        //         const cipherchar = strset[0].substring(i, i + 1);

        //         if (this.isValidChar(plainchar)) {
        //             toprow.add({
        //                 settings: {
        //                     class: 'TOSOLVE',
        //                     id: 'm' + i,
        //                 },
        //                 content: cipherchar,
        //             });
        //             bottomrow.add({
        //                 settings: {
        //                     class: 'TOANSWER',
        //                     id: 'p' + i,
        //                 },
        //                 content: plainchar,
        //             });
        //         }
        //     }
        //     result.append(table.generate());
        // }

        const result = $('<div/>', { class: 'grid-x' });
        let foo = parseCryptarithm(this.state.cipherString, 10);
        result.append(this.buildSolver(foo))

        return result;
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
        const result = $('<div/>', { class: 'grid-x' });
        let foo = parseCryptarithm(this.state.cipherString, 10);
        result.append(buildSolver(foo))
        // let plainindex = 0;
        // let cipherindex = 1;
        // const strings = this.buildReplacement(this.state.cipherString, 40);
        // const table = new JTTable({
        //     class: 'ansblock shrink cell unstriped',
        // });
        // for (const strset of strings) {
        //     this.addCipherTableRows(
        //         table,
        //         undefined,
        //         strset[plainindex],
        //         strset[cipherindex],
        //         true
        //     );
        // }
        // result.append(table.generate());
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
        const result = $('<div/>', { class: 'grid-x' });

        let foo = parseCryptarithm(this.state.cipherString, 10);
        result.append(buildSolver(foo))

        // let plainindex = 0;

        // const strings = this.buildReplacement(this.state.cipherString, 40);
        // const table = new JTTable({
        //     class: 'ansblock shrink cell unstriped',
        // });
        // for (const strset of strings) {
        //     this.addCipherTableRows(table, undefined, strset[plainindex], undefined, true);
        // }
        // result.append(table.generate());
        // result.append($('<div/>', { class: 'cell Cryptarithmwork' }));
        return result;
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
        const msg = this.minimizeString(this.state.cipherString);
        const result = $('<div/>', { id: 'solution' });
        result.append($('<h3/>').text('How to solve'));
        const p = $('<p/>').text(`Assume magic happens! ${msg}`);
        result.append(p)
        return result;
    }

    public genx(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'cell small-6 medium-3 large-3' })
        result.append($('<div/>', { class: 'toptitle' }).text('Problem Style'))
        result.append(
            $('<div/>', { class: 'expanded button-group round shrink' })
                .append($('<a/>', { class: 'tall button' }).text('All'))
                .append($('<a/>', { class: 'tnone button' }).text('None'))
                .append($('<a/>', { class: 'taddsub button' }).text('+/-'))
                .append($('<a/>', { class: 'tmul button' }).text('*'))
                .append($('<a/>', { class: 'tdiv button' }).text('/'))
        )
        for (const i in this.templates) {
            const inputgroup = $('<div/>', { class: 'input-group' });
            // For a checkbox, the value is a boolean indicated that it should be checked
            const checkbox =
                $('<input/>', {
                    id: "A" + String(i),
                    class: 'input-group-button checkbox targany targ' + this.templates[i].type,
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
        this.genTestUsage(result);
        result.append(this.createQuestionTextDlg());
        this.genQuestionFields(result);
        result.append($('<div/>', { class: 'grid-x' })
            .append(JTFLabeledInput("Problem", "text", "toencode", this.state.cipherString, 'auto'))
            .append($('<div/>', { class: 'cell shrink' })
                .append($('<a/>', {
                    // 'showing': 'off',
                    class: 'doprob button',
                }).text('Create'))))
        result.append($('<div/>', { class: 'callout secondary probwork', style: 'display:none' })
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
                .append(this.genx())
                .append($('<div/>', { class: 'cell small-12 medium-6 large-6' })
                    .append($('<div/>', { class: 'toptitle' }).text('Potential Cryptarithms'))
                    .append($('<button/>', { class: 'findprobs button rounded' }).text('Search'))
                    .append($('<div/>', { class: 'callout warning', id: 'searchres' }).text('None found'))
                    .append($('<div/>', { class: 'findout', id: 'findout' }))
                )
            ))
        result.append($('<div/>', { class: 'grid-x' })
            .append(JTFLabeledInput("Solution", "text", "toencode", this.state.cipherString, 'auto'))
            .append($('<div/>', { class: 'cell shrink' })
                .append($('<a/>', {
                    // 'showing': 'off',
                    class: 'dosol button',
                }).text('Generate'))))
        result.append($('<div/>', { class: 'callout secondary solwork', style: 'display:none' }).append($('<div/>').text("problem work")))
        // .append($('<div/>', { class: 'cell shrink' })
        //     .append($('<a/>', {
        //         class: 'exportcsv button', disabled: 'disabled',
        //     }).text('Export CSV'))));
        // const inputbox = $('<div/>', {
        //     class: 'grid-x grid-margin-x',
        // });
        // inputbox.append(JTFIncButton('A', 'a', this.state.a, 'small-12 medium-4 large-4'));
        // inputbox.append(JTFIncButton('B', 'b', this.state.b, 'small-12 medium-4 large-4'));
        // result.append(inputbox);
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
    public enableTargets(targetset: ITemplateType) {
        $('.targany').prop('checked', false)
        $('.targ' + targetset).prop('checked', true)

    }
    public disableTargets() {
        $('.targany').prop('checked', false)
    }
    public enableAllTargets() {
        $('.targany').prop('checked', true)
    }
    public setSearchResult(status: string, calloutclass: 'secondary' | 'primary' | 'success' | 'warning' | 'alert'): void {
        $('#searchres')
            .empty()
            .removeClass('secondary')
            .removeClass('primary')
            .removeClass('success')
            .removeClass('warning')
            .removeClass('alert')
            .addClass(calloutclass).append($('<div/>').text(status))
    }
    public findx(basestr: string, index: number, depth: number, choices: number[], count: number): number {
        let localcount = 0;
        for (let i = index + 1; i < this.state.wordlist.length; i++) {
            let thisstr = basestr + this.state.wordlist[i];
            let unique = new Set(thisstr.split("")).size
            // console.log(`++Check ${thisstr} unique=${unique} depth=${depth}`)
            localcount++;
            if (unique <= 10) {
                let localset = choices.slice();
                localset.push(i)
                // This is a valid one, so we remember it
                if (unique === 10) {
                    this.wordmatches[depth].push(localset);
                    // Let/s report the match
                    let extra = ""
                    let output = `Found match of ${depth} with `;
                    for (let ent of localset) {
                        output += extra + this.state.wordlist[ent]
                        extra = ", "
                    }
                    $("#findout").append($('<div/>').text(output))
                }
                if (depth < 6) {
                    count += this.findx(thisstr, i, depth + 1, localset, count)
                }
            }
        }
        return localcount;
    }
    public matchOne(depth: number, slot: number, templates: string[]) {
        // Find us a slot to work on
        // console.log(`matchOne depth=${depth} slot=${slot} entries=${this.wordmatches[depth].length} templates=${templates.join(',')}`)
        while (depth <= 7 && slot >= this.wordmatches[depth].length) {
            depth++;
            slot = 0;
        }
        if (depth <= 7) {
            // Let/s report the match
            let extra = ""
            let output = `Working on depth ${depth} with `;
            for (let ent of this.wordmatches[depth][slot]) {
                output += extra + this.state.wordlist[ent]
                extra = ", "
            }
            this.checkSolution(this.wordmatches[depth][slot])
            this.setSearchResult(output, 'secondary')

            slot++;
            setTimeout(() => { this.matchOne(depth, slot, templates) }, 10)
        } else {
            this.setSearchResult('Complete', 'primary')
        }
    }

    // Find all the groups of <n> words which include exactly 10 unique letters
    public findWordGroups(templates: string[]) {
        this.wordmatches = [];
        for (let depth = 0; depth < 8; depth++) {
            this.wordmatches.push([])
        }
        for (let i = 0; i < this.state.wordlist.length; i++) {
            this.findx(this.state.wordlist[i], i, 2, [i], 0)
        }
        // Now figure out how many matches we found
        let finalcount = 0;
        for (let depth in this.wordmatches) {
            finalcount += this.wordmatches[depth].length
        }
        this.setSearchResult(`Found ${finalcount} potential wordsets`, 'primary')
        //next we want to test out each one to see if we can find a solution for it
        setTimeout(() => { this.matchOne(2, 0, templates) }, 10);
    }

    /**
     * Find all problems which meet the critaria
     */
    public findProblems() {
        this.setSearchResult('working with ' + this.state.wordlist.length + ' words.', 'success');
        // Figure out what templates they are going to use
        const templatechoices = $('.targany:checked');
        if (this.state.wordlist.length < 2) {
            this.setSearchResult('The "Words to Try" list needs to have at least two words to work from.  Did you enter any?', 'alert')
        } else if (templatechoices.length === 0) {
            this.setSearchResult('No "Problem Style" templates have been selected.  Please select what type of problem to search for', 'alert')
        } else {
            const templates: string[] = [];
            templatechoices.each((i, elem) => {
                templates.push($(elem).attr('data-template'))
            })
            this.findWordGroups(templates);
        }
    }

    /**
     * 
     * @param formula Parsed Cryptarithm to generate output for
     * @returns HTML representation of output
     */
    public buildSolver(formula: cryptarithmParsed): JQuery<HTMLElement> {
        // We have built the lineitems array, now we just need to turn it into
        // a table (respecting the maxwidth)
        let table = $("<table/>", { class: "cmath unstriped plain" });
        let tbody = $("<tbody/>");
        for (let item of formula.lineitems) {
            let tr = $("<tr/>");
            // Pad on the left with as many columns as we need
            if (item.content.length < formula.maxwidth) {
                $("<td/>", {
                    colspan: formula.maxwidth - item.content.length,
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
                    td = $("<td/>").text(item.prefix); //.addClass("math")
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
                    $("<div/>", { class: "slil" })
                        .text(c)
                        .appendTo(td);
                    if (c === ")") {
                        td.addClass("math");
                        addclass = "ovl";
                    } else if (formula.usedletters[c]) {
                        $("<input/>", {
                            type: "text",
                            class: "sli",
                            "data-char": c,
                        }).appendTo(td);
                    }
                    if (addclass) {
                        td.addClass(addclass);
                    }
                    td.appendTo(tr);
                }
            }
            let content = $("");
            if (item.formula !== "") {
                content = $("<span/>", {
                    class: "formula",
                    "data-formula": item.formula,
                    "data-expect": item.expected,
                });
            }

            $("<td/>", { class: "solv" })
                .append(content)
                .appendTo(tr);
            tr.appendTo(tbody);
        }

        tbody.appendTo(table);

        return table;
    }

    /**
     * Check to see if a solution is valid for the current criteria
     * @param wordlist 
     */
     public checkSolution(wordlist: number[]) {
        const sumands: string[] = []
        for (let ent of wordlist) {
            sumands.push(this.state.wordlist[ent]);
        }
        const desc = sumands.sort((a, b) => b.length - a.length);

        let sum = sumands.shift();
        const solutions = cryptarithmSumandSearch(sumands, sum, 10);

    }
    /**
     * Test out the solver to make sure it works
     */
    public doTest() {
        const sumands = ["SATURN", "URANUS"]
        const sum = "PLANETS"
        cryptarithmSumandSearch(sumands, sum)
    }

    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.doprob')
            .off('click')
            .on('click', (e) => {
                $('.probwork').toggle();
            });

        $('.dosol')
            .off('click')
            .on('click', (e) => {
                $('.solwork').toggle();
            });
        $('.tall')
            .off('click')
            .on('click', (e) => {
                this.enableAllTargets()
            })

        $('.tnone')
            .off('click')
            .on('click', (e) => {
                this.disableTargets()
            })
        $('.taddsub')
            .off('click')
            .on('click', (e) => {
                this.enableTargets('add')
            })
        $('.tmul')
            .off('click')
            .on('click', (e) => {
                this.enableTargets('mul')
            })
        $('.tdiv')
            .off('click')
            .on('click', (e) => {
                this.enableTargets('div')
            })
        $('.findprobs')
            .off('click')
            .on('click', (e) => {
                this.findProblems()
            })
        $('#test1')
            .off('click')
            .on('click', (e) => {
                this.doTest();
            })
        $('#wordlist')
            .off('input')
            .on('input', (e) => {
                const wordliststr = ($(e.target).val() as string).trim().toUpperCase();
                let wordlist = [];
                if (wordliststr !== "") {
                    wordlist = wordliststr.split(/[^A-Z]+/);
                }
                if (wordlist.join(' ') !== this.state.wordlist.join(' ')) {
                    this.markUndo('wordlist');
                    if (this.setWordlist(wordlist)) {
                        this.updateOutput();
                    }
                }
            });


    }
}
