import { cloneObject, makeCallout } from '../common/ciphercommon';
import { ITestType, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestDisp, ITestState } from './ciphertest';

/**
 * CipherTestAnswers
 *    This prints an answer key for a specified test
 */
export class CipherTestAnswers extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
        test: 0,
        sols: 'n',
        tiny: 'n',
    };
    public state: ITestState = cloneObject(this.defaultstate) as ITestState;
    public cmdButtons: JTButtonItem[] = [];
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genTestEditState(this.getTestEditState());
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        this.setSols(this.state.sols);
    }
    /**
     * Clean up the sols value so that all the other code can count on a y or n
     * @param sols New sols display value (either y or n)
     */
    public setSols(sols: string): boolean {
        let changed = false;
        let newsols = 'n';
        if (sols !== undefined && sols.toLowerCase().substring(0, 1) === 'y') {
            newsols = 'y';
        }
        if (newsols !== this.state.sols) {
            changed = true;
            this.state.sols = newsols;
        }
        return changed;
    }
    /**
     * Get the test display state for whether we are displaying answers or solutions
     */
    public getTestEditState(): ITestDisp {
        this.setSols(this.state.sols);
        if (this.state.sols === 'y') {
            return 'testsols';
        }
        if (this.state.tiny === 'y') {
            return 'testanstiny'
        }
        return 'testans';
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        this.setTestEditState(this.getTestEditState());

        $('.testcontent').each((i, elem) => {
            $(elem).replaceWith(this.genTestAnswers());
        });
        if (this.state.tiny === 'y') {
            // For the tiny answer key, we let the system generate the normal answer key
            // and then we go through and remove everything that we don't want and add some classes
            // to what remains so that we can adjust the formatting

            // Get rid of the question points and question text content
            $(".qtext .points,.qtext .qbody").remove();
            // Get rid of all solution blocks (this is the cipher text)
            $(".TOSOLVE").remove();
            // Get rid of the additional answer work blocks
            $(".TOANSWERK").remove();
            // Add the tight class to all the answer blocks so that we can get rid of extra spaces
            $(".TOANSWER").addClass('tight')
            // Add the span class to all of the question number texts so that they will float on the left
            $(".qtext").addClass('span')
            // Except for the timed question which we want on a line by itself
            $(".qtext .timed").parent().removeClass("qtext")
            // Remove all of the frequency tables
            $(".prfreq").remove();
            $(".tinyonly").removeClass("hidden");
            // As well as anything that the cipher marked as not visible on the tiny answer key
            $(".notiny").remove();
            // Get rid of all the rows which have q and o class field in them (these are not the answers)
            $("td.q,td.o").parent().remove();
            // All the match stuff goes because they aren't the answers
            $(".katex").remove();
            // Make the special bonus a little more concise
            $(".spbonus").text("★★★(Special Bonus)")
            // Add a class to all the questions so that we can tighten them up
            $(".question").addClass("tview")
            // As well as all of the tables in the questions
            $(".question table").addClass("tview")
            // The hill cipher has an extra block to remove
            $(".hillblock").removeClass("hillblock")
            // And also any spurious HR elements that weren't tagged
            $(".question hr").remove()
            // Remove extra padding from cryptarithm answers
            $(".cell").removeClass("cell")
            $(".align-spaced").removeClass("align-spaced")
        }
        this.attachHandlers();
    }
    /*
     * Sorter to break ties
     */
    public tiebreakersort(a: any, b: any): number {
        if (a.points > b.points) {
            return -1;
        } else if (a.points < b.points) {
            return 1;
        } else if (a.qnum > b.qnum) {
            return -1;
        } else if (a.qnum < b.qnum) {
            return 1;
        }
        return 0;
    }
    /**
     * Populate the test with answers
     */
    public genTestAnswers(): JQuery<HTMLElement> {
        let printSolution = false;
        if (this.state.sols === 'y') {
            printSolution = true;
            // Empty the instructions so that they don't print
            $('.instructions').empty();
        }
        $('.testerrors').empty();

        const testcount = this.getTestCount();
        if (testcount === 0) {
            return $('<h3/>').text('No Tests Created Yet');
        }
        if (this.state.test > testcount) {
            return $('<h3/>').text('Test not found');
        }

        const result = $('<div/>');
        this.qdata = [];

        const test = this.getTestEntry(this.state.test);
        $('.testtitle').text(test.title);
        const dt = new Date();
        $('.testyear').text(dt.getFullYear());
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

        if (test.timed === -1) {
            // Division A doesn't have a timed quesiton, so don't print out
            // a message if it isn't there.
            if (test.testtype !== ITestType.aregional) {
                result.append($('<div/>', { class: 'noprint' }).append(
                    makeCallout($('<h3/>').text(`There is no timed question`), 'alert')))
            }
        } else {
            const cipherhandler = this.GetPrintFactory(test.timed);
            let qerror = '';
            try {
                result.append(
                    this.printTestAnswer(
                        test.testtype,
                        -1,
                        cipherhandler,
                        'pagebreak',
                        printSolution
                    )
                );
            } catch (e) {
                const msg = 'Something went wrong generating the Timed Question.' + ' Error =' + e;
                result.append($('<h1>').text(msg));
            }
            // Division A doesn't have a timed question, but if one was
            // there, print it out, but generate an error message
            if (test.testtype === ITestType.aregional) {
                qerror = 'Not allowed for Division A';
            } else {
                qerror = cipherhandler.CheckAppropriate(test.testtype, false);
            }
            if (qerror !== '') {
                $('.testerrors').append(
                    $('<div/>', {
                        class: 'callout alert',
                    }).text('Timed Question: ' + qerror)
                );
            }
        }
        for (let qnum = 0; qnum < test.count; qnum++) {
            let breakclass = '';
            if (qnum % 2 === 0 && this.state.tiny !== 'y') {
                breakclass = 'pagebreak';
            }
            const cipherhandler = this.GetPrintFactory(test.questions[qnum]);
            try {
                result.append(
                    this.printTestAnswer(
                        test.testtype,
                        qnum + 1,
                        cipherhandler,
                        breakclass,
                        printSolution
                    )
                );
            } catch (e) {
                const msg =
                    'Something went wrong generating Question #' +
                    +String(qnum + 1) +
                    '. Error =' +
                    e;
                result.append($('<h1>').text(msg));
            }
            const qerror = cipherhandler.CheckAppropriate(test.testtype, false);
            if (qerror !== '') {
                $('.testerrors').append(
                    $('<div/>', {
                        class: 'callout alert',
                    }).text('Question' + String(qnum + 1) + ': ' + qerror)
                );
            }
        }
        // Since the handlers turn on the file menus sometimes, we need to turn them back off
        this.setMenuMode(menuMode.test);
        //
        // Generate the tie breaker order
        //
        const table = new JTTable({
            class: 'cell shrink tiebreak',
        });
        let extra = '';
        let TinyTie = '';
        table
            .addHeaderRow()
            .add('Tie Breaker Order')
            .add('Question #');

        // We have stacked all of the found matches.  Now we need to sort them
        this.qdata.sort(this.tiebreakersort);
        let order = 1;
        for (const qitem of this.qdata) {
            let qtitle = '';
            if (qitem.qnum === -1) {
                qtitle = 'Timed';
            } else {
                qtitle = String(qitem.qnum);
            }
            table
                .addBodyRow()
                .add(String(order))
                .add(qtitle);
            TinyTie += `${extra}${qtitle}`;
            extra = ', ';
            order++;
        }
        $('#tietable').append(table.generate());
        $('#tinytie').text(TinyTie);
        return result;
    }
}
