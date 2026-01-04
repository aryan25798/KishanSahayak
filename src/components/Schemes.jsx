// src/components/Schemes.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext"; 
import { 
  Search, ScrollText, ArrowRight, Loader, CheckCircle, XCircle, 
  Clock, MapPin, CalendarDays, LayoutGrid, ListChecks, Filter, TrendingUp
} from "lucide-react"; 

const Schemes = () => {
  const { user } = useAuth(); 
  const [schemes, setSchemes] = useState([]);
  const [applications, setApplications] = useState([]); // Store full application objects
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [applyingId, setApplyingId] = useState(null);
  const [activeTab, setActiveTab] = useState("explore"); // 'explore' | 'applied'

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch All Schemes
        const schemesRef = collection(db, "schemes");
        const schemesSnap = await getDocs(schemesRef); 
        
        const schemesData = schemesSnap.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));

        // Sort by timestamp (Newest First)
        schemesData.sort((a, b) => {
            const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
            const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
            return dateB - dateA;
        });

        setSchemes(schemesData);

        // 2. Fetch User's Applications
        if (user) {
          const appsRef = collection(db, "applications");
          const q = query(appsRef, where("uid", "==", user.uid));
          const appsSnap = await getDocs(q);
          
          const appData = appsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setApplications(appData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // --- Helpers ---
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Recently";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 30) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleApply = async (scheme) => {
    if (!user) return alert("Please login to apply.");
    setApplyingId(scheme.id);

    if (!navigator.geolocation) return alert("Geolocation required.");

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const newApp = {
          applicantName: user.displayName || "Farmer",
          applicantEmail: user.email,
          uid: user.uid,
          schemeId: scheme.id,
          schemeTitle: scheme.title,
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          status: "Pending",
          appliedAt: serverTimestamp()
        };

        await addDoc(collection(db, "applications"), newApp);
        
        // Optimistic UI Update
        setApplications(prev => [...prev, { ...newApp, appliedAt: { toDate: () => new Date() } }]); // Mock timestamp for instant UI
        setActiveTab("applied"); // Switch to applied tab
        
      } catch (error) {
        console.error("Error applying:", error);
        alert("Failed to apply.");
      } finally {
        setApplyingId(null);
      }
    });
  };

  // --- Derived Data ---
  const appliedSchemeIds = new Set(applications.map(a => a.schemeId));
  
  // 1. Explore List: Schemes user has NOT applied for matches filter
  const exploreList = schemes.filter(s => 
    !appliedSchemeIds.has(s.id) && 
    (s.title.toLowerCase().includes(filter.toLowerCase()) || s.category.toLowerCase().includes(filter.toLowerCase()))
  );

  // 2. Applied List: Merge Scheme Data with Application Status
  const appliedList = applications.map(app => {
    const scheme = schemes.find(s => s.id === app.schemeId) || {};
    return { ...scheme, ...app, applicationStatus: app.status }; // Merge info
  }).filter(item => item.schemeTitle?.toLowerCase().includes(filter.toLowerCase()));

  // Stats
  const stats = {
    total: schemes.length,
    applied: applications.length,
    approved: applications.filter(a => a.status === "Accepted").length
  };

  return (
    <div className="pt-24 min-h-screen bg-slate-50 px-4 sm:px-6 font-sans pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 animate-fade-up">
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-slate-800">{stats.total}</span>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Available</span>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-blue-600">{stats.applied}</span>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Applied</span>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-emerald-600">{stats.approved}</span>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Approved</span>
            </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 animate-fade-up">
            
            {/* Tabs */}
            <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab("explore")}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "explore" ? "bg-slate-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                >
                    <LayoutGrid size={16}/> Explore
                </button>
                <button 
                    onClick={() => setActiveTab("applied")}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "applied" ? "bg-slate-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                >
                    <ListChecks size={16}/> My Applications
                    {applications.length > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{applications.length}</span>}
                </button>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80">
                <input 
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
            </div>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-emerald-600 gap-3">
                <Loader className="animate-spin" size={32} />
                <span className="font-bold animate-pulse">Loading opportunities...</span>
            </div>
        ) : (
            <>
                {/* --- TAB 1: EXPLORE SCHEMES --- */}
                {activeTab === "explore" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                        {exploreList.length === 0 ? (
                            <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                                <Filter size={40} className="mx-auto text-gray-300 mb-3"/>
                                <p className="text-gray-400 font-medium">No new schemes found matching your search.</p>
                            </div>
                        ) : (
                            exploreList.map((scheme, index) => (
                                <div key={scheme.id} className="group bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                                    <div className="h-44 w-full overflow-hidden bg-gray-100 relative">
                                        {scheme.imageUrl ? (
                                            <img src={scheme.imageUrl} alt={scheme.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-emerald-200 bg-emerald-50"><ScrollText size={48} /></div>
                                        )}
                                        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-slate-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                            {scheme.category}
                                        </span>
                                    </div>
                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">
                                            <CalendarDays size={12} className="text-emerald-500"/> Posted {getTimeAgo(scheme.timestamp)}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight group-hover:text-emerald-700 transition-colors">{scheme.title}</h3>
                                        <p className="text-gray-500 text-sm mb-6 flex-1 line-clamp-3 leading-relaxed">{scheme.description}</p>
                                        
                                        <button 
                                            onClick={() => handleApply(scheme)}
                                            disabled={applyingId === scheme.id}
                                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                                        >
                                            {applyingId === scheme.id ? <Loader size={18} className="animate-spin"/> : <><ArrowRight size={18} /> Apply Now</>}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- TAB 2: MY APPLICATIONS --- */}
                {activeTab === "applied" && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        {appliedList.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                                <TrendingUp size={40} className="mx-auto text-gray-300 mb-3"/>
                                <p className="text-gray-400 font-medium">You haven't applied to any schemes yet.</p>
                                <button onClick={() => setActiveTab("explore")} className="mt-4 text-emerald-600 font-bold hover:underline">Explore Opportunities</button>
                            </div>
                        ) : (
                            appliedList.map((app) => (
                                <div key={app.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all">
                                    <div className="w-full md:w-32 h-32 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                                        {app.imageUrl ? (
                                            <img src={app.imageUrl} alt={app.schemeTitle} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-emerald-200 bg-emerald-50"><ScrollText size={32} /></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">{app.schemeTitle || "Unknown Scheme"}</h3>
                                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                    <Clock size={14}/> Applied on: {getTimeAgo(app.appliedAt)}
                                                </p>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border ${
                                                app.applicationStatus === "Accepted" ? "bg-green-50 text-green-700 border-green-100" :
                                                app.applicationStatus === "Rejected" ? "bg-red-50 text-red-700 border-red-100" :
                                                "bg-yellow-50 text-yellow-700 border-yellow-100"
                                            }`}>
                                                {app.applicationStatus === "Accepted" && <CheckCircle size={14}/>}
                                                {app.applicationStatus === "Rejected" && <XCircle size={14}/>}
                                                {app.applicationStatus === "Pending" && <Loader size={14} className="animate-spin-slow"/>}
                                                {app.applicationStatus}
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-gray-50 flex gap-6 text-sm text-gray-600">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase text-gray-400 font-bold">Category</span>
                                                <span className="font-medium">{app.category || "General"}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase text-gray-400 font-bold">Applicant</span>
                                                <span className="font-medium">{app.applicantName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default Schemes;