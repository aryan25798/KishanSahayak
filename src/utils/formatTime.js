// src/utils/formatTime.js

export const formatTime = (timestamp) => {
  if (!timestamp) return "Just now";
  
  // Handle Firestore Timestamp (which has .toDate()) or standard JS Date/String
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  // Format: "5 Jan, 3:30 PM"
  return date.toLocaleString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};