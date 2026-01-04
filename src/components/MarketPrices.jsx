// src/components/MarketPrices.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { 
  Search, Server, UserCheck, MapPin, Loader, Calendar, 
  TrendingUp, X, Navigation, Info, BrainCircuit, Sparkles 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const MarketPrices = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); 

  // Location & Distance State
  const [userLocation, setUserLocation] = useState(null);
  const [distances, setDistances] = useState({}); 
  const [calculatingDist, setCalculatingDist] = useState({}); 
  
  // AI & Modal State
  const [selectedCrop, setSelectedCrop] = useState(null); 
  const [aiLoading, setAiLoading] = useState(false);
  const [forecastData, setForecastData] = useState([]);

  // API Keys
  const API_KEY = import.meta.env.VITE_GOVT_API_KEY; 
  const RESOURCE_ID = import.meta.env.VITE_GOVT_RESOURCE_ID; 

  // 1. Get User Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => console.log("Location access denied:", err)
      );
    }
  }, []);

  // 2. Fetch Data (Firebase + Govt API)
  useEffect(() => {
    const q = query(collection(db, "market_prices"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const manualData = snapshot.docs.map(doc => ({
        id: doc.id,
        source: "manual",
        ...doc.data()
      }));
      fetchGovtData(manualData);
    });

    return () => unsubscribe();
  }, []);

  const fetchGovtData = async (manualData) => {
    if (!API_KEY || !RESOURCE_ID) {
        setPrices(manualData);
        setLoading(false);
        return;
    }
    try {
      const limit = 100; 
      const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&limit=${limit}`;
      const response = await fetch(url);
      const data = await response.json();
      let apiData = [];

      if (data.records) {
        apiData = data.records.map((item, index) => ({
          id: `gov_${index}`,
          crop: item.commodity,       
          variety: item.variety,
          market: item.market,
          district: item.district,
          state: item.state,
          price: `₹${item.modal_price}/qt`, 
          min_price: `₹${item.min_price}/qt`,
          max_price: `₹${item.max_price}/qt`,
          date: item.arrival_date,
          change: "stable",           
          source: "govt"
        }));
      }
      setPrices([...manualData, ...apiData]);
    } catch (error) {
      console.error("Govt API Error:", error);
      setPrices(manualData);
    } finally {
      setLoading(false);
    }
  };

  // 3. Distance Calculation Logic
  const calculateDistance = async (item) => {
    if (!userLocation) {
      alert("Please enable location services first.");
      return;
    }
    const itemId = item.id;
    setCalculatingDist(prev => ({ ...prev, [itemId]: true }));

    try {
      const query = `${item.market}, ${item.district}, ${item.state}`;
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      const response = await fetch(geoUrl);
      const data = await response.json();

      if (data && data.length > 0) {
        const destLat = parseFloat(data[0].lat);
        const destLng = parseFloat(data[0].lon);
        const R = 6371; 
        const dLat = deg2rad(destLat - userLocation.lat);
        const dLng = deg2rad(destLng - userLocation.lng);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(deg2rad(userLocation.lat)) * Math.cos(deg2rad(destLat)) * Math.sin(dLng/2) * Math.sin(dLng/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const d = R * c; 
        setDistances(prev => ({ ...prev, [itemId]: `${d.toFixed(1)} km` }));
      } else {
        setDistances(prev => ({ ...prev, [itemId]: "Unknown" }));
      }
    } catch (error) {
      setDistances(prev => ({ ...prev, [itemId]: "Error" }));
    } finally {
      setCalculatingDist(prev => ({ ...prev, [itemId]: false }));
    }
  };
  const deg2rad = (deg) => deg * (Math.PI/180);

  // --- 🆕 AI PREDICTIVE ANALYSIS ---
  const predictFuturePrices = async (crop, currentPriceStr, market) => {
    setAiLoading(true);
    setForecastData([]); // Clear previous

    try {
        const currentPrice = Number(currentPriceStr.replace(/[^0-9.]/g, '')) || 2000;
        const month = new Date().toLocaleString('default', { month: 'long' });

        const prompt = `
            Act as an agricultural economist specializing in Indian markets.
            Crop: ${crop}
            Market: ${market}
            Current Price: ₹${currentPrice} per quintal
            Current Month: ${month}

            Based on historical Indian agricultural seasonality (harvest times, festivals, demand supply),
            predict the price trend for the NEXT 4 WEEKS.
            
            Return strictly a JSON array of 4 objects. No markdown.
            Format:
            [
                { "week": "Week 1", "price": 2100, "reason": "Reason string", "signal": "HOLD" },
                ...
            ]
            "signal" must be "BUY", "SELL", or "HOLD".
        `;

        // STRICTLY Using gemini-2.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonStr = text.replace(/```json|```/g, "").trim();
        const predictions = JSON.parse(jsonStr);
        setForecastData(predictions);

    } catch (err) {
        console.error("AI Prediction Error:", err);
        // Fallback dummy data if AI fails
        setForecastData([
            { week: "Week 1", price: 2000, reason: "AI Service Unavailable", signal: "HOLD" }
        ]);
    } finally {
        setAiLoading(false);
    }
  };

  const openTrendModal = (item) => {
    setSelectedCrop(item);
    // Trigger AI prediction immediately
    predictFuturePrices(item.crop, item.price, item.market);
  };

  const filteredPrices = prices.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      (p.crop && p.crop.toLowerCase().includes(s)) || 
      (p.market && p.market.toLowerCase().includes(s));
    const matchesType = filterType === "all" || p.source === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="pt-24 min-h-screen bg-slate-50 px-4 sm:px-6 font-sans pb-20">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-10 animate-fade-up">
          <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Live Market Rates</h2>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Mandi Bhav (मंडी भाव)</h1>
          <p className="text-gray-500 text-sm md:text-base">Real-time prices & AI forecasts.</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 animate-fade-up">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Search Mandi or Crop..." 
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-4 top-4 text-gray-400" size={20}/>
              </div>
              
              <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
                <button onClick={() => setFilterType("all")} className={`px-5 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${filterType === "all" ? "bg-slate-800 text-white" : "text-gray-500 hover:bg-gray-50"}`}>All</button>
                <button onClick={() => setFilterType("govt")} className={`px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${filterType === "govt" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}><Server size={14}/> eNAM</button>
                <button onClick={() => setFilterType("manual")} className={`px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${filterType === "manual" ? "bg-orange-100 text-orange-700" : "text-gray-500 hover:bg-gray-50"}`}><UserCheck size={14}/> Verified</button>
              </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-20 text-emerald-600 font-bold flex flex-col items-center gap-3">
            <Loader className="animate-spin" size={40}/> 
            <span className="animate-pulse">Fetching live prices...</span>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredPrices.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
                <p className="text-gray-400 font-medium">No results found.</p>
              </div>
            ) : (
              filteredPrices.map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 group animate-fade-up">
                  {/* Top Row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.crop} 
                          className="w-14 h-14 rounded-2xl object-cover shadow-md border border-gray-100"
                        />
                      ) : (
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md ${item.source === 'manual' ? 'bg-orange-500' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                          {item.crop ? item.crop.charAt(0) : "?"}
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{item.crop}</h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          {item.variety ? `Variety: ${item.variety}` : "Standard Variety"}
                        </p>
                      </div>
                    </div>
                    {item.source === 'govt' ? (
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-100 uppercase tracking-wide">eNAM</span>
                    ) : (
                      <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-3 py-1 rounded-full border border-orange-100 uppercase tracking-wide">Verified</span>
                    )}
                  </div>

                  {/* Middle Row */}
                  <div className="flex flex-col gap-2 mb-6 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-500 shrink-0" /> 
                      <span className="font-semibold text-gray-800">{item.market}</span>, {item.district}, {item.state}
                    </div>
                    {item.date && (
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-emerald-500 shrink-0" />
                        <span>Date: <span className="font-medium text-gray-800">{item.date}</span></span>
                      </div>
                    )}

                    {/* Distance Feature */}
                    <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-xs text-gray-500">Distance:</span>
                        {distances[item.id] ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                            {distances[item.id]}
                          </span>
                        ) : (
                          <button 
                            onClick={() => calculateDistance(item)}
                            disabled={calculatingDist[item.id]}
                            className="text-[10px] bg-white border border-gray-300 hover:bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                          >
                            {calculatingDist[item.id] ? <Loader size={10} className="animate-spin"/> : <Navigation size={10}/>}
                            Get Distance
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="w-16">Min Price:</span>
                        <span className="font-bold text-gray-700">{item.min_price || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-16">Max Price:</span>
                        <span className="font-bold text-gray-700">{item.max_price || "N/A"}</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Model Price</p>
                      <div className="flex items-center justify-end gap-2 mb-2">
                        <span className="text-2xl font-black text-emerald-600 tracking-tight">{item.price}</span>
                      </div>
                      
                      {/* 🆕 AI Forecast Button */}
                      <button 
                        onClick={() => openTrendModal(item)}
                        className="text-xs flex items-center gap-1 text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-100 px-3 py-1.5 rounded-lg transition-colors font-bold shadow-sm"
                      >
                        <Sparkles size={14} /> AI Forecast
                      </button>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- 🆕 PREDICTIVE AI MODAL --- */}
        {selectedCrop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-3xl rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
              
              {/* Background Glow */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <button 
                onClick={() => setSelectedCrop(null)}
                className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="mb-6 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <BrainCircuit className="text-purple-600" size={24} />
                  <h2 className="text-2xl font-bold text-gray-900">AI Price Prediction</h2>
                </div>
                <p className="text-gray-500">Forecasting {selectedCrop.crop} in {selectedCrop.market} for next 4 weeks.</p>
              </div>

              {aiLoading ? (
                 <div className="h-64 flex flex-col items-center justify-center text-purple-600">
                    <Loader size={48} className="animate-spin mb-4"/>
                    <p className="font-medium animate-pulse">Analyzing agricultural trends...</p>
                 </div>
              ) : (
                 <div className="space-y-6">
                    {/* Chart */}
                    <div className="h-64 w-full bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecastData}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="week" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748b'}} 
                          />
                          <YAxis 
                            domain={['auto', 'auto']} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748b'}}
                            tickFormatter={(value) => `₹${value}`}
                          />
                          <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#9333ea" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* AI Insights & Signals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {forecastData.map((week, i) => (
                            <div key={i} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex items-start gap-3">
                                <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                    week.signal === 'SELL' ? 'bg-red-100 text-red-700' :
                                    week.signal === 'BUY' ? 'bg-green-100 text-green-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {week.signal}
                                </div>
                                <div>
                                    <div className="flex justify-between items-center w-full mb-1">
                                        <h4 className="font-bold text-gray-800 text-sm">{week.week}</h4>
                                        <span className="font-bold text-purple-600 text-sm">₹{week.price}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-snug">{week.reason}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MarketPrices;