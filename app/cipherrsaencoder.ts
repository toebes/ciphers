import { cloneObject, renderMath } from "./ciphercommon";
import { CipherEncoder, IEncoderState } from "./cipherencoder";
import { IOperationType, toolMode } from "./cipherhandler";
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
/**
 * Generates the HTML to display a sting in a fixed width font
 * @param str String to display as fixed width
 */
function fwspan(str: string): string {
    return (
        "<span style=\"font-family:'Courier New', Courier, monospace;\">" +
        str +
        "</span>"
    );
}
/**
 * Use the Rapid Modular Exponentation to encrypt a value given a power and exponent
 * @param val Value to encrypt
 * @param n Power to raise it to
 * @param e exponent to raise it
 */
function RSAEncrypt(val: number, n: number, e: number): number {
    // Note that we can't actually raise it to the power N and not expect an overflow
    // so we have to do it the same way that we expect them to do it on a calculator
    let binary = n
        .toString(2)
        .split("")
        .reverse()
        .join("");
    let result = 1;
    let powerval = val % e;
    for (let bit of binary) {
        if (bit === "1") {
            result = (result * powerval) % e;
        }
        powerval = (powerval * powerval) % e;
    }
    return result;
}
/**
 * This represents the data for a generated RSA key
 */
export interface IRSAData {
    p: number;
    q: number;
    n: number;
    phi: number;
    e: number;
    d: number;
}

interface IRSAState extends IEncoderState {
    /** Number of digits for the prime number in the RSA key */
    digitsPrime?: number;
    /** Number of digits for the combination of a safe */
    digitsCombo?: number;
    /** The first computed RSA value */
    rsa1?: IRSAData;
    /** The second computed RSA value */
    rsa2?: IRSAData;
    /** Generated combination of a safe */
    combo?: number;
    /** Name of the first party (for which the rsa1 applies) */
    name1?: string;
    /** Name of the second party (for which the rsa2 applies) */
    name2?: string;
    /** Generate year for the year transmit option */
    year?: number;
    /** Encrypted value to be transmitted */
    encrypted?: number;
    /** Option for the RSA generation  */
    qchoice?: number;
}
/**
 * These configure the ranges for the digitsPrime and digitsCombo for the different scenarios
 */
const digitsPrimeRange = {
    rsa1: { min: 3, max: 8 },
    rsa2: { min: 3, max: 6 },
    rsa3: { min: 2, max: 6 },
    rsa4: { min: 2, max: 4 },
    rsa5: { min: 3, max: 8 },
};
const digitsComboRange = {
    rsa1: { min: 2, max: 8 },
    rsa2: { min: 3, max: 6 },
    rsa3: { min: 2, max: 6 },
    rsa4: { min: 2, max: 4 },
    rsa5: { min: 3, max: 8 },
};
/**
 * These strings are used for the RSA5 scenario to display the choices
 */
const optRSA5TemplateOptStrings = [
    "formula ##NAME1## needs to calculate in order to transmit the value ##SAFECOMBO## to ##NAME2##",
    "formula ##NAME2## needs to calculate in order to transmit the value ##SAFECOMBO## to ##NAME1##",
    "formula ##NAME1## needs to calculate in order to decrypt the value ##SAFECOMBO## from ##NAME2##",
    "formula ##NAME2## needs to calculate in order to decrypt the value ##SAFECOMBO## from ##NAME1##",
];

const optRSA5Formulas = [
    "##SAFECOMBO## ^ ##R2E## mod ##R2N##",
    "##SAFECOMBO## ^ ##R1E## mod ##R1N##",
    "##SAFECOMBO## ^ ##R1D## mod ##R1N##",
    "##SAFECOMBO## ^ ##R2D## mod ##R2N##",
];
const optRSA5TemplateAnswerStrings = [
    "<p>##NAME1## needs to use ##NAME2##'s public key (" +
        fwspan("<em>n</em> = ##R2N##") +
        ", " +
        fwspan("<em>e</em> = ##R2E##") +
        ") in order to encrypt the value ##SAFECOMBO##.</p>" +
        "<p>Hence the formula is: " +
        fwspan("value ^ e mod n") +
        "</p>",
    "<p>##NAME2## needs to use ##NAME1##'s public key (" +
        fwspan("<em>n</em> = ##R1N##") +
        ", " +
        fwspan("<em>e</em> = ##R1E##") +
        ") in order to encrypt the value ##SAFECOMBO##.</p>" +
        "<p>Hence the formula is: " +
        fwspan("value ^ e mod n") +
        "</p>",
    "<p>##NAME1## needs to use their own private key (" +
        fwspan("<em>n</em> = ##R1N##") +
        ", " +
        fwspan("<em>d</em> = ##R1D##") +
        ") because ##NAME2## had to encode it using ##NAME1##'s public key of (##R1N##,##R1E##).</p>" +
        "<p>In order to decrypt the value ##SAFECOMBO##, ##NAME1## must use the formula: " +
        fwspan("value ^ d mod n") +
        "</p>",
    "<p>##NAME2## needs to use their own private key (" +
        fwspan("<em>n</em> = ##R2N##") +
        ", " +
        fwspan("<em>d</em> = ##R2D##") +
        ") because ##NAME1## had to encode it using ##NAME2##'s public key of (##R2N##,##R2E##).</p>" +
        "<p>In order to decrypt the value ##SAFECOMBO##, ##NAME2## must use the formula: " +
        fwspan("value ^ d mod n") +
        "</p>",
];
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
        operation: "rsa1",
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
        let newdigits = this.applySliderRange(
            digitsPrime,
            digitsPrimeRange[this.state.operation].min,
            digitsPrimeRange[this.state.operation].max
        );
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
        let newdigits = this.applySliderRange(
            digitsCombo,
            digitsComboRange[this.state.operation].min,
            digitsComboRange[this.state.operation].max
        );
        if (newdigits !== this.state.digitsCombo) {
            changed = true;
            this.state.digitsCombo = newdigits;
        }
        return changed;
    }
    /**
     * Set the operation for the encoder type (which RSA type problem we are generating)
     * @param operation New operation type
     */
    setOperation(operation: IOperationType): boolean {
        let changed = super.setOperation(operation);
        if (changed) {
            this.setUIDefaults();
            this.recalcData();
            this.state.qchoice = undefined;
            this.state.question = "";
        }
        return changed;
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {
        super.setUIDefaults();
        this.setDigitsCombo(this.state.digitsCombo);
        this.setDigitsPrime(this.state.digitsPrime);
        this.setOperation(this.state.operation);
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        $(".opfield").hide();
        $("." + this.state.operation).show();
        JTRadioButtonSet("operation", this.state.operation);
        $("#digitsprime").val(this.state.digitsPrime);
        $("#digitscombo").val(this.state.digitsCombo);
        $("#digitsData").val(this.state.digitsCombo);
        super.updateOutput();
    }
    /**
     * Generate HTML for any UI elements that go above the command bar
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(this.genTestUsage());

        let radiobuttons = [
            { value: "rsa1", title: "Safe Combo" },
            { value: "rsa2", title: "Quantum Computer" },
            { value: "rsa3", title: "Compute <em>d</em>" },
            { value: "rsa4", title: "Decode Year" },
            { value: "rsa5", title: "Exchange Keys" },
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
                "small-12 medium-6 large-6 opfield rsa1 rsa2 rsa3 rsa4 rsa5 sequence"
            )
        );
        // Note that the Safe Combination and Data Digits actually present the same saved value
        // but for different scenarios.  The only difference is the actual label.
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
                "Data Digits",
                "digitsData",
                this.state.digitsCombo,
                "small-12 medium-6 large-6 opfield rsa5 sequence"
            )
        );
        return result;
    }
    /**
     * Invalidate any calculated data so that it can be regenerated.
     * This is called by the randomize button and when switching scenarios
     */
    public recalcData(): void {
        this.state.question = this.getTemplatedQuestion("");
        this.state.rsa1 = undefined;
        this.state.rsa2 = undefined;
        this.state.name1 = undefined;
        this.state.name2 = undefined;
    }
    /**
     * Based on the current operation, build the question and show the answer/solution
     */
    public build(): JQuery<HTMLElement> {
        switch (this.state.operation) {
            case "rsa1":
                this.compute1();
                break;
            case "rsa2":
                this.compute2();
                break;
            case "rsa3":
                this.compute3();
                break;
            case "rsa4":
                this.compute4();
                break;
            case "rsa5":
                this.compute5();
                break;
            default:
                break;
        }
        let result = $("<div/>")
            .append(this.genAnswer())
            .append(this.genSolution());
        return result;
    }
    public genQuestionAnswer(showanswers: boolean): JQuery<HTMLElement> {
        switch (this.state.operation) {
            case "rsa1":
                return this.genQuestionAnswer1(showanswers);
            case "rsa2":
                return this.genQuestionAnswer2(showanswers);
            case "rsa3":
                return this.genQuestionAnswer3(showanswers);
            case "rsa4":
                return this.genQuestionAnswer4(showanswers);
            case "rsa5":
                return this.genQuestionAnswer5(showanswers);
            default:
                break;
        }
        return $("<h3/>").text("Not yet implemented");
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        return this.genQuestionAnswer(true);
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        return this.genQuestionAnswer(false);
    }
    public genSolution(): JQuery<HTMLElement> {
        switch (this.state.operation) {
            case "rsa1":
                return this.genSolution1();
            case "rsa2":
                return this.genSolution2();
            case "rsa3":
                return this.genSolution3();
            case "rsa4":
                return this.genSolution4();
            case "rsa5":
                return this.genSolution5();
            default:
                break;
        }
        return $("<h3/>").text("Not yet implemented");
    }
    /**
     * Loads up the values for the encoder
     */
    public load(): void {
        let res = this.build();
        $("#answer")
            .empty()
            .append(res);

        // We need to attach handlers for any newly created input fields
        this.attachHandlers();
    }
    /**
     * Generate a random name to use for a question.  These names come from
     * the most common baby names from 1998-2005 so that they should be
     * familiar to most of the kids taking the test
     */
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
        let result: IRSAData = { p: 0, q: 0, n: 0, phi: 0, e: 0, d: 0 };
        do {
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
        } while (isNaN(result.d));
        return result;
    }
    /**
     * This reverses a templated string by finding a given numberic value and
     * replacing it with the given template string.  Note that the numeric value
     * must be a complete set of digits preceeded and followed by a non-numeric
     * character
     * @param str Template string
     * @param templateid placeholder to put in place
     * @param val Old value to substitute for
     */
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
    /**
     * This reverses a templated string by finding a given string and
     * replacing it with the given template string.  Note that the string
     * must match a complete string (taking advantage of the \b ) regex
     * https://www.w3schools.com/jsref/jsref_regexp_begin.asp
     * @param str Template string
     * @param templateid placeholder to put in place
     * @param val Old value to substitute for
     */
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
    /**
     * This reverses a templated string by finding all of the RSA values in
     * that string and replacing them with a prefixed template
     * @param str Template string
     * @param templateid Template prefix placeholder (R1/R2)
     * @param val RSA values to replace
     */
    public substituteRSATemplate(
        str: string,
        templateid: string,
        val: IRSAData
    ): string {
        // If there is no calculated RSA value, we don't have to do anything
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
    /**
     * Get a template to use for the current problem.  If we have a valid string
     * already populating the question, we want to use it but reverse the values
     * to turn it back into a template.  However, if the string is basically
     * empty, then we want to use the default template
     * @param defaultQ Default template to use
     */
    public getTemplatedQuestion(defaultQ: string): string {
        // See if we have an empty question.  Unfortunately there are a lot of
        // different ways that an empty string presents itself, so we have to
        // get rid of all the fluff and see if we have anything left over
        let isempty = false;
        if (this.state.question === undefined) {
            isempty = true;
        } else {
            let question = this.state.question
                .replace("<p>", "")
                .replace("</p>", "")
                .replace("&nbsp;", "")
                .replace("undefined", "")
                .replace("Solve This", "")
                .replace(" ", "");
            if (question === "") {
                isempty = true;
            }
        }
        // If it really is empty, then we get to use the template
        if (isempty) {
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
        result = this.substituteTemplateVal(
            result,
            "ENCRYPTED",
            this.state.encrypted
        );
        result = this.substituteTemplateStr(result, "NAME1", this.state.name1);
        result = this.substituteTemplateStr(result, "NAME2", this.state.name2);
        result = this.substituteRSATemplate(result, "R1", this.state.rsa1);
        result = this.substituteRSATemplate(result, "R2", this.state.rsa2);
        return result;
    }
    /**
     * Substitute a string value into a template.
     * @param template Template
     * @param templateid ID to replace in the template
     * @param val Value to substitute
     */
    public applyTemplateStr(
        template: string,
        templateid: string,
        val: string
    ): string {
        return template.replace(new RegExp("##" + templateid + "##", "g"), val);
    }
    /**
     * Substitute all of the RSA values into a template.
     * @param template Template
     * @param templateid ID Prefix (R1/R2)
     * @param val Computed RSA values
     */
    public applyTemplateRSA(
        template: string,
        templateid: string,
        val: IRSAData
    ): string {
        // If we don't have a computed RSA value, we are done
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
    /**
     * Apply all of the values into the template string.
     * @param template Template string
     */
    public applyTemplate(template: string): string {
        let result = this.applyTemplateStr(
            template,
            "SAFECOMBO",
            String(this.state.combo)
        );
        result = this.applyTemplateStr(result, "NAME1", this.state.name1);
        result = this.applyTemplateStr(result, "NAME2", this.state.name2);
        result = this.applyTemplateStr(
            result,
            "ENCRYPTED",
            String(this.state.encrypted)
        );
        result = this.applyTemplateRSA(result, "R1", this.state.rsa1);
        result = this.applyTemplateRSA(result, "R2", this.state.rsa2);
        return result;
    }
    /**
     * Generate a randomized order of the 6 RSA template pieces
     * @param prefix Prefix string (R1/R2) to apply to the set in the template
     */
    public getRSATemplate(prefix: string, randomize: boolean): string {
        let result = "<p>";
        let sortset = [
            { order: Math.random(), label: "p", template: "P" },
            { order: Math.random(), label: "q", template: "Q" },
            { order: Math.random(), label: "n", template: "N" },
            { order: Math.random(), label: "Φ", template: "PHI" },
            { order: Math.random(), label: "e", template: "E" },
            { order: Math.random(), label: "d", template: "D" },
        ];
        if (randomize) {
            // Sort them based on the random number
            sortset.sort(
                (a: any, b: any): number => {
                    if (a.order < b.order) {
                        return -1;
                    } else if (a.order > b.order) {
                        return 1;
                    }
                    return 0;
                }
            );
        }
        let isEven = false;
        let extra = "";
        for (let item of sortset) {
            if (isEven) {
                result += "&nbsp;&nbsp;&nbsp;";
            } else {
                result += extra;
                extra = "<br/>";
            }
            result += fwspan(
                "&nbsp;&nbsp;&nbsp;<em>" +
                    item.label +
                    "</em> = ##" +
                    prefix +
                    item.template +
                    "##"
            );
            isEven = !isEven;
        }
        result += "</p>";
        return result;
    }
    /**
     * Scenario 4 - Decode the year given a private key
     */
    public compute1(): void {
        let defaultQTemplate =
            "<p>##NAME1## has faithfully followed the steps of the RSA key-generation algorithm. " +
            "But has forgotten the last step&mdash;how to encrypt a message." +
            "First, Here are the results from the other steps:</p>" +
            this.getRSATemplate("R1", true) +
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
        let cellclass = showanswers ? "TOANSWER" : "TOSOLVE";

        let formula = $("<span/>").text("");

        let answers: string[] = ["", "", ""];
        if (showanswers) {
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
                $("<div/>", {
                    class: "callout error",
                }).text(
                    "The combination is smaller than N. Please pick larger primes"
                )
            );
            return result;
        }
        result.append(
            this.genKeyBlock(
                "Enter the minimum values to transmit:",
                answers,
                showanswers
            )
        );

        result.append(
            $("<div/>").text(
                "Enter the formula (using correct numbers) to transmit:"
            )
        );

        result.append(
            $("<div/>", {
                class: "formulabox " + cellclass,
            }).append(formula)
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
            fwspan("n = ##R1N##, e = ##R1E##") +
            "</p>" +
            "<p>To encode the safe combination of ##SAFECOMBO##, ##NAME2## will have to raise it to " +
            " the power of <em>e</em> and take the modulus <em>n</em>. " +
            "Hence the formula " +
            fwspan("v ^ e mod n") +
            ". " +
            " It is also worth noting that these are the only numbers that ##NAME2## has access to.";

        result.append($(this.applyTemplate(template)));
        return result;
    }
    /**
     * Scenario 2 - Recover a private key with a factored n
     */
    public compute2(): void {
        let defaultQTemplate =
            "<p>Special Agent, ##NAME1##, has the following RSA public key:</p><p>" +
            fwspan("&nbsp;&nbsp;&nbsp;<em>n</em> = ##R1N##") +
            fwspan("&nbsp;&nbsp;&nbsp;<em>e</em> = ##R1E##") +
            "</p>" +
            "<p>Unfortunately for them, A quantum computer has successfully factored their <em>n</em></p>" +
            "<p>" +
            fwspan("&nbsp;&nbsp;&nbsp;##R1N## = ##R1P## * ##R1Q##") +
            "</p>" +
            "<p>Compute the value of their private key:</p>";

        let question = this.getTemplatedQuestion(defaultQTemplate);
        if (this.state.name1 === undefined || this.state.name1 === "") {
            this.state.name1 = this.getRandomName();
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
    public genQuestionAnswer2(showanswers: boolean): JQuery<HTMLElement> {
        let result = $("<div>");
        let cellclass = "TOSOLVE";

        let answer = "";
        if (showanswers) {
            cellclass = "TOANSWER";
            answer = String(this.state.rsa1.d);
        }
        result.append($("<div/>").text("Enter the computed private key:"));

        let table = new JTTable({
            class: "ansblock shrink cell unstriped",
        });
        let row = table.addBodyRow();
        row.add({
            settings: {
                class: "v rsawide " + cellclass,
            },
            content: answer,
        });

        result.append(table.generate());
        return result;
    }
    public genSolution2(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append($("<h3/>").text("How to solve"));

        result.append(
            $("<div/>").text(
                "To find the private key, First we need to find Φ using the formula:"
            )
        );
        result.append($("<div/>").append(renderMath("Φ=(p-1)*(q-1)")));
        let p_1 = this.state.rsa1.p - 1;
        let q_1 = this.state.rsa1.q - 1;
        result.append(
            $("<div/>").append(
                renderMath(
                    "Φ=(" +
                        this.state.rsa1.p +
                        "-1)*(" +
                        this.state.rsa1.q +
                        "-1)=" +
                        p_1 +
                        "*" +
                        q_1 +
                        "=" +
                        this.state.rsa1.phi
                )
            )
        );
        result.append(
            $("<p/>")
                .text("We now know that we know that ")
                .append(renderMath("Φ=" + this.state.rsa1.phi))
        );

        result.append(
            $("<p/>")
                .text("Second, we use the ")
                .append(
                    $("<a/>", {
                        href:
                            "https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm",
                    }).text("extended Euclidean Algorithm")
                )
                .append(
                    " using " +
                        this.state.rsa1.e +
                        " and " +
                        this.state.rsa1.phi
                )
        );
        result.append(
            this.genTalkativeModulerInverse(
                this.state.rsa1.e,
                this.state.rsa1.phi
            )
        );
        return result;
    }
    /**
     * Scenario 3 - Compute d given the other 5 values of the algorithm
     */
    public compute3(): void {
        let defaultQTemplate =
            "<p>##NAME1##, has faithfully followed the steps of the " +
            "RSA key-generation algorithm.  Here are the results:</p>" +
            fwspan("&nbsp;&nbsp;&nbsp;<em>p</em> = ##R1P##<br/>") +
            fwspan("&nbsp;&nbsp;&nbsp;<em>q</em> = ##R1Q##<br/>") +
            fwspan("&nbsp;&nbsp;&nbsp;<em>n</em> = ##R1N##<br/>") +
            fwspan("&nbsp;&nbsp;&nbsp;<em>Φ</em> = ##R1PHI##<br/>") +
            fwspan("&nbsp;&nbsp;&nbsp;<em>e</em> = ##R1E##") +
            "<p>Unfortunately, ##NAME1## doesn't know how to compute the value of <em>d</em> " +
            "and needs you to do that final step for them.</p>";
        let question = this.getTemplatedQuestion(defaultQTemplate);
        if (this.state.name1 === undefined || this.state.name1 === "") {
            this.state.name1 = this.getRandomName();
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
    public genQuestionAnswer3(showanswers: boolean): JQuery<HTMLElement> {
        let result = $("<div>");
        let cellclass = "TOSOLVE";

        let answer = "";
        if (showanswers) {
            cellclass = "TOANSWER";
            answer = String(this.state.rsa1.d);
        }
        result.append(
            $("<div/>")
                .text("Enter the computed value of ")
                .append($("<em/>").text("d"))
                .append(", NOT the formula.")
        );

        let table = new JTTable({
            class: "ansblock shrink cell unstriped",
        });
        let row = table.addBodyRow();
        row.add({
            settings: {
                class: "v rsawide " + cellclass,
            },
            content: answer,
        });

        result.append(table.generate());
        return result;
    }
    public genSolution3(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append($("<h3/>").text("How to solve"));

        result.append(
            $("<div/>")
                .append("To compute <em>d</em> you need to use the  ")
                .append(
                    $("<a/>", {
                        href:
                            "https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm",
                    }).text("extended Euclidean Algorithm")
                )
                .append(
                    " with <em>e</em>=" +
                        this.state.rsa1.e +
                        " and Φ=" +
                        this.state.rsa1.phi
                )
        );
        result.append(
            this.genTalkativeModulerInverse(
                this.state.rsa1.e,
                this.state.rsa1.phi
            )
        );
        return result;
    }
    /**
     * Scenario 3 - Compute d given the other 5 values of the algorithm
     */
    public compute4(): void {
        let defaultQTemplate =
            "<p>##NAME2## and ##NAME1## are accountants for a very large bank, " +
            "and have started a friendship. They communicate via email, " +
            "because they live thousands of miles apart. " +
            "##NAME1## gets curious and asks ##NAME2## the year that they were born.  " +
            "##NAME2## doesn’t mind telling ##NAME1##, " +
            "but they know that the bank monitors all employee emails, " +
            "and is afraid of being the victim of age discrimination. " +
            "Therefore, ##NAME1## suggests that they use RSA, " +
            "and they provides their public key: (##R1N##, ##R1E##). " +
            "##NAME2## replies with the ciphertext ##ENCRYPTED##. " +
            "##NAME1##’s private key is ##R1D##. In what year was ##NAME2## born?</p>";
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
            this.state.year = getRandomIntInclusive(1950, 2000);
            do {
                this.state.rsa1 = this.CalculateRSA(this.state.digitsPrime);
            } while (this.state.rsa1.e <= this.state.year);
            this.state.encrypted = RSAEncrypt(
                this.state.year,
                this.state.rsa1.e,
                this.state.rsa1.n
            );
        }
        this.state.question = this.applyTemplate(question);
        this.updateQuestionsOutput();
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genQuestionAnswer4(showanswers: boolean): JQuery<HTMLElement> {
        let result = $("<div>");
        let cellclass = "TOSOLVE";

        let answer = "";
        if (showanswers) {
            cellclass = "TOANSWER";
            answer = String(this.state.year);
        }
        result.append($("<div/>").text("Enter the answer:"));

        let table = new JTTable({
            class: "ansblock shrink cell unstriped",
        });
        let row = table.addBodyRow();
        row.add({
            settings: {
                class: "v rsawide " + cellclass,
            },
            content: answer,
        });

        result.append(table.generate());
        return result;
    }
    public genSolution4(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append($("<h3/>").text("How to solve"));
        result.append(
            $("<p/>")
                .text("In order to decode, we need to use the function: ")
                .append(renderMath("{value}^d\\mod{n}"))
                .append(
                    ". Because of the size of the values, we have to use the "
                )
                .append(
                    $("<a/>", {
                        href:
                            "https://en.wikipedia.org/wiki/Modular_exponentiation",
                    }).text("Rapid Modular Exponentation")
                )
                .append(" method, also known as the ")
                .append(
                    $("<a/>", {
                        href:
                            "https://en.wikipedia.org/wiki/Exponentiation_by_squaring",
                    }).text("method of repeated squaring")
                )
                .append(".")
        );

        result.append(
            $("<p/>")
                .text(
                    "First we need to convert " +
                        this.state.name1 +
                        "'s private key "
                )
                .append($("<em>").text("d"))
                .append(
                    " to binary which will tell us how many operations we will need to do"
                )
        );
        result.append(
            this.genTalkativeModulerExponentiation(
                this.state.encrypted,
                this.state.rsa1.d,
                this.state.rsa1.n
            )
        );
        return result;
    }
    /**
     * Scenario 5 - Identify what needs to be transmitted for two computed keys
     * and provide the formula for decode/encode
     */
    public compute5(): void {
        if (this.state.qchoice === undefined) {
            this.state.qchoice = Math.floor(Math.random() * 8);
        }
        let qorder = this.state.qchoice % 2;
        let questionOpt = Math.floor(this.state.qchoice / 2) % 4;
        let defaultQTemplate =
            "<p>##NAME1## and ##NAME2## want to communicate with each other using RSA for encryption. " +
            "##NAME1## generates their RSA keys generating the following values:</p>" +
            this.getRSATemplate("R1", true) +
            "<p>Likewise, ##NAME2## also generates their RSA keys resulting in the values</p>" +
            this.getRSATemplate("R2", true) +
            "<p>What information do they need to transmit to each other in order to communicate?" +
            "<p>You must also determine what " +
            optRSA5TemplateOptStrings[questionOpt] +
            "</p>";
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
        this.state.combo = getRandomIntInclusive(
            (Math.pow(10, this.state.digitsCombo) - 1) / 9,
            Math.pow(10, this.state.digitsCombo) - 1
        );
        if (this.state.rsa1 === undefined) {
            this.state.rsa1 = this.CalculateRSA(this.state.digitsPrime);
        }
        if (this.state.rsa2 === undefined) {
            this.state.rsa2 = this.CalculateRSA(this.state.digitsPrime);
        }
        this.state.question = this.applyTemplate(question);
        this.updateQuestionsOutput();
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genQuestionAnswer5(showanswers: boolean): JQuery<HTMLElement> {
        let result = $("<div>");

        let qorder = this.state.qchoice % 2;
        let questionOpt = Math.floor(this.state.qchoice / 2) % 4;

        let cellclass = showanswers ? "TOANSWER" : "TOSOLVE";
        let formula = $("");
        let answers: string[][] = [["", "", ""], ["", "", ""]];

        let n1pos = 0;
        let n2pos = 1;
        let n1 =
            "Enter the minimum values that " +
            this.state.name1 +
            " need to transmit to " +
            this.state.name2 +
            ":";
        let n2 =
            "Enter the minimum values that " +
            this.state.name2 +
            " need to transmit to " +
            this.state.name1 +
            ":";
        if (qorder === 1) {
            // We need to swap the order of the names
            n1pos = 1;
            n2pos = 0;
            let x = n1;
            n1 = n2;
            n2 = x;
        }
        if (showanswers) {
            formula = $("<span/>").text(
                this.applyTemplate(optRSA5Formulas[questionOpt])
            );

            answers[n1pos] = [
                String(this.state.rsa1.n),
                String(this.state.rsa1.e),
                "",
            ];
            answers[n2pos] = [
                String(this.state.rsa2.n),
                String(this.state.rsa2.e),
                "",
            ];
        }
        result.append(this.genKeyBlock(n1, answers[0], showanswers));
        result.append(this.genKeyBlock(n2, answers[1], showanswers));
        result.append(
            $("<div/>").text(
                "Write the " +
                    this.applyTemplate(optRSA5TemplateOptStrings[questionOpt])
            )
        );

        result.append(
            $("<div/>", {
                class: "formulabox " + cellclass,
            }).append(formula)
        );
        return result;
    }
    public genSolution5(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append($("<h3/>").text("How to solve"));
        let qorder = this.state.qchoice % 2;
        let questionOpt = Math.floor(this.state.qchoice / 2) % 4;

        let div1 = $("<div/>").html(
            this.state.name1 +
                " needs to send only their public key" +
                " (<em>e</em>=" +
                this.state.rsa1.e +
                ", <em>n</em>=" +
                this.state.rsa1.n +
                ") to " +
                this.state.name2
        );
        let div2 = $("<div/>").html(
            this.state.name2 +
                " needs to send only their public key" +
                " (<em>e</em>=" +
                this.state.rsa2.e +
                ", <em>n</em>=" +
                this.state.rsa2.n +
                ") to " +
                this.state.name1
        );
        if (qorder === 0) {
            result.append(div1).append(div2);
        } else {
            result.append(div2).append(div1);
        }

        result.append(
            $("<div/>").html(
                this.applyTemplate(optRSA5TemplateAnswerStrings[questionOpt])
            )
        );

        return result;
    }

    /**
     * Create an answer block for a public/private key
     * @param answers Answers to populate the fields with
     * @param showanswers Are we showing the answers for an answerkey
     */
    public genKeyBlock(
        title: string,
        answers: string[],
        showanswers: boolean
    ): JQuery<HTMLElement> {
        let cellclass = showanswers ? "TOANSWER" : "TOSOLVE";
        let result = $("<div/>");
        result.append($("<div/>").text(title));
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
        return result;
    }

    /**
     * Show the math for the Modular Inverse
     * @param x Element
     * @param y Modulous
     * @param a1 a1
     * @param b1 b1
     * @param n1 n1
     * @param a2 a2
     * @param b2 b2
     * @param n2 n2
     * @param counter Which step we are on
     */
    public genTalkativeModularInverseStep(
        x: number,
        y: number,
        a1: number,
        b1: number,
        n1: number,
        a2: number,
        b2: number,
        n2: number,
        counter: number
    ): JQuery<HTMLElement> {
        let result = $("<div/>");
        let multiplier = Math.floor(n1 / n2);
        let equation_1 = "Equation_{" + String(counter + 1) + "}";
        let equation_2 = "Equation_{" + String(counter + 2) + "}";
        let equation_3 = "Equation_{" + String(counter + 3) + "}";

        result.append($("<h4/>").text("Step " + String(counter + 1) + "..."));
        result.append(
            $("<div/>").append(
                renderMath(
                    equation_3 +
                        "=" +
                        equation_1 +
                        "-" +
                        multiplier +
                        "*" +
                        equation_2
                )
            )
        );
        let a3 = a1 - a2 * multiplier;
        let b3 = b1 - b2 * multiplier;
        let n3 = n1 - n2 * multiplier;

        result.append(
            $("<div/>").append(
                renderMath(
                    equation_3 +
                        "=(" +
                        a1 +
                        "-" +
                        multiplier +
                        "*" +
                        a2 +
                        ") *" +
                        x +
                        "+(" +
                        b1 +
                        "-" +
                        multiplier +
                        "*" +
                        b2 +
                        ") *" +
                        y +
                        "=" +
                        n1 +
                        "-" +
                        multiplier +
                        "*" +
                        n2
                )
            )
        );

        result.append(
            $("<div/>").append(
                renderMath(
                    equation_3 +
                        "=" +
                        a3 +
                        "*" +
                        x +
                        "+" +
                        b3 +
                        "*" +
                        y +
                        "=" +
                        n3
                )
            )
        );
        if (n3 === 1) {
            let success = $("<div/>", {
                class: "callout success small",
            }).append($("<h3/>").text("Success!"));
            success.append(
                $("<div/>").text("Taking the result mod " + x + ":")
            );
            success.append(
                $("<div/>").append(
                    renderMath(a3 + "*" + "0+" + b3 + "*" + y + "=1")
                )
            );
            success.append($("<div/>").append(renderMath(b3 + "*" + y + "=1")));
            let normalized_b3 = b3 % x;
            if (normalized_b3 !== b3) {
                success.append(
                    $("<div/>").append(
                        renderMath(b3 + "\\mod{" + x + "}*" + y + "=1")
                    )
                );
                success.append(
                    $("<div/>").append(
                        renderMath(normalized_b3 + "*" + y + "=1")
                    )
                );
            }
            success.append(
                $("<h4/>").text(
                    "Hence " +
                        normalized_b3 +
                        " and " +
                        y +
                        " are inverses of each other"
                )
            );
            success.append($("<h3/>").text("Checking our work..."));
            success.append(
                $("<div/>").append(
                    renderMath(
                        "({" +
                            normalized_b3 +
                            "*" +
                            y +
                            "=" +
                            normalized_b3 * y +
                            "= 1 +" +
                            (normalized_b3 * y - 1) +
                            "= 1 + " +
                            (normalized_b3 * y - 1) / x +
                            "*" +
                            x +
                            "} \\mod{" +
                            x +
                            ")}= 1"
                    )
                )
            );
            result.append(success);
        } else if (n3 === 0) {
            result.append(
                $("<div/>", {
                    class: "callout error",
                }).text("Failure! " + y + " is not invertible mod " + x)
            );
        } else {
            result.append(
                this.genTalkativeModularInverseStep(
                    x,
                    y,
                    a2,
                    b2,
                    n2,
                    a3,
                    b3,
                    n3,
                    counter + 1
                )
            );
        }
        return result;
    }
    /**
     * Generates the math for a Modular Inverse
     * @param element Element to divide
     * @param modulus Modulus value
     */
    public genTalkativeModulerInverse(
        element: number,
        modulus: number
    ): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(
            $("<div/>").append(
                renderMath(
                    "Equation_{1}=1 * " +
                        String(modulus) +
                        "+ 0 * " +
                        String(element) +
                        " = " +
                        String(modulus)
                )
            )
        );
        result.append(
            $("<div/>").append(
                renderMath(
                    "Equation_{2}=0 * " +
                        String(modulus) +
                        "+ 1 * " +
                        String(element) +
                        " = " +
                        String(modulus)
                )
            )
        );
        result.append(
            this.genTalkativeModularInverseStep(
                modulus,
                element,
                1,
                0,
                modulus,
                0,
                1,
                element,
                0
            )
        );
        return result;
    }
    public genTalkativeModulerExponentiation(
        encrypted: number,
        d: number,
        mod: number
    ): JQuery<HTMLElement> {
        let result = $("<div/>");
        // Get us a binary string
        let binary = d.toString(2);
        result.append(
            $("<div/>").append(renderMath("d=" + d + "=binary(" + binary + ")"))
        );
        // Now reverse the string to be easier to work with
        binary = binary
            .split("")
            .reverse()
            .join("");
        let div = $("<div/>").text("We need to compute the following powers: ");
        let power = 1;
        let extra = "";
        for (let bit of binary.substr(0, binary.length - 1) + "2") {
            if (bit !== "0") {
                if (bit === "2") {
                    div.append(" and ");
                } else if (extra !== "") {
                    div.append(extra);
                }
                div.append(renderMath("{" + encrypted + "}^{" + power + "}"));
                extra = ", ";
            }
            power *= 2;
        }
        result.append(div);
        let powerval = 1;
        let rval = 1;
        power = 1;
        let first = true;
        for (let bit of binary) {
            if (power === 1) {
                powerval = encrypted;
                result.append(
                    result.append(
                        $("<div/>").append(
                            renderMath(
                                encrypted + "^{" + power + "}=" + encrypted
                            )
                        )
                    )
                );
            } else {
                let mult = powerval * powerval;
                let newpowerval = mult % mod;
                result.append(
                    result.append(
                        $("<div/>").append(
                            renderMath(
                                encrypted +
                                    "^{" +
                                    power +
                                    "}\\equiv " +
                                    powerval +
                                    "^2\\equiv{" +
                                    powerval +
                                    "^2}\\mod{" +
                                    mod +
                                    "}\\equiv " +
                                    mult +
                                    "\\mod{" +
                                    mod +
                                    "}\\equiv " +
                                    newpowerval
                            )
                        )
                    )
                );
                powerval = newpowerval;
            }
            if (bit === "1") {
                if (first) {
                    first = false;
                    rval = powerval;
                    result.append(
                        $("<div/>")
                            .append(
                                "Since this is the first powers we start our result: "
                            )
                            .append(renderMath("result=" + rval))
                    );
                } else {
                    let mult = rval * powerval;
                    let newrval = mult % mod;
                    result.append(
                        $("<div/>")
                            .append("We need this power, so accumulate it: ")
                            .append(
                                renderMath(
                                    "result=(" +
                                        rval +
                                        "*" +
                                        powerval +
                                        ")\\mod{" +
                                        mod +
                                        "}=" +
                                        mult +
                                        "\\mod{" +
                                        mod +
                                        "}=" +
                                        newrval
                                )
                            )
                    );
                    rval = newrval;
                }
            }
            power *= 2;
        }
        result.append(
            $("<div/>", {
                class: "callout success",
            }).text(
                "Since we have computed all the powers, we see that the result is " +
                    rval
            )
        );
        return result;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        super.attachHandlers();
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
        $("#digitsData")
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
