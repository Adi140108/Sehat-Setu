import React, { useState } from 'react';
import { verifyPassToken, revokePassVerificationToken } from '../../services/firebase/firestoreService';
import type { SehatPassToken } from '../../types';
import { 
  ShieldCheck, 
  Search, 
  ArrowLeft,
  XCircle,
  Clock,
  User,
  Trash2
} from 'lucide-react';

interface PassVerifierProps {
  onBack: () => void;
}

export const PassVerifier: React.FC<PassVerifierProps> = ({ onBack }) => {
  const [tokenIdInput, setTokenIdInput] = useState('');
  const [tokenResult, setTokenResult] = useState<SehatPassToken | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenIdInput.trim()) return;

    // Extract tokenId if user typed/pasted the entire URL
    let parsedToken = tokenIdInput.trim();
    if (parsedToken.includes('/verify/pass-')) {
      parsedToken = parsedToken.split('/verify/pass-')[1] || parsedToken;
    }

    setLoading(true);
    setErrorMsg('');
    setTokenResult(null);
    setHasChecked(false);

    try {
      const token = await verifyPassToken(parsedToken);
      if (!token) {
        setErrorMsg('❌ Verification Failed: Invalid Lookup Token. The QR code is incorrect or corrupted.');
      } else {
        setTokenResult(token);
      }
      setHasChecked(true);
    } catch (err) {
      setErrorMsg('❌ Network Error: Could not reach verification database.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (confirm('Are you sure you want to revoke this lookup token? The QR code will be permanently deactivated.')) {
      setLoading(true);
      await revokePassVerificationToken(tokenId);
      const updated = await verifyPassToken(tokenId);
      setTokenResult(updated);
      setLoading(false);
    }
  };

  const isTokenExpired = tokenResult ? new Date() > new Date(tokenResult.expiresAt) : false;
  const isTokenActive = tokenResult && tokenResult.status === 'ACTIVE' && !isTokenExpired;

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '480px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '6px 14px', minHeight: '34px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <span className="badge badge-teal">Access Verifier Portal</span>
      </div>

      <div className="card-glass" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', margin: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={22} /> Verify Citizen Sehat Pass
        </h3>
        
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
          Enter the QR Lookup Token ID or paste the complete validation URL to check profile authenticity and issue credentials status.
        </p>

        <form onSubmit={handleVerify} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text"
            value={tokenIdInput}
            onChange={(e) => setTokenIdInput(e.target.value)}
            placeholder="e.g. tok_abc123... or complete URL"
            className="form-input"
            style={{ flex: 1 }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', minHeight: '44px' }} disabled={loading}>
            {loading ? 'Checking...' : <Search size={18} />}
          </button>
        </form>
      </div>

      {errorMsg && (
        <div style={{ background: 'var(--emergency-bg)', color: 'var(--emergency)', padding: '14px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--emergency)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px' }}>
          <XCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{errorMsg}</div>
        </div>
      )}

      {hasChecked && tokenResult && (
        <div className="card-glass animate-fade-in" style={{ padding: '20px', textAlign: 'center', border: `2px solid ${isTokenActive ? 'var(--success)' : 'var(--emergency)'}` }}>
          
          {/* Status Display Header */}
          {isTokenActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginBottom: '18px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={32} />
              </div>
              <h4 style={{ margin: 0, color: 'var(--success)', fontWeight: 900, fontSize: '1.2rem' }}>
                ✓ PROFILE VERIFIED ACTIVE
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lookup Token: {tokenResult.tokenId.substring(0, 12)}...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginBottom: '18px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--emergency-bg)', color: 'var(--emergency)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={32} />
              </div>
              <h4 style={{ margin: 0, color: 'var(--emergency)', fontWeight: 900, fontSize: '1.2rem' }}>
                ❌ ACCESS INVALID OR EXPIRED
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>
                Reason: {tokenResult.status === 'REVOKED' ? 'Citizen Revoked Token Access' : (isTokenExpired ? 'QR Code Expired (24h limit reached)' : 'Inactive Reference')}
              </p>
            </div>
          )}

          {/* Verification Payload Cards */}
          <div style={{ 
            background: 'var(--bg-subtle)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)', 
            padding: '16px', 
            textAlign: 'left',
            marginBottom: '16px' 
          }}>
            <h5 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 700 }}>
              Authorized Minimum Disclosure
            </h5>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {tokenResult.verifiedPayload.photoUrl ? (
                  <img src={tokenResult.verifiedPayload.photoUrl} alt="Citizen" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={30} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>

              <div>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>
                  {tokenResult.verifiedPayload.name}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Preferred Language: <strong>{tokenResult.verifiedPayload.preferredLanguage.toUpperCase()}</strong>
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                  Pass ID: <strong>{tokenResult.passId}</strong>
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '10px', marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Issued At:</span>
                <span>{new Date(tokenResult.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Expires At:</span>
                <span>{new Date(tokenResult.expiresAt).toLocaleString()}</span>
              </div>
              {tokenResult.revokedAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--emergency)' }}>
                  <span>Revoked At:</span>
                  <span>{new Date(tokenResult.revokedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Note */}
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'left', marginBottom: '14px' }}>
            <Clock size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <span>This verification endpoint does not disclose sensitive ID details, medical records, or family links.</span>
          </div>

          {/* Deactivation action */}
          {isTokenActive && (
            <button 
              onClick={() => handleRevokeToken(tokenResult.tokenId)} 
              className="btn btn-outline" 
              style={{ width: '100%', minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--emergency)' }}
            >
              <Trash2 size={16} /> Deactivate / Revoke Token QR
            </button>
          )}

        </div>
      )}

    </div>
  );
};
