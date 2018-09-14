import { toolMode } from "./cipherhandler";
import { CipherMorseSolver } from "./ciphermorsesolver";
import { ICipherType } from "./ciphertypes";
/**
 * Morbit Solver
 */
export class CipherMorbitSolver extends CipherMorseSolver {
    public activeToolMode: toolMode = toolMode.aca;
    public readonly morseReplaces: string[] = [
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
    public init(lang: string): void {
        this.defaultstate.cipherType = ICipherType.Morbit;
        super.init(lang);
        this.cipherWidth = 2;
        this.setCharset("123456789");
    }
}
