import { cloneObject } from '../common/ciphercommon';
import { IState, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTFDialog } from '../common/jtfdialog';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState } from './ciphertest';
import { generateTestLatex } from './ciphertestlatexer';

const OVERLEAF_TEMPLATE_URL = 'https://www.overleaf.com/read/yxjtjdcgykgp#aa9620';

/**
 * CipherTestManage
 *    This shows a list of all tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Test Packet> <Answer Key> Test Title  #questions
 *  The command buttons available are
 *       <New Test><EXPORT><IMPORT>
 */
export class CipherTestManage extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    /* Boolean indicating that this is an active Scilympiad test */
    public isScilympiad: boolean = false;
    /* Tracks which test entry the LaTeX warning dialog was opened for */
    public latexExportEntry: number = -1;

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
        this.setMenuMode(menuMode.test);
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
            if (test.timed !== undefined && test.timed >= 0) {
                questioncount++;
            }
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
                    class: 'testprt button',
                }).text('Test Packet')
            );
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testans button',
                }).text('Answer Key')
            );
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testsols button',
                }).text('Answers and Solutions')
            );
            // NOTE: Disable interactive tests
            // buttons.append(
            //     $('<a/>', {
            //         'data-entry': entry,
            //         type: 'button',
            //         class: 'testint button',
            //     }).text('Interactive Test')
            // );
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testscoresheet button',
                }).text('Generate Scoresheet')
            );
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testlatex button',
                }).text('Export to LaTeX')
            );

            row.add($('<div/>', { class: 'grid-x' }).append(buttons))
                .add(test.title)
                .add(String(questioncount));
        }
        result.append(table.generate());
        return result;
    }

    /**
     * Inject the LaTeX warning dialog into the page's main menu area so that
     * Foundation can manage its lifecycle (open / close / keyboard dismiss).
     */
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        result.append(this.createLatexWarningDlg());
        return result;
    }

    /**
     * Builds the "Export to LaTeX — pre-flight checklist" warning dialog.
     * The dialog is hidden by Foundation's reveal mechanism until opened via
     * $('#latexWarningDLG').foundation('open').
     */
    public createLatexWarningDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');

        dlgContents.append(
            $('<p/>', { style: 'color: red; text-align: center; font-weight: bold;' }).text(
                'Warning: Export to LaTeX requires additional modification'
            )
        );

        const list = $('<ol/>');
        list.append(
            $('<li/>').html(
                `The generated Test and Key should be pasted in on a copy of <a href="${OVERLEAF_TEMPLATE_URL}" target="_blank">this Overleaf template</a> to completely ` +
                `replace the respective Test and Key documents.`
            )
        );
        list.append(
            $('<li/>').html(
                'The items in the <code>EDIT_DEFINITIONS.tex</code> file should be populated with their corresponding values. Instructions for putting a cover image are included in comments in this file.'
            )
        );
        list.append(
            $('<li/>').text(
                'Baconians must be manually inputted (this is due to their storage as HTML elements in ' +
                'the JSON to support fancy types). Fancy Baconians should be imported as included pdfs ' +
                '(example shown in video below).'
            )
        );
        list.append(
            $('<li/>').html(
                'The spacing in the test must be generally audited to avoid questions going over multiple ' +
                'pages. You can solve this by adding/removing <code>\\newpage</code> elements where ' +
                'necessary between questions.'
            )
        );
        list.append(
            $('<li/>').text(
                'Review question text, some may be bugged due to how the pattern matching in the script ' +
                'identifies various forms of Cribs/Hints.'
            )
        );
        list.append($('<li/>').text('Verify that there are no mistakes on the key.'));

        dlgContents.append(list);

        dlgContents.append(
            $('<p/>').html(
                'A video walking through this process can be found here <em>(link coming soon)</em>.'
            )
        );

        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' })
                .append($('<a/>', { class: 'secondary button', 'data-close': '' }).text('Cancel'))
                .append(
                    $('<a/>', { class: 'button', id: 'latexconfirm' }).text('I Understand')
                )
        );

        return JTFDialog('latexWarningDLG', 'Export to LaTeX', dlgContents);
    }

    /**
     * Check an email address to see if it is legitimate
     * @param emailAddress Email address to check
     * @returns Boolean indicating email address is valid
     */
    public isValidEmailAddress(emailAddress: string): boolean {
        if (this.isScilympiad) {
            return true;
        }
        var pattern = /^([a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+(\.[a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)*|"((([ \t]*\r\n)?[ \t]+)?([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*(([ \t]*\r\n)?[ \t]+)?")@(([a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.)+([a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.?$/i;
        return pattern.test(emailAddress);
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $('.testedit')
            .off('click')
            .on('click', (e) => {
                this.gotoEditTest(Number($(e.target).attr('data-entry')));
            });
        $('.testcopy')
            .off('click')
            .on('click', (e) => {
                this.gotoEditCopyTest(Number($(e.target).attr('data-entry')));
            });
        $('.testdel')
            .off('click')
            .on('click', (e) => {
                this.deleteTest(Number($(e.target).attr('data-entry')));
            });
        $('.testprt')
            .off('click')
            .on('click', (e) => {
                this.gotoPrintTest(Number($(e.target).attr('data-entry')));
            });
        $('.testans')
            .off('click')
            .on('click', (e) => {
                this.gotoPrintTestAnswers(Number($(e.target).attr('data-entry')));
            });
        // NOTE: Disable interactive tests
        // $('.testint')
        //     .off('click')
        //     .on('click', (e) => {
        //         this.gotoInteractiveTest(Number($(e.target).attr('data-entry')));
        //     });
        $('.testsols')
            .off('click')
            .on('click', (e) => {
                this.gotoPrintTestSols(Number($(e.target).attr('data-entry')));
            });
        $('.testscoresheet')
            .off('click')
            .on('click', async (e) => {
                await this.generateScoreSheet(Number($(e.target).attr('data-entry')));
            });
        $('.testlatex')
            .off('click')
            .on('click', (e) => {
                this.latexExportEntry = Number($(e.target).attr('data-entry'));
                $('#latexWarningDLG').foundation('open');
            });
        $('#latexconfirm')
            .off('click')
            .on('click', () => {
                $('#latexWarningDLG').foundation('close');
                window.open(OVERLEAF_TEMPLATE_URL, '_blank');
                if (this.latexExportEntry >= 0) {
                    this.exportTestToLatex(this.latexExportEntry);
                    this.latexExportEntry = -1;
                }
            });
    }

    /**
     * Trigger a plain-text file download in the browser.
     */
    public downloadText(filename: string, content: string): void {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Generate and download the two .tex files ({Name}-Test.tex and {Name}-Key.tex).
     * Called after the user confirms the LaTeX warning dialog.
     * LaTeX generation runs entirely in TypeScript — no external server required.
     * @param entry Test index to export
     */
    public exportTestToLatex(entry: number): void {
        const testdata = this.getTestEntry(entry);
        const testDataMap = this.generateTestData(testdata);
        const safeName = (testdata.title || 'Test').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Test';

        try {
            const { testTex, keyTex } = generateTestLatex(testDataMap);
            this.downloadText(`${safeName}-Test.tex`, testTex);
            // Small delay so both downloads register cleanly in the browser
            setTimeout(() => {
                this.downloadText(`${safeName}-Key.tex`, keyTex);
            }, 200);
        } catch (err) {
            alert(`LaTeX export failed:\n${String(err)}`);
        }
    }
}
