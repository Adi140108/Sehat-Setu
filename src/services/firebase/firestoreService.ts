import type { 
  SupportRequest, 
  Referral, 
  Reminder, 
  AnalyticsSummary, 
  LanguageCode, 
  IntentCategory, 
  HouseholdMember 
} from '../../types';

// In-Memory & LocalStorage persistent reactive store for fast hackathon demo reliability
const STORAGE_KEYS = {
  SUPPORT_REQUESTS: 'sehat_setu_support_requests',
  REFERRALS: 'sehat_setu_referrals',
  REMINDERS: 'sehat_setu_reminders',
  ANALYTICS: 'sehat_setu_analytics',
  HOUSEHOLD: 'sehat_setu_household_profile'
};

// Seed initial support requests for Volunteer Dashboard demonstration
const SEED_SUPPORT_REQUESTS: SupportRequest[] = [
  {
    id: 'req-101',
    userId: 'user-881',
    userName: 'Ramesh Kumar',
    userPhone: '98450XXXXX',
    language: 'hi',
    location: 'Kolar, Karnataka',
    pincode: '563101',
    needDescription: 'Wants guidance on enrolling mother in Ayushman Vaya Vandana 70+ card and finding nearest empanelled hospital for eye surgery.',
    urgent: false,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'req-102',
    userId: 'user-902',
    userName: 'Lakshmi Devi',
    userPhone: '91234XXXXX',
    language: 'kn',
    location: 'Bangarapet, Kolar',
    pincode: '563114',
    needDescription: 'Needs assistance with BPL ration card document verification for child immunization schedule at PHC.',
    urgent: true,
    status: 'IN_PROGRESS',
    assignedToVolunteerId: 'volunteer-demo-user',
    assignedToVolunteerName: 'ASHA Worker Sunita',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  }
];

export async function createSupportRequest(req: Omit<SupportRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<SupportRequest> {
  const existing = getSupportRequests();
  const newReq: SupportRequest = {
    ...req,
    id: 'req-' + Math.random().toString(36).substring(2, 9),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  existing.unshift(newReq);
  localStorage.setItem(STORAGE_KEYS.SUPPORT_REQUESTS, JSON.stringify(existing));
  
  // Track metric
  incrementAnalytics('humanSupportRequests');
  return newReq;
}

export function getSupportRequests(): SupportRequest[] {
  const data = localStorage.getItem(STORAGE_KEYS.SUPPORT_REQUESTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.SUPPORT_REQUESTS, JSON.stringify(SEED_SUPPORT_REQUESTS));
    return SEED_SUPPORT_REQUESTS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return SEED_SUPPORT_REQUESTS;
  }
}

export function updateSupportRequestStatus(id: string, status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED', volunteerName?: string): void {
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

// Reminders
export function getReminders(userId: string): Reminder[] {
  const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
  if (!data) return [];
  try {
    const list: Reminder[] = JSON.parse(data);
    return list.filter(r => r.userId === userId || userId.includes('demo'));
  } catch (e) {
    return [];
  }
}

export function createReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'status'>): Reminder {
  const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
  const list: Reminder[] = data ? JSON.parse(data) : [];
  const newR: Reminder = {
    ...reminder,
    id: 'rem-' + Math.random().toString(36).substring(2, 8),
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  list.unshift(newR);
  localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(list));
  return newR;
}

// Referrals & Follow-ups
export function createReferral(userId: string, facilityId: string, facilityName: string, reason: string): Referral {
  const data = localStorage.getItem(STORAGE_KEYS.REFERRALS);
  const list: Referral[] = data ? JSON.parse(data) : [];
  const newRef: Referral = {
    id: 'ref-' + Math.random().toString(36).substring(2, 8),
    userId,
    facilityId,
    facilityName,
    reason,
    createdAt: new Date().toISOString(),
    followUpStatus: 'PENDING'
  };
  list.unshift(newRef);
  localStorage.setItem(STORAGE_KEYS.REFERRALS, JSON.stringify(list));
  incrementAnalytics('successfulReferrals');
  return newRef;
}

export function updateReferralFollowUp(referralId: string, status: 'VISITED' | 'NOT_VISITED'): void {
  const data = localStorage.getItem(STORAGE_KEYS.REFERRALS);
  if (!data) return;
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
  if (status === 'VISITED') {
    incrementAnalytics('followUpCompletions');
  }
}

// Household Profile
export function getHouseholdMembers(): HouseholdMember[] {
  const data = localStorage.getItem(STORAGE_KEYS.HOUSEHOLD);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveHouseholdMembers(members: HouseholdMember[]): void {
  localStorage.setItem(STORAGE_KEYS.HOUSEHOLD, JSON.stringify(members));
}

// Privacy: Delete My Data
export function deleteAllUserData(_userId: string): void {
  localStorage.removeItem(STORAGE_KEYS.HOUSEHOLD);
  localStorage.removeItem(STORAGE_KEYS.REMINDERS);
  localStorage.removeItem('sehat_setu_user_session');
}

// Analytics Aggregator
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
