// src/components/ChatInterface.jsx
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { Send, X, User, ShieldCheck, Sparkles, CheckCheck } from "lucide-react";

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
    setNewMessage("");

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
    <div className="fixed bottom-4 right-4 z-[9999] w-[calc(100vw-2rem)] sm:w-[360px] h-[500px] max-h-[80vh] flex flex-col bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header - Compact & Professional */}
      <div className={`px-4 py-3 flex justify-between items-center shadow-sm shrink-0 ${
        isUserAdmin ? "bg-slate-900" : "bg-emerald-600"
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/10">
              {isUserAdmin ? <User className="text-white" size={18} /> : <ShieldCheck className="text-white" size={18} />}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm leading-tight">{receiverName}</h3>
            <p className="text-[10px] text-white/80 font-medium">
              {isUserAdmin ? "Direct Support" : "Verified Farmer"}
            </p>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Message Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Sparkles size={32} className="mb-2 opacity-50" />
            <p className="text-xs font-medium">Start a secure conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = (isUserAdmin && msg.sender === "admin") || (!isUserAdmin && msg.sender === "farmer");
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
              >
                <div className={`px-3.5 py-2 text-sm rounded-2xl shadow-sm leading-relaxed break-words ${
                  isMe 
                    ? (isUserAdmin ? "bg-slate-800 text-white rounded-tr-sm" : "bg-emerald-600 text-white rounded-tr-sm")
                    : "bg-white text-gray-700 border border-gray-200 rounded-tl-sm"
                }`}>
                  {msg.text}
                </div>
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[9px] text-gray-400">
                    {msg.timestamp?.toDate ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(msg.timestamp.toDate()) : 'Now'}
                  </span>
                  {isMe && <CheckCheck size={10} className="text-emerald-500" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100 shrink-0">
        <form 
          onSubmit={handleSend} 
          className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-full border border-gray-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all"
        >
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-gray-400 text-gray-700 min-w-0"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className={`p-2 rounded-full transition-all shrink-0 ${
              newMessage.trim() 
                ? (isUserAdmin ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-emerald-600 text-white hover:bg-emerald-700")
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send size={16} className={newMessage.trim() ? "translate-x-0.5" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
