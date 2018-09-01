import { setDisabled, StringMap } from "./ciphercommon";
import { toolMode } from "./cipherhandler";
import { CipherMorseSolver } from "./ciphermorsesolver";
import { ICipherType } from "./ciphertypes";
export class CipherFractionatedMorseSolver extends CipherMorseSolver {
    activeToolMode: toolMode = toolMode.aca;
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
        this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    reset(): void {
        super.reset();
        this.state.morseMap = {};
    }
    /*
     * Create an edit field for a dropdown
    */
    makeFreqEditField(c: string): JQuery<HTMLElement> {
        if (this.state.locked[c]) {
            return $(
                $("<span/>").html(this.normalizeHTML(this.state.morseMap[c]))
            );
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
                locklist[this.state.morseMap[key]] = true;
                console.log("Recording locklist[" + key + "]=" + locklist[key]);
            }
        }
        let mreplaces = this.fractionatedMorseReplaces.length;
        let disabledcb = false;
        let selected = [];
        selected[this.state.morseMap[c]] = "selected";
        if (this.state.morseMap[c] === undefined) {
            disabledcb = true;
            mselect.append(
                $("<option />", {
                    value: "",
                    disabled: "disabled",
                    selected: "selected",
                }).html("")
            );
        }
        for (let i = 0; i < mreplaces; i++) {
            let text = this.fractionatedMorseReplaces[i];
            console.log("Checkign for " + text);
            if (!locklist[text]) {
                mselect.append(
                    $("<option />", {
                        value: text,
                        selected: selected[text],
                    }).html(this.normalizeHTML(text))
                );
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
        setDisabled("#cb" + item, false);

        for (let key in this.state.morseMap) {
            if (this.state.morseMap.hasOwnProperty(key)) {
                if (this.state.morseMap[key] === val) {
                    toswapwith = key;
                    break;
                }
            }
        }
        if (toswapwith !== item) {
            const swapval = this.state.morseMap[item];
            this.state.morseMap[item] = this.state.morseMap[toswapwith];
            this.state.morseMap[toswapwith] = swapval;
            this.UpdateFreqEditTable();
            this.load();
        } else {
            this.state.morseMap[item] = val;
        }
    }
}
