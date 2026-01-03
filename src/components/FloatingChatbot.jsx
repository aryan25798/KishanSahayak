// src/components/FloatingChatbot.jsx
import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MessageCircle, X, Send, Image as ImageIcon, Mic, StopCircle, Sparkles, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ✅ Secured API Key using Environment Variable
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null); 
  const [imagePreview, setImagePreview] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [messages, setMessages] = useState([
    { text: "Namaste! I am Kisan Sahayak. How can I help your farm today?", sender: "bot" }
  ]);
  const [loading, setLoading] = useState(false);
  
  const recognitionRef = useRef(null);
  const speechRef = useRef(window.speechSynthesis);
  const chatEndRef = useRef(null); 

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ✅ Speech Recognition Setup
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false; // Standard for voice commands
      recognition.interimResults = false;
      recognition.lang = "en-IN"; 

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(transcript);
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
        if (e.error === 'network') {
          alert("Network Error: Voice recognition requires an active internet connection.");
        } else if (e.error === 'not-allowed') {
          alert("Microphone blocked. Please allow access in browser settings.");
        }
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Mic start error:", err);
      }
    }
  };

  const fileToGenerativePart = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ inlineData: { data: reader.result.split(",")[1], mimeType: file.type } });
      reader.readAsDataURL(file);
    });
  };

  const speakText = (text) => {
    if (speechRef.current.speaking) speechRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN"; 
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    speechRef.current.speak(utterance);
  };

  const handleSend = async () => {
    if (!input && !image) return;

    // 1. Add User Message to State
    const userMsg = { text: input, sender: "user", image: imagePreview };
    setMessages(prev => [...prev, userMsg]);
    
    // Clear Input UI immediately
    const currentInput = input; // Store for API call
    const currentImage = image; // Store for API call
    setInput(""); 
    setImage(null); 
    setImagePreview(null); 
    setLoading(true);

    try {
      // ✅ STRICTLY USING GEMINI 2.5 AS REQUESTED
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "You are Kisan Sahayak, an expert agricultural AI assistant for Indian farmers. Keep answers concise, practical, and easy to understand."
      });
      
      // ✅ FIX: Filter out the initial 'bot' greeting from history.
      // The API requires history to start with 'user'.
      const history = messages
        .filter((msg, index) => !(index === 0 && msg.sender === "bot")) // Remove first welcome message
        .map(msg => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }] 
        }));

      const chat = model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 500, 
        },
      });

      // Prepare current message parts
      let parts = [{ text: currentInput }];
      if (currentImage) {
        const imgPart = await fileToGenerativePart(currentImage);
        parts.push(imgPart);
        if (!currentInput) parts.push({ text: "Analyze this agricultural image and tell me if there are diseases or issues." });
      }

      // Send Message
      const result = await chat.sendMessage(parts);
      const text = result.response.text();

      setMessages(prev => [...prev, { text: text, sender: "bot" }]);
      speakText(text); 

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { text: "I am having trouble connecting to the farm network. Please try again.", sender: "bot" }]);
    }
    setLoading(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImage(file); setImagePreview(URL.createObjectURL(file)); }
  };

  return (
    <>
      {/* 1. FLOATING LAUNCHER */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-5 right-5 z-50 p-4 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)] bg-gradient-to-tr from-green-600 to-emerald-500 text-white flex items-center justify-center border-4 border-white/30 backdrop-blur-md"
          >
            <Sparkles size={24} className="animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 2. MAIN CHAT WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className={`fixed z-50 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/50 flex flex-col overflow-hidden
              w-full h-[100dvh] bottom-0 right-0 rounded-none
              sm:w-[350px] sm:h-[500px] sm:bottom-5 sm:right-5 sm:rounded-3xl
            `}
          >
            
            {/* HEADER */}
            <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-3 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
              <div className="flex items-center gap-2 relative z-10">
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-none">Kisan Sahayak</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-medium opacity-90">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 relative z-10">
                 {isSpeaking && (
                    <button onClick={() => {speechRef.current.cancel(); setIsSpeaking(false)}} className="p-1.5 hover:bg-white/20 rounded-full transition">
                      <StopCircle size={18} />
                    </button>
                 )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full transition hover:rotate-90 duration-300">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* MESSAGES AREA */}
            <div className="flex-1 p-3 overflow-y-auto bg-gray-50/50 scroll-smooth">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={index} 
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    {msg.image && (
                      <img src={msg.image} className="w-40 rounded-xl mb-1 border-2 border-white shadow-sm" alt="Upload" />
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm leading-relaxed ${
                      msg.sender === "user" 
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-tr-none" 
                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                
                {loading && (
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs ml-2 mt-2">
                    <div className="flex space-x-1">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-green-400 rounded-full"></motion.div>
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} className="w-1.5 h-1.5 bg-green-400 rounded-full"></motion.div>
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-green-400 rounded-full"></motion.div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* IMAGE PREVIEW BANNER */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 py-1.5 bg-green-50/90 backdrop-blur-sm border-t border-green-100 flex justify-between items-center shrink-0"
                >
                  <span className="text-[10px] font-bold text-green-700 flex items-center gap-1">
                    <ImageIcon size={12} /> Image Attached
                  </span>
                  <button onClick={() => {setImage(null); setImagePreview(null)}} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* INPUT AREA */}
            <div className="p-3 bg-white/80 backdrop-blur-md border-t border-gray-100 shrink-0">
              <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-full border border-gray-200 focus-within:border-green-400 focus-within:bg-white transition-all shadow-inner">
                
                <label className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <ImageIcon size={18} />
                </label>

                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400 min-w-0"
                  placeholder={isListening ? "Listening..." : "Ask..."}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />

                <button 
                  onClick={handleMicClick} 
                  className={`p-2 rounded-full transition ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-green-600'}`}
                >
                  <Mic size={18} />
                </button>

                <button 
                  onClick={handleSend} 
                  disabled={!input && !image}
                  className={`p-2 rounded-full shadow-md transition-all ${
                    (!input && !image) 
                      ? 'bg-gray-200 text-gray-400' 
                      : 'bg-green-600 text-white hover:scale-105'
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChatbot;