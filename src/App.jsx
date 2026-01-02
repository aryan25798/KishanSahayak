// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import FloatingChatbot from "./components/FloatingChatbot";
import Login from "./components/Login";
import Weather from "./components/Weather";
import AdminDashboard from "./components/AdminDashboard"; 
import Verify from "./components/Verify"; 
import Schemes from "./components/Schemes"; 
import ContactSupport from "./components/ContactSupport"; 
import ProtectedRoute from "./components/ProtectedRoute"; 
import { motion } from "framer-motion";
import { CloudRain, ShieldCheck, ScrollText, ArrowRight, TrendingUp, Users, Leaf } from "lucide-react";

// ANIMATED HERO SECTION & LANDING PAGE
const Home = () => (
  <div className="pt-16 min-h-screen bg-slate-50 font-sans selection:bg-emerald-200">
    
    {/* 1. HERO BANNER (High Contrast & Standard Colors) */}
    <div className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden">
      
      {/* Background Image */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1625246333195-58197bd47d26?q=80&w=2071')] bg-cover bg-center bg-fixed transform scale-105"></div>
      
      {/* Strong Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/80 to-black/40"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center py-20">
        
        {/* Left: Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-left"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-emerald-100 font-bold text-xs sm:text-sm mb-6">
             <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/> 
             AI-Powered Agriculture v2.0
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            Farming made <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
              Smart & Simple
            </span>
          </h1>
          
          <p className="text-lg text-gray-200 mb-8 max-w-lg leading-relaxed font-medium">
            Join 10,000+ farmers using AI to predict weather, find subsidies, and detect crop diseases instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/login" className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)] flex items-center justify-center gap-2 hover:scale-105">
               Get Started Now <ArrowRight size={20} />
            </Link>
            <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition backdrop-blur-sm">
              Explore Features
            </button>
          </div>
        </motion.div>

        {/* Right: Visual (Abstract Glass UI) - Hidden on mobile */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           className="hidden md:block relative h-full min-h-[400px]"
        >
           {/* Abstract Floating Glows */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/20 blur-[100px] rounded-full animate-pulse"></div>
           
           {/* Mockup Card Floating */}
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500 max-w-sm w-full">
                  <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white"><ShieldCheck size={24}/></div>
                      <div>
                          <div className="h-2 w-24 bg-white/50 rounded mb-2"></div>
                          <div className="h-2 w-16 bg-white/30 rounded"></div>
                      </div>
                  </div>
                  <div className="space-y-3">
                      <div className="h-4 w-full bg-white/10 rounded"></div>
                      <div className="h-4 w-5/6 bg-white/10 rounded"></div>
                      <div className="h-4 w-4/6 bg-white/10 rounded"></div>
                  </div>
                  <div className="mt-6 flex gap-3">
                      <div className="h-10 w-full bg-emerald-500 rounded-xl opacity-80"></div>
                  </div>
              </div>
           </div>
        </motion.div>
      </div>
    </div>

    {/* 2. STATS BANNER (Solid White, High Contrast) */}
    <div className="relative z-20 max-w-6xl mx-auto px-6 -mt-16 sm:-mt-20">
      <div className="bg-white border-b-4 border-emerald-500 rounded-3xl shadow-xl flex flex-wrap justify-around p-8 gap-6">
        {[
          { icon: Users, label: "Farmers Joined", val: "10,000+" },
          { icon: Leaf, label: "Crops Analyzed", val: "50,000+" },
          { icon: TrendingUp, label: "Market Data", val: "Real-time" },
        ].map((stat, idx) => (
          <div key={idx} className="flex items-center gap-4 px-4 min-w-[200px] justify-center sm:justify-start">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <stat.icon size={28} />
            </div>
            <div>
              <h4 className="text-3xl font-extrabold text-slate-900 leading-none mb-1">{stat.val}</h4>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* 3. FEATURES GRID (Solid Cards with Color Accents) */}
    <div id="features" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="text-sm font-extrabold text-emerald-600 uppercase tracking-widest mb-3 bg-emerald-50 inline-block px-4 py-1 rounded-full border border-emerald-100">
          Our Services
        </h2>
        <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-4">
          Everything a Farmer Needs
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Weather Card - Blue Theme */}
        <Link to="/weather" className="group relative bg-white border-2 border-blue-100 p-8 rounded-[2rem] shadow-xl hover:shadow-2xl hover:border-blue-300 transition-all duration-300 hover:-translate-y-2 overflow-hidden">
          {/* Top Color Bar */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300 border border-blue-200">
              <CloudRain size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">Precision Weather</h3>
            <p className="text-slate-600 font-medium leading-relaxed mb-8">
              Hyper-local forecasts, rainfall predictions, and humidity alerts tailored for your specific village.
            </p>
            <div className="w-full py-3 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white transition-all">
              Check Now <ArrowRight size={18} />
            </div>
          </div>
        </Link>

        {/* Verify Card - Emerald Theme */}
        <Link to="/verify" className="group relative bg-white border-2 border-emerald-100 p-8 rounded-[2rem] shadow-xl hover:shadow-2xl hover:border-emerald-300 transition-all duration-300 hover:-translate-y-2 overflow-hidden">
          {/* Top Color Bar */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300 border border-emerald-200">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors">Product Verify</h3>
            <p className="text-slate-600 font-medium leading-relaxed mb-8">
              Scan seed packets and fertilizers to detect counterfeits instantly using our database.
            </p>
            <div className="w-full py-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center gap-2 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              Scan Code <ArrowRight size={18} />
            </div>
          </div>
        </Link>

        {/* Schemes Card - Orange Theme */}
        <Link to="/schemes" className="group relative bg-white border-2 border-orange-100 p-8 rounded-[2rem] shadow-xl hover:shadow-2xl hover:border-orange-300 transition-all duration-300 hover:-translate-y-2 overflow-hidden">
          {/* Top Color Bar */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-orange-600"></div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300 border border-orange-200">
              <ScrollText size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-orange-700 transition-colors">Subsidy Finder</h3>
            <p className="text-slate-600 font-medium leading-relaxed mb-8">
              AI-matched government schemes. Find loans, equipment subsidies, and insurance easily.
            </p>
            <div className="w-full py-3 rounded-xl bg-orange-50 text-orange-700 font-bold flex items-center justify-center gap-2 group-hover:bg-orange-600 group-hover:text-white transition-all">
              Find Schemes <ArrowRight size={18} />
            </div>
          </div>
        </Link>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Main Background - Standard Slate Color */}
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative">
          <Navbar />
          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* 🔒 PROTECTED ROUTES */}
            <Route 
              path="/weather" 
              element={
                <ProtectedRoute>
                  <Weather />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/verify" 
              element={
                <ProtectedRoute>
                  <Verify />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/schemes" 
              element={
                <ProtectedRoute>
                  <Schemes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/support" 
              element={
                <ProtectedRoute>
                  <ContactSupport />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
          </Routes>
          <FloatingChatbot /> 
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;