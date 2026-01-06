// src/components/Verify.jsx
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  ShieldCheck, XCircle, ScanLine, Camera, X, 
  CheckCircle2, QrCode, ArrowRight, Loader2, Package, AlertTriangle,
  Sparkles, Brain, Sprout, ShieldAlert, Zap, Search, Upload
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";

const Verify = () => {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [productData, setProductData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Refs
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- 1. AI Analysis Logic ---
  const fetchAIAnalysis = async (productName) => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `
        As an expert agricultural scientist, analyze the product "${productName}".
        Provide a concise response for a farmer in valid JSON format only. Do not use Markdown.
        Use exactly these keys:
        {
          "usage": "Simple instructions on how to use/apply it (max 2 sentences)",
          "work": "How it works scientifically (max 2 sentences)",
          "benefits": "Key benefits (comma separated list)",
          "harms": "Safety precautions or potential harms (comma separated list)"
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, "").trim();
      setAiAnalysis(JSON.parse(text));
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // --- 2. Verification Logic ---
  const verifyCode = async (scannedValue) => {
    if (!scannedValue) return;
    
    // Stop scanning immediately if camera is active
    if (scannerRef.current) {
        try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
            scannerRef.current = null;
        } catch (e) { console.warn("Stop error:", e); }
    }
    
    setIsScanning(false);
    setLoading(true);
    setResult(null);
    setProductData(null);
    setErrorMsg(null);
    setAiAnalysis(null); 
    
    try {
      let formattedId = String(scannedValue).trim();

      // Handle URLs vs Pure IDs
      if (formattedId.includes("://") || formattedId.includes("/")) {
          const parts = formattedId.split("/");
          formattedId = parts.filter(p => p.length > 0).pop();
      }

      formattedId = formattedId.toUpperCase().trim();
      
      console.log("Verifying Extracted ID:", formattedId); 
      setCode(formattedId); 

      await new Promise(r => setTimeout(r, 800)); // UX delay

      const docRef = doc(db, "products", formattedId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setResult("genuine");
        setProductData(data);
        
        if (data.name) {
          fetchAIAnalysis(data.name);
        }
      } else {
        console.warn("Document not found for ID:", formattedId);
        setResult("fake");
      }
    } catch (err) {
      console.error("Verification Error:", err);
      if (err.code === 'unavailable') {
         setErrorMsg("No internet connection. Please check your network.");
      } else if (err.code === 'permission-denied') {
         setErrorMsg("Access denied. Please login again.");
      } else {
         setErrorMsg("Invalid code format or network error.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 3. File Upload Logic (New) ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

    try {
        const html5QrCode = new Html5Qrcode("reader-file");
        const decodedText = await html5QrCode.scanFileV2(file, true);
        verifyCode(decodedText);
    } catch (err) {
        console.error("File Scan Error:", err);
        setErrorMsg("Could not find a valid QR code in this image. Please try a clearer photo.");
        setLoading(false);
    } finally {
        // Reset input so the same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- 4. Scanner Logic ---
  useEffect(() => {
    return () => {
        if (scannerRef.current) {
            try {
                scannerRef.current.stop().then(() => {
                    scannerRef.current.clear();
                }).catch(() => {});
            } catch (e) {}
            scannerRef.current = null;
        }
    };
  }, []);

  useEffect(() => {
    if (!isScanning) return;

    const scannerId = "reader";
    const startScanner = async () => {
        try {
            await new Promise(resolve => setTimeout(resolve, 100)); // DOM wait
            
            if (!document.getElementById(scannerId)) {
                setIsScanning(false);
                return;
            }

            if (scannerRef.current) {
                await scannerRef.current.stop().catch(() => {});
                scannerRef.current.clear();
            }

            const html5QrCode = new Html5Qrcode(scannerId);
            scannerRef.current = html5QrCode;

            const config = { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
            };

            await html5QrCode.start(
                { facingMode: "environment" }, 
                config,
                (decodedText) => {
                    verifyCode(decodedText);
                },
                (errorMessage) => { /* ignore frame errors */ }
            );

        } catch (err) {
            console.error("Scanner start error:", err);
            setErrorMsg("Camera error. Check permissions.");
            setIsScanning(false);
        }
    };

    startScanner();

  }, [isScanning]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    verifyCode(code);
  };

  const handleCloseScanner = async () => {
    if (scannerRef.current) {
        try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8 font-sans">
      
      {/* Hidden div for file scanning */}
      <div id="reader-file" className="hidden"></div>

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6 lg:gap-8 relative z-10">
        
        {/* --- LEFT COLUMN: Input & Scanner (Takes 40% on Desktop) --- */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl relative overflow-hidden"
          >
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500"></div>
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                   <ScanLine size={24} />
                </div>
                <div>
                   <h1 className="text-2xl font-black text-slate-800 tracking-tight">Verify Product</h1>
                   <p className="text-slate-500 text-sm">Scan QR code for authenticity</p>
                </div>
             </div>
          </motion.div>

          {/* Scanner/Input Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 md:p-8 shadow-xl flex-1 flex flex-col justify-center min-h-[400px]"
          >
              {errorMsg && (
                  <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-3 border border-red-100">
                      <AlertTriangle size={18} className="shrink-0"/> {errorMsg}
                  </div>
              )}

              <AnimatePresence mode="wait">
                {!isScanning && !loading && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Camera Scan Button */}
                    <button 
                      onClick={() => setIsScanning(true)}
                      className="group w-full py-6 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-bold text-xl shadow-2xl shadow-slate-900/10 transition-all flex flex-col items-center justify-center gap-2 active:scale-[0.98] border-2 border-transparent hover:border-emerald-500/50"
                    >
                      <Camera className="group-hover:scale-110 transition-transform text-emerald-400" size={32} />
                      <span>Tap to Scan QR</span>
                    </button>

                    {/* Upload from Device Button */}
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="w-full py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-lg border-2 border-slate-200 hover:border-emerald-400 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      <Upload size={24} className="text-emerald-600" />
                      <span>Upload from Device</span>
                    </button>

                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">Or Type Code</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {/* Manual Input Form */}
                    <form onSubmit={handleManualSubmit} className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <QrCode className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                      </div>
                      <input 
                        type="text" 
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="e.g. BTC-2024-1001"
                        className="w-full pl-12 pr-14 py-4 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-emerald-500 rounded-xl outline-none font-mono text-base uppercase text-slate-800 placeholder:text-slate-400 transition-all shadow-inner"
                      />
                      <button 
                        type="submit"
                        disabled={!code}
                        className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-all shadow-md active:scale-95"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Camera Interface */}
              {isScanning && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-black aspect-square shadow-2xl"
                  >
                      <div id="reader" className="w-full h-full"></div>
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                        <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-500/50 rounded-3xl relative">
                          <div className="absolute inset-0 bg-emerald-500/10 animate-pulse rounded-2xl"></div>
                          <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-emerald-500 rounded-tl-xl -mt-1 -ml-1"></div>
                          <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-emerald-500 rounded-tr-xl -mt-1 -mr-1"></div>
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-emerald-500 rounded-bl-xl -mb-1 -ml-1"></div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-emerald-500 rounded-br-xl -mb-1 -mr-1"></div>
                        </div>
                        <p className="mt-6 text-white/90 font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-md text-sm">Align code within frame</p>
                      </div>
                      <button onClick={handleCloseScanner} className="absolute top-4 right-4 bg-white/20 backdrop-blur-xl p-3 rounded-full text-white hover:bg-white/30 transition-colors z-50 pointer-events-auto">
                        <X size={20} />
                      </button>
                  </motion.div>
              )}

              {loading && (
                <div className="py-12 text-center flex-1 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500 font-medium animate-pulse">Verifying authenticity...</p>
                </div>
              )}
          </motion.div>
        </div>

        {/* --- RIGHT COLUMN: Results & AI (Takes 60% on Desktop) --- */}
        <div className="lg:col-span-7 h-full">
          <AnimatePresence mode="wait">
            
            {/* EMPTY STATE (Placeholder) */}
            {!result && !loading && (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                 className="h-full min-h-[400px] bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] flex flex-col items-center justify-center text-center p-8 shadow-lg border-dashed border-slate-300"
               >
                 <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                   <Search size={48} className="text-slate-300" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-400">Ready to Analyze</h3>
                 <p className="text-slate-400 mt-2 max-w-sm">
                   Scan a product code or upload a QR image to view verification status and expert usage advice.
                 </p>
               </motion.div>
            )}

            {/* GENUINE RESULT */}
            {result === "genuine" && productData && !loading && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-xl overflow-hidden h-full"
              >
                {/* Header Info */}
                <div className="p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                         <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                            <CheckCircle2 size={32} />
                         </div>
                         <div>
                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
                               <ShieldCheck size={14} /> Verified Genuine
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 leading-none">Authentic Product</h2>
                         </div>
                      </div>
                      <div className="text-right hidden md:block">
                         <div className="text-xs font-mono text-slate-400 mb-1">BATCH CODE</div>
                         <div className="font-mono font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200">{code.toUpperCase()}</div>
                      </div>
                   </div>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                   {/* Product Card */}
                   <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="w-full md:w-32 h-48 md:h-32 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                         {productData.imageUrl ? (
                           <img src={productData.imageUrl} alt={productData.name} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={40}/></div>
                         )}
                      </div>
                      <div className="flex-1">
                         <h3 className="text-xl font-bold text-slate-900 mb-2">{productData.name}</h3>
                         <p className="text-slate-600 text-sm leading-relaxed mb-4">
                           This product has been verified against our manufacturer database. It is safe for use in agricultural applications.
                         </p>
                         <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">
                               Date: {new Date().toLocaleDateString()}
                            </span>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg md:hidden">
                               Code: {code.toUpperCase()}
                            </span>
                         </div>
                      </div>
                   </div>

                   {/* AI Insights Dashboard */}
                   <div className="border-t border-slate-100 pt-6">
                      <div className="flex items-center gap-2 mb-6">
                         <Sparkles className="text-purple-500" size={20} />
                         <h3 className="font-bold text-slate-800 text-lg">AI Smart Insights</h3>
                      </div>

                      {aiLoading ? (
                         <div className="p-12 bg-purple-50/50 rounded-3xl border border-purple-100 text-center">
                            <Loader2 className="animate-spin text-purple-500 mx-auto mb-3" size={32} />
                            <p className="text-sm text-purple-700 font-medium">Analyzing composition & usage...</p>
                         </div>
                      ) : aiAnalysis ? (
                         <div className="grid md:grid-cols-2 gap-4">
                            <InsightCard 
                               icon={<Zap size={18} />} title="Usage Guide" 
                               content={aiAnalysis.usage} color="blue" 
                            />
                            <InsightCard 
                               icon={<Brain size={18} />} title="Mechanism" 
                               content={aiAnalysis.work} color="amber" 
                            />
                            <InsightCard 
                               icon={<Sprout size={18} />} title="Key Benefits" 
                               content={aiAnalysis.benefits} color="emerald" className="md:col-span-2"
                            />
                            <InsightCard 
                               icon={<ShieldAlert size={18} />} title="Safety Precautions" 
                               content={aiAnalysis.harms} color="red" className="md:col-span-2"
                            />
                         </div>
                      ) : (
                         <div className="text-center text-slate-400 text-sm py-4 italic">No insights available.</div>
                      )}
                   </div>

                   <button 
                     onClick={() => { setResult(null); setCode(""); setAiAnalysis(null); }}
                     className="w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300"
                   >
                     <ScanLine size={16} /> Scan Another Product
                   </button>
                </div>
              </motion.div>
            )}

            {/* FAKE RESULT */}
            {result === "fake" && !loading && (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                 className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-xl overflow-hidden h-full flex flex-col items-center justify-center text-center p-8 md:p-16"
               >
                 <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center mb-6">
                     <XCircle className="text-red-500" size={64} />
                 </div>
                 
                 <h2 className="text-4xl font-black text-slate-900 uppercase mb-2">Verification Failed</h2>
                 <p className="text-lg text-slate-500 max-w-md mx-auto mb-8">
                   The batch code <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 rounded">{code}</span> was not found in our database.
                 </p>

                 <div className="w-full max-w-lg bg-red-50 border border-red-100 p-6 rounded-2xl text-left flex gap-4 mb-8">
                     <ShieldAlert className="text-red-600 shrink-0 mt-1" size={24} />
                     <div>
                        <h4 className="font-bold text-red-900 text-lg">Potential Counterfeit Warning</h4>
                        <p className="text-red-700/80 mt-1 leading-relaxed">
                           This product is likely counterfeit or expired. Using it may harm your crops. Please report this to your local dealer immediately.
                        </p>
                     </div>
                 </div>

                 <button 
                   onClick={() => { setResult(null); setCode(""); }}
                   className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                 >
                   <ScanLine size={18} /> Try Again
                 </button>
               </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

// Helper Component for AI Cards
const InsightCard = ({ icon, title, content, color, className = "" }) => {
  const colors = {
    blue: "bg-blue-50/50 border-blue-100 text-blue-900 icon-blue-600",
    amber: "bg-amber-50/50 border-amber-100 text-amber-900 icon-amber-600",
    emerald: "bg-emerald-50/50 border-emerald-100 text-emerald-900 icon-emerald-600",
    red: "bg-red-50/50 border-red-100 text-red-900 icon-red-600",
  };
  
  const textColorClass = colors[color].split(" ").find(c => c.startsWith("text-"));

  return (
    <div className={`p-5 rounded-2xl border ${colors[color]} ${className} hover:shadow-md transition-shadow duration-300`}>
      <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-3 ${textColorClass} opacity-90`}>
        {icon} {title}
      </div>
      <p className="text-slate-700 text-sm leading-relaxed">{content}</p>
    </div>
  );
};

export default Verify;