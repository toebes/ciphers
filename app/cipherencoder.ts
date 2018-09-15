import { cloneObject } from "./ciphercommon";
import {
    CipherHandler,
    IEncodeType,
    IState,
    menuMode,
    toolMode,
} from "./cipherhandler";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";

export interface IEncoderState extends IState {
    /** K1/K2/K3/K4 Keyword */
    keyword2?: string;
    /** K1/K2/K3/K4 Offset */
    offset?: number;
    /** K3 Shift amount */
    shift?: number;
    /** K4 Offset */
    offset2?: number;
    /** The source character map */
    alphabetSource?: string;
    /** The restination character map */
    alphabetDest?: string;
    /** Optional translation string for non-english ciphers */
    translation?: string;
}

/**
 * CipherEncoder - This class handles all of the actions associated with encoding
 * a cipher.
 */
export class CipherEncoder extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: IEncoderState = {
        cipherString: "",
        cipherType: ICipherType.Aristocrat,
        encodeType: "random",
        offset: 1,
        shift: 1,
        offset2: 1,
        keyword: "",
        keyword2: "",
        alphabetSource: "",
        alphabetDest: "",
        curlang: "en",
        replacement: {},
    };
    public state: IEncoderState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        {
            title: "Randomize",
            color: "primary",
            id: "randomize",
            disabled: true,
        },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset" },
    ];
    /**
     * Make a copy of the current state
     */
    public save(): IEncoderState {
        let result: IEncoderState = cloneObject(this.state) as IState;
        return result;
    }
    /**
     * Restore a saved state or undo state
     * @param data Previous state to restore
     */
    public restore(data: IEncoderState): void {
        this.state = cloneObject(this.defaultstate) as IState;
        this.copyState(this.state, data);
        this.setUIDefaults();
        this.updateOutput();
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setCharset(this.acalangcharset[this.state.curlang]);
        this.setSourceCharset(this.encodingcharset[this.state.curlang]);
        this.setCipherType(this.state.cipherType);
        this.setCipherString(this.state.cipherString);
        this.setEncType(this.state.encodeType);
        this.setOffset(this.state.offset);
        this.setShift(this.state.shift);
        this.setOffset2(this.state.offset2);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.question);
        this.updateQuestionsOutput();
        $("#toencode").val(this.state.cipherString);
        $("#keyword").val(this.state.keyword);
        $("#offset").val(this.state.offset);
        $("#shift").val(this.state.shift);
        $("#keyword2").val(this.state.keyword2);
        $("#offset2").val(this.state.offset2);
        if (this.state.curlang === "en") {
            $("#translated")
                .parent()
                .hide();
        } else {
            $("#translated")
                .parent()
                .show();
        }
        JTRadioButtonSet("enctype", this.state.encodeType);
        $(".lang").val(this.state.curlang);
        this.setkvalinputs();
        this.load();
    }
    public updateQuestionsOutput(): void {
        if (this.state.points === undefined) {
            this.state.points = 0;
        }
        $("#points").val(this.state.points);
        if (this.state.question === undefined) {
            this.state.question = "";
        }
        this.setRichText("qtext", this.state.question);
    }
    /**
     * Enable / Disable the HTML elements based on the alphabet selection
     */
    public setkvalinputs(): void {
        let val = this.state.encodeType;
        if (val === "random") {
            $("#randomize").removeAttr("disabled");
            $(".kval").hide();
        } else {
            $("#randomize").prop("disabled", true);
            $(".kval").show();
        }
        if (val === "k3") {
            $(".k3val").show();
        } else {
            $(".k3val").hide();
        }
        if (val === "k4") {
            $(".k4val").show();
        } else {
            $(".k4val").hide();
        }
    }
    /**
     * Sets the encoding type for the cipher
     * @param encodeType Type of encoding random/k1/k2/k3/k4
     */
    public setEncType(encodeType: IEncodeType): boolean {
        let changed = false;
        if (this.state.encodeType !== encodeType) {
            this.state.encodeType = encodeType;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Updates the translation string for the cipher
     * @param translation Cipher string to set
     */
    public setTranslation(translation: string): boolean {
        let changed = false;
        if (this.state.translation !== translation) {
            changed = true;
            this.state.translation = translation;
        }
        return changed;
    }
    /**
     * Sets the keyword (state.keyword)
     * @param keyword New keyword
     * @returns Boolean indicating if the value actually changed
     */
    public setKeyword(keyword: string): boolean {
        let changed = false;
        if (this.state.keyword !== keyword) {
            this.state.keyword = keyword;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the secondary keyword (state.keyword2)
     * @param keyword2 new Secondary keyword
     * @returns Boolean indicating if the value actually changed
     */
    public setKeyword2(keyword2: string): boolean {
        let changed = false;
        if (this.state.keyword2 !== keyword2) {
            this.state.keyword2 = keyword2;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the offset value (state.offset)
     * @param offset new offset value
     * @returns Boolean indicating if the value actually changed
     */
    public setOffset(offset: number): boolean {
        let changed = false;
        let charset = this.getCharset();
        offset = (offset + charset.length) % charset.length;
        if (this.state.offset !== offset) {
            this.state.offset = offset;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the secondary offset value (state.offset2)
     * @param offset2 new offset value
     * @returns Boolean indicating if the value actually changed
     */
    public setOffset2(offset2: number): boolean {
        let changed = false;
        let charset = this.getCharset();
        offset2 = (offset2 + charset.length) % charset.length;
        if (this.state.offset2 !== offset2) {
            this.state.offset2 = offset2;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the shift value (state.shift)
     * @param shift new shift value
     * @returns Boolean indicating if the value actually changed
     */
    public setShift(shift: number): boolean {
        let changed = false;
        let charset = this.getCharset();
        shift = (shift + charset.length) % charset.length;
        if (this.state.shift !== shift) {
            this.state.shift = shift;
            this.resetAlphabet();
            changed = true;
        }
        return changed;
    }
    /**
     * Loads a language in response to a dropdown event
     * @param lang New language string
     */
    public loadLanguage(lang: string): void {
        let changed = false;
        this.pushUndo(null);
        if (this.state.curlang !== lang) {
            changed = true;
            this.state.curlang = lang;
        }
        this.setCharset(this.acalangcharset[lang]);
        this.setSourceCharset(this.encodingcharset[lang]);
        // Call the super if we plan to match the text against a dictionary.
        // That is generally used for a solver, but we might want to do it in the
        // case that we want to analyze the complexity of the phrase
        // super.loadLanguage(lang)
        if (changed) {
            this.updateOutput();
        }
    }
    /**
     * Reset the alphabet mapping so that we generate a new one
     */
    public resetAlphabet(): void {
        this.state.alphabetSource = "";
        this.state.alphabetDest = "";
    }
    /**
     * Generate the maping from the source to the destination alphabet
     */
    public genAlphabet(): void {
        // If we already have a mapping, then we stay with it
        if (
            this.state.alphabetSource !== "" &&
            this.state.alphabetSource !== undefined &&
            this.state.alphabetDest !== "" &&
            this.state.alphabetDest !== undefined
        ) {
            this.setReplacement(
                this.state.alphabetSource,
                this.state.alphabetDest
            );
            return;
        }
        if (this.state.encodeType === "k1") {
            this.genAlphabetK1(this.state.keyword, this.state.offset);
        } else if (this.state.encodeType === "k2") {
            this.genAlphabetK2(this.state.keyword, this.state.offset);
        } else if (this.state.encodeType === "k3") {
            this.genAlphabetK3(
                this.state.keyword,
                this.state.offset,
                this.state.shift
            );
        } else if (this.state.encodeType === "k4") {
            this.genAlphabetK4(
                this.state.keyword,
                this.state.offset,
                this.state.keyword2,
                this.state.offset2
            );
        } else {
            this.genAlphabetRandom();
        }
    }
    /**
     * Compute the replacement set for the the characters on an encryption
     * Note that we actually have to reverse them because the ciphers class
     * is mostly built around decrypting
     */
    public setReplacement(cset: string, repl: string): void {
        let errors = "";
        this.state.alphabetSource = cset;
        this.state.alphabetDest = repl;
        console.log("Set Replacement cset=" + cset + " repl=" + repl);
        // Figure out what letters map to the destination letters.  Note that
        // the input chracterset alphabet may not be in the same order as the
        // actual alphabet.
        for (let i = 0, len = repl.length; i < len; i++) {
            let repc = repl.substr(i, 1);
            let orig = cset.substr(i, 1);
            // Remember that we are backwards because this an encoder
            this.setChar(orig, repc);
            // Just make sure that we don't happen to have the same character
            // at this position
            if (repc === orig) {
                errors += repc;
            }
        }
        if (errors !== "") {
            console.log(errors);
            $(".err").text("Bad keyword/offset combo for letters: " + errors);
        }
    }
    /**
     * Generate a K1 alphabet where the keyword is in the source alphabet
     * keyword Keyword/keyphrase to map
     * offset Offset from the start of the alphabet to place the keyword
     */
    public genAlphabetK1(keyword: string, offset: number): void {
        let repl = this.genKstring(keyword, offset, this.getCharset());
        this.setReplacement(this.getSourceCharset(), repl);
    }
    /**
     * Generate a K2 alphabet where the keyword is in the destination alphabet
     * keyword Keyword/Keyphrase to map
     * offset Offset from the start of the alphabet to place the keyword
     */
    public genAlphabetK2(keyword: string, offset: number): void {
        let repl = this.genKstring(keyword, offset, this.getSourceCharset());
        this.setReplacement(repl, this.getCharset());
    }
    /**
     * Generate a K3 alphabet where both alphabets are the same using a Keyword
     * like a K1 or K2 alphabet, but both are the same alphabet order.
     * It is important to note that for a K3 alphabet you must have the same
     * alphabet for source and destination.  This means languages like Swedish
     * and Norwegian can not use a K3
     * keyword Keyword/Keyphrase to map
     * offset Offset from the start of the alphabet to place the keyword
     * shift Shift of the destination alphabet from the source alphabet
     */
    public genAlphabetK3(keyword: string, offset: number, shift: number): void {
        if (this.getCharset() !== this.getSourceCharset()) {
            let error = "Source and encoding character sets must be the same";
            console.log(error);
            $(".err").text(error);
            return;
        }
        let repl = this.genKstring(keyword, offset, this.getCharset());
        let cset = repl.substr(shift) + repl.substr(0, shift);
        this.setReplacement(cset, repl);
    }
    /**
     * Generate a K4 alphabet where the keywords are different in each alphabet
     * keyword Keyword for the source alphabet
     * offset Offset for keyword in the source alphabet
     * keyword2 Keyword for the destination alphabet
     * offset2 Offset for the keyword in the destination alphabet
     */
    public genAlphabetK4(
        keyword: string,
        offset: number,
        keyword2: string,
        offset2: number
    ): void {
        if (this.getCharset().length !== this.getSourceCharset().length) {
            let error =
                "Source and encoding character sets must be the same length";
            console.log(error);
            $(".err").text(error);
            return;
        }
        let cset = this.genKstring(keyword, offset, this.getCharset());
        let repl = this.genKstring(keyword2, offset2, this.getSourceCharset());
        this.setReplacement(cset, repl);
    }
    /**
     * Map a keyword into an alphabet
     * keyword Keyword to map into the alphabet
     * offset Offset from the start of the alphabet to place the keyword
     */
    public genKstring(
        keyword: string,
        offset: number,
        alphabet: string
    ): string {
        let unasigned = alphabet;
        let repl = "";

        // Go through each character in the source string one at a time
        // and see if it is a legal character.  if we have not already seen
        // it, then remove it from the list of legal characters and add it
        // to the output string
        for (let i = 0, len = keyword.length; i < len; i++) {
            let c = keyword.substr(i, 1).toUpperCase();
            // Is it one of the characters we haven't used?
            let pos = unasigned.indexOf(c);
            if (pos >= 0) {
                // we hadn't used it, so save it away and remove it from
                // the list of ones we haven't used
                repl += c;
                unasigned =
                    unasigned.substr(0, pos) + unasigned.substr(pos + 1);
            }
        }
        repl =
            unasigned.substr(unasigned.length - offset) +
            repl +
            unasigned.substr(0, unasigned.length - offset);
        return repl;
    }
    /**
     * Gets a random replacement character from the remaining set of unassigned
     * characters
     */
    public getRepl(): string {
        let sel = Math.floor(Math.random() * this.unasigned.length);
        let res = this.unasigned.substr(sel, 1);
        this.unasigned =
            this.unasigned.substr(0, sel) + this.unasigned.substr(sel + 1);
        return res;
    }
    /**
     *  Generates a random replacement set of characters
     */
    public genAlphabetRandom(): void {
        let charset = this.getCharset();
        this.unasigned = charset;
        let replacement = "";
        let pos = 0;

        while (this.unasigned.length > 1) {
            let orig = charset.substr(pos, 1);
            let repl = this.getRepl();
            // If the replacement character is the same as the original
            // then we just get another one and put the replacement back at the end
            // This is guaranteed to be unique
            if (orig === repl) {
                let newrepl = this.getRepl();
                this.unasigned += repl;
                repl = newrepl;
            }
            replacement += repl;
            pos++;
        }

        // Now we have to handle the special case of the last character
        if (charset.substr(pos, 1) === this.unasigned) {
            // Just pick a random spot in what we have already done and
            // swap it.  We are guaranteed that it won't be the last character
            // since it matches already
            let sel = Math.floor(Math.random() * replacement.length);
            replacement =
                replacement.substr(0, sel) +
                this.unasigned +
                replacement.substr(sel + 1) +
                replacement.substr(sel, 1);
        } else {
            replacement += this.unasigned;
        }
        this.setReplacement(this.getSourceCharset(), replacement);
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $("<div/>");
        this.genAlphabet();
        let strings = this.makeReplacement(
            this.getEncodingString(),
            this.maxEncodeWidth
        );
        let tosolve = 0;
        let toanswer = 1;
        if (this.state.operation === "encode") {
            tosolve = 1;
            toanswer = 0;
        }
        for (let strset of strings) {
            result.append(
                $("<div/>", {
                    class: "TOSOLVE",
                }).text(strset[tosolve])
            );
            result.append(
                $("<div/>", {
                    class: "TOANSWER",
                }).text(strset[toanswer])
            );
        }
        if (this.state.cipherType === ICipherType.Patristocrat) {
            result.append(
                $("<div/>", {
                    class: "origtext",
                }).text(this.state.cipherString)
            );
        }
        result.append(this.genFreqTable(true, this.state.encodeType));
        // If this is a xenocrypt and they provided us a translation, display it
        if (
            this.state.curlang !== "en" &&
            this.state.translation !== undefined &&
            this.state.translation !== ""
        ) {
            result.append(
                $("<div/>")
                    .text("Translation: ")
                    .append($("<em/>").text(this.state.translation))
            );
        }
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $("<div/>");
        this.genAlphabet();
        let strings = this.makeReplacement(
            this.getEncodingString(),
            this.maxEncodeWidth
        );
        for (let strset of strings) {
            result.append(
                $("<div/>", {
                    class: "TOSOLVEQ",
                }).text(strset[0])
            );
        }
        result.append(this.genFreqTable(false, this.state.encodeType));
        return result;
    }
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.  This returns the result
     * as the HTML to be displayed
     */
    public build(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(
            $("<div/>", {
                class: "callout small success",
            })
                .text("Note: Plain Text is on ")
                .append(
                    $("<span/>", {
                        class: "TOSOLVE",
                    }).text("top line")
                )
                .append(", Cipher Text is ")
                .append(
                    $("<span/>", {
                        class: "TOANSWER",
                    }).text("highlighted")
                )
        );
        result.append(this.genAnswer());
        return result;
    }
    public getEncodingString(): string {
        let str = this.cleanString(this.state.cipherString.toUpperCase());
        /*
         * If it is characteristic of the cipher type (e.g. patristocrat),
         * rebuild the string to be encoded in to five character sized chunks.
         */
        if (this.state.cipherType === ICipherType.Patristocrat) {
            str = this.chunk(str, 5);
        }
        return str;
    }

    /**
     * Generates the HTML code for allowing an encoder to select the alphabet type
     * along with specifying the parameters for that alphabet
     */
    public createAlphabetType(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "grid-x" });

        let radiobuttons = [
            { id: "encrand", value: "random", title: "Random" },
            { id: "enck1", value: "k1", title: "K1" },
            { id: "enck2", value: "k2", title: "K2" },
            { id: "enck3", value: "k3", title: "K3" },
            { id: "enck4", value: "k4", title: "K4" },
        ];
        result.append(
            $("<div/>", {
                class: "cell",
            }).text("Alphabet Type")
        );
        result.append(
            JTRadioButton(12, "enctype", radiobuttons, this.state.encodeType)
        );

        result.append(
            JTFLabeledInput(
                "Keyword",
                "text",
                "keyword",
                this.state.keyword,
                "kval"
            )
        );
        result.append(
            JTFIncButton(
                "Offset",
                "offset",
                this.state.offset,
                "kval small-12 medium-6 large-6"
            )
        );
        result.append(
            JTFIncButton(
                "Shift",
                "shift",
                this.state.shift,
                "k3val small-12 medium-6 large-6"
            )
        );
        result.append(
            JTFLabeledInput(
                "Keyword 2",
                "text",
                "keyword2",
                this.state.keyword2,
                "k4val"
            )
        );
        result.append(
            JTFIncButton(
                "Offset 2",
                "offset2",
                this.state.offset2,
                "k4val small-12 medium-6 large-4"
            )
        );
        return result;
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        // this.hideRevReplace = true
        let encoded = this.cleanString(this.state.cipherString);
        $(".err").text("");
        this.genAlphabet();
        let res = this.build();
        $("#answer")
            .empty()
            .append(res);

        /* testStrings */
        for (let teststr of this.testStrings) {
            let chi1 = this.CalculateChiSquare(teststr);
            teststr = this.cleanString(teststr);
            let l = teststr.length;
            console.log(l + "`" + chi1 + "`" + teststr);
        }

        let chi = this.CalculateChiSquare(encoded);

        let chitext = "";
        if (!isNaN(chi)) {
            chitext = "Chi-Square Value=" + chi.toFixed();
            if (chi < 20) {
                chitext += " [Easy]";
            } else if (chi < 30) {
                chitext += " [Medium]";
            } else if (chi < 40) {
                chitext += " [Medium Hard]";
            } else if (chi < 50) {
                chitext += " [Difficult]";
            } else {
                chitext += " [Extremely Difficult]";
            }
            chitext += " Length=" + encoded.length;
            if (encoded.length < 60) {
                chitext += " [Too Short]";
            } else if (encoded.length < 80) {
                chitext += " [Short]";
            } else if (encoded.length > 120) {
                chitext += " [Too Long]";
            } else if (encoded.length > 100) {
                chitext += " [Long]";
            }
        }

        $("#chi").text(chitext);
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }

    public makeFreqEditField(c: string): JQuery<HTMLElement> {
        let einput = $("<span/>", {
            type: "text",
            "data-char": c,
            id: "m" + c,
        });
        return einput;
    }
    public genQuestionFields(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(
            JTFLabeledInput(
                "Points",
                "number",
                "points",
                this.state.points,
                "small-12 medium-12 large-12"
            )
        );
        result.append(
            JTFLabeledInput(
                "Question Text",
                "richtext",
                "qtext",
                this.state.question,
                "small-12 medium-12 large-12"
            )
        );
        return result.children();
    }
    /**
     * Generate HTML for any UI elements that go above the command bar
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(this.genTestUsage());
        result.append(this.genQuestionFields());
        result.append(this.getLangDropdown());
        result.append(
            JTFLabeledInput(
                "Plain Text",
                "textarea",
                "toencode",
                this.state.cipherString,
                "small-12 medium-12 large-12"
            )
        );
        result.append(
            JTFLabeledInput(
                "Translation",
                "textarea",
                "translated",
                this.state.translation,
                "small-12 medium-12 large-12"
            )
        );
        result.append(this.createAlphabetType());
        return result;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('[name="enctype"]')
            .off("click")
            .on("click", e => {
                $(e.target)
                    .siblings()
                    .removeClass("is-active");
                $(e.target).addClass("is-active");
                this.markUndo(null);
                if (this.setEncType($(e.target).val() as IEncodeType)) {
                    this.updateOutput();
                }
            });
        $("#offset")
            .off("input")
            .on("input", e => {
                let offset = Number($(e.target).val());
                if (offset !== this.state.offset) {
                    this.markUndo(null);
                    if (this.setOffset(offset)) {
                        this.updateOutput();
                    }
                }
            });
        $("#shift")
            .off("input")
            .on("input", e => {
                let shift = Number($(e.target).val());
                if (shift !== this.state.shift) {
                    this.markUndo(null);
                    if (this.setShift(shift)) {
                        this.updateOutput();
                    }
                }
            });
        $("#offset2")
            .off("input")
            .on("input", e => {
                let offset2 = Number($(e.target).val());
                if (offset2 !== this.state.offset2) {
                    this.markUndo(null);
                    if (this.setOffset2(offset2)) {
                        this.updateOutput();
                    }
                }
            });
        $("#keyword")
            .off("input")
            .on("input", e => {
                let keyword = $(e.target).val() as string;
                if (keyword !== this.state.keyword) {
                    this.markUndo("keyword");
                    if (this.setKeyword(keyword)) {
                        this.updateOutput();
                    }
                }
            });
        $("#keyword2")
            .off("input")
            .on("input", e => {
                let keyword2 = $(e.target).val() as string;
                if (keyword2 !== this.state.keyword2) {
                    this.markUndo("keyword2");
                    if (this.setKeyword2(keyword2)) {
                        this.updateOutput();
                    }
                }
            });
        $("#toencode")
            .off("input")
            .on("input", e => {
                let cipherString = $(e.target).val() as string;
                if (cipherString !== this.state.cipherString) {
                    this.markUndo("cipherString");
                    if (this.setCipherString(cipherString)) {
                        this.updateOutput();
                    }
                }
            });
        $("#points")
            .off("input")
            .on("input", e => {
                let points = Number($(e.target).val());
                if (points !== this.state.points) {
                    this.markUndo("points");
                    this.state.points = points;
                }
            });
        $("#qtext")
            .off("richchange")
            .on("richchange", (e, newtext) => {
                let question = newtext;
                if (question !== this.state.question) {
                    // Don't push an undo operation if all that happend was that the
                    // rich text editor put a paragraph around our text
                    if (question !== "<p>" + this.state.question + "</p>") {
                        this.markUndo("question");
                    }
                    this.state.question = question;
                }
            });
        $("#translated")
            .off("input")
            .on("input", e => {
                let translation = $(e.target).val() as string;
                if (translation !== this.state.translation) {
                    this.markUndo("translation");
                    if (this.setTranslation(translation)) {
                        this.updateOutput();
                    }
                }
            });
        $("#randomize")
            .off("click")
            .on("click", () => {
                this.markUndo(null);
                this.resetAlphabet();
                this.updateOutput();
            });
    }
}
