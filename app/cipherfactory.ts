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
import { CipherTestAnswers } from "./ciphertestanswers"
import { CipherTestGenerator } from "./ciphertestgenerator"
import { CipherTestManage } from "./ciphertestmanage"
import { CipherTestPrint } from "./ciphertestprint"
import { CipherTestQuestions } from "./ciphertestquestions"
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
let cipherFactoryMap: { [index: string]: ICipherFactoryEntry } = {
    Affine: {
        cipherType: ICipherType.Affine,
        cipherClass: CipherAffineEncoder,
    },
    Atbash: {
        cipherType: ICipherType.Atbash,
        cipherClass: CipherTableEncoder,
    },
    Caesar: {
        cipherType: ICipherType.Caesar,
        cipherClass: CipherTableEncoder,
    },
    Checkerboard: {
        cipherType: ICipherType.Checkerboard,
        cipherClass: CipherCheckerboardSolver,
    },
    Counter: {
        cipherType: ICipherType.Counter,
        cipherClass: CipherCounter,
    },
    Cryptarithm: {
        cipherType: ICipherType.Cryptarithm,
        cipherClass: CryptarithmSolver,
    },
    Encoder: {
        cipherType: ICipherType.Aristocrat,
        cipherClass: CipherEncoder,
    },
    FractionatedMorse: {
        cipherType: ICipherType.FractionatedMorse,
        cipherClass: CipherFractionatedMorseSolver,
    },
    Gromark: {
        cipherType: ICipherType.Gromark,
        cipherClass: CipherGromarkSolver,
    },
    Hill: {
        cipherType: ICipherType.Hill,
        cipherClass: CipherHillEncoder,
    },
    Morbit: {
        cipherType: ICipherType.Morbit,
        cipherClass: CipherMorbitSolver,
    },
    Patristocrat: {
        cipherType: ICipherType.Patristocrat,
        cipherClass: CipherEncoder,
    },
    RagbabySolver: {
        cipherType: ICipherType.Ragbaby,
        cipherClass: CipherRagbabySolver,
    },
    RailfenceSolver: {
        cipherType: ICipherType.Railfence,
        cipherClass: CipherRailfenceSolver,
    },
    Standard: {
        cipherType: ICipherType.Standard,
        cipherClass: CipherSolver
    },
    TestAnswers: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestAnswers,
    },
    TestGenerator: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestGenerator,
    },
    TestManage: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestManage,
    },
    TestPrint: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestPrint,
    },
    TestQuestions: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestQuestions,
    },
    Vigenere: {
        cipherType: ICipherType.Vigenere,
        cipherClass: CipherVigenereEncoder,
    },
    VigenereSolver: {
        cipherType: ICipherType.Vigenere,
        cipherClass: CipherVigenereSolver,
    },
    Xenocrypt: {
        cipherType: ICipherType.Xenocrypt,
        cipherClass: CipherXenocryptSolver,
    },
}

export function CipherFactory(ciphertypestr: string, reqlang: string): CipherHandler {
    let lang = "en"
    console.log('Selecting:' + ciphertypestr + " lang=" + lang)
    if (typeof reqlang !== 'undefined') {
        lang = reqlang.toLowerCase()
    }

    let entry: ICipherFactoryEntry = {
        cipherType: ICipherType.None,
        cipherClass: CipherSolver
    }
    if (typeof (cipherFactoryMap[ciphertypestr]) !== 'undefined') {
        entry = cipherFactoryMap[ciphertypestr]
    }
    let cipherTool: CipherHandler = new entry.cipherClass()
    cipherTool.setDefaultCipherType(entry.cipherType)
    cipherTool.init(lang)
    return cipherTool
}
