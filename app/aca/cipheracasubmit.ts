import { cloneObject, padLeft } from "../common/ciphercommon";
import { menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { CipherTest, ITestState } from "./ciphertest";

/**
 * CipherTestQuestions - This manages all of the questions to allow deleting/importing/editing
 */
export class CipherACASubmit extends CipherTest {
    public activeToolMode: toolMode = toolMode.aca;
    public cmdButtons: JTButtonItem[] = [
        { title: "Edit Solutions", color: "primary", id: "probman" },
        { title: "See all Issues", color: "primary", id: "seeall" },
    ];
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.setUIDefaults();
        this.updateOutput();
    }
    public updateOutput(): void {
        this.setMenuMode(menuMode.aca);
        $(".precmds").each((i, elem) => {
            $(elem).replaceWith(this.genPreCommands());
        });
        $(".questions").each((i, elem) => {
            $(elem).replaceWith(this.genPostCommands());
        });
        this.attachHandlers();
    }
    /**
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "questions" });

        result.append(this.genACAProblemList());
        return result;
    }
    public genACAProblemList(): JQuery<HTMLElement> {
        let result = $("<div/>", {
            class: "sublist",
        }).append($("<div/>").text(" "));

        const testcount = this.getTestCount();
        if (testcount === 0) {
            result.append($('<h3>').text('No Issues Imported Yet'));
            return result;
        }

        if (this.state.test > testcount) {
            result.append($('<h3>').text('Issue not found'));
            return result;
        }

        const test = this.getTestEntry(this.state.test);

        let cipherCount = test.questions.length;


        let sols = { AA: 0, PP: 0, CC: 0, XX: 0, EE: 0, SS: 0, tot: 0 };
        let missed = {
            AA: false,
            PP: false,
            CC: false,
            XX: false,
            EE: false,
            SS: false,
            tot: false,
        };
        let mapsoltypes = { A: "AA", P: "PP", C: "CC", X: "XX", E: "EE" };


        for (let idx = 0; idx < cipherCount; idx++) {
            let entry = test.questions[idx]
            let state = this.getFileEntry(entry);
            if (state === null) {
                state = {
                    cipherType: ICipherType.None,
                    points: 0,
                    cipherString: "",
                };
            }
            let issolved = false;
            let soltext = "<<NOT SOLVED>>";
            if (state.solved !== undefined && state.solved) {
                issolved = true;
                soltext = state.solution;
            }
            let qnum = "UNKNOWN";
            if (state.question !== undefined && state.question !== "") {
                let parts = state.qnum.split(".");
                qnum = parts[0];
                let types = qnum.toUpperCase().split("-");
                let outtype = "SS";
                if (types[1] !== "SP") {
                    if (mapsoltypes[types[0]] !== undefined) {
                        outtype = mapsoltypes[types[0]];
                    }
                }
                if (issolved) {
                    sols[outtype]++;
                    sols["tot"]++;
                } else {
                    missed[outtype] = true;
                    missed["tot"] = true;
                }
            }
            result.append($("<div/>").text(qnum + " " + soltext));
        }
        // Now generate the solution count line
        // MA2017 AA PP CC XX EE SS Issue YTD
        // MiB *  *  * 8  5  0    64 149
        let titlestr = test.title + " ";
        let textstr = "<NOM HERE>";
        for (let t of ["AA", "PP", "CC", "XX", "EE", "SS", "tot"]) {
            if (t === "tot") {
                titlestr += " Issue";
                textstr += "   ";
            } else {
                titlestr += " " + t;
            }
            if (missed[t]) {
                textstr += padLeft(sols[t], 3);
            } else {
                textstr += "  *";
            }
        }
        titlestr += " YTD";
        textstr += " ???";
        result.prepend($("<div/>").text(textstr));
        result.prepend($("<div/>").text(titlestr));
        return result;
    }
    public gotoProblemManagement(): void {
        location.assign("ACAProblems.html?test=" + String(this.state.test));
    }
    /**
     * Show the generated solution for submission
     */
    public gotoAllIssues(): void {
        location.assign("ACAManage.html");
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $("#probman")
            .off("click")
            .on("click", () => {
                this.gotoProblemManagement();
            });
        $("#seeall")
            .off("click")
            .on("click", e => {
                this.gotoAllIssues();
            });
    }
}
