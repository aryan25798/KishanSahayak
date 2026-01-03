import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { LogOut, User, Menu, Sprout, X, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GoogleTranslate from "./GoogleTranslate"; 
import toast from "react-hot-toast";

const Navbar = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // --- Voice Navigation State ---
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  // Refs to keep track of the recognition instance and timer across renders
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
    }
  }, []);

  const handleVoiceNav = () => {
    if (!voiceSupported) {
      toast.error("Voice navigation not supported in this browser.");
      return;
    }

    // If already listening, stop it manually (toggle behavior)
    if (isListening) {
      recognitionRef.current?.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = 'en-US'; // Set language
      recognition.continuous = true; // ✅ IMPORTANT: Don't stop immediately on pause
      recognition.interimResults = false; // We only want final results

      // --- Event Handlers ---

      recognition.onstart = () => {
        setIsListening(true);
        toast("Listening... Say 'Go to Weather' etc.", { icon: '🎙️', duration: 4000 });

        // ✅ AUTO-STOP TIMER: Stop after 8 seconds of silence
        silenceTimerRef.current = setTimeout(() => {
          recognition.stop();
          toast("Mic closed due to silence.", { icon: 'mic_off' });
        }, 8000);
      };

      recognition.onresult = (event) => {
        // Clear silence timer because the user spoke
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Get the latest transcript
        const lastResultIndex = event.results.length - 1;
        const command = event.results[lastResultIndex][0].transcript.toLowerCase();
        
        console.log("Voice Command Received:", command);
        
        // Stop listening immediately after a command is caught
        recognition.stop();
        setIsListening(false);

        // --- NAVIGATION LOGIC ---
        if (command.includes("weather") || command.includes("forecast")) {
          navigate("/weather");
          toast.success("Navigating to Weather");
        } else if (command.includes("scheme") || command.includes("subsidy")) {
          navigate("/schemes");
          toast.success("Navigating to Schemes");
        } else if (command.includes("market") || command.includes("price") || command.includes("mandi")) {
          navigate("/market");
          toast.success("Navigating to Market Prices");
        } else if (command.includes("doctor") || command.includes("disease") || command.includes("plant")) {
          navigate("/doctor");
          toast.success("Navigating to Crop Doctor");
        } else if (command.includes("support") || command.includes("help") || command.includes("contact")) {
          navigate("/support");
          toast.success("Navigating to Support");
        } else if (command.includes("equipment") || command.includes("tractor") || command.includes("rent")) {
          navigate("/equipment"); // Added Equipment route
          toast.success("Navigating to Equipment");
        } else if (command.includes("home") || command.includes("dashboard")) {
          navigate("/");
          toast.success("Navigating Home");
        } else if (command.includes("farm") || command.includes("profile")) {
          navigate("/my-farm");
          toast.success("Navigating to My Farm");
        } else {
          toast.error(`Unknown command: "${command}"`);
        }
      };

      recognition.onerror = (event) => {
        console.error("Voice Error:", event.error);
        
        // Don't shut down UI on 'no-speech' error immediately if using continuous mode
        if (event.error !== 'no-speech') {
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        }
        
        if (event.error === 'network') {
          toast.error("Network Error: Voice requires HTTPS connection.");
        } else if (event.error === 'not-allowed') {
          toast.error("Microphone access denied.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };

      // Start listening
      recognition.start();

    } catch (error) {
      console.error("Initialization Error:", error);
      toast.error("Failed to start voice navigation.");
      setIsListening(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-emerald-100 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-tr from-green-600 to-emerald-400 p-2 rounded-lg text-white shadow-lg group-hover:scale-110 transition-transform">
              <Sprout size={24} />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-800 to-emerald-600 tracking-tight">
              Kisan Sahayak
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Home</Link>
            <Link to="/weather" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Weather</Link>
            <Link to="/schemes" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Schemes</Link>
            <Link to="/market" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Mandi</Link>
            
            {/* Voice Navigation Button */}
            {voiceSupported && (
              <button 
                onClick={handleVoiceNav}
                className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${
                  isListening 
                    ? "bg-red-100 text-red-600 ring-4 ring-red-50 animate-pulse scale-110" 
                    : "bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700"
                }`}
                title="Voice Navigation (e.g. 'Go to Weather')"
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}

            {/* Google Translate */}
            <div className="scale-90">
                <GoogleTranslate />
            </div>

            {user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                {userData?.role === 'admin' && (
                  <Link to="/admin" className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-full hover:bg-black transition shadow-md">
                    ADMIN
                  </Link>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-bold text-gray-800 leading-none">{user.displayName || "Farmer"}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{userData?.role || "Member"}</p>
                  </div>
                  <Link to="/my-farm" className="bg-green-100 p-2 rounded-full text-green-700 border border-green-200 hover:bg-green-200 transition">
                    <User size={20} />
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    title="Logout"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold rounded-full shadow-lg hover:shadow-green-500/30 hover:scale-105 transition-all">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mobile Voice Button */}
            {voiceSupported && (
              <button 
                onClick={handleVoiceNav}
                className={`p-2 rounded-full transition-all ${isListening ? "text-red-500 bg-red-50 animate-pulse" : "text-gray-600"}`}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            )}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-emerald-100 shadow-xl overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4">
              <Link to="/" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
              <Link to="/weather" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Weather</Link>
              <Link to="/schemes" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Schemes</Link>
              <Link to="/market" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Mandi Prices</Link>
              <Link to="/doctor" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Crop Doctor</Link>
              <Link to="/equipment" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Equipment</Link>
              <Link to="/support" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Support</Link>
              
              <div className="p-2">
                  <GoogleTranslate />
              </div>

              {user ? (
                <div className="border-t border-gray-100 pt-4 mt-2">
                    <Link to="/my-farm" className="flex items-center gap-3 mb-4 px-2 hover:bg-gray-50 rounded-lg p-2" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="bg-green-100 p-2 rounded-full text-green-700">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{user.displayName || "Farmer"}</p>
                        <p className="text-xs text-gray-500 uppercase">{userData?.role || "Member"}</p>
                      </div>
                    </Link>
                    <button onClick={handleLogout} className="w-full py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-2">
                      <LogOut size={18} /> Logout
                    </button>
                </div>
              ) : (
                <Link to="/login" className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold rounded-xl text-center shadow-md" onClick={() => setIsMobileMenuOpen(false)}>
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;