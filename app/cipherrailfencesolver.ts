import { IState } from "./cipherhandler"
import { CipherSolver } from "./ciphersolver"
import { CipherTypeInfo, ICipherType } from "./ciphertypes"
import { JTFIncButton } from "./jtfIncButton"
import { JTRadioButton } from "./jtradiobutton"
interface IRailState extends IState {
    /** The number of rails currently being tested */
    rails: number
    /** The current rail offset being tested */
    railOffset: number
    /** How the rails are laid out */
    railLayout: RailLayout
    /** The order string for a Redefence */
    railOrder: string
}

/** Limits on the range of the number of rails allowed */
const maxRails: number = 10
const minRails: number = 2
/** How the rails are laid out */
enum RailLayout {
    W_by_Row,
    M_by_Row,
    W_Zig_Zag,  // Railfence only
    M_Zig_Zag,  // Railfence only
}

/**
 * The CipherRailfenceSolver class implements a solver for the Railfence Cipher
 */
export class CipherRailfenceSolver extends CipherSolver {
    defaultstate: IRailState = {
        /** The current cipher we are working on */
        cipherString: '',
        /** The number of rails currently being tested */
        rails: 3,
        /** The current rail offset being tested */
        railOffset: 0,
        /** The type of cipher we are doing */
        cipherType: ICipherType.Railfence,
        /** How the rails are laid out */
        railLayout: RailLayout.W_by_Row,
        /** The order string for a Redefence */
        railOrder: "123456789"
    }
    state: IRailState = { ...this.defaultstate }

    railOrderOffs: Array<number>
    /**
     * Initializes the encoder/decoder.
     * @param {string} lang Language to select (EN is the default)
     */
    init(lang: string): void {
        super.init(lang)
        this.state = { ...this.defaultstate }
    }
    restore(data: SaveSet): void {
        this.state = this.defaultstate
        if (data.cipherString !== undefined) {
            this.state.cipherString = data.cipherString
        }
        if (data.rails !== undefined) {
            this.state.rails = data.rails
        }
        if (data.railOffset !== undefined) {
            this.state.railOffset = data.railOffset
        }
        if (data.cipherType !== undefined) {
            this.state.cipherType = data.cipherType
        }
        if (data.railLayout !== undefined) {
            this.state.railLayout = data.railLayout
        }
        if (data.railOrder !== undefined) {
            this.state.railOrder = data.railOrder
        }

        $('#encoded').val(this.state.cipherString)
        this.setUIDefaults()
        this.updateOutput()
    }
    /**
     * Make a copy of the current state
     */
    save(): IRailState {
        return { ...this.state }
    }
    /**
     * Set the number of rails
     * @param rails Number of rails requested
     */
    private setRailCount(rails: number): void {
        /** Range limit the number of rails */
        if (rails > maxRails) {
            rails = minRails;
        } else if (rails < minRails) {
            rails = maxRails;
        }
        this.state.rails = rails
        // Make sure that the rail offset is in range
        this.setRailOffset(this.state.railOffset)
        this.setRailOrder(this.state.railOrder)
    }
    /**
     * Set rail offset
     * @param railOffset New offset
     */
    private setRailOffset(railOffset: number): void {
        if (railOffset < 0) {
            railOffset = this.state.rails - 1;
        } else if (railOffset >= this.state.rails - 1) {
            railOffset = 0;
        }
        this.state.railOffset = railOffset
    }
    /**
     * Set rail layout type (M/W and by row or zig zag)
     * @param layout New raillayout type
     */
    private setRailLayout(layout: RailLayout): void {
        // We don't allow zig zag with Redefence, so switch to the matching by row type
        if (this.state.cipherType === ICipherType.Redefence) {
            if (layout === RailLayout.W_Zig_Zag) {
                layout = RailLayout.W_by_Row
            } else if (layout === RailLayout.M_Zig_Zag) {
                layout = RailLayout.M_by_Row
            }
        }
        this.state.railLayout = layout
    }
    /**
     * Set rail cipher type
     * @param railtype Type of rail
     */
    private setRailType(railtype: ICipherType): void {
        this.state.cipherType = railtype
        if (this.state.cipherType === ICipherType.Railfence) {
            this.setRailOrder("0123456789")
        }
    }
    /**
     * Sorter to compare two order matching entries
     */
    rsort(a: any, b: any): number {
        if (a.let < b.let) {
            return -1
        } else if (a.let > b.let) {
            return 1
        } else if (a.order < b.order) {
            return -1
        } else if (a.order > b.order) {
            return 1
        }
        return 0
    }
    /**
     * Computer the order of rails based on the rail order string
     */
    private computeRailOrder(): void {
        let railorder = this.state.railOrder + this.repeatStr('z', this.state.rails);
        // Given the rail order string, compute the actual rail order.  Note that
        // the rail order string could be characters or just about anything else
        let sortset = [];
        for (let i = 0; i < this.state.rails; i++) {
            sortset.push({ let: railorder.substr(i, 1), order: i });
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
    private setRailOrder(railorder: string): void {
        this.state.railOrder = railorder
        this.computeRailOrder()
    }
    /**
     * Set up the UI elements for the commands for this cipher assistant
     */
    makeCommands(): JQuery<HTMLElement> {
        let result = $("<div>")

        let radiobuttons = [
            { id: 'wrow', value: RailLayout.W_by_Row, title: 'W - by rows' },
            { id: 'mrow', value: RailLayout.M_by_Row, title: 'M - by rows' },
            { id: 'wzig', value: RailLayout.W_Zig_Zag, title: 'W - by zig-zag', class: 'rail' },
            { id: 'mzig', value: RailLayout.M_Zig_Zag, title: 'M - by zig-zag', class: 'rail' },
        ]
        result.append(JTRadioButton(8, 'rlayout', radiobuttons, this.state.railLayout))

        let inputbox = $("<div/>", { class: "grid-x grid-margin-x"})
        // let inputgroup = $("<div/>", { class: "input-group input-number-group cell small-6 medium-4" })
        // $("<span/>", { class: "input-group-label" }).text("Number of Rails").appendTo(inputgroup)
        // $("<div/>", {class: "input-group-button"}).append($("<span/>", {class: "input-number-decrement"}).text("-")).appendTo(inputgroup)
        // $('<input/>', { id: 'rails', class: 'input-number', type: 'number', value: this.state.rails }).appendTo(inputgroup)
        // $("<div/>", {class: "input-group-button"}).append($("<span/>", {class: "input-number-increment"}).text("+")).appendTo(inputgroup)
        // inputbox.append(inputgroup)
        inputbox.append(JTFIncButton("Number of Rails", "rails", this.state.rails, "small-6 medium-4"))

        // inputgroup = $("<div/>", { class: "input-group input-number-group cell small-6 medium-4" })
        // $("<span/>", { class: "input-group-label" }).text("Starting Offset").appendTo(inputgroup)
        // $("<div/>", {class: "input-group-button"}).append($("<span/>", {class: "input-number-decrement"}).text("-")).appendTo(inputgroup)
        // $('<input/>', { id: 'offset', class: 'input-number', type: 'number', value: this.state.railOffset }).appendTo(inputgroup)
        // $("<div/>", {class: "input-group-button"}).append($("<span/>", {class: "input-number-increment"}).text("+")).appendTo(inputgroup)
        // inputbox.append(inputgroup)
        inputbox.append(JTFIncButton("Starting Offset", "offset", this.state.railOffset, "small-6 medium-4"))

        let inputgroup = $("<div/>", { class: "input-group rede cell small-12 medium-4" })
        $("<span/>", { class: "input-group-label" }).text("Rail Order").appendTo(inputgroup)
        $('<input/>', {
            id: 'rorder', class: 'input-group-field',
            type: 'text', value: this.state.railOrder.substr(0, this.state.rails)
        }).appendTo(inputgroup)
        inputbox.append(inputgroup)
        result.append(inputbox)
        return result
    }
    /**
     * Sets up the radio button to choose the variant of the cipher
     */
    makeChoices(): JQuery<HTMLElement> {
        // let operationChoice = $('<div/>', { class: "row column medium-5 align-center" })

        let radiobuttons = [
            CipherTypeInfo.RadioButtonItem(ICipherType.Railfence),
            CipherTypeInfo.RadioButtonItem(ICipherType.Redefence),
        ]
        return JTRadioButton(6, 'railtype', radiobuttons, this.state.cipherType)
        // operationChoice.append(JTRadioButton(6, 'railtype', radiobuttons, this.state.cipherType))

        // return operationChoice
    }
    /**
     * Locate a string.
     * Note that we assume that the period has been set
     * @param {string} str string to look for
     */
    findPossible(str: string): void {
        let res = $("<span>").text('Unable to find ' + str + ' as ' + this.normalizeHTML(str))
        $(".findres").empty().append(res)
        this.attachHandlers()
    }
    /**
     * Analyze the cipher string and show any data for the user to make decisions.
     * @param encoded Encoded string to analyze
     */
    analyze(encoded: string): JQuery<HTMLElement> {
        return null
    }

    /**
     * Change the encrypted character.  This primarily shows us what the key might be if we use it
     * @param {string} repchar character slot to map against (This is a character and an offset)
     * @param {string} newchar New char to assign as decoding for the character
     */
    setChar(repchar: string, newchar: string): void {
    }

    /**
     * Builds the GUI for the solver
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    build(str: string): JQuery<HTMLElement> {
        this.state.cipherString = str
        str = this.minimizeString(str)
        // Generate the empty outlines array that we will output later.  This way
        // we don't have to check if a spot is empty, we can just write to it
        let outlines: string[][] = []
        for (let rail = 0; rail < this.state.rails; rail++) {
            let line: Array<string> = []
            for (let c of str) {
                line.push(" ")
            }
            outlines.push(line)
        }
        let row = 0
        let col = 0
        let ydir = 1
        let isZigZag = false
        switch (this.state.railLayout) {
            case RailLayout.M_by_Row:
            default:
                isZigZag = true
            case RailLayout.M_Zig_Zag:
                ydir = -1
                row = this.state.rails - 1 - this.state.railOffset
                break
            case RailLayout.W_by_Row:
                isZigZag = true
            case RailLayout.W_Zig_Zag:
                ydir = 1
                row = this.state.railOffset
                break
        }
        let trow = row
        for (let c of str) {
            outlines[row][col] = c
            row += ydir
            if (row < 0) {
                row = 1
                ydir = 1
            } else if (row >= this.state.rails) {
                row = this.state.rails - 2
                ydir = -1
            }
            col++
        }
        let offs: Array<number> = []
        if (isZigZag) {
            // We need to figure out the number of letters in each column
            let lens: Array<number> = []
            let tydir = ydir
            let railcost = this.state.rails * 2 - 2
            let baselen = Math.floor(str.length / railcost)
            let remain = str.length - baselen * railcost
            lens.push(baselen)
            for (let i = 1; i < this.state.rails - 1; i++) {
                lens.push(baselen * 2)
            }
            lens.push(baselen)

            while (remain > 0) {
                lens[trow]++
                trow += tydir
                if (trow < 0) {
                    trow = 1
                    tydir = 1
                } else if (trow >= this.state.rails) {
                    trow = this.state.rails - 2
                    tydir = -1
                }
                remain--
            }
            let sortset = []
            // We now have the proper lengths for each row.  We need to convert it to offsets
            for (let i in this.railOrderOffs) {
                sortset.push({ let: '', order: this.railOrderOffs[i], size: lens[i] });
            }
            sortset.sort(this.rsort);

            for (let rail = 0; rail < this.state.rails; rail++) {
                let offset = 0
                for (let order = 0; order < this.railOrderOffs[rail]; order++) {
                    offset += sortset[order].size
                }
                offs.push(offset)
            }
        }
        return this.buildRailPre(outlines, offs, isZigZag, str)
    }
    /**
     * build the output which shows the actual rails
     * @param outlines Array representation of the computed rail positions
     * @param offs Offsets for getting data from the string for a zigZag
     * @param isZigZag This is a zigzag version of the rail
     * @param str Original string for replacing from a zig zag
     */
    buildRailPre(outlines: string[][], offs: number[], isZigZag: boolean, str: string): JQuery<HTMLElement> {
        let ans: string[] = []
        if (isZigZag) {
            for (let c of str) {
                ans.push(" ")
            }
        }
        let ansline = ""
        // Now output what we found
        for (let r in outlines) {
            let set = outlines[r]
            let idx = offs[r]
            for (let ccol in set) {
                let c = set[ccol]
                if (c !== ' ') {
                    if (isZigZag) {
                        // If we are doing a zig zag, we need to put the characters in
                        // as they came out from the string
                        c = str.substr(idx, 1)
                        ans[ccol] = c
                        idx++
                    } else {
                        ans.push(c)
                    }
                }
                ansline += c
            }
            ansline += "\n"
        }
        ansline += "\n"
        for (let c of ans) {
            ansline += c
        }
        let result = $("<pre class=\"rail\">" + ansline + "</pre>")
        return result
    }
    /**
     * Updates the output based on current settings
     */
    updateOutput(): void {
        // Propagate the current settings to the UI
        this.updateUI();

        // Compute the answer and populate that
        let res = this.build(this.state.cipherString);
        $("#answer").empty().append(res);

    }
    private updateUI(): void {
        $("#rails").val(this.state.rails)
        $("#offset").val(this.state.railOffset)
        $('[name="rlayout"]').removeClass('is-active')
        $('[name="rlayout"][value=' + this.state.railLayout + "]").addClass('is-active')
        $('[name="railtype"]').removeClass('is-active')
        $('[name="railtype"][value=' + this.state.cipherType + "]").addClass('is-active')
        $(".rorder").val(this.state.railOffset)
        $(".rail").toggle((this.state.cipherType === ICipherType.Railfence))
        $(".rede").toggle((this.state.cipherType === ICipherType.Redefence))
    }

    /**
     *
     */
    buildCustomUI(): void {
        super.buildCustomUI()
        $('.precmds').each((i, elem) => {
            $(elem).replaceWith(this.makeChoices())
        })
        $('.postcmds').each((i, elem) => {
            $(elem).replaceWith(this.makeCommands())
        })
    }
    /**
     * Creates an HTML table to display the frequency of characters
     * @returns {JQuery<HTMLElement} HTML to put into a DOM element
     */
    createFreqEditTable(): JQuery<HTMLElement> {
        let topdiv = $("<div>")
        topdiv.append($("<div>", { id: "ragwork", class: "ragedit" }))
        return topdiv
    }
    /**
     * Propagate any default settings to the UI
     */
    setUIDefaults(): void {
        this.setRailType(this.state.cipherType)
        this.setRailLayout(this.state.railLayout)
        this.setRailCount(this.state.rails)
        this.setRailOffset(this.state.railOffset)
        this.setRailOrder(this.state.railOrder)
        this.updateUI()
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        super.attachHandlers()
        $("#rails").off('input').on('input', (e) => {
            let newrails: number = Number($(e.target).val())
            if (newrails !== this.state.rails) {
                this.markUndo()
                this.setRailCount(newrails)
                this.updateOutput()
                if (newrails !== this.state.rails) {
                    $(e.target).val(this.state.rails)
                    return false
                }
            }
        })
        $("#offset").off('input').on('input', (e) => {
            let newoffset = Number($(e.target).val())
            if (newoffset !== this.state.railOffset) {
                this.markUndo()
                this.setRailOffset(newoffset)
                this.updateOutput()
                if (newoffset !== this.state.railOffset) {
                    $(e.target).val(this.state.railOffset)
                    return false
                }
            }
        })
        $('[name="railtype"]').off('click').on('click', (e) => {
            $(e.target).siblings().removeClass('is-active');
            $(e.target).addClass('is-active');
            this.markUndo()
            this.setRailType($(e.target).val() as ICipherType)
            this.updateOutput()
        });
        $('[name="rlayout"]').off('click').on('click', (e) => {
            $(e.target).siblings().removeClass('is-active');
            $(e.target).addClass('is-active');
            this.markUndo()
            this.setRailLayout(Number($(e.target).val()) as RailLayout)
            this.updateOutput()
        });
        $("#rorder").off('input').on('input', (e) => {
            this.markUndo()
            this.setRailOrder(<string>$(e.target).val())
            this.updateOutput()
        })
    }
}
