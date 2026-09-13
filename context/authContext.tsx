"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, User } from "firebase/auth";
import { app } from "../firebaseConfig";

// Define the shape of the AuthContext
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// Create the context with a default value of null for user and loading
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    // A storage-persistence failure must not prevent observing the session.
    void setPersistence(auth, browserLocalPersistence).catch(error => {
      console.error("Unable to persist Firebase Auth", error);
    });
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user);
      setLoading(false);
    }, error => {
      console.error("Unable to observe Firebase Auth", error);
      setLoading(false);
    });
    return unsubscribe;
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};