import React, { useState, useEffect } from 'react';
import { db, auth } from '../../services/firebase/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { HeartHandshake, Calendar, RefreshCw, CheckCircle2 } from 'lucide-react';

export interface SupportRequest {
  requestId: string;
  userId: string;
  language: string;
  transcript: string;
  intent: string;
  confidence: number;
  locationContext?: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

interface SupportRequestManagerProps {
  onBack: () => void;
}

export const SupportRequestManager: React.FC<SupportRequestManagerProps> = ({ onBack }) => {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    const user = auth.currentUser;

    // 1. Try local cache first (cost control)
    const localData = getLocalRequests();
    setRequests(localData);

    // 2. Fetch from Firestore if authenticated
    if (user) {
      try {
        const colRef = collection(db, 'supportRequests');
        const q = query(
          colRef, 
          where('userId', '==', user.uid),
          limit(20)
        );
        const querySnap = await getDocs(q);
        const fetched: SupportRequest[] = [];
        querySnap.forEach((doc) => {
          fetched.push(doc.data() as SupportRequest);
        });
        
        // Merge with local if any
        if (fetched.length > 0) {
          setRequests(fetched);
          localStorage.setItem('sehat_setu_support_requests', JSON.stringify(fetched));
        }
      } catch (err: any) {
        console.warn('Failed to load support requests from Firestore. Using local storage:', err);
      }
    }
    setIsLoading(false);
  };

  const getLocalRequests = (): SupportRequest[] => {
    try {
      const data = localStorage.getItem('sehat_setu_support_requests');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="badge badge-success" style={{ fontWeight: 800 }}>✓ RESOLVED</span>;
      case 'IN_REVIEW':
        return <span className="badge badge-teal" style={{ fontWeight: 800 }}>⚙ IN REVIEW</span>;
      case 'CLOSED':
        return <span className="badge badge-outline" style={{ fontWeight: 800 }}>☒ CLOSED</span>;
      default:
        return <span className="badge badge-teal" style={{ fontWeight: 800, background: 'var(--primary-light)', color: 'var(--primary)' }}>🕒 OPEN</span>;
    }
  };

  return (
    <div className="card-glass animate-fade-in-up" style={{ marginTop: '16px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <HeartHandshake size={24} /> Human Helper Requests
        </h3>
        
        <button 
          onClick={fetchRequests} 
          className="btn btn-outline" 
          disabled={isLoading}
          style={{ padding: '6px 12px', minHeight: '34px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px' }}>
            <HeartHandshake size={42} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>No active support requests.</p>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              If Sehat Setu cannot resolve your search, you will be offered the option to escalate your query to a community volunteer or ASHA health worker.
            </p>
          </div>
        ) : (
          requests.map((req) => (
            <div 
              key={req.requestId}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                background: 'var(--bg-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ticket ID: {req.requestId}</span>
                  <p style={{ fontSize: '0.925rem', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                    Original Query: "{req.transcript}"
                  </p>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> Created: {new Date(req.createdAt).toLocaleDateString()}
                </span>
                <span>Language: {req.language.toUpperCase()}</span>
              </div>

              {req.status === 'RESOLVED' && (
                <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '8px', borderLeft: '3px solid var(--success)' }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>A health coordinator has reviewed this ticket. A local health volunteer has been notified to follow up with you.</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '20px' }}>
        <button onClick={onBack} className="btn btn-secondary" style={{ flex: 1, minHeight: '44px' }}>
          Back to Main Dashboard
        </button>
      </div>

    </div>
  );
};
