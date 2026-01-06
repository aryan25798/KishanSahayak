// src/components/Login.jsx
import { useState } from "react";
import { auth, googleProvider, db } from "../firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader, Leaf, CheckCircle, Sparkles } from "lucide-react";
import toast from "react-hot-toast"; // Assuming you have this from previous steps

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // To animate icons on focus
  
  // Form Data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // 1. Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          name: user.displayName,
          email: user.email,
          role: "farmer",
          createdAt: new Date(),
          photo: user.photoURL
        });
      }
      toast.success(`Welcome back, ${user.displayName}!`);
      navigate("/");
    } catch (err) {
      toast.error("Google Login Failed.");
    }
    setLoading(false);
  };

  // 2. Handle Auth
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill all fields.");
    if (!isLogin && !name) return toast.error("Please enter your name.");
    
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Login Successful!");
        navigate("/");
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        await updateProfile(user, { displayName: name });
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          email: email,
          role: "farmer",
          createdAt: new Date()
        });
        toast.success("Account Created Successfully!");
        navigate("/");
      }
    } catch (err) {
      if (err.code === 'auth/invalid-credential') toast.error("Invalid Email or Password.");
      else if (err.code === 'auth/email-already-in-use') toast.error("Email already registered.");
      else if (err.code === 'auth/weak-password') toast.error("Password too weak.");
      else toast.error(err.message);
    }
    setLoading(false);
  };

  // Reusable Input Component for cleaner code
  const InputField = ({ icon: Icon, type, placeholder, value, onChange, name }) => (
    <div className="relative group mb-4">
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focusedInput === name ? "text-emerald-500" : "text-slate-400"}`}>
        <Icon size={20} />
      </div>
      <input 
        type={type} 
        placeholder={placeholder} 
        className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-slate-700 placeholder:text-slate-400
          ${focusedInput === name 
            ? "border-emerald-500 bg-white ring-4 ring-emerald-500/10" 
            : "border-transparent hover:border-slate-200"
          }`}
        value={value}
        onChange={onChange}
        onFocus={() => setFocusedInput(name)}
        onBlur={() => setFocusedInput(null)}
      />
    </div>
  );

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] overflow-hidden relative">
      
      {/* BACKGROUND BLOBS (Mobile & Desktop) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-400/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-400/20 rounded-full blur-[120px] animate-pulse delay-1000" />

      {/* MAIN CONTAINER */}
      <div className="w-full h-full min-h-screen flex items-center justify-center p-4 lg:p-8 z-10">
        
        <div className="w-full max-w-7xl h-[85vh] lg:h-[90vh] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col lg:flex-row border border-white/50 backdrop-blur-sm">
          
          {/* --- LEFT SIDE: IMAGE & BRANDING (Desktop Only) --- */}
          <div className="hidden lg:relative lg:flex w-1/2 bg-slate-900 overflow-hidden relative group">
             {/* Background Image with Zoom Effect */}
             <img 
               src="https://images.unsplash.com/photo-1625246333195-58197bd47d26?q=80&w=2071&auto=format&fit=crop" 
               alt="Agriculture" 
               className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000 ease-out"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-900/40 to-transparent" />

             {/* Content Overlay */}
             <div className="relative z-10 flex flex-col justify-between p-12 h-full w-full">
                {/* Logo Area */}
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                      <Leaf className="text-emerald-300" size={20} />
                   </div>
                   <span className="text-white font-bold tracking-wider uppercase text-sm">Kisan Sahayak</span>
                </div>

                {/* Text Block */}
                <div className="mb-8">
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.2 }}
                     className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl"
                   >
                      <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
                        The Future of <br/>
                        <span className="text-emerald-400">Smart Farming</span>
                      </h1>
                      <div className="space-y-4">
                        {[
                          "AI Crop Disease Detection",
                          "Real-time Weather Alerts",
                          "Direct Mandi Market Prices"
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-emerald-50 font-medium">
                             <div className="bg-emerald-500/20 p-1 rounded-full"><CheckCircle size={14} className="text-emerald-400"/></div>
                             {item}
                          </div>
                        ))}
                      </div>
                   </motion.div>
                </div>
             </div>
          </div>

          {/* --- RIGHT SIDE: FORM --- */}
          <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 relative overflow-y-auto">
            
            <div className="w-full max-w-sm">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
              >
                <div className="inline-block p-3 rounded-full bg-emerald-100/50 mb-4">
                  <Sparkles className="text-emerald-600" size={24} fill="currentColor" fillOpacity={0.2} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                  {isLogin ? "Welcome Back!" : "Join the Community"}
                </h2>
                <p className="text-slate-500">
                  {isLogin ? "Access your smart farm dashboard." : "Start your journey to better yields today."}
                </p>
              </motion.div>

              {/* Google Button */}
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 p-4 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] mb-8"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center gap-4 mb-8">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Or with email</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleAuth}>
                <AnimatePresence initial={false} mode="popLayout">
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <InputField 
                        icon={User} 
                        type="text" 
                        placeholder="Full Name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        name="name"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <InputField 
                  icon={Mail} 
                  type="email" 
                  placeholder="Email Address" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  name="email"
                />

                <InputField 
                  icon={Lock} 
                  type="password" 
                  placeholder="Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  name="password"
                />

                <button 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white p-4 rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? <Loader className="animate-spin" /> : (
                    <>
                      {isLogin ? "Sign In" : "Create Account"} <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Toggle */}
              <div className="mt-8 text-center">
                <p className="text-slate-500 text-sm">
                  {isLogin ? "Don't have an account yet?" : "Already have an account?"}
                  <button 
                    onClick={() => setIsLogin(!isLogin)} 
                    className="ml-2 text-emerald-600 font-bold hover:text-emerald-700 hover:underline transition-all"
                  >
                    {isLogin ? "Sign up" : "Log in"}
                  </button>
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;