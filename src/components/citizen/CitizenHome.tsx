import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { VoiceTextInterface } from './VoiceTextInterface';
import { FacilityLocator } from './FacilityLocator';
import { SchemeEligibilityEngine } from './SchemeEligibilityEngine';
import { EmergencyView } from './EmergencyView';
import { HumanHandoffModal } from './HumanHandoffModal';
import { FamilyProfileManager } from './FamilyProfileManager';
import { RemindersManager } from './RemindersManager';
import { PrivacyNotice } from '../common/PrivacyNotice';
import { searchFacilities } from '../../services/facilities/facilityService';
import type { IntentResult } from '../../types';
import { Mic, Building2, ShieldCheck, FileText, HeartHandshake, AlertTriangle, Users, Bell, Sparkles } from 'lucide-react';

interface CitizenHomeProps {
  initialDemoScenario?: 'HINDI_VOICE' | 'EMERGENCY' | 'SCHEME_CHECK' | 'HUMAN_SUPPORT';
  onAuthRequired?: () => void;
}

export const CitizenHome: React.FC<CitizenHomeProps> = ({ initialDemoScenario }) => {
  const { t, language } = useLanguage();
  const [activeView, setActiveView] = useState<'HOME' | 'VOICE' | 'FACILITIES' | 'SCHEMES' | 'EMERGENCY' | 'HUMAN' | 'FAMILY' | 'REMINDERS'>(() => {
    if (initialDemoScenario === 'EMERGENCY') return 'EMERGENCY';
    if (initialDemoScenario === 'SCHEME_CHECK') return 'SCHEMES';
    if (initialDemoScenario === 'HUMAN_SUPPORT') return 'HUMAN';
    if (initialDemoScenario === 'HINDI_VOICE') return 'VOICE';
    return 'HOME';
  });

  const localized = (key: string, defaultText: string) => {
    const dict: Record<string, Record<string, string>> = {
      welcomeHero: {
        en: "How can Sehat Setu help you today?",
        hi: "सेहत सेतु आज आपकी क्या मदद कर सकता है?",
        kn: "ಸೇಹತ್ ಸೇತು ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        te: "సేహತ್ సేతు ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        ta: "சேஹத் சேது ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        mr: "ಸೇಹತ್ ಸೇತು ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?"
      },
      welcomeSub: {
        en: "Select an option below, or tap Speak to search government health benefits in your regional language.",
        hi: "नीचे एक विकल्प चुनें, या अपनी क्षेत्रीय भाषा में बात करने के लिए बोलें बटन दबाएं।",
        kn: "ಕೆಳಗಿನ ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ, ಅಥವಾ ನಿಮ್ಮ ಪ್ರಾದೇಶಿಕ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಲು ಮೈಕ್ರೋಫೋನ್ ಒತ್ತಿ."
      },
      speakSub: {
        en: "Speak details in Hindi (हिन्दी), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), or English.",
        hi: "हिन्दी, कन्नड़, तमिल, तेलुगु, मराठी या अंग्रेजी में बोलें।",
        kn: "ಹಿಂದಿ, ಕನ್ನಡ, ತಮಿಳು, ತೆಲುಗು, ಮರಾಠಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ."
      },
      findFacilitySub: {
        en: "Locate nearby public hospitals, Community Health Centres, or Jan Aushadhi generic stores.",
        hi: "निकटतम सरकारी अस्पताल, सामुदायिक स्वास्थ्य केंद्र या जन औषधि जेनेरिक स्टोर का पता लगाएं।",
        kn: "ಸಮೀಪದ ಸಾರ್ವಜನಿಕ ಆಸ್ಪತ್ರೆಗಳು, ಸಮುದಾಯ ಆರೋಗ್ಯ ಕೇಂದ್ರಗಳು ಅಥವಾ ಜನೌಷಧಿ ಮಳಿಗೆಗಳನ್ನು ಪತ್ತೆ ಮಾಡಿ."
      },
      checkSchemesSub: {
        en: "Calculate eligibility metrics for Ayushman Bharat (PM-JAY), Ayushman 70+, or local state health cards.",
        hi: "आयुष्मान भारत (PM-JAY), आयुष्मान 70+, या स्थानीय स्वास्थ्य कार्डों के लिए पात्रता मापें।",
        kn: "ಆಯುಷ್ಮಾನ್ ಭಾರತ್ (PM-JAY), ಆಯುಷ್ಮಾನ್ 70+, ಅಥವಾ ಸ್ಥಳೀಯ ಆರೋಗ್ಯ ಕಾರ್ಡ್‌ಗಳ ಅರ್ಹತೆಯನ್ನು ಪರಿಶೀಲಿಸಿ."
      },
      requiredDocumentsSub: {
        en: "Confirm Aadhaar, Ration Cards, and other documents required to apply for free medical schemes.",
        hi: "मुफ्त चिकित्सा योजनाओं के लिए आधार, राशन कार्ड और अन्य आवश्यक दस्तावेजों की पुष्टि करें।",
        kn: "ಉಚಿತ ವೈದ್ಯಕೀಯ ಯೋಜನೆಗಳಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಅಗತ್ಯವಿರುವ ಆಧಾರ್, ಪಡಿತರ ಚೀಟಿ ಮತ್ತು ಇತರ ದಾಖಲೆಗಳನ್ನು ದೃಢೀಕರಿಸಿ."
      },
      talkToPersonSub: {
        en: "Send a support or guidance request directly to a local verified ASHA worker or volunteer in your area.",
        hi: "अपने क्षेत्र में एक स्थानीय सत्यापित आशा कार्यकर्ता या स्वयंसेवक को सीधे सहायता अनुरोध भेजें।",
        kn: "ನಿಮ್ಮ ಪ್ರದೇಶದ ಆಶಾ ಕಾರ್ಯಕರ್ತೆ ಅಥವಾ ಸ್ವಯಂಸೇವಕರಿಗೆ ನೇರವಾಗಿ ಬೆಂಬಲ ವಿನಂತಿಯನ್ನು ಕಳುಹಿಸಿ."
      },
      emergencySub: {
        en: "Get immediate ambulance dialing guidelines and directions to the closest 24x7 trauma care hospital.",
        hi: "तत्काल एम्बुलेंस सहायता और निकटतम 24x7 ट्रॉमा केयर अस्पताल के लिए निर्देश प्राप्त करें।",
        kn: "ತಕ್ಷಣದ ಆಂಬ್ಯುಲೆನ್ಸ್ ಸಹಾಯ ಮತ್ತು ಸಮೀಪದ 24x7 ತುರ್ತು ಚಿಕಿತ್ಸಾ ಕೇಂದ್ರದ ಮಾರ್ಗಸೂಚಿ ಪಡೆಯಿರಿ."
      },
      householdManager: {
        en: "Household Profile Manager",
        hi: "परिवार प्रोफ़ाइल प्रबंधक",
        kn: "ಕುಟುಂಬ ಪ್ರೊಫೈಲ್ ವ್ಯವಸ್ಥಾಪಕ"
      },
      reminders: {
        en: "Healthcare Follow-up Reminders",
        hi: "स्वास्थ्य अनुवर्ती रिमाइंडर्स",
        kn: "ಆರೋಗ್ಯ ತಪಾಸಣೆ ಜ್ಞಾಪನೆಗಳು"
      }
    };
    return dict[key]?.[language] || dict[key]?.['en'] || defaultText;
  };

  const voiceQueryText = initialDemoScenario === 'HINDI_VOICE' ? 'Mujhe paas mein sarkari hospital chahiye' : '';

  const emergencyFacilities = searchFacilities({ emergencyOnly: true });

  const handleIntentDetected = (intentResult: IntentResult) => {
    if (intentResult.isEmergency) {
      setActiveView('EMERGENCY');
    } else if (intentResult.category === 'FIND_FACILITY') {
      setActiveView('FACILITIES');
    } else if (intentResult.category === 'CHECK_SCHEME') {
      setActiveView('SCHEMES');
    } else if (intentResult.category === 'HUMAN_SUPPORT') {
      setActiveView('HUMAN');
    }
  };

  return (
    <div className="animate-fade-in">
      
      {/* Navigation Breadcrumb / Reset */}
      {activeView !== 'HOME' && (
        <div style={{ marginBottom: '16px' }}>
          <button 
            onClick={() => setActiveView('HOME')} 
            className="btn btn-outline"
            style={{ fontSize: '0.85rem', padding: '6px 16px', minHeight: '34px' }}
          >
            ← Back to Citizen Main Menu
          </button>
        </div>
      )}

      {/* EMERGENCY VIEW */}
      {activeView === 'EMERGENCY' && (
        <EmergencyView emergencyFacilities={emergencyFacilities} onBack={() => setActiveView('HOME')} />
      )}

      {/* VOICE ASSISTANT VIEW */}
      {activeView === 'VOICE' && (
        <div>
          <VoiceTextInterface initialQuery={voiceQueryText} onSelectIntent={handleIntentDetected} />
        </div>
      )}

      {/* FACILITY LOCATOR VIEW */}
      {activeView === 'FACILITIES' && (
        <FacilityLocator />
      )}

      {/* SCHEME ENGINE VIEW */}
      {activeView === 'SCHEMES' && (
        <SchemeEligibilityEngine />
      )}

      {/* HUMAN HANDOFF MODAL */}
      {activeView === 'HUMAN' && (
        <HumanHandoffModal onClose={() => setActiveView('HOME')} />
      )}

      {/* FAMILY PROFILE VIEW */}
      {activeView === 'FAMILY' && (
        <FamilyProfileManager />
      )}

      {/* REMINDERS VIEW */}
      {activeView === 'REMINDERS' && (
        <RemindersManager />
      )}

      {/* CITIZEN MAIN MENU HOME */}
      {activeView === 'HOME' && (
        <div className="animate-fade-in-up">
          
          {/* Welcome Prompt Hero Card */}
          <div style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--primary-light) 100%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '32px 24px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-md)',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Sparkles size={24} className="animate-pulse" /> {localized('welcomeHero', 'How can Sehat Setu help you today?')}
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
              {localized('welcomeSub', 'Select an option below, or tap Speak to search government health benefits in your regional language.')}
            </p>
          </div>

          {/* Quick Action Tiles Grid */}
          <div className="action-grid">
            
            {/* Tile 1: Speak */}
            <div onClick={() => setActiveView('VOICE')} className="action-tile" style={{ borderColor: 'var(--primary)', borderWidth: '2px' }}>
              <div className="tile-icon-wrapper" style={{ background: 'var(--primary)', color: '#ffffff' }}>
                <Mic size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                  🎙️ {t.speakToAssistant}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  {localized('speakSub', 'Speak details in Hindi (हिन्दी), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), or English.')}
                </p>
              </div>
            </div>

            {/* Tile 2: Find Facility */}
            <div onClick={() => setActiveView('FACILITIES')} className="action-tile">
              <div className="tile-icon-wrapper">
                <Building2 size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  🏥 {t.findFacility}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  {localized('findFacilitySub', 'Locate nearby public hospitals, Community Health Centres, or Jan Aushadhi generic stores.')}
                </p>
              </div>
            </div>

            {/* Tile 3: Check Health Schemes */}
            <div onClick={() => setActiveView('SCHEMES')} className="action-tile">
              <div className="tile-icon-wrapper">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  💳 {t.checkSchemes}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  {localized('checkSchemesSub', 'Calculate eligibility metrics for Ayushman Bharat (PM-JAY), Ayushman 70+, or local state health cards.')}
                </p>
              </div>
            </div>

            {/* Tile 4: Document Checklist */}
            <div onClick={() => setActiveView('SCHEMES')} className="action-tile">
              <div className="tile-icon-wrapper">
                <FileText size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  📄 {t.requiredDocuments}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  {localized('requiredDocumentsSub', 'Confirm Aadhaar, Ration Cards, and other documents required to apply for free medical schemes.')}
                </p>
              </div>
            </div>

            {/* Tile 5: Talk to Person */}
            <div onClick={() => setActiveView('HUMAN')} className="action-tile">
              <div className="tile-icon-wrapper">
                <HeartHandshake size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  👩‍⚕️ {t.talkToPerson}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  {localized('talkToPersonSub', 'Send a support or guidance request directly to a local verified ASHA worker or volunteer in your area.')}
                </p>
              </div>
            </div>

            {/* Tile 6: Emergency Help (RED) */}
            <div 
              onClick={() => setActiveView('EMERGENCY')} 
              className="action-tile"
              style={{ border: '2px solid var(--emergency)', background: 'var(--emergency-bg)' }}
            >
              <div className="tile-icon-wrapper" style={{ background: 'var(--emergency)', color: '#ffffff' }}>
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--emergency)', margin: 0 }}>
                  🚨 {t.emergencyHelp}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  {localized('emergencySub', 'Get immediate ambulance dialing guidelines and directions to the closest 24x7 trauma care hospital.')}
                </p>
              </div>
            </div>

          </div>

          {/* Secondary Quick Links */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setActiveView('FAMILY')}
              className="btn btn-outline"
              style={{ fontSize: '0.875rem', flex: '1 1 auto' }}
            >
              <Users size={18} /> {localized('householdManager', 'Household Profile Manager')}
            </button>

            <button 
              onClick={() => setActiveView('REMINDERS')}
              className="btn btn-outline"
              style={{ fontSize: '0.875rem', flex: '1 1 auto' }}
            >
              <Bell size={18} /> {localized('reminders', 'Healthcare Follow-up Reminders')}
            </button>
          </div>

          <PrivacyNotice />

        </div>
      )}

    </div>
  );
};
