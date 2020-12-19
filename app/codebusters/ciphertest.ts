import { cloneObject, NumberMap } from '../common/ciphercommon';
import {
    CipherHandler,
    IRunningKey,
    IState,
    ITest,
    ITestType,
    toolMode,
    IQuestionData,
    ITestQuestionFields,
    IInteractiveTest,
} from '../common/cipherhandler';
import { getCipherTitle, ICipherType } from '../common/ciphertypes';
import { JTButtonItem } from '../common/jtbuttongroup';
import { JTRadioButton, JTRadioButtonSet } from '../common/jtradiobutton';
import { JTTable } from '../common/jttable';
import { CipherPrintFactory } from './cipherfactory';
import { ConvergenceDomain, IAutoCreateModelOptions, LogLevel, ModelPermissions, RealTimeModel } from '@convergence/convergence';
import {
    ConvergenceAuthentication,
    ConvergenceSettings,
    ConvergenceLoginParameters,
} from './authentication';
import Convergence = require('@convergence/convergence');

export interface buttonInfo {
    title: string;
    btnClass: string;
    disabled?: boolean;
}

export type modelID = string;
export type IRealtimeObject = 'sourcemodel' | 'testmodel' | 'answertemplate' //| 'answermodel'
export type IRealtimeFields = 'testid' | 'sourceid' | 'answerid' | 'title' | 'questions'
export interface IRealtimeMetaData {
    id: modelID;
    type: IRealtimeObject;
    testid: modelID;
    sourceid: modelID;
    answerid: modelID;
    title: string;
    questions: number;
    dateCreated: number;
    createdBy: string;
}
export interface sourceModel {
    [key: string]: any;
}

export interface anyMap {
    [key: string]: any;
}

export const globalPermissionId = 'GLOBAL'
/**
 * Permissions for a single item
 * Read - Access to view the model
 * Write - Permission to change the model (or delete self permissions)
 * Remove - Permission to delete the object
 * Manage - Permission to set permission for other users on the model
 */
export interface RealtimeSinglePermission {
    read: boolean;
    write: boolean;
    remove: boolean;
    manage: boolean;
}

/**
 * Permissions for an element.  The string GLOBAL is associated with
 * overall permissions for everyone to use.
 */
export interface RealtimePermissionSet {
    [index: string]: RealtimeSinglePermission;
}


export interface ITestState extends IState {
    /** Number of points a question is worth */
    points?: number;
    /** Which test the handler is working on */
    test?: number;
    /** Show the solutions on the answers */
    sols?: string;
    /** A URL to to import test date from on load */
    importURL?: string;
    /** Which division they are doing the test for */
    testtype?: ITestType;
    /** UID of the interactive test to run  */
    testID?: string;
}

interface INewCipherEntry {
    cipherType: ICipherType;
    /** Optional language string */
    lang?: string;
    /** Optional title to override the default title */
    title?: string;
}

interface ITestTypeInfo {
    title: string;
    type: ITestType;
    id: string;
}

export interface ITestUser {
    userid: string;
    displayname: string;
    starttime: number;
    idletime: number;
    confidence: number[];
    notes: string;
    sessionid: string;
}
export interface IAnswerTemplate {
    testid: string;
    starttime: number;
    endtime: number;
    endtimed: number;
    answers: ITestQuestionFields[];
    assigned: ITestUser[];
    teamname: string;
    teamtype: string;
}

export type ITestDisp = 'testedit' | 'testprint' | 'testans' | 'testsols' | 'testint';
export type ITestManage = 'local' | 'published';
export type IPublishDisp = ITestManage | 'permissions' | 'schedule' | 'results';
/**
 * Base support for all the test generation handlers
 */
export class CipherTest extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.None,
        testtype: ITestType.None,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [
        { title: 'New Test', color: 'primary', id: 'newtest' },
        {
            title: 'Export Tests',
            color: 'primary',
            id: 'export',
            disabled: true,
        },
        { title: 'Import Tests from File', color: 'primary', id: 'import' },
        { title: 'Import Tests from URL', color: 'primary', id: 'importurl' },
    ];

    public testTypeMap: ITestTypeInfo[] = [
        {
            title: 'C (High School) - Invitational/Regional',
            type: ITestType.cregional,
            id: 'cregional',
        },
        {
            title: 'C (High School) - State/National',
            type: ITestType.cstate,
            id: 'cstate',
        },
        {
            title: 'B (Middle School) - Invitational/Regional',
            type: ITestType.bregional,
            id: 'bregional',
        },
        {
            title: 'B (Middle School) - State/National',
            type: ITestType.bstate,
            id: 'bstate',
        },
        {
            title: 'A (Elementary School) - Invitational/Regional',
            type: ITestType.aregional,
            id: 'aregional',
        },
    ];
    public cipherChoices: INewCipherEntry[] = [
        { cipherType: ICipherType.Affine },
        { cipherType: ICipherType.Caesar },
        { cipherType: ICipherType.Atbash },
        { cipherType: ICipherType.Aristocrat },
        {
            cipherType: ICipherType.Aristocrat,
            lang: 'es',
            title: 'Spanish Aristocrat',
        },
        { cipherType: ICipherType.Patristocrat },
        { cipherType: ICipherType.Hill },
        { cipherType: ICipherType.Vigenere },
        { cipherType: ICipherType.RunningKey },
        { cipherType: ICipherType.Baconian },
        { cipherType: ICipherType.RSA },
        { cipherType: ICipherType.PigPen },
        { cipherType: ICipherType.TapCode },
        { cipherType: ICipherType.Morbit },
        { cipherType: ICipherType.Pollux },
        { cipherType: ICipherType.Railfence },
    ];
    /**
     * Stash of the current questions
     */
    public qdata: IQuestionData[];
    /**
     * Any running keys used for the test
     */
    public runningKeys: IRunningKey[];
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
     * Create the tab buttons on the top of the page
     * @param testdisp Default state for this page
     * @returns JQuery elements for managing the state
     */
    public genTestEditState(testdisp: ITestDisp): JQuery<HTMLElement> {
        const radiobuttons = [
            { title: 'Edit Test', value: 'testedit' },
            { title: 'Test Packet', value: 'testprint' },
            { title: 'Answer Key', value: 'testans' },
            { title: 'Answers and Solutions', value: 'testsols' },
            { title: 'Interactive Test', value: 'testint' },
        ];
        return JTRadioButton(8, 'testdisp', radiobuttons, testdisp);
    }
    /**
     * Create the tab buttons on the top of the page
     * @param testdisp Default state for this page
     * @returns JQuery elements for managing the state
     */
    public genPublishedEditState(testdisp: IPublishDisp): JQuery<HTMLElement> {
        const radiobuttons = [
            { title: 'Published', value: 'published' },
            { title: 'Permissions', value: 'permissions' },
            { title: 'Schedule Test', value: 'schedule' },
            { title: 'Test Results', value: 'results' },
        ];
        return JTRadioButton(8, 'pubdisp', radiobuttons, testdisp);
    }
    /**
     * Put up the test management radio button for selecting which tests to view.
     * @param testmanage State
     */
    public genTestManageState(testmanage: ITestManage): JQuery<HTMLElement> {
        const radiobuttons = [
            { title: 'Local', value: 'local' },
            { title: 'Published', value: 'published' },
        ];
        return JTRadioButton(8, 'testmanage', radiobuttons, testmanage);
    }
    /**
     * Report an error to the user.  This creates a closable warning box placed into the ans section
     * @param msg Error message to display
     */
    public reportFailure(msg: string): void {
        console.log(msg);
        let errloc = $('.ans');
        if (errloc.length === 0) {
            // If they don't have an ans class then look for the testerrors class
            errloc = $('.testerrors');
            if (errloc.length === 0) {
                // Not even that class, so just create a new one
                $('body').append($('<div/>', { class: 'ans' }));
                errloc = $('.ans');
            }
        }
        errloc.append(
            $('<div/>', { class: 'callout warning', 'data-closable': '' })
                .append($('<p/>').text(msg))
                .append(
                    $('<button/>', {
                        class: 'close-button',
                        'aria-label': 'Dismiss alert',
                        type: 'button',
                        'data-close': '',
                    }).append($('<span/>', { 'aria-hidden': 'true' }).html('&times;'))
                )
        );
    }
    /**
     * getInteractiveURI gets the URI to call for the interactive collaboration.
     * It defaults to a public server, but can be overridded with a local configuration value stored in "domain"
     * @returns string corresponding to the interactive API to call
     */
    public getInteractiveURI(): string {
        return (
            this.getConfigString('domain', 'https://cosso.oit.ncsu.edu/') +
            'api/realtime/convergence/scienceolympiad'
        );
    }

    /**
     * Retrieves the default login parameters for Convergence from storage.
     * Default uses Anonymous for userid,  No for fname, and Name for lname.
     * @returns ConvergenceLoginParameters
     */
    public getConvergenceLoginParameters(): ConvergenceLoginParameters {
        const username = this.getConfigString('userid', 'Anonymous');
        const firstName = this.getConfigString('fname', 'No');
        const lastName = this.getConfigString('lname', 'Name');
        return { username: username, firstName: firstName, lastName: lastName };
    }

    /**
     * Creates the default convergence settings to use for authentication.
     * If any field is missing will return null.
     * @returns ConvergenceSettings (Or null for failure)
     */
    public getConvergenceSettings(): ConvergenceSettings {
        const baseUrl = this.getConfigString('domain', 'https://cosso.oit.ncsu.edu/');
        const privateKey = ConvergenceAuthentication.getLocalPrivateKey();
        const convergenceNamespace = this.getConfigString('convergenceNamespace', 'convergence');
        const convergenceDomain = this.getConfigString('convergenceDomain', 'scienceolympiad');
        const convergenceKeyId = this.getConfigString('convergenceKeyId', 'TestingKeyId');
        const convergenceDebug = this.getConfigString('convergenceDebug', '');

        if (
            baseUrl === null ||
            privateKey === null ||
            convergenceNamespace == null ||
            convergenceDomain === null ||
            convergenceKeyId === null
        ) {
            return null;
        } else {
            return {
                baseUrl: baseUrl,
                namespace: convergenceNamespace,
                privateKey: privateKey,
                domain: convergenceDomain,
                keyId: convergenceKeyId,
                debug: convergenceDebug !== '',
            };
        }
    }

    /**
     * Note: Do not use catch (Is never thrown)
     * @returns Promise ConvergenceDomain to interact with
     */
    public connectRealtime(): Promise<ConvergenceDomain> {
        const loginSettings = this.getConvergenceSettings();
        const connectUrl = ConvergenceAuthentication.formatConnectUrl(
            loginSettings.baseUrl,
            loginSettings.namespace,
            loginSettings.domain
        );

        const convergenceToken = this.getConfigString(CipherHandler.KEY_CONVERGENCE_TOKEN, '');
        return new Promise((resolve) => {
            let options: Convergence.IConvergenceOptions = {
                protocol: { defaultRequestTimeout: 30 },
                connection: { timeout: 30 },
            };
            options.connection.timeout = 30;

            if (loginSettings.debug) {
                Convergence.configureLogging({
                    root: LogLevel.DEBUG,
                    loggers: {
                        'protocol.ping': LogLevel.SILENT,
                    },
                });
            }

            Convergence.connectWithJwt(connectUrl, convergenceToken, options)
                .then((domain) => {
                    resolve(domain);
                })
                .catch((error) => {
                    if (convergenceToken.length == 0) {
                        this.reportFailure('Please sign in to see this page');
                    } else {
                        console.log(
                            'An error occurred while trying to connect to realtime: ' + error
                        );
                        this.deleteConfigString(CipherHandler.KEY_CONVERGENCE_TOKEN);
                        this.goToAuthenticationPage();
                    }
                });
        });
    }
    /**
     * Determine if a user is logged in and generate a message if not
     * @param msg Message to append to please login message
     * @param elem Element to append message to
     * @returns Boolean indicating that a user is validly logged in
     */
    public confirmedLoggedIn(msg: string, elem: JQuery<HTMLElement>): boolean {
        const userid = this.getConfigString('userid', '');
        if (userid !== '') {
            return true;
        }
        const callout = $('<div/>', {
            class: 'callout alert',
        })
            .append('Please ')
            .append(
                $('<div/>', {
                    class: 'login-button button',
                }).text('Login')
            )
            .append(' in order to see tests assigned to you.');
        elem.append(callout);
        return false;
    }
    /** Cached realtime domain */
    public cachedDomain: ConvergenceDomain = undefined;
    /**
     * Disconnect from the realtime system
     */
    public disconnectRealtime(): void {
        if (this.cachedDomain !== undefined) {
            this.cachedDomain.disconnect();
            this.cachedDomain = undefined;
        }
    }
    /**
     * Connect to the realtime system (using the cached entry if necessary)
     * Catch window close events to disconnect from the domain
     * @returns ConvergenceDomain to use for operations
     */
    public cacheConnectRealtime(): Promise<ConvergenceDomain> {
        if (this.cachedDomain !== undefined) {
            const result = Promise.resolve(this.cachedDomain);
            return result;
        }

        $(window).on('beforeunload', () => {
            this.disconnectRealtime();
        });

        return new Promise((resolve, reject) => {
            this.connectRealtime()
                .then((domain: ConvergenceDomain) => {
                    this.cachedDomain = domain;
                    resolve(domain);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    /*-------------------------------------------------------------------------*/
    /*                   Realtime Model Service Routines                       */
    /*-------------------------------------------------------------------------*/

    /**
     * 
     * Four files which are used by the system:
     *    sourcemodel  -  Edited by the offline ccodebusters site and has all the questions
     *                    the type of test, name of test, and answers as well as other supporting
     *                    information to run a test (running keys, morsecode)
     *                    Only the person who cretes the test or schedules the test has access
     *                    to the sourcemodel.
     *    testmodel - The enciphered HTML for each of the questions and a refernece to the
     *                answertemplate.  This is the visual representation of the sourcemodel
     *                but the only answer it has in it is the encyphered timed question answer.
     *                The person who schedules the test has full access to the test model,
     *                students only have access to the test model until they have completed
     *                taking the test.
     *    answertemplate - The description of the fields that are used to track the answers.
     *                     It is copied for each scheduled test.
     *    answermodel - The realitme version of all the fields for taking the test.  This is the
     *                  only model which is managed by convergence.
     *                  It has the start time, end time, and list of students
     *                  assigned to take the test along with their school information.  
     *                  Once the students finish the test, they lose acccess to the answermodel.
     * 
     *   When Taking a test, the system loads the answermodel for the team and the testmodel.
     *   The testmodel is deciphered to generate the HTML for the page and the answermodel is
     *   connected through the convergence realtime system to allow communications between students
     *   taking the test.
     * 
     *   When scoring a test, the system uses the answermodel and the sourcemodel to check the answers.
     * 
     *   When publishing a test, the sourcemodel is loaded and the testmodel and answertemplates are 
     *   generated and stored
     * 
     *   When scheduling a test, the answertemplate is copied and the user information and time
     *   is filled in and stored as an answermodel.
     */

    /** 
     *   File contents
     *    sourcemodel/
     *        <guuid>.json    - { testid: "<guuid>", answertemplate: "<guuid>", rest of the source }
     *    testmodel/            { sourcemodel: "<guuid>", rest of the test stuff }
     *        <guuid>.json
     *    answertemplate/
     *        <guuid>.json     - { testid: "<guuid>", rest of the answer stuff}
     *    answermodel/   (Not really stored) Only parsed to get the testid, all other contents are ignored.
     *        <guuid>.json      - { testid: "<guuid>"}    -- the entire contents of the file
     * 
     *  Database contents
     *    Models
     *      id(key)     type             id         testid    sourceid   answerid     DateCreated  Title    Questions   CreatedBy    
     *      <guuid>     'sourcemodel'    <sguuid>   <tguuid>  --------   <wguuid>     <date>       'title'      <n>     john@toebes.com
     *      <guuid>     'testmodel'      <tguuid>   -------   <sguuid>   <wguid>      <date>       'title'      <n>     john@toebes.com
     *      <guuid>     'answertemplate' <wguuid>   <tguuid>             --------     <date>       ------               john@toebes.com
     *      <guuid>     'answermodel'    <aguuid>   <tguuid>             --------     <date>                            john@toebes.com
     * 
     *   Permissions
     *       key    id(fkey)  name                 read    write    manage   delete
     *       <X>   <sguuid>   GLOBAL                 Y       Y         N        N
     *       <X>   <sguuid>   john@toebes.com        Y       Y         Y        Y
     *       <X>   <sguuid>   mrseanmcd@gmail.com    Y       Y         N        N
     * 
     */


    /**
     * Get a list of all the models of a type associated with a user.
     * @returns Promise to Array of model ids
     *    SELECT
     *       id
     *    FROM 
     *       Models,
     *       Permissions
     *    WHERE
     *       Moodels.id=Permissions.id AND
     *       Models.type=::modeltype:: AND
     *       ((Permissions.name == 'GLOBAL' AND Permissions.read) OR
     *        (Permissions.name == ::userid:: AND Permissions.read))
     */
    public getRealtimeMetadata(modeltype: IRealtimeObject): Promise<IRealtimeMetaData[]> {
        // TODO: Implement this using the new API
        return new Promise((resolve, reject) => {
            if (modeltype === 'sourcemodel') {
                this.cacheConnectRealtime().then((domain) => {
                    const modelService = domain.models();
                    modelService
                        .query('SELECT source FROM codebusters_source')
                        .then((results) => {
                            let result: IRealtimeMetaData[] = [];
                            results.data.forEach((item) => {
                                let questions = item.data.source['TEST.0'].count;
                                if (item.data.source['TEST.0'].timed !== -1) {
                                    questions++;
                                }
                                let metadata: IRealtimeMetaData = {
                                    testid: item.data.source['TEST.0'].testmodelid,
                                    sourceid: item.modelId,
                                    answerid: item.data.source['TEST.0'].answermodelid,
                                    id: item.modelId,
                                    title: item.data.source['TEST.0'].title,
                                    type: 'sourcemodel',
                                    questions: questions,
                                    dateCreated: Number(item.created),
                                    createdBy: "nobody@nowhere.com"
                                }
                                result.push(metadata);
                            });
                            resolve(result)

                        });
                })
            } else {
                resolve([])
            }
        });
    }
    /**
     * Get all the permissions associated with a model
     * @param ID ModelId to get permissions for
     * @returns Promise to set of permissions
     *   SELECT 
     *       *
     *   FROM
     *       Permissions
     *    WHERE
     *       id = ::id::
     * NOTE: the catch error for this needs to set e.code:
     *     'unauthorized'    - Indicates that the model exists but the current user doesn't have permission to access it
     *     'model_not_found' - Indicates that the model doesn't exist
     */
    public getRealtimePermissions(id: modelID): Promise<RealtimePermissionSet> {
        // TODO: Implement this
        // resolve(undefined)
        return new Promise((resolve, reject) => {
            this.cacheConnectRealtime().then((domain) => {
                const modelService = domain.models();
                const permissionManager = modelService.permissions(id);
                permissionManager
                    .getAllUserPermissions()
                    .then((allPermissions) => {
                        let result: RealtimePermissionSet = {};
                        allPermissions.forEach((modelPermissions, user) => {
                            result[user] = { read: modelPermissions.read, write: modelPermissions.write, manage: modelPermissions.manage, remove: modelPermissions.remove };
                        });
                        resolve(result);
                    })
                    .catch((error) => reject(error));
            });
        });
    }
    /**
     * Set the permissions on a model for a given user.  You must have manage permissions for the id
     * in order to be able to set permissions for another user.  If setting permissions for yourself,
     * you must have write or manage permission (or be an admin).  To delete the permissions for a user
     * it is called with all the permission fields set to false
     * @param ID Answer ID from the realtime model to associated with the user
     * @param user Email address of user to add permissions for
     * @param permissions Permissions to set for user.
     * @returns Promise to boolean indicating success/failure
     * 
     *   UPSERT
     *      Permissions
     *   WHERE
     *      id = ::id:: AND
     *      user = ::user::
     *   SET
     *     id=::id::,user=::user::,read=::read::....
     */
    public updateRealtimePermissions(id: modelID, user: string, permissions: RealtimeSinglePermission): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // TODO: Implement this - There is no real safe way to do this on the Convergence system
            resolve(false)
        });
    }
    /**
     * Determines if an element exists on the server
     * @param id ID of element to look for
     * @reurns Promise to boolean indicating existance
     */
    public existsRealtimeContent(modeltype: IRealtimeObject, id: modelID): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // This doesn't appear to be used anywhere and might be something we can delete
            // TODO: Implement this
            resolve(false)
        });
    }
    /**
     * Get the JSON data associated with a model entry.  Note that if you ask for one that is
     * an answermodel (which really is stored in convergence) then the promise will be rejected.
     * @param ID Model ID to get contents for
     * @returns Promise to JSON structure containing contents of the model
     */
    public getRealtimeContents(id: modelID): Promise<anyMap> {
        return new Promise((resolve, reject) => {
            // TODO: Implement this
            this.cacheConnectRealtime().then((domain) => {
                const modelService = domain.models();
                modelService.open(id)
                    .then((datamodel: RealTimeModel) => {
                        const data = datamodel.root().value();
                        datamodel.close();
                        resolve(data);
                    }).catch((error) => reject(error));
            }).catch((error) => reject(error));
        });
    }
    /**
     * Update the contents of a model for a given id.  Note that if the object doesn't exist
     * it should be created.  This is because we will use it for the answer models in order to
     * store the permissions and find tests associated with them.
     * Permissions on the file are set to the current user with Read/Write/Manage/Delete
     * No other permissions are deleted.
     * @param contents Contents to save
     * @param ID Model to be updated
     * @returns Promise to ID of model updated
     */
    public updateRealtimeContents(modeltype: IRealtimeObject, contents: string, id: modelID): Promise<modelID> {
        return new Promise((resolve, reject) => {
            // TODO: Implement this
            this.cacheConnectRealtime().then((domain) => {
                let newData = JSON.parse(contents);
                const modelService = domain.models();
                let isOldModel = true;
                let testModelOptions: IAutoCreateModelOptions = {
                    collection: "codebusters_answers",
                    overrideCollectionWorldPermissions: true,
                    worldPermissions: ModelPermissions.fromJSON({ read: false, write: false, remove: false, manage: false }),
                    userPermissions: {}
                }

                if (modeltype === 'sourcemodel') {
                    testModelOptions.collection = "codebusters_source";
                } else if (modeltype === 'testmodel') {
                    testModelOptions.collection = 'codebusters_tests';
                }
                if (id !== undefined) {
                    testModelOptions.id = id;
                }
                testModelOptions.userPermissions[this.getConfigString('userid', 'NOBODY')] = ModelPermissions.fromJSON({ read: true, write: true, remove: true, manage: true });
                testModelOptions.data = () => { isOldModel = false; return newData; }

                modelService.openAutoCreate(testModelOptions).then((testmodel: RealTimeModel) => {
                    // If we are replacing an existing model, we have to update the data since it doesn't
                    // get pulled in from the autocreate
                    if (isOldModel) {
                        testmodel.root().value(newData);
                    }
                    testmodel.close();
                }).catch((error) => {
                    this.reportFailure("Convergence API could not write test model: " + error);
                });
            });

            resolve("");
        });
    }
    /**
     * Look up a single value in a stored model.  If the model doesn't exist or the element
     * doesn't exist, it should reject.
     * @param id ID of model to query
     * @param element top level element in model to retrieve value for
     * @returns Promise to string containing value for element
     * 
     *    SELECT
     *       ::element::
     *    FROM 
     *       Models,
     *       Permissions
     *    WHERE
     *       Moodels.id=Permissions.id AND
     *       Models.type=::modeltype:: AND
     *       ((Permissions.name == 'GLOBAL' AND Permissions.read) OR
     *        (Permissions.name == ::userid:: AND Permissions.read)) 
    */
    public getRealtimeElementMetadata(modeltype: IRealtimeObject, id: modelID): Promise<IRealtimeMetaData> {
        // modelService
        // .open(id)
        // .then((model: RealTimeModel) => {
        //     const result = testmodel.elementAt(element).value();
        // })
        return new Promise((resolve, reject) => {
            // TODO: Implement this
            resolve(undefined);
        });
    }
    /**
     * 
     * @param modeltype Type of element to search for
     * @param field Field to match against (testmodelid, sourceid)
     * @param value Value to match against
     * 
     *    SELECT
     *      id
     *    FROM 
     *       Models,
     *       Permissions
     *    WHERE
     *       Moodels.id=Permissions.id AND
     *       Models.type=::modeltype:: AND
     *       Modeld.::field::=::value:: AND
     *       ((Permissions.name == 'GLOBAL' AND Permissions.read) OR
     *        (Permissions.name == ::userid:: AND Permissions.read)) 
     */
    public getMatchingElementMetadata(modeltype: IRealtimeObject, field: IRealtimeFields, value: string): Promise<IRealtimeMetaData[]> {
        return new Promise((resolve, reject) => {
            // TODO: Implement this
            // Currently we are not using this routine anywhere... It could potentially be deleted.
            resolve([]);
        });
    }
    /*-------------------------------------------------------------------------*/
    /*                            Source Models                                */
    /*-------------------------------------------------------------------------*/
    /**
     * Get a list of all source IDs that the user has permission to read (this includes global permissions)
     * @returns Promise to array of strings for all elements that the user can read
     */
    public getRealtimeSourceMetadata(): Promise<IRealtimeMetaData[]> {
        return this.getRealtimeMetadata('sourcemodel');
    }
    /**
     * Get the contents of a Source model
     * @param sourceid ID of model to return
     * @returns Promise to interactive test contents
     */
    public getRealtimeSource(sourceid: modelID): Promise<sourceModel> {
        return this.getRealtimeContents(sourceid) as Promise<sourceModel>;
    }
    /**
     * Update the source for an existing test
     * @param interactiveTest Test Sour
     * @param ID Model to be updated (empty to create a new one)
     * @returns Promise to ID of model updated
     */
    public saveRealtimeSource(testsource: any, id: modelID): Promise<modelID> {
        if (id === "") {
            id = undefined;
        }
        return this.updateRealtimeContents('sourcemodel', JSON.stringify(testsource), id);
    }
    /**
     * Determines if a source test exists on the server
     * @param sourceid ID of source test to look for
     * @returns Promise to boolean status indicating existance
     */
    public existsRealtimeSource(sourceid: modelID): Promise<boolean> {
        // This wrapper doesn't appear to be used and might be deleted
        return this.existsRealtimeContent('sourcemodel', sourceid);
    }
    /*-------------------------------------------------------------------------*/
    /*                            Answer Templates                             */
    /*-------------------------------------------------------------------------*/
    /**
     * Saves a new realtime answer template
     * @param answerTemplate Answer template contents to save
     * @param id Id of template to be updated (empty to create a new one)
     * @returns Promise to ID of newly created template
     */
    public saveRealtimeAnswerTemplate(answerTemplate: IAnswerTemplate, id: modelID): Promise<modelID> {
        if (id === "") {
            id = undefined;
        }
        return this.updateRealtimeContents('answertemplate', JSON.stringify(answerTemplate), id);
    }
    /**
     * Get the contents of an answer template
     * @param answertemplateid ID of answer template to retrieve
     * @returns Promise to contents of answer template
     */
    public getRealtimeAnswerTemplate(answertemplateid: modelID): Promise<IAnswerTemplate> {
        return this.getRealtimeContents(answertemplateid) as unknown as Promise<IAnswerTemplate>;
    }
    /*-------------------------------------------------------------------------*/
    /*                            Test Models                                  */
    /*-------------------------------------------------------------------------*/
    /**
     * Saves a new realtime answer template
     * @param answerTemplate Answer template contents to save
     * @param id Id of model to be updated (empty to create a new one)
     * @returns Promise to ID of newly created template
     */
    public saveRealtimeTestModel(testmodel: IInteractiveTest, id: modelID): Promise<modelID> {
        if (id === "") {
            id = undefined;
        }
        return this.updateRealtimeContents('testmodel', JSON.stringify(testmodel), id);
    }
    /**
     * Get the contents of an answer template
     * @param answertemplateid ID of answer template to retrieve
     * @returns Promise to contents of answer template
     */
    public getRealtimeTestModel(answertemplateid: modelID): Promise<IInteractiveTest> {
        return this.getRealtimeContents(answertemplateid) as unknown as Promise<IInteractiveTest>;
    }
    /**
     * 
     * @param testdisp Test state
     */
    public setTestEditState(testdisp: ITestDisp): void {
        JTRadioButtonSet('testdisp', testdisp);
    }
    /**
     * Maps a string to the corresponding test type ID
     * @param ID string representation of the id
     */
    public mapTestTypeString(id: string): ITestType {
        let result = ITestType.None;
        for (const entry of this.testTypeMap) {
            if (entry.id === id) {
                result = entry.type;
                break;
            }
        }
        return result;
    }
    /**
     * Maps a test type to the corresponding string
     * @param testtype Test type to map
     */
    public mapTestTypeID(testtype: ITestType): string {
        let result = '';
        for (const entry of this.testTypeMap) {
            if (entry.type === testtype) {
                result = entry.id;
                break;
            }
        }
        return result;
    }
    public setTestType(testtype: ITestType): boolean {
        let changed = false;
        const test = this.getTestEntry(this.state.test);
        if (testtype !== test.testtype) {
            changed = true;
            test.testtype = testtype;
            this.setTestEntry(this.state.test, test);
        }
        return changed;
    }
    public checkXMLImport(): void {
        if (this.state.importURL !== undefined) {
            if (this.state.importURL !== '') {
                const url = this.state.importURL;
                $.getJSON(url, (data) => {
                    this.importXML(data);
                }).fail(() => {
                    alert('Unable to load file ' + url);
                });
            }
        }
    }
    public newTest(): void {
        this.setTestEntry(-1, {
            timed: -1,
            count: 0,
            questions: [],
            title: 'New Test',
            useCustomHeader: false,
            customHeader: '',
            testtype: ITestType.None,
        });
        location.reload();
    }
    public exportTests(): void { }
    public importTests(useLocalData: boolean): void {
        this.openXMLImport(useLocalData);
    }
    public gotoEditTest(test: number): void {
        location.assign('TestGenerator.html?test=' + String(test));
    }
    /**
     * generateTestData converts the current test information to a map which can be saved/restored later
     * @param test Test to generate data for
     * @returns string form of the JSON for the test
     */
    public generateTestData(test: ITest): any {
        const result = {};
        result['TEST.0'] = test;

        if (test.timed !== -1) {
            result['CIPHER.' + String(test.timed)] = this.getFileEntry(test.timed);
        }
        for (const entry of test.questions) {
            result['CIPHER.' + String(entry)] = this.getFileEntry(entry);
        }
        return result;
    }
    /**
     * generateTestJSON converts the current test information to a JSON string
     * @param test Test to generate data for
     * @returns string form of the JSON for the test
     */
    public generateTestJSON(test: ITest): string {
        return JSON.stringify(this.generateTestData(test));
    }
    /**
     * Make a copy of a test
     * @param test Test to duplicate
     */
    public gotoEditCopyTest(test: number): void {
        const testdata = this.getTestEntry(test);
        testdata.title = 'DUP ' + testdata.title;
        if (testdata.timed !== -1) {
            const entry = this.getFileEntry(testdata.timed);
            entry.question = 'DUP ' + entry.question;
            testdata.timed = this.setFileEntry(-1, entry);
        }
        for (const i in testdata.questions) {
            const entry = this.getFileEntry(testdata.questions[i]);
            entry.question = 'DUP ' + entry.question;
            testdata.questions[i] = this.setFileEntry(-1, entry);
        }
        const newtest = this.setTestEntry(-1, testdata);
        location.assign('TestGenerator.html?test=' + String(newtest));
    }
    public deleteTest(test: number): void {
        this.deleteTestEntry(test);
        location.reload();
    }
    public gotoPrintTest(test: number): void {
        location.assign('TestPrint.html?test=' + String(test));
    }
    public gotoPrintTestAnswers(test: number): void {
        location.assign('TestAnswers.html?test=' + String(test));
    }
    public gotoPrintTestSols(test: number): void {
        location.assign('TestAnswers.html?test=' + String(test) + '&sols=y');
    }
    public gotoInteractiveTest(test: number): void {
        location.assign('TestInteractive.html?test=' + String(test));
    }
    public gotoTestPublished(): void {
        location.assign('TestPublished.html');
    }
    public gotoTestLocal(): void {
        location.assign('TestManage.html');
    }
    /**
     * Jump to the page to change permissions for a test
     * @param sourcemodelid published ID of test
     */
    public gotoPublishedTestPermissions(sourcemodelid: string): void {
        location.assign('TestPermissions.html?testID=' + sourcemodelid);
    }
    /**
     * Jump to the page to schedule a test
     * @param sourcemodelid published ID of test
     */
    public gotoPublishedSchedule(sourcemodelid: string): void {
        location.assign('TestSchedule.html?testID=' + sourcemodelid);
    }
    /**
     * Jump to the page to show the results of taking the test
     * @param sourcemodelid published ID of test
     */
    public gotoPublishedResults(sourcemodelid: string): void {
        location.assign('TestResults.html?testID=' + sourcemodelid);
    }

    public gotoTestDisplay(testdisp: ITestDisp): void {
        switch (testdisp) {
            case 'testans':
                this.gotoPrintTestAnswers(this.state.test);
                break;
            case 'testedit':
                this.gotoEditTest(this.state.test);
                break;
            default:
            case 'testprint':
                this.gotoPrintTest(this.state.test);
                break;
            case 'testsols':
                this.gotoPrintTestSols(this.state.test);
                break;
            case 'testint':
                this.gotoInteractiveTest(this.state.test);
                break;
        }
    }
    public gotoTestManage(testmanage: ITestManage): void {
        switch (testmanage) {
            case 'published':
                this.gotoTestPublished();
                break;
            default:
            case 'local':
                this.gotoTestLocal();
                break;
        }
    }
    public gotoPublishDisplay(testdisp: IPublishDisp): void {
        switch (testdisp) {
            case 'published':
                this.gotoTestPublished();
                break;
            case 'permissions':
                this.gotoPublishedTestPermissions(this.state.testID);
                break;
            case 'results':
                this.gotoPublishedResults(this.state.testID);
                break;
            default:
            case 'schedule':
                this.gotoPublishedSchedule(this.state.testID);
                break;
        }
    }
    public gotoEditCipher(entry: number): void {
        const entryURL = this.getEntryURL(entry);
        if (entryURL !== '') {
            location.assign(entryURL);
        } else {
            alert('No editor found');
        }
    }
    public genQuestionTable(filter: number, buttons: buttonInfo[]): JQuery<HTMLElement> {
        // Figure out what items we will not display if they gave us a filter
        const useditems: { [index: string]: boolean } = {};
        if (filter !== undefined) {
            const test = this.getTestEntry(this.state.test);
            if (test.timed !== -1) {
                useditems[test.timed] = true;
            }
            for (const entry of test.questions) {
                useditems[entry] = true;
            }
        }

        const testcount = this.getTestCount();
        const testuse: { [index: string]: JQuery<HTMLElement> } = {};
        const testNames: NumberMap = {};

        // Figure out what tests each entry is used with
        for (let testent = 0; testent < testcount; testent++) {
            const test = this.getTestEntry(testent);
            // Make sure we have a unique title for the test
            let title = test.title;
            if (title === '') {
                title = 'No Title';
            }
            if (testNames[title] !== undefined) {
                title += '.' + testent;
            }
            testNames[title] = testent;
            // If we have a timed question, just put it in front of all the other questions
            // that we will process since we don't actually care about the order of the
            // questions, just which test it is used in
            if (test.timed !== -1) {
                test.questions.unshift(test.timed);
            }
            // Generate a clickable URL for each entry in the test
            for (const entry of test.questions) {
                if (entry in testuse) {
                    // If this is a subsequent entry, separate them with a comma
                    testuse[entry].append(', ');
                } else {
                    // For the first entry, we need a <div> to contain it all
                    testuse[entry] = $('<div/>');
                }
                testuse[entry].append(
                    $('<a/>', {
                        href: 'TestGenerator.html?test=' + testent,
                    }).text(title)
                );
            }
        }

        const result = $('<div/>', { class: 'questions' });

        const cipherCount = this.getCipherCount();
        const table = new JTTable({ class: 'cell stack queslist' });
        const row = table.addHeaderRow();
        row.add('Question')
            .add('Action')
            .add('Type')
            .add('Use')
            .add('Points')
            .add('Question')
            .add('Plain Text');

        for (let entry = 0; entry < cipherCount; entry++) {
            if (!useditems[entry]) {
                let prevuse: any = '';
                if (entry in testuse) {
                    prevuse = testuse[entry];
                }
                this.addQuestionRow(table, entry, entry, buttons, true, undefined, prevuse);
            }
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Generate a dropdown for the type of test
     * @param ID HTML ID of the generated dropdown
     * @param title Title text for the generated dropdown
     */
    public genTestTypeDropdown(
        id: string,
        title: string,
        testtype: ITestType
    ): JQuery<HTMLElement> {
        const inputgroup = $('<div/>', {
            class: 'input-group cell small-12 medium-12 large-12',
        });
        $('<span/>', { class: 'input-group-label' })
            .text(title)
            .appendTo(inputgroup);
        const select = $('<select/>', {
            id: id,
            class: 'input-group-field',
        });
        let option = $('<option />', {
            value: '',
            disabled: 'disabled',
        }).text('--Select a Test Type--');

        if (testtype === ITestType.None) {
            option.attr('selected', 'selected');
        }
        select.append(option);

        for (const entry of this.testTypeMap) {
            option = $('<option />', {
                value: entry.id,
            }).html(entry.title);
            if (testtype === entry.type) {
                option.attr('selected', 'selected');
            }
            select.append(option);
        }
        inputgroup.append(select);
        return inputgroup;
    }
    /**
     * Create a dropdown to allow inserting a new cipher type
     * @param ID HTML ID of the generated dropdown
     * @param title Title text for the generated dropdown
     */
    public genNewCipherDropdown(
        id: string,
        title: string,
        testtype: ITestType
    ): JQuery<HTMLElement> {
        const inputgroup = $('<div/>', {
            class: 'input-group cell small-12 medium-12 large-12',
        });
        $('<span/>', { class: 'input-group-label' })
            .text(title)
            .appendTo(inputgroup);
        const select = $('<select/>', {
            id: id,
            class: 'input-group-field',
        });
        select.append(
            $('<option />', {
                value: '',
                disabled: 'disabled',
                selected: 'selected',
            }).text('--Select a Cipher Type to add--')
        );
        for (const entry of this.cipherChoices) {
            // Make sure that this type of cipher is legal for this type of test
            const cipherhandler = CipherPrintFactory(entry.cipherType, entry.lang);
            if (cipherhandler.CheckAppropriate(testtype) === '') {
                const option = $('<option />', {
                    value: entry.cipherType,
                });
                if (entry.lang !== undefined) {
                    option.attr('data-lang', entry.lang);
                }
                let cipherTitle = getCipherTitle(entry.cipherType);
                if (entry.title !== undefined) {
                    cipherTitle = entry.title;
                }
                option.html(cipherTitle);
                select.append(option);
            }
        }
        // See if we need to add the ability to add existing ciphers
        let cipherCount = this.getCipherCount();
        const test = this.getTestEntry(this.state.test);
        cipherCount -= test.questions.length;
        if (test.timed !== -1) {
            cipherCount--;
        }
        if (cipherCount > 0) {
            select.append(
                $('<option/>', { value: ICipherType.None }).html('**Choose Existing Cipher**')
            );
        }
        inputgroup.append(select);
        return inputgroup;
    }
    public addQuestionRow(
        table: JTTable,
        order: number,
        qnum: number,
        buttons: buttonInfo[],
        showPlain: boolean,
        testtype: ITestType,
        prevuse: any
    ): void {
        let ordertext = 'Timed';
        let plainclass = '';
        if (!showPlain) {
            plainclass = 'qplain';
        }
        let extratext = '';
        if (order === -1) {
            extratext =
                '  When you have solved it, raise your hand so that the time can be recorded and the solution checked.';
        } else {
            ordertext = String(order);
        }
        let row = table.addBodyRow();
        // We have a timed question on everything except the Division A
        if (order === -1 && qnum === -1 && testtype !== ITestType.aregional) {
            const callout = $('<div/>', {
                class: 'callout warning',
            }).text('No Timed Question!  Add one from below');
            callout.append(
                this.genNewCipherDropdown('addnewtimed', 'New Timed Question', testtype)
            );
            row.add({
                celltype: 'td',
                settings: { colspan: 6 },
                content: callout,
            });
        } else {
            let qerror = '';
            row.add(ordertext);
            let state = this.getFileEntry(qnum);
            if (state === null) {
                state = {
                    cipherType: ICipherType.None,
                    points: 0,
                    cipherString: '',
                };
            }
            if (testtype === ITestType.aregional && order === -1) {
                qerror = 'Timed question not allowed for ' + this.getTestTypeName(testtype);
            } else if (testtype !== undefined) {
                // If we know the type of test, see if it has any problems with the question
                const cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
                cipherhandler.restore(state);
                qerror = cipherhandler.CheckAppropriate(testtype);
                if (qerror !== '') {
                    if (order === -1) {
                        qerror = 'Timed question: ' + qerror;
                    } else {
                        qerror = 'Question ' + ordertext + ': ' + qerror;
                    }
                }
            }
            const buttonset = $('<div/>', {
                class: 'button-group round shrink',
            });
            for (const btninfo of buttons) {
                const button = $('<button/>', {
                    'data-entry': order,
                    type: 'button',
                    class: btninfo.btnClass + ' button',
                }).html(btninfo.title);
                if (btninfo.disabled === true) {
                    button.attr('disabled', 'disabled');
                }
                buttonset.append(button);
            }
            row.add($('<div/>', { class: 'grid-x' }).append(buttonset)).add(state.cipherType);
            if (prevuse !== undefined) {
                row.add(prevuse);
            }
            row.add(String(state.points))
                .add(
                    $('<span/>', {
                        class: 'qtextentry',
                    }).html(state.question + extratext)
                )
                .add(
                    $('<span/>', {
                        class: plainclass,
                    }).text(state.cipherString)
                );
            if (qerror !== '') {
                row = table.addBodyRow();
                const callout = $('<div/>', {
                    class: 'callout alert',
                }).text(qerror);
                row.add({
                    celltype: 'td',
                    settings: { colspan: 6 },
                    content: callout,
                });
            }
        }
        return;
    }
    public AddTestError(qnum: number, message: string): void {
        if (message !== '') {
            let qtxt = 'Timed Question: ';
            if (qnum !== -1) {
                qtxt = 'Question ' + String(qnum) + ': ';
            }
            const callout = $('<div/>', {
                class: 'callout alert',
            }).text(qtxt + message);
            $('.testerrors').append(callout);
        }
    }
    public GetPrintFactory(question: number): CipherHandler {
        const state = this.getFileEntry(question);
        const cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        return cipherhandler;
    }
    /**
     * Generate a printable answer for a test entry.
     * An entry value of -1 is for the timed question
     */
    public printTestAnswer(
        testType: ITestType,
        qnum: number,
        handler: CipherHandler,
        extraclass: string,
        printSolution: boolean
    ): JQuery<HTMLElement> {
        const state = handler.state;
        let extratext = '';
        const result = $('<div/>', {
            class: 'question ' + extraclass,
        });
        const qtext = $('<div/>', { class: 'qtext' });
        if (qnum === -1) {
            qtext.append(
                $('<span/>', {
                    class: 'timed',
                }).text('Timed Question')
            );
            extratext =
                '  When you have solved it, raise your hand so that the time can be recorded and the solution checked.';
        } else {
            qtext.append(
                $('<span/>', {
                    class: 'qnum',
                }).text(String(qnum) + ')')
            );
        }
        qtext.append(
            $('<span/>', {
                class: 'points',
            }).text(' [' + String(state.points) + ' points] ')
        );
        qtext.append(
            $('<span/>', {
                class: 'qbody',
            }).html(state.question + extratext)
        );

        result.append(qtext);
        const cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        // Remember this question points so we can generate the tiebreaker order
        this.qdata.push({ qnum: qnum, points: state.points });
        result.append(cipherhandler.genAnswer(testType));
        if (printSolution) {
            result.append(cipherhandler.genSolution(testType));
        }
        return result;
    }
    /**
     * Generate a printable answer key for a test entry.
     * An entry value of -1 is for the timed question.
     */
    public printTestQuestion(
        testType: ITestType,
        qnum: number,
        handler: CipherHandler,
        extraclass: string
    ): JQuery<HTMLElement> {
        const state = handler.state;
        let extratext = '';
        const result = $('<div/>', {
            class: 'question ' + extraclass,
        });
        const qtext = $('<div/>', { class: 'qtext' });
        if (qnum === -1) {
            qtext.append(
                $('<span/>', {
                    class: 'timed',
                }).text('Timed Question')
            );
            extratext =
                '  When you have solved it, raise your hand so that the time can be recorded and the solution checked.';
        } else {
            qtext.append(
                $('<span/>', {
                    class: 'qnum',
                }).text(String(qnum) + ')')
            );
        }
        qtext.append(
            $('<span/>', {
                class: 'points',
            }).text(' [' + String(state.points) + ' points] ')
        );
        qtext.append(
            $('<span/>', {
                class: 'qbody',
            }).html(state.question + extratext)
        );
        result.append(qtext);
        const cipherhandler = CipherPrintFactory(state.cipherType, state.curlang);
        cipherhandler.restore(state);
        // Did the handler use a running key
        if (cipherhandler.usesRunningKey) {
            // If we haven't gotten any running keys then get the defaults
            if (this.runningKeys === undefined) {
                this.runningKeys = this.getRunningKeyStrings();
            }
            // Add this one to the list of running keys used.  Note that we don't
            // have a title, so we have to just make it up.  In theory this shouldn't
            // happen because we would expect that all the running keys were defined before
            // creating the test.
            if (cipherhandler.extraRunningKey !== undefined) {
                this.runningKeys.push({
                    title: 'Unknown',
                    text: cipherhandler.extraRunningKey,
                });
            }
        }
        // Remember this question points so we can generate the score sheet
        this.qdata.push({ qnum: qnum, points: state.points });
        result.append(cipherhandler.genQuestion(testType));
        return result;
    }
    /**
     * Compare two arbitrary objects to see if they are equivalent
     */
    public isEquivalent(a: any, b: any): boolean {
        // If the left side is blank or undefined then we assume that the
        // right side will be equivalent.  (This allows for objects which have
        // been extended with new attributes)
        if (a === '' || a === undefined || a === null) {
            return true;
        }
        // If we have an object on the left, the right better be an object too
        if (typeof a === 'object') {
            if (typeof b !== 'object') {
                return false;
            }
            // Both are objects, if any element of the object doesn't match
            // then they are not equivalent
            for (const elem of a) {
                if (!this.isEquivalent(a[elem], b[elem])) {
                    return false;
                }
            }
            // They all matched, so we are equivalent
            return true;
        }
        // Simple item, result is if they match
        return a === b;
    }
    /**
     * Compare two saved cipher states to see if they are indeed identical
     */
    public isSameCipher(state1: IState, state2: IState): boolean {
        // Make sure every element in state1 that is non empty is also in state 2
        for (const elem in state1) {
            if (!this.isEquivalent(state1[elem], state2[elem])) {
                return false;
            }
        }
        // And do the same for everything in reverse
        for (const elem in state2) {
            if (!this.isEquivalent(state2[elem], state1[elem])) {
                return false;
            }
        }
        return true;
    }
    public findTest(newTest: ITest): number {
        // Go through all the tests and build a structure holding them that we will convert to JSON
        const testcount = this.getTestCount();
        for (let testnum = 0; testnum < testcount; testnum++) {
            const test = this.getTestEntry(testnum);
            if (
                test.title === newTest.title &&
                test.timed === newTest.timed &&
                test.questions.length === newTest.questions.length
            ) {
                let issame = true;
                for (let i = 0; i < test.questions.length; i++) {
                    if (test.questions[i] !== newTest.questions[i]) {
                        issame = false;
                        break;
                    }
                }
                if (issame) {
                    return testnum;
                }
            }
        }

        return -1;
    }

    // tslint:disable-next-line:cyclomatic-complexity
    public processTestXML(data: any): void {
        // Load in all the ciphers we know of so that we don't end up doing a duplicate
        let cipherCount = this.getCipherCount();
        const cipherCache: { [index: number]: IState } = {};
        const inputMap: NumberMap = {};
        for (let entry = 0; entry < cipherCount; entry++) {
            cipherCache[entry] = this.getFileEntry(entry);
        }
        // First we get all the ciphers defined and add them to the list of ciphers
        for (const ent in data) {
            const pieces = ent.split('.');
            // Make sure we have a valid object that we can bring in
            if (
                pieces[0] === 'CIPHER' &&
                typeof data[ent] === 'object' &&
                data[ent].cipherType !== undefined &&
                data[ent].cipherString !== undefined &&
                !(pieces[1] in inputMap)
            ) {
                // It is a cipher entry // It is an object // with a cipherType // and a cipherString
                // that we haven't seen before
                const oldPos = Number(pieces[1]);
                const toAdd: IState = data[ent];
                let needNew = true;
                // Now make sure that we don't already have this cipher loaded
                for (let oldEnt = 0; oldEnt < cipherCount; oldEnt++) {
                    if (this.isSameCipher(cipherCache[oldEnt], toAdd)) {
                        inputMap[String(oldPos)] = oldEnt;
                        needNew = false;
                        break;
                    }
                }
                // If we hadn't found it, let's go ahead and add it
                if (needNew) {
                    const newval = this.setFileEntry(-1, toAdd);
                    cipherCache[newval] = toAdd;
                    inputMap[String(oldPos)] = newval;
                    cipherCount++;
                }
            }
        }
        // Now that we have all the ciphers in, we can go back and add the tests
        for (const ent in data) {
            const pieces = ent.split('.');
            // Make sure we have a valid object that we can bring in
            if (
                pieces[0] === 'TEST' &&
                typeof data[ent] === 'object' &&
                data[ent].title !== undefined &&
                data[ent].timed !== undefined &&
                data[ent].questions !== undefined
            ) {
                // It is a cipher entry // It is an object // with a title // with a timed question
                // and questions
                const newTest: ITest = data[ent];
                // Go through and fix up all the entries.  First the timed question
                if (newTest.timed !== -1 && inputMap[newTest.timed] !== undefined) {
                    newTest.timed = inputMap[newTest.timed];
                } else {
                    newTest.timed = -1;
                }
                // and then all of the entries
                for (let entry = 0; entry < newTest.questions.length; entry++) {
                    if (inputMap[newTest.questions[entry]] !== undefined) {
                        newTest.questions[entry] = inputMap[newTest.questions[entry]];
                    } else {
                        newTest.questions[entry] = 0;
                    }
                }
                // For good measure, just fix up the questions length
                newTest.count = newTest.questions.length;
                let testnum = this.findTest(newTest);
                if (testnum === -1) {
                    testnum = this.setTestEntry(-1, newTest);
                }
                if (testnum !== -1) {
                    this.gotoEditTest(testnum);
                }
            }
        }
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $('#printtest')
            .off('click')
            .on('click', () => {
                this.gotoPrintTest(this.state.test);
            });
        $('#printans')
            .off('click')
            .on('click', () => {
                this.gotoPrintTestAnswers(this.state.test);
            });
        $('#printsols')
            .off('click')
            .on('click', () => {
                this.gotoPrintTestSols(this.state.test);
            });
        $('#edittest')
            .off('click')
            .on('click', () => {
                this.gotoEditTest(this.state.test);
            });
        $('.entryedit')
            .off('click')
            .on('click', (e) => {
                this.gotoEditCipher(Number($(e.target).attr('data-entry')));
            });
        $('[name="testdisp"]')
            .off('click')
            .on('click', (e) => {
                $(e.target)
                    .siblings()
                    .removeClass('is-active');
                $(e.target).addClass('is-active');
                this.gotoTestDisplay($(e.target).val() as ITestDisp);
                this.updateOutput();
            });
        $('[name="testmanage"]')
            .off('click')
            .on('click', (e) => {
                $(e.target)
                    .siblings()
                    .removeClass('is-active');
                $(e.target).addClass('is-active');
                this.gotoTestManage($(e.target).val() as ITestManage);
                this.updateOutput();
            });
        $('[name="pubdisp"]')
            .off('click')
            .on('click', (e) => {
                $(e.target)
                    .siblings()
                    .removeClass('is-active');
                $(e.target).addClass('is-active');
                this.gotoPublishDisplay($(e.target).val() as IPublishDisp);
                this.updateOutput();
            });
    }
}
