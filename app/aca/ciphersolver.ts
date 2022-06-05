import { Sortable } from "@shopify/draggable";
import {
    BoolMap,
    cloneObject,
    NumberMap,
    setDisabled,
    StringMap,
} from "../common/ciphercommon";
import {
    CipherHandler,
    IEncodeType,
    IState,
    menuMode,
    toolMode,
} from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import {
    JTFLabeledInput,
    JTFLabeledInputApply,
} from "../common/jtflabeledinput";
import { JTTable } from "../common/jttable";

export class CipherSolver extends CipherHandler {
    public sortable: Sortable;
    public activeToolMode: toolMode = toolMode.aca;
    public defaultstate: IState = {
        /** The current cipher type we are working on */
        cipherType: ICipherType.Aristocrat,
        cipherString: "" /** The current string we are looking for */,
        findString: "",
        locked: {},
        replacement: {},
        replOrder: "",
        userModified: false,
    };
    public state: IState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Load English", color: "primary", id: "loadeng" },
        { title: "Reset", color: "warning", id: "reset" },
    ];
    /** Cache the last encoded string to optimize updates */
    public lastencoded: string = undefined;
    public totfreq: number;
    /**
     * Initializes the encoder/decoder. (EN is the default)
     * @param lang Language - default = "EN" for english
     */
    public init(lang: string): void {
        this.setMenuMode(menuMode.aca);
        super.init(lang);
    }
    /**
     * Make a copy of the current state
     */
    public save(): IState {
        this.saveSolution();
        // We need a deep copy of the save state
        let savestate = cloneObject(this.state) as IState;
        return savestate;
    }
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IState): void {
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
        this.setCipherString(this.state.cipherString);
        let encodeType: IEncodeType = "random";
        if (this.state.question !== undefined) {
            let ktype = this.state.question
                .toLowerCase()
                .replace(new RegExp("^.*\\D(k[1-4])\\D.*$", "g"), "$1");

            if (ktype.length === 2) {
                encodeType = ktype as IEncodeType;
            }
        }
        this.setEncType(encodeType);
    }
    /**
     * Updates the stored state cipher string
     * @param cipherString Cipher string to set
     */
    public setCipherString(cipherString: string): boolean {
        let changed = super.setCipherString(cipherString);
        if (Object.keys(this.freq).length === 0 && cipherString !== "") {
            this.freq = {};
            this.totfreq = 0;
            for (let c of this.getCharset().toUpperCase()) {
                this.freq[c] = 0;
            }
            for (let c of this.state.cipherString.toUpperCase()) {
                if (this.isValidChar(c)) {
                    this.freq[c]++;
                    this.totfreq++;
                }
            }
        }
        return changed;
    }
    /**
     * Sets the encoding type for the cipher
     * @param encodeType Type of encoding random/k1/k2/k3/k4
     */
    public setEncType(encodeType: IEncodeType): boolean {
        let changed = false;
        if (this.state.encodeType !== encodeType) {
            this.state.encodeType = encodeType;
            changed = true;
        }
        return changed;
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.aca);
        $(".err").empty();
        this.showQuestion();
        $("#encoded").val(this.state.cipherString);
        this.load();
        this.holdupdates = true;
        // Populate all the matches
        this.propagateReplacements();
        this.holdupdates = false;
        this.updateMatchDropdowns(undefined);
        // And restore any finds that may have been in progress
        $("#find").val(this.state.findString);
        this.findPossible(this.state.findString);
        this.updateKeywordApply();
    }
    /**
     * Display the question text if there is any
     */
    public showQuestion(): void {
        const result = $("#qtext");
        result.empty()

        const elem = $("<div/>", {
            class: "callout primary",
        })
        this.genQuestionUsage(elem);

        if (this.state.question !== "") {

            elem.append(
                $("<h3/>").html(this.state.question)
            );
        }
        result.append(elem);
    }

    /**
     * 
     * @param entry Test entry to get title for
     * @param num Default question number if title is not found
     * @returns displayable string for the entry
     */
    public getConTitle(entry: number, num: number): string {
        const state = this.getFileEntry(entry);
        let result = undefined
        if (state !== null) {
            if (state.qnum !== undefined && state.qnum !== "") {
                result = state.qnum;
            } else {
                result = `CON #${num + 1}`
            }
        }
        return result
    }
    /**
     * Get a URL for a solver for a CON
     * @param entry Which cipher entry to open solver for
     */
    public getSolveCipherURL(entry: number): string {
        let state = this.getFileEntry(entry);
        if (state === null) {
            return ""
        }
        let solveURL = this.getSolveURL(state);
        if (solveURL !== "") {
            if (solveURL.indexOf("?") > -1) {
                solveURL += "&editEntry=" + entry;
            } else {
                solveURL += "?editEntry=" + entry;
            }
        }
        return solveURL;
    }
    /**
     * 
     * @param elem Element to put usage into
     */
    public genQuestionUsage(result: JQuery<HTMLElement>): void {
        if (this.savefileentry !== -1) {
            // Find out what tests this is a part of
            const testCount = this.getTestCount();
            for (let entry = 0; entry < testCount; entry++) {
                const test = this.getTestEntry(entry);
                let use = '';
                let prevq, nextq, prevtxt, nexttxt;
                let prevURL = undefined;
                let nextURL = undefined;

                // See if this is one of the questions on the test
                const qnum = test.questions.indexOf(this.savefileentry);
                if (qnum !== -1) {
                    use = this.getConTitle(test.questions[qnum], qnum)

                    if (qnum > 0) {
                        // It is not the first, use the previous entry.
                        prevq = test.questions[qnum - 1];
                        prevtxt = this.getConTitle(prevq, qnum);
                        prevURL = this.getSolveCipherURL(prevq)
                        if (prevtxt === undefined) {
                            prevq = undefined;
                        }
                    }
                    // If it isn't the last, the next is the one after it
                    if (qnum < test.questions.length) {
                        nextq = test.questions[qnum + 1];
                        nexttxt = this.getConTitle(nextq, qnum + 1)
                        nextURL = this.getSolveCipherURL(nextq)
                        if (nexttxt === undefined) {
                            nextq = undefined;
                        }
                    }
                }
                if (use !== '') {
                    // It is used as a con.  First we need to find out if the
                    // question is actually appropriate for the test.
                    // To do this we need to load the class for the question
                    const link = $('<a/>', {
                        class: 'chkmod',
                        href: 'ACAProblems.html?test=' + String(entry),
                    }).text(test.title + ' ' + use);

                    const testset = $('<div/>', { class: 'testset2' });

                    if (prevq !== undefined) {
                        let linkprev = $('<a/>', { class: 'prevnav chkmod', href: prevURL, })
                        if (prevURL === "") {
                            linkprev = $("<span/>", { class: 'prevnav nosolver chkmod' })
                        }
                        linkprev.text(prevtxt);
                        testset.append(linkprev).append(' ');
                    }
                    testset.append(link);
                    if (nextq !== undefined) {
                        let linknext = $('<a/>', { class: 'nxtnav chkmod', href: nextURL, })
                        if (nextURL === "") {
                            linknext = $("<span/>", { class: 'nxtnav nosolver chkmod' })
                        }
                        linknext.text(nexttxt);
                        testset.append(linknext).append(' ');
                    }
                    result.append(testset);
                }
            }
        }
    }


    /**
     * Given an alphabet string, normalize it eliminating all of the
     * letters in alphabetic order, returning any remaining string
     * (which may include ? characters for unknowns)
     * The best way to do this is to find the longest string of incrementing
     * characters and then use the rest of the string.  Note that we have
     * to handle wrapping.
     * @param str Alphabet string to normalize
     */
    public extractKeyword(str: string): string {
        let res = "";
        let curstart = 0;
        let curlen = 0;
        let beststart = -1;
        let firstWord = true;
        let firstChar = true;
        let firstidx = -1;
        let firstlen = 0;
        let unknowns = 0;
        let bestlen = 0;
        let charset = this.getSourceCharset();
        let previdx = -str.length;
        for (let i = 0; i < str.length; i++) {
            let c = str.substring(i, i + 1);
            let idx = charset.indexOf(c);
            // If this is a valid character that is greater than the
            // previous one then we just increase our length
            if (idx !== -1) {
                if (idx > previdx + unknowns) {
                    curlen += unknowns + 1;
                    if (firstWord) {
                        firstlen++;
                    }
                    // For the very first character, we need to know how much
                    // it would have to be offset from the end string.
                    if (firstChar) {
                        firstidx = idx - unknowns;
                        firstChar = false;
                    }
                } else {
                    // Otherwise we hit the end of a string,
                    // see if it is longer than anything else we found
                    if (curlen > bestlen) {
                        bestlen = curlen;
                        beststart = curstart;
                    }
                    // And we start gathering again
                    curstart = i;
                    curlen = 1;
                    firstWord = false;
                }
                previdx = idx;
                unknowns = 0;
            } else {
                // Not a valid character, it is just a gap.
                unknowns++;
            }
        }
        // We got to the end, now we need to see if the start can go after the
        // end and we have a wraparound case (which is most likely)
        if (firstidx > previdx + unknowns && curlen + firstlen > bestlen) {
            res = str.substr(firstlen, str.length - (firstlen + curlen));
        } else if (curlen > bestlen) {
            res = str.substr(curstart + curlen) + str.substr(0, curstart);
        } else {
            res = str.substr(beststart + bestlen) + str.substr(0, beststart);
        }
        return res;
    }
    /**
     * Figure out what the potential keyword is
     */
    public computeKeyword(): string {
        let keyword = "";
        // Get the two strings (regardless of whether we need them both or not)
        let sourceAlphabet = this.getReplacementOrder();
        let destAlphabet = this.getDestAlphabet();

        if (this.state.encodeType === "k1") {
            keyword = this.extractKeyword(this.getDestAlphabet()).toLowerCase();
        } else if (this.state.encodeType === "k2") {
            keyword = this.extractKeyword(
                this.getReverseAlphabet(sourceAlphabet)
            ).toUpperCase();
        } else {
            let keyword1 = this.extractKeyword(sourceAlphabet).toLowerCase();
            let keyword2 = this.extractKeyword(destAlphabet).toLowerCase();
            if (this.state.encodeType === "k3" && keyword1 === keyword2) {
                keyword = keyword1;
            } else if (this.state.encodeType === "k4") {
                keyword = keyword1 + "/" + keyword2.toUpperCase();
            }
        }
        return keyword;
    }
    /**
     * Eliminate all duplicate characters in a string
     * @param str Source string to clean up
     */
    public genKeywordAlphabet(str: string): string {
        let result = "";
        let found: BoolMap = {};
        for (let c of (this.minimizeString(str) + this.getSourceCharset()).toUpperCase()) {
            if (found[c] !== true) {
                result += c;
                found[c] = true;
            }
        }
        return result;
    }
    /**
     * This permutes a string to match a currently given string mapping.
     * It is used for applying a string onto an alphabet.  Basically this
     * involves rotating the map string so that it matches the target and
     * then making sure that every valid character in the mapped string is
     * legal in the target.  Any errors will be displayed in the error
     * @param mapStr String to map
     * @param targetStr String to map it onto
     */
    public mapAlphabet(mapStr: string, targetStr: string): string {
        let mapped = mapStr;
        let foundmap = false;
        // First figure out the shift offset
        for (let i = 0; i < mapStr.length; i++) {
            let c = mapStr.substring(i, i + 1);
            if (this.isValidChar(c)) {
                let t = this.state.replacement[c];
                if (t !== "" && t !== undefined) {
                    let idx = targetStr.indexOf(t);
                    if (idx !== -1) {
                        idx = ((i - idx) + mapStr.length) % mapStr.length
                        foundmap = true;
                        mapped = mapStr.substring(idx) + mapStr.substring(0, idx);
                        break;
                    }
                }
            }
        }
        if (!foundmap) {
            $(".err")
                .empty()
                .append(
                    $("<div>", { class: "callout warning" }).text(
                        "Unable to map because there are no valid characters mapped in order to determine the shift of the alphabets"
                    )
                );
            return undefined;
        }
        // Now check everything in the mapped string to make sure it is ok with
        // the target.  If they are both valid characters but not the same,
        // We need to generate an error message
        for (let i = 0; i < mapped.length; i++) {
            let c = mapped.substring(i, i + 1);
            let m = targetStr.substring(i, i + 1);
            let t = this.state.replacement[c]
            if (this.isValidChar(c) && t !== m && this.isValidChar(t) && this.isValidChar(m)) {
                $(".err")
                    .empty()
                    .append(
                        $("<div>", { class: "callout warning" }).text(
                            "Unable to map because " +
                            t +
                            " and " +
                            m +
                            " would collide for a mapping of " + c + "."
                        )
                    );
                return undefined;
            }
        }
        return mapped;
    }
    /**
     * Apply the current keyword to the replacement map.
     */
    public applyKeyword(): void {
        let keywords = this.state.keyword.split("/", 2);
        let mapping1 = undefined
        let mapping2 = undefined;
        let alphabet1 = this.genKeywordAlphabet(keywords[0]);
        let alphabet2 = this.genKeywordAlphabet(keywords[1]);
        let sourceAlphabet = this.getReplacementOrder();
        let destAlphabet = this.getDestAlphabet();
        // First we need to figure out where the keyword is going.
        // For each type of mapping type it is different.
        switch (this.state.encodeType) {
            case "k1":
                mapping1 = this.getSourceCharset();
                mapping2 = alphabet1
                break;
            case "k2":
                mapping1 = alphabet1;
                mapping2 = this.getSourceCharset();
                break;
            case "k3":
                mapping1 = alphabet1;
                mapping2 = alphabet1;
                break;
            case "k4":
                mapping1 = alphabet1;
                mapping2 = alphabet2;
                break;
            default:
                break;
        }
        if (mapping1 != undefined && mapping2 != undefined) {
            mapping1 = this.mapAlphabet(mapping1, mapping2);
            if (mapping1 !== undefined && mapping2 !== undefined) {
                this.setCharStrings(mapping1, mapping2);
            }
        }

        return;
    }
    /**
     * Update the title for the Keyword input field, hiding it
     * if there is no keyword given.  Also, enable the apply button for the
     * keyword if it is possible to apply it.
     */
    public updateKeywordApply(): void {
        let ktitles = {
            k1: "K1 keyword",
            k2: "K2 keyword",
            k3: "K3 keyword",
            k4: "K4 keywords",
        };
        // ABCDEFGHIJKLMNOPQRSTUVWXYZ K1 GTD CDEFGHI
        // xzkeywordabcfghijlmnpqstuv one keyword

        // XZKEYWORDABCFGHIJLMNPQSTUV K2 HGY BYUSILE
        // abcdefghijklmnopqrstuvwxyz one keyword

        // XZKEYWORDABCFGHIJLMNPQSTUV K3 DQW YWORDAB
        // uvxzkeywordabcfghijlmnpqst one keyword

        // XZKEYWORDABCFGHIJLMNPQSTUV K4 CZQ MBEZQTGU
        // vwxyzalphbetcdfgijkmnoqrsu two keywords

        let title = ktitles[this.state.encodeType];
        if (title !== undefined) {
            if (!this.state.userModified) {
                let keyword = this.computeKeyword();

                // Figure out if it is safe to replace the keyword
                this.state.keyword = keyword;
            }
            $("#keyword")
                .val(this.state.keyword)
                .parent()
                .show()
                .find(".input-group-label")
                .text(title);
            setDisabled("#appkeyword", !this.state.userModified);
        } else {
            $("#keyword")
                .parent()
                .hide();
        }
    }
    /**
     * Propagate all of the replacement characters to the UI
     */
    public propagateReplacements(): void {
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
        return result;
    }
    /**
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(
            JTFLabeledInputApply(
                "Keyword(s)",
                "text",
                "keyword",
                this.state.keyword,
                "",
                "appkeyword",
                "Apply"
            )
        );
        result.append($("<div>", { class: "err" }));
        result.append(this.genFindCommands());
        return result;
    }
    /**
     * Generate a find box and holder for the search results.
     */
    public genFindCommands(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "grid-x" });
        result.append(
            JTFLabeledInput(
                "Find spot for",
                "text",
                "find",
                this.state.findString,
                ""
            )
        );
        result.append($("<div/>", { class: "findres cell" }));
        return result;
    }
    /**
     * Generates an HTML representation of a string for display
     * @param str String to normalize
     */
    public normalizeHTML(str: string): string {
        return str;
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
    public reset(): void {
        this.state.replacement = {};
        this.updateOutput();
    }
    /**
     * Creates an HTML table to display the frequency of characters
     */
    public createFreqEditTable(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "clearfix" });
        let table = new JTTable({ class: "tfreq" });

        let headrow = table.addHeaderRow();
        let freqrow = table.addHeaderRow();
        let replrow = table.addHeaderRow();
        let altreprow;
        if (this.ShowRevReplace) {
            altreprow = table.addHeaderRow();
        }
        let replOrder = this.getReplacementOrder();

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
     * Get the saved replacement order (if any)
     */
    public getReplacementOrder(): string {
        let charset = this.getSourceCharset();
        let replOrder = this.state.replOrder;
        if (replOrder === "") {
            replOrder = charset;
        }
        return replOrder;
    }
    /**
     * Get the destination alphabet (in order of the source alphabet)
     */
    public getDestAlphabet(): string {
        let sourceAlphabet = this.getReplacementOrder();
        let destAlphabet = "";
        for (let c of sourceAlphabet) {
            let t = this.state.replacement[c];
            if (t === "" || t === undefined) {
                t = "?";
            }
            destAlphabet += t;
        }
        return destAlphabet;
    }
    /**
     * Generate the K2 mapping of an alphabet
     * @param src Source alphabet order to map
     */
    public getReverseAlphabet(src: string): string {
        let result = "";
        let replalphabet = {};
        for (let c of this.getSourceCharset().toUpperCase()) {
            replalphabet[this.state.replacement[c]] = c;
        }
        for (let c of src) {
            let t = replalphabet[c];
            if (t === "" || t === undefined) {
                t = "?";
            }
            result += t;
        }
        return result;
    }
    public getSortedContainerIDs(container: HTMLElement): string[] {
        let result: string[] = [];
        $(container)
            .children()
            .each((i, elem) => {
                let li = $(elem);
                let eid = li.attr("id");

                if (
                    eid !== undefined &&
                    eid !== null &&
                    !li.hasClass("draggable--original") &&
                    !li.hasClass("draggable--mirror")
                ) {
                    result.push(eid);
                }
            });
        return result;
    }
    /**
     * Preserve the current replacement order
     */
    public saveReplacementOrder(container: HTMLElement): void {
        let ids = this.getSortedContainerIDs(container);
        let replOrder = "";
        for (let id of ids) {
            replOrder += id.substring(id.length - 1);
        }
        this.state.replOrder = replOrder;
    }
    /**
     * Create an edit field for a dropdown
     * @param c Character to make the dropdown for
     */
    public makeFreqEditField(c: string): JQuery<HTMLElement> {
        let repl = "";
        if (this.state.replacement !== undefined) {
            repl = this.state.replacement[c];
        }
        let einput = $("<input/>", {
            type: "text",
            class: "sli",
            "data-char": c,
            id: "m" + c,
            value: repl,
        });
        if (this.state.locked !== undefined && this.state.locked[c]) {
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
    public isort(a: any, b: any): number {
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
    public makeTopList(
        str: string,
        width: number,
        num: number
    ): JQuery<HTMLElement> {
        let tfreq = {};
        let tobjs = [];
        let work = "";
        let res = $("<span/>").text("None found");
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
            let piece = work.substring(i, i + width * this.cipherWidth);
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
            res = $("<ul/>");
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
                        final += extra + valtext.substring(vpos * 2, (vpos * 2) + 2);
                        extra = " ";
                    }
                    valtext = final;
                }

                $("<li/>")
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
    public genContactTable(encoded: string): JQuery<HTMLElement> {
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
        let res = $("<div/>");
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

        let minfreq = freq[consonantline.substring(12, 13)];
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
    public genAnalysis(encoded: string): JQuery<HTMLElement> {
        let topdiv = $("<div/>");

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
    public updateSel(item: string, val: string): void {
        this.setChar(item, val);
    }
    /**
     * Locate a string and update the UI
     * @param str String to look for
     */
    public findPossible(str: string): void {
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
        let res = this.searchPattern(encoded, str);
        if (res === "") {
            $(".findres")
                .empty()
                .append(
                    $("<div/>", { class: "callout error small" }).text(
                        "Unable to find " +
                        str +
                        " as " +
                        this.normalizeHTML(str)
                    )
                );
        } else {
            let charset = this.getCharset();
            let tres =
                '<table class="mfind cell shrink tablesort">' +
                "<thead><tr>" +
                '<th class="asc" data-col="0">Pos</th>' +
                '<th data-col="1">Match</th>' +
                '<th data-col="2">Fit</th>' +
                '<th data-col="3">Fit2</th>';
            for (let key of charset) {
                tres += "<th>" + key + "</th>";
            }
            res = tres + "</tr></thead><tbody>" + res + "</tbody></table>";
            $(".findres")
                .empty()
                .append(
                    $("<div/>", { class: "callout success small" }).text(
                        "Looking for" + str + " as " + this.normalizeHTML(str)
                    )
                )
                .append(
                    $("<div/>").text(
                        "Fit is chi-square, Fit2 is SUSSI algorithm, lower numbers are better.  Click on column header to sort."
                    )
                )
                .append($(res));
        }

        this.attachHandlers();
    }
    /**
     * Calculates the Chi Square value for a cipher string against the current
     * language character frequency
     */
    public CalculateCribFit(cribstr: string, checkstr: string): number {
        let total = 0;
        let logmsg = "|" + cribstr + "| HINT ";
        let logmsg2 = "|" + checkstr + "| HINT ";
        let logmsg3 = "";
        for (let i = 0; i < cribstr.length; i++) {
            let pt = cribstr.substring(i, i + 1);
            let ct = checkstr.substring(i, i + 1);
            let expected = this.langfreq[this.state.curlang][pt] * 1000.0;
            let matched = (this.freq[ct] * 1000.0) / this.totfreq;
            logmsg += " " + pt + "=" + expected;
            logmsg2 += " " + ct + "=" + matched.toPrecision(6);
            let delta = matched - expected;
            if (delta >= -1000) {
                total += delta * delta;
            }
            logmsg3 +=
                delta.toPrecision(6) +
                "<>" +
                (delta * delta).toPrecision(5) +
                "\n";
        }
        console.log(logmsg);
        console.log(logmsg2);
        console.log(logmsg3);
        return Math.round(total);
    }

    /**
     * Searches for a string (drags a crib through the crypt)
     * @param encoded Encoded string
     * @param tofind Pattern string to find
     */
    public searchPattern(encoded: string, tofind: string): string {
        let res = "";
        let notmapped = "?";
        let searchstr = this.makeUniquePattern(tofind, 1);
        let searchlen = searchstr.length;
        let encrlen = encoded.length;
        let charset = this.getCharset().toUpperCase();
        let used = this.getUsedMap();

        for (let i = 0; i + searchlen <= encrlen; i++) {
            let checkstr = encoded.substr(i, searchlen);
            let check = this.makeUniquePattern(checkstr, 1);
            // console.log(i + ':"' + check + '/' + encoded.substr(i, searchlen) + '" for "' + searchstr + '/'+tofind+ '"');
            if (check === searchstr) {
                let keymap = {};
                //
                // Build the character mapping table to show what they would use
                let matched = true;
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
                    // Calculate a match strength based on the chi-square
                    let matchfreq: NumberMap = {};
                    for (let key in keymap) {
                        let c = keymap[key];
                        matchfreq[c] = this.freq[key];
                    }
                    let matchval = this.CalculateCribChiSquare(
                        matchfreq
                    ).toFixed(2);
                    let matchval2 = this.CalculateCribFit(tofind, checkstr);
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
                        String(i + 1) +
                        '</td><td><a class="dapply" href="#" data-mapfix="' +
                        mapfix +
                        '">' +
                        checkstr +
                        "</a></td>" +
                        '<td class="chi">' +
                        matchval +
                        "</td>" +
                        '<td class="chi">' +
                        matchval2 +
                        "</td>" +
                        maptable +
                        "</tr>";
                }
            }
        }
        return res;
    }
    /**
     * Gets a map of all characters which are used as replacements
     */
    public getUsedMap(): BoolMap {
        let charset = this.getCharset().toUpperCase();
        let used: BoolMap = {};
        for (let c of charset) {
            used[c] = false;
        }
        for (let c of charset) {
            used[this.state.replacement[c]] = true;
        }
        return used;
    }

    /**
     * Save any complete solution
     */
    public saveSolution(): void {
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
        // Reconstruct the two source alphabet strings and normalize them
        let extra = "";
        switch (this.state.encodeType) {
            case "k1":
            case "k3":
                extra = this.state.keyword.toLowerCase() + ". ";
                break;
            case "k2":
                extra = this.state.keyword.toUpperCase() + ". ";
                break;
            case "k4":
                let pieces = this.state.keyword.split("/", 2);
                if (pieces.length < 2) {
                    pieces.push("?");
                }
                extra =
                    pieces[0].toLowerCase() +
                    "/" +
                    pieces[1].toUpperCase() +
                    ". ";
                break;
            default:
                break;
        }
        this.state.solved = solved;
        this.state.solution = extra + solution;
    }
    /**
     * Builds the GUI for the solver
     */
    public build(): JQuery<HTMLElement> {
        let str = this.cleanString(this.state.cipherString);
        let res = "";
        let combinedtext = "";
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        let posthead1 = '</tr></tbody></table><div class="repl" data-chars="';
        let posthead2 = '"></div></div>';
        let pre = prehead;
        let datachars = "";

        for (let i = 0, len = str.length; i < len; i++) {
            let t = str.substring(i, i + 1).toUpperCase();
            if (this.isValidChar(t)) {
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
    public setMultiChars(reqstr: string): void {
        console.log("setStandardMultiChars " + reqstr);
        this.holdupdates = true;
        for (let i = 0; i < reqstr.length; i += this.cipherWidth + 1) {
            let repchar = reqstr.substring(i, i + 1);
            let newchar = reqstr.substring(i + 1, i + 1 + this.cipherWidth);
            console.log("Set " + repchar + " to " + newchar);
            this.updateSel(repchar, newchar);
        }
        this.holdupdates = false;
        this.updateMatchDropdowns("");
        this.updateOutput();
    }
    /**
     * Change two sets of characters at once.  Unlike setMultiChars which
     * expects the characters to be interleaved, this assumes two separate strings
     * of characters which we would expect to be the same length.
     * @param repchars Cipher text characters
     * @param newchars New replacement characters
     */
    public setCharStrings(repchars: string, newchars: string): void {
        this.holdupdates = true;
        for (let i = 0; i < repchars.length; i++) {
            this.setChar(repchars.substring(i, i + 1), newchars.substring(i, i + 1));
        }
        this.holdupdates = false;
        this.updateMatchDropdowns("");
    }
    /**
     * Generates the Match dropdown for a given string
     * @param str Pattern string to generate match dropdown
     */
    public genMatchDropdown(str: string): JQuery<HTMLElement> {
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
                            $("<option/>", {
                                selected: "",
                                disabled: "",
                            })
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
    public updateMatchDropdowns(reqstr: string): void {
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
    public attachHandlers(): void {
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
        $("#keyword")
            .off("input")
            .on("input", e => {
                let keyword = $(e.target).val() as string;
                if (keyword !== this.state.keyword) {
                    this.markUndo("keyword");
                    this.state.keyword = keyword;
                    this.state.userModified = true;
                    this.updateOutput();
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
            if (this.sortable !== undefined) {
                this.sortable.destroy();
            }
            this.sortable = new Sortable(elem, {
                draggable: "li",
            });
            this.sortable.on("drag:stop", () => {
                this.markUndo(null);
                this.saveReplacementOrder(elem);
            });
        });
        $("#appkeyword")
            .off("click")
            .on("click", e => {
                this.markUndo("appkeyword");
                this.applyKeyword();
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
