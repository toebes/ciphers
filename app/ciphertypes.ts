import { JTRadioButtonItem } from "./jtradiobutton"

/** Which type of cipher we are solving */
export const enum ICipherType {
    Railfence,
    Redefence,
    Vigenere,
    Variant,
    Beaufort,
    Gronsfeld,
    Porta,
}

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

        }
        return res
    }
}