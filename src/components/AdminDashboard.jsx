// src/components/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { db, auth, storage } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, query, where, updateDoc, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Package, ScrollText, Users, LogOut, Loader, Search, Globe, Image as ImageIcon, X, Mail, MessageSquare, CheckCircle, Menu, TrendingUp, MessageCircle, Edit2, MapPin, FileText, XCircle } from "lucide-react"; // Added XCircle
import emailjs from "@emailjs/browser"; 
import ChatInterface from "./ChatInterface";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("products");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data States
  const [products, setProducts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [complaints, setComplaints] = useState([]); 
  const [forumPosts, setForumPosts] = useState([]);
  const [marketPrices, setMarketPrices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // 1. Security Check
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.email !== "admin@system.com") {
      alert("Access Denied. Admins only.");
      navigate("/");
    }
  }, [user, navigate]);

  // 2. Fetch Data
  const fetchData = async () => {
    if (!user || user.email !== "admin@system.com") return;

    setLoading(true);
    try {
      const pSnap = await getDocs(collection(db, "products"));
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const sSnap = await getDocs(collection(db, "schemes"));
      setSchemes(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const fSnap = await getDocs(query(collection(db, "users"), where("role", "==", "farmer")));
      setFarmers(fSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const cSnap = await getDocs(collection(db, "complaints"));
      setComplaints(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const forumSnap = await getDocs(collection(db, "forum_posts"));
      setForumPosts(forumSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const marketSnap = await getDocs(collection(db, "market_prices"));
      setMarketPrices(marketSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const appSnap = await getDocs(query(collection(db, "applications"), orderBy("appliedAt", "desc")));
      setApplications(appSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { 
    if (user?.email === "admin@system.com") {
        fetchData(); 
    }
  }, [user]);

  // Image Handling
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
      alert("Image upload failed!");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Logic Functions
  const handleAddProduct = async () => {
    if (!batchCode || !productName) return alert("Fill all fields");
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
       alert(`Product Added!`);
       setBatchCode(""); setProductName(""); setProductImage(null); setImagePreview(null);
       fetchData(); 
    } catch (e) { alert(e.message); }
  };

  const searchWebSchemes = async () => {
    setSearching(true);
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items) { setWebResults(data.items); } else { alert("No results found."); }
    } catch (error) { alert("Error searching web."); }
    setSearching(false);
  };

  const importScheme = async (item) => {
    try {
      await addDoc(collection(db, "schemes"), {
        title: item.title, description: item.snippet || "No description", category: "Imported Subsidy", link: item.link, timestamp: new Date()
      });
      alert("✅ Scheme Imported!"); fetchData();
    } catch (e) { alert("Error importing: " + e.message); }
  };

  const fetchGoogleImage = async (query) => {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].link; 
      }
    } catch (error) {
      console.error("Google Image Fetch Error:", error);
    }
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
      alert("Scheme Posted with Image!"); 
      setSchemeTitle(""); setSchemeDesc(""); 
      fetchData();
    } catch (e) { alert(e.message); }
  };

  // ✅ New Logic: Accept/Reject Applications
  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    try {
      await updateDoc(doc(db, "applications", appId), {
        status: newStatus
      });
      // Optimistically update UI
      setApplications(prev => prev.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      ));
      alert(`Application ${newStatus}!`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update application status.");
    }
  };

  const handleAddOrUpdateMarketPrice = async () => {
    if (!marketCrop || !marketMandi || !marketPrice) return alert("Fill all fields");
    try {
      if (editMarketId) {
        await updateDoc(doc(db, "market_prices", editMarketId), {
          crop: marketCrop, market: marketMandi, price: marketPrice, change: marketChange, timestamp: new Date()
        });
        alert("Market Price Updated!");
        setEditMarketId(null);
      } else {
        await addDoc(collection(db, "market_prices"), {
          crop: marketCrop, market: marketMandi, price: marketPrice, change: marketChange, timestamp: new Date()
        });
        alert("Market Price Added!");
      }
      setMarketCrop(""); setMarketMandi(""); setMarketPrice(""); 
      fetchData();
    } catch (e) { alert(e.message); }
  };

  const startEditPrice = (item) => {
    setEditMarketId(item.id);
    setMarketCrop(item.crop);
    setMarketMandi(item.market);
    setMarketPrice(item.price);
    setMarketChange(item.change);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (col, id) => {
    if(confirm("Delete this? This action cannot be undone.")) { 
      try {
        await deleteDoc(doc(db, col, id)); 
        fetchData();
        alert("Deleted successfully.");
      } catch(e) {
        alert("Error deleting: " + e.message);
      }
    }
  };

  const handleResolveComplaint = async (id, farmerEmail, farmerName, originalMessage) => {
    const reply = prompt("Enter your reply to the farmer:");
    if (!reply) return;

    try {
      await updateDoc(doc(db, "complaints", id), {
        status: "Resolved",
        adminReply: reply
      });

      const templateParams = {
        to_name: farmerName || "Farmer",
        to_email: farmerEmail,
        complaint_id: id.slice(0, 5),
        user_message: originalMessage,
        status_message: "Your complaint has been RESOLVED.",
        admin_reply: reply
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      alert(`Complaint Resolved! Email sent to ${farmerEmail}`);
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Error resolving: " + e.message);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin text-green-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans pt-16">
      
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-50 bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white p-6 
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0 md:fixed md:top-16 md:bottom-0 md:left-0 md:z-30
        flex flex-col
      `}>
        <div className="flex justify-between items-center mb-8 shrink-0">
            <h2 className="text-2xl font-bold text-green-400 tracking-tight">Admin Panel</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white transition">
              <X size={24} />
            </button>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto min-h-0">
          <button onClick={() => { setActiveTab("products"); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "products" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <Package size={20} /> Products
          </button>
          <button onClick={() => { setActiveTab("schemes"); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "schemes" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <ScrollText size={20} /> Schemes
          </button>
          <button onClick={() => { setActiveTab("applications"); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "applications" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <FileText size={20} /> Applications
          </button>
          <button onClick={() => { setActiveTab("farmers"); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "farmers" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <Users size={20} /> Farmers
          </button>
          <button onClick={() => { setActiveTab("complaints"); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "complaints" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <MessageSquare size={20} /> Help Desk
          </button>
          <button onClick={() => { setActiveTab("market"); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "market" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <TrendingUp size={20} /> Market Prices
          </button>
          <button onClick={() => { setActiveTab("forum"); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "forum" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <MessageCircle size={20} /> Community
          </button>
        </nav>
        
        <div className="pt-4 border-t border-gray-800 mt-4 shrink-0">
            <button onClick={() => auth.signOut()} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-600/20 text-red-400 transition-colors">
                <LogOut size={20} /> Logout
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
      <div className="flex-1 p-6 lg:p-10 pb-24 overflow-y-auto md:ml-64">
        
        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="animate-fade-up">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Verified Products</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={20} className="text-green-600"/> Add New Batch</h3>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                    <input value={batchCode} onChange={(e)=>setBatchCode(e.target.value.toUpperCase())} placeholder="Batch Code" className="border p-3 rounded-xl w-full outline-none mb-4 focus:ring-2 focus:ring-green-500" />
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
                <button onClick={handleAddProduct} disabled={uploading} className="w-full md:w-auto bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 disabled:bg-gray-400 h-fit self-end transition-colors shadow-lg">
                  {uploading ? "Uploading..." : "Verify & Add"}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50 border-b"><tr><th className="p-4">Img</th><th className="p-4">Code</th><th className="p-4">Name</th><th className="p-4">Action</th></tr></thead>
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
            </div>
          </div>
        )}

        {/* Schemes Tab */}
        {activeTab === "schemes" && (
          <div className="animate-fade-up">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Manage Schemes</h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm border border-blue-100 mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-800"><Globe size={20}/> Import from Google</h3>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search keywords..." />
                <button onClick={searchWebSchemes} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors shadow-lg" disabled={searching}>
                  {searching ? <Loader className="animate-spin" size={18} /> : <Search size={18} />} Fetch
                </button>
              </div>
              {webResults.length > 0 && (
                <div className="grid gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {webResults.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border flex justify-between items-center group hover:shadow-md transition">
                      <div className="flex-1"><h4 className="font-bold text-sm text-gray-800">{item.title}</h4><p className="text-xs text-gray-500 line-clamp-1">{item.snippet}</p></div>
                      <button onClick={() => importScheme(item)} className="ml-4 bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-600 hover:text-white transition flex items-center gap-1 text-xs font-bold"><Plus size={14} /> Add</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
              <h3 className="text-lg font-bold mb-4">Post Manually (Auto-Fetch Image)</h3>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <input value={schemeTitle} onChange={(e)=>setSchemeTitle(e.target.value)} placeholder="Scheme Title" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500" />
                  <select value={schemeCategory} onChange={(e)=>setSchemeCategory(e.target.value)} className="border p-3 rounded-xl outline-none bg-white focus:ring-2 focus:ring-green-500">
                    <option value="Scheme">Scheme</option><option value="Subsidy">Subsidy</option><option value="Loan">Loan</option>
                  </select>
                </div>
                <textarea value={schemeDesc} onChange={(e)=>setSchemeDesc(e.target.value)} placeholder="Description" className="border p-3 rounded-xl w-full h-20 outline-none focus:ring-2 focus:ring-green-500" />
                <button onClick={handleAddScheme} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 w-full sm:w-auto shadow-lg transition-colors">Post Scheme</button>
              </div>
            </div>

            <div className="grid gap-4">
              {schemes.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start hover:shadow-md transition">
                  <div className="flex gap-4">
                    {s.imageUrl && <img src={s.imageUrl} alt={s.title} className="w-20 h-20 object-cover rounded-lg border" />}
                    <div>
                      <h4 className="font-bold text-xl text-gray-800 mb-1 flex items-center gap-2">{s.title} {s.category === "Imported Subsidy" && <Globe size={14} className="text-blue-500" />}</h4>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">{s.description}</p>
                      <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full mt-2 inline-block">{s.category}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete("schemes", s.id)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ APPLICATIONS TAB (With Accept/Reject) */}
        {activeTab === "applications" && (
          <div className="animate-fade-up">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Scheme Applications</h2>
            <div className="space-y-4">
              {applications.length === 0 ? <p className="text-gray-400 bg-white p-6 rounded-xl">No applications yet.</p> : applications.map(app => (
                <div key={app.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{app.applicantName}</h3>
                      <p className="text-gray-500 text-sm flex items-center gap-1"><Mail size={12}/> {app.applicantEmail}</p>
                    </div>
                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                      app.status === "Pending" ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                      app.status === "Accepted" ? "bg-green-50 text-green-700 border-green-100" :
                      "bg-red-50 text-red-700 border-red-100"
                    }`}>
                      {app.status === "Pending" ? `Applied for: ${app.schemeTitle}` : app.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between gap-4 items-end">
                    <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-3 text-sm text-gray-600 border border-gray-100 w-full sm:w-auto">
                      <MapPin size={18} className="text-red-500"/>
                      <div>
                        <span className="font-bold block text-gray-800">Location:</span>
                        {app.location?.lat.toFixed(4)}, {app.location?.lng.toFixed(4)}
                        <a href={`http://googleusercontent.com/maps.google.com/3{app.location?.lat},${app.location?.lng}`} target="_blank" rel="noreferrer" className="text-blue-600 ml-2 underline hover:text-blue-800 font-bold">Map</a>
                      </div>
                    </div>

                    {/* ✅ Accept / Reject Buttons */}
                    {app.status === "Pending" && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleUpdateApplicationStatus(app.id, "Accepted")}
                          className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 transition"
                        >
                          <CheckCircle size={18}/> Accept
                        </button>
                        <button 
                          onClick={() => handleUpdateApplicationStatus(app.id, "Rejected")}
                          className="flex-1 sm:flex-none bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-200 flex items-center justify-center gap-2 transition"
                        >
                          <XCircle size={18}/> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Farmers Tab */}
        {activeTab === "farmers" && (
          <div className="animate-fade-up relative">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Registered Farmers</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50 border-b"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Actions</th></tr></thead>
                    <tbody>
                      {farmers.length === 0 ? (
                          <tr><td colSpan="3" className="p-6 text-center text-gray-500">No farmers found.</td></tr>
                      ) : (
                          farmers.map(f => (
                          <tr key={f.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-4 font-medium flex items-center gap-2"><Users size={18} className="text-green-600"/> {f.name || "Farmer"}</td>
                              <td className="p-4 text-gray-600">{f.email}</td>
                              <td className="p-4 flex items-center gap-2">
                                  <a href={`mailto:${f.email}?subject=Message from Kisan Sahayak Admin`} className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 text-sm transition">
                                      <Mail size={16} /> Contact
                                  </a>
                                  <button onClick={() => setActiveChat({ id: f.uid || f.id, name: f.name || "Farmer" })} className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-200 text-sm transition">
                                    <MessageSquare size={16} /> Chat
                                  </button>
                              </td>
                          </tr>
                          ))
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
            {activeChat && (
              <ChatInterface 
                chatId={`chat_${activeChat.id}`} 
                receiverName={activeChat.name}
                isUserAdmin={true} 
                onClose={() => setActiveChat(null)}
              />
            )}
          </div>
        )}

        {/* Complaints Tab */}
        {activeTab === "complaints" && (
          <div className="animate-fade-up">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Help Desk & Complaints</h2>
            <div className="space-y-4">
                {complaints.length === 0 ? <p className="text-gray-400 bg-white p-6 rounded-xl">No complaints found.</p> : complaints.map(c => (
                   <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start gap-4 hover:shadow-md transition">
                      <div className="flex-1">
                         <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${c.status==="Resolved"?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700"}`}>{c.status}</span>
                            <h4 className="font-bold text-lg text-gray-800">{c.subject}</h4>
                         </div>
                         <p className="text-gray-600 text-sm mb-2">"{c.message}"</p>
                         <div className="flex gap-4 text-xs text-gray-400 items-center">
                            <span className="flex items-center gap-1"><Users size={12}/> {c.farmerName}</span>
                            <span className="flex items-center gap-1"><Mail size={12}/> {c.email}</span>
                            <span>ID: {c.uid.slice(0,5)}</span>
                         </div>
                         {c.adminReply && (
                             <div className="mt-4 bg-gray-50 p-3 rounded-lg border-l-4 border-green-500 text-sm">
                                 <strong className="text-gray-900 block mb-1">Your Reply:</strong>
                                 <p className="text-gray-600">{c.adminReply}</p>
                             </div>
                         )}
                      </div>
                      
                      {c.status === "Pending" && (
                        <button 
                           onClick={() => handleResolveComplaint(c.id, c.email, c.farmerName, c.message)}
                           className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-200 transition transform hover:scale-105"
                        >
                           <CheckCircle size={18}/> Resolve & Email
                        </button>
                      )}
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* Market Prices Tab */}
        {activeTab === "market" && (
          <div className="animate-fade-up">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Manage Market Prices</h2>
            <div className={`p-6 rounded-2xl shadow-sm border mb-8 transition-colors ${editMarketId ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${editMarketId ? "text-orange-700" : "text-gray-800"}`}>
                {editMarketId ? <><Edit2 size={20}/> Editing Price</> : "Add New Price"}
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                  <input value={marketCrop} onChange={(e)=>setMarketCrop(e.target.value)} placeholder="Crop (e.g. Wheat)" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500" />
                  <input value={marketMandi} onChange={(e)=>setMarketMandi(e.target.value)} placeholder="Mandi (e.g. Delhi)" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500" />
                  <input value={marketPrice} onChange={(e)=>setMarketPrice(e.target.value)} placeholder="Price (e.g. ₹2000/qt)" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500" />
                  <select value={marketChange} onChange={(e)=>setMarketChange(e.target.value)} className="border p-3 rounded-xl outline-none bg-white">
                      <option value="up">Trending Up</option>
                      <option value="down">Trending Down</option>
                      <option value="stable">Stable</option>
                  </select>
                  <button onClick={handleAddOrUpdateMarketPrice} className={`px-6 py-3 rounded-xl font-bold text-white transition ${editMarketId ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}>
                    {editMarketId ? "Update" : "Add"}
                  </button>
                  {editMarketId && (
                    <button onClick={() => { setEditMarketId(null); setMarketCrop(""); setMarketMandi(""); setMarketPrice(""); }} className="px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200">
                      Cancel
                    </button>
                  )}
              </div>
            </div>

            <div className="grid gap-4">
              {marketPrices.map(m => (
                <div key={m.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                   <div>
                      <h4 className="font-bold text-xl text-gray-800">{m.crop}</h4>
                      <p className="text-gray-500 text-sm">{m.market}</p>
                   </div>
                   <div className="text-right flex items-center gap-4">
                      <div>
                         <p className="font-bold text-lg text-green-600">{m.price}</p>
                         <p className="text-xs text-gray-400 uppercase">{m.change}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEditPrice(m)} className="text-gray-400 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-full transition-colors" title="Edit Price">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete("market_prices", m.id)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ COMMUNITY FORUM TAB - Delete button clearly visible */}
        {activeTab === "forum" && (
          <div className="animate-fade-up">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Community Moderation</h2>
            <div className="space-y-4">
               {forumPosts.length === 0 ? <p className="text-gray-400 bg-white p-6 rounded-xl">No posts found.</p> : forumPosts.map(post => (
                  <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start gap-4 hover:shadow-md transition">
                      <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-gray-800">{post.authorName}</span>
                              <span className="text-xs text-gray-400">{post.authorEmail}</span>
                          </div>
                          {post.imageUrl && (
                            <img src={post.imageUrl} alt="Post" className="h-24 w-auto rounded-lg mb-2 object-cover border" />
                          )}
                          <p className="text-gray-700 mb-2">"{post.text}"</p>
                          <span className="text-xs text-gray-400">ID: {post.id}</span>
                      </div>
                      <button onClick={() => handleDelete("forum_posts", post.id)} className="text-red-500 bg-red-50 px-4 py-2 rounded-lg font-bold hover:bg-red-600 hover:text-white transition flex items-center gap-2">
                          <Trash2 size={16}/> Delete
                      </button>
                  </div>
               ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;