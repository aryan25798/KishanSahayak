// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { LogOut, User, Menu, Sprout } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const Navbar = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-white/80 border-b border-white/20 shadow-sm transition-all duration-300">
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
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Home</Link>
            <Link to="/weather" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Weather</Link>
            
            {/* ✅ ADDED SUPPORT LINK */}
            <Link to="/support" className="text-gray-600 hover:text-green-700 font-medium transition-colors">Support</Link>
            
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
                    <p className="text--[10px] text-gray-500 font-medium uppercase tracking-wider">{userData?.role || "Member"}</p>
                  </div>
                  <div className="bg-green-100 p-2 rounded-full text-green-700">
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
                Login / Join
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-gray-600">
            <Menu size={28} />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-t p-4 flex flex-col gap-4 shadow-xl"
        >
          <Link to="/" className="text-gray-800 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link to="/weather" className="text-gray-800 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Weather</Link>
          
          {/* ✅ ADDED SUPPORT MOBILE LINK */}
          <Link to="/support" className="text-gray-800 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Support</Link>
          
          {user ? (
            <button onClick={handleLogout} className="text-red-500 font-bold text-left">Logout</button>
          ) : (
            <Link to="/login" className="text-green-600 font-bold">Login</Link>
          )}
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;