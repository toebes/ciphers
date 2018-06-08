"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
* ciphers.js is a library for JavaScript which provides functions for
* generating web pages to solve Ciphers of many forms.
*
* @version 1.0.0
* @date    2017-02-24
*
* @license
* Copyright (C) 2017-2018 John A Toebes <john@toebes.com>
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not
* use this file except in compliance with the License. You may obtain a copy
* of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
* License for the specific language governing permissions and limitations under
* the License.
*/
/**
 * Main CipherTool class object
 * @type {Object.<string, function>}
 */
var $ = require("jquery");
require("jquery-ui");
require("summernote");
require("dataTables");
require("dataTables-colReorder");
require("../jquery-ui.min.css");
require("../styles.css");
require("../summernote-lite.css");
var cipherhandler_1 = require("./cipherhandler");
var cipherfactory_1 = require("./cipherfactory");
var cipherTool = new cipherhandler_1.default();
$(function () {
    cipherTool = cipherfactory_1.default(undefined, undefined);
    // First figure out what type of solver we are building
    $("[data-cipher]").each(function () {
        cipherTool = cipherfactory_1.default($(this).attr('data-cipher'), $(this).attr('data-lang'));
    });
    // process the "cipher-type" class
    $(".cipher-type").each(function () {
        cipherTool.setCipherType($(this).attr('id'));
    });
    // Handler for .ready() called.
    $('#load').button().unbind('click').click(function () {
        cipherTool.load();
    });
    $('#reset').button().unbind('click').click(function () {
        cipherTool.reset();
    });
    //    $('#encrypt').button().unbind('click').click(function () {
    //        cipherTool.encrypt()
    //    });
    // Morbit Solving Helper
    $(".sfind").change(function () {
        cipherTool.findPossible($(this).val());
    }).blur(function () {
        cipherTool.findPossible($(this).val());
    });
    $(".lang").each(function () {
        cipherTool.setLangDropdown($(this));
    });
    cipherTool.UpdateFreqEditTable();
    cipherTool.attachHandlers();
});
