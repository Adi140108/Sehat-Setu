import React, { useState, useEffect } from 'react';
import type { HouseholdMember } from '../../types';
import { getHouseholdMembers, saveHouseholdMembers } from '../../services/firebase/firestoreService';
import { uploadImageToCloudinary } from '../../services/cloudinary/cloudinaryService';
import { Users, Plus, Trash2, Check, Upload, AlertTriangle, User } from 'lucide-react';

export const FamilyProfileManager: React.FC = () => {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Mother');
  const [dob, setDob] = useState('');
  const [lang, setLang] = useState('kn');
  const [schemeInfo, setSchemeInfo] = useState('');
  
  // Image Upload State
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getHouseholdMembers().then(data => setMembers(data));
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Profile image size exceeds 5MB limit.');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Invalid format. Use JPEG, PNG, or WebP.');
      return;
    }

    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Calculate age from DOB
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const birth = new Date(dobString);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) return;

    setLoading(true);
    setUploadError('');

    try {
      let profileImage = null;

      // Direct client upload if chosen
      if (selectedPhoto) {
        setUploadProgress(0);
        const uploadRes = await uploadImageToCloudinary(
          selectedPhoto, 
          (prog) => setUploadProgress(prog),
          'sehat-setu/profiles'
        );
        profileImage = {
          publicId: uploadRes.public_id,
          secureUrl: uploadRes.secure_url
        };
      }

      const calculatedAge = calculateAge(dob);
      const newMemberId = 'mem-' + Math.random().toString(36).substring(2, 7);

      const newMember: HouseholdMember = {
        id: newMemberId,
        familyMemberId: newMemberId,
        name: name.trim(),
        age: calculatedAge,
        dateOfBirth: dob,
        relationship: relation,
        preferredLanguage: lang as any,
        profileImage: profileImage || undefined,
        schemeInfo: schemeInfo.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Keep legacy flags to prevent breaks in other modules
        gender: 'Female',
        hasAadhaar: true,
        hasRationCard: true
      };

      const updated = [...members, newMember];
      setMembers(updated);
      await saveHouseholdMembers(updated);

      // Reset
      setName('');
      setDob('');
      setSchemeInfo('');
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setUploadProgress(null);
      
      setSavedMsg('Family member profile saved!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save family profile.');
      setUploadProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (confirm('Are you sure you want to delete this family member profile?')) {
      const updated = members.filter(m => m.id !== id);
      setMembers(updated);
      await saveHouseholdMembers(updated);
    }
  };

  return (
    <div className="card-glass" style={{ marginTop: '16px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Users size={22} /> Household Health Profiles
        </h3>
        <span className="badge badge-teal">Privacy Protected</span>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.4 }}>
        Store minimal family details (relationship, language preference, scheme documents) to streamline healthcare access. Sensitive medical history is <strong>never</strong> collected or stored.
      </p>

      {/* Add Member Form */}
      <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        
        {/* Name and Relationship and Language */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Name / Identifier</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kamala"
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Relationship</label>
            <select value={relation} onChange={(e) => setRelation(e.target.value)} className="form-select">
              <option value="Self">Self</option>
              <option value="Mother">Mother</option>
              <option value="Father">Father</option>
              <option value="Spouse">Spouse</option>
              <option value="Child">Child</option>
              <option value="Grandparent">Grandparent</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Language Pref.</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="form-select">
              <option value="kn">Kannada (ಕನ್ನಡ)</option>
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="te">Telugu (తెలుగు)</option>
            </select>
          </div>
        </div>

        {/* DOB & Scheme Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Date of Birth</label>
            <input 
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Scheme Info / Document Reference</label>
            <input 
              type="text"
              value={schemeInfo}
              onChange={(e) => setSchemeInfo(e.target.value)}
              placeholder="e.g. PM-JAY card, Ration Card ID"
              className="form-input"
            />
          </div>
        </div>

        {/* Photo upload container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={24} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, border: '1px solid var(--primary)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
            <Upload size={14} /> Profile photo
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              onChange={handlePhotoChange} 
              style={{ display: 'none' }} 
            />
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MIME checked (JPEG, PNG, WebP)</span>
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

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', minHeight: '44px', marginTop: '4px' }} disabled={loading}>
          {loading ? 'Saving...' : <><Plus size={16} /> Save Family Profile</>}
        </button>
      </form>

      {savedMsg && (
        <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Check size={16} /> {savedMsg}
        </p>
      )}

      {/* Household Members List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {members.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '12px' }}>
            No household members added yet.
          </p>
        ) : (
          members.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {m.profileImage?.secureUrl ? (
                    <img src={m.profileImage.secureUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Users size={20} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{m.name}</strong> 
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}> ({m.relationship}, Age: {m.age || calculateAge(m.dateOfBirth || '')})</span>
                  {m.schemeInfo && (
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                      📋 Doc: {m.schemeInfo}
                    </span>
                  )}
                </div>
              </div>

              <button 
                onClick={() => handleRemoveMember(m.id)}
                className="btn btn-outline"
                style={{ padding: '4px 10px', fontSize: '0.78rem', minHeight: '32px', color: 'var(--emergency)', borderColor: 'var(--emergency-light)' }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
