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
 * Three-way merge of a single entry (a question or the test structure).  When
 * both sides changed it away from the baseline the local (incoming) copy wins
 * and the entry is flagged as a conflict.  Returns undefined when the entry does
 * not exist on any side.
 */
function mergeEntry<T>(
    baseVal: unknown,
    localVal: unknown,
    remoteVal: unknown
): { value: T | undefined; conflict: boolean } {
    const localChanged = !payloadEntryEqual(localVal, baseVal);
    const remoteChanged = !payloadEntryEqual(remoteVal, baseVal);

    if (localChanged && remoteChanged && !payloadEntryEqual(localVal, remoteVal)) {
        return { value: cloneObject(localVal as object) as T, conflict: true };
    } else if (localChanged) {
        return { value: cloneObject(localVal as object) as T, conflict: false };
    } else if (remoteChanged) {
        return { value: cloneObject(remoteVal as object) as T, conflict: false };
    } else if (remoteVal !== undefined) {
        return { value: cloneObject(remoteVal as object) as T, conflict: false };
    } else if (localVal !== undefined) {
        return { value: cloneObject(localVal as object) as T, conflict: false };
    }
    return { value: undefined, conflict: false };
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
            const entry = mergeEntry<IState>(baseline[key], local[key], remote[key]);
            if (entry.value !== undefined) {
                merged[key] = entry.value;
            }
            hadConflict = hadConflict || entry.conflict;
        }
    }

    const testEntry = mergeEntry<ITest>(baseline['TEST.0'], local['TEST.0'], remote['TEST.0']);
    if (testEntry.value !== undefined) {
        merged['TEST.0'] = testEntry.value;
    }
    hadConflict = hadConflict || testEntry.conflict;

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
