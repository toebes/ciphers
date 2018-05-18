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
var CipherMorbitSolver = /** @class */ (function (_super) {
    __extends(CipherMorbitSolver, _super);
    function CipherMorbitSolver() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** @type {Object.<string, string>}
    */
        _this.morbitMap = {
            '1': 'OO',
            '2': 'O-',
            '3': 'OX',
            '4': '-O',
            '5': '--',
            '6': '-X',
            '7': 'XO',
            '8': 'X-',
            '9': 'XX'
        };
        _this.morbitReplaces = ['OO', 'O-', 'OX', '-O', '--', '-X', 'XO', 'X-', 'XX'];
        return _this;
    }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Morbit Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    CipherMorbitSolver.prototype.init = function () {
        this.cipherWidth = 2;
        this.setCharset('123456789');
    };
    CipherMorbitSolver.prototype.getMorseMap = function () {
        return this.morbitMap;
    };
    CipherMorbitSolver.prototype.setMorseMapEntry = function (entry, val) {
        this.morbitMap[entry] = val;
    };
    /*
     * Create an edit field for a dropdown
    */
    CipherMorbitSolver.prototype.makeFreqEditField = function (c) {
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
    };
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     * @param {string} item This is which character we are changing the mapping for
     * @param {string} val This is which element we are changing it to.  This is an index into the morbitReplaces table
     */
    CipherMorbitSolver.prototype.updateSel = function (item, val) {
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
    };
    return CipherMorbitSolver;
}(CipherMorseSolver));
// Morbit: {
//     normalizeHTML: 'normalizeMorseHTML',
//     load: 'loadMorseSolver',
//     reset: 'resetSolver',
//     build: 'buildMorseSolver',
//     setChar: 'setStandardChar',
//     setMultiChars: 'setMorseMultiChars',
//     updateMatchDropdowns: 'updateStandardMatchDropdowns',
//     findPossible: 'findMorse'
// },
