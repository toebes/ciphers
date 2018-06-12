"use strict";

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
import * as $ from "jquery"
import 'jquery-ui'
import 'summernote'
import 'dataTables'
import 'dataTables-colReorder'
import '../jquery-ui.min.css'
import '../styles.css'
import '../summernote-lite.css'

import CipherHandler from "./cipherhandler"
import CipherFactory from "./cipherfactory"

 let cipherTool:CipherHandler = new CipherHandler();

 $(function () {
    cipherTool = CipherFactory(undefined,undefined)
    // First figure out what type of solver we are building
    $("[data-cipher]").each(function () {
        cipherTool = CipherFactory($(this).attr('data-cipher'),$(this).attr('data-lang'))
    });
    // process the "cipher-type" class
    $(".cipher-type").each(function () {
        cipherTool.setCipherType($(this).attr('id'))
    });
    // Handler for .ready() called.
    $('#load').button().unbind('click').click(function () {
        cipherTool.load()
    });
    $('#reset').button().unbind('click').click(function () {
        cipherTool.reset()
    });

    $(".lang").each(function () {
        cipherTool.setLangDropdown($(this));
    });
    cipherTool.layout()
    cipherTool.UpdateFreqEditTable()
    cipherTool.attachHandlers()
});