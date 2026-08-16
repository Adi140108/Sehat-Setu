import React, { useState, useEffect } from 'react';
import type { JanaushadhiKendra } from '../../types';
import { savedFacilitiesRepository } from '../../services/repositories';
import { 
  Phone, 
  Navigation, 
  Bookmark, 
  BookmarkMinus,
  Info
} from 'lucide-react';
import { logJanaushadhiAnalytics } from '../../services/janaushadhi/productMatcher';

interface JanAushadhiKendraDetailProps {
  kendra: JanaushadhiKendra;
  distanceKm?: number;
  onBack: () => void;
}

export const JanAushadhiKendraDetail: React.FC<JanAushadhiKendraDetailProps> = ({
  kendra,
  distanceKm,
  onBack
}) => {
  const [isSaved, setIsSaved] = useState(false);

  const checkSavedStatus = async () => {
    const list = await savedFacilitiesRepository.getAll();
    setIsSaved(list.some(item => item.facilityId === kendra.id));
  };

  useEffect(() => {
    checkSavedStatus();
  }, [kendra.id]);

  const handleSaveToggle = async () => {
    if (isSaved) {
      await savedFacilitiesRepository.delete(kendra.id);
      setIsSaved(false);
    } else {
      await savedFacilitiesRepository.save(kendra.id, kendra.name, 'JAN_AUSHADHI');
      setIsSaved(true);
    }
  };

  const handleCall = () => {
    if (kendra.phone) {
      logJanaushadhiAnalytics('CALL_INITIATED', { kendraId: kendra.id });
      window.location.href = `tel:${kendra.phone}`;
    }
  };

  const handleDirections = () => {
    logJanaushadhiAnalytics('DIRECTIONS_OPENED', { kendraId: kendra.id });
  };

  const hasGps = kendra.latitude !== undefined && kendra.longitude !== undefined && kendra.latitude !== null && kendra.longitude !== null;

  return (
    <div className="card-glass animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
        <div>
          <span className="badge badge-teal" style={{ fontWeight: 800, fontSize: '0.78rem' }}>
            Store Code: {kendra.kendraCode}
          </span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 950, color: 'var(--primary)', marginTop: '4px', margin: 0 }}>
            {kendra.name}
          </h3>
          {distanceKm !== undefined && (
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginTop: '4px', margin: 0 }}>
              🧭 Located {distanceKm} km away
            </p>
          )}
        </div>
      </div>

      {/* Address Block */}
      <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.9rem', lineHeight: '1.5' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>ADDRESS</span>
        <strong>{kendra.address}</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>District:</span> {kendra.district}
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Taluk:</span> {kendra.taluk || 'N/A'}
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>PIN Code:</span> {kendra.pincode}
          </div>
        </div>
      </div>

      {/* STOCK AVAILABILITY DISCLAIMER (CRITICAL RULE) */}
      <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Stock Notice:</strong> This Kendra's current stock availability is not verified in real-time. Call the Kendra or visit in-person to confirm if they have the product in stock.
        </div>
      </div>

      {/* Actions Drawer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        
        {kendra.phone ? (
          <button 
            onClick={handleCall}
            className="btn btn-primary"
            style={{ minHeight: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.925rem' }}
          >
            <Phone size={18} /> CALL TO CONFIRM AVAILABILITY ({kendra.phone})
          </button>
        ) : (
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', textAlign: 'center' }}>
            ☎ Phone number unavailable for this Kendra.
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleSaveToggle}
            className="btn btn-outline"
            style={{ flex: 1, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            {isSaved ? <BookmarkMinus size={18} /> : <Bookmark size={18} />}
            {isSaved ? 'Saved Kendra' : 'Save Kendra'}
          </button>

          {hasGps ? (
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${kendra.latitude},${kendra.longitude}`}
              target="_blank"
              rel="noreferrer"
              onClick={handleDirections}
              className="btn btn-secondary"
              style={{ flex: 1, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Navigation size={18} /> Directions Map
            </a>
          ) : (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kendra.name + ', ' + kendra.address + ', ' + kendra.district)}`}
              target="_blank"
              rel="noreferrer"
              onClick={handleDirections}
              className="btn btn-secondary"
              style={{ flex: 1, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Navigation size={18} /> Search Map
            </a>
          )}
        </div>

      </div>

      {/* Roster Provenance */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Roster: {kendra.source?.sourceName}</span>
        <span>Verified: {kendra.source?.sourceDate}</span>
      </div>

      <button onClick={onBack} className="btn btn-secondary" style={{ width: '100%', minHeight: '44px' }}>
        Back
      </button>

    </div>
  );
};
