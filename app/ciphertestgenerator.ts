import { cloneObject } from "./ciphercommon";
import { IState, menuMode, toolMode } from "./cipherhandler";
import { buttonInfo, CipherTest, ITestState } from "./ciphertest";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTTable } from "./jttable";

/**
 * TestGenerator.html?test=<n>
 *    This edits a specific test.  It requires a test number.  If none
 *    is given, it defaults to the first test.  If there is no test,
 *    it says so and gives a link back to the TestManage.html page
 *    The top shows the list of questions included on the current test in the
 *    test order with the timed question first as a table 6 columns
 *       Question# action          Type   Points    Question    Cipher Text
 *        #        <edit><remove>  <type> <points>  <question>  <ciphertext>
 *  Below that is another list of questions to be added to the test
 *       action         Type     Points    Question    Cipher Text
 *       <edit><add>    <type>   <points>  <question>  <ciphertext>
 *  The command buttons availableare
 *    <Generate Test><Generate Answers><Export><IMPORT>
 */
export class CipherTestGenerator extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.None,
        test: 0,
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Randomize Order", color: "primary", id: "randomize" },
        { title: "Import Tests from File", color: "primary", id: "import" },
        { title: "Import Tests from URL", color: "primary", id: "importurl" },
    ];
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        this.setUIDefaults();
        this.updateOutput();
    }
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestEditState("testedit");
    }
    public genTestQuestions(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "testdata" });
        let testcount = this.getTestCount();
        if (testcount === 0) {
            result.append($("<h3>").text("No Tests Created Yet"));
            return result;
        }
        if (this.state.test > testcount) {
            result.append($("<h3>").text("Test not found"));
            return result;
        }
        let test = this.getTestEntry(this.state.test);

        let testdiv = $("<div/>", { class: "callout primary" });

        testdiv.append(
            JTFLabeledInput(
                "Title",
                "text",
                "title",
                test.title,
                "small-12 medium-12 large-12"
            )
        );

        let table = new JTTable({ class: "cell stack queslist" });
        let row = table.addHeaderRow();
        row.add("Question")
            .add("Action")
            .add("Type")
            .add("Points")
            .add("Question")
            .add("Plain Text");
        let buttons: buttonInfo[] = [
            { title: "Edit", btnClass: "quesedit" },
            { title: "Remove", btnClass: "quesremove alert" },
        ];
        this.addQuestionRow(table, -1, test.timed, buttons, undefined);
        for (let entry = 0; entry < test.count; entry++) {
            let buttons2: buttonInfo[] = [
                { title: "&uarr;", btnClass: "quesup", disabled: entry === 0 },
                {
                    title: "&darr;",
                    btnClass: "quesdown",
                    disabled: entry === test.count - 1,
                },
                { title: "Edit", btnClass: "quesedit" },
                { title: "Remove", btnClass: "quesremove alert" },
            ];
            this.addQuestionRow(
                table,
                entry + 1,
                test.questions[entry],
                buttons2,
                undefined
            );
        }
        if (test.count === 0) {
            let callout = $("<div/>", {
                class: "callout warning",
            }).text("No Questions!  Add from below");
            table.addBodyRow().add({
                celltype: "td",
                settings: { colspan: 6 },
                content: callout,
            });
        }
        let dropdown = this.genNewCipherDropdown("addnewques", "New Question");
        table.addBodyRow().add({
            celltype: "td",
            settings: { colspan: 6 },
            content: dropdown,
        });

        testdiv.append(table.generate());
        // Put in buttons for adding blank tests of various types..
        result.append(testdiv);
        return result;
    }
    public genQuestionPool(): JQuery<HTMLElement> {
        let result = $("<div/>", {
            class: "questionpool callout secondary",
        });
        result.append(
            $("<h2>").text("Unused questions that can be added to this test")
        );

        let buttons: buttonInfo[] = [
            { title: "Edit", btnClass: "entryedit" },
            { title: "Add", btnClass: "quesadd" },
            { title: "Set&nbsp;Timed", btnClass: "questime" },
        ];

        result.append(this.genQuestionTable(this.state.test, buttons));
        return result;
    }
    public exportTest(link: JQuery<HTMLElement>): void {
        let result = {};
        let test = this.getTestEntry(this.state.test);
        result["TEST.0"] = test;

        if (test.timed !== -1) {
            result["CIPHER." + String(test.timed)] = this.getFileEntry(
                test.timed
            );
        }
        for (let entry of test.questions) {
            result["CIPHER." + String(entry)] = this.getFileEntry(entry);
        }
        let blob = new Blob([JSON.stringify(result)], {
            type: "text/json",
        });
        let url = URL.createObjectURL(blob);

        link.attr("download", test.title + ".json");
        link.attr("href", url);
    }
    public createEmptyQuestion(
        ciphertype: ICipherType,
        reqlang: string,
        fortimed: boolean
    ): void {
        let lang = reqlang;
        if (lang === undefined || lang === "") {
            lang = "en";
        }
        let state: IState = {
            cipherType: ciphertype,
            points: 0,
            question: "Solve This",
            cipherString: "",
            curlang: lang,
        };
        let entry = this.setFileEntry(-1, state);
        if (fortimed) {
            this.gotoSetTimedCipher(entry);
        } else {
            this.gotoAddCipher(entry);
        }
    }
    public updateOutput(): void {
        this.setMenuMode(menuMode.test);
        $(".testdata").each((i, elem) => {
            $(elem).replaceWith(this.genTestQuestions());
        });
        $(".questionpool").each((i, elem) => {
            $(elem).replaceWith(this.genQuestionPool());
        });
        this.attachHandlers();
    }
    public setTitle(title: string): void {
        let test = this.getTestEntry(this.state.test);
        test.title = title;
        this.setTestEntry(this.state.test, test);
    }
    public gotoAddCipher(entry: number): void {
        let test = this.getTestEntry(this.state.test);
        test.count++;
        test.questions.push(entry);
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    public gotoSetTimedCipher(entry: number): void {
        let test = this.getTestEntry(this.state.test);
        test.timed = entry;
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    public gotoEditTestCipher(entry: number): void {
        let test = this.getTestEntry(this.state.test);
        let editEntry = -1;
        if (entry === -1) {
            editEntry = test.timed;
        } else {
            entry--;
            if (entry < test.count) {
                editEntry = test.questions[entry];
            }
        }
        if (editEntry !== -1) {
            this.gotoEditCipher(editEntry);
        }
    }
    public gotoMoveTestCipher(entry: number, dist: number): void {
        let test = this.getTestEntry(this.state.test);
        let sourceent = entry - 1;
        let toswap = sourceent + dist;
        if (
            sourceent < 0 ||
            toswap < 0 ||
            sourceent >= test.count ||
            toswap >= test.count
        ) {
            return;
        }
        let save = test.questions[sourceent];
        test.questions[sourceent] = test.questions[toswap];
        test.questions[toswap] = save;
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    public gotoRemoveCipher(entry: number): void {
        let test = this.getTestEntry(this.state.test);
        if (entry === -1) {
            test.timed = -1;
        } else {
            entry--;
            if (entry < test.count) {
                test.questions.splice(entry, 1);
                test.count--;
            }
        }
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    /** From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array */
    public shuffle(array: any[]): any[] {
        let currentIndex = array.length;
        // While there remain elements to shuffle...
        while (currentIndex !== 0) {
            // Pick a remaining element...
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            let temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }
    public gotoRandomizeTest(): void {
        let test = this.getTestEntry(this.state.test);
        test.questions = this.shuffle(test.questions);
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    public importQuestions(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    /**
     * Process imported XML
     */
    public importXML(data: any): void {
        this.processTestXML(data);
        this.updateOutput();
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $("#export")
            .off("click")
            .on("click", e => {
                this.exportTest($(e.target));
            });
        $("#import")
            .off("click")
            .on("click", () => {
                this.importQuestions(true);
            });
        $("#importurl")
            .off("click")
            .on("click", () => {
                this.importQuestions(false);
            });
        $("#randomize")
            .off("click")
            .on("click", () => {
                this.gotoRandomizeTest();
            });
        $(".quesup")
            .off("click")
            .on("click", e => {
                this.gotoMoveTestCipher(
                    Number($(e.target).attr("data-entry")),
                    -1
                );
            });
        $(".quesdown")
            .off("click")
            .on("click", e => {
                this.gotoMoveTestCipher(
                    Number($(e.target).attr("data-entry")),
                    1
                );
            });
        $(".quesedit")
            .off("click")
            .on("click", e => {
                this.gotoEditTestCipher(Number($(e.target).attr("data-entry")));
            });
        $(".quesadd")
            .off("click")
            .on("click", e => {
                this.gotoAddCipher(Number($(e.target).attr("data-entry")));
            });
        $(".questime")
            .off("click")
            .on("click", e => {
                this.gotoSetTimedCipher(Number($(e.target).attr("data-entry")));
            });
        $(".quesremove")
            .off("click")
            .on("click", e => {
                this.gotoRemoveCipher(Number($(e.target).attr("data-entry")));
            });
        $("#addnewtimed")
            .off("change")
            .on("change", e => {
                let elem = $(e.target).find(":selected");
                let cipherType = elem.val() as ICipherType;
                let lang = elem.attr("data-lang");
                this.createEmptyQuestion(cipherType, lang, true);
            });
        $("#addnewques")
            .off("change")
            .on("change", e => {
                let elem = $(e.target).find(":selected");
                let cipherType = elem.val() as ICipherType;
                let lang = elem.attr("data-lang");
                this.createEmptyQuestion(cipherType, lang, false);
            });
        $("#title")
            .off("input")
            .on("input", e => {
                let title = $(e.target).val() as string;
                this.setTitle(title);
            });
    }
}
