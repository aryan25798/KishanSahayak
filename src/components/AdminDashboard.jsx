// src/components/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { db, auth, storage } from "../firebase";
import { 
  collection, addDoc, getDocs, deleteDoc, doc, setDoc, 
  query, where, updateDoc, orderBy, limit, startAfter 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Trash2, Package, ScrollText, Users, LogOut, Loader, Search, Globe, 
  Image as ImageIcon, X, Mail, MessageSquare, CheckCircle, Menu, TrendingUp, 
  MessageCircle, Edit2, MapPin, FileText, XCircle, Send, AlertCircle, Tractor
} from "lucide-react"; 
import emailjs from "@emailjs/browser"; 
import ChatInterface from "./ChatInterface";
import EquipmentMarketplace from "./EquipmentMarketplace"; 

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("products");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notification, setNotification] = useState(null); 

  // Data States
  const [products, setProducts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [complaints, setComplaints] = useState([]); 
  const [forumPosts, setForumPosts] = useState([]);
  const [marketPrices, setMarketPrices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination States for Products
  const [lastProductDoc, setLastProductDoc] = useState(null);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const PRODUCTS_PER_PAGE = 10;

  // Chat State
  const [activeChat, setActiveChat] = useState(null);

  // Form States
  const [productName, setProductName] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Scheme Form
  const [schemeTitle, setSchemeTitle] = useState("");
  const [schemeDesc, setSchemeDesc] = useState("");
  const [schemeCategory, setSchemeCategory] = useState("Scheme");

  // Market Price Form
  const [marketCrop, setMarketCrop] = useState("");
  const [marketMandi, setMarketMandi] = useState("");
  const [marketPrice, setMarketPrice] = useState("");
  const [marketChange, setMarketChange] = useState("up");
  const [editMarketId, setEditMarketId] = useState(null);

  // Complaint Resolution State
  const [resolvingId, setResolvingId] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Search & API States
  const [searchQuery, setSearchQuery] = useState("latest agriculture subsidy india 2026");
  const [webResults, setWebResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Environment Variables
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_SEARCH_KEY; 
  const SEARCH_ENGINE_ID = import.meta.env.VITE_SEARCH_ENGINE_ID; 
  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  // --- Helpers ---
  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Initial Admin Check ---
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    // Basic Client-side check (Ensure backend rules exist too)
    if (user.email !== "admin@system.com") {
      alert("Access Denied. Admins only.");
      navigate("/");
    }
  }, [user, navigate]);

  // --- Optimized Data Fetching Functions ---

  const fetchProducts = async (isNextPage = false) => {
    setLoading(true);
    try {
      const productsRef = collection(db, "products");
      let q;

      if (isNextPage && lastProductDoc) {
        q = query(productsRef, limit(PRODUCTS_PER_PAGE), startAfter(lastProductDoc));
      } else {
        q = query(productsRef, limit(PRODUCTS_PER_PAGE));
      }

      const snapshot = await getDocs(q);
      const newProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      setLastProductDoc(snapshot.docs[snapshot.docs.length - 1]);
      
      if (snapshot.docs.length < PRODUCTS_PER_PAGE) {
        setHasMoreProducts(false);
      }

      if (isNextPage) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch products", "error");
    }
    setLoading(false);
  };

  const fetchSchemes = async () => {
    if (schemes.length > 0) return; // Basic cache
    setLoading(true);
    try {
      const sSnap = await getDocs(collection(db, "schemes"));
      setSchemes(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchFarmers = async () => {
    if (farmers.length > 0) return;
    setLoading(true);
    try {
      const fSnap = await getDocs(query(collection(db, "users"), where("role", "==", "farmer")));
      setFarmers(fSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchComplaints = async () => {
    if (complaints.length > 0) return;
    setLoading(true);
    try {
      const cSnap = await getDocs(collection(db, "complaints"));
      setComplaints(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchForum = async () => {
    if (forumPosts.length > 0) return;
    setLoading(true);
    try {
      const forumSnap = await getDocs(collection(db, "forum_posts"));
      setForumPosts(forumSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchMarket = async () => {
    if (marketPrices.length > 0) return;
    setLoading(true);
    try {
      const marketSnap = await getDocs(collection(db, "market_prices"));
      setMarketPrices(marketSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchApplications = async () => {
    if (applications.length > 0) return;
    setLoading(true);
    try {
      const appSnap = await getDocs(query(collection(db, "applications"), orderBy("appliedAt", "desc")));
      setApplications(appSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // --- Effect: Fetch Data Based on Active Tab ---
  useEffect(() => { 
    if (user?.email === "admin@system.com") {
        if (activeTab === "products" && products.length === 0) fetchProducts();
        if (activeTab === "schemes") fetchSchemes();
        if (activeTab === "farmers") fetchFarmers();
        if (activeTab === "complaints") fetchComplaints();
        if (activeTab === "forum") fetchForum();
        if (activeTab === "market") fetchMarket();
        if (activeTab === "applications") fetchApplications();
    }
  }, [user, activeTab]);

  // --- Handlers ---

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async () => {
    if (!productImage) return null;
    setUploading(true);
    try {
      const imageRef = ref(storage, `products/${Date.now()}-${productImage.name}`);
      await uploadBytes(imageRef, productImage);
      return await getDownloadURL(imageRef);
    } catch (error) {
      console.error("Error uploading image: ", error);
      showToast("Image upload failed", "error");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!batchCode || !productName) return showToast("Please fill all fields", "error");
    const safeCode = batchCode.replace(/\//g, "-").toUpperCase(); 
    
    let imageUrl = null;
    if (productImage) {
      imageUrl = await uploadImage();
      if (!imageUrl && productImage) return; 
    }

    try {
       await setDoc(doc(db, "products", safeCode), {
         name: productName,
         status: "Genuine",
         addedBy: "Admin",
         verificationDate: new Date().toISOString(),
         imageUrl: imageUrl 
       });
       showToast("Product Added Successfully!");
       setBatchCode(""); setProductName(""); setProductImage(null); setImagePreview(null);
       // Refresh products list
       setProducts([]); setLastProductDoc(null); setHasMoreProducts(true);
       fetchProducts(); 
    } catch (e) { showToast(e.message, "error"); }
  };

  const searchWebSchemes = async () => {
    setSearching(true);
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items) { setWebResults(data.items); } else { showToast("No results found.", "error"); }
    } catch (error) { showToast("Error searching web.", "error"); }
    setSearching(false);
  };

  const importScheme = async (item) => {
    try {
      await addDoc(collection(db, "schemes"), {
        title: item.title, description: item.snippet || "No description", category: "Imported Subsidy", link: item.link, timestamp: new Date()
      });
      showToast("Scheme Imported!"); 
      setSchemes([]); fetchSchemes();
    } catch (e) { showToast("Error importing: " + e.message, "error"); }
  };

  const fetchGoogleImage = async (query) => {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items && data.items.length > 0) return data.items[0].link; 
    } catch (error) { console.error("Google Image Fetch Error:", error); }
    return null;
  };

  const handleAddScheme = async () => {
    try {
      const imageUrl = await fetchGoogleImage(schemeTitle);
      await addDoc(collection(db, "schemes"), { 
        title: schemeTitle, 
        description: schemeDesc, 
        category: schemeCategory,
        imageUrl: imageUrl
      });
      showToast("Scheme Posted with Image!"); 
      setSchemeTitle(""); setSchemeDesc(""); 
      setSchemes([]); fetchSchemes();
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    try {
      await updateDoc(doc(db, "applications", appId), { status: newStatus });
      setApplications(prev => prev.map(app => app.id === appId ? { ...app, status: newStatus } : app));
      showToast(`Application ${newStatus}!`);
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Failed to update status", "error");
    }
  };

  const handleAddOrUpdateMarketPrice = async () => {
    if (!marketCrop || !marketMandi || !marketPrice) return showToast("Fill all fields", "error");
    try {
      const payload = { crop: marketCrop, market: marketMandi, price: marketPrice, change: marketChange, timestamp: new Date() };
      if (editMarketId) {
        await updateDoc(doc(db, "market_prices", editMarketId), payload);
        showToast("Market Price Updated!");
        setEditMarketId(null);
      } else {
        await addDoc(collection(db, "market_prices"), payload);
        showToast("Market Price Added!");
      }
      setMarketCrop(""); setMarketMandi(""); setMarketPrice(""); 
      setMarketPrices([]); fetchMarket();
    } catch (e) { showToast(e.message, "error"); }
  };

  const startEditPrice = (item) => {
    setEditMarketId(item.id);
    setMarketCrop(item.crop);
    setMarketMandi(item.market);
    setMarketPrice(item.price);
    setMarketChange(item.change);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Universal Delete Handler ---
  const handleDelete = async (col, id) => {
    if(window.confirm("Delete this item? This cannot be undone.")) { 
      try {
        await deleteDoc(doc(db, col, id)); 
        showToast("Deleted successfully.");
        
        // Refresh appropriate list
        if (col === "products") { 
            setProducts(prev => prev.filter(p => p.id !== id)); 
            // If list gets too small, maybe fetch more? simplified for now
        }
        if (col === "schemes") { setSchemes(prev => prev.filter(s => s.id !== id)); }
        if (col === "users") { setFarmers(prev => prev.filter(f => f.id !== id)); }
        if (col === "complaints") { setComplaints(prev => prev.filter(c => c.id !== id)); }
        if (col === "market_prices") { setMarketPrices(prev => prev.filter(m => m.id !== id)); }
        if (col === "forum_posts") { setForumPosts(prev => prev.filter(p => p.id !== id)); }
      } catch(e) {
        showToast("Error deleting: " + e.message, "error");
      }
    }
  };

  const handleResolveComplaint = async (id, farmerEmail, farmerName, originalMessage) => {
    if (!replyText) return showToast("Please enter a reply", "error");

    setUploading(true); 
    try {
      await updateDoc(doc(db, "complaints", id), {
        status: "Resolved",
        adminReply: replyText
      });

      const templateParams = {
        to_name: farmerName || "Farmer",
        to_email: farmerEmail,
        complaint_id: id.slice(0, 5),
        user_message: originalMessage,
        status_message: "Your complaint has been RESOLVED.",
        admin_reply: replyText
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      showToast(`Complaint Resolved! Email sent to ${farmerEmail}`);
      setResolvingId(null);
      setReplyText("");
      setComplaints([]); fetchComplaints();
    } catch (e) {
      console.error(e);
      showToast("Error resolving: " + e.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // --- Render Sections ---

  const renderProducts = () => (
    <div className="animate-fade-up">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Verified Products</h2>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={20} className="text-green-600"/> Add New Batch</h3>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1 w-full space-y-3">
              <input value={batchCode} onChange={(e)=>setBatchCode(e.target.value.toUpperCase())} placeholder="Batch Code (e.g. BTC-2024)" className="border p-3 rounded-xl w-full outline-none focus:ring-2 focus:ring-green-500" />
              <input value={productName} onChange={(e)=>setProductName(e.target.value)} placeholder="Product Name" className="border p-3 rounded-xl w-full outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="flex flex-col items-center gap-2 w-full md:w-auto">
              <label className="w-full md:w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 bg-gray-50 relative overflow-hidden transition-colors">
                  {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                      <><ImageIcon className="text-gray-400" size={24} /><span className="text-xs text-gray-500 mt-1">Upload</span></>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
          </div>
          <button onClick={handleAddProduct} disabled={uploading} className="w-full md:w-auto bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 disabled:bg-gray-400 h-[128px] md:h-32 transition-colors shadow-sm">
            {uploading ? <Loader className="animate-spin" /> : "Verify & Add"}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="overflow-x-auto max-h-[600px]">
           <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-50 border-b sticky top-0 z-10"><tr><th className="p-4">Img</th><th className="p-4">Code</th><th className="p-4">Name</th><th className="p-4">Action</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b items-center hover:bg-gray-50 transition-colors">
                      <td className="p-4">{p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border" />}</td>
                      <td className="p-4 font-mono text-blue-600 font-bold">{p.id}</td>
                      <td className="p-4 font-medium">{p.name}</td>
                      <td className="p-4"><button onClick={()=>handleDelete("products", p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash2 size={18}/></button></td>
                  </tr>
                ))}
              </tbody>
           </table>
         </div>
         {/* Load More Button */}
         {hasMoreProducts && (
            <div className="p-4 border-t flex justify-center">
               <button 
                  onClick={() => fetchProducts(true)} 
                  disabled={loading}
                  className="text-green-600 font-bold hover:text-green-700 disabled:opacity-50 text-sm flex items-center gap-2"
               >
                  {loading ? <Loader className="animate-spin" size={16}/> : "Load More Products"}
               </button>
            </div>
         )}
      </div>
    </div>
  );

  const renderSchemes = () => (
    <div className="animate-fade-up">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Manage Schemes</h2>
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm border border-blue-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-800"><Globe size={20}/> Import from Google</h3>
          <div className="flex gap-2 mb-4">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Search subsidies..." />
            <button onClick={searchWebSchemes} className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700 transition-colors" disabled={searching}>
              {searching ? <Loader className="animate-spin" size={18} /> : <Search size={18} />}
            </button>
          </div>
          {webResults.length > 0 && (
            <div className="grid gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-blue-200">
              {webResults.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border flex justify-between items-center group hover:shadow-md transition">
                  <div className="flex-1 overflow-hidden"><h4 className="font-bold text-xs text-gray-800 truncate">{item.title}</h4></div>
                  <button onClick={() => importScheme(item)} className="ml-2 bg-green-100 text-green-700 p-1.5 rounded hover:bg-green-600 hover:text-white transition"><Plus size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4">Post Manually</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <input value={schemeTitle} onChange={(e)=>setSchemeTitle(e.target.value)} placeholder="Scheme Title" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500 text-sm" />
              <select value={schemeCategory} onChange={(e)=>setSchemeCategory(e.target.value)} className="border p-3 rounded-xl outline-none bg-white text-sm">
                <option value="Scheme">Scheme</option><option value="Subsidy">Subsidy</option><option value="Loan">Loan</option>
              </select>
            </div>
            <textarea value={schemeDesc} onChange={(e)=>setSchemeDesc(e.target.value)} placeholder="Description" className="border p-3 rounded-xl w-full h-20 outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            <button onClick={handleAddScheme} className="bg-green-600 text-white w-full py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm">Post Scheme</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {schemes.map(s => (
          <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start hover:shadow-md transition">
            <div className="flex gap-4">
              {s.imageUrl && <img src={s.imageUrl} alt={s.title} className="w-16 h-16 object-cover rounded-lg border bg-gray-50" />}
              <div>
                <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">{s.title} {s.category === "Imported Subsidy" && <Globe size={14} className="text-blue-500" />}</h4>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed max-w-2xl line-clamp-2">{s.description}</p>
                <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-block uppercase tracking-wider">{s.category}</span>
              </div>
            </div>
            <button onClick={() => handleDelete("schemes", s.id)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderApplications = () => (
    <div className="animate-fade-up">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Scheme Applications</h2>
      <div className="grid gap-4">
        {applications.length === 0 ? <p className="text-gray-400 bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center">No applications pending.</p> : applications.map(app => (
          <div key={app.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{app.applicantName}</h3>
                <p className="text-gray-500 text-sm flex items-center gap-1"><Mail size={12}/> {app.applicantEmail}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                app.status === "Pending" ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                app.status === "Accepted" ? "bg-green-50 text-green-700 border-green-100" :
                "bg-red-50 text-red-700 border-red-100"
              }`}>
                {app.status}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-end">
              <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-3 text-sm text-gray-600 border border-gray-100 w-full sm:w-auto">
                <MapPin size={18} className="text-red-500 shrink-0"/>
                <div>
                  <span className="font-bold block text-gray-800">Scheme: {app.schemeTitle}</span>
                  Lat: {app.location?.lat.toFixed(4)}, Lng: {app.location?.lng.toFixed(4)}
                  <a href={`https://maps.google.com/?q=${app.location?.lat},${app.location?.lng}`} target="_blank" rel="noreferrer" className="text-blue-600 ml-2 underline hover:text-blue-800 font-bold">View Map</a>
                </div>
              </div>
              {app.status === "Pending" && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => handleUpdateApplicationStatus(app.id, "Accepted")} className="flex-1 sm:flex-none bg-green-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 transition shadow-sm"><CheckCircle size={18}/> Accept</button>
                  <button onClick={() => handleUpdateApplicationStatus(app.id, "Rejected")} className="flex-1 sm:flex-none bg-white text-red-600 border border-red-200 px-5 py-2 rounded-xl font-bold hover:bg-red-50 flex items-center justify-center gap-2 transition"><XCircle size={18}/> Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderComplaints = () => (
    <div className="animate-fade-up">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Help Desk & Complaints</h2>
      <div className="space-y-4">
        {complaints.length === 0 ? <p className="text-gray-400 bg-white p-6 rounded-xl text-center">No active complaints.</p> : complaints.map(c => (
           <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 hover:shadow-md transition group relative">
              {/* Added Delete Button for Complaints */}
              <button 
                onClick={() => handleDelete("complaints", c.id)} 
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                title="Delete Complaint"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex justify-between items-start">
                  <div className="flex-1 pr-8">
                      <div className="flex items-center gap-3 mb-2">
                         <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${c.status==="Resolved"?"bg-green-50 border-green-100 text-green-700":"bg-yellow-50 border-yellow-100 text-yellow-700"}`}>{c.status}</span>
                         <h4 className="font-bold text-lg text-gray-800">{c.subject}</h4>
                      </div>
                      <p className="text-gray-700 text-sm mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">"{c.message}"</p>
                      <div className="flex gap-4 text-xs text-gray-400 items-center">
                         <span className="flex items-center gap-1"><Users size={12}/> {c.farmerName}</span>
                         <span className="flex items-center gap-1"><Mail size={12}/> {c.email}</span>
                      </div>
                      {c.adminReply && (
                         <div className="mt-4 pl-4 border-l-2 border-green-500">
                             <span className="text-xs font-bold text-green-600 uppercase">Resolved with Reply:</span>
                             <p className="text-gray-600 text-sm mt-1">{c.adminReply}</p>
                         </div>
                      )}
                  </div>
              </div>
              
              {/* Resolve Section */}
              {c.status === "Pending" && (
                <div className="mt-2 pt-4 border-t border-gray-100">
                  {resolvingId === c.id ? (
                    <div className="animate-in fade-in slide-in-from-top-2">
                       <textarea 
                          value={replyText} 
                          onChange={(e) => setReplyText(e.target.value)} 
                          placeholder="Type your reply to the farmer..." 
                          className="w-full border p-3 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-green-50 outline-none h-24"
                       />
                       <div className="flex gap-2 justify-end">
                          <button onClick={() => { setResolvingId(null); setReplyText(""); }} className="px-4 py-2 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-lg">Cancel</button>
                          <button onClick={() => handleResolveComplaint(c.id, c.email, c.farmerName, c.message)} disabled={uploading} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2">
                            {uploading ? <Loader className="animate-spin" size={16}/> : <><Send size={16}/> Send Reply</>}
                          </button>
                       </div>
                    </div>
                  ) : (
                    <button 
                       onClick={() => setResolvingId(c.id)}
                       className="bg-gray-900 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 flex items-center gap-2 transition self-start"
                    >
                       <MessageSquare size={16}/> Reply & Resolve
                    </button>
                  )}
                </div>
              )}
           </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans pt-16">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-24 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${notification.type === 'error' ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-white border border-green-100 text-green-700'}`}>
          {notification.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
          <span className="font-bold">{notification.message}</span>
        </div>
      )}

      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white p-6 
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0 md:fixed md:top-16 md:bottom-0 md:left-0 md:z-30
        flex flex-col h-[calc(100vh-4rem)] md:h-auto border-r border-gray-800
      `}>
        <div className="flex justify-between items-center mb-8 shrink-0">
            <h2 className="text-xl font-bold text-green-400 tracking-tight flex items-center gap-2"><Package size={24}/> Admin Panel</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white transition">
              <X size={24} />
            </button>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {[
            { id: "products", label: "Products", icon: Package },
            { id: "schemes", label: "Schemes", icon: ScrollText },
            { id: "applications", label: "Applications", icon: FileText },
            { id: "farmers", label: "Farmers", icon: Users },
            { id: "complaints", label: "Help Desk", icon: MessageSquare },
            { id: "market", label: "Market Prices", icon: TrendingUp },
            { id: "equipment", label: "Equipment", icon: Tractor }, 
            { id: "forum", label: "Community", icon: MessageCircle },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} 
              className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all text-sm font-medium ${activeTab === item.id ? "bg-green-600 text-white shadow-lg shadow-green-900/20" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        
        <div className="pt-4 border-t border-gray-800 mt-4 shrink-0">
            <button onClick={() => auth.signOut()} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-sm font-bold">
                <LogOut size={18} /> Logout
            </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pb-24 overflow-y-auto md:ml-64 max-w-7xl mx-auto w-full">
        
        {activeTab === "products" && renderProducts()}
        {activeTab === "schemes" && renderSchemes()}
        {activeTab === "applications" && renderApplications()}
        {activeTab === "complaints" && renderComplaints()}

        {/* Equipment Tab Render */}
        {activeTab === "equipment" && (
           <div className="animate-fade-up">
              <EquipmentMarketplace adminOverride={true} />
           </div>
        )}

        {/* Farmers Tab Render */}
        {activeTab === "farmers" && (
             <div className="animate-fade-up">
               <h2 className="text-3xl font-bold mb-6 text-gray-800">Registered Farmers</h2>
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-50 border-b"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Actions</th></tr></thead>
                        <tbody>
                          {farmers.map(f => (
                             <tr key={f.id} className="border-b hover:bg-gray-50 transition-colors">
                                 <td className="p-4 font-medium flex items-center gap-2"><Users size={18} className="text-green-600"/> {f.name || "Farmer"}</td>
                                 <td className="p-4 text-gray-600">{f.email}</td>
                                 <td className="p-4 flex items-center gap-2">
                                     <button onClick={() => setActiveChat({ id: f.uid || f.id, name: f.name || "Farmer" })} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 text-xs transition">
                                         <MessageSquare size={14} /> Chat
                                     </button>
                                     {/* Added Delete Button for Farmers */}
                                     <button 
                                        onClick={() => handleDelete("users", f.id)} 
                                        className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100 text-xs transition"
                                     >
                                        <Trash2 size={14} /> Delete
                                     </button>
                                 </td>
                             </tr>
                          ))}
                        </tbody>
                     </table>
                   </div>
               </div>
             </div>
        )}

        {/* Market Prices Render */}
        {activeTab === "market" && (
            <div className="animate-fade-up">
              <h2 className="text-3xl font-bold mb-6 text-gray-800">Manage Market Prices</h2>
              <div className={`p-6 rounded-2xl shadow-sm border mb-8 transition-colors ${editMarketId ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${editMarketId ? "text-orange-700" : "text-gray-800"}`}>
                  {editMarketId ? <><Edit2 size={20}/> Editing Price</> : "Add New Price"}
                </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input value={marketCrop} onChange={(e)=>setMarketCrop(e.target.value)} placeholder="Crop (e.g. Wheat)" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                    <input value={marketMandi} onChange={(e)=>setMarketMandi(e.target.value)} placeholder="Mandi" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                    <input value={marketPrice} onChange={(e)=>setMarketPrice(e.target.value)} placeholder="Price" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                    <select value={marketChange} onChange={(e)=>setMarketChange(e.target.value)} className="border p-3 rounded-xl outline-none bg-white">
                        <option value="up">Trending Up</option><option value="down">Trending Down</option><option value="stable">Stable</option>
                    </select>
                    <button onClick={handleAddOrUpdateMarketPrice} className={`px-6 py-3 rounded-xl font-bold text-white transition shadow-sm ${editMarketId ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}>
                      {editMarketId ? "Update" : "Add"}
                    </button>
                    {editMarketId && <button onClick={() => { setEditMarketId(null); setMarketCrop(""); setMarketMandi(""); setMarketPrice(""); }} className="px-4 text-gray-500 font-bold">Cancel</button>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketPrices.map(m => (
                  <div key={m.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center relative overflow-hidden">
                     <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.change === 'up' ? 'bg-green-500' : m.change === 'down' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                     <div className="pl-2">
                        <h4 className="font-bold text-lg text-gray-800">{m.crop}</h4>
                        <p className="text-gray-500 text-sm">{m.market}</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-lg text-green-600">{m.price}</p>
                        <div className="flex gap-2 justify-end mt-1">
                          <button onClick={() => startEditPrice(m)} className="text-gray-400 hover:text-blue-500 transition"><Edit2 size={16}/></button>
                          <button onClick={() => handleDelete("market_prices", m.id)} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={16}/></button>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
        )}

        {/* Forum Render */}
        {activeTab === "forum" && (
           <div className="animate-fade-up">
             <h2 className="text-3xl font-bold mb-6 text-gray-800">Community Moderation</h2>
             <div className="space-y-4">
                {forumPosts.map(post => (
                   <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start gap-4">
                       <div className="flex-1">
                           <div className="flex items-center gap-2 mb-2">
                               <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">{post.authorName?.[0] || "U"}</div>
                               <div>
                                 <span className="font-bold text-gray-800 text-sm block">{post.authorName}</span>
                                 <span className="text-xs text-gray-400">{post.authorEmail}</span>
                               </div>
                           </div>
                           {post.imageUrl && <img src={post.imageUrl} alt="Post" className="h-32 w-auto rounded-lg mb-3 object-cover border bg-gray-50" />}
                           <p className="text-gray-700 text-sm">"{post.text}"</p>
                       </div>
                       {/* Explicit Forum Post Delete Button */}
                       <button onClick={() => handleDelete("forum_posts", post.id)} className="text-red-600 bg-red-50 px-4 py-2 rounded-lg font-bold hover:bg-red-100 hover:text-red-700 transition flex items-center gap-2 text-xs">
                           <Trash2 size={14}/> Delete Post
                       </button>
                   </div>
                ))}
             </div>
           </div>
        )}

      </div>

      {/* Chat Interface Fixed Overlay */}
      {activeChat && (
        <ChatInterface 
          chatId={`chat_${activeChat.id}`} 
          receiverName={activeChat.name}
          isUserAdmin={true} 
          onClose={() => setActiveChat(null)}
        />
      )}

    </div>
  );
};

export default AdminDashboard;