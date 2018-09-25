import { cloneObject, NumberMap, setCharAt } from "./ciphercommon";
import { IState, toolMode } from "./cipherhandler";
import { CipherSolver } from "./ciphersolver";
import { CipherTypeButtonItem, ICipherType } from "./ciphertypes";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";
import { Mapper } from "./mapper";
import { mapperFactory } from "./mapperfactory";
/**
 * Solver for the Vigenere class of ciphers:
 *    Vibenere, Variant, Beaufort, Gronsfeld and Porta
 */
export class CipherVigenereSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    public defaultstate: IState = {
        /** The current cipher type we are working on */
        cipherType: ICipherType.Vigenere /** Currently selected keyword */,
        keyword: "" /** The current cipher we are working on */,
        cipherString: "" /** The current string we are looking for */,
        findString: "" /** Replacement characters */,
        replacement: {},
    };
    public state: IState = cloneObject(this.defaultstate) as IState;
    /** Map of indexes into which character of the string is at that index */
    public cipherOffsets: Array<number> = [];
    /** Implements the mapping for the various cipher types */
    public ciphermap: Mapper = null;
    /**
     * Save any complete solution
     */
    public saveSolution(): void {
        let solved = true;
        let solution = this.state.cipherString;
        let keyword = this.state.keyword;
        if (keyword === undefined || keyword === "") {
            return;
        }
        keyword = keyword.replace(" ", "");
        let period = keyword.length;

        // Fix up all the vslot values so that they can be mapped
        for (let i in this.cipherOffsets) {
            let vslot = Number(i) % period;
            let ckey = keyword.charAt(vslot);
            let pt = this.ciphermap.decode(
                this.state.cipherString.charAt(this.cipherOffsets[i]),
                ckey
            );
            solution = setCharAt(solution, this.cipherOffsets[i], pt);
            if (pt === "?") {
                solved = false;
            }
        }
        this.state.solved = solved;
        this.state.solution =
            this.state.keyword.toUpperCase() + ". " + solution;
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        this.setCipherType(this.state.cipherType);
        this.setKeyword(this.state.keyword);
        super.setUIDefaults();
    }
    /**
     * Sets up the radio button to choose the variant and creates the input area
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");

        let radiobuttons = [
            CipherTypeButtonItem(ICipherType.Vigenere),
            CipherTypeButtonItem(ICipherType.Variant),
            CipherTypeButtonItem(ICipherType.Beaufort),
            CipherTypeButtonItem(ICipherType.Gronsfeld),
            CipherTypeButtonItem(ICipherType.Porta),
        ];
        result.append(
            JTRadioButton(8, "ciphertype", radiobuttons, this.state.cipherType)
        );
        result.append(
            JTFLabeledInput(
                "Cipher Text",
                "textarea",
                "encoded",
                this.state.cipherString,
                "small-12 medium-12 large-12"
            )
        );
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
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        JTRadioButtonSet("ciphertype", this.state.cipherType);
        $("#keyword").val(this.state.keyword);
        $("#encoded").val(this.state.cipherString);
        this.showQuestion();
        // Force build to rebuild completely
        this.lastencoded = undefined;
        super.updateOutput();
    }
    /**
     * Prevent the superclass updateOutput() from hiding our keyword
     */
    public updateKeywordApply(): void {}
    /**
     * Selects which variant table is to be used for mapping
     * @param cipherType Name of code variant - one of vigenere, variant or beaufort
     */
    public setCipherType(cipherType: ICipherType): boolean {
        let changed = false;
        if (this.state.cipherType !== cipherType) {
            changed = true;
            this.state.cipherType = cipherType;
        }
        this.ciphermap = mapperFactory(cipherType);
        if (changed) {
            this.setKeyword(this.state.keyword);
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
            changed = true;
        }
        return changed;
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    public load(): void {
        // Force the entire UI to be rebuilt
        this.lastencoded = undefined;
        super.load();
        this.updateKeywordMapping();
    }
    /**
     * Fills in the frequency portion of the frequency table.  For the Vigenere
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void {}
    /**
     * Changes the keyword to map against the table.  The length of the keyword is
     * the period of the cipher (after removing any spaces of course)
     * Any non-mapping characters (. - _ etc) are used as placeholders
     * str New keyword mapping string
     */
    public updateKeywordMapping(): void {
        let str = this.state.keyword;
        if (str !== undefined && str !== "") {
            console.log("Keyword is" + str);

            str = str.replace(" ", "");
            let period = str.length;
            $("#period").text("Period = " + period);

            // Fix up all the vslot values so that they can be mapped
            for (let i in this.cipherOffsets) {
                let vslot = Number(i) % period;
                let ckey = str.charAt(vslot);
                $("[data-char='" + this.cipherOffsets[i] + "']").attr(
                    "data-vslot",
                    vslot
                );
                let pt = this.ciphermap.decode(
                    this.state.cipherString.charAt(this.cipherOffsets[i]),
                    ckey
                );
                $("span[data-char='" + this.cipherOffsets[i] + "']").text(pt);
                $("div[data-char='" + this.cipherOffsets[i] + "']").html(pt);
            }
        }
    }
    /**
     * Locate a string.
     * Note that we assume that the period has been set
     * @param str String to look for
     */
    public findPossible(str: string): void {
        this.state.findString = str;
        if (str === "") {
            $(".findres").empty();
            return;
        }
        let blankkey = this.repeatStr("-", this.state.keyword.length);
        let res = null;
        let maxcols = 5;
        let tdcount = 0;
        let table = new JTTable({ class: "found" });
        let row = table.addHeaderRow();
        for (let i = 0; i < maxcols; i++) {
            row.add("Pos").add("Key");
        }
        row = table.addBodyRow();
        str = this.minimizeString(str.toUpperCase());
        for (let i = 0; i <= this.cipherOffsets.length - str.length; i++) {
            let thiskey = blankkey;
            let valid = true;
            for (let pos = 0; pos < str.length; pos++) {
                let ct = this.state.cipherString.charAt(
                    this.cipherOffsets[i + pos]
                );
                let pt = str.charAt(pos);
                let key = this.ciphermap.decodeKey(ct, pt);
                let keypos = (i + pos) % this.state.keyword.length;
                let prevkey = thiskey.charAt(keypos);
                if ((prevkey !== "-" && prevkey !== key) || key === "?") {
                    valid = false;
                    break;
                }
                thiskey =
                    thiskey.substr(0, keypos) +
                    key +
                    thiskey.substr(keypos + 1);
            }
            if (valid) {
                if (tdcount > 0 && tdcount % maxcols === 0) {
                    row = table.addBodyRow();
                }
                tdcount = tdcount + 1;
                row.add(String(i)).add(
                    $("<a/>", {
                        class: "vkey",
                        href: "#",
                    }).text(thiskey)
                );
            }
        }
        if (tdcount === 0) {
            res = $("<span/>").text(
                "Unable to find " + str + " as " + this.normalizeHTML(str)
            );
        } else {
            res = $("<span/>").text(
                "Searching for " + str + " as " + this.normalizeHTML(str)
            );
            res.append(table.generate());
        }
        $(".findres")
            .empty()
            .append(res);
        this.attachHandlers();
    }
    /**
     * Analyze the encoded text
     * @param encoded String to analyze
     */
    public genAnalysis(encoded: string): JQuery<HTMLElement> {
        if (encoded === "") {
            return null;
        }
        $("#err").empty();
        if (this.state.keyword === undefined || this.state.keyword === "") {
            $("#err").append(
                $("<div/>", { class: "callout alert" }).text(
                    "Enter a sample keyword to set the period"
                )
            );
        }
        let prevSpot: NumberMap = {};
        let factorSet: NumberMap = {};
        let prevc = "";
        let prevc2 = "";
        let pos = 0;
        let table1 = new JTTable({
            class: "vdist",
            head: [["Seq", "Dist"]],
        });
        for (let c of encoded) {
            if (this.isValidChar(c)) {
                let two = prevc + c;
                let three = prevc2 + prevc + c;
                if (two.length === 2) {
                    if (typeof prevSpot[two] !== "undefined") {
                        let dist = pos - prevSpot[two];
                        table1.addBodyRow([two, String(dist)]);
                        // Find all the factors of the distance and record them
                        if (typeof factorSet[dist] === "undefined") {
                            factorSet[dist] = 0;
                        }
                        factorSet[dist]++;
                        for (let factor = 2; factor <= dist / 2; factor++) {
                            if (dist % factor === 0) {
                                if (typeof factorSet[factor] === "undefined") {
                                    factorSet[factor] = 0;
                                }
                                factorSet[factor]++;
                            }
                        }
                    }
                    prevSpot[two] = pos;
                }
                if (three.length === 3) {
                    if (typeof prevSpot[three] !== "undefined") {
                        let dist = pos - prevSpot[three];
                        table1.addBodyRow([three, String(dist)]);
                        // Find all the factors of the distance and record them
                        if (typeof factorSet[dist] === "undefined") {
                            factorSet[dist] = 0;
                        }
                        factorSet[dist]++;
                        for (let factor = 2; factor <= dist / 2; factor++) {
                            if (dist % factor === 0) {
                                if (typeof factorSet[factor] === "undefined") {
                                    factorSet[factor] = 0;
                                }
                                factorSet[factor]++;
                            }
                        }
                    }
                    prevSpot[three] = pos;
                }
                pos++;
                prevc2 = prevc;
                prevc = c;
            }
        }

        // Now dump out all the factors and the frequency of them
        let table2 = new JTTable({
            class: "vfact",
            head: [["Factor", "Freq"]],
        });
        for (let factor in factorSet) {
            if (factorSet[factor] > 1) {
                let link = $("<a/>", {
                    class: "vkey",
                    href: "#",
                    "data-key": this.repeatStr("-", Number(factor)),
                }).text(factor);
                table2.addBodyRow([link, String(factorSet[factor])]);
            }
        }
        return this.sideBySide(table1.generate(), table2.generate());
    }
    /**
     * Encapsulate two elements side by side in a table so that they stay lined up
     */
    public sideBySide(
        elem1: JQuery<HTMLElement>,
        elem2: JQuery<HTMLElement>
    ): JQuery<HTMLElement> {
        return new JTTable({
            class: "talign",
            body: [[elem1, elem2]],
        }).generate();
    }
    /**
     * Change the encrypted character.  This primarily shows us what the key might be if we use it
     * @param repchar Character that is being mapped
     * @param newchar Character to map it to
     * @param elem Optional HTML Element triggering the request
     */
    public setChar(
        repchar: string,
        newchar: string,
        elem?: JQuery<HTMLElement>
    ): void {
        this.state.replacement[repchar] = newchar;
        let index = Number(repchar);
        let ct = this.state.cipherString.charAt(index);
        $("input[data-char='" + repchar + "']").val(newchar);
        let key = this.ciphermap.decodeKey(ct, newchar);
        $("div[data-schar='" + repchar + "']").html(key);
    }
    /**
     * Builds the GUI for the solver
     */
    public build(): JQuery<HTMLElement> {
        let str = this.state.cipherString;
        this.cipherOffsets = [];
        let res = "";
        let combinedtext = "";
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        let posthead1 = '</tr></tbody></table><div class="repl" data-chars="';
        let posthead2 = '"></div></div>';
        let pre = prehead;
        let datachars = "";
        let charset = this.getCharset().toUpperCase();
        this.freq = {};
        for (let i = 0, len = charset.length; i < len; i++) {
            this.freq[charset.substr(i, 1).toUpperCase()] = 0;
        }

        for (let i = 0, len = str.length; i < len; i++) {
            let t = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(t)) {
                this.cipherOffsets.push(i);
                datachars += t;
                combinedtext += '<span data-char="' + i + '">?</span>';
                t =
                    pre +
                    '<td><div class="slil">' +
                    t +
                    "</div>" +
                    '<div data-char="' +
                    i +
                    '" class="vans">?</div>' +
                    '<input type="text" id="ti' +
                    i +
                    '" class="sli slvi" data-char="' +
                    i +
                    '"/>' +
                    '<div data-schar="' +
                    i +
                    '">&nbsp;</div></td>';
                pre = "";
            } else if (t === " " || t === "\n" || t === "\r") {
                if (pre === "") {
                    t = posthead1 + datachars + posthead2;
                } else {
                    t = "";
                }
                pre = prehead;
                datachars = "";
                combinedtext += " ";
            } else {
                combinedtext += t;
                t = pre + '<td><div class="slil">' + t + "</div></td>";
                pre = "";
            }
            res += t;
        }
        if (pre === "") {
            res += posthead1 + datachars + posthead2;
        }
        res += '<div class="ssum">' + combinedtext + "</div>";
        return $(res);
    }
    /**
     * Creates an HTML table to display the frequency of characters
     */
    public createFreqEditTable(): JQuery<HTMLElement> {
        return null;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('[name="ciphertype"]')
            .off("click")
            .on("click", e => {
                this.markUndo(null);
                this.setCipherType($(e.target).val() as ICipherType);
                this.updateOutput();
            });
        $("#keyword")
            .off("input")
            .on("input", e => {
                let newkeyword = $(e.target).val() as string;
                if (newkeyword !== this.state.keyword) {
                    this.markUndo(null);
                    if (this.setKeyword(newkeyword)) {
                        this.updateOutput();
                    }
                }
            });
        $("a.vkey")
            .off("click")
            .on("click", e => {
                let newkey = $(e.target).attr("data-key");
                if (newkey === undefined) {
                    newkey = $(e.target).html();
                }
                if (newkey !== this.state.keyword) {
                    this.markUndo(null);
                    if (this.setKeyword(newkey)) {
                        this.updateOutput();
                    }
                }
            });
        $(".slvi")
            .off("blur")
            .on("blur", e => {
                let tohighlight = $(e.target).attr("data-vslot");
                $("[data-vslot='" + tohighlight + "']").removeClass("allfocus");
                $(e.target).removeClass("focus");
            })
            .off("focus")
            .on("focus", e => {
                let tohighlight = $(e.target).attr("data-vslot");
                $("[data-vslot='" + tohighlight + "']").addClass("allfocus");
                $(e.target).addClass("focus");
            });
    }
}
