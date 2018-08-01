import { CipherHandler, IState } from "./cipherhandler"
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";

export interface ITestState extends IState {
    /** Number of points a question is worth */
    points?: number
    /** Which test the handler is working on */
    test?: number
}

/**
 * Base support for all the test generation handlers
 * There are five pages that need to be created
 * TestManage.html
 *    This shows a list of all tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <PRINT TEST> <PRINT ANSWERS> Test Title  #questions
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
    defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.None,
    }
    state: ITestState = { ...this.defaultstate }
    cmdButtons: JTButtonItem[] = [
        { title: "New Test", color: "primary", id: "newtest", },
        { title: "Export Tests", color: "primary", id: "export", disabled: true, },
        { title: "Import Tests", color: "primary", id: "import", disabled: true, },
    ]
    restore(data: ITestState): void {
        let curlang = this.state.curlang
        this.state = { ...this.defaultstate }
        this.state.curlang = curlang
        this.copyState(this.state, data)
        this.setUIDefaults()
        this.updateOutput()
    }
    newTest(): void {
        this.setTestEntry(-1, { timed: -1, count: 0, questions: [], title: "New Test" })
        location.reload()
    }
    exportTests(): void {
    }
    importTests(): void {
    }
    gotoEditTest(test: number): void {
        location.assign("TestGenerator.html?test=" + String(test))
    }
    deleteTest(test: number): void {
        this.deleteTestEntry(test)
        location.reload()
    }
    gotoPrintTest(test: number): void {
        location.assign("TestPrint.html?test=" + String(test))
    }
    gotoPrintTestAnswers(test: number): void {
        location.assign("TestAnswers.html?test=" + String(test))
    }
    gotoEditCipher(entry: number): void {
        let state = this.getFileEntry(entry)
        let editURL = this.getEditURL(state)
        if (editURL !== "") {
            if (editURL.indexOf('?') > -1) {
                editURL += "&editEntry=" + entry
            } else {
                editURL += "?editEntry=" + entry
            }
            location.assign(editURL)
        }
        //        location.assign("TestGenerator.html?test=" + String(test))
    }
    printTestAnswer(qnum: number, question: number): JQuery<HTMLElement> {
        let state = this.getFileEntry(question)
        let result = $("<div>", { class: "question" });
        if (qnum === -1) {
            result.append($("<span/>", { class: "timed" }).text("Timed Question"))
        } else {
            result.append($("<span>", { class: "qnum" }).text(String(qnum) + ")"))
        }
        result.append($("<span>", { class: "points" }).text(" [" + String(state.points) + "points ] "))
        result.append($("<span/>").html(state.question))
        let cipherans = $("<div/>", { class: "cipher" + state.cipherType })
        cipherans.append($("<p/>", { class: "debug" }).text(state.cipherType))
        cipherans.append($("<p/>", { class: "ciphertext" }).text(state.cipherString))
        cipherans.append($("<p/>", { class: "debug" }).text("Answer Goes Here"))
        result.append(cipherans)
        return (result)
    }
    printTestQuestion(qnum: number, question: number): JQuery<HTMLElement> {
        let state = this.getFileEntry(question)
        let result = $("<div>", { class: "question" });
        if (qnum === -1) {
            result.append($("<span/>", { class: "timed" }).text("Timed Question"))
        } else {
            result.append($("<span>", { class: "qnum" }).text(String(qnum) + ")"))
        }
        result.append($("<span>", { class: "points" }).text(" [" + String(state.points) + "] "))
        result.append($("<span/>").html(state.question))
        let cipherans = $("<div/>", { class: "cipher" + state.cipherType })
        cipherans.append($("<p/>", { class: "debug" }).text(state.cipherType))
        cipherans.append($("<p/>", { class: "ciphertext" }).text(state.cipherString))
        cipherans.append($("<p/>", { class: "debug" }).text("Question Goes Here"))
        result.append(cipherans)
        return (result)
    }
    attachHandlers(): void {
        super.attachHandlers()
        $("#printtest").off("click").on("click", (e) => {
            this.gotoPrintTest(this.state.test)
        })
        $("#printans").off("click").on("click", (e) => {
            this.gotoPrintTestAnswers(this.state.test)
        })
        $(".entryedit").off("click").on("click", (e) => {
            this.gotoEditCipher(Number($(e.target).attr('data-entry')))
        })
    }
}
