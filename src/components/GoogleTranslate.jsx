// src/components/GoogleTranslate.jsx
import { useState, useEffect } from "react";
import { Languages } from "lucide-react";

const GoogleTranslate = () => {
  const [lang, setLang] = useState("en");

  // Sync state with Google Translate cookies on load
  useEffect(() => {
    const cookies = document.cookie.split(';');
    const transCookie = cookies.find(row => row.trim().startsWith('googtrans='));
    if (transCookie) {
      const storedLang = transCookie.split('=')[1].split('/').pop();
      setLang(storedLang === 'hi' ? 'hi' : 'en');
    }
  }, []);

  const changeLanguage = (targetLang) => {
    const googleSelect = document.querySelector(".goog-te-combo");
    
    if (googleSelect) {
      googleSelect.value = targetLang;
      googleSelect.dispatchEvent(new Event("change"));
      setLang(targetLang);
    } else {
      console.warn("Google Translate is not ready yet.");
    }
  };

  return (
    <button 
      onClick={() => changeLanguage(lang === "en" ? "hi" : "en")}
      className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-bold hover:bg-emerald-200 transition-colors shadow-sm text-sm"
    >
      <Languages size={16} />
      {lang === "en" ? "हिंदी" : "English"}
    </button>
  );
};

export default GoogleTranslate;