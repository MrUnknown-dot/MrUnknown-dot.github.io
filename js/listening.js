import { authGuard, getProgressFromISO, initTranslatorOverlay, markTaskDone, registerServiceWorker, setBottomNavActive } from "./common.js";
import { getLearningCatalog } from "./data.js";

registerServiceWorker();
setBottomNavActive();
initTranslatorOverlay();

const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".tab-panel");
const dailyTitle = document.getElementById("dailyTitle");
const dailyMeta = document.getElementById("dailyMeta");
const dailyFrame = document.getElementById("dailyFrame");
const vocabWrap = document.getElementById("vocabWrap");
const backlogEl = document.getElementById("backlog");
const extraList = document.getElementById("extraListeningList");
const markDoneBtn = document.getElementById("markDoneBtn");
const statusEl = document.getElementById("status");
const profileImg = document.getElementById("profileImg");
const catalogPromise = getLearningCatalog();

let activeTaskIndex = 0;
let activeUid = null;
let activeTaskDay = 1;
let unlockedDays = 1;
let listeningTasksCache = [];
let completedListeningDays = new Set();
const LISTENING_MIN_SECONDS = 150;
let sectionStartAt = null;
let timerIntervalId = null;
let isSavingCompletion = false;

function extractYouTubeVideoId(input) {
  if (typeof input !== "string") return "";
  const raw = input.trim();
  if (!raw) return "";

  const cleanId = (candidate) => {
    const trimmed = String(candidate || "").trim();
    if (!trimmed) return "";
    const match = trimmed.match(/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : "";
  };

  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  const parseUrl = (value) => {
    try {
      return new URL(value);
    } catch {
      try {
        return new URL(`https://${value}`);
      } catch {
        return null;
      }
    }
  };

  const url = parseUrl(raw);
  if (!url) return cleanId(raw);

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") return cleanId(url.pathname.slice(1));
  if (host.endsWith("youtube.com")) {
    const v = url.searchParams.get("v");
    if (v) return cleanId(v);
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts[0];
    if (["embed", "shorts", "live", "v"].includes(marker)) {
      return cleanId(parts[1]);
    }
  }

  return cleanId(raw);
}

function buildYouTubeEmbedUrl(videoInput) {
  const videoId = extractYouTubeVideoId(videoInput);
  if (!videoId) return "";
  return `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`;
}

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

function setProfileImage(photoURL) {
  if (!profileImg) return;

  profileImg.onerror = () => {
    profileImg.onerror = null;
    profileImg.src = "./assets/avatar.svg";
  };

  profileImg.src = photoURL || "./assets/avatar.svg";
}

function getElapsedSeconds() {
  if (!sectionStartAt) return 0;
  return Math.floor((Date.now() - sectionStartAt) / 1000);
}

function isCompletionUnlocked() {
  return getElapsedSeconds() >= LISTENING_MIN_SECONDS;
}

function isCurrentTaskCompleted() {
  return completedListeningDays.has(activeTaskDay);
}

function setMarkDoneAvailability() {
  if (isCurrentTaskCompleted()) {
    markDoneBtn.style.display = "none";
    return;
  }

  markDoneBtn.style.display = "";
  if (isSavingCompletion) return;
  const unlocked = isCompletionUnlocked();
  markDoneBtn.disabled = !unlocked;
  markDoneBtn.textContent = unlocked ? "Mark Complete" : `Mark Complete (${LISTENING_MIN_SECONDS - getElapsedSeconds()}s)`;
}

function startCompletionTimer() {
  sectionStartAt = Date.now();
  setMarkDoneAvailability();
  if (timerIntervalId) clearInterval(timerIntervalId);
  timerIntervalId = setInterval(() => {
    setMarkDoneAvailability();
    if (isCompletionUnlocked()) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
  }, 1000);
}

function renderBacklog() {
  backlogEl.innerHTML = "";
  listeningTasksCache.slice(0, unlockedDays).forEach((item) => {
    const itemDay = Number(item.day);
    const isCompleted = completedListeningDays.has(itemDay);

    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>Day ${item.day}: ${item.title}</span>
        ${isCompleted ? '<span class="badge badge-success">✓</span>' : ""}
      </div>
    `;
    backlogEl.appendChild(div);
  });
}

tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    tabs.forEach((t) => t.classList.toggle("active", t === btn));
    panels.forEach((p) => p.classList.toggle("active", p.id === target));
  });
});

markDoneBtn.addEventListener("click", async () => {
  if (!activeUid || !isCompletionUnlocked() || isCurrentTaskCompleted()) return;

  isSavingCompletion = true;
  markDoneBtn.disabled = true;
  markDoneBtn.textContent = "Saving...";

  try {
    const completedDay = activeTaskDay;
    await markTaskDone(activeUid, "listening", completedDay);
    completedListeningDays.add(completedDay);
    renderBacklog();
    setStatus("Listening task marked as complete.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    isSavingCompletion = false;
    setMarkDoneAvailability();
  }
});

authGuard(async (user, userData) => {
  activeUid = user.uid;
  setProfileImage(userData.photoURL || user.photoURL);

  try {
    const catalog = await catalogPromise;
    listeningTasksCache = catalog.listening;
    const extraListeningTasks = catalog.extraListening;

    const { unlocked } = getProgressFromISO(userData.learningStart || new Date().toISOString());
    unlockedDays = unlocked;
    completedListeningDays = new Set((userData.listeningCompleted || []).map((day) => Number(day)));
    activeTaskIndex = Math.min(unlocked - 1, listeningTasksCache.length - 1);

    const task = listeningTasksCache[activeTaskIndex];
    activeTaskDay = Number(task.day) || activeTaskIndex + 1;

    dailyTitle.textContent = task.title;
    dailyMeta.textContent = `Unlocked Day ${unlocked} of 30 | ${task.duration || "1-2 min"}`;
    const dailyEmbedUrl = buildYouTubeEmbedUrl(task.videoId);
    dailyFrame.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    );
    dailyFrame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    dailyFrame.src = dailyEmbedUrl || "about:blank";
    if (!dailyEmbedUrl) {
      setStatus("This day's video link is invalid. Please update the listening catalog.", "error");
    }

    vocabWrap.innerHTML = "";
    (task.vocab || []).forEach((word) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = word;
      vocabWrap.appendChild(chip);
    });

    renderBacklog();

    extraList.innerHTML = "";
    extraListeningTasks.forEach((item, idx) => {
      const embedUrl = buildYouTubeEmbedUrl(item.videoId);
      const invalidVideoText = embedUrl
        ? ""
        : `<p class="muted" style="margin-top:8px;">Invalid YouTube video link configured for this task.</p>`;

      const block = document.createElement("div");
      block.className = "list-item";
      block.innerHTML = `
        <strong>${idx + 1}. ${item.title}</strong>
        <div class="video-wrap" style="margin-top:8px;">
          <iframe
            src="${embedUrl || "about:blank"}"
            title="${item.title}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>
        </div>
        ${invalidVideoText}
        <div class="chips">${(item.vocab || []).map((v) => `<span class="chip">${v}</span>`).join("")}</div>
      `;
      extraList.appendChild(block);
    });
    startCompletionTimer();
  } catch (error) {
    console.error("Error loading listening tasks:", error);
    setStatus("Failed to load listening tasks. Please refresh.", "error");
  }
});

window.addEventListener("beforeunload", () => {
  if (timerIntervalId) clearInterval(timerIntervalId);
});
