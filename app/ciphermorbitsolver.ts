import { cloneObject, StringMap } from "./ciphercommon";
import { CipherMorseSolver } from "./ciphermorsesolver"
import { ICipherType } from "./ciphertypes";

export class CipherMorbitSolver extends CipherMorseSolver {

    readonly defaultmorbitMap: StringMap = {
        '1': 'OO',
        '2': 'O-',
        '3': 'OX',
        '4': '-O',
        '5': '--',
        '6': '-X',
        '7': 'XO',
        '8': 'X-',
        '9': 'XX'
    }
    readonly morbitReplaces: Array<string> = ['OO', 'O-', 'OX', '-O', '--', '-X', 'XO', 'X-', 'XX']
    /** Current mapping of morbit values */
    morbitMap: StringMap = {}
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Morbit Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    init(): void {
        this.cipherType = ICipherType.Morbit
        this.cipherWidth = 2
        this.morbitMap = cloneObject(this.defaultmorbitMap) as StringMap
        this.setCharset('123456789')
    }
    load(): void {
        super.load()
    }
    getMorseMap(): StringMap {
        return this.morbitMap
    }
    unmapMorse(entry: string): number {
        return this.morbitReplaces.indexOf(entry)
    }

    setMorseMapEntry(entry: string, val: string): void {
        this.morbitMap[entry] = val
    }
    /*
     * Create an edit field for a dropdown
    */
    makeFreqEditField(c: string): JQuery<HTMLElement> {
        let mselect = $('<select class="msli" data-char="' + c + '" id="m' + c + '"/>')
        if (this.state.locked[c]) {
            mselect.prop("disabled", true)
        }
        let mreplaces = this.morbitReplaces.length
        let selected = []
        selected[this.morbitMap[c]] = " selected"
        for (let i = 0; i < mreplaces; i++) {
            let text = this.morbitReplaces[i]
            $("<option />", { value: i, selected: selected[text] })
                .html(this.normalizeHTML(text)).appendTo(mselect)
        }
        return mselect
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {string} val This is which element we are changing it to.  This is an index into the morbitReplaces table
     */
    updateSel(item: string, val: string): void {
        console.log('updateMorbitSet item=' + item + ' val=' + val)
        let toswapwith = item
        let newvalue = this.morbitReplaces[val]

        for (let key in this.morbitMap) {
            if (this.morbitMap.hasOwnProperty(key)) {
                if (this.morbitMap[key] === newvalue) {
                    toswapwith = key
                    break
                }
            }
        }
        if (toswapwith !== item) {
            let swapval = this.morbitMap[item]
            this.morbitMap[item] = this.morbitMap[toswapwith]
            this.morbitMap[toswapwith] = swapval
            this.UpdateFreqEditTable()
            this.load()
        }
    }
}
