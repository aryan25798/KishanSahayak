import { useState, useEffect } from "react";
import { db, auth, storage } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { Tractor, Plus, Search, MapPin, Tag, Image as ImageIcon, Loader, Trash2, CheckCircle, XCircle, MessageSquare, HandCoins, CalendarCheck } from "lucide-react";
import EquipmentChat from "./EquipmentChat";

const EquipmentMarketplace = ({ adminOverride = false }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("browse"); // browse, sell, requests
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ name: "", type: "Rent", price: "", location: "", description: "" });
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Equipment
      const itemsSnap = await getDocs(collection(db, "equipment"));
      const itemsData = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(itemsData);

      // 2. Fetch Requests (involved as owner or requester)
      if (user) {
        const q1 = query(collection(db, "equipment_requests"), where("ownerEmail", "==", user.email));
        const q2 = query(collection(db, "equipment_requests"), where("requesterEmail", "==", user.email));
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        // Merge and deduplicate based on ID
        const reqsMap = new Map();
        [...snap1.docs, ...snap2.docs].forEach(doc => {
            reqsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
        setRequests(Array.from(reqsMap.values()));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // --- Actions ---

  const handlePostItem = async (e) => {
    e.preventDefault();
    if (!image) return alert("Please upload an image.");
    setUploading(true);
    try {
      const imgRef = ref(storage, `equipment/${Date.now()}_${image.name}`);
      await uploadBytes(imgRef, image);
      const url = await getDownloadURL(imgRef);

      await addDoc(collection(db, "equipment"), {
        ...formData,
        imageUrl: url,
        ownerEmail: user.email,
        ownerName: user.displayName || "Farmer",
        createdAt: serverTimestamp(),
        status: "Available" // Default status
      });
      alert("Equipment Posted Successfully!");
      setFormData({ name: "", type: "Rent", price: "", location: "", description: "" });
      setImage(null);
      fetchData();
      setActiveTab("browse");
    } catch (e) { alert(e.message); }
    setUploading(false);
  };

  const handleBook = async (item) => {
    if (!user) return alert("Login required");
    if (item.status !== "Available") return alert("This item is already booked.");

    try {
      await addDoc(collection(db, "equipment_requests"), {
        equipmentId: item.id,
        equipmentName: item.name,
        equipmentImage: item.imageUrl,
        ownerEmail: item.ownerEmail,
        requesterEmail: user.email,
        requesterName: user.displayName || "Farmer",
        status: "Pending", // Initial Status
        type: item.type, // Rent or Sale
        timestamp: serverTimestamp()
      });
      alert("Request Sent! Wait for owner approval.");
      fetchData();
      setActiveTab("requests");
    } catch (e) { alert(e.message); }
  };

  const handleAcceptRequest = async (req) => {
    if(!confirm("Accept this request? This will mark the equipment as booked.")) return;

    try {
      // 1. Update Request Status -> "Approved" (Enables Chat)
      await updateDoc(doc(db, "equipment_requests", req.id), { 
        status: "Approved" 
      });

      // 2. Update Equipment Item Status -> "Rented" or "Sold" (Locks it for others)
      const newStatus = req.type === "Sale" ? "Sold" : "Rented";
      await updateDoc(doc(db, "equipment", req.equipmentId), { 
        status: newStatus 
      });

      // 3. Reject all other pending requests for this specific item
      const otherReqsQuery = query(
        collection(db, "equipment_requests"), 
        where("equipmentId", "==", req.equipmentId),
        where("status", "==", "Pending")
      );
      const otherReqsSnap = await getDocs(otherReqsQuery);
      otherReqsSnap.forEach(async (d) => {
        if(d.id !== req.id) {
            await updateDoc(doc(db, "equipment_requests", d.id), { status: "Item Unavailable" });
        }
      });

      alert(`Request Accepted! Item marked as ${newStatus}.`);
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Error updating status.");
    }
  };

  const handleRejectRequest = async (reqId) => {
    if(!confirm("Reject this request?")) return;
    await updateDoc(doc(db, "equipment_requests", reqId), { status: "Rejected" });
    fetchData();
  };

  const handleDelete = async (id) => {
    if (confirm("Permanently delete this listing?")) {
      await deleteDoc(doc(db, "equipment", id));
      fetchData();
    }
  };

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader className="animate-spin text-orange-600 w-10 h-10" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-[85vh]">
      
      {/* Header & Tabs */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Tractor className="text-orange-600 w-7 h-7 sm:w-9 sm:h-9" /> Equipment Mandi
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mb-6">Rent or Buy farming equipment securely from local farmers.</p>
        
        {/* Responsive Tabs - Scrollable on mobile */}
        <div className="flex overflow-x-auto sm:flex-wrap gap-2 border-b border-gray-200 pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {["browse", "sell", "requests"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-2 rounded-t-lg font-bold text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab 
                  ? "bg-orange-600 text-white shadow-sm" 
                  : "bg-white text-gray-500 hover:bg-gray-100"
              }`}
            >
              {tab === "browse" && "Browse Listings"}
              {tab === "sell" && "+ Post Equipment"}
              {tab === "requests" && (
                <span className="flex items-center gap-1">
                  My Requests 
                  {requests.filter(r => r.status === "Pending" && r.ownerEmail === user?.email).length > 0 && 
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-1"/>
                  }
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* --- BROWSE TAB --- */}
      {activeTab === "browse" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-up">
          {items.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition group flex flex-col ${item.status !== "Available" ? "opacity-75" : "border-gray-100"}`}>
              <div className="h-48 sm:h-56 overflow-hidden relative">
                <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-cover transition duration-500 ${item.status === "Available" ? "group-hover:scale-105" : "grayscale-[0.5]"}`} />
                
                {/* Status Badge */}
                <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-sm uppercase tracking-wider ${
                  item.status === "Available" 
                    ? (item.type === "Rent" ? "bg-blue-500 text-white" : "bg-green-500 text-white")
                    : "bg-gray-800 text-white"
                }`}>
                  {item.status === "Available" ? `For ${item.type}` : item.status}
                </span>

                {(adminOverride || item.ownerEmail === user?.email) && (
                  <button onClick={() => handleDelete(item.id)} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <div className="p-4 sm:p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-base sm:text-lg text-gray-800 line-clamp-1">{item.name}</h3>
                  <span className="font-bold text-orange-600 whitespace-nowrap text-sm sm:text-base">₹{item.price}</span>
                </div>
                <div className="text-xs sm:text-sm text-gray-500 space-y-1 mb-4 flex-1">
                   <p className="flex items-center gap-1"><MapPin size={14} className="shrink-0"/> {item.location}</p>
                   <p className="flex items-center gap-1 line-clamp-2"><Tag size={14} className="shrink-0"/> {item.description}</p>
                </div>
                
                {item.ownerEmail !== user?.email ? (
                  <button 
                    onClick={() => handleBook(item)}
                    disabled={item.status !== "Available"}
                    className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm sm:text-base ${
                      item.status === "Available" 
                        ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-95" 
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {item.status === "Available" 
                      ? <><HandCoins size={18} /> Request {item.type}</>
                      : <><CalendarCheck size={18} /> {item.status}</>
                    }
                  </button>
                ) : (
                  <div className="w-full bg-orange-50 text-orange-700 py-2 rounded-xl text-center text-xs font-bold uppercase tracking-wider border border-orange-100">
                    Your Listing
                  </div>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
              <Tractor size={48} className="mx-auto mb-4 opacity-20"/>
              <p>No equipment listings found.</p>
            </div>
          )}
        </div>
      )}

      {/* --- SELL TAB --- */}
      {activeTab === "sell" && (
        <div className="max-w-2xl mx-auto bg-white p-4 sm:p-8 rounded-3xl shadow-lg border border-gray-100 animate-fade-up">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Post New Equipment</h2>
          <form onSubmit={handlePostItem} className="space-y-4">
            {/* Responsive Grid for Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Equipment Name (e.g. Tractor)" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 w-full" />
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white w-full">
                <option value="Rent">For Rent (Per Hour/Day)</option>
                <option value="Sale">For Sale (One Time)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Price (₹)" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 w-full" />
              <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Location (e.g. Patna)" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 w-full" />
            </div>
            
            <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Condition, Model Year, specific terms..." className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 h-32 resize-none" />
            
            <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:border-orange-500 transition bg-gray-50 group">
              {image ? (
                <span className="text-green-600 font-bold break-all">{image.name}</span>
              ) : (
                <span className="text-gray-400 flex flex-col items-center gap-2 group-hover:text-gray-600">
                  <ImageIcon size={32}/> 
                  <span className="text-sm">Tap to upload photo</span>
                </span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files[0])} />
            </label>

            <button disabled={uploading} className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-bold hover:bg-orange-700 transition shadow-md active:scale-95 text-sm sm:text-base">
              {uploading ? "Uploading..." : "Submit Listing"}
            </button>
          </form>
        </div>
      )}

      {/* --- REQUESTS TAB --- */}
      {activeTab === "requests" && (
        <div className="space-y-4 animate-fade-up">
          {requests.length === 0 && (
             <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20"/>
                <p>No active requests found.</p>
             </div>
          )}
          
          {requests.map(req => {
            const isOwner = req.ownerEmail === user.email;
            
            let statusColor = "bg-yellow-100 text-yellow-700 border-yellow-200";
            if(req.status === "Approved") statusColor = "bg-green-100 text-green-700 border-green-200";
            if(req.status === "Rejected" || req.status.includes("Unavailable")) statusColor = "bg-red-100 text-red-700 border-red-200";

            return (
              <div key={req.id} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-md">
                
                {/* Left: Info - Flex layout for better mobile alignment */}
                <div className="flex items-start sm:items-center gap-4 w-full md:w-auto">
                  <img src={req.equipmentImage} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border bg-gray-100 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">{req.equipmentName}</h4>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ${statusColor}`}>
                        {req.status === "Approved" ? (req.type === "Rent" ? "Rented Out" : "Sold") : req.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-col gap-0.5">
                      <span className="truncate">{isOwner ? `From: ${req.requesterName}` : `Owner: ${req.ownerEmail}`}</span>
                      <span className="opacity-75">{new Date(req.timestamp?.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions - Stack on small screens, row on medium */}
                <div className="flex flex-row md:flex-row gap-2 w-full md:w-auto mt-2 md:mt-0">
                  
                  {/* OWNER ACTIONS */}
                  {isOwner && req.status === "Pending" && (
                    <div className="flex gap-2 w-full">
                      <button onClick={() => handleAcceptRequest(req)} className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-sm active:scale-95">
                        <CheckCircle size={16}/> Approve
                      </button>
                      <button onClick={() => handleRejectRequest(req.id)} className="flex-1 md:flex-none bg-white border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 active:scale-95">
                        <XCircle size={16}/> Reject
                      </button>
                    </div>
                  )}

                  {/* CHAT BUTTON */}
                  {req.status === "Approved" && (
                    <button 
                      onClick={() => setActiveChat({ id: req.id, name: isOwner ? req.requesterName : "Owner" })}
                      className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-200 animate-pulse active:scale-95"
                    >
                      <MessageSquare size={18}/> Chat Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Render Separate Chat Module */}
      {activeChat && (
        <EquipmentChat 
          requestId={activeChat.id}
          receiverName={activeChat.name}
          currentUserEmail={user.email}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
};

export default EquipmentMarketplace;