import { CipherTest, ITestState } from "./ciphertest"
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTTable } from "./jttable";

interface buttonInfo {
    title: string,
    btnClass: string,
}
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
    defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.None,
        test: 0,
    }
    state: ITestState = { ...this.defaultstate }
    cmdButtons: JTButtonItem[] = [
        { title: "Randomize Order", color: "primary", id: "randomize", },
        { title: "Print Test", color: "primary", id: "printtest", },
        { title: "Print Answers", color: "primary", id: "printans", },
        { title: "Export Test", color: "primary", id: "export", download: true, },
        { title: "Import Test", color: "primary", id: "import", disabled: true, },
    ]
    restore(data: ITestState): void {
        let curlang = this.state.curlang
        this.state = { ...this.defaultstate }
        this.state.curlang = curlang
        this.copyState(this.state, data)
        this.setUIDefaults()
        this.updateOutput()
    }
    addQuestionRow(table: JTTable, order: number, qnum: number, buttons: buttonInfo[]): void {
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
            let buttonset = $("<div/>", { class: "button-group round entrycmds" })
            for (let btninfo of buttons) {
                buttonset.append($("<button/>", { 'data-entry': order, type: "button", class: btninfo.btnClass + " button" })
                    .text(btninfo.title))
            }
            row.add(buttonset)
                .add(state.cipherType)
                .add(String(state.points))
                .add($("<span/>").html(state.question + extratext))
                .add(state.cipherString)
        }
        return
    }
    genPreCommands(): JQuery<HTMLElement> {
        let testcount = this.getTestCount()
        if (testcount === 0) {
            return $("<h3>").text("No Tests Created Yet")
        }
        if (this.state.test > testcount) {
            return ($("<h3>").text("Test not found"))
        }
        let test = this.getTestEntry(this.state.test)
        let result = $("<div>", { class: "precmds" })

        let table = new JTTable({ class: 'cell stack queslist' })
        let row = table.addHeaderRow()
        row.add("Question")
            .add("Action")
            .add("Type")
            .add("Points")
            .add("Question")
            .add("Cipher Text")
        let buttons: buttonInfo[] = [
            { title: "Edit", btnClass: "quesedit", },
            { title: "Remove", btnClass: "quesremove alert", },
        ]
        this.addQuestionRow(table, -1, test.timed, buttons)
        for (let entry = 0; entry < test.count; entry++) {
            this.addQuestionRow(table, entry + 1, test.questions[entry], buttons)
        }
        result.append(table.generate())
        return result
    }
    genPostCommands(): JQuery<HTMLElement> {
        let useditems: { [index: string]: boolean } = {}
        let test = this.getTestEntry(this.state.test)
        if (test.timed !== -1) {
            useditems[test.timed] = true
        }
        for (let entry of test.questions) {
            useditems[entry] = true
        }

        let result = $("<div>", { class: "postcmds" })

        let cipherCount = this.getCipherCount()
        let table = new JTTable({ class: 'cell stack queslist' })
        let row = table.addHeaderRow()
        row.add("Question")
            .add("Action")
            .add("Type")
            .add("Points")
            .add("Question")
            .add("Cipher Text")

        let buttons: buttonInfo[] = [
            { title: "Edit", btnClass: "entryedit", },
            { title: "Add", btnClass: "quesadd", },
            { title: "Set Timed", btnClass: "questime", },
        ]

        for (let entry = 0; entry < cipherCount; entry++) {
            if (!useditems[entry]) {
                this.addQuestionRow(table, entry, entry, buttons)
            }
        }
        result.append(table.generate())
        return result
    }
    exportTest(link: JQuery<HTMLElement>): void {
        let result = {}
        let test = this.getTestEntry(this.state.test)
        result['TEST.0'] = test

        if (test.timed !== -1) {
            result['CIPHER.' + String(test.timed)] = this.getFileEntry(test.timed)
        }
        for (let entry of test.questions) {
            result['CIPHER.' + String(entry)] = this.getFileEntry(entry)
        }
        let blob = new Blob([JSON.stringify(result)], { type: "text/json" });
        let url = URL.createObjectURL(blob);

        link.attr('download', "cipher_test.json")
        link.attr('href', url)
    }
    reloadPage(): void {
        $('.precmds').each((i, elem) => {
            $(elem).replaceWith(this.genPreCommands())
        })
        $('.postcmds').each((i, elem) => {
            $(elem).replaceWith(this.genPostCommands())
        })
        this.attachHandlers()
    }
    gotoAddCipher(entry: number): void {
        let test = this.getTestEntry(this.state.test)
        test.count++
        test.questions.push(entry)
        this.setTestEntry(this.state.test, test)
        this.reloadPage()
    }
    gotoSetTimedCipher(entry: number): void {
        let test = this.getTestEntry(this.state.test)
        test.timed = entry
        this.setTestEntry(this.state.test, test)
        this.reloadPage()
    }
    gotoEditTestCipher(entry: number): void {
        let test = this.getTestEntry(this.state.test)
        let editEntry = -1
        if (entry === -1) {
            editEntry = test.timed
        } else {
            entry--
            if (entry < test.count) {
                editEntry = test.questions[entry]
            }
        }
        if (editEntry !== -1) {
            this.gotoEditCipher(editEntry)
        }
    }
    gotoRemoveCipher(entry: number): void {
        let test = this.getTestEntry(this.state.test)
        if (entry === -1) {
            test.timed = -1
        } else {
            entry--
            if (entry < test.count) {
                test.questions.splice(entry, 1)
                test.count--
            }
        }
        this.setTestEntry(this.state.test, test)
        this.reloadPage()
    }
    /** From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array */
    shuffle(array: any[]): any[] {
        let currentIndex = array.length
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
    gotoRandomizeTest(): void {
        let test = this.getTestEntry(this.state.test)
        test.questions = this.shuffle(test.questions)
        this.setTestEntry(this.state.test, test)
        this.reloadPage()
    }
    attachHandlers(): void {
        super.attachHandlers()
        $("#export").off("click").on("click", (e) => {
            this.exportTest($(e.target))
        })
        $("#randomize").off("click").on("click", (e) => {
            this.gotoRandomizeTest()
        })
        $(".quesedit").off("click").on("click", (e) => {
            this.gotoEditTestCipher(Number($(e.target).attr('data-entry')))
        })
        $(".quesadd").off("click").on("click", (e) => {
            this.gotoAddCipher(Number($(e.target).attr('data-entry')))
        })
        $(".questime").off("click").on("click", (e) => {
            this.gotoSetTimedCipher(Number($(e.target).attr('data-entry')))
        })
        $(".quesremove").off("click").on("click", (e) => {
            this.gotoRemoveCipher(Number($(e.target).attr('data-entry')))
        })
    }

}
