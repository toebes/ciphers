import { BoolMap, calloutTypes, cloneObject, makeCallout, makeFilledArray, NumberMap, StringMap } from '../common/ciphercommon';
import { IOperationType, IState, ITestType, toolMode, ITestQuestionFields, IScoreInformation } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFDialog } from '../common/jtfdialog';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTRow, JTTable } from '../common/jttable';
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

type CheckerboardSolverMappings = number[][]
type PolybiusMap = Map<string, string[]>
type Known = 'none' | 'tens' | 'ones' | 'all'
type TableType = 'tens' | 'ones' | 'example'
type SuggestType = 'row' | 'col'

interface CheckerboardSolverData {
    /** The known Row keyword */
    rowKeyword: string;
    /** The known Column keyword */
    colKeyword: string;
    /** The known keyword */
    keyword: string
    /** Initial mapping of the 10's digits to the keywords an array per letters in the keyword */
    tens: CheckerboardSolverMappings
    /** Initial mapping of the 1's digits to the keywords.  An Array per letters in the keyword 
     *  Note that once the kwChoices map is created, this is no longer used
     */
    ones: CheckerboardSolverMappings
    /** Mapping of indexes ('11', '12') to the corresponding letter choices. Initially this is
     *  all of the letters in the alphabet, but when a final choice is made it is reduced to a single entry
     *  Note that once the kwChoices map is created, this is no longer used
     */
    polybius: PolybiusMap
    // /** Mapping of each letter in the keyword to the possible positions it can be at. 
    //  * 'J' is 'I' so that there are only 25 entries.  If a letter has only one known spot
    //  * then there is a single entry, otherwise it maps to the same indexes in the polybium mapping
    //  * e.g.  'A': ['11', '12', '13],  'B': ['33']
    //  */
    // kwChoices: PolybiusMap
    /** Mapping of each letter to the possible positions it can be at.  Note that 'J' is always
     * 'I' so that there are only 25 entries
     */
    charMap: PolybiusMap
    /** Mapping of the indexes ('11', '12') to the possible Keyword choices.    */
    kwAnnotations: PolybiusMap
    /** Indication of which indexes in the corresponding keyword letter are known */
    kwKnown: Known[]
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
    public maxEncodeWidth = 18;
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
        blocksize: 0,
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
        if (!anyOperation && result === '' && testType !== undefined) {
            if ((testType == ITestType.cregional ||
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
     * Convert a number the corresponding English version
     * @param num number to convert
     * @returns string with the text version of the number
     */
    public numberToWords(num: number): string {
        const numbersInWords: { [key: number]: string } = {
            0: 'ZERO',
            1: 'ONE',
            2: 'TWO',
            3: 'THREE',
            4: 'FOUR',
            5: 'FIVE',
            6: 'SIX',
            7: 'SEVEN',
            8: 'EIGHT',
            9: 'NINE',
            10: 'TEN',
            11: 'ELEVEN',
            12: 'TWELVE',
            13: 'THIRTEEN',
            14: 'FOURTEEN',
            15: 'FIFTEEN',
            16: 'SIXTEEN',
            17: 'SEVENTEEN',
            18: 'EIGHTEEN',
            19: 'NINETEEN',
            20: 'TWENTY',
            30: 'THIRTY',
            40: 'FORTY',
            50: 'FIFTY',
            60: 'SIXTY',
            70: 'SEVENTY',
            80: 'EIGHTY',
            90: 'NINETY',
        };

        if (num <= 20 || (num < 100 && num % 10 === 0)) {
            return numbersInWords[num];
        } else if (num < 100) {
            const tens = Math.floor(num / 10) * 10;
            const ones = num % 10;
            return `${numbersInWords[tens]}-${numbersInWords[ones]}`;
        }

        // Expand as needed for larger numbers
        return '';
    }
    /**
     * Look for a number either as the numeric value or spelled out English word in a string
     * @param questionText Text to scan
     * @param keyLength Length value to look for
     * @returns boolean indicating containment or not
     */
    public containsExactNumberOrWord(questionText: string, keyLength: number): boolean {
        const keyLengthWord = this.numberToWords(keyLength);

        // Create regular expressions to match the numeric and word representations as exact words
        const numberRegex = new RegExp(`\\b${keyLength}\\b`);
        const wordRegex = new RegExp(`\\b${keyLengthWord}\\b`); // Case-insensitive for the word

        // Check if the question text contains the numeric value or the word representation
        return numberRegex.test(questionText) || wordRegex.test(questionText);
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

        let suggested = 55 + qdata.len;
        let operationText = '';
        let zeroBlockSizeText = '';
        let keywordLengthText = '';
        let blockSizeMatchesText = ' The block size matches the keyword length. ';
        let zNotLastText = '';
        let scoringText = '';

        if (this.state.operation === 'crypt') {
            operationText = ' This problem requires cryptanalysis so we add 200 points. ';
            suggested += 200;
            if (this.state.autoSolverScore === undefined) {
                operationText += ' But the Autosolver was not able to run on it yet. '
            } else if (this.state.autoSolverScore === AUTOSOLVER_NOKEYWORD) {
                operationText += ' But the Autosolver was not able to determine the keyword, so we add 300 points.'
                suggested += 300
            } else if (this.state.autoSolverScore === AUTOSOLVER_NOKEYPOS) {
                operationText += ' But the Autosolver was not able to determine the keyword positions, so we add 250 points.'
                suggested += 250
            } else if (this.state.autoSolverScore > 2.5 ||
                (this.state.blocksize !== 0 && this.state.autoSolverScore > 1.25)
            ) {
                const add = Math.round((this.state.autoSolverScore - 1.25) * 100)
                operationText += ` The Autosolver was not able to find enough words to make it solvable, so we add ${add} points.`
                suggested += add
            }
        }

        if (this.state.blocksize != this.cleanRowKeyword.length) {
            blockSizeMatchesText = ' The block size does not match the keyword length. ';
            suggested += 15;
        }

        if (this.state.blocksize === 0) {
            zeroBlockSizeText = ` The block size is 0 so we subtract 25 points. `
            suggested -= 25;
        }

        keywordLengthText = ` The key has length ${this.cleanRowKeyword.length}. `;
        // Add more  points for larger keywords...
        suggested += Math.round((10 * (this.cleanRowKeyword.length / 3)));

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
        if (qdata.len < 26) {
            scoringText = `<p><b>WARNING:</b> <em>There are only ${qdata.len} characters in this quote, we recommend around 50 characters for a good quote</em></p>`
        }
        if (qdata.len > 75) {
            scoringText = `<p><b>WARNING:</b> <em>There are ${qdata.len} characters in this quote, which is a significant amount more than the recommended 50 characters.</em></p>`
        }
        if (qdata.len > 2) {
            scoringText += `<p>There are ${qdata.len} characters in the quote.  
                ${operationText}${zeroBlockSizeText}${keywordLengthText}${blockSizeMatchesText}${zNotLastText}
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
            this.state.blocksize = blocksize;
            changed = true;
        }
        return changed;
    }

    /*
        Given two characters, this method uses the polybius mapping to 
        return the added mapped numbers together. It encodes into a ciphertext.
    */
    public encodePolybius(c1: string, c2: string): string {

        let num1 = Number(this.polybiusMap.get(c1));
        let num2 = Number(this.polybiusMap.get(c2));

        let result = (num1 + num2).toString();

        return result;
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
        maxEncodeWidthExtra: number = 5,
        polybiusMap?: Map<string, string>,
        unChunked: boolean = false,
    ): string[][][] {
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
    /**
     * This method builds the HTML for a polybius table
     * @param target Place to generate the table
     * @param center Center the table
     * @param fillString Which letters 
     * @param solverData Current solver data state
     */
    public showPolybiusTable(target: JQuery<HTMLElement>, center: boolean, fillString: string, solverData?: CheckerboardSolverData): void {
        const knownCheck = fillString.toUpperCase()
        let polyClass = 'polybius-square unstriped'
        let rowKeyword = this.cleanRowKeyword
        let colKeyword = this.cleanColKeyword
        if (solverData !== undefined) {
            rowKeyword = solverData.rowKeyword + "?????"
            colKeyword = solverData.colKeyword + "?????"
        }

        if (center) {
            polyClass += ' center'
        }

        const worktable = new JTTable({
            class: polyClass,
        });

        const top = worktable.addHeaderRow({ class: "highlighted-header" });
        top.add('')
        for (let i = 1; i <= 5; i++) {
            top.add(colKeyword[i - 1] ?? '?')
        }

        let mainIndex = 0;
        for (let rowPos = 0; rowPos < 5; rowPos++) {
            const keyrow = worktable.addBodyRow({ class: "k highlighted-header" });
            const row = worktable.addBodyRow({ class: "b" });
            keyrow.add({
                celltype: 'th',
                content: `${rowKeyword[rowPos] ?? '?'}`,
                settings: { rowspan: 2 },
            })

            //get an array of the keys of the polybius map
            let polybiusSequence = Array.from(this.polybiusMap.keys());
            for (let colPos = 0; colPos < 5; colPos++) {
                const spot = `${rowPos}${colPos}`
                // Figure out if this is a potential Keyword placement
                let mapC = " "
                if (knownCheck.includes(polybiusSequence[mainIndex].toUpperCase())) {
                    //we want to show I/J in the table, not just I
                    if (polybiusSequence[mainIndex] == 'I') {
                        mapC = 'I/J'
                    } else {
                        mapC = polybiusSequence[mainIndex]
                    }
                } else {
                    // Show them all the possibile letters that can fill the spot
                    // if (solverData !== undefined) {
                    //     let lastLet = ''
                    //     let startLet = ''
                    //     let extra = ''
                    //     mapC = ''
                    //     solverData.polybius.get(spot).forEach((v) => {
                    //         if (lastLet !== '') {
                    //             if (lastLet.charCodeAt(0) + 1 !== v.charCodeAt(0)) {
                    //                 if (startLet !== '') {
                    //                     mapC += extra + startLet + '-'
                    //                     extra = ''
                    //                     startLet = ''
                    //                 }
                    //                 mapC += extra + lastLet
                    //                 extra = '|'
                    //                 lastLet = v
                    //             } else {
                    //                 if (startLet === '') {
                    //                     startLet = lastLet
                    //                 }
                    //             }
                    //         }
                    //         lastLet = v
                    //     })
                    //     if (startLet !== '') {
                    //         mapC += extra + startLet + '-' + lastLet
                    //     }
                    // }
                }
                let annotations: string[] = []
                if (solverData !== undefined && solverData.kwAnnotations.get(spot) !== undefined) {
                    annotations = solverData.kwAnnotations.get(spot)
                }
                if (annotations.length > 0) {
                    keyrow.add({ class: "k", content: annotations.join(", ") })
                } else {
                    keyrow.add('')
                }
                row.add(mapC)
                mainIndex++;
            }
        }

        target.append(worktable.generate())
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
        let polySequence: string[] = makeFilledArray(25, undefined)
        solverData.polybius.forEach((val: string[], slot: string) => {
            if (val.length === 1) {
                let tens = parseInt(slot.substring(0, 1))
                let ones = parseInt(slot.substring(1))
                let pos = (tens - 1) * 5 + ones - 1
                polySequence[pos] = val[0]
            }
        })

        let index = 24
        let known = ""
        for (let c of this.charset) {
            if (c !== 'J' && solverData.charMap.get(c).length === 1) {
                known += c
            }
        }
        const polybiusCharset = this.charset.replace('J', '') + ">";

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
            const firstIndex = polybiusCharset.indexOf(firstLetter)
            const lastIndex = polybiusCharset.indexOf(lastLetter)

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
                return;
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

                const col = ((index + 1 + i) % 5) + 1;
                const row = Math.floor((index + 1 + i) / 5) + 1;
                const slot = `${row}${col}`

                if (subs.length === 1) {
                    // We need to remove this letter from every other place
                    this.setPolybiusKnown(solverData, slot, subs[0])
                    found++
                } else {
                    solverData.polybius.set(slot, subs);
                }
            }

            //at the end, we want to set the new initial letter to be this current last letter for next iteration
            lastLetter = firstLetter;

            index--;
        }
        this.updateCharMap(solverData)
        return found
    }
    /**
     * Propagate the polybius choices to the charMap values
     * @param solverData Current solver data state
     */
    public updateCharMap(solverData: CheckerboardSolverData): void {
        // Initialize them to empty
        for (const c of this.charset.replace('J', '')) {
            solverData.charMap.set(c, [])
        }
        solverData.polybius.forEach((val: string[], slot: string) => {
            for (let c of val) {
                const current = solverData.charMap.get(c)
                current.push(slot)
                solverData.charMap.set(c, current)
            }
        })

    }
    /**
     * Update the Polybius data for a known value
     * @param solverData Current solver data state
     * @param spot Position for known character
     * @param char Character
     */
    public setPolybiusChoices(solverData: CheckerboardSolverData, choices: string[], char: string) {
        solverData.polybius.forEach((val: string[], slot: string) => {
            if (choices.includes(slot)) {
                if (choices.length === 1) {
                    solverData.polybius.set(slot, [char])
                } else {
                    if (!val.includes(char)) {
                        solverData.polybius.set(slot, [...val, char])
                    }
                }
            }
            else {
                if (val.includes(char)) {
                    val = val.filter(v => v != char)
                    solverData.polybius.set(slot, val)
                }
            }
        })
        this.updateCharMap(solverData)
    }
    /**
     * Update the Polybius data for a known value
     * @param solverData Current solver data state
     * @param spot Position for known character
     * @param char Character
     */
    public setPolybiusKnown(solverData: CheckerboardSolverData, setSlot: string, char: string) {
        this.setPolybiusChoices(solverData, [setSlot], char)
        // solverData.charMap.set(char, [setSlot])
        // Check to see if we updated one of the keywords and adjust the annotation data for it
        if (solverData.keyword.includes(char)) {
            // Remember that the letter might be repeated, so we have to catch all instances
            for (let kpos = 0; kpos < solverData.keyword.length; kpos++) {
                // Check to see if we are updating any of the known keyword characters
                if (solverData.keyword.charAt(kpos) === char) {
                    this.setKWAnnotations(solverData, kpos, [setSlot])
                }
            }
        }
    }
    /**
     * Set the known data for a keyword
     * @param solverData Current solver data state
     * @param kwindex Which keyword we are setting data for
     * @param valid Array of known valid spots
     */
    public setKWAnnotations(solverData: CheckerboardSolverData, kwindex: number, valid: string[]): void {
        if (valid === undefined || valid.length === 0) {
            console.log(`setKWAnnotations: Bad valid setting for ${kwindex}`)
            return;
        }
        const key = `K${kwindex + 1}`
        let keySet = key
        if (valid.length > 1) {
            keySet += "?"
        }
        // Remove the keyword from the other spots in the map where it is not valid
        solverData.kwAnnotations.forEach((choices: string[], index: string) => {
            const newvalue = choices.filter(x => (x !== key && x !== (key + "?")))
            if (newvalue.length !== choices.length) {
                solverData.kwAnnotations.set(index, newvalue)
            }
        })
        let tens = valid[0].substring(0, 1)
        let ones = valid[0].substring(1, 2)
        for (let spot of valid) {
            this.addToPolybiusMap(solverData.kwAnnotations, spot, keySet)
            if (spot.substring(0, 1) !== tens) {
                tens = "?"
            }
            if (spot.substring(1, 2) !== ones) {
                ones = "?"
            }
        }
        let known: Known = 'all'
        if (tens === '?') {
            known = 'ones'
            if (ones === '?') {
                known = 'none'
            }
        } else if (ones === '?') {
            known = 'tens'
        }
        solverData.kwKnown[kwindex] = known
    }
    /**
     * Find how many keywords map to the current set of possibilities
     * @param possibilities 
     * @param lang 
     * @returns Number of keywords which were found
     */
    public countKeywordMatches(possibilities: string[][], lang: string): number {
        // Let's look
        let found = 0;
        let foundKeyword = false
        const len = possibilities.length
        const pat = this.makeUniquePattern("ABCDEFGHIJKLMNOP".substring(0, len), 1)
        const patSet = this.Frequent[lang][pat]
        // for (const entry of patSet) {
        for (let e = 0; e < patSet.length * 0.7; e++) {
            const word = patSet[e][0]
            let valid = true
            for (let i = 0; valid && i < len; i++) {
                let c = word.charAt(i)
                if (!possibilities[i].includes(c) && !possibilities[i].includes("?")) {
                    valid = false
                }
            }

            if (valid) {
                // console.log(`Matches ${word}`)
                if (word.toUpperCase() === this.cleanRowKeyword) {
                    foundKeyword = true
                }
                found++
            }
        }
        if (found > 0 && !foundKeyword) {
            found++
        }
        // See if we need to check for non-unique letter words
        if (found === 0) {
            let entries = Object.keys(this.Frequent[lang]).filter((key) => key.length === len)
            for (const pat of entries) {
                const patSet = this.Frequent[lang][pat]
                // for (const entry of patSet) {
                for (let e = 0; e < patSet.length * 0.7; e++) {
                    const word = patSet[e][0]
                    let valid = true
                    for (let i = 0; valid && i < len; i++) {
                        let c = word.charAt(i)
                        if (!possibilities[i].includes(c) && !possibilities[i].includes("?")) {
                            valid = false
                        }
                    }

                    if (valid) {
                        if (word.toUpperCase() === this.cleanRowKeyword) {
                            foundKeyword = true
                        }
                        found++
                        if (found > 10) {
                            break;
                        }
                    }
                }
            }
        }
        return found
    }
    /**
     * 
     * @param tensMapping 
     * @param onesMapping 
     * @param numToLettersMap 
     * @returns 
     */
    public showPotentialKeywords(target: JQuery<HTMLElement>, possibilities: string[][]): void {
        const table = new JTTable({ class: 'potential-keyword center unstriped' })
        const headerRow = table.addHeaderRow({ class: 'solve' });

        for (let i = 0; i < this.cleanRowKeyword.length; i++) {
            headerRow.add(`K${i + 1}`)
        }

        // Figure out how many rows we will have
        let maxRows = 0
        for (let i = 0; i < possibilities.length; i++) {
            maxRows = Math.max(maxRows, possibilities[i].length)
        }

        for (let i = 0; i < maxRows; i++) {
            let bodyRow: JTRow = table.addBodyRow()
            for (let j = 0; j < possibilities.length; j++) {
                if (possibilities[j].length > i) {
                    bodyRow.add(possibilities[j][i])
                } else {
                    bodyRow.add({
                        content: '&nbsp;',
                    });
                }
            }
        }
        target.append(table.generate());
    }
    /**
     * 
     * @param solverData Current state of the solution
     * @returns 
     */
    public getKeywordPossibilities(solverData: CheckerboardSolverData): string[][] {
        let possibilities: string[][] = [];

        for (let i = 0; i < solverData.tens.length; i++) {
            possibilities[i] = [];
            for (let j = 0; j < solverData.tens[i].length; j++) {
                for (let k = 0; k < solverData.ones[i].length; k++) {

                    let tens = solverData.tens[i][j];
                    let ones = solverData.ones[i][k];

                    let mapValue = solverData.polybius.get(`${tens}${ones}`);
                    if (mapValue === undefined) {
                        mapValue = ["?"]
                    }

                    for (const p of mapValue) {
                        if (!possibilities[i].includes(p)) {
                            possibilities[i].push(p);
                        }
                    }
                }
            }
        }
        return possibilities;
    }
    /**
     * Generate a quick list of all the known characters
     * @param solverData Current solver data state (Updated)
     */
    public getKnownPolybius(solverData: CheckerboardSolverData): string {
        let knownChars = ""

        solverData.polybius.forEach((subs: string[]) => {
            if (subs.length === 1) {
                knownChars += subs[0]
            }
        })
        return knownChars
    }

    /*
        This method builds the Checkerboard sequenceset tables as well as the polybius square.
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
        this.showPolybiusTable(polybiusDiv, false, "abcdefghijklmnopqrstuvwxyz")

        result.append($('<div/>', { class: 'grid-x grid-padding-x align-justify' })
            .append($('<div/>', { class: 'cell shrink' }).append(table))
            .append(polybiusDiv))

        return result;
    }

    /*
        This method builds the HTML for Checkerboard sequenceset tables in the solver. 
    */
    public buildSolverCheckerboard(msg: string, unknownkeylength: string, state: string): JQuery<HTMLElement> {

        //indices guide:
        // 0 = ciphertext numbers
        // 1 = plaintext
        // 2 = mapped key numbers
        // 3 = mapped plaintext numbers
        // 4 = non-mapped key letters

        // string = unknown key (used for cryptanalysis solver)
        //ex. "3" would mean iterate a K1 K2 K3 keyword

        const result = $('<div/>');

        let order = [];
        if (state === 'keystring') {
            order = [[0, "solve"], [1, "ans"]];
        } else if (state === 'keynumbers') {
            order = [[0, "solve"], [1, "ans"]];
        } else if (state === 'plaintextnumbers') {
            order = [[0, "solve"], [1, "ans bar"]]
        } else if (state === 'plaintext') {
            order = [[0, "solve"], [1, "ans bar"]]
        } else if (state === 'unknownkey') {
            order = [[unknownkeylength, "ans"], [0, "solve"]];
        } else if (state === 'k1example') {
            order = [[unknownkeylength, "solve"], [0, "solve"]];
        }

        const sequencesets = this.sequencesets

        const table = $('<table/>', { class: 'Checkerboard center' });

        let validIndex = 1;
        for (const sequenceset of sequencesets) {
            for (let i = 0; i < order.length; i++) {
                // console.log(validIndex)
                let pair = order[i]
                let localValidIndex = validIndex

                //do some checking for if the first element of pair is string
                let mod = 1;

                if (state === "unknownkey" || state === "k1example") {
                    mod = parseInt(order[0][0]);
                }

                let sequence
                if (typeof pair[0] === 'string') {
                    sequence = sequenceset[1];
                } else {
                    sequence = sequenceset[pair[0]]
                }


                const row = $('<tr/>', { class: pair[1] });
                for (const char of sequence) {

                    if (this.getCharset().indexOf(char) === -1 && char.length === 1) {
                        row.append($('<td width="33px"/>').text(char));
                    } else {

                        if (typeof pair[0] === 'string') {
                            if (state === 'k1example' && localValidIndex === 1) {
                                row.append($('<td class="hl" width="33px"/>').text('K1'));
                            } else {
                                row.append($('<td width="33px"/>').text('K' + localValidIndex));
                            }
                        } else {
                            if (state === 'k1example' && localValidIndex === 1) {
                                let tens = char.substring(0, char.length - 1)
                                let ones = char.substring(char.length - 1)
                                row.append($('<td width="33px"/>').html(tens + '<span class="ones">' + ones + '</span>'));
                            } else {
                                row.append($('<td width="33px"/>').text(char));
                            }
                        }

                        localValidIndex = (localValidIndex % mod) + 1
                        // console.log(localValidIndex)

                    }

                    // //here, if mod is not 0, then we had a string as our first pair element. in this case, do the K1, K2, K3... iterate up to the mod number
                    // if (typeof pair[0] === "string") {

                    //     if (this.getCharset().indexOf(char) === -1) {
                    //         row.append($('<td width="33px"/>').text(char));
                    //     } else {
                    //         if (state === 'k1example' && index === 1) {
                    //             row.append($('<td class="hl" width="33px"/>').text('K' + index));

                    //         } else {
                    //             row.append($('<td width="33px"/>').text('K' + index));
                    //         }

                    //         index = (index) % mod + 1;
                    //     }


                    // } else {
                    //     //otherwise, just append the normal sequence characters

                    //     if (this.polybiusMap.has(char)) {
                    //         row.append($('<td width="33px"/>').text(char));
                    //     } else {
                    //         if (state === 'k1example' && index === 1) {
                    //             let tens = char.substring(0, char.length - 1)
                    //             let ones = char.substring(char.length - 1)
                    //             row.append($('<td width="33px"/>').html(tens + '<span class="ones">' + ones + '</span>'));
                    //         } else {
                    //             row.append($('<td width="33px"/>').text(char));
                    //         }
                    //         index = (index) % mod + 1
                    //     }


                    // }

                }
                if (i === order.length - 1) {
                    // console.log(validIndex)
                    // console.log(localValidIndex)
                    validIndex = localValidIndex
                }
                table.append(row);
            }
            //add a blank row between each line of rows 
            const blank = $('<tr/>').append($('<td/>').append($('<br>')));
            table.append(blank)
        }

        result.append($('<div/>', { class: 'grid-x grid-padding-x align-justify' })

            .append($('<div/>', { class: 'cell shrink' })

                .append(table)))

        return result
    }
    /**
     * Display the current state of the solution with the mapped characters found out so far
     * @param target DOM element to put the output into
     * @param solverData Current solver data state (Updated)
     * @param showKeyword Show the keyword letters (default = true) or just K1, K2,... for the key position
     * @returns General score of the problem
     */
    public showCurrentSolution(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData, showKeyword: boolean = true): number {

        const keywordLength = solverData.keyword.length
        const bigTable = new JTTable({ class: 'Checkerboard center' })
        const sequencesets = this.sequencesets

        //k is serving as a running count of valid characters. this is used for lining up the keyword. for example D O N ' T would map to K1 K2 K3 _ K4
        let k = 0;

        let score = 0;

        let cribStart = 0
        let cribEnd = 0
        const cribpos = this.placeCrib();
        if (cribpos !== undefined) {
            cribStart = cribpos.position
            cribEnd = cribStart + cribpos.criblen
        }

        for (const sequenceset of sequencesets) {
            const ctRow = bigTable.addBodyRow({ class: 'solve' });
            const keywordValRow = bigTable.addBodyRow({ class: 'solve' });
            const keywordCharRow = bigTable.addBodyRow({ class: 'solve' })
            const ptValRow = bigTable.addBodyRow({ class: 'ans bar' });
            const ptCharRow = bigTable.addBodyRow({ class: 'ans' });

            let ciphertextNumbers = sequenceset[0];
            let mappedKeyNumbers = sequenceset[2];
            let mappedPlaintextNumbers = sequenceset[3];
            let plaintext = sequenceset[1];

            for (const i in ciphertextNumbers) {
                let ct = ciphertextNumbers[i]
                //for first row, just append the unaltered ciphertext number
                ctRow.add(ct);
                if (isNaN(parseInt(ct)) || ct.length === 1) {
                    // This isn't a cipher text cahracter, so just output it as is
                    keywordValRow.add(ct);
                    keywordCharRow.add(' ')
                    ptValRow.add(ct);
                    ptCharRow.add(' ');
                } else {
                    const kpos = k % keywordLength
                    // We have a cipher text character.
                    if (k >= cribStart && k < cribEnd) {
                    }
                    // Should we show the letters of the keyword (because it is known) or
                    // just K1, K2, ... indicating the position in the keyword
                    if (showKeyword) {
                        keywordCharRow.add(solverData.keyword.charAt(kpos))
                    } else {
                        keywordCharRow.add(`K${(kpos) + 1}`)
                    }

                    //For the PT value and the Keyword value, show as much of the number as has been
                    // figured out already
                    let keywordVal = '';
                    let ptVal = '';
                    const known = solverData.kwKnown[kpos]

                    // Mask the tens digit if it isn't known
                    if (known === 'all' || known === 'tens') {
                        keywordVal += Math.floor(parseInt(mappedKeyNumbers[i]) / 10)
                        ptVal += Math.floor(parseInt(mappedPlaintextNumbers[i]) / 10)
                    } else {
                        keywordVal += '?'
                        ptVal += '?'
                    }

                    // The same with the ones digit
                    if (known === 'all' || known === 'ones') {
                        keywordVal += parseInt(mappedKeyNumbers[i]) % 10
                        ptVal += parseInt(mappedPlaintextNumbers[i]) % 10
                    } else {
                        keywordVal += '?'
                        ptVal += '?'
                    }

                    keywordValRow.add(keywordVal);
                    ptValRow.add(ptVal);

                    // Is this a crib character that is known?
                    if (k >= cribStart && k < cribEnd) {
                        ptCharRow.add(plaintext[i]);
                    } else {
                        // Not a given crib character, but have we already figured out
                        // what the mapping is for this Plain Text value?
                        const choices = solverData.polybius.get(ptVal)
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
                                ptCharRow.add(out)
                            } else {
                                ptCharRow.add(' ');
                            }
                        } else {
                            ptCharRow.add(' ');
                            score += 25
                        }
                    }
                    k++;
                }
            }

            const blankrow = bigTable.addBodyRow()
            blankrow.add({
                content: '&nbsp;',
            })
        }

        target.append($('<div/>', { class: 'grid-x grid-padding-x align-justify' })
            .append($('<div/>', { class: 'cell shrink' })
                .append(bigTable.generate())))
        return score / k
    }
    /**
     * Count the number of digits (tens or ones) in the sequence set
     * @param keywordLength The number of letters in the keyword
     * @param onesDigit look at the ones digit (true) vs the tens digit
     * @returns Mapping of the digit usage
     */
    public buildCountArray(keywordLength: number, onesDigit: boolean): CheckerboardSolverMappings {

        let keywordArray = [];

        const sequencesets = this.sequencesets;

        for (let i = 0; i < keywordLength; i++) {

            let row = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            let spacing = -i;

            for (const sequenceset of sequencesets) {
                const sequence = sequenceset[0];
                for (let j = 0; j < sequence.length; j++) {

                    if (!isNaN(parseInt(sequence[j])) && sequence[j].length > 1) {
                        if (spacing === 0) {

                            let targetDigit;

                            if (onesDigit) {
                                targetDigit = parseInt(sequence[j]) % 10
                            } else {
                                targetDigit = Math.floor(parseInt(sequence[j]) / 10) % 10
                            }

                            row[targetDigit] = 1;
                        }

                        spacing++;
                        if (spacing == keywordLength) {
                            spacing = 0;
                        }
                    }
                }
            }

            keywordArray.push(row);

        }
        return keywordArray;
    }

    /**
     * Show the digit counts in the table
     * @param target DOM element to output table
     * @param countArray The count array to use
     * @param isK1Example 
     */
    public showCountTable(target: JQuery<HTMLElement>, countArray: CheckerboardSolverMappings, tableType: TableType): void {

        const table = new JTTable({
            class: 'polybius-square center',
        });

        const header = table.addHeaderRow()

        header.add('')
        const limit = tableType === 'example' ? 1 : countArray.length

        for (let i = 1; i <= 10; i++) {
            let index = i % 10
            if (tableType === 'example' && countArray[0][index] === 1) {
                header.add({
                    content: '<span class="ones">' + index + '</span>'
                })
            } else {
                header.add(index + '')
            }
        }

        for (let j = 0; j < limit; j++) {

            let letterRow = countArray[j];
            let smallest = letterRow.length;
            let largest = 1;

            for (let i = 1; i <= letterRow.length + 1; i++) {
                let index = i % letterRow.length

                if (letterRow[index] === 1) {
                    if (i < smallest) {
                        smallest = i;
                    }
                    if (i > largest) {
                        largest = i;
                    }
                }
            }

            let row
            const range = largest - smallest
            let rangelimit = 5
            if (tableType === 'example') {
                rangelimit = 999
            } else if (tableType === 'tens') {
                rangelimit = 6
            }
            if (range >= rangelimit) {
                row = table.addBodyRow({ class: 'wrong' })
            } else {
                row = table.addBodyRow()
            }


            row.add({
                celltype: 'th',
                content: 'K' + (j + 1)
            })

            for (let i = 1; i < letterRow.length; i++) {

                if (letterRow[i] === 1) {
                    row.add('X');
                } else {
                    row.add('');
                }
            }

            if (letterRow[0] === 1) {
                row.add('X');
            } else {
                row.add('');
            }
        }
        target.append(table.generate());
    }
    /**
     * Find all the unknown keywords that we can fill in
     * @param target DOM element to put the output into
     * @param solverData Current solver data state (Updated)
     */
    public fillMatchedKeywordChars(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData): void {
        const keywordLength = solverData.keyword.length
        const sequencesets = this.sequencesets

        //K is just serving as a running count of valid characters. this is used for lining up the keyword. for example D O N ' T would map to K1 K2 K3 _ K4
        let k = 0;

        let cribStart = 0
        let cribEnd = 0
        const cribpos = this.placeCrib();
        if (cribpos !== undefined) {
            cribStart = cribpos.position
            cribEnd = cribStart + cribpos.criblen
        }

        for (const sequenceset of sequencesets) {
            let ciphertextNumbers = sequenceset[0];
            let plaintext = sequenceset[1];

            for (const i in ciphertextNumbers) {
                let ct = ciphertextNumbers[i]
                // If this isn't a cipher text character, just skip it
                if (isNaN(parseInt(ct)) || ct.length === 1) {
                    continue;
                }
                let kpos = k % keywordLength
                let keyc = solverData.keyword.charAt(kpos)
                // let options = reverseMap.get(keyc)
                let options = solverData.charMap.get(keyc)
                if (options === undefined || options.length > 1) {
                    let plaintextc = ''

                    if (k >= cribStart && k < cribEnd) {
                        plaintextc = plaintext[i]
                    } else {
                        // TODO: See if we had any guessed characters stored in the solverdata
                    }
                    // let plainoptions: string[] = reverseMap.get(plaintextc)
                    let plainoptions: string[] = solverData.charMap.get(plaintextc)
                    if (plainoptions === undefined) {
                        plainoptions = []
                    }
                    let keyval = parseInt(ciphertextNumbers[i])

                    if (plaintextc === keyc) {
                        keyval /= 2
                        solverData.kwKnown[kpos] = 'all'
                        // Special case where we have a crib character in the same spot as the known plaintext
                        this.showStepText(target, `Since we know that the plain text character '${keyc}' at position ${k} happens to be the same as the K${kpos + 1} character '${keyc}',
                     the value for '${keyc}' is ${keyval} [½ the Ciphtertext value ${ciphertextNumbers[i]}].`)

                    } else if (plainoptions.length === 1) {
                        solverData.kwKnown[kpos] = 'all'
                        // We know the value for a plaintext character (probably from the crib) so we can compute the value of the keyword character
                        keyval -= parseInt(plainoptions[0])
                        this.showStepText(target, `Since we know that the plain text character '${keyc}' at position ${k} is ${plainoptions[0]} and the corresponding ciphertext value
                    at that position is ${ciphertextNumbers[i]} we can compute the value of the K${kpos + 1} character as ${keyval} which is the difference between the two values.`)
                    } else if (options !== undefined && plainoptions.length > 1) {
                        // Iterate through all of the options to see if they add up to the key value
                        let matched = 0
                        let v1Choice: number = undefined
                        let v2Choice: number = undefined
                        for (const v1 of options) {
                            for (const v2 of plainoptions) {
                                const v1val = parseInt(v1)
                                const v2val = parseInt(v2)
                                if (v1val + v2val === keyval) {
                                    matched++
                                    v1Choice = v1val
                                    v2Choice = v2val
                                }
                            }
                        }
                        if (matched === 1) {
                            solverData.kwKnown[kpos] = 'all'
                            keyval = v2Choice
                            this.showStepText(target, `Since K${kpos + 1} '${keyc}' could be any of '${options.join(", ")}' and '${keyc}' at position ${k} can be any of '${plainoptions.join(", ")}',  
                            but they also have to add up to be ${ciphertextNumbers[i]}, only the choice of ${v1Choice}+${v2Choice} works which means that Since K${kpos + 1} '${keyc}' must be ${keyval}`)
                        } else {
                            keyval = undefined
                        }
                    } else {
                        keyval = undefined
                    }
                    if (keyval !== undefined) {
                        const keySpot = `${keyval}`
                        solverData.tens[kpos] = [Math.trunc(keyval / 10)]
                        solverData.ones[kpos] = [keyval % 10]

                        this.setPolybiusKnown(solverData, keySpot, keyc)
                    }
                }
                k++;
            }
        }
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
    /**
     * Find everywhere a keyword index might map to
     * @param solverData Current solver data state
     * @param kPos Keyword entry to get
     * @returns Array of all possible slots for the keyword index
     */
    public getKwChoices(solverData: CheckerboardSolverData, kPos: number): string[] {
        const kwChoices: string[] = []
        const kText = `K${kPos + 1}`

        solverData.kwAnnotations.forEach((choices: string[], index: string) => {
            if (choices.includes(kText) || choices.includes(kText + "?")) {
                kwChoices.push(index)
            }
        })
        return kwChoices
    }
    /**
     * Fill in the known keyword values
     * @param target DOM element to put the output into
     * @param solverData Current solver data state (Updated)
     */
    public fillKeyWord(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData): boolean {
        let changed = false
        for (let kpos = 0; kpos < solverData.keyword.length; kpos++) {
            const c = solverData.keyword.charAt(kpos)
            const charChoices = solverData.charMap.get(c)
            if (charChoices === undefined || charChoices.length === 0) {
                console.log(`*** Something is wrong, no choices found for ${c}`)
                continue;
            }
            // Figure out which of the charChoices aren't set
            const charUnknown = charChoices.filter(x => solverData.polybius.get(x).length > 1)
            const kText = `K${kpos + 1}`
            const kwChoices: string[] = this.getKwChoices(solverData, kpos)
            if (kwChoices.length === 1) {
                // We knew where the keyword went, if we didn't know where the letter was, we can update it now
                if (charChoices.length > 1) {
                    this.showStepText(target, `Since we already knew that ${kText} was at ${kwChoices[0]}, we can now set ${kwChoices[0]} to be ${c}.`)
                    this.setPolybiusKnown(solverData, kwChoices[0], c)
                    changed = true
                }
            } else {
                // We had several choices for the keyword, filter it down by what matches the letter
                const choices = kwChoices.filter(x => charChoices.includes(x))
                if (choices.length === 0) {
                    console.log(`*** Something went wrong, intersection for ${kText} '${c}' [${kwChoices.join(',')}] vs [${charChoices.join(',')}] `)
                } else if (choices.length !== kwChoices.length) {
                    if (choices.length === 1) {
                        this.showStepText(target, `Since ${kText} must be one of '${kwChoices.join(',')}' and '${c}' must be one of '${charChoices.join(',')}', the intersection
                        of the two sets leaves us with just '${choices[0]}.`)
                    } else {
                        this.showStepText(target, `Since ${kText} must be one of '${kwChoices.join(',')}' and '${c}' must be one of '${charChoices.join(',')}', the intersection
                    of the two sets leaves us with '${choices.join(',')}.`)
                    }
                    this.setPolybiusChoices(solverData, choices, c)
                    this.setKWAnnotations(solverData, kpos, choices)
                }
            }
            // See if any of the unknown have become known
            solverData.charMap.forEach((charChoices: string[], slotChar: string) => {
                if (slotChar !== c && charChoices.length === 1 && charUnknown.includes(charChoices[0])) {
                    this.showStepText(target, `Because of that, it also eliminated everything except '${charChoices[0]}' for ${slotChar}.`)
                    this.setPolybiusKnown(solverData, charChoices[0], slotChar)
                }
            })
        }
        return changed
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
    /**
     * See if any of the crib letters give us hints about the characters
     * @param target DOM element to put the output into
     * @param solverData Current solver data state (Updated)
     */
    public checkForCribHints(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData): boolean {
        let changed = false
        const keywordLength = solverData.keyword.length
        const sequencesets = this.sequencesets

        //k is serving as a running count of valid characters. this is used for lining up the keyword. for example D O N ' T would map to K1 K2 K3 _ K4
        let k = 0;

        let cribStart = 0
        let cribEnd = 0
        let discovered = true
        const cribpos = this.placeCrib();
        if (cribpos !== undefined) {
            cribStart = cribpos.position
            cribEnd = cribStart + cribpos.criblen
        }
        while (discovered) {
            discovered = false
            for (const sequenceset of sequencesets) {
                let ciphertextNumbers = sequenceset[0];
                let mappedKeyNumbers = sequenceset[2];
                let mappedPlaintextNumbers = sequenceset[3];
                let plaintext = sequenceset[1];

                for (const i in ciphertextNumbers) {
                    let ct = ciphertextNumbers[i]
                    //for first row, just append the unaltered ciphertext number
                    if (isNaN(parseInt(ct)) || ct.length === 1) {
                        continue;
                    }
                    const kpos = k % keywordLength
                    const ktext = `K${kpos + 1}`
                    const known = solverData.kwKnown[kpos]

                    // We have a cipher text character.
                    if (k >= cribStart && k < cribEnd) {
                        const ptC = plaintext[i]
                        const x = solverData.charMap.get(ptC)
                        if (x !== undefined) {
                            if (known === 'all') {
                                // See if we don't already know the mapping for the letter
                                if (x.length !== 1) {
                                    this.showStepText(target,
                                        ` Since we know the value of ${ktext} at position ${k} to already be ${mappedKeyNumbers[i]}
                                     we can subtract that from ${ct} to reveal that ${ptC} must be ${mappedPlaintextNumbers[i]}.`)
                                    this.setPolybiusKnown(solverData, mappedPlaintextNumbers[i], ptC)
                                    discovered = true
                                    changed = true
                                }
                            } else if (x.length === 1) {
                                this.showStepText(target, `The Crib letter '${ptC} at position ${k} is already known to be ${x[0]}
                            which we can subtract from ${ct} to reveal that ${ktext} must be ${mappedKeyNumbers[i]}`)
                                solverData.kwKnown[kpos] = 'all'
                                this.setKWAnnotations(solverData, kpos, [mappedKeyNumbers[i]])
                                discovered = true
                                changed = true
                            } else {
                                // See if we can eliminate any of the letters
                                const tens = mappedPlaintextNumbers[i].substring(0, 1)
                                const ones = mappedPlaintextNumbers[i].substring(1)
                                if (known === 'ones' || known == 'tens') {
                                    let result: string[] = []
                                    let pos = 0
                                    let matchC = tens
                                    if (known === 'ones') {
                                        pos = 1
                                        matchC = ones
                                    }
                                    result = x.filter(x => x.charAt(pos) === matchC)
                                    // If we have eliminated any options, we need to tell them
                                    if (result.length !== x.length) {
                                        changed = true
                                        let prefix = `Because we know that the ${known} digit of ${ktext} at position ${k} is ${matchC} by subtraction from ${ciphertextNumbers[i]},
                                    we can eliminate all the values for ${ptC} that don't have ${matchC} in the ${known} position.`
                                        if (result.length === 1) {
                                            // We eliminated all but one possibility, this is great!
                                            this.showStepText(target, `${prefix} This leaves only ${result[0]} for the Crib letter '${ptC} at position ${k}.
                                        By subtraction, this also tells us that ${ktext} must be ${mappedKeyNumbers[i]}`)
                                            this.setPolybiusKnown(solverData, result[0], ptC)
                                            this.setKWAnnotations(solverData, kpos, [mappedKeyNumbers[i]])
                                            discovered = true
                                        } else {
                                            let kwChoices: string[] = []
                                            for (const choice of result) {
                                                const val = parseInt(ct) - parseInt(choice)
                                                if (val >= 11 && val <= 55) {
                                                    kwChoices.push(String(val))
                                                }
                                            }
                                            this.showStepText(target, `${prefix} This leaves only '${result.join(', ')}' as potential values for ${ptC}
                                            and '${kwChoices.join(', ')}' as potential values for ${ktext}`)
                                            this.setPolybiusChoices(solverData, result, ptC)
                                            this.setKWAnnotations(solverData, kpos, kwChoices)
                                            // Eliminate
                                        }
                                    }
                                }
                            }
                        }
                    }

                    //For the PT value and the Keyword value, show as much of the number as has been
                    // figured out already
                    let keywordVal = '';
                    let ptVal = '';

                    // Mask the tens digit if it isn't known
                    if (known === 'all' || known === 'tens') {
                        keywordVal += Math.floor(parseInt(mappedKeyNumbers[i]) / 10)
                        ptVal += Math.floor(parseInt(mappedPlaintextNumbers[i]) / 10)
                    } else {
                        keywordVal += '?'
                        ptVal += '?'
                    }

                    // The same with the ones digit
                    if (known === 'all' || known === 'ones') {
                        keywordVal += parseInt(mappedKeyNumbers[i]) % 10
                        ptVal += parseInt(mappedPlaintextNumbers[i]) % 10
                    } else {
                        keywordVal += '?'
                        ptVal += '?'
                    }
                    k++;

                }
            }
        }
        return changed
    }
    /**
     * Show a table of all the possible mappings for a keyword.  Calculate the known status of the keyword letters
     * @param target DOM element to put the output into
     * @param solverData Current solver data state
     */
    public showPossibleKeywordMappings(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData, showKeyvalue: boolean = false): void {

        const table = new JTTable({ class: 'potential-keyword center unstriped' });
        const headerRow = table.addHeaderRow({ class: 'solve' })

        headerRow.add({
            content: '&nbsp;',
        })
        if (showKeyvalue) {
            headerRow.add('Value')
        }
        headerRow.add("Tens");
        headerRow.add("Ones");

        for (let k = 0; k < solverData.keyword.length; k++) {

            const row = table.addBodyRow({ class: 'solve' })

            row.add({ celltype: "th", content: `K${k + 1}` });
            if (showKeyvalue) {
                row.add(solverData.keyword.charAt(k))
            }

            let tensString = ""
            let onesString = ""
            let tenExtra = ""
            let oneExtra = ""
            let annotation = `K${k + 1}`
            solverData.kwKnown[k] = 'all'
            if (solverData.tens[k].length > 1) {
                annotation += '?'
                if (solverData.ones[k].length > 1) {
                    solverData.kwKnown[k] = 'none'
                } else {
                    solverData.kwKnown[k] = 'ones'
                }
            } else if (solverData.ones[k].length > 1) {
                annotation += '?'
                solverData.kwKnown[k] = 'tens'
            }

            for (let ten of solverData.tens[k]) {
                tensString += tenExtra + ten
                tenExtra = ", "

                // While we are here, we need to update the kwAnnotations
                for (let one of solverData.ones[k]) {
                    const spot = `${ten}${one}`
                    let current = solverData.kwAnnotations.get(spot)
                    if (current === undefined) {
                        current = []
                    }
                    current.push(annotation)
                    solverData.kwAnnotations.set(spot, current)
                }
            }

            for (let one of solverData.ones[k]) {
                onesString += oneExtra + one
                oneExtra = ", "
            }
            row.add(tensString)
            row.add(onesString)
        }
        target.append(table.generate());
    }

    /**
     * 
     * @param countArray 
     * @returns 
     */
    public findKeywordMappings(countArray: CheckerboardSolverMappings): CheckerboardSolverMappings {

        let array = [];

        for (let i = 0; i < countArray.length; i++) {

            let lowest = 11;
            let highest = -1;

            for (let j of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {

                if (countArray[i][j % 10] === 1) {
                    if (j < lowest) {
                        lowest = j;
                    }

                    if (j > highest) {
                        highest = j;
                    }
                }
            }
            // When we have 45+45, we end up getting 6 slots instead of 5
            if ((highest - lowest) === 5) {
                highest--;
            }

            let possibilities = [];
            for (let j = highest - 5; j < lowest; j++) {
                //we don't allow possibilities that are not feasible
                if (j > 0 && j <= 5) {
                    possibilities.push(j);
                }
            }
            array.push(possibilities);
        }

        return array;
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
                if (this.charset.indexOf(unit) < 0 && !(/^-?\d+$/.test(unit))) {
                    topRow.append($('<td/>').text(unit));
                } else {
                    topRow.append($('<td class="q v"/>').text(unit));
                }
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
            div.append(`There are at least ${headerPossible.length} possible matches for the Row Key:`)
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
     * Generate the description on how to solve a decode problem which is only given the polybius key
     * @param target DOM element to put output into
     */
    public async genDecodeSolution(testType: ITestType, target: JQuery<HTMLElement>) {
        let cleanPolybiusKey = this.cleanPolyKey

        this.polybiusMap = this.buildPolybiusMap();

        const result = $('<div/>', { id: 'solution' });
        target.append(result);

        this.showStep(result, "Step 1: Figure out the letters for the Row and Column keys")

        // Get the official answer so that we have the cipher text to decode
        const sequencesets = this.buildCheckerboardSequenceSets(this.minimizeString(this.state.cipherString), 9999);

        const [rowLetters, colLetters] = this.gatherLetters(sequencesets);
        let rownote = ''
        let colnote = ''
        if (rowLetters.length < 5) {
            rownote = ' (which means at least one letter is duplicated)'
        }
        if (colLetters.length < 5) {
            colnote = ' (which means at least one letter is duplicated)'
        }
        result.append('Walk through the cipher text and gather the unique first letters in one group and the seconds letters in another group.')
            .append('In this case we found ')
            .append(this.encodeFixed(String(rowLetters.length)))
            .append(' unique Row letters: ')
            .append(this.encodeFixed(rowLetters))
            .append(rownote)
            .append(' and ')
            .append(this.encodeFixed(String(colLetters.length)))
            .append(' unique Column letters: ')
            .append(this.encodeFixed(colLetters))
            .append(colnote)
            .append('. To figure out the actual headers, we need to anagram the letters and find the possible 5 letter words which they can be.')

        let rowPossible = this.showHeaderOptions(rowLetters, "Row", result);
        let colPossible = this.showHeaderOptions(colLetters, "Column", result);

        if (rowPossible.length === 0 || colPossible.length === 0) {
            let choice = ''
            let s = ''
            if (rowPossible.length === 0) {
                choice = "Row"
            }
            if (colPossible.length === 0) {
                if (choice !== "") {
                    choice = "Row/Column"
                    s = 's'
                } else {
                    choice = "Column"
                }

            }
            this.setErrorMsg(`Auto-Solver is unable to determine the ${choice} keyword${s} given the Cipher letters.  Consider different keywords.`, 'si',);
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
            rowKeyword: "", colKeyword: "",
            tens: [], ones: [], keyword: this.cleanRowKeyword.replace('J', 'I'),
            polybius: new Map<string, string[]>(),
            charMap: new Map<string, string[]>(),
            kwAnnotations: new Map<string, string[]>(),
            kwKnown: makeFilledArray(this.cleanRowKeyword.length, 'none'),
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
        this.showPolybiusTable(result, true, cleanPolybiusKey, solverData)

        if (await this.restartCheck()) { return }

        this.showStepText(result,
            "The remaining spaces are filled in alphabetical order, again skipping any letters that have already been used in the table.")
        // result.append("The remaining spaces are filled in alphabetical order, again skipping any letters that have already been used in the table.")

        // Show them the completely filled in table
        this.showPolybiusTable(result, true, "abcdefghijklmnopqrstuvwxyz", solverData)

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

        //determine keyword length
        const kwLength = this.cleanRowKeyword.length

        const result = $('<div/>', { id: 'solution' });
        target.append(result);

        await this.genCryptanalysisStep1(result, kwLength)
        if (await this.restartCheck()) { return }

        this.attachHandlers();

        let solverData = await this.genCryptanalysisStep2(result, kwLength)
        if (await this.restartCheck()) { return }

        await this.genCryptanalysisStep3(result, solverData)
        if (await this.restartCheck()) { return }

        await this.genCryptanalysisStep4(result, solverData)
        if (await this.restartCheck()) { return }
    }
    /**
     * Cryptanalysis Step 1: Determine the Keyword Length
     * @param target DOM element to put output into
     * @param kwLength Length of the known keyword
     */
    public genCryptanalysisStep1(target: JQuery<HTMLElement>, kwLength: number) {
        this.showStep(target, "Step 1: Determine keyword length");

        this.showStepText(target, `Finding the keyword length is the first step to cracking this cipher. Since we don't know any information
        about the keyword, we start by guessing how long the keyword is, and then checking if our guess was right.
        Use the increment button to choose a guess to continue with.`)

        this.showStepText(target, "Now we can line our unknown keyword across the ciphertext.")

        let encoded = this.cleanString(this.state.cipherString);

        target.append(this.buildSolverCheckerboard(encoded, "0", 'unknownkey'))

        this.showSolvingNote(target, "Notice that we are not guessing the actual keyword yet, just the length, so each letter is unknown and represented with K1, K2, K3...");

        this.showStepText(target,
            `To continue, we can follow each keyword letter through the entire ciphertext and track the numbers associated with each. Specifically, we are looking for the ones digit.
            Let's follow K1, the first letter, through the entire ciphertext.`)

        target.append(this.buildSolverCheckerboard(encoded, "0", 'k1example'))

        let dynamicArray = this.buildCountArray(5, true);

        target.append($('<div/>', { class: 'center' }).append(
            "Ones Digit Count Table for Letter K1")
        )

        //we can see that there are _X_ X's in the above table, showing the appearances of the ones digits for K1

        this.showCountTable(target, dynamicArray, 'example')

        this.showStepText(target, `The above table shows all the ones digits found at the K1 locations in the ciphertext.
             If we find that the smallest ones digit is more than 5 spaces away from the largest ones digit, then our keyword length guess must be wrong.`)

        this.showSolvingNote(target, "To think more about this, ")

        this.showStepText(target, `We can construct a full count table to show the digits for every letter K1, K2, K3...
             If any of the rows do not follow the 5-space rule, then we know the corresponding keyword length guess is wrong.`)


        this.showCountTable(target, dynamicArray, 'ones')

        this.showStepText(target, `If we look through all the tables for different keyword lengths (using the increment button), 
        we see that the keyword length of ${kwLength} does not break the 5-space rule. This is likely our keyword length, so we'll continue with a length of ${kwLength}`)
    }
    /**
     * Cryptanalysys Step 2: Find the keyword letter mappings
     * @param target DOM element to put output into
     * @param kwLength Length of the known keyword
     */
    public genCryptanalysisStep2(target: JQuery<HTMLElement>, kwLength: number): CheckerboardSolverData {
        const solverData: CheckerboardSolverData = {
            rowKeyword: "", colKeyword: "",
            tens: [], ones: [], keyword: this.cleanRowKeyword.replace('J', 'I'),
            polybius: new Map<string, string[]>(),
            charMap: new Map<string, string[]>(),
            kwAnnotations: new Map<string, string[]>(),
            kwKnown: makeFilledArray(this.cleanRowKeyword.length, 'none'),
            warned: false,
            tested: {}
        }
        for (let tens of ["1", "2", "3", "4", "5"]) {
            for (let ones of ["1", "2", "3", "4", "5"]) {
                solverData.polybius.set(tens + ones, this.charset.replace('J', '').split(""))
            }
        }
        this.updateCharMap(solverData)

        this.showStep(target, "Step 2: Find keyword letter mappings");

        this.showStepText(target, `We have determined that the keyword has a length of ${kwLength} - here is its ones digit count table.`)

        let continueArray = this.buildCountArray(kwLength, true);
        this.showCountTable(target, continueArray, 'ones')

        solverData.ones = this.findKeywordMappings(continueArray);

        this.showStepText(target, `Since numbers generated from a polybius table can only end in the digits 1-5, we can analyze the count table to find specific mapping possibilities for each keyword letter.
            To do this, look at each keyword letter (row), and think about what number, if added to numbers 1-5, could generate the resulting row.`)

        this.showSolvingNote(target, "A more concrete 'formula' would be  <i>[Largest Seen Digit] - 5 <= Possible Mappings < [Smallest Seen Digit]</i>")

        this.showStepText(target, "This gives us the possible ones digits for the keyword letters. Now we can do the same with the tens digit - here is the tens digit table.")

        let tensArray = this.buildCountArray(kwLength, false);
        this.showCountTable(target, tensArray, 'tens')

        solverData.tens = this.findKeywordMappings(tensArray);

        this.showStepText(target, "Putting the tens and ones digit possibilities together, we can determine the possible mappings for each keyword letter.")

        this.showPossibleKeywordMappings(target, solverData, false);

        this.updateCharMap(solverData)

        return solverData
    }
    /**
     * Cryptanalysys Step 3:
     * @param target DOM element to put output into
     * @param kwLength Length of the known keyword
     */
    public async genCryptanalysisStep3(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData) {
        this.showStep(target, "Step 3: Utilize crib to fill in polybius square");

        this.showStepText(target, `Using the determined keyword mappings, fill in the keyword letters (K1, K2...) with the correct mappings, leaving a '?' if there is more than one possibility.
         Subtract the keyword mapping numbers from the original ciphertext numbers, giving us our answer (or plaintext) numbers.`)

        this.showCurrentSolution(target, solverData, false);

        this.checkForCribHints(target, solverData)

        this.showStepText(target, "Now we can align the crib with the answer numbers to fill in the polybius table. The below table shows all the locations we are certain about")

        this.showPolybiusTable(target, true, this.getKnownPolybius(solverData), solverData)
        this.updateCharMap(solverData)

        this.showStepText(target, "Knowing that the polybius table is alphabetical can help us uncover even more polybius cells.")

        const filled = this.fillLetterGaps(target, solverData);

        if (filled) {
            this.showSolvingNote(target, `For example, if a sequence on the polybius table was T _ _ W, we know the middle two blanks must be U and V. If the sequence was T _ W, we know the middle blank must be U or V`)
        }
        this.showPolybiusTable(target, true, this.getKnownPolybius(solverData), solverData)


        this.showStepText(target, "Using these techniques helps us narrow down the possibilities for our keyword letters. Below is a table of all possible keyword letters determined")

        const kwPossibilities = this.getKeywordPossibilities(solverData)

        if (await this.restartCheck()) { return }

        this.showPotentialKeywords(target, kwPossibilities);
        if (await this.restartCheck()) { return }

        const kwChoices = this.countKeywordMatches(kwPossibilities, this.state.curlang)
        if (kwChoices === 1) {
            this.showSolvingNote(target, `Since the only possible keyword which matches that is ${solverData.keyword} we can fill that in`)
        } else {
            solverData.warned = true
            this.state.autoSolverScore = AUTOSOLVER_NOKEYWORD

            this.setErrorMsg(`Auto-Solver is unable to determine the keyword given the Crib Text.  Consider a longer or different Crib.`, 'si',);

            let x = `${kwChoices} which possibly match`
            if (kwChoices > 10) {
                x = `too many possible matches to count`
            }
            this.showSolvingNote(target, `Hopefully, the problem is structured in a way where there is enough information to determine the exact keyword '${solverData.keyword}'.
            However, right now we see ${x}.
            <br>With the keyword known, the entire plaintext numbers should be revealed, which should give you enough information to deduce the rest of the answer.`, 'alert')
        }
    }
    /**
     * Cryptanalysys Step 4: Work back from the keyword
     * @param target DOM element to put output into
     * @param kwLength Length of the known keyword
     */
    public genCryptanalysisStep4(target: JQuery<HTMLElement>, solverData: CheckerboardSolverData) {
        this.showStep(target, "Step 4: Work back from the keyword");

        target.append(`<p>Now that we know the keyword to be ${solverData.keyword} corresponding to K1-K${solverData.keyword.length} we need to find out where in the polybius table the individual letters fit</p>`)

        // Now that we know the keyword, we can fill in the Polybius table and KW annotation
        let updated = this.fillKeyWord(target, solverData)
        this.updateCharMap(solverData)
        if (this.fillLetterGaps(target, solverData) > 0) {
            updated = true
        }
        if (this.checkForCribHints(target, solverData)) {
            updated = true
            this.fillKeyWord(target, solverData)
        }
        if (updated) {
            this.showSolvingNote(target, `With those discoveries, our solution now looks like:`)
            this.showPolybiusTable(target, true, this.getKnownPolybius(solverData), solverData)
            this.showCurrentSolution(target, solverData)
        }

        this.updateCharMap(solverData)

        this.fillMatchedKeywordChars(target, solverData)

        this.showPolybiusTable(target, true, this.getKnownPolybius(solverData), solverData)

        const changed = this.fillLetterGaps(target, solverData);

        if (changed > 0) {
            this.showPolybiusTable(target, true, this.getKnownPolybius(solverData), solverData)
        }
        const autoSolverScore = this.showCurrentSolution(target, solverData)

        // See if they were able to know where all the letters of the crib were found
        let knownKw = true
        for (let x of solverData.kwKnown) {
            if (x !== 'all') {
                knownKw = false
            }
        }
        if (!knownKw && !solverData.warned) {
            solverData.warned = true
            this.state.autoSolverScore = AUTOSOLVER_NOKEYPOS
            this.setErrorMsg(`Auto-Solver is unable to determine the location of all keyword letters in the Polybius square.  Consider a longer or different Crib.`, 'si');
        }

        let showGood = true
        if (!solverData.warned) {
            this.state.autoSolverScore = autoSolverScore
        }
        if (autoSolverScore > 2.5 ||
            (this.state.blocksize !== 0 && autoSolverScore > 1.25)) {
            if (!solverData.warned) {
                solverData.warned = true
                this.setErrorMsg(`Auto-Solver is unable to figure out enough letters for the problem to be readily solved.  Consider a longer or different Crib.`, 'si')
            }
            this.showSolvingNote(target, `There doesn't appear to be enough letters shown to be able to determine the remainder of the letters in the quote. [Autosolver score = ${autoSolverScore.toFixed(2)}]`, 'alert')
            showGood = false
        }
        if (showGood) {
            this.showSolvingNote(target, `There appear to be enough letters revealed so that the remainder can be quickly determined. [Autosolver score = ${autoSolverScore.toFixed(2)}]`)
        }

    }
    /**
     * 
     * @param result 
     * @param text 
     */
    private showSolvingNote(result: JQuery<HTMLElement>, text: string, noteClass: calloutTypes = 'primary') {
        result.append($('<div/>', { class: `callout ${noteClass} small` }).append(text)
        );
    }

    /**
     * Show the current step as a callout
     * @param target Place to output the step
     * @param text Text of the step number
     */
    public showStep(target: JQuery<HTMLElement>, text: string): void {
        target.append(makeCallout(text, 'secondary'))
    }
    /**
     * Show the current step as a callout
     * @param target Place to output the note
     * @param text Text of the step number
     */
    public showStepText(target: JQuery<HTMLElement>, text: string): void {
        target.append($('<p/>').append(text))
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

        polybiusSquare.append(row);

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
        this.suggestLenKey(5, 5);
    }
    /**
     * Populate the dialog with a set of keyword suggestions. 
     */
    public populateKeySuggestions(): void {
        this.populateLenKeySuggestions('genbtn', 'suggestKeyopts', 20, 5, 5)
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
                div.append(`${potentialCribs[selection].crib} (${potentialCribs[selection].directCount}+${potentialCribs[selection].indirectCount})`);
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
                if (blocksize < 0) {
                    $('#blocksize').val("0");
                }
                if (blocksize !== this.state.blocksize && blocksize > 0) {
                    this.markUndo(null);
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
