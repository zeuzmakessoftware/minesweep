"use client";

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { Navigation } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { ExplosionPoint, Route, Location, SearchResult } from '@/lib/types';
import { getSafeRoutes } from '@/services/osrm';

const RouteMap = dynamic(() => import('../components/RouteMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] md:h-[600px] bg-gray-100 animate-pulse rounded-lg" />
});

export default function Home() {
  const fixedRadius = 40000;
  const [explosionPoints] = useState<ExplosionPoint[]>([
    { id: '1', lat: 50.45, lng: 30.3333, radius: fixedRadius, title: '2 people wounded, multiple fires started as result of Russian drones strikes in Kyiv overnight', time_ago: 'an hour ago' },
    { id: '2', lat: 50.9, lng: 34.8167, radius: fixedRadius, title: 'Explosion was audible in Sumy', time_ago: '11 hours ago' },
    { id: '3', lat: 48.4833, lng: 35.8667, radius: fixedRadius, title: 'Explosions were reported in Pavlohrad', time_ago: '11 hours ago' },
    { id: '4', lat: 47.8167, lng: 35.1833, radius: fixedRadius, title: 'Explosions were reported in Zaporizhzhia, air defense worked against Shahed-type drones', time_ago: '12 hours ago' },
    { id: '5', lat: 47.9333, lng: 33.3167, radius: fixedRadius, title: 'Explosion was reported in Kryvyi Rih, possible explosive device blast injured a person', time_ago: '17 hours ago' },
    { id: '6', lat: 46.6167, lng: 32.7167, radius: fixedRadius, title: 'At Kherson axis Ukrainian forces have repelled 2 Russian army assaults, - General Staff of Armed Forces of Ukraine reports', time_ago: 'a day ago' },
    { id: '7', lat: 48.4667, lng: 37.9333, radius: fixedRadius, title: 'At Kramatorsk axis clashes yesterday near Bila Hora and Kurdumivka, - General Staff of Armed Forces of Ukraine reports', time_ago: 'a day ago' },
    { id: '8', lat: 50.2833, lng: 36.9333, radius: fixedRadius, title: 'At Kharkiv axis clashes yesterday near Vovchansk, - General Staff of Armed Forces of Ukraine reports', time_ago: 'a day ago' },
    { id: '9', lat: 48.0833, lng: 36.9667, radius: fixedRadius, title: 'At Pokrovsk axis clashes yesterday near Romanivka, Oleksandropil, Serhiyivka, Kotlyarivka and near Kalynove, Sribne, Tarasivka, Sukha Balka, Valentynivka, Yelyzavetivka, Lysivka, Zvirove, Udachne, Preobrazhenka, Andriyivka, Bohdanivka, - General Staff of Armed Forces of Ukraine reports', time_ago: 'a day ago' },
    { id: '10', lat: 47.8667, lng: 36.7, radius: fixedRadius, title: 'At Huliaipole axis clashes yesterday near Pryvilne, - General Staff of Armed Forces of Ukraine reports', time_ago: 'a day ago' },
    { id: '11', lat: 48.5, lng: 32.3167, radius: fixedRadius, title: 'Explosions were reported in Kropivnytsky', time_ago: 'a day ago' },
    { id: '12', lat: 50.1667, lng: 28.7333, radius: fixedRadius, title: '1 person killed, 5 wounded as result of drone strike against residential house in Zhytomyr region', time_ago: 'a day ago' },
    { id: '13', lat: 48.4333, lng: 35.0833, radius: fixedRadius, title: 'Number of injured as result of Russian ballistic missile strike in Dnipro city increased to 13', time_ago: '2 days ago' },
    { id: '14', lat: 50.5, lng: 30.6333, radius: fixedRadius, title: 'Explosions were reported in Kyiv. Several drones are approaching the city', time_ago: '2 days ago' },
    { id: '15', lat: 48.4333, lng: 35.0833, radius: fixedRadius, title: 'Ballistic missile strike was reported in Dnipro city', time_ago: '2 days ago' },
    { id: '16', lat: 46.8333, lng: 33.4, radius: fixedRadius, title: 'One person killed in artillery shelling in Beryslav of Kherson region', time_ago: '2 days ago' },
    { id: '17', lat: 49.9, lng: 37.7, radius: fixedRadius, title: 'At Kharkiv axis clashes yesterday near Vovchansk, Hlyboke, Kamyanka, Fyholivka, - General Staff of Armed Forces of Ukraine reports', time_ago: '2 days ago' },
    { id: '18', lat: 48.3667, lng: 37.8, radius: fixedRadius, title: 'At Toretsk axis clashes yesterday near Toretsk, Druzhba, Dachne, Leonidivka and Scherbynivka, - General Staff of Armed Forces of Ukraine reports', time_ago: '2 days ago' },
    { id: '19', lat: 48.5833, lng: 37.8333, radius: fixedRadius, title: 'At Kramatorsk axis clashes yesterday near Chasiv Yar, - General Staff of Armed Forces of Ukraine reports', time_ago: '2 days ago' },
    { id: '20', lat: 49.1833, lng: 37.8833, radius: fixedRadius, title: 'At Lyman axis clashes yesterday near Nadiya, Katerynivka, Myrne, Serhiyivka, Nove, Kolodyazi, Yampolivka and towards Zelena Dolyna, Hrekivka and Novomykhaylivka, - General Staff of Armed Forces of Ukraine reports', time_ago: '2 days ago' },
  ]);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startPoint, setStartPoint] = useState<Location>();
  const [endPoint, setEndPoint] = useState<Location>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSelect = (result: SearchResult) => {
    setStartPoint({ lat: result.lat, lng: result.lng });
  };

  const handleEndSelect = (result: SearchResult) => {
    setEndPoint({ lat: result.lat, lng: result.lng });
  };  

  const findRoutes = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!startPoint || !endPoint) {
        throw new Error('Please select both start and end locations');
      }
      const newRoutes = await getSafeRoutes(startPoint, endPoint, explosionPoints);
      setRoutes(newRoutes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="bg-black shadow-md p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Navigation className="h-6 w-6 text-white" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Minesweep</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="bg-neutral-950 rounded-lg shadow-md p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:space-x-4">
            <div className="w-full md:w-auto">
              <LocationSearch
                value={startLocation}
                onChange={setStartLocation}
                onSelect={handleStartSelect}
                placeholder="Start location"
                iconColor="blue-600"
              />
            </div>
            <div className="w-full md:w-auto">
              <LocationSearch
                value={endLocation}
                onChange={setEndLocation}
                onSelect={handleEndSelect}
                placeholder="End location"
                iconColor="red-600"
              />
            </div>
            <button
              onClick={findRoutes}
              disabled={loading}
              className="bg-neutral-600 text-white px-4 py-2 rounded-md hover:bg-neutral-700 disabled:bg-neutral-300 whitespace-nowrap cursor-pointer w-full md:w-auto"
            >
              {loading ? 'Finding Routes...' : 'Find Routes'}
            </button>
          </div>
          {error && (
            <div className="mt-2 text-red-600 text-sm">{error}</div>
          )}
        </div>

        <div className="h-[400px] md:h-[600px] bg-white rounded-lg shadow-md overflow-hidden">
          <RouteMap
            explosionPoints={explosionPoints}
            startPoint={startPoint}
            endPoint={endPoint}
            routes={routes}
          />
        </div>
      </main>
    </div>
  );
}