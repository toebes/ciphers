import { cloneObject } from "./ciphercommon";
import { CipherTest, ITestState } from "./ciphertest"
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";

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
    state: ITestState = cloneObject(this.defaultstate) as ITestState
    cmdButtons: JTButtonItem[] = [
    ]
    restore(data: ITestState): void {
        this.state = cloneObject(this.defaultstate) as ITestState
        this.copyState(this.state, data)
        this.updateOutput()
    }
    updateOutput(): void {
        $('.testcontent').each((i, elem) => {
            $(elem).replaceWith(this.genTestAnswers())
        })
        this.attachHandlers()
    }
    genTestAnswers(): JQuery<HTMLElement> {
        let testcount = this.getTestCount()
        if (testcount === 0) {
            return $("<h3>").text("No Tests Created Yet")
        }
        if (this.state.test > testcount) {
            return ($("<h3>").text("Test not found"))
        }
        let test = this.getTestEntry(this.state.test)
        let result = $("<div>")
        $("#testname").text(test.title)
        if (test.timed === -1) {
            result.append($("<p>", {class: "noprint"}).text("No timed question"))
        } else {
            result.append(this.printTestAnswer(-1, test.timed, "pagebreak"))
        }
        for (let qnum = 0; qnum < test.count; qnum++) {
            let breakclass = ""
            if (qnum % 2 === 0) {
                breakclass = "pagebreak"
            }
            result.append(this.printTestAnswer(qnum + 1, test.questions[qnum], breakclass))
        }
        return result
    }
    attachHandlers(): void {
        super.attachHandlers()
    }

}
