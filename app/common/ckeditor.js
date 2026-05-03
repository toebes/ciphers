/**
 * @license Copyright (c) 2014-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import {
    InlineEditor,
    BlockQuote,
    Bold,
    Code,
    Essentials,
    FontBackgroundColor,
    FontColor,
    FontFamily,
    FontSize,
    Italic,
    Link,
    List,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    Subscript,
    Superscript,
    TextTransformation,
    Underline
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

export class CKInlineEditor extends InlineEditor { }

// Plugins to include in the build.
CKInlineEditor.builtinPlugins = [
    BlockQuote,
    Bold,
    Code,
    Essentials,
    FontBackgroundColor,
    FontColor,
    FontFamily,
    FontSize,
    Italic,
    Link,
    List,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    Subscript,
    Superscript,
    TextTransformation,
    Underline
];

// Editor configuration.
CKInlineEditor.defaultConfig = {
    licenseKey: 'GPL',
    toolbar: {
        items: [
            'bold',
            'italic',
            'underline',
            'subscript',
            'superscript',
            '|',
            'fontFamily',
            'fontSize',
            '|',
            'fontColor',
            'fontBackgroundColor',
            '|',
            'link',
            'bulletedList',
            'numberedList',
            'blockQuote',
            'code',
            '|',
            'removeFormat',
            '|',
            'undo',
            'redo'
        ]
    },
    language: 'en',
    image: {
        toolbar: [
            'imageTextAlternative',
            'imageStyle:full',
            'imageStyle:side'
        ]
    }
};