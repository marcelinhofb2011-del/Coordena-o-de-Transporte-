import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, getUserData, createInitialUser, db } from '../services/firebase';
import { AppUser } from '../types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, appUser: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result first
    const checkRedirect = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error) {
        console.error('Redirect sign-in error:', error);
      }
    };
    checkRedirect();

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (authenticatedUser) => {
      setUser(authenticatedUser);
      
      // Clean up previous doc subscription if it exists
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (!authenticatedUser) {
        setAppUser(null);
        setLoading(false);
      } else {
        setLoading(true);
        const userDocRef = doc(db, 'users', authenticatedUser.uid);
        unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setAppUser({ uid: docSnap.id, ...docSnap.data() } as AppUser);
          } else {
            // Document doesn't exist yet, try to create it
            const data = await createInitialUser(authenticatedUser);
            setAppUser(data);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error listening to user doc:', error);
          setLoading(false);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
