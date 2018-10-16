import { cloneObject } from "../common/ciphercommon";
import { menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTTable } from "../common/jttable";
import { CipherTest, ITestDisp, ITestState } from "./ciphertest";

/**
 * CipherTestAnswers
 *    This prints an answer key for a specified test
 */
export class CipherTestAnswers extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.Test,
        test: 0,
        sols: "n",
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [];
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestEditState(this.getTestEditState());
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        this.setSols(this.state.sols);
    }
    /**
     * Clean up the sols value so that all the other code can count on a y or n
     * @param sols New sols display value (either y or n)
     */
    public setSols(sols: string): boolean {
        let changed = false;
        let newsols = "n";
        if (sols !== undefined && sols.toLowerCase().substr(0, 1) === "y") {
            newsols = "y";
        }
        if (newsols !== this.state.sols) {
            changed = true;
            this.state.sols = newsols;
        }
        return changed;
    }
    /**
     * Get the test display state for whether we are displaying answers or solutions
     */
    public getTestEditState(): ITestDisp {
        this.setSols(this.state.sols);
        if (this.state.sols === "y") {
            return "testsols";
        }
        return "testans";
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        this.setMenuMode(menuMode.test);
        this.setTestEditState(this.getTestEditState());

        $(".testcontent").each((i, elem) => {
            $(elem).replaceWith(this.genTestAnswers());
        });
        this.attachHandlers();
    }
    /*
     * Sorter to break ties
     */
    public tiebreakersort(a: any, b: any): number {
        if (a.points > b.points) {
            return -1;
        } else if (a.points < b.points) {
            return 1;
        } else if (a.qnum > b.qnum) {
            return -1;
        } else if (a.qnum < b.qnum) {
            return 1;
        }
        return 0;
    }
    /**
     * Populate the test with answers
     */
    public genTestAnswers(): JQuery<HTMLElement> {
        let printSolution = false;
        if (this.state.sols === "y") {
            printSolution = true;
            // Empty the instructions so that they don't print
            $(".instructions").empty();
        }
        let testcount = this.getTestCount();
        if (testcount === 0) {
            return $("<h3/>").text("No Tests Created Yet");
        }
        if (this.state.test > testcount) {
            return $("<h3/>").text("Test not found");
        }

        let result = $("<div/>");
        this.qdata = [];

        let test = this.getTestEntry(this.state.test);
        $(".testtitle").text(test.title);
        let dt = new Date();
        $(".testyear").text(dt.getFullYear());
        if (test.timed === -1) {
            result.append(
                $("<p/>", {
                    class: "noprint",
                }).text("No timed question")
            );
        } else {
            result.append(
                this.printTestAnswer(-1, test.timed, "pagebreak", printSolution)
            );
        }
        for (let qnum = 0; qnum < test.count; qnum++) {
            let breakclass = "";
            if (qnum % 2 === 0) {
                breakclass = "pagebreak";
            }
            result.append(
                this.printTestAnswer(
                    qnum + 1,
                    test.questions[qnum],
                    breakclass,
                    printSolution
                )
            );
        }
        // Since the handlers turn on the file menus sometimes, we need to turn them back off
        this.setMenuMode(menuMode.test);
        //
        // Generate the tie breaker order
        //
        let table = new JTTable({
            class: "cell shrink tiebreak",
        });
        table
            .addHeaderRow()
            .add("Tie Breaker Order")
            .add("Question #");

        // We have stacked all of the found matches.  Now we need to sort them
        this.qdata.sort(this.tiebreakersort);
        let order = 1;
        for (let qitem of this.qdata) {
            let qtitle = "";
            if (qitem.qnum === -1) {
                qtitle = "Timed";
            } else {
                qtitle = String(qitem.qnum);
            }
            table
                .addBodyRow()
                .add(String(order))
                .add(qtitle);
            order++;
        }
        $("#tietable").append(table.generate());
        return result;
    }
}
