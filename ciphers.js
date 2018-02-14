"use strict";

/**
* ciphers.js is a library for JavaScript which provides functions for
* generating web pages to solve Ciphers of many forms.
*
* @version 1.0.0
* @date    2017-02-24
*
* @license
* Copyright (C) 2017 John A Toebes <john@toebes.com>
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not
* use this file except in compliance with the License. You may obtain a copy
* of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
* License for the specific language governing permissions and limitations under
* the License.
*/
/**
 * Main CipherTool class object
 * @type {Object.<string, function>} 
 */
var CipherTool = {
    /**
     * @name CipherTool#langmap
     * @type {Object.<string, string>}
    */
    langmap: {
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
    },
    langcharset: {
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
    },
    langreplace: {
        'en': {},
        'nl': {},
        'de': {},
        'eo': {},
        'es': { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U',  'Ý': 'Y'},
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
    },
    tomorse: {
        ' ': '',
        'A': 'O-',
        'B': '-OOO',
        'C': '-O-O',
        'D': '-OO',
        'E': 'O',
        'F': 'OO-O',
        'G': '--O',
        'H': 'OOOO',
        'I': 'OO',
        'J': 'O---',
        'K': '-O-',
        'L': 'O-OO',
        'M': '--',
        'N': '-O',
        'O': '---',
        'P': 'O--O',
        'Q': '--O-',
        'R': 'O-O',
        'S': 'OOO',
        'T': '-',
        'U': 'OO-',
        'V': 'OOO-',
        'W': 'O--',
        'X': '-OO-',
        'Y': '-O--',
        'Z': '--OO',

        '1': 'O----',
        '2': 'OO---',
        '3': 'OOO--',
        '4': 'OOOO-',
        '5': 'OOOOO',
        '6': '-OOOO',
        '7': '--OOO',
        '8': '---OO',
        '9': '----O',
        '0': '-----',

        ',': '--OO--',
        '.': 'O-O-O-',
        '?': 'OO--OO',
        '/': '-OO-O',
        '-': '-OOOO-',
        '()': '-O--O-'
    },
    /**
    * Table of classes to be associated with morse code dots/dashes/spaces
    * @type {Object.<string, string>} 
    */
    morsedigitClass: {
        'O': 'dot',
        '-': 'dash',
        '?': 'error',
        'X': 'null'
    },
    /**
    * Table of classes to be associated with any particular morse code decoded character
    * @type {Object.<string, string>} 
    */
    morseClass: {
        'A': '',
        'B': '',
        'C': '',
        'D': '',
        'E': '',
        'F': '',
        'G': '',
        'H': '',
        'I': '',
        'J': '',
        'K': '',
        'L': '',
        'M': '',
        'N': '',
        'O': '',
        'P': '',
        'Q': '',
        'R': '',
        'S': '',
        'T': '',
        'U': '',
        'V': '',
        'W': '',
        'X': '',
        'Y': '',
        'Z': '',

        '1': 'num',
        '2': 'num',
        '3': 'num',
        '4': 'num',
        '5': 'num',
        '6': 'num',
        '7': 'num',
        '8': 'num',
        '9': 'num',
        '0': 'num',

        ',': 'sym',
        '.': 'sym',
        '?': 'sym',
        '/': 'sym',
        '-': 'sym',
        '()': 'sym'
    },
    /**
     * Table to map from a morse code string to the corresponding character
     * @type {Object.<string, string>} 
     */
    frommorse: {
        'O-': 'A',
        '-OOO': 'B',
        '-O-O': 'C',
        '-OO': 'D',
        'O': 'E',
        'OO-O': 'F',
        '--O': 'G',
        'OOOO': 'H',
        'OO': 'I',
        'O---': 'J',
        '-O-': 'K',
        'O-OO': 'L',
        '--': 'M',
        '-O': 'N',
        '---': 'O',
        'O--O': 'P',
        '--O-': 'Q',
        'O-O': 'R',
        'OOO': 'S',
        '-': 'T',
        'OO-': 'U',
        'OOO-': 'V',
        'O--': 'W',
        '-OO-': 'X',
        '-O--': 'Y',
        '--OO': 'Z',

        'O----': '1',
        'OO---': '2',
        'OOO--': '3',
        'OOOO-': '4',
        'OOOOO': '5',
        '-OOOO': '6',
        '--OOO': '7',
        '---OO': '8',
        '----O': '9',
        '-----': '0',

        '--OO--': ',',
        'O-O-O-': '.',
        'OO--OO': '?',
        '-OO-O': '/',
        '-OOOO-': '-',
        '-O--O-': '()'
    },
    /** @type {Object.<string, string>} 
   */
    morbitMap: {
        '1': 'OO',
        '2': 'O-',
        '3': 'OX',
        '4': '-O',
        '5': '--',
        '6': '-X',
        '7': 'XO',
        '8': 'X-',
        '9': 'XX'
    },
    /** @type {Object.<string, string>} 
    */
    fractionatedMorseMap: {
        'A': 'OOO',
        'B': 'OO-',
        'C': 'OOX',
        'D': 'O-O',
        'E': 'O--',
        'F': 'O-X',
        'G': 'OXO',
        'H': 'OX-',
        'I': 'OXX',
        'J': '-OO',
        'K': '-O-',
        'L': '-OX',
        'M': '--O',
        'N': '---',
        'O': '--X',
        'P': '-XO',
        'Q': '-X-',
        'R': '-XX',
        'S': 'XOO',
        'T': 'XO-',
        'U': 'XOX',
        'V': 'X-O',
        'W': 'X--',
        'X': 'X-X',
        'Y': 'XXO',
        'Z': 'XX-'
    },
    /**
     * @type {Object.Object.<string,number>}
     * @type {Object.<string,number>}
     */
    langfreq: {
        'en': {
            'E': 0.1249, 'T': 0.0928, 'A': 0.0804, 'O': 0.0764, 'I': 0.0757,
            'N': 0.0723, 'S': 0.0651, 'R': 0.0628, 'H': 0.0505, 'L': 0.0407,
            'D': 0.0382, 'C': 0.0334, 'U': 0.0273, 'M': 0.0251, 'F': 0.0240,
            'P': 0.0214, 'G': 0.0187, 'W': 0.0168, 'Y': 0.0166, 'B': 0.0148,
            'V': 0.0105, 'K': 0.0054, 'X': 0.0023, 'J': 0.0016, 'Q': 0.0012,
            'Z': 0.0009
        },
        'nl': {},
        'de': {},
        'eo': {},
        'es': {
            'E': 0.1408, 'A': 0.1216, 'O': 0.092,  'S': 0.072,  'N': 0.0683,
            'R': 0.0641, 'I': 0.0598, 'L': 0.0524, 'U': 0.0469, 'D': 0.0467,
            'T': 0.046,  'C': 0.0387, 'M': 0.0308, 'P': 0.0289, 'B': 0.0149,
            'H': 0.0118, 'Q': 0.0111, 'Y': 0.0109, 'V': 0.0105, 'G': 0.01,
            'F': 0.0069, 'J': 0.0052, 'Z': 0.0047, 'Ñ': 0.0017, 'X': 0.0014,
            'K': 0.0011, 'W': 0.0004
        },
        'fr': {},
        'it': {},
        'no': {},
        'pt': {},
        'sv': {},
        'ia': {},
        'la': {}
    },
    /** @type {Array.string} 
     */
    fractionatedMorseReplaces: [
        'OOO', 'OO-', 'OOX', 'O-O', 'O--', 'O-X', 'OXO', 'OX-', 'OXX',
        '-OO', '-O-', '-OX', '--O', '---', '--X', '-XO', '-X-', '-XX',
        'XOO', 'XO-', 'XOX', 'X-O', 'X--', 'X-X', 'XXO', 'XX-'],
        testStrings: [
        ],
        morbitReplaces: ['OO', 'O-', 'OX', '-O', '--', '-X', 'XO', 'X-', 'XX'],
    cipherWidth: 1,
    charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    sourcecharset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    unasigned: "",
    rowcharset: "",
    colcharset: "",
    replacement: [],
    curlang: '',
    holdupdates: false,
    /** @type{number} maxEncodeWidth - The maximum number of characters to
     * be shown on an encoded line so that it can be readily pasted into a test
     */
    maxEncodeWidth: 53,
    /** @type {boolean} ShowRevReplace - Output the reverse replacement
     * row in the frequency table
     */
    ShowRevReplace: true,
    /** @type {string} encodedString - Input string cleaned up
     */
    encodedString: '',
    Frequent: {},
    freq: [],
    chunkIt: false,
    doEncoding: true,
    affineCheck: {
        'p': -1,
        'q': -1,
        'r': -1,
        's': -1,
        'oldId': -1,
        'olderId': -1
    },

    /** @description Sets the character set used by the Decoder.
     * @param {string} charset the set of characters to be used. 
    */
    setCharset: function (charset) {
        this.charset = charset;
    },
    isValidChar: function (char) {
        return this.charset.indexOf(char) >= 0;
    },
    getCharset: function () {
        return this.charset;
    },
    getSourceCharset: function () {
        return this.sourcecharset;
    },
    normalizeHTML: function (str) {
        return str;
    },
    /**
     * 
     * @param {*string} string String to compute value for
     * @returns {number} Value calculated 
     */
    CalculateChiSquare(str) {
        var charset = this.getCharset();
        var i, len;
        len = charset.length;
        var counts = new Array(len);
        var total = 0;
        for(i = 0; i < len; i++) {
            counts[i] = 0;
        }
        for(i = 0; i < str.length; i++) {
            var c = str.substr(i, 1).toUpperCase();
            var pos = charset.indexOf(c);
            if (pos >= 0) {
                counts[pos]++;
                total++;
            }
        }
        var chiSquare = 0.0;
        for(i = 0; i < len; i++) {
            var c = charset.substr(i,1);
            console.log('Lang='+this.lang+' c='+c);
            var expected = this.langfreq[this.lang][c];
            chiSquare += Math.pow(counts[i] - total*expected,2)/(total*expected);
        }
        return chiSquare;
    },    
    /*
    * Creates an HTML table to display the frequency of characters
    */
    createNormalFreqEditTable: function () {
        var table = $('<table/>').addClass("tfreq");
        var thead = $('<thead/>');
        var tbody = $('<tbody/>');
        var headrow = $('<tr/>');
        var freqrow = $('<tr/>');
        var replrow = $('<tr/>');
        var altreprow = $('<tr/>')
        var i, len;
        var charset = this.getCharset();

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
    },
    createAlphabetType: function () {
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
        return res.html();
    },
    /**
     * Enable / Disable the HTML elements based on the alphabet selection
     */
    setkvalinputs: function () {
        var val = $('input[name=enctype]:checked').val();
        if (val === 'random') {
            $(".kval").hide();
        } else {
            $(".kval").show();
        }
        if (val === 'k3') {
            $(".k3val").show();
        } else {
            $(".k3val").hide();
        }
        if (val === 'k4') {
            $(".k4val").show();
        } else {
            $(".k4val").hide();
        }
    },

    /*
     * Sorter to compare two frequency objects
     * Objects must have a freq and a val portion
     * higher frequencey sorts first with a standard alphabetical sort after
     */
    isort: function (a, b) {
        if (a.freq > b.freq) {
            return -1;
        } else if (a.freq < b.freq) {
            return 1;
        } else if (a.val < b.val) {
            return -1;
        } else if (a.val > b.val) {
            return 1;
        }
        return 0;
    },
    /** 
     * Finds the top n strings of a given width and formats an HTML 
     * unordered list of them.  Only strings which repeat 2 or more times are included
     * @param {string} string
     * @param {number} width
     * @param {number} num
     */
    makeTopList: function (string, width, num) {
        var tfreq = {};
        var tobjs = [];
        var work = '';
        var i, len;
        var res = '';
        for (i = 0, len = string.length; i < len; i++) {
            var t = string.substr(i, 1).toUpperCase();
            if (this.isValidChar(t)) {
                work += t;
            }
        }
        // Now we have the work string with only the legal characters in it
        // Next we want to go through and find all the combination strings of a given length
        for (i = 0, len = work.length; i <= len - width * this.cipherWidth; i++) {
            var piece = work.substr(i, width * this.cipherWidth);
            if (isNaN(tfreq[piece])) {
                tfreq[piece] = 0;
            }
            tfreq[piece]++;
        }
        // tfreq holds the frequency of each string which is of the width requested.  Now we just
        // need to go through and pick out the big ones and display them in sorted order.  To sort
        // it we need to build an array of objects holding the frequency and values.
        Object.keys(tfreq).forEach(function (value) {
            var frequency = tfreq[value];
            if (frequency > 1) {
                var item = { freq: frequency, val: value };
                tobjs.push(item);
            }
        });
        // Now we sort them and pull out the top requested items.  It is possible that 
        // the array is empty because there are not any duplicates
        tobjs.sort(this.isort);
        if (num > tobjs.length) {
            num = tobjs.length;
        }
        res = 'None found';
        if (num > 0) {
            res = '<ul>';
            for (i = 0; i < num; i++) {
                var valtext = tobjs[i].val;
                if (this.cipherWidth > 1) {
                    // We need to insert spaces every x characters
                    var vpos, vlen;
                    var extra = '';
                    var final = '';
                    for (vpos = 0, vlen = valtext.length / 2; vpos < vlen; vpos++) {
                        final += extra + valtext.substr(vpos * 2, 2);
                        extra = ' ';
                    }
                    valtext = final;
                }

                res += '<li>' + valtext + ' - ' + tobjs[i].freq + '</li>';
            }
            res += '</ul></div>';
        }
        return res;
    },
    /**
     * Analyze the encoded text
     * @param {string} encoded
     * @param {number} width
     * @param {number} num
     */
    analyze: function (encoded, width, num) {
        console.log('Analyze encoded=' + encoded);
        var res = '<table class="satable">' +
            '<thead><tr><th>2 Characters</th><th>3 Characters</th><th>4 Characters</th><th>5 Characters</th></tr></thead>' +
            '<tbody><tr>' +
            '<td>' + this.makeTopList(encoded, 2, 12) + '</td>' +
            '<td>' + this.makeTopList(encoded, 3, 12) + '</td>' +
            '<td>' + this.makeTopList(encoded, 4, 12) + '</td>' +
            '<td>' + this.makeTopList(encoded, 5, 12) + '</td>' +
            '</tr></tbody></table>';
        return res;
    },
    gcd: function (a, b) {
        if (isNaN(a)) { return a; }
        if (isNaN(b)) { return b; }
        if (a < 0) { a = -a; }
        if (b < 0) { b = -b; }

        if (b > a) { var temp = a; a = b; b = temp; }
        while (true) {
            console.log('gcd a=' + a + ' b=' + b);
            if (b == 0) return a;
            a %= b;
            if (a == 0) return b;
            b %= a;
        }
    },

    iscoprime: function (a) {
        var charset = this.getCharset();
        console.log('iscoprime a=' + a + ' len=' + charset.length);
        var gcdval = this.gcd(a, charset.length);
        console.log('gcd(' + a + ',' + charset.length + ')=' + gcdval);
        if (gcdval != 1) {
            return false;
        }
        return true;
    },
    affinechar: function (a, b, chr) {
        var charset = this.getCharset();
        var x = charset.indexOf(chr.toUpperCase());
        if (x < 0)
        { return chr; }
        var y = ((a * x) + b) % charset.length;
        var res = charset.substr(y, 1);
        console.log('char=' + chr + ' x=' + x + ' a=' + a + ' b=' + b + ' y=' + y + ' res=' + res);
        return res;
    },
    /*
    * Creates an HTML table to display the frequency of characters
    */
    createAffineSolutionTable: function () {
        var table = $('<table/>').addClass("tfreq");
        var thead = $('<thead/>');
        var tbody = $('<tbody/>');
        var headrow = $('<tr/>');
        var freqrow = $('<tr/>');
        var replrow = $('<tr/>');
        var altreprow = $('<tr/>')
        var i, len;
        var charset = this.getCharset();

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
    },
    /**
     * Builds the GUI for the solver
     * @param {string} str String to decode
     */
    buildSolver: function (str) {
        var res = "";
        var combinedtext = "";
        var prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        var posthead1 = '</tr></tbody></table><div class="repl" data-chars="';
        var posthead2 = '"></div></div>';
        var pre = prehead;
        var post = '';
        var i, len;
        var datachars = '';
        var charset = this.getCharset().toUpperCase();
        this.freq = [];
        for (i = 0, len = charset.length; i < len; i++) {
            this.freq[charset.substr(i, 1).toUpperCase()] = 0;
        }

        for (i = 0, len = str.length; i < len; i++) {
            var t = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(t)) {
                if (isNaN(this.freq[t])) {
                    this.freq[t] = 0;
                }
                this.freq[t]++;

                datachars += t;
                combinedtext += '<span data-char="' + t + '">?</span>';
                t = pre + '<td><div class="slil">' + t + '</div>' +
                    '<input type="text" id="ti' + i + '" class="sli" data-char="' + t + '" /></td>';

                pre = '';
            } else if (t === ' ' || t === '\n' || t === '\r') {
                if (pre === '') {
                    t = posthead1 + datachars + posthead2;
                } else {
                    t = '';
                }
                pre = prehead;
                datachars = '';
                combinedtext += ' ';
            } else {
                combinedtext += t;
                t = pre + '<td><div class="slil">' + t + '</div></td>';
                pre = '';
            }
            res += t;
        }
        if (pre === '') {
            res += posthead1 + datachars + posthead2;
        }
        res += '<div class="ssum">' + combinedtext + '</div>';
        return res;
    },
    /**
     * When building a Morbit or Fractionated Morse, we want to create the table with three rows.
     * the top row is the input characters each with a colspan of 2.  This
     * is because each character in the Morbit expands to two morse code characters
     * We will ensure that the table is always an even number of columns so that
     * an input chais the input characters each with a colspan of 2.  This
     * is because each character in the Morbit expands to two morse code characters
     * We will ensure that the table is always an even number of columns so that
     * an input character never spans tables.  "known" entries are created with a
     * "known" class so that it can be stylized
     *
     * the second row is each character of the morse code.  Dashes, Spaces and Dots
     * are all created with the corresponding classes.
     *
     * the third row of the table is more interesting.  We have several cases to
     * consider here.
     * If the length of the morse code for the current decryption is shorter than
     * the remaining columns in the table then we are good and can output the column
     * with a colspan for the morse character.
     * If the length of the morse code is longer than the remaining columns in the table
     * then we need to see if at least half will fit in this table.
     * If so, then we output with a colspan to fill the remainder of the table and start
     * the continuation table with and empty cell with a colspan for the leftover portion
     * marked with a "cont" class.
     * If not, then we output a colspan to fill the remainder of the table with an empty cell
     * marked with a "cont" class and output the data at the start of the continuation table
     *
     * To output the data for this, we have four possibilities
     * 1- If it is a null space (i.e. an x immediately after a . or -) then we ouput an empty
     *    cell with a class of "null"
     * 2- If it is a space after a null (i.e. an x immediately after a single preceeding x) then
     *    we output an empty cell with a class of "space"
     * 3- if it is an error null (i.e. an x at the start of the string or an x preceeded by 2 or more x)
     *    or a bad morse code 
     *    then we output a cell with a class of "error"
     * 4- Otherwise it is a valid morse code string and we output the cell with the class from the morseClass
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    buildMorseSolver: function (str) {
        var topdiv = $('<div/>').addClass("sword");
        var table = $('<table/>').addClass("mword");
        var tbody = $('<tbody/>');
        var inrow = $('<tr/>');
        var morserow = $('<tr/>');
        var outrow = $('<tr/>');
        var c, i, len, morseclass;
        var remaining;
        var lastsep = 'XX';  // Start out with a few Xs so that an initial X generates an error
        var extraout = '';
        var extralen = 0;
        var extraclass = '';
        var intext = '';
        var morsetext = '';
        var cipherwidth = this.cipherWidth;
        var finaltext = '';
        var docwidth = $(document).width();
        //docwidth = 9 * 24 * cipherwidth;
        var width = cipherwidth * Math.floor(docwidth / (24 * cipherwidth));

        //
        // Build up the input string and the corresponding morse code
        // string.  We will guarantee that the morse code string is
        // exactly cipherwidth times the length of the input string
        //
        for (i = 0, len = str.length; i < len; i++) {
            c = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(c)) {
                intext += c;
                // Figure out what this character corresponds to.  If it
                // has no mapping, we will use two filler ?? values just to
                // keep things running smoothly.  It will ensure that we
                // don't get a valid morse code string
                var morsepiece;
                if (cipherwidth === 2) {
                    morsepiece = this.morbitMap[c] + '????';
                } else {
                    morsepiece = this.fractionatedMorseMap[c] + '????';
                }
                morsetext += morsepiece.substr(0, cipherwidth);
            }
        }
        //
        // Put an X on the end of the morsetext so that we can count on it
        // being there, but we will never output it because it is one past
        // the corresponding spot for all input characters
        //
        morsetext += 'XXX';
        remaining = width;
        console.log('**MORSETEXT=' + morsetext);
        //
        // Now that we have the strings, go through and output the rows
        //
        for (i = 0, len = intext.length; i < len; i++) {
            c = intext.substr(i, 1);
            var mpos;
            inrow.append($('<td colspan="' + cipherwidth + '"/>').text(c));
            for (mpos = 0; mpos < cipherwidth; mpos++) {
                var morse = morsetext.substr(i * cipherwidth + mpos, 1);
                morseclass = this.morsedigitClass[morse];
                if (morseclass === '') {
                    morseclass = 'error';
                }
                morse = this.normalizeHTML(morse);
                morserow.append($('<td/>').addClass(morseclass).html(morse));
                //
                // If we already have a prevailing span to cover our morse characters then
                // we don't need to do anything.
                //
                if (extralen) {
                    extralen--;
                } else {
                    var startpos = i * cipherwidth + mpos;
                    // We are guaranteed to find the X in the string because it was added to the
                    // end as an extra.
                    var mlen = morsetext.indexOf("X", startpos) - startpos;
                    // See if we just got an X (empty string)
                    // It either indicates the end of a character (single X)
                    // or the end of a word (double X)
                    // or an error (three or more X in a row)
                    if (mlen === 0) {
                        console.log("Empty Morse laststep=" + lastsep);
                        if (lastsep === '') {
                            outrow.append($('<td/>').addClass("null"));
                            lastsep = 'X';
                        } else if (lastsep === 'X') {
                            outrow.append($('<td/>').addClass("space"));
                            lastsep = 'XX';
                            finaltext += ' ';
                        } else {
                            outrow.append($('<td/>').addClass("error"));
                            finaltext += '<span class="error">?</span>';
                        }
                    } else {
                        var morselet = morsetext.substr(startpos, mlen);
                        console.log('Moreselet:' + morselet + 'len=' + mlen + ' remaining=' + remaining + ' mpos=' + mpos + ' Cipherwidth=' + cipherwidth);
                        lastsep = '';
                        var outchar = '';
                        // See if we have an invalid morse sequence.  If so
                        // our output class will be an error and replace the string with ??
                        if (typeof this.frommorse[morselet] === 'undefined') {
                            morseclass = 'error';
                            outchar = '??';
                            finaltext += '<span class="error">?</span>';
                        } else {
                            outchar = this.frommorse[morselet];
                            morseclass = this.morseClass[outchar];
                            finaltext += outchar;
                        }
                        // Now figure out how much of this string we are going to output
                        // When we are done, remaining has to be decremented by the number of cells
                        // that we used in this morselet
                        // extralen is set to how many extra characters will need to come out of
                        // subsequent columns
                        extralen = mlen - 1;
                        if (mlen <= remaining) {
                            outrow.append($('<td colspan="' + mlen + '"/>').addClass(morseclass).text(outchar));
                        } else {
                            // We won't fit. Figure out which side gets the character
                            // console.log('***NO FIT: remaining =' + remaining + ' mlen=' + mlen + ' outchar=' + outchar + ' morseclass=' + morseclass+' extralen='+extralen);
                            if (remaining * 2 >= mlen) {
                                outrow.append($('<td colspan="' + remaining + '"/>').addClass(morseclass).text(outchar));
                                extraout = '';
                                extraclass = 'cont';
                            } else {
                                outrow.append($('<td colspan="' + remaining + '"/>').addClass('cont'));
                                extraout = outchar;
                                extraclass = morseclass;
                            }
                        }
                    }
                }
                remaining--;
            }
            if (remaining <= 0) {
                // Time to close off one table and start another
                tbody.append(inrow);
                tbody.append(morserow);
                tbody.append(outrow);
                table.append(tbody);
                topdiv.append(table);

                table = $('<table/>').addClass("mword");
                tbody = $('<tbody/>');
                inrow = $('<tr/>');
                morserow = $('<tr/>');
                outrow = $('<tr/>');
                if (extralen > 0) {
                    outrow.append($('<td colspan="' + extralen + '"/>').addClass(extraclass).text(extraout));
                }
                remaining = width;
            }
        }
        // Finish off the table
        tbody.append(inrow);
        tbody.append(morserow);
        tbody.append(outrow);
        table.append(tbody);
        topdiv.append(table);
        topdiv.append($('<hr/><div>' + finaltext + '</div>'));
        return topdiv;
    },
    /**
     * Retrieve all of the replacement characters that have been selected so far
     */
    cacheReplacements: function () {
        var charset = this.getCharset().toUpperCase();
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
    },
    /**
     * Change the encrypted character
     * @param {any} repchar Encrypted character to map against
     * @param {any} newchar New char to assign as decoding for the character
     */
    setStandardChar: function (repchar, newchar) {
        this.replacement[repchar] = newchar;
        $("input[data-char='" + repchar + "']").val(newchar);
        if (newchar === '') {
            newchar = '?';
        }
        $("span[data-char='" + repchar + "']").text(newchar);
        this.cacheReplacements();
        this.updateMatchDropdowns(repchar);
    },
    /**
     * Change multiple characters at once.
     * @param {string} reqstr String of items to apply
     */
    setStandardMultiChars: function (reqstr) {
        console.log('setStandardMultiChars ' + reqstr);
        var i, len;
        this.holdupdates = true;
        for (i = 0, len = reqstr.length / 2; i < len; i++) {
            var repchar = reqstr.substr(i * 2, 1);
            var newchar = reqstr.substr(i * 2 + 1, this.cipherWidth);
            console.log('Set ' + repchar + ' to ' + newchar);
            this.updateSel(repchar, newchar);
        }
        this.holdupdates = false;
        this.updateMatchDropdowns('');
    },
    /**
     * Eliminate the non displayable characters and replace them with a space
     * @param {string} str String to clean up
     * @returns {string} String with no spaces in it
     */
    cleanString: function (str) {
        var pattern = "[\r\n ]+";
        var re = new RegExp(pattern, "g");
        str.replace(re, " ");
        return str;
    },
    /**
     * Eliminate all characters which are not in the charset
     * @param {string} str String to clean up
     * @returns {string} Result string with only characters in the legal characterset
     */
    minimizeString: function (str) {
        var res = '';
        for (var i = 0, len = str.length; i < len; i++) {
            var c = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(c)) {
                res += c;
            }
        }
        return res;
    },
    /**
    *
    */
    attachHandlers: function () {
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
                } else {
                    next = focusables.eq(current - 1);
                }
                next.focus();
            } else if (event.keyCode === 39) { // right
                current = focusables.index(event.target);
                next = focusables.eq(current + 1).length ? focusables.eq(current + 1) : focusables.eq(0);
                next.focus();
            } else if (event.keyCode === 46 || event.keyCode === 8) {
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
            } else {
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
            } else {
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
        $(".msli").on('change', function () {
            var toupdate = $(this).attr('data-char');
            tool.updateSel(toupdate, this.value);
        });
        $("#rowcharset").on('change', function () {
            tool.setrowcolset(this.value, tool.colcharset, true);
        });
        $("#colcharset").on('change', function () {
            tool.setrowcolset(tool.rowcharset, this.value, true);
        });
        $(".spin").spinner({
            spin: function (event, ui) {
                if (ui.value >= tool.getCharset().length) {
                    $(this).spinner("value", 0);
                    return false;
                } else if (ui.value < 0) {
                    $(this).spinner("value", tool.getCharset().length - 1);
                    return false;
                }
            }
        });
        $('input[type=radio][name=enctype]').change(function () {
            tool.setkvalinputs();
        });
        $('input[type=radio][name=operation]').change(function () {
            tool.setVigenereInputs();
        })
        tool.setkvalinputs();
    },
    /**
    * Fills in the frequency portion of the frequency table
    */
    displayFreq: function () {
        var charset = this.getCharset();
        var c, i, len;
        this.holdupdates = true;
        for (c in this.freq) {
            if (this.freq.hasOwnProperty(c)) {
                var subval = this.freq[c];
                if (subval === 0) {
                    subval = '';
                }
                $('#f' + c).text(subval);
            }
        }
        //TODO: Is this really needed?
/*        for (i = 0, len = charset.length; i < len; i++) {
            c = charset.substr(i, 1);
            var repl = $('#m' + c).val();
            this.setChar(c, repl);
        }
        */
        this.holdupdates = false;
        this.updateMatchDropdowns('');
    },
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
    makeUniquePattern: function (str, width) {
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
    },
    /**
     * Searches for a string (drags a crib through the crypt)
     * @param {any} encoded
     * @param {any} encodewidth
     * @param {any} tofind
     * @param {any} findwidth
     */
    searchPattern: function (encoded, encodewidth, tofind, findwidth) {
        var res = '';
        var notmapped = "????".substr(0, findwidth);
        var searchstr = this.makeUniquePattern(tofind, findwidth);
        if (findwidth > 1) {
            tofind += "XXXX".substr(0, findwidth - tofind.length % findwidth);
        }
        var i, len;
        var searchlen = searchstr.length;
        var encrlen = encoded.length;

        var used = [];
        var charset = this.getCharset().toUpperCase();
        for (i = 0, len = charset.length; i < len; i++) {
            used[charset.substr(i, 1)] = false;
        }
        for (i = 0, len = charset.length; i < len; i++) {
            used[this.replacement[charset.substr(i, 1)]] = true;
        }

        for (i = 0; i + searchlen * encodewidth <= encrlen; i += encodewidth) {
            var checkstr = encoded.substr(i, searchlen * encodewidth);
            var check = this.makeUniquePattern(checkstr, encodewidth);
            // console.log(i + ':"' + check + '/' + encoded.substr(i, searchlen) + '" for "' + searchstr + '/'+tofind+ '"');
            if (check === searchstr) {
                var keymap = {};
                var j;
                var matched;
                //
                // Build the character mapping table to show what they would use
                matched = true;
                //var charset = this.getCharset();
                for (j = 0; j < charset.length; j++) {
                    keymap[charset.substr(j, 1)] = notmapped;
                }
                // Show the matching characters in order
                for (j = 0; j < searchlen; j++) {
                    var keystr = tofind.substr(j * findwidth, findwidth);
                    keymap[checkstr.substr(j, 1)] = keystr;
                    if (findwidth == 1 && keystr === checkstr.substr(j, 1)) {
                        matched = false;
                    }
                }
                // We matched, BUT we need to make sure that there are no signs that preclude it from 
                if (findwidth > 1) {
                    // Check the preceeding character to see if we have a match for it.  The preceeding
                    // character can not be known to be a dot or a dash when dealing with morse code
                    if (i > 0 && tofind.substr(0, 1) !== 'X') {
                        var preceeding = encoded.substr(i - 1, 1);
                        var prevchar = keymap[preceeding].substr(findwidth - 1, 1);
                        if (prevchar !== 'X' && prevchar !== '?') {
                            console.log('*** Disallowing ' + checkstr + ' because prevchar =' + prevchar + ' for ' + preceeding);
                            matched = false;
                        }
                    }
                    // Likewise, the following character must also not be a dot or a dash.
                    if (matched && tofind.substr(tofind.length - 1, 1) !== 'X' && i + searchlen < encrlen) {
                        var following = encoded.substr(i + searchlen, 1);
                        var nextchar = keymap[following].substr(0, 1);
                        if (nextchar !== 'X' && prevchar !== '?') {
                            console.log('*** Disallowing ' + checkstr + ' because nextchar =' + nextchar + ' for ' + following);
                            matched = false;
                        }
                    }
                } else {
                    var repl = this.genReplPattern(checkstr);
                    if (!this.isValidReplacement(tofind, repl, used)) {
                        // console.log('*** Disallowing ' + checkstr + ' because not valid replacement for ' + tofind);
                        matched = false;
                    }
                }
                if (matched) {
                    var maptable = '';
                    var mapfix = '';
                    for (j = 0; j < charset.length; j++) {
                        var key = charset.substr(j, 1);
                        maptable += '<td>' + this.normalizeHTML(keymap[key]) + '</td>';
                        if (keymap[key] !== notmapped) {
                            mapfix += key + keymap[key];
                        }
                    }
                    res += '<tr><td>' + i + '</td><td><a class="dapply" href="#" onclick="CipherTool.setMultiChars(\'' + mapfix + '\');">' + checkstr + '</a></td>' + maptable + '</tr>';
                }
            }
        }
        return res;
    },
    /**
     * @param {string} reqstr Template string to set mappings
     */
    setMorseMultiChars: function (reqstr) {
        console.log('setMorseMultiChars ' + reqstr);
        var i, len;
        this.holdupdates = true;
        for (i = 0, len = reqstr.length / (this.cipherWidth + 1); i < len; i++) {
            var repchar = reqstr.substr(i * (this.cipherWidth + 1), 1);
            var newchar = reqstr.substr(i * (this.cipherWidth + 1) + 1, this.cipherWidth);
            console.log('Set ' + repchar + ' to ' + newchar);
            this.updateSel(repchar, newchar);
        }
        this.holdupdates = false;
        this.updateMatchDropdowns('');
    },
    /**
     * Apply any fixed replacement characters to a given unique string. For example, if the input
     * string was "01232" and the repl string was " HE E" then the output would be "0HE3E"
     * @param {string} str Input string to apply the replacement characters to
     * @param {string} repl Replacement characters.  Any non blank character replaces the corresponding character in the input string
     * @returns {string} Comparable replacement string
     */
    applyReplPattern: function (str, repl) {
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
    },
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
    genReplPattern: function (str) {
        var i, len;
        var res = [];
        for (i = 0, len = str.length; i < len; i++) {
            var c = str.substr(i, 1);
            res.push(this.replacement[c]);
        }
        return res;
    },
    /**
     * @param {string} str String to check
     * @param {Array.<string>} repl Replacement characters which are pre-known
     * @param {Array.<number>} used Array of flags whether a character is already known to be used
     * @returns {bool} True/false if the string is a valid replacement
     */
    isValidReplacement: function (str, repl, used) {
        var i, len;
        //   console.log(str);
        for (i = 0, len = str.length; i < len; i++) {
            var c = str.substr(i, 1);
            if (repl[i] !== '') {
                if (c !== repl[i]) {
                    //             console.log('No match c=' + c + ' repl[' + i + ']=' + repl[i]);
                    return false;
                }
            } else if (used[c]) {
                //          console.log('No match c=' + c + ' used[c]=' + used[c]);
                return false;
            }
        }
        return true;
    },
    /**
     * Generates the Match dropdown for a given string
     * @param {string} str String to generate a match down for
     * @returns {string} Html for a select
     */
    generateMatchDropdown: function (str) {
        if (this.curlang === '') {
            return '';
        }

        var pat = this.makeUniquePattern(str, 1);
        var repl = this.genReplPattern(str);
        var mselect = $('<select/>').addClass('match');
        if (typeof this.Frequent[this.curlang][pat] != 'undefined') {
            var matches = this.Frequent[this.curlang][pat];
            var selectclass = '';
            var matched = false;
            var added = 0;
            var i, len;
            var used = [];
            var charset = this.getCharset().toUpperCase();
            for (i = 0, len = charset.length; i < len; i++) {
                used[charset.substr(i, 1)] = false;
            }
            for (i = 0, len = charset.length; i < len; i++) {
                used[this.replacement[charset.substr(i, 1)]] = true;
            }

            //     console.log(repl);
            //     console.log(used);
            for (i = 0, len = matches.length; i < len; i++) {
                var entry = matches[i];
                if (this.isValidReplacement(entry[0], repl, used)) {
                    if (!matched) {
                        selectclass = 'l' + entry[3];
                    }
                    matched = true;
                    added++;
                    $('<option/>').addClass('l' + entry[3]).text(entry[0]).appendTo(mselect);
            /*    } else if (entry[1] < 100 && added < 9) {
                    if (selectclass === '') {
                        selectclass = entry.c;
                    }
                    added++;
                    $('<option/>').addClass('l'+entry[3] + ' nomatch').text(entry.t).appendTo(mselect);
*/                }
                if (matched && added > 9) {
                    break;
                }
            }
            if (added === 0) {
                selectclass = 'nopat';
            }
            mselect.addClass(selectclass);
        } else {
            mselect.addClass('nopat');
        }
        return mselect;
    },
    updateStandardMatchDropdowns: function (repchar) {
        var tool = this;
        this.cacheReplacements();
        $("[data-chars]").each(function () {
            $(this).html(tool.generateMatchDropdown($(this).attr('data-chars')));
        });
    },
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Standard Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    loadSolver: function () {
        var encoded = this.cleanString($('#encoded').val());
        console.log('LoadSolver');
        var res = this.build(encoded);
        var tool = this;
        $("#answer").html(res);
        $("#analysis").each(function (i) {
            $(this).html(tool.analyze(encoded));
        });

        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    },

    resetSolver: function () {
        for (var c in this.freq) {
            if (this.freq.hasOwnProperty(c)) {
                $('#m' + c).val('');
                $('#rf' + c).text('');
            }
        }
        this.load();
    },
    findStandard: function (str) {
        var encoded = this.minimizeString($('#encoded').val());
        var extra = '';
        var res = '';
        var i;
        str = str.toUpperCase();
        //
        // Look for all possible matches for the pattern.
        res = this.searchPattern(encoded, 1, str, 1);
        if (res === '') {
            res = '<br/><b>Not Found</b>';
        } else {
            var charset = this.getCharset();
            var tres = '<table class="mfind"><thead><tr><th>Pos</th><th>Match</th>';
            for (i = 0; i < charset.length; i++) {
                var key = charset.substr(i, 1);
                tres += '<th>' + key + '</th>';
            }
            //   res +=             < ul > ' + res + '</ul > ';
            res = tres + '</tr></thead><tbody>' + res + '</tbody></table>';
        }

        $(".findres").html('Searching for ' + str + ' as ' + this.normalizeHTML(str) + res);
    },
    /*
     * Create an edit field for a dropdown
    */
    makeEditField: function (c) {
        var einput = $('<input/>', { type: "text", class: "sli", 'data-char': c, id: 'm' + c });
        return einput;
    },
    makeViewField: function (c) {
        var einput = $('<span/>', { type: "text", 'data-char': c, id: 'm' + c });
        return einput;
    },
    updateStandardSel: function (item, val) {
        this.setChar(item, val);
    },
    init: function () {
    },
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Morse routines.
     *
     * findMorse looks for a morse encoded string in the input pattern.  It relies on:
     *   this.cipherWidth to be the width of each encoded character
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    findMorse: function (str) {
        var encoded = this.minimizeString($('#encoded').val());
        var morse = '';
        var extra = '';
        var res = '';
        // Convert the string to Morse.
        for (var i = 0, len = str.length; i < len; i++) {
            var c = str.substr(i, 1).toUpperCase();
            if (typeof this.tomorse[c] !== 'undefined') {
                morse += extra + this.tomorse[c];
                extra = 'X';
            }
        }
        //
        // Look for all possible matches for the pattern.  We need to shift it by as many Xs as
        // can occur for the width of a morse character.  For a Morbit this would only be a single
        // one, but with a Fractionated Morse it could be two leadings ones.
        for (i = 0; i < this.cipherWidth; i++) {
            res += this.searchPattern(encoded, 1, "XXXXX".substr(0, i) + morse, this.cipherWidth);
        }
        if (res === '') {
            res = '<br/><b>Not Found</b>';
        } else {
            var charset = this.getCharset();
            var tres = '<table class="mfind"><thead><tr><th>Pos</th><th>Match</th>';
            for (i = 0; i < charset.length; i++) {
                var key = charset.substr(i, 1);
                tres += '<th>' + key + '</th>';
            }
            //   res +=             < ul > ' + res + '</ul > ';
            res = tres + '</tr></thead><tbody>' + res + '</tbody></table>';
        }

        $(".findres").html('Searching for ' + str + ' as ' + this.normalizeHTML(morse) + res);
    },
    normalizeMorseHTML: function (str) {
        return str.replace(/O/g, '&#9679;').replace(/-/g, "&ndash;").replace(/X/g, "&times;");
    },
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Morbit Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    initMorbitSolver: function () {
        this.cipherWidth = 2;
        this.setCharset('123456789');
    },
    getMorbitMorseMap: function () {
        return this.morbitMap;
    },
    setMorbitMorseMapEntry: function (entry, val) {
        this.morbitMap[entry] = val;
    },
    loadMorseSolver: function () {
        this.encodedString = this.cleanString($('#encoded').val());
        var res = this.build(this.encodedString);
        var tool = this;
        $("#answer").html(res);
        $("#analysis").each(function (i) {
            $(this).html(tool.analyze(tool.encodedString));
        });
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    },
    /*
     * Create an edit field for a dropdown
    */
    makeMorbitEditField: function (c) {
        var mselect = $('<select class="msli" data-char="' + c + '" id="m' + c + '"/>');
        var mreplaces = this.morbitReplaces.length;
        var selected = [];
        for (var i = 0; i < mreplaces; i++) {
            var text = this.morbitReplaces[i];
            var select = selected[text];
            text = this.normalizeHTML(text);
            $("<option />", { value: i, selected: select }).html(text).appendTo(mselect);
        }
        return mselect;
    },
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {number} val This is which element we are changing it to.  This is an index into the morbitReplaces table
     */
    updateMorbitSel: function (item, val) {
        console.log('updateMorbitSet item=' + item + ' val=' + val);
        var toswapwith = item;
        var newvalue = this.morbitReplaces[val];

        for (var key in this.morbitMap) {
            if (this.morbitMap.hasOwnProperty(key))
                if (this.morbitMap[key] === newvalue) {
                    toswapwith = key;
                    break;
                }
        }
        if (toswapwith !== item) {
            var swapval = this.morbitMap[item];
            this.morbitMap[item] = this.morbitMap[toswapwith];
            this.morbitMap[toswapwith] = swapval;
            this.UpdateFreqEditTable();
            this.load();
        }
    },

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Fractionated Morse Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    initFractionatedMorseSolver: function () {
        this.cipherWidth = 3;
        this.setCharset('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    },
    getFractionatedMorseMap: function () {
        return this.fractionatedMorseMap;
    },
    setFractionatedMorseMapEntry: function (entry, val) {
        this.fractionatedMorseMap[entry] = val;
    },
    /*
     * Create an edit field for a dropdown
    */
    makeFractionatedMorseEditField: function (c) {
        var mselect = $('<select class="msli" data-char="' + c + '" id="m' + c + '"/>');
        var mreplaces = this.fractionatedMorseReplaces.length;
        var selected = [];
        selected[this.fractionatedMorseMap[c]] = " selected";
        for (var i = 0; i < mreplaces; i++) {
            var text = this.fractionatedMorseReplaces[i];
            $("<option />", { value: text, selected: selected[text] }).html(this.normalizeHTML(text)).appendTo(mselect);
        }
        return mselect;
    },
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {number} val This is which element we are changing it to.  This is an index into the fractionatedMorseReplaces table
     */
    updateFractionatedMorseSel: function (item, val) {
        console.log('updateFractionatedMorseSel item=' + item + ' val=' + val);
        var toswapwith = item;

        for (var key in this.fractionatedMorseMap) {
            if (this.fractionatedMorseMap.hasOwnProperty(key))
                if (this.fractionatedMorseMap[key] === val) {
                    toswapwith = key;
                    break;
                }
        }
        if (toswapwith !== item) {
            var swapval = this.fractionatedMorseMap[item];
            this.fractionatedMorseMap[item] = this.fractionatedMorseMap[toswapwith];
            this.fractionatedMorseMap[toswapwith] = swapval;
            this.UpdateFreqEditTable();
            this.load();
        }
    },
    updateCheckerboardSel: function () {
        this.UpdateFreqEditTable();
    },
    UpdateFreqEditTable: function () {
        var tool = this;
        $(".freq").each(function (i) {
            $(this).html(tool.createFreqEditTable());
        });
        $(".alphabet").each(function (i) {
            $(this).html(tool.createAlphabetType());
        });
        this.attachHandlers();
    },
    /**
     * Set flag to 'chunk' input data string befre encoding.  Used in Patristocrat, 
     */
    setCipherType: function (cipherType) {
        if (cipherType == 'patristocrat') {
            console.log(cipherType+' -- set chunking.');
            this.chunkIt = true;
        }
        else if (cipherType === 'vigenere') {
            console.log('Make a nice vigenere...');
            $('.cipher-type').each(function () {
            $(this).html(CipherTool.layoutVigenere());
        });
        this.attachHandlers();
        }
    },
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Gromark Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /**
     * 
     */
    initGromarkSolver: function () {
        this.cipherWidth = 2;
    },
    /**
     * 
     * @param {string} str Input string to parse and generate the solver
     */
    buildGromarkSolver: function (str) {
        var res = "";
        var combinedtext = "";
        var prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        var posthead1 = '</tr></tbody></table><div class="repl" data-chars="';
        var posthead2 = '"></div></div>';
        var pre = prehead;
        var post = '';
        var i, len, c, piece, datachars;
        var offsets = [];
        var offpos = 0;
        var docwidth = $(document).width();
        var width = Math.floor(docwidth / 24);
        var remaining = width;
        var finalcheck = 99;
        var charset = this.getCharset().toUpperCase();
        this.freq = [];
        this.encodedString = '';

        // Make sure all white space is just a space
        str = str.replace(/\s+/g, ' ');
        // Get the leading digits 
        for (i = 0, len = str.length; i < len; i++) {
            c = str.substr(i, 1);
            if (c !== ' ') {
                if (!isNaN(c)) {
                    offsets[offpos++] = parseInt(c, 10);
                } else {
                    return '<div class="error">Gromark must start with 5 numeric digits - found ' + c + '</div>';
                }
            }
            if (offpos >= 5) {
                str = str.substr(i, len - 1);
                break;
            }
        }
        // Now we pull the single check digit off the end
        for (i = str.length - 1; i > 0; i--) {
            c = str.substr(i, 1);
            if (c !== ' ') {
                if (!isNaN(c)) {
                    finalcheck = parseInt(c, 10);
                    str = str.substr(1, i - 1);
                    break;
                }
                return '<div class="error">Gromark must end with single numeric check digit - found ' + c + '</div>';
            }
        }
        // Eliminate any leading and trailing white space to make it easier to work with
        str = str.replace(/^\s+|\s+$/g, "");
        offpos = -1;
        datachars = '';
        this.encodedString = '';

        // Now go through and get all the characters
        for (i = 0, len = str.length; i < len; i++) {
            c = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(c)) {
                offpos++;
                // Compute the running offset
                if (offpos >= 5) {
                    offsets[offpos] = (offsets[offpos - 5] + offsets[offpos - 4]) % 10;
                }
                piece = c + offsets[offpos];
                this.encodedString += piece;
                datachars += piece;
                // Remember the frequencies for the single character and the group
                if (isNaN(this.freq[piece])) {
                    this.freq[piece] = 0;
                }
                this.freq[piece]++;
                if (isNaN(this.freq[c])) {
                    this.freq[c] = 0;
                }
                this.freq[c]++;
                combinedtext += '<span data-char="' + piece + '">?</span>';
                c = pre + '<td><div class="slil">' + c + '<br/>' + offsets[offpos] + '</div>' +
                    '<input type="text" id="ti' + piece + '" class="sli" data-schar="' + c + '" data-char="' + piece + '" /></td>';

                pre = '';
            } else if (c !== ' ') {
                combinedtext += c;
                c = pre + '<td><div class="slil">' + c + '</div></td>';
                pre = '';
            } else {
                combinedtext += ' ';
                res += posthead1 + datachars + posthead2;
                datachars = '';
                pre = prehead;
            }
            res += c;
        }
        if (pre === '') {
            res += posthead1 + datachars + posthead2;
        }
        res += '<div class="ssum">' + combinedtext + '</div>';
        return res;
    },
    /**
     Creates the Frequency Table for a Gromark
     */
    createGromarkFreqEditTable: function () {
        var topdiv = $('<div/>');
        var table = $('<table/>').addClass("tfreq");
        var thead = $('<thead/>');
        var tbody = $('<tbody/>');
        var headrow = $('<tr/>');
        var freqrow;
        var replrow = $('<tr/>');
        var i, len, n, c;
        var charset = this.getCharset();

        headrow.append($('<th/>').addClass("topleft"));
        for (n = 0; n <= 9; n++) {
            freqrow = $('<tr/>');
            freqrow.append($('<th/>').text(n));
            for (i = 0, len = charset.length; i < len; i++) {
                c = charset.substr(i, 1).toUpperCase();
                if (n === 0) {
                    headrow.append($('<th/>').text(c));
                }
                freqrow.append($('<td id="f' + c + n + '"/>'));
            }
            if (n === 0) {
                thead.append(headrow);
            }
            thead.append(freqrow);
        }

        headrow = $('<tr/>');
        headrow.append($('<th/>').addClass("topleft"));
        freqrow = $('<tr/>');
        freqrow.append($('<th/>').text("Frequency"));
        replrow.append($('<th/>').text("Replacement"));
        for (i = 0, len = charset.length; i < len; i++) {
            c = charset.substr(i, 1).toUpperCase();
            headrow.append($('<th/>').text(c));
            freqrow.append($('<td id="f' + c + '"/>'));
            var td = $('<td/>');
            td.append(this.makeFreqEditField(c));
            replrow.append(td);
        }
        thead.append(headrow);
        tbody.append(freqrow);
        tbody.append(replrow);
        table.append(thead);
        table.append(tbody);
        topdiv.append(table);

        return topdiv;
    },
    /**
     * Change the encrypted character
     * @param {any} repchar Encrypted character to map against
     * @param {any} newchar New char to assign as decoding for the character
     */
    setGromarkChar: function (repchar, newchar) {
        if (typeof newchar === 'undefined') {
            return;
        }
        var charset = this.getSourceCharset();

        // If we came in with something like J5 instead of J, it means that they have typed
        // into the replacement section 
        // For example if we type the letter 'U' into V3 slot, should actually act as if they had typed a 'V' into the 'X' slot.
        //  Hence repchar="V3", newchar="U" needs to switch to be repchar="X" newchar="V"
        // We compute this by Taking the offset for the U and adding 3 getting to the X and we use the V for the replacement.
        if (repchar.length > 1) {
            var targetc = newchar // U in example
            newchar = repchar.substr(0, 1);  // V in example
            var roff = parseInt(repchar.substr(1, 1), 10);  // 3 in example
            repchar = (charset + charset).substr(charset.indexOf(targetc) + roff, 1);
            // Type A U into V3 should fill a V into the X slot.
        }
        newchar = newchar.toUpperCase();
        var dispchar = newchar;
        var fillchar = newchar;
        var pos = charset.indexOf(repchar);

        if (dispchar === '') {
            dispchar = '?';
            fillchar = this.replacement[repchar]; // the last character that was in this spot
        }
        this.replacement[repchar] = newchar;
        //console.log('setGromarkChar repchar=' + repchar + ' newchar=' + newchar + ' pos=' + pos + ' charset=' + charset);
        if (pos >= 0) {
            // Handle wrapping around by simply doubling the character set
            pos += charset.length;
            charset += charset;

            // First update the single letter instance
            $("input[data-char='" + repchar + "']").val(newchar);
            $('#f' + repchar).text(dispchar);

            // And we need to update all the offset ones to match
            for (var i = 0; i <= 9; i++) {
                var repl = '';
                if (newchar !== '') {
                    repl = charset.substr(pos - i, 1);
                }
                dispchar = repl;
                if (dispchar === '') {
                    dispchar = '?';
                }
                var piece = fillchar + i;
                $("input[data-char='" + piece + "']").val(repl);
                $("span[data-char='" + piece + "']").text(dispchar);
            }
            this.updateMatchDropdowns(repchar);
        }
    },
    /**
     * @param {string} reqstr String of items to apply
     */
    setGromarkMultiChars: function (reqstr) {
        //console.log('setGromarkMultiChars ' + reqstr);
        var i, len;
        this.holdupdates = true;
        for (i = 0, len = reqstr.length / 2; i < len; i++) {
            var repchar = reqstr.substr(i * 2, 1);
            var newchar = reqstr.substr(i * 2 + 1, 1);
            this.setGromarkChar(repchar, newchar);
        }
        this.holdupdates = false;
        this.updateMatchDropdowns('');
    },

    /*
     * Sorter to compare two string pattern entries
     */
    gmsort: function (a, b) {
        if (a.o < b.o) {
            return -1;
        } else if (a.o > b.o) {
            return 1;
        }
        return 0;
    },
    /**
     * @param {string} str String to generate a match down for
     * @returns {string} Html for a select
     */
    generateGromarkDropdown: function (str) {
        if (this.curlang === '') {
            return '';
        }
        var i, len;
        var matchstr = '';
        var keepadding = true;
        var repl = [];
        var matches = [];
        var used = [];
        var slen = str.length / this.cipherWidth;
        // First we need to find a pattern for the replacement that we can work with

        for (i = 0; i < slen; i++) {
            var piece = str.substr(i * this.cipherWidth, this.cipherWidth);
            var substitute = '';
            if (typeof this.gromarkRepl[piece] == 'undefined') {
                keepadding = false;
            } else {
                substitute = this.gromarkRepl[piece];
            }
            if (keepadding) {
                matchstr += substitute;
            }
            repl.push(substitute);
        }
        var pat = this.makeUniquePattern(matchstr);
        var patlen = pat.length;
        //  console.log('Searching for ' + pat + ' len=' + patlen + ' based on ' + matchstr + ' slen=' + slen);
        //  console.log(repl);

        for (var tpat in this.Frequent[this.curlang]) {
            if (this.Frequent[this.curlang].hasOwnProperty(tpat) && tpat.length === slen && tpat.substr(0, patlen) === pat) {
                var tmatches = this.Frequent[this.curlang][tpat];
                var added = 0;
                for (i = 0, len = tmatches.length; i < len; i++) {
                    var entry = tmatches[i];
                    if (this.isValidReplacement(entry[0], repl, used)) {
                        matches.push(entry);
                        added++;
                        if (added > 3) {
                            break;
                        }
                    }
                }
            }
        }
        // We have stacked all of the found matches.  Now we need to sort them
        matches.sort(this.gmsort)

        var mselect = $('<select/>').addClass('match');
        if (matches.length > 0) {
            var selectclass = '';
            var matched = false;
            var added = 0;

            for (i = 0, len = matches.length; i < len; i++) {
                var entry = matches[i];
                if (this.isValidReplacement(entry.t, repl, used)) {
                    if (!matched) {
                        selectclass = entry.c;
                    }
                    matched = true;
                    added++;
                    $('<option/>').addClass(entry.c).text(entry.t).appendTo(mselect);
                }
                if (matched && added > 9) {
                    break;
                }
            }
            if (added === 0) {
                selectclass = 'nopat';
            }
            mselect.addClass(selectclass);
        } else {
            mselect.addClass('nopat');
        }
        return mselect;
    },
    /**
     * @param {string} repchar Replacement character to limit updates to
     */
    updateGromarkMatchDropdowns: function (repchar) {
        var tool = this;
        if (this.holdupdates) {
            return;
        }
        this.cacheReplacements();
        this.saveGromarkReplacements();
        $("[data-chars]").each(function () {
            $(this).html(tool.generateGromarkDropdown($(this).attr('data-chars')));
        });
    },

    /**
     * Build a set of replacements so that we can quickly check against them
     */
    saveGromarkReplacements: function () {
        this.gromarkRepl = [];
        var i, n, len, charset;
        // Get the replacement character set and double it so that we can index past the beginning and wrap around to get the set again
        charset = this.getSourceCharset();
        len = charset.length;
        charset += charset;
        // Iterate through all of our characters
        for (i = 0; i < len; i++) {
            var c = charset.substr(i, 1);
            var repl = this.replacement[c];
            // See if we have a replacement for it.
            if (this.isValidChar(repl)) {
                // if we do have a replacement, we want to figure out what the corresponding characters map
                // to and then update that replacement table.
                for (n = 0; n <= 9; n++) {
                    var decodc = charset.substr(len + i - n, 1);
                    this.gromarkRepl[repl + n] = decodc;
                }
            }
        }
    },

    /**
     * @param {string} str String to match against
     * @param {string} gromark Gromark (of cipherWidth characters) to compute.
     * @return {Array.string} Array of mapping strings for each character
     */
    makeGromarkMap(str, gromark) {
        var i, len;
        var charset = this.getSourceCharset();
        var res = {};
        // Empty out the result so it can be readily used
        for (i = 0, len = charset.length; i < len; i++) {
            res[charset.substr(i, 1)] = '';
        }
        // Double the character set so we can get the wrapping for free
        charset += charset;
        for (i = 0, len = str.length; i < len; i++) {
            var c = str.substr(i, 1);
            var piece = gromark.substr(i * this.cipherWidth, this.cipherWidth);
            // Let's compute the value for the letter plus the offset 
            var offset = charset.indexOf(c) + parseInt(piece.substr(1, 1), 10);
            var repl = piece.substr(0, 1);
            res[charset.substr(offset, 1)] = repl;
        }
        // console.log('makeGromarkMap str=' + str + ' gromark=' + gromark);
        // console.log(res);
        return res;
    },
    /**
     * @param {string} tomatch String to match against
     * @param {string} gromark Gromark (of cipherWidth characters) to check.
     * @return {number} Indicates qualify of Gromark match. 0= inconsistent, 1=possible, 2=confirmed
     */
    checkGromark: function (tomatch, gromark) {
        if (tomatch.length * this.cipherWidth != gromark.length) {
            console.log('Invalid check comparing "' + tomatch + '"(' + tomatch.length + ') against "' + gromark + '"(' + gromark.length + ')');
            return 0;
        }
        var i, len;
        var charset = this.getSourceCharset();
        var sets = {};
        var matchlevel = 1;
        for (i = 0; i < tomatch.length; i++) {
            var c = tomatch.substr(i, 1);
            var piece = gromark.substr(i * this.cipherWidth, this.cipherWidth);
            // See if we already know that this letter actually maps to something.
            if (typeof this.gromarkRepl[piece] != 'undefined') {
                // This is already known to map to a letter.  Let's make sure we match the corresponding character
                if (this.gromarkRepl[piece] !== c) {
                    //console.log('Failed to match c=' + c + ' vs known[' + piece + ']=' + this.gromarkRepl[piece]);
                    return 0;
                }
            }
            // We don't map, so let's compute the value for the letter plus the offset 
            var offset = parseInt(piece.substr(1, 1), 10);
            var repl = piece.substr(0, 1);
            //console.log('Piece='+piece+' Repl=' + repl + ' offset=' + offset + ' delta='+charset.indexOf(c));
            offset += charset.indexOf(c);
            if (typeof sets[offset] != 'undefined') {
                if (sets[offset] != repl) {
                    //console.log('Already found another sets[' + offset + ']=' + sets[offset] + ' vs ' + repl);
                    return 0;
                }
                matchlevel = 2;
            }
            if (typeof sets[repl] != 'undefined') {
                if (sets[repl] != offset) {
                    // console.log('Already found another sets[' + repl + ']=' + sets[repl] + ' vs ' + offset);
                    return 0;
                }
                matchlevel = 2;
            }
            sets[repl] = offset;
            sets[offset] = repl;
        }
        return matchlevel;
    },
    /**
     * @param {string} str String to search for.  Note that this runs through all the entries looking for a possible match
     */
    findGromark: function (str) {
        var tosearch = this.minimizeString(str);
        var gromarklen = tosearch.length * this.cipherWidth;
        var limit = (this.encodedString.length / this.cipherWidth) - tosearch.length;
        var charset = this.getSourceCharset();
        var len = charset.length;
        var i, j;
        var res = '';

        this.saveGromarkReplacements();
        //console.log('Searching for :' + tosearch + ' in ' + this.encodedString + ' limit=' + limit);
        for (i = 0; i < limit; i++) {
            var gromark = this.encodedString.substr(i * this.cipherWidth, gromarklen);
            var matchlevel = this.checkGromark(tosearch, gromark);
            if (matchlevel > 0) {
                // Now go through and figure out what letters need to be picked to make this
                var mappings = this.makeGromarkMap(tosearch, gromark);
                var maptable = '';
                var mapfix = '';
                for (j = 0; j < len; j++) {
                    var c = charset.substr(j, 1);
                    var mapc = mappings[c];
                    maptable += '<td>' + mapc + '</td>';
                    if (mapc !== '') {
                        mapfix += c + mapc;
                    }
                }
                res += '<tr><td>' + i + '</td><td>' + matchlevel + '</td><td class="dapply" onclick="CipherTool.setMultiChars(\'' + mapfix + '\');">' + gromark + '</td>' + maptable + '</tr>';
            }
        }
        if (res === '') {
            res = '<br/><b>Not Found</b>';
        } else {
            var tres = '<table class="mfind"><thead><tr><th>Pos</th><th>Type</th><th>Gromark</th>';
            for (i = 0; i < len; i++) {
                tres += '<th>' + charset.substr(i, 1) + '</th>';
            }
            res = tres + '</tr></thead>' +
                '<tbody>' + res + '</tbody>' +
                '</table>';
        }
        $(".findres").html('Searching for ' + str + res);
        this.attachHandlers();
    },
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Checkerboard Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    initCheckerboardSolver: function () {
        this.cipherWidth = 2;
        this.rowcharset = "     ";
        this.colcharset = "     ";
    },
    setrowcolset: function (rowcharset, colcharset, forceorder) {
        var changed = false;
        var i, len, c;

        rowcharset = rowcharset.toUpperCase();
        colcharset = colcharset.toUpperCase();

        this.rowcharset = this.rowcharset.trim();
        this.colcharset = this.colcharset.trim();

        if (rowcharset !== this.rowcharset) {
            if (forceorder) {
                changed = true;
                this.rowcharset = rowcharset;
            } else {
                for (i = 0, len = rowcharset.length; i < len; i++) {
                    c = rowcharset.substr(i, 1);
                    if (this.rowcharset.indexOf(c) < 0) {
                        this.rowcharset += c;
                        changed = true;
                    }
                }
            }
        }

        if (colcharset !== this.colcharset) {
            if (forceorder) {
                changed = true;
                this.colcharset = colcharset;
            } else {
                for (i = 0, len = colcharset.length; i < len; i++) {
                    c = colcharset.substr(i, 1);
                    if (this.colcharset.indexOf(c) < 0) {
                        this.colcharset += c;
                        changed = true;
                    }
                }
            }
        }

        if (this.rowcharset.length < 5) {
            this.rowcharset += "     ".substr(0, 5 - this.rowcharset.length);
        }
        if (this.colcharset.length < 5) {
            this.colcharset += "     ".substr(0, 5 - this.colcharset.length);
        }

        if (changed) {
            this.UpdateFreqEditTable();
            this.load();
        }
    },
    buildCheckerboardSolver: function (str) {
        var res = "";
        var combinedtext = "";
        var prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        var posthead = '</tr></tbody></table></div>';
        var pre = prehead;
        var post = '';
        var i, len;
        var firstchar = '';
        var firstset = '';
        var secondset = '';
        var docwidth = $(document).width();
        //docwidth = 9 * 24 * cipherwidth;
        var width = Math.floor(docwidth / 24);
        var remaining = width;
        var charset = this.getCharset().toUpperCase();
        this.freq = [];

        for (i = 0, len = str.length; i < len; i++) {
            var t = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(t)) {
                if (firstchar === '') {
                    firstchar = t;
                    if (firstset.indexOf(t) < 0) {
                        firstset += t;
                    }
                    t = '';
                } else {
                    var piece = firstchar + t;
                    if (secondset.indexOf(t) < 0) {
                        secondset += t;
                    }
                    if (isNaN(this.freq[piece])) {
                        this.freq[piece] = 0;
                    }
                    this.freq[piece]++;

                    combinedtext += '<span data-char="' + piece + '">?</span>';
                    t = pre + '<td><div class="slil">' + firstchar + '<br/>' + t + '</div>' +
                        '<input type="text" id="ti' + piece + '" class="sli" data-char="' + piece + '" /></td>';

                    pre = '';
                    remaining--;
                    firstchar = '';
                }
            } else if (t !== ' ' && t !== '\n' && t !== '\r') {
                combinedtext += t;
                t = pre + '<td><div class="slil">' + t + '</div></td>';
                pre = '';
            }
            res += t;
            if (remaining === 0) {
                res += posthead;
                pre = prehead;
                remaining = width;
            }
        }
        if (pre === '') {
            res += posthead;
        }
        res += '<div class="ssum">' + combinedtext + '</div>';
        // We need to retain any existing character set order
        this.setrowcolset(firstset, secondset, false);
        return res;
    },
    /*
    * Creates an HTML table to display the frequency of characters
    */
    createCheckerboardFreqEditTable: function () {
        var topdiv = $('<div/>');
        var inputdiv = $('<div/>', { class: "idiv" });
        var table = $('<table/>').addClass("ckfreq");
        var thead = $('<thead/>');
        var tbody = $('<tbody/>');
        var headrow = $('<tr/>');
        var row, rowlen, col, collen;
        rowlen = this.rowcharset.length;
        collen = this.colcharset.length;
        // console.log('createCheckerboardFreqEditTable: rowcharset=' + this.rowcharset + ' colcharset=' + this.colcharset);
        headrow.append($('<th/>').addClass("topleft"));
        for (col = 0; col < collen; col++) {
            headrow.append($('<th/>').text(this.colcharset.substr(col, 1).toUpperCase()));
        }
        thead.append(headrow);

        inputdiv.append($('<label/>', { for: "rowcharset", text: "Row Characters" }));
        inputdiv.append($('<input/>', { type: "text", class: "csc", id: "rowcharset", value: this.rowcharset }));
        inputdiv.append($('<label/>', { for: "colcharset", text: "Column Characters" }));
        inputdiv.append($('<input/>', { type: "text", class: "csc", id: "colcharset", value: this.colcharset }));
        topdiv.append(inputdiv);

        for (row = 0; row < rowlen; row++) {
            var replrow = $('<tr/>');
            var rowc = this.rowcharset.substr(row, 1).toUpperCase();
            replrow.append($('<th/>').text(rowc));
            for (col = 0; col < collen; col++) {
                var colc = this.colcharset.substr(col, 1).toUpperCase();
                var piece = rowc + colc;
                var freq = this.freq[piece];
                var td, input;
                if (typeof freq === 'undefined') {
                    freq = '';
                }
                td = $('<td/>').text(freq);
                td.append($('</br>'));
                td.append(this.makeFreqEditField(piece));
                replrow.append(td);
            }
            tbody.append(replrow);
        }
        table.append(thead);
        table.append(tbody);
        topdiv.append(table);

        return topdiv;
    },
    loadCheckerboardSolver: function () {
        var encoded = this.cleanString($('#encoded').val());
        var res = this.build(encoded);
        var tool = this;
        $("#answer").html(res);
        $("#analysis").each(function (i) {
            $(this).html(tool.analyze(encoded));
        });

        // Show the update frequency values
        this.UpdateFreqEditTable();
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    },
    findCheckerboard: function (str) {
        var encoded = this.minimizeString($('#encoded').val());
        var extra = '';
        var res = '';
        var i;
        str = str.toUpperCase();
        //
        // Look for all possible matches for the pattern.
        res = this.searchPattern(encoded, this.cipherWidth, str, 1);
        if (res === '') {
            res = '<br/><b>Not Found</b>';
        } else {
            var charset = this.getCharset();
            var tres = '<table class="mfind"><thead><tr><th>Pos</th><th>Match</th>';
            for (i = 0; i < charset.length; i++) {
                var key = charset.substr(i, 1);
                tres += '<th>' + key + '</th>';
            }
            //   res +=             < ul > ' + res + '</ul > ';
            res = tres + '</tr></thead><tbody>' + res + '</tbody></table>';
        }

        $(".findres").html('Searching for ' + str + ' as ' + this.normalizeHTML(str) + res);
    },
    /**
     * @param {string} str String to be enqoted
     * @return {string} Quoted string
     */

    quote: function (str) {
        if (typeof str === 'undefined') {
            return '\'\'';
        }
        return '\'' + str.replace(/(['"])/g, "\\$1") + '\'';
    },
    /**
     * @param {string} lang 2 character Language to dump language template for 
     */
    dumpLang: function (lang) {
        var res = '';
        var extra = '';
        res = 'CipherTool.Frequent[' + this.quote(lang) + ']={';
        for (var pat in this.Frequent[lang]) {
            if (this.Frequent[lang].hasOwnProperty(pat) && pat !== '') {
                res += extra + '\'' + pat + '\':[';
                var i, len;
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
    },
    setLangDropdown: function (lselect) {
        lselect.html($("<option />", { value: '' }).text('--Select a language--'));
        for (var lang in this.langmap) {
            if (this.langmap.hasOwnProperty(lang)) {
                $("<option />", { value: lang }).text(this.langmap[lang]).appendTo(lselect);
            }
        }
        var tool = this;
        lselect.change(function () {
            tool.loadLanguage($(this).val());
        });
    },
    loadLanguage: function (lang) {
        var tool = this;
        $(".langstatus").text("Attempting to load " + tool.langmap[lang] + '...');
        $.getScript("Languages/" + lang + ".js", function (data, textStatus, jqxhr) {
            $(".langstatus").text('');
            tool.curlang = lang;
            tool.setCharset(tool.langcharset[lang]);
            tool.updateMatchDropdowns('');
        }).fail(function (jqxhr, settings, exception) {
            console.log("Complied language file not found for " + lang + ".js");
            tool.loadRawLanguage(lang);
        });
    },
    loadRawLanguage: function (lang) {
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
            charset = charset.toUpperCase()
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
                    } else if (i < 1000) {
                        elem[3] = 1;
                    } else if (i < 2000) {
                        elem[3] = 3;
                    } else if (i < 5000) {
                        elem[3] = 4;
                    } else {
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
    },
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Aristocrat/Patristocrat Encoder
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    genMap: function () {
        var val = $('input[name=enctype]:checked').val();
        var keyword = $('#keyword').val();
        var offset = $('#offset').spinner("value");
        var keyword2 = $('#keyword2').val();
        var offset2 = $('#offset2').spinner("value");
        var shift = $('#shift').spinner("value");
        if (val === 'k1') {
            this.genAlphabetK1(keyword, offset);
        } else if (val === 'k2') {
            this.genAlphabetK2(keyword, offset);
        } else if (val === 'k3') {
            this.genAlphabetK3(keyword, offset, shift);
        } else if (val === 'k4') {
            this.genAlphabetK4(keyword, offset, keyword2, offset2);
        } else {
            this.genAlphabetRandom();
        }
    },

    /**
     * Compute the replacement set for the the characters on an encryption
     * Note that we actually have to reverse them because the ciphers class
     * is mostly built around decrypting
     * @param {string} repl Replacement character set
     * @param {string} cset Source character set
     */
    setReplacement: function (cset, repl) {
        var i, len, errors;
        errors = '';
        var charset = this.getCharset();
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
    },
    genAlphabetK1: function (keyword, offset) {
        var repl = this.genKstring(keyword, offset);
        this.setReplacement(this.getCharset(), repl);
    },
    genAlphabetK2: function (keyword, offset) {
        var repl = this.genKstring(keyword, offset);
        this.setReplacement(repl, this.getCharset());
    },
    genAlphabetK3: function (keyword, offset, shift) {
        var repl = this.genKstring(keyword, offset);
        var cset = repl.substr(shift) + repl.substr(0, shift);
        this.setReplacement(cset, repl);
    },
    genAlphabetK4: function (keyword, offset, keyword2, offset2) {
        var cset = this.genKstring(keyword, offset);
        var repl = this.genKstring(keyword2, offset2);
        this.setReplacement(cset, repl);
    },
    genKstring: function (keyword, offset) {
        var unasigned = this.getCharset();
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
    },
    // Gets a random replacement character from the remaining set of unassigned
    // characters
    getRepl: function () {
        var sel = Math.floor(Math.random() * this.unasigned.length);
        var res = this.unasigned.substr(sel, 1);
        this.unasigned = this.unasigned.substr(0, sel) + this.unasigned.substr(sel + 1);
        return res;
    },
    // Generates a random replacement set of characters
    genAlphabetRandom: function () {
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
        } else {
            replacement += this.unasigned;
        }
        this.setReplacement(this.getCharset(), replacement);
    },

    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.
     * @param {string} str String to be encoded
     * @returns {string} HTML of encoded string to display
     */
    buildEncoder: function(str) {
        var res = $('<div>');
        var charset = this.getCharset();
        var i, len;
        var revRepl = [];
        var encodeline = "";
        var decodeline = "";
        var lastsplit = -1;
        var splitc = '';
        // Build a reverse replacement map so that we can encode the string
        for (var repc in this.replacement) {
            if (this.replacement.hasOwnProperty(repc)) {
                revRepl[this.replacement[repc]] = repc; 
            }
        }
        // Zero out the frequency table 
        this.freq = [];
        for (i = 0, len = charset.length; i < len; i++) {
            this.freq[charset.substr(i, 1).toUpperCase()] = 0;
        }
        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (i = 0, len = str.length; i < len; i++) {
            var t = str.substr(i, 1).toUpperCase();
            decodeline += t;
            // Make sure that this is a valid character to map from
            var pos = charset.indexOf(t);
            if (pos >= 0) {
                t = revRepl[t];
                if (isNaN(this.freq[t])) {
                   this.freq[t] = 0;
              }
              this.freq[t]++;
            } else {
                // This is a potential split position, so remember it
                lastsplit = decodeline.length;
            }
            encodeline += t;
            // See if we have to split the line now
            if (encodeline.length >= this.maxEncodeWidth) {
                if (lastsplit === -1) {
                    res.append($('<div>', {class: "TOSOLVE"}).text(encodeline));
                    res.append($('<div>', {class: "TOANSWER"}).text(decodeline));
                    encodeline = "";
                    decodeline = "";
                    lastsplit = -1;
                } else {
                    var encodepart = encodeline.substr(0,lastsplit);
                    var decodepart = decodeline.substr(0,lastsplit);
                    encodeline = encodeline.substr(lastsplit);
                    decodeline = decodeline.substr(lastsplit);
                    res.append($('<div>', {class: "TOSOLVE"}).text(encodepart));
                    res.append($('<div>', {class: "TOANSWER"}).text(decodepart));
                }
            }
        }
        // And put together any residual parts
        if (encodeline.length > 0) {
            res.append($('<div>', {class: "TOSOLVE"}).text(encodeline));
            res.append($('<div>', {class: "TOANSWER"}).text(decodeline));
        }
        return res.html();
    },
    /**
     * Initializes the encoder. 
     * We don't want to show the reverse replacement since we are doing an encode
     * @param {string} lang Language to select (EN is the default)
     */
    initEncoder: function(lang) {
        this.ShowRevReplace = false;
        this.curlang = lang;
        this.setCharset(this.langcharset[lang]);
    },
    /**
     * Convert the text to chunks of (chunkSize) characters separated
     * by a space.  Just keep characters that are in the character set and 
     * remove all punctuation, etc.
     * Note: the string could be toUpperCase()'d here, but it is done later.
     * @returns chunked input string
     */
    chunk: function(inputString, chunkSize) {
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
    },
    /**
     * Loads up the values for the encoder
     */
    loadEncoder: function () {
        this.hideRevReplace = true;
        var encoded = this.cleanString($('#toencode').val());
        /*
        * If it is characteristic of the cipher type (e.g. patristocrat),
        * rebuild the string to be encoded in to five character sized chunks.
        */
        if (this.chunkIt) {
            encoded = this.chunk(encoded, 5);
        }
        $(".err").text('');
        this.genMap();
        var res = this.build(encoded);
        var tool = this;
        $("#answer").html(res);

        /* testStrings */
        for (var i = 0; i < this.testStrings.length; i++) {
            var chi = this.CalculateChiSquare(this.testStrings[i]);
            var teststr = this.cleanString(this.testStrings[i]);
            var l = teststr.length;
            console.log(l+'`'+chi+'`'+teststr);
        }

        var chi = this.CalculateChiSquare(encoded);
        
        var chitext = '';
        if (!isNaN(chi)) {
            chitext = "Chi-Square Value="+chi.toFixed();
            if (chi < 20) {
                chitext += ' [Easy]';
            } else if (chi < 30) {
                chitext += ' [Medium]';
            } else if (chi < 40) {
                chitext += ' [Medium Hard]';
            } else if (chi < 50) {
                chitext += ' [Difficult]';
            } else {
                chitext += ' [Extremely Difficult]';
            }
            chitext += ' Length='+encoded.length;
            if (encoded.length < 60) {
                chitext += ' [Too Short]';
            } else if (encoded.length < 80) {
                chitext += ' [Short]';
            } else if (encoded.length > 120) {
                chitext += ' [Too Long]';
            } else if (encoded.length > 100) {
                chitext += ' [Long]';
            }
        }
        
        $("#chi").text(chitext);
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    },

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Vigenere Encoder
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    layoutVigenere: function() {
        var operationChoice = $('<div>');
        var label = $('<label>', { for: 'ops' }).text('Operation');
        operationChoice.append(label);

        var radioBox = $('<div>', { id: 'ops', class: 'ibox'});
        radioBox.append($('<input>', { id: 'encode', type: 'radio', name: 'operation', value: 'encode', checked: 'checked' }));
        radioBox.append($('<label>', { for: 'encode', class: 'rlab'}).text('Encode'));
        radioBox.append($('<input>', { id: 'decode', type: 'radio', name: 'operation', value: 'decode' }));
        radioBox.append($('<label>', { for: 'decode', class: 'rlab'}).text('Decode'));

        
        operationChoice.append(radioBox);

        return operationChoice.html();
    },
    /**
     * Set vigenere encode or decode mode
     */
    setVigenereInputs: function() {
        var operation = $('input[name=operation]:checked').val();
        if (operation === 'encode') {
            // zero the blocksize spinner and show it
            $(':input[id=blocksize]').spinner('value', 0);
            $('div[id=blocksize]').val('');
            $('div[id=blocksize]').show();            
            // Change the button label to 'Encode'
            $(':button').button('option', 'label', 'Encode')
            this.doEncoding = true;

        } else {
            // During decode, message format will not be changed.
            $('div[id=blocksize]').hide();
            // Change button label to 'Decode'
            $(':button').button('option', 'label', 'Decode')
            this.doEncoding = false;
        }
        // Clear message and answer, leave key alone--for re-use.
        $('textarea[id=inputdata]').val('');
        $(".ans").text('');
    },

    buildVigenere: function (msg, key) {
        var i;
        var charset = this.getCharset();
        var message = '';
        var keyIndex = 0;
        var keyString = '';
        var cipher = '';
        var result = $('<div>');
        var msgLength = msg.length;
        var keyLength = key.length;
        var lastSplit = -1;
        var c = '';

//        if (msgLength > keyLength) {
            var factor = (msgLength / keyLength).toFixed(0);
            for (i = 0; i < factor; i++) {
                keyString = keyString.concat(key);
            }
            keyString += key.substr(0, msgLength % keyLength);
//        }
        for (i = 0; i < msgLength; i++) {
            var messageChar = msg.substr(i, 1).toUpperCase();
            var m = charset.indexOf(messageChar);
            if (m >= 0) {

                var keyChar = keyString.substr(keyIndex, 1).toUpperCase();
                var k = charset.indexOf(keyChar);
                while (k < 0) {
                    keyIndex++;
                    keyChar = keyString.substr(keyIndex, 1).toUpperCase();
                    k = charset.indexOf(keyChar);
                }

                message += messageChar;
                // For vigenere...this is the meat.
                if (this.doEncoding) {
                    // use this to encode.
                    c = (m + k) % 26;
                } else {
                    // use this to decode.
                    c = (m - k);
                }
                // The substr() basically does modulus with the negative offset
                // in the decode case.  Thanks JavaScript!
                cipher += charset.substr(c, 1);
                keyIndex++;
            }
            else {
                message += messageChar;
                cipher += messageChar;
                lastSplit = cipher.length;
                continue;
            }
            if (message.length >= this.maxEncodeWidth) {
                if (lastSplit === -1) {
                    result.append($('<div>', {class: "TOSOLVE"}).text(message)); 
                    result.append($('<div>', {class: "TOANSWER"}).text(cipher));
                    message = '';
                    cipher = '';
                    lastSplit = -1;
                }
                else {
                    var messagePart = message.substr(0, lastSplit);
                    var cipherPart = cipher.substr(0, lastSplit);
                    message = message.substr(lastSplit);
                    cipher = cipher.substr(lastSplit);
                    result.append($('<div>', {class: "TOSOLVE"}).text(messagePart));
                    result.append($('<div>', {class: "TOANSWER"}).text(cipherPart));

                }
            }
        }
        if (message.length > 0) {
            result.append($('<div>', {class: "TOSOLVE"}).text(message));
            result.append($('<div>', {class: "TOANSWER"}).text(cipher));
        }


        return result.html();
    },
    /**
     * Loads up the values for vigenere 
     */
    loadVigenere: function () {
        var encoded = this.cleanString($('#inputdata').val());
        /*
        * If it is characteristic of the cipher type (e.g. patristocrat),
        * rebuild the string to be encoded in to five character sized chunks.
        */
        var blockSize = parseInt($('input[id=blocksize').val());
        if (blockSize > 0 && blockSize < this.maxEncodeWidth) {
            encoded = this.chunk(encoded, blockSize);
        }

        var key = this.cleanString($('#keystring').val());
        $('#err').text('');
        var res = this.build(encoded, key);
        $('#answer').html(res);
        this.attachHandlers();
    },
    /**
     * Initializes the encoder. 
     * We don't want to show the reverse replacement since we are doing an encode
     */
    initAffine: function() {
        this.ShowRevReplace = false;
        var affineCheck = {};
        this.affineCheck['p'] = -1;
        this.affineCheck['q'] = -1;
        this.affineCheck['r'] = -1;
        this.affineCheck['s'] = -1;
        $("[id='solve']").prop('disabled', true);
        $("[id='solve']").prop('value', 'Select 2 hint letters');
        console.log('Init...'+this.affineCheck['p']);
    },
    
    buildAffine: function (msg, a, b) {
        var i;
        var charset = this.getCharset();
        var message = '';
        var cipher = '';
        var result = $('<div>');
        var msgLength = msg.length;        
        var lastSplit = -1;
        var c = '';

        var table = $('<table/>').addClass("tfreq");
        var tableBody = $('<tbody/>');
        var messageRow = $('<tr/>');
        var cipherRow = $('<tr/>');

        for (i = 0; i < msgLength; i++) {
            var messageChar = msg.substr(i, 1).toUpperCase();
            var cipherChar = '';
            var m = charset.indexOf(messageChar);
            if (m >= 0) {

                message += messageChar;
                cipherChar = this.affinechar(a, b, messageChar);
                cipher += cipherChar;
            }
            else {
                message += messageChar;
                cipher += messageChar;
                lastSplit = cipher.length;
                continue;
            }

            messageRow.append($('<td id="m'+i+'"/>').addClass("TOANSWER").text(messageChar));
            cipherRow.append($('<td id="'+i+'"/>').addClass("TOSOLVE").text(cipherChar));

/*
            if (message.length >= this.maxEncodeWidth) {
                if (lastSplit === -1) {
                    result.append($('<div>', {class: "TOSOLVE"}).text(message)); 
                    result.append($('<div>', {class: "TOANSWER"}).text(cipher));
                    message = '';
                    cipher = '';
                    lastSplit = -1;
                }
                else {
                    var messagePart = message.substr(0, lastSplit);
                    var cipherPart = cipher.substr(0, lastSplit);
                    message = message.substr(lastSplit);
                    cipher = cipher.substr(lastSplit);
                    result.append($('<div>', {class: "TOSOLVE"}).text(messagePart));
                    result.append($('<div>', {class: "TOANSWER"}).text(cipherPart));
                }
            }
*/            
        }
        if (message.length > 0) {
            tableBody.append(cipherRow);
            tableBody.append(messageRow);
            //result.append($('<div>', {class: "TOSOLVE"}).text(message));
            //result.append($('<div>', {class: "TOANSWER"}).text(cipher));
        }
        table.append(tableBody);

        //return result.html();
        return table;
    },
    solveIt: function(m1, c1, m2, c2) {
        var answer = 'Can\'t solve.'

        var c = c1 - c2;
        var m = m1 - m2;

        while (m < 0) {
            m += 26;
        }

        // The reality is that A can only be one of: 1, 3, 5, 7, 9, 11,
        // 15, 17, 19, 21, 23, 25.  B will be between 0 and 25.

        while (((c < 0) || (c % m !== 0)) && c < 626) {
            c += 26;
        }
        var A = c/m;
        console.log('A='+A);
        // if A not in the list, return answer.
        if ((A % 2 !== 1) || (A < 1) || (A > 25)) {
            return answer;
        }
        
        var B = (c1 - (A * m1)) % 26;
        while ( B < 0) {
            B += 26;
        }

        return 'A = '+A+'; B = '+B;
    },

    loadAffine: function() {
        var charset = this.getCharset();
        var atxt = $('#a').spinner("value");
        var btxt = $('#b').spinner("value");
        var a = parseInt(atxt);
        var b = parseInt(btxt);

        if (!this.iscoprime(a)) {
            console.log('not coprime');
            $('#err').text('A value of ' + a + ' is not coprime with ' + charset.length);
            return '';
        }

        var toencode = this.cleanString($('#toencode').val());
        console.log('a=' + a + ' b=' + b + ' encode=' + toencode);
        var res = this.build(toencode, a, b);
        $("#answer").html(res);
        
        $("td").click(function() {            
            console.log("clicked "+$(this).get);
            var id = $(this).attr('id');
            console.log("id = "+id);
//            if ($('td#'+id+'.TOSOLVE').getClass() === "TOSOLVE") {
//                console.log("top clicked");
//            }
//            else {
//                console.log("bottom clicked");
//            }

            console.log("other = "+$('td#'+id+'.TOSOLVE').text()+" nother = "+$('td#'+id+'.TOANSWER').text())
            // change the style
            var clickedId = CipherTool.affineCheck['olderId'];
            if (clickedId !== -1) {
                // turn new click blue, reset old click for TOSOLVE
                $('td#'+clickedId+'.TOSOLVECLICK').removeClass("TOSOLVECLICK").addClass("TOSOLVE");
            }
            $('td#'+id+'.TOSOLVE').removeClass("TOSOLVE").addClass("TOSOLVECLICK");
            // turn 
            CipherTool.affineCheck['q'] = CipherTool.affineCheck['p'];
            CipherTool.affineCheck['s'] = CipherTool.affineCheck['r'];
            CipherTool.affineCheck['p'] = charset.indexOf($('td#m'+id+'.TOANSWER').text());
            CipherTool.affineCheck['r'] = charset.indexOf($('td#'+id+'.TOSOLVECLICK').text());
            CipherTool.affineCheck['olderId'] = CipherTool.affineCheck['oldId']
            CipherTool.affineCheck['oldId'] = parseInt(id);
            
            if (CipherTool.affineCheck.p !== -1 && CipherTool.affineCheck.q !== -1) {
                //solve it
                console.log('solve: ')
                var sol = CipherTool.solveIt(CipherTool.affineCheck['p'], CipherTool.affineCheck['r'], 
                CipherTool.affineCheck['q'], CipherTool.affineCheck['s']);
                var expected = 'A = '+$("#a").val()+'; B = '+$("#b").val()
                if (sol === expected ) {
                    console.log('showing button');
                    $("[id='solve']").prop('disabled', false);
                    $("[id='solve']").prop('value', 'Display Solution');
                }
                else {
                    console.log('hiding button');
                    $("[id='solve']").prop('disabled', true);
                    $("[id='solve']").prop('value', 'Indeterminate Solution');
                }
                //$("#solve").text(sol);
            }
        });

        //var sol = solveIt(18, 14, 7, 5);
        
/*
        var res = "";
        $('#err').text('');
        console.log('is coprime');
        for (var i = 0, len = str.length; i < len; i++) {
            var t = affinechar(a, b, str.substr(i, 1));
            res += t;
        }
        return res;
        var encoded = this.cleanString($('#inputdata').val());
*/        
        /*
        * If it is characteristic of the cipher type (e.g. patristocrat),
        * rebuild the string to be encoded in to five character sized chunks.
        */
/*        
        var blockSize = parseInt($('input[id=blocksize').val());
        if (blockSize > 0 && blockSize < this.maxEncodeWidth) {
            encoded = this.chunk(encoded, blockSize);
        }
        var key = this.cleanString($('#keystring').val());
        $('#err').text('');
        var res = this.build(encoded, a, b);
        $('#answer').html(res);
        this.attachHandlers();
*/        
    },
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    *
    * Command mappings - this basically implements morphing this class so that it can operate on different cihper types
    * While this might make sense to do this as class with subclasses, it makes it hard for the object to simultaneously
    * solve with multiple cipher types.
    *
    * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    CipherMappings: {
        Morbit: {
            init: 'initMorbitSolver',
            normalizeHTML: 'normalizeMorseHTML',
            createFreqEditTable: 'createNormalFreqEditTable',
            load: 'loadMorseSolver',
            reset: 'resetSolver',
            build: 'buildMorseSolver',
            makeFreqEditField: 'makeMorbitEditField',
            updateSel: 'updateMorbitSel',
            getMorseMap: 'getMorbitMorseMap',
            setMorseMapEntry: 'setMorbitMorseMapEntry',
            setChar: 'setStandardChar',
            setMultiChars: 'setMorseMultiChars',
            updateMatchDropdowns: 'updateStandardMatchDropdowns',
            findPossible: 'findMorse'
        },
        FractionatedMorse: {
            init: 'initFractionatedMorseSolver',
            normalizeHTML: 'normalizeMorseHTML',
            createFreqEditTable: 'createNormalFreqEditTable',
            load: 'loadMorseSolver',
            reset: 'resetSolver',
            build: 'buildMorseSolver',
            makeFreqEditField: 'makeFractionatedMorseEditField',
            updateSel: 'updateFractionatedMorseSel',
            getMorseMap: 'getFractionatedMorseMap',
            setMorseMapEntry: 'setFractionatedMorseMapEntry',
            setChar: 'setStandardChar',
            setMultiChars: 'setMorseMultiChars',
            updateMatchDropdowns: 'updateStandardMatchDropdowns',
            findPossible: 'findMorse'
        },
        Checkerboard: {
            init: 'initCheckerboardSolver',
            normalizeHTML: 'normalizeHTML',
            createFreqEditTable: 'createCheckerboardFreqEditTable',
            load: 'loadCheckerboardSolver',
            reset: 'resetSolver',
            build: 'buildCheckerboardSolver',
            makeFreqEditField: 'makeEditField',
            updateSel: 'updateCheckerboardSel',
            setChar: 'setStandardChar',
            setMultiChars: 'setStandardMultiChars',
            updateMatchDropdowns: 'updateStandardMatchDropdowns',
            findPossible: 'findCheckerboard'
        },
        Gromark: {
            init: 'initGromarkSolver',
            normalizeHTML: 'normalizeHTML',
            createFreqEditTable: 'createGromarkFreqEditTable',
            load: 'loadSolver',
            reset: 'resetSolver',
            build: 'buildGromarkSolver',
            makeFreqEditField: 'makeEditField',
            updateSel: 'updateCheckerboardSel',
            setChar: 'setGromarkChar',
            setMultiChars: 'setGromarkMultiChars',
            updateMatchDropdowns: 'updateGromarkMatchDropdowns',
            findPossible: 'findGromark'
        },
        Xenocrypt: {
            init: 'init',
            normalizeHTML: 'normalizeHTML',
            createFreqEditTable: 'createNormalFreqEditTable',
            load: 'loadSolver',
            reset: 'resetSolver',
            build: 'buildSolver',
            makeFreqEditField: 'makeEditField',
            updateSel: 'updateStandardSel',
            setChar: 'setStandardChar',
            setMultiChars: 'setStandardMultiChars',
            updateMatchDropdowns: 'updateStandardMatchDropdowns',
            findPossible: 'findStandard'
        },
        Standard: {
            init: 'init',
            normalizeHTML: 'normalizeHTML',
            createFreqEditTable: 'createNormalFreqEditTable',
            load: 'loadSolver',
            reset: 'resetSolver',
            build: 'buildSolver',
            makeFreqEditField: 'makeEditField',
            updateSel: 'updateStandardSel',
            setChar: 'setStandardChar',
            setMultiChars: 'setStandardMultiChars',
            updateMatchDropdowns: 'updateStandardMatchDropdowns',
            findPossible: 'findStandard'
        },
        Encoder: {
            init: 'initEncoder',
            normalizeHTML: 'normalizeHTML',
            createFreqEditTable: 'createNormalFreqEditTable',
            load: 'loadEncoder',
            reset: 'resetSolver',
            build: 'buildEncoder',
            makeFreqEditField: 'makeViewField',
            updateSel: 'updateStandardSel',
            setChar: 'setStandardChar',
            setMultiChars: 'setStandardMultiChars',
            updateMatchDropdowns: 'updateStandardMatchDropdowns',
            findPossible: 'findStandard'
        },
        Vigenere: {
            init: 'initEncoder',
            normalizeHTML: 'normalizeHTML',
            createFreqEditTable: 'createNormalFreqEditTable',
            load: 'loadVigenere',
            reset: 'resetSolver',
            build: 'buildVigenere',
            makeFreqEditField: 'makeViewField',
            updateSel: 'updateStandardSel',
            setChar: 'setStandardChar',
            setMultiChars: 'setStandardMultiChars',
            updateMatchDropdowns: 'updateStandardMatchDropdowns',
            findPossible: 'findStandard'
        },
        Affine: {
            init: 'initAffine',
            normalizeHTML: 'normalizeHTML',
            createFreqEditTable: 'createNormalFreqEditTable',
            load: 'loadAffine',
            reset: 'resetSolver',
            build: 'buildAffine',
            makeFreqEditField: 'makeViewField',
            updateSel: 'updateStandardSel',
            setChar: 'setStandardChar',
            setMultiChars: 'setStandardMultiChars',
            updateMatchDropdowns: 'updateStandardMatchDropdowns',
            findPossible: 'findStandard'
        }
    },
    /*
     * Choose which Cipher type to be operating on by default.
     */
    select: function (ciphertype, lang) {
        console.log('Selecting:' + ciphertype + " lang="+lang);
        if (typeof this.CipherMappings[ciphertype] === 'undefined') {
            ciphertype = 'Standard';
        }
        if (typeof lang === 'undefined') {
            lang = "en";
        }
        lang = lang.toLowerCase();
        for (var target in this.CipherMappings[ciphertype]) {
            if (this.CipherMappings[ciphertype].hasOwnProperty(target)) {
                this[target] = this[this.CipherMappings[ciphertype][target]];
            }
        }
        this.lang = lang;
        this.init(lang);
    },
    /*
     * Choose the language for the cipher
     */
};

$(function () {
    CipherTool.select();
    // First figure out what type of solver we are building
    $("[data-cipher]").each(function () {
        CipherTool.select($(this).attr('data-cipher'),$(this).attr('data-lang'));
    });
    // process the "cipher-type" class
    $(".cipher-type").each(function () {
        CipherTool.setCipherType($(this).attr('id'));        
    });
    // Handler for .ready() called.
    $('#load').button().click(function () {
        CipherTool.load();
    });
    $('#reset').button().click(function () {
        CipherTool.reset();
    });
//    $('#encrypt').button().click(function () {
//        CipherTool.encrypt();
//    });

    // Morbit Solving Helper
    $(".sfind").change(function () {
        CipherTool.findPossible($(this).val());
    }).blur(function () {
        CipherTool.findPossible($(this).val());
    });
    $(".lang").each(function () {
        CipherTool.setLangDropdown($(this));
    });
    CipherTool.UpdateFreqEditTable();
    CipherTool.attachHandlers();
});