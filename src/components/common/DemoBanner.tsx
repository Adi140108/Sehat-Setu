import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sparkles, AlertTriangle, Building2, ShieldCheck, UserCheck } from 'lucide-react';

interface DemoBannerProps {
  onRunDemoScenario: (scenarioId: 'HINDI_VOICE' | 'EMERGENCY' | 'SCHEME_CHECK' | 'HUMAN_SUPPORT') => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onRunDemoScenario }) => {
  const { t } = useLanguage();

  return (
    <div style={{
      background: 'linear-gradient(90deg, #0d5c75 0%, #1a7a99 100%)',
      color: '#ffffff',
      borderRadius: 'var(--radius-md)',
      padding: '12px 18px',
      marginBottom: '16px',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
          <Sparkles size={18} style={{ color: '#f39c12' }} />
          <span>{t.demoBannerText}</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => onRunDemoScenario('HINDI_VOICE')}
            className="btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', color: '#fff', height: 'auto', minHeight: '32px' }}
          >
            <Building2 size={14} /> Demo 1: Hindi Voice Search
          </button>

          <button 
            onClick={() => onRunDemoScenario('EMERGENCY')}
            className="btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#d32f2f', color: '#fff', height: 'auto', minHeight: '32px', fontWeight: 700 }}
          >
            <AlertTriangle size={14} /> Demo 2: Emergency (Red)
          </button>

          <button 
            onClick={() => onRunDemoScenario('SCHEME_CHECK')}
            className="btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', color: '#fff', height: 'auto', minHeight: '32px' }}
          >
            <ShieldCheck size={14} /> Demo 3: Scheme & Docs
          </button>

          <button 
            onClick={() => onRunDemoScenario('HUMAN_SUPPORT')}
            className="btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', color: '#fff', height: 'auto', minHeight: '32px' }}
          >
            <UserCheck size={14} /> Demo 4: ASHA Handoff
          </button>
        </div>
      </div>
    </div>
  );
};
