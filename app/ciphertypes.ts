import { JTRadioButtonItem } from "./jtradiobutton";

/** Which type of cipher we are solving */
export const enum ICipherType {
    None = "none",
    Aristocrat = "aristocrat",
    Patristocrat = "patristocrat",
    Cryptarithm = "cryptarithm",
    Railfence = "railfence",
    Redefence = "redefence",
    Vigenere = "vigenere",
    Variant = "variant",
    Beaufort = "beaufort",
    Gronsfeld = "gronsfeld",
    Porta = "porta",
    FractionatedMorse = "fractionatedmorse",
    Morbit = "morbit",
    Ragbaby = "ragbaby",
    Affine = "affine",
    Counter = "counter",
    Caesar = "caesar",
    Atbash = "atbash",
    Checkerboard = "checkerboard",
    Gromark = "gromark",
    Xenocrypt = "xenocrypt",
    Standard = "standard",
    Hill = "hill",
    Test = "test",
    RunningKey = "runningkey",
    Baconian = "baconian",
    Homophonic = "homophonic",
    RSA = "rsa",
    CompleteColumnar = "compcolumnar",
    IncompleteColumnar = "inccolumnar",
}

let cipherTypeConfig = new Map(<[ICipherType, any][]>[
    [
        ICipherType.None,
        {
            title: "None",
            id: "none",
            equiv: [],
        },
    ],
    [
        ICipherType.Aristocrat,
        {
            title: "Aristocrat",
            id: "aristocrat",
            equiv: [
                ICipherType.Aristocrat,
                ICipherType.Patristocrat,
                ICipherType.Xenocrypt,
            ],
        },
    ],
    [
        ICipherType.CompleteColumnar,
        {
            title: "Complete Columnar",
            id: "compcolumnar",
            equiv: [ICipherType.CompleteColumnar],
        },
    ],
    [
        ICipherType.IncompleteColumnar,
        {
            title: "Incomplete Columnar",
            id: "inccolumnar",
            equiv: [ICipherType.IncompleteColumnar],
        },
    ],
    [
        ICipherType.Homophonic,
        {
            title: "Homophonic",
            id: "homophonic",
            equiv: [ICipherType.Homophonic],
        },
    ],
    [
        ICipherType.Patristocrat,
        {
            title: "Patristocrat",
            id: "patristocrat",
            equiv: [
                ICipherType.Aristocrat,
                ICipherType.Patristocrat,
                ICipherType.Xenocrypt,
            ],
        },
    ],
    [
        ICipherType.Cryptarithm,
        {
            title: "Cryptarithm",
            id: "cryptarithm",
            equiv: [ICipherType.Cryptarithm],
        },
    ],
    [
        ICipherType.Railfence,
        {
            title: "Railfence",
            id: "railfence",
            equiv: [ICipherType.Railfence, ICipherType.Redefence],
        },
    ],
    [
        ICipherType.Redefence,
        {
            title: "Redefence",
            id: "redefence",
            equiv: [ICipherType.Railfence, ICipherType.Redefence],
        },
    ],
    [
        ICipherType.Vigenere,
        {
            title: "Vigen&egrave;re",
            id: "vigenere",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta,
            ],
        },
    ],
    [
        ICipherType.Variant,
        {
            title: "Variant",
            id: "variant",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta,
            ],
        },
    ],
    [
        ICipherType.Beaufort,
        {
            title: "Beaufort",
            id: "beaufort",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta,
            ],
        },
    ],
    [
        ICipherType.Gronsfeld,
        {
            title: "Gronsfeld",
            id: "gronsfeld",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta,
            ],
        },
    ],
    [
        ICipherType.Porta,
        {
            title: "Porta",
            id: "porta",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta,
            ],
        },
    ],
    [
        ICipherType.FractionatedMorse,
        {
            title: "Fractionated Morse",
            id: "fractionatedmorse",
            equiv: [ICipherType.FractionatedMorse],
        },
    ],
    [
        ICipherType.Morbit,
        {
            title: "Morbit",
            id: "morbit",
            equiv: [ICipherType.Morbit],
        },
    ],
    [
        ICipherType.Ragbaby,
        {
            title: "Ragbaby",
            id: "ragbaby",
            equiv: [ICipherType.Ragbaby],
        },
    ],
    [
        ICipherType.Affine,
        {
            title: "Affine",
            id: "affine",
            equiv: [ICipherType.Affine],
        },
    ],
    [
        ICipherType.Counter,
        {
            title: "Counter",
            id: "counter",
            equiv: [ICipherType.Counter],
        },
    ],
    [
        ICipherType.Caesar,
        {
            title: "Caesar",
            id: "caesar",
            equiv: [ICipherType.Atbash, ICipherType.Caesar],
        },
    ],
    [
        ICipherType.Atbash,
        {
            title: "Atbash",
            id: "atbash",
            equiv: [ICipherType.Atbash, ICipherType.Caesar],
        },
    ],
    [
        ICipherType.Checkerboard,
        {
            title: "Checkerboard",
            id: "checkerboard",
            equiv: [ICipherType.Checkerboard],
        },
    ],
    [
        ICipherType.Gromark,
        {
            title: "Gromark",
            id: "gromark",
            equiv: [ICipherType.Gromark],
        },
    ],
    [
        ICipherType.Xenocrypt,
        {
            title: "Xenocrypt",
            id: "xenocrypt",
            equiv: [
                ICipherType.Aristocrat,
                ICipherType.Patristocrat,
                ICipherType.Xenocrypt,
            ],
        },
    ],
    [
        ICipherType.Standard,
        {
            title: "Standard",
            id: "standard",
            equiv: [
                ICipherType.Aristocrat,
                ICipherType.Patristocrat,
                ICipherType.Xenocrypt,
            ],
        },
    ],
    [
        ICipherType.Hill,
        {
            title: "Hill",
            id: "hill",
            equiv: [ICipherType.Hill],
        },
    ],
    [
        ICipherType.RunningKey,
        {
            title: "Running Key",
            id: "runningkey",
            equiv: [ICipherType.RunningKey, ICipherType.Vigenere],
        },
    ],
    [
        ICipherType.Baconian,
        {
            title: "Baconian",
            id: "baconian",
            equiv: [ICipherType.Baconian],
        },
    ],
    [
        ICipherType.RSA,
        {
            title: "RSA",
            id: "rsa",
            equiv: [ICipherType.RSA],
        },
    ],
]);
/**
 * Gets the default title for a cipher type
 */
export function getCipherTitle(ciphertype: ICipherType): string {
    let config = cipherTypeConfig.get(ciphertype);
    let title = "NOT_FOUND";
    if (config !== undefined && config.title !== undefined) {
        title = config.title;
    }
    return title;
}
/**
 * Gets all ciphers which are considered equivalent for this cipher type
 * Used by the editors to determine what they can load
 */
export function getCipherEquivalents(cipherType: ICipherType): ICipherType[] {
    let config = cipherTypeConfig.get(cipherType);
    let result = [];
    if (config !== undefined && config.equiv !== undefined) {
        result = config.equiv;
    }
    if (result.indexOf(cipherType) === -1) {
        result.push(cipherType);
    }
    return result;
}
/**
 * Generates a radio button to be used for selecting the type of Cipher
 */
export function CipherTypeButtonItem(
    cipherType: ICipherType
): JTRadioButtonItem {
    let config = cipherTypeConfig.get(cipherType);
    let res: JTRadioButtonItem = {
        value: cipherType,
        title: config.title,
        id: config.id,
    };
    return res;
}
