import { CipherHandler } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { CipherACAManage } from "./cipheracamanage";
import { CipherACAProblems } from "./cipheracaproblems";
import { CipherACASubmit } from "./cipheracasubmit";
import { CipherCheckerboardSolver } from "./ciphercheckerboardsolver";
import { CipherColumnarSolver } from "./ciphercolmnarsolver";
import { CryptarithmSolver } from "./ciphercryptarithmsolver";
import { CipherFractionatedMorseSolver } from "./cipherfractionatedmorsesolver";
import { CipherGromarkSolver } from "./ciphergromarksolver";
import { CipherHomophonicSolver } from "./cipherhomophonicsolver";
import { CipherKeyPhraseSolver } from "./cipherkeyphrasesolver";
import { CipherMorbitSolver } from "./ciphermorbitsolver";
import { CipherNumberedKeySolver } from "./ciphernumberedkeysolver";
import { CipherPortaxSolver } from "./cipherportaxsolver";
import { CipherRagbabySolver } from "./cipherragbabysolver";
import { CipherRailfenceSolver } from "./cipherrailfencesolver";
import { CipherSolver } from "./ciphersolver";
import { CipherVigenereSolver } from "./ciphervigeneresolver";

interface ICipherFactoryEntry {
    cipherType: ICipherType;
    cipherClass: typeof CipherHandler;
    canPrint: boolean;
}

/**
 * This maps the arbitrary strings from the HTML files into the appropriate
 * CipherHandler class.
 */
let cipherFactoryMap: { [index: string]: ICipherFactoryEntry } = {
    ACAProblems: {
        cipherType: ICipherType.Test,
        cipherClass: CipherACAProblems,
        canPrint: false,
    },
    ACASubmit: {
        cipherType: ICipherType.Test,
        cipherClass: CipherACASubmit,
        canPrint: false,
    },
    ACAManage: {
        cipherType: ICipherType.Test,
        cipherClass: CipherACAManage,
        canPrint: false,
    },
    Checkerboard: {
        cipherType: ICipherType.Checkerboard,
        cipherClass: CipherCheckerboardSolver,
        canPrint: false,
    },
    CompleteColumnarSolver: {
        cipherType: ICipherType.CompleteColumnar,
        cipherClass: CipherColumnarSolver,
        canPrint: false,
    },
    IncompleteColumnarSolver: {
        cipherType: ICipherType.IncompleteColumnar,
        cipherClass: CipherColumnarSolver,
        canPrint: false,
    },
    Cryptarithm: {
        cipherType: ICipherType.Cryptarithm,
        cipherClass: CryptarithmSolver,
        canPrint: false,
    },
    FractionatedMorse: {
        cipherType: ICipherType.FractionatedMorse,
        cipherClass: CipherFractionatedMorseSolver,
        canPrint: false,
    },
    Gromark: {
        cipherType: ICipherType.Gromark,
        cipherClass: CipherGromarkSolver,
        canPrint: false,
    },
    HomophonicSolver: {
        cipherType: ICipherType.Homophonic,
        cipherClass: CipherHomophonicSolver,
        canPrint: false,
    },
    KeyPhraseSolver: {
        cipherType: ICipherType.KeyPhrase,
        cipherClass: CipherKeyPhraseSolver,
        canPrint: false,
    },
    Morbit: {
        cipherType: ICipherType.Morbit,
        cipherClass: CipherMorbitSolver,
        canPrint: false,
    },
    NumberedKeySolver: {
        cipherType: ICipherType.NumberedKey,
        cipherClass: CipherNumberedKeySolver,
        canPrint: false,
    },
    PortaxSolver: {
        cipherType: ICipherType.Portax,
        cipherClass: CipherPortaxSolver,
        canPrint: true,
    },
    RagbabySolver: {
        cipherType: ICipherType.Ragbaby,
        cipherClass: CipherRagbabySolver,
        canPrint: false,
    },
    RailfenceSolver: {
        cipherType: ICipherType.Railfence,
        cipherClass: CipherRailfenceSolver,
        canPrint: false,
    },
    Standard: {
        cipherType: ICipherType.Standard,
        cipherClass: CipherSolver,
        canPrint: false,
    },
    VigenereSolver: {
        cipherType: ICipherType.Vigenere,
        cipherClass: CipherVigenereSolver,
        canPrint: false,
    },
    Xenocrypt: {
        cipherType: ICipherType.Xenocrypt,
        cipherClass: CipherSolver,
        canPrint: true,
    },
};

export function CipherFactory(
    ciphertypestr: string,
    reqlang: string
): CipherHandler {
    let lang = "en";
    // console.log("Selecting:" + ciphertypestr + " lang=" + lang);
    if (typeof reqlang !== "undefined") {
        lang = reqlang.toLowerCase();
    }
    let entry: ICipherFactoryEntry = {
        cipherType: ICipherType.None,
        cipherClass: CipherSolver,
        canPrint: false,
    };
    if (typeof cipherFactoryMap[ciphertypestr] !== "undefined") {
        entry = cipherFactoryMap[ciphertypestr];
    }
    let cipherTool: CipherHandler = new entry.cipherClass();
    cipherTool.setDefaultCipherType(entry.cipherType);
    cipherTool.init(lang);
    return cipherTool;
}

export function CipherPrintFactory(
    ciphertype: ICipherType,
    reqlang: string
): CipherHandler {
    let lang = "en";
    let cipherTool: CipherHandler;
    if (typeof reqlang !== "undefined") {
        lang = reqlang.toLowerCase();
    }
    for (let entry of Object.keys(cipherFactoryMap)) {
        if (
            cipherFactoryMap[entry].canPrint &&
            cipherFactoryMap[entry].cipherType === ciphertype
        ) {
            cipherTool = new cipherFactoryMap[entry].cipherClass();
            cipherTool.setDefaultCipherType(ciphertype);
            cipherTool.init(lang);
            return cipherTool;
        }
    }
    cipherTool = new CipherHandler();
    cipherTool.setDefaultCipherType(ciphertype);
    cipherTool.init(lang);
    return cipherTool;
}
