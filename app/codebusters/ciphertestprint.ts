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
    public pageNumber: number = 0;

    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as ITestState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        this.updateOutput();
    }
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        $('.testcontent').each((i, elem) => {
            this.genTestQuestions($(elem));
        });
        this.attachHandlers();
    }
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestEditState('testprint');
    }
    public ComputePageHeight(): Number {
        let dpi = $('<div/>', {
            id: 'dpi',
            style:
                'height: 1in; width: 1in; left: 100%; position: fixed; top: 100%;',
        });
        dpi.appendTo('body');
        let dpi_x = dpi[0].offsetWidth;
        let dpi_y = dpi[0].offsetHeight;
        dpi.remove();
        console.log('dpi_x=' + dpi_x + ' dpi_y=' + dpi_y);
        return dpi_y * 9.5;
    }
    public genPage(title: string): JQuery<HTMLElement> {
        let page = $('<div/>', { class: 'page' });
        page.append($('<div/>', { class: 'head' }).text(title));
        if (this.pageNumber % 2 === 1) {
            page.append(
                $('<div/>', { class: 'headright' }).text('School:__________')
            );
        }
        page.append(
            $('<div/>', { class: 'foot' }).text(
                'Page ' + String(this.pageNumber)
            )
        );
        this.pageNumber++;
        return page;
    }

    public genTestQuestions(elem: JQuery<HTMLElement>): void {
        let testcount = this.getTestCount();
        let errors: string[] = [];
        let usesMorseTable = false;
        let SpanishCount = 0;
        elem.empty();
        if (testcount === 0) {
            elem.append($('<h3>').text('No Tests Created Yet'));
        }
        if (this.state.test > testcount) {
            elem.append($('<h3>').text('Test not found'));
        }
        let test = this.getTestEntry(this.state.test);
        let pagesize = this.ComputePageHeight();
        let result = $('<div/>');
        elem.append(result);
        console.log('Page Height is ' + pagesize + ' pixels.');
        $('.testtitle').text(test.title);
        let dt = new Date();
        // If we are at the end of the year, display the following year for tests.
        dt.setDate(dt.getDate() + 6);
        $('.testyear').text(dt.getFullYear());
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
            let cipherhandler = this.GetPrintFactory(test.timed);
            let qerror = '';
            try {
                let timedquestion = this.printTestQuestion(
                    test.testtype,
                    -1,
                    cipherhandler,
                    'pagebreak'
                );
                page.append(timedquestion);
            }
            catch (e) {
                let msg = "Something went wrong generating the Timed Question." +
                    " Error =" + e;
                page.append($("<h1>").text(msg));
            }
            qcount = 99;
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
            let cipherhandler = this.GetPrintFactory(test.questions[qnum]);
            let thisquestion: JQuery<HTMLElement> = null;
            try {
                thisquestion = this.printTestQuestion(
                    test.testtype,
                    qnum + 1,
                    cipherhandler,
                    ''
                );
            }
            catch (e) {
                let msg = "Something went wrong generating Question #" +
                    +String(qnum + 1) + ". Error =" + e;
                thisquestion = $("<h1>").text(msg);
            }
            /* Is this a xenocrypt?  if so we need the Spanish frequency */
            if (cipherhandler.state.curlang === 'es') {
                SpanishCount++;
            }
            /* Does this cipher involve morse code? */
            if (cipherhandler.usesMorseTable) {
                usesMorseTable = true;
            }
            page.append(thisquestion);
            let thisheight = thisquestion.outerHeight();
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
            let qerror = cipherhandler.CheckAppropriate(test.testtype);
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
            for (let ent of this.runningKeys) {
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
            if (SpanishCount > 1 &&
                test.testtype !== ITestType.bstate &&
                test.testtype !== ITestType.cstate) {
                errors.push('Only one Spanish Xenocrypt allowed for ' +
                    this.getTestTypeName(test.testtype) + '.');
            }
            $('.xenocryptfreq').show();
        } else {
            if (test.testtype === ITestType.bstate ||
                test.testtype === ITestType.cstate) {
                errors.push(this.getTestTypeName(test.testtype) +
                    ' is supposed to have at least one Spanish Xenocrypt.');
            }
            $('.xenocryptfreq').hide();
        }
        if (errors.length === 1) {
            $(".testerrors").append($('<div/>', {
                class: 'callout alert',
            }).text(errors[0]));
        } else if (errors.length > 1) {

            let ul = $("<ul/>");
            for (let msg of errors) {
                ul.append($("<li/>").text(msg));
            }
            $(".testerrors").append($('<div/>', {
                class: 'callout alert',
            }).text("The following errors were found:")
                .append(ul));
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
         * Lastly we need to print out the score table
         */
        let table = new JTTable({
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
        for (let qitem of this.qdata) {
            let qtitle = '';
            if (qitem.qnum === -1) {
                qtitle = 'Timed';
                hastimed = true;
            } else {
                qtitle = String(qitem.qnum);
            }
            let trow = table
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
