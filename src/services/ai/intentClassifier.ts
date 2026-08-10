import type { IntentResult, LanguageCode } from '../../types';
import { checkEmergencySafety } from './emergencyDetector';

// Keywords dictionary for deterministic intent classification fallback
const INTENT_PATTERNS = {
  FIND_FACILITY: [
    // English & Transliterations
    'hospital', 'clinic', 'phc', 'chc', 'jan aushadhi', 'kendra', 'doctor', 'medical center',
    'paas mein', 'sarkari hospital', 'dawakhana', 'aushadhalaya', 'bed available', 'opd',
    
    // Hindi Devanagari
    'अस्पताल', 'डॉक्टर', 'दवाखाना', 'क्लिनिक', 'औषधालय', 'इलाज', 'सरकारी', 'दवाई',
    
    // Kannada
    'ಆಸ್ಪತ್ರೆ', 'ವೈದ್ಯರು', 'ಔಷಧಿ', 'ಚಿಕಿತ್ಸೆ', 'ಸರಕಾರಿ',
    
    // Tamil
    'மருத்துவமனை', 'டாக்டர்', 'சிகிச்சை', 'மருந்து', 'அரசு',
    
    // Telugu
    'ఆసుపత్రి', 'వైద్యుడు', 'చికిత్స', 'మందులు', 'ప్రభుత్వ',
    
    // Marathi
    'रुग्णालय', 'दवाखाना', 'डॉक्टर', 'औषधोपचार', 'सरकारी'
  ],
  CHECK_SCHEME: [
    // English & Transliterations
    'scheme', 'yojana', 'ayushman', 'pmjay', 'bpl card', 'card eligibility', 'insurance',
    'claim', 'coverage', 'yojane',
    
    // Hindi Devanagari
    'योजना', 'आयुष्मान', 'बीमा', 'पात्रता', 'कार्ड', 'लाभ',
    
    // Kannada
    'ಯೋಜನೆ', 'ಆಯುಷ್ಮಾನ್', 'ವಿಮೆ', 'ಕಾರ್ಡ್', 'ಅರ್ಹತೆ',
    
    // Tamil
    'திட்டம்', 'ஆயுஷ்மான்', 'காப்பீடு', 'அட்டை', 'தகுதி',
    
    // Telugu
    'పథకం', 'ఆయుష్మాన్', 'భీమా', 'కార్డు', 'అర్హత',
    
    // Marathi
    'योजना', 'आयुष्मान', 'विमा', 'पात्रता', 'कार्ड'
  ],
  DOCUMENT_REQUIREMENTS: [
    // English & Transliterations
    'document', 'paper', 'aadhaar', 'ration card', 'kya kya chahiye', 'proof', 'certificate',
    
    // Hindi Devanagari
    'दस्तावेज', 'कागज', 'कागजात', 'आधार', 'राशन', 'प्रमाण पत्र',
    
    // Kannada
    'ದಾಖಲೆ', 'ಪತ್ರ', 'ಆಧಾರ್', 'ರೇಷನ್', 'ಪ್ರಮಾಣಪತ್ರ',
    
    // Tamil
    'ஆவணம்', 'பத்திரம்', 'ஆதார்', 'குடும்ப அட்டை', 'சான்றிதழ்',
    
    // Telugu
    'పత్రాలు', 'ఆధార్', 'రేషన్ కార్డ్', 'ధృవీకరణ',
    
    // Marathi
    'कागदपत्रे', 'आधार', 'रेशन कार्ड', 'प्रमाणपत्र'
  ],
  HUMAN_SUPPORT: [
    // English & Transliterations
    'talk to person', 'asha worker', 'volunteer', 'human', 'call me', 'baat karni hai',
    'support request', 'help',
    
    // Hindi Devanagari
    'मदद', 'बात', 'सहायता', 'कार्यकर्ता', 'स्वयंसेवक', 'आशा',
    
    // Kannada
    'ಸಹಾಯ', 'ಮಾತನಾಡು', 'ಕಾರ್ಯಕರ್ತ', 'ಸೇವಕ',
    
    // Tamil
    'உதவி', 'பேச', 'தொண்டர்', 'ஆஷா',
    
    // Telugu
    'సహాయం', 'మాట్లాడాలి', 'స్వచ్ఛంద', 'ఆశా',
    
    // Marathi
    'मदत', 'बोलणे', 'कार्यकर्ता', 'आशा'
  ],
  FOLLOW_UP: [
    // English & Transliterations
    'visited', 'follow up', 'reminder', 'appointment', 'refill', 'dawa reminder',
    'yaad delaen',
    
    // Hindi Devanagari
    'याद दिलाएं', 'विजिट किया', 'फॉलो अप', 'रिमाइंडर', 'समय',
    
    // Kannada
    'ನೆನಪಿಸು', 'ಭೇಟಿ ನೀಡಿದ್ದೇನೆ',
    
    // Tamil
    'நினைவூட்டல்', 'சென்றேன்',
    
    // Telugu
    'గుర్తు చేయి', 'వెళ్లాను',
    
    // Marathi
    'आठवण करा', 'भेट दिली'
  ]
};

// Diagnosis / Prescription query patterns to strictly reject
const DIAGNOSIS_QUERY_PATTERNS = [
  'what disease do i have', 'diagnose me', 'do i have cancer', 'what illness is this',
  'which medicine should i take for', 'prescribe medicine', 'give me medicine dosage',
  'kya bimari hai mujhe', 'kaun si dawa lu', 'mujhe kya rog hai',
  'बीमारी', 'दवा बताएं', 'इलाज बताएं', 'क्या बीमारी है', 'दवाई कौन सी लेनी है'
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
      if (textLower.includes(kw.toLowerCase())) {
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
