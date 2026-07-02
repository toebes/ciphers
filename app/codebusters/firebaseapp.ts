/**
 * Lazily-initialized Firebase singletons (app, auth, firestore).
 *
 * All accessors return undefined when Firebase has not been configured (see
 * firebaseconfig.ts) so callers can cleanly fall back to local-only behavior.
 */
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseconfig';

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

/**
 * Get (creating on first use) the Firebase app, or undefined if not configured.
 */
export function getFirebaseApp(): FirebaseApp | undefined {
    if (!isFirebaseConfigured()) {
        return undefined;
    }
    if (app === undefined) {
        app = initializeApp(firebaseConfig);
    }
    return app;
}

/**
 * Get (creating on first use) the Firebase Auth instance, or undefined.
 */
export function getFirebaseAuth(): Auth | undefined {
    const firebaseApp = getFirebaseApp();
    if (firebaseApp === undefined) {
        return undefined;
    }
    if (authInstance === undefined) {
        authInstance = getAuth(firebaseApp);
    }
    return authInstance;
}

/**
 * Get (creating on first use) the Firestore instance, or undefined.
 */
export function getFirebaseDb(): Firestore | undefined {
    const firebaseApp = getFirebaseApp();
    if (firebaseApp === undefined) {
        return undefined;
    }
    if (dbInstance === undefined) {
        dbInstance = getFirestore(firebaseApp);
    }
    return dbInstance;
}
