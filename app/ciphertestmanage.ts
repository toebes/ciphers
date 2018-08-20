import { cloneObject } from "./ciphercommon";
import { IState } from "./cipherhandler"
import { CipherTest, ITestState } from "./ciphertest"
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTTable } from "./jttable";

/**
 * CipherTestManage
 *    This shows a list of all tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Test Packet> <Answer Key> Test Title  #questions
 *  The command buttons availableare
 *       <New Test><EXPORT><IMPORT>
 */
export class CipherTestManage extends CipherTest {
    defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.Test,
    }
    state: ITestState = cloneObject(this.defaultstate) as IState
    cmdButtons: JTButtonItem[] = [
        { title: "New Test", color: "primary", id: "newtest", },
        { title: "Export Tests", color: "primary", id: "export", download: true, },
        { title: "Import Tests from File", color: "primary", id: "import", },
        { title: "Import Tests from URL", color: "primary", id: "importurl", },
    ]
    restore(data: ITestState): void {
        let curlang = this.state.curlang
        this.state = cloneObject(this.defaultstate) as IState
        this.state.curlang = curlang
        this.copyState(this.state, data)
        /** See if we have to import an XML file */
        this.checkXMLImport()
        this.setUIDefaults()
        this.updateOutput()
    }
    updateOutput(): void {
        $('.testlist').each((i, elem) => {
            $(elem).replaceWith(this.genTestList())
        })
        this.attachHandlers()
    }
    genTestList(): JQuery<HTMLElement> {
        let result = $("<div/>", {class: "testlist"})
        let testcount = this.getTestCount()
        if (testcount === 0) {
            result.append($("<h3>").text("No Tests Created Yet"))
            return result
        }
        let table = new JTTable({ class: 'cell shrink testlist' })
        let row = table.addHeaderRow()
        row.add("Action")
            .add("Title")
            .add("Questions")

        for (let entry = 0; entry < testcount; entry++) {
            row = table.addBodyRow()
            let test = this.getTestEntry(entry)
            let questioncount = test.count
            if (test.timed !== undefined && test.timed >= 0) {
                questioncount++
            }
            let buttons = $("<div/>")
            buttons.append($("<a/>", { 'data-entry': entry, type: "button", class: "testedit button" }).text("Edit"))
            buttons.append($("<a/>", { 'data-entry': entry, type: "button", class: "testdel alert button" }).text("Delete"))
            buttons.append($("<a/>", { 'data-entry': entry, type: "button", class: "testprt button" }).text("Test Packet"))
            buttons.append($("<a/>", { 'data-entry': entry, type: "button", class: "testans button" }).text("Answer Key"))
            buttons.append($("<a/>", { 'data-entry': entry, type: "button", class: "testsols button" }).text("Answers and Solutions"))

            row.add(buttons)
                .add(test.title)
                .add(String(questioncount))
        }
        result.append(table.generate())
        return result
    }
    newTest(): void {
        this.setTestEntry(-1, { timed: -1, count: 0, questions: [], title: "New Test" })
        this.updateOutput()
    }
    exportAllTests(link: JQuery<HTMLElement>): void {
        let result = {}
        // Go through all of the questions and build a structure holding them
        let ciphercount = this.getCipherCount()
        for (let entry = 0; entry < ciphercount; entry++) {
            result['CIPHER.' + String(entry)] = this.getFileEntry(entry)
        }
        // Go through all the tests and build a structure holding them that we will convert to JSON
        let testcount = this.getTestCount()
        for (let testnum = 0; testnum < testcount; testnum++) {
            result['TEST.' + String(testnum)] = this.getTestEntry(testnum)
        }
        let blob = new Blob([JSON.stringify(result)], { type: "text/json" });
        let url = URL.createObjectURL(blob);

        link.attr('download', "cipher_tests.json")
        link.attr('href', url)
    }
    /**
     * Process imported XML
     */
    importXML(data: any): void {
        this.processTestXML(data)
        this.updateOutput()
    }
    importTests(useLocalData: boolean): void {
        this.openXMLImport(useLocalData)
    }
    deleteTest(test: number): void {
        this.deleteTestEntry(test)
        this.updateOutput()
    }
    attachHandlers(): void {
        super.attachHandlers()
        $("#newtest").off("click").on("click", (e) => {
            this.newTest()
        })
        $("#export").off("click").on("click", (e) => {
            this.exportAllTests($(e.target))
        })
        $("#import").off("click").on("click", (e) => {
            this.importTests(true)
        })
        $("#importurl").off("click").on("click", (e) => {
            this.importTests(false)
        })
        $(".testedit").off("click").on("click", (e) => {
            this.gotoEditTest(Number($(e.target).attr('data-entry')))
        })
        $(".testdel").off("click").on("click", (e) => {
            this.deleteTest(Number($(e.target).attr('data-entry')))
        })
        $(".testprt").off("click").on("click", (e) => {
            this.gotoPrintTest(Number($(e.target).attr('data-entry')))
        })
        $(".testans").off("click").on("click", (e) => {
            this.gotoPrintTestAnswers(Number($(e.target).attr('data-entry')))
        })
        $(".testsols").off("click").on("click", (e) => {
            this.gotoPrintTestSols(Number($(e.target).attr('data-entry')))
        })
    }
}
