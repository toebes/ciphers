import { ICipherType } from "./ciphertypes";
import { menuItem } from "./jtmenu";

/**
 * CipherMenu is the main menu for all the Ciphers and defines the navigation for the overall app.
 */
export const CipherMenu: menuItem[] = [
    {
        title: "File",
        classname: "menufile",
        menu: [
            { title: "New", action: "new" },
            { title: "Open", action: "open" },
            { title: "Save", action: "save", classname: "save" },
            // { title: "Save As...", action: "saveas", classname: "saveas disabled_menu" },
            // { title: "Submit", action: "submit", classname: "submit disabled_menu" },
        ],
    },
    {
        title: "Edit",
        classname: "menufile",
        menu: [
            { title: "Undo", action: "undo", classname: "undo disabled_menu" },
            { title: "Redo", action: "redo", classname: "redo disabled_menu" },
            // { title: "Copy", action: "copy disabled_menu" },
        ],
    },
    {
        title: "Test Generation Tools",
        classname: "menucb",
        menu: [
            { title: "Test Manager", href: "TestManage.html" },
            { title: "Question Manager", href: "TestQuestions.html" },
            { title: "", classname: "divider" },
            {
                title: "Affine",
                href: "AffineEncrypt.html",
                cipherType: ICipherType.Affine,
            },
            {
                title: "Baconian",
                href: "Baconian.html",
                cipherType: ICipherType.Baconian,
            },
            // { title: "Cipher Counter", href: "CipherCounter.html", },
            {
                title: "Caesar",
                href: "Caesar.html",
                cipherType: ICipherType.Caesar,
            },
            {
                title: "Atbash",
                href: "Atbash.html",
                cipherType: ICipherType.Atbash,
            },
            {
                title: "Aristocrat",
                href: "AristocratEncrypt.html",
                cipherType: ICipherType.Aristocrat,
            },
            {
                title: "Spanish Aristocrat",
                href: "AristocratSpanishEncrypt.html",
                cipherType: ICipherType.Aristocrat,
                lang: "es",
            },
            {
                title: "Xenocrypt",
                href: "XenocryptEncrypt.html",
                cipherType: ICipherType.Xenocrypt,
            },
            {
                title: "Patristocrat",
                href: "PatristocratEncrypt.html",
                cipherType: ICipherType.Patristocrat,
            },
            {
                title: "RSA",
                href: "RSAEncrypt.html",
                cipherType: ICipherType.RSA,
            },
            {
                title: "Hill (2x2 and 3x3)",
                href: "HillEncrypt.html",
                cipherType: ICipherType.Hill,
            },
            {
                title: "Vigen&egrave;re",
                href: "VigenereEncrypt.html",
                cipherType: ICipherType.Vigenere,
            },
            {
                title: "Running Key",
                href: "RunningKeyEncoder.html",
                cipherType: ICipherType.RunningKey,
            },
            // { title: "Language Template Processor", href: "GenLanguage.html", },
        ],
    },
    {
        title: "ACA Solving Assistants",
        classname: "menuaca",
        menu: [
            {
                title: "Problem List",
                href: "ACAProblems.html",
            },
            { title: "", classname: "divider" },
            {
                title: "Aristocrat/Patristocrat Solving Assistant",
                href: "Solver.html",
                solveType: [ICipherType.Aristocrat, ICipherType.Patristocrat],
            },
            {
                title: "Morbit Solving Assistant",
                href: "MorbitSolver.html",
                solveType: [ICipherType.Morbit],
            },
            {
                title: "Fractionated Morse Solving Assistant",
                href: "FractionatedMorseSolver.html",
                solveType: [ICipherType.FractionatedMorse],
            },
            {
                title: "Xenocrypt Solving Assistant",
                href: "XenocryptSolver.html",
                solveType: [ICipherType.Xenocrypt],
            },
            {
                title: "Vigen&egrave;re Family Solving Assistant",
                href: "VigenereSolver.html",
                solveType: [
                    ICipherType.Vigenere,
                    ICipherType.Variant,
                    ICipherType.Beaufort,
                    ICipherType.Gronsfeld,
                    ICipherType.Porta,
                ],
            },
            {
                title: "Gromark Solving Assistant",
                href: "GromarkSolver.html",
                solveType: [ICipherType.Gromark],
            },
            {
                title: "Cryptarithm Solving Assistant",
                href: "CryptarithmSolver.html",
                solveType: [ICipherType.Cryptarithm],
            },
            {
                title: "Checkerboard Solving Assistant",
                href: "CheckerboardSolver.html",
                solveType: [ICipherType.Checkerboard],
            },
            {
                title: "Ragbaby Solving Assistant",
                href: "RagbabySolver.html",
                solveType: [ICipherType.Ragbaby],
            },
            {
                title: "Railfence/Redefence Solving Assistant",
                href: "RailfenceSolver.html",
                solveType: [ICipherType.Railfence, ICipherType.Redefence],
            },
        ],
    },
];
