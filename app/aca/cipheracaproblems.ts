import "foundation-sites";
import { cloneObject } from "../common/ciphercommon";
import { menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTFDialog } from "../common/jtfdialog";
import { JTTable } from "../common/jttable";
import { buttonInfo, CipherTest, ITestState } from "./ciphertest";

/**
 * CipherTestQuestions - This manages all of the questions to allow deleting/importing/editing
 */
export class CipherACAProblems extends CipherTest {
    public activeToolMode: toolMode = toolMode.aca;
    public defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.Test,
        test: 0,
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [
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
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        this.setUIDefaults();
        this.updateOutput();
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
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

        let buttons: buttonInfo[] = [
            { title: "Solve", btnClass: "entrysolve" },
            { title: "Edit&nbsp;Solution", btnClass: "editsol" },
            { title: "Edit&nbsp;Title", btnClass: "editques" },
            { title: "Delete", btnClass: "alert entrydel" },
        ];
        result.append(this.genACAProblemTable(buttons));
        return result;
    }
    public genACAProblemTable(buttons: buttonInfo[]): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "questions" });

        let cipherCount = this.getCipherCount();
        let table = new JTTable({ class: "cell stack queslist" });
        let row = table.addHeaderRow();
        row.add("ID")
            .add("Action")
            .add("Status")
            .add("Type")
            .add("Title")
            .add("Cipher");

        for (let entry = 0; entry < cipherCount; entry++) {
            this.addProblemRow(table, entry, entry, buttons);
        }

        result.append(table.generate());
        return result;
    }
    /**
     * Generate another row for a CON in the table
     * @param table Table to add row to
     * @param order Order of the entry in the table
     * @param qnum The ID of the entry
     * @param buttons Buttons to associate with the entry
     */
    public addProblemRow(
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
        row.add(
            $("<div/>", {
                class: "grid-x",
            }).append(buttonset)
        );
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
                class: "callout small solinfo " + calloutclass,
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
                    class: "callout small solinfo " + calloutclass,
                }).text(state.solution)
            );
        } else {
            row.add($("<div/>").append(state.cipherString));
        }

        return;
    }
    /**
     * Make a link download the JSON for the problems
     * @param link <A> link to associate download with
     */
    public exportQuestions(link: JQuery<HTMLElement>): void {
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
    /**
     * Delete a cipher
     * @param entry Which CON to delete
     */
    public gotoDeleteCipher(entry: number): void {
        this.deleteFileEntry(entry);
        this.updateOutput();
    }
    /**
     * Import questions from a file or URL
     * @param useLocalData true indicates import from a file
     */
    public importQuestions(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    /**
     * Process imported XML
     */
    public importXML(data: any): void {
        console.log("Importing XML");
        console.log(data);
        this.processTestXML(data);
        this.updateOutput();
    }
    /**
     * Open a solving helper for a CON
     * @param entry Which cipher entry to open solver for
     */
    public gotoSolveCipher(entry: number): void {
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
    public editSolution(entry: number): void {
        let state = this.getFileEntry(entry);
        $("#sollabel").text("Solution");
        $("#editcondlg .dlgtitle").text("Update Solution");
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
                $("#editcondlg").foundation("close");
                this.updateOutput();
            });
        $("#editcondlg").foundation("open");
    }
    /**
     * Edit the manual title for a CON
     * @param entry Entry to edit
     */
    public editTitle(entry: number): void {
        let state = this.getFileEntry(entry);
        $("#sollabel").text("Title");
        $("#editcondlg .dlgtitle").text("Update Title");
        $("#soltext")
            .val(state.question)
            .off("input")
            .on("input", e => {
                $("#oksol").removeAttr("disabled");
            });
        $("#oksol")
            .off("click")
            .on("click", e => {
                state.question = $("#soltext").val() as string;
                this.setFileEntry(entry, state);
                $("#editcondlg").foundation("close");
                this.updateOutput();
            });
        $("#editcondlg").foundation("open");
    }
    /**
     * Show the generated solution for submission
     */
    public gotoGenerateSubmission(): void {
        location.assign("ACASubmit.html");
    }
    /**
     * This prompts a user and then deletes all ciphers
     */
    public gotoDeleteAllCiphers(): void {
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
     * Create the hidden dialog asking about deleting all problems
     * @returns HTML DOM Element for dialog
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
     * Create the hidden dialog for editing part of a CON
     */
    private createEditCONDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout success",
        }).append(
            $("<label/>")
                .append(
                    $("<span/>", {
                        id: "sollabel",
                    }).text("Solution")
                )
                .append(
                    $("<textarea/>", {
                        type: "text",
                        rows: 6,
                        id: "soltext",
                    })
                )
        );
        let editcondlg = JTFDialog(
            "editcondlg",
            "Update Solution",
            dlgContents,
            "oksol",
            "Update"
        );
        return editcondlg;
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
            .append(this.createEditCONDlg());
        return result;
    }

    public attachHandlers(): void {
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
        $(".editques")
            .off("click")
            .on("click", e => {
                this.editTitle(Number($(e.target).attr("data-entry")));
            });
        $("#gensub")
            .off("click")
            .on("click", e => {
                this.gotoGenerateSubmission();
            });
    }
}
