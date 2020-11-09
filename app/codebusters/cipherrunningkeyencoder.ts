import { ITestType, toolMode } from '../common/cipherhandler';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTRadioButton } from '../common/jtradiobutton';
import { CipherVigenereEncoder } from './ciphervigenereencoder';

/**
 *
 * Running Key Encoder
 *
 */
export class CipherRunningKeyEncoder extends CipherVigenereEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL = 'TestGuidance.html#RunningKey';

    public validTests: ITestType[] = [ITestType.None];
    public usesRunningKey = true;
    public getRunningKeyIndex(): number {
        // See if the current keyword is one of the valid options
        const runningKeys = this.getRunningKeyStrings();
        for (const entry in runningKeys) {
            if (runningKeys[entry].text === this.state.keyword) {
                return Number(entry);
            }
        }
        return -1;
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        // See if the current keyword is one of the valid options
        let selopt = this.getRunningKeyIndex();
        if (selopt === -1) {
            // The current string isn't one of the options,
            // so we need to add it to the list of possibilities
            selopt = $('#runningkey option').length;
            $('#runningkey').append($('<option />', { value: selopt }).text(this.state.keyword));
        }
        $('#runningkey option[value=' + selopt + ']').attr('selected', 'selected');
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const result = $('<div/>');
        this.genTestUsage(result);
        const runningKeys = this.getRunningKeyStrings();
        const radiobuttons = [
            { id: 'wrow', value: 'encode', title: 'Encode' },
            { id: 'mrow', value: 'decode', title: 'Decode' },
        ];
        result.append(JTRadioButton(6, 'operation', radiobuttons, this.state.operation));
        this.genQuestionFields(result);
        this.genEncodeField(result);

        const inputgroup = $('<div/>', {
            class: 'input-group cell small-12 medium-12 large-12',
        });
        $('<span/>', { class: 'input-group-label' })
            .text('title')
            .appendTo(inputgroup);
        const select = $('<select/>', {
            id: 'runningkey',
            class: 'lang input-group-field',
        });
        select.append($('<option />', { value: '' }).text('--Select a Running Key--'));
        for (const entry in runningKeys) {
            select.append(
                $('<option />', { value: entry }).text(
                    runningKeys[entry].title + ' - ' + runningKeys[entry].text.substr(0, 50) + '...'
                )
            );
        }
        inputgroup.append(select);
        result.append(inputgroup);
        const inputbox = $('<div/>', { class: 'grid-x grid-margin-x blocksize' });
        inputbox.append(JTFIncButton('Block Size', 'blocksize', this.state.blocksize, ''));
        result.append(inputbox);

        return result;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('#runningkey')
            .off('change')
            .on('change', (e) => {
                const selopt = Number($('#runningkey option:selected').val());
                const runningKeys = this.getRunningKeyStrings();
                if (selopt >= 0 && selopt < runningKeys.length) {
                    const keyword = runningKeys[selopt].text;
                    if (this.setKeyword(keyword)) {
                        this.updateOutput();
                    }
                }
            });
    }
    public genAnswer(testType: ITestType): JQuery<HTMLElement> {
        if (this.getRunningKeyIndex() === -1) {
            this.extraRunningKey = this.state.keyword;
        }
        return super.genAnswer(testType);
    }
    /**
     * Generate the HTML to display the interactive form of the cipher.
     * @param qnum Question number.  -1 indicates a timed question
     * @param testType Type of test
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        const result = this.genQuestion(testType);
        result.append($('<textarea/>', { id: 'in' + String(qnum + 1), class: 'intnote' }));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(testType: ITestType): JQuery<HTMLElement> {
        if (this.getRunningKeyIndex() === -1) {
            this.extraRunningKey = this.state.keyword;
        }
        return super.genQuestion(testType);
    }
}
