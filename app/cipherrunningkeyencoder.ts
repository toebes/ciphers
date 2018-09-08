import { toolMode } from "./cipherhandler";
import { CipherVigenereEncoder } from "./ciphervigenereencoder";
import { JTFIncButton } from "./jtfIncButton";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTRadioButton } from "./jtradiobutton";

/**
 *
 * Running Key Encoder
 *
 */
export class CipherRunningKeyEncoder extends CipherVigenereEncoder {
    activeToolMode: toolMode = toolMode.codebusters;
    usesRunningKey: boolean = true;
    getRunningKeyIndex(): number {
        // See if the current keyword is one of the valid options
        let runningKeys = this.getRunningKeyStrings();
        for (let entry in runningKeys) {
            if (runningKeys[entry].text === this.state.keyword) {
                return Number(entry);
            }
        }
        return -1;
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    updateOutput(): void {
        super.updateOutput();
        // See if the current keyword is one of the valid options
        let selopt = this.getRunningKeyIndex();
        if (selopt === -1) {
            // The current string isn't one of the options,
            // so we need to add it to the list of possibilities
            selopt = $("#runningkey option").length;
            $("#runningkey").append(
                $("<option />", { value: selopt }).text(this.state.keyword)
            );
        }
        $("#runningkey option[value=" + selopt + "]").attr(
            "selected",
            "selected"
        );
    }

    genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(this.genTestUsage());
        let runningKeys = this.getRunningKeyStrings();
        let radiobuttons = [
            { id: "wrow", value: "encode", title: "Encode" },
            { id: "mrow", value: "decode", title: "Decode" }
        ];
        result.append(
            JTRadioButton(6, "operation", radiobuttons, this.state.operation)
        );
        result.append(this.genQuestionFields());

        result.append(
            JTFLabeledInput(
                "Message",
                "text",
                "toencode",
                this.state.cipherString,
                "small-12 medium-12 large-12"
            )
        );

        let inputgroup = $("<div/>", {
            class: "input-group cell small-12 medium-12 large-12"
        });
        $("<span/>", { class: "input-group-label" })
            .text("title")
            .appendTo(inputgroup);
        let select = $("<select/>", {
            id: "runningkey",
            class: "lang input-group-field"
        });
        select.append(
            $("<option />", { value: "" }).text("--Select a Running Key--")
        );
        for (let entry in runningKeys) {
            select.append(
                $("<option />", { value: entry }).text(
                    runningKeys[entry].title +
                        " - " +
                        runningKeys[entry].text.substr(0, 50) +
                        "..."
                )
            );
        }
        inputgroup.append(select);
        result.append(inputgroup);
        let inputbox = $("<div/>", { class: "grid-x grid-margin-x blocksize" });
        inputbox.append(
            JTFIncButton("Block Size", "blocksize", this.state.blocksize, "")
        );
        result.append(inputbox);

        return result;
    }
    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    attachHandlers(): void {
        super.attachHandlers();
        $("#runningkey")
            .off("change")
            .on("change", e => {
                let selopt = Number($("#runningkey option:selected").val());
                let runningKeys = this.getRunningKeyStrings();
                if (selopt >= 0 && selopt < runningKeys.length) {
                    let keyword = runningKeys[selopt].text;
                    if (this.setKeyword(keyword)) {
                        this.updateOutput();
                    }
                }
            });
    }
    genAnswer(): JQuery<HTMLElement> {
        if (this.getRunningKeyIndex() === -1) {
            this.extraRunningKey = this.state.keyword;
        }
        return super.genAnswer();
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    genQuestion(): JQuery<HTMLElement> {
        if (this.getRunningKeyIndex() === -1) {
            this.extraRunningKey = this.state.keyword;
        }
        return super.genQuestion();
    }
}
