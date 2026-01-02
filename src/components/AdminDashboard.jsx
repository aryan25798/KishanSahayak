// src/components/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { db, auth, storage } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, query, where, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Package, ScrollText, Users, LogOut, Loader, Search, Globe, Image as ImageIcon, X, Mail, MessageSquare, CheckCircle } from "lucide-react";
import emailjs from "@emailjs/browser"; 
import ChatInterface from "./ChatInterface"; // ✅ Added Import

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("products");
  
  // Data States
  const [products, setProducts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [complaints, setComplaints] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Chat State
  const [activeChat, setActiveChat] = useState(null); // ✅ Added Chat State

  // Form States
  const [productName, setProductName] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [schemeTitle, setSchemeTitle] = useState("");
  const [schemeDesc, setSchemeDesc] = useState("");
  const [schemeCategory, setSchemeCategory] = useState("Scheme");

  // Search & API States
  const [searchQuery, setSearchQuery] = useState("latest agriculture subsidy india 2026");
  const [webResults, setWebResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_SEARCH_KEY; 
  const SEARCH_ENGINE_ID = import.meta.env.VITE_SEARCH_ENGINE_ID; 
  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  // 1. ✅ Robust Security Check
  useEffect(() => {
    // Check 1: If not logged in at all -> Go to Login
    if (!user) {
      navigate("/login");
      return;
    }

    // Check 2: If logged in but NOT admin -> Go to Home
    if (user.email !== "admin@system.com") {
      alert("Access Denied. Admins only.");
      navigate("/");
    }
  }, [user, navigate]);

  // 2. Fetch Data (Only if Admin)
  const fetchData = async () => {
    if (!user || user.email !== "admin@system.com") return; // Double protection

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
      alert("Image upload failed! Check CORS settings.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Product Logic
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
       alert(`Product Added! ID: ${safeCode}`);
       setBatchCode(""); setProductName(""); setProductImage(null); setImagePreview(null);
       fetchData(); 
    } catch (e) { alert(e.message); }
  };

  // Scheme Logic
  const searchWebSchemes = async () => {
    setSearching(true);
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${searchQuery}`;
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

  const handleAddScheme = async () => {
    try {
      await addDoc(collection(db, "schemes"), { title: schemeTitle, description: schemeDesc, category: schemeCategory });
      alert("Scheme Posted!"); setSchemeTitle(""); setSchemeDesc(""); fetchData();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (col, id) => {
    if(confirm("Delete this?")) { await deleteDoc(doc(db, col, id)); fetchData(); }
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

  // 3. BLOCK RENDER: If not admin, do not show ANYTHING
  if (!user || user.email !== "admin@system.com") {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
            <Loader className="animate-spin text-red-600" size={40} />
            <h2 className="text-xl font-bold text-gray-700">Verifying Access...</h2>
        </div>
      );
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin text-green-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white p-6 fixed h-full hidden md:block z-20">
        <h2 className="text-2xl font-bold mb-8 text-green-400 tracking-tight">Admin Panel</h2>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab("products")} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "products" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <Package size={20} /> Products
          </button>
          <button onClick={() => setActiveTab("schemes")} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "schemes" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <ScrollText size={20} /> Schemes
          </button>
          <button onClick={() => setActiveTab("farmers")} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "farmers" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <Users size={20} /> Farmers
          </button>
          <button onClick={() => setActiveTab("complaints")} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === "complaints" ? "bg-green-600" : "hover:bg-gray-800"}`}>
            <MessageSquare size={20} /> Help Desk
          </button>
        </nav>
        <button onClick={() => auth.signOut()} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-600/20 text-red-400 absolute bottom-6 left-6 right-6">
            <LogOut size={20} /> Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="md:ml-64 flex-1 p-8 pt-24">
        
        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Verified Products</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={20} className="text-green-600"/> Add New Batch</h3>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                    <input value={batchCode} onChange={(e)=>setBatchCode(e.target.value.toUpperCase())} placeholder="Batch Code" className="border p-3 rounded-xl w-full outline-none mb-4" />
                    <input value={productName} onChange={(e)=>setProductName(e.target.value)} placeholder="Product Name" className="border p-3 rounded-xl w-full outline-none" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 bg-gray-50 relative overflow-hidden">
                        {imagePreview ? (
                            <>
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <button onClick={(e) => {e.preventDefault(); setProductImage(null); setImagePreview(null);}} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X size={14}/></button>
                            </>
                        ) : (
                            <><ImageIcon className="text-gray-400" size={24} /><span className="text-xs text-gray-500 mt-1">Upload</span></>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                </div>
                <button onClick={handleAddProduct} disabled={uploading} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 disabled:bg-gray-400 h-fit self-end">
                  {uploading ? "Uploading..." : "Verify & Add"}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b"><tr><th className="p-4">Img</th><th className="p-4">Code</th><th className="p-4">Name</th><th className="p-4">Action</th></tr></thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} className="border-b items-center">
                          <td className="p-4">{p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border" />}</td>
                          <td className="p-4 font-mono text-blue-600">{p.id}</td>
                          <td className="p-4">{p.name}</td>
                          <td className="p-4"><button onClick={()=>handleDelete("products", p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={18}/></button></td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* SCHEMES TAB */}
        {activeTab === "schemes" && (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Manage Schemes</h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm border border-blue-100 mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-800"><Globe size={20}/> Import from Google</h3>
              <div className="flex gap-2 mb-4">
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 p-3 border rounded-xl outline-none" placeholder="Search keywords..." />
                <button onClick={searchWebSchemes} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2" disabled={searching}>
                  {searching ? <Loader className="animate-spin" size={18} /> : <Search size={18} />} Fetch
                </button>
              </div>
              {webResults.length > 0 && (
                <div className="grid gap-3 max-h-60 overflow-y-auto pr-2">
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
              <h3 className="text-lg font-bold mb-4">Post Manually</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input value={schemeTitle} onChange={(e)=>setSchemeTitle(e.target.value)} placeholder="Scheme Title" className="border p-3 rounded-xl flex-1 outline-none" />
                  <select value={schemeCategory} onChange={(e)=>setSchemeCategory(e.target.value)} className="border p-3 rounded-xl outline-none bg-white">
                    <option value="Scheme">Scheme</option><option value="Subsidy">Subsidy</option><option value="Loan">Loan</option>
                  </select>
                </div>
                <textarea value={schemeDesc} onChange={(e)=>setSchemeDesc(e.target.value)} placeholder="Description" className="border p-3 rounded-xl w-full h-20 outline-none" />
                <button onClick={handleAddScheme} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700">Post Scheme</button>
              </div>
            </div>
            <div className="grid gap-4">
              {schemes.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start hover:shadow-md transition">
                  <div>
                    <h4 className="font-bold text-xl text-gray-800 mb-1 flex items-center gap-2">{s.title} {s.category === "Imported Subsidy" && <Globe size={14} className="text-blue-500" />}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">{s.description}</p>
                    <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full mt-2 inline-block">{s.category}</span>
                  </div>
                  <button onClick={() => handleDelete("schemes", s.id)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FARMERS TAB */}
        {activeTab === "farmers" && (
          <div className="animate-fade-in relative">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Registered Farmers</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Actions</th></tr></thead>
                  <tbody>
                    {farmers.length === 0 ? (
                        <tr><td colSpan="3" className="p-6 text-center text-gray-500">No farmers found.</td></tr>
                    ) : (
                        farmers.map(f => (
                        <tr key={f.id} className="border-b">
                            <td className="p-4 font-medium flex items-center gap-2"><Users size={18} className="text-green-600"/> {f.name || "Farmer"}</td>
                            <td className="p-4 text-gray-600">{f.email}</td>
                            <td className="p-4 flex items-center gap-2">
                                <a href={`mailto:${f.email}?subject=Message from Kisan Sahayak Admin`} className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 text-sm transition">
                                    <Mail size={16} /> Contact
                                </a>
                                {/* ✅ Chat Button */}
                                <button 
                                  onClick={() => setActiveChat({ id: f.uid || f.id, name: f.name || "Farmer" })}
                                  className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-200 text-sm transition"
                                >
                                  <MessageSquare size={16} /> Chat
                                </button>
                            </td>
                        </tr>
                        ))
                    )}
                  </tbody>
               </table>
            </div>

            {/* ✅ Chat Interface Overlay */}
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

        {/* COMPLAINTS TAB */}
        {activeTab === "complaints" && (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Help Desk & Complaints</h2>
            <div className="space-y-4">
                {complaints.length === 0 ? <p className="text-gray-400 bg-white p-6 rounded-xl">No complaints found.</p> : complaints.map(c => (
                   <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start gap-4">
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
      </div>
    </div>
  );
};

export default AdminDashboard;