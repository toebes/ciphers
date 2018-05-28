var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/**
 * CipherEncoder - This class handles all of the actions associated with encoding
 * a cipher.
 */
var CipherEncoder = /** @class */ (function (_super) {
    __extends(CipherEncoder, _super);
    function CipherEncoder() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /**
         * Size of chunks of text to format to.  0 Indicates that the original spacing
         * is to be preserved.  Any other value indicates that spaces are to be removed
         * and the cipher is grouped in clusters of this size
         */
        _this.groupingSize = 0;
        return _this;
    }
    /**
     * Initializes the encoder.
     * We don't want to show the reverse replacement since we are doing an encode
     * @param {string} lang Language to select (EN is the default)
     */
    CipherEncoder.prototype.init = function (lang) {
        //this.ShowRevReplace = false;
        this.curlang = lang;
        this.setCharset(this.acalangcharset[lang]);
        this.setSourceCharset(this.encodingcharset[lang]);
    };
    /**
     * Enable / Disable the HTML elements based on the alphabet selection
     */
    CipherEncoder.prototype.setkvalinputs = function () {
        var val = $('input[name=enctype]:checked').val();
        if (val === 'random') {
            $(".kval").hide();
        }
        else {
            $(".kval").show();
        }
        if (val === 'k3') {
            $(".k3val").show();
        }
        else {
            $(".k3val").hide();
        }
        if (val === 'k4') {
            $(".k4val").show();
        }
        else {
            $(".k4val").hide();
        }
    };
    /**
     * Loads a language in response to a dropdown event
     * @param lang Language to load
     */
    CipherEncoder.prototype.loadLanguage = function (lang) {
        this.curlang = lang;
        this.setCharset(this.acalangcharset[lang]);
        this.setSourceCharset(this.encodingcharset[lang]);
        // Call the super if we plan to match the text against a dictionary.
        // That is generally used for a solver, but we might want to do it in the
        // case that we want to analyze the complexity of the phrase
        // super.loadLanguage(lang) 
    };
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    CipherEncoder.prototype.attachHandlers = function () {
        var tool = this;
        $('input[type=radio][name=enctype]').change(function () {
            tool.setkvalinputs();
        });
        tool.setkvalinputs();
        _super.prototype.attachHandlers.call(this);
    };
    /**
     * Set chunking size for input data string befre encoding.
     * Primarily Used in Patristocrat, but could be used for other types to indicate the period
     */
    CipherEncoder.prototype.setCipherType = function (cipherType) {
        if (cipherType == 'patristocrat') {
            this.groupingSize = 5;
        }
        this.attachHandlers();
    };
    /**
     * Generate the maping from the source to the destination alphabet
     */
    CipherEncoder.prototype.genMap = function () {
        var val = $('input[name=enctype]:checked').val();
        var keyword = $('#keyword').val();
        var offset = $('#offset').spinner("value");
        var keyword2 = $('#keyword2').val();
        var offset2 = $('#offset2').spinner("value");
        var shift = $('#shift').spinner("value");
        if (val === 'k1') {
            this.genAlphabetK1(keyword, offset);
        }
        else if (val === 'k2') {
            this.genAlphabetK2(keyword, offset);
        }
        else if (val === 'k3') {
            this.genAlphabetK3(keyword, offset, shift);
        }
        else if (val === 'k4') {
            this.genAlphabetK4(keyword, offset, keyword2, offset2);
        }
        else {
            this.genAlphabetRandom();
        }
    };
    /**
     * Compute the replacement set for the the characters on an encryption
     * Note that we actually have to reverse them because the ciphers class
     * is mostly built around decrypting
     * @param {string} repl Replacement character set
     * @param {string} cset Source character set
     */
    CipherEncoder.prototype.setReplacement = function (cset, repl) {
        var i, len, errors;
        errors = '';
        console.log('Set Replacement cset=' + cset + ' repl=' + repl);
        // Figure out what letters map to the destination letters.  Note that
        // the input chracterset alphabet may not be in the same order as the
        // actual alphabet.
        for (i = 0, len = repl.length; i < len; i++) {
            var repc = repl.substr(i, 1);
            var orig = cset.substr(i, 1);
            // Remember that we are backwards because this an encoder
            this.setChar(orig, repc);
            // Just make sure that we don't happen to have the same character
            // at this position
            if (repc === orig) {
                errors += repc;
            }
        }
        if (errors !== '') {
            console.log(errors);
            $(".err").text('Bad keyword/offset combo for letters: ' + errors);
        }
    };
    /**
     * Generate a K1 alphabet where the keyword is in the source alphabet
     * @param keyword Keyword/keyphrase to map
     * @param offset Offset from the start of the alphabet to place the keyword
     */
    CipherEncoder.prototype.genAlphabetK1 = function (keyword, offset) {
        var repl = this.genKstring(keyword, offset, this.getCharset());
        this.setReplacement(this.getSourceCharset(), repl);
    };
    /**
     * Generate a K2 alphabet where the keyword is in the destination alphabet
     * @param keyword Keyword/Keyphrase to map
     * @param offset Offset from the start of the alphabet to place the keyword
     */
    CipherEncoder.prototype.genAlphabetK2 = function (keyword, offset) {
        var repl = this.genKstring(keyword, offset, this.getSourceCharset());
        this.setReplacement(repl, this.getCharset());
    };
    /**
     * Generate a K3 alphabet where both alphabets are the same using a Keyword
     * like a K1 or K2 alphabet, but both are the same alphabet order.
     * It is important to note that for a K3 alphabet you must have the same
     * alphabet for source and destination.  This means languages like Swedish
     * and Norwegian can not use a K3
     * @param keyword Keyword/Keyphrase to map
     * @param offset Offset from the start of the alphabet to place the keyword
     * @param shift Shift of the destination alphabet from the source alphabet
     */
    CipherEncoder.prototype.genAlphabetK3 = function (keyword, offset, shift) {
        if (this.getCharset() != this.getSourceCharset()) {
            var error = 'Source and encoding character sets must be the same';
            console.log(error);
            $(".err").text(error);
            return;
        }
        var repl = this.genKstring(keyword, offset, this.getCharset());
        var cset = repl.substr(shift) + repl.substr(0, shift);
        this.setReplacement(cset, repl);
    };
    /**
     * Generate a K4 alphabet where the keywords are different in each alphabet
     * @param keyword Keyword for the source alphabet
     * @param offset Offset for keyword in the source alphabet
     * @param keyword2 Keyword for the destination alphabet
     * @param offset2 Offset for the keyword in the destination alphabet
     */
    CipherEncoder.prototype.genAlphabetK4 = function (keyword, offset, keyword2, offset2) {
        if (this.getCharset().length != this.getSourceCharset().length) {
            var error = 'Source and encoding character sets must be the same length';
            console.log(error);
            $(".err").text(error);
            return;
        }
        var cset = this.genKstring(keyword, offset, this.getCharset());
        var repl = this.genKstring(keyword2, offset2, this.getSourceCharset());
        this.setReplacement(cset, repl);
    };
    /**
     * Map a keyword into an alphabet
     * @param keyword Keyword to map into the alphabet
     * @param offset Offset from the start of the alphabet to place the keyword
     */
    CipherEncoder.prototype.genKstring = function (keyword, offset, alphabet) {
        var unasigned = alphabet;
        var repl = "";
        var i, len;
        // Go through each character in the source string one at a time
        // and see if it is a legal character.  if we have not already seen
        // it, then remove it from the list of legal characters and add it
        // to the output string
        for (i = 0, len = keyword.length; i < len; i++) {
            var c = keyword.substr(i, 1).toUpperCase();
            // Is it one of the characters we haven't used?
            var pos = unasigned.indexOf(c);
            if (pos >= 0) {
                // we hadn't used it, so save it away and remove it from
                // the list of ones we haven't used
                repl += c;
                unasigned = unasigned.substr(0, pos) + unasigned.substr(pos + 1);
            }
        }
        repl = unasigned.substr(unasigned.length - offset) + repl + unasigned.substr(0, unasigned.length - offset);
        return repl;
    };
    /**
     * Gets a random replacement character from the remaining set of unassigned
     * characters
     * @returns {string} Single character replacement
     */
    CipherEncoder.prototype.getRepl = function () {
        var sel = Math.floor(Math.random() * this.unasigned.length);
        var res = this.unasigned.substr(sel, 1);
        this.unasigned = this.unasigned.substr(0, sel) + this.unasigned.substr(sel + 1);
        return res;
    };
    /**
     *  Generates a random replacement set of characters
     * @returns {string} Replacement set of characters
     */
    CipherEncoder.prototype.genAlphabetRandom = function () {
        var charset = this.getCharset();
        this.unasigned = charset;
        var replacement = "";
        var pos = 0;
        while (this.unasigned.length > 1) {
            var orig = charset.substr(pos, 1);
            var repl = this.getRepl();
            // If the replacement character is the same as the original
            // then we just get another one and put the replacement back at the end
            // This is guaranteed to be unique
            if (orig == repl) {
                var newrepl = this.getRepl();
                this.unasigned += repl;
                repl = newrepl;
            }
            replacement += repl;
            pos++;
        }
        // Now we have to handle the special case of the last character
        if (charset.substr(pos, 1) == this.unasigned) {
            // Just pick a random spot in what we have already done and
            // swap it.  We are guaranteed that it won't be the last character
            // since it matches already
            var sel = Math.floor(Math.random() * replacement.length);
            replacement = replacement.substr(0, sel) + this.unasigned + replacement.substr(sel + 1) + replacement.substr(sel, 1);
        }
        else {
            replacement += this.unasigned;
        }
        this.setReplacement(this.getSourceCharset(), replacement);
    };
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.
     * @param {string} str String to be encoded
     * @returns {string} HTML of encoded string to display
     */
    CipherEncoder.prototype.build = function (str) {
        var res = $('<div>');
        var charset = this.getCharset();
        var sourcecharset = this.getSourceCharset();
        var i, len;
        var revRepl = [];
        var encodeline = "";
        var decodeline = "";
        var lastsplit = -1;
        var splitc = '';
        var langreplace = this.langreplace[this.curlang];
        // Build a reverse replacement map so that we can encode the string
        for (var repc in this.replacement) {
            if (this.replacement.hasOwnProperty(repc)) {
                revRepl[this.replacement[repc]] = repc;
            }
        }
        // Zero out the frequency table 
        this.freq = {};
        for (i = 0, len = sourcecharset.length; i < len; i++) {
            this.freq[sourcecharset.substr(i, 1).toUpperCase()] = 0;
        }
        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (i = 0, len = str.length; i < len; i++) {
            var t = str.substr(i, 1).toUpperCase();
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== 'undefined') {
                t = langreplace[t];
            }
            decodeline += t;
            // Make sure that this is a valid character to map from
            var pos = charset.indexOf(t);
            if (pos >= 0) {
                t = revRepl[t];
                if (isNaN(this.freq[t])) {
                    this.freq[t] = 0;
                }
                this.freq[t]++;
            }
            else {
                // This is a potential split position, so remember it
                lastsplit = decodeline.length;
            }
            encodeline += t;
            // See if we have to split the line now
            if (encodeline.length >= this.maxEncodeWidth) {
                if (lastsplit === -1) {
                    res.append($('<div>', { class: "TOSOLVE" }).text(encodeline));
                    res.append($('<div>', { class: "TOANSWER" }).text(decodeline));
                    encodeline = "";
                    decodeline = "";
                    lastsplit = -1;
                }
                else {
                    var encodepart = encodeline.substr(0, lastsplit);
                    var decodepart = decodeline.substr(0, lastsplit);
                    encodeline = encodeline.substr(lastsplit);
                    decodeline = decodeline.substr(lastsplit);
                    res.append($('<div>', { class: "TOSOLVE" }).text(encodepart));
                    res.append($('<div>', { class: "TOANSWER" }).text(decodepart));
                }
            }
        }
        // And put together any residual parts
        if (encodeline.length > 0) {
            res.append($('<div>', { class: "TOSOLVE" }).text(encodeline));
            res.append($('<div>', { class: "TOANSWER" }).text(decodeline));
        }
        return res;
    };
    /**
     * Generates the HTML code for allowing an encoder to select the alphabet type
     * along with specifying the parameters for that alphabet
     * @returns HTML Elements for selecting the alphabet
     */
    CipherEncoder.prototype.createAlphabetType = function () {
        var res = $('<div>');
        var label = $('<label>', { for: "radios" }).text("Alphabet Type");
        res.append(label);
        var rbox = $('<div>', { id: "radios", class: "ibox" });
        rbox.append($('<input>', { id: "encrand", type: "radio", name: "enctype", value: "random", checked: "checked" }));
        rbox.append($('<label>', { for: "encrand", class: "rlab" }).text("Random"));
        rbox.append($('<input>', { id: "enck1", type: "radio", name: "enctype", value: "k1" }));
        rbox.append($('<label>', { for: "enck1", class: "rlab" }).text("K1"));
        rbox.append($('<input>', { id: "enck2", type: "radio", name: "enctype", value: "k2" }));
        rbox.append($('<label>', { for: "enck2", class: "rlab" }).text("K2"));
        rbox.append($('<input>', { id: "enck3", type: "radio", name: "enctype", value: "k3" }));
        rbox.append($('<label>', { for: "enck3", class: "rlab" }).text("K3"));
        rbox.append($('<input>', { id: "enck3", type: "radio", name: "enctype", value: "k4" }));
        rbox.append($('<label>', { for: "enck3", class: "rlab" }).text("K4"));
        res.append(rbox);
        var kval = $('<div>', { class: "kval" });
        kval.append($('<label>', { for: "keyword" }).text("Keyword"));
        kval.append($('<input>', { type: "text", id: "keyword" }));
        var odiv = $('<div>');
        odiv.append($('<label>', { for: "offset" }).text("Offset"));
        odiv.append($('<input>', { id: "offset", class: "inp spin", title: "offset", type: "text", value: "1" }));
        kval.append(odiv);
        res.append(kval);
        var k4val = $('<div>', { class: "k4val" });
        k4val.append($('<label>', { for: "keyword2" }).text("Keyword 2"));
        k4val.append($('<input>', { type: "text", id: "keyword2" }));
        var odiv2 = $('<div>');
        odiv2.append($('<label>', { for: "offset2" }).text("Offset 2"));
        odiv2.append($('<input>', { id: "offset2", class: "inp spin", title: "offset", type: "text", value: "1" }));
        k4val.append(odiv2);
        res.append(k4val);
        var k3val = $('<div>', { class: "k3val" });
        k3val.append($('<label>', { for: "shift" }).text("Shift"));
        k3val.append($('<input>', { id: "shift", class: "inp spin", title: "Shift", type: "text", value: "1" }));
        res.append(k3val);
        return res;
    };
    /**
     * Update the frequency table on the page.  This is done after loaading
     * a new cipher to encode or decode
     */
    CipherEncoder.prototype.UpdateFreqEditTable = function () {
        var tool = this;
        $(".alphabet").each(function (i) {
            $(this).empty().append(tool.createAlphabetType());
        });
        _super.prototype.UpdateFreqEditTable.call(this);
    };
    /**
     * Loads up the values for the encoder
     */
    CipherEncoder.prototype.load = function () {
        // this.hideRevReplace = true;
        var encoded = this.cleanString($('#toencode').val());
        /*
        * If it is characteristic of the cipher type (e.g. patristocrat),
        * rebuild the string to be encoded in to five character sized chunks.
        */
        if (this.groupingSize) {
            encoded = this.chunk(encoded, this.groupingSize);
        }
        $(".err").text('');
        this.genMap();
        var res = this.build(encoded);
        var tool = this;
        $("#answer").empty().append(res);
        /* testStrings */
        for (var i = 0; i < this.testStrings.length; i++) {
            var chi_1 = this.CalculateChiSquare(this.testStrings[i]);
            var teststr = this.cleanString(this.testStrings[i]);
            var l = teststr.length;
            console.log(l + '`' + chi_1 + '`' + teststr);
        }
        var chi = this.CalculateChiSquare(encoded);
        var chitext = '';
        if (!isNaN(chi)) {
            chitext = "Chi-Square Value=" + chi.toFixed();
            if (chi < 20) {
                chitext += ' [Easy]';
            }
            else if (chi < 30) {
                chitext += ' [Medium]';
            }
            else if (chi < 40) {
                chitext += ' [Medium Hard]';
            }
            else if (chi < 50) {
                chitext += ' [Difficult]';
            }
            else {
                chitext += ' [Extremely Difficult]';
            }
            chitext += ' Length=' + encoded.length;
            if (encoded.length < 60) {
                chitext += ' [Too Short]';
            }
            else if (encoded.length < 80) {
                chitext += ' [Short]';
            }
            else if (encoded.length > 120) {
                chitext += ' [Too Long]';
            }
            else if (encoded.length > 100) {
                chitext += ' [Long]';
            }
        }
        $("#chi").text(chitext);
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    };
    CipherEncoder.prototype.makeFreqEditField = function (c) {
        var einput = $('<span/>', { type: "text", 'data-char': c, id: 'm' + c });
        return einput;
    };
    return CipherEncoder;
}(CipherHandler));
// Encoder: {
//     init: 'initEncoder',
//     normalizeHTML: 'normalizeHTML',
//     load: 'loadEncoder',
//     reset: 'resetSolver',
//     build: 'buildEncoder',
//     makeFreqEditField: 'makeViewField',
//     updateSel: 'updateStandardSel',
//     setChar: 'setStandardChar',
//     setMultiChars: 'setStandardMultiChars',
//     updateMatchDropdowns: 'updateStandardMatchDropdowns',
//     findPossible: 'findStandard'
// },
