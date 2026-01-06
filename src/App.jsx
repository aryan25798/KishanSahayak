import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import FloatingChatbot from "./components/FloatingChatbot";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";

// ✅ Import Toaster to make notifications visible
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
  Headset, 
  Loader 
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
  <div className="flex h-[80vh] w-full items-center justify-center bg-transparent px-4">
    <div className="flex flex-col items-center gap-3 p-6 bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg">
      <Loader className="h-10 w-10 animate-spin text-emerald-600" />
      <span className="font-medium text-emerald-800 animate-pulse">Loading...</span>
    </div>
  </div>
);

// ANIMATED HERO SECTION & LANDING PAGE
const Home = () => (
  <div className="pt-20 md:pt-24 min-h-screen font-sans selection:bg-emerald-200 overflow-x-hidden">
    
    {/* 1. HERO BANNER */}
    {/* Responsive Border Radius: Smaller on mobile, larger on desktop */}
    <div className="relative w-full min-h-[85vh] lg:min-h-[90vh] flex items-center justify-center overflow-hidden rounded-[0_0_2rem_2rem] md:rounded-[0_0_3rem_3rem] shadow-2xl">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1625246333195-58197bd47d26?q=80&w=2071')] bg-cover bg-center bg-fixed transform scale-100 md:scale-105"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/80 to-black/40"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center py-16 md:py-20">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-left flex flex-col items-start"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-emerald-100 font-bold text-xs sm:text-sm mb-6 shadow-glow">
             <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/> 
             AI-Powered Agriculture v2.0
          </div>
          
          {/* Responsive Typography */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight drop-shadow-xl">
            Farming made <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
              Smart & Simple
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-gray-200 mb-8 max-w-lg leading-relaxed font-medium">
            Join 10,000+ farmers using AI to predict weather, find subsidies, and detect crop diseases instantly.
          </p>

          {/* Responsive Buttons: Stack on mobile, row on desktop */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)] flex items-center justify-center gap-2 hover:scale-105 hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.8)] active:scale-95">
               Get Started Now <ArrowRight size={20} />
            </Link>
            <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition backdrop-blur-sm active:scale-95">
              Explore Features
            </button>
          </div>
        </motion.div>

        {/* 3D Card - Hidden on very small screens to save space, visible on tablet+ */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           className="hidden md:block relative h-full min-h-[400px]"
        >
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-emerald-500/20 blur-[80px] lg:blur-[100px] rounded-full animate-pulse"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500 max-w-sm w-full hover:border-emerald-400/50">
                 <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white box-shadow-glow"><ShieldCheck size={24}/></div>
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
                     <div className="h-10 w-full bg-emerald-500 rounded-xl opacity-80 shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                 </div>
             </div>
           </div>
        </motion.div>
      </div>
    </div>

    {/* 2. STATS BANNER */}
    {/* Negative margin adjusted for mobile to prevent overlap */}
    <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 -mt-10 sm:-mt-20">
      <div className="bg-white/80 backdrop-blur-lg border-b-4 border-emerald-500 rounded-3xl shadow-2xl flex flex-col sm:flex-row flex-wrap justify-around p-6 md:p-8 gap-6 border border-white/50">
        {[
          { icon: Users, label: "Farmers Joined", val: "10,000+" },
          { icon: Leaf, label: "Crops Analyzed", val: "50,000+" },
          { icon: TrendingUp, label: "Market Data", val: "Real-time" },
        ].map((stat, idx) => (
          <div key={idx} className="flex items-center gap-4 justify-start sm:justify-center group w-full sm:w-auto">
            <div className="p-3 md:p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shrink-0">
              <stat.icon size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h4 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-none mb-1">{stat.val}</h4>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* 3. FEATURES GRID */}
    <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-xs md:text-sm font-extrabold text-emerald-600 uppercase tracking-widest mb-3 bg-emerald-50 inline-block px-4 py-1 rounded-full border border-emerald-100 shadow-sm">
          Our Services
        </h2>
        <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-4 leading-tight">
          Everything a Farmer Needs
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Helper function to generate cards to keep code clean */}
        <FeatureCard 
          to="/my-farm"
          color="green"
          Icon={Sprout}
          title="My Farm Profile"
          desc="Update your farm details, soil type, and location to get personalized AI advice and schemes."
          action="Manage Farm"
        />

        <FeatureCard 
          to="/doctor"
          color="red"
          Icon={Stethoscope}
          title="Crop Doctor"
          desc="Take a photo of your sick plant. Our AI identifies the disease and suggests organic & chemical cures."
          action="Diagnose Now"
        />

        <FeatureCard 
          to="/weather"
          color="blue"
          Icon={CloudRain}
          title="Precision Weather"
          desc="Hyper-local forecasts, rainfall predictions, and humidity alerts tailored for your specific village."
          action="Check Now"
        />

        <FeatureCard 
          to="/equipment"
          color="amber"
          Icon={Tractor}
          title="Equipment Mandi"
          desc="Rent tractors, harvestors, and tools from nearby farmers. Or list your own equipment to earn."
          action="Rent or Buy"
        />

        <FeatureCard 
          to="/verify"
          color="emerald"
          Icon={ShieldCheck}
          title="Product Verify"
          desc="Scan seed packets and fertilizers to detect counterfeits instantly using our database."
          action="Scan Code"
        />

        <FeatureCard 
          to="/schemes"
          color="orange"
          Icon={ScrollText}
          title="Subsidy Finder"
          desc="AI-matched government schemes. Find loans, equipment subsidies, and insurance easily."
          action="Find Schemes"
        />

        <FeatureCard 
          to="/market"
          color="purple"
          Icon={TrendingUp}
          title="Mandi Bhav"
          desc="Real-time market prices for crops in your nearby mandis. Track trends and sell at the right time."
          action="Check Prices"
        />

        <FeatureCard 
          to="/forum"
          color="rose"
          Icon={Users}
          title="Kisan Chopal"
          desc="Connect with other farmers, ask questions, share tips, and solve farming problems together."
          action="Join Community"
        />

        <FeatureCard 
          to="/map"
          color="teal"
          Icon={MapPinned}
          title="Resources Map"
          desc="Locate nearby seed shops, testing labs, and agricultural centers with step-by-step directions."
          action="View Map"
        />

        <FeatureCard 
          to="/support"
          color="slate"
          Icon={Headset}
          title="24/7 Support"
          desc="Facing issues? Chat with our support team or raise a ticket for quick resolution."
          action="Contact Us"
        />

      </div>
    </div>
  </div>
);

// Reusable Component for Grid Cards to ensure consistent responsiveness
const FeatureCard = ({ to, color, Icon, title, desc, action }) => {
  // Dynamic class generator based on color prop
  const colors = {
    green: "border-green-100 hover:border-green-400 hover:bg-green-50/50 bg-green-50 text-green-600 border-green-200 group-hover:bg-green-500 bg-gradient-to-r from-green-400 to-green-600 text-green-700 bg-green-50 group-hover:bg-green-600",
    red: "border-red-100 hover:border-red-400 hover:bg-red-50/50 bg-red-50 text-red-600 border-red-200 group-hover:bg-red-500 bg-gradient-to-r from-red-400 to-red-600 text-red-700 bg-red-50 group-hover:bg-red-600",
    blue: "border-blue-100 hover:border-blue-400 hover:bg-blue-50/50 bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-500 bg-gradient-to-r from-blue-400 to-blue-600 text-blue-700 bg-blue-50 group-hover:bg-blue-600",
    amber: "border-amber-100 hover:border-amber-400 hover:bg-amber-50/50 bg-amber-50 text-amber-600 border-amber-200 group-hover:bg-amber-500 bg-gradient-to-r from-amber-400 to-amber-600 text-amber-700 bg-amber-50 group-hover:bg-amber-600",
    emerald: "border-emerald-100 hover:border-emerald-400 hover:bg-emerald-50/50 bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-500 bg-gradient-to-r from-emerald-400 to-emerald-600 text-emerald-700 bg-emerald-50 group-hover:bg-emerald-600",
    orange: "border-orange-100 hover:border-orange-400 hover:bg-orange-50/50 bg-orange-50 text-orange-600 border-orange-200 group-hover:bg-orange-500 bg-gradient-to-r from-orange-400 to-orange-600 text-orange-700 bg-orange-50 group-hover:bg-orange-600",
    purple: "border-purple-100 hover:border-purple-400 hover:bg-purple-50/50 bg-purple-50 text-purple-600 border-purple-200 group-hover:bg-purple-500 bg-gradient-to-r from-purple-400 to-purple-600 text-purple-700 bg-purple-50 group-hover:bg-purple-600",
    rose: "border-rose-100 hover:border-rose-400 hover:bg-rose-50/50 bg-rose-50 text-rose-600 border-rose-200 group-hover:bg-rose-500 bg-gradient-to-r from-rose-400 to-rose-600 text-rose-700 bg-rose-50 group-hover:bg-rose-600",
    teal: "border-teal-100 hover:border-teal-400 hover:bg-teal-50/50 bg-teal-50 text-teal-600 border-teal-200 group-hover:bg-teal-500 bg-gradient-to-r from-teal-400 to-teal-600 text-teal-700 bg-teal-50 group-hover:bg-teal-600",
    slate: "border-slate-100 hover:border-slate-400 hover:bg-slate-50/50 bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-slate-500 bg-gradient-to-r from-slate-400 to-slate-600 text-slate-700 bg-slate-50 group-hover:bg-slate-600",
  };

  // We need to reconstruct the classes manually because Tailwind doesn't support dynamic interpolation well without safelisting
  // To solve this cleanly for this specific snippet, I will just use style replacement logic or standard mapping.
  // Ideally, you should pass specific tailwind classes as props, but for this refactor, I'll map them:
  
  const getClasses = (c) => {
      const map = {
          green: { border: "border-green-100 hover:border-green-400", bgIcon: "bg-green-50 text-green-600 border-green-200", bgIconHover: "group-hover:bg-green-500 group-hover:text-white", bar: "from-green-400 to-green-600", textHover: "group-hover:text-green-700", btnBg: "bg-green-50 text-green-700", btnHover: "group-hover:bg-green-600 group-hover:text-white" },
          red: { border: "border-red-100 hover:border-red-400", bgIcon: "bg-red-50 text-red-600 border-red-200", bgIconHover: "group-hover:bg-red-500 group-hover:text-white", bar: "from-red-400 to-red-600", textHover: "group-hover:text-red-700", btnBg: "bg-red-50 text-red-700", btnHover: "group-hover:bg-red-600 group-hover:text-white" },
          blue: { border: "border-blue-100 hover:border-blue-400", bgIcon: "bg-blue-50 text-blue-600 border-blue-200", bgIconHover: "group-hover:bg-blue-500 group-hover:text-white", bar: "from-blue-400 to-blue-600", textHover: "group-hover:text-blue-700", btnBg: "bg-blue-50 text-blue-700", btnHover: "group-hover:bg-blue-600 group-hover:text-white" },
          amber: { border: "border-amber-100 hover:border-amber-400", bgIcon: "bg-amber-50 text-amber-600 border-amber-200", bgIconHover: "group-hover:bg-amber-500 group-hover:text-white", bar: "from-amber-400 to-amber-600", textHover: "group-hover:text-amber-700", btnBg: "bg-amber-50 text-amber-700", btnHover: "group-hover:bg-amber-600 group-hover:text-white" },
          emerald: { border: "border-emerald-100 hover:border-emerald-400", bgIcon: "bg-emerald-50 text-emerald-600 border-emerald-200", bgIconHover: "group-hover:bg-emerald-500 group-hover:text-white", bar: "from-emerald-400 to-emerald-600", textHover: "group-hover:text-emerald-700", btnBg: "bg-emerald-50 text-emerald-700", btnHover: "group-hover:bg-emerald-600 group-hover:text-white" },
          orange: { border: "border-orange-100 hover:border-orange-400", bgIcon: "bg-orange-50 text-orange-600 border-orange-200", bgIconHover: "group-hover:bg-orange-500 group-hover:text-white", bar: "from-orange-400 to-orange-600", textHover: "group-hover:text-orange-700", btnBg: "bg-orange-50 text-orange-700", btnHover: "group-hover:bg-orange-600 group-hover:text-white" },
          purple: { border: "border-purple-100 hover:border-purple-400", bgIcon: "bg-purple-50 text-purple-600 border-purple-200", bgIconHover: "group-hover:bg-purple-500 group-hover:text-white", bar: "from-purple-400 to-purple-600", textHover: "group-hover:text-purple-700", btnBg: "bg-purple-50 text-purple-700", btnHover: "group-hover:bg-purple-600 group-hover:text-white" },
          rose: { border: "border-rose-100 hover:border-rose-400", bgIcon: "bg-rose-50 text-rose-600 border-rose-200", bgIconHover: "group-hover:bg-rose-500 group-hover:text-white", bar: "from-rose-400 to-rose-600", textHover: "group-hover:text-rose-700", btnBg: "bg-rose-50 text-rose-700", btnHover: "group-hover:bg-rose-600 group-hover:text-white" },
          teal: { border: "border-teal-100 hover:border-teal-400", bgIcon: "bg-teal-50 text-teal-600 border-teal-200", bgIconHover: "group-hover:bg-teal-500 group-hover:text-white", bar: "from-teal-400 to-teal-600", textHover: "group-hover:text-teal-700", btnBg: "bg-teal-50 text-teal-700", btnHover: "group-hover:bg-teal-600 group-hover:text-white" },
          slate: { border: "border-slate-100 hover:border-slate-400", bgIcon: "bg-slate-50 text-slate-600 border-slate-200", bgIconHover: "group-hover:bg-slate-500 group-hover:text-white", bar: "from-slate-400 to-slate-600", textHover: "group-hover:text-slate-700", btnBg: "bg-slate-50 text-slate-700", btnHover: "group-hover:bg-slate-600 group-hover:text-white" },
      }
      return map[color] || map.green;
  }

  const theme = getClasses(color);

  return (
      <Link to={to} className={`group relative bg-white/70 backdrop-blur-md border-2 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden hover:bg-white/90 ${theme.border}`}>
          <div className={`absolute top-0 left-0 w-full h-1.5 md:h-2 bg-gradient-to-r ${theme.bar}`}></div>
          <div className="relative z-10">
            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300 border group-hover:shadow-lg ${theme.bgIcon} ${theme.bgIconHover}`}>
              <Icon size={28} className="md:w-8 md:h-8" />
            </div>
            <h3 className={`text-xl md:text-2xl font-bold text-slate-900 mb-3 transition-colors ${theme.textHover}`}>{title}</h3>
            <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed mb-8">
              {desc}
            </p>
            <div className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-sm md:text-base ${theme.btnBg} ${theme.btnHover}`}>
              {action} <ArrowRight size={18} />
            </div>
          </div>
      </Link>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* 🔥 THE FUTURISTIC 3D BACKGROUND LAYER 🔥 */}
        <div className="min-h-screen font-sans text-slate-900 relative bg-slate-50 overflow-x-hidden">
          
          {/* Animated Gradient Orbs */}
          <div className="fixed inset-0 z-0 pointer-events-none">
             {/* Base Gradient */}
             <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-emerald-50/50 to-blue-50/50"></div>
             
             {/* Floating Orbs - Adjusted sizes for mobile to prevent overwhelming the screen */}
             <div className="absolute top-[-10%] left-[-10%] w-[80vw] sm:w-[50vw] h-[80vw] sm:h-[50vw] bg-emerald-300/20 rounded-full blur-[80px] sm:blur-[100px] animate-[pulse_10s_infinite_ease-in-out]"></div>
             <div className="absolute top-[40%] right-[-10%] w-[60vw] sm:w-[40vw] h-[60vw] sm:h-[40vw] bg-blue-300/20 rounded-full blur-[80px] sm:blur-[100px] animate-[pulse_15s_infinite_ease-in-out_delay-2000ms]"></div>
             <div className="absolute bottom-[-10%] left-[20%] w-[70vw] sm:w-[60vw] h-[70vw] sm:h-[60vw] bg-teal-200/20 rounded-full blur-[100px] sm:blur-[120px] animate-[pulse_20s_infinite_ease-in-out_delay-500ms]"></div>

             {/* 3D Grid Overlay */}
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#0596691a_1px,transparent_1px),linear-gradient(to_bottom,#0596691a_1px,transparent_1px)] bg-[size:2rem_2rem] sm:bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
          </div>

          {/* Content Wrapper */}
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-grow">
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
                        {/* Adjusted padding for mobile responsiveness */}
                        <div className="pt-20 md:pt-24 px-4 sm:px-6"> 
                          <EquipmentMarketplace />
                        </div>
                      </ProtectedRoute>
                    } 
                  />
                  
                </Routes>
              </Suspense>
            </div>
            <FloatingChatbot /> 
            
            {/* ✅ FIXED: Toast Notifications will now appear */}
            <Toaster position="top-right" />
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;