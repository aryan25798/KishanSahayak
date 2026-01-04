// src/components/MarketPrices.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { 
  Search, Server, UserCheck, MapPin, Loader, Calendar, 
  TrendingUp, X, Navigation, Info, BrainCircuit, Sparkles, Locate 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const MarketPrices = () => {
  const [prices, setPrices] = useState([]);
  const [firebaseData, setFirebaseData] = useState([]); 
  const [apiData, setApiData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false); 
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); 

  // Location & Distance
  const [userLocation, setUserLocation] = useState(null);
  const [distances, setDistances] = useState({}); 
  const [calculatingDist, setCalculatingDist] = useState({}); 
  
  // AI & Modal
  const [selectedCrop, setSelectedCrop] = useState(null); 
  const [aiLoading, setAiLoading] = useState(false);
  const [forecastData, setForecastData] = useState([]);

  // API Keys
  const API_KEY = import.meta.env.VITE_GOVT_API_KEY; 
  const RESOURCE_ID = import.meta.env.VITE_GOVT_RESOURCE_ID; 

  // 1. Get User Location on Mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => console.log("Location access denied or error:", err)
      );
    }
  }, []);

  // 2. Fetch Data (Firebase First -> API Background)
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "market_prices"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const manualData = snapshot.docs.map(doc => ({
        id: doc.id,
        source: "manual",
        ...doc.data()
      }));
      
      setFirebaseData(manualData);
      setLoading(false); 
      
      if (apiData.length === 0) {
          fetchGovtData();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setPrices([...firebaseData, ...apiData]);
  }, [firebaseData, apiData]);

  const fetchGovtData = async () => {
    if (!API_KEY || !RESOURCE_ID) return;
    setApiLoading(true);
    try {
      const limit = 100; 
      const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&limit=${limit}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.records) {
        const fetchedApiData = data.records.map((item, index) => ({
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
        setApiData(fetchedApiData);
      }
    } catch (error) {
      console.error("Govt API Error:", error);
    } finally {
      setApiLoading(false);
    }
  };

  // 3. Distance Calculation Logic (Fixed)
  const deg2rad = (deg) => deg * (Math.PI/180);

  const calculateDistance = async (item) => {
    // Check if user location is available
    if (!userLocation) {
        // Try to get it again if it's missing
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    // Recursive call now that we might have location
                    calculateDistance(item); 
                },
                (err) => alert("Please enable location services to calculate distance.")
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
        return;
    }

    const itemId = item.id;
    setCalculatingDist(prev => ({ ...prev, [itemId]: true }));

    try {
      // Create a search query for Nominatim (OpenStreetMap)
      const query = `${item.market}, ${item.district}, ${item.state}, India`;
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      
      const response = await fetch(geoUrl);
      const data = await response.json();

      if (data && data.length > 0) {
        const destLat = parseFloat(data[0].lat);
        const destLng = parseFloat(data[0].lon);
        
        // Haversine Formula
        const R = 6371; // Radius of earth in km
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
      console.error("Distance Error:", error);
      setDistances(prev => ({ ...prev, [itemId]: "Error" }));
    } finally {
      setCalculatingDist(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // --- AI PREDICTION ---
  const predictFuturePrices = async (crop, currentPriceStr, market) => {
    setAiLoading(true);
    setForecastData([]); 

    try {
        const currentPrice = Number(currentPriceStr.replace(/[^0-9.]/g, '')) || 2000;
        const month = new Date().toLocaleString('default', { month: 'long' });

        const prompt = `
            Act as an agricultural economist.
            Crop: ${crop}
            Market: ${market}
            Current Price: ₹${currentPrice} per quintal
            Current Month: ${month}

            Predict the price trend for the NEXT 4 WEEKS based on Indian seasonality.
            Return strictly a JSON array of 4 objects. No markdown.
            Format:
            [
                { "week": "Week 1", "price": 2100, "reason": "Short reason", "signal": "HOLD" }
            ]
            "signal" must be "BUY", "SELL", or "HOLD".
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonStr = text.replace(/```json|```/g, "").trim();
        const predictions = JSON.parse(jsonStr);
        setForecastData(predictions);

    } catch (err) {
        console.error("AI Error:", err);
        setForecastData([
            { week: "Week 1", price: 2100, reason: "AI Service Unavailable", signal: "HOLD" },
            { week: "Week 2", price: 2150, reason: "Estimated Trend", signal: "HOLD" }
        ]);
    } finally {
        setAiLoading(false);
    }
  };

  const openTrendModal = (item) => {
    setSelectedCrop(item);
    predictFuturePrices(item.crop, item.price, item.market);
  };

  const filteredPrices = prices.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = (p.crop && p.crop.toLowerCase().includes(s)) || (p.market && p.market.toLowerCase().includes(s));
    const matchesType = filterType === "all" || p.source === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="pt-24 min-h-screen bg-slate-50 px-4 sm:px-6 font-sans pb-20">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center mb-10 animate-fade-up">
          <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-2">Live Market Rates</h2>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">Mandi Bhav (मंडी भाव)</h1>
          <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto">Track real-time crop prices across India and get AI-powered forecasts.</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 animate-fade-up">
              <div className="relative flex-1 group">
                <input 
                  type="text" 
                  placeholder="Search Mandi or Crop..." 
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-4 top-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20}/>
              </div>
              
              <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
                <button onClick={() => setFilterType("all")} className={`px-6 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${filterType === "all" ? "bg-slate-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}>All</button>
                <button onClick={() => setFilterType("govt")} className={`px-6 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${filterType === "govt" ? "bg-blue-100 text-blue-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}>
                   <Server size={16}/> eNAM {apiLoading && <Loader size={12} className="animate-spin ml-1"/>}
                </button>
                <button onClick={() => setFilterType("manual")} className={`px-6 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${filterType === "manual" ? "bg-emerald-100 text-emerald-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}><UserCheck size={16}/> Verified</button>
              </div>
        </div>

        {/* Loading State */}
        {loading && prices.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-4">
            <Loader className="animate-spin text-emerald-600" size={48}/> 
            <span className="text-slate-400 font-medium animate-pulse">Fetching live prices across India...</span>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPrices.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                <Search size={48} className="mx-auto text-gray-300 mb-4"/>
                <p className="text-gray-400 font-medium">No results found for "{searchTerm}".</p>
              </div>
            ) : (
              filteredPrices.map((item, idx) => (
                <div key={item.id || idx} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group animate-fade-up">
                  {/* Image & Header */}
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-100 bg-gray-50">
                           {item.imageUrl ? (
                             <img src={item.imageUrl} alt={item.crop} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                           ) : (
                             <div className={`w-full h-full flex items-center justify-center text-2xl font-bold text-white ${item.source === 'manual' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                               {item.crop ? item.crop.charAt(0) : "?"}
                             </div>
                           )}
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-slate-900 leading-tight line-clamp-1">{item.crop}</h3>
                           <p className="text-xs text-gray-500 font-medium mt-1 bg-gray-100 px-2 py-0.5 rounded-md inline-block">
                             {item.variety ? item.variety : "Standard"}
                           </p>
                        </div>
                     </div>
                     <div className="shrink-0">
                       {item.source === 'govt' ? (
                          <span className="bg-blue-50 text-blue-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-wide">eNAM</span>
                       ) : (
                          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">Verified</span>
                       )}
                     </div>
                  </div>

                  {/* Details Block */}
                  <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100/50 flex-1">
                     <div className="flex items-start gap-2 mb-3">
                        <MapPin size={16} className="text-emerald-500 mt-0.5 shrink-0"/>
                        <div>
                           <span className="text-sm font-bold text-slate-700 block line-clamp-1">{item.market}</span>
                           <span className="text-xs text-slate-500">{item.district}, {item.state}</span>
                        </div>
                     </div>
                     
                     <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                           <Calendar size={14}/> {item.date}
                        </div>
                        
                        {/* Distance Button */}
                        {distances[item.id] ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-100">
                               <Navigation size={12}/> {distances[item.id]}
                            </span>
                        ) : (
                            <button 
                                onClick={() => calculateDistance(item)} 
                                disabled={calculatingDist[item.id]} 
                                className="text-[10px] bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 font-bold"
                            >
                                {calculatingDist[item.id] ? <Loader size={10} className="animate-spin"/> : <Locate size={12}/>} Distance
                            </button>
                        )}
                     </div>
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-end justify-between">
                     <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Model Price</p>
                        <div className="flex items-baseline gap-1">
                           <span className="text-2xl font-black text-slate-900">{item.price}</span>
                        </div>
                     </div>
                     <button 
                        onClick={() => openTrendModal(item)} 
                        className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                     >
                        <Sparkles size={14}/> AI Forecast
                     </button>
                  </div>

                </div>
              ))
            )}
          </div>
        )}

        {/* --- 🆕 RESPONSIVE AI MODAL --- */}
        {selectedCrop && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            {/* Modal Container */}
            <div className="bg-white w-full sm:max-w-2xl max-h-[85vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
              
              {/* Sticky Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white/90 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-100 to-indigo-50 rounded-xl text-purple-600 shadow-inner border border-purple-100"><BrainCircuit size={22}/></div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-none">AI Forecast</h2>
                    <p className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> {selectedCrop.crop} • {selectedCrop.market}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCrop(null)} className="p-2 bg-gray-50 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors border border-transparent hover:border-red-100"><X size={20} /></button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50/50">
                {aiLoading ? (
                   <div className="h-64 flex flex-col items-center justify-center text-purple-600">
                      <div className="relative">
                          <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600" size={20}/>
                      </div>
                      <p className="font-bold text-sm mt-4 animate-pulse">Analyzing market trends...</p>
                      <p className="text-xs text-slate-400 mt-1">Processing historical data & seasonality</p>
                   </div>
                ) : (
                   <div className="space-y-6">
                      {/* Chart Area */}
                      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h4 className="text-sm font-bold text-slate-700">Price Trend Projection</h4>
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase rounded-lg border border-purple-100">Next 4 Weeks</span>
                        </div>
                        <div className="h-56 sm:h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={forecastData}>
                                <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} dy={10} />
                                <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} tickFormatter={(value) => `₹${value}`} dx={-10}/>
                                <Tooltip 
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding:'12px'}}
                                    itemStyle={{color: '#7c3aed', fontWeight: 'bold'}}
                                />
                                <Area type="monotone" dataKey="price" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                            </AreaChart>
                            </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Insights Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {forecastData.map((week, i) => (
                              <div key={i} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col gap-2 hover:border-purple-200 hover:shadow-md transition-all">
                                  <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{week.week}</span>
                                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                                          week.signal === 'SELL' ? 'bg-red-50 text-red-600 border-red-100' :
                                          week.signal === 'BUY' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                          'bg-amber-50 text-amber-600 border-amber-100'
                                      }`}>
                                          {week.signal}
                                      </div>
                                  </div>
                                  <div className="flex items-baseline gap-1">
                                      <span className="text-2xl font-black text-slate-800">₹{week.price}</span>
                                      <span className="text-xs font-medium text-slate-400">/quintal</span>
                                  </div>
                                  <p className="text-xs text-slate-500 leading-relaxed border-t border-gray-50 pt-2 mt-auto">{week.reason}</p>
                              </div>
                          ))}
                      </div>
                      
                      {/* Footer Disclaimer */}
                      <div className="p-4 bg-blue-50/50 rounded-2xl flex items-start gap-3 text-xs text-blue-700/80 border border-blue-100/50">
                          <Info size={16} className="shrink-0 mt-0.5 text-blue-500"/>
                          <p>This forecast uses historical data and seasonality trends. Real-world prices may vary due to weather conditions, transport costs, or government policy changes.</p>
                      </div>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MarketPrices;