import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { classifyIntent } from '../../services/ai/intentClassifier';
import { sttService } from '../../services/voice/speechToText';
import { ttsService } from '../../services/voice/textToSpeech';
import type { IntentResult, LanguageCode } from '../../types';
import { Mic, MicOff, Send, Volume2, AlertCircle, Sparkles, HelpCircle, ShieldAlert, Award, FileText, HeartHandshake, Bell, Building2 } from 'lucide-react';

interface VoiceTextInterfaceProps {
  initialQuery?: string;
  onSelectIntent: (intentResult: IntentResult) => void;
}

// Custom natural language feedback generator for local language speakers
const AI_RESPONSES: Record<string, Record<LanguageCode, string>> = {
  EMERGENCY: {
    en: "⚠️ Medical Emergency detected! Please seek medical help immediately. Call 108 or proceed to the nearest hospital. I have activated the Emergency assistance console.",
    hi: "⚠️ आपातकालीन चिकित्सा स्थिति! कृपया तुरंत चिकित्सकीय सहायता लें। 108 पर कॉल करें या नजदीकी अस्पताल जाएं। मैंने आपातकालीन सहायता सक्रिय कर दी है।",
    kn: "⚠️ ತುರ್ತು ವೈದ್ಯಕೀಯ ಪರಿಸ್ಥಿತಿ ಪತ್ತೆಯಾಗಿದೆ! ದಯವಿಟ್ಟು ತಕ್ಷಣವೇ ವೈದ್ಯಕೀಯ ನೆರವು ಪಡೆಯಿರಿ. 108 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ.",
    ta: "⚠️ மருத்துவ அவசரநிலை கண்டறியப்பட்டுள்ளது! தயவுசெய்து உடனடியாக மருத்துவ உதவியை நாடவும். 108 ஐ அழைக்கவும் அல்லது அருகிலுள்ள மருத்துவமனைக்கு செல்லவும்.",
    te: "⚠️ అత్యవసర వైద్య పరిస్థితి గుర్తించబడింది! దయచేసి వెంటనే వైద్య సహాయం పొందండి. 108 కి కాల్ చేయండి లేదా సమీప ఆసుపత్రికి వెళ్ళండి.",
    mr: "⚠️ आणीबाणीची वैद्यकीय स्थिती आढळली आहे! कृपया त्वरित वैद्यकीय मदत घ्या. 108 वर कॉल करा किंवा जवळच्या रुग्णालयात जा."
  },
  FIND_FACILITY: {
    en: "🔍 Hospital / Clinic Locator: Finding nearby public hospitals, Community Health Centres (CHCs), and Jan Aushadhi generic pharmacies. The nearest verified locations are listed below.",
    hi: "🔍 अस्पताल / क्लिनिक खोज: आपके निकटतम सरकारी अस्पताल, सामुदायिक स्वास्थ्य केंद्र (CHC), और जन औषधि केंद्रों की सूची नीचे लोड कर दी गई है।",
    kn: "🔍 ಆಸ್ಪತ್ರೆ / ಕ್ಲಿನಿಕ್ ಹುಡುಕಾಟ: ಹತ್ತಿರದ ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆಗಳು, ಸಮುದಾಯ ಆರೋಗ್ಯ ಕೇಂದ್ರಗಳು ಮತ್ತು ಜನೌಷಧಿ ಔಷಧಾಲಯಗಳ ಪಟ್ಟಿಯನ್ನು ಕೆಳಗೆ ನೀಡಲಾಗಿದೆ.",
    ta: "🔍 மருத்துவமனை / கிளினிக் தேடல்: உங்களுக்கு அருகிலுள்ள அரசு மருத்துவமனைகள், ஆரம்ப சுகாதார நிலையங்கள் மற்றும் மக்கள் மருந்தகங்கள் கீழே வரிசைப்படுத்தப்பட்டுள்ளன.",
    te: "🔍 ఆసుపత్రి / క్లినిక్ వెతుకులాట: సమీపంలోని ప్రభుత్వ ఆసుపత్రులు, ప్రాథమిక ఆరోగ్య కేంద్రాలు మరియు జన్ ఔషధి కేంద్రాల జాబితా కింద చూపించబడింది.",
    mr: "🔍 रुग्णालय / दवाखाना शोध: तुमच्या जवळील सरकारी रुग्णालये, सामुदायिक आरोग्य केंद्र आणि जन औषधी केंद्रांची यादी खाली दिली आहे."
  },
  CHECK_SCHEME: {
    en: "💳 Scheme Eligibility: Checking your eligibility for Ayushman Bharat (PM-JAY), state insurance schemes, or senior citizen benefits. Please fill in the eligibility details below.",
    hi: "💳 योजना पात्रता: आयुष्मान भारत (PM-JAY), राज्य स्वास्थ्य बीमा या वरिष्ठ नागरिक स्वास्थ्य लाभों की पात्रता जांचने के लिए कृपया नीचे दिए गए कैलकुलेटर का उपयोग करें।",
    kn: "💳 ಯೋಜನೆಯ ಅರ್ಹತೆ: ಆಯುಷ್ಮಾನ್ ಭಾರತ್ (PM-JAY), ರಾಜ್ಯ ಆರೋಗ್ಯ ಯೋಜನೆಗಳು ಅಥವಾ ಹಿರिय ನಾಗರಿಕರ ಅರ್ಹತೆಯನ್ನು ಕೆಳಗೆ ಪರಿಶೀಲಿಸಿ.",
    ta: "💳 திட்ட தகுதி: ஆயுஷ்மான் பாரத் (PM-JAY), மாநில காப்பீட்டுத் திட்டங்கள் அல்லது முதியோர்களுக்கான திட்ட தகுதியை கீழே சரிபார்க்கவும்.",
    te: "💳 పథకాల అర్హత: ఆయుష్మాన్ భారత్ (PM-JAY), రాష్ట్ర భీమా పథకాలు లేదా వృద్ధుల ఆరోగ్య పథకాల అర్హతను కింద తనిఖీ చేయండి.",
    mr: "💳 योजना पात्रता: आयुष्मान भारत (PM-JAY), राज्य विमा योजना किंवा ज्येष्ठ नागरिकांच्या योजनांची पात्रता खाली तपासा."
  },
  DOCUMENT_REQUIREMENTS: {
    en: "📄 Documents Checklist: To apply for public health schemes, you typically need an Aadhaar card, Ration card (BPL/EWS), and Income proof. A detailed checklist is loaded below.",
    hi: "📄 जरूरी दस्तावेज़ सूची: सरकारी स्वास्थ्य योजनाओं के लिए आमतौर पर आधार कार्ड, राशन कार्ड (BPL/EWS) और आय प्रमाण पत्र की आवश्यकता होती है। पूरी सूची नीचे दी गई है।",
    kn: "📄 ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಸರ್ಕಾರಿ ಆರೋಗ್ಯ ಯೋಜನೆಗಳಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಆಧಾರ್ ಕಾರ್ಡ್, ರೇಷನ್ ಕಾರ್ಡ್ ಮತ್ತು ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ ಬೇಕಾಗುತ್ತದೆ. ಪಟ್ಟಿ ಇಲ್ಲಿದೆ.",
    ta: "📄 ஆவணங்கள் சரிபார்ப்பு: அரசு காப்பீட்டு திட்டங்களுக்கு விண்ணப்பிக்க ஆதார் அட்டை, ரேஷன் கார்டு மற்றும் வருமான சான்றிதழ் தேவை. பட்டியல் கீழே உள்ளது.",
    te: "📄 కావలసిన పత్రాలు: ప్రభుత్వ ఆరోగ్య పథకాలకు దరఖాస్తు చేసుకోవడానికి ఆధార్ కార్డ్, రేషన్ కార్డ్ మరియు ఆదాయ ధృవీకరణ పత్రం అవసరం. జాబితా కింద ఉంది.",
    mr: "📄 आवश्यक कागदपत्रे: सार्वजनिक आरोग्य योजनांसाठी आधार कार्ड, रेशन कार्ड आणि उत्पन्नाचा दाखला आवश्यक आहे. यादी खाली लोड केली आहे."
  },
  HUMAN_SUPPORT: {
    en: "👩‍⚕️ ASHA Worker / Volunteer Support: Connecting you with a community health helper. You can submit a callback or guidance request using the form below.",
    hi: "👩‍⚕️ आशा कार्यकर्ता / स्वयंसेवक संपर्क: आपको स्थानीय स्वास्थ्य सहायक से जोड़ने के लिए सहायता अनुरोध फॉर्म नीचे दिया गया है।",
    kn: "👩‍⚕️ ಆಶಾ ಕಾರ್ಯಕರ್ತೆ / ಸ್ವಯಂಸೇವಕರ ನೆರವು: ನಿಮ್ಮನ್ನು ಸ್ಥಳೀಯ ಆರೋಗ್ಯ ಕಾರ್ಯಕರ್ತರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸಲು ಸಹಾಯ ವಿನಂತಿ ಫಾರಂ ಕೆಳगे ಲಭ್ಯವಿದೆ.",
    ta: "👩‍⚕️ ஆஷா பணியாளர் / தன்னார்வலர் உதவி: உள்ளூர் சுகாதார உதவியாளரைத் தொடர்பு கொள்ள கீழே உள்ள படிவத்தைப் பயன்படுத்தவும்.",
    te: "👩‍⚕️ ఆశా వర్కర్ / వాలంటీర్ సహాయం: స్థానిక ఆరోగ్య కార్యకర్తను సంప్రదించడానికి సహాయ అభ్యర్థన ఫారమ్ కింద ఇవ్వబడింది.",
    mr: "👩‍⚕️ आशा स्वयंसेविका मदत: तुमच्या जवळील आशा आरोग्य सेविका किंवा स्वयंसेवकांशी जोडण्यासाठी मदत फॉर्म खाली दिला आहे."
  },
  FOLLOW_UP: {
    en: "🔔 Health Follow-up & Reminders: Set reminders for doctor visits, medicine refills, or review referral receipts. Access the reminders dashboard below.",
    hi: "🔔 फॉलो-अप और रिमाइंडर्स: डॉक्टर के पास जाने या दवाइयों के लिए रिमाइंडर सेट करें। रिमाइंडर्स डैशबोर्ड नीचे खुल गया है।",
    kn: "🔔 ಫಾಲೋ-ಅಪ್ ಮತ್ತು ಜ್ಞಾಪನೆಗಳು: ವೈದ್ಯರ ಭೇಟಿ ಅಥವಾ ಔಷಧಿ ಮರುಖರೀದಿಗೆ ಜ್ಞಾಪನೆಗಳನ್ನು ಹೊಂದಿಸಿ. ಜ್ಞಾಪನೆಗಳ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಕೆಳಗೆ ಇದೆ.",
    ta: "🔔 நினைவூட்டல்கள்: மருத்துவமனைக்கு செல்ல அல்லது மருந்துகளை மீண்டும் வாங்க அலாரம்களை அமைக்கவும். நினைவூட்டல் தளம் கீழே உள்ளது.",
    te: "🔔 ఫాలో-అప్ & రిమైండర్లు: డాక్టర్ అపాయింట్‌మెంట్లు లేదా మందుల అలారమ్స్ సెట్ చేయండి. రిమైండర్ల బోర్డు కింద ఉంది.",
    mr: "🔔 फॉलो-अप आणि स्मरणपत्रे: डॉक्टरांची भेट किंवा औषध स्मरणपत्रे सेट करा. स्मरणपत्र फलक खाली दिला आहे."
  },
  UNKNOWN: {
    en: "❓ Query not fully understood: I can help you locate public hospitals, calculate scheme eligibility, list documents, or contact an ASHA worker. Please use the choices below.",
    hi: "❓ प्रश्न स्पष्ट नहीं हुआ: मैं अस्पताल ढूंढने, योजना जांचने या आशा कार्यकर्ता से संपर्क करने में आपकी मदद कर सकता हूं। नीचे से विकल्प चुनें।",
    kn: "❓ ಪ್ರಶ್ನೆ ಅರ್ಥವಾಗಲಿಲ್ಲ: ಆಸ್ಪತ್ರೆ ಹುಡುಕಲು ಅಥವಾ ಆಶಾ ಕಾರ್ಯಕರ್ತರನ್ನು ಸಂಪರ್ಕಿಸಲು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಕೆಳಗಿನ ಮೆನುವಿನಿಂದ ಆಯ್ಕೆಮಾಡಿ.",
    ta: "❓ கேள்வி புரியவில்லை: மருத்துவமனை கண்டறிய அல்லது ஆஷா பணியாளரைத் தொடர்பு கொள்ள உதவ முடியும். கீழே உள்ள மெனுவை பயன்படுத்தவும்.",
    te: "❓ మీ ప్రశ్న అర్థం కాలేదు: ఆసుపత్రులు వెతకడానికి లేదా ఆశా వర్కర్ సహాయం పొందడానికి సహాయం చేయగలను. కింద ఉన్న ఆప్షన్లను ఎంచుకోండి.",
    mr: "❓ प्रश्न स्पष्ट झाला नाही: मी रुग्णालय शोधणे किंवा आशा स्वयंसेविकेशी संपर्क साधण्यात मदत करू शकतो. खालील पर्याय निवडा."
  }
};

export const VoiceTextInterface: React.FC<VoiceTextInterfaceProps> = ({ initialQuery, onSelectIntent }) => {
  const { language, t } = useLanguage();
  const [inputText, setInputText] = useState(initialQuery || '');
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [activeIntent, setActiveIntent] = useState<IntentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [aiFeedbackText, setAiFeedbackText] = useState('');

  // Use refs to avoid stale closures in speech recognition callback handlers
  const transcriptRef = useRef('');
  const processedRef = useRef(false);

  useEffect(() => {
    if (initialQuery) {
      handleProcessQuery(initialQuery);
    }
  }, [initialQuery]);

  // Handle classification, navigation changes, and speaking response
  const handleProcessQuery = (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    processedRef.current = true;
    setErrorMessage('');
    
    const intentResult = classifyIntent(textToProcess, language);
    setActiveIntent(intentResult);

    // Get premium natural language response text
    const category = intentResult.category;
    let feedback = "";
    if (intentResult.directResponseKey) {
      feedback = intentResult.directResponseKey;
    } else if (AI_RESPONSES[category]) {
      feedback = AI_RESPONSES[category][language] || AI_RESPONSES[category]['en'];
    } else {
      feedback = `${t.systemUnderstanding} ${category}`;
    }

    setAiFeedbackText(feedback);

    // Speak response out loud using native matched TTS voices
    if (ttsService.isSupported()) {
      ttsService.speak(feedback, language);
    }

    // Trigger parent callback to route user to correct sub-view
    onSelectIntent(intentResult);
  };

  const toggleListening = () => {
    if (isListening) {
      sttService.stop();
      setIsListening(false);
    } else {
      setErrorMessage('');
      setTranscription('');
      transcriptRef.current = '';
      processedRef.current = false;
      setActiveIntent(null);
      setAiFeedbackText('');

      const started = sttService.start(language, {
        onResult: (text, isFinal) => {
          setTranscription(text);
          setInputText(text);
          transcriptRef.current = text;
          if (isFinal) {
            setIsListening(false);
            handleProcessQuery(text);
          }
        },
        onError: (err) => {
          // If no-speech is triggered and user already had typed something, try processing it
          if (err === 'no-speech' && transcriptRef.current) {
            handleProcessQuery(transcriptRef.current);
          } else {
            setErrorMessage(err === 'not-allowed' ? 'Microphone permission blocked. Please enable it in browser settings.' : `Voice input error: ${err}`);
          }
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
          // If speech recognition ended and we have a transcript but never processed it, process it now
          if (transcriptRef.current && !processedRef.current) {
            handleProcessQuery(transcriptRef.current);
          }
        }
      });
      if (started) setIsListening(true);
    }
  };

  const handleSpeakResponse = () => {
    if (aiFeedbackText && ttsService.isSupported()) {
      ttsService.speak(aiFeedbackText, language);
    }
  };

  // Icon mapping for premium visual experience
  const getIntentIcon = (cat: string) => {
    switch (cat) {
      case 'EMERGENCY': return <ShieldAlert size={20} style={{ color: 'var(--emergency)' }} />;
      case 'FIND_FACILITY': return <Building2 size={20} style={{ color: 'var(--primary)' }} />;
      case 'CHECK_SCHEME': return <Award size={20} style={{ color: 'var(--accent)' }} />;
      case 'DOCUMENT_REQUIREMENTS': return <FileText size={20} style={{ color: 'var(--primary)' }} />;
      case 'HUMAN_SUPPORT': return <HeartHandshake size={20} style={{ color: 'var(--success)' }} />;
      case 'FOLLOW_UP': return <Bell size={20} style={{ color: 'var(--primary)' }} />;
      default: return <HelpCircle size={20} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  return (
    <div className="card-glass animate-fade-in-up" style={{ marginBottom: '20px' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Sparkles size={22} className="animate-pulse" /> {t.speakToAssistant}
        </h3>
        <span className="badge badge-teal" style={{ padding: '6px 12px', fontWeight: 600 }}>Multilingual Voice AI</span>
      </div>

      {/* Voice Assistant Interaction Area */}
      <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px dashed var(--border)', textAlign: 'center', marginBottom: '20px' }}>
        
        {/* Dynamic Voice Waveform Animation when listening */}
        {isListening ? (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', height: '40px', marginBottom: '16px' }}>
            <span className="voice-bar" style={{ animationDelay: '0.1s' }}></span>
            <span className="voice-bar" style={{ animationDelay: '0.3s' }}></span>
            <span className="voice-bar" style={{ animationDelay: '0.5s' }}></span>
            <span className="voice-bar" style={{ animationDelay: '0.2s' }}></span>
            <span className="voice-bar" style={{ animationDelay: '0.4s' }}></span>
          </div>
        ) : (
          <div style={{ height: '40px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tap mic to speak to Sehat Setu</span>
          </div>
        )}

        {/* Floating Pulsing Mic Button */}
        <button 
          onClick={toggleListening}
          className={isListening ? 'mic-pulse-ring' : ''}
          style={{
            width: '92px',
            height: '92px',
            borderRadius: '50%',
            background: isListening ? 'linear-gradient(135deg, var(--emergency) 0%, #991b1b 100%)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            cursor: 'pointer',
            border: 'none',
            boxShadow: isListening ? '0 8px 24px rgba(220, 38, 38, 0.3)' : '0 8px 24px var(--primary-glow)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          title={isListening ? 'Stop Listening' : 'Start Listening'}
        >
          {isListening ? <MicOff size={40} className="animate-pulse" /> : <Mic size={40} />}
        </button>
        
        <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: isListening ? 'var(--emergency)' : 'var(--text-primary)', margin: 0 }}>
          {isListening ? t.listening : t.voicePrompt}
        </h4>
      </div>

      {/* Styled Voice Transcript Box */}
      {transcription && (
        <div className="animate-fade-in" style={{ background: 'var(--primary-light)', borderLeft: '4px solid var(--primary)', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>{t.youSaid}</p>
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
            "{transcription}"
          </p>
        </div>
      )}

      {/* Manual text backup form */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleProcessQuery(inputText); }} 
        style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}
      >
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your query (e.g. सरकारी अस्पताल, Ayushman eligibility, help)"
          className="form-input"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 24px', minHeight: '48px' }}>
          <Send size={18} />
        </button>
      </form>

      {/* Error Message details */}
      {errorMessage && (
        <div style={{ color: 'var(--emergency)', background: 'var(--emergency-bg)', border: '1.5px solid var(--emergency)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginTop: '16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> <span>{errorMessage}</span>
        </div>
      )}

      {/* AI Intent Result Presentation Card */}
      {activeIntent && aiFeedbackText && (
        <div 
          className="animate-fade-in-up"
          style={{
            marginTop: '20px',
            padding: '20px',
            background: activeIntent.isEmergency ? 'var(--emergency-bg)' : 'var(--bg-subtle)',
            border: `1.5px solid ${activeIntent.isEmergency ? 'var(--emergency)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span className={`badge ${activeIntent.isEmergency ? 'badge-emergency' : 'badge-teal'}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '6px 14px' }}>
              {getIntentIcon(activeIntent.category)}
              <span>{t.systemUnderstanding}: {activeIntent.category.replace(/_/g, ' ')}</span>
            </span>
            
            <button 
              onClick={handleSpeakResponse}
              className="btn btn-outline"
              style={{ padding: '4px 14px', fontSize: '0.8rem', minHeight: '32px', borderRadius: 'var(--radius-sm)' }}
            >
              <Volume2 size={16} /> Read Response Out Loud
            </button>
          </div>

          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', lineHeight: '1.5' }}>
            {aiFeedbackText}
          </p>
        </div>
      )}

      {/* Adding support for voice bars styles inside the component */}
      <style>{`
        .voice-bar {
          display: inline-block;
          width: 5px;
          height: 10px;
          background-color: var(--primary);
          border-radius: 3px;
          animation: wave 1.2s ease-in-out infinite;
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(3); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
