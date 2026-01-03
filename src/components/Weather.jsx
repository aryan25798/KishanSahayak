// src/components/Weather.jsx
import { useState, useEffect } from "react";
import { 
  Search, CloudRain, Wind, Droplets, MapPin, Navigation, 
  Loader2, Sun, Cloud, Thermometer, Gauge, Umbrella, Calendar
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';

const Weather = () => {
  const [city, setCity] = useState("New Delhi");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper: Map WMO weather codes to Icons & Descriptions
  const getWeatherInfo = (code) => {
    if (code === 0) return { desc: "Clear Sky", icon: <Sun size={64} className="text-yellow-400 drop-shadow-lg animate-pulse-slow"/> };
    if (code >= 1 && code <= 3) return { desc: "Partly Cloudy", icon: <Cloud size={64} className="text-gray-100 drop-shadow-lg"/> };
    if (code >= 45 && code <= 48) return { desc: "Foggy", icon: <Cloud size={64} className="text-gray-300 drop-shadow-lg"/> };
    if (code >= 51 && code <= 67) return { desc: "Rain", icon: <CloudRain size={64} className="text-blue-300 drop-shadow-lg"/> };
    if (code >= 80 && code <= 82) return { desc: "Heavy Showers", icon: <CloudRain size={64} className="text-blue-500 drop-shadow-lg"/> };
    if (code >= 95) return { desc: "Thunderstorm", icon: <CloudRain size={64} className="text-purple-400 drop-shadow-lg"/> };
    return { desc: "Overcast", icon: <Cloud size={64} className="text-gray-400 drop-shadow-lg"/> };
  };

  // Helper: Generate Farming Advice based on data
  const getFarmingTip = (temp, wind, rain) => {
    if (rain > 0.5) return "Pause irrigation & pesticide spraying due to rain.";
    if (wind > 15) return "Avoid spraying chemicals; wind drift risk high.";
    if (temp > 35) return "High heat stress risk. Ensure crops are irrigated.";
    if (temp < 5) return "Frost warning! Protect sensitive nurseries.";
    return "Conditions are good for general field activities.";
  };

  // 1. Fetch Weather from Open-Meteo
  const fetchWeather = async (lat, lon, cityName) => {
    setLoading(true);
    setError(null);
    try {
      // ✅ Added daily parameters for 7-day forecast
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,surface_pressure&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`
      );
      const data = await response.json();
      const current = data.current;
      
      const info = getWeatherInfo(current.weather_code);
      const tip = getFarmingTip(current.temperature_2m, current.wind_speed_10m, current.precipitation);

      // Process Daily Forecast for Chart
      const dailyData = data.daily.time.map((time, index) => ({
        day: new Date(time).toLocaleDateString('en-IN', { weekday: 'short' }), // e.g., "Mon"
        temp: Math.round(data.daily.temperature_2m_max[index]),
        rainProb: data.daily.precipitation_probability_max[index] || 0
      })).slice(0, 7); // Keep 7 days

      setWeather({
        name: cityName,
        temp: Math.round(current.temperature_2m),
        wind: current.wind_speed_10m,
        humidity: current.relative_humidity_2m,
        rain: current.precipitation,
        pressure: current.surface_pressure,
        description: info.desc,
        icon: info.icon,
        tip: tip
      });

      setForecast(dailyData);

    } catch (err) {
      console.error(err);
      setError("Failed to fetch weather data. Please check connection.");
    }
    setLoading(false);
  };

  // 2. Search City (Geocoding)
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
        throw new Error("City not found. Try a nearby town.");
      }

      const { latitude, longitude, name, country } = geoData.results[0];
      setCity(`${name}, ${country}`); 
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
          try {
            const cityRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const cityData = await cityRes.json();
            const detectedCity = cityData.locality || cityData.city || "My Farm";
            setCity(detectedCity);
            fetchWeather(latitude, longitude, detectedCity);
          } catch (e) {
            fetchWeather(latitude, longitude, "Current Location");
          }
        },
        (error) => {
          setLoading(false);
          setError("Location access denied. Please search manually.");
        }
      );
    } else {
      setError("Geolocation not supported.");
    }
  };

  useEffect(() => {
    getUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Custom Tooltip for Chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-xl border border-blue-100 text-xs">
          <p className="font-bold text-gray-700 mb-1">{label}</p>
          <p className="text-blue-600 font-semibold flex items-center gap-1">
            <CloudRain size={12}/> Rain: {payload[0].value}%
          </p>
          <p className="text-orange-500 font-semibold flex items-center gap-1">
            <Thermometer size={12}/> Temp: {payload[1].value}°C
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    // ✅ FIXED: Increased padding to pt-24 md:pt-28 to ensure content clears navbar
    <div className="pt-24 md:pt-28 min-h-screen bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-900 p-4 sm:p-6 flex items-center justify-center font-sans">
      
      <div className="w-full max-w-6xl bg-white/10 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Background Blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-green-400/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        {/* LEFT PANEL: Controls & Current Stats */}
        <div className="p-6 md:p-8 md:w-[45%] flex flex-col z-10 border-r border-white/10 bg-white/5">
          
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-1">Agri-Forecast</h2>
            <p className="text-blue-200 text-sm">Precision Farming Weather Data</p>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-6 relative z-20">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                placeholder="Search village..." 
                className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-200/70 p-3 pl-10 rounded-xl shadow-inner outline-none focus:bg-white/20 focus:border-green-400 transition-all backdrop-blur-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Search className="absolute left-3 top-3.5 text-blue-200 group-focus-within:text-green-400 transition-colors" size={18} />
            </div>
            <button onClick={getUserLocation} className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105"><Navigation size={20} /></button>
            <button onClick={handleSearch} className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105"><Search size={20} /></button>
          </div>

          {/* Loading/Error */}
          {loading && <div className="flex-1 flex flex-col items-center justify-center text-blue-200 animate-pulse"><Loader2 size={40} className="animate-spin mb-2" /><p>Scanning satellites...</p></div>}
          {error && <div className="p-4 bg-red-500/20 text-red-100 rounded-xl text-center mb-4">{error}</div>}

          {/* Current Weather Grid */}
          {weather && !loading && (
            <div className="grid grid-cols-2 gap-3 mt-auto">
               {[
                 { icon: <Wind size={20} />, label: "Wind", val: weather.wind, unit: "km/h" },
                 { icon: <Droplets size={20} />, label: "Humidity", val: weather.humidity, unit: "%" },
                 { icon: <Umbrella size={20} />, label: "Precipitation", val: weather.rain, unit: "mm" },
                 { icon: <Gauge size={20} />, label: "Pressure", val: weather.pressure, unit: "hPa" }
               ].map((item, i) => (
                 <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white/10 transition">
                   <div className="text-blue-300 mb-2">{item.icon}</div>
                   <span className="text-lg font-bold text-white">{item.val} <span className="text-xs font-normal opacity-70">{item.unit}</span></span>
                   <span className="text-[10px] text-blue-200 uppercase tracking-wider mt-1">{item.label}</span>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Visuals & Graph */}
        <div className="md:w-[55%] bg-gradient-to-b from-white/5 to-transparent p-6 md:p-8 text-white flex flex-col justify-between relative z-10">
          
          {weather ? (
            <div className="h-full flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* Header Info */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <MapPin className="text-red-400" size={24} /> {weather.name}
                  </h3>
                  <p className="text-blue-200 text-sm ml-8 opacity-80">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold leading-none tracking-tighter drop-shadow-lg">{weather.temp}°</div>
                  <div className="text-sm text-blue-100 mt-1 capitalize">{weather.description}</div>
                </div>
              </div>

              {/* Expert Tip */}
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-xl backdrop-blur-md border border-green-400/30 shadow-lg mb-6 flex items-start gap-3">
                <div className="bg-green-500/20 p-2 rounded-lg shrink-0"><Thermometer size={20} className="text-green-300" /></div>
                <div>
                  <h4 className="font-bold text-green-300 text-xs uppercase mb-1">Agronomist Tip</h4>
                  <p className="text-white text-sm leading-snug opacity-90">{weather.tip}</p>
                </div>
              </div>

              {/* 7-Day Trend Graph */}
              <div className="flex-1 min-h-[200px] w-full bg-white/5 rounded-2xl p-4 border border-white/10 shadow-inner backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={16} className="text-blue-300"/>
                  <h4 className="text-sm font-semibold text-blue-100">7-Day Rain & Temp Forecast</h4>
                </div>
                
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecast}>
                      <defs>
                        <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      
                      {/* Rain Probability Area */}
                      <Area type="monotone" dataKey="rainProb" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRain)" strokeWidth={2} />
                      
                      {/* Temperature Line/Area */}
                      <Area type="monotone" dataKey="temp" stroke="#f97316" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6 animate-pulse"><MapPin size={40} /></div>
              <h3 className="text-2xl font-bold">Locate Your Farm</h3>
              <p className="text-blue-200 mt-2 max-w-xs">Use GPS or search to get precision farming weather data.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Weather;