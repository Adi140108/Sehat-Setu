import React, { useState, useEffect } from 'react';
import type { HouseholdMember } from '../../types';
import { getHouseholdMembers, saveHouseholdMembers } from '../../services/firebase/firestoreService';
import { Users, Plus, Trash2, Check } from 'lucide-react';

export const FamilyProfileManager: React.FC = () => {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [relation, setRelation] = useState('Mother');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    setMembers(getHouseholdMembers());
  }, []);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !age) return;

    const newMember: HouseholdMember = {
      id: 'mem-' + Math.random().toString(36).substring(2, 7),
      name,
      age: Number(age),
      gender: 'Female',
      relationship: relation,
      hasAadhaar: true,
      hasRationCard: true
    };

    const updated = [...members, newMember];
    setMembers(updated);
    saveHouseholdMembers(updated);

    setName('');
    setAge('');
    setSavedMsg('Family member profile saved!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleRemoveMember = (id: string) => {
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    saveHouseholdMembers(updated);
  };

  return (
    <div className="card-glass" style={{ marginTop: '16px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={22} /> Optional Household Health Profile
        </h3>
        <span className="badge badge-teal">Privacy Protected</span>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Store minimal family details (age & relationship) to streamline scheme eligibility checks for family members. Sensitive medical history is <strong>never</strong> collected.
      </p>

      {/* Add Member Form */}
      <form onSubmit={handleAddMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px', background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Name / Identifier</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kamala (Mother)"
            className="form-input"
            required
          />
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Age</label>
          <input 
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : '')}
            placeholder="e.g. 72"
            className="form-input"
            required
          />
        </div>

        <div>
          <label className="form-label" style={{ fontSize: '0.8rem' }}>Relationship</label>
          <select value={relation} onChange={(e) => setRelation(e.target.value)} className="form-select">
            <option value="Mother">Mother</option>
            <option value="Father">Father</option>
            <option value="Spouse">Spouse</option>
            <option value="Child">Child</option>
            <option value="Self">Self</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', minHeight: '42px' }}>
            <Plus size={16} /> Add Member
          </button>
        </div>
      </form>

      {savedMsg && (
        <p style={{ color: 'var(--success-green)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Check size={16} /> {savedMsg}
        </p>
      )}

      {/* Household Members List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {members.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No household members added yet.
          </p>
        ) : (
          members.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)' }}>
              <div>
                <strong style={{ fontSize: '0.95rem' }}>{m.name}</strong> ({m.relationship}, Age: {m.age})
                <span className="badge badge-success" style={{ marginLeft: '8px', fontSize: '0.75rem' }}>
                  {m.age >= 70 ? 'Eligible for Ayushman 70+' : 'Standard Scheme Match'}
                </span>
              </div>
              <button 
                onClick={() => handleRemoveMember(m.id)}
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '28px', color: 'var(--emergency-red)' }}
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
