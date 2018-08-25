import { cloneObject, NumberMap } from "./ciphercommon";
import { IState } from "./cipherhandler";
import { CipherSolver } from "./ciphersolver";
import { CipherTypeButtonItem, ICipherType } from "./ciphertypes";
import { JTRadioButton } from "./jtradiobutton";
import { JTTable } from "./jttable";
import { Mapper } from "./mapper";
import { mapperFactory } from "./mapperfactory";

export class CipherVigenereSolver extends CipherSolver {
    defaultstate: IState = {
        /** The current cipher type we are working on */
        cipherType: ICipherType.Vigenere,
        /** Currently selected keyword */
        keyword: "",
        /** The current cipher we are working on */
        cipherString: "",
        /** The current string we are looking for */
        findString: "",
        /** Replacement characters */
        replacement: {}
    };
    state: IState = cloneObject(this.defaultstate) as IState;

    /** Map of indexes into which character of the string is at that index */
    cipherOffsets: Array<number> = [];
    /** Implements the mapping for the various cipher types */
    ciphermap: Mapper = null;
    restore(data: IState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.updateUI();
        this.setCipherVariant(this.state.cipherType);
        this.setUIDefaults();
        $("#analysis").each((i, elem) => {
            $(elem)
                .empty()
                .append(this.genAnalysis(this.state.cipherString));
        });
        this.findPossible(this.state.findString);
    }
    /**
     * Make a copy of the current state
     */
    save(): IState {
        // We need a deep copy of the save state
        let savestate = cloneObject(this.state) as IState;
        return savestate;
    }

    /**
     * Sets up the radio button to choose the variant
     */
    genPreCommands(): JQuery<HTMLElement> {
        let operationChoice = $("<div>");

        let radiobuttons = [
            CipherTypeButtonItem(ICipherType.Vigenere),
            CipherTypeButtonItem(ICipherType.Variant),
            CipherTypeButtonItem(ICipherType.Beaufort),
            CipherTypeButtonItem(ICipherType.Gronsfeld),
            CipherTypeButtonItem(ICipherType.Porta)
        ];
        operationChoice.append(
            JTRadioButton(8, "codevariant", radiobuttons, this.state.cipherType)
        );
        return operationChoice;
    }

    private updateUI(): void {
        $("#encoded").val(this.state.cipherString);
        $("#keyword").val(this.state.keyword);
        $("#find").val(this.state.findString);
        $("#answer")
            .empty()
            .append(this.build());
        $('[name="codevariant"]').removeAttr("checked");
        $("input[name=codevariant][value=" + this.state.cipherType + "]").prop(
            "checked",
            true
        );
    }

    /**
     * Selects which variant table is to be used for mapping
     * cipherType Name of code variant - one of vigenere, variant or beaufort
     */
    setCipherVariant(cipherType: ICipherType): void {
        this.state.cipherType = cipherType;
        this.ciphermap = mapperFactory(cipherType);
        this.setKeyword(this.state.keyword);
        for (let repc in this.state.replacement) {
            this.setChar(repc, this.state.replacement[repc]);
        }
    }
    /**
     * Changes the keyword to map against the table.  The length of the keyword is
     * the period of the cipher (after removing any spaces of course)
     * Any non-mapping characters (. - _ etc) are used as placeholders
     * str New keyword mapping string
     */
    setKeyword(str: string): void {
        if (str.length > 0) {
            console.log("Keyword is" + str);
            this.state.keyword = str;
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
                console.log(
                    "Set:" +
                        i +
                        " for CT=" +
                        this.cipherOffsets[i] +
                        " Key=" +
                        ckey +
                        " to pt=" +
                        pt
                );
                $("span[data-char='" + this.cipherOffsets[i] + "']").text(pt);
                $("div[data-char='" + this.cipherOffsets[i] + "']").html(pt);
            }
        }
    }
    /**
     * Locate a string.
     * Note that we assume that the period has been set
     */
    findPossible(str: string): void {
        this.state.findString = str;
        if (str === "") {
            $(".findres").empty();
            return;
        }
        let blankkey = "";
        for (let c of this.state.keyword) {
            blankkey += "-";
        }
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
                    $("<a>", { class: "vkey", href: "#" }).text(thiskey)
                );
            }
        }
        if (tdcount === 0) {
            res = $("<span>").text(
                "Unable to find " + str + " as " + this.normalizeHTML(str)
            );
        } else {
            res = $("<span>").text(
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
     * Fills in the frequency portion of the frequency table.  For the Vigenere
     * we don't have the frequency table, so this doesn't need to do anything
     */
    displayFreq(): void {}
    /**
     * Analyze the encoded text
     */
    genAnalysis(encoded: string): JQuery<HTMLElement> {
        if (encoded === "") {
            return null;
        }
        let prevSpot: NumberMap = {};
        let factorSet: NumberMap = {};
        let prevc = "";
        let prevc2 = "";
        let pos = 0;
        let table1 = new JTTable({
            class: "vdist",
            head: [["Seq", "Dist"]]
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
            head: [["Factor", "Freq"]]
        });
        for (let factor in factorSet) {
            if (factorSet[factor] > 1) {
                let link = $("<a>", {
                    class: "vkey",
                    href: "#",
                    "data-key": this.repeatStr("-", Number(factor))
                }).text(factor);
                table2.addBodyRow([link, String(factorSet[factor])]);
            }
        }
        return this.sideBySide(table1.generate(), table2.generate());
    }
    /**
     * Encapsulate two elements side by side in a table so that they stay lined up
     */
    sideBySide(
        elem1: JQuery<HTMLElement>,
        elem2: JQuery<HTMLElement>
    ): JQuery<HTMLElement> {
        return new JTTable({ body: [[elem1, elem2]] }).generate();
    }
    /**
     * Change the encrypted character.  This primarily shows us what the key might be if we use it
     */
    setChar(repchar: string, newchar: string): void {
        console.log(
            "vigenere setChar data-char=" + repchar + " newchar=" + newchar
        );

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
    build(): JQuery<HTMLElement> {
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
    createFreqEditTable(): JQuery<HTMLElement> {
        let topdiv = $("<div>");
        $("<div>", { id: "period", class: "note" })
            .text("Enter a sample keyword to set the period")
            .appendTo(topdiv);
        $("<label>", { for: "keyword" })
            .text("Keyword")
            .appendTo(topdiv);
        $("<input/>", { class: "xxx", id: "keyword" }).appendTo(topdiv);

        return topdiv;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        super.attachHandlers();
        this.setCipherVariant($(
            "input[name='codevariant']:checked"
        ).val() as ICipherType);

        $("input[type=radio][name=codevariant]")
            .off("change")
            .on("change", e => {
                this.markUndo();
                this.setCipherVariant($(
                    "input[name='codevariant']:checked"
                ).val() as ICipherType);
            });
        $("#keyword")
            .off("input")
            .on("input", e => {
                let newkeyword = $(e.target).val() as string;
                if (newkeyword !== this.state.keyword) {
                    this.markUndo();
                    this.setKeyword(newkeyword);
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
                    this.markUndo();
                    this.setKeyword(newkey);
                    $("#keyword").val(newkey);
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
