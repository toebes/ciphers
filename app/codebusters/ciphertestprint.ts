import { cloneObject } from '../common/ciphercommon';
import { ITestType, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState } from './ciphertest';

/**
 * CipherTestPrint
 *  Displays a printable version of test <n> if it exists (default 0).
 *  Otherwise it provies a link back to TestManage.html
 *
 */
export class CipherTestPrint extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
        test: 0,
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [];
    public pageNumber = 0;

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        if (!suppressOutput) {
            this.updateOutput();
        }
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        $('.testcontent').each((i, elem) => {
            this.genTestQuestions($(elem));
        });
        this.attachHandlers();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestEditState('testprint');
    }
    public ComputePageHeight(): number {
        const dpi = $('<div/>', {
            id: 'dpi',
            style: 'height: 1in; width: 1in; left: 100%; position: fixed; top: 100%;',
        });
        dpi.appendTo('body');
        const dpi_x = dpi[0].offsetWidth;
        const dpi_y = dpi[0].offsetHeight;
        dpi.remove();
        console.log('dpi_x=' + dpi_x + ' dpi_y=' + dpi_y);
        return dpi_y * 9.5;
    }
    public genPage(title: string): JQuery<HTMLElement> {
        const page = $('<div/>', { class: 'page' });
        page.append($('<div/>', { class: 'head' }).text(title));
        if (this.pageNumber % 2 === 1) {
            page.append($('<div/>', { class: 'headright' }).text('School:__________'));
        }
        page.append($('<div/>', { class: 'foot' }).text('Page ' + String(this.pageNumber)));
        this.pageNumber++;
        return page;
    }

    public genTestQuestions(elem: JQuery<HTMLElement>): void {
        const testcount = this.getTestCount();
        const errors: string[] = [];
        let usesMorseTable = false;
        let usesPortaTable = false;
        let SpanishCount = 0;
        let SpecialBonusCount = 0;
        elem.empty();
        $('.testerrors').empty();
        if (testcount === 0) {
            elem.append($('<h3>').text('No Tests Created Yet'));
        }
        if (this.state.test > testcount) {
            elem.append($('<h3>').text('Test not found'));
        }
        const test = this.getTestEntry(this.state.test);
        const pagesize = this.ComputePageHeight();
        const result = $('<div/>');
        elem.append(result);
        console.log('Page Height is ' + pagesize + ' pixels.');
        $('.testtitle').text(test.title);
        const dt = new Date();
        // If we are at the end of the year, display the following year for tests.
        dt.setDate(dt.getDate() + 6);
        $('.testyear').text(dt.getFullYear());

        // Print custom header or default header on tests
        if (test.useCustomHeader) {
            $('.custom-header').html(test.customHeader);
            if (!$('.default-header').hasClass('noprint')) {
                $('.default-header').addClass('noprint');
            }
            if ($('.custom-header').hasClass('noprint')) {
                $('.custom-header').removeClass('noprint');
            }
        } else {
            if (!$('.custom-header').hasClass('noprint')) {
                $('.custom-header').addClass('noprint');
            }
            if ($('default-header').hasClass('noprint')) {
                $('.default-header').removeClass('noprint');
            }
        }

        $(".tsta,.tstb,.tstc").hide();
        if (test.timed === -1) {
            $(".timed").hide();
        }
        switch (test.testtype) {
            case ITestType.aregional:
                $(".tsta").show();
                break;
            case ITestType.bregional:
            case ITestType.bstate:
                $(".tstb").show();
                break;
            case ITestType.cregional:
            case ITestType.cstate:
            default:
                $(".tstc").show();
                break
        }

        this.runningKeys = undefined;
        this.qdata = [];
        let accumulated = 0;
        let qcount = 0;
        this.pageNumber = 1;
        let page = this.genPage(test.title);
        result.append(page);
        if (test.timed === -1) {
            // Division A doesn't have a timed quesiton, so don't print out
            // a message if it isn't there.
            if (test.testtype !== ITestType.aregional) {
                result.append(
                    $('<p/>', {
                        class: 'noprint',
                    }).text('No timed question')
                );
            }
        } else {
            const cipherhandler = this.GetPrintFactory(test.timed);
            let qerror = '';
            try {
                const timedquestion = this.printTestQuestion(
                    test.testtype,
                    -1,
                    cipherhandler,
                    'pagebreak'
                );
                page.append(timedquestion);
            } catch (e) {
                const msg = 'Something went wrong generating the Timed Question.' + ' Error =' + e;
                page.append($('<h1>').text(msg));
            }
            qcount = 99;
            if (cipherhandler.state.specialbonus) {
                SpecialBonusCount++;
            }
            // Division A doesn't have a timed question, but if one was
            // there, print it out, but generate an error message
            if (test.testtype === ITestType.aregional) {
                qerror = 'Not allowed for Division A';
            } else {
                qerror = cipherhandler.CheckAppropriate(test.testtype);
            }
            if (qerror !== '') {
                errors.push('Timed Question: ' + qerror);
            }
        }
        for (let qnum = 0; qnum < test.count; qnum++) {
            const cipherhandler = this.GetPrintFactory(test.questions[qnum]);
            let thisquestion: JQuery<HTMLElement> = null;
            try {
                thisquestion = this.printTestQuestion(test.testtype, qnum + 1, cipherhandler, '');
            } catch (e) {
                const msg =
                    'Something went wrong generating Question #' +
                    +String(qnum + 1) +
                    '. Error =' +
                    e;
                thisquestion = $('<h1>').text(msg);
            }
            /* Is this a xenocrypt?  if so we need the Spanish frequency */
            if (cipherhandler.state.curlang === 'es') {
                SpanishCount++;
            }
            if (cipherhandler.state.specialbonus) {
                SpecialBonusCount++;
            }
            /* Does this cipher involve morse code? */
            if (cipherhandler.usesMorseTable) {
                usesMorseTable = true;
            }
            if (cipherhandler.usesPortaTable) {
                usesPortaTable = true;
            }
            page.append(thisquestion);
            const thisheight = thisquestion.outerHeight();
            if (thisheight + accumulated > pagesize || qcount > 1) {
                page = this.genPage(test.title);
                result.append(page);
                thisquestion.detach().appendTo(page);
                accumulated = 0;
                qcount = 0;
            }
            qcount++;
            accumulated += thisheight;
            console.log(
                qnum +
                ': height=' +
                thisquestion.outerHeight() +
                ' bodyheight=' +
                document.body.clientHeight
            );
            const qerror = cipherhandler.CheckAppropriate(test.testtype);
            if (qerror !== '') {
                errors.push('Question ' + String(qnum + 1) + ': ' + qerror);
            }
        }
        // Since the handlers turn on the file menus sometimes, we need to turn them back off
        this.setMenuMode(menuMode.test);

        /**
         * Now that we have generated the data for the test, output any running keys used
         */
        if (this.runningKeys !== undefined) {
            $('#runningkeys').append($('<h2/>').text('Famous Phrases'));
            for (const ent of this.runningKeys) {
                $('#runningkeys').append(
                    $('<div/>', {
                        class: 'runtitle',
                    }).text(ent.title)
                );
                $('#runningkeys').append(
                    $('<div/>', {
                        class: 'runtext',
                    }).text(ent.text)
                );
            }
        }
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
        /**
         * See if we need to show/hide the Morse Code Table
         */
        if (usesMorseTable) {
            $('.morsetable').show();
        } else {
            $('.morsetable').hide();
        }
        /**
         * See if we need to show/hide the Porta Code Table
         */
        if (usesPortaTable) {
            $('.portatable').show();
        } else {
            $('.portatable').hide();
        }
        /**
         * Lastly we need to print out the score table
         */
        const table = new JTTable({
            class: 'cell shrink testscores',
        });
        let hastimed = false;
        table
            .addHeaderRow()
            .add('Question')
            .add('Value')
            .add('Incorrect letters')
            .add('Deduction')
            .add('Score');
        for (const qitem of this.qdata) {
            let qtitle = '';
            if (qitem.qnum === -1) {
                qtitle = 'Timed';
                hastimed = true;
            } else {
                qtitle = String(qitem.qnum);
            }
            const trow = table
                .addBodyRow()
                .add({
                    settings: { class: 't' },
                    content: qtitle,
                })
                .add({
                    settings: { class: 'v' },
                    content: String(qitem.points),
                });
            //             if (this.) {
            //     trow.                .add({
            //         settings: { colspan: 2, class: 'grey' },
            //         content: '',
            //     }).add('');

            // } else {
            trow.add('')
                .add('')
                .add('');
        }
        // }
        // If we had a timed question, we put in the slot for the bonus
        if (hastimed) {
            table
                .addFooterRow()
                .add('Bonus')
                .add('')
                .add({
                    settings: { colspan: 2, class: 'grey' },
                    content: '',
                })
                .add('');
        }
        table
            .addFooterRow()
            .add('Final Score')
            .add({ settings: { colspan: 4 }, content: '' });
        $('#scoretable').append(table.generate());
    }
}
