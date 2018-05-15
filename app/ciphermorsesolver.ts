class CipherMorseSolver extends CipherSolver {
    readonly tomorse: { [key: string]: string } = {
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
    }
    /**
    * Table of classes to be associated with morse code dots/dashes/spaces
    * @type {Object.<string, string>} 
    */
    readonly morsedigitClass: { [key: string]: string } = {
        'O': 'dot',
        '-': 'dash',
        '?': 'error',
        'X': 'null'
    }
    /**
    * Table of classes to be associated with any particular morse code decoded character
    * @type {Object.<string, string>} 
    */
    morseClass: { [key: string]: string } = {
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
    }
    /**
     * Table to map from a morse code string to the corresponding character
     * @type {Object.<string, string>} 
     */
    frommorse: { [key: string]: string } = {
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
    }
    /** @type {Object.<string, bool>}
     * 
     */
    morseLocked: { [key: string]: boolean } = {}

    updateCheck(c: string, lock: boolean): void {
        if (this.morseLocked[c] != lock) {
            this.morseLocked[c] = lock;
            this.UpdateFreqEditTable();
            this.load();
        }
    }

    reset(): void {
        super.reset();
        this.morseLocked = {};
    }

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
    build(str: string): JQuery<HTMLElement> {
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
                let morsepiece = this.getMorseMap()[c] + '????';
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
        //
        // Now that we have the strings, go through and output the rows
        //
        for (i = 0, len = intext.length; i < len; i++) {
            c = intext.substr(i, 1);
            var mpos, td;
            td = $('<td>', { colspan: cipherwidth });
            if (this.morseLocked[c]) {
                td.addClass("locked");
            }
            td.text(c);
            inrow.append(td);
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
    }
    /*
     * Creates an HTML table to display the frequency of characters
     */
    createFreqEditTable(): JQuery<HTMLElement> {
        var table = $('<table/>').addClass("tfreq");
        var thead = $('<thead/>');
        var tbody = $('<tbody/>');
        var headrow = $('<tr/>');
        var freqrow = $('<tr/>');
        var replrow = $('<tr/>');
        var lockrow = $('<tr/>')
        var i, len;
        var charset = this.getCharset();

        headrow.append($('<th/>').addClass("topleft"));
        freqrow.append($('<th/>').text("Frequency"));
        replrow.append($('<th/>').text("Replacement"));
        lockrow.append($('<th/>').text("Locked"));
        for (i = 0, len = charset.length; i < len; i++) {
            var c = charset.substr(i, 1).toUpperCase();
            headrow.append($('<th/>').text(c));
            freqrow.append($('<td id="f' + c + '"/>'));
            var td = $('<td/>');
            td.append(this.makeFreqEditField(c));
            replrow.append(td);
            td = $('<td/>');
            var ischecked = this.morseLocked[c];
            $('<input />', {
                type: 'checkbox',
                class: 'cb',
                'data-char': c,
                id: 'cb' + c,
                value: name, checked: ischecked,
            }).appendTo(td);

            lockrow.append(td);
        }
        thead.append(headrow);
        tbody.append(freqrow);
        tbody.append(replrow);
        tbody.append(lockrow);
        table.append(thead);
        table.append(tbody);

        return table;
    }
    /**
     * @param {string} reqstr Template string to set mappings
     */
    setMultiChars(reqstr: string): void {
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
    }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Morse routines.
     *
     * findMorse looks for a morse encoded string in the input pattern.  It relies on:
     *   this.cipherWidth to be the width of each encoded character
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    findPossible(str: string): void {
        var encoded = this.minimizeString(<string>$('#encoded').val());
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
    }

    normalizeHTML(str: string): string {
        return str.replace(/O/g, '&#9679;').replace(/-/g, "&ndash;").replace(/X/g, "&times;");
    }

    load(): void {
        this.encodedString = this.cleanString(<string>$('#encoded').val());
        var res = this.build(this.encodedString);
        var tool = this;
        $("#answer").empty().append(res);
        $("#analysis").each(function (i) {
            $(this).html(tool.analyze(tool.encodedString));
        });
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }

}