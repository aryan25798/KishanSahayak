// src/components/Schemes.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Search, ScrollText, ArrowRight, Loader } from "lucide-react";

const Schemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "schemes"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSchemes(data);
      } catch (error) {
        console.error("Error fetching schemes:", error);
      }
      setLoading(false);
    };
    fetchSchemes();
  }, []);

  // Filter logic
  const filteredSchemes = schemes.filter(s => 
    s.title.toLowerCase().includes(filter.toLowerCase()) || 
    s.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="pt-24 min-h-screen bg-canvas px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-sm font-bold text-brand-600 uppercase tracking-widest mb-2">Financial Aid</h2>
          <h1 className="text-4xl md:text-5xl font-extrabold text-brand-900 mb-4 tracking-tight">Government Schemes</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Discover subsidies, loans, and insurance plans tailored for your farming needs.
          </p>
        </div>

        {/* Search Bar (Glass Style) */}
        <div className="max-w-xl mx-auto relative mb-16 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="relative group">
            <input 
              type="text"
              placeholder="Search schemes (e.g. 'Loan', 'Seeds')..."
              className="w-full p-5 pl-14 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-xl shadow-soft focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-gray-800 placeholder:text-gray-400"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <Search className="absolute left-5 top-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={20} />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center text-brand-600 gap-3 font-bold py-20">
            <Loader className="animate-spin" /> Loading schemes...
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSchemes.map((scheme, index) => (
            // ✨ PREMIUM GLASS CARD
            <div 
              key={scheme.id} 
              className="group relative bg-white/60 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-sm hover:shadow-glass transition-all duration-500 hover:-translate-y-2 flex flex-col overflow-hidden animate-fade-up"
              style={{ animationDelay: `${0.1 + (index * 0.05)}s` }} // Staggered animation
            >
              
              {/* Decoration Blob */}
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-brand-100/50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                {/* Icon Wrapper */}
                <div className="w-16 h-16 bg-white text-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-orange-50 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <ScrollText size={32} />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-brand-700 transition-colors">{scheme.title}</h3>
                
                <span className="text-[10px] font-bold tracking-wider uppercase text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full w-fit mb-5 border border-brand-100">
                  {scheme.category}
                </span>
                
                <p className="text-gray-500 text-sm mb-8 flex-1 leading-relaxed">
                  {scheme.description}
                </p>
                
                <button className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-brand-600 transition-all shadow-lg shadow-gray-200 hover:shadow-brand-500/30 flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-[0.98]">
                  Apply Now <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ))}
          
          {!loading && filteredSchemes.length === 0 && (
            <div className="col-span-full text-center py-20">
              <div className="bg-white/50 inline-block p-8 rounded-3xl border border-white/60">
                <p className="text-gray-400 text-lg">No schemes found matching "{filter}".</p>
                <button onClick={() => setFilter("")} className="mt-4 text-brand-600 font-bold hover:underline">Clear Search</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schemes;