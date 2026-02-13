// ============================================
// Firebase Auth — Helper Functions
// ============================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from './firebase';

function getAuth() {
  if (!auth) {
    throw new Error(
      'Firebase is not configured. Add your credentials to .env.local — see .env.local.example'
    );
  }
  return auth;
}

// ─── Email / Password ─────────────────────────────────

export async function signUp(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(getAuth(), email, password);
  await updateProfile(credential.user, { displayName });
  return credential.user;
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getAuth(), email, password);
  return credential.user;
}

export async function logOut() {
  await signOut(getAuth());
}

// ─── Google OAuth ─────────────────────────────────────

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(getAuth(), googleProvider);
  return result.user;
}

// ─── Password Reset ──────────────────────────────────

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(getAuth(), email);
}

// ─── Auth State Listener ─────────────────────────────

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  if (!auth) {
    // Firebase not configured — immediately report no user, return noop unsubscribe
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export type { User };
