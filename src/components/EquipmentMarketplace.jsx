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
  ShieldCheck, Sparkles, Filter
} from "lucide-react";
import EquipmentChat from "./EquipmentChat";
import toast from "react-hot-toast";

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

        // Sort: Pending first, then by date
        const sortFn = (a, b) => (a.status === 'Pending' ? -1 : 1);
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

  // --- Helpers ---
  
  // ✅ UPDATED LOGIC: Calculates average rating for a SPECIFIC ITEM ID
  // It filters reviews where 'equipmentId' matches AND 'targetEmail' is the owner.
  // This ensures that if an owner rates a renter, it doesn't affect the item's score.
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
      // Determine target: If I am Owner, I rate Requester. If I am Requester, I rate Owner.
      const isOwner = user.email === reviewRequest.ownerEmail;
      const targetEmail = isOwner ? reviewRequest.requesterEmail : reviewRequest.ownerEmail;
      
      await addDoc(collection(db, "reviews"), {
        requestId: reviewRequest.id,
        equipmentId: reviewRequest.equipmentId, // ✅ Save Item ID to link rating to the specific item
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
      Pending: "bg-amber-100 text-amber-700 border-amber-200",
      Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      Rejected: "bg-rose-100 text-rose-700 border-rose-200",
      Completed: "bg-blue-100 text-blue-700 border-blue-200"
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${styles[status] || styles.Pending}`}>{status}</span>;
  };

  if (loading) return <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-gray-50"><div className="relative"><div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div><Tractor className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-600" size={20}/></div><p className="text-gray-500 font-medium animate-pulse">Loading Marketplace...</p></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:p-8 bg-gray-50 min-h-[95vh]">
      
      {/* Header with Search and CTA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="w-full md:w-auto">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <span className="bg-orange-100 p-2 rounded-xl"><Tractor className="text-orange-600 w-8 h-8" /></span>
            Equipment Mandi
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-1">Buy, rent, and share farming tools directly from farmers.</p>
        </div>
        
        {activeTab === "store" && !showPostForm && (
          <button onClick={() => setShowPostForm(true)} className="w-full md:w-auto bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5">
            <Plus size={20}/> Post Listing
          </button>
        )}
      </div>

      {/* Modern Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 flex w-full md:w-auto mb-8 overflow-x-auto no-scrollbar snap-x sticky top-20 z-30">
        {[
          { id: "browse", icon: LayoutGrid, label: "Market" },
          { id: "bookings", icon: ShoppingBag, label: "My Bookings", count: myBookings.length },
          { id: "store", icon: Store, label: "My Store", count: incomingRequests.filter(r => r.status === 'Pending').length }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowPostForm(false); }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap snap-center relative ${
              activeTab === tab.id 
                ? "bg-slate-900 text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <tab.icon size={16} /> {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* --- TAB 1: BROWSE MARKET --- */}
      {activeTab === "browse" && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="relative mb-8 group">
            <input 
              type="text" 
              placeholder="Search tractors, harvesters, seeders..." 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-orange-100 focus:border-orange-400 outline-none shadow-sm transition-all bg-white"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20}/>
            <div className="absolute right-4 top-3 bg-gray-100 p-1.5 rounded-lg text-gray-400 hidden sm:block"><Filter size={16}/></div>
          </div>

          {marketItems.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
               <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Tractor className="w-10 h-10 text-orange-400"/>
               </div>
               <h3 className="text-xl font-bold text-slate-800">Market is Empty</h3>
               <p className="text-gray-500 mt-2">No equipment listed yet. Be the first to earn!</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {marketItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => {
               // ✅ Calculate rating for THIS SPECIFIC ITEM
               const rating = getItemRating(item.id, item.ownerEmail);
               return (
                <div key={item.id} className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
                  
                  {/* Card Image Area */}
                  <div className="h-56 relative overflow-hidden bg-gray-100">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-slate-50">
                            <Tractor size={64} strokeWidth={1} />
                        </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80"/>
                    
                    {/* Badge */}
                    <span className={`absolute top-4 left-4 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20 shadow-lg ${item.type === "Rent" ? "bg-blue-600/90" : "bg-emerald-600/90"}`}>
                      {item.type}
                    </span>

                    {/* Owner Info Overlay */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="text-xs text-white font-medium truncate max-w-[100px]">{item.ownerName}</span>
                    </div>

                    {/* Item Rating (Bottom Right) */}
                    {rating && (
                        <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white text-slate-900 px-2 py-1 rounded-lg text-xs font-bold shadow-lg">
                            <Star size={10} className="fill-orange-500 text-orange-500"/> {rating.avg} <span className="text-gray-400 font-normal">({rating.count})</span>
                        </div>
                    )}

                    <div className="absolute bottom-4 left-4 text-white w-full pr-4">
                      <h3 className="font-bold text-xl leading-tight truncate drop-shadow-md">{item.name}</h3>
                      <p className="text-xs opacity-90 flex items-center gap-1 mt-1 text-slate-200"><MapPin size={12}/> {item.location}</p>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">Pricing</p>
                          <span className="text-2xl font-black text-slate-800">₹{item.price}<span className="text-sm text-gray-400 font-medium">/{item.type === 'Rent' ? 'hr' : ''}</span></span>
                      </div>
                      <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${rating ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'}`}>
                             {rating ? <><ShieldCheck size={12}/> Rated Item</> : <><Sparkles size={12}/> New Listing</>}
                          </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-6 line-clamp-2 flex-1 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">{item.description}</p>
                    
                    {adminOverride && (
                        <button onClick={() => handleDelete(item.id)} className="w-full mb-3 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition">Admin Delete</button>
                    )}

                    <button 
                      onClick={() => initiateBooking(item)}
                      className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-slate-200 active:scale-95 group-hover:shadow-orange-200"
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
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
          {myBookings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4"/>
              <h3 className="text-lg font-bold text-slate-700">No bookings yet</h3>
              <p className="text-gray-400 mb-6">Browse the market to rent equipment.</p>
              <button onClick={() => setActiveTab("browse")} className="text-orange-600 font-bold hover:underline">Start Browsing</button>
            </div>
          ) : (
            myBookings.map(req => {
              const hasReviewed = reviews.some(r => r.requestId === req.id && r.reviewerEmail === user.email);
              return (
                <div key={req.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5 group">
                  <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative">
                    {req.equipmentImage ? <img src={req.equipmentImage} className="w-full h-full object-cover" /> : <Tractor className="text-gray-300" size={40}/>}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"/>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-lg text-slate-800">{req.equipmentName}</h4>
                        <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100"><User size={12}/> Owner: {req.ownerName}</span>
                          <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100"><Calendar size={12}/> {req.startDate} ➔ {req.endDate}</span>
                        </div>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3">
                      {req.status === "Approved" && (
                        <button onClick={() => openChat(req)} className="flex-1 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-100 flex items-center justify-center gap-2 transition">
                          <MessageSquare size={16}/> Chat Owner
                        </button>
                      )}
                      {req.status === "Completed" && !hasReviewed && (
                        <button onClick={() => setReviewRequest(req)} className="flex-1 border border-yellow-200 text-yellow-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-yellow-50 flex items-center justify-center gap-2 transition shadow-sm">
                          <Star size={16}/> Rate Item
                        </button>
                      )}
                      {req.status === "Completed" && hasReviewed && (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full border border-green-100"><CheckCircle size={14}/> Rated</span>
                      )}
                      {req.status === "Pending" && <span className="text-xs text-gray-400 italic self-center flex items-center gap-1"><Loader size={12} className="animate-spin"/> Request sent, waiting...</span>}
                      {req.status === "Rejected" && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12}/> Owner declined</span>}
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
        <div className="animate-in slide-in-from-bottom-4 duration-500 pb-20">
          
          {showPostForm ? (
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-100 relative animate-in zoom-in-95">
              <button onClick={() => setShowPostForm(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition"><XCircle/></button>
              <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2"><Plus className="text-orange-500"/> List New Item</h2>
              <form onSubmit={handlePostItem} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Name</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition" placeholder="e.g. Rotavator"/></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Type</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-3 border rounded-xl bg-white focus:border-orange-500"><option>Rent</option><option>Sale</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Price (₹)</label><input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition" placeholder="0.00"/></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Location</label><input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition" placeholder="City/District"/></div>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Description</label><textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border rounded-xl h-24 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition resize-none" placeholder="Condition, features, age..."/></div>
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 bg-gray-50 hover:bg-orange-50 transition duration-300">
                  {image ? <span className="text-green-600 font-bold flex items-center justify-center gap-2"><CheckCircle size={16}/> {image.name}</span> : <span className="text-gray-400 flex flex-col items-center gap-2"><ImageIcon size={32} className="text-gray-300"/> Upload Photo (Optional)</span>}
                  <input type="file" className="hidden" onChange={(e) => setImage(e.target.files[0])} />
                </label>
                <button disabled={uploading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-all">{uploading ? "Publishing..." : "Publish Listing"}</button>
              </form>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Col: Incoming Requests */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><MessageSquare className="text-orange-600"/> Incoming Orders</h3>
                {incomingRequests.length === 0 && <p className="text-gray-400 italic bg-white p-8 rounded-3xl border border-dashed text-center">No orders received yet. Listing more items helps!</p>}
                {incomingRequests.map(req => (
                  <div key={req.id} className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row gap-4 transition-all ${req.status === 'Pending' ? 'border-orange-200 shadow-orange-100 ring-1 ring-orange-100' : 'border-gray-100'}`}>
                    {/* ✅ FALLBACK IMAGE */}
                    {req.equipmentImage ? (
                        <img src={req.equipmentImage} className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                    ) : (
                        <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400"><Tractor size={24}/></div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-slate-800">{req.equipmentName}</h4>
                        <StatusBadge status={req.status}/>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Requester: <span className="font-bold text-slate-700">{req.requesterName}</span></p>
                      <p className="text-xs text-orange-600 font-bold mt-1 bg-orange-50 inline-block px-2 py-0.5 rounded-lg"><Calendar size={10} className="inline mr-1"/>{req.startDate} to {req.endDate}</p>
                      
                      <div className="mt-4 flex gap-2">
                        {req.status === "Pending" && (
                          <>
                            <button onClick={() => handleRequestAction(req, "Approved")} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition shadow-sm">Approve</button>
                            <button onClick={() => handleRequestAction(req, "Rejected")} className="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded-xl text-sm font-bold hover:bg-red-50 transition">Decline</button>
                          </>
                        )}
                        {req.status === "Approved" && (
                          <>
                            <button onClick={() => openChat(req)} className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1"><MessageSquare size={14}/> Chat</button>
                            <button onClick={() => handleRequestAction(req, "Completed")} className="flex-1 bg-slate-800 text-white py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition flex items-center justify-center gap-1"><CheckCircle size={14}/> Mark Done</button>
                          </>
                        )}
                        {req.status === "Completed" && (
                             <span className="flex-1 bg-gray-50 text-gray-500 py-2 rounded-xl text-xs font-bold text-center border border-gray-100">Transaction Completed</span>
                        )}
                        {req.status === "Rejected" && (
                             <span className="flex-1 bg-red-50 text-red-400 py-2 rounded-xl text-xs font-bold text-center border border-red-100">Request Rejected</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Col: Inventory */}
              <div>
                <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2"><Store className="text-orange-600"/> My Inventory</h3>
                <div className="space-y-4">
                  {myItems.map(item => {
                    const myItemRating = getItemRating(item.id, item.ownerEmail);
                    return (
                    <div key={item.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 group hover:shadow-md transition">
                      {/* ✅ FALLBACK IMAGE */}
                      {item.imageUrl ? (
                          <img src={item.imageUrl} className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400"><Tractor size={20}/></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-orange-600 font-bold">₹{item.price}</p>
                            {myItemRating && (
                                <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 rounded-md flex items-center gap-0.5">
                                    <Star size={8} className="fill-yellow-600"/> {myItemRating.avg}
                                </span>
                            )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setManagingItem(item)} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-200 text-gray-600 transition" title="Manage Availability"><CalendarCheck size={16}/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 rounded-lg hover:bg-red-100 text-red-600 transition" title="Delete"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  )})}
                  {myItems.length === 0 && <p className="text-gray-400 text-sm italic bg-gray-50 p-4 rounded-xl text-center">No items listed.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}
      
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
               <button onClick={handleManualBlock} className="bg-red-500 text-white px-4 rounded-xl font-bold text-sm hover:bg-red-600 transition shadow-md">Block</button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
               <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Blocked Dates</h4>
               {managingItem.unavailableDates?.length === 0 && <p className="text-xs text-gray-400 italic">No dates blocked.</p>}
               {managingItem.unavailableDates?.map(d => (
                 <div key={d} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm border border-gray-100">
                     <span className="font-medium text-slate-700">{d}</span>
                     <button className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition" onClick={() => handleManualUnblock(d)}><Trash2 size={14}/></button>
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
            <h3 className="text-2xl font-bold mb-2 text-slate-800">Rate Item</h3>
            <p className="text-gray-500 text-sm mb-6">How was your experience with <span className="font-bold text-slate-900">{reviewRequest.equipmentName}</span>?</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setReviewData({...reviewData, rating: s})} className="transition hover:scale-125 focus:outline-none"><Star size={32} className={s <= reviewData.rating ? "text-yellow-400 fill-yellow-400 drop-shadow-sm" : "text-gray-200"}/></button>)}
            </div>
            <textarea placeholder="Write a comment..." className="w-full p-4 border rounded-xl h-28 mb-4 outline-none focus:ring-4 focus:ring-orange-100 border-gray-200 resize-none transition" onChange={e => setReviewData({...reviewData, comment: e.target.value})}></textarea>
            <button onClick={submitReview} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg">Submit Review</button>
            <button onClick={() => setReviewRequest(null)} className="mt-4 text-gray-400 text-sm hover:text-gray-600 font-medium">Cancel</button>
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