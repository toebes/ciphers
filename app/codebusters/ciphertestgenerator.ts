import 'foundation-sites';
import { BoolMap, cloneObject, StringMap } from '../common/ciphercommon';
import { ITest, ITestType, menuMode, toolMode } from '../common/cipherhandler';
import { getCipherTitle, ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { buttonInfo, CipherTest, ITestState } from './ciphertest';
import { IEncoderState } from './cipherencoder';
import { JTFDialog } from '../common/jtfdialog';

type Bounds = Readonly<{ min: number; max: number }>;

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
        { title: 'Randomize Order', color: 'primary', id: 'randorder' },
        { title: 'Hide Custom Header', color: 'primary', id: 'hide-custom-header' },
        { title: 'Show Custom Header', color: 'primary', id: 'show-custom-header' },
        { title: 'Adjust Scores', color: 'primary', id: 'adjust' },
        { title: 'Export Test', color: 'primary', id: 'export' },
        { title: 'Append Another Test', color: 'primary', id: 'append' },
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
        let errorcount = 0;
        let hasNon5Scores = false;
        let specialBonusTypes: BoolMap = {}
        if (testcount === 0) {
            result.append($('<h3>').text('No Tests Created Yet'));
            return result;
        }
        if (this.state.test >= testcount) {
            result.append($('<h3>').text('Test not found'));
            return result;
        }

        const testdiv = $('<div/>', { class: 'callout primary' });

        testdiv.append(
            JTFLabeledInput('Title', 'text', 'title', test.title, 'small-12 medium-12 large-12')
        );

        if (test.useCustomHeader) {
            const custom_image_div = $('<div/>').addClass('cell small-12 medium-12 large-12');

            const button_div = $('<div/>').addClass('tight small-12 medium-12 large-12');
            const loadHeaderImageButton = $('<a/>', { type: "button", class: "button primary tight", id: "load-header-image" }).text("Select Header Image");
            button_div.append(loadHeaderImageButton);

            // Create button to remove custome
            const clearHeaderImageButton = $('<a/>', { type: "button", class: "button alert tight", id: "clear-header-image" }).text('Clear Header Image');
            button_div.append(clearHeaderImageButton);

            // Build label and field for name of image file, include clear image button in here, too.
            custom_image_div.append(
                JTFLabeledInput('Custom Image Filename',
                    'text',
                    'custom-header-image-filename',
                    test.customHeaderImageFilename,
                    'small-12 medium-12 large-12 readonly', button_div)
            );

            // Put these new widgets in the custom header div
            testdiv.append(custom_image_div);

            custom_image_div.append(
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
                'input-group cell small-12 medium-12 large-12'));
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
        const errors: string[] = [];

        for (let entry = -1; entry < test.count; entry++) {
            // If the test has a timed question, then put it.  Note that
            // The Division A doesn't have a timed question, but if someone
            // snuck one in, we have to show it.
            let slot = entry + 1;
            let qnum = -1;
            const buttons: buttonInfo[] = [
                { title: 'Edit', btnClass: 'quesedit' },
                { title: 'Remove', btnClass: 'quesremove alert' },
            ];
            if (entry === -1) {
                slot = -1;
                qnum = test.timed;
                if (qnum === -1 && test.testtype === ITestType.aregional) {
                    continue;
                }
            } else {
                qnum = test.questions[entry]
                buttons.unshift({ title: '&uarr;', btnClass: 'quesup', disabled: entry === 0 });
                buttons.unshift({ title: '&darr;', btnClass: 'quesdown', disabled: entry === test.count - 1 });
            }
            let qstate = this.addQuestionRow(
                table,
                slot,
                qnum,
                buttons,
                this.showPlain,
                test.testtype,
                undefined
            );
            if (qstate !== undefined) {
                if (qstate.curlang === 'es') { SpanishCount++; }
                if (qstate.specialbonus) {
                    if (specialBonusTypes[qstate.cipherType]) {
                        errors.push(`More than one special bonus question is the same ${getCipherTitle(qstate.cipherType)} type cipher.`)
                    }
                    specialBonusTypes[qstate.cipherType] = true;
                    SpecialBonusCount++;
                }
                if (qstate.errorcount) { errorcount += qstate.errorcount; }
                if (qstate.points % 5) { hasNon5Scores = true }
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
        $('.testerrors').empty();

        if (test.count > 0 && !hasNon5Scores) {
            errors.push(`All of the question scores end in 0 or 5 which makes it more likely to have a tie.`)
        }
        /**
         * See if we need to show/hide the Spanish Hints
         */
        if (errorcount > 0) {
            if (errorcount === 1) {
                errors.push('An issue down below was found when generating one of the questions.')
            } else {
                errors.push(`${errorcount} issues were found when generating the questions.`)
            }
        }
        this.checkTestLimits(errors, test, SpanishCount, SpecialBonusCount);

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
        const state: IEncoderState = {
            cipherType: ciphertype,
            points: 0,
            question: 'Solve this',
            cipherString: '',
            curlang: lang,
            placeholder: true,
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
        if (test.customHeaderImageFilename !== undefined && test.customHeaderImageFilename !== '') {
            $('#load-header-image').hide();
            $('#clear-header-image').show();
        } else {
            $('#load-header-image').show();
            $('#clear-header-image').hide();
        }
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
        customHeader = customHeader.trim();
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
    /**
     * Map the ciphertype to a general group
     * @param cipherType Cipher type to map
     * @returns String representing
     */
    public getCipherSubType(cipherType: ICipherType): string {
        let thisType = super.getCipherSubType(cipherType);
        // For our purposes, Patristocrats and Aristocrats should not be next to each other
        if (thisType === 'Patristocrat') {
            thisType = 'Aristocrat';
        }
        return thisType;
    }

    public gotoRandomizeTest(): void {
        const test = this.getTestEntry(this.state.test);
        test.questions = this.shuffleEntries(test.questions);
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
    public importImage(filename: string, data: any): void {
        let test = this.getTestEntry(this.state.test);
        test.customHeaderImage = data;
        test.customHeaderImageFilename = filename;
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    /**
     * Generate the drop down to allow selection of a test
     * @returns HTML Elements for the select within a cell
     */
    public makeTestDropdown(): JQuery<HTMLElement> {
        const result = $('<div>', { class: 'cell large-4 medium-6' })
        const inputgroupdiv = $('<div/>', { class: "input-group" })
        const titlespan = $('<span/>', { class: "input-group-label" }).text(`Test`)

        // Build the selection of the tests
        const select = $('<select/>', { id: `its`, class: 'itsel input-group-field' })
        select.append(
            $('<option />', {
                value: '',
                selected: 'selected',
            }).text('-- Select test to append --')
        );
        // Go through all the tests we know about
        const testcount = this.getTestCount()
        for (let test = 0; test < testcount; test++) {
            // Of course skip the test that we are currently on
            if (test === this.state.test) {
                continue
            }
            // Add it to the list of options to select
            const testentry = this.getTestEntry(test)
            let testTitle = testentry.title || `Test ${test + 1}`
            testTitle += `: ${testentry.count} questions`
            if (testentry.timed === -1 && testentry.testtype !== ITestType.aregional) {
                testTitle += ' (no timed question)'
            }

            select.append(
                $('<option />', {
                    value: test,
                }).text(testTitle)
            );
        }
        inputgroupdiv.append(titlespan)
        inputgroupdiv.append(select)

        result.append(inputgroupdiv)
        return result
    }

    /**
     * Append the questions from another test to this one.
     * This is basically a merge of the two tests with no duplicates.
     * The timed question from the new test goes in the timed slot if there is not
     * already a timed question and appended to the list of questions otherwise.
     * The rest of the questions are appended in order after that.
     * @param testnum Test number to append
     */
    public appendTest(testnum: number): void {
        const test = this.getTestEntry(this.state.test);
        const appendTest = this.getTestEntry(testnum);
        // Build a map of the questions we already have so we can skip them when we append.
        // This includes the timed question since that is basically just a special slot in the list of questions.
        const skipQuestions: { [index: number]: boolean } = {};
        if (test.timed !== -1) {
            skipQuestions[test.timed] = true;
        }
        for (const entry of test.questions) {
            skipQuestions[entry] = true;
        }
        // First we check the timed question.
        // If it exists and we don't already have it, then we add it.
        // If we already have a timed question, then we just add it to the list of questions.
        if (appendTest.timed !== -1 && !skipQuestions[appendTest.timed]) {
            if (test.timed === -1) {
                test.timed = appendTest.timed;
            } else {
                test.questions.push(appendTest.timed);
                test.count++;
            }
            skipQuestions[appendTest.timed] = true;
        }
        // Next we add all the remaining questions in order if we don't already have them.
        for (const entry of appendTest.questions) {
            if (!skipQuestions[entry]) {
                test.questions.push(entry);
                test.count++;
                skipQuestions[entry] = true;
            }
        }
        // Remember to save the test back after we are done
        this.setTestEntry(this.state.test, test);
        // And refresh the UI to show the new questions
        this.updateOutput();
    }
    /**
     * Bring up the dialog to select a test to append and then append it to the current test.
     */
    public appendQuestions(): void {
        this.openAppendDialog();
    }

    /**
     * Open the dialog to select a test to append and then append it to the current test.
     */
    public openAppendDialog(): void {
        let testnum = -1;
        // Disable the OK button until they select a test
        $('#okappend').attr('disabled', 'disabled');
        // Populate the list of tests to append
        $('#appendtst').replaceWith(this.makeTestDropdown());
        // Watch for any change in the selection and enable the OK button when they select something
        $('#its')
            .prop('selectedIndex', 0)
            .off('change')
            .on('change', (e) => {
                $('#okappend').removeAttr('disabled');
                testnum = $(e.target).val() ? Number($(e.target).val()) : -1;
            });
        // When they click the OK button, append the selected test and close the dialog
        $('#okappend')
            .off('click')
            .on('click', (e) => {
                $('#AppendTest').foundation('close');
                if (testnum !== -1) {
                    this.appendTest(testnum);
                }
            });
        $('#AppendTest').foundation('open');
    }

    public loadCustomHeaderImage(): void {
        this.openImportImage();
    };
    public clearCustomHeaderImage(): void {
        const test = this.getTestEntry(this.state.test);
        test.customHeaderImage = '';
        test.customHeaderImageFilename = '';
        this.setTestEntry(this.state.test, test);
        this.updateOutput();
    }
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        result.append(this.createAppendDialog())
        return result;
    }
    private createAppendDialog(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            id: 'appendtst',
            class: 'appendlist',
            size: 10,
        });
        const openFileDlg = JTFDialog(
            'AppendTest',
            'Select Test to Append',
            dlgContents,
            'okappend',
            'OK'
        );
        return openFileDlg;
    }

    public attachHandlers(): void {
        super.attachHandlers();
        $('#export')
            .off('click')
            .on('click', (e) => {
                this.exportTest($(e.target));
            });
        $('#append')
            .off('click')
            .on('click', () => {
                this.appendQuestions();
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
        $('#randorder')
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
        $('#load-header-image')
            .off('click')
            .on('click', () => {
                this.loadCustomHeaderImage();
            });
        $('#clear-header-image')
            .off('click')
            .on('click', () => {
                this.clearCustomHeaderImage();
            });
    }
}
