import React, { useState, useEffect } from 'react';
import { ProfilePhotoSelector } from './ProfilePhotoSelector';
import { 
  saveUserProfile, 
  saveUserPreferences, 
  saveUserPrivateData, 
  saveHouseholdMembers, 
  saveSehatPass 
} from '../../services/firebase/firestoreService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../services/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  Check, 
  Globe, 
  User, 
  MapPin, 
  Eye, 
  Camera, 
  Users, 
  IdCard, 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowRight 
} from 'lucide-react';
import type { UserProfile, HouseholdMember, LanguageCode } from '../../types';
import logoWithTagline from '../../assets/Logo.jpeg';

interface OnboardingFlowProps {
  userProfile: UserProfile;
  onOnboardingComplete: (updatedProfile: UserProfile) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ userProfile, onOnboardingComplete }) => {
  const { language, setLanguage } = useLanguage();
  const { highContrast, toggleHighContrast } = useTheme();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Step 2: Language ---
  const availableLanguages: { code: LanguageCode; name: string }[] = [
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी (Hindi)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'ml', name: 'മലയാളം (Malayalam)' },
    { code: 'mr', name: 'मराठी (Marathi)' }
  ];

  // --- Step 3: Basic Profile ---
  const [displayName, setDisplayName] = useState(
    userProfile.displayName === 'Citizen Demo User' ? '' : (userProfile.displayName || '')
  );
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<string>('');

  // Mobile OTP States
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phone || '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(!!userProfile.phone);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // OTP Cooldown timer hook
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // --- Step 4: Location ---
  const [state, setState] = useState('Karnataka'); // Default
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  // --- Step 5: Accessibility ---
  const [accessibilityMode, setAccessibilityMode] = useState('Standard');
  const [fontSizeScale, setFontSizeScale] = useState<'standard' | 'large'>('standard');
  const [contrastMode, setContrastMode] = useState<boolean>(highContrast);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Effect to apply accessibility styles globally
  useEffect(() => {
    // Font Scale
    if (fontSizeScale === 'large') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }

    // High Contrast (syncs with ThemeContext)
    if (contrastMode !== highContrast) {
      toggleHighContrast();
    }

    // Reduced motion stylesheet
    let styleEl = document.getElementById('reduced-motion-style');
    if (reducedMotion) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'reduced-motion-style';
        styleEl.innerHTML = `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0s !important;
            scroll-behavior: auto !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    } else {
      styleEl?.remove();
    }
  }, [fontSizeScale, contrastMode, reducedMotion]);

  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [showPhotoSelectorOnboarding, setShowPhotoSelectorOnboarding] = useState(false);

  // --- Step 7: Family Profiles ---
  const [familyMembers, setFamilyMembers] = useState<HouseholdMember[]>([]);
  const [famName, setFamName] = useState('');
  const [famAge, setFamAge] = useState<number | ''>('');
  const [famGender, setFamGender] = useState('');
  const [famRelation, setFamRelation] = useState('');

  const handleAddFamilyMember = () => {
    if (!famName || !famAge || !famRelation || !famGender) {
      return setError('Please fill all family member fields.');
    }

    const newMember: HouseholdMember = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      name: famName,
      age: Number(famAge),
      gender: famGender,
      relationship: famRelation,
      hasAadhaar: false,
      hasRationCard: false,
      incomeCategory: 'NONE'
    };

    setFamilyMembers([...familyMembers, newMember]);
    setFamName('');
    setFamAge('');
    setFamGender('');
    setFamRelation('');
    setError(null);
  };

  const handleRemoveFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.filter(m => m.id !== id));
  };

  // --- Step 8: Sehat Pass ID Generator ---
  const [sehatPassId, setSehatPassId] = useState('');
  const [qrToken, setQrToken] = useState('');

  useEffect(() => {
    if (step === 8 && !sehatPassId) {
      const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
      setSehatPassId(`SS-${randomDigits}`);
      setQrToken(`tok_${Math.random().toString(36).substring(2, 15)}`);
    }
  }, [step]);

  const karnatakaDistricts = [
    "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", 
    "Bidar", "Chamarajanagar", "Chikkaballapura", "Chikkamagaluru", "Chitradurga", 
    "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", 
    "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", 
    "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", 
    "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Vijayanagara", "Yadgir"
  ];

  // --- Location Autodetect ---
  const handleAutodetectLocation = () => {
    if (!navigator.geolocation) {
      return setError('Location services not supported in this browser.');
    }

    setGpsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Query our secure proxy API which sets custom user-agent on server side
          const res = await fetch(`/api/location/reverse?lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          
          if (data.address) {
            const pin = data.address.postcode || '';
            const rawDist = data.address.district || data.address.county || data.address.city || '';
            const st = data.address.state || 'Karnataka';
            
            // Map raw geocoded district/city to nearest Karnataka dropdown value
            const matched = karnatakaDistricts.find(d => 
              d.toLowerCase() === rawDist.toLowerCase() ||
              rawDist.toLowerCase().includes(d.toLowerCase())
            );
            
            setPincode(pin);
            setDistrict(matched || '');
            setState(st);
          }
        } catch (e) {
          setError('Could not resolve address automatically. Please fill manually.');
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setError('Location access denied. Please enter manually.');
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  };

  // OTP handlers for onboarding linkage (duplicate preventions)
  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) return;
    
    setOtpLoading(true);
    setVerificationError(null);
    try {
      const targetPhone = '+91' + phoneNumber;
      
      // Check for duplicate account linkages (Module 08 rule 4)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', targetPhone));
      const snap = await getDocs(q);
      
      let isDuplicate = false;
      snap.forEach((doc) => {
        if (doc.id !== userProfile.uid) {
          isDuplicate = true;
        }
      });
      
      if (isDuplicate) {
        throw new Error('This mobile number is already linked to another account. To prevent profile conflicts, we cannot link it to this account.');
      }

      const res = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }
      
      setOtpSent(true);
      setOtpCooldown(60);
    } catch (err: any) {
      setVerificationError(err.message || 'Error requesting verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) return;
    
    setOtpLoading(true);
    setVerificationError(null);
    try {
      const targetPhone = '+91' + phoneNumber;
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone, code: otpCode })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Incorrect verification code.');
      }
      
      setPhoneVerified(true);
    } catch (err: any) {
      setVerificationError(err.message || 'Invalid code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // --- Handle Onboarding Submit ---
  const handleCompleteOnboarding = async () => {
    if (!displayName) {
      setStep(3);
      return setError('Name is required.');
    }

    setLoading(true);
    setError(null);

    try {
      const uid = userProfile.uid;

      // 1. Save User core profile
      const updatedProfile: Partial<UserProfile> = {
        displayName,
        preferredLanguage: language,
        phone: phoneVerified ? ('+91' + phoneNumber) : (userProfile.phone || ''),
        email: userProfile.email,
        photoUrl,
        location: {
          lat: 0,
          lng: 0,
          state,
          district,
          pincode
        },
        createdAt: userProfile.createdAt,
        lastActiveAt: new Date().toISOString()
      };
      await saveUserProfile(uid, {
        ...updatedProfile,
        onboardingCompleted: true,
        accessibilityMode: accessibilityMode as any
      } as any);

      // 2. Save preferences
      const preferences = {
        preferredLanguage: language,
        accessibilityMode,
        fontScale: fontSizeScale === 'large' ? 1.2 : 1.0,
        highContrast: contrastMode,
        reducedMotion,
        voiceEnabled: accessibilityMode === 'Voice-first',
        ttsEnabled: accessibilityMode === 'Voice-first'
      };
      await saveUserPreferences(uid, preferences);

      // 3. Save Private User Data
      const privateData = {
        uid,
        age: age ? Number(age) : null,
        gender
      };
      await saveUserPrivateData(uid, privateData);

      // 4. Save family members to database
      if (familyMembers.length > 0) {
        await saveHouseholdMembers(familyMembers);
      }

      // 5. Generate and save Sehat Pass
      const passData = {
        passId: sehatPassId,
        displayName,
        photoUrl,
        preferredLanguage: language,
        secureQrTokenReference: qrToken,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      };
      await saveSehatPass(uid, passData);

      // Return updated profile details
      onOnboardingComplete({
        ...userProfile,
        ...updatedProfile,
        householdMembers: familyMembers
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete onboarding. Please verify database connection.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setError(null);
    if (step === 3 && !displayName) {
      return setError('Please enter your display name.');
    }
    if (step === 4 && (!district || !pincode)) {
      return setError('Please enter your district and PIN code.');
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '24px auto',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-2xl)',
      boxShadow: 'var(--shadow-xl)',
      padding: '32px 24px',
      position: 'relative'
    }} className="animate-fade-in">
      
      {/* Onboarding Wizard Progress Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Setup Profile (Step {step} of 9)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: 9 }).map((_, idx) => (
            <span key={idx} style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: idx + 1 <= step ? 'var(--primary)' : 'var(--border)',
              transition: 'background 0.3s'
            }}></span>
          ))}
        </div>
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
          border: '1.5px solid rgba(220, 38, 38, 0.2)'
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.7)',
          borderRadius: 'var(--radius-2xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          fontSize: '1.1rem',
          fontWeight: 700,
          color: 'var(--primary)'
        }} className="animate-fade-in">
          Uploading/Saving...
        </div>
      )}

      {/* STEP 1: WELCOME SCREEN */}
      {step === 1 && (
        <div className="animate-fade-in-up" style={{ textAlign: 'center' }}>
          <img 
            src={logoWithTagline} 
            alt="Sehat Setu" 
            style={{ maxWidth: '180px', margin: '0 auto 20px', borderRadius: 'var(--radius-sm)' }}
          />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
            Welcome to Sehat Setu!
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
            Sehat Setu is your helper to navigate verified government health schemes, benefits, and local healthcare facilities in Karnataka.
          </p>

          <div style={{
            background: 'var(--bg-subtle)',
            border: '1.5px dashed var(--primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left',
            fontSize: '0.875rem'
          }}>
            <h4 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🛡️ Route, Don't Diagnose
            </h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              Sehat Setu is **not** an AI doctor. We do not diagnose diseases, recommend medicines, or replace your healthcare professional. We guide you to benefits you are entitled to.
            </p>
          </div>

          <button onClick={nextStep} className="btn btn-primary" style={{ width: '100%' }}>
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* STEP 2: LANGUAGE SELECTION */}
      {step === 2 && (
        <div className="animate-fade-in-up">
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            <Globe size={22} style={{ color: 'var(--primary)', marginRight: '6px' }} /> Choose Language
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Choose your preferred language for screen layouts and voice assistance.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '24px' }}>
            {availableLanguages.map((langOption) => (
              <button
                key={langOption.code}
                onClick={() => {
                  setLanguage(langOption.code);
                }}
                className="btn btn-outline"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  borderColor: language === langOption.code ? 'var(--primary)' : 'var(--border)',
                  background: language === langOption.code ? 'var(--primary-light)' : 'var(--bg-surface)',
                  color: language === langOption.code ? 'var(--primary)' : 'var(--text-main)',
                  borderWidth: language === langOption.code ? '2px' : '1.5px'
                }}
              >
                <span>{langOption.name}</span>
                {language === langOption.code && <Check size={18} />}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={prevStep} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
            <button onClick={nextStep} className="btn btn-primary" style={{ flex: 2 }}>Next <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 3: BASIC PROFILE */}
      {step === 3 && (
        <div className="animate-fade-in-up">
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            <User size={22} style={{ color: 'var(--primary)', marginRight: '6px' }} /> Basic Profile
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Enter your display name and basic demographic details.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="dispname">Full Name</label>
            <input
              id="dispname"
              type="text"
              className="form-input"
              placeholder="e.g. Ramesh Gowda"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="age">Age</label>
            <input
              id="age"
              type="number"
              className="form-input"
              placeholder="e.g. 45"
              value={age}
              onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
              min={0}
              max={120}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="gender">Gender (Optional)</label>
            <select
              id="gender"
              className="form-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* Mobile OTP Verification if user profile phone is not set */}
          {!userProfile.phone && (
            <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', marginTop: '16px', textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: 0 }}>
                📱 Link Mobile Number (Aadhaar OTP verification)
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.3 }}>
                Recommended to query empanelled PM-JAY hospitals and sync state benefit registries.
              </p>

              {phoneVerified ? (
                <div style={{ color: 'var(--success-green)', fontSize: '0.825rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✓ Mobile number linked successfully: +91 {phoneNumber}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {!otpSent ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="10-digit mobile number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').substring(0, 10))}
                        className="form-input"
                        style={{ flex: 1, minHeight: '38px', padding: '0 10px' }}
                      />
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={otpLoading || phoneNumber.length !== 10}
                        className="btn btn-primary"
                        style={{ padding: '0 12px', minHeight: '38px', fontSize: '0.8rem', textTransform: 'none' }}
                      >
                        {otpLoading ? 'Sending...' : 'Send OTP'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OTP sent to +91 {phoneNumber}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="6-digit code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                          className="form-input"
                          style={{ flex: 1, minHeight: '38px', padding: '0 10px' }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOTP}
                          disabled={otpLoading || otpCode.length !== 6}
                          className="btn btn-success"
                          style={{ padding: '0 12px', minHeight: '38px', fontSize: '0.8rem', textTransform: 'none', background: 'var(--success)', color: '#fff', border: 'none' }}
                        >
                          {otpLoading ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setVerificationError(null); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                        >
                          Change Number
                        </button>
                        {otpCooldown > 0 ? (
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Resend in {otpCooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {verificationError && (
                    <div style={{ color: 'var(--emergency)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>
                      ⚠️ {verificationError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button onClick={prevStep} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
            <button onClick={nextStep} className="btn btn-primary" style={{ flex: 2 }}>Next <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 4: LOCATION */}
      {step === 4 && (
        <div className="animate-fade-in-up">
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            <MapPin size={22} style={{ color: 'var(--primary)', marginRight: '6px' }} /> Location Setup
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Your location helps filter empanelled hospitals and local PHCs. Initial scope: Karnataka.
          </p>

          <button
            type="button"
            onClick={handleAutodetectLocation}
            className="btn btn-outline"
            style={{ width: '100%', marginBottom: '16px', background: 'var(--bg-surface)' }}
            disabled={gpsLoading}
          >
            📍 {gpsLoading ? 'Autodetecting...' : 'Use My Current Location'}
          </button>

          <div className="form-group">
            <label className="form-label" htmlFor="state">State</label>
            <select
              id="state"
              className="form-select"
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled
            >
              <option value="Karnataka">Karnataka</option>
            </select>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block', textAlign: 'left' }}>
              * Other states coming soon
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="district">District / City</label>
            <select
              id="district"
              className="form-select"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              required
            >
              <option value="">Select District</option>
              {karnatakaDistricts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pincode">Pincode</label>
            <input
              id="pincode"
              type="text"
              className="form-input"
              placeholder="563101"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').substring(0, 6))}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button onClick={prevStep} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
            <button onClick={nextStep} className="btn btn-primary" style={{ flex: 2 }}>Next <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 5: ACCESSIBILITY PREFERENCES */}
      {step === 5 && (
        <div className="animate-fade-in-up">
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            <Eye size={22} style={{ color: 'var(--primary)', marginRight: '6px' }} /> Accessibility
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Customize the screen layout for ease of reading and navigation.
          </p>

          <div className="form-group">
            <label className="form-label">Accessibility Profile</label>
            <select
              className="form-select"
              value={accessibilityMode}
              onChange={(e) => {
                setAccessibilityMode(e.target.value);
                if (e.target.value === 'High Contrast') {
                  setContrastMode(true);
                } else if (e.target.value === 'Voice-first') {
                  setContrastMode(false);
                  setFontSizeScale('standard');
                } else {
                  setContrastMode(false);
                }
              }}
            >
              <option value="Standard">Standard Mode</option>
              <option value="Large Text">Large Text Mode</option>
              <option value="High Contrast">High Contrast Dark Mode</option>
              <option value="Voice-first">Voice-first Assistant Mode</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', textAlign: 'left' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fontSizeScale === 'large'}
                onChange={(e) => setFontSizeScale(e.target.checked ? 'large' : 'standard')}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              Enable Large Font Sizes
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={contrastMode}
                onChange={(e) => setContrastMode(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              Enable High Contrast Screen Theme
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              Reduce UI Animations (Faster rendering)
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button onClick={prevStep} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
            <button onClick={nextStep} className="btn btn-primary" style={{ flex: 2 }}>Next <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 6: PROFILE IMAGE — using ProfilePhotoSelector */}
      {step === 6 && (
        <div className="animate-fade-in-up" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)', textAlign: 'left' }}>
            <Camera size={22} style={{ color: 'var(--primary)', marginRight: '6px' }} /> Profile Image
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'left' }}>
            Add an optional photo of yourself. This photo will appear on your Sehat Pass.
          </p>

          {/* Profile photo preview */}
          <div style={{
            position: 'relative',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'var(--bg-subtle)',
            border: photoUrl ? '2.5px solid var(--primary)' : '2px dashed var(--border)',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {photoUrl ? (
              <img src={photoUrl} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Camera size={44} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>

          {/* Dual action buttons — Capture Now / Upload Photo */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => setShowPhotoSelectorOnboarding(true)}
              className="btn btn-secondary"
              style={{ minHeight: '40px', padding: '6px 18px', fontSize: '0.85rem' }}
            >
              {photoUrl ? '📷 Change Photo' : '📷 Add Photo'}
            </button>

            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="btn btn-outline"
                style={{ minHeight: '40px', padding: '6px 14px', fontSize: '0.85rem', color: 'var(--emergency)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
              >
                Remove
              </button>
            )}
          </div>

          {/* ProfilePhotoSelector Modal */}
          {showPhotoSelectorOnboarding && (
            <ProfilePhotoSelector
              onPhotoSaved={(secureUrl) => {
                setPhotoUrl(secureUrl);
                setShowPhotoSelectorOnboarding(false);
              }}
              onClose={() => setShowPhotoSelectorOnboarding(false)}
            />
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={prevStep} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
            <button onClick={nextStep} className="btn btn-primary" style={{ flex: 2 }}>
              {photoUrl ? 'Next' : 'Skip & Next'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: FAMILY PROFILE FOUNDATION */}
      {step === 7 && (
        <div className="animate-fade-in-up">
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            <Users size={22} style={{ color: 'var(--primary)', marginRight: '6px' }} /> Family Profiles
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            (Optional) Add family members to calculate collective health eligibility or manage their navigation journeys.
          </p>

          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', textAlign: 'left' }}>Add Family Member</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Name"
                className="form-input"
                value={famName}
                onChange={(e) => setFamName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Age"
                className="form-input"
                value={famAge}
                onChange={(e) => setFamAge(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <select
                className="form-select"
                value={famGender}
                onChange={(e) => setFamGender(e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <select
                className="form-select"
                value={famRelation}
                onChange={(e) => setFamRelation(e.target.value)}
              >
                <option value="">Relationship</option>
                <option value="Spouse">Spouse</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddFamilyMember}
              className="btn btn-secondary"
              style={{ width: '100%', minHeight: '38px', padding: '4px' }}
            >
              <Plus size={16} /> Add Member
            </button>
          </div>

          {/* List of current added members */}
          {familyMembers.length > 0 && (
            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Household Members ({familyMembers.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {familyMembers.map((member) => (
                  <div 
                    key={member.id}
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-surface)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{member.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {member.relationship} • {member.age} yrs • {member.gender}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveFamilyMember(member.id)}
                      style={{ color: 'var(--emergency)', padding: '6px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={prevStep} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
            <button onClick={nextStep} className="btn btn-primary" style={{ flex: 2 }}>Next <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* STEP 8: SEHAT PASS GENERATOR */}
      {step === 8 && (
        <div className="animate-fade-in-up" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)', textAlign: 'left' }}>
            <IdCard size={22} style={{ color: 'var(--primary)', marginRight: '6px' }} /> Sehat Pass Preview
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'left' }}>
            We've generated your digital health pass and secure QR lookup token.
          </p>

          <div style={{
            background: 'linear-gradient(135deg, #0b7a6f 0%, #065a52 100%)',
            color: '#fff',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            textAlign: 'left',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            {/* Hologram Circle */}
            <div style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              pointerEvents: 'none'
            }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.05em' }}>SEHAT PASS</h4>
                <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Karnataka Health Navigation</p>
              </div>
              <div style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                {sehatPassId}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '74px',
                height: '74px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.1)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Pass Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={36} />
                )}
              </div>

              <div>
                <h5 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{displayName}</h5>
                <p style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px' }}>
                  Age Group: {age ? (age >= 60 ? 'Senior Citizen' : age < 18 ? 'Minor' : 'Adult') : 'General'}
                </p>
                <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  Pref. Language: {availableLanguages.find(l => l.code === language)?.name.split(' ')[0] || 'English'}
                </p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                🛡️ SECURE LOOKUP TOKEN ENCODED
              </div>
              <div style={{ width: '38px', height: '38px', background: '#fff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: '0.5rem' }}>
                [QR]
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={prevStep} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
            <button onClick={nextStep} className="btn btn-primary" style={{ flex: 2 }}>
              Generate Pass & Onboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 9: ONBOARDING COMPLETE */}
      {step === 9 && (
        <div className="animate-fade-in-up" style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)',
            border: '2px solid rgba(22, 163, 74, 0.2)'
          }}>
            <Check size={40} />
          </div>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
            Setup Complete!
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
            Your profile has been created successfully. You can now locate health centers and check scheme benefits.
          </p>

          <button 
            onClick={() => handleCompleteOnboarding()} 
            className="btn btn-primary" 
            style={{ width: '100%' }}
          >
            Enter Sehat Setu Portal
          </button>
        </div>
      )}

    </div>
  );
};
