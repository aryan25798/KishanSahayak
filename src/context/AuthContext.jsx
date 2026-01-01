// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase"; // Importing the tools we just set up
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

// This is a "Hook" that lets any page easily check who is logged in
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Stores role (admin vs farmer)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This listener runs whenever a user logs in or out
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // If logged in, check the database to see if they are 'admin' or 'farmer'
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } else {
        setUserData(null);
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