import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore"; // Updated import

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
    let unsubscribeSnapshot = null;

    // This listener runs whenever a user logs in or out
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Clean up previous Firestore listener if it exists (e.g. switching accounts)
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (currentUser) {
        try {
          // 2. Fetch fresh data from Firestore in REAL-TIME
          // We use onSnapshot instead of getDoc so updates (like adding a farm) sync instantly
          const docRef = doc(db, "users", currentUser.uid);
          
          unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const freshData = docSnap.data();
              setUserData(freshData);
              // Update cache
              localStorage.setItem('kisan_user_data', JSON.stringify(freshData));
            } else {
              // User exists in Auth but not in Database (rare edge case)
              console.warn("User authenticated but no profile found.");
              // Keep existing userData or set to null depending on preference, usually safer to clear if doc is missing
            }
            // Data is loaded (or updated), stop loading spinner
            setLoading(false);
          }, (error) => {
            console.error("Error listening to user data:", error);
            setLoading(false);
          });

        } catch (error) {
          console.error("Error setting up user listener:", error);
          setLoading(false);
        }
      } else {
        // User logged out
        setUserData(null);
        localStorage.removeItem('kisan_user_data');
        setLoading(false);
      }
    });

    // Cleanup function when the component unmounts
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};