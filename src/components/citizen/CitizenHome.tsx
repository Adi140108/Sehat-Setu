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
import { Mic, Building2, ShieldCheck, FileText, HeartHandshake, AlertTriangle, Users, Bell } from 'lucide-react';

interface CitizenHomeProps {
  initialDemoScenario?: 'HINDI_VOICE' | 'EMERGENCY' | 'SCHEME_CHECK' | 'HUMAN_SUPPORT';
}

export const CitizenHome: React.FC<CitizenHomeProps> = ({ initialDemoScenario }) => {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<'HOME' | 'VOICE' | 'FACILITIES' | 'SCHEMES' | 'EMERGENCY' | 'HUMAN' | 'FAMILY' | 'REMINDERS'>(() => {
    if (initialDemoScenario === 'EMERGENCY') return 'EMERGENCY';
    if (initialDemoScenario === 'SCHEME_CHECK') return 'SCHEMES';
    if (initialDemoScenario === 'HUMAN_SUPPORT') return 'HUMAN';
    if (initialDemoScenario === 'HINDI_VOICE') return 'VOICE';
    return 'HOME';
  });

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
    <div>
      
      {/* Navigation Breadcrumb / Reset */}
      {activeView !== 'HOME' && (
        <div style={{ marginBottom: '16px' }}>
          <button 
            onClick={() => setActiveView('HOME')} 
            className="btn btn-outline"
            style={{ fontSize: '0.85rem', padding: '6px 14px', minHeight: '34px' }}
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
        <div>
          
          {/* Welcome Prompt Hero Card */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #e6f4f8 100%)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 24px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-teal)', marginBottom: '6px' }}>
              How can Sehat Setu help you today?
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              Select a service below or tap 🎙️ <strong>Speak</strong> to query in your language.
            </p>
          </div>

          {/* Quick Action Tiles Grid */}
          <div className="action-grid">
            
            {/* Tile 1: Speak */}
            <div onClick={() => setActiveView('VOICE')} className="action-tile">
              <div className="tile-icon-wrapper" style={{ background: 'var(--primary-teal)', color: '#fff' }}>
                <Mic size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-teal)' }}>
                  🎙️ {t.speakToAssistant}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Speak your query in Hindi, Kannada, Tamil, Telugu, Marathi, or English.
                </p>
              </div>
            </div>

            {/* Tile 2: Find Facility */}
            <div onClick={() => setActiveView('FACILITIES')} className="action-tile">
              <div className="tile-icon-wrapper">
                <Building2 size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  🏥 {t.findFacility}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Locate nearby PHC, Jan Aushadhi Stores, and PM-JAY hospitals with distance.
                </p>
              </div>
            </div>

            {/* Tile 3: Check Health Schemes */}
            <div onClick={() => setActiveView('SCHEMES')} className="action-tile">
              <div className="tile-icon-wrapper">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  💳 {t.checkSchemes}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Check preliminary eligibility for PM-JAY, Ayushman 70+, and State schemes.
                </p>
              </div>
            </div>

            {/* Tile 4: Document Checklist */}
            <div onClick={() => setActiveView('SCHEMES')} className="action-tile">
              <div className="tile-icon-wrapper">
                <FileText size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  📄 {t.requiredDocuments}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Generate Aadhaar & Ration Card document requirements list.
                </p>
              </div>
            </div>

            {/* Tile 5: Talk to Person */}
            <div onClick={() => setActiveView('HUMAN')} className="action-tile">
              <div className="tile-icon-wrapper">
                <HeartHandshake size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  👩‍⚕️ {t.talkToPerson}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Submit assistance request to a local ASHA worker or NGO volunteer.
                </p>
              </div>
            </div>

            {/* Tile 6: Emergency Help (RED) */}
            <div 
              onClick={() => setActiveView('EMERGENCY')} 
              className="action-tile"
              style={{ border: '2px solid var(--emergency-red)', background: 'var(--emergency-bg)' }}
            >
              <div className="tile-icon-wrapper" style={{ background: 'var(--emergency-red)', color: '#fff' }}>
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--emergency-red)' }}>
                  🚨 {t.emergencyHelp}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>
                  Immediate 108 call dialer & nearest trauma hospital directions.
                </p>
              </div>
            </div>

          </div>

          {/* Secondary Quick Links */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setActiveView('FAMILY')}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem' }}
            >
              <Users size={16} /> Household Profile
            </button>

            <button 
              onClick={() => setActiveView('REMINDERS')}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem' }}
            >
              <Bell size={16} /> Healthcare Reminders
            </button>
          </div>

          <PrivacyNotice />

        </div>
      )}

    </div>
  );
};
