import { auth, db, onAuthStateChanged } from "./firebase.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const TOTAL_DAYS = 30;

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => {
      console.log("Service worker registration failed:", err);
    });
  }
}

function setBottomNavActive() {
  const current = document.body.dataset.page;
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === current);
  });
}

function initTranslatorOverlay() {
  const openBtn = document.getElementById("openTranslatorBtn");
  if (!openBtn || document.getElementById("translatorOverlay")) return;

  const languages = [
    { code: "en", label: "English" },
    { code: "ta", label: "Tamil" },
    { code: "hi", label: "Hindi" },
    { code: "te", label: "Telugu" },
    { code: "ml", label: "Malayalam" },
    { code: "kn", label: "Kannada" },
    { code: "ar", label: "Arabic" },
    { code: "bn", label: "Bengali" },
    { code: "de", label: "German" },
    { code: "es", label: "Spanish" },
    { code: "fr", label: "French" },
    { code: "it", label: "Italian" },
    { code: "ja", label: "Japanese" },
    { code: "ko", label: "Korean" },
    { code: "mr", label: "Marathi" },
    { code: "pa", label: "Punjabi" },
    { code: "pt", label: "Portuguese" },
    { code: "ru", label: "Russian" },
    { code: "ur", label: "Urdu" },
    { code: "zh-CN", label: "Chinese (Simplified)" }
  ];

  const options = languages.map((lang) => `<option value="${lang.code}">${lang.label}</option>`).join("");

  const overlay = document.createElement("div");
  overlay.id = "translatorOverlay";
  overlay.className = "translator-overlay";
  overlay.innerHTML = `
    <div class="translator-modal" role="dialog" aria-modal="true" aria-label="Translator">
      <h3 class="section-title">Translator</h3>
      <div class="field">
        <label for="translatorSourceLang">From</label>
        <select id="translatorSourceLang" class="input">${options}</select>
      </div>
      <div class="field">
        <label for="translatorTargetLang">To</label>
        <select id="translatorTargetLang" class="input">${options}</select>
      </div>
      <div class="field">
        <label for="translatorSourceText">Text</label>
        <textarea id="translatorSourceText" class="input" rows="4" placeholder="Type text..."></textarea>
      </div>
      <div style="display:flex; gap:10px;">
        <button id="translatorSwapBtn" class="btn btn-outline" type="button">Swap</button>
        <button id="translatorRunBtn" class="btn btn-primary" type="button">Translate</button>
      </div>
      <div class="field" style="margin-top:12px;">
        <div class="translator-result-head">
          <label for="translatorResultText">Result</label>
          <button
            id="translatorSpeakBtn"
            class="translator-speak-btn"
            type="button"
            aria-label="Pronounce translated text"
            title="Pronounce translated text"
          >🔊</button>
        </div>
        <textarea id="translatorResultText" class="input" rows="4" readonly placeholder="Translation appears here..."></textarea>
      </div>
      <button id="translatorCopyBtn" class="btn btn-outline" type="button">Copy</button>
      <p id="translatorStatus" class="status"></p>
    </div>
  `;
  document.body.appendChild(overlay);

  const sourceLang = document.getElementById("translatorSourceLang");
  const targetLang = document.getElementById("translatorTargetLang");
  const sourceText = document.getElementById("translatorSourceText");
  const resultText = document.getElementById("translatorResultText");
  const runBtn = document.getElementById("translatorRunBtn");
  const swapBtn = document.getElementById("translatorSwapBtn");
  const copyBtn = document.getElementById("translatorCopyBtn");
  const speakBtn = document.getElementById("translatorSpeakBtn");
  const statusEl = document.getElementById("translatorStatus");

  sourceLang.value = "en";
  targetLang.value = "ta";

  function setStatus(text, type = "") {
    statusEl.textContent = text;
    statusEl.className = `status ${type}`;
  }

  function openOverlay() {
    overlay.classList.add("active");
    setStatus("");
  }

  function closeOverlay() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    overlay.classList.remove("active");
  }

  function speakResultText() {
    const text = resultText.value.trim();
    if (!text) {
      setStatus("No translated text to pronounce.", "error");
      return;
    }

    if (!("speechSynthesis" in window)) {
      setStatus("Speech is not supported in this browser.", "error");
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const languageCode = (targetLang.value || "").toLowerCase();
    const baseLanguage = languageCode.split("-")[0];
    const matchingVoice =
      voices.find((voice) => voice.lang?.toLowerCase() === languageCode) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith(`${baseLanguage}-`)) ||
      voices.find((voice) => voice.lang?.toLowerCase() === baseLanguage) ||
      null;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang.value;
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    utterance.onend = () => setStatus("Pronunciation finished.", "success");
    utterance.onerror = () => setStatus("Unable to pronounce text.", "error");

    if (!matchingVoice) {
      setStatus(
        "Language-specific voice is not installed on this device. Using default voice.",
        "success"
      );
    }

    window.speechSynthesis.speak(utterance);
  }

  async function runTranslation() {
    const text = sourceText.value.trim();
    const from = sourceLang.value;
    const to = targetLang.value;

    if (!text) {
      setStatus("Enter text to translate.", "error");
      return;
    }

    if (from === to) {
      resultText.value = text;
      setStatus("Source and target language are same.", "success");
      return;
    }

    runBtn.disabled = true;
    runBtn.textContent = "Translating...";
    setStatus("");

    try {
      let translated = "";

      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Primary translation request failed.");
        }

        const data = await response.json();
        translated = (data?.responseData?.translatedText || "").trim();

        // MyMemory sometimes returns empty responseData but valid text in matches.
        if (!translated && Array.isArray(data?.matches)) {
          const bestMatch = data.matches.find((item) => (item?.translation || "").trim());
          translated = bestMatch?.translation?.trim() || "";
        }
      } catch (primaryError) {
        console.warn("Primary translation failed:", primaryError);
      }

      // Fallback translator for cases like single words returning empty from primary API.
      if (!translated) {
        const fallbackUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;
        const fallbackResponse = await fetch(fallbackUrl);
        if (!fallbackResponse.ok) {
          throw new Error("Translation request failed.");
        }

        const fallbackData = await fallbackResponse.json();
        translated = (fallbackData?.[0] || [])
          .map((part) => part?.[0] || "")
          .join("")
          .trim();
      }

      if (!translated) {
        translated = text;
        setStatus("Translation unavailable right now. Showing original text.", "error");
      } else {
        setStatus("Translation completed.", "success");
      }

      resultText.value = translated;
    } catch (error) {
      setStatus(error.message || "Unable to translate now.", "error");
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = "Translate";
    }
  }

  openBtn.addEventListener("click", openOverlay);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeOverlay();
  });

  swapBtn.addEventListener("click", () => {
    const sourceValue = sourceLang.value;
    sourceLang.value = targetLang.value;
    targetLang.value = sourceValue;

    const sourceContent = sourceText.value;
    sourceText.value = resultText.value;
    resultText.value = sourceContent;
    setStatus("Languages swapped.", "success");
  });

  runBtn.addEventListener("click", runTranslation);

  copyBtn.addEventListener("click", async () => {
    if (!resultText.value.trim()) {
      setStatus("No translated text to copy.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(resultText.value);
      setStatus("Copied.", "success");
    } catch (error) {
      setStatus("Copy failed.", "error");
    }
  });

  speakBtn.addEventListener("click", speakResultText);

  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}

async function ensureUserDoc(user) {
  if (!user || !user.uid) {
    console.error("Invalid user object:", user);
    return null;
  }
  
  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
      console.log("Creating new user document for:", user.uid);
      
      const userData = {
        name: user.displayName || "Learner",
        email: user.email || "",
        photoURL: user.photoURL || "./assets/avatar.svg",
        createdAt: serverTimestamp(),
        learningStart: new Date().toISOString(),
        speakingCompleted: [],
        listeningCompleted: [],
        completedDates: [],
        lastActive: new Date().toISOString(),
        authProvider: user.providerData[0]?.providerId || "email"
      };
      
      await setDoc(userRef, userData);
      console.log("✅ User document created successfully");
    } else {
      console.log("📝 User document exists for:", user.uid);
    }
    
    return userRef;
  } catch (error) {
    console.error("❌ Error in ensureUserDoc:", error);
    return null;
  }
}

function getProgressFromISO(startIso) {
  const start = new Date(startIso);
  const now = new Date();
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((nowMidnight - startMidnight) / 86400000);
  const unlocked = Math.max(1, Math.min(TOTAL_DAYS, diff + 1));
  return { unlocked, currentDay: unlocked };
}

async function markTaskDone(uid, type, index) {
  const userRef = doc(db, "users", uid);
  const field = type === "speaking" ? "speakingCompleted" : "listeningCompleted";
  
  const today = new Date().toISOString().split('T')[0];
  
  await updateDoc(userRef, {
    [field]: arrayUnion(index),
    completedDates: arrayUnion(today),
    lastActive: new Date().toISOString()
  });
  
  console.log(`✅ Task marked done: ${type} day ${index} on ${today}`);
}

// FIXED: Simplified authGuard - rely on Firebase persistence
function authGuard(onReady) {
  console.log("🔐 Auth guard: Checking authentication...");
  
  // Check if we already have a user
  const currentUser = auth.currentUser;
  if (currentUser) {
    console.log("✅ Existing user found:", currentUser.uid);
    ensureUserDoc(currentUser).then(async (userRef) => {
      if (userRef) {
        const userDoc = await getDoc(userRef);
        onReady(currentUser, userDoc.data());
      } else {
        onReady(currentUser, {
          name: currentUser.displayName || "Learner",
          email: currentUser.email,
          photoURL: currentUser.photoURL || "./assets/avatar.svg"
        });
      }
    }).catch(error => {
      console.error("❌ Error in authGuard:", error);
      onReady(currentUser, {
        name: currentUser.displayName || "Learner",
        email: currentUser.email,
        photoURL: currentUser.photoURL || "./assets/avatar.svg"
      });
    });
    return;
  }

  // Listen for auth state changes
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    console.log("📡 Auth state changed:", user ? "✅ User logged in" : "❌ No user");
    
    if (!user) {
      console.log("🚫 No user found, redirecting to login...");
      unsubscribe();
      window.location.href = "./login.html";
      return;
    }

    try {
      const userRef = await ensureUserDoc(user);
      if (userRef) {
        const userDoc = await getDoc(userRef);
        onReady(user, userDoc.data());
      } else {
        onReady(user, {
          name: user.displayName || "Learner",
          email: user.email,
          photoURL: user.photoURL || "./assets/avatar.svg"
        });
      }
    } catch (error) {
      console.error("❌ Error in authGuard callback:", error);
      window.location.href = "./login.html";
    }
  });
}

export {
  TOTAL_DAYS,
  registerServiceWorker,
  setBottomNavActive,
  initTranslatorOverlay,
  ensureUserDoc,
  getProgressFromISO,
  markTaskDone,
  authGuard
};
