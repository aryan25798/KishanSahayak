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
  ShieldCheck
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
        
        // Hide on scroll down, show on scroll up
        if (currentScrollY > lastScrollY && currentScrollY > 50 && !isMobileMenuOpen) {
          setIsVisible(false);
        } else {
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
          admin: "/admin"
        };

        let found = false;
        for (const [key, path] of Object.entries(routes)) {
          if (command.includes(key)) {
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

  if (isAdmin) {
    navLinks.push({ name: "Admin", path: "/admin", icon: ShieldCheck });
  }

  // Animation variants for mobile menu
  const menuVariants = {
    closed: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
    open: { opacity: 1, scale: 1, transition: { duration: 0.3, staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const itemVariants = {
    closed: { opacity: 0, y: 20 },
    open: { opacity: 1, y: 0 }
  };

  return (
    <>
      {/* --- FLOATING NAVBAR --- */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-7xl">
          <div className={`
            relative flex items-center justify-between 
            mx-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${lastScrollY > 20 
              ? "bg-white/80 backdrop-blur-xl border border-white/40 shadow-lg shadow-emerald-900/5 py-3 px-5 rounded-[2rem] md:w-[90%] lg:w-[85%]" 
              : "bg-transparent py-5 px-6 w-full"
            }
          `}>
            
            {/* LOGO */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                 <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm group-hover:blur-md transition-all"></div>
                 <Sprout size={20} className="relative z-10" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-800 group-hover:text-emerald-700 transition-colors">
                  Kisan<span className="text-emerald-600">Sahayak</span>
                </span>
                {lastScrollY < 20 && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-0 animate-fade-in sm:opacity-100">AI Farming</span>
                )}
              </div>
            </Link>

            {/* DESKTOP LINKS (FLOATING PILL) */}
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
                        className="absolute inset-0 bg-white rounded-full shadow-sm border border-slate-100/50"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                       {isActive && <link.icon size={16} className="animate-pulse" />}
                       {link.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-2 md:gap-3">
              
              {/* Voice Button */}
              {voiceSupported && (
                <button 
                  onClick={handleVoiceNav}
                  className={`relative p-3 rounded-full transition-all duration-300 group overflow-hidden ${
                    isListening 
                      ? "bg-red-50 text-red-600 ring-2 ring-red-100 shadow-red-200 shadow-lg" 
                      : "bg-white/50 hover:bg-white text-slate-500 hover:text-emerald-600 border border-white/60 shadow-sm"
                  }`}
                >
                  {isListening && <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping"></span>}
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}

              {/* Language Selector */}
              <div className="hidden md:block scale-90 opacity-80 hover:opacity-100 transition-opacity">
                 <GoogleTranslate />
              </div>

              {/* User Profile */}
              {user ? (
                <div className="flex items-center gap-2">
                   <Link to="/my-farm" className="hidden md:flex items-center gap-3 pl-1 pr-4 py-1 bg-white/50 hover:bg-white border border-white/60 hover:border-emerald-200 rounded-full shadow-sm hover:shadow-md transition-all group backdrop-blur-sm">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center text-emerald-700 border border-emerald-200/50">
                        <User size={16} />
                      </div>
                      <div className="text-left hidden lg:block">
                         <p className="text-xs font-bold text-slate-800 leading-tight">{user.displayName?.split(" ")[0] || "Farmer"}</p>
                      </div>
                   </Link>

                   {/* Mobile Profile */}
                   <Link to="/my-farm" className="md:hidden w-10 h-10 rounded-full bg-white border border-slate-200 text-emerald-600 flex items-center justify-center shadow-sm">
                     <User size={20} />
                   </Link>

                   {/* Logout */}
                   <button onClick={handleLogout} className="hidden md:flex p-2.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-colors">
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
                className="lg:hidden p-3 text-slate-700 bg-white/80 border border-white/60 backdrop-blur-md rounded-2xl shadow-sm active:scale-95 transition-all hover:bg-white hover:shadow-md"
              >
                 {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* --- CINEMATIC MOBILE MENU --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            className="fixed inset-0 z-40 bg-slate-50/95 backdrop-blur-3xl pt-28 px-6 lg:hidden overflow-y-auto"
          >
             <div className="flex flex-col space-y-2 pb-10 max-w-lg mx-auto">
                <motion.p variants={itemVariants} className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 px-2">
                  Menu
                </motion.p>
                
                {navLinks.map((link) => (
                  <motion.div key={link.name} variants={itemVariants}>
                    <Link 
                      to={link.path} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`group flex items-center justify-between p-4 rounded-3xl transition-all border ${
                         location.pathname === link.path 
                         ? "bg-white border-emerald-100 shadow-lg shadow-emerald-100/50" 
                         : "bg-white/40 border-transparent hover:bg-white hover:border-slate-100"
                      }`}
                    >
                       <div className="flex items-center gap-5">
                          <div className={`p-3 rounded-2xl transition-colors ${
                            location.pathname === link.path 
                            ? "bg-emerald-50 text-emerald-600" 
                            : "bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                          }`}>
                             <link.icon size={24} />
                          </div>
                          <span className={`text-xl font-bold ${
                            location.pathname === link.path ? "text-slate-900" : "text-slate-600"
                          }`}>
                            {link.name}
                          </span>
                       </div>
                       <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-400 transition-colors" />
                    </Link>
                  </motion.div>
                ))}

                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mt-4">
                   <Link to="/equipment" onClick={() => setIsMobileMenuOpen(false)} className="p-5 bg-amber-50/80 rounded-3xl border border-amber-100 text-amber-900 flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                      <Tractor size={28} className="mb-1 text-amber-600" />
                      <span className="text-sm font-bold">Equipment</span>
                   </Link>
                   <Link to="/support" onClick={() => setIsMobileMenuOpen(false)} className="p-5 bg-blue-50/80 rounded-3xl border border-blue-100 text-blue-900 flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                      <LifeBuoy size={28} className="mb-1 text-blue-600" />
                      <span className="text-sm font-bold">Support</span>
                   </Link>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-8 pt-8 border-t border-slate-200/50">
                    <div className="mb-8 flex justify-center scale-110"><GoogleTranslate /></div>
                    {user ? (
                      <button onClick={handleLogout} className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                        <LogOut size={20} /> Sign Out
                      </button>
                    ) : (
                      <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-200 active:scale-95 transition-transform">
                        Login to Account
                      </Link>
                    )}
                </motion.div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;