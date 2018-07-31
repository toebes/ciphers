import { CipherTest, ITestState } from "./ciphertest"
import { ICipherType } from "./ciphertypes";

/**
 * CipherTestAnswers
 *    This prints an answer key for a specified test
 */
export class CipherTestAnswers extends CipherTest {
    defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.Test,
        test: 0,
    }
    state: ITestState = { ...this.defaultstate }
    restore(data: ITestState): void {
        this.state = { ...this.defaultstate }
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
        result.append($("<h1>").text("Test Answer key for goes here"))
        result.append($("<h2>").text(test.title))
        result.append($("<h3>").text("Test #" + Number(this.state.test)))
        if (test.timed === -1) {
            result.append($("<p>").text("No timed question"))
        } else {
            result.append(this.printTestAnswer(-1, test.timed))
        }
        for (let qnum = 0; qnum < test.count; qnum++) {
            result.append(this.printTestAnswer(qnum + 1, test.questions[qnum]))
        }
    }
    attachHandlers(): void {
        super.attachHandlers()
    }

}
