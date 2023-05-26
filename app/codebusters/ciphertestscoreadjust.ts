import 'foundation-sites';
import { cloneObject, makeFilledArray } from '../common/ciphercommon';
import { IState, ITest, ITestType, menuMode, toolMode } from '../common/cipherhandler';
import { getCipherTitle, ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState } from './ciphertest';
import { CipherPrintFactory } from './cipherfactory';

/**
 * TestScoreAdjust.html?test=<n>
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
export class CipherTestScoreAdjust extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public showPlain = false;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.None,
        test: 0,
    };
    public readonly cipherSubTypes = [
        'Aristocrat',
        'Patristocrat',
        'Xenocrypt',
        'Baconian',
        'Table ',
        'Math',
        'Morse',
        'Transposition',
        'Other'
    ];
    public mapCipherSubType = new Map<ICipherType, string>([
        [ICipherType.Aristocrat, 'Aristocrat'],
        [ICipherType.Baconian, 'Baconian'],
        [ICipherType.Porta, 'Table '],
        [ICipherType.Hill, 'Math'],
        [ICipherType.NihilistSubstitution, 'Math'],
        [ICipherType.Patristocrat, 'Patristocrat'],
        [ICipherType.Cryptarithm, 'Math'],
        [ICipherType.FractionatedMorse, 'Morse'],
        [ICipherType.Pollux, 'Morse'],
        [ICipherType.Morbit, 'Morse'],
        [ICipherType.Railfence, 'Transposition'],
        [ICipherType.CompleteColumnar, 'Transposition'],]
    )
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Finish Adjusting', color: 'primary', id: 'endadjust' },
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
     * Map all cipher types to the common subtypes for purposes of spreading out scores
     * to prevent ties
     * @param cipherType Cipher type to map
     * @returns cipherSubType (or "Other")
     */
    public getCipherSubType(cipherType: ICipherType) {
        let cipherSubType = 'Other';
        if (this.mapCipherSubType.has(cipherType)) {
            cipherSubType = this.mapCipherSubType.get(cipherType);
        }
        return cipherSubType;
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

        const testTypeBox = $('<div/>', { class: 'grid-x grid-margin-x' });
        testTypeBox.append(
            this.genTestTypeDropdown('testtype',
                'Test Type',
                test.testtype,
                'input-group cell'));
        testdiv.append(testTypeBox);

        const ScoreBox = $('<div/>', { class: 'grid-x grid-margin-x' });

        const table1 = this.genSummaryTable('10s Digits', 'dt');
        ScoreBox.append(table1.generate());
        const table2 = this.genSummaryTable('1s Digits', 'do');
        ScoreBox.append(table2.generate());
        testdiv.append(ScoreBox)

        const table = new JTTable({ class: 'cell stack queslist' });
        const row = table.addHeaderRow();
        row.add('Question')
            .add('Type')
            .add('')
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
        // If the test has a timed question, then put it.  Note that
        // The Division A doesn't have a timed question, but if someone
        // snuck one in, we have to show it.
        if (test.timed !== -1 || test.testtype !== ITestType.aregional) {
            let qstate = this.addAdjustQuestionRow(
                table,
                -1,
                test.timed,
                this.showPlain,
                test.testtype
            );
            if (qstate !== undefined) {
                if (qstate.curlang === 'es') { SpanishCount++; }
                if (qstate.specialbonus) { SpecialBonusCount++; }
            }
        }
        for (let entry = 0; entry < test.count; entry++) {
            let qstate = this.addAdjustQuestionRow(
                table,
                entry + 1,
                test.questions[entry],
                this.showPlain,
                test.testtype
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
        testdiv.append(table.generate());
        result.append(testdiv);
        return result;
    }
    /**
     * Generate the table which shows the frequency summary values
     * @param title Title of the table
     * @param id id of the table entry
     * @returns JTTable to render
     */
    public genSummaryTable(title: string, id: string): JTTable {
        const table = new JTTable({ class: 'cell small-12 medium-6 large-6 adjscore' });
        table.addHeaderRow().add({ celltype: 'th', settings: { colspan: 12 }, content: title });
        table.addHeaderRow().add('Type').add('#').add('0').add('1').add('2').add('3').add('4').add('5').add('6').add('7').add('8').add('9');
        for (let cipherSubType of this.cipherSubTypes) {
            const row = table.addBodyRow()
            let cipherid = cipherSubType.toLowerCase().substring(0, 3)
            row.add({ celltype: 'th', settings: { class: 't' }, content: cipherSubType })
            row.add({ celltype: 'th', settings: { class: 'v', id: id + cipherid }, content: '0' })
            for (let slot = 0; slot < 10; slot++) {
                row.add({ celltype: 'td', settings: { class: 'v', id: id + cipherid + String(slot) }, content: '0' })
            }
        }
        const footer = table.addFooterRow()
        footer.add({ celltype: 'th', settings: { class: 't' }, content: 'All' })
        footer.add({ celltype: 'td', settings: { class: 'v', id: id + 'all' }, content: '0' })
        for (let slot = 0; slot < 10; slot++) {
            footer.add({ celltype: 'td', settings: { class: 'v', id: id + 'all' + String(slot) }, content: '0' })
        }
        return table
    }
    /**
     * Populate the frequency summary table entries
     */
    public FillSummaryTable() {
        let onesMap = new Map<String, number[][]>()
        let tensMap = new Map<String, number[][]>()

        // Initialize our maps of data
        for (let cipherSubType of this.cipherSubTypes) {
            onesMap.set(cipherSubType, [[], [], [], [], [], [], [], [], [], []])
            tensMap.set(cipherSubType, [[], [], [], [], [], [], [], [], [], []])
        }
        onesMap.set('All', [[], [], [], [], [], [], [], [], [], []])
        tensMap.set('All', [[], [], [], [], [], [], [], [], [], []])
        // Go through all the ciphers and get the scores and type
        const test = this.getTestEntry(this.state.test);
        for (let entry = -1; entry < test.count; entry++) {
            let qnum = undefined
            if (entry === -1) {
                if (test.timed !== -1) {
                    qnum = test.timed;
                }
            } else {
                qnum = test.questions[entry]
            }
            if (qnum !== undefined) {
                let state = this.getFileEntry(qnum);
                if (state === null) {
                    state = {
                        cipherType: ICipherType.None,
                        points: 0,
                        cipherString: '',
                    };
                }

                let cipherSubType = this.getCipherSubType(state.cipherType);
                if (state.curlang === 'es') {
                    cipherSubType = 'Xenocrypt'
                }
                const ones = state.points % 10
                const tens = Math.trunc((state.points % 100) / 10)
                this.recordVal(onesMap, cipherSubType, ones, entry);
                this.recordVal(tensMap, cipherSubType, tens, entry);
            }
        }
        // Data has all been calculated, time to update the UI
        $('.aib').removeClass('gv lv');

        for (let cipherSubType of this.cipherSubTypes) {
            this.showSummaryInfo(onesMap, cipherSubType, 'do');
            this.showSummaryInfo(tensMap, cipherSubType, 'dt');
        }
        this.showSummaryInfo(onesMap, 'All', 'do');
        this.showSummaryInfo(tensMap, 'All', 'dt');
    }
    public setInputClasses(elemSet: number[], classType: string): void {
        for (let pos of elemSet) {
            let elemTxt = "T"
            if (pos >= 0) {
                elemTxt = String(pos)
            }
            $('#sc' + elemTxt).addClass(classType)
        }
    }

    /**
     * Show the summary information for an individual cipherSubType
     * @param valMap Value map to update
     * @param cipherSubType Cipher sub type entry to update
     * @param id Entry in the subtype map to update
     */
    public showSummaryInfo(valMap: Map<String, number[][]>, cipherSubType: string, id: string) {
        let getVals = valMap.get(cipherSubType);
        const cipherid = cipherSubType.toLowerCase().substring(0, 3);
        let total = 0;
        for (let slot = 0; slot < 10; slot++) {
            total += getVals[slot].length;
        }
        // Figure out the threshold
        const upperThreshold = Math.ceil(total / 10)
        const lowerThreshold = Math.floor(total / 10)
        for (let slot = 0; slot < 10; slot++) {
            const slotVal = getVals[slot].length;
            const elem = $("#" + id + cipherid + String(slot))
            elem.text(slotVal);

            if (slotVal > upperThreshold) {
                elem.removeClass('lv')
                elem.addClass('gv')
                this.setInputClasses(getVals[slot], 'gv')
            } else if (slotVal < lowerThreshold) {
                elem.removeClass('gv')
                elem.addClass('lv')
                this.setInputClasses(getVals[slot], 'lv')
            } else {
                elem.removeClass('gv lv')
            }
        }
        $("#" + id + cipherid).text(total);
    }
    /**
     * 
     * @param valMap Map to update
     * @param cipherSubType Type of cipher to record data for
     * @param slot Index to be updated
     */
    public recordVal(valMap: Map<String, number[][]>, cipherSubType: string, slot: number, entry: number) {
        const setVals = valMap.get(cipherSubType);
        setVals[slot].push(entry)
        const allvals = valMap.get('All');
        allvals[slot].push(entry)
    }
    /**
     * Create an input field with up/down increment buttons
     * @param id Id of the entry
     * @param val Initial value for the entry
     */
    public AdjustIncButton(id: string,
        val: number
    ): JQuery<HTMLElement> {
        const inputgroup = $('<div/>', { class: 'input-group cell ' });
        $('<div/>', { class: 'input-group-button' })
            .append($('<span/>', { class: 'input-number-decrement' }).text('-'))
            .appendTo(inputgroup);
        $('<input/>', {
            id: id,
            class: 'input-number aib',
            type: 'number',
            value: val,
        }).appendTo(inputgroup);
        $('<div/>', { class: 'input-group-button' })
            .append($('<span/>', { class: 'input-number-increment' }).text('+'))
            .appendTo(inputgroup);
        return inputgroup;
    }

    /**
     * Adds a row to the table of questions with action buttons
     * @param table Table to append to
     * @param order Order of the entry
     * @param qnum Which question number (on the test or globally)
     * @param showPlain Boolean to show the plain text
     * @param testtype Type of test the question is being used for
     * @param prevuse Any previous use of the question on another test
     * @returns State representing the test question data
     */
    public addAdjustQuestionRow(
        table: JTTable,
        order: number,
        qnum: number,
        showPlain: boolean,
        testtype: ITestType,
    ): IState {
        let ordertext = 'Timed';
        let plainclass = '';
        if (!showPlain) {
            plainclass = 'qplain';
        }
        let extratext = '';
        let orderid = "T"
        if (order === -1) {
            extratext =
                '  When you have solved it, raise your hand so that the time can be recorded and the solution checked.';
        } else {
            ordertext = String(order);
            orderid = String(order - 1)
        }
        let state: IState = undefined;
        let row = table.addBodyRow();
        // We have a timed question on everything except the Division A
        if (order === -1 && qnum === -1 && testtype !== ITestType.aregional) {
            const callout = $('<div/>', {
                class: 'callout warning',
            }).text('No Timed Question!');
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

            const cipherSubType = this.getCipherSubType(state.cipherType)
            if (cipherSubType.toLowerCase() === state.cipherType.toLowerCase()) {
                row.add(cipherSubType);
            } else {
                row.add($('<div/>').text(cipherSubType).append($('<div/>').text(`[${state.cipherType}]`)));
            }
            if (state.specialbonus) {
                row.add({ celltype: 'td', content: "&#9733;" })
            } else {
                row.add("")
            }
            row.add(
                this.AdjustIncButton(
                    "sc" + orderid,
                    state.points
                )
            );

            row.add(
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
                const callout = $('<div/>', {
                    class: 'callout alert',
                }).text(qerror);
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
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        const test = this.getTestEntry(this.state.test);
        this.setMenuMode(menuMode.test);
        $('.testdata').each((i, elem) => {
            $(elem).replaceWith(this.genTestQuestions(test));
        });
        this.FillSummaryTable();
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
    public updateScore(id: string, val: number): boolean {
        const test = this.getTestEntry(this.state.test);
        const entry = id.substring(2)
        let qnum = undefined
        if (entry === 'T') {
            // they are changing the timed question
            if (test.timed !== -1) {
                qnum = test.timed
            }
        } else {
            const idx = Number(entry)
            if (idx >= 0 && idx < test.questions.length) {
                qnum = test.questions[idx]
            }
        }
        if (qnum !== undefined) {
            let state = this.getFileEntry(qnum);
            if (state !== null) {
                if (val !== state.points) {
                    state.points = val
                    this.setFileEntry(qnum, state)
                    return true
                }
            }
        }
        return false
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
        $('#showplain')
            .off('click')
            .on('click', (e) => {
                this.showPlain = true;
                $('.qplain').removeClass('qplain');
                $(e.target).hide();
            });

        $('#endadjust')
            .off('click')
            .on('click', () => {
                this.gotoEditTest(this.state.test);
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
        $('.aib').off('input')
            .on('input', (e) => {
                const elem = $(e.target)
                if (this.updateScore(elem.attr('id'), elem.val() as number)) {
                    this.FillSummaryTable();
                }
            })
        $('#title')
            .off('input')
            .on('input', (e) => {
                const title = $(e.target).val() as string;
                this.setTitle(title);
            });
    }
}
