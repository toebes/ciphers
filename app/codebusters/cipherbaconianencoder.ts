import {
    cloneObject,
    NumberMap,
    padToMatch,
    setCharAt,
    setDisabled,
    StringMap,
    makeFilledArray,
} from '../common/ciphercommon';
import { ITestType, toolMode, ITestQuestionFields, IScoreInformation } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { fiveletterwords } from '../common/fiveletterwords';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState } from './cipherencoder';

const baconMap: StringMap = {
    A: 'AAAAA',
    B: 'AAAAB',
    C: 'AAABA',
    D: 'AAABB',
    E: 'AABAA',
    F: 'AABAB',
    G: 'AABBA',
    H: 'AABBB',
    I: 'ABAAA',
    J: 'ABAAA',
    K: 'ABAAB',
    L: 'ABABA',
    M: 'ABABB',
    N: 'ABBAA',
    O: 'ABBAB',
    P: 'ABBBA',
    Q: 'ABBBB',
    R: 'BAAAA',
    S: 'BAAAB',
    T: 'BAABA',
    U: 'BAABB',
    V: 'BAABB',
    W: 'BABAA',
    X: 'BABAB',
    Y: 'BABBA',
    Z: 'BABBB',
};
const revBaconMap: StringMap = {
    AAAAA: 'A',
    AAAAB: 'B',
    AAABA: 'C',
    AAABB: 'D',
    AABAA: 'E',
    AABAB: 'F',
    AABBA: 'G',
    AABBB: 'H',
    ABAAA: 'I/J',
    ABAAB: 'K',
    ABABA: 'L',
    ABABB: 'M',
    ABBAA: 'N',
    ABBAB: 'O',
    ABBBA: 'P',
    ABBBB: 'Q',
    BAAAA: 'R',
    BAAAB: 'S',
    BAABA: 'T',
    BAABB: 'U/V',
    BABAA: 'W',
    BABAB: 'X',
    BABBA: 'Y',
    BABBB: 'Z',
};
const punctuationChars = '.,;-!';
interface IBaconianState extends IEncoderState {
    /** Characters to use to represent the A value */
    texta: string;
    /** Characters to use to represent the B value */
    textb: string;
    abMapping: string;
    /** How wide a line can be before wrapping */
    linewidth: number;
    /** List of words for the encoded string.
     * Note that any punctuation is included at the end of the string
     */
    words: string[];
}
/**
 * CipherBaconianEncoder - This class handles all of the actions associated with encoding
 * a Baconian cipher.
 */
export class CipherBaconianEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = 'TestGuidance.html#Baconian';

    public validTests: ITestType[] = [ITestType.None,
    ITestType.cregional, ITestType.cstate,
    ITestType.bregional, ITestType.bstate];
    public defaultstate: IBaconianState = {
        cipherString: '',
        cipherType: ICipherType.Baconian,
        offset: 1,
        operation: 'let4let',
        texta: 'A',
        textb: 'B',
        abMapping: 'ABABABABABABABABABABABABAB',
        linewidth: this.maxEncodeWidth,
        words: [],
    };
    public state: IBaconianState = cloneObject(
        this.defaultstate
    ) as IBaconianState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
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
        // Each cipher character corresponds to 5 baconian characters
        let anslen = this.getEncodingString().length * 5;
        // We need an answer, separators and replacement boxes for each baconian character worth
        result.answer = makeFilledArray(anslen, " ");
        result.separators = makeFilledArray(anslen, " ");
        result.replacements = makeFilledArray(anslen, " ");
        return result;
    }
    /** Where we are in the editing of the words */
    public wordpos: number = 0;
    public baconianWords: string[];
    /** Mapping table of all baconian strings to known words */
    public wordlookup: { [index: string]: string[] };
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setTexta(this.state.texta);
        this.setTextb(this.state.textb);
        this.setOperation(this.state.operation);
    }
    /**
     * Changes the mapping characters for the A output letters
     * @param texta New A text character(s)
     * @returns Boolean indicating that the value has changed
     */
    public setTexta(texta: string): boolean {
        let changed = false;
        if (this.state.texta !== texta) {
            this.state.texta = texta;
            changed = true;
        }
        return changed;
    }
    /**
     * Changes the mapping characters for the B output letters
     * @param texta New B text character(s)
     * @returns Boolean indicating that the value has changed
     */
    public setTextb(textb: string): boolean {
        let changed = false;
        if (this.state.textb !== textb) {
            this.state.textb = textb;
            changed = true;
        }
        return changed;
    }
    /**
     * Changes the width of the maximum line output
     * @param linewidth New line width
     */
    public setLineWidth(linewidth: number): boolean {
        let changed = false;
        if (linewidth < 0) {
            linewidth = this.maxEncodeWidth;
        }
        if (this.state.linewidth !== linewidth) {
            this.state.linewidth = linewidth;
            changed = true;
        }
        return changed;
    }
    /**
     * Switches the mapping character of a letter in the character set
     * @param c Which character in the character set to change the value of
     */
    public toggleAB(c: string): void {
        let charset = this.getCharset();
        let idx = charset.indexOf(c);
        if (idx >= 0) {
            let val = this.state.abMapping.substr(idx, 1);
            if (val !== 'A') {
                val = 'A';
            } else {
                val = 'B';
            }
            this.state.abMapping = setCharAt(this.state.abMapping, idx, val);
        }
    }
    /**
     * Based on the current AB UI mapping, generate a quick lookup table to make
     * it easier to encode the baconian letters
     */
    public getABMap(): StringMap {
        let ablookup: StringMap = {};
        // Make a mapping of the characters for convenience
        let charset = this.getCharset();
        for (let i = 0; i < charset.length; i++) {
            let c = charset.substr(i, 1);
            let ab = this.state.abMapping.substr(i, 1);
            ablookup[c] = ab;
        }
        return ablookup;
    }
    /**
     * Update the wordlookup table based on the current mapping of AB characters
     * to the character alphabet.
     */
    public buildWordMap(): void {
        this.wordlookup = {};
        if (this.state.operation === 'words') {
            let ablookup = this.getABMap();
            for (let word of fiveletterwords) {
                // Figure out what letter this word will map to
                let mapping = '';
                for (let c of word) {
                    if (ablookup[c] !== undefined) {
                        mapping += ablookup[c];
                    }
                }
                if (mapping.length === 5) {
                    if (this.wordlookup[mapping] === undefined) {
                        this.wordlookup[mapping] = [];
                    }
                    this.wordlookup[mapping].push(word);
                }
            }
        }
    }
    /**
     * Split the given string into baconian words by mapping against the
     * current AB mapping.
     * @param cipherString String to be split up
     */
    public buildBaconianWordList(cipherString: string): void {
        this.baconianWords = [];
        // Iterate through each letter and look it up in the map
        for (let c of cipherString) {
            if (this.isValidChar(c)) {
                this.baconianWords.push(baconMap[c]);
            }
        }
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        $('.opfield').hide();
        $('.' + this.state.operation).show();
        $('#texta').val(this.state.texta);
        $('#textb').val(this.state.textb);
        $('#linewidth').val(this.state.linewidth);
        let abmap = this.getABMap();
        for (let c in abmap) {
            $('#l' + c).text(abmap[c]);
        }
        JTRadioButtonSet('operation', this.state.operation);
        super.updateOutput();
        this.updateWordSelects();
    }
    /**
     * Initializes the encoder.
     */
    public init(lang: string): void {
        super.init(lang);
    }
    public makeReplacement(str: string, maxEncodeWidth: number): string[][] {
        let langreplace = this.langreplace[this.state.curlang];
        // Since the word baconian is so different, we break it out to a different routine
        if (this.state.operation === 'words') {
            return this.makeWordReplacement(str, maxEncodeWidth);
        }
        let sourceline = '';
        let baconline = '';
        let encodeline = '';
        let result: string[][] = [];
        let letpos: NumberMap = { A: 0, B: 0 };
        let sharedpos = 0;
        for (let t of str) {
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== 'undefined') {
                t = langreplace[t];
            }
            let bacontext = baconMap[t];
            // Make sure that this is a valid character to map from
            if (bacontext !== undefined) {
                sourceline += '  ' + t + '  ';
                baconline += bacontext;
                for (let ab of bacontext) {
                    if (this.state.operation === 'let4let') {
                        let abstring = this.state.texta;
                        if (ab !== 'A') {
                            abstring = this.state.textb;
                        }
                        let pos = letpos[ab];
                        if (pos >= abstring.length) {
                            pos = 0;
                        }
                        encodeline += abstring.substr(pos, 1);
                        pos++;
                        letpos[ab] = pos;
                    } else if (this.state.operation === 'sequence') {
                        let abstring = this.state.texta;
                        if (ab !== 'A') {
                            abstring = this.state.textb;
                        }
                        if (sharedpos >= abstring.length) {
                            sharedpos = 0;
                        }
                        encodeline += abstring.substr(sharedpos, 1);
                        sharedpos++;
                    } else {
                        // Words
                        sourceline += ' ';
                        baconline += ' ';
                        encodeline += bacontext;
                    }
                }
            }
            /**
             * See if we have to split out the line
             */
            if (encodeline.length >= maxEncodeWidth) {
                let sourcepart = sourceline.substr(0, maxEncodeWidth);
                let baconpart = baconline.substr(0, maxEncodeWidth);
                let encodepart = encodeline.substr(0, maxEncodeWidth);
                sourceline = sourceline.substr(maxEncodeWidth);
                baconline = baconline.substr(maxEncodeWidth);
                encodeline = encodeline.substr(maxEncodeWidth);
                result.push([sourcepart, baconpart, encodepart]);
            }
        }
        // and add any residual parts
        if (encodeline.length > 0) {
            result.push([sourceline, baconline, encodeline]);
        }
        return result;
    }
    /**
     * Returns how wide the user expects to encode the string as
     */
    public getEncodeWidth(): number {
        let linewidth = this.maxEncodeWidth;
        if (this.state.operation !== 'words') {
            linewidth = this.state.linewidth;
        }
        return linewidth;
    }
    /**
     * Build the HTML that corresponds to the UI when creating a question
     */
    public build(): JQuery<HTMLElement> {
        let result = $('<div/>');
        result.append(this.genAnswer(ITestType.None));
        return result;
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        let res = this.build();
        $('#answer')
            .empty()
            .append(res);
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $('<div/>');
        // Show them what tests the question is used on
        this.genTestUsage(result);

        let radiobuttons = [
            { id: 'wrow', value: 'let4let', title: 'Letter for letter' },
            { id: 'mrow', value: 'sequence', title: 'Sequence' },
            { id: 'words', value: 'words', title: 'Words' },
        ];
        result.append(
            JTRadioButton(6, 'operation', radiobuttons, this.state.operation)
        );

        this.genQuestionFields(result);
        this.genEncodeField(result);
        // Build a table so that they can click on letters to make A or B
        let table = new JTTable({
            class: 'cell shrink tfreq opfield words',
        });
        let hrow = table.addHeaderRow();
        let brow = table.addBodyRow();
        for (let c of this.getCharset()) {
            hrow.add({
                settings: { class: 'abclick', id: 'a' + c },
                content: c,
            });
            brow.add({
                settings: { class: 'abclick', id: 'l' + c },
                content: 'A',
            });
        }
        result.append(table.generate());
        let div = $('<div/>', { class: 'grid-x opfield words' });
        div.append(this.genShiftButtonGroup('left'));
        for (let slot = 0; slot < 5; slot++) {
            div.append(this.genWordSelect(slot));
        }
        div.append(this.genShiftButtonGroup('right'));
        result.append(div);
        result.append(
            JTFLabeledInput(
                'A Text',
                'text',
                'texta',
                this.state.texta,
                'small-12 medium-6 large-6 opfield let4let sequence'
            )
        );
        result.append(
            JTFLabeledInput(
                'B Text',
                'text',
                'textb',
                this.state.textb,
                'small-12 medium-6 large-6 opfield let4let sequence'
            )
        );
        result.append(
            JTFIncButton(
                'Line Width',
                'linewidth',
                this.state.linewidth,
                'small-12 medium-6 large-6 opfield let4let sequence'
            )
        );

        return result;
    }
    /**
     * Generates a stacked set of buttons for shifting the offset of the
     * word editing group
     * @param dir direction "left" or "right" for the button group
     */
    public genShiftButtonGroup(dir: 'left' | 'right'): JQuery<HTMLElement> {
        let result = $('<div/>', {
            class: 'cell small-1 medium-1 flex-container flex-dir-column',
        });
        let buttonConfigs = {
            left: [
                { id: '', title: '<' },
                { id: '3', title: '<<<' },
                { id: 'e', title: '|<' },
            ],
            right: [
                { id: '', title: '>' },
                { id: '3', title: '>>>' },
                { id: 'e', title: '>|' },
            ],
        };
        for (let config of buttonConfigs[dir]) {
            result.append(
                $('<button/>', {
                    id: 'w' + dir + config.id,
                    type: 'button',
                    class:
                        'wshift flex-child-auto button small-1 medium-1 w' +
                        dir,
                }).text(config.title)
            );
        }
        return result;
    }

    /**
     * Creates a dropdown for selecting which word to assign to a Baconian element
     * @param slot Which position to create the word select for
     */
    public genWordSelect(slot: number): JQuery<HTMLElement> {
        let result = $('<div/>', {
            class: 'cell flex-dir-column small-2 medium-2 large-1',
        });
        result.append(
            $('<div/>', {
                class: 'flex-child-shrink',
            })
                .append(
                    $('<button/>', {
                        id: 'p' + String(slot),
                        'data-slot': slot,
                        class: 'psel button secondary float-right',
                    }).text(punctuationChars)
                )
                .append(
                    $('<div/>', {
                        id: 'v' + String(slot),
                        class: 'wtitle',
                    }).text('X')
                )
        );

        result.append(
            $('<select/>', {
                id: 'sel' + String(slot),
                'data-slot': slot,
                size: 15,
                class: 'wsel flex-child-grow',
            })
        );
        return result;
    }
    public updateWordSelects(): void {
        if (this.state.operation !== 'words') {
            return;
        }
        let maxwords = this.baconianWords.length;
        if (this.wordpos < 0 || maxwords <= 5) {
            this.wordpos = 0;
        } else if (this.wordpos > maxwords - 5) {
            this.wordpos = maxwords - 5;
        }
        // If we can't go any further left, disable the left button entries
        setDisabled('.wleft', this.wordpos === 0);
        setDisabled('.wright', this.wordpos >= maxwords - 5);
        // Now we need to go through all of the entries
        for (let slot = 0; slot < 5; slot++) {
            let slotpos = this.wordpos + slot;
            if (slotpos < maxwords) {
                setDisabled('#v' + slot, false);
                setDisabled('#p' + slot, false);
                setDisabled('#sel' + slot, false);
                // Now go through and repopulate all of the elements
                let sel = $('#sel' + slot).empty();
                let punctbutton = $('#p' + slot);
                let baconian = this.baconianWords[slotpos];
                let [slotword, punctuation] = this.getSlotWord(slotpos);
                $('#v' + slot).text(baconian);
                if (this.wordlookup[baconian] === undefined) {
                    setDisabled('#v' + slot, true);
                    setDisabled('#p' + slot, true);
                    setDisabled('#sel' + slot, true);
                } else {
                    if (punctuation !== '') {
                        punctbutton
                            .removeClass('secondary')
                            .addClass('primary')
                            .text(punctuation);
                    } else {
                        punctbutton
                            .removeClass('primary')
                            .addClass('secondary')
                            .text(punctuationChars);
                    }
                    for (let word of this.wordlookup[baconian]) {
                        let option;

                        if (word === slotword) {
                            option = $('<option/>', {
                                val: word,
                                selected: 'selected',
                            }).text(word);
                        } else {
                            option = $('<option/>', {
                                val: word,
                            }).text(word);
                        }
                        sel.append(option);
                    }
                }
            } else {
                setDisabled('#v' + slot, true);
                setDisabled('#p' + slot, true);
                setDisabled('#sel' + slot, true);
                $('#v').text('');
                $('#sel' + slot).empty();
            }
        }
    }
    private getSlotWord(slotpos: number): string[] {
        let slotword = this.state.words[slotpos];
        if (slotword === undefined || slotword === null) {
            slotword = '';
        }

        let punctuation = slotword.substr(slotword.length - 1);
        if (this.isValidChar(punctuation.toUpperCase())) {
            punctuation = '';
        } else {
            slotword = slotword.substr(0, slotword.length - 1);
        }
        return [slotword, punctuation];
    }

    /**
     * Generate the HTML to display the answer for a cipher
     * @param testType Type of test (A/B/C, etc)
     * @returns HTML Elements for the answer
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        let cipherString = this.getEncodingString();
        let strings = this.makeReplacement(cipherString, this.getEncodeWidth());
        for (let strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'BACON TOSOLVE',
                }).text(strset[2])
            );
            result.append(
                $('<div/>', {
                    class: 'BACON TOSOLVE2',
                }).text(strset[1])
            );
            result.append(
                $('<div/>', {
                    class: 'BACON TOANSWER',
                }).text(strset[0])
            );
        }
        result.append(
            $('<div/>', {
                class: 'TOANSWER',
            }).text(this.state.cipherString)
        );
        return result;
    }
    /**
     * Generate the list of replacement strings for a given baconian word cipher
     * @param str String to encode
     * @param maxEncodeWidth Maximum line length
     */
    public makeWordReplacement(
        str: string,
        maxEncodeWidth: number
    ): string[][] {
        let result: string[][] = [];
        this.buildWordMap();
        this.buildBaconianWordList(str);
        let wordline = '';
        let baconline = '';
        let decodeline = '';
        let prefix = '';
        // Iterate through each letter and look it up in the map
        for (let i = 0; i < this.baconianWords.length; i++) {
            let baconian = this.baconianWords[i];
            let [selword, punctuation] = this.getSlotWord(i);
            let resword = selword;
            // Make sure that the alphabet actually gives us a match
            if (this.wordlookup[baconian] === undefined) {
                // There were no words matching this
                $('#err').text('Unable to find any words for ' + baconian);
                resword = '[' + baconian + ']';
            } else {
                // If the word that they selected is still valid, use it
                if (this.wordlookup[baconian].indexOf(selword) >= 0) {
                    resword = selword;
                } else {
                    // Otherwise we just use the first one in the list
                    resword = this.wordlookup[baconian][0];
                }
            }
            // We now have:
            // resword - the chosen baconian encode word
            // baconian - the baconian characters for the word
            let decode = revBaconMap[baconian];
            baconian = padToMatch(baconian, resword);
            if (decode.length === 1) {
                decode = padToMatch('  ' + decode, resword);
            } else {
                decode = padToMatch(' ' + decode, resword);
            }
            if (
                prefix === '.' ||
                wordline.length + resword.length + prefix.length >
                maxEncodeWidth
            ) {
                result.push([
                    decodeline + padToMatch('', prefix),
                    baconline + prefix,
                    wordline + prefix,
                ]);
                wordline = resword;
                baconline = baconian;
                decodeline = decode;
            } else {
                decodeline += padToMatch('', prefix) + decode;
                baconline += prefix + baconian;
                wordline += prefix + resword;
            }
            if (punctuation === '.' || punctuation === '-') {
                prefix = punctuation;
            } else {
                prefix = punctuation + ' ';
            }
        }
        if (wordline !== '') {
            result.push([decodeline, baconline, wordline]);
        }
        return result;
    }

    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        let strings = this.makeReplacement(
            this.getEncodingString(),
            this.getEncodeWidth()
        );
        for (let strset of strings) {
            result.append(
                $('<div/>', {
                    class: 'BACON TOSOLVEQ',
                }).text(strset[2])
            );
        }
        return result;
    }
    /**
     * Generates the interactive editing for a cipher table of text
     * @param strings Array of string arrays to output
     * @param qnum Question number that the table is for
     */
    public genInteractiveBaconianTable(strings: string[][], qnum: number): JQuery<HTMLElement> {
        let qnumdisp = String(qnum + 1);
        let table = new JTTable({ class: 'ansblock cipherint baconian SOLVER' });
        let pos = 0;
        let stringindex = 2;
        let inputidbase = "I" + qnumdisp + "_";
        let spcidbase = "S" + qnumdisp + "_";
        let workidbase = "R" + qnumdisp + "_";

        for (let splitLines of strings) {
            let cipherline = splitLines[stringindex];
            // We need to generate a row of lines for each split up cipher text
            // The first row is the cipher text
            let rowcipher = table.addBodyRow();
            // followed by the replacement characters that they can use for trackign the baconian letters
            let rowunder = table.addBodyRow();
            // With boxes for the answers.  Note that we give them 5 boxes so they can put the answer in
            // any of them (or somewhere close to it)
            let rowanswer = table.addBodyRow();
            // With a blank row at the bottom
            let rowblank = table.addBodyRow();

            for (let c of cipherline) {
                // The word baconian only needs blocks under the valid characters but the 
                // others get blocks under every character (since there is no restriction on
                // what the cipher characters can be)
                if (this.state.operation !== 'words' || this.isValidChar(c)) {
                    // We need to identify the cells which get the separator added/removed as a set
                    let spos = String(pos);
                    let sepclass = " S" + spos;
                    // We have a clickable field for the separator character.  It is basically an
                    // upside down caret that is a part of the cipher text field
                    let field = $("<div/>")
                        .append($("<div/>", { class: "ir", id: spcidbase + spos }).html("&#711;"))
                        .append(c);
                    rowcipher.add({ settings: { class: 'q v ' + sepclass }, content: field, });
                    // We have a box for them to put whetever baconian substitution in that they want
                    rowanswer.add({
                        celltype: 'td',
                        content: $("<input/>", {
                            id: inputidbase + spos,
                            class: "awc",
                            type: "text",
                        }),
                        settings: { class: 'e v' + sepclass },
                    });
                    // And lastly we have a spot for the answer.  Note that we actually have
                    // five spots per baconian character, but they really should only be filling in one.
                    rowunder.add({
                        celltype: 'td',
                        content: $("<input/>", {
                            id: workidbase + spos,
                            class: "awr",
                            type: "text",
                        }),
                        settings: { class: sepclass },
                    });
                    pos++;
                } else {
                    // Not a character to edit, so just leave a blank column for it.
                    rowcipher.add(c);
                    rowanswer.add(c);
                    rowunder.add(" ");
                }
                // And of course we need a blank line between rows
                rowblank.add({ settings: { class: 's' }, content: ' ' });
            }
        }
        return table.generate();
    }
    /**
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        let qnumdisp = String(qnum + 1);
        let result = $('<div/>', { id: "Q" + qnumdisp });
        let strings = this.makeReplacement(
            this.getEncodingString(),
            this.getEncodeWidth()
        );

        result.append(this.genInteractiveBaconianTable(strings, qnum));

        result.append($("<textarea/>", { id: "in" + String(qnum + 1), class: "intnote" }))
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
            this.getEncodeWidth()
        );

        let solution: string[] = [];
        let answer: string[] = [];
        let stringindex = 0;

        // Figure out what the expected answer should be
        for (let splitLines of strings) {
            for (let c of splitLines[stringindex]) {
                if (this.isValidChar(c)) {
                    solution.push(c);
                }
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
                while(answer.length < Math.trunc((Number(i)-1)/5)) {
                    answer.push(" ");
                }
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
     * Generate the HTML to display the solution for the cipher.
     * @param testType Type of test
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        let result = $('<div/>');
        if (this.state.operation === 'words') {
            result.append($('<h3/>').text('The letters are mapped as:'));
            let table = new JTTable({ class: 'cell shrink ansblock' });
            let row = table.addHeaderRow();

            for (let c of this.getCharset()) {
                row.add({ settings: { class: 'v' }, content: c });
            }
            row = table.addBodyRow();
            for (let c of this.state.abMapping) {
                row.add({ settings: { class: 'v' }, content: c });
            }
            result.append(table.generate());
        } else {
            result.append(
                $('<p/>').text(
                    "The A letters are represented by '" +
                    this.state.texta +
                    "' and the B letters by '" +
                    this.state.textb +
                    "'"
                )
            );
        }
        return result;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('#texta')
            .off('input')
            .on('input', e => {
                let texta = $(e.target).val() as string;
                this.markUndo(null);
                if (this.setTexta(texta)) {
                    this.updateOutput();
                }
            });
        $('#textb')
            .off('input')
            .on('input', e => {
                let textb = $(e.target).val() as string;
                this.markUndo(null);
                if (this.setTextb(textb)) {
                    this.updateOutput();
                }
            });
        $('.abclick')
            .off('click')
            .on('click', e => {
                let id = $(e.target).attr('id') as string;
                let c = id.substr(1, 1);
                this.markUndo(null);
                this.toggleAB(c);
                this.updateOutput();
            });
        $('#linewidth')
            .off('input')
            .on('input', e => {
                let linewidth = $(e.target).val() as number;
                this.markUndo(null);
                if (this.setLineWidth(linewidth)) {
                    this.updateOutput();
                }
            });
        $('.wshift')
            .off('click')
            .on('click', e => {
                let id = $(e.target).attr('id') as string;
                let type = id.substr(id.length - 1);
                let shift = 1;
                if (type === '3') {
                    shift = 3;
                } else if (type === 'e') {
                    shift = 999999;
                }
                if (id.substr(1, 1) === 'l') {
                    shift = -shift;
                }
                this.wordpos += shift;
                this.updateWordSelects();
            });
        $('.wsel')
            .off('change')
            .on('change', e => {
                let newword = $(e.target).val() as string;
                let slot = $(e.target).attr('data-slot');
                if (slot !== '') {
                    let wordslot = this.wordpos + Number(slot);
                    if (
                        wordslot >= 0 &&
                        wordslot <= this.baconianWords.length
                    ) {
                        this.state.words[wordslot] = newword;
                        this.updateOutput();
                    }
                }
            });
        $('.psel')
            .off('click')
            .on('click', e => {
                let slot = $(e.target).attr('data-slot');
                if (slot !== '') {
                    let wordslot = this.wordpos + Number(slot);
                    let [slotword, punctuation] = this.getSlotWord(wordslot);
                    let punctpos = punctuationChars.indexOf(punctuation) + 1;
                    if (punctuation === '') {
                        punctpos = 0;
                    }
                    punctuation = punctuationChars.substr(punctpos, 1);
                    this.state.words[wordslot] = slotword + punctuation;
                    this.updateOutput();
                }
            });
    }
}
