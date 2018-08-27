import { cloneObject, NumberMap, setCharAt, StringMap } from "./ciphercommon";
import { CipherEncoder, IEncoderState } from "./cipherencoder";
import { ICipherType } from "./ciphertypes";
import { JTButtonItem } from "./jtbuttongroup";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton, JTRadioButtonSet } from "./jtradiobutton";
import { JTTable } from "./jttable";

interface IRSAState extends IEncoderState {
    /** How wide a line can be before wrapping */
    linewidth?: number;
}
/**
 * CipherBaconianEncoder - This class handles all of the actions associated with encoding
 * a Baconian cipher.
 */
export class CipherRSAEncoder extends CipherEncoder {
    defaultstate: IRSAState = {
        cipherString: "",
        cipherType: ICipherType.RSA,
        offset: 1,
        /** The type of operation */
        operation: "let4let",
        linewidth: this.maxEncodeWidth
    };
    state: IRSAState = cloneObject(this.defaultstate) as IRSAState;
    cmdButtons: JTButtonItem[] = [
        { title: "Save", color: "primary", id: "save" },
        this.undocmdButton,
        this.redocmdButton
    ];
    setUIDefaults(): void {
        super.setUIDefaults();
        this.setOperation(this.state.operation);
    }
    setLineWidth(linewidth: number): boolean {
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
    updateOutput(): void {
        $(".opfield").hide();
        $("." + this.state.operation).show();
        JTRadioButtonSet("operation", this.state.operation);
        super.updateOutput();
    }
    /**
     * Initializes the encoder.
     */
    init(lang: string): void {
        super.init(lang);
    }
    getEncodeWidth(): number {
        let linewidth = this.maxEncodeWidth;
        if (this.state.operation !== "words") {
            linewidth = this.state.linewidth;
        }
        return linewidth;
    }
    build(): JQuery<HTMLElement> {
        return this.genAnswer();
    }
    /**
     * Loads up the values for the encoder
     */
    load(): void {
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

    genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(this.genTestUsage());

        let radiobuttons = [
            { id: "wrow", value: "let4let", title: "Letter for letter" },
            { id: "mrow", value: "sequence", title: "Sequence" },
            { id: "mrow", value: "words", title: "Words" }
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
                "Line Width",
                "linewidth",
                this.state.linewidth,
                "small-12 medium-6 large-6  opfield let4let sequence"
            )
        );

        return result;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    genAnswer(): JQuery<HTMLElement> {
        let result = $("<div>");
        result.append($("<h3/>").text("Not yet implemented"));
        return result;
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    genQuestion(): JQuery<HTMLElement> {
        let result = $("<div>");
        result.append($("<h3/>").text("Not yet implemented"));
        return result;
    }
    genSolution(): JQuery<HTMLElement> {
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
    attachHandlers(): void {
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
    }
}
