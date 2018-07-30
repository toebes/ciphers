/// <reference types="ciphertypes" />

import { CipherAffineEncoder } from "./cipheraffineencoder"
import { CipherCheckerboardSolver } from "./ciphercheckerboardsolver"
import { CipherCounter } from "./ciphercounter"
import { CryptarithmSolver } from "./ciphercryptarithmsolver"
import { CipherEncoder } from "./cipherencoder"
import { CipherFractionatedMorseSolver } from "./cipherfractionatedmorsesolver"
import { CipherGromarkSolver } from "./ciphergromarksolver"
import { CipherHandler } from "./cipherhandler"
import { CipherHillEncoder } from "./cipherhillencoder"
import { CipherMorbitSolver } from "./ciphermorbitsolver"
import { CipherRagbabySolver } from "./cipherragbabysolver"
import { CipherRailfenceSolver } from "./cipherrailfencesolver"
import { CipherSolver } from "./ciphersolver"
import { CipherTableEncoder } from "./ciphertableencoder"
import { CipherTest } from "./ciphertest"
import { ICipherType } from "./ciphertypes"
import { CipherVigenereEncoder } from "./ciphervigenereencoder"
import { CipherVigenereSolver } from "./ciphervigeneresolver"
import { CipherXenocryptSolver } from "./cipherxenocryptsolver"

interface ICipherFactoryEntry {
    cipherType: ICipherType
    cipherClass: typeof CipherHandler
}

/**
 * This maps the arbitrary strings from the HTML files into the appropriate
 * CipherHandler class.
 */
let cipherFactoryMap: {[index: string]: ICipherFactoryEntry} = {
    Morbit: {
        cipherType: ICipherType.Morbit,
        cipherClass: CipherMorbitSolver,
    },
    FractionatedMorse: {
        cipherType: ICipherType.FractionatedMorse,
        cipherClass: CipherFractionatedMorseSolver,
    },
    Checkerboard: {
        cipherType: ICipherType.Checkerboard,
        cipherClass: CipherCheckerboardSolver,
    },
    Gromark: {
        cipherType: ICipherType.Gromark,
        cipherClass: CipherGromarkSolver,
    },
    Xenocrypt: {
        cipherType: ICipherType.Xenocrypt,
        cipherClass: CipherXenocryptSolver,
    },
    Hill: {
        cipherType: ICipherType.Hill,
        cipherClass: CipherHillEncoder,
    },
    Patristocrat: {
        cipherType: ICipherType.Patristocrat,
        cipherClass: CipherEncoder,
    },
    Encoder: {
        cipherType: ICipherType.Aristocrat,
        cipherClass: CipherEncoder,
    },
    Vigenere: {
        cipherType: ICipherType.Vigenere,
        cipherClass: CipherVigenereEncoder,
    },
    VigenereSolver: {
        cipherType: ICipherType.Vigenere,
        cipherClass: CipherVigenereSolver,
    },
    Affine: {
        cipherType: ICipherType.Affine,
        cipherClass: CipherAffineEncoder,
    },
    Cryptarithm: {
        cipherType: ICipherType.Cryptarithm,
        cipherClass: CryptarithmSolver,
    },
    RagbabySolver: {
        cipherType: ICipherType.Ragbaby,
        cipherClass: CipherRagbabySolver,
    },
    RailfenceSolver: {
        cipherType: ICipherType.Railfence,
        cipherClass: CipherRailfenceSolver,
    },
    Counter: {
        cipherType: ICipherType.Counter,
        cipherClass: CipherCounter,
    },
    Caesar: {
        cipherType: ICipherType.Caesar,
        cipherClass: CipherTableEncoder,
    },
    Atbash: {
        cipherType: ICipherType.Atbash,
        cipherClass: CipherTableEncoder,
    },
    Test: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTest,
    },
    Standard: {
        cipherType: ICipherType.Standard,
        cipherClass: CipherSolver
    },
}

export function CipherFactory(ciphertypestr: string, lang: string): CipherHandler {
    console.log('Selecting:' + ciphertypestr + " lang=" + lang)
    if (typeof lang === 'undefined') {
        lang = "en"
    }
    lang = lang.toLowerCase()

    let entry: ICipherFactoryEntry = {
        cipherType: ICipherType.None,
        cipherClass: CipherSolver
    }
    if (typeof(cipherFactoryMap[ciphertypestr]) !== 'undefined') {
        entry = cipherFactoryMap[ciphertypestr]
    }
    let cipherTool: CipherHandler = new entry.cipherClass()
    cipherTool.setDefaultCipherType(entry.cipherType)
    cipherTool.init(lang)
    return cipherTool
}
