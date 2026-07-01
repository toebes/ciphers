/**
 * Firebase project configuration for cloud test storage and sharing.
 *
 * These values are NOT secret - a Firebase web config is safe to commit and
 * ship to the browser.  Access to data is controlled by Firebase Authentication
 * and Firestore Security Rules, not by hiding this config.
 *
 * SETUP (one time, done by the project owner):
 *   1. Create a project at https://console.firebase.google.com
 *   2. Add a Web app to the project and copy its config object here.
 *   3. Authentication -> Sign-in method -> enable Google.
 *   4. Firestore Database -> create database (production mode).
 *   5. Deploy the security rules in firestore.rules.
 *
 * Until real values are filled in, isFirebaseConfigured() returns false and the
 * app silently runs in local-only mode (no cloud UI, no errors).
 */
export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
}

export const firebaseConfig: FirebaseConfig = {
    apiKey: 'AIzaSyD-M9vf3SNtr-AgenTriAEp4apY6qcart0',
    authDomain: 'toebes-ciphers.firebaseapp.com',
    projectId: 'toebes-ciphers',
    storageBucket: 'toebes-ciphers.firebasestorage.app',
    messagingSenderId: '945164683853',
    appId: '1:945164683853:web:363dd14cb6dadb6c122a04',
    measurementId: 'G-D3L5XK41KS',
};

/**
 * Returns true only when the Firebase config has been filled in with real
 * project values.  Every cloud feature checks this first so the app degrades
 * gracefully to local-only storage when the config is empty.
 */
export function isFirebaseConfigured(): boolean {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}
