import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User, 
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, query, collection, where, onSnapshot, Unsubscribe, addDoc, updateDoc, deleteDoc, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, UserRole, OperationType, LogAction } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');

// Utility to detect mobile
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export async function createAuditLog(action: LogAction, details: string, targetId: string) {
  if (!auth.currentUser) return;
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      details,
      targetId,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || auth.currentUser.email || 'Sistema',
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Email login error:', error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    
    // Create initial user document in Firestore immediately
    const emailLower = email.toLowerCase();
    const newUser: AppUser = {
      uid: result.user.uid,
      name: name,
      email: emailLower,
      role: emailLower === 'marcelinhofb2011@gmail.com' ? UserRole.ADMIN : UserRole.USER,
      createdAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'users', result.user.uid), newUser);
    return result.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const loginWithMicrosoft = async () => {
  try {
    const result = await signInWithPopup(auth, microsoftProvider);
    return result.user;
  } catch (error) {
    console.error('Microsoft login error:', error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export const getUserData = async (uid: string): Promise<AppUser | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid: docSnap.id, ...docSnap.data() } as AppUser;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
};

export const createInitialUser = async (user: User): Promise<AppUser> => {
  const email = (user.email || '').toLowerCase();
  const isAdmin = email === 'marcelinhofb2011@gmail.com';
  
  const newUser: AppUser = {
    uid: user.uid,
    name: user.displayName || 'Usuário',
    email: email,
    role: isAdmin ? UserRole.ADMIN : UserRole.USER,
    createdAt: Timestamp.now(),
  };

  try {
    await setDoc(doc(db, 'users', user.uid), newUser);
  } catch (error) {
    console.error('Error creating initial user document:', error);
  }
  return newUser;
};
