// src/components/ResetPassword.jsx
import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, ArrowRight, Loader } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get the 'oobCode' (action code) from the URL query parameters
  const oobCode = searchParams.get("oobCode");

  // States
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("verifying"); // verifying | valid | invalid | success
  const [error, setError] = useState("");

  // 1. Verify the Code on Component Mount
  useEffect(() => {
    if (!oobCode) {
      setStatus("invalid");
      setError("No reset code found. Please check your email link again.");
      return;
    }

    // Check if the code is valid/expired
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        // Code is valid! User can now enter a new password.
        setStatus("valid"); 
      })
      .catch((err) => {
        console.error(err);
        setStatus("invalid");
        setError("This link has expired or has already been used.");
      });
  }, [oobCode]);

  // 2. Handle Password Update
  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("success");
      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 text-center"
      >
        {/* --- STATE: VERIFYING --- */}
        {status === "verifying" && (
          <div className="py-12">
            <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Verifying Link...</h2>
          </div>
        )}

        {/* --- STATE: INVALID LINK --- */}
        {status === "invalid" && (
          <div className="py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-500 mb-8">{error}</p>
            <button 
              onClick={() => navigate("/login")}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition"
            >
              Back to Login
            </button>
          </div>
        )}

        {/* --- STATE: VALID LINK (ENTER NEW PASSWORD) --- */}
        {status === "valid" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-gray-500 mb-8">Enter your new secure password below.</p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleReset} className="text-left">
              <div className="relative mb-6">
                <Lock className="absolute left-4 top-4 text-gray-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password" 
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition font-medium text-gray-800"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-600/20 transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="animate-spin" /> : "Set New Password"}
              </button>
            </form>
          </>
        )}

        {/* --- STATE: SUCCESS --- */}
        {status === "success" && (
          <div className="py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h2>
            <p className="text-gray-500 mb-8">You can now login with your new password.</p>
            <button 
              onClick={() => navigate("/login")}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              Go to Login <ArrowRight size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;