/// <reference types="ciphertypes" />

import { CipherAffineEncoder } from "./cipheraffineencoder"
import { CipherEncoder } from "./cipherencoder"
import { CipherHandler } from "./cipherhandler"

import { CipherCheckerboardSolver } from "./ciphercheckerboardsolver"
import { CipherCounter } from "./ciphercounter"
import { CryptarithmSolver } from "./ciphercryptarithmsolver"
import { CipherFractionatedMorseSolver } from "./cipherfractionatedmorsesolver"
import { CipherGromarkSolver } from "./ciphergromarksolver"
import { CipherMorbitSolver } from "./ciphermorbitsolver"
import { CipherRagbabySolver } from "./cipherragbabysolver"
import { CipherRailfenceSolver } from "./cipherrailfencesolver"
import { CipherSolver } from "./ciphersolver"
import { CipherTableEncoder } from "./ciphertableencoder"
import { ICipherType } from "./ciphertypes"
import { CipherVigenereEncoder } from "./ciphervigenereencoder"
import { CipherVigenereSolver } from "./ciphervigeneresolver"
import { CipherXenocryptSolver } from "./cipherxenocryptsolver"

export function CipherFactory(ciphertypestr: string, lang: string): CipherHandler {
    console.log('Selecting:' + ciphertypestr + " lang=" + lang)
    if (typeof lang === 'undefined') {
        lang = "en"
    }
    lang = lang.toLowerCase()

    let cipherTool: CipherHandler = null
    let ciphertype: ICipherType = ICipherType.None
    switch (ciphertypestr) {
        case 'Morbit':
            ciphertype = ICipherType.Morbit
            cipherTool = new CipherMorbitSolver()
            break

        case 'FractionatedMorse':
            ciphertype = ICipherType.FractionatedMorse
            cipherTool = new CipherFractionatedMorseSolver()
            break

        case 'Checkerboard':
            ciphertype = ICipherType.Checkerboard
            cipherTool = new CipherCheckerboardSolver()
            break

        case 'Gromark':
            ciphertype = ICipherType.Gromark
            cipherTool = new CipherGromarkSolver()
            break

        case 'Xenocrypt':
            ciphertype = ICipherType.Xenocrypt
            cipherTool = new CipherXenocryptSolver()
            break

        case 'Patristocrat':
            ciphertype = ICipherType.Patristocrat
            cipherTool = new CipherEncoder()
            break

        case 'Encoder':
            ciphertype = ICipherType.Aristocrat
            cipherTool = new CipherEncoder()
            break

        case 'Vigenere':
            ciphertype = ICipherType.Vigenere
            cipherTool = new CipherVigenereEncoder()
            break

        case 'VigenereSolver':
            ciphertype = ICipherType.Vigenere
            cipherTool = new CipherVigenereSolver()
            break

        case 'Affine':
            ciphertype = ICipherType.Affine
            cipherTool = new CipherAffineEncoder()
            break

        case 'Cryptarithm':
            ciphertype = ICipherType.Cryptarithm
            cipherTool = new CryptarithmSolver()
            break

        case 'RagbabySolver':
            ciphertype = ICipherType.Ragbaby
            cipherTool = new CipherRagbabySolver()
            break

        case 'RailfenceSolver':
            ciphertype = ICipherType.Railfence
            cipherTool = new CipherRailfenceSolver()
            break

        case 'Counter':
            ciphertype = ICipherType.Counter
            cipherTool = new CipherCounter()
            break

        case 'Caesar':
            ciphertype = ICipherType.Caesar
            cipherTool = new CipherTableEncoder()
            break

        case 'Atbash':
            ciphertype = ICipherType.Atbash
            cipherTool = new CipherTableEncoder()
            break

        case 'Standard':
            ciphertype = ICipherType.Standard
        default:
            cipherTool = new CipherSolver()
            break
    }
    cipherTool.setDefaultCipherType(ciphertype)
    cipherTool.init(lang)
    return cipherTool
}
