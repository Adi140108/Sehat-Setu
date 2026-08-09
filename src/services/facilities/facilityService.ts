import type { Facility, FacilityType } from '../../types';
import { DEMO_FACILITIES } from '../../data/facilities';

// Calculate Haversine distance in kilometers between two GPS coordinates
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

export interface FacilitySearchQuery {
  lat?: number;
  lng?: number;
  pincodeOrCity?: string;
  type?: FacilityType;
  emergencyOnly?: boolean;
  schemeId?: string;
}

export function searchFacilities(query: FacilitySearchQuery): Facility[] {
  let results = [...DEMO_FACILITIES];

  // 1. Emergency Filter
  if (query.emergencyOnly) {
    results = results.filter(f => f.emergencyAvailable);
  }

  // 2. Type Filter
  if (query.type) {
    results = results.filter(f => f.type === query.type);
  }

  // 3. Scheme Support Filter
  if (query.schemeId) {
    results = results.filter(f => f.schemesSupported.includes(query.schemeId!));
  }

  // 4. Location filtering and distance calculation
  if (query.lat !== undefined && query.lng !== undefined) {
    results = results.map(facility => {
      const dist = calculateDistanceKm(query.lat!, query.lng!, facility.latitude, facility.longitude);
      return { ...facility, distanceKm: dist };
    });
    // Sort by nearest distance first
    results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  } else if (query.pincodeOrCity && query.pincodeOrCity.trim() !== '') {
    const term = query.pincodeOrCity.toLowerCase().trim();
    results = results.filter(facility => 
      facility.pincode.includes(term) ||
      facility.district.toLowerCase().includes(term) ||
      facility.state.toLowerCase().includes(term) ||
      facility.address.toLowerCase().includes(term) ||
      facility.name.toLowerCase().includes(term)
    );
  }

  return results;
}
