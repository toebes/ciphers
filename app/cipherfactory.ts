import { CipherACAProblems } from "./cipheracaproblems";
import { CipherAffineEncoder } from "./cipheraffineencoder";
import { CipherBaconianEncoder } from "./cipherbaconianencoder";
import { CipherCheckerboardSolver } from "./ciphercheckerboardsolver";
import { CipherCounter } from "./ciphercounter";
import { CryptarithmSolver } from "./ciphercryptarithmsolver";
import { CipherEncoder } from "./cipherencoder";
import { CipherFractionatedMorseSolver } from "./cipherfractionatedmorsesolver";
import { CipherGromarkSolver } from "./ciphergromarksolver";
import { CipherHandler } from "./cipherhandler";
import { CipherHillEncoder } from "./cipherhillencoder";
import { CipherMorbitSolver } from "./ciphermorbitsolver";
import { CipherRagbabySolver } from "./cipherragbabysolver";
import { CipherRailfenceSolver } from "./cipherrailfencesolver";
import { CipherRSAEncoder } from "./cipherrsaencoder";
import { CipherRunningKeyEdit } from "./cipherrunningkeyedit";
import { CipherRunningKeyEncoder } from "./cipherrunningkeyencoder";
import { CipherSolver } from "./ciphersolver";
import { CipherTableEncoder } from "./ciphertableencoder";
import { CipherTestAnswers } from "./ciphertestanswers";
import { CipherTestGenerator } from "./ciphertestgenerator";
import { CipherTestManage } from "./ciphertestmanage";
import { CipherTestPrint } from "./ciphertestprint";
import { CipherTestQuestions } from "./ciphertestquestions";
import { ICipherType } from "./ciphertypes";
import { CipherVigenereEncoder } from "./ciphervigenereencoder";
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
    Affine: {
        cipherType: ICipherType.Affine,
        cipherClass: CipherAffineEncoder,
        canPrint: true,
    },
    Atbash: {
        cipherType: ICipherType.Atbash,
        cipherClass: CipherTableEncoder,
        canPrint: true,
    },
    Baconian: {
        cipherType: ICipherType.Baconian,
        cipherClass: CipherBaconianEncoder,
        canPrint: true,
    },
    Caesar: {
        cipherType: ICipherType.Caesar,
        cipherClass: CipherTableEncoder,
        canPrint: true,
    },
    Checkerboard: {
        cipherType: ICipherType.Checkerboard,
        cipherClass: CipherCheckerboardSolver,
        canPrint: false,
    },
    Counter: {
        cipherType: ICipherType.Counter,
        cipherClass: CipherCounter,
        canPrint: false,
    },
    Cryptarithm: {
        cipherType: ICipherType.Cryptarithm,
        cipherClass: CryptarithmSolver,
        canPrint: false,
    },
    Encoder: {
        cipherType: ICipherType.Aristocrat,
        cipherClass: CipherEncoder,
        canPrint: true,
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
    Hill: {
        cipherType: ICipherType.Hill,
        cipherClass: CipherHillEncoder,
        canPrint: true,
    },
    Morbit: {
        cipherType: ICipherType.Morbit,
        cipherClass: CipherMorbitSolver,
        canPrint: false,
    },
    Patristocrat: {
        cipherType: ICipherType.Patristocrat,
        cipherClass: CipherEncoder,
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
    RunningKeyEdit: {
        cipherType: ICipherType.None,
        cipherClass: CipherRunningKeyEdit,
        canPrint: false,
    },
    RunningKey: {
        cipherType: ICipherType.RunningKey,
        cipherClass: CipherRunningKeyEncoder,
        canPrint: true,
    },
    RSA: {
        cipherType: ICipherType.RSA,
        cipherClass: CipherRSAEncoder,
        canPrint: true,
    },
    Standard: {
        cipherType: ICipherType.Standard,
        cipherClass: CipherSolver,
        canPrint: false,
    },
    TestAnswers: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestAnswers,
        canPrint: false,
    },
    TestGenerator: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestGenerator,
        canPrint: false,
    },
    TestManage: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestManage,
        canPrint: false,
    },
    TestPrint: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestPrint,
        canPrint: false,
    },
    TestQuestions: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestQuestions,
        canPrint: false,
    },
    Vigenere: {
        cipherType: ICipherType.Vigenere,
        cipherClass: CipherVigenereEncoder,
        canPrint: true,
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
    console.log("Selecting:" + ciphertypestr + " lang=" + lang);
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
    cipherTool = new CipherEncoder();
    cipherTool.setDefaultCipherType(ciphertype);
    cipherTool.init(lang);
    return cipherTool;
}
