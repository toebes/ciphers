import { cloneObject } from '../common/ciphercommon';
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
import { mapperFactory } from '../common/mapperfactory';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';

interface INihilistState extends IEncoderState {
    /** The type of operation */
    operation: IOperationType;
    /** The size of the chunking blocks for output - 0 means respect the spaces */
    blocksize: number;
    /** The polybius key string */
    polybiusKey: string;
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
    public maxEncodeWidth = 30;
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
        /** The current string we are looking for */
        findString: '',
        operation: 'decode',
        blocksize: 0,
        polybiusKey: '',

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
            msg = `<p>The following quote by ${this.genAuthor()} has been encoded with the ${ciphertypetext}
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
                msg = `<p>The following quote by ${this.genAuthor()} needs to be encoded with the
                    ${ciphertypetext} Cipher with a keyword of ${keyword} and polybius key of ${polybiusKey}. `;
            } else {
                msg = `<p>The following quote by ${this.genAuthor()} needs to be decoded with the 
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

        return { suggested: suggested, min: min, max: max, private: qdata, text: scoringText }
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
        super.updateOutput();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);

        let radiobuttons = [
            { id: 'wrow', value: 'encode', title: 'Encode' },
            { id: 'mrow', value: 'decode', title: 'Decode' },
            { id: 'crow', value: 'crypt', title: 'Cryptanalysis' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));
        this.genQuestionFields(result);
        this.genEncodeField(result);

        result.append(
            JTFLabeledInput(
                'Polybius Key',
                'text',
                'polybiuskey',
                this.state.polybiusKey,
                'small-12 medium-12 large-12'
            )
        );

        result.append(
            JTFLabeledInput(
                'Keyword',
                'text',
                'keyword',
                this.state.keyword,
                'small-12 medium-12 large-12'
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

        const inputbox = $('<div/>', { class: 'grid-x grid-margin-x blocksize' });
        inputbox.append(JTFIncButton('Block Size', 'blocksize', this.state.blocksize, ''));
        result.append(inputbox);

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
    public buildPolybiusTable(center: boolean, fillAlphabet: boolean): JTTable {

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
                if (!fillAlphabet && mainIndex >= undupedPolybiusKey.length) {
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
        } else {//if (state === 'encode') {
            order = [[1, "solve"], [2, "minor"], [3, "minor"], [0, "ans bar"]];
        }

        // Check to make sure that they provided a Key
        if (this.minimizeString(key) === '') {
            emsg = 'No Key provided. ';
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
        const worktable = this.buildPolybiusTable(false, true)

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
    public buildSolverNihilist(msg: string, key: string, state: string): JQuery<HTMLElement> {

        //indices guide:
        // 0 = ciphertext numbers
        // 1 = plaintext
        // 2 = mapped key numbers
        // 3 = mapped plaintext numbers
        // 4 = non-mapped key letters

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
        }

        const sequencesets = this.sequencesets

        const table = $('<table/>', { class: 'nihilist center' });

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

        result.append($('<div/>', { class: 'grid-x grid-padding-x align-justify' })

            .append($('<div/>', { class: 'cell shrink' })

                .append(table)))

        return result
    }


    /**
     * Loads up the values for Nihilist
     */
    public load(): void {
        console.log('start')
        console.log(this.state.cipherString)

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

        console.log('finish')
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
        let width = 33;
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
        let onlyKeyPolyTable = this.buildPolybiusTable(true, false).generate()

        if (await this.restartCheck()) { return }

        //result.append($('<div/>').append(polybiusTable));
        result.append(onlyKeyPolyTable)

        result.append("The remaining spaces are filled in alphabetical order, again skipping any letters that have already been used in the table.")

        //true to center table, true to fill alphabet
        let fullPolyTable = this.buildPolybiusTable(true, true).generate()

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
        let tMap = this.polybiusMap.get(firstLetter)
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

        let fullPolyTable2 = this.buildPolybiusTable(true, true).generate()

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
        return
    }

    /**
     * Generate the HTML to display the question for a cipher
     * @param testType Type of test
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });


        //generating empty 5x5 polybius square table for students

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

        result.append(polybiusSquare);

        const { width, extraclass } = this.getTestWidth(testType);
        const strings = this.buildNihilistSequenceSets(
            this.state.cipherString,
            width
        );
        const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
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
        result.append(table.generate());



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
}
