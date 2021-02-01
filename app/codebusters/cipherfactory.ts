import { CipherHandler } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { CipherAffineEncoder } from './cipheraffineencoder';
import { CipherBaconianEncoder } from './cipherbaconianencoder';
import { CipherEncoder } from './cipherencoder';
import { CipherHillEncoder } from './cipherhillencoder';
import { CipherGenerateHomophone } from './cipherhomophones';
import { CipherMorbitEncoder } from './ciphermorbitencoder';
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
import { CipherTestInteractive } from './ciphertestinteractive';
import { CipherTestQuestions } from './ciphertestquestions';
import { InteractiveAffineEncoder } from './interactiveaffineencoder';
import { InteractiveEncoder } from './interactiveencoder';
import { InteractiveHillEncoder } from './interactivehillencoder';
import { InteractiveRailFenceEncoder } from './interactiverailfenceencoder';
import { InteractiveTableEncoder } from './interactivetableencoder';
import { CipherVigenereEncoder } from './ciphervigenereencoder';
import { CipherTestPublished } from './ciphertestpublished';
import { CipherTestPermissions } from './ciphertestpermissions';
import { CipherTestSchedule } from './ciphertestschedule';
import { CipherTestResults } from './ciphertestresults';
import { CipherTakeTest } from './ciphertaketest';
import { CipherTestTimed } from './ciphertesttimed';
import { InteractiveMorseEncoder } from './interactivemorseencoder';
import { CipherTestPlayback } from './ciphertestplayback';
import { CipherLogin } from './cipherlogin';
import { CipherMaintenance } from './ciphermaintenance'

interface ICipherFactoryEntry {
    cipherType: ICipherType;
    cipherClass: typeof CipherHandler;
    interactiveClass: typeof CipherHandler;
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
        interactiveClass: InteractiveAffineEncoder,
        canPrint: true,
    },
    Atbash: {
        cipherType: ICipherType.Atbash,
        cipherClass: CipherTableEncoder,
        interactiveClass: InteractiveTableEncoder,
        canPrint: true,
    },
    Baconian: {
        cipherType: ICipherType.Baconian,
        cipherClass: CipherBaconianEncoder,
        interactiveClass: InteractiveEncoder,
        canPrint: true,
    },
    Caesar: {
        cipherType: ICipherType.Caesar,
        cipherClass: CipherTableEncoder,
        interactiveClass: InteractiveTableEncoder,
        canPrint: true,
    },
    Encoder: {
        cipherType: ICipherType.Aristocrat,
        cipherClass: CipherEncoder,
        interactiveClass: InteractiveEncoder,
        canPrint: true,
    },
    GenerateHomophone: {
        cipherType: ICipherType.None,
        cipherClass: CipherGenerateHomophone,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    Hill: {
        cipherType: ICipherType.Hill,
        cipherClass: CipherHillEncoder,
        interactiveClass: InteractiveHillEncoder,
        canPrint: true,
    },
    Login: {
        cipherType: ICipherType.Test,
        cipherClass: CipherLogin,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    Maintenance: {
        cipherType: ICipherType.None,
        cipherClass: CipherMaintenance,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    Morbit: {
        cipherType: ICipherType.Morbit,
        cipherClass: CipherMorbitEncoder,
        interactiveClass: InteractiveMorseEncoder,
        canPrint: true,
    },
    Patristocrat: {
        cipherType: ICipherType.Patristocrat,
        cipherClass: CipherEncoder,
        interactiveClass: InteractiveEncoder,
        canPrint: true,
    },
    PigPen: {
        cipherType: ICipherType.PigPen,
        cipherClass: CipherPigPenEncoder,
        interactiveClass: InteractiveTableEncoder,
        canPrint: true,
    },
    Pollux: {
        cipherType: ICipherType.Pollux,
        cipherClass: CipherPolluxEncoder,
        interactiveClass: InteractiveMorseEncoder,
        canPrint: true,
    },
    QuoteAnalyze: {
        cipherType: ICipherType.None,
        cipherClass: CipherQuoteAnalyze,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    RailFence: {
        cipherType: ICipherType.Railfence,
        cipherClass: CipherRailFenceEncoder,
        interactiveClass: InteractiveRailFenceEncoder,
        canPrint: true,
    },
    RunningKeyEdit: {
        cipherType: ICipherType.None,
        cipherClass: CipherRunningKeyEdit,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    RunningKey: {
        cipherType: ICipherType.RunningKey,
        cipherClass: CipherRunningKeyEncoder,
        interactiveClass: CipherHandler,
        canPrint: true,
    },
    RSA: {
        cipherType: ICipherType.RSA,
        cipherClass: CipherRSAEncoder,
        interactiveClass: CipherHandler,
        canPrint: true,
    },
    TakeTest: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTakeTest,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TapCode: {
        cipherType: ICipherType.TapCode,
        cipherClass: CipherTapCodeEncoder,
        interactiveClass: InteractiveEncoder,
        canPrint: true,
    },
    TestAnswers: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestAnswers,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestGenerator: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestGenerator,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestInteractive: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestInteractive,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestManage: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestManage,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestPermissions: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestPermissions,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestPlayback: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestPlayback,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestPrint: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestPrint,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestPublished: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestPublished,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestQuestions: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestQuestions,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestResults: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestResults,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestSchedule: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestSchedule,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    TestTimed: {
        cipherType: ICipherType.Test,
        cipherClass: CipherTestTimed,
        interactiveClass: CipherHandler,
        canPrint: false,
    },
    Vigenere: {
        cipherType: ICipherType.Vigenere,
        cipherClass: CipherVigenereEncoder,
        interactiveClass: InteractiveEncoder,
        canPrint: true,
    },
};

// CipherFactory returns a handler for a particular cipher type string and language
export function CipherFactory(ciphertypestr: string, reqlang: string): CipherHandler {
    let lang = 'en';
    console.log('Selecting:' + ciphertypestr + ' lang=' + lang);
    if (typeof reqlang !== 'undefined') {
        lang = reqlang.toLowerCase();
    }
    let entry: ICipherFactoryEntry = {
        cipherType: ICipherType.None,
        interactiveClass: CipherHandler,
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

// CipherInteractiveFactory returns a handler for a particular cipher type string and language
export function CipherInteractiveFactory(ciphertypestr: string, reqlang: string): CipherHandler {
    let lang = 'en';
    const ciphertype = ciphertypestr as ICipherType;
    console.log('Selecting:' + ciphertypestr + ' lang=' + lang);
    let cipherTool: CipherHandler;
    if (typeof reqlang !== 'undefined') {
        lang = reqlang.toLowerCase();
    }
    for (const entry of Object.keys(cipherFactoryMap)) {
        if (cipherFactoryMap[entry].canPrint && cipherFactoryMap[entry].cipherType === ciphertype) {
            cipherTool = new cipherFactoryMap[entry].interactiveClass();
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

// CipherPrintFactory returns a handler for a particular cipher type string and language
export function CipherPrintFactory(ciphertype: ICipherType, reqlang: string): CipherHandler {
    let lang = 'en';
    let cipherTool: CipherHandler;
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
