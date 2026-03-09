import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { authGuard, registerServiceWorker, setBottomNavActive } from "./common.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";

registerServiceWorker();
setBottomNavActive();

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profilePhoto = document.getElementById("profilePhoto");

const editNameInput = document.getElementById("editName");
const editPhotoInput = document.getElementById("editPhoto");

const saveBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");

const editBtn = document.getElementById("editProfileBtn");
const editSection = document.getElementById("editProfileSection");

const statusEl = document.getElementById("status");

let currentUid = null;

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

/* =========================
   LOAD USER PROFILE
========================= */

authGuard((user, userData) => {
  currentUid = user.uid;

  const name = userData.name || "Learner";
  const email = userData.email || user.email;
  const photoURL = userData.photoURL || "./assets/avatar.svg";

  profileName.textContent = name;
  profileEmail.textContent = email;
  profilePhoto.src = photoURL;

  editNameInput.value = name;
  editPhotoInput.value = photoURL;
});

/* =========================
   TOGGLE EDIT PROFILE
========================= */

editBtn.addEventListener("click", () => {

  if (editSection.style.display === "none" || editSection.style.display === "") {

    editSection.style.display = "block";
    editBtn.textContent = "❌ Cancel";

  } else {

    editSection.style.display = "none";
    editBtn.textContent = "✏️ Edit";

  }

});

/* =========================
   SAVE PROFILE
========================= */

saveBtn.addEventListener("click", async () => {

  if (!currentUid) return;

  const newName = editNameInput.value.trim() || "Learner";
  const newPhoto = editPhotoInput.value.trim() || "./assets/avatar.svg";

  try {

    await updateDoc(doc(db, "users", currentUid), {
      name: newName,
      photoURL: newPhoto
    });

    profileName.textContent = newName;
    profilePhoto.src = newPhoto;

    setStatus("✅ Profile updated successfully", "success");

    /* hide edit form again */
    editSection.style.display = "none";
    editBtn.textContent = "✏️ Edit";

  } catch (error) {

    setStatus(error.message, "error");

  }

});

/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener("click", async () => {

  try {

    await signOut(auth);
    window.location.href = "./login.html";

  } catch (error) {

    setStatus(error.message, "error");

  }

});