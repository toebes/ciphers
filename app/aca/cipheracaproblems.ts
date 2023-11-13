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
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Generate Submission", color: "primary", id: "gensub" },
        { title: "See all Issues", color: "primary", id: "seeall" },
        { title: "Download Current Work", color: "primary", id: "export", download: true, },
        { title: "Import Saved Work", color: "primary", id: "importxml" },
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
        this.restoreCurrentTest()
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

        this.saveCurrentTest()

        let cipherCount = test.questions.length;

        let table = new JTTable({ class: "cell stack queslist" });
        let row = table.addHeaderRow();
        row.add("ID")
            .add("Action")
            .add("Status")
            .add("Type")
            .add("Title")
            .add("Cipher");

        for (let entry = 0; entry < cipherCount; entry++) {
            this.addProblemRow(table, entry, test.questions[entry], buttons);
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

        let state = this.getFileEntry(qnum);
        let qnumtxt = String(order)
        if (state.qnum !== undefined) {
            qnumtxt = state.qnum
        }
        row.add(qnumtxt);
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
            let title = btninfo.title
            let disabled = btninfo.disabled

            if (btninfo.btnClass === "entrysolve") {
                // See if we have a solver for this
                let solveURL = this.getSolveURL(state);
                if (solveURL === "") {
                    title = "No Solver";
                    disabled = true
                }
            }
            let button = $("<button/>", {
                "data-entry": qnum,
                type: "button",
                class: btninfo.btnClass + " button",
            }).html(title);



            if (disabled === true) {
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
    public exportCurrentIssue(link: JQuery<HTMLElement>): void {
        const test = this.getTestEntry(this.state.test);
        const blob = new Blob([this.generateTestJSON(test)], {
            type: 'text/json',
        });

        let url = URL.createObjectURL(blob);

        link.attr("download", test.title + '.json');
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
    public importData(useLocalData: boolean, useJSON: boolean): void {
        if (useJSON) {
            $('#xmlFile').attr('accept', '.json')
        } else {
            $('#xmlFile').attr('accept', '.txt')
        }
        this.openXMLImport(useLocalData);
    }
    /**
     * Process imported XML
     */
    public importXML(data: any): void {
        this.processTestXML(data);
        this.updateOutput();
    }
    /**
     * Process the imported file
     * @param reader File to process
     */
    public processImport(file: File): void {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (e): void => {
            try {
                const data = JSON.parse(e.target.result as string);
                this.processTestXML(data);
                $('#ImportFile').foundation('close');
            } catch (e) {
                $('#xmlerr').text(`Not a valid import file: ${e}`).show();
            }
        };
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
        location.assign("ACASubmit.html?test=" + String(this.state.test));
    }
    /**
     * Show the generated solution for submission
     */
    public gotoAllIssues(): void {
        location.assign("ACAManage.html");
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
        result
            .append(this.createEditCONDlg());
        return result;
    }


    public attachHandlers(): void {
        super.attachHandlers();
        $("#export")
            .off("click")
            .on("click", e => {
                this.exportCurrentIssue($(e.target));
            });
        $("#import")
            .off("click")
            .on("click", () => {
                this.importData(true, false);
            });
        $("#importxml")
            .off("click")
            .on("click", () => {
                this.importData(true, true);
            });
        $("#importurl")
            .off("click")
            .on("click", () => {
                this.importData(false, false);
            });
        $("#seeall")
            .off("click")
            .on("click", e => {
                this.gotoAllIssues();
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
