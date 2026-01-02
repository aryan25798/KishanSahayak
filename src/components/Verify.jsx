// src/components/Verify.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { ShieldCheck, XCircle, Search, ScanLine, Camera, X } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

const Verify = () => {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [productData, setProductData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Verification Logic
  const verifyCode = async (batchId) => {
    if (!batchId) return;
    setIsScanning(false); // Stop scanner if running
    setResult(null);
    setProductData(null);
    
    // Check Firestore
    try {
      // Use uppercase to match how Admin saves it (e.g., SEED-123)
      const formattedId = batchId.trim().toUpperCase(); 
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
    }
  };

  // Scanner Logic
  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader", 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scanner.render(
        (decodedText) => {
          setCode(decodedText);
          verifyCode(decodedText); // Auto-verify on scan
          scanner.clear();
        }, 
        (error) => console.log(error)
      );

      return () => scanner.clear().catch(err => console.error("Scanner clear error", err));
    }
  }, [isScanning]);

  return (
    <div className="pt-24 min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-green-600 p-8 text-center text-white">
          <ScanLine size={48} className="mx-auto mb-4 opacity-80 animate-pulse" />
          <h2 className="text-3xl font-bold">Product Verify</h2>
          <p className="text-green-100">Scan or enter batch code</p>
        </div>

        <div className="p-8">
          {/* Scanner Window */}
          {isScanning ? (
            <div className="mb-6">
               <div id="reader" className="overflow-hidden rounded-xl border-4 border-green-500"></div>
               <button onClick={() => setIsScanning(false)} className="mt-4 w-full py-2 bg-red-100 text-red-600 font-bold rounded-lg flex items-center justify-center gap-2">
                 <X size={18} /> Cancel Scan
               </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsScanning(true)}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold mb-6 flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-lg"
            >
              <Camera size={20} /> Scan QR / Barcode
            </button>
          )}

          {/* Manual Input */}
          <div className="relative mb-6">
            <input 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Or type code (e.g. SEED-123)"
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none font-mono uppercase"
            />
            <Search className="absolute left-4 top-4 text-gray-400" />
          </div>

          <button onClick={() => verifyCode(code)} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition">
            Verify Manually
          </button>

          {/* RESULTS */}
          {result === "genuine" && productData && (
            <div className="mt-8 p-6 bg-green-50 border-2 border-green-500 rounded-2xl text-center animate-bounce-in">
              <ShieldCheck size={60} className="mx-auto text-green-600 mb-2" />
              <h3 className="text-2xl font-bold text-green-800">GENUINE</h3>
              
              {/* ✅ NEW: Product Image Display */}
              {productData.imageUrl && (
                <div className="my-4">
                  <img 
                    src={productData.imageUrl} 
                    alt={productData.name} 
                    className="w-32 h-32 object-cover rounded-lg mx-auto border-2 border-green-200 shadow-sm"
                  />
                </div>
              )}

              <p className="text-gray-900 font-bold text-lg">{productData.name}</p>
              <p className="text-xs text-gray-500 mt-1">Verified by Manufacturer</p>
              <p className="text-xs text-green-600 font-mono mt-2 bg-green-100 px-2 py-1 rounded-full inline-block">
                 ID: {code.toUpperCase()}
              </p>
            </div>
          )}

          {result === "fake" && (
            <div className="mt-8 p-6 bg-red-50 border-2 border-red-500 rounded-2xl text-center animate-shake">
              <XCircle size={60} className="mx-auto text-red-600 mb-2" />
              <h3 className="text-2xl font-bold text-red-800">FAKE PRODUCT</h3>
              <p className="text-red-600 text-sm mt-2">This batch code does not exist in our database. Please report this to the dealer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Verify;