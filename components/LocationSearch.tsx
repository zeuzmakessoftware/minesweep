import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { SearchResult } from '@/lib/types';
import { searchLocations } from '../services/osrm';

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: SearchResult) => void;
  placeholder: string;
  iconColor: string;
}

export default function LocationSearch({ value, onChange, onSelect, placeholder, iconColor }: LocationSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (value.length >= 3) {
        setLoading(true);
        const searchResults = await searchLocations(value);
        setResults(searchResults);
        setIsOpen(true);
        setLoading(false);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [value]);

  return (
    <div className="relative flex-1 min-w-[300px] z-[1000]" ref={dropdownRef}>
      <div className="flex items-center space-x-2">
        <MapPin className={`h-5 w-5 text-${iconColor}`} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border rounded-md p-2 text-white"
          onFocus={() => value.length >= 3 && setIsOpen(true)}
        />
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-neutral-950 rounded-md shadow-lg border border-gray-200">
          {loading ? (
            <div className="p-2 text-white text-sm">Loading...</div>
          ) : results.length > 0 ? (
            <ul className="max-h-60 overflow-auto text-white">
              {results.map((result) => (
                <li
                  key={result.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-white"
                  onClick={() => {
                    onSelect(result);
                    onChange(result.name);
                    setIsOpen(false);
                  }}
                >
                  {result.name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-2 text-gray-500 text-sm">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}