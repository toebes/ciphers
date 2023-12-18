import { cloneObject } from '../common/ciphercommon';
import { CipherHandler, IState, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import * as XLSX from "xlsx";
import { AnyMap } from './cipherquotemanager';

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
        cipherString: '',
        cipherType: ICipherType.None,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Import Quotes from File', color: 'primary', id: 'import' },
        { title: 'Import Quotes from URL', color: 'primary', id: 'importurl' },
    ];
    public checkXMLImport(): void {
        if (this.state.importURL !== undefined) {
            if (this.state.importURL !== '') {
                const url = this.state.importURL;
                $.getJSON(url, (data) => {
                    this.importXML(data);
                }).fail(() => {
                    alert('Unable to load file ' + url);
                });
            }
        }
    }
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
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
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genLangDropdown(result);
        result.append($('<div/>', { class: 'analysis', id: 'quotes' }));
        result.append(
            $('<div/>', {
                class: 'callout primary',
            }).append(
                $('<a/>', {
                    href: 'HowTo.html#QuoteAnalyzeFormat',
                    target: 'new',
                }).text('Quote Analyzer File Documentation')
            )
        );

        return result;
    }
    /**
     * Compute the stats for all the quotes loaded and display them in a table
     * @param data Quote data
     */
    public processQuoteXML(data: any): void {
        const table = new JTTable({ class: 'cell shrink qtable' });
        table.addHeaderRow([
            'Length',
            'Chi-Squared',
            'Unique',
            'Grade Level',
            'RecommendedScore',
            'Minscore',
            'Maxscore',
            'Author',
            'Source',
            'Quote',
            'Notes',
        ]);
        // First we get all the ciphers defined and add them to the list of ciphers
        for (const ent of data) {
            let author = '';
            let source = '';
            let notes = '';
            const qrecord = this.computeStats(this.state.curlang, ent.text);

            // Now we compute the 
            if (ent.author !== undefined) {
                author = ent.author;
            }
            if (ent.source !== undefined) {
                source = ent.source;
            }
            if (ent.notes !== undefined) {
                notes = ent.notes;
            }
            table
                .addBodyRow()
                .add(String(qrecord.len)) /* Length */
                .add(String(qrecord.chi2)) /* Chi-Squared */
                .add(String(qrecord.unique))
                .add(String(qrecord.grade)) /* Grade level */
                .add(String(qrecord.recommendedScore))
                .add(String(qrecord.minscore))
                .add(String(qrecord.maxscore))
                .add(author) /* Author */
                .add(source) /* Source */
                .add(ent.text) /* Quote */
                .add(notes)
        }
        $('#quotes')
            .empty()
            .append(table.generate());
    }
    /**
     * Process imported spreadsheet
     * @param workbook XLSX Workbook
     */
    public processXLSX(workbook: XLSX.WorkBook) {
        // Make sure there was something to actually import
        if (workbook.SheetNames.length >= 1) {
            // We will only use the first named sheet
            const sheetname = workbook.SheetNames[0];

            const jsondata = XLSX.utils.sheet_to_json<AnyMap>(workbook.Sheets[sheetname])
            const entries: any[] = [];
            for (let rec of jsondata) {
                let outrec: any = {}
                for (let key in rec) {
                    const val = rec[key];
                    const lckey = key.toLowerCase();
                    if (lckey === 'text' || lckey === 'quote') {
                        outrec.text = val
                    } else if (lckey === 'author') {
                        outrec.author = val
                    } else if (lckey === 'test') {
                        outrec.test = val
                    } else if (lckey === 'source') {
                        outrec.source = val
                    } else if (lckey === 'notes') {
                        outrec.notes = val
                    } else if (lckey === 'translation') {
                        outrec.translation = val
                    }
                }
                entries.push(outrec)
            }
            this.processQuoteXML(entries);
        }
    }
    /**
     * Process the imported file
     * @param reader File to process
     */
    public processImport(file: File): void {
        this.loadLanguageDictionary(this.state.curlang).then((res) => {
            const reader = new FileReader();
            const name = file.name
            const extension = name.split('.').pop().toLowerCase()
            if (extension === 'json') {
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result as string);
                        this.importXML(data);
                        $('#ImportFile').foundation('close');
                    } catch (e) {
                        $('#xmlerr').text(`Not a valid import file: ${e}`).show();
                    }
                }
                reader.readAsText(file);
            } else {
                reader.onload = (e) => {
                    try {
                        var data = e.target.result;

                        var workbook = XLSX.read(data, { type: 'binary', cellFormula: false, cellHTML: false });
                        this.processXLSX(workbook)
                        $('#ImportFile').foundation('close');
                    } catch (e) {
                        $('#xmlerr').text(`Not a valid import file: ${e}`).show();
                    }
                };
                reader.readAsBinaryString(file);
            }
        })
    }
    /**
     * Process imported XML
     */
    public importXML(data: any): void {
        this.processQuoteXML(data);
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
        $('#import')
            .off('click')
            .on('click', () => {
                this.importData(true);
            });
        $('#importurl')
            .off('click')
            .on('click', () => {
                this.importData(false);
            });
    }
}
