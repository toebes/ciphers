import { BoolMap, cloneObject } from '../common/ciphercommon';
import { CipherHandler, IState, ITestType, menuMode, QuoteRecord, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import * as XLSX from "xlsx";
import { AnyMap } from './cipherquotemanager';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { CipherTest, QuestionType } from './ciphertest';
import { htmlToElement } from '../common/htmldom';
import { CipherPrintFactory } from './cipherfactory';

export interface ITestState extends IState {
    /** A URL to to import test date from on load */
    importURL?: string;
}
const AllTestTypes = [
    ITestType.cregional,
    ITestType.cstate,
    ITestType.bregional,
    ITestType.bstate,
    ITestType.aregional,
    ITestType.astate,
] as const;
/**
 * Quote Analyzer
 */
export class CipherQuoteAnalyze extends CipherTest {
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
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
    }
    /**
     * Get question choices that are valid for a test type
     */
    public getValidTestTypes(entry: QuestionType): ITestType[] {
        const possibilities: ITestType[] = [];

        const cipherhandler = CipherPrintFactory(entry.cipherType, entry.lang);
        cipherhandler.setCipherType(entry.cipherType);
        if (entry.encodeType !== undefined) {
            cipherhandler.state.encodeType = entry.encodeType;
        }
        if (entry.operation !== undefined) {
            cipherhandler.state.operation = entry.operation;
        }
        if (entry.keyword !== undefined) {
            cipherhandler.state.keyword = entry.keyword;
        }
        if (entry.misspelled !== undefined) {
            cipherhandler.state.misspelled = entry.misspelled;
        }

        return AllTestTypes.filter((testType) => {
            if (entry.testtype !== undefined && !entry.testtype.includes(testType)) {
                return false;
            }

            return cipherhandler.CheckAppropriate(testType, false) === '';
        });
    }

    public isWithinRange(value: number, range: readonly number[] | undefined, required = false): boolean {
        if (range === undefined) {
            return !required;
        }

        return value >= range[0] && value <= range[1];
    }

    /**
     * Updates the stored state cipher string
     * @param cipherString Cipher string to set
     */
    public setCipherString(cipherString: string): boolean {
        if (this.state.cipherString === cipherString) {
            return false;
        }

        this.state.cipherString = cipherString;

        void this.loadLanguageDictionary(this.state.curlang).then(() => {
            const stats = this.analyzeQuote(cipherString);
            const result = $('.usage').empty();

            $('.difficulty')
                .text(`Length=${stats.len} Unique Letters=${stats.unique} χ²=${stats.chi2.toFixed(2)} Estimated Grade Level=${stats.grade}`)
                .addClass('callout secondary small');

            const table = new JTTable({
                class: 'qdist shrink cell',
            });

            const topRow = table.addHeaderRow();

            topRow.add({
                celltype: 'th',
                settings: { rowspan: 2 },
                content: 'Cipher Type',
            });

            topRow.add({
                celltype: 'th',
                settings: {
                    rowspan: 2,
                    class: 'divareg',
                },
                content: 'Division A',
            });

            topRow.add({
                celltype: 'th',
                settings: {
                    colspan: 2,
                    class: 'divbreg',
                },
                content: 'Division B',
            });

            topRow.add({
                celltype: 'th',
                settings: {
                    colspan: 2,
                    class: 'divcreg',
                },
                content: 'Division C',
            });

            const secondRow = table.addHeaderRow();

            const subheaders = [
                { className: 'divbreg', label: 'Regional' },
                { className: 'divbnat', label: 'State/Nat' },
                { className: 'divcreg', label: 'Regional' },
                { className: 'divcnat', label: 'State/Nat' },
            ];

            for (const subheader of subheaders) {
                secondRow.add({
                    celltype: 'th',
                    settings: { class: subheader.className },
                    content: subheader.label,
                });
            }

            const testColumns = [
                { testType: ITestType.aregional, className: 'divareg', },
                { testType: ITestType.bregional, className: 'divbreg', },
                { testType: ITestType.bstate, className: 'divbnat', },
                { testType: ITestType.cregional, className: 'divcreg', },
                { testType: ITestType.cstate, className: 'divcnat', },
            ] as const;

            const checkedTitles = new Set<string>();
            let foundChoice = false;

            for (const choice of this.questionChoices) {
                if (checkedTitles.has(choice.title)) {
                    continue;
                }

                checkedTitles.add(choice.title);

                if (!this.isWithinRange(stats.len, choice.len, true) ||
                    !this.isWithinRange(stats.chi2, choice.chi2) ||
                    !this.isWithinRange(stats.unique, choice.unique)
                ) {
                    continue;
                }
                const validTests = this.getValidTestTypes(choice);

                if (validTests.length === 0) {
                    continue;
                }

                foundChoice = true;

                const row = table.addBodyRow();
                row.add(choice.title);

                for (const column of testColumns) {
                    if (validTests.includes(column.testType)) {
                        row.add({
                            celltype: 'td',
                            settings: { class: column.className },
                            content: '✔',
                        });
                    } else {
                        row.add('')
                    }
                }
            }

            if (foundChoice) {
                result.append(table.generate());
            } else {
                result.append(
                    $('<h4/>').text(
                        'No ciphers found appropriate for this quote'
                    )
                );
            }
        });

        return true;
    }
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.  This returns the result
     * as the HTML to be displayed
     */
    public build(): JQuery<HTMLElement> {
        const result = $('<div/>');
        return result;
    }
    /**
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');

        this.setMenuMode(menuMode.test);
        this.genLangDropdown(result);

        const singlediv = $('<div/>', { class: 'callout primary' });
        singlediv.append(this.makeStepCallout('Single Quote Analysis',
            htmlToElement(
                `<p>Enter a single quote to determine all ciphers it is appropriate for.</p>`
            )))


        singlediv.append(
            JTFLabeledInput(
                'Plain Text',
                'textarea',
                'toencode',
                this.state.cipherString,
                'small-12 medium-12 large-12 encbox'
            )
        );
        singlediv.append($('<div/>', { class: 'difficulty' }));
        singlediv.append($('<div/>', { class: 'usage' }));
        result.append(singlediv);

        const batchdiv = $('<div/>', { class: 'callout primary' });
        batchdiv.append(this.makeStepCallout('Batch Quote Analysis',
            htmlToElement(
                `<p>Process a list of quotes to generate analysis for offline use. Documentation can be found 
                <a href='HowTo.html#QuoteAnalyzeFormat' target= 'new'>Here</a>.
                </p>`
            )))


        batchdiv.append($('<div/>', { class: 'analysis', id: 'quotes' }));
        result.append(batchdiv);

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
