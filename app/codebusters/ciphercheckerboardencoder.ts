import { BoolMap, calloutTypes, cloneObject, makeCallout, makeFilledArray, StringMap } from '../common/ciphercommon';
import { IOperationType, IState, ITestType, toolMode, ITestQuestionFields, IScoreInformation } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFDialog } from '../common/jtfdialog';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { deleteRowAndColumn } from '../common/mathsupport';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';

interface ICheckerboardState extends IEncoderState {
    /** The type of operation */
    operation: IOperationType;
    /** The size of the chunking blocks for output - 0 means respect the spaces */
    blocksize: number;
    /** The polybius key string */
    polybiusKey: string;
    /** The column Keyword */
    keyword2: string;
    /** The most recently computed solution score from the auto-solver */
    autoSolverScore: number;
}

const AUTOSOLVER_NOKEYWORD = 2000
const AUTOSOLVER_NOKEYPOS = 1000

type PolybiusMap = Map<string, string[]>
type SuggestType = 'row' | 'col'

interface wordInfo {
    plaintext: string;
    complete: boolean;
    candiate: boolean;
    cipherTextMissing: string;
    plainTextMissing: string;
    startpos: number;
    length: number;
    prevComplete: number;
    nextComplete: number;
}
interface CheckerboardSolverData {
    sequenceSets: string[][][];
    rowPossible: string[];
    colPossible: string[];
    /** The known Row keyword */
    rowKeyword: string;
    /** The known Column keyword */
    colKeyword: string;
    /** Mapping of Cipher text pairs to possible letters */
    polybius: PolybiusMap
    /** Indicates where we already have warned them about this being too hard to solve */
    warned: boolean
    /** Indicates whether we tested a pair before */
    tested: BoolMap
}

interface ICribInfo {
    plaintext: string;
    ciphertext: string[];
    position: number;
    criblen: number;
    cipherlen: number;
}
/**
 *
 * Checkerboard Encoder
 *
 */
export class CipherCheckerboardEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Checkerboard';
    public maxEncodeWidth = 24;
    public validTests: ITestType[] = [
        ITestType.None,
        ITestType.cregional,
        ITestType.cstate,
        ITestType.bregional,
        ITestType.bstate,
        // ITestType.aregional,
    ];

    public cipherName = 'Checkerboard';
    public cleanRowKeyword = '';
    public cleanColKeyword = '';
    public cleanPolyKey = '';
    public polybiusSequence = ''
    public polybiusMap = new Map<string, string>();
    public sequencesets: string[][][] = [];
    public suggestType: SuggestType = 'col'

    public defaultstate: ICheckerboardState = {
        /** The current cipher type we are working on */
        cipherType: ICipherType.Checkerboard,
        /** Row keyword */
        keyword: '',
        /** Column Keyword */
        keyword2: '',
        /** The current cipher we are working on */
        cipherString: '',
        crib: '',
        /** The current string we are looking for */
        findString: '',
        operation: 'decode',
        blocksize: 5,
        polybiusKey: '',
        autoSolverScore: undefined
    };
    public state: ICheckerboardState = cloneObject(this.defaultstate) as ICheckerboardState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IState, suppressOutput = false): void {
        this.state = cloneObject(this.defaultstate) as ICheckerboardState;
        this.copyState(this.state, data);
        if (suppressOutput) {
            this.setCipherType(this.state.cipherType);
        } else {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Make a copy of the current state
     */
    public save(): IState {
        // We need a deep copy of the save state
        const savestate = cloneObject(this.state) as IState;
        return savestate;
    }
    /**
     * Initializes the encoder/decoder.
     * Make sure we have the right tables for the cipher checks
     */
    public init(lang: string): void {
        super.init(lang);
    }
    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Template of question fields to be filled in at runtime.
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        let encoded = this.state.cipherString;

        const result: ITestQuestionFields = {
            version: 2,
            answer: this.repeatStr(' ', encoded.length),
            replacements: this.repeatStr(' ', encoded.length),
            notes: '',
        };
        return result;
    }
    /**
     * Determines if this generator is appropriate for a given test
     * type.  For Division A and B, only decode is allowed
     * @param testType Test type to compare against
     * @param anyOperation Don't restrict based on the type of operation
     * @returns String indicating error or blank for success
     */
    public CheckAppropriate(testType: ITestType, anyOperation: boolean): string {
        let result = super.CheckAppropriate(testType, anyOperation);
        if (result === '' && testType !== undefined) {
            if (!anyOperation && (testType == ITestType.cregional ||
                testType == ITestType.cstate ||
                testType == ITestType.bregional ||
                testType == ITestType.bstate) &&
                this.state.operation === 'encode'
            ) {
                result = 'Encode problems are not allowed on ' + this.getTestTypeName(testType);
            }
            if (
                testType !== ITestType.bstate &&
                testType !== ITestType.cstate &&
                testType !== ITestType.None &&
                this.state.operation === 'crypt'
            ) {
                result =
                    'Cryptanalysis problems are not allowed on ' + this.getTestTypeName(testType);
            }
        }
        return result;
    }

    public setCipherString(cipherString: string): boolean {
        let changed = super.setCipherString(cipherString);

        //VALIDATE ROW/COLUMN HERE MAYBE?
        let validCipher = this.validateKeySequence();
        this.setErrorMsg('', 'vKeywordLetters');
        if (!validCipher) {
            this.setErrorMsg('Not all row and column keyword letters appear in cipher text.', 'vKeywordLetters');
        }

        return changed;
    }

    public setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }
    /**
     * Sets the keyword (state.keyword) which is used as the Row Keyword
     * @param keyword New keyword
     * @returns Boolean indicating if the value actually changed
     */
    public setKeyword(keyword: string): boolean {
        let changed = super.setKeyword(keyword);
        this.cleanRowKeyword = this.minimizeString(this.cleanString(this.state.keyword)).toUpperCase()
        return changed;
    }
    /**
     * Sets the secondary keyword (state.keyword2) which is used as the Column Keyword
     * @param keyword2 new Secondary keyword
     * @returns Boolean indicating if the value actually changed
     */
    public setKeyword2(keyword2: string): boolean {
        let changed = false;
        if (this.state.keyword2 !== keyword2) {
            this.state.keyword2 = keyword2;
            changed = true;
        }
        this.cleanColKeyword = this.minimizeString(this.cleanString(this.state.keyword2)).toUpperCase()
        return changed;
    }
    public getPolybiusSequence(polybiusKey: string): string {
        let normalizedKey = this.minimizeString(polybiusKey.toUpperCase()) + this.charset;
        normalizedKey = normalizedKey.replace(/J/g, 'I'); // Normalize 'J' to 'I'
        return this.undupeString(normalizedKey); // Remove duplicates
    }
    /**
     * Sets the polybius key
     * @param polybiusKey New Polybius key
     * @returns Boolean indicating if the value actually changed
     */
    public setPolybiusKey(polybiusKey: string): boolean {
        let changed = false;
        if (this.state.polybiusKey !== polybiusKey) {
            this.state.polybiusKey = polybiusKey;
            changed = true;
        }
        this.cleanPolyKey = this.minimizeString(this.cleanString(this.state.polybiusKey)).toUpperCase()
        this.polybiusSequence = this.getPolybiusSequence(this.cleanPolyKey)
        return changed;
    }

    /**
     * Determine if the question text references the right pieces of this cipher
     */
    public validateQuestion(): void {
        super.validateQuestion();
        let msg = '';

        const questionText = this.state.question.toUpperCase();
        const key = this.cleanRowKeyword
        if (this.state.operation === 'crypt') {
            if (
                questionText.indexOf('DECOD') < 0 &&
                questionText.indexOf('DECRY') < 0 &&
                questionText.indexOf('WAS ENC') < 0 &&
                questionText.indexOf('IT\'S ENC') < 0 &&
                questionText.indexOf('BEEN ENC') < 0
            ) {
                msg +=
                    "The Question Text doesn't appear to mention that " +
                    'the cipher needs to be decrypted.';
            }
            // Look to see if the crib appears in the question text
            const crib = this.minimizeString(this.state.crib);
            if (crib !== '' && questionText.indexOf(crib) < 0) {
                msg +=
                    "The Crib Text '" +
                    this.state.crib +
                    "' doesn't appear to be mentioned in the Question Text.";
            }
        } else {
            const polybiusKey = this.cleanPolyKey;
            if (polybiusKey !== '' && questionText.indexOf(polybiusKey) < 0) {
                msg +=
                    "The Polybius Key '" +
                    polybiusKey +
                    "' doesn't appear to be mentioned in the Question Text.";
            }
            if (this.state.operation === 'encode') {
                if (questionText.indexOf('ENCOD') < 0 && questionText.indexOf('ENCRY') < 0) {
                    msg +=
                        "The Question Text doesn't appear to mention that " +
                        'the cipher needs to be encoded.';
                } else if (
                    questionText.indexOf('WAS ENCOD') > 0 ||
                    questionText.indexOf('BEEN ENCOD') > 0 ||
                    questionText.indexOf('WAS ENCRY') > 0 ||
                    questionText.indexOf('ENCRYPTED') > 0 ||
                    questionText.indexOf('BEEN ENCRY') > 0
                ) {
                    msg +=
                        'The Question Text appears to mention that the ' +
                        'cipher needs to be decoded, but this is an encode problem';
                }
            } else {
                if (
                    questionText.indexOf('DECOD') < 0 &&
                    questionText.indexOf('DECRY') < 0 &&
                    questionText.indexOf('WAS ENC') < 0 &&
                    questionText.indexOf('ENCODED') < 0 &&
                    questionText.indexOf('ENCRYPTED') < 0 &&
                    questionText.indexOf('BEEN ENC') < 0
                ) {
                    msg +=
                        "The Question Text doesn't appear to mention that " +
                        'the cipher needs to be decrypted.';
                }
            }
        }
        const sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');

        this.setErrorMsg(msg, 'vq', sampleLink);

    }

    /***
     * Validate all letters of row and column keywords exist in the cipher text.
     */
    public validateKeySequence(): boolean {
        //Generate cipher unit sequence
        let cipherUnitSequence = new Array<string>();

        this.sequencesets.forEach((value: string[][]) => {
            value[0].forEach((char: string) => {
                if (char.length === 2) {
                    cipherUnitSequence.push(char);
                }
            });
        });

        let rowKey = new Map<string, boolean>();
        let columnKey = new Map<string, boolean>();

        //initialize keyword maps
        for (let i = 0; i < this.cleanRowKeyword.length; i++) {
            rowKey.set(this.cleanRowKeyword[i], false);
        }
        for (let i = 0; i < this.cleanColKeyword.length; i++) {
            columnKey.set(this.cleanColKeyword[i], false);
        }

        //Check keywords with cipher unit sequence
        cipherUnitSequence.forEach((value: string) => {
            if (rowKey.has(value[0])) {
                rowKey.set(value[0], true);
            }
            if (columnKey.has(value[1])) {
                columnKey.set(value[1], true);
            }
        });

        let result = true;

        Array.from(columnKey.entries()).forEach(([key, value]) => {
            result = result && value;
        })

        Array.from(rowKey.entries()).forEach(([key, value]) => {
            result = result && value;
        })

        return result;
    }

    /**
     * Figure out where the crib should appear in the cipher
     * @returns Crib placement information
     */
    public placeCrib(): ICribInfo {
        const crib = this.minimizeString(this.state.crib);
        const strings = this.buildCheckerboardSequenceSets(
            this.minimizeString(this.state.cipherString),
            9999,
            0,
            undefined,
            true
        );
        if (strings.length !== 1) {
            return undefined;
        }
        const cribpos = strings[0][1].join('').indexOf(crib);
        if (cribpos < 0) {
            return undefined;
        }

        return {
            plaintext: strings[0][1].join('').substring(cribpos, cribpos + crib.length),
            ciphertext: strings[0][0].slice(cribpos, cribpos + crib.length),
            position: cribpos,
            criblen: crib.length,
            cipherlen: strings[0][0].length,
        };
    }
    /**
     * Converts a number to corresponding to the positional text version of
     *  the number like 2nd, 55th, etc.
     * @param val Number to generate string for
     * @returns Positional text version of string
     */
    public getPositionText(val: number): string {
        let suffix = 'th';
        if (val < 4 || val > 20) {
            const ones = val % 10;
            if (ones === 1) {
                suffix = 'st';
            } else if (ones === 2) {
                suffix = 'nd';
            } else if (ones === 3) {
                suffix = 'rd';
            }
        }
        return String(val) + '<sup>' + suffix + '</sup>';
    }
    /**
     * Generate UI components for display on "Answers and Solutions"
     * @param testType the type of test being edited
     * @returns JQuery html element detailing the solving steps
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        result.append($('<h3/>').text('How to solve'));

        this.isLoading = false;

        this.genCheckerboardSolution(testType, result);

        return result;
    }

    /**
     * 
     * @returns Suggested Score and description of that score
     */
    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)

        let suggested = 85 + qdata.len;
        let operationText = '';
        let rowLetterNumberText = '';
        let colLetterNumberText = '';
        let possibilityText = '';
        let zeroBlockSizeText = '';
        let keywordLengthText = '';
        let zNotLastText = '';
        let scoringText = '';

        if (this.state.operation === 'crypt') {
            operationText = ' This problem requires cryptanalysis so we add 200 points. ';
            suggested += 200;
            if (this.state.autoSolverScore === undefined) {
                operationText += ' But the Auto-Solver was not able to run on it yet. '
            } else if (this.state.autoSolverScore === AUTOSOLVER_NOKEYWORD) {
                operationText += ' But the Auto-Solver was not able to determine the keyword, so we add 300 points.'
                suggested += 300
            } else if (this.state.autoSolverScore === AUTOSOLVER_NOKEYPOS) {
                operationText += ' But the Auto-Solver was not able to determine the keyword positions, so we add 250 points.'
                suggested += 250
            } else if (this.state.autoSolverScore > 2.5 ||
                (this.state.blocksize !== 0 && this.state.autoSolverScore > 1.25)
            ) {
                const add = Math.round((this.state.autoSolverScore - 1.25) * 100)
                operationText += ` The Auto-Solver was not able to find enough words to make it solvable, so we add ${add} points [autosolverScore=${this.state.autoSolverScore}].`
                suggested += add
            }
        }

        const sequencesets = this.buildCheckerboardSequenceSets(this.minimizeString(this.state.cipherString), 9999);
        const [rowLetters, colLetters] = this.gatherLetters(sequencesets);
        const rowAnagrams = this.findAnagrams(rowLetters, 5);
        const colAnagrams = this.findAnagrams(colLetters, 5);

        if (rowLetters.length < 5) {
            rowLetterNumberText = ` The number of unique letters in the row is less than 5 so we add 60 points. `
            suggested += 60;
        }

        if (colLetters.length < 5) {
            colLetterNumberText = ` The number of unique letters in the column is less than 5 so we add 60 points. `
            suggested += 60;
        }

        if ((rowAnagrams.length * colAnagrams.length) > 1) {
            possibilityText = ` There is more than 1 possible anagram for the row and column letters provided, so we add 50 points. `
            suggested += 50;
        }

        if ((rowAnagrams.length * colAnagrams.length) > 5) {
            possibilityText += ` There are quite a few options to try, so we will add an additional bonus of 85 points. `
            suggested += 85;
        }

        if (this.state.blocksize !== 0) {
            zeroBlockSizeText = ` The block size is not 0 so we add 50 points. `
            suggested += 50;
        }

        if (this.cleanPolyKey.indexOf('Z') !== -1) {
            zNotLastText = ` The letter 'Z' is not the last letter in the polybius square so we add 10 points. `;
            suggested += 10;
        }

        let range = 20;
        const min = Math.max(suggested - range, 0)
        const max = suggested + range
        suggested += Math.round(range * Math.random() - range / 2);

        let rangetext = ''
        if (max > min) {
            rangetext = `, from a range of ${min} to ${max}`
        }
        if (qdata.len < 39) {
            scoringText = `<p><b>WARNING:</b> <em>There are only ${qdata.len} characters in this quote, we recommend around 60 characters for a good quote</em></p>`
        }
        if (qdata.len > 84) {
            scoringText = `<p><b>WARNING:</b> <em>There are ${qdata.len} characters in this quote, which is a significant amount more than the recommended 60 characters.</em></p>`
        }
        if (qdata.len > 2) {
            scoringText += `<p>There are ${qdata.len} characters in the quote.  
    ${operationText}${rowLetterNumberText}${colLetterNumberText}${possibilityText}${zeroBlockSizeText}${keywordLengthText}${zNotLastText} 
                We suggest you try a score of ${suggested}${rangetext}.</p>`
        }

        return { suggested: suggested, min: min, max: max, text: scoringText }
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        this.setOperation(this.state.operation);
        this.setCipherType(this.state.cipherType);
        this.setBlocksize(this.state.blocksize);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.showLengthStatistics();
        if (this.state.operation !== 'crypt') {
            this.guidanceURL = 'TestGuidance.html#Checkerboard';
            $('.crib').hide();
        } else {
            this.guidanceURL = 'TestGuidance.html#Checkerboard_Cryptanalysis';
            $('.crib').show();
        }
        JTRadioButtonSet('ciphertype', this.state.cipherType)
        JTRadioButtonSet('operation', this.state.operation)
        $('#keyword2').val(this.state.keyword2)
        $('#blocksize').val(this.state.blocksize)
        $('#polybiuskey').val(this.state.polybiusKey)
        $('#crib').val(this.state.crib);
        super.updateOutput();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);
        result.append(this.createSuggestKeyDlg('Suggest Key'))
        result.append(this.createKeywordDlg('Suggest Polybius Keyword'))
        result.append(this.createSuggestCribDlg('Suggest Crib'))

        let radiobuttons = [
            { id: 'wrow', value: 'encode', title: 'Encode' },
            { id: 'mrow', value: 'decode', title: 'Decode' },
            { id: 'crow', value: 'crypt', title: 'Cryptanalysis' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));
        this.genQuestionFields(result);
        this.genEncodeField(result);

        const suggestPolybiusButton = $('<a/>', { type: "button", class: "button primary tight", id: "suggestpkey" }).text("Suggest Polybius Key")

        result.append(
            JTFLabeledInput(
                'Polybius Key',
                'text',
                'polybiuskey',
                this.state.polybiusKey,
                'small-12 medium-12 large-12',
                suggestPolybiusButton
            )
        );

        const divkey = $("<div\>", { class: "grid-x margin-x colrow" })
        result.append(divkey)

        const suggestButton = $('<a/>', { type: "button", class: "button primary tight", id: "suggestkey" }).text("Suggest Row")
        divkey.append(
            JTFLabeledInput(
                'Row Keyword',
                'text',
                'keyword',
                this.state.keyword,
                'small-12 medium-5 large-5',
                suggestButton
            )
        );
        divkey.append($('<div/>', { class: 'medium-1 large-1' }))

        const suggest2Button = $('<a/>', { type: "button", class: "button primary tight", id: "suggestkey2" }).text("Suggest Column")
        divkey.append(
            JTFLabeledInput(
                'Column Keyword',
                'text',
                'keyword2',
                this.state.keyword2,
                'small-12 medium-6 large-6',
                suggest2Button
            )
        );

        const suggestCribButton = $('<a/>', { type: "button", class: "button primary tight", id: "suggestcrib" }).text("Suggest Crib")
        result.append(
            JTFLabeledInput(
                'Crib Text',
                'text',
                'crib',
                this.state.crib,
                'crib small-12 medium-12 large-12',
                suggestCribButton
            )
        );

        const inputbox1 = $('<div/>', { class: 'grid-x grid-margin-x blocksize' });
        inputbox1.append(JTFIncButton('Block Size', 'blocksize', this.state.blocksize, ''));
        result.append(inputbox1);



        return result;
    }
    public setBlocksize(blocksize: number): boolean {
        let changed = false;
        if (this.state.blocksize !== blocksize) {
            if (blocksize < 0) {
                blocksize = 0;
            }
            this.state.blocksize = blocksize;
            changed = true;
        }
        return changed;
    }

    /**
     * This returns a Map object which maps a character (key) to 
     * its corresponding ciphertext, based on the polybius table row/column.
     * @param rowKeyword Optional keyword to override the problem Row Keyword
     * @param colKeyword Optional keyword to override the problem Column Keyword
     * @returns A mapping from the plaintext to the ciphertext
     */
    public buildPolybiusMap(rowKeyword?: string, colKeyword?: string): Map<string, string> {
        const polybiusMap = new Map<string, string>();

        if (rowKeyword === undefined) {
            rowKeyword = this.cleanRowKeyword
        }
        if (colKeyword === undefined) {
            colKeyword = this.cleanColKeyword
        }
        // Step 1: Prepare the character sequence
        let preKey = this.minimizeString(this.cleanPolyKey.toUpperCase()) + this.charset;
        //in the behind the scenes, we treat the map/tables as if 'J' doesn't exist and there's only I.
        //if J appears in any user input, we manually convert it to I
        //later on we will deal with the I converting to I/J (namely in buildpolybius table method)
        preKey = preKey.replace(/J/g, 'I'); // Normalize 'J' to 'I'
        const sequence = this.undupeString(preKey); // Remove duplicates

        // Step 2: Build the Polybius map
        for (let i = 0; i < sequence.length; i++) {
            const keyChar = sequence[i];

            const row = Math.floor(i / 5);
            const col = i % 5;

            const rowChar = rowKeyword[row] ?? '?';
            const colChar = colKeyword[col] ?? '?';

            polybiusMap.set(keyChar, rowChar + colChar);
        }
        // Make it convenient to look up both I and J since they produce the same result
        polybiusMap.set('J', polybiusMap.get('I'))

        return polybiusMap;
    }
    /**
     * Build a reverse table to look up cipher text characters
     * @param rowKeyword Optional keyword to override the problem Row Keyword
     * @param colKeyword Optional keyword to override the problem Column Keyword
     * @returns a Mapping from a ciper text character to a plaintext
     */
    public buildReversePolybiusMap(rowKeyword?: string, colKeyword?: string): StringMap {
        return this.getReversePolybiusMap(this.buildPolybiusMap(rowKeyword, colKeyword));
    }

    /**
     * Generate a reverse table to map a cipher text to the plain text
     * @param pbMap Forward map to process
     * @returns A maping from a cipher text character to a plaintext
     */
    public getReversePolybiusMap(pbMap: Map<string, string>) {
        const revRepl: StringMap = {};
        Array.from(pbMap.entries()).forEach(([key, value]) => {
            if (revRepl[value] === undefined) {
                revRepl[value] = key;
            }
            else {
                revRepl[value] += '/' + key;
            }
        });
        return revRepl;
    }

    public getReversePolibusChoices(pbMap: Map<string, string>): Map<string, string[]> {
        const revRepl: PolybiusMap = new Map<string, string[]>();
        Array.from(pbMap.entries()).forEach(([key, value]) => {
            if (revRepl.get(value) === undefined) {
                revRepl.set(value, [key]);
            }
            else {
                const arr = revRepl.get(value);
                arr.push(key);
                revRepl.set(value, arr);
            }
        });
        return revRepl;
    }
    /**
     * This method returns an array of 'sequencesets', which contains all the information of a Checkerboard problem,
     * such as the cipher string, mapped cipher string, mapped key, mapped answer, etc. These are all different arrays, or sequences,
     * containing either a character or a number. Such as ['35', '56', 78'] or ['K', 'E', 'Y']. These sequences should all be the
     * same length. If the sequence ever exceeds the maxencodewidth, then it will create another sequenceset for the next chunk of
     * sequences to display on a new line.
     * @param msg Plain text to encode
     * @param maxEncodeWidth The maximum length of a line to encode
     * @param maxEncodeWidthExtra How much more can be on the second and subsequent lines
     * @param unChunked Don't chunk the content
     * @returns string[][][] where the first level if the collections of lines, the second level is [Ciphertext][plaintext] and the last level are the individual symbols
     */
    public buildCheckerboardSequenceSets(
        msg: string,
        maxEncodeWidth: number,
        maxEncodeWidthExtra: number = 11,
        polybiusMap?: Map<string, string>,
        unChunked: boolean = false,
    ): string[][][] {
        let lineEncodeWidth = maxEncodeWidth - maxEncodeWidthExtra
        const encoded = unChunked ? msg : this.chunk(msg, this.state.blocksize);
        const result: string[][][] = [];
        const charset = this.getCharset();
        let cipher = [];
        let message = [];
        const msgLength = encoded.length;
        let lastSplit = -1;
        if (polybiusMap === undefined) {
            polybiusMap = this.polybiusMap
        }

        for (let i = 0; i < msgLength; i++) {
            //messagechar is the current character in the encoded string
            let messageChar = encoded.substring(i, i + 1).toUpperCase();
            // if (messageChar == 'J') {
            //     messageChar = 'I'
            // }
            message.push(messageChar);
            const m = charset.indexOf(messageChar);
            if (m >= 0) {
                //cipher is the text we are decoding/encoding into
                cipher.push(polybiusMap.get(messageChar));
            } else {
                //if the current character in encoded message is not found in charset, then don't modify it (such as w/ punctuation)
                //directly push it onto the arrays
                cipher.push(messageChar);
                if (messageChar.trim() === '') {
                    lastSplit = message.length;
                }
                continue;
            }
            if (message.length >= lineEncodeWidth) {
                /*
                    last split refers to the last index in which a non-charset key appeared in the message. 
                    this creates a 'split' in the text, a place where we want to separate lines at
                */
                if (lastSplit === -1) {
                    //if no last split exists, we'll push the entire line and start over on the next line
                    result.push([cipher, message]);
                    message = [];
                    cipher = [];
                    lastSplit = -1;
                } else {
                    //if there is a last split, we want to separate the new lines at this point
                    const messagePart = message.slice(0, lastSplit);
                    const cipherPart = cipher.slice(0, lastSplit);
                    while (messagePart.length && cipherPart.length && messagePart[messagePart.length - 1].trim() === "") {
                        messagePart.pop();
                        cipherPart.pop();
                    }

                    //this next line will continue to be used, having the remaining text after the split
                    message = message.slice(lastSplit);
                    cipher = cipher.slice(lastSplit);
                    result.push([cipherPart, messagePart]);
                    lastSplit = -1;
                }
                if (result.length === 2) {
                    lineEncodeWidth = maxEncodeWidth
                }
            }
        }
        //push the remaining left messages onto a new line
        if (message.length > 0) {
            result.push([cipher, message]);
        }



        /* the result is an array of arrays of arrays - the large array contains all the lines (arrays) that the entire text is
            separated into. each line contains 4 arrays, each a char array of the info to appear on each subline*/
        return result;
    }

    public buildDecodeSequenceSets(
        msg: string,
        maxEncodeWidth: number,
        polybiusMap?: Map<string, string>,
        maxEncodeWidthExtra: number = 5
    ): string[][][] {
        const encoded = this.chunk(msg, this.state.blocksize);
        const result: string[][][] = [];
        const charset = this.getCharset();
        let cipher = [];
        let message = [];
        const msgLength = encoded.length;
        let lastSplit = -1;
        if (polybiusMap === undefined) {
            polybiusMap = this.polybiusMap
        }
        const pbReverse = this.getReversePolybiusMap(polybiusMap)

        for (let i = 0; i < msgLength; i++) {
            //messagechar is the current character in the encoded string
            let messageChar = encoded[i].toUpperCase();
            const m = charset.indexOf(messageChar);
            if (m >= 0) {
                const ct = polybiusMap.get(messageChar)
                const pt = pbReverse[ct]
                if (pt !== undefined) {
                    messageChar = pt
                }
                //cipher is the text we are decoding/encoding into
                message.push(messageChar)
                cipher.push(ct);
            } else {
                //if the current character in encoded message is not found in charset, then don't modify it (such as w/ punctuation)
                //directly push it onto the arrays
                message.push(messageChar);
                cipher.push(messageChar);
                continue;
            }
            if (message.length >= maxEncodeWidth) {
                /*
                    last split refers to the last index in which a non-charset key appeared in the message. 
                    this creates a 'split' in the text, a place where we want to separate lines at
                */
                if (lastSplit === -1) {
                    //if no last split exists, we'll push the entire line and start over on the next line
                    result.push([cipher, message]);
                    message = [];
                    cipher = [];
                    lastSplit = -1;
                } else {
                    //if there is a last split, we want to separate the new lines at this point
                    const messagePart = message.slice(0, lastSplit);
                    const cipherPart = cipher.slice(0, lastSplit);

                    //this next line will continue, having the remaining text after the split
                    message = message.slice(lastSplit);
                    cipher = cipher.slice(lastSplit);
                    result.push([cipherPart, messagePart]);
                }
                if (result.length === 2) {
                    maxEncodeWidth += maxEncodeWidthExtra
                }
            }
        }
        //push the remaining left messages onto a new line
        if (message.length > 0) {
            result.push([cipher, message]);
        }

        /* the result is an array of arrays of arrays - the large array contains all the lines (arrays) that the entire text is
            separated into. each line contains 4 arrays, each a char array of the info to appear on each subline*/
        return result;
    }
    public checkKeyword(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData): boolean {
        if (solverData === undefined || solverData.rowPossible.length !== 1 || solverData.colPossible.length !== 1) {
            this.showStepText(target, "Internal error: Keyword checking requires solver data to be present");
            return true;
        }
        let polybiusCharset = this.charset.replace('J', '') + ">"
        let spot = 0
        let polybiusKey = []
        let charPos = new Map<string, number>()
        for (let rowc of solverData.rowPossible[0]) {
            for (let colc of solverData.colPossible[0]) {
                const choice = rowc + colc
                const repl = solverData.polybius.get(choice)

                if (repl !== undefined) {
                    if (repl.length > 1) {
                        this.showStepText(target, `Unable to check the keywords ${solverData.rowPossible[0]} and ${solverData.colPossible[0]} are not valid because ${choice} maps to multiple possibilities, so we can eliminate it from consideration.`);
                        return false;
                    }
                    const c = repl[0]
                    polybiusKey.push(c)
                    if (!charPos.has(c)) {
                        charPos.set(c, spot)
                    } else if (charPos.get(c) !== spot) {
                        this.showStepText(target, `Unable to check the keywords ${solverData.rowPossible[0]} and ${solverData.colPossible[0]} because the letter ${c} appears in multiple positions in the polybius square, so we can eliminate it from consideration.`);
                        return false
                    }
                    spot++
                } else {
                    polybiusKey.push('')
                }
            }
        }
        // charPos should now have all the letters in the polybius square with their positions
        // Start from the end and look to see when we get a reversal of letters.
        let curLetPos = polybiusCharset.length
        for (let i = polybiusKey.length - 1; i >= 0; i--) {
            const c = polybiusKey[i]
            if (c !== '') {
                const cpos = polybiusCharset.indexOf(c)
                if (cpos > curLetPos) {
                    // We have a letter that is out of order.  See how long the keyword would be
                    if (i >= 15) {
                        this.showStepText(target, `With the keywords ${solverData.rowPossible[0]} and ${solverData.colPossible[0]} we see ${c} at position ${i} which means that the keyword would be ${i + 1} letters long, which is unlikely, so we can eliminate it from consideration.`);
                        return false;
                    }
                    // We are still in order, but let's see how far we are. Special check to start with.. If we skipped 4 out of VWXYZ then we are pretty sure we don't have it.
                } else if (curLetPos === polybiusCharset.length && ((curLetPos - cpos) > 4)) {
                    this.showStepText(target, `With the keywords ${solverData.rowPossible[0]} and ${solverData.colPossible[0]} we see ${c} at position ${i} which means that the keyword must have more letters of VWXYZ which is unlikely, so we can eliminate it from consideration.`);
                    return false;
                } else if (i >= 20 && cpos < 14) {
                    this.showStepText(target, `With the keywords ${solverData.rowPossible[0]} and ${solverData.colPossible[0]} we see ${c} at position ${i} which means that the keyword would be at least 15 letters long and would have to include most of the letters from the end of the alphabet, which is very unlikely, so we can eliminate it from consideration.`);
                    return false;
                }
                // We need to skip all the letters
                curLetPos = cpos
            } else {
                // We need to skip all the letters
                curLetPos--;
                let ac = polybiusCharset.charAt(curLetPos)
                while (curLetPos >= 0 && charPos.get(ac) !== undefined && charPos.get(ac) < i) {
                    curLetPos--
                    ac = polybiusCharset.charAt(curLetPos)
                }
            }
        }
        return true
    }
    /**
     * This method builds the HTML for a polybius table
     * @param target Place to generate the table
     * @param center Center the table
     * @param fillString Which letters 
     * @param solverData Current solver data state
     */
    public showPolybiusTable(target: JQuery<HTMLElement>, center: boolean, solverData?: CheckerboardSolverData): void {
        let polyClass = 'polybius-square unstriped'
        let rowPossible = [this.cleanRowKeyword]
        let colPossible = [this.cleanColKeyword]
        let polybiusMap = new Map<string, string[]>()
        if (solverData !== undefined) {
            rowPossible = solverData.rowPossible
            colPossible = solverData.colPossible
            polybiusMap = solverData.polybius
        } else {
            polybiusMap = this.getReversePolibusChoices(this.polybiusMap)
        }

        let rowKeyword = [[], [], [], [], []]
        let colKeyword = [[], [], [], [], []]
        for (let rowkw of rowPossible) {
            for (let rowpos = 0; rowpos < 5; rowpos++) {
                const c = rowkw.substring(rowpos, rowpos + 1)
                if (!rowKeyword[rowpos].includes(c)) {
                    rowKeyword[rowpos].push(c)
                }
            }
        }
        for (let colkw of colPossible) {
            for (let colpos = 0; colpos < 5; colpos++) {
                const c = colkw.substring(colpos, colpos + 1)
                if (!colKeyword[colpos].includes(c)) {
                    colKeyword[colpos].push(c)
                }
            }
        }

        if (center) {
            polyClass += ' center'
        }

        const worktable = new JTTable({
            class: polyClass,
        });

        const top = worktable.addHeaderRow({ class: "highlighted-header" });
        top.add('')
        // Show all the possible keyword letters. Typically we would only have 1, but if we haven't
        // determined exactly which keyword we are using we need to show them all
        for (let colPos = 0; colPos < 5; colPos++) {
            if (colKeyword[colPos].length === 0) {
                top.add({ class: "k", content: '?' })
            } else if (colKeyword[colPos].length === 1) {
                top.add({ class: "k", content: colKeyword[colPos][0] })
            } else {
                let content = $('<div/>')
                for (let colk of colKeyword[colPos]) {
                    content.append($('<div/>').text(colk))
                }
                top.add({ class: "k", content: content })
            }
        }

        for (let rowPos = 0; rowPos < 5; rowPos++) {
            const row = worktable.addBodyRow({ class: "b" });
            if (rowKeyword[rowPos].length === 0) {
                row.add({ celltype: 'th', class: "k", content: '?' })
            } else if (rowKeyword[rowPos].length === 1) {
                row.add({ celltype: 'th', class: "k", content: rowKeyword[rowPos][0] })
            } else {
                let content = $('<div/>');
                for (let rowk of rowKeyword[rowPos]) {
                    content.append($('<div/>').text(rowk))
                }
                row.add({ celltype: 'th', class: "k", content: content })
            }
            //Find all the possible matches for this row/column position
            for (let colPos = 0; colPos < 5; colPos++) {
                const replacements = []
                for (let rowC of rowKeyword[rowPos]) {
                    for (let colC of colKeyword[colPos]) {
                        const choice = rowC + colC
                        const repl = polybiusMap.get(choice)
                        if (repl !== undefined) {
                            for (let c of repl) {
                                if (!replacements.includes(c)) {
                                    replacements.push(c)
                                }
                            }
                        }
                    }
                }
                if (replacements.includes('I') && !replacements.includes('J')) {
                    replacements.push('J')
                }
                // Figure out if this is a potential Keyword placement
                let mapC = " "
                let extra = ''
                for (let c of replacements) {
                    mapC += extra + c
                    extra = '/'
                }
                row.add(mapC)
            }
        }

        target.append(worktable.generate())
    }

    /**
     * Update the Polybius data for a known value
     * Puts `char` into `setSlot` as the only option, and removes `char`
     * from every other slot to keep it unique.
     * @param solverData Current solver data state
     * @param setSlot Position for known character
     * @param char Character
     */
    public setPolybiusKnown(solverData: CheckerboardSolverData, setSlot: string, char: string) {
        if (char === 'J') {
            char = 'I';
        }
        const deferFixes: string[] = [];
        solverData.polybius.forEach((vals, slot) => {
            if (slot !== setSlot && vals?.includes(char)) {
                const next = vals.filter(v => v !== char);
                if (next.length !== vals.length) {
                    solverData.polybius.set(slot, next);
                    // Note that if we have reduced this to a single choice, we need to process it
                    // but we need to defer it until after we have processed everything else to avoid
                    // infinite loops
                    if (next.length === 1) {
                        deferFixes.push(slot);
                    }
                }
            }
        });

        // Always ensure the target slot is exactly [char]
        solverData.polybius.set(setSlot, [char]);

        // Now we need to process any of the deferred fixes
        for (let slot of deferFixes) {
            const vals = solverData.polybius.get(slot);
            if (vals !== undefined && vals.length === 1) {
                this.setPolybiusKnown(solverData, slot, vals[0]);
            }
        }
    }

    /**
     * Find any know letter gaps and fill them in
     * @param target Place to output any motes
     * @param solverData Current solver data state
     * @returns Number of new letters found
     */
    public fillLetterGaps(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData): number {
        const minPolybiusLen = 3
        let found = 0
        const polybiusCharset = this.charset.replace('J', '') + ">";
        let polySequence: string[] = makeFilledArray(25, undefined)
        let known = ""

        let pos = 0
        for (let rowc of solverData.rowPossible[0]) {
            for (let colc of solverData.colPossible[0]) {
                const choice = rowc + colc
                const repl = solverData.polybius.get(choice)

                if (repl !== undefined) {
                    if (repl.length == 1) {
                        polySequence[pos] = repl[0]
                        known += repl[0]
                    }
                }
                pos++;
            }
        }
        let index = 24

        let lastLetter = ">"
        while (index > minPolybiusLen) {  // Assume the polybius keyword is at least 3 characters long
            let numSpaces = 0;

            //this loops through the 'between' spaces of two concrete letters
            while (index > minPolybiusLen && polySequence[index] === undefined) {
                index--;
                numSpaces++;
            }
            let firstLetter = polySequence[index]
            if (firstLetter === undefined) {
                break;
            }
            const firstIndex = polybiusCharset.indexOf(firstLetter.replace('J', 'I'))
            const lastIndex = polybiusCharset.indexOf(lastLetter.replace('J', 'I'))

            if (firstIndex > lastIndex) {
                break;
            }

            //the last letter is whatever is left from previous run through, or if first them then "<"
            let betweenArray = polybiusCharset.substring(firstIndex + 1, lastIndex).split("");

            // Make sure we haven't crept into the keyword space
            if (betweenArray.length < numSpaces) {
                break;
            }

            let usableLetters = betweenArray.filter(x => !known.includes(x));

            let numSubs = usableLetters.length - numSpaces + 1;

            const endText = lastLetter === ">" ? "the end of the polybius table" : lastLetter

            if (index < this.cleanPolyKey.length) {
                this.showStepText(target, `We see the ${numSpaces} spaces between the ${firstLetter} and ${endText}, but given how close it is to the start of the
                Polybius Keyword, we can't be certain whether it is alphabet or keyword, so we can't fill it in until we are sure`)
                return 0;
            }
            if (numSubs === 1 && numSpaces > 0) {
                if (usableLetters.length === 1) {
                    this.showStepText(target, `Because the only legal letter '${usableLetters[0]}' fits exactly in the single space between ${firstLetter} and ${endText} we can fill it in the gap.`)
                } else {
                    this.showStepText(target, `Because the only legal letters '${usableLetters.join(", ")}' fit exactly in the ${usableLetters.length} spaces between ${firstLetter} and ${endText} we can fill them in the gap.`)
                }
            }

            for (let i = 0; i < numSpaces; i++) {
                let subs = []

                subs = usableLetters.slice(i, i + numSubs);

                const col = ((index + 1 + i) % 5);
                const row = Math.floor((index + 1 + i) / 5);
                const slot = solverData.rowPossible[0][row] + solverData.colPossible[0][col]

                if (subs.length === 1) {
                    // We need to remove this letter from every other place
                    this.setPolybiusKnown(solverData, slot, subs[0])
                    found++
                } else {
                    const oldsubs = solverData.polybius.get(slot) ?? [];
                    const delta = subs.filter(x => oldsubs.includes(x));
                    solverData.polybius.set(slot, subs);
                    if (delta.length < oldsubs.length) {
                        found++
                    }
                }
            }

            //at the end, we want to set the new initial letter to be this current last letter for next iteration
            lastLetter = firstLetter;

            index--;
        }
        return found
    }
    /**
     * This method builds the Checkerboard sequenceset tables as well as the polybius square.
     * @param operationType encode/decode/crypt Type of operation being done
     * @param sequencesets Sequencesets to display (if undefined, will use the current problem sequencesets)
     * @returns DOM elements where output has been put
     */
    public buildCheckerboard(operationType: IOperationType, sequencesets?: string[][][]): JQuery<HTMLElement> {

        const result = $('<div/>');
        let key = this.cleanRowKeyword
        let emsg = '';
        let order = [];
        //indices guide:
        // 0 = ciphertext numbers
        // 1 = plaintext
        if (operationType === 'encode') {
            order = [[1, "minor"], [0, "ans bar"]];
        } else {
            order = [[0, "minor"], [1, "ans"]];
        }

        // Check to make sure that they provided a Key
        if (this.minimizeString(key) === '') {
            emsg = 'No Keyword provided. ';
        }
        // Check to make sure that they provided a Polybius Key
        if (this.cleanPolyKey === '') {
            emsg += 'No Polybius Key provided.';
        }
        this.setErrorMsg(emsg, 'vkey');

        // If we are doing Cryptanalysis, we need the Crib text
        emsg = '';
        if (operationType === 'crypt') {
            const crib = this.minimizeString(this.state.crib).toUpperCase();
            const plaintext = this.minimizeString(this.state.cipherString).toUpperCase();
            if (crib === '') {
                emsg = 'No Crib Text provided for Cryptanalysis.';
            } else if (plaintext.indexOf(crib) < 0) {
                emsg = `Crib Text '${this.state.crib}' not found in Plain Text`;
            }
        }
        this.setErrorMsg(emsg, 'vcrib');

        if (sequencesets === undefined) {
            sequencesets = this.sequencesets
        }

        const table = $('<table/>', { class: 'Checkerboard' });

        for (const sequenceset of sequencesets) {
            for (const pair of order) {
                const sequence = sequenceset[pair[0]];
                const row = $('<tr/>', { class: pair[1] });
                for (const char of sequence) {
                    row.append($('<td width="33px"/>').text(char));
                }
                table.append(row);
            }
            //add a blank row between each line of rows 
            const blank = $('<tr/>').append($('<td/>').append($('<br>')));
            table.append(blank)
        }

        const polybiusDiv = $('<div/>', { class: 'cell shrink' })
        this.showPolybiusTable(polybiusDiv, false)

        result.append($('<div/>', { class: 'grid-x grid-padding-x align-justify' })
            .append($('<div/>', { class: 'cell shrink' }).append(table))
            .append(polybiusDiv))

        return result;
    }
    /**
     * Display the current state of the solution with the mapped characters found out so far
     * @param target DOM element to put the output into
     * @param solverData Current solver data state (Updated)
     * @param isfinal Show the differentiated I/J if this is the final solution
     * @returns General score of the problem
     */
    public showCurrentSolution(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData, isfinal = false): number {
        const bigTable = new JTTable({ class: 'Checkerboard center' })
        const sequencesets = this.sequencesets

        let score = 0;

        for (const sequenceset of sequencesets) {
            const ctRow = bigTable.addBodyRow({ class: 'solve' });
            const ptCharRow = bigTable.addBodyRow({ class: 'ans' });

            let ciphertext = sequenceset[0];
            let plaintext = sequenceset[1];

            for (const i in ciphertext) {
                let ct = ciphertext[i]
                //for first row, just append the unaltered ciphertext number
                ctRow.add(ct);
                if (ct.length === 1) {
                    // This isn't a cipher text character, so just output it as is
                    ptCharRow.add(plaintext[i]);
                } else {
                    // Have we already figured out
                    // what the mapping is for this Plain Text value?
                    // Note that we filled in the solution for all the crib characters

                    const choices = solverData.polybius.get(ct);
                    if (choices !== undefined) {
                        score += choices.length - 1
                        if (choices.length <= 5) {
                            // Display the choices with a | between them to indicate multiple options
                            let out = ''
                            let extra = ''
                            choices.forEach((v: string) => {
                                out += extra + v
                                if (v === 'I') {
                                    out += "|J";
                                }
                                extra = '|'
                            })
                            // Do we need to differentiate I and J?
                            if (out === 'I|J' && isfinal) {
                                out = plaintext[i].toUpperCase();
                            }
                            ptCharRow.add(out)
                        } else {
                            ptCharRow.add(' ');
                        }
                    } else {
                        ptCharRow.add(' ');
                        score += 25
                    }
                }
            }

            const blankrow = bigTable.addBodyRow()
            blankrow.add({
                content: '&nbsp;',
            })
        }

        let pbTable = $('<div/>', { class: 'cell shrink' })
        this.showPolybiusTable(pbTable, false, solverData)
        target.append($('<div/>', { class: 'grid-x grid-padding-x align-justify' })
            .append($('<div/>', { class: 'cell shrink' })
                .append(bigTable.generate()))
            .append(pbTable))
        return score
    }
    /**
     * Add an entry to an array in a map
     * @param map PolybiusMap to add to
     * @param key Key value for entry
     * @param value New value to add to entry
     */
    public addToPolybiusMap(map: PolybiusMap, key: string, value: string) {
        let entries = map.get(key)
        if (entries === undefined || entries.length === 0) {
            map.set(key, [value])
        } else if (!entries.includes(value)) {
            entries.push(value)
            map.set(key, entries)
        }
    }
    public genHintText(hint: string): string {
        let hinttext = ''
        if (this.state.operation != 'crypt') return '';

        const cribpos = this.placeCrib();
        if (cribpos == undefined) return '';
        hinttext = "";

        if (cribpos.position === 0) {
            hinttext += ` The deciphered text starts with ${this.genMonoText(cribpos.plaintext)}. `;
        } else if (cribpos.position === cribpos.cipherlen - cribpos.criblen) {
            hinttext += ` The deciphered text ends with ${this.genMonoText(cribpos.plaintext)}. `;
        } else {
            const startpos = this.getPositionText(cribpos.position + 1);
            const endpos = this.getPositionText(cribpos.position + cribpos.criblen);
            hinttext += ` The ${startpos} through ${endpos} cipher units (${this.genMonoText(cribpos.ciphertext.join(' '))})
                decode to be ${this.genMonoText(cribpos.plaintext)}. `
        }
        return hinttext
    }


    public addQuestionOptions(qOptions: string[], langtext: string, hinttext: string, fixedName: string, operationtext: string, operationtext2: string, cipherAorAn: string): boolean {
        if (this.state.operation != 'crypt') {
            // const keyword = this.genMonoText(this.cleanKeyword);
            // const keyword2 = this.genMonoText(this.cleanKeyword2);
            const polybiusKey = this.genMonoText(this.cleanPolyKey);
            operationtext2 += ` with a polybius key of ${polybiusKey}`;
        }
        return super.addQuestionOptions(qOptions, langtext, hinttext, fixedName, operationtext, operationtext2, cipherAorAn);


    }
    public fillCribMatches(solverData: CheckerboardSolverData): void {
        const cribpos = this.placeCrib();
        if (cribpos === undefined) return;
        solverData.polybius.clear()

        for (let i = 0; i < cribpos.criblen; i++) {
            const ptC = cribpos.plaintext.charAt(i).replace('J', 'I')
            const ctC = cribpos.ciphertext[i]
            solverData.polybius.set(ctC, [ptC])
        }
    }

    /**
     * Loads up the values for Checkerboard
     */
    public load(): void {
        this.setKeyword(this.state.keyword)
        this.setKeyword2(this.state.keyword2)
        this.setPolybiusKey(this.state.polybiusKey)
        this.clearErrors();
        this.validateQuestion();

        let emsg = ''

        if (this.cleanRowKeyword.length !== 5) {
            emsg += ' The Row Keyword must be exactly 5 letters long.';
        }
        if (this.cleanColKeyword.length !== 5) {
            emsg += ' The Column Keyword must be exactly 5 letters long.';
        }
        if (this.cleanPolyKey.length < 2) {
            emsg += ' The Polybius Keyword must be at least 2 letters long.';
        }
        if (emsg != '') {
            this.setErrorMsg(emsg, 'vkey');
            $('#answer').empty()
            return;
        }

        const encoded = this.chunk(this.cleanString(this.state.cipherString), this.state.blocksize);
        this.polybiusMap = this.buildPolybiusMap();
        this.sequencesets = this.buildCheckerboardSequenceSets(encoded, this.maxEncodeWidth);

        let res = this.buildCheckerboard(this.state.operation);
        $('#answer')
            .empty()
            .append(res);

        let target = $('#sol')
        target
            .empty()
            .append('<hr/>')
            .append($('<h3/>').text('How to solve'));
        if (encoded.length > 0) { //&& !this.containsJ()) {
            this.genCheckerboardSolution(ITestType.None, target)
        } else {
            target.append("Enter a valid question to see the solution process.")
        }

        this.attachHandlers();
    }
    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        const strings = this.buildCheckerboardSequenceSets(this.state.cipherString, 40);
        let dest = 1;
        if (this.state.operation === 'encode') {
            dest = 0;
        }

        let solution: string[] = undefined;
        for (const strset of strings) {
            if (solution === undefined) {
                solution = []
            }
            solution.push(...strset[dest]);
        }
        return this.calculateScore(solution, answer, this.state.points);
    }
    /**
     * Determine how wide to output the table
     * @param testType Type of test
     * @returns width and any extra class to use
     */
    public getTestWidth(testType: ITestType) {
        let width = this.maxEncodeWidth;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = this.maxEncodeWidth;
            extraclass = ' atest';
        }
        return { width, extraclass };
    }
    public getReverseReplacement(): StringMap {
        const revRepl: StringMap = {};

        const pbMap = this.buildPolybiusMap();

        Array.from(pbMap.entries()).forEach(([key, value]) => {
            revRepl[key] = value;
        })
        return revRepl;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        const { width } = this.getTestWidth(testType);

        const strings = this.buildCheckerboardSequenceSets(this.state.cipherString, width);

        let source = 0;
        let dest = 1;
        if (this.state.operation === 'encode') {
            source = 1;
            dest = 0;
        }

        const table = $('<table/>', { class: 'ansblock shrink cell unstriped' });

        table.append($('<tbody/>'));

        for (const sequenceset of strings) {
            const topRow = $('<tr/>');
            for (const unit of sequenceset[source]) {
                topRow.append($('<td/>').text(unit));
            }
            table.append(topRow);
            const botRow = $('<tr/>');
            for (const unit of sequenceset[dest]) {
                if (this.charset.indexOf(unit) < 0 && !(/^-?\d+$/.test(unit))) {
                    botRow.append($('<td/>').text(unit));
                } else {
                    botRow.append($('<td class="a v"/>').text(unit));
                }
            }
            table.append(botRow);
            //add a blank row between each line of rows except on the tiny answer key
            const blank = $('<tr/>', { class: "notiny" }).append($('<td/>').append($('<br>')));
            table.append(blank);
        }

        result.append(table);

        return result;
    }
    /**
     * Generate a solution for the Checkerboard cipher
     * @param _testType Type of test we are generating the output for
     * @param target DOM element to put the output into
     */
    public async genCheckerboardSolution(testType: ITestType, target: JQuery<HTMLElement>) {
        // If we are already in the process of loading then we need to request that
        // the loading process stop instead of starting it again.
        // Note that when the stop is processed it will trigger starting the load
        // once again to update the UI
        if (this.isLoading) {
            this.stopGenerating = true;
            return;
        }
        this.setErrorMsg('', 'si',);
        // Make sure we have a Polybius key and a keyword before going on
        if (this.minimizeString(this.cleanRowKeyword) === '' || this.cleanPolyKey === '') {
            return
        }
        if (this.state.operation === 'crypt') {
            const crib = this.minimizeString(this.state.crib).toUpperCase();
            const plaintext = this.minimizeString(this.state.cipherString).toUpperCase();
            if (crib === '' || plaintext.indexOf(crib) < 0) {
                return;
            }
        }
        this.stopGenerating = false;
        this.isLoading = true
        this.loadLanguageDictionary(this.state.curlang).then(() => {
            if (this.state.operation === 'crypt') {
                this.genCryptanalysisSolution(target);
            } else if (this.state.operation === 'decode') {
                this.genDecodeSolution(testType, target);
            } else {
                this.genEncodeSolution(target);
            }
        })

        // See if they requested an abort to restart the operation before we finish
        if (await this.restartCheck()) { return }

        // All done, so mark that we are not in the process of updating
        this.isLoading = false
    }
    public gatherLetters(sequencesets: string[][][]) {
        let rowLetters = ""
        let colLetters = ""
        for (const ct of sequencesets[0][0]) {
            if (ct.length === 2) {
                rowLetters += ct[0]
                colLetters += ct[1]
            }
        }
        return [this.undupeString(rowLetters), this.undupeString(colLetters)]
    }
    public encodeFixed(val: string): JQuery<HTMLElement> {
        return $('<span/>', { class: 'hl' }).text(val)
    }

    public canonicalForm(s: string): string {
        return s.split('').sort().join('')
    }

    public findAnagrams(val: string, len: number): string[] {
        const target = this.canonicalForm(val);
        const found: string[] = []

        let entries = Object.keys(this.Frequent['en'])
            .filter(key => key.length === len && !key.includes("'"));

        if (target.length === len) {
            outer: for (const pat of entries) {
                for (const entry of this.Frequent['en'][pat]) {
                    if (this.canonicalForm(entry[0]) === target) {
                        found.push(entry[0])
                        if (found.length > 12) {
                            break outer;
                        }
                    }
                }
            }
        } else {
            outer: for (const pat of entries) {
                for (const entry of this.Frequent['en'][pat]) {
                    if (this.canonicalForm(this.undupeString(entry[0])) === target) {
                        found.push(entry[0])
                        if (found.length > 12) {
                            break outer;
                        }
                    }
                }
            }
        }
        return found
    }
    public showHeaderOptions(headerLetters: string, headerType: string, result: JQuery<HTMLElement>): string[] {
        let headerPossible = this.findAnagrams(headerLetters, 5);

        const div = $('<div/>')
        if (headerPossible.length === 0) {
            div.append(`There are no known words which contain only the letters ${headerLetters} for the ${headerType} Key`);
        } else if (headerPossible.length === 1) {
            div.append(`There is exactly one word: `)
                .append(this.encodeFixed(headerPossible[0]))
                .append(` which matches the letters ${headerLetters} for the ${headerType} Key`);
        } else {
            div.append(`There are at least ${headerPossible.length} possible matches for the ${headerType} Key:`)
                .append(this.encodeFixed(headerPossible.join(",")));
        }
        result.append(div)
        return headerPossible
    }

    public showFirstTen(rowChoice: string, colChoice: string, ciphertext: string[], result: JQuery<HTMLElement>) {
        const pbMap = this.buildReversePolybiusMap(rowChoice, colChoice)

        let count = 0
        let plaintext = ''
        for (let ct of ciphertext) {
            const pt = pbMap[ct]
            if (pt === undefined || pt === '') {
                plaintext += ct
            } else {
                plaintext += pt;
            }
            plaintext += ' '
            count++
            if (count > 10) {
                break
            }
        }
        let div = $('<div\>')
        div.append(this.encodeFixed(rowChoice))
            .append(',')
            .append(this.encodeFixed(colChoice))
            .append(': ')
            .append(plaintext)
        result.append(div)
    }
    public CountTopSequences(cipherText: string[]): [string, number][] {
        const freqMap = new Map<string, number>();

        // Count frequencies
        for (const seq of cipherText) {
            freqMap.set(seq, (freqMap.get(seq) || 0) + 1);
        }

        // Convert to array and sort by frequency descending
        const sorted = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]);

        // Return top 3
        return sorted;
    }
    /**
     * Determine the coordinates of a letter in the Polibius key
     * @param letter Letter to look for in the Polibius Square
     * @returns 
     */
    public findLetterPosition(letter: string): [number, number] {
        const pos = this.polybiusSequence.indexOf(letter)
        if (pos === -1) return [-1, -1];
        return [Math.floor(pos / 5), pos % 5];
    }
    /**
     * Check the current row/column candidates against a particular keyword position
     * @param result Place to output any notes
     * @param rowNum Which row number position we need to match
     * @param colNum Which column number position we need to match
     * @param ent The CipherText tuple to test with
     * @param rowPossible All the remaining row candidate words
     * @param colPossible All the remaining column candidate words
     * @param cipherText The cipher text string to decode
     * @param solverData Current solver data state
     * @returns An indication whether or not we found a valid match
     */
    public checkDecodePairs(result: JQuery<HTMLElement>, rowNum: number, colNum: number, ent: string, rowPossible: string[], colPossible: string[], cipherText: string[], solverData: CheckerboardSolverData): boolean {
        let found = false
        const entRowChar = ent[0]
        const entColChar = ent[1]
        for (const rowChoice of rowPossible) {
            if (rowChoice[rowNum] !== entRowChar) continue;

            for (const colChoice of colPossible) {
                if (colChoice[colNum] !== entColChar) continue;
                found = true
                if (solverData.tested[rowChoice + colChoice]) {
                    this.showStepText(result, `We already tried ${rowChoice},${colChoice} so we can skip it`)
                } else {
                    solverData.tested[rowChoice + colChoice] = true
                    this.showFirstTen(rowChoice, colChoice, cipherText, result)
                    if (rowChoice === this.cleanRowKeyword && colChoice === this.cleanColKeyword) {
                        return true;
                    }
                }
            }
        }
        if (!found) {
            this.showStep(result, `No Row/Column keywords were found to match`)
        }
        return false;
    }
    /**
     * Async step that derives row/column letters and returns:
     * [rowLetters, colLetters, failed]
     */
    public async step1DetermineHeaders(result: JQuery<HTMLElement>, sequencesets: string[][][]): Promise<[string[], string[], boolean]> {
        this.showStep(result, "Step 1: Figure out the letters for the Row and Column keys");

        const [rowLetters, colLetters] = this.gatherLetters(sequencesets);

        // Notes about completeness
        let rownote = "";
        let colnote = "";
        if (rowLetters.length < 5) {
            rownote =
                " (which means at least one letter is duplicated or not all the row letters are used)";
        }
        if (colLetters.length < 5) {
            colnote =
                " (which means at least one letter is duplicated or not all the column letters are used)";
        }

        // jQuery chaining is fine here
        result
            .append(
                "Walk through the cipher text and gather the unique first letters in one group and the second letters in another group."
            )
            .append("In this case we found ")
            .append(this.encodeFixed(String(rowLetters.length)))
            .append(" unique Row letters: ")
            .append(this.encodeFixed(rowLetters))
            .append(rownote)
            .append(" and ")
            .append(this.encodeFixed(String(colLetters.length)))
            .append(" unique Column letters: ")
            .append(this.encodeFixed(colLetters))
            .append(colnote)
            .append(
                ". To figure out the actual headers, we need to anagram the letters and find the possible 5 letter words which they can be."
            );

        const rowPossible = this.showHeaderOptions(rowLetters, "Row", result);
        const colPossible = this.showHeaderOptions(colLetters, "Column", result);

        if (rowPossible.length === 0 || colPossible.length === 0) {
            let choice = "";
            let s = "";
            if (rowPossible.length === 0) choice = "Row";
            if (colPossible.length === 0) {
                if (choice !== "") {
                    choice = "Row/Column";
                    s = "s";
                } else {
                    choice = "Column";
                }
            }
            this.setErrorMsg(
                `Auto-Solver is unable to determine the ${choice} keyword${s} given the Cipher letters.  Consider different keywords.`,
                "si"
            );
            return [rowPossible, colPossible, true];
        }

        return [rowPossible, colPossible, false];
    }

    /**
     * Generate the description on how to solve a decode problem which is only given the polybius key
     * @param target DOM element to put output into
     */
    public async genDecodeSolution(testType: ITestType, target: JQuery<HTMLElement>) {
        let cleanPolybiusKey = this.cleanPolyKey

        this.polybiusMap = this.buildPolybiusMap();

        const result = $('<div/>', { id: 'solution' });
        target.append(result);

        // Build sequence sets and gather letters
        const sequencesets = this.buildCheckerboardSequenceSets(
            this.minimizeString(this.state.cipherString),
            9999
        );

        let [rowPossible, colPossible, failed] = await this.step1DetermineHeaders(result, sequencesets)

        if (failed) {
            // Handle failure path (e.g., abort or prompt user)
            return;
        }
        this.showStep(result, "Step 2: Fill out the Polybius Table");

        result.append('Given the Polybius Key ')
            .append(this.encodeFixed(cleanPolybiusKey))
            .append(', we can fill out the first ')
            .append(this.encodeFixed(String(this.undupeString(cleanPolybiusKey).length)))
            .append(` spaces of the polybius table, 
        with each <b>unique</b> letter taking up a space. (Skip any duplicate letters)`);

        this.showSolvingNote(result, `Note: Treat the letters <b>I</b> and <b>J</b> as one single letter <b>I/J</b>`)

        const solverData: CheckerboardSolverData = {
            sequenceSets: sequencesets,
            rowPossible: rowPossible, colPossible: colPossible,
            rowKeyword: "", colKeyword: "",
            polybius: new Map<string, string[]>(),
            warned: false,
            tested: {}
        }
        // Check to see if we only have a single option for the row
        if (rowPossible.length === 1) {
            result.append(`Since we know that `)
                .append(this.encodeFixed(rowPossible[0]))
                .append(` is the Row Keyword, we can fill it in.`)
            solverData.rowKeyword = rowPossible[0]
        }
        // Likewise for the column
        if (colPossible.length === 1) {
            result.append(`Since we know that `)
                .append(this.encodeFixed(colPossible[0]))
                .append(` is the Column Keyword, we can fill it in.`)
            solverData.colKeyword = colPossible[0]
        }
        // Give them what the starting table looks like
        this.showPolybiusTable(result, true, solverData)

        if (await this.restartCheck()) { return }

        this.showStepText(result,
            "The remaining spaces are filled in alphabetical order, again skipping any letters that have already been used in the table.")
        // result.append("The remaining spaces are filled in alphabetical order, again skipping any letters that have already been used in the table.")

        // Show them the completely filled in table
        this.showPolybiusTable(result, true, solverData)

        if (await this.restartCheck()) { return }

        this.showStep(result, "Step 3: Test a few letters to make sure that the table is correct.");

        // See how many possibilities we have so we can determine if we can brute force the search
        let possibilities = rowPossible.length * colPossible.length
        let foundRow = false
        let foundCol = false

        if (possibilities > 8) {
            // There are more than 8 options, so we want to see if we can shortcut picking which one it will be
            this.showStepText(result, `There are ${possibilities} possibilities which could take a while to check, so instead, do a frequency
                 count on all of the pairs to find the most likely candidates for the letter E.
                 Effectively we can solve the Checkboard cipher like an Aristocrat/Patristrocat for the pairs of letters.`)
            const seqFrequency = this.CountTopSequences(sequencesets[0][0])
            let dbg = ''
            for (const ent of seqFrequency) {
                if (ent[1] > 2) {
                    dbg += ' ' + ent[0] + '=' + ent[1]
                }
            }
            this.showStepText(result, `Counting all of the entries we see that ${dbg}`)

            const [rowNum, colNum] = this.findLetterPosition('E');
            if (rowNum === -1 || colNum === -1) {
                this.setErrorMsg(`Auto-Solver is unable to determine the location of the letter E in the polybius square.  Consider different keywords.`, 'si',);
                return;
            }
            this.showStepText(result, `Looking at the Polybius table, we can see that E is in row ${rowNum + 1} and column ${colNum + 1} so we will check each of the entries that have words with the corresponding letters in those positions.`)
            for (const ent of seqFrequency) {
                if (await this.restartCheck()) { return }

                this.showStepText(result, `Looking for row keywords which with have ${ent[0][0]} in position ${rowNum + 1} and column keywords which have ${ent[0][1]} in position ${colNum + 1}.`)
                if (this.checkDecodePairs(result, rowNum, colNum, ent[0], rowPossible, colPossible, sequencesets[0][0], solverData)) {
                    this.showStepText(result, `This looks like it can decode to reasonable answer, so we will go with it.`)
                    rowPossible = [this.cleanRowKeyword]
                    colPossible = [this.cleanColKeyword]
                    foundRow = true
                    foundCol = true
                    break;
                }
            }
            possibilities = rowPossible.length * colPossible.length
        }

        if (possibilities === 1) {
            this.showStepText(result, `We now have only a single possibility so we don't have to do any guessing here and can just proceed to decoding the cipher text.`)

            if (rowPossible[0] === this.cleanRowKeyword) {
                foundRow = true
            }
            if (colPossible[0] === this.cleanColKeyword) {
                foundCol = true
            }
        } else {
            this.showStepText(result, `We have only ${possibilities} possibilities so we can just quickly try them all out.` +
                ` To do this, we just substitute in each possible combination of keywords and decode the first few letters to see what comes out.`)
            for (const rowChoice of rowPossible) {
                if (rowChoice === this.cleanRowKeyword) {
                    foundRow = true
                }

                if (await this.restartCheck()) { return }

                for (const colChoice of colPossible) {
                    if (colChoice === this.cleanColKeyword) {
                        foundCol = true
                    }
                    if (!solverData.tested[rowChoice + colChoice]) {
                        solverData.tested[rowChoice + colChoice] = true
                        this.showFirstTen(rowChoice, colChoice, sequencesets[0][0], result)
                    }
                }
            }
        }
        if (!foundRow) {
            this.setErrorMsg(`Auto-Solver is unable to match the Row Keyword ${this.cleanRowKeyword} against the determined keywords ${rowPossible.join(',')}.  Consider a different keyword.`, 'si',);
            return;
        }
        if (!foundCol) {
            this.setErrorMsg(`Auto-Solver is unable to match the Column Keyword ${this.cleanColKeyword} against the determined keywords ${colPossible.join(',')}.  Consider a different keyword.`, 'si',);
            return;
        }
        if (possibilities > 1) {
            result.append(`Looking at all of these, the only ones that look close are `)
                .append(this.encodeFixed(this.cleanRowKeyword))
                .append(' and ')
                .append(this.encodeFixed(this.cleanColKeyword))
                .append(' so we will proceed to use them.')
        }

        if (await this.restartCheck()) { return }

        this.showStep(result, "Step 4: Build the final table and decode.");
        result.append('Now that we know our Row Keyword to be ')
            .append(this.encodeFixed(this.cleanRowKeyword))
            .append(' and our Column Keyword to be ')
            .append(this.encodeFixed(this.cleanColKeyword))
            .append(' we can make sure that they are in the row/column headers and decode the cipher text.')
        solverData.colKeyword = this.cleanColKeyword
        solverData.rowKeyword = this.cleanRowKeyword

        const { width, extraclass } = this.getTestWidth(testType);

        if (await this.restartCheck()) { return }

        let sequencesets2 = this.buildDecodeSequenceSets(this.state.cipherString, width)
        result.append(this.buildCheckerboard(this.state.operation, sequencesets2))

        if (await this.restartCheck()) { return }

        let hasMultiChars = false
        for (let set of sequencesets2) {
            for (let ct of set[1]) {
                if (ct.length > 1) {
                    hasMultiChars = true;
                    break;
                }
            }
        }

        if (hasMultiChars) {
            result.append('Since some of the cipher text characters mapped to more than one letter (as I/J always does) we need to ')
                .append('pick out which is the correct letter for the final answer. Based on that ')
        }

        let answer = $('<span/>', { class: 'hl' }).text(this.cleanString(this.state.cipherString.toUpperCase()))

        result.append(`Here's our answer: `).append(answer)
    }

    public async genEncodeSolution(target: JQuery<HTMLElement>) {
        return
    }
    /**
     * Generate a solving guide for a Cryptanalysis problem
     * @param target DOM Element to output solution into
     */
    public async genCryptanalysisSolution(target: JQuery<HTMLElement>) {
        let firstTime = true
        this.state.autoSolverScore = undefined

        const result = $('<div/>', { id: 'solution' });
        target.append(result);

        let solverData = await this.genCryptanalysisStep1(result)
        if (await this.restartCheck()) { return }

        this.attachHandlers();

        if (solverData === undefined) {
            // We had a problem in step 1 so just return
            this.showStepText(result, `The Auto-Solver is unable to handle these keywords.`);
            return;
        }

        await this.genCryptanalysisStep2(result, solverData)
        if (await this.restartCheck()) { return }

        let found = true
        let unsolvedCount = 0
        let maxiterations = 25
        let iterations = 0
        while ((iterations++ < maxiterations) && found) {
            // Try steps 3 and 4 a few times to see if we can make any progress
            found = await this.genCryptanalysisStep3a(result, solverData, firstTime)
            if (await this.restartCheck()) { return }

            unsolvedCount = await this.unsolvedCount(solverData)
            if (unsolvedCount === 0) {
                break;
            }

            if (await this.genCryptanalysisStep3b(result, solverData, firstTime)) {
                found = true;
            }
            if (await this.restartCheck()) { return }

            unsolvedCount = await this.unsolvedCount(solverData)
            if (unsolvedCount === 0) {
                break;
            }
            firstTime = false;
        }

        this.state.autoSolverScore = (iterations / maxiterations) + (0.25 * unsolvedCount)
        if (unsolvedCount === 0) {
            this.showStep(result, `Final Step: We have fully decoded the Checkerboard Cipher.  Remember that we have to pick between I/J in the final answer.`);
        } else {
            this.showStep(result, `Final Step: We are unable to make any more progress`);
            this.setErrorMsg(`Auto-Solver is unable to completely solve the Checkerboard Cipher.  Consider a different Crib.`, 'si');
            this.showStepText(result, `At this point we are unable to make any more progress.` +
                `  You can try to continue guessing keywords or fill in more letters in the Polybius square and see if that helps.` +
                ` Remember that we have to pick between I/J in the final answer.`);
        }
        // Show them the final solution (differentiating between I/J)
        this.showCurrentSolution(target, solverData, true);
    }
    /**
     * Eliminate impossible keywords based on the crib and cipher text
     * @param target DOM element to output notes to
     * @param solverData Solving state date
     * @returns Boolean indicating that we are able to continue solving
     */
    public async eliminateKeywords(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData): Promise<boolean> {
        const saveRowPossible = solverData.rowPossible.slice()
        const saveColPossible = solverData.colPossible.slice()
        let foundRow = []
        let foundCol = []
        this.showStep(target, "Step 1b: Eliminate impossible Row/Column keywords");
        this.showStepText(target, `Since we have more than one possibility for the Row and/or Column keywords, we can use the crib to try to eliminate some of them by looking at the cipher text sequences and seeing which keywords can produce valid letters in the polybius square.`)
        for (let rowChoice of saveRowPossible) {
            for (let colChoice of saveColPossible) {
                if (await this.restartCheck()) { return false; }
                this.showStepText(target, `Trying Row=${rowChoice} and Column=${colChoice}`)
                solverData.rowPossible = [rowChoice]
                solverData.colPossible = [colChoice]
                this.fillCribMatches(solverData);
                this.showPolybiusTable(target, true, solverData)
                if (this.checkKeyword(target, solverData)) {
                    if (!foundRow.includes(rowChoice)) {
                        foundRow.push(rowChoice)
                    }
                    if (!foundCol.includes(colChoice)) {
                        foundCol.push(colChoice)
                    }
                }
            }
        }
        if (foundRow.length === 0 || foundCol.length === 0) {
            this.setErrorMsg('Auto-Solver is unable to determine the Row keyword given the Cipher letters.  Consider different keywords.', 'si',);
            return false;
        }
        if (foundRow.length === 1 && foundCol.length === 1) {
            this.showStepText(target, `We have narrowed the possibilities down to a single Row and Column keyword, so we can proceed using ${foundRow[0]} and ${foundCol[0]}.`)
        } else if (foundRow.length > 1 || foundCol.length > 1) {
            // For now we will just pick the best one
            this.showStepText(target, `We have narrowed the possibilities down to ${foundRow.length} Row keywords and ${foundCol.length} Column keywords, so we will proceed using ${this.cleanRowKeyword} and ${this.cleanColKeyword} which looks to be the best choice.`)
            foundRow = [this.cleanRowKeyword]
            foundCol = [this.cleanColKeyword]
        }
        solverData.rowPossible = foundRow
        solverData.colPossible = foundCol
        return true;
    }
    /**
     * Determine if we have solved the checkerboard cipher
     * @param solverData Current solver data state
     * @returns True if we have solved the polybius square
     */
    public async unsolvedCount(solverData: CheckerboardSolverData): Promise<number> {
        let unsolved = 0;
        let unsolvedList: BoolMap = {};

        // See if we have solved the polybius square
        for (let ct of solverData.sequenceSets[0][0]) {
            if (ct.length == 2) {
                const ptcopts = solverData.polybius.get(ct)
                if (ptcopts === undefined || ptcopts.length !== 1) {
                    if (!unsolvedList[ct]) {
                        unsolved++;
                        unsolvedList[ct] = true;
                    }
                }
            }
        }
        return unsolved;
    }
    /**
     * Find words that are almost solved and use them to fill in more of the polybius square
     * @param target DOM element to output notes to
     * @param solverData Solving state date
     * @returns Boolean indicating that we made progress
     */
    public async findSolvableWords(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData): Promise<boolean> {
        const cipherText = solverData.sequenceSets[0][0]
        const plainText = solverData.sequenceSets[0][1]
        let words: wordInfo[] = []
        let currentWord: wordInfo = undefined
        let prevComplete = 999;

        for (let i = 0; i < cipherText.length; i++) {
            if (cipherText[i].length == 2) {
                if (currentWord === undefined) {
                    currentWord = { plaintext: "", length: 0, complete: true, candiate: false, cipherTextMissing: undefined, plainTextMissing: undefined, startpos: i, prevComplete: prevComplete, nextComplete: 0 }
                    words.push(currentWord)
                    prevComplete++;
                }
                currentWord.length++;
                // See if the current letter is known
                const ctc = cipherText[i]
                const ptc = plainText[i]
                const ptcopts = solverData.polybius.get(ctc)
                if (ptcopts === undefined || ptcopts.length !== 1) {
                    currentWord.complete = false;
                    prevComplete = 0;
                    if (currentWord.cipherTextMissing === undefined || currentWord.cipherTextMissing === ctc) {
                        currentWord.cipherTextMissing = ctc
                        currentWord.plainTextMissing = ptc
                        currentWord.candiate = true;
                    } else {
                        // We have more than one missing letter, so this is not a candidate
                        currentWord.candiate = false;
                        currentWord.plainTextMissing = "?";
                        currentWord.cipherTextMissing = "?";
                    }
                }
            } else {
                currentWord = undefined;
            }
        }
        // Go through the list backwards filling in the nextcomplete
        let nextComplete = 999
        for (let i = words.length - 1; i >= 0; i--) {
            words[i].nextComplete = nextComplete;
            if (words[i].complete) {
                nextComplete++;
            } else {
                nextComplete = 0;
            }
        }
        // We have categorized all of the words, so now we can look for candidates
        // Our priority for words is:
        //  Words at the start of the quote
        //  Words at the start of the quote after fully solved words at the start
        //  Words at the end of the quote
        //  Words at the end of the quote before fully solved words at the end
        //  Words between two words that are fully solved
        //  Words after two fully solved words
        //  Words before two fully solved words
        //  Words of more than 5 letters
        let highcomplete = 0;
        let highword: wordInfo = undefined;
        for (let w of words) {
            if (w.candiate) {
                if (w.prevComplete > highcomplete) {
                    highcomplete = w.prevComplete;
                    highword = w;
                } else if (w.nextComplete > highcomplete) {
                    highcomplete = w.nextComplete;
                    highword = w;
                } else if (w.prevComplete + w.nextComplete > highcomplete) {
                    highcomplete = w.prevComplete + w.nextComplete;
                    highword = w;
                } else if (w.length > 5 && w.prevComplete > 0 && w.nextComplete > 0) {
                    highcomplete = w.length;
                    highword = w;
                }
            }
        }
        if (highword !== undefined) {
            // Let's get the word
            let wordchars = ''
            for (let i = 0; i < highword.length; i++) {
                wordchars += plainText[highword.startpos + i]
            }
            this.showStepText(target, `Looking at the discovered plain text with one missing letter ${highword.plainTextMissing} from the word '${wordchars}' which tells us that ${highword.cipherTextMissing} must map to ${highword.plainTextMissing}.`)
            // solverData.polybius.set(highword.cipherTextMissing, [highword.plainTextMissing]);
            this.setPolybiusKnown(solverData, highword.cipherTextMissing, highword.plainTextMissing);

            return true;
        }
        // The first level didn't find a high word, lets go through and see if we can find a word with multiple options for one or more letters and a single letter missing.
        // Build a pattern of all the letters that aren't positively known
        let unknownpattern = '';
        solverData.polybius.forEach((vals, _) => { if (vals?.length === 1) { unknownpattern += vals[0] } })
        if (unknownpattern.includes('I')) { unknownpattern += 'J' }
        unknownpattern = '[^' + unknownpattern + ']'
        for (let w of words) {
            if (!w.complete) {
                let unknownCount = 0;
                let partialCount = 0;
                let foundChar: BoolMap = {};
                let matchPattern = '';
                let searchPattern = '';
                let displayPattern = '';
                let displayfix = '';
                let extra = '';
                for (let i = w.startpos; i < w.startpos + w.length; i++) {
                    const ctc = cipherText[i]
                    searchPattern += plainText[i];
                    const ptcopts = solverData.polybius.get(ctc)
                    if (!foundChar[ctc]) {
                        foundChar[ctc] = true;
                        if (ptcopts === undefined) {
                            unknownCount++;
                            displayfix += `${extra} ${ctc} maps to ${plainText[i]}`
                            extra = ' and ';
                        } else if (ptcopts.length > 1) {
                            partialCount++;
                            displayfix += `${extra} ${ctc} maps to ${plainText[i]}`
                            extra = ' and ';
                        }
                    }
                    if (ptcopts === undefined) {
                        matchPattern += unknownpattern;
                        displayPattern += ' ?';
                    } else if (ptcopts.length === 1) {
                        matchPattern += ptcopts[0];
                        displayPattern += ' ' + ptcopts[0];
                    } else {
                        matchPattern += '(' + ptcopts.join('|') + ')';
                        displayPattern += ' ' + ptcopts.join('|');
                    }
                }
                // We will look up the words if there is zero or 1 unknowns and no more than 2 partials
                if (unknownCount <= 1 && partialCount <= 3) {
                    let matchedword = undefined;
                    const pat = this.makeUniquePattern(searchPattern, 1)
                    let patlist = this.Frequent[this.state.curlang][pat]
                    if (patlist !== undefined) {
                        let regex = new RegExp('^' + matchPattern + '$')
                        for (const entry of patlist) {
                            if (regex.test(entry[0])) {
                                if (matchedword !== undefined) {
                                    console.log(`Multiple matches for pattern ${matchPattern}: ${matchedword} and ${entry[0]}`);
                                    matchedword = undefined;
                                    break;
                                }
                                matchedword = entry[0];
                            }
                        }
                    }
                    if (matchedword !== undefined) {
                        // We have exactly one match so we can fill it in
                        this.showStepText(target, `Looking at the discovered plain text we see the sequence '${displayPattern}' which matches one word '${matchedword}' telling us that ${displayfix}.`)
                        for (let i = w.startpos; i < w.startpos + w.length; i++) {
                            this.setPolybiusKnown(solverData, cipherText[i], plainText[i]);
                        }
                        return true;
                    }
                }
            }
        }

        return false;
    }
    /**
     * Cryptanalysis Step 1: Possible row and column keywords and decide on one
     * @param target DOM element to put output into
     * @returns Solver data state
     */
    public async genCryptanalysisStep1(target: JQuery<HTMLElement>): Promise<CheckerboardSolverData> {
        const result = $('<div/>', { id: 'solution' });
        target.append(result);

        // Build sequence sets and gather letters
        const sequencesets = this.buildCheckerboardSequenceSets(
            this.cleanString(this.state.cipherString),
            9999, undefined, undefined, true
        );

        let [rowPossible, colPossible, failed] = await this.step1DetermineHeaders(result, sequencesets)

        const solverData: CheckerboardSolverData = {
            sequenceSets: sequencesets,
            rowPossible: rowPossible, colPossible: colPossible,
            rowKeyword: "", colKeyword: "",
            polybius: new Map<string, string[]>(),
            warned: false,
            tested: {}
        }

        if (failed) {
            return undefined;
        }

        // For now we only handle the case where we have a single option for each keyword
        if (rowPossible.length > 1 || colPossible.length > 1) {
            if (!await this.eliminateKeywords(target, solverData)) {
                this.showStepText(target, "Auto-Solver is unable to determine the Row and Column keywords given the Cipher letters.")
                this.setErrorMsg('Auto-Solver is unable to determine the Row and Column keywords given the Cipher letters.  Consider different keywords.', 'si',);
                return undefined;
            }
        }
        solverData.rowKeyword = rowPossible[0]
        solverData.colKeyword = colPossible[0]

        // Check for dupliate letters in the keywords
        if (this.undupeString(solverData.rowKeyword).length < 5) {
            this.showStepText(target, `Auto-Solver has detected that the Row keyword ${solverData.rowKeyword} has duplicate letters.`);
            this.setErrorMsg(`Auto-Solver has detected that the Row keyword ${solverData.rowKeyword} has duplicate letters and is unable to generate an automatice solution.  Consider a different keyword.`, 'si',);
            return undefined;
        }
        if (this.undupeString(solverData.colKeyword).length < 5) {
            this.showStepText(target, `Auto-Solver has detected that the Column keyword ${solverData.colKeyword} has duplicate letters.`);
            this.setErrorMsg(`Auto-Solver has detected that the Column keyword ${solverData.colKeyword} has duplicate letters and is unable to generate an automatice solution.  Consider a different keyword.`, 'si',);
            return undefined;
        }

        this.showStepText(target, "Now we can set up our Polybius table with the Row and Column keywords in place")

        this.showPolybiusTable(target, true, solverData)

        return solverData
    }
    /**
     * Cryptanalysys Step 2: Find the keyword letter mappings
     * @param target DOM element to put output into
     * @param solverData Solving state date
     * @returns Boolean indicating that we made progress
     */
    public genCryptanalysisStep2(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData) {
        this.showStep(target, "Step 2: Utilize crib to fill in polybius square");

        this.fillCribMatches(solverData);
        this.showStepText(target, `Fill in the plain text letters under the corresponding spots and also under any other ciphertext sequences which match`)
        this.showCurrentSolution(target, solverData);
    }
    /**
     * Cryptanalysys Step 3a: Fill in the possibilities in the remaining spots
     * @param target DOM element to put output into
     * @param solverData Solving state date
     * @returns Boolean indicating that we made progress
     */
    public async genCryptanalysisStep3a(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData, firstTime: boolean): Promise<boolean> {
        let result = $('<div/>')
        this.showStep(result, "Step 3a: Fill in the possibilities in the remaining spots of the polybius table");
        const filled = this.fillLetterGaps(result, solverData);
        if (filled) {
            target.append(result);
            if (firstTime) {
                this.showSolvingNote(target, `For example, if a sequence on the polybius table was T _ _ W, we know the middle two blanks must be U and V. If the sequence was T _ W, we know the middle blank must be U or V`)
            }
            this.showCurrentSolution(target, solverData);
        }
        return filled !== 0
    }
    /**
     * Cryptanalysys Step 3b: Look for any obvious words missing letters
     * @param target DOM element to put output into
     * @param solverData Solving state date
     * @returns Boolean indicating that we made progress
     */
    public async genCryptanalysisStep3b(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData, _firstTime: boolean): Promise<boolean> {
        let result = $('<div/>')
        this.showStep(result, "Step 3b: Look for any obvious words missing letters");

        const progress = await this.findSolvableWords(result, solverData)
        if (progress) {
            target.append(result);
            this.showCurrentSolution(target, solverData)
        }
        return progress
    }
    /**
     * Generate the HTML to display the question for a cipher
     * @param testType Type of test
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });

        //generating empty 5x5 polybius square table for students
        const polybiusDiv = $('<div/>', { class: 'cell shrink' })
        const polybiusSquare = $('<table/>', { class: 'polybius-square' });

        const head = $('<thead/>')
        const row = $('<tr/>');
        for (let a = 0; a < 6; a++) {
            if (a == 0) {
                const cell = $('<th/>').append($('<div/>', { class: 'square' }).html('&nbsp;'));
                row.append(cell);
            } else {
                const cell = $('<th/>').append($('<div/>', { class: 'square' }).html('&nbsp;'));
                row.append(cell);
            }
        }

        head.append(row);
        polybiusSquare.append(head);

        for (let i = 1; i < 6; i++) {
            const row = $('<tr/>');
            for (let j = 0; j < 6; j++) {
                if (j == 0) {
                    const cell = $('<th/>').append($('<div/>', { class: 'square' }).html('&nbsp;'));
                    row.append(cell);
                } else {
                    const cell = $('<td/>').append($('<div/>', { class: 'square' }).html('&nbsp;'));
                    row.append(cell);
                }
            }
            polybiusSquare.append(row);
        }

        polybiusDiv.append(polybiusSquare)

        const { width, extraclass } = this.getTestWidth(testType);
        const strings = this.buildCheckerboardSequenceSets(this.state.cipherString, width);
        const tableDiv = $('<div/>', { class: 'cell auto' })
        const table = new JTTable({ class: 'Checkerboard ansblock unstriped' + extraclass });
        // const blankrow = table.addBodyRow();
        // blankrow.add("\u00A0");
        let source = 0;
        if (this.state.operation === 'encode') {
            source = 1;
        }
        for (const sequenceset of strings) {
            const rowcipher = table.addBodyRow();
            const blankrow1 = table.addBodyRow();
            const blankrow2 = table.addBodyRow();
            blankrow1.add("\u00A0");
            blankrow2.add("\u00A0");
            for (const token of sequenceset[source]) {
                rowcipher.add(token);
            }
            //this.addCipherTableRows(table, '', sequenceset[source].join(''), undefined, true);
        }
        tableDiv.append(table.generate());
        result.append(tableDiv)
        result.append(polybiusDiv)



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
        const { width, extraclass } = this.getTestWidth(testType);
        const strings = this.buildCheckerboardSequenceSets(this.state.cipherString, width);
        let source = 0;
        if (this.state.operation === 'encode') {
            source = 1;
        }

        let newStrings = [];
        for (const strset of strings) {
            let newSet = [];
            for (let i = 0; i < 2; i++) {
                let strarray = strset[i];
                let joined = strarray.join('');
                newSet.push(joined);
            }
            newStrings.push(newSet);
        }
        result.append(

            this.genInteractiveCipherTable(newStrings, source, qnum, 'cipherint' + extraclass, true)
        );

        result.append($('<textarea/>', { id: 'in' + qnumdisp, class: 'intnote' }));
        return result;
    }
    /**
     * Start the dialog for suggesting the keyword
     */
    public suggestKey(): void {
        this.startSuggestKey();
    }
    /**
     * Populate the dialog with a set of keyword suggestions. 
     */
    public populateKeySuggestions(): void {
        this.populateLenKeySuggestions('genbtn', 'suggestKeyopts', 20, 5, 5)
    }



    public genUseKey(key: string, useclass = "keyset"): JQuery<HTMLElement> {
        if (key === undefined) {
            return $("<span/>")
        }
        let difficultyObj = this.getKeywordDifficulty(key);
        let warnlevel = "";
        if (difficultyObj[0] > 2) {
            warnlevel = "warning";
        }
        if (difficultyObj[1] || difficultyObj[2] > 4) {
            warnlevel = "alert";
        }
        let useButton = $("<a/>", {
            'data-key': key,
            type: "button",
            class: `button rounded ${useclass} abbuttons ${warnlevel}`,
        }).html(`Use (${difficultyObj[2]})`);
        let div = $("<div/>", { class: "kwchoice" })
        div.append(useButton)
        div.append(key)
        return div
    }

    /**
     * Calculate the difficulty of the row/column keyword.
     * @param key 
     * @returns 
     */
    public getKeywordDifficulty(key: string): [number, boolean, number] {
        let result = 0;
        let hasDuplicates = false;
        let anagrams = this.findAnagrams(key, key.length);
        result = result + 0.5 * (anagrams.length - 1);
        let duplicateCheck = new Array<string>();
        let duplicates = 0;
        for (var i = 0; i < key.length; i++) {
            if (duplicateCheck.includes(key[i])) {
                duplicates = duplicates + 1;
                hasDuplicates = true;
            }
            duplicateCheck.push(key[i]);
        }
        result = result + duplicates;

        return [result, hasDuplicates, anagrams.length - 1];
    }

    /**
     * Set the keyword from the suggested text
     * @param elem Element clicked on to set the keyword from
     */
    public setSuggestedKey(elem: HTMLElement): void {
        const jqelem = $(elem)
        const key = jqelem.attr('data-key')
        $('#suggestKeyDLG').foundation('close')
        this.markUndo('')
        if (this.suggestType === 'row') {
            this.setKeyword(key)
        } else {
            this.setKeyword2(key)
        }
        this.updateOutput()
    }
    /**
     * Generate a dialog showing the choices for potential Cribs
     */
    public createSuggestCribDlg(title: string): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');

        const xDiv = $('<div/>', { class: 'grid-x' })
        dlgContents.append(xDiv);
        dlgContents.append($('<div/>', { class: 'callout primary', id: 'suggestCribOpts' }))
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'button cribRegenerate', id: 'genbtn' }).text('Regenerate'))
                .append(
                    $('<a/>', { class: 'secondary button', 'data-close': '' }).text(
                        'Cancel'
                    )
                )
        );
        const suggestKeyDlg = JTFDialog('suggestCribDLG', title, dlgContents);
        return suggestKeyDlg;
    }
    /**
     * Set a keyword from the recommended set
     * @param elem Keyword button to be used
     */
    public useKeyword(elem: HTMLElement): void {
        const jqelem = $(elem)
        const text = jqelem.attr('data-key')
        // Give an undo state s
        this.markUndo(null)
        this.setPolybiusKey(text)
        $('#keywordDLG').foundation('close')
        this.updateOutput()
    }

    public genCribSuggestions() {
        let output = $("#suggestCribOpts");
        const divAll = $("<div/>", { class: 'grid-x' })
        const cellLeft = $('<div/>', { class: 'cell auto' })
        //const cellRight = $('<div/>', { class: 'cell auto' })
        const cellMid = $('<div/>', { class: 'cell auto' })
        divAll.append(cellLeft).append(cellMid)//.append(cellRight)
        output.empty().append(divAll)

        //Generate cipher unit sequence
        let cipherUnitSequence = new Array<string>();

        this.sequencesets.forEach((value: string[][]) => {
            value[0].forEach((char: string) => {
                if (char.length === 2) {
                    cipherUnitSequence.push(char);
                }
            });
        });

        //Generate plain text character sequence
        let plainTextCharacterSequence = new Array<string>();
        this.sequencesets.forEach((value: string[][]) => {
            value[1].forEach((char: string) => {
                if (char.match(/[A-Z]/gi) != null && char.match(/[A-Z]/gi).length > 0) {
                    plainTextCharacterSequence.push(char);
                }
            });
        });

        //CRIB GENERATOR SETTINGS

        let minCribLength = 5;
        let maxCribLength = 10;
        // Target direct and indirect reveal amount
        let targetRevealCount = 15;
        let minRevealCount = 5;
        // Number of cribs to add to UI
        let cribSelectCount = 14;
        // Generator Randomize Factor 0-1
        let randomizerWeight = 0.2;

        //Generate potential cribs
        let potentialCribs = new Array<{ crib: string; directCount: number; indirectCount: number }>();
        for (var currentGeneratorLength = minCribLength; currentGeneratorLength <= maxCribLength; currentGeneratorLength++) {
            for (var cribStartPos = 0; cribStartPos < (cipherUnitSequence.length - currentGeneratorLength); cribStartPos++) {
                let potentialCrib = this.cribGenerator(cribStartPos, currentGeneratorLength, cipherUnitSequence, plainTextCharacterSequence)
                if ((potentialCrib.directCount + potentialCrib.indirectCount) > minRevealCount) {
                    potentialCribs.push(potentialCrib);
                }
            }
        }

        //Sort potential cribs
        potentialCribs.sort((a: { crib: string; directCount: number; indirectCount: number }, b: { crib: string; directCount: number; indirectCount: number }) => {
            if (Math.abs((a.directCount + a.indirectCount) - targetRevealCount) < Math.abs((b.directCount + b.indirectCount) - targetRevealCount)) {
                return -1;
            }
            if (Math.abs((a.directCount + a.indirectCount) - targetRevealCount) > Math.abs((b.directCount + b.indirectCount) - targetRevealCount)) {
                return 1;
            }
            return (a.directCount + a.indirectCount) - (b.directCount + b.indirectCount);
        });

        //Add selection amount to the UI
        for (var selection = 0; selection < potentialCribs.length; selection++) {
            if (cribSelectCount === 0) {
                break;
            }
            if (Math.random() < randomizerWeight || (potentialCribs.length - selection) <= cribSelectCount) { //Pick crib randomly
                let div = $('<div/>', { class: "kwchoice" });

                let useButton = $("<a/>", {
                    'data-crib': potentialCribs[selection].crib,
                    type: "button",
                    class: "button rounded cribset abbuttons",
                }).html(`Use`);
                div.append(useButton);
                div.append(`${potentialCribs[selection].crib} <em>[${potentialCribs[selection].directCount + potentialCribs[selection].indirectCount}]</em>`);
                if (cribSelectCount % 2 === 0) {
                    cellLeft.append(div);
                } else {
                    cellMid.append(div);
                }
                cribSelectCount--;
            }

        }
        this.attachHandlers();
    }

    /** 
    * Determine the crib, number of direct revealed characters, number of indirect revealed characters
    * @param startPos Position in the cipher unit sequence to generate crib information from
    * @param len Length of the potential crib
    * @param cipherUnitLookup Lookup table of cipher units
    * @param cipherUnitSequence Array of cipher units
    */
    private cribGenerator(startPos: number, len: number, cipherUnitSequence: string[], plainTextCharacterSequence: string[]): { crib: string; directCount: number; indirectCount: number } {
        let res = {
            crib: "",
            directCount: 0,
            indirectCount: 0
        };

        //Generate cipher unit lookup map
        let cipherUnitLookup = new Map<string, [string, number, string]>(); //"N"-Not revealed, "D"-Direct reveal, "I"-Indirect reveal
        let cipherUnits = Array.from(this.polybiusMap.entries());
        for (var indexer = 0; indexer < cipherUnits.length - 1; indexer++) {
            cipherUnitLookup.set(cipherUnits[indexer][1], [cipherUnits[indexer][0], indexer + 1, "N"]);
        }


        //Set direct reveal 
        for (var scanner = startPos; scanner < (startPos + len); scanner++) {
            res.crib = res.crib + plainTextCharacterSequence[scanner];
            let cipherUnit = cipherUnitLookup.get(cipherUnitSequence[scanner])
            if (cipherUnit[2] === "N") {
                res.directCount++;
            }
            cipherUnit[2] = "D";
        }

        //Find indirect reveals
        let scannerLeft = 23;
        let scannerRight = 24;
        let characterLeft = cipherUnitLookup.get(cipherUnits[scannerLeft][1]);
        let characterRight = cipherUnitLookup.get(cipherUnits[scannerRight][1]);

        for (; scannerLeft >= 0; scannerLeft--) {
            characterLeft = cipherUnitLookup.get(cipherUnits[scannerLeft][1]);
            if (characterLeft[2] === "D") {
                let alphabeticalGap = characterRight[0].charCodeAt(0) - characterLeft[0].charCodeAt(0);

                //Remove letter J from gap amount
                if (characterLeft[0].charCodeAt(0) < 74 && characterRight[0].charCodeAt(0) > 74) {
                    alphabeticalGap--;
                }

                //Remove direct reveal polybius key letters from gap amount
                let polybiusKeyCharacterCheck = new Array<string>();
                for (var polyScaner = 0; polyScaner < this.state.polybiusKey.length; polyScaner++) {
                    if (characterLeft[0].charCodeAt(0) < this.state.polybiusKey.charCodeAt(polyScaner) && characterRight[0].charCodeAt(0) > this.state.polybiusKey.charCodeAt(polyScaner) && !polybiusKeyCharacterCheck.includes(this.state.polybiusKey.charAt(polyScaner)) && res.crib.includes(this.state.polybiusKey.charAt(polyScaner))) {
                        alphabeticalGap--;
                        polybiusKeyCharacterCheck.push(this.state.polybiusKey.charAt(polyScaner));
                    }
                }


                if (alphabeticalGap === (scannerRight - scannerLeft)) {
                    let holdRightCharacter = characterRight[0].charCodeAt(0);
                    while (scannerRight > scannerLeft) {
                        if (characterRight[2] === "N" && characterLeft[0].charCodeAt(0) < characterRight[0].charCodeAt(0) && characterRight[0].charCodeAt(0) <= holdRightCharacter) {
                            characterRight[2] = "I";
                            res.indirectCount++;
                        }
                        scannerRight--;
                        characterRight = cipherUnitLookup.get(cipherUnits[scannerRight][1]);
                    }
                }

                scannerRight = scannerLeft;
                characterRight = cipherUnitLookup.get(cipherUnits[scannerRight][1]);
            }


        }
        //console.log(cipherUnitLookup);
        //console.log(res);
        return res;
    }
    /**
    * Start the process to suggest cribs
    */
    public suggestCrib(): void {
        // this.loadLanguageDictionary('en').then(() => {
        $('#suggestCribDLG').foundation('open');
        this.genCribSuggestions();
        // })
    }
    /**
     * Set a keyword and offset from the recommended set
     * @param elem Keyword button to be used
     */
    public useCrib(elem: HTMLElement): void {
        const jqelem = $(elem)
        const text = jqelem.attr('data-crib')
        // Give an undo state s
        this.markUndo(null)
        this.setCrib(text)
        $('#suggestCribDLG').foundation('close')
        this.updateOutput()

    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('#blocksize')
            .off('input')
            .on('input', (e) => {
                const blocksize = Number($(e.target).val());
                if (blocksize !== this.state.blocksize) {
                    this.markUndo('bs');
                    if (this.setBlocksize(blocksize)) {
                        this.updateOutput();
                    }
                }
            });
        $('#keyword')
            .off('input')
            .on('input', (e) => {
                const newkeyword = $(e.target).val() as string;
                if (newkeyword !== this.state.keyword) {
                    this.markUndo('keyword');
                    if (this.setKeyword(newkeyword)) {
                        this.updateOutput();
                    }
                }
            });

        $('#polybiuskey')
            .off('input')
            .on('input', (e) => {
                const newPolybiusKey = $(e.target).val() as string;
                if (newPolybiusKey !== this.state.polybiusKey) {
                    this.markUndo('polybiuskey');
                    if (this.setPolybiusKey(newPolybiusKey)) {
                        this.updateOutput();
                    }
                }
            });

        $('#keyword2')
            .off('input')
            .on('input', (e) => {
                const keyword2 = $(e.target).val() as string;
                if (keyword2 !== this.state.keyword2) {
                    this.markUndo('keyword2');
                    if (this.setKeyword2(keyword2)) {
                        this.updateOutput();
                    }
                }
            });
        $('#suggestpkey')
            .off('click')
            .on('click', () => {
                this.suggestKeyword()
            });
        $('#suggestkey')
            .off('click')
            .on('click', () => {
                this.suggestType = 'row'
                this.suggestKey()
            })
        $('#suggestkey2')
            .off('click')
            .on('click', () => {
                this.suggestType = 'col'
                this.suggestKey()
            })
        $('#suggestcrib')
            .off('click')
            .on('click', () => {
                this.suggestCrib()
            })
        $('.cribset')
            .off('click')
            .on('click', (e) => {
                this.useCrib(e.target)
            })
        $('.cribRegenerate')
            .off('click')
            .on('click', () => {
                this.genCribSuggestions()
            })
    }
}
