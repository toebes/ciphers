import { cloneObject, NumberMap } from "./ciphercommon";
import { CipherPrintFactory } from "./cipherfactory";
import { CipherHandler, IState, ITest } from "./cipherhandler"
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTTable } from "./jttable";

export interface buttonInfo {
    title: string,
    btnClass: string,
}

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
    state: ITestState = cloneObject(this.defaultstate) as IState
    cmdButtons: JTButtonItem[] = [
        { title: "New Test", color: "primary", id: "newtest", },
        { title: "Export Tests", color: "primary", id: "export", disabled: true, },
        { title: "Import Tests", color: "primary", id: "import", },
    ]
    restore(data: ITestState): void {
        let curlang = this.state.curlang
        this.state = cloneObject(this.defaultstate) as IState
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
        this.openXMLImport()
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
    addQuestionRow(table: JTTable, order: number, qnum: number, buttons: buttonInfo[], prevuse: any): void {
        let ordertext = "Timed"
        let extratext = ""
        if (order === -1) {
            extratext = "  When you have solved it, raise your hand so that the time can be recorded and the solution checked."
        } else {
            ordertext = String(order)
        }
        let row = table.addBodyRow().add(ordertext)
        if (order === -1 && qnum === -1) {
            row.add({ celltype: "td", settings: { colspan: 5 }, content: "No Timed Question" })
        } else {
            let state = this.getFileEntry(qnum)
            if (state === null) {
                state = { cipherType: ICipherType.None, points: 0, cipherString: "" }
            }
            let buttonset = $("<div/>", { class: "button-group round entrycmds" })
            for (let btninfo of buttons) {
                buttonset.append($("<button/>", { 'data-entry': order, type: "button", class: btninfo.btnClass + " button" })
                    .text(btninfo.title))
            }
            row.add(buttonset)
                .add(state.cipherType)
            if (prevuse !== undefined) {
                row.add(prevuse)
            }
            row.add(String(state.points))
                .add($("<span/>").html(state.question + extratext))
                .add(state.cipherString)
        }
        return
    }
    printTestAnswer(qnum: number, question: number, extraclass: string): JQuery<HTMLElement> {
        let state = this.getFileEntry(question)
        let result = $("<div>", { class: "question " + extraclass });
        let qtext = $("<div>", { class: "qtext" })
        if (qnum === -1) {
            qtext.append($("<span/>", { class: "timed" }).text("Timed Question"))
        } else {
            qtext.append($("<span>", { class: "qnum" }).text(String(qnum) + ")"))
        }
        qtext.append($("<span>", { class: "points" }).text(" [" + String(state.points) + " points] "))
        qtext.append($("<span/>", { class: "qbody" }).html(state.question))
        result.append(qtext)
        let cipherhandler = CipherPrintFactory(state.cipherType, state.curlang)
        cipherhandler.restore(state)
        let cipherans = cipherhandler.genAnswer()
        // let cipherans = $("<div/>", { class: "cipher" + state.cipherType })
        // cipherans.append($("<p/>", { class: "debug" }).text(state.cipherType))
        // cipherans.append($("<p/>", { class: "ciphertext" }).text(state.cipherString))
        // cipherans.append($("<p/>", { class: "debug" }).text("Answer Goes Here"))
        result.append(cipherans)
        return (result)
    }
    printTestQuestion(qnum: number, question: number, extraclass: string): JQuery<HTMLElement> {
        let state = this.getFileEntry(question)
        let result = $("<div>", { class: "question " + extraclass });
        let qtext = $("<div>", { class: "qtext" })
        if (qnum === -1) {
            qtext.append($("<span/>", { class: "timed" }).text("Timed Question"))
        } else {
            qtext.append($("<span>", { class: "qnum" }).text(String(qnum) + ")"))
        }
        qtext.append($("<span>", { class: "points" }).text(" [" + String(state.points) + " points] "))
        qtext.append($("<span/>", { class: "qbody" }).html(state.question))
        result.append(qtext)
        let cipherhandler = CipherPrintFactory(state.cipherType, state.curlang)
        cipherhandler.restore(state)
        let cipherans = cipherhandler.genQuestion()
        // let cipherans = $("<div/>", { class: "cipher" + state.cipherType })
        // cipherans.append($("<p/>", { class: "debug" }).text(state.cipherType))
        // cipherans.append($("<p/>", { class: "ciphertext" }).text(state.cipherString))
        // cipherans.append($("<p/>", { class: "debug" }).text("Question Goes Here"))
        result.append(cipherans)
        return (result)
    }
    /**
     * Compare two arbitrary objects to see if they are equivalent
     */
    public isEquivalent(a: any, b: any): boolean {
        // If the left side is blank or undefined then we assume that the
        // right side will be equivalent.  (This allows for objects which have
        // been extended with new attributes)
        if (a === '' || a === undefined) {
            return true
        }
        // If we have an object on the left, the right better be an object too
        if (typeof(a) === 'object') {
            if (typeof(b) !== 'object') {
                return false
            }
            // Both are objects, if any element of the object doesn't match
            // then they are not equivalent
            for (let elem of a) {
                if (!this.isEquivalent(a[elem], b[elem])) {
                    return false
                }
            }
            // They all matched, so we are equivalent
            return true
        }
        // Simple item, result is if they match
        return a === b
    }
    /**
     * Compare two saved cipher states to see if they are indeed identical
     */
    public isSameCipher(state1: IState, state2: IState): boolean {
        // Make sure every element in state1 that is non empty is also in state 2
        for (let elem in state1) {
            if (!this.isEquivalent(state1[elem], state2[elem])) {
                return false
            }
        }
        // And do the same for everything in reverse
        for (let elem in state2) {
            if (!this.isEquivalent(state2[elem], state1[elem])) {
                return false
            }
        }
        return true
    }
    // tslint:disable-next-line:cyclomatic-complexity
    public processTestXML(data: any): void {
        // Load in all the ciphers we know of so that we don't end up doing a duplicate
        let cipherCount = this.getCipherCount()
        let cipherCache: { [index: number]: IState } = {}
        let inputMap: NumberMap = {}
        for (let entry = 0; entry < cipherCount; entry++) {
            cipherCache[entry] = this.getFileEntry(entry)
        }
        // First we get all the ciphers defined and add them to the list of ciphers
        for (let ent in data) {
            let pieces = ent.split('.')
            // Make sure we have a valid object that we can bring in
            if ((pieces[0] === 'CIPHER') && // It is a cipher entry
                (typeof data[ent] === 'object') && // It is an object
                (data[ent].cipherType !== undefined) && // with a cipherType
                (data[ent].cipherString !== undefined) && // and a cipherString
                !(pieces[1] in inputMap)) {  // that we haven't seen before
                let oldPos = Number(pieces[1])
                let toAdd: IState = data[ent]
                let needNew = true
                // Now make sure that we don't already have this cipher loaded
                for (let oldEnt = 0; oldEnt < cipherCount; oldEnt++) {
                    if (this.isSameCipher(cipherCache[oldEnt], toAdd)) {
                        inputMap[String(oldPos)] = oldEnt
                        needNew = false
                        break
                    }
                }
                // If we hadn't found it, let's go ahead and add it
                if (needNew) {
                    let newval = this.setFileEntry(-1, toAdd)
                    cipherCache[newval] = toAdd
                    inputMap[String(oldPos)] = newval
                    cipherCount++
                }
            }
        }
        // Now that we have all the ciphers in, we can go back and add the tests
        for (let ent in data) {
            let pieces = ent.split('.')
            // Make sure we have a valid object that we can bring in
            if ((pieces[0] === 'TEST') && // It is a cipher entry
                (typeof data[ent] === 'object') && // It is an object
                (data[ent].title !== undefined) && // with a title
                (data[ent].timed !== undefined) && // with a timed question
                (data[ent].questions !== undefined)) {// and questions
                let newTest: ITest = data[ent]
                // Go through and fix up all the entries.  First the timed question
                if (newTest.timed !== -1 &&
                    inputMap[newTest.timed] !== undefined) {
                    newTest.timed = inputMap[newTest.timed]
                } else {
                    newTest.timed = -1
                }
                // and then all of the entries
                for (let entry = 0; entry < newTest.questions.length; entry++) {
                    if (inputMap[newTest.questions[entry]] !== undefined) {
                        newTest.questions[entry] = inputMap[newTest.questions[entry]]
                    } else {
                        newTest.questions[entry] = 0
                    }
                }
                // For good measure, just fix up the questions length
                newTest.count = newTest.questions.length
                this.setTestEntry(-1, newTest)
            }
        }
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
