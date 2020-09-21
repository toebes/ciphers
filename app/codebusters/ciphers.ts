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
import * as $ from "jquery";
import "foundation.css";
import "foundation-sites";
import "katex.css";
import "../common/styles.css";
import "flatpickr.css";
// import "datatables.net";
// import "datatables.net-dt"; 
// import "datatables.css";

import { CipherHandler } from "../common/cipherhandler";
import { CipherFactory } from "./cipherfactory";

let cipherTool: CipherHandler = new CipherHandler();
declare let window: any;
window.cipherTool = cipherTool;

$(function (): void {
    // Patch for a Foundation Bug in v6.3.1
    $(window).on("changed.zf.mediaquery", () => {
        $(".is-dropdown-submenu.invisible").removeClass("invisible");
    });
    let data_lang;
    let data_cipher;
    // First figure out what type of solver we are building
    $("[data-cipher]").each((i, elem) => {
        data_cipher = $(elem).attr("data-cipher");
        data_lang = $(elem).attr("data-lang");
    });
    window.cipherTool = cipherTool = CipherFactory(data_cipher, data_lang);
    cipherTool.layout();
    $(document).foundation();
});
