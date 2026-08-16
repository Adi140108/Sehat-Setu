import React, { useState } from 'react';
import { analyticsService } from '../../services/analytics/analyticsService';
import type { UserFeedback } from '../../types';
import { Heart, MessageSquare, Check, X, ShieldAlert } from 'lucide-react';

interface FeedbackWidgetProps {
  journeyId: string;
  facilityName: string;
  onClose: () => void;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ journeyId, facilityName, onClose }) => {
  const [response, setResponse] = useState<UserFeedback['response'] | null>(null);
  const [reason, setReason] = useState<UserFeedback['reason'] | undefined>(undefined);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response) return;

    setLoading(true);
    try {
      await analyticsService.submitFeedback(journeyId, response, reason, comments);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="card-glass animate-fade-in" style={{ padding: '24px', textAlign: 'center', maxWidth: '400px', margin: '16px auto' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Check size={28} />
        </div>
        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', margin: 0, marginBottom: '6px' }}>
          Thank You for Your Feedback!
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '16px' }}>
          Your response has been logged anonymously to help us verify healthcare access quality in Karnataka.
        </p>
        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="card-glass animate-fade-in-up" style={{ padding: '24px', maxWidth: '440px', margin: '16px auto', position: 'relative' }}>
      
      <button 
        onClick={onClose} 
        style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
        title="Dismiss feedback"
      >
        <X size={18} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <Heart size={22} style={{ color: 'var(--emergency)' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 850, color: 'var(--primary)', margin: 0 }}>
          Verify Healthcare Access
        </h3>
      </div>

      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
        Help us track system reliability. Did Sehat Setu successfully help you access care or services at <strong>{facilityName}</strong>?
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Choice Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {(['YES', 'PARTIALLY', 'NO', 'NOT_VISITED_YET'] as UserFeedback['response'][]).map((opt) => {
            const isSelected = response === opt;
            let label = opt.replace(/_/g, ' ');
            if (opt === 'YES') label = '✓ Yes';
            if (opt === 'PARTIALLY') label = '◓ Partially';
            if (opt === 'NO') label = '✗ No';
            if (opt === 'NOT_VISITED_YET') label = 'Not Visited';

            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setResponse(opt);
                  if (opt === 'YES' || opt === 'NOT_VISITED_YET') {
                    setReason(undefined);
                  }
                }}
                className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', minHeight: '38px', textTransform: 'none' }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Reason Dropdown (Triggered if Partially or No is selected) */}
        {(response === 'NO' || response === 'PARTIALLY') && (
          <div className="animate-fade-in" style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <ShieldAlert size={14} style={{ color: 'var(--accent)' }} /> Select Primary Reason
            </label>
            <select
              value={reason || ''}
              onChange={(e) => setReason(e.target.value as UserFeedback['reason'])}
              className="form-select"
              required
            >
              <option value="" disabled>-- Choose a reason --</option>
              <option value="FACILITY_CLOSED">Facility was closed / relocated</option>
              <option value="INFORMATION_INCORRECT">Incorrect contact/address details</option>
              <option value="SCHEME_NOT_ACCEPTED">AB-PMJAY/Scheme was not accepted</option>
              <option value="MEDICINE_NOT_AVAILABLE">Jan Aushadhi medicine was out of stock</option>
              <option value="COULD_NOT_REACH">Could not reach the facility location</option>
              <option value="OTHER">Other access problem</option>
            </select>
          </div>
        )}

        {/* Written comments */}
        <div>
          <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={14} style={{ color: 'var(--primary)' }} /> Additional Remarks (Optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Please write any details about your visit..."
            className="form-input"
            style={{ width: '100%', minHeight: '60px', resize: 'vertical', padding: '8px' }}
          />
        </div>

        {/* Privacy Note */}
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          🔒 Your feedback is aggregated and does not expose private identity.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-outline" 
            style={{ flex: 1 }}
            disabled={loading}
          >
            Skip
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ flex: 1 }}
            disabled={loading || !response}
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>

      </form>

    </div>
  );
};
