// src/components/Schemes.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext"; 
import { Search, ScrollText, ArrowRight, Loader, CheckCircle, XCircle, Clock, MapPin } from "lucide-react"; // Added Icons

const Schemes = () => {
  const { user } = useAuth(); 
  const [schemes, setSchemes] = useState([]);
  const [applicationStatus, setApplicationStatus] = useState({}); // ✅ Stores { schemeId: "Pending" | "Accepted" | "Rejected" }
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [applyingId, setApplyingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch All Schemes
        const schemesSnap = await getDocs(collection(db, "schemes"));
        const schemesData = schemesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSchemes(schemesData);

        // 2. Fetch User's Applications (if logged in)
        if (user) {
          const appsRef = collection(db, "applications");
          const q = query(appsRef, where("uid", "==", user.uid));
          const appsSnap = await getDocs(q);
          
          // Create a map of Scheme ID -> Status
          const statusMap = {};
          appsSnap.docs.forEach(doc => {
            const data = doc.data();
            statusMap[data.schemeId] = data.status; // e.g., "Pending", "Accepted", "Rejected"
          });
          setApplicationStatus(statusMap);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleApply = async (scheme) => {
    if (!user) {
      alert("Please login to apply.");
      return;
    }

    setApplyingId(scheme.id);

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setApplyingId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        await addDoc(collection(db, "applications"), {
          applicantName: user.displayName || "Farmer",
          applicantEmail: user.email,
          uid: user.uid,
          schemeId: scheme.id,
          schemeTitle: scheme.title,
          location: { lat: latitude, lng: longitude },
          status: "Pending", // Default status
          appliedAt: serverTimestamp()
        });

        alert(`Successfully applied for ${scheme.title}!`);
        
        // Update local state instantly to show "Pending"
        setApplicationStatus((prev) => ({ ...prev, [scheme.id]: "Pending" }));

      } catch (error) {
        console.error("Error applying:", error);
        alert("Failed to apply. Try again.");
      } finally {
        setApplyingId(null);
      }
    }, (error) => {
      alert("Location permission required to apply.");
      setApplyingId(null);
    });
  };

  const filteredSchemes = schemes.filter(s => 
    s.title.toLowerCase().includes(filter.toLowerCase()) || 
    s.category.toLowerCase().includes(filter.toLowerCase())
  );

  // Helper to get Button Styles based on Status
  const getStatusButton = (status, schemeId) => {
    if (applyingId === schemeId) {
      return (
        <button disabled className="w-full py-4 bg-gray-200 text-gray-500 rounded-xl font-bold flex items-center justify-center gap-2 cursor-wait">
          <Loader size={18} className="animate-spin"/> Applying...
        </button>
      );
    }

    switch (status) {
      case "Accepted":
        return (
          <button disabled className="w-full py-4 bg-green-100 text-green-700 border border-green-200 rounded-xl font-bold flex items-center justify-center gap-2 cursor-default">
            <CheckCircle size={20} /> Accepted
          </button>
        );
      case "Rejected":
        return (
          <button disabled className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold flex items-center justify-center gap-2 cursor-default">
            <XCircle size={20} /> Rejected
          </button>
        );
      case "Pending":
        return (
          <button disabled className="w-full py-4 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-xl font-bold flex items-center justify-center gap-2 cursor-default">
            <Clock size={20} /> Applied (Pending)
          </button>
        );
      default:
        // Not Applied Yet
        return (
          <button 
            onClick={() => handleApply(schemes.find(s => s.id === schemeId))}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ArrowRight size={18} /> Apply Now
          </button>
        );
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-slate-50 px-6 font-sans pb-20">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-2">Financial Aid</h2>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Government Schemes</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Discover subsidies, loans, and insurance plans tailored for your farming needs.
          </p>
        </div>

        <div className="max-w-xl mx-auto relative mb-16 animate-fade-up">
          <div className="relative group">
            <input 
              type="text"
              placeholder="Search schemes..."
              className="w-full p-5 pl-14 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <Search className="absolute left-5 top-5 text-gray-400" size={20} />
          </div>
        </div>

        {loading && <div className="flex justify-center text-emerald-600 gap-3 font-bold py-20"><Loader className="animate-spin" /> Loading schemes...</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSchemes.map((scheme, index) => {
            const status = applicationStatus[scheme.id]; // Get status for this scheme

            return (
              <div 
                key={scheme.id} 
                className="group relative bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col overflow-hidden animate-fade-up"
                style={{ animationDelay: `${0.1 + (index * 0.05)}s` }}
              >
                <div className="h-48 w-full overflow-hidden bg-gray-100 relative">
                  {scheme.imageUrl ? (
                    <img src={scheme.imageUrl} alt={scheme.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-200 bg-emerald-50">
                      <ScrollText size={64} />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100 shadow-sm uppercase tracking-wider">
                    {scheme.category}
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors">{scheme.title}</h3>
                  
                  <p className="text-gray-500 text-sm mb-8 flex-1 leading-relaxed line-clamp-3">
                    {scheme.description}
                  </p>
                  
                  {/* ✅ Render the correct button based on status */}
                  {getStatusButton(status, scheme.id)}
                  
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Schemes;