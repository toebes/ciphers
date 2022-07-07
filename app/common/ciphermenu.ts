import { ICipherType } from '../common/ciphertypes';
import { menuItem } from '../common/jtmenu';

/**
 * CipherMenu is the main menu for all the Ciphers and defines the navigation for the overall app.
 */
export const CipherMenu: menuItem[] = [
    {
        title: 'File',
        classname: 'menufile',
        menu: [
            { title: 'New', action: 'new' },
            { title: 'Open', action: 'open' },
            { title: 'Save', action: 'save', classname: 'save' },
        ],
    },
    {
        title: 'CON Management',
        classname: 'menuaca',
        menu: [
            { title: 'ACA Imported Issues', href: 'ACAManage.html' },
            { title: 'Current ACA Cons', href: 'ACAProblems.html' },
            // { title: '', classname: 'divider' },

            // { title: 'Undo', action: 'undo', classname: 'undo disabled_menu' },
            // { title: 'Redo', action: 'redo', classname: 'redo disabled_menu' },
        ],
    },
    {
        title: 'Take a Test',
        href: 'TakeTest.html',
        classname: 'menucb menubutton',
    },
    {
        title: 'Test Generation Tools',
        classname: 'menucb',
        menu: [
            { title: 'Test Manager', href: 'TestManage.html' },
            { title: 'Question Manager', href: 'TestQuestions.html' },
            { title: '', classname: 'divider' },
            {
                title: 'Affine',
                href: 'AffineEncrypt.html',
                cipherType: ICipherType.Affine,
                classname: 'chkmod menub menuc',
            },
            {
                title: 'Aristocrat',
                href: 'AristocratEncrypt.html',
                cipherType: ICipherType.Aristocrat,
                classname: 'chkmod menua menub menuc',
            },
            {
                title: 'Atbash',
                href: 'Atbash.html',
                cipherType: ICipherType.Atbash,
                classname: 'chkmod menua menub',
            },
            {
                title: 'Baconian',
                href: 'Baconian.html',
                cipherType: ICipherType.Baconian,
                classname: 'chkmod menub menuc',
            },
            {
                title: 'Caesar',
                href: 'Caesar.html',
                cipherType: ICipherType.Caesar,
                classname: 'chkmod menua menub menuc',
            },
            {
                title: 'Hill (2x2 and 3x3)',
                href: 'HillEncrypt.html',
                cipherType: ICipherType.Hill,
                classname: 'chkmod menuc',
            },
            {
                title: 'Morbit',
                href: 'MorbitEncrypt.html',
                cipherType: ICipherType.Morbit,
                classname: 'chkmod menub menuc',
            },
            {
                title: 'Patristocrat',
                href: 'PatristocratEncrypt.html',
                cipherType: ICipherType.Patristocrat,
                classname: 'chkmod menub menuc',
            },
            {
                title: 'PigPen/Masonic',
                href: 'PigPenEncrypt.html',
                cipherType: ICipherType.PigPen,
                classname: 'chkmod menua',
            },
            {
                title: 'Pollux',
                href: 'PolluxEncrypt.html',
                cipherType: ICipherType.Pollux,
                classname: 'chkmod menub menuc',
            },
            {
                title: 'Rail Fence',
                href: 'RailFenceEncrypt.html',
                cipherType: ICipherType.Railfence,
                classname: 'chkmod menub',
            },
            // {
            //     title: 'RSA',
            //     href: 'RSAEncrypt.html',
            //     cipherType: ICipherType.RSA,
            //     classname: 'chkmod menuc',
            // },
            // {
            //     title: "Running Key",
            //     href: "RunningKeyEncoder.html",
            //     cipherType: ICipherType.RunningKey,
            //     classname: 'chkmod menua menub menuc'
            // },
            {
                title: 'Tap Code',
                href: 'TapCodeEncrypt.html',
                cipherType: ICipherType.TapCode,
                classname: 'chkmod menua',
            },
            {
                title: 'Porta',
                href: 'VigenereEncrypt.html',
                cipherType: ICipherType.Porta,
                classname: 'chkmod menub menuc',
            },
            {
                title: 'Vigen&egrave;re',
                href: 'VigenereEncrypt.html',
                cipherType: ICipherType.Vigenere,
                classname: 'chkmod menua menub menuc',
            },
            {
                title: 'Xenocrypt',
                href: 'XenocryptEncrypt.html',
                cipherType: ICipherType.Aristocrat,
                lang: 'es',
                classname: 'chkmod menub menuc',
            },
            { title: '', classname: 'divider' },
            {
                title: 'Report a problem',
                href: 'https://github.com/toebes/ciphers/issues',
            },
        ],
    },
    {
        title: 'ACA Solving Assistants',
        classname: 'menuaca',
        menu: [
            { title: '', classname: 'divider' },
            {
                title: 'Aristocrat/Patristocrat Solving Assistant',
                href: 'Solver.html',
                solveType: [ICipherType.Aristocrat, ICipherType.Patristocrat],
            },
            {
                title: 'Morbit Solving Assistant',
                href: 'MorbitSolver.html',
                solveType: [ICipherType.Morbit],
            },
            {
                title: 'Columnar Solving Assistant',
                href: 'ColumnarSolver.html',
                solveType: [ICipherType.CompleteColumnar, ICipherType.IncompleteColumnar],
            },
            {
                title: 'Fractionated Morse Solving Assistant',
                href: 'FractionatedMorseSolver.html',
                solveType: [ICipherType.FractionatedMorse],
            },
            {
                title: 'Key Phrase Solving Assistant',
                href: 'KeyPhraseSolver.html',
                solveType: [ICipherType.KeyPhrase],
            },
            {
                title: 'Homophonic Solving Assistant',
                href: 'HomophonicSolver.html',
                solveType: [ICipherType.Homophonic],
            },
            {
                title: 'Numbered Key Solving Assistant',
                href: 'NumberedKeySolver.html',
                solveType: [ICipherType.NumberedKey],
            },
            {
                title: 'Xenocrypt Solving Assistant',
                href: 'XenocryptSolver.html',
                solveType: [ICipherType.Xenocrypt],
            },
            {
                title: 'Vigen&egrave;re Family Solving Assistant',
                href: 'VigenereSolver.html',
                solveType: [
                    ICipherType.Vigenere,
                    ICipherType.Variant,
                    ICipherType.Beaufort,
                    ICipherType.Gronsfeld,
                    ICipherType.Porta,
                ],
            },
            {
                title: 'Gromark Solving Assistant',
                href: 'GromarkSolver.html',
                solveType: [ICipherType.Gromark],
            },
            {
                title: 'Cryptarithm Solving Assistant',
                href: 'CryptarithmSolver.html',
                solveType: [ICipherType.Cryptarithm],
            },
            {
                title: 'Checkerboard Solving Assistant',
                href: 'CheckerboardSolver.html',
                solveType: [ICipherType.Checkerboard],
            },
            {
                title: 'Portax Solving Assistant',
                href: 'PortaxSolver.html',
                solveType: [ICipherType.Portax],
            },
            {
                title: 'Ragbaby Solving Assistant',
                href: 'RagbabySolver.html',
                solveType: [ICipherType.Ragbaby],
            },
            {
                title: 'Railfence/Redefence Solving Assistant',
                href: 'RailfenceSolver.html',
                solveType: [ICipherType.Railfence, ICipherType.Redefence],
            },
        ],
    },
    {
        title: 'Help',
        classname: 'menuhelp',
        menu: [
            { title: 'About', action: 'about', classname: 'about' },
            {
                title: 'Test Question Guidance',
                action: 'guidance',
                classname: 'guidance menucb',
            },
            { title: 'Signout', classname: 'menucb', action: 'signout' },
            /*{ title: '[TESTING] Register', action: 'register', classname: 'register menucb' },*/
            {
                title: '[ADMIN] Configuration',
                action: 'realtimeconfig',
                classname: 'realtimeconfig menucb',
            },
        ],
    },
];
// { title: "Language Template Processor", href: "GenLanguage.html", },
