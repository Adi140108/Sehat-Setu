import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { LanguageCode, UserRole } from '../../types';
import { HeartPulse, Globe, Eye, User, Shield, MessageSquare, Home } from 'lucide-react';

interface HeaderProps {
  currentTab: 'citizen' | 'admin' | 'volunteer' | 'whatsapp';
  onTabChange: (tab: 'citizen' | 'admin' | 'volunteer' | 'whatsapp') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange }) => {
  const { language, setLanguage, t } = useLanguage();
  const { highContrast, toggleHighContrast } = useTheme();
  const { switchRole } = useAuth();

  const handleRoleSwitch = (newRole: UserRole) => {
    switchRole(newRole);
    if (newRole === 'citizen') onTabChange('citizen');
    if (newRole === 'admin') onTabChange('admin');
    if (newRole === 'volunteer') onTabChange('volunteer');
  };

  return (
    <header style={{
      background: 'var(--card-bg)',
      borderBottom: '1px solid var(--border-color)',
      padding: '14px 0',
      boxShadow: 'var(--shadow-sm)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Top Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Logo & Title */}
          <div 
            onClick={() => onTabChange('citizen')} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-teal)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)'
            }}>
              <HeartPulse size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-teal)', lineHeight: 1.1 }}>
                {t.appName}
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {t.subTagline}
              </p>
            </div>
          </div>

          {/* Top Controls: Language & Contrast */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            
            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <Globe size={16} style={{ color: 'var(--primary-teal)' }} />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </div>

            {/* High Contrast Toggle */}
            <button
              onClick={toggleHighContrast}
              title={t.highContrast}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: '36px' }}
            >
              <Eye size={16} />
              <span style={{ display: 'inline-block' }}>{highContrast ? 'Normal' : 'High Contrast'}</span>
            </button>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '10px'
        }}>
          <button
            onClick={() => { handleRoleSwitch('citizen'); }}
            className={`btn ${currentTab === 'citizen' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '38px' }}
          >
            <Home size={16} /> {t.citizenPortal}
          </button>

          <button
            onClick={() => { onTabChange('whatsapp'); }}
            className={`btn ${currentTab === 'whatsapp' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '38px' }}
          >
            <MessageSquare size={16} /> {t.whatsappDemo}
          </button>

          <button
            onClick={() => { handleRoleSwitch('volunteer'); }}
            className={`btn ${currentTab === 'volunteer' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '38px' }}
          >
            <User size={16} /> {t.volunteerPortal}
          </button>

          <button
            onClick={() => { handleRoleSwitch('admin'); }}
            className={`btn ${currentTab === 'admin' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '38px' }}
          >
            <Shield size={16} /> {t.adminPortal}
          </button>
        </div>

      </div>
    </header>
  );
};
