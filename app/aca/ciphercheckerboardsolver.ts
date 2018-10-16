import { cloneObject, getPolybiusKey } from "../common/ciphercommon";
import { IState, menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTFLabeledInput } from "../common/jtflabeledinput";
import { JTTable } from "../common/jttable";
import { CipherSolver } from "./ciphersolver";

interface ICheckerboardState extends IState {
    /** Row character set */
    rowcharset: string;
    /** Column characte set */
    colcharset: string;
}

export class CipherCheckerboardSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    public defaultstate: ICheckerboardState = {
        cipherType: ICipherType.Checkerboard,
        replacement: {},
        cipherString: "",
        findString: "",
        rowcharset: "     ",
        colcharset: "     ",
    };
    public state: ICheckerboardState = cloneObject(
        this.defaultstate
    ) as ICheckerboardState;

    /**
     *
     * Checkerboard Solver
     *
     */
    public init(lang: string): void {
        super.init(lang);
        this.cipherWidth = 2;
    }
    public saveSolution(): void {
        let firstchar;
        let solution = "";
        this.state.solved = true;
        let str = this.cleanString(this.state.cipherString).toUpperCase();
        for (let t of str) {
            if (this.isValidChar(t)) {
                if (firstchar === undefined) {
                    firstchar = t;
                } else {
                    let piece = firstchar + t;
                    firstchar = undefined;
                    let repl = this.state.replacement[piece];
                    if (repl === undefined) {
                        solution += "?";
                        this.state.solved = false;
                    } else {
                        solution += repl;
                    }
                }
            } else if (t !== " " && t !== "\n" && t !== "\r") {
                solution += t;
                firstchar = undefined;
            }
        }
        // Build an array to represent the Polybius square
        let polybius: string[][] = [];
        for (let r of this.state.rowcharset) {
            let rowdata: string[] = [];
            for (let c of this.state.colcharset) {
                rowdata.push(this.state.replacement[r + c]);
            }
            polybius.push(rowdata);
        }
        let polysol = getPolybiusKey(polybius);
        this.state.solution =
            polysol +
            "/" +
            this.state.rowcharset +
            "/" +
            this.state.colcharset +
            " " +
            solution;
    }
    /**
     * Generate a 5 character string to be used for the column or row
     * @param basecharset Starting character set (if any)
     * @param newcharset New characters to be added in order
     * @param forceorder Replace the base set completely
     */
    public buildCharset(
        basecharset: string,
        newcharset: string,
        forceorder: boolean
    ): string {
        let result = "";
        let unknowns = 0;
        if (!forceorder) {
            for (let c of basecharset.toUpperCase()) {
                if (
                    c === "?" ||
                    (this.isValidChar(c) && result.indexOf(c) === -1)
                ) {
                    result += c;
                    if (c === "?") {
                        unknowns++;
                    }
                }
            }
        }
        // Now add in the new characters.
        for (let c of newcharset.toUpperCase()) {
            if (
                c === "?" ||
                (this.isValidChar(c) && result.indexOf(c) === -1)
            ) {
                if (result.length < 5) {
                    result += c;
                } else if (unknowns > 0) {
                    // Adding this new character would make the string longer
                    // than 5 characters, so we have to throw something away
                    let idx = result.indexOf("?");
                    if (idx !== -1) {
                        result =
                            result.substr(0, idx) + result.substr(idx + 1) + c;
                    }
                } else {
                    // Unfortunately the character can't fit, so we are throwing it away
                    $(".err")
                        .empty()
                        .append(
                            $("<div/", { class: "callout small warning" }).text(
                                "More than five unique characters found, using only the first five:" +
                                    result
                            )
                        );
                }
            }
        }
        return result;
    }
    public setrowcolset(
        rowcharset: string,
        colcharset: string,
        forceorder: boolean
    ): boolean {
        let changed = false;

        let newrowcharset = this.buildCharset(
            this.state.rowcharset,
            rowcharset,
            forceorder
        );
        let newcolcharset = this.buildCharset(
            this.state.colcharset,
            colcharset,
            forceorder
        );

        if (newrowcharset !== this.state.rowcharset) {
            changed = true;
            this.state.rowcharset = newrowcharset;
        }

        if (newcolcharset !== this.state.colcharset) {
            changed = true;
            this.state.colcharset = newcolcharset;
        }

        // if (changed) {
        //     this.UpdateFreqEditTable();
        //     this.load();
        // }
        return changed;
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setrowcolset(this.state.rowcharset, this.state.colcharset, true);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.aca);
        $("#encoded").val(this.state.cipherString);
        $("#rowcharset").val(this.state.rowcharset);
        $("#colcharset").val(this.state.colcharset);
        $("#find").val(this.state.findString);
        this.showQuestion();
        this.load();
        this.findPossible(this.state.findString);
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
            JTFLabeledInput(
                "Row Characters",
                "text",
                "rowcharset",
                this.state.rowcharset,
                "small-12 medium-6 large-6"
            )
        );
        inputbox.append(
            JTFLabeledInput(
                "Column Characters",
                "text",
                "colcharset",
                this.state.colcharset,
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
    public build(): JQuery<HTMLElement> {
        let str = this.cleanString(this.state.cipherString);
        let res = "";
        let combinedtext = "";
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        let posthead = "</tr></tbody></table></div>";
        let pre = prehead;
        let firstchar = "";
        let firstset = "";
        let secondset = "";
        let docwidth = $(document).width();
        //docwidth = 9 * 24 * cipherwidth
        let width = Math.floor(docwidth / 24);
        let remaining = width;
        this.freq = {};

        for (let i = 0, len = str.length; i < len; i++) {
            let t = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(t)) {
                if (firstchar === "") {
                    firstchar = t;
                    if (firstset.indexOf(t) < 0) {
                        firstset += t;
                    }
                    t = "";
                } else {
                    let piece = firstchar + t;
                    let repl = this.state.replacement[piece];
                    if (repl === undefined) {
                        repl = "";
                    }
                    if (secondset.indexOf(t) < 0) {
                        secondset += t;
                    }
                    if (isNaN(this.freq[piece])) {
                        this.freq[piece] = 0;
                    }
                    this.freq[piece]++;

                    t =
                        pre +
                        '<td><div class="slil">' +
                        firstchar +
                        "<br/>" +
                        t +
                        "</div>" +
                        '<input type="text" id="ti' +
                        piece +
                        '" class="sli" data-char="' +
                        piece +
                        '" value="' +
                        repl +
                        '"/></td>';
                    if (repl === "") {
                        repl = "?";
                    }
                    combinedtext +=
                        '<span data-char="' + piece + '">' + repl + "</span>";

                    pre = "";
                    remaining--;
                    firstchar = "";
                }
            } else if (t !== " " && t !== "\n" && t !== "\r") {
                combinedtext += t;
                t = pre + '<td><div class="slil">' + t + "</div></td>";
                pre = "";
            }
            res += t;
            if (remaining === 0) {
                res += posthead;
                pre = prehead;
                remaining = width;
            }
        }
        if (pre === "") {
            res += posthead;
        }
        res += '<div class="ssum">' + combinedtext + "</div>";
        // We need to retain any existing character set order
        this.setrowcolset(firstset, secondset, false);
        return $(res);
    }
    /*
    * Creates an HTML table to display the frequency of characters
    */
    public createFreqEditTable(): JQuery<HTMLElement> {
        let topdiv = $("<div/>");
        let table = $("<table/>").addClass("ckfreq");
        let thead = $("<thead/>");
        let tbody = $("<tbody/>");
        let headrow = $("<tr/>");
        let row, rowlen, col, collen;
        let colset = this.state.colcharset.toUpperCase() + "??????????";
        let rowset = this.state.rowcharset.toUpperCase() + "??????????";
        rowlen = 5; //this.state.rowcharset.length;
        collen = 5; // this.state.colcharset.length;
        // console.log('createCheckerboardFreqEditTable: rowcharset=' + this.rowcharset + ' colcharset=' + this.colcharset)
        headrow.append($("<th/>").addClass("topleft"));
        for (col = 0; col < collen; col++) {
            headrow.append($("<th/>").text(colset.substr(col, 1)));
        }
        thead.append(headrow);

        for (row = 0; row < rowlen; row++) {
            let replrow = $("<tr/>");
            let rowc = rowset.substr(row, 1);
            replrow.append($("<th/>").text(rowc));
            for (col = 0; col < collen; col++) {
                let colc = colset.substr(col, 1);
                let piece = rowc + colc;
                let freq: string = String(this.freq[piece]);
                if (this.freq[piece] === undefined) {
                    freq = "";
                }
                let td = $("<td/>").text(freq);
                td.append($("</br>"));
                td.append(this.makeFreqEditField(piece));
                replrow.append(td);
            }
            tbody.append(replrow);
        }
        table.append(thead);
        table.append(tbody);
        topdiv.append(table);

        return topdiv;
    }
    public load(): void {
        let encoded = this.cleanString(this.state.cipherString);
        if (encoded !== this.lastencoded) {
            this.lastencoded = encoded;
            let res = this.build();
            $("#answer")
                .empty()
                .append(res);
            $("#analysis").each((i, elem) => {
                $(elem)
                    .empty()
                    .append(this.genAnalysis(encoded));
            });
        } else {
            $("input[data-char]").val("");
            $("span[data-char]").text("?");

            for (let c in this.state.replacement) {
                let newchar = this.state.replacement[c];
                $("input[data-char='" + c + "']").val(newchar);
                if (newchar === "") {
                    newchar = "?";
                }
                $("span[data-char='" + c + "']").text(newchar);
            }
        }
        // Show the update frequency values
        this.UpdateFreqEditTable();
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    /**
     * Searches for a string (drags a crib through the crypt)
     * @param encoded Encoded string
     * @param tofind Pattern string to find
     */
    // tslint:disable-next-line:cyclomatic-complexity
    public searchPattern2(encoded: string, tofind: string): JTTable {
        let result: JTTable;
        let notmapped = "?";
        let searchstr = this.makeUniquePattern(tofind, 1);
        let searchlen = searchstr.length;
        let encrlen = encoded.length;
        let charset = this.getCharset().toUpperCase();
        let used = this.getUsedMap();

        for (
            let i = 0;
            i + searchlen * this.cipherWidth <= encrlen;
            i += this.cipherWidth
        ) {
            let checkstr = encoded.substr(i, searchlen * this.cipherWidth);
            let check = this.makeUniquePattern(checkstr, this.cipherWidth);
            if (check === searchstr) {
                let keymap = {};
                let matched = true;
                let mapstr = "";
                //
                // Build the character mapping table to show what they would use
                for (let c of charset) {
                    keymap[c] = notmapped;
                }
                // Show the matching characters in order
                for (let j = 0; j < searchlen; j++) {
                    let keystr = tofind.substr(j, 1);
                    let searchpart = checkstr.substr(
                        j * this.cipherWidth,
                        this.cipherWidth
                    );
                    if (keymap[keystr] === notmapped) {
                        keymap[keystr] = searchpart;
                        mapstr += keystr + searchpart;
                    } else if (keymap[keystr] !== searchpart) {
                        matched = false;
                    }
                }
                // We matched, BUT we need to make sure that there are no signs that preclude it from
                let repl = this.genReplPattern(checkstr);
                if (matched && this.isValidReplacement(tofind, repl, used)) {
                    if (result === undefined) {
                        result = new JTTable({ class: "mfind" });
                    }
                    let row = result.addBodyRow();
                    row.add(String(i / 2)).add(
                        $("<a/>", {
                            class: "dapply",
                            href: "#",
                            "data-mapfix": mapstr,
                        }).text(checkstr)
                    );
                    for (let key of charset) {
                        row.add(keymap[key]);
                    }
                }
            }
        }
        return result;
    }
    /**
     * Locate a string and update the UI
     * @param str String to look for
     */
    public findPossible(str: string): void {
        let encoded = this.minimizeString(this.state.cipherString);
        this.state.findString = str;
        str = str.toUpperCase();
        $(".findres").empty();
        if (str === "") {
            return;
        }
        //
        // Look for all possible matches for the pattern.
        let res = this.searchPattern2(encoded, str);
        if (res === undefined) {
            $(".findres").append(
                $("<div/>", { class: "callout warning" }).text(
                    str + " not found"
                )
            );
        } else {
            let headrow = res.addHeaderRow(["Pos", "Match"]);
            for (let c of this.getSourceCharset()) {
                headrow.add(c);
            }
            $(".findres")
                .append(
                    "Searching for " + str + " as " + this.normalizeHTML(str)
                )
                .append(res.generate());
        }
        this.attachHandlers();
    }
    /**
     * We don't have to do anything for reverse replacements
     */
    public UpdateReverseReplacements(): void {}
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     */
    public updateSel(item: string, val: string): void {
        this.setChar(val, item);
        this.UpdateFreqEditTable();
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $("#rowcharset")
            .off("input")
            .on("input", e => {
                if (
                    this.setrowcolset(
                        (<HTMLInputElement>e.target).value,
                        this.state.colcharset,
                        true
                    )
                ) {
                    this.updateOutput();
                }
            });
        $("#colcharset")
            .off("input")
            .on("input", e => {
                if (
                    this.setrowcolset(
                        this.state.rowcharset,
                        (<HTMLInputElement>e.target).value,
                        true
                    )
                ) {
                    this.updateOutput();
                }
            });
    }
}
