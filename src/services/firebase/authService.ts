import { 
  signInAnonymously, 
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from './firebase';
import type { UserProfile, UserRole } from '../../types';

const STORAGE_KEY_USER = 'sehat_setu_user_session';

export async function loginAnonymous(): Promise<UserProfile> {
  try {
    const cred = await signInAnonymously(auth);
    const userProfile: UserProfile = {
      uid: cred.user.uid,
      role: 'citizen',
      preferredLanguage: 'hi',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userProfile));
    return userProfile;
  } catch (err) {
    // Demo mode local session fallback
    const mockUid = 'citizen-demo-' + Math.random().toString(36).substring(2, 9);
    const mockProfile: UserProfile = {
      uid: mockUid,
      role: 'citizen',
      displayName: 'Citizen User (Demo)',
      preferredLanguage: 'hi',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockProfile));
    return mockProfile;
  }
}

export async function loginDemoRole(role: UserRole): Promise<UserProfile> {
  const profile: UserProfile = {
    uid: `${role}-demo-user`,
    role: role,
    displayName: role === 'admin' ? 'Health Admin Officer' : role === 'volunteer' ? 'ASHA Support Worker' : 'Citizen Demo User',
    email: `${role}@sehatsetu.gov.in`,
    preferredLanguage: 'hi',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
  return profile;
}

export function getCurrentSessionUser(): UserProfile | null {
  const data = localStorage.getItem(STORAGE_KEY_USER);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    // ignore
  }
  localStorage.removeItem(STORAGE_KEY_USER);
}
