import JTRadioButton from "./jtradiobutton"
import CipherSolver from "./ciphersolver"
import { ICipherType, CipherTypeInfo }  from "./ciphertypes"

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
export default class CipherRailfenceSolver extends CipherSolver {
    defaultstate = {
        /** The current cipher we are working on */
        cipherString: '',
        /** The number of rails currently being tested */
        rails: 3,
        /** The current rail offset being tested */
        railOffset: 0,
        /** The type of cipher we are doing */
        railType: ICipherType.Railfence,
        /** How the rails are laid out */
        railLayout: RailLayout.W_by_Row,
        /** The order string for a Redefence */
        railOrder: "123456789"
    }
    state = this.defaultstate

    railOrderOffs: Array<number>
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
        if (data.railType !== undefined) {
            this.state.railType = data.railType
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
    save(): SaveSet {
        return {...this.state}
    }
    /**
     * Set the number of rails
     * @param rails Number of rails requested
     */
    private setRailCount(rails: number): void {
        /** Range limit the number of rails */
        if (rails > maxRails) {
            rails = minRails;
        }
        else if (rails < minRails) {
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
        }
        else if (railOffset >= this.state.rails - 1) {
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
        if (this.state.railType === ICipherType.Redefence) {
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
        this.state.railType = railtype
        if (this.state.railType === ICipherType.Railfence) {
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
        result.append(JTRadioButton('raillay', 'Variant', 'rlayout', radiobuttons, this.state.railLayout))

        result.append($('<label>', { for: 'rails' }).text('Number of Rails'))
        result.append($('<input/>', { id: 'rails', class: 'inp spinr', title: 'Number of Rails', type: 'text', value: this.state.rails }))

        result.append($('<label>', { for: 'offset' }).text('Starting Offset'))
        result.append($('<input/>', { id: 'offset', class: 'inp spino', title: 'Starting Offset', type: 'text', value: this.state.railOffset }))

        result.append($('<label>', { for: 'rorder', class: "rede" }).text('Rail Order'))
        result.append($('<input/>', { id: 'rorder', class: "rede", title: 'Rail Order', type: 'text', value: this.state.railOrder.substr(0, this.state.rails) }))

        return result
    }
    /**
     * Sets up the radio button to choose the variant of the cipher
     */
    makeChoices(): JQuery<HTMLElement> {
        let operationChoice = $('<div>')

        let radiobuttons = [
            CipherTypeInfo.RadioButtonItem(ICipherType.Railfence),
            CipherTypeInfo.RadioButtonItem(ICipherType.Redefence),
        ]
        operationChoice.append(JTRadioButton('railtyper', 'Cipher Type', 'railtype', radiobuttons, this.state.railType))

        return operationChoice
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
        let outlines: Array<Array<string>> = []
        for (let row = 0; row < this.state.rails; row++) {
            let line: Array<string> = []
            for (let col = 0; col < str.length; col++) {
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
        let ans: Array<string> = []
        if (isZigZag) {
            for (let c of str) {
                ans.push(" ")
            }
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

            for (let row = 0; row < this.state.rails; row++) {
                let offset = 0
                for (let order = 0; order < this.railOrderOffs[row]; order++) {
                    offset += sortset[order].size
                }
                offs.push(offset)
            }
        }
        let ansline = ""
        // Now output what we found
        for (let row in outlines) {
            let set = outlines[row]
            let idx = offs[row]
            for (let col in set) {
                let c = set[col]
                if (c !== ' ') {
                    if (isZigZag) {
                        // If we are doing a zig zag, we need to put the characters in
                        // as they came out from the string
                        c = str.substr(idx, 1)
                        ans[col] = c
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
        $(".spinr").spinner("value", this.state.rails);
        $(".spino").spinner("value", this.state.railOffset);
        $('[name="rlayout"]').removeAttr('checked');
        $("input[name=rlayout][value=" + this.state.railLayout + "]").prop('checked', true);
        $('[name="railtype"]').removeAttr('checked');
        $("input[name=railtype][value=" + this.state.railType + "]").prop('checked', true);
        $(".rorder").val(this.state.railOffset);
        $(".rail").toggle((this.state.railType === ICipherType.Railfence));
        $(".rede").toggle((this.state.railType === ICipherType.Redefence));
    }

    /**
     * 
     */
    buildCustomUI(): void {
        super.buildCustomUI()
        $('.precmds').each((i, elem) => {
            $(elem).empty().append(this.makeChoices())
        })
        $('.postcmds').each((i, elem) => {
            $(elem).empty().append(this.makeCommands())
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
        this.setRailType(this.state.railType)
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
        $(".spinr").spinner({
            spin: (event, ui) => {
                if (ui.value != this.state.rails) {
                    this.markUndo()
                    this.setRailCount(ui.value)
                    this.updateOutput()
                    if (ui.value != this.state.rails) {
                        $(event.target).spinner("value", this.state.rails)
                        return false
                    }
                }
            }
        })
        $(".spino").spinner({
            spin: (event, ui) => {
                if (ui.value != this.state.railOffset) {
                    this.markUndo()
                    this.setRailOffset(ui.value)
                    this.updateOutput()
                    if (ui.value != this.state.railOffset) {
                        $(event.target).spinner("value", this.state.railOffset)
                        return false
                    }
                }
            }
        })
        $('input[type=radio][name=rlayout]').off('change').on('change', () => {
            this.markUndo()
            this.setRailLayout(Number($("input[name='rlayout']:checked").val()) as RailLayout)
            this.updateOutput()
        })
        $('input[type=radio][name=railtype]').off('change').on('change', () => {
            this.markUndo()
            this.setRailType(Number($("input[name='railtype']:checked").val()) as ICipherType)
            this.updateOutput()
        })
        $("#rorder").off('input').on('input', (e) => {
            this.markUndo()
            this.setRailOrder(<string>$(e.target).val())
            this.updateOutput()
        })
    }
}