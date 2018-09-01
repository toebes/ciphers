import { cloneObject, StringMap } from "./ciphercommon";
import { toolMode } from "./cipherhandler";
import { CipherMorseSolver } from "./ciphermorsesolver";
import { ICipherType } from "./ciphertypes";
/**
 * Morbit Solver
 */
export class CipherMorbitSolver extends CipherMorseSolver {
    activeToolMode: toolMode = toolMode.aca;
    readonly morbitReplaces: Array<string> = [
        "OO",
        "O-",
        "OX",
        "-O",
        "--",
        "-X",
        "XO",
        "X-",
        "XX",
    ];
    init(lang: string): void {
        this.defaultstate.cipherType = ICipherType.Morbit;
        super.init(lang);
        this.cipherWidth = 2;
        this.setCharset("123456789");
    }
    load(): void {
        super.load();
    }
    /**
     * Create an edit field for a dropdown
     * @param c Charcter to make dropdown for
     */
    makeFreqEditField(c: string): JQuery<HTMLElement> {
        let mselect = $(
            '<select class="msli" data-char="' + c + '" id="m' + c + '"/>'
        );
        if (this.state.locked[c]) {
            mselect.prop("disabled", true);
        }
        let mreplaces = this.morbitReplaces.length;
        let selected = [];
        selected[this.state.morseMap[c]] = " selected";
        for (let i = 0; i < mreplaces; i++) {
            let text = this.morbitReplaces[i];
            $("<option />", {
                value: i,
                selected: selected[text],
            })
                .html(this.normalizeHTML(text))
                .appendTo(mselect);
        }
        return mselect;
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     */
    updateSel(item: string, val: string): void {
        console.log("updateMorbitSet item=" + item + " val=" + val);
        let toswapwith = item;
        let newvalue = this.morbitReplaces[val];

        for (let key in this.state.morseMap) {
            if (this.state.morseMap.hasOwnProperty(key)) {
                if (this.state.morseMap[key] === newvalue) {
                    toswapwith = key;
                    break;
                }
            }
        }
        if (toswapwith !== item) {
            let swapval = this.state.morseMap[item];
            this.state.morseMap[item] = this.state.morseMap[toswapwith];
            this.state.morseMap[toswapwith] = swapval;
            this.UpdateFreqEditTable();
            this.load();
        }
    }
}
