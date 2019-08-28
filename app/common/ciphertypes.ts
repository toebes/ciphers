import { JTRadioButtonItem } from "./jtradiobutton";

/** Which type of cipher we are solving */
export const enum ICipherType {
    None = "none",
    Affine = "affine",
    Amsco = "amsco",
    Aristocrat = "aristocrat",
    Atbash = "atbash",
    Autokey = "autokey",
    Baconian = "baconian",
    Bazeries = "bazeries",
    Beaufort = "beaufort",
    Bifid = "bifid",
    Cadenus = "cadenus",
    Caesar = "caesar",
    Checkerboard = "checkerboard",
    CMBifid = "cmbifid",
    CompleteColumnar = "compcolumnar",
    Condi = "condi",
    Counter = "counter",
    Cryptarithm = "cryptarithm",
    Digrafid = "digrafid",
    Foursquare = "foursquare",
    FractionatedMorse = "fractionatedmorse",
    Grandpre = "grandpré",
    Grille = "grille",
    Gromark = "gromark",
    Gronsfeld = "gronsfeld",
    Headlines = "headlines",
    Hill = "hill",
    Homophonic = "homophonic",
    IncompleteColumnar = "inccolumnar",
    InterruptedKey = "interruptedkey",
    KeyPhrase = "keyphrase",
    MonomeDinome = "monomedinome",
    Morbit = "morbit",
    Myszkowski = "myszkowski",
    Nicodemus = "nicodemus",
    NihilistSubstitution = "nihilistsub",
    NihilistTransposition = "nihilisttrans",
    Null = "null",
    NumberedKey = "numberedkey",
    Patristocrat = "patristocrat",
    PeriodicGromark = "periodicgromark",
    PigPen = "pigpen",
    Phillips = "phillips",
    PhillipsRC = "phillipsrc",
    Playfair = "playfair",
    Pollux = "pollux",
    Porta = "porta",
    Portax = "portax",
    ProgressiveKey = "progressivekey",
    QuagmireI = "quagmirei",
    QuagmireII = "quagmireii",
    QuagmireIII = "quagmireiii",
    QuagmireIV = "quagmireiv",
    Ragbaby = "ragbaby",
    Railfence = "railfence",
    Redefence = "redefence",
    RouteTransposition = "routetransp",
    RSA = "rsa",
    RunningKey = "runningkey",
    SequenceTransposition = "sequencetransposition",
    SeriatedPlayfair = "seriatedplayfair",
    Slidefair = "slidefair",
    Standard = "standard",
    Swagman = "swagman",
    Syllabary = "syllabary",
    TapCode = "tapcode",
    Test = "test",
    Tridigital = "tridigital",
    Trifid = "trifid",
    TriSquare = "trisquare",
    TwinBifid = "twinbifid",
    TwinTrifid = "twintrifid",
    TwoSquare = "twosquare",
    Variant = "variant",
    Vigenere = "vigenere",
    Xenocrypt = "xenocrypt"
}

let cipherTypeConfig = new Map(<[ICipherType, any][]>[
    [
        ICipherType.None,
        {
            title: "None",
            id: "none",
            equiv: []
        }
    ],
    [
        ICipherType.Affine,
        { title: "Affine", id: "affine", equiv: [ICipherType.Affine] }
    ],
    [
        ICipherType.Amsco,
        /* Not Yet Implemented */ {
            title: "Amsco",
            id: "amsco",
            equiv: [ICipherType.Amsco]
        }
    ],
    [
        ICipherType.Aristocrat,
        {
            title: "Aristocrat",
            id: "aristocrat",
            equiv: [
                ICipherType.Aristocrat,
                ICipherType.Patristocrat,
                ICipherType.Xenocrypt
            ]
        }
    ],
    [
        ICipherType.Atbash,
        {
            title: "Atbash",
            id: "atbash",
            equiv: [ICipherType.Atbash, ICipherType.Caesar]
        }
    ],
    [
        ICipherType.Autokey,
        /* Not Yet Implemented */ {
            title: "Autokey",
            id: "autokey",
            equiv: [ICipherType.Autokey]
        }
    ],
    [
        ICipherType.Baconian,
        { title: "Baconian", id: "baconian", equiv: [ICipherType.Baconian] }
    ],
    [
        ICipherType.Bazeries,
        /* Not Yet Implemented */ {
            title: "Bazeries",
            id: "bazeries",
            equiv: [ICipherType.Bazeries]
        }
    ],
    [
        ICipherType.Beaufort,
        {
            title: "Beaufort",
            id: "beaufort",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta
            ]
        }
    ],
    [
        ICipherType.Bifid,
        /* Not Yet Implemented */ {
            title: "Bifid",
            id: "bifid",
            equiv: [ICipherType.Bifid]
        }
    ],
    [
        ICipherType.Cadenus,
        /* Not Yet Implemented */ {
            title: "Cadenus",
            id: "cadenus",
            equiv: [ICipherType.Cadenus]
        }
    ],
    [
        ICipherType.Caesar,
        {
            title: "Caesar",
            id: "caesar",
            equiv: [ICipherType.Atbash, ICipherType.Caesar]
        }
    ],
    [
        ICipherType.Checkerboard,
        {
            title: "Checkerboard",
            id: "checkerboard",
            equiv: [ICipherType.Checkerboard]
        }
    ],
    [
        ICipherType.CMBifid,
        /* Not Yet Implemented */ {
            title: "Cm Bifid",
            id: "cmbifid",
            equiv: [ICipherType.CMBifid]
        }
    ],
    [
        ICipherType.CompleteColumnar,
        {
            title: "Complete Columnar",
            id: "compcolumnar",
            equiv: [ICipherType.CompleteColumnar]
        }
    ],
    [
        ICipherType.Condi,
        /* Not Yet Implemented */ {
            title: "Condi",
            id: "condi",
            equiv: [ICipherType.Condi]
        }
    ],
    [
        ICipherType.Counter,
        { title: "Counter", id: "counter", equiv: [ICipherType.Counter] }
    ],
    [
        ICipherType.Cryptarithm,
        {
            title: "Cryptarithm",
            id: "cryptarithm",
            equiv: [ICipherType.Cryptarithm]
        }
    ],
    [
        ICipherType.Digrafid,
        /* Not Yet Implemented */ {
            title: "Digrafid",
            id: "digrafid",
            equiv: [ICipherType.Digrafid]
        }
    ],
    [
        ICipherType.Foursquare,
        /* Not Yet Implemented */ {
            title: "Foursquare",
            id: "foursquare",
            equiv: [ICipherType.Foursquare]
        }
    ],
    [
        ICipherType.FractionatedMorse,
        {
            title: "Fractionated Morse",
            id: "fractionatedmorse",
            equiv: [ICipherType.FractionatedMorse]
        }
    ],
    [
        ICipherType.Grandpre,
        /* Not Yet Implemented */ {
            title: "Grandpr&eacute;",
            id: "grandpre",
            equiv: [ICipherType.Grandpre]
        }
    ],
    [
        ICipherType.Grille,
        /* Not Yet Implemented */ {
            title: "Grille",
            id: "grille",
            equiv: [ICipherType.Grille]
        }
    ],
    [
        ICipherType.Gromark,
        { title: "Gromark", id: "gromark", equiv: [ICipherType.Gromark] }
    ],
    [
        ICipherType.Gronsfeld,
        {
            title: "Gronsfeld",
            id: "gronsfeld",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta
            ]
        }
    ],
    [
        ICipherType.Headlines,
        /* Not Yet Implemented */ {
            title: "Headlines",
            id: "headlines",
            equiv: [ICipherType.Headlines]
        }
    ],
    [
        ICipherType.Hill,
        { title: "Hill", id: "hill", equiv: [ICipherType.Hill] }
    ],
    [
        ICipherType.Homophonic,
        {
            title: "Homophonic",
            id: "homophonic",
            equiv: [ICipherType.Homophonic]
        }
    ],
    [
        ICipherType.IncompleteColumnar,
        {
            title: "Incomplete Columnar",
            id: "inccolumnar",
            equiv: [ICipherType.IncompleteColumnar]
        }
    ],
    [
        ICipherType.InterruptedKey,
        /* Not Yet Implemented */ {
            title: "Interrupted Key",
            id: "interruptedkey",
            equiv: [ICipherType.InterruptedKey]
        }
    ],
    [
        ICipherType.KeyPhrase,
        /* Not Yet Implemented */ {
            title: "Key Phrase",
            id: "keyphrase",
            equiv: [ICipherType.KeyPhrase]
        }
    ],
    [
        ICipherType.MonomeDinome,
        /* Not Yet Implemented */ {
            title: "Monome-Dinome",
            id: "monomedinome",
            equiv: [ICipherType.MonomeDinome]
        }
    ],
    [
        ICipherType.Morbit,
        { title: "Morbit", id: "morbit", equiv: [ICipherType.Morbit] }
    ],
    [
        ICipherType.Myszkowski,
        /* Not Yet Implemented */ {
            title: "Myszkowski",
            id: "myszkowski",
            equiv: [ICipherType.Myszkowski]
        }
    ],
    [
        ICipherType.Nicodemus,
        /* Not Yet Implemented */ {
            title: "Nicodemus",
            id: "nicodemus",
            equiv: [ICipherType.Nicodemus]
        }
    ],
    [
        ICipherType.NihilistSubstitution,
        /* Not Yet Implemented */ {
            title: "Nihilist Substitution",
            id: "nihilistsub",
            equiv: [ICipherType.NihilistSubstitution]
        }
    ],
    [
        ICipherType.NihilistTransposition,
        /* Not Yet Implemented */ {
            title: "Nihilist Transposition",
            id: "nihilisttrans",
            equiv: [ICipherType.NihilistTransposition]
        }
    ],
    [
        ICipherType.Null,
        /* Not Yet Implemented */ {
            title: "Null",
            id: "null",
            equiv: [ICipherType.Null]
        }
    ],
    [
        ICipherType.NumberedKey,
        /* Not Yet Implemented */ {
            title: "Numbered Key",
            id: "numberedkey",
            equiv: [ICipherType.NumberedKey]
        }
    ],
    [
        ICipherType.Patristocrat,
        {
            title: "Patristocrat",
            id: "patristocrat",
            equiv: [
                ICipherType.Aristocrat,
                ICipherType.Patristocrat,
                ICipherType.Xenocrypt
            ]
        }
    ],
    [
        ICipherType.PeriodicGromark,
        /* Not Yet Implemented */ {
            title: "Periodic Gromark",
            id: "periodicgromark",
            equiv: [ICipherType.PeriodicGromark]
        }
    ],
    [
        ICipherType.PigPen,
        {
            title: "PigPen/Masonic",
            id: "pigpen",
            equiv: [ICipherType.PigPen]
        }
    ],
    [
        ICipherType.Phillips,
        /* Not Yet Implemented */ {
            title: "Phillips",
            id: "phillips",
            equiv: [ICipherType.Phillips]
        }
    ],
    [
        ICipherType.PhillipsRC,
        /* Not Yet Implemented */ {
            title: "Phillips-Rc",
            id: "phillipsrc",
            equiv: [ICipherType.PhillipsRC]
        }
    ],
    [
        ICipherType.Playfair,
        /* Not Yet Implemented */ {
            title: "Playfair",
            id: "playfair",
            equiv: [ICipherType.Playfair]
        }
    ],
    [
        ICipherType.Pollux,
        /* Not Yet Implemented */ {
            title: "Pollux",
            id: "pollux",
            equiv: [ICipherType.Pollux]
        }
    ],
    [
        ICipherType.Porta,
        {
            title: "Porta",
            id: "porta",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta
            ]
        }
    ],
    [
        ICipherType.Portax,
        /* Not Yet Implemented */ {
            title: "Portax",
            id: "portax",
            equiv: [ICipherType.Portax]
        }
    ],
    [
        ICipherType.ProgressiveKey,
        /* Not Yet Implemented */ {
            title: "Progressive Key",
            id: "progressivekey",
            equiv: [ICipherType.ProgressiveKey]
        }
    ],
    [
        ICipherType.QuagmireI,
        /* Not Yet Implemented */ {
            title: "Quagmire &#8544;",
            id: "quagmirei",
            equiv: [ICipherType.QuagmireI]
        }
    ],
    [
        ICipherType.QuagmireII,
        /* Not Yet Implemented */ {
            title: "Quagmire &#8545;",
            id: "quagmireii",
            equiv: [ICipherType.QuagmireII]
        }
    ],
    [
        ICipherType.QuagmireIII,
        /* Not Yet Implemented */ {
            title: "Quagmire &#8546;",
            id: "quagmireiii",
            equiv: [ICipherType.QuagmireIII]
        }
    ],
    [
        ICipherType.QuagmireIV,
        /* Not Yet Implemented */ {
            title: "Quagmire &#8547;",
            id: "quagmireiv",
            equiv: [ICipherType.QuagmireIV]
        }
    ],
    [
        ICipherType.Ragbaby,
        { title: "Ragbaby", id: "ragbaby", equiv: [ICipherType.Ragbaby] }
    ],
    [
        ICipherType.Railfence,
        {
            title: "Railfence",
            id: "railfence",
            equiv: [ICipherType.Railfence, ICipherType.Redefence]
        }
    ],
    [
        ICipherType.Redefence,
        {
            title: "Redefence",
            id: "redefence",
            equiv: [ICipherType.Railfence, ICipherType.Redefence]
        }
    ],
    [
        ICipherType.RouteTransposition,
        /* Not Yet Implemented */ {
            title: "Route Transposition",
            id: "routetransp",
            equiv: [ICipherType.RouteTransposition]
        }
    ],
    [ICipherType.RSA, { title: "RSA", id: "rsa", equiv: [ICipherType.RSA] }],
    [
        ICipherType.RunningKey,
        {
            title: "Running Key",
            id: "runningkey",
            equiv: [ICipherType.RunningKey, ICipherType.Vigenere]
        }
    ],
    [
        ICipherType.SequenceTransposition,
        /* Not Yet Implemented */ {
            title: "Sequence Transposition",
            id: "sequencetransposition",
            equiv: [ICipherType.SequenceTransposition]
        }
    ],
    [
        ICipherType.SeriatedPlayfair,
        /* Not Yet Implemented */ {
            title: "Seriated Playfair",
            id: "seriatedplayfair",
            equiv: [ICipherType.SeriatedPlayfair]
        }
    ],
    [
        ICipherType.Slidefair,
        /* Not Yet Implemented */ {
            title: "Slidefair",
            id: "slidefair",
            equiv: [ICipherType.Slidefair]
        }
    ],
    [
        ICipherType.Standard,
        {
            title: "Standard",
            id: "standard",
            equiv: [
                ICipherType.Aristocrat,
                ICipherType.Patristocrat,
                ICipherType.Xenocrypt
            ]
        }
    ],
    [
        ICipherType.Swagman,
        /* Not Yet Implemented */ {
            title: "Swagman",
            id: "swagman",
            equiv: [ICipherType.Swagman]
        }
    ],
    [
        ICipherType.Syllabary,
        /* Not Yet Implemented */ {
            title: "Syllabary",
            id: "syllabary",
            equiv: [ICipherType.Syllabary]
        }
    ],
    [
        ICipherType.TapCode,
        {
            title: "Tap Code",
            id: "tapcode",
            equiv: [ICipherType.TapCode]
        }
    ],
    [
        ICipherType.Test,
        /* Not Yet Implemented */ {
            title: "Test",
            id: "test",
            equiv: [ICipherType.Test]
        }
    ],
    [
        ICipherType.Tridigital,
        /* Not Yet Implemented */ {
            title: "Tridigital",
            id: "tridigital",
            equiv: [ICipherType.Tridigital]
        }
    ],
    [
        ICipherType.Trifid,
        /* Not Yet Implemented */ {
            title: "Trifid",
            id: "trifid",
            equiv: [ICipherType.Trifid]
        }
    ],
    [
        ICipherType.TriSquare,
        /* Not Yet Implemented */ {
            title: "Tri-Square",
            id: "trisquare",
            equiv: [ICipherType.TriSquare]
        }
    ],
    [
        ICipherType.TwinBifid,
        /* Not Yet Implemented */ {
            title: "Twin Bifid",
            id: "twinbifid",
            equiv: [ICipherType.TwinBifid]
        }
    ],
    [
        ICipherType.TwinTrifid,
        /* Not Yet Implemented */ {
            title: "Twin Trifid",
            id: "twintrifid",
            equiv: [ICipherType.TwinTrifid]
        }
    ],
    [
        ICipherType.TwoSquare,
        /* Not Yet Implemented */ {
            title: "Two-Square",
            id: "twosquare",
            equiv: [ICipherType.TwoSquare]
        }
    ],
    [
        ICipherType.Variant,
        {
            title: "Variant",
            id: "variant",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta
            ]
        }
    ],
    [
        ICipherType.Vigenere,
        {
            title: "Vigen&egrave;re",
            id: "vigenere",
            equiv: [
                ICipherType.Vigenere,
                ICipherType.Variant,
                ICipherType.Beaufort,
                ICipherType.Gronsfeld,
                ICipherType.Porta
            ]
        }
    ],
    [
        ICipherType.Xenocrypt,
        {
            title: "Xenocrypt",
            id: "xenocrypt",
            equiv: [
                ICipherType.Aristocrat,
                ICipherType.Patristocrat,
                ICipherType.Xenocrypt
            ]
        }
    ]
]);
/**
 * Gets the default title for a cipher type
 */
export function getCipherTitle(ciphertype: ICipherType): string {
    let config = cipherTypeConfig.get(ciphertype);
    let title = "NOT_FOUND";
    if (config !== undefined && config.title !== undefined) {
        title = config.title;
    }
    return title;
}
/**
 * Gets all ciphers which are considered equivalent for this cipher type
 * Used by the editors to determine what they can load
 */
export function getCipherEquivalents(cipherType: ICipherType): ICipherType[] {
    let config = cipherTypeConfig.get(cipherType);
    let result = [];
    if (config !== undefined && config.equiv !== undefined) {
        result = config.equiv;
    }
    if (result.indexOf(cipherType) === -1) {
        result.push(cipherType);
    }
    return result;
}
/**
 * Generates a radio button to be used for selecting the type of Cipher
 */
export function CipherTypeButtonItem(
    cipherType: ICipherType
): JTRadioButtonItem {
    let config = cipherTypeConfig.get(cipherType);
    let res: JTRadioButtonItem = {
        value: cipherType,
        title: config.title,
        id: config.id
    };
    return res;
}
