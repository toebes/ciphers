import { CipherTestManage } from './ciphertestmanage';
import { toolMode, IState, CipherHandler } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { BoolMap, cloneObject, StringMap, timestampFromMinutes, timestampToFriendly } from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { JTFDialog } from '../common/jtfdialog';
import { ConvergenceAuthentication } from './authentication';
import Convergence = require('@convergence/convergence');
import { LogLevel, ModelService, RealTimeModel } from '@convergence/convergence';
import { globalPermissionId, IAnswerTemplate, IRealtimeObject, RealtimeSinglePermission } from './ciphertest';
import { EnsureUsersExistParameters } from './api';


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
    /** Where we are in the list of models */
    currentslot?: number
    jwt?: string
}

/**
 * CipherMaintenance
 *   This allows for migrating and deleting old tests/users from the server
 */
export class CipherMaintenance extends CipherTestManage {
    private todelete: BoolMap = {
        "274e818c-7d98-4b0d-a923-56eb2aa4bc2b": true,
        "037b416f-feaf-45cd-a888-8d3e387a6439": true,
        "4aeb71a2-1011-4c4a-affc-6db1e2f51284": true,
        "60b53a7d-a63a-482c-a274-31101efea475": true,
        "98318a5b-af65-4e5a-8f8f-77be95174636": true,
        "623cccce-43c8-4ebc-9b3d-7a5437eb9077": true,
        "dc88f4c7-eb1c-44fc-ad47-cdce5c4f827c": true,
        "f002b84d-6cf1-4f65-9dc0-0bd55c81a044": true,
        "34aa292c-701a-4d36-8594-0bf35c68ec83": true,
        "54d0dd61-bf57-4a0b-b288-825fd99d0bb0": true,
        "08d26277-de68-4c98-b49f-2b25da346065": true,
        "ec1a5316-651e-4048-86f2-64acb0ab456b": true,
        "e817ddd2-b5ca-44ef-9b5b-f5cc82b799b2": true,
        "44fba5d2-c827-4eb3-a534-b57ad1609e18": true,
        "295898ad-dc26-4541-ad40-901d96e3ad90": true,
        "08616d0b-eb25-4bff-854f-85e6a806846a": true,
        "fad8715c-66a8-4839-98f2-b36ee21402c5": true,
        "a4eb6543-4e2b-4746-8e6e-ec3508be7cd1": true,
        "9467791c-de58-4d34-bbb9-1e9ddbf57b6b": true,
        "68313ace-9391-4a82-b475-81599e639f99": true,
        "5e409006-7ff5-43a8-854d-a325decbaa51": true,
        "3d1bf8f1-f499-4fa8-9b05-7c4f80a9fb27": true,
        "3488244b-a545-40f0-853b-21c174211ee2": true,
        "cafe9056-5453-4e1e-8edd-53431c6af2f9": true,
        "56a17551-9a38-47a6-9164-04b337f757b9": true,
        "e60b4d43-932e-4958-8835-f1b5ba7d56c5": true,
        "bf723a3a-3957-43cf-b14d-4a9f51496580": true,
        "c24e1d62-a4c6-471d-aa4f-430a2c833e1d": true,
        "3fe856be-5a8d-44de-b821-5892078b9e25": true,
        "4e1e4b3f-bb4b-4f82-97a8-79e96c26e3e1": true,
        "0951978a-0484-4d0e-ada5-36ba72dc2eef": true,
        "5847fc2b-a280-431e-b232-1cd339fafc51": true,
        "86cbffac-ec85-484b-8bdc-0db1f7098de8": true,
        "4aa63f5d-73f6-43f5-8529-101e7d8563a6": true,
        "4bb366d9-8a99-4612-9635-8f5cf2426b37": true,
        "a3a4bfc0-d45e-407e-8163-aec8593c4c7f": true,
        "221ca4f9-6aef-48b5-8d81-89ea8cf4d0d0": true,
        "e642f321-dd72-4324-b7c5-c8403133af17": true,
        "cab2c91e-6259-4e62-aaf7-89e326b3b706": true,
        "70ebb848-37e2-46bd-adab-bfd741ec52b9": true,
        "3596a921-57cc-48e8-8219-9d57bb7ceb47": true,
        "ebe7191f-a974-42cc-a432-d64066be92ad": true,
        "591d5682-92fb-4463-a01b-79d7adafb736": true,
        "8f6eac60-d0c4-4420-a4c8-2d8fedc0560f": true,
        "00544b00-5eff-4c96-9770-8eb568a8de56": true,
        "9de5be9a-186b-4e2c-acc4-1a9a8e869242": true,
        "0cd6c87f-b7c7-40b0-b677-b906cb3b3980": true,
        "fd7fde42-079e-4933-a2d6-f8113dbba2d6": true,
        "7d255e28-144a-4fb5-9ece-537f4c5e044e": true,
        "d444f788-ba9a-4073-bb4c-a2fd8d5b0484": true,
        "acd587f1-138f-43b7-8b5f-8cf91848cfd8": true,
        "0138f2cb-88b6-48d0-bf59-6dc33bb462d9": true,
        "0b073371-c0e3-4058-ac88-c0c2dd550b9e": true,
        "d54eb763-023a-41b9-911f-7fca81a5e9d5": true,
        "9d0596b3-f50a-4c44-9b02-663c9070bde1": true,
        "910fec37-ced7-4e15-b489-876e27f418ca": true,
        "de815c2c-f8cb-4d7d-9992-f3c2c4618c79": true,
        "6e8e8080-664c-4372-be21-c3969753ba8a": true,
        "7b6a5c7d-705f-4635-ba63-54b1319f01fa": true,
        "22ab5b83-032a-4ff0-9317-3430176e7022": true,
        "f1889a94-4c7b-4bef-a380-f0eb098e1c2b": true,
        "96533474-f0c4-4e54-ad9b-9337083bb951": true,
        "a564da26-7410-43b9-8389-af6fe9bb41cd": true,
        "dd0d3985-43c5-40ea-8719-8369423143e1": true,
        "81360190-7d13-4ad3-8984-029aef39c09f": true,
        "688920d7-024c-4db8-aa54-d358e486d56a": true,
        "582b1506-4f94-405d-a65d-4bd886126dc9": true,
        "bc95e668-3cfc-49f5-bf16-a2f62443b434": true,
        "57a4315e-a7ec-4919-bc0a-0d214c9cdeac": true,
        "67d7d9e7-2e0c-4e58-97b8-b8e88149ab4e": true,
        "b4edf664-d4a8-4487-bf58-5d1c4f9a2460": true,
        "1e74b06e-2fa6-420a-b293-a636d034fbe5": true,
        "5534ca5c-9bfe-457d-96eb-362ac05ed1e0": true,
        "e87b6cc3-1847-4d69-ada4-d422bd928f47": true,
        "aff2eb99-ef13-4df4-99d2-0bcabc5f599f": true,
        "10eab5f4-6a7e-48d7-8f6a-2b7d553afe0f": true,
        "d364e2b2-a1ad-4185-b377-0ecf473aacd3": true,
        "ea2e5465-e2e4-4b8b-aa2b-9a6420a3cd7d": true,
        "16acf39e-68ce-4577-8f30-ddb50a0e40a2": true,
        "d50d2986-0f73-49e8-8ba1-d08a89eec1d8": true,
        "8c2707df-080f-4faf-840f-0699ae1aee41": true,
        "7ac57b60-f450-43bd-ad0d-c32e4d24fc1a": true,
        "f161ec74-61e3-4f81-a559-f7bb2b033bbb": true,
        "cf6a4c35-9b51-45a0-b986-4a1a4b156e34": true,
        "e4ffa3c5-d4d6-4dc8-84c3-45116d4843bc": true,
        "8a3fa12a-47d0-477f-a9f0-12e52c33c60b": true,
        "ac8a0354-9bf2-4a87-b8e3-da7f938b1b56": true,
        "3320642a-5845-4565-a331-90547ca5e498": true,
        "6dd6933b-a720-44ee-8fdc-96843baff76d": true,
        "fa996a9c-5840-4ba7-b77e-406dab53f2bb": true,
        "c3ef912d-9150-4d8f-b6a6-e76b3cfbf3dc": true,
        "2cf85e21-e0dc-4b6d-9bc2-9b3829e838b8": true,
        "df505319-6ef0-4ab9-9e91-2eb65c0ee4f5": true,
        "9548e876-de34-48f4-bf0a-0294806934ce": true,
        "b75c61e7-aa80-4d1b-b395-6e2bae0cb634": true,
        "ddbd5561-1e7e-4c36-9eec-be1dcf94ba3f": true,
        "0adf13a9-25c6-42fe-b428-64071dbf201d": true,
        "64d6f5c6-c98b-4349-95d0-f29480bd5d26": true,
        "59edaa57-4171-45aa-a619-fa4933958e84": true,
        "871ec65c-0aad-4477-b5bf-af0c8d555444": true,
        "e044a665-a8ac-4886-81e9-1ade6ea5a0a7": true,
        "d057360f-f969-4357-b94c-07bc670c3f5b": true,
        "6b20c4bc-1495-4ffd-b7da-b38a4629e7e6": true,
        "a4a3b73d-6c31-49f9-93fb-91d8aba84599": true,
        "4943d6af-ed20-4cd6-8a55-40d1cc3b56f4": true,
        "955dfc74-5a41-46a6-8ab6-110e19f29681": true,
        "0002daf8-3fbf-4fc8-8b20-4ae3d6aff59e": true,
        "887f46ff-2312-48e7-b048-9ce153a2942c": true,
        "6f24f1a3-6ce0-418b-9f5b-a62b344fb9a3": true,
        "cbe7a41f-87ec-4309-9294-66895c08c459": true,
        "6f3777c3-ae24-40a6-b50f-7ede3ce651c4": true,
        "f950cee8-7be2-4dce-8775-2c04ac243d7c": true,
        "937b236c-ecf8-4bfa-8486-82b1515eeb4c": true,
        "2bb6eb36-f30c-4302-8ad1-23de583fa5e5": true,
        "3c1eae7b-3a74-44a7-bbc9-52680566e3f4": true,
        "fe9d915c-7ea6-4b5b-b252-616ac7650cc6": true,
        "75df8e25-f06f-4aae-aabe-70afa0a93cb4": true,
        "a6d0e2eb-7800-4b5e-a632-96a49cc23650": true,
        "75cb2719-4128-4201-9c85-5397b7eb73e2": true,
        "64c2f20b-eaaa-438d-a9f0-fb241dd473c4": true,
        "76b8be24-97a9-4c2a-be14-531c4ac4d748": true,
        "44ee4342-2c3d-4b49-920c-421e3e23a168": true,
        "7918cfb2-05eb-412e-84f0-c02ae76cecf6": true,
        "6a75ed53-fb56-4fb0-a293-03e4ea03e9bf": true,
        "1201b0b6-1620-4cd5-8972-6632d6ac3f7c": true,
        "96cec1ad-2d5e-4ec5-a968-2627e08a3d7f": true,
        "dff04507-e709-422b-b04b-3bdd98325fe0": true,
        "cf3ce7e6-c0e9-4b42-8938-70b057f94b24": true,
        "e9b382f9-299b-4672-a2cc-c99145c00a2b": true,
        "ff99a079-3629-42c3-b891-5dbb37802623": true,
        "2108be7b-12b9-4928-94d1-583b70125ad9": true,
        "cafa8a12-1e06-42ca-ae2c-b5d5fb860a62": true,
        "9d66684f-fcd6-4d6b-85f3-c868859c469d": true,
        "601c68b7-ce33-4986-b201-a78cab0596e4": true,
        "6067a3fa-52cc-4f5c-bd66-6ea05ab95f82": true,
        "cf82ff86-3785-4ba5-a66a-3dd37c49a3d3": true,
        "2852262e-f260-4911-aa35-a3435a038d74": true,
    }
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: MaintenanceState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: MaintenanceState = cloneObject(this.defaultstate) as IState;
    /** Command buttons */
    public cmdButtons: JTButtonItem[] = [
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
     * genPreCommands() Generates HTML for any UI elements that go above the command bar
     * @returns HTML DOM elements to display in the section
     */
    public genPreCommands(): JQuery<HTMLElement> {
        return null;
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
        this.state.jwt = jwt
        const options: Convergence.IConvergenceOptions = {
            protocol: { defaultRequestTimeout: 30 },
            connection: { timeout: 30 },
        };
        options.connection.timeout = 30;

        // If we requested debugging, then we need to tell Convergence about it
        if (loginSettings.debug) {
            Convergence.configureLogging({
                root: LogLevel.DEBUG,
                loggers: {
                    'protocol.ping': LogLevel.SILENT,
                },
            });
        }
        // Do the actual log into the server
        Convergence.connectWithJwt(connectUrl, jwt, options)
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
                let activeUsers = 0
                let purgedUsers = 0

                let ul = $("<ul/>");
                $(".ans").append($("<h2/>").text("Active users"))
                    .append(ul)
                response.body.forEach((element: { username: any; lastLogin: number; }) => {
                    let username = element.username
                    if (this.state.userid[username] === "Y") {
                        activeUsers++
                        ul.append($("<li/>").text(username + " [Keep, still used]"))
                    } else if (element.lastLogin === undefined || element.lastLogin < cutoff) {
                        purgedUsers++
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
                        activeUsers++
                        ul.append($("<li/>").text(username + " -- " + timestampToFriendly(element.lastLogin)))
                    }
                });
                $(".ans").append($("<p/>").text((activeUsers + purgedUsers) + " Total users. " + activeUsers + " Kept " + purgedUsers + " Removed."))
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
        let entries0 = $('li[data-purge]')
        if (entries0.length > 0) {
            let entry = entries0[0];
            let modelId = entry.getAttribute('data-purge')
            entry.removeAttribute('data-purge')
            $(entry).append(' [WILL REMOVE: ' + modelId + "]")

            // Remove the model (TODO: Enable this once we are happy with the code)
            modelService.remove(modelId).then(() => {
                $(entry).append($("<b/>").text("[REMOVED]"))
                setTimeout(() => { this.processActiveTests(modelService) }, 4000);
            }).catch(error => {
                $(entry).append($("<b/>").text("[ERROR:" + error + "]"))
                setTimeout(() => { this.processActiveTests(modelService) }, 4000);
            })
        } else {

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
                let isconvergence = (entry.getAttribute('data-convergence') == "1")

                if (isconvergence) {
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
                            entry.append(" [Processed:" + userlist + " testid=" + testId + " == " + this.getTestUserString(testId) + "]");
                            // Process the next one in the list
                            setTimeout(() => { this.processActiveTests(modelService) }, 1);
                        })
                        .catch(error => {
                            // We couldn't get permissions, so report it and go onto the next one
                            entry.append(" [Unable to get permission:" + error + "]")
                            setTimeout(() => { this.processActiveTests(modelService) }, 1);
                        })
                } else {
                    // New model type. Use 
                    this.getRealtimePermissions(modelId).then((permissionset) => {
                        let removes = ""
                        let removeset = []
                        let userlist = ""
                        let extra = ""
                        let extrau = ""

                        for (let userid in permissionset) {
                            userlist += extrau + userid
                            extrau = ", "
                            if (testId !== undefined) {
                                // If this is a source or answermodel, then we have to remember that this
                                // user is associated with the test model
                                this.RememberUser(testId, userid)
                            } else if (permissionset[userid].remove) {
                                // If the user has remove permissions, we always keep them on this model
                                this.RememberUser(modelId, userid)
                            } else if (this.state.activeTestUsers[modelId][userid] !== true) {
                                // The user is not active any more, so just remove them from this model
                                removeset = removeset.concat(userid)
                                removes += extra + userid
                                extra = ", "
                            }
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
                        }

                    })
                        .catch(error => {
                            // We couldn't get permissions, so report it and go onto the next one
                            entry.append(" [Unable to get realtime permission:" + error + "]")
                            setTimeout(() => { this.processActiveTests(modelService) }, 1);
                        })
                }
            } else {
                // No more models to process, so go to the last step and process the active users to purge the ones we don't need anymore
                this.findActiveUsers();
                $(".ans").append($("<h2/>").text("DONE"))
            }
        }
    }
    /**
     * findAllModels finds all models of a given type and adds them to the page to be processed
     * @param modelService Domain Model service object for making requests
     * @param realtimeType type of model to process.  One of: sourcemodel|testmodel|answertemplate
     * @param nextStep 
     */
    public findAllModels(modelService: ModelService, realtimeType: IRealtimeObject, nextStep: (modelService: ModelService) => void): void {
        this.getRealtimeMetadata(realtimeType)
            .then(results => {
                // For each model we just need to put in a bullet item with the modelid and testid if is present
                let ul = $("<ul/>");
                $(".ans")
                    .append($("<h2/>").text(realtimeType))
                    .append(ul)
                results.forEach((result) => {
                    ul.append($("<li/>", { 'data-entry': result.id, 'data-testid': result.testid }).text(result.id));
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
                let totalAnswers = 0
                let totalPurged = 0
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
                    if (this.todelete[result.modelId]) {
                        purge = true;
                    }

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
                        ul.append($("<li/>", { class: "purge", "data-purge": result.modelId }).text(result.modelId + " endtime:" + timestampToFriendly(result.data.endtime) + " -- " + thisusers));
                        totalPurged++
                        // Remove the model (TODO: Enable this once we are happy with the code)
                        // modelService.remove(result.modelId).then(() => {
                        //     ul.append($("<b/>").text("[REMOVED]"))
                        // }).catch(error => {
                        //     ul.append($("<b/>").text("[ERROR:" + error + "]"))
                        // })
                    } else {
                        totalAnswers++
                        ul.append($("<li/>", { 'data-entry': result.modelId, 'data-testid': result.data.testid, 'data-convergence': 1 }).text(result.modelId + " Purge:" + purge + " endtime:" + timestampToFriendly(result.data.endtime) + " -- " + thisusers));
                    }
                })
                $(".ans").append($("<p/>").text((totalAnswers + totalPurged) + " Answer Models. " + totalAnswers + " Kept " + totalPurged + " Removed."))
                // We have all the answer models, so next we go for the source models
                this.findAllSourceModels(modelService);
            })
            .catch(error => {
                this.reportFailure('error querying model:' + error)
            })
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

        $('#purge')
            .off('click')
            .on('click', () => {
                this.PurgeOldTests();
            });
    }
}
