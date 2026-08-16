export type LanguageCode = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'mr' | 'ml' | 'bn' | 'gu' | 'pa' | 'or' | 'as' | 'ur';

export type UserRole = 'citizen' | 'volunteer' | 'admin';

export type IntentCategory = 
  | 'EMERGENCY'
  | 'FIND_FACILITY'
  | 'CHECK_SCHEME'
  | 'DOCUMENT_REQUIREMENTS'
  | 'FOLLOW_UP'
  | 'HUMAN_SUPPORT'
  | 'GENERAL_HEALTHCARE_NAVIGATION'
  | 'UNKNOWN'
  | 'FIND_NEARBY_FACILITY'
  | 'FIND_GOVERNMENT_HOSPITAL'
  | 'FIND_PHC'
  | 'FIND_CHC'
  | 'FIND_DISTRICT_HOSPITAL'
  | 'FIND_PMJAY_FACILITY'
  | 'FIND_HEALTH_SCHEME'
  | 'CHECK_SCHEME_INFORMATION'
  | 'FACILITY_INFORMATION'
  | 'START_HEALTHCARE_JOURNEY'
  | 'RESUME_HEALTHCARE_JOURNEY'
  | 'FACILITY_PROBLEM'
  | 'SEARCH_MEDICINE'
  | 'FIND_GENERIC_PRODUCT'
  | 'FIND_JANAUSHADHI_ALTERNATIVE'
  | 'FIND_JANAUSHADHI_KENDRA'
  | 'CHECK_PRODUCT_PRICE'
  | 'GREETING'
  | 'HELP';

export type FacilityType = 
  | 'PHC'
  | 'CHC'
  | 'DISTRICT_HOSPITAL'
  | 'GOVERNMENT_HOSPITAL'
  | 'OTHER_GOVERNMENT_FACILITY'
  | 'JAN_AUSHADHI'
  | 'PMJAY_EMPANELLED'
  | 'EMERGENCY_CARE'
  | 'PRIMARY_HEALTH_CENTRE'
  | 'COMMUNITY_HEALTH_CENTRE';

export interface UserProfile {
  uid: string;
  role: UserRole;
  displayName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  preferredLanguage: LanguageCode;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  profileImage?: {
    publicId: string;
    secureUrl: string;
  };

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
  id: string; // familyMemberId
  familyMemberId?: string;
  name: string;
  relationship: string; // Mother, Father, Spouse, Child, Self, Grandparent, Other
  age?: number;
  dateOfBirth?: string;
  preferredLanguage?: LanguageCode;
  profileImage?: {
    publicId: string;
    secureUrl: string;
  };
  schemeInfo?: string;
  createdAt?: string;
  updatedAt?: string;
  gender?: string;
  hasAadhaar?: boolean;
  hasRationCard?: boolean;
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
    location?: any;
    pincode?: string;
    symptomOrCondition?: string;
    facilityTypeNeeded?: FacilityType;
    schemeName?: string;
    documentType?: string;
    age?: number;
    scheme?: string;
    medicine?: string;
    product?: string;
    district?: string;
    taluk?: string;
  };
  explanationKey?: string;
  directResponseKey?: string;
  requiresClarification?: boolean;
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
  intentBreakdown: Partial<Record<IntentCategory, number>>;
  languageDistribution: Partial<Record<LanguageCode, number>>;
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

export interface JanaushadhiKendra {
  id: string;
  kendraCode: string;
  name: string;
  stateCode: string;
  stateName: string;
  district: string;
  taluk: string | null;
  address: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  source: {
    sourceName: string;
    sourceFile: string;
    sourceDate?: string | null;
  };
  verificationStatus: string;
  lastVerifiedAt: string | null;
}

export interface JanaushadhiProduct {
  productId: string;
  productName: string;
  genericName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  mrp: number;
  category: string;
  productCode: string;
  source: {
    sourceName: string;
    sourceFile: string;
    sourceDate?: string | null;
  };
  lastVerifiedAt: string | null;
}

export interface PMJAYFacility {
  id: string;
  facilityId: string;
  hospitalName: string;
  stateCode: string;
  district: string;
  address: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  source: {
    sourceName: string;
    sourceFile: string;
    sourceDate?: string | null;
  };
  lastVerifiedAt: string | null;
}

export interface UserDocument {
  documentId: string;
  userId: string;
  documentType: 'AYUSHMAN_CARD' | 'GOVERNMENT_ID' | 'SCHEME_DOCUMENT' | 'OTHER';
  displayName: string;
  fileUrl: string;
  cloudinaryPublicId?: string;
  createdAt: string;
}

export interface SehatPassToken {
  tokenId: string;
  userId: string;
  passId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  verifiedPayload: {
    name: string;
    preferredLanguage: string;
    photoUrl?: string;
    status: string;
  };
}

export interface AnalyticsEvent {
  eventId: string;
  sessionId?: string;
  userId?: string;
  eventType: string; // e.g. VOICE_STARTED, VOICE_COMPLETED, INTENT_DETECTED, etc.
  district?: string; // coarse location
  language?: LanguageCode;
  intent?: IntentCategory;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UserFeedback {
  feedbackId: string;
  userId: string;
  journeyId: string;
  response: 'YES' | 'PARTIALLY' | 'NO' | 'NOT_VISITED_YET';
  reason?: 'FACILITY_CLOSED' | 'INFORMATION_INCORRECT' | 'SCHEME_NOT_ACCEPTED' | 'MEDICINE_NOT_AVAILABLE' | 'COULD_NOT_REACH' | 'OTHER';
  comments?: string;
  createdAt: string;
}

export interface FacilityReport {
  reportId: string;
  facilityId: string;
  facilityName: string;
  userId: string;
  issueType: 'FACILITY_MOVED' | 'FACILITY_CLOSED' | 'PHONE_INCORRECT' | 'ADDRESS_INCORRECT' | 'DUPLICATE' | 'WRONG_FACILITY_TYPE' | 'WRONG_SCHEME_ASSOCIATION' | 'OTHER';
  description: string;
  createdAt: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  adminNotes?: string;
  updatedAt: string;
}

export interface SystemHealthStatus {
  lastCheckedAt: string;
  services: {
    firebaseAuth: 'HEALTHY' | 'UNHEALTHY';
    firestore: 'HEALTHY' | 'UNHEALTHY';
    cloudinary: 'HEALTHY' | 'UNHEALTHY';
    voiceSTT: 'HEALTHY' | 'UNHEALTHY';
    voiceTTS: 'HEALTHY' | 'UNHEALTHY';
    dataServices: 'HEALTHY' | 'UNHEALTHY';
  };
}
