import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Facility } from '../../types';
import { Phone, Navigation } from 'lucide-react';

// Custom SVG map marker pin icons
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Leaflet map component does not automatically re-center when the center prop changes.
// This sub-component handles updating the view dynamically when coordinates change.
const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

interface FacilityMapProps {
  facilities: Facility[];
  centerLat?: number;
  centerLng?: number;
}

export const FacilityMap: React.FC<FacilityMapProps> = ({ facilities, centerLat, centerLng }) => {
  // Determine dynamic map center based on facilities, user GPS, or default India center
  const centerLatitude = centerLat ?? (facilities.length > 0 ? facilities[0].latitude : 20.5937);
  const centerLongitude = centerLng ?? (facilities.length > 0 ? facilities[0].longitude : 78.9629);
  
  const mapCenter: [number, number] = [centerLatitude, centerLongitude];
  const zoomLevel = centerLat && centerLng ? 12 : (facilities.length > 0 ? 11 : 5);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer 
        center={mapCenter} 
        zoom={zoomLevel} 
        scrollWheelZoom={false}
        style={{ height: '380px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Dynamic map view centering component */}
        <ChangeView center={mapCenter} zoom={zoomLevel} />
        
        {facilities.map((f) => (
          <Marker key={f.id} position={[f.latitude, f.longitude]} icon={defaultIcon}>
            <Popup>
              <div style={{ padding: '2px', minWidth: '180px', fontFamily: 'var(--font)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--primary)' }}>
                  {f.name}
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: '1.3' }}>
                  📍 {f.address}
                </p>
                {f.distanceKm !== undefined && (
                  <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent)', margin: '0 0 8px 0' }}>
                    🧭 {f.distanceKm} km away
                  </p>
                )}
                
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <a 
                    href={`tel:${f.phone}`} 
                    style={{ textDecoration: 'none', background: 'var(--primary)', color: '#fff', padding: '5px 10px', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  >
                    <Phone size={12} /> Call
                  </a>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ textDecoration: 'none', background: 'var(--accent)', color: '#fff', padding: '5px 10px', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  >
                    <Navigation size={12} /> Route
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
