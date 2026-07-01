/**
 * cloudsync.ts - conversion between the app's portable test format
 * (sourceTestData, produced by CipherTest.generateTestData / consumed by
 * CipherTest.processTestXML) and the cloud document content stored in Firestore.
 */
import { cloneObject } from '../common/ciphercommon';
import { IState, ITest } from '../common/cipherhandler';
import { sourceTestData } from './ciphertest';
import { CloudTestContent } from './cloudstore';

/** Result of merging two concurrent cloud saves. */
export interface MergeResult {
    merged: sourceTestData;
    /** True when the same question or test structure was edited on both sides. */
    hadConflict: boolean;
}

function payloadEntryEqual(a: unknown, b: unknown): boolean {
    if (a === undefined && b === undefined) {
        return true;
    }
    if (a === undefined || b === undefined) {
        return false;
    }
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Merge a local save with the current cloud copy using the baseline from the
 * caller's last sync.  Unchanged questions keep the other editor's work; when
 * both sides changed the same entry the local (incoming) copy wins.
 */
export function mergeCloudPayloads(
    baseline: sourceTestData,
    local: sourceTestData,
    remote: sourceTestData
): MergeResult {
    const merged: sourceTestData = {};
    const keys = new Set<string>([
        ...Object.keys(baseline),
        ...Object.keys(local),
        ...Object.keys(remote),
    ]);
    let hadConflict = false;

    for (const key of keys) {
        if (key.startsWith('CIPHER.')) {
            const baseVal = baseline[key];
            const localVal = local[key];
            const remoteVal = remote[key];
            const localChanged = !payloadEntryEqual(localVal, baseVal);
            const remoteChanged = !payloadEntryEqual(remoteVal, baseVal);

            if (localChanged && remoteChanged && !payloadEntryEqual(localVal, remoteVal)) {
                merged[key] = cloneObject(localVal) as IState;
                hadConflict = true;
            } else if (localChanged) {
                merged[key] = cloneObject(localVal) as IState;
            } else if (remoteChanged) {
                merged[key] = cloneObject(remoteVal) as IState;
            } else if (remoteVal !== undefined) {
                merged[key] = cloneObject(remoteVal) as IState;
            } else if (localVal !== undefined) {
                merged[key] = cloneObject(localVal) as IState;
            }
        }
    }

    const baseTest = baseline['TEST.0'];
    const localTest = local['TEST.0'];
    const remoteTest = remote['TEST.0'];
    const testLocalChanged = !payloadEntryEqual(localTest, baseTest);
    const testRemoteChanged = !payloadEntryEqual(remoteTest, baseTest);

    if (testLocalChanged && testRemoteChanged && !payloadEntryEqual(localTest, remoteTest)) {
        merged['TEST.0'] = cloneObject(localTest) as ITest;
        hadConflict = true;
    } else if (testLocalChanged) {
        merged['TEST.0'] = cloneObject(localTest) as ITest;
    } else if (testRemoteChanged) {
        merged['TEST.0'] = cloneObject(remoteTest) as ITest;
    } else if (remoteTest !== undefined) {
        merged['TEST.0'] = cloneObject(remoteTest) as ITest;
    } else if (localTest !== undefined) {
        merged['TEST.0'] = cloneObject(localTest) as ITest;
    }

    return { merged, hadConflict };
}

export function sourceToCloudContent(source: sourceTestData): CloudTestContent {
    const test = source['TEST.0'] as ITest | undefined;
    const base = test && Array.isArray(test.questions) ? test.questions.length : 0;
    const timed = test && test.timed !== undefined && test.timed !== -1 ? 1 : 0;
    return {
        title: (test && test.title) || 'Untitled Test',
        testtype: (test && (test.testtype as string)) || '',
        questionCount: base + timed,
        payload: JSON.stringify(source),
    };
}

/**
 * Parse a cloud payload string back into sourceTestData, or null when missing
 * or malformed.
 */
export function cloudPayloadToSource(payload: string): sourceTestData | null {
    if (!payload) {
        return null;
    }
    try {
        return JSON.parse(payload) as sourceTestData;
    } catch (e) {
        console.error('Malformed cloud test payload', e);
        return null;
    }
}
