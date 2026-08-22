import { useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { AuthContext } from "@/lib/auth-context";
import { getSnapshot, subscribeAuth, type AuthSnapshot } from "@/lib/auth-storage";
import { auth, googleProvider } from "@/lib/firebase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<AuthSnapshot>(getSnapshot);
  const [loading, setLoading] = useState(snap.user === null);

  useEffect(() => {
    return subscribeAuth((next) => {
      setSnap(next);
      setLoading(false);
    });
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signupWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: snap.user !== null,
        loading,
        email: snap.user?.email ?? null,
        role: snap.role,
        clientId: snap.clientId,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
