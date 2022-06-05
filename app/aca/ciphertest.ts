import { cloneObject, NumberMap } from "../common/ciphercommon";
import {
    CipherHandler,
    IState,
    ITest,
    toolMode
} from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";

export interface buttonInfo {
    title: string;
    btnClass: string;
    disabled?: boolean;
}
export type sourceTestData = { [key: string]: IState | ITest };

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
export class CipherTest extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.None
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: "New Test", color: "primary", id: "newtest" },
        {
            title: "Export Tests",
            color: "primary",
            id: "export",
            disabled: true
        },
        { title: "Import Tests from File", color: "primary", id: "import" },
        { title: "Import Tests from URL", color: "primary", id: "importurl" }
    ];

    public restoreCurrentTest(): void {
        console.log(`restoreCurrentTest: ${this.state.test}`)
        if (this.state.test === undefined) {
            const teststr = this.getConfigString('aca_issue', '0')
            this.state.test = Number(teststr)
            console.log(`Set test to be ${this.state.test} from '${teststr}'`)
        }
    }

    public saveCurrentTest(): void {
        console.log(`saveCurrentTest: ${this.state.test}`)
        if (this.state.test !== undefined) {
            console.log(`Saving it!`)
            this.setConfigString('aca_issue', String(this.state.test))
        }
    }

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.setUIDefaults();
        this.updateOutput();
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
    public gotoEditTest(test: number): void {
        location.assign("ACAProblems.html?test=" + String(test));
    }
    public gotoEditCipher(entry: number): void {
        let entryURL = this.getEntryURL(entry);
        if (entryURL !== "") {
            location.assign(entryURL);
        } else {
            alert("No editor found");
        }
    }
    /**
     * generateTestData converts the current test information to a map which can be saved/restored later
     * @param test Test to generate data for
     * @returns string form of the JSON for the test
     */
    public generateTestData(test: ITest): sourceTestData {
        const result = {};
        result['TEST.0'] = test;

        if (test.timed !== -1) {
            result['CIPHER.' + String(test.timed)] = this.getFileEntry(test.timed);
        }
        for (const entry of test.questions) {
            result['CIPHER.' + String(entry)] = this.getFileEntry(entry);
        }
        return result;
    }
    /**
     * generateTestJSON converts the current test information to a JSON string
     * @param test Test to generate data for
     * @returns string form of the JSON for the test
     */
    public generateTestJSON(test: ITest): string {
        return JSON.stringify(this.generateTestData(test));
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
        console.log(data);
        // Load in all the ciphers we know of so that we don't end up doing a duplicate
        let cipherCount = this.getCipherCount();
        let cipherCache: { [index: number]: IState } = {};
        let inputMap: NumberMap = {};
        for (let entry = 0; entry < cipherCount; entry++) {
            cipherCache[entry] = this.getFileEntry(entry);
        }
        // First we get all the ciphers defined and add them to the list of ciphers
        for (let ent in data) {
            console.log(`Working on ${ent}`)
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
        console.log(`Found ${cipherCount} entries`)
        // Now that we have all the ciphers in, we can go back and add the tests
        for (let ent in data) {
            let pieces = ent.split(".");
            // Make sure we have a valid object that we can bring in
            if (
                pieces[0] === "TEST" &&
                typeof data[ent] === "object" &&
                data[ent].title !== undefined &&
                data[ent].questions !== undefined
            ) {
                console.log(`Found a test: ${ent}`)
                // It is a cipher entry // It is an object // with a title // with a timed question
                // and questions
                let newTest: ITest = data[ent];
                // Go through and fix up all the entries.  First the timed question
                newTest.timed = -1;
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
                console.log(`Finding test found ${testnum}`)
                if (testnum === -1) {
                    testnum = this.setTestEntry(-1, newTest);
                    console.log(`Stored test entry as ${testnum}`)
                }
                if (testnum !== -1) {
                    this.gotoEditTest(testnum);
                }
            }
        }
    }
    public attachHandlers(): void {
        super.attachHandlers();
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
    }
}
