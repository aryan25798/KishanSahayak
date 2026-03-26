import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Square, Loader } from "lucide-react";

const TTSButton = ({ text, lang = "hi-IN", className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if speech synthesis is available
    if ("speechSynthesis" in window) {
      setIsReady(true);
      
      // Stop speaking when component unmounts
      return () => {
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const toggleSpeech = () => {
    if (!isReady) return alert("Text-to-speech is not supported in this browser.");

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Clean the text from markdown asterisks and hashtags for better reading
      const cleanText = text.replace(/[*#`_]/g, "").replace(/\n/g, ". ");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang; // Defaults to Hindi, falls back gracefully

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isReady) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleSpeech}
      className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all ${
        isPlaying 
          ? "bg-purple-100 text-purple-700 ring-2 ring-purple-400" 
          : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
      } ${className}`}
      title={isPlaying ? "Stop Listening" : "Listen aloud"}
    >
      <AnimatePresence mode="wait">
        {isPlaying ? (
          <motion.div
            key="stop"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-1.5"
          >
            <Square size={14} className="fill-purple-700" />
            <span className="text-xs">Stop</span>
          </motion.div>
        ) : (
          <motion.div
            key="play"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-1.5"
          >
            <Volume2 size={16} />
            <span className="text-xs hidden sm:inline">Listen</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default TTSButton;
