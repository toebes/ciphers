import { ITest, ITestType, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { htmlToElement } from '../common/htmldom';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState } from './ciphertest';

/**
 * CipherTestSlicer
 */
export class CipherTestSlicer extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;

    public title = "Untitled Test #";
    public outputcount = 6;
    public timedentries: number[] = []
    public ciphertypes: ICipherType[] = []
    public questionentries: number[][] = []
    public testtype: ITestType = ITestType.None;

    /**
     * Generates the command buttons on the top of the page.  In this
     * case we are overriding it so that nothing gets generated
     * @returns HTML for any command buttons on the top of the page
     */
    public genCmdButtons(): JQuery<HTMLElement> {
        return undefined;
    }
    /**
     * Generates the section above the command buttons
     * This fills out all the basic UI.  In this case
     * we 
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        const step1div = $('<div/>', { class: 'callout primary' });

        step1div.append(this.makeStepCallout('Step 1',
            htmlToElement(
                `<p>Select the number of tests to be created from slices</p>`
            )))

        step1div.append(
            JTFIncButton("Tests", "outputcount", this.outputcount, "small-12 medium-6 large-6")
        );
        result.append(step1div);

        const step2div = $('<div/>', { class: 'callout primary' });
        step2div.append(this.makeStepCallout('Step 2',
            htmlToElement(
                `<p>Select the input tests to pull questions from.
                 Remember that the tests have to all be the same order of questions and you should have completely filled out the questions setting the question text and scores.  If you want to have
                 all different timed questions, you can create tests which only have the timed question.</p>`
            )))
        const inputtests = $('<div/>', { id: 'inputtests' })
        step2div.append(inputtests);

        result.append(step2div)

        const step3div = $('<div/>', { class: 'callout primary' });
        step3div.append(this.makeStepCallout('Step 3',
            htmlToElement(
                `<p>Enter a title and click the button to save the generated tests.</p>`
            )))
        step3div.append(
            JTFLabeledInput('Title', 'text', 'title', this.title, 'small-12 medium-12 large-12')
        );
        step3div.append($("<a>", { id: "gentests", class: "button rounded cell shrink" }).text('Generate Tests'))

        const questionmix = $('<div/>', { id: 'questionmix' })
        step3div.append(questionmix);

        result.append(step3div)


        return result;
    }
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        super.restore(data, suppressOutput)
        // Once we have restored everything, update the UI
        this.calculateTestConstruction();
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        $("#outputcount").val(this.outputcount);
        this.updateInputTests();
        this.attachHandlers();
    }
    /**
     * Update the value for the number output tests
     * @param count New count value - this is limited to the 2-20 range
     * @returns Boolean indicating the the value actually changed
     */
    public setOutputCount(count: number): boolean {
        let changed = false;
        if (count < 2) {
            count = 2
            changed = true
        } else if (count > 20) {
            count = 20
            changed = true
        }
        if (count !== this.outputcount) {
            this.outputcount = count;
            changed = true;
        }
        return changed;
    }
    /**
     * Set the title for the output tests
     * @param title New title for the output tests
     * @returns Boolean indicating that the title has changed
     */
    public setTitle(title: string): boolean {
        let changed = false;
        if (this.title !== title) {
            changed = true;
            this.title = title;
        }
        return changed;
    }
    /**
     * Generate the drop down to allow selection of a test
     * @param slot Which test number slot
     * @returns HTML Elements for the select within a cell
     */
    public makeTestDropdown(slot: number): JQuery<HTMLElement> {
        const result = $('<div>', { class: 'cell large-4 medium-6' })
        const inputgroupdiv = $('<div/>', { class: "input-group" })
        const titlespan = $('<span/>', { class: "input-group-label" }).text(`Test ${slot}`)

        const select = $('<select/>', { id: `its${slot}`, class: 'itsel input-group-field' })
        // For the first one, you always have to select one.  For all else
        // the default is "No Input Test"
        if (slot > 1) {
            select.append(
                $('<option />', {
                    value: '',
                }).text('No Input Test')
            );
        }
        // Go through all the tests weknow about
        const testcount = this.getTestCount()
        for (let test = 0; test < testcount; test++) {
            // If it is a valid entry, add it to the selection list
            const testentry = this.getTestEntry(test)
            select.append(
                $('<option />', {
                    value: test,
                }).text(testentry.title)
            );
        }
        inputgroupdiv.append(titlespan)
        inputgroupdiv.append(select)

        result.append(inputgroupdiv)
        return result
    }
    /**
     * Update all the information about the currently selected tests.
     * Also update the questions that will be selected for the generated test
     */
    public updateInputTests() {
        // Find how many tests we currently have on the UI
        let currentTests = $('#inputtests .it').length;
        let result = $('#inputtests')
        // While we have too many, delete the extra entries
        while (currentTests > this.outputcount) {
            const element = document.getElementById(`it${currentTests}`);
            if (element) {
                element.remove();
            }
            currentTests--;
        }
        // Now we need to add in entries that we are missing.
        while (currentTests < this.outputcount) {
            currentTests++;
            // Put it in a div with an id of the test number so we can delete it later if needed
            const itdiv = $('<div/>', { id: `it${currentTests}`, class: 'it grid-x' })
            // And include the test drop down
            itdiv.append(this.makeTestDropdown(currentTests))
            itdiv.append($('<div/>', { class: 'cell auto', id: `itd${currentTests}` }))
            result.append(itdiv)
            result.append($('<div/>', { class: '', id: `ite${currentTests}` }))
        }
        // Now that we have them all created, go ahead and update the test constructions.
        this.calculateTestConstruction();
    }
    /**
     * Go through all the test inputs and determine what questions are available to 
     * mix into the output tests
     */
    public calculateTestConstruction() {
        // Find all of the error divs (ite<n>) and empty them out to start with
        const elements = document.querySelectorAll('[id^="ite"]');

        elements.forEach((element) => {
            element.innerHTML = ''; // Set each element's content to empty
            element.className = ''
        });

        // First we go through all the input tests and gather the questions
        // that are used on them.   
        this.timedentries = []
        this.ciphertypes = []
        this.questionentries = [[]]
        this.testtype = ITestType.None

        for (let slot = 1; slot <= this.outputcount; slot++) {
            // Find the select which indicates the test and determine which one
            // they have selected
            const selectelem = $(`#its${slot}`) as JQuery<HTMLSelectElement>
            const sel = selectelem.val() as string
            // Use that to figure out what test it actually referrs to
            const testentry = this.setInputInfo(slot, sel)
            // Plus remember where we are going to put any error messages
            const errdiv = $(`#ite${slot}`)
            if (testentry !== undefined) {
                // We have a valid test.  See if it tells us what the default test type will be
                if (this.testtype === ITestType.None && testentry.testtype !== ITestType.None) {
                    this.testtype = testentry.testtype
                }
                // Do we have a timed question on it?
                if (testentry.timed !== -1) {
                    // We have a timed question, so remember it
                    this.timedentries.push(testentry.timed)
                }
                // Go through all the questions on the test
                testentry.questions.forEach((entrynum: number, index: number) => {
                    // Get the information about the actual question
                    const entry = this.getFileEntry(entrynum)
                    if (entry !== null) {
                        // If it is not the same as any previous cipher type
                        // then we need to let them know
                        if (this.ciphertypes[index] !== undefined && this.ciphertypes[index] !== entry.cipherType) {
                            // We have an error - this one doesn't match so we need to put in a warning
                            errdiv.addClass('callout alert')
                            errdiv.append($('<p/>').text(`Question ${index + 1} has a different cipher type: ${entry.cipherType} than the main test cipher type ${this.ciphertypes[index]}`))
                        } else {
                            // Record the cipher type for this question
                            this.ciphertypes[index] = entry.cipherType
                            // And the question index (remember to initialize the array)
                            if (this.questionentries[index] === undefined) {
                                this.questionentries[index] = []
                            }
                            this.questionentries[index].push(entrynum)
                        }
                    }
                })
            }
        }
        // We gathered all the information, now we just need to display it
        this.genQuestionInfoTable();
    }

    /**
     * Show a table of all the question entries available to use in the test
     */
    public genQuestionInfoTable() {
        const output = $('#questionmix');
        // Build a three column table with:
        //   Question      Type        Question IDs
        const table = new JTTable({ class: "qdata" });
        const header = table.addHeaderRow();
        header.add('Question');
        header.add('Type');
        header.add('Question IDs');
        // Show the information for the timed question (s)
        const timedrow = table.addBodyRow();
        timedrow.add('Timed');
        timedrow.add('Aristocrat');
        timedrow.add(this.timedentries.join(', '));
        // As well as all the other questions
        for (let i = 0; i < this.questionentries.length; i++) {
            const qrow = table.addBodyRow();
            qrow.add(`${i + 1}.`);
            qrow.add(this.ciphertypes[i]);
            qrow.add(this.questionentries[i].join(', '));
        }
        // All the data has been gatered so generate and output it
        output.empty().append(table.generate());
    }
    /**
     * Set the input choice for a test 
     * @param slot Which test slot
     * @param newsel The test selection for that slot ('' is no test)
     * @returns Test entry for the selected test
     */
    public setInputInfo(slot: number, newsel: string): ITest {
        // Find where we put the description for this test slot
        const target = $(`#itd${slot}`)
        let result: ITest = undefined
        let testdesc = 'Empty Test'
        if (newsel) {
            // If we have a test, let's get the information about it
            result = this.getTestEntry(parseInt(newsel, 10))
            let qcount = result.questions.length

            if (result.testtype !== ITestType.None) {
                testdesc = this.getTestTypeName(result.testtype) + ": "
            } else {
                testdesc = "Undefined Test Type: "
            }
            if (result.timed !== -1) {
                if (qcount) {
                    testdesc += `Timed Question + ${qcount} questions`
                } else {
                    testdesc += `Timed Question only`
                }
            } else if (qcount) {
                testdesc += `No Timed Question, ${qcount} questions`
            }
        }
        // Update the description
        target.text(testdesc)
        return result
    }
    /**
     * Randomize a list of numbers
     * @param numlist List of numbers
     * @returns Randomized list of numbers
     */
    public randomizeList(numlist: number[]): number[] {
        // Fisher-Yates shuffle algorithm
        for (let i = numlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numlist[i], numlist[j]] = [numlist[j], numlist[i]]; // Swap elements
        }
        return numlist
    }
    /**
     * Build a random list of choices from a given set
     * @param numlist Initial list of numbers
     * @param size Total number of choices needed
     * @returns Randomized list with the initial list repeated enough so that 
     *          one can be selectted for each entry
     */
    public buildChoices(numlist: number[], size: number): number[] {
        // Replicate the list until we have at least as many is needed
        const result = numlist
        while (result.length < size) {
            result.push(...numlist)
        }
        // We have enough, so randomize it
        return this.randomizeList(result)
    }
    /**
     * Make a dupicate of a cipher so that when it is loaded, it isn't de-duped against another entry
     * We need to do this when we are slicing a test so that you can adjust the score values of the duplicated
     * entries without affecting all the other tests.  By adding a unique salt value, it will be loaded as
     * a separate entry instead of de-duplicated.
     * @param entry Entry number to be duplicated
     * @param salt value to add to entry so it is unique
     * @returns new entry number
     */
    public duplicateCipher(entry: number, salt: string): number {
        let state = this.getFileEntry(entry)
        state['salt'] = salt
        return this.setFileEntry(-1, state)
    }
    /**
     * Generate the tests.
     * NOTE: This code assumes that calculateTestConstruction has previously run
     */
    public genTests() {
        // Build the list of timed questions (randomized)
        const questionqnums: number[][] = []
        const timedqnum = this.buildChoices(this.timedentries, this.outputcount)
        // Also build a list for each question, also randomized
        for (let i = 0; i < this.questionentries.length; i++) {
            questionqnums.push(this.buildChoices(this.questionentries[i], this.outputcount))
        }
        // We have the question choices in random order, all we need to do is generate all the tests
        for (let testnum = 0; testnum < this.outputcount; testnum++) {
            const salt = `${testnum}`
            // Build the questions array
            let questions: number[] = []
            for (let i = 0; i < questionqnums.length; i++) {
                questions.push(this.duplicateCipher(questionqnums[i].pop(), salt))
            }
            // So that each test is different, go ahead and shuffle the entries
            questions = this.shuffleEntries(questions);
            // Everything is ready so write the test out
            const testEntry: ITest = {
                timed: this.duplicateCipher(timedqnum.pop(), salt),
                count: questions.length,
                questions: questions,
                title: `${this.title} ${testnum + 1}`,
                useCustomHeader: false,
                customHeader: '',
                testtype: this.testtype,
            };

            this.setTestEntry(-1, testEntry)
        }
        // With everything done, jump to show them all the tests
        location.assign("TestManage.html");
    }
    /**
     * Parse out a slot nubmer from the id of a dom element
     * @param str Id of the element
     * @returns slot number for the id
     */
    public getSlot(str: string): number {
        let result = 0
        // Pull out all the numberic digits at the end
        const match = str.match(/\d+$/)
        if (match) {
            result = parseInt(match[0], 10)
        }
        return result
    }
    /**
     * Attach handles to catch UI clicks
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.itsel')
            .off('change')
            .on('change', (e) => {
                const newsel = $(e.target).val() as string;
                const id = $(e.target).attr('id');
                const slot = this.getSlot(id)
                if (slot) {
                    this.setInputInfo(slot, newsel)
                    this.updateOutput();
                }
            });
        $('#outputcount')
            .off('input')
            .on('input', (e) => {
                const outputcount = Number($(e.target).val());
                if (outputcount !== this.outputcount) {
                    this.markUndo(null);
                    if (this.setOutputCount(outputcount)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        $('#title')
            .off('input')
            .on('input', (e) => {
                const title = $(e.target).val() as string;
                this.setTitle(title);
            });
        $("#gentests").off('click').on('click', (e) => {
            this.genTests()
        })
    }
}
