import { CipherHandler, IState } from "./cipherhandler"
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";

export interface ITestState extends IState {
    /** Number of points a question is worth */
    points?: number
}

/**
 * CipherTest - This class handles all of the actions associated with generating
 * a test of Ciphers.
 */
export class CipherTest extends CipherHandler {
    defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.None,
    }
    state: ITestState = { ...this.defaultstate }
    cmdButtons: JTButtonItem[] = [
        { title: "Encode", color: "primary", id: "load", },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset", },
    ]
    restore(data: ITestState): void {
        let curlang = this.state.curlang
        this.state = { ...this.defaultstate }
        this.state.curlang = curlang
        this.copyState(this.state, data)
        this.setUIDefaults()
        this.updateOutput()
    }
}
