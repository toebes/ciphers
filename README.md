# ciphers

This set of TypeScript routines and web pages meets two separate needs:

1. Test generation for Science Olympiad Codebusters
1. Solvers for various American Cryptogram Association Ciphers

You can see the current version of the application at https://toebes.com/codebusters/

The application is built using a combination of:

-   TypeScript (http://www.typescriptlang.org/) – All of the code for processing the page
-   JQuery (https://jquery.com/) - For general HTML traversal
-   ZURB Foundation 6 for Sites (https://foundation.zurb.com/sites/docs/) – Provides the CSS and reactive layout engine
-   what-input - (https://github.com/ten1seven/what-input) Used by Foundation for tracking the current input method
-   WebPack – (https://webpack.js.org/) - JS packager/builder
-   Shopify Draggable - (https://github.com/Shopify/draggable) Enhancements for drag/drop sorting of lists
-   KaTeX – (https://khan.github.io/KaTeX/) - Math Rendering (from LaTeX syntax)
-   CKEditor 5 – (https://ckeditor.com/ckeditor-5/) - Rich text editor - Custom inline build at https://github.com/toebes/ckeditor5-build-inline
-   Es5-shim – (https://github.com/es-shims/es5-shim) Shim to bring all ECMAScript 5 methods to the browser
-   Es6-shim – (https://github.com/es-shims/es6-shim) Shim for making sure all ECMAScript 6 methods are supported
-   js-cookie - (https://github.com/js-cookie/js-cookie) Provides access to cookies on browsers which don't support `localStorage`
-   Pigpen Font - (https://blogfonts.com/pigpen-cipher.font) [[*License*]](https://github.com/toebes/ciphers/blob/master/app/common/fonts/OFL.txt) provides the PigPen/Masonic cipher characters
-   JuliaMono Font - (https://github.com/cormullion/juliamono) [[*License*]](https://github.com/toebes/ciphers/blob/master/app/common/JuliaMono_License.txt) provides mono spaced font for any [combining diacritic characters](https://en.wikipedia.org/wiki/Combining_character).
