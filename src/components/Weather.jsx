// src/components/Weather.jsx
import { useState, useEffect } from "react";
import { 
  Search, CloudRain, Wind, Droplets, MapPin, Navigation, 
  Loader2, Sun, Cloud, Thermometer, Umbrella, Calendar, 
  Sunrise, Sunset, Sprout, Eye, BarChart3
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar 
} from 'recharts';

const Weather = () => {
  const [city, setCity] = useState("New Delhi");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("temp"); // 'temp' or 'rain'

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
  const getFarmingTip = (temp, wind, rain, soil) => {
    if (rain > 5) return "Heavy rain expected. Ensure drainage channels are clear.";
    if (soil < 0.2 && rain < 1) return "Soil moisture is low. Irrigation recommended.";
    if (wind > 20) return "High winds! Avoid spraying pesticides today.";
    if (temp > 35) return "Heat stress alert! Ensure crops are hydrated.";
    if (temp < 5) return "Frost warning! Cover sensitive nurseries.";
    return "Conditions are optimal for general field activities.";
  };

  // 1. Fetch Weather from Open-Meteo
  const fetchWeather = async (lat, lon, cityName) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,surface_pressure,soil_moisture_0_to_1cm&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto`
      );
      
      const data = await response.json();
      const current = data.current;
      const daily = data.daily;
      
      const info = getWeatherInfo(current.weather_code);
      const tip = getFarmingTip(current.temperature_2m, current.wind_speed_10m, current.precipitation, current.soil_moisture_0_to_1cm);

      // Process Daily Forecast for 7 Days
      const dailyData = daily.time.map((time, index) => ({
        day: new Date(time).toLocaleDateString('en-IN', { weekday: 'short' }),
        fullDate: new Date(time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        maxTemp: Math.round(daily.temperature_2m_max[index]),
        minTemp: Math.round(daily.temperature_2m_min[index]),
        rainSum: daily.precipitation_sum[index] || 0,
        rainProb: daily.precipitation_probability_max[index] || 0,
        uvIndex: daily.uv_index_max[index],
        sunrise: daily.sunrise[index].split('T')[1],
        sunset: daily.sunset[index].split('T')[1]
      })).slice(0, 7);

      setWeather({
        name: cityName,
        temp: Math.round(current.temperature_2m),
        wind: current.wind_speed_10m,
        humidity: current.relative_humidity_2m,
        rain: current.precipitation,
        pressure: current.surface_pressure,
        soil: current.soil_moisture_0_to_1cm, // 0-1 scale
        description: info.desc,
        icon: info.icon,
        tip: tip,
        todayHigh: daily.temperature_2m_max[0],
        todayLow: daily.temperature_2m_min[0],
        sunrise: daily.sunrise[0].split('T')[1],
        sunset: daily.sunset[0].split('T')[1]
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
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-xl border border-blue-100 text-xs text-gray-800">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((p, i) => (
             <p key={i} style={{ color: p.color }} className="font-semibold flex items-center gap-1">
               {p.name === 'maxTemp' ? 'Max Temp' : p.name === 'minTemp' ? 'Min Temp' : 'Rain'}: {p.value}{p.unit}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pt-24 md:pt-28 min-h-screen bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-900 p-4 sm:p-6 flex items-center justify-center font-sans">
      
      <div className="w-full max-w-7xl bg-white/10 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col lg:flex-row relative">
        
        {/* Background Blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-green-400/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        {/* LEFT PANEL: Controls & Current Stats */}
        <div className="p-6 md:p-8 lg:w-[40%] flex flex-col z-10 border-r border-white/10 bg-white/5">
          
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-2">
               <Sprout className="text-green-400" /> Agri-Forecast
            </h2>
            <p className="text-blue-200 text-sm">Real-time Precision Farming Data</p>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-6 relative z-20">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                placeholder="Search village/city..." 
                className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-200/70 p-3 pl-10 rounded-xl shadow-inner outline-none focus:bg-white/20 focus:border-green-400 transition-all backdrop-blur-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Search className="absolute left-3 top-3.5 text-blue-200 group-focus-within:text-green-400 transition-colors" size={18} />
            </div>
            <button onClick={getUserLocation} className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"><Navigation size={20} /></button>
            <button onClick={handleSearch} className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"><Search size={20} /></button>
          </div>

          {/* Loading/Error */}
          {loading && <div className="flex-1 flex flex-col items-center justify-center text-blue-200 animate-pulse min-h-[200px]"><Loader2 size={40} className="animate-spin mb-2" /><p>Scanning satellites...</p></div>}
          {error && <div className="p-4 bg-red-500/20 text-red-100 rounded-xl text-center mb-4 border border-red-500/30">{error}</div>}

          {/* Current Weather Detailed Grid */}
          {weather && !loading && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left duration-500">
               
               {/* Main Card */}
               <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl p-6 border border-white/10 text-center relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-center mb-2">{weather.icon}</div>
                    <div className="text-6xl font-bold text-white tracking-tighter drop-shadow-lg">{weather.temp}°</div>
                    <div className="text-blue-100 font-medium text-lg capitalize">{weather.description}</div>
                    <div className="flex justify-center gap-4 mt-4 text-sm text-blue-200">
                        <span className="flex items-center gap-1"><Thermometer size={14}/> H: {weather.todayHigh}°</span>
                        <span className="flex items-center gap-1"><Thermometer size={14}/> L: {weather.todayLow}°</span>
                    </div>
                  </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-2 gap-3">
                 {[
                   { icon: <Wind size={18} />, label: "Wind", val: weather.wind, unit: "km/h" },
                   { icon: <Droplets size={18} />, label: "Humidity", val: weather.humidity, unit: "%" },
                   { icon: <Umbrella size={18} />, label: "Rain", val: weather.rain, unit: "mm" },
                   { icon: <Eye size={18} />, label: "Soil Moist", val: (weather.soil || 0).toFixed(2), unit: "m³/m³" },
                   { icon: <Sunrise size={18} />, label: "Sunrise", val: weather.sunrise, unit: "" },
                   { icon: <Sunset size={18} />, label: "Sunset", val: weather.sunset, unit: "" },
                 ].map((item, i) => (
                   <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white/10 transition group">
                     <div className="text-blue-300 mb-1 group-hover:text-green-400 transition-colors">{item.icon}</div>
                     <span className="text-base font-bold text-white">{item.val} <span className="text-[10px] font-normal opacity-70">{item.unit}</span></span>
                     <span className="text-[10px] text-blue-200 uppercase tracking-wider">{item.label}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Visuals & Forecast */}
        <div className="lg:w-[60%] bg-gradient-to-b from-white/5 to-transparent p-6 md:p-8 text-white flex flex-col relative z-10">
          
          {weather ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <MapPin className="text-red-400" size={24} /> {weather.name}
                  </h3>
                  <p className="text-blue-200 text-sm ml-0 sm:ml-8 opacity-80">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                
                {/* Chart Toggle */}
                <div className="bg-white/10 p-1 rounded-xl flex">
                   <button 
                     onClick={() => setChartType("temp")}
                     className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${chartType === "temp" ? "bg-orange-500 text-white shadow-md" : "text-blue-200 hover:bg-white/5"}`}
                   >Temp</button>
                   <button 
                     onClick={() => setChartType("rain")}
                     className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${chartType === "rain" ? "bg-blue-500 text-white shadow-md" : "text-blue-200 hover:bg-white/5"}`}
                   >Rain</button>
                </div>
              </div>

              {/* Expert Tip */}
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-xl backdrop-blur-md border border-green-400/30 shadow-lg mb-6 flex items-start gap-3 transform hover:scale-[1.01] transition-transform">
                <div className="bg-green-500/20 p-2 rounded-lg shrink-0"><Sprout size={24} className="text-green-300" /></div>
                <div>
                  <h4 className="font-bold text-green-300 text-xs uppercase mb-1 flex items-center gap-2">Agronomist Recommendation</h4>
                  <p className="text-white text-sm sm:text-base leading-snug opacity-95 font-medium">{weather.tip}</p>
                </div>
              </div>

              {/* Chart Section */}
              <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10 shadow-inner backdrop-blur-sm mb-6">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "temp" ? (
                        <AreaChart data={forecast}>
                          <defs>
                            <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} unit="°" />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="maxTemp" stroke="#f97316" fill="url(#colorMax)" strokeWidth={2} unit="°" />
                          <Area type="monotone" dataKey="minTemp" stroke="#3b82f6" fill="url(#colorMin)" strokeWidth={2} unit="°" />
                        </AreaChart>
                    ) : (
                        <BarChart data={forecast}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} unit="mm" />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="rainSum" fill="#60a5fa" radius={[4, 4, 0, 0]} unit="mm" barSize={20} />
                        </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 7-Day List View (Mobile Optimized) */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[300px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {forecast.map((day, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition">
                          <div className="flex items-center gap-3 w-1/3">
                              <span className="text-sm font-bold w-8">{day.day}</span>
                              <span className="text-xs text-blue-200">{day.fullDate}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 flex-1 justify-center">
                              {day.rainSum > 1 ? <CloudRain size={18} className="text-blue-400"/> : <Sun size={18} className="text-yellow-400"/>}
                              <div className="flex flex-col text-center">
                                 <span className="text-xs font-bold text-blue-200">Rain</span>
                                 <span className="text-xs">{day.rainSum}mm</span>
                              </div>
                              <div className="flex flex-col text-center">
                                 <span className="text-xs font-bold text-blue-200">UV</span>
                                 <span className="text-xs">{day.uvIndex.toFixed(1)}</span>
                              </div>
                          </div>

                          <div className="w-1/4 text-right">
                              <span className="text-sm font-bold">{day.maxTemp}°</span> <span className="text-xs text-blue-300">/ {day.minTemp}°</span>
                          </div>
                      </div>
                  ))}
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 min-h-[400px]">
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