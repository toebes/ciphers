import { JTRadioButtonItem } from "./jtradiobutton"

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
}

let cipherTypeConfig = new Map(<[ICipherType, any][]> [
    [ICipherType.None, {
        title: "None",
        id: "none",
        equiv: []
    }],
    [ICipherType.Aristocrat, {
        title: "Aristocrat",
        id: "aristocrat",
        equiv: [
            ICipherType.Aristocrat,
            ICipherType.Patristocrat,
            ICipherType.Xenocrypt,
        ]
    }],
    [ICipherType.
        Patristocrat, {
        title: "Patristocrat",
        id: "patristocrat",
        equiv: [
            ICipherType.Aristocrat,
            ICipherType.Patristocrat,
            ICipherType.Xenocrypt,
        ]
    }],
    [ICipherType.
        Cryptarithm, {
        title: "Cryptarithm",
        id: "cryptarithm",
        equiv: [
            ICipherType.Cryptarithm,
        ]
    }],
    [ICipherType.
        Railfence, {
        title: "Railfence",
        id: "railfence",
        equiv: [
            ICipherType.Railfence,
            ICipherType.Redefence,
        ]
    }],
    [ICipherType.
        Redefence, {
        title: "Redefence",
        id: "redefence",
        equiv: [
            ICipherType.Railfence,
            ICipherType.Redefence,
        ]
    }],
    [ICipherType.
        Vigenere, {
        title: "Vigen&egrave;re",
        id: "vigenere",
        equiv: [
            ICipherType.Vigenere,
            ICipherType.Variant,
            ICipherType.Beaufort,
            ICipherType.Gronsfeld,
            ICipherType.Porta,
        ]
    }],
    [ICipherType.
        Variant, {
        title: "Variant",
        id: "variant",
        equiv: [
            ICipherType.Vigenere,
            ICipherType.Variant,
            ICipherType.Beaufort,
            ICipherType.Gronsfeld,
            ICipherType.Porta,
        ]
    }],
    [ICipherType.
        Beaufort, {
        title: "Beaufort",
        id: "beaufort",
        equiv: [
            ICipherType.Vigenere,
            ICipherType.Variant,
            ICipherType.Beaufort,
            ICipherType.Gronsfeld,
            ICipherType.Porta,
        ]
    }],
    [ICipherType.
        Gronsfeld, {
        title: "Gronsfeld",
        id: "gronsfeld",
        equiv: [
            ICipherType.Vigenere,
            ICipherType.Variant,
            ICipherType.Beaufort,
            ICipherType.Gronsfeld,
            ICipherType.Porta,
        ]
    }],
    [ICipherType.
        Porta, {
        title: "Porta",
        id: "porta",
        equiv: [
            ICipherType.Vigenere,
            ICipherType.Variant,
            ICipherType.Beaufort,
            ICipherType.Gronsfeld,
            ICipherType.Porta,
        ]
    }],
    [ICipherType.
        FractionatedMorse, {
        title: "Fractionated Morse",
        id: "fractionatedmorse",
        equiv: [
            ICipherType.FractionatedMorse,
        ]
    }],
    [ICipherType.
        Morbit, {
        title: "Morbit",
        id: "morbit",
        equiv: [
            ICipherType.Morbit,
        ]
    }],
    [ICipherType.Ragbaby, {
        title: "Ragbaby",
        id: "ragbaby",
        equiv: [
            ICipherType.Ragbaby,
        ]
    }],
    [ICipherType.Affine, {
        title: "Affine",
        id: "affine",
        equiv: [
            ICipherType.Affine,
        ]
    }],
    [ICipherType.Counter, {
        title: "Counter",
        id: "counter",
        equiv: [
            ICipherType.Counter,
        ]
    }],
    [ICipherType.Caesar, {
        title: "Caesar",
        id: "caesar",
        equiv: [
            ICipherType.Atbash,
            ICipherType.Caesar,
        ]
    }],
    [ICipherType.Atbash, {
        title: "Atbash",
        id: "atbash",
        equiv: [
            ICipherType.Atbash,
            ICipherType.Caesar,
        ]
    }],
    [ICipherType.Checkerboard, {
        title: "Checkerboard",
        id: "checkerboard",
        equiv: [
            ICipherType.Checkerboard,
        ]
    }],
    [ICipherType.Gromark, {
        title: "Gromark",
        id: "gromark",
        equiv: [
            ICipherType.Gromark,
        ]
    }],
    [ICipherType.Xenocrypt, {
        title: "Xenocrypt",
        id: "xenocrypt",
        equiv: [
            ICipherType.Aristocrat,
            ICipherType.Patristocrat,
            ICipherType.Xenocrypt,
        ]
    }],
    [ICipherType.Standard, {
        title: "Standard",
        id: "standard",
        equiv: [
            ICipherType.Aristocrat,
            ICipherType.Patristocrat,
            ICipherType.Xenocrypt,
        ]
    }],
    [ICipherType.Hill, {
        title: "Hill",
        id: "hill",
        equiv: [
            ICipherType.Hill,
        ]
    }],
])

export function CypherTypeButtonItem(cipherType: ICipherType): JTRadioButtonItem {
    let config = cipherTypeConfig.get(cipherType)
    let res: JTRadioButtonItem = {
        value: cipherType,
        title: config.title,
        id: config.id
    }
    return res
}
