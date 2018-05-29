/// <reference types="ciphertypes" />

class CipherFractionatedMorseSolver extends CipherMorseSolver {
    
    /** @type {Object.<string, string>} 
    */
   fractionatedMorseMap:StringMap = {
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
}

/** @type {Array.string} 
 */
readonly fractionatedMorseReplaces: Array<string> = [
    'OOO', 'OO-', 'OOX', 'O-O', 'O--', 'O-X', 'OXO', 'OX-', 'OXX',
    '-OO', '-O-', '-OX', '--O', '---', '--X', '-XO', '-X-', '-XX',
    'XOO', 'XO-', 'XOX', 'X-O', 'X--', 'X-X', 'XXO', 'XX-']

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Fractionated Morse Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    init():void {
        this.cipherWidth = 3;
        this.setCharset('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }
    getMorseMap(): StringMap {
        return this.fractionatedMorseMap;
    }
    setMorseMapEntry(entry:string, val:string):void {
        this.fractionatedMorseMap[entry] = val;
    }
    /*
     * Create an edit field for a dropdown
    */
   makeFreqEditField(c:string):JQuery<HTMLElement> {
        if (this.locked[c]) {
            return $(this.normalizeHTML(this.fractionatedMorseMap[c]));
        }
        var mselect = $('<select class="msli" data-char="' + c + '" id="m' + c + '"/>');
        var locklist = {};
        /* Build a list of the locked strings we should skip */
        for (var key in this.locked) {
            if (this.locked.hasOwnProperty(key) && this.locked[key]) {
                locklist[this.fractionatedMorseMap[key]] = true;
                console.log('Recording locklist['+key+']='+locklist[key]);
            }
        }
        var mreplaces = this.fractionatedMorseReplaces.length;
        var selected = [];
        selected[this.fractionatedMorseMap[c]] = " selected";
        for (var i = 0; i < mreplaces; i++) {
            var text = this.fractionatedMorseReplaces[i];
            console.log('Checkign for '+text);
            if (!locklist[text]) {
                $("<option />", { value: text, selected: selected[text] })
                                 .html(this.normalizeHTML(text))
                                 .appendTo(mselect);
            }
        }
        return mselect;
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {number} val This is which element we are changing it to.  This is an index into the fractionatedMorseReplaces table
     */
    updateSel(item:string, val:string):void {
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
    }
}

// FractionatedMorse: {
//     normalizeHTML: 'normalizeMorseHTML',
//     load: 'loadMorseSolver',
//     reset: 'resetSolver',
//     build: 'buildMorseSolver',
//     makeFreqEditField: 'makeFractionatedMorseEditField',
//     updateSel: 'updateFractionatedMorseSel',
//     getMorseMap: 'getFractionatedMorseMap',
//     setMorseMapEntry: 'setFractionatedMorseMapEntry',
//     setChar: 'setStandardChar',
//     setMultiChars: 'setMorseMultiChars',
//     updateMatchDropdowns: 'updateStandardMatchDropdowns',
//     findPossible: 'findMorse'
// },
