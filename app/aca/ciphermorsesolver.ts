import { cloneObject, setDisabled, StringMap } from "../common/ciphercommon";
import { IState, menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTFLabeledInput } from "../common/jtflabeledinput";
import { JTTable } from "../common/jttable";
import { frommorse, morseClass, morsedigitClass, tomorse } from "../common/morse";
import { CipherSolver } from "./ciphersolver";
/**
 * CipherMorseSolver is the base class for all Morse Code based solvers
 */
export class CipherMorseSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    /** Morse Lookup table overridden by the subclasses */
    public readonly morseReplaces: string[] = [];
    public defaultstate: IState = {
        cipherType: ICipherType.None,
        replacement: {},
        cipherString: "",
        locked: {},
        findString: "",
    };
    public state: IState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset" },
    ];
    /**
     * Marks a symbol as locked and prevents it from being changed in the interactive solver
     * @param crepl Symbol to be marked as locked/unlocked
     * @param lock new state for the symbol
     */
    public updateCheck(crepl: string, lock: boolean): void {
        let c;
        for (let key in this.state.replacement) {
            if (this.state.replacement[key] === crepl) {
                c = key;
                break;
            }
        }
        if (c !== undefined && this.state.locked[c] !== lock) {
            this.state.locked[c] = lock;
            this.UpdateFreqEditTable();
            this.load();
        }
    }
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: IState): void {
        this.state = cloneObject(this.defaultstate) as IState;
        this.copyState(this.state, data);
        this.UpdateFreqEditTable();

        this.setUIDefaults();
        this.updateOutput();
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.aca);
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
        this.state.replacement = {};
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
    public genAnalysis(str: string): JQuery<HTMLElement> {
        return null;
    }
    /**
     * When building a Morbit or Fractionated Morse, we want to create the table with three rows.
     * the top row is the input characters each with a colspan of 2.  This
     * is because each character in the Morbit expands to two morse code characters
     * We will ensure that the table is always an even number of columns so that
     * an input chais the input characters each with a colspan of 2.  This
     * is because each character in the Morbit expands to two morse code characters
     * We will ensure that the table is always an even number of columns so that
     * an input character never spans tables.  "known" entries are created with a
     * "known" class so that it can be stylized
     *
     * the second row is each character of the morse code.  Dashes, Spaces and Dots
     * are all created with the corresponding classes.
     *
     * the third row of the table is more interesting.  We have several cases to
     * consider here.
     * If the length of the morse code for the current decryption is shorter than
     * the remaining columns in the table then we are good and can output the column
     * with a colspan for the morse character.
     * If the length of the morse code is longer than the remaining columns in the table
     * then we need to see if at least half will fit in this table.
     * If so, then we output with a colspan to fill the remainder of the table and start
     * the continuation table with and empty cell with a colspan for the leftover portion
     * marked with a "cont" class.
     * If not, then we output a colspan to fill the remainder of the table with an empty cell
     * marked with a "cont" class and output the data at the start of the continuation table
     *
     * To output the data for this, we have four possibilities
     * 1- If it is a null space (i.e. an x immediately after a . or -) then we ouput an empty
     *    cell with a class of "null"
     * 2- If it is a space after a null (i.e. an x immediately after a single preceeding x) then
     *    we output an empty cell with a class of "space"
     * 3- if it is an error null (i.e. an x at the start of the string or an x preceeded by 2 or more x)
     *    or a bad morse code
     *    then we output a cell with a class of "error"
     * 4- Otherwise it is a valid morse code string and we output the cell with the class from the morseClass
     */
    public build(): JQuery<HTMLElement> {
        let str = this.cleanString(this.state.cipherString);
        let topdiv = $("<div/>").addClass("sword");
        let table = $("<table/>").addClass("mword");
        let tbody = $("<tbody/>");
        let inrow = $("<tr/>");
        let morserow = $("<tr/>");
        let outrow = $("<tr/>");
        let c, morseclass;
        let remaining;
        let lastsep = "XX"; // Start out with a few Xs so that an initial X generates an error
        let partial = false;
        let extraout = "";
        let extralen = 0;
        let extraclass = "";
        let intext = "";
        let morsetext = "";
        let cipherwidth = this.cipherWidth;
        let finaltext = "";
        let docwidth = $(document).width();
        let width = cipherwidth * Math.floor(docwidth / (cipherwidth * 36));
        this.state.solved = true;
        //
        // Build up the input string and the corresponding morse code
        // string.  We will guarantee that the morse code string is
        // exactly cipherwidth times the length of the input string
        //
        for (let i = 0, len = str.length; i < len; i++) {
            c = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(c)) {
                intext += c;
                // Figure out what this character corresponds to.  If it
                // has no mapping, we will use filler ?? values just to
                // keep things running smoothly.  It will ensure that we
                // don't get a valid morse code string
                let morsepiece = this.state.replacement[c];
                if (morsepiece === undefined) {
                    morsepiece = "";
                }
                morsepiece += "????";
                morsetext += morsepiece.substr(0, cipherwidth);
            }
        }
        //
        // Put an X on the end of the morsetext so that we can count on it
        // being there, but we will never output it because it is one past
        // the corresponding spot for all input characters
        //
        morsetext += "XXX";
        remaining = width;
        //
        // Now that we have the strings, go through and output the rows
        //
        for (let i = 0, len = intext.length; i < len; i++) {
            c = intext.substr(i, 1);
            let mpos, td;
            td = $("<td/>", { colspan: cipherwidth });
            if (this.state.locked[c]) {
                td.addClass("locked");
            }
            td.text(c);
            inrow.append(td);
            for (mpos = 0; mpos < cipherwidth; mpos++) {
                let morse = morsetext.substr(i * cipherwidth + mpos, 1);
                morseclass = morsedigitClass[morse];
                if (morseclass === "") {
                    morseclass = "error";
                }
                morse = this.normalizeHTML(morse);
                morserow.append(
                    $("<td/>")
                        .addClass(morseclass)
                        .html(morse)
                );
                //
                // If we already have a prevailing span to cover our morse characters then
                // we don't need to do anything.
                //
                if (extralen) {
                    extralen--;
                } else {
                    let startpos = i * cipherwidth + mpos;
                    // We are guaranteed to find the X in the string because it was added to the
                    // end as an extra.
                    let mlen = morsetext.indexOf("X", startpos) - startpos;
                    // See if we just got an X (empty string)
                    // It either indicates the end of a character (single X)
                    // or the end of a word (double X)
                    // or an error (three or more X in a row)
                    if (mlen === 0) {
                        partial = false;
                        if (lastsep === "") {
                            outrow.append($("<td/>").addClass("cnull"));
                            lastsep = "X";
                        } else if (lastsep === "X") {
                            outrow.append($("<td/>").addClass("space"));
                            lastsep = "XX";
                            finaltext += " ";
                        } else {
                            this.state.solved = false;
                            outrow.append($("<td/>").addClass("error"));
                            finaltext += '<span class="error">?</span>';
                        }
                    } else {
                        let morselet = morsetext.substr(startpos, mlen);
                        lastsep = "";
                        let outchar = "";
                        // See if we have a partial string.
                        let qpos = morselet.indexOf("?");
                        if (qpos !== -1 || partial) {
                            partial = true;
                            mlen = 1;
                            if (qpos > 4) {
                                morseclass = "error";
                            } else {
                                morseclass = "unk";
                            }
                            outchar = morselet.substr(0, 1);
                            this.state.solved = false;
                            finaltext += '<span class="unk">?</span>';
                        } else if (typeof frommorse[morselet] === "undefined") {
                            // See if we have an invalid morse sequence.  If so
                            // our output class will be an error and replace the string with ??
                            morseclass = "error";
                            outchar = "??";
                            this.state.solved = false;
                            finaltext += '<span class="error">?</span>';
                        } else {
                            outchar = frommorse[morselet];
                            morseclass = morseClass[outchar];
                            finaltext += outchar;
                        }
                        // Now figure out how much of this string we are going to output
                        // When we are done, remaining has to be decremented by the number of cells
                        // that we used in this morselet
                        // extralen is set to how many extra characters will need to come out of
                        // subsequent columns
                        extralen = mlen - 1;
                        if (mlen <= remaining) {
                            outrow.append(
                                $('<td colspan="' + mlen + '"/>')
                                    .addClass(morseclass)
                                    .text(outchar)
                            );
                        } else {
                            // We won't fit. Figure out which side gets the character
                            // console.log('***NO FIT: remaining =' + remaining + ' mlen=' + mlen +
                            //             ' outchar=' + outchar + ' morseclass=' + morseclass+' extralen='+extralen)
                            if (remaining * 2 >= mlen) {
                                outrow.append(
                                    $('<td colspan="' + remaining + '"/>')
                                        .addClass(morseclass)
                                        .text(outchar)
                                );
                                extraout = "";
                                extraclass = "cont";
                            } else {
                                outrow.append(
                                    $(
                                        '<td colspan="' + remaining + '"/>'
                                    ).addClass("cont")
                                );
                                extraout = outchar;
                                extraclass = morseclass;
                            }
                        }
                    }
                }
                remaining--;
            }
            if (remaining <= 0) {
                // Time to close off one table and start another
                tbody.append(inrow);
                tbody.append(morserow);
                tbody.append(outrow);
                table.append(tbody);
                topdiv.append(table);

                table = $("<table/>").addClass("mword");
                tbody = $("<tbody/>");
                inrow = $("<tr/>");
                morserow = $("<tr/>");
                outrow = $("<tr/>");
                if (extralen > 0) {
                    outrow.append(
                        $('<td colspan="' + extralen + '"/>')
                            .addClass(extraclass)
                            .text(extraout)
                    );
                }
                remaining = width;
            }
        }
        // Finish off the table
        tbody.append(inrow);
        tbody.append(morserow);
        tbody.append(outrow);
        table.append(tbody);
        topdiv.append(table);
        this.state.solution = finaltext;
        topdiv.append($('<hr/><div class="ftext">' + finaltext + "</div>"));
        return topdiv;
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
        // We need the map of the reverse replacements
        let revRepl = this.getReverseReplacement();
        let result = $("<div/>", { class: "clearfix" });

        // First we need to output the frequency table for the letters.  This will
        // be short so we don't have to worry about it splitting.
        let table = new JTTable({ class: "tfreq" });
        let headrow = table.addHeaderRow();
        let freqrow = table.addHeaderRow();
        let charset = this.getCharset();
        headrow.add({
            settings: { class: "topleft" },
            content: "",
        });
        freqrow.add("Frequency");
        for (let i = 0, len = charset.length; i < len; i++) {
            let c = charset.substr(i, 1);
            headrow.add(c);
            freqrow.add({
                settings: { id: "f" + c, class: "fq" },
                content: "",
            });
        }
        result.append(table.generate());

        // Now we need to list of all the fractionated pieces
        let list = $("<ul/>", { class: "clearfix no-bullet" });
        table = new JTTable({ class: "tfreq" });
        headrow = table.addHeaderRow();
        let replrow = table.addHeaderRow();
        let lockrow = table.addHeaderRow();

        headrow.add({
            settings: { class: "topleft" },
            content: "",
        });
        replrow.add({
            settings: { class: "rep" },
            content: "Replacement",
        });
        lockrow.add("Locked");
        list.append(
            $("<li/>", {
                class: "float-left",
            }).append(table.generate())
        );
        for (let i = 0, len = this.morseReplaces.length; i < len; i++) {
            let cmorse = this.morseReplaces[i];
            table = new JTTable({ class: "tfreq tmorse float-left" });
            headrow = table.addHeaderRow();
            freqrow = table.addBodyRow();
            replrow = table.addBodyRow();
            lockrow = table.addBodyRow();
            headrow.add({
                settings: {},
                content: this.normalizeHTML(cmorse),
            });
            replrow.add({
                settings: { class: "rep" },
                content: this.makeMorseFreqEditField(cmorse, revRepl),
            });
            let crepl = revRepl[cmorse];
            if (crepl === "") {
                crepl = undefined;
            }
            let ischecked = this.state.locked[crepl];
            let cb = $("<input/>", {
                type: "checkbox",
                class: "cb",
                "data-char": cmorse,
                // id: "cb" + i,
                value: name,
                checked: ischecked,
            });
            if (crepl === undefined) {
                cb.prop("disabled", true);
            }

            lockrow.add(cb);
            list.append(
                $("<li/>", {
                    class: "float-left",
                }).append(table.generate())
            );
        }
        result.append(list);
        return result;
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
        if (elem === undefined) {
            super.setChar(repchar, newchar, elem);
            return;
        }
        console.log(
            "handler setChar data-char=" + repchar + " newchar=" + newchar
        );
        // Newchar = letter
        // repchar = morselet
        // This.state.replacement is indexed by letter
        // See if any other slots have this character and reset it
        if (newchar !== "") {
            // If the character is already locked, we can't move it so just
            // return.
            if (this.state.locked[newchar]) {
                return;
            }
            if (
                this.state.replacement[newchar] !== undefined &&
                this.state.replacement[newchar] !== repchar
            ) {
                let holdupdates = this.holdupdates;
                this.holdupdates = true;
                this.setChar(this.state.replacement[newchar], "", elem);
                this.holdupdates = holdupdates;
            }
            this.state.replacement[newchar] = repchar;
        } else {
            // The new character is blank so we need to delete the entry that
            // pointed to it.
            for (let key in this.state.replacement) {
                if (this.state.replacement[key] === repchar) {
                    delete this.state.replacement[key];
                    break;
                }
            }
        }
        $(".sli[data-char='" + repchar + "']").val(newchar);
        // We need to enable/disable the check box.  However, we have the morselet
        // and not the index.
        if (newchar === "") {
            $(".cb[data-char='" + repchar + "']").prop("disabled", true);
        } else {
            $(".cb[data-char='" + repchar + "']").removeAttr("disabled");
        }

        if (newchar === "") {
            newchar = "?";
        }

        $("span[data-char='" + repchar + "']").text(newchar);

        // Ok we changed the morse mapping, so we need to rebuild the main section
        // Note that we don't want to update everything because it would replace
        // the Frequency portion and we would lose the cursor focus.
        if (!this.holdupdates) {
            let res = this.build();
            $("#answer")
                .empty()
                .append(res);
            this.findPossible(this.state.findString);

            this.UpdateReverseReplacements();
            this.updateMatchDropdowns(repchar);
        }
    }

    /**
     * Set multiple characters
     */
    public setMultiChars(reqstr: string): void {
        console.log("setMorseMultiChars " + reqstr);
        this.holdupdates = true;
        for (
            let i = 0, len = reqstr.length / (this.cipherWidth + 1);
            i < len;
            i++
        ) {
            let repchar = reqstr.substr(i * (this.cipherWidth + 1), 1);
            let newchar = reqstr.substr(
                i * (this.cipherWidth + 1) + 1,
                this.cipherWidth
            );
            console.log("Set " + repchar + " to " + newchar);
            this.updateSel(repchar, newchar);
        }
        this.holdupdates = false;
        this.updateOutput();
        this.UpdateFreqEditTable();
        this.updateMatchDropdowns("");
    }
    /**
     * Searches for a string (drags a crib through the crypt)
     * @param encoded Encoded string
     * @param findStr Pattern string to find
     * @param offset Distance from start of letter to look for match
     * Because a morse pattern has a good chance of not starting and ending
     * on a cipherWidth boundary, we want to search for the portion that is
     * on a boundary and then confirm that the starting portion (if any) can fit
     * on the preceding character and the same for the terminating portion.
     * We can optimize this a bit on the start and the end if there is a single
     * piece not used and force it to be an X.
     */
    // tslint:disable-next-line:cyclomatic-complexity
    public searchPatternMorse(
        encoded: string,
        tofind: string,
        offset: number
    ): string {
        let findStr = tofind;
        let prefix = "";
        let suffix = "";
        let matchcount = 0;

        let res: string = "";
        let notmapped = this.repeatStr("?", this.cipherWidth);
        // Figure out how we map the start of the string
        switch (offset) {
            case 2:
                // For Fractionated Morse if we are at the second offset
                // then we need to pull off the first character and also
                // make sure that there is a separator in front of it
                prefix = "X" + findStr.substr(0, 1);
                findStr = findStr.substr(1);
                break;
            case 1:
                // For Fractionated Morse or Morbit and we are at the first
                // offset, we can just assume that there will be a separator
                // in front of it and search for it.
                findStr = "X" + findStr;
                break;
            case 0:
            default:
                // Otherwise when we line up at the start, the previous
                // character (if any) must end with a separator
                prefix = "X";
                break;
        }
        // Now that we know that the start is lined up on a even boundary
        // see if we have anything hanging off the end.
        let extraRoom =
            (this.cipherWidth - (findStr.length % this.cipherWidth)) %
            this.cipherWidth;
        switch (extraRoom) {
            case 2:
                // For Fractionated Morse with a single extra character,
                // we need to pull it off and add a separator
                suffix = findStr.substr(findStr.length - 1) + "X";
                findStr = findStr.substr(0, findStr.length - 1);
                break;
            case 1:
                // For Fractionated Morse or Morbit with an extra space, we
                // can assume that it will be a separator and search for it
                findStr += "X";
                break;
            default:
            case 0:
                // Otherwise we lined up perfectly, so any optional follow on
                // character must start with a separator
                suffix = "X";
                break;
        }
        // findStr is now a perfect multiple of the cipherWidth and aligns to
        // the boundary.  Make a pattern and look for it
        let searchstr = this.makeUniquePattern(findStr, this.cipherWidth);
        let searchlen = searchstr.length;
        let encrlen = encoded.length;
        let charset = this.getCharset().toUpperCase();
        let used = this.getUsedMap();

        for (let i = 0; i + searchlen <= encrlen; i++) {
            let checkstr = encoded.substr(i, searchlen);
            let check = this.makeUniquePattern(checkstr, 1);
            if (check === searchstr) {
                // OK the central part of it matches.
                // Check to see that the prefix and suffix also match
                let keymap: StringMap = {};
                let replacement: StringMap = {};
                let matched = true;
                //
                // Build the character mapping table to show what they would use
                //let charset = this.getCharset();
                for (let c of charset) {
                    keymap[c] = notmapped;
                    replacement[c] = "";
                    if (this.state.replacement[c] !== undefined) {
                        replacement[c] = this.state.replacement[c];
                    }
                }
                // Show the matching characters in order.  While we are at it,
                // Update our local replacement table so we can do a quick check
                // of the prefix/suffix characters as needed
                for (let j = 0; j < searchlen; j++) {
                    let c = checkstr.substr(j, 1);
                    let repl = findStr.substr(
                        j * this.cipherWidth,
                        this.cipherWidth
                    );
                    keymap[c] = repl;
                    if (replacement[c] === "") {
                        replacement[c] = repl;
                        if (used[repl]) {
                            matched = false;
                        }
                    } else if (replacement[c] !== repl) {
                        matched = false;
                    }
                }
                // Let's go for the prefix.
                if (prefix !== "") {
                    if (i === 0) {
                        if (prefix !== "X") {
                            matched = false;
                        }
                    } else {
                        // Get the previous character
                        let prevc = encoded.substr(i - 1, 1);
                        // And what it maps to (if anything).  To make our
                        // comparison go easier, Put what we are looking for
                        // in front of it.  If the replacement is blank then we
                        // are guaranteed to match!
                        let repl = prefix + replacement[prevc];
                        if (
                            repl.substr(repl.length - prefix.length) !== prefix
                        ) {
                            matched = false;
                        }
                    }
                }
                // If the prefix matched, then look at any suffix
                if (matched && suffix !== "") {
                    let nextc = encoded.substr(i + searchlen, 1);
                    if (nextc === "") {
                        if (suffix !== "X") {
                            matched = false;
                        }
                    } else {
                        // And what it maps to (if anything).  To make our
                        // comparison go easier, Put what we are looking for
                        // at the end of it.  If the replacement is blank then we
                        // are guaranteed to match!
                        let repl = replacement[nextc] + suffix;
                        if (repl.substr(0, suffix.length) !== suffix) {
                            matched = false;
                        }
                    }
                }
                if (matched) {
                    let maptable = "";
                    let mapfix = "";
                    matchcount++;
                    // Build all the mappings
                    let mapset: StringMap = {};
                    for (let key of this.morseReplaces) {
                        mapset[key] = "?";
                    }
                    for (let c of charset) {
                        if (keymap[c] !== notmapped) {
                            mapset[keymap[c]] = c;
                            mapfix += c + keymap[c];
                        }
                    }
                    for (let key of this.morseReplaces) {
                        maptable += "<td>" + mapset[key] + "</td>";
                    }
                    res +=
                        '<tr class="mc' +
                        offset +
                        '"><td>' +
                        i +
                        '</td><td><a class="dapply" data-mapfix="' +
                        mapfix +
                        '">' +
                        checkstr +
                        "</a></td>" +
                        maptable +
                        "</tr>";
                }
            }
        }
        if (matchcount > 0) {
            let action = "hide";
            if (matchcount > 9) {
                action = "show";
                res = res.replace(
                    new RegExp('"mc' + offset, "g"),
                    '"mch' + offset
                );
            }
            res =
                '<tr><td class="mcoff" colspan="28">Offset ' +
                offset +
                " - " +
                matchcount +
                " matches " +
                " (" +
                '<a class="mctoggle" data-mcoffset="' +
                offset +
                '">' +
                action +
                "</a>)" +
                "</td></tr>" +
                res;
        }

        return res;
    }
    /**
     * This looks for a morse encoded string in the input pattern.  It relies on:
     *   this.cipherWidth to be the width of each encoded character
     * @param str String to search for
     */
    public findPossible(str: string): void {
        let encoded = this.minimizeString(this.state.cipherString);
        this.state.findString = str;
        if (str === "") {
            $(".findres").empty();
            return;
        }
        let morse = "";
        let extra = "";
        let res = "";
        // Convert the string to Morse.
        for (let c of str.toUpperCase()) {
            if (typeof tomorse[c] !== "undefined") {
                morse += extra + tomorse[c];
                extra = "X";
            }
        }
        //
        // Look for all possible matches for the pattern.  We need to shift it by as many Xs as
        // can occur for the width of a morse character.  For a Morbit this would only be a single
        // one, but with a Fractionated Morse it could be two leadings ones.
        for (let i = 0; i < this.cipherWidth; i++) {
            res += this.searchPatternMorse(encoded, morse, i);
        }
        if (res === "") {
            res = "<br/><b>Not Found</b>";
        } else {
            let charset = this.getCharset();
            let tres =
                '<table class="mfind morsef"><thead><tr><th>Pos</th><th>Match</th>';
            for (let key of this.morseReplaces) {
                tres += "<th>" + this.normalizeHTML(key) + "</th>";
            }
            //   res +=             < ul > ' + res + '</ul > '
            res = tres + "</tr></thead><tbody>" + res + "</tbody></table>";
        }

        $(".findres").html(
            "Searching for " + str + " as " + this.normalizeHTML(morse) + res
        );
        this.attachHandlers();
    }
    /**
     * Generates an HTML representation of a string for display.  Replaces the X, O and -
     * with more visible HTML equivalents
     * str String to normalize (with - X and O representing morese characters)
     */
    public normalizeHTML(str: string): string {
        return str
            .replace(/O/g, "&#9679;")
            .replace(/-/g, "&ndash;")
            .replace(/X/g, "&times;");
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    public load(): void {
        this.encodedString = this.cleanString(this.state.cipherString);
        let res = this.build();
        $("#answer")
            .empty()
            .append(res);
        $("#analysis").each((i, elem) => {
            $(elem)
                .empty()
                .append(this.genAnalysis(this.encodedString));
        });
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    /**
     * Create an edit field for a dropdown
     * @param c Charcter to make dropdown for
     */
    public makeMorseFreqEditField(
        frac: string,
        revRepl: StringMap
    ): JQuery<HTMLElement> {
        let cfrac = revRepl[frac];
        let einput = $("<input/>", {
            type: "text",
            class: "sli",
            "data-char": frac,
            id: "m" + frac,
            value: cfrac,
        });
        if (cfrac !== "" && cfrac !== undefined && this.state.locked[cfrac]) {
            einput.prop("disabled", true);
        }
        return einput;
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     */
    public updateSel(item: string, val: string): void {
        let toswapwith = item;
        setDisabled("#cb" + item, false);

        for (let key in this.state.replacement) {
            if (this.state.replacement.hasOwnProperty(key)) {
                if (this.state.replacement[key] === val) {
                    toswapwith = key;
                    break;
                }
            }
        }
        if (toswapwith !== item) {
            const swapval = this.state.replacement[item];
            this.state.replacement[item] = this.state.replacement[toswapwith];
            this.state.replacement[toswapwith] = swapval;
        } else {
            this.state.replacement[item] = val;
        }
        if (!this.holdupdates) {
            this.UpdateFreqEditTable();
            this.load();
        }
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $(".cb")
            .off("change")
            .on("change", e => {
                this.markUndo(null);
                this.updateCheck(
                    $(e.target).attr("data-char"),
                    $(e.target).prop("checked")
                );
            });
        $(".mctoggle")
            .off("click")
            .on("click", e => {
                let title = $(e.target).text();
                let offset = $(e.target).attr("data-mcoffset");
                if (title === "show") {
                    $(e.target).text("hide");
                    $(".mch" + offset)
                        .removeClass("mch" + offset)
                        .addClass("mc" + offset);
                } else {
                    $(e.target).text("show");
                    $(".mc" + offset)
                        .removeClass("mc" + offset)
                        .addClass("mch" + offset);
                }
            });
    }
}
