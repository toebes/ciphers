import { cloneObject } from "../common/ciphercommon";
import { CipherHandler, IState, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTTable } from "../common/jttable";

export interface ITestState extends IState {
    /** A URL to to import test date from on load */
    importURL?: string;
}
/**
 * Quote Analyzer
 */
export class CipherQuoteAnalyze extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: "",
        cipherType: ICipherType.None,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Import Quotes from File", color: "primary", id: "import" },
        { title: "Import Quotes from URL", color: "primary", id: "importurl" },
    ];
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
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        this.genLangDropdown(result);
        result.append($("<div/>", { class: "analysis", id: "quotes" }));
        return result;
    }
    public processTestXML(data: any): void {
        let table = new JTTable({ class: "cell shrink qtable" });
        table.addHeaderRow([
            "Length",
            "Chi-Squared",
            "Unique",
            "Likes",
            "Author",
            "Source",
            "Quote",
            "Use",
            "Test",
            "Question",
            "Count",
            "Notes",
        ]);
        // First we get all the ciphers defined and add them to the list of ciphers
        for (let ent of data) {
            console.log(ent);
            let teststr = ent.text;
            /* testStrings */
            let chi = this.CalculateChiSquare(teststr);
            teststr = this.cleanString(teststr);
            let minstr = this.minimizeString(teststr);
            let mina = minstr.split("");

            mina = mina.filter((x, i, a) => a.indexOf(x) === i);
            let unique = mina.length;
            let l = minstr.length;
            let likes = "";
            let author = "";
            let source = "";
            if (ent.likes !== undefined) {
                likes = ent.likes;
            }
            if (ent.author !== undefined) {
                author = ent.author;
            }
            if (ent.source !== undefined) {
                source = ent.source;
            }
            table
                .addBodyRow()
                .add(String(l)) /* Length */
                .add(String(chi)) /* Chi-Squared */
                .add(String(unique))
                .add(likes) /* Likes */
                .add(author) /* Author */
                .add(source) /* Source */
                .add(teststr) /* Quote */
                .add("") /* Use */
                .add("") /* Test */
                .add("") /* Question */
                .add("") /* Count */
                .add(""); /* Notes */
        }
        $("#quotes")
            .empty()
            .append(table.generate());
    }
    /*    Length	Chi-Squared	Likes	Author	Source	Quote	Use	Test	Question	Count	Notes */

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
     * Import Data from a file or URL
     * @param useLocalData true indicates import from a file
     */
    public importData(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $("#import")
            .off("click")
            .on("click", () => {
                this.importData(true);
            });
        $("#importurl")
            .off("click")
            .on("click", () => {
                this.importData(false);
            });
    }
}
