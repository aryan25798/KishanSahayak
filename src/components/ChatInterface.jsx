// src/components/ChatInterface.jsx
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { Send, X, User, ShieldCheck, Sparkles } from "lucide-react";

const ChatInterface = ({ chatId, receiverName, isUserAdmin, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const textToSend = newMessage;
    setNewMessage(""); // Clear input early for "sexy" responsiveness

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: textToSend,
        sender: isUserAdmin ? "admin" : "farmer",
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="fixed inset-x-4 bottom-4 md:inset-x-auto md:right-6 md:bottom-6 md:w-[400px] h-[75vh] md:h-[600px] flex flex-col bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 overflow-hidden z-[9999] transition-all duration-500 animate-in fade-in slide-in-from-bottom-10">
      
      {/* Sexy Header */}
      <div className={`p-5 flex justify-between items-center relative overflow-hidden ${isUserAdmin ? "bg-slate-900" : "bg-emerald-600"}`}>
        {/* Decorative Background Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              {isUserAdmin ? <User className="text-white" size={20} /> : <ShieldCheck className="text-white" size={20} />}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-emerald-600 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base tracking-tight">{receiverName}</h3>
            <div className="flex items-center gap-1.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-white/70 uppercase font-black tracking-widest">
                {isUserAdmin ? "Direct Channel" : "Verified Support"}
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90"
        >
          <X size={20} />
        </button>
      </div>

      {/* Message Area with Custom Scrollbar */}
      <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-slate-200">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Sparkles size={40} className="mb-2 text-slate-400" />
            <p className="text-sm font-medium">Safe & Secure encrypted chat</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = (isUserAdmin && msg.sender === "admin") || (!isUserAdmin && msg.sender === "farmer");
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all hover:shadow-md ${
                  isMe 
                    ? "bg-emerald-600 text-white rounded-tr-none font-medium" 
                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                }`}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1 font-bold">
                  {msg.timestamp?.toDate ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(msg.timestamp.toDate()) : ''}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sexy Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form 
          onSubmit={handleSend} 
          className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition-all shadow-inner"
        >
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-slate-400 text-slate-700"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className={`p-2.5 rounded-xl transition-all transform active:scale-95 ${
              newMessage.trim() 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
                : "bg-slate-300 text-white"
            }`}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;