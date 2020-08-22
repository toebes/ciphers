import { CipherHandler, ITestType, IState } from "../common/cipherhandler";
import { JTTable } from "../common/jttable";
import { IEncoderState } from "./cipherencoder";
import { cloneObject } from "../common/ciphercommon";

export class InteractiveEncoder extends CipherHandler {
    public restore(data: IEncoderState): void {
        this.state = cloneObject(this.defaultstate) as IState;
        this.setSourceCharset(data.sourceCharset);
        this.copyState(this.state, data);
        // this.setUIDefaults();
        // this.updateOutput();
    }

    /**
     * Generate the HTML to display the interactive form of the cipher
     */
    public genInteractive(qnum: number, testType: ITestType): JQuery<HTMLElement> {
        let qnumdisp = qnum + 1
        let idclass = "I" + qnumdisp + "_";
        let result = $('<div/>');
        let width = this.maxEncodeWidth;
        let pos = 0;
        let extraclass = '';
        if (testType === ITestType.aregional) {
            width -= 20;
            extraclass = ' atest';
        }

        let table = new JTTable({ class: "SOLVER" });

        for (let linestr of this.state.testLines) {
            let qrow = table.addBodyRow()
            let arow = table.addBodyRow()
            for (let c of linestr) {
                qrow.add({ settings: { class: "TOSOLVEC" }, content: c });
                if (this.isValidChar(c)) {
                    arow.add($("<input/>", {
                        id: idclass + pos,
                        class: "awc",
                        type: "text",
                    }))
                } else {
                    arow.add("")
                }
                pos++;
            }
        }
        result.append(table.generate());
        result.append(this.genInteractiveFreqTable(qnum, this.state.encodeType, extraclass));
        result.append($("<textarea/>", { class: "intnote" }))
        return result;
    }

    public attachInteractivehandlers() {
        super.attachInteractivehandlers();
    }
}