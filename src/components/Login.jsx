// src/components/Login.jsx
import { useState } from "react";
import { auth, googleProvider, db } from "../firebase";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification, 
  sendPasswordResetEmail, // ✅ NEW: Import Password Reset
  signOut 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader, Leaf, CheckCircle, AlertTriangle } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  
  // UI States
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false); // ✅ NEW: Toggle for Reset Password Mode
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(""); 
  
  // Form Data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // 1. Handle Google Login (Unchanged)
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // 🚨 ADMIN CHECK (Google)
      if (user.email === "admin@system.com") {
        console.log("Admin detected via Google, redirecting...");
        navigate("/admin", { replace: true });
        return;
      }

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
      
      // Standard User Redirect
      navigate("/", { replace: true });

    } catch (err) {
      console.error(err);
      setError("Google Login Failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. ✅ NEW: Handle Password Reset
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email address first.");
    
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg("Password reset link sent! Please check your email inbox.");
      
      // Optional: Automatically switch back to login after a delay
      setTimeout(() => {
         setIsReset(false);
         setError("");
      }, 6000);

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') setError("No account found with this email.");
      else if (err.code === 'auth/invalid-email') setError("Invalid email address.");
      else setError("Failed to send reset link. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Email/Password Auth (Login & Signup)
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill all fields.");
    if (!isLogin && !name) return setError("Please enter your name.");
    
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 🔒 SECURITY: Check if Email is Verified
        if (!user.emailVerified && user.email !== "admin@system.com") {
            await signOut(auth); // Force logout
            setError("Email not verified. Please check your inbox and verify.");
            setLoading(false);
            return;
        }

        // 🚨 ADMIN CHECK
        if (user.email === "admin@system.com") {
             navigate("/admin", { replace: true });
        } else {
             navigate("/", { replace: true });
        }

      } else {
        // --- SIGN UP LOGIC ---
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        await updateProfile(user, { displayName: name });
        
        // Store user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          email: email,
          role: "farmer",
          createdAt: new Date()
        });

        // 📨 SEND VERIFICATION EMAIL
        await sendEmailVerification(user);
        
        // 🔒 LOGOUT IMMEDIATELY
        await signOut(auth);

        setSuccessMsg(`Verification link sent to ${email}. Please check your inbox!`);
        setIsLogin(true);
        setPassword(""); 
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setError("Invalid Email or Password.");
      else if (err.code === 'auth/email-already-in-use') setError("Email already registered.");
      else if (err.code === 'auth/weak-password') setError("Password too weak.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white pt-20 lg:pt-24 overflow-hidden">
      
      {/* LEFT SIDE: Visuals (Unchanged) */}
      <div className="hidden lg:flex w-1/2 relative rounded-tr-[50px] rounded-br-[50px] overflow-hidden ml-4 mb-4 shadow-2xl shadow-green-900/20 bg-gray-100">
        <img 
          src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=2071&auto=format&fit=crop" 
          alt="Indian Farmer in Field" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
        <div className="relative z-10 flex flex-col justify-end p-16 text-white h-full w-full">
          <motion.div 
             initial={{ opacity: 0, y: 30 }} 
             animate={{ opacity: 1, y: 0 }} 
             transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                <Leaf size={32} className="text-green-300" />
              </div>
              <span className="text-sm font-bold tracking-[0.2em] uppercase text-green-200">Kisan Sahayak v2.0</span>
            </div>
            <h1 className="text-5xl font-extrabold leading-tight mb-6 tracking-tight drop-shadow-lg">
              Empowering <br/>
              <span className="text-green-400">Indian Farmers</span>
            </h1>
            <div className="space-y-4 text-white/90 text-lg font-medium drop-shadow-md">
                <div className="flex items-center gap-3"><CheckCircle size={20} className="text-green-400"/> <span>AI-Powered Crop Doctor</span></div>
                <div className="flex items-center gap-3"><CheckCircle size={20} className="text-green-400"/> <span>Instant Subsidy Finder</span></div>
                <div className="flex items-center gap-3"><CheckCircle size={20} className="text-green-400"/> <span>Mandi Prices & Updates</span></div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 relative">
        
        <div className="lg:hidden absolute top-0 right-0 w-64 h-64 bg-green-100 rounded-full blur-3xl opacity-50 -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="lg:hidden absolute bottom-0 left-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10 -translate-x-1/2 translate-y-1/2"></div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full"
        >
          <div className="text-center lg:text-left mb-8">
             <h2 className="text-4xl font-extrabold text-gray-900 mb-3">
               {isReset ? "Reset Password" : (isLogin ? "Welcome Back" : "Create Account")}
             </h2>
             <p className="text-gray-500">
               {isReset 
                 ? "Enter your email to receive a recovery link." 
                 : (isLogin ? "Access your smart farming dashboard." : "Join thousands of modern farmers today.")}
             </p>
          </div>

          {/* Social Login (Hide when resetting password) */}
          {!isReset && (
            <>
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 p-3.5 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all group mb-8 shadow-sm"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Or continue with email</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
            </>
          )}

          {/* Success Message */}
          <AnimatePresence>
            {successMsg && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="text-green-700 text-sm bg-green-50 p-4 rounded-xl flex items-start gap-3 border border-green-200 mb-6"
              >
                 <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> 
                 <span className="font-medium">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="text-red-600 text-sm bg-red-50 p-4 rounded-xl flex items-start gap-3 border border-red-100 mb-6"
              >
                 <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> 
                 <span className="font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FORM AREA */}
          <form onSubmit={isReset ? handlePasswordReset : handleAuth} className="space-y-5">
            
            {/* Name Field (Only for Signup) */}
            {!isLogin && !isReset && (
              <div className="relative group">
                <User className="absolute left-4 top-4 text-gray-400 group-focus-within:text-green-600 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all font-medium text-gray-800"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {/* Email Field (Always visible) */}
            <div className="relative group">
              <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-green-600 transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all font-medium text-gray-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field (Hidden during Reset) */}
            {!isReset && (
              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-green-600 transition-colors" size={20} />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-green-500/10 focus:border-green-500 outline-none transition-all font-medium text-gray-800"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                {/* ✅ Forgot Password Link */}
                {isLogin && (
                    <div className="flex justify-end">
                        <button 
                            type="button"
                            onClick={() => { setIsReset(true); setError(""); setSuccessMsg(""); }}
                            className="text-sm font-bold text-green-600 hover:text-green-700 transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl font-bold shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader className="animate-spin" /> : (
                <>
                  {isReset ? "Send Reset Link" : (isLogin ? "Log In" : "Create Account")} 
                  {!isReset && <ArrowRight size={20} />}
                </>
              )}
            </button>
          </form>

          {/* Bottom Toggles */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            {isReset ? (
                <button 
                    onClick={() => { setIsReset(false); setError(""); setSuccessMsg(""); }} 
                    className="flex items-center justify-center gap-2 mx-auto text-gray-600 hover:text-green-700 font-bold transition-colors"
                >
                   <ArrowLeft size={16} /> Back to Login
                </button>
            ) : (
                <>
                    {isLogin ? "New to Kisan Sahayak?" : "Already have an account?"}{" "}
                    <button 
                      onClick={() => { setIsLogin(!isLogin); setError(""); setSuccessMsg(""); }} 
                      className="text-green-700 font-bold hover:text-green-800 transition-colors ml-1"
                    >
                      {isLogin ? "Create Account" : "Log In"}
                    </button>
                </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;