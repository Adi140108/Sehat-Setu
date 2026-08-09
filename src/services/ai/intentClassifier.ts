import type { IntentResult, LanguageCode } from '../../types';
import { checkEmergencySafety } from './emergencyDetector';

// Keywords dictionary for deterministic intent classification fallback
const INTENT_PATTERNS = {
  FIND_FACILITY: [
    'hospital', 'clinic', 'phc', 'chc', 'jan aushadhi', 'kendra', 'doctor', 'medical center',
    'paas mein', 'sarkari hospital', 'dawakhana', 'aushadhalaya', 'bed available', 'opd',
    'ಆಸ್ಪತ್ರೆ', 'மருத்துவமனை', 'ఆసుపత్రి', 'रुग्णालय'
  ],
  CHECK_SCHEME: [
    'scheme', 'yojana', 'ayushman', 'pmjay', 'bpl card', 'card eligibility', 'insurance',
    'claim', 'coverage', 'yojane', 'திட்டம்', 'పథకం', 'योजना'
  ],
  DOCUMENT_REQUIREMENTS: [
    'document', 'paper', 'aadhaar', 'ration card', 'kya kya chahiye', 'proof', 'certificate',
    'ದಾಖಲೆ', 'ஆவணங்கள்', 'పత్రాలు', 'कागदपत्रे'
  ],
  HUMAN_SUPPORT: [
    'talk to person', 'asha worker', 'volunteer', 'human', 'call me', 'baat karni hai',
    'सहायक', 'কথা', 'నేరుగా మాట్లాడాలి'
  ],
  FOLLOW_UP: [
    'visited', 'follow up', 'reminder', 'appointment', 'refill', 'dawa reminder',
    'याद दिलाएं', 'నేను వెళ్లాను'
  ]
};

// Diagnosis / Prescription query patterns to strictly reject
const DIAGNOSIS_QUERY_PATTERNS = [
  'what disease do i have', 'diagnose me', 'do i have cancer', 'what illness is this',
  'which medicine should i take for', 'prescribe medicine', 'give me medicine dosage',
  'kya bimari hai mujhe', 'kaun si dawa lu', 'mujhe kya rog hai'
];

export const DIAGNOSIS_REJECTION_MESSAGE = "I cannot diagnose medical conditions or prescribe treatment. I can help you find the appropriate healthcare facility, check government health schemes, or connect you with emergency help.";

export function classifyIntent(userText: string, currentLang: LanguageCode = 'en'): IntentResult {
  const textLower = userText.toLowerCase().trim();

  // 1. First check emergency safety
  const emergencyCheck = checkEmergencySafety(userText);
  if (emergencyCheck.isEmergency) {
    return {
      category: 'EMERGENCY',
      confidence: 0.99,
      language: currentLang,
      isEmergency: true,
      extractedEntities: {
        symptomOrCondition: emergencyCheck.matchedPattern
      }
    };
  }

  // 2. Check diagnosis query attempt
  for (const diagPattern of DIAGNOSIS_QUERY_PATTERNS) {
    if (textLower.includes(diagPattern)) {
      return {
        category: 'GENERAL_HEALTHCARE_NAVIGATION',
        confidence: 0.95,
        language: currentLang,
        isEmergency: false,
        extractedEntities: {},
        directResponseKey: DIAGNOSIS_REJECTION_MESSAGE
      };
    }
  }

  // 3. Extract potential pincode / location
  const pincodeMatch = textLower.match(/\b\d{6}\b/);
  const pincode = pincodeMatch ? pincodeMatch[0] : undefined;

  // 4. Intent Keyword Classifier
  for (const [intent, keywords] of Object.entries(INTENT_PATTERNS)) {
    for (const kw of keywords) {
      if (textLower.includes(kw)) {
        return {
          category: intent as any,
          confidence: 0.90,
          language: currentLang,
          isEmergency: false,
          extractedEntities: {
            pincode,
            location: pincode ? `Pincode ${pincode}` : undefined
          }
        };
      }
    }
  }

  // 5. Default fallback to UNKNOWN if low confidence
  return {
    category: 'UNKNOWN',
    confidence: 0.40,
    language: currentLang,
    isEmergency: false,
    extractedEntities: { pincode }
  };
}
