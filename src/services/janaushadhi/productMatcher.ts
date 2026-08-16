import type { JanaushadhiProduct } from '../../types';
import { getBrandMapping } from './brandMappings.js';
import { analyticsService } from '../analytics/analyticsService.js';

export interface NormalizerResult {
  originalQuery: string;
  normalizedName: string;
  possibleGeneric: string | null;
  strength: string | null;
  dosageForm: string | null;
  confidence: number;
  isBrandMapped: boolean;
}

export interface MatchResult {
  product: JanaushadhiProduct;
  matchStatus: 'EXACT_CATALOG_MATCH' | 'STRONG_CATALOG_MATCH' | 'POSSIBLE_CATALOG_MATCH' | 'NO_VERIFIED_MATCH';
  confidence: number;
  matchReasons: string[];
}

export interface MatchingEngineResult {
  normalizerResult: NormalizerResult;
  matches: MatchResult[];
  requiresClarification: boolean;
  medicalSafetyNotice: string;
}

// Helpers for clean comparison
export function normalizeString(str: string): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[\s\-\_\,\.\/\(\)]/g, '');
}

export function normalizeStrength(str: string): string {
  if (!str) return '';
  // e.g. "650mg" -> "650 mg", "100 mg" -> "100 mg"
  return str.toLowerCase().replace(/\s+/g, '').replace(/(\d+)([a-zA-Z]+)/g, '$1 $2').trim();
}

export function normalizeDosage(str: string): string {
  if (!str) return '';
  let val = str.toLowerCase().trim();
  // Strip trailing plural 's' for tablets/capsules/drops comparison
  if (val.endsWith('s')) {
    val = val.slice(0, -1);
  }
  return val;
}

// Levenshtein distance for fuzzy matching
export function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

// Extensible local transliterations maps for common search queries
const TRANSLITERATION_MAP: Record<string, string> = {
  "डालो": "dolo",
  "डोलो": "dolo",
  "पैरासिटामोल": "paracetamol",
  "पॅरासิตामॉल": "paracetamol",
  "ಪ್ಯಾರಸಿಟಮಾಲ್": "paracetamol"
};

/**
 * Medicine Normalizer Engine
 * Converts raw query texts (including spelling, casing, transliterations) into clean identifiers
 */
export const MedicineNormalizer = {
  normalize(query: string): NormalizerResult {
    let clean = query.trim().toLowerCase();

    // 1. Apply Hindi/Kannada transliterations
    for (const [hindiWord, engWord] of Object.entries(TRANSLITERATION_MAP)) {
      if (clean.includes(hindiWord)) {
        clean = clean.replace(new RegExp(hindiWord, 'g'), engWord);
      }
    }

    // 2. Check for verified brand mapping
    const brandMapping = getBrandMapping(clean);
    if (brandMapping) {
      return {
        originalQuery: query,
        normalizedName: brandMapping.brandName,
        possibleGeneric: brandMapping.genericName,
        strength: brandMapping.strength,
        dosageForm: brandMapping.dosageForm,
        confidence: 1.0,
        isBrandMapped: true
      };
    }

    // 3. Extract strength patterns (e.g. 650 mg, 100mg, 7.5ml, 500 mcg)
    const strengthRegex = /(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|mg\/ml|%))/i;
    const strengthMatch = clean.match(strengthRegex);
    const parsedStrength = strengthMatch ? strengthMatch[1].trim() : null;

    // 4. Extract dosage forms
    const dosageForms = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'gel', 'inhaler'];
    let parsedDosageForm: string | null = null;
    for (const form of dosageForms) {
      if (clean.includes(form)) {
        parsedDosageForm = form.charAt(0).toUpperCase() + form.slice(1) + 's'; // format as Tablets, Capsules
        break;
      }
    }

    // 5. Clean generic name by removing strength and dosage terms
    let parsedGeneric = clean;
    if (parsedStrength) {
      parsedGeneric = parsedGeneric.replace(parsedStrength, '');
    }
    if (parsedDosageForm) {
      const dosageSingular = parsedDosageForm.toLowerCase().slice(0, -1);
      parsedGeneric = parsedGeneric.replace(parsedDosageForm.toLowerCase(), '').replace(dosageSingular, '');
    }
    
    // Clean up trailing/leading prepositions like "in", "for", "jaushadhi", "mein", etc.
    parsedGeneric = parsedGeneric
      .replace(/\b(in|for|mein|hai|kya|price|generic|alternative|jan|aushadhi|kendra|store)\b/g, '')
      .replace(/[\s\-\+]+/g, ' ')
      .trim();

    // Capitalize first letter of generic name
    const finalGeneric = parsedGeneric 
      ? parsedGeneric.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : null;

    return {
      originalQuery: query,
      normalizedName: finalGeneric || query,
      possibleGeneric: finalGeneric,
      strength: parsedStrength ? normalizeStrength(parsedStrength) : null,
      dosageForm: parsedDosageForm,
      confidence: finalGeneric ? 0.85 : 0.40,
      isBrandMapped: false
    };
  }
};

/**
 * Jan Aushadhi Product Matcher Engine
 * Matches a Normalized query against the processed catalog
 */
export class JanAushadhiProductMatcher {
  private catalog: JanaushadhiProduct[];
  private uniqueActiveIngredients: string[];

  constructor(catalog: JanaushadhiProduct[]) {
    this.catalog = catalog;
    // Extract unique active ingredients for fuzzy matching corrections
    this.uniqueActiveIngredients = Array.from(
      new Set(
        catalog
          .map(p => p.activeIngredient?.trim())
          .filter((ing): ing is string => !!ing && ing.length >= 3)
      )
    );
  }

  match(queryText: string): MatchingEngineResult {
    const norm = MedicineNormalizer.normalize(queryText);
    
    // Safety notice text mapping to requirements
    const medicalSafetyNotice = "Ask a qualified healthcare professional or pharmacist before changing or substituting a medicine. Sehat Setu can show catalog information, but a qualified healthcare professional/pharmacist should confirm whether a substitution is appropriate.";

    // Intercept safety query questions anywhere in the string
    const isSafetyQuery = /\b(can\s+i|should\s+i|how\s+to|what\s+dose|replace|substitute|suitability|fever|cough|pain|suit)\b/i.test(queryText.trim());
    if (isSafetyQuery) {
      return {
        normalizerResult: norm,
        matches: [],
        requiresClarification: false,
        medicalSafetyNotice: "⚠️ Medical Safety Notice: Sehat Setu is an information directory. We do not provide medical prescriptions, diagnoses, or substitution recommendations. Please consult a qualified doctor or pharmacist before taking, changing, or substituting any medication."
      };
    }

    // Apply Levenshtein distance fuzzy spelling correction to parsed generic name
    if (norm.possibleGeneric && !norm.isBrandMapped) {
      const parsedGenericNorm = normalizeString(norm.possibleGeneric);
      let closestIng: string | null = null;
      let minDistance = 999;

      for (const ing of this.uniqueActiveIngredients) {
        const ingNorm = normalizeString(ing);
        const dist = getLevenshteinDistance(parsedGenericNorm, ingNorm);
        if (dist < minDistance) {
          minDistance = dist;
          closestIng = ing;
        }
      }

      // If spelling is extremely close (distance <= 2) and not an exact match already, correct it
      if (closestIng && minDistance > 0 && minDistance <= 2) {
        norm.possibleGeneric = closestIng;
      }
    }

    const matchesList: MatchResult[] = [];

    for (const prod of this.catalog) {
      let matchStatus: MatchResult['matchStatus'] = 'NO_VERIFIED_MATCH';
      let confidence = 0.0;
      const matchReasons: string[] = [];

      const normProdName = normalizeString(prod.productName);
      const normQueryName = normalizeString(norm.normalizedName);
      const normRawQuery = normalizeString(queryText);
      const normGenericQuery = norm.possibleGeneric ? normalizeString(norm.possibleGeneric) : '';
      const normActiveIng = prod.activeIngredient ? normalizeString(prod.activeIngredient) : '';

      // Matcher checks hierarchy:
      
      // 1. Exact Product Code / ID
      if (prod.productCode === queryText.trim() || prod.productId === queryText.trim()) {
        matchStatus = 'EXACT_CATALOG_MATCH';
        confidence = 1.0;
        matchReasons.push("Exact product code / identifier match");
      }
      // 2. Exact Normalized Product Name
      else if (normProdName === normRawQuery || normProdName === normQueryName) {
        matchStatus = 'EXACT_CATALOG_MATCH';
        confidence = 1.0;
        matchReasons.push("Exact product name match");
      }
      // 3. Brand mapped or Generic matching
      else if (norm.possibleGeneric && normGenericQuery.length >= 3 && normActiveIng.length >= 3) {
        const isExactIngMatch = normActiveIng === normGenericQuery;
        // Conservative substring matches: only allow length >= 4 and exclude tiny matches like "Para" matching "Paracetamol"
        const isSubstringMatch = (normActiveIng.includes(normGenericQuery) && normGenericQuery.length >= 5) || 
                                 (normGenericQuery.includes(normActiveIng) && normActiveIng.length >= 5);
        
        const isGenericMatch = isExactIngMatch || isSubstringMatch;
        
        if (isGenericMatch) {
          const strengthQuery = norm.strength ? normalizeStrength(norm.strength) : '';
          const strengthProd = prod.strength ? normalizeStrength(prod.strength) : '';
          
          const dosageQuery = norm.dosageForm ? normalizeDosage(norm.dosageForm) : '';
          const dosageProd = prod.dosageForm ? normalizeDosage(prod.dosageForm) : '';

          const isStrengthMatch = strengthQuery && strengthProd && strengthQuery === strengthProd;
          const isDosageMatch = dosageQuery && dosageProd && dosageQuery === dosageProd;

          if (isExactIngMatch) {
            if (isStrengthMatch && isDosageMatch) {
              matchStatus = 'STRONG_CATALOG_MATCH';
              confidence = norm.isBrandMapped ? 0.95 : 0.92;
              matchReasons.push("Matches active ingredient exactly", "Matches strength exactly", "Matches dosage form exactly");
            } 
            else if (isStrengthMatch && !dosageQuery) {
              matchStatus = 'STRONG_CATALOG_MATCH';
              confidence = 0.88;
              matchReasons.push("Matches active ingredient exactly", "Matches strength exactly", "Dosage form unspecified");
            }
            else if (isStrengthMatch && !isDosageMatch) {
              matchStatus = 'POSSIBLE_CATALOG_MATCH';
              confidence = 0.65;
              matchReasons.push("Matches active ingredient exactly", "Matches strength", "Different dosage form");
            }
            else if (!isStrengthMatch && isDosageMatch) {
              matchStatus = 'POSSIBLE_CATALOG_MATCH';
              confidence = 0.60;
              matchReasons.push("Matches active ingredient exactly", "Different strength", "Matches dosage form");
            }
            else {
              matchStatus = 'POSSIBLE_CATALOG_MATCH';
              confidence = 0.50;
              matchReasons.push("Matches active ingredient exactly", "Strength or dosage form differs");
            }
          } else {
            // Partial substring matches get lower confidence scores to prioritize exact active ingredient matches
            if (isStrengthMatch && isDosageMatch) {
              matchStatus = 'STRONG_CATALOG_MATCH';
              confidence = 0.80;
              matchReasons.push("Matches active ingredient (partial)", "Matches strength exactly", "Matches dosage form exactly");
            } else {
              matchStatus = 'POSSIBLE_CATALOG_MATCH';
              confidence = 0.40;
              matchReasons.push("Matches active ingredient (partial)", "Strength or dosage form differs");
            }
          }
        }
      }

      if (matchStatus !== 'NO_VERIFIED_MATCH') {
        matchesList.push({
          product: prod,
          matchStatus,
          confidence,
          matchReasons
        });
      }
    }

    // Sort by match strength confidence, then by lowest price (MRP)
    matchesList.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return a.product.mrp - b.product.mrp;
    });

    // Check if multiple matches exist with same high confidence
    const hasMultipleExactMatches = matchesList.filter(m => m.matchStatus === 'EXACT_CATALOG_MATCH').length > 1;

    return {
      normalizerResult: norm,
      matches: matchesList.slice(0, 10), // return top 10 matches
      requiresClarification: hasMultipleExactMatches,
      medicalSafetyNotice
    };
  }
}

export const logJanaushadhiAnalytics = (
  eventName: 'MEDICINE_SEARCH' | 'CATALOG_MATCH_FOUND' | 'CATALOG_MATCH_NOT_FOUND' | 'PRODUCT_VIEWED' | 'KENDRA_VIEWED' | 'DIRECTIONS_OPENED' | 'CALL_INITIATED',
  payload: Record<string, any>
) => {
  // Anonymize sensitive fields
  const safePayload: any = {
    ...payload,
    timestamp: new Date().toISOString(),
    queryLength: payload.query?.length,
    voiceUsed: !!payload.voiceUsed,
    matchCount: payload.matchCount
  };
  
  // Clean query from payloads to avoid leaking private medical history in analytics
  if (safePayload.query) {
    delete safePayload.query;
  }

  // Map local names to system event taxonomy
  let targetEvent: string = eventName;
  if (eventName === 'CATALOG_MATCH_FOUND') targetEvent = 'PRODUCT_MATCH_FOUND';
  if (eventName === 'CATALOG_MATCH_NOT_FOUND') targetEvent = 'PRODUCT_MATCH_NOT_FOUND';
  if (eventName === 'DIRECTIONS_OPENED') targetEvent = 'KENDRA_DIRECTIONS_OPENED';
  if (eventName === 'CALL_INITIATED') targetEvent = 'KENDRA_CALL_INITIATED';

  analyticsService.trackEvent(targetEvent, safePayload);
};
