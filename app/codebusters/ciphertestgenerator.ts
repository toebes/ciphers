import 'foundation-sites';
import { cloneObject } from '../common/ciphercommon';
import { IState, ITest, ITestType, menuMode, toolMode } from '../common/cipherhandler';
import { getCipherTitle, ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { buttonInfo, CipherTest, ITestState } from './ciphertest';

/**
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
 *    <Generate Test><Generate Answers><Export><IMPORT>
 */
export class CipherTestGenerator extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public showPlain = false;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.None,
        test: 0,
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Randomize Order', color: 'primary', id: 'randomize' },
        { title: 'Hide Custom Header', color: 'primary', id: 'hide-custom-header' },
        { title: 'Show Custom Header', color: 'primary', id: 'show-custom-header' },
        { title: 'Adjust Scores', color: 'primary', id: 'adjust' },
        { title: 'Export Test', color: 'primary', id: 'export' },
        { title: 'Import Tests from File', color: 'primary', id: 'import' },
        { title: 'Import Tests from URL', color: 'primary', id: 'importurl' },
    ];
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
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestEditState('testedit');
    }
    public genTestQuestions(test: ITest): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testdata' });
        const testcount = this.getTestCount();
        let SpanishCount = 0;
        let SpecialBonusCount = 0;
        if (testcount === 0) {
            result.append($('<h3>').text('No Tests Created Yet'));
            return result;
        }
        if (this.state.test > testcount) {
            result.append($('<h3>').text('Test not found'));
            return result;
        }

        const testdiv = $('<div/>', { class: 'callout primary' });

        testdiv.append(
            JTFLabeledInput('Title', 'text', 'title', test.title, 'small-12 medium-12 large-12')
        );

        if (test.useCustomHeader) {
            testdiv.append(
                JTFLabeledInput(
                    'Custom Header',
                    'textarea',
                    'custom-header-input',
                    test.customHeader,
                    'small-12 medium-12 large-12'
                )
            );
        }

        const testTypeBox = $('<div/>', { class: 'grid-x grid-margin-x' });
        testTypeBox.append(
            this.genTestTypeDropdown('testtype',
                'Test Type',
                test.testtype,
                'input-group cell small-12 medium-8 large-6'));
        testTypeBox.append(JTFLabeledInput(
            'Check Paper',
            'checkbox',
            'ckpaper',
            test.checkPaper,
            'small-12 medium-4 large-6'
        ));
        testdiv.append(testTypeBox);

        const table = new JTTable({ class: 'cell stack queslist' });
        const row = table.addHeaderRow();
        row.add('Question')
            .add('Action')
            .add('Type')
            .add('Points')
            .add('Question');
        if (this.showPlain) {
            row.add('Plain Text');
        } else {
            row.add(
                $('<span/>')
                    .append('Plain Text ')
                    .append($('<a/>', { id: 'showplain' }).text('(show)'))
            );
        }
        const buttons: buttonInfo[] = [
            { title: 'Edit', btnClass: 'quesedit' },
            { title: 'Remove', btnClass: 'quesremove alert' },
        ];
        // If the test has a timed question, then put it.  Note that
        // The Division A doesn't have a timed question, but if someone
        // snuck one in, we have to show it.
        if (test.timed !== -1 || test.testtype !== ITestType.aregional) {
            let qstate = this.addQuestionRow(
                table,
                -1,
                test.timed,
                buttons,
                this.showPlain,
                test.testtype,
                undefined
            );
            if (qstate !== undefined) {
                if (qstate.curlang === 'es') { SpanishCount++; }
                if (qstate.specialbonus) { SpecialBonusCount++; }
            }
        }
        for (let entry = 0; entry < test.count; entry++) {
            const buttons2: buttonInfo[] = [
                { title: '&uarr;', btnClass: 'quesup', disabled: entry === 0 },
                {
                    title: '&darr;',
                    btnClass: 'quesdown',
                    disabled: entry === test.count - 1,
                },
                { title: 'Edit', btnClass: 'quesedit' },
                { title: 'Remove', btnClass: 'quesremove alert' },
            ];
            let qstate = this.addQuestionRow(
                table,
                entry + 1,
                test.questions[entry],
                buttons2,
                this.showPlain,
                test.testtype,
                undefined
            );
            if (qstate !== undefined) {
                if (qstate.curlang === 'es') { SpanishCount++; }
                if (qstate.specialbonus) { SpecialBonusCount++; }
            }
        }
        if (test.count === 0) {
            const callout = $('<div/>', {
                class: 'callout warning',
            }).text('No Questions!  Add from below');
            table.addBodyRow().add({
                celltype: 'td',
                settings: { colspan: 6 },
                content: callout,
            });
        }
        const dropdown = this.genNewCipherDropdown('addnewques', 'New Question', test.testtype);
        table.addBodyRow().add({
            celltype: 'td',
            settings: { colspan: 6 },
            content: dropdown,
        });
        const errors: string[] = [];
        $('.testerrors').empty();


        /**
         * See if we need to show/hide the Spanish Hints
         */
        if (SpanishCount > 0) {
            if (SpanishCount > 1) {
                if (test.testtype !== ITestType.bstate && test.testtype !== ITestType.cstate) {
                    errors.push(
                        'Only one Spanish Xenocrypt allowed for ' +
                        this.getTestTypeName(test.testtype) +
                        '.'
                    );
                }
            } else if (test.testtype === ITestType.cstate) {
                errors.push(
                    this.getTestTypeName(test.testtype) +
                    ' is supposed to have at least two Spanish Xenocrypts.'
                );
            }
            $('.xenocryptfreq').show();
        } else {
            if (test.testtype === ITestType.bstate || test.testtype === ITestType.cstate) {
                errors.push(
                    this.getTestTypeName(test.testtype) +
                    ' is supposed to have at least one Spanish Xenocrypt.'
                );
            }
            $('.xenocryptfreq').hide();
        }
        if (SpecialBonusCount > 3) {
            errors.push('No more than three special bonus questions allowed on ' + this.getTestTypeName(test.testtype))
        }
        if (errors.length === 1) {
            $('.testerrors').empty().append(
                $('<div/>', {
                    class: 'callout alert',
                }).text(errors[0])
            );
        } else if (errors.length > 1) {
            const ul = $('<ul/>');
            for (const msg of errors) {
                ul.append($('<li/>').text(msg));
            }
            $('.testerrors').empty().append(
                $('<div/>', {
                    class: 'callout alert',
                })
                    .text('The following errors were found:')
                    .append(ul)
            );
        }

        testdiv.append(table.generate());
        // Put in buttons for adding blank tests of various types..
        result.append(testdiv);
        return result;
    }
    public exportTest(link: JQuery<HTMLElement>): void {
        const test = this.getTestEntry(this.state.test);
        const blob = new Blob([this.generateTestJSON(test)], {
            type: 'text/json',
        });
        const url = URL.createObjectURL(blob);

        link.attr('download', test.title + '.json');
        link.attr('href', url);
    }
    public createEmptyQuestion(ciphertype: ICipherType, reqlang: string, fortimed: boolean): void {
        let lang = reqlang;
        if (lang === undefined || lang === '') {
            lang = 'en';
        }
        const state: IState = {
            cipherType: ciphertype,
            points: 0,
            question: 'Solve this',
            cipherString: '',
            curlang: lang,
        };
        const entry = this.setFileEntry(-1, state);
        if (fortimed) {
            this.gotoSetTimedCipher(entry);
        } else {
            this.gotoAddCipher(entry);
        }
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        const test = this.getTestEntry(this.state.test);
        this.setMenuMode(menuMode.test);
        if (test.useCustomHeader) {
            $('#show-custom-header').hide();
            $('#hide-custom-header').show();
            $('#custom-header-input').show();
        } else {
            $('#show-custom-header').show();
            $('#hide-custom-header').hide();
            $('#custom-header-input').hide();
        }
        $('.testdata').each((i, elem) => {
            $(elem).replaceWith(this.genTestQuestions(test));
        });
        this.attachHandlers();
    }
    public setTitle(title: string): boolean {
        let changed = false;
        const test = this.getTestEntry(this.state.test);
        if (test.title !== title) {
            changed = true;
            test.title = title;
            this.setTestEntry(this.state.test, test);
        }
        return changed;
    }
    public setCustomHeader(customHeader: string): boolean {
        let changed = false;
        const test = this.getTestEntry(this.state.test);
        if (test.customHeader !== customHeader) {
            changed = true;
            test.customHeader = customHeader;
            this.setTestEntry(this.state.test, test);
        }
        return changed;
    }
    public manageCustomHeaderButtons(e: string): void {
        const test = this.getTestEntry(this.state.test);
        if (e === 'default') {
            test.useCustomHeader = false;
        } else {
            test.useCustomHeader = true;
        }
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    public gotoAddCipher(entry: number): void {
        const test = this.getTestEntry(this.state.test);
        test.count++;
        test.questions.push(entry);
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    public gotoSetTimedCipher(entry: number): void {
        const test = this.getTestEntry(this.state.test);
        test.timed = entry;
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    public gotoEditTestCipher(entry: number): void {
        const test = this.getTestEntry(this.state.test);
        let editEntry = -1;
        if (entry === -1) {
            editEntry = test.timed;
        } else {
            entry--;
            if (entry < test.count) {
                editEntry = test.questions[entry];
            }
        }
        if (editEntry !== -1) {
            this.gotoEditCipher(editEntry);
        }
    }
    public gotoMoveTestCipher(entry: number, dist: number): void {
        const test = this.getTestEntry(this.state.test);
        const sourceent = entry - 1;
        const toswap = sourceent + dist;
        if (sourceent < 0 || toswap < 0 || sourceent >= test.count || toswap >= test.count) {
            return;
        }
        const save = test.questions[sourceent];
        test.questions[sourceent] = test.questions[toswap];
        test.questions[toswap] = save;
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    /**
     * Populate the file list dialog to match all the entries of a given type
     */
    public getFileList(ciphertype: ICipherType): JQuery<HTMLElement> {
        let result = null;
        const cipherCount = this.getCipherCount();
        $('#okopen').attr('disabled', 'disabled');
        if (cipherCount === 0) {
            result = $('<div/>', {
                class: 'callout warning filelist',
                id: 'files',
            }).text('No files found');
        } else {
            // Figure out what items we will not display if they gave us a filter
            const useditems: { [index: string]: boolean } = {};
            const test = this.getTestEntry(this.state.test);
            if (test.timed !== -1) {
                useditems[test.timed] = true;
            }
            for (const entry of test.questions) {
                useditems[entry] = true;
            }

            result = $('<select/>', {
                id: 'files',
                class: 'filelist',
                size: 10,
            });
            for (let entry = 0; entry < cipherCount; entry++) {
                if (!useditems[entry]) {
                    const fileEntry = this.getFileEntry(entry);
                    let entryText = '[' + String(entry) + ']:';
                    entryText += '(' + getCipherTitle(fileEntry.cipherType) + ') ';
                    if (
                        fileEntry.question !== '' &&
                        this.storageCipherEntryPrefix.substr(0, 1) === 'A'
                    ) {
                        entryText += fileEntry.question;
                    } else if (fileEntry.cipherString !== '') {
                        entryText += fileEntry.cipherString;
                    } else {
                        entryText += fileEntry.question;
                    }
                    result.append(
                        $('<option />', {
                            value: entry,
                        }).html(entryText)
                    );
                }
            }
        }
        return result;
    }

    /**
     * Put up a dialog to select a cipher to load
     */
    public addExistingCipher(isTimed: boolean): void {
        // Populate the list of known files.
        if (isTimed) {
            $('#OpenFile .dlgtitle').text('Select existing cipher for Timed Question');
        } else {
            $('#OpenFile .dlgtitle').text('Select existing cipher to add');
        }
        $('#files').replaceWith(this.getFileList(this.state.cipherType));
        $('#files')
            .off('change')
            .on('change', (e) => {
                $('#okopen').removeAttr('disabled');
            });
        $('#okopen').attr('disabled', 'disabled');
        $('#okopen')
            .off('click')
            .on('click', (e) => {
                const entry = Number($('#files option:selected').val());
                $('#OpenFile').foundation('close');
                if (isTimed) {
                    this.gotoSetTimedCipher(entry);
                } else {
                    this.gotoAddCipher(entry);
                }
            });
        $('#OpenFile').foundation('open');
    }
    public gotoRemoveCipher(entry: number): void {
        const test = this.getTestEntry(this.state.test);
        if (entry === -1) {
            test.timed = -1;
        } else {
            entry--;
            if (entry < test.count) {
                test.questions.splice(entry, 1);
                test.count--;
            }
        }
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    /** From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array */
    public shuffle(array: any[]): any[] {
        let currentIndex = array.length;
        // While there remain elements to shuffle...
        while (currentIndex !== 0) {
            // Pick a remaining element...
            const randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            const temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }
    public gotoRandomizeTest(): void {
        const test = this.getTestEntry(this.state.test);
        test.questions = this.shuffle(test.questions);
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    public importQuestions(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    /**
     * Process imported XML
     */
    public importXML(data: any): void {
        this.processTestXML(data);
        this.updateOutput();
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $('#export')
            .off('click')
            .on('click', (e) => {
                this.exportTest($(e.target));
            });
        $('#import')
            .off('click')
            .on('click', () => {
                this.importQuestions(true);
            });
        $('#importurl')
            .off('click')
            .on('click', () => {
                this.importQuestions(false);
            });
        $('#randomize')
            .off('click')
            .on('click', () => {
                this.gotoRandomizeTest();
            });
        $('#adjust')
            .off('click')
            .on('click', () => {
                this.gotoAdjustScores(this.state.test);
            });
        $('.quesup')
            .off('click')
            .on('click', (e) => {
                this.gotoMoveTestCipher(Number($(e.target).attr('data-entry')), -1);
            });
        $('.quesdown')
            .off('click')
            .on('click', (e) => {
                this.gotoMoveTestCipher(Number($(e.target).attr('data-entry')), 1);
            });
        $('.quesedit')
            .off('click')
            .on('click', (e) => {
                this.gotoEditTestCipher(Number($(e.target).attr('data-entry')));
            });
        $('.quesadd')
            .off('click')
            .on('click', (e) => {
                this.gotoAddCipher(Number($(e.target).attr('data-entry')));
            });
        $('.questime')
            .off('click')
            .on('click', (e) => {
                this.gotoSetTimedCipher(Number($(e.target).attr('data-entry')));
            });
        $('.quesremove')
            .off('click')
            .on('click', (e) => {
                this.gotoRemoveCipher(Number($(e.target).attr('data-entry')));
            });
        $('#addnewtimed')
            .off('change')
            .on('change', (e) => {
                const elem = $(e.target).find(':selected');
                const cipherType = elem.val() as ICipherType;
                const lang = elem.attr('data-lang');
                if (cipherType === ICipherType.None) {
                    this.addExistingCipher(true);
                } else {
                    this.createEmptyQuestion(cipherType, lang, true);
                }
            });
        $('#showplain')
            .off('click')
            .on('click', (e) => {
                this.showPlain = true;
                $('.qplain').removeClass('qplain');
                $(e.target).hide();
            });
        $('#addnewques')
            .off('change')
            .on('change', (e) => {
                const elem = $(e.target).find(':selected');
                const cipherType = elem.val() as ICipherType;
                const lang = elem.attr('data-lang');
                if (cipherType === ICipherType.None) {
                    this.addExistingCipher(false);
                } else {
                    this.createEmptyQuestion(cipherType, lang, false);
                }
            });
        $('#testtype')
            .off('change')
            .on('change', (e) => {
                // We need to lookup the id and convert it to a test type
                if (this.setTestType(this.mapTestTypeString($(e.target).val() as string))) {
                    this.updateOutput();
                }
                e.preventDefault();
            });
        $('#ckpaper')
            .off('change')
            .on('change', (e) => {
                const checked = $(e.target).prop("checked");
                if (this.setCheckPaper(checked)) {
                    this.updateOutput();
                }
                e.preventDefault();
            });
        $('#title')
            .off('input')
            .on('input', (e) => {
                const title = $(e.target).val() as string;
                this.setTitle(title);
            });
        $('#custom-header-input')
            .off('input')
            .on('input', (e) => {
                const userTestHeader = $(e.target).val() as string;
                this.setCustomHeader(userTestHeader);
            });
        $('#show-custom-header')
            .off('click')
            .on('click', (e) => {
                this.manageCustomHeaderButtons('custom');
            });
        $('#hide-custom-header')
            .off('click')
            .on('click', (e) => {
                this.manageCustomHeaderButtons('default');
            });
    }
}
