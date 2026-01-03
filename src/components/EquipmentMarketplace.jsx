import { useState, useEffect } from "react";
import { db, auth, storage } from "../firebase";
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
  query, where, serverTimestamp, arrayUnion, arrayRemove 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { 
  Tractor, Plus, Search, MapPin, Tag, Image as ImageIcon, Loader, 
  Trash2, CheckCircle, XCircle, MessageSquare, HandCoins, CalendarCheck,
  Star, Calendar, Clock, User
} from "lucide-react";
import EquipmentChat from "./EquipmentChat";
import toast from "react-hot-toast";

const EquipmentMarketplace = ({ adminOverride = false }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("browse"); // browse, sell, requests
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ name: "", type: "Rent", price: "", location: "", description: "" });
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Modal States
  const [bookingItem, setBookingItem] = useState(null); // Item being requested
  const [bookingDates, setBookingDates] = useState({ startDate: "", endDate: "" });
  
  const [managingItem, setManagingItem] = useState(null); // Item being managed by owner
  const [blockDate, setBlockDate] = useState("");

  const [reviewRequest, setReviewRequest] = useState(null); // Request being reviewed
  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Equipment
      const itemsSnap = await getDocs(collection(db, "equipment"));
      const itemsData = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(itemsData);

      // 2. Fetch Requests
      if (user) {
        const q1 = query(collection(db, "equipment_requests"), where("ownerEmail", "==", user.email));
        const q2 = query(collection(db, "equipment_requests"), where("requesterEmail", "==", user.email));
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const reqsMap = new Map();
        [...snap1.docs, ...snap2.docs].forEach(doc => {
            reqsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
        setRequests(Array.from(reqsMap.values()));
      }

      // 3. Fetch Reviews
      const reviewsSnap = await getDocs(collection(db, "reviews"));
      setReviews(reviewsSnap.docs.map(d => d.data()));

    } catch (e) {
      console.error(e);
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
      const dateStr = curr.toISOString().split('T')[0];
      if (item.unavailableDates.includes(dateStr)) return false;
      curr.setDate(curr.getDate() + 1);
    }
    return true;
  };

  const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    let curr = new Date(startDate);
    const last = new Date(endDate);
    while (curr <= last) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  // --- Actions ---

  const handlePostItem = async (e) => {
    e.preventDefault();
    if (!image) return toast.error("Please upload an image.");
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
        status: "Available",
        unavailableDates: [] // Initialize empty array for calendar
      });
      toast.success("Equipment Posted Successfully!");
      setFormData({ name: "", type: "Rent", price: "", location: "", description: "" });
      setImage(null);
      fetchData();
      setActiveTab("browse");
    } catch (e) { toast.error(e.message); }
    setUploading(false);
  };

  // Open Booking Modal
  const initiateBooking = (item) => {
    if (!user) return toast.error("Login required");
    setBookingItem(item);
    setBookingDates({ startDate: "", endDate: "" });
  };

  const confirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingItem || !bookingDates.startDate || !bookingDates.endDate) return;

    if (!checkAvailability(bookingItem, bookingDates.startDate, bookingDates.endDate)) {
      return toast.error("Selected dates are not available.");
    }

    try {
      await addDoc(collection(db, "equipment_requests"), {
        equipmentId: bookingItem.id,
        equipmentName: bookingItem.name,
        equipmentImage: bookingItem.imageUrl,
        ownerEmail: bookingItem.ownerEmail,
        requesterEmail: user.email,
        requesterName: user.displayName || "Farmer",
        status: "Pending",
        type: bookingItem.type,
        startDate: bookingDates.startDate,
        endDate: bookingDates.endDate,
        timestamp: serverTimestamp()
      });
      toast.success("Request Sent!");
      setBookingItem(null);
      fetchData();
      setActiveTab("requests");
    } catch (e) { toast.error(e.message); }
  };

  // Manage Availability (Owner)
  const handleBlockDate = async () => {
    if (!blockDate || !managingItem) return;
    try {
      await updateDoc(doc(db, "equipment", managingItem.id), {
        unavailableDates: arrayUnion(blockDate)
      });
      toast.success("Date marked unavailable");
      // Update local state temporarily
      setManagingItem(prev => ({...prev, unavailableDates: [...(prev.unavailableDates || []), blockDate]}));
      setBlockDate("");
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleUnblockDate = async (dateStr) => {
    if (!managingItem) return;
    try {
      await updateDoc(doc(db, "equipment", managingItem.id), {
        unavailableDates: arrayRemove(dateStr)
      });
      toast.success("Date became available");
      setManagingItem(prev => ({...prev, unavailableDates: prev.unavailableDates.filter(d => d !== dateStr)}));
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleAcceptRequest = async (req) => {
    if(!confirm("Accept this request?")) return;

    try {
      // 1. Approve Request
      await updateDoc(doc(db, "equipment_requests", req.id), { status: "Approved" });

      // 2. Block Dates in Equipment Calendar
      if (req.startDate && req.endDate) {
        const bookedDates = getDatesInRange(req.startDate, req.endDate);
        // Add all booked dates to unavailableDates
        const itemRef = doc(db, "equipment", req.equipmentId);
        // Note: Firestore arrayUnion takes varargs, we need to iterate or do logic. 
        // Simpler: fetch doc, merge arrays, update.
        const itemSnap = await getDoc(itemRef); // We can just use updateDoc with spread if needed but let's be safe
        const currentDates = itemSnap.data().unavailableDates || [];
        const newDates = [...new Set([...currentDates, ...bookedDates])];
        
        await updateDoc(itemRef, { unavailableDates: newDates });
      }

      toast.success("Request Accepted!");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Error updating status.");
    }
  };

  const handleCompleteRequest = async (req) => {
    if(!confirm("Mark this transaction as completed?")) return;
    await updateDoc(doc(db, "equipment_requests", req.id), { status: "Completed" });
    fetchData();
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewRequest) return;
    
    try {
      // Determine target (if I am requester, target is owner, else vice versa)
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
      
      toast.success("Review Submitted!");
      setReviewRequest(null);
      setReviewData({ rating: 5, comment: "" });
      fetchData();
    } catch (e) { toast.error("Failed to submit review"); }
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
          {items.map(item => {
             const rating = getOwnerRating(item.ownerEmail);
             return (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group flex flex-col">
              <div className="h-48 sm:h-56 overflow-hidden relative">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-sm uppercase tracking-wider ${item.type === "Rent" ? "bg-blue-500 text-white" : "bg-green-500 text-white"}`}>
                  For {item.type}
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
                
                {/* Rating Badge */}
                {rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-gray-700">{rating.avg}</span>
                    <span className="text-xs text-gray-400">({rating.count} reviews)</span>
                  </div>
                )}

                <div className="text-xs sm:text-sm text-gray-500 space-y-1 mb-4 flex-1">
                    <p className="flex items-center gap-1"><MapPin size={14} className="shrink-0"/> {item.location}</p>
                    <p className="flex items-center gap-1 line-clamp-2"><Tag size={14} className="shrink-0"/> {item.description}</p>
                </div>
                
                {item.ownerEmail !== user?.email ? (
                  <button 
                    onClick={() => initiateBooking(item)}
                    className="w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm sm:text-base bg-gray-900 text-white hover:bg-gray-800 active:scale-95"
                  >
                    <HandCoins size={18} /> Request {item.type}
                  </button>
                ) : (
                  <div className="flex gap-2">
                     <div className="flex-1 bg-orange-50 text-orange-700 py-2 rounded-xl text-center text-xs font-bold uppercase border border-orange-100">
                       Your Listing
                     </div>
                     <button onClick={() => setManagingItem(item)} className="px-3 bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-600">
                        <Calendar size={18} />
                     </button>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      )}

      {/* --- SELL TAB --- */}
      {activeTab === "sell" && (
        <div className="max-w-2xl mx-auto bg-white p-4 sm:p-8 rounded-3xl shadow-lg border border-gray-100 animate-fade-up">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Post New Equipment</h2>
          <form onSubmit={handlePostItem} className="space-y-4">
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
              {image ? <span className="text-green-600 font-bold break-all">{image.name}</span> : 
                <span className="text-gray-400 flex flex-col items-center gap-2 group-hover:text-gray-600"><ImageIcon size={32}/> <span className="text-sm">Tap to upload photo</span></span>}
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
          {requests.length === 0 && <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300"><MessageSquare size={48} className="mx-auto mb-4 opacity-20"/><p>No active requests found.</p></div>}
          
          {requests.map(req => {
            const isOwner = req.ownerEmail === user.email;
            let statusColor = "bg-yellow-100 text-yellow-700 border-yellow-200";
            if(req.status === "Approved") statusColor = "bg-green-100 text-green-700 border-green-200";
            if(req.status === "Rejected") statusColor = "bg-red-100 text-red-700 border-red-200";
            if(req.status === "Completed") statusColor = "bg-blue-100 text-blue-700 border-blue-200";

            return (
              <div key={req.id} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-md">
                <div className="flex items-start sm:items-center gap-4 w-full md:w-auto">
                  <img src={req.equipmentImage} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border bg-gray-100 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">{req.equipmentName}</h4>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ${statusColor}`}>{req.status}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-col gap-0.5">
                      <span className="truncate">{isOwner ? `From: ${req.requesterName}` : `Owner: ${req.ownerEmail}`}</span>
                      <span className="flex items-center gap-1 opacity-75">
                         <Calendar size={10}/> {req.startDate} to {req.endDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-row gap-2 w-full md:w-auto mt-2 md:mt-0">
                  {/* PENDING ACTIONS */}
                  {isOwner && req.status === "Pending" && (
                    <div className="flex gap-2 w-full">
                      <button onClick={() => handleAcceptRequest(req)} className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700">Approve</button>
                    </div>
                  )}

                  {/* ACTIVE ACTIONS */}
                  {req.status === "Approved" && (
                    <>
                      <button onClick={() => setActiveChat({ id: req.id, name: isOwner ? req.requesterName : "Owner" })} className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700">
                        <MessageSquare size={16}/> Chat
                      </button>
                      {isOwner && (
                        <button onClick={() => handleCompleteRequest(req)} className="flex-1 md:flex-none bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-900">
                           Mark Completed
                        </button>
                      )}
                    </>
                  )}

                  {/* COMPLETED ACTIONS */}
                  {req.status === "Completed" && (
                    <button onClick={() => setReviewRequest(req)} className="flex-1 md:flex-none border border-orange-500 text-orange-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-50">
                       <Star size={16}/> Leave Review
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Booking Modal */}
      {bookingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-fade-in relative">
            <button onClick={() => setBookingItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle size={24}/></button>
            <h3 className="text-xl font-bold mb-4">Book Dates</h3>
            <p className="text-sm text-gray-500 mb-4">Select when you need the {bookingItem.name}.</p>
            <form onSubmit={confirmBooking} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">From</label>
                <input type="date" required className="w-full p-2 border rounded-lg" onChange={e => setBookingDates({...bookingDates, startDate: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">To</label>
                <input type="date" required className="w-full p-2 border rounded-lg" onChange={e => setBookingDates({...bookingDates, endDate: e.target.value})} />
              </div>
              <button className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700">Confirm Request</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Management Modal */}
      {managingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fade-in relative">
            <button onClick={() => setManagingItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle size={24}/></button>
            <h3 className="text-xl font-bold mb-2">Manage Availability</h3>
            <p className="text-sm text-gray-500 mb-6">Block dates when "{managingItem.name}" is unavailable.</p>
            
            <div className="flex gap-2 mb-6">
               <input type="date" className="flex-1 p-2 border rounded-lg" onChange={e => setBlockDate(e.target.value)} value={blockDate} />
               <button onClick={handleBlockDate} className="bg-red-500 text-white px-4 rounded-lg font-bold text-sm">Block</button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
               <h4 className="text-xs font-bold text-gray-400 uppercase">Blocked Dates</h4>
               {(!managingItem.unavailableDates || managingItem.unavailableDates.length === 0) && <p className="text-sm text-gray-300">No dates blocked.</p>}
               {managingItem.unavailableDates?.map((date, idx) => (
                 <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                    <span>{date}</span>
                    <button onClick={() => handleUnblockDate(date)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Review Modal */}
      {reviewRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-fade-in relative">
            <button onClick={() => setReviewRequest(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle size={24}/></button>
            <h3 className="text-xl font-bold mb-2">Write a Review</h3>
            <p className="text-sm text-gray-500 mb-6">Rate your experience with this transaction.</p>
            
            <form onSubmit={submitReview} className="space-y-4">
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setReviewData({...reviewData, rating: star})}>
                    <Star size={32} className={`${star <= reviewData.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} transition`} />
                  </button>
                ))}
              </div>
              <textarea placeholder="Share your experience..." className="w-full p-3 border rounded-xl h-24 resize-none" onChange={e => setReviewData({...reviewData, comment: e.target.value})} required />
              <button className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold">Submit Review</button>
            </form>
          </div>
        </div>
      )}

      {/* Chat */}
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