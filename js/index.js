import { auth, onAuthStateChanged } from "./firebase.js";
import { registerServiceWorker } from "./common.js";

registerServiceWorker();

console.log("🏠 Index page: Checking authentication...");

// Immediate check for existing user
const currentUser = auth.currentUser;
if (currentUser) {
  console.log("✅ User already logged in, redirecting to dashboard");
  window.location.replace("./dashboard.html");
} else {
  console.log("⏳ Waiting for auth state...");
  
  // Short timeout to prevent hanging
  const timeout = setTimeout(() => {
    console.log("⏰ Auth timeout - redirecting to login");
    window.location.replace("./login.html");
  }, 2000);

  // Listen for auth state
  onAuthStateChanged(auth, (user) => {
    clearTimeout(timeout);
    console.log("📡 Auth state:", user ? "✅ User logged in" : "❌ No user");
    
    if (user) {
      window.location.replace("./dashboard.html");
    } else {
      window.location.replace("./login.html");
    }
  });
}