// src/components/ContactSupport.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Send, Clock, MessageCircle } from "lucide-react"; // Added MessageCircle
import emailjs from "@emailjs/browser"; 
import ChatInterface from "./ChatInterface"; // ✅ Added Import

const ContactSupport = () => {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); // ✅ Chat State

  // ✅ SECURED CREDENTIALS (using Environment Variables)
  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  useEffect(() => {
    if (!user) return;
    const fetchComplaints = async () => {
      const q = query(collection(db, "complaints"), where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);
      setMyComplaints(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchComplaints();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return;
    setLoading(true);

    try {
      // 1. Save to Database
      const docRef = await addDoc(collection(db, "complaints"), {
        uid: user.uid,
        farmerName: user.displayName || "Farmer",
        email: user.email,
        subject: subject,
        message: message,
        status: "Pending",
        timestamp: new Date()
      });

      // 2. Send Auto-Email (Acknowledgement)
      const templateParams = {
        to_name: user.displayName || "Farmer",
        to_email: user.email,
        complaint_id: docRef.id.slice(0, 5),
        user_message: message,
        status_message: "We have received your complaint and are reviewing it.",
        admin_reply: "Pending Review" // Default message until you reply
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);

      alert("Complaint Registered! Check your email for confirmation.");
      setSubject(""); 
      setMessage(""); 
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      alert("Error submitting complaint.");
    }
    setLoading(false);
  };

  return (
    <div className="pt-24 min-h-screen bg-gray-50 p-6 relative">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        
        {/* Form Section */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
          <div className="flex justify-between items-center mb-6">
             <div>
                <h2 className="text-3xl font-bold text-gray-800">Contact Admin</h2>
                <p className="text-gray-500">Email ticket or chat live.</p>
             </div>
             {/* ✅ Live Chat Button */}
             <button 
               onClick={() => setIsChatOpen(true)}
               className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-200 transition animate-pulse"
             >
               <MessageCircle size={18}/> Live Chat
             </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">Select Issue Type</option>
                <option value="Product Verification Failed">Product Verification Failed</option>
                <option value="Scheme Application Issue">Scheme Application Issue</option>
                <option value="App Bug">App Bug / Error</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Message</label>
              <textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 border rounded-xl h-32 outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Describe your problem..."
              ></textarea>
            </div>
            <button disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2">
              {loading ? "Sending..." : <><Send size={18}/> Send Complaint</>}
            </button>
          </form>
        </div>

        {/* My History Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Clock size={24}/> Ticket History</h2>
          <div className="space-y-4">
            {myComplaints.length === 0 ? (
              <p className="text-gray-400">No previous complaints.</p>
            ) : (
              myComplaints.map(ticket => (
                <div key={ticket.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800">{ticket.subject}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      ticket.status === "Resolved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">{ticket.message}</p>
                  {ticket.adminReply && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm border-l-4 border-green-500">
                      <span className="font-bold text-gray-900 block mb-1">Admin Reply:</span>
                      {ticket.adminReply}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ✅ Chat Interface Overlay */}
      {isChatOpen && user && (
        <ChatInterface 
          chatId={`chat_${user.uid}`} // Unique Chat ID based on User ID
          receiverName="Admin Support"
          isUserAdmin={false} // Farmer Mode
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
};

export default ContactSupport;