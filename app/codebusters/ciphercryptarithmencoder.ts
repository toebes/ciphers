import { BoolMap, cloneObject, makeCallout, makeFilledArray, NumberMap, StringMap } from '../common/ciphercommon';
import {
    IState,
    ITestType,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { buildLegal, cryptarithmForumlaItem, cryptarithmParsed, cryptarithmSumandSearch, legalMap, parseCryptarithm } from '../common/cryptarithm';
import { JTButtonItem, JTButtonGroup } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherEncoder } from './cipherencoder';

interface ICryptarithmState extends IState {
    /** Problem */
    problem: string;
    /** Keywords for generating the problem */
    wordlist: string[];
    /** Mapping of letters to values */
    mapping: NumberMap;
    /** The mapping is valid for the formula */
    validmapping: boolean;
    /** The solution text */
    soltext: string;
}

type ITemplateType = 'add' | 'mul' | 'div' | 'root';

interface ITemplate {
    type: ITemplateType,
    template: string,
}

interface parsedTemplate {
    type: ITemplateType;
    symbols: number;
    uses: number[][];
    replaces: string;

}

/**
 * CipherCryptarithmEncoder implements the Cryptarithm methods
 */
export class CipherCryptarithmEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Cryptarithm';
    //    public wordmatches: number[][][];

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
    public parsedTemplates: { [index: string]: parsedTemplate } = {
        // W X Y Z
        // W X Z Y 
        // W Y Z X  
        // X Y Z W 

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
        operation: 'encode' /** a value */,
        problem: '',
        wordlist: [],
        cipherString: '' /** The type of cipher we are doing */,
        soltext: '', /**  */
        cipherType: ICipherType.Cryptarithm /** The first clicked number in the solution */,
        replacement: {},
        mapping: {},
        validmapping: false,
    };

    public base = 10;
    public generatemode = false;
    public doingSearch = false;
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

    public problemButtons: JTButtonItem[] = [
        this.searchButton,
        this.stopSearchButton,
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
     * Updates the stored state cipher string
     * @param cipherString Cipher string to set
     */
    public setCipherString(cipherString: string): boolean {
        let changed = super.setCipherString(cipherString);
        if (changed) {
            this.state.validmapping = false;
        }
        return changed;
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
        $('#wordlist').val(this.state.wordlist.join('\n'))
        $('#soltext').val(this.state.soltext);

        this.showMapping(false);

        this.guidanceURL = 'TestGuidance.html#Cryptarithm';

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
        cipherwork.append(this.createQuestionTextDlg());
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
        result.append($('<div/>', { class: 'callout secondary probwork' })

            .append($('<div/>', { class: 'toptitle' }).text('Potential Cryptarithms'))
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
            .addClass(calloutclass).append($('<div/>').text(status))
    }
    /**
     * Find a set of strings which have 10 unique characters
     * @param basestr Collected string so far
     * @param index Where we are in the wordlist
     * @param depth How many words we have collected
     * @param choices Words in the list that we have picked so far
     */
    public findx(basestr: string, index: number, depth: number, choices: number[], templates: string[], maxdepth: number): number {
        let count = 0;
        for (let i = index + 1; i < this.state.wordlist.length; i++) {
            let thisstr = basestr + this.state.wordlist[i];
            let unique = new Set(thisstr.split("")).size
            // console.log(`++Check ${thisstr} unique=${unique} depth=${depth}`)
            if (unique <= this.base) {
                let localset = choices.slice();
                localset.push(i)
                // This is a valid one, so we remember it
                if (unique === this.base) {
                    // Let'/'s report the match
                    let extra = ""
                    let output = `Checking potential of ${depth} with `;
                    for (let ent of localset) {
                        output += extra + this.state.wordlist[ent]
                        extra = ", "
                    }
                    // $("#findout").append($('<div/>').text(output))
                    this.setSearchResult(output, 'secondary')

                    for (let template of templates) {
                        count += this.checkSolution(localset, template)
                    }
                }
                if (depth < maxdepth) {
                    count += this.findx(thisstr, i, depth + 1, localset, templates, maxdepth)
                }
            }
        }
        return count;
    }
    public setSearching(doingSearch: boolean) {
        this.doingSearch = doingSearch
        if (doingSearch) {
            $('.findprobs').attr('disabled', 'disabled')
            $('#stopsearch').removeAttr('disabled')
            $('#docipher').attr('disabled', 'disabled')
        } else {
            $('.findprobs').removeAttr('disabled')
            $('#stopsearch').attr('disabled', 'disabled')
            $('#docipher').removeAttr('disabled')
        }
    }
    // public matchOne(depth: number, slot: number, templates: string[]) {
    //     // Find us a slot to work on
    //     // console.log(`matchOne depth=${depth} slot=${slot} entries=${this.wordmatches[depth].length} templates=${templates.join(',')}`)
    //     while (depth <= 7 && slot >= this.wordmatches[depth].length) {
    //         depth++;
    //         slot = 0;
    //     }
    //     if (depth <= 7) {
    //         // Let/s report the match
    //         let extra = ""
    //         let output = `Working on depth ${depth} with `;
    //         for (let ent of this.wordmatches[depth][slot]) {
    //             output += extra + this.state.wordlist[ent]
    //             extra = ", "
    //         }
    //         $("#findout").append($('<div/>').text(output))

    //         for (let template of templates) {
    //             this.checkSolution(this.wordmatches[depth][slot], template)
    //         }
    //         this.setSearchResult(output, 'secondary')

    //         slot++;
    //         if (this.doingSearch) {
    //             setTimeout(() => { this.matchOne(depth, slot, templates) }, 10)
    //         } else {
    //             this.setSearchResult('Search Stopped', 'warning')
    //         }
    //     } else {
    //         this.setSearching(false);
    //         this.setSearchResult('Search Complete', 'primary')
    //     }
    // }

    /**
     * Process one word in the word list to find all other matches
     * @param index Index into the word list to look at
     * @param templates Templates to match against
     */
    public findOneWordSet(index: number, count: number, templates: string[], maxdepth: number) {
        if (index < this.state.wordlist.length) {
            count += this.findx(this.state.wordlist[index], index, 2, [index], templates, maxdepth)

            if (this.doingSearch) {
                setTimeout(() => { this.findOneWordSet(index + 1, count, templates, maxdepth) }, 10);
            } else {
                this.setSearchResult('Search Stopped ' + String(count) + " Cryptarithms found", 'warning')
            }
            return;
        }
        this.setSearching(false);
        this.setSearchResult('Search Complete: ' + String(count) + " Cryptarithms found", 'success')
    }
    /**
     * Find all the groups of <n> words which include exactly 10 unique letters
     * @param templates Templates to match against
     */
    public findWordGroups(templates: string[]) {
        this.setSearching(true);
        $("#findout").empty();
        let maxdepth = 0
        for (let template of templates) {
            const parsed = this.parsedTemplates[template]
            if (parsed.symbols > maxdepth) {
                maxdepth = parsed.symbols
            }
        }
        this.findOneWordSet(0, 0, templates, maxdepth)
    }

    /**
     * Find all problems which meet the critaria
     */
    public findProblems() {
        // Let them know we are in search mode
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
     * @param parsed Parsed Cryptarithm to generate output for
     * @returns HTML representation of output
     */
    public buildSolver(parsed: cryptarithmParsed, showanswer: boolean): JQuery<HTMLElement> {
        // We have built the lineitems array, now we just need to turn it into
        // a table (respecting the maxwidth)
        let formulaTable = $("<table/>", { class: "cmath unstriped plain" });
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
            // Build the mapping table
            const anstable = new JTTable({
                class: 'ansblock shrink cell unstriped',
            });
            const toprow = anstable.addBodyRow();
            const bottomrow = anstable.addBodyRow();
            for (let c of this.state.soltext.toUpperCase()) {
                let v = this.state.mapping[c]
                if (c === ' ') {
                    toprow.add(' ')
                    bottomrow.add({
                        content: '&nbsp;',
                    })
                } else if (v === undefined) {
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
        top.add('')
        for (let i = 0; i < this.base; i++) {
            top.add(String(i))
        }
        for (let c in this.state.mapping) {
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
        result.append($('<div/>', { class: 'grid-x' })
            .append($('<div/>', { class: 'cell' })
                .append($('<p/>', { class: "h5" }).text('Values to decode for solution'))
                .append(solution)))
        result.append('<hr/>')
        result.append($('<div/>', { class: 'grid-x grid-padding-x align-justify' })
            .append($('<div/>', { class: 'cell small-6 shrink' })
                .append($('<p/>', { class: "h5" }).text('Cryptarithm formula'))
                .append(formulaTable))
            .append($('<div/>', { class: 'cell shrink' }).append(worktable.generate())))
        return result;

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

    public checkSolution(wordlist: number[], template: string): number {
        const parsed = this.parsedTemplates[template]
        let found = 0
        // If we don't have a parsed instructions for the template, just skip out
        if (parsed === undefined) {
            return 0
        }
        // Make sure that this is a template that we can handle and it happens to work for
        // the number of symbols we found
        if (parsed.symbols !== wordlist.length || parsed.type !== 'add') {
            return 0
        }
        let longest = 0
        let longset: string[] = []
        const sumands: string[] = []
        for (let ent of wordlist) {
            let word = this.state.wordlist[ent]
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
            for (let uses of parsed.uses) {
                const sumsearch: string[] = []
                for (let k of uses) {
                    sumsearch.push(sumset[k])
                }
                let solutions = cryptarithmSumandSearch(sumsearch, sum, this.base, false, false)
                if (solutions.count === 1) {
                    found++
                    let outset = this.formatTemplateProblem(solutions.mapping, template, sumsearch, sum, parsed.replaces)
                    $("#findout").append($('<div/>').text(" " + outset[0] + " [" + outset[1] + "] Difficulty:" + String(solutions.difficulty))
                        .prepend($('<a/>', { class: 'rounded small button' }).text('Use')))

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
        this.updateOutput();
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
