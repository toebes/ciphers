import { cloneObject, NumberMap } from "./ciphercommon";
import { IState, menuMode, toolMode } from "./cipherhandler";
import { CipherSolver } from "./ciphersolver";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";
import { Mapper } from "./mapper";
import { mapperFactory } from "./mapperfactory";

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
    Z: "Y"
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
    Z: "YZ"
};

interface IPortaxState extends IState {
    /** Cipher Period */
    period: number;
    /** Plain text string */
    plainText: string;
}

export class CipherPortaxSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    /** Portax Lookup table overridden by the subclasses */
    public readonly PortaxReplaces: string[] = [];
    public defaultstate: IPortaxState = {
        cipherType: ICipherType.Portax,
        replacement: {},
        cipherString: "",
        locked: {},
        findString: "",
        period: 2,
        keyword: "",
        plainText: ""
    };
    public state: IPortaxState = cloneObject(this.defaultstate) as IPortaxState;
    public ciphermap: Mapper;

    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset" }
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
        this.setCipherType(this.state.cipherType);
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
        for (let i = 0; i < this.state.plainText.length; i++) {
            let c = this.state.plainText.substr(i, 1);
            $("[data-char=" + i + "]").val(c);
        }
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
        // We don't have to do anything because it has already been calculated
        // but we don't want to call the super class implementation because
        // it does something completely different.
    }
    public setCipherType(cipherType: ICipherType): boolean {
        let changed = super.setCipherType(cipherType);
        if (changed) {
            this.setPeriod(this.state.period);
        }
        return changed;
    }
    /**
     * Updates the stored state cipher string
     * @param cipherString Cipher string to set
     */
    public setCipherString(cipherString: string): boolean {
        let changed = super.setCipherString(cipherString);
        if (changed) {
            this.setPeriod(this.state.period);
        }
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
            this.lastencoded = undefined;
            changed = true;
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
        this.setPlainText(this.state.plainText);
        this.setPlainText(
            this.state.plainText.substr(0, pos) +
                newchar +
                this.state.plainText.substr(pos + newchar.length)
        );
        this.updateOutput();
    }
    public genAnalysis(str: string): JQuery<HTMLElement> {
        return null;
    }
    public build(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "clearfix" });
        let str = this.minimizeString(this.state.cipherString);
        if (str === "") {
            return $("<div/>", { class: "callout warning" }).text(
                "Enter a cipher to get started"
            );
        }
        for (let pos = 0; pos < str.length; pos += this.state.period * 2) {
            let section = $("<div/>", { class: "sword" });
            let table = new JTTable({ class: "tword" });
            let hrow = table.addBodyRow();
            let crow1 = table.addBodyRow();
            let crow2 = table.addBodyRow();
            let vrow1 = table.addBodyRow();
            let vrow2 = table.addBodyRow();
            let prow1 = table.addBodyRow();
            let prow2 = table.addBodyRow();
            let v1 = "?";
            let v2 = "?";
            let piece = str.substr(pos, this.state.period * 2);
            let width = Math.floor((piece.length + 1) / 2);
            let keyword =
                this.minimizeString(this.state.keyword.toUpperCase()) +
                this.repeatStr("?", width);
            for (let i = 0; i < width; i++) {
                let c1 = piece.substr(i, 1);
                let c2 = piece.substr(width + i, 1);
                let kc = keyword.substr(i, 1);
                let key = "-";
                crow1.add({
                    settings: { class: "c1" },
                    content: c1
                });
                crow2.add({
                    settings: { class: "c2" },
                    content: c2
                });
                if (c1 >= "N") {
                    let decoded = this.ciphermap.decode(c1 + c2, "?");
                    let p1 = decoded.substr(0, 1);
                    let p2 = decoded.substr(1, 1);
                    v1 = p1;
                    v2 = p2;
                    if (p1 === "?") {
                        p1 = this.state.plainText.substr(pos + i, 1);
                        let dec = this.ciphermap.encode(c1 + c2, kc);
                        v1 = dec.substr(0, 1);
                        v2 = dec.substr(1, 1);
                        prow1.add(
                            $("<input/>", {
                                type: "text",
                                class: "sli p1",
                                "data-char": pos + i,
                                id: "m1" + c1 + c2,
                                value: ""
                            })
                        );
                    } else {
                        prow1.add({
                            settings: { class: "p1" },
                            content: p1
                        });
                    }
                    prow2.add({
                        settings: { class: "p2" },
                        content: p2
                    });
                } else {
                    let p1 = this.state.plainText.substr(pos + i, 1);
                    let p2 = this.state.plainText.substr(pos + i + width, 1);
                    prow1.add(
                        $("<input/>", {
                            type: "text",
                            class: "sli p1",
                            "data-char": pos + i,
                            id: "m1" + c1 + c2,
                            value: p1
                        })
                    );
                    prow2.add(
                        $("<input/>", {
                            type: "text",
                            class: "sli p2",
                            "data-char": pos + i + width,
                            id: "m2" + c1 + c2,
                            value: p2
                        })
                    );
                    let dec = this.ciphermap.encode(c1 + c2, kc);
                    v1 = dec.substr(0, 1);
                    v2 = dec.substr(1, 1);
                    if (p1 !== " " && p2 !== " ") {
                        key = this.ciphermap.decodeKey(c1 + c2, p1 + p2);
                        if (key === "?") {
                            key = "-";
                        }
                    } else {
                        key = "-";
                    }
                }
                // We need to display the key.  However we want to make sure that it is a legitimate
                // key value.
                if (key === "-" || xmap[key] === xmap[kc]) {
                    hrow.add({
                        settings: { class: "kc" },
                        content: kc
                    });
                } else {
                    hrow.add({
                        settings: { class: "ke" },
                        content: key
                    });
                }
                vrow1.add(v1);
                vrow2.add(v2);
            }
            section.append(table.generate());
            result.append(section);
        }
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
            class: "grid-x grid-margin-x"
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
        $("[data-char]").removeClass(
            "match1 match2 match3 match4 match5 match6 match7 match8 match9 match10"
        );
        if (str === "") {
            $(".findres").empty();
            return;
        }

        let matchnum = 1;
        let alreadyused: NumberMap = {};
        let lookfor = $("<div/>").append("Highlighting: ");
        for (let c of str.toUpperCase()) {
            if (this.isValidChar(c)) {
                if (alreadyused[c] === undefined) {
                    alreadyused[c] = matchnum;
                    $("[data-char=" + c + "]").addClass("match" + matchnum);
                    matchnum++;
                }
                lookfor.append(
                    $("<span/>", { class: "match" + alreadyused[c] }).text(c)
                );
            } else {
                lookfor.append(c);
            }
        }

        $(".findres")
            .empty()
            .append(lookfor);
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
