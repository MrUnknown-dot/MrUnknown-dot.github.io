import { authGuard, getProgressFromISO, initTranslatorOverlay, markTaskDone, registerServiceWorker, setBottomNavActive } from "./common.js";
import { getLearningCatalog } from "./data.js";

registerServiceWorker();
setBottomNavActive();
initTranslatorOverlay();

const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".tab-panel");
const dailyTitle = document.getElementById("dailyTitle");
const dailyText = document.getElementById("dailyText");
const dailyMeta = document.getElementById("dailyMeta");
const speedInput = document.getElementById("speed");
const scrollBox = document.getElementById("scrollBox");
const markDoneBtn = document.getElementById("markDoneBtn");
const statusEl = document.getElementById("status");
const backlogEl = document.getElementById("backlog");
const extraList = document.getElementById("extraSpeakingList");
const playPauseBtn = document.getElementById("playPauseBtn");
const resetScrollBtn = document.getElementById("resetScrollBtn");
const profileImg = document.getElementById("profileImg");

const catalogPromise = getLearningCatalog();

let scrollFrameId = null;
let lastFrameTime = 0;
let activeTaskIndex = 0;
let activeUid = null;
let isScrolling = true;
let unlockedDays = 1;
let speakingTasksCache = [];
let completedSpeakingDays = new Set();
const SPEAKING_MIN_SECONDS = 90;
let sectionStartAt = null;
let timerIntervalId = null;
let isSavingCompletion = false;

function setProfileImage(photoURL) {
  if (!profileImg) return;

  profileImg.onerror = () => {
    profileImg.onerror = null;
    profileImg.src = "./assets/avatar.svg";
  };

  profileImg.src = photoURL || "./assets/avatar.svg";
}

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
  if (type === "success") {
    setTimeout(() => {
      statusEl.textContent = "";
      statusEl.className = "status";
    }, 3000);
  }
}

function getElapsedSeconds() {
  if (!sectionStartAt) return 0;
  return Math.floor((Date.now() - sectionStartAt) / 1000);
}

function isCompletionUnlocked() {
  return getElapsedSeconds() >= SPEAKING_MIN_SECONDS;
}

function isCurrentTaskCompleted() {
  return completedSpeakingDays.has(activeTaskIndex + 1);
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
  markDoneBtn.textContent = unlocked ? "Mark Complete" : `Mark Complete (${SPEAKING_MIN_SECONDS - getElapsedSeconds()}s)`;
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

function renderCurrentTask() {
  const task = speakingTasksCache[activeTaskIndex];
  if (!task) return;

  dailyTitle.textContent = task.title;
  dailyText.textContent = task.text;

  const isCompleted = completedSpeakingDays.has(activeTaskIndex + 1);
  dailyMeta.innerHTML = `
    Unlocked Day ${unlockedDays} of 30 | ${task.duration || "1-2 min"}
    ${isCompleted ? '<span class="badge badge-success" style="margin-left: 8px;">Completed</span>' : ""}
  `;
}

function renderBacklog() {
  backlogEl.innerHTML = "";
  speakingTasksCache.slice(0, unlockedDays).forEach((item) => {
    const itemDay = Number(item.day);
    const isCompleted = completedSpeakingDays.has(itemDay);

    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>Day ${item.day}: ${item.title}</span>
        ${isCompleted ? '<span class="badge badge-success">✓</span>' : ""}
      </div>
    `;
    backlogEl.appendChild(div);
  });
}

function renderExtraTasks(extraSpeakingTasks) {
  extraList.innerHTML = "";
  extraSpeakingTasks.forEach((taskText, idx) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <strong>${idx + 1}.</strong> ${taskText}
      <div style="margin-top: 8px;">
        <button class="btn btn-outline practice-extra-btn" data-task="${idx}" style="width: auto; padding: 8px 16px; font-size: 0.85rem;">
          Practice Now
        </button>
      </div>
    `;
    extraList.appendChild(div);
  });

  document.querySelectorAll(".practice-extra-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const taskIdx = Number(e.currentTarget.dataset.task);
      const taskText = extraSpeakingTasks[taskIdx];
      if (!taskText) return;

      setStatus(`Extra task ${taskIdx + 1} selected`, "success");
      dailyTitle.textContent = `Extra Task ${taskIdx + 1}`;
      dailyText.textContent = taskText;
      document.querySelector('[data-tab="dailyPanel"]').click();
    });
  });
}

tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    tabs.forEach((t) => t.classList.toggle("active", t === btn));
    panels.forEach((p) => p.classList.toggle("active", p.id === target));
  });
});

function runAutoScroll() {
  stopAutoScroll();
  if (!isScrolling) return;

  const tick = (now) => {
    const max = scrollBox.scrollHeight - scrollBox.clientHeight;
    if (scrollBox.scrollTop >= max) {
      stopAutoScroll();
      return;
    }

    if (!lastFrameTime) lastFrameTime = now;
    const deltaSeconds = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // Slider maps to pixels per second for continuous motion.
    const pixelsPerSecond = Number(speedInput.value) * 24;
    scrollBox.scrollTop = Math.min(max, scrollBox.scrollTop + pixelsPerSecond * deltaSeconds);
    scrollFrameId = requestAnimationFrame(tick);
  };

  scrollFrameId = requestAnimationFrame(tick);
}

function stopAutoScroll() {
  if (!scrollFrameId) return;
  cancelAnimationFrame(scrollFrameId);
  scrollFrameId = null;
  lastFrameTime = 0;
}

speedInput.addEventListener("input", () => {
  if (isScrolling) runAutoScroll();
});

playPauseBtn.addEventListener("click", () => {
  isScrolling = !isScrolling;
  playPauseBtn.textContent = isScrolling ? "⏸️" : "▶️";
  playPauseBtn.title = isScrolling ? "Pause auto-scroll" : "Play auto-scroll";

  if (isScrolling) runAutoScroll();
  else stopAutoScroll();
});

resetScrollBtn.addEventListener("click", () => {
  scrollBox.scrollTop = 0;
  setStatus("Scroll reset to top", "success");
});

markDoneBtn.addEventListener("click", async () => {
  if (!activeUid || !isCompletionUnlocked() || isCurrentTaskCompleted()) return;

  isSavingCompletion = true;
  markDoneBtn.disabled = true;
  markDoneBtn.textContent = "Saving...";

  try {
    const completedDay = activeTaskIndex + 1;
    await markTaskDone(activeUid, "speaking", completedDay);
    completedSpeakingDays.add(completedDay);

    renderBacklog();
    renderCurrentTask();
    setStatus("Speaking task marked as complete! Great job!", "success");
  } catch (error) {
    setStatus(`Error: ${error.message}`, "error");
  } finally {
    isSavingCompletion = false;
    setMarkDoneAvailability();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    markDoneBtn.click();
  }
});

authGuard(async (user, userData) => {
  activeUid = user.uid;
  setProfileImage(userData.photoURL || user.photoURL);

  try {
    const catalog = await catalogPromise;
    speakingTasksCache = catalog.speaking;
    const extraSpeakingTasks = catalog.extraSpeaking;

    const { unlocked } = getProgressFromISO(userData.learningStart || new Date().toISOString());
    unlockedDays = unlocked;
    completedSpeakingDays = new Set((userData.speakingCompleted || []).map((day) => Number(day)));

    activeTaskIndex = Math.min(unlockedDays - 1, speakingTasksCache.length - 1);

    renderCurrentTask();
    renderBacklog();
    renderExtraTasks(extraSpeakingTasks);
    runAutoScroll();
    startCompletionTimer();
  } catch (error) {
    console.error("Error loading speaking tasks:", error);
    setStatus("Failed to load tasks. Please refresh.", "error");
  }
});

window.addEventListener("beforeunload", () => {
  stopAutoScroll();
  if (timerIntervalId) clearInterval(timerIntervalId);
});
