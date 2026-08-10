// Emergency Safety Detector
// Detects high-risk emergency phrases in English, Hindi, and Indian regional scripts/transliterations

const EMERGENCY_KEYWORDS = [
  // English
  'chest pain', 'severe chest pain', 'heart attack', 'difficulty breathing', 'cannot breathe',
  'breathless', 'unconscious', 'passed out', 'heavy bleeding', 'snake bite', 'poisoning',
  'stroke', 'paralysis', 'severe allergic reaction', 'major accident', 'head injury',
  'severe trauma', 'pregnancy emergency', 'labor pain', 'high risk labor',

  // Hindi & Hindi Transliteration
  'seene mein dard', 'chhati me dard', 'saans nahi aa rahi', 'saans lene me dikkat',
  'behosh', 'khoon beh raha', 'saanp ne kata', 'saap ne kaata', 'zehar', 'poison',
  'accident ho gaya', 'chot lag gayi', 'garbhavastha emergency', 'prasav dard',
  'सीना दर्द', 'छाती में दर्द', 'सांस नहीं आ रही', 'बेहोश', 'खून बह रहा है', 'सांप काटा', 'हार्ट अटैक',

  // Kannada & Kannada Transliteration
  'ede nova', 'ede novu', 'usirata tondare', 'kettoda', 'behosh', 'apaghata',
  'ಎದೆ ನೋವು', 'ಉಸಿರಾಟದ ತೊಂದರೆ', 'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ', 'ರಕ್ತಸ್ರಾವ', 'ಹಾವು ಕಡಿತ', 'ಅಪಘಾತ',

  // Tamil & Tamil Transliteration
  'nenju vali', 'moochu thinaral', 'adhibabar', 'vibathu', 'ratham',
  'நெஞ்சு வலி', 'மூச்சுத் திணறல்', 'மயக்கம்', 'இரத்தப்போக்கு', 'பாம்பு கடி', 'விபத்து',

  // Telugu & Telugu Transliteration
  'gunde noppi', 'usiri adadam ledu', 'padi poyadu', 'pramadham',
  'గుండె నొప్పి', 'శ్వాస తీసుకోవడం కష్టం', 'స్పృహ తప్పడం', 'రక్తస్రావం', 'పాము కాటు', 'ప్రమాదం',

  // Marathi & Marathi Transliteration
  'chatit dukhne', 'shwas ghenyas tras', 'behosh', 'rakta strav', 'sap chawala',
  'छातीत दुखणे', 'श्वास घेण्यास त्रास', 'बेहोश', 'रक्तस्त्राव', 'साप चावला', 'अपघात'
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
