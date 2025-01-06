import { ICipherType } from '../common/ciphertypes';
import { CipherHandler } from '../common/cipherhandler';

import { CipherApp } from './cipherapp';

import { CipherAffineApp } from './cipheraffineapp'
import { CipherAristocratApp } from './cipheraristocratapp'
import { CipherAtbashApp } from './cipheratbashapp'
import { CipherBaconianApp } from './cipherbaconianapp'
import { CipherDancingMenApp } from './cipherdancingmenapp'
import { CipherCaesarApp } from './ciphercaesarapp'
import { CipherCheckerboardApp } from './ciphercheckerboardapp'
import { CipherCompleteColumnarApp } from './ciphercompletecolumnarapp'
import { CipherCryptarithmApp } from './ciphercryptarithmapp'
import { CipherFractionatedMorseApp } from './cipherfractionatedmorseapp'
import { CipherHillApp } from './cipherhillapp'
import { CipherKnightsTemplarApp } from './cipherknightstemplarapp'
import { CipherNihilistSubstitutionApp } from './ciphernihilistsubstitutionapp'
import { CipherPatristocratApp } from './cipherpatristocratapp'
import { CipherPigPenApp } from './cipherpigpenapp'
import { CipherPortaApp } from './cipherportaapp'
import { CipherTapCodeApp } from './ciphertapcodeapp'
import { CipherVigenereApp } from './ciphervigenereapp'
import { CipherXenocryptApp } from './cipherxenocryptapp'

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
        cipherClass: CipherAffineApp,
        canPrint: false
    },
    Aristocrat: {
        cipherType: ICipherType.Aristocrat,
        cipherClass: CipherAristocratApp,
        canPrint: false
    },
    Atbash: {
        cipherType: ICipherType.Atbash,
        cipherClass: CipherAtbashApp,
        canPrint: false
    },
    Baconian: {
        cipherType: ICipherType.Baconian,
        cipherClass: CipherBaconianApp,
        canPrint: false
    },
    DancingMen: {
        cipherType: ICipherType.DancingMen,
        cipherClass: CipherDancingMenApp,
        canPrint: false
    },
    Caesar: {
        cipherType: ICipherType.Caesar,
        cipherClass: CipherCaesarApp,
        canPrint: false
    },
    Checkerboard: {
        cipherType: ICipherType.Checkerboard,
        cipherClass: CipherCheckerboardApp,
        canPrint: false
    },
    CompleteColumnar: {
        cipherType: ICipherType.CompleteColumnar,
        cipherClass: CipherCompleteColumnarApp,
        canPrint: false
    },
    Cryptarithm: {
        cipherType: ICipherType.Cryptarithm,
        cipherClass: CipherCryptarithmApp,
        canPrint: false
    },
    FractionatedMorse: {
        cipherType: ICipherType.FractionatedMorse,
        cipherClass: CipherFractionatedMorseApp,
        canPrint: false
    },
    Hill: {
        cipherType: ICipherType.Hill,
        cipherClass: CipherHillApp,
        canPrint: false
    },
    KnightsTemplar: {
        cipherType: ICipherType.KnightsTemplar,
        cipherClass: CipherKnightsTemplarApp,
        canPrint: false
    },
    NihilistSubstitution: {
        cipherType: ICipherType.NihilistSubstitution,
        cipherClass: CipherNihilistSubstitutionApp,
        canPrint: false
    },
    Patristocrat: {
        cipherType: ICipherType.Patristocrat,
        cipherClass: CipherPatristocratApp,
        canPrint: false
    },
    PigPen: {
        cipherType: ICipherType.PigPen,
        cipherClass: CipherPigPenApp,
        canPrint: false
    },
    Porta: {
        cipherType: ICipherType.Porta,
        cipherClass: CipherPortaApp,
        canPrint: false
    },
    TapCode: {
        cipherType: ICipherType.TapCode,
        cipherClass: CipherTapCodeApp,
        canPrint: false
    },
    Vigenere: {
        cipherType: ICipherType.Vigenere,
        cipherClass: CipherVigenereApp,
        canPrint: false
    },
    Xenocrypt: {
        cipherType: ICipherType.Xenocrypt,
        cipherClass: CipherXenocryptApp,
        canPrint: false
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
        cipherClass: CipherApp,
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
    cipherTool = new CipherApp();
    cipherTool.setDefaultCipherType(ciphertype);
    cipherTool.init(lang);
    return cipherTool;
}
