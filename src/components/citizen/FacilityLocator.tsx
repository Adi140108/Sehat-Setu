import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Facility, FacilityType, IntentResult } from '../../types';
import { accessRouter } from '../../services/facilities/accessRouter';
import type { RankedFacilityResult } from '../../services/facilities/accessRouter';
import { savedFacilitiesRepository } from '../../services/repositories';
import { FacilityMap } from './FacilityMap';
import { FacilityReporter } from './FacilityReporter';
import { analyticsService } from '../../services/analytics/analyticsService';
import { checkLocationInKarnataka } from '../../services/location/geofencing';
import { OutsideKarnatakaScreen } from './OutsideKarnatakaScreen';
import { 
  Building2, 
  Search, 
  MapPin, 
  Navigation, 
  Map, 
  List, 
  CheckCircle2, 
  Compass, 
  HelpCircle,
  Bookmark,
  BookmarkMinus,
  AlertTriangle,
  Play
} from 'lucide-react';

interface FacilityLocatorProps {
  initialSearchTerm?: string;
  onStartJourney?: (facility: any) => void;
  onBack?: () => void;
}

export const FacilityLocator: React.FC<FacilityLocatorProps> = ({ 
  initialSearchTerm,
  onStartJourney,
  onBack
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [selectedType, setSelectedType] = useState<FacilityType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [userGps, setUserGps] = useState<{ lat?: number; lng?: number }>({});
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsErrorDetails, setGpsErrorDetails] = useState<string | null>(null);
  const [outsideKarnataka, setOutsideKarnataka] = useState<boolean>(false);
  const [rankedResults, setRankedResults] = useState<RankedFacilityResult[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // States for interactive panels
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null);
  const [expandedBeforeId, setExpandedBeforeId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [reportingFacility, setReportingFacility] = useState<{ id: string; name: string } | null>(null);

  // Auto-detect offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load user saved facilities list
  const loadSavedList = async () => {
    const list = await savedFacilitiesRepository.getAll();
    setSavedIds(list.map(item => item.facilityId));
  };

  useEffect(() => {
    loadSavedList();
  }, []);

  // Geolocation detection explicitly triggered with consent (Rule 16)
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('FAILED');
      setGpsErrorDetails('Location services not supported in this browser.');
      return;
    }

    setGpsStatus('LOADING');
    setGpsErrorDetails(null);
    setOutsideKarnataka(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracy(accuracy);

        // Check if inside Karnataka polygon (local point-in-polygon geofencing)
        const fenceResult = checkLocationInKarnataka(latitude, longitude);
        if (!fenceResult.insideKarnataka) {
          setOutsideKarnataka(true);
          setGpsStatus('FAILED');
          setGpsErrorDetails('LOCATION_OUTSIDE_KARNATAKA');
          return;
        }

        // Accuracy guard check
        if (accuracy > 5000) {
          setGpsStatus('FAILED');
          setGpsErrorDetails('LOCATION_INACCURATE');
          return;
        }

        setUserGps({ lat: latitude, lng: longitude });
        setGpsStatus('SUCCESS');
      },
      (err) => {
        console.warn('Auto GPS detection failed or rejected:', err.message);
        setGpsStatus('FAILED');
        if (err.code === err.PERMISSION_DENIED) {
          setGpsErrorDetails('LOCATION_DENIED');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsErrorDetails('LOCATION_UNAVAILABLE');
        } else if (err.code === err.TIMEOUT) {
          setGpsErrorDetails('LOCATION_TIMEOUT');
        } else {
          setGpsErrorDetails(err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Trigger ranking router on query changes
  const runRoutingQuery = async () => {
    setIsOffline(!navigator.onLine);

    // Validate manual search term for Karnataka geofencing (Scope: 56-59 PIN range, or Karnataka districts)
    if (searchTerm.trim()) {
      const cleanTerm = searchTerm.trim().toLowerCase();
      const isPin = /^\d{6}$/.test(cleanTerm);
      if (isPin) {
        const prefix = cleanTerm.substring(0, 2);
        if (!['56', '57', '58', '59'].includes(prefix)) {
          setOutsideKarnataka(true);
          return;
        }
      } else if (cleanTerm.length > 3) {
        const nonKarnatakaTerms = [
          'delhi', 'mumbai', 'chennai', 'kolkata', 'hyderabad', 'pune', 'goa', 'kerala',
          'tamil nadu', 'maharashtra', 'andhra pradesh', 'telangana', 'gujarat', 'rajasthan'
        ];
        const matchedNonKar = nonKarnatakaTerms.some(term => cleanTerm.includes(term));
        
        if (matchedNonKar) {
          setOutsideKarnataka(true);
          return;
        }
      }
    }

    const mockIntent: IntentResult = {
      category: selectedType === 'PMJAY_EMPANELLED' 
        ? 'FIND_PMJAY_FACILITY' 
        : (selectedType === 'ALL' ? 'FIND_NEARBY_FACILITY' : `FIND_${selectedType}` as any),
      confidence: 0.95,
      language: 'en',
      isEmergency: false,
      extractedEntities: {
        district: searchTerm.length > 3 && isNaN(Number(searchTerm)) ? searchTerm : undefined,
        pincode: searchTerm.length === 6 && !isNaN(Number(searchTerm)) ? searchTerm : undefined,
        location: {
          type: searchTerm.length === 6 ? 'PINCODE' : 'DISTRICT_OR_CITY',
          value: searchTerm
        }
      },
      requiresClarification: false
    };

    const routerResult = await accessRouter.route(
      `REQ-${Date.now()}`,
      mockIntent,
      userGps.lat && userGps.lng ? { lat: userGps.lat, lng: userGps.lng } : undefined
    );

    setRankedResults(routerResult.results);

    // Track stages: FACILITY_SEARCH and RELEVANT_RESULT_FOUND (Funnel)
    analyticsService.trackEvent('FACILITY_SEARCH', { query: searchTerm, resultsCount: routerResult.results.length });
    if (routerResult.results.length > 0) {
      analyticsService.trackEvent('RELEVANT_RESULT_FOUND', { query: searchTerm });
    } else {
      analyticsService.trackEvent('FACILITY_NOT_FOUND', { query: searchTerm });
    }
  };

  useEffect(() => {
    runRoutingQuery();
  }, [searchTerm, selectedType, userGps]);

  const handleGetGps = () => {
    handleRequestLocation();
  };

  const handleSaveToggle = async (facility: any) => {
    const isSaved = savedIds.includes(facility.id);
    if (isSaved) {
      await savedFacilitiesRepository.delete(facility.id);
      setFeedbackMsg(`Removed ${facility.name} from saved list.`);
    } else {
      await savedFacilitiesRepository.save(facility.id, facility.name, facility.facilityType || 'Hospital');
      setFeedbackMsg(`Saved ${facility.name} to offline dashboard.`);
      analyticsService.trackEvent('FACILITY_SAVED', { facilityId: facility.id, facilityName: facility.name });
    }
    loadSavedList();
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  if (outsideKarnataka) {
    return (
      <OutsideKarnatakaScreen 
        onChangeLocation={() => {
          setOutsideKarnataka(false);
          setGpsStatus('IDLE');
          setSearchTerm('');
        }}
        onExploreDemo={() => {
          setOutsideKarnataka(false);
          setGpsStatus('SUCCESS');
          setUserGps({ lat: 12.9716, lng: 77.5946 }); // Bengaluru coordinates for demo exploration!
        }}
        onGoHome={onBack || (() => window.location.reload())}
      />
    );
  }

  const plainFacilitiesList = rankedResults.map(r => r.facility as Facility);

  return (
    <div className="animate-fade-in-up" style={{ marginTop: '16px' }}>
      
      {isOffline && (
        <div style={{
          background: 'var(--emergency-bg)',
          color: 'var(--emergency)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          fontWeight: 700,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderLeft: '4px solid var(--emergency)'
        }}>
          <AlertTriangle size={18} />
          <span>You are offline. Connect to the internet to search current live facility data. Showing cached local rosters.</span>
        </div>
      )}

      {/* Explicit Location Request Consent Banner (Rule 16) */}
      {gpsStatus !== 'SUCCESS' && (
        <div className="card-glass animate-fade-in" style={{ padding: '20px', background: 'var(--primary-light)', borderColor: 'var(--primary)', marginBottom: '16px', textAlign: 'left' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', margin: 0, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📍 Use your current location
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, marginBottom: '16px', lineHeight: 1.4 }}>
            Sehat Setu uses your location to find verified healthcare services near you (Scope: Karnataka).
          </p>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              onClick={handleRequestLocation}
              disabled={gpsStatus === 'LOADING'}
              className="btn btn-primary"
              style={{ padding: '0 16px', minHeight: '38px', fontSize: '0.8rem', textTransform: 'none' }}
            >
              {gpsStatus === 'LOADING' ? 'Detecting Location...' : 'Allow Location'}
            </button>
            <button 
              type="button"
              onClick={() => {
                setGpsStatus('FAILED');
                setGpsErrorDetails('LOCATION_DENIED');
              }}
              className="btn btn-outline"
              style={{ padding: '0 16px', minHeight: '38px', fontSize: '0.8rem', textTransform: 'none', background: '#fff' }}
            >
              Enter Location Manually
            </button>
          </div>

          {gpsErrorDetails && (
            <div style={{ color: 'var(--emergency)', fontSize: '0.78rem', marginTop: '10px', fontWeight: 700 }}>
              ⚠️ {gpsErrorDetails === 'LOCATION_DENIED' ? 'Location permission was denied. Enter manual parameters below.' : 
                  (gpsErrorDetails === 'LOCATION_INACCURATE' ? 'Location signal is inaccurate. Please try again or enter details below.' : 
                  `Location status: ${gpsErrorDetails.replace(/_/g, ' ')}`)}
            </div>
          )}
        </div>
      )}

      {/* GPS Status Info badge when successful */}
      {gpsStatus === 'SUCCESS' && userGps.lat && userGps.lng && (
        <div className="badge badge-success animate-fade-in" style={{ padding: '8px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
          <Compass size={14} className="animate-pulse" /> 
          <span>GPS set: {userGps.lat.toFixed(4)}, {userGps.lng.toFixed(4)} {gpsAccuracy ? `(Accuracy: ±${gpsAccuracy.toFixed(0)}m)` : ''}</span>
          <button 
            onClick={() => {
              setGpsStatus('IDLE');
              setUserGps({});
              setGpsAccuracy(null);
            }} 
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 2px', marginLeft: '4px', textDecoration: 'underline', fontSize: '0.75rem' }}
          >
            Clear GPS
          </button>
        </div>
      )}

      {feedbackMsg && (
        <div style={{
          background: 'var(--success-bg)',
          color: 'var(--success)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderLeft: '4px solid var(--success)'
        }}>
          <CheckCircle2 size={18} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="card-glass" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Building2 size={24} /> {t.findFacility || 'Find Facility'}
          </h3>
          
          {gpsStatus === 'SUCCESS' && (
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} className="animate-pulse" /> GPS Location Enabled
            </span>
          )}
          {gpsStatus === 'LOADING' && (
            <span className="badge badge-teal" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} style={{ animation: 'spin 2s linear infinite' }} /> Detecting GPS...
            </span>
          )}
        </div>

        {/* Search Input and Location Fallback Trigger */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: '260px', display: 'flex', gap: '6px' }}>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by District, Taluk, Pincode (e.g. Kolar, 563101)"
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
            <MapPin size={18} /> {gpsStatus === 'SUCCESS' ? 'Recalculate Distance' : 'Use My GPS'}
          </button>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
          <button 
            onClick={() => setSelectedType('ALL')}
            className={`btn ${selectedType === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.825rem', minHeight: '32px', flexShrink: 0 }}
          >
            All Facilities
          </button>
          <button 
            onClick={() => setSelectedType('GOVERNMENT_HOSPITAL')}
            className={`btn ${selectedType === 'GOVERNMENT_HOSPITAL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.825rem', minHeight: '32px', flexShrink: 0 }}
          >
            Govt Hospitals
          </button>
          <button 
            onClick={() => setSelectedType('PHC')}
            className={`btn ${selectedType === 'PHC' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.825rem', minHeight: '32px', flexShrink: 0 }}
          >
            PHCs
          </button>
          <button 
            onClick={() => setSelectedType('CHC')}
            className={`btn ${selectedType === 'CHC' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.825rem', minHeight: '32px', flexShrink: 0 }}
          >
            CHCs
          </button>
          <button 
            onClick={() => setSelectedType('DISTRICT_HOSPITAL')}
            className={`btn ${selectedType === 'DISTRICT_HOSPITAL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.825rem', minHeight: '32px', flexShrink: 0 }}
          >
            District Hospitals
          </button>
          <button 
            onClick={() => setSelectedType('PMJAY_EMPANELLED')}
            className={`btn ${selectedType === 'PMJAY_EMPANELLED' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.825rem', minHeight: '32px', flexShrink: 0 }}
          >
            PM-JAY Empanelled
          </button>
          <button 
            onClick={() => setSelectedType('JAN_AUSHADHI')}
            className={`btn ${selectedType === 'JAN_AUSHADHI' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 14px', fontSize: '0.825rem', minHeight: '32px', flexShrink: 0 }}
          >
            Jan Aushadhi Stores
          </button>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Found {rankedResults.length} access matches
          </span>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`btn ${viewMode === 'LIST' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: '30px', borderRadius: 'var(--radius-sm)' }}
            >
              <List size={14} /> List
            </button>
            <button 
              onClick={() => setViewMode('MAP')}
              className={`btn ${viewMode === 'MAP' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 12px', fontSize: '0.8rem', minHeight: '30px', borderRadius: 'var(--radius-sm)' }}
            >
              <Map size={14} /> Map
            </button>
          </div>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'MAP' && rankedResults.length > 0 && (
        <div style={{ marginBottom: '20px' }} className="animate-fade-in">
          <FacilityMap facilities={plainFacilitiesList} centerLat={userGps.lat} centerLng={userGps.lng} />
        </div>
      )}

      {/* Facility Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
        {rankedResults.length === 0 ? (
          <div className="card-glass" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Building2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px', marginLeft: 'auto', marginRight: 'auto' }} />
            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Facilities Found</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Ensure search query matches processed Karnataka locations like Kolar or Bagalkot.
            </p>
          </div>
        ) : (
          rankedResults.map(({ facility, distanceKm, rankingScore, matchReasons }) => {
            const isSaved = savedIds.includes(facility.id);
            const isPmjay = facility.schemeAssociations?.includes('scheme-pmjay') || facility.schemesSupported?.includes('scheme-pmjay');

            return (
              <div key={facility.id} className="card-glass animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Header Information */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-teal" style={{ fontWeight: 800, fontSize: '0.78rem' }}>
                        Relevance: {Math.round(rankingScore * 100)}%
                      </span>
                      {isPmjay && (
                        <span className="badge badge-success" style={{ fontWeight: 800, fontSize: '0.78rem' }}>
                          PM-JAY Listed
                        </span>
                      )}
                    </div>
                    
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', marginTop: '6px', marginBottom: 0 }}>
                      {facility.name}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                      📍 {facility.address || `${facility.name}, ${facility.district}`}
                    </p>
                  </div>

                  {distanceKm !== undefined && (
                    <span className="badge badge-outline" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                      🧭 {distanceKm} km away
                    </span>
                  )}
                </div>

                {/* Match Signals Explanations */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', background: 'var(--bg-subtle)' }}>
                  <button 
                    onClick={() => setExpandedWhyId(expandedWhyId === facility.id ? null : facility.id)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}
                  >
                    <HelpCircle size={15} /> Why this facility? {expandedWhyId === facility.id ? "▲" : "▼"}
                  </button>

                  {expandedWhyId === facility.id && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="animate-fade-in">
                      {matchReasons.map((reason, rIdx) => (
                        <div key={rIdx}>✓ {reason}</div>
                      ))}
                      <div>✓ Data Source: {facility.source?.sourceName || "Karnataka State Roster 2025"}</div>
                    </div>
                  )}
                </div>

                {/* "Before You Go" checklists */}
                <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                  <button 
                    onClick={() => setExpandedBeforeId(expandedBeforeId === facility.id ? null : facility.id)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}
                  >
                    ⚠️ Before You Go checklist {expandedBeforeId === facility.id ? "▲" : "▼"}
                  </button>

                  {expandedBeforeId === facility.id && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="animate-fade-in">
                      <div>• **Scheme eligibility:** This facility is listed as supporting {isPmjay ? "AB-PMJAY eligibility." : "Standard state NHM health schemes."}</div>
                      {isPmjay && (
                        <div style={{ color: 'var(--emergency)', fontWeight: 600 }}>
                          • **Mandatory Documents:** Carry Aadhaar Card and Ration Card (BPL) to verify scheme eligibility at the admission desk.
                        </div>
                      )}
                      <div>• **Freshness:** Data verified on {facility.lastVerifiedAt ? new Date(facility.lastVerifiedAt).toLocaleDateString() : "2026-08-11"}.</div>
                    </div>
                  )}
                </div>

                {/* Card Action Drawer Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '6px' }}>
                  
                  {/* Save toggle */}
                  <button 
                    onClick={() => handleSaveToggle(facility)}
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '0.825rem', minHeight: '38px', flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {isSaved ? <BookmarkMinus size={15} /> : <Bookmark size={15} />}
                    {isSaved ? "Saved" : "Save Offline"}
                  </button>

                  {/* Report Issue */}
                  <button 
                    onClick={() => setReportingFacility({ id: facility.id, name: facility.name })}
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '0.825rem', minHeight: '38px', flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                  >
                    <AlertTriangle size={15} /> Report Issue
                  </button>

                  {facility.latitude && facility.longitude && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => analyticsService.trackEvent('DIRECTIONS_OPENED', { facilityId: facility.id, facilityName: facility.name })}
                      className="btn btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.825rem', minHeight: '38px', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Navigation size={15} /> Map Directions
                    </a>
                  )}

                  {onStartJourney && (
                    <button 
                      onClick={() => {
                        analyticsService.trackEvent('FACILITY_SELECTED', { facilityId: facility.id, facilityName: facility.name });
                        onStartJourney(facility);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.825rem', minHeight: '38px', flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Play size={15} fill="currentColor" /> Start Journey
                    </button>
                  )}

                </div>

              </div>
            );
          })
        )}
      </div>

      {reportingFacility && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <FacilityReporter 
            facilityId={reportingFacility.id} 
            facilityName={reportingFacility.name} 
            onClose={() => setReportingFacility(null)} 
          />
        </div>
      )}

    </div>
  );
};
