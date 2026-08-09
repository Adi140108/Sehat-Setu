import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { classifyIntent } from '../../services/ai/intentClassifier';
import { sttService } from '../../services/voice/speechToText';
import { ttsService } from '../../services/voice/textToSpeech';
import type { IntentResult } from '../../types';
import { Mic, MicOff, Send, Volume2, AlertCircle, Sparkles } from 'lucide-react';

interface VoiceTextInterfaceProps {
  initialQuery?: string;
  onSelectIntent: (intentResult: IntentResult) => void;
}

export const VoiceTextInterface: React.FC<VoiceTextInterfaceProps> = ({ initialQuery, onSelectIntent }) => {
  const { language, t } = useLanguage();
  const [inputText, setInputText] = useState(initialQuery || '');
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [activeIntent, setActiveIntent] = useState<IntentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialQuery) {
      handleProcessQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleProcessQuery = (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    setErrorMessage('');
    const intentResult = classifyIntent(textToProcess, language);
    setActiveIntent(intentResult);
    onSelectIntent(intentResult);

    // Speak response out loud using TTS if supported
    let speechText = "";
    if (intentResult.isEmergency) {
      speechText = t.emergencySubtitle;
    } else if (intentResult.directResponseKey) {
      speechText = intentResult.directResponseKey;
    } else if (intentResult.category === 'FIND_FACILITY') {
      speechText = t.facilityFound;
    } else if (intentResult.category === 'CHECK_SCHEME') {
      speechText = t.preliminaryEligibility;
    } else {
      speechText = t.systemUnderstanding + " " + intentResult.category;
    }

    if (ttsService.isSupported()) {
      ttsService.speak(speechText, language);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      sttService.stop();
      setIsListening(false);
    } else {
      setErrorMessage('');
      const started = sttService.start(language, {
        onResult: (text, isFinal) => {
          setTranscription(text);
          setInputText(text);
          if (isFinal) {
            setIsListening(false);
            handleProcessQuery(text);
          }
        },
        onError: (err) => {
          setErrorMessage(err);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        }
      });
      if (started) setIsListening(true);
    }
  };

  const handleSpeakResponse = () => {
    if (activeIntent && ttsService.isSupported()) {
      const textToSay = activeIntent.directResponseKey || `${t.systemUnderstanding} ${activeIntent.category}`;
      ttsService.speak(textToSay, language);
    }
  };

  return (
    <div className="card-glass" style={{ marginBottom: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} /> {t.speakToAssistant}
        </h3>
        <span className="badge badge-teal">Multilingual Voice AI</span>
      </div>

      {/* Big Mic Button & Visualizer */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <div 
          onClick={toggleListening}
          className={isListening ? 'mic-pulse-ring' : ''}
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: isListening ? 'var(--emergency-red)' : 'var(--primary-teal)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            transition: 'transform 0.2s ease'
          }}
        >
          {isListening ? <MicOff size={38} /> : <Mic size={38} />}
        </div>
        
        <p style={{ fontWeight: 600, fontSize: '0.95rem', color: isListening ? 'var(--emergency-red)' : 'var(--text-main)' }}>
          {isListening ? t.listening : t.voicePrompt}
        </p>
      </div>

      {/* Voice Transcript Box */}
      {transcription && (
        <div style={{ background: 'var(--primary-light)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-teal)' }}>{t.youSaid}</p>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', fontStyle: 'italic' }}>"{transcription}"</p>
        </div>
      )}

      {/* Text Input Row */}
      <form onSubmit={(e) => { e.preventDefault(); handleProcessQuery(inputText); }} style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g. Paas mein sarkari hospital, Ayushman scheme rules, or ask for help..."
          className="form-input"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>
          <Send size={18} />
        </button>
      </form>

      {/* Error Message if STT fails */}
      {errorMessage && (
        <p style={{ color: 'var(--emergency-red)', fontSize: '0.85rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={14} /> {errorMessage}
        </p>
      )}

      {/* AI Intent Result Card */}
      {activeIntent && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: activeIntent.isEmergency ? 'var(--emergency-bg)' : 'var(--bg-surface)',
          border: `1px solid ${activeIntent.isEmergency ? 'var(--emergency-red)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className={`badge ${activeIntent.isEmergency ? 'badge-emergency' : 'badge-teal'}`}>
              {t.systemUnderstanding} {activeIntent.category}
            </span>
            
            <button 
              onClick={handleSpeakResponse}
              className="btn btn-outline"
              style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: '28px' }}
            >
              <Volume2 size={14} /> Read Aloud
            </button>
          </div>

          {activeIntent.directResponseKey && (
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '8px' }}>
              {activeIntent.directResponseKey}
            </p>
          )}
        </div>
      )}

    </div>
  );
};
