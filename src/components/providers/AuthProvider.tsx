// ============================================
// Auth Context — Firebase Auth Provider
// ============================================
// Provides current user state and auth methods to the entire app
// via React context. Wraps the Firebase auth listener.

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  signUp,
  signIn,
  logOut,
  signInWithGoogle,
  resetPassword,
  onAuthChange,
  type User,
} from '@/lib/auth';

// ─── Context Shape ──────────────────────────────────

interface AuthContextValue {
  /** Current Firebase user or null if signed out */
  user: User | null;
  /** True while the initial auth state is being determined */
  loading: boolean;
  /** Create account with email + password */
  signUp: (email: string, password: string, displayName: string) => Promise<User>;
  /** Sign in with email + password */
  signIn: (email: string, password: string) => Promise<User>;
  /** Sign in with Google popup */
  signInWithGoogle: () => Promise<User>;
  /** Send password reset email */
  resetPassword: (email: string) => Promise<void>;
  /** Sign out */
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const u = await signUp(email, password, displayName);
      return u;
    },
    []
  );

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const u = await signIn(email, password);
    return u;
  }, []);

  const handleGoogle = useCallback(async () => {
    const u = await signInWithGoogle();
    return u;
  }, []);

  const handleReset = useCallback(async (email: string) => {
    await resetPassword(email);
  }, []);

  const handleLogOut = useCallback(async () => {
    await logOut();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleGoogle,
    resetPassword: handleReset,
    logOut: handleLogOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
