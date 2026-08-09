import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { deleteAllUserData } from '../../services/firebase/firestoreService';
import { ShieldCheck, Trash2, CheckCircle2 } from 'lucide-react';

export const PrivacyNotice: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [deleted, setDeleted] = useState(false);

  const handleDeleteData = () => {
    if (user?.uid) {
      deleteAllUserData(user.uid);
      setDeleted(true);
      setTimeout(() => setDeleted(false), 4000);
    }
  };

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      marginTop: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
        <ShieldCheck size={24} style={{ color: 'var(--primary-teal)', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>{t.safetyNoticeTitle}</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{t.privacyNotice}</p>
        </div>
      </div>

      <div>
        {deleted ? (
          <span className="badge badge-success" style={{ padding: '6px 12px' }}>
            <CheckCircle2 size={14} /> Data Deleted Successfully
          </span>
        ) : (
          <button 
            onClick={handleDeleteData} 
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '6px 12px', minHeight: '34px', color: 'var(--emergency-red)', borderColor: 'var(--emergency-red)' }}
          >
            <Trash2 size={14} /> {t.deleteMyData}
          </button>
        )}
      </div>
    </div>
  );
};
