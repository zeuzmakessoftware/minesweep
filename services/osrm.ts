// osrm.ts

import { ExplosionPoint, Location, Route, SearchResult } from '@/lib/types';
import * as turf from '@turf/turf';

const OSRM_API = 'https://router.project-osrm.org/route/v1';

// Constants to control safe margins and candidate counts.
const SAFE_MARGIN_KM = 0.69; // Additional safe distance (in kilometers) outside explosion radius.
const CANDIDATE_COUNT_EXPLOSION = 10; // Number of candidate via points to sample around an explosion zone.

/**
 * Generate several candidate midpoints along both the perpendicular bisector 
 * of the start–end segment and additional candidates sampled along the edge of any 
 * explosion zone that intersects the direct route.
 */
function getCandidateMidpoints(
  start: Location,
  end: Location,
  explosionPoints: ExplosionPoint[]
): Location[] {
  const candidateMidpoints: Location[] = [];

  // Base candidate from the perpendicular bisector:
  const baseMid: Location = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2,
  };

  // Compute the bearing of the direct line.
  const directBearing = turf.bearing(
    turf.point([start.lng, start.lat]),
    turf.point([end.lng, end.lat])
  );

  // Generate multiple candidates along the perpendicular bisector.
  // Offsets (in kilometers) may be adjusted as needed.
  const offsets = [0, 1.0, 2.0, 3.0, -1.0, -2.0, -3.0];
  offsets.forEach((offset) => {
    let candidatePoint;
    if (offset !== 0) {
      // Use the perpendicular direction relative to the direct bearing.
      const perpBearing = offset > 0 ? directBearing + 90 : directBearing - 90;
      candidatePoint = turf.destination(
        turf.point([baseMid.lng, baseMid.lat]),
        Math.abs(offset),
        perpBearing,
        { units: 'kilometers' }
      );
    } else {
      candidatePoint = turf.point([baseMid.lng, baseMid.lat]);
    }
    candidateMidpoints.push({
      lat: candidatePoint.geometry.coordinates[1],
      lng: candidatePoint.geometry.coordinates[0],
    });
  });

  // Additional candidate generation based on explosion zones.
  // Build a direct-line representation.
  const directLine = turf.lineString([
    [start.lng, start.lat],
    [end.lng, end.lat],
  ]);

  explosionPoints.forEach((explosion) => {
    // Use a safe radius that is the explosion radius in km plus an extra margin.
    const safeRadius = explosion.radius / 1000 + SAFE_MARGIN_KM;
    // Build a circular polygon representing the explosion's safe area.
    const explosionCircle = turf.circle(
      [explosion.lng, explosion.lat],
      safeRadius,
      { units: 'kilometers', steps: 64 }
    );
    // If the direct route intersects this buffered explosion area...
    if (turf.booleanIntersects(directLine, explosionCircle)) {
      // ...sample candidate via points evenly around the explosion's perimeter.
      for (let i = 0; i < CANDIDATE_COUNT_EXPLOSION; i++) {
        const angle = i * (360 / CANDIDATE_COUNT_EXPLOSION);
        const candidate = turf.destination(
          turf.point([explosion.lng, explosion.lat]),
          safeRadius,
          angle,
          { units: 'kilometers' }
        );
        candidateMidpoints.push({
          lat: candidate.geometry.coordinates[1],
          lng: candidate.geometry.coordinates[0],
        });
      }
    }
  });

  // Remove duplicate candidate midpoints using a simple tolerance check.
  const uniqueCandidates: Location[] = [];
  candidateMidpoints.forEach(candidate => {
    if (
      !uniqueCandidates.some(
        u =>
          Math.abs(u.lat - candidate.lat) < 0.0001 &&
          Math.abs(u.lng - candidate.lng) < 0.0001
      )
    ) {
      uniqueCandidates.push(candidate);
    }
  });

  return uniqueCandidates;
}

/**
 * Check if a route (an array of [lat, lng] coordinates) avoids all explosion zones.
 * Now using an increased safe margin.
 */
function isRouteSafe(
  coordinates: [number, number][],
  explosionPoints: ExplosionPoint[]
): boolean {
  // Convert the route coordinates to a Turf lineString (switch from [lat, lng] to [lng, lat]).
  const line = turf.lineString(coordinates.map(([lat, lng]) => [lng, lat]));

  // The route is considered safe if it does NOT intersect any explosion zone 
  // buffered with the additional safe margin.
  return explosionPoints.every((point) => {
    const center = turf.point([point.lng, point.lat]);
    const buffer = turf.buffer(center, point.radius / 1000 + SAFE_MARGIN_KM, { units: 'kilometers' });
    if (!buffer) return false;
    return !turf.booleanIntersects(line, buffer);
  });
}

/**
 * Fetch a route from OSRM that passes through a candidate midpoint.
 * OSRM is queried with three coordinates (start, candidate midpoint, end)
 * and returns detailed step geometries.
 */
async function fetchRouteWithMidpoint(
  start: Location,
  mid: Location,
  end: Location
): Promise<Route[]> {
  const url = `${OSRM_API}/driving/${start.lng},${start.lat};${mid.lng},${mid.lat};${end.lng},${end.lat}?alternatives=true&geometries=geojson&overview=full&steps=true`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No routes found');
  }

  // Build a detailed route by stitching together step geometries.
  return data.routes.map((route: any, index: number) => {
    const detailedCoordinates: [number, number][] = [];
    route.legs.forEach((leg: any) => {
      leg.steps.forEach((step: any) => {
        const stepCoords = step.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
        if (detailedCoordinates.length > 0) {
          const lastCoord = detailedCoordinates[detailedCoordinates.length - 1];
          if (lastCoord[0] === stepCoords[0][0] && lastCoord[1] === stepCoords[0][1]) {
            detailedCoordinates.push(...stepCoords.slice(1));
          } else {
            detailedCoordinates.push(...stepCoords);
          }
        } else {
          detailedCoordinates.push(...stepCoords);
        }
      });
    });

    // Generate a unique ID using coordinates and timestamp to avoid duplicates
    const uniqueId = `route-${mid.lat.toFixed(4)}-${mid.lng.toFixed(4)}-${index}-${Date.now()}`;

    return {
      id: uniqueId,
      coordinates: detailedCoordinates,
      // This safety flag will be updated based on our check below.
      isSafe: true,
      duration: route.duration,
      distance: route.distance,
    };
  });
}

/**
 * Main function to generate candidate routes.
 * This function generates multiple candidate midpoints, fetches routes via each candidate,
 * and then returns each candidate route along with its safety flag and a distinct color.
 * Only routes that avoid the buffered explosion zones will have isSafe set to true.
 */
export async function getSafeRoutes(
  start: Location,
  end: Location,
  explosionPoints: ExplosionPoint[]
): Promise<Route[]> {
  const candidateRoutes: Route[] = [];
  // Generate candidate via points using both the perpendicular bisector and additional explosion sampling.
  const candidateMidpoints = getCandidateMidpoints(start, end, explosionPoints);

  for (const mid of candidateMidpoints) {
    try {
      const routes = await fetchRouteWithMidpoint(start, mid, end);
      routes.forEach((route) => {
        // Determine safety for each route.
        const safe = isRouteSafe(route.coordinates, explosionPoints);
        candidateRoutes.push({
          ...route,
          isSafe: safe,
        });
      });
    } catch (error) {
      console.error('Error fetching route with candidate midpoint:', error);
    }
  }

  // Define a color palette so that each route gets a distinct color.
  const routeColors = [
    '#FF5733', // red-orange
    '#33FF57', // lime green
    '#3357FF', // blue
    '#F1C40F', // yellow
    '#9B59B6', // purple
    '#E67E22', // orange
    '#1ABC9C', // teal
    '#E74C3C', // red
    '#2ECC71', // green
    '#3498DB', // light blue
  ];

  // Assign a distinct color to each route.
  const coloredRoutes = candidateRoutes.map((route, idx) => ({
    ...route,
    color: routeColors[idx % routeColors.length],
  }));

  // Optionally, sort coloredRoutes by a metric such as duration or distance.
  return coloredRoutes;
}

/**
 * Search for locations using the Nominatim API.
 */
export async function searchLocations(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 3) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch locations');
    }
    const data = await response.json();
    return data.map((item: any) => ({
      id: item.place_id,
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('Error searching locations:', error);
    return [];
  }
}

/**
 * Geocode a location using the Nominatim API.
 */
export function geocodeLocation(query: string): Promise<Location | null> {
  return fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then((response) => response.json())
    .then((data) => {
      if (data && data[0]) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
      return null;
    })
    .catch((error) => {
      console.error('Geocoding error:', error);
      return null;
    });
}
