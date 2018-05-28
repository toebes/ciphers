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
var CryptorithmType;
(function (CryptorithmType) {
    CryptorithmType[CryptorithmType["Automatic"] = 0] = "Automatic";
    CryptorithmType[CryptorithmType["SquareRoot"] = 1] = "SquareRoot";
    CryptorithmType[CryptorithmType["CubeRoot"] = 2] = "CubeRoot";
    CryptorithmType[CryptorithmType["Multiplication"] = 3] = "Multiplication";
    CryptorithmType[CryptorithmType["Division"] = 4] = "Division";
    CryptorithmType[CryptorithmType["Addition"] = 5] = "Addition";
    CryptorithmType[CryptorithmType["Subtraction"] = 6] = "Subtraction";
    CryptorithmType[CryptorithmType["Equations"] = 7] = "Equations";
})(CryptorithmType || (CryptorithmType = {}));
var CryptorithmSolver = /** @class */ (function (_super) {
    __extends(CryptorithmSolver, _super);
    function CryptorithmSolver() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.usedletters = {};
        _this.cryptorithmType = CryptorithmType.Automatic;
        return _this;
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    CryptorithmSolver.prototype.load = function () {
        var encoded = this.cleanString($('#encoded').val());
        var res = this.build(encoded);
        var tool = this;
        this.UpdateFreqEditTable();
        $("#answer").empty().append(res);
        $("#analysis").each(function (i) {
            $(this).empty().append(tool.analyze(encoded));
        });
        var pos = 0;
        var charset = this.getCharset();
        for (var c in this.usedletters) {
            var repl = charset.substr(pos, 1);
            pos++;
            this.setChar(c, repl);
        }
        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    };
    /**
     * Loads new data into a solver, resetting any solving matches made
     */
    CryptorithmSolver.prototype.reset = function () {
        this.load();
    };
    /**
     * Analyze the encoded text
     * @param {string} encoded
     * @param {number} width
     * @param {number} num
     */
    CryptorithmSolver.prototype.analyze = function (encoded) {
        return null;
    };
    /**
     * Substitutes all the current mappings in a string to evaluate
     * @param str String to replace with math values
     */
    CryptorithmSolver.prototype.subFormula = function (str) {
        var result = '';
        for (var _i = 0, str_1 = str; _i < str_1.length; _i++) {
            var c = str_1[_i];
            if (typeof this.replacement[c] === 'undefined' ||
                this.replacement[c] === '' ||
                this.replacement[c] === ' ') {
                result += c;
            }
            else {
                result += this.replacement[c];
            }
        }
        // Now we need to convert everything to base 10 so we can
        // properly evaluate it
        //if (this.base != 10)
        {
            var gathered = '';
            var intermediate = result;
            result = '';
            for (var _a = 0, intermediate_1 = intermediate; _a < intermediate_1.length; _a++) {
                var c = intermediate_1[_a];
                if (!isNaN(parseInt(c, this.base))) {
                    // Throw away leading zeros so that it will parse
                    if (gathered === '0') {
                        gathered = c;
                    }
                    else {
                        gathered += c;
                    }
                }
                else if (gathered != '') {
                    result += parseInt(gathered, this.base) + c;
                    gathered = '';
                }
                else {
                    result += c;
                }
            }
            if (gathered != '') {
                result += parseInt(gathered, this.base);
            }
        }
        return result;
    };
    /**
     * Safe version of eval to compute a generated formula
     * @param str Math formula to evaluate
     */
    CryptorithmSolver.prototype.compute = function (str) {
        try {
            return Function('"use strict";return (' + str + ')')();
        }
        catch (e) {
            return str;
        }
    };
    /**
     * Check a formula to make sure it is correct
     * @param formula Formula to calculate
     * @param expected Expected result from the formula
     */
    CryptorithmSolver.prototype.checkFormula = function (formula, expected) {
        var eformula = this.subFormula(formula);
        var eexpected = this.subFormula(expected);
        var cformula = String(this.compute(eformula));
        var cexpected = String(this.compute(eexpected));
        if (cformula === cexpected) {
            return $("<span>", { class: "match" }).text("Matches");
        }
        // They don't match so let's go through the digits and figure out which ones do and don't match.
        // Note that one might be longer than the other but we have to compare from the right hand side
        var width = Math.max(cformula.length, cexpected.length);
        var result = $("<span>", { class: "mismatch" });
        for (var pos = width - 1; pos >= 0; pos--) {
            var cf = '?';
            var ce = '?';
            if (pos < cformula.length) {
                cf = cformula.substr(cformula.length - pos - 1, 1);
            }
            if (pos < cexpected.length) {
                ce = cexpected.substr(cexpected.length - pos - 1, 1);
            }
            if (ce === cf) {
                $("<span>", { class: "g" }).text(cf).appendTo(result);
            }
            else {
                $("<span>", { class: "b" }).text(cf).appendTo(result);
            }
        }
        $("<span>", { class: "formula" }).text("[" + formula + "]").appendTo(result);
        // return $("<span>").text("Comparing " + formula + "=" + expected + " to " + eformula + "=" + eexpected + " as " + cformula + "=" + cexpected)
        return result;
    };
    /**
     *
     * @param {string} reqstr String of items to apply
     */
    CryptorithmSolver.prototype.updateMatchDropdowns = function (reqstr) {
        var tool = this;
        this.cacheReplacements();
        $("[data-formula]").each(function () {
            $(this).empty().append(tool.checkFormula($(this).attr('data-formula'), $(this).attr('data-expect')));
        });
    };
    /**
     * Fills in the frequency portion of the frequency table
     */
    CryptorithmSolver.prototype.displayFreq = function () {
        var charset = this.getCharset();
        var c, i, len;
        this.holdupdates = true;
        // Replicate all of the previously set values.  This is done when
        // you change the spacing in the encoded text and then do a reload.
        for (var c_1 in this.usedletters) {
            var repl = $('#m' + c_1).val();
            if (repl === '') {
                repl = $('#m' + c_1).html();
            }
            this.setChar(c_1, repl);
        }
        this.holdupdates = false;
        this.updateMatchDropdowns('');
    };
    /**
     * Change the encrypted character.  Note that when we change one, we have
     * to swap it with the one which we are replacing
     * @param {string} repchar Encrypted character to map against
     * @param {string} newchar New char to assign as decoding for the character
     */
    CryptorithmSolver.prototype.setChar = function (repchar, newchar) {
        console.log("setChar data-char=" + repchar + ' newchar=' + newchar);
        // See if we actually have to do anything at all
        if (this.replacement[repchar] != newchar) {
            // Ok we need to figure out what slot we are swapping with
            var oldchar = this.replacement[repchar];
            if (oldchar !== '' && oldchar !== ' ') {
                var oldrep = '';
                for (var i in this.replacement) {
                    if (this.replacement[i] === newchar) {
                        oldrep = i;
                        break;
                    }
                }
                _super.prototype.setChar.call(this, oldrep, oldchar);
                $("span[data-val='" + oldchar + "']").text(oldrep);
            }
            _super.prototype.setChar.call(this, repchar, newchar);
            $("span[data-val='" + newchar + "']").text(repchar);
        }
    };
    /**
     * Builds the GUI for the solver
     * @param {string} str String to decode
     * @returns {string} HTML of solver structure
     */
    CryptorithmSolver.prototype.build = function (str) {
        var buildState;
        (function (buildState) {
            buildState["Initial"] = "Initial";
            buildState["WantRoot"] = "Want Root value";
            buildState["WantEqual"] = "Want = value";
            buildState["WantMinus"] = "Want - value";
            buildState["WantMult"] = "Want * value";
            buildState["WantDiv"] = "Want / value";
            buildState["WantPlus"] = "Want + value";
            buildState["WantQuotient"] = "Want Quotient";
            buildState["Root"] = "Root";
            buildState["Idle"] = "Idle";
        })(buildState || (buildState = {}));
        this.cryptorithmType = CryptorithmType.Automatic;
        this.usedletters = {};
        var lineitems = [];
        str = str.replace(new RegExp("[\r\n ]+", "g"), " ");
        // Apparently there are two forms of dashes...
        //        str = str.replace(new RegExp("–", "g"), "-")
        str = str.replace(new RegExp("gives root", "g"), "^");
        var tokens = str.split(/ *([;-=+ \/\*\.\-\–]) */g);
        var maindiv = $("<div>");
        var state = buildState.Initial;
        var indent = 0;
        var numwidth = 1;
        var maxwidth = 0;
        var prefix = '';
        var divwidth = 0;
        var dividend = "";
        var divisor = "";
        var quotient = "";
        var formula = "";
        var expected = "";
        var lastval = "";
        var lastbase = "";
        var root = "";
        var rootbase = "";
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var token = tokens_1[_i];
            console.log('Working on ' + token);
            switch (token) {
                case '':
                case ' ':
                    break;
                // Square root (this was originally "gives root" in the crytprithm)
                case '^':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix);
                    }
                    if (this.cryptorithmType === CryptorithmType.Automatic) {
                        this.cryptorithmType = CryptorithmType.SquareRoot;
                    }
                    prefix = token;
                    state = buildState.WantRoot;
                    break;
                // End of an equation (and potentially the start of another)
                case '.':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix);
                    }
                    // Put in a blank line
                    lineitems.push({ prefix: '', indent: 0, content: "", class: "", formula: "", expected: "" });
                    prefix = '';
                    state = buildState.Initial;
                    break;
                // End of an operation group (generally after an = value)
                case ';':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix);
                    }
                    prefix = '';
                    state = buildState.Idle;
                    break;
                case '-':
                case '–':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix);
                    }
                    switch (this.cryptorithmType) {
                        case CryptorithmType.Automatic:
                            this.cryptorithmType = CryptorithmType.Subtraction;
                        case CryptorithmType.Subtraction:
                        case CryptorithmType.Addition:
                            lastbase = lastval + "-";
                            break;
                        case CryptorithmType.Division:
                            var mult = quotient.substr(quotient.length - (indent + 1), 1);
                            formula = mult + "*" + divisor;
                            expected = token;
                            lastbase = lastval;
                            break;
                        case CryptorithmType.SquareRoot:
                            var part = root.substr(0, root.length - indent);
                            var double = part.substr(0, part.length - 1);
                            var squared = part.substr(part.length - 1, 1);
                            if (double !== '') {
                                formula = "((" + double + "*20)+" + squared + ")*" + squared;
                            }
                            else {
                                formula = squared + "*" + squared;
                            }
                            lastbase = lastval;
                            break;
                    }
                    prefix = token;
                    state = buildState.WantMinus;
                    break;
                case '*':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix);
                    }
                    prefix = token;
                    state = buildState.WantMult;
                    if (this.cryptorithmType === CryptorithmType.Automatic) {
                        this.cryptorithmType = CryptorithmType.Multiplication;
                    }
                    break;
                case '+':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix);
                    }
                    prefix = token;
                    state = buildState.WantPlus;
                    if (this.cryptorithmType === CryptorithmType.Automatic) {
                        this.cryptorithmType = CryptorithmType.Addition;
                    }
                    if (this.cryptorithmType === CryptorithmType.Addition ||
                        this.cryptorithmType === CryptorithmType.Subtraction) {
                        lastbase = lastval + "+";
                    }
                    else if (this.cryptorithmType === CryptorithmType.Multiplication) {
                        indent++;
                    }
                    break;
                case '/':
                    if (state !== buildState.Idle) {
                        console.log('Found token:' + token + ' when already processing ' + prefix);
                    }
                    this.cryptorithmType = CryptorithmType.Division;
                    prefix = token;
                    state = buildState.WantDiv;
                    break;
                // Result of an operation (add/subtract/mult/divide)
                case '=':
                    if (state !== buildState.Idle && state !== buildState.WantQuotient) {
                        console.log('Found token:' + token + ' when already processing ' + prefix);
                    }
                    prefix = token;
                    if (state !== buildState.WantQuotient) {
                        state = buildState.WantEqual;
                    }
                    switch (this.cryptorithmType) {
                        case CryptorithmType.Division:
                            if (state !== buildState.WantQuotient) {
                                formula = lastbase + "-" + lastval;
                                if (indent > 0) {
                                    formula = "10*(" + formula + ")+" + dividend.substr(dividend.length - indent, 1);
                                }
                            }
                        case CryptorithmType.SquareRoot:
                        case CryptorithmType.CubeRoot:
                            formula = lastbase + '-' + lastval;
                            if (indent > 0) {
                                formula = "(" + formula + ")*100+" + rootbase.substr(rootbase.length - (indent * 2), 2);
                                indent--;
                            }
                            break;
                        case CryptorithmType.Division:
                            if (indent > 0) {
                                indent--;
                            }
                            break;
                        case CryptorithmType.Multiplication:
                            indent = 0;
                            break;
                        case CryptorithmType.Addition:
                        case CryptorithmType.Subtraction:
                            formula = lastbase + lastval;
                            break;
                    }
                    break;
                default:
                    if (state === buildState.Idle) {
                        console.log('Missing prefix string to process token:' + token);
                    }
                    var item = { prefix: prefix, indent: indent, content: "", class: "", formula: formula, expected: token };
                    lastval = token;
                    formula = '';
                    var isRoot = false;
                    var rootLen = 0;
                    var content = '';
                    // We need to parse out the number and collect all the digits
                    // if it has ' in it then we are going to be doing either a square or a cube root
                    // based on how many letters are grouped
                    for (var _a = 0, token_1 = token; _a < token_1.length; _a++) {
                        var c = token_1[_a];
                        if (c === '\'') {
                            if (prefix != '') {
                                console.log('Found quotes on other than the first token');
                            }
                            isRoot = true;
                            indent++;
                            if (this.cryptorithmType === CryptorithmType.Automatic) {
                                if (rootLen === 2) {
                                    this.cryptorithmType = CryptorithmType.SquareRoot;
                                }
                                else if (rootLen === 3) {
                                    this.cryptorithmType = CryptorithmType.CubeRoot;
                                }
                                else {
                                    console.log("Bad quote location at " + rootLen);
                                }
                            }
                            if (this.cryptorithmType === CryptorithmType.SquareRoot) {
                                item.prefix = "2";
                                numwidth = 2;
                                item.class = "ovl";
                            }
                            else if (this.cryptorithmType === CryptorithmType.CubeRoot) {
                                item.prefix = "3";
                                numwidth = 3;
                                item.class = "ovl";
                            }
                            rootLen = 0;
                        }
                        else {
                            if (c.toLocaleLowerCase != c.toUpperCase) {
                                this.usedletters[c] = true;
                            }
                            content += c;
                            rootLen++;
                        }
                    }
                    // See if we ended up with a Cuberoot
                    if (isRoot && rootLen === 3) {
                        this.cryptorithmType = CryptorithmType.CubeRoot;
                        item.prefix = "3";
                        numwidth = 3;
                    }
                    // See if we need to format the number into place
                    var padding = '';
                    for (var pad = 0; pad < numwidth * item.indent; pad++) {
                        padding += ' ';
                    }
                    item.indent = indent * numwidth;
                    switch (this.cryptorithmType) {
                        case CryptorithmType.SquareRoot: {
                            if (item.prefix === '^') {
                                // We need to split the characters into each character
                                // and put two spaces between
                                item.prefix = '';
                                item.content = content.split('').join('  ');
                                root = content;
                                var tempitem = lineitems.pop();
                                lineitems.push(item);
                                item = tempitem;
                                rootbase = item.content.replace(new RegExp(" ", "g"), "");
                                lastval = rootbase.substr(0, 2);
                            }
                            else {
                                // We want to start at the end and put an extra
                                // space between every second character
                                var temp = ' ' + content + padding;
                                item.content = '';
                                for (var i = temp.length - numwidth; i >= 0; i -= numwidth) {
                                    var toadd = temp.substr(i, numwidth);
                                    if (item.content != '') {
                                        item.content = toadd + ' ' + item.content;
                                    }
                                    else {
                                        item.content = toadd;
                                    }
                                }
                            }
                            state = buildState.Idle;
                            break;
                        }
                        case CryptorithmType.CubeRoot: {
                            if (item.prefix === '^') {
                                // Put three spaces between every character
                                item.prefix = '';
                                item.content = content.split('').join('   ');
                                root = content;
                                var tempitem = lineitems.pop();
                                lineitems.push(item);
                                item = tempitem;
                                rootbase = item.content;
                            }
                            else {
                                // We want to start at the end and put an extra
                                // space between every third character
                                var temp = '  ' + content + padding;
                                item.content = '';
                                for (var i = temp.length - numwidth; i >= 0; i -= numwidth) {
                                    var toadd = temp.substr(i, numwidth);
                                    if (item.content != '') {
                                        item.content = toadd + ' ' + item.content;
                                    }
                                    else {
                                        item.content = toadd;
                                    }
                                }
                            }
                            state = buildState.Idle;
                            break;
                        }
                        case CryptorithmType.Division: {
                            // When dealing with the divisor, we put it to the left of the dividend
                            if (item.prefix === '/') {
                                item = lineitems.pop();
                                divwidth = item.content.length;
                                dividend = item.content;
                                divisor = content;
                                item.content = content + ')' + item.content;
                                state = buildState.WantQuotient;
                            }
                            else {
                                item.content = content + padding;
                                if (state === buildState.WantQuotient) {
                                    quotient = content;
                                    var tempitem = lineitems.pop();
                                    item.prefix = '';
                                    lineitems.push(item);
                                    item = tempitem;
                                    indent = content.length - 1;
                                    lastval = dividend.substr(0, dividend.length - indent);
                                }
                                state = buildState.Idle;
                            }
                            break;
                        }
                        default: {
                            // No need to do anything, we are happy with the
                            // content and the padding
                            state = buildState.Idle;
                            item.content = content + padding;
                            break;
                        }
                    }
                    if (item.prefix === '=') {
                        item.prefix = '';
                        item.class = "ovl";
                    }
                    lineitems.push(item);
                    if (item.content.length > maxwidth) {
                        maxwidth = item.content.length;
                    }
                    prefix = '';
                    break;
            }
        }
        this.base = Object.keys(this.usedletters).length;
        var charset = "";
        for (var index = 0; index < this.base; index++) {
            var c = index.toString(36);
            charset += c;
        }
        this.setCharset(charset);
        // We have built the lineitems array, now we just need to turn it into
        // a table (respecting the maxwidth)
        var table = $("<table>", { class: "cmath" });
        var tbody = $("<tbody>");
        for (var _b = 0, lineitems_1 = lineitems; _b < lineitems_1.length; _b++) {
            var item = lineitems_1[_b];
            var tr = $("<tr>");
            // Pad on the left with as many columns as we need
            if (item.content.length < maxwidth) {
                $("<td>", { colspan: maxwidth - item.content.length }).html("&nbsp;").appendTo(tr);
            }
            var td = null;
            var addclass = item.class;
            switch (item.prefix) {
                case '2': {
                    td = $("<td>").html("&radic;").addClass("math"); // √ - SQUARE ROOT
                    addclass = '';
                    break;
                }
                case '3': {
                    td = $("<td>").html("&#8731;").addClass("math"); // ∛ - CUBE ROOT
                    addclass = '';
                    break;
                }
                case '4': {
                    td = $("<td>").html("&#8732;").addClass("math"); // ∜ - FOURTH ROOT
                    addclass = '';
                    break;
                }
                default: {
                    td = $("<td>").text(item.prefix); //.addClass("math")
                    break;
                }
            }
            if (addclass) {
                td.addClass(addclass);
            }
            td.appendTo(tr);
            addclass = item.class;
            if (item.content !== '') {
                for (var _c = 0, _d = item.content; _c < _d.length; _c++) {
                    var c = _d[_c];
                    td = $("<td>");
                    $("<div>", { class: "slil" }).text(c).appendTo(td);
                    if (c === ')') {
                        td.addClass("math");
                        addclass = "ovl";
                    }
                    else if (this.usedletters[c]) {
                        $('<input/>', { type: "text", class: "sli", 'data-char': c }).appendTo(td);
                    }
                    if (addclass) {
                        td.addClass(addclass);
                    }
                    td.appendTo(tr);
                }
            }
            var content = $('');
            if (item.formula !== '') {
                content = $("<span>", { class: "formula", 'data-formula': item.formula, 'data-expect': item.expected });
            }
            $("<td>", { class: "solv" }).append(content).appendTo(tr);
            tr.appendTo(tbody);
        }
        tbody.appendTo(table);
        return table;
    };
    /**
     * Creates an HTML table to display the mapping table
     * @returns {JQuery<HTMLElement} HTML to put into a DOM element
     */
    CryptorithmSolver.prototype.createFreqEditTable = function () {
        if (this.base === undefined || this.base < 1) {
            return null;
        }
        var table = $("<table>", { class: "tfreq" });
        var tbody = $("<tbody>");
        var thead = $("<thead>");
        var tr = $("<tr>");
        var a0x = $("<div>", { class: "sol" });
        $("<span>", { class: "h" }).text("0-" + (this.base - 1).toString(36) + ":").appendTo(a0x);
        var a10 = $("<div>", { class: "sol" });
        $("<span>", { class: "h" }).text("1-0:").appendTo(a10);
        var ax0 = $("<div>", { class: "sol" });
        $("<span>", { class: "h" }).text((this.base - 1).toString(36) + "-0:").appendTo(ax0);
        var a01 = $("<div>", { class: "sol" });
        $("<span>", { class: "h" }).text("0-1:").appendTo(a01);
        $("<td>", { colspan: 2 }).text("Base " + String(this.base)).appendTo(tr);
        for (var index = 0; index < this.base; index++) {
            $("<th>").text(index.toString(36)).appendTo(tr);
            $("<span>", { 'data-val': index.toString(36) }).text("?").appendTo(a0x);
            var val = (index + 1) % this.base;
            $("<span>", { 'data-val': val.toString(36) }).text("?").appendTo(a10);
            val = (this.base - index - 1) % this.base;
            $("<span>", { 'data-val': val.toString(36) }).text("?").appendTo(ax0);
            val = (val + 1) % this.base;
            $("<span>", { 'data-val': val.toString(36) }).text("?").appendTo(a01);
        }
        tr.appendTo(thead);
        thead.appendTo(table);
        var pos = 0;
        // Now we want to build the solving table
        for (var c in this.usedletters) {
            var tr_1 = $("<tr>");
            var th = $("<th>");
            $("<div>", { class: "slil" }).text(c).appendTo(th);
            th.appendTo(tr_1);
            var td = $("<td>");
            this.makeFreqEditField(c).appendTo(td);
            td.appendTo(tr_1);
            for (var index = 0; index < this.base; index++) {
                $("<td>", { id: c + String(index), 'data-val': 0 }).addClass("rtoggle rtoggle-0").appendTo(tr_1);
            }
            tr_1.appendTo(tbody);
        }
        tbody.appendTo(table);
        var topdiv = $("<div>");
        var solsdiv = $("<div>", { class: "sols" });
        a0x.appendTo(solsdiv);
        a10.appendTo(solsdiv);
        ax0.appendTo(solsdiv);
        a01.appendTo(solsdiv);
        solsdiv.appendTo(topdiv);
        table.appendTo(topdiv);
        return topdiv;
    };
    /**
     *
     */
    CryptorithmSolver.prototype.attachHandlers = function () {
        _super.prototype.attachHandlers.call(this);
        var tool = this;
        $(".rtoggle").click(function () {
            var id = $(this).attr("id");
            var sel = $(this).attr("data-val");
            $(this).removeClass("rtoggle-" + sel);
            sel = String((Number(sel) + 1) % 3);
            $(this).addClass("rtoggle-" + sel).attr("data-val", sel);
            console.log('Changing ' + id + " to " + sel);
        });
    };
    return CryptorithmSolver;
}(CipherSolver));
