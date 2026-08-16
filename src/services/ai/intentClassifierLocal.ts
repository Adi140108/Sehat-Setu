import type { IntentResult, LanguageCode } from '../../types';
import { checkEmergencySafety } from './emergencyDetector';
import intentExamplesRaw from '../../../data/intents/intent_examples.json';

const intentExamples = intentExamplesRaw as Record<string, string[]>;

// Helper to tokenize and clean strings
const tokenize = (text: string): string[] => {
  return text.toLowerCase().match(/\b\w+\b/g) || [];
};

// Build vocabulary from all examples
const vocab = new Map<string, number>();
let vocabSize = 0;
for (const examples of Object.values(intentExamples)) {
  for (const ex of examples) {
    for (const word of tokenize(ex)) {
      if (!vocab.has(word)) {
        vocab.set(word, vocabSize++);
      }
    }
  }
}

// Convert text into an L2-normalized vector
const getVector = (text: string): number[] => {
  const vec = new Array(vocabSize).fill(0);
  const tokens = tokenize(text);
  for (const t of tokens) {
    if (vocab.has(t)) {
      vec[vocab.get(t)!]++;
    }
  }
  
  let normSq = 0;
  for (const v of vec) {
    normSq += v * v;
  }
  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= norm;
    }
  }
  return vec;
};

// Cache example vectors on load
const cachedVectors: { intent: string; vector: number[] }[] = [];
for (const [intent, examples] of Object.entries(intentExamples)) {
  for (const ex of examples) {
    cachedVectors.push({ intent, vector: getVector(ex) });
  }
}

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
};

const DIAGNOSIS_QUERY_PATTERNS = [
  'what disease do i have', 'diagnose me', 'do i have cancer', 'what illness is this',
  'which medicine should i take for', 'prescribe medicine', 'give me medicine dosage',
  'kya bimari hai mujhe', 'kaun si dawa lu', 'mujhe kya rog hai',
  'बीमारी', 'दवा बताएं', 'इलाज बताएं', 'क्या बीमारी है', 'दवाई कौन सी लेनी है'
];

export const DIAGNOSIS_REJECTION_MESSAGE = "I cannot diagnose medical conditions or prescribe treatment. I can help you find the appropriate healthcare facility, check government health schemes, or connect you with emergency help.";

/**
 * Local client-side hybrid intent classifier (Layer 1 Keyword + Layer 2 TF-IDF Cosine Similarity)
 */
export function classifyIntentLocal(userText: string, currentLang: LanguageCode = 'en'): IntentResult {
  const textLower = userText.toLowerCase().trim();

  // 1. Emergency Safety Filter
  const emergencyCheck = checkEmergencySafety(userText);
  if (emergencyCheck.isEmergency) {
    return {
      category: 'EMERGENCY',
      confidence: 0.99,
      isEmergency: true,
      language: currentLang,
      extractedEntities: {
        symptomOrCondition: emergencyCheck.matchedPattern
      }
    };
  }

  // 2. Medical Diagnosis Block (No Medical Inference Rule)
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

  // 3. TF-IDF Cosine Similarity Matcher
  const queryVec = getVector(userText);
  let bestIntent = "UNKNOWN";
  let maxScore = 0.0;

  for (const item of cachedVectors) {
    const score = cosineSimilarity(queryVec, item.vector);
    if (score > maxScore) {
      maxScore = score;
      bestIntent = item.intent;
    }
  }

  // Scale score slightly to match embeddings range (TF-IDF is sparse)
  let confidence = Math.min(1.0, maxScore * 1.6);
  if (tokenize(userText).length === 0) {
    confidence = 0.40;
    bestIntent = "UNKNOWN";
  }

  // 4. Threshold & Clarification Logic
  let requiresClarification = false;
  if (confidence >= 0.85) {
    requiresClarification = false;
  } else if (confidence >= 0.60) {
    requiresClarification = true;
  } else {
    bestIntent = "UNKNOWN";
    requiresClarification = true;
  }

  // 5. Entity Extraction
  const entities: Record<string, any> = {};

  // PIN code extraction
  const pincodeMatch = textLower.match(/\b\d{6}\b/);
  if (pincodeMatch) {
    entities.pincode = pincodeMatch[0];
    entities.location = {
      type: "PINCODE",
      value: pincodeMatch[0]
    };
  }

  // Location checks
  const cities = ['bengaluru', 'bangalore', 'kolar', 'bagalkot', 'belagavi', 'mysuru'];
  for (const city of cities) {
    if (textLower.includes(city)) {
      if (!entities.location) {
        entities.location = {
          type: "DISTRICT_OR_CITY",
          value: city.charAt(0).toUpperCase() + city.slice(1)
        };
      }
    }
  }

  if (textLower.includes('near me') || textLower.includes('paas mein') || textLower.includes('huttira')) {
    entities.location = {
      type: "CURRENT_LOCATION",
      value: "near_me"
    };
  }

  // Scheme matches
  if (textLower.includes('ayushman') || textLower.includes('pmjay') || textLower.includes('pm-jay')) {
    entities.scheme = "PM_JAY";
  }

  // Medicine matches
  const meds = ['dolo', 'paracetamol', 'aspirin', 'crocin', 'calpol', 'ibuprofen'];
  for (const med of meds) {
    if (textLower.includes(med)) {
      entities.medicine = med.charAt(0).toUpperCase() + med.slice(1);
      break;
    }
  }

  return {
    category: bestIntent as any,
    confidence: Number(confidence.toFixed(2)),
    isEmergency: false,
    language: currentLang,
    extractedEntities: entities,
    requiresClarification
  };
}
