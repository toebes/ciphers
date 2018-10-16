import { cloneObject } from "../common/ciphercommon";
import { menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTTable } from "../common/jttable";
import { CipherTest, ITestState } from "./ciphertest";

/**
 * CipherTestPrint
 *  Displays a printable version of test <n> if it exists (default 0).
 *  Otherwise it provies a link back to TestManage.html
 */
export class CipherTestPrint extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.Test,
        test: 0,
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [];

    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.updateOutput();
    }
    public updateOutput(): void {
        this.setMenuMode(menuMode.test);
        $(".testcontent").each((i, elem) => {
            $(elem).replaceWith(this.genTestQuestions());
        });
        this.attachHandlers();
    }
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestEditState("testprint");
    }
    public genTestQuestions(): JQuery<HTMLElement> {
        let testcount = this.getTestCount();
        if (testcount === 0) {
            return $("<h3>").text("No Tests Created Yet");
        }
        if (this.state.test > testcount) {
            return $("<h3>").text("Test not found");
        }
        let test = this.getTestEntry(this.state.test);
        let result = $("<div/>");
        $(".testtitle").text(test.title);
        let dt = new Date();
        $(".testyear").text(dt.getFullYear());
        this.runningKeys = undefined;
        this.qdata = [];
        if (test.timed === -1) {
            result.append(
                $("<p/>", {
                    class: "noprint",
                }).text("No timed question")
            );
        } else {
            result.append(this.printTestQuestion(-1, test.timed, "pagebreak"));
        }
        for (let qnum = 0; qnum < test.count; qnum++) {
            let breakclass = "";
            if (qnum % 2 === 0) {
                breakclass = "pagebreak";
            }
            result.append(
                this.printTestQuestion(
                    qnum + 1,
                    test.questions[qnum],
                    breakclass
                )
            );
        }
        // Since the handlers turn on the file menus sometimes, we need to turn them back off
        this.setMenuMode(menuMode.test);

        /**
         * Now that we have generated the data for the test, output any running keys used
         */
        if (this.runningKeys !== undefined) {
            $("#runningkeys").append($("<h2/>").text("Famous Phrases"));
            for (let ent of this.runningKeys) {
                $("#runningkeys").append(
                    $("<div/>", {
                        class: "runtitle",
                    }).text(ent.title)
                );
                $("#runningkeys").append(
                    $("<div/>", {
                        class: "runtext",
                    }).text(ent.text)
                );
            }
        }
        /**
         * Lastly we need to print out the score table
         */
        let table = new JTTable({
            class: "cell shrink testscores",
        });
        let hastimed = false;
        table
            .addHeaderRow()
            .add("Question")
            .add("Value")
            .add("Incorrect letters")
            .add("Deduction")
            .add("Score");
        for (let qitem of this.qdata) {
            let qtitle = "";
            if (qitem.qnum === -1) {
                qtitle = "Timed";
                hastimed = true;
            } else {
                qtitle = String(qitem.qnum);
            }
            table
                .addBodyRow()
                .add({
                    settings: { class: "t" },
                    content: qtitle,
                })
                .add({
                    settings: { class: "v" },
                    content: String(qitem.points),
                })
                .add("")
                .add("")
                .add("");
        }
        // If we had a timed question, we put in the slot for the bonus
        if (hastimed) {
            table
                .addFooterRow()
                .add("Bonus")
                .add("")
                .add({
                    settings: { colspan: 2, class: "grey" },
                    content: "",
                })
                .add("");
        }
        table
            .addFooterRow()
            .add("Final Score")
            .add({ settings: { colspan: 4 }, content: "" });
        $("#scoretable").append(table.generate());
        return result;
    }
}
