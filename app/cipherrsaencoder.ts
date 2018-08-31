import {
    cloneObject,
    NumberMap,
    renderMath,
    setCharAt,
    StringMap,
} from "./ciphercommon";
import { CipherEncoder, IEncoderState } from "./cipherencoder";
import { toolMode } from "./cipherhandler";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";
import { gcd, getRandomIntInclusive, getRandomPrime } from "./mathsupport";

interface IRSAState extends IEncoderState {
    /** How wide a line can be before wrapping */
    linewidth?: number;
    digitsPrime?: number;
    digitsCombo?: number;
    p?: number;
    q?: number;
    combo?: number;
    n?: number;
    phi?: number;
    e?: number;
    name1?: string;
    name2?: string;
    d?: number;
}
/**
 * CipherBaconianEncoder - This class handles all of the actions associated with encoding
 * a Baconian cipher.
 */
export class CipherRSAEncoder extends CipherEncoder {
    activeToolMode: toolMode = toolMode.codebusters;
    defaultstate: IRSAState = {
        cipherString: "",
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
                "small-12 medium-12 large-12"
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
        this.state.p = undefined;
        this.state.q = undefined;
    }
    public compute1(): void {
        //     digits_for_primes = slider(2, 10, 1, 3, label = "Digits for Primes"),
        //     digits_for_combo = slider(2, 6, 1, 4, label = "Digits for Combination"),
        if (this.state.name1 === undefined || this.state.name1 === "") {
            this.state.name1 = "Billy";
        }
        if (this.state.name2 === undefined || this.state.name2 === "") {
            this.state.name2 = "Elon";
        }
        if (this.state.p === undefined || this.state.q === undefined) {
            this.state.p = getRandomPrime(this.state.digitsPrime);
            this.state.q = getRandomPrime(this.state.digitsPrime);
            this.state.combo = getRandomIntInclusive(
                (Math.pow(10, this.state.digitsCombo) - 1) / 9,
                Math.pow(10, this.state.digitsCombo) - 1
            );
            while (this.state.p === this.state.q) {
                this.state.q = getRandomPrime(this.state.digitsPrime);
            }
            this.state.n = this.state.p * this.state.q;
            this.state.phi = (this.state.p - 1) * (this.state.q - 1);
            this.state.e = getRandomIntInclusive(3, this.state.n - 1);
            while (gcd(this.state.e, this.state.phi) !== 1) {
                this.state.e = getRandomIntInclusive(3, this.state.phi);
            }
            this.state.d = 0;
            // this.state.d = inverse_mod(my_e, phi)
        }
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer1(): JQuery<HTMLElement> {
        let result = $("<div>");
        if (this.state.combo > this.state.n) {
            result.append(
                $("<div/>", { class: "callout error" }).text(
                    "The combination is smaller than N. Please pick a smaller combo or larger primes"
                )
            );
            return result;
        }

        result.append(
            $("<div/>").text(
                this.state.name1 +
                    "has faithfully followed the steps of the RSA key-generation algorithm."
            )
        );
        result.append($("<div/>").text("Here are the results:"));
        let math =
            "\\begin{aligned}" +
            "p &=" +
            this.state.p +
            "\\\\" +
            "q &=" +
            this.state.q +
            "\\\\" +
            "N &=" +
            this.state.n +
            "\\\\" +
            "phi &=" +
            this.state.phi +
            "\\\\" +
            "e &=" +
            this.state.e +
            "\\\\" +
            "d &=" +
            this.state.d +
            "\\end{aligned}";

        result.append(renderMath(math));

        result.append(
            $("<div/>").text(
                "As it comes to pass, " +
                    this.state.name2 +
                    " is on vacation in Hawaii, and " +
                    this.state.name1 +
                    " needs a document that is stored in the company safe." +
                    " They are communicating via email, and both know it is very unwise" +
                    " to trust the security of computers in a hotel lobby." +
                    this.state.name1 +
                    " needs to tell " +
                    this.state.name2 +
                    " his/her public key, knowing well" +
                    " that it can be read by untrustworthy parties. Which numbers does " +
                    this.state.name1 +
                    " email to " +
                    this.state.name2 +
                    "? " +
                    "Write the numbers below. You will not" +
                    " get any points if you omit one or more needed numbers, nor will you" +
                    "get any points if you include any extraneous numbers."
            )
        );

        result.append(
            $("<div/>", { class: "TOANSWER" }).text(
                this.state.n + ", " + this.state.e
            )
        );
        result.append($("<div/>").html("<em>(order does not matter)</em>"));

        result.append(
            $("<div/>").text(
                "Now " +
                    this.state.name2 +
                    " wants to transmit the (encrypted) combination to the safe" +
                    " in the response email, encrypted with RSA. The combination is" +
                    this.state.combo +
                    "." +
                    "What should " +
                    this.state.name2 +
                    " compute in order to" +
                    " know what the ciphertext is? (Write a formula with numbers below." +
                    "Don't compute the final answer, which would be very difficult by hand.)"
            )
        );
        result.append(
            $("<div/>", {
                class: "TOANSWER",
            }).text(
                this.state.combo + " ^ " + this.state.e + " mod " + this.state.n
            )
        );
        return result;
    }

    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQuery<HTMLElement> {
        let result = $("<div>");
        if (this.state.operation === "rsa1") {
            return this.genAnswer1();
        }
        result.append($("<h3/>").text("Not yet implemented"));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQuery<HTMLElement> {
        let result = $("<div>");
        result.append($("<h3/>").text("Not yet implemented"));
        return result;
    }
    public genSolution(): JQuery<HTMLElement> {
        let result = $("<div/>");
        if (this.state.operation === "words") {
            result.append($("<h3/>").text("Not yet implemented"));
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
            .on("click", e => {
                this.markUndo(null);
                this.recalcData();
                this.updateOutput();
            });
    }
}
