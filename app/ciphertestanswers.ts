import { cloneObject } from "./ciphercommon";
import { CipherTest, ITestState } from "./ciphertest"
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTTable } from "./jttable";

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
        { title: "Edit Test", color: "primary", id: "edittest", },
        { title: "Test Packet", color: "primary", id: "printtest", },
        // { title: "Answer Key", color: "primary", id: "printans", },
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
    /*
     * Sorter to break ties
     */
    tiebreakersort(a: any, b: any): number {
        if (a.points > b.points) {
            return -1
        } else if (a.points < b.points) {
            return 1
        } else if (a.qnum > b.qnum) {
            return -1
        } else if (a.qnum < b.qnum) {
            return 1
        }
        return 0
    }
    genTestAnswers(): JQuery<HTMLElement> {
        let testcount = this.getTestCount()
        if (testcount === 0) {
            return $("<h3>").text("No Tests Created Yet")
        }
        if (this.state.test > testcount) {
            return ($("<h3>").text("Test not found"))
        }
        this.qdata = []

        let test = this.getTestEntry(this.state.test)
        let result = $("<div>")
        $(".testtitle").text(test.title)
        let dt = new Date()
        $(".testyear").text(dt.getFullYear())
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
        //
        // Generate the tie breaker order
        //
        let table = new JTTable({ class: 'cell shrink tiebreak' })
        let hastimed = false
        table.addHeaderRow()
            .add("Tie Breaker Order")
            .add("Question #")

        // We have stacked all of the found matches.  Now we need to sort them
        this.qdata.sort(this.tiebreakersort)
        let order = 1
        for (let qitem of this.qdata) {
            let qtitle = ""
            if (qitem.qnum === -1) {
                qtitle = "Timed"
            } else {
                qtitle = String(qitem.qnum)
            }
            table.addBodyRow()
            .add(String(order))
            .add(qtitle)
            order++
        }
        $("#tietable").append(table.generate())

        return result
    }
    attachHandlers(): void {
        super.attachHandlers()
    }

}
