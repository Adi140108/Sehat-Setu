import React, { useState, useEffect } from 'react';
import type { JanaushadhiProduct, JanaushadhiKendra } from '../../types';
import { 
  JanAushadhiProductMatcher, 
  normalizeString,
  logJanaushadhiAnalytics
} from '../../services/janaushadhi/productMatcher.js';
import type { MatchResult } from '../../services/janaushadhi/productMatcher.js';
import { JanAushadhiProductDetail } from './JanAushadhiProductDetail';
import { JanAushadhiKendraDetail } from './JanAushadhiKendraDetail';
import { calculateDistanceKm } from '../../services/facilities/facilityService';
import { sttService } from '../../services/voice/speechToText';
import { 
  Building2, 
  Mic, 
  AlertTriangle, 
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface JanAushadhiSearchProps {
  initialSearchQuery?: string;
  onBack?: () => void;
}

export const JanAushadhiSearch: React.FC<JanAushadhiSearchProps> = ({ 
  initialSearchQuery = '',
  onBack
}) => {
  const [query, setQuery] = useState(initialSearchQuery);
  const [catalog, setCatalog] = useState<JanaushadhiProduct[]>([]);
  const [kendras, setKendras] = useState<JanaushadhiKendra[]>([]);
  const [suggestions, setSuggestions] = useState<JanaushadhiProduct[]>([]);
  const [matcher, setMatcher] = useState<JanAushadhiProductMatcher | null>(null);
  
  // States for matching output
  const [normalizerOut, setNormalizerOut] = useState<any>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [requiresClarification, setRequiresClarification] = useState(false);
  const [safetyNotice, setSafetyNotice] = useState('');
  
  // Selected Detail views
  const [selectedProduct, setSelectedProduct] = useState<JanaushadhiProduct | null>(null);
  const [selectedKendra, setSelectedKendra] = useState<JanaushadhiKendra | null>(null);
  
  // Nearby Kendras discovery
  const [nearbyKendras, setNearbyKendras] = useState<{ kendra: JanaushadhiKendra; distanceKm?: number }[]>([]);
  const [showKendrasForProduct, setShowKendrasForProduct] = useState<JanaushadhiProduct | null>(null);
  const [userGps, setUserGps] = useState<{ lat?: number; lng?: number }>({});
  const [manualLocation, setManualLocation] = useState('');
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'FAILED'>('IDLE');
  
  // Search state
  const [hasSearched, setHasSearched] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [isListening, setIsListening] = useState(false);

  const { language } = useLanguage();

  const toggleVoiceSearch = () => {
    if (isListening) {
      sttService.stop();
      setIsListening(false);
    } else {
      setVoiceError('');
      setIsListening(true);
      
      const started = sttService.start(language, {
        onResult: (text, isFinal) => {
          setQuery(text);
          if (isFinal) {
            setIsListening(false);
            handleVoiceResponse(text);
          }
        },
        onError: (err) => {
          setVoiceError(err === 'not-allowed' ? 'Microphone permission blocked.' : "Could not recognize speech.");
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        }
      });
      if (!started) {
        setIsListening(false);
        setVoiceError("Web Speech API not supported in this browser.");
      }
    }
  };

  // 1. Fetch catalog and Kendra rosters on mount (cost control cache)
  useEffect(() => {
    const loadDatasets = async () => {
      try {
        const prodRes = await fetch('/data/janaushadhiProducts.json');
        if (prodRes.ok) {
          const prods = await prodRes.json();
          setCatalog(prods);
          setMatcher(new JanAushadhiProductMatcher(prods));
        }

        const kenRes = await fetch('/data/janaushadhiKendras.json');
        if (kenRes.ok) {
          const kens = await kenRes.json();
          setKendras(kens);
        }
      } catch (err) {
        console.error("Failed to load Jan Aushadhi static cache files:", err);
      }
    };
    loadDatasets();
  }, []);

  // Sync initial query on load if present
  useEffect(() => {
    if (initialSearchQuery && matcher) {
      handleSearchSubmit(initialSearchQuery);
    }
  }, [initialSearchQuery, matcher]);

  // 2. Local GPS handler explicitly triggered by user action
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('FAILED');
      return;
    }
    setGpsStatus('LOADING');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('SUCCESS');
      },
      () => {
        setGpsStatus('FAILED');
      },
      { timeout: 8000 }
    );
  };

  // Re-run nearby Kendras lookup when user GPS coordinate changes
  useEffect(() => {
    if (showKendrasForProduct) {
      handleFindNearbyKendras(showKendrasForProduct);
    }
  }, [userGps, showKendrasForProduct]);

  // 3. Search Autocomplete Suggestions (limit count to 5 results)
  useEffect(() => {
    if (!query || query.trim().length < 3 || catalog.length === 0) {
      setSuggestions([]);
      return;
    }
    const term = normalizeString(query);
    const filtered = catalog.filter(p => 
      normalizeString(p.productName).includes(term) ||
      (p.activeIngredient && normalizeString(p.activeIngredient).includes(term)) ||
      p.productCode === query.trim()
    ).slice(0, 5);
    setSuggestions(filtered);
  }, [query, catalog]);

  const handleSearchSubmit = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setQuery(searchTerm);
    setSuggestions([]);
    
    if (!matcher) return;

    logJanaushadhiAnalytics('MEDICINE_SEARCH', { query: searchTerm, voiceUsed: false });
    
    const result = matcher.match(searchTerm);
    setNormalizerOut(result.normalizerResult);
    setMatches(result.matches);
    setRequiresClarification(result.requiresClarification);
    setSafetyNotice(result.medicalSafetyNotice);
    setHasSearched(true);
    setShowKendrasForProduct(null); // Reset Kendra list

    if (result.matches.length > 0) {
      logJanaushadhiAnalytics('CATALOG_MATCH_FOUND', { matchCount: result.matches.length });
    } else {
      logJanaushadhiAnalytics('CATALOG_MATCH_NOT_FOUND', {});
    }
  };

  // 4. Nearby Kendras lookup engine matching Module 04 criteria
  const handleFindNearbyKendras = (product: JanaushadhiProduct) => {
    setShowKendrasForProduct(product);

    let filtered = [...kendras];
    
    // Check manual filter by District or Pin Code if user typed it
    if (manualLocation.trim()) {
      const term = manualLocation.toLowerCase().trim();
      filtered = filtered.filter(k => 
        (k.pincode && k.pincode.includes(term)) || 
        (k.district && k.district.toLowerCase().includes(term)) ||
        (k.taluk && k.taluk.toLowerCase().includes(term))
      );
    }

    let mapped: { kendra: JanaushadhiKendra; distanceKm?: number }[] = [];

    if (userGps.lat && userGps.lng) {
      mapped = filtered.map(k => {
        let dist: number | undefined = undefined;
        if (k.latitude && k.longitude) {
          dist = calculateDistanceKm(userGps.lat!, userGps.lng!, k.latitude, k.longitude);
        }
        return { kendra: k, distanceKm: dist };
      });

      // Sort by closest distance first
      mapped.sort((a, b) => {
        if (a.distanceKm === undefined) return 1;
        if (b.distanceKm === undefined) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else {
      mapped = filtered.map(k => ({ kendra: k }));
    }

    setNearbyKendras(mapped.slice(0, 5)); // top 5 stores
  };

  const handleVoiceResponse = (text: string) => {
    setQuery(text);
    logJanaushadhiAnalytics('MEDICINE_SEARCH', { query: text, voiceUsed: true });
    
    if (matcher) {
      const result = matcher.match(text);
      setNormalizerOut(result.normalizerResult);
      setMatches(result.matches);
      setRequiresClarification(result.requiresClarification);
      setSafetyNotice(result.medicalSafetyNotice);
      setHasSearched(true);
      setShowKendrasForProduct(null);
    }
  };



  return (
    <div className="animate-fade-in-up" style={{ marginTop: '16px' }}>
      
      {/* Product Detail Modal */}
      {selectedProduct && (
        <JanAushadhiProductDetail 
          product={selectedProduct} 
          matchStatus={matches.find(m => m.product.productId === selectedProduct.productId)?.matchStatus}
          onFindKendras={() => {
            setSelectedProduct(null);
            handleFindNearbyKendras(selectedProduct);
          }}
          onBack={() => setSelectedProduct(null)} 
        />
      )}

      {/* Kendra Detail Modal */}
      {selectedKendra && (
        <JanAushadhiKendraDetail 
          kendra={selectedKendra}
          distanceKm={nearbyKendras.find(n => n.kendra.id === selectedKendra.id)?.distanceKm}
          onBack={() => {
            setSelectedKendra(null);
            logJanaushadhiAnalytics('KENDRA_VIEWED', { kendraId: selectedKendra.id });
          }}
        />
      )}

      {/* Main Panel View */}
      {!selectedProduct && !selectedKendra && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {onBack && (
            <div style={{ marginBottom: '8px' }}>
              <button onClick={onBack} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '6px 14px', minHeight: '34px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
            </div>
          )}

          <div className="card-glass" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, marginBottom: '14px' }}>
              💊 Search Jan Aushadhi Medicine
            </h3>

            {/* Input Bar */}
            <div style={{ display: 'flex', gap: '6px', position: 'relative', marginBottom: '10px' }}>
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Brand (e.g. Dolo 650) or Generic name"
                className="form-input"
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(query)}
              />
              
              <button 
                onClick={toggleVoiceSearch}
                className={`btn ${isListening ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  padding: '0 12px',
                  minHeight: '48px',
                  background: isListening ? 'var(--primary)' : 'transparent',
                  color: isListening ? '#ffffff' : 'var(--primary)',
                  animation: isListening ? 'mic-pulse 1.5s infinite' : 'none'
                }}
                title="Speak to search"
              >
                <Mic size={20} />
              </button>

              <button 
                onClick={() => handleSearchSubmit(query)}
                className="btn btn-primary"
                style={{ padding: '0 16px', minHeight: '48px' }}
              >
                Search
              </button>

              {/* Suggestions Overlay Dropdown */}
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '52px',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 20,
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  {suggestions.map((p, i) => (
                    <div 
                      key={i}
                      onClick={() => {
                        setQuery(p.productName);
                        handleSearchSubmit(p.productName);
                      }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      💊 <strong>{p.productName}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({p.category})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voice Listening Real-time Status Overlay */}
            {isListening && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', background: 'var(--primary-light)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                <span className="voice-bar animate-pulse" style={{ background: 'var(--primary)' }}></span>
                <span style={{ fontSize: '0.85rem', fontWeight: 650, color: 'var(--primary)' }}>
                  Listening... Speak medicine name clearly
                </span>
              </div>
            )}

            {voiceError && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--emergency)', marginTop: '6px', margin: 0 }}>
                  ⚠️ {voiceError}
                </p>
              </div>
            )}

            {/* Prominent disclaimer notice */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              <AlertTriangle size={14} style={{ color: 'var(--accent)' }} />
              <span>We do not make treatment or prescription substitution decisions. Confirm suitability with a doctor.</span>
            </div>
          </div>

          {/* Matches Output List */}
          {hasSearched && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Safety Interceptor Notice */}
              {safetyNotice && (
                <div style={{ background: 'var(--emergency-bg)', color: 'var(--emergency)', padding: '14px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--emergency)', fontSize: '0.875rem', fontWeight: 600 }}>
                  {safetyNotice}
                </div>
              )}

              {/* Normalizer output for diagnostics */}
              {normalizerOut && !safetyNotice && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  🔍 Search normalized to generic targets: <strong>{normalizerOut.possibleGeneric || 'Unknown Generic'}</strong> {normalizerOut.strength && `(${normalizerOut.strength})`}
                </div>
              )}

              {/* Clarification Alert */}
              {requiresClarification && (
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 700 }}>
                  ℹ️ Multiple catalog products match your search. Select the specific item below.
                </div>
              )}

              {/* No match output */}
              {matches.length === 0 && !safetyNotice && (
                <div className="card-glass" style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <AlertTriangle size={36} style={{ color: 'var(--text-muted)', marginBottom: '8px', marginLeft: 'auto', marginRight: 'auto' }} />
                  <p style={{ fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
                    We couldn't find a verified matching product in the available Jan Aushadhi catalog.
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Double-check spelling or try searching generic active ingredients like Paracetamol or Ibuprofen.
                  </p>
                </div>
              )}

              {/* Matched product list */}
              {matches.map(({ product, matchStatus, matchReasons }) => (
                <div key={product.productId} className="card-glass animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span className={`badge ${matchStatus.includes('EXACT') ? 'badge-success' : (matchStatus.includes('STRONG') ? 'badge-teal' : 'badge-outline')}`} style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                        {matchStatus === 'STRONG_CATALOG_MATCH' ? 'Possible catalog match' : matchStatus.replace(/_/g, ' ')}
                      </span>
                      {normalizerOut?.isBrandMapped && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary-teal)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
                          🏥 Alternative for {normalizerOut.normalizedName}
                        </div>
                      )}
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 850, color: 'var(--primary)', marginTop: '2px', margin: 0 }}>
                        {product.productName}
                      </h4>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                        Generic: {product.activeIngredient || 'N/A'} • Form: {product.dosageForm || 'Tablets'}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Catalog MRP</span>
                      <p style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
                        ₹{product.mrp}
                      </p>
                    </div>
                  </div>

                  {/* Reasons check */}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {matchReasons.map((r: string, ri: number) => <span key={ri}>✓ {r}</span>)}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                    <button 
                      onClick={() => {
                        setSelectedProduct(product);
                        logJanaushadhiAnalytics('PRODUCT_VIEWED', { productId: product.productId });
                      }} 
                      className="btn btn-outline" 
                      style={{ flex: 1, minHeight: '38px', fontSize: '0.825rem' }}
                    >
                      View Details
                    </button>
                    
                    <button 
                      onClick={() => handleFindNearbyKendras(product)} 
                      className="btn btn-primary" 
                      style={{ flex: 1, minHeight: '38px', fontSize: '0.825rem' }}
                    >
                      Find Store Nearby
                    </button>
                  </div>

                </div>
              ))}

              {/* Nearby Kendras View Drawer */}
              {showKendrasForProduct && (
                <div className="card-glass animate-fade-in" style={{ border: '2px solid var(--primary-light)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontWeight: 850, fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={20} /> Kendras for {showKendrasForProduct.productName}
                    </h4>

                    {gpsStatus === 'SUCCESS' && (
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>GPS Active</span>
                    )}
                  </div>

                  {/* Manual Pincode / District search fallback for GPS denial */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                    <input 
                      type="text"
                      value={manualLocation}
                      onChange={(e) => setManualLocation(e.target.value)}
                      placeholder="Filter by District / PIN (e.g. Kolar, 563101)"
                      className="form-input"
                      style={{ flex: 1, height: '38px' }}
                    />
                    <button 
                      onClick={() => handleFindNearbyKendras(showKendrasForProduct)} 
                      className="btn btn-secondary"
                      style={{ minHeight: '38px', fontSize: '0.825rem' }}
                    >
                      Filter
                    </button>
                    {gpsStatus !== 'SUCCESS' && (
                      <button
                        onClick={handleRequestLocation}
                        disabled={gpsStatus === 'LOADING'}
                        className="btn btn-primary"
                        style={{ minHeight: '38px', fontSize: '0.825rem', padding: '0 12px' }}
                      >
                        📍 {gpsStatus === 'LOADING' ? 'Detecting...' : 'Use GPS'}
                      </button>
                    )}
                  </div>

                  {/* Kendra Cards List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {nearbyKendras.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No nearby Kendras found. Try updating the District / PIN filter above.
                      </div>
                    ) : (
                      nearbyKendras.map(({ kendra, distanceKm }) => (
                        <div 
                          key={kendra.id} 
                          style={{
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px',
                            background: 'var(--bg-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>{kendra.name}</strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📍 {kendra.address}</span>
                            {distanceKm !== undefined && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                                🧭 {distanceKm} km away
                              </span>
                            )}
                          </div>

                          <button 
                            onClick={() => setSelectedKendra(kendra)}
                            className="btn btn-outline"
                            style={{ padding: '4px 10px', minHeight: '30px', fontSize: '0.78rem', flexShrink: 0 }}
                          >
                            Details
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
};
