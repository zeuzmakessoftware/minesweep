export interface ExplosionPoint {
    id: string;
    lat: number;
    lng: number;
    radius: number; // in meters
    title: string;
    time_ago: string;
  }
  
  export interface Route {
    id: string;
    coordinates: [number, number][];
    isSafe: boolean;
    duration?: number; // in seconds
    distance?: number; // in meters
    color: string;
  }
  
  export interface Location {
    lat: number;
    lng: number;
  }
  
  export interface SearchResult {
    id: string;
    name: string;
    lat: number;
    lng: number;
  }
  
  export interface OSRMResponse {
    code: string;
    routes: {
      geometry: string;
      duration: number;
      distance: number;
    }[];
  }