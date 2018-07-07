"use strict"

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
import 'dataTables'
import 'dataTables-colReorder'
import * as $ from "jquery"
import 'jquery-ui'
import 'summernote'
import '../jquery-ui.min.css'
import '../styles.css'
import '../summernote-lite.css'

import { CipherFactory } from "./cipherfactory"
import { CipherHandler } from "./cipherhandler"

let cipherTool: CipherHandler = new CipherHandler()
declare let window: any
window.cipherTool = cipherTool

$(function (): void {
    cipherTool = CipherFactory(undefined, undefined)
    // First figure out what type of solver we are building
    $("[data-cipher]").each((i, elem) => {
        cipherTool = CipherFactory($(elem).attr('data-cipher'), $(elem).attr('data-lang'))
    })
    window.cipherTool = cipherTool
    cipherTool.layout();
})
