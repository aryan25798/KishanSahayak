// src/components/CropDoctor.jsx
import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { 
  Camera, Upload, ScanLine, Leaf, AlertTriangle, 
  Sprout, Loader2, X, Beaker, Activity, CheckCircle2, ChevronRight,
  History, Trash2, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// Firebase Imports
import { db } from "../firebase";
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const CropDoctor = () => {
  const { user } = useAuth(); // Get current user for history
  
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // History State
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      setError("CRITICAL: API Key missing in .env");
    }
  }, []);

  // Fetch History on Mount or User Change
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, "diagnoses"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Convert timestamp to readable date if it exists
        date: doc.data().timestamp?.toDate().toLocaleDateString() || "Recent"
      }));
      setHistory(historyData);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveDiagnosis = async (diagnosisData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "diagnoses"), {
        userId: user.uid,
        name: diagnosisData.name,
        severity: diagnosisData.severity,
        organic: diagnosisData.organic,
        chemical: diagnosisData.chemical,
        timestamp: serverTimestamp(),
      });
      toast.success("Diagnosis saved to history");
      fetchHistory(); // Refresh list
    } catch (error) {
      console.error("Error saving diagnosis:", error);
    }
  };

  const deleteHistoryItem = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this record?")) return;
    
    try {
      await deleteDoc(doc(db, "diagnoses", id));
      setHistory(prev => prev.filter(item => item.id !== id));
      toast.success("Record deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const loadHistoryItem = (item) => {
    setResult(item);
    setShowHistory(false); // Switch back to result view
    // Note: We don't restore the image preview as we aren't storing images in DB to save costs
    setPreview(null); 
    setImage(null);
  };

  const fileToGenerativePart = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({
        inlineData: { data: reader.result.split(",")[1], mimeType: file.type },
      });
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setShowHistory(false); // Hide history when new image selected
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    
    setLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      });

      const prompt = `
        Analyze this plant image as an expert agronomist.
        Identify the disease or issue.
        Return the response ONLY as a valid JSON object. Do not add Markdown formatting.
        Use this exact structure:
        {
          "name": "Disease Name",
          "severity": "Low/Medium/High",
          "organic": "Short organic cure instructions",
          "chemical": "Short chemical cure instructions"
        }
        If the image is not a plant, return: {"name": "Not a Plant", "severity": "N/A", "organic": "N/A", "chemical": "N/A"}
      `;
      
      const imagePart = await fileToGenerativePart(image);
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      
      const text = response.text().replace(/```json|```/g, "").trim();
      const data = JSON.parse(text);
      
      setResult(data);
      
      // Auto-save to history if it's a valid plant analysis
      if (data.name !== "Not a Plant") {
        saveDiagnosis(data);
      }

    } catch (err) {
      console.error("Error:", err);
      setError("Analysis failed. Try a clearer photo.");
    }
    setLoading(false);
  };

  const clearAll = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="pt-24 md:pt-32 min-h-screen bg-slate-50 font-sans p-4 md:p-8 flex justify-center pb-20">
      
      <div className="max-w-6xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col lg:flex-row min-h-[600px]">
        
        {/* LEFT PANEL: Upload & Camera (Dark Mode Style) */}
        <div className="lg:w-[45%] bg-slate-900 p-8 flex flex-col relative overflow-hidden">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none"></div>

          <div className="relative z-10 flex-1 flex flex-col">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Camera className="text-emerald-400" /> Crop Doctor
            </h2>
            <p className="text-slate-400 mb-8">AI-powered plant disease diagnosis in seconds.</p>

            {/* Upload Area */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {!preview ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.02 }}
                    className="w-full h-80 border-2 border-dashed border-slate-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-slate-800/50 transition-all group relative overflow-hidden"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-black/20 z-10">
                      <Upload size={32} className="text-emerald-400" />
                    </div>
                    <p className="text-slate-300 font-medium z-10">Click to Upload Photo</p>
                    <p className="text-xs text-slate-500 mt-2 z-10">JPG, PNG supported</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    className="relative w-full h-80 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 group"
                  >
                    <img src={preview} alt="Crop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    
                    {/* Scanning Overlay */}
                    {loading && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                        <Loader2 className="animate-spin text-emerald-400 mb-2" size={48} />
                        <span className="text-white font-bold tracking-widest text-sm animate-pulse">ANALYZING...</span>
                      </div>
                    )}

                    {!loading && (
                      <button 
                        onClick={clearAll} 
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-all hover:rotate-90"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Button */}
            {preview && !loading && !result && (
              <motion.button 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalyze}
                className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-3 text-lg"
              >
                <ScanLine size={22} /> Diagnose Disease
              </motion.button>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-mono flex items-center gap-3"
              >
                <AlertTriangle size={16} /> {error}
              </motion.div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Results or History */}
        <div className="lg:w-[55%] bg-white p-8 lg:p-12 relative flex flex-col">
          
          {/* History Toggle Button (Absolute Top Right) */}
          {user && (
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="absolute top-8 right-8 flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors font-medium text-sm z-20"
            >
              <History size={18} /> {showHistory ? "Back to Scan" : "History"}
            </button>
          )}

          {/* CONTENT SWITCHER: HISTORY OR RESULTS */}
          {showHistory ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col h-full"
            >
              <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Calendar className="text-emerald-500" /> Past Diagnoses
              </h2>
              
              {historyLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500" /></div>
              ) : history.length === 0 ? (
                <div className="text-center py-10 text-slate-400">No history found.</div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition cursor-pointer flex justify-between items-center group"
                    >
                      <div>
                        <h4 className="font-bold text-slate-700">{item.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Calendar size={12}/> {item.date}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.severity?.toLowerCase().includes("high") ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                          }`}>
                            {item.severity}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : result ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 text-green-700 rounded-xl shadow-sm">
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Diagnosis Complete</h3>
                  <h2 className="text-3xl font-black text-slate-800 leading-tight">{result.name}</h2>
                </div>
              </div>

              {/* Severity Card */}
              {result.severity && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`mb-8 p-5 rounded-2xl border-l-8 flex items-center justify-between shadow-sm ${
                    result.severity.toLowerCase().includes("high") 
                    ? "bg-red-50 border-red-500 text-red-900" 
                    : result.severity.toLowerCase().includes("medium")
                    ? "bg-orange-50 border-orange-500 text-orange-900"
                    : "bg-green-50 border-green-500 text-green-900"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold uppercase opacity-70 mb-1">Severity Level</p>
                    <p className="text-xl font-bold flex items-center gap-2">
                      {result.severity}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 border border-black/5 uppercase tracking-wide">
                        {result.severity.toLowerCase().includes("high") ? "Urgent" : "Monitor"}
                      </span>
                    </p>
                  </div>
                  <AlertTriangle size={32} className="opacity-40"/>
                </motion.div>
              )}

              <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {/* Organic Cure */}
                <motion.div 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="group"
                >
                  <h4 className="flex items-center gap-2 font-bold text-emerald-700 mb-3 text-lg">
                    <Sprout size={20} /> Organic Solution
                  </h4>
                  <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 group-hover:border-emerald-300 group-hover:bg-emerald-50 transition-all shadow-sm group-hover:shadow-md">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{result.organic || "No organic cure data available."}</p>
                  </div>
                </motion.div>

                {/* Chemical Cure */}
                <motion.div 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="group"
                >
                  <h4 className="flex items-center gap-2 font-bold text-blue-700 mb-3 text-lg">
                    <Beaker size={20} /> Chemical Treatment
                  </h4>
                  <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all shadow-sm group-hover:shadow-md">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{result.chemical || "No chemical cure data available."}</p>
                  </div>
                </motion.div>
              </div>

              <motion.button 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                onClick={clearAll} 
                className="mt-6 text-slate-400 hover:text-emerald-600 font-medium flex items-center justify-center gap-2 transition-colors mx-auto hover:underline underline-offset-4"
              >
                <Camera size={18} /> Scan Another Plant
              </motion.button>

            </motion.div>
          ) : (
            // Empty State
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-6">
              <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Leaf size={64} className="text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-400 mb-2">Ready to Diagnose</h3>
              <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
                Upload a clear photo of the affected plant leaf. Our AI will identify diseases and suggest cures instantly.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CropDoctor;