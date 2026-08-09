import type { HealthScheme, HouseholdMember } from '../../types';
import { DEMO_SCHEMES } from '../../data/schemes';

export interface EvaluationInput {
  age?: number;
  state?: string;
  incomeCategory?: 'BPL' | 'APL' | 'EWS' | 'NONE';
  rationCardType?: string;
  hasAadhaar?: boolean;
  householdMembers?: HouseholdMember[];
}

export interface EligibilityResult {
  scheme: HealthScheme;
  status: 'LIKELY_ELIGIBLE' | 'MORE_INFO_REQUIRED' | 'NOT_MATCHING_RULES';
  confidenceReason: string;
  matchedCriteria: string[];
  missingCriteria: string[];
  disclaimers: string;
}

export function evaluateSchemeEligibility(scheme: HealthScheme, input: EvaluationInput): EligibilityResult {
  const matchedCriteria: string[] = [];
  const missingCriteria: string[] = [];
  let score = 0;
  let requiredChecksCount = 0;

  // 1. Check Age requirement if scheme specifies min/max age
  if (scheme.eligibilityRules.minAge !== undefined) {
    requiredChecksCount++;
    if (input.age !== undefined) {
      if (input.age >= scheme.eligibilityRules.minAge) {
        score++;
        matchedCriteria.push(`Age is ${input.age} (Requires minimum ${scheme.eligibilityRules.minAge} years).`);
      } else {
        missingCriteria.push(`Age is ${input.age}, but scheme requires minimum ${scheme.eligibilityRules.minAge} years.`);
      }
    } else {
      missingCriteria.push(`Age not provided (Requires minimum ${scheme.eligibilityRules.minAge} years).`);
    }
  }

  // 2. Check State requirement
  if (scheme.state !== 'National') {
    requiredChecksCount++;
    if (input.state) {
      if (input.state.toLowerCase().includes(scheme.state.toLowerCase())) {
        score++;
        matchedCriteria.push(`State matches ${scheme.state}.`);
      } else {
        missingCriteria.push(`Scheme is valid for ${scheme.state}, user state is ${input.state}.`);
      }
    } else {
      missingCriteria.push(`State not specified (Scheme is specific to ${scheme.state}).`);
    }
  }

  // 3. Check Income Category / BPL
  if (scheme.eligibilityRules.maxIncomeCategory && scheme.eligibilityRules.maxIncomeCategory.length > 0) {
    requiredChecksCount++;
    if (input.incomeCategory && input.incomeCategory !== 'NONE') {
      if (scheme.eligibilityRules.maxIncomeCategory.includes(input.incomeCategory as any)) {
        score++;
        matchedCriteria.push(`Income category '${input.incomeCategory}' matches scheme requirements.`);
      } else {
        missingCriteria.push(`Income category '${input.incomeCategory}' does not match allowed categories (${scheme.eligibilityRules.maxIncomeCategory.join(', ')}).`);
      }
    } else {
      missingCriteria.push(`Income/Card status not specified (Requires ${scheme.eligibilityRules.maxIncomeCategory.join('/')}).`);
    }
  }

  // 4. Check Universal Scheme (e.g. Jan Aushadhi, NHM OPD)
  if (requiredChecksCount === 0) {
    return {
      scheme,
      status: 'LIKELY_ELIGIBLE',
      confidenceReason: 'This is a universal public health initiative accessible to all Indian citizens.',
      matchedCriteria: ['Universal access open to all citizens'],
      missingCriteria: [],
      disclaimers: 'Preliminary eligibility indication. Final verification occurs at hospital kiosk.'
    };
  }

  // Calculate final status
  let status: 'LIKELY_ELIGIBLE' | 'MORE_INFO_REQUIRED' | 'NOT_MATCHING_RULES' = 'MORE_INFO_REQUIRED';
  if (score === requiredChecksCount && requiredChecksCount > 0) {
    status = 'LIKELY_ELIGIBLE';
  } else if (missingCriteria.length > 0 && score === 0) {
    status = 'NOT_MATCHING_RULES';
  } else {
    status = 'MORE_INFO_REQUIRED';
  }

  return {
    scheme,
    status,
    confidenceReason: status === 'LIKELY_ELIGIBLE' 
      ? 'All specified rules match preliminary criteria.'
      : 'Some mandatory details need clarification or do not meet threshold.',
    matchedCriteria,
    missingCriteria,
    disclaimers: 'Preliminary eligibility indication. Final official enrollment and verification is conducted at the designated kiosk or portal.'
  };
}

export function evaluateAllSchemes(input: EvaluationInput): EligibilityResult[] {
  return DEMO_SCHEMES.map(scheme => evaluateSchemeEligibility(scheme, input));
}
