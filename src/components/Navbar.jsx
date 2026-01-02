// src/components/Navbar.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { LogOut, User, Menu, Sprout, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// ✅ Import the GoogleTranslate component
import GoogleTranslate from "./GoogleTranslate"; 

const Navbar = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            
            {/* ✅ Static Text - Google will translate automatically */}
            <Link to="/weather" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Precision Weather</Link>
            <Link to="/schemes" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Schemes</Link>
            <Link to="/support" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Support</Link>
            
            {/* ✅ Google Translate Component */}
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
                  <div className="bg-green-100 p-2 rounded-full text-green-700 border border-green-200">
                    <User size={20} />
                  </div>
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
              <Link to="/weather" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Precision Weather</Link>
              <Link to="/schemes" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Schemes</Link>
              <Link to="/support" className="text-gray-800 font-medium p-2 hover:bg-emerald-50 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>Support</Link>
              
              <div className="p-2">
                 <GoogleTranslate />
              </div>

              {user ? (
                <div className="border-t border-gray-100 pt-4 mt-2">
                   <div className="flex items-center gap-3 mb-4 px-2">
                      <div className="bg-green-100 p-2 rounded-full text-green-700">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{user.displayName || "Farmer"}</p>
                        <p className="text-xs text-gray-500 uppercase">{userData?.role || "Member"}</p>
                      </div>
                   </div>
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