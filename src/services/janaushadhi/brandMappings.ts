export interface VerifiedBrandMapping {
  brandName: string; // Exact canonical brand name
  genericName: string; // Target generic active ingredient
  strength: string; // Target strength
  dosageForm: string; // Target dosage form (e.g., Tablets, Capsules)
}

// Extensible registry of verified brand-to-generic mappings
export const VERIFIED_BRAND_MAPPINGS: Record<string, VerifiedBrandMapping> = {
  "dolo650": {
    brandName: "Dolo 650",
    genericName: "Paracetamol",
    strength: "650 mg",
    dosageForm: "Tablets"
  },
  "dolo500": {
    brandName: "Dolo 500",
    genericName: "Paracetamol",
    strength: "500 mg",
    dosageForm: "Tablets"
  },
  "dolo": {
    brandName: "Dolo",
    genericName: "Paracetamol",
    strength: "",
    dosageForm: "Tablets"
  },
  "crocin650": {
    brandName: "Crocin 650",
    genericName: "Paracetamol",
    strength: "650 mg",
    dosageForm: "Tablets"
  },
  "crocin500": {
    brandName: "Crocin 500",
    genericName: "Paracetamol",
    strength: "500 mg",
    dosageForm: "Tablets"
  },
  "crocin": {
    brandName: "Crocin",
    genericName: "Paracetamol",
    strength: "",
    dosageForm: "Tablets"
  },
  "calpol650": {
    brandName: "Calpol 650",
    genericName: "Paracetamol",
    strength: "650 mg",
    dosageForm: "Tablets"
  },
  "calpol500": {
    brandName: "Calpol 500",
    genericName: "Paracetamol",
    strength: "500 mg",
    dosageForm: "Tablets"
  },
  "calpol": {
    brandName: "Calpol",
    genericName: "Paracetamol",
    strength: "",
    dosageForm: "Tablets"
  },
  "aspirin": {
    brandName: "Aspirin",
    genericName: "Aspirin",
    strength: "",
    dosageForm: "Tablets"
  },
  "disprin": {
    brandName: "Disprin",
    genericName: "Aspirin",
    strength: "",
    dosageForm: "Tablets"
  },
  "combiflam": {
    brandName: "Combiflam",
    genericName: "Ibuprofen",
    strength: "",
    dosageForm: "Tablets"
  },
  "pantocid": {
    brandName: "Pantocid",
    genericName: "Pantoprazole",
    strength: "40 mg",
    dosageForm: "Tablets"
  },
  "pantocid40": {
    brandName: "Pantocid 40",
    genericName: "Pantoprazole",
    strength: "40 mg",
    dosageForm: "Tablets"
  },
  "pan40": {
    brandName: "Pan 40",
    genericName: "Pantoprazole",
    strength: "40 mg",
    dosageForm: "Tablets"
  },
  "pantosec": {
    brandName: "Pantosec",
    genericName: "Pantoprazole",
    strength: "40 mg",
    dosageForm: "Tablets"
  },
  "pantodac": {
    brandName: "Pantodac",
    genericName: "Pantoprazole",
    strength: "40 mg",
    dosageForm: "Tablets"
  },
  "okacet": {
    brandName: "Okacet",
    genericName: "Cetirizine",
    strength: "10 mg",
    dosageForm: "Tablets"
  },
  "cetirizine": {
    brandName: "Cetirizine",
    genericName: "Cetirizine",
    strength: "",
    dosageForm: "Tablets"
  },
  "alercet": {
    brandName: "Alercet",
    genericName: "Cetirizine",
    strength: "10 mg",
    dosageForm: "Tablets"
  },
  "glycomet": {
    brandName: "Glycomet",
    genericName: "Metformin",
    strength: "500 mg",
    dosageForm: "Tablets"
  },
  "metformin": {
    brandName: "Metformin",
    genericName: "Metformin",
    strength: "",
    dosageForm: "Tablets"
  },
  "mox500": {
    brandName: "Mox 500",
    genericName: "Amoxycillin",
    strength: "500 mg",
    dosageForm: "Capsules"
  },
  "amoxicillin": {
    brandName: "Amoxicillin",
    genericName: "Amoxycillin",
    strength: "",
    dosageForm: "Capsules"
  },
  "amoxycillin": {
    brandName: "Amoxycillin",
    genericName: "Amoxycillin",
    strength: "",
    dosageForm: "Capsules"
  },
  "telma": {
    brandName: "Telma",
    genericName: "Telmisartan",
    strength: "40 mg",
    dosageForm: "Tablets"
  },
  "telma40": {
    brandName: "Telma 40",
    genericName: "Telmisartan",
    strength: "40 mg",
    dosageForm: "Tablets"
  },
  "tazloc": {
    brandName: "Tazloc",
    genericName: "Telmisartan",
    strength: "40 mg",
    dosageForm: "Tablets"
  },
  "atorva": {
    brandName: "Atorva",
    genericName: "Atorvastatin",
    strength: "10 mg",
    dosageForm: "Tablets"
  },
  "lipitor": {
    brandName: "Lipitor",
    genericName: "Atorvastatin",
    strength: "10 mg",
    dosageForm: "Tablets"
  }
};

/**
 * Normalizes a brand query key for lookup.
 * Removes spaces, hyphens, and converts to lowercase.
 */
export function getNormalizedBrandKey(query: string): string {
  return query.toLowerCase().replace(/[\s\-\_]/g, '');
}

/**
 * Resolves a brand name to its verified generic equivalent.
 * Returns null if no trusted mapping exists.
 */
export function getBrandMapping(query: string): VerifiedBrandMapping | null {
  const key = getNormalizedBrandKey(query);
  return VERIFIED_BRAND_MAPPINGS[key] || null;
}
