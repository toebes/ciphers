import { CipherTestManage } from './ciphertestmanage';
import { toolMode, IState } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { BoolMap, cloneObject, StringMap, timestampFromMinutes, timestampToFriendly } from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTFDialog } from '../common/jtfdialog';
import { ConvergenceAuthentication } from './authentication';
import Convergence = require('@convergence/convergence');
import { LogLevel, ModelService } from '@convergence/convergence';
import { IRealtimeObject, RealtimeSinglePermission } from './ciphertest';


export interface MaintenanceState extends IState {
    /** User to log in to system as */
    userid?: string
    /** Password for the user */
    password?: string
    /** Known users for any tests */
    activeUsers?: Map<string, boolean>
    /** Session token */
    sessiontoken?: string
    /** Active users for a test */
    activeTestUsers?: Map<string, BoolMap>
}

/**
 * CipherMaintenance
 *   This allows for migrating and deleting old tests/users from the server
 */
export class CipherMaintenance extends CipherTestManage {
    public collectionQuery: StringMap = {
        'sourcemodel': "SELECT testid from codebusters_source",
        'testmodel': "SELECT useCustomHeader FROM codebusters_tests",
        'answertemplate': "SELECT testid FROM codebusters_answer_templates",
    }
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: MaintenanceState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: MaintenanceState = cloneObject(this.defaultstate) as IState;
    /** Command buttons */
    public cmdButtons: JTButtonItem[] = [
        { title: 'Migrate Source', color: 'primary', id: 'repsrc' },
        { title: 'Migrate Test Templates', color: 'primary', id: 'reptst' },
        { title: 'Migrate Answer Templates', color: 'primary', id: 'repans' },
        { title: 'Purge Old Answers', color: 'primary', id: 'purge' },
    ];
    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: MaintenanceState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.state.activeUsers = new Map()
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Create the hidden dialog for entering the admin userid/password
     * @returns JQuery dialog to display
     */
    private createLoginDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>', {
            class: 'callout alert',
        }).append($('<div/>', { id: 'actionprompt' }).text("tbd")
        ).append(JTFLabeledInput('Userid:', 'text', 'userid', '', '')
        ).append(JTFLabeledInput('Password:', 'password', 'password', '', ''));
        const LoginCredentialsDlg = JTFDialog(
            'logindlg',
            'Enter Login Information',
            dlgContents,
            'oklogin',
            'Process!'
        );
        return LoginCredentialsDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for login credentials
     */
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        result.append(this.createLoginDlg());
        return result;
    }
    /**
     * findModels finds all the models of a given type and queues them to be migrated
     * @param modelService Domain Model service object for making requests
     * @param realtimeType type of model to process.  One of: sourcemodel|testmodel|answertemplate
     */
    public findModels(modelService: ModelService, realtimeType: IRealtimeObject): void {
        $(".ans").empty().append($("<div/>").text("Processing " + realtimeType + " to migrate."))

        modelService
            .query(this.collectionQuery[realtimeType])
            .then(results => {
                let ul = $("<ul/>");
                $(".ans").append(ul)
                results.data.forEach((result) => {
                    ul.append($("<li/>", { 'data-entry': result.modelId }).text(result.modelId));
                })
                this.processOne(modelService, realtimeType);
            })
            .catch(error => {
                this.reportFailure('error querying model:' + error)
            })

    }
    /**
     * processOne Takes the first entry off the list found and migrates it.  Once the migration is done,
     * it sets a time to run the next entry.
     * @param modelService Domain Model service object for making requests
     * @param realtimeType type of model to process.  One of: sourcemodel|testmodel|answertemplate
     */
    public processOne(modelService: ModelService, realtimeType: IRealtimeObject): void {
        // Find all the entries to process
        let entries = $('li[data-entry]');
        if (entries.length > 0) {
            // We have at least one, so process the first one
            let entry = entries[0];
            let modelId = entry.getAttribute('data-entry');
            entry.removeAttribute('data-entry')
            // Open up the model from the server
            modelService.open(modelId).then(model => {
                // Get the data from the model
                const data = model.root().value();
                model.close();
                // And copy it to the server
                this.updateRealtimeContents(realtimeType, JSON.stringify(data), modelId)
                    .then(() => {
                        // Get the current permissions from the model
                        const permissionManager = modelService.permissions(modelId);
                        permissionManager
                            .getAllUserPermissions()
                            .then((allPermissions) => {
                                // Convert each permission from the convergence format to the realtime format
                                allPermissions.forEach((permission, user) => {
                                    let rtPermission: RealtimeSinglePermission = {
                                        read: permission.read,
                                        write: permission.write,
                                        remove: permission.remove,
                                        manage: permission.manage
                                    }
                                    // Update the permissions on the new server
                                    this.updateRealtimePermissions(modelId, user, rtPermission)
                                        .then(() => {
                                            // It worked, so process the next one
                                            entry.append(" [Processed]");
                                            setTimeout(() => { this.processOne(modelService, realtimeType) }, 1);
                                        })
                                        .catch((error) => {
                                            // Failed, note the failure and go on to the next one
                                            entry.append(" [Unable to set permission:" + error + "]")
                                            setTimeout(() => { this.processOne(modelService, realtimeType) }, 1);
                                        });
                                })
                            })
                            .catch(error => {
                                // Something went wrong getting the permissions, so tell them
                                // but continue processing the list
                                entry.append(" [Unable to get permission:" + error + "]")
                                setTimeout(() => { this.processOne(modelService, realtimeType) }, 1);
                            })
                    })
                    .catch(error => {
                        // Something failed in saving, so tell them and continue processing the list
                        entry.append(" [Unable to Save:" + error + "]");
                        this.reportFailure('Unable to save model ' + modelId + " :" + error)
                        setTimeout(() => { this.processOne(modelService, realtimeType) }, 1);
                    })
            }).catch(error => {
                // We couldn't open the model, tell them and continue processing
                entry.append(" [Unable to Open:" + error + "]");
                this.reportFailure('Unable to open model ' + modelId + " :" + error)
                setTimeout(() => { this.processOne(modelService, realtimeType) }, 1);
            })
        }
    }
    /**
     * runLoginProcess prompts the user to verify the userid/password and
     *  then starts the sequence to login to convergence
     * @param msg Dialog message indication what process we are running
     * @param nextStep Code to run when the login is complete
     */
    public runLoginProcess(msg: string, nextStep: (modelService: ModelService) => void): void {
        $(".ans").empty();
        /**
         * Show the dialog for the userid/password
         */
        // Fill in the default userid/password
        $('#userid').val(this.state.userid);
        $('#password').val(this.state.password);
        // as well as the message for why we want to log in
        $("#actionprompt").text(msg);
        $('#oklogin')
            .removeAttr('disabled')
            .off('click')
            .on('click', () => {
                // They clicked ok, so retrieve the userid/password and remember it
                this.state.userid = $('#userid').val() as string;
                this.state.password = $('#password').val() as string;
                // Close the dialog and continue on the flow
                $('#logindlg').foundation('close');
                this.getSessionToken(nextStep);
            });
        $('#logindlg').foundation('open');
    }
    /**
     * getSessionToken logs into the server and gets the corresponding session token
     * We need the session token to be able to use the REST api as an admin
     * @param nextStep Code to run when the login is complete
     */
    public getSessionToken(nextStep: (modelService: ModelService) => void): void {
        const loginSettings = this.getConvergenceSettings();
        const url = loginSettings.baseUrl + "/rest/auth/login";

        $.ajax({
            url: url, // 'https://cosso.oit.ncsu.edu/rest/auth/login',
            type: 'POST',
            dataType: "json",
            data: JSON.stringify({ username: this.state.userid, password: this.state.password }),
            contentType: "application/json",
            success: (response) => {
                this.state.sessiontoken = response.body.token
                this.getAdminJWT(nextStep);
            },
            error: (err) => { this.reportFailure('Unable to connect:' + err); },
        });
    }
    /**
     * getAdminJWT retrieves the JWT that allows for admin access
     * This is used to allow us to log into the API as an admin
     * @param token Session token
     * @param nextStep Code to run when the login is complete
     */
    public getAdminJWT(nextStep: (modelService: ModelService) => void): void {
        const loginSettings = this.getConvergenceSettings();
        const url = loginSettings.baseUrl + "/rest/domains/" + loginSettings.namespace + "/" + loginSettings.domain + "/convergenceUserToken";

        $.ajax({
            url: url, // 'https://cosso.oit.ncsu.edu/rest/domains/convergence/scienceolympiad/convergenceUserToken',
            type: 'GET',
            beforeSend: (xhr) => {
                xhr.setRequestHeader('Authorization', 'SessionToken ' + this.state.sessiontoken);
            },
            success: (response) => {
                this.loginAdminJWT(response.body.token, nextStep)
            },
            error: (err) => { this.reportFailure('Unable to get convergenceUserToken:' + err); },
        });
    }
    /**
     * loginAdminJWT Does the final login and then invokes the desired process when complete
     * @param jwt JWT for admin access
     * @param nextStep Code to run when the login is complete
     */
    public loginAdminJWT(jwt: string, nextStep: (modelService: ModelService) => void): void {
        const loginSettings = this.getConvergenceSettings();
        const connectUrl = ConvergenceAuthentication.formatConnectUrl(
            loginSettings.baseUrl,
            loginSettings.namespace,
            loginSettings.domain
        );
        // If we requested debugging, then we need to tell Convergence about it
        if (loginSettings.domain) {
            Convergence.configureLogging({
                root: LogLevel.DEBUG,
                loggers: {
                    'protocol.ping': LogLevel.SILENT,
                },
            });
        }
        // Do the actual log into the server
        Convergence.connectWithJwt(connectUrl, jwt)
            .then(domain => {
                const modelService = domain.models();
                // Connection success! See below for the API methods available on this domainfor()
                $(".ans").append($("<div/>").text("Successfully connected"));
                nextStep(modelService)
            }).catch(err => {
                this.reportFailure('Unable to connect:' + err);
            });
    }
    /**
     * RememberUser tracks the user associations with a testmodel as well as any users which
     * are active in the system.
     * @param testid Test to associate the user with
     * @param userid user to remember
     */
    public RememberUser(testid: string, userid: string): void {
        if (userid !== undefined && userid !== "") {
            // This is a live user so we want to mark them as active so we don't delete them later
            this.state.activeUsers[userid] = true
            // If this is associated with a test, include the userid with the others for the test
            if (testid !== undefined && testid !== "") {
                if (this.state.activeTestUsers[testid] === undefined) {
                    this.state.activeTestUsers[testid] = {}
                }
                this.state.activeTestUsers[testid][userid] = true;
                console.log(this.state.activeTestUsers[testid])
            }
        }
    }
    /**
     * getTestUserString returns a comma separated string of all the users associated with a given test model
     * It is primarily use for debugging to show all the users
     * @param testid Model to get users for
     */
    public getTestUserString(testid: string): string {
        let result = "<EMPTY>"
        const testusers = this.state.activeTestUsers[testid]
        if (testusers !== undefined) {
            let extra = ""
            result = ""

            for (let userid in testusers) {
                result += extra + userid
                extra = ", "
            }
        }
        return result
    }
    /**
     * findActiveUsers locates all users known to the system.
     * This requires using the admin REST api
     * As each user is located, if they are no longer active then we need to delete them from the system.
     * This is the very last step in purging tests
     */
    public findActiveUsers() {
        //  We can find all the users by going to:
        //       https://cosso.oit.ncsu.edu/rest/domains/convergence/scienceolympiad/users
        const loginSettings = this.getConvergenceSettings();

        let url = loginSettings.baseUrl + "/rest/domains/" + loginSettings.namespace + "/" + loginSettings.domain + "/users";
        $.ajax({
            url: url,
            type: 'GET',
            beforeSend: (xhr) => {
                xhr.setRequestHeader('Authorization', 'SessionToken ' + this.state.sessiontoken);
            },
            success: (response) => {
                let cutoff = Date.now() - timestampFromMinutes(60 * 24 * 14)

                let ul = $("<ul/>");
                $(".ans").append($("<h2/>").text("Active users"))
                    .append(ul)
                response.body.forEach((element: { username: any; lastLogin: number; }) => {
                    let username = element.username
                    if (this.state.userid[username] === "Y") {
                        ul.append($("<li/>").text(username + " [Keep, still used]"))
                    } else if (element.lastLogin === undefined || element.lastLogin < cutoff) {
                        ul.append($("<li/>", { class: "purge" }).text(username + " [PURGE]"))
                        // Delete the user: TODO Make sure we are happy first
                        // https://cosso.oit.ncsu.edu/rest/domains/convergence/scienceolympiad/users/ABCDEFG
                        let url2 = loginSettings.baseUrl + "/rest/domains/" + loginSettings.namespace + "/" + loginSettings.domain + "/users" + "/" + username;
                        // $.ajax({
                        //     url: url2,
                        //     type: 'DELETE',
                        //     beforeSend: (xhr) => {
                        //         xhr.setRequestHeader('Authorization', 'SessionToken ' + this.state.sessiontoken);
                        //     },
                        //     success: (response) => {
                        //         ul.append(" [DELETED]")
                        //     },
                        //     error: (err) => {
                        //         ul.append(" [ERROR:" + err + "]")
                        //     }
                        // })
                    } else {
                        ul.append($("<li/>").text(username + " -- " + timestampToFriendly(element.lastLogin)))
                    }
                });
            },
            error: (err) => { this.reportFailure('Unable to get users:' + err); },
        });

    }
    /**
     * processUsersTakes the first entry off the list found and gets the user permissions for it.
     * Once it is complete, it sets a short timer to run the next one.
     * After all tests have been processes, it proceededs to process all the active users.
     * @param modelService Domain Model service object for making requests
     */
    public processActiveTests(modelService: ModelService): void {
        // Get the list of all remaining models to process
        let entries = $('li[data-entry]');
        if (entries.length > 0) {
            // We have at least one so get it
            let entry = entries[0];
            // Find the model id and if it is associated with a test model, get that test model
            let modelId = entry.getAttribute('data-entry')
            entry.removeAttribute('data-entry')
            let testId = entry.getAttribute('data-testid')
            if (testId === "" || testId === null) {
                testId = undefined
            }
            // Get the permissions associated with the model
            const permissionManager = modelService.permissions(modelId);
            permissionManager
                .getAllUserPermissions()
                .then((allPermissions) => {
                    let removes = ""
                    let userlist = ""
                    let extra = ""
                    let extrau = ""
                    allPermissions.forEach((permission, userid) => {
                        userlist += extrau + userid
                        extrau = ", "
                        if (testId !== undefined) {
                            // If this is a source or answermodel, then we have to remember that this
                            // user is associated with the test model
                            this.RememberUser(testId, userid)
                        } else if (permission.remove) {
                            // If the user has remove permissions, we always keep them on this model
                            this.RememberUser(modelId, userid)
                        } else if (this.state.activeTestUsers[modelId][userid] !== true) {
                            // The user is not active any more, so just remove them from this model
                            allPermissions.delete(userid);
                            removes += extra + userid
                            extra = ", "
                        }
                    })
                    // See if this is one that we need to update permissions on
                    if (testId === undefined) {
                        //
                        let newUserList = this.getTestUserString(modelId)
                        if (removes === "") {
                            entry.append(" [Processed: NO CHANGE USERS:" + newUserList + "]")
                        } else {
                            entry.append(" [Processed: Remove Users:" + removes + "]")
                            // Update the permissions now that we changed them TODO:
                            // permissionManager.setAllUserPermissions(allPermissions)
                            //     .then(() => { entry.append(" [UPDATED]") })
                            //     .catch(error => { entry.append(" [ERROR:" + error + "]") })
                        }
                    } else {
                        entry.append(" [Processed:" + userlist + " testid=" + testId + " == " + this.getTestUserString(testId) + "]");
                    }
                    // Process the next one in the list
                    setTimeout(() => { this.processActiveTests(modelService) }, 1);
                })
                .catch(error => {
                    // We couldn't get permissions, so report it and go onto the next one
                    entry.append(" [Unable to get permission:" + error + "]")
                    setTimeout(() => { this.processActiveTests(modelService) }, 1);
                })
        } else {
            // No more models to process, so go to the last step and process the active users to purge the ones we don't need anymore
            this.findActiveUsers();
            $(".ans").append($("<h2/>").text("DONE"))
        }
    }
    /**
     * findAllModels finds all models of a given type and adds them to the page to be processed
     * @param modelService Domain Model service object for making requests
     * @param realtimeType type of model to process.  One of: sourcemodel|testmodel|answertemplate
     * @param nextStep 
     */
    public findAllModels(modelService: ModelService, realtimeType: IRealtimeObject, nextStep: (modelService: ModelService) => void): void {
        modelService
            .query(this.collectionQuery[realtimeType])
            .then(results => {
                // For each model we just need to put in a bullet item with the modelid and testid if is present
                let ul = $("<ul/>");
                $(".ans")
                    .append($("<h2/>").text(realtimeType))
                    .append(ul)
                results.data.forEach((result) => {
                    ul.append($("<li/>", { 'data-entry': result.modelId, 'data-testid': result.data.testid }).text(result.modelId));
                })
                nextStep(modelService)
            })
            .catch(error => {
                this.reportFailure('error querying model:' + error)
            })
    }
    /**
     * findAllTestModels finds all of the tests.  Note that this must be last because the processing of it
     * depends on the Answer Templates and Source Models being processed first so that we truely know who should 
     * be on the test.
     * @param modelService Domain Model service object for making requests
     */
    public findAllTestModels(modelService: ModelService): void {
        this.findAllModels(modelService, 'testmodel', () => { this.processActiveTests(modelService) });
    }
    /**
     * findAllAnswerTemplates finds all active answer templates
     * @param modelService Domain Model service object for making requests
     */
    public findAllAnswerTemplates(modelService: ModelService): void {
        this.findAllModels(modelService, 'answertemplate', () => { this.findAllTestModels(modelService) });
    }
    /**
     * findAllSourceModels finds all the active source models in the system
     * @param modelService Domain Model service object for making requests
     */
    public findAllSourceModels(modelService: ModelService): void {
        this.findAllModels(modelService, 'sourcemodel', () => { this.findAllAnswerTemplates(modelService) });
    }
    /**
     * doPurge does the work of purging old models
     * @param modelService Domain Model service object for making requests
     */
    public doPurge(modelService: ModelService): void {
        $(".ans").empty().append($("<div/>").text("Purging tests."))

        let cutoff = Date.now() - timestampFromMinutes(60 * 24 * 14)
        // Start out by finding all the models which are older than 2 weeks and can be purged.
        modelService
            .query('SELECT endtime,assigned,testid FROM codebusters_answers')
            .then(results => {
                // We have some models, so first let's get a working space to record what we learn
                // activeUsers tracks all users which are expected to still reference models when we are complete
                // If we have been here before, just wipe out the map, otherwise create a new one to work fomr
                if (this.state.activeUsers !== undefined) {
                    this.state.activeUsers.clear()
                } else {
                    this.state.activeUsers = new Map()
                }
                // Make sure we never delete the admin accounts
                this.state.activeUsers['admin'] = true
                this.state.activeUsers['rlabaza'] = true
                // activeTestUsers tracks which users are associated with a specific test
                if (this.state.activeTestUsers !== undefined) {
                    this.state.activeTestUsers.clear()
                } else {
                    this.state.activeTestUsers = new Map()
                }
                // Display a list of all the active answermodels along with who is assigned to the model
                let ul = $("<ul/>");
                $(".ans").append(ul)
                // Work through the list of all models returned
                results.data.forEach((result) => {
                    // Construct the list of users so we can display it
                    let thisusers = ""
                    let extra = ""
                    // If this test is more than 2 weeks old we can purge it
                    let purge = (result.data.endtime < cutoff)

                    // Figure out what users we have in the answer model
                    result.data.assigned.forEach((assigned: { userid: string; }) => {
                        // As long as it isn't blank we want to track them
                        if (assigned.userid !== "") {
                            thisusers += extra + assigned.userid
                            extra = ", "
                            if (!purge) {
                                this.RememberUser(result.data.testid, assigned.userid)
                                // If this test is active then we want to keep the users on it.
                                this.state.activeUsers[assigned.userid] = true
                            }
                        }
                    })
                    // Let us know what the plan is for the test.  Note that if it has data-entry associated with it
                    // it will be processed to extract the permissions as part of the final steps
                    if (purge) {
                        ul.append($("<li/>", { class: "purge" }).text(result.modelId + " endtime:" + timestampToFriendly(result.data.endtime) + " -- " + thisusers));
                        // Remove the model (TODO: Enable this once we are happy with the code)
                        // modelService.remove(result.modelId).then(() => {
                        //     ul.append($("<b/>").text("[REMOVED]"))
                        // }).catch(error => {
                        //     ul.append($("<b/>").text("[ERROR:" + error + "]"))
                        // })
                    } else {
                        ul.append($("<li/>", { 'data-entry': result.modelId, 'data-testid': result.data.testid }).text(result.modelId + " Purge:" + purge + " endtime:" + timestampToFriendly(result.data.endtime) + " -- " + thisusers));
                    }
                })
                // We have all the answer models, so next we go for the source models
                this.findAllSourceModels(modelService);
            })
            .catch(error => {
                this.reportFailure('error querying model:' + error)
            })
    }
    /**
     * MigrateModels copies all files of one type to the new server
     * @param realtimeType type of model to process.  One of: sourcemodel|testmodel|answertemplate
     */
    public MigrateModels(realtimeType: IRealtimeObject): void {
        $(".ans").empty().append("Looking for tests to migrate to " + realtimeType);
        if (!this.confirmedLoggedIn(' in order to migrate tests.', $(".ans"))) {
            return;
        }

        this.runLoginProcess("This will copy all the existing tests from the Convergence server to the new API", (modelService: ModelService) => { this.findModels(modelService, realtimeType) })
    }
    /**
     * PurgeOldTests purges any tests which are more than 2 weeks old
     */
    public PurgeOldTests(): void {
        $(".ans").empty().append("Looking for tests");

        if (!this.confirmedLoggedIn(' in order to purge tests.', $(".ans"))) {
            return;
        }

        this.runLoginProcess("This will purge all taken tests older than two weeks from the server.", (modelService: ModelService) => { this.doPurge(modelService) })
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();

        $('#repsrc')
            .off('click')
            .on('click', () => {
                this.MigrateModels('sourcemodel');
            });
        $('#reptst')
            .off('click')
            .on('click', () => {
                this.MigrateModels('testmodel');
            });
        $('#repans')
            .off('click')
            .on('click', () => {
                this.MigrateModels('answertemplate');
            });


        $('#purge')
            .off('click')
            .on('click', () => {
                this.PurgeOldTests();
            });

    }
}
