import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { 
  LogOut, 
  User, 
  Menu, 
  Sprout, 
  X, 
  Mic, 
  MicOff, 
  LayoutDashboard,
  CloudSun,
  ScrollText,
  Store,
  Stethoscope,
  Tractor,
  LifeBuoy,
  ChevronRight,
  ShieldCheck // Added ShieldCheck for Admin Icon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GoogleTranslate from "./GoogleTranslate"; 
import toast from "react-hot-toast";

const Navbar = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // UI States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  // Check if user is Admin
  const isAdmin = user?.email === "admin@system.com" || userData?.role === "admin";

  // --- SMART SCROLL LOGIC ---
  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;
        
        // Hide if scrolling down AND not at the top AND mobile menu is closed
        if (currentScrollY > lastScrollY && currentScrollY > 100 && !isMobileMenuOpen) {
          setIsVisible(false);
        } else {
          // Show if scrolling up
          setIsVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY, isMobileMenuOpen]);

  // Check Voice Support
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // --- VOICE NAVIGATION HANDLER ---
  const handleVoiceNav = () => {
    if (!voiceSupported) {
      toast.error("Voice not supported in this browser");
      return;
    }

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
      recognition.lang = 'en-US'; 
      recognition.continuous = true; 
      recognition.interimResults = false; 

      recognition.onstart = () => {
        setIsListening(true);
        toast("Listening... Say 'Go to Weather'", { icon: '🎙️', duration: 3000 });
        silenceTimerRef.current = setTimeout(() => {
          recognition.stop();
          toast("Mic closed due to silence.", { icon: 'mic_off' });
        }, 8000);
      };

      recognition.onresult = (event) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const lastResultIndex = event.results.length - 1;
        const command = event.results[lastResultIndex][0].transcript.toLowerCase();
        
        console.log("Command:", command);
        recognition.stop();
        setIsListening(false);

        const routes = {
          weather: "/weather", forecast: "/weather",
          scheme: "/schemes", subsidy: "/schemes",
          market: "/market", mandi: "/market", price: "/market",
          doctor: "/doctor", disease: "/doctor",
          support: "/support", help: "/support",
          equipment: "/equipment", tractor: "/equipment",
          home: "/", dashboard: "/",
          farm: "/my-farm", profile: "/my-farm",
          admin: "/admin" // Admin voice command
        };

        let found = false;
        for (const [key, path] of Object.entries(routes)) {
          if (command.includes(key)) {
            // Security check for voice navigation
            if (path === "/admin" && !isAdmin) {
                toast.error("Access Denied: Admins Only");
                return;
            }

            navigate(path);
            toast.success(`Navigating to ${key.charAt(0).toUpperCase() + key.slice(1)}`);
            found = true;
            break;
          }
        }
        if (!found) toast.error("Command not recognized.");
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        }
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (error) {
      console.error(error);
      setIsListening(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const navLinks = [
    { name: "Home", path: "/", icon: LayoutDashboard },
    { name: "Weather", path: "/weather", icon: CloudSun },
    { name: "Schemes", path: "/schemes", icon: ScrollText },
    { name: "Mandi", path: "/market", icon: Store },
    { name: "Doctor", path: "/doctor", icon: Stethoscope },
  ];

  // Dynamically add Admin link if user is admin
  if (isAdmin) {
    navLinks.push({ name: "Admin", path: "/admin", icon: ShieldCheck });
  }

  return (
    <>
      {/* --- NAVBAR CONTAINER --- */}
      <nav 
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ease-in-out transform ${
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        {/* Glassmorphism Background Layer */}
        <div className={`absolute inset-0 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all duration-300 ${lastScrollY > 20 ? "shadow-md bg-white/80" : ""}`}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-center h-16 md:h-20">
            
            {/* --- LOGO SECTION --- */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-emerald-600 to-green-400 rounded-xl text-white shadow-lg shadow-green-500/30 group-hover:scale-105 transition-transform duration-300">
                 {/* Glow behind logo */}
                 <div className="absolute -inset-1 bg-green-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
                 <Sprout size={24} className="relative z-10" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800 group-hover:text-emerald-700 transition-colors">
                  Kisan<span className="text-emerald-600">Sahayak</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">AI Powered Farming</span>
              </div>
            </Link>

            {/* --- CENTER LINKS (DESKTOP) --- */}
            <div className="hidden lg:flex items-center bg-slate-100/50 p-1.5 rounded-full border border-slate-200/60 backdrop-blur-md">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link 
                    key={link.name} 
                    to={link.path}
                    className={`relative px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                      isActive ? "text-emerald-700" : "text-slate-500 hover:text-emerald-600 hover:bg-white/50"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-white rounded-full shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] border border-slate-100"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                       {/* Only show icon on active to keep it clean, or hover */}
                       {isActive && <link.icon size={16} />}
                       {link.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* --- RIGHT ACTIONS --- */}
            <div className="flex items-center gap-2 md:gap-3">
              
              {/* Voice Button (Animated) */}
              {voiceSupported && (
                <button 
                  onClick={handleVoiceNav}
                  className={`relative p-2.5 rounded-full transition-all duration-300 group ${
                    isListening 
                      ? "bg-red-50 text-red-600 shadow-lg shadow-red-100 ring-2 ring-red-100" 
                      : "bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-100"
                  }`}
                  title="Voice Command"
                >
                  {isListening && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20"></span>}
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}

              {/* Language Selector */}
              <div className="hidden md:block scale-90">
                 <GoogleTranslate />
              </div>

              {/* User Profile */}
              {user ? (
                <div className="flex items-center gap-3 pl-2">
                   {/* Desktop Profile Pill */}
                   <Link to="/my-farm" className="hidden md:flex items-center gap-3 pr-4 pl-1 py-1 bg-white border border-slate-200 rounded-full hover:border-emerald-300 hover:shadow-md transition-all group">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-200">
                        <User size={18} />
                      </div>
                      <div className="text-left">
                         <p className="text-xs font-bold text-slate-800 leading-tight">{user.displayName?.split(" ")[0] || "Farmer"}</p>
                         <p className="text-[9px] text-slate-400 font-bold uppercase">{userData?.role || "Member"}</p>
                      </div>
                   </Link>

                   {/* Mobile Profile Icon */}
                   <Link to="/my-farm" className="md:hidden w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                     <User size={20} />
                   </Link>

                   {/* Logout Button */}
                   <button onClick={handleLogout} className="hidden md:flex p-2.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                     <LogOut size={20} />
                   </button>
                </div>
              ) : (
                <Link to="/login" className="hidden md:flex px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  Login
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2.5 text-slate-700 bg-white border border-slate-100 rounded-xl shadow-sm active:scale-95 transition-all"
              >
                 {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MOBILE MENU OVERLAY (Slide Down) --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl pt-24 px-6 md:hidden overflow-y-auto"
          >
             <div className="flex flex-col space-y-2 pb-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Navigation</p>
                
                {navLinks.map((link, idx) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link 
                      to={link.path} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                         location.pathname === link.path 
                         ? "bg-emerald-50 border border-emerald-100 text-emerald-800" 
                         : "bg-slate-50 border border-slate-100 text-slate-600"
                      }`}
                    >
                       <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${location.pathname === link.path ? "bg-white text-emerald-600" : "bg-white text-slate-400"}`}>
                             <link.icon size={20} />
                          </div>
                          <span className="font-bold text-lg">{link.name}</span>
                       </div>
                       <ChevronRight size={16} className="opacity-50" />
                    </Link>
                  </motion.div>
                ))}

                <div className="grid grid-cols-2 gap-3 mt-2">
                   <Link to="/equipment" onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 flex flex-col items-center gap-2 text-center">
                      <Tractor size={24} className="mb-1" />
                      <span className="text-sm font-bold">Equipment</span>
                   </Link>
                   <Link to="/support" onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-800 flex flex-col items-center gap-2 text-center">
                      <LifeBuoy size={24} className="mb-1" />
                      <span className="text-sm font-bold">Support</span>
                   </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="mb-6"><GoogleTranslate /></div>
                    {user ? (
                      <button onClick={handleLogout} className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100">
                        <LogOut size={20} /> Logout
                      </button>
                    ) : (
                      <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-200">
                        Login Now
                      </Link>
                    )}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;