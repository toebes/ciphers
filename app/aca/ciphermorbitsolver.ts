import { toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { CipherMorseSolver } from "./ciphermorsesolver";
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
