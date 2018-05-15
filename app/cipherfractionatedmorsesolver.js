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
var CipherFractionatedMorseSolver = /** @class */ (function (_super) {
    __extends(CipherFractionatedMorseSolver, _super);
    function CipherFractionatedMorseSolver() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** @type {Object.<string, string>}
        */
        _this.fractionatedMorseMap = {
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
        };
        /** @type {Array.string}
         */
        _this.fractionatedMorseReplaces = [
            'OOO', 'OO-', 'OOX', 'O-O', 'O--', 'O-X', 'OXO', 'OX-', 'OXX',
            '-OO', '-O-', '-OX', '--O', '---', '--X', '-XO', '-X-', '-XX',
            'XOO', 'XO-', 'XOX', 'X-O', 'X--', 'X-X', 'XXO', 'XX-'
        ];
        return _this;
    }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         *
         * Fractionated Morse Solver
         *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    CipherFractionatedMorseSolver.prototype.init = function () {
        this.cipherWidth = 3;
        this.setCharset('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    };
    CipherFractionatedMorseSolver.prototype.getMorseMap = function () {
        return this.fractionatedMorseMap;
    };
    CipherFractionatedMorseSolver.prototype.setMorseMapEntry = function (entry, val) {
        this.fractionatedMorseMap[entry] = val;
    };
    /*
     * Create an edit field for a dropdown
    */
    CipherFractionatedMorseSolver.prototype.makeFreqEditField = function (c) {
        if (this.morseLocked[c]) {
            return $(this.normalizeHTML(this.fractionatedMorseMap[c]));
        }
        var mselect = $('<select class="msli" data-char="' + c + '" id="m' + c + '"/>');
        var locklist = {};
        /* Build a list of the locked strings we should skip */
        for (var key in this.morseLocked) {
            if (this.morseLocked.hasOwnProperty(key) && this.morseLocked[key]) {
                locklist[this.fractionatedMorseMap[key]] = true;
                console.log('Recording locklist[' + key + ']=' + locklist[key]);
            }
        }
        var mreplaces = this.fractionatedMorseReplaces.length;
        var selected = [];
        selected[this.fractionatedMorseMap[c]] = " selected";
        for (var i = 0; i < mreplaces; i++) {
            var text = this.fractionatedMorseReplaces[i];
            console.log('Checkign for ' + text);
            if (!locklist[text]) {
                $("<option />", { value: text, selected: selected[text] })
                    .html(this.normalizeHTML(text))
                    .appendTo(mselect);
            }
        }
        return mselect;
    };
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {number} val This is which element we are changing it to.  This is an index into the fractionatedMorseReplaces table
     */
    CipherFractionatedMorseSolver.prototype.updateSel = function (item, val) {
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
    };
    return CipherFractionatedMorseSolver;
}(CipherMorseSolver));
// FractionatedMorse: {
//     init: 'initFractionatedMorseSolver',
//     normalizeHTML: 'normalizeMorseHTML',
//     createFreqEditTable: 'createMorseFreqEditTable',
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
