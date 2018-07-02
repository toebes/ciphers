import { JTRadioButton, JTRadioButtonItem } from "./jtradiobutton"

/** Which type of cipher we are solving */
export const enum ICipherType {
    Railfence,
    Redefence,
    Vigenere,
    Variant,
    Beaufort,
    Gronsfeld,
    Porta,
    FractionatedMorse,
    Morbit,
}
// export const xxx = {
//      ICipherType.Railfence:
//      { value: ICipherType.Railfence, title: "Railfence", id: "railfence" },
//  ICipherType.Redefence:
//      { value: ICipherType.Redefence, title: "Redefence", id: "redefence" },

//  ICipherType.Vigenere:
//     { value: ICipherType.Vigenere, title: "Vigen&egrave;re", id: "vigenere" }

//  ICipherType.Variant:
//      { value: ICipherType.Variant, title: "Variant", id: "variant" }
//  ICipherType.Beaufort:
//      { value: ICipherType.Beaufort, title: "Beaufort", id: "beaufort" }
//  ICipherType.Gronsfeld:
//      { value: ICipherType.Gronsfeld, title: "Gronsfeld", id: "gronsfeld" }
//  ICipherType.Porta:
//      { value: ICipherType.Porta, title: "Porta", id: "porta" }
//  ICipherType.FractionatedMorse:
//      { value: ICipherType.FractionatedMorse, title: "Fractionated Morse", id: "fractionatedmorse" }
//  ICipherType.Morbit:
//      { value: ICipherType.Morbit, title: "Morbit", id: "morbit" }
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

            default:
            case ICipherType.Morbit:
                res = { value: cipherType, title: "Morbit", id: "morbit" }
                break

        }
        return res
    }
}
