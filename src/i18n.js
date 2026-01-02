// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 1. Define your translations here
const resources = {
  en: {
    translation: {
      "welcome": "Farming made Smart & Simple",
      "weather": "Precision Weather",
      "schemes": "Subsidy Finder",
      "mandi": "Mandi Prices",
      "forum": "Kisan Chopal",
      "login": "Login",
      "language": "Language"
    }
  },
  hi: {
    translation: {
      "welcome": "खेती हुई अब और भी आसान",
      "weather": "सटीक मौसम",
      "schemes": "सरकारी योजनाएं",
      "mandi": "मंडी भाव",
      "forum": "किसान चौपाल",
      "login": "लॉग इन",
      "language": "भाषा"
    }
  }
};

// 2. Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;