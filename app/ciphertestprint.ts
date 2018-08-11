import { cloneObject } from "./ciphercommon";
import { CipherTest, ITestState } from "./ciphertest"
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";

/**
 * CipherTestPrint
 *  Displays a printable version of test <n> if it exists (default 0).
 *  Otherwise it provies a link back to TestManage.html
 */
export class CipherTestPrint extends CipherTest {
    defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.Test,
        test: 0,
    }
    state: ITestState = cloneObject(this.defaultstate) as ITestState
    cmdButtons: JTButtonItem[] = [
    ]

    restore(data: ITestState): void {
        let curlang = this.state.curlang
        this.state = cloneObject(this.defaultstate) as ITestState
        this.state.curlang = curlang
        this.copyState(this.state, data)
    }
    genPreCommands(): JQuery<HTMLElement> {
        let testcount = this.getTestCount()
        if (testcount === 0) {
            return $("<h3>").text("No Tests Created Yet")
        }
        if (this.state.test > testcount) {
            return ($("<h3>").text("Test not found"))
        }
        let test = this.getTestEntry(this.state.test)
        let result = $("<div>")
        result.append($("<h1>").text("Test Aids go here"))
        result.append($("<h2>").text(test.title))
        result.append($("<h3>").text("Test #" + Number(this.state.test)))
        if (test.timed === -1) {
            result.append($("<p>").text("No timed question"))
        } else {
            result.append(this.printTestQuestion(-1, test.timed, "pagebreak"))
        }
        for (let qnum = 0; qnum < test.count; qnum++) {
            let breakclass = ""
            if (qnum % 2 === 0) {
                breakclass = "pagebreak"
            }
            result.append(this.printTestQuestion(qnum + 1, test.questions[qnum], breakclass))
        }
        return result
    }
}
