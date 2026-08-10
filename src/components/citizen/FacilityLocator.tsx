import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Facility, FacilityType } from '../../types';
import { searchFacilities } from '../../services/facilities/facilityService';
import { createReferral } from '../../services/firebase/firestoreService';
import { FacilityMap } from './FacilityMap';
import { Building2, Search, MapPin, Phone, Navigation, Map, List, CheckCircle2, ShieldCheck, Compass, Info } from 'lucide-react';

interface FacilityLocatorProps {
  initialSearchTerm?: string;
}

export const FacilityLocator: React.FC<FacilityLocatorProps> = ({ initialSearchTerm }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [selectedType, setSelectedType] = useState<FacilityType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [userGps, setUserGps] = useState<{ lat?: number; lng?: number }>({});
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [referralSuccessMsg, setReferralSuccessMsg] = useState('');

  // Auto-detect user location on component load
  useEffect(() => {
    setGpsStatus('LOADING');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('SUCCESS');
        },
        (err) => {
          console.warn('Auto GPS detection failed or rejected:', err.message);
          setGpsStatus('FAILED');
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      setGpsStatus('FAILED');
    }
  }, []);

  const facilities = searchFacilities({
    pincodeOrCity: searchTerm,
    type: selectedType === 'ALL' ? undefined : selectedType,
    lat: userGps.lat,
    lng: userGps.lng
  });

  const handleGetGps = () => {
    setGpsStatus('LOADING');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('SUCCESS');
        },
        () => {
          alert('GPS permission not granted or location unavailable. You can search by entering your Pincode, City, or State name.');
          setGpsStatus('FAILED');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setGpsStatus('FAILED');
    }
  };

  const handleLogReferral = (facility: Facility) => {
    createReferral('citizen-user', facility.id, facility.name, 'Navigated via Sehat Setu');
    setReferralSuccessMsg(`Referral logged for ${facility.name}. Follow-up reminder scheduled!`);
    setTimeout(() => setReferralSuccessMsg(''), 4000);
  };

  return (
    <div className="animate-fade-in-up" style={{ marginTop: '16px' }}>
      
      {/* Search and Filters Bar */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Building2 size={24} /> {t.findFacility}
          </h3>
          {gpsStatus === 'SUCCESS' && (
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} className="animate-pulse" /> Live GPS Sorting Active
            </span>
          )}
          {gpsStatus === 'LOADING' && (
            <span className="badge badge-teal" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} style={{ animation: 'spin 2s linear infinite' }} /> Detecting Location...
            </span>
          )}
          {gpsStatus === 'FAILED' && (
            <span className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} /> Showing All (GPS Inactive)
            </span>
          )}
        </div>

        {/* Search Inputs */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: '260px', display: 'flex', gap: '6px' }}>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter Pincode, City, State or Hospital Name"
              className="form-input"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" style={{ padding: '0 16px', minWidth: '50px', minHeight: '48px' }} title="Search">
              <Search size={20} />
            </button>
          </div>

          <button 
            onClick={handleGetGps} 
            className={`btn ${gpsStatus === 'SUCCESS' ? 'btn-secondary' : 'btn-outline'}`}
            style={{ fontSize: '0.9rem', flexShrink: 0 }}
          >
            <MapPin size={18} /> {gpsStatus === 'SUCCESS' ? 'Recalculate Distance' : t.useMyLocation}
          </button>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px', maskImage: 'linear-gradient(to right, black 95%, transparent)' }}>
          <button 
            onClick={() => setSelectedType('ALL')}
            className={`btn ${selectedType === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.85rem', minHeight: '34px' }}
          >
            All Facilities
          </button>
          <button 
            onClick={() => setSelectedType('GOVERNMENT_HOSPITAL')}
            className={`btn ${selectedType === 'GOVERNMENT_HOSPITAL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.85rem', minHeight: '34px' }}
          >
            Govt Hospitals
          </button>
          <button 
            onClick={() => setSelectedType('PMJAY_EMPANELLED')}
            className={`btn ${selectedType === 'PMJAY_EMPANELLED' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.85rem', minHeight: '34px' }}
          >
            PM-JAY Empanelled
          </button>
          <button 
            onClick={() => setSelectedType('JAN_AUSHADHI')}
            className={`btn ${selectedType === 'JAN_AUSHADHI' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.85rem', minHeight: '34px' }}
          >
            Jan Aushadhi Stores
          </button>
          <button 
            onClick={() => setSelectedType('PRIMARY_HEALTH_CENTRE')}
            className={`btn ${selectedType === 'PRIMARY_HEALTH_CENTRE' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.85rem', minHeight: '34px' }}
          >
            PHC / CHC
          </button>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Found {facilities.length} verified facilities
          </span>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`btn ${viewMode === 'LIST' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 12px', fontSize: '0.85rem', minHeight: '32px', borderRadius: 'var(--radius-sm)' }}
            >
              <List size={16} /> List
            </button>
            <button 
              onClick={() => setViewMode('MAP')}
              className={`btn ${viewMode === 'MAP' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 12px', fontSize: '0.85rem', minHeight: '32px', borderRadius: 'var(--radius-sm)' }}
            >
              <Map size={16} /> Interactive Map
            </button>
          </div>
        </div>
      </div>

      {referralSuccessMsg && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontWeight: 600, fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '4px solid var(--success)', boxShadow: 'var(--shadow-sm)' }}>
          <CheckCircle2 size={20} /> {referralSuccessMsg}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'MAP' && (
        <div style={{ marginBottom: '20px' }} className="animate-fade-in">
          <FacilityMap facilities={facilities} centerLat={userGps.lat} centerLng={userGps.lng} />
        </div>
      )}

      {/* Facility Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
        {facilities.length === 0 ? (
          <div className="card-glass" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Building2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', marginLeft: 'auto', marginRight: 'auto' }} />
            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t.noFacilityFound}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>Try entering a different location search or changing the facility filter.</p>
          </div>
        ) : (
          facilities.map(facility => (
            <div key={facility.id} className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                    {facility.name}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ flexShrink: 0, marginTop: '2px' }}>📍</span> 
                    <span>{facility.address}, {facility.district}, {facility.state} - <strong>{facility.pincode}</strong></span>
                  </p>
                </div>

                {facility.distanceKm !== undefined && (
                  <span className="badge badge-teal" style={{ fontSize: '0.9rem', padding: '6px 14px', border: '1px solid rgba(11, 122, 111, 0.2)' }}>
                    🧭 {facility.distanceKm} km away
                  </span>
                )}
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span className="badge badge-success" style={{ fontWeight: 600 }}>
                  <ShieldCheck size={14} /> {facility.type.replace(/_/g, ' ')}
                </span>
                
                {facility.emergencyAvailable && (
                  <span className="badge badge-emergency" style={{ fontWeight: 600 }}>🚨 24x7 Emergency Room</span>
                )}

                {facility.schemesSupported.includes('scheme-pmjay') && (
                  <span className="badge badge-teal" style={{ fontWeight: 600 }}>💳 PM-JAY Empanelled</span>
                )}

                {facility.type === 'JAN_AUSHADHI' && (
                  <span className="badge badge-accent" style={{ fontWeight: 600 }}>💊 Generic Medicine Counter</span>
                )}
              </div>

              {/* Services & Verified Source */}
              <div style={{ background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid var(--border)', marginTop: '4px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  <strong>Available Services:</strong> {facility.services.join(', ')}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0, 0, 0, 0.05)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Source: {facility.dataSource}</span>
                  <span>Verified: {facility.lastVerifiedDate}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <a 
                  href={`tel:${facility.phone}`}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.875rem', minHeight: '40px', flex: '1 1 auto' }}
                >
                  <Phone size={16} /> {t.callFacility}
                </a>

                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ padding: '8px 18px', fontSize: '0.875rem', minHeight: '40px', flex: '1 1 auto' }}
                >
                  <Navigation size={16} /> {t.getDirections}
                </a>

                <button
                  onClick={() => handleLogReferral(facility)}
                  className="btn btn-outline"
                  style={{ padding: '8px 18px', fontSize: '0.875rem', minHeight: '40px', flex: '1 1 auto' }}
                >
                  <CheckCircle2 size={16} /> I Plan to Visit
                </button>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
