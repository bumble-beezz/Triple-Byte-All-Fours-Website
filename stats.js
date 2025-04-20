import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, query, 
  orderBy, getDocs, limit, serverTimestamp
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

document.addEventListener("DOMContentLoaded", () => {
  const leaderboardBody = document.getElementById("leaderboardBody");
  const returnToGameBtn = document.getElementById("returnToGameBtn");
  const backToMainBtn = document.getElementById("backToMainBtn");
  const loadingIndicator = document.getElementById("loadingLeaderboard");
  const errorDisplay = document.getElementById("leaderboardError");

  // Check Firebase connection
async function checkFirebaseConnection() {
  try {
    const testRef = doc(db, "test_connection", "test");
    await setDoc(testRef, { timestamp: serverTimestamp() });
    await deleteDoc(testRef);
    return true;
  } catch (error) {
    console.error("Firebase connection error:", error);
    return false;
  }
}

// Usage:
document.addEventListener("DOMContentLoaded", async () => {
  const isConnected = await checkFirebaseConnection();
  if (!isConnected) {
    alert("Database connection failed. Please refresh the page.");
    return;
  }
  // Rest of your initialization code...
});

async function loadLeaderboard() {
  try {
    const q = query(
      collection(db, "leaderboard"),
      orderBy("totalScore", "desc"),
      orderBy("gameCount", "asc"), // Uses composite index
      limit(5)
    );
    const snapshot = await getDocs(q);
      leaderboardBody.innerHTML = "";
      
      if (snapshot.empty) {
        leaderboardBody.innerHTML = `
          <tr>
            <td colspan="4" class="no-teams">No teams have played yet</td>
          </tr>
        `;
        return;
      }

      let rank = 1;
      snapshot.forEach(doc => {
        const data = doc.data();
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${rank}</td>
          <td>${data.teamName}</td>
          <td>${data.totalScore || 0}</td>
          <td>${data.gameCount || 0}</td>
        `;
        
        // Highlight the row if it's one of the current teams
        const currentTeams = JSON.parse(localStorage.getItem("currentGameState") || {});
        if (currentTeams.team1Name === data.teamName || 
            currentTeams.team2Name === data.teamName) {
          row.classList.add("current-team");
        }
        
        leaderboardBody.appendChild(row);
        rank++;
      });
      
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      showError("Failed to load leaderboard. Please try again.");
    } finally {
      hideLoading();
    }
  }

  function showLoading() {
    loadingIndicator.style.display = "flex";
    errorDisplay.style.display = "none";
  }

  function hideLoading() {
    loadingIndicator.style.display = "none";
  }

  function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = "block";
  }

  returnToGameBtn.addEventListener("click", () => {
    // Check if we have registered teams
    const team1Name = localStorage.getItem("team1Name");
    const team2Name = localStorage.getItem("team2Name");

    // Check if game was completed
    const gameStats = JSON.parse(localStorage.getItem("currentGameStats") || "{}");

    if (gameStats.gameCompleted || (gameStats.team1Score >= 14 || gameStats.team2Score >= 14)) {
      // Game was completed or a team has already won - reset scores and start a new game
      const newGameState = {
        team1Score: 0,
        team2Score: 0,
        team1Name,
        team2Name,
        highTrump: null,
        lowTrump: null,
        jackHolder: null,
        gameWinner: null,
        gameOverFlag: false,
      };

      // Save the new game state
      localStorage.setItem("currentGameState", JSON.stringify(newGameState));
      localStorage.removeItem("currentGameStats"); // Clear the completed game stats

      // Redirect to the game page
      window.location.href = "index.html";
    } else {
      // Game is not completed - continue where you left off
      if (team1Name && team2Name) {
        // We have both teams - go straight to game
        window.location.href = "index.html";
      } else {
        // Missing a team - go to registration
        window.location.href = "index.html#register";
      }
    }
  });

  backToMainBtn.addEventListener("click", () => {
    localStorage.removeItem("currentGameState");
    window.location.href = "index.html";
  });

  // Initialize
  loadLeaderboard();
});