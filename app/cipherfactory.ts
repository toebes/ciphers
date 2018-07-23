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
import { CipherVigenereEncoder } from "./ciphervigenereencoder"
import { CipherVigenereSolver } from "./ciphervigeneresolver"
import { CipherXenocryptSolver } from "./cipherxenocryptsolver"

export function CipherFactory(ciphertype: string, lang: string): CipherHandler {
    console.log('Selecting:' + ciphertype + " lang=" + lang)
    if (typeof lang === 'undefined') {
        lang = "en"
    }
    lang = lang.toLowerCase()

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

        case 'VigenereSolver':
            cipherTool = new CipherVigenereSolver()
            break

        case 'Affine':
            cipherTool = new CipherAffineEncoder()
            break

        case 'Cryptarithm':
            cipherTool = new CryptarithmSolver()
            break

        case 'RagbabySolver':
            cipherTool = new CipherRagbabySolver()
            break

        case 'RailfenceSolver':
            cipherTool = new CipherRailfenceSolver()
            break

        case 'Counter':
            cipherTool = new CipherCounter()
            break

        case 'Standard':
        default:
            cipherTool = new CipherSolver()
            break
    }
    cipherTool.init(lang)
    return cipherTool
}
