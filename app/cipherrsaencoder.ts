import { cloneObject } from "./ciphercommon";
import { CipherEncoder, IEncoderState } from "./cipherencoder";
import { toolMode } from "./cipherhandler";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";
import {
    gcd,
    getRandomIntInclusive,
    getRandomPrime,
    modularInverse,
} from "./mathsupport";

const monospan: string =
    "<span style=\"font-family:'Courier New', Courier, monospace;\">";
export interface IRSAData {
    p: number;
    q: number;
    n: number;
    phi: number;
    e: number;
    d: number;
}

interface IRSAState extends IEncoderState {
    /** How wide a line can be before wrapping */
    linewidth?: number;
    digitsPrime?: number;
    digitsCombo?: number;
    rsa1?: IRSAData;
    rsa2?: IRSAData;
    combo?: number;
    name1?: string;
    name2?: string;
}
/**
 * CipherBaconianEncoder - This class handles all of the actions associated with encoding
 * a Baconian cipher.
 */
export class CipherRSAEncoder extends CipherEncoder {
    activeToolMode: toolMode = toolMode.codebusters;
    defaultstate: IRSAState = {
        cipherString: "",
        question: "",
        cipherType: ICipherType.RSA,
        offset: 1 /** The type of operation */,
        operation: "rsa1",
        linewidth: this.maxEncodeWidth,
        digitsPrime: 3,
        digitsCombo: 4,
    };
    state: IRSAState = cloneObject(this.defaultstate) as IRSAState;
    cmdButtons: JTButtonItem[] = [
        { title: "Randomize", color: "primary", id: "randomize" },
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton,
    ];
    /**
     * Apply a range limit to a value, taking into account if they were using
     * an increment/decrement operation and wrap accordingly
     * @param val Value to range limit
     * @param min Minimum value to allow
     * @param max Maximum value to allow
     */
    public applySliderRange(val: number, min: number, max: number): number {
        let result = val;
        if (result < min) {
            if (this.advancedir < 0) {
                result = max;
            } else {
                result = min;
            }
        } else if (result > max) {
            if (this.advancedir > 0) {
                result = min;
            } else {
                result = max;
            }
        }
        return result;
    }
    /**
     * Set/limit the digitsPrime, returning a flag indicating any change
     * @param digitsPrime New value for state.digitsPrime
     */
    public setDigitsPrime(digitsPrime: number): boolean {
        let changed = false;
        let newdigits = this.applySliderRange(digitsPrime, 2, 10);
        if (newdigits !== this.state.digitsPrime) {
            changed = true;
            this.state.digitsPrime = newdigits;
        }
        return changed;
    }
    /**
     * Set/limit the digitsPrime, returning a flag indicating any change
     * @param digitsCombo New value for state.digitsPrime
     */
    public setDigitsCombo(digitsCombo: number): boolean {
        let changed = false;
        let newdigits = this.applySliderRange(digitsCombo, 2, 6);
        if (newdigits !== this.state.digitsCombo) {
            changed = true;
            this.state.digitsCombo = newdigits;
        }
        return changed;
    }
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setDigitsCombo(this.state.digitsCombo);
        this.setDigitsPrime(this.state.digitsPrime);
        this.setOperation(this.state.operation);
    }
    public setLineWidth(linewidth: number): boolean {
        let changed = false;
        if (linewidth < 0) {
            linewidth = this.maxEncodeWidth;
        }
        if (this.state.linewidth !== linewidth) {
            this.state.linewidth = linewidth;
            changed = true;
        }
        return changed;
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        $(".opfield").hide();
        $("." + this.state.operation).show();
        JTRadioButtonSet("operation", this.state.operation);
        $("#linewidth").val(this.state.linewidth);
        $("#digitsprime").val(this.state.digitsPrime);
        $("#digitscombo").val(this.state.digitsCombo);
        super.updateOutput();
    }
    /**
     * Initializes the encoder.
     */
    public init(lang: string): void {
        super.init(lang);
    }
    public getEncodeWidth(): number {
        let linewidth = this.maxEncodeWidth;
        if (this.state.operation !== "words") {
            linewidth = this.state.linewidth;
        }
        return linewidth;
    }
    public build(): JQuery<HTMLElement> {
        if (this.state.operation === "rsa1") {
            this.compute1();
        }
        return this.genAnswer();
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        $(".err").text("");
        let res = this.build();
        $("#answer")
            .empty()
            .append(res);

        // Show the update frequency values
        this.displayFreq();
        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }

    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(this.genTestUsage());

        let radiobuttons = [
            { value: "rsa1", title: "Scenario 1" },
            { value: "rsa2", title: "Scenario 2" },
            { value: "rsa3", title: "Scenario 3" },
            { value: "rsa4", title: "Scenario 4" },
            { value: "rsa5", title: "Scenario 5" },
        ];
        result.append(
            JTRadioButton(6, "operation", radiobuttons, this.state.operation)
        );

        result.append(this.genQuestionFields());
        result.append(
            JTFLabeledInput(
                "Value to encode",
                "number",
                "toencode",
                this.state.cipherString,
                "small-12 medium-12 large-12 opfield"
            )
        );
        result.append(
            JTFIncButton(
                "Prime Digits",
                "digitsprime",
                this.state.digitsPrime,
                "small-12 medium-6 large-6 opfield rsa1 sequence"
            )
        );
        result.append(
            JTFIncButton(
                "Safe Combination Digits",
                "digitscombo",
                this.state.digitsCombo,
                "small-12 medium-6 large-6 opfield rsa1 sequence"
            )
        );
        result.append(
            JTFIncButton(
                "Line Width",
                "linewidth",
                this.state.linewidth,
                "small-12 medium-6 large-6 opfield rsa2 sequence"
            )
        );

        return result;
    }
    public recalcData(): void {
        this.state.question = this.getTemplatedQuestion("");
        this.state.rsa1 = undefined;
        this.state.rsa2 = undefined;
        this.state.name1 = undefined;
        this.state.name2 = undefined;
    }

    public getRandomName(): string {
        let names = [
            "Abigail",
            "Alexander",
            "Alexia",
            "Alexis",
            "Alison",
            "Allison",
            "Alyssa",
            "Andrew",
            "Anna",
            "Anthony",
            "Ashley",
            "Austin",
            "Ava",
            "Benjamin",
            "Brandon",
            "Brendan",
            "Brent",
            "Brett",
            "Brianna",
            "Brooke",
            "Brooklin",
            "Cassidy",
            "Chloe",
            "Christian",
            "Christopher",
            "Cloe",
            "Cody",
            "Daniel",
            "David",
            "Dylan",
            "Elizabeth",
            "Ella",
            "Emily",
            "Emma",
            "Ethan",
            "Female",
            "Gabriel",
            "Grace",
            "Haileigh",
            "Hailey",
            "Haley",
            "Hannah",
            "Haylee",
            "Hayley",
            "Isabella",
            "Jacob",
            "Jake",
            "James",
            "Jasmine",
            "Jennifer",
            "Jesse",
            "Jessica",
            "Jessie",
            "John",
            "Jonathan",
            "Jose",
            "Joseph",
            "Joshua",
            "Justin",
            "Kaitlyn",
            "Kayla",
            "Lauren",
            "Logan",
            "Madison",
            "Male",
            "Matthew",
            "Megan",
            "Mia",
            "Micaela",
            "Michael",
            "Mikaela",
            "Mikayla",
            "Morgan",
            "Mykayla",
            "Natalie",
            "Nathan",
            "Nicholas",
            "Noah",
            "Olivia",
            "Paige",
            "Rachel",
            "Ryan",
            "Samantha",
            "Samuel",
            "Sarah",
            "Sophia",
            "Sydney",
            "Taylor",
            "Tyler",
            "Tyson",
            "Victoria",
            "William",
            "Zachary",
        ];
        let index = Math.floor(Math.random() * names.length);
        return names[index];
    }
    /**
     * Compute a full RSA value set
     * @param nDigits Number of digits for the Prime
     */
    public CalculateRSA(nDigits: number): IRSAData {
        let result: IRSAData = {
            p: 0,
            q: 0,
            n: 0,
            phi: 0,
            e: 0,
            d: 0,
        };
        result.p = getRandomPrime(this.state.digitsPrime);
        result.q = getRandomPrime(this.state.digitsPrime);
        this.state.combo = getRandomIntInclusive(
            (Math.pow(10, nDigits) - 1) / 9,
            Math.pow(10, nDigits) - 1
        );
        // RSA requires that p and q be different prime values
        while (result.p === result.q) {
            result.q = getRandomPrime(nDigits);
        }
        result.n = result.p * result.q;
        result.phi = (result.p - 1) * (result.q - 1);
        result.e = getRandomIntInclusive(3, result.n - 1);
        while (gcd(result.e, result.phi) !== 1) {
            result.e = getRandomIntInclusive(3, result.phi);
        }
        result.d = modularInverse(result.e, result.phi);
        return result;
    }
    public substituteTemplateVal(
        str: string,
        templateid: string,
        val: number
    ): string {
        if (val === undefined || isNaN(val)) {
            return str;
        }
        // Make sure that the match string isn't at the start or the end so we only have to do one pattern
        let work = " " + str + " ";
        work = work.replace(
            new RegExp("(\\D)" + String(val) + "(\\D)", "g"),
            "$1##" + templateid + "##$2"
        );
        return work.substr(1, work.length - 2);
    }
    public substituteTemplateStr(
        str: string,
        templateid: string,
        val: string
    ): string {
        if (val === undefined || val === "") {
            return str;
        }
        // Make sure that the match string isn't at the start or the end so we only have to do one pattern
        return str.replace(
            new RegExp("\\b" + val + "\\b", "g"),
            "##" + templateid + "##"
        );
    }
    public substituteRSATemplate(
        str: string,
        templateid: string,
        val: IRSAData
    ): string {
        if (val === undefined) {
            return str;
        }
        let result = this.substituteTemplateVal(str, templateid + "P", val.p);
        result = this.substituteTemplateVal(result, templateid + "Q", val.q);
        result = this.substituteTemplateVal(result, templateid + "N", val.n);
        result = this.substituteTemplateVal(
            result,
            templateid + "PHI",
            val.phi
        );
        result = this.substituteTemplateVal(result, templateid + "E", val.e);
        result = this.substituteTemplateVal(result, templateid + "D", val.d);
        return result;
    }
    public getTemplatedQuestion(defaultQ: string): string {
        if (
            this.state.question === undefined ||
            this.state.question === "" ||
            this.state.question === "Solve This"
        ) {
            return defaultQ;
        }
        // We have to reverse all of the values.  Note that we want to start with the larger ones
        // first just in case we catch something which isn't
        let result = this.state.question;
        // Find all of the places where we used the RSA1 values
        result = this.substituteTemplateVal(
            result,
            "SAFECOMBO",
            this.state.combo
        );
        result = this.substituteTemplateStr(result, "NAME1", this.state.name1);
        result = this.substituteTemplateStr(result, "NAME2", this.state.name2);
        result = this.substituteRSATemplate(result, "R1", this.state.rsa1);
        result = this.substituteRSATemplate(result, "R2", this.state.rsa2);
        return result;
    }
    public applyTemplateStr(
        template: string,
        templateid: string,
        val: string
    ): string {
        return template.replace(new RegExp("##" + templateid + "##", "g"), val);
    }
    public applyTemplateRSA(
        template: string,
        templateid: string,
        val: IRSAData
    ): string {
        if (val === undefined) {
            return template;
        }
        let result = this.applyTemplateStr(
            template,
            templateid + "P",
            String(val.p)
        );
        result = this.applyTemplateStr(result, templateid + "Q", String(val.q));
        result = this.applyTemplateStr(result, templateid + "N", String(val.n));
        result = this.applyTemplateStr(
            result,
            templateid + "PHI",
            String(val.phi)
        );
        result = this.applyTemplateStr(result, templateid + "E", String(val.e));
        result = this.applyTemplateStr(result, templateid + "D", String(val.d));
        return result;
    }
    public applyTemplate(template: string): string {
        let result = this.applyTemplateStr(
            template,
            "SAFECOMBO",
            String(this.state.combo)
        );
        result = this.applyTemplateStr(result, "NAME1", this.state.name1);
        result = this.applyTemplateStr(result, "NAME2", this.state.name2);
        result = this.applyTemplateRSA(result, "R1", this.state.rsa1);
        result = this.applyTemplateRSA(result, "R2", this.state.rsa2);
        return result;
    }
    /*
 * Sorter to compare random order entries
 */
    rosort(a: any, b: any): number {
        if (a.order < b.order) {
            return -1;
        } else if (a.order > b.order) {
            return 1;
        }
        return 0;
    }
    public getRSARandomTemplate(prefix: string): string {
        let result = "<p>";
        let sortset = [
            { order: Math.random(), label: "p", template: "P" },
            { order: Math.random(), label: "q", template: "Q" },
            { order: Math.random(), label: "n", template: "N" },
            { order: Math.random(), label: "Φ", template: "PHI" },
            { order: Math.random(), label: "e", template: "E" },
            { order: Math.random(), label: "d", template: "D" },
        ];
        sortset.sort(this.rosort);

        let iseven = false;
        for (let item of sortset) {
            result +=
                monospan +
                "&nbsp;&nbsp;&nbsp;" +
                item.label +
                " = ##" +
                prefix +
                item.template +
                "##</span>";
            if (iseven) {
                result += "<br/>";
            } else {
                result += "&nbsp;&nbsp;&nbsp;";
            }
            iseven = !iseven;
        }
        result += "</p>";
        return result;
    }
    public compute1(): void {
        let defaultQTemplate =
            "<p>##NAME1## has faithfully followed the steps of the RSA key-generation algorithm. " +
            "Here are the results:</p>" +
            this.getRSARandomTemplate("R1") +
            "<p>As it comes to pass, ##NAME2## is on vacation in Hawaii, " +
            "and ##NAME1## needs a document that is stored in the company safe. " +
            "They are communicating via email, " +
            "and both know it is very unwise to trust the security of computers in a hotel lobby." +
            "##NAME1## needs to tell ##NAME2## his/her public key, " +
            "knowing well that it can be read by untrustworthy parties. " +
            "List the minimum set of numbers that ##NAME1## needs to email to ##NAME2## " +
            "in order for ##NAME2## to be able to decode the message.</p>" +
            "<p>Additionally, ##NAME2## wants to transmit the combination to the safe " +
            "(which is ##SAFECOMBO##)" +
            " in the response email, but encrypted with RSA. " +
            "What should formula should ##NAME2## compute in order to know the ciphertext to transmit?</p>";

        let question = this.getTemplatedQuestion(defaultQTemplate);
        if (this.state.name1 === undefined || this.state.name1 === "") {
            this.state.name1 = this.getRandomName();
        }
        while (
            this.state.name2 === undefined ||
            this.state.name2 === "" ||
            this.state.name2 === this.state.name1
        ) {
            this.state.name2 = this.getRandomName();
        }
        if (this.state.rsa1 === undefined) {
            this.state.rsa1 = this.CalculateRSA(this.state.digitsPrime);
            this.state.combo = getRandomIntInclusive(
                (Math.pow(10, this.state.digitsCombo) - 1) / 9,
                Math.pow(10, this.state.digitsCombo) - 1
            );
        }
        this.state.question = this.applyTemplate(question);
        this.updateQuestionsOutput();
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genQuestionAnswer1(showanswers: boolean): JQuery<HTMLElement> {
        let result = $("<div>");
        let cellclass = "TOSOLVE";
        let formula = $("<span/>").text("");

        let answers: string[] = ["", "", ""];
        if (showanswers) {
            cellclass = "TOANSWER";
            answers = [
                String(this.state.rsa1.n),
                String(this.state.rsa1.e),
                "",
            ];
            formula = $("<span/>").text(
                this.state.combo +
                    " ^ " +
                    this.state.rsa1.e +
                    " mod " +
                    this.state.rsa1.n
            );
        }
        if (this.state.combo > this.state.rsa1.n) {
            result.append(
                $("<div/>", { class: "callout error" }).text(
                    "The combination is smaller than N. Please pick a smaller combo or larger primes"
                )
            );
            return result;
        }
        result.append(
            $("<div/>").text("Enter the minimum values to transmit:")
        );

        let table = new JTTable({
            class: "ansblock shrink cell unstriped",
        });
        let row = table.addBodyRow();
        for (let i = 0; i < 3; i++) {
            row.add({
                settings: {
                    class: "v rsawide " + cellclass,
                },
                content: answers[i],
            });
        }

        result.append(table.generate());
        if (showanswers) {
            result.append(
                $("<span/>").append(
                    $("<em/>").text("These two numbers can be in either order.")
                )
            );
        }

        result.append(
            $("<div/>").text(
                "Enter the formula (using correct numbers) to transmit:"
            )
        );

        result.append(
            $("<div/>", { class: "formulabox " + cellclass }).append(formula)
        );
        return result;
    }
    public genSolution1(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append($("<h3/>").text("How to solve"));

        let template =
            "<p>In order for ##NAME2## to be able to read ##NAME1##'s RSA encrypted message, " +
            "##NAME1## has to transmit their public key (<em>n</em>,<em>e</em>) and nothing else. " +
            "In this case it is " +
            monospan +
            "n = ##R1N##, e = ##R1E##</span></p>" +
            "<p>To encode the safe combination of ##SAFECOMBO##, ##NAME2## will have to raise it to " +
            " the power of <em>e</em> and take the modulus <em>n</em>. " +
            "Hence the formula " +
            monospan +
            "v ^ e mod n</span>. " +
            " It is also worth noting that these are the only numbers that ##NAME2## has access to.";

        result.append($(this.applyTemplate(template)));
        return result;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $("<div>");
        if (this.state.operation === "rsa1") {
            return this.genQuestionAnswer1(true);
        }
        result.append($("<h3/>").text("Not yet implemented"));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $("<div>");
        if (this.state.operation === "rsa1") {
            return this.genQuestionAnswer1(false);
        } else {
            result.append($("<h3/>").text("Not yet implemented"));
        }
        return result;
    }
    public genSolution(): JQuery<HTMLElement> {
        let result = $("<div/>");
        if (this.state.operation === "rsa1") {
            return this.genSolution1();
        } else {
            result.append($("<h3/>").text("Not yet implemented"));
        }
        return result;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $("#linewidth")
            .off("input")
            .on("input", e => {
                let linewidth = $(e.target).val() as number;
                this.markUndo(null);
                if (this.setLineWidth(linewidth)) {
                    this.updateOutput();
                }
            });
        $("#digitsprime")
            .off("input")
            .on("input", e => {
                let digits = Number($(e.target).val());
                this.markUndo(null);
                if (this.setDigitsPrime(digits)) {
                    this.recalcData();
                    this.updateOutput();
                }
            });
        $("#digitscombo")
            .off("input")
            .on("input", e => {
                let digits = Number($(e.target).val());
                this.markUndo(null);
                if (this.setDigitsCombo(digits)) {
                    this.recalcData();
                    this.updateOutput();
                }
            });
        $("#randomize")
            .off("click")
            .on("click", () => {
                this.markUndo(null);
                this.recalcData();
                this.updateOutput();
            });
    }
}
