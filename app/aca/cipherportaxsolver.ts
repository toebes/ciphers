import { cloneObject } from "../common/ciphercommon";
import { IState, menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTFIncButton } from "../common/jtfIncButton";
import { JTFLabeledInput } from "../common/jtflabeledinput";
import { JTRadioButtonSet } from "../common/jtradiobutton";
import { JTTable } from "../common/jttable";
import { Mapper } from "../common/mapper";
import { mapperFactory } from "../common/mapperfactory";
import { CipherSolver } from "./ciphersolver";

let xmap = {
    A: "A",
    B: "A",
    C: "C",
    D: "C",
    E: "E",
    F: "E",
    G: "G",
    H: "G",
    I: "I",
    J: "I",
    K: "K",
    L: "K",
    M: "M",
    N: "M",
    O: "O",
    P: "O",
    Q: "Q",
    R: "Q",
    S: "S",
    T: "S",
    U: "U",
    V: "U",
    W: "W",
    X: "W",
    Y: "Y",
    Z: "Y",
};
let xmap2 = {
    A: "AB",
    B: "AB",
    C: "CD",
    D: "CD",
    E: "EF",
    F: "EF",
    G: "GH",
    H: "GH",
    I: "IJ",
    J: "IJ",
    K: "KL",
    L: "KL",
    M: "MN",
    N: "MN",
    O: "OP",
    P: "OP",
    Q: "QR",
    R: "QR",
    S: "ST",
    T: "ST",
    U: "UV",
    V: "UV",
    W: "WX",
    X: "WX",
    Y: "YZ",
    Z: "YZ",
};

enum DecodeType {
    known,
    first,
    both,
}
interface IPortaxPart {
    /** Position of first element of this piece */
    pos: number;
    /** Cipher Text first part (sliced based on the period) */
    ct1: string[];
    /** Cipher Text second part (sliced based on the period) */
    ct2: string[];
    /** Computed plain text first part computed from ct1/ct2 and state.keyword */
    pt1: string[];
    /** Computed plain text second part computed from ct1/ct2 and state.keyword */
    pt2: string[];
    /** User entered (or well known) plain text first part */
    ut1: string[];
    /** User entered (or well known) plain text second part */
    ut2: string[];
    /** Computed keyword based on ct1/ct2 ut1/ut2 */
    keyword: string[];
    dtype: DecodeType[];
}
interface IPortaxState extends IState {
    /** Cipher Period */
    period: number;
    /** Plain text string */
    plainText: string;
}

export class CipherPortaxSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    /** Portax Lookup table overridden by the subclasses */
    public parts: IPortaxPart[] = [];
    public defaultstate: IPortaxState = {
        cipherType: ICipherType.Portax,
        replacement: {},
        cipherString: "",
        locked: {},
        findString: "",
        period: 2,
        keyword: "",
        plainText: "",
    };
    public state: IPortaxState = cloneObject(this.defaultstate) as IPortaxState;
    public ciphermap: Mapper;

    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset" },
    ];
    /**
     * Initializes the encoder/decoder. (EN is the default)
     * @param lang Language - default = "EN" for english
     */
    public init(lang: string): void {
        this.ciphermap = mapperFactory(ICipherType.Portax);
        super.init(lang);
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setPeriod(this.state.period);
        this.setKeyword(this.state.keyword);
        this.setPlainText(this.state.plainText);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.aca);
        JTRadioButtonSet("ciphertype", this.state.cipherType);
        $("#period").val(this.state.period);
        $("#keyword").val(this.state.keyword);
        $("#encoded").val(this.state.cipherString);
        $("#find").val(this.state.findString);
        $("#ftext").text(this.getSolutionText());
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
     * Add any solution text to the problem
     */
    public saveSolution(): void {
        this.state.solution = this.state.keyword + " " + this.getSolutionText();
        this.state.solved = this.state.solution.indexOf("?") === -1;
    }
    public getSolutionText(): string {
        let result = "";
        for (let part of this.parts) {
            let extra = "";
            for (let i = 0; i < part.keyword.length; i++) {
                let c = part.ut1[i];
                if (c === " ") {
                    c = "?";
                }
                result += c;
                c = part.ut2[i];
                if (c === " ") {
                    c = "?";
                }
                extra += c;
            }
            result += extra;
        }
        return result;
    }
    /**
     * Updates the stored state cipher string
     * @param cipherString Cipher string to set
     */
    public setCipherString(cipherString: string): boolean {
        let changed = super.setCipherString(cipherString);
        this.setPeriod(this.state.period);
        this.sliceData();
        return changed;
    }
    /**
     * Updates the period.
     * @param period new period value
     */
    public setPeriod(period: number): boolean {
        let changed = false;
        if (period > 10) {
            period = 2;
        } else if (period < 2) {
            period = 10;
        }

        if (period !== this.state.period) {
            changed = true;
            this.state.period = period;
            this.sliceData();
        }
        return changed;
    }
    /**
     * Sets the keyword (state.keyword)
     * @param keyword New keyword
     * @returns Boolean indicating if the value actually changed
     */
    public setKeyword(keyword: string): boolean {
        let newkey = this.minimizeString(keyword.toUpperCase());
        let changed = false;
        if (this.state.keyword !== newkey) {
            changed = true;
            this.state.keyword = newkey;
            this.lastencoded = undefined;
            this.sliceData();
        }
        return changed;
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
            this.sliceData();
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
        console.log("Portax: repchar=" + repchar + " newchar=" + newchar);
        let pos = Number(repchar);
        if (newchar === "") {
            newchar = " ";
        }
        this.setPlainText(this.state.plainText);
        this.setPlainText(
            this.state.plainText.substr(0, pos) +
                newchar +
                this.state.plainText.substr(pos + newchar.length)
        );
        this.recomputePortax(pos);
        this.updatePortaxSlot(pos);
    }
    public genAnalysis(str: string): JQuery<HTMLElement> {
        return null;
    }
    public updatePortaxSlot(pos: number): void {
        let chunk = Math.floor(pos / (this.state.period * 2));
        if (chunk > this.parts.length) {
            return;
        }
        let part = this.parts[chunk];
        let width = part.keyword.length;
        let slot = (pos % (this.state.period * 2)) % width;
        if (slot >= part.keyword.length) {
            return;
        }
        let keyword = this.state.keyword + this.repeatStr("?", width);
        let kc = keyword.substr(slot, 1);
        let key = part.keyword[slot];
        let p1 = part.pt1[slot];
        let p2 = part.pt2[slot];
        let u1 = part.ut1[slot];
        let u2 = part.ut2[slot];
        let p1pos = part.pos + slot;
        let p2pos = p1pos + width;

        if (key === "-" || xmap[key] === xmap[kc]) {
            $("#k" + p1pos)
                .removeClass("ke")
                .addClass("kc")
                .text(kc);
        } else {
            $("#k" + p1pos)
                .removeClass("kc")
                .addClass("ke")
                .text(key);
        }
        $("#v" + p1pos).text(p1);
        $("#v" + p2pos).text(p2);
        $("#m" + p1pos).val(u1);
        $("#m" + p2pos).val(u2);
    }
    public recomputePortax(pos: number): void {
        let chunk = Math.floor(pos / (this.state.period * 2));
        if (chunk > this.parts.length) {
            return;
        }
        let part = this.parts[chunk];
        let width = part.keyword.length;
        let slot = (pos % (this.state.period * 2)) % width;
        if (slot >= part.keyword.length) {
            return;
        }
        let keyword = this.state.keyword + this.repeatStr("?", width);
        let kc = keyword.substr(slot, 1);

        // We have ct1 and ct2 as given and (potentially) a keyword character
        // Additionally the user may have typed in characters to fill in
        // the spots for them (u1 and u2) which we need to put into ut1/ut2
        // We need to compute pt1/pt2 based on ct1/ct2 and keyword character
        // We also need to compute a keyword character based on ct1/ct2 ut1/ut2
        // if one can actually be computed.
        let p1slot = part.pos + slot;
        let p2slot = p1slot + width;
        let u1 = this.state.plainText.substr(p1slot, 1);
        let u2 = this.state.plainText.substr(p2slot, 1);
        let c1 = part.ct1[slot];
        let c2 = part.ct2[slot];
        let dec = this.ciphermap.encode(c1 + c2, kc);
        let p1 = dec.substr(0, 1);
        let p2 = dec.substr(1, 1);
        let key = "-";
        let dtype = DecodeType.both;
        // We need to compute pt1 and pt2 as well as the keyword
        if (c1 >= "N") {
            dtype = DecodeType.first;
            let decoded = this.ciphermap.decode(c1 + c2, "?");
            let p1a = decoded.substr(0, 1);
            p2 = decoded.substr(1, 1);
            if (p1a !== "?") {
                dtype = DecodeType.known;
                p1 = p1a;
                u1 = p1;
            }
            u2 = p2;
        } else {
            if (u1 !== " " && u2 !== " ") {
                key = this.ciphermap.decodeKey(c1 + c2, u1 + u2);
            }
        }
        part.pt1[slot] = p1;
        part.pt2[slot] = p2;
        part.ut1[slot] = u1;
        part.ut2[slot] = u2;
        part.keyword[slot] = key;
        part.dtype[slot] = dtype;
    }
    /**
     * Data structure
     * array of
     * keyword: string[]
     * ct1: string[]
     * ct2: string[]
     * pt1: string[]
     * pt2: string[]
     * ut1: string[]
     * ut2: string[]
     */
    public sliceData(): void {
        let str = this.minimizeString(this.state.cipherString);
        this.parts = [];
        for (let pos = 0; pos < str.length; pos += this.state.period * 2) {
            let part: IPortaxPart = {
                pos: pos,
                ct1: [],
                ct2: [],
                ut1: [],
                ut2: [],
                pt1: [],
                pt2: [],
                keyword: [],
                dtype: [],
            };
            this.parts.push(part);
            let piece = str.substr(pos, this.state.period * 2);
            let width = Math.floor((piece.length + 1) / 2);
            for (let i = 0; i < width; i++) {
                let c1 = piece.substr(i, 1);
                let c2 = piece.substr(width + i, 1);
                part.ct1.push(c1);
                part.ct2.push(c2);
                let p1slot = pos + i;
                let p2slot = pos + i + width;
                let u1 = this.state.plainText.substr(p1slot, 1);
                let u2 = this.state.plainText.substr(p2slot, 1);
                part.ut1.push(u1);
                part.ut2.push(u2);
                part.pt1.push(" ");
                part.pt2.push(" ");
                part.dtype.push(DecodeType.known);
                part.keyword.push(" ");
            }
            // Now that we built the segment, go ahead and calculate it
            for (let i = 0; i < width; i++) {
                this.recomputePortax(pos + i);
            }
        }
    }
    public build(): JQuery<HTMLElement> {
        let block = $("<div/>", { class: "clearfix" });
        let result = $("<div/>", { class: "clearfix" });
        if (this.parts.length === 0) {
            return $("<div/>", { class: "callout warning" }).text(
                "Enter a cipher to get started"
            );
        }
        let keyword =
            this.state.keyword + this.repeatStr("?", this.state.period);

        for (let part of this.parts) {
            let section = $("<div/>", { class: "sword" });
            let table = new JTTable({ class: "tword" });
            let hrow = table.addBodyRow();
            let crow1 = table.addBodyRow();
            let crow2 = table.addBodyRow();
            let vrow1 = table.addBodyRow();
            let vrow2 = table.addBodyRow();
            let prow1 = table.addBodyRow();
            let prow2 = table.addBodyRow();
            let width = part.keyword.length;
            for (let i = 0; i < width; i++) {
                let c1 = part.ct1[i];
                let c2 = part.ct2[i];
                let p1 = part.pt1[i];
                let p2 = part.pt2[i];
                let key = part.keyword[i];
                let u1 = part.ut1[i];
                let u2 = part.ut2[i];
                let dtype = part.dtype[i];
                let p1slot = part.pos + i;
                let p2slot = part.pos + i + width;
                let kc = keyword.substr(i, 1);
                crow1.add({
                    settings: { class: "c1" },
                    content: c1,
                });
                crow2.add({
                    settings: { class: "c2" },
                    content: c2,
                });
                if (dtype === DecodeType.known) {
                    prow1.add({
                        settings: { class: "p1" },
                        content: p1,
                    });
                } else {
                    prow1.add({
                        settings: { class: "p1" },
                        content: $("<input/>", {
                            type: "text",
                            class: "sli",
                            "data-char": p1slot,
                            id: "m" + p1slot,
                            value: u1,
                        }),
                    });
                }
                if (dtype !== DecodeType.both) {
                    prow2.add({
                        settings: { class: "p2" },
                        content: p2,
                    });
                } else {
                    prow2.add({
                        settings: { class: "p2" },
                        content: $("<input/>", {
                            type: "text",
                            class: "sli",
                            "data-char": p2slot,
                            id: "m" + p2slot,
                            value: u2,
                        }),
                    });
                }
                // We need to display the key.  However we want to make sure that it is a legitimate
                // key value.
                if (key === "-" || xmap[key] === xmap[kc]) {
                    hrow.add({
                        settings: { class: "kc", id: "k" + p1slot },
                        content: kc,
                    });
                } else {
                    hrow.add({
                        settings: { class: "ke", id: "k" + p1slot },
                        content: key,
                    });
                }
                vrow1.add({
                    settings: { id: "v" + p1slot },
                    content: p1,
                });
                vrow2.add({
                    settings: { id: "v" + p2slot },
                    content: p2,
                });
            }
            section.append(table.generate());
            block.append(section);
        }
        result.append(block);
        result.append(
            $("<div/>", { id: "ftext" }).text(this.getSolutionText())
        );
        return result;
    }
    /**
     * Generates the section above the command buttons
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");

        result.append(
            JTFLabeledInput(
                "Cipher Text",
                "textarea",
                "encoded",
                this.state.cipherString,
                "small-12 medium-12 large-12"
            )
        );
        let inputbox = $("<div/>", {
            class: "grid-x grid-margin-x",
        });
        inputbox.append(
            JTFIncButton(
                "Period",
                "period",
                this.state.period,
                "small-12 medium-6 large-6"
            )
        );
        inputbox.append(
            JTFLabeledInput(
                "Keyword",
                "text",
                "keyword",
                this.state.keyword,
                "small-12 medium-6 large-6"
            )
        );

        result.append(inputbox);
        return result;
    }
    /**
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append($("<div>", { class: "err" }));
        result.append(this.genFindCommands());
        return result;
    }
    /*
     * Creates an HTML table to display the frequency of characters
     */
    public createFreqEditTable(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "clearfix" });
        return result;
    }
    /**
     * This looks for a Portax encoded string in the input pattern.  It relies on:
     *   this.cipherWidth to be the width of each encoded character
     * @param str String to search for
     */
    public findPossible(str: string): void {
        this.state.findString = str;
        if (str === "") {
            $(".findres").empty();
            return;
        }

        $(".findres")
            .empty()
            .append(
                $("<div/>", { class: "callout warning" }).text(
                    "Not yet implemented"
                )
            );
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    public load(): void {
        this.encodedString = this.cleanString(this.state.cipherString);
        let encoded =
            String(this.state.period) +
            this.cleanString(this.state.cipherString);
        if (encoded !== this.lastencoded) {
            this.lastencoded = encoded;

            let res = this.build();
            $("#answer")
                .empty()
                .append(res);
            $("#analysis").each((i, elem) => {
                $(elem)
                    .empty()
                    .append(this.genAnalysis(this.encodedString));
            });
        } else {
            for (let i = 0; i < this.state.plainText.length; i++) {
                this.updatePortaxSlot(i);
            }
        }
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $("#period")
            .off("input")
            .on("input", e => {
                let columns = Number($(e.target).val());
                if (columns !== this.state.period) {
                    this.markUndo(null);
                    if (this.setPeriod(columns)) {
                        this.updateOutput();
                    }
                }
            });
        $("#keyword")
            .off("input")
            .on("input", e => {
                let keyword = $(e.target).val() as string;
                if (keyword !== this.state.keyword) {
                    this.markUndo(null);
                    if (this.setKeyword(keyword)) {
                        this.updateOutput();
                    }
                }
            });
    }
}
