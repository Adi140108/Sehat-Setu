export interface Scheme {
  schemeId: string;
  name: string;
  description: string;
  purpose: string;
  eligibilityGuidance: string;
  officialSource: string;
  sourceDate: string;
  lastVerifiedAt: string;
}

export interface SchemeDocument {
  name: string;
  required: boolean;
  notes: string;
  source: string;
}

export interface SchemeDocumentRequirementResult {
  schemeId: string;
  schemeName: string;
  documents: SchemeDocument[];
  verificationNote: string;
}

const SCHEMES_REGISTRY: Record<string, Scheme> = {
  PM_JAY: {
    schemeId: "PM_JAY",
    name: "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)",
    description: "AB-PMJAY is a pioneering national scheme providing free health insurance coverage of up to ₹5 Lakhs per family per year for secondary and tertiary care hospitalization to over 12 crore poor and vulnerable families.",
    purpose: "Provides financial protection against catastrophic medical expenditures and access to free healthcare empanelled facilities.",
    eligibilityGuidance: "Eligible families are identified based on the SECC 2011 database, or holding active BPL / Antyodaya Anna Yojana (AAY) cards in Karnataka.",
    officialSource: "National Health Authority (NHA), Government of India",
    sourceDate: "2025-01-01",
    lastVerifiedAt: "2026-08-11"
  }
};

const DOCUMENTS_REGISTRY: Record<string, SchemeDocument[]> = {
  PM_JAY: [
    {
      name: "Aadhaar Card",
      required: true,
      notes: "Mandatory for primary identity verification of the beneficiary.",
      source: "National Health Authority Guidance"
    },
    {
      name: "Ration Card (BPL or AAY Card)",
      required: true,
      notes: "Mandatory in Karnataka to verify family relationships and poverty criteria.",
      source: "Karnataka Department of Health & Family Welfare"
    },
    {
      name: "PM-JAY ID Card / Ayushman Card",
      required: false,
      notes: "Highly recommended. If you already have the gold card, carry it to trigger immediate cash-free checkin.",
      source: "National Health Authority Guidance"
    }
  ]
};

export const schemeService = {
  getSchemeById(schemeId: string): Scheme | null {
    return SCHEMES_REGISTRY[schemeId] || null;
  },

  getAllSchemes(): Scheme[] {
    return Object.values(SCHEMES_REGISTRY);
  },

  getDocumentRequirements(schemeId: string): SchemeDocumentRequirementResult | null {
    const scheme = SCHEMES_REGISTRY[schemeId];
    const docs = DOCUMENTS_REGISTRY[schemeId];
    if (!scheme || !docs) return null;

    return {
      schemeId: scheme.schemeId,
      schemeName: scheme.name,
      documents: docs,
      verificationNote: "Always present original documents at the hospital's Ayushman Mitra counter for verification before admission."
    };
  }
};
