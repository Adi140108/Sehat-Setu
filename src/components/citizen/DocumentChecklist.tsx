import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { HealthScheme } from '../../types';
import { FileCheck, AlertTriangle, CheckSquare, Square, ExternalLink } from 'lucide-react';

interface DocumentChecklistProps {
  scheme: HealthScheme;
  onBack?: () => void;
}

export const DocumentChecklist: React.FC<DocumentChecklistProps> = ({ scheme }) => {
  const { t } = useLanguage();
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  const toggleDoc = (doc: string) => {
    setCheckedDocs(prev => ({ ...prev, [doc]: !prev[doc] }));
  };

  const missingDocs = scheme.documentsRequired.filter(d => !checkedDocs[d]);

  return (
    <div className="card-glass" style={{ marginTop: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={22} /> {t.documentsNeededTitle}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            For scheme: <strong>{scheme.shortName}</strong>
          </p>
        </div>

        <a 
          href={scheme.officialSource}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline"
          style={{ fontSize: '0.8rem', padding: '6px 12px', minHeight: '32px' }}
        >
          Official Portal <ExternalLink size={14} />
        </a>
      </div>

      {/* Checklist Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {scheme.documentsRequired.map((doc, idx) => {
          const isChecked = !!checkedDocs[doc];
          return (
            <div 
              key={idx}
              onClick={() => toggleDoc(doc)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${isChecked ? 'var(--success-green)' : 'var(--border-color)'}`,
                background: isChecked ? 'var(--success-bg)' : 'var(--card-bg)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ color: isChecked ? 'var(--success-green)' : 'var(--text-muted)' }}>
                {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: isChecked ? 'var(--success-green)' : 'var(--text-main)' }}>
                {doc}
              </span>
            </div>
          );
        })}
      </div>

      {/* Missing Document Advice Box */}
      {missingDocs.length > 0 && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#b78103' }}>
            <AlertTriangle size={18} />
            <span>Missing Document Guidance</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px', margin: 0 }}>
            If you do not have <strong>{missingDocs[0]}</strong>, you can visit your nearest Common Service Centre (CSC), Tehsil office, or Gram Panchayat kiosk to apply with Aadhaar authentication.
          </p>
        </div>
      )}

      {/* Application Steps */}
      <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-teal)', marginBottom: '8px' }}>
          📋 Next Steps to Enroll / Access Scheme:
        </h4>
        <ol style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {scheme.applicationSteps.map((step, sIdx) => (
            <li key={sIdx}>{step}</li>
          ))}
        </ol>
      </div>

    </div>
  );
};
