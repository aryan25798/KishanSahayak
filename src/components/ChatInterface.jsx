// src/components/ChatInterface.jsx
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { Send, X, User, ShieldCheck } from "lucide-react";

const ChatInterface = ({ chatId, receiverName, isUserAdmin, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Listen to the specific chat document's "messages" subcollection
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [chatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: newMessage,
      sender: isUserAdmin ? "admin" : "farmer",
      timestamp: serverTimestamp(),
    });

    setNewMessage("");
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50 font-sans animate-fade-in">
      {/* Header */}
      <div className={`p-4 flex justify-between items-center text-white ${isUserAdmin ? "bg-gray-900" : "bg-green-600"}`}>
        <div className="flex items-center gap-2">
          {isUserAdmin ? <User size={20} /> : <ShieldCheck size={20} />}
          <div>
            <h3 className="font-bold text-sm">{receiverName}</h3>
            <span className="text-xs opacity-80">{isUserAdmin ? "Farmer" : "Support Team"}</span>
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={18} /></button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
        {messages.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Start the conversation...</p>}
        {messages.map((msg) => {
          const isMe = (isUserAdmin && msg.sender === "admin") || (!isUserAdmin && msg.sender === "farmer");
          return (
            <div key={msg.id} className={`max-w-[80%] p-3 rounded-xl text-sm ${isMe ? "bg-green-600 text-white self-end rounded-br-none" : "bg-white border self-start rounded-bl-none shadow-sm"}`}>
              <p>{msg.text}</p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500"
        />
        <button type="submit" className="bg-green-600 text-white p-2 rounded-xl hover:bg-green-700 transition"><Send size={18} /></button>
      </form>
    </div>
  );
};

export default ChatInterface;