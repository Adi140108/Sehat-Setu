import React, { useState, useEffect } from 'react';
import { 
  Compass
} from 'lucide-react';
import { db, auth } from '../../services/firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { schemeService } from '../../services/schemes/schemeService';
import { getHouseholdMembers } from '../../services/firebase/firestoreService';
import { FeedbackWidget } from './FeedbackWidget';
import { analyticsService } from '../../services/analytics/analyticsService';
import type { HouseholdMember } from '../../types';

export interface JourneyStep {
  name: string;
  status: 'PENDING' | 'COMPLETED';
  completedAt?: string;
}

export interface HealthcareJourney {
  journeyId: string;
  userId: string;
  familyMemberId: string; // "self" or familyMemberId (mem-xyz)
  intent: string;
  schemeId: string | null;
  facilityId: string;
  facilityName: string;
  facilityAddress: string;
  facilityLat?: number;
  facilityLng?: number;
  status: 'DISCOVERED' | 'FACILITY_SELECTED' | 'DOCUMENTS_PREPARED' | 'DIRECTIONS_OPENED' | 'VISIT_STARTED' | 'COMPLETED' | 'CANCELLED';
  steps: JourneyStep[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface HealthcareJourneyViewProps {
  initialJourney?: HealthcareJourney | null;
  facilityToSelect?: {
    id: string;
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    schemesSupported: string[];
  } | null;
  onBack: () => void;
}

export const HealthcareJourneyView: React.FC<HealthcareJourneyViewProps> = ({ 
  initialJourney = null, 
  facilityToSelect = null,
  onBack 
}) => {
  const [activeJourney, setActiveJourney] = useState<HealthcareJourney | null>(initialJourney);
  const [household, setHousehold] = useState<HouseholdMember[]>([]);
  const [selectedMember, setSelectedMember] = useState('self');
  const [selectedScheme, setSelectedScheme] = useState('PM_JAY');
  const [successMsg, setSuccessMsg] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  // Fetch household family list dynamically on mount
  useEffect(() => {
    getHouseholdMembers().then(data => setHousehold(data));
  }, []);

  // Save active journey to local storage for guests/offline fallback
  const saveLocalJourney = (journey: HealthcareJourney) => {
    try {
      const data = localStorage.getItem('sehat_setu_journeys') || '[]';
      const list = JSON.parse(data);
      const filtered = list.filter((j: any) => j.journeyId !== journey.journeyId);
      filtered.push(journey);
      localStorage.setItem('sehat_setu_journeys', JSON.stringify(filtered));
    } catch (e) {}
  };

  const handleCreateJourney = async () => {
    if (!facilityToSelect) return;
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest-user';
    const journeyId = `JRN-${Math.floor(100000 + Math.random() * 900000)}`;

    const initialSteps: JourneyStep[] = [
      { name: "Understand access requirement", status: 'COMPLETED', completedAt: new Date().toISOString() },
      { name: "Identify applicable scheme", status: 'PENDING' },
      { name: "Prepare mandatory documents", status: 'PENDING' },
      { name: "Open navigation directions", status: 'PENDING' },
      { name: "Visit facility and register at counter", status: 'PENDING' }
    ];

    const isPmjay = facilityToSelect.schemesSupported.includes('scheme-pmjay') || selectedScheme === 'PM_JAY';

    const newJourney: HealthcareJourney = {
      journeyId,
      userId,
      familyMemberId: selectedMember,
      intent: isPmjay ? "FIND_PMJAY_FACILITY" : "FIND_NEARBY_FACILITY",
      schemeId: isPmjay ? "PM_JAY" : null,
      facilityId: facilityToSelect.id,
      facilityName: facilityToSelect.name,
      facilityAddress: facilityToSelect.address,
      facilityLat: facilityToSelect.latitude,
      facilityLng: facilityToSelect.longitude,
      status: 'FACILITY_SELECTED',
      steps: initialSteps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (user) {
      try {
        await setDoc(doc(db, 'healthcareJourneys', journeyId), newJourney);
      } catch (err) {
        console.warn('Failed to save journey to Firestore, using local fallback:', err);
      }
    }

    saveLocalJourney(newJourney);
    setActiveJourney(newJourney);

    // Track Stage 6: JOURNEY_STARTED
    analyticsService.trackEvent('JOURNEY_STARTED', { journeyId, facilityId: facilityToSelect.id, facilityName: facilityToSelect.name });
  };

  const handleToggleStep = async (stepIndex: number, newStatus: 'PENDING' | 'COMPLETED') => {
    if (!activeJourney) return;

    const updatedSteps = [...activeJourney.steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined
    };

    // Calculate new overall status
    let newStatusLabel = activeJourney.status;
    if (stepIndex === 1 && newStatus === 'COMPLETED') newStatusLabel = 'FACILITY_SELECTED';
    if (stepIndex === 2 && newStatus === 'COMPLETED') newStatusLabel = 'DOCUMENTS_PREPARED';
    if (stepIndex === 3 && newStatus === 'COMPLETED') newStatusLabel = 'DIRECTIONS_OPENED';
    if (stepIndex === 4 && newStatus === 'COMPLETED') newStatusLabel = 'COMPLETED';

    const updatedJourney: HealthcareJourney = {
      ...activeJourney,
      status: newStatusLabel,
      steps: updatedSteps,
      updatedAt: new Date().toISOString(),
      completedAt: newStatusLabel === 'COMPLETED' ? new Date().toISOString() : undefined
    };

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'healthcareJourneys', activeJourney.journeyId), updatedJourney);
      } catch (err) {}
    }

    saveLocalJourney(updatedJourney);
    setActiveJourney(updatedJourney);
    
    if (newStatusLabel === 'COMPLETED') {
      setSuccessMsg("🎉 Congratulations! Healthcare access journey completed successfully.");
      analyticsService.trackEvent('JOURNEY_COMPLETED', { journeyId: activeJourney.journeyId, facilityId: activeJourney.facilityId });
      setTimeout(() => {
        setShowFeedback(true);
      }, 1000);
    }
  };

  const handleCancelJourney = async () => {
    if (!activeJourney) return;
    const updatedJourney: HealthcareJourney = {
      ...activeJourney,
      status: 'CANCELLED',
      updatedAt: new Date().toISOString()
    };

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'healthcareJourneys', activeJourney.journeyId), updatedJourney);
      } catch (err) {}
    }

    saveLocalJourney(updatedJourney);
    setActiveJourney(updatedJourney);
  };

  // Get Scheme Details
  const schemeDetails = activeJourney?.schemeId 
    ? schemeService.getSchemeById(activeJourney.schemeId) 
    : null;
  const docRequirements = activeJourney?.schemeId
    ? schemeService.getDocumentRequirements(activeJourney.schemeId)
    : null;

  // Resolve family member display name in Journey metadata
  const getFamilyMemberName = (id: string) => {
    if (id === 'self') return 'Self (Primary Account)';
    const found = household.find(h => h.id === id);
    return found ? `${found.name} (${found.relationship})` : id.toUpperCase();
  };

  if (showFeedback && activeJourney) {
    return (
      <FeedbackWidget 
        journeyId={activeJourney.journeyId} 
        facilityName={activeJourney.facilityName} 
        onClose={() => {
          setShowFeedback(false);
          onBack();
        }} 
      />
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ marginTop: '16px' }}>
      
      {successMsg && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontWeight: 600, fontSize: '0.925rem', borderLeft: '4px solid var(--success)' }}>
          {successMsg}
        </div>
      )}

      {!activeJourney ? (
        <div className="card-glass" style={{ padding: '24px', textAlign: 'center' }}>
          <Compass size={48} style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
            Start a Healthcare Journey
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '20px' }}>
            A journey guides you step-by-step to access hospital care or activate free health schemes.
          </p>

          {facilityToSelect && (
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '14px' }}>
              Target Facility: {facilityToSelect.name}
            </div>
          )}

          <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', background: 'var(--bg-subtle)' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Who is this journey for?</label>
            <select 
              value={selectedMember} 
              onChange={(e) => setSelectedMember(e.target.value)}
              className="form-input"
              style={{ width: '100%', marginBottom: '12px' }}
            >
              <option value="self">Self (Primary Account)</option>
              {household.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>
              ))}
            </select>

            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Select Associated Health Scheme</label>
            <select
              value={selectedScheme}
              onChange={(e) => setSelectedScheme(e.target.value)}
              className="form-input"
              style={{ width: '100%', marginBottom: '16px' }}
            >
              <option value="PM_JAY">Ayushman Bharat (AB-PMJAY)</option>
              <option value="NONE">General Government Facility</option>
            </select>

            {facilityToSelect ? (
              <button 
                onClick={handleCreateJourney}
                className="btn btn-primary"
                style={{ width: '100%', minHeight: '44px' }}
              >
                Confirm & Start Access Journey
              </button>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Search and select a facility from the map/list to initialize workflow directions.
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={onBack} className="btn btn-outline">Back to Menu</button>
          </div>
        </div>
      ) : (
        <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge badge-teal" style={{ textTransform: 'uppercase', fontWeight: 800, fontSize: '0.78rem' }}>
                Active Access Journey — {getFamilyMemberName(activeJourney.familyMemberId)}
              </span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--primary)', margin: '4px 0 0 0' }}>
                {activeJourney.facilityName}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                📍 {activeJourney.facilityAddress}
              </p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${activeJourney.status === 'COMPLETED' ? 'badge-success' : (activeJourney.status === 'CANCELLED' ? 'badge-accent' : 'badge-teal')}`} style={{ fontWeight: 800 }}>
                {activeJourney.status.replace(/_/g, ' ')}
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                ID: {activeJourney.journeyId}
              </p>
            </div>
          </div>

          {/* Journey Steps Tracking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontWeight: 800, fontSize: '1rem', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
              Your Progress Workflow
            </h4>

            {activeJourney.steps.map((step, idx) => {
              const isCompleted = step.status === 'COMPLETED';
              return (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '12px 14px', 
                    border: '1.5px solid var(--border)', 
                    borderRadius: 'var(--radius-md)', 
                    background: isCompleted ? 'var(--bg-subtle)' : 'var(--bg-surface)' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: isCompleted ? 'var(--success-bg)' : 'var(--bg-subtle)', 
                      color: isCompleted ? 'var(--success)' : 'var(--text-muted)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 700, 
                        color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {step.name}
                      </span>
                      {step.completedAt && (
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Completed: {new Date(step.completedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <input 
                    type="checkbox" 
                    checked={isCompleted} 
                    onChange={(e) => handleToggleStep(idx, e.target.checked ? 'COMPLETED' : 'PENDING')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>

          {/* Scheme Requirements Box */}
          {schemeDetails && (
            <div style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
              <h4 style={{ fontWeight: 800, fontSize: '0.95rem', margin: '0 0 8px 0', color: 'var(--primary)' }}>
                📋 Scheme Guidelines: {schemeDetails.name}
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, marginBottom: '10px', lineHeight: 1.4 }}>
                {schemeDetails.description}
              </p>
              
              {docRequirements && docRequirements.documents && docRequirements.documents.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 800 }}>MANDATORY DOCUMENTS REQUIRED</span>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {docRequirements.documents.map((d: any, i: number) => (
                      <li key={i}>
                        {d.name} {d.required ? '(Required)' : '(Optional)'} - {d.notes}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Navigation link */}
          {activeJourney.facilityLat && activeJourney.facilityLng && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeJourney.facilityLat},${activeJourney.facilityLng}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
                style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                🗺️ Navigate / Get External Map Directions
              </a>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button 
              onClick={() => setShowFeedback(true)}
              className="btn btn-outline"
              style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--success)', borderColor: 'var(--success)' }}
            >
              Verify Outcome / Leave Feedback
            </button>
          </div>

          {/* Handoff actions */}
          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <button 
              onClick={handleCancelJourney} 
              className="btn btn-outline" 
              style={{ flex: 1, color: 'var(--emergency)' }}
            >
              Cancel Journey
            </button>
            <button 
              onClick={onBack} 
              className="btn btn-primary" 
              style={{ flex: 1 }}
            >
              Menu
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
