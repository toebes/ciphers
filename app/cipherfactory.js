"use strict";
/// <reference types="ciphertypes" />
Object.defineProperty(exports, "__esModule", { value: true });
var cipherencoder_1 = require("./cipherencoder");
var cipheraffineencoder_1 = require("./cipheraffineencoder");
var ciphersolver_1 = require("./ciphersolver");
var ciphercheckerboardsolver_1 = require("./ciphercheckerboardsolver");
var ciphergromarksolver_1 = require("./ciphergromarksolver");
var ciphermorbitsolver_1 = require("./ciphermorbitsolver");
var cipherfractionatedmorsesolver_1 = require("./cipherfractionatedmorsesolver");
var ciphervigenereencoder_1 = require("./ciphervigenereencoder");
var cipherxenocryptsolver_1 = require("./cipherxenocryptsolver");
var ciphercryptarithmsolver_1 = require("./ciphercryptarithmsolver");
function CipherFactory(ciphertype, lang) {
    console.log('Selecting:' + ciphertype + " lang=" + lang);
    if (typeof lang === 'undefined') {
        lang = "en";
    }
    lang = lang.toLowerCase();
    var cipherTool = null;
    switch (ciphertype) {
        case 'Morbit':
            cipherTool = new ciphermorbitsolver_1.default();
            break;
        case 'FractionatedMorse':
            cipherTool = new cipherfractionatedmorsesolver_1.default();
            break;
        case 'Checkerboard':
            cipherTool = new ciphercheckerboardsolver_1.default();
            break;
        case 'Gromark':
            cipherTool = new ciphergromarksolver_1.default();
            break;
        case 'Xenocrypt':
            cipherTool = new cipherxenocryptsolver_1.default();
            break;
        case 'Encoder':
            cipherTool = new cipherencoder_1.default();
            break;
        case 'Vigenere':
            cipherTool = new ciphervigenereencoder_1.default();
            break;
        case 'Affine':
            cipherTool = new cipheraffineencoder_1.default();
            break;
        case 'Cryptarithm':
            cipherTool = new ciphercryptarithmsolver_1.default();
        case 'Standard':
        default:
            cipherTool = new ciphersolver_1.default();
            break;
    }
    cipherTool.init(lang);
    return cipherTool;
}
exports.default = CipherFactory;
