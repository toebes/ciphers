import { cloneObject } from '../common/ciphercommon';
import { CipherHandler, IState, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
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
    Transaction: IDBTransaction
    // LengthIdx?: IDBIndex
    // Chi2Idx?: IDBIndex
    // GradeIdx?: IDBIndex
    // UniqueIdx?: IDBIndex
}
interface RangeQuery {
    len?: [number, number];     // Range for 'len' field
    chi2?: [number, number];    // Range for 'chi2' field
    grade?: [number, number];   // Range for 'grade' field
    unique?: [number, number];  // Range for 'unique' field
}

interface QueryParms {
    len?: number[]
    chi2?: number[]
    grade?: number[]
    unique?: number[]
    testUsage?: boolean
    start?: number
    limit?: number
}

export type KeyRangeMap = Record<string, IDBKeyRange>;

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
        this.genLangDropdown(result);
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

    public updateFilters(): void {
        let filter: QueryParms = {}
        filter.chi2 = this.getRanges('chi2')
        filter.len = this.getRanges('len')
        filter.grade = this.getRanges('grade')
        filter.unique = this.getRanges('unique')
        console.log("*****DUMPING")
        console.log(filter)
        let lang = "english"
        if (this.state.curlang === 'es') {
            lang = "spanish"
        }
        const target = $('.ans')
        target.empty()

        let table = new JTTable({ class: 'qmlist' })
        let header = table.addHeaderRow()
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
            target.append(table.generate())

        })
    }
    /**
     * 
     * @param lang 
     * @returns 
     */
    public openWriteDatabase(lang: string): Promise<DBTable> {
        return new Promise<DBTable>((resolve, reject) => {
            let result: DBTable = undefined
            this.LocalDB = window.indexedDB.open("cipher_quotes", DATABASE_VERSION);
            this.LocalDB.onerror = (ev) => {
                reject(`Unable to open database: ${(ev.target as IDBOpenDBRequest).error}`)
            }
            this.LocalDB.onsuccess = (ev) => {
                const db = (ev.target as IDBOpenDBRequest).result;
                const transaction = db.transaction(lang, "readwrite")
                resolve({ Table: transaction.objectStore(lang), Transaction: transaction })
            }
            this.LocalDB.onupgradeneeded = (ev) => {
                console.log('Database needs to be upgraded')

                const db = (ev.target as IDBOpenDBRequest).result;
                db.onerror = (evt) => { console.log(`Database error: ${(evt.target as IDBOpenDBRequest).error}`) }
                // Create an objectStore for this database
                const Table = db.createObjectStore(lang, { keyPath: "id", autoIncrement: true });
                Table.createIndex('len', 'len')
                Table.createIndex('chi2', 'chi2')
                Table.createIndex('grade', 'grade')
                Table.createIndex('unique', 'unique')
            }
        })
    }

    /**
     * Make a range that can be passed to IndexDB openCursor routines
     * From https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
     *       All keys ≥ x         IDBKeyRange.lowerBound(x)
     *       All keys > x         IDBKeyRange.lowerBound(x, true)
     *       All keys ≤ y         IDBKeyRange.upperBound(y)
     *       All keys < y         IDBKeyRange.upperBound(y, true)
     *       All keys ≥ x && ≤ y  IDBKeyRange.bound(x, y)
     *       All keys > x && < y  IDBKeyRange.bound(x, y, true, true)
     *       All keys > x && ≤ y  IDBKeyRange.bound(x, y, true, false)
     *       All keys ≥ x &&< y   IDBKeyRange.bound(x, y, false, true)
     *       The key = z          IDBKeyRange.only(z)
     * @param rangeVals Pair of range numbers.  Undefined for either is unlimited
     * @returns IDBKeyRange object that can be passed to openCursor
     */
    public makeRange(rangeVals: number[]): IDBKeyRange {
        let lower = rangeVals[0]
        let upper = rangeVals[1]
        // Do we have a lower bound?
        if (lower === -Infinity) {
            // No Lower bound, how about an upper bound?
            if (upper === Infinity) {
                // No bounds, so we just get everything
                return undefined
            }
            // Just an upper bound
            return IDBKeyRange.upperBound(upper)
        }
        // We have a lower bound, How about an upper bound too?
        if (upper === Infinity) {
            // No upper bound
            return IDBKeyRange.lowerBound(lower)
        }
        // We have a special case where both values are the same
        if (lower === upper) {
            return IDBKeyRange.only(lower)
        }
        // Otherwise we have an inclusive range for the lower/upper bounds
        return IDBKeyRange.bound(lower, upper)
    }
    public fixRange(range: number[]): number[] {
        if (range === undefined) {
            return [-Infinity, Infinity]
        }
        let lower = range[0] ?? -Infinity
        let upper = range[1] ?? Infinity
        if (lower <= upper) {
            return [lower, upper]
        }
        return [upper, lower]
    }
    public cleanParms(parmsReq: QueryParms): QueryParms {
        const result: QueryParms = {}
        result.start = parmsReq.start ?? 0;
        result.limit = parmsReq.limit ?? 50;
        result.chi2 = this.fixRange(parmsReq.chi2)
        result.len = this.fixRange(parmsReq.len)
        result.grade = this.fixRange(parmsReq.grade)
        result.unique = this.fixRange(parmsReq.unique)
        result.testUsage = parmsReq.testUsage
        return result
    }
    /**
     * 
     * @param lang 
     * @param parms 
     * @returns 
     */
    public async getEntriesWithRanges(lang: string, parmsReq: QueryParms): Promise<QuoteRecord[]> {
        const parms = this.cleanParms(parmsReq)
        return new Promise<QuoteRecord[]>((resolve, reject) => {
            const dbRequest = window.indexedDB.open("cipher_quotes", DATABASE_VERSION);

            dbRequest.onerror = (ev) => {
                reject(`Unable to open database: ${(ev.target as IDBOpenDBRequest).error}`);
            };

            dbRequest.onsuccess = (ev) => {
                const db = (ev.target as IDBOpenDBRequest).result;
                const transaction = db.transaction(lang, "readonly");
                const store = transaction.objectStore(lang);
                // Figure out what type of cursor we will have for 
                let cursorRequest: IDBRequest<IDBCursorWithValue>

                // We only get to use one key for IndexDB, so let's
                // pick the ones which are the most likely to filter down
                let idxname = 'len'
                let rangeType = this.makeRange(parms.len)
                if (rangeType === undefined) {
                    idxname = 'chi2'
                    rangeType = this.makeRange(parms.chi2)
                }
                if (rangeType === undefined) {
                    idxname = 'grade'
                    rangeType = this.makeRange(parms.grade)
                }
                if (rangeType === undefined) {
                    idxname = 'unique'
                    const rangeType = this.makeRange(parms.unique)
                }
                // If one of those succeeded then we open the index on that field
                if (rangeType !== undefined) {
                    const idx = store.index(idxname)
                    cursorRequest = idx.openCursor(rangeType)
                } else {
                    // Otherwise no filters, so just use the main cursor
                    cursorRequest = store.openCursor()
                }
                const entries: QuoteRecord[] = [];
                let current = -1;

                cursorRequest.onsuccess = (event) => {
                    const cursor = cursorRequest.result;
                    if (cursor) {
                        // See if this is a valid entry
                        if (this.matchesRange(cursor.value, parms)) {
                            // It matches, so see if we need to account for it
                            current++
                            // Are we past the ones we should skip? 
                            if (current >= parms.start) {
                                // Yes, so remember it
                                entries.push(cursor.value);
                                // See if we have gathered enough
                                if (entries.length >= parms.limit) {
                                    resolve(entries)
                                }
                            }

                        }
                        cursor.continue();
                    } else {
                        // No more records, resolve the Promise
                        resolve(entries);
                    }
                };

                cursorRequest.onerror = (event) => {
                    reject(`Error reading records: ${(event.target as IDBRequest).error}`);
                };
            };
        });
    }
    /**
     * Determine if a record matches the filter requirements
     * @param entry Entry to check
     * @param parms Limits to check entry against
     * @returns True if the record is a valid match
     */
    public matchesRange(entry: QuoteRecord, parms: QueryParms): boolean {
        let result = (entry.chi2 >= parms.chi2[0] && entry.chi2 <= parms.chi2[1] &&
            entry.len >= parms.len[0] && entry.len <= parms.len[1] &&
            entry.grade >= parms.grade[0] && entry.grade <= parms.grade[1] &&
            entry.unique >= parms.unique[0] && entry.unique <= parms.unique[1]
        )
        if (parms.testUsage !== undefined) {
            let used = entry.testUsage !== undefined && entry.testUsage !== ""
            if (parms.testUsage !== used) {
                result = false
            }
        }
        return result
    }

    // const query: RangeQuery = {
    //     len: [30, Infinity],     // 'len' greater than or equal to 30
    //     chi2: [0, 20],           // 'chi2' between 0 and 20
    //     grade: [-Infinity, 10],  // 'grade' less than or equal to 10
    //     unique: [5, Infinity]    // 'unique' greater than or equal to 5
    // };

    // getEntriesWithRanges('your-object-store-name', query)
    //     .then((entries) => {
    //         // Handle retrieved entries
    //     })
    //     .catch((error) => {
    //         // Handle errors
    //     });


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
        this.openWriteDatabase("english").then((db) => {
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
                    const request = db.Table.add(newRecord)
                    request.onsuccess = (event) => { console.log(`Success:`); console.log(event) }
                    request.onerror = (event) => { console.log(`Success:`); console.log(event) }
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
            db.Transaction.oncomplete = () => { console.log('Completed') }
        })
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
        $(".filterval")
            .off('change')
            .on('change', () => {
                this.updateFilters();
            })
    }
}



