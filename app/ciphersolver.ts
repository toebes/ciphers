import * as sortable from "html5sortable";
import { BoolMap, cloneObject, NumberMap, StringMap } from "./ciphercommon";
import { CipherHandler, IState, menuMode, toolMode } from "./cipherhandler";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTTable } from "./jttable";

export class CipherSolver extends CipherHandler {
    activeToolMode: toolMode = toolMode.aca;
    defaultstate: IState = {
        /** The current cipher type we are working on */
        cipherType:
            ICipherType.Aristocrat /** The current cipher we are working on */,
        cipherString: "" /** The current string we are looking for */,
        findString: "",
        locked: {},
        replacement: {},
        replOrder: "",
    };
    state: IState = cloneObject(this.defaultstate) as IState;
    cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Load English", color: "primary", id: "loadeng" },
        { title: "Reset", color: "warning", id: "reset" },
    ];
    /** Cache the last encoded string to optimize updates */
    lastencoded: string = undefined;
    /**
     * Initializes the encoder/decoder. (EN is the default)
     * @param lang Language - default = "EN" for english
     */
    init(lang: string): void {
        this.setMenuMode(menuMode.aca);
        super.init(lang);
    }
    /**
     * Make a copy of the current state
     */
    save(): IState {
        this.saveSolution();
        // We need a deep copy of the save state
        let savestate = cloneObject(this.state) as IState;
        return savestate;
    }
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    restore(data: IState): void {
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
    setUIDefaults(): void {
        super.setUIDefaults();
        this.setCipherString(this.state.cipherString);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.aca);
        $("#qtext").empty();
        if (this.state.question !== "") {
            $("#qtext").append(
                $("<div/>", { class: "callout primary" }).html(
                    this.state.question
                )
            );
        }
        $("#encoded").val(this.state.cipherString);
        this.load();
        this.updateMatchDropdowns(undefined);
        // Populate all the matches
        this.propagateReplacements();
        // And restore any finds that may have been in progress
        $("#find").val(this.state.findString);
        this.findPossible(this.state.findString);
    }
    /**
     * Propagate all of the replacement characters to the UI
     */
    public propagateReplacements(): void {
        // for (let c of this.getCharset()) {
        //     this.setChar(c, this.state.replacement[c]);
        // }
        $(".sli")
            .val("")
            .text("");
        for (let repc in this.state.replacement) {
            this.setChar(repc, this.state.replacement[repc]);
        }
    }
    /**
     * Creates the input area
     */
    genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div>");

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
     * Generates an HTML representation of a string for display
     * @param str String to normalize
     */
    normalizeHTML(str: string): string {
        return str;
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    load(): void {
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
            this.UpdateFreqEditTable();
            // Show the update frequency values
            this.displayFreq();
            // We need to attach handlers for any newly created input fields
            this.attachHandlers();
        }
    }
    /**
     * Resetting any solving matches made
     */
    reset(): void {
        this.state.replacement = {};
        this.updateOutput();
    }
    /**
     * Creates an HTML table to display the frequency of characters
     */
    createFreqEditTable(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "clearfix" });
        let table = new JTTable({ class: "tfreq" });

        let headrow = table.addHeaderRow();
        let freqrow = table.addHeaderRow();
        let replrow = table.addHeaderRow();
        let altreprow;
        if (this.ShowRevReplace) {
            altreprow = table.addHeaderRow();
        }
        let charset = this.getSourceCharset();
        let replOrder = this.state.replOrder;
        if (replOrder === "") {
            replOrder = charset;
        }

        headrow.add({
            settings: { class: "topleft" },
            content: "",
        });
        freqrow.add({ celltype: "th", content: "Frequency" });
        replrow.add({ celltype: "th", content: "Replacement" });

        if (this.ShowRevReplace) {
            altreprow.add({
                celltype: "th",
                content: "Rev Replace",
            });
        }
        result.append(
            $("<div/>", {
                class: "float-left",
            }).append(table.generate())
        );
        let list = $("<ul/>", {
            id: "freqtable",
            class: "no-bullet sortable",
        });

        for (let c of replOrder.toUpperCase()) {
            table = new JTTable({ class: "tfreq" });

            headrow = table.addHeaderRow();
            freqrow = table.addBodyRow();
            replrow = table.addBodyRow();
            if (this.ShowRevReplace) {
                altreprow = table.addBodyRow();
            }
            headrow.add(c);
            freqrow.add({
                settings: { id: "f" + c },
                content: "",
            });
            replrow.add(this.makeFreqEditField(c));
            if (this.ShowRevReplace) {
                altreprow.add({
                    settings: { id: "rf" + c },
                    content: "",
                });
            }
            list.append(
                $("<li/>", {
                    class: "float-left",
                    id: "sc" + c,
                }).append(table.generate())
            );
        }
        result.append(list);
        return result;
    }
    /**
     * Create an edit field for a dropdown
     * @param c Character to make the dropdown for
     */
    makeFreqEditField(c: string): JQuery<HTMLElement> {
        let einput = $("<input/>", {
            type: "text",
            class: "sli",
            "data-char": c,
            id: "m" + c,
            value: this.state.replacement[c],
        });
        if (this.state.locked[c]) {
            einput.prop("disabled", true);
        }
        return einput;
    }
    /**
     * Sorter to compare two frequency objects
     * Objects must have a freq and a val portion
     * higher frequency sorts first with a standard alphabetical sort after
     * @param a First item to compare
     * @param b Second item to compare
     */
    isort(a: any, b: any): number {
        if (a.freq > b.freq) {
            return -1;
        } else if (a.freq < b.freq) {
            return 1;
        } else if (a.val < b.val) {
            return -1;
        } else if (a.val > b.val) {
            return 1;
        }
        return 0;
    }
    /**
     * Finds the top n strings of a given width and formats an HTML
     * unordered list of them.  Only strings which repeat 2 or more times are included
     * @param str Pattern string to look for
     * @param width Width of the string
     * @param num Maximun number of strings to find
     */
    makeTopList(str: string, width: number, num: number): JQuery<HTMLElement> {
        let tfreq = {};
        let tobjs = [];
        let work = "";
        let res = $("<span>").text("None found");
        for (let t of str.toUpperCase()) {
            if (this.isValidChar(t)) {
                work += t;
            }
        }
        // Now we have the work string with only the legal characters in it
        // Next we want to go through and find all the combination strings of a given length
        for (
            let i = 0, len = work.length;
            i <= len - width * this.cipherWidth;
            i++
        ) {
            let piece = work.substr(i, width * this.cipherWidth);
            if (isNaN(tfreq[piece])) {
                tfreq[piece] = 0;
            }
            tfreq[piece]++;
        }
        // tfreq holds the frequency of each string which is of the width requested.  Now we just
        // need to go through and pick out the big ones and display them in sorted order.  To sort
        // it we need to build an array of objects holding the frequency and values.
        Object.keys(tfreq).forEach((value: string) => {
            let frequency = tfreq[value];
            if (frequency > 1) {
                let item = { freq: frequency, val: value };
                tobjs.push(item);
            }
        });
        // Now we sort them and pull out the top requested items.  It is possible that
        // the array is empty because there are not any duplicates
        tobjs.sort(this.isort);
        if (num > tobjs.length) {
            num = tobjs.length;
        }

        if (num > 0) {
            res = $("<ul>");
            for (let i = 0; i < num; i++) {
                let valtext = tobjs[i].val;
                if (this.cipherWidth > 1) {
                    // We need to insert spaces every x characters
                    let extra = "";
                    let final = "";
                    for (
                        let vpos = 0, vlen = valtext.length / 2;
                        vpos < vlen;
                        vpos++
                    ) {
                        final += extra + valtext.substr(vpos * 2, 2);
                        extra = " ";
                    }
                    valtext = final;
                }

                $("<li>")
                    .text(valtext + " - " + tobjs[i].freq)
                    .appendTo(res);
            }
        }
        return res;
    }
    /**
     * Builds an HTML Representation of the contact table
     * @param encoded String to make a contact table from
     */
    genContactTable(encoded: string): JQuery<HTMLElement> {
        let prevs: StringMap = {};
        let posts: StringMap = {};
        for (let c of this.getCharset()) {
            prevs[c] = "";
            posts[c] = "";
        }
        let prevlet = " ";
        // Go though the encoded string looking for all the letters which
        // preceed and follow a letter
        for (let c of encoded) {
            if (prevlet === " ") {
                prevs[c] = "-" + prevs[c];
            } else {
                prevs[c] = prevlet + prevs[c];
                if (c === " ") {
                    posts[prevlet] = posts[prevlet] + "-";
                } else {
                    posts[prevlet] = posts[prevlet] + c;
                }
            }
            prevlet = c;
        }
        // Don't forget that we have to handle the last letter
        if (prevlet !== " ") {
            posts[prevlet] = posts[prevlet] + "-";
        }
        let tobjs = [];
        // Now sort all of the letters
        for (let c of this.getCharset()) {
            if (prevs[c] !== "" && posts[c] !== "") {
                let frequency = prevs[c].length + posts[c].length;
                let item = {
                    freq: frequency,
                    let: c,
                    prevs: prevs[c],
                    posts: posts[c],
                };
                tobjs.push(item);
            }
        }
        tobjs.sort(this.isort);
        let consonantline = "";
        let freq: NumberMap = {};
        let table = new JTTable({ class: "cell shrink contact" });
        table.addHeaderRow([
            {
                celltype: "th",
                settings: {
                    colspan: 3,
                },
                content: "Contact Table",
            },
        ]);
        for (let item of tobjs) {
            let row = table.addBodyRow();
            row.add({
                settings: {
                    class: "prev",
                },
                content: item.prevs,
            });
            row.add({
                settings: {
                    class: "tlet",
                },
                content: item.let,
            });
            row.add({
                settings: {
                    class: "post",
                },
                content: item.posts,
            });
            freq[item.let] = item.freq;
            consonantline = item.let + consonantline;
        }
        let res = $("<div>");
        res.append(table.generate());
        // Now go through and generate the Consonant line
        res.append(
            this.genConsonantsTable(encoded, consonantline, tobjs, freq)
        );
        return res.children();
    }
    /**
     * Generate the Consonants Line Table
     * @param encoded Encoded string
     * @param consonantline Computed consonantLine
     * @param tobjs Computed contacts
     * @param freq Computed frequency table
     */
    public genConsonantsTable(
        encoded: string,
        consonantline: string,
        tobjs: any[],
        freq: NumberMap
    ): JQuery<HTMLElement> {
        let prevs: StringMap = {};
        let posts: StringMap = {};

        let minfreq = freq[consonantline.substr(12, 1)];
        for (let c of this.getCharset()) {
            prevs[c] = "";
            posts[c] = "";
        }
        let prevlet = " ";
        // Go though the encoded string looking for all the letters which
        // preceed and follow a letter
        for (let c of encoded) {
            if (prevlet !== " ") {
                if (freq[c] <= minfreq) {
                    prevs[prevlet] = prevlet + prevs[prevlet];
                }
                if (c !== " " && freq[prevlet] <= minfreq) {
                    posts[c] = posts[c] + c;
                }
            }
            prevlet = c;
        }
        let table = new JTTable({
            class: "cell shrink consonantline",
        });
        let consonants = "";
        let lastfreq = 0;
        for (let item of tobjs) {
            if (freq[item.let] <= minfreq) {
                if (consonants !== "" && item.freq !== lastfreq) {
                    consonants = " " + consonants;
                }
                lastfreq = item.freq;
                consonants = item.let + consonants;
            }
            if (prevs[item.let] !== "" || posts[item.let] !== "") {
                let row = table.addBodyRow();
                row.add({
                    settings: {
                        class: "prev",
                    },
                    content: prevs[item.let],
                });
                row.add({
                    settings: {
                        class: "post",
                    },
                    content: posts[item.let],
                });
            }
        }
        table.addHeaderRow([
            {
                settings: {
                    colspan: 2,
                },
                content: "Consonant Line",
            },
        ]);
        table.addHeaderRow([
            {
                settings: {
                    colspan: 2,
                },
                content: consonants,
            },
        ]);
        return table.generate();
    }
    /**
     * Analyze the encoded text and return an HTML represencation of the analysis
     * @param encoded String to analyze
     */
    genAnalysis(encoded: string): JQuery<HTMLElement> {
        let topdiv = $("<div>");

        let table = new JTTable({ class: "cell shrink satable" });
        let thead = table.addHeaderRow();
        let tbody = table.addBodyRow();
        for (let num of [2, 3, 4, 5]) {
            thead.add(num + " Chars");
            tbody.add(this.makeTopList(encoded, Number(num), 12));
        }

        topdiv.append(table.generate());
        topdiv.append(this.genContactTable(encoded));
        return topdiv.children();
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     */
    updateSel(item: string, val: string): void {
        this.setChar(item, val);
    }

    /**
     * Locate a string and update the UI
     */
    findPossible(str: string): void {
        let encoded = this.minimizeString(this.state.cipherString);
        if (str === undefined) {
            str = "";
        }
        this.state.findString = str;
        if (str === "") {
            $(".findres").empty();
            return;
        }

        str = this.minimizeString(str.toUpperCase());
        if (this.state.cipherType === ICipherType.Patristocrat) {
            encoded = encoded.replace(/\s+/g, "");
            str = str.replace(/\s+/g, "");
        }
        //
        // Look for all possible matches for the pattern.
        let res = this.searchPattern(encoded, 1, str, 1);
        if (res === "") {
            res = "<br/><b>Not Found</b>";
        } else {
            let charset = this.getCharset();
            let tres =
                '<table class="mfind cell shrink"><thead><tr><th>Pos</th><th>Match</th>';
            for (let key of charset) {
                tres += "<th>" + key + "</th>";
            }
            res = tres + "</tr></thead><tbody>" + res + "</tbody></table>";
        }

        $(".findres").html(
            "Searching for " + str + " as " + this.normalizeHTML(str) + res
        );
        this.attachHandlers();
    }

    /**
     * Searches for a string (drags a crib through the crypt)
     * @param encoded Encoded string
     * @param encodewidth Width of characters in the string
     * @param tofind Pattern string to find
     * @param findwidth Width of characters in the pattern
     */
    // tslint:disable-next-line:cyclomatic-complexity
    searchPattern(
        encoded: string,
        encodewidth: number,
        tofind: string,
        findwidth: number
    ): string {
        let res: string = "";
        let notmapped: string = "????".substr(0, findwidth);
        let searchstr: string = this.makeUniquePattern(tofind, findwidth);
        if (findwidth > 1) {
            tofind += "XXXX".substr(0, findwidth - (tofind.length % findwidth));
        }
        let i, len;
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

        for (i = 0; i + searchlen * encodewidth <= encrlen; i += encodewidth) {
            let checkstr = encoded.substr(i, searchlen * encodewidth);
            let check = this.makeUniquePattern(checkstr, encodewidth);
            // console.log(i + ':"' + check + '/' + encoded.substr(i, searchlen) + '" for "' + searchstr + '/'+tofind+ '"');
            if (check === searchstr) {
                let keymap = {};
                let j;
                let matched;
                //
                // Build the character mapping table to show what they would use
                matched = true;
                //let charset = this.getCharset();
                for (j = 0; j < charset.length; j++) {
                    keymap[charset.substr(j, 1)] = notmapped;
                }
                // Show the matching characters in order
                for (j = 0; j < searchlen; j++) {
                    let keystr = tofind.substr(j * findwidth, findwidth);
                    keymap[checkstr.substr(j, 1)] = keystr;
                    if (findwidth === 1 && keystr === checkstr.substr(j, 1)) {
                        matched = false;
                    }
                }
                // We matched, BUT we need to make sure that there are no signs that preclude it from
                if (findwidth > 1) {
                    // Check the preceeding character to see if we have a match for it.  The preceeding
                    // character can not be known to be a dot or a dash when dealing with morse code
                    if (i > 0 && tofind.substr(0, 1) !== "X") {
                        let preceeding = encoded.substr(i - 1, 1);
                        prevchar = keymap[preceeding].substr(findwidth - 1, 1);
                        if (prevchar !== "X" && prevchar !== "?") {
                            console.log(
                                "*** Disallowing " +
                                    checkstr +
                                    " because prevchar =" +
                                    prevchar +
                                    " for " +
                                    preceeding
                            );
                            matched = false;
                        }
                    }
                    // Likewise, the following character must also not be a dot or a dash.
                    if (
                        matched &&
                        tofind.substr(tofind.length - 1, 1) !== "X" &&
                        i + searchlen < encrlen
                    ) {
                        let following = encoded.substr(i + searchlen, 1);
                        let nextchar = keymap[following].substr(0, 1);
                        if (nextchar !== "X" && prevchar !== "?") {
                            console.log(
                                "*** Disallowing " +
                                    checkstr +
                                    " because nextchar =" +
                                    nextchar +
                                    " for " +
                                    following
                            );
                            matched = false;
                        }
                    }
                } else {
                    let repl = this.genReplPattern(checkstr);
                    if (!this.isValidReplacement(tofind, repl, used)) {
                        // console.log('*** Disallowing ' + checkstr + ' because not valid replacement for ' + tofind);
                        matched = false;
                    }
                }
                if (matched) {
                    let maptable = "";
                    let mapfix = "";
                    for (j = 0; j < charset.length; j++) {
                        let key = charset.substr(j, 1);
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
    saveSolution(): void {
        let str = this.cleanString(this.state.cipherString).toUpperCase();
        let solved = true;
        let solution = "";
        for (let c of str) {
            if (this.isValidChar(c)) {
                if (
                    this.state.replacement[c] !== undefined &&
                    this.state.replacement[c] !== ""
                ) {
                    solution += this.state.replacement[c];
                } else {
                    solution += "?";
                    solved = false;
                }
            } else {
                solution += c;
            }
        }
        this.state.solved = solved;
        this.state.solution = solution;
    }
    /**
     * Builds the GUI for the solver
     */
    build(): JQuery<HTMLElement> {
        let str = this.cleanString(this.state.cipherString);
        let res = "";
        let combinedtext = "";
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        let posthead1 = '</tr></tbody></table><div class="repl" data-chars="';
        let posthead2 = '"></div></div>';
        let pre = prehead;
        let datachars = "";
        let charset = this.getCharset();
        this.freq = {};
        for (let c of charset.toUpperCase()) {
            this.freq[c] = 0;
        }

        for (let i = 0, len = str.length; i < len; i++) {
            let t = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(t)) {
                if (isNaN(this.freq[t])) {
                    this.freq[t] = 0;
                }
                this.freq[t]++;

                datachars += t;
                combinedtext += '<span data-char="' + t + '">?</span>';
                t =
                    pre +
                    '<td><div class="slil">' +
                    t +
                    "</div>" +
                    '<input type="text" id="ti' +
                    i +
                    '" class="sli" data-char="' +
                    t +
                    '" /></td>';

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
     * Change multiple characters at once.
     * @param reqstr String of characters to set
     */
    setMultiChars(reqstr: string): void {
        console.log("setStandardMultiChars " + reqstr);
        this.holdupdates = true;
        for (let i = 0, len = reqstr.length / 2; i < len; i++) {
            let repchar = reqstr.substr(i * (this.cipherWidth + 1), 1);
            let newchar = reqstr.substr(
                i * (this.cipherWidth + 1) + 1,
                this.cipherWidth
            );
            console.log("Set " + repchar + " to " + newchar);
            this.updateSel(repchar, newchar);
        }
        this.holdupdates = false;
        this.updateMatchDropdowns("");
    }
    /**
     * Change two sets of characters at once.  Unlike setMultiChars which
     * expects the characters to be interleaved, this assumes two separate strings
     * of characters which we would expect to be the same length.
     * @param repchars Cipher text characters
     * @param newchars New replacement characters
     */
    setCharStrings(repchars: string, newchars: string): void {
        this.holdupdates = true;
        for (let i = 0; i < repchars.length; i++) {
            this.setChar(repchars.substr(i, 1), newchars.substr(i, 1));
        }
        this.holdupdates = false;
        this.updateMatchDropdowns("");
    }
    /**
     * Generates the Match dropdown for a given string
     * @param str Pattern string to generate match dropdown
     */
    genMatchDropdown(str: string): JQuery<HTMLElement> {
        if (
            this.state.curlang === "" ||
            !this.Frequent.hasOwnProperty(this.state.curlang)
        ) {
            return $("");
        }
        // Get a template for the pattern of the word so that we can subset
        // which words we will pull from the precompiled language
        let pat = this.makeUniquePattern(str, 1);
        let repl = this.genReplPattern(str);
        let mselect = $("<select/>").addClass("match");
        if (typeof this.Frequent[this.state.curlang][pat] !== "undefined") {
            let matches = this.Frequent[this.state.curlang][pat];
            let selectclass = "";
            let matched = false;
            let added = 0;
            let used: BoolMap = {};
            let charset = this.getCharset().toUpperCase();
            for (let c of charset) {
                used[c] = false;
            }
            for (let c of charset) {
                used[this.state.replacement[c]] = true;
            }

            for (let i = 0, len = matches.length; i < len; i++) {
                let entry = matches[i];
                if (this.isValidReplacement(entry[0], repl, used)) {
                    if (!matched) {
                        selectclass = "l" + entry[3];
                    }
                    if (!matched) {
                        mselect.append(
                            $("<option/>", { selected: "", disabled: "" })
                                .addClass("l" + entry[3])
                                .text(entry[0])
                        );
                    }
                    mselect.append(
                        $("<option/>")
                            .addClass("l" + entry[3])
                            .text(entry[0])
                    );
                    added++;
                    matched = true;
                    /*    } else if (entry[1] < 100 && added < 9) {
                    if (selectclass === '') {
                        selectclass = entry.c;
                    }
                    added++;
                    $('<option/>').addClass('l'+entry[3] + ' nomatch').text(entry.t).appendTo(mselect);
*/
                }
                if (matched && added > 9) {
                    break;
                }
            }
            if (added === 0) {
                selectclass = "nopat";
            }
            mselect.addClass(selectclass);
        } else {
            mselect.addClass("nopat");
        }
        return mselect;
    }
    /**
     * Update all of the match dropdowns in response to a change in the cipher mapping
     * @param reqstr String to optimize updates for (mostly ignored)
     */
    updateMatchDropdowns(reqstr: string): void {
        this.UpdateReverseReplacements();
        $("[data-chars]").each((i, elem) => {
            $(elem)
                .empty()
                .append(this.genMatchDropdown($(elem).attr("data-chars")));
        });
        this.attachHandlers();
    }
    /**
     * Attach handlers to any newly created DOM Elements
     */
    attachHandlers(): void {
        super.attachHandlers();
        $("#encoded")
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
        $("#loadeng")
            .off("click")
            .on("click", e => {
                this.loadLanguage("en");
            });
        $("a.dapply")
            .off("click")
            .on("click", e => {
                let mapfix = $(e.target).attr("data-mapfix");
                this.markUndo(null);
                this.setMultiChars(mapfix);
            });
        $(".sortable").each((i: number, elem: HTMLElement) => {
            sortable(elem, "destroy");
            sortable(elem)[0].addEventListener("sortupdate", e => {
                this.markUndo(null);
                this.getReplacementOrder();
            });
        });
        $(".match")
            .off("change")
            .on("change", e => {
                this.markUndo(null);
                let newchars = $(e.target).val() as string;
                let repchars = $(e.target)
                    .parent("[data-chars]")
                    .attr("data-chars");
                this.setCharStrings(repchars, newchars);
            });
    }
}
