import { CipherHandler } from '../common/cipherhandler';
import { parseQueryString } from '../common/parsequerystring';
import { API, GenerateUserSpecificConvergenceToken } from './api';

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
        this.api
            .getConvergenceToken({ googleIdToken: googleIdToken })
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
     * Perform any signout actions particular for Google
     */
    private performGoogleSignout(): void {
        gapi.auth2.getAuthInstance().disconnect();
    }

    /**
     * Signs out of any authentication providers and removes any local data associated with user session.
     */
    private performSignout(): void {
        this.performGoogleSignout();

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
    }
}
