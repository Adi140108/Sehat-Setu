import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { 
  SupportRequest, 
  Referral, 
  Reminder, 
  AnalyticsSummary, 
  LanguageCode, 
  IntentCategory, 
  HouseholdMember,
  UserProfile,
  UserDocument,
  SehatPassToken
} from '../../types';

// Storage keys for local fallback
const STORAGE_KEYS = {
  SUPPORT_REQUESTS: 'sehat_setu_support_requests',
  REFERRALS: 'sehat_setu_referrals',
  REMINDERS: 'sehat_setu_reminders',
  ANALYTICS: 'sehat_setu_analytics',
  HOUSEHOLD: 'sehat_setu_household_profile'
};

// Local storage helper
function isLocalStorageAvailable() {
  return typeof window !== 'undefined' && window.localStorage;
}

// -------------------------------------------------------------
// 1. User Profile & Preferences (Firestore Collections)
// -------------------------------------------------------------

export async function saveUserProfile(uid: string, profileData: Partial<UserProfile>): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, {
    ...profileData,
    uid,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getUserPreferences(uid: string): Promise<any | null> {
  try {
    const prefDoc = await getDoc(doc(db, 'userPreferences', uid));
    return prefDoc.exists() ? prefDoc.data() : null;
  } catch (e) {
    console.error('Error fetching user preferences:', e);
    return null;
  }
}

export async function saveUserPreferences(uid: string, preferences: any): Promise<void> {
  const prefDocRef = doc(db, 'userPreferences', uid);
  await setDoc(prefDocRef, {
    ...preferences,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function saveUserPrivateData(uid: string, privateData: any): Promise<void> {
  const privateDocRef = doc(db, 'userPrivate', uid);
  await setDoc(privateDocRef, {
    ...privateData,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getUserPrivateData(uid: string): Promise<any | null> {
  try {
    const docSnap = await getDoc(doc(db, 'userPrivate', uid));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    return null;
  }
}

// -------------------------------------------------------------
// 2. Sehat Pass (Firestore Collections)
// -------------------------------------------------------------

export async function getSehatPass(uid: string): Promise<any | null> {
  try {
    const docSnap = await getDoc(doc(db, 'sehatPasses', uid));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    return null;
  }
}

export async function saveSehatPass(uid: string, passData: any): Promise<void> {
  const passDocRef = doc(db, 'sehatPasses', uid);
  await setDoc(passDocRef, {
    ...passData,
    uid,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// -------------------------------------------------------------
// 3. Family Foundation (Firestore Collections)
// -------------------------------------------------------------

export async function getHouseholdMembers(): Promise<HouseholdMember[]> {
  const user = auth.currentUser;
  
  if (user && !user.isAnonymous) {
    try {
      // Try subcollection first users/{uid}/family
      const subSnapshot = await getDocs(collection(db, 'users', user.uid, 'family'));
      const members: HouseholdMember[] = [];
      
      subSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        members.push({
          id: docSnap.id,
          familyMemberId: docSnap.id,
          name: data.name || '',
          age: data.age,
          dateOfBirth: data.dateOfBirth,
          preferredLanguage: data.preferredLanguage,
          profileImage: data.profileImage,
          schemeInfo: data.schemeInfo,
          gender: data.gender || '',
          relationship: data.relationship || '',
          hasAadhaar: data.hasAadhaar || false,
          hasRationCard: data.hasRationCard || false,
          incomeCategory: data.incomeCategory || 'NONE',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });

      if (members.length > 0) {
        return members;
      }

      // If subcollection is empty, query legacy top-level collection
      const q = query(collection(db, 'families'), where('ownerUid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        members.push({
          id: docSnap.id,
          familyMemberId: docSnap.id,
          name: data.name || '',
          age: data.age || 0,
          gender: data.gender || '',
          relationship: data.relationship || '',
          hasAadhaar: data.hasAadhaar || false,
          hasRationCard: data.hasRationCard || false,
          incomeCategory: data.incomeCategory || 'NONE',
          createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
        });
      });
      return members;
    } catch (e) {
      console.error('Error reading family from Firestore:', e);
    }
  }

  // Fallback to local storage for guests and offline mode
  if (isLocalStorageAvailable()) {
    const data = localStorage.getItem(STORAGE_KEYS.HOUSEHOLD);
    if (data) {
      try { return JSON.parse(data); } catch (e) {}
    }
  }
  return [];
}

export async function saveHouseholdMembers(members: HouseholdMember[]): Promise<void> {
  const user = auth.currentUser;

  if (user && !user.isAnonymous) {
    try {
      const batch = writeBatch(db);
      
      // 1. Clear legacy top-level collections
      const legacyQ = query(collection(db, 'families'), where('ownerUid', '==', user.uid));
      const legacySnapshot = await getDocs(legacyQ);
      legacySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 2. Clear subcollection users/{uid}/family
      const subSnapshot = await getDocs(collection(db, 'users', user.uid, 'family'));
      subSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      // 3. Write new members to both paths
      members.forEach((m) => {
        const docId = m.id || 'mem-' + Math.random().toString(36).substring(2, 9);
        const createdAt = m.createdAt || new Date().toISOString();
        const updatedAt = new Date().toISOString();
        
        // Path A: Legacy families top-level
        const legacyRef = doc(db, 'families', docId);
        batch.set(legacyRef, {
          familyId: docId,
          ownerUid: user.uid,
          name: m.name,
          age: m.age || 0,
          gender: m.gender || '',
          relationship: m.relationship,
          hasAadhaar: m.hasAadhaar || false,
          hasRationCard: m.hasRationCard || false,
          incomeCategory: m.incomeCategory || 'NONE',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Path B: Subcollection users/{uid}/family/{docId}
        const subRef = doc(db, 'users', user.uid, 'family', docId);
        batch.set(subRef, {
          familyMemberId: docId,
          name: m.name,
          relationship: m.relationship,
          age: m.age,
          dateOfBirth: m.dateOfBirth || '',
          preferredLanguage: m.preferredLanguage || '',
          profileImage: m.profileImage || null,
          schemeInfo: m.schemeInfo || '',
          createdAt,
          updatedAt
        });
      });
      
      await batch.commit();
    } catch (e) {
      console.error('Error writing family to Firestore:', e);
    }
  }

  // Always sync with localStorage for quick access/offline fallback
  if (isLocalStorageAvailable()) {
    localStorage.setItem(STORAGE_KEYS.HOUSEHOLD, JSON.stringify(members));
  }
}

// -------------------------------------------------------------
// 4. Support Requests (Firestore & Offline Support)
// -------------------------------------------------------------

export async function createSupportRequest(
  req: Omit<SupportRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<SupportRequest> {
  const user = auth.currentUser;
  const requestId = 'req-' + Math.random().toString(36).substring(2, 9);
  
  const newReq: SupportRequest = {
    ...req,
    id: requestId,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (user && !user.isAnonymous) {
    try {
      const docRef = doc(db, 'supportRequests', requestId);
      await setDoc(docRef, {
        ...newReq,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Firestore createSupportRequest failed, using local only:', e);
    }
  }

  // Local fallback
  if (isLocalStorageAvailable()) {
    const existing = getSupportRequests();
    existing.unshift(newReq);
    localStorage.setItem(STORAGE_KEYS.SUPPORT_REQUESTS, JSON.stringify(existing));
    incrementAnalytics('humanSupportRequests');
  }

  return newReq;
}

export function getSupportRequests(): SupportRequest[] {
  // We keep local storage sync for demo UI, but can sync from firestore in future modules
  if (isLocalStorageAvailable()) {
    const data = localStorage.getItem(STORAGE_KEYS.SUPPORT_REQUESTS);
    if (data) {
      try { return JSON.parse(data); } catch (e) {}
    }
  }
  return [];
}

export async function updateSupportRequestStatus(
  id: string, 
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED', 
  volunteerName?: string
): Promise<void> {
  // Update Firestore
  try {
    const docRef = doc(db, 'supportRequests', id);
    await updateDoc(docRef, {
      status,
      assignedToVolunteerName: volunteerName || 'ASHA Worker',
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    // Fail silently, fallback handles offline
  }

  // Update Local Storage
  if (isLocalStorageAvailable()) {
    const requests = getSupportRequests();
    const updated = requests.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status,
          assignedToVolunteerName: volunteerName || r.assignedToVolunteerName || 'ASHA Worker',
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    localStorage.setItem(STORAGE_KEYS.SUPPORT_REQUESTS, JSON.stringify(updated));
  }
}

// -------------------------------------------------------------
// 5. Reminders (Firestore & Offline Support)
// -------------------------------------------------------------

export function getReminders(userId: string): Reminder[] {
  if (isLocalStorageAvailable()) {
    const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    if (!data) return [];
    try {
      const list: Reminder[] = JSON.parse(data);
      return list.filter(r => r.userId === userId || userId.includes('demo') || userId.includes('guest'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

export async function createReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'status'>): Promise<Reminder> {
  const reminderId = 'rem-' + Math.random().toString(36).substring(2, 8);
  const newR: Reminder = {
    ...reminder,
    id: reminderId,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  const user = auth.currentUser;
  if (user && !user.isAnonymous) {
    try {
      const docRef = doc(db, 'reminders', reminderId);
      await setDoc(docRef, {
        ...newR,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Firestore createReminder failed:', e);
    }
  }

  if (isLocalStorageAvailable()) {
    const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    const list: Reminder[] = data ? JSON.parse(data) : [];
    list.unshift(newR);
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(list));
  }

  return newR;
}

// -------------------------------------------------------------
// 6. Referrals & Follow-ups
// -------------------------------------------------------------

export async function createReferral(
  userId: string, 
  facilityId: string, 
  facilityName: string, 
  reason: string
): Promise<Referral> {
  const referralId = 'ref-' + Math.random().toString(36).substring(2, 8);
  const newRef: Referral = {
    id: referralId,
    userId,
    facilityId,
    facilityName,
    reason,
    createdAt: new Date().toISOString(),
    followUpStatus: 'PENDING'
  };

  const user = auth.currentUser;
  if (user && !user.isAnonymous) {
    try {
      const docRef = doc(db, 'referrals', referralId);
      await setDoc(docRef, {
        ...newRef,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      // offline
    }
  }

  if (isLocalStorageAvailable()) {
    const data = localStorage.getItem(STORAGE_KEYS.REFERRALS);
    const list: Referral[] = data ? JSON.parse(data) : [];
    list.unshift(newRef);
    localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(list));
    incrementAnalytics('successfulReferrals');
  }

  return newRef;
}

export async function updateReferralFollowUp(referralId: string, status: 'VISITED' | 'NOT_VISITED'): Promise<void> {
  try {
    const docRef = doc(db, 'referrals', referralId);
    await updateDoc(docRef, {
      followUpStatus: status,
      visitedAt: status === 'VISITED' ? serverTimestamp() : null
    });
  } catch (e) {
    // offline
  }

  if (isLocalStorageAvailable()) {
    const data = localStorage.getItem(STORAGE_KEYS.REFERRALS);
    if (data) {
      const list: Referral[] = JSON.parse(data);
      const updated = list.map(r => {
        if (r.id === referralId) {
          return {
            ...r,
            followUpStatus: status,
            visitedAt: status === 'VISITED' ? new Date().toISOString() : undefined
          };
        }
        return r;
      });
      localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(updated));
    }
    if (status === 'VISITED') {
      incrementAnalytics('followUpCompletions');
    }
  }
}

// -------------------------------------------------------------
// 7. Privacy: Delete User Data
// -------------------------------------------------------------

export async function deleteAllUserData(userId: string): Promise<void> {
  const user = auth.currentUser;
  
  if (user && user.uid === userId && !user.isAnonymous) {
    try {
      // Delete user documents from Firestore collections
      await deleteDoc(doc(db, 'users', userId));
      await deleteDoc(doc(db, 'userPrivate', userId));
      await deleteDoc(doc(db, 'userPreferences', userId));
      await deleteDoc(doc(db, 'sehatPasses', userId));

      // Delete family records
      const q = query(collection(db, 'families'), where('ownerUid', '==', userId));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      
      // Delete Firebase Auth User Account
      await user.delete();
    } catch (e) {
      console.error('Error deleting data from Firestore/Auth:', e);
    }
  }

  // Clear local storage fallbacks
  if (isLocalStorageAvailable()) {
    localStorage.removeItem(STORAGE_KEYS.HOUSEHOLD);
    localStorage.removeItem(STORAGE_KEYS.REMINDERS);
    localStorage.removeItem(STORAGE_KEYS.SUPPORT_REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.REFERRALS);
    localStorage.removeItem('sehat_setu_user_session');
  }
}

// -------------------------------------------------------------
// 8. Privacy: Audit Event Logging
// -------------------------------------------------------------

export async function logAuthAuditEvent(uid: string, eventType: string, details: string): Promise<void> {
  try {
    const eventId = 'audit-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    await setDoc(doc(db, 'authAudit', eventId), {
      uid,
      eventType,
      details,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    // Ignore error, logging shouldn't break client experience
  }
}

// -------------------------------------------------------------
// 9. Analytics Aggregators (Offline Mock Only for local dashboard)
// -------------------------------------------------------------

export function getAnalyticsSummary(): AnalyticsSummary {
  const defaultSummary: AnalyticsSummary = {
    totalUsers: 1420,
    totalRequests: 3840,
    emergencyRequests: 42,
    facilitySearches: 1890,
    schemeQueries: 1240,
    humanSupportRequests: 310,
    followUpCompletions: 480,
    successfulReferrals: 950,
    intentBreakdown: {
      FIND_FACILITY: 1890,
      CHECK_SCHEME: 1240,
      DOCUMENT_REQUIREMENTS: 340,
      HUMAN_SUPPORT: 310,
      EMERGENCY: 42,
      FOLLOW_UP: 120,
      GENERAL_HEALTHCARE_NAVIGATION: 80,
      UNKNOWN: 18
    },
    languageDistribution: {
      hi: 1840,
      kn: 720,
      ta: 450,
      te: 390,
      mr: 280,
      en: 160
    },
    topSearchedDistricts: [
      { district: 'Kolar (Karnataka)', count: 680 },
      { district: 'New Delhi', count: 540 },
      { district: 'Pune (Maharashtra)', count: 320 },
      { district: 'Chennai (Tamil Nadu)', count: 290 },
      { district: 'Hyderabad (Telangana)', count: 210 }
    ]
  };

  if (!isLocalStorageAvailable()) return defaultSummary;

  const stored = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(defaultSummary));
    return defaultSummary;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return defaultSummary;
  }
}

export function incrementAnalytics(key: keyof AnalyticsSummary, intent?: IntentCategory, lang?: LanguageCode): void {
  if (!isLocalStorageAvailable()) return;
  const summary = getAnalyticsSummary();
  if (typeof summary[key] === 'number') {
    (summary[key] as number)++;
  }
  if (intent && summary.intentBreakdown[intent] !== undefined) {
    summary.intentBreakdown[intent]++;
  }
  if (lang && summary.languageDistribution[lang] !== undefined) {
    summary.languageDistribution[lang]++;
  }
  localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(summary));
}

// -------------------------------------------------------------
// 7. Secure Verification Tokens & Document Wallet (Module 06)
// -------------------------------------------------------------

export async function generatePassVerificationToken(uid: string, passData: any): Promise<string> {
  const tokenId = 'tok_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Set 24 hour expiration duration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const tokenData: SehatPassToken = {
    tokenId,
    userId: uid,
    passId: passData.passId || `SS-${Math.floor(10000000 + Math.random() * 90000000)}`,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'ACTIVE',
    verifiedPayload: {
      name: passData.userName || passData.displayName || 'Citizen',
      preferredLanguage: passData.preferredLanguage || 'kn',
      photoUrl: passData.photoUrl || passData.profileImage?.secureUrl || '',
      status: 'Verified Profile'
    }
  };

  try {
    await setDoc(doc(db, 'sehatPassTokens', tokenId), tokenData);
  } catch (e) {
    console.error("Error creating pass token in firestore:", e);
  }

  // Also sync locally
  if (isLocalStorageAvailable()) {
    localStorage.setItem(`verify_token_${tokenId}`, JSON.stringify(tokenData));
  }

  return tokenId;
}

export async function revokePassVerificationToken(tokenId: string): Promise<void> {
  try {
    // In firestore
    const docRef = doc(db, 'sehatPassTokens', tokenId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await setDoc(docRef, { 
        status: 'REVOKED', 
        revokedAt: new Date().toISOString() 
      }, { merge: true });
    }
  } catch (e) {
    console.error("Error revoking pass token:", e);
  }

  // Locally
  if (isLocalStorageAvailable()) {
    const local = localStorage.getItem(`verify_token_${tokenId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        parsed.status = 'REVOKED';
        parsed.revokedAt = new Date().toISOString();
        localStorage.setItem(`verify_token_${tokenId}`, JSON.stringify(parsed));
      } catch (e) {}
    }
  }
}

export async function verifyPassToken(tokenId: string): Promise<SehatPassToken | null> {
  try {
    const docSnap = await getDoc(doc(db, 'sehatPassTokens', tokenId));
    if (docSnap.exists()) {
      return docSnap.data() as SehatPassToken;
    }
  } catch (e) {
    console.error("Error verifying pass token from firestore:", e);
  }

  // Fallback to local storage
  if (isLocalStorageAvailable()) {
    const local = localStorage.getItem(`verify_token_${tokenId}`);
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
  }

  return null;
}

// User-scoped Document Wallet CRUD Operations
export async function getUserDocuments(uid: string): Promise<UserDocument[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'users', uid, 'documents'));
    const list: UserDocument[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        documentId: docSnap.id,
        userId: uid,
        documentType: data.documentType,
        displayName: data.displayName || '',
        fileUrl: data.fileUrl || '',
        cloudinaryPublicId: data.cloudinaryPublicId || '',
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    return list;
  } catch (e) {
    console.error("Error fetching user documents:", e);
  }

  // Fallback to local storage
  if (isLocalStorageAvailable()) {
    const local = localStorage.getItem(`docs_wallet_${uid}`);
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
  }
  return [];
}

export async function saveUserDocument(uid: string, docData: Omit<UserDocument, 'userId'>): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'documents', docData.documentId);
    await setDoc(docRef, {
      ...docData,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error saving document in firestore:", e);
  }

  // Sync to local storage
  if (isLocalStorageAvailable()) {
    const existing = await getUserDocuments(uid);
    const updated = [...existing.filter(d => d.documentId !== docData.documentId), { ...docData, userId: uid, createdAt: new Date().toISOString() }];
    localStorage.setItem(`docs_wallet_${uid}`, JSON.stringify(updated));
  }
}

export async function deleteUserDocument(uid: string, documentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', uid, 'documents', documentId));
  } catch (e) {
    console.error("Error deleting document in firestore:", e);
  }

  if (isLocalStorageAvailable()) {
    const existing = await getUserDocuments(uid);
    const filtered = existing.filter(d => d.documentId !== documentId);
    localStorage.setItem(`docs_wallet_${uid}`, JSON.stringify(filtered));
  }
}

// User-scoped savedFacilities (Dual writes for safety & PWA offline cache)
export async function saveUserSavedFacility(uid: string, facilityId: string, label: string): Promise<void> {
  try {
    // Write 1: subcollection path /users/{uid}/savedFacilities/{facilityId}
    await setDoc(doc(db, 'users', uid, 'savedFacilities', facilityId), {
      facilityId,
      savedAt: new Date().toISOString(),
      label: label || 'Healthcare Facility'
    });

    // Write 2: legacy top-level collections
    const legacyDocId = `saved-${uid}-${facilityId}`;
    await setDoc(doc(db, 'savedFacilities', legacyDocId), {
      id: legacyDocId,
      userId: uid,
      facilityId,
      savedAt: new Date().toISOString(),
      label: label || 'Healthcare Facility'
    });
  } catch (e) {
    console.error("Error saving facility in firestore collections:", e);
  }
}

export async function removeUserSavedFacility(uid: string, facilityId: string): Promise<void> {
  try {
    // Delete 1: subcollection
    await deleteDoc(doc(db, 'users', uid, 'savedFacilities', facilityId));

    // Delete 2: legacy
    const legacyDocId = `saved-${uid}-${facilityId}`;
    await deleteDoc(doc(db, 'savedFacilities', legacyDocId));
  } catch (e) {
    console.error("Error deleting saved facility:", e);
  }
}
