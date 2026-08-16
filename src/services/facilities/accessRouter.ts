import type { IntentResult, FacilityType } from '../../types';
import { facilityRepository, janaushadhiKendraRepository } from '../repositories';
import { calculateDistanceKm } from './facilityService';

export interface RankedFacilityResult {
  facility: any; // Facility or JanaushadhiKendra
  facilityType: string;
  distanceKm?: number;
  rankingScore: number;
  matchReasons: string[];
}

export interface AccessRoutingResult {
  requestId: string;
  intent: string;
  results: RankedFacilityResult[];
  explanation: {
    intentUnderstood: string;
    locationDetected: string;
    actionTaken: string;
  };
  nextActions: string[];
  requiresClarification: boolean;
  clarificationQuestion?: string;
  schemeId?: string;
}

interface RankingWeights {
  schemeMatch: number;
  facilityTypeMatch: number;
  distance: number;
  verification: number;
  dataCompleteness: number;
}

// 10. Configurable weights configuration
const DEFAULT_WEIGHTS: RankingWeights = {
  schemeMatch: 40,
  facilityTypeMatch: 25,
  distance: 20,
  verification: 10,
  dataCompleteness: 5
};

// 11. Intent-specific weights configuration
const INTENT_WEIGHTS: Record<string, RankingWeights> = {
  FIND_NEARBY_FACILITY: {
    schemeMatch: 10,
    facilityTypeMatch: 10,
    distance: 60,
    verification: 15,
    dataCompleteness: 5
  },
  FIND_PMJAY_FACILITY: {
    schemeMatch: 60,
    distance: 20,
    facilityTypeMatch: 10,
    verification: 8,
    dataCompleteness: 2
  },
  FIND_PHC: {
    schemeMatch: 10,
    facilityTypeMatch: 60,
    distance: 20,
    verification: 8,
    dataCompleteness: 2
  },
  FIND_CHC: {
    schemeMatch: 10,
    facilityTypeMatch: 60,
    distance: 20,
    verification: 8,
    dataCompleteness: 2
  },
  FIND_DISTRICT_HOSPITAL: {
    schemeMatch: 10,
    facilityTypeMatch: 60,
    distance: 20,
    verification: 8,
    dataCompleteness: 2
  }
};

/**
 * Access Router Service
 * Matches user intent results with local datasets and computes ranked access options.
 */
export const accessRouter = {
  async route(
    requestId: string,
    intentResult: IntentResult,
    userGps?: { lat: number; lng: number }
  ): Promise<AccessRoutingResult> {
    const { category, extractedEntities, requiresClarification } = intentResult;

    // Handle clarification trigger
    if (requiresClarification || category === 'UNKNOWN') {
      let q = "Could you please specify if you are looking for a Government Hospital, an Ayushman/PM-JAY empanelled hospital, or a local generic Jan Aushadhi pharmacy?";
      if (category === 'FIND_FACILITY') {
        q = "Are you looking for a primary health centre (PHC), a community health centre (CHC), or a district government hospital?";
      }
      return {
        requestId,
        intent: category,
        results: [],
        explanation: {
          intentUnderstood: "Intent is ambiguous or needs clarification.",
          locationDetected: "N/A",
          actionTaken: "Prompting user for clarification options."
        },
        nextActions: ["CLARIFY"],
        requiresClarification: true,
        clarificationQuestion: q
      };
    }

    // Determine query constraints
    const filterDistrict = extractedEntities.district || (extractedEntities.location?.type === 'DISTRICT_OR_CITY' ? extractedEntities.location.value : undefined);
    const filterPincode = extractedEntities.pincode || (extractedEntities.location?.type === 'PINCODE' ? extractedEntities.location.value : undefined);
    
    // Map intent to Facility Type
    let targetType: FacilityType | undefined = undefined;
    if (category === 'FIND_PHC') targetType = 'PHC';
    else if (category === 'FIND_CHC') targetType = 'CHC';
    else if (category === 'FIND_DISTRICT_HOSPITAL') targetType = 'DISTRICT_HOSPITAL';
    else if (category === 'FIND_GOVERNMENT_HOSPITAL') targetType = 'GOVERNMENT_HOSPITAL';

    // Retrieve candidate facilities
    let facilities: any[] = [];
    if (category === 'FIND_JANAUSHADHI_KENDRA') {
      facilities = await janaushadhiKendraRepository.search({
        district: filterDistrict,
        pincode: filterPincode
      });
    } else {
      // General facility search
      facilities = await facilityRepository.search({
        district: filterDistrict,
        type: targetType,
        pincode: filterPincode
      });
    }

    // If "near me" or GPS is available, calculate Haversine distance
    const hasGps = userGps && userGps.lat !== undefined && userGps.lng !== undefined;
    
    // Config weights
    const weights = INTENT_WEIGHTS[category] || DEFAULT_WEIGHTS;
    const rankedResults: RankedFacilityResult[] = [];

    const isPmjayIntent = category === 'FIND_PMJAY_FACILITY' || extractedEntities.scheme === 'PM_JAY';

    // Filter candidate facilities to exclude invalid coordinates (null, 0,0, or outside Karnataka bounding box)
    const validFacilities = facilities.filter(f => {
      if (!f) return false;
      if (hasGps) {
        if (f.latitude === null || f.longitude === null || f.latitude === undefined || f.longitude === undefined) return false;
        if (f.latitude === 0 && f.longitude === 0) return false;
      }
      return true;
    });

    for (const f of validFacilities) {
      let distanceKm: number | undefined = undefined;
      if (hasGps && typeof f.latitude === 'number' && typeof f.longitude === 'number' && !(f.latitude === 0 && f.longitude === 0)) {
        distanceKm = calculateDistanceKm(userGps.lat, userGps.lng, f.latitude, f.longitude);
      }

      // 1. Scheme Match Score
      let schemeScore = 0.5; // neutral
      const hasPmjaySupport = f.schemeAssociations?.includes('scheme-pmjay') || f.schemesSupported?.includes('scheme-pmjay');
      
      if (isPmjayIntent) {
        schemeScore = hasPmjaySupport ? 1.0 : 0.0;
      }

      // 2. Type Match Score
      let typeScore = 1.0;
      if (targetType) {
        typeScore = f.type === targetType ? 1.0 : 0.0;
      }

      // 3. Distance Score
      let distanceScore = 0.5;
      if (distanceKm !== undefined) {
        distanceScore = Math.max(0, 1 - distanceKm / 50); // scale 50km
      }

      // 4. Verification Score
      const verificationScore = f.verificationStatus === 'official_source' ? 1.0 : 0.5;

      // 5. Data Completeness Score
      let completenessScore = 0.0;
      if (f.phone) completenessScore += 0.25;
      if (f.address) completenessScore += 0.25;
      if (f.latitude) completenessScore += 0.25;
      if (f.services && f.services.length > 0) completenessScore += 0.25;

      // Compute weighted average
      const rawScore = (
        schemeScore * weights.schemeMatch +
        typeScore * weights.facilityTypeMatch +
        distanceScore * weights.distance +
        verificationScore * weights.verification +
        completenessScore * weights.dataCompleteness
      ) / 100;

      // Generate explanations reasons
      const matchReasons: string[] = [];
      if (isPmjayIntent && hasPmjaySupport) {
        matchReasons.push("Matches requested PM-JAY scheme (Cashless access list)");
      } else if (hasPmjaySupport) {
        matchReasons.push("Empanelled under PM-JAY yojana");
      }
      
      if (targetType && f.type === targetType) {
        matchReasons.push(`Matches requested facility category (${targetType})`);
      }
      
      if (distanceKm !== undefined) {
        matchReasons.push(`Located ${distanceKm} km away`);
      }
      
      if (f.verificationStatus === 'official_source') {
        matchReasons.push("Official government verified source roster");
      }

      rankedResults.push({
        facility: f,
        facilityType: f.type || "JANAUSHADHI_KENDRA",
        distanceKm,
        rankingScore: Number(rawScore.toFixed(2)),
        matchReasons
      });
    }

    // Sort by distance first when GPS is available, then by rankingScore
    rankedResults.sort((a, b) => {
      if (hasGps && a.distanceKm !== undefined && b.distanceKm !== undefined) {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
      }
      if (b.rankingScore !== a.rankingScore) {
        return b.rankingScore - a.rankingScore;
      }
      return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
    });

    // Determine explanation text
    const locationText = filterPincode 
      ? `Pincode ${filterPincode}` 
      : (filterDistrict ? `District ${filterDistrict}` : (hasGps ? "Current GPS Coordinates" : "All of Karnataka"));

    return {
      requestId,
      intent: category,
      results: rankedResults.slice(0, 15),
      explanation: {
        intentUnderstood: `Access request identified: ${category.replace(/_/g, ' ')}.`,
        locationDetected: `Resolved location: ${locationText}.`,
        actionTaken: `Loaded and ranked matching facilities based on ${category} weights.`
      },
      nextActions: ["VIEW_DETAILS", "GET_DIRECTIONS", "SAVE", "START_JOURNEY"],
      requiresClarification: false,
      schemeId: isPmjayIntent ? "PM_JAY" : undefined
    };
  }
};
