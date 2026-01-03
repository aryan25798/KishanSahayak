// src/components/MyFarm.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Save, Sprout, Tractor, Droplets, MapPin, Loader } from "lucide-react";
import toast from "react-hot-toast";

const MyFarm = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-green-100">
        <div className="bg-green-600 p-6 text-white flex items-center gap-3">
          <Tractor size={32} />
          <div>
            <h1 className="text-2xl font-bold">My Farm Profile</h1>
            <p className="text-green-100 text-sm">Personalize your Kishan Sahayak experience</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Farm Size */}
            <div className="space-y-2">
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
                  className="p-3 border border-gray-300 rounded-lg bg-gray-50 outline-none"
                >
                  <option>Acres</option>
                  <option>Hectares</option>
                  <option>Bigha</option>
                </select>
              </div>
            </div>

            {/* Soil Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sprout size={16} className="text-green-600"/> Soil Type
              </label>
              <select 
                name="soilType" 
                value={formData.soilType} 
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition bg-white"
              >
                <option>Clay</option>
                <option>Sandy</option>
                <option>Loamy</option>
                <option>Silt</option>
                <option>Peaty</option>
                <option>Chalky</option>
                <option>Black Soil</option>
              </select>
            </div>

            {/* Irrigation */}
            <div className="space-y-2">
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

            {/* Location/Village */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Village / District</label>
              <input 
                type="text" 
                name="location" 
                value={formData.location} 
                onChange={handleChange}
                placeholder="e.g. Rampur, Uttar Pradesh" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition"
              />
            </div>
          </div>

          {/* Primary Crops */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Primary Crops (Comma separated)</label>
            <textarea 
              name="primaryCrops" 
              value={formData.primaryCrops} 
              onChange={handleChange}
              placeholder="e.g. Wheat, Rice, Sugarcane, Mustard" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition h-24 resize-none"
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
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