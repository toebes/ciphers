import { CipherTestManage } from './ciphertestmanage';
import { toolMode, IState, CipherHandler } from '../common/cipherhandler';
import { ITestState, IAnswerTemplate, ITestUser, RealtimeSinglePermission, SourceModel } from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import {
    cloneObject,
    timestampFromMinutes,
    BoolMap,
    timestampForever,
    makeFilledArray,
    timestampToFriendly,
    makeCallout,
    timestampFromWeeks,
} from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTRow, JTTable } from '../common/jttable';
import { ConvergenceDomain, RealTimeModel, ModelService, ModelPermissions } from '@convergence/convergence';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFDialog } from '../common/jtfdialog';

import flatpickr from "flatpickr";
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { EnsureUsersExistParameters } from './api';

import * as XLSX from 'xlsx';

/**
 * CipherTestScheduled
 *    This shows a list of all Scheduled tests.
 *    Each line has a line with buttons at the start
 *       <DELETE> <SAVE> Users assigned test, Start Time, Test Duration, Timed Duration, team name, team type
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
        { title: 'Import Schedule', color: 'primary', id: 'importsched' },
        { title: 'Reschedule All', color: 'primary', id: 'propsched' },
        { title: 'Save All', color: 'primary', id: 'savesched', disabled: true },
        { title: 'Delete All', color: 'alert', id: 'delallsched' },
        { title: 'Fix Permissions', color: 'primary', id: 'fixpermissions' },
    ];

    public testmodelid = undefined;

    constructor() {
        super();
    }

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
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
        let result = this.genPublishedEditState('schedule');
        result.append(JTFLabeledInput("Title", "text", "title", "", "small-12 medium-12 large-12"))
        return result;
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });

        if (this.state.testID === undefined) {
            result.append(
                makeCallout($('<h3/>').text('No test id was provided to check schedule for.'))
            );
            return result;
        }

        if (this.confirmedLoggedIn(' in order to see tests assigned to you.', result)) {
            // First we need to get the test template from the testsource
            // Once we have the test template, then we will be able to find all the scheduled tests
            this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
                const modelService = domain.models();
                this.openTestSource(modelService, this.state.testID);
            });
        }
        return result;
    }
    /**
     * openTestSource gets the test information and queues finding the scheduled tests
     * @param domain Convergence Domain to query against
     * @param sourcemodelid Source test to open
     */
    private openTestSource(modelService: ModelService, sourcemodelid: string): void {
        this.getRealtimeElementMetadata('sourcemodel', sourcemodelid)
            .then((metadata) => {
                const testmodelid = metadata.testid;
                this.testmodelid = testmodelid;
                $("#title").val(metadata.title);
                this.getRealtimeAnswerTemplate(metadata.answerid).then((answertemplate) => {
                    this.answerTemplate = answertemplate;
                    this.findScheduledTests(modelService, testmodelid, metadata.answerid);
                });
            })
            .catch((error) => {
                this.reportFailure('Could not open model for ' + sourcemodelid + ' Error:' + error);
            });
    }
    /**
     * setTitle updates the title on a source model associated with the current test
     * @param title New title to apply to the model
     */
    public setTitle(title: string) {
        // Make sure we actually have a model we can work with
        if (this.state.testID !== undefined && this.state.testID !== "") {
            // Get the model
            this.getRealtimeSource(this.state.testID).then((model: SourceModel) => {
                // Update the title with what we have it changed to
                model.source.title = title;
                // And then save it
                this.saveRealtimeSource(model, this.state.testID).then(() => {
                    // For good measure, just check to see that the metadata also got updated
                    this.getRealtimeElementMetadata('sourcemodel', this.state.testID)
                        .then((metadata) => {
                            // Hmm something went wrong, report it so we can fix it
                            if (metadata.title !== title) {
                                console.log("***Title metadata did not update.  Expected '" + title + "' but got '" + metadata.title + '"')
                            }
                        })
                }).catch((error) => { this.reportFailure("Error setting title:" + error) })
            }).catch((error) => { this.reportFailure("Error reading model:" + error) })
        }
    }

    /**
     * dateTimeInput creates an input field that allows the user to enter a date/time value
     * @param id ID for the input field to create
     * @param datetime Date/time value to initialize the field with
     * @returns HTML Element for the created field
     */
    public dateTimeInput(id: string, datetime: number): JQuery<HTMLElement> {
        const dateval = new Date(datetime).toISOString();
        const result = $('<span/>').append(
            $('<input/>', {
                type: 'datetime-local',
                id: id,
                step: 0,
                class: 'datetimepick',
                value: dateval,
            })
        );
        return result;
    }
    /**
     * createTestTable creates the test table for displaying all active tests
     */
    private createTestTable(): JTTable {
        const table = new JTTable({ class: 'cell shrink publist' });
        const row = table.addHeaderRow();
        row.add('Action')
            .add('Takers')
            .add('Start Time')
            .add('Test Duration')
            .add('Timed Question')
            .add('Team Name')
            .add('Team Type');
        return table;
    }
    /**
     * populateRow populates a JTRow object to insert into the table
     * @param row Row item to populate
     * @param rowID ID for the row (may be blank)
     * @param answerModelID ID for the stored answer model
     * @param answertemplate Contents for the answer
     */
    private populateRow(row: JTRow, rownum: number, answerModelID: string, answertemplate: IAnswerTemplate): void {
        const rowID = String(rownum);
        row.attr({ id: 'R' + rowID, 'data-source': answerModelID });
        const buttons = $('<div/>', { class: 'button-group round shrink' });
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
                id: 'SV' + rowID,
                disabled: 'disabled',
            }).text('Save')
        );
        const userids = ['', '', ''];
        for (const i in answertemplate.assigned) {
            userids[i] = answertemplate.assigned[i].userid;
        }
        let testlength = Math.round(
            (answertemplate.endtime - answertemplate.starttime) / timestampFromMinutes(1)
        );
        if (answertemplate.endtime === timestampForever) {
            testlength = 0;
        }
        const timedlength = Math.round(
            (answertemplate.endtimed - answertemplate.starttime) / timestampFromMinutes(1)
        );
        row.add(buttons)
            .add(
                $('<div>')
                    .append($('<input/>', { type: 'text', id: 'U0_' + rowID, value: userids[0] }))
                    .append($('<input/>', { type: 'text', id: 'U1_' + rowID, value: userids[1] }))
                    .append($('<input/>', { type: 'text', id: 'U2_' + rowID, value: userids[2] }))
            )
            .add(this.dateTimeInput('S_' + rowID, answertemplate.starttime))
            .add(JTFIncButton('Test Duration', 'D_' + rowID, testlength, 'kval small-1'))
            .add(JTFIncButton('Timed Limit', 'T_' + rowID, timedlength, 'kval small-1'))
            .add($('<input/>', { type: 'text', id: 'N_' + rowID, value: answertemplate.teamname }))
            .add($('<input/>', { type: 'text', id: 'C_' + rowID, value: answertemplate.teamtype }));
    }
    /**
     * findScheduledTests finds all the tests scheduled for a given test template and populates the UI with them
     * @param modelService Domain Model service object for making requests
     * @param testmodelid Test model to find tests for
     * @param answertempateid Answer template to ignore (shouldn't be found)
     */
    public findScheduledTests(modelService: ModelService, testmodelid: string, answertempateid: string): void {
        modelService
            .query(
                "SELECT assigned,starttime,endtimed,endtime,teamname,teamtype FROM codebusters_answers where testid='" +
                testmodelid +
                "'"
            ) // This stays using convergence
            .then((results) => {
                let total = 0;
                results.data.forEach((result) => {
                    const answertemplate = result.data as IAnswerTemplate;
                    if (result.modelId !== answertempateid) {
                        this.addUITestEntry(result.modelId, answertemplate);
                        // Keep track of how many entries we created
                        total++;
                    }
                });
                // If we don't generate a table, we need to put something there to tell the user
                // that there are no tests scheduled.
                if (total === 0) {
                    $('.testlist').append(
                        $('<div/>', { class: 'callout warning' }).text('No tests scheduled')
                    );
                }
                this.attachHandlers();
            })
            .catch((error) => {
                this.reportFailure('Convergence API could not query: ' + error);
            });
    }
    /**
     * addSingleScheduledTest adds an entry to schedule a new blank test with no assigned to it.
     */
    public addSingleScheduledTest(): void {
        const now = Date.now()
        const answertemplate: IAnswerTemplate = {
            testid: "",
            starttime: now,
            endtime: now + timestampFromMinutes(50),
            endtimed: now + timestampFromMinutes(10),
            answers: [],
            assigned: [],
            teamname: "",
            teamtype: ""
        }
        // Create an entry, mark it as changed and dirty
        const newRowID = this.addUITestEntry("", answertemplate)
        this.setChanged(newRowID);
        this.setDirty(newRowID);
        this.attachHandlers();
        // Now that it is added, queue the process to save everything marked dirty
        this.saveAllDirty();
    }
    /**
     * Makes a copy of the answer template and schedules a new test.
     * Note that if there are any users put on the test, it is the responsibility of the caller
     * to set permissions on the test model.  We can't do it in this routine because it
     * might be called in a loop and you run into synchronization issues with multiple threads
     * trying to update the permissions.
     * @param modelService Domain Model service object for making requests
     * @param userlist List of users to assign to the test
     * @param starttime timestamp Start time for the test
     * @param endtime timestamp End time for the test
     * @param endtimed timestamp End of the timed interval for the test
     * @param teamname Name of the team/school
     * @param teamtype Type of team (Varsity, JV, etc)
     * @returns Promise of new modelid on completion
     */
    public copyAnswerTemplate(modelService: ModelService,
        userlist: string[],
        starttime: number,
        endtime: number,
        endtimed: number,
        teamname: string,
        teamtype: string): Promise<string> {
        // Build an answer template to store in the model
        const answerTemplate: IAnswerTemplate = {
            testid: this.testmodelid,
            starttime: starttime,
            endtime: endtime,
            endtimed: endtimed,
            assigned: [],
            teamname: teamname,
            teamtype: teamtype,
            answers: this.answerTemplate.answers,
        };
        for (const userid of userlist) {
            const userinfo: ITestUser = {
                userid: userid,
                displayname: '',
                starttime: 0,
                idletime: 0,
                confidence: [],
                notes: '',
                sessionid: '',
            };
            answerTemplate.assigned.push(userinfo);
        }
        return new Promise((resolve, reject) => {
            // Let the system create the model and assign an id for us
            modelService
                .openAutoCreate({
                    collection: 'codebusters_answers',
                    overrideCollectionWorldPermissions: false,
                    data: answerTemplate,
                })
                .then((datamodel: RealTimeModel) => {
                    // Success, so get the id, close the model and return it
                    const modelid = datamodel.modelId();
                    datamodel.close();
                    resolve(modelid);
                })
                .catch((error) => { reject(error); });
        })
    }
    /**
     * deleteFirstEntry finds the first entry and deletes the corresponding model from the server.
     * Once the delete is complete, it processes the next entry.
     * @param modelService Domain Model service object for making requests
     */
    public deleteFirstEntry(modelService: ModelService): void {
        const rows = $('tr[id^="R"]')
        if (rows.length > 0) {
            const tr = $(rows[0])
            const modelid = tr.attr('data-source') as string;
            const rowid = (tr.attr('id') as string).substr(1);

            this.showDelete(modelService, modelid, rowid).then(() => {
                tr.remove();
                setTimeout(() => { this.deleteFirstEntry(modelService) }, 100);
            }).catch((error) => {
                this.reportFailure('Could not remove ' + modelid + ' ' + error);
            });
        } else {
            this.updateOutput();
        }
    }
    /**
     * gotoDeleteAllScheduled prompts a user and then deletes all scheduled tests
     */
    public gotoDeleteAllScheduled(): void {
        $('#okdelall')
            .off('click')
            .on('click', () => {
                this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
                    const modelService = domain.models();
                    this.deleteFirstEntry(modelService);
                });
                $('#delalldlg').foundation('close');
            });
        $('#okdelall').removeAttr('disabled');
        $('#delalldlg').foundation('open');
    }
    /**
     * fixPermissions fixes the permissions for a single model
     * @param modelService Domain Model service object for making requests
     * @param eid entry id to get data for
     * @param modelid Model id to set permissions on
     * @returns Array of strings corresponding to users added
     */
    public fixPermissions(modelService: ModelService, eid: string, modelid: string): Promise<void> {
        let name1 = $('#U0_' + eid).val() as string;
        let name2 = $('#U1_' + eid).val() as string;
        let name3 = $('#U2_' + eid).val() as string;
        name1 = name1.trim();
        name2 = name2.trim();
        name3 = name3.trim();

        const added: string[] = [];

        if (name1 !== '') {
            added.push(name1);
        }
        if (name2 !== '') {
            added.push(name2);
        }
        if (name3 !== '') {
            added.push(name3);
        }
        return this.saveUserPermissions(modelService, modelid, [], added);
    }
    /**
     * Fix the permissions for all scheduled tests.
     */
    public fixAllPermissions(): void {
        $('.pubsave').attr('data-permissions', '1');
        this.fixDirtyPermissions();
    }
    /**
     * fixDirtyPermissions saves the permissions for all models which have been marked to save
     */
    public fixDirtyPermissions() {
        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            const modelService = domain.models();
            this.fixFirstDirtyPermissions(modelService);
        });
    }

    public fixFirstDirtyPermissions(modelService: ModelService): void {
        let tosave = $('.pubsave[data-permissions]');
        if (tosave.length > 0) {
            const elem = $(tosave[0]);
            const rowid = this.getRowID(elem);
            const modelid = this.getModelID(elem)
            this.fixPermissions(modelService, rowid, modelid).then(() => {
                setTimeout(() => { this.fixFirstDirtyPermissions(modelService) }, 100);
            }).catch((error) => {
                this.reportFailure("Error saving permissions for " + modelid + " :" + error)
            })
        } else {
            this.saveTestModelPermissions();
        }
    }
    /**
     * setChanged marks a row as changed so that the save button can be clicked by the user
     * @param id Which button was clicked on
     */
    public setChanged(id: string): void {
        const siblings = $('#SV' + id).closest("tr").find(".bademail")
        if (siblings.length === 0) {
            $('#SV' + id).removeAttr('disabled');
            $('#savesched').removeAttr('disabled');
        }
    }
    /**
     * setDirty marks a row as dirty so that it will be processed to save
     * @param id Which row to mark
     */
    public setDirtyPermission(id: string): void {
        $('#SV' + id).attr('data-permissions', '1');
    }
    /**
     * setDirty marks a row as dirty so that it will be processed to save
     * @param id Which row to mark
     */
    public setDirty(id: string): void {
        $('#SV' + id).attr('data-dirty', '1');
    }
    /**
     * Save a scheduled test
     * @param eid Row ID to save
     */
    public saveScheduled(eid: string): void {
        this.setDirty(eid);
        this.saveAllDirty();
    }
    /**
     * saveAnswerSlot saves a scheduled test from the UI.  If the model doesn't already exist, a new one will be created
     *  and the UI will be updated to reflect the new model id
     * @param modelService model service to use for operations
     * @param eid Row ID to save
     * @param testid Model to save it do
     * @returns Promise on success/failure
     */
    public saveAnswerSlot(modelService: ModelService, eid: string, testid: string): Promise<void> {
        // Grab all the information from the UI for this row
        const userlist: string[] = [];
        const name1 = ($('#U0_' + eid).val() as string).trim();
        const name2 = ($('#U1_' + eid).val() as string).trim();
        const name3 = ($('#U2_' + eid).val() as string).trim();

        if (name1 !== '') {
            userlist.push(name1);
        }
        if (name2 !== '') {
            userlist.push(name2);
        }
        if (name3 !== '') {
            userlist.push(name3);
        }
        const now = Date.now();
        const teamname = $('#N_' + eid).val() as string;
        const teamtype = $('#C_' + eid).val() as string;
        const testStart = $('#S_' + eid).val() as string;
        let testDuration = $('#D_' + eid).val() as number;
        let timedDuration = $('#T_' + eid).val() as number;
        let starttime = Date.parse(testStart);
        // If they try to schedule it more than three weeks in the figure, just back it up to half an hour from now
        if (starttime > (now + timestampFromWeeks(3))) {
            starttime = now + timestampFromMinutes(30)
        }
        // If they give us a test duration that is too big or small, limit them to
        // four days.
        if (testDuration < 0 || testDuration > 60 * 24 * 4) {
            testDuration = 60 * 24 * 4;
        }
        let endtime = starttime + timestampFromMinutes(testDuration);
        if (testDuration === 0) {
            endtime = timestampForever;
        }
        // Likewise make sure that the timed interval is no more than a couple of hours.
        if (timedDuration > 60 * 2 || timedDuration < 0) {
            timedDuration = 10;
        }
        const endtimed = starttime + timestampFromMinutes(timedDuration);

        if (testid === "") {
            return new Promise((resolve, reject) => {
                // We need to create a new one and get a new model id
                this.copyAnswerTemplate(modelService, userlist, starttime, endtime, endtimed, teamname, teamtype)
                    .then((modelid) => {
                        // Successful, so we need to remember the modelid in the UI
                        const tr = $('#SV' + eid).closest('tr');
                        tr.attr('data-source', modelid);
                        resolve();
                    }).catch((error) => { reject(error); });
            })
        } else {
            // Updating an existing one, so just let the save process run on it
            return this.saveAnswerTemplate(modelService, testid, userlist, starttime, endtime, endtimed, teamname, teamtype);
        }
    }
    /**
     * saveOneScheduled finds the first unsaved entry and saves it.  When it is complete saving that
     * one model it sets a timeout to run the next one.
     * @param modelService model service to use for operations
     */
    public saveDirty(modelService: ModelService): void {
        let tosave = $('.pubsave[data-dirty]');
        console.log('saveOneScheduled count=' + tosave.length)
        if (tosave.length > 0) {
            let elem = tosave[0]
            // Temporarily change the save button to indicate that we are saving and
            // disable it so it can't be clicked again
            $(elem).removeClass("primary")
                .removeAttr("data-dirty")
                .addClass("warning")
                .text("Saving...")
                .attr('disabled', 'disabled')
            this.saveAnswerSlot(modelService, this.getRowID($(elem)), this.getModelID($(elem)))
                .then(() => {
                    // Clean up the UI 
                    $(elem).removeClass("warning")
                        .addClass("primary")
                        .text("Save");
                    setTimeout(() => { this.saveDirty(modelService) }, 100);
                })
                .catch((error) => {
                    $(elem).removeClass("warning")
                        .addClass("primary")
                        .text("Save")
                    this.reportFailure("Error saving :" + error);
                    setTimeout(() => { this.saveDirty(modelService) }, 100);
                });
        } else {
            this.saveTestModelPermissions();
        }
    }
    /**
     * SaveAllDirty saves all entries which have been marked as dirty
     */
    public saveAllDirty() {
        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            const modelService = domain.models();
            this.saveDirty(modelService);
        });
    }
    /**
     * saveAllScheduled saves all unsaved scheduled tests.  This is done
     * by triggering a timed process that saves eacn unsaved entry one at a time and then
     * updates the permissions when it is all complete
     */
    public saveAllScheduled(): void {
        // Mark everything unsaved as dirty
        $('.pubsave:not([disabled])').attr('data-dirty', '1');
        $('#savesched').attr('disabled', 'disabled');
        this.saveAllDirty();
    }

    /**
     * Propagate the time from the first test to all the other tests
     */
    public propagateSchedule(): void {
        $('#okprop')
            .removeAttr('disabled')
            .off('click')
            .on('click', () => {
                $('#propscheddlg').foundation('close');
                // First get the starting times.  It will be the first row
                if ($('#S_0').length > 0) {
                    // Get the starting times
                    const starttime = $('#S_0').val() as string;
                    const duration = $('#D_0').val() as number;
                    const timed = $('#T_0').val() as number;
                    // Find all of the time fields on the page
                    $('input[id^="T_"]').each((_i, elem) => {
                        // parse out what row it is
                        const rowid = this.getRowID($(elem));
                        // Technically we don't have to check for the first row, but we know
                        // we aren't going to update it so save some time
                        if (rowid !== '0') {
                            // Get the current values on the row
                            const rowstarttime = $('#S_' + rowid).val() as string;
                            const rowduration = $('#D_' + rowid).val() as number;
                            const rowtimed = $('#T_' + rowid).val() as number;
                            // See if any of the times are different
                            if (
                                rowstarttime !== starttime ||
                                rowduration !== duration ||
                                rowtimed !== timed
                            ) {
                                // We have times different, so update them
                                $('#S_' + rowid).val(starttime);
                                $('#D_' + rowid).val(duration);
                                $('#T_' + rowid).val(timed);
                                // And mark that we changed it
                                this.setChanged(rowid);
                            }
                        }
                    });
                }
            });
        // Put up the dialog to ask them.
        $('#propscheddlg').foundation('open');
    }
    /**
     * Process the imported file
     * @param reader File to process
     */
    public processImport(file: File): void {
        const reader = new FileReader();
        reader.onload = (): void => {
            try {
                const tzOffset = timestampFromMinutes(new Date().getTimezoneOffset());
                const data = new Uint8Array(reader.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]]; // get the first worksheet
                const epoch1904 = workbook.Workbook.WBProps.date1904;
                const json = XLSX.utils.sheet_to_json(sheet) as { [index: string]: unknown }[];
                let timefield = 'Time';
                let userfields: string[] = [];
                let schoolnamefield = 'School';
                let teamtypefield = 'Type';
                let lengthfield = 'Length';
                let timedfield = 'Timed';
                if (json.length > 0) {
                    // Figure out what columns are to be used
                    const firstelem = json[0];
                    for (const fieldname in firstelem) {
                        const fieldupper = fieldname.toUpperCase().replace(/[^A-Z]/gi, '');
                        switch (fieldupper) {
                            case 'TIME':
                                timefield = fieldname;
                                break;
                            case 'LENGTH':
                                lengthfield = fieldname;
                                break;
                            case 'SCHOOL':
                            case 'TEAM':
                                schoolnamefield = fieldname;
                                break;
                            case 'TYPE':
                                teamtypefield = fieldname;
                                break;
                            case 'USER':
                            case 'STUDENT':
                                userfields.push(fieldname);
                                break;
                            case 'TIMED':
                                timedfield = fieldname;
                                break;
                            default:
                                console.log(
                                    'Ignoring: ' + fieldname + ' mapped as ' + fieldupper
                                );
                        }
                    }
                    // Take up to three user fields
                    userfields = userfields.sort().slice(0, 3);
                    // If we have more than three userfields
                    let defaultStartTime = Date.now()
                    let defaultTestLength = 50
                    let defaultTimedLength = 10
                    // Now we go through the records and process them
                    for (const record of json) {
                        console.log(record);
                        const answertemplate: IAnswerTemplate = {
                            testid: "",
                            starttime: defaultStartTime,
                            endtime: defaultStartTime + timestampFromMinutes(defaultTestLength),
                            endtimed: defaultStartTime + timestampFromMinutes(defaultTimedLength),
                            answers: [],
                            assigned: [],
                            teamname: "",
                            teamtype: ""
                        }
                        let starttime = record[timefield] as number;
                        if (starttime !== undefined) {
                            console.log('Start time =' + starttime);
                            // If the time is less than one day then they didn't give us a date, only a time
                            // so we are going to assume that it is starting today at the time they gave us
                            if (starttime < 1) {
                                const d = new Date();
                                d.setHours(0, 0, 0, 0); // last midnight
                                starttime =
                                    Number(d) + starttime * timestampFromMinutes(60 * 24);
                            } else {
                                // We have to adjust the date based on the epoch in the file.
                                // By default an excel file will have an epoch either January 1, 1900 or January 1, 1904
                                // depending on whether the file was done on a mac or a PC originally.
                                if (epoch1904) {
                                    starttime -= 25569 - 1461;
                                } else {
                                    starttime -= 25569;
                                }
                                starttime *= timestampFromMinutes(60 * 24);
                                starttime += tzOffset;
                            }
                            console.log('Mapped to ' + timestampToFriendly(starttime));
                            answertemplate.starttime = starttime;
                            defaultStartTime = starttime;
                        }
                        const testlength = record[lengthfield] as number;
                        if (testlength !== undefined) {
                            answertemplate.endtime = answertemplate.starttime + timestampFromMinutes(testlength)
                            defaultTestLength = testlength
                        }
                        const timedlength = record[timedfield] as number;
                        if (timedlength !== undefined) {
                            answertemplate.endtimed = answertemplate.starttime + timestampFromMinutes(timedlength)
                            defaultTimedLength = timedlength
                        }
                        const teamname = record[schoolnamefield] as string;
                        if (teamname !== undefined) {
                            answertemplate.teamname = teamname;
                        }
                        const teamtype = record[teamtypefield] as string;
                        if (teamtype !== undefined) {
                            answertemplate.teamtype = teamtype;
                        }
                        for (const userfield of userfields) {
                            const username = record[userfield] as string;
                            if (username !== undefined) {
                                const testuser: ITestUser = { userid: username }
                                answertemplate.assigned.push(testuser);
                            }
                        }
                        const newRowID = this.addUITestEntry("", answertemplate);
                        this.setChanged(newRowID);
                        this.setDirty(newRowID);
                    }
                    $('#ImportFile').foundation('close');
                    this.attachHandlers();
                    this.saveAllDirty();
                }
            } catch (e) {
                $('#xmlerr').text('Not a valid import file');
            }
        };
        reader.readAsArrayBuffer(file);
    }
    public addUITestEntry(answermodelid: string, answertemplate: IAnswerTemplate): string {
        let newRowID = 0;
        if ($('.publist').length === 0) {
            // No table at all so just create one with our row put in it
            const table = this.createTestTable();
            const row = table.addBodyRow();
            this.populateRow(row, newRowID, answermodelid, answertemplate);
            $('.testlist')
                .empty()
                .append(table.generate());
        } else {
            // Find the id of the last row
            const lastid = $('.publist tr:last').attr('id');
            const rowID = Number(lastid.substr(1)) + 1;
            // And create a row with the next ID
            const row = new JTRow();
            this.populateRow(row, rowID, answermodelid, answertemplate);
            newRowID = rowID;
            // And put it into the table
            $('.publist tbody').append(row.generate());
        }
        return String(newRowID)
    }

    /**
     * Import a schedule
     */
    public importSchedule(): void {
        this.openXMLImport(true);
    }
    /**
     * Creates convergence domain users if they do not exist already.
     * @param modelService Domain Model service object for making requests
     * @param usernames User to ensure exists
     */
    public ensureUsersExist(usernames: string[]): Promise<unknown> {
        const settings = this.getConvergenceSettings();
        const convergenceNamespace = settings.namespace;
        const convergenceDomainID = settings.domain;
        const parameters: EnsureUsersExistParameters = {
            convergenceDomainID: convergenceDomainID,
            convergenceNamespace: convergenceNamespace,
            usernames: usernames,
        };

        const token = this.getConfigString(CipherHandler.KEY_CONVERGENCE_TOKEN, '');
        return this.api.ensureUsersExist(token, parameters);
    }
    /**
     * saveTestModelPermissions Adds all permissions to the Test Model
     * @param testmodelid ID of the test model
     */
    public saveTestModelPermissions(): void {
        const testmodelid = this.testmodelid;
        // Go through all of the UI Elements and gather the email addresses
        const usermap: BoolMap = { globalPermissionId: true }
        $('input[id^="U"]').each((_i, elem) => {
            const userid = $(elem).val() as string
            if (userid !== '') {
                usermap[userid] = true;
            }
        });
        const readOnlyPermission: RealtimeSinglePermission = { read: true, write: false, remove: false, manage: false };
        const removePermission: RealtimeSinglePermission = { read: false, write: false, remove: false, manage: false };
        // Start with what is currently on the model
        this.getRealtimePermissions(testmodelid).then((permissionset) => {
            // Then check each user to see if they already have access
            for (const user in usermap) {
                const permissions = permissionset[user];
                // If they don't have any permissions or their read permissions are turned off, we want to give them just read access
                // this prevents us from removing the full access access for the main owner of the test model
                if (permissions === undefined || permissions.read === false) {
                    this.updateRealtimePermissions(testmodelid, user, readOnlyPermission).catch((error) => {
                        this.reportFailure('Unable to set permissions for ' + user + ' on ' + testmodelid + ':' + error);
                    });
                }
                // Now we need to delete any read access permissions who no longer are referencing the model
                for (let user in permissionset) {
                    const permissions = permissionset[user];
                    if (permissions.write === false && permissions.remove == false && permissions.manage === false && !usermap[user]) {
                        // they no longer are referencing the model, so we can delete them
                        this.updateRealtimePermissions(testmodelid, user, removePermission).catch((error) => {
                            this.reportFailure('Unable to set permissions for ' + user + ' on ' + testmodelid + ':' + error);
                        });
                    }
                }
            }
        });
    }
    /**
     * Update the permissions on a model entry
     * @param modelService Domain Model service object for making requests
     * @param modelid ID of model
     * @param toremove List of users to remove access for
     * @param toadd List of users to add access for
     * @returns Promise for success/failure
     */
    public saveUserPermissions(modelService: ModelService, modelid: string, toremove: string[], toadd: string[]): Promise<void> {
        const permissionManager = modelService.permissions(modelid);
        let changed = false;
        return new Promise((resolve, reject) => {
            permissionManager
                .getAllUserPermissions()
                .then((allPermissions) => {
                    // first go through the ones to remove
                    for (const userid of toremove) {
                        if (allPermissions.has(userid)) {
                            changed = true;
                            const permit: ModelPermissions = allPermissions.get(userid);
                            // They must be able to read/write but not remove/manage if it is a user
                            if (permit.read && permit.write && !permit.remove && !permit.manage) {
                                allPermissions.delete(userid);
                            }
                        }
                    }
                    for (const userid of toadd) {
                        if (!allPermissions.has(userid)) {
                            changed = true;
                            allPermissions.set(
                                userid,
                                ModelPermissions.fromJSON({
                                    read: true,
                                    write: true,
                                    remove: false,
                                    manage: false,
                                })
                            );
                        }
                    }
                    // For now we have to make sure we dont' call ensureUsersExist with zero entries
                    if (toadd.length > 0) {
                        this.ensureUsersExist(toadd).then(() => {
                            // We have updated the permissions, so save it back.
                            if (changed) {
                                permissionManager
                                    .setAllUserPermissions(allPermissions)
                                    .then(() => { resolve(); })
                                    .catch((error) => { reject(error); });
                            }
                        });
                    } else if (changed) {
                        permissionManager.setAllUserPermissions(allPermissions)
                            .then(() => { resolve(); })
                            .catch((error) => { reject(error); });
                    } else {
                        resolve();
                    }

                })
                .catch((error) => { reject(error); });
        })
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
    public saveAnswerTemplate(
        modelService: ModelService,
        modelid: string,
        userlist: string[],
        starttime: number,
        endtime: number,
        endtimed: number,
        teamname: string,
        teamtype: string
    ): Promise<void> {
        const usermap: BoolMap = {};
        for (const user of userlist) {
            usermap[user] = true;
        }
        return new Promise((resolve, reject) => {
            modelService
                .open(modelid)
                .then((datamodel: RealTimeModel) => {
                    datamodel.elementAt('starttime').value(starttime);
                    datamodel.elementAt('endtime').value(endtime);
                    datamodel.elementAt('endtimed').value(endtimed);
                    datamodel.elementAt('teamname').value(teamname);
                    datamodel.elementAt('teamtype').value(teamtype);
                    const answers = datamodel.elementAt('answers').value();
                    const questions = answers.length + 1;
                    const removed: string[] = [];
                    const added: string[] = [];
                    const assigned: ITestUser[] = datamodel.elementAt('assigned').value();

                    for (const i in assigned) {
                        const assignee = assigned[i];
                        let userid = '';
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
                        if (userid !== '') {
                            added.push(userid);
                        }
                    }
                    // Add any users not already on the list
                    for (let i = assigned.length; i < userlist.length; i++) {
                        assigned.push({
                            userid: userlist[i],
                            displayname: userlist[i],
                            starttime: 0,
                            idletime: 0,
                            confidence: makeFilledArray(questions, 0) as number[],
                            notes: '',
                            sessionid: '',
                        });
                        if (userlist[i] !== '') {
                            added.push(userlist[i]);
                        }
                    }
                    // And save out the data model
                    datamodel.elementAt('assigned').value(assigned);
                    datamodel.close();
                    // Reset the permissions on the model.  Remove anyone who was taken off and add anyone
                    this.saveUserPermissions(modelService, modelid, removed, added);
                    resolve();
                })
                .catch((error) => { reject(error) });
        })
    }
    /**
     * showDelete updates the UI while deleting a mode.
     * @param modelService model service to use for operations
     * @param modelid Model to be deleted
     * @param id Id of row for the model
     * @returns Promise of completed operation
     */
    public showDelete(modelService: ModelService, modelid: string, id: string): Promise<void> {
        const tr = $('tr#R' + id)
        const elem = $('tr#R' + id + " .pubdel")
        console.log('showDelete id=' + id + ' tr len=' + tr.length + ' pubdel len=' + elem.length)
        console.log(tr)
        console.log(elem)
        elem.removeClass("alert")
            .addClass("warning")
            .text("Deleting...")
        return new Promise((resolve, reject) => {
            modelService.remove(modelid).then(() => {
                tr.remove();
                resolve();
            }).catch((error) => {
                elem.removeClass("warning")
                    .addClass("alert")
                    .text("Delete")
                reject(error);
            });
        })
    }

    /**
     * Request to delete a single scheduled test after confirming from the user that they really want to do it.
     * @param id Which row to delete from
     * @param modelid Model to be deleted
     */
    public deleteScheduled(id: string, modelid: string): void {
        $('#okdelsched')
            .off('click')
            .on('click', () => {
                this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
                    const modelService = domain.models();
                    // Change the button to show that it is being deleted 
                    this.showDelete(modelService, modelid, id)
                        .then(() => {
                            if ($('tr[id^="R"]').length === 0) {
                                this.updateOutput();
                            }
                        })
                        .catch((error) => {
                            this.reportFailure('Could not remove ' + modelid + ' ' + error);
                        });
                });
                $('#delscheddlg').foundation('close');
            });
        $('#okdelsched').removeAttr('disabled');
        $('#delscheddlg').foundation('open');
    }

    /**
     * Create the hidden dialog for confirming deletion of all scheduled tests
     * @returns HTML DOM element for dialog
     */
    private createDeleteAllDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            class: 'callout alert',
        }).text(
            'This will delete all scheduled tests, even if they have already been taken.  Are you sure you want to do this?'
        );
        const DeleteAllDlg = JTFDialog(
            'delalldlg',
            'Delete all Scheduled Tests',
            dlgContents,
            'okdelall',
            'Yes, Delete them!'
        );
        return DeleteAllDlg;
    }
    /**
     * Create the hidden dialog for confirming deletion of all scheduled tests
     * @returns HTML DOM element for dialog
     */
    private createDeleteScheduledDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            class: 'callout alert',
        }).text(
            'This will delete the scheduled test, even if it has already been taken.  Are you sure you want to do this?'
        );
        const DeleteTestDlg = JTFDialog(
            'delscheddlg',
            'Delete Scheduled Test',
            dlgContents,
            'okdelsched',
            'Yes, Delete it!'
        );
        return DeleteTestDlg;
    }
    /**
     * Create the hidden dialog for confirming propagation of the time
     * @returns HTML DOM element for dialog
     */
    private createPropagateScheduledDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            class: 'callout alert',
        }).text(
            'This will copy the times from the first test to all other tests. ' +
            'You will need to save the changes after it propagates the times. ' +
            'Are you sure you want to do this?'
        );
        const PropagateScheduleDlg = JTFDialog(
            'propscheddlg',
            'Propagate Test Schedule',
            dlgContents,
            'okprop',
            'Yes, Update them all!'
        );
        return PropagateScheduleDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     * @returns DOM element to put at the top
     */
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result
            .append(this.createDeleteAllDlg())
            .append(this.createDeleteScheduledDlg())
            .append(this.createPropagateScheduledDlg());
        return result;
    }
    /**
     * Creates the hidden dialog for selecting an XML file to import
     */
    public createImportFileDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            id: 'importstatus',
            class: 'callout secondary',
        })
            .append(
                $('<label/>', {
                    for: 'xmlFile',
                    class: 'impfile button',
                }).text('Select File')
            )
            .append(
                $('<input/>', {
                    type: 'file',
                    id: 'xmlFile',
                    accept: '.xls,.xlsx,.csv',
                    class: 'impfile show-for-sr',
                })
            )
            .append(
                $('<span/>', {
                    id: 'xmltoimport',
                    class: 'impfile',
                }).text('No File Selected')
            )
            .append(
                JTFLabeledInput('URL', 'text', 'xmlurl', '', 'impurl small-12 medium-6 large-6')
            );
        const importDlg = JTFDialog(
            'ImportFile',
            'Import Test Data',
            dlgContents,
            'okimport',
            'Import'
        );
        return importDlg;
    }

    /**
     * Locate the row id for an element.  This looks for the ID of the containing TR
     * @param elem element to get information for
     * @returns row ID
     */
    public getRowID(elem: JQuery<HTMLElement>): string {
        const tr = elem.closest('tr');
        const id = tr.attr('id') as string;
        return id.substr(1);
    }
    /**
     * Locate the model id for an element.  This looks for the data-source attribute of the containing TR
     * @param elem element to get information for
     * @returns model id stored on the TR element
     */
    public getModelID(elem: JQuery<HTMLElement>): string {
        const tr = elem.closest('tr');
        const id = tr.attr('data-source') as string;
        return id;
    }
    public isValidEmailAddress(emailAddress: string): boolean {
        var pattern = /^([a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+(\.[a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)*|"((([ \t]*\r\n)?[ \t]+)?([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*(([ \t]*\r\n)?[ \t]+)?")@(([a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.)+([a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.?$/i;
        return pattern.test(emailAddress);
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('#addsched')
            .off('click')
            .on('click', () => {
                this.addSingleScheduledTest();
            });
        $('#delallsched')
            .off('click')
            .on('click', () => {
                this.gotoDeleteAllScheduled();
            });
        $('#fixpermissions')
            .off('click')
            .on('click', () => {
                this.fixAllPermissions();
            });
        $('#savesched')
            .off('click')
            .on('click', () => {
                this.saveAllScheduled();
            });
        $('#propsched')
            .off('click')
            .on('click', () => {
                this.propagateSchedule();
            });
        $('#importsched')
            .off('click')
            .on('click', () => {
                this.importSchedule();
            });
        $('input[id^="N_"]')
            .off('change')
            .on('change', (e) => {
                this.setChanged(this.getRowID($(e.target)));
            });
        $('input[id^="C_"]')
            .off('change')
            .on('change', (e) => {
                this.setChanged(this.getRowID($(e.target)));
            });
        $('input[id^="D_"]')
            .off('input')
            .on('input', (e) => {
                this.setChanged(this.getRowID($(e.target)));
                const newval = Number($(e.target).val());
                if (newval < 0) {
                    $(e.target).val(0);
                }
            });
        $('input[id^="T_"]')
            .off('input')
            .on('input', (e) => {
                this.setChanged(this.getRowID($(e.target)));
                const newval = Number($(e.target).val());
                if (newval < 0) {
                    $(e.target).val(0);
                }
            });
        $('input[id^="U"]')
            .off('input')
            .on('input', (e) => {
                // Check to see if the email address is valid
                const elem = $(e.target);
                const email = elem.val() as string;
                const id = this.getRowID(elem)

                if (email === "" || this.isValidEmailAddress(email)) {
                    elem.removeClass("bademail").removeAttr('title')
                    this.setChanged(this.getRowID(elem));
                } else {
                    elem.addClass("bademail")
                    $('#SV' + id).attr('disabled', 'disabled').attr('title', 'Invalid email address')
                }
            });
        $('.pubsave')
            .off('click')
            .on('click', (e) => {
                this.saveScheduled(this.getRowID($(e.target)));
            });
        $('.pubdel')
            .off('click')
            .on('click', (e) => {
                this.deleteScheduled(this.getRowID($(e.target)), this.getModelID($(e.target)));
            });
        $('.datetimepick')
            .off('change')
            .on('change', (e) => {
                this.setChanged(this.getRowID($(e.target)));
            });
        $('#title')
            .off('input')
            .on('input', (e) => {
                const title = $(e.target).val() as string;
                this.setTitle(title);
            });
        $('.datetimepick').each((i, elem) => {
            flatpickr(elem, {
                altInput: true,
                enableTime: true,
                dateFormat: 'M j, Y H:i',
                allowInput: true,
            });
        });
    }
}
