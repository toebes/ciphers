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
import { CipherEncoder, IEncoderState } from './cipherencoder';

interface INihilistState extends IEncoderState {
    /** The type of operation */
    operation: IOperationType;
    /** The size of the chunking blocks for output - 0 means respect the spaces */
    //blocksize: number;
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
        polybiusKey: '',
    };
    public state: INihilistState = cloneObject(this.defaultstate) as INihilistState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        this.undocmdButton,
        this.redocmdButton,
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
            const key = this.minimizeString(this.state.keyword);
            if (key !== '' && questionText.indexOf(key) < 0) {
                msg +=
                    "The Key '" +
                    this.state.keyword +
                    "' doesn't appear to be mentioned in the Question Text.";
            }
            const polybiusKey = this.minimizeString(this.state.polybiusKey);
            if (polybiusKey !== '' && questionText.indexOf(polybiusKey) < 0) {
                msg +=
                    "The Polybius Key '" +
                    this.state.polybiusKey +
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
    public placeCrib(): ICribInfo {
        const crib = this.minimizeString(this.state.crib);
        const strings = this.buildReplacementNihilist(
            this.minimizeString(this.state.cipherString),
            this.minimizeString(this.state.keyword),
            9999
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
        let ciphertypetext = 'Nihilist Substitition';
        if (this.state.operation === 'crypt') {
            msg =
                '<p>The following quote has been encoded with the ' + ciphertypetext +
                ' Cipher using a very common word for the key. ';

            const cribpos = this.placeCrib();
            if (cribpos === undefined) {
                msg += 'But <strong>the crib can not be found in the Plain Text</strong>. ';
            } else if (cribpos.position === 0) {
                msg +=
                    'The deciphered text starts with ' + this.genMonoText(cribpos.plaintext) + '. ';
            } else if (cribpos.position === cribpos.cipherlen - cribpos.criblen) {
                msg +=
                    'The deciphered text ends with ' + this.genMonoText(cribpos.plaintext) + '. ';
            } else {
                const startpos = this.getPositionText(cribpos.position + 1);
                const endpos = this.getPositionText(cribpos.position + cribpos.criblen);
                msg +=
                    'The ' +
                    startpos +
                    ' through ' +
                    endpos +
                    ' cipher units (' +
                    this.genMonoText(cribpos.ciphertext.join(' ')) +
                    ') decode to be ' +
                    this.genMonoText(cribpos.plaintext);
            }
        } else {
            const keyword = this.genMonoText(this.minimizeString(this.state.keyword));
            const polybiusKey = this.genMonoText(this.minimizeString(this.state.polybiusKey));
            if (this.state.operation === 'encode') {
                msg =
                    '<p>The following quote needs to be encoded ' +
                    ' with the ' + ciphertypetext + ' Cipher with a keyword of ' +
                    keyword + ' and polybius key of ' + polybiusKey;
            } else {
                msg =
                    '<p>The following quote needs to be decoded ' +
                    ' with the ' + ciphertypetext + ' Cipher with a keyword of ' +
                    keyword + ' and polybius key of ' + polybiusKey;
            }
        }
        msg += '</p>';
        return msg;
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
            this.guidanceURL = 'TestGuidance.html#Nihilist_Decrypt';
            $('.crib').show();
        }
        JTRadioButtonSet('ciphertype', this.state.cipherType);
        JTRadioButtonSet('operation', this.state.operation);
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
        result.append(this.createQuestionTextDlg());
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
                'Key',
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

        return result;
    }



    public encodePolybius(c1: string, c2: string): string {
        let polybiusMap = this.buildPolybiusMap();
        let num1 = Number(polybiusMap.get(c1));
        let num2 = Number(polybiusMap.get(c2));

        let result = (num1 + num2).toString();

        return result;
    }

    public convertMap(array) {
        let polybiusMap = this.buildPolybiusMap()
        let mappedKey = [];
        for (const el of array) {
            if (this.charset.indexOf(el) >= 0) {
                mappedKey.push(polybiusMap.get(el));
            } else {
                //mappedKey.push("0");
            }

        }

        return mappedKey;
    }

    public buildPolybiusMap() {

        const polybiusMap = new Map();

        let preKey = this.cleanString(this.state.polybiusKey).toUpperCase();

        preKey = this.minimizeString(preKey);

        //get rid of duplicates
        let seen = '';
        let sequence = '';
        for (const ch of preKey) {
            if (seen.indexOf(ch) < 0) {
                seen += ch;
                sequence += ch;
            }
        }

        //add remaining chars in alphabet to the polybius sequence
        let polybiusCharset = this.charset.replace("J", "");
        for (const ch of polybiusCharset) {
            if (sequence.indexOf(ch) < 0) {
                sequence += ch;
            }
        }

        for (let i = 0; i < sequence.length; i++) {
            let row = Math.floor(i / 5) + 1;
            let col = i % 5 + 1;
            polybiusMap.set(sequence.substring(i, i + 1), "" + row + col);
        }

        console.log(sequence);
        console.log(this.state.keyword)
        console.log(this.state.polybiusKey);

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

    public buildReplacementNihilist(
        msg: string,
        key: string,
        maxEncodeWidth: number
    ): string[][][] {
        let encoded = msg;
        if (key === '') {
            key = 'A';
        }
        const result: string[][][] = [];
        const charset = this.getCharset();
        const polybiusMap = this.buildPolybiusMap();
        let cipher = [];
        let message = [];
        let mappedKey = [];
        let mappedMessage = [];
        const msgLength = encoded.length;
        const keyLength = key.length;
        let keyIndex = 0;
        let lastSplit = -1;

        for (let i = 0; i < msgLength; i++) {
            //messagechar is the current character in the encoded string
            const messageChar = encoded.substring(i, i + 1).toUpperCase();
            const m = charset.indexOf(messageChar);
            if (m >= 0) {
                //keychar is the current character in the key string
                let keyChar = key.substring(keyIndex, keyIndex + 1).toUpperCase();

                console.log(keyChar);

                mappedKey.push(polybiusMap.get(keyChar));
                message.push(messageChar);
                if (messageChar == "J") {
                    mappedMessage.push("N/A");
                    cipher.push("J");
                } else {
                    mappedMessage.push(polybiusMap.get(messageChar));
                    //cipher is the text we are decoding/encoding into
                    cipher.push(this.encodePolybius(messageChar, keyChar));
                }



                keyIndex = (keyIndex + 1) % keyLength;

            } else {
                //if the current character in encoded message is not found in charset, then don't modify it (such as w/ punctuation)
                message.push(messageChar);
                cipher.push(messageChar);
                mappedKey.push(messageChar);
                mappedMessage.push(messageChar);
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
                    result.push([cipher, message, mappedKey, mappedMessage]);
                    message = [];
                    cipher = [];
                    mappedKey = [];
                    lastSplit = -1;
                } else {
                    //if there is a last split, we want to separate the new lines at this point
                    const messagePart = message.slice(0, lastSplit);
                    const cipherPart = cipher.slice(0, lastSplit);
                    const mappedKeyPart = mappedKey.slice(0, lastSplit);
                    const mappedMessagePart = mappedMessage.slice(0, lastSplit);

                    //this next line will continue, having the remaining text after the split
                    message = message.slice(lastSplit);
                    cipher = cipher.slice(lastSplit);
                    mappedKey = mappedKey.slice(lastSplit);
                    mappedMessage = mappedMessage.slice(lastSplit);
                    result.push([cipherPart, messagePart, mappedKeyPart, mappedMessagePart]);
                }
            }
        }
        //push the remaining left messages onto a new line
        if (message.length > 0) {
            result.push([cipher, message, mappedKey, mappedMessage]);
        }

        /* the result is an array of arrays of arrays - the large array contains all the lines (arrays) that the entire text is
            separated into. each line contains 4 arrays, each a char array of the info to appear on each subline*/
        return result;
    }


    public buildNihilist(msg: string, key: string): JQuery<HTMLElement> {

        const result = $('<div/>');
        let source = 1;
        let dest = 0;
        let emsg = '';
        let order = [];
        if (this.state.operation !== 'encode') {
            source = 0;
            dest = 1;
            order = [[2, "minor"], [3, "minor"], [source, "solve bar"], [dest, "ans"]];
        } else {
            order = [[source, "solve"], [2, "minor"], [3, "minor"], [dest, "ans bar"]];
        }

        // Check to make sure that they provided a Key
        if (this.minimizeString(key) === '') {
            emsg = 'No Key provided.';
        }
        this.setErrorMsg(emsg, 'vkey');

        // If we are doing Cryptanalysis, we need tthe Crib text
        emsg = '';
        if (this.state.operation === 'crypt') {
            const crib = this.minimizeString(this.state.crib);
            if (crib === '') {
                emsg = 'No Crib Text provided for Cryptanalysis.';
            } else if (this.minimizeString(msg).indexOf(crib) < 0) {
                emsg = 'Crib Text ' + this.state.crib + ' not found in Plain Text';
            }
        }
        this.setErrorMsg(emsg, 'vcrib');

        const strings = this.buildReplacementNihilist(msg, key, this.maxEncodeWidth);

        const table = $('<table/>', { class: 'nihilist' });

        for (const sequenceset of strings) {
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


        //const answerTable = new JTTable({ class: "ansblock" });

        // for (const stringset of strings) {
        //     console.log(stringset);
        //     //result.append($('<div/>', { class: 'TOSOLVE' }).text(stringset[source]));
        //     //result.append($('<div/>', { class: 'TOANSWER' }).text(stringset[dest]));

        //     let order = [2, 3, source, dest];

        //     const first = answerTable.addBodyRow();
        //     const second = answerTable.addBodyRow();
        //     const third = answerTable.addBodyRow();
        //     const fourth = answerTable.addBodyRow();

        //     for (let i = 0; i < stringset[0].length; i++) {
        //         first.add(stringset[order[0]][i]);
        //         second.add(stringset[order[1]][i]);
        //         third.add(stringset[order[2]][i]);
        //         fourth.add(stringset[order[3]][i]);
        //     }


        //     //const table = $('<table/>');
        //     // for (const row of rows) {
        //     //     const inner = $('<tr/>');
        //     //     for (const ch of row) {
        //     //         inner.append($('<td/>').text(ch));
        //     //     }
        //     //     table.append(inner);
        //     // }

        //     //result.append(table.generate())

        // }

        const worktable = new JTTable({
            class: 'polybius-square',
        });

        const top = worktable.addHeaderRow()
        top.add('')
        for (let i = 1; i <= 5; i++) {
            top.add(String(i))
        }
        let mainIndex = 0;
        for (let i = 1; i <= 5; i++) {
            const row = worktable.addBodyRow()
            row.add({
                celltype: 'th',
                content: i
            })

            //get an array of the keys of the polybius map
            let polybiusSequence = Array.from(this.buildPolybiusMap().keys());
            for (let i = 1; i <= 5; i++) {
                row.add(polybiusSequence[mainIndex])
                mainIndex++;
            }
        }

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
    /**
     * Loads up the values for Nihilist
     */
    public load(): void {
        let encoded = this.cleanString(this.state.cipherString);

        const key = this.minimizeString(this.state.keyword);
        this.clearErrors();
        this.validateQuestion();
        let res = this.buildNihilist(encoded, key);
        $('#answer')
            .empty()
            .append(res);

        if (this.cleanString(this.state.cipherString).length > 0) {
            res = this.genSolution(ITestType.None)
        }

        $('#sol')
            .empty()
            .append('<hr/>')
            .append(res);

        this.attachHandlers();
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
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
        const strings = this.buildReplacementNihilist(
            this.state.cipherString,
            this.state.keyword,
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
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        let keypos = 0;
        const result = $('<div/>', { class: 'grid-x' });
        let width = 40;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 30;
            extraclass = ' atest';
        }

        const strings = this.buildReplacementNihilist(
            this.state.cipherString,
            this.state.keyword,
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
            //add a blank row between each line of rows 
            const blank = $('<tr/>').append($('<td/>').append($('<br>')));
            table.append(blank);
        }

        result.append(table);

        return result;
    }


    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        if (this.state.operation === 'crypt') {
            return this.genCryptanalysisSolution();
        }
        if (this.state.operation === 'decode') {
            return this.genDecodeSolution();
        }
        return this.genEncodeSolution();
    }


    public genDecodeSolution(): JQuery<HTMLElement> {

        const result = $('<div/>', { id: 'solution' });
        result.append($('<h3/>').text('How to solve'));

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


        return result;

    }

    public genEncodeSolution(): JQuery<HTMLElement> {
        return
    }

    public genCryptanalysisSolution(): JQuery<HTMLElement> {
        return
    }

    /**
     * Generate the HTML to display the question for a cipher
     * @param testType Type of test
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'grid-x' });
        let width = 40;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 30;
            extraclass = ' atest';
        }
        const strings = this.buildReplacementNihilist(
            this.state.cipherString,
            this.state.keyword,
            width
        );
        const table = new JTTable({ class: 'ansblock shrink cell unstriped' + extraclass });
        let source = 0;
        if (this.state.operation === 'encode') {
            source = 1;
        }
        for (const sequenceset of strings) {
            const rowcipher = table.addBodyRow();
            for (const token of sequenceset[source]) {
                rowcipher.add(token);
            }
            //this.addCipherTableRows(table, '', sequenceset[source].join(''), undefined, true);
        }
        result.append(table.generate());

        //generating empty 5x5 polybius square table for students

        const polybiusSquare = $('<table/>', { class: 'polybius-square' });

        for (let i = 0; i < 5; i++) {
            const row = $('<tr/>');
            for (let j = 0; j < 5; j++) {
                const cell = $('<td/>').append($('<div/>', { class: 'square' }).html('&nbsp;'));
                row.append(cell);
            }
            polybiusSquare.append(row);
        }

        result.append(polybiusSquare);

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
        let width = 40;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width = 30;
            extraclass = ' atest';
        }
        const strings = this.buildReplacementNihilist(
            this.state.cipherString,
            this.state.keyword,
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
