import { toolMode } from "./cipherhandler";
import { CipherSolver } from "./ciphersolver";
export class CipherCheckerboardSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    public rowcharset: string = "";
    public colcharset: string = "";

    /**
     *
     * Checkerboard Solver
     *
     */
    public init(lang: string): void {
        super.init(lang);
        this.cipherWidth = 2;
        this.rowcharset = "     ";
        this.colcharset = "     ";
    }

    public setrowcolset(
        rowcharset: string,
        colcharset: string,
        forceorder: boolean
    ): void {
        let changed = false;

        rowcharset = rowcharset.toUpperCase();
        colcharset = colcharset.toUpperCase();

        this.rowcharset = this.rowcharset.trim();
        this.colcharset = this.colcharset.trim();

        if (rowcharset !== this.rowcharset) {
            if (forceorder) {
                changed = true;
                this.rowcharset = rowcharset;
            } else {
                for (let c of rowcharset) {
                    if (this.rowcharset.indexOf(c) < 0) {
                        this.rowcharset += c;
                        changed = true;
                    }
                }
            }
        }

        if (colcharset !== this.colcharset) {
            if (forceorder) {
                changed = true;
                this.colcharset = colcharset;
            } else {
                for (let c of colcharset) {
                    if (this.colcharset.indexOf(c) < 0) {
                        this.colcharset += c;
                        changed = true;
                    }
                }
            }
        }

        if (this.rowcharset.length < 5) {
            this.rowcharset += "     ".substr(0, 5 - this.rowcharset.length);
        }
        if (this.colcharset.length < 5) {
            this.colcharset += "     ".substr(0, 5 - this.colcharset.length);
        }

        if (changed) {
            this.UpdateFreqEditTable();
            this.load();
        }
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
        let charset = this.getCharset().toUpperCase();
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
                    if (secondset.indexOf(t) < 0) {
                        secondset += t;
                    }
                    if (isNaN(this.freq[piece])) {
                        this.freq[piece] = 0;
                    }
                    this.freq[piece]++;

                    combinedtext += '<span data-char="' + piece + '">?</span>';
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
                        '" /></td>';

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
        let inputdiv = $("<div/>", { class: "idiv" });
        let table = $("<table/>").addClass("ckfreq");
        let thead = $("<thead/>");
        let tbody = $("<tbody/>");
        let headrow = $("<tr/>");
        let row, rowlen, col, collen;
        rowlen = this.rowcharset.length;
        collen = this.colcharset.length;
        // console.log('createCheckerboardFreqEditTable: rowcharset=' + this.rowcharset + ' colcharset=' + this.colcharset)
        headrow.append($("<th/>").addClass("topleft"));
        for (col = 0; col < collen; col++) {
            headrow.append(
                $("<th/>").text(this.colcharset.substr(col, 1).toUpperCase())
            );
        }
        thead.append(headrow);

        inputdiv.append(
            $("<label/>", { for: "rowcharset", text: "Row Characters" })
        );
        inputdiv.append(
            $("<input/>", {
                type: "text",
                class: "csc",
                id: "rowcharset",
                value: this.rowcharset,
            })
        );
        inputdiv.append(
            $("<label/>", { for: "colcharset", text: "Column Characters" })
        );
        inputdiv.append(
            $("<input/>", {
                type: "text",
                class: "csc",
                id: "colcharset",
                value: this.colcharset,
            })
        );
        topdiv.append(inputdiv);

        for (row = 0; row < rowlen; row++) {
            let replrow = $("<tr/>");
            let rowc = this.rowcharset.substr(row, 1).toUpperCase();
            replrow.append($("<th/>").text(rowc));
            for (col = 0; col < collen; col++) {
                let colc = this.colcharset.substr(col, 1).toUpperCase();
                let piece = rowc + colc;
                let freq: string = String(this.freq[piece]);
                let td, input;
                if (typeof freq === "undefined") {
                    freq = "";
                }
                td = $("<td/>").text(freq);
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
        let res = this.build();
        $("#answer")
            .empty()
            .append(res);
        $("#analysis").each((i, elem) => {
            $(elem)
                .empty()
                .append(this.genAnalysis(encoded));
        });

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
    public searchPattern2(
        encoded: string,
        tofind: string
    ): string {
        let res = "";
        let notmapped = "?";
        let searchstr = this.makeUniquePattern(tofind, 1);
        let searchlen = searchstr.length;
        let encrlen = encoded.length;
        let prevchar = "";

        let used: { [key: string]: boolean } = {};
        let charset = this.getCharset().toUpperCase();
        for (let c of charset) {
            used[c] = false;
        }
        for (let c of charset) {
            used[this.state.replacement[c]] = true;
        }

        for (let i = 0; i + searchlen * this.cipherWidth <= encrlen; i += this.cipherWidth) {
            let checkstr = encoded.substr(i, searchlen * this.cipherWidth);
            let check = this.makeUniquePattern(checkstr, this.cipherWidth);
            // console.log(i + ':"' + check + '/' + encoded.substr(i, searchlen) + '" for "' + searchstr + '/'+tofind+ '"');
            if (check === searchstr) {
                let keymap = {};
                let matched;
                //
                // Build the character mapping table to show what they would use
                matched = true;
                //let charset = this.getCharset();
                for (let c of charset) {
                    keymap[c] = notmapped;
                }
                // Show the matching characters in order
                for (let j = 0; j < searchlen; j++) {
                    let keystr = tofind.substr(j, 1);
                    keymap[checkstr.substr(j, 1)] = keystr;
                    if (keystr === checkstr.substr(j, 1)) {
                        matched = false;
                    }
                }
                // We matched, BUT we need to make sure that there are no signs that preclude it from
                let repl = this.genReplPattern(checkstr);
                if (matched && this.isValidReplacement(tofind, repl, used)) {
                    let maptable = "";
                    let mapfix = "";
                    for (let key of charset) {
                        maptable +=
                            "<td>" + this.normalizeHTML(keymap[key]) + "</td>";
                        if (keymap[key] !== notmapped) {
                            mapfix += key + keymap[key];
                        }
                    }
                    res +=
                        "<tr><td>" +
                        i +
                        '</td><td><a class="dapply" href="#" data-mapfix="' +
                        mapfix +
                        '">' +
                        checkstr +
                        "</a></td>" +
                        maptable +
                        "</tr>";
                }
            }
        }
        return res;
    }
    /**
     * Locate a string and update the UI
     * @param str String to look for
     */
    public findPossible(str: string): void {
        let encoded = this.minimizeString(this.state.cipherString);
        let res = "";
        let i;
        str = str.toUpperCase();
        //
        // Look for all possible matches for the pattern.
        res = this.searchPattern2(encoded, str);
        if (res === "") {
            res = "<br/><b>Not Found</b>";
        } else {
            let charset = this.getCharset();
            let tres =
                '<table class="mfind"><thead><tr><th>Pos</th><th>Match</th>';
            for (i = 0; i < charset.length; i++) {
                let key = charset.substr(i, 1);
                tres += "<th>" + key + "</th>";
            }
            res = tres + "</tr></thead><tbody>" + res + "</tbody></table>";
        }

        $(".findres").html(
            "Searching for " + str + " as " + this.normalizeHTML(str) + res
        );
    }

    public attachHandlers(): void {
        $("#rowcharset")
            .off("change")
            .on("change", e => {
                this.setrowcolset(
                    (<HTMLInputElement>e.target).value,
                    this.colcharset,
                    true
                );
            });
        $("#colcharset")
            .off("change")
            .on("change", e => {
                this.setrowcolset(
                    this.rowcharset,
                    (<HTMLInputElement>e.target).value,
                    true
                );
            });
        super.attachHandlers();
    }
    public updateSel(): void {
        this.UpdateFreqEditTable();
    }
}
