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
    <div className="pt-24 min-h-screen bg-gray-50 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Government Schemes</h1>
          <p className="text-gray-500">Find financial aid and subsidies tailored for you.</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative mb-12">
          <input 
            type="text"
            placeholder="Search schemes (e.g. 'Loan', 'Seeds')..."
            className="w-full p-4 pl-12 rounded-full border border-gray-200 shadow-sm focus:ring-2 focus:ring-green-500 outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Search className="absolute left-4 top-4 text-gray-400" />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center text-green-600 gap-2">
            <Loader className="animate-spin" /> Loading schemes...
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchemes.map((scheme) => (
            <div key={scheme.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition border border-gray-100 flex flex-col">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
                <ScrollText size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">{scheme.title}</h3>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit mb-3">
                {scheme.category}
              </span>
              <p className="text-gray-500 text-sm mb-6 flex-1">
                {scheme.description}
              </p>
              <button className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition flex items-center justify-center gap-2">
                Apply Now <ArrowRight size={16} />
              </button>
            </div>
          ))}
          
          {!loading && filteredSchemes.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-10">
              No schemes found matching "{filter}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schemes;