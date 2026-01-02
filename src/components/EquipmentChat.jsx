import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { Send, X, MessageCircle, ChevronLeft } from "lucide-react";

const EquipmentChat = ({ requestId, receiverName, currentUserEmail, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Separate Collection: equipment_chats
  useEffect(() => {
    const q = query(
      collection(db, "equipment_chats", requestId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [requestId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, "equipment_chats", requestId, "messages"), {
        text: newMessage,
        senderEmail: currentUserEmail,
        timestamp: serverTimestamp(),
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex sm:items-center justify-center bg-black/50 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full h-[100dvh] sm:h-[600px] sm:max-w-md sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-orange-600 px-4 py-3 sm:py-4 flex justify-between items-center text-white shrink-0 shadow-md z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            <button onClick={onClose} className="sm:hidden p-1 -ml-2 hover:bg-white/20 rounded-full transition">
               <ChevronLeft size={24} />
            </button>
            
            <div className="bg-white/20 p-2 rounded-full hidden sm:block">
               <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-sm leading-tight">Negotiation</h3>
              <p className="text-xs text-orange-100 flex items-center gap-1">
                with <span className="font-semibold underline decoration-orange-300/50">{receiverName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hidden sm:block p-1.5 hover:bg-white/20 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3 scroll-smooth">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
              <div className="bg-gray-100 p-4 rounded-full">
                <MessageCircle size={32} className="opacity-20" />
              </div>
              <p className="text-xs font-medium">Start discussing the deal.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderEmail === currentUserEmail;
              return (
                <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed break-words ${
                    isMe 
                      ? "bg-orange-600 text-white rounded-tr-sm" 
                      : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {msg.timestamp?.toDate ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(msg.timestamp.toDate()) : '...'}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 bg-white border-t border-gray-100 shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-100 px-4 py-3 rounded-full text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition border border-transparent focus:border-orange-200"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()} 
              className={`p-3 rounded-full transition shadow-sm shrink-0 ${
                newMessage.trim() 
                  ? "bg-orange-600 text-white hover:bg-orange-700 active:scale-95" 
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Send size={18} className={newMessage.trim() ? "translate-x-0.5" : ""} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default EquipmentChat;