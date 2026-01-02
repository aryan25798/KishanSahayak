// src/components/MarketPrices.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Search, TrendingUp, TrendingDown, Minus, Server, UserCheck, MapPin, Loader, Calendar, Info } from "lucide-react";

const MarketPrices = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); 

  // ✅ Credentials from your setup
  const API_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"; 
  const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"; 

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
    try {
      // ✅ 1. Increased Limit to 100 to get "Multiple Mandi Data"
      const limit = 100; 
      const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${API_KEY}&format=json&limit=${limit}`;
      
      const response = await fetch(url);
      const data = await response.json();

      let apiData = [];

      if (data.records) {
        // ✅ 2. Capturing ALL Information provided by API
        apiData = data.records.map((item, index) => ({
          id: `gov_${index}`,
          crop: item.commodity,       
          variety: item.variety,      // New: Variety (e.g. Hybrid, Local)
          market: item.market,        // Mandi Name
          district: item.district,    // New: District
          state: item.state,          // New: State
          price: `₹${item.modal_price}/qt`, 
          min_price: `₹${item.min_price}/qt`, // New: Min Price
          max_price: `₹${item.max_price}/qt`, // New: Max Price
          date: item.arrival_date,    // New: Date
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

  // ✅ 3. Enhanced Search: Filters by Crop OR Mandi Name OR District OR State
  const filteredPrices = prices.filter(p => {
    const s = searchTerm.toLowerCase();
    
    // Check if search term matches any key field
    const matchesSearch = 
      (p.crop && p.crop.toLowerCase().includes(s)) || 
      (p.market && p.market.toLowerCase().includes(s)) ||
      (p.district && p.district.toLowerCase().includes(s)) ||
      (p.state && p.state.toLowerCase().includes(s));

    const matchesType = filterType === "all" || p.source === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="pt-24 min-h-screen bg-slate-50 px-4 sm:px-6 font-sans pb-20">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-10 animate-fade-up">
          <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Live Market Rates</h2>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Mandi Bhav (मंडी भाव)</h1>
          <p className="text-gray-500 text-sm md:text-base">Real-time prices from eNAM (Govt) across India.</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 animate-fade-up">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Search Mandi, Crop, or District (e.g. 'Indore', 'Wheat')..." 
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
            <span className="animate-pulse">Loading live market data...</span>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredPrices.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
                <p className="text-gray-400 font-medium">No results found for "{searchTerm}"</p>
                <button onClick={() => setSearchTerm("")} className="mt-2 text-emerald-600 font-bold hover:underline">Clear Search</button>
              </div>
            ) : (
              filteredPrices.map((item, idx) => (
                // ✅ 4. Updated Card UI to show ALL Info
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 group animate-fade-up">
                  
                  {/* Top Row: Crop & Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md ${item.source === 'manual' ? 'bg-orange-500' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                        {item.crop ? item.crop.charAt(0) : "?"}
                      </div>
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

                  {/* Middle Row: Location & Date */}
                  <div className="flex flex-col gap-2 mb-6 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-500 shrink-0" /> 
                      <span className="font-semibold text-gray-800">{item.market}</span>, {item.district}, {item.state}
                    </div>
                    {item.date && (
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-emerald-500 shrink-0" />
                        <span>Arrival Date: <span className="font-medium text-gray-800">{item.date}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Prices */}
                  <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                    
                    {/* Range (Min - Max) */}
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

                    {/* Modal Price (Main) */}
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Model Price</p>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-2xl font-black text-emerald-600 tracking-tight">{item.price}</span>
                        {/* Trend Indicator */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] ${
                          item.change === 'up' ? 'bg-green-500' : item.change === 'down' ? 'bg-red-500' : 'bg-gray-300'
                        }`}>
                          {item.change === 'up' ? '▲' : item.change === 'down' ? '▼' : '-'}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketPrices;