# ciphers

This set of TypeScript routines and web pages meets two separate needs:

1. Test generation for Science Olympiad Code Busters
1. Solvers for various American Cryptogram Association Ciphers

You can see the current version of the application at https://toebes.com/Ciphers/

The application is built using a combination of:

-   TypeScript (http://www.typescriptlang.org/) – All of the code for processing the page
-   JQuery (https://jquery.com/) - For general HTML traversal
-   ZURB Foundation 6 for Sites (https://foundation.zurb.com/sites/docs/) – Provides the CSS and reactive layout engine
-   what-input - (https://github.com/ten1seven/what-input) Used by Foundation for tracking the current input method
-   WebPack – (https://webpack.js.org/) - JS packager/builder
-   Html5Sortable - (https://github.com/lukasoppermann/html5sortable) Enhancements for drag/drop sorting of lists
-   KaTeX – (https://khan.github.io/KaTeX/) - Math Rendering (from LaTeX syntax)
-   CKEditor 5 – (https://ckeditor.com/ckeditor-5/) - Rich text editor - Custom inline build at https://github.com/toebes/ckeditor5-build-inline
-   Es5-shim – (https://github.com/es-shims/es5-shim) Shim to bring all ECMAScript 5 methods to the browser
-   Es6-shim – (https://github.com/es-shims/es6-shim) Shim for making sure all ECMAScript 6 methods are supported
-   js-cookie - (https://github.com/js-cookie/js-cookie) Provides access to cookies on browsers which don't support `localStorage`
