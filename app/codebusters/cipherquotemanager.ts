import { cloneObject } from '../common/ciphercommon';
import { IState, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFDialog } from '../common/jtfdialog';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { textStandardRaw } from '../common/readability';
import { CipherTest, DBTable, QueryParms, QuoteRecord } from './ciphertest';
import * as XLSX from "xlsx";

export interface ITestState extends IState {
    /** A URL to to import test date from on load */
    importURL?: string;
}

export interface AnyMap {
    [index: string]: any;
}

/**
 * Quote Manager
 */
export class CipherQuoteManager extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public EnglishTable: DBTable
    public SpanishTable: DBTable
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.None,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Import Quotes from File', color: 'primary', id: 'import' },
        { title: 'Import Quotes from URL', color: 'primary', id: 'importurl' },
        { title: 'Delete all Quotes', color: 'alert', id: 'deleteall' }
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
        this.setMenuMode(menuMode.test);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     */
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result.append(this.createDeleteAllDlg());


        // const dbName = "cipher_quotes"; // Replace with your database name

        // const request = window.indexedDB.deleteDatabase(dbName);

        // request.onsuccess = (event) => {
        //     console.log("Database deleted successfully.");
        // };

        // request.onerror = (event) => {
        //     console.error("Error deleting database: " + (event.target as IDBRequest).error);
        // };
        return result;
    }
    /**
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        const radiobuttons = [
            { title: 'English', value: 'en' },
            { title: 'Spanish', value: 'es' },
        ];
        result.append(JTRadioButton(8, 'qlang', radiobuttons, this.state.curlang));
        const filterDiv = $('<div/>', { class: 'callout secondary' })
        result.append(filterDiv)
        filterDiv.append($('<p>').text('Filters'))
        const chiDiv = $("<div/>", { class: 'grid-x' })
        filterDiv.append(chiDiv)
        chiDiv.append(JTFLabeledInput('χ² >=', "number", "chi2lower", "", "filterval cell large-4 medium-6 small-12"))
        chiDiv.append(JTFLabeledInput('and <=', "number", "chi2upper", "", "filterval cell large-4 medium-6 small-12"))

        const lenDiv = $("<div/>", { class: 'grid-x' })
        filterDiv.append(lenDiv)
        lenDiv.append(JTFLabeledInput('Length >=', "number", "lenlower", "", "filterval cell large-4 medium-6 small-12"))
        lenDiv.append(JTFLabeledInput('and <=', "number", "lenupper", "", "filterval cell large-4 medium-6 small-12"))

        const gradeDiv = $("<div/>", { class: 'grid-x' })
        filterDiv.append(gradeDiv)
        gradeDiv.append(JTFLabeledInput('Grade >=', "number", "gradelower", "", "filterval cell large-4 medium-6 small-12"))
        gradeDiv.append(JTFLabeledInput('and <=', "number", "gradeupper", "", "filterval cell large-4 medium-6 small-12"))

        const uniqueDiv = $("<div/>", { class: 'grid-x' })
        filterDiv.append(uniqueDiv)
        uniqueDiv.append(JTFLabeledInput('Unique >=', "number", "uniquelower", "", "filterval cell large-4 medium-6 small-12"))
        uniqueDiv.append(JTFLabeledInput('and <=', "number", "uniqueupper", "", "filterval cell large-4 medium-6 small-12"))

        result.append($('<div/>', { class: 'analysis', id: 'quotes' }));
        result.append(
            $('<div/>', {
                class: 'callout primary',
            }).append(
                $('<a/>', {
                    href: 'HowTo.html#QuoteManagerFormat',
                    target: 'new',
                }).text('Quote File Documentation')
            )
        );
        this.updateFilters()
        return result;
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        JTRadioButtonSet('qlang', this.state.curlang);
        this.updateFilters();
        this.attachHandlers();
    }
    public getRanges(field: string): number[] {
        let result = [-Infinity, Infinity]
        let lower = $(`#${field}lower`).val() as string
        let upper = $(`#${field}upper`).val() as string
        if (lower !== '' && lower !== undefined) {
            result[0] = parseInt(lower)
        }
        if (upper !== '' && upper !== undefined) {
            result[1] = parseInt(upper)
        }
        return result
    }
    public setLang(lang: string) {
        if (this.state.curlang !== lang) {
            this.state.curlang = lang;
            this.updateOutput();
        }
    }

    public updateFilters(): void {
        let filter: QueryParms = {}
        filter.chi2 = this.getRanges('chi2')
        filter.len = this.getRanges('len')
        filter.grade = this.getRanges('grade')
        filter.unique = this.getRanges('unique')
        const lang = this.getLangString()

        const target = $('.sol')

        let table = new JTTable({ class: 'qmlist' })
        let header = table.addHeaderRow()
        header.add('Action')
        header.add('χ²')
        header.add('Length')
        header.add('Grade')
        header.add('Unique')
        header.add('Author')
        header.add('Quote')
        header.add('Test Usage')
        header.add('notes')
        if (lang !== 'english') {
            header.add('Translation')
        }
        this.getEntriesWithRanges(lang, filter).then((res) => {
            res.forEach((val) => {
                //console.log(val) 
                let row = table.addBodyRow()
                let btnGroup = $('<div/>', { class: 'button-group small round shrink' })
                const buttonEdit = $('<button/>', {
                    'data-entry': val.id,
                    type: 'button',
                    class: 'quotedit small button',
                }).text("Edit");
                const buttonDel = $('<button/>', {
                    'data-entry': val.id,
                    type: 'button',
                    class: 'quotdel small alert button',
                }).text("Delete");

                btnGroup.append(buttonEdit)
                btnGroup.append(buttonDel)
                row.add(btnGroup)
                row.add(String(val.chi2))
                row.add(String(val.len))
                row.add(String(val.grade))
                row.add(String(val.unique))
                row.add(val.author)
                row.add(val.quote)
                row.add(val.testUsage)
                row.add(val.notes)
                if (lang !== 'english') {
                    row.add(val.translation)
                }

            })
            target.empty()
            target.append(table.generate())
            this.attachHandlers();
        })
    }

    /**
     * Import the XML data into the database. 
     * Note that because a duplicate record may generate an error means that all of the
     * corresponding transactions will be abandoned.  For this reason we have to do each
     * insert as a separate database operation.
     * @param data Array of records to add
     */
    public processQuoteXML(data: AnyMap): void {
        const totalRecords = data.length;
        let currentIndex = 0;
        const processNextRecord = () => {
            if (currentIndex >= totalRecords) {
                this.updateFilters();
                return;
            }
            this.openDatabase(this.getLangString(), "readwrite").then((db) => {
                const ent = data[currentIndex]
                const newRecord: QuoteRecord = this.generateRecord(ent.text, ent.author, ent.source, ent.notes, ent.test, ent.translation);
                const request = db.Table.add(newRecord)
                request.onsuccess = (event) => {
                    currentIndex++;
                    processNextRecord();
                }
                request.onerror = (event) => {
                    console.log(`ERROR:`); console.log(event);
                    currentIndex++
                    processNextRecord()
                }
            })
        }
        processNextRecord()
    }
    /**
     * 
     * @param text 
     * @param author 
     * @param source 
     * @param notes 
     * @param translation 
     * @returns 
     */
    public generateRecord(text: string, author: string, source: string, notes: string, testUsage: string, translation: string) {
        let quote = this.cleanString(text);
        /* testStrings */
        const newRecord: QuoteRecord = {
            quote: quote,
            chi2: this.CalculateChiSquare(quote),
            grade: textStandardRaw(quote),
            minquote: this.minimizeString(quote),
        };
        let mina = newRecord.minquote.split('');
        mina = mina.filter((x, i, a) => a.indexOf(x) === i);
        newRecord.unique = mina.length;
        newRecord.len = newRecord.minquote.length;
        if (author !== undefined) {
            newRecord.author = author;
        }
        if (source !== undefined) {
            newRecord.source = source;
        }
        if (notes !== undefined) {
            newRecord.notes = notes;
        }
        if (translation !== undefined) {
            newRecord.translation = translation;
        }
        if (testUsage !== undefined) {
            newRecord.testUsage = testUsage;
        }
        return newRecord;
    }

    public processXLSX(workbook: XLSX.WorkBook) {
        // Make sure there was something to actually import
        if (workbook.SheetNames.length >= 1) {
            const sheetname = workbook.SheetNames[0];
            console.log(`Using data from ${sheetname}`)
            // console.log(workbook.Sheets[sheetname])

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
                        outrec.tranlation = val
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
        const reader = new FileReader();
        const name = file.name
        const extension = name.split('.').pop().toLowerCase()
        if (extension === 'json') {
            reader.onload = (e): void => {
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
            reader.onload = (e): void => {
                try {
                    var data = e.target.result;

                    var workbook = XLSX.read(data, { type: 'binary', cellFormula: false, cellHTML: false });
                    this.processXLSX(workbook)
                    console.log(workbook)
                    //this.importXML(result);
                    $('#ImportFile').foundation('close');
                } catch (e) {
                    $('#xmlerr').text(`Not a valid import file: ${e}`).show();
                }
            };
            reader.readAsBinaryString(file);
        }
    }
    /**
     * Process imported XML
     */
    public importXML(data: any): void {
        console.log('Importing XML');
        console.log(data);
        this.processQuoteXML(data);
        this.updateOutput();
    }
    public editQuote(qn: number): void {
        alert(`Editing ${qn}`)
    }


    public deleteAllQuotes(): void {
        this.openDatabase(this.getLangString(), "readwrite").then((db) => {
            db.Table.clear();
            db.Transaction.oncomplete = () => {
                this.updateFilters()
            }
        })
    }
    public deleteQuote(qn: number): void {
        // TODO: Ask them if they really want to delete it.
        this.openDatabase(this.getLangString(), "readwrite").then((db) => {
            db.Table.delete(qn)
            db.Transaction.oncomplete = () => {
                this.updateFilters()
            }
        })
    }
    /**
     * Import Data from a file or URL
     * @param useLocalData true indicates import from a file
     */
    public importData(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    /**
     * Create the hidden dialog for selecting a cipher to open
     */
    private createDeleteAllDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            class: 'callout alert',
        }).text(
            'This will delete all quotes from your local quote bank! ' +
            'This operation can not be undone. ' +
            'Please make sure you have saved a copy in case you need them. ' +
            '  Are you sure you want to do this?'
        );
        const DeleteAllDlg = JTFDialog(
            'delalldlg',
            'Delete all Quotes',
            dlgContents,
            'okdel',
            'Yes, Delete them!'
        );
        return DeleteAllDlg;
    }

    /*
     * This prompts a user and then deletes all cquotes
     */
    public gotoDeleteAllQuotes(): void {
        $('#okdel')
            .off('click')
            .on('click', (e) => {
                this.deleteAllQuotes();
                $('#delalldlg').foundation('close');
                this.updateOutput();
            });
        $('#okdel').removeAttr('disabled');
        $('#delalldlg').foundation('open');
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
        $(".filterval")
            .off('change')
            .on('change', () => {
                this.updateFilters();
            })
        $(".quotedit")
            .off('click')
            .on('click', (e) => {
                this.editQuote(Number($(e.target).attr('data-entry')));
            })
        $(".quotdel")
            .off('click')
            .on('click', (e) => {
                this.deleteQuote(Number($(e.target).attr('data-entry')));

            })
        $('#deleteall')
            .off('click')
            .on('click', (e) => {
                this.gotoDeleteAllQuotes();
            });
        $('[name="qlang"]')
            .off('click')
            .on('click', (e) => {
                $(e.target)
                    .siblings()
                    .removeClass('is-active');
                $(e.target).addClass('is-active');
                this.setLang($(e.target).val() as string);
            });

    }
}



