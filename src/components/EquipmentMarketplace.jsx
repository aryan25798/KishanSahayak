// src/components/EquipmentMarketplace.jsx
import { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
  query, where, serverTimestamp, arrayUnion, arrayRemove,
  orderBy 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { 
  Tractor, Plus, Search, MapPin, Image as ImageIcon, Loader, 
  Trash2, CheckCircle, XCircle, MessageSquare, HandCoins, CalendarCheck,
  Star, Calendar, User, Store, ShoppingBag, LayoutGrid, AlertCircle
} from "lucide-react";
import EquipmentChat from "./EquipmentChat";
import toast from "react-hot-toast";

const EquipmentMarketplace = ({ adminOverride = false }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("browse"); // browse, bookings, store
  
  // Data Buckets
  const [marketItems, setMarketItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [myBookings, setMyBookings] = useState([]); // Requests SENT by me
  const [incomingRequests, setIncomingRequests] = useState([]); // Requests RECEIVED by me
  const [reviews, setReviews] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChat, setActiveChat] = useState(null);

  // Form State
  const [showPostForm, setShowPostForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", type: "Rent", price: "", location: "", description: "" });
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Modal States
  const [bookingItem, setBookingItem] = useState(null); 
  const [bookingDates, setBookingDates] = useState({ startDate: "", endDate: "" });
  const [managingItem, setManagingItem] = useState(null); 
  const [blockDate, setBlockDate] = useState("");
  const [reviewRequest, setReviewRequest] = useState(null); 
  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });

  // --- Fetch Data Logic ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Equipment
      const itemsSnap = await getDocs(query(collection(db, "equipment"), orderBy("createdAt", "desc")));
      const allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Split items into "Mine" and "Market"
      if (user) {
        setMyItems(allItems.filter(i => i.ownerEmail === user.email));
        setMarketItems(allItems.filter(i => i.ownerEmail !== user.email));
      } else {
        setMarketItems(allItems);
        setMyItems([]);
      }

      // 2. Fetch Requests
      if (user) {
        // Requests I received (I am the owner)
        const q1 = query(collection(db, "equipment_requests"), where("ownerEmail", "==", user.email));
        // Requests I sent (I am the requester)
        const q2 = query(collection(db, "equipment_requests"), where("requesterEmail", "==", user.email));
        
        const [receivedSnap, sentSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const received = receivedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sent = sentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Sort by timestamp (newest first)
        received.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        sent.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        setIncomingRequests(received);
        setMyBookings(sent);
      }

      // 3. Fetch Reviews
      const reviewsSnap = await getDocs(collection(db, "reviews"));
      setReviews(reviewsSnap.docs.map(d => d.data()));

    } catch (e) {
      console.error(e);
      toast.error("Failed to load marketplace data");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // --- Helpers ---
  const getOwnerRating = (email) => {
    const userReviews = reviews.filter(r => r.targetEmail === email);
    if (userReviews.length === 0) return null;
    const avg = userReviews.reduce((acc, curr) => acc + curr.rating, 0) / userReviews.length;
    return { avg: avg.toFixed(1), count: userReviews.length };
  };

  const checkAvailability = (item, start, end) => {
    if (!item.unavailableDates) return true;
    let curr = new Date(start);
    const last = new Date(end);
    while (curr <= last) {
      if (item.unavailableDates.includes(curr.toISOString().split('T')[0])) return false;
      curr.setDate(curr.getDate() + 1);
    }
    return true;
  };

  const getDatesInRange = (start, end) => {
    const dates = [];
    let curr = new Date(start);
    const last = new Date(end);
    while (curr <= last) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  // --- Item Management ---
  const handlePostItem = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Please login to post");
    
    setUploading(true);
    try {
      let url = null;
      if (image) {
          const imgRef = ref(storage, `equipment/${Date.now()}_${image.name}`);
          await uploadBytes(imgRef, image);
          url = await getDownloadURL(imgRef);
      }

      await addDoc(collection(db, "equipment"), {
        ...formData,
        imageUrl: url, 
        ownerEmail: user.email,
        ownerName: user.displayName || "Farmer",
        createdAt: serverTimestamp(),
        status: "Available",
        unavailableDates: []
      });
      toast.success("Listed successfully!");
      setFormData({ name: "", type: "Rent", price: "", location: "", description: "" });
      setImage(null);
      setShowPostForm(false);
      fetchData();
    } catch (e) { toast.error(e.message); }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete listing?")) {
      await deleteDoc(doc(db, "equipment", id));
      toast.success("Listing deleted");
      fetchData();
    }
  };

  // --- Booking Flow ---
  const initiateBooking = (item) => {
    if (!user) return toast.error("Login required to book");
    if (item.ownerEmail === user.email) return toast.error("You cannot book your own item");
    setBookingItem(item);
    setBookingDates({ startDate: "", endDate: "" });
  };

  const confirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingItem || !bookingDates.startDate || !bookingDates.endDate) return;
    
    // Basic date validation
    if (new Date(bookingDates.startDate) > new Date(bookingDates.endDate)) {
        return toast.error("End date cannot be before start date");
    }
    if (new Date(bookingDates.startDate) < new Date().setHours(0,0,0,0)) {
        return toast.error("Cannot book dates in the past");
    }

    if (!checkAvailability(bookingItem, bookingDates.startDate, bookingDates.endDate)) {
      return toast.error("Dates unavailable.");
    }

    try {
      await addDoc(collection(db, "equipment_requests"), {
        equipmentId: bookingItem.id,
        equipmentName: bookingItem.name,
        equipmentImage: bookingItem.imageUrl,
        ownerEmail: bookingItem.ownerEmail,
        ownerName: bookingItem.ownerName,
        requesterEmail: user.email,
        requesterName: user.displayName || "Farmer",
        status: "Pending",
        type: bookingItem.type,
        startDate: bookingDates.startDate,
        endDate: bookingDates.endDate,
        timestamp: serverTimestamp()
      });
      toast.success("Request sent to owner!");
      setBookingItem(null);
      fetchData();
      setActiveTab("bookings");
    } catch (e) { toast.error(e.message); }
  };

  // --- Request Handling ---
  const handleRequestAction = async (req, action) => {
    try {
      if (action === "Approved") {
        const dates = getDatesInRange(req.startDate, req.endDate);
        await updateDoc(doc(db, "equipment", req.equipmentId), { unavailableDates: arrayUnion(...dates) });
      } else if (action === "Completed") {
        const dates = getDatesInRange(req.startDate, req.endDate);
        await updateDoc(doc(db, "equipment", req.equipmentId), { unavailableDates: arrayRemove(...dates) });
      } else if (action === "Rejected" && req.status === "Approved") {
         // If rejecting an already approved request (cancellation), free up dates
         const dates = getDatesInRange(req.startDate, req.endDate);
         await updateDoc(doc(db, "equipment", req.equipmentId), { unavailableDates: arrayRemove(...dates) });
      }
      
      await updateDoc(doc(db, "equipment_requests", req.id), { status: action });
      toast.success(`Request ${action}`);
      fetchData();
    } catch (e) { toast.error("Action failed"); }
  };

  // --- Manual Date Management ---
  const handleManualBlock = async () => {
    if (!blockDate || !managingItem) return;
    try {
      await updateDoc(doc(db, "equipment", managingItem.id), {
        unavailableDates: arrayUnion(blockDate)
      });
      toast.success("Date Blocked Manually");
      setManagingItem(prev => ({...prev, unavailableDates: [...(prev.unavailableDates || []), blockDate]}));
      setBlockDate("");
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleManualUnblock = async (dateStr) => {
    if (!managingItem) return;
    try {
      await updateDoc(doc(db, "equipment", managingItem.id), {
        unavailableDates: arrayRemove(dateStr)
      });
      toast.success("Date Freed Manually");
      setManagingItem(prev => ({...prev, unavailableDates: prev.unavailableDates.filter(d => d !== dateStr)}));
      fetchData();
    } catch (e) { console.error(e); }
  };

  // --- Reviews ---
  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewRequest) return;
    try {
      const isOwner = user.email === reviewRequest.ownerEmail;
      const targetEmail = isOwner ? reviewRequest.requesterEmail : reviewRequest.ownerEmail;
      await addDoc(collection(db, "reviews"), {
        requestId: reviewRequest.id,
        reviewerEmail: user.email,
        targetEmail: targetEmail,
        rating: reviewData.rating,
        comment: reviewData.comment,
        timestamp: serverTimestamp()
      });
      toast.success("Review submitted!");
      setReviewRequest(null);
      setReviewData({ rating: 5, comment: "" });
      fetchData();
    } catch (e) { toast.error("Failed to submit review"); }
  };

  // --- Chat Helper ---
  const openChat = (req) => {
     // If I am the owner, I chat with Requester. If I am requester, I chat with Owner.
     const otherPersonName = user.email === req.ownerEmail ? req.requesterName : req.ownerName;
     setActiveChat({ id: req.id, name: otherPersonName });
  };

  // --- UI Components ---
  const StatusBadge = ({ status }) => {
    const styles = {
      Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      Approved: "bg-green-100 text-green-700 border-green-200",
      Rejected: "bg-red-100 text-red-700 border-red-200",
      Completed: "bg-blue-100 text-blue-700 border-blue-200"
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${styles[status] || styles.Pending}`}>{status}</span>;
  };

  if (loading) return <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4"><Loader className="animate-spin text-orange-600 w-10 h-10"/><p className="text-gray-500 font-medium">Loading Marketplace...</p></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:p-8 bg-gray-50 min-h-[90vh]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
            <Tractor className="text-orange-600 w-7 h-7 sm:w-8 sm:h-8" /> Equipment Mandi
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">Buy, rent, and share farming tools.</p>
        </div>
        {activeTab === "store" && !showPostForm && (
          <button onClick={() => setShowPostForm(true)} className="w-full md:w-auto bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2">
            <Plus size={18}/> Post Listing
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex w-full md:w-auto mb-8 overflow-x-auto no-scrollbar snap-x">
        {[
          { id: "browse", icon: LayoutGrid, label: "Browse" },
          { id: "bookings", icon: ShoppingBag, label: "My Bookings", count: myBookings.length },
          { id: "store", icon: Store, label: "My Store", count: incomingRequests.filter(r => r.status === 'Pending').length }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowPostForm(false); }}
            className={`flex-1 md:flex-none px-4 sm:px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap snap-center ${
              activeTab === tab.id 
                ? "bg-slate-900 text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <tab.icon size={16} /> 
            {tab.label}
            {tab.count > 0 && <span className="ml-1 bg-white/20 px-1.5 rounded-full text-[10px] min-w-[1.2rem] flex items-center justify-center h-4">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* --- TAB 1: BROWSE MARKET --- */}
      {activeTab === "browse" && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="relative mb-6">
            <input 
              type="text" 
              placeholder="Search tractors, harvesters..." 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-4 text-gray-400" size={20}/>
          </div>

          {marketItems.length === 0 ? (
            <div className="text-center py-20">
               <Tractor className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
               <p className="text-gray-500">No equipment listed yet. Be the first!</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => {
               const rating = getOwnerRating(item.ownerEmail);
               return (
                <div key={item.id} className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                  <div className="h-52 relative overflow-hidden bg-gray-100">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Tractor size={64} strokeWidth={1} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"/>
                    <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md ${item.type === "Rent" ? "bg-blue-500/80" : "bg-emerald-500/80"}`}>
                      {item.type}
                    </span>
                    <div className="absolute bottom-4 left-4 text-white w-full pr-4">
                      <h3 className="font-bold text-lg leading-tight truncate">{item.name}</h3>
                      <p className="text-xs opacity-90 flex items-center gap-1"><MapPin size={12}/> {item.location}</p>
                    </div>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-1">
                        {rating ? (
                          <>
                            <Star size={14} className="text-yellow-400 fill-yellow-400"/>
                            <span className="text-sm font-bold text-slate-700">{rating.avg}</span>
                            <span className="text-xs text-gray-400">({rating.count})</span>
                          </>
                        ) : <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">New</span>}
                      </div>
                      <span className="text-xl font-black text-orange-600">₹{item.price}<span className="text-xs text-gray-400 font-normal">/{item.type === 'Rent' ? 'hr' : ''}</span></span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-6 line-clamp-2 flex-1">{item.description}</p>
                    
                    {adminOverride && (
                        <button onClick={() => handleDelete(item.id)} className="w-full mb-2 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50">Admin Delete</button>
                    )}

                    <button 
                      onClick={() => initiateBooking(item)}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-lg shadow-slate-200 active:scale-95 transform"
                    >
                      <HandCoins size={18} /> Request Now
                    </button>
                  </div>
                </div>
            )})}
          </div>
          )}
        </div>
      )}

      {/* --- TAB 2: MY BOOKINGS (Outgoing) --- */}
      {activeTab === "bookings" && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
          {myBookings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4"/>
              <h3 className="text-lg font-bold text-slate-700">No bookings yet</h3>
              <p className="text-gray-400 mb-6">Browse the market to rent equipment.</p>
              <button onClick={() => setActiveTab("browse")} className="text-orange-600 font-bold hover:underline">Start Browsing</button>
            </div>
          ) : (
            myBookings.map(req => {
              const hasReviewed = reviews.some(r => r.requestId === req.id);
              return (
                <div key={req.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5">
                  <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    {req.equipmentImage ? <img src={req.equipmentImage} className="w-full h-full object-cover" /> : <Tractor className="text-gray-300" size={40}/>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-lg text-slate-800">{req.equipmentName}</h4>
                        <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="flex items-center gap-1"><User size={14}/> {req.ownerName}</span>
                          <span className="flex items-center gap-1"><Calendar size={14}/> {req.startDate} to {req.endDate}</span>
                        </div>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3">
                      {req.status === "Approved" && (
                        <button onClick={() => openChat(req)} className="flex-1 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 flex items-center justify-center gap-2 transition">
                          <MessageSquare size={16}/> Chat Owner
                        </button>
                      )}
                      {req.status === "Completed" && !hasReviewed && (
                        <button onClick={() => setReviewRequest(req)} className="flex-1 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-50 flex items-center justify-center gap-2 transition">
                          <Star size={16}/> Rate Service
                        </button>
                      )}
                      {req.status === "Completed" && hasReviewed && (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full"><CheckCircle size={14}/> Reviewed</span>
                      )}
                      {req.status === "Pending" && <span className="text-xs text-gray-400 italic self-center flex items-center gap-1"><Loader size={12} className="animate-spin"/> Waiting for approval...</span>}
                      {req.status === "Rejected" && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12}/> Request Declined</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* --- TAB 3: MY STORE (Listings + Incoming) --- */}
      {activeTab === "store" && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          
          {showPostForm ? (
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 relative">
              <button onClick={() => setShowPostForm(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><XCircle/></button>
              <h2 className="text-2xl font-bold mb-6 text-slate-800">Add New Equipment</h2>
              <form onSubmit={handlePostItem} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Name</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-orange-500" placeholder="e.g. Rotavator"/></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Type</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-3 border rounded-xl bg-white"><option>Rent</option><option>Sale</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Price (₹)</label><input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-orange-500" placeholder="0.00"/></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Location</label><input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-orange-500" placeholder="City/District"/></div>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Description</label><textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border rounded-xl h-24 outline-none focus:border-orange-500" placeholder="Details about condition, specs..."/></div>
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 bg-gray-50 transition">
                  {image ? <span className="text-green-600 font-bold">{image.name}</span> : <span className="text-gray-400 flex flex-col items-center gap-2"><ImageIcon/> Upload Photo (Optional)</span>}
                  <input type="file" className="hidden" onChange={(e) => setImage(e.target.files[0])} />
                </label>
                <button disabled={uploading} className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 shadow-lg">{uploading ? "Publishing..." : "Publish Listing"}</button>
              </form>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Col: Incoming Requests */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><MessageSquare className="text-orange-600"/> Incoming Orders</h3>
                {incomingRequests.length === 0 && <p className="text-gray-400 italic bg-white p-4 rounded-xl border border-dashed text-center">No orders received yet.</p>}
                {incomingRequests.map(req => (
                  <div key={req.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
                    {/* ✅ FALLBACK IMAGE */}
                    {req.equipmentImage ? (
                        <img src={req.equipmentImage} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400"><Tractor size={24}/></div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-bold text-slate-800">{req.equipmentName}</h4>
                        <StatusBadge status={req.status}/>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Requester: <span className="font-medium text-slate-700">{req.requesterName}</span></p>
                      <p className="text-xs text-gray-400 mt-0.5"><Calendar size={10} className="inline mr-1"/>{req.startDate} - {req.endDate}</p>
                      
                      <div className="mt-4 flex gap-2">
                        {req.status === "Pending" && (
                          <>
                            <button onClick={() => handleRequestAction(req, "Approved")} className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-green-700 transition">Approve</button>
                            <button onClick={() => handleRequestAction(req, "Rejected")} className="flex-1 bg-white border border-red-200 text-red-600 py-1.5 rounded-lg text-sm font-bold hover:bg-red-50 transition">Decline</button>
                          </>
                        )}
                        {req.status === "Approved" && (
                          <>
                            <button onClick={() => openChat(req)} className="flex-1 bg-blue-50 text-blue-700 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-100 transition">Chat</button>
                            <button onClick={() => handleRequestAction(req, "Completed")} className="flex-1 bg-slate-800 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-slate-900 transition">Mark Done</button>
                          </>
                        )}
                        {req.status === "Completed" && (
                             <span className="flex-1 bg-gray-50 text-gray-500 py-1.5 rounded-lg text-xs font-bold text-center">Completed</span>
                        )}
                        {req.status === "Rejected" && (
                             <span className="flex-1 bg-red-50 text-red-400 py-1.5 rounded-lg text-xs font-bold text-center">Rejected</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Col: Inventory */}
              <div>
                <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2"><Tractor className="text-orange-600"/> My Inventory</h3>
                <div className="space-y-4">
                  {myItems.map(item => (
                    <div key={item.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 group hover:shadow-md transition">
                      {/* ✅ FALLBACK IMAGE */}
                      {item.imageUrl ? (
                          <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400"><Tractor size={20}/></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
                        <p className="text-xs text-orange-600 font-bold">₹{item.price}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setManagingItem(item)} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-200 text-gray-600 transition" title="Manage Availability"><CalendarCheck size={16}/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 rounded-lg hover:bg-red-100 text-red-600 transition" title="Delete"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {myItems.length === 0 && <p className="text-gray-400 text-sm italic">No items listed. Start selling/renting!</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS (Z-INDEX 50) --- */}
      
      {/* Booking Modal */}
      {bookingItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setBookingItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle/></button>
            <h3 className="text-2xl font-bold mb-1 text-slate-900">Book Equipment</h3>
            <p className="text-gray-500 mb-6 text-sm">Select dates for <span className="font-bold text-orange-600">{bookingItem.name}</span></p>
            <form onSubmit={confirmBooking} className="space-y-4">
              <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Start Date</label><input type="date" required className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-orange-200 outline-none" onChange={e => setBookingDates({...bookingDates, startDate: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">End Date</label><input type="date" required className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-orange-200 outline-none" onChange={e => setBookingDates({...bookingDates, endDate: e.target.value})} /></div>
              <button className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg mt-2 flex justify-center gap-2"><HandCoins size={18}/> Confirm Booking</button>
            </form>
          </div>
        </div>
      )}

      {/* Management Modal */}
      {managingItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setManagingItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle/></button>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><CalendarCheck className="text-orange-600"/> Manage Availability</h3>
            <p className="text-sm text-gray-500 mb-4">Manually block dates for <b>{managingItem.name}</b></p>
            <div className="flex gap-2 mb-4">
               <input type="date" className="flex-1 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={e => setBlockDate(e.target.value)} value={blockDate} />
               <button onClick={handleManualBlock} className="bg-red-500 text-white px-4 rounded-xl font-bold text-sm hover:bg-red-600 transition">Block</button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
               <h4 className="text-xs font-bold text-gray-400 uppercase">Blocked Dates</h4>
               {managingItem.unavailableDates?.length === 0 && <p className="text-xs text-gray-400 italic">No dates blocked.</p>}
               {managingItem.unavailableDates?.map(d => (
                 <div key={d} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm border border-gray-100">
                     <span>{d}</span>
                     <button className="text-red-500 hover:bg-red-50 p-1 rounded transition" onClick={() => handleManualUnblock(d)}><Trash2 size={14}/></button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewRequest && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-bold mb-2 text-slate-800">Rate Experience</h3>
            <p className="text-gray-500 text-sm mb-6">How was your deal with {reviewRequest.ownerName}?</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setReviewData({...reviewData, rating: s})} className="transition hover:scale-110"><Star size={32} className={s <= reviewData.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}/></button>)}
            </div>
            <textarea placeholder="Write a comment..." className="w-full p-3 border rounded-xl h-24 mb-4 outline-none focus:ring-2 focus:ring-orange-200 resize-none" onChange={e => setReviewData({...reviewData, comment: e.target.value})}></textarea>
            <button onClick={submitReview} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition">Submit Review</button>
            <button onClick={() => setReviewRequest(null)} className="mt-4 text-gray-400 text-sm hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {activeChat && (
        <EquipmentChat 
          chatId={activeChat.id} // Pass Request ID as Chat ID
          receiverName={activeChat.name}
          currentUserEmail={user.email}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
};

export default EquipmentMarketplace;