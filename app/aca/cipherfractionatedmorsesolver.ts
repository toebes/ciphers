import { toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { CipherMorseSolver } from "./ciphermorsesolver";
export class CipherFractionatedMorseSolver extends CipherMorseSolver {
    public activeToolMode: toolMode = toolMode.aca;
    public readonly morseReplaces: string[] = [
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
    public init(lang: string): void {
        this.defaultstate.cipherType = ICipherType.FractionatedMorse;
        super.init(lang);
        this.cipherWidth = 3;
        this.setCharset("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
}
