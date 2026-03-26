import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Navigation, Loader2, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const mapContainerStyle = { width: '100%', height: '100%' };
const libraries = ['places'];

const FarmerMap = () => {
  const { user } = useAuth();
  const [currentPos, setCurrentPos] = useState(null);
  const [map, setMap] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('Seed Store');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  const searchNearby = useCallback((mapInstance, position, type) => {
    if (!mapInstance || !window.google) return;
    const service = new window.google.maps.places.PlacesService(mapInstance);
    const request = {
      location: position,
      radius: '5000',
      keyword: type
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setResults(results);
      }
    });
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPos({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => setCurrentPos({ lat: 28.6139, lng: 77.2090 })
    );
  }, []);

  useEffect(() => {
    if (map && currentPos) {
      searchNearby(map, currentPos, activeTab);
    }
  }, [activeTab, map, currentPos, searchNearby]);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const handleGetDirections = (loc) => {
    const lat = loc.geometry.location.lat();
    const lng = loc.geometry.location.lng();
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (!isLoaded || !currentPos) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-emerald-600" size={48} />
    </div>
  );

  return (
    <div className="pt-16 md:pt-20 h-[100dvh] flex flex-col bg-slate-50 overflow-hidden">
      {/* Header & Filter Section */}
      <div className="px-4 py-4 md:px-8 bg-white shadow-sm border-b border-slate-200 z-20">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">Agriculture Hub</h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium">Nearby {activeTab}s</p>
            </div>
            {/* Legend or User indicator could go here */}
          </div>

          {/* Scrollable Category Switcher for Mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {['Seed Store', 'Soil Lab', 'Fertilizer', 'Nursery'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedLocation(null); }}
                className={`flex-none px-5 py-2 rounded-full text-xs font-bold transition-all border ${
                  activeTab === tab 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map Body - Fully Responsive */}
      <div className="flex-1 relative w-full h-full z-10">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={currentPos}
          zoom={14}
          onLoad={onMapLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControl: window.innerWidth > 768, // Only show zoom on desktop
          }}
        >
          {/* User's Location Marker */}
          <MarkerF 
            position={currentPos} 
            options={{
              label: { text: "You", className: "bg-white px-2 py-1 rounded shadow text-[10px] font-bold -mt-10" }
            }}
          />

          {results.map((place) => (
            <MarkerF
              key={place.place_id}
              position={place.geometry.location}
              onClick={() => setSelectedLocation(place)}
            />
          ))}

          {selectedLocation && (
            <InfoWindowF
              position={selectedLocation.geometry.location}
              onCloseClick={() => setSelectedLocation(null)}
            >
              <div className="p-1 max-w-[220px] md:max-w-[280px]">
                <div className="flex items-start gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <MapPin className="text-emerald-600" size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm md:text-base leading-snug">{selectedLocation.name}</h3>
                    <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">{selectedLocation.vicinity}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 border-t border-slate-100 pt-2">
                  {selectedLocation.rating ? (
                    <span className="text-[10px] font-bold text-orange-500 flex items-center gap-1">
                      ⭐ {selectedLocation.rating}
                    </span>
                  ) : <span></span>}
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                    {activeTab}
                  </span>
                </div>

                <button 
                  onClick={() => handleGetDirections(selectedLocation)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  <Navigation size={14} /> Get Directions
                </button>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </div>
    </div>
  );
};

export default FarmerMap;