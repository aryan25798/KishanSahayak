// src/components/CropDoctor.jsx
import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { 
  Camera, Upload, ScanLine, Leaf, AlertTriangle, 
  Sprout, Loader2, X, Beaker, Activity, CheckCircle2, ChevronRight,
  History, Trash2, Calendar, ArrowRight, Sparkles
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
    <div className="pt-24 pb-12 min-h-screen bg-slate-50 font-sans px-4 sm:px-6 lg:px-8">
      
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8 md:mb-12 text-center md:text-left">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-4 border border-emerald-200"
        >
          <Sparkles size={14} /> AI-Powered V2.0
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3"
        >
          Crop<span className="text-emerald-600">Doctor</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-slate-500 max-w-2xl"
        >
          Upload a photo of your crop to instantly identify diseases and get expert treatment advice.
        </motion.p>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Input Section */}
        <div className="lg:col-span-5 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden relative group"
          >
            {/* Decorative Header */}
            <div className="bg-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-[50px] pointer-events-none translate-x-10 -translate-y-10"></div>
               <div className="relative z-10">
                 <h2 className="text-xl font-bold flex items-center gap-2">
                   <Camera className="text-emerald-400" /> Upload Scan
                 </h2>
                 <p className="text-slate-400 text-sm mt-1">Take a clear photo of the affected leaf.</p>
               </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* Image Preview / Dropzone */}
              <AnimatePresence mode="wait">
                {!preview ? (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => fileInputRef.current.click()}
                    className="w-full aspect-[4/3] rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group/drop"
                  >
                    <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center group-hover/drop:scale-110 transition-transform text-emerald-600">
                      <Upload size={28} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-700">Click to Upload</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG supported</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="w-full aspect-[4/3] rounded-3xl relative overflow-hidden shadow-lg border border-slate-100 bg-black"
                  >
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    
                    {/* Controls */}
                    {!loading && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); clearAll(); }}
                         className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-all z-20"
                       >
                         <X size={18} />
                       </button>
                    )}

                    {/* Scanning Overlay */}
                    {loading && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                        <Loader2 className="animate-spin text-emerald-400 w-12 h-12 mb-3" />
                        <span className="text-white font-bold tracking-widest text-sm animate-pulse">ANALYZING...</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />

              {/* Analyze Button */}
              {preview && !result && !loading && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleAnalyze}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
                >
                  <ScanLine size={20} /> Identify Disease
                </motion.button>
              )}

              {/* Error Message */}
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3 text-sm font-medium">
                  <AlertTriangle size={18} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: Results & History */}
        <div className="lg:col-span-7 w-full flex flex-col h-full">
          
          {/* Controls Bar */}
          {user && (
            <div className="flex justify-end mb-6">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  showHistory 
                  ? "bg-slate-800 text-white shadow-lg" 
                  : "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm border border-slate-100"
                }`}
              >
                {showHistory ? <ScanLine size={16} /> : <History size={16} />}
                {showHistory ? "Back to Result" : "View History"}
              </button>
            </div>
          )}

          <div className="flex-1 bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm p-1">
            <AnimatePresence mode="wait">
              {showHistory ? (
                // HISTORY VIEW
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="p-6 h-full flex flex-col"
                >
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Calendar className="text-emerald-500" /> Diagnosis History
                  </h3>
                  
                  {historyLoading ? (
                    <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-emerald-500" /></div>
                  ) : history.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                      <History size={48} className="mb-4 opacity-20" />
                      <p>No past diagnoses found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {history.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => loadHistoryItem(item)}
                          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer flex justify-between items-center group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                              item.severity?.toLowerCase().includes('high') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{item.name}</h4>
                              <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                <span>{item.date}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className={`${item.severity?.toLowerCase().includes('high') ? 'text-red-500' : 'text-green-500'}`}>{item.severity}</span>
                              </p>
                            </div>
                          </div>
                          
                          {/* FIXED DELETE BUTTON: Visible on mobile, hover-only on desktop */}
                          <button 
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : result ? (
                // RESULTS VIEW
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="p-6 md:p-8"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-2">
                        <Activity size={16} /> Diagnosis Complete
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-800">{result.name}</h2>
                    </div>
                    
                    {result.severity && (
                       <div className={`px-5 py-3 rounded-2xl border flex items-center gap-3 ${
                          result.severity.toLowerCase().includes("high") 
                          ? "bg-red-50 border-red-200 text-red-700" 
                          : result.severity.toLowerCase().includes("medium")
                          ? "bg-orange-50 border-orange-200 text-orange-700"
                          : "bg-green-50 border-green-200 text-green-700"
                       }`}>
                         <div className="text-right">
                           <p className="text-[10px] uppercase font-bold opacity-70">Severity</p>
                           <p className="text-lg font-bold leading-none">{result.severity}</p>
                         </div>
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            result.severity.toLowerCase().includes("high") ? "bg-white/50" : "bg-white/50"
                         }`}>
                           <AlertTriangle size={20} />
                         </div>
                       </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Organic Cure Card */}
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                      className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[1.5rem] relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Sprout size={80} />
                      </div>
                      <h3 className="font-bold text-emerald-800 text-lg mb-3 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><Sprout size={16} /></span>
                        Organic Solution
                      </h3>
                      <p className="text-slate-700 text-sm leading-relaxed relative z-10">{result.organic || "No organic cure available."}</p>
                    </motion.div>

                    {/* Chemical Cure Card */}
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                      className="bg-blue-50/50 border border-blue-100 p-6 rounded-[1.5rem] relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Beaker size={80} />
                      </div>
                      <h3 className="font-bold text-blue-800 text-lg mb-3 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><Beaker size={16} /></span>
                        Chemical Treatment
                      </h3>
                      <p className="text-slate-700 text-sm leading-relaxed relative z-10">{result.chemical || "No chemical cure available."}</p>
                    </motion.div>
                  </div>
                  
                  <div className="mt-8 flex justify-center">
                    <button 
                      onClick={clearAll} 
                      className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-sm font-medium transition-colors hover:underline underline-offset-4"
                    >
                      Analyze Another Plant <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                // EMPTY STATE
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-[2rem]">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full animate-[spin_8s_linear_infinite] border-t-emerald-200"></div>
                    <Leaf size={40} className="text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Diagnose</h3>
                  <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                    Our AI model is ready to analyze your crops. Upload a photo on the left to get started with instant disease detection.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CropDoctor;