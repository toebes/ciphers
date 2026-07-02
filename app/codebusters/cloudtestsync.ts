/**
 * cloudtestsync.ts - mirrors local edits of a cloud-linked test up to Firestore.
 *
 * Saves use a three-way merge against the last synced baseline so two editors
 * working on different questions at the same time both keep their changes.  When
 * both edit the same question, the latest save wins for that question only.
 */
import { cloneObject } from '../common/ciphercommon';
import type { CipherHandler, IState, ITest } from '../common/cipherhandler';
import type { sourceTestData } from './ciphertest';
import { getCloudUser, isCloudAvailable } from './cloudauth';
import { isCloudId, saveCloudTest } from './cloudstore';
import { cloudPayloadToSource, sourceToCloudContent } from './cloudsync';

type CloudStatus = 'saving' | 'saved' | 'error' | 'offline' | 'stale' | 'denied';

/** When true, setTestEntry / setFileEntry overrides skip cloud pushing. */
let suppressed = false;

/** Run a function with cloud sync suppressed. */
export function withCloudSyncSuppressed<T>(fn: () => T): T {
    const prev = suppressed;
    suppressed = true;
    try {
        return fn();
    } finally {
        suppressed = prev;
    }
}

/** Push a single linked test to the cloud (fire-and-forget; never throws). */
async function doPush(handler: CipherHandler, testIndex: number): Promise<void> {
    const test = handler.getTestEntry(testIndex);
    if (!isCloudId(test.cloudExtId)) {
        return;
    }
    if (getCloudUser() === null) {
        setCloudStatus('offline');
        return;
    }
    setCloudStatus('saving');
    try {
        const clean = cloneObject(test) as ITest;
        delete clean.cloudExtId;
        delete clean.cloudRevision;
        delete clean.cloudSyncBaseline;

        const source: sourceTestData = { 'TEST.0': clean };
        if (test.timed !== undefined && test.timed !== -1) {
            source['CIPHER.' + String(test.timed)] = handler.getFileEntry(test.timed);
        }
        for (const entry of test.questions) {
            source['CIPHER.' + String(entry)] = handler.getFileEntry(entry);
        }
        const content = sourceToCloudContent(source);
        const localPayload = content.payload;

        const syncBaseline = test.cloudSyncBaseline;
        const result = await saveCloudTest(
            test.cloudExtId as string,
            content,
            test.cloudRevision,
            syncBaseline
        );

        withCloudSyncSuppressed(() => {
            // When our save was merged against a concurrent edit, fold the merged
            // result back into the scratch copy for entries we did not touch.
            if (syncBaseline && result.stale) {
                const merged = cloudPayloadToSource(result.savedPayload);
                const baseline = cloudPayloadToSource(syncBaseline);
                const local = cloudPayloadToSource(localPayload);
                if (merged !== null && baseline !== null && local !== null) {
                    const linked = handler.getTestEntry(testIndex);
                    const testUnchanged =
                        JSON.stringify(local['TEST.0']) === JSON.stringify(baseline['TEST.0']);
                    if (testUnchanged) {
                        const mergedTest = cloneObject(merged['TEST.0']) as ITest;
                        mergedTest.cloudExtId = linked.cloudExtId;
                        mergedTest.cloudRevision = linked.cloudRevision;
                        mergedTest.cloudSyncBaseline = linked.cloudSyncBaseline;
                        handler.setTestEntry(testIndex, mergedTest);
                    }
                    for (const key of Object.keys(merged)) {
                        if (!key.startsWith('CIPHER.')) {
                            continue;
                        }
                        if (JSON.stringify(local[key]) !== JSON.stringify(baseline[key])) {
                            continue;
                        }
                        const entry = Number(key.split('.')[1]);
                        if (!isNaN(entry)) {
                            handler.setFileEntry(entry, merged[key] as IState);
                        }
                    }
                }
            }
            // Record the new revision / baseline on the scratch copy.
            const linked = handler.getTestEntry(testIndex);
            if (isCloudId(linked.cloudExtId)) {
                linked.cloudRevision = result.revision;
                linked.cloudSyncBaseline = result.savedPayload;
                handler.setTestEntry(testIndex, linked);
            }
        });
        setCloudStatus(result.hadConflict ? 'stale' : 'saved');
    } catch (e) {
        console.error('Cloud test save failed', e);
        if (
            typeof e === 'object' &&
            e !== null &&
            'code' in e &&
            (e as { code: string }).code === 'permission-denied'
        ) {
            handler.clearCloudEditScratch();
            setCloudStatus('denied');
            alert('You no longer have access to this cloud test.');
            location.assign('TestManage.html');
            return;
        }
        setCloudStatus('error');
    }
}

/** Push the linked test at the given index, if it is cloud-linked. */
export function pushLinkedTest(handler: CipherHandler, testIndex: number): void {
    if (!isCloudAvailable() || suppressed || testIndex < 0) {
        return;
    }
    const test = handler.getTestEntry(testIndex);
    if (!isCloudId(test.cloudExtId)) {
        return;
    }
    void doPush(handler, testIndex);
}

/** Push any cloud-linked tests that reference the given question index. */
export function pushForQuestion(handler: CipherHandler, questionIndex: number): void {
    if (!isCloudAvailable() || suppressed || questionIndex < 0) {
        return;
    }
    const testCount = handler.getTestCount();
    for (let i = 0; i < testCount; i++) {
        const test = handler.getTestEntry(i);
        if (!isCloudId(test.cloudExtId)) {
            continue;
        }
        if (test.timed === questionIndex || test.questions.indexOf(questionIndex) !== -1) {
            void doPush(handler, i);
        }
    }
}

let hideTimer: number | undefined;
function setCloudStatus(status: CloudStatus): void {
    let el = document.getElementById('cloud-save-status');
    if (el === null) {
        el = document.createElement('div');
        el.id = 'cloud-save-status';
        el.style.cssText =
            'position: fixed; bottom: 12px; right: 12px; z-index: 2000; ' +
            'padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; ' +
            'box-shadow: 0 2px 6px rgba(0,0,0,0.2); pointer-events: none;';
        document.body.appendChild(el);
    }
    const styles: { [key in CloudStatus]: { text: string; bg: string; fg: string } } = {
        saving: { text: 'Saving to cloud\u2026', bg: '#0a6ebd', fg: '#ffffff' },
        saved: { text: 'Saved to cloud \u2713', bg: '#3adb76', fg: '#0a0a0a' },
        error: { text: 'Cloud save failed', bg: '#cc4b37', fg: '#ffffff' },
        offline: { text: 'Sign in to sync to cloud', bg: '#ffae00', fg: '#0a0a0a' },
        stale: {
            text: 'Saved \u2013 same question also edited elsewhere',
            bg: '#ffae00',
            fg: '#0a0a0a',
        },
        denied: { text: 'Access removed', bg: '#cc4b37', fg: '#ffffff' },
    };
    const style = styles[status];
    el.textContent = style.text;
    el.style.background = style.bg;
    el.style.color = style.fg;
    el.style.display = 'block';

    if (hideTimer !== undefined) {
        window.clearTimeout(hideTimer);
        hideTimer = undefined;
    }
    if (status === 'saved' || status === 'stale') {
        hideTimer = window.setTimeout(() => {
            const node = document.getElementById('cloud-save-status');
            if (node !== null) {
                node.style.display = 'none';
            }
        }, 2500);
    }
}
