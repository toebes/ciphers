/// <reference types="ciphertypes" />

const Aval = "A".charCodeAt(0)

import CipherSolver from "./ciphersolver"
import Mapper from "./mapper"
import mapperFactory from "./mapperfactory"
import TSTable from "./TSTable"
export default class CipherVigenereSolver extends CipherSolver {
    /** The current cipher we are working on */
    cipherString: string = ''
    /** Map of indexes into which character of the string is at that index */
    cipherOffsets: Array<number> = []
    /** Implements the mapping for the various cipher types */
    ciphermap: Mapper = null
    /** Currently selected keyword */
    keyword: string = ""
    /**
     * Sets up the radio button to choose the variant
     */
    makeVigenereChoices(): JQuery<HTMLElement> {
        var operationChoice = $('<div>');
        var label = $('<label>', { for: 'codetab' }).text('Variant');
        operationChoice.append(label);

        var radioBox = $('<div>', { id: 'codetab', class: 'ibox' });
        radioBox.append($('<input>', { id: 'vigenere', type: 'radio', name: 'codevariant', value: 'vigenere', checked: 'checked' }));
        radioBox.append($('<label>', { for: 'vigenere', class: 'rlab' }).html('Vigen&egrave;re'));
        radioBox.append($('<input>', { id: 'variant', type: 'radio', name: 'codevariant', value: 'variant' }));
        radioBox.append($('<label>', { for: 'variant', class: 'rlab' }).text('Variant'));
        radioBox.append($('<input>', { id: 'beaufort', type: 'radio', name: 'codevariant', value: 'beaufort' }));
        radioBox.append($('<label>', { for: 'beaufort', class: 'rlab' }).text('Beaufort'));
        radioBox.append($('<input>', { id: 'gronsfeld', type: 'radio', name: 'codevariant', value: 'gronsfeld' }));
        radioBox.append($('<label>', { for: 'gronsfeld', class: 'rlab' }).text('Gronsfeld'));
        radioBox.append($('<input>', { id: 'porta', type: 'radio', name: 'codevariant', value: 'porta' }));
        radioBox.append($('<label>', { for: 'porta', class: 'rlab' }).text('Porta'));

        operationChoice.append(radioBox);

        return operationChoice;
    }
    /**
     * Selects which variant table is to be used for mapping
     * @param codevariant Name of code variant - one of vigenere, variant or beufort
     */
    setCodeVariant(codevariant: string): void {
        console.log(codevariant)
        this.ciphermap = mapperFactory(codevariant)
        this.setKeyword(this.keyword)
    }
    /**
     * Changes the keyword to map against the table.  The length of the keyword is
     * the period of the cipher (after removing any spaces of course)
     * Any non-mapping characters (. - _ etc) are used as placeholders
     * @param str New keyword mapping string
     */
    setKeyword(str: string): void {
        if (str.length > 0) {
            console.log('Keyword is' + str)
            this.keyword = str
            str = str.replace(" ", "")
            let period = str.length
            $("#period").text("Period = " + period)

            // Fix up all the vslot values so that they can be mapped
            for (let i in this.cipherOffsets) {
                let vslot = Number(i) % period
                let ckey = str.charAt(vslot)
                $("[data-char='" + this.cipherOffsets[i] + "']").attr('data-vslot', vslot)
                let pt = this.ciphermap.decode(this.cipherString.charAt(this.cipherOffsets[i]), ckey)
                console.log('Set:' + i + ' for CT=' + this.cipherOffsets[i] + ' Key=' + ckey + ' to pt=' + pt)
                $("span[data-char='" + this.cipherOffsets[i] + "']").text(pt)
                $("div[data-char='" + this.cipherOffsets[i] + "']").html(pt)
            }
        }
    }
    /**
     * Locate a string.
     * Note that we assume that the period has been set
     * @param {string} str string to look for
     */
    findPossible(str: string): void {
        let blankkey = ''
        for (let c of this.keyword) {
            blankkey += '-'
        }
        let res = null
        let maxcols = 5
        let tdcount = 0
        let table = new TSTable({class: 'found'})
        let row = table.addHeaderRow()
        for (let i = 0; i < maxcols; i++) {
            row.add("Pos").add("Key")
        }
        row = table.addBodyRow() 
        str = this.minimizeString(str.toUpperCase())
        for (let i = 0; i <= this.cipherOffsets.length - str.length; i++) {
            let thiskey = blankkey
            let valid = true
            for (let pos = 0; pos < str.length; pos++) {
                let ct = this.cipherString.charAt(this.cipherOffsets[i + pos])
                let pt = str.charAt(pos)
                let key = this.ciphermap.decodeKey(ct, pt)
                let keypos = (i + pos) % this.keyword.length
                let prevkey = thiskey.charAt(keypos)
                if (prevkey != '-' && prevkey != key || key === '?') {
                    valid = false
                    break
                }
                thiskey = thiskey.substr(0,keypos) + key + thiskey.substr(keypos+1)
            }
            if (valid) {
                if ((tdcount > 0) && ((tdcount  % maxcols) === 0)) {
                    row = table.addBodyRow()
                }
                tdcount = tdcount + 1
                row.add(String(i))
                   .add($("<a>", {class: 'vkey', href: '#'}).text(thiskey))
            }
        }
        if (tdcount === 0) {
            res = $("<span>").text('Unable to find ' + str + ' as ' + this.normalizeHTML(str))
        } else {
            res = $("<span>").text('Searching for ' + str + ' as ' + this.normalizeHTML(str))
            res.append(table.generate())
        }
        $(".findres").empty().append(res)
        this.attachHandlers()
    }

    /**
    * Fills in the frequency portion of the frequency table.  For the Vigenere
    * we don't have the frequency table, so this doesn't need to do anything
    */
    displayFreq(): void {
    }
    /**
     * Analyze the encoded text
     * @param {string} encoded
     * @param {number} width
     * @param {number} num
     */
    analyze(encoded: string): JQuery<HTMLElement> {
        let prevSpot: NumberMap = {}
        let factorSet: NumberMap = {}
        let prevc = ''
        let prevc2 = ''
        let pos = 0
        let table1 = new TSTable({class: 'vdist',
                                  head: [["Seq","Dist"]]})
        for (let c of encoded) {
            if (this.isValidChar(c)) {
                let two = prevc + c
                let three = prevc2 + prevc + c
                if (two.length === 2) {
                    if (typeof prevSpot[two] !== 'undefined') {
                        let dist = pos - prevSpot[two];
                        table1.addBodyRow([two,String(dist)])
                        // Find all the factors of the distance and record them
                        if (typeof factorSet[dist] === 'undefined') {
                            factorSet[dist] = 0
                        }
                        factorSet[dist]++
                        for (let factor = 2; factor <= dist / 2; factor++) {
                            if (dist % factor === 0) {
                                if (typeof factorSet[factor] === 'undefined') {
                                    factorSet[factor] = 0
                                }
                                factorSet[factor]++
                            }
                        }
                    }
                    prevSpot[two] = pos;
                }
                if (three.length === 3) {
                    if (typeof prevSpot[three] !== 'undefined') {
                        let dist = pos - prevSpot[three];
                        table1.addBodyRow([three,String(dist)])
                        // Find all the factors of the distance and record them
                        if (typeof factorSet[dist] === 'undefined') {
                            factorSet[dist] = 0
                        }
                        factorSet[dist]++
                        for (let factor = 2; factor <= dist / 2; factor++) {
                            if (dist % factor === 0) {
                                if (typeof factorSet[factor] === 'undefined') {
                                    factorSet[factor] = 0
                                }
                                factorSet[factor]++
                            }
                        }
                    }
                    prevSpot[three] = pos;
                }
                pos++
                prevc2 = prevc
                prevc = c
            }
        }

        // Now dump out all the factors and the frequency of them
        let table2 = new TSTable({class: "vfact",
                                  head: [["Factor", "Freq"]]})
        for (let factor in factorSet) {
            if (factorSet[factor] > 1) {
                let link = $("<a>", {class: 'vkey', href: '#', 'data-key': this.repeatStr("-",Number(factor))}).text(factor)
                table2.addBodyRow([link,String(factorSet[factor])])
            }
        }
        return this.sideBySide(table1.generate(), table2.generate())
    }
    /**
     * Encapsulate two elements side by side in a table so that they stay lined up
     * @param elem1 Left side element
     * @param elem2 Right side element
     */
    sideBySide(elem1: JQuery<HTMLElement>, elem2: JQuery<HTMLElement>): JQuery<HTMLElement> {
        return new TSTable({body:[[elem1,elem2]]}).generate()
    }
    /**
     * Change the encrypted character.  This primarily shows us what the key might be if we use it
     * @param {string} repchar character slot to map against (this is basically an index into the string)
     * @param {string} newchar New char to assign as decoding for the character
     */
    setChar(repchar: string, newchar: string): void {
        console.log("vigenere setChar data-char=" + repchar + ' newchar=' + newchar)

        let index = Number(repchar)
        let ct = this.cipherString.charAt(index)
        $("input[data-char='" + repchar + "']").val(newchar);
        let key = this.ciphermap.decodeKey(ct, newchar)
        $("div[data-schar='" + repchar + "']").html(key)
    }

    /**
     * Builds the GUI for the solver
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    build(str: string): JQuery<HTMLElement> {
        this.cipherString = str
        this.cipherOffsets = []
        // Test cases to confirm that the Vigenere/Variant/Beufort encoders/decoders work
        // let testmap:StringMap = {
        //     'encVigenere-aa=A': this.encVigenere("a","a"), // OK
        //     'encVigenere-_a=?': this.encVigenere("_","a"), // OK
        //     'encVigenere-lo=Z': this.encVigenere("l","o"), // OK
        //     'encVigenere-Zz=Y': this.encVigenere("Z","z"), // OK
        //     'encVigenere-Yb=Z': this.encVigenere("Y","b"), // OK
        //     'decVigenere-aa=A': this.decVigenere("a","a"),  // OK
        //     'decVigenere-_a=?': this.decVigenere("_","a"), // OK
        //     'decVigenere-lo=X': this.decVigenere("l","o"), // OK
        //     'decVigenere-Zz=A': this.decVigenere("Z","z"), // OK
        //     'decVigenere-Yb=X': this.decVigenere("Y","b"), // OK

        //     'encVariant-aa=A': this.encVariant("a","a"), // OK
        //     'encVariant-_a=?': this.encVariant("_","a"), // OK
        //     'encVariant-lo=X': this.encVariant("l","o"), // OK
        //     'encVariant-Zz=A': this.encVariant("Z","z"), // OK
        //     'encVariant-Yb=X': this.encVariant("Y","b"), // OK
        //     'decVariant-aa=A': this.decVariant("a","a"), // OK
        //     'decVariant-_a=?': this.decVariant("_","a"), // OK
        //     'decVariant-lo=Z': this.decVariant("l","o"), // OK
        //     'decVariant-Zz=Y': this.decVariant("Z","z"), // OK
        //     'decVariant-Yb=Z': this.decVariant("Y","b"), // OK
        //     'decKeyVariant-aa=A': this.decKeyVariant("a","a"), // OK
        //     'decKeyVariant-_a=?': this.decKeyVariant("_","a"), // OK
        //     'decKeyVariant-lo=D': this.decKeyVariant("l","o"), // OK
        //     'decKeyVariant-Zz=A': this.decKeyVariant("Z","z"), // OK
        //     'decKeyVariant-Yb=D': this.decKeyVariant("Y","b"), // OK

        //     'encBeaufort-aa=A': this.encBeaufort("a","a"), // OK
        //     'encBeaufort-_a=?': this.encBeaufort("_","a"), // OK
        //     'encBeaufort-lo=D': this.encBeaufort("l","o"), // OK
        //     'encBeaufort-Zz=A': this.encBeaufort("Z","z"), // OK
        //     'encBeaufort-Yb=D': this.encBeaufort("Y","b"), // OK
        //     'decBeaufort-aa=A': this.decBeaufort("a","a"), // OK
        //     'decBeaufort-_a=?': this.decBeaufort("_","a"), // OK
        //     'decBeaufort-lo=D': this.decBeaufort("l","o"), // OK
        //     'decBeaufort-Zz=A': this.decBeaufort("Z","z"), // OK
        //     'decBeaufort-Yb=D': this.decBeaufort("Y","b"), // OK
        //     'decKeyBeaufort-aa=A': this.decKeyBeaufort("a","a"), // OK
        //     'decKeyBeaufort-_a=?': this.decKeyBeaufort("_","a"), // OK
        //     'decKeyBeaufort-lo=Z': this.decKeyBeaufort("l","o"), // OK
        //     'decKeyBeaufort-Zz=Y': this.decKeyBeaufort("Z","z"), // OK
        //     'decKeyBeaufort-Yb=Z': this.decKeyBeaufort("Y","b"), // OK
        // }
        let res = ""
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
                this.cipherOffsets.push(i)
                datachars += t
                combinedtext += '<span data-char="' + i + '">?</span>'
                t = pre + '<td><div class="slil">' + t + '</div>' +
                    '<div data-char="' + i + '" class="vans">?</div>' +
                    '<input type="text" id="ti' + i + '" class="sli slvi" data-char="' + i + '" />' +
                    '<div data-schar="' + i + '">&nbsp;</div></td>'
                pre = ''
            } else if (t === ' ' || t === '\n' || t === '\r') {
                if (pre === '') {
                    t = posthead1 + datachars + posthead2;
                } else {
                    t = ''
                }
                pre = prehead;
                datachars = ''
                combinedtext += ' '
            } else {
                combinedtext += t
                t = pre + '<td><div class="slil">' + t + '</div></td>'
                pre = ''
            }
            res += t
        }
        if (pre === '') {
            res += posthead1 + datachars + posthead2
        }
        res += '<div class="ssum">' + combinedtext + '</div>'
        return $(res)
    }

    layout(): void {
        let tool = this
        $('.precmds').each(function () {
            $(this).empty().append(tool.makeVigenereChoices())
        });
    }
    /** 
     * Creates an HTML table to display the frequency of characters
     * @returns {JQuery<HTMLElement} HTML to put into a DOM element
     */
    createFreqEditTable(): JQuery<HTMLElement> {
        let topdiv = $("<div>")
        $("<div>", { id: 'period', class: 'note' }).text("Enter a sample keyword to set the period").appendTo(topdiv)
        $("<label>", { for: "keyword" }).text("Keyword").appendTo(topdiv)
        $("<input/>", { class: "xxx", id: "keyword" }).appendTo(topdiv)

        return topdiv
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        let tool = this;
        super.attachHandlers()
        tool.setCodeVariant(<string>$("input[name='codevariant']:checked").val())

        $('input[type=radio][name=codevariant]').unbind('change').change(function () {
            tool.setCodeVariant(<string>$("input[name='codevariant']:checked").val())
        })
        $('#keyword').unbind('input').on('input', function () {
            tool.setKeyword(<string>$(this).val())
        })
        $("a.vkey").unbind('click').click(function() {
            let newkey =$(this).attr('data-key')
            if (newkey === undefined) {
                newkey = $(this).html()
            }
            tool.setKeyword(newkey)
            $('#keyword').val(newkey)
        })
        $(".slvi").unbind('blur').blur(function () {
            let tohighlight = $(this).attr('data-vslot');
            $("[data-vslot='" + tohighlight + "']").removeClass("allfocus");
            $(this).removeClass("focus");
        }).unbind('focus').focus(function () {
            let tohighlight = $(this).attr('data-vslot');
            $("[data-vslot='" + tohighlight + "']").addClass("allfocus");
            $(this).addClass("focus");
        });
    }
}