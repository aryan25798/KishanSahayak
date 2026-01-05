import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import FloatingChatbot from "./components/FloatingChatbot";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";

// ✅ FIXED: Import Toaster to make notifications visible
import { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import "./i18n";

// 1. Import lazy and Suspense for optimization
import { lazy, Suspense } from 'react';
import { 
  CloudRain, 
  ShieldCheck, 
  ScrollText, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Leaf, 
  MapPinned, 
  Tractor, 
  Stethoscope,
  Sprout,
  Headset, // ✅ Added Headset icon for Support
  Loader // Added Loader for Suspense fallback
} from "lucide-react";

// 2. Lazy Load Heavy Components
const Weather = lazy(() => import("./components/Weather"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard")); 
const Verify = lazy(() => import("./components/Verify")); 
const Schemes = lazy(() => import("./components/Schemes")); 
const ContactSupport = lazy(() => import("./components/ContactSupport")); 
const MarketPrices = lazy(() => import("./components/MarketPrices"));
const CommunityForum = lazy(() => import("./components/CommunityForum"));
const FarmerMap = lazy(() => import("./components/FarmerMap")); 
const EquipmentMarketplace = lazy(() => import("./components/EquipmentMarketplace")); 
const CropDoctor = lazy(() => import("./components/CropDoctor")); 
const MyFarm = lazy(() => import("./components/MyFarm"));

// Simple Loading Spinner Component for Suspense fallback
const PageLoader = () => (
  <div className="flex h-[80vh] w-full items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-2">
      <Loader className="h-10 w-10 animate-spin text-emerald-500" />
      <span className="font-medium text-emerald-700">Loading...</span>
    </div>
  </div>
);

// ANIMATED HERO SECTION & LANDING PAGE
const Home = () => (
  <div className="pt-20 md:pt-24 min-h-screen bg-slate-50 font-sans selection:bg-emerald-200">
    
    {/* 1. HERO BANNER */}
    <div className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1625246333195-58197bd47d26?q=80&w=2071')] bg-cover bg-center bg-fixed transform scale-105"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/80 to-black/40"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center py-20">
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

        <motion.div 
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           className="hidden md:block relative h-full min-h-[400px]"
        >
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/20 blur-[100px] rounded-full animate-pulse"></div>
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

    {/* 2. STATS BANNER */}
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

    {/* 3. FEATURES GRID - RESPONSIVE BENTO GRID */}
    <div id="features" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="text-sm font-extrabold text-emerald-600 uppercase tracking-widest mb-3 bg-emerald-50 inline-block px-4 py-1 rounded-full border border-emerald-100">
          Our Services
        </h2>
        <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-4">
          Everything a Farmer Needs
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* Large Card - Weather (Spans 2 cols, 2 rows) */}
        <motion.div whileHover={{ y: -5 }} className="col-span-1 md:col-span-2 row-span-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
            <CloudRain className="w-32 h-32 absolute -right-4 -bottom-4 opacity-20" />
            <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                    <CloudRain size={24} className="text-white"/>
                </div>
                <h3 className="text-3xl font-bold mb-2">Precision Weather</h3>
                <p className="text-blue-100 mb-6 max-w-xs text-lg">Hyper-local forecasts, rainfall predictions, and humidity alerts tailored for your specific village.</p>
                <Link to="/weather" className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-6 py-3 rounded-xl font-bold border border-white/30 hover:bg-white/30 transition-all">
                    Check Forecast <ArrowRight size={18}/>
                </Link>
            </div>
        </motion.div>

        {/* Standard Card - Crop Doctor */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Stethoscope size={24} /></div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Crop Doctor</h3>
            <p className="text-slate-500 text-sm mb-4"> AI disease detection & cures.</p>
            <Link to="/doctor" className="text-sm font-bold text-red-500 flex items-center gap-1 group-hover:gap-2 transition-all">Diagnose <ArrowRight size={16}/></Link>
        </div>

        {/* Standard Card - Mandi */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Mandi Bhav</h3>
            <p className="text-slate-500 text-sm mb-4">Real-time market prices.</p>
            <Link to="/market" className="text-sm font-bold text-purple-500 flex items-center gap-1 group-hover:gap-2 transition-all">Check Prices <ArrowRight size={16}/></Link>
        </div>

        {/* Standard Card - My Farm */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Sprout size={24} /></div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">My Farm</h3>
            <p className="text-slate-500 text-sm mb-4">Manage farm profile & soil.</p>
            <Link to="/my-farm" className="text-sm font-bold text-green-500 flex items-center gap-1 group-hover:gap-2 transition-all">Manage <ArrowRight size={16}/></Link>
        </div>

        {/* Standard Card - Equipment */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Tractor size={24} /></div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Equipment</h3>
            <p className="text-slate-500 text-sm mb-4">Rent or buy tractors.</p>
            <Link to="/equipment" className="text-sm font-bold text-amber-500 flex items-center gap-1 group-hover:gap-2 transition-all">Rent Now <ArrowRight size={16}/></Link>
        </div>

        {/* Wide Card - Schemes (Spans 2 cols) */}
        <div className="col-span-1 md:col-span-2 bg-orange-50 border border-orange-100 rounded-3xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between relative overflow-hidden group">
             <div className="relative z-10 max-w-md">
               <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-4"><ScrollText size={24}/></div>
               <h3 className="text-2xl font-bold text-orange-900 mb-2">Govt. Schemes</h3>
               <p className="text-orange-700 mb-6 font-medium">Find subsidies for tractors, seeds, and insurance tailored to you.</p>
               <Link to="/schemes" className="px-6 py-3 bg-white text-orange-600 font-bold rounded-xl shadow-sm hover:shadow-md transition-all inline-flex items-center gap-2">View Schemes <ArrowRight size={18}/></Link>
             </div>
             <ScrollText className="absolute -right-4 -bottom-4 w-40 h-40 text-orange-200/50 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
        </div>

        {/* Standard Card - Verify */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><ShieldCheck size={24} /></div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Verify Product</h3>
            <p className="text-slate-500 text-sm mb-4">Detect fake seeds & fertilizers.</p>
            <Link to="/verify" className="text-sm font-bold text-emerald-500 flex items-center gap-1 group-hover:gap-2 transition-all">Scan Code <ArrowRight size={16}/></Link>
        </div>

        {/* Standard Card - Forum */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users size={24} /></div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Kisan Chopal</h3>
            <p className="text-slate-500 text-sm mb-4">Community forum for farmers.</p>
            <Link to="/forum" className="text-sm font-bold text-rose-500 flex items-center gap-1 group-hover:gap-2 transition-all">Join <ArrowRight size={16}/></Link>
        </div>

        {/* Standard Card - Map */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-teal-50 text-teal-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><MapPinned size={24} /></div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Resource Map</h3>
            <p className="text-slate-500 text-sm mb-4">Find nearby shops & labs.</p>
            <Link to="/map" className="text-sm font-bold text-teal-500 flex items-center gap-1 group-hover:gap-2 transition-all">View Map <ArrowRight size={16}/></Link>
        </div>

        {/* Standard Card - Support */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Headset size={24} /></div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">24/7 Support</h3>
            <p className="text-slate-500 text-sm mb-4">Help & Ticket Support.</p>
            <Link to="/support" className="text-sm font-bold text-slate-500 flex items-center gap-1 group-hover:gap-2 transition-all">Contact <ArrowRight size={16}/></Link>
        </div>

      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative">
          <Navbar />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* PUBLIC ROUTES */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />

              {/* 🔒 PROTECTED ROUTES (Lazy Loaded) */}
              <Route 
                path="/weather" 
                element={
                  <ProtectedRoute>
                    <Weather />
                  </ProtectedRoute>
                } 
              />
              
              {/* MY FARM ROUTE */}
              <Route 
                path="/my-farm" 
                element={
                  <ProtectedRoute>
                    <MyFarm />
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
              
              <Route 
                path="/market" 
                element={
                  <ProtectedRoute>
                    <MarketPrices />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/forum" 
                element={
                  <ProtectedRoute>
                    <CommunityForum />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/map" 
                element={
                  <ProtectedRoute>
                    <FarmerMap />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/doctor" 
                element={
                  <ProtectedRoute>
                    <CropDoctor />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/equipment" 
                element={
                  <ProtectedRoute>
                    <div className="pt-24"> 
                      <EquipmentMarketplace />
                    </div>
                  </ProtectedRoute>
                } 
              />
              
            </Routes>
          </Suspense>
          <FloatingChatbot /> 
          
          {/* ✅ FIXED: Toast Notifications will now appear */}
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;