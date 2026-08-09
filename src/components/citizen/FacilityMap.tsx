import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

interface FacilityMapProps {
  facilities: Facility[];
  centerLat?: number;
  centerLng?: number;
}

export const FacilityMap: React.FC<FacilityMapProps> = ({ facilities, centerLat = 20.5937, centerLng = 78.9629 }) => {
  // Determine dynamic map center based on facilities or default India center
  const mapCenter: [number, number] = facilities.length > 0 
    ? [facilities[0].latitude, facilities[0].longitude] 
    : [centerLat, centerLng];

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      <MapContainer 
        center={mapCenter} 
        zoom={facilities.length > 0 ? 11 : 5} 
        scrollWheelZoom={false}
        style={{ height: '360px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {facilities.map((f) => (
          <Marker key={f.id} position={[f.latitude, f.longitude]} icon={defaultIcon}>
            <Popup>
              <div style={{ padding: '4px', minWidth: '200px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px 0', color: '#0d5c75' }}>
                  {f.name}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#555', margin: '0 0 6px 0' }}>
                  📍 {f.address}
                </p>
                {f.distanceKm && (
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e67e22', margin: '0 0 6px 0' }}>
                    {f.distanceKm} km away
                  </p>
                )}
                
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <a 
                    href={`tel:${f.phone}`} 
                    style={{ textDecoration: 'none', background: '#0d5c75', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Phone size={12} /> Call
                  </a>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ textDecoration: 'none', background: '#2e7d32', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
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
