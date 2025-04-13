import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ExplosionPoint, Route, Location } from '@/lib/types';
import type { MapContainerProps } from 'react-leaflet';

// Fix for default marker icons (client-side only)
if (typeof window !== 'undefined') {
  // Import Leaflet properly
  import('leaflet').then((L) => {
    // Use type assertion to fix TypeScript error
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/dist/images/marker-icon-2x.png',
      iconUrl: '/leaflet/dist/images/marker-icon.png',
      shadowUrl: '/leaflet/dist/images/marker-shadow.png',
    });
  });
}

// Dynamic imports with SSR disabled
const MapContainer = dynamic<MapContainerProps>(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Import useMap hook
const MapController = dynamic(
  () => import('@/components/MapController').then((mod) => mod.default),
  { ssr: false }
);

const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

interface MapProps {
  explosionPoints: ExplosionPoint[];
  startPoint?: Location;
  endPoint?: Location;
  routes: Route[];
}

export default function Map({ explosionPoints, startPoint, endPoint, routes }: MapProps) {
  const [mapCenter] = useState<[number, number]>([48.6167, 32.0167]);
  const zoom = 13;

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-lg relative">
      {typeof window !== 'undefined' && (
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          className="w-full h-full"
          preferCanvas={true}
          zoomControl={true}
        >
          <MapController />
          
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {explosionPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={Math.max(point.radius / 20, 5)}
              color="red"
              fillColor="red"
              fillOpacity={0.5}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Explosion Area</strong>
                  <p>Radius: {point.radius}m</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {routes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.coordinates}
              color={getRandomColor()}
              weight={4}
              opacity={0.8}
            />
          ))}

          {startPoint && (
            <Marker position={[startPoint.lat, startPoint.lng]}>
              <Popup>
                <span className="font-semibold">Start Point</span>
              </Popup>
            </Marker>
          )}
          
          {endPoint && (
            <Marker position={[endPoint.lat, endPoint.lng]}>
              <Popup>
                <span className="font-semibold">End Point</span>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      )}
    </div>
  );
}