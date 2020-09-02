import { CipherTestManage } from "./ciphertestmanage";
import { toolMode, IState, menuMode } from "../common/cipherhandler";
import { ITestState } from './ciphertest';
import { ICipherType } from "../common/ciphertypes";
import { cloneObject } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTTable } from "../common/jttable";
import { ConvergenceDomain, ModelPermissions } from "@convergence/convergence";

/**
 * CipherTestPublished
 *    This shows a list of permissions for a test
 *    Each line has a line with buttons at the start
 *       <DELETE> <userid>  <Permissions>
 */
export class CipherTestPermissions extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Add Permission', color: 'primary', id: 'addperm' },
        { title: 'Save', color: 'primary', id: 'saveperm' },
        { title: 'Reset', color: 'primary', id: 'resetperm' },
    ];
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState): void {
        let curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        this.setUIDefaults();
        this.updateOutput();
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        $('.testlist').each((i, elem) => {
            $(elem).replaceWith(this.genTestList());
        });
        this.attachHandlers();
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genPublishedEditState('permissions');
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'testlist' });
        let table = new JTTable({ class: 'cell shrink testlist permlist' });
        let row = table.addHeaderRow();
        row.add('Action')
            .add('Userid')
            .add('Permissions');
        result.append(table.generate());

        this.connectRealtime()
            .then((domain: ConvergenceDomain) => {
                this.findPermissions(domain, this.state.testID);
            });
        return result;
    }
    /**
     * Find all the test sources on the server
     * @param domain Convergence Domain to query against
     */
    private findPermissions(domain: ConvergenceDomain, testid: string) {
        const modelService = domain.models();
        let permissionManager = modelService.permissions(testid);
        permissionManager.getWorldPermissions()
            .then(worldPermissions => {
                this.addPermissions(0, undefined, worldPermissions);
            })
            .catch(error => { this.reportFailure("getWorldPermissions for " + testid + " returned Error:" + error) });
        let slot = 1;
        permissionManager.getAllUserPermissions()
            .then(permissions => {
                permissions.forEach((permissionset, user) => {
                    this.addPermissions(slot, user, permissionset);
                    slot++;
                })
            })
            .catch(error => { this.reportFailure("getAllUserPermissions for " + testid + " returned Error:" + error) });
    }
    /**
     * Create a labeled input field
     * @param title Title for the input field
     * @param id HTML ID to associate with the field
     * @param checked Checked or not
     */
    private makeInputField(title: string, id: string, checked: boolean): JQuery<HTMLElement> {
        let result = $("<span/>");
        if (checked) {
            result.append($("<input/>", { type: "checkbox", id: id, name: title, checked: "checked" }))
        } else {
            result.append($("<input/>", { type: "checkbox", id: id, name: title }))
        }
        result.append($("<label/>", { for: id }).text(title));
        return result;

    }
    /**
     * Add/replace a test entry to the table for the permissions of a particular user.
     * @param user 
     * @param permissionset 
    */
    public addPermissions(slot: number, user: string, permissionset: ModelPermissions) {
        let id = user;
        let idbase = String(slot);
        let userfield: JQuery<HTMLElement>;
        if (user === undefined) {
            id = "_WORLD";
            userfield = $("<b/>").text("WORLD");
        } else {
            userfield = $("<input/>", { id: "U" + idbase, value: user, type: "text" })
        }
        let tr = $("<tr/>", { 'data-id': slot });
        let buttons = $('<div/>', { class: 'button-group round shrink' });
        buttons.append(
            $('<a/>', {
                'data-id': slot,
                type: 'button',
                class: 'pubdel alert button',
            }).text('Delete')
        );

        tr.append($("<td/>").append($('<div/>', { class: 'grid-x' }).append(buttons)))
            .append($("<td/>").append(userfield));
        tr.append($("<td/>")
            .append(this.makeInputField("read", "R" + idbase, permissionset.read))
            .append(this.makeInputField("write", "W" + idbase, permissionset.write))
            .append(this.makeInputField("remove", "X" + idbase, permissionset.remove))
            .append(this.makeInputField("manage", "M" + idbase, permissionset.manage)))

        var curtr = $('tr[data-id="' + slot + '"]');
        if (curtr.length > 0) {
            curtr.replaceWith(tr);
        } else {
            $(".permlist").append(tr);
        }
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
    }
}
