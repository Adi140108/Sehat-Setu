import React from 'react';
import { ShieldAlert, Home } from 'lucide-react';

interface OutsideKarnatakaScreenProps {
  onChangeLocation: () => void;
  onExploreDemo: () => void;
  onGoHome: () => void;
}

export const OutsideKarnatakaScreen: React.FC<OutsideKarnatakaScreenProps> = ({
  onChangeLocation,
  onExploreDemo,
  onGoHome
}) => {
  return (
    <div 
      className="card-glass animate-fade-in-up" 
      style={{ 
        padding: '32px', 
        textAlign: 'center', 
        maxWidth: '480px', 
        margin: '40px auto', 
        border: '2px solid var(--accent)' 
      }}
    >
      <div 
        style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '50%', 
          background: 'var(--accent-light)', 
          color: 'var(--accent)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 18px' 
        }}
      >
        <ShieldAlert size={32} />
      </div>

      <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', margin: 0, marginBottom: '10px' }}>
        Service Region Boundary Check
      </h2>

      <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
        Sorry, our healthcare-access services are currently limited to <strong>Karnataka</strong>. We are working to expand Sehat Setu to more regions across India.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        <button 
          onClick={onChangeLocation}
          className="btn btn-primary"
          style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          📍 Enter Location Manually
        </button>

        <button 
          onClick={onExploreDemo}
          className="btn btn-outline"
          style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          🧭 Explore with Demo Environment
        </button>

        <button 
          onClick={onGoHome}
          className="btn btn-outline"
          style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Home size={16} /> Go back to Main Menu
        </button>

      </div>

      <div style={{ marginTop: '24px', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
        🔒 Geofencing polygon testing is processed locally on device. Coordinates are not stored.
      </div>
    </div>
  );
};
export default OutsideKarnatakaScreen;
