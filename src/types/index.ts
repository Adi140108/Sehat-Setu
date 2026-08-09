export type LanguageCode = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'mr';

export type UserRole = 'citizen' | 'volunteer' | 'admin';

export type IntentCategory = 
  | 'EMERGENCY'
  | 'FIND_FACILITY'
  | 'CHECK_SCHEME'
  | 'DOCUMENT_REQUIREMENTS'
  | 'FOLLOW_UP'
  | 'HUMAN_SUPPORT'
  | 'GENERAL_HEALTHCARE_NAVIGATION'
  | 'UNKNOWN';

export type FacilityType = 
  | 'PMJAY_EMPANELLED'
  | 'JAN_AUSHADHI'
  | 'PRIMARY_HEALTH_CENTRE'
  | 'COMMUNITY_HEALTH_CENTRE'
  | 'GOVERNMENT_HOSPITAL'
  | 'DISTRICT_HOSPITAL'
  | 'EMERGENCY_CARE';

export interface UserProfile {
  uid: string;
  role: UserRole;
  displayName?: string;
  email?: string;
  phone?: string;
  preferredLanguage: LanguageCode;
  location?: {
    lat: number;
    lng: number;
    address?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
  householdMembers?: HouseholdMember[];
  createdAt: string;
  lastActiveAt: string;
}

export interface HouseholdMember {
  id: string;
  name: string;
  age: number;
  gender: string;
  relationship: string;
  hasAadhaar: boolean;
  hasRationCard: boolean;
  incomeCategory?: 'BPL' | 'APL' | 'EWS' | 'NONE';
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  openingHours?: string;
  services: string[];
  schemesSupported: string[]; // schemeIds
  emergencyAvailable: boolean;
  isVerified: boolean;
  dataSource: string;
  lastVerifiedDate: string;
  distanceKm?: number;
}

export interface EligibilityRules {
  maxIncomeCategory?: ('BPL' | 'APL' | 'EWS')[];
  minAge?: number;
  maxAge?: number;
  genderAllowed?: ('all' | 'female' | 'male')[];
  targetOccupations?: string[];
  rationCardTypes?: string[];
  disabilityAllowed?: boolean;
  stateSpecific?: string[];
}

export interface HealthScheme {
  id: string;
  name: string;
  shortName: string;
  description: string;
  coverageDetails: string;
  maxCoverageAmount?: string;
  state: string; // 'National' or specific state
  targetGroup: string;
  eligibilityRules: EligibilityRules;
  benefits: string[];
  documentsRequired: string[];
  applicationSteps: string[];
  officialSource: string;
  lastVerified: string;
  status: 'active' | 'updating';
}

export interface SupportRequest {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  language: LanguageCode;
  location: string;
  pincode?: string;
  needDescription: string;
  urgent: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  assignedToVolunteerId?: string;
  assignedToVolunteerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  id: string;
  userId: string;
  facilityId: string;
  facilityName: string;
  reason: string;
  createdAt: string;
  followUpStatus: 'PENDING' | 'VISITED' | 'NOT_VISITED' | 'CANCELLED';
  visitedAt?: string;
  feedback?: string;
}

export interface Reminder {
  id: string;
  userId: string;
  type: 'FOLLOW_UP_VISIT' | 'MEDICINE_REFILL' | 'CHECKUP' | 'DOCUMENT_SUBMISSION';
  title: string;
  dueAt: string;
  facilityName?: string;
  status: 'PENDING' | 'COMPLETED' | 'DISMISSED';
  createdAt: string;
}

export interface IntentResult {
  category: IntentCategory;
  confidence: number;
  language: LanguageCode;
  isEmergency: boolean;
  extractedEntities: {
    location?: string;
    pincode?: string;
    symptomOrCondition?: string;
    facilityTypeNeeded?: FacilityType;
    schemeName?: string;
    documentType?: string;
    age?: number;
  };
  explanationKey?: string;
  directResponseKey?: string;
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalRequests: number;
  emergencyRequests: number;
  facilitySearches: number;
  schemeQueries: number;
  humanSupportRequests: number;
  followUpCompletions: number;
  successfulReferrals: number;
  intentBreakdown: Record<IntentCategory, number>;
  languageDistribution: Record<LanguageCode, number>;
  topSearchedDistricts: { district: string; count: number }[];
}

export interface MessagePayload {
  channel: 'web' | 'whatsapp';
  senderId: string;
  messageType: 'text' | 'voice';
  text?: string;
  audioUrl?: string;
  language?: LanguageCode;
  timestamp: string;
}
