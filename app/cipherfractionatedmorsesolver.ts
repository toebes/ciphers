import { cloneObject, StringMap } from "./ciphercommon";
import { toolMode } from "./cipherhandler";
import { CipherMorseSolver } from "./ciphermorsesolver";
import { ICipherType } from "./ciphertypes";
export class CipherFractionatedMorseSolver extends CipherMorseSolver {
    activeToolMode: toolMode = toolMode.aca;
    readonly defaultfractionatedMorseMap: StringMap = {
        A: "OOO",
        B: "OO-",
        C: "OOX",
        D: "O-O",
        E: "O--",
        F: "O-X",
        G: "OXO",
        H: "OX-",
        I: "OXX",
        J: "-OO",
        K: "-O-",
        L: "-OX",
        M: "--O",
        N: "---",
        O: "--X",
        P: "-XO",
        Q: "-X-",
        R: "-XX",
        S: "XOO",
        T: "XO-",
        U: "XOX",
        V: "X-O",
        W: "X--",
        X: "X-X",
        Y: "XXO",
        Z: "XX-",
    };
    fractionatedMorseMap: StringMap = {};

    readonly fractionatedMorseReplaces: Array<string> = [
        "OOO",
        "OO-",
        "OOX",
        "O-O",
        "O--",
        "O-X",
        "OXO",
        "OX-",
        "OXX",
        "-OO",
        "-O-",
        "-OX",
        "--O",
        "---",
        "--X",
        "-XO",
        "-X-",
        "-XX",
        "XOO",
        "XO-",
        "XOX",
        "X-O",
        "X--",
        "X-X",
        "XXO",
        "XX-",
    ];

    /**
     *
     * Fractionated Morse Solver
     *
     */
    init(lang: string): void {
        this.defaultstate.cipherType = ICipherType.FractionatedMorse;
        super.init(lang);
        this.cipherWidth = 3;
        this.fractionatedMorseMap = cloneObject(
            this.defaultfractionatedMorseMap
        ) as StringMap;
        this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    getMorseMap(): StringMap {
        return this.fractionatedMorseMap;
    }
    setMorseMapEntry(entry: string, val: string): void {
        this.fractionatedMorseMap[entry] = val;
    }
    unmapMorse(entry: string): number {
        return this.fractionatedMorseReplaces.indexOf(entry);
    }
    /*
     * Create an edit field for a dropdown
    */
    makeFreqEditField(c: string): JQuery<HTMLElement> {
        if (this.state.locked[c]) {
            return $(this.normalizeHTML(this.fractionatedMorseMap[c]));
        }
        let mselect = $(
            '<select class="msli" data-char="' + c + '" id="m' + c + '"/>'
        );
        const locklist = {};
        /* Build a list of the locked strings we should skip */
        for (let key in this.state.locked) {
            if (
                this.state.locked.hasOwnProperty(key) &&
                this.state.locked[key]
            ) {
                locklist[this.fractionatedMorseMap[key]] = true;
                console.log("Recording locklist[" + key + "]=" + locklist[key]);
            }
        }
        let mreplaces = this.fractionatedMorseReplaces.length;
        let selected = [];
        selected[this.fractionatedMorseMap[c]] = " selected";
        for (let i = 0; i < mreplaces; i++) {
            let text = this.fractionatedMorseReplaces[i];
            console.log("Checkign for " + text);
            if (!locklist[text]) {
                $("<option />", { value: text, selected: selected[text] })
                    .html(this.normalizeHTML(text))
                    .appendTo(mselect);
            }
        }
        return mselect;
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     */
    public updateSel(item: string, val: string): void {
        console.log("updateFractionatedMorseSel item=" + item + " val=" + val);
        let toswapwith = item;

        for (let key in this.fractionatedMorseMap) {
            if (this.fractionatedMorseMap.hasOwnProperty(key)) {
                if (this.fractionatedMorseMap[key] === val) {
                    toswapwith = key;
                    break;
                }
            }
        }
        if (toswapwith !== item) {
            const swapval = this.fractionatedMorseMap[item];
            this.fractionatedMorseMap[item] = this.fractionatedMorseMap[
                toswapwith
            ];
            this.fractionatedMorseMap[toswapwith] = swapval;
            this.UpdateFreqEditTable();
            this.load();
        }
    }
}
