import { cloneObject, StringMap } from "../common/ciphercommon";
import { IState, toolMode } from "../common/cipherhandler";
import { ICipherType } from "../common/ciphertypes";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTFIncButton } from "../common/jtfIncButton";
import { JTFLabeledInput } from "../common/jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "../common/jtradiobutton";
import { JTTable } from "../common/jttable";
import { isCoPrime } from "../common/mathsupport";
import { renderMath } from "../common/renderMath";
import { CipherEncoder } from "./cipherencoder";

// Configure how we want the multiplication to appear - either as a * or a dot
const kmathMult = "*";
// const kmathMult = ' \\cdot '

interface IAffineState extends IState {
    /** a value */
    a: number;
    /** b value */
    b: number;
    /** The first clicked number in the solution */
    solclick1: number;
    /** The second clicked number  */
    solclick2: number;
}

export class CipherAffineEncoder extends CipherEncoder {
    public activeToolMode: toolMode = toolMode.codebusters;
    public guidanceURL: string = "TestGuidance.html#Affine";
    public defaultstate: IAffineState = {
        /** The type of operation */
        operation: "encode" /** a value */,
        a: 1 /** b value */,
        b: 0,
        cipherString: "" /** The type of cipher we are doing */,
        cipherType:
            ICipherType.Affine /** The first clicked number in the solution */,
        solclick1: -1 /** The second clicked number  */,
        solclick2: -1,
        replacement: {},
    };
    public state: IAffineState = cloneObject(this.defaultstate) as IAffineState;
    public cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
    ];
    /* We have identified a complete solution */
    public completeSolution: boolean = false;
    public restore(data: IAffineState): void {
        this.state = cloneObject(this.defaultstate) as IAffineState;
        this.copyState(this.state, data);
        if (isNaN(this.state.solclick1)) {
            this.state.solclick1 = -1;
        }
        if (isNaN(this.state.solclick2)) {
            this.state.solclick2 = -1;
        }
        this.setUIDefaults();
        this.updateOutput();
    }
    public setUIDefaults(): void {
        this.seta(this.state.a);
        this.setb(this.state.b);
        this.setOperation(this.state.operation);
    }
    public updateOutput(): void {
        super.updateOutput();
        $("#a").val(this.state.a);
        $("#b").val(this.state.b);

        JTRadioButtonSet("operation", this.state.operation);

        if (this.state.operation === "encode") {
            this.guidanceURL = "TestGuidance.html#Affine";
        } else {
            this.guidanceURL = "TestGuidance.html#Affine_Decrypt";
        }

        if (this.state.solclick1 !== -1) {
            $("td#m" + this.state.solclick1).addClass("TOSOLVECLICK");
            $("td#p" + this.state.solclick1).addClass("TOSOLVECLICK");
        }
        if (this.state.solclick2 !== -1) {
            $("td#m" + this.state.solclick2).addClass("TOSOLVECLICK");
            $("td#p" + this.state.solclick2).addClass("TOSOLVECLICK");
        }
    }
    /**
     * Make a copy of the current state
     */
    public save(): IState {
        // We need a deep copy of the save state
        let savestate = cloneObject(this.state) as IState;
        return savestate;
    }
    /**
     * Sets the new A value.  A direction is also provided in the state so that if the
     * intended value is bad, we can keep advancing until we find one
     */
    public seta(a: number): boolean {
        let changed = false;
        let charset = this.getCharset();
        if (a !== this.state.a) {
            if (this.advancedir !== 0) {
                while (a !== this.state.a && !isCoPrime(a, charset.length)) {
                    a = (a + charset.length + this.advancedir) % charset.length;
                }
            }
            if (!isCoPrime(a, charset.length)) {
                $("#err").text(
                    "A value of " + a + " is not coprime with " + charset.length
                );
            }
            if (a > charset.length) {
                $("#err").text(
                    "A value of " +
                        a +
                        " must be smaller than " +
                        (charset.length + 1)
                );
            }
        }
        if (this.state.a !== a) {
            this.state.a = a;
            changed = true;
        }
        return changed;
    }
    public setb(b: number): boolean {
        let changed = false;
        let charset = this.getCharset();
        b = (b + charset.length) % charset.length;
        if (this.state.b !== b) {
            this.state.b = b;
            changed = true;
        }
        return changed;
    }
    public affinechar(c: string): string {
        let charset = this.getCharset();
        let x = charset.indexOf(c.toUpperCase());
        if (x < 0) {
            return c;
        }
        let y = (this.state.a * x + this.state.b) % charset.length;
        let res = charset.substr(y, 1);
        return res;
    }
    /**
     * Initializes the encoder.
     * We don't want to show the reverse replacement since we are doing an encode
     */
    public init(lang: string): void {
        super.init(lang);
        this.ShowRevReplace = false;
    }
    public buildReplacement(msg: string, maxEncodeWidth: number): string[][] {
        let result: string[][] = [];
        let message = "";
        let cipher = "";
        let msgLength = msg.length;
        let lastSplit = -1;
        let msgstr = msg.toUpperCase();

        for (let i = 0; i < msgLength; i++) {
            let messageChar = msgstr.substr(i, 1);
            let cipherChar = "";
            if (this.isValidChar(messageChar)) {
                message += messageChar;
                cipherChar = this.affinechar(messageChar);
                cipher += cipherChar;
            } else {
                message += messageChar;
                cipher += messageChar;
                lastSplit = cipher.length;
                continue;
            }
            if (message.length >= maxEncodeWidth) {
                if (lastSplit === -1) {
                    result.push([cipher, message]);
                    message = "";
                    cipher = "";
                    lastSplit = -1;
                } else {
                    let messagePart = message.substr(0, lastSplit);
                    let cipherPart = cipher.substr(0, lastSplit);
                    message = message.substr(lastSplit);
                    cipher = cipher.substr(lastSplit);
                    result.push([cipherPart, messagePart]);
                }
            }
        }
        if (message.length > 0) {
            result.push([cipher, message]);
        }
        return result;
    }
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be easily pasted into the text.  This returns the result
     * as the HTML to be displayed
     */
    public build(): JQuery<HTMLElement> {
        let msg = this.minimizeString(this.state.cipherString);
        let strings = this.buildReplacement(msg, this.maxEncodeWidth);
        let result = $("<div/>");
        for (let strset of strings) {
            let table = new JTTable({
                class: "cell shrink tfreq",
            });
            let toprow = table.addBodyRow();
            let bottomrow = table.addBodyRow();
            for (let i = 0; i < strset[0].length; i++) {
                let plainchar = strset[1].substr(i, 1);
                let cipherchar = strset[0].substr(i, 1);

                if (this.isValidChar(plainchar)) {
                    if (this.state.operation === "encode") {
                        toprow.add({
                            settings: { class: "TOSOLVE" },
                            content: plainchar,
                        });
                        bottomrow.add({
                            settings: { class: "TOANSWER" },
                            content: cipherchar,
                        });
                    } else {
                        toprow.add({
                            settings: {
                                class: "TOSOLVE",
                                id: "m" + i,
                            },
                            content: cipherchar,
                        });
                        bottomrow.add({
                            settings: {
                                class: "TOANSWER",
                                id: "p" + i,
                            },
                            content: plainchar,
                        });
                    }
                }
            }
            result.append(table.generate());
        }
        return result;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "grid-x" });
        let plainindex = 0;
        let cipherindex = 1;
        if (this.state.operation === "encode") {
            plainindex = 1;
            cipherindex = 0;
        }
        this.genAlphabet();
        let strings = this.buildReplacement(this.state.cipherString, 40);
        let table = new JTTable({
            class: "ansblock shrink cell unstriped",
        });
        for (let strset of strings) {
            this.addCipherTableRows(
                table,
                undefined,
                strset[plainindex],
                strset[cipherindex],
                true
            );
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "grid-x" });
        let plainindex = 0;
        if (this.state.operation === "encode") {
            plainindex = 1;
        }

        this.genAlphabet();
        let strings = this.buildReplacement(this.state.cipherString, 40);
        let table = new JTTable({
            class: "ansblock shrink cell unstriped",
        });
        for (let strset of strings) {
            this.addCipherTableRows(
                table,
                undefined,
                strset[plainindex],
                undefined,
                true
            );
        }
        result.append(table.generate());
        result.append($("<div/>", { class: "cell affinework" }));
        return result;
    }
    public canSolve(m1: string, m2: string): boolean {
        let charset = this.getCharset();
        let c1 = this.affinechar(m1);
        let c2 = this.affinechar(m2);
        let c1val = charset.indexOf(c1);
        let c2val = charset.indexOf(c2);
        let m1val = charset.indexOf(m1);
        let m2val = charset.indexOf(m2);

        let c = c1val - c2val;
        let m = m1val - m2val;

        while (m < 0) {
            m += 26;
        }
        // The reality is that A can only be one of: 1, 3, 5, 7, 9, 11,
        // 15, 17, 19, 21, 23, 25.  B will be between 0 and 25.
        while ((c < 0 || c % m !== 0) && c < 626) {
            c += 26;
        }
        let a = c / m;
        // if A not in the list, return answer.
        if (a % 2 !== 1 || a < 1 || a > 25) {
            return false;
        }

        let b = (c1val - a * m1val) % 26;
        while (b < 0) {
            b += 26;
        }
        return a === this.state.a && b === this.state.b;
    }
    /**
     * Show the encoding of a set of letters using a and b values
     */
    public encodeLetters(
        a: number,
        b: number,
        letterString: string
    ): JQuery<HTMLElement> {
        let encoding = "\\begin{array}{lcccrcl}";
        let charset = this.getCharset();
        for (let m of letterString) {
            let mVal = charset.indexOf(m);
            let cVal = a * mVal + b;
            let c = charset.substr(cVal % 26, 1);
            encoding +=
                m +
                "(" +
                mVal +
                ") & \\to & " +
                mVal +
                " * " +
                a +
                " + " +
                b +
                " & \\to & " +
                cVal +
                " \\mod{26} & \\to & " +
                c +
                "(" +
                (cVal % 26) +
                ")\\\\";
        }
        encoding += "\\end{array}";
        return $("<div/>").append(renderMath(encoding));
    }
    /**
     * Encode a string using the current replacement alphabet
     */
    public encodeString(s: string): string {
        let encoded = "";
        for (let i = 0; i < s.length; i++) {
            encoded += this.state.replacement[s.substr(i, 1)];
        }
        return encoded;
    }
    /**
     *
     */
    public genAlphabet(): void {
        let charset = this.getCharset();
        for (let i = 0; i < charset.length; i++) {
            let c = -1;
            let letter = charset.substr(i, 1);
            c = this.state.a * i + this.state.b;
            while (c >= 26) {
                c -= 26;
            }
            this.state.replacement[letter] = charset.substr(c, 1);
        }
    }
    /**
     * Generate HTML showing the current decoding progress
     */
    public genDecodeProgress(
        msg: string,
        letters: string
    ): JQuery<HTMLElement> {
        let i;
        let message = "";
        let msgLength = msg.length;

        let table = $("<table/>").addClass("tfreq");
        let tableBody = $("<tbody/>");
        let messageRow = $("<tr/>");
        let cipherRow = $("<tr/>");

        // Assume that these letters complete the solution
        this.completeSolution = true;

        for (i = 0; i < msgLength; i++) {
            let messageChar = msg.substr(i, 1).toUpperCase();
            let cipherChar = "";
            if (this.isValidChar(messageChar)) {
                message += messageChar;
                cipherChar = this.state.replacement[messageChar];
            } else {
                message += messageChar;
                continue;
            }

            if (letters.indexOf(messageChar) !== -1) {
                messageRow.append(
                    $("<td/>")
                        .addClass("TOANSWER")
                        .text(messageChar)
                );
            } else {
                // Alas one of the letters is unresolved, to the solution is not complete
                messageRow.append(
                    $("<td/>")
                        .addClass("TOANSWER")
                        .text(" ")
                );
                this.completeSolution = false;
            }
            cipherRow.append(
                $("<td/>")
                    .addClass("TOSOLVE")
                    .text(cipherChar)
            );
        }
        if (message.length > 0) {
            tableBody.append(cipherRow);
            tableBody.append(messageRow);
        }
        table.append(tableBody);

        return table;
    }
    public genSolution(): JQuery<HTMLElement> {
        if (this.state.operation === "decode") {
            return this.genDecodeSolution();
        }
        return this.genEncodeSolution();
    }
    public genEncodeSolution(): JQuery<HTMLElement> {
        let msg = this.minimizeString(this.state.cipherString);
        let mapping: StringMap = {};
        let result = $("<div/>", { id: "solution" });
        result.append($("<h3/>").text("How to solve"));

        let showencmsg = true;

        for (let m of msg) {
            let c = this.affinechar(m);
            if (mapping[m] !== undefined) {
                result.append(
                    $("<p/>").text(
                        "We already computed for " +
                            m +
                            " and know that it is " +
                            c
                    )
                );
            } else {
                if (showencmsg) {
                    showencmsg = false; // Don't show it again
                    let p = $("<p/>").text("Using the  given value of ");
                    let formula = "\\colorbox{yellow}{a =" + this.state.a + "}";
                    p.append(renderMath(formula));
                    p.append(" and ");
                    formula = "\\colorbox{yellow}{b =" + this.state.b + "}";
                    p.append(renderMath(formula));
                    p.append(" we can calcuate using the formula ");
                    formula = "{a" + kmathMult + "x + b}\\mod{26}";
                    p.append(renderMath(formula));
                    result.append(p);
                }
                result.append(
                    this.encodeLetters(this.state.a, this.state.b, m)
                );
                mapping[m] = c;
            }
        }
        return result;
    }

    public genDecodeSolution(): JQuery<HTMLElement> {
        let msg = this.minimizeString(this.state.cipherString);
        let m1 = msg.substr(this.state.solclick1, 1);
        let m2 = msg.substr(this.state.solclick2, 1);
        let result = $("<div/>", { id: "solution" });
        result.append($("<h3/>").text("How to solve"));

        if (!this.canSolve(m1, m2)) {
            result.append(
                $("<p/>").text(
                    "Indeterminate Solution! Please choose other letters."
                )
            );
            return result;
        }

        let charset = this.getCharset();

        let c1 = this.affinechar(m1);
        let c2 = this.affinechar(m2);

        let m1Val = charset.indexOf(m1);
        let c1Val = charset.indexOf(c1);
        let m2Val = charset.indexOf(m2);
        let c2Val = charset.indexOf(c2);

        result.append(
            $("<p/>").text(
                "Here is how we get the answer.  Since we are given that:"
            )
        );

        let given =
            "\\begin{aligned} " +
            m1 +
            "(" +
            m1Val +
            ") & \\to " +
            c1 +
            "(" +
            c1Val +
            ") \\\\ " +
            m2 +
            "(" +
            m2Val +
            ") & \\to " +
            c2 +
            "(" +
            c2Val +
            ") \\end{aligned}";
        result.append(renderMath(given));

        result.append($("<p/>").text("From this we know:"));

        let equation1 =
            "\\left(a * " +
            m1Val +
            " + b\\right)\\;\\text{mod 26} & = " +
            c1Val +
            " \\\\";
        let equation2 =
            "\\left(a * " +
            m2Val +
            " + b\\right)\\;\\text{mod 26} & = " +
            c2Val +
            " \\\\";

        let solution = "\\begin{aligned}";
        if (m1Val > m2Val) {
            solution += equation1 + equation2;
        } else {
            solution += equation2 + equation1;
        }
        solution += "\\end{aligned}";
        result.append(renderMath(solution));
        result.append($("<p/>").text("Next, subtract the formulas:"));

        let subtract1 = "";
        let subtract2 = "";
        let mVal = 0;
        let cVal = 0;
        let mSubstitute = 0;
        let cSubstitute = 0;

        // the 2 equations
        if (m1Val > m2Val) {
            mVal = m1Val - m2Val;
            cVal = c1Val - c2Val;
            subtract1 =
                "\\begin{aligned}" +
                equation1 +
                " - " +
                equation2 +
                " \\hline a * " +
                mVal +
                "\\;\\text{mod 26} & = " +
                cVal +
                " ";
            mSubstitute = m2Val;
            cSubstitute = c2Val;
        } else {
            mVal = m2Val - m1Val;
            cVal = c2Val - c1Val;
            subtract1 =
                "\\begin{aligned}" +
                equation2 +
                " - " +
                equation1 +
                " \\hline a * " +
                mVal +
                "\\;\\text{mod 26} & = " +
                cVal +
                " ";
            mSubstitute = m1Val;
            cSubstitute = c1Val;
        }

        solution = subtract1;
        if (cVal < 0) {
            cVal += 26;
            subtract2 =
                " \\\\ a * " + mVal + "\\;\\text{mod 26} & = " + cVal + " ";
            solution += subtract2;
        }
        solution += " \\end{aligned}";
        result.append(renderMath(solution));

        // solution for A
        let message = "";
        let a = cVal / mVal;
        let aRemainder = cVal % mVal;
        if (a !== 0) {
            let cValOriginal = cVal;
            if (aRemainder !== 0) {
                let p1 = $("<p/>").text("Since ");
                p1.append(
                    renderMath(
                        cVal +
                            " \\div " +
                            mVal +
                            " = " +
                            (cVal / mVal).toPrecision(5)
                    )
                );
                p1.append(" we have to find another value. ");
                let count = 0;

                while (aRemainder !== 0) {
                    count += 1;
                    cVal += 26;
                    aRemainder = cVal % mVal;
                }
                a = cVal / mVal;
                p1.append(
                    renderMath(
                        cValOriginal +
                            " + (26 * " +
                            count +
                            ") = " +
                            cVal +
                            ".\\space\\space" +
                            cVal +
                            " \\div " +
                            mVal +
                            " = " +
                            a
                    )
                );
                result.append(p1);
            }
        }
        result.append(renderMath(message));
        message = "\\colorbox{yellow}{a =" + a + "}";
        result.append(
            $("<p/>")
                .text("So we now know that ")
                .append(renderMath(message))
        );

        // solution for b
        result.append(
            $("<p/>").text(
                "To find b, substitute that back into the equation with the lowest multiplier. "
            )
        );
        let findingB =
            "\\begin{aligned}(" +
            a +
            " * " +
            mSubstitute +
            " + b)\\;\\text{mod 26} & = " +
            cSubstitute +
            "\\\\(" +
            a * mSubstitute +
            " + b)\\;\\text{mod 26} & = " +
            cSubstitute +
            "\\end{aligned}";
        result.append(renderMath(findingB));
        let p = $("<p/>").text("Subtract ");
        p.append(renderMath(String(a * mSubstitute)));
        p.append(" from both sides: ");
        result.append(p);
        findingB =
            "\\begin{aligned}(" +
            a * mSubstitute +
            " +b)\\;\\text{mod 26} - " +
            a * mSubstitute +
            " & = (" +
            cSubstitute +
            " - " +
            a * mSubstitute +
            ")\\;\\text{mod 26}\\\\" +
            "b\\;\\text{mod 26} & = " +
            (cSubstitute - a * mSubstitute) +
            "\\;\\text{mod 26}\\\\";

        let b = cSubstitute - a * mSubstitute;
        while (b < 0) {
            b += 26;
        }
        findingB +=
            "b\\;\\text{mod 26} & = " + b + "\\;\\text{mod 26}\\end{aligned}";
        result.append(renderMath(findingB));
        result.append(p);
        p = $("<p/>").text("And we see that ");
        p.append(renderMath("\\colorbox{yellow}{b =" + b + "}"));
        result.append(p);

        result.append(
            $("<p/>").text(
                "However, we only know a few of the letters in the cipher."
            )
        );

        let l = m1 + m2;
        result.append(this.genDecodeProgress(msg, l));

        let outData = [
            {
                letters: "ETAOIN",
                prefix:
                    "The first step is to encode the common letters <b>ETAOIN</b> to see what they would map to.",
                suffix1: "Filling in the letter we found",
                suffix2: ", we get a bit more of the answer.",
            },
            {
                letters: "SRHLD",
                prefix: "Next, encode the next 5 common letters <b>SRHLD</b>.",
                suffix1: "We know the reverse mapping of 5 more letters",
                suffix2: ", which we can fill in.",
            },
            {
                letters: "CUMFP",
                prefix:
                    "We will convert the next 5 most frequent letters <b>CUMFP</b>.",
                suffix1: "The next 5 letters we know are",
                suffix2: ", so we will fill those in.",
            },
            {
                letters: "GWYBV",
                prefix: "Next, encode the next 5 common letters <b>GWYBV</b>.",
                suffix1: "We know the reverse mapping of 5 more letters",
                suffix2: ", which we can fill in.",
            },
            {
                letters: "KXJQZ",
                prefix: "We will convert the remaining 5 letters <b>KXJQZ</b>.",
                suffix1: "The remaining 5 letters we know are",
                suffix2: ", so we will fill those in.",
            },
        ];

        for (let entry of outData) {
            if (!this.completeSolution) {
                let found = this.encodeString(entry.letters);
                result.append($("<p/>").html(entry.prefix));
                result.append(this.encodeLetters(a, b, entry.letters));
                result.append(
                    $("<p/>").text(
                        entry.suffix1 + " (" + found + ")" + entry.suffix2
                    )
                );
                l += entry.letters;
                result.append(this.genDecodeProgress(msg, l));
            }
        }

        result.append($("<p/>").text("The solution is now complete!"));
        return result;
    }
    /**
     *
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $("#a")
            .off("input")
            .on("input", e => {
                let newa: number = Number($(e.target).val());
                if (newa !== this.state.a) {
                    this.markUndo(null);
                    if (this.seta(newa)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        $("#b")
            .off("input")
            .on("input", e => {
                let newb: number = Number($(e.target).val());
                if (newb !== this.state.b) {
                    this.markUndo(null);
                    if (this.setb(newb)) {
                        this.updateOutput();
                    }
                }
                this.advancedir = 0;
            });
        $("td")
            .off("click")
            .on("click", e => {
                let id = $(e.target).attr("id");
                if (this.state.operation === "decode" && id !== "") {
                    this.markUndo("solclick");
                    this.state.solclick1 = this.state.solclick2;
                    this.state.solclick2 = Number(id.substr(1));
                    this.updateOutput();
                }
            });
    }
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(this.genTestUsage());
        let radiobuttons = [
            { id: "wrow", value: "encode", title: "Encode" },
            { id: "mrow", value: "decode", title: "Decode" },
        ];
        result.append(
            JTRadioButton(6, "operation", radiobuttons, this.state.operation)
        );

        result.append(this.genQuestionFields());
        result.append(
            JTFLabeledInput(
                "Plain Text",
                "textarea",
                "toencode",
                this.state.cipherString,
                "small-12 medium-12 large-12"
            )
        );
        let inputbox = $("<div/>", {
            class: "grid-x grid-margin-x",
        });
        inputbox.append(
            JTFIncButton("A", "a", this.state.a, "small-12 medium-4 large-4")
        );
        inputbox.append(
            JTFIncButton("B", "b", this.state.b, "small-12 medium-4 large-4")
        );
        result.append(inputbox);
        return result;
    }
    /**
     *
     */
    public load(): void {
        this.genAlphabet();
        let res = this.build();
        $("#answer")
            .empty()
            .append(res);
        if (this.state.solclick1 !== -1 && this.state.solclick2 !== -1) {
            res = this.genSolution();
        } else {
            res = $("<p/>").text(
                "Click on any two columns to choose the decode problem"
            );
        }
        $("#sol")
            .empty()
            .append("<hr/>")
            .append(res);

        this.attachHandlers();
    }
}