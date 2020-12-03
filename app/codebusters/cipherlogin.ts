import { CipherHandler } from '../common/cipherhandler';
import { parseQueryString } from '../common/parsequerystring';
import { API, GenerateUserSpecificConvergenceToken, GetConvergenceTokenParameters } from './api';
import {
    AuthenticationResult,
    PublicClientApplication,
    RedirectRequest,
} from '@azure/msal-browser';

export class CipherLogin extends CipherHandler {
    /**
     * HTTP parameter used to specify the return url on successful authentication.
     */
    public static readonly HTTP_PARAM_RETURN_URL = 'returnUrl';

    /**
     * HTTP parameter used to specify if upon load of page should signout user.
     * If true is passed then user will be signed out. False for any other value (or if not passed in HTTP parameters)
     */
    public static readonly HTTP_PARAM_SHOULD_PERFORM_SIGNOUT = 'shouldPerformSignout';

    /**
     * URL to Google's plarform script used to retrieve definitions for gapi.
     */
    private static readonly SCRIPT_URL_GOOGLE_PLATFORM = 'https://apis.google.com/js/platform.js';

    /**
     * Unique Google client id for the project.
     */
    private static readonly GOOGLE_CLIENT_ID =
        '10183109285-tl1u2rpjntem0n6g9hvgc5go7rcaatuf.apps.googleusercontent.com';

    /**
     * Scopes to request from Google when a user signs in.
     */
    private static readonly GOOGLE_SCOPE = 'profile email';

    private static readonly SCRIPT_URL_MICROSOFT =
        'https://alcdn.msauth.net/browser/2.7.0/js/msal-browser.min.js';

    private static readonly MSAL_CONFIG = {
        auth: {
            clientId: '6339d587-2583-4efc-817e-bf468a9db48a',
        },
    };

    private readonly msalInstance: PublicClientApplication;

    /**
     * The url to navigate to after user successfully authenticates.
     */
    private readonly returnUrl: string;

    /**
     * If a signout should be performed after navigation to this page.
     */
    private readonly shouldPerformSignout: boolean;

    /**
     * Provides communication to our REST server.
     */
    private readonly api: API;

    constructor() {
        super();

        this.msalInstance = new PublicClientApplication(CipherLogin.MSAL_CONFIG);
        this.msalInstance
            .handleRedirectPromise()
            .then((authenticationResult) => {
                if (authenticationResult !== null) {
                    this.onMicrosoftLogin(authenticationResult);
                }
            })
            .catch((error) => {
                this.onMicrosoftError(error);
            });

        this.api = new API(this.getConfigString('authUrl', 'https://cosso.oit.ncsu.edu'));

        const parms = parseQueryString(window.location.search.substring(1));
        const parmsReturnUrl = parms.returnUrl;
        if (typeof parmsReturnUrl === 'undefined' || parmsReturnUrl === null) {
            this.returnUrl = 'index.html';
        } else {
            this.returnUrl = parms.returnUrl;
        }

        const parmsShouldPerformSignout = parms.shouldPerformSignout;
        if (
            typeof parmsShouldPerformSignout === 'undefined' ||
            parmsShouldPerformSignout === null
        ) {
            this.shouldPerformSignout = false;
        } else {
            if (parmsShouldPerformSignout === 'true') {
                this.shouldPerformSignout = true;
            } else {
                this.shouldPerformSignout = false;
            }
        }
    }

    /**
     * When called navigates back to the url that called the authentication page to be presented.
     * If the url is not defined or null will return to index page.
     */
    private returnToCaller(): void {
        location.assign(this.returnUrl);
    }

    private onMicrosoftLogin(authenticationResult: AuthenticationResult): void {
        console.log('Microsoft user has logged in.');
        const account = authenticationResult.account;
        const username = account.username;
        this.setConfigString(CipherHandler.KEY_USER_ID, username);

        const name = account.name;
        if (name !== null && name.length > 0) {
            const nameSplit = name.split(' ');
            if (nameSplit.length == 2) {
                const firstName = nameSplit[0];
                const lastName = nameSplit[1];
                this.setConfigString(CipherHandler.KEY_FIRST_NAME, firstName);
                this.setConfigString(CipherHandler.KEY_LAST_NAME, lastName);
            } else {
                this.setConfigString(CipherHandler.KEY_FIRST_NAME, 'No');
                this.setConfigString(CipherHandler.KEY_LAST_NAME, 'Name');
            }
        } else {
            this.setConfigString(CipherHandler.KEY_FIRST_NAME, 'No');
            this.setConfigString(CipherHandler.KEY_LAST_NAME, 'Name');
        }

        const idToken = authenticationResult.idToken;
        this.handleGetConvergenceToken({ microsoftIdToken: idToken });
    }

    private onMicrosoftError(error: any): void {
        console.log(error);
    }

    private handleGetConvergenceToken(tokenParameters: GetConvergenceTokenParameters): void {
        this.api
            .getConvergenceToken(tokenParameters)
            .then((value) => {
                if (!(value instanceof String) && value.convergenceToken) {
                    const convergenceToken = value.convergenceToken;
                    this.setConfigString(CipherHandler.KEY_CONVERGENCE_TOKEN, convergenceToken);
                    this.returnToCaller();
                } else {
                    console.log('No convergence token was given.\n' + value);
                    // TODO: Report to user that login did not return token. Contact developer. show on page.
                }
            })
            .catch((reason) => {
                console.log('getConvergenceToken error: ' + reason);
                const convergenceUsername = this.getConfigString('convergenceAdminUsername', '');
                const convergencePassword = this.getConfigString('convergenceAdminPassword', '');
                const convergenceProxyUsername = this.getConfigString(
                    'convergenceProxyUsername',
                    ''
                );

                if (
                    convergenceProxyUsername.length > 0 &&
                    convergenceUsername.length > 0 &&
                    convergencePassword.length > 0
                ) {
                    const parameters: GenerateUserSpecificConvergenceToken = {
                        convergencePassword: convergencePassword,
                        convergenceUsername: convergenceUsername,
                        userid: convergenceProxyUsername,
                    };

                    this.api
                        .generateSpecificUserConvergenceToken(parameters)
                        .then((value) => {
                            if (!(value instanceof String) && value.convergenceToken) {
                                const convergenceToken = value.convergenceToken;
                                this.setConfigString(
                                    CipherHandler.KEY_CONVERGENCE_TOKEN,
                                    convergenceToken
                                );
                                this.setConfigString(
                                    CipherHandler.KEY_USER_ID,
                                    convergenceProxyUsername
                                );
                                this.setConfigString(CipherHandler.KEY_FIRST_NAME, 'Proxy');
                                this.setConfigString(
                                    CipherHandler.KEY_LAST_NAME,
                                    convergenceProxyUsername
                                );
                                this.returnToCaller();
                            } else {
                                console.log('No convergence token was given.\n' + value);
                            }
                        })
                        .catch((error) => {
                            console.log('fatal error: ' + error);
                        });
                }
            });
    }

    /**
     * Called when a google user is sucessfully signed in.
     * @param googleUser Reference to the user who just signed in.
     */
    public onGoogleSuccess(googleUser: gapi.auth2.GoogleUser): void {
        console.log('Google user has logged in.');
        const profile = googleUser.getBasicProfile();

        this.setConfigString(CipherHandler.KEY_USER_ID, profile.getEmail());
        this.setConfigString(CipherHandler.KEY_FIRST_NAME, profile.getGivenName());
        this.setConfigString(CipherHandler.KEY_LAST_NAME, profile.getFamilyName());

        const googleIdToken = googleUser.getAuthResponse().id_token;
        this.handleGetConvergenceToken({ googleIdToken: googleIdToken });
    }

    /**
     * Perform any signout actions particular for Google
     */
    private performGoogleSignout(): void {
        gapi.auth2.getAuthInstance().disconnect();
    }

    private performMicrosoftSignout(): void {
        // Need to see if this will always force user to be sent to Microsoft's account page
        // this.msalInstance.logout();
    }

    /**
     * Signs out of any authentication providers and removes any local data associated with user session.
     */
    private performSignout(): void {
        this.performGoogleSignout();
        this.performMicrosoftSignout();

        this.deleteConfigString(CipherHandler.KEY_CONVERGENCE_TOKEN);
        this.deleteConfigString(CipherHandler.KEY_FIRST_NAME);
        this.deleteConfigString(CipherHandler.KEY_LAST_NAME);
        this.deleteConfigString(CipherHandler.KEY_USER_ID);
    }

    /**
     * Initializes any layout of the handler.
     */
    public buildCustomUI(): void {
        super.buildCustomUI();

        $.getScript(CipherLogin.SCRIPT_URL_GOOGLE_PLATFORM, () => {
            gapi.load('auth2', () => {
                gapi.auth2
                    .init({
                        client_id: CipherLogin.GOOGLE_CLIENT_ID,
                        scope: CipherLogin.GOOGLE_SCOPE,
                    })
                    .then(() => {
                        if (this.shouldPerformSignout === true) {
                            this.performSignout();
                            console.log('Current user was signed out.');
                        }

                        gapi.signin2.render('google-sign-in-container', {
                            scope: CipherLogin.GOOGLE_SCOPE,
                            width: 240,
                            height: 50,
                            longtitle: true,
                            theme: 'dark',
                            onsuccess: (user) => {
                                this.onGoogleSuccess(user);
                            },
                            // 'onfailure': onFailure
                        });
                    });
            });
        });

        $.getScript(CipherLogin.SCRIPT_URL_MICROSOFT, () => {
            $('.button-microsoft-login')
                .off('click')
                .on('click', () => {
                    const redirectRequest: RedirectRequest = {
                        scopes: ['openid', 'profile'],
                        prompt: 'select_account',
                    };
                    this.msalInstance.loginRedirect(redirectRequest);
                });
        });
    }
}
