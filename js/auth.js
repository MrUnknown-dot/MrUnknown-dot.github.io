import { auth, googleProvider, onAuthStateChanged } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { ensureUserDoc, registerServiceWorker } from "./common.js";

const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const googleBtn = document.getElementById("googleBtn"); 
const statusEl = document.getElementById("status");

registerServiceWorker();

let isRedirecting = false;
let authInitialized = false;

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

function validateCredentials(email, password, mode) {
  if (!email) {
    setStatus("Please enter your email.", "error");
    return false;
  }

  if (!password) {
    setStatus("Please enter your password.", "error");
    return false;
  }

  if (mode === "signup" && password.length < 6) {
    setStatus("Password must be at least 6 characters.", "error");
    return false;
  }

  return true;
}

function getFriendlyAuthError(error) {
  const code = error?.code || "";
  console.log("Auth error:", code, error?.message);

  switch (code) {
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/missing-password":
      return "Password is required.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "No account found for this email. Try Sign Up.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/email-already-in-use":
      return "This email is already registered. Use Sign In.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is disabled in Firebase Auth settings.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing sign-in.";
    case "auth/popup-blocked":
      return "Popup blocked by browser. Allow popups for this site.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Authentication.";
    case "auth/network-request-failed":
      return "Network error. Check internet connection and try again.";
    default:
      return error?.message || "Authentication failed. Please try again.";
  }
}

async function handleSignIn() {
  if (isRedirecting) return;
  
  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!validateCredentials(email, password, "signin")) return;

  try {
    setStatus("Signing in...");
    isRedirecting = true;
    
    signInBtn.disabled = true;
    signUpBtn.disabled = true;
    googleBtn.disabled = true;
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Sign in successful:", userCredential.user.uid);
    
    await ensureUserDoc(userCredential.user);
    
    // Force redirect
    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 500);
    
  } catch (error) {
    isRedirecting = false;
    signInBtn.disabled = false;
    signUpBtn.disabled = false;
    googleBtn.disabled = false;
    console.error("Sign-in failed:", error);
    setStatus(getFriendlyAuthError(error), "error");
  }
}

async function handleSignUp() {
  if (isRedirecting) return;
  
  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!validateCredentials(email, password, "signup")) return;

  try {
    setStatus("Creating account...");
    isRedirecting = true;
    
    signInBtn.disabled = true;
    signUpBtn.disabled = true;
    googleBtn.disabled = true;
    
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Sign up successful:", result.user.uid);
    
    await ensureUserDoc(result.user);
    
    // Force redirect
    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 500);
    
  } catch (error) {
    isRedirecting = false;
    signInBtn.disabled = false;
    signUpBtn.disabled = false;
    googleBtn.disabled = false;
    console.error("Sign-up failed:", error);
    setStatus(getFriendlyAuthError(error), "error");
  }
}

// FIXED: Google Sign-in with better redirect handling
async function handleGoogle() {
  if (isRedirecting) return;
  
  try {
    setStatus("Connecting to Google...");
    isRedirecting = true;
    
    signInBtn.disabled = true;
    signUpBtn.disabled = true;
    googleBtn.disabled = true;
    googleBtn.textContent = "Connecting...";
    
    console.log("Starting Google sign-in...");
    
    // Use popup for better UX
    const result = await signInWithPopup(auth, googleProvider);
    
    console.log("Google sign-in successful:", result.user.uid);
    setStatus("Sign in successful! Redirecting...", "success");
    
    // Create user document if needed
    await ensureUserDoc(result.user);
    
    // Force immediate redirect
    console.log("Redirecting to dashboard...");
    window.location.href = "./dashboard.html";
    
  } catch (error) {
    console.error("Google sign-in error:", error);
    
    isRedirecting = false;
    signInBtn.disabled = false;
    signUpBtn.disabled = false;
    googleBtn.disabled = false;
    googleBtn.textContent = "Sign in with Google";
    
    // Check if it's a popup closed error
    if (error.code === 'auth/popup-closed-by-user') {
      setStatus("Sign-in cancelled. Please try again.", "error");
    } else if (error.code === 'auth/popup-blocked') {
      setStatus("Popup was blocked. Please allow popups for this site.", "error");
    } else {
      setStatus(getFriendlyAuthError(error), "error");
    }
  }
}

// Check for redirect result (in case of redirect method)
async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("Redirect result found:", result.user.uid);
      await ensureUserDoc(result.user);
      window.location.href = "./dashboard.html";
    }
  } catch (error) {
    console.error("Redirect result error:", error);
  }
}

// Handle Enter key
function onEnterSubmit(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    handleSignIn();
  }
}

// Event listeners
emailEl.addEventListener("keydown", onEnterSubmit);
passwordEl.addEventListener("keydown", onEnterSubmit);
signInBtn.addEventListener("click", handleSignIn);
signUpBtn.addEventListener("click", handleSignUp);
googleBtn.addEventListener("click", handleGoogle);

// Check for redirect result on page load
checkRedirectResult();

// Monitor auth state
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed in login page:", user ? "User exists" : "No user");
  
  // Only redirect if we're not already redirecting and user exists
  if (user && !isRedirecting && !authInitialized) {
    console.log("User detected, redirecting to dashboard...");
    authInitialized = true;
    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 100);
  }
  
  // Re-enable buttons if no user
  if (!user) {
    signInBtn.disabled = false;
    signUpBtn.disabled = false;
    googleBtn.disabled = false;
    googleBtn.textContent = "Sign in with Google";
    isRedirecting = false;
  }
});
