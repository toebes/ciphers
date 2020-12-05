import { CipherTestManage } from './ciphertestmanage';
import { toolMode, IState } from '../common/cipherhandler';
import { ITestState, IAnswerTemplate, ITestUser } from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import {
    cloneObject,
    timestampFromMinutes,
    BoolMap,
    timestampForever,
    makeFilledArray,
    timestampToFriendly,
} from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTRow, JTTable } from '../common/jttable';
import {
    ConvergenceDomain,
    RealTimeModel,
    ModelService,
    ModelPermissions,
} from '@convergence/convergence';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFDialog } from '../common/jtfdialog';

import * as _flatpickr from 'flatpickr';
import { FlatpickrFn } from 'flatpickr/dist/types/instance';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { API, EnsureUsersExistParameters } from './api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flatpickr: FlatpickrFn = _flatpickr as any;

import * as XLSX from 'xlsx';

interface testInfo {
    /** Time that the test is scheduled to start */
    starttime: number;
    /** length of the test in minutes */
    testlength: number;
    /** Time allocated for the timed question bonus */
    timedlength: number;
    /** Users who are assigned to take the test */
    assigned: string[];
    /** Name of the team taking the test */
    teamname: string;
    /** Type of team (Varsity, JV, JV2, etc) taking the test */
    teamtype: string;
}

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
        { title: 'Import Schedule', color: 'primary', id: 'importsched' },
        { title: 'Reschedule All', color: 'primary', id: 'propsched' },
        { title: 'Save All', color: 'primary', id: 'savesched', disabled: true },
        { title: 'Delete All', color: 'alert', id: 'delallsched' },
    ];

    /**
     * Provides communication to our REST server.
     */
    private readonly api: API;

    constructor() {
        super();

        this.api = new API(this.getConfigString('authUrl', 'https://cosso.oit.ncsu.edu'));
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
        return this.genPublishedEditState('schedule');
    }
    /**
     * Generates a list of all the tests on the server in a table.
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });

        // First we need to get the test template from the testsource
        // Once we have the test template, then we will be able to find all the scheduled tests
        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            const modelService = domain.models();
            this.openTestSource(modelService, this.state.testID);
        });
        return result;
    }
    /**
     *
     * @param domain Convergence Domain to query against
     * @param sourcemodelid Source test to open
     */
    private openTestSource(modelService: ModelService, sourcemodelid: string): void {
        modelService
            .open(sourcemodelid)
            .then((realtimeModel) => {
                const testmodelid = realtimeModel
                    .root()
                    .elementAt('testid')
                    .value();
                const answermodelid = realtimeModel
                    .root()
                    .elementAt('answerid')
                    .value();
                realtimeModel.close();
                this.findScheduledTests(modelService, testmodelid, answermodelid);
            })
            .catch((error) => {
                this.reportFailure('Could not open model for ' + sourcemodelid + ' Error:' + error);
            });
    }
    /**
     * Create an input field that allows the user to enter a date/time value
     * @param id ID for the input field to create
     * @param datetime Date/time value to initialize the field with
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
     * Creates the test table for displaying all active tests
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
     * Populate a JTRow object to insert into the table
     * @param row Row item to populate
     * @param rowID ID for the row
     * @param answerModelID ID for the stored answer model
     * @param answertemplate Contents for the answer
     */
    private populateRow(
        row: JTRow,
        rownum: number,
        answerModelID: string,
        answertemplate: IAnswerTemplate
    ): void {
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
     * Find all the tests scheduled for a given test template
     * @param modelService Domain Model service object for making requests
     * @param sourcemodelid
     */
    public findScheduledTests(
        modelService: ModelService,
        testmodelid: string,
        answermodelid: string
    ): void {
        modelService
            .query("SELECT * FROM codebusters_answers where testid='" + testmodelid + "'")
            .then((results) => {
                let total = 0;
                let templatecount = 0;
                let table: JTTable = undefined;
                results.data.forEach((result) => {
                    const answertemplate = result.data as IAnswerTemplate;
                    if (result.modelId === answermodelid) {
                        templatecount++;
                        this.answerTemplate = answertemplate;
                    } else {
                        if (table === undefined) {
                            table = this.createTestTable();
                        }
                        const row = table.addBodyRow();
                        this.populateRow(row, total, result.modelId, answertemplate);
                        // Keep track of how many entries we created so that they each have a unique id
                        total++;
                    }
                });
                // If we don't generate a table, we need to put something there to tell the user
                // that there are no tests scheduled.
                if (total === 0) {
                    $('.testlist').append(
                        $('<div/>', { class: 'callout warning' }).text('No tests scheduled')
                    );
                    if (templatecount === 0) {
                        this.reportFailure('Test Answer Template is missing');
                    }
                } else {
                    $('.testlist').append(table.generate());
                }
                this.attachHandlers();
            })
            .catch((error) => {
                this.reportFailure('Convergence API could not query: ' + error);
            });
    }
    /**
     * Makes a copy of the answer template and schedules a new test.
     */
    public copyAnswerTemplate(): void {
        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            const modelService = domain.models();
            const copyInfo: testInfo = {
                starttime: Date.now(),
                testlength: 50,
                timedlength: 10,
                assigned: [],
                teamname: '',
                teamtype: 'Varsity',
            };
            this.makeAnswerTemplate(modelService, copyInfo);
        });
    }
    /**
     * Makes a copy of the answer template and schedules a new test.
     * @param modelService Domain Model service object for making requests
     * @param testinfo Description of the new test to add
     */
    public makeAnswerTemplate(modelService: ModelService, testinfo: testInfo): void {
        const answerTemplate: IAnswerTemplate = {
            testid: this.answerTemplate.testid,
            starttime: testinfo.starttime,
            endtime: testinfo.starttime + timestampFromMinutes(testinfo.testlength),
            endtimed: testinfo.starttime + timestampFromMinutes(testinfo.timedlength),
            assigned: [],
            teamname: testinfo.teamname,
            teamtype: testinfo.teamtype,
            answers: this.answerTemplate.answers,
        };
        for (const userid of testinfo.assigned) {
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
        console.log(answerTemplate);
        modelService
            .openAutoCreate({
                collection: 'codebusters_answers',
                overrideCollectionWorldPermissions: false,
                data: answerTemplate,
            })
            .then((datamodel: RealTimeModel) => {
                const modelid = datamodel.modelId();
                const rowID = 0;
                datamodel.close();
                //
                // Now we need to get the new entry on the screen.
                // If we don't have a table already we will need to create one
                //
                if ($('.publist').length === 0) {
                    // No table at all so just create one with our row put in it
                    const table = this.createTestTable();
                    const row = table.addBodyRow();
                    this.populateRow(row, rowID, modelid, answerTemplate);
                    $('.testlist')
                        .empty()
                        .append(table.generate());
                } else {
                    // Find the id of the last row
                    const lastid = $('.publist tr:last').attr('id');
                    const rowID = Number(lastid.substr(1)) + 1;
                    // And create a row with the next ID
                    const row = new JTRow();
                    this.populateRow(row, rowID, modelid, answerTemplate);
                    // And put it into the table
                    $('.publist tbody').append(row.generate());
                }
                this.attachHandlers();
            })
            .catch((error) => {
                this.reportFailure('Could not autocreate: ' + error);
            });
    }
    /**
     * Delete a model from the server
     * @param modelService Domain Model service object for making requests
     * @param modelid Model to delete
     */
    private doDeletePublished(modelService: ModelService, modelid: string): void {
        modelService.remove(modelid).catch((error) => {
            this.reportFailure('Could not remove ' + modelid + ' ' + error);
        });
    }
    /**
     * This prompts a user and then deletes all ciphers
     */
    public gotoDeleteAllScheduled(): void {
        $('#okdelall')
            .off('click')
            .on('click', () => {
                this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
                    const modelService = domain.models();
                    $('tr[id^="R"]').each((i, elem) => {
                        const modelid = $(elem).attr('data-source');
                        this.doDeletePublished(modelService, modelid);
                        $(elem).remove();
                    });
                    this.updateOutput();
                });
                $('#delalldlg').foundation('close');
            });
        $('#okdelall').removeAttr('disabled');
        $('#delalldlg').foundation('open');
    }
    /**
     *
     * @param id Which button was clicked on
     */
    public setChanged(id: string): void {
        $('#SV' + id).removeAttr('disabled');
        $('#savesched').removeAttr('disabled');
    }
    /**
     * Save a scheduled test
     * @param eid Row ID to save
     * @param testid Model to save it do
     */
    public saveScheduled(eid: string, testid: string): void {
        const userlist: string[] = [];
        const name1 = $('#U0_' + eid).val() as string;
        const name2 = $('#U1_' + eid).val() as string;
        const name3 = $('#U2_' + eid).val() as string;
        if (name1 !== '') {
            userlist.push(name1);
        }
        if (name2 !== '') {
            userlist.push(name2);
        }
        if (name3 !== '') {
            userlist.push(name3);
        }
        const testStart = $('#S_' + eid).val() as string;
        const testDuration = $('#D_' + eid).val() as number;
        const timedDuration = $('#T_' + eid).val() as number;
        const starttime = Date.parse(testStart);
        let endtime = starttime + timestampFromMinutes(testDuration);
        if (testDuration === 0) {
            endtime = timestampForever;
        }
        const endtimed = starttime + timestampFromMinutes(timedDuration);
        $('#SV' + eid).attr('disabled', 'disabled');

        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            const modelService = domain.models();
            this.saveAnswerTemplate(modelService, testid, userlist, starttime, endtime, endtimed);
        });
    }
    /**
     * Save all unsaved scheduled test
     */
    public saveAllScheduled(): void {
        $('#savesched').attr('disabled', 'disabled');
        $('.pubsave').each((i, elem) => {
            if ($(elem).attr('disabled') != '') {
                this.saveScheduled(this.getRowID($(elem)), this.getModelID($(elem)));
            }
        });
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
                    $('input[id^="T_"]').each((i, elem) => {
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
                this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
                    const modelService = domain.models();

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
                        const defaultTest: testInfo = {
                            starttime: Date.now(),
                            testlength: 50,
                            timedlength: 10,
                            assigned: [],
                            teamname: '',
                            teamtype: '',
                        };
                        // Now we go through the records and process them
                        for (const record of json) {
                            console.log(record);
                            const newTest = cloneObject(defaultTest) as testInfo;
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
                                }
                                console.log('Mapped to ' + timestampToFriendly(starttime));
                                newTest.starttime = starttime;
                            }
                            const testlength = record[lengthfield] as number;
                            if (testlength !== undefined) {
                                newTest.testlength = testlength;
                            }
                            const timedlength = record[timedfield] as number;
                            if (timedlength !== undefined) {
                                newTest.timedlength = timedlength;
                            }
                            const teamname = record[schoolnamefield] as string;
                            if (teamname !== undefined) {
                                newTest.teamname = teamname;
                            }
                            const teamtype = record[teamtypefield] as string;
                            if (teamtype !== undefined) {
                                newTest.teamtype = teamtypefield;
                            }
                            for (const userfield of userfields) {
                                const username = record[userfield] as string;
                                if (username !== undefined) {
                                    newTest.assigned.push(username);
                                }
                            }
                            // Save out the new record
                            this.makeAnswerTemplate(modelService, newTest);
                            // Save the defaults for the next round
                            defaultTest.starttime = newTest.starttime;
                            defaultTest.testlength = newTest.testlength;
                            defaultTest.timedlength = newTest.timedlength;
                        }
                        $('#ImportFile').foundation('close');
                    }
                });
            } catch (e) {
                $('#xmlerr').text('Not a valid import file');
            }
        };
        reader.readAsArrayBuffer(file);
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
    public ensureUsersExist(modelService: ModelService, usernames: string[]): Promise<unknown> {
        const settings = this.getConvergenceSettings();
        const convergenceNamespace = settings.namespace;
        const convergenceDomainID = settings.domain;
        const parameters: EnsureUsersExistParameters = {
            convergenceDomainID: convergenceDomainID,
            convergenceNamespace: convergenceNamespace,
            usernames: usernames,
        };

        return this.api.ensureUsersExist(parameters);
    }

    /**
     * Update the permissions on a model entry
     * @param modelService Domain Model service object for making requests
     * @param modelid ID of model
     * @param toremove List of users to remove access for
     * @param toadd List of users to add access for
     */
    public saveUserPermissions(
        modelService: ModelService,
        modelid: string,
        toremove: string[],
        toadd: string[]
    ): void {
        const permissionManager = modelService.permissions(modelid);
        permissionManager
            .getAllUserPermissions()
            .then((allPermissions) => {
                const toCheck: string[] = [];
                // first go through the ones to remove
                for (const userid of toremove) {
                    if (allPermissions.has(userid)) {
                        const permit: ModelPermissions = allPermissions.get(userid);
                        // They must be able to read/write but not remove/manage if it is a user
                        if (permit.read && permit.write && !permit.remove && !permit.manage) {
                            allPermissions.delete(userid);
                        }
                    }
                }
                for (const userid of toadd) {
                    if (!allPermissions.has(userid)) {
                        toCheck.push(userid);
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
                    this.ensureUsersExist(modelService, toadd).then(() => {
                        // We have updated the permissions, so save it back.
                        permissionManager.setAllUserPermissions(allPermissions).catch((error) => {
                            this.reportFailure('Unable to set model permissions: ' + error);
                        });
                    });
                } else {
                    permissionManager.setAllUserPermissions(allPermissions).catch((error) => {
                        this.reportFailure('Unable to set model permissions: ' + error);
                    });
                }
            })
            .catch((error) => {
                this.reportFailure('Could not get model permissions: ' + error);
            });
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
        endtimed: number
    ): void {
        const usermap: BoolMap = {};
        for (const user of userlist) {
            usermap[user] = true;
        }
        modelService
            .open(modelid)
            .then((datamodel: RealTimeModel) => {
                datamodel.elementAt('starttime').value(starttime);
                datamodel.elementAt('endtime').value(endtime);
                datamodel.elementAt('endtimed').value(endtimed);
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
                this.saveUserPermissions(modelService, this.answerTemplate.testid, [], added);
            })
            .catch((error) => {
                this.reportFailure('Could not open model to save: ' + error);
            });
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
                    this.doDeletePublished(modelService, modelid);
                    $('tr#R' + id).remove();
                    if ($('tr[id^="R"]').length === 0) {
                        this.updateOutput();
                    }
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
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
        $('#addsched')
            .off('click')
            .on('click', () => {
                this.copyAnswerTemplate();
            });
        $('#delallsched')
            .off('click')
            .on('click', () => {
                this.gotoDeleteAllScheduled();
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
                this.setChanged(this.getRowID($(e.target)));
            });
        $('.pubsave')
            .off('click')
            .on('click', (e) => {
                this.saveScheduled(this.getRowID($(e.target)), this.getModelID($(e.target)));
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
