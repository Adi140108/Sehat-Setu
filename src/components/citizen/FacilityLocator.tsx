import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Facility, FacilityType } from '../../types';
import { searchFacilities } from '../../services/facilities/facilityService';
import { createReferral } from '../../services/firebase/firestoreService';
import { FacilityMap } from './FacilityMap';
import { Building2, Search, MapPin, Phone, Navigation, Map, List, CheckCircle2, ShieldCheck } from 'lucide-react';

interface FacilityLocatorProps {
  initialSearchTerm?: string;
}

export const FacilityLocator: React.FC<FacilityLocatorProps> = ({ initialSearchTerm }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [selectedType, setSelectedType] = useState<FacilityType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [userGps, setUserGps] = useState<{ lat?: number; lng?: number }>({});
  const [referralSuccessMsg, setReferralSuccessMsg] = useState('');

  const facilities = searchFacilities({
    pincodeOrCity: searchTerm,
    type: selectedType === 'ALL' ? undefined : selectedType,
    lat: userGps.lat,
    lng: userGps.lng
  });

  const handleGetGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          alert('GPS permission not granted. You can search by entering your Pincode or City name.');
        }
      );
    }
  };

  const handleLogReferral = (facility: Facility) => {
    createReferral('citizen-user', facility.id, facility.name, 'Navigated via Sehat Setu');
    setReferralSuccessMsg(`Referral logged for ${facility.name}. Follow-up reminder scheduled!`);
    setTimeout(() => setReferralSuccessMsg(''), 4000);
  };

  return (
    <div style={{ marginTop: '16px' }}>
      
      {/* Top Bar */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-teal)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={22} /> {t.findFacility}
        </h3>

        {/* Search Inputs */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div style={{ flex: 1, minWidth: '240px', display: 'flex', gap: '6px' }}>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.pincodePlaceholder}
              className="form-input"
            />
            <button className="btn btn-primary">
              <Search size={18} />
            </button>
          </div>

          <button 
            onClick={handleGetGps} 
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <MapPin size={16} /> {t.useMyLocation}
          </button>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button 
            onClick={() => setSelectedType('ALL')}
            className={`btn ${selectedType === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: '32px' }}
          >
            All Facilities
          </button>
          <button 
            onClick={() => setSelectedType('GOVERNMENT_HOSPITAL')}
            className={`btn ${selectedType === 'GOVERNMENT_HOSPITAL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: '32px' }}
          >
            Govt Hospitals
          </button>
          <button 
            onClick={() => setSelectedType('PMJAY_EMPANELLED')}
            className={`btn ${selectedType === 'PMJAY_EMPANELLED' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: '32px' }}
          >
            PM-JAY Empanelled
          </button>
          <button 
            onClick={() => setSelectedType('JAN_AUSHADHI')}
            className={`btn ${selectedType === 'JAN_AUSHADHI' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: '32px' }}
          >
            Jan Aushadhi Stores
          </button>
          <button 
            onClick={() => setSelectedType('PRIMARY_HEALTH_CENTRE')}
            className={`btn ${selectedType === 'PRIMARY_HEALTH_CENTRE' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: '32px' }}
          >
            PHC / CHC
          </button>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Showing {facilities.length} verified facilities
          </span>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`btn ${viewMode === 'LIST' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '30px' }}
            >
              <List size={14} /> List
            </button>
            <button 
              onClick={() => setViewMode('MAP')}
              className={`btn ${viewMode === 'MAP' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '30px' }}
            >
              <Map size={14} /> Interactive Map
            </button>
          </div>
        </div>
      </div>

      {referralSuccessMsg && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success-green)', padding: '10px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {referralSuccessMsg}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'MAP' && (
        <div style={{ marginBottom: '20px' }}>
          <FacilityMap facilities={facilities} centerLat={userGps.lat} centerLng={userGps.lng} />
        </div>
      )}

      {/* Facility Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {facilities.length === 0 ? (
          <div className="card-glass" style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{t.noFacilityFound}</p>
          </div>
        ) : (
          facilities.map(facility => (
            <div key={facility.id} className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-teal)' }}>
                    {facility.name}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    📍 {facility.address}, {facility.district}, {facility.state} - {facility.pincode}
                  </p>
                </div>

                {facility.distanceKm !== undefined && (
                  <span className="badge badge-teal" style={{ fontSize: '0.85rem' }}>
                    {facility.distanceKm} km away
                  </span>
                )}
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-success">
                  <ShieldCheck size={12} /> {facility.type.replace(/_/g, ' ')}
                </span>
                
                {facility.emergencyAvailable && (
                  <span className="badge badge-emergency">24x7 Emergency Room</span>
                )}

                {facility.schemesSupported.includes('scheme-pmjay') && (
                  <span className="badge badge-teal">{t.pmjayAvailable}</span>
                )}

                {facility.type === 'JAN_AUSHADHI' && (
                  <span className="badge badge-teal">{t.janAushadhiAvailable}</span>
                )}
              </div>

              {/* Services List */}
              <p style={{ fontSize: '0.82rem', color: '#444' }}>
                <strong>Services:</strong> {facility.services.join(', ')}
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <a 
                  href={`tel:${facility.phone}`}
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: '36px' }}
                >
                  <Phone size={14} /> {t.callFacility}
                </a>

                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: '36px' }}
                >
                  <Navigation size={14} /> {t.getDirections}
                </a>

                <button
                  onClick={() => handleLogReferral(facility)}
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '0.85rem', minHeight: '36px' }}
                >
                  <CheckCircle2 size={14} /> I Plan to Visit
                </button>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
