import { cloneObject } from "./ciphercommon";
import { menuMode, toolMode } from "./cipherhandler";
import { buttonInfo, CipherTest, ITestState } from "./ciphertest";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFDialog } from "./jtfdialog";
import { JTTable } from "./jttable";

/**
 * CipherTestQuestions - This manages all of the questions to allow deleting/importing/editing
 */
export class CipherACAProblems extends CipherTest {
    activeToolMode: toolMode = toolMode.aca;
    defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.Test,
        test: 0,
    };
    state: ITestState = cloneObject(this.defaultstate) as ITestState;
    cmdButtons: JTButtonItem[] = [
        {
            title: "Export Problems",
            color: "primary",
            id: "export",
            download: true,
        },
        { title: "Generate Submission", color: "primary", id: "gensub" },
        { title: "Import Problems from File", color: "primary", id: "import" },
        {
            title: "Import Problems from URL",
            color: "primary",
            id: "importurl",
        },
        { title: "Delete All Problems", color: "alert", id: "delall" },
    ];
    restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
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

        let buttons: buttonInfo[] = [
            { title: "Solve", btnClass: "entrysolve" },
            { title: "Delete", btnClass: "entrydel" },
            { title: "Edit Solution", btnClass: "editsol" },
        ];
        result.append(this.genACAProblemTable(buttons));
        return result;
    }
    genACAProblemTable(buttons: buttonInfo[]): JQuery<HTMLElement> {
        let result = $("<div>", { class: "questions" });

        let cipherCount = this.getCipherCount();
        let table = new JTTable({ class: "cell stack queslist" });
        let row = table.addHeaderRow();
        row.add("Question")
            .add("Action")
            .add("Status")
            .add("Type")
            .add("Question")
            .add("Cipher");

        for (let entry = 0; entry < cipherCount; entry++) {
            this.addProblemRow(table, entry, entry, buttons);
        }

        result.append(table.generate());
        return result;
    }
    addProblemRow(
        table: JTTable,
        order: number,
        qnum: number,
        buttons: buttonInfo[]
    ): void {
        let extratext = "";
        let row = table.addBodyRow();

        row.add(String(order));
        let state = this.getFileEntry(qnum);
        if (state === null) {
            state = {
                cipherType: ICipherType.None,
                points: 0,
                cipherString: "",
            };
        }
        let buttonset = $("<div/>", {
            class: "button-group round entrycmds",
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
        row.add(buttonset);
        let calloutclass = "";
        let statusmsg = "";
        if (state.solved !== undefined) {
            if (state.solved) {
                statusmsg = "Solved";
                calloutclass = "success";
            } else {
                statusmsg = "In Process";
                calloutclass = "primary";
            }
        }
        let status = $("");
        if (statusmsg !== "") {
            status = $("<div/>", {
                class: "callout small " + calloutclass,
            }).text(statusmsg);
        }
        row.add(status)
            .add(state.cipherType)
            .add(
                $("<span/>", {
                    class: "qtextentry",
                }).html(state.question + extratext)
            );
        // If they solved it, print out the solution, otherwise show them the problem
        if (state.solution !== undefined && state.solution !== "") {
            row.add(
                $("<div/>", {
                    class: "callout small " + calloutclass,
                }).text(state.solution)
            );
        } else {
            row.add($("<div/>").append(state.cipherString));
        }

        return;
    }
    exportQuestions(link: JQuery<HTMLElement>): void {
        let result = {};
        let cipherCount = this.getCipherCount();
        for (let entry = 0; entry < cipherCount; entry++) {
            result["CIPHER." + String(entry)] = this.getFileEntry(entry);
        }
        let blob = new Blob([JSON.stringify(result)], {
            type: "text/json",
        });
        let url = URL.createObjectURL(blob);

        link.attr("download", "aca_problems.json");
        link.attr("href", url);
    }
    gotoDeleteCipher(entry: number): void {
        this.deleteFileEntry(entry);
        this.updateOutput();
    }
    importQuestions(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    /**
     * Process imported XML
     */
    importXML(data: any): void {
        console.log("Importing XML");
        console.log(data);
        this.processTestXML(data);
        this.updateOutput();
    }
    gotoSolveCipher(entry: number): void {
        let state = this.getFileEntry(entry);
        let editURL = this.getSolveURL(state);
        if (editURL !== "") {
            if (editURL.indexOf("?") > -1) {
                editURL += "&editEntry=" + entry;
            } else {
                editURL += "?editEntry=" + entry;
            }
            location.assign(editURL);
        } else {
            alert("No solver found");
        }
    }
    /**
     * Edit the manual solution for an entry
     * @param entry Entry to edit
     */
    editSolution(entry: number): void {
        let state = this.getFileEntry(entry);
        $("#soltext")
            .val(state.solution)
            .off("input")
            .on("input", e => {
                $("#oksol").removeAttr("disabled");
            });
        $("#oksol")
            .off("click")
            .on("click", e => {
                state.solution = $("#soltext").val() as string;
                state.solved = state.solution !== "";
                this.setFileEntry(entry, state);
                $("#editsoldlg").foundation("close");
                this.updateOutput();
            });
        $("#editsoldlg").foundation("open");
    }
    /**
     * Show the generated solution for submission
     */
    gotoGenerateSubmission(): void {
        location.assign("ACASubmit.html");
    }
    /**
     * This prompts a user and then deletes all ciphers
     */
    gotoDeleteAllCiphers(): void {
        $("#okdel")
            .off("click")
            .on("click", e => {
                let cipherCount = this.getCipherCount();
                for (let entry = cipherCount - 1; entry >= 0; entry--) {
                    this.deleteFileEntry(entry);
                }
                $("#delalldlg").foundation("close");
                this.updateOutput();
            });
        $("#okdel").removeAttr("disabled");
        $("#delalldlg").foundation("open");
    }
    /**
     * Create the hidden dialog for selecting a cipher to open
     */
    private createDeleteAllDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout alert",
        }).text(
            "This will delete all loaded problems.  Are you sure you want to do this?"
        );
        let DeleteAllDlg = JTFDialog(
            "delalldlg",
            "Delete all Problems",
            dlgContents,
            "okdel",
            "Yes, Delete them!"
        );
        return DeleteAllDlg;
    }
    /**
     * Create the hidden dialog for selecting a cipher to open
     */
    private createEditSolDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout success",
        }).append(
            $("<label/>")
                .text("Solution")
                .append(
                    $("<textarea/>", { type: "text", rows: 6, id: "soltext" })
                )
        );
        let EditSolDlg = JTFDialog(
            "editsoldlg",
            "Update Solution",
            dlgContents,
            "oksol",
            "Update"
        );
        return EditSolDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     */
    public createMainMenu(): JQuery<HTMLElement> {
        let result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result
            .append(this.createDeleteAllDlg())
            .append(this.createEditSolDlg());
        return result;
    }

    attachHandlers(): void {
        super.attachHandlers();
        $("#export")
            .off("click")
            .on("click", e => {
                this.exportQuestions($(e.target));
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
        $("#delall")
            .off("click")
            .on("click", e => {
                this.gotoDeleteAllCiphers();
            });
        $(".entrydel")
            .off("click")
            .on("click", e => {
                this.gotoDeleteCipher(Number($(e.target).attr("data-entry")));
            });
        $(".entrysolve")
            .off("click")
            .on("click", e => {
                this.gotoSolveCipher(Number($(e.target).attr("data-entry")));
            });
        $(".editsol")
            .off("click")
            .on("click", e => {
                this.editSolution(Number($(e.target).attr("data-entry")));
            });
        $("#gensub")
            .off("click")
            .on("click", e => {
                this.gotoGenerateSubmission();
            });
    }
}
