import { cloneObject, makeCallout, NumberMap, StringMap } from '../common/ciphercommon';
import {
    CipherHandler,
    IRunningKey,
    IState,
    ITest,
    ITestType,
    toolMode,
    IQuestionData,
    ITestQuestionFields,
    QuoteRecord,
} from '../common/cipherhandler';
import { getCipherTitle, ICipherType } from '../common/ciphertypes';
import { countHomonyms } from '../common/homonyms';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { IEncoderState } from './cipherencoder';
import { CipherPrintFactory } from './cipherfactory';

const DATABASE_VERSION = 4

export interface SortableEntry {
    weight: number;
    entry: number;
    cipherType: string;
}

export interface buttonInfo {
    title: string;
    btnClass: string;
    disabled?: boolean;
}

export interface UsedIdMap {
    [index: number]: boolean;
}

export type modelID = string;
export type IRealtimeObject = 'sourcemodel' | 'testmodel' | 'answertemplate' | 'answeraudit'; //| 'answermodel'
export type IRealtimeFields = 'testid' | 'sourceid' | 'answerid' | 'title' | 'questions';
export interface IRealtimeMetaData {
    id: modelID;
    type: IRealtimeObject;
    testid: modelID;
    sourceid: modelID;
    answerid: modelID;
    title: string;
    questions: number;
    dateCreated: number;
    createdBy: string;
}
export type sourceTestData = { [key: string]: IState | ITest };
export interface SourceModel {
    // Model id of the test model
    testid?: modelID;
    // Model id of the answer template
    answerid?: modelID;
    // User id of the person creating the test
    creator?: string;
    // Number of teams taking this test on Scilympiad - 0 or undefined means it is not
    // using that platform
    sciTestCount?: number;
    // Time test is scheduled to start on Scilympiad
    sciTestTime?: number;
    // Length of the test on Scilympiad
    sciTestLength?: number;
    // Amount of time for the timed question on Scilympiad
    sciTestTimed?: number;
    // The Scilympiad ID associated with the test
    sciTestId?: string;
    // The source for the test.  This is a set of mapped elements where 
    //  .source['TEST.0']  is the test information
    //  .source['CIPHER.x'] is the individual cipher questions.
    source?: sourceTestData;
}

export const globalPermissionId = 'GLOBAL';
/**
 * Permissions for a single item
 * Read - Access to view the model
 * Write - Permission to change the model (or delete self permissions)
 * Remove - Permission to delete the object
 * Manage - Permission to set permission for other users on the model
 */
export interface RealtimeSinglePermission {
    read: boolean;
    write: boolean;
    remove: boolean;
    manage: boolean;
}

/**
 * Permissions for an element.  The string GLOBAL is associated with
 * overall permissions for everyone to use.
 */
export interface RealtimePermissionSet {
    [index: string]: RealtimeSinglePermission;
}

export interface ITestState extends IState {
    /** Number of points a question is worth */
    points?: number;
    /** Which test the handler is working on */
    test?: number;
    /** Show the solutions on the answers */
    sols?: string;
    /** A URL to to import test date from on load */
    importURL?: string;
    /** UID of the interactive test to run  */
    testID?: string;
    /** JWT for authenticating a user */
    jwt?: string;
    /** Flag to not score results for use during national test to track OBT */
    preResults?: string;
    /** Extra request for what is being uploaded from the test */
    request?: string;
    /** nonblank indicates it was launched from scilympiad */
    scilympiad?: string;
    /** token for uploading test images */
    imageUploadToken?: string;
    /** Show Tiny answerkey */
    tiny?: string;
    /** Show the resource sheet */
    ressheet?: string;
}

interface INewCipherEntry {
    cipherType: ICipherType;
    /** Optional language string */
    lang?: string;
    /** Optional title to override the default title */
    title?: string;
}

export interface ITestTypeInfo {
    title: string;
    type: ITestType;
    id: string;
}

export interface ITestUser {
    userid: string;
    displayname?: string;
    starttime?: number;
    idletime?: number;
    confidence?: number[];
    notes?: string;
    sessionid?: string;
}
export interface IAnswerTemplate {
    testid: string;
    starttime: number;
    endtime: number;
    endtimed: number;
    answers: ITestQuestionFields[];
    assigned: ITestUser[];
    teamname: string;
    teamtype: string;
}

export interface IAnswerAudit {
    testid: string;
    user: string;
    time: number;
    answers: StringMap;
    answermodelid: string;
}

export type ITestDisp = 'testedit' | 'testprint' | 'ressheet' | 'testans' | 'testanstiny' | 'testsols' | 'testint';
export type ITestManage = 'local' | 'published';

export interface QuoteUpdates {
    [id: number]: QuoteRecord
}

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

export type KeyRangeMap = Record<string, IDBKeyRange>;

/**
 * Base support for all the test generation handlers
 */
export class CipherTest extends CipherHandler {

    public readonly cipherSubTypes = [
        'Aristocrat',
        'Patristocrat',
        'Xenocrypt',
        'Baconian',
        'Table',
        'Math',
        'Morse',
        'Transposition',
        'DancingMen',
        'PigPen',
        'KnightsTemplar',
        'TapCode',
        'Other'
    ];
    public mapCipherSubType = new Map<ICipherType, string>([
        [ICipherType.Aristocrat, 'Aristocrat'],
        [ICipherType.Baconian, 'Baconian'],
        [ICipherType.Checkerboard, 'Table'],
        [ICipherType.Porta, 'Table'],
        [ICipherType.Hill, 'Math'],
        [ICipherType.NihilistSubstitution, 'Math'],
        [ICipherType.Patristocrat, 'Patristocrat'],
        [ICipherType.Cryptarithm, 'Math'],
        [ICipherType.FractionatedMorse, 'Morse'],
        [ICipherType.Pollux, 'Morse'],
        [ICipherType.Morbit, 'Morse'],
        [ICipherType.Railfence, 'Transposition'],
        [ICipherType.CompleteColumnar, 'Transposition'],
        [ICipherType.Affine, 'Math',],
        [ICipherType.Caesar, 'Table',],
        [ICipherType.DancingMen, 'DancingMen',],
        [ICipherType.Atbash, 'Table',],
        [ICipherType.Vigenere, 'Table',],
        [ICipherType.RunningKey, 'Other',],
        [ICipherType.RSA, 'Other',],
        [ICipherType.PigPen, 'PigPen',],
        [ICipherType.KnightsTemplar, 'KnightsTemplar',],
        [ICipherType.TapCode, 'TapCode',],
    ])

    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.None,
        testtype: ITestType.None,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Create Empty Test', color: 'primary', id: 'newtest' },
        { title: 'Build A Test', color: 'primary', id: 'buildtest' },
        {
            title: 'Export Tests',
            color: 'primary',
            id: 'export',
            download: true,
        },
        { title: 'Import Tests from File', color: 'primary', id: 'import' },
        { title: 'Import Tests from URL', color: 'primary', id: 'importurl' },
    ];

    /** Track the last time the domain was actually connected.  undefined means that
     * the model was not connected.  Once we are live, the value will be set and it is used
     * for reporing to the user how long the model has been disconnected from the server.
     */
    public lastActivity = undefined;

    public testTypeMap: ITestTypeInfo[] = [
        {
            title: 'None',
            type: ITestType.None,
            id: 'none',
        },
        {
            title: 'C (High School) - Invitational/Regional',
            type: ITestType.cregional,
            id: 'cregional',
        },
        {
            title: 'C (High School) - State/National',
            type: ITestType.cstate,
            id: 'cstate',
        },
        {
            title: 'B (Middle School) - Invitational/Regional',
            type: ITestType.bregional,
            id: 'bregional',
        },
        {
            title: 'B (Middle School) - State/National',
            type: ITestType.bstate,
            id: 'bstate',
        },
        {
            title: 'A (Elementary School) - Invitational/Regional',
            type: ITestType.aregional,
            id: 'aregional',
        },
    ];
    public questionChoices: INewCipherEntry[] = [
        { cipherType: ICipherType.Affine },
        { cipherType: ICipherType.Caesar },
        { cipherType: ICipherType.DancingMen },
        { cipherType: ICipherType.Atbash },
        { cipherType: ICipherType.Aristocrat },
        { cipherType: ICipherType.Checkerboard },
        { cipherType: ICipherType.CompleteColumnar },
        { cipherType: ICipherType.Cryptarithm },
        {
            cipherType: ICipherType.Aristocrat,
            lang: 'es',
            title: 'Spanish Aristocrat',
        },
        { cipherType: ICipherType.Patristocrat },
        { cipherType: ICipherType.Hill },
        { cipherType: ICipherType.Porta },
        { cipherType: ICipherType.NihilistSubstitution },
        { cipherType: ICipherType.Vigenere },
        { cipherType: ICipherType.RunningKey },
        { cipherType: ICipherType.Baconian },
        { cipherType: ICipherType.RSA },
        { cipherType: ICipherType.PigPen },
        { cipherType: ICipherType.KnightsTemplar },
        { cipherType: ICipherType.TapCode },
        { cipherType: ICipherType.Morbit },
        { cipherType: ICipherType.Pollux },
        { cipherType: ICipherType.FractionatedMorse },
        { cipherType: ICipherType.Railfence },
    ];
    /**
     * Stash of the current questions
     */
    public qdata: IQuestionData[];
    /**
     * Any running keys used for the test
     */
    public runningKeys: IRunningKey[];
    public LocalDB: IDBOpenDBRequest = undefined
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Create the tab buttons on the top of the page
     * @param testdisp Default state for this page
     * @returns JQuery elements for managing the state
     */
    public genTestEditState(testdisp: ITestDisp): JQuery<HTMLElement> {
        const radiobuttons = [
            { title: 'Edit Test', value: 'testedit' },
            { title: 'Test Packet', value: 'testprint' },
            { title: 'Resource Sheet', value: 'ressheet' },
            { title: 'Answer Key', value: 'testans' },
            { title: 'Tiny Answer Key', value: 'testanstiny' },
            { title: 'Answers and Solutions', value: 'testsols' },
            // { title: 'Interactive Test', value: 'testint' },  // NOTE: Disable interactive tests
        ];
        return JTRadioButton(8, 'testdisp', radiobuttons, testdisp);
    }
    /**
     * Report an error to the user.  This creates a closable warning box placed into the ans section
     * @param msg Error message to display
     */
    public reportFailure(msg: string): void {
        console.log(msg);
        let errloc = $('.ans');
        if (errloc.length === 0) {
            // If they don't have an ans class then look for the testerrors class
            errloc = $('.testerrors');
            if (errloc.length === 0) {
                // Not even that class, so just create a new one
                $('body').append($('<div/>', { class: 'ans' }));
                errloc = $('.ans');
            }
        }
        errloc.append(
            $('<div/>', { class: 'callout warning', 'data-closable': '' })
                .append($('<p/>').text(msg))
                .append(
                    $('<button/>', {
                        class: 'close-button',
                        'aria-label': 'Dismiss alert',
                        type: 'button',
                        'data-close': '',
                    }).append($('<span/>', { 'aria-hidden': 'true' }).html('&times;'))
                )
        );
    }
    /**
      *
      * @param testdisp Test state
      */
    public setTestEditState(testdisp: ITestDisp): void {
        JTRadioButtonSet('testdisp', testdisp);
    }
    /**
     * Map all cipher types to the common subtypes for purposes of spreading out scores
     * to prevent ties
     * @param cipherType Cipher type to map
     * @returns cipherSubType (or "Other")
     */
    public getCipherSubType(cipherType: ICipherType): string {
        let cipherSubType = 'Other';
        if (this.mapCipherSubType.has(cipherType)) {
            cipherSubType = this.mapCipherSubType.get(cipherType);
        }
        return cipherSubType;
    }
    /**
     * Maps a string to the corresponding test type ID
     * @param ID string representation of the id
     */
    public mapTestTypeString(id: string): ITestType {
        let result = ITestType.None;
        for (const entry of this.testTypeMap) {
            if (entry.id === id) {
                result = entry.type;
                break;
            }
        }
        return result;
    }
    /**
     * Maps a test type to the corresponding string
     * @param testtype Test type to map
     */
    public mapTestTypeID(testtype: ITestType): string {
        let result = '';
        for (const entry of this.testTypeMap) {
            if (entry.type === testtype) {
                result = entry.id;
                break;
            }
        }
        return result;
    }
    /**
     * Set the type of the test for the current test
     * @param testtype Type for the test
     * @returns Boolean indicating that the type actually changed
     */
    public setTestType(testtype: ITestType): boolean {
        let changed = false;
        const test = this.getTestEntry(this.state.test);
        if (testtype !== test.testtype) {
            changed = true;
            test.testtype = testtype;
            this.setTestEntry(this.state.test, test);
        }
        return changed;
    }
    /**
     * Import XML from a URL
     */
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
     * Create a new blank test
     */
    public newTest(): void {
        const test = this.setTestEntry(-1, {
            timed: -1,
            count: 0,
            questions: [],
            title: 'New Test',
            useCustomHeader: false,
            customHeader: '',
            customHeaderImage: '',
            testtype: ITestType.None,
        });
        this.gotoEditTest(test);
    }
    /**
     * Import tests from a location or a localcontent (cookie, etc)
     * @param useLocalData Indicates that we should pull the data locally instead 
     */
    public importTests(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    /**
     * Start the process of building a new test
     */
    public gotoBuildTest(): void {
        location.assign(`TestBuild.html`);
    }
    /**
     * Edit an existing test
     * @param test Test number to edit
     */
    public gotoEditTest(test: number): void {
        location.assign(`TestGenerator.html?test=${test}`);
    }
    /**
     * Adjust the scores on an existing test
     * @param test Test number to adjust scores for
     */
    public gotoAdjustScores(test: number): void {
        location.assign(`TestScoreAdjust.html?test=${test}`)
    }
    /**
     * Convert the current test information to a map which can be saved/restored later
     * @param test Test to generate data for
     * @returns string form of the JSON for the test
     */
    public generateTestData(test: ITest): sourceTestData {
        const result = {};
        result['TEST.0'] = test;

        if (test.timed !== -1) {
            result['CIPHER.' + String(test.timed)] = this.getFileEntry(test.timed);
        }
        for (const entry of test.questions) {
            result['CIPHER.' + String(entry)] = this.getFileEntry(entry);
        }
        return result;
    }
    /**
     * Convert the current test information to a JSON string
     * @param test Test to generate data for
     * @returns string form of the JSON for the test
     */
    public generateTestJSON(test: ITest): string {
        return JSON.stringify(this.generateTestData(test));
    }
    /**
     * Make a copy of a test
     * @param test Test to duplicate
     */
    public gotoEditCopyTest(test: number): void {
        const testdata = this.getTestEntry(test);
        testdata.title = 'DUP ' + testdata.title;
        if (testdata.timed !== -1) {
            const entry = this.getFileEntry(testdata.timed);
            entry.question = 'DUP ' + entry.question;
            testdata.timed = this.setFileEntry(-1, entry);
        }
        for (const i in testdata.questions) {
            const entry = this.getFileEntry(testdata.questions[i]);
            entry.question = 'DUP ' + entry.question;
            testdata.questions[i] = this.setFileEntry(-1, entry);
        }
        const newtest = this.setTestEntry(-1, testdata);
        location.assign(`TestGenerator.html?test=${newtest}`);
    }
    /**
     * Delete a local test
     * @param test Test number to delete
     */
    public deleteTest(test: number): void {
        this.deleteTestEntry(test);
        this.updateOutput();
    }
    /**
     * Print out the test
     * @param test Test number to print
     */
    public gotoPrintTest(test: number): void {
        location.assign(`TestPrint.html?test=${test}`);
    }
    /**
     * Print out the test
     * @param test Test number to print
     */
    public gotoResourceSheet(test: number): void {
        location.assign(`TestPrint.html?test=${test}&ressheet=y`);
    }
    /**
     * Print out the answers for a test
     * @param test Test number to print
     */
    public gotoPrintTestAnswers(test: number): void {
        location.assign(`TestAnswers.html?test=${test}`);
    }
    /**
     * Print out the answers for a test
     * @param test Test number to print
     */
    public gotoPrintAnswersTiny(test: number): void {
        location.assign(`TestAnswers.html?test=${test}&tiny=y`);
    }
    /**
     * Print out the answers and solutions for a test
     * @param test Test number to print
     */
    public gotoPrintTestSols(test: number): void {
        location.assign(`TestAnswers.html?test=${test}` + '&sols=y');
    }
    /**
     * Show all the locally stored tests
     */
    public gotoTestLocal(): void {
        location.assign('TestManage.html');
    }
    /**
     * Take action on a test (generally in response to the choice bar at the top of the page)
     * @param testdisp Action to take
     */
    public gotoTestDisplay(testdisp: ITestDisp): void {
        switch (testdisp) {
            case 'testans':
                this.gotoPrintTestAnswers(this.state.test);
                break;
            case 'testanstiny':
                this.gotoPrintAnswersTiny(this.state.test);
                break;
            case 'ressheet':
                this.gotoResourceSheet(this.state.test);
                break;
            case 'testedit':
                this.gotoEditTest(this.state.test);
                break;
            default:
            case 'testprint':
                this.gotoPrintTest(this.state.test);
                break;
            case 'testsols':
                this.gotoPrintTestSols(this.state.test);
                break;
        }
    }
    /**
     * Jump to the list of all the tests of a given type
     * @param testmanage Type of test (local/published) (Currently ignored)
     */
    public gotoTestManage(testmanage: ITestManage): void {
        this.gotoTestLocal();
    }
    /**
     * Jump to the page to edit a cipher
     * @param entry Cipher entry to edit
     */
    public gotoEditCipher(entry: number): void {
        const entryURL = this.getEntryURL(entry);
        if (entryURL !== '') {
            location.assign(entryURL);
        } else {
            alert('No editor found');
        }
    }
    /**
     * 
     * @returns The language string for the database selection
     */
    public getLangString(): string {
        if (this.state.curlang === 'es') {
            return "spanish"
        }
        return "english"
    }
    public CreateTableIfNeeded(db: IDBDatabase, lang: string): void {
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
     * 
     * @param lang 
     * @returns 
     */
    public openDatabase(lang: string, mode: IDBTransactionMode = "readonly"): Promise<DBTable> {
        return new Promise<DBTable>((resolve, reject) => {
            this.LocalDB = window.indexedDB.open("cipher_quotes", DATABASE_VERSION);
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
    /**
     * 
     * @param step Step number to display
     * @param body Content as DOM elements
     * @returns 
     */
    public makeStepCallout(step: string, body: ChildNode): JQuery<HTMLElement> {
        const title = $('<h3>').text(step)
        return makeCallout($("<div/>").append(title).append(body as HTMLElement), 'secondary')
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
    /**
     * Convert all undefined values in a range to the appropriate Infinity range
     * @param range Range to fix
     * @returns Updated range
     */
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
    /**
     * Normalize all the parameters, setting ranges for any undefined values
     * @param parmsReq Parameters structure of limits on query
     * @returns Cleaned up set of parameters
     */
    public cleanParms(parmsReq: QueryParms): QueryParms {
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
     * Search all entries which match a given set of criteria and call a processing routine for each matched entry
     * @param lang Language to search
     * @param parmsReq Filters to apply the the search
     * @param process Routine to process any matched records.  If this routine returns true, the search is ended early.
     * @returns Success/failure boolean.
     */
    public async SearchEntriesWithRanges(lang: string, parmsReq: QueryParms, process: (rec: QuoteRecord) => boolean): Promise<boolean> {
        const parms = this.cleanParms(parmsReq)

        return new Promise<boolean>((resolve, reject) => {
            this.openDatabase(lang).then((db) => {
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
    public async getEntriesWithRanges(lang: string, parmsReq: QueryParms, limit: number = 25): Promise<QuoteRecord[]> {
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
    public async getRandomEntriesWithRanges(lang: string, parmsReq: QueryParms, usedmap: UsedIdMap, limit: number = 3): Promise<QuoteRecord[]> {
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
     * Update a single record in the database.  Note that due to the oddities of the
     * indexeddb database, we have to find the record, make a copy of it, modify the copy, delete the
     * original record, remove the id from the new record and then add it back to the database.
     * @param objectStore Database to update the record
     * @param id Id of record to update
     * @param toUpdate New data to apply to the record
     * @returns 
     */
    public updateDBRecord(objectStore: IDBObjectStore, id: number, toUpdate: QuoteRecord): Promise<boolean> {
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
    /**
     * Update a series of entries in the database
     * Primarily used to mark records as being used on a test
     * @param lang Language database to update
     * @param updatereq List of entries to be updated
     * @returns 
     */
    public updateDBRecords(lang: string, updatereq: QuoteUpdates): Promise<boolean> {

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
        if (result && (parms.homonyms !== undefined)) {
            const homonymcount = countHomonyms(entry.quote)
            // If there were enough homonyms in the phrase we can keep it
            if (homonymcount < parms.homonyms[0]) {
                result = false;
            }
        }
        return result
    }
    /**
     * Generate a table showing all the questions with action buttons
     * @param filter Items not to be displayed (doesn't currently work)
     * @param buttons Buttons to associate with each entry
     * @returns DOM elements for the table
     */
    public genQuestionTable(filter: number, buttons: buttonInfo[]): JQuery<HTMLElement> {
        // Figure out what items we will not display if they gave us a filter
        const useditems: { [index: string]: boolean } = {};
        if (filter !== undefined) {
            const test = this.getTestEntry(this.state.test);
            if (test.timed !== -1) {
                useditems[test.timed] = true;
            }
            for (const entry of test.questions) {
                useditems[entry] = true;
            }
        }

        const testcount = this.getTestCount();
        const testuse: { [index: string]: JQuery<HTMLElement> } = {};
        const testNames: NumberMap = {};

        // Figure out what tests each entry is used with
        for (let testent = 0; testent < testcount; testent++) {
            const test = this.getTestEntry(testent);
            // Make sure we have a unique title for the test
            let title = test.title;
            if (title === '') {
                title = 'No Title';
            }
            if (testNames[title] !== undefined) {
                title += '.' + testent;
            }
            testNames[title] = testent;
            // If we have a timed question, just put it in front of all the other questions
            // that we will process since we don't actually care about the order of the
            // questions, just which test it is used in
            if (test.timed !== -1) {
                test.questions.unshift(test.timed);
            }
            // Generate a clickable URL for each entry in the test
            for (const entry of test.questions) {
                if (entry in testuse) {
                    // If this is a subsequent entry, separate them with a comma
                    testuse[entry].append(', ');
                } else {
                    // For the first entry, we need a <div> to contain it all
                    testuse[entry] = $('<div/>');
                }
                testuse[entry].append(
                    $('<a/>', {
                        href: 'TestGenerator.html?test=' + testent,
                    }).text(title)
                );
            }
        }

        const result = $('<div/>', { class: 'questions' });

        const cipherCount = this.getCipherCount();
        const table = new JTTable({ class: 'cell stack queslist' });
        const row = table.addHeaderRow();
        row.add('Question')
            .add('Action')
            .add('Type')
            .add('Use')
            .add('Points')
            .add('Question')
            .add('Plain Text');

        for (let entry = 0; entry < cipherCount; entry++) {
            if (!useditems[entry]) {
                let prevuse: any = '';
                if (entry in testuse) {
                    prevuse = testuse[entry];
                }
                this.addQuestionRow(table, entry, entry, buttons, true, undefined, prevuse);
            }
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Generate a dropdown for the type of test
     * @param ID HTML ID of the generated dropdown
     * @param title Title text for the generated dropdown
     */
    public genTestTypeDropdown(
        id: string,
        title: string,
        testtype: ITestType,
        sizeclass: string
    ): JQuery<HTMLElement> {
        const inputgroup = $('<div/>', {
            class: sizeclass,
        });
        $('<span/>', { class: 'input-group-label' })
            .text(title)
            .appendTo(inputgroup);
        const select = $('<select/>', {
            id: id,
            class: 'input-group-field',
        });
        let option = $('<option />', {
            value: '',
            disabled: 'disabled',
        }).text('--Select a Test Type--');

        if (testtype === ITestType.None) {
            option.attr('selected', 'selected');
        }
        select.append(option);

        for (const entry of this.testTypeMap) {
            option = $('<option />', {
                value: entry.id,
            }).html(entry.title);
            if (testtype === entry.type) {
                option.attr('selected', 'selected');
            }
            select.append(option);
        }
        inputgroup.append(select);
        return inputgroup;
    }
    /**
     * Create a dropdown to allow inserting a new cipher type
     * @param ID HTML ID of the generated dropdown
     * @param title Title text for the generated dropdown
     */
    public genNewCipherDropdown(
        id: string,
        title: string,
        testtype: ITestType
    ): JQuery<HTMLElement> {
        const inputgroup = $('<div/>', {
            class: 'input-group cell small-12 medium-12 large-12',
        });
        $('<span/>', { class: 'input-group-label' })
            .text(title)
            .appendTo(inputgroup);
        const select = $('<select/>', {
            id: id,
            class: 'input-group-field',
        });
        select.append(
            $('<option />', {
                value: '',
                disabled: 'disabled',
                selected: 'selected',
            }).text('--Select a Cipher Type to add--')
        );
        for (const entry of this.questionChoices) {
            // Make sure that this type of cipher is legal for this type of test
            const cipherhandler = CipherPrintFactory(entry.cipherType, entry.lang);
            if (cipherhandler.CheckAppropriate(testtype, true) === '') {
                const option = $('<option />', {
                    value: entry.cipherType,
                });
                if (entry.lang !== undefined) {
                    option.attr('data-lang', entry.lang);
                }
                let cipherTitle = getCipherTitle(entry.cipherType);
                if (entry.title !== undefined) {
                    cipherTitle = entry.title;
                }
                option.html(cipherTitle);
                select.append(option);
            }
        }
        // See if we need to add the ability to add existing ciphers
        let cipherCount = this.getCipherCount();
        const test = this.getTestEntry(this.state.test);
        cipherCount -= test.questions.length;
        if (test.timed !== -1) {
            cipherCount--;
        }
        if (cipherCount > 0) {
            select.append(
                $('<option/>', { value: ICipherType.None }).html('**Choose Existing Cipher**')
            );
        }
        inputgroup.append(select);
        return inputgroup;
    }
    /**
     * Adds a row to the table of questions with action buttons
     * @param table Table to append to
     * @param order Order of the entry
     * @param qnum Which question number (on the test or globally)
     * @param buttons Command buttons to associate with the entry
     * @param showPlain Boolean to show the plain text
     * @param testtype Type of test the question is being used for
     * @param prevuse Any previous use of the question on another test
     * @returns State representing the test question data,  state.errorcount tells how many errors were found
     */
    public addQuestionRow(
        table: JTTable,
        order: number,
        qnum: number,
        buttons: buttonInfo[],
        showPlain: boolean,
        testtype: ITestType,
        prevuse: any
    ): IEncoderState {
        let ordertext = 'Timed';
        let plainclass = '';
        if (!showPlain) {
            plainclass = 'qplain';
        }
        $(".err").hide();
        let extratext = '';
        if (order === -1) {
            extratext =
                '  When you have solved it, raise your hand so that the time can be recorded and the solution checked.';
        } else {
            ordertext = String(order);
        }
        let state: IEncoderState = undefined;
        let row = table.addBodyRow();
        // We have a timed question on everything except the Division A
        if (order === -1 && qnum === -1 && testtype !== ITestType.aregional) {
            const callout = $('<div/>', {
                class: 'callout warning',
            }).text('No Timed Question!  Add one from below');
            callout.append(
                this.genNewCipherDropdown('addnewtimed', 'New Timed Question', testtype)
            );
            row.add({
                celltype: 'td',
                settings: { colspan: 6 },
                content: callout,
            });
        } else {
            let qerror = '';
            row.add(ordertext);
            state = this.getFileEntry(qnum);
            if (state === null) {
                state = {
                    cipherType: ICipherType.None,
                    points: 0,
                    cipherString: '',
                };
            }
            if (testtype === ITestType.aregional && order === -1) {
                qerror = 'Timed question not allowed for ' + this.getTestTypeName(testtype);
            } else if (testtype !== undefined) {
                // If we know the type of test, see if it has any problems with the question
                const cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
                cipherhandler.savefileentry = state.editEntry;
                cipherhandler.restore(state);
                qerror = cipherhandler.CheckAppropriate(testtype, false);
                if (qerror !== '') {
                    if (order === -1) {
                        qerror = 'Timed question: ' + qerror;
                    } else {
                        qerror = 'Question ' + ordertext + ': ' + qerror;
                    }
                }
            }
            const buttonset = $('<div/>', {
                class: 'button-group round shrink',
            });
            for (const btninfo of buttons) {
                const button = $('<button/>', {
                    'data-entry': order,
                    type: 'button',
                    class: btninfo.btnClass + ' button',
                }).html(btninfo.title);
                if (btninfo.disabled === true) {
                    button.attr('disabled', 'disabled');
                }
                buttonset.append(button);
            }
            row.add($('<div/>', { class: 'grid-x' }).append(buttonset)).add(state.cipherType);
            if (prevuse !== undefined) {
                row.add(prevuse);
            }
            let pointsstr = String(state.points);
            if (state.specialbonus) {
                pointsstr = "&#9733;" + pointsstr;
            }

            row.add($('<span/>').html(pointsstr))
                .add(
                    $('<span/>', {
                        class: 'qtextentry',
                    }).html(state.question + extratext)
                )
                .add(
                    $('<span/>', {
                        class: plainclass,
                    }).text(state.cipherString)
                );
            let errContent = this.getGeneratedErrors();
            if (errContent !== undefined) {
                state.errorcount = errContent.contents().length;
            }
            if (qerror !== '' || errContent !== undefined) {
                row = table.addBodyRow();
                const callout = $('<div/>', {
                    class: 'callout alert',
                }).text(qerror);
                if (errContent !== undefined) {
                    callout.append(errContent);
                }
                row.add({
                    celltype: 'td',
                    settings: { colspan: 6 },
                    content: callout,
                });
            }
        }
        return state;
    }
    /**
     * Get all the errors (if any) generated for a cipher
     * @returns HTML Elements of the errors
     */
    public getGeneratedErrors(): JQuery<HTMLElement> {
        let errContent = undefined;
        if (!($('.err').is(':empty'))) {
            errContent = $('.err').contents();
            if (errContent.hasClass('callout')) {
                errContent = errContent.contents();
            }
            errContent.find('a').remove();
            // Remove all <div> elements with data-msg="polgs"  
            // These correspond to the AutoSolver being unable to find a solution
            errContent = errContent.filter(':not(div[data-msg="polgs"])');
            // Remove complete columnar crib length warning messages, also...
            errContent = errContent.filter(':not(div[data-msg="cribl"])');

            $('.err').empty();

            // If there are no errors left to display, then toss out errContent so a red box
            // row is not created in the question listing.
            if (errContent.length === 0) {
                errContent = undefined
            }
        }
        return errContent;
    }

    /**
     * Add a named error to the list of errors associated with a test.
     * @param qnum Which error to add
     * @param message Message to associate with the error
     */
    public AddTestError(qnum: number, message: string): void {
        if (message !== '') {
            let qtxt = 'Timed Question: ';
            if (qnum !== -1) {
                qtxt = 'Question ' + String(qnum) + ': ';
            }
            const callout = $('<div/>', {
                class: 'callout alert',
            }).text(qtxt + message);
            $('.testerrors').append(callout);
        }
    }
    /**
     * Get a CipherHandler for printing a cipher
     * @param question Question number to get factory for
     * @returns CipherHandler for the given question
     */
    public GetPrintFactory(question: number): CipherHandler {
        const state = this.getFileEntry(question);
        const cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.savefileentry = state.editEntry;
        cipherhandler.restore(state);
        return cipherhandler;
    }
    /**
     * Generate a printable answer for a test entry.
     * An entry value of -1 is for the timed question
     * @param testType 
     * @param qnum 
     * @param handler 
     * @param extraclass 
     * @param printSolution 
     * @returns 
     */
    public printTestAnswer(
        testType: ITestType,
        qnum: number,
        handler: CipherHandler,
        extraclass: string,
        printSolution: boolean
    ): JQuery<HTMLElement> {
        const state = handler.state;
        let extratext = '';
        const result = $('<div/>', {
            class: 'question ' + extraclass,
        });
        const qtext = $('<div/>', { class: 'qtext' });
        if (state.specialbonus) {
            qtext.append(
                $('<span/>', { class: 'spbonus' }).append("&#9733;(Special Bonus Question)")
            )
        }
        if (qnum === -1) {
            qtext.append(
                $('<span/>', {
                    class: 'timed',
                }).text('Timed Question')
            );
            extratext =
                '  When you have solved it, raise your hand so that the time can be recorded and the solution checked.';
        } else {
            qtext.append(
                $('<span/>', {
                    class: 'qnum',
                }).text(String(qnum) + ')')
            );
        }
        qtext.append(
            $('<span/>', {
                class: 'points',
            }).text(' [' + String(state.points) + ' points] ')
        );
        qtext.append(
            $('<span/>', {
                class: 'qbody',
            }).html(state.question + extratext)
        );

        result.append(qtext);
        const cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.savefileentry = state.editEntry
        cipherhandler.restore(state);
        // Remember this question points so we can generate the tiebreaker order
        this.qdata.push({ qnum: qnum, points: state.points, specialBonus: state.specialbonus, noMistakes: cipherhandler.freeMistakes() === 0 });
        result.append(cipherhandler.genAnswer(testType));
        if (printSolution) {
            result.append(cipherhandler.genSolution(testType));
        }
        return result;
    }
    /**
     * Generate a printable answer key for a test entry.
     * An entry value of -1 is for the timed question.
     */
    public printTestQuestion(
        testType: ITestType,
        qnum: number,
        handler: CipherHandler,
        extraclass: string
    ): JQuery<HTMLElement> {
        const state = handler.state;
        let extratext = '';
        const result = $('<div/>', {
            class: 'question ' + extraclass,
        });
        const qtext = $('<div/>', { class: 'qtext' });
        if (state.specialbonus) {
            qtext.append(
                $('<span/>', { class: 'spbonus' }).append("&#9733;(Special Bonus Question)")
            )
        }
        if (qnum === -1) {
            qtext.append(
                $('<span/>', {
                    class: 'timed',
                }).text('Timed Question')
            );
            extratext =
                '  When you have solved it, raise your hand so that the time can be recorded and the solution checked.';
        } else {
            qtext.append(
                $('<span/>', {
                    class: 'qnum',
                }).text(String(qnum) + ')')
            );
        }
        qtext.append(
            $('<span/>', {
                class: 'points',
            }).text(' [' + String(state.points) + ' points] ')
        );
        qtext.append(
            $('<span/>', {
                class: 'qbody',
            }).html(state.question + extratext)
        );
        result.append(qtext);
        const cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.savefileentry = state.editEntry
        cipherhandler.restore(state);
        // Did the handler use a running key
        if (cipherhandler.usesRunningKey) {
            // If we haven't gotten any running keys then get the defaults
            if (this.runningKeys === undefined) {
                this.runningKeys = this.getRunningKeyStrings();
            }
            // Add this one to the list of running keys used.  Note that we don't
            // have a title, so we have to just make it up.  In theory this shouldn't
            // happen because we would expect that all the running keys were defined before
            // creating the test.
            if (cipherhandler.extraRunningKey !== undefined) {
                this.runningKeys.push({
                    title: 'Unknown',
                    text: cipherhandler.extraRunningKey,
                });
            }
        }
        // Remember this question points so we can generate the score sheet
        this.qdata.push({ qnum: qnum, points: state.points, specialBonus: state.specialbonus, noMistakes: cipherhandler.freeMistakes() === 0 });
        result.append(cipherhandler.genQuestion(testType));
        return result;
    }
    /**
     * Compare two arbitrary objects to see if they are equivalent
     * @param a First object
     * @param b Second object
     * @returns Boolean indicating that they are the same
     */
    public isEquivalent(a: any, b: any): boolean {
        // If the left side is blank or undefined then we assume that the
        // right side will be equivalent.  (This allows for objects which have
        // been extended with new attributes)
        if (a === '' || a === undefined || a === null) {
            return true;
        }
        // If we have an object on the left, the right better be an object too
        if (typeof a === 'object') {
            if (typeof b !== 'object') {
                return false;
            }
            // Both are objects, if any element of the object doesn't match
            // then they are not equivalent
            for (const elem of a) {
                if (!this.isEquivalent(a[elem], b[elem])) {
                    return false;
                }
            }
            // They all matched, so we are equivalent
            return true;
        }
        // Simple item, result is if they match
        return a === b;
    }
    /**
     * Compare two saved cipher states to see if they are indeed identical
     * @param state1 Cipher one restored state
     * @param state2 Cipher two restored state
     * @returns Boolean indicating if they are identical
     */
    public isSameCipher(state1: IState, state2: IState): boolean {
        // Make sure every element in state1 that is non empty is also in state 2
        for (const elem in state1) {
            if (!this.isEquivalent(state1[elem], state2[elem])) {
                return false;
            }
        }
        // And do the same for everything in reverse
        for (const elem in state2) {
            if (!this.isEquivalent(state2[elem], state1[elem])) {
                return false;
            }
        }
        return true;
    }
    /**
     * See if this test already exists. This prevents duplication of the same test locally
     * @param newTest Test to check
     * @returns Test number of existing test which matches or -1 if this test is new
     */
    public findTest(newTest: ITest): number {
        // Go through all the tests and build a structure holding them that we will convert to JSON
        const testcount = this.getTestCount();
        for (let testnum = 0; testnum < testcount; testnum++) {
            const test = this.getTestEntry(testnum);
            if (
                test.title === newTest.title &&
                test.timed === newTest.timed &&
                test.questions.length === newTest.questions.length
            ) {
                let issame = true;
                for (let i = 0; i < test.questions.length; i++) {
                    if (test.questions[i] !== newTest.questions[i]) {
                        issame = false;
                        break;
                    }
                }
                if (issame) {
                    return testnum;
                }
            }
        }

        return -1;
    }
    /**
     * Reorder the questions on a test, attempting to keep similar ciphers separated away from one another
     * @param questions Array of entries to shuffle
     * @returns 
     */
    public shuffleEntries(questions: number[]): number[] {
        let testData: SortableEntry[] = []
        let finalData: SortableEntry[] = []
        let saveData: SortableEntry[] = []
        // Gather all the questions together.  First we put them all in a list using a random number that we can sort on
        for (let entry of questions) {
            const fileEntry = this.getFileEntry(entry);
            let sortEntry: SortableEntry = {
                weight: Math.random(),
                entry: entry,
                cipherType: this.getCipherSubType(fileEntry.cipherType)
            }
            testData.push(sortEntry);
        }
        // Sort the list based on the random weights as an initial ordering
        testData = testData.sort((a, b) => a.weight - b.weight)
        // Next we need to make sure that no two cipher types are next to each other (if that is possible)
        let lastType = 'Aristocrat';
        testData.forEach((entry) => {
            // What general type of cipher is this?
            let thisType = entry.cipherType;

            if (thisType === lastType) {
                // We can't put this next to the current one, so push it onto the save stack
                saveData.push(entry);
            } else {
                finalData.push(entry);
                lastType = thisType;
            }
            // See if there is anything on the save stack that we can pull in
            while (saveData.length > 0) {
                const foundIndex = saveData.findIndex((entry) => entry.cipherType !== lastType)
                if (foundIndex === -1) {
                    break;
                }
                const entries = saveData.splice(foundIndex, 1)
                entries.forEach((entry) => {
                    finalData.push(entry);
                    lastType = entry.cipherType
                });

            }
        })
        // We sorted the best we can, so give them the final list
        const result: number[] = []
        finalData.forEach((entry) => result.push(entry.entry))
        saveData.forEach((entry) => result.push(entry.entry))
        return result
    }
    /**
     * Create a link that downloads all the tests
     * @param link HTML DOM Element to put link under
     */
    public exportAllTests(link: JQuery<HTMLElement>): void {
        const result = {};
        // Go through all of the questions and build a structure holding them
        const ciphercount = this.getCipherCount();
        for (let entry = 0; entry < ciphercount; entry++) {
            result['CIPHER.' + String(entry)] = this.getFileEntry(entry);
        }
        // Go through all the tests and build a structure holding them that we will convert to JSON
        const testcount = this.getTestCount();
        for (let testnum = 0; testnum < testcount; testnum++) {
            result['TEST.' + String(testnum)] = this.getTestEntry(testnum);
        }
        const blob = new Blob([JSON.stringify(result)], { type: 'text/json' });
        const url = URL.createObjectURL(blob);

        link.attr('download', 'cipher_tests.json');
        link.attr('href', url);
    }

    public checkTestLimits(errors: string[], test: ITest, SpanishCount: number, SpecialBonusCount: number) {

        type Bounds = Readonly<{ min: number; max: number }>;

        const testTypeRangeMap: Readonly<Record<ITestType, Bounds>> = {
            [ITestType.None]: { min: 0, max: 999 },
            [ITestType.bstate]: { min: 18, max: 28 },
            [ITestType.cregional]: { min: 18, max: 26 },
            [ITestType.cstate]: { min: 24, max: 33 },
            [ITestType.bregional]: { min: 18, max: 26 },
            [ITestType.aregional]: { min: 16, max: 22 },
            [ITestType.astate]: { min: 18, max: 26 },
        } as const;

        const SpanishCountLimits: Readonly<Record<ITestType, Bounds>> = {
            [ITestType.None]: { min: 0, max: 20 },
            [ITestType.cregional]: { min: 0, max: 2 },
            [ITestType.cstate]: { min: 2, max: 3 },
            [ITestType.bregional]: { min: 0, max: 1 },
            [ITestType.bstate]: { min: 1, max: 2 },
            [ITestType.aregional]: { min: 0, max: 0 },
            [ITestType.astate]: { min: 0, max: 0 },
        } as const;

        // Check to see if we have a reasonable number of questions
        const qRange = testTypeRangeMap[test.testtype]
        if (test.count < qRange.min) {
            errors.push(`This test only has ${test.count} questions.  A minimum of ${qRange.min} is recommended unless this is a practice test.`)
        } else if (test.count > qRange.max) {
            errors.push(
                `This test has ${test.count} questions which is higher than the recommended maximum of ${qRange.max}.`
            )
        }

        const { min, max } = SpanishCountLimits[test.testtype];

        if (SpanishCount < min) {
            if (min === 1) {
                errors.push(`${this.getTestTypeName(test.testtype)} is supposed to have at least one Spanish Xenocrypt.`);
            } else {
                errors.push(`${this.getTestTypeName(test.testtype)} is supposed to have at least ${min} Spanish Xenocrypts.`);
            }
        } else if (SpanishCount > max) {
            if (max === 0) {
                errors.push(`${this.getTestTypeName(test.testtype)} is not supposed to have any Spanish Xenocrypts.`);
            } else if (max === 1) {
                errors.push(`${this.getTestTypeName(test.testtype)} is supposed to have no more than one Spanish Xenocrypt.`);
            } else {
                errors.push(`${this.getTestTypeName(test.testtype)} is supposed to have no more than ${max} Spanish Xenocrypts.`);
            }
        }
        if (SpanishCount > 0) {
            $('.xenocryptfreq').show();
        } else {
            $('.xenocryptfreq').hide();
        }
        if (SpecialBonusCount > 3) {
            errors.push('No more than three special bonus questions allowed on ' + this.getTestTypeName(test.testtype))
        }
        if (errors.length === 1) {
            $('.testerrors').append(
                $('<div/>', {
                    class: 'callout alert',
                }).text(errors[0])
            );
        } else if (errors.length > 1) {
            const ul = $('<ul/>');
            for (const msg of errors) {
                ul.append($('<li/>').text(msg));
            }
            $('.testerrors').append(
                $('<div/>', {
                    class: 'callout alert',
                })
                    .text('The following errors were found:')
                    .append(ul)
            );
        }
    }

    public importImage(_filename: string, _data: any) {
        super.importImage(_filename, _data);
        this.updateOutput();
    }

    /**
     * Process imported XML
     * @param data XML for the test to import
     */
    public importXML(data: any): void {
        this.processTestXML(data);
        this.updateOutput();
    }
    // tslint:disable-next-line:cyclomatic-complexity
    public processTestXML(data: any): void {
        // Load in all the ciphers we know of so that we don't end up doing a duplicate
        let cipherCount = this.getCipherCount();
        const cipherCache: { [index: number]: IState } = {};
        const inputMap: NumberMap = {};
        for (let entry = 0; entry < cipherCount; entry++) {
            cipherCache[entry] = this.getFileEntry(entry);
        }
        // First we get all the ciphers defined and add them to the list of ciphers
        for (const ent in data) {
            const pieces = ent.split('.');
            // Make sure we have a valid object that we can bring in
            if (
                pieces[0] === 'CIPHER' &&
                typeof data[ent] === 'object' &&
                data[ent].cipherType !== undefined &&
                data[ent].cipherString !== undefined &&
                !(pieces[1] in inputMap)
            ) {
                // It is a cipher entry // It is an object // with a cipherType // and a cipherString
                // that we haven't seen before
                const oldPos = Number(pieces[1]);
                const toAdd: IState = data[ent];
                let needNew = true;
                // Now make sure that we don't already have this cipher loaded
                for (let oldEnt = 0; oldEnt < cipherCount; oldEnt++) {
                    if (this.isSameCipher(cipherCache[oldEnt], toAdd)) {
                        inputMap[String(oldPos)] = oldEnt;
                        needNew = false;
                        break;
                    }
                }
                // If we hadn't found it, let's go ahead and add it
                if (needNew) {
                    // After we pull in the string, we need to filter it down to only the HTML that we allow.
                    // This is basically a whitelist that only allows a few HTML elements
                    //    strong
                    //    i
                    //    p
                    //    ul
                    //    ol
                    //    li
                    //    blockquote
                    //    span style="xxxx"
                    // Anything else between <> is thrown away, even extra elements on the span
                    //
                    //  To do this we have a complex regexp that whitelists
                    //     <                             Anything that starts with a left bracket            
                    //       (\/?)                       $1 capture group for any leading / (like </ul>)
                    //       (                           $2 capture group for the white list of elements we allow
                    //         strong|
                    //         i|
                    //         p|
                    //         ul|
                    //         ol|
                    //         li|
                    //         blockquote|
                    //         span|
                    //                                   and anything else is ignored
                    //       )  
                    //       (?:                         Third capture group which is ignored.                             
                    //         [^>]*                     Throw away anything that is before the style=
                    //           (                       $3 capture group which gets the style=
                    //             \s+style="[^"]*")|       With double quotes
                    //             \s+style='[^']*')|       or single quotes
                    //                                      or no style at all
                    //           )
                    //       [^>]*
                    //     >
                    const re1 = /<(\/?)(strong|i|p|ul|ol|li|blockquote|span|)(?:[^>]*(\s+style="[^"]*")|)[^>]*>/gi;
                    // The second regex is just for the keywords we want without any style
                    //      <                            Anything that starts with a left bracket
                    //        (                          $1 capture group for the entire element
                    //          \/?                      With an optional leading /
                    //          strong|                  Followed by the white list of elements we allow
                    //          i|
                    //          p|
                    //          ul
                    //          |ol
                    //          |li
                    //          |blockquote
                    //        )
                    //        [^>]*                      Anything up to the closing > is ignored
                    //      >                            With the closing left bracket
                    const re2 = /<(\/?strong|i|p|ul|ol|li|blockquote)[^>]*>/gi;
                    // Toss out any malformed HTML elements that don't have their closing >
                    toAdd.question = toAdd.question.replace(/<[^>]*$/, '');
                    // As well as any HTML comments  <!-- and -->
                    toAdd.question = toAdd.question.replace(/<!--.*-->/g, '');
                    // Eliminate all the html elements that we don't like as well as any attribute except style
                    toAdd.question = toAdd.question.replace(re1, '<$1$2$3>');
                    // Get rid of the styles on everything except for the <span elements
                    toAdd.question = toAdd.question.replace(re2, '<$1>');
                    // Get rid of any solo styles (it would come from something like <h1 style="xxx">)
                    toAdd.question = toAdd.question.replace(/<style[^>]*>/gi, '');
                    // Get rid of any empty elements finally
                    toAdd.question = toAdd.question.replace(/<\/?>/g, '');;

                    const newval = this.setFileEntry(-1, toAdd);
                    cipherCache[newval] = toAdd;
                    inputMap[String(oldPos)] = newval;
                    cipherCount++;
                }
            }
        }
        // Now that we have all the ciphers in, we can go back and add the tests
        for (const ent in data) {
            const pieces = ent.split('.');
            // Make sure we have a valid object that we can bring in
            if (
                pieces[0] === 'TEST' &&
                typeof data[ent] === 'object' &&
                data[ent].title !== undefined &&
                data[ent].timed !== undefined &&
                data[ent].questions !== undefined
            ) {
                // It is a cipher entry // It is an object // with a title // with a timed question
                // and questions
                const newTest: ITest = data[ent];
                // Go through and fix up all the entries.  First the timed question
                if (newTest.timed !== -1 && inputMap[newTest.timed] !== undefined) {
                    newTest.timed = inputMap[newTest.timed];
                } else {
                    newTest.timed = -1;
                }
                // and then all of the entries
                for (let entry = 0; entry < newTest.questions.length; entry++) {
                    if (inputMap[newTest.questions[entry]] !== undefined) {
                        newTest.questions[entry] = inputMap[newTest.questions[entry]];
                    } else {
                        newTest.questions[entry] = 0;
                    }
                }
                // For good measure, just fix up the questions length
                newTest.count = newTest.questions.length;
                let testnum = this.findTest(newTest);
                if (testnum === -1) {
                    testnum = this.setTestEntry(-1, newTest);
                }
                if (testnum !== -1) {
                    this.gotoEditTest(testnum);
                }
            }
        }
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('#newtest')
            .off('click')
            .on('click', (e) => {
                this.newTest();
            });
        $('#buildtest')
            .off('click')
            .on('click', (e) => {
                this.gotoBuildTest();
            });
        $('#export')
            .off('click')
            .on('click', (e) => {
                this.exportAllTests($(e.target));
            });
        $('#import')
            .off('click')
            .on('click', (e) => {
                this.importTests(true);
            });
        $('#importurl')
            .off('click')
            .on('click', (e) => {
                this.importTests(false);
            });
        $('#printtest')
            .off('click')
            .on('click', () => {
                this.gotoPrintTest(this.state.test);
            });
        $('#printans')
            .off('click')
            .on('click', () => {
                this.gotoPrintTestAnswers(this.state.test);
            });
        $('#printsols')
            .off('click')
            .on('click', () => {
                this.gotoPrintTestSols(this.state.test);
            });
        $('#edittest')
            .off('click')
            .on('click', () => {
                this.gotoEditTest(this.state.test);
            });
        $('.entryedit')
            .off('click')
            .on('click', (e) => {
                this.gotoEditCipher(Number($(e.target).attr('data-entry')));
            });
        $('[name="testdisp"]')
            .off('click')
            .on('click', (e) => {
                $(e.target)
                    .siblings()
                    .removeClass('is-active');
                $(e.target).addClass('is-active');
                this.gotoTestDisplay($(e.target).val() as ITestDisp);
                this.updateOutput();
            });
        $('[name="testmanage"]')
            .off('click')
            .on('click', (e) => {
                $(e.target)
                    .siblings()
                    .removeClass('is-active');
                $(e.target).addClass('is-active');
                this.gotoTestManage($(e.target).val() as ITestManage);
                this.updateOutput();
            });
    }
}
