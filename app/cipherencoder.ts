class CipherEncoder extends CipherHandler {
    /**
     * Initializes the encoder. 
     * We don't want to show the reverse replacement since we are doing an encode
     * @param {string} lang Language to select (EN is the default)
     */
    init(lang: string): void {
        this.ShowRevReplace = false;
        this.curlang = lang;
        this.setCharset(this.langcharset[lang]);
    }
    /**
     * Enable / Disable the HTML elements based on the alphabet selection
     */
    setkvalinputs(): void {
        let val = $('input[name=enctype]:checked').val();
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
    }
    attachHandlers(): void {
        let tool = this
        //Argument of type '{ fontNames: string[]; toolbar: TypeOrArray<string>[][]; }' is not assignable to parameter of type '"editor.unlink" | "unlink"'.
        // Type '{ fontNames: string[]; toolbar: TypeOrArray<string>[][]; }' is not assignable to type '"unlink"'.
        $('input[type=radio][name=enctype]').change(function () {
            tool.setkvalinputs();
        })
        tool.setkvalinputs()
        super.attachHandlers()

    }
    /**
     * Set flag to 'chunk' input data string befre encoding.  Used in Patristocrat, 
     */
    setCipherType (cipherType:string):void {
        if (cipherType == 'patristocrat') {
            console.log(cipherType+' -- set chunking.')
            this.chunkIt = true
        }
        this.attachHandlers();
        }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Aristocrat/Patristocrat Encoder
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    genMap ():void {
        let val = $('input[name=enctype]:checked').val();
        let keyword = <string>$('#keyword').val();
        let offset = $('#offset').spinner("value");
        let keyword2 = <string>$('#keyword2').val();
        let offset2 = $('#offset2').spinner("value");
        let shift = $('#shift').spinner("value");
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
    }

    /**
     * Compute the replacement set for the the characters on an encryption
     * Note that we actually have to reverse them because the ciphers class
     * is mostly built around decrypting
     * @param {string} repl Replacement character set
     * @param {string} cset Source character set
     */
    setReplacement (cset:string, repl:string):void {
        let i, len, errors;
        errors = '';
        let charset = this.getCharset();
        // Figure out what letters map to the destination letters.  Note that
        // the input chracterset alphabet may not be in the same order as the
        // actual alphabet.
        for (i = 0, len = repl.length; i < len; i++) {
            let repc = repl.substr(i, 1);
            let orig = cset.substr(i, 1);
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
    }
    genAlphabetK1(keyword:string, offset:number):void {
        let repl = this.genKstring(keyword, offset);
        this.setReplacement(this.getCharset(), repl);
    }
    genAlphabetK2(keyword:string, offset:number):void {
        let repl = this.genKstring(keyword, offset);
        this.setReplacement(repl, this.getCharset());
    }
    genAlphabetK3(keyword:string, offset:number, shift:number):void {
        let repl = this.genKstring(keyword, offset);
        let cset = repl.substr(shift) + repl.substr(0, shift);
        this.setReplacement(cset, repl);
    }
    genAlphabetK4(keyword:string, offset:number,keyword2:string, offset2:number):void {
        let cset = this.genKstring(keyword, offset);
        let repl = this.genKstring(keyword2, offset2);
        this.setReplacement(cset, repl);
    }
    genKstring(keyword:string, offset:number):string {
        let unasigned = this.getCharset();
        let repl = "";
        let i, len;

        // Go through each character in the source string one at a time
        // and see if it is a legal character.  if we have not already seen
        // it, then remove it from the list of legal characters and add it
        // to the output string
        for (i = 0, len = keyword.length; i < len; i++) {
            let c = keyword.substr(i, 1).toUpperCase();
            // Is it one of the characters we haven't used?
            let pos = unasigned.indexOf(c);
            if (pos >= 0) {
                // we hadn't used it, so save it away and remove it from
                // the list of ones we haven't used
                repl += c;
                unasigned = unasigned.substr(0, pos) + unasigned.substr(pos + 1);
            }
        }
        repl = unasigned.substr(unasigned.length - offset) + repl + unasigned.substr(0, unasigned.length - offset);
        return repl;
    }
    // Gets a random replacement character from the remaining set of unassigned
    // characters
    getRepl():string {
        let sel = Math.floor(Math.random() * this.unasigned.length);
        let res = this.unasigned.substr(sel, 1);
        this.unasigned = this.unasigned.substr(0, sel) + this.unasigned.substr(sel + 1);
        return res;
    }
    // Generates a random replacement set of characters
    genAlphabetRandom(): void {
        let charset = this.getCharset()
        this.unasigned = charset
        let replacement = ""
        let pos = 0

        while (this.unasigned.length > 1) {
            let orig = charset.substr(pos, 1)
            let repl = this.getRepl()
            // If the replacement character is the same as the original
            // then we just get another one and put the replacement back at the end
            // This is guaranteed to be unique
            if (orig == repl) {
                let newrepl = this.getRepl()
                this.unasigned += repl
                repl = newrepl
            }
            replacement += repl
            pos++
        }

        // Now we have to handle the special case of the last character
        if (charset.substr(pos, 1) == this.unasigned) {
            // Just pick a random spot in what we have already done and
            // swap it.  We are guaranteed that it won't be the last character
            // since it matches already
            let sel = Math.floor(Math.random() * replacement.length);
            replacement = replacement.substr(0, sel) + this.unasigned + replacement.substr(sel + 1) + replacement.substr(sel, 1);
        } else {
            replacement += this.unasigned;
        }
        this.setReplacement(this.getCharset(), replacement)
    }

    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.
     * @param {string} str String to be encoded
     * @returns {string} HTML of encoded string to display
     */
    build(str:string):JQuery<HTMLElement> {
        let res = $('<div>')
        let charset = this.getCharset()
        let i, len
        let revRepl = []
        let encodeline = ""
        let decodeline = ""
        let lastsplit = -1
        let splitc = ''
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
            let t = str.substr(i, 1).toUpperCase();
            decodeline += t;
            // Make sure that this is a valid character to map from
            let pos = charset.indexOf(t);
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
                    let encodepart = encodeline.substr(0,lastsplit);
                    let decodepart = decodeline.substr(0,lastsplit);
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
        return res
    }

    /**
     * Loads up the values for the encoder
     */
    load():void {
       // this.hideRevReplace = true;
        let encoded = this.cleanString(<string>$('#toencode').val());
        /*
        * If it is characteristic of the cipher type (e.g. patristocrat),
        * rebuild the string to be encoded in to five character sized chunks.
        */
        if (this.chunkIt) {
            encoded = this.chunk(encoded, 5)
        }
        $(".err").text('')
        this.genMap()
        let res = this.build(encoded)
        let tool = this
        $("#answer").empty().append(res)

        /* testStrings */
        for (var i = 0; i < this.testStrings.length; i++) {
            let chi = this.CalculateChiSquare(this.testStrings[i]);
            let teststr = this.cleanString(this.testStrings[i]);
            let l = teststr.length;
            console.log(l+'`'+chi+'`'+teststr);
        }

        let chi = this.CalculateChiSquare(encoded);
        
        let chitext = '';
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
    }
    
    makeFreqEditField(c:string):JQuery<HTMLElement> {
        let einput = $('<span/>', { type: "text", 'data-char': c, id: 'm' + c });
        return einput;
    }

        
}

// Encoder: {
//     init: 'initEncoder',
//     normalizeHTML: 'normalizeHTML',
//     createFreqEditTable: 'createNormalFreqEditTable',
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
