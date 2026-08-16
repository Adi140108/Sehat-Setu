import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { classifyIntent } from '../../services/ai/intentClassifier';
import { sttService } from '../../services/voice/speechToText';
import { ttsService } from '../../services/voice/textToSpeech';
import { analyticsService } from '../../services/analytics/analyticsService';
import type { IntentResult } from '../../types';
import { 
  Send, 
  Volume2, 
  AlertCircle, 
  Sparkles, 
  HelpCircle, 
  ShieldAlert, 
  Award, 
  FileText, 
  HeartHandshake, 
  Bell, 
  Building2,
  ArrowRight
} from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';

interface VoiceTextInterfaceProps {
  initialQuery?: string;
  onSelectIntent: (intentResult: IntentResult) => void;
}

const AI_RESPONSES: Record<string, Record<string, string>> = {
  EMERGENCY: {
    en: "⚠️ Medical Emergency detected! Please seek medical help immediately. Call 108 or proceed to the nearest hospital. I have activated the Emergency assistance console.",
    hi: "⚠️ आपातकालीन चिकित्सा स्थिति! कृपया तुरंत चिकित्सकीय सहायता लें। 108 पर कॉल करें या नजदीकी अस्पताल जाएं। मैंने आपातकालीन सहायता सक्रिय कर दी है।",
    kn: "⚠️ ತುರ್ತು ವೈದ್ಯಕೀಯ ಪರಿಸ್ಥಿತಿ ಪತ್ತೆಯಾಗಿದೆ! ದಯವಿಟ್ಟು ತಕ್ಷಣವೇ ವೈದ್ಯಕೀಯ ನೆರವು ಪಡೆಯಿರಿ. 108 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ."
  },
  FIND_FACILITY: {
    en: "🔍 Hospital / Clinic Locator: Finding nearby public hospitals, Community Health Centres (CHCs), and Jan Aushadhi generic pharmacies. The nearest verified locations are listed below.",
    hi: "🔍 अस्पताल / क्लिनिक खोज: आपके निकटतम सरकारी अस्पताल, सामुदायिक स्वास्थ्य केंद्र (CHC), और जन औषधि केंद्रों की सूची नीचे लोड कर दी गई है।",
    kn: "🔍 ಆಸ್ಪತ್ರೆ / ಕ್ಲಿನಿಕ್ ಹುಡುಕಾಟ: ಹತ್ತಿರದ ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆಗಳು, ಸಮುದಾಯ ಆರೋಗ್ಯ ಕೇಂದ್ರಗಳು ಮತ್ತು ಜನೌಷಧಿ ಔಷಧಾಲಯಗಳ ಪಟ್ಟಿಯನ್ನು ಕೆಳಗೆ ನೀಡಲಾಗಿದೆ."
  },
  CHECK_SCHEME: {
    en: "💳 Scheme Eligibility: Checking your eligibility for Ayushman Bharat (PM-JAY), state insurance schemes, or senior citizen benefits. Please fill in the eligibility details below.",
    hi: "💳 योजना पात्रता: आयुष्मान भारत (PM-JAY), राज्य स्वास्थ्य बीमा या वरिष्ठ नागरिक स्वास्थ्य लाभों की पात्रता जांचने के लिए कृपया नीचे दिए गए कैलकुलेटर का उपयोग करें।",
    kn: "💳 ಯೋಜನೆಯ ಅರ್ಹತೆ: ಆಯುಷ್ಮಾನ್ ಭಾರತ್ (PM-JAY), ರಾಜ್ಯ ಆರೋಗ್ಯ ಯೋಜನೆಗಳು ಅಥವಾ ಹಿರಿಯ ನಾಗರಿಕರ ಅರ್ಹತೆಯನ್ನು ಕೆಳಗೆ ಪರಿಶೀಲಿಸಿ."
  },
  DOCUMENT_REQUIREMENTS: {
    en: "📄 Documents Checklist: To apply for public health schemes, you typically need an Aadhaar card, Ration card (BPL/EWS), and Income proof. A detailed checklist is loaded below.",
    hi: "📄 जरूरी दस्तावेज़ सूची: सरकारी स्वास्थ्य योजनाओं के लिए आमतौर पर आधार कार्ड, राशन कार्ड (BPL/EWS) और आय प्रमाण पत्र की आवश्यकता होती है। पूरी सूची नीचे दी गई है।",
    kn: "📄 ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಸರ್ಕಾರಿ ಆರೋಗ್ಯ ಯೋಜನೆಗಳಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಆಧಾರ್ ಕಾರ್ಡ್, ರೇಷನ್ ಕಾರ್ಡ್ ಮತ್ತು ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ ಬೇಕಾಗುತ್ತದೆ. ಪಟ್ಟಿ ಇಲ್ಲಿದೆ."
  },
  HUMAN_SUPPORT: {
    en: "👩‍⚕️ ASHA Worker / Volunteer Support: Connecting you with a community health helper. You can submit a callback or guidance request using the form below.",
    hi: "👩‍⚕️ आशा कार्यकर्ता / स्वयंसेवक संपर्क: आपको स्थानीय स्वास्थ्य सहायक से जोड़ने के लिए सहायता अनुरोध फॉर्म नीचे दिया गया है।",
    kn: "👩‍⚕️ ಆಶಾ ಕಾರ್ಯಕರ್ತೆ / ಸ್ವಯಂಸೇವಕರ ನೆರವು: ನಿಮ್ಮನ್ನು ಸ್ಥಳೀಯ ಆರೋಗ್ಯ ಕಾರ್ಯಕರ್ತರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸಲು ಸಹಾಯ ವಿನಂತಿ ಫಾರಂ ಕೆಳಗೆ ಲಭ್ಯವಿದೆ."
  },
  FOLLOW_UP: {
    en: "🔔 Health Follow-up & Reminders: Set reminders for doctor visits, medicine refills, or review referral receipts. Access the reminders dashboard below.",
    hi: "🔔 फॉलो-अप और रिमाइंडर्स: डॉक्टर के पास जाने या दवाइयों के लिए रिमाइंडर सेट करें। रिमाइंडर्स डैशबोर्ड नीचे खुल गया है।",
    kn: "🔔 ಫಾಲೋ-ಅಪ್ ಮತ್ತು ಜ್ಞಾಪನೆಗಳು: ವೈದ್ಯರ ಭೇಟಿ ಅಥವಾ ಔಷಧಿ ಮರುಖರೀದಿಗೆ ಜ್ಞಾಪನೆಗಳನ್ನು ಹೊಂದಿಸಿ. ಜ್ಞಾಪನೆಗಳ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಕೆಳಗೆ ಇದೆ."
  },
  UNKNOWN: {
    en: "❓ Query not fully understood: I can help you locate public hospitals, calculate scheme eligibility, list documents, or contact an ASHA worker. Please use the choices below.",
    hi: "❓ प्रश्न स्पष्ट नहीं हुआ: मैं अस्पताल ढूंढने, योजना जांचने या आशा कार्यकर्ता से संपर्क करने में आपकी मदद कर सकता हूं। नीचे से विकल्प चुनें।",
    kn: "❓ ಪ್ರಶ್ನೆ ಅರ್ಥವಾಗಲಿಲ್ಲ: ಆಸ್ಪತ್ರೆ ಹುಡುಕಲು ಅಥವಾ ಆಶಾ ಕಾರ್ಯಕರ್ತರನ್ನು ಸಂಪರ್ಕಿಸಲು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಕೆಳಗಿನ ಮೆನುವಿನಿಂದ ಆಯ್ಕೆಮಾಡಿ."
  }
};

export const VoiceTextInterface: React.FC<VoiceTextInterfaceProps> = ({ initialQuery, onSelectIntent }) => {
  const { language, t } = useLanguage();
  const [inputText, setInputText] = useState(initialQuery || '');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [activeIntent, setActiveIntent] = useState<IntentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [aiFeedbackText, setAiFeedbackText] = useState('');

  const transcriptRef = useRef('');
  const processedRef = useRef(false);

  useEffect(() => {
    if (initialQuery) {
      handleProcessQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleProcessQuery = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    processedRef.current = true;
    setErrorMessage('');
    setIsLoading(true);

    // Track stage 1: REQUEST_STARTED
    analyticsService.trackEvent('REQUEST_STARTED', { textLength: textToProcess.length, language });

    try {
      const intentResult = await classifyIntent(textToProcess, language);
      setActiveIntent(intentResult);

      // Track stage 2: INTENT_UNDERSTOOD
      analyticsService.trackEvent('INTENT_UNDERSTOOD', { intent: intentResult.category, confidence: intentResult.confidence });
      if (intentResult.requiresClarification) {
        analyticsService.trackEvent('INTENT_CLARIFICATION', { intent: intentResult.category });
      }

      const category = intentResult.category;
      let feedback = "";
      
      const langKey = language as string;
      if (AI_RESPONSES[category]) {
        feedback = AI_RESPONSES[category][langKey] || AI_RESPONSES[category]['en'] || '';
      } else if (intentResult.directResponseKey) {
        feedback = intentResult.directResponseKey;
      } else {
        feedback = `${t.systemUnderstanding || 'Understanding intent:'} ${category}`;
      }

      setAiFeedbackText(feedback);

      // Auto TTS readout for high accessibilities
      if (ttsService.isSupported()) {
        ttsService.speak(feedback, language);
      }
    } catch (err) {
      setErrorMessage("Failed to process your request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Callback from native browser Web Speech API fallback
  const toggleListening = () => {
    if (isListening) {
      sttService.stop();
      setIsListening(false);
      analyticsService.trackEvent('VOICE_COMPLETED', { language });
    } else {
      setErrorMessage('');
      setTranscription('');
      transcriptRef.current = '';
      processedRef.current = false;
      setActiveIntent(null);
      setAiFeedbackText('');

      analyticsService.trackEvent('VOICE_STARTED', { language });

      const started = sttService.start(language, {
        onResult: (text, isFinal) => {
          setTranscription(text);
          setInputText(text);
          transcriptRef.current = text;
          if (isFinal) {
            setIsListening(false);
            analyticsService.trackEvent('TRANSCRIPTION_SUCCESS', { textLength: text.length, language });
            handleProcessQuery(text);
          }
        },
        onError: (err) => {
          if (err === 'no-speech' && transcriptRef.current) {
            analyticsService.trackEvent('TRANSCRIPTION_SUCCESS', { textLength: transcriptRef.current.length, language });
            handleProcessQuery(transcriptRef.current);
          } else {
            setErrorMessage(err === 'not-allowed' ? 'Microphone permission blocked.' : "Sorry, I couldn't understand that.");
            analyticsService.trackEvent('TRANSCRIPTION_FAILED', { error: err, language });
          }
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
          if (transcriptRef.current && !processedRef.current) {
            handleProcessQuery(transcriptRef.current);
          }
        }
      });
      if (started) setIsListening(true);
    }
  };

  // Callback from VoiceRecorder WebM Audio Yield
  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsLoading(true);
    setErrorMessage('');
    setActiveIntent(null);
    setTranscription('');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('languageHint', language);

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.transcript) {
          setTranscription(data.transcript);
          setInputText(data.transcript);
          transcriptRef.current = data.transcript;
          await handleProcessQuery(data.transcript);
        } else {
          throw new Error('Empty transcript.');
        }
      } else {
        throw new Error('Transcription API error.');
      }
    } catch (err) {
      console.warn('Backend transcribing failed, using Web Speech ASR fallback:', err);
      setErrorMessage('Local backend offline. Activating browser speech-recognition fallback...');
      toggleListening();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextFallback = (errorMsg: string) => {
    setErrorMessage(errorMsg);
  };

  const handleSpeakResponse = () => {
    if (aiFeedbackText && ttsService.isSupported()) {
      ttsService.speak(aiFeedbackText, language);
    }
  };

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
          <Sparkles size={22} className="animate-pulse" /> {t.speakToAssistant || 'Speak to Assistant'}
        </h3>
        <span className="badge badge-teal" style={{ padding: '6px 12px', fontWeight: 600 }}>Multilingual Voice AI</span>
      </div>

      {/* Voice Assistant Interaction Area (VoiceRecorder Integration) */}
      <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', padding: '28px', border: '1px dashed var(--border)', textAlign: 'center', marginBottom: '20px' }}>
        
        {/* Pulsing Visual Waveform Fallback when Native recognition is active */}
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tap mic and speak in Kannada, English, or Hindi</span>
          </div>
        )}

        <VoiceRecorder onAudioReady={handleAudioUpload} onTextFallbackRequired={handleTextFallback} isLoading={isLoading} />
      </div>

      {/* Styled Voice Transcript Box */}
      {transcription && (
        <div className="animate-fade-in" style={{ background: 'var(--primary-light)', borderLeft: '4px solid var(--primary)', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>{t.youSaid || 'You Said'}</p>
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
          placeholder="Type or edit transcript (e.g. सरकारी अस्पताल, Ayushman eligibility)"
          className="form-input"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 24px', minHeight: '48px' }} disabled={isLoading}>
          <Send size={18} />
        </button>
      </form>

      {/* Error Message details */}
      {errorMessage && (
        <div className="animate-fade-in" style={{ marginTop: '16px' }}>
          <div style={{ color: 'var(--emergency)', background: 'var(--emergency-bg)', border: '1.5px solid var(--emergency)', padding: '14px 18px', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} /> <span>{errorMessage}</span>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setErrorMessage('');
                  toggleListening();
                }} 
                className="btn btn-primary" 
                style={{ padding: '4px 12px', minHeight: '32px', fontSize: '0.78rem', textTransform: 'none' }}
              >
                🔄 Try Again
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setErrorMessage('');
                  const inputEl = document.querySelector('input[placeholder*="Type or edit"]') as HTMLInputElement;
                  inputEl?.focus();
                }} 
                className="btn btn-outline" 
                style={{ padding: '4px 12px', minHeight: '32px', fontSize: '0.78rem', background: '#fff', textTransform: 'none' }}
              >
                ⌨️ Type Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Intent Result Presentation Card */}
      {activeIntent && (
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
          {activeIntent.requiresClarification ? (
            <div>
              <p style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.825rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HelpCircle size={15} /> Intent unclear. What are you looking for?
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '16px', marginTop: '12px' }}>
                {[
                  { label: '🏥 Government Hospital', category: 'FIND_FACILITY' },
                  { label: '💳 PM-JAY Empanelled Hospital', category: 'CHECK_SCHEME' },
                  { label: '⚕️ Primary Health Centre (PHC)', category: 'FIND_FACILITY' },
                  { label: '🏪 Jan Aushadhi generic pharmacy', category: 'FIND_JANAUSHADHI_KENDRA' }
                ].map((clarOption) => (
                  <button
                    key={clarOption.label}
                    type="button"
                    onClick={() => {
                      const clarified: IntentResult = {
                        ...activeIntent,
                        category: clarOption.category as any,
                        requiresClarification: false,
                        confidence: 1.0
                      };
                      setActiveIntent(clarified);
                      onSelectIntent(clarified);
                    }}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', minHeight: '38px', textAlign: 'left', justifyContent: 'flex-start', background: '#fff', textTransform: 'none' }}
                  >
                    {clarOption.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span className={`badge ${activeIntent.isEmergency ? 'badge-emergency' : 'badge-teal'}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '6px 14px' }}>
                  {getIntentIcon(activeIntent.category)}
                  <span>{t.systemUnderstanding || 'Understanding'}: {activeIntent.category.replace(/_/g, ' ')}</span>
                </span>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  {aiFeedbackText && (
                    <button 
                      onClick={handleSpeakResponse}
                      className="btn btn-outline"
                      style={{ padding: '4px 14px', fontSize: '0.8rem', minHeight: '32px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Volume2 size={15} /> Listen
                    </button>
                  )}

                  <button 
                    onClick={() => onSelectIntent(activeIntent)}
                    className="btn btn-primary animate-pulse"
                    style={{ padding: '4px 14px', fontSize: '0.8rem', minHeight: '32px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {aiFeedbackText && (
                <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', lineHeight: '1.5' }}>
                  {aiFeedbackText}
                </p>
              )}
            </>
          )}
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
      `}</style>
    </div>
  );
};
