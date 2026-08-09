import React, { useState, useEffect } from 'react';
import type { SupportRequest } from '../../types';
import { getSupportRequests, updateSupportRequestStatus } from '../../services/firebase/firestoreService';
import { UserCheck, PhoneCall, CheckCircle2, Clock } from 'lucide-react';

export const VolunteerDashboard: React.FC = () => {
  const [requests, setRequests] = useState<SupportRequest[]>([]);

  useEffect(() => {
    setRequests(getSupportRequests());
  }, []);

  const handleStatusChange = (id: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED') => {
    updateSupportRequestStatus(id, newStatus, 'ASHA Worker Sunita');
    setRequests(getSupportRequests());
  };

  return (
    <div style={{ marginTop: '16px' }}>
      
      {/* Top Banner */}
      <div className="card-glass" style={{ marginBottom: '16px', background: 'var(--primary-light)', borderColor: 'var(--primary-teal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={24} /> ASHA Worker & Volunteer Support Desk
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Assigned community healthcare assistance requests from local citizens needing navigation support.
            </p>
          </div>

          <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            ● Active Duty
          </span>
        </div>
      </div>

      {/* Support Requests List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {requests.map((req) => (
          <div key={req.id} className="card-glass" style={{ borderLeft: `4px solid ${req.status === 'RESOLVED' ? 'var(--success-green)' : req.status === 'IN_PROGRESS' ? '#e67e22' : 'var(--primary-teal)'}` }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-teal)' }}>
                  {req.userName || 'Citizen Request'}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  📍 {req.location} | Language: <strong style={{ textTransform: 'uppercase' }}>{req.language}</strong>
                </p>
              </div>

              <div>
                {req.status === 'PENDING' && (
                  <span className="badge badge-teal"><Clock size={12} /> Pending Volunteer</span>
                )}
                {req.status === 'IN_PROGRESS' && (
                  <span className="badge" style={{ background: '#fff3e0', color: '#e67e22' }}>In Progress</span>
                )}
                {req.status === 'RESOLVED' && (
                  <span className="badge badge-success"><CheckCircle2 size={12} /> Resolved</span>
                )}
              </div>
            </div>

            {/* Need Details */}
            <div style={{ background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: '#333' }}>
              <strong>Citizen Request:</strong> "{req.needDescription}"
            </div>

            {req.assignedToVolunteerName && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Assigned Worker: <strong>{req.assignedToVolunteerName}</strong>
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <a 
                href={`tel:${req.userPhone}`} 
                className="btn btn-primary" 
                style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: '34px' }}
              >
                <PhoneCall size={14} /> Call Citizen ({req.userPhone})
              </a>

              {req.status !== 'IN_PROGRESS' && (
                <button 
                  onClick={() => handleStatusChange(req.id, 'IN_PROGRESS')}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: '34px' }}
                >
                  Accept & Start Support
                </button>
              )}

              {req.status !== 'RESOLVED' && (
                <button 
                  onClick={() => handleStatusChange(req.id, 'RESOLVED')}
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: '34px', color: 'var(--success-green)', borderColor: 'var(--success-green)' }}
                >
                  <CheckCircle2 size={14} /> Mark as Resolved
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
