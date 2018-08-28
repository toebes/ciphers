import { cloneObject } from "./ciphercommon";
import { menuMode, toolMode } from "./cipherhandler";
import { buttonInfo, CipherTest, ITestState } from "./ciphertest";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";

/**
 * CipherTestQuestions - This manages all of the questions to allow deleting/importing/editing
 */
export class CipherTestQuestions extends CipherTest {
    activeToolMode: toolMode = toolMode.codebusters;

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
        { title: "Import Problems from File", color: "primary", id: "import" },
        {
            title: "Import Problems from URL",
            color: "primary",
            id: "importurl",
        },
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
        this.setMenuMode(menuMode.test);
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
            { title: "Edit", btnClass: "entryedit" },
            { title: "Delete", btnClass: "entrydel" },
        ];
        result.append(this.genQuestionTable(undefined, buttons));
        return result;
    }
    exportQuestions(link: JQuery<HTMLElement>): void {
        let result = {};
        let cipherCount = this.getCipherCount();
        for (let entry = 0; entry < cipherCount; entry++) {
            result["CIPHER." + String(entry)] = this.getFileEntry(entry);
        }
        let blob = new Blob([JSON.stringify(result)], { type: "text/json" });
        let url = URL.createObjectURL(blob);

        link.attr("download", "cipher_questions.json");
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
        $(".entrydel")
            .off("click")
            .on("click", e => {
                this.gotoDeleteCipher(Number($(e.target).attr("data-entry")));
            });
    }
}
