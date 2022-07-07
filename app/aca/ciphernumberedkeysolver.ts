import { cloneObject, setCharAt, StringMap } from "../common/ciphercommon";
import { IState, menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTFLabeledInput } from "../common/jtflabeledinput";
import { JTRadioButtonSet } from "../common/jtradiobutton";
import { JTTable } from "../common/jttable";
import { CipherSolver } from "./ciphersolver";

interface INumberedKeyState extends IState {
    /** Number of digits for the prime number in the RSA key */
    plainText: string;
    maxkey: number;
}

export class CipherNumberedKeySolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    /** Converted value of the cipher string */
    public KeyPhraseVals: number[] = [];
    public defaultstate: INumberedKeyState = {
        cipherType: ICipherType.KeyPhrase,
        replacement: {},
        cipherString: "",
        findString: "",
        plainText: "",
        maxkey: 0
    };
    public state: INumberedKeyState = cloneObject(
        this.defaultstate
    ) as INumberedKeyState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset" },
    ];
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setPlainText(this.state.plainText);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.aca);
        JTRadioButtonSet("ciphertype", this.state.cipherType);
        $("#encoded").val(this.state.cipherString);
        $("#find").val(this.state.findString);
        this.showQuestion();
        this.load();
        this.findPossible(this.state.findString);
    }
    /**
     * Resetting any solving matches made
     */
    public reset(): void {
        this.init(this.state.curlang);
        this.state.locked = {};
        super.reset();
    }
    /**
     * Set the plain text decisions for the cipher
     * @param plainText New value for the plain text
     */
    public setPlainText(plainText: string): boolean {
        let changed = false;
        let str = this.cleanString(this.state.cipherString);
        let newPlain =
            plainText + this.repeatStr(" ", str.length - plainText.length);
        if (newPlain !== this.state.plainText) {
            changed = true;
            this.state.plainText = newPlain;
        }
        return changed;
    }
    /**
     * Update all of the match dropdowns in response to a change in the cipher mapping
     * For the KeyPhrase we also update the list of possible plain text matches
     * @param reqstr String to optimize updates for (mostly ignored)
     */
    public updateMatchDropdowns(reqstr: string): void {
        super.updateMatchDropdowns(reqstr);
        let choices: StringMap = {};
        // Remember the longest (tallest) list of matches
        let maxlen = 0;
        // Figure out all the possibilities
        for (let c in this.state.replacement) {
            let t = this.state.replacement[c];
            if (choices[t] === undefined) {
                choices[t] = c;
            } else {
                choices[t] += "<br/>" + c;
            }
            if (choices[t].length > maxlen) {
                maxlen = choices[t].length;
            }
        }
        // If we had no matches, just clear them all out quickly
        if (maxlen === 0) {
            $("div[data-mchar]").html("");
        } else {
            // For each match we need to figure out how many entries we have
            // to pad it with.
            maxlen = Math.ceil(maxlen / "<br/> ".length);
            for (let c of this.getCharset()) {
                let newdata = choices[c];
                if (newdata === undefined) {
                    newdata = " ";
                }
                let len = Math.ceil(newdata.length / "<br/> ".length);
                let extra = this.repeatStr("<br/>&nbsp;", maxlen - len);

                $("div[data-mchar=" + c + "]").html(newdata + extra);
            }
        }
    }
    /**
     * Change the replacement character.  Note that this is for the reverse
     * replacement character and not the cipher string
     * @param repchar Character that is being replaced
     * @param newchar Character to replace it with
     */
    public setReplacementChar(repchar: string, newchar: string): void {
        this.state.replacement[newchar] = repchar;
        $("input[data-rchar='" + newchar + "']").val(repchar);
        if (!this.holdupdates) {
            this.updateMatchDropdowns(repchar);
        }
    }
    public setPlainTextPart(key: string, pos: number): boolean {
        let changed = false;
        let prevkey = this.state.plainText.substr(pos, key.length);
        if (prevkey !== key) {
            changed = true;
            let str = this.cleanString(this.state.cipherString).toUpperCase();
            this.holdupdates = true;
            for (let i = 0; i < key.length; i++) {
                let ct = str.substr(pos + i, 1);
                let pt = key.substring(i, i + 1);
                this.setReplacementChar(ct, pt);
            }
            this.setPlainText(this.state.plainText);
            this.setPlainText(
                this.state.plainText.substr(0, pos) +
                key +
                this.state.plainText.substr(pos + key.length)
            );
            this.holdupdates = false;
            this.updateMatchDropdowns("");
        }
        return changed;
    }
    /**
     * Change the encrypted character.  Note that when we change one, we have
     * to swap it with the one which we are replacing
     * @param repchar Character that is being replaced
     * @param newchar Character to replace it with
     * @param elem Optional HTML Element triggering the request
     */
    public setChar(
        repchar: string,
        newchar: string,
        elem?: JQuery<HTMLElement>
    ): void {
        if (elem !== undefined) {
            let id = elem.attr("id");
            if (id !== undefined && id !== "") {
                let type = id.substr(0, 2);
                if (type === "ti") {
                    let pos = Number(id.substr(2));
                    let c = (newchar + " ").substr(0, 1);
                    this.setPlainText(setCharAt(this.state.plainText, pos, c));
                    // Remember that we are backwards with keyPhrase
                    this.setReplacementChar(repchar, newchar);
                } else {
                    this.setReplacementChar(newchar, repchar);
                }
                this.updateOutput();
            }
        }
    }
    /**
     * Add any solution text to the problem
     */
    public saveSolution(): void {
        let keyphrase = "";
        this.state.solved = true;
        for (let c of this.getCharset()) {
            let t = this.state.replacement[c];
            if (t === undefined || t === "" || t === " ") {
                t = "?";
                this.state.solved = false;
            }
            keyphrase += t;
        }
        let solution = "";
        let str = this.cleanString(this.state.cipherString).toUpperCase();
        for (let i = 0, len = str.length; i < len; i++) {
            let p = str.substring(i, i + 1);
            let c = this.state.plainText.substring(i, i + 1);
            if (this.isValidChar(p)) {
                if (c === " ") {
                    c = "?";
                    this.state.solved = false;
                }
            }
            solution += c;
        }
        this.state.solution = keyphrase + ". " + solution;
    }
    public getNumeredKeyValues(): number[] {
        const result: number[] = [];
        this.freq = {}
        this.state.maxkey = 0
        let str = this.cleanString(this.state.cipherString);
        let keyvals = str.split(/\s/g)
        for (const val of keyvals) {
            let parsed = parseInt(val, 10);
            if (isNaN(parsed)) {
                console.log(`Unable to parse ${val}`)
                parsed = 0
            } else {
                if (isNaN(this.freq[parsed])) {
                    this.freq[parsed] = 0;
                }
                this.freq[parsed]++;
            }
            if (parsed > this.state.maxkey) {
                this.state.maxkey = parsed;
            }

            result.push(parsed)
        }


        // We want to fudge the end value a little to account for the alphabet.
        this.state.maxkey += Math.ceil(Math.pow(this.state.maxkey, -0.614) * 96.137)
        return result
    }
    /**
     * Build the solving GUI
     * We want to have four rows of
     */
    public build(): JQuery<HTMLElement> {
        let vals = this.getNumeredKeyValues()
        let result = $("<div/>", { class: "clearfix" });
        let datachars = "";
        let table;
        let row;
        let width = 60
        let rows = Math.trunc(vals.length / width);
        let remain = vals.length % width;
        let sdiv = undefined
        if (remain < 5) {
            width += Math.ceil(remain / rows)
        }

        for (let i = 0, len = vals.length; i < len; i++) {
            let t = vals[i]
            let pt = this.state.plainText.substring(i, i + 1).toUpperCase();
            if (table === undefined) {
                table = new JTTable({ class: "twordn" });
                row = table.addBodyRow();
            }
            datachars += t;
            let content = $("<div/>");
            content.append($("<div>", { class: "xx", "data-mchar": t }));
            content.append(
                $("<input/>", {
                    type: "text",
                    id: "ti" + i,
                    class: "sli",
                    "data-char": t,
                    val: pt,
                })
            );
            content.append($("<div/>", { class: "slil" }).text(t));
            row.add(content);
            // See if we need to output a new table. 
            if (i % width == (width - 1)) {
                if (sdiv === undefined) {
                    sdiv = $("<div/>", { class: "sword" })
                    result.append(sdiv);
                }
                sdiv.append(table.generate());
                table = undefined
            }
        }
        if (table !== undefined) {
            if (sdiv === undefined) {
                sdiv = $("<div/>", { class: "sword" })
                result.append(sdiv);
            }
            sdiv.append(table.generate())
            // .append(
            //     $("<div/>", {
            //         class: "repl",
            //         "data-chars": datachars,
            //     })
            // );
        }
        return result;
    }
    /**
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        let inputbox = $("<div/>", {
            class: "grid-x grid-margin-x",
        });

        inputbox.append(
            JTFLabeledInput(
                "Keyword",
                "text",
                "keyword",
                this.state.keyword,
                "cell small-12 medium-6 large-6"
            )
        );
        inputbox.append(
            JTFLabeledInput(
                "Find Spot For",
                "text",
                "find",
                this.state.findString,
                "cell small-12 medium-6 large-6"
            )
        );
        result.append(inputbox);
        result.append(
            $("<div/>", {
                class: "grid-x grid-margin-x",
            })
                .append(
                    $("<div/>", {
                        class:
                            "sanalysis cell medium-order-2 large-order-1 medium-12 large-3",
                        id: "analysis",
                    })
                )
                .append(
                    $("<div/>", {
                        class:
                            "findres cell medium-order-1 large-order-2 medium-12 large-9",
                        id: "findres",
                    })
                )
        );
        return result;
    }
    /**
     * Create an edit field for a dropdown
     * @param c Character to make the dropdown for
     */
    public makeFreqEditField(c: string): JQuery<HTMLElement> {
        let einput = $("<input/>", {
            type: "text",
            class: "sli",
            "data-char": c,
            "data-rchar": c,
            id: "rm" + c,
            value: this.state.replacement[c],
        });
        return einput;
    }
    /**
     * Creates an HTML table to display the frequency of characters
     * The table should be of the form
     *    KeyPhrase
     *    Alphabet
     *    Frequency
     */
    public createFreqEditTable(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "clearfix" });
        let table = new JTTable({ class: "tfreq" });

        let keyrow = table.addBodyRow();
        let alpharow = table.addBodyRow();
        let freqrow = table.addBodyRow();

        keyrow.add({ celltype: "th", content: "Key Phrase" });
        alpharow.add({ celltype: "th", content: "Key" });
        freqrow.add({ celltype: "th", content: "Frequency" });

        console.log(`createFreqEditTable: maxkey=${this.state.maxkey}`)
        for (let c = 0; c < this.state.maxkey; c++) {
            alpharow.add(String(c));
            freqrow.add({
                settings: { id: "f" + c },
                content: "",
            });
            keyrow.add(this.makeFreqEditField(String(c)));
        }
        result.append(table.generate());
        return result;
    }
    /**
     * This looks for a KeyPhrase encoded string in the input pattern.  It relies on:
     *   this.cipherWidth to be the width of each encoded character
     * @param str String to search for
     */
    public findPossible(str: string): void {
        this.state.findString = str;
        if (str === "") {
            $(".findres").empty();
            return;
        }
        str = str.toUpperCase();
        let cipher =
            " " + this.cleanString(this.state.cipherString.toUpperCase()) + " ";
        let table;
        for (let pos = 0; pos < cipher.length - str.length; pos++) {
            let matched = true;
            let replacement = cloneObject(this.state.replacement);
            for (let i = 0; i < str.length; i++) {
                let ct = cipher.substr(pos + i, 1);
                let pt = str.substring(i, i + 1);
                if (!this.isValidChar(pt)) {
                    if (pt !== ct) {
                        matched = false;
                        break;
                    }
                } else if (
                    !this.isValidChar(ct) ||
                    (replacement[pt] !== undefined && replacement[pt] !== ct)
                ) {
                    matched = false;
                    break;
                }
                replacement[pt] = ct;
            }
            if (matched) {
                let charset = this.getSourceCharset();
                if (table === undefined) {
                    table = new JTTable({ class: "mfind cell shrink" });
                    let headrow = table.addHeaderRow();
                    headrow.add("Pos").add("Match");
                    for (let c of charset) {
                        headrow.add(c);
                    }
                }
                let row = table.addBodyRow();
                let matchstr = cipher.substr(pos, str.length);
                row.add(String(pos)).add(
                    $("<a/>", {
                        class: "vkey",
                        href: "#",
                        "data-pos": pos - 1, // Remember the added space at the start
                        "data-key": str,
                    }).text(matchstr)
                );
                for (let c of charset) {
                    if (replacement[c] !== undefined) {
                        row.add(replacement[c]);
                    } else {
                        row.add("?");
                    }
                }
            }
        }
        let lookfor: JQuery<HTMLElement>;
        if (table === undefined) {
            lookfor = $("<div/>", { class: "callout warning" }).text(
                "Unable to find " + str + " as " + this.normalizeHTML(str)
            );
        } else {
            lookfor = $("<div/>", { class: "callout success" }).text(
                "Searching for " + str + " as " + this.normalizeHTML(str)
            );
            lookfor.append(table.generate());
        }

        $(".findres")
            .empty()
            .append(lookfor);
        this.attachHandlers();
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    public load(): void {
        let encoded = this.cleanString(this.state.cipherString);
        if (encoded !== this.lastencoded) {
            this.lastencoded = encoded;
            let res = this.build();
            $("#answer")
                .empty()
                .append(res);
            this.UpdateFreqEditTable();
        } else {
            for (let i = 0; i < this.state.plainText.length; i++) {
                let c = this.state.plainText.substring(i, i + 1);
                if (c === " ") {
                    c = "";
                }
                $("#ti" + i).val(c);
            }
        }
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    public genAnalysis(encoded: string): JQuery<HTMLElement> {
        return null;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $("a.vkey")
            .off("click")
            .on("click", e => {
                let key = $(e.target).attr("data-key");
                let pos = Number($(e.target).attr("data-pos"));
                this.markUndo(null);
                if (this.setPlainTextPart(key, pos)) {
                    this.updateOutput();
                }
            });
    }
}
