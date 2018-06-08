"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var ciphersolver_1 = require("./ciphersolver");
var CipherCheckerboardSolver = /** @class */ (function (_super) {
    __extends(CipherCheckerboardSolver, _super);
    function CipherCheckerboardSolver() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.rowcharset = "";
        _this.colcharset = "";
        return _this;
    }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Checkerboard Solver
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    CipherCheckerboardSolver.prototype.init = function () {
        this.cipherWidth = 2;
        this.rowcharset = "     ";
        this.colcharset = "     ";
    };
    CipherCheckerboardSolver.prototype.setrowcolset = function (rowcharset, colcharset, forceorder) {
        var changed = false;
        var i, len, c;
        rowcharset = rowcharset.toUpperCase();
        colcharset = colcharset.toUpperCase();
        this.rowcharset = this.rowcharset.trim();
        this.colcharset = this.colcharset.trim();
        if (rowcharset !== this.rowcharset) {
            if (forceorder) {
                changed = true;
                this.rowcharset = rowcharset;
            }
            else {
                for (i = 0, len = rowcharset.length; i < len; i++) {
                    c = rowcharset.substr(i, 1);
                    if (this.rowcharset.indexOf(c) < 0) {
                        this.rowcharset += c;
                        changed = true;
                    }
                }
            }
        }
        if (colcharset !== this.colcharset) {
            if (forceorder) {
                changed = true;
                this.colcharset = colcharset;
            }
            else {
                for (i = 0, len = colcharset.length; i < len; i++) {
                    c = colcharset.substr(i, 1);
                    if (this.colcharset.indexOf(c) < 0) {
                        this.colcharset += c;
                        changed = true;
                    }
                }
            }
        }
        if (this.rowcharset.length < 5) {
            this.rowcharset += "     ".substr(0, 5 - this.rowcharset.length);
        }
        if (this.colcharset.length < 5) {
            this.colcharset += "     ".substr(0, 5 - this.colcharset.length);
        }
        if (changed) {
            this.UpdateFreqEditTable();
            this.load();
        }
    };
    CipherCheckerboardSolver.prototype.build = function (str) {
        var res = "";
        var combinedtext = "";
        var prehead = '<div class="sword"><table class="tword"><tbody><tr>';
        var posthead = '</tr></tbody></table></div>';
        var pre = prehead;
        var post = '';
        var i, len;
        var firstchar = '';
        var firstset = '';
        var secondset = '';
        var docwidth = $(document).width();
        //docwidth = 9 * 24 * cipherwidth;
        var width = Math.floor(docwidth / 24);
        var remaining = width;
        var charset = this.getCharset().toUpperCase();
        this.freq = {};
        for (i = 0, len = str.length; i < len; i++) {
            var t = str.substr(i, 1).toUpperCase();
            if (this.isValidChar(t)) {
                if (firstchar === '') {
                    firstchar = t;
                    if (firstset.indexOf(t) < 0) {
                        firstset += t;
                    }
                    t = '';
                }
                else {
                    var piece = firstchar + t;
                    if (secondset.indexOf(t) < 0) {
                        secondset += t;
                    }
                    if (isNaN(this.freq[piece])) {
                        this.freq[piece] = 0;
                    }
                    this.freq[piece]++;
                    combinedtext += '<span data-char="' + piece + '">?</span>';
                    t = pre + '<td><div class="slil">' + firstchar + '<br/>' + t + '</div>' +
                        '<input type="text" id="ti' + piece + '" class="sli" data-char="' + piece + '" /></td>';
                    pre = '';
                    remaining--;
                    firstchar = '';
                }
            }
            else if (t !== ' ' && t !== '\n' && t !== '\r') {
                combinedtext += t;
                t = pre + '<td><div class="slil">' + t + '</div></td>';
                pre = '';
            }
            res += t;
            if (remaining === 0) {
                res += posthead;
                pre = prehead;
                remaining = width;
            }
        }
        if (pre === '') {
            res += posthead;
        }
        res += '<div class="ssum">' + combinedtext + '</div>';
        // We need to retain any existing character set order
        this.setrowcolset(firstset, secondset, false);
        return $(res);
    };
    /*
    * Creates an HTML table to display the frequency of characters
    */
    CipherCheckerboardSolver.prototype.createFreqEditTable = function () {
        var topdiv = $('<div/>');
        var inputdiv = $('<div/>', { class: "idiv" });
        var table = $('<table/>').addClass("ckfreq");
        var thead = $('<thead/>');
        var tbody = $('<tbody/>');
        var headrow = $('<tr/>');
        var row, rowlen, col, collen;
        rowlen = this.rowcharset.length;
        collen = this.colcharset.length;
        // console.log('createCheckerboardFreqEditTable: rowcharset=' + this.rowcharset + ' colcharset=' + this.colcharset);
        headrow.append($('<th/>').addClass("topleft"));
        for (col = 0; col < collen; col++) {
            headrow.append($('<th/>').text(this.colcharset.substr(col, 1).toUpperCase()));
        }
        thead.append(headrow);
        inputdiv.append($('<label/>', { for: "rowcharset", text: "Row Characters" }));
        inputdiv.append($('<input/>', { type: "text", class: "csc", id: "rowcharset", value: this.rowcharset }));
        inputdiv.append($('<label/>', { for: "colcharset", text: "Column Characters" }));
        inputdiv.append($('<input/>', { type: "text", class: "csc", id: "colcharset", value: this.colcharset }));
        topdiv.append(inputdiv);
        for (row = 0; row < rowlen; row++) {
            var replrow = $('<tr/>');
            var rowc = this.rowcharset.substr(row, 1).toUpperCase();
            replrow.append($('<th/>').text(rowc));
            for (col = 0; col < collen; col++) {
                var colc = this.colcharset.substr(col, 1).toUpperCase();
                var piece = rowc + colc;
                var freq = String(this.freq[piece]);
                var td, input;
                if (typeof freq === 'undefined') {
                    freq = '';
                }
                td = $('<td/>').text(freq);
                td.append($('</br>'));
                td.append(this.makeFreqEditField(piece));
                replrow.append(td);
            }
            tbody.append(replrow);
        }
        table.append(thead);
        table.append(tbody);
        topdiv.append(table);
        return topdiv;
    };
    CipherCheckerboardSolver.prototype.load = function () {
        var encoded = this.cleanString($('#encoded').val());
        var res = this.build(encoded);
        var tool = this;
        $("#answer").empty().append(res);
        $("#analysis").each(function (i) {
            $(this).empty().append(tool.analyze(encoded));
        });
        // Show the update frequency values
        this.UpdateFreqEditTable();
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    };
    CipherCheckerboardSolver.prototype.findPossible = function (str) {
        var encoded = this.minimizeString($('#encoded').val());
        var extra = '';
        var res = '';
        var i;
        str = str.toUpperCase();
        //
        // Look for all possible matches for the pattern.
        res = this.searchPattern(encoded, this.cipherWidth, str, 1);
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
    CipherCheckerboardSolver.prototype.attachHandlers = function () {
        var tool = this;
        $("#rowcharset").on('change', function () {
            tool.setrowcolset(this.value, tool.colcharset, true);
        });
        $("#colcharset").on('change', function () {
            tool.setrowcolset(tool.rowcharset, this.value, true);
        });
        _super.prototype.attachHandlers.call(this);
    };
    CipherCheckerboardSolver.prototype.updateSel = function () {
        this.UpdateFreqEditTable();
    };
    return CipherCheckerboardSolver;
}(ciphersolver_1.default));
exports.default = CipherCheckerboardSolver;
// normalizeHTML: 'normalizeHTML',
// load: 'loadCheckerboardSolver',
// reset: 'resetSolver',
// build: 'buildCheckerboardSolver',
// makeFreqEditField: 'makeEditField',
// updateSel: 'updateCheckerboardSel',
// setChar: 'setStandardChar',
// setMultiChars: 'setStandardMultiChars',
// updateMatchDropdowns: 'updateStandardMatchDropdowns',
// findPossible: 'findCheckerboard'
