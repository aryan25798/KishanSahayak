// src/components/Verify.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  ShieldCheck, XCircle, Search, ScanLine, Camera, X, 
  CheckCircle2, QrCode, ArrowRight, Loader2, Package 
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

const Verify = () => {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [productData, setProductData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verification Logic
  const verifyCode = async (batchId) => {
    if (!batchId) return;
    setIsScanning(false);
    setLoading(true);
    setResult(null);
    setProductData(null);
    
    try {
      const formattedId = batchId.trim().toUpperCase(); 
      // Simulate a small delay for UX smoothness (optional)
      await new Promise(r => setTimeout(r, 800));

      const docRef = doc(db, "products", formattedId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setResult("genuine");
        setProductData(docSnap.data());
      } else {
        setResult("fake");
      }
    } catch (err) {
      console.error(err);
      alert("Error checking database.");
    } finally {
      setLoading(false);
    }
  };

  // Scanner Logic
  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader", 
        { 
          fps: 10, 
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        },
        false
      );
      
      scanner.render(
        (decodedText) => {
          setCode(decodedText);
          verifyCode(decodedText);
          scanner.clear();
        }, 
        (error) => console.log(error)
      );

      return () => scanner.clear().catch(err => console.error("Scanner clear error", err));
    }
  }, [isScanning]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    verifyCode(code);
  };

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-emerald-100 via-teal-50 to-cyan-100 pt-24 pb-12 px-4 sm:px-6 flex items-center justify-center font-sans">
      
      {/* Main Glass Card */}
      <div className="w-full max-w-lg bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-2xl overflow-hidden relative transition-all duration-500">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="p-8 sm:p-10 relative z-10">
          
          {/* Header Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-3xl shadow-lg shadow-emerald-500/30 mb-6 transform hover:scale-105 transition-transform duration-300">
              <ScanLine size={36} className="text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">
              Product Verify
            </h1>
            <p className="text-slate-500 text-lg">
              Authenticate your agricultural products instantly.
            </p>
          </div>

          {/* Scanner & Input Section */}
          <div className="space-y-6">
            
            {/* Toggle Scanner Button */}
            {!isScanning && !result && !loading && (
              <button 
                onClick={() => setIsScanning(true)}
                className="group w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-slate-900/20 transition-all duration-300 flex items-center justify-center gap-3 transform hover:-translate-y-1 active:scale-[0.98]"
              >
                <Camera className="group-hover:rotate-12 transition-transform duration-300" size={24} />
                <span>Open Scanner</span>
              </button>
            )}

            {/* Live Scanner Interface */}
            {isScanning && (
              <div className="relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-black shadow-inner animate-in fade-in zoom-in duration-300">
                <div id="reader" className="w-full h-full [&>div]:!shadow-none [&>video]:!object-cover [&>video]:!rounded-2xl"></div>
                
                {/* Custom Overlay UI for Scanner */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-64 h-64 border-2 border-emerald-500/50 rounded-3xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-emerald-400 rounded-tl-xl -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-emerald-400 rounded-tr-xl -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-emerald-400 rounded-bl-xl -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-emerald-400 rounded-br-xl -mb-1 -mr-1"></div>
                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse rounded-3xl"></div>
                  </div>
                  <p className="mt-6 text-white font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-md text-sm">
                    Align QR code within frame
                  </p>
                </div>

                <button 
                  onClick={() => setIsScanning(false)} 
                  className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-red-500/80 transition-colors z-50 pointer-events-auto"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Divider */}
            {!isScanning && !result && !loading && (
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium uppercase tracking-wider">Or Enter Code</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
            )}

            {/* Manual Input Form */}
            {!isScanning && !result && (
              <form onSubmit={handleManualSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <QrCode className={`text-slate-400 transition-colors duration-300 ${loading ? 'opacity-50' : 'group-focus-within:text-emerald-500'}`} size={22} />
                </div>
                <input 
                  type="text" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. BTC-2024-1001"
                  className="w-full pl-14 pr-14 py-5 bg-slate-50 border-2 border-transparent hover:bg-slate-100 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl outline-none font-mono text-lg text-slate-800 placeholder:text-slate-400 transition-all duration-300 uppercase shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!code || loading}
                  className="absolute right-3 top-3 bottom-3 aspect-square bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
                >
                  {loading ? <Loader2 size={20} className="animate-spin"/> : <ArrowRight size={20} />}
                </button>
              </form>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="mt-8 text-center animate-fade-in">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 font-medium animate-pulse">Verifying batch authenticity...</p>
            </div>
          )}

          {/* --- RESULTS SECTION --- */}
          
          {/* GENUINE RESULT */}
          {result === "genuine" && productData && !loading && (
            <div className="mt-8 animate-in slide-in-from-bottom-8 duration-500 fade-in">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-1 shadow-inner">
                <div className="bg-white/60 backdrop-blur-sm rounded-[1.3rem] p-6 text-center border border-white/50">
                  
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <CheckCircle2 className="relative text-emerald-500 w-20 h-20 mx-auto drop-shadow-sm" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-1 tracking-tight uppercase">Authentic Product</h3>
                  <p className="text-emerald-600 font-medium mb-6 flex items-center justify-center gap-2">
                    <ShieldCheck size={16} /> Verified by Manufacturer
                  </p>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex items-start gap-4 text-left">
                    <div className="w-24 h-24 bg-slate-100 rounded-xl flex-shrink-0 overflow-hidden border border-slate-200">
                      {productData.imageUrl ? (
                        <img src={productData.imageUrl} alt={productData.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package size={32} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-slate-900 leading-snug mb-1">{productData.name}</h4>
                      <div className="inline-flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-md mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-mono text-slate-600 font-bold">{code.toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Batch verified on: <br/>
                        <span className="font-semibold text-slate-700">{new Date().toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setResult(null); setCode(""); }}
                    className="mt-6 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    <ScanLine size={16} /> Scan Another
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FAKE RESULT */}
          {result === "fake" && !loading && (
            <div className="mt-8 animate-in slide-in-from-bottom-8 duration-500 fade-in">
              <div className="bg-red-50 border border-red-100 rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="text-red-500 w-10 h-10" />
                </div>

                <h3 className="text-2xl font-black text-red-900 mb-2 uppercase">Verification Failed</h3>
                <p className="text-red-700/80 mb-6 leading-relaxed">
                  The batch code <span className="font-mono font-bold bg-red-100 px-2 py-0.5 rounded text-red-800">{code}</span> could not be found in our database.
                </p>

                <div className="bg-white/80 p-4 rounded-xl border border-red-100 text-sm text-left flex gap-3">
                  <div className="bg-red-100 p-2 rounded-lg h-fit text-red-600">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-red-900">What should I do?</p>
                    <p className="text-red-700 mt-1">Do not use this product. Report it to the dealer or contact support immediately.</p>
                  </div>
                </div>

                <button 
                  onClick={() => { setResult(null); setCode(""); }}
                  className="mt-6 w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Verify;