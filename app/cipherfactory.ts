/// <reference types="ciphertypes" />

import CipherHandler from "./cipherhandler"
import CipherEncoder from "./cipherencoder"
import CipherAffineEncoder from "./cipheraffineencoder"

import CipherSolver from "./ciphersolver"
import CipherCheckerboardSolver from "./ciphercheckerboardsolver"
import CipherGromarkSolver from "./ciphergromarksolver"
import CipherMorseSolver from "./ciphermorsesolver"
import CipherMorbitSolver from "./ciphermorbitsolver"
import CipherFractionatedMorseSolver from "./cipherfractionatedmorsesolver"
import CipherVigenereEncoder from "./ciphervigenereencoder"
import CipherXenocryptSolver from "./cipherxenocryptsolver"
import CryptarithmSolver from "./ciphercryptarithmsolver"

export default 
function CipherFactory(ciphertype: string, lang: string): CipherHandler {
    console.log('Selecting:' + ciphertype + " lang=" + lang);
    if (typeof lang === 'undefined') {
        lang = "en";
    }
    lang = lang.toLowerCase();

    let cipherTool: CipherHandler = null
    switch (ciphertype) {
        case 'Morbit':
            cipherTool = new CipherMorbitSolver()
            break

        case 'FractionatedMorse':
            cipherTool = new CipherFractionatedMorseSolver()
            break

        case 'Checkerboard':
            cipherTool = new CipherCheckerboardSolver()
            break

        case 'Gromark':
            cipherTool = new CipherGromarkSolver()
            break

        case 'Xenocrypt':
            cipherTool = new CipherXenocryptSolver()
            break

        case 'Encoder':
            cipherTool = new CipherEncoder()
            break

        case 'Vigenere':
            cipherTool = new CipherVigenereEncoder()
            break

        case 'Affine':
            cipherTool = new CipherAffineEncoder()
            break

        case 'Cryptarithm':
            cipherTool = new CryptarithmSolver()

        case 'Standard':
        default:
            cipherTool = new CipherSolver()
            break
    }
    cipherTool.init(lang);
    return cipherTool
}
