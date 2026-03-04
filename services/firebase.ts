import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Mobile browsers block popups → use redirect instead
const isMobileBrowser = () =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

type GoogleResult = { idToken: string; displayName: string | null; email: string | null; photoURL: string | null };

export async function signInWithGoogle(): Promise<GoogleResult> {
    if (isMobileBrowser()) {
        // On mobile: redirect to Google (returns void, page navigates away)
        await signInWithRedirect(auth, googleProvider);
        // This never executes — throw so TypeScript is happy
        throw new Error('REDIRECT_PENDING');
    }

    // Desktop: popup works fine
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return {
        idToken,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
    };
}

// Call this on page load to handle the redirect callback from Google
export async function getGoogleRedirectResult(): Promise<GoogleResult | null> {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const idToken = await result.user.getIdToken();
    return {
        idToken,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
    };
}
