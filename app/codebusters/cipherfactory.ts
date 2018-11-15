import { CipherHandler } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { CipherAffineEncoder } from "./cipheraffineencoder";
import { CipherBaconianEncoder } from "./cipherbaconianencoder";
import { CipherEncoder } from "./cipherencoder";
import { CipherHillEncoder } from "./cipherhillencoder";
import { CipherQuoteAnalyze } from "./cipherquoteanalyze";
import { CipherRSAEncoder } from "./cipherrsaencoder";
import { CipherRunningKeyEdit } from "./cipherrunningkeyedit";
import { CipherRunningKeyEncoder } from "./cipherrunningkeyencoder";
import { CipherTableEncoder } from "./ciphertableencoder";
import { CipherTestAnswers } from "./ciphertestanswers";
import { CipherTestGenerator } from "./ciphertestgenerator";
import { CipherTestManage } from "./ciphertestmanage";
import { CipherTestPrint } from "./ciphertestprint";
import { CipherTestQuestions } from "./ciphertestquestions";
import { CipherVigenereEncoder } from "./ciphervigenereencoder";

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
    Encoder: {
        cipherType: ICipherType.Aristocrat,
        cipherClass: CipherEncoder,
        canPrint: true,
    },
    Hill: {
        cipherType: ICipherType.Hill,
        cipherClass: CipherHillEncoder,
        canPrint: true,
    },
    Patristocrat: {
        cipherType: ICipherType.Patristocrat,
        cipherClass: CipherEncoder,
        canPrint: true,
    },
    QuoteAnalyze: {
        cipherType: ICipherType.None,
        cipherClass: CipherQuoteAnalyze,
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
        cipherClass: CipherEncoder,
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
