import { CipherTestManage } from './ciphertestmanage';
import { toolMode, IState } from '../common/cipherhandler';
import { globalPermissionId, IRealtimeMetaData, ITestState, RealtimePermissionSet, RealtimeSinglePermission } from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import { cloneObject, makeCallout } from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTTable } from '../common/jttable';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { ConvergenceDomain, ModelPermissions, ModelService } from '@convergence/convergence';
import { JTFDialog } from '../common/jtfdialog';

/**
 * CipherTestPermissions
 *    This shows a list of permissions for a test
 *    Each line has a line with buttons at the start
 *       <DELETE> <userid>  <Permissions>
 */
export class CipherTestPermissions extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;
    public currentuser: string;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Add Permission', color: 'primary', id: 'addperm', class: 'pi' },
        { title: 'Save', color: 'primary', id: 'saveperm', class: 'pi', disabled: true },
        { title: 'Reset', color: 'primary', id: 'resetperm', class: 'pi', disabled: true },
    ];
    sourceMetadata: IRealtimeMetaData;

    // If you don't have manage permissions, than this is a view only interface!
    // You also can't delete manage permissions for yourself (otherwise it could lead to something that nobody can fix)

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
        result.append(JTFLabeledInput("Title", "readonly", "title", "", "small-12 medium-12 large-12"));
        return result;
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        this.isModified = false;
        this.currentuser = this.getConfigString('userid', '');
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
                    this.sourceMetadata = metadata;
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
                let hasManagePermission = false
                if (worldPermissions !== undefined)
                    this.addPermissions(undefined, worldPermissions);

                for (let key in permissionset) {
                    if (key !== globalPermissionId) {
                        this.addPermissions(key, permissionset[key]);
                        if (!key.localeCompare(this.currentuser) && permissionset[key].manage) {
                            hasManagePermission = true
                        }
                    }
                }
                // Make sure that they have permission to manage the test.
                if (!hasManagePermission) {
                    $(".pi").attr("disabled", "disabled");
                    $(".testlist").append(makeCallout($('<h3/>').text('You do not have permission to manage this test.')));
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
                $('<input/>', { type: 'checkbox', id: id, name: title, checked: 'checked', class: 'pi' })
            );
        } else {
            result.append($('<input/>', { type: 'checkbox', id: id, name: title, class: 'pi' }));
        }
        result.append($('<label/>', { for: id }).text(title));
        return result;
    }
    /**
     * Add/replace a test entry to the table for the permissions of a particular user.
     * @param user
     * @param permissionset
     */
    public addPermissions(user: string, permissionset: RealtimeSinglePermission): void {

        let slot = 0;
        const lastid = $('.permlist tr:last').attr('data-id');
        if (lastid === undefined) {
            slot = 0;
        } else {
            slot = Number(lastid) + 1;
        }
        const idbase = String(slot);
        let userfield: JQuery<HTMLElement>;
        let isworld = false;
        let isSelf = false;
        if (user === undefined) {
            userfield = $('<b/>').text('WORLD');
            user = "WORLD";
            isworld = true
        } else {
            isSelf = !user.localeCompare(this.currentuser);
            userfield = $('<input/>', { id: 'U' + idbase, value: user, type: 'text', class: 'pi' });
            if (isSelf) {
                userfield.attr('disabled', 'disabled');
            }
        }
        const tr = $('<tr/>', { 'data-id': slot });
        const buttons = $('<div/>', { class: 'button-group round shrink' });
        if (!isworld && !isSelf) {
            buttons.append(
                $('<a/>', {
                    'data-id': slot,
                    type: 'button',
                    class: 'pubdel alert button pi',
                }).text('Delete')
            );
        }

        tr.append($('<td/>').append($('<div/>', { class: 'grid-x' }).append(buttons))).append(
            $('<td/>').append(userfield)
        );
        let managecheck = this.makeInputField('manage', 'M' + idbase, permissionset.manage);
        const readcheck = this.makeInputField('read', 'R' + idbase, permissionset.read);
        let removecheck = this.makeInputField('remove', 'X' + idbase, permissionset.remove);
        if (isSelf) {
            readcheck.children().attr("disabled", "disabled");
            managecheck.children().attr("disabled", "disabled");
        }
        if (isworld) {
            removecheck = $("<span/>");
            managecheck = $("<span/>");
        }
        tr.append(
            $('<td/>')
                .append(readcheck)
                .append(this.makeInputField('write', 'W' + idbase, permissionset.write))
                .append(removecheck)
                .append(managecheck)
        );

        const curtr = $('tr[data-id="' + slot + '"]');
        if (curtr.length > 0) {
            curtr.replaceWith(tr);
        } else {
            $('.permlist').append(tr);
        }
        this.attachHandlers();
    }
    /**
     * Remove a permission from the UI
     * @param slot Which permission slot to delete
     */
    public deletePermissions(slot: Number): void {
        let row = document.querySelector('tr[data-id="' + slot + '"]');
        if (row !== null) {
            row.remove();
        }
    }
    /**
     * Retrieve the permissions for a user from the UI
     * @param slot Which slot to get permissions for
     * @returns The set of permission bits associated with that slot
     */
    public getSlotPermissions(slot: Number): RealtimeSinglePermission {
        let permission: RealtimeSinglePermission = { read: false, write: false, remove: false, manage: false }
        let slotStr = String(slot);
        // Now we get the permissions
        // Read and Write are on everything
        const uread = document.getElementById("R" + slotStr)
        if (!!uread) {
            permission.read = (<HTMLInputElement>uread).checked;
        }
        const uwrite = document.getElementById("W" + slotStr)
        if (!!uwrite) {
            permission.write = (<HTMLInputElement>uwrite).checked;
        }
        if (slot > 0) {
            // Remove and Manage only are for the non global entries
            const uremove = document.getElementById("X" + slotStr)
            if (!!uremove) {
                permission.remove = (<HTMLInputElement>uremove).checked;
            }
            const umanage = document.getElementById("M" + slotStr)
            if (!!umanage) {
                permission.manage = (<HTMLInputElement>umanage).checked;
            }
        }
        return permission
    }
    /**
     * Save all the permissions
     */
    public savePermissions(): void {
        // First we need to get all the permissions that they have requested in the UI
        // Figure out how many entries we have to work with
        let desiredPermissions: RealtimePermissionSet = {}
        $(".ans").empty();
        const lastid = $('.permlist tr:last').attr('data-id');
        let changed = false;
        let lastslot = 0
        if (lastid !== undefined) {
            lastslot = Number(lastid);
        }
        // Go through all the entries
        for (let slot = 0; slot <= lastslot; slot++) {
            // Get the userid associated with the entry
            let userid = globalPermissionId;
            if (slot > 0) {
                const uinput = document.getElementById("U" + String(slot));
                if (!!uinput) {
                    userid = (<HTMLInputElement>uinput).value;
                    if (userid === "") {
                        this.reportFailure('Unable to save: Userid can not be blank')
                        return;
                    }
                    if (desiredPermissions[userid] !== undefined) {
                        this.reportFailure('Unable to save: "' + userid + '" is in the permissions list twice')
                        return
                    }
                    if (!this.isValidEmailAddress(userid)) {
                        this.reportFailure('Unable to save: "' + userid + '" is not a valid email address')
                        return;
                    }
                }
            }
            desiredPermissions[userid] = this.getSlotPermissions(slot);
        }
        // Updating permissions requires multiple updates
        // 1) Get the permissions from the current source model and figure out who we are adding/deleting.
        // 2) Make updates to the source model
        // 3) Make the same updates to the test model
        // 4) Make the same updates to the Answer template model
        // 5) Find all the corresponding test models and make the same updates.
        // public getRealtimePermissions(id: modelID): Promise<RealtimePermissionSet> {
        // public updateRealtimePermissions(
        //     id: modelID,
        //     user: string,
        //     permissions: RealtimeSinglePermission
        // ): Promise<boolean> {
        this.getRealtimePermissions(this.state.testID).then((permissionset: RealtimePermissionSet) => {
            const emptyPermissions: RealtimeSinglePermission = { read: false, write: false, remove: false, manage: false };
            // Make sure that they didn't delete themself
            const selfperm = desiredPermissions[this.currentuser];
            if (selfperm === undefined || selfperm.manage === false || selfperm.read === false) {
                this.reportFailure('Unable to save: You must have manage and read permission for yourself <' + this.currentuser + '>');
                return;
            }

            for (const key in permissionset) {
                const wanted = desiredPermissions[key];
                if (wanted === undefined) {
                    // They delete permissions for this entry, so we will need to make it empty too
                    changed = true;
                    permissionset[key] = emptyPermissions;
                } else {
                    // See if any permissions changed
                    if (wanted.manage != permissionset[key].manage ||
                        wanted.read != permissionset[key].read ||
                        wanted.write != permissionset[key].write ||
                        wanted.remove != permissionset[key].remove) {
                        permissionset[key] = wanted;
                        changed = true
                    } else {
                        // Nothing changed so we don't need to update the permissions for this entry
                        delete permissionset[key];
                    }
                    // We have processed that permission, so we don't need to add it 
                    delete desiredPermissions[key];
                }
            }
            // Now go through the permissions that weren't in the existing entry and add them
            for (const key in desiredPermissions) {
                permissionset[key] = desiredPermissions[key]
                changed = true
            }
            if (!changed) {
                this.reportFailure('No change in permissions, nothing updated');
                return;
            }
            // Ok we now have the permissionset that we want to set on the models. Let's go through and set them
            this.updateModelsPermissions(permissionset, this.state.testID, this.sourceMetadata.testid, this.sourceMetadata.answerid);
        }).catch((error) => {
            this.reportFailure(
                'getRealtimePermissions for ' + this.state.testID + ' returned Error:' + error
            );
        });
    }
    /**
     * Update permissions on all the realtime server models.  Note that this routine is recursive, going
     * through all three models and then advancing on to handle all the answer models in a different routine
     * @param permissionset changed Permissions to set on the models
     * @param sourceid Source model id
     * @param testid test model id
     * @param answerid answer model id
     */
    public updateModelsPermissions(permissionset: RealtimePermissionSet, sourceid: string, testid: string, answerid: string) {
        // Figure out what model we are going to work from
        let model = sourceid;
        sourceid = undefined;  // Take the source model off the list to work on
        if (model === undefined) {
            model = testid;
            testid = undefined; // Take the test model off the list to work on
            if (model === undefined) {
                model = answerid;
                answerid = undefined; // Take the answer template off the list to work on
                if (model === undefined) {
                    // All three models have been done, so let's get the answer models done
                    this.setAnswerModelPermissions(permissionset, this.sourceMetadata.testid);
                    return;
                }
            }
        }
        // We have a model. Set the permissions on it
        this.updateSingleModelPermissions(permissionset, model).then(() => {
            // Once we are done, we go on to handle the next model
            this.updateModelsPermissions(permissionset, sourceid, testid, answerid)
        }
        ).catch((error) => {
            this.reportFailure(
                'Setting Model Permissions for ' + model + ' returned Error:' + error
            )
        });
    }
    /**
     * Update the permissions on all of the test models
     * @param permissionset changed Permissions to set on the models
     * @param testid The test model that the answers reference
     */
    public setAnswerModelPermissions(permissionset: RealtimePermissionSet, testid: string) {
        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            const modelService = domain.models();
            modelService
                .query("SELECT testid FROM codebusters_answers where testid='" + testid + "'")
                .then((results) => {
                    results.data.forEach((result) => {
                        this.updateConvergencePermissions(modelService, result.modelId, permissionset)
                            .catch((error) => {
                                this.reportFailure(
                                    'Setting Model Permissions for ' + result.modelId + ' returned Error:' + error
                                )
                            });
                    })
                    this.setModified(false);
                })

        });
    }
    /**
     * Update the modified tracking so the UI can respond to show what can be done
     * @param modified New modified state
     */
    public setModified(modified: boolean) {
        if (this.isModified != modified) {
            this.isModified = modified;
            if (this.isModified) {
                $("#resetperm").removeAttr("disabled");
                $("#saveperm").removeAttr("disabled");
            } else {
                $("#resetperm").attr("disabled", "disabled");
                $("#saveperm").attr("disabled", "disabled");
            }
        }
    }
    /**
     * Update a single convergence based answer model
     * @param modelService 
     * @param modelId 
     * @param permissionset 
     */
    public async updateConvergencePermissions(modelService: ModelService, modelId: string, permissionset: RealtimePermissionSet) {
        const permissionManager = modelService.permissions(modelId)
        let changed = false;
        let userpermissions = await permissionManager.getAllUserPermissions();
        for (const user in permissionset) {
            let newpermissions = permissionset[user];
            let update = true
            if (userpermissions.has(user)) {
                const permit: ModelPermissions = userpermissions.get(user);
                // If we take away all of their permissions then delete the user from the permission set
                if (newpermissions.read == false &&
                    newpermissions.write == false &&
                    newpermissions.manage == false &&
                    newpermissions.remove == false) {
                    userpermissions.delete(user);
                    update = false
                    changed = true;
                } else if (permit.read == newpermissions.read &&
                    permit.write == newpermissions.write &&
                    permit.manage == newpermissions.manage &&
                    permit.remove == newpermissions.remove) {
                    // The permissions didn't change so we can just leave it as is
                    update = false;
                }
            }
            if (update) {
                changed = true;
                userpermissions.set(user, ModelPermissions.fromJSON({
                    read: newpermissions.read,
                    write: newpermissions.write,
                    remove: newpermissions.remove,
                    manage: newpermissions.manage,
                }))
            }
        }
        if (changed) {
            await permissionManager.setAllUserPermissions(userpermissions);
        }
    }
    /**
     * setSingleModelPermissions updates the permissions for a single model
     * @param permissionset changed Permissions to set on the models
     * @param model Id of model to update permissions for
     */
    public async updateSingleModelPermissions(permissionset: RealtimePermissionSet, model: string) {
        for (const user in permissionset) {
            await this.updateRealtimePermissions(model, user, permissionset[user])
        }
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('.pubdel')
            .off('click')
            .on('click', (e) => {
                this.deletePermissions(Number($(e.target).attr('data-id')));
                this.setModified(true);
            });
        $("#resetperm")
            .off('click')
            .on('click', (e) => {
                location.reload();
            });
        $("#addperm")
            .off('click')
            .on('click', (e) => {
                const permissions: RealtimeSinglePermission = { read: true, write: true, remove: false, manage: false };
                this.addPermissions("", permissions)
                this.setModified(true);
            });
        $("#saveperm")
            .off('click')
            .on('click', (e) => {
                this.savePermissions()
            });
        $('input[id^="U"]')
            .off('input')
            .on('input', (e) => {
                // Check to see if the email address is valid
                const elem = $(e.target);
                const email = elem.val() as string;
                this.setModified(true);

                if (this.isValidEmailAddress(email)) {
                    elem.removeClass("bademail").removeAttr('title')
                } else {
                    elem.addClass("bademail")
                }
            });
    }
}
