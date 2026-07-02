/**
 * cloudstore.ts - Firestore CRUD for cloud tests.
 *
 * A cloud test is a single self-contained Firestore document under the `tests`
 * collection.  The test body (questions embedded) is stored as a JSON string in
 * the `payload` field - see cloudsync.ts for conversion to/from the app's
 * sourceTestData format.  Top-level fields are denormalized metadata and the
 * ownership / sharing lists that the security rules enforce against.
 *
 * The app-facing identifier for a cloud test is `ext-<firestoreDocId>` so it can
 * never be confused with a numeric local-storage index.
 *
 * Every function is a safe no-op / empty result when the cloud is not configured
 * or no user is signed in.
 */
import {
    Timestamp,
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    runTransaction,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { getCloudUser } from './cloudauth';
import { mergeCloudPayloads, sourceToCloudContent, cloudPayloadToSource } from './cloudsync';
import { getFirebaseDb } from './firebaseapp';

/** Prefix marking a test id as an external (cloud) test. */
export const EXT_PREFIX = 'ext-';

/** Firestore collection names. */
const TESTS = 'tests';
const USERS = 'users';

/** Schema version stored on each document to allow future migrations. */
const SCHEMA_VERSION = 1;

/**
 * The portable content of a cloud test (everything except sharing/ownership).
 */
export interface CloudTestContent {
    title: string;
    testtype: string;
    questionCount: number;
    /** JSON string of the app's sourceTestData (see cloudsync.ts). */
    payload: string;
}

/**
 * Lightweight metadata for listing tests (no payload).
 */
export interface CloudTestMeta {
    extId: string;
    title: string;
    testtype: string;
    questionCount: number;
    ownerUid: string;
    ownerEmail: string;
    editorEmails: string[];
    pendingInvites: string[];
    isOwner: boolean;
    revision: number;
    updatedAt: number | null;
}

/**
 * Full cloud test including the payload.
 */
export interface CloudTestData extends CloudTestMeta {
    payload: string;
}

/** Result of attempting to share a test with an email address. */
export type ShareResult = 'added' | 'pending' | 'already' | 'invalid';

/** Result of saving cloud test content. */
export interface SaveResult {
    /** The new revision number after the save. */
    revision: number;
    /** True when the cloud revision had advanced since the caller's last sync. */
    stale: boolean;
    /** True when the same question or test structure was edited concurrently. */
    hadConflict: boolean;
    /** The payload string that was written to Firestore. */
    savedPayload: string;
}

/**
 * True when a test id refers to a cloud test.
 */
export function isCloudId(id: string | number | undefined | null): boolean {
    return typeof id === 'string' && id.startsWith(EXT_PREFIX);
}

/**
 * Convert an app-facing ext- id into the raw Firestore document id.
 */
export function extIdToDocId(extId: string): string {
    return extId.startsWith(EXT_PREFIX) ? extId.slice(EXT_PREFIX.length) : extId;
}

/**
 * Convert a Firestore document id into an app-facing ext- id.
 */
export function docIdToExtId(docId: string): string {
    return EXT_PREFIX + docId;
}

/**
 * Minimal email sanity check (defense in depth; UI validates too).
 */
function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}
function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Build listing metadata from a Firestore document. */
function toMeta(docId: string, data: any, uid: string): CloudTestMeta {
    return {
        extId: docIdToExtId(docId),
        title: data.title ?? 'Untitled Test',
        testtype: data.testtype ?? '',
        questionCount: data.questionCount ?? 0,
        ownerUid: data.ownerUid ?? '',
        ownerEmail: data.ownerEmail ?? '',
        editorEmails: Array.isArray(data.editorEmails) ? data.editorEmails : [],
        pendingInvites: Array.isArray(data.pendingInvites) ? data.pendingInvites : [],
        isOwner: data.ownerUid === uid,
        revision: data.revision ?? 0,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : null,
    };
}

/**
 * Create a brand-new cloud test owned by the current user.
 * @returns the ext- id of the new test.
 */
export async function createCloudTest(content: CloudTestContent): Promise<string> {
    const db = getFirebaseDb();
    const user = getCloudUser();
    if (db === undefined || user === null) {
        throw new Error('You must be signed in to save a cloud test.');
    }
    const ref = await addDoc(collection(db, TESTS), {
        schemaVersion: SCHEMA_VERSION,
        title: content.title,
        testtype: content.testtype,
        questionCount: content.questionCount,
        payload: content.payload,
        ownerUid: user.uid,
        ownerEmail: user.email,
        editorUids: [],
        editorEmails: [],
        pendingInvites: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedByUid: user.uid,
        revision: 1,
    });
    return docIdToExtId(ref.id);
}

/**
 * Save cloud test content.  When another editor saved first (stale revision) and
 * a sync baseline is supplied, changed questions are merged so concurrent edits
 * to different questions are both kept; the same question falls back to the
 * incoming (last-writer) copy.
 */
export async function saveCloudTest(
    extId: string,
    content: CloudTestContent,
    expectedRevision?: number,
    syncBaseline?: string
): Promise<SaveResult> {
    const db = getFirebaseDb();
    const user = getCloudUser();
    if (db === undefined || user === null) {
        throw new Error('You must be signed in to save a cloud test.');
    }
    const ref = doc(db, TESTS, extIdToDocId(extId));
    return await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) {
            throw new Error('This cloud test no longer exists.');
        }
        const current = snap.data().revision ?? 0;
        const stale = expectedRevision !== undefined && current !== expectedRevision;
        let hadConflict = false;
        let mergedSource;

        if (stale && syncBaseline) {
            const remoteSource = cloudPayloadToSource(snap.data().payload ?? '') ?? {};
            const localSource = cloudPayloadToSource(content.payload) ?? {};
            const baselineSource = cloudPayloadToSource(syncBaseline) ?? remoteSource;
            const mergeResult = mergeCloudPayloads(baselineSource, localSource, remoteSource);
            mergedSource = mergeResult.merged;
            hadConflict = mergeResult.hadConflict;
        } else {
            mergedSource = cloudPayloadToSource(content.payload);
            if (stale) {
                hadConflict = true;
            }
        }

        if (mergedSource === null) {
            throw new Error('Unable to build cloud save payload.');
        }
        const stored = sourceToCloudContent(mergedSource);
        const revision = current + 1;
        tx.update(ref, {
            title: stored.title,
            testtype: stored.testtype,
            questionCount: stored.questionCount,
            payload: stored.payload,
            updatedAt: serverTimestamp(),
            updatedByUid: user.uid,
            revision,
        });
        return { revision, stale, hadConflict, savedPayload: stored.payload };
    });
}

/**
 * Fetch the full content + metadata of a single cloud test, or null if missing
 * / inaccessible.
 */
export async function getCloudTest(extId: string): Promise<CloudTestData | null> {
    const db = getFirebaseDb();
    const user = getCloudUser();
    if (db === undefined || user === null) {
        return null;
    }
    const snap = await getDoc(doc(db, TESTS, extIdToDocId(extId)));
    if (!snap.exists()) {
        return null;
    }
    const data = snap.data();
    return {
        ...toMeta(snap.id, data, user.uid),
        payload: data.payload ?? '',
    };
}

/**
 * Delete a cloud test.  Only the owner is permitted (enforced by rules).
 */
export async function deleteCloudTest(extId: string): Promise<void> {
    const db = getFirebaseDb();
    if (db === undefined) {
        return;
    }
    await deleteDoc(doc(db, TESTS, extIdToDocId(extId)));
}

/**
 * List every cloud test the current user can access: owned, shared as editor,
 * or pending (invited by email but not yet claimed).  Pending tests are claimed
 * (email -> uid) on the fly so subsequent loads see them as editor tests.
 */
export async function listMyCloudTests(): Promise<CloudTestMeta[]> {
    const db = getFirebaseDb();
    const user = getCloudUser();
    if (db === undefined || user === null) {
        return [];
    }
    const col = collection(db, TESTS);
    const [ownedSnap, editorSnap, pendingSnap] = await Promise.all([
        getDocs(query(col, where('ownerUid', '==', user.uid))),
        getDocs(query(col, where('editorUids', 'array-contains', user.uid))),
        getDocs(query(col, where('pendingInvites', 'array-contains', user.email))),
    ]);

    const byId = new Map<string, CloudTestMeta>();
    for (const d of ownedSnap.docs) {
        byId.set(d.id, toMeta(d.id, d.data(), user.uid));
    }
    for (const d of editorSnap.docs) {
        byId.set(d.id, toMeta(d.id, d.data(), user.uid));
    }
    // Claim any pending invites addressed to this user, then include them.
    for (const d of pendingSnap.docs) {
        if (!byId.has(d.id)) {
            await updateDoc(doc(db, TESTS, d.id), {
                pendingInvites: arrayRemove(user.email),
                editorUids: arrayUnion(user.uid),
                editorEmails: arrayUnion(user.email),
            }).catch((e) => console.error('Unable to claim shared test', e));
            byId.set(d.id, toMeta(d.id, d.data(), user.uid));
        }
    }

    return Array.from(byId.values()).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/**
 * Look up a user's uid by email via the users collection, or null if none.
 */
async function findUidByEmail(email: string): Promise<string | null> {
    const db = getFirebaseDb();
    if (db === undefined) {
        return null;
    }
    const snap = await getDocs(query(collection(db, USERS), where('email', '==', email)));
    if (snap.empty) {
        return null;
    }
    return snap.docs[0].id;
}

/**
 * Share a cloud test with an email address.  Only the owner may call this
 * (enforced by rules).  If the invitee already has an account they become an
 * editor immediately; otherwise they are stored as a pending invite that is
 * claimed when they next sign in.
 */
export async function shareCloudTest(extId: string, rawEmail: string): Promise<ShareResult> {
    const db = getFirebaseDb();
    if (db === undefined) {
        return 'invalid';
    }
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) {
        return 'invalid';
    }
    const existing = await getCloudTest(extId);
    if (existing !== null) {
        if (existing.ownerEmail === email || existing.editorEmails.indexOf(email) !== -1) {
            return 'already';
        }
    }
    const ref = doc(db, TESTS, extIdToDocId(extId));
    const uid = await findUidByEmail(email);
    if (uid !== null) {
        await updateDoc(ref, {
            editorUids: arrayUnion(uid),
            editorEmails: arrayUnion(email),
            pendingInvites: arrayRemove(email),
        });
        return 'added';
    }
    await updateDoc(ref, {
        pendingInvites: arrayUnion(email),
        editorEmails: arrayUnion(email),
    });
    return 'pending';
}

/**
 * Remove an email's access to a cloud test (revoke).  Only the owner may call
 * this (enforced by rules).  Security rules key off editorUids, so we must
 * reliably remove the invitee's uid - not just their email from editorEmails.
 */
export async function unshareCloudTest(extId: string, rawEmail: string): Promise<void> {
    const db = getFirebaseDb();
    const user = getCloudUser();
    if (db === undefined || user === null) {
        throw new Error('You must be signed in to update sharing.');
    }
    const email = normalizeEmail(rawEmail);
    const ref = doc(db, TESTS, extIdToDocId(extId));
    const uidFromLookup = await findUidByEmail(email);

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) {
            throw new Error('This cloud test no longer exists.');
        }
        const data = snap.data();
        const editorUids: string[] = Array.isArray(data.editorUids) ? data.editorUids : [];
        const editorEmails: string[] = Array.isArray(data.editorEmails) ? data.editorEmails : [];
        const pendingInvites: string[] = Array.isArray(data.pendingInvites)
            ? data.pendingInvites
            : [];

        const uidsToRemove = new Set<string>();
        if (uidFromLookup !== null && editorUids.indexOf(uidFromLookup) !== -1) {
            uidsToRemove.add(uidFromLookup);
        }
        // Fallback when the users lookup misses: resolve each editor uid's email
        // from their profile document inside the same transaction.
        for (const editorUid of editorUids) {
            if (uidsToRemove.has(editorUid)) {
                continue;
            }
            const userSnap = await tx.get(doc(db, USERS, editorUid));
            if (!userSnap.exists()) {
                continue;
            }
            const profileEmail = normalizeEmail(String(userSnap.data().email ?? ''));
            if (profileEmail === email) {
                uidsToRemove.add(editorUid);
            }
        }

        tx.update(ref, {
            editorUids: editorUids.filter((uid) => !uidsToRemove.has(uid)),
            editorEmails: editorEmails.filter((entry) => normalizeEmail(entry) !== email),
            pendingInvites: pendingInvites.filter((entry) => normalizeEmail(entry) !== email),
        });
    });
}
