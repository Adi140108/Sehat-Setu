import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { LanguageCode } from '../../types';
import { Globe, Eye, User, Shield, Home, LogOut, LogIn } from 'lucide-react';
import onlyLogo from '../../assets/OnlyLogo.jpeg';

interface HeaderProps {
  currentTab: 'citizen' | 'admin' | 'volunteer';
  onTabChange: (tab: 'citizen' | 'admin' | 'volunteer') => void;
  onOpenLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange, onOpenLogin }) => {
  const { language, setLanguage, t } = useLanguage();
  const { highContrast, toggleHighContrast } = useTheme();
  const { user, logout } = useAuth();
  const role = user?.role;

  const isGuest = !user || user.uid.startsWith('guest-local-') || user.uid.startsWith('anonymous');

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
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between' }}>
          
          {/* Logo & Title */}
          <div 
            onClick={() => onTabChange('citizen')} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            {/* Small Official Logo Icon */}
            <img 
              src={onlyLogo} 
              alt="Sehat Setu Icon" 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-sm)'
              }}
            />
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-teal)', lineHeight: 1.1 }}>
                {t.appName}
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {t.subTagline}
              </p>
            </div>
          </div>

          {/* Top Controls: User Profile, Language & Contrast */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* User Profile / Guest Sign In Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isGuest ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, background: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
                    Guest Mode
                  </span>
                  {onOpenLogin && (
                    <button
                      onClick={onOpenLogin}
                      className="btn btn-primary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '32px', height: '32px' }}
                    >
                      <LogIn size={14} /> Sign In
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(11, 122, 111, 0.15)' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    overflow: 'hidden'
                  }}>
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      user?.displayName?.[0]?.toUpperCase() || <User size={14} />
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.displayName || 'User'}
                  </span>
                  <button
                    onClick={logout}
                    title="Log Out"
                    style={{ color: 'var(--primary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>

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
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="mr">ಮರಾठी (Marathi)</option>
              </select>
            </div>

            {/* High Contrast Toggle */}
            <button
              onClick={toggleHighContrast}
              title={t.highContrast}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: '36px', height: '36px' }}
            >
              <Eye size={16} />
              <span style={{ display: 'inline-block' }}>{highContrast ? 'Normal' : 'High Contrast'}</span>
            </button>

          </div>
        </div>

        {/* Portal Navigation Tabs (Only visible for admin / volunteer roles in production mode) */}
        {(role === 'admin' || role === 'volunteer') && (
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '10px'
          }}>
            <button
              onClick={() => onTabChange('citizen')}
              className={`btn ${currentTab === 'citizen' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '38px' }}
            >
              <Home size={16} /> {t.citizenPortal}
            </button>

            {(role === 'volunteer' || role === 'admin') && (
              <button
                onClick={() => onTabChange('volunteer')}
                className={`btn ${currentTab === 'volunteer' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '38px' }}
              >
                <User size={16} /> {t.volunteerPortal}
              </button>
            )}

            {role === 'admin' && (
              <button
                onClick={() => onTabChange('admin')}
                className={`btn ${currentTab === 'admin' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '38px' }}
              >
                <Shield size={16} /> {t.adminPortal}
              </button>
            )}
          </div>
        )}

      </div>
    </header>
  );
};
