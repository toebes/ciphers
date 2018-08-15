import { cloneObject, NumberMap, StringMap } from "./ciphercommon";
import { buttonInfo, CipherTest, ITestState } from "./ciphertest";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTTable } from "./jttable";

/**
 * CipherTestQuestions - This class handles all of the actions associated with
 * generating a printable test.
 *
 *  Displays a printable version of test <n> if it exists (default 0).
 *  Otherwise it provies a link back to TestManage.html
 */
export class CipherTestQuestions extends CipherTest {
    defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.Test,
        test: 0,
    }
    state: ITestState = cloneObject(this.defaultstate) as ITestState
    cmdButtons: JTButtonItem[] = [
        { title: "Export Problems", color: "primary", id: "export", download: true, },
        { title: "Import Problems", color: "primary", id: "import", },
    ]
    restore(data: ITestState): void {
        let curlang = this.state.curlang
        this.state = cloneObject(this.defaultstate) as ITestState
        this.state.curlang = curlang
        this.copyState(this.state, data)
        this.setUIDefaults()
        this.updateOutput()
    }
    updateOutput(): void {
        $('.precmds').each((i, elem) => {
            $(elem).replaceWith(this.genPreCommands())
        })
        $('.questions').each((i, elem) => {
            $(elem).replaceWith(this.genPostCommands())
        })
        this.attachHandlers()
    }
    genPostCommands(): JQuery<HTMLElement> {
        let testcount = this.getTestCount()
        let testuse: { [index: string] : JQuery<HTMLElement>} = {}
        let testNames: NumberMap = {}

        // Figure out what tests each entry is used with
        for (let testent = 0; testent < testcount; testent++) {
            let test = this.getTestEntry(testent)
            // Make sure we have a unique title for the test
            let title = test.title
            if (title === '') {
                title = "No Title"
            }
            if (testNames[title] !== undefined) {
                title += "." + testent
            }
            testNames[title] = testent
            // If we have a timed question, just put it in front of all the other questions
            // that we will process since we don't actually care about the order of the
            // questions, just which test it is used in
            if (test.timed !== -1) {
                test.questions.unshift(test.timed)
            }
            // Generate a clickable URL for each entry in the test
            for (let entry of test.questions) {
                if (entry in testuse) {
                    // If this is a subsequent entry, separate them with a comma
                    testuse[entry].append(", ")
                } else {
                    // For the first entry, we need a <div> to contain it all
                    testuse[entry] = $("<div/>")
                }
                testuse[entry].append($("<a>", {href: "TestGenerator.html?test=" + testent}).text(title))
            }
        }

        let result = $("<div>", { class: "questions" })

        let cipherCount = this.getCipherCount()
        let table = new JTTable({ class: 'cell stack queslist' })
        let row = table.addHeaderRow()
        row.add("Question")
            .add("Action")
            .add("Type")
            .add("Use")
            .add("Points")
            .add("Question")
            .add("Cipher Text")

        let buttons: buttonInfo[] = [
            { title: "Edit", btnClass: "entryedit", },
            { title: "Delete", btnClass: "entrydel", },
        ]

        for (let entry = 0; entry < cipherCount; entry++) {
            if (entry in testuse) {
                this.addQuestionRow(table, entry, entry, buttons, testuse[entry])
            } else {
                this.addQuestionRow(table, entry, entry, buttons, "")
            }
        }
        result.append(table.generate())
        return result
    }
    exportQuestions(link: JQuery<HTMLElement>): void {
        let result = {}
        let cipherCount = this.getCipherCount()
        for (let entry = 0; entry < cipherCount; entry++) {
            result['CIPHER.' + String(entry)] = this.getFileEntry(entry)
        }
        let blob = new Blob([JSON.stringify(result)], { type: "text/json" });
        let url = URL.createObjectURL(blob);

        link.attr('download', "cipher_questions.json")
        link.attr('href', url)
    }
    gotoDeleteCipher(entry: number): void {
        this.deleteFileEntry(entry)
        this.updateOutput()
    }
    importQuestions(): void {
        this.openXMLImport()
    }
    /**
     * Process imported XML
     */
    importXML(data: any): void {
        console.log("Importing XML")
        console.log(data)
        this.processTestXML(data)
        this.updateOutput()
    }
    attachHandlers(): void {
        super.attachHandlers()
        $("#export").off("click").on("click", (e) => {
            this.exportQuestions($(e.target))
        })
        $("#import").off("click").on("click", (e) => {
            this.importQuestions()
        })
        $(".entrydel").off("click").on("click", (e) => {
            this.gotoDeleteCipher(Number($(e.target).attr('data-entry')))
        })
    }
}
