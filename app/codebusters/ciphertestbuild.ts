import { cloneObject, makeCallout } from '../common/ciphercommon';
import { IEncodeType, IOperationType, IState, ITest, ITestType, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { htmlToElement } from '../common/htmldom';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTTable } from '../common/jttable';
import { IAristocratState } from './cipheraristocratencoder';
import { IEncoderState } from './cipherencoder';
import { CipherPrintFactory } from './cipherfactory';
import { CipherTest, ITestState, QueryParms, QuoteUpdates, UsedIdMap } from './ciphertest';

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
    default?: string;
    len?: number[]
    chi2?: number[]
    unique?: number[]
    homonyms?: number[]
    msg?: string;
    usehint?: boolean;
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
            len: [75, 90], chi2: [-Infinity, 20], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            operation: 'decode', encodeType: 'random', difficulty: 'easy',
        },
        {
            title: 'Easy Aristocrat without a Hint',
            guidance: 'Easy Quote [75-90 non-blank characters, χ²<20]',
            len: [75, 90], chi2: [-Infinity, 20], unique: [19, Infinity],
            group: 1, weight: 0.75, timed: true, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'random', difficulty: 'easy',
        },
        {
            title: 'Medium Aristocrat with a Hint',
            guidance: 'Medium Quote [75-90 non-blank characters, 20<χ²<25] with Hint',
            len: [75, 90], chi2: [20, 25], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            operation: 'decode', encodeType: 'random', difficulty: 'medium',
        },
        {
            title: 'Medium Aristocrat without a Hint',
            guidance: 'Medium Quote [75-90 non-blank characters, 20<χ²<25]',
            len: [75, 90], chi2: [20, 25], unique: [19, Infinity],
            group: 1, weight: 0.75, timed: true, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'random', difficulty: 'medium',
        },
        {
            title: 'Hard K1 Aristocrat with a Hint',
            guidance: 'Hard Quote [75-90 non-blank characters, χ²>25] with Hint',
            len: [75, 90], chi2: [25, Infinity], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'hard',
        },
        {
            title: 'Hard K1 Aristocrat without a Hint',
            guidance: 'Hard Quote [75-90 non-blank characters, χ²>25]',
            len: [75, 90], chi2: [25, Infinity], unique: [19, Infinity],
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'hard',
        },
        {
            title: 'Hard K2 Aristocrat with a Hint',
            guidance: 'Hard Quote [75-90 non-blank characters, χ²>25] with Hint',
            len: [75, 90], chi2: [25, Infinity], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'hard',
        },
        {
            title: 'Hard K2 Aristocrat without a Hint',
            guidance: 'Hard Quote [75-90 non-blank characters, χ²>25]',
            len: [75, 90], chi2: [25, Infinity], unique: [19, Infinity],
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'hard',
        },
        {
            title: 'Misspelled K1 Aristocrat with a Hint',
            guidance: 'Misspelled Quote [75-90 non-blank characters, χ²<25] with Hint',
            len: [75, 90], chi2: [-Infinity, 25], unique: [19, Infinity], homonyms: [6, Infinity], usehint: true,
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1',
        },
        {
            title: 'Misspelled K1 Aristocrat without a Hint',
            guidance: 'Misspelled Quote [75-90 non-blank characters, χ²<25]',
            len: [75, 90], chi2: [-Infinity, 25], unique: [19, Infinity], homonyms: [6, Infinity],
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1',
        },
        {
            title: 'Misspelled K2 Aristocrat with a Hint',
            guidance: 'Misspelled Quote [75-90 non-blank characters, χ²<25] with Hint',
            len: [75, 90], chi2: [-Infinity, 25], unique: [19, Infinity], homonyms: [6, Infinity], usehint: true,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
        },
        {
            title: 'Misspelled K2 Aristocrat without a Hint',
            guidance: 'Misspelled Quote [75-90 non-blank characters, χ²<25]',
            len: [75, 90], chi2: [-Infinity, 25], unique: [19, Infinity], homonyms: [6, Infinity],
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2',
        },
        {
            title: 'Keyword/Key Phrase K1 Aristocrat',
            guidance: 'Medium Quote [75-90 non-blank characters, 20<χ²<25]',
            len: [75, 90], chi2: [20, 25], unique: [19, Infinity],
            testtype: allButARegional, operation: 'keyword', encodeType: 'k1', difficulty: 'medium',
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
        },
        {
            title: 'Keyword/Key Phrase K2 Aristocrat',
            guidance: 'Easy Quote [75-90 non-blank characters, χ²<20]',
            len: [75, 90], chi2: [-Infinity, 20], unique: [19, Infinity],
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'keyword', encodeType: 'k2', difficulty: 'easy',
        },
        {
            title: 'Keyword/Key Phrase K3 Aristocrat',
            guidance: 'Easy Quote [75-90 non-blank characters, χ²<20]',
            len: [75, 90], chi2: [-Infinity, 20], unique: [19, Infinity],
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'keyword', encodeType: 'k3', difficulty: 'easy',
        },
        {
            title: 'Easy K1 Patristocrat',
            guidance: 'Easy Quote [95-110 non-blank characters, χ²<20]',
            len: [95, 110], chi2: [-Infinity, 20], unique: [19, Infinity],
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'easy',
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
        },
        {
            title: 'Easy K2 Patristocrat',
            guidance: 'Easy Quote [95-110 non-blank characters, χ²<20]',
            len: [95, 110], chi2: [-Infinity, 20], unique: [19, Infinity],
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'easy',
        },
        {
            title: 'Medium K1 Patristocrat',
            guidance: 'Medium Quote [95-110 non-blank characters, 20<χ²<25]',
            len: [95, 110], chi2: [20, 30], unique: [19, Infinity],
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'medium',
        },
        {
            title: 'Medium K2 Patristocrat',
            guidance: 'Medium Quote [95-110 non-blank characters, 20<χ²<25]',
            len: [95, 110], chi2: [20, 30], unique: [19, Infinity],
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'medium',
        },
        // ----------------------------------------------------------------------------------------------
        //    GROUP 2 - Xenocrypts
        // ----------------------------------------------------------------------------------------------
        {
            title: 'Medium K1 Spanish Xenocrypt',
            guidance: 'Medium Spanish Quote [75-90 non-blank characters, 20<χ²<25]',
            len: [75, 90], chi2: [20, 25], unique: [19, Infinity],
            group: 2, weight: 0.5, cipherType: ICipherType.Aristocrat, lang: 'es',
            encodeType: 'k1', difficulty: 'medium',
        },
        {
            title: 'Medium K2 Spanish Xenocrypt',
            guidance: 'Medium Spanish Quote [75-90 non-blank characters, 20<χ²<25]',
            len: [75, 90], chi2: [20, 25], unique: [19, Infinity],
            group: 2, weight: 0.5, cipherType: ICipherType.Aristocrat, lang: 'es',
            encodeType: 'k2', difficulty: 'medium',
        },
        // ----------------------------------------------------------------------------------------------
        //    GROUP 3 - Other Cipher types
        // ----------------------------------------------------------------------------------------------
        {
            title: "Affine Decode",
            guidance: '[25-30 non-blank characters, 13 or more unique letters]',
            len: [25, 30], unique: [13, Infinity],
            group: 3, weight: 0.5, cipherType: ICipherType.Affine,
            operation: 'decode'
        },
        {
            title: "Affine Cryptanalysis",
            guidance: '[25-30 non-blank characters, 13 or more unique letters]',
            len: [25, 30], unique: [13, Infinity],
            group: 3, weight: 0.5, cipherType: ICipherType.Affine,
            operation: 'crypt'
        },
        {
            title: "Easy Caesar",
            guidance: '[20-45 Characters.  Shift value +/- 3]',
            len: [20, 45],
            group: 3, weight: 0.5, cipherType: ICipherType.Caesar,
            shift: [-3, 3], testtype: [ITestType.aregional], operation: 'decode'
        },
        {
            title: "Caesar",
            guidance: '[80-90 Characters. No single letter words]',
            len: [80, 90],
            group: 3, weight: 0.5, cipherType: ICipherType.Caesar,
            testtype: allButARegional, operation: 'decode'
        },
        {
            title: "Dancing Men",
            guidance: '[20-30 Characters]',
            len: [20, 30],
            group: 3, weight: 0.5, cipherType: ICipherType.DancingMen,
        },
        {
            title: 'Atbash',
            guidance: '[45-80 Characters]',
            len: [45, 80],
            group: 3, weight: 0.5, cipherType: ICipherType.Atbash,
            operation: 'decode'
        },
        {
            title: "Complete Columnar",
            guidance: '[45-90 Characters]',
            len: [45, 90],
            group: 3, weight: 0.5, cipherType: ICipherType.CompleteColumnar,
        },
        {
            title: "Complete Columnar",
            guidance: '[45-90 Characters]',
            len: [45, 90],
            group: 3, weight: 0.5, cipherType: ICipherType.CompleteColumnar,
        },
        {
            title: "Cryptarithm",
            guidance: '[Addition formula with a carry to make 1 or 2 digits obvious]',
            default: 'EFFORT+PROJECT=ATTEMPT',
            msg: "Use the Cryptarithm generator for formulas",
            group: 3, weight: 0.5, cipherType: ICipherType.Cryptarithm,
        },
        {
            title: "Cryptarithm",
            guidance: '[Addition formula with a carry to make 1 or 2 digits obvious]',
            default: 'EFFORT+PROJECT=ATTEMPT',
            msg: "Use the Cryptarithm generator for formulas",
            group: 3, weight: 0.5, cipherType: ICipherType.Cryptarithm,
        },
        {
            title: "Hill 2x2",
            guidance: '[19-23 (Odd) characters]',
            len: [19, 23],
            group: 3, weight: 0.5, operation: 'decode', cipherType: ICipherType.Hill,
            keyword: "TEST"
        },
        {
            title: "Hill 3x3",
            guidance: '[20-28 (not multiple of 3) characters]',
            len: [20, 28],
            group: 3, weight: 0.5, operation: 'decode', cipherType: ICipherType.Hill,
            keyword: "TEMPORARY"
        },
        {
            title: "Porta Decode",
            guidance: '[55-62 characters]',
            len: [55, 62],
            group: 3, weight: 0.5, cipherType: ICipherType.Porta,
            operation: 'decode'
        },
        {
            title: "Porta Cryptanalysis",
            guidance: '[55-62 characters]',
            len: [55, 62],
            group: 3, weight: 0.5, cipherType: ICipherType.Porta,
            operation: 'crypt'
        },
        {
            title: "Nihilist Decode",
            guidance: '[55-75 characters]',
            len: [55, 75],
            group: 3, weight: 0.5, cipherType: ICipherType.NihilistSubstitution,
            operation: 'decode'
        },
        {
            title: "Nihilist Decode",
            guidance: '[55-75 characters]',
            len: [55, 75],
            group: 3, weight: 0.5, cipherType: ICipherType.NihilistSubstitution,
            operation: 'decode'
        },
        {
            title: "Nihilist Cryptanalysis",
            guidance: '[55-75 characters]',
            len: [55, 75],
            group: 3, weight: 0.5, cipherType: ICipherType.NihilistSubstitution,
            operation: 'crypt'
        },
        {
            title: "Vigenère Decode",
            guidance: '[50-60 characters]',
            len: [50, 60],
            group: 3, weight: 0.5, cipherType: ICipherType.Vigenere,
            operation: 'decode'
        },
        {
            title: "Vigenère Cryptanalysis",
            guidance: '[50-60 characters]',
            len: [50, 60],
            group: 3, weight: 0.5, cipherType: ICipherType.Vigenere,
            operation: 'crypt'
        },
        {
            title: 'Running Key',
            guidance: '[50-60 characters]',
            len: [50, 60],
            group: 3, weight: 0.5, cipherType: ICipherType.RunningKey,
        },
        {
            title: "Baconian Letter for Letter",
            guidance: '[35-50 characters]',
            len: [35, 50],
            group: 3, weight: 0.5, cipherType: ICipherType.Baconian,
            operation: 'let4let'
        },
        {
            title: "Baconian Sequence",
            guidance: '[35-50 characters]',
            len: [35, 50],
            group: 3, weight: 0.5, cipherType: ICipherType.Baconian,
            operation: 'sequence',
        },
        {
            title: "Baconian Words",
            guidance: '[30-40 characters]',
            len: [30, 40],
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
            len: [40, 50],
            group: 3, weight: 0.5, cipherType: ICipherType.PigPen,
        },
        {
            title: "Knights Templar",
            guidance: '[40-50 characters]',
            len: [40, 50],
            group: 3, weight: 0.5, cipherType: ICipherType.KnightsTemplar,
        },
        {
            title: 'TapCode',
            guidance: '[18-30 characters]',
            len: [18, 30],
            group: 3, weight: 0.5, cipherType: ICipherType.TapCode,
        },
        {
            title: "Morbit Decode",
            guidance: '[35-42 characters]',
            len: [35, 42],
            group: 3, weight: 0.5, cipherType: ICipherType.Morbit,
            operation: 'decode',
        },
        {
            title: "Morbit Cryptanalysis",
            guidance: '[35-42 characters]',
            len: [35, 42],
            group: 3, weight: 0.5, cipherType: ICipherType.Morbit,
            operation: 'crypt',
        },
        {
            group: 3, weight: 0.5, cipherType: ICipherType.Pollux,
            title: "Pollux Decode",
            len: [35, 42],
            guidance: '[35-42 characters]',
            operation: 'decode'
        },
        {
            group: 3, weight: 0.5, cipherType: ICipherType.Pollux,
            title: "Pollux Cryptanalysis",
            len: [35, 42],
            guidance: '[35-42 characters]',
            operation: 'crypt'
        },
        {
            title: "Fractionated Morse",
            len: [38, 52],
            guidance: '[38-52 characters]',
            group: 3, weight: 0.5, cipherType: ICipherType.FractionatedMorse,
        },
        {
            title: "Railfence Variable Rails",
            guidance: '[55-62 characters]',
            len: [55, 62],
            group: 3, weight: 0.5, cipherType: ICipherType.Railfence,
        },
        {
            title: "Railfence Fixed Rails",
            guidance: '[55-62 characters]',
            len: [55, 62],
            group: 3, weight: 0.5, cipherType: ICipherType.Railfence,
        },
        {
            title: "Railfence Variable Rails and Offset",
            guidance: '[55-62 characters]',
            len: [55, 62],
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
            questionCount: 20,
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
            questionCount: 20,
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
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        const testdiv = $('<div/>', { class: 'callout primary' });
        testdiv.append(this.makeStepCallout('Step 1',
            htmlToElement(
                `<p>Pick a title, test type and confirm the number of questions, then click the Generate Template button to generate the list of questions</p>`
            )))

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
            .append(this.makeStepCallout('Step 2', htmlToElement(
                `<p>Please review the generated choices and scroll to the bottom for the next step</p>`)))

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
            .append(this.makeStepCallout("Step 3", htmlToElement(
                `<div><p>Optionally Click on the Populate Plain Text to fill with samples.
                 Note that you need to have imported quotes using the <a href="QuoteManager.html" target="qm">Quote Manager</a>.</p>
                 <p><b>NOTE:</b> If there are no imported quotes that meet the requirements, it won't update the Plain Text for the question.</p>
                 <p>The system will attempt to find three quotes to potentially use for each question.  Scroll up and select the USE button for the quote
                 you want to use for each of questions before moving on to the next step.</p></div>
                 `)))
            .append($('<div/>', {
                class: 'grid-x grid-margin-x',
            }).append($("<a>", { id: "populate", class: "button rounded cell shrink" }).text('Populate Plain Text'))
                .append(JTFLabeledInput('Filter Keywords', 'text', 'keywords', "", 'cell auto'))
                // .append(JTFLabeledInput('Optional Supervisor Coupon', 'text', 'coupon', "", 'cell auto'))
            )
            .append(this.makeStepCallout("Step 4", htmlToElement(`<div><p>Click on <b>Save Test</b> to create the test and edit it.
                If you want to create multiple tests of the same type, then click on <b>Save a Copy</b> 
                to generate a test but stay on this page to generate another test of the same type</p><div id="saveres"></div></div>`)))
            .append($('<div/>', {
                class: 'grid-x grid-margin-x',
            }).append($("<a>", { id: "save", class: "button rounded cell shrink" }).text('Save Test'))
                .append($("<a>", { id: "savecopy", class: "button rounded cell shrink" }).text('Save a Copy'))
            )
        this.attachHandlers();
    }
    /**
     * 
     * @param qnum Which question we are working on
     * @param usedmap 
     * @returns 
     */
    public populateQuestion(qnum: number, usedmap: UsedIdMap, doSingleOnly = false) {
        let idNum = String(qnum);

        const qtElem = $('#qt' + idNum)
        if (qtElem.length < 1) {
            this.updateOutput()
            return;
        }
        const qTitle = qtElem.val() as string;
        const entry = this.getChoiceEntry(qTitle)
        const ctcDiv = $('#ctc' + idNum)
        if (entry === undefined) {
            // Somehow we didn't find it.. so we just have to skip it
            ctcDiv.append(`Unable to find type '${qTitle}'`)
        } else {
            let lang = "english"
            if (entry.lang === 'es') {
                lang = "spanish"
            }

            if (entry.msg !== undefined) {
                ctcDiv.append($("<b>").text(entry.msg))
                if (doSingleOnly) {
                    this.updateOutput()
                } else {
                    setTimeout(() => { return this.populateQuestion(qnum + 1, usedmap) }, 1)
                }
                return;
            }
            let parms: QueryParms = {}
            if (entry.chi2 !== undefined) {
                parms.chi2 = entry.chi2
            }
            if (entry.unique !== undefined) {
                parms.unique = entry.unique;
            }
            if (entry.len !== undefined) {
                parms.len = entry.len
            }
            if (entry.homonyms !== undefined) {
                parms.homonyms = entry.homonyms
            }
            const keywords = $("#keywords").val() as String
            if (keywords !== undefined && keywords.trim() !== "") {
                parms.keywords = keywords.toLowerCase().split(/\s+/)
            }
            if (this.state.testtype === ITestType.aregional ||
                this.state.testtype === ITestType.astate) {
                parms.grade = [-Infinity, 5]
            } else if (this.state.testtype === ITestType.bregional ||
                this.state.testtype === ITestType.bstate) {
                parms.grade = [-Infinity, 8]

            } else if (this.state.testtype === ITestType.cregional ||
                this.state.testtype === ITestType.cstate) {
                parms.grade = [-Infinity, 12]
            }
            this.getRandomEntriesWithRanges(lang, parms, usedmap, 3).then((res) => {
                $("#cm" + idNum).show()
                if (res.length === 0) {
                    ctcDiv.empty().append($("<b>").text("Unable to find any quotes which meet the criteria"))
                } else {
                    const div = $("<div/>")
                    for (let ent of res) {
                        usedmap[ent.id] = true;
                        let useButton = $("<button/>", {
                            'data-val': idNum,
                            'data-id': ent.id,
                            'data-text': ent.quote,
                            'data-aut': ent.author,
                            type: "button",
                            class: "rounded button use",
                        }).html("Use");
                        let banButton = $("<button/>", {
                            'data-id': ent.id,
                            'data-lang': lang,
                            type: "button",
                            class: "rounded alert button ban",
                        }).html("🛇");  // 🚫
                        const useDiv = $("<div/>", { class: "usetxt" })
                            .append(useButton)
                            .append(banButton)
                            .append($("<span>").text(ent.quote))
                        if (ent.translation !== undefined) {
                            useDiv.append($("<span>").append($("<i/>").text(ent.translation)))
                            useButton.attr('data-trans', ent.translation);
                        }
                        div.append(useDiv)
                    }
                    ctcDiv.empty().append(div)
                }
                // We finished one, so go onto the next one
                if (doSingleOnly) {
                    this.updateOutput()
                } else {
                    setTimeout(() => { return this.populateQuestion(qnum + 1, usedmap) }, 1)
                }
            })
        }
    }
    /**
     * 
     */
    public populateTemplate() {
        let idNum = 0
        if ($('#qt0').length < 1) {
            idNum = 1;
        }
        this.populateQuestion(idNum, {});
    }
    /**
     * Reload the qotes for a single element
     * @param elem Element to reload quotes for
     */
    public reloadQuotes(elem: HTMLElement) {
        const idNum = elem.id.substring(2)
        const usedIds: UsedIdMap = {}
        $('[data-id]').each((_idx, elem) => { usedIds[elem.getAttribute('data-id')] = true })
        this.populateQuestion(Number(idNum), usedIds, true);
    }
    /**
     * 
     * @param qTitle 
     * @returns 
     */
    public getChoiceEntry(qTitle: string): QuestionType {
        const choice = this.questionChoices.findIndex((elem) => elem.title === qTitle)
        if (choice === -1) {
            return undefined
        }
        return this.questionChoices[choice];
    }

    public async saveTest(editAfter: boolean) {
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

        let qCount = $('.qt').length
        const englishUpdates: QuoteUpdates = {}
        const spanishUpdates: QuoteUpdates = {}

        for (let qnum = 0; qnum < qCount; qnum++) {
            let idNum = String(qnum);
            const qTitle = $('#qt' + idNum).val() as string;
            const ptElem = $('#ct' + idNum)
            let plaintext = ptElem.val() as string;
            const author = $('#au' + idNum).val() as string;
            const isSpecial = $('#sb' + idNum).is(':checked')
            const dataId = ptElem.attr('data-id')
            const translation = ptElem.attr('data-trans')

            // Division A won't have a timed question, so we can just skip it
            if (qnum === 0 && (qTitle === "" || qTitle === undefined)) {
                // However it does mean that there is one more question to copy over
                qCount++;
                continue;
            }
            const entry = this.getChoiceEntry(qTitle)
            if (entry === undefined) {
                // Somehow we didn't find the cipher they selected.. so we just have to skip it
                continue;
            }
            let question = entry.title

            // Let's create a cipher
            let lang = entry.lang;
            if (lang === undefined || lang === '') {
                lang = 'en';
            }
            if (dataId !== undefined && dataId !== "") {
                if (lang === 'es') {
                    spanishUpdates[dataId] = { id: dataId, testUsage: this.title }
                } else {
                    englishUpdates[dataId] = { id: dataId, testUsage: this.title }
                }
            }
            if (entry.msg !== undefined) {
                if (plaintext === this.quoteGuidance(entry.guidance) && entry.default !== undefined) {
                    plaintext = entry.default
                    question += " " + entry.guidance
                }
            }

            const state: IEncoderState = {
                cipherType: entry.cipherType,
                points: 0,
                question: question,
                cipherString: plaintext,
                author: author,
                curlang: lang,
                specialbonus: isSpecial,
                placeholder: true,
            };

            if (translation !== null && translation !== undefined && translation !== "") {
                (state as IAristocratState).translation = translation
            }
            if (entry.encodeType !== undefined) {
                state.encodeType = entry.encodeType
            }
            if (entry.operation !== undefined) {
                state.operation = entry.operation;
            }
            if (entry.keyword !== undefined) {
                state.keyword = entry.keyword;
            }
            if (entry.usehint !== undefined) {
                state.usehint = entry.usehint;
            }

            if (author !== "") {
                state.question += ` Quote Author: ${author}`
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
        // We need to mark them in the database as used.
        await this.updateDBRecords("english", englishUpdates)
        await this.updateDBRecords("spanish", spanishUpdates)
        if (editAfter) {
            this.gotoEditTest(test);
        } else {
            $("#saveres").empty().append(makeCallout($(htmlToElement(`<p>Test "${this.title}" saved.  Remember to change the Test Title in Step 1 before saving again.</p>`) as HTMLElement), 'success'))
        }
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
        const checkBox = $('<input/>', { type: "checkbox", id: "sb" + idNum })
        if (isSpecial) {
            checkBox.attr('checked', 'checked')
        } else if (!this.isGoodSpecialCipherType(entry.cipherType)) {
            checkBox.attr('hidden', 'hidden')
        }
        row.add({ settings: { class: 'sb' }, content: checkBox })
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
        const more = $("<button/>", { class: "qmore button rounded", id: 'cm' + idNum }).text('⟳').hide()
        row.add({ settings: { class: 'typ' }, content: $('<div/>').append(select).append(more) })
        let cipherText = $('<div/>').append($('<input/>', { type: "text", id: 'ct' + idNum, value: this.quoteGuidance(entry.guidance) })).append($('<div/>', { id: 'ctc' + idNum }))
        row.add({ settings: { class: 'txt' }, content: cipherText })
        let authorText = $('<input/>', { type: "text", id: 'au' + idNum })



        row.add({ settings: { class: 'aut' }, content: authorText })
    }
    private quoteGuidance(guidance: string): string {
        return `«${guidance}»`;
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
    /**
     * Use a quote
     * @param elem dom element of quote to use
     */
    public useQuote(elem: HTMLElement) {
        const jqelem = $(elem)
        const idNum = jqelem.attr('data-val')
        const dataId = jqelem.attr('data-id')
        const text = jqelem.attr('data-text')
        const author = jqelem.attr('data-aut')
        const translation = jqelem.attr('data-trans')

        const target = $('#ct' + String(idNum))

        target.val(text)
        target.attr('data-id', dataId)
        if (translation !== undefined && translation !== null && translation !== "") {
            target.attr('data-trans', translation)
        }

        $('#au' + String(idNum)).val(author)
    }
    /**
     * Banish a quote so that it doesn't get selected again. We do this by
     * marking it as a test of "BANNED" so that we can track them.
     * @param elem dom element of quote to ban
     */
    public async banQuote(elem: HTMLElement) {
        const jqelem = $(elem)
        const lang = jqelem.attr('data-lang')
        const dataId = jqelem.attr('data-id')
        const Updates: QuoteUpdates = {}

        Updates[dataId] = { id: dataId, testUsage: "BANNED" }
        // We need to mark them in the database as banned.
        await this.updateDBRecords(lang, Updates)
        $(elem).parent().hide()
    }
    /**
     * Update the Plain Text guidance and the Special Bonus question when changing a Cipher Type
     * @param elem Selected question element
     * @returns 
     */
    public updateQuestionChoice(elem: HTMLElement) {
        const idNum = elem.id.substring(2)
        const qTitle = $('#qt' + idNum).val() as string;
        const sbBox = $('#sb' + idNum)

        const entry = this.getChoiceEntry(qTitle)

        if (entry === undefined) {
            // Somehow we didn't find the cipher they selected.. so we just have to skip it
            return
        }
        if (this.isGoodSpecialCipherType(entry.cipherType)) {
            sbBox.removeAttr('hidden').show();
        } else {
            sbBox.prop('checked', false)
            sbBox.attr('hidden', 'hidden').hide()
        }
        const ctcDiv = $('#ctc' + idNum)
        ctcDiv.empty()
        if (entry.msg !== undefined && entry.msg !== "") {
            $("#cm" + idNum).hide()
            ctcDiv.append($("<b>").text(entry.msg))
        } else {
            $("#cm" + idNum).show()
        }
        $('#ct' + idNum).val(this.quoteGuidance(entry.guidance))
    }
    /**
     * 
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.qt').off('change').on('change', (e) => {
            this.updateQuestionChoice(e.target);
        })
        $("#genlist").off('click').on('click', (e) => {
            this.genTestTemplate()
        })
        $("#populate").off('click').on('click', (e) => {
            this.populateTemplate()
        })
        $("#save").off('click').on('click', (e) => {
            this.saveTest(true)
        })
        $("#savecopy").off('click').on('click', (e) => {
            this.saveTest(false)
        })
        $('.use').off('click').on('click', (e) => {
            this.useQuote(e.target);
        })
        $('.ban').off('click').on('click', (e) => {
            this.banQuote(e.target);
        })
        $('.qmore').off('click').on('click', (e) => {
            this.reloadQuotes(e.target);
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
