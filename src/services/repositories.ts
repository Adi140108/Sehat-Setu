import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  deleteDoc,
  query, 
  where, 
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase/firebase';
import type { 
  Facility, 
  FacilityType, 
  JanaushadhiKendra, 
  JanaushadhiProduct, 
  PMJAYFacility 
} from '../types';
import { calculateDistanceKm } from './facilities/facilityService';

// Client-Side In-Memory Cache for Static Directory Datasets
const cache: Record<string, any[]> = {
  facilities: [],
  janaushadhiKendras: [],
  janaushadhiProducts: [],
  pmjayFacilities: [],
  districts: [],
  taluks: []
};

// Helper to fetch static JSON files if offline or to control query cost
async function loadStaticDataset<T>(name: string): Promise<T[]> {
  if (cache[name].length > 0) {
    return cache[name] as T[];
  }
  try {
    const response = await fetch(`/data/${name}.json`);
    if (response.ok) {
      const data = await response.json();
      cache[name] = data;
      return data as T[];
    }
  } catch (err) {
    console.warn(`Failed to fetch static JSON dataset for ${name}:`, err);
  }
  return [];
}

/**
 * Repository for accessing Facilities.
 */
export const facilityRepository = {
  async getById(id: string): Promise<Facility | null> {
    // 1. Try Cache first
    const list = await loadStaticDataset<any>('facilities');
    const matched = list.find(f => f.id === id);
    if (matched) return matched as Facility;

    // 2. Try Firestore fallback
    try {
      const docRef = doc(db, 'facilities', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Facility;
      }
    } catch (err) {
      // Offline fallback
    }
    return null;
  },

  async search(filter: { district?: string; type?: FacilityType; pincode?: string }): Promise<Facility[]> {
    // Try local JSON cache first to reduce read charges (cost control)
    const list = await loadStaticDataset<any>('facilities');
    let results = [...list] as Facility[];

    if (filter.district) {
      const term = filter.district.toUpperCase().trim();
      results = results.filter(f => f.district.toUpperCase().includes(term));
    }
    if (filter.type) {
      results = results.filter(f => f.type === filter.type);
    }
    if (filter.pincode) {
      results = results.filter(f => f.pincode === filter.pincode);
    }

    if (results.length > 0) return results.slice(0, 100);

    // Live Firestore Query Fallback
    try {
      const colRef = collection(db, 'facilities');
      let constraints = [];
      if (filter.district) {
        constraints.push(where('district', '==', filter.district.toUpperCase().trim()));
      }
      if (filter.type) {
        constraints.push(where('type', '==', filter.type));
      }
      if (filter.pincode) {
        constraints.push(where('pincode', '==', filter.pincode));
      }
      const q = query(colRef, ...constraints, limit(50));
      const querySnap = await getDocs(q);
      const fsResults: Facility[] = [];
      querySnap.forEach((doc) => {
        fsResults.push(doc.data() as Facility);
      });
      return fsResults;
    } catch (err) {
      return [];
    }
  },

  async getNearby(lat: number, lng: number, maxCount: number = 10): Promise<(Facility & { distanceKm: number })[]> {
    const list = await loadStaticDataset<any>('facilities');
    const facilities: (Facility & { distanceKm: number })[] = [];
    
    list.forEach((data) => {
      if (data.latitude && data.longitude) {
        const dist = calculateDistanceKm(lat, lng, data.latitude, data.longitude);
        facilities.push({ ...(data as Facility), distanceKm: dist });
      }
    });

    facilities.sort((a, b) => a.distanceKm - b.distanceKm);
    return facilities.slice(0, maxCount);
  }
};

/**
 * Repository for accessing Jan Aushadhi Kendras.
 */
export const janaushadhiKendraRepository = {
  async getById(id: string): Promise<JanaushadhiKendra | null> {
    const list = await loadStaticDataset<any>('janaushadhiKendras');
    const matched = list.find(k => k.id === id);
    if (matched) return matched as JanaushadhiKendra;

    try {
      const docRef = doc(db, 'janaushadhiKendras', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as JanaushadhiKendra;
      }
    } catch (err) {}
    return null;
  },

  async search(filter: { district?: string; pincode?: string }): Promise<JanaushadhiKendra[]> {
    const list = await loadStaticDataset<any>('janaushadhiKendras');
    let results = [...list] as JanaushadhiKendra[];

    if (filter.district) {
      const term = filter.district.toUpperCase().trim();
      results = results.filter(k => k.district.toUpperCase().includes(term));
    }
    if (filter.pincode) {
      results = results.filter(k => k.pincode === filter.pincode);
    }
    return results.slice(0, 100);
  }
};

/**
 * Repository for accessing Jan Aushadhi Generic Medicines.
 */
export const janaushadhiProductRepository = {
  async getById(id: string): Promise<JanaushadhiProduct | null> {
    const list = await loadStaticDataset<any>('janaushadhiProducts');
    const matched = list.find(p => p.productId === id);
    if (matched) return matched as JanaushadhiProduct;
    return null;
  },

  async search(term: string): Promise<JanaushadhiProduct[]> {
    const list = await loadStaticDataset<any>('janaushadhiProducts');
    const upperTerm = term.toUpperCase().trim();
    if (!upperTerm) return [];

    return list.filter(p => 
      p.productName.toUpperCase().includes(upperTerm) ||
      p.genericName.toUpperCase().includes(upperTerm)
    ).slice(0, 50);
  }
};

/**
 * Repository for PM-JAY Empanelled hospitals.
 */
export const pmjayRepository = {
  async getById(id: string): Promise<PMJAYFacility | null> {
    const list = await loadStaticDataset<any>('pmjayFacilities');
    const matched = list.find(f => f.id === id);
    if (matched) return matched as PMJAYFacility;
    return null;
  },

  async search(filter: { district?: string }): Promise<PMJAYFacility[]> {
    const list = await loadStaticDataset<any>('pmjayFacilities');
    let results = [...list] as PMJAYFacility[];
    if (filter.district) {
      const term = filter.district.toUpperCase().trim();
      results = results.filter(f => f.district.toUpperCase().includes(term));
    }
    return results;
  }
};


// --- USER PROFILE TRANSACTIONAL DATABASE CRUD REPOSITORIES ---

export interface SavedFacilityRecord {
  id: string;
  userId: string;
  facilityId: string;
  facilityName: string;
  facilityType: string;
  savedAt: string;
}

export const savedFacilitiesRepository = {
  async save(facilityId: string, facilityName: string, facilityType: string): Promise<void> {
    const user = auth.currentUser;
    const recordId = user ? `${user.uid}_${facilityId}` : `guest_${facilityId}`;
    const userId = user ? user.uid : 'guest-user';

    const record: SavedFacilityRecord = {
      id: recordId,
      userId,
      facilityId,
      facilityName,
      facilityType,
      savedAt: new Date().toISOString()
    };

    if (user) {
      try {
        // Write 1: Legacy Top Level
        const docRef = doc(db, 'savedFacilities', recordId);
        await setDoc(docRef, record);

        // Write 2: User Scoped Subcollection users/{uid}/savedFacilities/{facilityId}
        const subDocRef = doc(db, 'users', user.uid, 'savedFacilities', facilityId);
        await setDoc(subDocRef, {
          facilityId,
          savedAt: new Date().toISOString(),
          label: facilityName || 'Healthcare Facility'
        });
        return;
      } catch (err) {
        console.warn('Failed to save to Firestore. Saving to localStorage:', err);
      }
    }

    // Local storage fallback for guest/offline users
    const list = this.getLocalSaved();
    const filtered = list.filter(f => f.facilityId !== facilityId);
    filtered.push(record);
    localStorage.setItem('sehat_setu_saved_facilities', JSON.stringify(filtered));
  },

  getLocalSaved(): SavedFacilityRecord[] {
    try {
      const data = localStorage.getItem('sehat_setu_saved_facilities');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  async getAll(): Promise<SavedFacilityRecord[]> {
    const user = auth.currentUser;
    if (user) {
      try {
        // Prefer subcollection path reading
        const colRef = collection(db, 'users', user.uid, 'savedFacilities');
        const querySnap = await getDocs(colRef);
        const results: SavedFacilityRecord[] = [];
        
        querySnap.forEach((docSnap) => {
          const data = docSnap.data();
          results.push({
            id: `${user.uid}_${docSnap.id}`,
            userId: user.uid,
            facilityId: docSnap.id,
            facilityName: data.label || 'Saved Facility',
            facilityType: 'Hospital',
            savedAt: data.savedAt || new Date().toISOString()
          });
        });
        
        if (results.length > 0) return results;

        // Fallback to legacy top-level collection reading
        const legacyColRef = collection(db, 'savedFacilities');
        const q = query(legacyColRef, where('userId', '==', user.uid), limit(100));
        const legacySnap = await getDocs(q);
        const legacyResults: SavedFacilityRecord[] = [];
        legacySnap.forEach((docSnap) => {
          legacyResults.push(docSnap.data() as SavedFacilityRecord);
        });
        return legacyResults;
      } catch (err) {
        // Offline fallback
      }
    }
    return this.getLocalSaved();
  },

  async delete(facilityId: string): Promise<void> {
    const user = auth.currentUser;
    const recordId = user ? `${user.uid}_${facilityId}` : `guest_${facilityId}`;

    if (user) {
      try {
        // Delete 1: Legacy Top Level
        const docRef = doc(db, 'savedFacilities', recordId);
        await deleteDoc(docRef);

        // Delete 2: Subcollection path
        const subDocRef = doc(db, 'users', user.uid, 'savedFacilities', facilityId);
        await deleteDoc(subDocRef);
      } catch (err) {}
    }

    const list = this.getLocalSaved();
    const filtered = list.filter(f => f.facilityId !== facilityId);
    localStorage.setItem('sehat_setu_saved_facilities', JSON.stringify(filtered));
  }
};
