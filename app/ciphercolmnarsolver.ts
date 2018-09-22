import { BoolMap, cloneObject, NumberMap } from "./ciphercommon";
import { IState, menuMode, toolMode } from "./cipherhandler";
import { CipherSolver } from "./ciphersolver";
import { CipherTypeButtonItem, ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";
interface IColumnarState extends IState {
    /** Number of columns */
    columns: number;
    /** Offset to start pulling from */
    offset: number;
    /** The order string for a Redefence */
    colOrder: number[];
}

export class CipherColumnarSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    /** Columnar Lookup table overridden by the subclasses */
    public readonly ColumnarReplaces: string[] = [];
    public defaultstate: IColumnarState = {
        cipherType: ICipherType.CompleteColumnar,
        replacement: {},
        cipherString: "",
        locked: {},
        findString: "",
        columns: 2,
        colOrder: [],
        offset: 0,
    };
    public state: IColumnarState = cloneObject(
        this.defaultstate
    ) as IColumnarState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset" },
    ];
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setCipherType(this.state.cipherType);
        this.setColumns(this.state.columns);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.aca);
        JTRadioButtonSet("ciphertype", this.state.cipherType);
        $("#columns").val(this.state.columns);
        $("#encoded").val(this.state.cipherString);
        $("#offset").val(this.state.offset);
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
            this.setColumns(this.state.columns);
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
            this.setColumns(this.state.columns);
        }
        return changed;
    }
    /**
     * Sets the offset value (state.offset)
     * @param offset new offset value
     * @returns Boolean indicating if the value actually changed
     */
    public setOffset(offset: number): boolean {
        let changed = false;
        offset =
            (offset + this.state.cipherString.length) %
            this.state.cipherString.length;
        if (this.state.offset !== offset) {
            this.state.offset = offset;
            changed = true;
        }
        return changed;
    }
    /**
     * Sets the order in which columns are to be taken out of the cipher string
     * @param colOrder Array of column order values
     */
    public setColOrder(colOrder: number[]): boolean {
        let changed = false;
        let validcol: BoolMap = {};
        for (let col = 0; col < this.state.columns; col++) {
            validcol[col] = true;
        }
        let oldorder = this.state.colOrder;
        this.state.colOrder = [];
        // Add in all of the columns that they specified
        for (let v of colOrder) {
            if (validcol[v] === true) {
                this.state.colOrder.push(v);
                validcol[v] = false;
            }
        }
        // Add all of the columns which they didn't specify
        for (let v in validcol) {
            if (validcol[v] === true) {
                this.state.colOrder.push(Number(v));
            }
        }
        // Now see if anything actually changed
        for (let i = 0; i < this.state.colOrder.length; i++) {
            if (this.state.colOrder[i] !== oldorder[i]) {
                changed = true;
                break;
            }
        }
        return changed;
    }
    /**
     * Updates the number of columns.  This ensures that a valid column number
     * has been picked.  When doing a complete columnar, it clamps it to be
     * a factor of the length
     * @param columns new width value
     */
    public setColumns(columns: number): boolean {
        let changed = false;
        let origcolumns = columns;
        let advancedir = this.advancedir;
        let str = this.minimizeString(this.state.cipherString);
        if (str.length < 2) {
            this.setColOrder(this.state.colOrder);
            return false;
        }
        let maxlen = Math.floor(str.length / 2);
        while (
            columns < 2 ||
            columns > maxlen ||
            (this.state.cipherType === ICipherType.CompleteColumnar &&
                str.length % columns !== 0)
        ) {
            // If we are at the maximum number of columns
            if (columns > maxlen) {
                columns = 2;
            } else if (columns < 0) {
                if (advancedir === 0) {
                    advancedir = -1;
                }
                columns = maxlen;
            } else {
                if (advancedir === 0) {
                    advancedir = 1;
                }
                columns += advancedir;
            }
            // Something is wrong... we can't find a number that actually works
            // this can happen for a CompleteColumnar which is not factorable
            if (columns === origcolumns) {
                $("#err").append(
                    $("<div/>", { class: "callout warning" }).text(
                        "Unable to find a valid number of columns"
                    )
                );
                break;
            }
        }
        if (columns !== this.state.columns) {
            changed = true;
            this.state.columns = columns;
            this.setColOrder(this.state.colOrder);
        }
        return changed;
    }
    /**
     * Preserve the current replacement order
     */
    public saveReplacementOrder(container: HTMLElement): void {
        let ids = this.getSortedContainerIDs(container);
        let colOrder: number[] = [];
        for (let id of ids) {
            colOrder.push(Number(id.substr(2)) - 1);
        }
        this.setColOrder(colOrder);
        this.updateOutput();
    }

    public genAnalysis(str: string): JQuery<HTMLElement> {
        return null;
    }
    public build(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "clearfix" });
        let columninfo: { head: string; data: string }[] = [];
        let str = this.minimizeString(this.state.cipherString);
        if (str === "") {
            return $("<div/>", { class: "callout warning" }).text(
                "Enter a cipher to get started"
            );
        }
        if (this.state.offset > 0) {
            str =
                str.substr(this.state.offset) +
                str.substr(0, this.state.offset);
        }
        let height = Math.floor(str.length / this.state.columns);
        let extra = str.length - this.state.columns * height;
        let pos = 0;
        let solution = "";
        let colspot: NumberMap = {};
        for (let col = 0; col < this.state.columns; col++) {
            columninfo.push({ head: "X", data: "" });
            colspot[this.state.colOrder[col]] = col;
        }
        // Pull out the strings in the order specified
        for (let col = 0; col < this.state.columns; col++) {
            let colheight = height;
            if (colspot[col] < extra) {
                colheight++;
            }
            columninfo[colspot[col]].head = String(col + 1);
            columninfo[colspot[col]].data = str.substr(pos, colheight);
            pos += colheight;
        }
        let list = $("<ul/>", {
            id: "collist",
            class: "no-bullet sortable clearfix",
        });
        /* Build the columns */
        for (let colinfo of columninfo) {
            let table = new JTTable({ class: "tfreq" });
            solution += String(colinfo.head) + " ";

            table.addHeaderRow().add(String(colinfo.head));
            for (let c of colinfo.data) {
                table.addBodyRow().add({
                    settings: { "data-char": c },
                    content: c,
                });
            }

            list.append(
                $("<li/>", {
                    class: "float-left",
                    id: "sc" + colinfo.head,
                }).append(table.generate())
            );
        }
        result.append(list);
        let combined = $("<div>");
        // Now go through and construct the actual answer
        for (let row = 0; row < height + 1; row++) {
            for (let colinfo of columninfo) {
                let c = colinfo.data.substr(row, 1);
                solution += c;
                if (this.isValidChar(c)) {
                    combined.append($("<span/>", { "data-char": c }).text(c));
                } else {
                    combined.append(c);
                }
            }
        }
        result.append(combined);
        this.state.solution = solution;
        this.state.solved = true;
        return result;
    }
    /**
     * Generates the section above the command buttons
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");

        let radiobuttons = [
            CipherTypeButtonItem(ICipherType.CompleteColumnar),
            CipherTypeButtonItem(ICipherType.IncompleteColumnar),
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
        let inputbox = $("<div/>", {
            class: "grid-x grid-margin-x",
        });
        inputbox.append(
            JTFIncButton(
                "Columns",
                "columns",
                this.state.columns,
                "small-12 medium-6 large-6"
            )
        );
        inputbox.append(
            JTFIncButton(
                "Offset",
                "offset",
                this.state.offset,
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
     * This looks for a Columnar encoded string in the input pattern.  It relies on:
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
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $("#columns")
            .off("input")
            .on("input", e => {
                let columns = Number($(e.target).val());
                if (columns !== this.state.columns) {
                    this.markUndo(null);
                    if (this.setColumns(columns)) {
                        this.updateOutput();
                    }
                }
            });
        $("#offset")
            .off("input")
            .on("input", e => {
                let offset = Number($(e.target).val());
                if (offset !== this.state.offset) {
                    this.markUndo(null);
                    if (this.setOffset(offset)) {
                        this.updateOutput();
                    }
                }
            });
    }
}
