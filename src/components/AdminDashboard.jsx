// src/components/AdminDashboard.jsx
import { useState, useEffect, useRef } from "react";
import { db, auth, storage } from "../firebase";
import { 
  collection, addDoc, getDocs, deleteDoc, doc, setDoc, 
  query, where, updateDoc, orderBy, limit, startAfter, writeBatch 
} from "firebase/firestore"; // ✅ Added writeBatch for fast deletion
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Trash2, Package, ScrollText, Users, LogOut, Loader, Search, Globe, 
  Image as ImageIcon, X, Mail, MessageSquare, CheckCircle, Menu, TrendingUp, 
  MessageCircle, Edit2, MapPin, FileText, XCircle, Send, AlertCircle, Tractor,
  History, Clock, Upload, Download, FileSpreadsheet, CheckSquare, Square, AlertTriangle
} from "lucide-react"; 
import emailjs from "@emailjs/browser"; 
import * as XLSX from 'xlsx'; // Import SheetJS for Excel handling
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
  const [equipmentList, setEquipmentList] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false); 

  // Pagination States for Products
  const [lastProductDoc, setLastProductDoc] = useState(null);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const PRODUCTS_PER_PAGE = 10;

  // Chat State
  const [activeChat, setActiveChat] = useState(null);

  // Bulk Selection State
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Refs for Bulk File Inputs
  const productFileRef = useRef(null);
  const schemeFileRef = useRef(null);
  const marketFileRef = useRef(null);
  const equipmentFileRef = useRef(null); 

  // --- PRODUCT FORM STATE ---
  const [productName, setProductName] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // --- SCHEME FORM STATE ---
  const [schemeTitle, setSchemeTitle] = useState("");
  const [schemeDesc, setSchemeDesc] = useState("");
  const [schemeCategory, setSchemeCategory] = useState("Scheme");
  const [schemeImage, setSchemeImage] = useState(null); 
  const [schemeImagePreview, setSchemeImagePreview] = useState(null); 

  // --- MARKET PRICE FORM STATE ---
  const [marketCrop, setMarketCrop] = useState("");
  const [marketMandi, setMarketMandi] = useState("");
  const [marketPrice, setMarketPrice] = useState("");
  const [marketChange, setMarketChange] = useState("up");
  const [marketImage, setMarketImage] = useState(null); 
  const [marketImagePreview, setMarketImagePreview] = useState(null); 
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
    if (user.email !== "admin@system.com") {
      alert("Access Denied. Admins only.");
      navigate("/");
    }
  }, [user, navigate]);

  // Clear selections when tab changes
  useEffect(() => {
    setSelectedItems(new Set());
  }, [activeTab]);

  // --- Fetching Functions ---
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
      if (snapshot.docs.length < PRODUCTS_PER_PAGE) setHasMoreProducts(false);
      if (isNextPage) setProducts(prev => [...prev, ...newProducts]);
      else setProducts(newProducts);
    } catch (err) { console.error(err); showToast("Failed to fetch products", "error"); }
    setLoading(false);
  };

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const sSnap = await getDocs(collection(db, "schemes"));
      setSchemes(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const fSnap = await getDocs(query(collection(db, "users"), where("role", "==", "farmer")));
      setFarmers(fSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const cSnap = await getDocs(collection(db, "complaints"));
      setComplaints(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchForum = async () => {
    setLoading(true);
    try {
      const forumSnap = await getDocs(collection(db, "forum_posts"));
      setForumPosts(forumSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchMarket = async () => {
    setLoading(true);
    try {
      const marketSnap = await getDocs(collection(db, "market_prices"));
      setMarketPrices(marketSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const appSnap = await getDocs(query(collection(db, "applications"), orderBy("appliedAt", "desc")));
      setApplications(appSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const eqSnap = await getDocs(collection(db, "equipment"));
      setEquipmentList(eqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { 
    if (user?.email === "admin@system.com") {
        if (activeTab === "products" && products.length === 0) fetchProducts();
        if (activeTab === "schemes") fetchSchemes();
        if (activeTab === "farmers") fetchFarmers();
        if (activeTab === "complaints") fetchComplaints();
        if (activeTab === "forum") fetchForum();
        if (activeTab === "market") fetchMarket();
        if (activeTab === "applications") fetchApplications();
        if (activeTab === "equipment") fetchEquipment(); 
    }
  }, [user, activeTab]);

  // --- EXCEL / BULK OPERATIONS ---

  const handleBulkUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setBulkLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
        try {
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            if (jsonData.length === 0) {
                showToast("File is empty", "error");
                setBulkLoading(false);
                return;
            }

            let successCount = 0;

            for (const row of jsonData) {
                if (type === "products") {
                    const code = row.code || row.batchCode || `BTC-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                    const safeCode = code.toString().replace(/\//g, "-").toUpperCase();
                    await setDoc(doc(db, "products", safeCode), {
                        name: row.name || "Unnamed Product",
                        status: "Genuine",
                        addedBy: "Bulk Upload",
                        verificationDate: new Date().toISOString(),
                        imageUrl: row.imageUrl || null 
                    });
                } else if (type === "schemes") {
                    await addDoc(collection(db, "schemes"), {
                        title: row.title || "New Scheme",
                        description: row.description || "",
                        category: row.category || "Scheme",
                        imageUrl: row.imageUrl || null,
                        timestamp: new Date()
                    });
                } else if (type === "market") {
                    // Capture all fields from Demo Data
                    await addDoc(collection(db, "market_prices"), {
                        crop: row.crop || "Crop",
                        variety: row.variety || "Standard",       
                        market: row.market || "Mandi",
                        district: row.district || "",             
                        state: row.state || "",                   
                        price: row.price ? `₹${row.price}/qt` : "₹0/qt",
                        min_price: row.min_price ? `₹${row.min_price}/qt` : "", 
                        max_price: row.max_price ? `₹${row.max_price}/qt` : "", 
                        date: row.date || new Date().toLocaleDateString(),      
                        change: row.change || "stable",
                        imageUrl: row.imageUrl || null, 
                        timestamp: new Date()
                    });
                } else if (type === "equipment") {
                    await addDoc(collection(db, "equipment"), {
                        name: row.name || "Unnamed Equipment",
                        type: row.type || "Rent", 
                        price: row.price || "0",
                        location: row.location || "Unknown",
                        description: row.description || "",
                        imageUrl: row.imageUrl || null,
                        ownerEmail: "admin@system.com",
                        ownerName: "Kishan Sahayak Admin",
                        status: "Available",
                        unavailableDates: [],
                        createdAt: new Date()
                    });
                }
                successCount++;
            }

            showToast(`Successfully uploaded ${successCount} items!`);
            
            if (type === "products") { setProducts([]); fetchProducts(); }
            if (type === "schemes") { setSchemes([]); fetchSchemes(); }
            if (type === "market") { setMarketPrices([]); fetchMarket(); }
            if (type === "equipment") { setEquipmentList([]); fetchEquipment(); } 

        } catch (error) {
            console.error("Bulk Upload Error:", error);
            showToast("Failed to parse file. Check format.", "error");
        } finally {
            setBulkLoading(false);
            if(productFileRef.current) productFileRef.current.value = "";
            if(schemeFileRef.current) schemeFileRef.current.value = "";
            if(marketFileRef.current) marketFileRef.current.value = "";
            if(equipmentFileRef.current) equipmentFileRef.current.value = ""; 
        }
    };

    reader.readAsBinaryString(file);
  };

  const downloadApplicationsExcel = () => {
    if (applications.length === 0) return showToast("No data to export", "error");

    const worksheet = XLSX.utils.json_to_sheet(applications.map(app => ({
        "Applicant Name": app.applicantName,
        "Email": app.applicantEmail,
        "Scheme Applied": app.schemeTitle,
        "Status": app.status,
        "Applied Date": app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString() : "N/A",
        "Exact Location": app.location?.lat && app.location?.lng 
            ? `http://googleusercontent.com/maps.google.com/?q=${app.location.lat},${app.location.lng}` 
            : "Location not available"
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Applications");
    
    XLSX.writeFile(workbook, "Scheme_Applications_Report.xlsx");
    showToast("Report Downloaded!");
  };

  // --- BULK DELETE & WIPE LOGIC ---

  const toggleSelection = (id) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
        newSelection.delete(id);
    } else {
        newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = (items) => {
    if (items.every(item => selectedItems.has(item.id))) {
        setSelectedItems(new Set()); 
    } else {
        const newSelection = new Set(selectedItems);
        items.forEach(item => newSelection.add(item.id));
        setSelectedItems(newSelection);
    }
  };

  const handleBulkDelete = async (collectionName) => {
    if (selectedItems.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.size} items? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
        const batch = writeBatch(db); // Use batch for deleting selected items too
        selectedItems.forEach(id => {
            const docRef = doc(db, collectionName, id);
            batch.delete(docRef);
        });
        await batch.commit();
        
        showToast(`Successfully deleted ${selectedItems.size} items.`);
        
        if (collectionName === "products") setProducts(prev => prev.filter(p => !selectedItems.has(p.id)));
        if (collectionName === "schemes") setSchemes(prev => prev.filter(s => !selectedItems.has(s.id)));
        if (collectionName === "users") setFarmers(prev => prev.filter(f => !selectedItems.has(f.id)));
        if (collectionName === "complaints") setComplaints(prev => prev.filter(c => !selectedItems.has(c.id)));
        if (collectionName === "market_prices") setMarketPrices(prev => prev.filter(m => !selectedItems.has(m.id)));
        if (collectionName === "forum_posts") setForumPosts(prev => prev.filter(p => !selectedItems.has(p.id)));
        if (collectionName === "equipment") setEquipmentList(prev => prev.filter(e => !selectedItems.has(e.id))); 

        setSelectedItems(new Set()); 

    } catch (error) {
        console.error("Bulk Delete Error:", error);
        showToast("Failed to delete selected items.", "error");
    } finally {
        setIsDeleting(false);
    }
  };

  // ✅ OPTIMIZED: WIPE ALL LOGIC USING BATCHED WRITES (FASTER)
  const handleWipeCollection = async (collectionName) => {
    if(!window.confirm(`⚠️ EXTREME DANGER: This will delete ALL data in "${collectionName}".\n\nThis includes items NOT visible on the current page.\nAre you absolutely sure?`)) return;
    
    const prompt = window.prompt(`Type "DELETE" to confirm wiping all ${collectionName}:`);
    if (prompt !== "DELETE") return showToast("Deletion cancelled. Data is safe.", "error");

    setBulkLoading(true);
    try {
        let deletedCount = 0;
        
        while (true) {
            // Fetch batches of 500 (Firestore limit for batch writes)
            const q = query(collection(db, collectionName), limit(500)); 
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) break;

            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit(); // Single request for 500 deletes
            
            deletedCount += snapshot.size;
        }

        showToast(`Successfully deleted ALL ${deletedCount} items from DB.`);
        
        if (collectionName === "products") setProducts([]);
        if (collectionName === "schemes") setSchemes([]);
        if (collectionName === "users") setFarmers([]);
        if (collectionName === "complaints") setComplaints([]);
        if (collectionName === "market_prices") setMarketPrices([]);
        if (collectionName === "forum_posts") setForumPosts([]);
        if (collectionName === "applications") setApplications([]);
        if (collectionName === "equipment") setEquipmentList([]); 

    } catch (e) {
        console.error(e);
        showToast("Error wiping data: " + e.message, "error");
    } finally {
        setBulkLoading(false);
    }
  };

  // --- Handlers & Upload Logic ---

  const handleProductImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setProductImage(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const handleSchemeImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setSchemeImage(file); setSchemeImagePreview(URL.createObjectURL(file)); }
  };

  const handleMarketImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setMarketImage(file); setMarketImagePreview(URL.createObjectURL(file)); }
  };

  const uploadFile = async (file, path) => {
    if (!file) return null;
    const fileRef = ref(storage, `${path}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const handleAddProduct = async () => {
    if (!batchCode || !productName) return showToast("Please fill all fields", "error");
    setUploading(true);
    const safeCode = batchCode.replace(/\//g, "-").toUpperCase(); 
    
    try {
       let imageUrl = await uploadFile(productImage, "products");
       await setDoc(doc(db, "products", safeCode), {
         name: productName, status: "Genuine", addedBy: "Admin",
         verificationDate: new Date().toISOString(), imageUrl 
       });
       showToast("Product Added Successfully!");
       setBatchCode(""); setProductName(""); setProductImage(null); setImagePreview(null);
       setProducts([]); setLastProductDoc(null); setHasMoreProducts(true); fetchProducts(); 
    } catch (e) { showToast(e.message, "error"); }
    finally { setUploading(false); }
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
    setUploading(true);
    try {
      let imageUrl = null;
      if (schemeImage) {
          imageUrl = await uploadFile(schemeImage, "schemes");
      } else {
          imageUrl = await fetchGoogleImage(schemeTitle);
      }

      await addDoc(collection(db, "schemes"), { 
        title: schemeTitle, description: schemeDesc, category: schemeCategory, imageUrl
      });
      showToast("Scheme Posted!"); 
      setSchemeTitle(""); setSchemeDesc(""); setSchemeImage(null); setSchemeImagePreview(null);
      setSchemes([]); fetchSchemes();
    } catch (e) { showToast(e.message, "error"); }
    finally { setUploading(false); }
  };

  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    try {
      await updateDoc(doc(db, "applications", appId), { status: newStatus });
      setApplications(prev => prev.map(app => app.id === appId ? { ...app, status: newStatus } : app));
      showToast(`Application ${newStatus}!`);
    } catch (error) { showToast("Failed to update status", "error"); }
  };

  const handleAddOrUpdateMarketPrice = async () => {
    if (!marketCrop || !marketMandi || !marketPrice) return showToast("Fill all fields", "error");
    setUploading(true);
    try {
      let imageUrl = null;
      if (marketImage) {
          imageUrl = await uploadFile(marketImage, "market");
      }

      const payload = { crop: marketCrop, market: marketMandi, price: marketPrice, change: marketChange, timestamp: new Date() };
      if (imageUrl) payload.imageUrl = imageUrl; 

      if (editMarketId) {
        await updateDoc(doc(db, "market_prices", editMarketId), payload);
        showToast("Market Price Updated!");
        setEditMarketId(null);
      } else {
        await addDoc(collection(db, "market_prices"), { ...payload, imageUrl });
        showToast("Market Price Added!");
      }
      setMarketCrop(""); setMarketMandi(""); setMarketPrice(""); setMarketImage(null); setMarketImagePreview(null);
      setMarketPrices([]); fetchMarket();
    } catch (e) { showToast(e.message, "error"); }
    finally { setUploading(false); }
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
    if(window.confirm("Delete this item? This cannot be undone.")) { 
      try {
        await deleteDoc(doc(db, col, id)); 
        showToast("Deleted successfully.");
        if (col === "products") setProducts(prev => prev.filter(p => p.id !== id)); 
        if (col === "schemes") setSchemes(prev => prev.filter(s => s.id !== id)); 
        if (col === "users") setFarmers(prev => prev.filter(f => f.id !== id)); 
        if (col === "complaints") setComplaints(prev => prev.filter(c => c.id !== id)); 
        if (col === "market_prices") setMarketPrices(prev => prev.filter(m => m.id !== id)); 
        if (col === "forum_posts") setForumPosts(prev => prev.filter(p => p.id !== id)); 
        if (col === "equipment") setEquipmentList(prev => prev.filter(e => e.id !== id)); 
      } catch(e) { showToast("Error deleting: " + e.message, "error"); }
    }
  };

  const handleResolveComplaint = async (id, farmerEmail, farmerName, originalMessage) => {
    if (!replyText) return showToast("Please enter a reply", "error");
    setUploading(true); 
    try {
      await updateDoc(doc(db, "complaints", id), { status: "Resolved", adminReply: replyText });
      const templateParams = {
        to_name: farmerName || "Farmer", to_email: farmerEmail, complaint_id: id.slice(0, 5),
        user_message: originalMessage, status_message: "Your complaint has been RESOLVED.", admin_reply: replyText
      };
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      showToast(`Complaint Resolved! Email sent to ${farmerEmail}`);
      setResolvingId(null); setReplyText(""); fetchComplaints();
    } catch (e) { showToast("Updated DB but failed to send Email", "error"); } 
    finally { setUploading(false); }
  };

  // --- Render Sections ---

  const renderProducts = () => (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-3xl font-bold text-gray-800">Verified Products</h2>
         
         <div className="flex gap-2">
           {selectedItems.size > 0 && (
              <button 
                  onClick={() => handleBulkDelete("products")}
                  disabled={isDeleting}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition"
              >
                  {isDeleting ? <Loader size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                  Delete Selected ({selectedItems.size})
              </button>
           )}
           
           <button 
              onClick={() => handleWipeCollection("products")}
              className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition"
              title="Delete ALL products in database"
           >
              <AlertTriangle size={18} /> Wipe All Data
           </button>

           <div>
              <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls" 
                  className="hidden" 
                  ref={productFileRef}
                  onChange={(e) => handleBulkUpload(e, "products")}
              />
              <button 
                  onClick={() => productFileRef.current.click()}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
              >
                  {bulkLoading ? <Loader size={18} className="animate-spin"/> : <Upload size={18}/>}
                  Bulk Import
              </button>
           </div>
         </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={20} className="text-green-600"/> Add New Batch</h3>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1 w-full space-y-3">
              <input value={batchCode} onChange={(e)=>setBatchCode(e.target.value.toUpperCase())} placeholder="Batch Code (e.g. BTC-2024)" className="border p-3 rounded-xl w-full outline-none focus:ring-2 focus:ring-green-500" />
              <input value={productName} onChange={(e)=>setProductName(e.target.value)} placeholder="Product Name" className="border p-3 rounded-xl w-full outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="flex flex-col items-center gap-2 w-full md:w-auto">
              <label className="w-full md:w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 bg-gray-50 relative overflow-hidden transition-colors">
                  {imagePreview ? ( <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> ) : ( <><ImageIcon className="text-gray-400" size={24} /><span className="text-xs text-gray-500 mt-1">Upload</span></> )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleProductImageChange} />
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
             <thead className="bg-gray-50 border-b sticky top-0 z-10">
               <tr>
                 <th className="p-4 w-12">
                   <button onClick={() => toggleSelectAll(products)} className="text-gray-500 hover:text-gray-700">
                     {products.length > 0 && products.every(p => selectedItems.has(p.id)) ? <CheckSquare size={20} /> : <Square size={20} />}
                   </button>
                 </th>
                 <th className="p-4">Img</th>
                 <th className="p-4">Code</th>
                 <th className="p-4">Name</th>
                 <th className="p-4">Action</th>
               </tr>
             </thead>
             <tbody>
               {products.map(p => (
                 <tr key={p.id} className={`border-b items-center transition-colors ${selectedItems.has(p.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                     <td className="p-4">
                       <button onClick={() => toggleSelection(p.id)} className="text-gray-500 hover:text-blue-600">
                         {selectedItems.has(p.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} />}
                       </button>
                     </td>
                     <td className="p-4">{p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border" />}</td>
                     <td className="p-4 font-mono text-blue-600 font-bold">{p.id}</td>
                     <td className="p-4 font-medium">{p.name}</td>
                     <td className="p-4"><button onClick={()=>handleDelete("products", p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash2 size={18}/></button></td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
         {hasMoreProducts && (
            <div className="p-4 border-t flex justify-center">
               <button onClick={() => fetchProducts(true)} disabled={loading} className="text-green-600 font-bold hover:text-green-700 disabled:opacity-50 text-sm flex items-center gap-2">
                  {loading ? <Loader className="animate-spin" size={16}/> : "Load More Products"}
               </button>
            </div>
         )}
      </div>
    </div>
  );

  const renderSchemes = () => (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-3xl font-bold text-gray-800">Manage Schemes</h2>
         
         <div className="flex gap-2">
            {selectedItems.size > 0 && (
                <button 
                    onClick={() => handleBulkDelete("schemes")}
                    disabled={isDeleting}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition"
                >
                    {isDeleting ? <Loader size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                    Delete ({selectedItems.size})
                </button>
            )}

            <button 
                onClick={() => handleWipeCollection("schemes")}
                className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition"
            >
                <AlertTriangle size={18} /> Wipe All
            </button>

            <div>
                <input 
                    type="file" 
                    accept=".csv, .xlsx, .xls" 
                    className="hidden" 
                    ref={schemeFileRef}
                    onChange={(e) => handleBulkUpload(e, "schemes")}
                />
                <button 
                    onClick={() => schemeFileRef.current.click()}
                    disabled={bulkLoading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
                >
                    {bulkLoading ? <Loader size={18} className="animate-spin"/> : <Upload size={18}/>}
                    Bulk Import
                </button>
            </div>
         </div>
      </div>

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
          <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="space-y-3 flex-1 w-full">
                <div className="flex gap-3">
                  <input value={schemeTitle} onChange={(e)=>setSchemeTitle(e.target.value)} placeholder="Scheme Title" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                  <select value={schemeCategory} onChange={(e)=>setSchemeCategory(e.target.value)} className="border p-3 rounded-xl outline-none bg-white text-sm">
                    <option value="Scheme">Scheme</option><option value="Subsidy">Subsidy</option><option value="Loan">Loan</option>
                  </select>
                </div>
                <textarea value={schemeDesc} onChange={(e)=>setSchemeDesc(e.target.value)} placeholder="Description" className="border p-3 rounded-xl w-full h-20 outline-none focus:ring-2 focus:ring-green-500 text-sm" />
              </div>
              
              <div className="w-full md:w-auto flex flex-col gap-2">
                  <label className="w-full md:w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 bg-gray-50 relative overflow-hidden transition-colors">
                      {schemeImagePreview ? ( <img src={schemeImagePreview} alt="Preview" className="w-full h-full object-cover" /> ) : ( <><ImageIcon className="text-gray-400" size={24} /><span className="text-xs text-gray-500 mt-1">Image</span></> )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleSchemeImageChange} />
                  </label>
                  <button onClick={handleAddScheme} disabled={uploading} className="bg-green-600 text-white w-full py-2 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm text-sm">
                      {uploading ? <Loader className="animate-spin inline mr-1" size={14}/> : <Plus size={16} className="inline mr-1"/>} Post
                  </button>
              </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 px-2">
         <button onClick={() => toggleSelectAll(schemes)} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900">
            {schemes.length > 0 && schemes.every(s => selectedItems.has(s.id)) ? <CheckSquare size={18} /> : <Square size={18} />}
            Select All on Page
         </button>
      </div>

      <div className="grid gap-4">
        {schemes.map(s => (
          <div key={s.id} className={`bg-white p-5 rounded-2xl shadow-sm border flex justify-between items-start transition ${selectedItems.has(s.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-100 hover:shadow-md'}`}>
            <div className="flex gap-4">
              <button onClick={() => toggleSelection(s.id)} className="text-gray-400 hover:text-blue-600 mt-1">
                 {selectedItems.has(s.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} />}
              </button>
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
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-3xl font-bold text-gray-800">Scheme Applications</h2>
         <div className="flex gap-2">
             <button 
                onClick={() => handleWipeCollection("applications")}
                className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition"
             >
                <AlertTriangle size={18} /> Wipe All
             </button>
             <button 
                onClick={downloadApplicationsExcel}
                className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-800 transition shadow-md"
             >
                <Download size={18} /> Export Report
             </button>
         </div>
      </div>

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

  const renderComplaints = () => {
    const pendingComplaints = complaints.filter(c => c.status === "Pending");
    const resolvedComplaints = complaints.filter(c => c.status === "Resolved");

    const ComplaintCard = ({ c }) => (
        <div key={c.id} className={`bg-white p-6 rounded-2xl shadow-sm border flex flex-col gap-4 transition group relative ${selectedItems.has(c.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-100 hover:shadow-md'}`}>
             <div className="absolute top-4 left-4">
                <button onClick={() => toggleSelection(c.id)} className="text-gray-400 hover:text-blue-600">
                    {selectedItems.has(c.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} />}
                </button>
            </div>
            <button 
                onClick={() => handleDelete("complaints", c.id)} 
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                title="Delete Complaint"
            >
                <Trash2 size={18} />
            </button>

            <div className="flex justify-between items-start pl-8">
                <div className="flex-1 pr-8">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${c.status==="Resolved"?"bg-green-50 border-green-100 text-green-700":"bg-yellow-50 border-yellow-100 text-yellow-700"}`}>{c.status}</span>
                        <h4 className="font-bold text-lg text-gray-800">{c.subject}</h4>
                    </div>
                    <p className="text-gray-700 text-sm mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">"{c.message}"</p>
                    <div className="flex gap-4 text-xs text-gray-400 items-center">
                        <span className="flex items-center gap-1"><Users size={12}/> {c.farmerName}</span>
                        <span className="flex items-center gap-1"><Mail size={12}/> {c.email}</span>
                        {c.urgency && (
                            <span className={`flex items-center gap-1 font-bold ${c.urgency === 'High' ? 'text-red-500' : 'text-blue-500'}`}>
                                <AlertCircle size={12}/> {c.urgency} Priority
                            </span>
                        )}
                    </div>
                    
                    {c.aiSolution && c.status === "Pending" && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100 text-xs">
                            <span className="font-bold text-purple-700 block mb-1">🤖 AI Suggested Fix:</span>
                            <p className="text-purple-600">{c.aiSolution}</p>
                        </div>
                    )}

                    {c.adminReply && (
                        <div className="mt-4 pl-4 border-l-2 border-green-500">
                            <span className="text-xs font-bold text-green-600 uppercase">Resolved with Reply:</span>
                            <p className="text-gray-600 text-sm mt-1">{c.adminReply}</p>
                        </div>
                    )}
                </div>
            </div>
            
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
                <button onClick={() => setResolvingId(c.id)} className="bg-gray-900 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 flex items-center gap-2 transition self-start">
                    <MessageSquare size={16}/> Reply & Resolve
                </button>
                )}
            </div>
            )}
        </div>
    );

    return (
        <div className="animate-fade-up space-y-12">
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Clock className="text-yellow-500" /> Pending Complaints 
                        <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{pendingComplaints.length}</span>
                    </h2>
                    <div className="flex gap-2">
                        {selectedItems.size > 0 && (
                            <button 
                                onClick={() => handleBulkDelete("complaints")}
                                disabled={isDeleting}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition"
                            >
                                {isDeleting ? <Loader size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                                Delete ({selectedItems.size})
                            </button>
                        )}
                        <button 
                            onClick={() => handleWipeCollection("complaints")}
                            className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition"
                        >
                            <AlertTriangle size={18} /> Wipe All
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4 px-2">
                     <button onClick={() => toggleSelectAll(pendingComplaints)} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900">
                        {pendingComplaints.length > 0 && pendingComplaints.every(c => selectedItems.has(c.id)) ? <CheckSquare size={18} /> : <Square size={18} />}
                        Select All Pending on Page
                     </button>
                </div>

                <div className="space-y-4">
                    {pendingComplaints.length === 0 ? (
                        <p className="text-gray-400 bg-white p-6 rounded-xl text-center border border-dashed border-gray-200">No pending complaints. Good job!</p>
                    ) : (
                        pendingComplaints.map(c => <ComplaintCard key={c.id} c={c} />)
                    )}
                </div>
            </div>

            <div className="border-t pt-8">
                <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                    <History className="text-green-500" /> Resolved History
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">{resolvedComplaints.length}</span>
                </h2>
                
                <div className="flex justify-between items-center mb-4 px-2">
                     <button onClick={() => toggleSelectAll(resolvedComplaints)} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900">
                        {resolvedComplaints.length > 0 && resolvedComplaints.every(c => selectedItems.has(c.id)) ? <CheckSquare size={18} /> : <Square size={18} />}
                        Select All Resolved on Page
                     </button>
                </div>

                <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                    {resolvedComplaints.length === 0 ? (
                        <p className="text-gray-400 bg-white p-6 rounded-xl text-center border border-dashed border-gray-200">No history yet.</p>
                    ) : (
                        resolvedComplaints.map(c => <ComplaintCard key={c.id} c={c} />)
                    )}
                </div>
            </div>
        </div>
    );
  };

  // --- 🆕 RENDER EQUIPMENT SECTION ---
  const renderEquipment = () => (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-3xl font-bold text-gray-800">Equipment Listings</h2>
         
         <div className="flex gap-2">
            {selectedItems.size > 0 && (
                <button 
                    onClick={() => handleBulkDelete("equipment")}
                    disabled={isDeleting}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition"
                >
                    {isDeleting ? <Loader size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                    Delete ({selectedItems.size})
                </button>
            )}

            <button 
                onClick={() => handleWipeCollection("equipment")}
                className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition"
            >
                <AlertTriangle size={18} /> Wipe All
            </button>

            {/* 🆕 Bulk Upload for Equipment */}
            <div>
                <input 
                    type="file" 
                    accept=".csv, .xlsx, .xls" 
                    className="hidden" 
                    ref={equipmentFileRef}
                    onChange={(e) => handleBulkUpload(e, "equipment")}
                />
                <button 
                    onClick={() => equipmentFileRef.current.click()}
                    disabled={bulkLoading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
                >
                    {bulkLoading ? <Loader size={18} className="animate-spin"/> : <Upload size={18}/>}
                    Bulk Import
                </button>
            </div>
         </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         {equipmentList.map(item => (
            <div key={item.id} className={`bg-white p-4 rounded-2xl shadow-sm border transition flex flex-col relative ${selectedItems.has(item.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-100 hover:shadow-md'}`}>
                <button onClick={() => toggleSelection(item.id)} className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 z-10 p-2 bg-white/80 rounded-full">
                    {selectedItems.has(item.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} />}
                </button>
                
                <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover rounded-xl mb-3 bg-gray-100"/>
                
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-gray-500">{item.location}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.type === 'Rent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {item.type}
                    </span>
                </div>
                
                <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100">
                    <span className="font-bold text-orange-600">₹{item.price}</span>
                    <button onClick={() => handleDelete("equipment", item.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={16}/>
                    </button>
                </div>
            </div>
         ))}
         {equipmentList.length === 0 && <p className="col-span-full text-center py-10 text-gray-400">No equipment found.</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans pt-16">
      
      {notification && (
        <div className={`fixed top-24 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${notification.type === 'error' ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-white border border-green-100 text-green-700'}`}>
          {notification.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
          <span className="font-bold">{notification.message}</span>
        </div>
      )}

      {/* Mobile Toggle Button (High Z-Index Fix) */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed bottom-6 left-6 z-[100] bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
        title="Open Admin Menu"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-[100] w-64 bg-slate-900 text-white p-6 
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0 md:fixed md:top-16 md:bottom-0 md:left-0 md:z-30
        flex flex-col h-full border-r border-gray-800
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
          className="fixed inset-0 bg-black/60 z-[90] md:hidden backdrop-blur-sm"
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pb-24 overflow-y-auto md:ml-64 max-w-7xl mx-auto w-full">
        
        {activeTab === "products" && renderProducts()}
        {activeTab === "schemes" && renderSchemes()}
        {activeTab === "applications" && renderApplications()}
        {activeTab === "complaints" && renderComplaints()}
        {activeTab === "equipment" && renderEquipment()} 

        {activeTab === "farmers" && (
             <div className="animate-fade-up">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold text-gray-800">Registered Farmers</h2>
                 <div className="flex gap-2">
                    {selectedItems.size > 0 && (
                        <button 
                            onClick={() => handleBulkDelete("users")}
                            disabled={isDeleting}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition"
                        >
                            {isDeleting ? <Loader size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                            Delete ({selectedItems.size})
                        </button>
                    )}
                    {/* 🆕 Wipe All Button */}
                    <button 
                        onClick={() => handleWipeCollection("users")}
                        className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition"
                    >
                        <AlertTriangle size={18} /> Wipe All
                    </button>
                 </div>
               </div>
               
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 w-12">
                                    <button onClick={() => toggleSelectAll(farmers)} className="text-gray-500 hover:text-gray-700">
                                        {farmers.length > 0 && farmers.every(f => selectedItems.has(f.id)) ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </button>
                                </th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                          {farmers.map(f => (
                             <tr key={f.id} className={`border-b transition-colors ${selectedItems.has(f.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                 <td className="p-4">
                                     <button onClick={() => toggleSelection(f.id)} className="text-gray-500 hover:text-blue-600">
                                         {selectedItems.has(f.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} />}
                                     </button>
                                 </td>
                                 <td className="p-4 font-medium flex items-center gap-2"><Users size={18} className="text-green-600"/> {f.name || "Farmer"}</td>
                                 <td className="p-4 text-gray-600">{f.email}</td>
                                 <td className="p-4 flex items-center gap-2">
                                     <button onClick={() => setActiveChat({ id: f.uid || f.id, name: f.name || "Farmer" })} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 text-xs transition">
                                         <MessageSquare size={14} /> Chat
                                     </button>
                                     <button onClick={() => handleDelete("users", f.id)} className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100 text-xs transition">
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

        {activeTab === "market" && (
            <div className="animate-fade-up">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold text-gray-800">Manage Market Prices</h2>
                 
                 <div className="flex gap-2">
                    {selectedItems.size > 0 && (
                        <button 
                            onClick={() => handleBulkDelete("market_prices")}
                            disabled={isDeleting}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition"
                        >
                            {isDeleting ? <Loader size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                            Delete ({selectedItems.size})
                        </button>
                    )}

                    {/* 🆕 Wipe All Button */}
                    <button 
                        onClick={() => handleWipeCollection("market_prices")}
                        className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition"
                    >
                        <AlertTriangle size={18} /> Wipe All
                    </button>

                    {/* 🆕 Bulk Upload Button */}
                    <div>
                        <input 
                            type="file" 
                            accept=".csv, .xlsx, .xls" 
                            className="hidden" 
                            ref={marketFileRef}
                            onChange={(e) => handleBulkUpload(e, "market")}
                        />
                        <button 
                            onClick={() => marketFileRef.current.click()}
                            disabled={bulkLoading}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
                        >
                            {bulkLoading ? <Loader size={18} className="animate-spin"/> : <Upload size={18}/>}
                            Bulk Import
                        </button>
                    </div>
                 </div>
              </div>

              <div className={`p-6 rounded-2xl shadow-sm border mb-8 transition-colors ${editMarketId ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${editMarketId ? "text-orange-700" : "text-gray-800"}`}>
                  {editMarketId ? <><Edit2 size={20}/> Editing Price</> : "Add New Price"}
                </h3>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input value={marketCrop} onChange={(e)=>setMarketCrop(e.target.value)} placeholder="Crop (e.g. Wheat)" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                        <input value={marketMandi} onChange={(e)=>setMarketMandi(e.target.value)} placeholder="Mandi" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                        <input value={marketPrice} onChange={(e)=>setMarketPrice(e.target.value)} placeholder="Price" className="border p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                        <select value={marketChange} onChange={(e)=>setMarketChange(e.target.value)} className="border p-3 rounded-xl outline-none bg-white">
                            <option value="up">Trending Up</option><option value="down">Trending Down</option><option value="stable">Stable</option>
                        </select>
                    </div>
                    {/* 🆕 Market Image Input */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 bg-gray-50 transition-colors">
                            {marketImagePreview ? <img src={marketImagePreview} alt="Preview" className="w-8 h-8 rounded object-cover" /> : <ImageIcon size={20} className="text-gray-400" />}
                            <span className="text-sm text-gray-500">{marketImagePreview ? "Change Image" : "Upload Image"}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleMarketImageChange} />
                        </label>
                        <button onClick={handleAddOrUpdateMarketPrice} disabled={uploading} className={`px-6 py-2 rounded-xl font-bold text-white transition shadow-sm ${editMarketId ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}>
                            {uploading ? <Loader className="animate-spin" size={18}/> : (editMarketId ? "Update" : "Add")}
                        </button>
                        {editMarketId && <button onClick={() => { setEditMarketId(null); setMarketCrop(""); setMarketMandi(""); setMarketPrice(""); setMarketImage(null); setMarketImagePreview(null); }} className="px-4 text-gray-500 font-bold">Cancel</button>}
                    </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-4 px-2">
                 <button onClick={() => toggleSelectAll(marketPrices)} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900">
                    {marketPrices.length > 0 && marketPrices.every(m => selectedItems.has(m.id)) ? <CheckSquare size={18} /> : <Square size={18} />}
                    Select All on Page
                 </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketPrices.map(m => (
                  <div key={m.id} className={`bg-white p-5 rounded-2xl shadow-sm border flex justify-between items-center relative overflow-hidden transition ${selectedItems.has(m.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-100 hover:shadow-md'}`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.change === 'up' ? 'bg-green-500' : m.change === 'down' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                      
                      <button onClick={() => toggleSelection(m.id)} className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 z-10">
                          {selectedItems.has(m.id) ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} />}
                      </button>

                      <div className="flex items-center gap-3 pl-3">
                          {m.imageUrl && <img src={m.imageUrl} alt={m.crop} className="w-12 h-12 rounded-full object-cover border border-gray-200" />}
                          <div>
                            <h4 className="font-bold text-lg text-gray-800">{m.crop}</h4>
                            <p className="text-gray-500 text-sm">{m.market}</p>
                          </div>
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

        {activeTab === "forum" && (
           <div className="animate-fade-up">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Community Moderation</h2>
                <div className="flex gap-2">
                    {selectedItems.size > 0 && (
                        <button 
                            onClick={() => handleBulkDelete("forum_posts")}
                            disabled={isDeleting}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition"
                        >
                            {isDeleting ? <Loader size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                            Delete ({selectedItems.size})
                        </button>
                    )}
                    {/* 🆕 Wipe All Button */}
                    <button 
                        onClick={() => handleWipeCollection("forum_posts")}
                        className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition"
                    >
                        <AlertTriangle size={18} /> Wipe All
                    </button>
                </div>
             </div>

             <div className="flex justify-between items-center mb-4 px-2">
                 <button onClick={() => toggleSelectAll(forumPosts)} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900">
                    {forumPosts.length > 0 && forumPosts.every(p => selectedItems.has(p.id)) ? <CheckSquare size={18} /> : <Square size={18} />}
                    Select All on Page
                 </button>
             </div>

             <div className="space-y-4">
                {forumPosts.map(post => (
                   <div key={post.id} className={`bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-start gap-4 transition ${selectedItems.has(post.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-100'}`}>
                       <div className="flex items-center self-start md:self-center mr-2">
                           <button onClick={() => toggleSelection(post.id)} className="text-gray-400 hover:text-blue-600">
                               {selectedItems.has(post.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} />}
                           </button>
                       </div>
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
                       <button onClick={() => handleDelete("forum_posts", post.id)} className="text-red-600 bg-red-50 px-4 py-2 rounded-lg font-bold hover:bg-red-100 hover:text-red-700 transition flex items-center gap-2 text-xs">
                           <Trash2 size={14}/> Delete Post
                       </button>
                   </div>
                ))}
             </div>
           </div>
        )}

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
  );
};

export default AdminDashboard;