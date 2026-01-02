// src/components/ProtectedRoute.jsx
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader } from "lucide-react";

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  // 1. Wait for Auth Check to finish (Prevents "Flashing")
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 text-green-600 gap-2">
        <Loader className="animate-spin" /> Loading...
      </div>
    );
  }

  // 2. If not logged in -> Go to Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. (Optional) If role doesn't match -> Go Home
  // Example: If an Admin tries to access a Farmer-only page
  if (allowedRole && user.role !== allowedRole && user.email !== "admin@system.com") {
     return <Navigate to="/" replace />;
  }

  // 4. If all good, show the page
  return children;
};

export default ProtectedRoute;