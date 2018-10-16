import { BoolMap, cloneObject, NumberMap, StringMap } from "../common/ciphercommon";
import { IState, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTFLabeledInput } from "../common/jtflabeledinput";
import { CipherSolver } from "./ciphersolver";

enum CryptarithmType {
    Automatic,
    SquareRoot,
    CubeRoot,
    Multiplication,
    Division,
    Addition,
    Subtraction,
    Equations,
}

interface ICryptarithmState extends IState {
    /** The state of all the boxes */
    /** A negative value indicates that it is temporarily locked due to another row/col */
    boxState: NumberMap;
}
export class CryptarithmSolver extends CipherSolver {
    public activeToolMode: toolMode = toolMode.aca;
    public defaultstate: ICryptarithmState = {
        cipherType: ICipherType.Cryptarithm,
        cipherString: "",
        boxState: {},
        replacement: {},
        locked: {},
    };
    public state: ICryptarithmState = cloneObject(
        this.defaultstate
    ) as ICryptarithmState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset" },
    ];

    public usedletters: BoolMap = {};
    public base: number;
    public cryptarithmType: CryptarithmType = CryptarithmType.Automatic;
    /**
     * Add any solution text to the problem
     */
    public saveSolution(): void {
        if (this.state.question === undefined || this.state.question === "") {
            return;
        }
        // The code that updates the page marks the SOLVED flag, but
        // We have to compute the solution text
        let x = this.basedStr(this.base - 1);
        let dir = 1;
        let off = 1;
        if (this.state.question.includes("0-" + x)) {
            dir = 1;
            off = 0;
            // val = (this.base + ( 1)*(index + 0)) % this.base;
        } else if (this.state.question.includes("1-0")) {
            dir = 1;
            off = 1;
            // val = (this.base + ( 1)*(index + 1)) % this.base;
        } else if (this.state.question.includes(x + "-0")) {
            dir = -1;
            off = 1;
            // val = (this.base + (-1)*(index + 1)) % this.base
        } else if (this.state.question.includes("0-1")) {
            dir = -1;
            off = 0;
            // val = (this.base + (-1)*(index + 0)) % this.base
        } else {
            return;
        }
        this.state.solution = "";
        for (let index = 0; index < this.base; index++) {
            let val = String((this.base * 2 + dir * (index + off)) % this.base);
            let c = Object.keys(this.state.replacement).find(
                key => this.state.replacement[key] === val
            );
            this.state.solution += c;
        }
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    public load(): void {
        let encoded: string = this.cleanString(this.state.cipherString);
        if (encoded !== this.lastencoded) {
            this.lastencoded = encoded;
            $("#answer")
                .empty()
                .append(this.build());
            let pos = 0;
            let charset = this.getCharset();
            for (let c in this.usedletters) {
                if (this.state.replacement[c] === undefined) {
                    let repl = charset.substr(pos, 1);
                    pos++;
                    this.setChar(c, repl);
                }
            }
            this.UpdateFreqEditTable();
            // We need to attach handlers for any newly created input fields
            this.attachHandlers();
        }
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.updateSolverBox();
        this.updateMatchDropdowns("");
    }
    /**
     * Loads new data into a solver, resetting any solving matches made
     */
    public reset(): void {
        this.load();
    }
    /**
     * Generates the section above the command buttons
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(
            JTFLabeledInput(
                "Cryptarithm",
                "textarea",
                "encoded",
                this.state.cipherString,
                "small-12 medium-12 large-12"
            )
        );
        return result;
    }
    /**
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(
            $("<div/>", {
                class: "grid-x grid-margin-x",
            })
                .append(
                    $("<div/>", {
                        class: "ans cell small-12 medium-7 shrink",
                        id: "answer",
                    })
                )
                .append(
                    $("<div/>", {
                        class: "freq cell small-12 medium-5",
                        id: "freq",
                    })
                )
        );
        return result;
    }
    /**
     * Analyze the encoded text
     */
    public genAnalysis(encoded: string): JQuery<HTMLElement> {
        return null;
    }
    /**
     * Substitutes all the current mappings in a string to evaluate
     */
    public subFormula(str: string): string {
        let result = "";
        for (let c of str) {
            if (
                typeof this.state.replacement[c] === "undefined" ||
                this.state.replacement[c] === "" ||
                this.state.replacement[c] === " "
            ) {
                result += c;
            } else {
                result += this.state.replacement[c];
            }
        }
        // Now we need to convert everything to base 10 so we can
        // properly evaluate it
        //if (this.base != 10)
        {
            let gathered = "";
            let intermediate = result;
            result = "";
            for (let c of intermediate) {
                if (!isNaN(parseInt(c, this.base))) {
                    // Throw away leading zeros so that it will parse
                    if (gathered === "0") {
                        gathered = c;
                    } else {
                        gathered += c;
                    }
                } else if (gathered !== "") {
                    result += parseInt(gathered, this.base) + c;
                    gathered = "";
                } else {
                    result += c;
                }
            }
            if (gathered !== "") {
                result += parseInt(gathered, this.base);
            }
        }
        return result;
    }
    /**
     * Formats a number in the current base and returns a normalized version of it
     */
    public basedStr(val: number): string {
        return val.toString(this.base).toUpperCase();
    }
    /**
     * Safe version of eval to compute a generated formula
     */
    public compute(str: string): string {
        try {
            let val = Function('"use strict";return (' + str + ")")();
            return this.basedStr(val);
        } catch (e) {
            return str;
        }
    }
    /**
     * Check a formula to make sure it is correct
     */
    public checkFormula(
        formula: string,
        expected: string
    ): JQuery<HTMLElement> {
        let eformula = this.subFormula(formula);
        let eexpected = this.subFormula(expected);
        let cformula = this.compute(eformula);
        let cexpected = this.compute(eexpected);

        if (cformula === cexpected) {
            return $("<div/>", {
                class: "callout success small",
            }).text("Matches");
        }
        // Something didn't match so mark it in the saved data
        this.state.solved = false;
        // They don't match so let's go through the digits and figure out which ones do and don't match.
        // Note that one might be longer than the other but we have to compare from the right hand side
        let width = Math.max(cformula.length, cexpected.length);
        let result = $("<span/>", { class: "mismatch" });
        for (let pos = width - 1; pos >= 0; pos--) {
            let cf = "?";
            let ce = "?";
            if (pos < cformula.length) {
                cf = cformula.substr(cformula.length - pos - 1, 1);
            }
            if (pos < cexpected.length) {
                ce = cexpected.substr(cexpected.length - pos - 1, 1);
            }
            if (ce === cf) {
                $("<span/>", { class: "g" })
                    .text(cf)
                    .appendTo(result);
            } else {
                $("<span/>", { class: "b" })
                    .text(cf)
                    .appendTo(result);
            }
        }
        $("<span/>", { class: "formula" })
            .text("[" + formula + "]")
            .appendTo(result);
        return result;
    }
    /**
     * We don't have to do anything for reverse replacements
     */
    public UpdateReverseReplacements(): void {}
    /**
     * Update the match dropdowns in response to a change in the cipher mapping
     */
    public updateMatchDropdowns(reqstr: string): void {
        this.state.solved = true;
        $("[data-formula]").each((i, elem) => {
            $(elem)
                .empty()
                .append(
                    this.checkFormula(
                        $(elem).attr("data-formula"),
                        $(elem).attr("data-expect")
                    )
                );
        });
    }
    /**
     * Fills in the frequency portion of the frequency table
     */
    public displayFreq(): void {}
    /**
     * Change the encrypted character.  Note that when we change one, we have
     * to swap it with the one which we are replacing
     * @param repchar Character that is being replaced
     * @param newchar Character to replace it with
     * @param elem Optional HTML Element triggering the request
     */
    public setChar(
        repchar: string,
        newchar: string,
        elem?: JQuery<HTMLElement>
    ): void {
        console.log("setChar data-char=" + repchar + " newchar=" + newchar);
        // See if we actually have to do anything at all
        if (this.state.replacement[repchar] !== newchar) {
            // Ok we need to figure out what slot we are swapping with
            let oldchar = this.state.replacement[repchar];
            if (oldchar !== "" && oldchar !== " ") {
                let oldrep = "";
                for (let i in this.state.replacement) {
                    if (this.state.replacement[i] === newchar) {
                        oldrep = i;
                        break;
                    }
                }
                if (this.state.locked[oldrep]) {
                    return;
                }
                this.state.replacement[oldrep] = oldchar;
                $("input[data-char='" + oldrep + "']").val(oldchar);
                if (oldchar === "") {
                    oldchar = "?";
                }
                $("span[data-char='" + oldrep + "']").text(oldchar);
                $("span[data-val='" + oldchar + "']").text(oldrep);
            }
            this.state.replacement[repchar] = newchar;
            this.updateMatchDropdowns(repchar);
        }
        $("input[data-char='" + repchar + "']").val(newchar);
        if (newchar === "") {
            newchar = "?";
        }
        $("span[data-char='" + repchar + "']").text(newchar);
        $("span[data-val='" + newchar + "']").text(repchar);
    }
    /**
     * Builds the GUI for the solver
     */
    // tslint:disable-next-line:cyclomatic-complexity
    public build(): JQuery<HTMLElement> {
        let str: string = this.cleanString(this.state.cipherString);
        enum buildState {
            Initial = "Initial",
            WantRoot = "Want Root value",
            WantEqual = "Want = value",
            WantMinus = "Want - value",
            WantMult = "Want * value",
            WantDiv = "Want / value",
            WantPlus = "Want + value",
            WantQuotient = "Want Quotient",
            WantMultAdds = "Want * Additions",
            Idle = "Idle",
        }
        interface lineitem {
            prefix: string;
            indent: number;
            content: string;
            class: string;
            formula: string;
            expected: string;
        }
        this.cryptarithmType = CryptarithmType.Automatic;
        this.usedletters = {};
        this.base = 0;
        let lineitems: Array<lineitem> = [];
        str = str.replace(new RegExp("gives root", "g"), "^");
        // Sometimes they use a different division sign
        str = str.replace(new RegExp("\xf7", "g"), "/"); //÷
        // Apparently there are two forms of dashes...
        str = str.replace(new RegExp("\u2013", "g"), "-"); //–
        // Oh yeah we have two forms of quotes too
        str = str.replace(new RegExp("\u2019", "g"), "'"); //’
        // Lastly get rid of all white space
        str = str.replace(new RegExp("[\r\n ]+", "g"), "");
        // Now tokenize the string so we can parse it
        let tokens = str.split(/([;=+ \^\/\*\.\-])/g);
        let state: buildState = buildState.Initial;
        let indent: number = 0;
        let numwidth: number = 1;
        let maxwidth: number = 0;
        let prefix: string = "";
        let dividend: string = "";
        let divisor: string = "";
        let quotient: string = "";
        let formula: string = "";
        let expected: string = "";
        let lastval: string = "";
        let lastbase: string = "";
        let root: string = "";
        let rootbase: string = "";
        let multiplicand: string = "";
        let multiplier: string = "";
        let multval: string = "";

        for (let token of tokens) {
            switch (token) {
                case "":
                case " ":
                    break;

                // Square root (this was originally "gives root" in the crytprithm)
                case "^":
                    if (state !== buildState.Idle) {
                        console.log(
                            "Found token:" +
                                token +
                                " when already processing " +
                                prefix
                        );
                    }
                    if (this.cryptarithmType === CryptarithmType.Automatic) {
                        this.cryptarithmType = CryptarithmType.SquareRoot;
                    }
                    prefix = token;
                    state = buildState.WantRoot;
                    break;

                // End of an equation (and potentially the start of another)
                case ".":
                    if (state !== buildState.Idle) {
                        console.log(
                            "Found token:" +
                                token +
                                " when already processing " +
                                prefix
                        );
                    }
                    // Put in a blank line
                    lineitems.push({
                        prefix: "",
                        indent: 0,
                        content: "",
                        class: "",
                        formula: "",
                        expected: "",
                    });
                    prefix = "";
                    state = buildState.Initial;
                    break;

                // End of an operation group (generally after an = value)
                case ";":
                    if (state !== buildState.Idle) {
                        console.log(
                            "Found token:" +
                                token +
                                " when already processing " +
                                prefix
                        );
                    }
                    prefix = "";
                    state = buildState.Idle;
                    break;

                case "-":
                    if (state !== buildState.Idle) {
                        console.log(
                            "Found token:" +
                                token +
                                " when already processing " +
                                prefix
                        );
                    }
                    switch (this.cryptarithmType) {
                        case CryptarithmType.Automatic:
                            this.cryptarithmType = CryptarithmType.Subtraction;
                        case CryptarithmType.Subtraction:
                        case CryptarithmType.Addition:
                            lastbase = lastval + "-";
                            break;

                        case CryptarithmType.Division:
                            let mult = quotient.substr(
                                quotient.length - (indent + 1),
                                1
                            );
                            formula = mult + "*" + divisor;
                            lastbase = lastval;
                            break;

                        case CryptarithmType.SquareRoot:
                            let squarepart = root.substr(
                                0,
                                root.length - indent
                            );
                            let double = squarepart.substr(
                                0,
                                squarepart.length - 1
                            );
                            let squared = squarepart.substr(
                                squarepart.length - 1,
                                1
                            );
                            if (double !== "") {
                                formula =
                                    "((" +
                                    double +
                                    "*20)+" +
                                    squared +
                                    ")*" +
                                    squared;
                            } else {
                                formula = squared + "*" + squared;
                            }
                            lastbase = lastval;
                            break;

                        case CryptarithmType.CubeRoot:
                            let cubepart = root.substr(0, root.length - indent);
                            let found = cubepart.substr(0, cubepart.length - 1);
                            let newpart = cubepart.substr(
                                cubepart.length - 1,
                                1
                            );
                            if (found !== "") {
                                formula =
                                    "((300*" +
                                    found +
                                    "*" +
                                    found +
                                    ")+" +
                                    "(30*" +
                                    found +
                                    "*" +
                                    newpart +
                                    ")+" +
                                    "(" +
                                    newpart +
                                    "*" +
                                    newpart +
                                    "))*" +
                                    newpart;
                            } else {
                                formula =
                                    newpart + "*" + newpart + "*" + newpart;
                            }
                            lastbase = lastval;
                            break;

                        default:
                            break;
                    }
                    prefix = token;
                    state = buildState.WantMinus;
                    break;

                case "*":
                    if (state !== buildState.Idle) {
                        console.log(
                            "Found token:" +
                                token +
                                " when already processing " +
                                prefix
                        );
                    }
                    prefix = token;
                    state = buildState.WantMult;
                    multiplicand = lastval;
                    if (this.cryptarithmType === CryptarithmType.Automatic) {
                        this.cryptarithmType = CryptarithmType.Multiplication;
                    }
                    break;

                case "+":
                    if (state !== buildState.Idle) {
                        console.log(
                            "Found token:" +
                                token +
                                " when already processing " +
                                prefix
                        );
                    }
                    prefix = token;
                    state = buildState.WantPlus;
                    if (this.cryptarithmType === CryptarithmType.Automatic) {
                        this.cryptarithmType = CryptarithmType.Addition;
                    }
                    if (
                        this.cryptarithmType === CryptarithmType.Addition ||
                        this.cryptarithmType === CryptarithmType.Subtraction
                    ) {
                        lastbase = lastval + "+";
                    } else if (
                        this.cryptarithmType === CryptarithmType.Multiplication
                    ) {
                        if (lastbase === "") {
                            multval = "10";
                            lastbase = lastval;
                        } else {
                            lastbase =
                                lastbase + "+(" + multval + "*" + lastval + ")";
                            multval = multval + "0";
                        }
                        indent++;
                        formula =
                            multiplicand +
                            "*" +
                            multiplier.substr(
                                multiplier.length - indent - 1,
                                1
                            );
                    }
                    break;

                case "/":
                    if (state !== buildState.Idle) {
                        console.log(
                            "Found token:" +
                                token +
                                " when already processing " +
                                prefix
                        );
                    }
                    this.cryptarithmType = CryptarithmType.Division;
                    prefix = token;
                    state = buildState.WantDiv;
                    break;

                // Result of an operation (add/subtract/mult/divide)
                case "=":
                    if (
                        state !== buildState.Idle &&
                        state !== buildState.WantQuotient
                    ) {
                        console.log(
                            "Found token:" +
                                token +
                                " when already processing " +
                                prefix
                        );
                    }
                    prefix = token;
                    if (state !== buildState.WantQuotient) {
                        state = buildState.WantEqual;
                    }
                    switch (this.cryptarithmType) {
                        case CryptarithmType.Division:
                            if (state !== buildState.WantQuotient) {
                                formula = lastbase + "-" + lastval;
                                if (indent > 0) {
                                    expected = dividend.substr(
                                        dividend.length - indent,
                                        1
                                    );
                                    formula =
                                        "10*(" + formula + ")+" + expected;
                                    indent--;
                                }
                            }
                            break;
                        case CryptarithmType.SquareRoot:
                            formula = lastbase + "-" + lastval;
                            if (indent > 0) {
                                // We need to make sure that the last two digits
                                expected = rootbase.substr(
                                    rootbase.length - indent * numwidth,
                                    numwidth
                                );
                                formula = "(" + formula + ")*100+" + expected;
                                indent--;
                            }
                            break;
                        case CryptarithmType.CubeRoot:
                            formula = lastbase + "-" + lastval;
                            if (indent > 0) {
                                // We need to make sure that the last two digits
                                expected = rootbase.substr(
                                    rootbase.length - indent * numwidth,
                                    numwidth
                                );
                                formula = "(" + formula + ")*1000+" + expected;
                                indent--;
                            }
                            break;
                        case CryptarithmType.Multiplication:
                            if (indent === 0) {
                                formula =
                                    multiplicand +
                                    "*" +
                                    multiplier.substr(multiplier.length - 1, 1);
                                lastbase = "";
                            } else {
                                formula =
                                    lastbase +
                                    "+(" +
                                    multval +
                                    "*" +
                                    lastval +
                                    ")";
                            }
                            indent = 0;
                            break;
                        case CryptarithmType.Addition:
                        case CryptarithmType.Subtraction:
                            formula = lastbase + lastval;
                            break;

                        default:
                            break;
                    }
                    break;

                default:
                    if (state === buildState.Idle) {
                        console.log(
                            "Missing prefix string to process token:" + token
                        );
                    }
                    let item: lineitem = {
                        prefix: prefix,
                        indent: indent,
                        content: "",
                        class: "",
                        formula: formula,
                        expected: token,
                    };
                    lastval = token;
                    formula = "";
                    let isRoot: boolean = false;
                    let rootLen: number = 0;
                    let content = "";
                    // We need to parse out the number and collect all the digits
                    // if it has ' in it then we are going to be doing either a square or a cube root
                    // based on how many letters are grouped
                    for (let c of token) {
                        if (c === "'") {
                            if (prefix !== "") {
                                console.log(
                                    "Found quotes on other than the first token"
                                );
                            }
                            isRoot = true;
                            indent++;
                            if (
                                this.cryptarithmType ===
                                CryptarithmType.Automatic
                            ) {
                                if (rootLen === 2) {
                                    this.cryptarithmType =
                                        CryptarithmType.SquareRoot;
                                } else if (rootLen === 3) {
                                    this.cryptarithmType =
                                        CryptarithmType.CubeRoot;
                                } else {
                                    console.log(
                                        "Bad quote location at " + rootLen
                                    );
                                }
                            }
                            if (
                                this.cryptarithmType ===
                                CryptarithmType.SquareRoot
                            ) {
                                item.prefix = "2";
                                numwidth = 2;
                                item.class = "ovl";
                            } else if (
                                this.cryptarithmType ===
                                CryptarithmType.CubeRoot
                            ) {
                                item.prefix = "3";
                                numwidth = 3;
                                item.class = "ovl";
                            }
                            rootLen = 0;
                        } else {
                            if (c.toLocaleLowerCase !== c.toUpperCase) {
                                this.usedletters[c] = true;
                            }
                            content += c;
                            rootLen++;
                        }
                    }

                    // See if we ended up with a Cuberoot
                    if (isRoot && rootLen === 3) {
                        this.cryptarithmType = CryptarithmType.CubeRoot;
                        item.prefix = "3";
                        numwidth = 3;
                    }
                    // See if we need to format the number into place
                    let padding = "";
                    for (let pad = 0; pad < numwidth * item.indent; pad++) {
                        padding += " ";
                    }
                    item.indent = indent * numwidth;
                    switch (this.cryptarithmType) {
                        case CryptarithmType.SquareRoot:
                            if (item.prefix === "^") {
                                // We need to split the characters into each character
                                // and put two spaces between
                                item.prefix = "";
                                item.content = content.split("").join("  ");
                                root = content;
                                let tempitem = lineitems.pop();
                                lineitems.push(item);
                                item = tempitem;
                                rootbase = item.content.replace(
                                    new RegExp(" ", "g"),
                                    ""
                                );
                                let digits = rootbase.length % numwidth;
                                if (digits === 0) {
                                    digits = numwidth;
                                }
                                lastval = rootbase.substr(0, digits);
                            } else {
                                if (indent > 0 && expected !== "") {
                                    if (
                                        content.substr(
                                            content.length - numwidth,
                                            numwidth
                                        ) !== expected
                                    ) {
                                        // Special case where we had a zero and have to skip one more
                                        padding = padding.substr(
                                            0,
                                            padding.length - numwidth
                                        );
                                        item.formula =
                                            "(" +
                                            item.formula +
                                            ")*100+" +
                                            rootbase.substr(
                                                rootbase.length - indent * 2,
                                                2
                                            );
                                        indent--;
                                    }
                                }
                                // We want to start at the end and put an extra
                                // space between every second character
                                let temp = " " + content + padding;
                                item.content = "";
                                for (
                                    let i = temp.length - numwidth;
                                    i >= 0;
                                    i -= numwidth
                                ) {
                                    let toadd = temp.substr(i, numwidth);
                                    if (item.content !== "") {
                                        item.content =
                                            toadd + " " + item.content;
                                    } else {
                                        item.content = toadd;
                                    }
                                }
                            }
                            state = buildState.Idle;
                            break;

                        case CryptarithmType.CubeRoot:
                            if (item.prefix === "^") {
                                // Put three spaces between every character
                                item.prefix = "";
                                item.content = content.split("").join("   ");
                                root = content;
                                let tempitem = lineitems.pop();
                                lineitems.push(item);
                                item = tempitem;
                                rootbase = item.content.replace(
                                    new RegExp(" ", "g"),
                                    ""
                                );
                                let digits = rootbase.length % numwidth;
                                if (digits === 0) {
                                    digits = numwidth;
                                }
                                lastval = rootbase.substr(0, digits);
                            } else {
                                if (indent > 0 && expected !== "") {
                                    if (
                                        content.substr(
                                            content.length - numwidth,
                                            numwidth
                                        ) !== expected
                                    ) {
                                        // Special case where we had a zero and have to skip one more
                                        padding = padding.substr(
                                            0,
                                            padding.length - numwidth
                                        );
                                        item.formula =
                                            "(" +
                                            item.formula +
                                            ")*1000+" +
                                            rootbase.substr(
                                                rootbase.length - indent * 2,
                                                2
                                            );
                                        indent--;
                                    }
                                }
                                // We want to start at the end and put an extra
                                // space between every third character
                                let temp = "  " + content + padding;
                                item.content = "";
                                for (
                                    let i = temp.length - numwidth;
                                    i >= 0;
                                    i -= numwidth
                                ) {
                                    let toadd = temp.substr(i, numwidth);
                                    if (item.content !== "") {
                                        item.content =
                                            toadd + " " + item.content;
                                    } else {
                                        item.content = toadd;
                                    }
                                }
                            }
                            state = buildState.Idle;
                            break;

                        case CryptarithmType.Division:
                            // When dealing with the divisor, we put it to the left of the dividend
                            if (item.prefix === "/") {
                                item = lineitems.pop();
                                dividend = item.content;
                                divisor = content;
                                item.content = content + ")" + item.content;
                                state = buildState.WantQuotient;
                            } else {
                                if (indent > 0 && expected !== "") {
                                    if (
                                        content.substr(
                                            content.length - numwidth,
                                            numwidth
                                        ) !== expected
                                    ) {
                                        // Special case where we had a zero and have to skip one more
                                        padding = padding.substr(
                                            0,
                                            padding.length - numwidth
                                        );
                                        item.formula =
                                            "(" +
                                            item.formula +
                                            ")*10+" +
                                            dividend.substr(
                                                dividend.length - indent,
                                                1
                                            );
                                        indent--;
                                    }
                                }
                                item.content = content + padding;
                                if (state === buildState.WantQuotient) {
                                    quotient = content;
                                    let tempitem = lineitems.pop();
                                    item.prefix = "";
                                    lineitems.push(item);
                                    item = tempitem;
                                    indent = content.length - 1;
                                    lastval = dividend.substr(
                                        0,
                                        dividend.length - indent
                                    );
                                }
                                state = buildState.Idle;
                            }
                            break;

                        case CryptarithmType.Multiplication:
                            if (state === buildState.WantMult) {
                                multiplier = content;
                            }
                            item.content = content + padding;
                            state = buildState.WantMultAdds;
                            break;

                        default:
                            // No need to do anything, we are happy with the
                            // content and the padding
                            state = buildState.Idle;
                            item.content = content + padding;
                            break;
                    }
                    if (item.prefix === "=") {
                        item.prefix = "";
                        item.class = "ovl";
                    }

                    lineitems.push(item);
                    if (item.content.length > maxwidth) {
                        maxwidth = item.content.length;
                    }
                    prefix = "";
                    expected = "";
                    break;
            }
        }
        this.base = Object.keys(this.usedletters).length;
        let charset = "";
        for (let index = 0; index < this.base; index++) {
            let c = this.basedStr(index);
            charset += c;
        }
        this.setCharset(charset);

        // We have built the lineitems array, now we just need to turn it into
        // a table (respecting the maxwidth)
        let table = $("<table/>", { class: "cmath" });
        let tbody = $("<tbody/>");
        for (let item of lineitems) {
            let tr = $("<tr/>");
            // Pad on the left with as many columns as we need
            if (item.content.length < maxwidth) {
                $("<td/>", {
                    colspan: maxwidth - item.content.length,
                })
                    .html("&nbsp;")
                    .appendTo(tr);
            }
            let td: JQuery<HTMLElement> = null;
            let addclass = item.class;
            switch (item.prefix) {
                case "2": {
                    td = $("<td/>")
                        .html("&radic;")
                        .addClass("math"); // √ - SQUARE ROOT
                    addclass = "";
                    break;
                }
                case "3": {
                    td = $("<td/>")
                        .html("&#8731;")
                        .addClass("math"); // ∛ - CUBE ROOT
                    addclass = "";
                    break;
                }
                case "4": {
                    td = $("<td/>")
                        .html("&#8732;")
                        .addClass("math"); // ∜ - FOURTH ROOT
                    addclass = "";
                    break;
                }
                default: {
                    td = $("<td/>").text(item.prefix); //.addClass("math")
                    break;
                }
            }
            if (addclass) {
                td.addClass(addclass);
            }
            td.appendTo(tr);
            addclass = item.class;
            if (item.content !== "") {
                for (let c of item.content) {
                    td = $("<td/>");
                    $("<div/>", { class: "slil" })
                        .text(c)
                        .appendTo(td);
                    if (c === ")") {
                        td.addClass("math");
                        addclass = "ovl";
                    } else if (this.usedletters[c]) {
                        $("<input/>", {
                            type: "text",
                            class: "sli",
                            "data-char": c,
                        }).appendTo(td);
                    }
                    if (addclass) {
                        td.addClass(addclass);
                    }
                    td.appendTo(tr);
                }
            }
            let content = $("");
            if (item.formula !== "") {
                content = $("<span/>", {
                    class: "formula",
                    "data-formula": item.formula,
                    "data-expect": item.expected,
                });
            }

            $("<td/>", { class: "solv" })
                .append(content)
                .appendTo(tr);
            tr.appendTo(tbody);
        }

        tbody.appendTo(table);

        return table;
    }
    /**
     *
     * @param start Starting character
     * @param end Ending character
     */
    public genLetterDiv(start: string, end: string): JQuery<HTMLElement> {
        let prefix = start + "-" + end;
        let calloutclass = "secondary";
        if (this.state.question.includes(prefix)) {
            calloutclass = "success";
        }
        let result = $("<div/>", {
            class: "sol callout small " + calloutclass,
        }).append($("<span/>", { class: "h" }).text(prefix + ":"));
        return result;
    }
    /**
     * Generates the letter sequences for output ordering any which happen to match
     * the question string at the start
     */
    public genLetterSequences(): JQuery<HTMLElement> {
        // First we generate the strings along with the text
        let result = $("<div/>", { class: "sols" });
        let x = this.basedStr(this.base - 1);

        let a0x = this.genLetterDiv("0", x);
        let a10 = this.genLetterDiv("1", "0");
        let ax0 = this.genLetterDiv(x, "0");
        let a01 = this.genLetterDiv("0", "1");

        for (let index = 0; index < this.base; index++) {
            a0x.append(
                $("<span/>", {
                    "data-val": this.basedStr(index),
                }).text("?")
            );
            let val = (index + 1) % this.base;
            a10.append(
                $("<span/>", {
                    "data-val": this.basedStr(val),
                }).text("?")
            );
            val = (this.base - index - 1) % this.base;
            ax0.append(
                $("<span/>", {
                    "data-val": this.basedStr(val),
                }).text("?")
            );
            val = (val + 1) % this.base;
            a01.append(
                $("<span/>", {
                    "data-val": this.basedStr(val),
                }).text("?")
            );
        }
        result
            .append(a0x)
            .append(a10)
            .append(ax0)
            .append(a01);

        return result;
    }
    /**
     * Creates an HTML table to display the mapping table
     */
    public createFreqEditTable(): JQuery<HTMLElement> {
        if (this.base === undefined || this.base < 1) {
            return null;
        }
        let result = $("<div/>");
        result.append(this.genLetterSequences());
        // First generate the solution strings, BUT if there is one that matches the
        let table = $("<table/>", { class: "tfreq" });
        let tbody = $("<tbody/>");
        let thead = $("<thead/>");

        let tr = $("<tr/>");

        $("<td/>", { colspan: 3 })
            .text("Base " + String(this.base))
            .appendTo(tr);
        for (let index = 0; index < this.base; index++) {
            $("<th/>")
                .text(this.basedStr(index))
                .appendTo(tr);
        }
        tr.appendTo(thead);
        thead.appendTo(table);

        // Now we want to build the solving table
        for (let c in this.usedletters) {
            tr = $("<tr/>");
            let th = $("<th/>");
            $("<div/>", { class: "slil" })
                .text(c)
                .appendTo(th);
            th.appendTo(tr);
            let td = $("<td/>");
            this.makeFreqEditField(c).appendTo(td);
            td.appendTo(tr);
            td = $("<td/>");
            let ischecked = this.state.locked[c];
            $("<input />", {
                type: "checkbox",
                class: "cb",
                "data-char": c,
                id: "cb" + c,
                value: name,
                checked: ischecked,
            }).appendTo(td);
            td.appendTo(tr);

            for (let index = 0; index < this.base; index++) {
                let id = c + this.basedStr(index);
                if (this.state.boxState[id] === undefined) {
                    this.state.boxState[id] = 0;
                }
                let state = this.state.boxState[id];
                if (state < 0) {
                    state = 1;
                }
                $("<td/>", {
                    id: id,
                    "data-val": state,
                })
                    .addClass("rtoggle rtoggle-" + state)
                    .appendTo(tr);
            }
            tr.appendTo(tbody);
        }
        tbody.appendTo(table);
        result.append(table);
        return result;
    }
    public getLockMap(): BoolMap {
        let result: BoolMap = {};
        for (let c in this.usedletters) {
            if (this.state.locked[c]) {
                result[c] = true;
                result["." + this.state.replacement[c]] = true;
            } else {
                result[c] = false;
                result["." + this.state.replacement[c]] = false;
            }
        }
        return result;
    }
    public updateSolverBox(): void {
        let isLocked = this.getLockMap();
        for (let c in this.usedletters) {
            let ischecked = this.state.locked[c];
            let repl = this.state.replacement[c];
            $(".cb[data-char=" + c + "]").prop("checked", ischecked);
            $("input:text[data-char='" + c + "']").prop("disabled", ischecked);

            for (let index = 0; index < this.base; index++) {
                let r = this.basedStr(index);
                let id = c + r;
                let state = this.state.boxState[id];
                if (isLocked[c]) {
                    if (r === repl) {
                        state = 3;
                    } else {
                        state = 2;
                    }
                } else if (isLocked["." + r]) {
                    state = 2;
                }
                $("#" + c + r)
                    .removeClass("rtoggle-0 rtoggle-1 rtoggle-2 rtoggle-3")
                    .addClass("rtoggle-" + state);
            }
        }
    }
    /**
     * Marks a symbol as locked and prevents it from being changed in the interactive solver
     */
    public handleLockClick(c: string, lock: boolean): boolean {
        let changed = false;
        if (this.state.locked[c] !== lock) {
            this.markUndo(null);
            this.state.locked[c] = lock;
            changed = true;
        }
        return changed;
    }
    public handleBoxStateClick(id: string): boolean {
        let changed = false;
        let isLocked = this.getLockMap();
        let c = id.substr(0, 1);
        let r = id.substr(1, 1);
        // Make sure it isn't locked either by the row or the column
        if (!isLocked[c] && !isLocked["." + r]) {
            this.markUndo(null);
            changed = true;
            let state = this.state.boxState[id];
            if (isNaN(state)) {
                state = 0;
            }
            state = (state + 1) % 4;
            this.state.boxState[id] = state;
        }
        return changed;
    }
    /**
     * Sets up the HTML DOM so that all actions go to the right handler
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $(".rtoggle")
            .off("click")
            .on("click", e => {
                let id = $(e.target).attr("id");
                if (this.handleBoxStateClick(id)) {
                    this.updateOutput();
                }
            });
        $(".cb")
            .off("change")
            .on("change", e => {
                let toupdate = $(e.target).attr("data-char");
                if (
                    this.handleLockClick(toupdate, $(e.target).prop("checked"))
                ) {
                    this.updateOutput();
                }
            });
    }
}
