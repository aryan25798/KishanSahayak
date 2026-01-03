import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase"; // Importing the tools we just set up
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

// This is a "Hook" that lets any page easily check who is logged in
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  // Initialize from localStorage to prevent UI flash
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
    // This listener runs whenever a user logs in or out
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // 1. Check if we have cached data to show immediately (handled by useState init)
          
          // 2. Fetch fresh data from Firestore to ensure it's up to date
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const freshData = docSnap.data();
            setUserData(freshData);
            // Update cache
            localStorage.setItem('kisan_user_data', JSON.stringify(freshData));
          } else {
            // User exists in Auth but not in Database (rare edge case)
            console.warn("User authenticated but no profile found.");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        // User logged out
        setUserData(null);
        localStorage.removeItem('kisan_user_data');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};