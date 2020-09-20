import "foundation-sites";
import { cloneObject } from "../common/ciphercommon";
import { menuMode, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTFDialog } from "../common/jtfdialog";
import { buttonInfo, CipherTest, ITestState } from "./ciphertest";

/**
 * CipherTestQuestions - This manages all of the questions to allow deleting/importing/editing
 *  *
 *  TestQuestions.html
 *    This shows all the questions available
 *      Action         Type     Points     Question   Cipher Text
 *      <EDIT><DELETE> <type>   <points>   <question> <ciphertext>
 *  The command buttons available are
 *      <EXPORT><IMPORT><DELETE ALL PROBLEMS>
 *
 */
export class CipherTestQuestions extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;

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
    public restore(data: ITestState, suppressOutput: boolean = false): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
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
            { title: "Edit", btnClass: "entryedit" },
            { title: "Delete", btnClass: "entrydel alert" },
        ];
        result.append(this.genQuestionTable(undefined, buttons));
        return result;
    }
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

        link.attr("download", "cipher_questions.json");
        link.attr("href", url);
    }
    public gotoDeleteCipher(entry: number): void {
        this.deleteFileEntry(entry);
        this.updateOutput();
    }
    public importQuestions(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
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
     * Create the hidden dialog for selecting a cipher to open
     */
    private createDeleteAllDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout alert",
        }).text(
            "This will delete all questions! " +
            "This operation can not be undone. " +
            "Please make sure you have saved a copy in case you need them. " +
            "  Are you sure you want to do this?"
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
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     */
    public createMainMenu(): JQuery<HTMLElement> {
        let result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result.append(this.createDeleteAllDlg());
        return result;
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
        $(".entrydel")
            .off("click")
            .on("click", e => {
                this.gotoDeleteCipher(Number($(e.target).attr("data-entry")));
            });
        $("#delall")
            .off("click")
            .on("click", e => {
                this.gotoDeleteAllCiphers();
            });
    }
}
