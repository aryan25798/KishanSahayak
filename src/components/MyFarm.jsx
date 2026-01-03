import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { 
  Save, 
  Sprout, 
  Tractor, 
  Droplets, 
  MapPin, 
  Loader, 
  Crosshair, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

// Visual data for soil types to help farmers select easier
const SOIL_TYPES = [
  { id: "Loamy", label: "Loamy Soil", color: "bg-amber-800", desc: "Dark, crumbly, holds water well" },
  { id: "Clay", label: "Clay Soil", color: "bg-orange-700", desc: "Sticky when wet, hard when dry" },
  { id: "Sandy", label: "Sandy Soil", color: "bg-yellow-200", desc: "Gritty, drains very quickly" },
  { id: "Black", label: "Black Soil", color: "bg-gray-900", desc: "Cotton soil, cracks when dry" },
  { id: "Silt", label: "Silt Soil", color: "bg-stone-500", desc: "Smooth like flour, retains moisture" },
  { id: "Red", label: "Red Soil", color: "bg-red-700", desc: "Iron-rich, porous structure" },
];

const MyFarm = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  
  const [formData, setFormData] = useState({
    farmSize: "",
    unit: "Acres",
    soilType: "Loamy",
    irrigationType: "Rainfed",
    primaryCrops: "",
    location: ""
  });

  useEffect(() => {
    const fetchFarmData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().farmDetails) {
          setFormData(docSnap.data().farmDetails);
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

  // New: Select soil type visually
  const selectSoil = (typeId) => {
    setFormData({ ...formData, soilType: typeId });
  };

  // New: Geolocation Logic
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
          // Using OpenStreetMap's Nominatim API (Free, no key needed for low volume)
          // Note: In a heavy production app, consider Google Maps Geocoding API or a paid proxy
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          // Construct a readable address
          const village = data.address.village || data.address.town || data.address.city || "";
          const district = data.address.county || data.address.state_district || "";
          const state = data.address.state || "";
          
          const formattedLoc = [village, district, state].filter(Boolean).join(", ");
          
          setFormData(prev => ({ ...prev, location: formattedLoc }));
          toast.success("Location detected!");
        } catch (error) {
          console.error("Geocoding error:", error);
          toast.error("Could not fetch address details. Please type manually.");
        } finally {
          setDetectingLoc(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Unable to retrieve your location.");
        setDetectingLoc(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      // Merge with existing user data (preserving role, etc.)
      await setDoc(userRef, { farmDetails: formData }, { merge: true });
      toast.success("Farm details saved successfully!");
    } catch (error) {
      console.error("Error saving farm data:", error);
      toast.error("Failed to save details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-green-600" /></div>;

  return (
    <div className="pt-24 min-h-screen bg-green-50 p-6 flex justify-center">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-green-100">
        <div className="bg-green-600 p-6 text-white flex items-center gap-3">
          <Tractor size={32} />
          <div>
            <h1 className="text-2xl font-bold">My Farm Profile</h1>
            <p className="text-green-100 text-sm">Personalize your Kishan Sahayak experience</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Section 1: Basic Details */}
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Farm Size */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin size={16} className="text-green-600"/> Farm Size
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  name="farmSize" 
                  value={formData.farmSize} 
                  onChange={handleChange}
                  placeholder="e.g. 5" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition"
                  required
                />
                <select 
                  name="unit" 
                  value={formData.unit} 
                  onChange={handleChange}
                  className="p-3 border border-gray-300 rounded-lg bg-gray-50 outline-none font-medium text-gray-700"
                >
                  <option>Acres</option>
                  <option>Hectares</option>
                  <option>Bigha</option>
                </select>
              </div>
            </div>

            {/* Location with Auto-Detect */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                <span>Village / District</span>
                <button 
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingLoc}
                  className="text-xs flex items-center gap-1 text-green-600 hover:text-green-800 font-bold transition disabled:opacity-50"
                >
                  {detectingLoc ? <Loader size={12} className="animate-spin"/> : <Crosshair size={12}/>}
                  {detectingLoc ? "Locating..." : "Use Current Location"}
                </button>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input 
                  type="text" 
                  name="location" 
                  value={formData.location} 
                  onChange={handleChange}
                  placeholder="e.g. Rampur, Uttar Pradesh" 
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 2: Soil Type (Visual Selection) */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Sprout size={16} className="text-green-600"/> Soil Type
              <span className="text-xs font-normal text-gray-500 ml-auto flex items-center gap-1">
                <AlertCircle size={12}/> Select the one that matches best
              </span>
            </label>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {SOIL_TYPES.map((soil) => (
                <div 
                  key={soil.id}
                  onClick={() => selectSoil(soil.id)}
                  className={`
                    relative cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden group
                    ${formData.soilType === soil.id 
                      ? "border-green-600 ring-1 ring-green-600 shadow-md bg-green-50" 
                      : "border-gray-200 hover:border-green-300 hover:shadow-sm bg-white"}
                  `}
                >
                  {formData.soilType === soil.id && (
                    <div className="absolute top-2 right-2 text-green-600">
                      <CheckCircle2 size={20} fill="white" />
                    </div>
                  )}
                  <div className={`h-16 w-full ${soil.color} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                  <div className="p-3">
                    <h3 className="font-bold text-gray-800 text-sm">{soil.label}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-tight">{soil.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 3: Irrigation & Crops */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Droplets size={16} className="text-green-600"/> Irrigation Source
              </label>
              <select 
                name="irrigationType" 
                value={formData.irrigationType} 
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition bg-white"
              >
                <option>Rainfed (Monsoon)</option>
                <option>Tube Well / Borewell</option>
                <option>Canal</option>
                <option>Drip Irrigation</option>
                <option>Sprinkler</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Primary Crops</label>
              <textarea 
                name="primaryCrops" 
                value={formData.primaryCrops} 
                onChange={handleChange}
                placeholder="e.g. Wheat, Rice, Sugarcane" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition h-[50px] resize-none"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-70 transform active:scale-[0.99]"
            >
              {saving ? <Loader className="animate-spin" /> : <Save size={20} />}
              {saving ? "Saving Profile..." : "Save Farm Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyFarm;