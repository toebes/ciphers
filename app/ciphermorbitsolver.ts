import { toolMode } from "./cipherhandler";
import { CipherMorseSolver } from "./ciphermorsesolver";
import { ICipherType } from "./ciphertypes";
/**
 * Morbit Solver
 */
export class CipherMorbitSolver extends CipherMorseSolver {
    activeToolMode: toolMode = toolMode.aca;
    readonly morseReplaces: string[] = [
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
}
