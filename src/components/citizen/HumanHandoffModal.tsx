import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { createSupportRequest } from '../../services/firebase/firestoreService';
import { Send, CheckCircle2, HeartHandshake } from 'lucide-react';

interface HumanHandoffModalProps {
  onClose: () => void;
}

export const HumanHandoffModal: React.FC<HumanHandoffModalProps> = ({ onClose }) => {
  const { language, t } = useLanguage();
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Kolar, Karnataka');
  const [need, setNeed] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!need.trim()) return;

    createSupportRequest({
      userId: 'citizen-demo-user',
      userName: userName || 'Citizen',
      userPhone: phone || '98450XXXXX',
      language,
      location,
      needDescription: need,
      urgent: false
    });

    setIsSubmitted(true);
  };

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: 'var(--shadow-lg)',
      marginTop: '16px'
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeartHandshake size={22} /> {t.talkToPerson}
        </h3>
        <button onClick={onClose} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '30px' }}>
          Close
        </button>
      </div>

      {isSubmitted ? (
        <div style={{ textAlign: 'center', padding: '24px 12px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--success-bg)',
            color: 'var(--success-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto'
          }}>
            <CheckCircle2 size={36} />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success-green)' }}>
            {t.supportRequestSuccess}
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {t.assignedWorkerText}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            If you need help understanding a health scheme, filling out forms, or finding a facility, request assistance from a local ASHA worker or NGO volunteer.
          </p>

          <div className="form-group">
            <label className="form-label">Your Name (Optional)</label>
            <input 
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contact Phone Number</label>
            <input 
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9845012345"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location / District</label>
            <input 
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Kolar, Karnataka"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Describe What You Need Help With *</label>
            <textarea 
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              rows={3}
              placeholder="e.g. Need help enrolling my mother for Ayushman Vaya Vandana card..."
              className="form-textarea"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
            <Send size={18} /> {t.submitSupportRequest}
          </button>
        </form>
      )}

    </div>
  );
};
