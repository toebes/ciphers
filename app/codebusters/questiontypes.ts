import { IEncodeType, IOperationType, ITestType } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";

export type DifficultyType = 'easy' | 'medium' | 'hard'
export const allButARegional = [ITestType.None, ITestType.bregional, ITestType.bstate, ITestType.cregional, ITestType.cstate]

export interface QuestionType {
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
    misspelled?: boolean;
}

export class QuestionTypes {
    static readonly QuestionTypesEntries: QuestionType[] = [
        // ----------------------------------------------------------------------------------------------
        //    GROUP 1 - Aristocrats
        // ----------------------------------------------------------------------------------------------
        {
            title: 'Easy Aristocrat with a Hint',
            guidance: 'Easy Quote [83-100 non-blank characters, χ²<20] with Hint',
            len: [83, 100], chi2: [-Infinity, 20], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            operation: 'decode', encodeType: 'random', difficulty: 'easy',
        },
        {
            title: 'Easy Aristocrat without a Hint',
            guidance: 'Easy Quote [83-100 non-blank characters, χ²<20]',
            len: [83, 100], chi2: [-Infinity, 20], unique: [19, Infinity],
            group: 1, weight: 0.75, timed: true, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'random', difficulty: 'easy',
        },
        {
            title: 'Medium Aristocrat with a Hint',
            guidance: 'Medium Quote [83-100 non-blank characters, 20<χ²<25] with Hint',
            len: [83, 100], chi2: [20, 25], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            operation: 'decode', encodeType: 'random', difficulty: 'medium',
        },
        {
            title: 'Medium Aristocrat without a Hint',
            guidance: 'Medium Quote [83-100 non-blank characters, 20<χ²<25]',
            len: [83, 100], chi2: [20, 25], unique: [19, Infinity],
            group: 1, weight: 0.75, timed: true, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'random', difficulty: 'medium',
        },
        {
            title: 'Hard K1 Aristocrat with a Hint',
            guidance: 'Hard Quote [83-100 non-blank characters, χ²>25] with Hint',
            len: [83, 100], chi2: [25, Infinity], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'hard',
        },
        {
            title: 'Hard K1 Aristocrat without a Hint',
            guidance: 'Hard Quote [83-100 non-blank characters, χ²>25]',
            len: [83, 100], chi2: [25, Infinity], unique: [19, Infinity],
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'hard',
        },
        {
            title: 'Hard K2 Aristocrat with a Hint',
            guidance: 'Hard Quote [83-100 non-blank characters, χ²>25] with Hint',
            len: [83, 100], chi2: [25, Infinity], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'hard',
        },
        {
            title: 'Hard K2 Aristocrat without a Hint',
            guidance: 'Hard Quote [83-100 non-blank characters, χ²>25]',
            len: [83, 100], chi2: [25, Infinity], unique: [19, Infinity],
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'hard',
        },
        {
            title: 'Misspelled K1 Aristocrat with a Hint',
            guidance: 'Misspelled Quote [83-100 non-blank characters, χ²<25] with Hint',
            len: [83, 100], chi2: [-Infinity, 25], unique: [19, Infinity], homonyms: [6, Infinity], usehint: true,
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat, misspelled: true,
            testtype: [ITestType.None], operation: 'decode', encodeType: 'k1',
        },
        {
            title: 'Misspelled K1 Aristocrat without a Hint',
            guidance: 'Misspelled Quote [83-100 non-blank characters, χ²<25]',
            len: [83, 100], chi2: [-Infinity, 25], unique: [19, Infinity], homonyms: [6, Infinity],
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat, misspelled: true,
            testtype: [ITestType.None], operation: 'decode', encodeType: 'k1',
        },
        {
            title: 'Misspelled K2 Aristocrat with a Hint',
            guidance: 'Misspelled Quote [83-100 non-blank characters, χ²<25] with Hint',
            len: [83, 100], chi2: [-Infinity, 25], unique: [19, Infinity], homonyms: [6, Infinity], usehint: true,
            testtype: [ITestType.None], operation: 'decode', encodeType: 'k2',
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat, misspelled: true,
        },
        {
            title: 'Misspelled K2 Aristocrat without a Hint',
            guidance: 'Misspelled Quote [83-100 non-blank characters, χ²<25]',
            len: [83, 100], chi2: [-Infinity, 25], unique: [19, Infinity], homonyms: [6, Infinity],
            group: 1, weight: 0.5, cipherType: ICipherType.Aristocrat, misspelled: true,
            testtype: [ITestType.None], operation: 'decode', encodeType: 'k2',
        },
        {
            title: 'Keyword/Key Phrase K1 Aristocrat',
            guidance: 'Medium Quote [83-100 non-blank characters, 20<χ²<25]',
            len: [83, 100], chi2: [20, 25], unique: [19, Infinity],
            testtype: allButARegional, operation: 'keyword', encodeType: 'k1', difficulty: 'medium',
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
        },
        {
            title: 'Keyword/Key Phrase K2 Aristocrat',
            guidance: 'Easy Quote [83-100 non-blank characters, χ²<20]',
            len: [83, 100], chi2: [-Infinity, 20], unique: [19, Infinity],
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'keyword', encodeType: 'k2', difficulty: 'easy',
        },
        {
            title: 'Keyword/Key Phrase K3 Aristocrat',
            guidance: 'Easy Quote [83-100 non-blank characters, χ²<20]',
            len: [83, 100], chi2: [-Infinity, 20], unique: [19, Infinity],
            group: 1, weight: 0.75, cipherType: ICipherType.Aristocrat,
            testtype: allButARegional, operation: 'keyword', encodeType: 'k3', difficulty: 'easy',
        },
        {
            title: 'Easy K1 Patristocrat',
            guidance: 'Easy Quote [95-110 non-blank characters, χ²<20] with Hint',
            len: [95, 110], chi2: [-Infinity, 20], unique: [19, Infinity], usehint: true,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'easy',
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
        },
        {
            title: 'Easy K2 Patristocrat',
            guidance: 'Easy Quote [95-110 non-blank characters, χ²<20] with Hint',
            len: [95, 110], chi2: [-Infinity, 20], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'easy',
        },
        {
            title: 'Medium K1 Patristocrat',
            guidance: 'Medium Quote [95-110 non-blank characters, 20<χ²<25] with Hint',
            len: [95, 110], chi2: [20, 30], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k1', difficulty: 'medium',
        },
        {
            title: 'Medium K2 Patristocrat',
            guidance: 'Medium Quote [95-110 non-blank characters, 20<χ²<25] with Hint',
            len: [95, 110], chi2: [20, 30], unique: [19, Infinity], usehint: true,
            group: 1, weight: 0.25, cipherType: ICipherType.Patristocrat,
            testtype: allButARegional, operation: 'decode', encodeType: 'k2', difficulty: 'medium',
        },
        // ----------------------------------------------------------------------------------------------
        //    GROUP 2 - Xenocrypts
        // ----------------------------------------------------------------------------------------------
        {
            title: 'Medium K1 Spanish Xenocrypt',
            guidance: 'Medium Spanish Quote [83-100 non-blank characters, 20<χ²<25]',
            len: [83, 100], chi2: [20, 25], unique: [19, Infinity],
            group: 2, weight: 0.5, cipherType: ICipherType.Aristocrat, lang: 'es',
            encodeType: 'k1', difficulty: 'medium',
        },
        {
            title: 'Medium K2 Spanish Xenocrypt',
            guidance: 'Medium Spanish Quote [83-100 non-blank characters, 20<χ²<25]',
            len: [83, 100], chi2: [20, 25], unique: [19, Infinity],
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
            title: "Standard Galactic Alphabet",
            guidance: '[20-30 Characters]',
            len: [20, 30],
            group: 3, weight: 0.5, cipherType: ICipherType.StandardGalacticAlphabet,
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
            title: "Homophonic Decode",
            guidance: '[55-62 characters]',
            len: [55, 62],
            group: 3, weight: 0.5, cipherType: ICipherType.Homophonic,
            operation: 'decode'
        },
        {
            title: "Homophonic Cryptanalysis",
            guidance: '[55-62 characters]',
            len: [55, 62],
            group: 3, weight: 0.5, cipherType: ICipherType.Homophonic,
            operation: 'crypt'
        },
        {
            title: "Checkerboard Decode",
            guidance: '[55-75 characters]',
            len: [55, 75], chi2: [20, Infinity],
            group: 3, weight: 0.65, cipherType: ICipherType.Checkerboard,
            operation: 'decode'
        },
        {
            title: "Checkerboard Decode",
            guidance: '[55-75 characters]',
            len: [55, 75], chi2: [20, Infinity],
            group: 3, weight: 0.5, cipherType: ICipherType.Checkerboard,
            operation: 'decode'
        },
        {
            title: "Checkerboard Cryptanalysis",
            guidance: '[55-75 characters]',
            len: [55, 75], chi2: [20, Infinity],
            group: 3, weight: 0.65, cipherType: ICipherType.Checkerboard,
            operation: 'crypt'
        },
        {
            title: "Nihilist Decode",
            guidance: '[40-55 characters]',
            len: [40, 55],
            group: 3, weight: 0.5, cipherType: ICipherType.NihilistSubstitution,
            operation: 'decode'
        },
        {
            title: "Nihilist Decode",
            guidance: '[40-55 characters]',
            len: [40, 55],
            group: 3, weight: 0.5, cipherType: ICipherType.NihilistSubstitution,
            operation: 'decode'
        },
        {
            title: "Nihilist Cryptanalysis",
            guidance: '[45-60 characters]',
            len: [45, 60],
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

    /**
     * 
     * @param qTitle 
     * @returns 
     */
    public static GetQuestionTypeEntry(cipherType: ICipherType): QuestionType {
        const choice = this.QuestionTypesEntries.findIndex((elem) => elem.cipherType === cipherType)
        if (choice === -1) {
            return undefined
        }
        return this.QuestionTypesEntries[choice];
    }
}