// src/components/ContactSupport.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Send, Clock, MessageCircle, Sparkles, Loader2, AlertCircle } from "lucide-react"; 
import emailjs from "@emailjs/browser"; 
import ChatInterface from "./ChatInterface";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ContactSupport = () => {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // SECURED CREDENTIALS
  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    if (!user) return;
    const fetchComplaints = async () => {
      const q = query(collection(db, "complaints"), where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);
      setMyComplaints(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchComplaints();
  }, [user]);

  // --- 🆕 AI ANALYSIS FUNCTION ---
  const handleAIAnalyze = async () => {
    if (!message || message.length < 10) {
      alert("Please describe the issue in detail first.");
      return;
    }
    setAnalyzing(true);
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      // ✅ STRICTLY using gemini-2.5-flash as ordered
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
        User Complaint: "${message}"
        Act as an Agri-Support Bot. 
        1. Summarize the problem in 5 words.
        2. Suggest 1 immediate DIY solution.
        3. Rate urgency (Low/Medium/High).
        Output strictly JSON: { "summary": "...", "solution": "...", "urgency": "..." }
      `;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const json = JSON.parse(text.replace(/```json|```/g, "").trim());
      setAiAnalysis(json);
    } catch (error) {
      console.error("AI Error:", error);
    }
    setAnalyzing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) return;
    setLoading(true);

    try {
      // 1. Save to Database (Including AI Insights if available)
      const docRef = await addDoc(collection(db, "complaints"), {
        uid: user.uid,
        farmerName: user.displayName || "Farmer",
        email: user.email,
        subject: subject,
        message: message,
        status: "Pending",
        timestamp: serverTimestamp(),
        // Save AI analysis for Admin prioritization
        aiSummary: aiAnalysis?.summary || "N/A",
        aiSolution: aiAnalysis?.solution || "",
        urgency: aiAnalysis?.urgency || "Normal"
      });

      // 2. Send Auto-Email (Acknowledgement)
      const templateParams = {
        to_name: user.displayName || "Farmer",
        to_email: user.email,
        complaint_id: docRef.id.slice(0, 5),
        user_message: message,
        status_message: "We have received your complaint and are reviewing it.",
        admin_reply: aiAnalysis ? `AI Suggested Quick Fix: ${aiAnalysis.solution}` : "Pending Review"
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);

      alert("Complaint Registered! Check your email.");
      setSubject(""); 
      setMessage(""); 
      setAiAnalysis(null);
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
             {/* Live Chat Button */}
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

              {/* 🆕 AI Button */}
              {!aiAnalysis && message.length > 10 && (
                 <button 
                   type="button" 
                   onClick={handleAIAnalyze}
                   disabled={analyzing}
                   className="mt-2 text-xs flex items-center gap-1 text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors font-bold w-full justify-center"
                 >
                   {analyzing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                   {analyzing ? "Analyzing Issue..." : "Get Instant AI Suggestion"}
                 </button>
              )}
            </div>

            {/* 🆕 AI Result Card */}
            {aiAnalysis && (
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 font-bold text-purple-800 mb-2">
                    <Sparkles size={14}/> AI Suggestion
                  </div>
                  <p className="text-gray-700 mb-2"><strong>Quick Fix:</strong> {aiAnalysis.solution}</p>
                  <p className="text-xs text-gray-500 italic">* Submitting ticket for human review...</p>
                </div>
            )}

            <button disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2">
              {loading ? "Sending..." : <><Send size={18}/> Send Complaint</>}
            </button>
          </form>
        </div>

        {/* My History Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Clock size={24}/> Ticket History</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {myComplaints.length === 0 ? (
              <p className="text-gray-400">No previous complaints.</p>
            ) : (
              myComplaints.map(ticket => (
                <div key={ticket.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800">{ticket.subject}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      ticket.status === "Resolved" ? "bg-green-100 text-green-700" : 
                      ticket.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">{ticket.message}</p>
                  
                  {/* AI & Admin Replies */}
                  <div className="space-y-2">
                      {ticket.aiSolution && !ticket.adminReply && (
                         <div className="bg-purple-50 p-2 rounded-lg text-xs text-purple-700 border border-purple-100">
                            <span className="font-bold">🤖 AI Suggestion:</span> {ticket.aiSolution}
                         </div>
                      )}
                      
                      {ticket.adminReply ? (
                        <div className="bg-green-50 p-3 rounded-lg text-sm border-l-4 border-green-500">
                          <span className="font-bold text-gray-900 block mb-1">Admin Reply:</span>
                          {ticket.adminReply}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Waiting for admin response...</p>
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Interface Overlay */}
      {isChatOpen && user && (
        <ChatInterface 
          chatId={`chat_${user.uid}`} 
          receiverName="Admin Support"
          isUserAdmin={false} 
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
};

export default ContactSupport;