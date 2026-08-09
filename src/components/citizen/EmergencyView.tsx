import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Facility } from '../../types';
import { AlertOctagon, PhoneCall, Navigation, ArrowLeft, ShieldAlert } from 'lucide-react';

interface EmergencyViewProps {
  emergencyFacilities: Facility[];
  onBack: () => void;
}

export const EmergencyView: React.FC<EmergencyViewProps> = ({ emergencyFacilities, onBack }) => {
  const { t } = useLanguage();

  return (
    <div style={{
      background: 'var(--emergency-bg)',
      border: '2px solid var(--emergency-red)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: 'var(--shadow-lg)',
      marginTop: '12px'
    }}>
      
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="btn btn-outline" 
        style={{ marginBottom: '16px', background: '#fff', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} /> Return to Home
      </button>

      {/* High Visibility Alert Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'var(--emergency-red)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px auto',
          boxShadow: '0 4px 20px rgba(211, 47, 47, 0.4)'
        }}>
          <AlertOctagon size={42} />
        </div>
        
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--emergency-red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🚨 {t.emergencyTitle}
        </h2>
        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#333', marginTop: '6px' }}>
          "{t.emergencySubtitle}"
        </p>
        <p style={{ fontSize: '0.95rem', color: '#555', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0 auto' }}>
          {t.emergencyActionText}
        </p>
      </div>

      {/* Main Call Action Button */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <a 
          href="tel:108" 
          className="btn btn-emergency"
          style={{ padding: '16px 32px', fontSize: '1.3rem', width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-lg)' }}
        >
          <PhoneCall size={26} /> {t.callEmergencyBtn}
        </a>
      </div>

      {/* Safety Boundary Disclaimer */}
      <div style={{ background: '#ffffff', borderLeft: '4px solid var(--emergency-red)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--emergency-red)' }}>
          <ShieldAlert size={18} />
          <span>Safety Notice: No Diagnosis</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', margin: 0 }}>
          Sehat Setu does not offer medical advice or diagnosis. If you are experiencing chest pain, difficulty breathing, or trauma, contact emergency personnel immediately.
        </p>
      </div>

      {/* Nearby Emergency Facilities */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--emergency-red)', marginBottom: '12px' }}>
          🏥 Nearest Emergency & Trauma Centers:
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {emergencyFacilities.map((facility) => (
            <div key={facility.id} style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#111' }}>{facility.name}</h4>
                <p style={{ fontSize: '0.85rem', color: '#555', margin: '2px 0' }}>📍 {facility.address}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span className="badge badge-emergency">24x7 Emergency Room</span>
                  {facility.distanceKm && (
                    <span className="badge badge-teal">{facility.distanceKm} km away</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a 
                  href={`tel:${facility.phone}`}
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', fontSize: '0.85rem', minHeight: '38px' }}
                >
                  <PhoneCall size={16} /> Call Hospital
                </a>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                  style={{ padding: '8px 14px', fontSize: '0.85rem', minHeight: '38px' }}
                >
                  <Navigation size={16} /> Directions
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
