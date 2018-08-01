import { ICipherType } from "./ciphertypes";
import { menuItem } from "./jtmenu"

/**
 * CipherMenu is the main menu for all the Ciphers and defines the navigation for the overall app.
 */
export const CipherMenu: menuItem[] = [
    {
        title: "File",
        menu: [
            { title: "New", action: "new" },
            { title: "Open", action: "open" },
            { title: "Save", action: "save", classname: "save" },
            { title: "Save As...", action: "saveas", classname: "saveas disabled_menu" },
            { title: "Submit", action: "submit", classname: "submit disabled_menu" },
        ]
    },
    {
        title: "Edit",
        menu: [
            { title: "Undo", action: "undo", classname: "undo disabled_menu" },
            { title: "Redo", action: "redo", classname: "redo disabled_menu" },
            { title: "Copy", action: "copy disabled_menu" },
        ]
    },
    {
        title: "Other Assistants",
        menu: [
            { title: "Aristocrat/Patristocrat Solving Assistant", href: "Solver.html" },
            { title: "Morbit Solving Assistant", href: "MorbitSolver.html", },
            { title: "Fractionated Morse Solving Assistant", href: "FractionatedMorseSolver.html", },
            { title: "Checkerboard Solving Assistant", href: "CheckerboardSolver.html", },
            { title: "Xenocrypt Solving Assistant", href: "XenocryptSolver.html", },
            { title: "Vigen&egrave;re Family Solving Assistant", href: "VigenereSolver.html", },
            { title: "Gromark Solving Assistant", href: "GromarkSolver.html", },
            { title: "Cryptarithm Solving Assistant", href: "CryptarithmSolver.html", },
            { title: "Checkerboard Solving Assistant", href: "CheckerboardSolver.html", },
            { title: "Ragbaby Solving Assistant", href: "RagbabySolver.html", },
            { title: "Railfence/Redefence Solving Assistant", href: "RailfenceSolver.html", },
        ]
    },
    {
        title: "Encryption Tools",
        menu: [
            { title: "Affine", href: "AffineEncrypt.html", cipherType: ICipherType.Affine, },
            { title: "Cipher Counter", href: "CipherCounter.html", },
            { title: "Caesar Encoder", href: "Caesar.html", cipherType: ICipherType.Caesar, },
            { title: "Atbash Encoder", href: "Atbash.html", cipherType: ICipherType.Atbash, },
            { title: "Aristocrat Encoder", href: "AristocratEncrypt.html", cipherType: ICipherType.Aristocrat, },
            { title: "Spanish Aristocrat Encoder", href: "AristocratSpanishEncrypt.html", },
            { title: "Xenocrypt Encoder", href: "XenocryptEncrypt.html", cipherType: ICipherType.Xenocrypt, },
            { title: "Patristocrat Encoder", href: "PatristocratEncrypt.html", cipherType: ICipherType.Patristocrat, },
            { title: "Hill Encoder (2x2 and 3x3)", href: "HillEncrypt.html", cipherType: ICipherType.Hill, },
            { title: "Vigen&egrave;re Encoder", href: "VigenereEncrypt.html", cipherType: ICipherType.Vigenere, },
            { title: "Test Manager", href: "TestManage.html", },
            { title: "Question Manager", href: "TestQuestions.html", },
            // { title: "Language Template Processor", href: "GenLanguage.html", },
        ]
    },
]
