import { CipherTestManage } from "./ciphertestmanage";
import { toolMode, IState } from "../common/cipherhandler";
import { ITestState, IAnswerTemplate, ITestUser } from './ciphertest';
import { ICipherType } from "../common/ciphertypes";
import { cloneObject, timestampToISOLocalString, timestampMinutes, BoolMap, timestampForever } from "../common/ciphercommon";
import { JTButtonItem } from "../common/jtbuttongroup";
import { JTTable } from "../common/jttable";
import { ConvergenceDomain, RealTimeModel, ModelService, ModelPermissions, DomainUser, DomainUserType } from "@convergence/convergence";
import { JTFIncButton } from "../common/jtfIncButton";
import { JTFDialog } from "../common/jtfdialog";

/**
 * CipherTestScheduled
 *    This shows a list of all Scheduled tests.
 *    Each line has a line with buttons at the start
 *       <DELETE> <SAVE> Users assigned test, Start Time, Test Duration, Timed Duration
 */
export class CipherTestSchedule extends CipherTestManage {
    public activeToolMode: toolMode = toolMode.codebusters;
    public answerTemplate: IAnswerTemplate = undefined;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'Add One', color: 'primary', id: 'addsched' },
        { title: 'Propagate Time', color: 'primary', id: 'propsched' },
        { title: 'Import Schedule', color: 'primary', id: 'importsched' },
        { title: 'Save All', color: 'primary', id: 'savesched' },
        { title: 'Delete All', color: 'alert', id: 'delallsched' },
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
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return this.genPublishedEditState('schedule');
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        let result = $('<div/>', { class: 'testlist' });

        // First we need to get the test template from the testsource
        // Once we have the test template, then we will be able to find all the scheduled tests
        this.connectRealtime()
            .then((domain: ConvergenceDomain) => { this.openTestSource(domain, this.state.testID); });
        return result;
    }
    /**
     * 
     * @param domain Convergence Domain to query against
     * @param sourcemodelid Source test to open
     */
    private openTestSource(domain: ConvergenceDomain, sourcemodelid: string) {
        const modelService = domain.models();
        modelService.open(sourcemodelid)
            .then(realtimeModel => {
                let testmodelid = realtimeModel.root().elementAt("testid").value();
                let answermodelid = realtimeModel.root().elementAt("answerid").value();
                realtimeModel.close();
                this.findScheduledTests(modelService, testmodelid, answermodelid);
            })
            .catch(error => { this.reportFailure("Could not open model for " + sourcemodelid + " Error:" + error) });

    }
    public dateTimeInput(id: string, datetime: number): JQuery<HTMLElement> {
        // Alternative Date Time Input options:
        //   https://github.com/amsul/pickadate.js - 
        //   https://github.com/flatpickr/flatpickr - seems to be pretty good, but is picky about the time format
        //   https://www.jqueryscript.net/blog/best-date-time-picker.html - Survey of 10 of them
        let dateval = timestampToISOLocalString(datetime);
        // console.log("Date: " + datetime + " Maps to " + dateval);
        let result = $("<span/>")
            .append($("<input/>", { type: "datetime-local", id: id, step: 0, class: "datetimepick", value: dateval }));

        return result;
    }
    /**
     * Find all the tests scheduled for a given test template
     * @param modelService Domain Model service object for making requests
     * @param sourcemodelid 
     */
    public findScheduledTests(modelService: Convergence.ModelService, testmodelid: string, answermodelid: string) {
        modelService.query("SELECT * FROM codebusters_answers where testid='" + testmodelid + "'")
            .then(results => {
                let total = 0;
                let templatecount = 0;
                let table: JTTable = undefined
                results.data.forEach(result => {
                    let answertemplate = result.data as IAnswerTemplate;
                    if (result.modelId === answermodelid) {
                        templatecount++;
                        this.answerTemplate = answertemplate;
                    } else {
                        if (table === undefined) {
                            table = new JTTable({ class: 'cell shrink publist' });
                            let row = table.addHeaderRow();
                            row.add('Action')
                                .add('Takers').add('Start Time')
                                .add('Test Duration')
                                .add('Timed Question');
                        }
                        let eid = String(total);
                        let row = table.addBodyRow().attr({ id: "R" + eid, 'data-source': result.modelId });
                        let buttons = $('<div/>', { class: 'button-group round shrink' });
                        buttons.append(
                            $('<a/>', {
                                type: 'button',
                                class: 'pubdel alert button',
                            }).text('Delete')
                        );
                        buttons.append(
                            $('<a/>', {
                                type: 'button',
                                class: 'pubsave primary button',
                                id: "SV" + eid,
                                disabled: "disabled"
                            }).text('Save')
                        );
                        let userids = ["", "", ""];
                        for (let i in answertemplate.assigned) {
                            userids[i] = answertemplate.assigned[i].userid;
                        }
                        let testlength = Math.round((answertemplate.endtime - answertemplate.starttime) / timestampMinutes(1));
                        if (answertemplate.endtime === timestampForever) {
                            testlength = 0;
                        }
                        let timedlength = Math.round((answertemplate.endtimed - answertemplate.starttime) / timestampMinutes(1));
                        row.add(buttons)
                            .add($("<div>")
                                .append($("<input/>", { type: "text", id: "U0_" + eid, value: userids[0] }))
                                .append($("<input/>", { type: "text", id: "U1_" + eid, value: userids[1] }))
                                .append($("<input/>", { type: "text", id: "U2_" + eid, value: userids[2] })))
                            .add(this.dateTimeInput("S_" + eid, answertemplate.starttime))
                            .add(JTFIncButton("Test Duration", "D_" + eid, testlength, 'kval small-1'))
                            .add(JTFIncButton("Timed Limit", "T_" + eid, timedlength, 'kval small-1'));
                        // Keep track of how many entries we created so that they each have a unique id
                        total++;
                    }
                });
                // If we don't generate a table, we need to put something there to tell the user
                // that there are no tests scheduled.
                if (total === 0) {
                    $(".testlist").append(
                        $("<div/>", { class: "callout warning" }).text(
                            "No tests scheduled"
                        ));
                    if (templatecount === 0) {
                        this.reportFailure("Test Answer Template is missing");
                    }
                } else {
                    $(".testlist").append(table.generate());
                }
                this.attachHandlers();
            })
            .catch(error => { this.reportFailure("Convergence API could not query: " + error) });
    }
    /**
     * Makes a copy of the answer template and schedules a new test.
     */
    public copyAnswerTemplate() {
        this.connectRealtime()
            .then((domain: ConvergenceDomain) => {
                const modelService = domain.models();
                let starttime = Date.now();
                let newAnswerTemplate: IAnswerTemplate = {
                    testid: this.answerTemplate.testid,
                    starttime: starttime,
                    endtime: starttime + timestampMinutes(50),
                    endtimed: starttime + timestampMinutes(10),
                    assigned: [],
                    answers: this.answerTemplate.answers
                }
                modelService.openAutoCreate({
                    collection: "codebusters_answers",
                    overrideCollectionWorldPermissions: false,
                    data: newAnswerTemplate
                }).then((datamodel: RealTimeModel) => {
                    datamodel.close();
                    this.updateOutput();
                }).catch(error => { this.reportFailure("Could not autocreate: " + error) });
            });
    }
    /**
     * 
     * @param modelService Domain Model service object for making requests
     * @param modelid 
     */
    private doDeletePublished(modelService: ModelService, modelid: string) {
        modelService.remove(modelid)
            .catch(error => { this.reportFailure("Could not remove " + modelid + " " + error) });
    }
    /**
     * This prompts a user and then deletes all ciphers
     */
    public gotoDeleteAllScheduled(): void {
        $("#okdelall")
            .off("click")
            .on("click", e => {
                this.connectRealtime().then((domain: ConvergenceDomain) => {
                    const modelService = domain.models();
                    $('tr[id^="R"]').each((i, elem) => {
                        let modelid = $(elem).attr('data-source');
                        this.doDeletePublished(modelService, modelid);
                        $(elem).remove();
                    });
                    this.updateOutput();
                });
                $("#delalldlg").foundation("close");
            });
        $("#okdelall").removeAttr("disabled");
        $("#delalldlg").foundation("open");
    }
    /**
     * 
     * @param id Which button was clicked on
     */
    public setChanged(id: string) {
        $("#SV" + id).removeAttr("disabled");
    }
    /**
     * Save a scheduled test
     * @param eid Row ID to save
     * @param testid Model to save it do
     */
    public saveScheduled(eid: string, testid: string) {
        let userlist: string[] = [];
        let name1 = $("#U0_" + eid).val() as string;
        let name2 = $("#U1_" + eid).val() as string;
        let name3 = $("#U2_" + eid).val() as string;
        if (name1 !== "") {
            userlist.push(name1);
        }
        if (name2 !== "") {
            userlist.push(name2);
        }
        if (name3 !== "") {
            userlist.push(name3);
        }
        let testStart = $("#S_" + eid).val() as string;
        let testDuration = $("#D_" + eid).val() as number;
        let timedDuration = $("#T_" + eid).val() as number;
        let starttime = Date.parse(testStart);
        let endtime = starttime + timestampMinutes(testDuration);
        if (testDuration === 0) {
            endtime = timestampForever;
        }
        let endtimed = starttime + timestampMinutes(timedDuration);
        $("#SV" + eid).attr("disabled", "disabled");

        this.connectRealtime().then((domain: ConvergenceDomain) => {
            const modelService = domain.models();
            this.saveAnswerTemplate(modelService, testid, userlist, starttime, endtime, endtimed);
        });
    }
    /**
     * 
     * tually it looks like the create user one is a POST:
     * <server>/api/rest/domains/convergence/scienceolympiad/users
     * and the POST payload looks like a DomainUser  {displayname: <name>, email: <email>, firstName: <fname>, lastName: <lname>, password: <pw>, username: <username>}
     * @param modelService Domain Model service object for making requests
     * @param userid User to ensure exists
     */
    public ensureUsersExist(modelService: ModelService, userids: string[]): JQuery.jqXHR<any> {
        // TODO: Figure out how we can return the resolved promise when they call us with an empty list
        // (which means nothing to do)
        // https://stackoverflow.com/questions/5316697/jquery-return-data-after-ajax-call-success/5316805#5316805
        // if (userids.length <= 0) {
        //     // If we are called with nothing to do, just resolve the promise cleanly
        //     let result: JQuery.jqXHR<any>;
        //     let foo = result.promise();
        //     foo.resolve()
        //     // (function (resolve, reject) {
        //     //     resolve;
        //     // });
        //     // return promise;
        // }
        //

        let userid = userids.pop();
        let newUser = {
            displayName: userid,
            email: userid,
            firstName: "First",
            lastName: "Last",
            username: userid,
        }
        if (userids.length > 0) {
            let promise = this.ensureUsersExist(modelService, userids)
                .catch((e: any) => { return promise; })
        }
        return $.ajax({ method: "POST", url: "xxx", data: newUser });
    }
    /**
     * Update the permissions on a model entry
     * @param modelService Domain Model service object for making requests
     * @param modelid ID of model
     * @param toremove List of users to remove access for
     * @param toadd List of users to add access for
     */
    public saveUserPermissions(modelService: ModelService, modelid: string, toremove: string[], toadd: string[]) {
        let permissionManager = modelService.permissions(modelid);
        permissionManager.getAllUserPermissions().then(allPermissions => {
            let toCheck: string[] = [];
            // first go through the ones to remove
            for (let userid of toremove) {
                if (allPermissions.has(userid)) {
                    let permit: ModelPermissions = allPermissions.get(userid);
                    // They must be able to read/write but not remove/manage if it is a user
                    if (permit.read && permit.write && !permit.remove && !permit.manage) {
                        allPermissions.delete(userid);
                    }
                }
            }
            for (let userid of toadd) {
                if (!allPermissions.has(userid)) {
                    toCheck.push(userid);
                    allPermissions.set(userid, ModelPermissions.fromJSON({ read: true, write: true, remove: false, manage: false }));
                }
            }
            // For now we have to make sure we dont' call ensureUsersExist with zero entries
            if (toadd.length < 0) {  // Temporarily disable calling
                this.ensureUsersExist(modelService, toadd).then(() => {
                    // We have updated the permissions, so save it back.
                    permissionManager.setAllUserPermissions(allPermissions)
                        .catch(error => { this.reportFailure("Unable to set model permissions: " + error) });
                })
            } else {
                permissionManager.setAllUserPermissions(allPermissions)
                    .catch(error => { this.reportFailure("Unable to set model permissions: " + error) });
            }
        }).catch(error => { this.reportFailure("Could not get model permissions: " + error) });
    }
    /**
     * Update an existing test to set the list of users, and the test times.  We need to remember who was
     * on the test previously and remove them
     * @param modelService Domain Model service object for making requests
     * @param modelid ID of model to save
     * @param userlist Array of users to associate with the test
     * @param starttime Start time for the scheduled test
     * @param endtime End time for the scheduled test
     * @param endtimed End of the timed question bonus
     */
    public saveAnswerTemplate(modelService: ModelService, modelid: string, userlist: string[], starttime: number, endtime: number, endtimed: number) {
        let usermap: BoolMap = {};
        for (let user of userlist) {
            usermap[user] = true;
        }
        modelService.open(modelid).then((datamodel: RealTimeModel) => {
            datamodel.elementAt("starttime").value(starttime);
            datamodel.elementAt("endtime").value(endtime);
            datamodel.elementAt("endtimed").value(endtimed);
            let removed: string[] = [];
            let added: string[] = [];
            let assigned: ITestUser[] = datamodel.elementAt("assigned").value();

            for (let i in assigned) {
                let assignee = assigned[i];
                let userid = "";
                if (Number(i) < userlist.length) {
                    userid = userlist[i];
                }
                if (assignee.userid !== userid) {
                    // We have a change...Make sure we aren't just changing users around
                    if (!usermap[assignee.userid]) {
                        removed.push(assignee.userid);
                    }
                    assignee.userid = userid;
                }
                if (userid !== "") {
                    added.push(userid);
                }
            }
            // Add any users not already on the list
            for (let i = assigned.length; i < userlist.length; i++) {
                assigned.push({ userid: userlist[i], displayname: userlist[i], starttime: 0, idletime: 0, confidence: 0, notes: "", sessionid:"" });
                if (userlist[i] !== "") {
                    added.push(userlist[i]);
                }
            }
            // And save out the data model
            datamodel.elementAt("assigned").value(assigned);
            datamodel.close();
            // Reset the permissions on the model.  Remove anyone who was taken off and add anyone
            this.saveUserPermissions(modelService, modelid, removed, added);
            this.saveUserPermissions(modelService, this.answerTemplate.testid, [], added);
        }).catch(error => { this.reportFailure("Could not open model to save: " + error) });
    }
    /**
     * Request to delete a single scheduled test after confirming from the user that they really want to do it.
     * @param id Which row to delete from
     * @param modelid Model to be deleted
     */
    public deleteScheduled(id: string, modelid: string) {
        $("#okdelsched")
            .off("click")
            .on("click", e => {
                this.connectRealtime().then((domain: ConvergenceDomain) => {
                    const modelService = domain.models();
                    this.doDeletePublished(modelService, modelid);
                    $("tr#R" + id).remove();
                    if ($('tr[id^="R"]').length === 0) {
                        this.updateOutput();
                    }
                });
                $("#delscheddlg").foundation("close");
            });
        $("#okdelsched").removeAttr("disabled");
        $("#delscheddlg").foundation("open");
    }
    /**
     * Create the hidden dialog for confirming deletion of all scheduled tests
     * @returns HTML DOM element for dialog
     */
    private createDeleteAllDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout alert",
        }).text(
            "This will delete all scheduled tests, even if they have already been taken.  Are you sure you want to do this?"
        );
        let DeleteAllDlg = JTFDialog(
            "delalldlg",
            "Delete all Scheduled Tests",
            dlgContents,
            "okdelall",
            "Yes, Delete them!"
        );
        return DeleteAllDlg;
    }
    /**
     * Create the hidden dialog for confirming deletion of all scheduled tests
     * @returns HTML DOM element for dialog
     */
    private createDeleteScheduledDlg(): JQuery<HTMLElement> {
        let dlgContents = $("<div/>", {
            class: "callout alert",
        }).text(
            "This will delete the scheduled test, even if it has already been taken.  Are you sure you want to do this?"
        );
        let DeleteTestDlg = JTFDialog(
            "delscheddlg",
            "Delete Scheduled Test",
            dlgContents,
            "okdelsched",
            "Yes, Delete it!"
        );
        return DeleteTestDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     * @returns DOM element to put at the top
     */
    public createMainMenu(): JQuery<HTMLElement> {
        let result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result
            .append(this.createDeleteAllDlg())
            .append(this.createDeleteScheduledDlg());
        return result;
    }
    /**
     * Locate the row id for an element.  This looks for the ID of the containing TR
     * @param elem element to get information for
     * @returns row ID
     */
    public getRowID(elem: JQuery<HTMLElement>): string {
        let tr = elem.closest("tr");
        let id = tr.attr("id") as string;
        return id.substr(1);
    }
    /**
     * Locate the model id for an element.  This looks for the data-source attribute of the containing TR
     * @param elem element to get information for
     * @returns model id stored on the TR element
     */
    public getModelID(elem: JQuery<HTMLElement>): string {
        let tr = elem.closest("tr");
        let id = tr.attr("data-source") as string;
        return id;
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $("#addsched")
            .off('click')
            .on('click', () => {
                this.copyAnswerTemplate();
            });
        $("#delallsched")
            .off('click')
            .on('click', () => {
                this.gotoDeleteAllScheduled();
            })
        $('input[id^="D_"]')
            .off('input')
            .on('input', e => {
                this.setChanged(this.getRowID($(e.target)));
                let newval: number = Number($(e.target).val());
                if (newval < 0) {
                    $(e.target).val(0);
                }
            });
        $('input[id^="T_"]')
            .off('input')
            .on('input', e => {
                this.setChanged(this.getRowID($(e.target)));
                let newval: number = Number($(e.target).val());
                if (newval < 0) {
                    $(e.target).val(0);
                }
            });
        $('input[id^="U"]')
            .off('input')
            .on('input', e => {
                this.setChanged(this.getRowID($(e.target)));
            });
        $(".pubsave")
            .off('click')
            .on('click', e => {
                this.saveScheduled(this.getRowID($(e.target)), this.getModelID($(e.target)));
            })
        $(".pubdel")
            .off('click')
            .on('click', e => {
                this.deleteScheduled(this.getRowID($(e.target)), this.getModelID($(e.target)));
            })
        // $(".datetimepick").each((i, elem) => {
        //     let x = flatpickr(elem, {
        //         altInput: true,
        //         enableTime: true,
        //         dateFormat: "M j, Y H:i",
        //         minDate: "today",
        //         allowInput: true,
        //     })
        // });
    }
}
