/**
 * @license Copyright (c) 2014-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import { InlineEditor } from '@ckeditor/ckeditor5-editor-inline';
import { BlockQuote } from '@ckeditor/ckeditor5-block-quote';
import { Bold, Code, Italic, Subscript, Superscript, Underline } from '@ckeditor/ckeditor5-basic-styles';
import { Essentials } from '@ckeditor/ckeditor5-essentials';
import { FontBackgroundColor, FontColor, FontFamily, FontSize } from '@ckeditor/ckeditor5-font';
import { Link } from '@ckeditor/ckeditor5-link';
import { List } from '@ckeditor/ckeditor5-list';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph';
import { RemoveFormat } from '@ckeditor/ckeditor5-remove-format';
import { TextTransformation } from '@ckeditor/ckeditor5-typing';

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