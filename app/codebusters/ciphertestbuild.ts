import { cloneObject, makeCallout } from '../common/ciphercommon';
import { IEncodeType, IOperationType, IState, ITest, ITestType, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { CipherPrintFactory } from './cipherfactory';
import { CipherTest, ITestState } from './ciphertest';

// Configuration for the range of questions on the test that can be Aristocrats
const aristocratDivBCPCTMin = .35
const aristocratDivBCPCTMax = .50
const aristocratDivAPCTMin = .15
const aristocratDivAPCTMax = .25

export type TemplateTestTypes = 'none' | 'cregional' | 'cstate' | 'cnational' | 'cpractice' | 'bregional' | 'bstate' | 'bnational' | 'bpractice' | 'aregional' | 'apractice'
export type DifficultyType = 'easy' | 'medium' | 'hard'
export interface ITempleteInfo {
    title: string;
    type: ITestType;
    id: TemplateTestTypes;
    questionCount: number;
    xenoctyptCount: number;
}
interface QuestionType {
    cipherType: ICipherType; // Type of cipher
    group: number; // Which group the question belongs to
    weight: number; // Likelihood that we want to use this on a test
    timed?: boolean;  // This can be used as a timed question
    lang?: string;// Optional language string
    title: string; // Title to show user what type of question is being generated
    testtype?: ITestType[];  // Tests that it is allowed to be on
    shift?: number[]; // Range of shift for a caesar cipher
    operation?: IOperationType; // Type of cipher opation (decode/crypt, etc)
    encodeType?: IEncodeType;  // Type of encoding (random, K1, K2, K3) for an aristocrat
    difficulty?: DifficultyType; // General difficulty for the question
    keyword?: string; // Keyword to set hill length
    guidance: string;
}

interface WeightedQuestion {
    weight: number;
    entry: QuestionType;
}
interface GroupData {
    needed: number;
    questions: WeightedQuestion[];
    minWeight: number;
}

const allButARegional = [ITestType.None, ITestType.bregional, ITestType.bstate, ITestType.cregional, ITestType.cstate]
/**
 * CipherTestBuild
 *    This provides a UI for building a test.
 */
export class CipherTestBuild extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;

    public questionChoices: QuestionType[] = [
        // ----------------------------------------------------------------------------------------------
        //    GROUP 1 - Aristocrats
        // ----------------------------------------------------------------------------------------------
        {
            title: 'Easy Aristocrat with a Hint',
            guidance: 'Easy Quote [75-90 non-blank characters, χ²<20] with Hint',
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            operation: 'decode', encodeType: 'random', difficulty: 'easy',
        },
        {
            title: 'Easy Aristocrat without a Hint',
            guidance: 'Easy Quote [75-90 non-blank characters, χ²<20]',
            group: 1, weight: 0.75, timed: true, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'random', difficulty: 'easy',
        },
        {
            title: 'Medium Aristocrat with a Hint',
            guidance: 'Medium Quote [75-90 non-blank characters, 20<χ²<25] with Hint',
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            operation: 'decode', encodeType: 'random', difficulty: 'medium',
        },
        {
            title: 'Medium Aristocrat without a Hint',
            guidance: 'Medium Quote [75-90 non-blank characters, 20<χ²<25]',
            group: 1, weight: 0.75, timed: true, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'random', difficulty: 'medium',
        },
        {
            title: 'Hard K1 Aristocrat with a Hint',
            guidance: 'Hard Quote [75-90 non-blank characters, χ²>25] with Hint',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'hard',
        },
        {
            title: 'Hard K1 Aristocrat without a Hint',
            guidance: 'Hard Quote [75-90 non-blank characters, χ²>25]',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'hard',
        },
        {
            title: 'Hard K2 Aristocrat with a Hint',
            guidance: 'Hard Quote [75-90 non-blank characters, χ²>25] with Hint',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'hard',
        },
        {
            title: 'Hard K2 Aristocrat without a Hint',
            guidance: 'Hard Quote [75-90 non-blank characters, χ²>25]',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'hard',
        },
        {
            title: 'Misspelled K1 Aristocrat with a Hint',
            guidance: 'Misspelled Quote [75-90 non-blank characters, χ²<25] with Hint',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1',
        },
        {
            title: 'Misspelled K1 Aristocrat without a Hint',
            guidance: 'Misspelled Quote [75-90 non-blank characters, χ²<25]',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1',
        },
        {
            title: 'Misspelled K2 Aristocrat with a Hint',
            guidance: 'Misspelled Quote [75-90 non-blank characters, χ²<25] with Hint',
            testtype: allButARegional, operation: 'decode', encodeType: 'k2',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
        },
        {
            title: 'Misspelled K2 Aristocrat without a Hint',
            guidance: 'Misspelled Quote [75-90 non-blank characters, χ²<25]',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2',
        },
        {
            title: 'Keyword/Key Phrase K1 Aristocrat',
            guidance: 'Medium Quote [75-90 non-blank characters, 20<χ²<25]',
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'medium',
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
        },
        {
            title: 'Keyword/Key Phrase K2 Aristocrat',
            guidance: 'Easy Quote [75-90 non-blank characters, χ²<20]',
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'easy',
        },
        {
            title: 'Keyword/Key Phrase K3 Aristocrat',
            guidance: 'Easy Quote [75-90 non-blank characters, χ²<20]',
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k3', difficulty: 'easy',
        },
        {
            title: 'Easy K1 Patristocrat',
            guidance: 'Easy Quote [95-110 non-blank characters, χ²<20]',
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'easy',
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
        },
        {
            title: 'Easy K2 Patristocrat',
            guidance: 'Easy Quote [95-110 non-blank characters, χ²<20]',
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'easy',
        },
        {
            title: 'Medium K1 Patristocrat',
            guidance: 'Medium Quote [95-110 non-blank characters, 20<χ²<25]',
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'medium',
        },
        {
            title: 'Medium K2 Patristocrat',
            guidance: 'Medium Quote [95-110 non-blank characters, 20<χ²<25]',
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'medium',
        },
        // ----------------------------------------------------------------------------------------------
        //    GROUP 2 - Xenocrypts
        // ----------------------------------------------------------------------------------------------
        {
            title: 'Medium K1 Spanish Xenocrypt',
            guidance: 'Medium Spanish Quote [75-90 non-blank characters, 20<χ²<25]',
            group: 2, weight: 0.5, cipherType: ICipherType.Aristocrat, lang: 'es',
            encodeType: 'k1', difficulty: 'medium',
        },
        {
            title: 'Medium K2 Spanish Xenocrypt',
            guidance: 'Medium Spanish Quote [75-90 non-blank characters, 20<χ²<25]',
            group: 2, weight: 0.5, cipherType: ICipherType.Aristocrat, lang: 'es',
            encodeType: 'k2', difficulty: 'medium',
        },
        // ----------------------------------------------------------------------------------------------
        //    GROUP 3 - Other Cipher types
        // ----------------------------------------------------------------------------------------------
        {
            title: "Affine Decode",
            guidance: '[25-30 getLineAndCharacterOfPosition, 13 or more unique letters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Affine,
            operation: 'decode'
        },
        {
            title: "Affine Cryptanalysis",
            guidance: '[25-30 getLineAndCharacterOfPosition, 13 or more unique letters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Affine,
            operation: 'crypt'
        },
        {
            title: "Caesar",
            guidance: '[20-45 Characters.  Shift value +/- 3]',
            group: 3, weight: 0.5, cipherType: ICipherType.Caesar,
            shift: [-3, 3], testtype: [ITestType.aregional], operation: 'decode'
        },
        {
            title: "Caesar",
            guidance: '[80-90 Characters. No single letter words]',
            group: 3, weight: 0.5, cipherType: ICipherType.Caesar,
            testtype: allButARegional, operation: 'decode'
        },
        {
            title: "Running Men",
            guidance: '[20-30 Characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.RunningMen,
        },
        {
            title: 'Atbash',
            guidance: '[45-80 Characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Atbash,
            operation: 'decode'
        },
        {
            title: "Complete Columnar",
            guidance: '[45-90 Characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.CompleteColumnar,
        },
        {
            title: "Complete Columnar",
            guidance: '[45-90 Characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.CompleteColumnar,
        },
        {
            title: "Cryptarithm",
            guidance: '[Addition formula with a carry to make 1 or 2 digits obvious]',
            group: 3, weight: 0.5, cipherType: ICipherType.Cryptarithm,
        },
        {
            title: "Cryptarithm",
            guidance: '[Addition formula with a carry to make 1 or 2 digits obvious]',
            group: 3, weight: 0.5, cipherType: ICipherType.Cryptarithm,
        },
        {
            title: "Hill 2x2",
            guidance: '[19-23 (Odd) characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Hill,
            keyword: "TEST"
        },
        {
            title: "Hill 3x3",
            guidance: '[20-28 (not multiple of 3) characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Hill,
            keyword: "TEMPORARY"
        },
        {
            title: "Porta Decode",
            guidance: '[55-62 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Porta,
            operation: 'decode'
        },
        {
            title: "Porta Cryptanalysis",
            guidance: '[55-62 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Porta,
            operation: 'crypt'
        },
        {
            title: "Nihilist Decode",
            guidance: '[55-75 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.NihilistSubstitution,
            operation: 'decode'
        },
        {
            title: "Nihilist Decode",
            guidance: '[55-75 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.NihilistSubstitution,
            operation: 'decode'
        },
        {
            title: "Nihilist Cryptanalysis",
            guidance: '[55-75 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.NihilistSubstitution,
            operation: 'crypt'
        },
        {
            title: "Vigenère Decode",
            guidance: '[50-60 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Vigenere,
            operation: 'decode'
        },
        {
            title: "Vigenère Cryptanalysis",
            guidance: '[50-60 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Vigenere,
            operation: 'crypt'
        },
        {
            title: 'Running Key',
            guidance: '[50-60 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.RunningKey,
        },
        {
            group: 3, weight: 0.5, cipherType: ICipherType.Baconian,
            title: "Baconian Letter for Letter",
            guidance: '[35-50 characters]',
            operation: 'let4let'
        },
        {
            title: "Baconian Sequence",
            guidance: '[35-50 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Baconian,
            operation: 'sequence',
        },
        {
            title: "Baconian Words",
            guidance: '[30-40 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Baconian,
            operation: 'words'
        },
        {
            title: "RSA",
            guidance: '[2 digit primes]',
            group: 3, weight: 0.5, cipherType: ICipherType.RSA,
        },
        {
            title: "Pig Pen",
            guidance: '[40-50 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.PigPen,
        },
        {
            title: 'TapCode',
            guidance: '[18-30 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.TapCode,
        },
        {
            title: "Morbit Decode",
            guidance: '[35-42 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Morbit,
            operation: 'decode',
        },
        {
            title: "Morbit Cryptanalysis",
            guidance: '[35-42 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Morbit,
            operation: 'crypt',
        },
        {
            group: 3, weight: 0.5, cipherType: ICipherType.Pollux,
            title: "Pollux Decode",
            guidance: '[35-42 characters]',
            operation: 'decode'
        },
        {
            group: 3, weight: 0.5, cipherType: ICipherType.Pollux,
            title: "Pollux Cryptanalysis",
            guidance: '[35-42 characters]',
            operation: 'crypt'
        },
        {
            title: "Fractionated Morse",
            guidance: '[38-52 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.FractionatedMorse,
        },
        {
            title: "Railfence Variable Rails",
            guidance: '[55-62 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Railfence,
        },
        {
            title: "Railfence Fixed Rails",
            guidance: '[55-62 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Railfence,
        },
        {
            title: "Railfence Variable Rails and Offset",
            guidance: '[55-62 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.Railfence,
        },
    ];

    public title = "Untitled Test";
    public templateType: TemplateTestTypes = 'none'
    public questionCount = 10
    public xenocryptCount = 0
    public testtype: ITestType = ITestType.None;
    public cmdButtons: JTButtonItem[] = [];
    public templateMap: ITempleteInfo[] = [
        {
            title: 'None',

            type: ITestType.None,
            id: 'none',
            questionCount: 10,
            xenoctyptCount: 0,
        },
        {
            title: 'C (High School) - Invitational/Regional',

            type: ITestType.cregional,
            id: 'cregional',
            questionCount: 18,
            xenoctyptCount: 1,
        },
        {
            title: 'C (High School) - State',

            type: ITestType.cstate,
            id: 'cstate',
            questionCount: 24,
            xenoctyptCount: 2,
        },
        {
            title: 'C (High School) - National',

            type: ITestType.cstate,
            id: 'cnational',
            questionCount: 26,
            xenoctyptCount: 2,
        },
        {
            title: 'C (High School) - Short Practice',

            type: ITestType.cregional,
            id: 'cpractice',
            questionCount: 5,
            xenoctyptCount: 0,
        },
        {
            title: 'B (Middle School) - Invitational/Regional',

            type: ITestType.bregional,
            id: 'bregional',
            questionCount: 18,
            xenoctyptCount: 0,
        },
        {
            title: 'B (Middle School) - State',

            type: ITestType.bstate,
            id: 'bstate',
            questionCount: 24,
            xenoctyptCount: 1,
        },
        {
            title: 'B (Middle School) - National',

            type: ITestType.bstate,
            id: 'bnational',
            questionCount: 26,
            xenoctyptCount: 1,
        },
        {
            title: 'B (Middle School) - Short Practice',

            type: ITestType.bregional,
            id: 'bpractice',
            questionCount: 5,
            xenoctyptCount: 0,
        },
        {
            title: 'A (Elementary School) - Invitational/Regional',

            type: ITestType.aregional,
            id: 'aregional',
            questionCount: 16,
            xenoctyptCount: 0,
        },
        {
            title: 'A (Elementary School) - Short Practice',

            type: ITestType.aregional,
            id: 'apractice',
            questionCount: 6,
            xenoctyptCount: 0,
        },
    ];

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
    public makeStepCallout(step: string, content: string): JQuery<HTMLElement> {
        const title = $('<h3>').text(step)
        const body = $("<p/>").text(content)
        return makeCallout($("<div/>").append(title).append(body), 'secondary')
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const testdiv = $('<div/>', { class: 'callout primary' });
        testdiv.append(this.makeStepCallout('Step 1', "Pick a title, test type and confirm the number of questions, then click the Generate Template button to generate the list of questions"))

        testdiv.append(
            JTFLabeledInput('Title', 'text', 'title', this.title, 'small-12 medium-12 large-12')
        );

        const testTypeBox = $('<div/>', { class: 'grid-x grid-margin-x' });
        testTypeBox.append(
            this.genTemplateDropdown('testtype',
                'Test Type',
                this.templateType,
                'input-group cell small-12 medium-12 large-12'));
        testdiv.append(testTypeBox);

        const inputbox = $('<div/>', {
            class: 'grid-x grid-margin-x',
        });
        inputbox.append(JTFIncButton('Questions', 'qcount', this.questionCount, 'small-6 medium-6 large-3'));
        inputbox.append(JTFIncButton('Xenocrypts', 'xcount', this.xenocryptCount, 'small-6 medium-6 large-3'));

        inputbox.append($("<a>", { id: "genlist", class: "button rounded cell shrink" }).text('Generate Template'))
        testdiv.append(inputbox)

        const qdiv = $('<div>', { id: 'qlist' })
        testdiv.append(qdiv)
        $('.testdata').each((i, elem) => {
            $(elem).replaceWith(testdiv);
        });
        return $('<div>');
    }
    public getTemplateInfo(id: TemplateTestTypes): ITempleteInfo {
        let result = this.templateMap.find((val) => { return val.id === id })
        return result
    }

    /**
     * Generate a dropdown for the type of test
     * @param ID HTML ID of the generated dropdown
     * @param title Title text for the generated dropdown
     */
    public genTemplateDropdown(
        id: string,
        title: string,

        templateid: TemplateTestTypes,
        sizeclass: string
    ): JQuery<HTMLElement> {
        const inputgroup = $('<div/>', {
            class: sizeclass,
        });
        $('<span/>', { class: 'input-group-label' })
            .text(title)
            .appendTo(inputgroup);
        const select = $('<select/>', {
            id: id,
            class: 'input-group-field',
        });
        let option = $('<option />', {
            value: '',
            disabled: 'disabled',
        }).text('--Select a Test Type--');

        if (templateid === undefined) {
            option.attr('selected', 'selected');
        }
        select.append(option);

        for (const entry of this.templateMap) {
            option = $('<option />', {
                value: entry.id,
            }).html(entry.title);
            if (templateid === entry.id) {
                option.attr('selected', 'selected');
            }
            select.append(option);
        }
        inputgroup.append(select);
        return inputgroup;
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        $("#qcount").val(this.questionCount);
        $("#xcount").val(this.xenocryptCount);
        this.attachHandlers();
    }

    public setQuestionCount(count: number): boolean {
        let changed = false;
        if (count < 1) {
            count = 1
            changed = true
        } else if (count > 36) {
            count = 36
            changed = true
        }
        if (count !== this.questionCount) {
            this.questionCount = count;
            changed = true;
        }
        if (this.questionCount < this.xenocryptCount) {
            this.xenocryptCount = this.questionCount;
            changed = true;
        }
        return changed;
    }
    public setXenocryptCount(count: number): boolean {
        let changed = false;
        if (count < 0) {
            count = 0
            changed = true
        } else if (count > this.questionCount) {
            count = this.questionCount
            changed = true
        }
        if (count !== this.xenocryptCount) {
            this.xenocryptCount = count;
            changed = true;
        }
        return changed;
    }
    /**
     * Set the type of the test for the current test
     * @param testtype Type for the test
     * @returns Boolean indicating that the type actually changed
     */
    public setTestType(testtype: ITestType): boolean {
        let changed = false;
        if (testtype !== this.testtype) {
            changed = true;
            this.testtype = testtype;
        }
        return changed;
    }
    public setTemplateType(type: TemplateTestTypes): boolean {
        let changed = false;
        if (this.templateType !== type) {
            changed = true;
            this.templateType = type;

            const template = this.getTemplateInfo(type);
            if (template !== undefined && template !== null) {
                this.setQuestionCount(template.questionCount);
                this.setXenocryptCount(template.xenoctyptCount);
                this.setTestType(template.type);
            }
        }
        return changed;
    }
    public setTitle(title: string): boolean {
        let changed = false;
        if (this.title !== title) {
            changed = true;
            this.title = title;
        }
        return changed;
    }
    /**
     * Determine if a ciphertype is good to use as a special bonus question
     * @param cipherType to check
     * @returns Boolean indicating cipher type makes for a good special bonus questiton
     */
    public isGoodSpecialCipherType(cipherType: ICipherType): boolean {
        // This is ugly to have to check this way, but string enums can't be used as an index
        // in a constant map..
        return cipherType === ICipherType.CompleteColumnar ||
            cipherType === ICipherType.Cryptarithm ||
            cipherType === ICipherType.Hill ||
            cipherType === ICipherType.Porta ||
            cipherType === ICipherType.NihilistSubstitution ||
            cipherType === ICipherType.RunningKey ||
            cipherType === ICipherType.Baconian ||
            cipherType === ICipherType.Morbit ||
            cipherType === ICipherType.Pollux ||
            cipherType === ICipherType.FractionatedMorse ||
            cipherType === ICipherType.Railfence;

    }
    public genTestTemplate() {
        const template = this.getTemplateInfo(this.templateType);
        const testtype = template.type;
        $("#qlist").empty()
            .append(this.makeStepCallout('Step 2', "Please review the generated choices and scroll to the bottom for the next step"))

        // First based on the number of questions, we determine how many will be in each group.
        // The four groups are:
        // Group 0 - Timed question
        // Group 1 - Aristocrats (the timed question doesn't count).  This will be between aristocratPCTMin (35%) and aristocratPCTMax (50%) of the questions
        // Group 2 - Xenocrypts based on the number selected by the user
        // Group 3 - All others
        let groups: GroupData[] = [{ needed: 1, questions: [], minWeight: -1 }, { needed: 0, questions: [], minWeight: -1 }, { needed: this.xenocryptCount, questions: [], minWeight: -1 }, { needed: 0, questions: [], minWeight: -1 }]
        let needed = this.questionCount - this.xenocryptCount;

        let aristcount = 0
        if (this.testtype === ITestType.aregional || this.testtype === ITestType.astate) {
            aristcount = Math.round(needed * (aristocratDivAPCTMin + (Math.random() * (aristocratDivAPCTMax - aristocratDivAPCTMin))))
        } else {
            aristcount = Math.round(needed * (aristocratDivBCPCTMin + (Math.random() * (aristocratDivBCPCTMax - aristocratDivBCPCTMin))))
        }
        // Handle where they are asking for a lot of xenocrypts
        if (this.xenocryptCount > aristcount) {
            aristcount = this.xenocryptCount
        }
        groups[1].needed = aristcount - this.xenocryptCount;
        groups[3].needed = this.questionCount - aristcount;

        if (template.type === ITestType.aregional || template.type === ITestType.astate) {
            groups[0].needed = 0;
        }
        // We have the target number of questions for each group, 
        let possibilities: QuestionType[] = []
        for (let entry of this.questionChoices) {
            const cipherhandler = CipherPrintFactory(entry.cipherType, entry.lang);
            cipherhandler.setCipherType(entry.cipherType);
            if (entry.encodeType !== undefined) {
                cipherhandler.state.encodeType = entry.encodeType
            }
            if (entry.operation !== undefined) {
                cipherhandler.state.operation = entry.operation;
            }
            if (entry.keyword !== undefined) {
                cipherhandler.state.keyword = entry.keyword;
            }
            let appropriateCheck = ''
            if (entry.testtype !== undefined && !entry.testtype.includes(this.testtype)) {
                appropriateCheck = 'Question not defined for this test type;'
            } else {
                appropriateCheck = cipherhandler.CheckAppropriate(testtype, false);
            }
            if (appropriateCheck === '') {
                if (possibilities.findIndex((check) => check.title === entry.title) < 0) {
                    possibilities.push(entry);
                }
                // We can use it!
                this.AssignEntryToGroup(entry, groups[entry.group]);
                if (entry.timed) {
                    this.AssignEntryToGroup(entry, groups[0])
                }
            }
        }
        // See if we have enough entries to fill the test.  If not we will have to go back through the possibilities list
        while (this.amtNeeded(groups) > 0) {
            groups.forEach((groupData) => {
                const thisNeed = groupData.needed - groupData.questions.length
                if (!thisNeed) {
                    groupData.minWeight = 999;
                } else {
                    needed += thisNeed;
                }
            })
            if (needed === 0) {
                break;
            }
            // We need more entries, so run through the list again
            for (let entry of possibilities) {
                let groupData = groups[entry.group]
                if (groupData.needed > groupData.questions.length) {
                    this.AssignEntryToGroup(entry, groupData)
                }
            }
        }


        // Build up the GUI of questions.  For now we won't sort them, but we need to ...
        // Gather all the questions together.  First we put them all in a list using a random number that we can sort on
        let testData: WeightedQuestion[] = [];
        for (let i = 1; i < groups.length; i++) {
            groups[i].questions.forEach((entry) => {
                testData.push({ weight: Math.random(), entry: entry.entry })
            })
        }
        // Sort the list based on the random weights as an initial ordering
        testData = testData.sort((a, b) => a.weight - b.weight)
        // Next we need to make sure that no two cipher types are next to each other (if that is possible)
        let finalData: QuestionType[] = [];
        let saveData: QuestionType[] = [];
        let specialCandidates = new Map<ICipherType, number>
        let lastType = 'Aristocrat';
        testData.forEach((entry) => {
            // What general type of cipher is this?
            let thisType = this.getCipherSubType(entry.entry.cipherType);
            // Let's add it to the list of special candidates for the group 3 entries
            if (entry.entry.group === 3 && this.isGoodSpecialCipherType(entry.entry.cipherType)) {
                if (specialCandidates[entry.entry.cipherType] === undefined) {
                    specialCandidates[entry.entry.cipherType] = 0
                }
                specialCandidates[entry.entry.cipherType]++
            }

            if (thisType === lastType) {
                // We can't put this next to the current one, so push it onto the save stack
                saveData.push(entry.entry);
            } else {
                finalData.push(entry.entry);
                lastType = thisType;
            }
            // See if there is anything on the save stack that we can pull in
            while (saveData.length > 0) {
                const foundIndex = saveData.findIndex((entry) => this.getCipherSubType(entry.cipherType) !== lastType)
                if (foundIndex === -1) {
                    break;
                }
                const entries = saveData.splice(foundIndex, 1)
                entries.forEach((entry) => {
                    finalData.push(entry);
                    lastType = this.getCipherSubType(entry.cipherType)
                });

            }
        })

        // Anything left on the save stack will all be the same and we don't have a good way of placing them, so just put them on the end.  This typically happens when
        // we have more than 50% aristocrats.
        saveData.forEach((entry) => { finalData.push(entry) })

        // Pick which entries can be the special bonus question
        const isSpecial = this.findSpecialBonus(specialCandidates, finalData);

        // Figure out which three ciphers will be special candidates

        // Show them what we now have
        const table = new JTTable({ class: 'qlist' })
        const headerrow = table.addHeaderRow()
        headerrow.add({ settings: { class: "qr" }, content: 'Question' })
        headerrow.add({ settings: { class: "sb" }, content: 'Special Bonus' })
        headerrow.add({ settings: { class: "typ" }, content: 'Cipher Type' })
        headerrow.add({ settings: { class: "txt" }, content: 'Plain Text' })
        headerrow.add({ settings: { class: "aut" }, content: 'Author' })

        if (groups[0].questions.length > 0) {
            this.generateQuestionRow(-1, table, groups[0].questions[0].entry, false, possibilities)
        }
        // Lastly populate the UI
        finalData.forEach((entry, index) => {
            this.generateQuestionRow(index, table, entry, isSpecial[index], possibilities)

        })
        $("#qlist").append(table.generate())
        $("#qlist")
            .append(this.makeStepCallout("Step 3", "Optionally Click on the Populate Plain Text to fill with samples"))
            .append($('<div/>', {
                class: 'grid-x grid-margin-x',
            }).append($("<a>", { id: "populate", class: "button rounded cell shrink" }).text('Populate Plain Text'))
                .append(JTFLabeledInput('Optional Supervisor Coupon', 'text', 'coupon', "", 'cell auto'))
            )
            .append(this.makeStepCallout("Step 4", "Click on Save Test to create the test and edit it"))
            .append($('<div/>', {
                class: 'grid-x grid-margin-x',
            }).append($("<a>", { id: "save", class: "button rounded cell shrink" }).text('Save Test'))
            )
        this.attachHandlers();
    }
    /**
     * 
     */
    public populateTemplate() {
        const qCount = $('.qt').length
        for (let qnum = 0; qnum < qCount; qnum++) {
            let idNum = String(qnum);
            const qTitle = $('#qt' + idNum).val() as string;
            const choice = this.questionChoices.findIndex((elem) => elem.title === qTitle)
            if (choice === -1) {
                // Somehow we didn't find it.. so we just have to skip it
                $('#ct' + idNum).val(`Unable to find type '${qTitle}'`)
            } else {
                //sb
                $('#ct' + idNum).val(`Generating text for '${qTitle}'`)
            }
            //            ct
        }
        //      alert(`populating template for ${qCount} questions`)
    }
    public saveTest() {
        // First we create the test entry
        const testEntry: ITest = {
            timed: -1,
            count: 0,
            questions: [],
            title: this.title,
            useCustomHeader: false,
            customHeader: '',
            testtype: this.testtype,
        };

        const qCount = $('.qt').length
        for (let qnum = 0; qnum < qCount; qnum++) {
            let idNum = String(qnum);
            const qTitle = $('#qt' + idNum).val() as string;
            const plaintext = $('#ct' + idNum).val() as string;
            const author = $('#au' + idNum).val() as string;

            // Division A won't have a timed question, so we can just skip it
            if (qnum === 0 && qTitle === "") {
                continue;
            }
            const choice = this.questionChoices.findIndex((elem) => elem.title === qTitle)
            if (choice === -1) {
                // Somehow we didn't find the cipher they selected.. so we just have to skip it
                continue;
            }
            // Let's create a cipher
            const entry = this.questionChoices[choice];

            let lang = entry.lang;
            if (lang === undefined || lang === '') {
                lang = 'en';
            }
            const state: IState = {
                cipherType: entry.cipherType,
                points: 0,
                question: entry.title,
                cipherString: plaintext,
                author: author,
                curlang: lang,
            };

            if (entry.encodeType !== undefined) {
                state.encodeType = entry.encodeType
            }
            if (entry.operation !== undefined) {
                state.operation = entry.operation;
            }
            if (entry.keyword !== undefined) {
                state.keyword = entry.keyword;
            }

            const savefileentry = this.setFileEntry(-1, state);
            if (qnum === 0) {
                testEntry.timed = savefileentry
            } else {
                testEntry.questions.push(savefileentry);
                testEntry.count++;
            }
        }
        const test = this.setTestEntry(-1, testEntry);
        this.gotoEditTest(test);
    }
    /**
     * 
     * @param specialCandidates 
     * @param finalData 
     * @returns 
     */
    public findSpecialBonus(specialCandidates: Map<ICipherType, number>, finalData: QuestionType[]) {
        const isSpecial = Array<boolean>(finalData.length).fill(false);
        if (finalData.length > 10) {
            // First we pick 3 of the legal ciphers that we will choose from
            const specialChoices = this.pickN(3, Object.keys(specialCandidates));
            specialChoices.map((cipherType) => {
                // Then for each of the ones we picked, choose one of the ciphers of that type
                // and go down the list until we find it to mark it as special              
                let choice = Math.trunc(Math.random() * specialCandidates[cipherType]);
                for (let i = 0; i < finalData.length && choice >= 0; i++) {
                    if (finalData[i].cipherType === cipherType) {
                        if (choice === 0) {
                            isSpecial[i] = true;
                        }
                        choice--;
                    }
                }
            });
        }
        return isSpecial;
    }

    /**
     * Pick N out of a set of arbitrary values
     * @param topick Number of entries to pick
     * @param list List of entries to pick from
     * @returns a subset of the entries randomly picked
     */
    public pickN(topick: number, list: any[]): any[] {
        let sortList: { weight: number, entry: any }[] = []
        if (topick >= list.length) {
            return list
        }
        list.forEach((entry) => sortList.push({ weight: Math.random(), entry: entry }))
        sortList = sortList.sort((a, b) => a.weight - b.weight)
        const result: any[] = []
        for (let i = 0; i < topick; i++) {
            result.push(sortList[i].entry)
        }
        return (result)
    }
    /**
     * 
     * @param index Which question number
     * @param row The Row to add the information into
     * @param entry 
     * @param possibilities 
     */
    public generateQuestionRow(index: number, table: JTTable, entry: QuestionType, isSpecial: boolean, possibilities: QuestionType[]): void {
        const row = table.addBodyRow()
        const idNum = String(index + 1)
        let title = ''
        if (index === -1) {
            row.add({ settings: { class: "qr" }, content: 'Timed Question' })
        } else {
            row.add({ settings: { class: "qr" }, content: String(index + 1) + "." })
        }
        // See if we mark it as a special bonus
        if (isSpecial) {
            let checkBox = $('<input/>', { type: "checkbox", checked: "checked" })
            row.add({ settings: { class: 'sb', id: "sp" + idNum }, content: checkBox })
        } else if (this.isGoodSpecialCipherType(entry.cipherType)) {
            let checkBox = $('<input/>', { type: "checkbox" })
            row.add({ settings: { class: 'sb' }, content: checkBox })
        } else {
            row.add('')
        }
        const select = $('<select/>', {
            id: 'qt' + idNum,
            class: 'qt input-group-field',
        });
        let option = $('<option />', {
            value: '',
            disabled: 'disabled',
        }).text('--Select a Question Type--');

        if (entry === undefined) {
            option.attr('selected', 'selected');
        } else {
            title = entry.title
        }
        select.append(option);

        possibilities.forEach((entry) => {
            option = $('<option/>').text(entry.title)
            if (entry.title === title) {
                option.attr('selected', 'selected');
            }
            select.append(option);
        })
        row.add({ settings: { class: 'typ' }, content: select })
        let cipherText = $('<input/>', { type: "text", id: 'ct' + idNum, value: `«${entry.guidance}»` })
        row.add({ settings: { class: 'txt' }, content: cipherText })
        let authorText = $('<input/>', { type: "text", id: 'au' + idNum })



        row.add({ settings: { class: 'aut' }, content: authorText })
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

    /**
     * Determine the number of entries still needed to fill a group
     * @param groups 
     * @returns Number of entries still needed
     */
    public amtNeeded(groups: GroupData[]): number {
        let needed = 0
        groups.forEach((groupData, index) => {
            const thisNeed = groupData.needed - groupData.questions.length
            if (!thisNeed) {
                groups[index].minWeight = 9999;
            } else {
                needed += thisNeed;
            }
        })
        return needed
    }
    /**
     * Determine if an entry is high enough weight to put into a given group.
     * @param entry Cipher entry to check
     * @param groupData Group to check into
     */
    public AssignEntryToGroup(entry: QuestionType, groupData: GroupData) {
        const weight = entry.weight + Math.random();
        if (groupData.needed > groupData.questions.length) {
            // We don't have enough questions, so add it to the group
            groupData.questions.push({ weight: weight, entry: entry });
            if (weight < groupData.minWeight) {
                groupData.minWeight = weight;
            }
        } else if (weight > groupData.minWeight) {
            // This is a higher priority than one in the group, so we need to replace it
            let newMinWeight = 9999;
            for (let index = 0; index < groupData.questions.length; index++) {
                let groupEntry = groupData.questions[index];
                // Find the slot that corresponds to the 
                let thisWeight = groupEntry.weight
                if (groupEntry.weight === groupData.minWeight) {
                    thisWeight = weight;
                    groupData.questions[index].weight = weight;
                    groupData.questions[index].entry = entry;
                    // Make sure we don't replace more than one entry.
                    // This is unlilely given the random numbers, but it could happen
                    groupData.minWeight = 9999;
                }
                if (thisWeight < newMinWeight) {
                    newMinWeight = thisWeight;
                }
            };
            groupData.minWeight = newMinWeight;
        }
    }

    public attachHandlers(): void {
        super.attachHandlers();
        $("#genlist").off('click').on('click', (e) => {
            this.genTestTemplate()
        })
        $("#populate").off('click').on('click', (e) => {
            this.populateTemplate()
        })
        $("#save").off('click').on('click', (e) => {
            this.saveTest()
        })

        $('#testtype')
            .off('change')
            .on('change', (e) => {
                // We need to lookup the id and convert it to a test type
                if (this.setTemplateType($(e.target).val() as TemplateTestTypes)) {
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

        $('#qcount')
            .off('input')
            .on('input', (e) => {
                const qcount = Number($(e.target).val());
                if (qcount !== this.questionCount) {
                    this.markUndo(null);
                    if (this.setQuestionCount(qcount)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        $('#xcount')
            .off('input')
            .on('input', (e) => {
                const qcount = Number($(e.target).val());
                if (qcount !== this.xenocryptCount) {
                    this.markUndo(null);
                    if (this.setXenocryptCount(qcount)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
    }
}
