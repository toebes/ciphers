import { CipherTestManage } from './ciphertestmanage';
import { toolMode, IState } from '../common/cipherhandler';
import { globalPermissionId, ITestState, RealtimePermissionSet, RealtimeSinglePermission } from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import { cloneObject, makeCallout } from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { JTFLabeledInput } from '../common/jtflabeledinput';

/**
 * CipherTestPermissions
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
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        let result = $("<div/>");
        result.append(this.genPublishedEditState('permissions'));
        result.append(JTFLabeledInput("Title", "readonly", "title", "", "small-12 medium-12 large-12"))
        return result;
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });
        if (this.state.testID === undefined) {
            result.append(makeCallout($('<h3/>').text('No test id was provided to set permissions for.')));
            return;
        }
        if (this.confirmedLoggedIn(' in order to see tests on the interactive server.', result)) {
            const table = new JTTable({ class: 'cell shrink permlist' });
            const row = table.addHeaderRow();
            row.add('Action')
                .add('Userid')
                .add('Permissions');
            result.append(table.generate());
            this.getRealtimeElementMetadata('sourcemodel', this.state.testID)
                .then((metadata) => {
                    $("#title").text(metadata.title);
                })
            this.findPermissions(this.state.testID);
        }
        return result;
    }
    /**
     * Find all the test sources on the server
     * @param domain Convergence Domain to query against
     */
    private findPermissions(testid: string): void {
        this.getRealtimePermissions(testid)
            .then((permissionset: RealtimePermissionSet) => {
                const worldPermissions = permissionset[globalPermissionId];
                if (worldPermissions !== undefined)
                    this.addPermissions(0, undefined, worldPermissions);

                let slot = 1;
                for (let key in permissionset) {
                    if (key !== globalPermissionId) {
                        this.addPermissions(slot, key, permissionset[key]);
                        slot++;
                    }
                }
            })
            .catch((error) => {
                this.reportFailure(
                    'getRealtimePermissions for ' + testid + ' returned Error:' + error
                );
            });
    }
    /**
     * Create a labeled input field
     * @param title Title for the input field
     * @param id HTML ID to associate with the field
     * @param checked Checked or not
     */
    private makeInputField(title: string, id: string, checked: boolean): JQuery<HTMLElement> {
        const result = $('<span/>');
        if (checked) {
            result.append(
                $('<input/>', { type: 'checkbox', id: id, name: title, checked: 'checked' })
            );
        } else {
            result.append($('<input/>', { type: 'checkbox', id: id, name: title }));
        }
        result.append($('<label/>', { for: id }).text(title));
        return result;
    }
    /**
     * Add/replace a test entry to the table for the permissions of a particular user.
     * @param user
     * @param permissionset
     */
    public addPermissions(slot: number, user: string, permissionset: RealtimeSinglePermission): void {
        // let id = user;
        const idbase = String(slot);
        let userfield: JQuery<HTMLElement>;
        if (user === undefined) {
            // id = '_WORLD';
            userfield = $('<b/>').text('WORLD');
        } else {
            userfield = $('<input/>', { id: 'U' + idbase, value: user, type: 'text' });
        }
        const tr = $('<tr/>', { 'data-id': slot });
        const buttons = $('<div/>', { class: 'button-group round shrink' });
        buttons.append(
            $('<a/>', {
                'data-id': slot,
                type: 'button',
                class: 'pubdel alert button',
            }).text('Delete')
        );

        tr.append($('<td/>').append($('<div/>', { class: 'grid-x' }).append(buttons))).append(
            $('<td/>').append(userfield)
        );
        tr.append(
            $('<td/>')
                .append(this.makeInputField('read', 'R' + idbase, permissionset.read))
                .append(this.makeInputField('write', 'W' + idbase, permissionset.write))
                .append(this.makeInputField('remove', 'X' + idbase, permissionset.remove))
                .append(this.makeInputField('manage', 'M' + idbase, permissionset.manage))
        );

        const curtr = $('tr[data-id="' + slot + '"]');
        if (curtr.length > 0) {
            curtr.replaceWith(tr);
        } else {
            $('.permlist').append(tr);
        }
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
    }
}
