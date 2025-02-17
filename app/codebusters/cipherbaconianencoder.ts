import {
    BoolMap,
    cloneObject,
    NumberMap,
    padToMatch,
    setCharAt,
    setDisabled,
    StringMap,
} from '../common/ciphercommon';
import {
    ITestType,
    toolMode,
    ITestQuestionFields,
    IScoreInformation,
} from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { fiveletterwords } from '../common/fiveletterwords';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFDialog } from '../common/jtfdialog';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { CipherEncoder, IEncoderState, suggestedData } from './cipherencoder';
import { decodeHTML } from 'entities';
import { alphaEquiv, alphaEquivType, fourWayEquiv, genDualEquivString, genEquivString, pairEquiv, pickRandomEquivSets, validEquivSet } from '../common/alphaequiv';
import { createDocumentElement, getCSSRule, getElementSizeInInches } from '../common/htmldom';

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

interface abSuggestion {
    s1name: string
    s1: string
    s2name: string
    s2: string
}

const punctuationChars = '.,;-!';
interface IBaconianState extends IEncoderState {
    /** Characters to use to represent the A value */
    texta: string;
    /** Characters to use to represent the B value */
    textb: string;
    abMapping: string;
    /** How wide a line can be before wrapping */
    linewidth: number;
    /** Zoom factor (100=normal size) for Baconian characters */
    zoom?: number;
    /** Generate the Baconian charactrs as images instead of fonts */
    bitmap: boolean;
    /** List of words for the encoded string.
     * Note that any punctuation is included at the end of the string
     */
    words: string[];
}
/**
 * A single encoded line.  The Arrays of strings should all be the same length
 * and represent the mapping between the plain text characters and the cipher text characters
 * Note for a word baconian, only one in five plain text characters will be non blank.
 */
interface encodedLine {
    /* The original plain text before encoding */
    plaintext: string[];
    /* The corresponding baconian letter */
    baconian: string[];
    /* The encoded cipher text */
    ciphertext: string[];

}
/**
 * A set of encode lines split based on the nominal line length
 */
interface encodedLines {
    /* These are the output lines split based on the line length */
    lines: encodedLine[];
    /* For convenience we also break it into words ignorning line length */
    plainword: string[];
    baconword: string[];
    cipherword: string[];
    plainanswer: string[];
}

/**
 * CipherBaconianEncoder - This class handles all of the actions associated with encoding
 * a Baconian cipher.
 */
export class CipherBaconianEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#Baconian';
    public cipherName = 'Baconian'

    public validTests: ITestType[] = [
        ITestType.None,
        ITestType.cregional,
        ITestType.cstate,
        ITestType.bregional,
        ITestType.bstate,
    ];
    public defaultstate: IBaconianState = {
        cipherString: '',
        cipherType: ICipherType.Baconian,
        offset: 1,
        operation: 'let4let',
        texta: 'A',
        textb: 'B',
        abMapping: 'ABABABABABABABABABABABABAB',
        linewidth: this.maxEncodeWidth,
        zoom: 100,
        bitmap: true,
        words: [],
    };
    public state: IBaconianState = cloneObject(this.defaultstate) as IBaconianState;
    public cmdButtons: JTButtonItem[] = [
        this.saveButton,
        {
            title: 'Suggest AB',
            color: 'primary',
            id: 'suggestab',
            disabled: true,
        },
        this.undocmdButton,
        this.redocmdButton,
        this.questionButton,
        this.pointsButton,
        this.guidanceButton,
    ];
    /** Work canvas for generating images */
    workCanvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    /**
     * getInteractiveTemplate creates the answer template for synchronization of
     * the realtime answers when the test is being given.
     * @returns Question arrays to be used at runtime
     */
    public getInteractiveTemplate(): ITestQuestionFields {
        const result = super.getInteractiveTemplate();
        // Each cipher character corresponds to 5 baconian characters
        const anslen = this.getEncodingString().length * 5;
        // We need an answer, separators and replacement boxes for each baconian character worth
        // We can pack everything into a single string
        result.version = 2;
        result.answer = this.repeatStr(' ', anslen);
        result.separators = this.repeatStr(' ', anslen);
        result.replacements = this.repeatStr(' ', anslen);
        return result;
    }
    /** Where we are in the editing of the words */
    public wordpos = 0;
    public baconianWords: string[];
    public baconianPlain: string[];
    /** Mapping table of all baconian strings to known words */
    public wordlookup: { [index: string]: string[] };
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setTexta(this.state.texta);
        this.setTextb(this.state.textb);
        this.setOperation(this.state.operation);
    }
    /**
     * Create a Canvas for setting up images
     */
    public setupCanvas(): void {
        if (this.workCanvas === undefined) {
            let canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
            if (!canvas) {
                // Get us a canvas where we can play around with
                canvas = createDocumentElement('canvas', { class: 'hidden', id: 'canvas' }) as HTMLCanvasElement
            }
            const context = canvas.getContext('2d')
            this.workCanvas = canvas
            this.canvasContext = context
        }
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
     * Changes the width of the maximum line output
     * @param zoom New line width
     */
    public setZoom(zoom: number): boolean {
        let changed = false;
        if (zoom < 1) {
            zoom = 1;
        }
        if (this.state.zoom !== zoom) {
            this.state.zoom = zoom;
            changed = true;
        }
        return changed;
    }
    /**
     * Changes whether bitmap output is requested or not
     * @param checked flag to indicate we want a bitmap
     */
    public setBitmap(checked: boolean): boolean {
        let changed = false;
        if (this.state.bitmap !== checked) {
            this.state.bitmap = checked;
            changed = true;
        }
        return changed;
    }
    /**
     * Switches the mapping character of a letter in the character set
     * @param c Which character in the character set to change the value of
     */
    public toggleAB(c: string): void {
        const charset = this.getCharset();
        const idx = charset.indexOf(c);
        if (idx >= 0) {
            let val = this.state.abMapping.charAt(idx);
            if (val !== 'A') {
                val = 'A';
            } else {
                val = 'B';
            }
            this.state.abMapping = setCharAt(this.state.abMapping, idx, val);
        }
    }
    /**
     * Update the pattern table to a sequence defined
     * @param s The id of the button pressed
     */
    public updateABTable(s: string): void {
        let f = s.slice(1)
        let newMap = this.state.abMapping
        if (f === "t") {
            // Toggle them all
            newMap = ""
            for (let i = 0; i < this.state.abMapping.length; i++) {
                if (this.state.abMapping.charAt(i) === 'A') {
                    newMap += 'B'
                } else {
                    newMap += 'A'
                }
            }
        }
        else {
            // Figure out the pattern length
            let patLen = parseInt(f)
            if (isNaN(patLen) || patLen < 1) {
                patLen = 1;
            }
            newMap = ""
            while (newMap.length < this.state.abMapping.length) {
                newMap += this.repeatStr("A", patLen) + this.repeatStr("B", patLen)
            }
            newMap = newMap.slice(0, this.state.abMapping.length)
        }
        this.state.abMapping = newMap;
        this.updateOutput()
    }
    /**
     * Based on the current AB UI mapping, generate a quick lookup table to make
     * it easier to encode the baconian letters
     */
    public getABMap(): StringMap {
        const ablookup: StringMap = {};
        // Make a mapping of the characters for convenience
        const charset = this.getCharset();
        for (let i = 0; i < charset.length; i++) {
            const c = charset.substring(i, i + 1);
            const ab = this.state.abMapping.substring(i, i + 1);
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
            const ablookup = this.getABMap();
            for (const word of fiveletterwords) {
                // Figure out what letter this word will map to
                let mapping = '';
                for (const c of word) {
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
        this.baconianPlain = [];
        // Iterate through each letter and look it up in the map
        for (const c of cipherString) {
            if (this.isValidChar(c)) {
                this.baconianWords.push(baconMap[c]);
                this.baconianPlain.push(c);
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
        this.setRichText('texta', this.state.texta);
        this.setRichText('textb', this.state.textb);
        $('#linewidth').val(this.state.linewidth);
        $('#crib').val(this.state.crib);
        $('#zoom').val(this.state.zoom);
        $('#bitmap').prop('checked', this.state.bitmap);
        const abmap = this.getABMap();
        for (const c in abmap) {
            $('#l' + c).text(abmap[c]);
        }
        JTRadioButtonSet('operation', this.state.operation);
        this.validateQuestion();
        super.updateOutput();
        this.updateWordSelects();
        if (this.state.operation === 'sequence') {
            $("#suggestab").removeAttr('disabled').show()
        } else {
            $("#suggestab").attr('disabled', 'disabled').hide()

        }
        this.setOutputZoom();
    }
    /**
     * Update the question string (and validate if necessary)
     * @param question New question text string
     */
    public setQuestionText(question: string): void {
        super.setQuestionText(question);
        this.validateQuestion();
        this.attachHandlers();
    }
    /**
     * Set the output zoom level
     */
    public setOutputZoom() {
        let zoom = Math.max(50, this.state.zoom) / 100;
        if (this.state.operation === 'words') {
            zoom = 1
        }
        const rule = getCSSRule('table.bacon td');
        if (rule) {
            (rule.style as any)['font-size'] = `${zoom * 16}px`;
        }
    }
    /**
     * Initializes the encoder.
     */
    public init(lang: string): void {
        this.setupCanvas()
        super.init(lang);
    }
    /**
     * Parse out an A/B set into an array of strings.
     * Note that we have to do this because some characters actually are comprised of
     * two UTF characters (high surrogates/low surrogates)
     *   see:  https://dmitripavlutin.com/what-every-javascript-developer-should-know-about-unicode/
     *   and: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt
     * We also need to include trailing spaces with the characters so that they display well.
     * @param text A/B text to split out
     * @returns Array of strings
     */
    public buildset(text: string): string[] {
        // First we need to get rid of all the HTML elements in the string
        // TODO: Remember BOLD/ITALIC and which characters they applied to and bring them back later on
        const remain = decodeHTML(text.replace(/<[^>]*>/g, '')).replace(/[\s\xa0]+/g, ' ')
        // All the entities need to be converted 
        let result: string[] = [];
        let lastc = undefined;
        let highsurrogate = false;
        let useAltFont = false
        for (let c of remain) {
            if (highsurrogate) {
                lastc += c;
                highsurrogate = false;
            } else if (/[\uD800-\uDFFF]/.test(c)) {
                if (lastc !== undefined) {
                    result.push(lastc);
                }
                highsurrogate = true;
                lastc = c;
            } else if (/[\u0300-\u036F]/.test(c)) {
                // We have a combining character to add to the previous one
                // U+030x	◌̀	◌́	◌̂	◌̃	◌̄	◌̅	◌̆	◌̇	◌̈	◌̉	◌̊	◌̋	◌̌	◌̍	◌̎	◌̏
                // U+031x	◌̐	◌̑	◌̒	◌̓	◌̔	◌̕	◌̖	◌̗	◌̘	◌̙	◌̚	◌̛	◌̜	◌̝	◌̞	◌̟
                // U+032x	◌̠	◌̡	◌̢	◌̣	◌̤	◌̥	◌̦	◌̧	◌̨	◌̩	◌̪	◌̫	◌̬	◌̭	◌̮	◌̯
                // U+033x	◌̰	◌̱	◌̲	◌̳	◌̴	◌̵	◌̶	◌̷	◌̸	◌̹	◌̺	◌̻	◌̼	◌̽	◌̾	◌̿
                // U+034x	◌̀	◌́	◌͂	◌̓	◌̈́	◌ͅ	◌͆	◌͇	◌͈	◌͉	◌͊	◌͋	◌͌	◌͍	◌͎	 CGJ 
                // U+035x	◌͐	◌͑	◌͒	◌͓	◌͔	◌͕	◌͖	◌͗	◌͘	◌͙	◌͚	◌͛	◌͜◌	◌͝◌	◌͞◌	◌͟◌
                // U+036x  ◌͠◌	◌͡◌	◌͢◌	◌ͣ	◌ͤ	◌ͥ	◌ͦ	◌ͧ	◌ͨ	◌ͩ	◌ͪ	◌ͫ	◌ͬ	◌ͭ	◌ͮ	◌ͯ
                lastc += c
                useAltFont = true
            } else if (c === ' ') {
                if (lastc === undefined) {
                    lastc = c
                } else {
                    lastc += c
                }
            } else {
                if (lastc !== undefined) {
                    result.push(lastc);
                }
                lastc = c;
            }
        }
        if (lastc !== undefined) {
            result.push(lastc);
        }
        // See if we need to change it to bitmaps.
        if (this.state.bitmap) {
            // we need to go through result and convert everything to a bitmap
            for (let i = 0; i < result.length; i++) {
                const txt = result[i]

                // Note that you have to work in px units when working with the canvar
                // or it ends up scaling funny.
                const defaultFontsize = 16 * this.state.zoom / 100
                this.workCanvas.style.font = this.canvasContext.font
                this.workCanvas.style.fontSize = `${defaultFontsize}px`
                let font = 'Courier New'
                if (useAltFont) {
                    font = 'juliamono'
                }

                this.canvasContext.font = `${defaultFontsize}px ${font}`

                const txtSize = this.canvasContext.measureText(txt)
                let ascent = Math.max(txtSize.fontBoundingBoxAscent, txtSize.actualBoundingBoxAscent)
                let descent = Math.max(txtSize.actualBoundingBoxDescent, txtSize.fontBoundingBoxDescent)
                // Now we are going to *assume* that the DPI is 96 and we really want to get something that is 600 DPI.
                // so that it prints cleanly without pixelization
                const scaleFactor = 600 / 96
                let height = Math.ceil((ascent + descent) * scaleFactor)
                let width = Math.ceil(txtSize.width * scaleFactor)

                // console.log(`${txt}  ${txtSize.actualBoundingBoxAscent + txtSize.actualBoundingBoxDescent} x ${txtSize.width} => ${height} x ${width}`)

                this.workCanvas.width = width
                this.workCanvas.height = height

                const scaledFont = defaultFontsize * scaleFactor
                this.canvasContext.font = `${scaledFont}px ${font}`
                this.canvasContext.fillText(txt, 0, Math.ceil(ascent * scaleFactor))

                // https://stackoverflow.com/questions/12328714/convert-text-to-image-using-javascript
                const dataURL = this.workCanvas.toDataURL()
                result[i] = `<img src="${dataURL}" width="${txtSize.width.toFixed(2)}">`
            }
        }
        return result;
    }
    /**
     * 
     * @param str 
     * @param maxEncodeWidth 
     * @returns 
     */
    public makeBaconianReplacement(str: string, maxEncodeWidth: number): encodedLines {
        const langreplace = this.langreplace[this.state.curlang];
        // Since the word baconian is so different, we break it out to a different routine
        if (this.state.operation === 'words') {
            return this.makeWordReplacement(str, maxEncodeWidth);
        }
        let sourceline = '';
        let baconline = '';
        let encodeline: string[] = [];
        const result: encodedLines = { lines: [], baconword: [], cipherword: [], plainword: [], plainanswer: [] };
        const letpos: NumberMap = { A: 0, B: 0 };
        let sharedpos = 0;
        // Build up a proper set for the a and b strings
        let aset = this.buildset(this.state.texta);
        if (aset.length === 0) {
            aset.push(" ")
        }
        let bset = this.buildset(this.state.textb);
        if (bset.length === 0) {
            bset.push(" ")
        }
        for (let t of str) {
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== 'undefined') {
                t = langreplace[t];
            }
            const bacontext = baconMap[t];
            // Make sure that this is a valid character to map from
            if (bacontext !== undefined) {
                result.plainanswer.push(t);
                sourceline += '  ' + t + '  ';
                baconline += bacontext;
                for (const ab of bacontext) {
                    if (this.state.operation === 'let4let') {
                        let abset = aset;
                        if (ab !== 'A') {
                            abset = bset;
                        }
                        let pos = letpos[ab];
                        if (pos >= abset.length) {
                            pos = 0;
                        }
                        encodeline.push(abset[pos]);
                        pos++;
                        letpos[ab] = pos;
                    } else if (this.state.operation === 'sequence') {
                        let abset = aset;
                        if (ab !== 'A') {
                            abset = bset;
                        }
                        if (sharedpos >= abset.length) {
                            sharedpos = 0;
                        }
                        encodeline.push(abset[sharedpos]);
                        sharedpos++;
                    } else {
                        // Words - this code never gets executed
                    }
                }
            }
            /**
             * See if we have to split out the line
             */
            while (encodeline.length >= maxEncodeWidth) {
                const sourcepart = sourceline.substring(0, maxEncodeWidth);
                const baconpart = baconline.substring(0, maxEncodeWidth);
                const encodepart = encodeline.slice(0, maxEncodeWidth);
                sourceline = sourceline.substring(maxEncodeWidth);
                baconline = baconline.substring(maxEncodeWidth);
                encodeline = encodeline.slice(maxEncodeWidth);
                result.lines.push({
                    plaintext: sourcepart.split(''),
                    baconian: baconpart.split(''),
                    ciphertext: encodepart
                });
            }
        }
        // and add any residual parts
        if (encodeline.length > 0) {
            result.lines.push(
                {
                    plaintext: sourceline.split(''),
                    baconian: baconline.split(''),
                    ciphertext: encodeline
                })
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
        const result = $('<div/>');

        result.append(this.genAnswer(ITestType.None));
        return result;
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        this.clearErrors();
        const res = this.build();
        $('#answer')
            .empty()
            .append(res);

        // Check the table to see if it is wider than we expect

        let msg = ''
        if (this.state.operation !== 'words') {
            let table = document.querySelector(`.bacon.ansblock`) as HTMLElement
            const size = getElementSizeInInches(table)
            if (size.width >= 8) {
                msg = `The Baconian Symbols are too wide to fit on the page (Currently ${size.width.toFixed(1)}").  Please either reduce the Line Width or the Scale % values.`
            }
        }
        this.setErrorMsg(msg, 'tsz')
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();


    }

    public addQuestionOptions(qOptions: string[], langtext: string, hinttext: string, fixedName: string, operationtext: string, operationtext2: string, cipherAorAn: string): boolean {
        const plaintext = this.minimizeString(this.getEncodingString());
        const criblook = this.minimizeString(this.state.crib).toUpperCase();
        hinttext = '';

        if (criblook.length > 0) {
            hinttext += ' ';
            const cribpos = this.placeCrib();
            if (cribpos === 0) {
                hinttext += "You are told that the deciphered text starts with " +
                    this.genMonoText(this.state.crib);
            } else if (cribpos === (plaintext.length - criblook.length)) {
                hinttext += "You are told that the deciphered text ends with " +
                    this.genMonoText(this.state.crib);
            } else if (cribpos === 1) {
                hinttext += "You are told that the deciphered text starts with a single letter followed by " +
                    this.genMonoText(this.state.crib);
            } else {
                // Not at the begining or the end
                let ct = this.getCipherTextForCrib(cribpos, criblook.length)
                hinttext += `You are told that the cipher text ${this.genMonoText(ct)} decodes to be ${this.genMonoText(criblook)}`;
            }
            hinttext += '.';
        }


        if (this.state.operation !== 'words') {
            qOptions.push(`The following symbols encode a phrase${this.genAuthor()} using a Baconian alphabet${langtext}.${hinttext} What does it say?`);
            if (this.state.author !== undefined && this.state.author !== '') {
                qOptions.push(`The following odd symbols were found when a tomb was opened, but you recognized it as a prankster who scratched a quote by ${this.state.author} on the wall using a Baconian alphabet${langtext}.${hinttext} What does it say?`);
            }
            else {
                qOptions.push(`The following odd symbols were found when a tomb was opened, but you recognized it as a prankster who scratched it on the wall using a Baconian alphabet${langtext}.${hinttext} What does it say?`);
            }
        }
        else {
            qOptions.push(`The following strange headlines encode a phrase${this.genAuthor()} using a Baconian alphabet${langtext}.${hinttext} What does it say?`);
        }
        super.addQuestionOptions(qOptions, langtext, hinttext, fixedName, operationtext, operationtext2, cipherAorAn);
        return true;
    }
    /**
     * Find the encoded cipher text corresponding to the crib
     * @param pt Plain text 
     * @param pos Position of the plain text
     * @returns Cipher text encoded or '' for no matching cipher text
     */
    public getCipherTextForCrib(pos: number, len: number): string {
        let result = ''
        let extra = ''
        const lines = this.makeBaconianReplacement(this.getEncodingString(), 1)
        if (lines.cipherword.length >= (pos + len)) {
            for (let i = 0; i < len; i++) {
                result += extra + lines.cipherword[pos + i]
                extra = ' '
            }
        }
        return this.cleanString(result);
    }
    /**
     * Determine if the question text properly identifies the location of the crib
     * @param questionText Cleaned up question text
     * @param pt Plain text
     * @param pos Position that the plain text was found
     * @returns 
     */
    public findQuestionMatch(questionText, pt, pos): boolean {
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
            pos === (ptstring.length - pt.length) &&
            (questionText.indexOf('END') >= 0 ||
                questionText.indexOf('FINAL') >= 0 ||
                questionText.indexOf('LAST') >= 0)
        ) {
            return true;
        }

        // If the crib is one letter from the end, look for something in the
        // question that mentions being the second letter
        if (
            (pos === 1 ||
                (pos === (ptstring.length - (pt.length + 1)))) &&
            (questionText.indexOf('2') >= 0 ||
                questionText.indexOf('2ND') >= 0 ||
                questionText.indexOf('SECOND') >= 0)
        ) {
            return true;
        }
        // We haven't found something that identifes the location, so see if they
        // mentioned the corresponding cipher text for the crib
        const ct = this.getCipherTextForCrib(pos, pt.length)
        if (ct !== '') {
            const rec = new RegExp('\\b' + ct.replace(/[ \s+]/g, '[\\s\\.,;\\-!]+') + '\\b');
            console.log(rec)
            if (questionText.match(rec) !== null) {
                return true;
            }

        }

        return false;
    }
    /**
     * Remove all HTML elements from a string
     * @param str HTML String
     * @returns String without any HTML elements
     */
    public removeHtml(str: string): string {
        return super.removeHtml(str).replace(/&nbsp;/ig, ' ').replace(/ /g, ' ')
    }
    /**
     * Check for any errors we can find in the question
     */
    public validateQuestion(): void {
        let msg = '';
        let sampleLink: JQuery<HTMLElement> = undefined;
        if (this.state.operation === 'words') {
            const criblook = this.minimizeString(this.state.crib).toUpperCase();

            if (criblook !== '') {
                const cribpos = this.placeCrib();
                // We don't have to tell them if we can't place the crib because that is already done by checkHintCrib
                if (cribpos !== undefined) {
                    const questionText = this.removeHtml(this.state.question.toUpperCase());
                    if (!this.findQuestionMatch(questionText, criblook, cribpos)) {
                        msg = `The Question Text does not specify where the Crib Text '${this.state.crib}' is placed`;
                    }
                }
            }
        }
        if (msg !== '') {
            sampleLink = $('<a/>', { class: 'sampq' }).text(' Show suggested Question Text');
        }
        this.setErrorMsg(msg, 'vq', sampleLink);

    }
    /**
      * Generate the recommended score and score ranges for a cipher
      * @returns Computed score ranges for the cipher and text description
      */
    public genScoreRangeAndText(): suggestedData {
        const qdata = this.analyzeQuote(this.state.cipherString)
        let suggested = 0
        let max = 0
        let min = 0
        let range = 0
        let text = ''
        if (this.state.operation === 'words') {
            const hints = this.countCribHints();
            suggested = 20 + Math.round((qdata.len * 6) + ((13 - hints) * 3))
            range = 20
        } else {
            let aSet = this.buildset(this.state.texta)
            let bSet = this.buildset(this.state.textb)
            if (this.state.operation === 'sequence') {
                suggested = Math.round((qdata.len * 5.8))
                range = 20
                if (aSet.length !== bSet.length || aSet.length % 5 !== 0) {
                    range += 20
                    suggested += 30;
                }
            } else {
                suggested = Math.round((qdata.len * 5.8) + (aSet.length + bSet.length) * 2)
                range = (aSet.length + bSet.length) * 10
            }
            if (this.state.linewidth % 5 !== 0) {
                suggested += 25;
                range += 10;
            }
        }
        min = suggested - range
        max = suggested + range
        suggested += Math.round(range * Math.random() - (range / 2))

        let rangetext = ''
        if (max > min) {
            rangetext = ` (From a range of ${min} to ${max})`
        }
        if (qdata.len > 2) {
            text += `<p>There are ${qdata.len} characters in the quote.
             We suggest you try a score of ${suggested}${rangetext}</p>`
        }
        if (this.state.operation !== 'words') {
            text += `<p><b>NOTE:</b><em>If the A Text/B Text Pattern is really obvious or really obscure,
            you may want to adjust the score lower or higher as appropriate.</em></p>`
        }

        return { suggested: suggested, min: min, max: max, text: text }
    }
    /**
     * Generates the sample question text for a cipher
     * @returns HTML as a string
     */
    public genSampleQuestionText(): string {
        let msg = '';
        if (this.state.operation !== 'words') {
            msg = '<p>The following symbols encode a quote' + this.genAuthor() + ' using a Baconian cipher</p>';
        } else {
            msg = '<p>The following strange headlines encode a quote' + this.genAuthor() + ' using a Baconian cipher. ';
            const plaintext = this.minimizeString(this.getEncodingString());
            const criblook = this.minimizeString(this.state.crib).toUpperCase();

            if (criblook.length > 0) {
                const cribpos = this.placeCrib();
                if (cribpos === 0) {
                    msg += "You are told that the deciphered text starts with " +
                        this.genMonoText(this.state.crib);
                } else if (cribpos === (plaintext.length - criblook.length)) {
                    msg += "You are told that the deciphered text ends with " +
                        this.genMonoText(this.state.crib);
                } else if (cribpos === 1) {
                    msg += "You are told that the deciphered text starts with a single letter followed by " +
                        this.genMonoText(this.state.crib);
                } else {
                    // Not at the begining or the end
                    let ct = this.getCipherTextForCrib(cribpos, criblook.length)
                    msg += `You are told that the cipher text ${this.genMonoText(ct)} decodes to be ${this.genMonoText(criblook)}`;
                }
            }
            msg += "</p>";
        }
        return msg;
    }
    /**
     * Locate the crib in the cipher and return the corresponding cipher text
     * characters
     * @param encoding Encoded cipher set
     * @param crib string to look for
     * @returns String containing Cipher text characters correspond to the crib
     */
    public placeCrib(): number {
        // If they haven't given us a crib, then we don't have to worry about placing it
        if (this.state.crib === undefined || this.state.crib === '') {
            return 0;
        }
        const plaintext = this.minimizeString(this.getEncodingString());
        const criblook = this.minimizeString(this.state.crib);
        // See if the crib occurs anywhere in the cipher string
        let pos = plaintext.search(criblook);
        // If not found then we are done
        if (pos < 0) {
            return undefined;
        }
        // if we find the crib, just make sure there isn't a second copy at the end
        if (pos > 0 && pos < (plaintext.length - criblook.length)) {
            if (!plaintext.substring(plaintext.length - criblook.length).localeCompare(criblook)) {
                pos = plaintext.length - criblook.length;
            }
        }
        return pos;
    }
    /**
     * Determine how many crib letters are hinted
     * @param encoded The encoded content to check
     */
    public countCribHints(): number {
        // The crib is only used for the words baconian
        if (this.state.operation !== 'words') {
            return 0;
        }

        if (this.state.crib === undefined) {
            return 0
        }

        let hintcount = 0
        // Make sure we can find the crib
        const cribpos = this.placeCrib();
        if (cribpos === undefined) {
            return 0;
        }
        // Go through and figure out what letters we have mapped with the hint
        const criblen = this.minimizeString(this.state.crib).length;
        const found: BoolMap = {}
        for (let i = cribpos; i < cribpos + criblen; i++) {
            let ciphertext = this.minimizeString(this.getEncodingString());

            for (const c of ciphertext)
                if (!found[c]) {
                    hintcount++;
                    found[c] = true
                }
        }
        return hintcount
    }
    /**
     * Check to see that the Crib can be laced in the cipher
     * @param result The place to put any error messages
     * @param encoded The encoded content to check
     */
    public checkHintCrib(result: JQuery<HTMLElement>, encoded: encodedLines): void {
        let msg = '';

        // The crib is only used for the words baconian
        if (this.state.operation === 'words') {
            // Make sure we can find the crib
            const cribpos = this.placeCrib();
            if (cribpos === undefined) {
                msg = `Unable to find a place for the Crib Text '${this.state.crib}' in the Plain Text`;
            }
            // Go through and figure out what letters we have mapped with the hint
            $(".hinted").removeClass("hinted");
            const criblen = this.minimizeString(this.state.crib).length;
            for (let i = cribpos; i < cribpos + criblen; i++) {
                //lB
                let ciphertext = this.minimizeString(encoded.cipherword[i].toUpperCase());
                for (let j = 0; j < ciphertext.length; j++) {
                    let c = ciphertext.charAt(j);
                    $("#l" + c).addClass("hinted");
                }
            }
        }
        this.setErrorMsg(msg, 'mchc');
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        // Show them what tests the question is used on
        this.genTestUsage(result);

        const radiobuttons = [
            { id: 'wrow', value: 'let4let', title: 'Letter for letter' },
            { id: 'mrow', value: 'sequence', title: 'Sequence' },
            { id: 'words', value: 'words', title: 'Words' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));
        result.append(this.createSuggestABDlg())

        this.genQuestionFields(result);
        this.genEncodeField(result);
        result.append(
            JTFLabeledInput(
                'Crib Text',
                'text',
                'crib',
                this.state.crib,
                'crib small-12 medium-12 large-12 opfield words'
            )
        );

        const ABDiv = $("<div/>", { class: "grid-x opfield words" })
        result.append(ABDiv)
        const tableDiv = $("<div/>", { class: "cell shrink" })
        ABDiv.append(tableDiv)
        // Build a table so that they can click on letters to make A or B
        const table = new JTTable({
            class: 'cell shrink tfreq',
        });
        const hrow = table.addHeaderRow();
        const brow = table.addBodyRow();
        for (const c of this.getCharset()) {
            hrow.add({
                settings: { class: 'abclick', id: 'a' + c },
                content: c,
            });
            brow.add({
                settings: { class: 'abclick', id: 'l' + c },
                content: 'A',
            });
        }
        tableDiv.append(table.generate());
        // Give them buttons to set the pattern easily
        const buttonDiv = $('<div/>', { class: "cell shrink abbuttons" })
        ABDiv.append(buttonDiv)
        buttonDiv.append(
            $('<button/>', {
                id: 'bt',
                type: 'button',
                class: 'button primary tiny rounded abset',
            }).text("Toggle"))
        for (let i = 1; i < 10; i++) {
            buttonDiv.append(
                $('<button/>', {
                    id: 'b' + i,
                    type: 'button',
                    class: 'button primary tiny rounded abset',
                }).text(String(i)))
        }
        buttonDiv.append(
            $('<button/>', {
                id: 'b13',
                type: 'button',
                class: 'button primary tiny rounded abset',
            }).text("13"))
        const div = $('<div/>', { class: 'grid-x opfield words' });
        div.append(this.genShiftButtonGroup('left'));
        for (let slot = 0; slot < 5; slot++) {
            div.append(this.genWordSelect(slot));
        }
        div.append(this.genShiftButtonGroup('right'));
        result.append(div);
        result.append(
            JTFLabeledInput(
                'A Text',
                'richtext',
                'texta',
                this.state.texta,
                'small-12 medium-6 large-6 opfield let4let sequence'
            )
        );
        result.append(
            JTFLabeledInput(
                'B Text',
                'richtext',
                'textb',
                this.state.textb,
                'small-12 medium-6 large-6 opfield let4let sequence'
            )
        );
        const ldiv = $('<div/>', { class: "grid-x grid-margin-x" })
        ldiv.append(
            JTFIncButton(
                'Line Width',
                'linewidth',
                this.state.linewidth,
                'cell shrink opfield let4let sequence'
            )
        );
        ldiv.append(JTFLabeledInput('Bitmap', 'checkbox', 'bitmap', false, 'cell shrink opfield let4let sequence'))
        ldiv.append(
            JTFIncButton(
                'Scale %',
                'zoom',
                100,
                'cell shrink opfield let4let sequence'
            )
        );
        result.append(ldiv)

        return result;
    }
    /**
     * Generates a stacked set of buttons for shifting the offset of the
     * word editing group
     * @param dir direction "left" or "right" for the button group
     */
    public genShiftButtonGroup(dir: 'left' | 'right'): JQuery<HTMLElement> {
        const result = $('<div/>', {
            class: 'cell small-1 medium-1 flex-container flex-dir-column',
        });
        const buttonConfigs = {
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
        for (const config of buttonConfigs[dir]) {
            result.append(
                $('<button/>', {
                    id: 'w' + dir + config.id,
                    type: 'button',
                    class: 'wshift flex-child-auto button small-1 medium-1 w' + dir,
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
        const result = $('<div/>', {
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
        const maxwords = this.baconianWords.length;
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
            const slotpos = this.wordpos + slot;
            if (slotpos < maxwords) {
                setDisabled('#v' + slot, false);
                setDisabled('#p' + slot, false);
                setDisabled('#sel' + slot, false);
                // Now go through and repopulate all of the elements
                const sel = $('#sel' + slot).empty();
                const punctbutton = $('#p' + slot);
                const baconian = this.baconianWords[slotpos];
                const [slotword, punctuation] = this.getSlotWord(slotpos);
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
                    for (const word of this.wordlookup[baconian]) {
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

        let punctuation = slotword.substring(slotword.length - 1);
        if (this.isValidChar(punctuation.toUpperCase())) {
            punctuation = '';
        } else {
            slotword = slotword.substring(0, slotword.length - 1);
        }
        return [slotword, punctuation];
    }
    /**
     * Determine if we have to change the font for a combining character
     * @returns Class modifier to select a font that supports combined characters
     */
    public getFontClass(): string {
        let result = ''
        if ((this.state.texta + this.state.textb).match(/[\u0300-\u036F]/) !== null) {
            result += ' combchar'
        }
        return result
    }
    /**
     * Generate the HTML to display the answer for a cipher
     * @param testType Type of test (A/B/C, etc)
     * @returns HTML Elements for the answer
     */
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const cipherString = this.getEncodingString();
        const encoded = this.makeBaconianReplacement(cipherString, this.getEncodeWidth());
        let msg = ''
        // See if we have a CRIB to compare against.
        if (this.state.crib !== "" && this.state.crib !== undefined) {
            this.checkHintCrib(result, encoded)
        } else if (this.state.operation === 'words') {
            msg = `You need to provide a crib when doing a Word Baconian Cipher`;
        }
        this.setErrorMsg(msg, 'gawc')
        // This table only appears on the full answer key
        const table = new JTTable({ class: 'bacon ansblock notiny shrink cell unstriped' + this.getFontClass() });

        for (const line of encoded.lines) {
            const rowcipher = table.addBodyRow();
            const rowbaconian = table.addBodyRow();
            const rowanswer = table.addBodyRow();
            const rowblank = table.addBodyRow();

            for (let i in line.ciphertext) {
                // Spaces need to become nonbreaking space
                if (this.state.bitmap && this.state.operation !== 'words') {
                    let elem = $(line.ciphertext[i])
                    rowcipher.add({
                        settings: { class: "b" },
                        content: elem
                    })
                } else {
                    let ct = line.ciphertext[i].replace(/ /g, '\xa0');
                    rowcipher.add({
                        settings: { class: "b" },
                        content: ct
                    });
                }
                rowbaconian.add(line.baconian[i]);
                rowanswer.add({
                    settings: { class: 'a' },
                    content: line.plaintext[i]
                });
            }
            rowblank.add('\xa0');
        }
        result.append(table.generate());
        result.append(
            $('<div/>', {
                class: 'TOANSWER',
            }).text(this.state.cipherString)
        );
        return result;
    }
    /**
     * Generate the list of replacement encodings for a given baconian word cipher
     * @param str String to encode
     * @param maxEncodeWidth Maximum line length
     */
    public makeWordReplacement(str: string, maxEncodeWidth: number): encodedLines {
        const result: encodedLines = { lines: [], baconword: [], cipherword: [], plainword: [], plainanswer: [] };
        this.buildWordMap();
        this.buildBaconianWordList(str);
        let wordline = '';
        let baconline = '';
        let plaintextline = '';
        let prefix = '';
        let msg = '';
        // Iterate through each letter and look it up in the map
        for (let i = 0; i < this.baconianWords.length; i++) {
            let baconian = this.baconianWords[i];
            const [selword, punctuation] = this.getSlotWord(i);
            let resword = selword;
            // Make sure that the alphabet actually gives us a match
            if (this.wordlookup[baconian] === undefined) {
                // There were no words matching this
                msg = `Unable to find any words for ${baconian}, please consider a different pattern.`;
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
            let plaintext = this.baconianPlain[i];//revBaconMap[baconian];
            result.plainword.push(plaintext);
            result.baconword.push(baconian);
            result.cipherword.push(resword);
            result.plainanswer.push(this.baconianPlain[i]);
            baconian = padToMatch(baconian, resword);
            if (plaintext.length === 1) {
                plaintext = padToMatch('  ' + plaintext, resword);
            } else {
                plaintext = padToMatch(' ' + plaintext, resword);
            }
            if (
                prefix === '.' ||
                wordline.length + resword.length + prefix.length > maxEncodeWidth
            ) {
                result.lines.push({
                    plaintext: (plaintextline + padToMatch('', prefix)).split(''),
                    baconian: (baconline + prefix).split(''),
                    ciphertext: (wordline + prefix).split(''),
                });
                wordline = resword;
                baconline = baconian;
                plaintextline = plaintext;
            } else {
                plaintextline += padToMatch('', prefix) + plaintext;
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
            result.lines.push({
                plaintext: plaintextline.split(''),
                baconian: (baconline + prefix.trimEnd()).split(''),
                ciphertext: (wordline + prefix.trimEnd()).split('')
            });
        }
        this.setErrorMsg(msg, 'mwrpl');
        return result;
    }

    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        const encoded = this.makeBaconianReplacement(this.getEncodingString(), this.getEncodeWidth());
        if (this.state.operation === 'words') {
            for (const line of encoded.lines) {
                result.append(
                    $('<div/>', {
                        class: 'BACON TOSOLVEQ' + this.getFontClass(),
                    }).text(line.ciphertext.join(''))
                );
            }
        } else {
            const table = new JTTable({ class: 'bacon ansblock notiny shrink cell unstriped' + this.getFontClass() });
            for (const line of encoded.lines) {
                const rowcipher = table.addBodyRow();
                const rowblank = table.addBodyRow();
                for (let i in line.ciphertext) {
                    // Spaces need to become nonbreaking space
                    if (this.state.bitmap) {
                        let elem = $(line.ciphertext[i])
                        rowcipher.add({
                            settings: { class: "b" },
                            content: elem
                        })
                    } else {
                        let ct = line.ciphertext[i].replace(/ /g, '\xa0');
                        rowcipher.add({
                            settings: { class: "b" },
                            content: ct
                        });
                    }
                }
                rowblank.add('\xa0');
            }
            result.append(table.generate())
        }
        this.setOutputZoom();
        return result;
    }
    /**
     * Generates the interactive editing for a cipher table of text
     * @param encoded Array of string arrays to output
     * @param qnum Question number that the table is for
     */
    public genInteractiveBaconianTable(encoded: encodedLines, qnum: number): JQuery<HTMLElement> {
        const qnumdisp = String(qnum + 1);
        const table = new JTTable({ class: 'ansblock cipherint baconian SOLVER' + this.getFontClass() });
        let pos = 0;
        const inputidbase = 'I' + qnumdisp + '_';
        const spcidbase = 'S' + qnumdisp + '_';
        const workidbase = 'R' + qnumdisp + '_';

        for (const splitLines of encoded.lines) {
            const cipherline = splitLines.ciphertext;
            // We need to generate a row of lines for each split up cipher text
            // The first row is the cipher text
            const rowcipher = table.addBodyRow();
            // followed by the replacement characters that they can use for trackign the baconian letters
            const rowunder = table.addBodyRow();
            // With boxes for the answers.  Note that we give them 5 boxes so they can put the answer in
            // any of them (or somewhere close to it)
            const rowanswer = table.addBodyRow();
            // With a blank row at the bottom
            const rowblank = table.addBodyRow();

            for (const c of cipherline) {
                let ct = c.replace(/ /g, '\xa0');
                // The word baconian only needs blocks under the valid characters but the
                // others get blocks under every character (since there is no restriction on
                // what the cipher characters can be)
                if (this.state.operation !== 'words' || this.isValidChar(c)) {
                    // We need to identify the cells which get the separator added/removed as a set
                    const spos = String(pos);
                    const sepclass = ' S' + spos;
                    // We have a clickable field for the separator character.  It is basically an
                    // upside down caret that is a part of the cipher text field
                    const field = $('<div/>')
                        .append($('<div/>', { class: 'ir', id: spcidbase + spos }).html('&#711;'))
                        .append(ct);
                    rowcipher.add({ settings: { class: 'q v ' + sepclass }, content: field });
                    // We have a box for them to put whetever baconian substitution in that they want
                    rowanswer.add({
                        celltype: 'td',
                        content: $('<input/>', {
                            id: inputidbase + spos,
                            class: 'awc',
                            type: 'text',
                        }),
                        settings: { class: 'e v' + sepclass },
                    });
                    // And lastly we have a spot for the answer.  Note that we actually have
                    // five spots per baconian character, but they really should only be filling in one.
                    rowunder.add({
                        celltype: 'td',
                        content: $('<input/>', {
                            id: workidbase + spos,
                            class: 'awr',
                            type: 'text',
                        }),
                        settings: { class: sepclass },
                    });
                    pos++;
                } else {
                    // Not a character to edit, so just leave a blank column for it.
                    rowcipher.add(ct);
                    rowanswer.add(ct);
                    rowunder.add(' ');
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
        const qnumdisp = String(qnum + 1);
        const result = $('<div/>', { id: 'Q' + qnumdisp });
        const encoded = this.makeBaconianReplacement(this.getEncodingString(), this.getEncodeWidth());

        result.append(this.genInteractiveBaconianTable(encoded, qnum));

        result.append($('<textarea/>', { id: 'in' + String(qnum + 1), class: 'intnote' }));
        return result;
    }
    /**
     * Generate the score of an answered cipher
     * @param answerlong - the array of characters from the interactive test.
     */
    public genScore(answerlong: string[]): IScoreInformation {
        // Get what the question layout was so we can extract the answer
        const encoded = this.makeBaconianReplacement(this.getEncodingString(), this.getEncodeWidth());

        let solution: string[] = [];
        const answer: string[] = [];

        // Figure out what the expected answer should be
        if (this.state.operation === 'words') {
            solution = encoded.plainanswer;
        } else {
            for (const splitLines of encoded.lines) {
                for (const c of splitLines.plaintext) {
                    if (this.isValidChar(c)) {
                        solution.push(c);
                    }
                }
            }
        }
        // We need to pull out what they actually answered.  Essentially
        // If they answered anything, we will include it.  But if we manage
        // to go more than 5 blank characters past where we were expecting an
        // answer then we will force in a blank for them.  It basically lets
        // them put in characters for answer together but also allows them to put the
        // answer character anywhere in the 5 blocks under the cipher character
        for (const i in answerlong) {
            if (answerlong[i] !== ' ' && answerlong[i] !== '') {
                // Figure out how many spaces we happened to have missed in the meantime
                while (answer.length < Math.trunc((Number(i) - 1) / 5)) {
                    answer.push(' ');
                }
                answer.push(answerlong[i]);
            }
        }
        // Pad the answer to match the solution length
        while (answer.length < solution.length) {
            answer.push(' ');
        }
        // And let calculateScore do all the heavy lifting
        return this.calculateScore(solution, answer, this.state.points);
    }
    /**
     * Generate the HTML to display the solution for the cipher.
     * @param testType Type of test
     */
    public genSolution(testType: ITestType): JQuery<HTMLElement> {
        const result = $('<div/>');
        if (this.state.operation === 'words') {
            result.append($('<h3/>').text('The letters are mapped as:'));
            const table = new JTTable({ class: 'cell shrink ansblock' + this.getFontClass() });
            let row = table.addHeaderRow();

            for (const c of this.getCharset()) {
                row.add({ settings: { class: 'v' }, content: c });
            }
            row = table.addBodyRow();
            for (const c of this.state.abMapping) {
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
     * Generates a dialog showing the choices for AB patterns
     */
    public createSuggestABDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');

        const xDiv = $('<div/>', { class: 'grid-x' })
        xDiv.append(JTFLabeledInput('ABText', "text", 'absample', "Learn", 'auto'))
        xDiv.append(JTFLabeledInput('Hard', 'checkbox', 'abhard', false, 'shrink'))
        dlgContents.append(xDiv);
        dlgContents.append($('<div/>', { class: 'callout primary', id: 'suggestabopts' }))
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'button', id: 'genbtn' }).text('Generate'))
                .append(
                    $('<a/>', { class: 'secondary button', 'data-close': '' }).text(
                        'Cancel'
                    )
                )
        );
        const suggestABDlg = JTFDialog('SuggestABDLG', 'Suggest A/B Options', dlgContents);
        return suggestABDlg;
    }
    /**
     * Generate a hard AB suggestion pattern (double characters which can be grouped either way)
     * @param str String to create pattern with
     * @param total Total number of patterns found so far
     * @returns abSuggestion structure with name of pattern and patterned word
     */
    public pickHardABSuggestion(str: string, total: number): abSuggestion {
        const equiv4 = fourWayEquiv.length  // 4 possibilites in a set  [0,1] [2,3] [0,2] [1,3]    // [0,1]/[2,3]  [0,2]/[1,3]
        const equiv2 = pairEquiv.length   // 2 possibilities in a set
        const choices4 = [[0, 1, 2, 3], [0, 2, 1, 3]]
        const choices2of4 = [[0, 1], [2, 3], [0, 2], [1, 3]]
        let a1 = 'PLAIN'
        let b1 = 'PLAIN'
        let a2 = 'PLAIN'
        let b2 = 'PLAIN'

        let oddtext = ''
        let eventext = ''

        // Split the characters out into sets so we know what the sets are limited by
        for (let i = 0; i < str.length; i++) {
            if (i % 2 === 0) {
                oddtext += str.charAt(i)
            } else {
                eventext += str.charAt(i)
            }
        }
        // TODO: Figure out how to get a Line Pattern
        // 1 line pattern
        //  ┌┬┐└┴┘├┼┤╓╥╖╙╨╜╟╫╢─
        //  ╒╤╕╘╧╛╞╪╡╔╦╗╚╩╝╠╬╣═
        //  ┌┬┬┬┐  └┴┴┴┘  ├┼┼┼┤      ├┼┤╓╥╖╙╨╜╟╫╢─
        if ((total % 2) === 0) {
            // For a 4 way pattern, we have the pick of double paired letters.
            // For example À A̖ Á A̗  (Acute, Grave above and below)
            // We will create a string with the pattern as
            //    a1 a2 a1 a2 a1 
            //    b1 b2 b1 b2 b1
            const fourWaySlot = Math.floor(Math.random() * equiv4)
            const slotPick = Math.floor(Math.random() * choices4.length)
            const picks = choices4[slotPick]
            a1 = fourWayEquiv[fourWaySlot][picks[0]]
            a2 = fourWayEquiv[fourWaySlot][picks[1]]
            b1 = fourWayEquiv[fourWaySlot][picks[2]]
            b2 = fourWayEquiv[fourWaySlot][picks[3]]
        } else {
            // For a two way (half) pattern we will create strings alternating with unadorned charcters
            //   a  a1 a  a1
            //   b2 b  b2 b
            let twoWaySlot = Math.floor(Math.random() * (equiv2 + (equiv4 * choices2of4.length)))
            if (twoWaySlot < equiv2) {
                a1 = pairEquiv[twoWaySlot][0]
                b2 = pairEquiv[twoWaySlot][0]
            } else {
                const slotBasis = (twoWaySlot - equiv2) / choices2of4.length
                twoWaySlot = Math.floor(slotBasis)
                let slotPick = Math.floor((slotBasis - twoWaySlot) * choices2of4.length)
                a1 = fourWayEquiv[twoWaySlot][choices2of4[slotPick][0]]
                b2 = fourWayEquiv[twoWaySlot][choices2of4[slotPick][1]]
            }

        }
        // Make sure that the strings are renderable with the choice
        if (!validEquivSet(oddtext, alphaEquiv[a1]) || !validEquivSet(eventext, alphaEquiv[a2]) ||
            !validEquivSet(oddtext, alphaEquiv[b1]) || !validEquivSet(eventext, alphaEquiv[b2])) { return undefined; }
        // Package up the result
        const result = {
            s1: genDualEquivString(str, alphaEquiv[a1], alphaEquiv[a2]),
            s2: genDualEquivString(str, alphaEquiv[b1], alphaEquiv[b2]),
            s1name: a1 + '+' + a2,
            s2name: b1 + '+' + b2
        }
        return result
    }
    /**
     * Generate an easier AB suggestion pattern (single annotation which is all or nothing)
     * @param str String to create pattern with
     * @param total Total number of patterns found so far
     * @returns abSuggestion structure with name of pattern and patterned word
     */
    public pickBasicABSuggestion(str: string, total: number): abSuggestion {
        // The first that we generate will be of a known variety
        const predefinedSets: alphaEquivType[][] = [
            ['plain', 'above'],
            ['plain', 'below'],
            ['above', 'below'],
        ]
        // Determine the type we are 
        let [type1, type2] = [undefined, undefined]
        if (total < predefinedSets.length) {
            [type1, type2] = predefinedSets[total]
        }
        // Pick one of the types we ask for
        let pickedSets = pickRandomEquivSets(str, type1, type2)
        // If we couldn't find anything then let them know
        if (pickedSets.length < 2) {
            if (total < predefinedSets.length) {
                return this.pickBasicABSuggestion(str, predefinedSets.length + 1)
            }
            return undefined
        }
        // Package up the result
        const result = {
            s1: genEquivString(str, pickedSets[0]),
            s1name: pickedSets[0].name,
            s2: genEquivString(str, pickedSets[1]),
            s2name: pickedSets[1].name,
        }
        return result
    }
    /**
     * Populate the dialog with a set of AB suggestions. 
     * If the Hard bit is set we will generate the harder ones
     */
    public populateABSuggestions(): void {
        // we want to pick up to 10 choices
        let str = $('#absample').val() as string
        let isHard = $('#abhard').prop('checked')
        let chosen: BoolMap = {}
        let total = 0
        let result = $('#suggestabopts')
        result.empty()

        if (str.includes('j')) {
            result.append($('<div/>')
                .append($('<b/>').text('NOTE:'))
                .append('The text includes the letter j which doesn\'t render properly with some glyphs, the choices will be limited')
                .append($('<hr/>')))
        }

        // Try up to 25 times to get 10 unique suggestions.  If for some reason
        // we can't generate 10 unique suggestions, we will skip out
        for (let i = 0; i < 25 && total < 10; i++) {
            // Get a suggestion
            let pick: abSuggestion = undefined
            if (isHard) {
                pick = this.pickHardABSuggestion(str, total)
            } else {
                pick = this.pickBasicABSuggestion(str, total)
            }
            // Make sure we got a pick
            if (pick !== undefined) {
                // See if we saw this combination before (i.e. we generated the same random numbers)
                let nameCheck = pick.s1name + '-' + pick.s2name
                if (chosen[nameCheck] !== true) {
                    // This is a new combo, so let's run with it
                    chosen[nameCheck] = true

                    let div = $('<div/>', { class: "abchoice grid-x" });
                    // Show them the choices
                    div.append($('<div/>', { class: 'cell auto achoice BACON combchar', 'data-set': pick.s1name }).text(pick.s1));
                    div.append($('<div/>', { class: 'cell auto bchoice BACON combchar', 'data-set': pick.s2name }).text(pick.s2));
                    // Get two buttons for picking them 
                    let useButtonab = $("<a/>", {
                        'data-a': pick.s1,
                        'data-b': pick.s2,
                        type: "button",
                        class: "button keyset abbuttons",
                    }).html('Use A/B');
                    let useButtonba = $("<a/>", {
                        'data-a': pick.s2,
                        'data-b': pick.s1,
                        type: "button",
                        class: "button keyset abbuttons",
                    }).html('Use B/A');
                    const buttonGroup = $("<div/>", { class: "cell shrink button-group round shrink cmds" })
                    buttonGroup.append(useButtonab)
                    buttonGroup.append(useButtonba)
                    div.append(buttonGroup)
                    result.append(div)
                    total++
                }
            }
        }
        this.attachHandlers();
    }
    /**
     * Set the A/B Values from the suggested text
     * @param elem Element clicked on to set the AB values from
     */
    public setSuggestedAB(elem: HTMLElement): void {
        const jqelem = $(elem)
        const aSet = jqelem.attr('data-a')
        const bSet = jqelem.attr('data-b')
        $('#SuggestABDLG').foundation('close')
        this.markUndo('')
        this.setTexta(aSet)
        this.setTextb(bSet)
        this.updateOutput()
    }
    /**
     * Start the dialog for suggesting the A/B values
     */
    public suggestAB(): void {
        $('#genbtn').text('Generate')
        $('#suggestabopts').empty().append($('<p/>').text(`Type a word to use as a basis and then click generate`))
        $('#SuggestABDLG').foundation('open')
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();

        $('#texta')
            .off('richchange')
            .on('richchange', (e, newtext) => {
                const texta = newtext;
                let oldtexta = this.state.texta;
                if (oldtexta === undefined) {
                    oldtexta = '';
                }
                if (texta !== oldtexta) {
                    let oldtexta2 = oldtexta;
                    if (oldtexta === '') {
                        oldtexta2 = '&nbsp;';
                    }
                    // Don't push an undo operation if all that happened was that the
                    // rich text editor put a paragraph around our text
                    if (
                        texta !== '<p>' + oldtexta + '</p>' &&
                        texta !== '<p>' + oldtexta2 + '</p>'
                    ) {
                        this.markUndo('texta');
                    }
                    if (this.setTexta(texta)) {
                        // Don't call UpdateOutput() because it will recreate the RichText Input and move the cursor
                        // Instead this.load() does all the work we need
                        this.load();
                    }
                }
            });
        $('#textb')
            .off('richchange')
            .on('richchange', (e, newtext) => {
                const textb = newtext;
                let oldtextb = this.state.textb;
                if (oldtextb === undefined) {
                    oldtextb = '';
                }
                if (textb !== oldtextb) {
                    let oldtextb2 = oldtextb;
                    if (oldtextb === '') {
                        oldtextb2 = '&nbsp;';
                    }
                    // Don't push an undo operation if all that happened was that the
                    // rich text editor put a paragraph around our text
                    if (
                        textb !== '<p>' + oldtextb + '</p>' &&
                        textb !== '<p>' + oldtextb2 + '</p>'
                    ) {
                        this.markUndo('textb');
                    }
                    if (this.setTextb(textb)) {
                        // Don't call UpdateOutput() because it will recreate the RichText Input and move the cursor
                        // Instead this.load() does all the work we need
                        this.load();
                    }
                }
            });
        $('.abclick')
            .off('click')
            .on('click', (e) => {
                const id = $(e.target).attr('id') as string;
                const c = id.charAt(1);
                this.markUndo(null);
                this.toggleAB(c);
                this.updateOutput();
            });
        $('#linewidth')
            .off('input')
            .on('input', (e) => {
                const linewidth = $(e.target).val() as number;
                this.markUndo(null);
                if (this.setLineWidth(linewidth)) {
                    this.updateOutput();
                }
            });
        $('#bitmap')
            .off('change')
            .on('change', (e) => {
                const checked = $(e.target).prop("checked");
                this.markUndo('bitmap');
                if (this.setBitmap(checked)) {
                    this.updateOutput()
                }
            });
        $('#zoom')
            .off('input')
            .on('input', (e) => {
                const zoom = $(e.target).val() as number;
                this.markUndo(null);
                if (this.setZoom(zoom)) {
                    this.updateOutput();
                }
            });
        $('.wshift')
            .off('click')
            .on('click', (e) => {
                const id = $(e.target).attr('id') as string;
                const type = id.substring(id.length - 1);
                let shift = 1;
                if (type === '3') {
                    shift = 3;
                } else if (type === 'e') {
                    shift = 999999;
                }
                if (id.charAt(1) === 'l') {
                    shift = -shift;
                }
                this.wordpos += shift;
                this.updateWordSelects();
            });
        $('.wsel')
            .off('change')
            .on('change', (e) => {
                const newword = $(e.target).val() as string;
                const slot = $(e.target).attr('data-slot');
                if (slot !== '') {
                    const wordslot = this.wordpos + Number(slot);
                    if (wordslot >= 0 && wordslot <= this.baconianWords.length) {
                        this.state.words[wordslot] = newword;
                        this.updateOutput();
                    }
                }
            });
        $('.psel')
            .off('click')
            .on('click', (e) => {
                const slot = $(e.target).attr('data-slot');
                if (slot !== '') {
                    const wordslot = this.wordpos + Number(slot);
                    // eslint-disable-next-line prefer-const
                    let [slotword, punctuation] = this.getSlotWord(wordslot);
                    let punctpos = punctuationChars.indexOf(punctuation) + 1;
                    if (punctuation === '') {
                        punctpos = 0;
                    }
                    punctuation = punctuationChars.charAt(punctpos);
                    this.state.words[wordslot] = slotword + punctuation;
                    this.updateOutput();
                }
            });
        $('.abset')
            .off('click')
            .on('click', (e) => {
                const act = $(e.target).attr('id') as string;
                this.updateABTable(act)
            })
        $('#suggestab')
            .off('click')
            .on('click', () => {
                this.suggestAB()
            })
        $('#genbtn')
            .off('click')
            .on('click', () => {
                this.populateABSuggestions()
            })
        $('.keyset')
            .off('click')
            .on('click', (e) => {
                this.setSuggestedAB(e.target)
            })
    }
}
