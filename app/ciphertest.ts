import { cloneObject, NumberMap } from "./ciphercommon";
import { CipherPrintFactory } from "./cipherfactory";
import {
    CipherHandler,
    IRunningKey,
    IState,
    ITest,
    toolMode,
} from "./cipherhandler";
import { getCipherTitle, ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";

export interface buttonInfo {
    title: string;
    btnClass: string;
    disabled?: boolean;
}

export interface ITestState extends IState {
    /** Number of points a question is worth */
    points?: number;
    /** Which test the handler is working on */
    test?: number;
    /** Show the solutions on the answers */
    sols?: string;
    /** A URL to to import test date from on load */
    importURL?: string;
}
interface IQuestionData {
    /** Which question this is associated with.  -1 indicates timed */
    qnum: number;
    /** The number of points for the question */
    points: number;
}
interface INewCipherEntry {
    cipherType: ICipherType;
    /** Optional language string */
    lang?: string;
    /** Optional title to override the default title */
    title?: string;
}
export type ITestDisp = "testedit" | "testprint" | "testans" | "testsols";
/**
 * Base support for all the test generation handlers
 * There are five pages that need to be created
 * TestManage.html
 *    This shows a list of all tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Test Packet> <Answer Key> Test Title  #questions
 *  The command buttons availableare
 *       <New Test><EXPORT><IMPORT>
 *
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
 *    <Generate Test><Generate Answers><Save><Export><IMPORT>
 *
 *  TestQuestions.html
 *    This shows all the questions available
 *      Action         Type     Points     Question   Cipher Text
 *      <EDIT><DELETE> <type>   <points>   <question> <ciphertext>
 *  The command buttons available are
 *      <EXPORT><IMPORT>
 *
 *  TestPrint.html?test=<n>
 *  Displays a printable version of test <n> if it exists (default 0).
 *  Otherwise it provies a link back to TestManage.html
 *
 *  TestAnswers.html?test=<n>
 */
export class CipherTest extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.None,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: "New Test", color: "primary", id: "newtest" },
        {
            title: "Export Tests",
            color: "primary",
            id: "export",
            disabled: true,
        },
        { title: "Import Tests from File", color: "primary", id: "import" },
        { title: "Import Tests from URL", color: "primary", id: "importurl" },
    ];
    public cipherChoices: INewCipherEntry[] = [
        { cipherType: ICipherType.Affine },
        { cipherType: ICipherType.Caesar },
        { cipherType: ICipherType.Atbash },
        { cipherType: ICipherType.Aristocrat },
        {
            cipherType: ICipherType.Aristocrat,
            lang: "es",
            title: "Spanish Aristocrat",
        },
        { cipherType: ICipherType.Patristocrat },
        { cipherType: ICipherType.Hill },
        { cipherType: ICipherType.Vigenere },
        { cipherType: ICipherType.RunningKey },
        { cipherType: ICipherType.Baconian },
        { cipherType: ICipherType.RSA },
    ];
    /**
     * Stash of the current questions
     */
    public qdata: IQuestionData[];
    /**
     * Any running keys used for the test
     */
    public runningKeys: IRunningKey[];
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.setUIDefaults();
        this.updateOutput();
    }
    public genTestEditState(testdisp: ITestDisp): JQuery<HTMLElement> {
        let radiobuttons = [
            { title: "Edit Test", value: "testedit" },
            { title: "Test Packet", value: "testprint" },
            { title: "Answer Key", value: "testans" },
            { title: "Answers and Solutions", value: "testsols" },
        ];
        return JTRadioButton(8, "testdisp", radiobuttons, testdisp);
    }
    public setTestEditState(testdisp: ITestDisp): void {
        JTRadioButtonSet("testdisp", testdisp);
    }
    public checkXMLImport(): void {
        if (this.state.importURL !== undefined) {
            if (this.state.importURL !== "") {
                let url = this.state.importURL;
                $.getJSON(url, data => {
                    this.importXML(data);
                }).fail(() => {
                    alert("Unable to load file " + url);
                });
            }
        }
    }
    public newTest(): void {
        this.setTestEntry(-1, {
            timed: -1,
            count: 0,
            questions: [],
            title: "New Test",
        });
        location.reload();
    }
    public exportTests(): void {}
    public importTests(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    public gotoEditTest(test: number): void {
        location.assign("TestGenerator.html?test=" + String(test));
    }
    public deleteTest(test: number): void {
        this.deleteTestEntry(test);
        location.reload();
    }
    public gotoPrintTest(test: number): void {
        location.assign("TestPrint.html?test=" + String(test));
    }
    public gotoPrintTestAnswers(test: number): void {
        location.assign("TestAnswers.html?test=" + String(test));
    }
    public gotoPrintTestSols(test: number): void {
        location.assign("TestAnswers.html?test=" + String(test) + "&sols=y");
    }
    public gotoTestDisplay(testdisp: ITestDisp): void {
        switch (testdisp) {
            case "testans":
                this.gotoPrintTestAnswers(this.state.test);
                break;
            case "testedit":
                this.gotoEditTest(this.state.test);
                break;
            default:
            case "testprint":
                this.gotoPrintTest(this.state.test);
                break;
            case "testsols":
                this.gotoPrintTestSols(this.state.test);
                break;
        }
    }

    public gotoEditCipher(entry: number): void {
        let state = this.getFileEntry(entry);
        let editURL = this.getEditURL(state);
        if (editURL !== "") {
            if (editURL.indexOf("?") > -1) {
                editURL += "&editEntry=" + entry;
            } else {
                editURL += "?editEntry=" + entry;
            }
            location.assign(editURL);
        } else {
            alert("No editor found");
        }
    }
    public genQuestionTable(
        filter: number,
        buttons: buttonInfo[]
    ): JQuery<HTMLElement> {
        // Figure out what items we will not display if they gave us a filter
        let useditems: { [index: string]: boolean } = {};
        if (filter !== undefined) {
            let test = this.getTestEntry(this.state.test);
            if (test.timed !== -1) {
                useditems[test.timed] = true;
            }
            for (let entry of test.questions) {
                useditems[entry] = true;
            }
        }

        let testcount = this.getTestCount();
        let testuse: { [index: string]: JQuery<HTMLElement> } = {};
        let testNames: NumberMap = {};

        // Figure out what tests each entry is used with
        for (let testent = 0; testent < testcount; testent++) {
            let test = this.getTestEntry(testent);
            // Make sure we have a unique title for the test
            let title = test.title;
            if (title === "") {
                title = "No Title";
            }
            if (testNames[title] !== undefined) {
                title += "." + testent;
            }
            testNames[title] = testent;
            // If we have a timed question, just put it in front of all the other questions
            // that we will process since we don't actually care about the order of the
            // questions, just which test it is used in
            if (test.timed !== -1) {
                test.questions.unshift(test.timed);
            }
            // Generate a clickable URL for each entry in the test
            for (let entry of test.questions) {
                if (entry in testuse) {
                    // If this is a subsequent entry, separate them with a comma
                    testuse[entry].append(", ");
                } else {
                    // For the first entry, we need a <div> to contain it all
                    testuse[entry] = $("<div/>");
                }
                testuse[entry].append(
                    $("<a/>", {
                        href: "TestGenerator.html?test=" + testent,
                    }).text(title)
                );
            }
        }

        let result = $("<div/>", { class: "questions" });

        let cipherCount = this.getCipherCount();
        let table = new JTTable({ class: "cell stack queslist" });
        let row = table.addHeaderRow();
        row.add("Question")
            .add("Action")
            .add("Type")
            .add("Use")
            .add("Points")
            .add("Question")
            .add("Plain Text");

        for (let entry = 0; entry < cipherCount; entry++) {
            if (!useditems[entry]) {
                if (entry in testuse) {
                    this.addQuestionRow(
                        table,
                        entry,
                        entry,
                        buttons,
                        testuse[entry]
                    );
                } else {
                    this.addQuestionRow(table, entry, entry, buttons, "");
                }
            }
        }
        result.append(table.generate());
        return result;
    }
    public genNewCipherDropdown(
        id: string,
        title: string
    ): JQuery<HTMLElement> {
        let inputgroup = $("<div/>", {
            class: "input-group cell small-12 medium-12 large-12",
        });
        $("<span/>", { class: "input-group-label" })
            .text(title)
            .appendTo(inputgroup);
        let select = $("<select/>", {
            id: id,
            class: "input-group-field",
        });
        select.append(
            $("<option />", {
                value: "",
            }).text("--Select a Cipher Type to add--")
        );
        for (let entry of this.cipherChoices) {
            let option = $("<option />", {
                value: entry.cipherType,
            });
            if (entry.lang !== undefined) {
                option.attr("data-lang", entry.lang);
            }
            let cipherTitle = getCipherTitle(entry.cipherType);
            if (entry.title !== undefined) {
                cipherTitle = entry.title;
            }
            option.html(cipherTitle);
            select.append(option);
        }
        inputgroup.append(select);
        return inputgroup;
    }
    public addQuestionRow(
        table: JTTable,
        order: number,
        qnum: number,
        buttons: buttonInfo[],
        prevuse: any
    ): void {
        let ordertext = "Timed";
        let extratext = "";
        if (order === -1) {
            extratext =
                "  When you have solved it, raise your hand so that the time can be recorded and the solution checked.";
        } else {
            ordertext = String(order);
        }
        let row = table.addBodyRow();
        if (order === -1 && qnum === -1) {
            let callout = $("<div/>", {
                class: "callout warning",
            }).text("No Timed Question!  Add one from below");
            callout.append(
                this.genNewCipherDropdown("addnewtimed", "New Timed Question")
            );
            row.add({
                celltype: "td",
                settings: { colspan: 6 },
                content: callout,
            });
        } else {
            row.add(ordertext);
            let state = this.getFileEntry(qnum);
            if (state === null) {
                state = {
                    cipherType: ICipherType.None,
                    points: 0,
                    cipherString: "",
                };
            }
            let buttonset = $("<div/>", {
                class: "button-group round shrink",
            });
            for (let btninfo of buttons) {
                let button = $("<button/>", {
                    "data-entry": order,
                    type: "button",
                    class: btninfo.btnClass + " button",
                }).html(btninfo.title);
                if (btninfo.disabled === true) {
                    button.attr("disabled", "disabled");
                }
                buttonset.append(button);
            }
            row.add($("<div/>", { class: "grid-x" }).append(buttonset)).add(
                state.cipherType
            );
            if (prevuse !== undefined) {
                row.add(prevuse);
            }
            row.add(String(state.points))
                .add(
                    $("<span/>", {
                        class: "qtextentry",
                    }).html(state.question + extratext)
                )
                .add(state.cipherString);
        }
        return;
    }
    /**
     * Generate a printable answer for a test entry.
     * An entry value of -1 is for the timed question
     */
    public printTestAnswer(
        qnum: number,
        question: number,
        extraclass: string,
        printSolution: boolean
    ): JQuery<HTMLElement> {
        let state = this.getFileEntry(question);
        let extratext = "";
        let result = $("<div/>", {
            class: "question " + extraclass,
        });
        let qtext = $("<div/>", { class: "qtext" });
        if (qnum === -1) {
            qtext.append(
                $("<span/>", {
                    class: "timed",
                }).text("Timed Question")
            );
            extratext =
                "  When you have solved it, raise your hand so that the time can be recorded and the solution checked.";
        } else {
            qtext.append(
                $("<span/>", {
                    class: "qnum",
                }).text(String(qnum) + ")")
            );
        }
        qtext.append(
            $("<span/>", {
                class: "points",
            }).text(" [" + String(state.points) + " points] ")
        );
        qtext.append(
            $("<span/>", {
                class: "qbody",
            }).html(state.question + extratext)
        );

        result.append(qtext);
        let cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        // Remember this question points so we can generate the tiebreaker order
        this.qdata.push({ qnum: qnum, points: state.points });
        result.append(cipherhandler.genAnswer());
        if (printSolution) {
            result.append(cipherhandler.genSolution());
        }
        return result;
    }
    /**
     * Generate a printable answer key for a test entry.
     * An entry value of -1 is for the timed question.
     */
    public printTestQuestion(
        qnum: number,
        question: number,
        extraclass: string
    ): JQuery<HTMLElement> {
        let state = this.getFileEntry(question);
        let extratext = "";
        let result = $("<div/>", {
            class: "question " + extraclass,
        });
        let qtext = $("<div/>", { class: "qtext" });
        if (qnum === -1) {
            qtext.append(
                $("<span/>", {
                    class: "timed",
                }).text("Timed Question")
            );
            extratext =
                "  When you have solved it, raise your hand so that the time can be recorded and the solution checked.";
        } else {
            qtext.append(
                $("<span/>", {
                    class: "qnum",
                }).text(String(qnum) + ")")
            );
        }
        qtext.append(
            $("<span/>", {
                class: "points",
            }).text(" [" + String(state.points) + " points] ")
        );
        qtext.append(
            $("<span/>", {
                class: "qbody",
            }).html(state.question + extratext)
        );
        result.append(qtext);
        let cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        // Did the handler use a running key
        if (cipherhandler.usesRunningKey) {
            // If we haven't gotten any running keys then get the defaults
            if (this.runningKeys === undefined) {
                this.runningKeys = this.getRunningKeyStrings();
            }
            // Add this one to the list of running keys used.  Note that we don't
            // have a title, so we have to just make it up.  In theory this shouldn't
            // happen because we would expect that all the running keys were defined before
            // creating the test.
            if (cipherhandler.extraRunningKey !== undefined) {
                this.runningKeys.push({
                    title: "Unknown",
                    text: cipherhandler.extraRunningKey,
                });
            }
        }
        // Remember this question points so we can generate the score sheet
        this.qdata.push({ qnum: qnum, points: state.points });
        result.append(cipherhandler.genQuestion());
        return result;
    }
    /**
     * Compare two arbitrary objects to see if they are equivalent
     */
    public isEquivalent(a: any, b: any): boolean {
        // If the left side is blank or undefined then we assume that the
        // right side will be equivalent.  (This allows for objects which have
        // been extended with new attributes)
        if (a === "" || a === undefined || a === null) {
            return true;
        }
        // If we have an object on the left, the right better be an object too
        if (typeof a === "object") {
            if (typeof b !== "object") {
                return false;
            }
            // Both are objects, if any element of the object doesn't match
            // then they are not equivalent
            for (let elem of a) {
                if (!this.isEquivalent(a[elem], b[elem])) {
                    return false;
                }
            }
            // They all matched, so we are equivalent
            return true;
        }
        // Simple item, result is if they match
        return a === b;
    }
    /**
     * Compare two saved cipher states to see if they are indeed identical
     */
    public isSameCipher(state1: IState, state2: IState): boolean {
        // Make sure every element in state1 that is non empty is also in state 2
        for (let elem in state1) {
            if (!this.isEquivalent(state1[elem], state2[elem])) {
                return false;
            }
        }
        // And do the same for everything in reverse
        for (let elem in state2) {
            if (!this.isEquivalent(state2[elem], state1[elem])) {
                return false;
            }
        }
        return true;
    }
    public findTest(newTest: ITest): number {
        // Go through all the tests and build a structure holding them that we will convert to JSON
        let testcount = this.getTestCount();
        for (let testnum = 0; testnum < testcount; testnum++) {
            let test = this.getTestEntry(testnum);
            if (
                test.title === newTest.title &&
                test.timed === newTest.timed &&
                test.questions.length === newTest.questions.length
            ) {
                let issame = true;
                for (let i = 0; i < test.questions.length; i++) {
                    if (test.questions[i] !== newTest.questions[i]) {
                        issame = false;
                        break;
                    }
                }
                if (issame) {
                    return testnum;
                }
            }
        }

        return -1;
    }

    // tslint:disable-next-line:cyclomatic-complexity
    public processTestXML(data: any): void {
        // Load in all the ciphers we know of so that we don't end up doing a duplicate
        let cipherCount = this.getCipherCount();
        let cipherCache: { [index: number]: IState } = {};
        let inputMap: NumberMap = {};
        for (let entry = 0; entry < cipherCount; entry++) {
            cipherCache[entry] = this.getFileEntry(entry);
        }
        // First we get all the ciphers defined and add them to the list of ciphers
        for (let ent in data) {
            let pieces = ent.split(".");
            // Make sure we have a valid object that we can bring in
            if (
                pieces[0] === "CIPHER" &&
                typeof data[ent] === "object" &&
                data[ent].cipherType !== undefined &&
                data[ent].cipherString !== undefined &&
                !(pieces[1] in inputMap)
            ) {
                // It is a cipher entry // It is an object // with a cipherType // and a cipherString
                // that we haven't seen before
                let oldPos = Number(pieces[1]);
                let toAdd: IState = data[ent];
                let needNew = true;
                // Now make sure that we don't already have this cipher loaded
                for (let oldEnt = 0; oldEnt < cipherCount; oldEnt++) {
                    if (this.isSameCipher(cipherCache[oldEnt], toAdd)) {
                        inputMap[String(oldPos)] = oldEnt;
                        needNew = false;
                        break;
                    }
                }
                // If we hadn't found it, let's go ahead and add it
                if (needNew) {
                    let newval = this.setFileEntry(-1, toAdd);
                    cipherCache[newval] = toAdd;
                    inputMap[String(oldPos)] = newval;
                    cipherCount++;
                }
            }
        }
        // Now that we have all the ciphers in, we can go back and add the tests
        for (let ent in data) {
            let pieces = ent.split(".");
            // Make sure we have a valid object that we can bring in
            if (
                pieces[0] === "TEST" &&
                typeof data[ent] === "object" &&
                data[ent].title !== undefined &&
                data[ent].timed !== undefined &&
                data[ent].questions !== undefined
            ) {
                // It is a cipher entry // It is an object // with a title // with a timed question
                // and questions
                let newTest: ITest = data[ent];
                // Go through and fix up all the entries.  First the timed question
                if (
                    newTest.timed !== -1 &&
                    inputMap[newTest.timed] !== undefined
                ) {
                    newTest.timed = inputMap[newTest.timed];
                } else {
                    newTest.timed = -1;
                }
                // and then all of the entries
                for (let entry = 0; entry < newTest.questions.length; entry++) {
                    if (inputMap[newTest.questions[entry]] !== undefined) {
                        newTest.questions[entry] =
                            inputMap[newTest.questions[entry]];
                    } else {
                        newTest.questions[entry] = 0;
                    }
                }
                // For good measure, just fix up the questions length
                newTest.count = newTest.questions.length;
                let testnum = this.findTest(newTest);
                if (testnum === -1) {
                    testnum = this.setTestEntry(-1, newTest);
                }
                if (testnum !== -1) {
                    this.gotoEditTest(testnum);
                }
            }
        }
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $("#printtest")
            .off("click")
            .on("click", () => {
                this.gotoPrintTest(this.state.test);
            });
        $("#printans")
            .off("click")
            .on("click", () => {
                this.gotoPrintTestAnswers(this.state.test);
            });
        $("#printsols")
            .off("click")
            .on("click", () => {
                this.gotoPrintTestSols(this.state.test);
            });
        $("#edittest")
            .off("click")
            .on("click", () => {
                this.gotoEditTest(this.state.test);
            });
        $(".entryedit")
            .off("click")
            .on("click", e => {
                this.gotoEditCipher(Number($(e.target).attr("data-entry")));
            });
        $('[name="testdisp"]')
            .off("click")
            .on("click", e => {
                $(e.target)
                    .siblings()
                    .removeClass("is-active");
                $(e.target).addClass("is-active");
                this.gotoTestDisplay($(e.target).val() as ITestDisp);
                this.updateOutput();
            });
    }
}
