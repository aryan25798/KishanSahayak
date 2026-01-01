// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import FloatingChatbot from "./components/FloatingChatbot";
import Login from "./components/Login";
import Weather from "./components/Weather";
import AdminDashboard from "./components/AdminDashboard"; // Imported
import Verify from "./components/Verify"; // Imported
import Schemes from "./components/Schemes"; // Imported
import { motion } from "framer-motion";
import { CloudRain, ShieldCheck, ScrollText, ArrowRight, TrendingUp, Users, Leaf } from "lucide-react";

// ANIMATED HERO SECTION
const Home = () => (
  <div className="pt-16 min-h-screen bg-gray-50 font-sans selection:bg-green-200">
    
    {/* HERO BANNER */}
    <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1625246333195-58197bd47d26?q=80&w=2071&auto=format&fit=crop")' }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-green-900/90 via-green-800/60 to-transparent z-0"></div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-center text-white">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm w-fit px-3 py-1 rounded-full mb-6 border border-white/10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold tracking-wide uppercase">AI-Powered Farming v2.0</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
            The Future of <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400">Indian Agriculture</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed max-w-lg">
            Empowering farmers with AI-driven insights, real-time weather precision, and instant subsidy discovery.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/login" className="px-8 py-4 bg-white text-green-900 font-bold rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform flex items-center gap-2">
              Get Started <ArrowRight size={20} />
            </Link>
            <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-transparent border border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition backdrop-blur-sm">
              Explore Features
            </button>
          </div>
        </motion.div>
      </div>
    </div>

    {/* STATS BANNER */}
    <div className="bg-white border-b border-gray-100 relative -mt-10 z-20 max-w-6xl mx-auto rounded-xl shadow-xl flex flex-wrap justify-around p-8">
      {[
        { icon: Users, label: "Farmers Joined", val: "10,000+" },
        { icon: Leaf, label: "Crops Analyzed", val: "50,000+" },
        { icon: TrendingUp, label: "Market Data", val: "Real-time" },
      ].map((stat, idx) => (
        <div key={idx} className="flex items-center gap-4 px-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <stat.icon size={24} />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-900">{stat.val}</h4>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>

    {/* FEATURES GRID */}
    <div id="features" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="text-sm font-bold text-green-600 uppercase tracking-widest mb-2">Our Services</h2>
        <h3 className="text-3xl md:text-4xl font-bold text-gray-900">Everything a Farmer Needs</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Weather Card */}
        <Link to="/weather" className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CloudRain size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Precision Weather</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Hyper-local forecasts, rainfall predictions, and humidity alerts tailored for your specific village.
            </p>
            <span className="text-blue-600 font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
              Check Now <ArrowRight size={16} />
            </span>
          </div>
        </Link>

        {/* Verify Card - NOW LINKED */}
        <Link to="/verify" className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Product Verify</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              Scan seed packets and fertilizers to detect counterfeits instantly using our database.
            </p>
            <span className="text-green-600 font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
              Scan Code <ArrowRight size={16} />
            </span>
          </div>
        </Link>

        {/* Schemes Card - NOW LINKED */}
        <Link to="/schemes" className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 overflow-hidden cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <ScrollText size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Subsidy Finder</h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              AI-matched government schemes. Find loans, equipment subsidies, and insurance easily.
            </p>
            <span className="text-orange-600 font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
              Find Schemes <ArrowRight size={16} />
            </span>
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
        {/* Main Background - Subtle Grid Pattern */}
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 relative">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/admin" element={<AdminDashboard />} /> {/* Admin Route */}
            <Route path="/verify" element={<Verify />} /> {/* Verify Route */}
            <Route path="/schemes" element={<Schemes />} /> {/* Schemes Route */}
          </Routes>
          <FloatingChatbot /> 
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;