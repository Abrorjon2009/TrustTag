import React, { createContext, useContext, useState, useEffect } from 'react';
import { GeoRegion, GeoDistrict, GeoCity } from '../types';
import { api } from '../api/client';

interface LocationContextType {
  regions: GeoRegion[];
  selectedRegion: GeoRegion | null;
  selectedDistrict: GeoDistrict | null;
  selectedCity: GeoCity | null;
  setLocation: (region: GeoRegion | null, district: GeoDistrict | null, city: GeoCity | null) => void;
  clearLocation: () => void;
  displayLocationName: string;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType>({
  regions: [],
  selectedRegion: null,
  selectedDistrict: null,
  selectedCity: null,
  setLocation: () => {},
  clearLocation: () => {},
  displayLocationName: 'All Locations',
  isLoading: true,
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<GeoDistrict | null>(null);
  const [selectedCity, setSelectedCity] = useState<GeoCity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getLocations()
      .then((data) => {
        setRegions(data);
        // Default customer location: Tashkent -> Yunusabad
        if (data.length > 0) {
          const tashkent = data.find((r) => r.name.toLowerCase().includes('tashkent')) || data[0];
          setSelectedRegion(tashkent);
          if (tashkent.districts?.length > 0) {
            setSelectedDistrict(tashkent.districts[0]);
            if (tashkent.districts[0].cities?.length > 0) {
              setSelectedCity(tashkent.districts[0].cities[0]);
            }
          }
        }
      })
      .catch((err) => console.error('Error fetching location hierarchy:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const setLocation = (region: GeoRegion | null, district: GeoDistrict | null, city: GeoCity | null) => {
    setSelectedRegion(region);
    setSelectedDistrict(district);
    setSelectedCity(city);
  };

  const clearLocation = () => {
    setSelectedRegion(null);
    setSelectedDistrict(null);
    setSelectedCity(null);
  };

  const displayLocationName = selectedCity
    ? `${selectedRegion?.name} • ${selectedCity.name}`
    : selectedDistrict
    ? `${selectedRegion?.name} • ${selectedDistrict.name}`
    : selectedRegion
    ? selectedRegion.name
    : 'All Locations';

  return (
    <LocationContext.Provider
      value={{
        regions,
        selectedRegion,
        selectedDistrict,
        selectedCity,
        setLocation,
        clearLocation,
        displayLocationName,
        isLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);

