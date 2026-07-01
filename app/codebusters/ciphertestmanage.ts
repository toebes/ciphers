import { cloneObject } from '../common/ciphercommon';
import { CipherHandler, IState, menuMode, toolMode } from '../common/cipherhandler';
import { ICipherType } from '../common/ciphertypes';
import { JTFDialog } from '../common/jtfdialog';
import { JTTable } from '../common/jttable';
import { CipherTest, ITestState } from './ciphertest';
import {
    initCloudAuth,
    isCloudAvailable,
    isSignedIn,
    onCloudAuthChanged,
    waitForCloudAuth,
} from './cloudauth';
import {
    createCloudTest,
    deleteCloudTest,
    getCloudTest,
    isCloudId,
    listMyCloudTests,
    shareCloudTest,
    unshareCloudTest,
} from './cloudstore';
import { cloudPayloadToSource, sourceToCloudContent } from './cloudsync';

/**
 * CipherTestManage
 *    This shows a list of all tests.
 *    Each line has a line with buttons at the start
 *       <Edit> <Duplicate> <Delete> <Print> <Export> Test Title  #questions
 *  The command buttons available are
 *       <New Test><EXPORT><IMPORT>
 *
 *  When cloud storage is configured and the user is signed in, a second
 *  "Cloud Tests" section lists tests stored in / shared via Firebase.
 */
export class CipherTestManage extends CipherTest {
    public activeToolMode: toolMode = toolMode.codebusters;

    public defaultstate: ITestState = {
        cipherString: '',
        cipherType: ICipherType.Test,
    };
    public state: ITestState = cloneObject(this.defaultstate) as IState;
    /* Boolean indicating that this is an active Scilympiad test */
    public isScilympiad: boolean = false;

    /** True once we've subscribed to cloud auth changes (subscribe only once). */
    cloudSubscribed = false;
    /** The cloud test currently targeted by the share dialog. */
    shareExtId = '';

    /**
     * Restore the state from either a saved file or a previous undo record
     * @param data Saved state to restore
     */
    public restore(data: ITestState, suppressOutput = false): void {
        const curlang = this.state.curlang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.state.curlang = curlang;
        this.copyState(this.state, data);
        /** See if we have to import an XML file */
        this.checkXMLImport();
        if (!suppressOutput) {
            this.setUIDefaults();
            this.updateOutput();
        }
    }
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {
        super.updateOutput();
        this.setMenuMode(menuMode.test);
        $('.testlist').each((i, elem) => {
            $(elem).replaceWith(this.genTestList());
        });
        $('.cloudtestlist').each((i, elem) => {
            $(elem).replaceWith(this.genCloudTestSection());
        });
        this.attachHandlers();
        this.ensureCloudInit();
    }
    /**
     * Inject the share dialog into the page's main menu area so Foundation can
     * manage its lifecycle.
     */
    public createMainMenu(): JQuery<HTMLElement> {
        const result = super.createMainMenu();
        result.append(this.createShareDlg());
        return result;
    }
    /**
     *
     */
    public genTestList(): JQuery<HTMLElement> {
        const result = $('<div/>', { class: 'testlist' });
        const testcount = this.getTestCount();
        if (testcount === 0) {
            result.append($('<h3>').text('No Tests Created Yet'));
            return result;
        }
        const table = new JTTable({ class: 'cell shrink testlist' });
        let row = table.addHeaderRow();
        row.add('Action')
            .add('Title')
            .add('Questions');

        let shown = 0;
        for (let entry = 0; entry < testcount; entry++) {
            const test = this.getTestEntry(entry);
            // Legacy cloud-linked entries in local storage are hidden here.
            if (isCloudId(test.cloudExtId)) {
                continue;
            }
            shown++;
            row = table.addBodyRow();
            let questioncount = test.count;
            if (test.timed !== undefined && test.timed >= 0) {
                questioncount++;
            }
            const buttons = $('<div/>', { class: 'button-group round shrink' });
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testedit button',
                }).text('Edit')
            );
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testcopy button',
                }).text('Duplicate')
            );
            buttons.append(
                $('<a/>', {
                    'data-entry': entry,
                    type: 'button',
                    class: 'testdel alert button',
                }).text('Delete')
            );
            // NOTE: Disable interactive tests
            // buttons.append(
            //     $('<a/>', {
            //         'data-entry': entry,
            //         type: 'button',
            //         class: 'testint button',
            //     }).text('Interactive Test')
            // );


            if (isCloudAvailable()) {
                buttons.append(
                    $('<a/>', {
                        'data-entry': entry,
                        type: 'button',
                        class: 'testtocloud button',
                    }).text('Copy to Cloud')
                );
            }

            buttons.append(this.makeActionTrigger('Print', 'print'));
            buttons.append(this.makeActionTrigger('Export', 'export'));

            const wrap = $('<div/>', {
                class: 'grid-x action-menu-wrap',
                style: 'position: relative;',
            }).append(buttons);

            wrap.append(
                this.makeActionPane(entry, 'print', [
                    { title: 'Test Packet', class: 'testprt' },
                    { title: 'Answer Key', class: 'testans' },
                    { title: 'Answers and Solutions', class: 'testsols' },
                ])
            );
            wrap.append(
                this.makeActionPane(entry, 'export', [
                    { title: 'Export to JSON', class: 'testexportjson' },
                    { title: 'Export to LaTeX', class: 'testlatex' },
                ])
            );

            row.add(wrap)
                .add(test.title)
                .add(String(questioncount));
        }
        if (shown === 0) {
            result.append($('<h3>').text('No Tests Created Yet'));
            return result;
        }
        result.append(table.generate());
        return result;
    }
    /**
     * Build the (initially empty) shell for the cloud tests section.  Its body
     * is filled asynchronously by refreshCloudTests().
     */
    public genCloudTestSection(): JQuery<HTMLElement> {
        const container = $('<div/>', { class: 'cloudtestlist' });
        if (!isCloudAvailable()) {
            return container;
        }
        container.append($('<h3/>').text('Cloud Tests'));
        container.append($('<div/>', { class: 'cloudtests-body' }));
        return container;
    }
    /**
     * Subscribe (once) to cloud auth changes and trigger an initial load.  On
     * later calls just refresh the list.
     */
    ensureCloudInit(): void {
        if (!isCloudAvailable()) {
            return;
        }
        if (this.cloudSubscribed) {
            void this.refreshCloudTests();
            return;
        }
        this.cloudSubscribed = true;
        initCloudAuth();
        onCloudAuthChanged(() => {
            void this.refreshCloudTests();
        });
    }
    /**
     * Populate the cloud tests body based on the current auth state.
     */
    async refreshCloudTests(): Promise<void> {
        const body = $('.cloudtests-body');
        if (body.length === 0 || !isCloudAvailable()) {
            return;
        }
        if (!isSignedIn()) {
            body.empty().append(
                $('<div/>', { class: 'callout primary' })
                    .append(
                        $('<p/>').text(
                            'Sign in with Google to access your cloud tests and tests shared with you.'
                        )
                    )
                    .append(
                        $('<a/>', { class: 'button cloud-signin-cta', type: 'button' }).text(
                            'Sign In'
                        )
                    )
            );
            this.attachCloudHandlers();
            return;
        }
        body.empty().append($('<p/>').text('Loading your cloud tests\u2026'));
        try {
            const tests = await listMyCloudTests();
            body.empty();
            if (tests.length === 0) {
                body.append(
                    $('<p/>').text(
                        'No cloud tests yet. Use "Copy to Cloud" on a local test to get started.'
                    )
                );
            } else {
                const table = new JTTable({ class: 'cell shrink cloudtestlist' });
                let row = table.addHeaderRow();
                row.add('Action').add('Title').add('Questions').add('Access');

                for (const test of tests) {
                    row = table.addBodyRow();
                    const buttons = $('<div/>', { class: 'button-group round shrink' });
                    buttons.append(
                        $('<a/>', {
                            'data-ext': test.extId,
                            type: 'button',
                            class: 'cloudedit button',
                        }).text('Edit')
                    );
                    buttons.append(
                        $('<a/>', {
                            'data-ext': test.extId,
                            type: 'button',
                            class: 'cloudtolocal button',
                        }).text('Copy to Local')
                    );
                    if (test.isOwner) {
                        buttons.append(
                            $('<a/>', {
                                'data-ext': test.extId,
                                type: 'button',
                                class: 'cloudshare button',
                            }).text('Share')
                        );
                        buttons.append(
                            $('<a/>', {
                                'data-ext': test.extId,
                                type: 'button',
                                class: 'clouddel alert button',
                            }).text('Delete')
                        );
                    }

                    let access: string;
                    if (test.isOwner) {
                        const shared = test.editorEmails.length;
                        const pending = test.pendingInvites.length;
                        access = 'Owner';
                        if (shared > 0 || pending > 0) {
                            access += ` \u2022 shared with ${shared}`;
                            if (pending > 0) {
                                access += ` (${pending} pending)`;
                            }
                        }
                    } else {
                        access = 'Shared by ' + test.ownerEmail;
                    }

                    row.add(buttons)
                        .add(test.title)
                        .add(String(test.questionCount))
                        .add(access);
                }
                body.append(table.generate());
            }
        } catch (e) {
            console.error('Unable to load cloud tests', e);
            body.empty().append(
                $('<div/>', { class: 'callout alert' }).text(
                    'Unable to load cloud tests. Please try again.'
                )
            );
        }
        this.attachCloudHandlers();
    }
    attachCloudHandlers(): void {
        $('.cloud-signin-cta')
            .off('click')
            .on('click', () => {
                this.goToAuthenticationPage();
            });
        $('.cloudedit')
            .off('click')
            .on('click', (e) => {
                void this.editCloudTest($(e.target).attr('data-ext'));
            });
        $('.cloudtolocal')
            .off('click')
            .on('click', (e) => {
                void this.copyCloudToLocal($(e.target).attr('data-ext'));
            });
        $('.cloudshare')
            .off('click')
            .on('click', (e) => {
                this.openShareDialog($(e.target).attr('data-ext'));
            });
        $('.clouddel')
            .off('click')
            .on('click', (e) => {
                void this.deleteCloudTestEntry($(e.target).attr('data-ext'));
            });
    }
    /**
     * Copy a local test up to the cloud as a brand-new owned cloud test.  The
     * local test is left untouched.
     * @param entry Local test index
     */
    public async copyTestToCloud(entry: number): Promise<void> {
        if (!isSignedIn()) {
            this.goToAuthenticationPage();
            return;
        }
        try {
            const source = this.generateTestData(this.getTestEntry(entry));
            const content = sourceToCloudContent(source);
            await createCloudTest(content);
            void this.refreshCloudTests();
            alert('Test copied to the cloud.');
        } catch (e) {
            console.error('Copy to cloud failed', e);
            alert('Unable to copy this test to the cloud.');
        }
    }
    /**
     * Copy a cloud test down into local storage as a new local test.  The cloud
     * copy is left untouched.
     * @param extId Cloud test id
     */
    public async copyCloudToLocal(extId: string | undefined): Promise<void> {
        if (extId === undefined) {
            return;
        }
        try {
            const cloud = await getCloudTest(extId);
            if (cloud === null) {
                alert('Unable to load that cloud test.');
                return;
            }
            const source = cloudPayloadToSource(cloud.payload);
            if (source === null) {
                alert('That cloud test could not be read.');
                return;
            }
            // Force a new test AND new cipher entries so the local copy is fully
            // independent - editing it must never affect the cloud test.
            this.processTestXML(source, false, true, true);
            this.updateOutput();
            alert('Cloud test copied to your local tests.');
        } catch (e) {
            console.error('Copy to local failed', e);
            alert('Unable to copy that cloud test locally.');
        }
    }
    /**
     * Open a cloud test for editing.  The test lives entirely in the cloud; we
     * fetch a fresh copy (which also verifies the user has read access via the
     * Firestore rules), drop it into an isolated "CloudEdit-*" storage namespace
     * that never mixes with the user's local tests, and open the Test Generator
     * pointed at that namespace via a `cloudedit=<ext-id>` URL.  Every save from
     * then on mirrors back up to the cloud test.  Because we always re-hydrate
     * from the cloud on open, edits made by collaborators are always picked up.
     * @param extId Cloud test id
     */
    public async editCloudTest(extId: string | undefined): Promise<void> {
        if (extId === undefined) {
            return;
        }
        const user = await waitForCloudAuth();
        if (user === null) {
            this.goToAuthenticationPage(false, window.location.href);
            return;
        }
        let cloud;
        try {
            cloud = await getCloudTest(extId);
        } catch (e) {
            // A permission-denied read (no access) lands here.
            console.error('Edit cloud test failed', e);
            alert('You do not have access to that cloud test.');
            return;
        }
        if (cloud === null) {
            alert('Unable to load that cloud test.');
            return;
        }
        // Force a fresh pull when the Test Generator loads (so we pick up any
        // edits made by collaborators since this scratch copy was last used).
        this.setConfigString(CipherHandler.CLOUD_LOADED_KEY, '');
        // The test lives entirely in the cloud; the Test Generator hydrates it
        // into the isolated scratch namespace from the `cloudedit` URL.
        location.assign('TestGenerator.html?cloudedit=' + encodeURIComponent(extId) + '&test=0');
    }
    /**
     * Delete a cloud test (owner only).
     * @param extId Cloud test id
     */
    public async deleteCloudTestEntry(extId: string | undefined): Promise<void> {
        if (extId === undefined) {
            return;
        }
        if (!confirm('Delete this cloud test for everyone it is shared with? This cannot be undone.')) {
            return;
        }
        try {
            await deleteCloudTest(extId);
            void this.refreshCloudTests();
        } catch (e) {
            console.error('Delete cloud test failed', e);
            alert('Unable to delete that cloud test.');
        }
    }
    /**
     * Build the share dialog shell.  Its contents are populated per-test when
     * openShareDialog() runs.
     */
    public createShareDlg(): JQuery<HTMLElement> {
        const dlgContents = $('<div/>');
        dlgContents.append(
            $('<p/>').text(
                'Share this test by email. People you share with can edit it. Only you can share or delete it.'
            )
        );
        const inputGroup = $('<div/>', { class: 'input-group' });
        inputGroup.append(
            $('<input/>', {
                type: 'email',
                id: 'cloudShareEmail',
                class: 'input-group-field',
                placeholder: 'name@example.com',
            })
        );
        inputGroup.append(
            $('<div/>', { class: 'input-group-button' }).append(
                $('<a/>', { class: 'button cloud-share-add', type: 'button' }).text('Share')
            )
        );
        dlgContents.append(inputGroup);
        dlgContents.append($('<div/>', { class: 'cloud-share-status' }));
        dlgContents.append($('<div/>', { class: 'cloud-share-list' }));
        dlgContents.append(
            $('<div/>', { class: 'expanded button-group' }).append(
                $('<a/>', { class: 'secondary button', 'data-close': '' }).text('Done')
            )
        );
        return JTFDialog('cloudShareDLG', 'Share Test', dlgContents);
    }
    /**
     * Open the share dialog for a specific cloud test and populate its list.
     * @param extId Cloud test id
     */
    public openShareDialog(extId: string | undefined): void {
        if (extId === undefined) {
            return;
        }
        this.shareExtId = extId;
        $('#cloudShareEmail').val('');
        this.setShareStatus('', false);
        void this.refreshShareList();
        $('.cloud-share-add')
            .off('click')
            .on('click', () => {
                void this.doShare();
            });
        $('#cloudShareDLG').foundation('open');
    }
    /**
     * Show a status/error message inside the share dialog.
     */
    setShareStatus(message: string, isError: boolean): void {
        const status = $('.cloud-share-status');
        status.text(message);
        status.toggleClass('alert-text', isError);
    }
    /**
     * Re-fetch the current test and render its collaborators / pending invites.
     */
    async refreshShareList(): Promise<void> {
        const list = $('.cloud-share-list');
        list.empty();
        const cloud = await getCloudTest(this.shareExtId);
        if (cloud === null) {
            return;
        }
        const entries: { email: string; pending: boolean }[] = [];
        for (const email of cloud.editorEmails) {
            entries.push({ email, pending: cloud.pendingInvites.indexOf(email) !== -1 });
        }
        for (const email of cloud.pendingInvites) {
            if (cloud.editorEmails.indexOf(email) === -1) {
                entries.push({ email, pending: true });
            }
        }
        if (entries.length === 0) {
            list.append($('<p/>').text('Not shared with anyone yet.'));
            return;
        }
        const table = new JTTable({ class: 'cell shrink cloud-share-table' });
        let row = table.addHeaderRow();
        row.add('Person').add('Status').add('');
        for (const entry of entries) {
            row = table.addBodyRow();
            row.add(entry.email)
                .add(entry.pending ? 'Pending' : 'Editor')
                .add(
                    $('<a/>', {
                        'data-email': entry.email,
                        class: 'cloud-share-remove alert button tiny',
                        type: 'button',
                    }).text('Remove')
                );
        }
        list.append(table.generate());
        $('.cloud-share-remove')
            .off('click')
            .on('click', (e) => {
                void this.doUnshare($(e.target).attr('data-email'));
            });
    }
    /**
     * Share the current test with the email entered in the dialog.
     */
    async doShare(): Promise<void> {
        const email = String($('#cloudShareEmail').val() ?? '').trim();
        if (email === '') {
            return;
        }
        this.setShareStatus('Sharing\u2026', false);
        try {
            const result = await shareCloudTest(this.shareExtId, email);
            if (result === 'invalid') {
                this.setShareStatus('Please enter a valid email address.', true);
                return;
            }
            if (result === 'already') {
                this.setShareStatus('That person already has access.', true);
                return;
            }
            $('#cloudShareEmail').val('');
            this.setShareStatus(
                result === 'pending'
                    ? 'Invited. Access unlocks when they sign in with that email.'
                    : 'Shared.',
                false
            );
            await this.refreshShareList();
            void this.refreshCloudTests();
        } catch (e) {
            console.error('Share failed', e);
            this.setShareStatus('Unable to share. Please try again.', true);
        }
    }
    /**
     * Revoke an email's access to the current test.
     */
    async doUnshare(email: string | undefined): Promise<void> {
        if (email === undefined) {
            return;
        }
        try {
            await unshareCloudTest(this.shareExtId, email);
            await this.refreshShareList();
            void this.refreshCloudTests();
        } catch (e) {
            console.error('Unshare failed', e);
            this.setShareStatus('Unable to update sharing. Please try again.', true);
        }
    }

    /**
     * Check an email address to see if it is legitimate
     * @param emailAddress Email address to check
     * @returns Boolean indicating email address is valid
     */
    public isValidEmailAddress(emailAddress: string): boolean {
        if (this.isScilympiad) {
            return true;
        }
        var pattern = /^([a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+(\.[a-z\d!#$%&'*+\-\/=?^_`{|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)*|"((([ \t]*\r\n)?[ \t]+)?([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*(([ \t]*\r\n)?[ \t]+)?")@(([a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\d\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.)+([a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF][a-z\d\-._~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]*[a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])\.?$/i;
        return pattern.test(emailAddress);
    }
    public attachHandlers(): void {
        super.attachHandlers();
        $('.testedit')
            .off('click')
            .on('click', (e) => {
                this.gotoEditTest(Number($(e.target).attr('data-entry')));
            });
        $('.testcopy')
            .off('click')
            .on('click', (e) => {
                this.gotoEditCopyTest(Number($(e.target).attr('data-entry')));
            });
        $('.testdel')
            .off('click')
            .on('click', (e) => {
                this.deleteTest(Number($(e.target).attr('data-entry')));
            });
        // The Print menu opens the print page and its browser print preview.
        $('.testprt')
            .off('click')
            .on('click', (e) => {
                this.gotoPrintTest(Number($(e.target).attr('data-entry')), true);
            });
        $('.testans')
            .off('click')
            .on('click', (e) => {
                this.gotoPrintTestAnswers(Number($(e.target).attr('data-entry')), true);
            });
        // NOTE: Disable interactive tests
        // $('.testint')
        //     .off('click')
        //     .on('click', (e) => {
        //         this.gotoInteractiveTest(Number($(e.target).attr('data-entry')));
        //     });
        $('.testsols')
            .off('click')
            .on('click', (e) => {
                this.gotoPrintTestSols(Number($(e.target).attr('data-entry')), true);
            });
        $('.testtocloud')
            .off('click')
            .on('click', (e) => {
                void this.copyTestToCloud(Number($(e.target).attr('data-entry')));
            });
    }
}
