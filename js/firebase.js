import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxX9PnweFhQHh1urVPZjeTYvfHogIoOBY",
  authDomain: "l-gallery-2cafd.firebaseapp.com",
  projectId: "l-gallery-2cafd",
  storageBucket: "l-gallery-2cafd.firebasestorage.app",
  messagingSenderId: "900530573003",
  appId: "1:900530573003:web:5d1e92805cac6f9c79554e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// CRITICAL: Set persistence to INDEXEDDB which survives browser restarts
// This must be done before any other auth operations
async function initializeAuth() {
  try {
    await setPersistence(auth, indexedDBLocalPersistence);
    console.log("✅ Firebase auth persistence set to INDEXEDDB - user will stay logged in forever");
    
    // Check current user after persistence is set
    const user = auth.currentUser;
    if (user) {
      console.log("✅ Current user:", user.uid);
      // Force token refresh to ensure session is valid
      await user.getIdToken(true);
    }
  } catch (error) {
    console.error("❌ Error setting indexedDB persistence:", error);
    // Fallback to local persistence
    try {
      await setPersistence(auth, browserLocalPersistence);
      console.log("✅ Fallback to LOCAL persistence successful");
    } catch (err) {
      console.error("❌ All persistence methods failed:", err);
    }
  }
}

// Initialize immediately
initializeAuth();

export { auth, db, googleProvider, onAuthStateChanged };