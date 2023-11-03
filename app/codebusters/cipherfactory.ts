import { ICipherType } from '../common/ciphertypes';
import { CipherAffineEncoder } from './cipheraffineencoder';
import { CipherBaconianEncoder } from './cipherbaconianencoder';
import { CipherCompleteColumnarEncoder } from './ciphercompletecolumnarencoder';
import { CipherCryptarithmEncoder } from './ciphercryptarithmencoder';
import { CipherDancingMenEncoder } from './cipherdancingmenencoder';
import { CipherEncoder } from './cipherencoder';
import { CipherFractionatedMorseEncoder } from './cipherfractionatedmorseencoder';
import { CipherGenerateHomophone } from './cipherhomophones';
import { CipherHandler } from '../common/cipherhandler';
import { CipherHillEncoder } from './cipherhillencoder';
import { CipherMorbitEncoder } from './ciphermorbitencoder';
import { CipherNihilistSubstitutionEncoder } from './ciphernihilistsubstitutionencoder';
import { CipherPigPenEncoder } from './cipherpigpenencoder';
import { CipherPolluxEncoder } from './cipherpolluxencoder';
import { CipherQuoteAnalyze } from './cipherquoteanalyze';
import { CipherRailFenceEncoder } from './cipherrailfenceencoder';
import { CipherRSAEncoder } from './cipherrsaencoder';
import { CipherRunningKeyEdit } from './cipherrunningkeyedit';
import { CipherRunningKeyEncoder } from './cipherrunningkeyencoder';
import { CipherTableEncoder } from './ciphertableencoder';
import { CipherTapCodeEncoder } from './ciphertapcodeencoder';
import { CipherTestAnswers } from './ciphertestanswers';
import { CipherTestGenerator } from './ciphertestgenerator';
import { CipherTestManage } from './ciphertestmanage';
import { CipherTestPrint } from './ciphertestprint';
import { CipherTestQuestions } from './ciphertestquestions';
import { CipherTestScoreAdjust } from './ciphertestscoreadjust';
import { CipherVigenereEncoder } from './ciphervigenereencoder';
import { CipherTestBuild } from './ciphertestbuild';
import { CipherQuoteManager } from './cipherquotemanager';

interface ICipherFactoryEntry {
    cipherType: ICipherType;
    cipherClass: typeof CipherHandler;
    canPrint: boolean;
}

/**
 * This maps the arbitrary strings from the HTML files into the appropriate
 * CipherHandler class.
 */
const cipherFactoryMap: { [index: string]: ICipherFactoryEntry } = {
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
    CompleteColumnar: {
        cipherType: ICipherType.CompleteColumnar,
        cipherClass: CipherCompleteColumnarEncoder,
        canPrint: true,
    },
    Cryptarithm: {
        cipherType: ICipherType.Cryptarithm,
        cipherClass: CipherCryptarithmEncoder,
        canPrint: true,
    },
    DancingMen: {
        cipherType: ICipherType.DancingMen,
        cipherClass: CipherDancingMenEncoder,
        canPrint: true,
    },
    Encoder: {
        cipherType: ICipherType.Aristocrat,
        cipherClass: CipherEncoder,
        canPrint: true,
    },
    FractionatedMorse: {
        cipherType: ICipherType.FractionatedMorse,
        cipherClass: CipherFractionatedMorseEncoder,
        canPrint: true,
    },
    GenerateHomophone: {
        cipherType: ICipherType.None,
        cipherClass: CipherGenerateHomophone,
        canPrint: false,
    },
    Hill: {
        cipherType: ICipherType.Hill,
        cipherClass: CipherHillEncoder,
        canPrint: true,
    },
    Morbit: {
        cipherType: ICipherType.Morbit,
        cipherClass: CipherMorbitEncoder,
        canPrint: true,
    },
    NihilistSubstitution: {
        cipherType: ICipherType.NihilistSubstitution,
        cipherClass: CipherNihilistSubstitutionEncoder,
        canPrint: true,
    },
    Patristocrat: {
        cipherType: ICipherType.Patristocrat,
        cipherClass: CipherEncoder,
        canPrint: true,
    },
    PigPen: {
        cipherType: ICipherType.PigPen,
        cipherClass: CipherPigPenEncoder,
        canPrint: true,
    },
    Pollux: {
        cipherType: ICipherType.Pollux,
        cipherClass: CipherPolluxEncoder,
        canPrint: true,
    },
    Porta: {
        cipherType: ICipherType.Porta,
        cipherClass: CipherVigenereEncoder,
        canPrint: true,
    },
    QuoteAnalyze: {
        cipherType: ICipherType.None,
        cipherClass: CipherQuoteAnalyze,
        canPrint: false,
    },
    QuoteManager: {
        cipherType: ICipherType.None,
        cipherClass: CipherQuoteManager,
        canPrint: false,
    },
    RailFence: {
        cipherType: ICipherType.Railfence,
        cipherClass: CipherRailFenceEncoder,
        canPrint: true,
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
    TapCode: {
        cipherType: ICipherType.TapCode,
        cipherClass: CipherTapCodeEncoder,
        canPrint: true,
    },
    TestAnswers: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestAnswers,
        canPrint: false,
    },
    TestBuild: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestBuild,
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
    TestScoreAdjust: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestScoreAdjust,
        canPrint: false,
    },
    Vigenere: {
        cipherType: ICipherType.Vigenere,
        cipherClass: CipherVigenereEncoder,
        canPrint: true,
    },
};

// CipherFactory returns a handler for a particular cipher type string and language
export function CipherFactory(ciphertypestr: string, reqlang: string): CipherHandler {
    let lang = 'en';
    // console.log('Selecting:' + ciphertypestr + ' lang=' + lang);
    if (typeof reqlang !== 'undefined') {
        lang = reqlang.toLowerCase();
    }
    let entry: ICipherFactoryEntry = {
        cipherType: ICipherType.None,
        cipherClass: CipherEncoder,
        canPrint: false,
    };
    if (typeof cipherFactoryMap[ciphertypestr] !== 'undefined') {
        entry = cipherFactoryMap[ciphertypestr];
    }
    const cipherTool: CipherHandler = new entry.cipherClass();
    cipherTool.setDefaultCipherType(entry.cipherType);
    cipherTool.init(lang);
    return cipherTool;
}

// CipherPrintFactory returns a handler for a particular cipher type string and language
export function CipherPrintFactory(ciphertype: ICipherType, reqlang: string): CipherHandler {
    let lang = 'en';
    let cipherTool: CipherHandler;
    // Map any DancingMen to use RunningMen
    // We can't put it in the table, otherwise we would
    // allow them to see DancingMen for inserting into a test
    if (ciphertype === ICipherType.RunningMen) {
        ciphertype = ICipherType.DancingMen
    }
    if (typeof reqlang !== 'undefined') {
        lang = reqlang.toLowerCase();
    }
    for (const entry of Object.keys(cipherFactoryMap)) {
        if (cipherFactoryMap[entry].canPrint && cipherFactoryMap[entry].cipherType === ciphertype) {
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
