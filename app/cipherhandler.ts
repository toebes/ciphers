import * as InlineEditor from '@ckeditor/ckeditor5-build-inline';
// import { Font } from "@ckeditor/ckeditor5-font/src/font"
import { BoolMap, cloneObject, StringMap } from "./ciphercommon"
import { CipherMenu } from "./ciphermenu"
import { ICipherType } from "./ciphertypes"
import { JTButtonGroup, JTButtonItem } from "./jtbuttongroup";
import { JTCreateMenu, JTGetURL } from "./jtmenu"
import { JTTable } from "./jttable";
import { parseQueryString } from "./parsequerystring"

// From https://github.com/ckeditor/ckeditor5/issues/139#issuecomment-276876222
// import Typing from '@ckeditor/ckeditor5-typing/src/typing';
// import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
// import Undo from '@ckeditor/ckeditor5-undo/src/undo';
// import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
// import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
// import Image from '@ckeditor/ckeditor5-image/src/image';

// ClassicEditor.create(document.getElementById("editor"), {
//     plugins: [ Enter, Typing, Paragraph, Undo, Bold, Italic, Image ],
//     toolbar: [ 'bold', 'italic', 'undo', 'redo' ]
// });
export type IOperationType = "encode" | "decode" | "compute"

export interface IState {

    /** The current cipher typewe are working on */
    cipherType: ICipherType,
    /** The current cipher we are working on */
    cipherString: string,
    /** The current string we are looking for */
    findString?: string,
    /** Currently selected keyword */
    keyword?: string,
    /** Replacement characters */
    replacements?: StringMap
    /** Any additional save state data */
    undotype?: string,
    /** The type of operation */
    operation?: IOperationType
    /** Number of points a question is worth */
    points?: number
    /** Any quotation text to associate with the cipher */
    question?: string,
    /** Current language */
    curlang?: string,
    any?: any
    /** Indicates that a character is locked     */
    locked?: { [key: string]: boolean }
}
interface ITest {
    /** Title of the test */
    title: string
    /** Which Cipher-Data.n element corresponds to the timed question.
     * If the value is blank, there is no timed question.
     */
    timed: number
    /** The number of questions on the test */
    count: number
    /** Array of which corresponding test elements to use. */
    questions: number[]
}

type patelem = [string, number, number, number]
type JQElement = JQuery<HTMLElement>
/**
 * Base class for all the Cipher Encoders/Decoders
 */
export class CipherHandler {
    /**
     * User visible mapping of names of the various languages supported
     * @type {StringMap} Mapping of language to visible name
     */
    readonly langmap: StringMap = {
        'en': 'English',
        'nl': 'Dutch',
        'de': 'German',
        'eo': 'Esperanto',
        'es': 'Spanish',
        'fr': 'French',
        'it': 'Italian',
        'no': 'Norwegian',
        'pt': 'Portuguese',
        'sv': 'Swedish',
        'ia': 'Interlingua',
        'la': 'Latin',
    }
    /**
     * This maps which characters are legal in a cipher for a given language
     * @type {StringMap} Mapping of legal characters
     */
    readonly langcharset: StringMap = {
        'en': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'nl': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'de': 'AÄBCDEFGHIJKLMNOÖPQRSßTUÜVWXYZ',
        'eo': 'ABCĈDEFGĜHĤIJĴKLMNOPRSŜTUŬVZ',
        'es': 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ',
        'fr': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'it': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'no': 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅØÆ',
        'pt': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'sv': 'AÅÄBCDEFGHIJKLMNOÖPQRSTUVWXYZ',
        'ia': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'la': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    }
    /**
     * Character replacement for purposes of encoding
     */
    readonly langreplace: { [key: string]: { [key1: string]: string } } = {
        'en': {},
        'nl': {},
        'de': {},
        'eo': {},
        'es': { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ý': 'Y' },
        'fr': {
            'Ç': 'C',
            'Â': 'A', 'À': 'A',
            'É': 'E', 'Ê': 'E', 'È': 'E', 'Ë': 'E',
            'Î': 'I', 'Ï': 'I',
            'Ô': 'O',
            'Û': 'U', 'Ù': 'U', 'Ü': 'U',
        },
        'it': { 'À': 'A', 'É': 'E', 'È': 'E', 'Ì': 'I', 'Ò': 'O', 'Ù': 'U', },
        'no': {},
        'pt': {
            'Á': 'A', 'Â': 'A', 'Ã': 'A', 'À': 'A',
            'Ç': 'C',
            'È': 'E', 'Ê': 'E',
            'Í': 'I',
            'Ó': 'O', 'Ô': 'O', 'Õ': 'O',
            'Ú': 'U',
        },
        'sv': {},
        'ia': {},
        'la': {}
    }
    /**
     * This maps which characters are to be used when encoding an ACA cipher
     */
    readonly acalangcharset: StringMap = {
        'en': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'nl': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'de': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'es': 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ',
        'fr': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'it': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'no': 'ABCDEFGHIJKLMNOPRSTUVYZÆØÅ',
        'pt': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'sv': 'AÅÄBCDEFGHIJKLMNOÖPRSTUVYZ',
        'ia': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'la': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    }
    /**
     * This maps which characters are to be encoded to for an ACA cipher
     */
    readonly encodingcharset: StringMap = {
        'en': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'nl': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'de': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'es': 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ',
        'fr': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'it': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'no': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'pt': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'sv': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'ia': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'la': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    }
    /**
     * Character replacement for purposes of encoding
     */
    readonly acalangreplace: { [key: string]: { [key1: string]: string } } = {
        'en': {},
        'nl': {},
        'de': { 'Ä': 'A', 'Ö': 'O', 'ß': 'SS', 'Ü': 'U' },
        'eo': { 'Ĉ': 'C', 'Ĝ': 'G', 'Ĥ': 'H', 'Ĵ': 'J', 'Ŝ': 'S', 'Ŭ': 'U' },
        'es': { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ý': 'Y' },
        'fr': {
            'Ç': 'C',
            'Â': 'A', 'À': 'A',
            'É': 'E', 'Ê': 'E', 'È': 'E', 'Ë': 'E',
            'Î': 'I', 'Ï': 'I',
            'Ô': 'O',
            'Û': 'U', 'Ù': 'U', 'Ü': 'U',
        },
        'it': { 'É': 'E', 'È': 'E', 'Ì': 'I', 'Ò': 'O', 'Ù': 'U', },
        'no': {},
        'pt': {
            'Á': 'A', 'Â': 'A', 'Ã': 'A', 'À': 'A',
            'Ç': 'C',
            'È': 'E', 'Ê': 'E',
            'Í': 'I',
            'Ó': 'O', 'Ô': 'O', 'Õ': 'O',
            'Ú': 'U',
        },
        'sv': {},
        'ia': {},
        'la': {}
    }
    /**
     * Language character frequency
     */
    readonly langfreq: { [key: string]: { [key1: string]: number } } = {
        'en': {
            'E': 0.1249, 'T': 0.0928, 'A': 0.0804, 'O': 0.0764, 'I': 0.0757,
            'N': 0.0723, 'S': 0.0651, 'R': 0.0628, 'H': 0.0505, 'L': 0.0407,
            'D': 0.0382, 'C': 0.0334, 'U': 0.0273, 'M': 0.0251, 'F': 0.0240,
            'P': 0.0214, 'G': 0.0187, 'W': 0.0168, 'Y': 0.0166, 'B': 0.0148,
            'V': 0.0105, 'K': 0.0054, 'X': 0.0023, 'J': 0.0016, 'Q': 0.0012,
            'Z': 0.0009
        },
        'nl': {
            'E': 0.2040110, 'N': 0.1124940, 'T': 0.0668511, 'A': 0.0562471,
            'O': 0.0534809, 'I': 0.0525588, 'R': 0.0509451, 'D': 0.0447211,
            'S': 0.0421853, 'L': 0.0295067, 'G': 0.0274320, 'H': 0.0246657,
            'M': 0.0239742, 'V': 0.0214385, 'B': 0.0189027, 'W': 0.0189027,
            'K': 0.0186722, 'U': 0.0165975, 'P': 0.0156754, 'C': 0.0147533,
            'IJ': 0.0124481, 'Z': 0.0119871, 'J': 0.0080682, 'F': 0.0053020,
            'É': 0.0011526, 'X': 0.0002305
        },
        'de': {
            'E': 0.1499580, 'N': 0.1026200, 'I': 0.0826712, 'S': 0.0814877,
            'R': 0.0704987, 'A': 0.0644125, 'T': 0.0486898, 'H': 0.0468301,
            'D': 0.0466610, 'U': 0.0365173, 'G': 0.0360101, 'L': 0.0339814,
            'B': 0.0255283, 'O': 0.0255283, 'F': 0.0191040, 'V': 0.0163990,
            'K': 0.0162299, 'M': 0.0162299, 'W': 0.0155537, 'Z': 0.0081150,
            'Ü': 0.0079459, 'P': 0.0064243, 'Ä': 0.0050719, 'Ö': 0.0030431,
            'J': 0.0027050, 'ß': 0.0006762, 'Q': 0.0001691
        },
        'eo': {
            'A': 0.1228940, 'E': 0.0982128, 'O': 0.0917447, 'N': 0.0837447,
            'I': 0.0791489, 'S': 0.0568511, 'R': 0.0558298, 'T': 0.0556596,
            'L': 0.0549787, 'K': 0.0408511, 'M': 0.0309787, 'P': 0.0308085,
            'D': 0.0294468, 'U': 0.0292766, 'J': 0.0248511, 'V': 0.0228085,
            'G': 0.0153191, 'B': 0.0093617, 'C': 0.0088511, 'F': 0.0069787,
            'Ü': 0.0062979, 'Z': 0.0061277, 'H': 0.0059575, 'Ĝ': 0.0054468,
            'Ĉ': 0.0040851, 'Ŝ': 0.0011915, 'Ĵ': 0.0010213
        },
        'es': {
            'E': 0.1408, 'A': 0.1216, 'O': 0.092, 'S': 0.072, 'N': 0.0683,
            'R': 0.0641, 'I': 0.0598, 'L': 0.0524, 'U': 0.0469, 'D': 0.0467,
            'T': 0.046, 'C': 0.0387, 'M': 0.0308, 'P': 0.0289, 'B': 0.0149,
            'H': 0.0118, 'Q': 0.0111, 'Y': 0.0109, 'V': 0.0105, 'G': 0.01,
            'F': 0.0069, 'J': 0.0052, 'Z': 0.0047, 'Ñ': 0.0017, 'X': 0.0014,
            'K': 0.0011, 'W': 0.0004
        },
        'fr': {
            'E': 0.1406753, 'T': 0.0895584, 'I': 0.0820779, 'N': 0.0792727,
            'S': 0.0753247, 'A': 0.0730390, 'R': 0.0650390, 'O': 0.0643117,
            'L': 0.0571429, 'U': 0.0520519, 'D': 0.0457143, 'C': 0.0353247,
            'É': 0.0268052, 'P': 0.0253506, 'M': 0.0225455, 'V': 0.0093506,
            'G': 0.0085195, 'Q': 0.0083117, 'F': 0.0082078, 'B': 0.0078961,
            'À': 0.0065455, 'H': 0.0047792, 'X': 0.0045714, 'Ê': 0.0023896,
            'Y': 0.0020779, 'J': 0.0011429, 'È': 0.0010390, 'Ù': 0.0004156,
            'Â': 0.0002078, 'Ô': 0.0002078, 'Û': 0.0001039
        },
        'it': {
            'I': 0.1376090, 'E': 0.1043230, 'A': 0.0923483, 'O': 0.0921453,
            'T': 0.0574386, 'N': 0.0572356, 'L': 0.0566268, 'R': 0.0539882,
            'S': 0.0527704, 'C': 0.0481023, 'G': 0.0385630, 'U': 0.0355186,
            'D': 0.0330830, 'P': 0.0300386, 'M': 0.0271971, 'B': 0.0142074,
            'H': 0.0125837, 'Z': 0.0125837, 'È': 0.0103511, 'V': 0.0101482,
            'F': 0.0085245, 'Q': 0.0054800
        },
        'no': {
            'E': 0.1646300, 'N': 0.0888383, 'A': 0.0679230, 'I': 0.0668876,
            'R': 0.0646096, 'D': 0.0635742, 'T': 0.0635742, 'S': 0.0509422,
            'L': 0.0499068, 'O': 0.0399669, 'G': 0.0397598, 'V': 0.0395527,
            'K': 0.0339615, 'M': 0.0304411, 'H': 0.0298198, 'F': 0.0217436,
            'U': 0.0155312, 'P': 0.0130462, 'B': 0.0113895, 'J': 0.0097329,
            'Ø': 0.0082833, 'Å': 0.0070408, 'Y': 0.0057983, 'Æ': 0.0000000,
            'C': 0.0000000, 'Z': 0.0000000
        },
        'pt': {
            'E': 0.1484380, 'A': 0.1210940, 'O': 0.1027110, 'I': 0.0714614,
            'R': 0.0597426, 'S': 0.0574449, 'D': 0.0530790, 'M': 0.0500919,
            'T': 0.0500919, 'N': 0.0471048, 'U': 0.0381434, 'C': 0.0358456,
            'L': 0.0310202, 'V': 0.0186121, 'P': 0.0183824, 'G': 0.0126379,
            'B': 0.0091912, 'Ã': 0.0087316, 'Q': 0.0082721, 'F': 0.0080423,
            'H': 0.0080423, 'Ç': 0.0055147, 'Z': 0.0032169, 'Á': 0.0029871,
            'Ê': 0.0029871, 'NH': 0.0025276, 'É': 0.0022978, 'J': 0.0018382,
            'Ó': 0.0016085, 'X': 0.0013787, 'LH': 0.0009191, 'Â': 0.0004596,
            'Õ': 0.0002298, 'W': 0.0000000, 'Y': 0.0000000
        },
        'sv': {
            'N': 0.102144, 'A': 0.0962783, 'E': 0.0958738, 'R': 0.0671521,
            'T': 0.0647249, 'I': 0.0552184, 'S': 0.0533981, 'D': 0.0523867,
            'L': 0.0517799, 'O': 0.0410599, 'V': 0.0400485, 'H': 0.0386327,
            'M': 0.0351942, 'G': 0.0287217, 'K': 0.0287217, 'F': 0.0218447,
            'Ä': 0.0212379, 'Ö': 0.0147654, 'P': 0.0141586, 'C': 0.0141586,
            'Å': 0.013754, 'U': 0.0133495, 'B': 0.0121359, 'J': 0.00768608,
            'Y': 0.0052589, 'X': 0.000202265
        },
        'ia': {
            'E': 0.1729506, 'T': 0.0905528, 'A': 0.0898115, 'I': 0.0847278,
            'O': 0.0773141, 'N': 0.0724423, 'R': 0.0647109, 'L': 0.0644990,
            'S': 0.0635459, 'C': 0.0420462, 'D': 0.0416225, 'U': 0.0352680,
            'P': 0.0267952, 'M': 0.0210760, 'B': 0.0102732, 'H': 0.0083669,
            'V': 0.0083669, 'F': 0.0082610, 'G': 0.0075196, 'Q': 0.0073078,
            'J': 0.0009532, 'X': 0.0009532, 'Y': 0.0006355, 'K': 0.0000000,
            'W': 0.0000000, 'Z': 0.0000000
        },
        'la': {
            'I': 0.1333172, 'E': 0.1234150, 'T': 0.0906895, 'A': 0.0809081,
            'S': 0.0775269, 'U': 0.0759570, 'N': 0.0640019, 'O': 0.0584470,
            'R': 0.0528922, 'M': 0.0495109, 'C': 0.0362275, 'P': 0.0299481,
            'D': 0.0266876, 'L': 0.0251177, 'Q': 0.0163024, 'B': 0.0161816,
            'G': 0.0108683, 'V': 0.0102645, 'H': 0.0091776, 'F': 0.0089361,
            'X': 0.0036228, 'J': 0.0000000, 'K': 0.0000000, 'W': 0.0000000,
            'Y': 0.0000000, 'Z': 0.0000000
        }
    }
    defaultstate: IState = {
        /** The current cipher typewe are working on */
        cipherType: ICipherType.Vigenere,
        /** Currently selected keyword */
        keyword: "",
        /** The current cipher we are working on */
        cipherString: "",
        /** The current string we are looking for */
        findString: "",
        /** Replacement characters */
        replacements: {},
        /** Current language */
        curlang: ""
    }
    state: IState = cloneObject(this.defaultstate) as IState
    undocmdButton: JTButtonItem = { title: "Undo", id: "undo", color: "primary", class: "undo", disabled: true }
    redocmdButton: JTButtonItem = { title: "Redo", id: "redo", color: "primary", class: "redo", disabled: true }

    cmdButtons: JTButtonItem[] = [
        { title: "Load", color: "primary", id: "load", },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset", },
    ]
    testStrings: string[] = [
    ]
    /** The direction of the last advance */
    advancedir: number = 0
    cipherWidth: number = 1
    charset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    sourcecharset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    unasigned: string = ""
    replacement: StringMap = {}
    holdupdates: boolean = false
    /** Stack of current Undo/Redo operations */
    undoStack: IState[] = []
    /** Where we are in the undo stack */
    undoPosition: number = 0
    /** Indicates that we need to queue an undo item before executing an Undo */
    undoNeeded: string = undefined
    /**
     * This is a cache of all active editors on the page.
     * It is indexed by the id of the HTML element
     */
    editor: { [key: string]: InlineEditor } = {}
    /**
     * The maximum number of characters to
     * be shown on an encoded line so that it can be readily pasted into a test
     * This is a global config that no ciphers actually set
     */
    maxEncodeWidth: number = 53
    /**
     * Output the reverse replacement row in the frequency table.  This is set
     * by the individual cipher types on initialization
     */
    ShowRevReplace: boolean = true
    /**
     * Input string cleaned up.  This does not need to be saved because it is
     * rebuild by the build() function based in this.state.cipherString
     */
    encodedString: string = ""
    Frequent: { [key: string]: { [key: string]: patelem[] } } = {}
    freq: { [key: string]: number } = {}
    savefileentry: number = -1
    /**
     * Gets the total number of saved tests
     * Cipher-Test-Count [number] holds the number of tests in the system.
     * Cipher-Test.n [JSON] holds the data for the test n.
     */
    getTestCount(): number {
        let result = 0
        if (typeof (Storage) !== "undefined") {
            // Cipher-Count [number] holds the number of currently saved questions.
            // Cipher-Data.n [JSON] holds the data from question n. Note n is zero based.
            result = Number(localStorage.getItem("Cipher-Test-Count"))
        }
        return result
    }
    /**
     * Set the number of cipher tests stored in local storage
     */
    setTestCount(count: number): string {
        if (typeof (Storage) === "undefined") {
            return "Unable to save, local storage not defined"
        }
        localStorage.setItem('Cipher-Test-Count', String(count))
        return ""
    }

    /**
     * Gets the string that corresponds to a test in local storage
     */
    getTestName(entry: number): string {
        return 'Cipher-Test' + String(entry)
    }
    /**
     * Retrieves a test entry from local storage
     */
    getTestEntry(entry: number): ITest {
        let result: ITest = { timed: -1, title: "Invalid Test", count: 0, questions: [] }
        if (typeof (Storage) !== "undefined") {
            // Cipher-Count [number] holds the number of currently saved questions.
            // Cipher-Data.n [JSON] holds the data from question n. Note n is zero based.
            let cipherCount = this.getTestCount()
            if (entry < cipherCount) {
                let jsonString = localStorage.getItem(this.getTestName(entry))
                result = JSON.parse(jsonString)
            }
        }
        if (result.timed === undefined) {
            result.timed = -1
        }
        return result
    }
    /**
     * Writes a test entry to local storage.  An entry of -1 or
     * greater than the number of entries just writes as a new entry
     */
    setTestEntry(entry: number, state: ITest): number {
        if (typeof (Storage) === "undefined") {
            return -1
        }
        let testCount = this.getTestCount()
        if (entry > testCount || entry === -1) {
            entry = testCount
            this.setTestCount(entry + 1)
        }
        localStorage.setItem(this.getTestName(entry), JSON.stringify(state))
        return entry
    }
    /**
     * Removes a file entry, renumbering all the other entries after it
     */
    deleteTestEntry(entry: number): string {
        if (typeof (Storage) === "undefined") {
            return "Unable to delete, local storage not defined"
        }
        let testCount = this.getTestCount()
        if (entry < testCount && entry >= 0) {
            for (let pos = entry + 1; pos < testCount; pos++) {
                localStorage.setItem(this.getTestName(pos - 1), localStorage.getItem(this.getTestName(pos)))
            }
            localStorage.removeItem(this.getTestName(testCount))
            this.setTestCount(testCount - 1)
        }
        return ""
    }
    /**
     * Get the total number of saved ciphers
     */
    getCipherCount(): number {
        let result = 0
        if (typeof (Storage) !== "undefined") {
            // Cipher-Count [number] holds the number of currently saved questions.
            // Cipher-Data.n [JSON] holds the data from question n. Note n is zero based.
            result = Number(localStorage.getItem("Cipher-Count"))
        }
        return result
    }
    /**
     * Gets the string that corresponds to an entry in local storage
     */
    getEntryName(entry: number): string {
        return 'Cipher-Data' + String(entry)
    }
    /**
     * Get the save state associated with a numbered file entry
     */
    getFileEntry(entry: number): IState {
        let result: IState = null
        if (typeof (Storage) !== "undefined") {
            // Cipher-Count [number] holds the number of currently saved questions.
            // Cipher-Data.n [JSON] holds the data from question n. Note n is zero based.
            let cipherCount = this.getCipherCount()
            if (entry < cipherCount) {
                let jsonString = localStorage.getItem(this.getEntryName(entry))
                result = JSON.parse(jsonString)
            }
        }
        return result
    }
    /**
     * Populate the file list dialog to match all the entries of a given type
     */
    getFileList(ciphertype: ICipherType[]): JQElement {
        let result = null
        let cipherCount = this.getCipherCount()
        $("#okopen").prop("disabled", true)
        if (cipherCount === 0) {
            result = $("<div/>", { class: "callout warning filelist", id: "files" }).text("No files found")
        } else {
            result = $("<select/>", { id: "files", class: "filelist", size: 10 })
            for (let entry = 0; entry < cipherCount; entry++) {
                let fileEntry = this.getFileEntry(entry)
                result.append($("<option />", { value: entry }).html(fileEntry.question))
            }
        }
        return result
    }
    /**
     * Set the number of cipher entries stored in local storage
     */
    setCipherCount(count: number): string {
        if (typeof (Storage) === "undefined") {
            return "Unable to save, local storage not defined"
        }
        localStorage.setItem('Cipher-Count', String(count))
        return ""
    }
    /**
     * Save a state entry to local storage. If the entry number is higher
     * than the total storage or is -1, it is appended to the end of all
     * the existing storage entries and the number of entries is incremented
     * by one to account for it
     */
    setFileEntry(entry: number, state: IState): number {
        if (typeof (Storage) === "undefined") {
            return -1
        }
        let cipherCount = this.getCipherCount()
        if (entry > cipherCount || entry === -1) {
            entry = cipherCount
            this.setCipherCount(entry + 1)
        }
        localStorage.setItem(this.getEntryName(entry), JSON.stringify(state))
        return entry
    }
    /**
     * Removes a file entry, renumbering all the other entries after it
     */
    deleteFileEntry(entry: number): string {
        if (typeof (Storage) === "undefined") {
            return "Unable to delete, local storage not defined"
        }
        let cipherCount = this.getCipherCount()
        if (entry < cipherCount && entry >= 0) {
            for (let pos = entry + 1; pos < cipherCount; pos++) {
                localStorage.setItem(this.getEntryName(pos - 1), localStorage.getItem(this.getEntryName(pos)))
            }
            localStorage.removeItem(this.getEntryName(cipherCount))
            this.setCipherCount(cipherCount - 1)
        }
        let testCount = this.getTestCount()
        for (let pos = 0; pos < testCount; pos++) {
            let test = this.getTestEntry(pos)
            if (test.timed > entry) {
                test.timed--;
            }
            for (let i in test.questions) {
                if (test.questions[i] > entry) {
                    test.questions[i]--
                }
            }
            this.setTestEntry(pos, test)
        }
        return ""
    }
    /**
     * Put up a dialog to select a cipher to load
     */
    openCipher(): void {
        // Populate the list of known files.
        $("#files").replaceWith(this.getFileList([this.state.cipherType]))
        $("#files").off('change').on('change', (e) => {
            $("#okopen").removeAttr("disabled");
        })
        $("#okopen").prop("disabled", true)
        $("#okopen").off("click").on("click", (e) => {
            this.savefileentry = Number($("#files option:selected").val())
            $("#OpenFile").foundation('close')
            this.markUndo()
            this.restore(this.getFileEntry(this.savefileentry))
        })
        $("#OpenFile").foundation('open')
    }
    /**
     *  Save the current cipher to the current file
     */
    saveCipher(): void {
        let state = this.save()
        this.savefileentry = this.setFileEntry(this.savefileentry, state)
    }
    /**
     * Save the current cipher state to a new file
     */
    saveCipherAs(): void {
        throw new Error("Method not implemented.");
    }
    /**
     * Submit a cipher for checking
     */
    submit(): void {
        throw new Error("Method not implemented.");
    }
    /**
     * Copy the current completed cipher to the clipboard
     */
    copy(): void {
        throw new Error("Method not implemented.");
    }
    /**
     * Start a new cipher
     */
    newCipher(): void {
        throw new Error("Method not implemented.");
    }
    /**
     * Copies one state interface to another preserving fields that are already
     * in the destination
     */
    copyState(dest: IState, source: IState): void {
        for (let elem of Object.keys(source)) {
            if (typeof (source[elem]) === "object") {
                dest[elem] = cloneObject(source[elem])
            } else {
                dest[elem] = source[elem]
            }
        }
    }
    /**
     * Set cipher encoder encode or decode mode
     */
    setOperation(operation: IOperationType): void {
        this.state.operation = operation
    }
    /**
     * Initializes the encoder/decoder.
     * We don't want to show the reverse replacement since we are doing an encode
     * @param {string} lang Language to select (EN is the default)
     */
    init(lang: string): void {
        this.state.curlang = lang
    }
    /**
     * Generates an HTML representation of a string for display
     * @param {string} str String to process
     */
    normalizeHTML(str: string): string {
        return str
    }
    /**
     * Creates an HTML table to display the frequency of characters
     * @returns {JQuery<HTMLElement} HTML to put into a DOM element
     */
    createFreqEditTable(): JQElement {
        let table = new JTTable({ class: "tfreq dragcol" })

        let headrow = table.addHeaderRow()
        let freqrow = table.addBodyRow()
        let replrow = table.addBodyRow()
        let altreprow
        if (this.ShowRevReplace) {
            altreprow = table.addBodyRow()
        }
        let charset = this.getSourceCharset()

        headrow.add({ settings: { class: "topleft" }, content: "" })
        freqrow.add({ celltype: "th", content: "Frequency" })
        replrow.add({ celltype: "th", content: "Replacement" })

        if (this.ShowRevReplace) {
            altreprow.add({ celltype: "th", content: "Rev Replace" })
        }
        for (let i = 0, len = charset.length; i < len; i++) {
            let c = charset.substr(i, 1).toUpperCase()
            headrow.add(c)
            freqrow.add({ settings: { id: "f" + c }, content: "" })
            replrow.add(this.makeFreqEditField(c))
            if (this.ShowRevReplace) {
                altreprow.add({ settings: { id: "rf" + c }, content: "" })
            }
        }
        return table.generate()
    }
    /**
     * Creates an HTML table to display the frequency of characters for printing
     * on the test and answer key
     * showanswers controls whether we display the answers or just the key
     * encodeType tells the type of encoding to print.  If it is 'random' then
     * we leave it blank.
     */
    genFreqTable(showanswers: boolean, encodeType: string): JQElement {
        let table = new JTTable({ class: "prfreq shrink cell unstriped" })
        if (encodeType === 'random') {
            encodeType = ''
        }
        // For a K2 cipher, the replacement row goes above the header row
        let replrow
        if (encodeType === 'k2') {
            replrow = table.addHeaderRow()
        }
        let headrow = table.addHeaderRow()
        let freqrow = table.addBodyRow()
        // For all other cipher types, the replacement row is below the frequency
        if (encodeType !== 'k2') {
            replrow = table.addBodyRow()
        }

        let charset = this.getSourceCharset()
        let revRepl = this.getReverseReplacement()

        headrow.add({ settings: { class: "topleft " + encodeType }, content: encodeType.toUpperCase() })
        freqrow.add({ celltype: "th", content: "Frequency" })
        replrow.add({ celltype: "th", content: "Replacement" })

        for (let c of charset.toUpperCase()) {
            let repl = ''
            if (showanswers) {
                repl = revRepl[c]
            }
            headrow.add(c)
            let freq = String(this.freq[c])
            if (freq === "0") {
                freq = ""
            }
            freqrow.add(freq)
            replrow.add(repl)
        }
        return table.generate()
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    load(): void {
    }
    /**
     * Loads new data into a solver, resetting any solving matches made
     */
    reset(): void {
    }

    genCmdButtons(): JQElement {
        return JTButtonGroup(this.cmdButtons)
    }

    /**
     * Creates the Undo and Redo command buttons
     */
    genUndoRedoButtons(): JQElement {
        let buttons = $("<div/>")

        buttons.append($("<input/>", { type: "button", id: "undo", class: "button primary undo", value: "Undo", disabled: true }))
        buttons.append($("<input/>", { type: "button", id: "redo", class: "button primary redo", value: "Redo", disabled: true }))
        return buttons.children()
    }
    genPreCommands(): JQElement {
        return null
    }
    genPostCommands(): JQElement {
        return null
    }
    /**
     * Initializes any layout of the handler.
     */
    buildCustomUI(): void {
        $('.precmds').each((i, elem) => {
            $(elem).replaceWith(this.genPreCommands())
        })
        $('.postcmds').each((i, elem) => {
            $(elem).replaceWith(this.genPostCommands())
        })
        $('.cmdbuttons').each((i, elem) => {
            $(elem).replaceWith(this.genCmdButtons())
        })
        $(".undocmds").each((i, elem) => {
            $(elem).replaceWith(this.genUndoRedoButtons())
        })
    }
    restore(data: IState): void {
    }
    save(): IState {
        return {
            cipherType: ICipherType.None,
            cipherString: ""
        }
    }
    /**
     * Saves the current state of the cipher work so that it can be undone
     * This code will attempt to merge named operations when pushing a second
     * to the top of the stack.  This is useful for operations such as search
     * @param undotype Type of undo (for merging with previous entries)
     */
    markUndo(undotype?: string): void {
        if (this.undoPosition < this.undoStack.length - 1) {
            this.undoStack.splice(this.undoPosition)
        }
        if (undotype === undefined) {
            undotype = null
        }
        this.pushUndo(undotype);
        this.undoNeeded = undotype
        this.markUndoUI(false, true)
    }
    /**
     * Pushes or merges an undo operation to the top of the stack
     * @param undotype Type of undo (for merging with previous entries)
     */
    pushUndo(undotype: string): void {
        let undodata = this.save()
        if (undotype !== undefined && undotype !== null) {
            undodata.undotype = undotype
        } else {
            undotype = null
        }
        // See if we can merge this (such as a find operation) with the previous undo
        if (this.undoStack.length > 0 &&
            ((undotype !== null && this.undoStack[this.undoStack.length - 1].undotype === undotype) ||
                (undotype === null && this.undoStack[this.undoStack.length - 1].undotype !== null))) {
            this.undoStack[this.undoStack.length - 1] = undodata;
        } else {
            this.undoStack.push(undodata);
        }
        this.undoPosition = this.undoStack.length - 1;
    }
    /**
     * Restore work to a previous state stored on the stack
     */
    unDo(): void {
        // Note that if we are at the top of the undo stack, we have to push
        // a new entry so that they can get back to where they are
        if (this.undoNeeded !== undefined) {
            this.pushUndo(this.undoNeeded)
            this.undoNeeded = undefined
        }
        if (this.undoPosition > 0) {
            this.undoPosition--
            this.restore(this.undoStack[this.undoPosition])
            this.markUndoUI((this.undoPosition <= 0), false)
        }
    }
    markUndoUI(undostate: boolean, redostate: boolean): void {
        $(".redo").prop("disabled", redostate)
        $(".undo").prop("disabled", undostate)
        if (redostate) {
            $(".redo").addClass("disabled_menu")
        } else {
            $(".redo").removeClass("disabled_menu")
        }
        if (undostate) {
            $(".undo").addClass("disabled_menu")
        } else {
            $(".undo").removeClass("disabled_menu")
        }
    }

    /**
     * Redo work (i.e. undo an undo)
     */
    reDo(): void {
        if (this.undoPosition < this.undoStack.length - 1) {
            this.undoPosition++
            this.restore(this.undoStack[this.undoPosition])
            this.undoNeeded = undefined
            this.markUndoUI(false, (this.undoPosition >= (this.undoStack.length - 1)))
        }
    }
    /**
     * Updates the initial user interface for the cipher handler.  This is a one
     * time operation.  If the editEntry paramter is passed on the URL, then that
     * entry is loaded and the cipher is initialized with it as if it were loaded
     * from the menu.  Any additional URL parameters are parsed and passed in as
     * the initial state values.
     */
    layout(): void {
        $(".langsel").each((i: number, elem: HTMLElement) => { $(elem).replaceWith(this.getLangDropdown()) })
        $(".MenuBar").each((i: number, elem: HTMLElement) => { $(elem).replaceWith(this.createMainMenu()) })
        this.buildCustomUI()
        let parms = parseQueryString(window.location.search.substring(1))
        let saveSet = this.save()
        this.savefileentry = -1
        if (parms.editEntry !== undefined) {
            // They gave us an entry to load, so start out with it
            this.savefileentry = Number(parms.editEntry)
            saveSet = this.getFileEntry(this.savefileentry)
        }
        // Copy over any additional parameters they might have given
        for (let v in parms) {
            if (parms.hasOwnProperty(v)) {
                saveSet[v] = parms[v]
            }
        }
        this.restore(saveSet)
        this.attachHandlers()
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    setUIDefaults(): void {
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    updateOutput(): void {
    }
    /**
     * Builds the output for the current state data.
     */
    build(): JQElement {
        return null
    }

    /**
     * Create an edit field for a dropdown
     * @param {string} str character to generate dropdown for
     * @returns {string} HTML of dropdown
     */
    makeFreqEditField(c: string): JQElement {
        return null
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {number} val This is which element we are changing it to.  This is an index into the morbitReplaces table
     */
    updateSel(item: string, val: string): void {
    }
    /**
     * @returns {Object.<string, string>}
     */
    getMorseMap(): any {
        return null
    }
    /**
     * Adds a set of answer rows to a table.
     *   overline specifies answer characters (typically from a vigenere or running key)
     *    that someone would use to compute the answer.  undefined indicates not to use it
     *   cipher line is the line that they are being asked to encode/decode
     *   answerline is the answer (if any).  undefined to leave it blank
     *   blankline chooses to add an extra line to the table or not.
     */
    addCipherTableRows(table: JTTable, overline: string, cipherline: string, answerline: string, blankline: boolean): void {
        let rowover
        if (overline !== undefined) {
            rowover = table.addBodyRow()
        }
        let rowcipher = table.addBodyRow()
        let rowanswer = table.addBodyRow()
        let rowblank = table.addBodyRow()

        for (let i = 0; i < cipherline.length; i++) {
            let c = cipherline.substr(i, 1)
            let aclass = "e v"
            let a = " "
            if (answerline !== undefined) {
                a = answerline.substr(i, 1)
                aclass = "a v"
            }
            if (overline !== undefined) {
                if (this.isValidChar(c)) {
                    rowover.add({ settings: { class: "o v" }, content: overline.substr(i, 1) })
                } else {
                    rowover.add(overline.substr(i, 1))
                }
            }
            if (this.isValidChar(c)) {
                rowcipher.add({ settings: { class: "q v" }, content: c })
                rowanswer.add({ settings: { class: aclass }, content: a })
            } else {
                if (answerline === undefined) {
                    a = c
                }
                rowcipher.add(c)
                rowanswer.add(a)
            }
            rowblank.add("")
        }
        return
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    genAnswer(): JQElement {
        return $("<h3>").text("This cipher does not support printing the Answer yet")
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    genQuestion(): JQElement {
        return $("<h3>").text("This cipher does not support printing the Question yet")
    }
    /**
     * Assign a new value for an entry
     * @param {string} entry Character to be updated
     * @param {string} val New value to associate with the character
     */
    setMorseMapEntry(entry: string, val: string): void {
    }
    /**
     * Change the encrypted character
     * @param {string} repchar Encrypted character to map against
     * @param {string} newchar New char to assign as decoding for the character
     */

    /**
     * Change the encrypted character
     * @param {string} repchar Encrypted character to map against
     * @param {string} newchar New char to assign as decoding for the character
     */
    setChar(repchar: string, newchar: string): void {
        // console.log("handler setChar data-char=" + repchar + " newchar=" + newchar)
        // See if any other slots have this character and reset it
        if (newchar !== '') {
            for (let i in this.replacement) {
                if (this.replacement[i] === newchar && i !== repchar) {
                    this.setChar(i, '')
                }
            }
        }
        this.replacement[repchar] = newchar
        $("input[data-char='" + repchar + "']").val(newchar)
        if (newchar === "") {
            newchar = "?"
        }
        $("span[data-char='" + repchar + "']").text(newchar)
        this.UpdateReverseReplacements()
        this.updateMatchDropdowns(repchar)
    }
    /**
     * Change multiple characters at once.
     * @param {string} reqstr String of items to apply
     */
    setMultiChars(reqstr: string): void {
    }
    /**
     *
     * @param {string} reqstr String of items to apply
     */
    updateMatchDropdowns(reqstr: string): void {
    }
    /**
     * Locate a string
     * @param {string} str string to look for
     */
    findPossible(str: string): void {
    }

    /**
     * Eliminate the non displayable characters and replace them with a space
     * @param {string} str String to clean up
     * @returns {string} String with no spaces in it
     */
    cleanString(str: string): string {
        let pattern: string = "[\r\n ]+"
        let re = new RegExp(pattern, "g")
        str.replace(re, " ")
        return str
    }
    /**
     * Eliminate all characters which are not in the charset
     * @param {string} str String to clean up
     * @returns {string} Result string with only characters in the legal characterset
     */
    minimizeString(str: string): string {
        let res: string = ""
        for (let c of str.toUpperCase()) {
            if (this.isValidChar(c)) {
                res += c
            }
        }
        return res
    }
    /**
     * Convert the text to chunks of (chunkSize) characters separated
     * by a space.  Just keep characters that are in the character set and
     * remove all punctuation, etc.
     * Note: the string could be toUpperCase()'d here, but it is done later.
     * @returns chunked input string
     */
    chunk(inputString: string, chunkSize: number): string {
        let chunkIndex = 1
        let charset = this.getCharset()
        let chunkedString = ""
        for (let c of inputString) {

            // Skip anthing that is not in the character set (i.e spaces,
            // punctuation, etc.)
            if (charset.indexOf(c.toUpperCase()) < 0) {
                continue
            }

            // Test for a chunk boundary using modulo of chunk size.
            if (chunkIndex % (chunkSize + 1) === 0) {
                chunkedString += " "
                chunkIndex = 1
            }

            // Store the character in the chunk representation.
            chunkedString += c
            chunkIndex++
        }
        return chunkedString
    }

    /** @description Sets the character set used by the Decoder.
     * @param {string} charset the set of characters to be used.
     */
    setCharset(charset: string): void {
        this.charset = charset
    }

    isValidChar(char: string): boolean {
        return this.charset.indexOf(char) >= 0
    }
    getCharset(): string {
        return this.charset
    }
    /**
     * Gets the character set to be use for encoding.
     * @param {string} charset the set of characters to be used.
     */
    getSourceCharset(): string {
        return this.sourcecharset
    }
    /**
     * Sets the character set to be use for encoding.
     * @param {string} charset the set of characters to be used.
     */
    setSourceCharset(charset: string): void {
        this.sourcecharset = charset
    }
    /**
     * Update the frequency table on the page.  This is done after loaading
     * a new cipher to encode or decode
     */
    UpdateFreqEditTable(): void {
        $(".freq").each((i: number, elem: HTMLElement) => {
            $(elem).empty().append(this.createFreqEditTable())
        })
        this.attachHandlers()
    }
    getReverseReplacement(): StringMap {
        let revRepl: StringMap = {}
        // Build a reverse replacement map so that we can encode the string
        for (let repc in this.replacement) {
            if (this.replacement.hasOwnProperty(repc)) {
                revRepl[this.replacement[repc]] = repc
            }
        }
        return revRepl
    }

    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be output properly.
     * This returns the strings as an array of pairs of strings with
     * the encode and decode parts delivered together.  As a side effect
     * it also updates the frequency table
     */
    makeReplacement(str: string, maxEncodeWidth: number): string[][] {
        let charset = this.getCharset()
        let sourcecharset = this.getSourceCharset()
        let revRepl = this.getReverseReplacement()
        let langreplace = this.langreplace[this.state.curlang]
        let encodeline = ""
        let decodeline = ""
        let lastsplit = -1
        let result: string[][] = []

        // Zero out the frequency table
        this.freq = {}
        for (let i = 0, len = sourcecharset.length; i < len; i++) {
            this.freq[sourcecharset.substr(i, 1).toUpperCase()] = 0
        }
        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (let t of str.toUpperCase()) {
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== 'undefined') {
                t = langreplace[t]
            }
            decodeline += t
            // Make sure that this is a valid character to map from
            let pos = charset.indexOf(t)
            if (pos >= 0) {
                t = revRepl[t]
                if (isNaN(this.freq[t])) {
                    this.freq[t] = 0
                }
                this.freq[t]++
            } else {
                // This is a potential split position, so remember it
                lastsplit = decodeline.length
            }
            encodeline += t
            // See if we have to split the line now
            if (encodeline.length >= maxEncodeWidth) {
                if (lastsplit === -1) {
                    result.push([encodeline, decodeline])
                    encodeline = ""
                    decodeline = ""
                    lastsplit = -1
                } else {
                    let encodepart = encodeline.substr(0, lastsplit)
                    let decodepart = decodeline.substr(0, lastsplit)
                    encodeline = encodeline.substr(lastsplit)
                    decodeline = decodeline.substr(lastsplit)
                    result.push([encodepart, decodepart])
                }
            }
        }
        // And put together any residual parts
        if (encodeline.length > 0) {
            result.push([encodeline, decodeline])
        }
        return result
    }
    /**
     * Make multiple copies of a string concatenated
     * @param c Character (or string) to repeat
     * @param count number of times to repeat the string
     */
    repeatStr(c: string, count: number): string {
        let res = ""
        for (let i = 0; i < count; i++) {
            res += c
        }
        return res
    }
    /**
     *
     * @param {*string} string String to compute value for
     * @returns {number} Value calculated
     */
    CalculateChiSquare(str: string): number {
        let charset = this.getCharset()
        let len = charset.length
        let counts = new Array(len)
        let total = 0
        for (let i = 0; i < len; i++) {
            counts[i] = 0
        }
        for (let i = 0; i < str.length; i++) {
            let c = str.substr(i, 1).toUpperCase()
            let pos = charset.indexOf(c)
            if (pos >= 0) {
                counts[pos]++
                total++
            }
        }
        let chiSquare = 0.0
        for (let i = 0; i < len; i++) {
            let c = charset.substr(i, 1)
            let expected = this.langfreq[this.state.curlang][c]
            if (expected !== undefined && expected !== 0) {
                chiSquare += Math.pow(counts[i] - total * expected, 2) / (total * expected)
            }
        }
        return chiSquare
    }
    /**
     * Analyze the encoded text
     * @param {string} encoded
     * @param {number} width
     * @param {number} num
     */
    analyze(encoded: string): JQElement {
        return null
    }
    doAction(action: string): void {
        switch (action) {
            case "new":
                this.newCipher()
                break

            case "open":
                this.openCipher()
                break

            case "save":
                this.saveCipher()
                break

            case "saveas":
                this.saveCipherAs()
                break

            case "submit":
                this.submit()
                break

            case "undo":
                this.unDo()
                break

            case "redo":
                this.reDo()
                break

            case "copy":
                this.copy()
                break

            default:
                console.log('Unknown action: ' + action)
                break
        }
    }

    /**
     * Fills in the frequency portion of the frequency table
     */
    displayFreq(): void {
        let charset = this.getCharset()
        this.holdupdates = true
        for (let c in this.freq) {
            if (this.freq.hasOwnProperty(c)) {
                let subval: string = String(this.freq[c])
                if (subval === "0") {
                    subval = ""
                }
                $('#f' + c).text(subval)
            }
        }
        // replicate all of the previously set values.  This is done when
        // you change the spacing in the encoded text and then do a reload.
        if (this.ShowRevReplace) {
            for (let c of charset) {
                let repl: string = $('#m' + c).val() as string
                if (repl === "") {
                    repl = $('#m' + c).html()
                }
                this.setChar(c, repl)
            }
        }

        this.holdupdates = false
        this.updateMatchDropdowns("")
    }
    /**
     * Set the value of a rich text element.  Note that some editors may not
     * be fully initialized, so we may have to stash it for when it does get
     * initialized
     */
    public setRichText(id: string, val: string): void {
        if (id in this.editor) {
            this.editor[id].setData(val)
        } else {
            $("#" + id).val(val)
        }
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        $(".sli").off("keyup").on("keyup", (event) => {
            let repchar = $(event.target).attr("data-char")
            let current
            let next
            let focusables = $(".sli")

            if (event.keyCode === 37) { // left
                current = focusables.index(event.target)
                if (current === 0) {
                    next = focusables.last()
                } else {
                    next = focusables.eq(current - 1)
                }
                next.focus()
            } else if (event.keyCode === 39) { // right
                current = focusables.index(event.target)
                next = focusables.eq(current + 1).length ? focusables.eq(current + 1) : focusables.eq(0)
                next.focus()
            } else if (event.keyCode === 46 || event.keyCode === 8) {
                this.markUndo()
                this.setChar(repchar, "")
            }
            event.preventDefault()
        }).off("keypress").on("keypress", (event) => {
            let newchar
            let repchar = $(event.target).attr("data-char")
            let current
            let next
            let focusables = $(".sli")
            if (typeof event.key === "undefined") {
                newchar = String.fromCharCode(event.keyCode).toUpperCase()
            } else {
                newchar = event.key.toUpperCase()
            }

            if (this.isValidChar(newchar) || newchar === " ") {
                if (newchar === " ") {
                    newchar = ""
                }
                console.log("Setting " + repchar + " to " + newchar)
                this.markUndo()
                this.setChar(repchar, newchar)
                current = focusables.index(event.target)
                next = focusables.eq(current + 1).length ? focusables.eq(current + 1) : focusables.eq(0)
                next.focus()
            } else {
                console.log("Not valid:" + newchar)
            }
            event.preventDefault()
        }).off("blur").on("blur", (e) => {
            let tohighlight = $(e.target).attr("data-char")
            $("[data-char='" + tohighlight + "']").removeClass("allfocus")
            let althighlight = $(e.target).attr("data-schar")
            if (althighlight !== "") {
                $("[data-schar='" + althighlight + "']").removeClass("allfocus")
            }
            $(e.target).removeClass("focus")
        }).off("focus").on("focus", (e) => {
            let tohighlight = $(e.target).attr("data-char")
            $("[data-char='" + tohighlight + "']").addClass("allfocus")
            let althighlight = $(e.target).attr("data-schar")
            if (althighlight !== "") {
                $("[data-schar='" + althighlight + "']").addClass("allfocus")
            }
            $(e.target).addClass("focus")
        })
        $('[name="operation"]').off('click').on('click', (e) => {
            $(e.target).siblings().removeClass('is-active');
            $(e.target).addClass('is-active');
            this.markUndo()
            this.setOperation($(e.target).val() as IOperationType)
            this.updateOutput()
        });
        $('.input-number-increment').off('click').on('click', (e) => {
            let $input = $(e.target).parents('.input-group').find('.input-number')
            let val = Number($input.val())
            this.advancedir = 1
            $input.val(val + this.advancedir)
            $input.trigger('input')
        })
        $('.input-number-decrement').off('click').on('click', (e) => {
            let $input = $(e.target).parents('.input-group').find('.input-number');
            let val = Number($input.val())
            this.advancedir = -1
            $input.val(val + this.advancedir)
            $input.trigger('input')
        })
        $('[name="ciphertype"]').off('click').on('click', (e) => {
            $(e.target).siblings().removeClass('is-active');
            $(e.target).addClass('is-active');
            this.markUndo()
            this.setCipherType($(e.target).val() as ICipherType)
            this.updateOutput()
        });
        $("#load").off("click").on("click", () => {
            this.markUndo()
            this.load()
        })
        $("#undo").off("click").on("click", () => {
            this.unDo()
        })
        $("#redo").off("click").on("click", () => {
            this.reDo()
        })
        $("#reset").off("click").on("click", () => {
            this.markUndo()
            this.reset()
        })
        $("a[data-action]").off("click").on("click", (e) => {
            if ($(e.target).hasClass("disabled_menu")) {
                e.preventDefault()
            } else {
                this.doAction($(e.target).attr("data-action"))
            }
        })

        $(".dragcol").each((i: number, elem: HTMLElement) => {
            if (!$.fn.dataTable.isDataTable(".dragcol")) {
                $(elem).DataTable({ colReorder: true, ordering: false, dom: "t" })
            }
        })
        $(".msli").off("change").on("change", (e) => {
            this.markUndo()
            let toupdate = $(e.target).attr("data-char")
            this.updateSel(toupdate, (e.target as HTMLInputElement).value)
        })
        $(".lang").off("change").on("change", (e) => {
            this.loadLanguage($(e.target).val() as string)
        })
        $(".richtext").each((i: number, elem: HTMLElement) => {
            let id = $(elem).prop('id') as string
            if (id !== '' && (!(id in this.editor))) {
                InlineEditor.create(elem,
                                    {
                                        // plugins: [Font],
                                        // plugins: [Enter, Typing, Paragraph, Undo, Bold, Italic, Image],
                                        toolbar: ["bold", "italic", "blockQuote", "heading",  "link", ],
                                    })
                    .then(editor => {
                        let initialtext = $(elem).val()
                        this.editor[id] = editor
                        if (initialtext !== '') {
                            editor.setData(initialtext)
                        }
                        editor.model.document.on('change:data', () => {
                            $(elem).trigger("richchange", editor.getData())
                        })
                    })
                    .catch(error => { console.error(error) })
            }
        })
        $('#find').off("input").on("input", (e) => {
            this.markUndo("find")
            let findStr = $(e.target).val() as string
            this.findPossible(findStr)
        })
    }

    /**
     * Generate a replacement pattern string.  Any unknown characters are represented as a space
     * otherwise they are given as the character it replaces as.
     *
     * For example if we know
     *    A B C D E F G J I J K L M N O P Q R S T U V W X Y Z
     *        E             H
     *
     * And were given the input string of "RJCXC" then the result would be " HE E"
     * @param {any} str String of encoded characters
     * @returns {string} Replacement pattern string
     */
    genReplPattern(str: string): string[] {
        let res = []
        for (let c of str) {
            res.push(this.replacement[c])
        }
        return res
    }

    /**
     * @param {string} str String to check
     * @param {Array.<string>} repl Replacement characters which are pre-known
     * @param {BoolMap} used Array of flags whether a character is already known to be used
     * @returns {bool} True/false if the string is a valid replacement
     */
    isValidReplacement(str: string, repl: string[], used: BoolMap): boolean {
        //   console.log(str)
        for (let i = 0, len = str.length; i < len; i++) {
            let c = str.substr(i, 1)
            if (repl[i] !== "") {
                if (c !== repl[i]) {
                    //             console.log("No match c=" + c + " repl[" + i + "]=" + repl[i])
                    return false
                }
            } else if (used[c]) {
                //          console.log("No match c=" + c + " used[c]=" + used[c])
                return false
            }
        }
        return true
    }
    public setDefaultCipherType(ciphertype: ICipherType): void {
        this.state.cipherType = ciphertype
        this.defaultstate.cipherType = ciphertype
    }
    /**
     * Set flag to "chunk" input data string befre encoding.  Used in Patristocrat,
     */
    public setCipherType(ciphertype: ICipherType): void {
        this.state.cipherType = ciphertype
    }

    /**
     * Quote a string, escaping any quotes with \.  This is used for generating Javascript
     * that can be safely loaded.
     * @param {string} str String to be enqoted
     * @return {string} Quoted string
     */
    quote(str: string): string {
        if (typeof str === "undefined") {
            return "\"\""
        }
        return "'" + str.replace(/([""])/g, "\\$1") + "'"
    }
    /**
     * Given a string with groupings of a size, this computes a pattern which matches the
     * string in a unique order.
     * for example for makeUniquePattern("XYZZY",1)
     *                 it would generate "01221"
     * with  makeUniquePattern("..--X..X..X",2)
     *                          0 1 2 3 0 4   (note the hidden addition of the extra X)
     * This makes it easy to search for a pattern in any input cryptogram
     * @param {string} str String to generate pattern from
     * @param {number} width Width of a character in the pattern
     * @returns {string} Numeric pattern string
     */
    makeUniquePattern(str: string, width: number): string {
        let cmap = {}
        let res = ""
        let mapval: number = 0
        let len = str.length
        // in case they give us an odd length string, just padd it with enough Xs
        str += "XXXX"

        for (let i = 0; i < len; i += width) {
            let c = str.substr(i, width)
            if (typeof cmap[c] === "undefined") {
                cmap[c] = "" + mapval
                mapval++
            }
            res += cmap[c]
        }
        return res
    }

    /**
     * @param {string} lang 2 character Language to dump language template for
     */
    dumpLang(lang: string): string {
        let extra = ""
        let res = "cipherTool.Frequent[" + this.quote(lang) + "]={"
        for (let pat in this.Frequent[lang]) {
            if (this.Frequent[lang].hasOwnProperty(pat) && pat !== "") {
                res += extra + "\"" + pat + "\":["
                let extra1 = ""
                let matches = this.Frequent[lang][pat]
                for (let i = 0, len = matches.length; i < len; i++) {
                    // console.log(matches[i])
                    res += extra1 +
                        "[" + this.quote(matches[i][0]) + "," +
                        matches[i][1] + "," +
                        matches[i][2] + "," +
                        matches[i][3] + "]"
                    extra1 = ","
                }
                res += "]"
                extra = ","
            }
        }
        res += "};"
        return res
    }
    /**
     * Fills in the language choices on an HTML Select
     * @param lselect HTML Element to populate
     */
    getLangDropdown(): JQElement {
        let result = $("<div/>", { class: "cell input-group" })
        result.append($("<span/>", { class: "input-group-label" }).text("Language"))
        let select = $("<select/>", { class: "lang input-group-field" })
        select.append($('<option />', { value: "" }).text("--Select a language--"))
        for (let lang in this.langmap) {
            if (this.langmap.hasOwnProperty(lang)) {
                select.append($("<option />", { value: lang }).text(this.langmap[lang]))
            }
        }
        result.append(select)
        return result
    }
    /**
     * Loads a language in response to a dropdown event
     * @param lang Language to load
     */
    loadLanguage(lang: string): void {
        this.state.curlang = lang
        this.setCharset(this.langcharset[lang])
        $(".langstatus").text("Attempting to load " + this.langmap[lang] + "...")
        $.getScript("Languages/" + lang + ".js", (data, textStatus, jqxhr) => {
            $(".langstatus").text("")
            this.updateMatchDropdowns("")
        }).fail((jqxhr, settings, exception) => {
            console.log("Complied language file not found for " + lang + ".js")
            this.loadRawLanguage(lang)
        })
    }
    /**
     * Loads a raw language from the server
     * @param lang Language to load (2 character abbreviation)
     */
    loadRawLanguage(lang: string): void {
        let jqxhr = $.get("Languages/" + lang + ".txt", () => {
        }).done((data) => {
            // empty out all the frequent words
            $(".langstatus").text("Processing " + this.langmap[lang] + "...")
            this.Frequent[lang] = {}
            this.state.curlang = lang
            let charset = this.langcharset[lang]
            let langreplace = this.langreplace[lang]
            this.setCharset(charset)
            let lines = data.split("\n")
            let len = lines.length
            charset = charset.toUpperCase()
            for (let i = 0; i < len; i++) {
                let pieces = lines[i].replace(/\r/g, " ").toUpperCase().split(/ /)
                // make sure that all the characters in the pieces are valid
                // for this character set.  Otherwise we can throw it away
                let legal = true
                for (let c of pieces[0]) {
                    if (charset.indexOf(c) < 0) {
                        if (typeof langreplace[c] === "undefined") {
                            console.log("skipping out on " + pieces[0] + " for " + c + " against " + charset)
                            legal = false
                            break
                        }
                        pieces[0] = pieces[0].replace(c, langreplace[c])
                    }
                }
                if (legal) {
                    let pat = this.makeUniquePattern(pieces[0], 1)
                    let elem: patelem = [
                        pieces[0].toUpperCase(),
                        i,
                        pieces[1],
                        0,
                    ]
                    if (i < 500) {
                        elem[3] = 0
                    } else if (i < 1000) {
                        elem[3] = 1
                    } else if (i < 2000) {
                        elem[3] = 3
                    } else if (i < 5000) {
                        elem[3] = 4
                    } else {
                        elem[3] = 5
                    }
                    if (typeof this.Frequent[lang][pat] === "undefined") {
                        this.Frequent[lang][pat] = []
                    }
                    this.Frequent[lang][pat].push(elem)
                }
            }
            // console.log(this.Frequent)
            $(".langout").each((i: number, elem: HTMLElement) => {
                $(".langstatus").text("Dumping " + this.langmap[lang] + "...")
                $(elem).text(this.dumpLang(lang))
            })
            $(".langstatus").text("")
            this.updateMatchDropdowns("")
        })
        $(".langstatus").text("Loading " + this.langmap[lang] + "...")
    }

    /**
     * Retrieve all of the replacement characters that have been selected so far
     */
    UpdateReverseReplacements(): void {
        let charset = this.getSourceCharset().toUpperCase()
        $("[id^=rf").text('')
        for (let c of charset) {
            $('#rf' + this.replacement[c]).text(c)
        }
    }
    /**
     * Apply any fixed replacement characters to a given unique string. For example, if the input
     * string was "01232" and the repl string was " HE E" then the output would be "0HE3E"
     * NOTE: Is this used anymore?
     * @param {string} str Input string to apply the replacement characters to
     * @param {string} repl Replacement characters.  Any non blank character replaces the
     *                      corresponding character in the input string
     * @returns {string} Comparable replacement string
     */
    applyReplPattern(str: string, repl: string): string {
        let res = ""
        let len = str.length
        for (let i = 0; i < len; i++) {
            let c = repl.substr(i, 1)
            if (c === " ") {
                c = str.substr(i, 1)
            }
            res += c
        }
        return res
    }
    getEditURL(state: IState): string {
        if (state.cipherType === undefined) {
            return ""
        }
        return JTGetURL(CipherMenu, state.cipherType)
    }

    createMainMenu(): JQElement {
        let result = $("<div/>")
        result.append(JTCreateMenu(CipherMenu, "example-menu", "Cipher Tools"))
        let modaldiv = $("<div/>", { class: "reveal", id: "OpenFile", 'data-reveal': '' })
        modaldiv.append($("<div/>", { class: "top-bar Primary" })
            .append($("<div/>", { class: "top-bar-left" })
                .append($("<h3/>").text("Select File to Open"))))
        modaldiv.append($("<select/>", { id: "files", class: "filelist", size: 10 }))
        let buttongroup = $("<div/>", { class: "expanded button-group" })
        buttongroup.append($("<a/>", { class: "secondary button", "data-close": "" }).text("Cancel"))
        buttongroup.append($("<a/>", { class: "button", disabled: "true", id: "okopen" }).text("OK"))
        modaldiv.append(buttongroup)
        modaldiv.append($("<button/>", { class: "close-button", "data-close": "", "aria-label": "Close reveal", type: "button" })
            .append($("<span/>", { "aria-hidden": true }).html("&times;")))
        result.append(modaldiv)
        return result
    }
}
