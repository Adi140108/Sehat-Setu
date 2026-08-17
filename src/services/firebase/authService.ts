import {
  signInAnonymously,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { UserProfile, UserRole } from '../../types';

/**
 * Maps a Firebase user auth object and optional role to our UserProfile model from Firestore.
 */
export async function getOrCreateUserProfile(user: FirebaseUser, role: UserRole = 'citizen'): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    const data = userDocSnap.data();
    return {
      uid: user.uid,
      role: data.role || role,
      displayName: data.displayName || user.displayName || 'Sehat Setu User',
      email: data.email || user.email || '',
      phone: data.phoneNumber || user.phoneNumber || '',
      photoUrl: data.photoUrl || user.photoURL || undefined,
      preferredLanguage: data.preferredLanguage || 'kn',
      location: data.location || undefined,
      onboardingCompleted: Boolean(data.onboardingCompleted),
      createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString()) : new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    } as UserProfile & { onboardingCompleted?: boolean };
  }

  // Create new profile in Firestore if it doesn't exist
  const newProfile: any = {
    uid: user.uid,
    role: role,
    displayName: user.displayName || 'Sehat Setu User',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    photoUrl: user.photoURL || '',
    preferredLanguage: 'kn', // Default to Kannada
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    onboardingCompleted: false
  };

  await setDoc(userDocRef, newProfile);

  return {
    uid: user.uid,
    role: newProfile.role,
    displayName: newProfile.displayName,
    email: newProfile.email,
    phone: newProfile.phoneNumber,
    photoUrl: newProfile.photoUrl || undefined,
    preferredLanguage: newProfile.preferredLanguage,
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  } as UserProfile & { onboardingCompleted?: boolean };
}

export async function loginAnonymous(): Promise<UserProfile> {
  const cred = await signInAnonymously(auth);
  const profile = await getOrCreateUserProfile(cred.user, 'citizen');
  return profile;
}

export async function loginWithGoogle(): Promise<UserProfile> {
  const cred = await signInWithPopup(auth, googleProvider);
  const profile = await getOrCreateUserProfile(cred.user, 'citizen');
  return profile;
}

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getOrCreateUserProfile(cred.user, 'citizen');
  return profile;
}

export async function registerWithEmail(email: string, password: string): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile = await getOrCreateUserProfile(cred.user, 'citizen');
  return profile;
}

export async function loginWithCustomToken(customToken: string): Promise<UserProfile> {
  const cred = await signInWithCustomToken(auth, customToken);
  const profile = await getOrCreateUserProfile(cred.user, 'citizen');
  return profile;
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// Set up listener to sync state with Firebase Auth
export function subscribeToAuth(callback: (user: (UserProfile & { onboardingCompleted?: boolean }) | null) => void) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      try {
        const profile = await getOrCreateUserProfile(fbUser);
        callback(profile);
      } catch (e) {
        console.error('Failed to load user profile from Firestore:', e);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

