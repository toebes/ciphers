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
var CipherAffineEncoder = /** @class */ (function (_super) {
    __extends(CipherAffineEncoder, _super);
    function CipherAffineEncoder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CipherAffineEncoder.prototype.affinechar = function (a, b, chr) {
        var charset = this.getCharset();
        var x = charset.indexOf(chr.toUpperCase());
        if (x < 0) {
            return chr;
        }
        var y = ((a * x) + b) % charset.length;
        var res = charset.substr(y, 1);
        console.log('char=' + chr + ' x=' + x + ' a=' + a + ' b=' + b + ' y=' + y + ' res=' + res);
        return res;
    };
    /*
    * Creates an HTML table to display the frequency of characters
    */
    CipherAffineEncoder.prototype.createAffineSolutionTable = function () {
        var table = $('<table/>').addClass("tfreq");
        var thead = $('<thead/>');
        var tbody = $('<tbody/>');
        var headrow = $('<tr/>');
        var freqrow = $('<tr/>');
        var replrow = $('<tr/>');
        var altreprow = $('<tr/>');
        var i, len;
        var charset = this.getCharset();
        headrow.append($('<th/>').addClass("topleft"));
        freqrow.append($('<th/>').text("Frequency"));
        replrow.append($('<th/>').text("Replacement"));
        altreprow.append($('<th/>').text("Rev Replace"));
        for (i = 0, len = charset.length; i < len; i++) {
            var c = charset.substr(i, 1).toUpperCase();
            headrow.append($('<th/>').text(c));
            freqrow.append($('<td id="f' + c + '"/>'));
            var td = $('<td/>');
            td.append(this.makeFreqEditField(c));
            replrow.append(td);
            altreprow.append($('<td id="rf' + c + '"/>'));
        }
        thead.append(headrow);
        tbody.append(freqrow);
        tbody.append(replrow);
        if (this.ShowRevReplace) {
            tbody.append(altreprow);
        }
        table.append(thead);
        table.append(tbody);
        return table;
    };
    /**
 * Initializes the encoder.
 * We don't want to show the reverse replacement since we are doing an encode
 */
    CipherAffineEncoder.prototype.init = function () {
        this.ShowRevReplace = false;
        var affineCheck = {};
        this.affineCheck['p'] = -1;
        this.affineCheck['q'] = -1;
        this.affineCheck['r'] = -1;
        this.affineCheck['s'] = -1;
        $("[id='solve']").prop('disabled', true);
        $("[id='solve']").prop('value', 'Select 2 hint letters');
        console.log('Init...' + this.affineCheck['p']);
    };
    CipherAffineEncoder.prototype.build = function (msg) {
        console.log('Incorrect Build called for Affine');
        return null;
    };
    CipherAffineEncoder.prototype.buildAffine = function (msg, a, b) {
        var i;
        var charset = this.getCharset();
        var message = '';
        var cipher = '';
        var result = $('<div>');
        var msgLength = msg.length;
        var lastSplit = -1;
        var c = '';
        var table = $('<table/>').addClass("tfreq");
        var tableBody = $('<tbody/>');
        var messageRow = $('<tr/>');
        var cipherRow = $('<tr/>');
        for (i = 0; i < msgLength; i++) {
            var messageChar = msg.substr(i, 1).toUpperCase();
            var cipherChar = '';
            var m = charset.indexOf(messageChar);
            if (m >= 0) {
                message += messageChar;
                cipherChar = this.affinechar(a, b, messageChar);
                cipher += cipherChar;
            }
            else {
                message += messageChar;
                cipher += messageChar;
                lastSplit = cipher.length;
                continue;
            }
            messageRow.append($('<td id="m' + i + '"/>').addClass("TOANSWER").text(messageChar));
            cipherRow.append($('<td id="' + i + '"/>').addClass("TOSOLVE").text(cipherChar));
            /*
                        if (message.length >= this.maxEncodeWidth) {
                            if (lastSplit === -1) {
                                result.append($('<div>', {class: "TOSOLVE"}).text(message));
                                result.append($('<div>', {class: "TOANSWER"}).text(cipher));
                                message = '';
                                cipher = '';
                                lastSplit = -1;
                            }
                            else {
                                var messagePart = message.substr(0, lastSplit);
                                var cipherPart = cipher.substr(0, lastSplit);
                                message = message.substr(lastSplit);
                                cipher = cipher.substr(lastSplit);
                                result.append($('<div>', {class: "TOSOLVE"}).text(messagePart));
                                result.append($('<div>', {class: "TOANSWER"}).text(cipherPart));
                            }
                        }
            */
        }
        if (message.length > 0) {
            tableBody.append(cipherRow);
            tableBody.append(messageRow);
            //result.append($('<div>', {class: "TOSOLVE"}).text(message));
            //result.append($('<div>', {class: "TOANSWER"}).text(cipher));
        }
        table.append(tableBody);
        //return result.html();
        return table;
    };
    CipherAffineEncoder.prototype.solveIt = function (m1, c1, m2, c2) {
        var answer = 'Can\'t solve.';
        var c = c1 - c2;
        var m = m1 - m2;
        while (m < 0) {
            m += 26;
        }
        // The reality is that A can only be one of: 1, 3, 5, 7, 9, 11,
        // 15, 17, 19, 21, 23, 25.  B will be between 0 and 25.
        while (((c < 0) || (c % m !== 0)) && c < 626) {
            c += 26;
        }
        var A = c / m;
        console.log('A=' + A);
        // if A not in the list, return answer.
        if ((A % 2 !== 1) || (A < 1) || (A > 25)) {
            return answer;
        }
        var B = (c1 - (A * m1)) % 26;
        while (B < 0) {
            B += 26;
        }
        return 'A = ' + A + '; B = ' + B;
    };
    CipherAffineEncoder.prototype.load = function () {
        var tool = this;
        var charset = this.getCharset();
        var a = $('#a').spinner("value");
        var b = $('#b').spinner("value");
        //  var a = parseInt(atxt);
        //  var b = parseInt(btxt);
        if (!this.iscoprime(a)) {
            console.log('not coprime');
            $('#err').text('A value of ' + a + ' is not coprime with ' + charset.length);
            return;
        }
        var toencode = this.cleanString($('#toencode').val());
        console.log('a=' + a + ' b=' + b + ' encode=' + toencode);
        var res = this.buildAffine(toencode, a, b);
        $("#answer").empty().append(res);
        $("td").click(function () {
            console.log("clicked " + $(this).get);
            var id = $(this).attr('id');
            console.log("id = " + id);
            //            if ($('td#'+id+'.TOSOLVE').getClass() === "TOSOLVE") {
            //                console.log("top clicked");
            //            }
            //            else {
            //                console.log("bottom clicked");
            //            }
            console.log("other = " + $('td#' + id + '.TOSOLVE').text() + " nother = " + $('td#' + id + '.TOANSWER').text());
            // change the style
            var clickedId = tool.affineCheck['olderId'];
            if (clickedId !== -1) {
                // turn new click blue, reset old click for TOSOLVE
                $('td#' + clickedId + '.TOSOLVECLICK').removeClass("TOSOLVECLICK").addClass("TOSOLVE");
            }
            $('td#' + id + '.TOSOLVE').removeClass("TOSOLVE").addClass("TOSOLVECLICK");
            // turn 
            tool.affineCheck['q'] = tool.affineCheck['p'];
            tool.affineCheck['s'] = tool.affineCheck['r'];
            tool.affineCheck['p'] = charset.indexOf($('td#m' + id + '.TOANSWER').text());
            tool.affineCheck['r'] = charset.indexOf($('td#' + id + '.TOSOLVECLICK').text());
            tool.affineCheck['olderId'] = tool.affineCheck['oldId'];
            tool.affineCheck['oldId'] = parseInt(id);
            if (tool.affineCheck.p !== -1 && tool.affineCheck.q !== -1) {
                //solve it
                console.log('solve: ');
                var sol = tool.solveIt(tool.affineCheck['p'], tool.affineCheck['r'], tool.affineCheck['q'], tool.affineCheck['s']);
                var expected = 'A = ' + $("#a").val() + '; B = ' + $("#b").val();
                if (sol === expected) {
                    console.log('showing button');
                    $("[id='solve']").prop('disabled', false);
                    $("[id='solve']").prop('value', 'Display Solution');
                }
                else {
                    console.log('hiding button');
                    $("[id='solve']").prop('disabled', true);
                    $("[id='solve']").prop('value', 'Indeterminate Solution');
                }
                //$("#solve").text(sol);
            }
        });
        //var sol = solveIt(18, 14, 7, 5);
        /*
                var res = "";
                $('#err').text('');
                console.log('is coprime');
                for (var i = 0, len = str.length; i < len; i++) {
                    var t = affinechar(a, b, str.substr(i, 1));
                    res += t;
                }
                return res;
                var encoded = this.cleanString($('#inputdata').val());
        */
        /*
        * If it is characteristic of the cipher type (e.g. patristocrat),
        * rebuild the string to be encoded in to five character sized chunks.
        */
        /*
                var blockSize = parseInt($('input[id=blocksize').val());
                if (blockSize > 0 && blockSize < this.maxEncodeWidth) {
                    encoded = this.chunk(encoded, blockSize);
                }
                var key = this.cleanString($('#keystring').val());
                $('#err').text('');
                var res = this.build(encoded, a, b);
                $('#answer').html(res);
                this.attachHandlers();
        */
    };
    return CipherAffineEncoder;
}(CipherEncoder));
// Affine: {
//     init: 'initAffine',
//     normalizeHTML: 'normalizeHTML',
//     createFreqEditTable: 'createNormalFreqEditTable',
//     load: 'loadAffine',
//     reset: 'resetSolver',
//     build: 'buildAffine',
//     makeFreqEditField: 'makeViewField',
//     updateSel: 'updateStandardSel',
//     setChar: 'setStandardChar',
//     setMultiChars: 'setStandardMultiChars',
//     updateMatchDropdowns: 'updateStandardMatchDropdowns',
//     findPossible: 'findStandard'
// }
