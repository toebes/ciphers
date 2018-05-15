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
var CipherGromarkSolver = /** @class */ (function (_super) {
    __extends(CipherGromarkSolver, _super);
    function CipherGromarkSolver() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Gromark Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /**
     *
     */
    CipherGromarkSolver.prototype.init = function () {
        this.cipherWidth = 2;
    };
    /**
     *
     * @param {string} str Input string to parse and generate the solver
     */
    CipherGromarkSolver.prototype.build = function (str) {
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
                }
                else {
                    return $('<div class="error">Gromark must start with 5 numeric digits - found ' + c + '</div>');
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
                return $('<div class="error">Gromark must end with single numeric check digit - found ' + c + '</div>');
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
            }
            else if (c !== ' ') {
                combinedtext += c;
                c = pre + '<td><div class="slil">' + c + '</div></td>';
                pre = '';
            }
            else {
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
        return $(res);
    };
    /**
     Creates the Frequency Table for a Gromark
     */
    CipherGromarkSolver.prototype.createFreqEditTable = function () {
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
    };
    /**
     * Change the encrypted character
     * @param {any} repchar Encrypted character to map against
     * @param {any} newchar New char to assign as decoding for the character
     */
    CipherGromarkSolver.prototype.setChar = function (repchar, newchar) {
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
            var targetc = newchar; // U in example
            newchar = repchar.substr(0, 1); // V in example
            var roff = parseInt(repchar.substr(1, 1), 10); // 3 in example
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
        //console.log('Gromark setChar repchar=' + repchar + ' newchar=' + newchar + ' pos=' + pos + ' charset=' + charset);
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
    };
    /**
     * @param {string} reqstr String of items to apply
     */
    CipherGromarkSolver.prototype.setMultiChars = function (reqstr) {
        //console.log('Gromark setMultiChars ' + reqstr);
        var i, len;
        this.holdupdates = true;
        for (i = 0, len = reqstr.length / 2; i < len; i++) {
            var repchar = reqstr.substr(i * 2, 1);
            var newchar = reqstr.substr(i * 2 + 1, 1);
            this.setChar(repchar, newchar);
        }
        this.holdupdates = false;
        this.updateMatchDropdowns('');
    };
    /*
     * Sorter to compare two string pattern entries
     */
    CipherGromarkSolver.prototype.gmsort = function (a, b) {
        if (a.o < b.o) {
            return -1;
        }
        else if (a.o > b.o) {
            return 1;
        }
        return 0;
    };
    /**
     * @param {string} str String to generate a match down for
     * @returns {string} Html for a select
     */
    CipherGromarkSolver.prototype.generateGromarkDropdown = function (str) {
        if (this.curlang === '') {
            return $('');
        }
        var i, len;
        var matchstr = '';
        var keepadding = true;
        var repl = [];
        var matches = [];
        var used = {};
        var slen = str.length / this.cipherWidth;
        // First we need to find a pattern for the replacement that we can work with
        for (i = 0; i < slen; i++) {
            var piece = str.substr(i * this.cipherWidth, this.cipherWidth);
            var substitute = '';
            if (typeof this.gromarkRepl[piece] == 'undefined') {
                keepadding = false;
            }
            else {
                substitute = this.gromarkRepl[piece];
            }
            if (keepadding) {
                matchstr += substitute;
            }
            repl.push(substitute);
        }
        var pat = this.makeUniquePattern(matchstr, this.cipherWidth);
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
        matches.sort(this.gmsort);
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
        }
        else {
            mselect.addClass('nopat');
        }
        return mselect;
    };
    /**
     * @param {string} repchar Replacement character to limit updates to
     */
    CipherGromarkSolver.prototype.updateMatchDropdowns = function (repchar) {
        var tool = this;
        if (this.holdupdates) {
            return;
        }
        this.cacheReplacements();
        this.saveGromarkReplacements();
        $("[data-chars]").each(function () {
            $(this).empty().append(tool.generateGromarkDropdown($(this).attr('data-chars')));
        });
    };
    /**
     * Build a set of replacements so that we can quickly check against them
     */
    CipherGromarkSolver.prototype.saveGromarkReplacements = function () {
        this.gromarkRepl = {};
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
    };
    /**
     * @param {string} str String to match against
     * @param {string} gromark Gromark (of cipherWidth characters) to compute.
     * @return {Array.string} Array of mapping strings for each character
     */
    CipherGromarkSolver.prototype.makeGromarkMap = function (str, gromark) {
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
    };
    /**
     * @param {string} tomatch String to match against
     * @param {string} gromark Gromark (of cipherWidth characters) to check.
     * @return {number} Indicates qualify of Gromark match. 0= inconsistent, 1=possible, 2=confirmed
     */
    CipherGromarkSolver.prototype.checkGromark = function (tomatch, gromark) {
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
    };
    /**
     * @param {string} str String to search for.  Note that this runs through all the entries looking for a possible match
     */
    CipherGromarkSolver.prototype.findGromark = function (str) {
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
        }
        else {
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
    };
    return CipherGromarkSolver;
}(CipherSolver));
// Gromark: {
//     normalizeHTML: 'normalizeHTML',
//     load: 'loadSolver',
//     reset: 'resetSolver',
//     makeFreqEditField: 'makeEditField',
//     updateSel: 'updateCheckerboardSel',
//     findPossible: 'findGromark'
// },
