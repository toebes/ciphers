import { CipherHandler, menuMode, toolMode } from '../common/cipherhandler';
import { JTButtonItem } from '../common/jtbuttongroup';
import { parseQueryString } from '../common/parsequerystring';
import {
    getCloudUser,
    initCloudAuth,
    isCloudAvailable,
    isSignedIn,
    onCloudAuthChanged,
} from './cloudauth';

/**
 * CloudLogin
 *    Dedicated sign-in page for the optional cloud test storage features.
 *    This is intentionally the ONLY page that shows a Sign In button.  All
 *    other pages send users here (goToAuthenticationPage) so that students
 *    are never prompted to create or use a Google account (COPPA).
 *
 *    This is a plain informational page, not a cipher editor.  It extends
 *    CipherHandler only because that is how every page (static ones like
 *    HowTo and Policies included) gets the shared menu; none of the cipher
 *    state / undo / save machinery is used.
 */
export class CloudLogin extends CipherHandler {
    public activeToolMode: toolMode = toolMode.codebusters;
    /** No Load/Undo/Redo/Reset - there is no cipher state on this page. */
    public cmdButtons: JTButtonItem[] = [];

    /**
     * Lay out the page.  Replaces the cipher-editor layout() entirely: there
     * is no saved state to restore and no query parameters to fold into state.
     * Just build the menu and render the body for the current auth state.
     */
    public layout(): void {
        this.buildCustomUI();
        this.setMenuMode(menuMode.test);
        this.attachHandlers();
        initCloudAuth();
        // Firebase restores an existing session asynchronously, so render on
        // every auth change rather than just once at load.
        onCloudAuthChanged(() => {
            this.updateLoginInfo();
            this.showLoginState();
        });
    }
    public genPreCommands(): JQuery<HTMLElement> {
        return $('<div/>', { class: 'loginview' });
    }
    /**
     * Where to send the user after signing in (or clicking Continue).  Only
     * same-origin targets from the `return` query parameter are honored.
     */
    public getReturnUrl(): string {
        const parms = parseQueryString(window.location.search.substring(1));
        const raw = parms['return'];
        if (raw !== undefined && raw !== '') {
            try {
                const url = new URL(raw, window.location.href);
                if (url.origin === window.location.origin) {
                    return url.href;
                }
            } catch (e) {
                // Malformed URL - fall through to the default page.
            }
        }
        return 'TestManage.html';
    }
    /**
     * Render the page body for the current auth state.
     */
    showLoginState(): void {
        const view = $('.loginview');
        if (view.length === 0) {
            return;
        }
        view.empty();
        if (!isCloudAvailable()) {
            view.append(
                $('<div/>', { class: 'callout warning' }).text(
                    'Cloud storage is not configured for this site, so signing in is not available.'
                )
            );
            return;
        }
        if (isSignedIn()) {
            const user = getCloudUser();
            const who = user !== null ? user.displayName + ' (' + user.email + ')' : '';
            view.append($('<p/>').text('You are signed in as ' + who + '.'));
            view.append(
                $('<div/>', { class: 'button-group' })
                    .append(
                        $('<a/>', { class: 'login-continue button', type: 'button' }).text(
                            'Continue'
                        )
                    )
                    .append(
                        $('<a/>', {
                            class: 'login-signout secondary button',
                            type: 'button',
                        }).text('Sign Out')
                    )
            );
        } else {
            view.append(
                $('<p/>').text(
                    'Signing in with a Google account lets coaches store tests in the cloud and share them with other coaches.'
                )
            );
            view.append(
                $('<p/>').text(
                    'An account is never needed to create, print, or take tests. Students should not sign in.'
                )
            );
            view.append(
                $('<a/>', { class: 'login-start button', type: 'button' }).text('Sign In')
            );
        }
        this.attachLoginHandlers();
    }
    attachLoginHandlers(): void {
        $('.login-start')
            .off('click')
            .on('click', () => {
                $(document).trigger('cb-cloud-signin', [this.getReturnUrl()]);
            });
        $('.login-continue')
            .off('click')
            .on('click', () => {
                window.location.assign(this.getReturnUrl());
            });
        $('.login-signout')
            .off('click')
            .on('click', () => {
                this.goToAuthenticationPage(true);
            });
    }
}
