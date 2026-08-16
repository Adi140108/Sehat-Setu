import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  User, 
  ShieldCheck, 
  Printer, 
  Download, 
  ArrowLeft, 
  Edit, 
  PhoneCall, 
  RefreshCw, 
  Trash2, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Camera
} from 'lucide-react';
import { uploadImageToCloudinary } from '../../services/cloudinary/cloudinaryService';
import { ProfilePhotoSelector } from './ProfilePhotoSelector';
import { 
  generatePassVerificationToken, 
  revokePassVerificationToken, 
  saveSehatPass 
} from '../../services/firebase/firestoreService';
import { auth } from '../../services/firebase/firebase';

interface SehatPassViewProps {
  passData: {
    passId: string;
    displayName: string;
    photoUrl?: string;
    preferredLanguage: string;
    secureQrTokenReference: string;
    createdAt: string;
    status: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  onBack: () => void;
}

export const SehatPassView: React.FC<SehatPassViewProps> = ({ passData: initialPassData, onBack }) => {
  const [passData, setPassData] = useState(initialPassData);
  const [isEditing, setIsEditing] = useState(false);
  const [showLargeQr, setShowLargeQr] = useState(false);

  // Editing profile fields
  const [editName, setEditName] = useState(passData.displayName);
  const [editLang, setEditLang] = useState(passData.preferredLanguage);
  const [emergencyName, setEmergencyName] = useState(passData.emergencyContact?.name || '');
  const [emergencyRelation, setEmergencyRelation] = useState(passData.emergencyContact?.relationship || '');
  const [emergencyPhone, setEmergencyPhone] = useState(passData.emergencyContact?.phone || '');
  
  // Image Upload State
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(passData.photoUrl || null);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);

  // Status banners
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const user = auth.currentUser;

  const qrValue = `${window.location.origin}/verify/pass-${passData.secureQrTokenReference}`;

  useEffect(() => {
    if (canvasRef.current && !isEditing) {
      QRCode.toCanvas(
        canvasRef.current, 
        qrValue, 
        {
          width: showLargeQr ? 240 : 150,
          margin: 1,
          color: {
            dark: '#0b7a6f', // Match Sehat Setu teal color
            light: '#ffffff'
          }
        }, 
        (error) => {
          if (error) console.error('Error generating Sehat Pass QR:', error);
        }
      );
    }
  }, [qrValue, isEditing, showLargeQr]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `sehat-pass-${passData.passId}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setUploadError('');
    setSuccessMsg('');

    try {
      let finalPhotoUrl = passData.photoUrl;

      // Handle photo upload if chosen
      if (selectedPhoto) {
        setUploadProgress(0);
        const uploadRes = await uploadImageToCloudinary(
          selectedPhoto, 
          (prog) => setUploadProgress(prog),
          'sehat-setu/profiles'
        );
        finalPhotoUrl = uploadRes.secure_url;
      }

      // Save pass data object
      const updatedPass = {
        ...passData,
        displayName: editName.trim(),
        preferredLanguage: editLang,
        photoUrl: finalPhotoUrl,
        emergencyContact: emergencyName.trim() ? {
          name: emergencyName.trim(),
          relationship: emergencyRelation.trim(),
          phone: emergencyPhone.trim()
        } : undefined,
        updatedAt: new Date().toISOString()
      };

      await saveSehatPass(user.uid, {
        passId: updatedPass.passId,
        displayName: updatedPass.displayName,
        photoUrl: updatedPass.photoUrl,
        preferredLanguage: updatedPass.preferredLanguage,
        secureQrTokenReference: updatedPass.secureQrTokenReference,
        emergencyContact: updatedPass.emergencyContact,
        createdAt: updatedPass.createdAt
      });

      // Update local state
      setPassData(updatedPass);
      setSuccessMsg('Profile details successfully updated!');
      setIsEditing(false);
      setUploadProgress(null);
      setSelectedPhoto(null);
      
      // Update session values in localStorage to keep home synced
      const cached = localStorage.getItem('sehat_setu_user_session');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.name = updatedPass.displayName;
          parsed.preferredLanguage = updatedPass.preferredLanguage;
          localStorage.setItem('sehat_setu_user_session', JSON.stringify(parsed));
        } catch (e) {}
      }
    } catch (err: any) {
      setUploadError(err.message || 'Profile save failed.');
      setUploadProgress(null);
    } finally {
      setLoading(false);
    }
  };

  // Regeneration of Lookup reference token
  const handleRegenerateQr = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // First revoke existing one
      if (passData.secureQrTokenReference) {
        await revokePassVerificationToken(passData.secureQrTokenReference);
      }

      // Generate a new secure lookup reference token
      const newToken = await generatePassVerificationToken(user.uid, passData);
      
      const updatedPass = {
        ...passData,
        secureQrTokenReference: newToken,
        updatedAt: new Date().toISOString()
      };

      await saveSehatPass(user.uid, {
        passId: updatedPass.passId,
        displayName: updatedPass.displayName,
        photoUrl: updatedPass.photoUrl,
        preferredLanguage: updatedPass.preferredLanguage,
        secureQrTokenReference: updatedPass.secureQrTokenReference,
        emergencyContact: updatedPass.emergencyContact,
        createdAt: updatedPass.createdAt
      });

      setPassData(updatedPass);
      setSuccessMsg('Pass lookup QR Token successfully regenerated!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Failed to regenerate verification token.');
    } finally {
      setLoading(false);
    }
  };

  // Deactivate QR lookup token
  const handleRevokeToken = async () => {
    if (!user) return;
    if (confirm('Are you sure you want to revoke current pass lookup access? Validators won\'t be able to scan this QR.')) {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      try {
        await revokePassVerificationToken(passData.secureQrTokenReference);
        setSuccessMsg('QR Token access revoked. Generate new QR below to enable lookup again.');
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (err) {
        setErrorMsg('Failed to revoke access token.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '440px', margin: '0 auto' }}>
      
      {/* Back button */}
      <div style={{ textAlign: 'left', marginBottom: '16px' }}>
        <button 
          onClick={onBack} 
          className="btn btn-outline"
          style={{ fontSize: '0.85rem', padding: '6px 16px', minHeight: '34px' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'var(--emergency-bg)', color: 'var(--emergency)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      {/* Profile Edit Mode Form */}
      {isEditing ? (
        <div className="card-glass" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--primary)', margin: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit size={20} /> Edit Access Profile
          </h3>

          <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Photo selector — Capture Now or Upload with face detection */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                background: 'var(--bg-subtle)',
                border: '2.5px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={36} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowPhotoSelector(true)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, border: '1px solid var(--primary)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'transparent' }}
              >
                <Camera size={14} /> {passData.photoUrl ? 'Change Photo' : 'Add Profile Photo'}
              </button>
            </div>

            {/* ProfilePhotoSelector modal */}
            {showPhotoSelector && (
              <ProfilePhotoSelector
                currentPhotoUrl={passData.photoUrl}
                onPhotoSaved={(secureUrl, _publicId) => {
                  setPhotoPreview(secureUrl);
                  setPassData(prev => ({ ...prev, photoUrl: secureUrl }));
                  setShowPhotoSelector(false);
                  setSuccessMsg('Profile photo updated successfully!');
                }}
                onClose={() => setShowPhotoSelector(false)}
              />
            )}

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Display Name</label>
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="form-input" 
                required 
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Preferred Language</label>
              <select 
                value={editLang} 
                onChange={(e) => setEditLang(e.target.value)} 
                className="form-select"
              >
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="te">Telugu (తెలుగు)</option>
              </select>
            </div>

            {/* Emergency Contact Group */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>Emergency Contact</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="text" 
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Contact Name" 
                  className="form-input" 
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    placeholder="Relationship (e.g. Spouse)" 
                    className="form-input" 
                  />
                  <input 
                    type="tel" 
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="Phone Reference" 
                    className="form-input" 
                  />
                </div>
              </div>
            </div>

            {uploadError && (
              <div style={{ background: 'var(--emergency-bg)', color: 'var(--emergency)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> {uploadError}
              </div>
            )}

            {uploadProgress !== null && (
              <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', height: '8px', overflow: 'hidden' }}>
                <div style={{ background: 'var(--primary)', width: `${uploadProgress}%`, height: '100%' }}></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsEditing(false);
                  setPhotoPreview(passData.photoUrl || null);
                  setSelectedPhoto(null);
                }} 
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
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* Regular Pass Card Display */
        <div>
          <div style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)',
            border: '1.5px solid var(--primary)',
            borderRadius: 'var(--radius-2xl)',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            {/* Hologram decoration */}
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              opacity: 0.5,
              pointerEvents: 'none'
            }}></div>

            {/* Card Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid var(--primary-light)',
              paddingBottom: '14px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}>
                  🛡️
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1, margin: 0 }}>
                    SEHAT PASS
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Karnataka Health Navigation
                  </span>
                </div>
              </div>
              <div style={{
                fontSize: '0.75rem',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 800
              }}>
                {passData.passId}
              </div>
            </div>

            {/* Photo and Details */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', textAlign: 'left', marginBottom: '20px' }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '2.5px solid var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-xs)',
                flexShrink: 0
              }}>
                {passData.photoUrl ? (
                  <img src={passData.photoUrl} alt="Citizen Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '4px', margin: 0 }}>
                  {passData.displayName}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span>Status: <strong style={{ color: 'var(--success)' }}>● Active Access</strong></span>
                  <span>Pref. Language: <strong>{passData.preferredLanguage.toUpperCase()}</strong></span>
                  <span>Issued: <strong>{new Date(passData.createdAt).toLocaleDateString()}</strong></span>
                </div>
              </div>
            </div>

            {/* QR Code Container */}
            <div style={{
              background: 'var(--bg-surface)',
              padding: '16px',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              display: 'inline-block',
              margin: '0 auto 16px',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }}></canvas>
              <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Token Lookup Reference URL
              </div>
            </div>

            {/* Emergency Contact Block */}
            {passData.emergencyContact && passData.emergencyContact.phone && (
              <div style={{ 
                background: 'var(--emergency-bg)', 
                border: '1px solid var(--emergency)', 
                borderRadius: 'var(--radius-md)', 
                padding: '12px',
                textAlign: 'left',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--emergency)', display: 'block', fontWeight: 800 }}>EMERGENCY CONTACT</span>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{passData.emergencyContact.name}</strong> 
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}> ({passData.emergencyContact.relationship})</span>
                </div>
                
                <a 
                  href={`tel:${passData.emergencyContact.phone}`}
                  className="btn btn-outline"
                  style={{ 
                    borderColor: 'var(--emergency)', 
                    color: 'var(--emergency)', 
                    padding: '4px 10px', 
                    minHeight: '32px',
                    fontSize: '0.78rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    fontWeight: 700
                  }}
                >
                  <PhoneCall size={14} /> Call Contact
                </a>
              </div>
            )}

            {/* Privacy Note */}
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              background: 'var(--bg-subtle)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'left'
            }}>
              <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
              <span>This QR code contains a secure lookup token. It does not encode Aadhaar details, medical records, or prescriptions.</span>
            </div>

          </div>

          {/* Verification & Management Actions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            
            <button 
              onClick={() => setShowLargeQr(!showLargeQr)} 
              className="btn btn-outline" 
              style={{ minHeight: '38px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              {showLargeQr ? <EyeOff size={16} /> : <Eye size={16} />}
              {showLargeQr ? 'Normal View' : 'Show QR Big'}
            </button>

            <button 
              onClick={() => setIsEditing(true)} 
              className="btn btn-outline" 
              style={{ minHeight: '38px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Edit size={16} /> Edit Profile
            </button>

            <button 
              onClick={handleRegenerateQr} 
              className="btn btn-outline" 
              disabled={loading}
              style={{ minHeight: '38px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Regenerate QR
            </button>

            <button 
              onClick={handleRevokeToken} 
              className="btn btn-outline" 
              style={{ minHeight: '38px', fontSize: '0.8rem', color: 'var(--emergency)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Trash2 size={16} /> Revoke QR Access
            </button>

          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handlePrint} 
              className="btn btn-outline" 
              style={{ flex: 1, background: 'var(--bg-elevated)' }}
            >
              <Printer size={18} /> Print Pass
            </button>
            <button 
              onClick={handleDownload} 
              className="btn btn-primary" 
              style={{ flex: 1 }}
            >
              <Download size={18} /> Download QR
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
