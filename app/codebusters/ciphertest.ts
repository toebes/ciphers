import { cloneObject, NumberMap } from '../common/ciphercommon';
import {
    CipherHandler,
    IRunningKey,
    IState,
    ITest,
    ITestType,
    toolMode,
    IQuestionData,
} from '../common/cipherhandler';
import { getCipherTitle, ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { CipherPrintFactory } from './cipherfactory';

export interface buttonInfo {
    title: string;
    btnClass: string;
    disabled?: boolean;
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
    /** Which division they are doing the test for */
    testtype?: ITestType;
    /** UID of the interactive test to run  */
    testID?: string;
}

interface INewCipherEntry {
    cipherType: ICipherType;
    /** Optional language string */
    lang?: string;
    /** Optional title to override the default title */
    title?: string;
}

interface ITestTypeInfo {
    title: string;
    type: ITestType;
    id: string;
}

export type ITestDisp = 'testedit' | 'testprint' | 'testans' | 'testsols' | 'testint';
export type ITestManage = 'local' | 'published';
/**
 * Base support for all the test generation handlers
 * There are five pages that need to be created
 * TestManage.html
 *    This shows a list of all tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Test Packet> <Answer Key> Test Title  #questions
 *  The command buttons availableare
 *       <New Test><EXPORT><IMPORT>
 *
 * TestGenerator.html?test=<n>
 *    This edits a specific test.  It requires a test number.  If none
 *    is given, it defaults to the first test.  If there is no test,
 *    it says so and gives a link back to the TestManage.html page
 *    The top shows the list of questions included on the current test in the
 *    test order with the timed question first as a table 6 columns
 *       Question# action          Type   Points    Question    Cipher Text
 *        #        <edit><remove>  <type> <points>  <question>  <ciphertext>
 *  Below that is another list of questions to be added to the test
 *       action         Type     Points    Question    Cipher Text
 *       <edit><add>    <type>   <points>  <question>  <ciphertext>
 *  The command buttons availableare
 *    <Generate Test><Generate Answers><Save><Export><IMPORT>
 *
 *  TestQuestions.html
 *    This shows all the questions available
 *      Action         Type     Points     Question   Cipher Text
 *      <EDIT><DELETE> <type>   <points>   <question> <ciphertext>
 *  The command buttons available are
 *      <EXPORT><IMPORT>
 *
 *  TestPrint.html?test=<n>
 *  Displays a printable version of test <n> if it exists (default 0).
 *  Otherwise it provies a link back to TestManage.html
 *
 *  TestAnswers.html?test=<n>
 */
export class CipherTest extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.None,
        testtype: ITestType.None,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'New Test', color: 'primary', id: 'newtest' },
        {
            title: 'Export Tests',
            color: 'primary',
            id: 'export',
            disabled: true,
        },
        { title: 'Import Tests from File', color: 'primary', id: 'import' },
        { title: 'Import Tests from URL', color: 'primary', id: 'importurl' },
    ];

    public testTypeMap: ITestTypeInfo[] = [
        {
            title: 'C (High School) - Invitational/Regional',
            type: ITestType.cregional,
            id: 'cregional'
        },
        {
            title: 'C (High School) - State/National',
            type: ITestType.cstate,
            id: 'cstate'
        },
        {
            title: 'B (Middle School) - Invitational/Regional',
            type: ITestType.bregional,
            id: 'bregional'
        },
        {
            title: 'B (Middle School) - State/National',
            type: ITestType.bstate,
            id: 'bstate'
        },
        {
            title: 'A (Elementary School) - Invitational/Regional',
            type: ITestType.aregional,
            id: 'aregional'
        }];
    public cipherChoices: INewCipherEntry[] = [
        { cipherType: ICipherType.Affine },
        { cipherType: ICipherType.Caesar },
        { cipherType: ICipherType.Atbash },
        { cipherType: ICipherType.Aristocrat },
        {
            cipherType: ICipherType.Aristocrat,
            lang: 'es',
            title: 'Spanish Aristocrat',
        },
        { cipherType: ICipherType.Patristocrat },
        { cipherType: ICipherType.Hill },
        { cipherType: ICipherType.Vigenere },
        { cipherType: ICipherType.RunningKey },
        { cipherType: ICipherType.Baconian },
        { cipherType: ICipherType.RSA },
        { cipherType: ICipherType.PigPen },
        { cipherType: ICipherType.TapCode },
        { cipherType: ICipherType.Morbit },
        { cipherType: ICipherType.Pollux },
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
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.setUIDefaults();
        this.updateOutput();
    }
    public genTestEditState(testdisp: ITestDisp): JQuery<HTMLElement> {
        let radiobuttons = [
            { title: 'Edit Test', value: 'testedit' },
            { title: 'Test Packet', value: 'testprint' },
            { title: 'Answer Key', value: 'testans' },
            { title: 'Answers and Solutions', value: 'testsols' },
            { title: 'Interactive Test', value: 'testint' },
        ];
        return JTRadioButton(8, 'testdisp', radiobuttons, testdisp);
    }
    /**
     * getInteractiveURI gets the URI to call for the interactive collaboration.
     * It defaults to a public server, but can be overridded with a local configuration value stored in "domain"
     * @returns string corresponding to the interactive API to call
     */
    public getInteractiveURI(): string {
        // return this.getConfigString("domain", "https://codebusters.alyzee.org/") +
        return this.getConfigString("domain", "http://toebeshome.myqnapcloud.com:7630/") +
            "api/realtime/convergence/scienceolympiad";
    }
    /**
     * Report an error to the user.  This creates a closable warning box placed into the ans section
     * @param msg Error message to display
     */
    public reportFailure(msg: string) {
        console.log(msg);
        $(".ans").append($("<div/>", { class: "callout warning", "data-closable": "" })
            .append($("<p/>").text(msg))
            .append($("<button/>", { class: "close-button", "aria-label": "Dismiss alert", type: "button", "data-close": "" }).append($("<span/>", { "aria-hidden": "true" }).html("&times;"))));
    }
    /**
     * Put up the test management radio button for selecting which tests to view.
     * @param testmanage State
     */
    public genTestManageState(testmanage: ITestManage): JQuery<HTMLElement> {
        let radiobuttons = [
            { title: 'Local', value: 'local' },
            { title: 'Published', value: 'published' },
        ];
        return JTRadioButton(8, 'testmanage', radiobuttons, testmanage);
    }

    public setTestEditState(testdisp: ITestDisp): void {
        JTRadioButtonSet('testdisp', testdisp);
    }
    public mapTestTypeString(id: string): ITestType {
        let result = ITestType.None;
        for (let entry of this.testTypeMap) {
            if (entry.id === id) {
                result = entry.type;
                break;
            }
        }
        return result;
    }
    public mapTestTypeID(testtype: ITestType): string {
        let result = "";
        for (let entry of this.testTypeMap) {
            if (entry.type === testtype) {
                result = entry.id;
                break;
            }
        }
        return result;
    }
    public setTestType(testtype: ITestType): boolean {
        let changed = false;
        let test = this.getTestEntry(this.state.test);
        if (testtype !== test.testtype) {
            changed = true;
            test.testtype = testtype;
            this.setTestEntry(this.state.test, test);
        }
        return changed;
    }
    public checkXMLImport(): void {
        if (this.state.importURL !== undefined) {
            if (this.state.importURL !== '') {
                let url = this.state.importURL;
                $.getJSON(url, data => {
                    this.importXML(data);
                }).fail(() => {
                    alert('Unable to load file ' + url);
                });
            }
        }
    }
    public newTest(): void {
        this.setTestEntry(-1, {
            timed: -1,
            count: 0,
            questions: [],
            title: 'New Test',
            useCustomHeader: false,
            customHeader: '',
            testtype: ITestType.None,
        });
        location.reload();
    }
    public exportTests(): void { }
    public importTests(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    public gotoEditTest(test: number): void {
        location.assign('TestGenerator.html?test=' + String(test));
    }
    /**
     * generateTestData converts the current test information to a map which can be saved/restored later
     * @param test Test to generate data for
     * @returns string form of the JSON for the test
     */
    public generateTestData(test: ITest): any {
        let result = {};
        result["TEST.0"] = test;

        if (test.timed !== -1) {
            result["CIPHER." + String(test.timed)] = this.getFileEntry(
                test.timed
            );
        }
        for (let entry of test.questions) {
            result["CIPHER." + String(entry)] = this.getFileEntry(entry);
        }
        return result;
    }
    /**
     * generateTestJSON converts the current test information to a JSON string
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
        let testdata = this.getTestEntry(test);
        testdata.title = 'DUP ' + testdata.title;
        if (testdata.timed !== -1) {
            let entry = this.getFileEntry(testdata.timed);
            entry.question = 'DUP ' + entry.question;
            testdata.timed = this.setFileEntry(-1, entry);
        }
        for (let i in testdata.questions) {
            let entry = this.getFileEntry(testdata.questions[i]);
            entry.question = 'DUP ' + entry.question;
            testdata.questions[i] = this.setFileEntry(-1, entry);
        }
        let newtest = this.setTestEntry(-1, testdata);
        location.assign('TestGenerator.html?test=' + String(newtest));
    }
    public deleteTest(test: number): void {
        this.deleteTestEntry(test);
        location.reload();
    }
    public gotoPrintTest(test: number): void {
        location.assign('TestPrint.html?test=' + String(test));
    }
    public gotoPrintTestAnswers(test: number): void {
        location.assign('TestAnswers.html?test=' + String(test));
    }
    public gotoPrintTestSols(test: number): void {
        location.assign('TestAnswers.html?test=' + String(test) + '&sols=y');
    }
    public gotoInteractiveTest(test: number): void {
        location.assign('TestInteractive.html?test=' + String(test));
    }
    public gotoTestPublished(): void {
        location.assign('TestPublished.html');
    }
    public gotoTestLocal(): void {
        location.assign('TestManage.html');
    }
    public gotoTestDisplay(testdisp: ITestDisp): void {
        switch (testdisp) {
            case 'testans':
                this.gotoPrintTestAnswers(this.state.test);
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
            case 'testint':
                this.gotoInteractiveTest(this.state.test);
                break;
        }
    }
    public gotoTestManage(testmanage: ITestManage): void {
        switch (testmanage) {
            case 'published':
                this.gotoTestPublished();
                break;
            default:
            case 'local':
                this.gotoTestLocal();
                break;
        }
    }

    public gotoEditCipher(entry: number): void {
        let entryURL = this.getEntryURL(entry);
        if (entryURL !== '') {
            location.assign(entryURL);
        } else {
            alert('No editor found');
        }
    }
    public genQuestionTable(
        filter: number,
        buttons: buttonInfo[]
    ): JQuery<HTMLElement> {
        // Figure out what items we will not display if they gave us a filter
        let useditems: { [index: string]: boolean } = {};
        if (filter !== undefined) {
            let test = this.getTestEntry(this.state.test);
            if (test.timed !== -1) {
                useditems[test.timed] = true;
            }
            for (let entry of test.questions) {
                useditems[entry] = true;
            }
        }

        let testcount = this.getTestCount();
        let testuse: { [index: string]: JQuery<HTMLElement> } = {};
        let testNames: NumberMap = {};

        // Figure out what tests each entry is used with
        for (let testent = 0; testent < testcount; testent++) {
            let test = this.getTestEntry(testent);
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
            for (let entry of test.questions) {
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

        let result = $('<div/>', { class: 'questions' });

        let cipherCount = this.getCipherCount();
        let table = new JTTable({ class: 'cell stack queslist' });
        let row = table.addHeaderRow();
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
     * @param id HTML id of the generated dropdown
     * @param title Title text for the generated dropdown
     */
    public genTestTypeDropdown(
        id: string,
        title: string,
        testtype: ITestType
    ): JQuery<HTMLElement> {
        let inputgroup = $('<div/>', {
            class: 'input-group cell small-12 medium-12 large-12',
        });
        $('<span/>', { class: 'input-group-label' })
            .text(title)
            .appendTo(inputgroup);
        let select = $('<select/>', {
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

        for (let entry of this.testTypeMap) {
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
     * @param id HTML id of the generated dropdown
     * @param title Title text for the generated dropdown
     */
    public genNewCipherDropdown(
        id: string,
        title: string,
        testtype: ITestType
    ): JQuery<HTMLElement> {
        let inputgroup = $('<div/>', {
            class: 'input-group cell small-12 medium-12 large-12',
        });
        $('<span/>', { class: 'input-group-label' })
            .text(title)
            .appendTo(inputgroup);
        let select = $('<select/>', {
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
        for (let entry of this.cipherChoices) {
            // Make sure that this type of cipher is legal for this type of test
            let cipherhandler = CipherPrintFactory(entry.cipherType, entry.lang);
            if (cipherhandler.CheckAppropriate(testtype) === '') {
                let option = $('<option />', {
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
        let test = this.getTestEntry(this.state.test);
        cipherCount -= test.questions.length;
        if (test.timed !== -1) {
            cipherCount--;
        }
        if (cipherCount > 0) {
            select.append(
                $('<option/>', { value: ICipherType.None }).html(
                    '**Choose Existing Cipher**'
                )
            );
        }
        inputgroup.append(select);
        return inputgroup;
    }
    public addQuestionRow(
        table: JTTable,
        order: number,
        qnum: number,
        buttons: buttonInfo[],
        showPlain: boolean,
        testtype: ITestType,
        prevuse: any
    ): void {
        let ordertext = 'Timed';
        let plainclass = '';
        if (!showPlain) {
            plainclass = 'qplain';
        }
        let extratext = '';
        if (order === -1) {
            extratext =
                '  When you have solved it, raise your hand so that the time can be recorded and the solution checked.';
        } else {
            ordertext = String(order);
        }
        let row = table.addBodyRow();
        // We have a timed question on everything except the Division A
        if (order === -1 && qnum === -1 && testtype !== ITestType.aregional) {
            let callout = $('<div/>', {
                class: 'callout warning',
            }).text('No Timed Question!  Add one from below');
            callout.append(
                this.genNewCipherDropdown('addnewtimed',
                    'New Timed Question', testtype)
            );
            row.add({
                celltype: 'td',
                settings: { colspan: 6 },
                content: callout,
            });
        } else {
            let qerror = '';
            row.add(ordertext);
            let state = this.getFileEntry(qnum);
            if (state === null) {
                state = {
                    cipherType: ICipherType.None,
                    points: 0,
                    cipherString: '',
                };
            }
            if (testtype === ITestType.aregional && order === -1) {
                qerror = 'Timed question not allowed for ' +
                    this.getTestTypeName(testtype);
            } else if (testtype !== undefined) {
                // If we know the type of test, see if it has any problems with the question
                let cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
                cipherhandler.restore(state);
                qerror = cipherhandler.CheckAppropriate(testtype);
                if (qerror !== '') {
                    if (order === -1) {
                        qerror = 'Timed question: ' + qerror;
                    } else {
                        qerror = 'Question ' + ordertext + ': ' + qerror;
                    }
                }
            }
            let buttonset = $('<div/>', {
                class: 'button-group round shrink',
            });
            for (let btninfo of buttons) {
                let button = $('<button/>', {
                    'data-entry': order,
                    type: 'button',
                    class: btninfo.btnClass + ' button',
                }).html(btninfo.title);
                if (btninfo.disabled === true) {
                    button.attr('disabled', 'disabled');
                }
                buttonset.append(button);
            }
            row.add($('<div/>', { class: 'grid-x' }).append(buttonset)).add(
                state.cipherType
            );
            if (prevuse !== undefined) {
                row.add(prevuse);
            }
            row.add(String(state.points))
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
            if (qerror !== '') {
                row = table.addBodyRow();
                let callout = $('<div/>', {
                    class: 'callout alert',
                }).text(qerror);
                row.add({
                    celltype: 'td',
                    settings: { colspan: 6 },
                    content: callout,
                });
            }
        }
        return;
    }
    public AddTestError(qnum: number, message: string): void {
        if (message !== "") {
            let qtxt = 'Timed Question: ';
            if (qnum !== -1) {
                qtxt = "Question " + String(qnum) + ": ";
            }
            let callout = $('<div/>', {
                class: 'callout alert',
            }).text(qtxt + message);
            $(".testerrors").append(callout);
        }
    }
    public GetPrintFactory(question: number): CipherHandler {
        let state = this.getFileEntry(question);
        let cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        return cipherhandler;
    }
    /**
     * Generate a printable answer for a test entry.
     * An entry value of -1 is for the timed question
     */
    public printTestAnswer(
        testType: ITestType,
        qnum: number,
        handler: CipherHandler,
        extraclass: string,
        printSolution: boolean
    ): JQuery<HTMLElement> {
        let state = handler.state;
        let extratext = '';
        let result = $('<div/>', {
            class: 'question ' + extraclass,
        });
        let qtext = $('<div/>', { class: 'qtext' });
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
        let cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        // Remember this question points so we can generate the tiebreaker order
        this.qdata.push({ qnum: qnum, points: state.points });
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
        let state = handler.state;
        let extratext = '';
        let result = $('<div/>', {
            class: 'question ' + extraclass,
        });
        let qtext = $('<div/>', { class: 'qtext' });
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
        let cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
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
        this.qdata.push({ qnum: qnum, points: state.points });
        result.append(cipherhandler.genQuestion(testType));
        return result;
    }
    /**
     * Compare two arbitrary objects to see if they are equivalent
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
            for (let elem of a) {
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
     */
    public isSameCipher(state1: IState, state2: IState): boolean {
        // Make sure every element in state1 that is non empty is also in state 2
        for (let elem in state1) {
            if (!this.isEquivalent(state1[elem], state2[elem])) {
                return false;
            }
        }
        // And do the same for everything in reverse
        for (let elem in state2) {
            if (!this.isEquivalent(state2[elem], state1[elem])) {
                return false;
            }
        }
        return true;
    }
    public findTest(newTest: ITest): number {
        // Go through all the tests and build a structure holding them that we will convert to JSON
        let testcount = this.getTestCount();
        for (let testnum = 0; testnum < testcount; testnum++) {
            let test = this.getTestEntry(testnum);
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

    // tslint:disable-next-line:cyclomatic-complexity
    public processTestXML(data: any): void {
        // Load in all the ciphers we know of so that we don't end up doing a duplicate
        let cipherCount = this.getCipherCount();
        let cipherCache: { [index: number]: IState } = {};
        let inputMap: NumberMap = {};
        for (let entry = 0; entry < cipherCount; entry++) {
            cipherCache[entry] = this.getFileEntry(entry);
        }
        // First we get all the ciphers defined and add them to the list of ciphers
        for (let ent in data) {
            let pieces = ent.split('.');
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
                let oldPos = Number(pieces[1]);
                let toAdd: IState = data[ent];
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
                    let newval = this.setFileEntry(-1, toAdd);
                    cipherCache[newval] = toAdd;
                    inputMap[String(oldPos)] = newval;
                    cipherCount++;
                }
            }
        }
        // Now that we have all the ciphers in, we can go back and add the tests
        for (let ent in data) {
            let pieces = ent.split('.');
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
                let newTest: ITest = data[ent];
                // Go through and fix up all the entries.  First the timed question
                if (
                    newTest.timed !== -1 &&
                    inputMap[newTest.timed] !== undefined
                ) {
                    newTest.timed = inputMap[newTest.timed];
                } else {
                    newTest.timed = -1;
                }
                // and then all of the entries
                for (let entry = 0; entry < newTest.questions.length; entry++) {
                    if (inputMap[newTest.questions[entry]] !== undefined) {
                        newTest.questions[entry] =
                            inputMap[newTest.questions[entry]];
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
    public attachHandlers(): void {
        super.attachHandlers();
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
            .on('click', e => {
                this.gotoEditCipher(Number($(e.target).attr('data-entry')));
            });
        $('[name="testdisp"]')
            .off('click')
            .on('click', e => {
                $(e.target)
                    .siblings()
                    .removeClass('is-active');
                $(e.target).addClass('is-active');
                this.gotoTestDisplay($(e.target).val() as ITestDisp);
                this.updateOutput();
            });
        $('[name="testmanage"]')
            .off('click')
            .on('click', e => {
                $(e.target)
                    .siblings()
                    .removeClass('is-active');
                $(e.target).addClass('is-active');
                this.gotoTestManage($(e.target).val() as ITestManage);
                this.updateOutput();
            });
    }
}
