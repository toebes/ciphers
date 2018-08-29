import { cloneObject } from "./ciphercommon";
import { menuMode, toolMode } from "./cipherhandler";
import { buttonInfo, CipherTest, ITestState } from "./ciphertest";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTTable } from "./jttable";

/**
 * CipherTestQuestions - This manages all of the questions to allow deleting/importing/editing
 */
export class CipherACASubmit extends CipherTest {
    activeToolMode: toolMode = toolMode.aca;
    cmdButtons: JTButtonItem[] = [
        { title: "Problems Management", color: "primary", id: "probman" },
    ];
    restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.setUIDefaults();
        this.updateOutput();
    }
    updateOutput(): void {
        this.setMenuMode(menuMode.aca);
        $(".precmds").each((i, elem) => {
            $(elem).replaceWith(this.genPreCommands());
        });
        $(".questions").each((i, elem) => {
            $(elem).replaceWith(this.genPostCommands());
        });
        this.attachHandlers();
    }
    genPostCommands(): JQuery<HTMLElement> {
        let result = $("<div>", { class: "questions" });

        result.append(this.genACAProblemList());
        return result;
    }
    genACAProblemList(): JQuery<HTMLElement> {
        let result = $("<div>", { class: "questions" });

        let cipherCount = this.getCipherCount();
        for (let entry = 0; entry < cipherCount; entry++) {
            result.append(this.genProblemSolution(entry));
        }

        return result;
    }
    genProblemSolution(entry: number): JQuery<HTMLElement> {
        let state = this.getFileEntry(entry);
        if (state === null) {
            state = {
                cipherType: ICipherType.None,
                points: 0,
                cipherString: "",
            };
        }
        let soltext = "<UNSOLVED>";
        if (state.solved !== undefined && state.solved) {
            soltext = state.solution;
        }
        let qnum = "UNKNOWN";
        if (state.question !== undefined && state.question !== "") {
            let parts = state.question.split(".");
            qnum = parts[0];
        }
        let result = $("<div/>").text(qnum + " " + soltext);
        return result;
    }
    gotoProblemManagement(): void {
        location.assign("ACAProblems.html");
    }
    attachHandlers(): void {
        super.attachHandlers();
        $("#probman")
            .off("click")
            .on("click", e => {
                this.gotoProblemManagement();
            });
    }
}
