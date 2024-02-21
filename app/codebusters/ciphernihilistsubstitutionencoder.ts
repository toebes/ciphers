import { BoolMap, cloneObject } from '../common/ciphercommon';
import {
    IOperationType,
    IState,
    ITestType,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';

interface INihilistState extends IEncoderState {
    /** The type of operation */
    operation: IOperationType;
    /** The size of the chunking blocks for output - 0 means respect the spaces */
    blocksize: number;
    /** The polybius key string */
    polybiusKey: string;
    /** The current keyword length example to show in the solver */
    solverKeyLength: number;
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
 * Nihilist Encoder
 *
 */
export class CipherNihilistSubstitutionEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Nihilist';
    public maxEncodeWidth = 27;
    public validTests: ITestType[] = [
        ITestType.None,
        ITestType.cregional,
        ITestType.cstate,
        ITestType.bregional,
        ITestType.bstate,
        // ITestType.aregional,
    ];

    public cleanKeyword = '';
    public cleanPolyKey = '';
    public polybiusMap = new Map<string, string>();
    public sequencesets = [];

    public isLoading = false;
    public stopGenerating = false;

    public defaultstate: INihilistState = {
        /** The current cipher type we are working on */
        cipherType: ICipherType.NihilistSubstitution,
        /** Currently selected keyword */
        keyword: '',
        /** The current cipher we are working on */
        cipherString: '',
        crib: '',
        /** The current string we are looking for */
        findString: '',
        operation: 'decode',
        blocksize: 0,
        polybiusKey: '',
        solverKeyLength: 4,


    };
    public state: INihilistState = cloneObject(this.defaultstate) as INihilistState;
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
        this.state = cloneObject(this.defaultstate) as INihilistState;
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
            if (
                testType !== ITestType.cregional &&
                testType !== ITestType.cstate &&
                testType !== ITestType.bregional &&
                testType !== ITestType.bstate &&
                this.state.operation === 'encode'
            ) {
                result = 'Encode problems are not allowed on ' + this.getTestTypeName(testType);
            }
            if (
                testType !== ITestType.bstate &&
                testType !== ITestType.cstate &&
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
     * Determine if the question text references the right pieces of this cipher
     */
    public validateQuestion(): void {
        let msg = '';

        const questionText = this.state.question.toUpperCase();
        if (this.state.operation === 'crypt') {
            if (
                questionText.indexOf('DECOD') < 0 &&
                questionText.indexOf('DECRY') < 0 &&
                questionText.indexOf('WAS ENC') < 0 &&
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
            // For an encode or decode, they need to mention the key
            const key = this.cleanKeyword;
            if (key !== '' && questionText.indexOf(key) < 0) {
                msg +=
                    "The Key '" +
                    this.cleanKeyword +
                    "' doesn't appear to be mentioned in the Question Text.";
            }
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

    /*
        This replaces the 'get()' method for a normal Map. Since J is not located in our polybius map, but it still needs
        to be incorporated in our question, we have to treat any get('J') as a get('I'). This method acts as that filter.
    */
    public getNumFromPolybiusMap(s: string) {
        let polyMap = this.polybiusMap;
        if (s == 'J') {
            s = 'I'
        }
        return polyMap.get(s);
    }


    public placeCrib(): ICribInfo {
        const crib = this.minimizeString(this.state.crib);
        const strings = this.buildNihilistSequenceSets(
            this.minimizeString(this.state.cipherString),
            9999,
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
     * Generates the sample question text for a cipher
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {
        let msg = '';
        let ciphertypetext = 'Nihilist Substitution';
        if (this.state.operation === 'crypt') {
            msg = `<p>The following quote${this.genAuthor()} has been encoded with the ${ciphertypetext}
                Cipher using a very common word for the key. `;

            const cribpos = this.placeCrib();
            if (cribpos === undefined) {
                msg += 'But <strong>the crib can not be found in the Plain Text</strong>. ';
            } else if (cribpos.position === 0) {
                msg += `The deciphered text starts with ${this.genMonoText(cribpos.plaintext)}. `;
            } else if (cribpos.position === cribpos.cipherlen - cribpos.criblen) {
                msg += `The deciphered text ends with ${this.genMonoText(cribpos.plaintext)}. `;
            } else {
                const startpos = this.getPositionText(cribpos.position + 1);
                const endpos = this.getPositionText(cribpos.position + cribpos.criblen);
                msg += `The ${startpos} through ${endpos} cipher units (${this.genMonoText(cribpos.ciphertext.join(' '))})
                    decode to be ${this.genMonoText(cribpos.plaintext)}. `
            }
        } else {
            const keyword = this.genMonoText(this.cleanKeyword);
            const polybiusKey = this.genMonoText(this.cleanPolyKey);
            if (this.state.operation === 'encode') {
                msg = `<p>The following quote${this.genAuthor()} needs to be encoded with the
                    ${ciphertypetext} Cipher with a keyword of ${keyword} and polybius key of ${polybiusKey}. `;
            } else {
                msg = `<p>The following quote${this.genAuthor()} needs to be decoded with the 
                    ${ciphertypetext} Cipher with a keyword of ${keyword} and polybius key of ${polybiusKey}. `;
            }
        }
        msg += '</p>';
        return msg;
    }

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
            operationText = ' This problem requires cryptanalysis. ';
            suggested += 100;
        }

        if (this.state.blocksize != this.cleanKeyword.length) {
            blockSizeMatchesText = ' The block size does not match the keyword length. ';
            suggested += 15;
        }

        if (this.state.blocksize === 0) {
            zeroBlockSizeText = ` The block size is 0. `
            suggested -= 10;
        }

        keywordLengthText = ` The key has length ${this.cleanKeyword.length}. `;
        // Add more  points for larger keywords...
        suggested += Math.round((10 * (this.cleanKeyword.length / 3)));

        // if (this.cleanPolyKey.indexOf('Z') !== -1) {
        //     zNotLastText = ` The letter 'Z' is not the last letter in the polybius square. `;
        //     suggested += 10;
        // }

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
        this.setSolverKeyLength(this.state.solverKeyLength);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        if (this.state.operation !== 'crypt') {
            this.guidanceURL = 'TestGuidance.html#Nihilist';
            $('.crib').hide();
        } else {
            this.guidanceURL = 'TestGuidance.html#Nihilist_Cryptanalysis';
            $('.crib').show();
        }
        JTRadioButtonSet('ciphertype', this.state.cipherType);
        JTRadioButtonSet('operation', this.state.operation);
        $('#blocksize').val(this.state.blocksize)
        $('#polybiuskey').val(this.state.polybiusKey)
        $('#crib').val(this.state.crib);
        $('#solverkeylength').val(this.state.solverKeyLength);
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

        const suggestButton = $('<a/>', { type: "button", class: "button primary tight", id: "suggestkey" }).text("Suggest Keyword")
        result.append(
            JTFLabeledInput(
                'Keyword',
                'text',
                'keyword',
                this.state.keyword,
                'small-12 medium-12 large-12',
                suggestButton
            )
        );

        result.append(
            JTFLabeledInput(
                'Crib Text',
                'text',
                'crib',
                this.state.crib,
                'crib small-12 medium-12 large-12'
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

    public setSolverKeyLength(solverKeyLength: number): boolean {
        let changed = false;
        if (this.state.solverKeyLength !== solverKeyLength) {
            this.state.solverKeyLength = solverKeyLength;
            changed = true;
        }
        return changed;
    }

    /*
        Given two characters, this method uses the polybius mapping to 
        return the added mapped numbers together. It encodes into a ciphertext.
    */
    public encodePolybius(c1: string, c2: string): string {

        let num1 = Number(this.getNumFromPolybiusMap(c1));
        let num2 = Number(this.getNumFromPolybiusMap(c2));

        let result = (num1 + num2).toString();

        return result;
    }

    /*
        This method returns a Map object which maps a character (key) to 
        its corresponding number, based on the polybius table row/column.
    */
    public buildPolybiusMap(): Map<string, string> {

        const polybiusMap = new Map<string, string>();

        let preKey = this.cleanPolyKey.toUpperCase();

        preKey = this.minimizeString(preKey);

        //in the behind the scenes, we treat the map/tables as if 'J' doesn't exist and there's only I.
        //if J appears in any user input, we manually convert it to I
        //later on we will deal with the I converting to I/J (namely in buildpolybius table method)
        preKey = preKey.replace('J', 'I')
        let sequence = '';
        //get rid of duplicates

        //add the unduped key to the polybius sequnece
        sequence += this.undupeString(preKey);

        //again pretending the J doesn't exist
        let polybiusCharset = this.charset.replace('J', '');

        //add remaining chars in alphabet to the polybius sequence
        for (const ch of polybiusCharset) {
            if (sequence.indexOf(ch) < 0) {
                sequence += ch;
            }
        }


        for (let i = 0; i < sequence.length; i++) {
            let row = Math.floor(i / 5) + 1;
            let col = i % 5 + 1;

            let key = sequence.substring(i, i + 1)
            polybiusMap.set(key, "" + row + col);
        }

        return polybiusMap;

    }

    public setPolybiusKey(polybiusKey: string): boolean {
        let changed = false;
        if (this.state.polybiusKey !== polybiusKey) {
            this.state.polybiusKey = polybiusKey;
            changed = true;
        }
        return changed;
    }

    /*
        This method returns an array of 'sequencesets', which contains all the information of a nihilist problem,
        such as the cipher string, mapped cipher string, mapped key, mapped answer, etc. These are all different arrays, or sequences,
        containing either a character or a number. Such as ['35', '56', 78'] or ['K', 'E', 'Y']. These sequences should all be the
        same length. If the sequence ever exceeds the maxencodewidth, then it will create another sequenceset for the next chunk of
        sequences to display on a new line.
    */
    public buildNihilistSequenceSets(
        msg: string,
        maxEncodeWidth: number,
        findCrib: boolean = false
    ): string[][][] {
        let key = this.cleanKeyword
        if (key === '') {
            key = 'A';
        }
        const encoded = findCrib ? msg : this.chunk(msg, this.state.blocksize);
        const result: string[][][] = [];
        const charset = this.getCharset();
        let cipher = [];
        let message = [];
        let mappedKey = [];
        let mappedMessage = [];
        let plainKey = [];
        const msgLength = encoded.length;
        const keyLength = key.length;
        let keyIndex = 0;
        let lastSplit = -1;

        for (let i = 0; i < msgLength; i++) {
            //messagechar is the current character in the encoded string
            const messageChar = encoded.substring(i, i + 1).toUpperCase();
            if (messageChar == 'J') {
                messageChar
            }
            const m = charset.indexOf(messageChar);
            if (m >= 0) {
                //keychar is the current character in the key string
                let keyChar = key.substring(keyIndex, keyIndex + 1).toUpperCase();

                mappedKey.push(this.getNumFromPolybiusMap(keyChar));
                message.push(messageChar);

                mappedMessage.push(this.getNumFromPolybiusMap(messageChar));
                //cipher is the text we are decoding/encoding into
                cipher.push(this.encodePolybius(messageChar, keyChar));

                plainKey.push(keyChar)

                keyIndex = (keyIndex + 1) % keyLength;

            } else {
                //if the current character in encoded message is not found in charset, then don't modify it (such as w/ punctuation)
                //directly push it onto the arrays
                message.push(messageChar);
                cipher.push(messageChar);
                mappedKey.push(messageChar);
                mappedMessage.push(messageChar);
                plainKey.push(messageChar)
                lastSplit = cipher.length;
                continue;
            }
            if (message.length >= maxEncodeWidth) {
                /*
                    last split refers to the last index in which a non-charset key appeared in the message. 
                    this creates a 'split' in the text, a place where we want to separate lines at
                */
                if (lastSplit === -1) {
                    //if no last split exists, we'll push the entire line and start over on the next line
                    result.push([cipher, message, mappedKey, mappedMessage, plainKey]);
                    message = [];
                    cipher = [];
                    mappedKey = [];
                    mappedMessage = [];
                    plainKey = [];
                    lastSplit = -1;
                } else {
                    //if there is a last split, we want to separate the new lines at this point
                    const messagePart = message.slice(0, lastSplit);
                    const cipherPart = cipher.slice(0, lastSplit);
                    const mappedKeyPart = mappedKey.slice(0, lastSplit);
                    const mappedMessagePart = mappedMessage.slice(0, lastSplit);
                    const plainKeyPart = plainKey.slice(0, lastSplit);

                    //this next line will continue, having the remaining text after the split
                    message = message.slice(lastSplit);
                    cipher = cipher.slice(lastSplit);
                    mappedKey = mappedKey.slice(lastSplit);
                    mappedMessage = mappedMessage.slice(lastSplit);
                    plainKey = plainKey.slice(lastSplit);
                    result.push([cipherPart, messagePart, mappedKeyPart, mappedMessagePart, plainKeyPart]);
                }
            }
        }
        //push the remaining left messages onto a new line
        if (message.length > 0) {
            result.push([cipher, message, mappedKey, mappedMessage, plainKey]);
        }

        /* the result is an array of arrays of arrays - the large array contains all the lines (arrays) that the entire text is
            separated into. each line contains 4 arrays, each a char array of the info to appear on each subline*/
        return result;
    }

    /*
        This method builds the HTML for a polybius table
    */
    public buildPolybiusTable(center: boolean, fillString: string): JTTable {

        let polyClass = 'polybius-square'

        //center solver table
        if (center) {
            polyClass += ' center'
        } else {

        }

        const worktable = new JTTable({
            class: polyClass,
        });

        const top = worktable.addHeaderRow()
        top.add('')
        for (let i = 1; i <= 5; i++) {
            top.add(String(i))
        }

        let undupedPolybiusKey = this.undupeString(this.cleanPolyKey)

        let mainIndex = 0;
        for (let i = 1; i <= 5; i++) {
            const row = worktable.addBodyRow()
            row.add({
                celltype: 'th',
                content: i
            })

            //get an array of the keys of the polybius map
            let polybiusSequence = Array.from(this.polybiusMap.keys());
            for (let i = 1; i <= 5; i++) {
                if (fillString.toLowerCase().indexOf(polybiusSequence[mainIndex].toLowerCase()) < 0) {
                    row.add(" ")
                } else {
                    //we want to show I/J in the table, not just I
                    if (polybiusSequence[mainIndex] == 'I') {
                        row.add('I/J')
                    } else {
                        row.add(polybiusSequence[mainIndex])
                    }
                }
                mainIndex++;
            }
        }

        return worktable
    }

    public createSolverNumToLettersMap(concretes: string[]) {

        let map = new Map<string, string[]>();
        let undupedKey = this.undupeString(this.cleanPolyKey);

        let polySequence = Array.from(this.polybiusMap.keys());

        for (let i = 0; i < undupedKey.length; i++) {
            let col = (i % 5) + 1;
            let row = Math.floor(i / 5) + 1;
            let letter = polySequence[i]
            if (concretes.indexOf(letter) >= 0) {
                map.set(row + "" + col, [letter]);
            }
        }

        let index = undupedKey.length;
        let initialLetter = "<"

        while (index < 25) {

            let currentLetter = polySequence[index];
            let numSpaces = 0;

            //this loops through the 'between' spaces of two concrete letters
            while (index < 25 && concretes.indexOf(polySequence[index]) < 0) {

                index++;
                numSpaces++;
            }

            //check if the loop exited because we reached the end. if end reached, we still have work to do with ">"
            let lastLetter
            if (index === 25) {

                lastLetter = ">"

            } else {
                //the ending letter is the last letter in this subarray
                lastLetter = polySequence[index]

                //also set the mapping in the map
                let col = (index % 5) + 1;
                let row = Math.floor(index / 5) + 1;
                map.set(row + "" + col, [lastLetter]);
            }

            //the initial letter is whatever is left from previous run through, or if first them then "<"



            //let numSpaces = polySequence.indexOf(lastLetter) - polySequence.indexOf(initialLetter) - 1

            let polybiusCharset = "<" + this.charset.replace('J', '') + ">";

            let betweenArray = polybiusCharset.substring(polybiusCharset.indexOf(initialLetter) + 1, polybiusCharset.indexOf(lastLetter)).split("");

            let usableLetters = betweenArray.filter(x => !concretes.includes(x));

            let numSubs = usableLetters.length - numSpaces + 1;

            for (let i = 0; i < numSpaces; i++) {

                let subs = []

                subs = usableLetters.slice(i, i + numSubs);

                let col = ((index - numSpaces + i) % 5) + 1;
                let row = Math.floor((index - numSpaces + i) / 5) + 1;
                map.set(row + "" + col, subs);

            }



            //at the end, we want to set the new initial letter to be this current last letter for next iteration
            initialLetter = lastLetter;

            index++;



        }

        return map;


    }


    public buildPotentialKeyword(tensMapping: number[][], onesMapping: number[][], numToLettersMap: Map<string, string[]>) {


        const table = $('<table/>', { class: 'potential-keyword center' });

        const headerRow = $('<tr style="border-bottom:1px solid #000;font-weight:bold"/>', { class: 'solve' });

        const contentRow = $('<tr/>', { class: 'solve' });

        for (let i = 0; i < this.cleanKeyword.length; i++) {

            headerRow.append($('<td/>').text("K" + (i + 1)));

        }

        for (let i = 0; i < tensMapping.length; i++) {

            let possibilities = []

            for (let j = 0; j < tensMapping[i].length; j++) {

                for (let k = 0; k < onesMapping[i].length; k++) {

                    let currentTensPossibility = tensMapping[i][j];
                    let currentOnesPossibility = onesMapping[i][k];

                    let mapValue = numToLettersMap.get(currentTensPossibility + "" + currentOnesPossibility)

                    if (typeof mapValue === "undefined") {
                        if (possibilities.indexOf("?") < 0) {
                            possibilities.push("?")
                        }
                    } else {
                        //possibilities = possibilities.concat(mapValue)
                        //possibilities = Array.from(new Set(mapValue));

                        for (let i = 0; i < mapValue.length; i++) {
                            const p = mapValue[i]
                            if (possibilities.indexOf(p) < 0) {
                                possibilities.push(p)
                            }
                        }

                    }



                }

            }

            contentRow.append($('<td>').html(possibilities.join("<br>")));

        }

        table.append(headerRow);
        table.append(contentRow);

        return table;






        // for () {

        // }




        // const table = $('<table/>', { class: 'nihilist' });

        // const row = $('<tr/>', { class: '' });

        // for (let i = 0; i < tensMapping.length; i++) {

        //     let possiblities = ""

        //     for (let j = 0; j < tensMapping[i].length; j++) {

        //         for (let k = 0; k < onesMapping[i].length; k++) {

        //             let currentTensPossibility = tensMapping[i][j];
        //             let currentOnesPossibility = onesMapping[i][k];

        //             console.log(currentTensPossibility + "" + currentOnesPossibility)

        //             let mapValue = numToLettersMap.get(currentTensPossibility + "" + currentOnesPossibility)

        //             if (typeof mapValue === "undefined") {
        //                 possiblities += "?"
        //             } else {
        //                 let possibilitiesString = numToLettersMap.get(currentTensPossibility + "" + currentOnesPossibility).join("")

        //                 possiblities += possibilitiesString
        //             }



        //         }

        //     }

        //     row.append($('<td/>').text(possiblities));

        // }

        // table.append(row)


        // return table;

    }

    /*
        This method builds the nihilist sequenceset tables as well as the polybius square.
    */
    public buildNihilist(state: string): JQuery<HTMLElement> {

        //make sure J isn't used anywhere in plaintext/polykey/basekey
        // if (this.containsJ()) {
        //     return $('<div/>').text("The letter 'J' can not be used anywhere in the polybius key, base key, or plain text.");
        // }

        const result = $('<div/>');
        let key = this.cleanKeyword
        let emsg = '';
        let order = [];
        //indices guide:
        // 0 = ciphertext numbers
        // 1 = plaintext
        // 2 = mapped key numbers
        // 3 = mapped plaintext numbers
        // 4 = non-mapped key letters
        if (state === 'decode') {
            order = [[2, "minor"], [3, "minor"], [0, "solve bar"], [1, "ans"]];
        } else if (state === 'encode') {
            order = [[1, "solve"], [2, "minor"], [3, "minor"], [0, "ans bar"]];
        } else {
            order = [[2, "minor"], [3, "minor"], [0, "solve bar"], [1, "ans"]];
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
        if (this.state.operation === 'crypt') {
            const crib = this.minimizeString(this.state.crib);
            let msg = this.cleanString(this.state.cipherString)
            if (crib === '') {
                emsg = 'No Crib Text provided for Cryptanalysis.';
            } else if (this.minimizeString(msg).indexOf(crib) < 0) {
                emsg = 'Crib Text ' + this.state.crib + ' not found in Plain Text';
            }
        }
        this.setErrorMsg(emsg, 'vcrib');

        const sequencesets = this.sequencesets

        const table = $('<table/>', { class: 'nihilist' });

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

        //false to not center, true to fill alphabet (this is our normal poly table)
        const worktable = this.buildPolybiusTable(false, "abcdefghijklmnopqrstuvwxyz")

        result.append($('<div/>', { class: 'grid-x grid-padding-x align-justify' })

            //.append($('<div/>', { class: 'cell small-6 shrink' })
            .append($('<div/>', { class: 'cell shrink' }).append(table))
            //.append($('<p/>', { class: "h5" }).text('Solution'))

            //for stringset in strings
            //make a new table
            //fill the first row with whatever

            //.append($('<div/>', { class: 'KEY' }).text("something"))
            //.append($('<div/>', { class: 'TOSOLVE' }).text("nothing"))
            //.append($('<div/>', { class: 'TOANSWER' }).text(this.state.keyword)))
            .append($('<div/>', { class: 'cell shrink' }).append(worktable.generate())))

        return result;
    }

    /*
        This method builds the HTML for nihilist sequenceset tables in the solver. 
    */
    public buildSolverNihilist(msg: string, unknownkeylength: string, state: string): JQuery<HTMLElement> {

        //indices guide:
        // 0 = ciphertext numbers
        // 1 = plaintext
        // 2 = mapped key numbers
        // 3 = mapped plaintext numbers
        // 4 = non-mapped key letters

        // string = unknown key (used for cryptanalysis solver)
        //ex. "3" would mean iterate a K1 K2 K3 keyword

        const result = $('<div/>');
        let emsg = '';

        let order = [];
        if (state === 'keystring') {
            order = [[0, "solve"], [4, "ans"]];
        } else if (state === 'keynumbers') {
            order = [[0, "solve"], [2, "ans"]];
        } else if (state === 'plaintextnumbers') {
            order = [[0, "solve"], [2, "solve"], [3, "ans bar"]]
        } else if (state === 'plaintext') {
            order = [[0, "solve"], [2, "solve"], [1, "ans bar"]]
        } else if (state === 'unknownkey') {
            order = [[unknownkeylength, "ans"], [0, "solve"]];
        } else if (state === 'k1example') {
            order = [[unknownkeylength, "solve"], [0, "solve"]];
        }

        const sequencesets = this.sequencesets

        const table = $('<table/>', { class: 'nihilist center' });

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
                // console.log("bruh")
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

    public buildSolverCrib(keywordMappingsTens: number[][], keywordMappingsOnes: number[][], concretes: string[]) {

        const result = $('<div/>');

        const keywordLength = this.cleanKeyword.length
        const cleanCrib = this.minimizeString(this.cleanString(this.state.crib));

        const bigTable = $('<table/>', { class: 'nihilist center' });

        const sequencesets = this.sequencesets

        //j is just serving as a running count of valid characters. this is used for lining up the keyword. for example D O N ' T would map to K1 K2 K3 _ K4
        let j = 0;
        //k is a running count of every single character across all sequencesets. this is used to keep track of the precise location of the crib
        let k = 0;

        //i is the internal sequenceset index for every character, including invalid ones.

        for (const sequenceset of sequencesets) {

            const row1 = $('<tr/>', { class: 'solve' });
            const row2 = $('<tr/>', { class: 'solve' });
            const row3 = $('<tr/>', { class: 'ans bar' });
            const row4 = $('<tr/>', { class: 'ans' });

            let ciphertextNumbers = sequenceset[0];
            let mappedKeyNumbers = sequenceset[2];
            let mappedPlaintextNumbers = sequenceset[3];
            let plaintext = sequenceset[1];

            let index = this.state.cipherString.toLowerCase().indexOf(this.state.crib.toLowerCase());

            // console.log(ciphertextNumbers);

            for (let i = 0; i < ciphertextNumbers.length; i++) {

                let ct = ciphertextNumbers[i]
                if (isNaN(parseInt(ct)) || ct.length === 1) {
                    row1.append($('<td width="33px"/>').text(ct));
                    row2.append($('<td width="33px"/>').text(ct));
                    row3.append($('<td width="33px"/>').text(ct));
                    row4.append($('<td width="33px"/>').text(' '));
                } else {
                    //for first row, just append the unaltered ciphertext number
                    row1.append($('<td width="33px"/>').text(ct));

                    //for second row, we need to add question marks if necessary
                    let display1 = '';
                    let display2 = '';

                    if (keywordMappingsTens.length > 0 && keywordMappingsTens[j % keywordLength].length === 1) {
                        display1 += Math.floor(parseInt(mappedKeyNumbers[i]) / 10)
                        display2 += Math.floor(parseInt(mappedPlaintextNumbers[i]) / 10)
                    } else {
                        display1 += '?'
                        display2 += '?'
                    }

                    //for third row, just append the unaltered ciphertext number
                    if (keywordMappingsOnes.length > 0 && keywordMappingsOnes[j % keywordLength].length === 1) {
                        display1 += parseInt(mappedKeyNumbers[i]) % 10
                        display2 += parseInt(mappedPlaintextNumbers[i]) % 10
                    } else {
                        display1 += '?'
                        display2 += '?'
                    }



                    row2.append($('<td width="33px"/>').text(display1));
                    row3.append($('<td width="33px"/>').text(display2));

                    // console.log(index);
                    // console.log(index + cleanCrib.length);
                    if (k >= index && index >= 0 && k < (index + this.state.crib.length)) {
                        row4.append($('<td width="33px"/>').text(plaintext[i]));
                        if (display1.indexOf('?') < 0) {
                            concretes.push(plaintext[i]);
                        }
                    } else {
                        row4.append($('<td width="33px"/>').text(' '));
                    }

                    j++;
                }

                k++;

            }

            bigTable.append(row1);
            bigTable.append(row2);
            bigTable.append(row3);
            bigTable.append(row4);

            const blank = $('<tr/>').append($('<td/>').append($('<br>')));
            bigTable.append(blank)

        }

        result.append($('<div/>', { class: 'grid-x grid-padding-x align-justify' })

            .append($('<div/>', { class: 'cell shrink' })

                .append(bigTable)))

        return result

    }

    public buildCountArray(keywordLength: number, onesDigit: boolean): number[][] {

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


    public buildCountTable(countArray: number[][], isK1Example: boolean): JTTable {


        const table = new JTTable({
            class: 'polybius-square center',
        });

        const header = table.addHeaderRow()

        header.add('')

        for (let i = 1; i <= 10; i++) {
            let index = i % 10
            if (isK1Example && countArray[0][index] === 1) {
                header.add({
                    content: '<span class="ones">' + index + '</span>'
                })
            } else {
                header.add(index + '')
            }

        }

        for (let j = 0; j < countArray.length; j++) {

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
            if (largest - smallest >= 5 && !isK1Example) {
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



        return table;

    }


    // public buildCountTable(countArray: number[][]): JQuery<HTMLElement> {

    //     // console.log(countArray)
    //     // countArray.push(countArray.shift());
    //     // console.log(countArray)

    //     // if (typeof countArray !== 'undefined') {
    //     //     if (typeof countArray[0] !== 'undefined') {
    //     //         countArray.push(countArray.shift());
    //     //     }
    //     // }

    //     const table = $('<table/>', { class: 'nihilist center' });

    //     const headerRow = $('<tr style="border-bottom:1px solid #000"/>', { class: 'solve' });
    //     headerRow.append($('<td style="border-right:1px solid #000"/>').text(' '));
    //     headerRow.append($('<td/>').text('1'));
    //     headerRow.append($('<td/>').text('2'));
    //     headerRow.append($('<td/>').text('3'));
    //     headerRow.append($('<td/>').text('4'));
    //     headerRow.append($('<td/>').text('5'));
    //     headerRow.append($('<td/>').text('6'));
    //     headerRow.append($('<td/>').text('7'));
    //     headerRow.append($('<td/>').text('8'));
    //     headerRow.append($('<td/>').text('9'));
    //     headerRow.append($('<td/>').text('0'));

    //     table.append(headerRow)

    //     for (let j = 0; j < countArray.length; j++) {

    //         let letterRow = countArray[j];

    //         const row = $('<tr/>', { class: 'solve' });

    //         row.append($('<td style="border-right:1px solid #000"/>').text('K' + (j + 1)));

    //         for (let i = 1; i < letterRow.length; i++) {

    //             if (letterRow[i] === 1) {
    //                 row.append($('<td/>').text("X"));
    //             } else {
    //                 row.append($('<td/>').text("-"));
    //             }
    //         }

    //         if (letterRow[0] === 1) {
    //             row.append($('<td/>').text("X"));
    //         } else {
    //             row.append($('<td/>').text("-"));
    //         }

    //         table.append(row);

    //     }

    //     return table;
    // }

    public buildPossibleKeywordMappings(tensMappings: number[][], onesMappings: number[][]) {

        const table = $('<table/>', { class: 'potential-keyword center' });

        const headerRow = $('<tr style="border-bottom:1px solid #000;font-weight:bold"/>', { class: 'solve' });

        headerRow.append($('<td/>').text(" "));
        headerRow.append($('<td/>').text("Tens"));
        headerRow.append($('<td/>').text("Ones"));

        table.append(headerRow)

        for (let i = 0; i < this.cleanKeyword.length; i++) {

            const row = $('<tr/>', { class: 'solve' });

            row.append($('<td style="border-right:1px solid #000;font-weight:bold"/>').text("K" + (i + 1)));

            let tensString = ""
            let onesString = ""

            for (let j = 0; j < tensMappings[i].length; j++) {

                tensString += tensMappings[i][j] + ", "

            }

            for (let j = 0; j < onesMappings[i].length; j++) {

                onesString += onesMappings[i][j] + ", "

            }

            tensString = tensString.substring(0, tensString.length - 2)
            onesString = onesString.substring(0, onesString.length - 2)

            row.append($('<td/>').text(tensString));
            row.append($('<td/>').text(onesString));

            table.append(row)

        }

        return table;

    }

    public findKeywordMappings(countArray: number[][]): number[][] {

        let array = [];

        for (let i = 0; i < countArray.length; i++) {

            let lowest = 11;
            let highest = -1;

            for (let j of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {

                if (j < lowest && countArray[i][j % 10] === 1) {
                    lowest = j;
                }

                if (j > highest && countArray[i][j % 10] === 1) {
                    highest = j;
                }
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
     * Loads up the values for Nihilist
     */
    public load(): void {
        // console.log('start')
        // console.log(this.state.cipherString)

        const encoded = this.chunk(this.cleanString(this.state.cipherString), this.state.blocksize);
        this.cleanKeyword = this.minimizeString(this.cleanString(this.state.keyword))
        this.cleanPolyKey = this.minimizeString(this.cleanString(this.state.polybiusKey))
        this.polybiusMap = this.buildPolybiusMap();
        this.sequencesets = this.buildNihilistSequenceSets(encoded, this.maxEncodeWidth);

        this.clearErrors();
        this.validateQuestion();

        let res = this.buildNihilist(this.state.operation);
        $('#answer')
            .empty()
            .append(res);

        let target = $('#sol')
        target
            .empty()
            .append('<hr/>')
            .append($('<h3/>').text('How to solve'));
        if (encoded.length > 0) { //&& !this.containsJ()) {
            this.genNihilistSolution(ITestType.None, target)
        } else {
            target.append("Enter a valid question to see the solution process.")
        }

        this.attachHandlers();

        // console.log('finish')
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

        $('#solverkeylength')
            .off('input')
            .on('input', (e) => {
                const solverKeyLength = Number($(e.target).val());
                if (solverKeyLength !== this.state.solverKeyLength) {
                    this.markUndo(null);
                    if (this.setSolverKeyLength(solverKeyLength)) {
                        this.updateOutput();
                    }
                }
            });
        $('#suggestpkey')
            .off('click')
            .on('click', () => {
                this.suggestKeyword()
            });
    }

    /**
     * Generate the score of an answered cipher
     * @param answer - the array of characters from the interactive test.
     */
    public genScore(answer: string[]): IScoreInformation {
        const strings = this.buildNihilistSequenceSets(
            this.state.cipherString,
            40
        );
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
        let width = 27;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 20;
            extraclass = ' atest';
        }
        return { width, extraclass };
    }

    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let keypos = 0;
        const result = $('<div/>', { class: 'grid-x' });
        const { width, extraclass } = this.getTestWidth(testType);

        const strings = this.buildNihilistSequenceSets(
            this.state.cipherString,
            width
        );

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
     * Generate a solution for the Nihilist cipher
     * @param _testType Type of test we are generating the output for
     * @param target DOM element to put the output into
     */
    public async genNihilistSolution(_testType: ITestType, target: JQuery<HTMLElement>) {
        // If we are already in the process of loading then we need to request that
        // the loading process stop instead of starting it again.
        // Note that when the stop is processed it will trigger starting the load
        // once again to update the UI
        if (this.isLoading) {
            this.stopGenerating = true;
            return;
        }

        this.stopGenerating = false;
        this.isLoading = true
        if (this.state.operation === 'crypt') {
            this.genCryptanalysisSolution(target);
        } else if (this.state.operation === 'decode') {
            this.genDecodeSolution(target);
        } else {
            this.genEncodeSolution(target);
        }

        // See if they requested an abort to restart the operation before we finish
        if (await this.restartCheck()) { return }

        // All done, so mark that we are not in the process of updating
        this.isLoading = false
    }
    /**
     * Check to see if we need to restart the output operation all over
     * This works by giving a UI break sot that we can check for any input and decide to 
     * regenerate the output (because it might take a long time)
     * 
     * You need to call this whenever an operation has taken a long time to see
     * if something needs to be updated:
     *             if (await this.restartCheck()) { return }
     * @returns A flag indicating that something has changed and we need to abort generating output
     */
    public async restartCheck(): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (this.stopGenerating) {
            this.stopGenerating = false;
            setTimeout(() => { this.load() }, 10);
            this.isLoading = false;
            return true;
        }
        return false
    }
    /**
     * 
     * @param target DOM element to put output into
     */
    public async genDecodeSolution(target: JQuery<HTMLElement>) {
        let cleanKey = this.cleanKeyword.toUpperCase()
        let cleanPolybiusKey = this.cleanPolyKey.toUpperCase()

        const result = $('<div/>', { id: 'solution' });
        target.append(result);

        result.append($('<div/>', { class: 'callout secondary' }).text("Step 1: Fill out the Polybius Table"));

        let polyKeySpan = $('<span/>', { class: 'hl' }).text(cleanPolybiusKey)

        let polyLenSpan = $('<span/>', { class: 'hl' }).text(this.undupeString(cleanPolybiusKey).length)

        result.append('Given the Polybius Key ')
            .append(polyKeySpan)
            .append(', we can fill out the first ')
            .append(polyLenSpan)
            .append(` spaces of the polybius table, 
        with each <b>unique</b> letter taking up a space. (Skip any duplicate letters)`);

        result.append($('<div/>', { class: 'callout primary small' }).append("Note: Treat the letters <b>I</b> and <b>J</b> as one single letter <b>I/J</b>"))

        //true to center table, false to not fill rest of alphabet
        let onlyKeyPolyTable = this.buildPolybiusTable(true, cleanPolybiusKey).generate()

        if (await this.restartCheck()) { return }

        //result.append($('<div/>').append(polybiusTable));
        result.append(onlyKeyPolyTable)

        result.append("The remaining spaces are filled in alphabetical order, again skipping any letters that have already been used in the table.")

        //true to center table, true to fill alphabet
        let fullPolyTable = this.buildPolybiusTable(true, "abcdefghijklmnopqrstuvwxyz").generate()

        if (await this.restartCheck()) { return }

        result.append(fullPolyTable)

        result.append($('<div/>', { class: 'callout secondary' }).text("Step 2: Construct the Keyword Numbers"));

        let keywordSpan = $('<span/>', { class: 'hl' }).text(cleanKey)

        result.append('Take the given keyword ')
            .append(keywordSpan)
            .append(` and repeatedly line it across the entire ciphertext, 
        making sure each number corresponds to a single letter from our base key`)

        result.append($('<p/>'))

        let encoded = this.cleanString(this.state.cipherString);

        result.append(this.buildSolverNihilist(encoded, cleanKey, 'keystring'))

        if (await this.restartCheck()) { return }

        result.append(`Then, using our completed Polybius Table, convert 
        the repeating key word string into 2 digit numbers by finding the row and column of each letter on the table`)

        if (cleanKey.length === 0) {
            cleanKey = 'A'
        }

        let firstLetter = cleanKey.substring(0, 1)
        let tMap = this.getNumFromPolybiusMap(firstLetter)
        let tMapSpan = $('<span/>', { class: 'hl' }).text(tMap)
        let tMap1Span = $('<span/>', { class: 'hl' }).text(tMap.substring(0, 1))
        let tMap2Span = $('<span/>', { class: 'hl' }).text(tMap.substring(1, 2))
        result.append($('<div/>', { class: 'callout primary small' }).text(`For example, the letter ${firstLetter} would convert to `)
            .append(tMapSpan)
            .append(` since it is on row `)
            .append(tMap1Span)
            .append(` and column `)
            .append(tMap2Span)
        )

        result.append(this.buildSolverNihilist(encoded, cleanKey, 'keynumbers'))

        if (await this.restartCheck()) { return }

        result.append($('<div/>', { class: 'callout secondary' }).text("Step 3: Determine the Plaintext"));

        result.append(`Subtract the keyword numbers from the ciphertext numbers, giving us the plaintext numbers`)

        result.append(this.buildSolverNihilist(encoded, cleanKey, 'plaintextnumbers'))

        result.append(`This is our answer (plaintext), but it just needs to be converted back into letters through the polybius table`)

        let fullPolyTable2 = this.buildPolybiusTable(true, "abcdefghijklmnopqrstuvwxyz").generate()

        result.append(fullPolyTable2)

        if (await this.restartCheck()) { return }

        result.append(this.buildSolverNihilist(encoded, cleanKey, 'plaintext'))

        result.append($('<p/>'))

        let answer = $('<span/>', { class: 'hl' }).text(this.cleanString(this.state.cipherString.toUpperCase()))

        result.append(`Here's our answer: `).append(answer)


        //Step 1: Fill out the polybius table
        //given the polybius key [POLYBIUSKEY], we can fill in the first
        //[#POLYBIUSKEY] spaces in the polybius table.
        //show the filled in polybius table
        //The reamining spaces are filled in alphabetical order,
        //skipping any letters already filled in from the polybius key, and letter J
        //next, we take the given base key [BASEKEY], and repeatedly line the word across the entire
        //ciphertext until we reach the end, making sure each ciphertext number corresponds to a 
        //single letter from our base key.
        //next, using our completed polybius table, we can convert the repeating base key string into a 2 digit number,
        //by finding the row and column of each key letter on the table. 
        //for example, the first letter of our key "F" lives on the 1st row and 2nd column, thus converting to 12
        //finally, we subtract the given cipher string of numbers by the key strnig of numbers we just converted, one at at a time,
        //the resulting string of numbers represents our answer, which must be converted back into letters through the polybius table.
        //giving us the answer _______
        //since we are given the polybius key in Decode problems, 
        //we can fill in 
        //step 2 Given the polybius key and normal key
    }

    public async genEncodeSolution(target: JQuery<HTMLElement>) {
        return
    }

    public async genCryptanalysisSolution(target: JQuery<HTMLElement>) {


        //determine keyword length

        //first we need to determine the keyword length to help us break open the cipher
        //since we don't know the keyword initially, we must guess what the keyword is, and then see if that guess makes sense
        //with the resulting numbers


        //use this increment button to choose our initial guess how many letters are in the keyword

        //notice that each letter of our guess keyword is "K1, K2, etc."

        //with our keyword length guess, we can follow each keyword letter through the entire ciphertext. 
        //the respective numbers should only have a maximum of 5 

        //for example, let's follow 'K1', the first letter in our potential keyword guess.

        //we can see that there are _ times that K1 appears in the text. we can look at each of the respective 

        //ciphertext numbers' ones digits

        //if our guess of the keyword length was right, then the 'ones' digits should never be more than 5 different digits



        //To think about it more,

        //


        //the following table shows the 

        //if there are 6 or more X's in a row, then this keyword length cannot be right


        //we can see that the keyword length of _X_ works best

        //though if 




        //we're given only the sequence of ciphertext numbers, and need to determine the plaintext.


        const result = $('<div/>', { id: 'solution' });
        target.append(result);

        result.append($('<div/>', { class: 'callout secondary' }).text("Step 1: Determine keyword length"));

        result.append("Finding the keyword length is the first step to cracking this cipher. Since we don't know any information")
            .append(" about the keyword, we start by guessing how long the keyword is, and then checking if our guess was right.")
            .append('Use the increment button to choose a guess to continue with.')


        const inputbox2 = $('<div/>', { class: 'grid-x grid-margin-x blocksize' });
        inputbox2.append(JTFIncButton('Keyword Length Guess', 'solverkeylength', this.state.solverKeyLength, ''));
        result.append(inputbox2);

        result.append("Now we can line our unknown keyword across the ciphertext.")

        let encoded = this.cleanString(this.state.cipherString);

        result.append(this.buildSolverNihilist(encoded, this.state.solverKeyLength.toString(), 'unknownkey'))

        result.append($('<div/>', { class: 'callout primary small' }).append(
            "Notice that we are not guessing the actual keyword yet, just the length, so each letter is unknown and represented with K1, K2, K3...")
        )

        result.append(
            "To continue, we can follow each keyword letter through the entire ciphertext and track the ones digit associated with each number.")

            .append("Let's follow K1, the first letter, through the entire ciphertext, tracking its one digit in a table.")

        result.append(this.buildSolverNihilist(encoded, this.state.solverKeyLength.toString(), 'k1example'))


        let dynamicArray = this.buildCountArray(this.state.solverKeyLength, true);

        result.append($('<div/>', { class: 'center' }).append(
            "Ones Digit Count Table for Letter K1")
        )

        //we can see that there are _X_ X's in the above table, showing the appearances of the ones digits for K1

        let k1Table = this.buildCountTable([dynamicArray[0]], true).generate();
        result.append(k1Table);

        result.append("The above table shows all the ones digits found at the K1 locations in the ciphertext.")
            .append(" If we find that the smallest ones digit is more than 5 spaces away from the largest ones digit, then our keyword length guess must be wrong.")

        result.append($('<div/>', { class: 'callout primary small' }).append(
            "To think more about this, ")
        )


        result.append("We can construct a full count table to show the digits for every letter K1, K2, K3...")
            .append(" If any of the rows do not follow the 5-space rule, then we know the corresponding keyword length guess is wrong.")


        let dynamicTable = this.buildCountTable(dynamicArray, false).generate();
        result.append(dynamicTable);


        result.append("If we look through all the tables for different keyword lengths (using the increment button), ")
            .append("we see that the keyword length of " + this.cleanKeyword.length + " does not break the 5-space rule. This is likely our keyword length, so we'll continue with a length of " + this.cleanKeyword.length)


        result.append($('<div/>', { class: 'callout secondary' }).text("Step 2: Find keyword letter mappings"));

        result.append("We have determined that the keyword has a length of " + this.cleanKeyword.length + " - here is its ones digit count table.")

        let continueArray = this.buildCountArray(this.cleanKeyword.length, true);
        let continueTable = this.buildCountTable(continueArray, false).generate();
        result.append(continueTable);

        const onesMappings = this.findKeywordMappings(continueArray);

        result.append("Since numbers generated from a polybius table can only end in the digits 1-5, we can analyze the count table to find specific mapping possibilities for each keyword letter.")
            .append("To do this, look at each keyword letter (row), and think about what number, if added to numbers 1-5, could generate the resulting row.")

        result.append($('<div/>', { class: 'callout primary small' }).append(
            "A more concrete 'formula' would be  <i>[Largest Seen Digit] - 5 <= Possible Mappings < [Smallest Seen Digit]</i>")
        )

        result.append("This gives us the possible ones digits for the keyword letters. Now we can do the same with the tens digit - here is the tens digit table.")

        let tensArray = this.buildCountArray(this.cleanKeyword.length, false);
        let tensTable = this.buildCountTable(tensArray, false).generate();
        result.append(tensTable);

        const tensMappings = this.findKeywordMappings(tensArray);

        result.append("Putting the tens and ones digit possibilities together, we can determine the possible mappings for each keyword letter.")


        let possibleKeywordMappings = this.buildPossibleKeywordMappings(tensMappings, onesMappings);

        result.append(possibleKeywordMappings)

        result.append($('<div/>', { class: 'callout secondary' }).text("Step 3: Utilize crib to fill in polybius square"));

        result.append("Using the determined keyword mappings, fill in the keyword letters (K1, K2...) with the correct mappings, leaving a '?' if there is more than one possibility.")

        result.append(" Subtract the keyword mapping numbers from the original ciphertext numbers, giving us our answer (or plaintext) numbers.")

        let concretes = []
        let bigTable = this.buildSolverCrib(tensMappings, onesMappings, concretes);

        result.append(bigTable);

        result.append("Now we can align the crib with the answer numbers to fill in the polybius table. The below table shows all the locations we are certain about")


        let barePolyTable = this.buildPolybiusTable(true, concretes.join("")).generate()

        result.append(barePolyTable);


        let map = this.createSolverNumToLettersMap(concretes);


        let newConcretes = []

        let keys = Array.from(map.keys());

        for (let rowcol of keys) {
            let subs = map.get(rowcol)
            if (subs.length === 1) {
                newConcretes.push(subs[0])
            }
        }

        result.append("Finally, knowing that the polybius table is alphabetical can help us uncover even more polybius cells. The auto-solver has filled in additional letters, if possible.")

        let moreFilledPolyTable = this.buildPolybiusTable(true, newConcretes.join("")).generate()

        result.append(moreFilledPolyTable);

        result.append($('<div/>', { class: 'callout primary small' }).append(
            "For example, if a sequence on the polybius table was T _ _ W, we know the middle two blanks must be U and V. If the sequence was T _ W, we know the middle blank must be U or V")
        )

        result.append("Using these techniques helps us narrow down the possibilities for our keyword letters. Below is all possible keyword letters determined")

        let possibleKeywordTable = this.buildPotentialKeyword(tensMappings, onesMappings, map)

        result.append(possibleKeywordTable);

        result.append("Hopefully, the problem is structured in a way where there is enough information to determine the exact keyword " + this.cleanKeyword.toUpperCase())



        result.append("<br>With the keyword known, the entire plaintext numbers should be revealed, which should give you enough information to deduce the rest of the answer.")


        //if we look through all the tables for different keyword lengths (using the increment button), we see that the keyword length of 
        //_X_ does not have 6 X's in any of the rows

        // The keyword is repeated across the entire plaintext, so we can. Since . If we are right in our guess of the keyword length, 
        // then every 3rd plaintext number has the same corresponding keyword number associated with it. This means that every 3rd ciphertext number
        // can only have maximum 5 different values. If we find that there is more than 5 diffferent values, then we can rule out that keyword length.
        // A good range to test keyword lengths is keyword lengths 3 4 5 6. Let's try keyword length 3. 


        return result;
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
                const cell = $('<th/>').append($('<div/>', { class: 'square' }).html('' + a));
                row.append(cell);
            }
        }

        polybiusSquare.append(row);

        for (let i = 1; i < 6; i++) {
            const row = $('<tr/>');
            for (let j = 0; j < 6; j++) {
                if (j == 0) {
                    const cell = $('<th/>').append($('<div/>', { class: 'square' }).html('' + i));
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
        const strings = this.buildNihilistSequenceSets(
            this.state.cipherString,
            width
        );
        const tableDiv = $('<div/>', { class: 'cell auto' })
        const table = new JTTable({ class: 'ansblock unstriped' + extraclass });
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
        const strings = this.buildNihilistSequenceSets(
            this.state.cipherString,
            width
        );
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
        this.suggestLenKey(3, 7);
    }
    /**
     * Populate the dialog with a set of keyword suggestions. 
     */
    public populateKeySuggestions(): void {
        this.populateLenKeySuggestions('genbtn', 'suggestKeyopts', 3, 7)
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
        this.setKeyword(key)
        this.updateOutput()
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
}
