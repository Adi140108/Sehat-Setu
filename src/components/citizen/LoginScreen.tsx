import React, { useState, useEffect } from 'react';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  loginWithCustomToken, 
  loginAnonymous 
} from '../../services/firebase/authService';
import { logAuthAuditEvent } from '../../services/firebase/firestoreService';
import { Shield, Mail, Smartphone, LogIn, HelpCircle, ArrowRight } from 'lucide-react';
import type { UserProfile } from '../../types';

import logoWithTagline from '../../assets/Logo.jpeg';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onContinueAsGuest: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onContinueAsGuest }) => {
  const [authMethod, setAuthMethod] = useState<'NONE' | 'PHONE' | 'EMAIL'>('NONE');
  
  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Phone/OTP state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer for OTP resend cooldown
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const formatAuthError = (err: any): string => {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      return 'Google sign-in popup was closed before completing.';
    }
    if (err?.code === 'auth/popup-blocked') {
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    }
    if (err?.code === 'auth/email-already-in-use') {
      return 'This email is already registered. Please sign in instead.';
    }
    if (err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
      return 'Incorrect email or password.';
    }
    const msg = err?.message || err?.toString() || '';
    if (msg.includes('api-key-not-valid') || msg.includes('invalid-api-key') || msg.includes('unconfigured')) {
      return '';
    }
    return msg.replace(/^Firebase:\s*/i, '').replace(/Error\s*\(auth\/[^)]+\)\.?/i, '').trim();
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await loginWithGoogle();
      await logAuthAuditEvent(profile.uid, 'LOGIN_GOOGLE', 'Google Sign-In Success');
      onLoginSuccess(profile);
    } catch (err: any) {
      console.error(err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      return setError('Please enter both email and password.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    setError(null);
    try {
      let profile;
      if (isRegistering) {
        profile = await registerWithEmail(email, password);
        await logAuthAuditEvent(profile.uid, 'REGISTER_EMAIL', 'Email Registration Success');
      } else {
        profile = await loginWithEmail(email, password);
        await logAuthAuditEvent(profile.uid, 'LOGIN_EMAIL', 'Email Log-In Success');
      }
      onLoginSuccess(profile);
    } catch (err: any) {
      console.error(err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize phone to E.164 (+91XXXXXXXXXX)
    let formattedPhone = phone.trim().replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+91')) {
      if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.length === 10) {
        formattedPhone = '+91' + formattedPhone;
      } else {
        return setError('Please enter a valid 10-digit mobile number.');
      }
    }

    if (!/^\+91[6-9]\d{9}$/.test(formattedPhone)) {
      return setError('Invalid Indian phone number structure. Must start with 6-9.');
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      setOtpSent(true);
      setPhone(formattedPhone);
      setOtpCooldown(60); // 60s resend cooldown
      setOtpAttemptsLeft(5);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('OTP_RATE_LIMITED')) {
        setError('OTP rate limit exceeded for this number. Please try again after 10 minutes.');
      } else {
        setError(err.message || 'Failed to send verification code. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      return setError('Verification code must be exactly 6 digits.');
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setOtpAttemptsLeft(prev => Math.max(0, prev - 1));
        throw new Error(data.error || 'Incorrect OTP code.');
      }

      // Complete login on client side with custom token
      const profile = await loginWithCustomToken(data.customToken);
      await logAuthAuditEvent(profile.uid, 'LOGIN_OTP', `Mobile verification success for ${phone}`);
      onLoginSuccess(profile);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('VERIFY_RATE_LIMITED') || otpAttemptsLeft === 1) {
        setError('Too many incorrect attempts. This verification code is locked. Please request a new OTP.');
        setOtpSent(false);
      } else {
        setError(`${err.message} (${otpAttemptsLeft - 1} attempts remaining)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginAnonymous();
      onContinueAsGuest();
    } catch (err: any) {
      console.error(err);
      onContinueAsGuest(); // Fallback bypass anyway
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '440px',
      margin: '40px auto',
      padding: '28px',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-2xl)',
      boxShadow: 'var(--shadow-xl)',
      border: '1px solid var(--border)',
      textAlign: 'center'
    }} className="animate-fade-in-up">
      
      {/* Official Tagline Logo Header */}
      <div style={{ marginBottom: '32px' }}>
        <img 
          src={logoWithTagline} 
          alt="Sehat Setu Logo with Tagline" 
          style={{
            maxWidth: '220px',
            margin: '0 auto',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-xs)'
          }}
        />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '16px' }}>
          Secure Authentication
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Create an account to build your Sehat Pass & save your family profile.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'var(--emergency-bg)',
          color: 'var(--emergency)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '20px',
          textAlign: 'left',
          border: '1.5px solid rgba(220, 38, 38, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--emergency)',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '2px 4px'
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {loading && (
        <div style={{
          padding: '16px 0',
          fontSize: '0.95rem',
          color: 'var(--primary)',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span className="animate-pulse" style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'var(--primary)'
          }}></span>
          Please wait...
        </div>
      )}

      {authMethod === 'NONE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 1. Mobile Sign-In Option */}
          <button 
            onClick={() => setAuthMethod('PHONE')} 
            className="btn btn-primary"
            style={{ width: '100%', minHeight: '52px', fontSize: '0.975rem' }}
            disabled={loading}
          >
            <Smartphone size={20} /> Continue with Mobile Number
          </button>

          {/* 2. Google Sign-In Option */}
          <button 
            onClick={handleGoogleLogin} 
            className="btn btn-outline"
            style={{ width: '100%', minHeight: '52px', fontSize: '0.975rem', background: 'var(--bg-surface)' }}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </button>

          {/* 3. Email Sign-In Option */}
          <button 
            onClick={() => setAuthMethod('EMAIL')} 
            className="btn btn-outline"
            style={{ width: '100%', minHeight: '52px', fontSize: '0.975rem', background: 'var(--bg-surface)' }}
            disabled={loading}
          >
            <Mail size={20} /> Continue with Email
          </button>

          <div style={{ 
            height: '1px', 
            background: 'var(--border)', 
            margin: '16px 0', 
            position: 'relative'
          }}>
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-elevated)',
              padding: '0 12px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              fontWeight: 700
            }}>OR</span>
          </div>

          {/* 4. Guest bypass */}
          <button 
            onClick={handleGuestAccess} 
            className="btn btn-secondary"
            style={{ width: '100%', minHeight: '52px', fontSize: '0.975rem' }}
            disabled={loading}
          >
            <HelpCircle size={20} /> Explore as Guest
          </button>
        </div>
      )}

      {/* PHONE AUTH PANEL */}
      {authMethod === 'PHONE' && (
        <div>
          {!otpSent ? (
            <form onSubmit={handleSendOTP}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', textAlign: 'left', color: 'var(--text-primary)' }}>
                📱 Mobile OTP Verification
              </h3>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" htmlFor="phone-input">Enter Indian Mobile Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 12px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    fontSize: '0.95rem',
                    fontWeight: 700
                  }}>+91</span>
                  <input
                    id="phone-input"
                    type="tel"
                    className="form-input"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').substring(0, 10))}
                    style={{ flex: 1, fontWeight: 600 }}
                    disabled={loading}
                    required
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  You will receive a real verification code via WhatsApp or SMS.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  onClick={() => { setAuthMethod('NONE'); setError(null); }}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={loading}
                >
                  Send OTP <ArrowRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', textAlign: 'left', color: 'var(--text-primary)' }}>
                🔢 Enter Code
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left', marginBottom: '20px' }}>
                A 6-digit code has been sent to <strong>{phone}</strong>.
              </p>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" htmlFor="otp-input">Verification Code</label>
                <input
                  id="otp-input"
                  type="text"
                  className="form-input"
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  style={{ textAlign: 'center', letterSpacing: '12px', fontSize: '1.4rem', fontWeight: 800 }}
                  disabled={loading}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Attempts remaining: <strong>{otpAttemptsLeft}</strong>
                </span>
                
                {otpCooldown > 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    Resend in {otpCooldown}s
                  </span>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleSendOTP}
                    style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  onClick={() => { setOtpSent(false); setError(null); }}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  Change Number
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={loading}
                >
                  Verify <LogIn size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* EMAIL AUTH PANEL */}
      {authMethod === 'EMAIL' && (
        <form onSubmit={handleEmailSubmit}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', textAlign: 'left', color: 'var(--text-primary)' }}>
            ✉️ {isRegistering ? 'Create Email Account' : 'Email Authentication'}
          </h3>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" htmlFor="email-input">Email Address</label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" htmlFor="password-input">Password</label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button 
              type="button" 
              onClick={() => { setAuthMethod('NONE'); setError(null); }}
              className="btn btn-outline"
              style={{ flex: 1 }}
              disabled={loading}
            >
              Back
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={loading}
            >
              {isRegistering ? 'Register' : 'Log In'} <LogIn size={16} />
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '20px' }}>
            {isRegistering ? 'Already have an account?' : "Don't have an account?"} {' '}
            <button 
              type="button" 
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}
              disabled={loading}
            >
              {isRegistering ? 'Log In here' : 'Register here'}
            </button>
          </p>
        </form>
      )}

      {/* Safety Bottom Line */}
      <div style={{
        marginTop: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)'
      }}>
        <Shield size={14} style={{ color: 'var(--success)' }} />
        <span>Your credentials are encrypted & protected</span>
      </div>

    </div>
  );
};
