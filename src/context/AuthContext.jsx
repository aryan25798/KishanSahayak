import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore"; 

const AuthContext = createContext();

// Hook for easy access
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  // 1. Initialize from localStorage to prevent UI flash/white screen on reload
  const [userData, setUserData] = useState(() => {
    try {
      const saved = localStorage.getItem('kisan_user_data');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }); 

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    // 2. Global Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Clean up previous Firestore listener if user switches accounts
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (currentUser) {
        try {
          // 3. Real-time Firestore Sync
          // WARNING: Ensure you do not write to this doc frequently to save costs
          const docRef = doc(db, "users", currentUser.uid);
          
          unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const freshData = docSnap.data();
              setUserData(freshData);
              
              // Sync to local storage for offline/faster next load
              localStorage.setItem('kisan_user_data', JSON.stringify(freshData));
            } else {
              console.warn("User authenticated but profile document missing.");
              // Optional: You could trigger a 'createProfile' function here if needed
            }
            setLoading(false);
          }, (error) => {
            console.error("Firestore Context Error:", error);
            // Even if Firestore fails, stop loading so user can use the app (with cached data)
            setLoading(false);
          });

        } catch (error) {
          console.error("Auth Context Setup Error:", error);
          setLoading(false);
        }
      } else {
        // User Logged Out
        setUserData(null);
        localStorage.removeItem('kisan_user_data');
        setLoading(false);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // 4. Performance Optimization: Memoize the value object
  // This prevents unnecessary re-renders of the entire app tree
  const value = useMemo(() => ({
    user,
    userData,
    loading
  }), [user, userData, loading]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};