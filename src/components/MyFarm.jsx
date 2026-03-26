import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from "firebase/firestore";
import { 
  Save, Sprout, Tractor, Droplets, MapPin, Loader, Crosshair, 
  CheckCircle2, AlertCircle, LayoutDashboard, Trash2, PlusCircle, Ruler, Leaf
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// Visual data for soil types
const SOIL_TYPES = [
  { id: "Loamy", label: "Loamy", color: "from-amber-700 to-amber-900", desc: "Balanced & fertile" },
  { id: "Clay", label: "Clay", color: "from-orange-600 to-orange-800", desc: "Holds water well" },
  { id: "Sandy", label: "Sandy", color: "from-yellow-400 to-yellow-600", desc: "Drains quickly" },
  { id: "Black", label: "Black", color: "from-gray-700 to-gray-900", desc: "Good for cotton" },
  { id: "Silt", label: "Silt", color: "from-stone-400 to-stone-600", desc: "Retains moisture" },
  { id: "Red", label: "Red", color: "from-red-600 to-red-800", desc: "Iron-rich soil" },
];

const MyFarm = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  
  // Store Multiple Farms
  const [farms, setFarms] = useState([]);

  // Form Input State
  const [formData, setFormData] = useState({
    farmSize: "",
    unit: "Acres",
    soilType: "Loamy",
    irrigationType: "Rainfed",
    primaryCrops: "",
    location: ""
  });

  // Fetch Data
  useEffect(() => {
    const fetchFarmData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.farms && Array.isArray(data.farms)) {
            setFarms(data.farms);
          } else if (data.farmDetails) {
            setFarms([data.farmDetails]);
          }
        }
      } catch (error) {
        console.error("Error fetching farm data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFarmData();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selectSoil = (typeId) => {
    setFormData({ ...formData, soilType: typeId });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const village = data.address.village || data.address.town || data.address.city || "";
          const district = data.address.county || data.address.state_district || "";
          const state = data.address.state || "";
          const formattedLoc = [village, district, state].filter(Boolean).join(", ");
          
          setFormData(prev => ({ ...prev, location: formattedLoc }));
          toast.success("Location detected!");
        } catch (error) {
          toast.error("Could not fetch address. Please type manually.");
        } finally {
          setDetectingLoc(false);
        }
      },
      (error) => {
        toast.error("Unable to retrieve location.");
        setDetectingLoc(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.farmSize || !formData.location) {
      return toast.error("Please fill Farm Size and Location");
    }

    setSaving(true);
    try {
      const newFarm = { ...formData, id: Date.now() }; 
      const userRef = doc(db, "users", user.uid);
      
      await setDoc(userRef, { farms: arrayUnion(newFarm) }, { merge: true });
      
      setFarms(prev => [...prev, newFarm]); 
      setFormData({ 
        farmSize: "",
        unit: "Acres",
        soilType: "Loamy",
        irrigationType: "Rainfed",
        primaryCrops: "",
        location: ""
      });
      
      toast.success("New Land Added Successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFarm = async (farmToDelete) => {
    if (!confirm("Are you sure you want to delete this farm card?")) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        farms: arrayRemove(farmToDelete)
      });
      setFarms(prev => prev.filter(f => f.id !== farmToDelete.id));
      toast.success("Farm card deleted.");
    } catch (error) {
      toast.error("Could not delete.");
    }
  };

  if (loading) return <div className="h-screen flex justify-center items-center"><Loader className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="pt-24 min-h-screen bg-slate-50 px-4 md:px-8 pb-20 font-sans">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8">
        
        {/* --- LEFT COLUMN: Farm List --- */}
        <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
           <div className="flex items-center justify-between sticky top-20 z-10 bg-slate-50/80 backdrop-blur-md py-4">
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                 <Leaf className="text-emerald-600" size={28}/> My Lands
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                {farms.length} Active
              </span>
           </div>

           <AnimatePresence>
             {farms.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-10 rounded-3xl border-2 border-dashed border-slate-200 text-center"
                >
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LayoutDashboard size={32} className="text-slate-300"/>
                   </div>
                   <h3 className="text-lg font-bold text-slate-600">No lands added yet</h3>
                   <p className="text-slate-400 text-sm mt-1">Add your first farm using the form.</p>
                </motion.div>
             ) : (
                <div className="space-y-4">
                   {farms.map((farm, index) => (
                      <motion.div 
                        key={farm.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group relative hover:shadow-lg transition-all duration-300"
                      >
                         <button 
                           onClick={() => handleDeleteFarm(farm)}
                           className="absolute top-4 right-4 p-2 bg-white/80 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20 backdrop-blur-sm shadow-sm"
                           title="Delete Farm"
                         >
                           <Trash2 size={18} />
                         </button>

                         {/* Card Header */}
                         <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 border-b border-emerald-100/50 flex justify-between items-start">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <span className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                  <h3 className="font-bold text-slate-800 text-lg">Farm Profile</h3>
                               </div>
                               <p className="text-xs text-emerald-700 font-medium flex items-center gap-1 bg-emerald-100/50 px-2 py-1 rounded-lg w-fit">
                                  <MapPin size={12}/> {farm.location}
                               </p>
                            </div>
                            <div className="text-right">
                               <div className="flex flex-col items-end">
                                  <span className="text-2xl font-black text-emerald-600 leading-none">{farm.farmSize}</span>
                                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{farm.unit}</span>
                               </div>
                            </div>
                         </div>
                         
                         {/* Card Body */}
                         <div className="p-5 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Soil Type</p>
                               <div className="flex items-center gap-2 text-slate-700 font-bold">
                                  <span className={`w-3 h-3 rounded-full bg-gradient-to-br ${SOIL_TYPES.find(s=>s.id===farm.soilType)?.color || 'from-gray-400 to-gray-600'}`}></span>
                                  {farm.soilType}
                               </div>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Irrigation</p>
                               <div className="flex items-center gap-2 text-slate-700 font-bold truncate">
                                  <Droplets size={14} className="text-blue-500"/>
                                  {farm.irrigationType}
                               </div>
                            </div>
                         </div>

                         {/* Crops Tags */}
                         {farm.primaryCrops && (
                           <div className="px-5 pb-5 pt-0">
                              <div className="flex flex-wrap gap-2">
                                 {farm.primaryCrops.split(',').map((crop, i) => (
                                   <span key={i} className="bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
                                     {crop.trim()}
                                   </span>
                                 ))}
                              </div>
                           </div>
                         )}
                      </motion.div>
                   ))}
                </div>
             )}
           </AnimatePresence>
        </div>

        {/* --- RIGHT COLUMN: Add Farm Form --- */}
        <div className="lg:col-span-7 order-1 lg:order-2">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden sticky top-24"
           >
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 sm:p-8 text-white flex justify-between items-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                 <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                       <PlusCircle className="text-emerald-400"/> Add New Land
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Register a new field to get AI recommendations.</p>
                 </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
                
                {/* Size & Location Group */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Land Size</label>
                    <div className="flex gap-2 group focus-within:ring-2 focus-within:ring-emerald-500 rounded-xl transition-all">
                      <div className="relative flex-1">
                        <Ruler className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input 
                          type="number" 
                          name="farmSize" 
                          value={formData.farmSize} 
                          onChange={handleChange}
                          placeholder="e.g. 5" 
                          className="w-full pl-12 p-3 bg-slate-50 border-none rounded-xl focus:outline-none font-bold text-slate-800 placeholder:font-normal"
                          required
                        />
                      </div>
                      <select 
                        name="unit" 
                        value={formData.unit} 
                        onChange={handleChange}
                        className="p-3 bg-slate-100 rounded-xl font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-200 transition"
                      >
                        <option>Acres</option>
                        <option>Hectares</option>
                        <option>Bigha</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                      <button 
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={detectingLoc}
                        className="text-[10px] flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-bold hover:bg-emerald-100 transition disabled:opacity-50"
                      >
                        {detectingLoc ? <Loader size={10} className="animate-spin"/> : <Crosshair size={10}/>}
                        {detectingLoc ? "Locating..." : "Auto Detect"}
                      </button>
                    </div>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                      <input 
                        type="text" 
                        name="location" 
                        value={formData.location} 
                        onChange={handleChange}
                        placeholder="Village, District" 
                        className="w-full pl-12 p-3 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium border border-transparent focus:border-emerald-200"
                        required
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Soil Type Visual Select */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                    Soil Type <AlertCircle size={12} className="text-slate-400"/>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SOIL_TYPES.map((soil) => (
                      <button 
                        type="button"
                        key={soil.id}
                        onClick={() => selectSoil(soil.id)}
                        className={`
                          relative p-1 rounded-2xl transition-all duration-300 group text-left
                          ${formData.soilType === soil.id ? "ring-2 ring-emerald-500 scale-[1.02]" : "hover:scale-[1.02]"}
                        `}
                      >
                        <div className={`h-full bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm ${formData.soilType === soil.id ? "bg-emerald-50/30" : ""}`}>
                           <div className={`h-12 w-full bg-gradient-to-br ${soil.color} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                           <div className="p-3">
                              <div className="flex justify-between items-center">
                                 <span className="font-bold text-slate-700 text-sm">{soil.label}</span>
                                 {formData.soilType === soil.id && <CheckCircle2 size={16} className="text-emerald-600"/>}
                              </div>
                              <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">{soil.desc}</span>
                           </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Irrigation & Crops */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Irrigation Source</label>
                    <div className="relative">
                       <Droplets className="absolute left-4 top-3.5 text-blue-400 pointer-events-none" size={18}/>
                       <select 
                         name="irrigationType" 
                         value={formData.irrigationType} 
                         onChange={handleChange}
                         className="w-full pl-12 p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 appearance-none font-medium cursor-pointer"
                       >
                         <option>Rainfed (Monsoon)</option>
                         <option>Tube Well / Borewell</option>
                         <option>Canal</option>
                         <option>Drip Irrigation</option>
                         <option>Sprinkler</option>
                       </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Primary Crops</label>
                    <div className="relative">
                       <Sprout className="absolute left-4 top-3.5 text-green-500 pointer-events-none" size={18}/>
                       <input 
                         name="primaryCrops" 
                         value={formData.primaryCrops} 
                         onChange={handleChange}
                         placeholder="e.g. Wheat, Rice" 
                         className="w-full pl-12 p-3 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition font-medium"
                       />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 transform active:scale-[0.98]"
                  >
                    {saving ? <Loader className="animate-spin" /> : <Tractor size={20} />}
                    {saving ? "Saving Farm..." : "Add This Land"}
                  </button>
                </div>
              </form>
           </motion.div>
        </div>

      </div>
    </div>
  );
};

export default MyFarm;