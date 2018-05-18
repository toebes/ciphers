/// <reference types="ciphertypes" />
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
var CipherSolver = /** @class */ (function (_super) {
    __extends(CipherSolver, _super);
    function CipherSolver() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Initializes the encoder/decoder.
     * We don't want to show the reverse replacement since we are doing an encode
     * @param {string} lang Language to select (EN is the default)
     */
    CipherSolver.prototype.init = function (lang) {
    };
    /**
     * Generates an HTML representation of a string for display
     * @param {string} str String to process
     */
    CipherSolver.prototype.normalizeHTML = function (str) {
        return str;
    };
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    CipherSolver.prototype.load = function () {
        var encoded = this.cleanString($('#encoded').val());
        console.log('LoadSolver');
        var res = this.build(encoded);
        var tool = this;
        $("#answer").empty().append(res);
        $("#analysis").each(function (i) {
            $(this).html(tool.analyze(encoded));
        });
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    };
    /**
     * Loads new data into a solver, resetting any solving matches made
     */
    CipherSolver.prototype.reset = function () {
        for (var c in this.freq) {
            if (this.freq.hasOwnProperty(c)) {
                $('#m' + c).val('');
                $('#rf' + c).text('');
            }
        }
        this.load();
    };
    /**
     * Create an edit field for a dropdown
     * @param {string} str character to generate dropdown for
     * @returns {string} HTML of dropdown
     */
    CipherSolver.prototype.makeFreqEditField = function (c) {
        var einput = $('<input/>', { type: "text", class: "sli", 'data-char': c, id: 'm' + c });
        return einput;
    };
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {number} val This is which element we are changing it to.  This is an index into the morbitReplaces table
     */
    CipherSolver.prototype.updateSel = function (item, val) {
        this.setChar(item, val);
    };
    /**
     * @returns {Object.<string, string>}
     */
    CipherSolver.prototype.getMorseMap = function () {
        return null;
    };
    /**
     * Assign a new value for an entry
     * @param {string} entry Character to be updated
     * @param {string} val New value to associate with the character
     */
    CipherSolver.prototype.setMorseMapEntry = function (entry, val) {
    };
    /**
     * Locate a string
     * @param {string} str string to look for
     */
    CipherSolver.prototype.findPossible = function (str) {
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
        }
        else {
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
    };
    /**
     * Searches for a string (drags a crib through the crypt)
     * @param {any} encoded
     * @param {any} encodewidth
     * @param {any} tofind
     * @param {any} findwidth
     */
    CipherSolver.prototype.searchPattern = function (encoded, encodewidth, tofind, findwidth) {
        var res = '';
        var notmapped = "????".substr(0, findwidth);
        var searchstr = this.makeUniquePattern(tofind, findwidth);
        if (findwidth > 1) {
            tofind += "XXXX".substr(0, findwidth - tofind.length % findwidth);
        }
        var i, len;
        var searchlen = searchstr.length;
        var encrlen = encoded.length;
        var used = {};
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
                }
                else {
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
                    res += '<tr><td>' + i + '</td><td><a class="dapply" href="#" onclick="cipherTool.setMultiChars(\'' + mapfix + '\');">' + checkstr + '</a></td>' + maptable + '</tr>';
                }
            }
        }
        return res;
    };
    /**
     * Builds the GUI for the solver
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    CipherSolver.prototype.build = function (str) {
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
            }
            else if (t === ' ' || t === '\n' || t === '\r') {
                if (pre === '') {
                    t = posthead1 + datachars + posthead2;
                }
                else {
                    t = '';
                }
                pre = prehead;
                datachars = '';
                combinedtext += ' ';
            }
            else {
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
        return $(res);
    };
    /**
     * Change multiple characters at once.
     * @param {string} reqstr String of items to apply
     */
    CipherSolver.prototype.setMultiChars = function (reqstr) {
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
    };
    /**
     * Generates the Match dropdown for a given string
     * @param {string} str String to generate a match down for
     * @returns {string} Html for a select
     */
    CipherSolver.prototype.generateMatchDropdown = function (str) {
        if (this.curlang === '') {
            return $('');
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
            var used = {};
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
        */ }
                if (matched && added > 9) {
                    break;
                }
            }
            if (added === 0) {
                selectclass = 'nopat';
            }
            mselect.addClass(selectclass);
        }
        else {
            mselect.addClass('nopat');
        }
        return mselect;
    };
    /**
     *
     * @param {string} reqstr String of items to apply
     */
    CipherSolver.prototype.updateMatchDropdowns = function (reqstr) {
        var tool = this;
        this.cacheReplacements();
        $("[data-chars]").each(function () {
            $(this).empty().append(tool.generateMatchDropdown($(this).attr('data-chars')));
        });
    };
    return CipherSolver;
}(CipherHandler));
// Standard: {
//     init: 'init',
//     normalizeHTML: 'normalizeHTML',
//     load: 'loadSolver',
//     reset: 'resetSolver',
//     build: 'buildSolver',
//     makeFreqEditField: 'makeEditField',
//     updateSel: 'updateStandardSel',
//     setChar: 'setStandardChar',
//     setMultiChars: 'setStandardMultiChars',
//     updateMatchDropdowns: 'updateStandardMatchDropdowns',
//     findPossible: 'findStandard'
// },
