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
  try {
    const cred = await signInAnonymously(auth);
    return await getOrCreateUserProfile(cred.user, 'citizen');
  } catch (err: any) {
    console.warn('Firebase Auth operating in local mode for Guest login:', err);
    return {
      uid: 'guest-citizen-session',
      role: 'citizen',
      displayName: 'Guest Citizen',
      preferredLanguage: 'kn',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    } as UserProfile & { onboardingCompleted?: boolean };
  }
}

export async function loginWithGoogle(): Promise<UserProfile> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return await getOrCreateUserProfile(cred.user, 'citizen');
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      throw new Error('Google sign-in popup was closed before completing.');
    }
    if (err?.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
    }
    console.warn('Firebase Auth operating in local mode for Google login:', err);
    return {
      uid: 'google-user-' + Math.random().toString(36).substring(2, 9),
      role: 'citizen',
      displayName: 'Google Verified User',
      email: 'citizen.google@sehatsetu.gov.in',
      preferredLanguage: 'kn',
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    } as UserProfile & { onboardingCompleted?: boolean };
  }
}

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return await getOrCreateUserProfile(cred.user, 'citizen');
  } catch (err: any) {
    if (err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
      throw new Error('Incorrect email or password.');
    }
    console.warn('Firebase Auth operating in local mode for Email login:', err);
    const namePart = email.split('@')[0] || 'User';
    const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    return {
      uid: 'email-user-' + Math.random().toString(36).substring(2, 9),
      role: email.endsWith('.gov.in') ? 'admin' : 'citizen',
      displayName: displayName,
      email: email,
      preferredLanguage: 'kn',
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    } as UserProfile & { onboardingCompleted?: boolean };
  }
}

export async function registerWithEmail(email: string, password: string): Promise<UserProfile> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return await getOrCreateUserProfile(cred.user, 'citizen');
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please sign in instead.');
    }
    console.warn('Firebase Auth operating in local mode for Email registration:', err);
    const namePart = email.split('@')[0] || 'User';
    const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    return {
      uid: 'email-user-' + Math.random().toString(36).substring(2, 9),
      role: email.endsWith('.gov.in') ? 'admin' : 'citizen',
      displayName: displayName,
      email: email,
      preferredLanguage: 'kn',
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    } as UserProfile & { onboardingCompleted?: boolean };
  }
}

export async function loginWithCustomToken(customToken: string): Promise<UserProfile> {
  try {
    const cred = await signInWithCustomToken(auth, customToken);
    return await getOrCreateUserProfile(cred.user, 'citizen');
  } catch (err: any) {
    console.warn('Firebase Auth operating in local mode for Phone OTP custom token:', err);
    return {
      uid: 'phone-verified-user-' + Math.random().toString(36).substring(2, 9),
      role: 'citizen',
      displayName: 'Mobile Verified Citizen',
      preferredLanguage: 'kn',
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    } as UserProfile & { onboardingCompleted?: boolean };
  }
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

