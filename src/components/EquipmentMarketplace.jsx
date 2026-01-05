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
  Star, Calendar, User, Store, ShoppingBag, LayoutGrid, AlertCircle,
  ShieldCheck, Sparkles, Filter, Clock, ChevronRight, History, TrendingUp
} from "lucide-react";
import EquipmentChat from "./EquipmentChat";
import toast from "react-hot-toast";
import { formatTime } from "../utils/formatTime"; 

const EquipmentMarketplace = ({ adminOverride = false }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("browse");
  
  // Data Buckets
  const [marketItems, setMarketItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [myBookings, setMyBookings] = useState([]); 
  const [incomingRequests, setIncomingRequests] = useState([]); 
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
        const q1 = query(collection(db, "equipment_requests"), where("ownerEmail", "==", user.email));
        const q2 = query(collection(db, "equipment_requests"), where("requesterEmail", "==", user.email));
        const [receivedSnap, sentSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const received = receivedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sent = sentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Sort: Pending first, then by date (descending for history)
        const sortFn = (a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return b.timestamp?.seconds - a.timestamp?.seconds;
        };
        setIncomingRequests(received.sort(sortFn));
        setMyBookings(sent.sort(sortFn));
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

  // --- Reset Search on Tab Change ---
  useEffect(() => { setSearchQuery(""); }, [activeTab]);

  // --- Helpers ---
  
  // Calculates average rating for a SPECIFIC ITEM based on Owner performance
  const getItemRating = (itemId, ownerEmail) => {
    const itemReviews = reviews.filter(r => r.equipmentId === itemId && r.targetEmail === ownerEmail);
    if (itemReviews.length === 0) return null;
    const avg = itemReviews.reduce((acc, curr) => acc + curr.rating, 0) / itemReviews.length;
    return { avg: avg.toFixed(1), count: itemReviews.length };
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
    
    if (new Date(bookingDates.startDate) > new Date(bookingDates.endDate)) {
        return toast.error("End date cannot be before start date");
    }
    if (new Date(bookingDates.startDate) < new Date().setHours(0,0,0,0)) {
        return toast.error("Cannot book dates in the past");
    }

    if (!checkAvailability(bookingItem, bookingDates.startDate, bookingDates.endDate)) {
      return toast.error("These dates are already booked.");
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

  // --- Request & Calendar Auto-Management ---
  const handleRequestAction = async (req, action) => {
    try {
      if (action === "Approved") {
        const dates = getDatesInRange(req.startDate, req.endDate);
        await updateDoc(doc(db, "equipment", req.equipmentId), { unavailableDates: arrayUnion(...dates) });
      } else if (action === "Completed") {
        const dates = getDatesInRange(req.startDate, req.endDate);
        await updateDoc(doc(db, "equipment", req.equipmentId), { unavailableDates: arrayRemove(...dates) });
      } else if (action === "Rejected" && req.status === "Approved") {
         const dates = getDatesInRange(req.startDate, req.endDate);
         await updateDoc(doc(db, "equipment", req.equipmentId), { unavailableDates: arrayRemove(...dates) });
      }
      
      await updateDoc(doc(db, "equipment_requests", req.id), { status: action });
      toast.success(`Request ${action}`);
      fetchData();
    } catch (e) { toast.error("Action failed"); }
  };

  const handleManualBlock = async () => {
    if (!blockDate || !managingItem) return;
    try {
      await updateDoc(doc(db, "equipment", managingItem.id), { unavailableDates: arrayUnion(blockDate) });
      toast.success("Date Blocked");
      setManagingItem(prev => ({...prev, unavailableDates: [...(prev.unavailableDates || []), blockDate]}));
      setBlockDate("");
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleManualUnblock = async (dateStr) => {
    if (!managingItem) return;
    try {
      await updateDoc(doc(db, "equipment", managingItem.id), { unavailableDates: arrayRemove(dateStr) });
      toast.success("Date Unblocked");
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
        equipmentId: reviewRequest.equipmentId || null, // Ensure equipmentId is saved if available
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

  // --- Chat ---
  const openChat = (req) => {
     const otherPersonName = user.email === req.ownerEmail ? req.requesterName : req.ownerName;
     setActiveChat({ id: req.id, name: otherPersonName });
  };

  // --- UI Components ---
  const StatusBadge = ({ status }) => {
    const styles = {
      Pending: "bg-amber-50 text-amber-600 ring-1 ring-amber-200 shadow-sm",
      Approved: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 shadow-sm",
      Rejected: "bg-rose-50 text-rose-600 ring-1 ring-rose-200 shadow-sm",
      Completed: "bg-blue-50 text-blue-600 ring-1 ring-blue-200 shadow-sm"
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${styles[status] || styles.Pending}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'Pending' ? 'bg-amber-500 animate-pulse' : status === 'Approved' ? 'bg-emerald-500' : status === 'Completed' ? 'bg-blue-500' : 'bg-rose-500'}`}></span>
        {status}
      </span>
    );
  };

  if (loading) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur-sm">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            <Tractor className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-600" size={24}/>
        </div>
        <p className="text-slate-500 font-medium mt-4 animate-pulse">Loading Marketplace...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:p-8 bg-gray-50/30 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
        <div className="w-full md:w-auto text-center md:text-left">
          <h1 className="text-4xl font-black text-slate-900 flex items-center justify-center md:justify-start gap-3 tracking-tight">
            <span className="bg-gradient-to-br from-orange-100 to-orange-50 p-3 rounded-2xl shadow-sm border border-orange-100">
                <Tractor className="text-orange-600 w-8 h-8" />
            </span>
            Equipment Mandi
          </h1>
          <p className="text-gray-500 font-medium mt-2 ml-1 flex items-center justify-center md:justify-start gap-2">
            <Sparkles size={16} className="text-orange-400"/> Buy, rent, and share farming tools directly.
          </p>
        </div>
        
        {activeTab === "store" && !showPostForm && (
          <button 
            onClick={() => setShowPostForm(true)} 
            className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-orange-200 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300"/> Post Listing
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="bg-white/80 backdrop-blur-xl p-2 rounded-3xl shadow-sm border border-white/50 flex w-full md:w-fit mb-10 mx-auto md:mx-0 overflow-x-auto no-scrollbar snap-x sticky top-20 z-30 ring-1 ring-gray-100">
        {[
          { id: "browse", icon: LayoutGrid, label: "Marketplace" },
          { id: "bookings", icon: ShoppingBag, label: "My Bookings", count: myBookings.length },
          { id: "store", icon: Store, label: "My Store", count: incomingRequests.filter(r => r.status === 'Pending').length }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowPostForm(false); }}
            className={`flex-1 md:flex-none px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap snap-center relative ${
              activeTab === tab.id 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200 scale-105" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? "text-orange-400" : ""} /> {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* --- TAB 1: BROWSE MARKET --- */}
      {activeTab === "browse" && (
        <div className="animate-in slide-in-from-bottom-8 duration-700 ease-out">
          <div className="relative mb-10 group max-w-2xl mx-auto md:mx-0">
            <input 
              type="text" 
              placeholder="Search tractors, harvesters, seeders..." 
              className="w-full pl-14 pr-4 py-5 rounded-[20px] border-none bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-100 focus:ring-4 focus:ring-orange-100 outline-none transition-all placeholder:text-gray-400 text-lg"
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
            />
            <Search className="absolute left-5 top-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={24}/>
          </div>

          {marketItems.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-[2rem] border border-dashed border-gray-200 shadow-sm">
               <div className="bg-orange-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Tractor className="w-10 h-10 text-orange-400"/>
               </div>
               <h3 className="text-2xl font-bold text-slate-900">Market is Empty</h3>
               <p className="text-gray-500 mt-2">No equipment listed yet. Be the first to earn!</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
            {marketItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => {
               const rating = getItemRating(item.id, item.ownerEmail);
               return (
                <div key={item.id} className="group bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-orange-100/50 transition-all duration-500 flex flex-col h-full hover:-translate-y-2 ring-1 ring-gray-50">
                  
                  {/* Card Image Area */}
                  <div className="h-64 relative overflow-hidden bg-gray-100">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-slate-50">
                            <Tractor size={64} strokeWidth={1} />
                        </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-90"/>
                    
                    <span className={`absolute top-5 left-5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20 shadow-lg ${item.type === "Rent" ? "bg-blue-600/90" : "bg-emerald-600/90"}`}>
                      {item.type}
                    </span>

                    <div className="absolute top-5 right-5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10 shadow-lg">
                        <Clock size={12} className="text-orange-400" /> {formatTime(item.createdAt)}
                    </div>

                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <div className="flex justify-between items-end mb-1">
                          <h3 className="font-bold text-2xl leading-tight truncate drop-shadow-sm max-w-[70%]">{item.name}</h3>
                          {rating && (
                            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                <Star size={12} className="fill-orange-400 text-orange-400"/>
                                <span className="font-bold text-sm">
                                    {rating.avg} <span className="text-[10px] opacity-75 font-normal ml-0.5">({rating.count})</span>
                                </span>
                            </div>
                          )}
                      </div>
                      <p className="text-sm opacity-90 flex items-center gap-1.5 text-slate-200 font-medium">
                        <MapPin size={14} className="text-orange-400"/> {item.location}
                      </p>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex justify-between items-end mb-5 pb-5 border-b border-gray-50">
                      <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Price</p>
                          <span className="text-3xl font-black text-slate-900">₹{item.price}<span className="text-sm text-gray-400 font-bold ml-1">/{item.type === 'Rent' ? 'hr' : ''}</span></span>
                      </div>
                      <div className="flex flex-col items-end">
                          <span className="text-xs font-medium text-gray-500 mb-1">Listed by</span>
                          <span className="text-sm font-bold text-slate-800 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                             <User size={12} className="text-orange-500"/> {item.ownerName}
                          </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-6 line-clamp-2 flex-1 leading-relaxed">{item.description}</p>
                    
                    {adminOverride && (
                        <button onClick={() => handleDelete(item.id)} className="w-full mb-3 py-3 border-2 border-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition">Admin Delete</button>
                    )}

                    <button 
                      onClick={() => initiateBooking(item)}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-xl shadow-slate-200 active:scale-95 group-hover:shadow-orange-200/50"
                    >
                      <HandCoins size={18} /> Request Item
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
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto pb-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingBag className="text-orange-500"/> My Rented Items
              </h2>
              {/* ✅ Search for Bookings */}
              <div className="relative w-full md:w-72">
                  <input 
                    type="text" 
                    placeholder="Search bookings..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    value={searchQuery}
                  />
                  <Search className="absolute left-3 top-3 text-gray-400" size={16}/>
              </div>
          </div>
          
          {myBookings.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[2rem] border border-dashed border-gray-200">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4"/>
              <h3 className="text-xl font-bold text-slate-700">No bookings yet</h3>
              <p className="text-gray-400 mb-6">Browse the market to rent equipment.</p>
              <button onClick={() => setActiveTab("browse")} className="text-orange-600 font-bold hover:underline">Start Browsing</button>
            </div>
          ) : (
            myBookings
            .filter(req => req.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(req => {
              const hasReviewed = reviews.some(r => r.requestId === req.id && r.reviewerEmail === user.email);
              return (
                <div key={req.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row gap-6 group hover:-translate-y-1">
                  <div className="w-full md:w-40 h-40 bg-gray-100 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center relative">
                    {req.equipmentImage ? <img src={req.equipmentImage} className="w-full h-full object-cover" /> : <Tractor className="text-gray-300" size={48}/>}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg">
                        {req.type}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                      <div>
                        <h4 className="font-bold text-xl text-slate-900 mb-1">{req.equipmentName}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                           <User size={14}/> Owner: <span className="font-semibold text-slate-700">{req.ownerName}</span>
                        </p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>

                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-wrap gap-4 text-sm text-gray-600 mb-5">
                        <span className="flex items-center gap-2"><Calendar size={14} className="text-orange-500"/> <b>Start:</b> {req.startDate}</span>
                        <span className="flex items-center gap-2"><CalendarCheck size={14} className="text-orange-500"/> <b>End:</b> {req.endDate}</span>
                        <span className="flex items-center gap-2 ml-auto text-xs text-gray-400"><Clock size={12}/> Requested {formatTime(req.timestamp)}</span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {req.status === "Approved" && (
                        <button onClick={() => openChat(req)} className="flex-1 bg-blue-50 text-blue-700 px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-100 flex items-center justify-center gap-2 transition">
                          <MessageSquare size={16}/> Chat Owner
                        </button>
                      )}
                      {req.status === "Completed" && !hasReviewed && (
                        <button onClick={() => setReviewRequest(req)} className="flex-1 border-2 border-yellow-100 text-yellow-700 bg-yellow-50 px-6 py-3 rounded-xl text-sm font-bold hover:bg-yellow-100 flex items-center justify-center gap-2 transition">
                          <Star size={16}/> Rate Item
                        </button>
                      )}
                      {req.status === "Completed" && hasReviewed && (
                        <span className="flex-1 text-xs font-bold text-green-600 flex items-center justify-center gap-1 bg-green-50 px-4 py-3 rounded-xl border border-green-100"><CheckCircle size={14}/> Review Submitted</span>
                      )}
                      {req.status === "Pending" && <span className="w-full text-center text-sm text-gray-400 italic py-3 bg-gray-50 rounded-xl">Waiting for owner approval...</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* --- TAB 3: MY STORE DASHBOARD --- */}
      {activeTab === "store" && (
        <div className="animate-in slide-in-from-bottom-8 duration-700 pb-20">
          
          {showPostForm ? (
            <div className="max-w-2xl mx-auto bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 relative animate-in zoom-in-95">
              <button onClick={() => setShowPostForm(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition"><XCircle/></button>
              <h2 className="text-3xl font-black mb-8 text-slate-900 flex items-center gap-3"><Plus className="text-orange-500 bg-orange-100 p-1 rounded-lg"/> List New Item</h2>
              <form onSubmit={handlePostItem} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Name</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition bg-gray-50/50 focus:bg-white" placeholder="e.g. Rotavator"/></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Type</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-4 border border-gray-200 rounded-2xl bg-gray-50/50 focus:bg-white focus:border-orange-500 outline-none transition"><option>Rent</option><option>Sale</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price (₹)</label><input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition bg-gray-50/50 focus:bg-white" placeholder="0.00"/></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Location</label><input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition bg-gray-50/50 focus:bg-white" placeholder="City/District"/></div>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Description</label><textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 border border-gray-200 rounded-2xl h-32 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition resize-none bg-gray-50/50 focus:bg-white" placeholder="Condition, features, age..."/></div>
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-500 bg-gray-50 hover:bg-orange-50 transition duration-300">
                  {image ? <span className="text-green-600 font-bold flex items-center justify-center gap-2"><CheckCircle size={20}/> {image.name}</span> : <span className="text-gray-400 flex flex-col items-center gap-2"><ImageIcon size={40} className="text-gray-300"/> <span className="font-medium">Click to Upload Photo</span></span>}
                  <input type="file" className="hidden" onChange={(e) => setImage(e.target.files[0])} />
                </label>
                <button disabled={uploading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-slate-800 shadow-xl transition-all text-lg">{uploading ? "Publishing..." : "Publish Listing"}</button>
              </form>
            </div>
          ) : (
            <>
            <div className="mb-8 flex justify-end">
                {/* ✅ Search Input for Store */}
                <div className="relative w-full md:w-72">
                    <input 
                        type="text" 
                        placeholder="Search requests or inventory..." 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm bg-white"
                        onChange={(e) => setSearchQuery(e.target.value)}
                        value={searchQuery}
                    />
                    <Search className="absolute left-3 top-3.5 text-gray-400" size={16}/>
                </div>
            </div>

            <div className="grid xl:grid-cols-3 gap-8">
              
              {/* --- Left Col: Order Management (History) --- */}
              <div className="xl:col-span-2 space-y-8">
                
                {/* 1. Action Required */}
                <div>
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                        <span className="bg-red-100 text-red-600 p-1.5 rounded-lg"><AlertCircle size={18}/></span> 
                        Action Required
                    </h3>
                    <div className="space-y-4">
                        {incomingRequests.filter(r => r.status === 'Pending' && (r.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.requesterName.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && (
                            <p className="text-gray-400 italic bg-white p-6 rounded-2xl border border-dashed text-center text-sm">No new requests pending.</p>
                        )}
                        {incomingRequests
                        .filter(r => r.status === 'Pending' && (r.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.requesterName.toLowerCase().includes(searchQuery.toLowerCase())))
                        .map(req => (
                            <div key={req.id} className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col sm:flex-row gap-4 ring-1 ring-red-50">
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-slate-900">{req.equipmentName}</h4>
                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Pending</span>
                                    </div>
                                    <p className="text-sm text-gray-500">From: <span className="font-bold text-slate-800">{req.requesterName}</span></p>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Clock size={10}/> {formatTime(req.timestamp)}</p>
                                    <div className="mt-4 flex gap-2">
                                        <button onClick={() => handleRequestAction(req, "Approved")} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition">Approve</button>
                                        <button onClick={() => handleRequestAction(req, "Rejected")} className="flex-1 bg-white border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 transition">Decline</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Active Orders */}
                <div>
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                        <span className="bg-green-100 text-green-600 p-1.5 rounded-lg"><TrendingUp size={18}/></span> 
                        Active Rentals
                    </h3>
                    <div className="space-y-4">
                        {incomingRequests.filter(r => r.status === 'Approved' && (r.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.requesterName.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && (
                            <p className="text-gray-400 italic bg-white p-6 rounded-2xl border border-dashed text-center text-sm">No active rentals currently.</p>
                        )}
                        {incomingRequests
                        .filter(r => r.status === 'Approved' && (r.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.requesterName.toLowerCase().includes(searchQuery.toLowerCase())))
                        .map(req => (
                            <div key={req.id} className="bg-white p-5 rounded-2xl border border-green-100 shadow-sm flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-slate-900">{req.equipmentName}</h4>
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Active</span>
                                    </div>
                                    <p className="text-sm text-gray-500">Renter: <span className="font-bold text-slate-800">{req.requesterName}</span></p>
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => openChat(req)} className="flex-1 bg-blue-50 text-blue-700 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1"><MessageSquare size={14}/> Chat</button>
                                        <button onClick={() => handleRequestAction(req, "Completed")} className="flex-1 bg-slate-800 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-slate-900 transition flex items-center justify-center gap-1 shadow-lg"><CheckCircle size={14}/> Complete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Order History */}
                <div>
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-4">
                        <span className="bg-gray-100 text-gray-600 p-1.5 rounded-lg"><History size={18}/></span> 
                        Booking History
                    </h3>
                    <div className="space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                        {incomingRequests.filter(r => ['Completed', 'Rejected'].includes(r.status) && (r.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.requesterName.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && (
                            <p className="text-gray-400 italic bg-white p-6 rounded-2xl border border-dashed text-center text-sm">No history available.</p>
                        )}
                        {incomingRequests
                        .filter(r => ['Completed', 'Rejected'].includes(r.status) && (r.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.requesterName.toLowerCase().includes(searchQuery.toLowerCase())))
                        .map(req => (
                            <div key={req.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-700 text-sm">{req.equipmentName}</h4>
                                    <p className="text-xs text-gray-400">Renter: {req.requesterName} • {formatTime(req.timestamp)}</p>
                                </div>
                                <StatusBadge status={req.status}/>
                            </div>
                        ))}
                    </div>
                </div>

              </div>

              {/* --- Right Col: My Listings Inventory --- */}
              <div>
                <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><Store size={18}/></span>
                    My Inventory
                </h3>
                <div className="space-y-4 sticky top-32">
                  {myItems
                  .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => {
                    const myItemRating = getItemRating(item.id, item.ownerEmail);
                    return (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-lg transition">
                      {item.imageUrl ? (
                          <img src={item.imageUrl} className="w-16 h-16 rounded-xl object-cover bg-gray-50 border border-gray-100" />
                      ) : (
                          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400"><Tractor size={24}/></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded">₹{item.price}</p>
                            {myItemRating && (
                                <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 rounded-md flex items-center gap-0.5 font-bold border border-yellow-100">
                                    <Star size={8} className="fill-yellow-600"/> {myItemRating.avg} ({myItemRating.count})
                                </span>
                            )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => setManagingItem(item)} className="p-2 bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition" title="Calendar"><CalendarCheck size={16}/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-gray-50 rounded-xl hover:bg-red-50 hover:text-red-600 transition" title="Delete"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  )})}
                  {myItems.length === 0 && <p className="text-gray-400 text-sm italic bg-gray-50 p-6 rounded-2xl text-center border border-dashed">You haven't listed any items yet.</p>}
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* --- MODALS --- */}
      
      {/* Booking Modal */}
      {bookingItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full relative shadow-2xl animate-in zoom-in-95 ring-1 ring-white/20">
            <button onClick={() => setBookingItem(null)} className="absolute top-6 right-6 text-gray-400 hover:text-slate-800 transition"><XCircle size={24}/></button>
            <h3 className="text-2xl font-black mb-2 text-slate-900">Book Equipment</h3>
            <p className="text-gray-500 mb-8 text-sm">Select dates for <span className="font-bold text-orange-600">{bookingItem.name}</span></p>
            <form onSubmit={confirmBooking} className="space-y-6">
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Start Date</label><input type="date" required className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 focus:ring-4 focus:ring-orange-100 outline-none transition" onChange={e => setBookingDates({...bookingDates, startDate: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-wide">End Date</label><input type="date" required className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 focus:ring-4 focus:ring-orange-100 outline-none transition" onChange={e => setBookingDates({...bookingDates, endDate: e.target.value})} /></div>
              <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition shadow-xl mt-4 flex justify-center gap-2"><HandCoins size={20}/> Confirm Request</button>
            </form>
          </div>
        </div>
      )}

      {/* Management Modal */}
      {managingItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full relative shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setManagingItem(null)} className="absolute top-6 right-6 text-gray-400 hover:text-slate-800"><XCircle size={24}/></button>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><CalendarCheck className="text-orange-600"/> Availability Manager</h3>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
                <p className="text-sm text-orange-800 font-medium">Manually block dates for <b>{managingItem.name}</b></p>
            </div>
            
            <div className="flex gap-3 mb-6">
               <input type="date" className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200 text-sm" onChange={e => setBlockDate(e.target.value)} value={blockDate} />
               <button onClick={handleManualBlock} className="bg-slate-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg">Block</button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar bg-gray-50 p-4 rounded-xl border border-gray-100">
               <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1"><XCircle size={12}/> Currently Blocked</h4>
               {managingItem.unavailableDates?.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No dates blocked.</p>}
               {managingItem.unavailableDates?.map(d => (
                 <div key={d} className="flex justify-between items-center p-3 bg-white rounded-lg text-sm border border-gray-100 shadow-sm">
                     <span className="font-bold text-slate-600">{d}</span>
                     <button className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition" onClick={() => handleManualUnblock(d)}><Trash2 size={14}/></button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewRequest && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full relative text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="text-yellow-500 fill-yellow-500" size={32}/>
            </div>
            <h3 className="text-2xl font-black mb-2 text-slate-800">Rate Experience</h3>
            <p className="text-gray-500 text-sm mb-8">How was your deal with <span className="font-bold text-slate-900">{reviewRequest.equipmentName}</span>?</p>
            
            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setReviewData({...reviewData, rating: s})} className="transition hover:scale-110 focus:outline-none"><Star size={36} className={s <= reviewData.rating ? "text-yellow-400 fill-yellow-400 drop-shadow-md" : "text-gray-200"}/></button>)}
            </div>
            
            <textarea placeholder="Write a brief comment..." className="w-full p-4 border border-gray-200 rounded-2xl h-28 mb-6 outline-none focus:ring-4 focus:ring-yellow-100 resize-none transition bg-gray-50 focus:bg-white text-sm" onChange={e => setReviewData({...reviewData, comment: e.target.value})}></textarea>
            
            <div className="flex flex-col gap-3">
                <button onClick={submitReview} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition shadow-xl">Submit Review</button>
                <button onClick={() => setReviewRequest(null)} className="text-gray-400 text-sm hover:text-slate-800 font-bold py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {activeChat && (
        <EquipmentChat 
          chatId={activeChat.id} 
          receiverName={activeChat.name}
          currentUserEmail={user.email}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
};

export default EquipmentMarketplace;