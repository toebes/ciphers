import { cloneObject } from '../common/ciphercommon';
import { CipherHandler, IState, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { textStandard, textStandardRaw } from '../common/readability';

const DATABASE_VERSION = 3
export interface ITestState extends IState {
    /** A URL to to import test date from on load */
    importURL?: string;
}

export interface QuoteRecord {
    id?: number;
    quote: string;
    minquote?: string;
    chi2?: number;
    len?: number;
    grade?: number;
    unique?: number;
    author?: string;
    source?: string;
    translation?: string;
    testUsage?: string;
    notes?: string;
}

export interface DBTable {
    Table: IDBObjectStore
    LengthIdx?: IDBIndex
    Chi2Idx?: IDBIndex
    GradeIdx?: IDBIndex
    UniqueIdx?: IDBIndex
}
/**
 * Quote Analyzer
 */
export class CipherQuoteManager extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    public LocalDB: IDBOpenDBRequest = undefined
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
        this.openDatabase().then(() => {
            this.genLangDropdown(result);
            result.append($('<div/>', { class: 'analysis', id: 'quotes' }));
            result.append(
                $('<div/>', {
                    class: 'callout primary',
                }).append(
                    $('<a/>', {
                        href: 'HowTo.html#QuoteManagerFormat',
                        target: 'new',
                    }).text('Quote Analyzer File Documentation')
                )
            );
            // Let's dump the database
            this.EnglishTable.Table.openCursor().onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result
                if (cursor) {
                    console.log(cursor.value);
                    cursor.continue();
                }
            }
        }).catch((emsg) => {
            alert(`Unable to open database: ${emsg}`)
        })
        return result;
    }

    public createIndexes(db: IDBDatabase, name: string): DBTable {
        const Table = db.createObjectStore(name, { keyPath: "id", autoIncrement: true });
        db.onerror = (evt) => { console.log('DB ERROR'); console.log(evt) }
        return {
            Table: Table,
            LengthIdx: Table.createIndex('len', 'len'),
            Chi2Idx: Table.createIndex('chi2', 'chi2'),
            GradeIdx: Table.createIndex('grade', 'grade'),
            UniqueIdx: Table.createIndex('unique', 'unique')
        }
    }
    public openDatabase(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.LocalDB = window.indexedDB.open("cipher_quotes", DATABASE_VERSION);
            this.LocalDB.onerror = (ev) => {
                reject(`Unable to open database: ${(ev.target as IDBOpenDBRequest).error}`)
            }
            this.LocalDB.onsuccess = (ev) => {
                const db = (ev.target as IDBOpenDBRequest).result;
                const transaction = db.transaction(["english", "spanish"], "readwrite")
                this.EnglishTable = { Table: transaction.objectStore("english") }
                this.SpanishTable = { Table: transaction.objectStore("spanish") }
                resolve(true)
            }
            this.LocalDB.onupgradeneeded = (ev) => {
                console.log('Database needs to be upgraded')

                const db = (ev.target as IDBOpenDBRequest).result;
                db.onerror = (evt) => { console.log(`Database error: ${(evt.target as IDBOpenDBRequest).error}`) }

                // Create an objectStore for this database
                this.EnglishTable = this.createIndexes(db, 'english')
                this.SpanishTable = this.createIndexes(db, 'spanish')
            }
        })
    }
    public processTestXML(data: any[]): void {
        // Let us open our database

        // const table = new JTTable({ class: 'cell shrink qtable' });
        // table.addHeaderRow([
        //     'Length',
        //     'Chi-Squared',
        //     'Unique',
        //     'Grade Level',
        //     'Author',
        //     'Source',
        //     'Quote',
        //     'Notes',
        // ]);
        // First we get all the ciphers defined and add them to the list of ciphers
        for (const ent of data) {

            let quote = this.cleanString(ent.text)
            /* testStrings */
            const newRecord: QuoteRecord = {
                quote: quote,
                chi2: this.CalculateChiSquare(quote),
                grade: textStandardRaw(quote),
                minquote: this.minimizeString(quote),
            }
            let mina = newRecord.minquote.split('');
            mina = mina.filter((x, i, a) => a.indexOf(x) === i);
            newRecord.unique = mina.length;
            newRecord.len = newRecord.minquote.length
            if (ent.author !== undefined) {
                newRecord.author = ent.author
            }
            if (ent.source !== undefined) {
                newRecord.source = ent.source;
            }
            if (ent.notes !== undefined) {
                newRecord.notes = ent.notes;
            }
            if (ent.translation !== undefined) {
                newRecord.translation = ent.translation;
            }
            if (this.state.curlang === 'es') {
                this.SpanishTable.Table.add(newRecord)
            } else {
                console.log(newRecord)
                this.EnglishTable.Table.add(newRecord)
            }
            // table
            //     .addBodyRow()
            //     .add(String(newRecord.len)) /* Length */
            //     .add(String(newRecord.chi2)) /* Chi-Squared */
            //     .add(String(newRecord.unique))
            //     .add(String(newRecord.grade)) /* Grade level */
            //     .add(newRecord.author) /* Author */
            //     .add(newRecord.source) /* Source */
            //     .add(newRecord.quote) /* Quote */
            //     .add(newRecord.notes); /* Notes */
        }
        // $('#quotes')
        //     .empty()
        // .append(table.generate());
    }
    /**
     * Process imported XML
     */
    public importXML(data: any): void {
        console.log('Importing XML');
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
