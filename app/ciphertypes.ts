import { JTRadioButton, JTRadioButtonItem } from "./jtradiobutton"

/** Which type of cipher we are solving */
export const enum ICipherType {
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
}

// interface JTRBL {
//     [index: ICipherType]: JTRadioButtonItem
// }
// export const foo: JTRBL = {
//     Railfence: { value: ICipherType.Railfence, title: "Railfence", id: "railfence" },
//     Redefence: { value: ICipherType.Redefence, title: "Redefence", id: "redefence" },
//     Vigenere: { value: ICipherType.Vigenere, title: "Vigen&egrave;re", id: "vigenere" },
//     Variant: { value: ICipherType.Variant, title: "Variant", id: "variant" },
//     Beaufort: { value: ICipherType.Beaufort, title: "Beaufort", id: "beaufort" },
//     Gronsfeld: { value: ICipherType.Gronsfeld, title: "Gronsfeld", id: "gronsfeld" },
//     Porta: { value: ICipherType.Porta, title: "Porta", id: "porta" },
//     FractionatedMorse: { value: ICipherType.FractionatedMorse, title: "Fractionated Morse", id: "fractionatedmorse" },
//     Morbit: { value: ICipherType.Morbit, title: "Morbit", id: "morbit" },
// }

export class CipherTypeInfo {
    static RadioButtonItem(cipherType: ICipherType): JTRadioButtonItem {
        let res: JTRadioButtonItem

        switch (cipherType) {
            case ICipherType.Railfence:
                res = { value: cipherType, title: "Railfence", id: "railfence" }
                break

            case ICipherType.Redefence:
                res = { value: cipherType, title: "Redefence", id: "redefence" }
                break

            case ICipherType.Vigenere:
                res = { value: cipherType, title: "Vigen&egrave;re", id: "vigenere" }
                break

            case ICipherType.Variant:
                res = { value: cipherType, title: "Variant", id: "variant" }
                break

            case ICipherType.Beaufort:
                res = { value: cipherType, title: "Beaufort", id: "beaufort" }
                break

            case ICipherType.Gronsfeld:
                res = { value: cipherType, title: "Gronsfeld", id: "gronsfeld" }
                break

            case ICipherType.Porta:
                res = { value: cipherType, title: "Porta", id: "porta" }
                break

            case ICipherType.FractionatedMorse:
                res = { value: cipherType, title: "Fractionated Morse", id: "fractionatedmorse" }
                break

            case ICipherType.Ragbaby:
                res = { value: cipherType, title: "Ragbaby", id: "ragbaby" }
                break

            default:
            case ICipherType.Morbit:
                res = { value: cipherType, title: "Morbit", id: "morbit" }
                break

        }
        return res
    }
}
