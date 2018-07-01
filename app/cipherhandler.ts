/// <reference types="ciphertypes" />



type JQElement = JQuery<HTMLElement>
/**
 * Base class for all the Cipher Encoders/Decoders
 */
export default
    class CipherHandler {
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

    testStrings: string[] = [
    ]
    cipherWidth: number = 1
    charset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    sourcecharset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    unasigned: string = ""
    replacement: string[] = []
    curlang: string = ""
    holdupdates: boolean = false
    /** Stack of current Undo/Redo operations */
    undoStack: SaveSet[] = []
    /** Where we are in the undo stack */
    undoPosition: number = 0
    /**
     * The maximum number of characters to
     * be shown on an encoded line so that it can be readily pasted into a test
     */
    maxEncodeWidth: number = 53
    /**
     * Output the reverse replacement row in the frequency table
     */
    ShowRevReplace: boolean = true
    /**
     * Input string cleaned up
     */
    encodedString: string = ""
    Frequent: any = {}
    freq: { [key: string]: number } = {}
    /**
     * Initializes the encoder/decoder.
     * We don't want to show the reverse replacement since we are doing an encode
     * @param {string} lang Language to select (EN is the default)
     */
    init(lang: string): void {
        this.curlang = lang
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
        let table = $('<table/>').addClass("tfreq dragcol")
        let thead = $('<thead/>')
        let tbody = $('<tbody/>')
        let headrow = $('<tr/>')
        let freqrow = $('<tr/>')
        let replrow = $('<tr/>')
        let altreprow = $('<tr/>')
        let charset = this.getSourceCharset()

        headrow.append($('<th/>').addClass("topleft"))
        freqrow.append($('<th/>').text("Frequency"))
        replrow.append($('<th/>').text("Replacement"))
        altreprow.append($('<th/>').text("Rev Replace"))
        for (let i = 0, len = charset.length; i < len; i++) {
            let c = charset.substr(i, 1).toUpperCase()
            headrow.append($('<th/>').text(c))
            freqrow.append($('<td id="f' + c + '"/>'))
            let td = $('<td/>')
            td.append(this.makeFreqEditField(c))
            replrow.append(td)
            altreprow.append($('<td id="rf' + c + '"/>'))
        }
        thead.append(headrow)
        tbody.append(freqrow)
        tbody.append(replrow)
        if (this.ShowRevReplace) {
            tbody.append(altreprow)
        }
        table.append(thead)
        table.append(tbody)

        return table
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
    /**
     * Adds the Undo and Redo command buttons
     */
    addUndoRedo(): JQElement {
        let buttons = $("<div/>")
        buttons.append($("<button/>", { href: "#", class: "undo"}).text("Undo").prop("disabled", true))
        buttons.append($("<button/>", { href: "#", class: "redo"}).text("Redo").prop("disabled", true))
        return buttons
    }
    /**
     * Initializes any layout of the handler.  This is when the solver should initialize any UI globals
     */
    buildCustomUI(): void {
        $(".undocmds").each((i, elem) => {
            $(elem).empty().append(this.addUndoRedo())
        })

    }
    restore(data: SaveSet): void {
    }
    save(): SaveSet {
        return null
    }
    markUndo(): void {
        if (this.undoPosition < this.undoStack.length) {
            // truncate
        }
        this.undoStack.push(this.save())
        this.undoPosition = this.undoStack.length - 1
        $(".undo").button("option","disabled", false)
        $(".redo").button("option","disabled", true)

    }
    unDo(): void {
        if (this.undoPosition > 0) {
            this.undoPosition--
            this.restore(this.undoStack[this.undoPosition])
            $(".redo").button("option", "disabled", false)
            $(".undo").button("option","disabled", (this.undoPosition === 0))
        }
    }
    reDo(): void {
        if (this.undoPosition < this.undoStack.length-1) {
            this.undoPosition++
            this.restore(this.undoStack[this.undoPosition])
            $(".undo").button("option","disabled", false)
            $(".redo").button("option","disabled", (this.undoPosition >= (this.undoStack.length - 1)))
        }
    }
    layout(): void {
        // process the "cipher-type" class
        $(".cipher-type").each((i, elem) => { this.setCipherType($(elem).attr('id')) })
        $(".lang").each((i, elem) => { this.setLangDropdown($(elem)) })
        this.buildCustomUI()
        this.UpdateFreqEditTable()
        this.attachHandlers()
        this.setUIDefaults()
    }

    /**
     * Propagate any default settings to the UI
     */
    setUIDefaults(): void {
    }
    /**
     * Builds ??
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    build(str: string): JQElement {
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
        console.log("handler setChar data-char=" + repchar + " newchar=" + newchar)
        this.replacement[repchar] = newchar
        $("input[data-char='" + repchar + "']").val(newchar)
        if (newchar === "") {
            newchar = "?"
        }
        $("span[data-char='" + repchar + "']").text(newchar)
        this.cacheReplacements()
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
        $(".freq").each((i, elem) => {
            $(elem).empty().append(this.createFreqEditTable())
        })
        this.attachHandlers()
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
            let expected = this.langfreq[this.curlang][c]
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
        $("#load").button().off("click").on("click", () => {
            this.markUndo()
            this.load()
        })
        $(".undo").button().off("click").on("click", () => {
            this.unDo()
        })
        $(".redo").button().off("click").on("click", () => {
            this.reDo()
        })
        $("#reset").button().off("click").on("click", () => {
            this.markUndo()
            this.reset()
        })

        $(".dragcol").each((i, elem) => {
            if (!$.fn.dataTable.isDataTable(".dragcol")) {
                $(elem).DataTable({ colReorder: true, ordering: false, dom: "t" })
            }
        })
        $(".msli").off("change").on("change", (e) => {
            this.markUndo()
            let toupdate = $(e.target).attr("data-char")
            this.updateSel(toupdate, (e.target as HTMLInputElement).value)
        })
        $(".spin").spinner({
            spin: (event, ui) => {
                this.markUndo();
                if (ui.value >= this.getCharset().length) {
                    $(event.target).spinner("value", 0)
                    return false
                } else if (ui.value < 0) {
                    $(event.target).spinner("value", this.getCharset().length - 1)
                    return false
                }
            },
        })
        $(".richtext").summernote({
            fontNames: ["Arial", "Courier New"],
            toolbar: [
                ["style", ["bold", "italic", "underline", "clear"]],
                ["font", ["fontname", "superscript", "subscript"]],
                ["fontsize", ["fontsize"]],
            ],
        })

        $('.sfind').off("input").on("input", (e) => {
            this.markUndo();
            this.findPossible(($(e.target).val() as string))
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
    /**
     * Set flag to "chunk" input data string befre encoding.  Used in Patristocrat,
     */
    public setCipherType(cipherType: string): void {
        this.attachHandlers()
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
    setLangDropdown(lselect: JQElement): void {
        lselect.empty().append($('<option />', { value: "" }).text("--Select a language--"))
        for (let lang in this.langmap) {
            if (this.langmap.hasOwnProperty(lang)) {
                $("<option />", { value: lang }).text(this.langmap[lang]).appendTo(lselect)
            }
        }
        lselect.change((e) => {
            this.loadLanguage($(e.target).val() as string)
        })
    }
    /**
     * Loads a language in response to a dropdown event
     * @param lang Language to load
     */
    loadLanguage(lang: string): void {
        this.curlang = lang
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
            this.curlang = lang
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
                    let elem = [
                        pieces[0].toUpperCase(),
                        i,
                        pieces[1],
                        "",
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
            $(".langout").each((i, elem) => {
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
    cacheReplacements(): void {
        let charset = this.getSourceCharset().toUpperCase()
        for (let c of charset) {
            let repl = $('#m' + c).val() as string
            // when we are doing an encode, there are no input fields, everything
            // is in a text field so we need to check for that case and retrieve
            // the text value instead
            if (repl === "") {
                repl = $('#m' + c).text()
            }
            this.replacement[c] = repl
            $('#rf' + repl).text(c)
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
}
