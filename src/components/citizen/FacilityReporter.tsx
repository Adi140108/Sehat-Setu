import React, { useState } from 'react';
import { analyticsService } from '../../services/analytics/analyticsService';
import type { FacilityReport } from '../../types';
import { AlertTriangle, FileText, Check, X } from 'lucide-react';

interface FacilityReporterProps {
  facilityId: string;
  facilityName: string;
  onClose: () => void;
}

export const FacilityReporter: React.FC<FacilityReporterProps> = ({ facilityId, facilityName, onClose }) => {
  const [issueType, setIssueType] = useState<FacilityReport['issueType']>('PHONE_INCORRECT');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      await analyticsService.submitFacilityReport(facilityId, facilityName, issueType, description);
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
          Report Filed Successfully
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '16px' }}>
          Your data correction report has been logged. Admin operators will verify it against the master database pipeline.
        </p>
        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="card-glass animate-fade-in-up" style={{ padding: '20px', maxWidth: '420px', margin: '16px auto', position: 'relative' }}>
      
      <button 
        onClick={onClose} 
        style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
        title="Close dialog"
      >
        <X size={18} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <AlertTriangle size={20} style={{ color: 'var(--accent)' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 850, color: 'var(--primary)', margin: 0 }}>
          Report Data Issue
        </h3>
      </div>

      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
        Is facility details for <strong>{facilityName}</strong> incorrect or out-of-date? File a verification ticket below.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Issue Category</label>
          <select 
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as FacilityReport['issueType'])}
            className="form-select"
          >
            <option value="PHONE_INCORRECT">Incorrect Phone Number</option>
            <option value="ADDRESS_INCORRECT">Incorrect Address details</option>
            <option value="FACILITY_MOVED">Facility has moved location</option>
            <option value="FACILITY_CLOSED">Facility has closed down</option>
            <option value="WRONG_FACILITY_TYPE">Wrong Facility Classification (PHC/CHC/Hospital)</option>
            <option value="WRONG_SCHEME_ASSOCIATION">Wrong Health Scheme Association (e.g. not PM-JAY)</option>
            <option value="DUPLICATE">Duplicate record in directory</option>
            <option value="OTHER">Other data discrepancy</option>
          </select>
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileText size={14} style={{ color: 'var(--primary)' }} /> Description of discrepancy
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. The phone number listed is out of service. Correct number is 080-222..."
            className="form-input"
            style={{ width: '100%', minHeight: '80px', resize: 'vertical', padding: '8px' }}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-outline" 
            style={{ flex: 1 }}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ flex: 1 }}
            disabled={loading || !description.trim()}
          >
            {loading ? 'Filing Report...' : 'File Ticket'}
          </button>
        </div>

      </form>

    </div>
  );
};
