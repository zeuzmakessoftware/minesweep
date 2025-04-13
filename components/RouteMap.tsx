"use client";

import React, { useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ExplosionPoint, Route, Location } from '@/lib/types';
import MapController from '@/components/MapController';

// Fix leaflet marker icons
import L from 'leaflet';
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

const ExplosionCircles = ({ explosionPoints }: { explosionPoints: ExplosionPoint[] }) => {
  const map = useMap();
  
  return (
    <>
      {explosionPoints.map((point) => {
        const centerPoint = map.latLngToContainerPoint([point.lat, point.lng]);
        const edgePoint = map.latLngToContainerPoint([
          point.lat,
          map.containerPointToLatLng([centerPoint.x + 10, centerPoint.y]).lng
        ]);
        
        const metersPerPixel = 10 / centerPoint.distanceTo(edgePoint);
        const radiusInPixels = point.radius * metersPerPixel;

        return (
          <Circle
            key={point.id}
            center={[point.lat, point.lng]}
            radius={radiusInPixels}
            pathOptions={{ 
              color: 'red', 
              fillColor: 'red',
              fillOpacity: 0.2,
              weight: 1
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{point.title}</strong>
                <br />
                {point.time_ago}
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
};

export default function RouteMap({
  explosionPoints,
  startPoint,
  endPoint,
  routes,
}: {
  explosionPoints: ExplosionPoint[];
  startPoint?: Location;
  endPoint?: Location;
  routes: Route[];
}) {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(true);

  const handlePolylineClick = (route: Route) => {
    const isSafe = window.confirm(`Is this route safe? Click OK to confirm it's safe.`);
    if (isSafe) {
      setSelectedRoute(route);
      setShowAllRoutes(false);
    }
  };

  const getRouteColor = (route: Route) => {
    return route.isSafe ? '#10b981' : '#ef4444';
  };

  const getRouteAnalytics = (route: Route) => {
    if (!route.distance || !route.duration) return null;
    
    const distanceKm = (route.distance / 1000).toFixed(2);
    const durationMinutes = (route.duration / 60).toFixed(0);
    
    return (
      <div className="p-2 bg-white rounded shadow-md text-sm">
        <h3 className="font-bold mb-2">Route Analytics</h3>
        <p>Distance: {distanceKm} km</p>
        <p>Estimated Time: {durationMinutes} minutes</p>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRoute(null);
            setShowAllRoutes(true);
          }}
          className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
        >
          Show All Routes
        </button>
      </div>
    );
  };

  return (
    <MapContainer
      center={[48.6167, 32.0167]}
      zoom={7}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      <MapController />
      <ExplosionCircles explosionPoints={explosionPoints} />
      
      {startPoint && (
        <Marker position={[startPoint.lat, startPoint.lng]}>
          <Popup>Start Point</Popup>
        </Marker>
      )}
      
      {endPoint && (
        <Marker position={[endPoint.lat, endPoint.lng]}>
          <Popup>End Point</Popup>
        </Marker>
      )}
      
      {(showAllRoutes ? routes : selectedRoute ? [selectedRoute] : []).map((route) => (
        <Polyline
          key={route.id}
          positions={route.coordinates}
          color={getRouteColor(route)}
          weight={4}
          opacity={0.8}
          eventHandlers={{
            click: () => handlePolylineClick(route)
          }}
        >
          <Popup>
            {selectedRoute?.id === route.id ? (
              getRouteAnalytics(route)
            ) : (
              <span className="font-semibold text-sm">
                {route.isSafe ? 'Safe Route' : 'Unsafe Route'}
              </span>
            )}
          </Popup>
        </Polyline>
      ))}
    </MapContainer>
  );
}