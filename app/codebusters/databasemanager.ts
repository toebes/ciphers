import { QuoteRecord } from "../common/cipherhandler"
import { countHomonyms } from "../common/homonyms"

export interface DBTable {
    Table: IDBObjectStore
    Transaction: IDBTransaction
    // LengthIdx?: IDBIndex
    // Chi2Idx?: IDBIndex
    // GradeIdx?: IDBIndex
    // UniqueIdx?: IDBIndex
}

export interface QueryParms {
    len?: number[]
    chi2?: number[]
    grade?: number[]
    keywords?: string[]
    unique?: number[]
    homonyms?: number[]
    testUsage?: boolean
    start?: number
    limit?: number
}

export interface QuoteUpdates {
    [id: number]: QuoteRecord
}

export interface UsedIdMap {
    [index: number]: boolean;
}

export class DatabaseManager {
    static LocalDB: IDBOpenDBRequest = undefined

    static readonly DATABASE_VERSION = 4

    /**
    * Open a database and return a promise for the table
    * @param lang Language of the database to open
    * @returns Promise for the database table
    */
    public static openDatabase(lang: string, mode: IDBTransactionMode = "readonly"): Promise<DBTable> {
        return new Promise<DBTable>((resolve, reject) => {
            this.LocalDB = window.indexedDB.open("cipher_quotes", DatabaseManager.DATABASE_VERSION);
            this.LocalDB.onerror = (ev) => {
                reject(`Unable to open database: ${(ev.target as IDBOpenDBRequest).error}`)
            }
            this.LocalDB.onsuccess = (ev) => {
                const db = (ev.target as IDBOpenDBRequest).result;
                const transaction = db.transaction(lang, mode)
                if (transaction === undefined) {
                    reject(`Unable to open database: ${(ev.target as IDBOpenDBRequest).error}`)
                } else {
                    resolve({ Table: transaction.objectStore(lang), Transaction: transaction })
                }
            }
            this.LocalDB.onupgradeneeded = (ev) => {
                console.log('Database needs to be upgraded')

                const db = (ev.target as IDBOpenDBRequest).result;
                db.onerror = (evt) => { console.log(`Database error: ${(evt.target as IDBOpenDBRequest).error}`) }
                // Create an objectStore for this database
                this.CreateTableIfNeeded(db, "english")
                this.CreateTableIfNeeded(db, "spanish")
            }
        })
    }

    public static CreateTableIfNeeded(db: IDBDatabase, lang: string): void {
        if (!db.objectStoreNames.contains(lang)) {
            const Table = db.createObjectStore(lang, { keyPath: "id", autoIncrement: true });
            Table.createIndex('minquote', 'minquote', { unique: true });
            Table.createIndex('len', 'len')
            Table.createIndex('chi2', 'chi2')
            Table.createIndex('grade', 'grade')
            Table.createIndex('unique', 'unique')
        }
    }

    /**
     * Convert all undefined values in a range to the appropriate Infinity range
     * @param range Range to fix
     * @returns Updated range
     */
    public static fixRange(range: number[]): number[] {
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
    public static makeRange(rangeVals: number[]): IDBKeyRange {
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

    /**
     * Normalize all the parameters, setting ranges for any undefined values
     * @param parmsReq Parameters structure of limits on query
     * @returns Cleaned up set of parameters
     */
    public static cleanParms(parmsReq: QueryParms): QueryParms {
        const result: QueryParms = {}
        result.start = parmsReq.start ?? 0;
        result.limit = parmsReq.limit ?? 50;
        result.chi2 = this.fixRange(parmsReq.chi2)
        result.len = this.fixRange(parmsReq.len)
        result.grade = this.fixRange(parmsReq.grade)
        result.unique = this.fixRange(parmsReq.unique)
        result.homonyms = this.fixRange(parmsReq.homonyms)
        result.testUsage = parmsReq.testUsage
        // Copy over any keywords
        if (parmsReq.keywords !== undefined && parmsReq.keywords.length > 0) {
            result.keywords = parmsReq.keywords
        } else {
            result.keywords = undefined
        }
        return result
    }

    /**
     * Determine if a record matches the filter requirements
     * @param entry Entry to check
     * @param parms Limits to check entry against
     * @returns True if the record is a valid match
     */
    public static matchesRange(entry: QuoteRecord, parms: QueryParms): boolean {
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
        // If we have a keyword filter, see if any of the words appear in the quote or the notes.
        if (result && (parms.keywords !== undefined)) {
            let look = `${entry.quote} ${entry.notes}`.toLowerCase()
            result = false
            for (const keyword of parms.keywords) {
                if (look.includes(keyword)) {
                    result = true;
                    break;
                }
            }
        }
        // If we are also looking for homonyms, 
        if (result && (parms.homonyms !== undefined) && (parms.homonyms[0] > -Infinity)) {
            const homonymcount = countHomonyms(entry.quote)
            // If there were enough homonyms in the phrase we can keep it
            if (homonymcount < parms.homonyms[0]) {
                result = false;
            }
        }
        return result
    }

    /**
         * Search all entries which match a given set of criteria and call a processing routine for each matched entry
         * @param lang Language to search
         * @param parmsReq Filters to apply the the search
         * @param process Routine to process any matched records.  If this routine returns true, the search is ended early.
         * @returns Success/failure boolean.
         */
    public static async SearchEntriesWithRanges(lang: string, parmsReq: QueryParms, process: (rec: QuoteRecord) => boolean): Promise<boolean> {
        const parms = this.cleanParms(parmsReq)

        return new Promise<boolean>((resolve, reject) => {
            DatabaseManager.openDatabase(lang).then((db) => {
                try {
                    const transaction = db.Transaction
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
                                // if (current % 1000 === 0) {
                                //     console.log(`Checked ${current} entries, found ${entries.length} matches so far...`)
                                // }
                                // Are we past the ones we should skip? 
                                if (current >= parms.start) {
                                    // Yes, so remember it
                                    if (process(cursor.value))
                                        resolve(true)
                                }
                            }
                            cursor.continue();
                        } else {
                            // No more records, resolve the Promise
                            resolve(true);
                        }
                    };

                    cursorRequest.onerror = (event) => {
                        reject(`Error reading records: ${(event.target as IDBRequest).error}`);
                    };
                } catch (e) {
                    return resolve(false);
                }
            }).catch((_e) => { return resolve(false) });
        })
    }

    /**
     * Get all the entries which match a given range.
     * @param lang Language database to search
     * @param parmsReq Ranges of entries to filter against
     * @param limit Maximum number of entries to return
     * @returns Promise to array of QuoteRecords
     */
    public static async getEntriesWithRanges(lang: string, parmsReq: QueryParms, limit: number = 25): Promise<QuoteRecord[]> {
        const parms = this.cleanParms(parmsReq)

        return new Promise<QuoteRecord[]>((resolve, reject) => {

            const entries: QuoteRecord[] = [];
            this.SearchEntriesWithRanges(lang, parmsReq, (entry: QuoteRecord): boolean => {
                entries.push(entry);
                return (entries.length > limit);
            }).then((res: boolean) => {
                resolve(entries);
            }).catch((reason) => { reject(reason) });
        })
    }

    /**
     * Get a random set of entries which match a given criteria.
     * @param lang Language database to search
     * @param parmsReq Ranges of entries to filter against
     * @param limit Maximum number of entries to return
     * @returns Promise to array of QuoteRecords
     */
    public static async getRandomEntriesWithRanges(lang: string, parmsReq: QueryParms, usedmap: UsedIdMap, limit: number = 3): Promise<QuoteRecord[]> {
        const parms = this.cleanParms(parmsReq)

        return new Promise<QuoteRecord[]>((resolve, reject) => {

            const entries: QuoteRecord[] = [];
            const weights: number[] = [];
            let maxweight = -1;
            this.SearchEntriesWithRanges(lang, parmsReq, (entry: QuoteRecord): boolean => {
                if ((entry.testUsage === undefined || entry.testUsage === "") && usedmap[entry.id] !== true) {
                    const weight = Math.random()
                    if (entries.length < limit) {
                        entries.push(entry);
                        weights.push(weight);
                        if (weight > maxweight) {
                            maxweight = weight
                        }
                        return (false)
                    }
                    // We have more than the limit, so figure out which one to throw out (if any)
                    if (weight < maxweight) {
                        let toreplace = maxweight
                        maxweight = weight;
                        for (let i in entries) {
                            if (weights[i] === toreplace) {
                                // this is the one to replace
                                weights[i] = weight
                                entries[i] = entry
                                // Since we replaced an entry, don't search for another to replace (on the off chance we get two random numbers of the same value)
                                toreplace = -1;
                            } else {
                                if (weights[i] > maxweight) {
                                    maxweight = weights[i]
                                }
                            }
                        }
                    }
                }
                return (false);
            }).then((res: boolean) => {
                resolve(entries);
            }).catch((reason) => { reject(reason) });
        })
    }

    /**
     * Update a series of entries in the database
     * Primarily used to mark records as being used on a test
     * @param lang Language database to update
     * @param updatereq List of entries to be updated
     * @returns 
     */
    public static updateDBRecords(lang: string, updatereq: QuoteUpdates): Promise<boolean> {

        return new Promise<boolean>((resolve, reject) => {
            if (Object.keys(updatereq).length <= 0) {
                resolve(true);
                return;
            }
            this.openDatabase(lang, 'readwrite').then(async (db) => {
                const objectStore = db.Table;
                for (const id in updatereq) {
                    await this.updateDBRecord(objectStore, Number(id), updatereq[id])
                }
                resolve(true);
                return;
            })
        })

    }

    /**
     * Update a single record in the database.  Note that due to the oddities of the
     * indexeddb database, we have to find the record, make a copy of it, modify the copy, delete the
     * original record, remove the id from the new record and then add it back to the database.
     * @param objectStore Database to update the record
     * @param id Id of record to update
     * @param toUpdate New data to apply to the record
     * @returns 
     */
    public static updateDBRecord(objectStore: IDBObjectStore, id: number, toUpdate: QuoteRecord): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            // let cursorRequest: IDBRequest<IDBCursorWithValue>
            const idKey = IDBKeyRange.only(id)
            const cursorRequest = objectStore.openCursor(idKey)

            cursorRequest.onsuccess = (event) => {
                const cursor = cursorRequest.result;
                if (cursor) {
                    console.log(`Found Record at ${cursor.value.id}`)
                    const updateData = cursor.value;
                    for (let key in toUpdate) {
                        updateData[key] = toUpdate[key]
                    }
                    delete updateData['id']

                    const request = cursor.delete();
                    request.onsuccess = () => {
                        // Now we need to add it
                        const request = objectStore.add(updateData)
                        request.onsuccess = (event) => {
                            resolve(true)
                        }
                        request.onerror = (event) => {
                            reject(event);
                        }
                    };
                    request.onerror = (ev) => {
                        console.log(`Cursor delete failure`)
                        console.log(ev)
                        reject(ev)
                    }
                } else {
                    // No more records, resolve the Promise
                    resolve(true);
                }
            };

            cursorRequest.onerror = (event) => {
                reject(`Error reading records: ${(event.target as IDBRequest).error}`);
            };
        })
    }

}
