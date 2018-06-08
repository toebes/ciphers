"use strict";
/// <reference types="ciphertypes" />
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Base class for all the Cipher Encoders/Decoders
 */
var CipherHandler = /** @class */ (function () {
    function CipherHandler() {
        /**
         * User visible mapping of names of the various languages supported
         * @type {StringMap} Mapping of language to visible name
         */
        this.langmap = {
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
        };
        /**
         * This maps which characters are legal in a cipher for a given language
         * @type {StringMap} Mapping of legal characters
        */
        this.langcharset = {
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
        };
        /**
         * Character replacement for purposes of encoding
         */
        this.langreplace = {
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
        };
        /**
         * This maps which characters are to be used when encoding an ACA cipher
         */
        this.acalangcharset = {
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
        };
        /**
         * This maps which characters are to be encoded to for an ACA cipher
         */
        this.encodingcharset = {
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
        };
        /**
         * Character replacement for purposes of encoding
         */
        this.acalangreplace = {
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
        };
        /**
         * Language character frequency
         */
        this.langfreq = {
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
        };
        this.testStrings = [];
        this.cipherWidth = 1;
        this.charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.sourcecharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.unasigned = "";
        this.replacement = [];
        this.curlang = "";
        this.holdupdates = false;
        /**
         * The maximum number of characters to
         * be shown on an encoded line so that it can be readily pasted into a test
         */
        this.maxEncodeWidth = 53;
        /**
         * Output the reverse replacement row in the frequency table
         */
        this.ShowRevReplace = true;
        /**
         * Input string cleaned up
         */
        this.encodedString = "";
        this.Frequent = {};
        this.freq = {};
    }
    /**
     * Initializes the encoder/decoder.
     * We don't want to show the reverse replacement since we are doing an encode
     * @param {string} lang Language to select (EN is the default)
     */
    CipherHandler.prototype.init = function (lang) {
        this.curlang = lang;
    };
    /**
     * Generates an HTML representation of a string for display
     * @param {string} str String to process
     */
    CipherHandler.prototype.normalizeHTML = function (str) {
        return str;
    };
    /**
     * Creates an HTML table to display the frequency of characters
     * @returns {JQuery<HTMLElement} HTML to put into a DOM element
     */
    CipherHandler.prototype.createFreqEditTable = function () {
        var table = $('<table/>').addClass("tfreq dragcol");
        var thead = $('<thead/>');
        var tbody = $('<tbody/>');
        var headrow = $('<tr/>');
        var freqrow = $('<tr/>');
        var replrow = $('<tr/>');
        var altreprow = $('<tr/>');
        var i, len;
        var charset = this.getSourceCharset();
        headrow.append($('<th/>').addClass("topleft"));
        freqrow.append($('<th/>').text("Frequency"));
        replrow.append($('<th/>').text("Replacement"));
        altreprow.append($('<th/>').text("Rev Replace"));
        for (i = 0, len = charset.length; i < len; i++) {
            var c = charset.substr(i, 1).toUpperCase();
            headrow.append($('<th/>').text(c));
            freqrow.append($('<td id="f' + c + '"/>'));
            var td = $('<td/>');
            td.append(this.makeFreqEditField(c));
            replrow.append(td);
            altreprow.append($('<td id="rf' + c + '"/>'));
        }
        thead.append(headrow);
        tbody.append(freqrow);
        tbody.append(replrow);
        if (this.ShowRevReplace) {
            tbody.append(altreprow);
        }
        table.append(thead);
        table.append(tbody);
        return table;
    };
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    CipherHandler.prototype.load = function () {
    };
    /**
     * Loads new data into a solver, resetting any solving matches made
     */
    CipherHandler.prototype.reset = function () {
    };
    /**
     * Builds ??
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    CipherHandler.prototype.build = function (str) {
        return null;
    };
    /**
     * Create an edit field for a dropdown
     * @param {string} str character to generate dropdown for
     * @returns {string} HTML of dropdown
     */
    CipherHandler.prototype.makeFreqEditField = function (c) {
        return null;
    };
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {number} val This is which element we are changing it to.  This is an index into the morbitReplaces table
     */
    CipherHandler.prototype.updateSel = function (item, val) {
    };
    /**
     * @returns {Object.<string, string>}
     */
    CipherHandler.prototype.getMorseMap = function () {
        return null;
    };
    /**
     * Assign a new value for an entry
     * @param {string} entry Character to be updated
     * @param {string} val New value to associate with the character
     */
    CipherHandler.prototype.setMorseMapEntry = function (entry, val) {
    };
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
    CipherHandler.prototype.setChar = function (repchar, newchar) {
        console.log("handler setChar data-char=" + repchar + ' newchar=' + newchar);
        this.replacement[repchar] = newchar;
        $("input[data-char='" + repchar + "']").val(newchar);
        if (newchar === '') {
            newchar = '?';
        }
        $("span[data-char='" + repchar + "']").text(newchar);
        this.cacheReplacements();
        this.updateMatchDropdowns(repchar);
    };
    /**
     * Change multiple characters at once.
     * @param {string} reqstr String of items to apply
     */
    CipherHandler.prototype.setMultiChars = function (reqstr) {
    };
    /**
     *
     * @param {string} reqstr String of items to apply
     */
    CipherHandler.prototype.updateMatchDropdowns = function (reqstr) {
    };
    /**
     * Locate a string
     * @param {string} str string to look for
     */
    CipherHandler.prototype.findPossible = function (str) {
    };
    /**
     * Eliminate the non displayable characters and replace them with a space
     * @param {string} str String to clean up
     * @returns {string} String with no spaces in it
     */
    CipherHandler.prototype.cleanString = function (str) {
        var pattern = "[\r\n ]+";
        var re = new RegExp(pattern, "g");
        str.replace(re, " ");
        return str;
    };
    /**
     * Eliminate all characters which are not in the charset
     * @param {string} str String to clean up
     * @returns {string} Result string with only characters in the legal characterset
     */
    CipherHandler.prototype.minimizeString = function (str) {
        var res = '';
        for (var i = 0, len = str.length; i < len; i++) {
            var c = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(c)) {
                res += c;
            }
        }
        return res;
    };
    /**
     * Convert the text to chunks of (chunkSize) characters separated
     * by a space.  Just keep characters that are in the character set and
     * remove all punctuation, etc.
     * Note: the string could be toUpperCase()'d here, but it is done later.
     * @returns chunked input string
     */
    CipherHandler.prototype.chunk = function (inputString, chunkSize) {
        var chunkIndex = 1;
        var charset = this.getCharset();
        var chunkedString = '';
        var inputStringLen = inputString.length;
        for (var i = 0; i < inputStringLen; i++) {
            // Skip anthing that is not in the character set (i.e spaces,
            // punctuation, etc.)
            if (charset.indexOf(inputString.charAt(i).toUpperCase()) < 0) {
                continue;
            }
            // Test for a chunk boundary using modulo of chunk size.
            if (chunkIndex % (chunkSize + 1) === 0) {
                chunkedString += ' ';
                chunkIndex = 1;
            }
            // Store the character in the chunk representation.
            chunkedString += inputString.charAt(i);
            chunkIndex++;
        }
        return chunkedString;
    };
    /** @description Sets the character set used by the Decoder.
     * @param {string} charset the set of characters to be used.
     */
    CipherHandler.prototype.setCharset = function (charset) {
        this.charset = charset;
    };
    CipherHandler.prototype.isValidChar = function (char) {
        return this.charset.indexOf(char) >= 0;
    };
    CipherHandler.prototype.getCharset = function () {
        return this.charset;
    };
    /**
     * Gets the character set to be use for encoding.
     * @param {string} charset the set of characters to be used.
     */
    CipherHandler.prototype.getSourceCharset = function () {
        return this.sourcecharset;
    };
    /**
     * Sets the character set to be use for encoding.
     * @param {string} charset the set of characters to be used.
     */
    CipherHandler.prototype.setSourceCharset = function (charset) {
        this.sourcecharset = charset;
    };
    /**
     * Update the frequency table on the page.  This is done after loaading
     * a new cipher to encode or decode
     */
    CipherHandler.prototype.UpdateFreqEditTable = function () {
        var tool = this;
        $(".freq").each(function (i) {
            $(this).empty().append(tool.createFreqEditTable());
        });
        this.attachHandlers();
    };
    /**
     *
     * @param {*string} string String to compute value for
     * @returns {number} Value calculated
     */
    CipherHandler.prototype.CalculateChiSquare = function (str) {
        var charset = this.getCharset();
        var i, len;
        len = charset.length;
        var counts = new Array(len);
        var total = 0;
        for (i = 0; i < len; i++) {
            counts[i] = 0;
        }
        for (i = 0; i < str.length; i++) {
            var c = str.substr(i, 1).toUpperCase();
            var pos = charset.indexOf(c);
            if (pos >= 0) {
                counts[pos]++;
                total++;
            }
        }
        var chiSquare = 0.0;
        for (i = 0; i < len; i++) {
            var c = charset.substr(i, 1);
            var expected = this.langfreq[this.curlang][c];
            if (expected !== undefined && expected !== 0) {
                chiSquare += Math.pow(counts[i] - total * expected, 2) / (total * expected);
            }
        }
        return chiSquare;
    };
    /**
     * Analyze the encoded text
     * @param {string} encoded
     * @param {number} width
     * @param {number} num
     */
    CipherHandler.prototype.analyze = function (encoded) {
        return null;
    };
    /**
    * Fills in the frequency portion of the frequency table
    */
    CipherHandler.prototype.displayFreq = function () {
        var charset = this.getCharset();
        var c, i, len;
        this.holdupdates = true;
        for (c in this.freq) {
            if (this.freq.hasOwnProperty(c)) {
                var subval = String(this.freq[c]);
                if (subval === '0') {
                    subval = '';
                }
                $('#f' + c).text(subval);
            }
        }
        // Replicate all of the previously set values.  This is done when
        // you change the spacing in the encoded text and then do a reload.
        if (this.ShowRevReplace) {
            for (i = 0, len = charset.length; i < len; i++) {
                c = charset.substr(i, 1);
                var repl = $('#m' + c).val();
                if (repl === '') {
                    repl = $('#m' + c).html();
                }
                this.setChar(c, repl);
            }
        }
        this.holdupdates = false;
        this.updateMatchDropdowns('');
    };
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    CipherHandler.prototype.attachHandlers = function () {
        var tool = this;
        $(".sli").keyup(function (event) {
            var newchar;
            var repchar = $(event.target).attr('data-char');
            var current, next;
            var focusables = $(".sli");
            if (event.keyCode === 37) { // left
                current = focusables.index(event.target);
                if (current === 0) {
                    next = focusables.last();
                }
                else {
                    next = focusables.eq(current - 1);
                }
                next.focus();
            }
            else if (event.keyCode === 39) { // right
                current = focusables.index(event.target);
                next = focusables.eq(current + 1).length ? focusables.eq(current + 1) : focusables.eq(0);
                next.focus();
            }
            else if (event.keyCode === 46 || event.keyCode === 8) {
                tool.setChar(repchar, '');
            }
            event.preventDefault();
        }).keypress(function (event) {
            var newchar;
            var repchar = $(event.target).attr('data-char');
            var current, next;
            var focusables = $(".sli");
            if (typeof event.key === 'undefined') {
                newchar = String.fromCharCode(event.keyCode).toUpperCase();
            }
            else {
                newchar = event.key.toUpperCase();
            }
            if (tool.isValidChar(newchar) || newchar === ' ') {
                if (newchar === ' ') {
                    newchar = '';
                }
                console.log('Setting ' + repchar + ' to ' + newchar);
                tool.setChar(repchar, newchar);
                current = focusables.index(event.target);
                next = focusables.eq(current + 1).length ? focusables.eq(current + 1) : focusables.eq(0);
                next.focus();
            }
            else {
                console.log('Not valid:' + newchar);
            }
            event.preventDefault();
        }).blur(function () {
            var tohighlight = $(this).attr('data-char');
            $("[data-char='" + tohighlight + "']").removeClass("allfocus");
            var althighlight = $(this).attr('data-schar');
            if (althighlight !== '') {
                $("[data-schar='" + althighlight + "']").removeClass("allfocus");
            }
            $(this).removeClass("focus");
        }).focus(function () {
            var tohighlight = $(this).attr('data-char');
            $("[data-char='" + tohighlight + "']").addClass("allfocus");
            var althighlight = $(this).attr('data-schar');
            if (althighlight !== '') {
                $("[data-schar='" + althighlight + "']").addClass("allfocus");
            }
            $(this).addClass("focus");
        });
        $(".dragcol").each(function (i) {
            if (!$.fn.dataTable.isDataTable(".dragcol")) {
                $(this).DataTable({ colReorder: true, ordering: false, dom: 't' });
            }
        });
        $(".msli").on('change', function () {
            var toupdate = $(this).attr('data-char');
            tool.updateSel(toupdate, this.value);
        });
        $(".spin").spinner({
            spin: function (event, ui) {
                if (ui.value >= tool.getCharset().length) {
                    $(this).spinner("value", 0);
                    return false;
                }
                else if (ui.value < 0) {
                    $(this).spinner("value", tool.getCharset().length - 1);
                    return false;
                }
            }
        });
        $('.richtext').summernote({
            fontNames: ['Arial', 'Courier New'],
            toolbar: [
                ['style', ['bold', 'italic', 'underline', 'clear']],
                ['font', ['fontname', 'superscript', 'subscript']],
                ['fontsize', ['fontsize']],
            ]
        });
    };
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
    CipherHandler.prototype.genReplPattern = function (str) {
        var i, len;
        var res = [];
        for (i = 0, len = str.length; i < len; i++) {
            var c = str.substr(i, 1);
            res.push(this.replacement[c]);
        }
        return res;
    };
    /**
     * @param {string} str String to check
     * @param {Array.<string>} repl Replacement characters which are pre-known
     * @param {BoolMap} used Array of flags whether a character is already known to be used
     * @returns {bool} True/false if the string is a valid replacement
     */
    CipherHandler.prototype.isValidReplacement = function (str, repl, used) {
        var i, len;
        //   console.log(str);
        for (i = 0, len = str.length; i < len; i++) {
            var c = str.substr(i, 1);
            if (repl[i] !== '') {
                if (c !== repl[i]) {
                    //             console.log('No match c=' + c + ' repl[' + i + ']=' + repl[i]);
                    return false;
                }
            }
            else if (used[c]) {
                //          console.log('No match c=' + c + ' used[c]=' + used[c]);
                return false;
            }
        }
        return true;
    };
    /**
     * Set flag to 'chunk' input data string befre encoding.  Used in Patristocrat,
     */
    CipherHandler.prototype.setCipherType = function (cipherType) {
        this.attachHandlers();
    };
    /**
     * @param {string} str String to be enqoted
     * @return {string} Quoted string
     */
    CipherHandler.prototype.quote = function (str) {
        if (typeof str === 'undefined') {
            return '\'\'';
        }
        return '\'' + str.replace(/(['"])/g, "\\$1") + '\'';
    };
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
    CipherHandler.prototype.makeUniquePattern = function (str, width) {
        var cmap = {};
        var res = '';
        var mapval = 0;
        var i, len, c;
        len = str.length;
        // In case they give us an odd length string, just padd it with enough Xs
        str += 'XXXX';
        for (i = 0; i < len; i += width) {
            c = str.substr(i, width);
            if (typeof cmap[c] === 'undefined') {
                cmap[c] = '' + mapval;
                mapval++;
            }
            res += cmap[c];
        }
        return res;
    };
    /**
     * @param {string} lang 2 character Language to dump language template for
     */
    CipherHandler.prototype.dumpLang = function (lang) {
        var res = '';
        var extra = '';
        res = 'cipherTool.Frequent[' + this.quote(lang) + ']={';
        for (var pat in this.Frequent[lang]) {
            if (this.Frequent[lang].hasOwnProperty(pat) && pat !== '') {
                res += extra + '\'' + pat + '\':[';
                var i = void 0, len = void 0;
                var extra1 = '';
                var matches = this.Frequent[lang][pat];
                for (i = 0, len = matches.length; i < len; i++) {
                    //console.log(matches[i]);
                    res += extra1 +
                        '[' + this.quote(matches[i][0]) + ',' +
                        matches[i][1] + ',' +
                        matches[i][2] + ',' +
                        matches[i][3] + ']';
                    extra1 = ',';
                }
                res += ']';
                extra = ',';
            }
        }
        res += '};';
        return res;
    };
    /**
     * Fills in the language choices on an HTML Select
     * @param lselect HTML Element to populate
     */
    CipherHandler.prototype.setLangDropdown = function (lselect) {
        lselect.empty().append($("<option />", { value: '' }).text('--Select a language--'));
        for (var lang in this.langmap) {
            if (this.langmap.hasOwnProperty(lang)) {
                $("<option />", { value: lang }).text(this.langmap[lang]).appendTo(lselect);
            }
        }
        var tool = this;
        lselect.change(function () {
            tool.loadLanguage($(this).val());
        });
    };
    /**
     * Loads a language in response to a dropdown event
     * @param lang Language to load
     */
    CipherHandler.prototype.loadLanguage = function (lang) {
        var tool = this;
        tool.curlang = lang;
        tool.setCharset(tool.langcharset[lang]);
        $(".langstatus").text("Attempting to load " + tool.langmap[lang] + '...');
        $.getScript("Languages/" + lang + ".js", function (data, textStatus, jqxhr) {
            $(".langstatus").text('');
            tool.updateMatchDropdowns('');
        }).fail(function (jqxhr, settings, exception) {
            console.log("Complied language file not found for " + lang + ".js");
            tool.loadRawLanguage(lang);
        });
    };
    /**
     * Loads a raw language from the server
     * @param lang Language to load (2 character abbreviation)
     */
    CipherHandler.prototype.loadRawLanguage = function (lang) {
        var tool = this;
        var jqxhr = $.get("Languages/" + lang + ".txt", function () {
        }).done(function (data) {
            // Empty out all the frequent words
            $(".langstatus").text("Processing " + tool.langmap[lang] + '...');
            tool.Frequent[lang] = {};
            tool.curlang = lang;
            var charset = tool.langcharset[lang];
            var langreplace = tool.langreplace[lang];
            tool.setCharset(charset);
            var lines = data.split("\n");
            var i, len;
            len = lines.length;
            charset = charset.toUpperCase();
            for (i = 0; i < len; i++) {
                var pieces = lines[i].replace(/\r/g, ' ').toUpperCase().split(/ /);
                // Make sure that all the characters in the pieces are valid
                // for this character set.  Otherwise we can throw it away
                var legal = true;
                for (var j = 0; j < pieces[0].length; j++) {
                    if (charset.indexOf(pieces[0][j]) < 0) {
                        if (typeof langreplace[pieces[0][j]] === 'undefined') {
                            console.log("skipping out on " + pieces[0] + " for " + pieces[0][j] + " against " + charset);
                            legal = false;
                            break;
                        }
                        pieces[0] = pieces[0].replace(pieces[0][j], langreplace[pieces[0][j]]);
                    }
                }
                if (legal) {
                    var pat = tool.makeUniquePattern(pieces[0], 1);
                    var elem = [
                        pieces[0].toUpperCase(),
                        i,
                        pieces[1],
                        '',
                    ];
                    if (i < 500) {
                        elem[3] = 0;
                    }
                    else if (i < 1000) {
                        elem[3] = 1;
                    }
                    else if (i < 2000) {
                        elem[3] = 3;
                    }
                    else if (i < 5000) {
                        elem[3] = 4;
                    }
                    else {
                        elem[3] = 5;
                    }
                    if (typeof tool.Frequent[lang][pat] === 'undefined') {
                        tool.Frequent[lang][pat] = [];
                    }
                    tool.Frequent[lang][pat].push(elem);
                }
            }
            // console.log(tool.Frequent);
            $(".langout").each(function () {
                $(".langstatus").text('Dumping ' + tool.langmap[lang] + '...');
                $(this).text(tool.dumpLang(lang));
            });
            $(".langstatus").text('');
            tool.updateMatchDropdowns('');
        });
        $(".langstatus").text("Loading " + this.langmap[lang] + '...');
    };
    /**
     * Retrieve all of the replacement characters that have been selected so far
     */
    CipherHandler.prototype.cacheReplacements = function () {
        var charset = this.getSourceCharset().toUpperCase();
        for (var i = 0, len = charset.length; i < len; i++) {
            var c = charset.substr(i, 1);
            var repl = $('#m' + c).val();
            // When we are doing an encode, there are no input fields, everything
            // is in a text field so we need to check for that case and retrieve
            // the text value instead
            if (repl === '') {
                repl = $('#m' + c).text();
            }
            this.replacement[c] = repl;
            $('#rf' + repl).text(c);
        }
    };
    /**
     * Apply any fixed replacement characters to a given unique string. For example, if the input
     * string was "01232" and the repl string was " HE E" then the output would be "0HE3E"
     * NOTE: Is this used anymore?
     * @param {string} str Input string to apply the replacement characters to
     * @param {string} repl Replacement characters.  Any non blank character replaces the corresponding character in the input string
     * @returns {string} Comparable replacement string
     */
    CipherHandler.prototype.applyReplPattern = function (str, repl) {
        var i, len;
        var res = '';
        len = str.length;
        for (i = 0; i < len; i++) {
            var c = repl.substr(i, 1);
            if (c === ' ') {
                c = str.substr(i, 1);
            }
            res += c;
        }
        return res;
    };
    return CipherHandler;
}());
exports.default = CipherHandler;
