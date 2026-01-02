// src/components/CommunityForum.jsx
import { useState, useEffect } from "react";
import { db, storage } from "../firebase"; 
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { useAuth } from "../context/AuthContext"; 
import { MessageSquare, Send, User, Loader, Calendar, Image as ImageIcon, X, CornerDownRight } from "lucide-react"; 

// ✅ INTERNAL COMPONENT: Individual Post Item (Handles its own comments)
const ForumPost = ({ post, user }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Fetch comments when the user clicks "Reply" (Lazy Load)
  useEffect(() => {
    let unsubscribe;
    if (showComments) {
      setLoadingComments(true);
      const commentsRef = collection(db, "forum_posts", post.id, "comments");
      const q = query(commentsRef, orderBy("timestamp", "asc"));

      unsubscribe = onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingComments(false);
      });
    }
    return () => unsubscribe && unsubscribe();
  }, [showComments, post.id]);

  // Handle adding a comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const commentsRef = collection(db, "forum_posts", post.id, "comments");
      await addDoc(commentsRef, {
        text: commentText,
        authorName: user?.displayName || "Farmer",
        authorEmail: user?.email,
        timestamp: serverTimestamp()
      });
      setCommentText(""); // Clear input
    } catch (error) {
      console.error("Error commenting:", error);
      alert("Failed to send reply.");
    }
    setSubmittingComment(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Just now";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-IN", {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-up">
      {/* Post Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-green-200 rounded-full flex items-center justify-center text-emerald-700 shadow-inner">
            <User size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 leading-none">{post.authorName}</h4>
            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Calendar size={10} /> {formatDate(post.timestamp)}
            </span>
          </div>
        </div>
      </div>

      {/* Post Image */}
      {post.imageUrl && (
        <div className="mb-4 pl-0 sm:pl-[52px]">
           <img 
             src={post.imageUrl} 
             alt="Post content" 
             className="rounded-xl border border-slate-200 max-h-96 w-full object-cover shadow-sm" 
             loading="lazy"
           />
        </div>
      )}

      {/* Post Text */}
      <p className="text-slate-700 leading-relaxed text-lg pl-0 sm:pl-[52px] mb-4 whitespace-pre-wrap">
        {post.text}
      </p>
      
      {/* Reply Toggle Button */}
      <div className="pl-0 sm:pl-[52px] pt-4 border-t border-gray-50 flex gap-4">
        <button 
          onClick={() => setShowComments(!showComments)}
          className={`text-sm font-bold flex items-center gap-2 transition-colors ${showComments ? "text-emerald-600" : "text-slate-400 hover:text-emerald-600"}`}
        >
          <MessageSquare size={16} /> 
          {comments.length > 0 ? `${comments.length} Replies` : "Reply"}
        </button>
      </div>

      {/* ✅ COMMENT SECTION (Reddit Style) */}
      {showComments && (
        <div className="mt-4 pl-0 sm:pl-[52px] space-y-4">
          
          {/* List of Comments */}
          <div className="space-y-3">
            {loadingComments && <p className="text-xs text-gray-400">Loading replies...</p>}
            {comments.map((comment) => (
              <div key={comment.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-3">
                 <div className="mt-1"><CornerDownRight size={16} className="text-gray-300"/></div>
                 <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-xs font-bold text-slate-700">{comment.authorName}</span>
                       <span className="text-[10px] text-gray-400">{formatDate(comment.timestamp)}</span>
                    </div>
                    <p className="text-sm text-slate-600">{comment.text}</p>
                 </div>
              </div>
            ))}
          </div>

          {/* Add Reply Input */}
          <form onSubmit={handleAddComment} className="flex gap-2 items-start mt-4">
            <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
               <User size={14}/>
            </div>
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Write a reply..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none pr-10"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={submittingComment || !commentText.trim()}
                className="absolute right-2 top-1.5 text-emerald-600 hover:text-emerald-800 disabled:text-gray-300 transition"
              >
                <Send size={16} />
              </button>
            </div>
          </form>

        </div>
      )}
    </div>
  );
};

// ✅ MAIN COMPONENT
const CommunityForum = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  // Fetch Posts
  useEffect(() => {
    const q = query(collection(db, "forum_posts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => console.error("Error:", error));
    return () => unsubscribe();
  }, []);

  // Image Handlers
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImage(file); setPreview(URL.createObjectURL(file)); }
  };
  const clearImage = () => { setImage(null); setPreview(null); };

  // Post Submission
  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !image) return;
    
    setSubmitting(true);
    try {
      let imageUrl = null;
      if (image) {
        const imageRef = ref(storage, `forum_images/${Date.now()}-${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "forum_posts"), {
        text: newPost,
        imageUrl: imageUrl,
        authorName: user?.displayName || "Farmer",
        authorEmail: user?.email,
        timestamp: serverTimestamp(),
        likes: 0
      });

      setNewPost(""); clearImage();
    } catch (error) {
      console.error("Error posting:", error);
      alert("Failed to post.");
    }
    setSubmitting(false);
  };

  return (
    <div className="pt-24 min-h-screen bg-slate-50 px-4 font-sans pb-10">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
           <h1 className="text-4xl font-extrabold text-emerald-900 mb-2">Kisan Chopal 🗣️</h1>
           <p className="text-gray-500">Ask questions, share farming tips, and help your community.</p>
        </div>

        {/* Input Box */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-emerald-100 mb-10">
          <form onSubmit={handlePost}>
            <textarea
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-32 mb-4"
              placeholder="What's on your mind? (e.g. 'Best fertilizer for wheat?')"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            ></textarea>
            
            {preview && (
              <div className="relative w-fit mb-4">
                <img src={preview} alt="Selected" className="h-24 w-auto rounded-xl border border-slate-200" />
                <button type="button" onClick={clearImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={14} /></button>
              </div>
            )}

            <div className="flex justify-between items-center mt-2 border-t pt-4 border-gray-100">
              <div className="flex items-center gap-4">
                 <label className="cursor-pointer flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition bg-slate-100 px-3 py-2 rounded-xl">
                    <ImageIcon size={20} /> <span className="text-sm font-bold">Add Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                 </label>
              </div>
              <button type="submit" disabled={submitting || (!newPost.trim() && !image)} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 transition shadow-lg">
                {submitting ? <Loader className="animate-spin" size={18} /> : <Send size={18} />} Post
              </button>
            </div>
          </form>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {loading && <div className="text-center py-10 text-emerald-600"><Loader className="animate-spin inline mr-2"/> Loading...</div>}
          {!loading && posts.length === 0 && (
             <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
               <MessageSquare size={40} className="mx-auto mb-2 opacity-20"/>
               <p>No posts yet. Be the first to share!</p>
             </div>
          )}
          {posts.map((post) => (
            <ForumPost key={post.id} post={post} user={user} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityForum;