import { cloneObject } from "./ciphercommon";
import { IState, menuMode, toolMode } from "./cipherhandler";
import { CipherSolver } from "./ciphersolver";
import { CipherTypeButtonItem, ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
interface IRailState extends IState {
    /** The number of rails currently being tested */
    rails: number;
    /** The current rail offset being tested */
    railOffset: number;
    /** How the rails are laid out */
    railLayout: RailLayout;
    /** The order string for a Redefence */
    railOrder: string;
}

/** Limits on the range of the number of rails allowed */
const maxRails: number = 10;
const minRails: number = 2;
/** How the rails are laid out */
enum RailLayout {
    W_by_Row,
    M_by_Row,
    W_Zig_Zag, // Railfence only
    M_Zig_Zag, // Railfence only
}

/**
 * The CipherRailfenceSolver class implements a solver for the Railfence Cipher
 */
export class CipherRailfenceSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    public defaultstate: IRailState = {
        /** The current cipher we are working on */
        cipherString: "" /** The number of rails currently being tested */,
        rails: 3 /** The current rail offset being tested */,
        railOffset: 0 /** The type of cipher we are doing */,
        cipherType: ICipherType.Railfence /** How the rails are laid out */,
        railLayout: RailLayout.W_by_Row /** The order string for a Redefence */,
        railOrder: "123456789",
    };
    public state: IRailState = cloneObject(this.defaultstate) as IRailState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Save", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
    ];
    public railOrderOffs: Array<number>;
    /**
     * Add any solution text to the problem
     */
    public saveSolution(): void {
        // We don't have to do anything because it has already been calculated
        // but we don't want to call the super class implementation because
        // it does something completely different.
    }
    /**
     * Set the number of rails
     * @param rails Number of rails requested
     */
    public setRailCount(rails: number): boolean {
        let changed = false;
        /** Range limit the number of rails */
        if (rails > maxRails) {
            rails = minRails;
        } else if (rails < minRails) {
            rails = maxRails;
        }
        if (this.state.rails !== rails) {
            changed = true;
            this.state.rails = rails;
            // Make sure that the rail offset is in range
            this.setRailOffset(this.state.railOffset);
            this.setRailOrder(this.state.railOrder);
        }
        return changed;
    }
    /**
     * Set rail offset
     * @param railOffset New offset
     */
    public setRailOffset(railOffset: number): boolean {
        let changed = false;
        if (railOffset < 0) {
            railOffset = this.state.rails - 1;
        } else if (railOffset > this.state.rails - 1) {
            railOffset = 0;
        }
        if (this.state.railOffset !== railOffset) {
            changed = true;
            this.state.railOffset = railOffset;
        }
        return changed;
    }
    /**
     * Set rail layout type (M/W and by row or zig zag)
     * @param layout New raillayout type
     */
    public setRailLayout(layout: RailLayout): boolean {
        let changed = false;
        // We don't allow zig zag with Redefence, so switch to the matching by row type
        if (this.state.cipherType === ICipherType.Redefence) {
            if (layout === RailLayout.W_Zig_Zag) {
                layout = RailLayout.W_by_Row;
            } else if (layout === RailLayout.M_Zig_Zag) {
                layout = RailLayout.M_by_Row;
            }
        }
        if (this.state.railLayout !== layout) {
            changed = true;
            this.state.railLayout = layout;
        }
        return changed;
    }
    /**
     * Set rail cipher type
     * @param railtype Type of rail
     */
    public setRailType(railtype: ICipherType): boolean {
        let changed = false;
        if (this.state.cipherType !== railtype) {
            changed = true;
            this.state.cipherType = railtype;
            if (this.state.cipherType === ICipherType.Railfence) {
                this.setRailOrder("0123456789");
            }
        }
        return changed;
    }
    /**
     * Sorter to compare two order matching entries
     */
    public rsort(a: any, b: any): number {
        if (a.let < b.let) {
            return -1;
        } else if (a.let > b.let) {
            return 1;
        } else if (a.order < b.order) {
            return -1;
        } else if (a.order > b.order) {
            return 1;
        }
        return 0;
    }
    /**
     * Computer the order of rails based on the rail order string
     */
    public computeRailOrder(): void {
        let railorder =
            this.state.railOrder + this.repeatStr("z", this.state.rails);
        // Given the rail order string, compute the actual rail order.  Note that
        // the rail order string could be characters or just about anything else
        let sortset = [];
        for (let i = 0; i < this.state.rails; i++) {
            sortset.push({
                let: railorder.substr(i, 1),
                order: i,
            });
        }
        sortset.sort(this.rsort);
        this.railOrderOffs = [];
        for (let item of sortset) {
            this.railOrderOffs.push(item.order);
        }
    }
    /**
     * Set the order of rails
     * @param railorder New order string
     */
    public setRailOrder(railorder: string): boolean {
        let changed = false;
        if (this.state.railOrder !== railorder) {
            changed = true;
            this.state.railOrder = railorder;
        }
        this.computeRailOrder();
        return changed;
    }
    /**
     * Sets up the radio button to choose the variant of the cipher
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");

        let radiobuttons = [
            CipherTypeButtonItem(ICipherType.Railfence),
            CipherTypeButtonItem(ICipherType.Redefence),
        ];
        result.append(
            JTRadioButton(6, "railtype", radiobuttons, this.state.cipherType)
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
     * Set up the UI elements for the commands for this cipher assistant
     */
    public genPostCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");

        let radiobuttons = [
            { id: "wrow", value: RailLayout.W_by_Row, title: "W - by rows" },
            { id: "mrow", value: RailLayout.M_by_Row, title: "M - by rows" },
            {
                id: "wzig",
                value: RailLayout.W_Zig_Zag,
                title: "W - by zig-zag",
                class: "rail",
            },
            {
                id: "mzig",
                value: RailLayout.M_Zig_Zag,
                title: "M - by zig-zag",
                class: "rail",
            },
        ];
        result.append(
            JTRadioButton(8, "rlayout", radiobuttons, this.state.railLayout)
        );

        let inputbox = $("<div/>", {
            class: "grid-x grid-margin-x",
        });
        inputbox.append(
            JTFIncButton(
                "Number of Rails",
                "rails",
                this.state.rails,
                "small-12 medium-6 large-4"
            )
        );
        inputbox.append(
            JTFIncButton(
                "Starting Offset",
                "offset",
                this.state.railOffset,
                "small-12 medium-6 large-4"
            )
        );
        inputbox.append(
            JTFLabeledInput(
                "Rail Order",
                "text",
                "rorder",
                this.state.railOrder.substr(0, this.state.rails),
                "rede small-12 medium-12 large-4"
            )
        );
        result.append(inputbox);
        return result;
    }
    /**
     * Locate a string.
     * Note that we assume that the period has been set
     */
    public findPossible(str: string): void {
        let res = $("<span/>").text(
            "Unable to find " + str + " as " + this.normalizeHTML(str)
        );
        $(".findres")
            .empty()
            .append(res);
        this.attachHandlers();
    }
    /**
     * Analyze the cipher string and show any data for the user to make decisions.
     * encoded Encoded string to analyze
     */
    public genAnalysis(): JQuery<HTMLElement> {
        return null;
    }

    /**
     * Change the encrypted character.  This primarily shows us what the key might be if we use it
     */
    public setChar(): void {}

    /**
     * Builds the GUI for the solver
     */
    public build(): JQuery<HTMLElement> {
        let str = this.minimizeString(this.state.cipherString);
        // Generate the empty outlines array that we will output later.  This way
        // we don't have to check if a spot is empty, we can just write to it
        let outlines: string[][] = [];
        for (let rail = 0; rail < this.state.rails; rail++) {
            let line: Array<string> = [];
            for (let {} of str) {
                line.push(" ");
            }
            outlines.push(line);
        }
        let row = 0;
        let col = 0;
        let ydir = 1;
        let isZigZag = false;
        switch (this.state.railLayout) {
            case RailLayout.M_by_Row:
            default:
                isZigZag = true;
            case RailLayout.M_Zig_Zag:
                ydir = -1;
                row = this.state.rails - 1 - this.state.railOffset;
                break;
            case RailLayout.W_by_Row:
                isZigZag = true;
            case RailLayout.W_Zig_Zag:
                ydir = 1;
                row = this.state.railOffset;
                break;
        }
        let trow = row;
        let tydir = ydir;
        for (let c of str) {
            outlines[row][col] = c;
            row += ydir;
            if (row < 0) {
                row = 1;
                ydir = 1;
            } else if (row >= this.state.rails) {
                row = this.state.rails - 2;
                ydir = -1;
            }
            col++;
        }
        let offs: Array<number> = [];
        if (isZigZag) {
            // We need to figure out the number of letters in each column
            let lens: Array<number> = [];
            let railcost = this.state.rails * 2 - 2;
            let baselen = Math.floor(str.length / railcost);
            let remain = str.length - baselen * railcost;
            lens.push(baselen);
            for (let i = 1; i < this.state.rails - 1; i++) {
                lens.push(baselen * 2);
            }
            lens.push(baselen);

            while (remain > 0) {
                lens[trow]++;
                trow += tydir;
                if (trow < 0) {
                    trow = 1;
                    tydir = 1;
                } else if (trow >= this.state.rails) {
                    trow = this.state.rails - 2;
                    tydir = -1;
                }
                remain--;
            }
            let sortset = [];
            // We now have the proper lengths for each row.  We need to convert it to offsets
            for (let i in this.railOrderOffs) {
                sortset.push({
                    let: "",
                    order: this.railOrderOffs[i],
                    size: lens[i],
                });
            }
            sortset.sort(this.rsort);

            for (let rail = 0; rail < this.state.rails; rail++) {
                let offset = 0;
                for (let order = 0; order < this.railOrderOffs[rail]; order++) {
                    offset += sortset[order].size;
                }
                offs.push(offset);
            }
        }
        return this.buildRailPre(outlines, offs, isZigZag, str);
    }
    /**
     * build the output which shows the actual rails
     * outlines Array representation of the computed rail positions
     * offs Offsets for getting data from the string for a zigZag
     * isZigZag This is a zigzag version of the rail
     * str Original string for replacing from a zig zag
     */
    public buildRailPre(
        outlines: string[][],
        offs: number[],
        isZigZag: boolean,
        str: string
    ): JQuery<HTMLElement> {
        let ans: string[] = [];
        if (isZigZag) {
            for (let {} of str) {
                ans.push(" ");
            }
        }
        let ansline = "";
        // Now output what we found
        for (let r in outlines) {
            let set = outlines[r];
            let idx = offs[r];
            for (let ccol in set) {
                let c = set[ccol];
                if (c !== " ") {
                    if (isZigZag) {
                        // If we are doing a zig zag, we need to put the characters in
                        // as they came out from the string
                        c = str.substr(idx, 1);
                        ans[ccol] = c;
                        idx++;
                    } else {
                        ans.push(c);
                    }
                }
                ansline += c;
            }
            ansline += "\n";
        }
        ansline += "\n";
        this.state.solution = "";
        for (let c of ans) {
            ansline += c;
            this.state.solution += c;
        }
        this.state.solved = true;
        let result = $('<pre class="rail">' + ansline + "</pre>");
        return result;
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setRailType(this.state.cipherType);
        this.setRailLayout(this.state.railLayout);
        this.setRailCount(this.state.rails);
        this.setRailOffset(this.state.railOffset);
        this.setRailOrder(this.state.railOrder);
    }
    /**
     * Updates the output based on current settings
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.aca);
        // Propagate the current settings to the UI
        $("#encoded").val(this.state.cipherString);
        $("#rails").val(this.state.rails);
        $("#offset").val(this.state.railOffset);
        JTRadioButtonSet("rlayout", this.state.railLayout);
        JTRadioButtonSet("railtype", this.state.cipherType);
        $(".rorder").val(this.state.railOffset);
        $(".rail").toggle(this.state.cipherType === ICipherType.Railfence);
        $(".rede").toggle(this.state.cipherType === ICipherType.Redefence);

        // Compute the answer and populate that
        let res = this.build();
        $("#answer")
            .empty()
            .append(res);
    }
    /**
     * Fills in the frequency portion of the frequency table.  For the Ragbaby
     * we don't have the frequency table, so this doesn't need to do anything
     */
    public displayFreq(): void {}
    /**
     * Creates an HTML table to display the frequency of characters
     */
    public createFreqEditTable(): JQuery<HTMLElement> {
        return null;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $("#rails")
            .off("input")
            .on("input", e => {
                let newrails: number = Number($(e.target).val());
                if (newrails !== this.state.rails) {
                    this.markUndo(null);
                    if (this.setRailCount(newrails)) {
                        this.updateOutput();
                    }
                }
            });
        $("#offset")
            .off("input")
            .on("input", e => {
                let newoffset = Number($(e.target).val());
                if (newoffset !== this.state.railOffset) {
                    this.markUndo(null);
                    if (this.setRailOffset(newoffset)) {
                        this.updateOutput();
                    }
                }
            });
        $('[name="railtype"]')
            .off("click")
            .on("click", e => {
                this.markUndo(null);
                if (this.setRailType($(e.target).val() as ICipherType)) {
                    this.updateOutput();
                }
            });
        $('[name="rlayout"]')
            .off("click")
            .on("click", e => {
                this.markUndo(null);
                if (
                    this.setRailLayout(Number($(e.target).val()) as RailLayout)
                ) {
                    this.updateOutput();
                }
            });
        $("#rorder")
            .off("input")
            .on("input", e => {
                this.markUndo(null);
                if (this.setRailOrder(<string>$(e.target).val())) {
                    this.updateOutput();
                }
            });
    }
}
