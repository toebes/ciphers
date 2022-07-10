import { cloneObject } from '../common/ciphercommon';
import { IState, ITest, ITestType, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFDialog } from '../common/jtfdialog';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState } from './ciphertest';


const CipherTypeLookup: { [key: string]: ICipherType } = {
    '????': ICipherType.None,
    '???': ICipherType.None,
    'AFFINE': ICipherType.Affine,
    'AMSCO': ICipherType.Amsco,
    'ARISTOCRAT': ICipherType.Aristocrat,
    'ATBASH': ICipherType.Atbash,
    'AUTOKEY': ICipherType.Autokey,
    'BACONIAN': ICipherType.Baconian,
    'BAZERIES': ICipherType.Bazeries,
    'BEAUFORT': ICipherType.Beaufort,
    'BIFID': ICipherType.Bifid,
    'BIFID 6X6': ICipherType.Bifid,
    'CADENUS': ICipherType.Cadenus,
    'CAESAR': ICipherType.Caesar,
    'CHECKERBOARD 6X6': ICipherType.Checkerboard,
    'CHECKERBOARD': ICipherType.Checkerboard,
    'CM BIFID': ICipherType.CMBifid,
    'COMPLETE COLUMNAR': ICipherType.CompleteColumnar,
    'COMPLETE COLUMNAR TRAMP': ICipherType.CompleteColumnar,
    'COMPLETE COLUMNAR TRANS': ICipherType.CompleteColumnar,
    'CONDI': ICipherType.Condi,
    'COUNTER': ICipherType.Counter,
    'CRYPTARITHM': ICipherType.Cryptarithm,
    'DANCINGMAN': ICipherType.DancingMan,
    'DIGRAFID': ICipherType.Digrafid,
    'FOURSQUARE': ICipherType.Foursquare,
    'FRACTIONATED MORSE': ICipherType.FractionatedMorse,
    'GRANDPRÉ': ICipherType.Grandpre,
    'GRANDPRE': ICipherType.Grandpre,
    'DIAMOND TURNING GRILLE': ICipherType.Grille,
    'GRILLE': ICipherType.Grille,
    'GROMARK': ICipherType.Gromark,
    'GRONSFELD': ICipherType.Gronsfeld,
    'HEADLINES': ICipherType.Headlines,
    'HILL': ICipherType.Hill,
    'MIXED-KEY HOMOPHONIC': ICipherType.Homophonic,
    'HOMOPHONIC': ICipherType.Homophonic,
    'INCOMPLETE COLUMNAR': ICipherType.IncompleteColumnar,
    'INC. COLUMNAR TRANS': ICipherType.IncompleteColumnar,
    'INTERRUPTED KEY': ICipherType.InterruptedKey,
    'KEYPHRASE': ICipherType.KeyPhrase,
    'KEY PHRASE': ICipherType.KeyPhrase,
    'MONOME DINOME': ICipherType.MonomeDinome,
    'MONOME-DINOME': ICipherType.MonomeDinome,
    'MORBIT': ICipherType.Morbit,
    'MYSZKOWSKI': ICipherType.Myszkowski,
    'NICODEMUS': ICipherType.Nicodemus,
    'NIHILIST SUBSTITUTION': ICipherType.NihilistSubstitution,
    'NIHILIST SUBST': ICipherType.NihilistSubstitution,
    'NIHILIST TRANSPOSITION': ICipherType.NihilistTransposition,
    'NULL': ICipherType.Null,
    'NUMBERED KEY': ICipherType.NumberedKey,
    'PAT': ICipherType.Patristocrat,
    'PATRISTOCRAT': ICipherType.Patristocrat,
    'PERIODIC GROMARK': ICipherType.PeriodicGromark,
    'PIGPEN': ICipherType.PigPen,
    'PHILLIPS': ICipherType.Phillips,
    'PHILLIPSRC': ICipherType.PhillipsRC,
    '6X6 PLAYFAIR': ICipherType.Playfair,
    'PLAYFAIR': ICipherType.Playfair,
    'POLLUX': ICipherType.Pollux,
    'PORTA': ICipherType.Porta,
    'PORTAX': ICipherType.Portax,
    'PROGRESSIVE KEY': ICipherType.ProgressiveKey,
    'QUAGMIRE I': ICipherType.QuagmireI,
    'QUAGMIRE II': ICipherType.QuagmireII,
    'QUAGMIRE III': ICipherType.QuagmireIII,
    'QUAGMIRE IV': ICipherType.QuagmireIV,
    'RAGBABY': ICipherType.Ragbaby,
    'RAILFENCE': ICipherType.Railfence,
    'REDEFENCE': ICipherType.Redefence,
    'ROUTE TRANSPOSITION': ICipherType.RouteTransposition,
    'RSA': ICipherType.RSA,
    'RUNNING KEY': ICipherType.RunningKey,
    'SEQUENCET RANSPOSITION': ICipherType.SequenceTransposition,
    'SERIATED PLAYFAIR': ICipherType.SeriatedPlayfair,
    'SLIDEFAIR': ICipherType.Slidefair,
    'STANDARD': ICipherType.Standard,
    'SUDOKU': ICipherType.Sudoku,
    'SUDC': ICipherType.Sudoku,
    'SWAGMAN': ICipherType.Swagman,
    'SYLLABARY': ICipherType.Syllabary,
    'TAPCODE': ICipherType.TapCode,
    'TEST': ICipherType.Test,
    'TRIDIGITAL': ICipherType.Tridigital,
    'TRIFID': ICipherType.Trifid,
    'TRISQUARE': ICipherType.TriSquare,
    'TRI-SQUARE': ICipherType.TriSquare,
    'TWINBIFID': ICipherType.TwinBifid,
    'TWINTRIFID': ICipherType.TwinTrifid,
    'TWOSQUARE': ICipherType.TwoSquare,
    'TWO-SQUARE': ICipherType.TwoSquare,
    'VARIANT': ICipherType.Variant,
    'VIGENERE': ICipherType.Vigenere,
    'VIGENÈRE': ICipherType.Vigenere,
    'XENOCRYPT': ICipherType.Xenocrypt,
}
/**
 * CipherACAManage
 *    This shows a list of all tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Test Packet> <Answer Key> Test Title  #questions
 *  The command buttons available are
 *       <New Test><EXPORT><IMPORT>
 */
export class CipherACAManage extends CipherTest {
    public activeToolMode: toolMode = toolMode.aca;
    private importJSON = false

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'New Test', color: 'primary', id: 'newtest' },
        {
            title: 'Export All Issues',
            color: 'primary',
            id: 'export',
            download: true,
        },
        { title: "Import Digital Cons", color: "primary", id: "import" },
        { title: 'Import Saved Issue from File', color: 'primary', id: 'importjson' },
        { title: 'Import Saved Issue from URL', color: 'primary', id: 'importurl' },
        { title: "Delete Everything", color: "alert", id: "delall" },
    ];

    /* Boolean indicating that this is an active Scilympiad test */
    public isScilympiad: boolean = false;

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
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
        this.setMenuMode(menuMode.aca);
        $('.testlist').each((i, elem) => {
            $(elem).replaceWith(this.genTestList());
        });
        this.attachHandlers();
    }
    /**
     *
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });
        const testcount = this.getTestCount();
        if (testcount === 0) {
            result.append($('<h3>').text('No Tests Created Yet'));
            return result;
        }
        const table = new JTTable({ class: 'cell shrink testlist' });
        let row = table.addHeaderRow();
        row.add('Action')
            .add('Title')
            .add('Questions');

        for (let entry = 0; entry < testcount; entry++) {
            row = table.addBodyRow();
            const test = this.getTestEntry(entry);
            let questioncount = test.count;
            const buttons = $('<div/>', { class: 'button-group round shrink' });
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testedit button',
                }).text('Edit')
            );
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testcopy button',
                }).text('Duplicate')
            );
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testdel alert button',
                }).text('Delete')
            );
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testint button',
                }).text('Submit')
            );

            row.add($('<div/>', { class: 'grid-x' }).append(buttons))
                .add(test.title)
                .add(String(questioncount));
        }
        result.append(table.generate());
        return result;
    }
    public newTest(): void {
        const test = this.setTestEntry(-1, {
            timed: -1,
            count: 0,
            questions: [],
            title: 'New Test',
            useCustomHeader: false,
            customHeader: '',
            testtype: ITestType.None,
        });
        this.gotoEditTest(test);
    }
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

        link.attr('download', 'all_issues.json');
        link.attr('href', url);
    }
    /**
 * Import questions from a file or URL
 * @param useLocalData true indicates import from a file
 */
    public importData(useLocalData: boolean, useJSON: boolean): void {
        this.importJSON = useJSON
        if (useJSON) {
            $('#xmlFile').attr('accept', '.json')
        } else {
            $('#xmlFile').attr('accept', '.txt')
        }
        this.openXMLImport(useLocalData);
    }
    /**
     * Process the imported file
     * @param reader File to process
     */
    public processImport(file: File): void {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (e): void => {
            try {

                // If we are doing JSON t
                if (this.importJSON) {
                    const data = JSON.parse(e.target.result as string);
                    this.processTestXML(data);
                    this.updateOutput();
                } else {
                    this.parseDigitalCons(e.target.result as string);
                }
                $('#ImportFile').foundation('close');
            } catch (e) {
                $('#xmlerr').text('Not a valid import file');
            }
        };
    }

    /**
     * 
     * @param condata list of cons separated by blank lines
     */
    public parseDigitalCons(condata: string): void {
        const lines = (condata.replace(/Ø/g, "0") + "\n").split('\n')
        let isBlank = true
        let currentCipher = ""
        let cipherInfo = ""
        let title = ""
        let extra = ""
        let lastline = ""
        let cipherhint = ""
        const qlist: number[] = []
        for (const linein of lines) {
            let line = linein.trim()
            if (line.length === 0) {
                if (cipherInfo !== '') {
                    isBlank = true
                    // See if this is the digital cons line
                    if (currentCipher === '') {
                        if (cipherInfo.toUpperCase().match('DIGITAL *CON') !== null) {
                            title = cipherInfo
                            cipherInfo = '';
                        } else if (cipherInfo.toUpperCase().match(' SEE ') !== null) {
                            const parts = cipherInfo.split(' ')
                            let qnum = parts[0];
                            let cipherType = ICipherType.None;
                            let lang = 'en';
                            cipherInfo = cipherInfo.substring(qnum.length + 1)
                            qlist.push(this.addProblem(qnum, cipherType, lang, cipherInfo, '', '', ''))
                        } else {
                            cipherInfo = ''
                        }
                    } else {
                        // Figure out what question number this is. 
                        // qnum 
                        // A-<n>. 
                        // P-<n>.
                        // P-Sp-<n>.
                        // X-<n>.
                        // X-Sp-<n>.
                        // E-<n>.
                        // C-<n>.
                        // C-Sp-<n>.
                        // AC-<n>.
                        let qnum = "";
                        let lang = 'en';
                        const qnumdata = cipherInfo.match(/^([A-Z]+(-Sp-|-)[0-9]+\.)/g)
                        if (qnumdata != null) {
                            qnum = qnumdata[0]
                            cipherInfo = cipherInfo.substring(qnum.length).trim()
                        }
                        // If it is E X or AC then we have a description of the type of cipher
                        // if it is C then the cipher type is cryptarithm
                        // if it is A then the cipher type is Aristocrat
                        // if it is P then the cipher type is Patristocrat
                        let cipherType = ICipherType.None
                        let needType = true;
                        switch (qnum.substring(0, 1).toUpperCase()) {
                            case 'A':
                                if (qnum.substring(0, 2).toUpperCase() !== 'AC') {
                                    cipherType = ICipherType.Aristocrat;
                                    needType = false;
                                }
                                break
                            case 'C': cipherType = ICipherType.Cryptarithm;
                                break;
                            case 'X': cipherType = ICipherType.Xenocrypt;
                                break;
                            case 'P': cipherType = ICipherType.Patristocrat;
                                needType = false;
                                break;
                        }
                        let cipherTypeString = ""
                        if (needType) {
                            // Extract out the language/cipher type description string
                            const cipherpart = cipherInfo.match(/^[^\.]+\. /g)
                            if (cipherpart != null) {
                                cipherTypeString = ' ' + cipherpart[0].toUpperCase().replace('\.', ' ')
                            }
                            // Figure out what language it is in (if any)
                            for (const langkey in this.langmap) {
                                const langlook = ' ' + this.langmap[langkey].toUpperCase() + ' '
                                if (cipherTypeString.includes(langlook)) {
                                    lang = langkey;
                                    cipherTypeString = cipherTypeString.replace(langlook, '').trim();
                                    break;
                                }
                            }
                            // We should be left with just the description of the cipher
                            if (cipherTypeString !== '') {
                                const newCipherType = CipherTypeLookup[cipherTypeString.trim()]
                                if (newCipherType !== undefined) {
                                    cipherType = newCipherType;
                                    cipherTypeString = '';
                                }
                            }
                        }

                        if (cipherTypeString !== '' && cipherType !== ICipherType.Cryptarithm) {
                            console.log(`+++ Qnum=${qnum} cipherTypeString='${cipherTypeString}' cipherInfo=${cipherInfo}`)
                        }
                        // Extract the author from the end
                        let author = this.findAuthor(cipherInfo)
                        cipherInfo = cipherInfo.substring(0, cipherInfo.length - author.length).trim()
                        // Some of the ciphers have the extra information at the end
                        // (such as [Eng. key] or (uppgifter)
                        //  Basically while it ends in ] or ) we want to find the matching brace/bracked
                        while (currentCipher.match(/[\]\)] *$/) !== null) {
                            let extrainfo = currentCipher.match(/(\([^\(\)]+\)|\[[^\[\]]+\]) *$/g)
                            cipherInfo += ' ' + extrainfo[0]
                            currentCipher = currentCipher.substring(0, currentCipher.length - extrainfo[0].length).trim()
                        }
                        qlist.push(this.addProblem(qnum, cipherType, lang, cipherInfo, cipherhint, author, currentCipher))
                        currentCipher = "";
                        cipherInfo = "";
                        cipherhint = "";
                        lastline = "";
                    }
                }
            } else if (isBlank) {
                isBlank = false
                cipherInfo = line
                currentCipher = ""
                extra = ""
            } else {
                // See if they snuck in a line that is all lowercase (pt). 
                // In this case we want to not put it into the cipher, but we do want to keep it for the question so that
                // we can show them the mapping.
                if (line.match(/^[a-z ]+$/g) !== null && lastline !== "") {
                    cipherhint = lastline + "\n" + line;
                } else {
                    currentCipher += extra + line
                    extra = "\n"
                }
            }
            // Save it in case we need it for a subsequent line
            lastline = line
            //
        }
        let newTest: ITest = {
            title: title,
            useCustomHeader: false,
            customHeader: "",
            timed: null,
            count: qlist.length,
            questions: qlist,
            testtype: ITestType.None
        }
        let testnum = this.setTestEntry(-1, newTest)
        this.gotoEditTest(testnum);
    }

    /**
     * Parse out the author from the cipher.  Note that we have to deal with some special cases
     *   CERE E. US
     *   RIG R. MORTIS
     * @param cipherInfo The title string which should have the author at the end
     * @returns string Just the author part
     */
    public findAuthor(cipherInfo: string) {
        // let endpart = cipherInfo.toUpperCase().match(/[^A-Z] ([A-Z\-\.]+)$/g)
        let pieces = cipherInfo.split(/([^\w] )/g)
        // We know that the last piece is their name, but if the previous 
        // piece is '. ' and the one two before it is ') ' or '] ' then we probably have one of the special case names
        let npieces = pieces.length
        let author = pieces[npieces - 1]
        if (npieces > 5) {
            if (pieces[npieces - 2] === '. ' &&
                (pieces[npieces - 4] === '] ' || pieces[npieces - 4] === ') ')) {
                author = pieces[npieces - 3] + pieces[npieces - 2] + author
            }
        }
        return author
    }

    /**
     * 
     * @param qnum 
     * @param cipherType 
     * @param lang 
     * @param cipherInfo 
     * @param author 
     * @param currentCipher 
     * @returns 
     */
    public addProblem(qnum: string, cipherType: ICipherType, lang: string, cipherInfo: string, cipherhint: string, author: string, currentCipher: string): number {
        let questiontext = (cipherInfo + ' ' + author).trim()
        if (cipherhint !== '') {
            questiontext += "\n\n" + cipherhint
        }

        const state: IState = {
            qnum: qnum,
            cipherType: cipherType,
            cipherString: currentCipher,
            curlang: lang,
            question: questiontext,
            solution: "",
            author: author,
        }
        return this.setFileEntry(-1, state)
    }
    /**
     * Process imported XML
     */
    public importXML(data: any): void {
        this.processTestXML(data);
        this.updateOutput();
    }
    public importTests(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    public deleteTest(testid: number): void {
        let test = this.getTestEntry(testid)
        this.deleteTestEntry(testid);
        let todel = test.questions
        todel.sort((one, two) => (one > two ? -1 : 1));
        for (const entry of todel) {
            this.deleteFileEntry(entry)
        }
        this.updateOutput();
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
                let testCount = this.getTestCount();
                for (let entry = testCount - 1; entry >= 0; entry--) {
                    this.deleteTestEntry(entry)
                }
                $("#delalldlg").foundation("close");
                this.updateOutput();
            });
        $("#okdel").removeAttr("disabled");
        $("#delalldlg").foundation("open");
    }
    /**
    * Create the hidden dialog asking about deleting all problems
    * @returns HTML DOM Element for dialog
    */
    private createDeleteAllDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout alert",
        }).text(
            "This will delete all loaded problems.  Are you sure you want to do this?"
        );
        let DeleteAllDlg = JTFDialog(
            "delalldlg",
            "Delete Everything",
            dlgContents,
            "okdel",
            "Yes, Delete them!"
        );
        return DeleteAllDlg;
    }
    /**
     * Creates the hidden dialog for selecting a file to import
     */
    public createImportFileDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            id: 'importstatus',
            class: 'callout secondary',
        })
            .append(
                $('<label/>', {
                    for: 'xmlFile',
                    class: 'impfile button',
                }).text('Select File')
            )
            .append(
                $('<input/>', {
                    type: 'file',
                    id: 'xmlFile',
                    accept: '.txt',
                    class: 'impfile show-for-sr',
                })
            )
            .append(
                $('<span/>', {
                    id: 'xmltoimport',
                    class: 'impfile',
                }).text('No File Selected')
            )
            .append(
                JTFLabeledInput('URL', 'text', 'xmlurl', '', 'impurl small-12 medium-6 large-6')
            )
            .append(
                $('<div/>', {
                    id: 'xmlerr',
                    class: 'callout alert',
                }).hide());
        const importDlg = JTFDialog(
            'ImportFile',
            'Import Test Data',
            dlgContents,
            'okimport',
            'Import'
        );
        return importDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     */
    public createMainMenu(): JQuery<HTMLElement> {
        let result = super.createMainMenu();
        result
            .append(this.createDeleteAllDlg());
        return result;
    }

    public attachHandlers(): void {
        super.attachHandlers();
        $('#newtest')
            .off('click')
            .on('click', (e) => {
                this.newTest();
            });
        $('#export')
            .off('click')
            .on('click', (e) => {
                this.exportAllTests($(e.target));
            });
        $("#import")
            .off("click")
            .on("click", () => {
                this.importData(true, false);
            });
        $("#importjson")
            .off("click")
            .on("click", () => {
                this.importData(true, true);
            });
        $("#importurl")
            .off("click")
            .on("click", () => {
                this.importData(false, true);
            });

        $("#delall")
            .off("click")
            .on("click", e => {
                this.gotoDeleteAllCiphers();
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
        $('.testedit')
            .off('click')
            .on('click', (e) => {
                this.gotoEditTest(Number($(e.target).attr('data-entry')));
            });
        $('.testdel')
            .off('click')
            .on('click', (e) => {
                this.deleteTest(Number($(e.target).attr('data-entry')));
            });
    }
}
