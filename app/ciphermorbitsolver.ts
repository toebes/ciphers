class CipherMorbitSolver extends CipherMorseSolver {
    /** @type {Object.<string, string>} 
*/
    morbitMap: { [key: string]: string } = {
        '1': 'OO',
        '2': 'O-',
        '3': 'OX',
        '4': '-O',
        '5': '--',
        '6': '-X',
        '7': 'XO',
        '8': 'X-',
        '9': 'XX'
    }
    morbitReplaces: Array<string> = ['OO', 'O-', 'OX', '-O', '--', '-X', 'XO', 'X-', 'XX']
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Morbit Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    init():void {
        this.cipherWidth = 2;
        this.setCharset('123456789');
    }
    getMorseMap():StringMap {
        return this.morbitMap;
    }

    setMorseMapEntry(entry:string, val:string):void {
        this.morbitMap[entry] = val;
    }
    /*
     * Create an edit field for a dropdown
    */
    makeFreqEditField(c:string):JQuery<HTMLElement> {
        var mselect = $('<select class="msli" data-char="' + c + '" id="m' + c + '"/>');
        var mreplaces = this.morbitReplaces.length;
        var charset = this.getCharset();
        var selected = [];
        selected[this.morbitMap[c]] = " selected";
        for (var i = 0; i < mreplaces; i++) {
            var text = this.morbitReplaces[i];
            $("<option />", { value: i, selected: selected[text] })
                            .html(this.normalizeHTML(text)).appendTo(mselect);
        }
        return mselect;
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {string} val This is which element we are changing it to.  This is an index into the morbitReplaces table
     */
    updateSel(item:string, val:string):void {
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
    }
    
}

// Morbit: {
//     normalizeHTML: 'normalizeMorseHTML',
//     createFreqEditTable: 'createMorseFreqEditTable',
//     load: 'loadMorseSolver',
//     reset: 'resetSolver',
//     build: 'buildMorseSolver',
//     setChar: 'setStandardChar',
//     setMultiChars: 'setMorseMultiChars',
//     updateMatchDropdowns: 'updateStandardMatchDropdowns',
//     findPossible: 'findMorse'
// },
