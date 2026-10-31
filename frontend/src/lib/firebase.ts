import { ConfirmationResult } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDYhZy9TLUbc3TKfIspbVTvItg_atk1oIc',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'gdgcodealchemist.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'gdgcodealchemist',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'gdgcodealchemist.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '690303491579',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:690303491579:web:fd8c6cea7231872918ff5e',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-8PD2L8LGG7',
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== 'your_firebase_web_api_key' &&
      firebaseConfig.projectId &&
      firebaseConfig.projectId !== 'your-project-id'
  );
}

export async function triggerFirebasePhoneOtp(
  phone: string,
  recaptchaContainerId: string
): Promise<ConfirmationResult | null> {
  if (typeof window === 'undefined' || !isFirebaseClientConfigured()) {
    return null;
  }
  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth, RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const auth = getAuth(app);
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'invisible',
    });
    return await signInWithPhoneNumber(auth, phone, verifier);
  } catch (err) {
    console.warn('Firebase client phone auth fallback to backend OTP:', err);
    return null;
  }
}
