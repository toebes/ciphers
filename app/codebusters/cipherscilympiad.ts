import { toolMode, IState, menuMode, CipherHandler } from '../common/cipherhandler';
import { ITestState, IAnswerTemplate } from './ciphertest';
import { ICipherType } from '../common/ciphertypes';
import { cloneObject, makeCallout } from '../common/ciphercommon';
import { JTButtonItem } from '../common/jtbuttongroup';
import { ConvergenceDomain, LogLevel } from '@convergence/convergence';
import { CipherTest } from './ciphertest';
import Convergence = require('@convergence/convergence');
import { JTFDialog } from '../common/jtfdialog';
import { JTFIncButton } from '../common/jtfIncButton';
import { JTFLabeledInput } from '../common/jtflabeledinput';
import { GenerateUserSpecificConvergenceToken } from './api';

/**
 * CipherScilympiad
 *    This shows a list of all published tests.
 *    Each line has a line with buttons at the start
 *       <EDIT> <DELETE> <Permissions> <Schedule> <View Results> Test Title  #questions #Scheduled
 *  The command buttons availableare
 */
export class CipherScilympiad extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    public cmdButtons: JTButtonItem[] = [];

    public scitestid = 'Enter a testid here';
    public sciteam = 1;
    public scistudent = 1;

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
     * Update the output based on current state settings.
     * This propagates all values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        $('.testlist').replaceWith(this.genTestList());
        // const now = this.testTimeInfo.truetime.UTCNow();
        this.attachHandlers();
    }
    /**
     * Generates a list of all the tests on the server in a table.
     * @returns HTML content of list of tests
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });

        if (this.state.jwt === undefined || this.state.jwt.length < 20) {
            // Put up the dialog
            result.append(makeCallout($('<h3/>').text('No JWT provided.')));
            setTimeout(() => {
                this.promptForCredentials();
            }, 10);
            return result;
        }

        this.cacheConnectRealtime().then((domain: ConvergenceDomain) => {
            this.findAllTests(domain);
        });
        return result;
    }
    /**
     * connectRealtime custom override to use the JWT passed by Scilympiad
     * Note: Do not use catch (Is never thrown)
     * @returns Promise ConvergenceDomain to interact with
     */
    public connectRealtime(): Promise<ConvergenceDomain> {
        const loginSettings = this.getConvergenceSettings();
        const connectUrl = this.formatConnectUrl(
            loginSettings.baseUrl,
            loginSettings.namespace,
            loginSettings.domain
        );

        return new Promise((resolve, reject) => {
            if (this.state.jwt === undefined || this.state.jwt === '') {
                reject('No JWT provided');
            }

            const options: Convergence.IConvergenceOptions = {
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

            Convergence.connectWithJwt(connectUrl, this.state.jwt, options)
                .then((domain) => {
                    resolve(domain);
                    this.setConfigString(CipherHandler.KEY_CONVERGENCE_TOKEN, this.state.jwt);
                    // We need to figure out the user and 
                    const user = domain.session().user().email
                    this.setConfigString(CipherHandler.KEY_USER_ID, user);
                    // Now we need to split off the team number and which student they are
                    const pieces = user.split('-');
                    this.setConfigString(CipherHandler.KEY_FIRST_NAME, 'Scilympiad_User');
                    this.setConfigString(CipherHandler.KEY_LAST_NAME, pieces[2]);
                })
                .catch((error) => {
                    console.log('An error occurred while trying to connect to realtime: ' + error);
                    this.deleteConfigString(CipherHandler.KEY_CONVERGENCE_TOKEN);
                    this.deleteConfigString(CipherHandler.KEY_USER_ID);
                    this.deleteConfigString(CipherHandler.KEY_FIRST_NAME);
                    this.deleteConfigString(CipherHandler.KEY_LAST_NAME);

                    reject(error);
                });
        });
    }
    /**
     * Find all the test sources on the server
     * @param domain Convergence Domain to query against
     */
    private findAllTests(domain: ConvergenceDomain): void {
        const modelService = domain.models();
        // We know that we are logged in because the toplevel routine confirms it, but
        // just incase we still need a default for the userid
        const userid = this.getConfigString('userid', 'NOBODY');
        modelService
            .query('SELECT testid,starttime,endtime,assigned FROM codebusters_answers') // This stays with Convergence for the answer models
            .then((results) => {
                let count = 0;
                let testid = '';
                results.data.forEach((result) => {
                    const answertemplate = result.data as IAnswerTemplate;
                    // Check to see if they are permitted
                    let isAssigned = false;
                    for (const asn of answertemplate.assigned) {
                        if (asn.userid === userid) {
                            isAssigned = true;
                            break;
                        }
                    }
                    if (isAssigned) {
                        count++;
                        testid = result.modelId;
                    }
                });
                if (count === 0) {
                    $('.testlist').append(
                        makeCallout(
                            'There are currently no tests assigned for you to take.',
                            'alert'
                        )
                    );
                } else if (count > 1) {
                    $('.testlist').append(
                        makeCallout(
                            'There is more than one test assigned for you to take.',
                            'alert'
                        )
                    );
                } else {
                    this.gotoTakeTest(testid);
                }
                this.attachHandlers();
            })
            .catch((error) => {
                this.reportFailure('Convergence API could not connect: ' + error);
            });
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialog used for deleting ciphers
     * @returns DOM element to put at the top
     */
    public createMainMenu(): JQuery<HTMLElement> {
        // const result = super.createMainMenu();
        // Create the dialog for selecting which cipher to load
        const result = $('<div/>');
        result.append(this.createSelectScilympiadDlg());
        return result;
    }

    /**
     * Prompts for the user credentials to log in for the test
     */
    public promptForCredentials(): void {
        $('#oksci')
            .removeAttr('disabled')
            .off('click')
            .on('click', () => {
                this.scitestid = $('#scitestid').val() as string;
                this.sciteam = Number($('#sciteam').val());
                this.scistudent = Number($('#scistudent').val());
                this.setConfigString(
                    'convergenceAdminUsername',
                    $('#convergenceAdminUsername').val() as string
                );

                this.setConfigString(
                    'convergenceAdminPassword',
                    $('#convergenceAdminPassword').val() as string
                );
                // We have the information so attempt to get a JWT token with it
                this.getConvergenceToken(this.scitestid, this.sciteam, this.scistudent);
                $('#selectsci').foundation('close');
            });
        $('#convergenceAdminUsername').val(
            this.getConfigString('convergenceAdminUsername', 'admin')
        );
        $('#convergenceAdminPassword').val(
            this.getConfigString('convergenceAdminPassword', 'password')
        );
        // Put up the dialog to ask them.
        $('#selectsci').foundation('open');
    }
    /**
     * Creates the dialog for scheduling a scilympiad test
     * @returns HTML DOM element for dialog
     */
    private createSelectScilympiadDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>')
            .append(
                $('<div/>', {
                    class: 'callout alert',
                }).text(
                    'No JWT was provided for access to the test.  If you are an admin, you can proxy to verify access.'
                )
            )

            .append(JTFLabeledInput('Test Id', 'text', 'scitestid', this.scitestid, ''))
            .append(JTFIncButton('Team Number', 'sciteam', this.sciteam, ''))
            .append(JTFIncButton('Student Number (1-3)', 'scistudent', this.scistudent, ''))
            .append(JTFLabeledInput('Admin Userid', 'text', 'convergenceAdminUsername', 0, ''))
            .append(
                JTFLabeledInput('Admin Password', 'password', 'convergenceAdminPassword', 0, '')
            );

        const ScheduleScilympiadDlg = JTFDialog(
            'selectsci',
            'Proxy for Scilympiad',
            dlgContents,
            'oksci',
            'Login'
        );
        return ScheduleScilympiadDlg;
    }
    /**
     *
     * @param sciEventId
     * @param sciTeamId
     * @param sciUserId
     */
    private getConvergenceToken(sciEventId: string, sciTeamId: number, sciUserId: number): void {
        const strSciTeamId = String(sciTeamId);
        const strSciUserId = String(sciUserId);
        const convergenceUsername = this.getConfigString('convergenceAdminUsername', '');
        const convergencePassword = this.getConfigString('convergenceAdminPassword', '');
        const sciUser = sciEventId + '-' + strSciTeamId + '-' + strSciUserId;
        const parameters: GenerateUserSpecificConvergenceToken = {
            convergencePassword: convergencePassword,
            convergenceUsername: convergenceUsername,
            userid: sciUser,
            // -1 defaults to regular expiration window.
            millisecondsFromNowTillExpire: -1,
            isAdmin: false,
            sciEventId: sciEventId,
            sciTeamId: strSciTeamId,
            sciUserId: strSciUserId,
            isSci: false, // For now...
        };
        this.api
            .generateSpecificUserConvergenceToken(parameters)
            .then((value) => {
                if (!(value instanceof String) && value.convergenceToken) {
                    const convergenceToken = value.convergenceToken;
                    this.setConfigString(CipherHandler.KEY_CONVERGENCE_TOKEN, convergenceToken);
                    this.setConfigString(CipherHandler.KEY_USER_ID, sciUser);
                    this.setConfigString(CipherHandler.KEY_FIRST_NAME, 'Team ' + strSciTeamId);
                    this.setConfigString(CipherHandler.KEY_LAST_NAME, 'User ' + strSciUserId);
                    // We have what we wanted, so reload the page passing the JWT
                    location.assign('Scilympiad.html?jwt=' + encodeURIComponent(convergenceToken));
                } else {
                    this.reportFailure('Unable to Authenticate: ' + value);
                }
            })
            .catch((error) => {
                this.reportFailure('Unable to Authenticate: ' + error);
            });
    }
    /**
     * Run a test
     * @param testid Id of test model
     */
    public gotoTakeTest(testid: string): void {
        location.assign('TestTimed.html?testID=' + testid);
    }
    /**
     * Locate the model id for an element.  This looks for the data-source attribute of the containing TR
     * @param elem element to get information for
     * @returns model id stored on the TR element
     */
    public getModelID(elem: JQuery<HTMLElement>): string {
        const tr = elem.closest('tr');
        const id = tr.attr('data-answer') as string;
        return id;
    }
    /**
     * Attach all the UI handlers for created DOM elements
     */
    public attachHandlers(): void {
        super.attachHandlers();
    }
}
