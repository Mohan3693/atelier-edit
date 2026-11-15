import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
      setAuthError(message);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign out right now.';
      setAuthError(message);
    }
  }, []);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!auth.currentUser) {
      throw new Error('You must be signed in to update your profile.');
    }
    const trimmed = displayName.trim();
    if (!trimmed) {
      throw new Error('Display name cannot be empty.');
    }
    await updateProfile(auth.currentUser, { displayName: trimmed });
    await auth.currentUser.reload();
    setUser(auth.currentUser ? ({ ...auth.currentUser } as User) : null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user found.');
    }
    try {
      await deleteUser(auth.currentUser);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/requires-recent-login') {
        await reauthenticateWithPopup(auth.currentUser, googleAuthProvider);
        await deleteUser(auth.currentUser);
      } else {
        throw err;
      }
    }
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authError,
      clearAuthError,
      signInWithGoogle,
      signOutUser,
      updateDisplayName,
      deleteAccount,
      getIdToken,
    }),
    [
      user,
      loading,
      authError,
      clearAuthError,
      signInWithGoogle,
      signOutUser,
      updateDisplayName,
      deleteAccount,
      getIdToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
