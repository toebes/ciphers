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
var CipherVigenereEncoder = /** @class */ (function (_super) {
    __extends(CipherVigenereEncoder, _super);
    function CipherVigenereEncoder() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.doEncoding = true;
        return _this;
    }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Vigenere Encoder
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    CipherVigenereEncoder.prototype.layoutVigenere = function () {
        var operationChoice = $('<div>');
        var label = $('<label>', { for: 'ops' }).text('Operation');
        operationChoice.append(label);
        var radioBox = $('<div>', { id: 'ops', class: 'ibox' });
        radioBox.append($('<input>', { id: 'encode', type: 'radio', name: 'operation', value: 'encode', checked: 'checked' }));
        radioBox.append($('<label>', { for: 'encode', class: 'rlab' }).text('Encode'));
        radioBox.append($('<input>', { id: 'decode', type: 'radio', name: 'operation', value: 'decode' }));
        radioBox.append($('<label>', { for: 'decode', class: 'rlab' }).text('Decode'));
        operationChoice.append(radioBox);
        return operationChoice;
    };
    /**
     * Set vigenere encode or decode mode
     */
    CipherVigenereEncoder.prototype.setVigenereInputs = function () {
        var operation = $('input[name=operation]:checked').val();
        if (operation === 'encode') {
            // zero the blocksize spinner and show it
            $(':input[id=blocksize]').spinner('value', 0);
            $('div[id=blocksize]').val('');
            $('div[id=blocksize]').show();
            // Change the button label to 'Encode'
            $(':button').button('option', 'label', 'Encode');
            this.doEncoding = true;
        }
        else {
            // During decode, message format will not be changed.
            $('div[id=blocksize]').hide();
            // Change button label to 'Decode'
            $(':button').button('option', 'label', 'Decode');
            this.doEncoding = false;
        }
        // Clear message and answer, leave key alone--for re-use.
        $('textarea[id=inputdata]').val('');
        $(".ans").text('');
    };
    CipherVigenereEncoder.prototype.buildVigenere = function (msg, key) {
        var i;
        var charset = this.getCharset();
        var message = '';
        var keyIndex = 0;
        var keyString = '';
        var cipher = '';
        var result = $('<div>');
        var msgLength = msg.length;
        var keyLength = key.length;
        var lastSplit = -1;
        var c = 0;
        //        if (msgLength > keyLength) {
        var factor = (msgLength / keyLength).toFixed(0);
        for (i = 0; i < factor; i++) {
            keyString = keyString.concat(key);
        }
        keyString += key.substr(0, msgLength % keyLength);
        //        }
        for (i = 0; i < msgLength; i++) {
            var messageChar = msg.substr(i, 1).toUpperCase();
            var m = charset.indexOf(messageChar);
            if (m >= 0) {
                var keyChar = keyString.substr(keyIndex, 1).toUpperCase();
                var k = charset.indexOf(keyChar);
                while (k < 0) {
                    keyIndex++;
                    keyChar = keyString.substr(keyIndex, 1).toUpperCase();
                    k = charset.indexOf(keyChar);
                }
                message += messageChar;
                // For vigenere...this is the meat.
                if (this.doEncoding) {
                    // use this to encode.
                    c = (m + k) % 26;
                }
                else {
                    // use this to decode.
                    c = (m - k);
                }
                // The substr() basically does modulus with the negative offset
                // in the decode case.  Thanks JavaScript!
                cipher += charset.substr(c, 1);
                keyIndex++;
            }
            else {
                message += messageChar;
                cipher += messageChar;
                lastSplit = cipher.length;
                continue;
            }
            if (message.length >= this.maxEncodeWidth) {
                if (lastSplit === -1) {
                    result.append($('<div>', { class: "TOSOLVE" }).text(message));
                    result.append($('<div>', { class: "TOANSWER" }).text(cipher));
                    message = '';
                    cipher = '';
                    lastSplit = -1;
                }
                else {
                    var messagePart = message.substr(0, lastSplit);
                    var cipherPart = cipher.substr(0, lastSplit);
                    message = message.substr(lastSplit);
                    cipher = cipher.substr(lastSplit);
                    result.append($('<div>', { class: "TOSOLVE" }).text(messagePart));
                    result.append($('<div>', { class: "TOANSWER" }).text(cipherPart));
                }
            }
        }
        if (message.length > 0) {
            result.append($('<div>', { class: "TOSOLVE" }).text(message));
            result.append($('<div>', { class: "TOANSWER" }).text(cipher));
        }
        return result;
    };
    /**
     * Loads up the values for vigenere
     */
    CipherVigenereEncoder.prototype.load = function () {
        var encoded = this.cleanString($('#inputdata').val());
        /*
        * If it is characteristic of the cipher type (e.g. patristocrat),
        * rebuild the string to be encoded in to five character sized chunks.
        */
        var blockSize = parseInt($('input[id=blocksize').val());
        if (blockSize > 0 && blockSize < this.maxEncodeWidth) {
            encoded = this.chunk(encoded, blockSize);
        }
        var key = this.cleanString($('#keystring').val());
        $('#err').text('');
        var res = this.buildVigenere(encoded, key);
        $('#answer').empty().append(res);
        this.attachHandlers();
    };
    CipherVigenereEncoder.prototype.attachHandlers = function () {
        var tool = this;
        //Argument of type '{ fontNames: string[]; toolbar: TypeOrArray<string>[][]; }' is not assignable to parameter of type '"editor.unlink" | "unlink"'.
        // Type '{ fontNames: string[]; toolbar: TypeOrArray<string>[][]; }' is not assignable to type '"unlink"'.
        $('input[type=radio][name=enctype]').change(function () {
            tool.setkvalinputs();
        });
        $('input[type=radio][name=operation]').change(function () {
            tool.setVigenereInputs();
        });
        tool.setkvalinputs();
        _super.prototype.attachHandlers.call(this);
    };
    /**
     * Set flag to 'chunk' input data string befre encoding.  Used in Patristocrat,
     */
    CipherVigenereEncoder.prototype.setCipherType = function (cipherType) {
        var tool = this;
        if (cipherType === 'vigenere') {
            console.log('Make a nice vigenere...');
            $('.cipher-type').each(function () {
                $(this).empty().append(tool.layoutVigenere());
            });
            this.attachHandlers();
        }
    };
    return CipherVigenereEncoder;
}(CipherEncoder));
// Vigenere: {
//     init: 'initEncoder',
//     normalizeHTML: 'normalizeHTML',
//     load: 'loadVigenere',
//     reset: 'resetSolver',
//     build: 'buildVigenere',
//     makeFreqEditField: 'makeViewField',
//     updateSel: 'updateStandardSel',
//     setChar: 'setStandardChar',
//     setMultiChars: 'setStandardMultiChars',
//     updateMatchDropdowns: 'updateStandardMatchDropdowns',
//     findPossible: 'findStandard'
// },
