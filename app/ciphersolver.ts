/// <reference types="ciphertypes" />

class CipherSolver extends CipherHandler {
    /**
     * Indicates that a 
     * @type {Object.<string, bool>}
     * 
     */
    locked: { [key: string]: boolean } = {}
    /**
     * Initializes the encoder/decoder. 
     * We don't want to show the reverse replacement since we are doing an encode
     * @param {string} lang Language to select (EN is the default)
     */
    init(lang: string): void {
    }
    /**
     * Generates an HTML representation of a string for display
     * @param {string} str String to process
     */
    normalizeHTML(str: string): string {
        return str;
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    load(): void {
        let encoded: string = this.cleanString(<string>$('#encoded').val());
        console.log('LoadSolver');
        let res = this.build(encoded);
        let tool = this
        $("#answer").empty().append(res);
        $("#analysis").each(function (i) {
            $(this).empty().append(tool.analyze(encoded));
        });

        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    /**
     * Loads new data into a solver, resetting any solving matches made
     */
    reset(): void {
        this.locked = {}
        for (let c in this.freq) {
            if (this.freq.hasOwnProperty(c)) {
                $('#m' + c).val('');
                $('#rf' + c).text('');
            }
        }
        this.load();
    }

    /**
     * Create an edit field for a dropdown
     * @param {string} str character to generate dropdown for
     * @returns {string} HTML of dropdown
     */
    makeFreqEditField(c: string): JQuery<HTMLElement> {
        // let val = ''
        // for (let repl in this.replacement) {
        //     if (this.replacement[repl] === c) {
        //         val = repl
        //         break
        //     }
        // }
        let einput = $('<input/>', { type: "text", class: "sli", 'data-char': c, id: 'm' + c, value: this.replacement[c] });
        return einput;
    }
    /*
     * Sorter to compare two frequency objects
     * Objects must have a freq and a val portion
     * higher frequency sorts first with a standard alphabetical sort after
     */
    isort(a: any, b: any): number {
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
    }
    /** 
     * Finds the top n strings of a given width and formats an HTML 
     * unordered list of them.  Only strings which repeat 2 or more times are included
     * @param {string} string
     * @param {number} width
     * @param {number} num
     */
    makeTopList(str: string, width: number, num: number): JQuery<HTMLElement> {
        let tfreq = {}
        let tobjs = []
        let work = ''
        let len
        let res = $("<span>").text('None found')
        for (let t of str.toUpperCase()) {
            if (this.isValidChar(t)) {
                work += t;
            }
        }
        // Now we have the work string with only the legal characters in it
        // Next we want to go through and find all the combination strings of a given length
        for (let i = 0, len = work.length; i <= len - width * this.cipherWidth; i++) {
            let piece = work.substr(i, width * this.cipherWidth);
            if (isNaN(tfreq[piece])) {
                tfreq[piece] = 0
            }
            tfreq[piece]++
        }
        // tfreq holds the frequency of each string which is of the width requested.  Now we just
        // need to go through and pick out the big ones and display them in sorted order.  To sort
        // it we need to build an array of objects holding the frequency and values.
        Object.keys(tfreq).forEach(function (value) {
            let frequency = tfreq[value]
            if (frequency > 1) {
                let item = { freq: frequency, val: value }
                tobjs.push(item)
            }
        })
        // Now we sort them and pull out the top requested items.  It is possible that 
        // the array is empty because there are not any duplicates
        tobjs.sort(this.isort)
        if (num > tobjs.length) {
            num = tobjs.length
        }

        if (num > 0) {
            res = $('<ul>')
            for (let i = 0; i < num; i++) {
                let valtext = tobjs[i].val;
                if (this.cipherWidth > 1) {
                    // We need to insert spaces every x characters
                    let vpos, vlen;
                    let extra = '';
                    let final = '';
                    for (vpos = 0, vlen = valtext.length / 2; vpos < vlen; vpos++) {
                        final += extra + valtext.substr(vpos * 2, 2);
                        extra = ' ';
                    }
                    valtext = final;
                }

                $('<li>').text(valtext + ' - ' + tobjs[i].freq).appendTo(res)
            }
        }
        return res;
    }
    /**
     * Builds an HTML Representation of the contact table
     * @param encoded String to make a contact table from
     */
    makeContactTable(encoded: string): JQuery<HTMLElement> {
        let prevs: StringMap = {}
        let posts: StringMap = {}
        for (let c of this.getCharset()) {
            prevs[c] = ''
            posts[c] = ''
        }
        let prevlet = ' '
        // Go though the encoded string looking for all the letters which
        // preceed and follow a letter
        for (let c of encoded) {
            if (prevlet === ' ') {
                prevs[c] = "-" + prevs[c]
            } else {
                prevs[c] = prevlet + prevs[c]
                if (c === ' ') {
                    posts[prevlet] = posts[prevlet] + '-'
                } else {
                    posts[prevlet] = posts[prevlet] + c
                }
            }
            prevlet = c
        }
        // Don't forget that we have to handle the last letter
        if (prevlet !== ' ') {
            posts[prevlet] = posts[prevlet] + '-'
        }
        let tobjs = []
        // Now sort all of the letters
        for (let c of this.getCharset()) {
            if (prevs[c] !== '' && posts[c] != '') {
                let frequency = prevs[c].length + posts[c].length
                let item = { freq: frequency, let: c, prevs: prevs[c], posts: posts[c] }
                tobjs.push(item)
            }
        }
        tobjs.sort(this.isort)
        let consonantline = ''
        let freq:NumberMap = {}
        let table = $("<table>", { class: "contact" })
        let thead = $("<thead>")
        let tr = $("<tr>")
        $("<th>", { colspan: 3 }).text("Contact Table").appendTo(tr)
        tr.appendTo(thead)
        thead.appendTo(table)
        let tbody = $("<tbody>")
        for (let item of tobjs) {
            tr = $("<tr>")
            $("<td>", { class: "prev" }).text(item.prevs).appendTo(tr)
            $("<td>", { class: "let" }).text(item.let).appendTo(tr)
            $("<td>", { class: "post" }).text(item.posts).appendTo(tr)
            tr.appendTo(tbody)
            freq[item.let] = item.freq
            consonantline = item.let + consonantline
        }
        let res = $("<div>")
        tbody.appendTo(table)
        res.append(table)
        // Now go through and generate the Consonant line
        let minfreq = freq[consonantline.substr(12,1)]
        for (let c of this.getCharset()) {
            prevs[c] = ''
            posts[c] = ''
        }
        prevlet = ' '
        // Go though the encoded string looking for all the letters which
        // preceed and follow a letter
        for (let c of encoded) {
            if (prevlet !== ' ') {
                if (freq[c] <= minfreq) {
                    prevs[prevlet] = prevlet + prevs[prevlet]
                }
                if (c !== ' ' && freq[prevlet] <= minfreq) {
                    posts[c] = posts[c] + c
                }
            }
            prevlet = c
        }
        // Now we need to build the table
        table = $("<table>", {class: "consonantline"})
        thead = $("<thead>")
        tbody = $("<tbody>")
        let consonants = ''
        let lastfreq = 0
        for (let item of tobjs) {
            if (freq[item.let] <= minfreq) {
                if (consonants != '' && item.freq !== lastfreq) {
                    consonants = ' '+consonants
                }
                lastfreq = item.freq
                consonants = item.let + consonants
            }
            if (prevs[item.let] !== '' || posts[item.let] !== '') {
                tr = $("<tr>")
                $("<td>", { class:"prev"}).text(prevs[item.let]).appendTo(tr)
                $("<td>", { class: "post" }).text(posts[item.let]).appendTo(tr)
                tr.appendTo(tbody)                    
            }
        }
        tr = $("<tr>")
        $("<th>", {colspan:2}).text("Consonant Line").appendTo(tr)        
        tr.appendTo(thead)
        tr = $("<tr>")
        $("<th>", {colspan:2}).text(consonants).appendTo(tr)        
        tr.appendTo(thead)
        thead.appendTo(table)
        tbody.appendTo(table)
        res.append(table)
        return res
    }
    /**
     * Analyze the encoded text
     * @param {string} encoded
     * @param {number} width
     * @param {number} num
     */
    analyze(encoded: string): JQuery<HTMLElement> {
        console.log('Analyze encoded=' + encoded);
        let topdiv = $("<div>")
        let table = $("<table>", { class: "satable" })
        let thead = $("<thead>")
        let trhead = $("<tr>")
        let tbody = $("<tbody>")
        let trbody = $("<tr>")

        for (let num of [2, 3, 4, 5]) {
            $("<th>").text(num + " Characters").appendTo(trhead)
            $('<td>').append(this.makeTopList(encoded, Number(num), 12)).appendTo(trbody)
        }
        trhead.appendTo(thead)
        thead.appendTo(table)
        trbody.appendTo(tbody)
        tbody.appendTo(table)
        table.appendTo(topdiv)
        topdiv.append(this.makeContactTable(encoded))
        return topdiv;
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {number} val This is which element we are changing it to.  This is an index into the morbitReplaces table
     */
    updateSel(item: string, val: string): void {
        this.setChar(item, val);
    }

    /**
     * @returns {Object.<string, string>}
     */
    getMorseMap(): any {
        return null;
    }
    /**
     * Assign a new value for an entry
     * @param {string} entry Character to be updated 
     * @param {string} val New value to associate with the character
     */
    setMorseMapEntry(entry: string, val: string): void {
    }
    /**
     * Locate a string
     * @param {string} str string to look for
     */
    findPossible(str: string): void {
        let encoded = this.minimizeString(<string>$('#encoded').val())
        let extra = ''
        let res = ''
        let i
        str = this.minimizeString(str.toUpperCase())
        //
        // Look for all possible matches for the pattern.
        res = this.searchPattern(encoded, 1, str, 1);
        if (res === '') {
            res = '<br/><b>Not Found</b>';
        } else {
            let charset = this.getCharset();
            let tres = '<table class="mfind"><thead><tr><th>Pos</th><th>Match</th>';
            for (i = 0; i < charset.length; i++) {
                let key = charset.substr(i, 1);
                tres += '<th>' + key + '</th>';
            }
            //   res +=             < ul > ' + res + '</ul > ';
            res = tres + '</tr></thead><tbody>' + res + '</tbody></table>';
        }

        $(".findres").html('Searching for ' + str + ' as ' + this.normalizeHTML(str) + res);
    }

    /**
     * Searches for a string (drags a crib through the crypt)
     * @param {any} encoded
     * @param {any} encodewidth
     * @param {any} tofind
     * @param {any} findwidth
     */
    searchPattern(encoded: string, encodewidth: number, tofind: string, findwidth: number): string {
        let res: string = '';
        let notmapped: string = "????".substr(0, findwidth);
        let searchstr: string = this.makeUniquePattern(tofind, findwidth);
        if (findwidth > 1) {
            tofind += "XXXX".substr(0, findwidth - tofind.length % findwidth);
        }
        let i, len;
        let searchlen = searchstr.length;
        let encrlen = encoded.length;
        let prevchar = ''

        let used: { [key: string]: boolean } = {};
        let charset = this.getCharset().toUpperCase();
        for (i = 0, len = charset.length; i < len; i++) {
            used[charset.substr(i, 1)] = false;
        }
        for (i = 0, len = charset.length; i < len; i++) {
            used[this.replacement[charset.substr(i, 1)]] = true;
        }

        for (i = 0; i + searchlen * encodewidth <= encrlen; i += encodewidth) {
            let checkstr = encoded.substr(i, searchlen * encodewidth);
            let check = this.makeUniquePattern(checkstr, encodewidth);
            // console.log(i + ':"' + check + '/' + encoded.substr(i, searchlen) + '" for "' + searchstr + '/'+tofind+ '"');
            if (check === searchstr) {
                let keymap = {};
                let j;
                let matched;
                //
                // Build the character mapping table to show what they would use
                matched = true;
                //let charset = this.getCharset();
                for (j = 0; j < charset.length; j++) {
                    keymap[charset.substr(j, 1)] = notmapped;
                }
                // Show the matching characters in order
                for (j = 0; j < searchlen; j++) {
                    let keystr = tofind.substr(j * findwidth, findwidth);
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
                        let preceeding = encoded.substr(i - 1, 1);
                        prevchar = keymap[preceeding].substr(findwidth - 1, 1);
                        if (prevchar !== 'X' && prevchar !== '?') {
                            console.log('*** Disallowing ' + checkstr + ' because prevchar =' + prevchar + ' for ' + preceeding);
                            matched = false;
                        }
                    }
                    // Likewise, the following character must also not be a dot or a dash.
                    if (matched && tofind.substr(tofind.length - 1, 1) !== 'X' && i + searchlen < encrlen) {
                        let following = encoded.substr(i + searchlen, 1);
                        let nextchar = keymap[following].substr(0, 1);
                        if (nextchar !== 'X' && prevchar !== '?') {
                            console.log('*** Disallowing ' + checkstr + ' because nextchar =' + nextchar + ' for ' + following);
                            matched = false;
                        }
                    }
                } else {
                    let repl = this.genReplPattern(checkstr);
                    if (!this.isValidReplacement(tofind, repl, used)) {
                        // console.log('*** Disallowing ' + checkstr + ' because not valid replacement for ' + tofind);
                        matched = false;
                    }
                }
                if (matched) {
                    let maptable = '';
                    let mapfix = '';
                    for (j = 0; j < charset.length; j++) {
                        let key = charset.substr(j, 1);
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
    }

    /**
     * Builds the GUI for the solver
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    build(str: string): JQuery<HTMLElement> {
        let res = "";
        let combinedtext = "";
        let prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        let posthead1 = '</tr></tbody></table><div class="repl" data-chars="';
        let posthead2 = '"></div></div>';
        let pre = prehead;
        let post = '';
        let i, len;
        let datachars = '';
        let charset = this.getCharset().toUpperCase();
        this.freq = {};
        for (i = 0, len = charset.length; i < len; i++) {
            this.freq[charset.substr(i, 1).toUpperCase()] = 0;
        }

        for (i = 0, len = str.length; i < len; i++) {
            let t = str.substr(i, 1).toUpperCase();
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
        return $(res);
    }
    /**
     * Change multiple characters at once.
     * @param {string} reqstr String of items to apply
     */
    setMultiChars(reqstr: string): void {
        console.log('setStandardMultiChars ' + reqstr);
        let i, len;
        this.holdupdates = true;
        for (i = 0, len = reqstr.length / 2; i < len; i++) {
            let repchar = reqstr.substr(i * 2, 1);
            let newchar = reqstr.substr(i * 2 + 1, this.cipherWidth);
            console.log('Set ' + repchar + ' to ' + newchar);
            this.updateSel(repchar, newchar);
        }
        this.holdupdates = false;
        this.updateMatchDropdowns('');
    }

    /**
     * Generates the Match dropdown for a given string
     * @param {string} str String to generate a match down for
     * @returns {string} Html for a select
     */
    generateMatchDropdown(str: string): JQuery<HTMLElement> {
        if (this.curlang === '') {
            return $('');
        }

        let pat = this.makeUniquePattern(str, 1);
        let repl = this.genReplPattern(str);
        let mselect = $('<select/>').addClass('match');
        if (typeof this.Frequent[this.curlang][pat] != 'undefined') {
            let matches = this.Frequent[this.curlang][pat];
            let selectclass = '';
            let matched = false;
            let added = 0;
            let i, len;
            let used: BoolMap = {} as BoolMap;
            let charset = this.getCharset().toUpperCase();
            for (i = 0, len = charset.length; i < len; i++) {
                used[charset.substr(i, 1)] = false;
            }
            for (i = 0, len = charset.length; i < len; i++) {
                used[this.replacement[charset.substr(i, 1)]] = true;
            }

            //     console.log(repl);
            //     console.log(used);
            for (i = 0, len = matches.length; i < len; i++) {
                let entry = matches[i];
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
    }
    /**
     * 
     * @param {string} reqstr String of items to apply
     */
    updateMatchDropdowns(reqstr: string): void {
        let tool = this;
        this.cacheReplacements();
        $("[data-chars]").each(function () {
            $(this).empty().append(tool.generateMatchDropdown($(this).attr('data-chars')));
        });
    }


}
