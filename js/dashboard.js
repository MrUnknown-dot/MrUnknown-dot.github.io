import { authGuard, getProgressFromISO, initTranslatorOverlay, registerServiceWorker, setBottomNavActive } from "./common.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";
import { auth } from "./firebase.js";

registerServiceWorker();
setBottomNavActive();
initTranslatorOverlay();

const welcomeEl = document.getElementById("welcome");
const goalEl = document.getElementById("goal");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const profileImg = document.getElementById("profileImg");

// Stats elements
const currentDayStat = document.getElementById("currentDayStat");
const completedStat = document.getElementById("completedStat");
const streakStat = document.getElementById("streakStat");

// Day unlocked badge element
const dayUnlockedBadge = document.getElementById("dayUnlockedBadge");
let unsubscribeUserSnapshot = null;

console.log("Dashboard loaded, looking for elements:", {
  currentDayStat: !!currentDayStat,
  completedStat: !!completedStat,
  streakStat: !!streakStat,
  dayUnlockedBadge: !!dayUnlockedBadge
});

// Function to calculate streak
function calculateStreak(completedDates) {
  if (!completedDates || completedDates.length === 0) {
    console.log("No completed dates for streak calculation");
    return 0;
  }
  
  console.log("Calculating streak from dates:", completedDates);
  
  // Get unique dates and sort
  const uniqueDates = [...new Set(completedDates)].sort();
  if (uniqueDates.length === 0) return 0;
  
  let streak = 1;
  let currentDate = new Date(uniqueDates[uniqueDates.length - 1]);
  currentDate.setHours(0, 0, 0, 0);
  
  // Check if last activity was today or yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayDiff = Math.floor((today - currentDate) / (1000 * 60 * 60 * 24));
  if (dayDiff > 1) {
    console.log("Last activity was more than 1 day ago, streak broken");
    return 0;
  }
  
  // Count consecutive days backwards
  for (let i = uniqueDates.length - 2; i >= 0; i--) {
    const prevDate = new Date(uniqueDates[i]);
    prevDate.setHours(0, 0, 0, 0);
    
    const expectedPrevDate = new Date(currentDate);
    expectedPrevDate.setDate(expectedPrevDate.getDate() - 1);
    
    if (prevDate.getTime() === expectedPrevDate.getTime()) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }
  
  console.log(`Calculated streak: ${streak}`);
  return streak;
}

authGuard(async (user, userData) => {
  console.log("User data from authGuard:", userData);
  
  const name = userData.name || "Learner";
  const learningStart = userData.learningStart || new Date().toISOString();
  const { unlocked } = getProgressFromISO(learningStart);
  const percent = Math.round((unlocked / 30) * 100);

  // Get completed tasks count
  const speakingCompleted = userData.speakingCompleted || [];
  const listeningCompleted = userData.listeningCompleted || [];
  const completedTasks = speakingCompleted.length + listeningCompleted.length;
  
  console.log("Task completion data:", {
    speakingCompleted,
    listeningCompleted,
    completedTasks,
    unlocked
  });

  // Update welcome and goal
  welcomeEl.textContent = `Welcome back, ${name}👋`;
  
  const totalTasks = unlocked * 2;
  
  goalEl.innerHTML = `
    <span style="display: block; margin-bottom: 8px;">
      Today's Goal: Complete Day ${unlocked} tasks
    </span>
    <span style="display: block; font-size: 0.9rem; color: var(--primary);">
      ${completedTasks}/${totalTasks} tasks completed so far
    </span>
  `;
  
  // Update progress bar
  progressFill.style.width = `${percent}%`;
  progressText.textContent = ` ${unlocked}/30 days unlocked (${percent}%)`;
  
  // Update profile image
  profileImg.src = userData.photoURL || "./assets/avatar.svg";
  
  // Update stats
  if (currentDayStat) {
    currentDayStat.textContent = `Day ${unlocked}`;
    console.log("Updated current day to:", `Day ${unlocked}`);
  } else {
    console.error("currentDayStat element not found!");
  }
  
  if (completedStat) {
    completedStat.textContent = completedTasks;
    console.log("Updated completed tasks to:", completedTasks);
  } else {
    console.error("completedStat element not found!");
  }
  
  // Calculate streak
  const completedDates = userData.completedDates || [];
  const streak = calculateStreak(completedDates);
  
  if (streakStat) {
    streakStat.textContent = streak;
    console.log("Updated streak to:", streak);
  } else {
    console.error("streakStat element not found!");
  }

  if (dayUnlockedBadge) {
    dayUnlockedBadge.textContent = ` Day ${unlocked} unlocked`;
  }
  


  // Add to page if it doesn't exist
  if (!document.getElementById('debugInfo')) {
    debugDiv.id = 'debugInfo';
    document.querySelector('.app-shell').appendChild(debugDiv);
  }
});

// Real-time updates
auth.onAuthStateChanged((user) => {
  if (unsubscribeUserSnapshot) {
    unsubscribeUserSnapshot();
    unsubscribeUserSnapshot = null;
  }

  if (user) {
    console.log("Setting up real-time listener for user:", user.uid);
    const userRef = doc(db, "users", user.uid);
    
    unsubscribeUserSnapshot = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          console.log("Real-time update received:", userData);
          
          const speakingCompleted = userData.speakingCompleted || [];
          const listeningCompleted = userData.listeningCompleted || [];
          const completedTasks = speakingCompleted.length + listeningCompleted.length;
          
          if (completedStat) {
            completedStat.textContent = completedTasks;
          }
          
          // Update current day from learningStart
          const { unlocked } = getProgressFromISO(userData.learningStart || new Date().toISOString());
          
          if (currentDayStat) {
            currentDayStat.textContent = `Day ${unlocked}`;
          }
          
          if (dayUnlockedBadge) {
            dayUnlockedBadge.textContent = `?? Day ${unlocked} unlocked`;
          }
          
          // Update debug info
          const debugDiv = document.getElementById('debugInfo');
          if (debugDiv) {
            debugDiv.innerHTML = `
              <strong>Debug Info (Updated):</strong><br>
              Speaking Completed: ${JSON.stringify(speakingCompleted)}<br>
              Listening Completed: ${JSON.stringify(listeningCompleted)}<br>
              Completed Dates: ${JSON.stringify(userData.completedDates || [])}<br>
              Unlocked Day: ${unlocked}<br>
              Total Tasks: ${completedTasks}
            `;
          }
        }
      },
      (error) => {
        console.error("Realtime listener error:", error);
      }
    );
  }
});

window.addEventListener("beforeunload", () => {
  if (unsubscribeUserSnapshot) {
    unsubscribeUserSnapshot();
    unsubscribeUserSnapshot = null;
  }
});
