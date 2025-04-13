import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * MapController component handles map initialization and events
 * This replaces the deprecated whenCreated prop from react-leaflet v3
 */
export default function MapController() {
  // Get map instance using the useMap hook
  const map = useMap();
  
  useEffect(() => {
    // Initialize map or handle events here
    setTimeout(() => map.invalidateSize(), 100);
    
    return () => {
      // Cleanup if needed
    };
  }, [map]);
  
  // This component doesn't render anything
  return null;
}
