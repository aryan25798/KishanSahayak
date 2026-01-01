// src/components/Weather.jsx
import { useState, useEffect } from "react";
import { Search, CloudRain, Wind, Droplets, MapPin, Thermometer, Navigation, Loader, Sun, Cloud } from "lucide-react";

const Weather = () => {
  const [city, setCity] = useState("Delhi");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper: Map WMO weather codes to Icons & Descriptions
  const getWeatherInfo = (code) => {
    if (code === 0) return { desc: "Clear Sky", icon: <Sun size={24} className="text-yellow-500"/> };
    if (code >= 1 && code <= 3) return { desc: "Partly Cloudy", icon: <Cloud size={24} className="text-gray-200"/> };
    if (code >= 45 && code <= 48) return { desc: "Foggy", icon: <Cloud size={24} className="text-gray-400"/> };
    if (code >= 51 && code <= 67) return { desc: "Rain", icon: <CloudRain size={24} className="text-blue-400"/> };
    if (code >= 80 && code <= 82) return { desc: "Showers", icon: <CloudRain size={24} className="text-blue-500"/> };
    return { desc: "Overcast", icon: <Cloud size={24} className="text-gray-500"/> };
  };

  // 1. Fetch Weather from Open-Meteo (No Key Needed!)
  const fetchWeather = async (lat, lon, cityName) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
      );
      const data = await response.json();
      
      const info = getWeatherInfo(data.current.weather_code);

      setWeather({
        name: cityName,
        temp: data.current.temperature_2m,
        wind: data.current.wind_speed_10m,
        humidity: data.current.relative_humidity_2m,
        description: info.desc,
        icon: info.icon
      });
    } catch (err) {
      setError("Failed to fetch weather data.");
    }
    setLoading(false);
  };

  // 2. Search City to get Lat/Lon (Geocoding)
  const handleSearch = async () => {
    if (!city) return;
    setLoading(true);
    setError(null);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();

      if (!geoData.results) {
        throw new Error("City not found.");
      }

      const { latitude, longitude, name, country } = geoData.results[0];
      setCity(`${name}, ${country}`); // Update input with full name
      await fetchWeather(latitude, longitude, name);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // 3. Get GPS Location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Reverse lookup to find city name from coords (using a free backup API)
          const cityRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const cityData = await cityRes.json();
          fetchWeather(latitude, longitude, cityData.city || "Your Farm");
        },
        (error) => {
          setLoading(false);
          setError("Location access denied. Search manually.");
        }
      );
    } else {
      setError("Geolocation not supported.");
    }
  };

  // Auto-load on start
  useEffect(() => {
    getUserLocation();
  }, []);

  return (
    <div className="pt-24 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <div className="max-w-4xl w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left Panel */}
        <div className="p-8 md:w-1/2 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Field Weather</h2>
          <p className="text-gray-500 mb-8">Powered by Open-Meteo (Free)</p>

          <div className="flex gap-2 mb-8">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Search City..." 
                className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
            
            <button onClick={getUserLocation} className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition shadow-md group">
              <Navigation size={20} className="group-hover:rotate-45 transition-transform" />
            </button>
            <button onClick={handleSearch} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition shadow-md">
              <Search size={20} />
            </button>
          </div>

          {loading && <div className="text-center py-10 text-blue-500 animate-pulse font-bold flex justify-center gap-2"><Loader className="animate-spin"/> Scanning satellite...</div>}
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-center">{error}</div>}

          {weather && !loading && (
            <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className="p-4 bg-blue-50 rounded-2xl flex flex-col items-center justify-center border border-blue-100">
                <Wind className="text-blue-500 mb-2" />
                <span className="text-xl font-bold text-gray-800">{weather.wind} km/h</span>
                <span className="text-xs text-gray-500 uppercase font-bold">Wind</span>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl flex flex-col items-center justify-center border border-blue-100">
                <Droplets className="text-blue-500 mb-2" />
                <span className="text-xl font-bold text-gray-800">{weather.humidity}%</span>
                <span className="text-xs text-gray-500 uppercase font-bold">Humidity</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-10 -mb-10 blur-3xl"></div>

          {weather ? (
            <div className="relative z-10 h-full flex flex-col justify-between animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-bold flex items-center gap-2"><MapPin size={28} /> {weather.name}</h3>
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10">
                   <p className="font-bold text-sm">Today</p>
                </div>
              </div>

              <div className="text-center my-6">
                <div className="text-[100px] font-bold leading-none tracking-tighter drop-shadow-lg">{Math.round(weather.temp)}°</div>
                <p className="text-xl font-medium capitalize flex items-center justify-center gap-2 mt-2">
                  {weather.icon} {weather.description}
                </p>
              </div>

              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10 shadow-lg text-center">
                <span className="text-sm">Field Conditions: <strong>Good for irrigation</strong></span>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center relative z-10 opacity-60">
              <Navigation size={80} className="mb-6 animate-pulse" />
              <h3 className="text-2xl font-bold">Locate Your Farm</h3>
              <p className="text-blue-200 mt-2">Click GPS or Search to start.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Weather;