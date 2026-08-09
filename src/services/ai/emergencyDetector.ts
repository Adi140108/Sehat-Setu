// Emergency Safety Detector
// Detects high-risk emergency phrases in English, Hindi, and Indian regional transliterations

const EMERGENCY_KEYWORDS = [
  // English
  'chest pain', 'severe chest pain', 'heart attack', 'difficulty breathing', 'cannot breathe',
  'breathless', 'unconscious', 'passed out', 'heavy bleeding', 'snake bite', 'poisoning',
  'stroke', 'paralysis', 'severe allergic reaction', 'major accident', 'head injury',
  'severe trauma', 'pregnancy emergency', 'labor pain', 'high risk labor',

  // Hindi & Transliteration
  'seene mein dard', 'chhati me dard', 'saans nahi aa rahi', 'saans lene me dikkat',
  'behosh', 'khoon beh raha', 'saanp ne kata', 'saap ne kaata', 'zehar', 'poison',
  'accident ho gaya', 'chot lag gayi', 'garbhavastha emergency', 'prasav dard',
  'सीना दर्द', 'छाती में दर्द', 'सांस नहीं आ रही', 'बेहोश', 'खून बह रहा है', 'सांप काटा'
];

export interface EmergencyCheckResult {
  isEmergency: boolean;
  matchedPattern?: string;
  recommendedAction: string;
}

export function checkEmergencySafety(userMessage: string): EmergencyCheckResult {
  const normalizedText = userMessage.toLowerCase().trim();

  for (const keyword of EMERGENCY_KEYWORDS) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      return {
        isEmergency: true,
        matchedPattern: keyword,
        recommendedAction: 'Immediate high-priority emergency path activated. Display red emergency alert screen and 108 emergency dialer.'
      };
    }
  }

  return {
    isEmergency: false,
    recommendedAction: 'Normal intent routing pathway.'
  };
}
