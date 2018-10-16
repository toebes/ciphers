import { BoolMap, cloneObject, NumberMap } from "../common/ciphercommon";
import { IState, menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTFLabeledInput } from "../common/jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "../common/jtradiobutton";
import { JTTable } from "../common/jttable";
import { CipherSolver } from "./ciphersolver";
interface mapSet {
    ct: string; // Cipher text
    ctoff: number; // Cipher text offset
    pt: string; // Plain text mapping
}

type RagLine = Array<string>;

interface mapLine {
    line: RagLine;
    usedlet: NumberMap;
    notes: string;
}

interface mappedLine {
    line: RagLine;
    notes: string;
}
type alphaNum = 24 | 26 | 36;

interface IRagbabyState extends IState {
    /** length of the alphabet */
    alphalen: alphaNum;
    /** Maps the cipher text (Letter concatenated with a number) to a plaintext letter
     * It keeps track of a list of letters that a user has entered (in order)
     */
    ctmap: mapSet[];
}
/**
 * The CipherRagbabySolver class implements a solver for the Ragbaby Cipher
 */
export class CipherRagbabySolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    public defaultstate: IRagbabyState = {
        cipherType: ICipherType.Ragbaby,
        alphalen: 24,
        cipherString: "",
        replacement: {},
        ctmap: [],
    };
    public state: IRagbabyState = cloneObject(
        this.defaultstate
    ) as IRagbabyState;
    /** List of all CT:Offset mappings */
    public ctoffsets: BoolMap = {};
    /**
     * replmap is the map of letters.
     * replmap[0] is the combined entries
     * replmap[1] is editable entries from the user
     * replmap[2..n] is the mappings derived from entries under the cipher text
     */
    public replmap: Array<mappedLine>;

    public emptyRagline(): RagLine {
        let rslt: RagLine = [];
        for (let i = 0; i < this.state.alphalen; i++) {
            rslt.push("");
        }
        return rslt;
    }
    /**
     * Save any complete solution
     */
    public saveSolution(): void {
        let wordidx = 1;
        let wordlen = 0;

        this.state.solved = true;
        this.state.solution = "";

        let ptmap = {};
        for (let entry of this.state.ctmap) {
            ptmap[entry.ct + entry.ctoff] = entry.pt;
        }

        for (let t of this.state.cipherString.toUpperCase()) {
            if (this.isValidChar(t)) {
                let off = (wordidx + wordlen) % this.state.alphalen;
                let id = t + off;
                wordlen++;
                if (ptmap[id] !== undefined) {
                    this.state.solution += ptmap[id];
                } else {
                    // We don't have a hand entered solution, but there may be a valid
                    // mapping for it.
                    let idx = this.replmap[0].line.indexOf(t);
                    let repc = "?";
                    if (idx !== -1) {
                        let off1 =
                            (this.state.alphalen + idx - off) %
                            this.state.alphalen;
                        if (this.replmap[0].line[off1] !== "") {
                            repc = this.replmap[0].line[off1];
                        }
                    }
                    this.state.solution += repc;
                    if (repc === "?") {
                        this.state.solved = false;
                    }
                }
            } else if (t === " " || t === "\n" || t === "\r") {
                if (wordlen !== 0) {
                    wordidx++;
                    wordlen = 0;
                }
                this.state.solution += " ";
            } else {
                this.state.solution += t;
            }
        }
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
        this.setAlphabetSize(this.state.alphalen);
    }
    /**
     * Updates the output based on current settings
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.aca);
        // Propagate the current settings to the UI
        $("#encoded").val(this.state.cipherString);
        $("#find").val(this.state.findString);
        this.showQuestion();
        JTRadioButtonSet("alphasize", this.state.alphalen);
        this.load();
        for (let entry of this.state.ctmap) {
            $("input[data-char='" + entry.ct + entry.ctoff + "']").val(
                entry.pt
            );
        }
        if (this.state.findString !== "") {
            this.findPossible(this.state.findString);
        }
        this.applyMappings();
        this.buildMap();
    }
    /**
     * Selects which form of a ragbaby we are doing
     * alphalen Number of characters in the alphabet (24, 26, 36)
     */
    public setAlphabetSize(alphalen: alphaNum): boolean {
        let changed = false;
        if (this.state.alphalen !== alphalen) {
            changed = true;
            this.state.alphalen = alphalen;
        }
        switch (this.state.alphalen) {
            case 26:
                this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
                break;

            case 36:
                this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
                break;

            default:
                this.setCharset("ABCDEFGHIKLMNOPQRSTUVWYZ");
                break;
        }
        return changed;
    }

    /**
     * This rotates all entries in a line by the specified amount.
     * r Which map to shift
     * dist Distance to shift by
     */
    public rotateSet(s: RagLine, dist: number): RagLine {
        if (dist === 0) {
            return s;
        }

        let newmap: RagLine = [];
        for (let i = 0; i < this.state.alphalen; i++) {
            let ipos = (this.state.alphalen + i + dist) % this.state.alphalen;
            let fillc = "";
            if (ipos < s.length) {
                fillc = s[ipos];
            }
            newmap.push(fillc);
        }
        return newmap;
    }
    /**
     * Apply all of the mappings entered so far (in order)
     */
    public applyMappings(): void {
        let cslot: NumberMap = {};
        let prevslot: NumberMap = {};
        let charset = this.getCharset();
        let newmap: Array<RagLine> = [this.emptyRagline(), this.emptyRagline()];
        let lines: mapLine[] = [];

        // No default preferred position for any character
        for (let i of charset) {
            cslot[i] = -1;
            prevslot[i] = -1;
        }
        // First save all the currently preferred positions of characters
        for (let i in this.replmap[0].line) {
            prevslot[this.replmap[0].line[i]] = Number(i);
        }
        // Now save all the manually selected characters and override the position
        // for any entered here.  This is the one position that can't move
        for (let i in this.replmap[1].line) {
            let c = this.replmap[1].line[i];
            newmap[1][i] = c;
            newmap[0][i] = c;
            if (c !== "") {
                cslot[c] = Number(i);
            }
        }
        this.replmap.splice(2, this.replmap.length - 2);

        // Now go through all of the mappings that have been defined
        for (let entry of this.state.ctmap) {
            // 1. If the mapped letters are already known in the main map
            //    1a.  If the offset fits, skip the entry
            //    1b.  Create a new slot for the mismatch entry with PT as first letter
            // 2. If there is a slot which has one of the letters in it AND it fits, add to that slot
            // 3. Create a new slot for the entry with PT as the first letter

            let needNew = true;
            let mergeslot = -1;
            let note = "";
            // See if we already know what slot the plaintext goes in
            let ptslot = cslot[entry.pt];
            let ctslot = cslot[entry.ct];
            if (ptslot !== -1 && ctslot !== -1) {
                let ctslottarget = (ptslot + entry.ctoff) % this.state.alphalen;
                // Ok we are good for the plaintext.  Do we have a slot for the cipher text
                // Now see if the distance between the two is acceptable
                if (ctslot === ctslottarget) {
                    // it matches against what they typed in, so we can ignore the entry
                    needNew = false;
                } else {
                    // It doesn't match, so we need to create a new entry
                    note = "Conflict";
                }
            } else {
                // See if we can find a slot
                for (let testslot = 0; testslot < lines.length; testslot++) {
                    let testline = lines[testslot];
                    ptslot = testline.usedlet[entry.pt];
                    ctslot = testline.usedlet[entry.ct];
                    if (ptslot !== undefined) {
                        // We have the plain text character, see where the cipher text should be
                        let ctslottarget =
                            (ptslot + entry.ctoff) % this.state.alphalen;
                        // Does it also have the cipher text character?
                        if (ctslot !== undefined) {
                            // It does.  If the cipher text is at the same slot, we are safe
                            if (ctslottarget === ctslot) {
                                testline.notes +=
                                    " " + entry.ct + String(entry.ctoff);
                                needNew = false;
                                mergeslot = testslot;
                                break;
                            }
                            // It isn't in the same slot so we will need to just try for the next line
                        } else {
                            // It only has the plain text character, see if there is something at the spot
                            // which would conflict
                            if (testline.line[ctslottarget] === "") {
                                // Nothing is there, so we can add to it
                                testline.line[ctslottarget] = entry.ct;
                                testline.usedlet[entry.ct] = ctslottarget;
                                testline.notes +=
                                    " " + entry.ct + String(entry.ctoff);
                                mergeslot = testslot;
                                needNew = false;
                                break;
                            }
                            // The slot is occupied, so try for the next line
                        }
                    }
                    if (ctslot !== undefined) {
                        // We have the cipher text letter (but not the plain text one)
                        let ptslottarget =
                            (this.state.alphalen + ctslot - entry.ctoff) %
                            this.state.alphalen;
                        if (testline.line[ptslottarget] === "") {
                            // Nothing is there, so we can add to it
                            testline.line[ptslottarget] = entry.pt;
                            testline.usedlet[entry.pt] = ptslottarget;
                            testline.notes +=
                                " " + entry.ct + String(entry.ctoff);
                            mergeslot = testslot;
                            needNew = false;
                            break;
                        }
                        // The slot was occupied, so try for the next line
                    }
                }
            }
            if (needNew) {
                // Brand new slot.
                let newline: mapLine = { line: [], notes: "", usedlet: {} };
                for (let i = 0; i < this.state.alphalen; i++) {
                    newline.line.push("");
                }
                newline.notes = entry.ct + String(entry.ctoff) + note;
                newline.usedlet[entry.pt] = 0;
                newline.line[0] = entry.pt;
                newline.usedlet[entry.ct] = entry.ctoff;
                newline.line[entry.ctoff] = entry.ct;
                lines.push(newline);
            } else if (mergeslot !== -1) {
                this.mergeMappings(lines, mergeslot);
            }
        }
        // We have created all the new lines, now we want to line them up as best as we can
        this.lineUpMappings(lines, prevslot);
    }
    /**
     * Merge any potential strips
     * lines Computed line strips
     * mergeslot slot to attempt to merge
     */
    public mergeMappings(lines: mapLine[], mergeslot: number): void {
        while (mergeslot !== -1) {
            let tomerge = mergeslot;
            mergeslot = -1;
            for (
                let testslot = tomerge + 1;
                testslot < lines.length;
                testslot++
            ) {
                let canmerge = false;
                let shift = 0;
                // See if these two are compatible. To be compatible, at least one
                // character in the testslot must be in the tomerge slot and all other
                // characters in the testslot must not overlap
                for (let c in lines[testslot].usedlet) {
                    if (lines[tomerge].usedlet[c] !== undefined) {
                        shift =
                            lines[testslot].usedlet[c] -
                            lines[tomerge].usedlet[c];
                        canmerge = true;
                        break;
                    }
                }
                if (canmerge) {
                    // We have at least one character in common.  Shift the
                    let shifted = this.rotateSet(lines[testslot].line, shift);
                    for (let i in shifted) {
                        if (
                            shifted[i] !== "" &&
                            lines[tomerge].line[i] !== "" &&
                            lines[tomerge].line[i] !== shifted[i]
                        ) {
                            canmerge = false;
                            break;
                        }
                    }
                    if (canmerge) {
                        // We have the shifted array, copy all of the characters into the target line
                        for (let i in shifted) {
                            let c = shifted[i];
                            if (c !== "") {
                                lines[tomerge].line[i] = c;
                                lines[tomerge].usedlet[c] = Number(i);
                            }
                        }
                        // Copy over the notes
                        lines[tomerge].notes += " " + lines[testslot].notes;
                        lines.splice(testslot, 1);
                        // Now that we merged once, we may have to merge with something else, so check again
                        mergeslot = tomerge;
                        break;
                    }
                }
            }
        }
    }
    /**
     * Line up all lines and put them in the the replacement map
     * lines Computed lines
     * prevslot Previous positions of letters to attempt to line up against
     */
    public lineUpMappings(lines: mapLine[], prevslot: NumberMap): void {
        for (let testline of lines) {
            // For convenience we try to see if the first letter has a corresponding favorite position
            let rotate = -prevslot[testline.line[0]];
            if (rotate === 1) {
                // Remember we negated the rotate amount so -1 becomes 1
                // Assume we won't have to rotate at all
                rotate = 0;
                // Unfortunately the first letter didn't work, so let's try all the others
                for (let c in testline.usedlet) {
                    let prevspot = prevslot[c];
                    if (prevspot !== -1) {
                        rotate = testline.usedlet[c] - prevspot;
                        break;
                    }
                }
            }
            // Ok we know how much to rotate it, put it back in place when we are done
            this.replmap.push({
                line: this.rotateSet(testline.line, rotate),
                notes: testline.notes,
            });
        }
    }
    /**
     * Sets up the radio button to choose the variant as well as the input field for the cipher
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");

        let radiobuttons = [
            { id: "a24", value: 24, title: "24 [No I/X]" },
            { id: "a26", value: 26, title: "26 [A-Z]" },
            { id: "a36", value: 36, title: "36 [A-Z 0-9]" },
        ];
        result.append(
            JTRadioButton(5, "alphasize", radiobuttons, this.state.alphalen)
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
        this.UpdateFreqEditTable();
        // <div class="slookup" id = "lookup" >
        //     <label for= "find" > Find spot for</label>
        //         < input id = "find" type = "text" />
        //             <div class="findres" > </div>
        //                 < /div>
        return null;
    }
    /**
     * Locate a string.
     * Note that we assume that the period has been set
     */
    public findPossible(str: string): void {
        let res = $("<span/>").text(
            "Unable to find " +
                str +
                " as " +
                this.normalizeHTML(str) +
                " - Not yet implemented"
        );
        $(".findres")
            .empty()
            .append(res);
        this.attachHandlers();
    }

    /**
     * Fills in the frequency portion of the frequency table.  For the Ragbaby
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void {}
    /**
     * Analyze the encoded text
     */
    public genAnalysis(encoded: string): JQuery<HTMLElement> {
        return null;
    }
    /**
     * Change the encrypted character.
     * This primarily shows us what the key might be if we use it.
     * Note that when we change one, we have
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
        console.log(
            "Ragbaby setChar data-char=" + repchar + " newchar=" + newchar
        );
        let pt = newchar;
        let ct = repchar.substr(0, 1);
        let dist = Number(repchar.substr(1));

        if (ct === "-") {
            if (newchar !== "") {
                // See if we had this character in a different slot.  If so, we need
                // to delete
                let oldpos = this.replmap[1].line.indexOf(newchar);
                if (oldpos !== -1) {
                    this.replmap[1].line[oldpos] = "";
                }
            }
            this.replmap[1].line[dist] = newchar;
            this.applyMappings();
            this.buildMap();
        } else {
            // Don't let them do something bad - like setting a character to itself
            // with a non-zero distance
            if (pt !== ct || dist !== 0) {
                $("input[data-char='" + repchar + "']").val(newchar);
                for (let pos in this.state.ctmap) {
                    let entry = this.state.ctmap[pos];
                    if (entry.ct === ct && entry.ctoff === dist) {
                        this.state.ctmap.splice(Number(pos), 1);
                    }
                }
                if (pt !== "") {
                    this.state.ctmap.push({
                        ct: ct,
                        pt: pt,
                        ctoff: dist,
                    });
                }
                this.applyMappings();
                this.buildMap();
            }
        }
    }

    /**
     * Builds the GUI for the solver
     */
    public build(): JQuery<HTMLElement> {
        let str = this.state.cipherString;
        this.ctoffsets = {};
        this.replmap = [
            { line: this.emptyRagline(), notes: "" },
            { line: this.emptyRagline(), notes: "" },
        ];
        let res = "";
        let combinedtext = "";
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        let posthead1 = '</tr></tbody></table><div class="repl" data-chars="';
        let posthead2 = '"></div></div>';
        let pre = prehead;
        let datachars = "";
        let charset = this.getCharset().toUpperCase();
        this.freq = {};
        let wordidx = 1;
        let wordlen = 0;

        for (let c of charset) {
            this.freq[c] = 0;
        }

        for (let i = 0, len = str.length; i < len; i++) {
            let t = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(t)) {
                let off = (wordidx + wordlen) % this.state.alphalen;
                let id = t + off;
                this.ctoffsets[id] = true;
                let disabled = "";
                let outc = "?";
                if (off === 0) {
                    outc = t;
                    disabled = " disabled";
                }
                datachars += t;
                combinedtext +=
                    '<span data-char="' + id + '">' + outc + "</span>";
                t =
                    pre +
                    '<td><div class="slil">' +
                    t +
                    "</div>" +
                    '<div class="off">' +
                    off +
                    "</div>" +
                    '<div data-char="' +
                    id +
                    '" class="vans">' +
                    outc +
                    "</div>" +
                    '<input type="text" id="ti' +
                    i +
                    '" class="sli" data-char="' +
                    id +
                    '"' +
                    disabled +
                    " />";
                wordlen++;
                pre = "";
            } else if (t === " " || t === "\n" || t === "\r") {
                if (wordlen !== 0) {
                    wordidx++;
                    wordlen = 0;
                }
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
     * Replaces the map of letters for shifting
     */
    public buildMap(): void {
        if (this.state.cipherString === "") {
            $("#ragwork")
                .empty()
                .append(
                    $("<div/>", {
                        class: "callout warning",
                    }).text("Enter a cipher to get started")
                );
            return;
        }
        let table = new JTTable({ class: "tfreq editmap" });
        let row = table.addHeaderRow(["Shift Left"]);
        for (let i = 0; i < this.state.alphalen; i++) {
            this.replmap[0].line[i] = "";
            row.add({ settings: { class: "off" }, content: i });
        }
        row.add("Shift Right");
        row.add("Notes");

        // Now add all of the remaining rows
        for (let r = 1; r < this.replmap.length; r++) {
            let extranote = "";
            if (r === 1) {
                extranote =
                    "Enter what-if letters on this strip.  It will not combine.";
            }

            row = table.addBodyRow([
                $("<button/>", {
                    href: "#",
                    class: "ls",
                    "data-vrow": r,
                }).html("&#8647;"),
            ]);
            for (let i = 0; i < this.state.alphalen; i++) {
                let repc = "";
                if (i < this.replmap[r].line.length) {
                    repc = this.replmap[r].line[i];
                }
                if (repc !== "") {
                    if (this.replmap[0].line[i] === "") {
                        this.replmap[0].line[i] = repc;
                    } else if (repc !== this.replmap[0].line[i]) {
                        extranote += " '" + repc + "' conflict";
                    }
                }
                if (r === 1) {
                    row.add(
                        $("<input/>", {
                            class: "sli off",
                            "data-char": "-" + i,
                            value: repc,
                        })
                    );
                } else {
                    row.add(repc);
                }
            }
            row.add(
                $("<button/>", {
                    href: "#",
                    class: "rs",
                    "data-vrow": r,
                }).html("&#8649;")
            );
            row.add(this.replmap[r].notes + extranote);
        }
        // Go back and put a header row showing all the letters we have picked up
        row = table.addHeaderRow([
            $("<button/>", {
                href: "#",
                class: "ls",
                "data-vrow": -1,
            }).html("&#8647;"),
        ]);
        for (let i = 0; i < this.state.alphalen; i++) {
            let repc = "?";
            if (i < this.replmap[0].line.length) {
                repc = this.replmap[0].line[i];
            }
            row.add({
                settings: { class: "off" },
                content: repc,
            });
        }
        row.add(
            $("<button/>", {
                href: "#",
                class: "rs",
                "data-vrow": -1,
            }).html("&#8649;")
        );
        row.add("");

        $("#ragwork")
            .empty()
            .append(table.generate());

        // Now go through and update all of the character maps
        for (let ctoff in this.ctoffsets) {
            let ct = ctoff.substr(0, 1);
            let dist = Number(ctoff.substr(1));
            let i = this.replmap[0].line.indexOf(ct);
            let repl = "?";
            if (i !== -1) {
                let ptpos =
                    (this.state.alphalen + i - dist) % this.state.alphalen;
                let pt = this.replmap[0].line[ptpos];
                if (pt !== "") {
                    repl = pt;
                }
            }
            $("span[data-char='" + ctoff + "']").text(repl);
            $("div[data-char='" + ctoff + "']").text(repl);
        }
        this.attachHandlers();
    }
    /**
     * Creates an HTML table to display the frequency of characters
     */
    public createFreqEditTable(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(
            $("<div/>", {
                id: "ragwork",
                class: "ragedit",
            })
        );
        return result;
    }
    /**
     * This rotates all entries in a map entry by the specified amount.
     * r Which map to shift
     * dist Distance to shift by
     */
    public rotateMap(r: number, dist: number): void {
        if (r < this.replmap.length) {
            let newmap: Array<string> = [];
            for (let i = 0; i < this.state.alphalen; i++) {
                let ipos =
                    (this.state.alphalen + i + dist) % this.state.alphalen;
                let fillc = "";
                if (ipos < this.replmap[r].line.length) {
                    fillc = this.replmap[r].line[ipos];
                }
                newmap.push(fillc);
            }
            this.replmap[r].line = newmap;
        }
    }
    /**
     * Rotate left all the letters in a slot by 1
     * r Which slot (-1 for all) to shift
     */
    public leftRotate(r: number): void {
        if (r === -1) {
            for (let slot in this.replmap) {
                this.rotateMap(Number(slot), 1);
            }
        } else {
            this.rotateMap(r, 1);
        }
        this.buildMap();
    }
    /**
     * Rotate right all the letters in a slot by 1
     * r Which slot (-1 for all) to shift
     */
    public rightRotate(r: number): void {
        if (r === -1) {
            for (let slot in this.replmap) {
                this.rotateMap(Number(slot), -1);
            }
        } else {
            this.rotateMap(r, -1);
        }
        this.buildMap();
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $("[name=alphasize]")
            .off("change")
            .on("change", () => {
                this.markUndo(null);
                this.setAlphabetSize(Number(
                    $("input[name='alphasize']:checked").val()
                ) as alphaNum);
                this.updateOutput();
            });
        $("button.ls")
            .off("click")
            .on("click", e => {
                this.markUndo(null);
                this.leftRotate(Number($(e.target).attr("data-vrow")));
            });
        $("button.rs")
            .off("click")
            .click(e => {
                this.markUndo(null);
                this.rightRotate(Number($(e.target).attr("data-vrow")));
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
