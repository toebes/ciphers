/**
 * cloudauth.ts - Google OAuth authentication for cloud test storage.
 *
 * Wraps Firebase Authentication so the rest of the app can sign in/out, observe
 * the current user, and know whether the cloud is available - without importing
 * the Firebase SDK directly.  When Firebase is not configured every function is
 * a safe no-op and the app continues in local-only mode.
 */
import {
    GoogleAuthProvider,
    User,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { InitStorage, JTStorage } from '../common/jtstore';
import { getFirebaseAuth, getFirebaseDb } from './firebaseapp';
import { isFirebaseConfigured } from './firebaseconfig';

/**
 * Local-storage keys used to mirror the signed-in identity so the shared menu
 * (cipherhandler.updateLoginInfo) can show "Signed in as ..." without importing
 * any cloud/Firebase code.  These MUST match CipherHandler.KEY_USER_ID /
 * KEY_FIRST_NAME with the 'config_' prefix that setConfigString applies.
 */
const CONFIG_USER_ID_KEY = 'config_userid';
const CONFIG_FIRST_NAME_KEY = 'config_fname';

/**
 * Minimal view of the signed-in user used throughout the app.
 */
export interface CloudUser {
    uid: string;
    email: string;
    displayName: string;
}

type AuthListener = (user: CloudUser | null) => void;

let currentUser: CloudUser | null = null;
let initialized = false;
/** Resolves once Firebase reports the initial auth state (signed in or out). */
let authReadyPromise: Promise<CloudUser | null> | undefined;
let storage: JTStorage | undefined;
const listeners: AuthListener[] = [];

/**
 * Mirror (or clear) the signed-in identity into local-storage config strings so
 * the shared menu can display it without any cloud dependency.
 */
function mirrorIdentity(user: CloudUser | null): void {
    if (storage === undefined) {
        storage = InitStorage();
    }
    if (!storage.isAvailable()) {
        return;
    }
    if (user !== null) {
        storage.set(CONFIG_USER_ID_KEY, user.email);
        storage.set(CONFIG_FIRST_NAME_KEY, user.displayName || user.email);
    } else {
        storage.remove(CONFIG_USER_ID_KEY);
        storage.remove(CONFIG_FIRST_NAME_KEY);
    }
}

/**
 * True when a Firebase project has been configured (cloud features enabled).
 */
export function isCloudAvailable(): boolean {
    return isFirebaseConfigured();
}

/**
 * The currently signed-in user, or null when signed out / cloud disabled.
 */
export function getCloudUser(): CloudUser | null {
    return currentUser;
}

/**
 * True when there is a signed-in cloud user.
 */
export function isSignedIn(): boolean {
    return currentUser !== null;
}

/**
 * Wait until Firebase has reported the initial auth state.  Cloud reads must
 * await this - otherwise getCloudUser() is still null on the first page tick
 * even when the user is already signed in (Firebase restores the session async).
 */
export function waitForCloudAuth(): Promise<CloudUser | null> {
    initCloudAuth();
    return authReadyPromise ?? Promise.resolve(null);
}

/**
 * Convert a Firebase User into our lightweight CloudUser.
 */
function toCloudUser(user: User): CloudUser {
    return {
        uid: user.uid,
        email: (user.email ?? '').toLowerCase(),
        displayName: user.displayName ?? user.email ?? 'Cloud User',
    };
}

/**
 * Record/refresh the user's profile document so invitations addressed to their
 * email can be resolved to a uid.  Best-effort: failures are logged, not thrown.
 */
async function upsertUserProfile(user: CloudUser): Promise<void> {
    const db = getFirebaseDb();
    if (db === undefined) {
        return;
    }
    try {
        await setDoc(
            doc(db, 'users', user.uid),
            {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                lastLogin: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (e) {
        console.error('Unable to update cloud user profile', e);
    }
}

/**
 * Subscribe to sign-in/sign-out changes.  The callback fires immediately with
 * the current state and again whenever it changes.  Returns an unsubscribe fn.
 */
export function onCloudAuthChanged(cb: AuthListener): () => void {
    listeners.push(cb);
    cb(currentUser);
    return () => {
        const idx = listeners.indexOf(cb);
        if (idx !== -1) {
            listeners.splice(idx, 1);
        }
    };
}

/**
 * Notify all subscribers of the current auth state.
 */
function notify(): void {
    for (const cb of listeners) {
        cb(currentUser);
    }
}

/**
 * Begin listening for Firebase auth state changes.  Idempotent - safe to call
 * from every page load.  Does nothing when the cloud is not configured.
 */
export function initCloudAuth(): void {
    if (initialized) {
        return;
    }
    const auth = getFirebaseAuth();
    if (auth === undefined) {
        authReadyPromise = Promise.resolve(null);
        return;
    }
    initialized = true;
    let authReadyResolved = false;
    authReadyPromise = new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            currentUser = user !== null ? toCloudUser(user) : null;
            mirrorIdentity(currentUser);
            if (currentUser !== null) {
                void upsertUserProfile(currentUser);
            }
            notify();
            if (!authReadyResolved) {
                authReadyResolved = true;
                resolve(currentUser);
            }
        });
    });
}

/**
 * Launch the Google sign-in popup.  Resolves with the signed-in user.
 * Throws if the cloud is not configured or the popup is dismissed/blocked.
 */
export async function cloudSignIn(): Promise<CloudUser> {
    const auth = getFirebaseAuth();
    if (auth === undefined) {
        throw new Error('Cloud storage is not configured for this site.');
    }
    initCloudAuth();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = toCloudUser(result.user);
    currentUser = user;
    mirrorIdentity(user);
    await upsertUserProfile(user);
    notify();
    return user;
}

/**
 * Sign the current user out.  Safe to call when already signed out.
 */
export async function cloudSignOut(): Promise<void> {
    const auth = getFirebaseAuth();
    if (auth === undefined) {
        return;
    }
    await signOut(auth);
    currentUser = null;
    mirrorIdentity(null);
    notify();
}
