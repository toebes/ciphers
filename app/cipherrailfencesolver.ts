import JTRadioButton from "./jtradiobutton"
import CipherSolver from "./ciphersolver"

/** Limits on the range of the number of rails allowed */
const maxRails: number = 10
const minRails: number = 2
/** How the rails are laid out */
enum RailLayout {
    W_by_Row,
    M_by_Row,
    W_Zig_Zag,
    M_Zig_Zag,
}
/** Which type of cipher we are solving */
enum RailType {
    Railfence,
    Redefence,
}
/**
 * The CipherRailfenceSolver class implements a solver for the Railfence Cipher
 */
export default class CipherRailfenceSolver extends CipherSolver {
    /** The current cipher we are working on */
    cipherString: string = ''
    /** The number of rails currently being tested */
    rails: number = 3
    /** The current rail offset being tested */
    railOffset: number = 0

    railtype: RailType = RailType.Railfence
    raillayout: RailLayout = RailLayout.W_by_Row

    makeCommands(): JQuery<HTMLElement> {
        let result = $("<div>")

        let radiobuttons = [
            { id: 'wrow', value: RailLayout.W_by_Row, title: 'W - by rows' },
            { id: 'mrow', value: RailLayout.M_by_Row, title: 'M - by rows' },
            { id: 'wzig', value: RailLayout.W_Zig_Zag, title: 'W - by zig-zag' },
            { id: 'mzig', value: RailLayout.M_Zig_Zag, title: 'M - by zig-zag' },
        ]
        result.append(JTRadioButton('raillay', 'Variant', 'rlayout', radiobuttons, this.raillayout))

        result.append($('<label>', { for: 'rails' }).text('Number of Rails'))
        result.append($('<input/>', { id: 'rails', class: 'inp spinr', title: 'Number of Rails', type: 'text', value: this.rails }))

        result.append($('<label>', { for: 'offset' }).text('Starting Offset'))
        result.append($('<input/>', { id: 'offset', class: 'inp spino', title: 'Starting Offset', type: 'text', value: this.railOffset }))

        return result
    }
    /**
     * Sets up the radio button to choose the variant
     */
    makeChoices(): JQuery<HTMLElement> {
        let operationChoice = $('<div>')

        let radiobuttons = [
            { id: 'rail', value: RailType.Railfence, title: 'Railfence' },
            { id: 'rede', value: RailType.Redefence, title: 'Redefence', disabled: 'disabled' },
        ]
        operationChoice.append(JTRadioButton('railtyper', 'Cipher Type', 'railtype', radiobuttons, this.railtype))

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

    analyze(encoded: string): JQuery<HTMLElement> {
        return null
    }
    setRailLayout(layout: RailLayout) {
        this.raillayout = layout
        this.updateOutput()
    }
    setRailType(railtype: RailType) {
        this.railtype = railtype
        this.updateOutput()
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
        this.cipherString = str
        str = this.minimizeString(str)
        // Generate the empty outlines array that we will output later.  This way
        // we don't have to check if a spot is empty, we can just write to it
        let outlines: Array<Array<string>> = []
        for (let row = 0; row < this.rails; row++) {
            let line: Array<string> = []
            for (let col = 0; col < str.length; col++) {
                line.push(" ")
            }
            outlines.push(line)
        }
        let row = 0
        let col = 0
        let ydir = 1
        let isZigZag = true
        switch (this.raillayout) {
            case RailLayout.M_by_Row:
                isZigZag = false
            case RailLayout.M_Zig_Zag:
                ydir = -1
                row = this.rails - 1 - this.railOffset
                break
            case RailLayout.W_by_Row:
            isZigZag = false
            case RailLayout.W_Zig_Zag:
                ydir = 1
                row = this.railOffset
                break
        }
        for (let c of str) {
            outlines[row][col] = c
            row += ydir
            if (row < 0) {
                row = 1
                ydir = 1
            } else if (row >= this.rails) {
                row = this.rails - 2
                ydir = -1
            }
            col++
        }
        let idx = 0
        let ans :Array<string> = []
        if (isZigZag) {
            for (let c of str) {
                ans.push(" ")
            }
        }
        let ansline = ""
        // Now output what we found
        for (let set of outlines) {
            for (let col in set) {
                let c = set[col]
                if (c !== ' ') {
                    if (isZigZag){
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
        for(let c of ans) {
            ansline += c
        }
        let result = $("<pre class=\"rail\">"+ansline+"</pre>")
        return result
    }
    /**
     * Updates the output based on current settings
     */
    updateOutput(): void {
        let res = this.build(this.cipherString);
        $("#answer").empty().append(res);
    }
    /**
     * 
     */
    layout(): void {
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
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        super.attachHandlers()
        $(".spinr").spinner({
            spin: (event, ui) => {
                this.rails = ui.value
                /** Range limit the number of rails */
                if (ui.value > maxRails) {
                    this.rails = minRails
                } else if (ui.value < minRails) {
                    this.rails = maxRails
                }
                if (ui.value != this.rails) {
                    $(event.target).spinner("value", this.rails)
                    this.updateOutput()
                    return false
                }
                this.updateOutput()
            }
        })
        $(".spino").spinner({
            spin: (event, ui) => {
                this.railOffset = ui.value
                if (this.railOffset < 0) {
                    this.railOffset = this.rails - 1
                } else if (this.railOffset >= this.rails - 1) {
                    this.railOffset = 0
                }
                if (ui.value != this.railOffset) {
                    $(event.target).spinner("value", this.railOffset)
                    this.updateOutput()
                    return false
                }
                this.updateOutput()
            }
        })
        $('input[type=radio][name=rlayout]').off('change').on('change', () => {
            this.setRailLayout(<RailLayout>Number($("input[name='rlayout']:checked").val()))
        })
        $('input[type=radio][name=railtype]').off('change').on('change', () => {
            this.setRailType(<RailType>Number($("input[name='railtype']:checked").val()))
        })

    }
}