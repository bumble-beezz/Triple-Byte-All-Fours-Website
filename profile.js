import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyc8G440M2D4aMpwDi6ce__rQ9oE4EaQI",
  authDomain: "all-fours-website.firebaseapp.com",
  projectId: "all-fours-website",
  storageBucket: "all-fours-website.appspot.com",
  messagingSenderId: "488998857560",
  appId: "1:488998857560:web:30535df25152298613132d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const currentTeamDisplay = document.getElementById("currentTeam");
  const switchTeamBtn = document.getElementById("switchTeamBtn");
  const team1Info = document.getElementById("team1Info");
  const team2Info = document.getElementById("team2Info");
  const logoutBtn = document.getElementById("logoutBtn");
  
  // Get or create stats container
  const statsContainer = document.getElementById("statsContainer") || document.createElement("div");
  statsContainer.className = "stats-container";
  if (!document.getElementById("statsContainer")) {
    document.querySelector(".stats-box").appendChild(statsContainer);
  }
  
  // Get team data from localStorage
  const team1Name = localStorage.getItem("team1Name");
  const team2Name = localStorage.getItem("team2Name");
  
  // Initialize activeTeam
  let activeTeam = localStorage.getItem("activeTeam") || team1Name || team2Name;

  // Update team display information
  function updateTeamDisplay() {
    if (!activeTeam) {
      currentTeamDisplay.textContent = "No active team";
      return;
    }
    
    currentTeamDisplay.textContent = `Currently viewing as: ${activeTeam}`;
    localStorage.setItem("activeTeam", activeTeam);
    
    // Update team info displays
    team1Info.textContent = team1Name ? `Team 1: ${team1Name}` : "No Team 1 registered";
    team2Info.textContent = team2Name ? `Team 2: ${team2Name}` : "No Team 2 registered";
    
    // Only show switch button if both teams exist
    if (switchTeamBtn) {
      switchTeamBtn.style.display = (team1Name && team2Name) ? "block" : "none";
    }
    
    // Update logout button
    if (logoutBtn) {
      logoutBtn.style.display = (team1Name || team2Name) ? "block" : "none";
    }
  }

  // Display team statistics
  async function displayTeamStats() {
    statsContainer.innerHTML = '';
    
    // Check for completed game stats
    const gameStats = JSON.parse(localStorage.getItem("currentGameStats") || "null");
    
    if (gameStats && gameStats.gameCompleted) {
      statsContainer.innerHTML += `
        <div class="game-stats-box">
          <h3>Latest Game Results</h3>
          <div class="game-result">
            <p><strong>Winner:</strong> ${gameStats.winner} (${gameStats.winningScore} points)</p>
            <p><strong>Opponent:</strong> ${gameStats.winner === gameStats.team1Name ? gameStats.team2Name : gameStats.team1Name} (${gameStats.losingScore} points)</p>
            <p><strong>Played:</strong> ${new Date(gameStats.timestamp).toLocaleString()}</p>
          </div>
        </div>
      `;
      localStorage.removeItem("currentGameStats");
    }
  }


  // Switch between available teams
  if (switchTeamBtn) {
    switchTeamBtn.addEventListener("click", () => {
      if (!team1Name || !team2Name) return;
      
      // Toggle between teams
      activeTeam = activeTeam === team1Name ? team2Name : team1Name;
      updateTeamDisplay();
    });
  }

  // Global logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to logout all teams?")) {
        localStorage.clear();
        window.location.href = "index.html";
      }
    });
  }

  // Initialize
  if (!team1Name && !team2Name) {
    window.location.href = "index.html";
  } else {
    updateTeamDisplay();
    await displayTeamStats();
  }
});